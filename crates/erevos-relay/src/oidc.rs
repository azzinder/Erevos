//! The relay's calls to an OpenID Connect provider, for signing in (see
//! `signin.rs`): what the provider says of itself (discovery, kept a day),
//! the tokens for a code (with PKCE), a refresh, introspection, userinfo, and
//! revoking a refresh token. Each call is one request on a connection of its
//! own, over TLS with the roots in `webpki-roots` (plain HTTP only to this
//! machine, for checks), so nothing stays open.
//!
//! The settings come from the environment (`Config::from`): the issuer, the
//! client id and secret, where browsers reach the relay, the provider's name
//! for people, and a group the account must be in, if any. Any provider that
//! has discovery, the authorization code flow, refresh tokens
//! (`offline_access`) and userinfo works; for a group, its userinfo must name
//! the account's groups in `groups`, as Authentik's for the `profile` scope
//! does.
//!
//! Not audited.

use std::collections::HashMap;
use std::io::{self, ErrorKind, Read, Write};
use std::net::{SocketAddr, ToSocketAddrs};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::Value;

use crate::connect;
use crate::lock::lock;

/// The scopes asked for: who signs in, their user name, and a refresh token
/// for the hourly check.
pub const SCOPES: &str = "openid profile offline_access";
/// The longest a call to the provider may take, to connect and each read.
const TIMEOUT: Duration = Duration::from_secs(10);
/// How long what discovery said is used before it is asked again.
const DISCOVERY_KEPT: Duration = Duration::from_secs(24 * 3600);
const MAX_HEAD: usize = 16 * 1024;
const MAX_BODY: usize = 256 * 1024;
const PROVIDER_LOCK: &str = "lock of the sign-in provider's endpoints";

/// The provider's settings, from the relay's environment. Its `Debug` leaves
/// the client secret out.
#[derive(Clone)]
pub struct Config {
    /// `EREVOS_RELAY_OIDC_ISSUER`, as discovery must say it.
    pub issuer: String,
    pub client_id: String,
    pub client_secret: String,
    /// `EREVOS_RELAY_PUBLIC_URL`: where browsers reach the relay, with no `/`
    /// at the end.
    pub public_url: String,
    /// `EREVOS_RELAY_OIDC_NAME`: on the app's button, and before each line's
    /// name.
    pub name: String,
    /// `EREVOS_RELAY_OIDC_GROUP`: when set, the group userinfo's `groups` must
    /// have, at sign-in and at every check.
    pub group: Option<String>,
}

impl std::fmt::Debug for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Config")
            .field("issuer", &self.issuer)
            .field("client_id", &self.client_id)
            .field("client_secret", &"…")
            .field("public_url", &self.public_url)
            .field("name", &self.name)
            .field("group", &self.group)
            .finish()
    }
}

impl Config {
    /// The settings `get` gives (the environment): none when
    /// `EREVOS_RELAY_OIDC_ISSUER` is not set, else an error saying what is
    /// missing or wrong.
    pub fn from(get: impl Fn(&str) -> Option<String>) -> Result<Option<Config>, String> {
        let get = |name: &str| {
            get(name)
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        };
        let Some(issuer) = get("EREVOS_RELAY_OIDC_ISSUER") else {
            return Ok(None);
        };
        let need = |name: &str| {
            get(name).ok_or_else(|| format!("EREVOS_RELAY_OIDC_ISSUER is set, but {name} is not"))
        };
        let config = Config {
            client_id: need("EREVOS_RELAY_OIDC_CLIENT_ID")?,
            client_secret: need("EREVOS_RELAY_OIDC_CLIENT_SECRET")?,
            public_url: need("EREVOS_RELAY_PUBLIC_URL")?
                .trim_end_matches('/')
                .to_string(),
            name: get("EREVOS_RELAY_OIDC_NAME").unwrap_or_else(|| "OIDC".to_string()),
            group: get("EREVOS_RELAY_OIDC_GROUP"),
            issuer,
        };
        for (name, value) in [
            ("EREVOS_RELAY_OIDC_ISSUER", &config.issuer),
            ("EREVOS_RELAY_PUBLIC_URL", &config.public_url),
        ] {
            if Url::parse(value).is_none() {
                return Err(format!(
                    "{name} must be an https:// address (http:// only on this machine)"
                ));
            }
        }
        if config.name.chars().count() > 32 || config.name.chars().any(char::is_control) {
            return Err("EREVOS_RELAY_OIDC_NAME must be at most 32 letters".to_string());
        }
        Ok(Some(config))
    }

