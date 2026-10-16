//! Erevos relay: holds one-way message queues for offline delivery.
//!
//! Listens on the address given as the first argument, `127.0.0.1:7878` by
//! default. Put it behind TLS in production; this binary speaks plain TCP.

mod queue;
mod server;

use std::env;
use std::net::TcpListener;
use std::process::ExitCode;

fn main() -> ExitCode {
    let addr = env::args().nth(1).unwrap_or_else(|| "127.0.0.1:7878".to_string());
    let listener = match TcpListener::bind(&addr) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("erevos-relay: cannot listen on {addr}: {e}");
            return ExitCode::FAILURE;
        }
    };
    eprintln!("erevos-relay listening on {addr}");
    match server::serve(listener) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("erevos-relay: {e}");
            ExitCode::FAILURE
        }
    }
}
