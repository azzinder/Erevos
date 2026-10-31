// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! An XMPP push app server (XEP-0357, Push Notifications), so that a space
//! closed on a phone can say a message came on its XMPP account, as the Matrix
//! push gateway does for Matrix (see `matrix_push.rs`). The space makes a queue
//! here and asks its XMPP server to push to this relay's address, with that
//! queue's sender id, in hex, as the node. While no app of the account is
//! online, the XMPP server then publishes to the node for each message that
//! comes, and each publish counts one message in the queue's news
//! (`Store::wake`), which the phone asks of while the space is closed.
//!
//! An XMPP server reaches an app server as it reaches another XMPP server:
//! over a server-to-server stream to port 5269 of the relay's name, with
//! STARTTLS. So this listens there, with a certificate for that name, and
//! speaks only as much of the server-to-server protocol as a push needs: TLS,
//! then the other server's word for who it is (SASL EXTERNAL or dialback,
//! both taken as said: nothing here is worth more than a node's secret), then
//! its `iq`s. A publish to a node that is a queue here is answered with a
//! result; to any other node with `item-not-found`, so the XMPP server stops
//! pushing to it. What the publish says (a count, perhaps the sender and the
//! words, as the server is set) is read past and kept nowhere, not in the
//! journal, not in the queue, which stays empty. Nothing is ever sent from
//! here to another server: the relay opens no connections.
//!
//! Anyone may push, as anyone may post to the Matrix gateway: a node is a
//! queue's sender id, which only its phone and its XMPP server know, and a
//! push can do no more than count one more message in that queue's news.
//!
//! On with `EREVOS_RELAY_XMPP_PUSH` set to the relay's name, as the XMPP
//! servers will reach it (its DNS name, with no port), with
//! `EREVOS_RELAY_XMPP_PUSH_CERT` and `EREVOS_RELAY_XMPP_PUSH_KEY` naming the
//! certificate chain and its key for that name, in PEM, read again at each
//! connection after they change. It listens on
//! `EREVOS_RELAY_XMPP_PUSH_ADDR` (`DEFAULT_ADDR` unless set). Phones ask for
//! the name with `XMPP_PUSH` (see `server.rs`).

use std::fs;
use std::io::{self, BufReader, ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime};

use rand::RngCore;
use rustls::pki_types::pem::PemObject;
use rustls::pki_types::{CertificateDer, PrivateKeyDer};

use crate::matrix_push::sender_of;
use crate::queue::QueueError;
use crate::server::Shared;
use crate::tokens::to_hex;

/// Where XMPP servers reach an app server: the server-to-server port.
pub const DEFAULT_ADDR: &str = "0.0.0.0:5269";
/// Server-to-server streams open at once; more are closed at once.
const MAX_CONNECTIONS: usize = 64;
/// The longest stream header or stanza taken: a push is well under 4 KB.
const MAX_STANZA: usize = 64 * 1024;
/// How deep elements may go in a stanza.
const MAX_DEPTH: usize = 16;
/// The most attributes one element may have.
const MAX_ATTRS: usize = 32;
/// The longest name of an element or attribute.
const MAX_NAME: usize = 256;
/// How long the other server has to start TLS and say who it is.
const HANDSHAKE: Duration = Duration::from_secs(30);
/// How long a stream stays open with nothing on it: servers keep theirs
/// open between pushes, and open them again when they were closed.
const IDLE: Duration = Duration::from_secs(10 * 60);

const NS_TLS: &str = "urn:ietf:params:xml:ns:xmpp-tls";
const NS_SASL: &str = "urn:ietf:params:xml:ns:xmpp-sasl";
const NS_STREAMS: &str = "urn:ietf:params:xml:ns:xmpp-streams";
const NS_STANZAS: &str = "urn:ietf:params:xml:ns:xmpp-stanzas";
const NS_DISCO_INFO: &str = "http://jabber.org/protocol/disco#info";
const NS_PUBSUB: &str = "http://jabber.org/protocol/pubsub";
const NS_PUSH: &str = "urn:xmpp:push:0";
const NS_PING: &str = "urn:xmpp:ping";

/// The app server: its name, and its certificate as last read.
pub struct XmppPush {
    domain: String,
    cert: PathBuf,
    key: PathBuf,
    tls: Mutex<Option<(Stamp, Arc<rustls::ServerConfig>)>>,
    open: Arc<AtomicUsize>,
}

/// When the certificate's and key's files were last changed.
type Stamp = (Option<SystemTime>, Option<SystemTime>);