    /// Where the provider sends the browser back to, as registered there.
    pub fn redirect_uri(&self) -> String {
        format!("{}/signin/callback", self.public_url)
    }

    /// Where the app opens the browser to sign in.
    pub fn start_url(&self) -> String {
        format!("{}/signin/start", self.public_url)
    }

    /// Whether what userinfo said lets the account in: always, unless a group
    /// is set, which its `groups` must have.
    pub fn in_group(&self, info: &Value) -> bool {
        let Some(group) = &self.group else {
            return true;
        };
        info["groups"]
            .as_array()
            .is_some_and(|all| all.iter().any(|g| g.as_str() == Some(group)))
    }
}

/// Why a call to the provider did not give what was asked.
#[derive(Debug, PartialEq)]
pub enum Failure {
    /// The provider said no for good: the code or refresh token is no good
    /// (the account was closed, disabled or deleted, its tokens revoked, or
    /// the refresh token expired), or the token is not active.
    Refused(String),
    /// It could not be asked now, or answered in a way that may pass (down,
    /// a wrong client secret, something unexpected): try again later.
    Later(String),
}

impl std::fmt::Display for Failure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Failure::Refused(why) => write!(f, "refused: {why}"),
            Failure::Later(why) => write!(f, "{why}"),
        }
    }
}

/// What the token endpoint gave. Its `Debug` says only which tokens came.
pub struct Tokens {
    pub access: String,
    pub refresh: Option<String>,
    pub id_token: Option<String>,
}

impl std::fmt::Debug for Tokens {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Tokens")
            .field("access", &"…")
            .field("refresh", &self.refresh.as_ref().map(|_| "…"))
            .field("id_token", &self.id_token.as_ref().map(|_| "…"))
            .finish()
    }
}

#[derive(Clone, Debug)]
struct Endpoints {
    authorization: String,
    token: String,
    userinfo: String,
    introspection: Option<String>,
    revocation: Option<String>,
    /// The client authenticates with HTTP Basic, unless the provider takes
    /// only `client_secret_post`.
    basic: bool,
}

pub struct Provider {
    pub config: Config,
    endpoints: Mutex<Option<(Endpoints, Instant)>>,
}

impl Provider {
    pub fn new(config: Config) -> Provider {
        Provider {
            config,
            endpoints: Mutex::new(None),
        }
    }

    fn endpoints(&self) -> Result<Endpoints, Failure> {
        if let Some((endpoints, at)) = lock(&self.endpoints, PROVIDER_LOCK).as_ref() {
            if at.elapsed() < DISCOVERY_KEPT {
                return Ok(endpoints.clone());
            }
        }
        let issuer = self.config.issuer.trim_end_matches('/');
        let url = format!("{issuer}/.well-known/openid-configuration");
        let reply = call("GET", &url, &[], b"")
            .map_err(|e| Failure::Later(format!("discovery at {url}: {e}")))?;
        if reply.status != 200 {
            return Err(Failure::Later(format!(
                "discovery at {url}: HTTP {}",
                reply.status
            )));
        }
        let doc: Value = serde_json::from_slice(&reply.body)
            .map_err(|e| Failure::Later(format!("discovery at {url}: {e}")))?;
        let said = doc["issuer"].as_str().unwrap_or_default();
        if said.trim_end_matches('/') != issuer {
            return Err(Failure::Later(format!(
                "discovery says the issuer is {said:?}, not {}",
                self.config.issuer
            )));
        }
        let endpoint = |name: &str| {
            doc[name]
                .as_str()
                .filter(|url| Url::parse(url).is_some())
                .map(str::to_string)
        };
        let need = |name: &str| {
            endpoint(name).ok_or_else(|| Failure::Later(format!("discovery has no {name}")))
        };
        let methods: Vec<&str> = doc["token_endpoint_auth_methods_supported"]
            .as_array()
            .map(|all| all.iter().filter_map(Value::as_str).collect())
            .unwrap_or_default();
        let endpoints = Endpoints {
            authorization: need("authorization_endpoint")?,
            token: need("token_endpoint")?,
            userinfo: need("userinfo_endpoint")?,
            introspection: endpoint("introspection_endpoint"),
            revocation: endpoint("revocation_endpoint"),
            basic: methods.contains(&"client_secret_basic")
                || !methods.contains(&"client_secret_post"),
        };
        *lock(&self.endpoints, PROVIDER_LOCK) = Some((endpoints.clone(), Instant::now()));
        Ok(endpoints)
    }

