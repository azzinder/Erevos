//! Web Push: telling a browser that a message waits, so a web app that is
//! closed (on an iPhone, always) can say so.
//!
//! A web app gives the relay a push address for one of its queues
//! (`PUSH_SET`), made by the browser for the relay's key (`PUSH_KEY`). When a
//! message comes into that queue, the relay sends that address an empty push
//! (RFC 8030), signed with its key (VAPID, RFC 8292). The push carries
//! nothing: no message, no sender, no queue. The browser's push service
//! (Apple's, Google's, Mozilla's) sees only that something came, and when.
//!
//! Only addresses of known push services are taken, so the relay cannot be
//! made to send requests anywhere else. At most one push per queue goes out
//! every `PUSH_GAP`; a phone that opens the app takes every waiting message
//! anyway. A push service that says the address is gone (404 or 410) has it
//! removed.
//!
//! The addresses are kept in one file, written whole on every change. The
//! signing key is a P-256 key in its own file, made on first start; a new key
//! means every web app must turn notifications on again.

use std::collections::HashMap;
use std::fs;
use std::io::{self, Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use p256::ecdsa::signature::Signer;
use p256::ecdsa::{Signature, SigningKey};

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
/// Shortest time between two pushes for one queue.
pub const PUSH_GAP: Duration = Duration::from_secs(15);
/// How long a push service keeps a push for a browser that is offline.
const PUSH_TTL: u32 = 24 * 60 * 60;
const TIMEOUT: Duration = Duration::from_secs(15);

/// Why a push address was not taken.
#[derive(Debug, PartialEq, Eq)]
pub enum SetError {
    /// Not an address of a known push service.
    Refused,
    /// The change could not be written.
    Storage,
}

pub struct Push {
    key: SigningKey,
    subject: String,
    allowed: Vec<String>,
    file: Option<PathBuf>,
    endpoints: Mutex<HashMap<QueueId, String>>,
    queue: Mutex<Sender<QueueId>>,
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
            endpoints: Mutex::new(endpoints),
            queue: Mutex::new(tx),
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

    /// Sets the push address for a queue, or removes it when `endpoint` is empty.
    pub fn set(&self, queue: &QueueId, endpoint: &str) -> Result<(), SetError> {
        if !endpoint.is_empty() && !self.takes(endpoint) {
            return Err(SetError::Refused);
        }
        let mut endpoints = self.endpoints();
        let before = if endpoint.is_empty() {
            endpoints.remove(queue)
        } else {
            endpoints.insert(*queue, endpoint.to_string())
        };
        if self.save(&endpoints).is_err() {
            match before {
                Some(old) => endpoints.insert(*queue, old),
                None => endpoints.remove(queue),
            };
            return Err(SetError::Storage);
        }
        Ok(())
    }

    /// Forgets the queue's push address, if any (the queue was deleted).
    pub fn forget(&self, queue: &QueueId) {
        let mut endpoints = self.endpoints();
        if endpoints.remove(queue).is_some() {
            let _ = self.save(&endpoints);
        }
    }

    /// A message came into `queue`: push, if it has an address.
    pub fn arrived(&self, queue: &QueueId) {
        if self.endpoints().contains_key(queue) {
            let _ = lock(&self.queue, PUSH_LOCK).send(*queue);
        }
    }

    fn endpoints(&self) -> std::sync::MutexGuard<'_, HashMap<QueueId, String>> {
        lock(&self.endpoints, PUSH_LOCK)
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

    fn save(&self, endpoints: &HashMap<QueueId, String>) -> io::Result<()> {
        let Some(path) = &self.file else {
            return Ok(());
        };
        let mut bytes = Vec::new();
        for (queue, endpoint) in endpoints {
            bytes.extend_from_slice(queue);
            bytes.extend_from_slice(&(endpoint.len() as u16).to_be_bytes());
            bytes.extend_from_slice(endpoint.as_bytes());
        }
        let new = path.with_extension("new");
        let mut options = fs::OpenOptions::new();
        options.write(true).create(true).truncate(true);
        #[cfg(unix)]
        std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
        let mut file = options.open(&new)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        fs::rename(&new, path)
    }

    fn run(&self, rx: Receiver<QueueId>) {
        let mut last: HashMap<QueueId, Instant> = HashMap::new();
        while let Ok(queue) = rx.recv() {
            if last.get(&queue).is_some_and(|at| at.elapsed() < PUSH_GAP) {
                continue;
            }
            last.insert(queue, Instant::now());
            last.retain(|_, at| at.elapsed() < PUSH_GAP);
            let Some(endpoint) = self.endpoints().get(&queue).cloned() else {
                continue;
            };
            match self.send(&endpoint) {
                Ok(404 | 410) => {
                    let mut endpoints = self.endpoints();
                    if endpoints.get(&queue) == Some(&endpoint) {
                        endpoints.remove(&queue);
                        let _ = self.save(&endpoints);
                    }
                }
                Ok(_) => {}
                Err(e) => eprintln!("erevos-relay: a push could not be sent: {e}"),
            }
        }
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

    /// Sends an empty push to `endpoint` and returns the HTTP status.
    fn send(&self, endpoint: &str) -> io::Result<u16> {
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
        let request = format!(
            "POST {path} HTTP/1.1\r\nHost: {authority}\r\nAuthorization: {}\r\nTTL: {PUSH_TTL}\r\nUrgency: high\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
            self.authorization(&audience, now)
        );
        let address = (host, port)
            .to_socket_addrs()?
            .next()
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "no address"))?;
        let tcp = TcpStream::connect_timeout(&address, TIMEOUT)?;
        tcp.set_read_timeout(Some(TIMEOUT))?;
        tcp.set_write_timeout(Some(TIMEOUT))?;
        let mut reply = Vec::new();
        if tls {
            let name = rustls::pki_types::ServerName::try_from(host.to_string())
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidInput, e))?;
            let connection =
                rustls::ClientConnection::new(tls_config(), name).map_err(io::Error::other)?;
            let mut stream = rustls::StreamOwned::new(connection, tcp);
            stream.write_all(request.as_bytes())?;
            read_status(&mut stream, &mut reply)?;
        } else {
            let mut stream = tcp;
            stream.write_all(request.as_bytes())?;
            read_status(&mut stream, &mut reply)?;
        }
        let line = String::from_utf8_lossy(&reply);
        line.split_whitespace()
            .nth(1)
            .and_then(|code| code.parse().ok())
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "no HTTP status"))
    }
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