impl XmppPush {
    /// The app server for `domain`, with the certificate chain and key in
    /// those files, read now so that a wrong one is said at start.
    pub fn new(domain: &str, cert: PathBuf, key: PathBuf) -> io::Result<XmppPush> {
        let domain = domain.trim().trim_end_matches('.').to_ascii_lowercase();
        if domain.is_empty()
            || domain.len() > 253
            || !domain
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.')
        {
            return Err(io::Error::new(
                ErrorKind::InvalidInput,
                "not a DNS name, as XMPP servers would reach it",
            ));
        }
        let push = XmppPush {
            domain,
            cert,
            key,
            tls: Mutex::new(None),
            open: Arc::new(AtomicUsize::new(0)),
        };
        push.tls()?;
        Ok(push)
    }

    /// The name XMPP servers push to.
    pub fn domain(&self) -> &str {
        &self.domain
    }

    /// The TLS settings, read again when the files changed since.
    fn tls(&self) -> io::Result<Arc<rustls::ServerConfig>> {
        let changed = |path: &PathBuf| fs::metadata(path).and_then(|m| m.modified()).ok();
        let stamp = (changed(&self.cert), changed(&self.key));
        let mut kept = self.tls.lock().unwrap_or_else(|e| e.into_inner());
        if let Some((at, config)) = kept.as_ref() {
            if *at == stamp {
                return Ok(Arc::clone(config));
            }
        }
        let bad = |what: &str, e: &dyn std::fmt::Display| {
            io::Error::new(ErrorKind::InvalidData, format!("{what}: {e}"))
        };
        let chain: Vec<CertificateDer<'static>> = CertificateDer::pem_file_iter(&self.cert)
            .map_err(|e| bad("certificate", &e))?
            .collect::<Result<_, _>>()
            .map_err(|e| bad("certificate", &e))?;
        if chain.is_empty() {
            return Err(bad("certificate", &"no certificate in the file"));
        }
        let key = PrivateKeyDer::from_pem_file(&self.key).map_err(|e| bad("key", &e))?;
        let config = rustls::ServerConfig::builder_with_provider(Arc::new(
            rustls::crypto::ring::default_provider(),
        ))
        .with_safe_default_protocol_versions()
        .map_err(|e| bad("TLS", &e))?
        .with_no_client_auth()
        .with_single_cert(chain, key)
        .map_err(|e| bad("certificate and key", &e))?;
        let config = Arc::new(config);
        *kept = Some((stamp, Arc::clone(&config)));
        Ok(config)
    }
}

/// A place among the streams open at once, given back when dropped.
struct Open(Arc<AtomicUsize>);

impl Open {
    fn take(count: &Arc<AtomicUsize>) -> Option<Open> {
        let mut n = count.load(Ordering::Acquire);
        while n < MAX_CONNECTIONS {
            match count.compare_exchange_weak(n, n + 1, Ordering::AcqRel, Ordering::Acquire) {
                Ok(_) => return Some(Open(Arc::clone(count))),
                Err(now) => n = now,
            }
        }
        None
    }
}

impl Drop for Open {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::AcqRel);
    }
}

/// Takes server-to-server streams on `listener`, each on a thread of its own.
pub fn serve(listener: TcpListener, push: Arc<XmppPush>, shared: Arc<Shared>) {
    for stream in listener.incoming() {
        let Ok(stream) = stream else { continue };
        let Some(open) = Open::take(&push.open) else {
            continue;
        };
        let push = Arc::clone(&push);
        let shared = Arc::clone(&shared);
        thread::spawn(move || {
            let _open = open;
            let _ = stream_of(stream, &push, &shared);
        });
    }
}

/// One server-to-server stream: its header and STARTTLS in the clear, the
/// rest in TLS.
fn stream_of(stream: TcpStream, push: &XmppPush, shared: &Shared) -> io::Result<()> {
    stream.set_read_timeout(Some(HANDSHAKE))?;
    stream.set_write_timeout(Some(HANDSHAKE))?;
    // Unbuffered: the other server says nothing more before it is told to
    // proceed, and what it says then is TLS.
    let mut clear = Xml::new(&stream);
    let mut out = &stream;
    let (head, go_on) = opened(&mut clear, push)?;
    out.write_all(head.as_bytes())?;
    if !go_on {
        return Ok(());
    }
    out.write_all(b"<stream:features><starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'><required/></starttls></stream:features>")?;
    match clear.element()? {
        Some(el) if el.local() == "starttls" && el.ns() == Some(NS_TLS) => {
            out.write_all(b"<proceed xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>")?;
        }
        Some(_) => return out.write_all(refusal("policy-violation").as_bytes()),
        None => return out.write_all(b"</stream:stream>"),
    }
    let tls = rustls::ServerConnection::new(push.tls()?).map_err(io::Error::other)?;
    let tls = rustls::StreamOwned::new(tls, stream);
    let mut xml = Xml::new(BufReader::new(tls));
    secure(&mut xml, push, shared)
}