    /// Where to send the browser to sign in, for a flow with these `state`
    /// and `nonce`, and the PKCE `challenge` (S256).
    pub fn authorize_url(
        &self,
        state: &str,
        nonce: &str,
        challenge: &str,
    ) -> Result<String, Failure> {
        let endpoints = self.endpoints()?;
        let query = form(&[
            ("response_type", "code"),
            ("client_id", &self.config.client_id),
            ("redirect_uri", &self.config.redirect_uri()),
            ("scope", SCOPES),
            ("state", state),
            ("nonce", nonce),
            ("code_challenge", challenge),
            ("code_challenge_method", "S256"),
        ]);
        let joint = if endpoints.authorization.contains('?') {
            '&'
        } else {
            '?'
        };
        Ok(format!("{}{joint}{query}", endpoints.authorization))
    }

    /// The tokens for the `code` the browser brought back, with the flow's
    /// PKCE `verifier`.
    pub fn exchange(&self, code: &str, verifier: &str) -> Result<Tokens, Failure> {
        self.token(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", &self.config.redirect_uri()),
            ("code_verifier", verifier),
        ])
    }

    /// New tokens for a refresh token. A provider that rotates them, as
    /// Authentik does, gives a new refresh token, and the old one is no good
    /// from then on.
    pub fn refresh(&self, refresh: &str) -> Result<Tokens, Failure> {
        self.token(&[("grant_type", "refresh_token"), ("refresh_token", refresh)])
    }

    fn token(&self, fields: &[(&str, &str)]) -> Result<Tokens, Failure> {
        let endpoints = self.endpoints()?;
        let reply = self.post(&endpoints, &endpoints.token, fields)?;
        let doc: Value = serde_json::from_slice(&reply.body).unwrap_or(Value::Null);
        let text = |name: &str| doc[name].as_str().map(str::to_string);
        if reply.status == 200 {
            let access = text("access_token")
                .ok_or_else(|| Failure::Later("the token endpoint gave no access token".into()))?;
            return Ok(Tokens {
                access,
                refresh: text("refresh_token"),
                id_token: text("id_token"),
            });
        }
        let error = text("error").unwrap_or_default();
        if reply.status == 400 && error == "invalid_grant" {
            Err(Failure::Refused(error))
        } else {
            Err(Failure::Later(format!(
                "the token endpoint answered HTTP {} {error:?}",
                reply.status
            )))
        }
    }

    /// Whether the provider says `access` is active, which Authentik says only
    /// while its account is active too; `None` when it does not introspect.
    pub fn active(&self, access: &str) -> Result<Option<bool>, Failure> {
        let endpoints = self.endpoints()?;
        let Some(url) = endpoints.introspection.clone() else {
            return Ok(None);
        };
        let reply = self.post(
            &endpoints,
            &url,
            &[("token", access), ("token_type_hint", "access_token")],
        )?;
        if reply.status != 200 {
            return Err(Failure::Later(format!(
                "introspection answered HTTP {}",
                reply.status
            )));
        }
        let doc: Value = serde_json::from_slice(&reply.body)
            .map_err(|e| Failure::Later(format!("introspection: {e}")))?;
        Ok(Some(doc["active"].as_bool().unwrap_or(false)))
    }

    /// What userinfo says of whoever `access` is for. Refused when it does not
    /// take the token.
    pub fn userinfo(&self, access: &str) -> Result<Value, Failure> {
        let endpoints = self.endpoints()?;
        let bearer = format!("Bearer {access}");
        let reply = call(
            "GET",
            &endpoints.userinfo,
            &[("Authorization", &bearer)],
            b"",
        )
        .map_err(|e| Failure::Later(format!("userinfo: {e}")))?;
        match reply.status {
            200 => {
                let doc: Value = serde_json::from_slice(&reply.body)
                    .map_err(|e| Failure::Later(format!("userinfo: {e}")))?;
                if doc.is_object() {
                    Ok(doc)
                } else {
                    Err(Failure::Later("userinfo gave no object".into()))
                }
            }
            401 | 403 => Err(Failure::Refused(format!(
                "userinfo answered HTTP {}",
                reply.status
            ))),
            status => Err(Failure::Later(format!("userinfo answered HTTP {status}"))),
        }
    }

    /// Tells the provider a refresh token is no longer used, when it takes
    /// that (RFC 7009). What it answers changes nothing here.
    pub fn revoke(&self, refresh: &str) {
        let Ok(endpoints) = self.endpoints() else {
            return;
        };
        if let Some(url) = endpoints.revocation.clone() {
            let _ = self.post(
                &endpoints,
                &url,
                &[("token", refresh), ("token_type_hint", "refresh_token")],
            );
        }
    }

    /// A form posted with the client's id and secret (RFC 6749 2.3.1).
    fn post(
        &self,
        endpoints: &Endpoints,
        url: &str,
        fields: &[(&str, &str)],
    ) -> Result<Reply, Failure> {
        let id = &self.config.client_id;
        let secret = &self.config.client_secret;
        let mut fields = fields.to_vec();
        let basic = format!(
            "Basic {}",
            base64(format!("{}:{}", encode(id), encode(secret)).as_bytes())
        );
        let mut headers = vec![("Content-Type", "application/x-www-form-urlencoded")];
        if endpoints.basic {
            headers.push(("Authorization", &basic));
        } else {
            fields.push(("client_id", id));
            fields.push(("client_secret", secret));
        }
        call("POST", url, &headers, form(&fields).as_bytes())
            .map_err(|e| Failure::Later(format!("{url}: {e}")))
    }
}