fn tls_config() -> Arc<rustls::ClientConfig> {
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
    let rest = endpoint.strip_prefix("https://")?;
    let authority = &rest[..rest.find('/').unwrap_or(rest.len())];
    Some(authority.split(':').next().unwrap_or(authority))
}

fn load(path: &Path) -> io::Result<HashMap<QueueId, String>> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(HashMap::new()),
        Err(e) => return Err(e),
    };
    let bad = || io::Error::new(io::ErrorKind::InvalidData, "the push file is damaged");
    let mut endpoints = HashMap::new();
    let mut rest = &bytes[..];
    while !rest.is_empty() {
        if rest.len() < 26 {
            return Err(bad());
        }
        let queue: QueueId = rest[..24].try_into().map_err(|_| bad())?;
        let len = u16::from_be_bytes([rest[24], rest[25]]) as usize;
        let endpoint = rest.get(26..26 + len).ok_or_else(bad)?;
        endpoints.insert(
            queue,
            String::from_utf8(endpoint.to_vec()).map_err(|_| bad())?,
        );
        rest = &rest[26 + len..];
    }
    Ok(endpoints)
}

/// Reads the push key from `path`, or makes one there if the file does not exist.
pub fn load_key(path: &Path) -> io::Result<SigningKey> {
    match fs::read(path) {
        Ok(bytes) => SigningKey::from_slice(&bytes)
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "a push key is 32 bytes")),
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            let key = SigningKey::random(&mut rand::rngs::OsRng);
            let mut options = fs::OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
            let mut file = options.open(path)?;
            file.write_all(&key.to_bytes())?;
            file.sync_all()?;
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

