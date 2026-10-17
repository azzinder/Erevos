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

mod journal;
mod queue;
mod server;

use std::env;
use std::net::TcpListener;
use std::path::Path;
use std::process::ExitCode;
use std::sync::{Arc, Mutex};
use std::thread;

use queue::Store;

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
    eprintln!("erevos-relay listening on tcp {tcp_addr} and ws {ws_addr}");
    let store = Arc::new(Mutex::new(store));
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