/// The claims in an ID token, read without checking its signature: the relay
/// takes it straight from the token endpoint, over TLS and with the client's
/// secret, where OpenID Connect Core (3.1.3.7) lets TLS stand for it.
pub fn id_claims(id_token: &str) -> Option<Value> {
    let payload = id_token.split('.').nth(1)?;
    serde_json::from_slice(&b64url_decode(payload)?).ok()
}

/// An HTTP reply: its status and body.
pub struct Reply {
    pub status: u16,
    pub body: Vec<u8>,
}

/// An address the relay may call: https, or plain http to this machine.
struct Url<'a> {
    tls: bool,
    /// The host as it goes in `Host`, with the port if one was given.
    authority: &'a str,
    /// The host to connect to, without brackets.
    host: &'a str,
    port: u16,
    /// The path and query, `/` when there is none.
    target: String,
}

impl Url<'_> {
    fn parse(url: &str) -> Option<Url<'_>> {
        let (tls, rest) = if let Some(rest) = url.strip_prefix("https://") {
            (true, rest)
        } else {
            (false, url.strip_prefix("http://")?)
        };
        let rest = rest.split('#').next().unwrap_or_default();
        let (authority, target) = rest.split_at(rest.find(['/', '?']).unwrap_or(rest.len()));
        if authority.is_empty() || authority.contains('@') {
            return None;
        }
        let (host, port) = if let Some(inner) = authority.strip_prefix('[') {
            let (host, after) = inner.split_once(']')?;
            (host, after.strip_prefix(':'))
        } else {
            match authority.split_once(':') {
                Some((host, port)) => (host, Some(port)),
                None => (authority, None),
            }
        };
        let port = match port {
            Some(port) => port.parse().ok()?,
            None if tls => 443,
            None => 80,
        };
        if host.is_empty() || (!tls && !matches!(host, "127.0.0.1" | "localhost" | "::1")) {
            return None;
        }
        let target = match target {
            "" => "/".to_string(),
            t if t.starts_with('?') => format!("/{t}"),
            t => t.to_string(),
        };
        Some(Url {
            tls,
            authority,
            host,
            port,
            target,
        })
    }
}

