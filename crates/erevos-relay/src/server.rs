//! Front ends for the queue store. Both speak the same protocol: each request
//! is one opcode byte followed by its fields; each reply starts with a status
//! byte.
//!
//! - TCP: requests and replies back to back on one connection.
//! - WebSocket: one request per binary message, one reply per binary message.
//!   React Native can open WebSocket connections without a native module, so
//!   the phones use this one.
//!
//! Requests:
//! - `CREATE`: no fields. Reply: recipient id, sender id (24 bytes each).
//! - `SEND`: sender id, then a 4-byte length and the message.
//! - `RECEIVE`: recipient id. Reply: a 1-byte flag, then a length and the
//!   message if one was waiting. The message is deleted from the relay.
//! - `WAIT`: recipient id, then 1 byte: seconds to wait, at most `MAX_WAIT`.
//!   Reply: `OK` and 1 as soon as a message waits in the queue, or `OK` and 0
//!   when none came in that time. Nothing is taken: a `RECEIVE` takes it. A
//!   phone in the background waits so instead of asking every few seconds,
//!   and nothing is lost if its connection drops while it waits.
//! - `DELETE`: recipient id.
//! - `KEY`: no fields. Reply: the relay's public key (32 bytes) for sealed
//!   sends, or `NOT_FOUND` if it has none.
//! - `FORWARD`: a 2-byte length and a relay address (`ws://` or `wss://`),
//!   then a 4-byte length and a sealed send for that relay (see
//!   `erevos_core::relay_seal`). This relay passes the sealed send on and
//!   replies with that relay's status, or `UNREACHABLE`.
//! - `SEALED_SEND`: a 4-byte length and a sealed send. The relay opens it and
//!   queues the message as `SEND` would.
//! - `FILE_PUT`: a 4-byte length and a chunk of an encrypted file, at most
//!   `MAX_CHUNK` bytes. Reply: the chunk's id (24 bytes), or `FULL` when the
//!   file store has no room (see `files.rs`).
//! - `FILE_GET`: a chunk id. Reply: a 4-byte length and the chunk. The chunk
//!   stays until it is deleted or expires.
//! - `FILE_DELETE`: a chunk id.
//! - `FILE_VIA`: a 2-byte length and a relay address (`ws://` or `wss://`),
//!   then a whole `FILE_GET` or `FILE_DELETE` request. This relay passes the
//!   request to `<address>/files` and replies with that relay's reply, or
//!   `UNREACHABLE`.
//! - `PUSH_KEY`: no fields. Reply: the relay's key for Web Push (65 bytes,
//!   an uncompressed P-256 point), or `NOT_FOUND` if the relay does not push.
//! - `PUSH_SET`: recipient id, then a 2-byte length and a push address made
//!   by a browser for that key; empty removes it. From then on each message
//!   that comes into the queue sends an empty push there (see `push.rs`).
//!   Reply: `OK`, `NOT_FOUND` (no such queue, or the relay does not push), or
//!   `FAILED` (not a known push service's address, or not written).
//! - `LATER`: 8-byte Unix seconds, a 16-byte id, then a 4-byte length and a
//!   whole `SEND`, `FORWARD` or `SEALED_SEND` request. The relay holds the
//!   request and runs it at that time, as if it came then (see `later.rs`),
//!   so a message sent for later goes then though the phone is off by then.
//!   Reply: `OK` (also when it holds that id already, so a phone may ask
//!   again), `FULL` (it holds `MAX_HELD` requests or `HELD_CAP` bytes), or
//!   `FAILED`. A time more than `MAX_AHEAD` ahead closes the connection.
//! - `UNLATER`: a 16-byte id. Reply: `OK` if the relay held that request
//!   and dropped it now, `NOT_FOUND` if it holds none (it went, is going
//!   now, or never came), or `FAILED`.
//! - `FILE_KEEP`: 8-byte Unix seconds, then as `FILE_PUT`. The chunk's time
//!   to expire starts then rather than now: a file in a message sent for
//!   later. A time more than `MAX_AHEAD` ahead closes the connection.
//! - `CALL_RELAY`: no fields. Reply: credentials for the call relay beside
//!   this relay (see `turn.rs`): a 2-byte length and the username, a 2-byte
//!   length and the password, a 1-byte count of addresses and each address
//!   after a 2-byte length. `NOT_FOUND` if the relay has no call relay.
//!
//! Two-hop sending: a phone gives `FORWARD` to its own relay, which opens a
//! WebSocket to `<address>/sealed` on the contact's relay and sends
//! `SEALED_SEND` there. The first relay sees the phone's address but not the
//! queue; the second sees the queue but not the phone's address. The
//! `/sealed` path needs no token, so relays can reach each other, and takes
//! only `KEY` and `SEALED_SEND`.
//!
//! Files: a phone puts the chunks of a file on its own relay and gives their
//! ids to its contact, end-to-end encrypted. The contact takes them through
//! its own relay with `FILE_VIA`, so the sender's relay sees the contact's
//! relay, not the contact's phone. The `/files` path needs no token, since
//! the chunk id is what guards a chunk, and takes only `FILE_GET` and
//! `FILE_DELETE`.
//!
//! Reply status: `OK`, `NOT_FOUND` (no such queue or chunk), `FULL` (the
//! queue holds `MAX_QUEUED` messages, or the file store is full), `FAILED`
//! (the relay could not write the change to its journal or file store, so
//! nothing changed; try again later), or `UNREACHABLE` (a forward could not
//! reach the other relay, or it closed without a reply).
//!
//! A message longer than `MAX_MESSAGE`, a chunk longer than `MAX_CHUNK`, an
//! unknown opcode, or an opcode the path does not allow closes the
//! connection.
//!
//! The WebSocket front end can require a bearer token in the `Authorization`
//! header, or, from a browser, which cannot set headers, as a subprotocol (see
//! `serve_ws`). Neither front end speaks TLS: put the WebSocket
//! behind a TLS proxy before it leaves the local network.
//!
//! Not audited.

use std::io::{self, Cursor, ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use erevos_core::relay_seal::{RelayKey, OVERHEAD};

use tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tungstenite::http::StatusCode;
use tungstenite::Message;

use crate::files::{ChunkId, FileError, FileStore, MAX_CHUNK};
use crate::later::{Held, HeldError, HeldId, MAX_AHEAD};
use crate::push::{Push, SetError, MAX_ENDPOINT};
use crate::queue::{system_now, QueueError, QueueId, Store};
use crate::turn::Turn;

/// What every connection shares: the queues, the file store, the key for
/// sealed sends if the relay has one, and the call relay if one runs beside it.
/// `arrived` wakes the connections that wait for a message (`WAIT`).
pub struct Shared {
    pub store: Mutex<Store>,
    pub arrived: Condvar,
    pub files: Mutex<FileStore>,
    pub key: Option<RelayKey>,
    pub turn: Option<Turn>,
    /// Web Push, if the relay pushes (set once, after start).
    pub push: std::sync::OnceLock<Arc<Push>>,
    /// Requests held for later; `held_changed` wakes `run_held` when one
    /// comes or goes.
    pub held: Mutex<Held>,
    pub held_changed: Condvar,
}

pub type SharedStore = Arc<Shared>;

impl Shared {
    pub fn new(
        store: Store,
        files: FileStore,
        key: Option<RelayKey>,
        turn: Option<Turn>,
    ) -> SharedStore {
        Arc::new(Shared {
            store: Mutex::new(store),
            arrived: Condvar::new(),
            files: Mutex::new(files),
            key,
            turn,
            push: std::sync::OnceLock::new(),
            held: Mutex::new(Held::default()),
            held_changed: Condvar::new(),
        })
    }

    fn store(&self) -> std::sync::MutexGuard<'_, Store> {
        self.store.lock().expect("store lock")
    }

    fn files(&self) -> std::sync::MutexGuard<'_, FileStore> {
        self.files.lock().expect("files lock")
    }

    fn held(&self) -> std::sync::MutexGuard<'_, Held> {
        self.held.lock().expect("held lock")
    }
}

