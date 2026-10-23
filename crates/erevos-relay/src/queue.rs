//! One-way queues in the style of SimpleX's SMP: each queue has a sender id
//! and a separate recipient id, so the relay cannot link the two from what a
//! client asks for, and senders cannot read or delete what they sent.
//!
//! A store opened from a journal (see `journal.rs`) writes every change to
//! disk before applying it, so queues and waiting messages survive a restart.
//! `Store::default()` keeps everything in memory only.
//!
//! A message nobody takes expires after `ttl` (14 days unless set), as on
//! Session's nodes, so the relay does not keep it forever. The relay notes
//! only the hour each message came, not the second.
//!
//! The store holds at most `max_queues` queues (100000 unless set), places
//! lent to phones without a relay among them; past that, a new one is
//! refused with `Full`. A queue its recipient has not used (taken from,
//! waited on) for `queue_ttl` (180 days unless set) expires, with whatever
//! waits in it, so queues of phones that are gone do not fill the relay.
//! Sending to a queue does not count, so a sender cannot keep one alive. The
//! relay notes only the day a queue was last used, and writes it down at most
//! once a day a queue. A queue from a journal written before relays noted
//! that counts as used the day it was read back.
//!
//! Each queue also keeps, in memory only, what came into it since its
//! recipient last found it empty, by what each send said it carries (`News`):
//! so a phone can be told how many messages wait in a queue it cannot read
//! now, as hidden chats' while they are closed, and not of word between
//! phones. After a restart a queue with something waiting counts it as one
//! send that did not say.

use std::collections::{HashMap, VecDeque};
use std::io;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rand::RngCore;

use crate::journal::{self, Journal, Record};

pub type QueueId = [u8; 24];

/// Messages a queue holds before it refuses more, so one sender cannot fill
/// the relay.
pub const MAX_QUEUED: usize = 1000;

/// How long a message waits for its recipient before it expires.
pub const DEFAULT_TTL: u64 = 14 * 24 * 60 * 60;
/// Queues the relay holds unless set (`EREVOS_RELAY_MAX_QUEUES`).
pub const DEFAULT_MAX_QUEUES: usize = 100_000;
/// How long a queue its recipient does not use lasts unless set
/// (`EREVOS_RELAY_QUEUE_DAYS`).
pub const DEFAULT_QUEUE_TTL: u64 = 180 * DAY;
pub(crate) const HOUR: u64 = 60 * 60;
pub(crate) const DAY: u64 = 24 * HOUR;

/// Unix seconds now. A clock before 1970 counts as 1970.
pub(crate) fn system_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
}

#[derive(Debug, PartialEq, Eq)]
pub enum QueueError {
    NotFound,
    Full,
    /// The change could not be written to the journal, so nothing changed.
    Storage,
}

struct Queue {
    sender_id: QueueId,
    /// Oldest first, each with the hour it came.
    messages: VecDeque<(u64, Vec<u8>)>,
    /// The day its recipient last used it, Unix seconds at its start.
    used: u64,
    /// What came since its recipient last found it empty.
    news: News,
}

/// What a send said it carries.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Said {
    /// A message someone reads.
    Message,
    /// Word between phones, such as that a message came or new keys.
    Quiet,
    /// A call that rings.
    Ring,
    /// It did not say: perhaps a message.
    Unknown,
}

/// What came into a queue since its recipient last found it empty.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct News {
    /// Random, new each time something comes into a queue found empty; 0
    /// while nothing came since.
    pub round: u32,
    /// Messages.
    pub messages: u32,
    /// Sends that did not say what they carry.
    pub unmarked: u32,
    /// Calls that rang.
    pub rings: u32,
}

impl News {
    fn came(&mut self, said: Said) {
        if self.round == 0 {
            self.round = new_round();
        }
        let counted = match said {
            Said::Quiet => return,
            Said::Message => &mut self.messages,
            Said::Ring => &mut self.rings,
            Said::Unknown => &mut self.unmarked,
        };
        *counted = counted.saturating_add(1);
    }
}

fn new_round() -> u32 {
    rand::rngs::OsRng.next_u32().max(1)
}

