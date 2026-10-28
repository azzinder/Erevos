//! Web Push: telling a browser that a message waits, so a web app that is
//! closed (on an iPhone, always) can say so.
//!
//! A web app gives the relay a push address for one of its queues
//! (`PUSH_SET`), made by the browser for the relay's key (`PUSH_KEY`). When a
//! message comes into that queue, the relay pushes to that address (RFC
//! 8030), signed with its key (VAPID, RFC 8292). A web app that also gave its
//! browser's keys for the address gets a count in the push, encrypted for the
//! browser (RFC 8291): how many messages came since the queue was last
//! emptied, how many sends that did not say whether they are a message (see
//! `Mark` in `server.rs`), how many calls rang, and when it was sent. The
//! push is always the same size, so
//! the browser's push service (Apple's, Google's, Mozilla's) sees only that
//! something came, and when; without the keys the push is empty, as for the
//! web apps before.
//!
//! Only addresses of known push services are taken, and of those the
//! operator adds, so the relay cannot be made to send requests anywhere
//! else. At most one push per address goes out every `PUSH_GAP`, whichever
//! of its queues it is for: a browser has one address for all its spaces on
//! a relay, and two pushes closer than that would tell its push service it
//! has two. What comes within the gap goes in one more push once it is over,
//! the queues of one address taking turns, a call that rings first, and none
//! goes that would say nothing new. What comes while the web app takes its
//! messages on the screen waits a gap too, and pushes only if the app does
//! not take it in that time (see `Push::shown`). A push that does not get
//! through, or that the push service cannot take now (429 or 5xx), is tried
//! again a gap later, then twice as long after each try, `PUSH_TRIES` tries
//! in all at most. A push service that says the address is gone (404 or 410)
//! has it removed from every queue that has it, and a web app that gives it
//! again is told to make a new one: for a week, and in memory only, so not
//! after the relay restarts.
//!
//! The addresses are kept in one file, written whole on every change, and
//! the browsers' keys in another beside it (`<addresses>.keys`), so an older
//! relay, which knows only the first, still starts with them. The signing key
//! is a P-256 key in its own file, made on first start; with a new key the
//! push services refuse the pushes to the addresses made for the old one, so
//! a web app gets none until it is next opened, when it makes a new address.

use std::collections::{HashMap, VecDeque};
use std::fs;
use std::io::{self, Read, Write};
use std::net::{SocketAddr, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use aes_gcm::aead::{AeadInPlace, KeyInit};
use aes_gcm::{Aes128Gcm, Nonce};
use hkdf::Hkdf;
use p256::ecdsa::signature::Signer;
use p256::ecdsa::{Signature, SigningKey};
use p256::elliptic_curve::sec1::ToEncodedPoint;
use p256::{PublicKey, SecretKey};
use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::connect;
use crate::journal;
use crate::lock::lock;
use crate::queue::QueueId;

/// What the push locks are called if one is poisoned (see `lock.rs`).
const PUSH_LOCK: &str = "push lock";

/// The push services whose addresses are taken.
pub const PUSH_SERVICES: &[&str] = &[
    "https://web.push.apple.com/",
    "https://fcm.googleapis.com/",
    "https://updates.push.services.mozilla.com/",
    "https://wns2-",
];
/// Longest push address taken.
pub const MAX_ENDPOINT: usize = 1024;
/// Shortest time between two pushes to one address.
pub const PUSH_GAP: Duration = Duration::from_secs(15);
/// How many times a push that does not get through is tried, at most.
const PUSH_TRIES: u32 = 5;
/// Longest wait before a push that did not get through is tried again.
const MAX_RETRY: Duration = Duration::from_secs(10 * 60);
/// How long an address its push service said is gone is remembered, and
/// how many at most.
const GONE_FOR: Duration = Duration::from_secs(7 * 24 * 60 * 60);
const MAX_GONE: usize = 1024;
/// At most one log line in this time for each push service and status.
const LOG_EVERY: Duration = Duration::from_secs(60 * 60);
/// How long a push service keeps a push for a browser that is offline.
const PUSH_TTL: u32 = 24 * 60 * 60;
const TIMEOUT: Duration = Duration::from_secs(15);
/// The browser's key for a push address (an uncompressed P-256 point) and
/// its authentication secret, as `PushSubscription.getKey` gives them.
pub const P256DH_LEN: usize = 65;
pub const AUTH_LEN: usize = 16;
/// What an encrypted push says, before encryption: a version, flags, the
/// queue's stream, its round, the round's counts and when it was sent (see
/// `payload`).
pub const PAYLOAD_LEN: usize = 30;
const PAYLOAD_VERSION: u8 = 1;
/// The flag that says the time the push was sent follows the counts. A web
/// app from before reads only pushes of 26 bytes, with no flags.
const SENT_AT: u8 = 1;
/// The record size an encrypted push names (RFC 8188): more than it holds.
const RECORD_SIZE: u32 = 4096;

/// Why a push address was not taken.
#[derive(Debug, PartialEq, Eq)]
pub enum SetError {
    /// Not an address of a known push service.
    Refused,
    /// The change could not be written.
    Storage,
    /// Its push service said this address is gone: the browser must make a
    /// new one.
    Gone,
}

/// A browser's keys for its push address, which the pushes are encrypted for.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Keys {
    pub p256dh: [u8; P256DH_LEN],
    pub auth: [u8; AUTH_LEN],
}

impl Keys {
    /// The keys, if `p256dh` is a point on the curve and `auth` 16 bytes.
    pub fn new(p256dh: &[u8], auth: &[u8]) -> Option<Keys> {
        let p256dh: [u8; P256DH_LEN] = p256dh.try_into().ok()?;
        if p256dh[0] != 4 || PublicKey::from_sec1_bytes(&p256dh).is_err() {
            return None;
        }
        Some(Keys {
            p256dh,
            auth: auth.try_into().ok()?,
        })
    }
}

/// Where a queue's pushes go.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Address {
    endpoint: String,
    keys: Option<Keys>,
}

/// What came into a queue, as its sender said.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Came {
    /// A message someone reads.
    Message,
    /// A call that rings.
    Ring,
    /// It did not say: perhaps a message.
    Unknown,
}

/// What came into a queue since it was last emptied. A new round starts with
/// a new random number, so a web app that missed pushes, or the relay
/// restarting, never makes it count a message twice.
#[derive(Clone, Copy, Debug)]
struct Tally {
    round: u32,
    /// Messages.
    count: u32,
    /// Sends that did not say what they carry.
    unmarked: u32,
    /// Calls that rang.
    rings: u32,
    /// Something came that no push has said yet.
    fresh: bool,
    /// The queue was emptied since: the round ends with the push that says
    /// what is fresh.
    drained: bool,
    /// How many pushes in a row did not get through with what is fresh.
    tries: u32,
    /// A push that says it is on its way: emptied meanwhile out of sight, the
    /// round ends with it, or with the one that tries it again.
    sending: bool,
}

/// The queues of an address that wait for its gap to end, in turn.
struct Waiting {
    /// When it ends.
    at: Instant,
    /// When it was to end first: what comes while the web app takes its
    /// messages on the screen moves `at`, a gap past this at most, so a queue
    /// the app there never takes (another space's) still pushes.
    first: Instant,
    queues: VecDeque<QueueId>,
    /// Until when each queue that got something on the screen waits for the
    /// app there to take it.
    held: HashMap<QueueId, Instant>,
}

/// What came of a push.
enum Pushed {
    /// None went: nothing new to say, or no address.
    Nothing,
    /// It went to this address, or its push service will never take it.
    Went(String),
    /// It did not get through to this address, so many times in a row now.
    Failed(String, u32),
}

pub struct Push {
    key: SigningKey,
    subject: String,
    allowed: Vec<String>,
    file: Option<PathBuf>,
    gap: Duration,
    endpoints: Mutex<HashMap<QueueId, Address>>,
    tallies: Mutex<HashMap<QueueId, Tally>>,
    /// Taken while the addresses are written, so the writes go one at a
    /// time and no send waits for them. Taken before `endpoints`.
    writing: Mutex<()>,
    /// When the web app of each address last took messages on the screen.
    shown: Mutex<HashMap<String, Instant>>,
    /// When each queue was last taken on the screen, within the gap.
    shown_queues: Mutex<HashMap<QueueId, Instant>>,
    /// The addresses push services said are gone, and when.
    gone: Mutex<HashMap<String, Instant>>,
    /// When each push service and status was last said in the log.
    logged: Mutex<HashMap<(String, String), Instant>>,
    queue: Mutex<Sender<(QueueId, Came)>>,
    /// The worker is gone, which the log said.
    stopped: AtomicBool,
}

impl Push {
    /// Push with `key`, signing as `subject` (a `mailto:` or `https:`
    /// address the push services may write to), taking addresses that start
    /// with one of `allowed`, kept in `file` if given.
    pub fn new(
        key: SigningKey,
        subject: String,
        allowed: Vec<String>,
        file: Option<PathBuf>,
    ) -> io::Result<Arc<Push>> {
        Push::with_gap(key, subject, allowed, file, PUSH_GAP)
    }

    pub(crate) fn with_gap(
        key: SigningKey,
        subject: String,
        allowed: Vec<String>,
        file: Option<PathBuf>,
        gap: Duration,
    ) -> io::Result<Arc<Push>> {
        let endpoints = match &file {
            Some(path) => load(path)?,
            None => HashMap::new(),
        };
        let (tx, rx) = mpsc::channel();
        let push = Arc::new(Push {
            key,
            subject,
            allowed,
            file,
            gap,
            endpoints: Mutex::new(endpoints),
            tallies: Mutex::new(HashMap::new()),
            writing: Mutex::new(()),
            shown: Mutex::new(HashMap::new()),
            shown_queues: Mutex::new(HashMap::new()),
            gone: Mutex::new(HashMap::new()),
            logged: Mutex::new(HashMap::new()),
            queue: Mutex::new(tx),
            stopped: AtomicBool::new(false),
        });
        let worker = Arc::clone(&push);
        thread::spawn(move || worker.run(rx));
        Ok(push)
    }

    /// The public key browsers subscribe with: the uncompressed P-256 point.
    pub fn public_key(&self) -> Vec<u8> {
        self.key
            .verifying_key()
            .to_encoded_point(false)
            .as_bytes()
            .to_vec()
    }

    /// How many queues have a push address.
    pub fn len(&self) -> usize {
        self.endpoints().len()
    }

    /// How many push addresses the queues have: a browser gives one to all
    /// the queues of its spaces on the relay.
    pub fn addresses(&self) -> usize {
        let endpoints = self.endpoints();
        let distinct: std::collections::HashSet<&str> =
            endpoints.values().map(|a| a.endpoint.as_str()).collect();
        distinct.len()
    }

