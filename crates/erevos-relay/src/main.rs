//! Erevos relay: holds one-way message queues for offline delivery.
//!
//! Usage: `erevos-relay [TCP_ADDR] [WS_ADDR]`. The defaults are
//! `127.0.0.1:7878` for TCP and `127.0.0.1:7879` for WebSocket. Both front
//! ends share one store. This binary speaks plain TCP and plain WebSocket
//! (`ws://`), so put the WebSocket behind a TLS proxy before it leaves the
//! local network.
//!
//! Set `EREVOS_RELAY_TOKEN` to require `Authorization: Bearer <token>` (or,
//! from a browser, the token as a subprotocol) on WebSocket connections. Without it, anyone who can reach the WebSocket port
//! can use the relay. The TCP front end has no token, so keep it on
//! `127.0.0.1` anywhere others can reach the machine.
//!
//! Set `EREVOS_RELAY_TOKENS` to a file of the phones' tokens of their own, so
//! that each phone's access can be taken back alone (see `tokens.rs`): one
//! token's SHA-256 a line, read again when the file changes, taken beside
//! `EREVOS_RELAY_TOKEN`. `erevos-relay new-token NAME` makes one, printing the
//! token for the phone and the line for the file.
//!
//! Each connection has a thread of its own, so the relay takes at most
//! `EREVOS_RELAY_MAX_CONNECTIONS` at once (512 unless set), both front ends
//! together, and of those at most `EREVOS_RELAY_MAX_TOKENLESS_CONNECTIONS`
//! (128 unless set) on the paths that need no token (`/sealed` and
//! `/files`). Past that, a new connection is closed at once. A connection
//! that sends nothing for five minutes is closed (see `server.rs`).
//!
//! Set `EREVOS_RELAY_JOURNAL` to a file path to keep queues and waiting
//! messages there, so they survive a restart. Without it, they live in memory
//! only and are lost when the relay stops.
//!
//! Messages nobody takes expire after 14 days. Set `EREVOS_RELAY_TTL_DAYS`
//! to change that.
//!
//! The relay holds at most `EREVOS_RELAY_MAX_QUEUES` queues (100000 unless
//! set), places lent among them; past that, a phone asking for a new one is
//! told the relay is full. A queue its phone has not taken from or waited on
//! for `EREVOS_RELAY_QUEUE_DAYS` (180 unless set) expires, with what waits in
//! it (see `queue.rs`).
//!
//! Set `EREVOS_RELAY_KEY` to a file path to give the relay a key for sealed
//! sends (two-hop sending, see `server.rs`). The file is made on first start
//! and must be kept: phones put the public key in their contact links.
//! Without it, the relay still forwards for its own phones but cannot take
//! sealed sends from other relays.
//!
//! A forward (and taking a file through this relay) goes only to relays at
//! addresses on the internet, not to this machine or its network (see
//! `peers.rs`). Set `EREVOS_RELAY_PRIVATE_PEERS=allow` where relays reach
//! each other at private addresses, as on a home network.
//!
//! Set `EREVOS_RELAY_LEND=on` on a relay with a key to lend places to phones
//! that have no relay of their own (see `lend.rs`): its phones put a ticket
//! in their contact links, and whoever adds them without a relay takes a
//! queue here with it. Off unless set. How many places each ticket gave and
//! what each place used today are kept in `<key file>.lent-counts`. A new key
//! takes back every place lent; to take back the places of one ticket only,
//! put its nonce on a line of `EREVOS_RELAY_LEND_REVOKED` (`<key
//! file>.revoked` unless set), which the relay reads again when it changes.
//!
//! Set `EREVOS_RELAY_FILES` to a folder to keep the chunks of files that
//! phones send (see `files.rs`) there. Without it, they live in memory and are
//! lost when the relay stops. `EREVOS_RELAY_FILES_MB` sets how much room they
//! may take together: 1024 MB on disk unless set, 256 MB in memory. Chunks
//! nobody takes expire like messages.
//!
//! Set `EREVOS_RELAY_PUSH_KEY` to a file path to let web apps ask for an
//! empty push when a message comes (Web Push, see `push.rs`). The key is made
//! there on first start and must be kept; the push addresses are kept beside
//! it, in `<file>.addresses`. `EREVOS_RELAY_PUSH_SUBJECT` is the `mailto:` or
//! `https:` address push services may write to about the relay.
//!
//! Messages sent for later (see `later.rs`) are kept in the folder
//! `EREVOS_RELAY_LATER`, or else in `<journal>.later` beside the journal,
//! until they go. Without either, they live in memory and are lost when the
//! relay stops.
//!
//! Set `EREVOS_TURN_URLS` (comma-separated `turn:` addresses) and
//! `EREVOS_TURN_SECRET` (the `static-auth-secret` of the coturn beside the
//! relay) to hand phones credentials for calls through it (see `turn.rs`).
//! Without them, phones can only call directly, on the same network.

