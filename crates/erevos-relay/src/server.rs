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
//! - `CREATE`: no fields. Reply: recipient id, sender id (24 bytes each), or
//!   `FULL` when the relay holds all the queues it may (see `queue.rs`).
//! - `SEND`: sender id, then a 4-byte length and the message.
//! - `RECEIVE`: recipient id. Reply: a 1-byte flag, then a length and the
//!   message if one was waiting. The message is deleted from the relay.
//! - `WAIT`: recipient id, then 1 byte: seconds to wait, at most `MAX_WAIT`.
//!   Reply: `OK` and 1 as soon as a message waits in the queue, or `OK` and 0
//!   when none came in that time. Nothing is taken: a `RECEIVE` takes it. A
//!   phone in the background waits so instead of asking every few seconds,
//!   and nothing is lost if its connection drops while it waits.
//! - `NEWS`: recipient id, 1 byte: seconds to wait, at most `MAX_WAIT`, then
//!   what the phone last heard of the queue: a 4-byte round, then 4-byte
//!   counts of messages, sends that did not say, and rings (see the marks
//!   below, and `queue::News`). Reply: `OK` and the same 16 bytes as they are
//!   now, as soon as they differ from what the phone heard, or when the time
//!   is up. Nothing is taken. A round starts, at random, when something comes
//!   into a queue its recipient found empty, and ends when it finds it empty
//!   again (round 0: nothing came since); a `QUIET` send counts nothing. So a
//!   phone in the background can say how many messages came to a queue it
//!   cannot read then, as hidden chats' while they are closed, and nothing of
//!   word between phones. Kept in memory only: after a restart what waits
//!   counts as one send that did not say. Older relays close the connection.
//! - `DELETE`: recipient id.
//! - `KEY`: no fields. Reply: the relay's public key (32 bytes) for sealed
//!   sends, or `NOT_FOUND` if it has none.
//! - `FORWARD`: a 2-byte length and a relay address (`ws://` or `wss://`),
//!   then a 4-byte length and a sealed send for that relay (see
//!   `erevos_core::relay_seal`). This relay passes the sealed send on and
//!   replies with that relay's status, or `UNREACHABLE`, also when the
//!   address is not on the internet and the operator did not allow private
//!   peers (see `peers.rs`).
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
//!   `UNREACHABLE`, as for `FORWARD`.
//! - `PUSH_KEY`: no fields. Reply: the relay's key for Web Push (65 bytes,
//!   an uncompressed P-256 point), or `NOT_FOUND` if the relay does not push.
//! - `PUSH_SET`: recipient id, then a 2-byte length and a push address made
//!   by a browser for that key; empty removes it. Over WebSocket the
//!   browser's keys for the address may follow: its P-256 key (65 bytes) and
//!   authentication secret (16 bytes). From then on each message that comes
//!   into the queue pushes there (see `push.rs`): with the keys, a count
//!   encrypted for the browser, else an empty push. Reply: `OK`, and 1 after
//!   it when the keys were taken; `NOT_FOUND` (no such queue, or the relay
//!   does not push), or `FAILED` (not a known push service's address, or not
//!   written).
//! - `LATER`: 8-byte Unix seconds, a 16-byte id, then a 4-byte length and a
//!   whole `SEND`, `FORWARD` or `SEALED_SEND` request. The relay holds the
//!   request and runs it at that time, as if it came then (see `later.rs`),
//!   so a message sent for later goes then though the phone is off by then.
//!   Held on a phone's own token, it goes only while that phone has its line
//!   in force: it waits while the line is refused, and is dropped once the
//!   line is gone from the file. Which phone held it is kept in memory only,
//!   so a request held before a restart goes as one on the relay's token.
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
//! - `LEND`: no fields. Reply: a ticket (see `lend.rs`), its text to the end,
//!   for a place on this relay that a phone with no relay of its own may
//!   take, or `NOT_FOUND` if the relay does not lend.
//! - `BORROW`: no fields, on a connection that gave a ticket as its token.
//!   Reply: recipient id, sender id (24 bytes each) of a new queue, then the
//!   text of the lent token for it to the end, or `FULL` when the ticket gave
//!   all its places, or the relay holds all the queues it may (which uses
//!   none of the ticket's places).
//! - `INVITE`: a 1-byte length and a name, as typed (at most `MAX_TYPED`
//!   bytes of UTF-8), on a connection whose token is a phone's own (see
//!   `invites.rs`). Reply: when the invite expires (8-byte Unix seconds),
//!   then its secret in hex to the end; `FULL` when the phone has all the
//!   invites open, or made all, that it may, or the relay let in all the
//!   phones by invite it may; `FAILED` when it could not be written;
//!   `NOT_FOUND` when the relay does not invite, or the token is not a
//!   phone's own (the relay's one token, say), as for the two below.
//! - `INVITES`: no fields. Reply: a 2-byte count, then for each of this
//!   phone's invites its id (16 bytes), when it expires and when it was used
//!   (8-byte Unix seconds each, 0 while it was not), and the name on its line
//!   after a 1-byte length.
//! - `UNINVITE`: an invite's id. One not used yet goes; one used takes the
//!   line of the phone it let in out of the file of tokens, with the lines
//!   that phone invited, so they are refused from then on. Reply: `OK`,
//!   `NOT_FOUND` if this phone made no such invite, or `FAILED`.
//! - `REDEEM`: on the `/join` path, an invite's secret (32 bytes) and the
//!   SHA-256 of the token the phone made for itself (32 bytes). The relay adds
//!   a line for that token to the file of tokens, which lasts as long as the
//!   inviter's. Reply: the name on the line, to the end; the same again for
//!   the same token; `FULL` when another phone took the invite; `NOT_FOUND`
//!   when there is no such invite now (expired, taken back, its inviter's line
//!   gone, past what the relay lets in by invite, or the relay does not
//!   invite); `FAILED` when the line could not be written, or the file has a
//!   line for that token already.
//! - `SIGN_IN`: on the `/join` path, no fields. Reply: the provider's name
//!   after a 1-byte length, then after a 2-byte length the address the app
//!   opens the browser at to sign in (see `signin.rs`); `NOT_FOUND` when the
//!   relay has no sign-in.
//! - `CLAIM`: on the `/join` path, the claim secret the app made before it
//!   opened the browser (32 bytes), the SHA-256 of the token the phone made
//!   for itself (32 bytes), the SHA-256 of its token before on this relay, or
//!   32 zeros (32 bytes), and the six digits the relay's page showed, as
//!   typed (6 bytes of ASCII). The relay adds a line for the new token to the
//!   file of tokens, in place of the old one when that is a line of the same
//!   account. Reply: the name on the line, to the end; the same again for the
//!   same token; `WRONG` and how many tries are left (1 byte) when the digits
//!   are not the page's, the sign-in ending at none; `NOT_FOUND` when nothing
//!   was signed in with that secret, yet or any more; `FULL` when the account
//!   has all the phones it may; `FAILED` when the line could not be written,
//!   or the file has a line for that token already.
//! - `OWN`: on a connection with the relay's own token, a name (1-byte
//!   length, then at most `invites::MAX_TYPED` bytes of UTF-8) and the
//!   SHA-256 of the token the phone made for itself (32 bytes). The relay adds
//!   a line for that token to the file of tokens, of the operator's own as a
//!   line typed in is, so the phone goes on with a token of its own (see
//!   `invites.rs`). Reply: the name on the line, to the end; the same again
//!   for the same token; `FULL` when the relay added all the lines it adds so
//!   a day; `FAILED` when the line could not be written; `NOT_FOUND` when the
//!   relay does not invite.
//!
//! Marks: over WebSocket, and in a request held for later, a `SEND`,
//! `SEALED_SEND`, `FORWARD` or `LATER` request may end with one more byte
//! that says what it carries: `MESSAGE` (something a person reads, counted in
//! the web app's notice), `QUIET` (word between phones, such as that a
//! message came or new keys, which pushes nothing) or `RING` (a call that
//! rings: it pushes, and is counted apart from the messages). Without one,
//! the relay pushes, and counts it apart as a send that did not say. A
//! `FORWARD` passes its mark on to the other relay. Older relays read no
//! further than the request, and push for everything. The TCP front end takes
//! no mark: its requests follow each other with nothing between.
//!
//! In the same way a `RECEIVE` over WebSocket may end with `SHOWN`: the app
//! takes the messages on the screen, so when it finds the queue empty, a push
//! still waiting for its gap does not go (see `Push::drained`).
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
//! Invites (see `invites.rs`): a connection whose token is on a line of the
//! file of tokens may ask for invites; one with the relay's own token may
//! not, but may ask for a line of its own (`OWN`) and then invite with it.
//! The `/join` path needs no token, so a phone with none can take an invite
//! there, and takes only `REDEEM`, `SIGN_IN` and `CLAIM`. A connection
//! whose token is a phone's own is closed at its next request once that line
//! is gone from the file, so taking a line out cuts the phone off at once.
//!
//! Signing in (see `signin.rs`): with a provider set up, the WebSocket port
//! answers a browser's plain requests for `/signin/start`,
//! `/signin/callback` and `/signin/confirm` too, told from WebSocket
//! handshakes by their request line, on the places of the paths that need
//! no token. Without one, every connection is a WebSocket as before.
//!
//! Lent places (see `lend.rs`): a connection whose token is a ticket may only
//! `BORROW` (and ask for the `KEY`); one whose token is a lent token may use
//! its queues and files as a phone with the relay's token does, but not
//! `FORWARD`, `FILE_VIA`, `LATER`, `UNLATER`, `CALL_RELAY` or `LEND`, and may
//! make only so many queues and files a day (`FULL` past that). Only a relay
//! whose operator turned lending on lends. A ticket the operator revoked, and
//! every lent token it gave, is refused at the handshake as a wrong token is.
//!
//! Reply status: `OK`, `NOT_FOUND` (no such queue or chunk), `FULL` (the
//! queue holds `MAX_QUEUED` messages, the relay all the queues it may, or the
//! file store is full), `FAILED`
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
//! Each connection has a thread of its own, so the relay takes only so many
//! at once (`Limits`): past `connections`, both front ends together, a new
//! one is closed as soon as it comes, and past `tokenless` on the paths that
//! need no token, the handshake is refused with 503, so connections from
//! anyone cannot take all the places the relay's own phones need. A
//! connection that sends nothing for `idle` is closed (a WebSocket with a
//! close frame first), one whose WebSocket handshake is not over within
//! `handshake` too, and one that takes no reply for `WRITE_TIMEOUT`.
//!
//! Not audited.

use std::collections::HashMap;
use std::io::{self, Cursor, ErrorKind, Read, Write};
use std::net::{Shutdown, SocketAddr, TcpListener, TcpStream, ToSocketAddrs};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

use erevos_core::relay_seal::{RelayKey, OVERHEAD};

use tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tungstenite::http::StatusCode;
use tungstenite::protocol::frame::coding::CloseCode;
use tungstenite::protocol::CloseFrame;
use tungstenite::Message;

use crate::connect;
use crate::files::{ChunkId, FileError, FileStore, MAX_CHUNK};
use crate::invites::{InviteError, Invites, OwnError, RedeemError, MAX_TYPED};
use crate::later::{Held, HeldError, HeldId, MAX_AHEAD};
use crate::lend::{Lend, Nonce, Pass};
use crate::lock::{lock, wait_timeout};
use crate::peers;
use crate::push::{Came, Keys, Push, SetError, AUTH_LEN, MAX_ENDPOINT, P256DH_LEN};
use crate::queue::{system_now, News, QueueError, QueueId, Said, Store};
use crate::signin::{self, ClaimError, SignIn};
use crate::tokens::{to_hex, Phone, Tokens};
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
    /// Places lent to phones with no relay, if the relay lends (set once,
    /// after start).
    pub lend: std::sync::OnceLock<Lend>,
    /// The phones' tokens of their own, beside the relay's (`tokens.rs`), if
    /// the operator keeps them (set once, after start).
    pub tokens: std::sync::OnceLock<Tokens>,
    /// Invites from the phones with tokens of their own, if the relay invites
    /// (set once, after start).
    pub invites: std::sync::OnceLock<Invites>,
    /// Signing in with a provider for a token of a phone's own, if the
    /// operator set one up (set once, after start).
    pub signin: std::sync::OnceLock<SignIn>,
    /// Requests held for later; `held_changed` wakes `run_held` when one
    /// comes or goes.
    pub held: Mutex<Held>,
    pub held_changed: Condvar,
    /// For each request held for later on a phone's own token, by its id,
    /// that token's SHA-256: in memory only.
    held_by: Mutex<HashMap<HeldId, [u8; 32]>>,
    pub limits: Limits,
    /// Connections open now, and of those, the ones on paths that need no
    /// token.
    connections: Arc<AtomicUsize>,
    tokenless: Arc<AtomicUsize>,
}