pub struct Store {
    queues: HashMap<QueueId, Queue>,
    by_sender: HashMap<QueueId, QueueId>,
    journal: Option<Journal>,
    ttl: u64,
    max_queues: usize,
    queue_ttl: u64,
    clock: fn() -> u64,
}

impl Default for Store {
    fn default() -> Self {
        Store {
            queues: HashMap::new(),
            by_sender: HashMap::new(),
            journal: None,
            ttl: DEFAULT_TTL,
            max_queues: DEFAULT_MAX_QUEUES,
            queue_ttl: DEFAULT_QUEUE_TTL,
            clock: system_now,
        }
    }
}

pub struct NewQueue {
    pub recipient_id: QueueId,
    pub sender_id: QueueId,
}

fn random_id() -> QueueId {
    let mut id = [0u8; 24];
    rand::rngs::OsRng.fill_bytes(&mut id);
    id
}

/// Records that rebuild `queues` from nothing: each queue, then its waiting
/// messages oldest first.
fn records(queues: &HashMap<QueueId, Queue>) -> impl Iterator<Item = Record<'_>> {
    queues.iter().flat_map(|(recipient_id, q)| {
        std::iter::once(Record::Create {
            recipient_id: *recipient_id,
            sender_id: q.sender_id,
            used: q.used,
        })
        .chain(q.messages.iter().map(|(at, message)| Record::Send {
            recipient_id: *recipient_id,
            at: *at,
            message,
        }))
    })
}

/// Writes `record` to the journal, if there is one.
fn log(journal: &mut Option<Journal>, record: &Record) -> Result<(), QueueError> {
    let Some(journal) = journal else {
        return Ok(());
    };
    journal.append(record).map_err(|e| {
        eprintln!("erevos-relay: cannot write the journal: {e}");
        QueueError::Storage
    })
}

impl Store {
    #[cfg(test)]
    pub fn open(path: &Path) -> io::Result<Store> {
        Store::open_with(path, DEFAULT_TTL)
    }

    /// Opens the store kept in the journal at `path`, or starts an empty one
    /// there if the file does not exist yet, with messages expiring after
    /// `ttl` seconds. The file is rewritten on the way, which drops received
    /// and expired messages and deleted queues from it.
    pub fn open_with(path: &Path, ttl: u64) -> io::Result<Store> {
        Store::open_clocked(path, ttl, system_now)
    }

    fn open_clocked(path: &Path, ttl: u64, clock: fn() -> u64) -> io::Result<Store> {
        let mut store = Store {
            ttl,
            clock,
            ..Store::default()
        };
        let skipped = journal::replay(path, |record| store.apply(record))?;
        if skipped > 0 {
            eprintln!(
                "erevos-relay: skipped {skipped} bytes at the end of {}, left by a write that did not finish",
                path.display()
            );
        }
        store.drop_expired();
        store.journal = Some(Journal::create(path, records(&store.queues))?);
        Ok(store)
    }

    /// An in-memory store whose messages expire after `ttl` seconds.
    pub fn with_ttl(ttl: u64) -> Store {
        Store {
            ttl,
            ..Store::default()
        }
    }

    /// The same store, holding at most `max` queues, each expiring once its
    /// recipient has not used it for `ttl` seconds.
    pub fn with_queue_limits(self, max: usize, ttl: u64) -> Store {
        Store {
            max_queues: max,
            queue_ttl: ttl,
            ..self
        }
    }

    /// The hour that holds now, the time noted for a message that comes now.
    fn hour(&self) -> u64 {
        ((self.clock)() / HOUR * HOUR).max(1)
    }

    /// The day that holds now, the time noted for a queue used now.
    fn today(&self) -> u64 {
        ((self.clock)() / DAY * DAY).max(1)
    }

    /// Notes that the queue's recipient used it today, in the journal too the
    /// first time a day. A failed write is said and left: the day is kept in
    /// memory and goes into the next rewrite of the journal, and a day
    /// missing after a restart only lets the queue expire a little sooner.
    fn touch(&mut self, recipient_id: &QueueId) {
        let today = self.today();
        let Some(q) = self.queues.get_mut(recipient_id) else {
            return;
        };
        if q.used >= today {
            return;
        }
        q.used = today;
        let _ = log(
            &mut self.journal,
            &Record::Used {
                recipient_id: *recipient_id,
                day: today,
            },
        );
    }

