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
//! can use the relay.

mod queue;
mod server;

use std::env;
use std::net::TcpListener;
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
    eprintln!("erevos-relay listening on tcp {tcp_addr} and ws {ws_addr}");
    let token = env::var("EREVOS_RELAY_TOKEN")
        .ok()
        .filter(|t| !t.is_empty())
        .map(|t| Arc::from(t.as_str()));
    if token.is_none() {
        eprintln!("erevos-relay: no EREVOS_RELAY_TOKEN set, the WebSocket accepts anyone");
    }
    let store = Arc::new(Mutex::new(Store::default()));
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
