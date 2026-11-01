// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Chats with other Nostr apps (NIP-17, docs/nostr-chats.md): a space's own
//! Nostr key, shown as an npub (NIP-19), and the private messages other apps
//! send, as 0xchat, Amethyst, Coracle or Primal do.
//!
//! A message is a rumor (an event never signed, so it proves nothing to
//! anyone but its reader), sealed (kind 13, NIP-59) with NIP-44 for each
//! reader by the sender's key, then wrapped (kind 1059) for that reader by a
//! key made for that one wrap. The relay sees only the key it is for; the
//! seal and the wrap say a time up to two days before it was sent. A copy goes
//! to the sender too, so their other apps have it.
//!
//! Unlike the wraps that carry Erevos's own packets (the crate's root), these
//! are not this app's alone: their reader may be any Nostr app, so they are
//! made as NIP-17 says and nothing more.
//!
//! One JSON request in, one JSON answer out (`op`), as erevos-matrix does.
//! The core keeps nothing: the space's secret comes with each request.
//!
//! Not audited.

use rand_core::{OsRng, RngCore};
use serde_json::{json, Value};
use zeroize::Zeroizing;

use super::{conversation_key, decrypt, encrypt, event_id, hex, new_secret, nip04_decrypt, public_key, unhex, verifying_key, Event, Result, WRAP_KIND};

/// A seal's kind (NIP-59).
pub const SEAL_KIND: u64 = 13;
/// How far back, at most, a seal's and a wrap's times are set (NIP-17: two days).
pub const BACKDATE: u64 = 2 * 24 * 3600;
/// The longest NIP-19 text taken.
const BECH32_MOST: usize = 5000;

/// One request from the app: `{"op": ..., ...}`. Answers JSON bytes.
pub fn call(request: &[u8]) -> Result<Vec<u8>> {
    let request: Value = serde_json::from_slice(request).map_err(|_| "not JSON".to_string())?;
    let op = text(&request, "op")?;
    let answer = match op {
        "keys_new" => keys_of(&new_secret())?,
        "keys_of" => keys_of(&secret(&request)?)?,
        "decode" => decode(text(&request, "text")?)?,
        "npub" => json!({ "npub": encode("npub", &unhex(text(&request, "public")?, 32)?) }),
        "nsec" => json!({ "nsec": encode("nsec", &secret(&request)?) }),
        "nprofile" => json!({ "nprofile": nprofile(&request)? }),
        "wrap" => wrap(&request)?,
        "unwrap" => unwrap(&request)?,
        "open_old" => open_old(&request)?,
        "sign" => sign(&request)?,
        "verify" => {
            Event::from_value(field(&request, "event")?)?.verify()?;
            json!({ "ok": true })
        }
        _ => return Err(format!("unknown Nostr chat call {op}")),
    };
    Ok(answer.to_string().into_bytes())
}

fn field<'a>(request: &'a Value, name: &str) -> Result<&'a Value> {
    request.get(name).ok_or_else(|| format!("{name} is missing"))
}

fn text<'a>(request: &'a Value, name: &str) -> Result<&'a str> {
    field(request, name)?.as_str().ok_or_else(|| format!("{name} is not text"))
}

fn number(request: &Value, name: &str) -> Result<u64> {
    field(request, name)?.as_u64().ok_or_else(|| format!("{name} is not a number"))
}

fn secret(request: &Value) -> Result<Zeroizing<Vec<u8>>> {
    Ok(Zeroizing::new(unhex(text(request, "secret")?, 32)?))
}

fn keys_of(secret: &[u8]) -> Result<Value> {
    let public = public_key(secret)?;
    Ok(json!({ "secret": hex(secret), "public": hex(&public), "npub": encode("npub", &public) }))
}

fn tags_of(value: &Value) -> Result<Vec<Vec<String>>> {
    let bad = || "tags are lists of text".to_string();
    value
        .as_array()
        .ok_or_else(bad)?
        .iter()
        .map(|tag| tag.as_array().ok_or_else(bad)?.iter().map(|part| part.as_str().map(str::to_string).ok_or_else(bad)).collect())
        .collect()
}

/// A time up to [`BACKDATE`] before `now`, so a relay cannot tell from it when a message was sent.
fn backdated(now: u64) -> u64 {
    now.saturating_sub(OsRng.next_u64() % (BACKDATE + 1))
}