    /// Whether the store has room for one more queue.
    pub fn has_room(&self) -> bool {
        self.queues.len() < self.max_queues
    }

    /// Removes every queue its recipient has not used for `queue_ttl`, with
    /// what waits in it, and returns their recipient ids. The relay calls this
    /// now and then.
    pub fn expire_queues(&mut self) -> Vec<QueueId> {
        let now = (self.clock)();
        let old: Vec<QueueId> = self
            .queues
            .iter()
            .filter(|(_, q)| q.used.saturating_add(self.queue_ttl) <= now)
            .map(|(id, _)| *id)
            .collect();
        let mut gone = Vec::with_capacity(old.len());
        for id in old {
            if self.delete(&id).is_err() {
                break;
            }
            gone.push(id);
        }
        gone
    }

    fn expired(&self, at: u64) -> bool {
        at.saturating_add(self.ttl) <= (self.clock)()
    }

    /// Drops expired messages from memory only, while opening: the journal
    /// written right after leaves them out.
    fn drop_expired(&mut self) {
        let (now, ttl) = ((self.clock)(), self.ttl);
        for q in self.queues.values_mut() {
            q.messages.retain(|(at, _)| at.saturating_add(ttl) > now);
        }
    }

    /// Removes expired messages from the front of one queue, noting each in
    /// the journal as taken.
    fn expire_queue(&mut self, recipient_id: &QueueId) -> Result<(), QueueError> {
        loop {
            let Some(q) = self.queues.get(recipient_id) else {
                return Ok(());
            };
            match q.messages.front() {
                Some((at, _)) if self.expired(*at) => {}
                _ => return Ok(()),
            }
            log(
                &mut self.journal,
                &Record::Receive {
                    recipient_id: *recipient_id,
                },
            )?;
            if let Some(q) = self.queues.get_mut(recipient_id) {
                q.messages.pop_front();
            }
        }
    }

    /// Removes every expired message. The relay calls this now and then, so
    /// messages for queues nobody looks at go too. Returns how many went.
    pub fn expire(&mut self) -> usize {
        let ids: Vec<QueueId> = self.queues.keys().copied().collect();
        let before: usize = self.queues.values().map(|q| q.messages.len()).sum();
        for id in ids {
            if self.expire_queue(&id).is_err() {
                break;
            }
        }
        let after: usize = self.queues.values().map(|q| q.messages.len()).sum();
        self.tidy();
        before - after
    }

    /// Applies a record read back from the journal.
    fn apply(&mut self, record: Record) {
        match record {
            Record::Create {
                recipient_id,
                sender_id,
                used,
            } => {
                // A record from before relays noted the day counts from now.
                let used = if used == 0 { self.today() } else { used };
                self.queues.insert(
                    recipient_id,
                    Queue {
                        sender_id,
                        messages: VecDeque::new(),
                        used,
                        news: News::default(),
                    },
                );
                self.by_sender.insert(sender_id, recipient_id);
            }
            Record::Used { recipient_id, day } => {
                if let Some(q) = self.queues.get_mut(&recipient_id) {
                    q.used = q.used.max(day);
                }
            }
            Record::Send {
                recipient_id,
                at,
                message,
            } => {
                // A record from before relays noted the time counts from now.
                let at = if at == 0 { self.hour() } else { at };
                if let Some(q) = self.queues.get_mut(&recipient_id) {
                    q.messages.push_back((at, message.to_vec()));
                }
            }
            Record::Receive { recipient_id } => {
                if let Some(q) = self.queues.get_mut(&recipient_id) {
                    q.messages.pop_front();
                }
            }
            Record::Delete { recipient_id } => {
                if let Some(q) = self.queues.remove(&recipient_id) {
                    self.by_sender.remove(&q.sender_id);
                }
            }
        }
    }