/// Largest message a sender may queue. Above the padding top bucket, to
/// leave room for the sealing overhead.
pub const MAX_MESSAGE: usize = 64 * 1024;

pub const CREATE: u8 = 1;
pub const SEND: u8 = 2;
pub const RECEIVE: u8 = 3;
pub const DELETE: u8 = 4;
pub const KEY: u8 = 5;
pub const FORWARD: u8 = 6;
pub const SEALED_SEND: u8 = 7;
pub const FILE_PUT: u8 = 8;
pub const FILE_GET: u8 = 9;
pub const FILE_DELETE: u8 = 10;
pub const FILE_VIA: u8 = 11;
pub const CALL_RELAY: u8 = 12;
pub const WAIT: u8 = 13;
pub const PUSH_KEY: u8 = 14;
pub const PUSH_SET: u8 = 15;
pub const LATER: u8 = 16;
pub const UNLATER: u8 = 17;
pub const FILE_KEEP: u8 = 18;

/// The longest a `WAIT` lasts, seconds.
pub const MAX_WAIT: u8 = 60;

pub const OK: u8 = 0;
pub const NOT_FOUND: u8 = 1;
pub const FULL: u8 = 2;
pub const FAILED: u8 = 3;
pub const UNREACHABLE: u8 = 4;

/// Largest sealed send: a full message and the sealing.
pub const MAX_SEALED: usize = MAX_MESSAGE + OVERHEAD;
/// Longest relay address a forward may name.
const MAX_ADDRESS: usize = 512;
/// The WebSocket path other relays use for sealed sends.
pub const SEALED_PATH: &str = "/sealed";
/// The WebSocket path other relays use to take and delete chunks.
pub const FILES_PATH: &str = "/files";
const FORWARD_TIMEOUT: Duration = Duration::from_secs(15);
/// A chunk can take longer to come than a message.
const FILE_TIMEOUT: Duration = Duration::from_secs(60);
/// Largest request held for later: a forward with the longest address and
/// sealed send.
const MAX_HELD_REQUEST: usize = 1 + 2 + MAX_ADDRESS + 4 + MAX_SEALED;
/// Longest `run_held` sleeps before it looks at the clock again, so a clock
/// set forward is followed soon.
const HELD_LOOK: u64 = 60;

/// What a connection may ask for.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Access {
    All,
    /// The `/sealed` path: `KEY` and `SEALED_SEND` only.
    Sealed,
    /// The `/files` path: `FILE_GET` and `FILE_DELETE` only.
    Files,
}

/// Serves raw TCP connections until the listener fails. Each connection gets
/// its own thread; all share one store.
pub fn serve(listener: TcpListener, store: SharedStore) -> io::Result<()> {
    loop {
        let (stream, _) = listener.accept()?;
        let store = Arc::clone(&store);
        thread::spawn(move || {
            // A bad client only loses its own connection.
            let _ = handle_tcp(stream, &store);
        });
    }
}

/// Serves WebSocket connections until the listener fails. Each connection gets
/// its own thread; all share the same store as the TCP front end. With a
/// `token`, a connection must send `Authorization: Bearer <token>` during the
/// handshake, or offer the subprotocols `erevos` and `erevos-token.<token in
/// hex>` as a browser does, or it is refused with 401. A connection that offers
/// `erevos` gets it as its subprotocol, which a browser needs to go on.
pub fn serve_ws(
    listener: TcpListener,
    store: SharedStore,
    token: Option<Arc<str>>,
) -> io::Result<()> {
    loop {
        let (stream, _) = listener.accept()?;
        let store = Arc::clone(&store);
        let token = token.clone();
        thread::spawn(move || {
            let _ = handle_ws(stream, &store, token.as_deref());
        });
    }
}

fn handle_tcp(mut stream: TcpStream, store: &Shared) -> io::Result<()> {
    while let Some(reply) = respond(&mut stream, store, Access::All)? {
        stream.write_all(&reply)?;
    }
    Ok(())
}

// The error type of the handshake callback is fixed by tungstenite, so it cannot be boxed here.
#[allow(clippy::result_large_err)]
fn handle_ws(stream: TcpStream, store: &Shared, token: Option<&str>) -> io::Result<()> {
    let mut access = Access::All;
    let check = |request: &Request, mut response: Response| {
        if offered_protocols(request).any(|p| p == PROTOCOL) {
            response.headers_mut().insert(
                "sec-websocket-protocol",
                PROTOCOL.parse().expect("a valid header value"),
            );
        }
        let path = request.uri().path();
        if path.ends_with(SEALED_PATH) {
            access = Access::Sealed;
            return Ok(response);
        }
        if path.ends_with(FILES_PATH) {
            access = Access::Files;
            return Ok(response);
        }
        match token {
            Some(expected) if !is_authorized(request, expected) => Err(unauthorized()),
            _ => Ok(response),
        }
    };
    let mut socket = tungstenite::accept_hdr(stream, check).map_err(to_io)?;
    loop {
        let message = match socket.read() {
            Ok(message) => message,
            Err(tungstenite::Error::ConnectionClosed | tungstenite::Error::AlreadyClosed) => {
                return Ok(())
            }
            Err(e) => return Err(to_io(e)),
        };
        match message {
            Message::Binary(bytes) => {
                let request: &[u8] = bytes.as_ref();
                let Some(reply) = respond(&mut Cursor::new(request), store, access)? else {
                    return Ok(());
                };
                socket.send(Message::Binary(reply.into())).map_err(to_io)?;
            }
            Message::Close(_) => return Ok(()),
            // Ping and pong are handled by tungstenite. Text is not part of the protocol.
            _ => {}
        }
    }
}