/// One request to `url`, on a connection of its own.
fn call(method: &str, url: &str, headers: &[(&str, &str)], body: &[u8]) -> io::Result<Reply> {
    let url = Url::parse(url)
        .ok_or_else(|| io::Error::new(ErrorKind::InvalidInput, "not an https:// address"))?;
    let mut head = format!(
        "{method} {} HTTP/1.1\r\nHost: {}\r\nUser-Agent: erevos-relay\r\nAccept: application/json\r\nConnection: close\r\nContent-Length: {}\r\n",
        url.target,
        url.authority,
        body.len()
    );
    for (name, value) in headers {
        head.push_str(&format!("{name}: {value}\r\n"));
    }
    head.push_str("\r\n");
    let mut request = head.into_bytes();
    request.extend_from_slice(body);
    let addresses: Vec<SocketAddr> = (url.host, url.port).to_socket_addrs()?.collect();
    let tcp = connect::to_any(&addresses, TIMEOUT)?;
    tcp.set_read_timeout(Some(TIMEOUT))?;
    tcp.set_write_timeout(Some(TIMEOUT))?;
    if url.tls {
        let name = rustls::pki_types::ServerName::try_from(url.host.to_string())
            .map_err(|e| io::Error::new(ErrorKind::InvalidInput, e))?;
        let connection = rustls::ClientConnection::new(crate::push::tls_config(), name)
            .map_err(io::Error::other)?;
        let mut stream = rustls::StreamOwned::new(connection, tcp);
        stream.write_all(&request)?;
        stream.flush()?;
        read_reply(&mut stream)
    } else {
        let mut stream = tcp;
        stream.write_all(&request)?;
        read_reply(&mut stream)
    }
}

fn invalid(why: impl std::fmt::Display) -> io::Error {
    io::Error::new(ErrorKind::InvalidData, why.to_string())
}

/// A read where a TLS peer that closed without saying so counts as the end.
fn read_some(stream: &mut impl Read, buf: &mut [u8]) -> io::Result<usize> {
    loop {
        match stream.read(buf) {
            Err(e) if e.kind() == ErrorKind::UnexpectedEof => return Ok(0),
            Err(e) if e.kind() == ErrorKind::Interrupted => continue,
            other => return other,
        }
    }
}

fn read_reply(stream: &mut impl Read) -> io::Result<Reply> {
    let mut data = Vec::new();
    let mut buf = [0u8; 4096];
    let (status, chunked, length, start) = loop {
        let n = read_some(stream, &mut buf)?;
        if n == 0 {
            return Err(io::Error::new(ErrorKind::UnexpectedEof, "no HTTP reply"));
        }
        data.extend_from_slice(&buf[..n]);
        let mut headers = [httparse::EMPTY_HEADER; 64];
        let mut response = httparse::Response::new(&mut headers);
        match response.parse(&data).map_err(invalid)? {
            httparse::Status::Complete(at) => {
                let header = |name: &str| {
                    response
                        .headers
                        .iter()
                        .find(|h| h.name.eq_ignore_ascii_case(name))
                        .map(|h| String::from_utf8_lossy(h.value).trim().to_ascii_lowercase())
                };
                let chunked = header("transfer-encoding").is_some_and(|v| v.contains("chunked"));
                let length = header("content-length").and_then(|v| v.parse::<usize>().ok());
                break (response.code.unwrap_or(0), chunked, length, at);
            }
            httparse::Status::Partial if data.len() < MAX_HEAD => {}
            httparse::Status::Partial => return Err(invalid("HTTP head too long")),
        }
    };
    let mut body = data.split_off(start);
    loop {
        if chunked {
            if let Some(whole) = unchunk(&body)? {
                return Ok(Reply {
                    status,
                    body: whole,
                });
            }
        } else if let Some(length) = length {
            if body.len() >= length {
                body.truncate(length);
                break;
            }
        }
        if body.len() > MAX_BODY {
            return Err(invalid("HTTP body too long"));
        }
        let n = read_some(stream, &mut buf)?;
        if n == 0 {
            if chunked || length.is_some() {
                return Err(io::Error::new(
                    ErrorKind::UnexpectedEof,
                    "HTTP body cut short",
                ));
            }
            break;
        }
        body.extend_from_slice(&buf[..n]);
    }
    Ok(Reply { status, body })
}

/// A chunked body put together, or `None` while its last chunk has not come.
fn unchunk(data: &[u8]) -> io::Result<Option<Vec<u8>>> {
    let mut out = Vec::new();
    let mut at = 0;
    loop {
        let Some(end) = data[at..].windows(2).position(|w| w == b"\r\n") else {
            return Ok(None);
        };
        let line = String::from_utf8_lossy(&data[at..at + end]);
        let size = usize::from_str_radix(line.split(';').next().unwrap_or_default().trim(), 16)
            .map_err(|_| invalid("bad chunk size"))?;
        at += end + 2;
        if size == 0 {
            return Ok(Some(out));
        }
        if size > MAX_BODY || data.len() < at + size + 2 {
            return if size > MAX_BODY {
                Err(invalid("HTTP body too long"))
            } else {
                Ok(None)
            };
        }
        out.extend_from_slice(&data[at..at + size]);
        at += size + 2;
    }
}