mod files;
mod journal;
mod later;
mod lend;
mod lock;
mod peers;
mod push;
mod queue;
mod server;
mod tokens;
mod turn;

use std::env;
use std::fs;
use std::io::{self, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use erevos_core::relay_seal::RelayKey;
use files::FileStore;
use later::Held;
use queue::Store;
use server::{Limits, Shared};
use turn::Turn;

/// The whole number in the environment variable `name`, or `default` when it
/// is not set. `None`, after saying why, when it is set to anything but a
/// whole number of at least `least`.
fn number(name: &str, default: u64, least: u64) -> Option<u64> {
    match env::var(name) {
        Ok(text) if !text.is_empty() => match text.parse::<u64>() {
            Ok(n) if n >= least => Some(n),
            _ => {
                eprintln!("erevos-relay: {name} must be a whole number, at least {least}");
                None
            }
        },
        _ => Some(default),
    }
}

/// Reads the relay key from `path`, or makes one there if the file does not exist.
fn load_key(path: &Path) -> io::Result<RelayKey> {
    match fs::read(path) {
        Ok(bytes) => {
            let bytes: [u8; 32] = bytes.try_into().map_err(|_| {
                io::Error::new(io::ErrorKind::InvalidData, "a relay key is 32 bytes")
            })?;
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
    if env::args().nth(1).as_deref() == Some("new-token") {
        let name = env::args().skip(2).collect::<Vec<_>>().join(" ");
        let (token, line) = tokens::new_token(&name);
        println!("The phone's token, to type in its Relay settings:\n{token}\n");
        println!("Its line, to add to the file EREVOS_RELAY_TOKENS names (the relay keeps only this):\n{line}");
        return ExitCode::SUCCESS;
    }
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
    let phones = env::var("EREVOS_RELAY_TOKENS")
        .ok()
        .filter(|path| !path.is_empty());
    if token.is_none() && phones.is_none() {
        eprintln!("erevos-relay: no EREVOS_RELAY_TOKEN or EREVOS_RELAY_TOKENS set, the WebSocket accepts anyone");
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
    let Some(max_queues) = number(
        "EREVOS_RELAY_MAX_QUEUES",
        queue::DEFAULT_MAX_QUEUES as u64,
        1,
    ) else {
        return ExitCode::FAILURE;
    };
    let Some(queue_days) = number(
        "EREVOS_RELAY_QUEUE_DAYS",
        queue::DEFAULT_QUEUE_TTL / queue::DAY,
        1,
    ) else {
        return ExitCode::FAILURE;
    };
    let (max_queues, queue_ttl) = (
        max_queues.try_into().unwrap_or(usize::MAX),
        queue_days.saturating_mul(queue::DAY),
    );
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
    let store = store.with_queue_limits(max_queues, queue_ttl);
    eprintln!(
        "erevos-relay: holding {max_queues} queues at most, each until its phone leaves it unused for {queue_days} days"
    );
    let key = match env::var("EREVOS_RELAY_KEY") {
        Ok(path) if !path.is_empty() => match load_key(Path::new(&path)) {
            Ok(key) => Some(key),
            Err(e) => {
                eprintln!("erevos-relay: cannot use the key file {path}: {e}");
                return ExitCode::FAILURE;
            }
        },
        _ => {
            eprintln!(
                "erevos-relay: no EREVOS_RELAY_KEY set, sealed sends from other relays are refused"
            );
            None
        }
    };
    let turn = match (env::var("EREVOS_TURN_URLS"), env::var("EREVOS_TURN_SECRET")) {
        (Ok(urls), Ok(secret)) if !urls.is_empty() || !secret.is_empty() => {
            match Turn::new(&urls, &secret) {
                Some(turn) => Some(turn),
                None => {
                    eprintln!("erevos-relay: EREVOS_TURN_URLS needs turn: or turns: addresses, at most {}, and EREVOS_TURN_SECRET a secret", turn::MAX_URLS);
                    return ExitCode::FAILURE;
                }
            }
        }
        _ => {
            eprintln!("erevos-relay: no EREVOS_TURN_URLS and EREVOS_TURN_SECRET set, calls cannot go through a call relay");
            None
        }
    };
    let cap = match env::var("EREVOS_RELAY_FILES_MB") {
        Ok(mb) if !mb.is_empty() => match mb.parse::<u64>() {
            Ok(mb) => Some(mb << 20),
            Err(_) => {
                eprintln!(
                    "erevos-relay: EREVOS_RELAY_FILES_MB must be a whole number of megabytes"
                );
                return ExitCode::FAILURE;
            }
        },
        _ => None,
    };
    let files = match env::var("EREVOS_RELAY_FILES") {
        Ok(dir) if !dir.is_empty() => {
            match FileStore::open(Path::new(&dir), cap.unwrap_or(files::DEFAULT_CAP), ttl) {
                Ok(files) => {
                    eprintln!(
                        "erevos-relay: keeping files in {dir}, {} MB now",
                        files.used() >> 20
                    );
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
    let held_dir = env::var("EREVOS_RELAY_LATER")
        .ok()
        .filter(|dir| !dir.is_empty())
        .or_else(|| {
            env::var("EREVOS_RELAY_JOURNAL")
                .ok()
                .filter(|path| !path.is_empty())
                .map(|path| format!("{path}.later"))
        });
    let held = match &held_dir {
        Some(dir) => {
            match Held::open(Path::new(dir), ttl) {
                Ok(held) => {
                    eprintln!(
                        "erevos-relay: keeping messages sent for later in {dir}, {} now",
                        held.len()
                    );
                    held
                }
                Err(e) => {
                    eprintln!("erevos-relay: cannot open the folder for messages sent for later {dir}: {e}");
                    return ExitCode::FAILURE;
                }
            }
        }
        None => {
            eprintln!("erevos-relay: messages sent for later are kept in memory and lost when the relay stops");
            Held::in_memory(ttl)
        }
    };
    let Some(connections) = number(
        "EREVOS_RELAY_MAX_CONNECTIONS",
        server::DEFAULT_MAX_CONNECTIONS as u64,
        1,
    ) else {
        return ExitCode::FAILURE;
    };
    let Some(tokenless) = number(
        "EREVOS_RELAY_MAX_TOKENLESS_CONNECTIONS",
        server::DEFAULT_MAX_TOKENLESS as u64,
        1,
    ) else {
        return ExitCode::FAILURE;
    };
    let private_peers = match env::var("EREVOS_RELAY_PRIVATE_PEERS").as_deref() {
        Ok("allow") => {
            eprintln!("erevos-relay: EREVOS_RELAY_PRIVATE_PEERS=allow, forwards may go to relays on this machine and its network");
            true
        }
        Ok("" | "deny") | Err(_) => false,
        Ok(_) => {
            eprintln!("erevos-relay: EREVOS_RELAY_PRIVATE_PEERS must be allow or deny");
            return ExitCode::FAILURE;
        }
    };
    let limits = Limits {
        connections: connections.try_into().unwrap_or(usize::MAX),
        tokenless: tokenless.try_into().unwrap_or(usize::MAX),
        private_peers,
        ..Limits::default()
    };
    eprintln!(
        "erevos-relay: taking {} connections at once, {} of them on the paths that need no token",
        limits.connections,
        limits.tokenless.min(limits.connections)
    );
    eprintln!("erevos-relay listening on tcp {tcp_addr} and ws {ws_addr}");
    let store = Shared::new(store, files, key, turn, limits);
    if let Some(path) = phones {
        let tokens = tokens::Tokens::new(PathBuf::from(&path));
        // Read now, so how many it holds, and a line it cannot read, is said at start.
        tokens.count();
        let _ = store.tokens.set(tokens);
    }
    let lending = match lend::wanted(env::var("EREVOS_RELAY_LEND").ok().as_deref()) {
        Ok(on) => on,
        Err(e) => {
            eprintln!("erevos-relay: {e}");
            return ExitCode::FAILURE;
        }
    };
    match (&store.key, lending) {
        (Some(key), true) => {
            // Lending needs the key, so what it keeps goes beside the key's file.
            let key_path = env::var("EREVOS_RELAY_KEY").unwrap_or_default();
            let counts = format!("{key_path}.lent-counts");
            let revoked = env::var("EREVOS_RELAY_LEND_REVOKED")
                .ok()
                .filter(|path| !path.is_empty())
                .unwrap_or_else(|| format!("{key_path}.revoked"));
            let list = lend::Revoked::new(PathBuf::from(&revoked));
            match lend::Lend::open(key, Path::new(&counts), list) {
                Ok(lend) => {
                    eprintln!("erevos-relay: lending places to phones without a relay, counting them in {counts}, revoked tickets in {revoked}");
                    // Read now, so what it holds, and a line it cannot read, is said at start.
                    if let Some(revoked) = lend.revoked() {
                        revoked.count();
                    }
                    let _ = store.lend.set(lend);
                }
                Err(e) => {
                    eprintln!("erevos-relay: cannot read the counts of lent places {counts}: {e}");
                    return ExitCode::FAILURE;
                }
            }
        }
        (None, true) => eprintln!(
            "erevos-relay: EREVOS_RELAY_LEND=on but no EREVOS_RELAY_KEY set, no places are lent"
        ),
        (_, false) => eprintln!(
            "erevos-relay: no EREVOS_RELAY_LEND=on set, no places are lent to phones without a relay"
        ),
    }
    *store.held() = held;
    let held_store = Arc::clone(&store);
    thread::spawn(move || server::run_held(held_store));
    match env::var("EREVOS_RELAY_PUSH_KEY") {
        Ok(path) if !path.is_empty() => {
            let key = match push::load_key(Path::new(&path)) {
                Ok(key) => key,
                Err(e) => {
                    eprintln!("erevos-relay: cannot use the push key file {path}: {e}");
                    return ExitCode::FAILURE;
                }
            };
            let subject = env::var("EREVOS_RELAY_PUSH_SUBJECT")
                .ok()
                .filter(|s| s.starts_with("mailto:") || s.starts_with("https://"))
                .unwrap_or_else(|| "mailto:erevos-relay@invalid".to_string());
            let allowed = push::PUSH_SERVICES.iter().map(|s| s.to_string()).collect();
            let addresses = format!("{path}.addresses");
            match push::Push::new(key, subject, allowed, Some(addresses.into())) {
                Ok(push) => {
                    let _ = store.push.set(push);
                }
                Err(e) => {
                    eprintln!("erevos-relay: cannot read the push addresses beside {path}: {e}");
                    return ExitCode::FAILURE;
                }
            }
        }
        _ => eprintln!(
            "erevos-relay: no EREVOS_RELAY_PUSH_KEY set, web apps cannot ask for notifications"
        ),
    }
    let sweep_store = Arc::clone(&store);
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(60 * 60));
        server::sweep(&sweep_store);
    });
    let ws_store = Arc::clone(&store);
    thread::spawn(move || server::serve_ws(ws, ws_store, token));
    server::serve(tcp, store)
}
