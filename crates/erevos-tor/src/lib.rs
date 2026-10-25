//! Relay requests through Tor, with Arti, for the apps' "Through Tor" switch.
//!
//! The app speaks to its relay over WebSocket: one binary request, one binary
//! reply. Through Tor, the same WebSocket runs over a Tor stream instead of
//! the phone's own connection, so neither the relay nor anyone watching the
//! phone's network sees both ends: the relay sees a Tor exit (or nothing, for
//! a relay's `.onion` address), and the network sees only Tor. A `wss://`
//! relay is reached with TLS inside the Tor stream, so the exit sees only
//! encrypted bytes.
//!
//! The functions block, for the app's background threads: they run on a Tokio
//! runtime of their own. Tor starts on the first request, or with [`start`],
//! and keeps its state (guards, the directory) in the folders given.
//!
//! Nostr relays speak another way ([`text_open`]): text frames both ways,
//! and the relay sends events whenever they come, so what it says waits in
//! a queue of its own until [`text_next`] takes it.
//!
//! Where Tor is blocked it can go through bridges instead ([`Bridges`]): plain
//! ones, or ones a pluggable transport hides (obfs4, Snowflake, WebTunnel,
//! meek), which the lyrebird program the app carries speaks. With bridges, Tor
//! never connects to its relays straight: when no bridge answers, nothing goes.
//!
//! Not audited.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use arti_client::config::pt::TransportConfigBuilder;
use arti_client::config::{
    BoolOrAuto, BridgeConfigBuilder, CfgPath, PtTransportName, Reconfigure, TorClientConfig, TorClientConfigBuilder,
};
use arti_client::{DormantMode, IsolationToken, StreamPrefs, TorClient};
use futures_util::{SinkExt, StreamExt};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::runtime::Runtime;
use tokio_rustls::rustls::pki_types::ServerName;
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tokio_rustls::TlsConnector;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;
use tor_config::PaddingLevel;
use tor_rtcompat::PreferredRuntime;

pub type Result<T> = std::result::Result<T, String>;

/// How long a connection or a reply may take through Tor before it is given up.
const WAIT: Duration = Duration::from_secs(90);

trait Io: AsyncRead + AsyncWrite + Unpin + Send {}
impl<T: AsyncRead + AsyncWrite + Unpin + Send> Io for T {}

type Socket = WebSocketStream<Box<dyn Io>>;

static RUNTIME: OnceLock<Runtime> = OnceLock::new();
static CLIENT: Mutex<Option<Running>> = Mutex::new(None);
static SESSIONS: OnceLock<Mutex<HashMap<u64, Arc<tokio::sync::Mutex<Socket>>>>> = OnceLock::new();
static TEXTS: OnceLock<Mutex<HashMap<u64, Arc<Text>>>> = OnceLock::new();
static NOSTR_WAYS: OnceLock<Mutex<HashMap<String, IsolationToken>>> = OnceLock::new();
static NEXT: AtomicU64 = AtomicU64::new(1);

fn runtime() -> Result<&'static Runtime> {
    if let Some(runtime) = RUNTIME.get() {
        return Ok(runtime);
    }
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .thread_name("erevos-tor")
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(RUNTIME.get_or_init(|| runtime))
}

fn sessions() -> &'static Mutex<HashMap<u64, Arc<tokio::sync::Mutex<Socket>>>> {
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn texts() -> &'static Mutex<HashMap<u64, Arc<Text>>> {
    TEXTS.get_or_init(|| Mutex::new(HashMap::new()))
}

// Each Nostr relay's connections go on circuits of their own, never shared with another relay's
// or the app's relay's, so no exit carries two of them and none can tell they are one phone's.
// After a connection there fails, the next goes on new circuits, through another exit most
// likely: the last one may be an exit the relay refuses (as some refuse Tor exits, with HTTP 403)
// or one that cannot reach it, and Tor would keep using it for minutes.
fn nostr_ways() -> std::sync::MutexGuard<'static, HashMap<String, IsolationToken>> {
    NOSTR_WAYS.get_or_init(|| Mutex::new(HashMap::new())).lock().unwrap_or_else(|e| e.into_inner())
}

