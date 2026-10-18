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
pub(crate) const HOUR: u64 = 60 * 60;

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
}

pub struct Store {
    queues: HashMap<QueueId, Queue>,
    by_sender: HashMap<QueueId, QueueId>,
    journal: Option<Journal>,
    ttl: u64,
    clock: fn() -> u64,
}

impl Default for Store {
    fn default() -> Self {
        Store {
            queues: HashMap::new(),
            by_sender: HashMap::new(),
            journal: None,
            ttl: DEFAULT_TTL,
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

    /// The hour that holds now, the time noted for a message that comes now.
    fn hour(&self) -> u64 {
        ((self.clock)() / HOUR * HOUR).max(1)
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
            } => {
                self.queues.insert(
                    recipient_id,
                    Queue {
                        sender_id,
                        messages: VecDeque::new(),
                    },
                );
                self.by_sender.insert(sender_id, recipient_id);
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

    pub fn create(&mut self) -> Result<NewQueue, QueueError> {
        let recipient_id = random_id();
        let sender_id = random_id();
        log(
            &mut self.journal,
            &Record::Create {
                recipient_id,
                sender_id,
            },
        )?;
        self.queues.insert(
            recipient_id,
            Queue {
                sender_id,
                messages: VecDeque::new(),
            },
        );
        self.by_sender.insert(sender_id, recipient_id);
        self.tidy();
        Ok(NewQueue {
            recipient_id,
            sender_id,
        })
    }

    pub fn send(&mut self, sender_id: &QueueId, msg: Vec<u8>) -> Result<(), QueueError> {
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
        self.tidy();
        Ok(())
    }

    /// Hands over the oldest message and deletes it from the relay.
    pub fn receive(&mut self, recipient_id: &QueueId) -> Result<Option<Vec<u8>>, QueueError> {
        self.expire_queue(recipient_id)?;
        let q = self
            .queues
            .get_mut(recipient_id)
            .ok_or(QueueError::NotFound)?;
        if q.messages.is_empty() {
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
        assert_eq!(after, (journal::HEADER.len() + 1 + 24 + 24) as u64);
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
        let mut old = journal::HEADER.to_vec();
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
