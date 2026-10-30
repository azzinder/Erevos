//! A Matrix push gateway (the Push Gateway API of the Matrix spec, `POST
//! /_matrix/push/v1/notify`), so that a space closed on a phone can say a
//! message came on its Matrix account. The space makes a queue here and sets
//! a pusher on its homeserver whose push key is that queue's sender id, in
//! hex, with the format `event_id_only`. Each notification of a Matrix event
//! then counts one message in the queue's news (`Store::wake`), which the
//! phone asks of while the space is closed (`NEWS`, `NEWS_ANY`), as it asks
//! of the space's own queues.
//!
//! Nothing else is done with what the homeserver sends: the room and the
//! event are read past, only the push keys are taken, and nothing is kept,
//! not in the journal, not in the queue, which stays empty. A notification
//! with no event, only a new count of what is not read, wakes nothing. A push
//! key that is no queue here is rejected, so the homeserver drops its pusher,
//! as the spec has it.
//!
//! Anyone may post here, as on the paths that need no token: a push key is a
//! queue's sender id, which only its phone and its homeserver know, and a push
//! can do no more than count one more message in that queue's news. Off with
//! `EREVOS_RELAY_MATRIX_PUSH=off`; a proxy in front must pass the path as
//! plain HTTP.

use std::io::{self, ErrorKind, Read, Write};
use std::net::TcpStream;
use std::thread;
use std::time::{Duration, Instant};

use crate::queue::{QueueError, QueueId};
use crate::server::Shared;

/// The path homeservers post to, as the spec fixes it.
pub const NOTIFY_PATH: &str = "/_matrix/push/v1/notify";
/// The longest head of a request taken.
const MAX_HEAD: usize = 8 * 1024;
/// The longest body taken: a notification is a few hundred bytes.
const MAX_BODY: usize = 64 * 1024;
/// The most push keys one notification may name: a homeserver sends one.
const MAX_DEVICES: usize = 20;

/// Whether the connection's first line asks for `NOTIFY_PATH`, looked at
/// without taking it, so a WebSocket handshake is read as before.
pub fn is_notify(stream: &TcpStream, deadline: Instant) -> io::Result<bool> {
    let mut buf = [0u8; 512];
    loop {
        let left = deadline.saturating_duration_since(Instant::now());
        if left.is_zero() {
            return Err(ErrorKind::TimedOut.into());
        }
        stream.set_read_timeout(Some(left))?;
        let n = stream.peek(&mut buf)?;
        if n == 0 {
            return Ok(false);
        }
        let seen = &buf[..n];
        let end = seen.windows(2).position(|w| w == b"\r\n");
        if end.is_some() || n == buf.len() {
            return Ok(notify_line(&seen[..end.unwrap_or(n)]));
        }
        thread::sleep(Duration::from_millis(10));
    }
}

fn notify_line(line: &[u8]) -> bool {
    let line = String::from_utf8_lossy(line);
    let mut parts = line.split(' ');
    parts
        .next()
        .is_some_and(|method| method == "POST" || method == "GET")
        && parts.next().is_some_and(|target| {
            target
                .split('?')
                .next()
                .unwrap_or_default()
                .ends_with(NOTIFY_PATH)
        })
}

/// Answers one request on the connection: a notification's push keys woken,
/// those that are no queue here rejected.
pub fn serve(stream: &mut (impl Read + Write), shared: &Shared) -> io::Result<()> {
    let (status, body) = match read_request(stream) {
        Ok((method, body)) if method == "POST" => match push_keys(&body) {
            Some((keys, event)) => (200, rejected(&wake(shared, &keys, event))),
            None => (400, error("M_NOT_JSON", "Not a notification")),
        },
        Ok(_) => (405, error("M_UNRECOGNIZED", "Only POST")),
        Err(e) if e.kind() == ErrorKind::InvalidData => {
            (400, error("M_BAD_JSON", "Not a notification"))
        }
        Err(e) => return Err(e),
    };
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        _ => "Method Not Allowed",
    };
    let head = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(head.as_bytes())?;
    stream.write_all(body.as_bytes())?;
    stream.flush()
}

fn error(code: &str, text: &str) -> String {
    serde_json::json!({ "errcode": code, "error": text }).to_string()
}