pub type SharedStore = Arc<Shared>;

/// Connections the relay takes at once unless set (`EREVOS_RELAY_MAX_CONNECTIONS`).
pub const DEFAULT_MAX_CONNECTIONS: usize = 512;
/// Of those, connections on the paths that need no token unless set
/// (`EREVOS_RELAY_MAX_TOKENLESS_CONNECTIONS`).
pub const DEFAULT_MAX_TOKENLESS: usize = 128;
/// How long a connection may send nothing before it is closed. The app never
/// leaves one quiet for long: most of its connections carry one request and
/// close once it is answered, a `WAIT` too (the relay waits then, not the
/// phone, and the relay is not reading meanwhile), and one that carries a
/// file's chunks sends the next as soon as it has read and sealed it on the
/// phone. Five minutes is far above any of that, even through Tor, so only a
/// connection left open for nothing is cut.
pub const IDLE_TIMEOUT: Duration = Duration::from_secs(5 * 60);
/// How long a WebSocket handshake may take from the moment the connection
/// came. A client sends its whole request at once; one that trickles it in
/// to hold a place is closed.
pub const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(30);
/// How long a reply may wait for the other end to take any of it: one that
/// takes nothing for that long has gone.
const WRITE_TIMEOUT: Duration = Duration::from_secs(60);
/// How long a front end waits before it takes connections again when it
/// could not take one (out of file descriptors, say).
const ACCEPT_PAUSE: Duration = Duration::from_millis(200);

/// How many connections the relay takes, how long they may stay quiet, and
/// where it may connect for them.
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    /// Connections at once, both front ends together.
    pub connections: usize,
    /// Of those, connections at once on the paths that need no token
    /// (`/sealed`, `/files` and `/join`).
    pub tokenless: usize,
    /// See `IDLE_TIMEOUT`.
    pub idle: Duration,
    /// See `HANDSHAKE_TIMEOUT`.
    pub handshake: Duration,
    /// Whether a forward may go to a relay at an address off the internet,
    /// on this machine or its network (`EREVOS_RELAY_PRIVATE_PEERS=allow`,
    /// see `peers.rs`). Off unless set.
    pub private_peers: bool,
}

impl Default for Limits {
    fn default() -> Self {
        Limits {
            connections: DEFAULT_MAX_CONNECTIONS,
            tokenless: DEFAULT_MAX_TOKENLESS,
            idle: IDLE_TIMEOUT,
            handshake: HANDSHAKE_TIMEOUT,
            private_peers: false,
        }
    }
}

/// A place for one connection among those the relay takes at once. Dropping
/// it, when the connection's thread ends however it ends, gives it back.
struct Slot(Arc<AtomicUsize>);

impl Slot {
    /// A place in `count`, if fewer than `max` are taken.
    fn take(count: &Arc<AtomicUsize>, max: usize) -> Option<Slot> {
        // A loop of its own rather than fetch_update, which newer Rust renames:
        // the same code builds with every toolchain.
        let mut n = count.load(Ordering::Acquire);
        while n < max {
            match count.compare_exchange_weak(n, n + 1, Ordering::AcqRel, Ordering::Acquire) {
                Ok(_) => return Some(Slot(Arc::clone(count))),
                Err(now) => n = now,
            }
        }
        None
    }
}

impl Drop for Slot {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::AcqRel);
    }
}

/// What the shared locks are called in the line the relay prints if one is
/// poisoned (see `lock.rs`).
const STORE_LOCK: &str = "queue store lock";
const FILES_LOCK: &str = "file store lock";
const HELD_LOCK: &str = "lock of requests held for later";
const HELD_BY_LOCK: &str = "lock of the phones that held requests for later";

impl Shared {
    pub fn new(
        store: Store,
        files: FileStore,
        key: Option<RelayKey>,
        turn: Option<Turn>,
        limits: Limits,
    ) -> SharedStore {
        Arc::new(Shared {
            store: Mutex::new(store),
            arrived: Condvar::new(),
            files: Mutex::new(files),
            key,
            turn,
            push: std::sync::OnceLock::new(),
            lend: std::sync::OnceLock::new(),
            tokens: std::sync::OnceLock::new(),
            invites: std::sync::OnceLock::new(),
            signin: std::sync::OnceLock::new(),
            held: Mutex::new(Held::default()),
            held_changed: Condvar::new(),
            held_by: Mutex::default(),
            limits,
            connections: Arc::new(AtomicUsize::new(0)),
            tokenless: Arc::new(AtomicUsize::new(0)),
        })
    }

    pub fn store(&self) -> MutexGuard<'_, Store> {
        lock(&self.store, STORE_LOCK)
    }

    pub fn files(&self) -> MutexGuard<'_, FileStore> {
        lock(&self.files, FILES_LOCK)
    }

    pub fn held(&self) -> MutexGuard<'_, Held> {
        lock(&self.held, HELD_LOCK)
    }

    fn held_by(&self) -> MutexGuard<'_, HashMap<HeldId, [u8; 32]>> {
        lock(&self.held_by, HELD_BY_LOCK)
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
pub const LEND: u8 = 19;
pub const BORROW: u8 = 20;
pub const INVITE: u8 = 21;
pub const INVITES: u8 = 22;
pub const UNINVITE: u8 = 23;
pub const REDEEM: u8 = 24;
pub const SIGN_IN: u8 = 25;
pub const CLAIM: u8 = 26;
pub const NEWS: u8 = 27;
pub const OWN: u8 = 28;

/// The marks a send may end with (see the module's doc).
pub const MESSAGE: u8 = 1;
pub const QUIET: u8 = 2;
pub const RING: u8 = 3;
/// The mark a `RECEIVE` may end with (see the module's doc).
pub const SHOWN: u8 = 1;

/// What a send said it carries.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Mark {
    /// Nothing: an older phone, the TCP front end, or a mark this relay does not know.
    Unknown,
    Message,
    Quiet,
    Ring,
}

impl Mark {
    fn byte(self) -> Option<u8> {
        match self {
            Mark::Unknown => None,
            Mark::Message => Some(MESSAGE),
            Mark::Quiet => Some(QUIET),
            Mark::Ring => Some(RING),
        }
    }
}

/// The longest a `WAIT` lasts, seconds.
pub const MAX_WAIT: u8 = 60;

pub const OK: u8 = 0;
pub const NOT_FOUND: u8 = 1;
pub const FULL: u8 = 2;
pub const FAILED: u8 = 3;
pub const UNREACHABLE: u8 = 4;
/// A sign-in's code that is not the one its page showed (`CLAIM` only).
pub const WRONG: u8 = 5;

/// Largest sealed send: a full message and the sealing.
pub const MAX_SEALED: usize = MAX_MESSAGE + OVERHEAD;
/// Longest relay address a forward may name.
const MAX_ADDRESS: usize = 512;
/// The WebSocket path other relays use for sealed sends.
pub const SEALED_PATH: &str = "/sealed";
/// The WebSocket path other relays use to take and delete chunks.
pub const FILES_PATH: &str = "/files";
/// The WebSocket path a phone with no token takes an invite on.
pub const JOIN_PATH: &str = "/join";
/// Invites listed at most in one reply, the latest.
const MAX_LISTED: usize = 500;
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
    /// The relay's own token, or none where none is needed.
    All,
    /// A phone's own token (`tokens.rs`), by its SHA-256: what `All` may, and
    /// invites too.
    Phone([u8; 32]),
    /// The relay's own token, when it has one: what `All` may, and `OWN` too.
    Shared,
    /// The `/sealed` path: `KEY` and `SEALED_SEND` only.
    Sealed,
    /// The `/files` path: `FILE_GET` and `FILE_DELETE` only.
    Files,
    /// The `/join` path: `REDEEM` only.
    Join,
    /// A ticket for a place, which expires then (Unix seconds): `KEY` and
    /// `BORROW` only.
    Ticket(Nonce, u64),
    /// A lent token: what a phone needs of its own queues and files.
    Lent(Nonce),
}

/// Serves raw TCP connections. Each connection gets its own thread; all share
/// one store.
pub fn serve(listener: TcpListener, store: SharedStore) -> ! {
    loop {
        let stream = accept(&listener);
        // Past the cap, closed at once, before it costs a thread.
        let Some(slot) = Slot::take(&store.connections, store.limits.connections) else {
            continue;
        };
        let store = Arc::clone(&store);
        thread::spawn(move || {
            let _slot = slot;
            // A bad client only loses its own connection.
            let _ = handle_tcp(stream, &store);
        });
    }
}

/// Serves WebSocket connections. Each connection gets its own thread; all
/// share the same store as the TCP front end. With a `token`, a connection
/// must send `Authorization: Bearer <token>` during the handshake, or offer
/// the subprotocols `erevos` and `erevos-token.<token in hex>` as a browser
/// does, or it is refused with 401. A connection that offers `erevos` gets it
/// as its subprotocol, which a browser needs to go on.
pub fn serve_ws(listener: TcpListener, store: SharedStore, token: Option<Arc<str>>) -> ! {
    loop {
        let stream = accept(&listener);
        let Some(slot) = Slot::take(&store.connections, store.limits.connections) else {
            continue;
        };
        let store = Arc::clone(&store);
        let token = token.clone();
        thread::spawn(move || {
            let _slot = slot;
            let _ = handle_ws(stream, &store, token.as_deref());
        });
    }
}

/// The next connection. A front end that cannot take one for a moment (out
/// of file descriptors, say) waits a little and goes on, instead of stopping
/// while the rest of the relay runs.
fn accept(listener: &TcpListener) -> TcpStream {
    let mut said = false;
    loop {
        match listener.accept() {
            Ok((stream, _)) => return stream,
            Err(e) => {
                if !said {
                    eprintln!("erevos-relay: cannot take connections for now: {e}");
                    said = true;
                }
                thread::sleep(ACCEPT_PAUSE);
            }
        }
    }
}

/// Whether a read or write ended because the other end was quiet too long.
fn timed_out(error: &io::Error) -> bool {
    matches!(error.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut)
}

fn handle_tcp(mut stream: TcpStream, store: &Shared) -> io::Result<()> {
    stream.set_read_timeout(Some(store.limits.idle))?;
    stream.set_write_timeout(Some(WRITE_TIMEOUT))?;
    loop {
        match respond(&mut stream, store, Access::All, false) {
            Ok(Some(reply)) => stream.write_all(&reply)?,
            Ok(None) => return Ok(()),
            // Quiet too long: closed, as at the end of any connection.
            Err(e) if timed_out(&e) => {
                let _ = stream.shutdown(Shutdown::Both);
                return Ok(());
            }
            Err(e) => return Err(e),
        }
    }
}

/// A connection's stream whose reads also end at `deadline` while one is set:
/// the WebSocket handshake must be over by then, however its bytes trickle in.
struct Timed {
    stream: TcpStream,
    idle: Duration,
    deadline: Option<Instant>,
}

impl Read for Timed {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        if let Some(deadline) = self.deadline {
            let left = deadline.saturating_duration_since(Instant::now());
            if left.is_zero() {
                return Err(ErrorKind::TimedOut.into());
            }
            self.stream.set_read_timeout(Some(left.min(self.idle)))?;
        }
        self.stream.read(buf)
    }
}

impl Write for Timed {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.stream.write(buf)
    }

    fn flush(&mut self) -> io::Result<()> {
        self.stream.flush()
    }
}

