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
//! Not audited.

use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use arti_client::config::TorClientConfigBuilder;
use arti_client::TorClient;
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
use tor_rtcompat::PreferredRuntime;

pub type Result<T> = std::result::Result<T, String>;

/// How long a connection or a reply may take through Tor before it is given up.
const WAIT: Duration = Duration::from_secs(90);

trait Io: AsyncRead + AsyncWrite + Unpin + Send {}
impl<T: AsyncRead + AsyncWrite + Unpin + Send> Io for T {}

type Socket = WebSocketStream<Box<dyn Io>>;

static RUNTIME: OnceLock<Runtime> = OnceLock::new();
static CLIENT: Mutex<Option<Arc<TorClient<PreferredRuntime>>>> = Mutex::new(None);
static SESSIONS: OnceLock<Mutex<HashMap<u64, Arc<tokio::sync::Mutex<Socket>>>>> = OnceLock::new();
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

/// Starts Tor, keeping its state in `state_dir` and what it downloads in
/// `cache_dir`. Connecting to Tor goes on in the background; a request made
/// meanwhile waits for it. Starting again does nothing.
pub fn start(state_dir: &Path, cache_dir: &Path) -> Result<()> {
    let mut client = CLIENT.lock().map_err(|_| "tor state lost".to_string())?;
    if client.is_some() {
        return Ok(());
    }
    let runtime = runtime()?;
    let _inside = runtime.enter();
    let mut config = TorClientConfigBuilder::from_directories(state_dir, cache_dir);
    // An app's own folders belong to it alone, but not in the way Arti checks for on a desktop.
    config.storage().permissions().dangerously_trust_everyone();
    let config = config.build().map_err(|e| e.to_string())?;
    let tor = TorClient::builder().config(config).create_unbootstrapped().map_err(|e| e.to_string())?;
    let bootstrapping = tor.clone();
    runtime.spawn(async move {
        // Its progress shows in status(); a failure is tried again by the next request.
        let _ = bootstrapping.bootstrap().await;
    });
    *client = Some(tor);
    Ok(())
}

/// Stops Tor and closes every connection through it.
pub fn stop() {
    if let Ok(mut map) = sessions().lock() {
        map.clear();
    }
    if let Ok(mut client) = CLIENT.lock() {
        *client = None;
    }
}

/// How far Tor is: "off", or Arti's own words for its progress, and whether it carries traffic.
pub fn status() -> (String, bool) {
    match CLIENT.lock().ok().and_then(|c| c.clone()) {
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
        .clone()
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

async fn connect(tor: Arc<TorClient<PreferredRuntime>>, url: String, token: String) -> Result<Socket> {
    let address = parse(&url)?;
    let stream = tor
        .connect((address.host.as_str(), address.port))
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
    let (socket, _) = tokio_tungstenite::client_async(request, io)
        .await
        .map_err(|e| format!("cannot reach the relay at {url}, or the token is wrong: {e}"))?;
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
        tokio::time::timeout(WAIT, connect(tor, url, token))
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

    #[test]
    fn says_when_tor_is_off() {
        stop();
        assert_eq!(status(), ("off".to_string(), false));
        assert!(request("ws://relay:7879", "", b"x").unwrap_err().contains("not started"));
        assert!(call(12345, b"x").is_err());
        close(12345);
    }
}