    /// A new queue, or `Full` when the store holds `max_queues` already.
    pub fn create(&mut self) -> Result<NewQueue, QueueError> {
        if !self.has_room() {
            return Err(QueueError::Full);
        }
        let recipient_id = random_id();
        let sender_id = random_id();
        let used = self.today();
        log(
            &mut self.journal,
            &Record::Create {
                recipient_id,
                sender_id,
                used,
            },
        )?;
        self.queues.insert(
            recipient_id,
            Queue {
                sender_id,
                messages: VecDeque::new(),
                used,
                news: News::default(),
            },
        );
        self.by_sender.insert(sender_id, recipient_id);
        self.tidy();
        Ok(NewQueue {
            recipient_id,
            sender_id,
        })
    }

    /// The queue a sender id sends to, if it is here.
    pub fn recipient_of(&self, sender_id: &QueueId) -> Option<QueueId> {
        self.by_sender.get(sender_id).copied()
    }

    /// Queues `msg` as a send that did not say what it carries.
    #[cfg(test)]
    pub fn send(&mut self, sender_id: &QueueId, msg: Vec<u8>) -> Result<(), QueueError> {
        self.send_said(sender_id, msg, Said::Unknown)
    }

    /// Queues `msg`, counted in the queue's news as `said` says.
    pub fn send_said(
        &mut self,
        sender_id: &QueueId,
        msg: Vec<u8>,
        said: Said,
    ) -> Result<(), QueueError> {
        let rid = *self.by_sender.get(sender_id).ok_or(QueueError::NotFound)?;
        self.expire_queue(&rid)?;
        let at = self.hour();
        let q = self.queues.get_mut(&rid).ok_or(QueueError::NotFound)?;
        if q.messages.len() >= MAX_QUEUED {
            return Err(QueueError::Full);
        }
        log(
            &mut self.journal,
            &Record::Send {
                recipient_id: rid,
                at,
                message: &msg,
            },
        )?;
        q.messages.push_back((at, msg));
        q.news.came(said);
        self.tidy();
        Ok(())
    }

    /// Hands over the oldest message and deletes it from the relay.
    pub fn receive(&mut self, recipient_id: &QueueId) -> Result<Option<Vec<u8>>, QueueError> {
        self.expire_queue(recipient_id)?;
        self.touch(recipient_id);
        let q = self
            .queues
            .get_mut(recipient_id)
            .ok_or(QueueError::NotFound)?;
        if q.messages.is_empty() {
            // What comes from now on counts from nothing.
            q.news = News::default();
            return Ok(None);
        }
        log(
            &mut self.journal,
            &Record::Receive {
                recipient_id: *recipient_id,
            },
        )?;
        let msg = q.messages.pop_front().map(|(_, msg)| msg);
        self.tidy();
        Ok(msg)
    }

    /// Whether a message waits in the queue. Nothing is taken. Asked by the
    /// queue's recipient, so it counts as a use.
    pub fn has_waiting(&mut self, recipient_id: &QueueId) -> Result<bool, QueueError> {
        self.expire_queue(recipient_id)?;
        self.touch(recipient_id);
        let q = self.queues.get(recipient_id).ok_or(QueueError::NotFound)?;
        Ok(!q.messages.is_empty())
    }

    /// What came into the queue since its recipient last found it empty.
    /// Nothing is taken. Asked by the queue's recipient, so it counts as a
    /// use. What waits from before a restart counts as one send that did not
    /// say.
    pub fn news(&mut self, recipient_id: &QueueId) -> Result<News, QueueError> {
        self.expire_queue(recipient_id)?;
        self.touch(recipient_id);
        let q = self
            .queues
            .get_mut(recipient_id)
            .ok_or(QueueError::NotFound)?;
        if q.news.round == 0 && !q.messages.is_empty() {
            q.news.came(Said::Unknown);
        }
        Ok(q.news)
    }

    pub fn delete(&mut self, recipient_id: &QueueId) -> Result<(), QueueError> {
        if !self.queues.contains_key(recipient_id) {
            return Err(QueueError::NotFound);
        }
        log(
            &mut self.journal,
            &Record::Delete {
                recipient_id: *recipient_id,
            },
        )?;
        if let Some(q) = self.queues.remove(recipient_id) {
            self.by_sender.remove(&q.sender_id);
        }
        self.tidy();
        Ok(())
    }

