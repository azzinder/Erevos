//! One-way queues in the style of SimpleX's SMP: each queue has a sender id
//! and a separate recipient id, so the relay cannot link the two from what a
//! client asks for, and senders cannot read or delete what they sent.

use std::collections::{HashMap, VecDeque};

use rand::RngCore;

pub type QueueId = [u8; 24];

/// Messages a queue holds before it refuses more, so one sender cannot fill
/// the relay.
pub const MAX_QUEUED: usize = 1000;

#[derive(Debug, PartialEq, Eq)]
pub enum QueueError {
    NotFound,
    Full,
}

#[derive(Default)]
struct Queue {
    messages: VecDeque<Vec<u8>>,
}

#[derive(Default)]
pub struct Store {
    queues: HashMap<QueueId, Queue>,
    by_sender: HashMap<QueueId, QueueId>,
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


impl Store {
    pub fn create(&mut self) -> NewQueue {
        let recipient_id = random_id();
        let sender_id = random_id();
        self.queues.insert(recipient_id, Queue::default());
        self.by_sender.insert(sender_id, recipient_id);
        NewQueue { recipient_id, sender_id }
    }

    pub fn send(&mut self, sender_id: &QueueId, msg: Vec<u8>) -> Result<(), QueueError> {
        let rid = self.by_sender.get(sender_id).ok_or(QueueError::NotFound)?;
        let q = self.queues.get_mut(rid).ok_or(QueueError::NotFound)?;
        if q.messages.len() >= MAX_QUEUED {
            return Err(QueueError::Full);
        }
        q.messages.push_back(msg);
        Ok(())
    }

    /// Hands over the oldest message and deletes it from the relay.
    pub fn receive(&mut self, recipient_id: &QueueId) -> Result<Option<Vec<u8>>, QueueError> {
        let q = self.queues.get_mut(recipient_id).ok_or(QueueError::NotFound)?;
        Ok(q.messages.pop_front())
    }

    pub fn delete(&mut self, recipient_id: &QueueId) -> Result<(), QueueError> {
        self.queues.remove(recipient_id).ok_or(QueueError::NotFound)?;
        self.by_sender.retain(|_, rid| rid != recipient_id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn delivers_in_order_and_deletes_on_receive() {
        let mut s = Store::default();
        let q = s.create();
        s.send(&q.sender_id, b"one".to_vec()).unwrap();
        s.send(&q.sender_id, b"two".to_vec()).unwrap();
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"one");
        assert_eq!(s.receive(&q.recipient_id).unwrap().unwrap(), b"two");
        assert_eq!(s.receive(&q.recipient_id).unwrap(), None);
    }

    #[test]
    fn ids_are_not_interchangeable() {
        let mut s = Store::default();
        let q = s.create();
        assert_eq!(s.receive(&q.sender_id), Err(QueueError::NotFound));
        assert_eq!(s.send(&q.recipient_id, vec![1]), Err(QueueError::NotFound));
    }

    #[test]
    fn full_and_deleted_queues() {
        let mut s = Store::default();
        let q = s.create();
        for _ in 0..MAX_QUEUED {
            s.send(&q.sender_id, vec![0]).unwrap();
        }
        assert_eq!(s.send(&q.sender_id, vec![0]), Err(QueueError::Full));
        s.delete(&q.recipient_id).unwrap();
        assert_eq!(s.send(&q.sender_id, vec![0]), Err(QueueError::NotFound));
    }
}