/// The rest of the stream, in TLS: the other server says who it is, then its
/// stanzas come. Generic over the stream for the checks.
fn secure<S: Read + Write + Idle>(
    xml: &mut Xml<BufReader<S>>,
    push: &XmppPush,
    shared: &Shared,
) -> io::Result<()> {
    let mut known = false;
    loop {
        xml.restart();
        let (head, go_on) = opened(xml, push)?;
        xml.send(head.as_bytes())?;
        if !go_on {
            return Ok(());
        }
        if known {
            xml.send(b"<stream:features/>")?;
        } else {
            xml.send(b"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>EXTERNAL</mechanism></mechanisms><dialback xmlns='urn:xmpp:features:dialback'><errors/></dialback></stream:features>")?;
        }
        loop {
            let Some(el) = xml.element()? else {
                return xml.send(b"</stream:stream>");
            };
            match (el.local(), known) {
                // What the other server says it is is taken as said: a push
                // needs its node, not its sender.
                ("auth", false) if el.ns() == Some(NS_SASL) => {
                    xml.send(b"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>")?;
                    known = true;
                    xml.inner_mut().set_idle()?;
                    break;
                }
                ("result", _) if el.name == "db:result" => {
                    let reply = format!(
                        "<db:result from='{}' to='{}' type='valid'/>",
                        escape(el.attr("to").unwrap_or(&push.domain)),
                        escape(el.attr("from").unwrap_or_default())
                    );
                    xml.send(reply.as_bytes())?;
                    if !known {
                        known = true;
                        xml.inner_mut().set_idle()?;
                    }
                }
                // No key was ever given from here, so none is to be verified.
                ("verify", _) if el.name == "db:verify" => {
                    let reply = format!(
                        "<db:verify from='{}' to='{}' id='{}' type='invalid'/>",
                        escape(el.attr("to").unwrap_or(&push.domain)),
                        escape(el.attr("from").unwrap_or_default()),
                        escape(el.attr("id").unwrap_or_default())
                    );
                    xml.send(reply.as_bytes())?;
                }
                (_, false) => return xml.send(refusal("not-authorized").as_bytes()),
                ("iq", true) => {
                    if let Some(reply) = answer(&el, push, shared) {
                        xml.send(reply.as_bytes())?;
                    }
                }
                // Messages, presence and anything else are read past.
                _ => {}
            }
        }
    }
}

/// Takes the other server's stream header, and gives this one's to send
/// back, and whether the stream goes on: a header to another name, or of an
/// older XMPP, is refused; one that never came (the connection closed) ends
/// it too.
fn opened<R: Read>(xml: &mut Xml<R>, push: &XmppPush) -> io::Result<(String, bool)> {
    let header = match xml.header() {
        Ok(header) => header,
        Err(e) if e.kind() == ErrorKind::UnexpectedEof => return Ok((String::new(), false)),
        Err(e) => return Err(e),
    };
    let to = header.attr("to").unwrap_or_default().to_ascii_lowercase();
    let from = header.attr("from").unwrap_or_default();
    let mut head = format!(
        "<?xml version='1.0'?><stream:stream xmlns='jabber:server' xmlns:stream='http://etherx.jabber.org/streams' xmlns:db='jabber:server:dialback' id='{}' from='{}'{} version='1.0'>",
        stream_id(),
        escape(&push.domain),
        if from.is_empty() {
            String::new()
        } else {
            format!(" to='{}'", escape(from))
        }
    );
    if to.trim_end_matches('.') != push.domain {
        head.push_str(&refusal("host-unknown"));
        return Ok((head, false));
    }
    if header.attr("version") != Some("1.0") {
        head.push_str(&refusal("unsupported-version"));
        return Ok((head, false));
    }
    Ok((head, true))
}

/// What ends a stream with an error.
fn refusal(condition: &str) -> String {
    format!("<stream:error><{condition} xmlns='{NS_STREAMS}'/></stream:error></stream:stream>")
}

fn stream_id() -> String {
    let mut id = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut id);
    to_hex(&id)
}

