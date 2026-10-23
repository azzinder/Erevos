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
//! token for the phone and the line for the file. A phone whose line goes is
//! cut off at its next request, on a connection already open too.
//!
//! Set `EREVOS_RELAY_INVITES=on` beside it to let every phone with a token of
//! its own invite more phones, one an invite (see `invites.rs`): an invite is a
//! QR code with the relay's address and a secret, good for one phone for 7
//! days, and the phone that takes it gets a line of its own in the file, named
//! as the inviter typed and saying who invited it. That line lasts only as long
//! as the inviter's: when the inviter's line goes, for whatever reason, the
//! lines it invited go too, and those they invited. That goes by the token, so
//! a line put in place of another with a new token takes the old one's
//! invited lines with it; `erevos-relay free-line NAME`, run with the relay
//! stopped, frees a line from the line that invited it. The relay lets in at most
//! `EREVOS_RELAY_MAX_INVITED` phones by invite at once (100 unless set),
//! counting invites still open. The relay then writes the file itself, through
//! a file beside it and a rename, so the file must be in a folder the relay can
//! write (with the systemd unit in `deploy/relay`, `/var/lib/erevos-relay/`,
//! not `/etc`), and must be the file itself: the relay does not start when the
//! path is a symbolic link. The invites are kept in `<file>.invites`, and read
//! even with invites off, so turning them off frees no one from their inviter.
//! Off unless set.
//!
//! Set `EREVOS_RELAY_OIDC_ISSUER` beside it to let phones sign in with an
//! OpenID Connect provider for a token of their own (see `signin.rs`), with
//! `EREVOS_RELAY_OIDC_CLIENT_ID` and `EREVOS_RELAY_OIDC_CLIENT_SECRET` (a
//! confidential client whose redirect URI is `<public URL>/signin/callback`),
//! `EREVOS_RELAY_PUBLIC_URL` (where browsers reach the relay, as
//! `https://erevos.example.org`) and `EREVOS_RELAY_OIDC_NAME` (the name on
//! the app's button and before each line's name, `OIDC` unless set). The
//! WebSocket port then answers the browser's requests on `/signin/` too, so
//! a proxy in front must pass that path as plain HTTP. The page there shows a
//! code, which the person types in Erevos. Each phone that signs in gets a
//! line `<name>:<user name>`, and every hour the relay asks the provider
//! whether the account may still sign in, taking the line out when it may not,
//! or when the provider could not say so for 72 hours and then at two more
//! checks of that line an hour apart. One browser may start 10 sign-ins a
//! minute, told by its address, or by the last one in `X-Forwarded-For` when
//! the connection comes from a proxy on this machine. Set
//! `EREVOS_RELAY_OIDC_GROUP` to let in only accounts in that group, as the
//! provider's userinfo names them in `groups` (Authentik does for the
//! `profile` scope), at sign-in and at every check. What the check needs is
//! kept in `<file>.signins`, the refresh tokens sealed with a key made from the
//! client secret; a line named `<name>:` with no record there is said at
//! start. Off unless set.
//!
//! Each connection has a thread of its own, so the relay takes at most
//! `EREVOS_RELAY_MAX_CONNECTIONS` at once (512 unless set), both front ends
//! together, and of those at most `EREVOS_RELAY_MAX_TOKENLESS_CONNECTIONS`
//! (128 unless set) on the paths that need no token (`/sealed`, `/files`
//! and `/join`). Past that, a new connection is closed at once. A connection
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
//! Set `EREVOS_RELAY_PUSH_KEY` to a file path to let web apps ask for a
//! push when a message comes (Web Push, see `push.rs`). The key is made
//! there on first start and must be kept; the push addresses are kept beside
//! it, in `<file>.addresses`, and the browsers' keys for them in
//! `<file>.addresses.keys`. `EREVOS_RELAY_PUSH_SUBJECT` is the `mailto:` or
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

mod connect;
mod files;
mod invites;
mod journal;
mod later;
mod lend;
mod lock;
mod oidc;
mod pages;
mod peers;
mod push;
mod queue;
mod server;
mod signin;
mod tokens;
mod turn;

