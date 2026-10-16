//! TCP front end for the queue store. Each request is one opcode byte
//! followed by its fields; each reply starts with a status byte. Connections
//! stay open for any number of requests.
//!
//! Requests:
//! - `CREATE`: no fields. Reply: recipient id, sender id (24 bytes each).
//! - `SEND`: sender id, then a 4-byte length and the message.
//! - `RECEIVE`: recipient id. Reply: a 1-byte flag, then a length and the
//!   message if one was waiting. The message is deleted from the relay.
//! - `DELETE`: recipient id.
//!
//! A message longer than `MAX_MESSAGE` or an unknown opcode closes the
//! connection.
//!
//! Not audited.

use std::io::{self, ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

use crate::queue::{QueueError, QueueId, Store};

/// Largest message a sender may queue. Above the padding top bucket, to
/// leave room for the sealing overhead.
pub const MAX_MESSAGE: usize = 64 * 1024;

pub const CREATE: u8 = 1;
pub const SEND: u8 = 2;
pub const RECEIVE: u8 = 3;
pub const DELETE: u8 = 4;

pub const OK: u8 = 0;
pub const NOT_FOUND: u8 = 1;
pub const FULL: u8 = 2;

/// Serves connections until the listener fails. Each connection gets its
/// own thread; all share one store.
pub fn serve(listener: TcpListener) -> io::Result<()> {
    let store = Arc::new(Mutex::new(Store::default()));
    loop {
        let (stream, _) = listener.accept()?;
        let store = Arc::clone(&store);
        thread::spawn(move || {
            // A bad client only loses its own connection.
            let _ = handle(stream, &store);
        });
    }
}

fn handle(mut stream: TcpStream, store: &Mutex<Store>) -> io::Result<()> {
    loop {
        let mut op = [0u8; 1];
        match stream.read_exact(&mut op) {
            Ok(()) => {}
            Err(e) if e.kind() == ErrorKind::UnexpectedEof => return Ok(()),
            Err(e) => return Err(e),
        }
        let reply = match op[0] {
            CREATE => {
                let q = store.lock().expect("store lock").create();
                let mut out = vec![OK];
                out.extend_from_slice(&q.recipient_id);
                out.extend_from_slice(&q.sender_id);
                out
            }
            SEND => {
                let sender = read_id(&mut stream)?;
                let msg = read_message(&mut stream)?;
                status(store.lock().expect("store lock").send(&sender, msg))
            }
            RECEIVE => {
                let recipient = read_id(&mut stream)?;
                let got = store.lock().expect("store lock").receive(&recipient);
                match got {
                    Ok(Some(msg)) => {
                        let mut out = vec![OK, 1];
                        out.extend_from_slice(&(msg.len() as u32).to_be_bytes());
                        out.extend_from_slice(&msg);
                        out
                    }
                    Ok(None) => vec![OK, 0],
                    Err(_) => vec![NOT_FOUND],
                }
            }
            DELETE => {
                let recipient = read_id(&mut stream)?;
                status(store.lock().expect("store lock").delete(&recipient))
            }
            _ => return Err(io::Error::new(ErrorKind::InvalidData, "unknown opcode")),
        };
        stream.write_all(&reply)?;
    }
}

fn status(result: Result<(), QueueError>) -> Vec<u8> {
    vec![match result {
        Ok(()) => OK,
        Err(QueueError::NotFound) => NOT_FOUND,
        Err(QueueError::Full) => FULL,
    }]
}

fn read_id(r: &mut impl Read) -> io::Result<QueueId> {
    let mut id = [0u8; 24];
    r.read_exact(&mut id)?;
    Ok(id)
}

fn read_message(r: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut len = [0u8; 4];
    r.read_exact(&mut len)?;
    let len = u32::from_be_bytes(len) as usize;
    if len > MAX_MESSAGE {
        return Err(io::Error::new(ErrorKind::InvalidData, "message too large"));
    }
    let mut msg = vec![0u8; len];
    r.read_exact(&mut msg)?;
    Ok(msg)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::SocketAddr;

    fn start() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        thread::spawn(move || serve(listener));
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

    #[test]
    fn message_goes_from_sender_to_recipient_once() {
        let mut s = TcpStream::connect(start()).unwrap();
        let (recipient, sender) = create(&mut s);
        assert_eq!(send(&mut s, &sender, b"hello"), OK);
        assert_eq!(receive(&mut s, &recipient).as_deref(), Some(&b"hello"[..]));
        assert_eq!(receive(&mut s, &recipient), None);
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
}