/// Reads one request from `r` and returns its reply. `None` means the peer
/// closed before a new request started.
fn respond(r: &mut impl Read, shared: &Shared, access: Access) -> io::Result<Option<Vec<u8>>> {
    let mut op = [0u8; 1];
    match r.read_exact(&mut op) {
        Ok(()) => {}
        Err(e) if e.kind() == ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let allowed = match access {
        Access::All => true,
        Access::Sealed => matches!(op[0], KEY | SEALED_SEND),
        Access::Files => matches!(op[0], FILE_GET | FILE_DELETE),
    };
    if !allowed {
        return Err(io::Error::new(
            ErrorKind::PermissionDenied,
            "not on this path",
        ));
    }
    let reply = match op[0] {
        CREATE => {
            let created = shared.store().create();
            match created {
                Ok(q) => {
                    let mut out = vec![OK];
                    out.extend_from_slice(&q.recipient_id);
                    out.extend_from_slice(&q.sender_id);
                    out
                }
                Err(e) => vec![code(e)],
            }
        }
        SEND => {
            let sender = read_id(r)?;
            let msg = read_message(r)?;
            let sent = shared.store().send(&sender, msg);
            status(arrived(shared, &sender, sent))
        }
        RECEIVE => {
            let recipient = read_id(r)?;
            let got = shared.store().receive(&recipient);
            match got {
                Ok(Some(msg)) => {
                    let mut out = vec![OK, 1];
                    out.extend_from_slice(&(msg.len() as u32).to_be_bytes());
                    out.extend_from_slice(&msg);
                    out
                }
                Ok(None) => vec![OK, 0],
                Err(e) => vec![code(e)],
            }
        }
        WAIT => {
            let recipient = read_id(r)?;
            let mut seconds = [0u8; 1];
            r.read_exact(&mut seconds)?;
            let until = Instant::now() + Duration::from_secs(u64::from(seconds[0].min(MAX_WAIT)));
            let mut store = shared.store();
            loop {
                match store.has_waiting(&recipient) {
                    Ok(true) => break vec![OK, 1],
                    Ok(false) => {}
                    Err(e) => break vec![code(e)],
                }
                let left = until.saturating_duration_since(Instant::now());
                if left.is_zero() {
                    break vec![OK, 0];
                }
                store = shared
                    .arrived
                    .wait_timeout(store, left)
                    .expect("store lock")
                    .0;
            }
        }
        DELETE => {
            let recipient = read_id(r)?;
            let deleted = shared.store().delete(&recipient);
            if deleted.is_ok() {
                if let Some(push) = shared.push.get() {
                    push.forget(&recipient);
                }
            }
            status(deleted)
        }
        KEY => match &shared.key {
            Some(key) => {
                let mut out = vec![OK];
                out.extend_from_slice(&key.public());
                out
            }
            None => vec![NOT_FOUND],
        },
        FORWARD => {
            let address = read_address(r)?;
            let sealed = read_sealed(r)?;
            vec![forward(&address, &sealed)]
        }
        SEALED_SEND => {
            let sealed = read_sealed(r)?;
            match shared.key.as_ref().map(|key| key.open(&sealed)) {
                Some(Ok((sender, msg))) if msg.len() <= MAX_MESSAGE => {
                    let sent = shared.store().send(&sender, msg);
                    status(arrived(shared, &sender, sent))
                }
                // Sealed for another key, changed on the way, or this relay has no key:
                // to the sender it is the same as a queue that is not here.
                _ => vec![NOT_FOUND],
            }
        }
        FILE_PUT => {
            let chunk = read_bytes(r, MAX_CHUNK)?;
            let put = shared.files().put(chunk);
            match put {
                Ok(id) => {
                    let mut out = vec![OK];
                    out.extend_from_slice(&id);
                    out
                }
                Err(e) => vec![file_code(e)],
            }
        }
        FILE_GET => {
            let id = read_id(r)?;
            let got = shared.files().get(&id);
            match got {
                Ok(chunk) => {
                    let mut out = Vec::with_capacity(1 + 4 + chunk.len());
                    out.push(OK);
                    out.extend_from_slice(&(chunk.len() as u32).to_be_bytes());
                    out.extend_from_slice(&chunk);
                    out
                }
                Err(e) => vec![file_code(e)],
            }
        }
        FILE_DELETE => {
            let id = read_id(r)?;
            let deleted = shared.files().delete(&id);
            vec![deleted.map_or_else(file_code, |()| OK)]
        }
        FILE_VIA => {
            let address = read_address(r)?;
            let mut op = [0u8; 1];
            r.read_exact(&mut op)?;
            if !matches!(op[0], FILE_GET | FILE_DELETE) {
                return Err(io::Error::new(ErrorKind::InvalidData, "not a file request"));
            }
            let id = read_id(r)?;
            file_via(&address, op[0], &id)
        }
        PUSH_KEY => match shared.push.get() {
            Some(push) => {
                let mut out = vec![OK];
                out.extend_from_slice(&push.public_key());
                out
            }
            None => vec![NOT_FOUND],
        },
        PUSH_SET => {
            let recipient = read_id(r)?;
            let mut len = [0u8; 2];
            r.read_exact(&mut len)?;
            let len = u16::from_be_bytes(len) as usize;
            if len > MAX_ENDPOINT {
                return Err(io::Error::new(
                    ErrorKind::InvalidData,
                    "push address too long",
                ));
            }
            let mut endpoint = vec![0u8; len];
            r.read_exact(&mut endpoint)?;
            let exists = !matches!(
                shared.store().has_waiting(&recipient),
                Err(QueueError::NotFound)
            );
            match (shared.push.get(), exists) {
                (Some(push), true) => match std::str::from_utf8(&endpoint) {
                    Ok(endpoint) => match push.set(&recipient, endpoint) {
                        Ok(()) => vec![OK],
                        Err(SetError::Refused | SetError::Storage) => vec![FAILED],
                    },
                    Err(_) => vec![FAILED],
                },
                _ => vec![NOT_FOUND],
            }
        }
        LATER => {
            let at = read_time(r)?;
            let id = read_held_id(r)?;
            let request = read_bytes(r, MAX_HELD_REQUEST)?;
            check_held(&request)?;
            let held = shared.held().hold(id, at, request);
            shared.held_changed.notify_all();
            vec![held.map_or_else(held_code, |()| OK)]
        }
        UNLATER => {
            let id = read_held_id(r)?;
            let dropped = shared.held().drop_held(&id);
            shared.held_changed.notify_all();
            match dropped {
                Ok(true) => vec![OK],
                Ok(false) => vec![NOT_FOUND],
                Err(e) => vec![held_code(e)],
            }
        }
        FILE_KEEP => {
            let from = read_time(r)?;
            let chunk = read_bytes(r, MAX_CHUNK)?;
            let put = shared.files().put_from(chunk, from);
            match put {
                Ok(id) => {
                    let mut out = vec![OK];
                    out.extend_from_slice(&id);
                    out
                }
                Err(e) => vec![file_code(e)],
            }
        }
        CALL_RELAY => match &shared.turn {
            Some(turn) => {
                let (username, password) = turn.credentials();
                let mut out = vec![OK];
                put_short(&mut out, username.as_bytes());
                put_short(&mut out, password.as_bytes());
                out.push(turn.urls().len() as u8);
                for url in turn.urls() {
                    put_short(&mut out, url.as_bytes());
                }
                out
            }
            None => vec![NOT_FOUND],
        },
        _ => return Err(io::Error::new(ErrorKind::InvalidData, "unknown opcode")),
    };
    Ok(Some(reply))
}

/// Wakes the connections waiting for a message once one was queued, and
/// pushes to the queue's web app if it asked for that.
fn arrived(
    shared: &Shared,
    sender: &QueueId,
    sent: Result<(), QueueError>,
) -> Result<(), QueueError> {
    if sent.is_ok() {
        shared.arrived.notify_all();
        if let Some(push) = shared.push.get() {
            if let Some(recipient) = shared.store().recipient_of(sender) {
                push.arrived(&recipient);
            }
        }
    }
    sent
}

/// Bytes after their 2-byte length. Only short, known strings go out this way.
fn put_short(out: &mut Vec<u8>, bytes: &[u8]) {
    out.extend_from_slice(&(bytes.len() as u16).to_be_bytes());
    out.extend_from_slice(bytes);
}

fn status(result: Result<(), QueueError>) -> Vec<u8> {
    vec![result.map_or_else(code, |()| OK)]
}

fn code(error: QueueError) -> u8 {
    match error {
        QueueError::NotFound => NOT_FOUND,
        QueueError::Full => FULL,
        QueueError::Storage => FAILED,
    }
}

fn held_code(error: HeldError) -> u8 {
    match error {
        HeldError::Full => FULL,
        HeldError::Storage => FAILED,
    }
}

fn file_code(error: FileError) -> u8 {
    match error {
        FileError::NotFound => NOT_FOUND,
        FileError::Full => FULL,
        FileError::Storage => FAILED,
    }
}

// Queue ids and chunk ids are both 24 bytes.
const _: () = assert!(std::mem::size_of::<QueueId>() == std::mem::size_of::<ChunkId>());

fn read_id(r: &mut impl Read) -> io::Result<QueueId> {
    let mut id = [0u8; 24];
    r.read_exact(&mut id)?;
    Ok(id)
}

fn read_held_id(r: &mut impl Read) -> io::Result<HeldId> {
    let mut id = [0u8; 16];
    r.read_exact(&mut id)?;
    Ok(id)
}

/// Unix seconds, at most `MAX_AHEAD` from now.
fn read_time(r: &mut impl Read) -> io::Result<u64> {
    let mut at = [0u8; 8];
    r.read_exact(&mut at)?;
    let at = u64::from_be_bytes(at);
    if at > system_now().saturating_add(MAX_AHEAD) {
        return Err(io::Error::new(ErrorKind::InvalidData, "too far ahead"));
    }
    Ok(at)
}

/// A request to hold for later must be one whole `SEND`, `FORWARD` or
/// `SEALED_SEND`, so it runs as it would have now.
fn check_held(request: &[u8]) -> io::Result<()> {
    let mut r = Cursor::new(request);
    let mut op = [0u8; 1];
    r.read_exact(&mut op)?;
    match op[0] {
        SEND => {
            read_id(&mut r)?;
            read_message(&mut r)?;
        }
        FORWARD => {
            read_address(&mut r)?;
            read_sealed(&mut r)?;
        }
        SEALED_SEND => {
            read_sealed(&mut r)?;
        }
        _ => return Err(io::Error::new(ErrorKind::InvalidData, "not a send")),
    }
    if r.position() != request.len() as u64 {
        return Err(io::Error::new(ErrorKind::InvalidData, "more than a send"));
    }
    Ok(())
}

/// Runs the requests held for later as their time comes, until the relay
/// stops. Each that went, or whose queue is gone, is forgotten; any other is
/// tried again later.
pub fn run_held(shared: SharedStore) {
    loop {
        let due = {
            let mut held = shared.held();
            loop {
                let now = system_now();
                match held.next() {
                    Some(at) if at <= now => break held.take_due(),
                    next => {
                        let wait = next.map_or(HELD_LOOK, |at| (at - now).min(HELD_LOOK));
                        held = shared
                            .held_changed
                            .wait_timeout(held, Duration::from_secs(wait))
                            .expect("held lock")
                            .0;
                    }
                }
            }
        };
        for request in due {
            let reply = respond(&mut Cursor::new(&request.request), &shared, Access::All);
            let done = matches!(&reply, Ok(Some(r)) if r.first().is_some_and(|s| *s == OK || *s == NOT_FOUND));
            let mut held = shared.held();
            if done {
                held.went(&request.id);
            } else {
                held.failed(&request.id);
            }
        }
    }
}

fn read_message(r: &mut impl Read) -> io::Result<Vec<u8>> {
    read_bytes(r, MAX_MESSAGE)
}

fn read_sealed(r: &mut impl Read) -> io::Result<Vec<u8>> {
    read_bytes(r, MAX_SEALED)
}

/// A relay address for a forward: `ws://` or `wss://` and nothing else.
fn read_address(r: &mut impl Read) -> io::Result<String> {
    let mut len = [0u8; 2];
    r.read_exact(&mut len)?;
    let len = u16::from_be_bytes(len) as usize;
    if len > MAX_ADDRESS {
        return Err(io::Error::new(ErrorKind::InvalidData, "address too long"));
    }
    let mut bytes = vec![0u8; len];
    r.read_exact(&mut bytes)?;
    let address = String::from_utf8(bytes)
        .map_err(|_| io::Error::new(ErrorKind::InvalidData, "address is not text"))?;
    if !(address.starts_with("ws://") || address.starts_with("wss://")) {
        return Err(io::Error::new(
            ErrorKind::InvalidData,
            "not a relay address",
        ));
    }
    Ok(address)
}

/// Passes a sealed send to the relay at `address` and returns its status.
fn forward(address: &str, sealed: &[u8]) -> u8 {
    let url = format!("{}{SEALED_PATH}", address.trim_end_matches('/'));
    let mut request = vec![SEALED_SEND];
    request.extend_from_slice(&(sealed.len() as u32).to_be_bytes());
    request.extend_from_slice(sealed);
    match call_relay(&url, request, FORWARD_TIMEOUT) {
        Ok(reply) if reply.len() == 1 && reply[0] <= FAILED => reply[0],
        _ => UNREACHABLE,
    }
}

/// Passes a `FILE_GET` or `FILE_DELETE` to the relay at `address` and returns
/// its reply, if it is one such a request can have.
fn file_via(address: &str, op: u8, id: &ChunkId) -> Vec<u8> {
    let url = format!("{}{FILES_PATH}", address.trim_end_matches('/'));
    let mut request = vec![op];
    request.extend_from_slice(id);
    match call_relay(&url, request, FILE_TIMEOUT) {
        Ok(reply) if reply.len() == 1 && reply[0] != OK && reply[0] <= FAILED => reply,
        Ok(reply) if op == FILE_DELETE && reply == [OK] => reply,
        Ok(reply) if op == FILE_GET && reply.len() >= 5 && reply[0] == OK => {
            let len = u32::from_be_bytes([reply[1], reply[2], reply[3], reply[4]]) as usize;
            if len <= MAX_CHUNK && reply.len() == 5 + len {
                reply
            } else {
                vec![UNREACHABLE]
            }
        }
        _ => vec![UNREACHABLE],
    }
}

/// Sends one request to the relay at `url` and returns its reply.
fn call_relay(url: &str, request: Vec<u8>, timeout: Duration) -> io::Result<Vec<u8>> {
    let uri: tungstenite::http::Uri = url.parse().map_err(to_io)?;
    let host = uri.host().ok_or_else(|| to_io("no host"))?;
    let host = host.trim_start_matches('[').trim_end_matches(']');
    let port = uri
        .port_u16()
        .unwrap_or(if uri.scheme_str() == Some("wss") {
            443
        } else {
            80
        });
    let addr = (host, port)
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| to_io("no address"))?;
    let stream = TcpStream::connect_timeout(&addr, FORWARD_TIMEOUT)?;
    stream.set_read_timeout(Some(timeout))?;
    stream.set_write_timeout(Some(timeout))?;
    let (mut socket, _) = tungstenite::client_tls(url, stream).map_err(to_io)?;
    socket
        .send(Message::Binary(request.into()))
        .map_err(to_io)?;
    loop {
        match socket.read().map_err(to_io)? {
            Message::Binary(bytes) => {
                let _ = socket.close(None);
                return Ok(bytes.to_vec());
            }
            Message::Close(_) => return Err(to_io("closed")),
            _ => {}
        }
    }
}

