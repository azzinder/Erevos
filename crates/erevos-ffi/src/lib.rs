//! The Erevos core as the apps call it: byte arrays in, byte arrays out, and
//! nothing kept here between calls. The app keeps what comes back, sealed in
//! its own storage, and passes it in again. So the same calls work through
//! JNI on Android (feature `android`) and through WebAssembly in a browser or
//! under Node for the app's checks (feature `web`).
//!
//! A call that returns several values returns one byte array of parts, each a
//! 4-byte big-endian length followed by its bytes.
//!
//! Not audited.

use erevos_core::conversation::{self, Account, Conversation, Kind};
use erevos_core::pqxdh::PrekeyBundle;

#[cfg(feature = "android")]
mod android;
#[cfg(feature = "web")]
mod web;

/// Errors cross as their message, the same through JNI and WebAssembly.
pub type Result<T> = std::result::Result<T, String>;

fn fail(e: erevos_core::Error) -> String {
    e.to_string()
}

/// Joins values into one array of length-prefixed parts.
pub fn parts(items: &[&[u8]]) -> Vec<u8> {
    let mut out = Vec::with_capacity(items.iter().map(|i| 4 + i.len()).sum());
    for item in items {
        out.extend_from_slice(&(item.len() as u32).to_be_bytes());
        out.extend_from_slice(item);
    }
    out
}

/// A new account's secret keys.
pub fn account_new() -> Vec<u8> {
    Account::generate().to_secret_bytes().to_vec()
}

/// The account's signed public keys, for a contact link.
pub fn account_bundle(account: &[u8]) -> Result<Vec<u8>> {
    Ok(Account::from_secret_bytes(account).map_err(fail)?.bundle().to_bytes())
}

/// The account's identity key.
pub fn account_identity(account: &[u8]) -> Result<Vec<u8>> {
    Ok(Account::from_secret_bytes(account).map_err(fail)?.identity_key().to_vec())
}

/// Checks a bundle from a contact link and returns its identity key.
pub fn bundle_identity(bundle: &[u8]) -> Result<Vec<u8>> {
    let bundle = PrekeyBundle::from_bytes(bundle).map_err(fail)?;
    bundle.verify().map_err(fail)?;
    Ok(bundle.identity_dh.to_bytes().to_vec())
}

/// Starts a conversation: the conversation, then the first packet.
pub fn conversation_start(account: &[u8], bundle: &[u8], plaintext: &[u8]) -> Result<Vec<u8>> {
    let account = Account::from_secret_bytes(account).map_err(fail)?;
    let bundle = PrekeyBundle::from_bytes(bundle).map_err(fail)?;
    let (conversation, packet) = conversation::start(&account, &bundle, plaintext).map_err(fail)?;
    Ok(parts(&[&conversation.to_secret_bytes(), &packet]))
}

/// Opens a first packet: the conversation it starts, then the plaintext.
pub fn conversation_accept(account: &[u8], packet: &[u8]) -> Result<Vec<u8>> {
    // The account has no one-time prekeys, so accepting leaves it unchanged.
    let mut account = Account::from_secret_bytes(account).map_err(fail)?;
    let (conversation, plaintext) = conversation::accept(&mut account, packet).map_err(fail)?;
    Ok(parts(&[&conversation.to_secret_bytes(), &plaintext]))
}

/// Seals a message: the conversation as it is now, then the packet.
pub fn conversation_seal(conversation: &[u8], plaintext: &[u8]) -> Result<Vec<u8>> {
    let mut conversation = Conversation::from_secret_bytes(conversation).map_err(fail)?;
    let packet = conversation.seal(plaintext).map_err(fail)?;
    Ok(parts(&[&conversation.to_secret_bytes(), &packet]))
}

/// Opens a following packet: the conversation as it is now, then the
/// plaintext. A packet from someone else fails.
pub fn conversation_open(conversation: &[u8], packet: &[u8]) -> Result<Vec<u8>> {
    let mut conversation = Conversation::from_secret_bytes(conversation).map_err(fail)?;
    let plaintext = conversation.open(packet).map_err(fail)?;
    Ok(parts(&[&conversation.to_secret_bytes(), &plaintext]))
}

/// The other person's identity key.
pub fn conversation_peer(conversation: &[u8]) -> Result<Vec<u8>> {
    Ok(Conversation::from_secret_bytes(conversation).map_err(fail)?.peer().to_vec())
}

/// 1 for a first packet, 2 for a following one, 0 for bytes that are neither.
pub fn packet_kind(packet: &[u8]) -> u8 {
    match conversation::kind(packet) {
        Ok(Kind::First) => 1,
        Ok(Kind::Following) => 2,
        Err(_) => 0,
    }
}

/// The id of the handshake in a first packet, to tell a replayed one.
pub fn first_message_id(packet: &[u8]) -> Result<Vec<u8>> {
    Ok(conversation::first_message_id(packet).map_err(fail)?.to_vec())
}

/// The safety number of two identity keys.
pub fn safety_number(ours: &[u8], theirs: &[u8]) -> Result<String> {
    let key = |b: &[u8]| <[u8; 32]>::try_from(b).map_err(|_| "an identity key is 32 bytes".to_string());
    Ok(conversation::safety_number(&key(ours)?, &key(theirs)?))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn split(bytes: &[u8]) -> Vec<Vec<u8>> {
        let mut out = Vec::new();
        let mut rest = bytes;
        while !rest.is_empty() {
            let len = u32::from_be_bytes(rest[..4].try_into().unwrap()) as usize;
            out.push(rest[4..4 + len].to_vec());
            rest = &rest[4 + len..];
        }
        out
    }

    #[test]
    fn two_accounts_talk_through_bytes_only() {
        let alice = account_new();
        let bob = account_new();
        let link = account_bundle(&bob).unwrap();
        assert_eq!(bundle_identity(&link).unwrap(), account_identity(&bob).unwrap());

        let started = split(&conversation_start(&alice, &link, b"hello").unwrap());
        assert_eq!(packet_kind(&started[1]), 1);
        let accepted = split(&conversation_accept(&bob, &started[1]).unwrap());
        assert_eq!(accepted[1], b"hello");
        assert_eq!(conversation_peer(&accepted[0]).unwrap(), account_identity(&alice).unwrap());
        assert_eq!(first_message_id(&started[1]).unwrap().len(), 32);

        let reply = split(&conversation_seal(&accepted[0], b"hi").unwrap());
        assert_eq!(packet_kind(&reply[1]), 2);
        let opened = split(&conversation_open(&started[0], &reply[1]).unwrap());
        assert_eq!(opened[1], b"hi");
        assert!(conversation_open(&started[0], &[1, 2, 3]).is_err());
        assert_eq!(packet_kind(b"{\"from\":\"\"}"), 0);

        let ours = account_identity(&alice).unwrap();
        let theirs = account_identity(&bob).unwrap();
        assert_eq!(safety_number(&ours, &theirs).unwrap(), safety_number(&theirs, &ours).unwrap());
        assert!(safety_number(&ours, &[0; 3]).is_err());
    }

    #[test]
    fn a_damaged_bundle_is_refused() {
        let mut link = account_bundle(&account_new()).unwrap();
        link[40] ^= 1;
        assert_eq!(bundle_identity(&link).unwrap_err(), "prekey bundle signature is invalid");
        assert!(bundle_identity(&link[..100]).is_err());
    }
}