// Messages (NIP-17, NIP-59).

/// `{secret, rumor: {kind, created_at, tags, content}, to: [public hex], now}`: the rumor as it
/// reads (`id`, `pubkey` set), and a wrap for each key in `to`, each with whom it is for.
fn wrap(request: &Value) -> Result<Value> {
    let secret = secret(request)?;
    let me = hex(&public_key(&secret)?);
    let asked = field(request, "rumor")?;
    let kind = number(asked, "kind")?;
    let created_at = number(asked, "created_at")?;
    let tags = tags_of(field(asked, "tags")?)?;
    let content = text(asked, "content")?.to_string();
    let id = hex(&event_id(&me, created_at, kind, &tags, &content));
    let rumor = json!({ "id": id, "pubkey": me, "created_at": created_at, "kind": kind, "tags": tags, "content": content });
    let rumor_json = Zeroizing::new(rumor.to_string());
    let now = number(request, "now")?;
    let to = field(request, "to")?.as_array().ok_or_else(|| "to is a list of keys".to_string())?;
    let mut wraps = Vec::with_capacity(to.len());
    for reader in to {
        let reader = reader.as_str().ok_or_else(|| "to is a list of keys".to_string())?;
        let key = unhex(reader, 32)?;
        verifying_key(&key)?;
        let seal = Event::sign(&secret, backdated(now), SEAL_KIND, vec![], encrypt(&conversation_key(&secret, &key)?, &rumor_json)?)?;
        let once = Zeroizing::new(new_secret());
        let content = encrypt(&conversation_key(once.as_ref(), &key)?, &seal.to_json())?;
        let event = Event::sign(once.as_ref(), backdated(now), WRAP_KIND, vec![vec!["p".to_string(), reader.to_string()]], content)?;
        wraps.push(json!({ "to": reader, "event": event.to_json() }));
    }
    Ok(json!({ "rumor": rumor, "wraps": wraps }))
}

/// `{secret, event}` (the wrap's JSON): what it carried, once its wrap and seal are checked, and
/// the rumor's sender is the seal's.
fn unwrap(request: &Value) -> Result<Value> {
    let secret = secret(request)?;
    let me = hex(&public_key(&secret)?);
    let wrap = Event::from_json(text(request, "event")?)?;
    if wrap.kind != WRAP_KIND {
        return Err("not a Nostr gift wrap".to_string());
    }
    wrap.verify()?;
    if !wrap.tags.iter().any(|tag| tag.len() >= 2 && tag[0] == "p" && tag[1] == me) {
        return Err("the wrap is not for this key".to_string());
    }
    let sealed = Zeroizing::new(decrypt(&conversation_key(&secret, &unhex(&wrap.pubkey, 32)?)?, &wrap.content)?);
    let seal = Event::from_json(&sealed)?;
    if seal.kind != SEAL_KIND {
        return Err("the wrap holds no seal".to_string());
    }
    seal.verify()?;
    let opened = Zeroizing::new(decrypt(&conversation_key(&secret, &unhex(&seal.pubkey, 32)?)?, &seal.content)?);
    let rumor: Value = serde_json::from_str(&opened).map_err(|_| "the seal holds no message".to_string())?;
    // Anyone could write any sender into a rumor: only the seal's signature says who sent it.
    if text(&rumor, "pubkey")? != seal.pubkey {
        return Err("the message's sender is not who sealed it".to_string());
    }
    let kind = number(&rumor, "kind")?;
    let created_at = number(&rumor, "created_at")?;
    let tags = tags_of(field(&rumor, "tags")?)?;
    let content = text(&rumor, "content")?.to_string();
    // Its id as it reads, whatever it said.
    let id = hex(&event_id(&seal.pubkey, created_at, kind, &tags, &content));
    Ok(json!({
        "wrap": { "id": wrap.id, "created_at": wrap.created_at },
        "rumor": { "id": id, "pubkey": seal.pubkey, "created_at": created_at, "kind": kind, "tags": tags, "content": content },
    }))
}

/// The kind of NIP-04's private messages, the old ones.
const OLD_DM_KIND: u64 = 4;