/// The answer to an `iq`: a publish counted, disco and ping answered,
/// anything else refused; nothing for a result or an error.
fn answer(iq: &El, push: &XmppPush, shared: &Shared) -> Option<String> {
    let kind = iq.attr("type").unwrap_or_default();
    let head = |kind: &str| {
        format!(
            "<iq type='{kind}' id='{}' from='{}' to='{}'",
            escape(iq.attr("id").unwrap_or_default()),
            escape(iq.attr("to").unwrap_or(&push.domain)),
            escape(iq.attr("from").unwrap_or_default())
        )
    };
    let error = |kind: &str, condition: &str| {
        format!(
            "{}><error type='{kind}'><{condition} xmlns='{NS_STANZAS}'/></error></iq>",
            head("error")
        )
    };
    match kind {
        "set" => {
            let node = iq
                .child("pubsub", NS_PUBSUB)
                .and_then(|pubsub| pubsub.child("publish", NS_PUBSUB))
                .and_then(|publish| publish.attr("node"));
            Some(match node.map(|node| wake(shared, node)) {
                Some(Ok(())) => format!("{}/>", head("result")),
                Some(Err(QueueError::NotFound)) => error("cancel", "item-not-found"),
                // Not counted, as the journal could not be written: the
                // server may try again.
                Some(Err(_)) => error("wait", "internal-server-error"),
                None => error("cancel", "service-unavailable"),
            })
        }
        "get" if iq.child("query", NS_DISCO_INFO).is_some() => Some(format!(
            "{}><query xmlns='{NS_DISCO_INFO}'><identity category='pubsub' type='push' name='Erevos'/><feature var='{NS_DISCO_INFO}'/><feature var='{NS_PUSH}'/><feature var='{NS_PING}'/></query></iq>",
            head("result")
        )),
        "get" if iq.child("ping", NS_PING).is_some() => Some(format!("{}/>", head("result"))),
        "get" => Some(error("cancel", "service-unavailable")),
        _ => None,
    }
}

/// Counts a message in the queue the node names.
fn wake(shared: &Shared, node: &str) -> Result<(), QueueError> {
    let sender = sender_of(node).ok_or(QueueError::NotFound)?;
    shared.store().wake(&sender)?;
    shared.arrived.notify_all();
    Ok(())
}

fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '\'' => out.push_str("&apos;"),
            '"' => out.push_str("&quot;"),
            c => out.push(c),
        }
    }
    out
}

/// An element of a stanza, with what it holds.
#[derive(Debug, Default)]
struct El {
    name: String,
    attrs: Vec<(String, String)>,
    children: Vec<El>,
}

impl El {
    /// The name without its prefix.
    fn local(&self) -> &str {
        self.name.rsplit(':').next().unwrap_or_default()
    }

    fn attr(&self, name: &str) -> Option<&str> {
        self.attrs
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, v)| v.as_str())
    }

    /// Its namespace, when it says so itself: the elements read here do.
    fn ns(&self) -> Option<&str> {
        self.attr("xmlns")
    }

    /// The first child of that name, in that namespace (or in its parent's,
    /// when it says none).
    fn child(&self, local: &str, ns: &str) -> Option<&El> {
        self.children
            .iter()
            .find(|c| c.local() == local && c.ns().is_none_or(|n| n == ns))
    }
}

enum Token {
    Start(El, bool),
    End(String),
    Text,
}

/// Reads an XMPP stream: its header, then one whole stanza at a time. Only
/// the XML that XMPP allows: no comments, processing instructions (but the
/// declaration) or document types, and only the five named entities.
struct Xml<R> {
    inner: R,
    back: Option<u8>,
    /// Bytes read of the header or stanza being read.
    read: usize,
}

impl<R: Read> Xml<R> {
    fn new(inner: R) -> Self {
        Xml {
            inner,
            back: None,
            read: 0,
        }
    }

    fn inner_mut(&mut self) -> &mut R {
        &mut self.inner
    }

    /// A new stream starts: its header is next.
    fn restart(&mut self) {
        self.back = None;
    }

    fn byte(&mut self) -> io::Result<u8> {
        if let Some(b) = self.back.take() {
            return Ok(b);
        }
        self.read += 1;
        if self.read > MAX_STANZA {
            return Err(invalid("stanza too long"));
        }
        let mut b = [0u8; 1];
        loop {
            match self.inner.read(&mut b) {
                Ok(0) => return Err(ErrorKind::UnexpectedEof.into()),
                Ok(_) => return Ok(b[0]),
                Err(e) if e.kind() == ErrorKind::Interrupted => {}
                Err(e) => return Err(e),
            }
        }
    }

    fn put_back(&mut self, b: u8) {
        self.back = Some(b);
    }

    fn skip_space(&mut self) -> io::Result<u8> {
        loop {
            let b = self.byte()?;
            if !b.is_ascii_whitespace() {
                return Ok(b);
            }
        }
    }