    /// Rewrites the journal when most of it is received messages and deleted
    /// queues. A failed rewrite keeps the old file, which is still correct.
    fn tidy(&mut self) {
        let Some(journal) = self.journal.as_mut() else {
            return;
        };
        if !journal.due() {
            return;
        }
        let live = journal::size(records(&self.queues));
        if let Err(e) = journal.tidy(live, records(&self.queues)) {
            eprintln!("erevos-relay: cannot rewrite the journal, keeping the old one: {e}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn delivers_in_order_and_deletes_on_receive() {
        let mut s = Store::default();
        let q = s.create().unwrap();
        s.send(&q.sender_id, b"one".to_vec()).unwrap();
        s.send(&q.sender_id, b"two".to_vec()).unwrap();
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"one");
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"two");
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);
    }

    #[test]
    fn ids_are_not_interchangeable() {
        let mut s = Store::default();
        let q = s.create().unwrap();
        assert_eq!(s.receive(&q.sender_id), Err(QueueError::NotFound));
        assert_eq!(s.send(&q.recipient_id, vec![1]), Err(QueueError::NotFound));
    }

    #[test]
    fn full_and_deleted_queues() {
        let mut s = Store::default();
        let q = s.create().unwrap();
        for _ in 0..MAX_QUEUED {
            s.send(&q.sender_id, vec![0]).unwrap();
        }
        assert_eq!(s.send(&q.sender_id, vec![0]), Err(QueueError::Full));
        s.delete(&q.recipient_id).unwrap();
        assert_eq!(s.send(&q.sender_id, vec![0]), Err(QueueError::NotFound));
    }

    #[test]
    fn news_counts_what_each_send_said_until_the_queue_is_found_empty() {
        let mut s = Store::default();
        let q = s.create().unwrap();
        assert_eq!(s.news(&q.recipient_id).unwrap(), News::default());
        // Word between phones starts a round and counts nothing.
        s.send_said(&q.sender_id, b"seen".to_vec(), Said::Quiet)
            .unwrap();
        let first = s.news(&q.recipient_id).unwrap();
        assert_ne!(first.round, 0);
        assert_eq!((first.messages, first.unmarked, first.rings), (0, 0, 0));
        s.send_said(&q.sender_id, b"hello".to_vec(), Said::Message)
            .unwrap();
        s.send_said(&q.sender_id, b"call".to_vec(), Said::Ring)
            .unwrap();
        s.send(&q.sender_id, b"old".to_vec()).unwrap();
        s.send_said(&q.sender_id, b"again".to_vec(), Said::Message)
            .unwrap();
        let now = s.news(&q.recipient_id).unwrap();
        assert_eq!(
            now,
            News {
                round: first.round,
                messages: 2,
                unmarked: 1,
                rings: 1
            }
        );
        // Taking messages leaves the count; finding the queue empty ends the round.
        for _ in 0..5 {
            assert!(s.receive(&q.recipient_id).unwrap().is_some());
        }
        assert_eq!(s.news(&q.recipient_id).unwrap(), now);
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);
        assert_eq!(s.news(&q.recipient_id).unwrap(), News::default());
        s.send_said(&q.sender_id, b"next".to_vec(), Said::Message)
            .unwrap();
        let next = s.news(&q.recipient_id).unwrap();
        assert_ne!(next.round, 0);
        assert_eq!((next.messages, next.unmarked, next.rings), (1, 0, 0));
        assert_eq!(s.news(&q.sender_id), Err(QueueError::NotFound));
    }

    #[test]
    fn what_waits_from_before_a_restart_counts_as_one_send_that_did_not_say() {
        let path = TempPath::new();
        let (full, empty) = {
            let mut s = Store::open(&path.0).unwrap();
            let full = s.create().unwrap();
            let empty = s.create().unwrap();
            s.send_said(&full.sender_id, b"one".to_vec(), Said::Message)
                .unwrap();
            s.send_said(&full.sender_id, b"two".to_vec(), Said::Message)
                .unwrap();
            (full, empty)
        };
        let mut s = Store::open(&path.0).unwrap();
        let news = s.news(&full.recipient_id).unwrap();
        assert_ne!(news.round, 0);
        assert_eq!((news.messages, news.unmarked, news.rings), (0, 1, 0));
        // Asked again, the same round.
        assert_eq!(s.news(&full.recipient_id).unwrap(), news);
        assert_eq!(s.news(&empty.recipient_id).unwrap(), News::default());
    }

    /// A fresh path in the system temp directory, removed when dropped.
    struct TempPath(PathBuf);

    impl TempPath {
        fn new() -> TempPath {
            static NEXT: AtomicUsize = AtomicUsize::new(0);
            let n = NEXT.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "erevos-relay-test-{}-{n}.journal",
                std::process::id()
            ));
            let _ = std::fs::remove_file(&path);
            TempPath(path)
        }
    }

    impl Drop for TempPath {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.0);
        }
    }

    #[test]
    fn queues_and_waiting_messages_survive_a_restart() {
        let path = TempPath::new();
        let (kept, gone) = {
            let mut s = Store::open(&path.0).unwrap();
            let kept = s.create().unwrap();
            let gone = s.create().unwrap();
            s.send(&kept.sender_id, b"one".to_vec()).unwrap();
            s.send(&kept.sender_id, b"two".to_vec()).unwrap();
            s.send(&kept.sender_id, b"three".to_vec()).unwrap();
            assert_eq!(s.receive(&kept.recipient_id).unwrap().unwrap(), b"one");
            s.delete(&gone.recipient_id).unwrap();
            (kept, gone)
        };
        let mut s = Store::open(&path.0).unwrap();
        assert_eq!(s.receive(&kept.recipient_id).unwrap().unwrap(), b"two");
        s.send(&kept.sender_id, b"four".to_vec()).unwrap();
        assert_eq!(s.receive(&kept.recipient_id).unwrap().unwrap(), b"three");
        assert_eq!(s.receive(&kept.recipient_id).unwrap().unwrap(), b"four");
        assert_eq!(s.receive(&kept.recipient_id).unwrap(), None);
        assert_eq!(s.send(&gone.sender_id, vec![1]), Err(QueueError::NotFound));
        assert_eq!(s.receive(&gone.recipient_id), Err(QueueError::NotFound));
    }

    #[test]
    fn opening_drops_what_was_received_from_the_file() {
        let path = TempPath::new();
        {
            let mut s = Store::open(&path.0).unwrap();
            let q = s.create().unwrap();
            for _ in 0..50 {
                s.send(&q.sender_id, vec![7; 1000]).unwrap();
                s.receive(&q.recipient_id).unwrap().unwrap();
            }
        }
        let before = std::fs::metadata(&path.0).unwrap().len();
        drop(Store::open(&path.0).unwrap());
        let after = std::fs::metadata(&path.0).unwrap().len();
        assert!(before > 50 * 1000);
        // The queue alone, with the day it was last used.
        assert_eq!(after, (journal::HEADER.len() + 1 + 24 + 24 + 8) as u64);
    }

    #[test]
    fn a_record_cut_short_is_skipped() {
        let path = TempPath::new();
        let q = {
            let mut s = Store::open(&path.0).unwrap();
            let q = s.create().unwrap();
            s.send(&q.sender_id, b"whole".to_vec()).unwrap();
            q
        };
        // What a crash in the middle of the next SEND would leave.
        let mut torn = vec![2u8];
        torn.extend_from_slice(&q.recipient_id);
        torn.extend_from_slice(&100u32.to_be_bytes());
        torn.extend_from_slice(b"part");
        let mut file = std::fs::OpenOptions::new()
            .append(true)
            .open(&path.0)
            .unwrap();
        std::io::Write::write_all(&mut file, &torn).unwrap();
        drop(file);

        let mut s = Store::open(&path.0).unwrap();
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"whole");
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);
    }

    #[test]
    fn a_file_that_is_not_a_journal_is_left_alone() {
        let path = TempPath::new();
        std::fs::write(&path.0, b"something else entirely").unwrap();
        assert!(Store::open(&path.0).is_err());
        assert_eq!(std::fs::read(&path.0).unwrap(), b"something else entirely");
    }

    #[test]
    fn the_journal_is_rewritten_once_mostly_dead() {
        let path = TempPath::new();
        let mut s = Store::open(&path.0).unwrap();
        let q = s.create().unwrap();
        // About 6 MiB through the queue, all received, so the file must have
        // been rewritten on the way instead of holding all of it.
        for _ in 0..100 {
            s.send(&q.sender_id, vec![1; 64 * 1024]).unwrap();
            s.receive(&q.recipient_id).unwrap().unwrap();
        }
        let len = s.journal.as_ref().unwrap().len();
        assert!(len < 5 << 20, "journal is {len} bytes");
        assert_eq!(len, std::fs::metadata(&path.0).unwrap().len());
        s.send(&q.sender_id, b"after".to_vec()).unwrap();
        drop(s);
        let mut s = Store::open(&path.0).unwrap();
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"after");
    }

    use std::sync::atomic::AtomicU64;

    static NOW: AtomicU64 = AtomicU64::new(1_800_000_000);
    fn fake_now() -> u64 {
        NOW.load(Ordering::SeqCst)
    }

    // One test moves the fake clock, so all of them that use it run in this one.
    #[test]
    fn messages_expire_after_the_ttl() {
        let day = 24 * 60 * 60;
        let mut s = Store {
            clock: fake_now,
            ..Store::with_ttl(14 * day)
        };
        let q = s.create().unwrap();
        s.send(&q.sender_id, b"old".to_vec()).unwrap();
        NOW.fetch_add(10 * day, Ordering::SeqCst);
        s.send(&q.sender_id, b"newer".to_vec()).unwrap();
        NOW.fetch_add(5 * day, Ordering::SeqCst);
        // "old" is 15 days old now, "newer" 5.
        assert_eq!(s.expire(), 1);
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"newer");
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);

        // An expired message is never handed over, even before a sweep.
        s.send(&q.sender_id, b"gone".to_vec()).unwrap();
        NOW.fetch_add(15 * day, Ordering::SeqCst);
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);

        // A full queue makes room as its old messages expire.
        for _ in 0..MAX_QUEUED {
            s.send(&q.sender_id, vec![0]).unwrap();
        }
        assert_eq!(s.send(&q.sender_id, vec![0]), Err(QueueError::Full));
        NOW.fetch_add(15 * day, Ordering::SeqCst);
        assert_eq!(s.send(&q.sender_id, b"room".to_vec()), Ok(()));
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"room");

        // Kept on disk with the hour it came, and expired on the way back in.
        let path = TempPath::new();
        let q = {
            let mut s = Store::open_clocked(&path.0, 14 * day, fake_now).unwrap();
            let q = s.create().unwrap();
            s.send(&q.sender_id, b"first".to_vec()).unwrap();
            NOW.fetch_add(7 * day, Ordering::SeqCst);
            s.send(&q.sender_id, b"second".to_vec()).unwrap();
            q
        };
        NOW.fetch_add(8 * day, Ordering::SeqCst);
        let mut s = Store::open_clocked(&path.0, 14 * day, fake_now).unwrap();
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"second");
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);

        // Only the hour is kept, not the second.
        let at = s.hour();
        assert_eq!(at % 3600, 0);
        assert!(at <= fake_now() && fake_now() - at < 3600);
    }

    #[test]
    fn a_journal_from_before_expiry_still_opens() {
        let path = TempPath::new();
        let mut old = journal::OLD_HEADER.to_vec();
        let (recipient, sender) = ([1u8; 24], [2u8; 24]);
        old.push(1);
        old.extend_from_slice(&recipient);
        old.extend_from_slice(&sender);
        old.push(2);
        old.extend_from_slice(&recipient);
        old.extend_from_slice(&5u32.to_be_bytes());
        old.extend_from_slice(b"hello");
        std::fs::write(&path.0, &old).unwrap();
        let mut s = Store::open(&path.0).unwrap();
        assert_eq!(s.receive(&recipient).unwrap().unwrap(), b"hello");
    }

    #[test]
    fn the_store_holds_so_many_queues() {
        let mut s = Store::default().with_queue_limits(2, DEFAULT_QUEUE_TTL);
        let first = s.create().unwrap();
        s.create().unwrap();
        assert!(!s.has_room());
        assert_eq!(s.create().err(), Some(QueueError::Full));
        s.delete(&first.recipient_id).unwrap();
        assert!(s.has_room());
        s.create().unwrap();
    }

    fn fixed_now() -> u64 {
        1_800_000_000
    }

    #[test]
    fn a_queue_from_before_queues_expired_counts_as_used_the_day_it_is_read_back() {
        let path = TempPath::new();
        let mut old = journal::OLD_HEADER.to_vec();
        let (recipient, sender) = ([3u8; 24], [4u8; 24]);
        old.push(1);
        old.extend_from_slice(&recipient);
        old.extend_from_slice(&sender);
        std::fs::write(&path.0, &old).unwrap();
        let s = Store::open_clocked(&path.0, DEFAULT_TTL, fixed_now).unwrap();
        let day = fixed_now() / DAY * DAY;
        assert_eq!(s.queues[&recipient].used, day);
        drop(s);
        // Written back with that day, under the header older relays do not take.
        let bytes = std::fs::read(&path.0).unwrap();
        assert_eq!(&bytes[..8], journal::HEADER);
        assert_ne!(journal::HEADER, journal::OLD_HEADER);
        assert_eq!(&bytes[bytes.len() - 8..], &day.to_be_bytes());
    }

    static QUEUE_NOW: AtomicU64 = AtomicU64::new(1_800_000_000);
    fn queue_now() -> u64 {
        QUEUE_NOW.load(Ordering::SeqCst)
    }

    // One test moves this clock, so all of them that use it run in this one.
    #[test]
    fn queues_their_recipients_leave_unused_expire() {
        let path = TempPath::new();
        let open = || {
            Store::open_clocked(&path.0, DEFAULT_TTL, queue_now)
                .unwrap()
                .with_queue_limits(DEFAULT_MAX_QUEUES, 180 * DAY)
        };
        let written = |s: &Store| s.journal.as_ref().unwrap().len();
        let mut s = open();
        let used = s.create().unwrap();
        let sent_to = s.create().unwrap();

        // Used again the day it was made: nothing more is written.
        let before = written(&s);
        assert_eq!(s.receive(&used.recipient_id).unwrap(), None);
        assert_eq!(s.has_waiting(&used.recipient_id), Ok(false));
        assert_eq!(written(&s), before);

        // The next day, its first use is written, and only that one.
        QUEUE_NOW.fetch_add(DAY, Ordering::SeqCst);
        assert_eq!(s.has_waiting(&used.recipient_id), Ok(false));
        assert_eq!(written(&s), before + 1 + 24 + 8);
        assert_eq!(s.receive(&used.recipient_id).unwrap(), None);
        assert_eq!(written(&s), before + 1 + 24 + 8);
        // Only the day is kept, not the second.
        assert_eq!(s.queues[&used.recipient_id].used % DAY, 0);

        // Sending to a queue is no use of it.
        QUEUE_NOW.fetch_add(100 * DAY, Ordering::SeqCst);
        s.send(&sent_to.sender_id, b"for nobody".to_vec()).unwrap();
        assert_eq!(s.receive(&used.recipient_id).unwrap(), None);
        assert!(s.expire_queues().is_empty());
        drop(s);

        // 181 days after it was made, kept through a restart: the one only
        // sent to goes, with what waits in it; the one used 80 days ago stays.
        QUEUE_NOW.fetch_add(80 * DAY, Ordering::SeqCst);
        let mut s = open();
        assert_eq!(s.expire_queues(), vec![sent_to.recipient_id]);
        assert_eq!(
            s.send(&sent_to.sender_id, vec![1]),
            Err(QueueError::NotFound)
        );
        assert_eq!(s.receive(&used.recipient_id).unwrap(), None);
        drop(s);
        // Its going was written down too.
        let mut s = open();
        assert_eq!(s.receive(&sent_to.recipient_id), Err(QueueError::NotFound));
        assert!(s.expire_queues().is_empty());
        QUEUE_NOW.fetch_add(180 * DAY, Ordering::SeqCst);
        assert_eq!(s.expire_queues(), vec![used.recipient_id]);
        assert_eq!(s.has_waiting(&used.recipient_id), Err(QueueError::NotFound));
    }

    #[cfg(unix)]
    #[test]
    fn only_the_owner_can_read_the_journal() {
        use std::os::unix::fs::PermissionsExt;
        let path = TempPath::new();
        drop(Store::open(&path.0).unwrap());
        let mode = std::fs::metadata(&path.0).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, 0o600);
    }
}
