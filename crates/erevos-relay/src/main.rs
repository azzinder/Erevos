//! Erevos relay: holds one-way message queues for offline delivery.
//!
//! Usage: `erevos-relay [TCP_ADDR] [WS_ADDR]`. The defaults are
//! `127.0.0.1:7878` for TCP and `127.0.0.1:7879` for WebSocket. Both front
//! ends share one store. This binary speaks plain TCP and plain WebSocket
//! (`ws://`), so put the WebSocket behind a TLS proxy before it leaves the
//! local network.
//!
//! Set `EREVOS_RELAY_TOKEN` to require `Authorization: Bearer <token>` on
//! WebSocket connections. Without it, anyone who can reach the WebSocket port
//! can use the relay. The TCP front end has no token, so keep it on
//! `127.0.0.1` anywhere others can reach the machine.
//!
//! Set `EREVOS_RELAY_JOURNAL` to a file path to keep queues and waiting
//! messages there, so they survive a restart. Without it, they live in memory
//! only and are lost when the relay stops.
//!
//! Set `EREVOS_RELAY_KEY` to a file path to give the relay a key for sealed
//! sends (two-hop sending, see `server.rs`). The file is made on first start
//! and must be kept: phones put the public key in their contact links.
//! Without it, the relay still forwards for its own phones but cannot take
//! sealed sends from other relays.

mod journal;
mod queue;
mod server;

use std::env;
use std::fs;
use std::io::{self, Write};
use std::net::TcpListener;
use std::path::Path;
use std::process::ExitCode;
use std::sync::Arc;
use std::thread;

use erevos_core::relay_seal::RelayKey;
use queue::Store;
use server::Shared;

/// Reads the relay key from `path`, or makes one there if the file does not exist.
fn load_key(path: &Path) -> io::Result<RelayKey> {
    match fs::read(path) {
        Ok(bytes) => {
            let bytes: [u8; 32] = bytes
                .try_into()
                .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "a relay key is 32 bytes"))?;
            Ok(RelayKey::from_secret_bytes(bytes))
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            let key = RelayKey::generate();
            let mut options = fs::OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
            let mut file = options.open(path)?;
            file.write_all(&key.to_secret_bytes())?;
            file.sync_all()?;
            Ok(key)
        }
        Err(e) => Err(e),
    }
}

fn main() -> ExitCode {
    let tcp_addr = env::args()
        .nth(1)
        .unwrap_or_else(|| "127.0.0.1:7878".to_string());
    let ws_addr = env::args()
        .nth(2)
        .unwrap_or_else(|| "127.0.0.1:7879".to_string());
    // Bind before opening the journal: a second relay on the same ports stops
    // here, before it could rewrite the file the first one is writing.
    let tcp = match TcpListener::bind(&tcp_addr) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("erevos-relay: cannot listen on {tcp_addr}: {e}");
            return ExitCode::FAILURE;
        }
    };
    let ws = match TcpListener::bind(&ws_addr) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("erevos-relay: cannot listen on {ws_addr}: {e}");
            return ExitCode::FAILURE;
        }
    };
    let token = env::var("EREVOS_RELAY_TOKEN")
        .ok()
        .filter(|t| !t.is_empty())
        .map(|t| Arc::from(t.as_str()));
    if token.is_none() {
        eprintln!("erevos-relay: no EREVOS_RELAY_TOKEN set, the WebSocket accepts anyone");
    }
    let store = match env::var("EREVOS_RELAY_JOURNAL") {
        Ok(path) if !path.is_empty() => match Store::open(Path::new(&path)) {
            Ok(store) => {
                eprintln!("erevos-relay: keeping queues in {path}");
                store
            }
            Err(e) => {
                eprintln!("erevos-relay: cannot open the journal {path}: {e}");
                return ExitCode::FAILURE;
            }
        },
        _ => {
            eprintln!(
                "erevos-relay: no EREVOS_RELAY_JOURNAL set, queues are lost when the relay stops"
            );
            Store::default()
        }
    };
    let key = match env::var("EREVOS_RELAY_KEY") {
        Ok(path) if !path.is_empty() => match load_key(Path::new(&path)) {
            Ok(key) => Some(key),
            Err(e) => {
                eprintln!("erevos-relay: cannot use the key file {path}: {e}");
                return ExitCode::FAILURE;
            }
        },
        _ => {
            eprintln!("erevos-relay: no EREVOS_RELAY_KEY set, sealed sends from other relays are refused");
            None
        }
    };
    eprintln!("erevos-relay listening on tcp {tcp_addr} and ws {ws_addr}");
    let store = Shared::new(store, key);
    let ws_store = Arc::clone(&store);
    thread::spawn(move || {
        if let Err(e) = server::serve_ws(ws, ws_store, token) {
            eprintln!("erevos-relay websocket: {e}");
        }
    });
    match server::serve(tcp, store) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("erevos-relay: {e}");
            ExitCode::FAILURE
        }
    }
}