    /// Sets the push address for a queue, with the browser's keys if it gave
    /// them, or removes it when `endpoint` is empty. One the queue has already
    /// is not written again: the web app gives it for each of a space's queues,
    /// a queue for each contact among them, every time it starts.
    pub fn set(&self, queue: &QueueId, endpoint: &str, keys: Option<Keys>) -> Result<(), SetError> {
        if !endpoint.is_empty() && !self.takes(endpoint) {
            return Err(SetError::Refused);
        }
        if !endpoint.is_empty() && self.is_gone(endpoint) {
            return Err(SetError::Gone);
        }
        let same = |endpoints: &HashMap<QueueId, Address>| match endpoints.get(queue) {
            None => endpoint.is_empty(),
            Some(address) => address.endpoint == endpoint && address.keys == keys,
        };
        if same(&self.endpoints()) {
            return Ok(());
        }
        // Written first, and only then used: a change that cannot be
        // written is not made.
        let _writing = lock(&self.writing, PUSH_LOCK);
        let mut changed = self.endpoints().clone();
        if same(&changed) {
            return Ok(());
        }
        if endpoint.is_empty() {
            changed.remove(queue);
        } else {
            changed.insert(
                *queue,
                Address {
                    endpoint: endpoint.to_string(),
                    keys,
                },
            );
        }
        if self.save(&changed).is_err() {
            return Err(SetError::Storage);
        }
        *self.endpoints() = changed;
        Ok(())
    }

    /// Forgets the queue's push address, if any (the queue was deleted).
    pub fn forget(&self, queue: &QueueId) {
        {
            let _writing = lock(&self.writing, PUSH_LOCK);
            let kept = {
                let mut endpoints = self.endpoints();
                endpoints.remove(queue).map(|_| endpoints.clone())
            };
            if let Some(kept) = kept {
                let _ = self.save(&kept);
            }
        }
        self.tallies().remove(queue);
    }

    /// Something came into `queue`: push, if it has an address.
    pub fn arrived(&self, queue: &QueueId, came: Came) {
        if !self.endpoints().contains_key(queue) {
            return;
        }
        {
            let mut tallies = self.tallies();
            let tally = tallies.entry(*queue).or_insert_with(|| Tally {
                round: rand::random(),
                count: 0,
                unmarked: 0,
                rings: 0,
                fresh: false,
                drained: false,
                tries: 0,
                sending: false,
            });
            let counted = match came {
                Came::Message => &mut tally.count,
                Came::Ring => &mut tally.rings,
                Came::Unknown => &mut tally.unmarked,
            };
            *counted = counted.saturating_add(1);
            // Came before the push that ends the round went: it goes on, and
            // that push says this too.
            tally.fresh = true;
            tally.drained = false;
        }
        let sent = lock(&self.queue, PUSH_LOCK).send((*queue, came));
        if sent.is_err() && !self.stopped.swap(true, Ordering::Relaxed) {
            eprintln!("erevos-relay: the pushes stopped, no web app is told of a message until the relay starts again");
        }
    }

    /// The queue's recipient took from it, `on` the screen or not. For a gap
    /// after the web app of an address took on the screen, what comes into
    /// any of its queues waits to push, so the app takes it there first, and
    /// its `RECEIVE` that finds the queue empty drops the push (see
    /// `drained`). Waits say neither: the app on the screen waits too.
    pub fn shown(&self, queue: &QueueId, on: bool) {
        let Some(endpoint) = self.endpoints().get(queue).map(|a| a.endpoint.clone()) else {
            return;
        };
        {
            let mut queues = lock(&self.shown_queues, PUSH_LOCK);
            if on {
                queues.retain(|_, at| at.elapsed() < self.gap);
                queues.insert(*queue, Instant::now());
            } else {
                queues.remove(queue);
            }
        }
        let mut shown = lock(&self.shown, PUSH_LOCK);
        if on {
            shown.retain(|_, at| at.elapsed() < self.gap);
            shown.insert(endpoint, Instant::now());
        } else {
            shown.remove(&endpoint);
        }
    }

    /// The queue's recipient found it empty: the web app has every message,
    /// so the count starts again. `shown`: it took them on the screen, so
    /// nothing is left to say. Else a push still waiting for its gap goes all
    /// the same, with what came since the last one, as does one on its way
    /// that does not get through: the web app may have taken the messages out
    /// of sight.
    pub fn drained(&self, queue: &QueueId, shown: bool) {
        let mut tallies = self.tallies();
        match tallies.get_mut(queue) {
            Some(tally) if (tally.fresh || tally.sending) && !shown => tally.drained = true,
            _ => {
                tallies.remove(queue);
            }
        }
    }