fn rejected(keys: &[String]) -> String {
    serde_json::json!({ "rejected": keys }).to_string()
}

/// The push keys a notification names, and whether it is about an event
/// (a count of what is not read alone is not). None when it is no
/// notification.
fn push_keys(body: &[u8]) -> Option<(Vec<String>, bool)> {
    let value: serde_json::Value = serde_json::from_slice(body).ok()?;
    let notification = value.get("notification")?.as_object()?;
    let devices = match notification.get("devices") {
        Some(devices) => devices.as_array()?.as_slice(),
        None => &[],
    };
    let keys = devices
        .iter()
        .take(MAX_DEVICES)
        .filter_map(|device| device.get("pushkey")?.as_str().map(str::to_string))
        .collect();
    let event = notification
        .get("event_id")
        .and_then(|id| id.as_str())
        .is_some_and(|id| !id.is_empty());
    Some((keys, event))
}

/// The sender id a push key names: 24 bytes in hex.
pub(crate) fn sender_of(key: &str) -> Option<QueueId> {
    if key.len() != 48 {
        return None;
    }
    let mut id = [0u8; 24];
    for (i, pair) in key.as_bytes().chunks(2).enumerate() {
        let text = std::str::from_utf8(pair).ok()?;
        id[i] = u8::from_str_radix(text, 16).ok()?;
    }
    Some(id)
}

/// Counts a message in each queue the keys name, when the notification is
/// about an event; answers the keys that name none.
fn wake(shared: &Shared, keys: &[String], event: bool) -> Vec<String> {
    let mut rejected = Vec::new();
    let mut woke = false;
    {
        let mut store = shared.store();
        for key in keys {
            let Some(sender) = sender_of(key) else {
                rejected.push(key.clone());
                continue;
            };
            if !event {
                if store.recipient_of(&sender).is_none() {
                    rejected.push(key.clone());
                }
                continue;
            }
            match store.wake(&sender) {
                Ok(()) => woke = true,
                Err(QueueError::NotFound) => rejected.push(key.clone()),
                // Not counted, as the journal could not be written: the
                // homeserver keeps its pusher.
                Err(_) => {}
            }
        }
    }
    if woke {
        shared.arrived.notify_all();
    }
    rejected
}

fn read_request(stream: &mut impl Read) -> io::Result<(String, Vec<u8>)> {
    let invalid = |why: &str| io::Error::new(ErrorKind::InvalidData, why.to_string());
    let mut data = Vec::new();
    let mut buf = [0u8; 2048];
    loop {
        let n = stream.read(&mut buf)?;
        if n == 0 {
            return Err(ErrorKind::UnexpectedEof.into());
        }
        data.extend_from_slice(&buf[..n]);
        let mut headers = [httparse::EMPTY_HEADER; 64];
        let mut request = httparse::Request::new(&mut headers);
        let at = match request.parse(&data).map_err(|_| invalid("not HTTP"))? {
            httparse::Status::Complete(at) => at,
            httparse::Status::Partial if data.len() < MAX_HEAD => continue,
            httparse::Status::Partial => return Err(invalid("HTTP head too long")),
        };
        let header = |name: &str| {
            request
                .headers
                .iter()
                .find(|h| h.name.eq_ignore_ascii_case(name))
                .map(|h| String::from_utf8_lossy(h.value).trim().to_ascii_lowercase())
                .unwrap_or_default()
        };
        let method = request.method.unwrap_or_default().to_string();
        let chunked = header("transfer-encoding").contains("chunked");
        let length: usize = match header("content-length").as_str() {
            "" => 0,
            text => text.parse().map_err(|_| invalid("bad Content-Length"))?,
        };
        let mut body = data[at..].to_vec();
        if chunked {
            return Ok((method, read_chunked(stream, body)?));
        }
        if length > MAX_BODY {
            return Err(invalid("too long"));
        }
        while body.len() < length {
            let n = stream.read(&mut buf)?;
            if n == 0 {
                return Err(ErrorKind::UnexpectedEof.into());
            }
            body.extend_from_slice(&buf[..n]);
        }
        body.truncate(length);
        return Ok((method, body));
    }
}

