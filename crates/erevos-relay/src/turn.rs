// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Credentials for the call relay (a TURN server, such as coturn) that runs
//! beside this relay. Calls go through it, so neither phone in a call learns
//! the other's IP address. The call itself is end-to-end encrypted between
//! the phones (DTLS-SRTP, its keys checked through the end-to-end encrypted
//! chat), so the call relay only passes on what it cannot read.
//!
//! The credentials follow the TURN REST API that coturn takes with
//! `use-auth-secret`: the username is the time they expire (Unix seconds),
//! and the password is the base64 of HMAC-SHA1 of the username, keyed with
//! the secret both share. The relay hands them only to phones it lets in
//! (those with its token), so the call relay serves no one else.

use std::time::{SystemTime, UNIX_EPOCH};

use hmac::{Hmac, Mac};
use sha1::Sha1;

/// How long a phone's credentials last, seconds: longer than any call.
pub const LIFETIME: u64 = 12 * 60 * 60;
/// Most call relay addresses handed out.
pub const MAX_URLS: usize = 8;

/// The call relay's addresses (`turn:` or `turns:`) and the secret it shares
/// with this relay.
pub struct Turn {
    urls: Vec<String>,
    secret: Vec<u8>,
}

impl Turn {
    /// From a comma-separated list of addresses and the shared secret. `None`
    /// when an address is not `turn:` or `turns:`, or none or too many are
    /// given, or the secret is empty.
    pub fn new(urls: &str, secret: &str) -> Option<Turn> {
        let urls: Vec<String> = urls
            .split(',')
            .map(str::trim)
            .filter(|url| !url.is_empty())
            .map(String::from)
            .collect();
        let valid = |url: &String| {
            (url.starts_with("turn:") || url.starts_with("turns:"))
                && url.len() <= 256
                && url.bytes().all(|b| b.is_ascii_graphic())
        };
        if urls.is_empty() || urls.len() > MAX_URLS || !urls.iter().all(valid) || secret.is_empty()
        {
            return None;
        }
        Some(Turn {
            urls,
            secret: secret.as_bytes().to_vec(),
        })
    }

    pub fn urls(&self) -> &[String] {
        &self.urls
    }

    /// A username and password that last `LIFETIME` from now.
    pub fn credentials(&self) -> (String, String) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |d| d.as_secs());
        self.credentials_at(now)
    }

    fn credentials_at(&self, now: u64) -> (String, String) {
        let username = (now + LIFETIME).to_string();
        let mut mac = Hmac::<Sha1>::new_from_slice(&self.secret).expect("HMAC takes any key");
        mac.update(username.as_bytes());
        let password = base64(&mac.finalize().into_bytes());
        (username, password)
    }
}

fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let n = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
        for i in 0..4 {
            if i <= chunk.len() {
                out.push(ALPHABET[(n >> (18 - 6 * i)) as usize & 63] as char);
            } else {
                out.push('=');
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_pads_as_usual() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        assert_eq!(base64(b"foob"), "Zm9vYg==");
    }

    #[test]
    fn credentials_are_the_rest_api_ones() {
        let turn = Turn::new("turn:relay.example.org:3478", "secret").unwrap();
        let (username, password) = turn.credentials_at(1_000_000_000);
        assert_eq!(username, (1_000_000_000 + LIFETIME).to_string());
        // HMAC-SHA1("secret", "1000043200"), as `printf 1000043200 | openssl dgst -sha1 -hmac secret -binary | base64` gives it.
        assert_eq!(password, "2ArTVzbN9r7gxbS5U7zBB3JUZfw=");
    }

    #[test]
    fn only_turn_addresses_and_a_secret_are_taken() {
        assert!(Turn::new("turn:a:3478, turns:a:5349", "s").is_some());
        assert!(Turn::new("stun:a:3478", "s").is_none());
        assert!(Turn::new("https://a", "s").is_none());
        assert!(Turn::new("", "s").is_none());
        assert!(Turn::new("turn:a:3478", "").is_none());
        assert!(Turn::new("turn:a b", "s").is_none());
    }
}