/// `{secret, event}`: a NIP-04 private message (kind 4) to or from the key, checked and opened, as
/// [`unwrap`] answers: its rumor is a text (kind 14) that names the other person in its one `p` tag,
/// with its id, signer, time and the `e` tags it answers. Its signature proves who wrote it, and
/// the relays saw who wrote to whom and when.
fn open_old(request: &Value) -> Result<Value> {
    let secret = secret(request)?;
    let me = hex(&public_key(&secret)?);
    let event = Event::from_json(text(request, "event")?)?;
    if event.kind != OLD_DM_KIND {
        return Err("not a NIP-04 private message".to_string());
    }
    event.verify()?;
    let to = event.tags.iter().find(|tag| tag.len() >= 2 && tag[0] == "p").map(|tag| tag[1].clone()).ok_or_else(|| "the message names no one".to_string())?;
    let other = if event.pubkey == me {
        to.clone()
    } else if to == me {
        event.pubkey.clone()
    } else {
        return Err("the message is not for this key".to_string());
    };
    let words = nip04_decrypt(&secret, &unhex(&other, 32)?, &event.content)?;
    let mut tags = vec![vec!["p".to_string(), to]];
    tags.extend(event.tags.iter().filter(|tag| tag.len() >= 2 && tag[0] == "e").cloned());
    Ok(json!({
        "wrap": { "id": event.id, "created_at": event.created_at },
        "rumor": { "id": event.id, "pubkey": event.pubkey, "created_at": event.created_at, "kind": 14, "tags": tags, "content": words },
    }))
}

/// `{secret, created_at, kind, tags, content}`: the event signed (a list of relays to read on, kind
/// 10050, or a profile, kind 0).
fn sign(request: &Value) -> Result<Value> {
    let secret = secret(request)?;
    let event = Event::sign(&secret, number(request, "created_at")?, number(request, "kind")?, tags_of(field(request, "tags")?)?, text(request, "content")?.to_string())?;
    Ok(json!({ "event": serde_json::from_str::<Value>(&event.to_json()).map_err(|e| e.to_string())? }))
}

// Keys as people write them (NIP-19).

/// What a key or profile someone wrote is: an `npub`, `nprofile` (with the relays it names), the
/// hex of a public key, or an `nsec` (a secret, for signing in with one's own key). A `nostr:`
/// before it is let be.
fn decode(written: &str) -> Result<Value> {
    let written = written.trim();
    let written = written.strip_prefix("nostr:").unwrap_or(written);
    if written.len() == 64 {
        if let Ok(public) = unhex(&written.to_ascii_lowercase(), 32) {
            verifying_key(&public)?;
            return Ok(json!({ "type": "npub", "public": hex(&public), "relays": [] }));
        }
    }
    let (hrp, data) = bech32_decode(written)?;
    match hrp.as_str() {
        "npub" => {
            let public: [u8; 32] = data.as_slice().try_into().map_err(|_| "an npub is 32 bytes".to_string())?;
            verifying_key(&public)?;
            Ok(json!({ "type": "npub", "public": hex(&public), "relays": [] }))
        }
        "nsec" => {
            let secret = Zeroizing::new(data);
            if secret.len() != 32 {
                return Err("an nsec is 32 bytes".to_string());
            }
            let keys = keys_of(&secret)?;
            Ok(json!({ "type": "nsec", "secret": keys["secret"], "public": keys["public"], "relays": [] }))
        }
        "nprofile" => {
            let mut public: Option<Vec<u8>> = None;
            let mut relays = Vec::new();
            let mut at = 0;
            while at + 2 <= data.len() {
                let (kind, len) = (data[at], data[at + 1] as usize);
                let value = data.get(at + 2..at + 2 + len).ok_or_else(|| "the nprofile is cut short".to_string())?;
                match kind {
                    0 if len == 32 => public = Some(value.to_vec()),
                    1 => {
                        if let Ok(relay) = std::str::from_utf8(value) {
                            relays.push(relay.to_string());
                        }
                    }
                    // Others are let be, as NIP-19 says.
                    _ => {}
                }
                at += 2 + len;
            }
            let public = public.ok_or_else(|| "the nprofile names no key".to_string())?;
            verifying_key(&public)?;
            Ok(json!({ "type": "nprofile", "public": hex(&public), "relays": relays }))
        }
        _ => Err("not a Nostr key".to_string()),
    }
}