    fn name(&mut self, first: u8) -> io::Result<String> {
        let mut name = vec![first];
        loop {
            let b = self.byte()?;
            if b.is_ascii_whitespace() || matches!(b, b'/' | b'>' | b'=' | b'<' | b'\'' | b'"') {
                self.put_back(b);
                break;
            }
            name.push(b);
            if name.len() > MAX_NAME {
                return Err(invalid("name too long"));
            }
        }
        if matches!(first, b'/' | b'>' | b'=' | b'<' | b'\'' | b'"') || first.is_ascii_whitespace()
        {
            return Err(invalid("not a name"));
        }
        String::from_utf8(name).map_err(|_| invalid("not UTF-8"))
    }

    /// Text up to `end`, its entities read.
    fn text_until(&mut self, end: u8) -> io::Result<String> {
        let mut raw = Vec::new();
        loop {
            let b = self.byte()?;
            if b == end {
                break;
            }
            if b == b'<' {
                return Err(invalid("< in a value"));
            }
            raw.push(b);
        }
        unescape(&raw)
    }

    fn token(&mut self) -> io::Result<Token> {
        loop {
            let b = self.byte()?;
            if b != b'<' {
                // Text, read past to the next tag: nothing read here needs it.
                loop {
                    let b = self.byte()?;
                    if b == b'<' {
                        self.put_back(b);
                        return Ok(Token::Text);
                    }
                }
            }
            match self.byte()? {
                b'/' => {
                    let first = self.byte()?;
                    let name = self.name(first)?;
                    if self.skip_space()? != b'>' {
                        return Err(invalid("bad end tag"));
                    }
                    return Ok(Token::End(name));
                }
                // The XML declaration, read past.
                b'?' => {
                    let mut last = 0u8;
                    loop {
                        let b = self.byte()?;
                        if last == b'?' && b == b'>' {
                            break;
                        }
                        last = b;
                    }
                }
                b'!' => {
                    let mut head = [0u8; 7];
                    for b in head.iter_mut() {
                        *b = self.byte()?;
                    }
                    if &head != b"[CDATA[" {
                        return Err(invalid("not allowed in XMPP"));
                    }
                    let mut tail = [0u8; 2];
                    loop {
                        let b = self.byte()?;
                        if tail == *b"]]" && b == b'>' {
                            return Ok(Token::Text);
                        }
                        tail = [tail[1], b];
                    }
                }
                first => {
                    let mut el = El {
                        name: self.name(first)?,
                        ..El::default()
                    };
                    loop {
                        match self.skip_space()? {
                            b'>' => return Ok(Token::Start(el, false)),
                            b'/' => {
                                if self.byte()? != b'>' {
                                    return Err(invalid("bad empty tag"));
                                }
                                return Ok(Token::Start(el, true));
                            }
                            first => {
                                let name = self.name(first)?;
                                if self.skip_space()? != b'=' {
                                    return Err(invalid("attribute without a value"));
                                }
                                let quote = self.skip_space()?;
                                if quote != b'\'' && quote != b'"' {
                                    return Err(invalid("value without quotes"));
                                }
                                let value = self.text_until(quote)?;
                                if el.attrs.len() >= MAX_ATTRS {
                                    return Err(invalid("too many attributes"));
                                }
                                el.attrs.push((name, value));
                            }
                        }
                    }
                }
            }
        }
    }

    /// The stream header: the `stream:stream` element's start.
    fn header(&mut self) -> io::Result<El> {
        self.read = 0;
        loop {
            match self.token()? {
                Token::Text => {}
                Token::Start(el, false) if el.local() == "stream" => return Ok(el),
                _ => return Err(invalid("no stream header")),
            }
        }
    }

    /// The next whole stanza (or other top element), or None at the stream's
    /// end. Text between them, as the spaces servers send to keep a stream
    /// open, is read past.
    fn element(&mut self) -> io::Result<Option<El>> {
        loop {
            self.read = 0;
            match self.token()? {
                Token::Text => {}
                Token::End(name) if name.rsplit(':').next() == Some("stream") => return Ok(None),
                Token::End(_) => return Err(invalid("end of nothing")),
                Token::Start(el, true) => return Ok(Some(el)),
                Token::Start(el, false) => return self.rest(el, 1).map(Some),
            }
        }
    }