    fn endpoints(&self) -> std::sync::MutexGuard<'_, HashMap<QueueId, Address>> {
        lock(&self.endpoints, PUSH_LOCK)
    }

    fn tallies(&self) -> std::sync::MutexGuard<'_, HashMap<QueueId, Tally>> {
        lock(&self.tallies, PUSH_LOCK)
    }

    /// Whether the web app of `endpoint` took on the screen within the gap.
    fn on_screen(&self, endpoint: &str) -> bool {
        lock(&self.shown, PUSH_LOCK)
            .get(endpoint)
            .is_some_and(|at| at.elapsed() < self.gap)
    }

    fn is_gone(&self, endpoint: &str) -> bool {
        lock(&self.gone, PUSH_LOCK)
            .get(endpoint)
            .is_some_and(|at| at.elapsed() < GONE_FOR)
    }

    /// Its push service said `endpoint` is gone: every queue that has it
    /// loses it, with its count, written once, and it is remembered, so a
    /// web app that gives it again is told to make a new one.
    fn went_gone(&self, endpoint: &str) {
        {
            let mut gone = lock(&self.gone, PUSH_LOCK);
            gone.retain(|_, at| at.elapsed() < GONE_FOR);
            if gone.len() >= MAX_GONE && !gone.contains_key(endpoint) {
                let oldest = gone
                    .iter()
                    .min_by_key(|(_, at)| **at)
                    .map(|(e, _)| e.clone());
                if let Some(oldest) = oldest {
                    gone.remove(&oldest);
                }
            }
            gone.insert(endpoint.to_string(), Instant::now());
        }
        let _writing = lock(&self.writing, PUSH_LOCK);
        let kept = {
            let mut endpoints = self.endpoints();
            let queues: Vec<QueueId> = endpoints
                .iter()
                .filter(|(_, address)| address.endpoint == endpoint)
                .map(|(queue, _)| *queue)
                .collect();
            if queues.is_empty() {
                return;
            }
            let mut tallies = self.tallies();
            for queue in &queues {
                endpoints.remove(queue);
                tallies.remove(queue);
            }
            endpoints.clone()
        };
        let _ = self.save(&kept);
    }

    /// A push that did not get through gives back what it was to say, so
    /// the next one says it, with what came since, unless the queue was
    /// emptied on the screen meanwhile (or lost its address): the web app has
    /// the messages.
    fn give_back(&self, queue: &QueueId, said: Tally, tries: u32) {
        if let Some(tally) = self
            .tallies()
            .get_mut(queue)
            .filter(|t| t.round == said.round)
        {
            tally.fresh = true;
            tally.tries = tries;
            tally.sending = false;
        }
    }

    /// Whether to say something of `host` and `what` in the log: once an
    /// hour at most, so a push service that refuses every push does not
    /// fill it.
    fn tells(&self, host: &str, what: &str) -> bool {
        let mut logged = lock(&self.logged, PUSH_LOCK);
        logged.retain(|_, at| at.elapsed() < LOG_EVERY);
        let key = (host.to_string(), what.to_string());
        if logged.contains_key(&key) {
            return false;
        }
        logged.insert(key, Instant::now());
        true
    }

    fn takes(&self, endpoint: &str) -> bool {
        endpoint.len() <= MAX_ENDPOINT
            && endpoint.is_ascii()
            && !endpoint.contains(char::is_whitespace)
            && self.allowed.iter().any(|prefix| {
                endpoint.starts_with(prefix.as_str())
                    && (prefix != "https://wns2-"
                        || host(endpoint).is_some_and(|h| h.ends_with(".notify.windows.com")))
            })
    }

    fn save(&self, endpoints: &HashMap<QueueId, Address>) -> io::Result<()> {
        let Some(path) = &self.file else {
            return Ok(());
        };
        let mut addresses = Vec::new();
        let mut keys = Vec::new();
        for (queue, address) in endpoints {
            addresses.extend_from_slice(queue);
            put_endpoint(&mut addresses, &address.endpoint);
            if let Some(k) = &address.keys {
                keys.extend_from_slice(queue);
                keys.extend_from_slice(&k.p256dh);
                keys.extend_from_slice(&k.auth);
                put_endpoint(&mut keys, &address.endpoint);
            }
        }
        // The keys first: keys for an address the other file no longer has
        // are not used (see `load`).
        journal::write_whole(&keys_path(path), &keys)?;
        journal::write_whole(path, &addresses)
    }

    fn run(&self, rx: Receiver<(QueueId, Came)>) {
        // When each address was last pushed to.
        let mut last: HashMap<String, Instant> = HashMap::new();
        // The queues that wait for an address's gap to end.
        let mut later: HashMap<String, Waiting> = HashMap::new();
        // The queues whose push did not get through, and when to try again.
        let mut again: HashMap<QueueId, Instant> = HashMap::new();
        loop {
            let next = later
                .values()
                .map(|waiting| waiting.at)
                .chain(again.values().copied())
                .min();
            let got = match next {
                Some(at) => rx.recv_timeout(at.saturating_duration_since(Instant::now())),
                None => rx.recv().map_err(|_| RecvTimeoutError::Disconnected),
            };
            match got {
                Ok((queue, came)) => {
                    self.offer(queue, came == Came::Ring, &mut last, &mut later, &mut again)
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return,
            }
            let now = Instant::now();
            let tried: Vec<QueueId> = again
                .iter()
                .filter(|(_, at)| **at <= now)
                .map(|(queue, _)| *queue)
                .collect();
            for queue in tried {
                again.remove(&queue);
                self.offer(queue, false, &mut last, &mut later, &mut again);
            }
            let due: Vec<String> = later
                .iter()
                .filter(|(_, waiting)| waiting.at <= now)
                .map(|(endpoint, _)| endpoint.clone())
                .collect();
            for endpoint in due {
                let Some(mut waiting) = later.remove(&endpoint) else {
                    continue;
                };
                // A queue the app takes on the screen waits on while what came
                // there has not had its gap: the app takes it there. The
                // others push in turn.
                let mut kept = VecDeque::new();
                let mut pushed = false;
                while let Some(queue) = waiting.queues.pop_front() {
                    let taken_there = lock(&self.shown_queues, PUSH_LOCK)
                        .get(&queue)
                        .is_some_and(|at| at.elapsed() < self.gap);
                    if taken_there && waiting.held.get(&queue).is_some_and(|until| *until > now) {
                        kept.push_back(queue);
                        continue;
                    }
                    waiting.held.remove(&queue);
                    if self.push_one(&queue, &mut last, &mut again) {
                        pushed = true;
                        break;
                    }
                }
                kept.extend(waiting.queues.drain(..));
                if !kept.is_empty() {
                    let at = if pushed {
                        Instant::now() + self.gap
                    } else {
                        kept.iter()
                            .filter_map(|q| waiting.held.get(q))
                            .copied()
                            .min()
                            .unwrap_or(now)
                    };
                    waiting.held.retain(|q, _| kept.contains(q));
                    later.insert(
                        endpoint,
                        Waiting {
                            at,
                            first: at,
                            queues: kept,
                            held: waiting.held,
                        },
                    );
                }
            }
            last.retain(|_, at| at.elapsed() < self.gap);
        }
    }

    /// Something came into `queue`: pushes now, or once its address's gap
    /// is over, or the web app had a gap to take it on the screen. A call
    /// that `rang` goes first of the queues waiting for the address.
    fn offer(
        &self,
        queue: QueueId,
        rang: bool,
        last: &mut HashMap<String, Instant>,
        later: &mut HashMap<String, Waiting>,
        again: &mut HashMap<QueueId, Instant>,
    ) {
        let endpoint = self.endpoints().get(&queue).map(|a| a.endpoint.clone());
        let Some(endpoint) = endpoint else {
            // No address now: `push_now` lets go of the tally.
            self.push_now(&queue);
            return;
        };
        let now = Instant::now();
        let on_screen = self.on_screen(&endpoint);
        let until = if on_screen {
            Some(now + self.gap)
        } else {
            last.get(&endpoint)
                .map(|at| *at + self.gap)
                .filter(|until| *until > now)
        };
        if let Some(waiting) = later.get_mut(&endpoint) {
            // On the screen, what comes now has a gap of its own to be taken
            // there too: what waited already waits longer, a gap more at most,
            // and this queue until its gap is over, if the app takes it there.
            if on_screen {
                waiting.held.insert(queue, now + self.gap);
                waiting.at = waiting
                    .at
                    .max((now + self.gap).min(waiting.first + self.gap));
            }
            if rang {
                waiting.queues.retain(|q| *q != queue);
                waiting.queues.push_front(queue);
            } else if !waiting.queues.contains(&queue) {
                waiting.queues.push_back(queue);
            }
        } else if let Some(until) = until {
            later.insert(
                endpoint,
                Waiting {
                    at: until,
                    first: until,
                    queues: VecDeque::from([queue]),
                    held: if on_screen {
                        HashMap::from([(queue, until)])
                    } else {
                        HashMap::new()
                    },
                },
            );
        } else {
            self.push_one(&queue, last, again);
        }
    }

    /// Pushes for `queue` now, if there is something new to say: whether a
    /// push went, or was tried. One that did not get through is tried again
    /// a gap later, twice as long for each try before it.
    fn push_one(
        &self,
        queue: &QueueId,
        last: &mut HashMap<String, Instant>,
        again: &mut HashMap<QueueId, Instant>,
    ) -> bool {
        let (endpoint, tries) = match self.push_now(queue) {
            Pushed::Nothing => return false,
            Pushed::Went(endpoint) => (endpoint, 0),
            Pushed::Failed(endpoint, tries) => (endpoint, tries),
        };
        let now = Instant::now();
        if tries >= PUSH_TRIES {
            let host = host(&endpoint).unwrap_or_default();
            if self.tells(host, "given up") {
                eprintln!("erevos-relay: a push to {host} did not get through in {PUSH_TRIES} tries, it waits for the next message");
            }
        } else if tries > 0 {
            let wait = self.gap.saturating_mul(1 << (tries - 1)).min(MAX_RETRY);
            again.insert(*queue, now + wait);
        }
        last.insert(endpoint, now);
        true
    }

    /// Pushes what came into `queue`, unless an earlier push said it all.
    /// One that does not get through gives it back (see `give_back`).
    fn push_now(&self, queue: &QueueId) -> Pushed {
        let address = {
            let endpoints = self.endpoints();
            match endpoints.get(queue) {
                Some(address) => address.clone(),
                None => {
                    // Removed, or gone: no push will say what came. Under the
                    // lock, so an address set again starts a new round.
                    self.tallies().remove(queue);
                    return Pushed::Nothing;
                }
            }
        };
        let tally = {
            let mut tallies = self.tallies();
            let Some(tally) = tallies.get_mut(queue).filter(|t| t.fresh) else {
                return Pushed::Nothing;
            };
            let said = *tally;
            tally.fresh = false;
            tally.tries = 0;
            tally.sending = true;
            said
        };
        let body = address
            .keys
            .as_ref()
            .and_then(|keys| encrypt(keys, &payload(queue, tally, unix_now())));
        // The service's name only: the whole address lets anyone push.
        let host = host(&address.endpoint).unwrap_or_default();
        let failed = match self.send(&address.endpoint, body.as_deref()) {
            Ok(200..=299) => false,
            Ok(status @ (404 | 410)) => {
                if self.tells(host, &status.to_string()) {
                    eprintln!("erevos-relay: {host} says a push address is gone ({status}), its queues push no more");
                }
                self.went_gone(&address.endpoint);
                false
            }
            Ok(status @ (429 | 500..=599)) => {
                if self.tells(host, &status.to_string()) {
                    eprintln!("erevos-relay: {host} could not take a push now ({status}), it is tried again");
                }
                true
            }
            Ok(status) => {
                if self.tells(host, &status.to_string()) {
                    eprintln!("erevos-relay: {host} refused a push ({status})");
                }
                false
            }
            Err(e) => {
                if self.tells(host, &format!("{:?}", e.kind())) {
                    eprintln!("erevos-relay: a push to {host} could not be sent: {e}");
                }
                true
            }
        };
        if !failed {
            // Emptied before it went or while it was on its way, with
            // nothing new since: it said the round's last.
            let mut tallies = self.tallies();
            if let Some(going) = tallies.get_mut(queue).filter(|t| t.round == tally.round) {
                if going.drained && !going.fresh {
                    tallies.remove(queue);
                } else {
                    going.sending = false;
                }
            }
            return Pushed::Went(address.endpoint);
        }
        let tries = tally.tries + 1;
        // Given up: the next message tries again from the start.
        self.give_back(queue, tally, if tries < PUSH_TRIES { tries } else { 0 });
        Pushed::Failed(address.endpoint, tries)
    }

    /// The `Authorization` header for a push to `audience` (the push
    /// service's origin): a VAPID JWT signed with the relay's key.
    pub fn authorization(&self, audience: &str, now: u64) -> String {
        let header = b64url(br#"{"typ":"JWT","alg":"ES256"}"#);
        let claims = format!(
            r#"{{"aud":"{}","exp":{},"sub":"{}"}}"#,
            audience,
            now + 12 * 60 * 60,
            self.subject
        );
        let signed = format!("{header}.{}", b64url(claims.as_bytes()));
        let signature: Signature = self.key.sign(signed.as_bytes());
        format!(
            "vapid t={signed}.{}, k={}",
            b64url(&signature.to_bytes()),
            b64url(&self.public_key())
        )
    }

    /// Sends a push to `endpoint`, empty or with an encrypted `body`, and
    /// returns the HTTP status. No `Topic`: one per queue would tell the push
    /// service the queues of a browser apart (its spaces), and one per
    /// browser would let a queue's push replace another's.
    fn send(&self, endpoint: &str, body: Option<&[u8]>) -> io::Result<u16> {
        let (tls, rest) = if let Some(rest) = endpoint.strip_prefix("https://") {
            (true, rest)
        } else if let Some(rest) = endpoint.strip_prefix("http://") {
            (false, rest)
        } else {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "not http"));
        };
        let (authority, path) = rest.split_at(rest.find('/').unwrap_or(rest.len()));
        let path = if path.is_empty() { "/" } else { path };
        let host = authority.split(':').next().unwrap_or(authority);
        let port = match authority.rsplit_once(':') {
            Some((_, port)) => port
                .parse::<u16>()
                .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "bad port"))?,
            None if tls => 443,
            None => 80,
        };
        let audience = format!("{}://{authority}", if tls { "https" } else { "http" });
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |d| d.as_secs());
        let content = match body {
            Some(body) => format!(
                "Content-Encoding: aes128gcm\r\nContent-Type: application/octet-stream\r\nContent-Length: {}\r\n",
                body.len()
            ),
            None => "Content-Length: 0\r\n".to_string(),
        };
        let mut request = format!(
            "POST {path} HTTP/1.1\r\nHost: {authority}\r\nAuthorization: {}\r\nTTL: {PUSH_TTL}\r\nUrgency: high\r\n{content}Connection: close\r\n\r\n",
            self.authorization(&audience, now)
        )
        .into_bytes();
        request.extend_from_slice(body.unwrap_or_default());
        let addresses = resolve(host, port)?;
        let tcp = connect::to_any(&addresses, TIMEOUT)?;
        tcp.set_read_timeout(Some(TIMEOUT))?;
        tcp.set_write_timeout(Some(TIMEOUT))?;
        let mut reply = Vec::new();
        if tls {
            let name = rustls::pki_types::ServerName::try_from(host.to_string())
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidInput, e))?;
            let connection =
                rustls::ClientConnection::new(tls_config(), name).map_err(io::Error::other)?;
            let mut stream = rustls::StreamOwned::new(connection, tcp);
            stream.write_all(&request)?;
            read_status(&mut stream, &mut reply)?;
        } else {
            let mut stream = tcp;
            stream.write_all(&request)?;
            read_status(&mut stream, &mut reply)?;
        }
        let line = String::from_utf8_lossy(&reply);
        line.split_whitespace()
            .nth(1)
            .and_then(|code| code.parse().ok())
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "no HTTP status"))
    }
}

/// Which queue a push is for, to the web app, which may have several on one
/// relay: not the queue's id, which the browser has no use for.
pub fn stream(queue: &QueueId) -> [u8; 8] {
    let mut hash = Sha256::new();
    hash.update(b"erevos push stream");
    hash.update(queue);
    hash.finalize()[..8].try_into().expect("8 bytes")
}