/// `text` as it goes in a query or a form: unreserved characters as they
/// are, every other byte as `%XX`.
pub fn encode(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric() || b"-._~".contains(&byte) {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

/// Fields as a query or a form.
pub fn form(fields: &[(&str, &str)]) -> String {
    fields
        .iter()
        .map(|(name, value)| format!("{}={}", encode(name), encode(value)))
        .collect::<Vec<_>>()
        .join("&")
}

/// A query's or form's text as it was: `+` is a space. None when it does not
/// read as UTF-8.
pub fn decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut at = 0;
    while at < bytes.len() {
        match bytes[at] {
            b'+' => out.push(b' '),
            b'%' => {
                let hex = text.get(at + 1..at + 3)?;
                out.push(u8::from_str_radix(hex, 16).ok()?);
                at += 2;
            }
            byte => out.push(byte),
        }
        at += 1;
    }
    String::from_utf8(out).ok()
}

/// The fields of a query or form; one that does not read is left out.
pub fn fields(text: &str) -> HashMap<String, String> {
    text.split('&')
        .filter_map(|pair| {
            let (name, value) = pair.split_once('=').unwrap_or((pair, ""));
            Some((decode(name)?, decode(value)?))
        })
        .collect()
}

const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// Base64 with padding, for HTTP Basic.
fn base64(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let n = (chunk[0] as u32) << 16
            | (*chunk.get(1).unwrap_or(&0) as u32) << 8
            | *chunk.get(2).unwrap_or(&0) as u32;
        for i in 0..4 {
            if i <= chunk.len() {
                out.push(ALPHABET[(n >> (18 - 6 * i) & 63) as usize] as char);
            } else {
                out.push('=');
            }
        }
    }
    out
}

