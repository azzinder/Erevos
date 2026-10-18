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
//! Messages nobody takes expire after 14 days. Set `EREVOS_RELAY_TTL_DAYS`
//! to change that.
//!
//! Set `EREVOS_RELAY_KEY` to a file path to give the relay a key for sealed
//! sends (two-hop sending, see `server.rs`). The file is made on first start
//! and must be kept: phones put the public key in their contact links.
//! Without it, the relay still forwards for its own phones but cannot take
//! sealed sends from other relays.
//!
//! Set `EREVOS_RELAY_FILES` to a folder to keep the chunks of files that
//! phones send (see `files.rs`) there. Without it, they live in memory and are
//! lost when the relay stops. `EREVOS_RELAY_FILES_MB` sets how much room they
//! may take together: 1024 MB on disk unless set, 256 MB in memory. Chunks
//! nobody takes expire like messages.

mod files;
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
use std::time::Duration;

use erevos_core::relay_seal::RelayKey;
use files::FileStore;
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
    let ttl = match env::var("EREVOS_RELAY_TTL_DAYS") {
        Ok(days) if !days.is_empty() => match days.parse::<u64>() {
            Ok(days) if days > 0 => days * 24 * 60 * 60,
            _ => {
                eprintln!("erevos-relay: EREVOS_RELAY_TTL_DAYS must be a whole number of days, at least 1");
                return ExitCode::FAILURE;
            }
        },
        _ => queue::DEFAULT_TTL,
    };
    let store = match env::var("EREVOS_RELAY_JOURNAL") {
        Ok(path) if !path.is_empty() => match Store::open_with(Path::new(&path), ttl) {
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
            Store::with_ttl(ttl)
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
    let cap = match env::var("EREVOS_RELAY_FILES_MB") {
        Ok(mb) if !mb.is_empty() => match mb.parse::<u64>() {
            Ok(mb) => Some(mb << 20),
            Err(_) => {
                eprintln!("erevos-relay: EREVOS_RELAY_FILES_MB must be a whole number of megabytes");
                return ExitCode::FAILURE;
            }
        },
        _ => None,
    };
    let files = match env::var("EREVOS_RELAY_FILES") {
        Ok(dir) if !dir.is_empty() => {
            match FileStore::open(Path::new(&dir), cap.unwrap_or(files::DEFAULT_CAP), ttl) {
                Ok(files) => {
                    eprintln!("erevos-relay: keeping files in {dir}, {} MB now", files.used() >> 20);
                    files
                }
                Err(e) => {
                    eprintln!("erevos-relay: cannot open the file folder {dir}: {e}");
                    return ExitCode::FAILURE;
                }
            }
        }
        _ => {
            eprintln!("erevos-relay: no EREVOS_RELAY_FILES set, files are kept in memory and lost when the relay stops");
            FileStore::in_memory(cap.unwrap_or(files::DEFAULT_MEMORY_CAP), ttl)
        }
    };
    eprintln!("erevos-relay listening on tcp {tcp_addr} and ws {ws_addr}");
    let store = Shared::new(store, files, key);
    let sweep_store = Arc::clone(&store);
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(60 * 60));
        sweep_store.store.lock().expect("store lock").expire();
        sweep_store.files.lock().expect("files lock").expire();
    });
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