/// What an encrypted push says: the version, the flags, the queue's stream,
/// the round, and since the queue was last emptied, how many messages came,
/// how many sends that did not say what they carry, and how many calls rang;
/// then when it was `sent`, in seconds since 1970. Totals, not what is new: a
/// web app that missed a push loses nothing, as the next one says all it did,
/// and one that gets a push twice counts nothing twice. The time tells a push
/// the push service held back (the phone was offline) from a new one: of a
/// round it had no push of before, one sent before the app was last opened
/// counts nothing (pwa/sw.js).
fn payload(queue: &QueueId, tally: Tally, sent: u32) -> [u8; PAYLOAD_LEN] {
    let mut out = [0u8; PAYLOAD_LEN];
    out[0] = PAYLOAD_VERSION;
    out[1] = SENT_AT;
    out[2..10].copy_from_slice(&stream(queue));
    out[10..14].copy_from_slice(&tally.round.to_be_bytes());
    out[14..18].copy_from_slice(&tally.count.to_be_bytes());
    out[18..22].copy_from_slice(&tally.unmarked.to_be_bytes());
    out[22..26].copy_from_slice(&tally.rings.to_be_bytes());
    out[26..30].copy_from_slice(&sent.to_be_bytes());
    out
}

/// Seconds since 1970, as a push says them; 0 before 1970, the last second
/// that fits after 2106.
fn unix_now() -> u32 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| u32::try_from(d.as_secs()).unwrap_or(u32::MAX))
}

/// `plaintext` encrypted for the browser with `keys` (RFC 8291, one
/// `aes128gcm` record, RFC 8188), with a new key and salt of the relay's own.
fn encrypt(keys: &Keys, plaintext: &[u8]) -> Option<Vec<u8>> {
    let secret = SecretKey::random(&mut rand::rngs::OsRng);
    let mut salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    encrypt_with(keys, &secret, &salt, plaintext)
}

fn encrypt_with(
    keys: &Keys,
    secret: &SecretKey,
    salt: &[u8; 16],
    plaintext: &[u8],
) -> Option<Vec<u8>> {
    let browser = PublicKey::from_sec1_bytes(&keys.p256dh).ok()?;
    let own = secret.public_key().to_encoded_point(false);
    let shared = p256::ecdh::diffie_hellman(secret.to_nonzero_scalar(), browser.as_affine());
    let mut info = Vec::with_capacity(14 + 2 * P256DH_LEN);
    info.extend_from_slice(b"WebPush: info\0");
    info.extend_from_slice(&keys.p256dh);
    info.extend_from_slice(own.as_bytes());
    let mut ikm = [0u8; 32];
    Hkdf::<Sha256>::new(Some(&keys.auth), shared.raw_secret_bytes())
        .expand(&info, &mut ikm)
        .ok()?;
    let hkdf = Hkdf::<Sha256>::new(Some(salt), &ikm);
    let mut cek = [0u8; 16];
    let mut nonce = [0u8; 12];
    hkdf.expand(b"Content-Encoding: aes128gcm\0", &mut cek)
        .ok()?;
    hkdf.expand(b"Content-Encoding: nonce\0", &mut nonce).ok()?;
    let mut record = plaintext.to_vec();
    // The last record's delimiter, then no padding.
    record.push(2);
    let tag = Aes128Gcm::new(&cek.into())
        .encrypt_in_place_detached(Nonce::from_slice(&nonce), b"", &mut record)
        .ok()?;
    let mut body = Vec::with_capacity(16 + 4 + 1 + P256DH_LEN + record.len() + tag.len());
    body.extend_from_slice(salt);
    body.extend_from_slice(&RECORD_SIZE.to_be_bytes());
    body.push(P256DH_LEN as u8);
    body.extend_from_slice(own.as_bytes());
    body.extend_from_slice(&record);
    body.extend_from_slice(&tag);
    Some(body)
}

/// The addresses of `host`, looked up on a thread of its own, so a resolver
/// that does not answer holds the pushes up for `TIMEOUT` at most.
fn resolve(host: &str, port: u16) -> io::Result<Vec<SocketAddr>> {
    let (tx, rx) = mpsc::channel();
    let name = host.to_string();
    thread::spawn(move || {
        let _ = tx.send(
            (name.as_str(), port)
                .to_socket_addrs()
                .map(|addresses| addresses.collect()),
        );
    });
    rx.recv_timeout(TIMEOUT).unwrap_or_else(|_| {
        Err(io::Error::new(
            io::ErrorKind::TimedOut,
            "the push service's name was not found in time",
        ))
    })
}

/// Whether `prefix` is an `https:` origin and the `/` after it, as the
/// operator may add a push service's addresses (see `main.rs`).
pub fn is_service(prefix: &str) -> bool {
    let Some(authority) = prefix
        .strip_prefix("https://")
        .and_then(|rest| rest.strip_suffix('/'))
    else {
        return false;
    };
    let (name, port) = match authority.rsplit_once(':') {
        Some((name, port)) => (name, Some(port)),
        None => (authority, None),
    };
    !name.is_empty()
        && name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.')
        && port.is_none_or(|port| port.parse::<u16>().is_ok_and(|port| port > 0))
}

/// Reads up to the end of the status line.
fn read_status(stream: &mut impl Read, reply: &mut Vec<u8>) -> io::Result<()> {
    let mut byte = [0u8; 1];
    while reply.len() < 256 && !reply.ends_with(b"\r\n") {
        if stream.read(&mut byte)? == 0 {
            break;
        }
        reply.push(byte[0]);
    }
    Ok(())
}

pub(crate) fn tls_config() -> Arc<rustls::ClientConfig> {
    static CONFIG: std::sync::OnceLock<Arc<rustls::ClientConfig>> = std::sync::OnceLock::new();
    Arc::clone(CONFIG.get_or_init(|| {
        let roots = rustls::RootCertStore {
            roots: webpki_roots::TLS_SERVER_ROOTS.to_vec(),
        };
        Arc::new(
            rustls::ClientConfig::builder_with_provider(Arc::new(
                rustls::crypto::ring::default_provider(),
            ))
            .with_safe_default_protocol_versions()
            .expect("TLS versions")
            .with_root_certificates(roots)
            .with_no_client_auth(),
        )
    }))
}

fn host(endpoint: &str) -> Option<&str> {
    let rest = endpoint
        .strip_prefix("https://")
        .or_else(|| endpoint.strip_prefix("http://"))?;
    let authority = &rest[..rest.find('/').unwrap_or(rest.len())];
    Some(authority.split(':').next().unwrap_or(authority))
}

fn put_endpoint(out: &mut Vec<u8>, endpoint: &str) {
    out.extend_from_slice(&(endpoint.len() as u16).to_be_bytes());
    out.extend_from_slice(endpoint.as_bytes());
}

/// Where the browsers' keys are kept, beside the addresses.
fn keys_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".keys");
    PathBuf::from(name)
}

fn read_or_empty(path: &Path) -> io::Result<Vec<u8>> {
    match fs::read(path) {
        Ok(bytes) => Ok(bytes),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(Vec::new()),
        Err(e) => Err(e),
    }
}

/// The addresses and, for those the browser gave them for, its keys. Keys
/// kept for another address than the queue has now (an older relay changed
/// it) are not used: pushes encrypted with them would never show.
fn load(path: &Path) -> io::Result<HashMap<QueueId, Address>> {
    let bad = || io::Error::new(io::ErrorKind::InvalidData, "the push file is damaged");
    let mut endpoints = HashMap::new();
    let bytes = read_or_empty(path)?;
    let mut rest = &bytes[..];
    while !rest.is_empty() {
        let queue: QueueId = rest
            .get(..24)
            .ok_or_else(bad)?
            .try_into()
            .map_err(|_| bad())?;
        let (endpoint, after) = take_endpoint(&rest[24..]).ok_or_else(bad)?;
        endpoints.insert(
            queue,
            Address {
                endpoint,
                keys: None,
            },
        );
        rest = after;
    }
    let bytes = read_or_empty(&keys_path(path))?;
    let mut rest = &bytes[..];
    let head = 24 + P256DH_LEN + AUTH_LEN;
    while !rest.is_empty() {
        let fixed = rest.get(..head).ok_or_else(bad)?;
        let queue: QueueId = fixed[..24].try_into().map_err(|_| bad())?;
        let keys = Keys::new(&fixed[24..24 + P256DH_LEN], &fixed[24 + P256DH_LEN..]);
        let (endpoint, after) = take_endpoint(&rest[head..]).ok_or_else(bad)?;
        if let Some(address) = endpoints.get_mut(&queue) {
            if address.endpoint == endpoint {
                address.keys = keys;
            }
        }
        rest = after;
    }
    Ok(endpoints)
}

/// An endpoint after its 2-byte length, and what follows it.
fn take_endpoint(bytes: &[u8]) -> Option<(String, &[u8])> {
    let len = u16::from_be_bytes([*bytes.first()?, *bytes.get(1)?]) as usize;
    let endpoint = bytes.get(2..2 + len)?;
    Some((
        String::from_utf8(endpoint.to_vec()).ok()?,
        &bytes[2 + len..],
    ))
}

/// Reads the push key from `path`, or makes one there if the file does not exist.
pub fn load_key(path: &Path) -> io::Result<SigningKey> {
    match fs::read(path) {
        Ok(bytes) => SigningKey::from_slice(&bytes)
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "a push key is 32 bytes")),
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            // Written beside it and renamed: a stop halfway leaves no short key.
            let key = SigningKey::random(&mut rand::rngs::OsRng);
            journal::write_whole(path, &key.to_bytes())?;
            Ok(key)
        }
        Err(e) => Err(e),
    }
}

/// Base64url without padding, as JWT and VAPID use it.
pub fn b64url(bytes: &[u8]) -> String {
    const ABC: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let n = (u32::from(chunk[0]) << 16)
            | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8)
            | u32::from(*chunk.get(2).unwrap_or(&0));
        for i in 0..=chunk.len() {
            out.push(ABC[(n >> (18 - 6 * i) & 63) as usize] as char);
        }
    }
    out
}