/// `{public, relays}`: an nprofile, so another app knows where to write.
fn nprofile(request: &Value) -> Result<String> {
    let public = unhex(text(request, "public")?, 32)?;
    let mut data = vec![0, 32];
    data.extend_from_slice(&public);
    for relay in field(request, "relays")?.as_array().ok_or_else(|| "relays is a list".to_string())? {
        let relay = relay.as_str().ok_or_else(|| "relays is a list".to_string())?.as_bytes();
        if relay.len() > 255 {
            return Err("a relay's address is too long".to_string());
        }
        data.extend_from_slice(&[1, relay.len() as u8]);
        data.extend_from_slice(relay);
    }
    Ok(encode("nprofile", &data))
}

// Bech32 (BIP-173), which NIP-19 uses, not bech32m.

const CHARSET: &[u8; 32] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";

fn polymod(values: impl Iterator<Item = u8>) -> u32 {
    const GEN: [u32; 5] = [0x3b6a_57b2, 0x2650_8e6d, 0x1ea1_19fa, 0x3d42_33dd, 0x2a14_62b3];
    let mut check = 1u32;
    for value in values {
        let top = check >> 25;
        check = ((check & 0x01ff_ffff) << 5) ^ u32::from(value);
        for (i, g) in GEN.iter().enumerate() {
            if (top >> i) & 1 == 1 {
                check ^= g;
            }
        }
    }
    check
}

fn hrp_expanded(hrp: &str) -> impl Iterator<Item = u8> + '_ {
    hrp.bytes().map(|c| c >> 5).chain(std::iter::once(0)).chain(hrp.bytes().map(|c| c & 31))
}

fn regroup(data: &[u8], from: u32, to: u32, pad: bool) -> Result<Vec<u8>> {
    let mut acc = 0u32;
    let mut bits = 0u32;
    let max = (1u32 << to) - 1;
    let mut out = Vec::with_capacity(data.len() * from as usize / to as usize + 1);
    for &value in data {
        acc = (acc << from) | u32::from(value);
        bits += from;
        while bits >= to {
            bits -= to;
            out.push(((acc >> bits) & max) as u8);
        }
    }
    if pad {
        if bits > 0 {
            out.push(((acc << (to - bits)) & max) as u8);
        }
    } else if bits >= from || (acc << (to - bits)) & max != 0 {
        return Err("not a Nostr key".to_string());
    }
    Ok(out)
}

/// `data` in bech32 under `hrp`.
pub fn encode(hrp: &str, data: &[u8]) -> String {
    let five = regroup(data, 8, 5, true).expect("padding never fails");
    let check = polymod(hrp_expanded(hrp).chain(five.iter().copied()).chain([0u8; 6])) ^ 1;
    let mut out = String::with_capacity(hrp.len() + 1 + five.len() + 6);
    out.push_str(hrp);
    out.push('1');
    for value in five.iter().copied().chain((0..6).map(|i| ((check >> (5 * (5 - i))) & 31) as u8)) {
        out.push(CHARSET[value as usize] as char);
    }
    out
}