use std::env;
use std::fs;
use std::io;
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
            // Written beside it and renamed: a stop halfway leaves no short key.
            let key = RelayKey::generate();
            journal::write_whole(path, &key.to_secret_bytes())?;
            Ok(key)
        }
        Err(e) => Err(e),
    }
}

/// `erevos-relay free-line NAME`: drops the invite that made the line named
/// `name` in the file of tokens (`EREVOS_RELAY_TOKENS`), so that it no longer
/// goes with the line of the phone that invited it and is as a line the
/// operator wrote. Run with the relay stopped, since a running relay writes
/// its own invites over the file; as root, the file of invites stays its
/// owner's.
fn free_line(name: &str) -> ExitCode {
    let Some(path) = env::var("EREVOS_RELAY_TOKENS")
        .ok()
        .filter(|path| !path.is_empty())
    else {
        eprintln!("erevos-relay: free-line needs EREVOS_RELAY_TOKENS set to the file of tokens the relay uses");
        return ExitCode::FAILURE;
    };
    if name.is_empty() {
        eprintln!("erevos-relay: free-line needs the name on the line, as in erevos-relay free-line maria");
        return ExitCode::FAILURE;
    }
    let lines = tokens::Tokens::new(PathBuf::from(&path)).named(name);
    let line = match lines.as_slice() {
        [line] => *line,
        [] => {
            eprintln!("erevos-relay: no line of {path} is named {name:?}");
            return ExitCode::FAILURE;
        }
        _ => {
            eprintln!(
                "erevos-relay: {} lines of {path} are named {name:?}; give all but one another name first",
                lines.len()
            );
            return ExitCode::FAILURE;
        }
    };
    let kept = PathBuf::from(format!("{path}.invites"));
    let owner = owner_of(&kept);
    let invites = match invites::Invites::open(&kept, false, usize::MAX) {
        Ok(invites) => invites,
        Err(e) => {
            eprintln!(
                "erevos-relay: cannot read the invites {}: {e}",
                kept.display()
            );
            return ExitCode::FAILURE;
        }
    };
    match invites.free(&line) {
        Ok(by) if by.is_empty() => {
            println!(
                "No invite kept in {} made the line {name:?}: it goes with no other line already.",
                kept.display()
            );
            ExitCode::SUCCESS
        }
        Ok(by) => {
            give_back(&kept, owner);
            println!(
                "The line {name:?} no longer goes with the line that invited it ({}). Start the relay again.",
                by.join(", ")
            );
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!(
                "erevos-relay: cannot write the invites {}: {e}",
                kept.display()
            );
            ExitCode::FAILURE
        }
    }
}

/// Who owns the file at `path`, if it is there.
#[cfg(unix)]
fn owner_of(path: &Path) -> Option<(u32, u32)> {
    use std::os::unix::fs::MetadataExt;
    fs::metadata(path).ok().map(|meta| (meta.uid(), meta.gid()))
}

#[cfg(not(unix))]
fn owner_of(_: &Path) -> Option<(u32, u32)> {
    None
}

/// Gives the file at `path`, written again, back to `owner` when it is now
/// another's: written by root for the relay's own user, it must stay that
/// user's.
#[cfg(unix)]
fn give_back(path: &Path, owner: Option<(u32, u32)>) {
    if let Some((uid, gid)) = owner.filter(|owner| owner_of(path) != Some(*owner)) {
        // lchown: a link put there since changes the link, never what it points to.
        if let Err(e) = std::os::unix::fs::lchown(path, Some(uid), Some(gid)) {
            eprintln!(
                "erevos-relay: cannot give {} back to its owner: {e}",
                path.display()
            );
        }
    }
}

#[cfg(not(unix))]
fn give_back(_: &Path, _: Option<(u32, u32)>) {}