/// The circuits a Nostr relay's connections go on now.
fn nostr_way(host: &str) -> IsolationToken {
    *nostr_ways().entry(host.to_string()).or_insert_with(IsolationToken::new)
}

/// A connection on `way` to `host` failed: the next one goes on new circuits, unless that happened already.
fn nostr_way_failed(host: &str, way: IsolationToken) {
    let mut ways = nostr_ways();
    if ways.get(host) == Some(&way) {
        ways.remove(host);
    }
}

/// A connection of Nostr's kind: what is sent goes on `sink`, and what the relay says waits in
/// `frames`, put there by `reader` as it comes, until the relay closes the connection.
struct Text {
    sink: tokio::sync::Mutex<futures_util::stream::SplitSink<Socket, Message>>,
    frames: tokio::sync::Mutex<tokio::sync::mpsc::UnboundedReceiver<String>>,
    reader: tokio::task::JoinHandle<()>,
    /// The relay's host, and the circuits the connection went on.
    way: (String, IsolationToken),
}

/// The running Tor, and the bridges it was started with.
struct Running {
    tor: Arc<TorClient<PreferredRuntime>>,
    bridges: Bridges,
}

/// How Tor reaches its network: straight to its relays, or only through bridges.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Bridges {
    /// Bridge lines, as bridges.torproject.org gives them, such as
    /// `obfs4 192.0.2.1:443 <fingerprint> cert=… iat-mode=0`. None: no bridges.
    pub lines: Vec<String>,
    /// The lyrebird program, for the lines that name a pluggable transport.
    pub transports: Option<PathBuf>,
}

/// The pluggable transports lyrebird speaks, as bridge lines name them.
pub const TRANSPORTS: [&str; 4] = ["obfs4", "snowflake", "webtunnel", "meek_lite"];

/// The pluggable transport a bridge line names, if any: its first word, unless that is the address.
fn transport_of(line: &str) -> Option<&str> {
    let first = line.split_whitespace().next()?;
    let address = first.contains(':') || first.parse::<std::net::IpAddr>().is_ok();
    (!address).then_some(first)
}

/// Arti's configuration: its folders, and the bridges if there are any.
fn configure(state_dir: &Path, cache_dir: &Path, bridges: &Bridges) -> Result<TorClientConfig> {
    let mut config = TorClientConfigBuilder::from_directories(state_dir, cache_dir);
    // An app's own folders belong to it alone, but not in the way Arti checks for on a desktop.
    config.storage().permissions().dangerously_trust_everyone();
    // The padding Tor sends between real cells, to hide when it talks, wakes a phone's radio every
    // few seconds: the reduced padding Tor made for phones, with none from the guard to this one.
    config.channel().padding(PaddingLevel::Reduced);
    if bridges.lines.is_empty() {
        config.bridges().enabled(BoolOrAuto::Explicit(false));
        return config.build().map_err(|e| e.to_string());
    }
    // Only through the bridges, never straight to Tor's relays, even when none of them answers.
    config.bridges().enabled(BoolOrAuto::Explicit(true));
    for line in &bridges.lines {
        if let Some(name) = transport_of(line) {
            if !TRANSPORTS.contains(&name) {
                return Err(format!("Erevos has no {name} for its bridges"));
            }
            if bridges.transports.is_none() {
                return Err("This build of Erevos has no obfs4, Snowflake, WebTunnel or meek: only plain bridges work in it".to_string());
            }
        }
        let bridge: BridgeConfigBuilder = line.parse().map_err(|e| format!("not a bridge line: {e}"))?;
        config.bridges().bridges().push(bridge);
    }
    if let Some(path) = &bridges.transports {
        let protocols = TRANSPORTS.iter().map(|name| name.parse::<PtTransportName>()).collect::<std::result::Result<Vec<_>, _>>();
        let mut transport = TransportConfigBuilder::default();
        transport
            .protocols(protocols.map_err(|e| e.to_string())?)
            .path(CfgPath::new_literal(path.clone()))
            // Started only when a bridge needs it.
            .run_on_startup(false);
        config.bridges().transports().push(transport);
    }
    config.build().map_err(|e| e.to_string())
}