// The error type of the handshake callback is fixed by tungstenite, so it cannot be boxed here.
#[allow(clippy::result_large_err)]
fn handle_ws(stream: TcpStream, store: &Shared, token: Option<&str>) -> io::Result<()> {
    let limits = store.limits;
    stream.set_write_timeout(Some(WRITE_TIMEOUT))?;
    let deadline = Instant::now() + limits.handshake;
    if let Some(signin) = store.signin.get() {
        if signin::is_page(&stream, deadline)? {
            // Anyone may come here, as on the paths that need no token.
            let Some(_slot) = Slot::take(&store.tokenless, limits.tokenless) else {
                return Ok(());
            };
            let peer = stream.peer_addr()?.ip();
            let mut stream = Timed {
                stream,
                idle: limits.idle,
                deadline: Some(deadline),
            };
            return signin.serve(&mut stream, peer, system_now());
        }
    }
    let stream = Timed {
        stream,
        idle: limits.idle,
        deadline: Some(deadline),
    };
    let mut access = Access::All;
    // Held until the connection ends, on the paths that need no token.
    let mut tokenless: Option<Slot> = None;
    let check = |request: &Request, mut response: Response| {
        if offered_protocols(request).any(|p| p == PROTOCOL) {
            response.headers_mut().insert(
                "sec-websocket-protocol",
                PROTOCOL.parse().expect("a valid header value"),
            );
        }
        let path = request.uri().path();
        let open = if path.ends_with(SEALED_PATH) {
            Some(Access::Sealed)
        } else if path.ends_with(FILES_PATH) {
            Some(Access::Files)
        } else if path.ends_with(JOIN_PATH) {
            Some(Access::Join)
        } else {
            None
        };
        if let Some(open) = open {
            // Anyone may come here, so only so many at once.
            tokenless = Slot::take(&store.tokenless, limits.tokenless);
            if tokenless.is_none() {
                return Err(busy());
            }
            access = open;
            return Ok(response);
        }
        let lent = store
            .lend
            .get()
            .zip(presented_token(request))
            .and_then(|(lend, presented)| lend.check(&presented, system_now()));
        match lent {
            Some(Pass::Ticket { nonce, expires }) => {
                access = Access::Ticket(nonce, expires);
                return Ok(response);
            }
            Some(Pass::Lent(nonce)) => {
                access = Access::Lent(nonce);
                return Ok(response);
            }
            None => {}
        }
        // A phone's own token, or the relay's; with neither set, anyone.
        let phones = store.tokens.get();
        if let Some(phone) = phones
            .zip(presented_token(request))
            .and_then(|(phones, presented)| phones.find(&presented))
        {
            access = Access::Phone(phone.hash);
            return Ok(response);
        }
        if token.is_some_and(|expected| is_authorized(request, expected)) {
            access = Access::Shared;
            return Ok(response);
        }
        if token.is_none() && phones.is_none() {
            return Ok(response);
        }
        Err(unauthorized())
    };
    let mut socket = tungstenite::accept_hdr(stream, check).map_err(to_io)?;
    let timed = socket.get_mut();
    timed.deadline = None;
    timed.stream.set_read_timeout(Some(limits.idle))?;
    loop {
        let message = match socket.read() {
            Ok(message) => message,
            Err(tungstenite::Error::ConnectionClosed | tungstenite::Error::AlreadyClosed) => {
                return Ok(())
            }
            // Quiet too long: told so, and closed.
            Err(tungstenite::Error::Io(e)) if timed_out(&e) => {
                let _ = socket.close(Some(CloseFrame {
                    code: CloseCode::Away,
                    reason: "idle".into(),
                }));
                let _ = socket.flush();
                return Ok(());
            }
            Err(e) => return Err(to_io(e)),
        };
        match message {
            Message::Binary(bytes) => {
                // A phone whose line went since it connected is cut off now, not at its next connection.
                if let (Access::Phone(hash), Some(phones)) = (access, store.tokens.get()) {
                    if !phones.holds(&hash) {
                        let _ = socket.close(Some(CloseFrame {
                            code: CloseCode::Policy,
                            reason: "token taken back".into(),
                        }));
                        let _ = socket.flush();
                        return Ok(());
                    }
                }
                let request: &[u8] = bytes.as_ref();
                let Some(reply) = respond(&mut Cursor::new(request), store, access, true)? else {
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
/// closed before a new request started. `framed`: `r` holds this request
/// alone, so what follows it, a mark or a browser's keys, is part of it.
fn respond(
    r: &mut impl Read,
    shared: &Shared,
    access: Access,
    framed: bool,
) -> io::Result<Option<Vec<u8>>> {
    let mut op = [0u8; 1];
    match r.read_exact(&mut op) {
        Ok(()) => {}
        Err(e) if e.kind() == ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let allowed = match access {
        Access::All | Access::Phone(_) => !matches!(op[0], BORROW | REDEEM | SIGN_IN | CLAIM | OWN),
        Access::Shared => !matches!(op[0], BORROW | REDEEM | SIGN_IN | CLAIM),
        Access::Sealed => matches!(op[0], KEY | SEALED_SEND),
        Access::Files => matches!(op[0], FILE_GET | FILE_DELETE),
        Access::Join => matches!(op[0], REDEEM | SIGN_IN | CLAIM),
        Access::Ticket(..) => matches!(op[0], KEY | BORROW),
        Access::Lent(_) => matches!(
            op[0],
            CREATE
                | SEND
                | RECEIVE
                | WAIT
                | NEWS
                | DELETE
                | KEY
                | SEALED_SEND
                | FILE_PUT
                | FILE_GET
                | FILE_DELETE
                | FILE_KEEP
                | PUSH_KEY
                | PUSH_SET
        ),
    };
    if !allowed {
        return Err(io::Error::new(
            ErrorKind::PermissionDenied,
            "not on this path",
        ));
    }
    let reply = match op[0] {
        CREATE
            if !lent_may(shared, access, |lend, nonce| {
                lend.may_create(nonce, system_now())
            }) =>
        {
            vec![FULL]
        }
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
            let mark = read_mark(r, framed)?;
            status(queue_message(shared, &sender, msg, mark))
        }
        RECEIVE => {
            let recipient = read_id(r)?;
            let shown = read_byte(r, framed)? == Some(SHOWN);
            let got = {
                let mut store = shared.store();
                let got = store.receive(&recipient);
                // Under the lock that found it empty: what is sent after it
                // counts from nothing.
                if matches!(got, Ok(None)) {
                    if let Some(push) = shared.push.get() {
                        push.drained(&recipient, shown);
                    }
                }
                got
            };
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
                store = wait_timeout(&shared.arrived, store, left, STORE_LOCK);
            }
        }
        NEWS => {
            let recipient = read_id(r)?;
            let mut seconds = [0u8; 1];
            r.read_exact(&mut seconds)?;
            let heard = read_news(r)?;
            let until = Instant::now() + Duration::from_secs(u64::from(seconds[0].min(MAX_WAIT)));
            let mut store = shared.store();
            loop {
                let left = until.saturating_duration_since(Instant::now());
                match store.news(&recipient) {
                    Ok(now) if now != heard || left.is_zero() => break news_reply(now),
                    Ok(_) => {}
                    Err(e) => break vec![code(e)],
                }
                store = wait_timeout(&shared.arrived, store, left, STORE_LOCK);
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
            let mark = read_mark(r, framed)?;
            vec![forward(shared, &address, &sealed, mark)]
        }
        SEALED_SEND => {
            let sealed = read_sealed(r)?;
            let mark = read_mark(r, framed)?;
            match shared.key.as_ref().map(|key| key.open(&sealed)) {
                Some(Ok((sender, msg))) if msg.len() <= MAX_MESSAGE => {
                    status(queue_message(shared, &sender, msg, mark))
                }
                // Sealed for another key, changed on the way, or this relay has no key:
                // to the sender it is the same as a queue that is not here.
                _ => vec![NOT_FOUND],
            }
        }
        FILE_PUT => {
            let chunk = read_bytes(r, MAX_CHUNK)?;
            if !lent_may_put(shared, access, chunk.len()) {
                return Ok(Some(vec![FULL]));
            }
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
            file_via(shared, &address, op[0], &id)
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
            let keys = read_keys(r, framed)?;
            let exists = !matches!(
                shared.store().has_waiting(&recipient),
                Err(QueueError::NotFound)
            );
            match (shared.push.get(), exists) {
                (Some(push), true) => match std::str::from_utf8(&endpoint) {
                    Ok(endpoint) => {
                        // Keys that are no key: the pushes go empty, as without them.
                        let keys = keys
                            .filter(|_| !endpoint.is_empty())
                            .and_then(|(p256dh, auth)| Keys::new(&p256dh, &auth));
                        let counts = keys.is_some();
                        match push.set(&recipient, endpoint, keys) {
                            Ok(()) if counts => vec![OK, 1],
                            Ok(()) => vec![OK],
                            Err(SetError::Refused | SetError::Storage) => vec![FAILED],
                        }
                    }
                    Err(_) => vec![FAILED],
                },
                _ => vec![NOT_FOUND],
            }
        }
        LATER => {
            let at = read_time(r)?;
            let id = read_held_id(r)?;
            let mut request = read_bytes(r, MAX_HELD_REQUEST)?;
            check_held(&request)?;
            // The mark goes after the held request, where it is read when it runs.
            if let Some(mark) = read_mark(r, framed)?.byte() {
                request.push(mark);
            }
            let held = shared.held().hold(id, at, request);
            if let (Ok(()), Access::Phone(phone)) = (&held, access) {
                shared.held_by().insert(id, phone);
            }
            shared.held_changed.notify_all();
            vec![held.map_or_else(held_code, |()| OK)]
        }
        UNLATER => {
            let id = read_held_id(r)?;
            let dropped = shared.held().drop_held(&id);
            if dropped == Ok(true) {
                shared.held_by().remove(&id);
            }
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
            if !lent_may_put(shared, access, chunk.len()) {
                return Ok(Some(vec![FULL]));
            }
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
        LEND => match shared.lend.get() {
            Some(lend) => {
                let mut out = vec![OK];
                out.extend_from_slice(lend.ticket(system_now()).as_bytes());
                out
            }
            None => vec![NOT_FOUND],
        },
        BORROW => {
            let (Access::Ticket(nonce, expires), Some(lend)) = (access, shared.lend.get()) else {
                return Err(io::Error::new(ErrorKind::PermissionDenied, "no ticket"));
            };
            // Held while the place is counted and its queue made, so a relay
            // that holds all the queues it may does not use up a ticket's places.
            let mut store = shared.store();
            if !store.has_room() {
                return Ok(Some(vec![FULL]));
            }
            match lend.borrow(nonce, expires, system_now()) {
                Some(token) => match store.create() {
                    Ok(q) => {
                        let mut out = vec![OK];
                        out.extend_from_slice(&q.recipient_id);
                        out.extend_from_slice(&q.sender_id);
                        out.extend_from_slice(token.as_bytes());
                        out
                    }
                    Err(e) => vec![code(e)],
                },
                None => vec![FULL],
            }
        }
        INVITE => {
            let typed = read_name(r)?;
            match (invites_of(shared, access), shared.tokens.get()) {
                (Some((invites, phone)), Some(tokens)) => {
                    match invites.make(&phone, &typed, tokens, system_now()) {
                        Ok((secret, expires)) => {
                            let mut out = vec![OK];
                            out.extend_from_slice(&expires.to_be_bytes());
                            out.extend_from_slice(to_hex(&secret).as_bytes());
                            out
                        }
                        Err(InviteError::Full) => vec![FULL],
                        Err(InviteError::Storage) => vec![FAILED],
                    }
                }
                _ => vec![NOT_FOUND],
            }
        }
        INVITES => match (invites_of(shared, access), shared.tokens.get()) {
            (Some((invites, phone)), Some(tokens)) => {
                let listed = invites.list(&phone.hash, tokens, system_now());
                let listed = &listed[listed.len().saturating_sub(MAX_LISTED)..];
                let mut out = vec![OK];
                out.extend_from_slice(&(listed.len() as u16).to_be_bytes());
                for invite in listed {
                    out.extend_from_slice(&invite.id);
                    out.extend_from_slice(&invite.expires.to_be_bytes());
                    out.extend_from_slice(&invite.used.to_be_bytes());
                    let name = &invite.name.as_bytes()[..invite.name.len().min(255)];
                    out.push(name.len() as u8);
                    out.extend_from_slice(name);
                }
                out
            }
            _ => vec![NOT_FOUND],
        },
        UNINVITE => {
            let mut id = [0u8; 16];
            r.read_exact(&mut id)?;
            match (invites_of(shared, access), shared.tokens.get()) {
                (Some((invites, phone)), Some(tokens)) => {
                    match invites.take_back(&phone.hash, &id, tokens) {
                        Ok(true) => vec![OK],
                        Ok(false) => vec![NOT_FOUND],
                        Err(_) => vec![FAILED],
                    }
                }
                _ => vec![NOT_FOUND],
            }
        }
        REDEEM => {
            let mut secret = [0u8; 32];
            r.read_exact(&mut secret)?;
            let mut line = [0u8; 32];
            r.read_exact(&mut line)?;
            match (shared.invites.get(), shared.tokens.get()) {
                (Some(invites), Some(tokens)) => {
                    match invites.redeem(&secret, &line, tokens, system_now()) {
                        Ok(name) => {
                            let mut out = vec![OK];
                            out.extend_from_slice(name.as_bytes());
                            out
                        }
                        Err(RedeemError::NotFound) => vec![NOT_FOUND],
                        Err(RedeemError::Used) => vec![FULL],
                        Err(RedeemError::Taken | RedeemError::Storage) => vec![FAILED],
                    }
                }
                _ => vec![NOT_FOUND],
            }
        }
        OWN => {
            let typed = read_name(r)?;
            let mut line = [0u8; 32];
            r.read_exact(&mut line)?;
            match (shared.invites.get(), shared.tokens.get()) {
                (Some(invites), Some(tokens)) => {
                    match invites.own(&typed, &line, tokens, system_now()) {
                        Ok(name) => {
                            let mut out = vec![OK];
                            out.extend_from_slice(name.as_bytes());
                            out
                        }
                        Err(OwnError::Off) => vec![NOT_FOUND],
                        Err(OwnError::Full) => vec![FULL],
                        Err(OwnError::Storage) => vec![FAILED],
                    }
                }
                _ => vec![NOT_FOUND],
            }
        }
        SIGN_IN => match shared.signin.get() {
            Some(signin) => {
                let name = signin.name().as_bytes();
                let url = signin.start_url();
                let mut out = vec![OK, name.len() as u8];
                out.extend_from_slice(name);
                out.extend_from_slice(&(url.len() as u16).to_be_bytes());
                out.extend_from_slice(url.as_bytes());
                out
            }
            None => vec![NOT_FOUND],
        },
        CLAIM => {
            let mut secret = [0u8; 32];
            r.read_exact(&mut secret)?;
            let mut line = [0u8; 32];
            r.read_exact(&mut line)?;
            let mut old = [0u8; 32];
            r.read_exact(&mut old)?;
            let mut code = [0u8; 6];
            r.read_exact(&mut code)?;
            match (shared.signin.get(), shared.tokens.get()) {
                (Some(signin), Some(tokens)) => {
                    let invites = shared.invites.get();
                    let had_old = tokens.holds(&old);
                    match signin.claim(&secret, &line, &old, &code, tokens, invites, system_now()) {
                        Ok(name) => {
                            if had_old && !tokens.in_file(&old) {
                                // The old line went for the new one: what it held for later is the new one's.
                                for phone in shared.held_by().values_mut().filter(|p| **p == old) {
                                    *phone = line;
                                }
                            }
                            let mut out = vec![OK];
                            out.extend_from_slice(name.as_bytes());
                            out
                        }
                        Err(ClaimError::NotFound) => vec![NOT_FOUND],
                        Err(ClaimError::Wrong(left)) => vec![WRONG, left],
                        Err(ClaimError::Full) => vec![FULL],
                        Err(ClaimError::Taken | ClaimError::Storage) => vec![FAILED],
                    }
                }
                _ => vec![NOT_FOUND],
            }
        }
        _ => return Err(io::Error::new(ErrorKind::InvalidData, "unknown opcode")),
    };
    Ok(Some(reply))
}

/// The invites, and the phone asking, when the relay invites and the
/// connection's token is a phone's own that is still on its line.
fn invites_of(shared: &Shared, access: Access) -> Option<(&Invites, Phone)> {
    let Access::Phone(hash) = access else {
        return None;
    };
    let invites = shared.invites.get().filter(|invites| invites.on())?;
    let name = shared.tokens.get()?.name_of(&hash)?;
    Some((invites, Phone { hash, name }))
}

/// A name after its 1-byte length, at most `MAX_TYPED` bytes of UTF-8.
fn read_name(r: &mut impl Read) -> io::Result<String> {
    let mut len = [0u8; 1];
    r.read_exact(&mut len)?;
    if usize::from(len[0]) > MAX_TYPED {
        return Err(io::Error::new(ErrorKind::InvalidData, "name too long"));
    }
    let mut bytes = vec![0u8; usize::from(len[0])];
    r.read_exact(&mut bytes)?;
    String::from_utf8(bytes).map_err(|_| io::Error::new(ErrorKind::InvalidData, "name is not text"))
}

/// Whether a connection may do what `may` says of its lent token: always,
/// unless it has one.
fn lent_may(shared: &Shared, access: Access, may: impl FnOnce(&Lend, Nonce) -> bool) -> bool {
    match (access, shared.lend.get()) {
        (Access::Lent(nonce), Some(lend)) => may(lend, nonce),
        (Access::Lent(_), None) => false,
        _ => true,
    }
}

fn lent_may_put(shared: &Shared, access: Access, bytes: usize) -> bool {
    lent_may(shared, access, |lend, nonce| {
        lend.may_put(nonce, system_now(), bytes as u64)
    })
}

/// Queues `msg` from `sender`, then wakes the connections waiting for a
/// message. Under the same lock, it pushes to the queue's web app if it asked
/// for that, unless the sender said it is word between phones that needs
/// none: so a `RECEIVE` that empties the queue comes wholly before or after.
fn queue_message(
    shared: &Shared,
    sender: &QueueId,
    msg: Vec<u8>,
    mark: Mark,
) -> Result<(), QueueError> {
    let sent = {
        let mut store = shared.store();
        let said = match mark {
            Mark::Quiet => Said::Quiet,
            Mark::Message => Said::Message,
            Mark::Ring => Said::Ring,
            Mark::Unknown => Said::Unknown,
        };
        let sent = store.send_said(sender, msg, said);
        let came = match mark {
            Mark::Quiet => None,
            Mark::Message => Some(Came::Message),
            Mark::Ring => Some(Came::Ring),
            Mark::Unknown => Some(Came::Unknown),
        };
        if let (true, Some(came)) = (sent.is_ok(), came) {
            if let Some(push) = shared.push.get() {
                if let Some(recipient) = store.recipient_of(sender) {
                    push.arrived(&recipient, came);
                }
            }
        }
        sent
    };
    if sent.is_ok() {
        shared.arrived.notify_all();
    }
    sent
}

/// The mark at the end of a send, if `framed` and there is one. A byte this
/// relay does not know is no mark, so later ones do not break it.
fn read_mark(r: &mut impl Read, framed: bool) -> io::Result<Mark> {
    Ok(match read_byte(r, framed)? {
        Some(MESSAGE) => Mark::Message,
        Some(QUIET) => Mark::Quiet,
        Some(RING) => Mark::Ring,
        _ => Mark::Unknown,
    })
}

/// The byte after a request, if `framed` and there is one.
fn read_byte(r: &mut impl Read, framed: bool) -> io::Result<Option<u8>> {
    if !framed {
        return Ok(None);
    }
    let mut byte = [0u8; 1];
    Ok(match r.read(&mut byte)? {
        0 => None,
        _ => Some(byte[0]),
    })
}

/// A browser's key and authentication secret after a `PUSH_SET`, if `framed`
/// and they are there. Anything else after it closes the connection.
#[allow(clippy::type_complexity)]
fn read_keys(r: &mut impl Read, framed: bool) -> io::Result<Option<(Vec<u8>, Vec<u8>)>> {
    if !framed {
        return Ok(None);
    }
    let mut rest = Vec::new();
    r.take((P256DH_LEN + AUTH_LEN + 1) as u64)
        .read_to_end(&mut rest)?;
    match rest.len() {
        0 => Ok(None),
        n if n == P256DH_LEN + AUTH_LEN => {
            let auth = rest.split_off(P256DH_LEN);
            Ok(Some((rest, auth)))
        }
        _ => Err(io::Error::new(
            ErrorKind::InvalidData,
            "not a browser's keys",
        )),
    }
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

/// What a phone last heard of a queue, in a `NEWS` request.
fn read_news(r: &mut impl Read) -> io::Result<News> {
    let mut bytes = [0u8; 16];
    r.read_exact(&mut bytes)?;
    let at = |i: usize| u32::from_be_bytes([bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]);
    Ok(News {
        round: at(0),
        messages: at(4),
        unmarked: at(8),
        rings: at(12),
    })
}

fn news_reply(news: News) -> Vec<u8> {
    let mut out = vec![OK];
    for n in [news.round, news.messages, news.unmarked, news.rings] {
        out.extend_from_slice(&n.to_be_bytes());
    }
    out
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

/// Removes what expired: messages and chunks nobody took, and queues their
/// recipients left unused, with their push addresses. The relay calls this
/// now and then.
pub fn sweep(shared: &Shared) {
    let gone = {
        let mut store = shared.store();
        store.expire();
        store.expire_queues()
    };
    if let Some(push) = shared.push.get() {
        for queue in &gone {
            push.forget(queue);
        }
    }
    shared.files().expire();
    if let (Some(invites), Some(tokens)) = (shared.invites.get(), shared.tokens.get()) {
        invites.sweep(tokens, system_now());
    }
}

/// Checks the phones signed in with a provider as their time comes (see
/// `signin.rs`), until the relay stops.
pub fn run_signin_checks(shared: SharedStore) {
    loop {
        thread::sleep(signin::LOOK_EVERY);
        if let (Some(signin), Some(tokens)) = (shared.signin.get(), shared.tokens.get()) {
            signin.check(tokens, system_now());
        }
    }
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
                        held = wait_timeout(
                            &shared.held_changed,
                            held,
                            Duration::from_secs(wait),
                            HELD_LOCK,
                        );
                    }
                }
            }
        };
        for request in due {
            // Held on a phone's own token: it waits while the phone's line is refused, and goes
            // with the line once that is gone from the file.
            let by = shared.held_by().get(&request.id).copied();
            if let (Some(phone), Some(tokens)) = (by, shared.tokens.get()) {
                if !tokens.holds(&phone) {
                    let gone = tokens.gone(&phone);
                    let mut held = shared.held();
                    if gone {
                        held.went(&request.id);
                    } else {
                        held.failed(&request.id);
                    }
                    if !held.holds(&request.id) {
                        shared.held_by().remove(&request.id);
                    }
                    continue;
                }
            }
            let reply = respond(
                &mut Cursor::new(&request.request),
                &shared,
                Access::All,
                true,
            );
            let done = matches!(&reply, Ok(Some(r)) if r.first().is_some_and(|s| *s == OK || *s == NOT_FOUND));
            let mut held = shared.held();
            if done {
                held.went(&request.id);
            } else {
                held.failed(&request.id);
            }
            if !held.holds(&request.id) {
                shared.held_by().remove(&request.id);
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

/// Passes a sealed send to the relay at `address`, with its mark, and returns
/// its status.
fn forward(shared: &Shared, address: &str, sealed: &[u8], mark: Mark) -> u8 {
    let url = format!("{}{SEALED_PATH}", address.trim_end_matches('/'));
    let mut request = vec![SEALED_SEND];
    request.extend_from_slice(&(sealed.len() as u32).to_be_bytes());
    request.extend_from_slice(sealed);
    request.extend(mark.byte());
    match call_relay(shared, &url, request, FORWARD_TIMEOUT) {
        Ok(reply) if reply.len() == 1 && reply[0] <= FAILED => reply[0],
        _ => UNREACHABLE,
    }
}

/// Passes a `FILE_GET` or `FILE_DELETE` to the relay at `address` and returns
/// its reply, if it is one such a request can have.
fn file_via(shared: &Shared, address: &str, op: u8, id: &ChunkId) -> Vec<u8> {
    let url = format!("{}{FILES_PATH}", address.trim_end_matches('/'));
    let mut request = vec![op];
    request.extend_from_slice(id);
    match call_relay(shared, &url, request, FILE_TIMEOUT) {
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

/// Sends one request to the relay at `url` and returns its reply. Only to an
/// address on the internet, unless the operator allows private peers (see
/// `peers.rs`); one that is not is an error, as one that cannot be reached is.
fn call_relay(
    shared: &Shared,
    url: &str,
    request: Vec<u8>,
    timeout: Duration,
) -> io::Result<Vec<u8>> {
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
    // Resolved once: the addresses checked are the ones connected to, and the
    // name is not looked up again, by this or by the WebSocket client. Each is
    // tried in turn, so one that does not answer does not fail the forward.
    let private_peers = shared.limits.private_peers;
    let addresses: Vec<SocketAddr> = (host, port)
        .to_socket_addrs()?
        .filter(|addr| private_peers || peers::global(addr.ip()))
        .collect();
    if addresses.is_empty() {
        return Err(to_io("no address the relay may connect to"));
    }
    let stream = connect::to_any(&addresses, FORWARD_TIMEOUT)?;
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

/// The token a connection gave, as `Authorization: Bearer` or as a
/// subprotocol in hex.
fn presented_token(request: &Request) -> Option<String> {
    let bearer = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    if let Some(bearer) = bearer {
        return Some(bearer.to_string());
    }
    offered_protocols(request)
        .filter_map(|p| p.strip_prefix(TOKEN_PROTOCOL))
        .find_map(|hex| {
            if !hex.len().is_multiple_of(2) || !hex.is_ascii() {
                return None;
            }
            let bytes: Option<Vec<u8>> = (0..hex.len())
                .step_by(2)
                .map(|at| u8::from_str_radix(&hex[at..at + 2], 16).ok())
                .collect();
            String::from_utf8(bytes?).ok()
        })
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

/// The answer when a path that needs no token has all the connections it may.
fn busy() -> ErrorResponse {
    let mut response = ErrorResponse::new(None);
    *response.status_mut() = StatusCode::SERVICE_UNAVAILABLE;
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
        start_limited(Limits::default())
    }

    /// A relay on TCP that takes connections as `limits` says.
    fn start_limited(limits: Limits) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Shared::new(Store::default(), FileStore::default(), None, None, limits);
        let held = Arc::clone(&store);
        thread::spawn(move || run_held(held));
        thread::spawn(move || serve(listener, store));
        addr
    }

    fn start_ws(token: Option<&str>) -> SocketAddr {
        start_ws_with(token, None)
    }

    fn start_ws_with(token: Option<&str>, key: Option<RelayKey>) -> SocketAddr {
        start_ws_limited(token, key, Limits::default())
    }

    /// A relay that may forward to relays on this machine, as the other
    /// relays in these tests are: its operator allowed private peers.
    fn start_ws_lan(token: Option<&str>) -> SocketAddr {
        start_ws_limited(
            token,
            None,
            Limits {
                private_peers: true,
                ..Limits::default()
            },
        )
    }

    fn start_ws_limited(token: Option<&str>, key: Option<RelayKey>, limits: Limits) -> SocketAddr {
        start_ws_tokens(token, key, limits, None)
    }

    /// With `tokens`, the file of the phones' own tokens too.
    fn start_ws_tokens(
        token: Option<&str>,
        key: Option<RelayKey>,
        limits: Limits,
        tokens: Option<std::path::PathBuf>,
    ) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Shared::new(Store::default(), FileStore::default(), key, None, limits);
        if let Some(path) = tokens {
            let _ = store.tokens.set(Tokens::new(path));
        }
        // A relay with a key lends here, as one started with EREVOS_RELAY_LEND=on does.
        if let Some(key) = &store.key {
            let _ = store.lend.set(Lend::new(key));
        }
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

    fn news_request(recipient: &QueueId, seconds: u8, heard: News) -> Vec<u8> {
        let mut req = vec![NEWS];
        req.extend_from_slice(recipient);
        req.push(seconds);
        req.extend_from_slice(&news_reply(heard)[1..]);
        req
    }

    fn ws_news(ws: &mut Ws, recipient: &QueueId, seconds: u8, heard: News) -> News {
        let r = ws_call(ws, news_request(recipient, seconds, heard));
        assert_eq!((r[0], r.len()), (OK, 17));
        read_news(&mut &r[1..]).unwrap()
    }

    #[test]
    fn news_says_how_many_messages_came_and_nothing_of_word_between_phones() {
        let addr = start_ws(None);
        let mut ws = connect_with_token(addr, "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let nothing = News::default();
        // Nothing comes: the time is up, and nothing came.
        let started = Instant::now();
        assert_eq!(ws_news(&mut ws, &recipient, 1, nothing), nothing);
        assert!(started.elapsed() >= Duration::from_millis(900));

        // Word between phones starts a round, with no message in it.
        let quiet = marked(send_request(&sender, b"seen"), QUIET);
        assert_eq!(ws_call(&mut ws, quiet), vec![OK]);
        let first = ws_news(&mut ws, &recipient, 30, nothing);
        assert_ne!(first.round, 0);
        assert_eq!((first.messages, first.unmarked, first.rings), (0, 0, 0));

        // One waiting for more ends as a message comes.
        let waiter = thread::spawn(move || {
            let mut w = connect_with_token(addr, "", "");
            let started = Instant::now();
            (ws_news(&mut w, &recipient, 30, first), started.elapsed())
        });
        thread::sleep(Duration::from_millis(300));
        let message = marked(send_request(&sender, b"hello"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        let (now, took) = waiter.join().unwrap();
        assert!(took < Duration::from_secs(10));
        assert_eq!(
            (now.round, now.messages, now.unmarked, now.rings),
            (first.round, 1, 0, 0)
        );

        // A call and a send that did not say are counted apart; more word, not at all.
        assert_eq!(
            ws_call(&mut ws, marked(send_request(&sender, b"call"), RING)),
            vec![OK]
        );
        assert_eq!(ws_call(&mut ws, send_request(&sender, b"old")), vec![OK]);
        assert_eq!(
            ws_call(&mut ws, marked(send_request(&sender, b"read"), QUIET)),
            vec![OK]
        );
        let all = ws_news(&mut ws, &recipient, 30, now);
        assert_eq!(
            (all.round, all.messages, all.unmarked, all.rings),
            (first.round, 1, 1, 1)
        );
        assert_eq!(ws_news(&mut ws, &recipient, 0, all), all);

        // Nothing was taken; once the queue is found empty, the round ends.
        for _ in 0..5 {
            assert!(ws_receive(&mut ws, &recipient).is_some());
        }
        assert_eq!(ws_receive(&mut ws, &recipient), None);
        assert_eq!(ws_news(&mut ws, &recipient, 0, all), nothing);
        let message = marked(send_request(&sender, b"next"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        let next = ws_news(&mut ws, &recipient, 30, nothing);
        assert!(next.round != 0 && next.round != first.round);
        assert_eq!((next.messages, next.unmarked, next.rings), (1, 0, 0));

        // A queue that is not here.
        let r = ws_call(&mut ws, news_request(&[9u8; 24], 30, nothing));
        assert_eq!(r, vec![NOT_FOUND]);
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
    fn a_phone_with_a_token_of_its_own_comes_in_until_the_operator_takes_its_line_out() {
        let list = std::env::temp_dir().join(format!("erevos-phones-{}", std::process::id()));
        let (pixel, pixel_line) = crate::tokens::new_token("pixel");
        let (other, other_line) = crate::tokens::new_token("other");
        std::fs::write(&list, format!("{pixel_line}\n{other_line}\n")).unwrap();
        let connect = |addr: SocketAddr, token: Option<&str>| {
            let mut request = format!("ws://{addr}").into_client_request().unwrap();
            if let Some(token) = token {
                request
                    .headers_mut()
                    .insert("authorization", format!("Bearer {token}").parse().unwrap());
            }
            tungstenite::connect(request).map(|(ws, _)| ws)
        };
        for shared in [Some("s3cret"), None] {
            let addr = start_ws_tokens(shared, None, Limits::default(), Some(list.clone()));
            // A phone's own token works as the relay's does, which still works.
            let mut ws = connect(addr, Some(&pixel)).unwrap();
            let (recipient, sender) = ws_create(&mut ws);
            assert_eq!(ws_send(&mut ws, &sender, b"hi"), OK);
            assert_eq!(ws_receive(&mut ws, &recipient).as_deref(), Some(&b"hi"[..]));
            assert_eq!(connect(addr, Some("s3cret")).is_ok(), shared.is_some());
            // With a file of tokens, a connection with none, or a wrong one, is refused.
            assert!(connect(addr, None).is_err());
            assert!(connect(addr, Some(pixel_line.split(' ').next().unwrap())).is_err());
            assert!(connect(addr, Some(&other)).is_ok());
        }
        // The Pixel's line taken out: from the next connection on it is refused, the other phone is not,
        // and a connection the Pixel has open is closed at its next request.
        let addr = start_ws_tokens(Some("s3cret"), None, Limits::default(), Some(list.clone()));
        let mut open = connect(addr, Some(&pixel)).unwrap();
        ws_create(&mut open);
        let mut theirs = connect(addr, Some(&other)).unwrap();
        std::fs::write(&list, format!("# the Pixel was lost\n{other_line}\n")).unwrap();
        let file = std::fs::File::options().write(true).open(&list).unwrap();
        file.set_modified(std::time::SystemTime::UNIX_EPOCH + Duration::from_secs(2_000_000))
            .unwrap();
        assert!(refused(&mut open, vec![CREATE]));
        ws_create(&mut theirs);
        assert!(connect(addr, Some(&pixel)).is_err());
        assert!(connect(addr, Some(&other)).is_ok());
        assert!(connect(addr, Some("s3cret")).is_ok());
        let _ = std::fs::remove_file(&list);
    }

    /// A relay whose phones with tokens of their own in `tokens` may invite,
    /// keeping the invites in memory, beside the relay's own `token`.
    fn start_ws_inviting(token: &str, tokens: std::path::PathBuf) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Shared::new(
            Store::default(),
            FileStore::default(),
            None,
            None,
            Limits::default(),
        );
        let _ = store.tokens.set(Tokens::new(tokens));
        let _ = store.invites.set(Invites::in_memory());
        let token: Option<Arc<str>> = Some(Arc::from(token));
        thread::spawn(move || serve_ws(listener, store, token));
        addr
    }

    fn invite_request(name: &str) -> Vec<u8> {
        let mut req = vec![INVITE, name.len() as u8];
        req.extend_from_slice(name.as_bytes());
        req
    }

    fn redeem_request(secret: &[u8], token: &str) -> Vec<u8> {
        use sha2::Digest;
        let mut req = vec![REDEEM];
        req.extend_from_slice(secret);
        req.extend_from_slice(&sha2::Sha256::digest(token.as_bytes()));
        req
    }

    /// This phone's invites, as `INVITES` lists them: id, name and when used.
    fn invites_listed(ws: &mut Ws) -> Vec<([u8; 16], String, u64)> {
        let r = ws_call(ws, vec![INVITES]);
        assert_eq!(r[0], OK);
        let count = u16::from_be_bytes([r[1], r[2]]) as usize;
        let mut at = 3;
        let mut out = Vec::new();
        for _ in 0..count {
            let id: [u8; 16] = r[at..at + 16].try_into().unwrap();
            let used = u64::from_be_bytes(r[at + 24..at + 32].try_into().unwrap());
            let len = r[at + 32] as usize;
            let name = String::from_utf8(r[at + 33..at + 33 + len].to_vec()).unwrap();
            out.push((id, name, used));
            at += 33 + len;
        }
        assert_eq!(at, r.len());
        out
    }

    fn unhex(hex: &str) -> Vec<u8> {
        (0..hex.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).unwrap())
            .collect()
    }

    #[test]
    fn a_phone_with_a_token_of_its_own_invites_one_more_phone_by_name() {
        use sha2::Digest;
        let list = std::env::temp_dir().join(format!("erevos-invited-{}", std::process::id()));
        let (pixel, pixel_line) = crate::tokens::new_token("pixel");
        std::fs::write(&list, format!("{pixel_line}\n")).unwrap();
        let addr = start_ws_inviting("s3cret", list.clone());
        // The relay's one token may not invite: the relay says it does not.
        let mut shared = connect_with_token(addr, "", "s3cret");
        assert_eq!(
            ws_call(&mut shared, invite_request("maria")),
            vec![NOT_FOUND]
        );
        assert_eq!(ws_call(&mut shared, vec![INVITES]), vec![NOT_FOUND]);
        // A phone of its own may.
        let mut ws = connect_with_token(addr, "", &pixel);
        assert!(invites_listed(&mut ws).is_empty());
        let r = ws_call(&mut ws, invite_request("Μαρία"));
        assert_eq!(r[0], OK);
        let expires = u64::from_be_bytes(r[1..9].try_into().unwrap());
        assert!(expires >= system_now() + 7 * 24 * 3600 - 60);
        let secret = unhex(std::str::from_utf8(&r[9..]).unwrap());
        assert_eq!(secret.len(), 32);

        // The new phone, with no token, takes it on the /join path, with a token it made.
        let (maria, _) = crate::tokens::new_token("");
        assert!(tungstenite::connect(format!("ws://{addr}")).is_err());
        let (mut join, _) = tungstenite::connect(format!("ws://{addr}{JOIN_PATH}")).unwrap();
        let reply = ws_call(&mut join, redeem_request(&secret, &maria));
        assert_eq!((reply[0], &reply[1..]), (OK, &b"maria"[..]));
        // Asked again, as when the answer was lost on the way: the same.
        assert_eq!(ws_call(&mut join, redeem_request(&secret, &maria)), reply);
        // Another phone with it is refused, and a secret that is none is not there.
        assert_eq!(
            ws_call(&mut join, redeem_request(&secret, "another")),
            vec![FULL]
        );
        assert_eq!(
            ws_call(&mut join, redeem_request(&[7; 32], "another")),
            vec![NOT_FOUND]
        );
        // The join path takes nothing else.
        assert!(refused(&mut join, vec![CREATE]));
        let line = std::fs::read_to_string(&list).unwrap();
        assert!(line.contains(&format!(
            "{} maria # invited by pixel on ",
            to_hex(&sha2::Sha256::digest(maria.as_bytes()))
        )));

        // Maria's phone comes in with its token, and may invite in turn.
        let mut theirs = connect_with_token(addr, "", &maria);
        ws_create(&mut theirs);
        assert_eq!(ws_call(&mut theirs, invite_request("anna"))[0], OK);
        // Pixel sees its invite used, and takes it back: Maria's phone is refused from then on.
        let listed = invites_listed(&mut ws);
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].1, "maria");
        assert!(listed[0].2 > 0);
        let mut back = vec![UNINVITE];
        back.extend_from_slice(&listed[0].0);
        // Maria's phone cannot take back Pixel's.
        assert_eq!(ws_call(&mut theirs, back.clone()), vec![NOT_FOUND]);
        assert_eq!(ws_call(&mut ws, back.clone()), vec![OK]);
        assert_eq!(ws_call(&mut ws, back), vec![NOT_FOUND]);
        // The connection Maria's phone has open is closed at its next request.
        assert!(refused(&mut theirs, vec![INVITES]));
        let mut request = format!("ws://{addr}").into_client_request().unwrap();
        request
            .headers_mut()
            .insert("authorization", format!("Bearer {maria}").parse().unwrap());
        assert!(tungstenite::connect(request).is_err());
        assert!(invites_listed(&mut ws).is_empty());
        let _ = std::fs::remove_file(&list);
    }

    fn own_request(name: &str, token: &str) -> Vec<u8> {
        use sha2::Digest;
        let mut req = vec![OWN, name.len() as u8];
        req.extend_from_slice(name.as_bytes());
        req.extend_from_slice(&sha2::Sha256::digest(token.as_bytes()));
        req
    }

    #[test]
    fn a_phone_with_the_relay_s_token_takes_a_line_of_its_own_and_invites_with_it() {
        let list = std::env::temp_dir().join(format!("erevos-owned-{}", std::process::id()));
        let (pixel, pixel_line) = crate::tokens::new_token("pixel");
        std::fs::write(&list, format!("{pixel_line}\n")).unwrap();
        let addr = start_ws_inviting("s3cret", list.clone());
        let (anna, _) = crate::tokens::new_token("");
        // With the relay's one token: a line for the token the phone made.
        let mut shared = connect_with_token(addr, "", "s3cret");
        let reply = ws_call(&mut shared, own_request("Άννα", &anna));
        assert_eq!((reply[0], &reply[1..]), (OK, &b"anna"[..]));
        // Asked again, as when the answer was lost on the way: the same.
        assert_eq!(ws_call(&mut shared, own_request("Άννα", &anna)), reply);
        assert!(std::fs::read_to_string(&list)
            .unwrap()
            .contains(" anna # came with the relay's token on "));
        // The phone goes on with its own token, and may invite with it.
        let mut theirs = connect_with_token(addr, "", &anna);
        ws_create(&mut theirs);
        assert_eq!(ws_call(&mut theirs, invite_request("maria"))[0], OK);
        // Only the relay's one token asks so: not a phone's own, nor the join path.
        assert!(refused(&mut theirs, own_request("more", "another")));
        let mut ws = connect_with_token(addr, "", &pixel);
        assert!(refused(&mut ws, own_request("more", "another")));
        let (mut join, _) = tungstenite::connect(format!("ws://{addr}{JOIN_PATH}")).unwrap();
        assert!(refused(&mut join, own_request("more", "another")));
        let _ = std::fs::remove_file(&list);
    }

    #[test]
    fn a_relay_that_does_not_invite_adds_no_line_for_its_token() {
        let addr = start_ws(Some("s3cret"));
        let mut shared = connect_with_token(addr, "", "s3cret");
        assert_eq!(
            ws_call(&mut shared, own_request("anna", "mine")),
            vec![NOT_FOUND]
        );
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
        let shared = Shared::new(
            Store::default(),
            FileStore::default(),
            None,
            None,
            Limits::default(),
        );
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

    /// A relay on WebSocket, with no token, that pushes to the push service
    /// at `service`, at most once in `gap` for each queue.
    fn start_ws_pushing(service: &str, key: Option<RelayKey>, gap: Duration) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let shared = Shared::new(
            Store::default(),
            FileStore::default(),
            key,
            None,
            Limits::default(),
        );
        let push = Push::with_gap(
            p256::ecdsa::SigningKey::random(&mut rand::rngs::OsRng),
            "mailto:a@example.org".into(),
            vec![service.to_string()],
            None,
            gap,
        )
        .unwrap();
        shared.push.set(push).ok().unwrap();
        let held = Arc::clone(&shared);
        thread::spawn(move || run_held(held));
        thread::spawn(move || serve_ws(listener, shared, None));
        addr
    }

    fn push_set_request(queue: &QueueId, endpoint: &str, keys: &[u8]) -> Vec<u8> {
        let mut req = vec![PUSH_SET];
        req.extend_from_slice(queue);
        req.extend_from_slice(&(endpoint.len() as u16).to_be_bytes());
        req.extend_from_slice(endpoint.as_bytes());
        req.extend_from_slice(keys);
        req
    }

    /// A browser's keys for a push address, as `PUSH_SET` takes them.
    fn key_bytes(keys: &Keys) -> Vec<u8> {
        let mut bytes = keys.p256dh.to_vec();
        bytes.extend_from_slice(&keys.auth);
        bytes
    }

    fn marked(mut request: Vec<u8>, mark: u8) -> Vec<u8> {
        request.push(mark);
        request
    }

    #[test]
    fn a_web_app_with_its_keys_is_told_how_many_messages_came_but_not_of_word_between_phones() {
        use crate::push::stream;
        use crate::push::tests::{browser, said, service};
        let (service, pushes) = service(201);
        let gap = Duration::from_millis(300);
        let addr = start_ws_pushing(&service, None, gap);
        let mut ws = connect_with_token(addr, "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let (secret, keys) = browser();
        let endpoint = format!("{service}k");

        // Keys that are no point on the curve are taken as none: the pushes go empty.
        let mut bogus = key_bytes(&keys);
        bogus[1] ^= 1;
        let r = ws_call(&mut ws, push_set_request(&recipient, &endpoint, &bogus));
        assert_eq!(r, vec![OK]);
        let r = ws_call(
            &mut ws,
            push_set_request(&recipient, &endpoint, &key_bytes(&keys)),
        );
        assert_eq!(r, vec![OK, 1]);
        // Anything else after the address closes the connection.
        assert!(refused(
            &mut connect_with_token(addr, "", ""),
            push_set_request(&recipient, &endpoint, &key_bytes(&keys)[..10])
        ));

        // Word between phones pushes nothing.
        let quiet = marked(send_request(&sender, b"seen"), QUIET);
        assert_eq!(ws_call(&mut ws, quiet), vec![OK]);
        assert!(pushes.recv_timeout(gap * 2).is_err());

        // A message pushes how many came, encrypted for the browser.
        let message = marked(send_request(&sender, b"hello"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        let (head, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(head.starts_with("POST /k HTTP/1.1\r\n"), "{head}");
        let (from, round, count, unmarked, _) = said(&secret, &keys, &body);
        assert_eq!((from, count, unmarked), (stream(&recipient), 1, 0));

        // A send that says nothing of what it is, as from an older phone, or
        // with a mark this relay does not know: a push, which counts it apart.
        for (n, request) in [
            send_request(&sender, b"old"),
            marked(send_request(&sender, b"new"), 9),
        ]
        .into_iter()
        .enumerate()
        {
            assert_eq!(ws_call(&mut ws, request), vec![OK]);
            let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
            let (_, again, count, unmarked, _) = said(&secret, &keys, &body);
            assert_eq!((again, count, unmarked), (round, 1, n as u32 + 1));
        }

        // The web app took its messages: the count starts again, in a new round.
        let mut took = 0;
        while ws_receive(&mut ws, &recipient).is_some() {
            took += 1;
        }
        assert_eq!(took, 4);
        let message = marked(send_request(&sender, b"next"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, next, count, unmarked, _) = said(&secret, &keys, &body);
        assert_eq!((count, unmarked), (1, 0));
        assert_ne!(next, round);
    }

    #[test]
    fn a_call_that_rings_pushes_and_says_so_but_counts_no_message() {
        use crate::push::tests::{browser, said, service};
        let (service, pushes) = service(201);
        let addr = start_ws_pushing(&service, None, Duration::from_millis(100));
        let mut ws = connect_with_token(addr, "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let (secret, keys) = browser();
        let set = push_set_request(&recipient, &format!("{service}r"), &key_bytes(&keys));
        assert_eq!(ws_call(&mut ws, set), vec![OK, 1]);

        let ring = marked(send_request(&sender, b"offer"), RING);
        assert_eq!(ws_call(&mut ws, ring), vec![OK]);
        let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, _, count, unmarked, rings) = said(&secret, &keys, &body);
        assert_eq!((count, unmarked, rings), (0, 0, 1));
        assert_eq!(
            ws_receive(&mut ws, &recipient).as_deref(),
            Some(&b"offer"[..])
        );
    }

    #[test]
    fn messages_taken_on_the_screen_stop_the_push_that_waits() {
        use crate::push::tests::{browser, said, service};
        let (service, pushes) = service(201);
        let gap = Duration::from_millis(400);
        let addr = start_ws_pushing(&service, None, gap);
        let mut ws = connect_with_token(addr, "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let (secret, keys) = browser();
        let set = push_set_request(&recipient, &format!("{service}w"), &key_bytes(&keys));
        assert_eq!(ws_call(&mut ws, set), vec![OK, 1]);
        let receive_shown = || {
            let mut req = vec![RECEIVE];
            req.extend_from_slice(&recipient);
            req.push(SHOWN);
            req
        };

        let message = marked(send_request(&sender, b"one"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, count, _, _) = said(&secret, &keys, &body);
        assert_eq!(count, 1);
        // The second within the gap, after the first push went: it waits.
        let message = marked(send_request(&sender, b"two"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        // Both read on the screen before the gap is over: the second push
        // would tell of a message already read, so it does not go.
        assert_eq!(ws_call(&mut ws, receive_shown())[..2], [OK, 1]);
        assert_eq!(ws_call(&mut ws, receive_shown())[..2], [OK, 1]);
        assert_eq!(ws_call(&mut ws, receive_shown()), vec![OK, 0]);
        assert!(pushes
            .recv_timeout(gap + Duration::from_millis(300))
            .is_err());

        let message = marked(send_request(&sender, b"three"), MESSAGE);
        assert_eq!(ws_call(&mut ws, message), vec![OK]);
        let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, next, count, _, _) = said(&secret, &keys, &body);
        assert_eq!(count, 1);
        assert_ne!(next, round);
    }

    #[test]
    fn a_forward_passes_its_mark_on_to_the_other_relay() {
        use crate::push::tests::{browser, said, service};
        let (service, pushes) = service(201);
        let key = RelayKey::generate();
        let public = key.public();
        let far = start_ws_pushing(&service, Some(key), Duration::from_millis(100));
        let near = start_ws_lan(None);

        let mut far_ws = connect_with_token(far, "", "");
        let (recipient, sender) = ws_create(&mut far_ws);
        let (secret, keys) = browser();
        let set = push_set_request(&recipient, &format!("{service}f"), &key_bytes(&keys));
        assert_eq!(ws_call(&mut far_ws, set), vec![OK, 1]);

        let mut near_ws = connect_with_token(near, "", "");
        let far_address = format!("ws://{far}");
        let quiet = seal(&public, &sender, b"seen").unwrap();
        let r = ws_call(
            &mut near_ws,
            marked(forward_request(&far_address, &quiet), QUIET),
        );
        assert_eq!(r, vec![OK]);
        assert!(pushes.recv_timeout(Duration::from_millis(500)).is_err());

        let message = seal(&public, &sender, b"hello").unwrap();
        let r = ws_call(
            &mut near_ws,
            marked(forward_request(&far_address, &message), MESSAGE),
        );
        assert_eq!(r, vec![OK]);
        let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, _, count, unmarked, _) = said(&secret, &keys, &body);
        assert_eq!((count, unmarked), (1, 0));
    }

    #[test]
    fn a_message_sent_for_later_is_counted_when_it_goes() {
        use crate::push::tests::{browser, said, service};
        let (service, pushes) = service(201);
        let addr = start_ws_pushing(&service, None, Duration::from_millis(100));
        let mut ws = connect_with_token(addr, "", "");
        let (recipient, sender) = ws_create(&mut ws);
        let (secret, keys) = browser();
        let set = push_set_request(&recipient, &format!("{service}l"), &key_bytes(&keys));
        assert_eq!(ws_call(&mut ws, set), vec![OK, 1]);

        // The mark goes after the whole request: one inside the held send is
        // more than a send, refused as before.
        let at = system_now() + 1;
        let inside = marked(send_request(&sender, b"x"), MESSAGE);
        assert!(refused(
            &mut connect_with_token(addr, "", ""),
            later_request(at, &[4; 16], &inside)
        ));
        let held = later_request(at, &[3; 16], &send_request(&sender, b"later"));
        assert_eq!(ws_call(&mut ws, marked(held, MESSAGE)), vec![OK]);
        assert!(pushes.recv_timeout(Duration::from_millis(300)).is_err());

        let (_, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, _, count, unmarked, _) = said(&secret, &keys, &body);
        assert_eq!((count, unmarked), (1, 0));
        assert_eq!(
            ws_receive(&mut ws, &recipient).as_deref(),
            Some(&b"later"[..])
        );
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

    /// A plain HTTP request to the WebSocket port, as a browser in Greek
    /// makes one: the status, the `Location` if any, and the body; a status
    /// of 0 when the relay closed without an answer.
    fn browse(addr: SocketAddr, method: &str, target: &str, body: &str) -> (u16, String, String) {
        let mut stream = TcpStream::connect(addr).unwrap();
        write!(
            stream,
            "{method} {target} HTTP/1.1\r\nHost: erevos.example.org\r\nAccept-Language: el-GR,el;q=0.9\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        )
        .unwrap();
        let mut reply = Vec::new();
        let _ = stream.read_to_end(&mut reply);
        let reply = String::from_utf8_lossy(&reply).to_string();
        let Some((head, body)) = reply.split_once("\r\n\r\n") else {
            return (0, String::new(), String::new());
        };
        let status = head.split(' ').nth(1).unwrap().parse().unwrap();
        let location = head
            .lines()
            .find_map(|l| l.strip_prefix("Location: "))
            .unwrap_or_default()
            .to_string();
        (status, location, body.to_string())
    }

    #[test]
    fn a_phone_signs_in_with_a_provider_in_the_browser_and_claims_its_token_on_join() {
        use sha2::Digest;
        let fake = crate::signin::tests::Fake::start();
        let list = std::env::temp_dir().join(format!("erevos-signed-in-{}", std::process::id()));
        let _ = std::fs::remove_file(&list);
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let public = format!("http://127.0.0.1:{}", addr.port());
        let store = Shared::new(
            Store::default(),
            FileStore::default(),
            None,
            None,
            Limits::default(),
        );
        let _ = store.tokens.set(Tokens::new(list.clone()));
        let _ = store
            .signin
            .set(SignIn::open(fake.config(&public), None).unwrap());
        thread::spawn(move || serve_ws(listener, store, None));

        // The app asks on /join what to open.
        let (mut join, _) = tungstenite::connect(format!("ws://{addr}{JOIN_PATH}")).unwrap();
        let r = ws_call(&mut join, vec![SIGN_IN]);
        assert_eq!((r[0], r[1]), (OK, 4));
        assert_eq!(&r[2..6], b"LPHL");
        assert_eq!(u16::from_be_bytes([r[6], r[7]]) as usize, r.len() - 8);
        assert_eq!(
            std::str::from_utf8(&r[8..]).unwrap(),
            format!("{public}/signin/start")
        );

        // The browser: the start, the provider, and back to the relay, which shows a code.
        let secret = [5u8; 32];
        let claim = to_hex(&sha2::Sha256::digest(secret));
        let (status, location, _) =
            browse(addr, "GET", &format!("/signin/start?claim={claim}"), "");
        assert_eq!(status, 302);
        let back = fake.authorize(&location);
        let (status, _, page) = browse(addr, "GET", back.strip_prefix(&public).unwrap(), "");
        assert_eq!(status, 200);
        assert!(page.contains("Συνδέθηκες στο LPHL ως Nekten."));
        let at = page.find("<p class=\"code\">").unwrap() + 16;
        let code: Vec<u8> = page[at..at + 7]
            .bytes()
            .filter(u8::is_ascii_digit)
            .collect();
        assert_eq!(code.len(), 6);
        // Nothing is left to post from the page.
        assert!(!page.contains("<form"));

        // Back in the app, the claim, with a token the phone made and the code typed.
        let (token, _) = crate::tokens::new_token("");
        let claim_with = |code: &[u8]| {
            let mut claim = vec![CLAIM];
            claim.extend_from_slice(&secret);
            claim.extend_from_slice(&sha2::Sha256::digest(token.as_bytes()));
            claim.extend_from_slice(&[0u8; 32]);
            claim.extend_from_slice(code);
            claim
        };
        let wrong: Vec<u8> = code.iter().map(|d| b'0' + (d - b'0' + 1) % 10).collect();
        assert_eq!(ws_call(&mut join, claim_with(&wrong)), vec![WRONG, 4]);
        // The right one: it works from then on.
        let r = ws_call(&mut join, claim_with(&code));
        assert_eq!((r[0], &r[1..]), (OK, &b"lphl:nekten"[..]));
        let mut ws = connect_with_token(addr, "", &token);
        ws_create(&mut ws);
        // A connection with a token does not sign in; the join path still takes nothing else.
        assert!(refused(&mut ws, vec![SIGN_IN]));
        assert!(refused(&mut join, vec![CREATE]));
        let _ = std::fs::remove_file(&list);
    }

    #[test]
    fn a_relay_without_sign_in_says_so_and_has_no_pages() {
        let list = std::env::temp_dir().join(format!("erevos-no-sign-in-{}", std::process::id()));
        let addr = start_ws_inviting("s3cret", list);
        let (mut join, _) = tungstenite::connect(format!("ws://{addr}{JOIN_PATH}")).unwrap();
        assert_eq!(ws_call(&mut join, vec![SIGN_IN]), vec![NOT_FOUND]);
        let mut claim = vec![CLAIM];
        claim.extend_from_slice(&[1u8; 96]);
        claim.extend_from_slice(b"123456");
        assert_eq!(ws_call(&mut join, claim), vec![NOT_FOUND]);
        // A browser's request is a WebSocket handshake that fails, as before.
        let (status, location, body) = browse(addr, "GET", "/signin/start?claim=00", "");
        assert_ne!(status, 302);
        assert!(location.is_empty() && !body.contains("Erevos"));
    }

    /// A request the connection may not make: it is closed, with no reply.
    fn refused(ws: &mut Ws, request: Vec<u8>) -> bool {
        ws.send(Message::Binary(request.into())).unwrap();
        !matches!(ws.read(), Ok(Message::Binary(_)))
    }

    fn ticket_of(addr: SocketAddr, token: &str) -> String {
        let r = ws_call(&mut connect_with_token(addr, "", token), vec![LEND]);
        assert_eq!(r[0], OK);
        String::from_utf8(r[1..].to_vec()).unwrap()
    }

    /// A place taken with `ticket`: its queue's recipient and sender ids, and its lent token.
    fn borrow(addr: SocketAddr, ticket: &str) -> (QueueId, QueueId, String) {
        let r = ws_call(&mut connect_with_token(addr, "", ticket), vec![BORROW]);
        assert_eq!(r[0], OK);
        let mut recipient = [0u8; 24];
        let mut sender = [0u8; 24];
        recipient.copy_from_slice(&r[1..25]);
        sender.copy_from_slice(&r[25..49]);
        (
            recipient,
            sender,
            String::from_utf8(r[49..].to_vec()).unwrap(),
        )
    }

    #[test]
    fn a_phone_without_a_relay_takes_a_place_lent_with_a_ticket() {
        let addr = start_ws_with(Some("t"), Some(RelayKey::generate()));
        let mut owner = connect_with_token(addr, "", "t");
        let (owner_recipient, owner_sender) = ws_create(&mut owner);
        let ticket = ticket_of(addr, "t");
        assert!(ticket.starts_with("ticket."));

        // A ticket only takes a place.
        assert!(refused(
            &mut connect_with_token(addr, "", &ticket),
            vec![CREATE]
        ));
        let (recipient, sender, token) = borrow(addr, &ticket);
        assert!(token.starts_with("lent."));
        assert!(refused(
            &mut connect_with_token(addr, "", &token),
            vec![BORROW]
        ));

        // The place's queue works both ways, as one made with the relay's token.
        let mut lent = connect_with_token(addr, "", &token);
        assert_eq!(ws_send(&mut lent, &owner_sender, b"from a lent place"), OK);
        assert_eq!(
            ws_receive(&mut owner, &owner_recipient).as_deref(),
            Some(&b"from a lent place"[..])
        );
        assert_eq!(ws_send(&mut owner, &sender, b"back"), OK);
        assert_eq!(
            ws_receive(&mut lent, &recipient).as_deref(),
            Some(&b"back"[..])
        );
        let mut wait = vec![WAIT];
        wait.extend_from_slice(&recipient);
        wait.push(0);
        assert_eq!(ws_call(&mut lent, wait), vec![OK, 0]);
        // "back" was taken, and said nothing of what it carries.
        assert_eq!(
            ws_news(&mut lent, &recipient, 0, News::default()).unmarked,
            1
        );
        assert_eq!(ws_call(&mut lent, vec![KEY])[0], OK);
        let mut put = vec![FILE_PUT];
        put.extend_from_slice(&3u32.to_be_bytes());
        put.extend_from_slice(b"abc");
        assert_eq!(ws_call(&mut lent, put)[0], OK);

        // So many more queues a day.
        for _ in 0..crate::lend::MAX_QUEUES {
            ws_create(&mut lent);
        }
        assert_eq!(ws_call(&mut lent, vec![CREATE]), vec![FULL]);

        // It cannot lend on, nor have the relay connect anywhere.
        for request in [
            vec![LEND],
            vec![CALL_RELAY],
            forward_request("ws://127.0.0.1:1", b"x"),
        ] {
            assert!(refused(&mut connect_with_token(addr, "", &token), request));
        }

        // A ticket gives so many places; a made-up lent token is refused as a wrong token is.
        for _ in 1..crate::lend::MAX_BORROWS {
            borrow(addr, &ticket);
        }
        let r = ws_call(&mut connect_with_token(addr, "", &ticket), vec![BORROW]);
        assert_eq!(r, vec![FULL]);
        let mut request = format!("ws://{addr}").into_client_request().unwrap();
        request.headers_mut().insert(
            "authorization",
            format!("Bearer lent.{}", "0".repeat(96)).parse().unwrap(),
        );
        assert!(tungstenite::connect(request).is_err());
        // The relay's own token takes no place.
        assert!(refused(&mut owner, vec![BORROW]));
    }

    #[test]
    fn a_revoked_ticket_and_its_places_are_refused_from_the_next_connection() {
        let dir = std::env::temp_dir();
        let pid = std::process::id();
        let counts = dir.join(format!("erevos-relay-test-{pid}.lent-counts"));
        let list = dir.join(format!("erevos-relay-test-{pid}.revoked"));
        let _ = std::fs::remove_file(&list);
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let key = RelayKey::generate();
        let shared = Shared::new(
            Store::default(),
            FileStore::default(),
            None,
            None,
            Limits::default(),
        );
        let lend = Lend::open(&key, &counts, crate::lend::Revoked::new(list.clone())).unwrap();
        let _ = shared.lend.set(lend);
        thread::spawn(move || serve_ws(listener, shared, Some(Arc::from("t"))));
        let ticket = ticket_of(addr, "t");
        let (_, sender, token) = borrow(addr, &ticket);
        let mut lent = connect_with_token(addr, "", &token);
        assert_eq!(ws_send(&mut lent, &sender, b"before"), OK);

        // The operator puts the ticket's nonce, from the contact link, on the list.
        std::fs::write(&list, format!("{}\n", &ticket[7 + 16..7 + 48])).unwrap();
        for refused_token in [&ticket, &token] {
            let mut request = format!("ws://{addr}").into_client_request().unwrap();
            request.headers_mut().insert(
                "authorization",
                format!("Bearer {refused_token}").parse().unwrap(),
            );
            assert!(tungstenite::connect(request).is_err());
        }
        // A connection already open goes on until it ends.
        assert_eq!(ws_send(&mut lent, &sender, b"after"), OK);
        let _ = std::fs::remove_file(&list);
        let _ = std::fs::remove_file(&counts);
    }

    #[test]
    fn a_browser_gives_a_lent_token_as_a_subprotocol() {
        let addr = start_ws_with(Some("t"), Some(RelayKey::generate()));
        let (recipient, sender, token) = borrow(addr, &ticket_of(addr, "t"));
        let hex: String = token.bytes().map(|b| format!("{b:02x}")).collect();
        let mut request = format!("ws://{addr}").into_client_request().unwrap();
        request.headers_mut().insert(
            "sec-websocket-protocol",
            format!("erevos, erevos-token.{hex}").parse().unwrap(),
        );
        let (mut ws, _) = tungstenite::connect(request).unwrap();
        assert_eq!(ws_send(&mut ws, &sender, b"hi"), OK);
        assert_eq!(ws_receive(&mut ws, &recipient).as_deref(), Some(&b"hi"[..]));
        assert!(refused(&mut ws, vec![LEND]));
    }

    #[test]
    fn a_relay_without_a_key_lends_nothing() {
        let addr = start_ws(Some("t"));
        let mut owner = connect_with_token(addr, "", "t");
        assert_eq!(ws_call(&mut owner, vec![LEND]), vec![NOT_FOUND]);
        // A ticket from another relay is a wrong token here.
        let other = start_ws_with(Some("o"), Some(RelayKey::generate()));
        let ticket = ticket_of(other, "o");
        let mut request = format!("ws://{addr}").into_client_request().unwrap();
        request
            .headers_mut()
            .insert("authorization", format!("Bearer {ticket}").parse().unwrap());
        assert!(tungstenite::connect(request).is_err());
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
        let near = start_ws_lan(Some("near"));

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
        let near = start_ws_lan(None);
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
        let store = Shared::new(
            Store::default(),
            FileStore::default(),
            None,
            turn,
            Limits::default(),
        );
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
        let near = start_ws_lan(Some("near"));
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
    fn a_message_a_phone_sent_for_later_goes_only_while_the_phone_has_its_line() {
        let list = std::env::temp_dir().join(format!("erevos-held-by-{}", std::process::id()));
        let (pixel, pixel_line) = crate::tokens::new_token("pixel");
        let (other, other_line) = crate::tokens::new_token("other");
        std::fs::write(&list, format!("{pixel_line}\n{other_line}\n")).unwrap();
        let addr = start_ws_tokens(Some("s3cret"), None, Limits::default(), Some(list.clone()));
        let mut relay = connect_with_token(addr, "", "s3cret");
        let (recipient, sender) = ws_create(&mut relay);
        let at = system_now() + 2;
        let mut ws = connect_with_token(addr, "", &pixel);
        let held = later_request(at, &[7; 16], &send_request(&sender, b"from the pixel"));
        assert_eq!(ws_call(&mut ws, held), vec![OK]);
        let mut theirs = connect_with_token(addr, "", &other);
        let held = later_request(at, &[8; 16], &send_request(&sender, b"from the other"));
        assert_eq!(ws_call(&mut theirs, held), vec![OK]);
        // The Pixel's line taken out before its time: its message is dropped, the other phone's goes.
        std::fs::write(&list, format!("{other_line}\n")).unwrap();
        let file = std::fs::File::options().write(true).open(&list).unwrap();
        file.set_modified(std::time::SystemTime::UNIX_EPOCH + Duration::from_secs(2_000_000))
            .unwrap();
        thread::sleep(Duration::from_millis(3500));
        assert_eq!(
            ws_receive(&mut relay, &recipient).as_deref(),
            Some(&b"from the other"[..])
        );
        assert_eq!(ws_receive(&mut relay, &recipient), None);
        assert_eq!(
            ws_call(&mut relay, unlater_request(&[7; 16])),
            vec![NOT_FOUND]
        );
        let _ = std::fs::remove_file(&list);
    }

    #[test]
    fn a_message_sent_for_later_is_dropped_before_its_time() {
        let mut ws = connect_with_token(start_ws(None), "", "");
        let (recipient, sender) = ws_create(&mut ws);
        // The clock counts whole seconds, so one second ahead may already be due a moment
        // later; two seconds ahead leaves at least one for taking it back.
        let request = later_request(system_now() + 2, &[3; 16], &send_request(&sender, b"never"));
        assert_eq!(ws_call(&mut ws, request), vec![OK]);
        assert_eq!(ws_call(&mut ws, unlater_request(&[3; 16])), vec![OK]);
        assert_eq!(ws_call(&mut ws, unlater_request(&[3; 16])), vec![NOT_FOUND]);
        thread::sleep(Duration::from_millis(3500));
        assert_eq!(ws_receive(&mut ws, &recipient), None);
    }

    #[test]
    fn a_forward_sent_for_later_reaches_the_other_relay_then() {
        let key = RelayKey::generate();
        let public = key.public();
        let far = start_ws_with(Some("far"), Some(key));
        let near = start_ws_lan(Some("near"));
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

    /// Whether the relay ended `s`: it reads as closed, or reset, rather than quiet.
    fn ended(s: &mut TcpStream) -> bool {
        s.set_read_timeout(Some(Duration::from_secs(10))).unwrap();
        let mut r = [0u8; 1];
        match s.read(&mut r) {
            Ok(n) => n == 0,
            Err(e) => !timed_out(&e),
        }
    }

    /// Whether a new connection to the TCP front end at `addr` is answered.
    fn answered(addr: SocketAddr) -> bool {
        let mut s = TcpStream::connect(addr).unwrap();
        s.write_all(&[KEY]).is_ok() && !ended(&mut s)
    }

    /// Whether `ok` comes true within a few seconds: a connection's place
    /// comes back once its thread has seen it closed.
    fn soon(mut ok: impl FnMut() -> bool) -> bool {
        (0..100).any(|_| {
            ok() || {
                thread::sleep(Duration::from_millis(50));
                false
            }
        })
    }

    #[test]
    fn past_the_cap_a_connection_is_closed_at_once_until_a_place_comes_back() {
        let addr = start_limited(Limits {
            connections: 2,
            ..Limits::default()
        });
        let mut first = TcpStream::connect(addr).unwrap();
        let mut second = TcpStream::connect(addr).unwrap();
        create(&mut first);
        create(&mut second);
        assert!(!answered(addr));
        drop(first);
        assert!(soon(|| answered(addr)));
        // The ones it took go on as before.
        create(&mut second);
    }

    #[test]
    fn the_cap_counts_both_front_ends_together() {
        let tcp = TcpListener::bind("127.0.0.1:0").unwrap();
        let ws = TcpListener::bind("127.0.0.1:0").unwrap();
        let (tcp_addr, ws_addr) = (tcp.local_addr().unwrap(), ws.local_addr().unwrap());
        let limits = Limits {
            connections: 1,
            ..Limits::default()
        };
        let shared = Shared::new(Store::default(), FileStore::default(), None, None, limits);
        let other = Arc::clone(&shared);
        thread::spawn(move || serve(tcp, shared));
        thread::spawn(move || serve_ws(ws, other, None));
        let mut s = TcpStream::connect(tcp_addr).unwrap();
        create(&mut s);
        assert!(tungstenite::connect(format!("ws://{ws_addr}")).is_err());
        drop(s);
        assert!(soon(
            || tungstenite::connect(format!("ws://{ws_addr}")).is_ok()
        ));
    }

    #[test]
    fn the_paths_that_need_no_token_have_fewer_places_than_the_rest() {
        let limits = Limits {
            tokenless: 1,
            ..Limits::default()
        };
        let addr = start_ws_limited(Some("t"), None, limits);
        let (mut open, _) = tungstenite::connect(format!("ws://{addr}{FILES_PATH}")).unwrap();
        // Another is refused, on either path, as busy.
        for path in [FILES_PATH, SEALED_PATH] {
            match tungstenite::connect(format!("ws://{addr}{path}")) {
                Err(tungstenite::Error::Http(response)) => {
                    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE)
                }
                other => panic!("expected a refusal, got {:?}", other.map(|_| ())),
            }
        }
        // Phones with the token still come in.
        let mut owner = connect_with_token(addr, "", "t");
        assert_eq!(ws_call(&mut owner, vec![KEY]), vec![NOT_FOUND]);
        assert_eq!(
            ws_call(&mut open, id_request(FILE_GET, &[0; 24])),
            vec![NOT_FOUND]
        );
        open.close(None).unwrap();
        drop(open);
        assert!(soon(|| tungstenite::connect(format!(
            "ws://{addr}{SEALED_PATH}"
        ))
        .is_ok()));
    }

    #[test]
    fn a_quiet_connection_is_closed_but_a_long_wait_is_not() {
        let quick = Limits {
            idle: Duration::from_millis(500),
            ..Limits::default()
        };
        let mut s = TcpStream::connect(start_limited(quick)).unwrap();
        let (recipient, _) = create(&mut s);
        // A wait longer than that is the relay's, not the phone's: it is answered.
        assert_eq!(wait(&mut s, &recipient, 2), vec![OK, 0]);
        // Quiet for longer: closed, cleanly.
        thread::sleep(Duration::from_millis(1500));
        let mut r = [0u8; 1];
        s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        assert_eq!(s.read(&mut r).unwrap(), 0);

        // A WebSocket hears why first.
        let addr = start_ws_limited(None, None, quick);
        let (mut ws, _) = tungstenite::connect(format!("ws://{addr}")).unwrap();
        let (recipient, _) = ws_create(&mut ws);
        let mut wait = vec![WAIT];
        wait.extend_from_slice(&recipient);
        wait.push(2);
        assert_eq!(ws_call(&mut ws, wait), vec![OK, 0]);
        match ws.read() {
            Ok(Message::Close(Some(frame))) => assert_eq!(frame.code, CloseCode::Away),
            other => panic!("expected a close frame, got {other:?}"),
        }
    }

    #[test]
    fn a_relay_with_all_its_queues_is_full_and_a_ticket_keeps_its_places() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Store::default().with_queue_limits(1, crate::queue::DEFAULT_QUEUE_TTL);
        let key = RelayKey::generate();
        let shared = Shared::new(store, FileStore::default(), None, None, Limits::default());
        let _ = shared.lend.set(Lend::new(&key));
        thread::spawn(move || serve_ws(listener, shared, Some(Arc::from("t"))));
        let mut owner = connect_with_token(addr, "", "t");
        let (mine, _) = ws_create(&mut owner);
        assert_eq!(ws_call(&mut owner, vec![CREATE]), vec![FULL]);
        let ticket = ticket_of(addr, "t");
        for _ in 0..=crate::lend::MAX_BORROWS {
            let r = ws_call(&mut connect_with_token(addr, "", &ticket), vec![BORROW]);
            assert_eq!(r, vec![FULL]);
        }
        assert_eq!(ws_call(&mut owner, id_request(DELETE, &mine)), vec![OK]);
        // None of the ticket's places went on those: it still gives them all.
        for _ in 0..crate::lend::MAX_BORROWS {
            let (recipient, _, token) = borrow(addr, &ticket);
            let mut lent = connect_with_token(addr, "", &token);
            assert_eq!(ws_call(&mut lent, id_request(DELETE, &recipient)), vec![OK]);
        }
        let r = ws_call(&mut connect_with_token(addr, "", &ticket), vec![BORROW]);
        assert_eq!(r, vec![FULL]);
        // And the relay has room again.
        ws_create(&mut owner);
    }

    #[test]
    fn the_sweep_takes_queues_nobody_uses() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        // Unused for no time at all is long enough here.
        let store = Store::default().with_queue_limits(10, 0);
        let shared = Shared::new(store, FileStore::default(), None, None, Limits::default());
        let swept = Arc::clone(&shared);
        thread::spawn(move || serve(listener, shared));
        let mut s = TcpStream::connect(addr).unwrap();
        let (_, sender) = create(&mut s);
        assert_eq!(send(&mut s, &sender, b"x"), OK);
        sweep(&swept);
        assert_eq!(send(&mut s, &sender, b"x"), NOT_FOUND);
    }

    #[test]
    fn a_relay_forwards_to_nothing_on_its_own_machine_unless_allowed() {
        let key = RelayKey::generate();
        let public = key.public();
        let far = start_ws_with(None, Some(key));
        let mut far_ws = connect_with_token(far, "", "");
        let (recipient, sender) = ws_create(&mut far_ws);
        let id = ws_call(&mut far_ws, put_request(b"chunk"))[1..].to_vec();
        let near = start_ws(Some("near"));
        let mut near_ws = connect_with_token(near, "", "near");
        let sealed = seal(&public, &sender, b"to 127.0.0.1").unwrap();

        // The far relay listens, but on 127.0.0.1, by number or by name: answered as
        // one that cannot be reached, and nothing gets there.
        for address in [
            format!("ws://{far}"),
            format!("ws://localhost:{}", far.port()),
        ] {
            let r = ws_call(&mut near_ws, forward_request(&address, &sealed));
            assert_eq!(r, vec![UNREACHABLE]);
            let r = ws_call(
                &mut near_ws,
                via_request(&address, &id_request(FILE_GET, &id)),
            );
            assert_eq!(r, vec![UNREACHABLE]);
        }
        let held = forward_request(&format!("ws://{far}"), &sealed);
        let r = ws_call(&mut near_ws, later_request(system_now(), &[8; 16], &held));
        assert_eq!(r, vec![OK]);
        thread::sleep(Duration::from_millis(1500));
        assert_eq!(ws_receive(&mut far_ws, &recipient), None);
        assert_eq!(
            chunk_of(&ws_call(&mut far_ws, id_request(FILE_GET, &id))),
            b"chunk"
        );

        // Allowed, the same forward goes.
        let mut lan = connect_with_token(start_ws_lan(Some("lan")), "", "lan");
        let r = ws_call(&mut lan, forward_request(&format!("ws://{far}"), &sealed));
        assert_eq!(r, vec![OK]);
        assert_eq!(
            ws_receive(&mut far_ws, &recipient).as_deref(),
            Some(&b"to 127.0.0.1"[..])
        );
    }

    #[test]
    fn a_handshake_that_trickles_in_is_cut_off() {
        let addr = start_ws_limited(
            None,
            None,
            Limits {
                handshake: Duration::from_millis(700),
                ..Limits::default()
            },
        );
        let mut s = TcpStream::connect(addr).unwrap();
        let mut writer = s.try_clone().unwrap();
        // A byte at a time, each well within the time a connection may be quiet.
        thread::spawn(move || {
            for byte in b"GET / HTTP/1.1\r\nHost: relay\r\nUpgrade: websocket\r\n" {
                thread::sleep(Duration::from_millis(100));
                if writer.write_all(&[*byte]).is_err() {
                    return;
                }
            }
        });
        let started = Instant::now();
        assert!(ended(&mut s));
        assert!(started.elapsed() < Duration::from_secs(3));
    }
}