/// The `hrp` and data of a bech32 text, its checksum checked.
pub fn bech32_decode(written: &str) -> Result<(String, Vec<u8>)> {
    let bad = || "not a Nostr key".to_string();
    if written.len() > BECH32_MOST || written.chars().any(|c| !c.is_ascii() || c.is_ascii_control() || c == ' ') {
        return Err(bad());
    }
    let lower = written.to_ascii_lowercase();
    if lower != written && written.to_ascii_uppercase() != written {
        return Err(bad());
    }
    let split = lower.rfind('1').ok_or_else(bad)?;
    let (hrp, rest) = (&lower[..split], &lower[split + 1..]);
    if hrp.is_empty() || rest.len() < 6 {
        return Err(bad());
    }
    let five = rest
        .bytes()
        .map(|c| CHARSET.iter().position(|&d| d == c).map(|p| p as u8).ok_or_else(bad))
        .collect::<Result<Vec<u8>>>()?;
    if polymod(hrp_expanded(hrp).chain(five.iter().copied())) != 1 {
        return Err("the Nostr key is mistyped".to_string());
    }
    Ok((hrp.to_string(), regroup(&five[..five.len() - 6], 5, 8, false)?))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ask(request: Value) -> Result<Value> {
        call(request.to_string().as_bytes()).map(|bytes| serde_json::from_slice(&bytes).unwrap())
    }

    // NIP-04, both ways, and the cases it refuses; the words come from a key pair checked against
    // Python's cryptography (secp256k1 ECDH x, AES-256-CBC), in checks/nostr-dm.check.ts too.
    #[test]
    fn old_private_messages_open() {
        let alice = new_secret();
        let bob = new_secret();
        let alice_pub = hex(&public_key(&alice).unwrap());
        let bob_pub = hex(&public_key(&bob).unwrap());
        let content = super::super::nip04_encrypt(&alice, &unhex(&bob_pub, 32).unwrap(), "γεια σου, Bob: δεκαέξι+ bytes", &[7u8; 16]).unwrap();
        let event = Event::sign(&alice, 1_700_000_000, 4, vec![vec!["p".into(), bob_pub.clone()], vec!["e".into(), "ab".repeat(32)]], content.clone()).unwrap();
        for (secret, other) in [(&bob, &alice_pub), (&alice, &bob_pub)] {
            let opened = ask(json!({ "op": "open_old", "secret": hex(secret), "event": event.to_json() })).unwrap();
            assert_eq!(opened["rumor"]["content"], "γεια σου, Bob: δεκαέξι+ bytes");
            assert_eq!(opened["rumor"]["kind"], 14);
            assert_eq!(opened["rumor"]["pubkey"], alice_pub);
            assert_eq!(opened["rumor"]["id"], event.id);
            assert_eq!(opened["rumor"]["tags"], json!([["p", bob_pub], ["e", "ab".repeat(32)]]));
            // Each side opens it with the other's key.
            assert_ne!(hex(secret), *other);
        }
        // Not for this key; changed words; another kind.
        let carol = new_secret();
        assert!(ask(json!({ "op": "open_old", "secret": hex(&carol), "event": event.to_json() })).is_err());
        let mut changed = event.clone();
        changed.content = format!("{}{}", if content.starts_with('A') { 'B' } else { 'A' }, &content[1..]);
        assert!(ask(json!({ "op": "open_old", "secret": hex(&bob), "event": changed.to_json() })).is_err());
        let note = Event::sign(&alice, 1_700_000_000, 1, vec![vec!["p".into(), bob_pub.clone()]], content).unwrap();
        assert!(ask(json!({ "op": "open_old", "secret": hex(&bob), "event": note.to_json() })).is_err());
        // A wrong key gives bad padding or bad UTF-8, never words.
        let wrong = super::super::nip04_decrypt(&carol, &unhex(&alice_pub, 32).unwrap(), &event.content);
        assert!(wrong.is_err() || wrong.unwrap() != "γεια σου, Bob: δεκαέξι+ bytes");
        assert!(super::super::nip04_decrypt(&bob, &unhex(&alice_pub, 32).unwrap(), "AAAA?iv=AAAA").is_err());
        assert!(super::super::nip04_decrypt(&bob, &unhex(&alice_pub, 32).unwrap(), "no iv").is_err());
    }

    // A NIP-04 message made by another implementation (Python's cryptography: secp256k1 ECDH x as
    // the AES-256-CBC key, PKCS#7, iv 00..0f) opens for both keys, and the same words encrypt to it.
    #[test]
    fn old_private_messages_match_another_implementation() {
        let alice = unhex("5c0c523f52a5b6fad39ed2403092df8cebc36318b39383bca6c00808626fab3a", 32).unwrap();
        let bob = unhex("4b22aa260e4acb7021e32f38a6cdf4b673c6a277755bfce287e370c924dc936d", 32).unwrap();
        let alice_pub = "87d3561f19b74adbe8bf840682992466068830a9d8c36b4a0c99d36f826cb6cb";
        let bob_pub = "fa3b4f81a620c66514bda0302847df167ed02a483141b5939e57bdd0cf76ad3b";
        assert_eq!(hex(&public_key(&alice).unwrap()), alice_pub);
        assert_eq!(hex(&public_key(&bob).unwrap()), bob_pub);
        let made = "C1+miOk/8SsPGyb5lru9cykGVYIwBF4rj9L2lrrhESwSdyZsu+OmJqryDsdBrTGq?iv=AAECAwQFBgcICQoLDA0ODw==";
        let words = "nostr: old messages still open, «γεια»";
        assert_eq!(super::super::nip04_decrypt(&bob, &unhex(alice_pub, 32).unwrap(), made).unwrap(), words);
        assert_eq!(super::super::nip04_decrypt(&alice, &unhex(bob_pub, 32).unwrap(), made).unwrap(), words);
        let iv: [u8; 16] = std::array::from_fn(|i| i as u8);
        assert_eq!(super::super::nip04_encrypt(&alice, &unhex(bob_pub, 32).unwrap(), words, &iv).unwrap(), made);
    }

    // NIP-19's own examples.
    #[test]
    fn keys_as_people_write_them() {
        let npub = ask(json!({ "op": "decode", "text": "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg" })).unwrap();
        assert_eq!(npub["public"], "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e");
        assert_eq!(
            ask(json!({ "op": "npub", "public": "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e" })).unwrap()["npub"],
            "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg"
        );
        assert_eq!(
            ask(json!({ "op": "npub", "public": "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d" })).unwrap()["npub"],
            "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"
        );
        let nsec = ask(json!({ "op": "decode", "text": "nostr:nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5" })).unwrap();
        assert_eq!(nsec["type"], "nsec");
        assert_eq!(nsec["secret"], "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa");
        assert_eq!(
            ask(json!({ "op": "nsec", "secret": "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa" })).unwrap()["nsec"],
            "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5"
        );
        let profile = "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p";
        let decoded = ask(json!({ "op": "decode", "text": profile })).unwrap();
        assert_eq!(decoded["public"], "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d");
        assert_eq!(decoded["relays"], json!(["wss://r.x.com", "wss://djbas.sadkb.com"]));
        assert_eq!(ask(json!({ "op": "nprofile", "public": decoded["public"], "relays": decoded["relays"] })).unwrap()["nprofile"], profile);
        // Hex works too; one letter changed does not.
        assert_eq!(ask(json!({ "op": "decode", "text": "3BF0C63FCB93463407AF97A5E5EE64FA883D107EF9E558472C4EB9AAAEFA459D" })).unwrap()["type"], "npub");
        assert!(ask(json!({ "op": "decode", "text": "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjpth" })).unwrap_err().contains("mistyped"));
        assert!(ask(json!({ "op": "decode", "text": "npub10ELFcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg" })).is_err());
        assert!(ask(json!({ "op": "decode", "text": "note1x" })).is_err());
        assert!(ask(json!({ "op": "decode", "text": "hello" })).is_err());
    }

    // NIP-17's own example: "Hola, que tal?", from the first key to the second, wrapped for both.
    #[test]
    fn opens_what_other_apps_send() {
        let (_, sender) = bech32_decode("nsec1w8udu59ydjvedgs3yv5qccshcj8k05fh3l60k9x57asjrqdpa00qkmr89m").unwrap();
        let (_, receiver) = bech32_decode("nsec12ywtkplvyq5t6twdqwwygavp5lm4fhuang89c943nf2z92eez43szvn4dt").unwrap();
        let to_receiver = include_str!("../tests/nip17-receiver.json");
        let to_sender = include_str!("../tests/nip17-sender.json");
        for (secret, wrap) in [(&receiver, to_receiver), (&sender, to_sender)] {
            let opened = ask(json!({ "op": "unwrap", "secret": hex(secret), "event": wrap })).unwrap();
            assert_eq!(opened["rumor"]["content"], "Hola, que tal?");
            assert_eq!(opened["rumor"]["kind"], 14);
            assert_eq!(opened["rumor"]["pubkey"], hex(&public_key(&sender).unwrap()));
            assert_eq!(opened["rumor"]["tags"][0][1], hex(&public_key(&receiver).unwrap()));
        }
        // Not for the other key.
        assert!(ask(json!({ "op": "unwrap", "secret": hex(&sender), "event": to_receiver })).unwrap_err().contains("not for this key"));
    }

    #[test]
    fn a_message_there_and_back() {
        let alice = ask(json!({ "op": "keys_new" })).unwrap();
        let bob = ask(json!({ "op": "keys_new" })).unwrap();
        assert!(alice["npub"].as_str().unwrap().starts_with("npub1"));
        let now = 1_792_800_000u64;
        let sent = ask(json!({
            "op": "wrap",
            "secret": alice["secret"],
            "rumor": { "kind": 14, "created_at": now, "tags": [["p", bob["public"]]], "content": "γεια σου" },
            "to": [bob["public"], alice["public"]],
            "now": now,
        }))
        .unwrap();
        let rumor = &sent["rumor"];
        assert_eq!(rumor["pubkey"], alice["public"]);
        assert!(rumor.get("sig").is_none());
        let wraps = sent["wraps"].as_array().unwrap();
        assert_eq!(wraps.len(), 2);
        let mut signers = Vec::new();
        for (wrap, reader) in wraps.iter().zip([&bob, &alice]) {
            assert_eq!(wrap["to"], reader["public"]);
            let event = Event::from_json(wrap["event"].as_str().unwrap()).unwrap();
            assert_eq!(event.kind, WRAP_KIND);
            assert_eq!(event.tags, vec![vec!["p".to_string(), reader["public"].as_str().unwrap().to_string()]]);
            // Its time up to two days back; signed by a key of its own.
            assert!(event.created_at <= now && event.created_at >= now - BACKDATE);
            assert_ne!(event.pubkey, alice["public"]);
            signers.push(event.pubkey.clone());
            assert!(!wrap["event"].as_str().unwrap().contains("γεια"));
            let opened = ask(json!({ "op": "unwrap", "secret": reader["secret"], "event": wrap["event"] })).unwrap();
            assert_eq!(opened["rumor"], *rumor);
            assert_eq!(opened["wrap"]["id"], event.id);
        }
        assert_ne!(signers[0], signers[1]);
    }

    #[test]
    fn a_sender_written_into_the_message_does_not_count() {
        let alice = ask(json!({ "op": "keys_new" })).unwrap();
        let bob = ask(json!({ "op": "keys_new" })).unwrap();
        let mallory = ask(json!({ "op": "keys_new" })).unwrap();
        // Mallory seals a rumor that says it is Alice's.
        let secret = unhex(mallory["secret"].as_str().unwrap(), 32).unwrap();
        let to = unhex(bob["public"].as_str().unwrap(), 32).unwrap();
        let rumor = json!({ "id": "", "pubkey": alice["public"], "created_at": 1, "kind": 14, "tags": [], "content": "from Alice?" });
        let seal = Event::sign(&secret, 1, SEAL_KIND, vec![], encrypt(&conversation_key(&secret, &to).unwrap(), &rumor.to_string()).unwrap()).unwrap();
        let once = new_secret();
        let wrap = Event::sign(&once, 1, WRAP_KIND, vec![vec!["p".to_string(), hex(&to)]], encrypt(&conversation_key(&once, &to).unwrap(), &seal.to_json()).unwrap()).unwrap();
        let refused = ask(json!({ "op": "unwrap", "secret": bob["secret"], "event": wrap.to_json() })).unwrap_err();
        assert!(refused.contains("not who sealed it"), "{refused}");

        // A wrap whose content was changed and signed again does not open.
        let mut changed = Event::from_json(&wrap.to_json()).unwrap();
        let mut content = changed.content.into_bytes();
        content[70] = if content[70] == b'A' { b'B' } else { b'A' };
        changed = Event::sign(&once, 1, WRAP_KIND, changed.tags, String::from_utf8(content).unwrap()).unwrap();
        assert!(ask(json!({ "op": "unwrap", "secret": bob["secret"], "event": changed.to_json() })).is_err());
    }

    #[test]
    fn signed_events() {
        let alice = ask(json!({ "op": "keys_new" })).unwrap();
        let signed = ask(json!({ "op": "sign", "secret": alice["secret"], "created_at": 5, "kind": 10050, "tags": [["relay", "wss://inbox.example"]], "content": "" })).unwrap();
        assert_eq!(signed["event"]["pubkey"], alice["public"]);
        assert_eq!(ask(json!({ "op": "verify", "event": signed["event"] })).unwrap()["ok"], true);
        let mut forged = signed["event"].clone();
        forged["tags"] = json!([["relay", "wss://elsewhere.example"]]);
        assert!(ask(json!({ "op": "verify", "event": forged })).is_err());
    }
}