/// Starts Tor, keeping its state in `state_dir` and what it downloads in
/// `cache_dir`, through `bridges` if there are any. Connecting to Tor goes on
/// in the background; a request made meanwhile waits for it. Starting again
/// with the same bridges does nothing, and with others changes them in place:
/// the circuits made before are dropped. If that fails, Tor stops, so nothing
/// goes the way it went before.
pub fn start(state_dir: &Path, cache_dir: &Path, bridges: Bridges) -> Result<()> {
    let mut client = CLIENT.lock().map_err(|_| "tor state lost".to_string())?;
    if client.as_ref().is_some_and(|running| running.bridges == bridges) {
        return Ok(());
    }
    let runtime = runtime()?;
    let _inside = runtime.enter();
    let config = configure(state_dir, cache_dir, &bridges);
    // The connections open the way Tor went before are closed, and made again the new way.
    if client.is_some() {
        if let Ok(mut map) = sessions().lock() {
            map.clear();
        }
    }
    let tor = match (client.take(), config) {
        (Some(running), Ok(config)) => match running.tor.reconfigure(&config, Reconfigure::AllOrNothing) {
            Ok(()) => running.tor,
            Err(e) => {
                let_go(&running.tor);
                return Err(e.to_string());
            }
        },
        (None, Ok(config)) => TorClient::builder().config(config).create_unbootstrapped().map_err(|e| e.to_string())?,
        (running, Err(e)) => {
            if let Some(running) = running {
                let_go(&running.tor);
            }
            return Err(e);
        }
    };
    let bootstrapping = tor.clone();
    runtime.spawn(async move {
        // Its progress shows in status(); a failure is tried again by the next request.
        let _ = bootstrapping.bootstrap().await;
    });
    *client = Some(Running { tor, bridges });
    Ok(())
}

/// Stops Tor and closes every connection through it.
pub fn stop() {
    if let Ok(mut map) = sessions().lock() {
        map.clear();
    }
    if let Ok(mut client) = CLIENT.lock() {
        if let Some(running) = client.take() {
            let_go(&running.tor);
        }
    }
}

/// A Tor no longer used: its background work sleeps, as a start still under way may keep it a while.
fn let_go(tor: &TorClient<PreferredRuntime>) {
    tor.set_dormant(DormantMode::Soft);
}

/// How far Tor is: "off", or Arti's own words for its progress, and whether it carries traffic.
pub fn status() -> (String, bool) {
    match CLIENT.lock().ok().and_then(|c| c.as_ref().map(|running| running.tor.clone())) {
        None => ("off".to_string(), false),
        Some(tor) => {
            let status = tor.bootstrap_status();
            (status.to_string(), status.ready_for_traffic())
        }
    }
}

fn client() -> Result<Arc<TorClient<PreferredRuntime>>> {
    CLIENT
        .lock()
        .map_err(|_| "tor state lost".to_string())?
        .as_ref()
        .map(|running| running.tor.clone())
        .ok_or_else(|| "Tor is not started".to_string())
}

/// Where a relay is, from its address: `ws://` or `wss://`, a host, a port and a path.
#[derive(Debug, PartialEq, Eq)]
pub struct Address {
    pub tls: bool,
    pub host: String,
    pub port: u16,
}

pub fn parse(url: &str) -> Result<Address> {
    let (tls, rest) = if let Some(rest) = url.strip_prefix("wss://") {
        (true, rest)
    } else if let Some(rest) = url.strip_prefix("ws://") {
        (false, rest)
    } else {
        return Err(format!("not a relay address: {url}"));
    };
    let authority = rest.split(['/', '?', '#']).next().unwrap_or_default();
    let (host, port) = match authority.rsplit_once(':') {
        Some((host, port)) if !host.ends_with(']') || authority.starts_with('[') => {
            let port = port.parse::<u16>().map_err(|_| format!("not a port: {port}"))?;
            (host, port)
        }
        _ => (authority, if tls { 443 } else { 80 }),
    };
    let host = host.trim_start_matches('[').trim_end_matches(']');
    if host.is_empty() {
        return Err(format!("no host in {url}"));
    }
    Ok(Address { tls, host: host.to_string(), port })
}

