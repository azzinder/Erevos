//! One-way queues in the style of SimpleX's SMP: each queue has a sender id
//! and a separate recipient id, so the relay cannot link the two from what a
//! client asks for, and senders cannot read or delete what they sent.
//!
//! A store opened from a journal (see `journal.rs`) writes every change to
//! disk before applying it, so queues and waiting messages survive a restart.
//! `Store::default()` keeps everything in memory only.

use std::collections::{HashMap, VecDeque};
use std::io;
use std::path::Path;

use rand::RngCore;

use crate::journal::{self, Journal, Record};

pub type QueueId = [u8; 24];

/// Messages a queue holds before it refuses more, so one sender cannot fill
/// the relay.
pub const MAX_QUEUED: usize = 1000;

#[derive(Debug, PartialEq, Eq)]
pub enum QueueError {
    NotFound,
    Full,
    /// The change could not be written to the journal, so nothing changed.
    Storage,
}

struct Queue {
    sender_id: QueueId,
    messages: VecDeque<Vec<u8>>,
}

#[derive(Default)]
pub struct Store {
    queues: HashMap<QueueId, Queue>,
    by_sender: HashMap<QueueId, QueueId>,
    journal: Option<Journal>,
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
        .chain(q.messages.iter().map(|message| Record::Send {
            recipient_id: *recipient_id,
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
    /// Opens the store kept in the journal at `path`, or starts an empty one
    /// there if the file does not exist yet. The file is rewritten on the way,
    /// which drops received messages and deleted queues from it.
    pub fn open(path: &Path) -> io::Result<Store> {
        let mut store = Store::default();
        let skipped = journal::replay(path, |record| store.apply(record))?;
        if skipped > 0 {
            eprintln!(
                "erevos-relay: skipped {skipped} bytes at the end of {}, left by a write that did not finish",
                path.display()
            );
        }
        store.journal = Some(Journal::create(path, records(&store.queues))?);
        Ok(store)
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
                message,
            } => {
                if let Some(q) = self.queues.get_mut(&recipient_id) {
                    q.messages.push_back(message.to_vec());
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
        let q = self.queues.get_mut(&rid).ok_or(QueueError::NotFound)?;
        if q.messages.len() >= MAX_QUEUED {
            return Err(QueueError::Full);
        }
        log(
            &mut self.journal,
            &Record::Send {
                recipient_id: rid,
                message: &msg,
            },
        )?;
        q.messages.push_back(msg);
        self.tidy();
        Ok(())
    }

    /// Hands over the oldest message and deletes it from the relay.
    pub fn receive(&mut self, recipient_id: &QueueId) -> Result<Option<Vec<u8>>, QueueError> {
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
        let msg = q.messages.pop_front();
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