fn read_bytes(r: &mut impl Read, max: usize) -> io::Result<Vec<u8>> {
    let mut len = [0u8; 4];
    r.read_exact(&mut len)?;
    let len = u32::from_be_bytes(len) as usize;
    if len > max {
        return Err(io::Error::new(ErrorKind::InvalidData, "message too large"));
    }
    let mut msg = vec![0u8; len];
    r.read_exact(&mut msg)?;
    Ok(msg)
}

fn to_io(e: impl std::fmt::Display) -> io::Error {
    io::Error::other(e.to_string())
}

/// The subprotocol the relay answers with, and the prefix of the one carrying
/// the token in hex.
const PROTOCOL: &str = "erevos";
const TOKEN_PROTOCOL: &str = "erevos-token.";

fn offered_protocols(request: &Request) -> impl Iterator<Item = &str> {
    request
        .headers()
        .get_all("sec-websocket-protocol")
        .into_iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .map(str::trim)
}

fn is_authorized(request: &Request, expected: &str) -> bool {
    let presented = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok());
    let bearer = format!("Bearer {expected}");
    if presented.is_some_and(|presented| constant_time_eq(presented.as_bytes(), bearer.as_bytes()))
    {
        return true;
    }
    let hex: String = expected.bytes().map(|b| format!("{b:02x}")).collect();
    offered_protocols(request)
        .filter_map(|p| p.strip_prefix(TOKEN_PROTOCOL))
        .any(|presented| {
            constant_time_eq(presented.to_ascii_lowercase().as_bytes(), hex.as_bytes())
        })
}

/// Compares without stopping at the first difference, so timing does not show
/// how much of the token matched.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