async fn connect(tor: Arc<TorClient<PreferredRuntime>>, url: String, token: String, way: Option<IsolationToken>) -> Result<Socket> {
    let address = parse(&url)?;
    let mut prefs = StreamPrefs::new();
    if let Some(way) = way {
        prefs.set_isolation(way);
    }
    let stream = tor
        .connect_with_prefs((address.host.as_str(), address.port), &prefs)
        .await
        .map_err(|e| format!("cannot reach {} through Tor: {e}", address.host))?;
    let io: Box<dyn Io> = if address.tls {
        let mut roots = RootCertStore::empty();
        roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
        let config = ClientConfig::builder().with_root_certificates(roots).with_no_client_auth();
        let name = ServerName::try_from(address.host.clone()).map_err(|e| e.to_string())?;
        let tls = TlsConnector::from(Arc::new(config))
            .connect(name, stream)
            .await
            .map_err(|e| format!("TLS with {} failed: {e}", address.host))?;
        Box::new(tls)
    } else {
        Box::new(stream)
    };
    let mut request = url.as_str().into_client_request().map_err(|e| e.to_string())?;
    if !token.is_empty() {
        let value = HeaderValue::from_str(&format!("Bearer {token}")).map_err(|e| e.to_string())?;
        request.headers_mut().insert("Authorization", value);
    }
    let (socket, _) = tokio_tungstenite::client_async(request, io).await.map_err(|e| {
        if token.is_empty() {
            format!("the relay at {url} refused the connection through Tor: {e}")
        } else {
            format!("cannot reach the relay at {url}, or the token is wrong: {e}")
        }
    })?;
    Ok(socket)
}

async fn call_on(socket: &mut Socket, bytes: Vec<u8>) -> Result<Vec<u8>> {
    socket.send(Message::binary(bytes)).await.map_err(|e| e.to_string())?;
    loop {
        match socket.next().await {
            Some(Ok(Message::Binary(reply))) => return Ok(reply.to_vec()),
            Some(Ok(Message::Close(_))) | None => return Err("the relay closed the connection".to_string()),
            Some(Ok(_)) => continue,
            Some(Err(e)) => return Err(e.to_string()),
        }
    }
}

/// Opens a connection to the relay at `url` through Tor, with `token` as a
/// bearer token if not empty. Returns its handle for [`call`] and [`close`].
pub fn open(url: &str, token: &str) -> Result<u64> {
    let tor = client()?;
    let (url, token) = (url.to_string(), token.to_string());
    let socket = runtime()?.block_on(async move {
        tokio::time::timeout(WAIT, connect(tor, url, token, None))
            .await
            .map_err(|_| "Tor took too long to reach the relay".to_string())?
    })?;
    let id = NEXT.fetch_add(1, Ordering::Relaxed);
    sessions().lock().map_err(|_| "tor state lost".to_string())?.insert(id, Arc::new(tokio::sync::Mutex::new(socket)));
    Ok(id)
}

/// Sends one request on an open connection and returns the relay's reply.
pub fn call(id: u64, bytes: &[u8]) -> Result<Vec<u8>> {
    let socket = sessions()
        .lock()
        .map_err(|_| "tor state lost".to_string())?
        .get(&id)
        .cloned()
        .ok_or_else(|| "the connection through Tor is closed".to_string())?;
    let bytes = bytes.to_vec();
    let reply = runtime()?.block_on(async move {
        let mut socket = socket.lock().await;
        tokio::time::timeout(WAIT, call_on(&mut socket, bytes))
            .await
            .map_err(|_| "the relay did not answer through Tor in time".to_string())?
    });
    if reply.is_err() {
        close(id);
    }
    reply
}

/// Closes a connection. Closing one already closed does nothing.
pub fn close(id: u64) {
    let socket = sessions().lock().ok().and_then(|mut map| map.remove(&id));
    if let (Some(socket), Ok(runtime)) = (socket, runtime()) {
        runtime.spawn(async move {
            let _ = socket.lock().await.close(None).await;
        });
    }
}

