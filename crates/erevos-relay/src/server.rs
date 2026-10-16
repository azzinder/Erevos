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
//! - `DELETE`: recipient id.
//!
//! A message longer than `MAX_MESSAGE` or an unknown opcode closes the
//! connection.
//!
//! The WebSocket front end can require a bearer token in the `Authorization`
//! header (see `serve_ws`). Neither front end speaks TLS: put the WebSocket
//! behind a TLS proxy before it leaves the local network.
//!
//! Not audited.

use std::io::{self, Cursor, ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

use tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tungstenite::http::StatusCode;
use tungstenite::Message;

use crate::queue::{QueueError, QueueId, Store};

pub type SharedStore = Arc<Mutex<Store>>;

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
/// handshake or it is refused with 401.
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

fn handle_tcp(mut stream: TcpStream, store: &Mutex<Store>) -> io::Result<()> {
    while let Some(reply) = respond(&mut stream, store)? {
        stream.write_all(&reply)?;
    }
    Ok(())
}

// The error type of the handshake callback is fixed by tungstenite, so it cannot be boxed here.
#[allow(clippy::result_large_err)]
fn handle_ws(stream: TcpStream, store: &Mutex<Store>, token: Option<&str>) -> io::Result<()> {
    let check = |request: &Request, response: Response| match token {
        Some(expected) if !is_authorized(request, expected) => Err(unauthorized()),
        _ => Ok(response),
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
                let Some(reply) = respond(&mut Cursor::new(request), store)? else {
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
fn respond(r: &mut impl Read, store: &Mutex<Store>) -> io::Result<Option<Vec<u8>>> {
    let mut op = [0u8; 1];
    match r.read_exact(&mut op) {
        Ok(()) => {}
        Err(e) if e.kind() == ErrorKind::UnexpectedEof => return Ok(None),
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
            let sender = read_id(r)?;
            let msg = read_message(r)?;
            status(store.lock().expect("store lock").send(&sender, msg))
        }
        RECEIVE => {
            let recipient = read_id(r)?;
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
            let recipient = read_id(r)?;
            status(store.lock().expect("store lock").delete(&recipient))
        }
        _ => return Err(io::Error::new(ErrorKind::InvalidData, "unknown opcode")),
    };
    Ok(Some(reply))
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

fn to_io(e: impl std::fmt::Display) -> io::Error {
    io::Error::other(e.to_string())
}

fn is_authorized(request: &Request, expected: &str) -> bool {
    let presented = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok());
    let expected = format!("Bearer {expected}");
    presented.is_some_and(|presented| constant_time_eq(presented.as_bytes(), expected.as_bytes()))
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
    use std::net::SocketAddr;
    use tungstenite::client::IntoClientRequest;
    use tungstenite::stream::MaybeTlsStream;
    use tungstenite::WebSocket;

    fn start() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Arc::new(Mutex::new(Store::default()));
        thread::spawn(move || serve(listener, store));
        addr
    }

    fn start_ws(token: Option<&str>) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let store = Arc::new(Mutex::new(Store::default()));
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
}