/// Base64url (or plain base64), padded or not, as in a JWT.
fn b64url_decode(text: &str) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(text.len() * 3 / 4);
    let mut n = 0u32;
    let mut bits = 0;
    for c in text.trim_end_matches('=').bytes() {
        let value = match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'-' | b'+' => 62,
            b'_' | b'/' => 63,
            _ => return None,
        };
        n = n << 6 | value as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((n >> bits) as u8);
            n &= (1 << bits) - 1;
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        move |name| map.get(name).cloned()
    }

    #[test]
    fn no_secret_or_token_is_in_a_debug_print() {
        let config = Config {
            issuer: "https://auth.example".to_string(),
            client_id: "erevos".to_string(),
            client_secret: "the-client-secret".to_string(),
            public_url: "https://relay.example".to_string(),
            name: "LPHL".to_string(),
            group: None,
        };
        let said = format!("{config:?}");
        assert!(said.contains("erevos") && !said.contains("the-client-secret"));
        let tokens = Tokens {
            access: "the-access".to_string(),
            refresh: Some("the-refresh".to_string()),
            id_token: None,
        };
        let said = format!("{tokens:?}");
        assert!(!said.contains("the-access") && !said.contains("the-refresh"));
        assert!(said.contains("id_token: None"));
    }

    #[test]
    fn the_settings_need_all_their_parts() {
        assert!(Config::from(env(&[])).unwrap().is_none());
        let all = [
            (
                "EREVOS_RELAY_OIDC_ISSUER",
                "https://lphl.example.org/application/o/erevos/",
            ),
            ("EREVOS_RELAY_OIDC_CLIENT_ID", "id"),
            ("EREVOS_RELAY_OIDC_CLIENT_SECRET", "secret"),
            ("EREVOS_RELAY_PUBLIC_URL", "https://erevos.example.org/"),
            ("EREVOS_RELAY_OIDC_NAME", "LPHL"),
        ];
        let config = Config::from(env(&all)).unwrap().unwrap();
        assert_eq!(
            config.redirect_uri(),
            "https://erevos.example.org/signin/callback"
        );
        assert_eq!(
            config.start_url(),
            "https://erevos.example.org/signin/start"
        );
        assert_eq!(config.name, "LPHL");
        for left_out in 1..4 {
            let some: Vec<_> = all
                .iter()
                .enumerate()
                .filter(|(i, _)| *i != left_out)
                .map(|(_, p)| *p)
                .collect();
            assert!(Config::from(env(&some))
                .unwrap_err()
                .contains(all[left_out].0));
        }
        let mut plain = all;
        plain[3] = ("EREVOS_RELAY_PUBLIC_URL", "http://erevos.example.org");
        assert!(
            Config::from(env(&plain)).is_err(),
            "plain http only on this machine"
        );
        plain[3] = ("EREVOS_RELAY_PUBLIC_URL", "http://127.0.0.1:7879");
        assert!(Config::from(env(&plain)).is_ok());
        assert_eq!(Config::from(env(&all[..4])).unwrap().unwrap().name, "OIDC");
        assert_eq!(config.group, None);
        assert!(config.in_group(&serde_json::json!({})));
        let mut grouped = all.to_vec();
        grouped.push(("EREVOS_RELAY_OIDC_GROUP", "erevos"));
        let config = Config::from(env(&grouped)).unwrap().unwrap();
        assert_eq!(config.group.as_deref(), Some("erevos"));
        assert!(config.in_group(&serde_json::json!({"groups": ["family", "erevos"]})));
        assert!(!config.in_group(&serde_json::json!({"groups": ["family"]})));
        assert!(!config.in_group(&serde_json::json!({"groups": "erevos"})));
        assert!(!config.in_group(&serde_json::json!({})));
    }

    #[test]
    fn addresses_read_as_their_parts() {
        let url = Url::parse("https://lphl.example.org/application/o/token/?a=1#x").unwrap();
        assert!(url.tls);
        assert_eq!((url.host, url.port), ("lphl.example.org", 443));
        assert_eq!(url.target, "/application/o/token/?a=1");
        let url = Url::parse("http://[::1]:8080").unwrap();
        assert_eq!(
            (url.host, url.port, url.authority),
            ("::1", 8080, "[::1]:8080")
        );
        assert_eq!(url.target, "/");
        assert!(Url::parse("http://lphl.example.org/").is_none());
        assert!(Url::parse("https://user@lphl.example.org/").is_none());
        assert!(Url::parse("ftp://lphl.example.org/").is_none());
    }

    #[test]
    fn forms_go_and_come_back_as_they_were() {
        let text = form(&[
            ("redirect_uri", "https://a.example/cb?x=1"),
            ("scope", SCOPES),
        ]);
        assert_eq!(
            text,
            "redirect_uri=https%3A%2F%2Fa.example%2Fcb%3Fx%3D1&scope=openid%20profile%20offline_access"
        );
        let back = fields(&text);
        assert_eq!(back["redirect_uri"], "https://a.example/cb?x=1");
        assert_eq!(back["scope"], SCOPES);
        assert_eq!(fields("a=b+c&d=%CE%9C")["a"], "b c");
        assert_eq!(fields("d=%CE%9C")["d"], "Μ");
        assert!(fields("bad=%zz").is_empty());
    }

    #[test]
    fn base64_both_ways() {
        assert_eq!(base64(b"id:secret"), "aWQ6c2VjcmV0");
        assert_eq!(base64(b"a"), "YQ==");
        assert_eq!(base64(b"ab"), "YWI=");
        assert_eq!(b64url_decode("eyJzdWIiOiIxIn0").unwrap(), br#"{"sub":"1"}"#);
        let claims = id_claims("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig").unwrap();
        assert_eq!(claims["sub"], "1");
        assert!(id_claims("no dots").is_none());
    }

    #[test]
    fn a_chunked_body_comes_whole() {
        assert_eq!(
            unchunk(b"4\r\nWiki\r\n5;x=1\r\npedia\r\n0\r\n\r\n")
                .unwrap()
                .unwrap(),
            b"Wikipedia"
        );
        assert!(unchunk(b"4\r\nWiki\r\n5\r\nped").unwrap().is_none());
        assert!(unchunk(b"zz\r\n").is_err());
        let mut reply =
            &b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2\r\n{}\r\n0\r\n\r\n"[..];
        let read = read_reply(&mut reply).unwrap();
        assert_eq!((read.status, read.body), (200, b"{}".to_vec()));
        let mut reply = &b"HTTP/1.1 400 Bad Request\r\nContent-Length: 2\r\n\r\n{}extra"[..];
        assert_eq!(read_reply(&mut reply).unwrap().body, b"{}");
        let mut reply = &b"HTTP/1.1 200 OK\r\n\r\nto the end"[..];
        assert_eq!(read_reply(&mut reply).unwrap().body, b"to the end");
    }
}