/// Opens a connection to the Nostr relay at `url` through Tor. Returns its
/// handle for [`text_send`], [`text_next`] and [`text_close`].
pub fn text_open(url: &str) -> Result<u64> {
    let tor = client()?;
    let host = parse(url)?.host;
    let way = nostr_way(&host);
    let url = url.to_string();
    let runtime = runtime()?;
    let socket = runtime
        .block_on(async move {
            tokio::time::timeout(WAIT, connect(tor, url, String::new(), Some(way)))
                .await
                .map_err(|_| "Tor took too long to reach the relay".to_string())?
        })
        .inspect_err(|_| nostr_way_failed(&host, way))?;
    let (sink, mut stream) = socket.split();
    let (sender, frames) = tokio::sync::mpsc::unbounded_channel();
    let reader = runtime.spawn(async move {
        while let Some(Ok(message)) = stream.next().await {
            match message {
                Message::Text(text) => {
                    if sender.send(text.to_string()).is_err() {
                        break;
                    }
                }
                Message::Close(_) => break,
                _ => continue,
            }
        }
    });
    let text = Text { sink: tokio::sync::Mutex::new(sink), frames: tokio::sync::Mutex::new(frames), reader, way: (host, way) };
    let id = NEXT.fetch_add(1, Ordering::Relaxed);
    texts().lock().map_err(|_| "tor state lost".to_string())?.insert(id, Arc::new(text));
    Ok(id)
}

fn text_of(id: u64) -> Result<Arc<Text>> {
    texts()
        .lock()
        .map_err(|_| "tor state lost".to_string())?
        .get(&id)
        .cloned()
        .ok_or_else(|| "the connection through Tor is closed".to_string())
}

/// Sends one text frame on a Nostr relay's connection.
pub fn text_send(id: u64, text: &str) -> Result<()> {
    let connection = text_of(id)?;
    let way = connection.way.clone();
    let text = text.to_string();
    let sent = runtime()?.block_on(async move {
        let mut sink = connection.sink.lock().await;
        tokio::time::timeout(WAIT, sink.send(Message::text(text)))
            .await
            .map_err(|_| "the relay did not take it through Tor in time".to_string())?
            .map_err(|e| e.to_string())
    });
    if sent.is_err() {
        nostr_way_failed(&way.0, way.1);
        text_close(id);
    }
    sent
}

/// The next text frame the relay sent, waiting up to `wait` for one: None
/// when none came in that time. Once the relay has closed the connection and
/// all it said is taken, an error.
pub fn text_next(id: u64, wait: Duration) -> Result<Option<String>> {
    let connection = text_of(id)?;
    let way = connection.way.clone();
    let next = runtime()?.block_on(async move {
        let mut frames = connection.frames.lock().await;
        match tokio::time::timeout(wait, frames.recv()).await {
            Err(_) => Ok(None),
            Ok(Some(text)) => Ok(Some(text)),
            Ok(None) => Err("the relay closed the connection".to_string()),
        }
    });
    if next.is_err() {
        nostr_way_failed(&way.0, way.1);
        text_close(id);
    }
    next
}

/// Closes a Nostr relay's connection. Closing one already closed does nothing.
pub fn text_close(id: u64) {
    let connection = texts().lock().ok().and_then(|mut map| map.remove(&id));
    if let (Some(connection), Ok(runtime)) = (connection, runtime()) {
        connection.reader.abort();
        runtime.spawn(async move {
            let _ = connection.sink.lock().await.close().await;
        });
    }
}