fn unauthorized() -> ErrorResponse {
    let mut response = ErrorResponse::new(None);
    *response.status_mut() = StatusCode::UNAUTHORIZED;
    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use erevos_core::relay_seal::seal;
    use std::net::SocketAddr;
    use tungstenite::client::IntoClientRequest;
    use tungstenite::stream::MaybeTlsStream;
    use tungstenite::WebSocket;

    fn start() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Shared::new(Store::default(), FileStore::default(), None, None);
        let held = Arc::clone(&store);
        thread::spawn(move || run_held(held));
        thread::spawn(move || serve(listener, store));
        addr
    }

    fn start_ws(token: Option<&str>) -> SocketAddr {
        start_ws_with(token, None)
    }

    fn start_ws_with(token: Option<&str>, key: Option<RelayKey>) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Shared::new(Store::default(), FileStore::default(), key, None);
        let held = Arc::clone(&store);
        thread::spawn(move || run_held(held));
        let token: Option<Arc<str>> = token.map(Arc::from);
        thread::spawn(move || serve_ws(listener, store, token));
        addr
    }

    fn create(s: &mut TcpStream) -> (QueueId, QueueId) {
        s.write_all(&[CREATE]).unwrap();
        let mut r = [0u8; 1 + 24 + 24];
        s.read_exact(&mut r).unwrap();
        assert_eq!(r[0], OK);
        let mut recipient = [0u8; 24];
        let mut sender = [0u8; 24];
        recipient.copy_from_slice(&r[1..25]);
        sender.copy_from_slice(&r[25..]);
        (recipient, sender)
    }

    fn send(s: &mut TcpStream, sender: &QueueId, msg: &[u8]) -> u8 {
        let mut req = vec![SEND];
        req.extend_from_slice(sender);
        req.extend_from_slice(&(msg.len() as u32).to_be_bytes());
        req.extend_from_slice(msg);
        s.write_all(&req).unwrap();
        let mut r = [0u8; 1];
        s.read_exact(&mut r).unwrap();
        r[0]
    }

    fn receive(s: &mut TcpStream, recipient: &QueueId) -> Option<Vec<u8>> {
        let mut req = vec![RECEIVE];
        req.extend_from_slice(recipient);
        s.write_all(&req).unwrap();
        let mut head = [0u8; 2];
        s.read_exact(&mut head).unwrap();
        assert_eq!(head[0], OK);
        if head[1] == 0 {
            return None;
        }
        let mut len = [0u8; 4];
        s.read_exact(&mut len).unwrap();
        let mut msg = vec![0u8; u32::from_be_bytes(len) as usize];
        s.read_exact(&mut msg).unwrap();
        Some(msg)
    }

    type Ws = WebSocket<MaybeTlsStream<TcpStream>>;

    /// One WebSocket request and its binary reply.
    fn ws_call(ws: &mut Ws, request: Vec<u8>) -> Vec<u8> {
        ws.send(Message::Binary(request.into())).unwrap();
        match ws.read().unwrap() {
            Message::Binary(bytes) => bytes.to_vec(),
            other => panic!("expected a binary reply, got {other:?}"),
        }
    }

    fn ws_create(ws: &mut Ws) -> (QueueId, QueueId) {
        let r = ws_call(ws, vec![CREATE]);
        assert_eq!(r[0], OK);
        let mut recipient = [0u8; 24];
        let mut sender = [0u8; 24];
        recipient.copy_from_slice(&r[1..25]);
        sender.copy_from_slice(&r[25..49]);
        (recipient, sender)
    }

    fn ws_send(ws: &mut Ws, sender: &QueueId, msg: &[u8]) -> u8 {
        let mut req = vec![SEND];
        req.extend_from_slice(sender);
        req.extend_from_slice(&(msg.len() as u32).to_be_bytes());
        req.extend_from_slice(msg);
        ws_call(ws, req)[0]
    }

    fn ws_receive(ws: &mut Ws, recipient: &QueueId) -> Option<Vec<u8>> {
        let mut req = vec![RECEIVE];
        req.extend_from_slice(recipient);
        let r = ws_call(ws, req);
        assert_eq!(r[0], OK);
        if r[1] == 0 {
            return None;
        }
        Some(r[6..].to_vec())
    }

    fn wait(s: &mut TcpStream, recipient: &QueueId, seconds: u8) -> Vec<u8> {
        let mut req = vec![WAIT];
        req.extend_from_slice(recipient);
        req.push(seconds);
        s.write_all(&req).unwrap();
        let mut status = [0u8; 1];
        s.read_exact(&mut status).unwrap();
        if status[0] != OK {
            return status.to_vec();
        }
        let mut flag = [0u8; 1];
        s.read_exact(&mut flag).unwrap();
        vec![OK, flag[0]]
    }

    #[test]
    fn a_wait_ends_once_a_message_comes_and_leaves_it_to_be_taken() {
        let addr = start();
        let mut s = TcpStream::connect(addr).unwrap();
        let (recipient, sender) = create(&mut s);
        // None comes: the wait ends after its time, with nothing.
        let started = Instant::now();
        assert_eq!(wait(&mut s, &recipient, 1), vec![OK, 0]);
        assert!(started.elapsed() >= Duration::from_millis(900));
        // One comes meanwhile: the wait ends at once.
        let waiter = thread::spawn(move || {
            let mut w = TcpStream::connect(addr).unwrap();
            let started = Instant::now();
            (wait(&mut w, &recipient, 30), started.elapsed())
        });
        thread::sleep(Duration::from_millis(300));
        assert_eq!(send(&mut s, &sender, b"hello"), OK);
        let (reply, took) = waiter.join().unwrap();
        assert_eq!(reply, vec![OK, 1]);
        assert!(took < Duration::from_secs(10));
        // It is still there, so one waiting already ends at once, and it is taken once.
        assert_eq!(wait(&mut s, &recipient, 30), vec![OK, 1]);
        assert_eq!(receive(&mut s, &recipient), Some(b"hello".to_vec()));
        assert_eq!(receive(&mut s, &recipient), None);
        // A queue that is not here.
        assert_eq!(wait(&mut s, &[9u8; 24], 30), vec![NOT_FOUND]);
    }

    #[test]
    fn message_goes_from_sender_to_recipient_once() {
        let mut s = TcpStream::connect(start()).unwrap();
        let (recipient, sender) = create(&mut s);
        assert_eq!(send(&mut s, &sender, b"hello"), OK);
        assert_eq!(receive(&mut s, &recipient).as_deref(), Some(&b"hello"[..]));
        assert_eq!(receive(&mut s, &recipient), None);
    }

    #[test]
    fn websocket_with_token_needs_the_bearer_header() {
        let addr = start_ws(Some("s3cret"));
        assert!(tungstenite::connect(format!("ws://{addr}")).is_err());

        let mut wrong = format!("ws://{addr}").into_client_request().unwrap();
        wrong
            .headers_mut()
            .insert("authorization", "Bearer nope".parse().unwrap());
        assert!(tungstenite::connect(wrong).is_err());

        let mut right = format!("ws://{addr}").into_client_request().unwrap();
        right
            .headers_mut()
            .insert("authorization", "Bearer s3cret".parse().unwrap());
        let (mut ws, _) = tungstenite::connect(right).unwrap();
        let (recipient, sender) = ws_create(&mut ws);
        assert_eq!(ws_send(&mut ws, &sender, b"hi"), OK);
        assert_eq!(ws_receive(&mut ws, &recipient).as_deref(), Some(&b"hi"[..]));
    }

    #[test]
    fn a_web_app_asks_for_a_push_and_a_message_sends_it() {
        // A push service on this machine, which hands back each request line.
        let service = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = format!("http://{}/", service.local_addr().unwrap());
        let (tx, pushes) = std::sync::mpsc::channel();
        thread::spawn(move || {
            for stream in service.incoming() {
                let mut stream = stream.unwrap();
                let mut request = Vec::new();
                let mut byte = [0u8; 1];
                while !request.ends_with(b"\r\n\r\n") && stream.read(&mut byte).unwrap() == 1 {
                    request.push(byte[0]);
                }
                stream.write_all(b"HTTP/1.1 201 Created\r\n\r\n").unwrap();
                let request = String::from_utf8(request).unwrap();
                tx.send(request.lines().next().unwrap().to_string())
                    .unwrap();
            }
        });

        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let shared = Shared::new(Store::default(), FileStore::default(), None, None);
        let key = p256::ecdsa::SigningKey::random(&mut rand::rngs::OsRng);
        let push = Push::new(
            key,
            "mailto:a@example.org".into(),
            vec![address.clone()],
            None,
        )
        .unwrap();
        let public = push.public_key();
        shared.push.set(push).ok().unwrap();
        thread::spawn(move || serve(listener, shared));

        let mut s = TcpStream::connect(addr).unwrap();
        s.write_all(&[PUSH_KEY]).unwrap();
        let mut r = [0u8; 66];
        s.read_exact(&mut r).unwrap();
        assert_eq!((r[0], &r[1..]), (OK, &public[..]));

        let set = |s: &mut TcpStream, queue: &QueueId, endpoint: &str| {
            let mut req = vec![PUSH_SET];
            req.extend_from_slice(queue);
            req.extend_from_slice(&(endpoint.len() as u16).to_be_bytes());
            req.extend_from_slice(endpoint.as_bytes());
            s.write_all(&req).unwrap();
            let mut r = [0u8; 1];
            s.read_exact(&mut r).unwrap();
            r[0]
        };
        let (recipient, sender) = create(&mut s);
        assert_eq!(set(&mut s, &[7u8; 24], &format!("{address}x")), NOT_FOUND);
        assert_eq!(set(&mut s, &recipient, "https://evil.org/x"), FAILED);
        assert_eq!(set(&mut s, &recipient, &format!("{address}sub/1")), OK);

        assert_eq!(send(&mut s, &sender, b"hi"), OK);
        let line = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        assert_eq!(line, "POST /sub/1 HTTP/1.1");
        // The message itself waits as before.
        assert_eq!(receive(&mut s, &recipient).as_deref(), Some(&b"hi"[..]));

        // Removed: no more pushes.
        assert_eq!(set(&mut s, &recipient, ""), OK);
        thread::sleep(crate::push::PUSH_GAP.min(Duration::from_millis(10)));
        assert_eq!(send(&mut s, &sender, b"again"), OK);
        assert!(pushes.recv_timeout(Duration::from_millis(500)).is_err());
    }

    #[test]
    fn a_relay_that_does_not_push_says_so() {
        let mut s = TcpStream::connect(start()).unwrap();
        s.write_all(&[PUSH_KEY]).unwrap();
        let mut r = [0u8; 1];
        s.read_exact(&mut r).unwrap();
        assert_eq!(r[0], NOT_FOUND);
    }

    #[test]
    fn a_browser_gives_the_token_as_a_subprotocol() {
        let addr = start_ws(Some("s3cret"));
        let offer = |protocols: &str| {
            let mut request = format!("ws://{addr}").into_client_request().unwrap();
            request
                .headers_mut()
                .insert("sec-websocket-protocol", protocols.parse().unwrap());
            tungstenite::connect(request)
        };
        // "s3cret" in hex is 733363726574.
        assert!(offer("erevos, erevos-token.6e6f7065").is_err());
        assert!(offer("erevos").is_err());
        let (mut ws, response) = offer("erevos, erevos-token.733363726574").unwrap();
        assert_eq!(response.headers()["sec-websocket-protocol"], "erevos");
        let (recipient, sender) = ws_create(&mut ws);
        assert_eq!(ws_send(&mut ws, &sender, b"hi"), OK);
        assert_eq!(ws_receive(&mut ws, &recipient).as_deref(), Some(&b"hi"[..]));
    }

    #[test]
    fn websocket_message_goes_from_sender_to_recipient_once() {
        let (mut ws, _) = tungstenite::connect(format!("ws://{}", start_ws(None))).unwrap();
        let (recipient, sender) = ws_create(&mut ws);
        assert_eq!(ws_send(&mut ws, &sender, b"hello"), OK);
        assert_eq!(
            ws_receive(&mut ws, &recipient).as_deref(),
            Some(&b"hello"[..])
        );
        assert_eq!(ws_receive(&mut ws, &recipient), None);
    }

    #[test]
    fn unknown_ids_are_refused() {
        let mut s = TcpStream::connect(start()).unwrap();
        let (recipient, sender) = create(&mut s);
        assert_eq!(send(&mut s, &recipient, b"x"), NOT_FOUND);
        assert_eq!(send(&mut s, &[0; 24], b"x"), NOT_FOUND);
        let mut req = vec![DELETE];
        req.extend_from_slice(&sender);
        s.write_all(&req).unwrap();
        let mut r = [0u8; 1];
        s.read_exact(&mut r).unwrap();
        assert_eq!(r[0], NOT_FOUND);
    }

    #[test]
    fn deleted_queue_stops_accepting() {
        let mut s = TcpStream::connect(start()).unwrap();
        let (recipient, sender) = create(&mut s);
        let mut req = vec![DELETE];
        req.extend_from_slice(&recipient);
        s.write_all(&req).unwrap();
        let mut r = [0u8; 1];
        s.read_exact(&mut r).unwrap();
        assert_eq!(r[0], OK);
        assert_eq!(send(&mut s, &sender, b"late"), NOT_FOUND);
    }

    #[test]
    fn oversized_message_closes_the_connection() {
        let mut s = TcpStream::connect(start()).unwrap();
        let (_, sender) = create(&mut s);
        let mut req = vec![SEND];
        req.extend_from_slice(&sender);
        req.extend_from_slice(&((MAX_MESSAGE as u32) + 1).to_be_bytes());
        s.write_all(&req).unwrap();
        let mut r = [0u8; 1];
        assert!(matches!(s.read(&mut r), Ok(0) | Err(_)));
    }

    fn forward_request(address: &str, sealed: &[u8]) -> Vec<u8> {
        let mut req = vec![FORWARD];
        req.extend_from_slice(&(address.len() as u16).to_be_bytes());
        req.extend_from_slice(address.as_bytes());
        req.extend_from_slice(&(sealed.len() as u32).to_be_bytes());
        req.extend_from_slice(sealed);
        req
    }

    fn connect_with_token(addr: SocketAddr, path: &str, token: &str) -> Ws {
        let mut request = format!("ws://{addr}{path}").into_client_request().unwrap();
        request
            .headers_mut()
            .insert("authorization", format!("Bearer {token}").parse().unwrap());
        tungstenite::connect(request).unwrap().0
    }

    #[test]
    fn a_forwarded_message_reaches_the_other_relay() {
        let key = RelayKey::generate();
        let public = key.public();
        let far = start_ws_with(Some("far"), Some(key));
        let near = start_ws_with(Some("near"), None);

        let mut far_ws = connect_with_token(far, "", "far");
        let r = ws_call(&mut far_ws, vec![KEY]);
        assert_eq!((r[0], &r[1..]), (OK, &public[..]));
        let (recipient, sender) = ws_create(&mut far_ws);

        let mut near_ws = connect_with_token(near, "", "near");
        let sealed = seal(&public, &sender, b"via two relays").unwrap();
        let r = ws_call(
            &mut near_ws,
            forward_request(&format!("ws://{far}"), &sealed),
        );
        assert_eq!(r, vec![OK]);
        assert_eq!(
            ws_receive(&mut far_ws, &recipient).as_deref(),
            Some(&b"via two relays"[..])
        );

        // The far relay's answer comes back: a queue that is gone is NOT_FOUND.
        let mut req = vec![DELETE];
        req.extend_from_slice(&recipient);
        assert_eq!(ws_call(&mut far_ws, req), vec![OK]);
        let sealed = seal(&public, &sender, b"late").unwrap();
        let r = ws_call(
            &mut near_ws,
            forward_request(&format!("ws://{far}/"), &sealed),
        );
        assert_eq!(r, vec![NOT_FOUND]);
    }

    #[test]
    fn a_forward_to_nowhere_is_unreachable() {
        let near = start_ws_with(None, None);
        let (mut ws, _) = tungstenite::connect(format!("ws://{near}")).unwrap();
        let closed = TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap();
        let sealed = seal(&RelayKey::generate().public(), &[1; 24], b"x").unwrap();
        let r = ws_call(&mut ws, forward_request(&format!("ws://{closed}"), &sealed));
        assert_eq!(r, vec![UNREACHABLE]);
    }

    #[test]
    fn the_sealed_path_needs_no_token_but_takes_only_sealed_sends() {
        let key = RelayKey::generate();
        let public = key.public();
        let addr = start_ws_with(Some("t"), Some(key));
        let mut owner = connect_with_token(addr, "", "t");
        let (recipient, sender) = ws_create(&mut owner);

        let (mut open, _) = tungstenite::connect(format!("ws://{addr}{SEALED_PATH}")).unwrap();
        let sealed = seal(&public, &sender, b"sealed").unwrap();
        let mut req = vec![SEALED_SEND];
        req.extend_from_slice(&(sealed.len() as u32).to_be_bytes());
        req.extend_from_slice(&sealed);
        assert_eq!(ws_call(&mut open, req), vec![OK]);
        assert_eq!(
            ws_receive(&mut owner, &recipient).as_deref(),
            Some(&b"sealed"[..])
        );

        // Sealed to another key: refused like an unknown queue.
        let wrong = seal(&RelayKey::generate().public(), &sender, b"x").unwrap();
        let mut req = vec![SEALED_SEND];
        req.extend_from_slice(&(wrong.len() as u32).to_be_bytes());
        req.extend_from_slice(&wrong);
        assert_eq!(ws_call(&mut open, req), vec![NOT_FOUND]);

        // Anything else closes the connection.
        open.send(Message::Binary(vec![CREATE].into())).unwrap();
        assert!(!matches!(open.read(), Ok(Message::Binary(_))));
    }

    #[test]
    fn the_call_relay_credentials_go_to_phones_with_the_token_only() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let turn = Turn::new(
            "turn:relay.example.org:3478,turn:relay.example.org:3478?transport=tcp",
            "secret",
        );
        let store = Shared::new(Store::default(), FileStore::default(), None, turn);
        thread::spawn(move || serve_ws(listener, store, Some(Arc::from("t"))));

        let mut ws = connect_with_token(addr, "", "t");
        let r = ws_call(&mut ws, vec![CALL_RELAY]);
        assert_eq!(r[0], OK);
        fn short(r: &[u8], at: &mut usize) -> String {
            let len = u16::from_be_bytes([r[*at], r[*at + 1]]) as usize;
            let text = String::from_utf8(r[*at + 2..*at + 2 + len].to_vec()).unwrap();
            *at += 2 + len;
            text
        }
        let mut at = 1;
        let username = short(&r, &mut at);
        let password = short(&r, &mut at);
        assert!(username.parse::<u64>().is_ok());
        assert_eq!(password.len(), 28);
        assert_eq!(r[at], 2);
        at += 1;
        assert_eq!(short(&r, &mut at), "turn:relay.example.org:3478");
        assert_eq!(
            short(&r, &mut at),
            "turn:relay.example.org:3478?transport=tcp"
        );
        assert_eq!(at, r.len());

        // Not on the sealed path, which needs no token.
        let (mut open, _) = tungstenite::connect(format!("ws://{addr}{SEALED_PATH}")).unwrap();
        open.send(Message::Binary(vec![CALL_RELAY].into())).unwrap();
        assert!(!matches!(open.read(), Ok(Message::Binary(_))));
    }

    #[test]
    fn a_relay_without_a_call_relay_says_so() {
        let mut s = TcpStream::connect(start()).unwrap();
        s.write_all(&[CALL_RELAY]).unwrap();
        let mut r = [0u8; 1];
        s.read_exact(&mut r).unwrap();
        assert_eq!(r[0], NOT_FOUND);
    }

    #[test]
    fn a_relay_without_a_key_says_so() {
        let mut s = TcpStream::connect(start()).unwrap();
        s.write_all(&[KEY]).unwrap();
        let mut r = [0u8; 1];
        s.read_exact(&mut r).unwrap();
        assert_eq!(r[0], NOT_FOUND);
    }

    #[test]
    fn a_forward_to_something_else_closes_the_connection() {
        let mut s = TcpStream::connect(start()).unwrap();
        s.write_all(&forward_request("http://example.org", b"x"))
            .unwrap();
        let mut r = [0u8; 1];
        assert!(matches!(s.read(&mut r), Ok(0) | Err(_)));
    }

    fn put_request(chunk: &[u8]) -> Vec<u8> {
        let mut req = vec![FILE_PUT];
        req.extend_from_slice(&(chunk.len() as u32).to_be_bytes());
        req.extend_from_slice(chunk);
        req
    }

    fn id_request(op: u8, id: &[u8]) -> Vec<u8> {
        let mut req = vec![op];
        req.extend_from_slice(id);
        req
    }

    fn via_request(address: &str, inner: &[u8]) -> Vec<u8> {
        let mut req = vec![FILE_VIA];
        req.extend_from_slice(&(address.len() as u16).to_be_bytes());
        req.extend_from_slice(address.as_bytes());
        req.extend_from_slice(inner);
        req
    }

    /// The chunk in a `FILE_GET` reply.
    fn chunk_of(reply: &[u8]) -> &[u8] {
        assert_eq!(reply[0], OK);
        let len = u32::from_be_bytes(reply[1..5].try_into().unwrap()) as usize;
        assert_eq!(reply.len(), 5 + len);
        &reply[5..]
    }

    #[test]
    fn a_chunk_is_put_taken_and_deleted() {
        let (mut ws, _) = tungstenite::connect(format!("ws://{}", start_ws(None))).unwrap();
        let chunk = vec![5u8; MAX_CHUNK];
        let r = ws_call(&mut ws, put_request(&chunk));
        assert_eq!((r[0], r.len()), (OK, 25));
        let id = r[1..].to_vec();
        assert_eq!(
            chunk_of(&ws_call(&mut ws, id_request(FILE_GET, &id))),
            &chunk[..]
        );
        assert_eq!(ws_call(&mut ws, id_request(FILE_DELETE, &id)), vec![OK]);
        assert_eq!(ws_call(&mut ws, id_request(FILE_GET, &id)), vec![NOT_FOUND]);
        assert_eq!(
            ws_call(&mut ws, id_request(FILE_DELETE, &id)),
            vec![NOT_FOUND]
        );
    }

    #[test]
    fn an_oversized_chunk_closes_the_connection() {
        let mut s = TcpStream::connect(start()).unwrap();
        let mut req = vec![FILE_PUT];
        req.extend_from_slice(&((MAX_CHUNK as u32) + 1).to_be_bytes());
        s.write_all(&req).unwrap();
        let mut r = [0u8; 1];
        assert!(matches!(s.read(&mut r), Ok(0) | Err(_)));
    }

    #[test]
    fn the_files_path_needs_no_token_but_only_takes_and_deletes() {
        let addr = start_ws(Some("t"));
        let mut owner = connect_with_token(addr, "", "t");
        let id = ws_call(&mut owner, put_request(b"chunk"))[1..].to_vec();

        let (mut open, _) = tungstenite::connect(format!("ws://{addr}{FILES_PATH}")).unwrap();
        assert_eq!(
            chunk_of(&ws_call(&mut open, id_request(FILE_GET, &id))),
            b"chunk"
        );
        assert_eq!(ws_call(&mut open, id_request(FILE_DELETE, &id)), vec![OK]);

        // Putting needs the token.
        open.send(Message::Binary(put_request(b"x").into()))
            .unwrap();
        assert!(!matches!(open.read(), Ok(Message::Binary(_))));
        let (mut open, _) = tungstenite::connect(format!("ws://{addr}{FILES_PATH}")).unwrap();
        open.send(Message::Binary(vec![CREATE].into())).unwrap();
        assert!(!matches!(open.read(), Ok(Message::Binary(_))));
    }

    #[test]
    fn a_chunk_on_another_relay_is_taken_through_ones_own() {
        let far = start_ws(Some("far"));
        let near = start_ws(Some("near"));
        let mut sender = connect_with_token(far, "", "far");
        let chunk = vec![7u8; 300_000];
        let id = ws_call(&mut sender, put_request(&chunk))[1..].to_vec();

        let mut recipient = connect_with_token(near, "", "near");
        let far_address = format!("ws://{far}");
        let r = ws_call(
            &mut recipient,
            via_request(&far_address, &id_request(FILE_GET, &id)),
        );
        assert_eq!(chunk_of(&r), &chunk[..]);
        let r = ws_call(
            &mut recipient,
            via_request(&far_address, &id_request(FILE_DELETE, &id)),
        );
        assert_eq!(r, vec![OK]);
        let r = ws_call(
            &mut recipient,
            via_request(&far_address, &id_request(FILE_GET, &id)),
        );
        assert_eq!(r, vec![NOT_FOUND]);

        let closed = TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap();
        let r = ws_call(
            &mut recipient,
            via_request(&format!("ws://{closed}"), &id_request(FILE_GET, &id)),
        );
        assert_eq!(r, vec![UNREACHABLE]);

        // Only taking and deleting go through.
        recipient
            .send(Message::Binary(
                via_request(&far_address, &put_request(b"x")).into(),
            ))
            .unwrap();
        assert!(!matches!(recipient.read(), Ok(Message::Binary(_))));
    }

    fn later_request(at: u64, id: &HeldId, request: &[u8]) -> Vec<u8> {
        let mut req = vec![LATER];
        req.extend_from_slice(&at.to_be_bytes());
        req.extend_from_slice(id);
        req.extend_from_slice(&(request.len() as u32).to_be_bytes());
        req.extend_from_slice(request);
        req
    }

    fn send_request(sender: &QueueId, msg: &[u8]) -> Vec<u8> {
        let mut req = vec![SEND];
        req.extend_from_slice(sender);
        req.extend_from_slice(&(msg.len() as u32).to_be_bytes());
        req.extend_from_slice(msg);
        req
    }

    fn unlater_request(id: &HeldId) -> Vec<u8> {
        let mut req = vec![UNLATER];
        req.extend_from_slice(id);
        req
    }

    #[test]
    fn a_message_sent_for_later_goes_at_its_time_in_order() {
        let mut ws = connect_with_token(start_ws(None), "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let at = system_now() + 1;
        let first = later_request(at, &[1; 16], &send_request(&sender, b"one"));
        assert_eq!(ws_call(&mut ws, first.clone()), vec![OK]);
        // Asked again, as a phone may when the reply was lost: still once.
        assert_eq!(ws_call(&mut ws, first), vec![OK]);
        let second = later_request(at, &[2; 16], &send_request(&sender, b"two"));
        assert_eq!(ws_call(&mut ws, second), vec![OK]);
        assert_eq!(ws_receive(&mut ws, &recipient), None);
        thread::sleep(Duration::from_millis(2500));
        assert_eq!(
            ws_receive(&mut ws, &recipient).as_deref(),
            Some(&b"one"[..])
        );
        assert_eq!(
            ws_receive(&mut ws, &recipient).as_deref(),
            Some(&b"two"[..])
        );
        assert_eq!(ws_receive(&mut ws, &recipient), None);
        // Gone, so there is nothing to drop.
        assert_eq!(ws_call(&mut ws, unlater_request(&[1; 16])), vec![NOT_FOUND]);
    }

    #[test]
    fn a_message_sent_for_later_is_dropped_before_its_time() {
        let mut ws = connect_with_token(start_ws(None), "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let request = later_request(system_now() + 1, &[3; 16], &send_request(&sender, b"never"));
        assert_eq!(ws_call(&mut ws, request), vec![OK]);
        assert_eq!(ws_call(&mut ws, unlater_request(&[3; 16])), vec![OK]);
        assert_eq!(ws_call(&mut ws, unlater_request(&[3; 16])), vec![NOT_FOUND]);
        thread::sleep(Duration::from_millis(2500));
        assert_eq!(ws_receive(&mut ws, &recipient), None);
    }

    #[test]
    fn a_forward_sent_for_later_reaches_the_other_relay_then() {
        let key = RelayKey::generate();
        let public = key.public();
        let far = start_ws_with(Some("far"), Some(key));
        let near = start_ws_with(Some("near"), None);
        let mut far_ws = connect_with_token(far, "", "far");
        let (recipient, sender) = ws_create(&mut far_ws);
        let mut near_ws = connect_with_token(near, "", "near");
        let sealed = seal(&public, &sender, b"later, via two relays").unwrap();
        let forward = forward_request(&format!("ws://{far}"), &sealed);
        let r = ws_call(
            &mut near_ws,
            later_request(system_now() + 1, &[4; 16], &forward),
        );
        assert_eq!(r, vec![OK]);
        assert_eq!(ws_receive(&mut far_ws, &recipient), None);
        thread::sleep(Duration::from_millis(2500));
        assert_eq!(
            ws_receive(&mut far_ws, &recipient).as_deref(),
            Some(&b"later, via two relays"[..])
        );
    }

    #[test]
    fn only_a_send_is_held_and_not_too_far_ahead() {
        let mut ws = connect_with_token(start_ws(None), "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let mut receive = vec![RECEIVE];
        receive.extend_from_slice(&recipient);
        ws.send(Message::Binary(
            later_request(system_now(), &[5; 16], &receive).into(),
        ))
        .unwrap();
        assert!(!matches!(ws.read(), Ok(Message::Binary(_))));

        let mut ws = connect_with_token(start_ws(None), "", "");
        let mut extra = send_request(&sender, b"x");
        extra.push(0);
        ws.send(Message::Binary(
            later_request(system_now(), &[6; 16], &extra).into(),
        ))
        .unwrap();
        assert!(!matches!(ws.read(), Ok(Message::Binary(_))));

        let mut ws = connect_with_token(start_ws(None), "", "");
        let far = system_now() + MAX_AHEAD + 60;
        ws.send(Message::Binary(
            later_request(far, &[7; 16], &send_request(&sender, b"x")).into(),
        ))
        .unwrap();
        assert!(!matches!(ws.read(), Ok(Message::Binary(_))));
    }

    #[test]
    fn a_chunk_kept_for_later_is_taken_like_any() {
        let mut ws = connect_with_token(start_ws(None), "", "");
        let mut req = vec![FILE_KEEP];
        req.extend_from_slice(&(system_now() + 30 * 24 * 60 * 60).to_be_bytes());
        req.extend_from_slice(&3u32.to_be_bytes());
        req.extend_from_slice(b"abc");
        let r = ws_call(&mut ws, req);
        assert_eq!((r[0], r.len()), (OK, 25));
        assert_eq!(
            chunk_of(&ws_call(&mut ws, id_request(FILE_GET, &r[1..]))),
            b"abc"
        );
    }
}