#[cfg(test)]
mod tests {
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
        Push::new(
            SigningKey::random(&mut rand::rngs::OsRng),
            "mailto:relay@example.org".into(),
            allowed.iter().map(|s| s.to_string()).collect(),
            file,
        )
        .unwrap()
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
    fn only_push_service_addresses_are_taken() {
        let p = push(PUSH_SERVICES, None);
        let q = [1u8; 24];
        assert_eq!(p.set(&q, "https://web.push.apple.com/QGx2"), Ok(()));
        assert_eq!(p.set(&q, "https://fcm.googleapis.com/fcm/send/abc"), Ok(()));
        assert_eq!(
            p.set(&q, "https://wns2-par02p.notify.windows.com/w/?token=x"),
            Ok(())
        );
        for wrong in [
            "http://web.push.apple.com/x",
            "https://web.push.apple.com.evil.org/x",
            "https://evil.org/https://web.push.apple.com/",
            "https://wns2-x.evil.org/w",
            "https://127.0.0.1/x",
        ] {
            assert_eq!(p.set(&q, wrong), Err(SetError::Refused), "{wrong}");
        }
        assert_eq!(
            p.set(
                &q,
                &format!("https://fcm.googleapis.com/{}", "a".repeat(MAX_ENDPOINT))
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
        let p = push(PUSH_SERVICES, Some(file.clone()));
        p.set(&[1; 24], "https://web.push.apple.com/a").unwrap();
        p.set(&[2; 24], "https://fcm.googleapis.com/b").unwrap();
        p.set(&[2; 24], "").unwrap();
        let again = load(&file).unwrap();
        assert_eq!(again.len(), 1);
        assert_eq!(again[&[1; 24]], "https://web.push.apple.com/a");
        p.forget(&[1; 24]);
        assert!(load(&file).unwrap().is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    /// A push service on this machine: answers each request with `status`
    /// and hands back what it was sent.
    fn service(status: u16) -> (String, Receiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = format!("http://{}/", listener.local_addr().unwrap());
        let (tx, rx) = mpsc::channel();
        thread::spawn(move || {
            for stream in listener.incoming() {
                let mut stream = stream.unwrap();
                let mut request = Vec::new();
                let mut byte = [0u8; 1];
                while !request.ends_with(b"\r\n\r\n") && stream.read(&mut byte).unwrap() == 1 {
                    request.push(byte[0]);
                }
                write!(stream, "HTTP/1.1 {status} X\r\nContent-Length: 0\r\n\r\n").unwrap();
                tx.send(String::from_utf8(request).unwrap()).unwrap();
            }
        });
        (address, rx)
    }

    #[test]
    fn a_message_sends_one_empty_push_and_a_gone_address_is_dropped() {
        let (address, requests) = service(201);
        let p = push(&[&address], None);
        let q = [3u8; 24];
        p.set(&q, &format!("{address}push/abc")).unwrap();
        p.arrived(&q);
        p.arrived(&q);
        let request = requests.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(
            request.starts_with("POST /push/abc HTTP/1.1\r\n"),
            "{request}"
        );
        assert!(request.contains("Content-Length: 0\r\n"));
        assert!(request.contains("Authorization: vapid t="));
        assert!(request.contains("TTL: 86400\r\n"));
        // The second came within the gap: no second push.
        assert!(requests.recv_timeout(Duration::from_millis(500)).is_err());
        // A queue with no address: nothing.
        p.arrived(&[4u8; 24]);
        assert!(requests.recv_timeout(Duration::from_millis(300)).is_err());

        let (gone, requests) = service(410);
        let p = push(&[&gone], None);
        p.set(&q, &format!("{gone}x")).unwrap();
        p.arrived(&q);
        requests.recv_timeout(Duration::from_secs(5)).unwrap();
        thread::sleep(Duration::from_millis(200));
        assert!(p.endpoints.lock().unwrap().is_empty());
    }
}