    /// The children of `el`, to its end.
    fn rest(&mut self, mut el: El, depth: usize) -> io::Result<El> {
        if depth > MAX_DEPTH {
            return Err(invalid("too deep"));
        }
        loop {
            match self.token()? {
                Token::Text => {}
                Token::End(name) if name == el.name => return Ok(el),
                Token::End(_) => return Err(invalid("tags crossed")),
                Token::Start(child, true) => el.children.push(child),
                Token::Start(child, false) => {
                    let child = self.rest(child, depth + 1)?;
                    el.children.push(child);
                }
            }
        }
    }
}

impl<S: Read + Write> Xml<BufReader<S>> {
    /// Writes to the stream it reads.
    fn send(&mut self, bytes: &[u8]) -> io::Result<()> {
        let stream = self.inner.get_mut();
        stream.write_all(bytes)?;
        stream.flush()
    }
}

/// Sets how long a stream may stay idle once its server is known.
trait Idle {
    fn set_idle(&mut self) -> io::Result<()>;
}

impl<S: Read + Idle> Idle for BufReader<S> {
    fn set_idle(&mut self) -> io::Result<()> {
        self.get_mut().set_idle()
    }
}

impl Idle for rustls::StreamOwned<rustls::ServerConnection, TcpStream> {
    fn set_idle(&mut self) -> io::Result<()> {
        self.sock.set_read_timeout(Some(IDLE))
    }
}

impl Idle for TcpStream {
    fn set_idle(&mut self) -> io::Result<()> {
        self.set_read_timeout(Some(IDLE))
    }
}

fn invalid(why: &str) -> io::Error {
    io::Error::new(ErrorKind::InvalidData, why.to_string())
}