/// A body sent in chunks, from what came with the head on.
fn read_chunked(stream: &mut impl Read, mut data: Vec<u8>) -> io::Result<Vec<u8>> {
    let invalid = |why: &str| io::Error::new(ErrorKind::InvalidData, why.to_string());
    let mut body = Vec::new();
    let mut buf = [0u8; 2048];
    let mut more = |data: &mut Vec<u8>| -> io::Result<()> {
        if data.len() > MAX_BODY + MAX_HEAD {
            return Err(invalid("too long"));
        }
        let n = stream.read(&mut buf)?;
        if n == 0 {
            return Err(ErrorKind::UnexpectedEof.into());
        }
        data.extend_from_slice(&buf[..n]);
        Ok(())
    };
    loop {
        let Some(end) = data.windows(2).position(|w| w == b"\r\n") else {
            more(&mut data)?;
            continue;
        };
        let line = String::from_utf8_lossy(&data[..end]).to_string();
        let size = usize::from_str_radix(line.split(';').next().unwrap_or_default().trim(), 16)
            .map_err(|_| invalid("bad chunk"))?;
        if size == 0 {
            return Ok(body);
        }
        if body.len() + size > MAX_BODY {
            return Err(invalid("too long"));
        }
        while data.len() < end + 2 + size + 2 {
            more(&mut data)?;
        }
        body.extend_from_slice(&data[end + 2..end + 2 + size]);
        data.drain(..end + 2 + size + 2);
    }
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::{SocketAddr, TcpListener, TcpStream};
    use std::sync::Arc;
    use std::thread;

    use super::*;
    use crate::files::FileStore;
    use crate::queue::{News, Store};
    use crate::server::{serve_ws, Limits, SharedStore};
    use crate::tokens::to_hex;

    fn start(limits: Limits) -> (SocketAddr, SharedStore) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let shared = Shared::new(Store::default(), FileStore::default(), None, None, limits);
        let served = Arc::clone(&shared);
        thread::spawn(move || serve_ws(listener, served, Some(Arc::from("secret"))));
        (addr, shared)
    }

    /// The status and body of a request to the WebSocket port, as a
    /// homeserver makes it; a status of 0 when the relay closed without one.
    fn post(addr: SocketAddr, method: &str, path: &str, head: &str, body: &[u8]) -> (u16, String) {
        let mut stream = TcpStream::connect(addr).unwrap();
        write!(stream, "{method} {path} HTTP/1.1\r\nHost: erevos.example.org\r\nContent-Type: application/json\r\n{head}\r\n").unwrap();
        stream.write_all(body).unwrap();
        let mut reply = Vec::new();
        let _ = stream.read_to_end(&mut reply);
        let reply = String::from_utf8_lossy(&reply).to_string();
        let Some((head, body)) = reply.split_once("\r\n\r\n") else {
            return (0, String::new());
        };
        (
            head.split(' ').nth(1).unwrap().parse().unwrap(),
            body.to_string(),
        )
    }

    fn notify(addr: SocketAddr, body: &str) -> (u16, String) {
        post(
            addr,
            "POST",
            NOTIFY_PATH,
            &format!("Content-Length: {}\r\n", body.len()),
            body.as_bytes(),
        )
    }

    fn event(keys: &[&str]) -> String {
        let devices: Vec<_> = keys
            .iter()
            .map(|key| serde_json::json!({ "app_id": "erevos", "pushkey": key }))
            .collect();
        serde_json::json!({ "notification": { "event_id": "$abc", "room_id": "!r:example.org", "counts": { "unread": 2 }, "prio": "high", "devices": devices } }).to_string()
    }

    #[test]
    fn a_homeserver_push_counts_a_message_in_the_queue_its_key_names_and_keeps_nothing() {
        let (addr, shared) = start(Limits::default());
        let queue = shared.store().create().unwrap();
        let key = to_hex(&queue.sender_id);
        let other = shared.store().create().unwrap();
        let gone = "ab".repeat(24);

        assert_eq!(
            notify(addr, &event(&[&key])),
            (200, r#"{"rejected":[]}"#.to_string())
        );
        let news = shared.store().news(&queue.recipient_id).unwrap();
        assert_eq!((news.messages, news.unmarked, news.rings), (1, 0, 0));
        assert_ne!(news.round, 0);
        // Nothing waits in the queue, and no other queue heard of it.
        assert!(!shared.store().has_waiting(&queue.recipient_id).unwrap());
        assert_eq!(
            shared.store().news(&other.recipient_id).unwrap(),
            News::default()
        );

        // Again, in the same round; a key that is no queue here, or no key at all, is rejected.
        assert_eq!(
            notify(addr, &event(&[&key, &gone, "not hex"])),
            (200, format!(r#"{{"rejected":["{gone}","not hex"]}}"#))
        );
        let again = shared.store().news(&queue.recipient_id).unwrap();
        assert_eq!((again.round, again.messages), (news.round, 2));

        // A new count of what is not read alone wakes nothing, but says which keys are gone.
        let counts = serde_json::json!({ "notification": { "counts": { "unread": 0 }, "devices": [{ "pushkey": key }, { "pushkey": gone }] } }).to_string();
        assert_eq!(
            notify(addr, &counts),
            (200, format!(r#"{{"rejected":["{gone}"]}}"#))
        );
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            2
        );

        // Taking from the empty queue starts the count anew, as for any queue.
        assert_eq!(shared.store().receive(&queue.recipient_id).unwrap(), None);
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap(),
            News::default()
        );
    }

    #[test]
    fn a_push_sent_in_chunks_is_read_and_anything_else_is_refused() {
        let (addr, shared) = start(Limits::default());
        let queue = shared.store().create().unwrap();
        let body = event(&[&to_hex(&queue.sender_id)]);
        let (first, rest) = body.split_at(10);
        let chunked = format!(
            "{:x}\r\n{first}\r\n{:x}\r\n{rest}\r\n0\r\n\r\n",
            first.len(),
            rest.len()
        );
        assert_eq!(
            post(
                addr,
                "POST",
                NOTIFY_PATH,
                "Transfer-Encoding: chunked\r\n",
                chunked.as_bytes()
            ),
            (200, r#"{"rejected":[]}"#.to_string())
        );
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            1
        );
        // Behind a proxy with a path before it too.
        assert_eq!(
            notify_at(addr, &format!("/relay{NOTIFY_PATH}"), &body).0,
            200
        );
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            2
        );

        assert_eq!(notify(addr, "{not json").0, 400);
        assert_eq!(notify(addr, r#"{"devices":[]}"#).0, 400);
        assert_eq!(post(addr, "GET", NOTIFY_PATH, "", b"").0, 405);
        let long = format!("Content-Length: {}\r\n", MAX_BODY + 1);
        assert_eq!(post(addr, "POST", NOTIFY_PATH, &long, b"").0, 400);
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            2
        );
        // Another path is no push: the WebSocket port refuses it as a handshake without a token.
        assert_ne!(notify_at(addr, "/_matrix/push/v1/other", &body).0, 200);
    }

    fn notify_at(addr: SocketAddr, path: &str, body: &str) -> (u16, String) {
        post(
            addr,
            "POST",
            path,
            &format!("Content-Length: {}\r\n", body.len()),
            body.as_bytes(),
        )
    }

    #[test]
    fn a_relay_that_takes_no_pushes_answers_none() {
        let (addr, shared) = start(Limits {
            matrix_push: false,
            ..Limits::default()
        });
        let queue = shared.store().create().unwrap();
        assert_ne!(notify(addr, &event(&[&to_hex(&queue.sender_id)])).0, 200);
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap(),
            News::default()
        );
    }

    #[test]
    fn push_keys_are_sender_ids_in_hex() {
        let id: QueueId = core::array::from_fn(|i| i as u8);
        assert_eq!(sender_of(&to_hex(&id)), Some(id));
        assert_eq!(sender_of(&to_hex(&id).to_uppercase()), Some(id));
        assert_eq!(sender_of(&to_hex(&id)[..46]), None);
        assert_eq!(sender_of(&"zz".repeat(24)), None);
        assert_eq!(sender_of(&"é".repeat(24)), None);
        assert!(notify_line(b"POST /_matrix/push/v1/notify HTTP/1.1"));
        assert!(notify_line(b"POST /x/_matrix/push/v1/notify?a=b HTTP/1.1"));
        assert!(!notify_line(b"GET /read HTTP/1.1"));
        assert!(!notify_line(b"POST /_matrix/push/v1/notify/more HTTP/1.1"));
    }
}