/// What an encrypted push says, opened as the browser with `secret` and
/// `auth` would: for the tests, which play the browser.
#[cfg(test)]
pub(crate) fn decrypt(secret: &SecretKey, auth: &[u8; AUTH_LEN], body: &[u8]) -> Option<Vec<u8>> {
    let salt = body.get(..16)?;
    if body.get(20) != Some(&(P256DH_LEN as u8)) {
        return None;
    }
    let sender = PublicKey::from_sec1_bytes(body.get(21..21 + P256DH_LEN)?).ok()?;
    let own = secret.public_key().to_encoded_point(false);
    let shared = p256::ecdh::diffie_hellman(secret.to_nonzero_scalar(), sender.as_affine());
    let mut info = b"WebPush: info\0".to_vec();
    info.extend_from_slice(own.as_bytes());
    info.extend_from_slice(&body[21..21 + P256DH_LEN]);
    let mut ikm = [0u8; 32];
    Hkdf::<Sha256>::new(Some(auth), shared.raw_secret_bytes())
        .expand(&info, &mut ikm)
        .ok()?;
    let hkdf = Hkdf::<Sha256>::new(Some(salt), &ikm);
    let mut cek = [0u8; 16];
    let mut nonce = [0u8; 12];
    hkdf.expand(b"Content-Encoding: aes128gcm\0", &mut cek)
        .ok()?;
    hkdf.expand(b"Content-Encoding: nonce\0", &mut nonce).ok()?;
    let mut record = body.get(21 + P256DH_LEN..)?.to_vec();
    aes_gcm::aead::AeadInPlace::decrypt_in_place(
        &Aes128Gcm::new(&cek.into()),
        Nonce::from_slice(&nonce),
        b"",
        &mut record,
    )
    .ok()?;
    // The delimiter of the last record, after the text.
    while record.last() == Some(&0) {
        record.pop();
    }
    (record.pop() == Some(2)).then_some(record)
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use p256::ecdsa::signature::Verifier;
    use p256::ecdsa::VerifyingKey;
    use std::net::TcpListener;

    fn b64url_decode(text: &str) -> Vec<u8> {
        const ABC: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let mut bits = 0u32;
        let mut n = 0;
        let mut out = Vec::new();
        for c in text.chars() {
            bits = (bits << 6) | ABC.find(c).unwrap() as u32;
            n += 6;
            if n >= 8 {
                n -= 8;
                out.push((bits >> n) as u8);
            }
        }
        out
    }

    fn push(allowed: &[&str], file: Option<PathBuf>) -> Arc<Push> {
        push_with_gap(allowed, file, PUSH_GAP)
    }

    fn push_with_gap(allowed: &[&str], file: Option<PathBuf>, gap: Duration) -> Arc<Push> {
        Push::with_gap(
            SigningKey::random(&mut rand::rngs::OsRng),
            "mailto:relay@example.org".into(),
            allowed.iter().map(|s| s.to_string()).collect(),
            file,
            gap,
        )
        .unwrap()
    }

    /// A browser's keys for its push address, and its secret half.
    pub(crate) fn browser() -> (SecretKey, Keys) {
        let secret = SecretKey::random(&mut rand::rngs::OsRng);
        let mut auth = [0u8; AUTH_LEN];
        rand::rngs::OsRng.fill_bytes(&mut auth);
        let keys = Keys::new(
            secret.public_key().to_encoded_point(false).as_bytes(),
            &auth,
        )
        .unwrap();
        (secret, keys)
    }

    /// What an encrypted push says: its stream, round, and the round's
    /// messages, unmarked sends and calls that rang.
    pub(crate) fn said(
        secret: &SecretKey,
        keys: &Keys,
        body: &[u8],
    ) -> ([u8; 8], u32, u32, u32, u32) {
        let text = decrypt(secret, &keys.auth, body).expect("a push the browser can open");
        assert_eq!(text.len(), PAYLOAD_LEN);
        assert_eq!(text[..2], [PAYLOAD_VERSION, SENT_AT]);
        let word = |at: usize| u32::from_be_bytes(text[at..at + 4].try_into().unwrap());
        // When it was sent: now, give or take the test's own pace.
        assert!(unix_now().abs_diff(word(26)) <= 60, "{}", word(26));
        (
            text[2..10].try_into().unwrap(),
            word(10),
            word(14),
            word(18),
            word(22),
        )
    }

    #[test]
    fn base64url_matches_known_values() {
        assert_eq!(b64url(b""), "");
        assert_eq!(b64url(b"f"), "Zg");
        assert_eq!(b64url(b"fo"), "Zm8");
        assert_eq!(b64url(b"foo"), "Zm9v");
        assert_eq!(b64url(&[0xfb, 0xff]), "-_8");
    }

    #[test]
    fn the_rfc_8291_example_comes_out_byte_for_byte() {
        // RFC 8291, section 5, with its keys and salt.
        let d = |text: &str| -> Vec<u8> {
            let text: String = text.chars().filter(|c| !c.is_whitespace()).collect();
            b64url_decode(&text)
        };
        let secret =
            SecretKey::from_slice(&d("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw")).unwrap();
        let keys = Keys::new(
            &d("BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4"),
            &d("BTBZMqHH6r4Tts7J_aSIgg"),
        )
        .unwrap();
        let salt: [u8; 16] = d("DGv6ra1nlYgDCS1FRnbzlw").try_into().unwrap();
        let body = encrypt_with(
            &keys,
            &secret,
            &salt,
            b"When I grow up, I want to be a watermelon",
        )
        .unwrap();
        assert_eq!(
            body,
            d(
                "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml
               mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT
               pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
            )
        );
    }

    #[test]
    fn a_browser_key_must_be_a_point_on_the_curve() {
        let (_, keys) = browser();
        assert!(Keys::new(&keys.p256dh, &keys.auth).is_some());
        assert!(Keys::new(&keys.p256dh[..64], &keys.auth).is_none());
        assert!(Keys::new(&keys.p256dh, &keys.auth[..15]).is_none());
        let mut off = keys.p256dh;
        off[64] ^= 1;
        assert!(Keys::new(&off, &keys.auth).is_none());
        assert!(Keys::new(&[4; 65], &keys.auth).is_none());
    }

    #[test]
    fn only_push_service_addresses_are_taken() {
        let p = push(PUSH_SERVICES, None);
        let q = [1u8; 24];
        assert_eq!(p.set(&q, "https://web.push.apple.com/QGx2", None), Ok(()));
        assert_eq!(
            p.set(&q, "https://fcm.googleapis.com/fcm/send/abc", None),
            Ok(())
        );
        assert_eq!(
            p.set(
                &q,
                "https://wns2-par02p.notify.windows.com/w/?token=x",
                None
            ),
            Ok(())
        );
        for wrong in [
            "http://web.push.apple.com/x",
            "https://web.push.apple.com.evil.org/x",
            "https://evil.org/https://web.push.apple.com/",
            "https://wns2-x.evil.org/w",
            "https://127.0.0.1/x",
        ] {
            assert_eq!(p.set(&q, wrong, None), Err(SetError::Refused), "{wrong}");
        }
        assert_eq!(
            p.set(
                &q,
                &format!("https://fcm.googleapis.com/{}", "a".repeat(MAX_ENDPOINT)),
                None
            ),
            Err(SetError::Refused)
        );
    }

    #[test]
    fn the_authorization_is_a_jwt_signed_with_the_relay_key() {
        let p = push(PUSH_SERVICES, None);
        let header = p.authorization("https://web.push.apple.com", 1_000);
        let rest = header.strip_prefix("vapid t=").unwrap();
        let (jwt, k) = rest.split_once(", k=").unwrap();
        assert_eq!(b64url_decode(k), p.public_key());
        let (signed, signature) = jwt.rsplit_once('.').unwrap();
        let claims = String::from_utf8(b64url_decode(signed.split('.').nth(1).unwrap())).unwrap();
        assert_eq!(
            claims,
            r#"{"aud":"https://web.push.apple.com","exp":44200,"sub":"mailto:relay@example.org"}"#
        );
        let key = VerifyingKey::from_sec1_bytes(&p.public_key()).unwrap();
        let signature = Signature::from_slice(&b64url_decode(signature)).unwrap();
        key.verify(signed.as_bytes(), &signature).unwrap();
    }

    #[test]
    fn addresses_survive_a_restart_and_go_when_removed() {
        let dir = std::env::temp_dir().join(format!("erevos-push-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("push");
        let _ = fs::remove_file(&file);
        let _ = fs::remove_file(keys_path(&file));
        let p = push(PUSH_SERVICES, Some(file.clone()));
        let (_, keys) = browser();
        p.set(&[1; 24], "https://web.push.apple.com/a", Some(keys.clone()))
            .unwrap();
        p.set(&[2; 24], "https://fcm.googleapis.com/b", None)
            .unwrap();
        p.set(&[2; 24], "", None).unwrap();
        let again = load(&file).unwrap();
        assert_eq!(again.len(), 1);
        assert_eq!(again[&[1; 24]].endpoint, "https://web.push.apple.com/a");
        assert_eq!(again[&[1; 24]].keys.as_ref(), Some(&keys));

        // The addresses' file is as an older relay writes it, so it starts
        // with it; its keys are beside it.
        let bytes = fs::read(&file).unwrap();
        let mut old = vec![1u8; 24];
        old.extend_from_slice(&(28u16).to_be_bytes());
        old.extend_from_slice(b"https://web.push.apple.com/a");
        assert_eq!(bytes, old);

        // An older relay that changed the address meanwhile: the keys were
        // for the old one, so they are not used.
        let mut changed = vec![1u8; 24];
        changed.extend_from_slice(&(28u16).to_be_bytes());
        changed.extend_from_slice(b"https://web.push.apple.com/b");
        fs::write(&file, &changed).unwrap();
        assert_eq!(load(&file).unwrap()[&[1; 24]].keys, None);

        p.forget(&[1; 24]);
        assert!(load(&file).unwrap().is_empty());
        assert!(fs::read(keys_path(&file)).unwrap().is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn an_address_a_queue_has_already_is_not_written_again() {
        let dir = std::env::temp_dir().join(format!("erevos-push-same-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("push");
        let _ = fs::remove_file(&file);
        let _ = fs::remove_file(keys_path(&file));
        let p = push(PUSH_SERVICES, Some(file.clone()));
        let (_, keys) = browser();
        p.set(&[1; 24], "https://web.push.apple.com/a", Some(keys.clone()))
            .unwrap();
        // Gone from the disk: only a write would bring it back.
        fs::remove_file(&file).unwrap();
        p.set(&[1; 24], "https://web.push.apple.com/a", Some(keys.clone()))
            .unwrap();
        p.set(&[2; 24], "", None).unwrap();
        assert!(!file.exists());
        // Other keys, or none, are a change, and are written.
        p.set(&[1; 24], "https://web.push.apple.com/a", None)
            .unwrap();
        assert_eq!(load(&file).unwrap()[&[1; 24]].keys, None);
        fs::remove_file(&file).unwrap();
        p.set(&[1; 24], "https://web.push.apple.com/a", Some(keys.clone()))
            .unwrap();
        assert_eq!(load(&file).unwrap()[&[1; 24]].keys.as_ref(), Some(&keys));
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn the_key_is_made_once_whole_and_read_back() {
        let dir = std::env::temp_dir().join(format!("erevos-push-key-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("push.key");
        let _ = fs::remove_file(&path);
        // A file a stop left halfway beside it changes nothing.
        fs::write(dir.join("push.key.tmp"), [7; 5]).unwrap();
        let key = load_key(&path).unwrap();
        assert_eq!(fs::read(&path).unwrap(), key.to_bytes().as_slice());
        assert!(!dir.join("push.key.tmp").exists());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(&path).unwrap().permissions().mode();
            assert_eq!(mode & 0o777, 0o600);
        }
        assert_eq!(load_key(&path).unwrap(), key);
        fs::write(&path, [1; 5]).unwrap();
        assert_eq!(
            load_key(&path).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );
        fs::remove_dir_all(&dir).unwrap();
    }

    /// A push service on this machine: answers each request with `status`
    /// and hands back what it was sent, head and body.
    pub(crate) fn service(status: u16) -> (String, Receiver<(String, Vec<u8>)>) {
        services(&[status])
    }

    /// As `service`, answering with `statuses` in turn, the last one from
    /// then on; 0 closes the connection with no answer.
    pub(crate) fn services(statuses: &[u16]) -> (String, Receiver<(String, Vec<u8>)>) {
        services_after(statuses, Duration::ZERO)
    }

    /// As `services`, each answer `wait` after the request.
    fn services_after(statuses: &[u16], wait: Duration) -> (String, Receiver<(String, Vec<u8>)>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = format!("http://{}/", listener.local_addr().unwrap());
        let (tx, rx) = mpsc::channel();
        let statuses = statuses.to_vec();
        thread::spawn(move || {
            for (n, stream) in listener.incoming().enumerate() {
                let status = statuses[n.min(statuses.len() - 1)];
                let mut stream = stream.unwrap();
                let mut request = Vec::new();
                let mut byte = [0u8; 1];
                while !request.ends_with(b"\r\n\r\n") && stream.read(&mut byte).unwrap() == 1 {
                    request.push(byte[0]);
                }
                let head = String::from_utf8(request).unwrap();
                let len = head
                    .lines()
                    .find_map(|line| line.strip_prefix("Content-Length: "))
                    .map_or(0, |n| n.trim().parse::<usize>().unwrap());
                let mut body = vec![0u8; len];
                stream.read_exact(&mut body).unwrap();
                thread::sleep(wait);
                if status != 0 {
                    write!(stream, "HTTP/1.1 {status} X\r\nContent-Length: 0\r\n\r\n").unwrap();
                }
                drop(stream);
                tx.send((head, body)).unwrap();
            }
        });
        (address, rx)
    }

    #[test]
    fn a_message_sends_one_empty_push_and_a_gone_address_is_dropped() {
        let (address, requests) = service(201);
        let p = push(&[&address], None);
        let q = [3u8; 24];
        p.set(&q, &format!("{address}push/abc"), None).unwrap();
        p.arrived(&q, Came::Message);
        p.arrived(&q, Came::Message);
        let (request, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(
            request.starts_with("POST /push/abc HTTP/1.1\r\n"),
            "{request}"
        );
        assert!(request.contains("Content-Length: 0\r\n"));
        assert!(body.is_empty());
        assert!(request.contains("Authorization: vapid t="));
        assert!(request.contains("TTL: 86400\r\n"));
        // Nothing that tells one queue's pushes from another's.
        assert!(!request.contains("Topic:"));
        // The second came within the gap: it waits for the gap to end.
        assert!(requests.recv_timeout(Duration::from_millis(500)).is_err());
        // A queue with no address: nothing.
        p.arrived(&[4u8; 24], Came::Message);
        assert!(requests.recv_timeout(Duration::from_millis(300)).is_err());

        let (gone, requests) = service(410);
        let p = push(&[&gone], None);
        p.set(&q, &format!("{gone}x"), None).unwrap();
        p.arrived(&q, Came::Message);
        requests.recv_timeout(Duration::from_secs(5)).unwrap();
        thread::sleep(Duration::from_millis(200));
        assert!(p.endpoints.lock().unwrap().is_empty());
    }

    #[test]
    fn a_browser_that_gave_its_keys_gets_the_count_encrypted_for_it() {
        let (address, requests) = service(201);
        let gap = Duration::from_millis(400);
        let p = push_with_gap(&[&address], None, gap);
        let q = [5u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}k"), Some(keys.clone()))
            .unwrap();

        p.arrived(&q, Came::Message);
        let (head, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(head.contains("Content-Encoding: aes128gcm\r\n"), "{head}");
        // Always the same size: the push service learns nothing from it.
        assert_eq!(body.len(), 86 + PAYLOAD_LEN + 1 + 16);
        assert!(head.contains(&format!("Content-Length: {}\r\n", body.len())));
        let (stream_id, round, count, unmarked, rings) = said(&secret, &keys, &body);
        assert_eq!((stream_id, count, unmarked, rings), (stream(&q), 1, 0, 0));

        // Two more within the gap, one that said nothing of what it is, and
        // word between phones that the server keeps from the push: one more
        // push once the gap is over, which says all of it.
        p.arrived(&q, Came::Message);
        p.arrived(&q, Came::Unknown);
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, again, count, unmarked, _) = said(&secret, &keys, &body);
        assert_eq!((again, count, unmarked), (round, 3, 1));
        assert!(requests
            .recv_timeout(gap + Duration::from_millis(200))
            .is_err());

        // The web app took the messages: a new round starts from nothing.
        p.drained(&q, false);
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, next, count, unmarked, _) = said(&secret, &keys, &body);
        assert_eq!((count, unmarked), (1, 0));
        assert_ne!(next, round);

        // Taken while a push waits for the gap, perhaps out of sight: the push
        // still goes, and says it, and the round ends with it.
        p.arrived(&q, Came::Message);
        p.drained(&q, false);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, again, count, _, _) = said(&secret, &keys, &body);
        assert_eq!((again, count), (next, 2));
        assert!(p.tallies().get(&q).is_none());

        // A push that would say nothing new does not go: the one before said it.
        thread::sleep(gap);
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, third, count, _, _) = said(&secret, &keys, &body);
        assert_ne!(third, next);
        assert_eq!(count, 1);
        let _ = p.queue.lock().unwrap().send((q, Came::Message));
        assert!(requests
            .recv_timeout(gap + Duration::from_millis(200))
            .is_err());
        // Taken with nothing left unsaid: the round ends at once.
        p.drained(&q, false);
        assert!(p.tallies().get(&q).is_none());
        thread::sleep(gap);

        // Each push is encrypted afresh.
        p.arrived(&q, Came::Message);
        let (_, first) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        p.arrived(&q, Came::Message);
        let (_, second) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert_ne!(first[..16], second[..16]);
        assert_ne!(first[21..86], second[21..86]);
    }

    #[test]
    fn a_call_that_rings_is_counted_apart_from_the_messages() {
        let (address, requests) = service(201);
        let p = push_with_gap(&[&address], None, Duration::from_millis(300));
        let q = [11u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}c"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Ring);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, count, _, rings) = said(&secret, &keys, &body);
        assert_eq!((count, rings), (0, 1));

        // A message after it: counted in the same round, which still says
        // one call rang.
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, again, count, unmarked, rings) = said(&secret, &keys, &body);
        assert_eq!((again, count, unmarked, rings), (round, 1, 0, 1));
    }

    #[test]
    fn taken_on_the_screen_the_waiting_push_does_not_go() {
        let (address, requests) = service(201);
        let gap = Duration::from_millis(400);
        let p = push_with_gap(&[&address], None, gap);
        let q = [6u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}s"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, _, _, _) = said(&secret, &keys, &body);

        // One more within the gap, read on the screen before it is over:
        // nothing left to say.
        p.arrived(&q, Came::Message);
        p.drained(&q, true);
        assert!(p.tallies().get(&q).is_none());
        assert!(requests
            .recv_timeout(gap + Duration::from_millis(300))
            .is_err());

        // What comes next starts a new round.
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, next, count, _, _) = said(&secret, &keys, &body);
        assert_ne!(next, round);
        assert_eq!(count, 1);
    }

    #[test]
    fn an_address_removed_while_a_push_waits_takes_its_count_with_it() {
        let (address, requests) = service(201);
        let gap = Duration::from_millis(400);
        let p = push_with_gap(&[&address], None, gap);
        let q = [7u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}r"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, _, _, _) = said(&secret, &keys, &body);

        // Notifications turned off while a push waits, and the messages taken.
        p.arrived(&q, Came::Message);
        p.set(&q, "", None).unwrap();
        assert!(requests
            .recv_timeout(gap + Duration::from_millis(300))
            .is_err());
        p.drained(&q, false);
        assert!(p.tallies().get(&q).is_none());

        // Turned on again: one message, and the push says one, in a new round.
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}r2"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, next, count, _, _) = said(&secret, &keys, &body);
        assert_ne!(next, round);
        assert_eq!(count, 1);
    }

    #[test]
    fn the_queues_of_one_address_take_turns_one_push_per_gap() {
        let (address, requests) = service(201);
        // When each push reached the service.
        let (stamp, pushes) = mpsc::channel();
        thread::spawn(move || {
            while let Ok((head, body)) = requests.recv() {
                let _ = stamp.send((Instant::now(), head, body));
            }
        });
        let gap = Duration::from_millis(600);
        let p = push_with_gap(&[&address], None, gap);
        let (a, b) = ([8u8; 24], [9u8; 24]);
        let (secret, keys) = browser();
        // One browser, two spaces: one address for both queues.
        p.set(&a, &format!("{address}one"), Some(keys.clone()))
            .unwrap();
        p.set(&b, &format!("{address}one"), Some(keys.clone()))
            .unwrap();
        p.arrived(&a, Came::Message);
        thread::sleep(Duration::from_millis(50));
        p.arrived(&b, Came::Message);
        thread::sleep(Duration::from_millis(50));
        p.arrived(&a, Came::Message);

        let mut went = Vec::new();
        for _ in 0..3 {
            let (at, _, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
            let (from, _, count, _, _) = said(&secret, &keys, &body);
            went.push((at, from, count));
        }
        // a at once, then b, then a's second: never closer than the gap.
        assert_eq!(
            went.iter().map(|w| (w.1, w.2)).collect::<Vec<_>>(),
            vec![(stream(&a), 1), (stream(&b), 1), (stream(&a), 2)]
        );
        for pair in went.windows(2) {
            assert!(pair[1].0 - pair[0].0 >= gap, "{went:?}");
        }
        assert!(pushes
            .recv_timeout(gap + Duration::from_millis(300))
            .is_err());

        // Another browser's address keeps its own gap.
        let c = [10u8; 24];
        p.set(&c, &format!("{address}two"), None).unwrap();
        p.arrived(&a, Came::Message);
        p.arrived(&c, Came::Message);
        let first = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        let second = pushes
            .recv_timeout(gap / 2)
            .expect("the other address does not wait");
        assert_ne!(first.1.lines().next(), second.1.lines().next());
    }

    /// The requests `requests` hands back, with when each came.
    fn stamped(requests: Receiver<(String, Vec<u8>)>) -> Receiver<(Instant, String, Vec<u8>)> {
        let (stamp, pushes) = mpsc::channel();
        thread::spawn(move || {
            while let Ok((head, body)) = requests.recv() {
                let _ = stamp.send((Instant::now(), head, body));
            }
        });
        pushes
    }

    #[test]
    fn a_call_that_rings_goes_first_of_the_queues_that_wait_for_the_gap() {
        let (address, requests) = service(201);
        let pushes = stamped(requests);
        let gap = Duration::from_millis(500);
        let p = push_with_gap(&[&address], None, gap);
        let (a, b, c) = ([20u8; 24], [21u8; 24], [22u8; 24]);
        let (secret, keys) = browser();
        for q in [&a, &b, &c] {
            p.set(q, &format!("{address}one"), Some(keys.clone()))
                .unwrap();
        }
        p.arrived(&a, Came::Message);
        thread::sleep(Duration::from_millis(50));
        p.arrived(&b, Came::Message);
        thread::sleep(Duration::from_millis(50));
        p.arrived(&c, Came::Ring);

        let mut went = Vec::new();
        for _ in 0..3 {
            let (at, _, body) = pushes.recv_timeout(Duration::from_secs(5)).unwrap();
            let (from, _, count, _, rings) = said(&secret, &keys, &body);
            went.push((at, from, count, rings));
        }
        // a at once, then the call, then b: never closer than the gap.
        assert_eq!(
            went.iter().map(|w| (w.1, w.2, w.3)).collect::<Vec<_>>(),
            vec![(stream(&a), 1, 0), (stream(&c), 0, 1), (stream(&b), 1, 0)]
        );
        for pair in went.windows(2) {
            assert!(pair[1].0 - pair[0].0 >= gap, "{went:?}");
        }
    }

    #[test]
    fn what_comes_while_the_web_app_takes_on_the_screen_waits_for_it_there() {
        let (address, requests) = service(201);
        let gap = Duration::from_millis(500);
        let p = push_with_gap(&[&address], None, gap);
        let (a, b) = ([23u8; 24], [24u8; 24]);
        let (secret, keys) = browser();
        // One browser: the address of both queues.
        p.set(&a, &format!("{address}on"), Some(keys.clone()))
            .unwrap();
        p.set(&b, &format!("{address}on"), Some(keys.clone()))
            .unwrap();

        // The app took from one queue on the screen: what comes into the
        // other waits, and taken there too, it pushes nothing.
        p.shown(&a, true);
        p.arrived(&b, Came::Message);
        assert!(requests.recv_timeout(gap / 2).is_err());
        p.shown(&b, true);
        p.drained(&b, true);
        assert!(requests
            .recv_timeout(gap + Duration::from_millis(300))
            .is_err());
        assert!(p.tallies().get(&b).is_none());

        // Not taken in that time: it pushes once the wait is over.
        let started = Instant::now();
        p.shown(&a, true);
        p.arrived(&a, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(started.elapsed() >= gap);
        let (from, _, count, _, _) = said(&secret, &keys, &body);
        assert_eq!((from, count), (stream(&a), 1));

        // No take on the screen within the gap: it pushes at once.
        thread::sleep(gap);
        p.arrived(&b, Came::Message);
        let (_, body) = requests
            .recv_timeout(gap / 2)
            .expect("out of sight, it pushes at once");
        assert_eq!(said(&secret, &keys, &body).0, stream(&b));

        // Taken out of sight since: at once too.
        thread::sleep(gap);
        p.shown(&a, true);
        p.shown(&b, false);
        p.arrived(&a, Came::Message);
        let (_, body) = requests
            .recv_timeout(gap / 2)
            .expect("out of sight, it pushes at once");
        assert_eq!(said(&secret, &keys, &body).0, stream(&a));
    }

    #[test]
    fn what_comes_on_the_screen_just_before_a_waiting_push_waits_a_gap_of_its_own() {
        let (address, requests) = service(201);
        let gap = Duration::from_millis(500);
        let p = push_with_gap(&[&address], None, gap);
        let (a, b) = ([25u8; 24], [26u8; 24]);
        let (_, keys) = browser();
        p.set(&a, &format!("{address}on"), Some(keys.clone()))
            .unwrap();
        p.set(&b, &format!("{address}on"), Some(keys.clone()))
            .unwrap();
        // Two queues, one address.
        assert_eq!((p.len(), p.addresses()), (2, 1));

        // Held for the app on the screen, and taken there.
        p.shown(&a, true);
        p.arrived(&a, Came::Message);
        thread::sleep(gap / 5);
        p.shown(&a, true);
        p.drained(&a, true);
        // Just before that wait is over more comes, into both queues: it
        // waits a gap of its own, and taken there too, pushes nothing.
        thread::sleep(gap / 2);
        p.shown(&a, true);
        p.arrived(&a, Came::Message);
        p.arrived(&b, Came::Ring);
        assert!(requests.recv_timeout(gap * 3 / 4).is_err());
        p.shown(&a, true);
        p.drained(&a, true);
        p.shown(&b, true);
        p.drained(&b, true);
        assert!(requests.recv_timeout(gap * 2).is_err());
    }

    #[test]
    fn a_push_that_does_not_get_through_is_tried_again_with_what_it_had_to_say() {
        // A 5xx, a 429, and a push service that closes with no answer.
        for (n, first) in [500u16, 429, 0].into_iter().enumerate() {
            let (address, requests) = services(&[first, 201]);
            let gap = Duration::from_millis(300);
            let p = push_with_gap(&[&address], None, gap);
            let q = [30 + n as u8; 24];
            let (secret, keys) = browser();
            p.set(&q, &format!("{address}t"), Some(keys.clone()))
                .unwrap();
            p.arrived(&q, Came::Message);
            let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
            let (_, round, count, _, _) = said(&secret, &keys, &body);
            assert_eq!(count, 1);
            // Tried again a gap later, with the same, and then no more.
            assert!(requests.recv_timeout(gap / 2).is_err(), "{first}");
            let (_, body) = requests
                .recv_timeout(Duration::from_secs(5))
                .unwrap_or_else(|_| panic!("{first} is tried again"));
            let (_, again, count, _, _) = said(&secret, &keys, &body);
            assert_eq!((again, count), (round, 1));
            assert!(requests.recv_timeout(gap * 3).is_err(), "{first}");
        }
    }

    #[test]
    fn a_push_on_its_way_when_the_queue_is_emptied_out_of_sight_is_still_tried_again() {
        let (address, requests) = services_after(&[503, 201], Duration::from_millis(300));
        let gap = Duration::from_millis(200);
        let p = push_with_gap(&[&address], None, gap);
        let q = [39u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}w"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        // Taken out of sight while the push waits for its answer.
        thread::sleep(Duration::from_millis(100));
        p.drained(&q, false);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, count, _, _) = said(&secret, &keys, &body);
        assert_eq!(count, 1);
        let (_, body) = requests
            .recv_timeout(Duration::from_secs(5))
            .expect("tried again");
        let (_, again, count, _, _) = said(&secret, &keys, &body);
        assert_eq!((again, count), (round, 1));
        // That ended the round: the next message starts another.
        assert!(p.tallies().get(&q).is_none());
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, next, count, _, _) = said(&secret, &keys, &body);
        assert_ne!(next, round);
        assert_eq!(count, 1);
    }

    #[test]
    fn a_push_on_its_way_that_got_through_ends_the_round_the_queue_was_emptied_in() {
        let (address, requests) = services_after(&[201], Duration::from_millis(300));
        let p = push_with_gap(&[&address], None, Duration::from_millis(200));
        let q = [40u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}w"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        thread::sleep(Duration::from_millis(100));
        p.drained(&q, false);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, _, _, _) = said(&secret, &keys, &body);
        thread::sleep(Duration::from_millis(50));
        assert!(p.tallies().get(&q).is_none());
        assert!(requests.recv_timeout(Duration::from_millis(600)).is_err());
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert_ne!(said(&secret, &keys, &body).1, round);
    }

    #[test]
    fn a_push_that_ends_the_round_taken_on_the_screen_while_on_its_way_is_not_tried_again() {
        let (address, requests) = services_after(&[503, 201], Duration::from_millis(300));
        let gap = Duration::from_millis(200);
        let p = push_with_gap(&[&address], None, gap);
        let q = [41u8; 24];
        let (_, keys) = browser();
        p.set(&q, &format!("{address}f"), Some(keys.clone()))
            .unwrap();
        // Taken out of sight as the push went: it ends the round.
        p.arrived(&q, Came::Message);
        p.drained(&q, false);
        // On its way, the app takes the queue on the screen.
        thread::sleep(Duration::from_millis(100));
        p.shown(&q, true);
        p.drained(&q, true);
        requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(requests.recv_timeout(gap * 4).is_err());
        assert!(p.tallies().get(&q).is_none());
    }

    #[test]
    fn a_message_that_comes_while_the_last_push_of_a_round_is_on_its_way_joins_its_round() {
        let (address, requests) = services_after(&[201, 503, 201], Duration::from_millis(300));
        let gap = Duration::from_millis(300);
        let p = push_with_gap(&[&address], None, gap);
        let q = [42u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}j"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, _, _, _) = said(&secret, &keys, &body);
        // Two more within the gap, taken out of sight: the next push ends the
        // round, and while it is on its way one more comes.
        p.arrived(&q, Came::Message);
        p.arrived(&q, Came::Message);
        p.drained(&q, false);
        thread::sleep(gap + Duration::from_millis(100));
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert_eq!(said(&secret, &keys, &body).2, 3);
        // It did not get through: the next says the whole round.
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, again, count, _, _) = said(&secret, &keys, &body);
        assert_eq!((again, count), (round, 4));
    }

    #[test]
    fn what_comes_on_the_screen_holds_another_queue_a_gap_more_at_most() {
        let (address, requests) = service(201);
        let gap = Duration::from_millis(400);
        let p = push_with_gap(&[&address], None, gap);
        let (a, b) = ([27u8; 24], [28u8; 24]);
        let (secret, keys) = browser();
        p.set(&a, &format!("{address}on"), Some(keys.clone()))
            .unwrap();
        p.set(&b, &format!("{address}on"), Some(keys.clone()))
            .unwrap();
        // The app shows one space (queue a); a call rings in another (queue
        // b), which the app there never takes, while a's chat goes on.
        let started = Instant::now();
        p.shown(&a, true);
        p.arrived(&b, Came::Ring);
        let chat = {
            let p = Arc::clone(&p);
            thread::spawn(move || {
                for _ in 0..12 {
                    thread::sleep(gap / 3);
                    p.shown(&a, true);
                    p.arrived(&a, Came::Message);
                    p.shown(&a, true);
                    p.drained(&a, true);
                }
            })
        };
        let (_, body) = requests
            .recv_timeout(gap * 4)
            .expect("the call pushes all the same");
        let waited = started.elapsed();
        assert!(waited >= gap && waited < gap * 3, "{waited:?}");
        let (from, _, _, _, rings) = said(&secret, &keys, &body);
        assert_eq!((from, rings), (stream(&b), 1));
        chat.join().unwrap();
    }

    #[test]
    fn a_chat_that_goes_on_on_the_screen_pushes_nothing_while_the_app_takes_it() {
        let (address, requests) = service(201);
        let pushes = stamped(requests);
        let gap = Duration::from_millis(600);
        let p = push_with_gap(&[&address], None, gap);
        let a = [36u8; 24];
        let (secret, keys) = browser();
        p.set(&a, &format!("{address}busy"), Some(keys.clone()))
            .unwrap();
        // The chat shows: the app looks every 3 seconds of the 15, so it takes
        // each message a fifth of a gap after it comes, the last one just
        // before the gap and a bit since the first are over.
        let started = Instant::now();
        p.shown(&a, true);
        let chat: Vec<_> = [0.0f64, 0.6, 1.2, 1.85]
            .into_iter()
            .map(|at| {
                let p = Arc::clone(&p);
                thread::spawn(move || {
                    thread::sleep(
                        (started + gap.mul_f64(at)).saturating_duration_since(Instant::now()),
                    );
                    p.shown(&a, true);
                    p.arrived(&a, Came::Message);
                    thread::sleep(gap / 5);
                    p.shown(&a, true);
                    p.drained(&a, true);
                })
            })
            .collect();
        for message in chat {
            message.join().unwrap();
        }
        if let Ok((at, _, body)) = pushes.recv_timeout(gap * 2) {
            let (_, _, count, _, _) = said(&secret, &keys, &body);
            panic!("pushed {count} on the screen, {:?} in", at - started);
        }
    }

    #[test]
    fn a_push_the_push_service_refuses_for_good_is_not_tried_again() {
        let (address, requests) = services(&[403, 201]);
        let gap = Duration::from_millis(200);
        let p = push_with_gap(&[&address], None, gap);
        let q = [33u8; 24];
        let (secret, keys) = browser();
        p.set(&q, &format!("{address}f"), Some(keys.clone()))
            .unwrap();
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, round, _, _, _) = said(&secret, &keys, &body);
        assert!(requests.recv_timeout(gap * 3).is_err());
        // The next message pushes, and says both.
        p.arrived(&q, Came::Message);
        let (_, body) = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        let (_, again, count, _, _) = said(&secret, &keys, &body);
        assert_eq!((again, count), (round, 2));
    }

    #[test]
    fn a_push_is_tried_five_times_at_most_each_wait_twice_as_long() {
        let (address, requests) = services(&[503]);
        let pushes = stamped(requests);
        let gap = Duration::from_millis(60);
        let p = push_with_gap(&[&address], None, gap);
        let q = [34u8; 24];
        p.set(&q, &format!("{address}g"), None).unwrap();
        p.arrived(&q, Came::Message);
        let mut went = Vec::new();
        for _ in 0..PUSH_TRIES {
            went.push(pushes.recv_timeout(Duration::from_secs(5)).unwrap().0);
        }
        // Give or take the time the service takes to hand a request back.
        let near = Duration::from_millis(10);
        for (n, pair) in went.windows(2).enumerate() {
            assert!(pair[1] - pair[0] + near >= gap * (1 << n), "{went:?}");
        }
        assert!(pushes.recv_timeout(gap * 20).is_err());
        // Given up: the next message tries again.
        p.arrived(&q, Came::Message);
        pushes.recv_timeout(Duration::from_secs(5)).unwrap();
        pushes.recv_timeout(Duration::from_secs(5)).unwrap();
    }

    #[test]
    fn a_push_that_did_not_get_through_gives_back_what_it_had_to_say() {
        let p = push(PUSH_SERVICES, None);
        let q = [35u8; 24];
        let said = Tally {
            round: 7,
            count: 2,
            unmarked: 0,
            rings: 0,
            fresh: true,
            drained: true,
            tries: 0,
            sending: false,
        };
        let now = |p: &Push| {
            p.tallies()
                .get(&q)
                .map(|t| (t.round, t.count, t.fresh, t.drained, t.tries))
        };
        // The push was to end the round, kept while on its way: it is said
        // again.
        p.tallies().insert(
            q,
            Tally {
                fresh: false,
                sending: true,
                ..said
            },
        );
        p.give_back(&q, said, 1);
        assert_eq!(now(&p), Some((7, 2, true, true, 1)));
        assert!(!p.tallies()[&q].sending);
        // Emptied on the screen meanwhile: nothing comes back.
        p.tallies().remove(&q);
        p.give_back(&q, said, 1);
        assert_eq!(now(&p), None);
        // A newer round started meanwhile: it stays as it is.
        p.tallies().insert(
            q,
            Tally {
                round: 8,
                count: 1,
                drained: false,
                ..said
            },
        );
        p.give_back(&q, said, 1);
        assert_eq!(now(&p), Some((8, 1, true, false, 0)));
        // The round goes on: fresh again, with what came meanwhile.
        let going = Tally {
            drained: false,
            ..said
        };
        p.tallies().insert(
            q,
            Tally {
                count: 3,
                fresh: false,
                ..going
            },
        );
        p.give_back(&q, going, 2);
        assert_eq!(now(&p), Some((7, 3, true, false, 2)));
        // Emptied meanwhile: the web app has the messages.
        p.tallies().remove(&q);
        p.give_back(&q, going, 1);
        assert_eq!(now(&p), None);
    }

    #[test]
    fn a_refused_push_is_logged_by_its_service_and_status_once_an_hour() {
        let p = push(PUSH_SERVICES, None);
        // The service's name, not the address, which lets anyone push.
        assert_eq!(
            host("https://web.push.apple.com/QGx2secret"),
            Some("web.push.apple.com")
        );
        assert!(p.tells("web.push.apple.com", "403"));
        assert!(!p.tells("web.push.apple.com", "403"));
        assert!(p.tells("web.push.apple.com", "500"));
        assert!(p.tells("fcm.googleapis.com", "403"));
    }

    #[test]
    fn a_gone_address_leaves_every_queue_and_given_again_is_refused() {
        let dir = std::env::temp_dir().join(format!("erevos-push-gone-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("push");
        let _ = fs::remove_file(&file);
        let _ = fs::remove_file(keys_path(&file));
        let (gone, requests) = service(410);
        let p = push_with_gap(&[&gone], Some(file.clone()), Duration::from_millis(100));
        let (a, b, c) = ([36u8; 24], [37u8; 24], [38u8; 24]);
        let endpoint = format!("{gone}old");
        p.set(&a, &endpoint, None).unwrap();
        p.set(&b, &endpoint, None).unwrap();
        p.set(&c, &format!("{gone}other"), None).unwrap();
        p.arrived(&b, Came::Message);
        p.arrived(&a, Came::Message);
        requests.recv_timeout(Duration::from_secs(5)).unwrap();
        // Both queues of that address lose it at once, with their counts;
        // the other keeps its own.
        assert!(requests.recv_timeout(Duration::from_millis(500)).is_err());
        assert_eq!(load(&file).unwrap().keys().collect::<Vec<_>>(), vec![&c]);
        assert_eq!(p.len(), 1);
        assert!(p.tallies().get(&a).is_none());
        assert!(p.tallies().get(&b).is_none());

        // Given again, the web app is told to make a new one.
        assert_eq!(p.set(&a, &endpoint, None), Err(SetError::Gone));
        assert_eq!(p.set(&a, &format!("{gone}new"), None), Ok(()));
        assert_eq!(p.set(&a, "", None), Ok(()));
        // The oldest is forgotten first, past `MAX_GONE`.
        for n in 0..MAX_GONE {
            p.went_gone(&format!("{gone}{n}"));
        }
        assert_eq!(p.set(&a, &format!("{gone}0"), None), Err(SetError::Gone));
        assert_eq!(p.set(&a, &endpoint, None), Ok(()));
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn a_change_that_cannot_be_written_is_not_made() {
        let p = push(
            PUSH_SERVICES,
            Some(PathBuf::from("/nonexistent-erevos-folder/push")),
        );
        let q = [39u8; 24];
        assert_eq!(
            p.set(&q, "https://web.push.apple.com/a", None),
            Err(SetError::Storage)
        );
        assert_eq!(p.len(), 0);
        p.arrived(&q, Came::Message);
        assert!(p.tallies().get(&q).is_none());
    }

    #[test]
    fn an_operator_may_add_a_push_service() {
        for good in [
            "https://push.example.org/",
            "https://push.example.org:8443/",
        ] {
            assert!(is_service(good), "{good}");
        }
        for bad in [
            "http://push.example.org/",
            "https://push.example.org",
            "https://push.example.org/x/",
            "https://me@push.example.org/",
            "https://push.example.org:0/",
            "https://push.example.org:x/",
            "https:///",
            "https://push example.org/",
        ] {
            assert!(!is_service(bad), "{bad}");
        }
        let mut allowed = PUSH_SERVICES.to_vec();
        allowed.push("https://push.example.org/");
        let p = push(&allowed, None);
        let q = [40u8; 24];
        assert_eq!(p.set(&q, "https://push.example.org/abc", None), Ok(()));
        assert_eq!(
            p.set(&q, "https://push.example.org.evil.org/abc", None),
            Err(SetError::Refused)
        );
        assert_eq!(p.set(&q, "https://web.push.apple.com/a", None), Ok(()));
    }

    #[test]
    fn pushes_that_stop_are_said_once() {
        let p = push(PUSH_SERVICES, None);
        let q = [41u8; 24];
        p.set(&q, "https://web.push.apple.com/a", None).unwrap();
        // The worker gone: nothing takes what comes.
        *p.queue.lock().unwrap() = mpsc::channel().0;
        p.arrived(&q, Came::Message);
        assert!(p.stopped.load(Ordering::Relaxed));
    }
}