fn unescape(raw: &[u8]) -> io::Result<String> {
    let text = std::str::from_utf8(raw).map_err(|_| invalid("not UTF-8"))?;
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find('&') {
        out.push_str(&rest[..at]);
        let after = &rest[at + 1..];
        let end = after.find(';').ok_or_else(|| invalid("bad entity"))?;
        let entity = &after[..end];
        let c = match entity {
            "lt" => '<',
            "gt" => '>',
            "amp" => '&',
            "quot" => '"',
            "apos" => '\'',
            _ => {
                let number = if let Some(hex) = entity.strip_prefix("#x") {
                    u32::from_str_radix(hex, 16).ok()
                } else if let Some(dec) = entity.strip_prefix('#') {
                    dec.parse().ok()
                } else {
                    None
                };
                number
                    .and_then(char::from_u32)
                    .ok_or_else(|| invalid("bad entity"))?
            }
        };
        out.push(c);
        rest = &after[end + 1..];
    }
    out.push_str(rest);
    Ok(out)
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
    use crate::server::{Limits, SharedStore};

    const DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/testdata");

    fn push() -> XmppPush {
        XmppPush::new(
            "push.test",
            format!("{DIR}/xmpp-test-cert.pem").into(),
            format!("{DIR}/xmpp-test-key.pem").into(),
        )
        .unwrap()
    }

    fn shared() -> SharedStore {
        Shared::new(
            Store::default(),
            FileStore::default(),
            None,
            None,
            Limits::default(),
        )
    }

    /// What came on the stream until `until` appeared in it.
    fn upto(stream: &mut impl Read, until: &str) -> String {
        let mut seen = Vec::new();
        let mut b = [0u8; 1];
        while !String::from_utf8_lossy(&seen).contains(until) {
            match stream.read(&mut b) {
                Ok(1) => seen.push(b[0]),
                _ => panic!("closed before {until}: {}", String::from_utf8_lossy(&seen)),
            }
        }
        String::from_utf8(seen).unwrap()
    }

    const HEAD: &str = "<?xml version='1.0'?><stream:stream xmlns='jabber:server' xmlns:stream='http://etherx.jabber.org/streams' xmlns:db='jabber:server:dialback' from='example.org' to='push.test' version='1.0'>";

    fn publish(id: &str, node: &str) -> String {
        format!("<iq type='set' id='{id}' from='alice@example.org' to='push.test'><pubsub xmlns='http://jabber.org/protocol/pubsub'><publish node='{node}'><item><notification xmlns='urn:xmpp:push:0'><x xmlns='jabber:x:data' type='form'><field var='FORM_TYPE'><value>urn:xmpp:push:summary</value></field><field var='message-count'><value>1</value></field><field var='last-message-body'><value>Hi &amp; &lt;bye&gt;</value></field></x></notification></item></publish><publish-options><x xmlns='jabber:x:data' type='submit'><field var='secret'><value><![CDATA[s3cr]]>et]]></value></field></x></publish-options></pubsub></iq>")
    }

    /// The part after TLS, over a plain connection: who the server is, then
    /// its pushes.
    fn start_secure() -> (SocketAddr, SharedStore) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let shared = shared();
        let served = Arc::clone(&shared);
        thread::spawn(move || {
            let push = Arc::new(push());
            for stream in listener.incoming() {
                let (push, served) = (Arc::clone(&push), Arc::clone(&served));
                thread::spawn(move || {
                    let mut xml = Xml::new(BufReader::new(stream.unwrap()));
                    let _ = secure(&mut xml, &push, &served);
                });
            }
        });
        (addr, shared)
    }

    #[test]
    fn a_push_to_a_queue_counts_a_message_and_one_to_no_queue_is_refused() {
        let (addr, shared) = start_secure();
        let queue = shared.store().create().unwrap();
        let node = to_hex(&queue.sender_id);
        let mut s = TcpStream::connect(addr).unwrap();
        s.write_all(HEAD.as_bytes()).unwrap();
        let features = upto(&mut s, "</stream:features>");
        assert!(features.contains("from='push.test' to='example.org'"));
        assert!(features.contains("<mechanism>EXTERNAL</mechanism>"));
        // Nothing is taken before the server says who it is.
        s.write_all(
            b"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='EXTERNAL'>=</auth>",
        )
        .unwrap();
        upto(
            &mut s,
            "<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>",
        );
        s.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut s, "<stream:features/>");

        s.write_all(b" ").unwrap();
        s.write_all(publish("p1", &node).as_bytes()).unwrap();
        let answer = upto(&mut s, "/>");
        assert!(
            answer.contains("<iq type='result' id='p1' from='push.test' to='alice@example.org'/>"),
            "{answer}"
        );
        let news = shared.store().news(&queue.recipient_id).unwrap();
        assert_eq!((news.messages, news.unmarked, news.rings), (1, 0, 0));
        assert!(!shared.store().has_waiting(&queue.recipient_id).unwrap());

        s.write_all(publish("p2", &"ab".repeat(24)).as_bytes())
            .unwrap();
        assert!(upto(&mut s, "</iq>").contains("<item-not-found"));
        s.write_all(publish("p3", "not hex").as_bytes()).unwrap();
        assert!(upto(&mut s, "</iq>").contains("<item-not-found"));
        s.write_all(b"<iq type='get' id='d' from='example.org' to='push.test'><query xmlns='http://jabber.org/protocol/disco#info'/></iq>").unwrap();
        assert!(upto(&mut s, "</iq>").contains("<feature var='urn:xmpp:push:0'/>"));
        s.write_all(
            b"<iq type='get' id='v' to='push.test'><query xmlns='jabber:iq:version'/></iq>",
        )
        .unwrap();
        assert!(upto(&mut s, "</iq>").contains("<service-unavailable"));
        s.write_all(b"<message from='a@example.org' to='push.test'><body>x</body></message>")
            .unwrap();
        s.write_all(publish("p4", &node).as_bytes()).unwrap();
        upto(&mut s, "id='p4'");
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            2
        );
        s.write_all(b"</stream:stream>").unwrap();
        upto(&mut s, "</stream:stream>");
    }

    #[test]
    fn dialback_is_taken_as_said_and_nothing_counts_before_it() {
        let (addr, shared) = start_secure();
        let queue = shared.store().create().unwrap();
        let mut s = TcpStream::connect(addr).unwrap();
        s.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut s, "</stream:features>");
        s.write_all(b"<db:result from='example.org' to='push.test'>abc</db:result>")
            .unwrap();
        assert!(upto(&mut s, "/>")
            .contains("<db:result from='push.test' to='example.org' type='valid'/>"));
        s.write_all(publish("p1", &to_hex(&queue.sender_id)).as_bytes())
            .unwrap();
        upto(&mut s, "type='result' id='p1'");
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            1
        );

        let mut early = TcpStream::connect(addr).unwrap();
        early.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut early, "</stream:features>");
        early
            .write_all(publish("p1", &to_hex(&queue.sender_id)).as_bytes())
            .unwrap();
        assert!(upto(&mut early, "</stream:stream>").contains("<not-authorized"));
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            1
        );
    }

    #[test]
    fn a_stream_to_another_name_or_of_bad_xml_is_closed() {
        let (addr, shared) = start_secure();
        let queue = shared.store().create().unwrap();
        let mut s = TcpStream::connect(addr).unwrap();
        s.write_all(HEAD.replace("to='push.test'", "to='other.test'").as_bytes())
            .unwrap();
        assert!(upto(&mut s, "</stream:stream>").contains("<host-unknown"));

        for bad in [
            "<!-- no -->",
            "<iq type='set' id='a'><pubsub></iq>",
            "<iq a='<'/>",
            "<iq a='&nope;'/>",
        ] {
            let mut s = TcpStream::connect(addr).unwrap();
            s.write_all(HEAD.as_bytes()).unwrap();
            upto(&mut s, "</stream:features>");
            s.write_all(b"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='EXTERNAL'/>")
                .unwrap();
            upto(&mut s, "<success");
            s.write_all(HEAD.as_bytes()).unwrap();
            upto(&mut s, "<stream:features/>");
            s.write_all(bad.as_bytes()).unwrap();
            s.write_all(publish("p", &to_hex(&queue.sender_id)).as_bytes())
                .unwrap();
            let mut rest = String::new();
            let _ = s.read_to_string(&mut rest);
            assert!(!rest.contains("type='result'"), "{bad}: {rest}");
        }
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap(),
            News::default()
        );

        // Too deep, or too long.
        let mut s = TcpStream::connect(addr).unwrap();
        s.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut s, "</stream:features>");
        s.write_all(b"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='EXTERNAL'/>")
            .unwrap();
        upto(&mut s, "<success");
        s.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut s, "<stream:features/>");
        let _ = s.write_all("<a>".repeat(MAX_DEPTH + 2).as_bytes());
        let mut rest = Vec::new();
        let _ = s.read_to_end(&mut rest);
    }

    #[test]
    fn a_server_starts_tls_with_the_certificate_and_pushes() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let shared = shared();
        let queue = shared.store().create().unwrap();
        thread::spawn({
            let shared = Arc::clone(&shared);
            move || serve(listener, Arc::new(push()), shared)
        });
        let mut tcp = TcpStream::connect(addr).unwrap();
        tcp.write_all(HEAD.as_bytes()).unwrap();
        assert!(upto(&mut tcp, "</stream:features>")
            .contains("<starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'><required/>"));
        tcp.write_all(b"<starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>")
            .unwrap();
        upto(
            &mut tcp,
            "<proceed xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>",
        );

        let mut roots = rustls::RootCertStore::empty();
        for cert in CertificateDer::pem_file_iter(format!("{DIR}/xmpp-test-ca.pem")).unwrap() {
            roots.add(cert.unwrap()).unwrap();
        }
        let config = rustls::ClientConfig::builder_with_provider(Arc::new(
            rustls::crypto::ring::default_provider(),
        ))
        .with_safe_default_protocol_versions()
        .unwrap()
        .with_root_certificates(roots)
        .with_no_client_auth();
        let name = rustls::pki_types::ServerName::try_from("push.test").unwrap();
        let client = rustls::ClientConnection::new(Arc::new(config), name).unwrap();
        let mut tls = rustls::StreamOwned::new(client, tcp);
        tls.write_all(HEAD.as_bytes()).unwrap();
        tls.flush().unwrap();
        upto(&mut tls, "</stream:features>");
        tls.write_all(b"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='EXTERNAL'>ZXhhbXBsZS5vcmc=</auth>").unwrap();
        upto(&mut tls, "<success");
        tls.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut tls, "<stream:features/>");
        tls.write_all(publish("p1", &to_hex(&queue.sender_id)).as_bytes())
            .unwrap();
        upto(&mut tls, "type='result' id='p1'");
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            1
        );

        // A stream that will not start TLS goes no further.
        let mut tcp = TcpStream::connect(addr).unwrap();
        tcp.write_all(HEAD.as_bytes()).unwrap();
        upto(&mut tcp, "</stream:features>");
        tcp.write_all(publish("p2", &to_hex(&queue.sender_id)).as_bytes())
            .unwrap();
        assert!(upto(&mut tcp, "</stream:stream>").contains("<policy-violation"));
        assert_eq!(
            shared.store().news(&queue.recipient_id).unwrap().messages,
            1
        );
    }

    #[test]
    fn a_name_that_is_no_dns_name_or_a_missing_certificate_is_refused() {
        let cert = || format!("{DIR}/xmpp-test-cert.pem").into();
        let key = || format!("{DIR}/xmpp-test-key.pem").into();
        assert!(XmppPush::new("push test", cert(), key()).is_err());
        assert!(XmppPush::new("", cert(), key()).is_err());
        assert!(XmppPush::new("push.test", format!("{DIR}/none.pem").into(), key()).is_err());
        assert!(XmppPush::new("push.test", key(), key()).is_err());
        assert_eq!(
            XmppPush::new("Push.Test.", cert(), key()).unwrap().domain(),
            "push.test"
        );
        assert_eq!(unescape(b"a&amp;b&#x3c;&#62;").unwrap(), "a&b<>");
        assert!(unescape(b"&nbsp;").is_err());
    }
}