/// One request on a connection of its own, as the app sends most of them.
pub fn request(url: &str, token: &str, bytes: &[u8]) -> Result<Vec<u8>> {
    let id = open(url, token)?;
    let reply = call(id, bytes);
    close(id);
    reply
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_relay_addresses() {
        let at = |tls, host: &str, port| Address { tls, host: host.to_string(), port };
        assert_eq!(parse("wss://relay.example.org").unwrap(), at(true, "relay.example.org", 443));
        assert_eq!(parse("ws://relay:7879").unwrap(), at(false, "relay", 7879));
        assert_eq!(parse("wss://relay.example.org:8443/erevos?x=1").unwrap(), at(true, "relay.example.org", 8443));
        assert_eq!(parse("ws://abcdefghijklmnop.onion/sealed").unwrap(), at(false, "abcdefghijklmnop.onion", 80));
        assert_eq!(parse("ws://[::1]:7879").unwrap(), at(false, "::1", 7879));
        assert!(parse("http://relay").is_err());
        assert!(parse("ws://:7879").is_err());
        assert!(parse("ws://relay:port").is_err());
    }

    const OBFS4: &str = "obfs4 192.0.2.10:443 0123456789ABCDEF0123456789ABCDEF01234567 cert=YXJlIGZyZXF1ZW50bHkgZnVsbCBvZiBsaXR0bGUgbWVzc2FnZXMgeW91IGNhbiBmaW5kLg iat-mode=0";
    const PLAIN: &str = "192.0.2.20:9001 0123456789ABCDEF0123456789ABCDEF01234567";

    fn configured(lines: &[&str], transports: Option<&str>) -> Result<TorClientConfig> {
        let dir = std::env::temp_dir().join("erevos-tor-check");
        let bridges = Bridges {
            lines: lines.iter().map(|line| line.to_string()).collect(),
            transports: transports.map(PathBuf::from),
        };
        configure(&dir.join("state"), &dir.join("cache"), &bridges)
    }

    #[test]
    fn each_nostr_relay_has_circuits_of_its_own_new_after_a_failure() {
        let damus = nostr_way("relay.damus.io.check");
        assert_eq!(nostr_way("relay.damus.io.check"), damus);
        assert_ne!(nostr_way("nos.lol.check"), damus);
        nostr_way_failed("relay.damus.io.check", damus);
        let next = nostr_way("relay.damus.io.check");
        assert_ne!(next, damus);
        // A failure on the circuits before, told late, leaves the new ones be.
        nostr_way_failed("relay.damus.io.check", damus);
        assert_eq!(nostr_way("relay.damus.io.check"), next);
    }

    #[test]
    fn goes_through_bridges_only_when_given() {
        assert!(configured(&[], None).is_ok());
        assert!(configured(&[PLAIN], None).is_ok());
        assert!(configured(&[OBFS4, PLAIN], Some("/data/app/lib/arm64/liblyrebird.so")).is_ok());
        // A transport the app does not carry is never left to Tor to go around.
        let err = configured(&[OBFS4], None).unwrap_err();
        assert!(err.contains("no obfs4"), "{err}");
        let err = configured(&["conjure 192.0.2.30:443 0123456789ABCDEF0123456789ABCDEF01234567"], Some("/x")).unwrap_err();
        assert!(err.contains("no conjure"), "{err}");
        assert!(configured(&["obfs4 not-a-bridge"], Some("/x")).is_err());
        assert_eq!(transport_of(OBFS4), Some("obfs4"));
        assert_eq!(transport_of(PLAIN), None);
        assert_eq!(transport_of("[2001:db8::1]:443 0123456789ABCDEF0123456789ABCDEF01234567"), None);
    }

    #[test]
    fn reads_the_bridges_the_app_comes_with() {
        // app/lib/bridges.ts BUILT_IN, as the app sends them.
        let app = include_str!("../../../app/lib/bridges.ts");
        let stun = app.split("const STUN =\n  '").nth(1).and_then(|rest| rest.split('\'').next()).unwrap();
        let lines: Vec<String> = app
            .lines()
            .map(|line| line.trim().trim_end_matches(','))
            .filter(|line| line.starts_with("'obfs4 ") || line.starts_with("`snowflake "))
            .map(|line| line.trim_matches(['\'', '`']).replace("${STUN}", stun))
            .collect();
        assert_eq!(lines.len(), 9);
        let lines: Vec<&str> = lines.iter().map(String::as_str).collect();
        assert!(configured(&lines, Some("/x")).is_ok());
        for line in lines {
            assert!(line.parse::<BridgeConfigBuilder>().is_ok(), "{line}");
        }
    }

    #[test]
    fn says_when_tor_is_off() {
        stop();
        assert_eq!(status(), ("off".to_string(), false));
        assert!(request("ws://relay:7879", "", b"x").unwrap_err().contains("not started"));
        assert!(call(12345, b"x").is_err());
        close(12345);
        assert!(text_open("wss://relay.example.org").unwrap_err().contains("not started"));
        assert!(text_send(12345, "[]").is_err());
        assert!(text_next(12345, Duration::from_millis(1)).is_err());
        text_close(12345);
    }
}