fn main() -> ExitCode {
    if env::args().nth(1).as_deref() == Some("new-token") {
        let name = env::args().skip(2).collect::<Vec<_>>().join(" ");
        let (token, line) = tokens::new_token(&name);
        println!("The phone's token, to type in its Relay settings:\n{token}\n");
        println!("Its line, to add to the file EREVOS_RELAY_TOKENS names (the relay keeps only this):\n{line}");
        return ExitCode::SUCCESS;
    }
    if env::args().nth(1).as_deref() == Some("free-line") {
        return free_line(&env::args().skip(2).collect::<Vec<_>>().join(" "));
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
    let inviting = match invites::wanted(env::var("EREVOS_RELAY_INVITES").ok().as_deref()) {
        Ok(on) => on,
        Err(e) => {
            eprintln!("erevos-relay: {e}");
            return ExitCode::FAILURE;
        }
    };
    let Some(most_invited) = number("EREVOS_RELAY_MAX_INVITED", invites::MAX_INVITED as u64, 1)
    else {
        return ExitCode::FAILURE;
    };
    if let Some(path) = &phones {
        // The relay writes the file through a rename, which would put a file where a link was.
        if let Err(e) = tokens::plain_file(Path::new(path)) {
            eprintln!("erevos-relay: cannot use the phones' tokens: {e}");
            return ExitCode::FAILURE;
        }
        let tokens = tokens::Tokens::new(PathBuf::from(path));
        // Read now, so how many it holds, and a line it cannot read, is said at start.
        tokens.count();
        let _ = store.tokens.set(tokens);
    }
    let kept_invites = phones.as_ref().map(|path| format!("{path}.invites"));
    match (&kept_invites, inviting) {
        // Invites kept from before, with invites off now, still say who invited whom.
        (Some(kept), on) if on || Path::new(kept).exists() => {
            let most = most_invited.try_into().unwrap_or(usize::MAX);
            match invites::Invites::open(Path::new(kept), on, most) {
                Ok(invites) => {
                    if on {
                        eprintln!("erevos-relay: phones with tokens of their own may invite others, {most} at most let in by invite, {} invites kept in {kept}", invites.len());
                    } else {
                        eprintln!("erevos-relay: invites are off, but the phones let in by invite before, kept in {kept}, still go with the phones that invited them");
                    }
                    if let Some(tokens) = store.tokens.get() {
                        tokens.set_invited(invites.edges(tokens));
                    }
                    let _ = store.invites.set(invites);
                }
                Err(e) => {
                    eprintln!("erevos-relay: cannot read the invites {kept}: {e}");
                    return ExitCode::FAILURE;
                }
            }
        }
        (None, true) => eprintln!(
            "erevos-relay: EREVOS_RELAY_INVITES=on but no EREVOS_RELAY_TOKENS set, nobody may invite"
        ),
        _ => {}
    }
    let signing = match oidc::Config::from(|name| env::var(name).ok()) {
        Ok(config) => config,
        Err(e) => {
            eprintln!("erevos-relay: {e}");
            return ExitCode::FAILURE;
        }
    };
    match (&phones, signing) {
        (Some(path), Some(config)) => {
            let kept = format!("{path}.signins");
            let name = config.name.clone();
            match signin::SignIn::open(config, Some(PathBuf::from(&kept))) {
                Ok(signin) => {
                    eprintln!("erevos-relay: phones may sign in with {name} for tokens of their own, {} signed in, kept in {kept}", signin.len());
                    if let Some(tokens) = store.tokens.get() {
                        // Lines the relay was taking out when it stopped go now, not at the first look.
                        signin.cut_pending(tokens);
                    }
                    for line in store.tokens.get().map(|t| signin.unrecorded(t)).unwrap_or_default() {
                        eprintln!("erevos-relay: the line {line:?} is named as a sign-in with {name}, but {kept} has no record of it, so it is never checked with {name}: take it out unless you wrote it yourself");
                    }
                    let _ = store.signin.set(signin);
                    let checked = Arc::clone(&store);
                    thread::spawn(move || server::run_signin_checks(checked));
                }
                Err(e) => {
                    eprintln!("erevos-relay: cannot read the sign-ins {kept}: {e}");
                    return ExitCode::FAILURE;
                }
            }
        }
        (None, Some(_)) => eprintln!(
            "erevos-relay: EREVOS_RELAY_OIDC_ISSUER is set but no EREVOS_RELAY_TOKENS, nobody may sign in"
        ),
        (_, None) => {}
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
