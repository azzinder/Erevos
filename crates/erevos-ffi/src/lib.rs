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

/// A conversation put back from a backup, made safe to seal in again: its
/// sending chain moved past the keys it may have sealed with since then.
pub fn conversation_restored(conversation: &[u8]) -> Result<Vec<u8>> {
    let mut conversation = Conversation::from_secret_bytes(conversation).map_err(fail)?;
    conversation.restored().map_err(fail)?;
    Ok(conversation.to_secret_bytes().to_vec())
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

/// Chats exported from another messenger (crates/erevos-import), for the
/// app as UTF-8 JSON: a list of `{source, title, skipped, messages}`, each
/// message `{at, local, sender, text, attachments, paths}`. `at` is in
/// seconds, on the exporting phone's clock when `local`; `attachments` names
/// the kind of each file, and `paths` where each is in the export, relative to
/// its folder, for the app to bring in from a zip with them. `name` is the
/// file's name, UTF-8.
pub fn import_chats(name: &[u8], data: &[u8]) -> Result<Vec<u8>> {
    use erevos_import::{AttachmentKind, Source, Time};
    let chats = erevos_import::read(&String::from_utf8_lossy(name), data).map_err(|e| e.to_string())?;
    let json: Vec<serde_json::Value> = chats
        .iter()
        .map(|chat| {
            let messages: Vec<serde_json::Value> = chat
                .messages
                .iter()
                .map(|m| {
                    let (at, local) = match m.sent_at {
                        Some(Time::Unix(at)) => (Some(at), false),
                        Some(Time::Local(at)) => (Some(at), true),
                        None => (None, false),
                    };
                    let attachments: Vec<&str> = m
                        .attachments
                        .iter()
                        .map(|a| match a.kind {
                            AttachmentKind::Photo => "photo",
                            AttachmentKind::Video => "video",
                            AttachmentKind::Voice => "voice",
                            AttachmentKind::Sticker => "sticker",
                            AttachmentKind::File => "file",
                        })
                        .collect();
                    let paths: Vec<String> =
                        m.attachments.iter().map(|a| a.path.to_string_lossy().replace('\\', "/")).collect();
                    serde_json::json!({
                        "at": at, "local": local, "sender": m.sender, "text": m.text, "attachments": attachments,
                        "paths": paths,
                    })
                })
                .collect();
            let source = match chat.source {
                Source::Telegram => "telegram",
                Source::Viber => "viber",
                Source::WhatsApp => "whatsapp",
            };
            serde_json::json!({ "source": source, "title": chat.title, "skipped": chat.skipped, "messages": messages })
        })
        .collect();
    serde_json::to_vec(&json).map_err(|e| e.to_string())
}

/// Seals a send to a contact's relay, to go through this phone's own relay
/// first (two-hop sending, erevos_core::relay_seal). `relay_key` is from the
/// contact's link, `sender_id` is the queue's sender id.
pub fn relay_seal(relay_key: &[u8], sender_id: &[u8], message: &[u8]) -> Result<Vec<u8>> {
    let relay_key = <[u8; 32]>::try_from(relay_key).map_err(|_| "a relay key is 32 bytes".to_string())?;
    let sender_id = <[u8; 24]>::try_from(sender_id).map_err(|_| "a sender id is 24 bytes".to_string())?;
    erevos_core::relay_seal::seal(&relay_key, &sender_id, message).map_err(fail)
}

/// The public key for a 32-byte secret, for others to seal to with `relay_seal`
/// (an SMS invite's key, which opens the answer to it).
pub fn seal_public(secret: &[u8]) -> Result<Vec<u8>> {
    let secret = <[u8; 32]>::try_from(secret).map_err(|_| "a secret key is 32 bytes".to_string())?;
    Ok(erevos_core::relay_seal::RelayKey::from_secret_bytes(secret).public().to_vec())
}

/// Opens what `relay_seal` sealed to the public key of `secret`: the 24-byte
/// sender id, then the message.
pub fn seal_open(secret: &[u8], sealed: &[u8]) -> Result<Vec<u8>> {
    let secret = <[u8; 32]>::try_from(secret).map_err(|_| "a secret key is 32 bytes".to_string())?;
    let (sender, message) = erevos_core::relay_seal::RelayKey::from_secret_bytes(secret).open(sealed).map_err(fail)?;
    Ok([sender.as_slice(), &message].concat())
}

/// Relay requests through Tor (erevos_tor), with byte arrays in and out as
/// the JNI calls take them: paths and addresses are UTF-8, a connection's
/// handle is 8 bytes, big-endian. Bridges come one per line, and the
/// pluggable transports program as its path, empty when there is none.
#[cfg(feature = "tor")]
pub mod tor {
    use super::Result;

    fn text(bytes: &[u8]) -> Result<&str> {
        std::str::from_utf8(bytes).map_err(|_| "not UTF-8".to_string())
    }

    fn handle(bytes: &[u8]) -> Result<u64> {
        Ok(u64::from_be_bytes(bytes.try_into().map_err(|_| "a handle is 8 bytes".to_string())?))
    }

    pub fn start(state_dir: &[u8], cache_dir: &[u8], bridges: &[u8], transports: &[u8]) -> Result<Vec<u8>> {
        let bridges = erevos_tor::Bridges {
            lines: text(bridges)?.lines().map(str::trim).filter(|line| !line.is_empty()).map(String::from).collect(),
            transports: Some(text(transports)?).filter(|path| !path.is_empty()).map(std::path::PathBuf::from),
        };
        erevos_tor::start(text(state_dir)?.as_ref(), text(cache_dir)?.as_ref(), bridges)?;
        Ok(Vec::new())
    }

    pub fn open(url: &[u8], token: &[u8]) -> Result<Vec<u8>> {
        Ok(erevos_tor::open(text(url)?, text(token)?)?.to_be_bytes().to_vec())
    }

    pub fn call(id: &[u8], message: &[u8]) -> Result<Vec<u8>> {
        erevos_tor::call(handle(id)?, message)
    }

    pub fn close(id: &[u8]) -> Result<Vec<u8>> {
        erevos_tor::close(handle(id)?);
        Ok(Vec::new())
    }

    pub fn request(url: &[u8], token: &[u8], message: &[u8]) -> Result<Vec<u8>> {
        erevos_tor::request(text(url)?, text(token)?, message)
    }

    /// Tor's progress as JSON: {"text": ..., "ready": ...}.
    pub fn status() -> String {
        let (text, ready) = erevos_tor::status();
        serde_json::json!({ "text": text, "ready": ready }).to_string()
    }

    pub fn stop() {
        erevos_tor::stop();
    }
}

/// The safety number of two identity keys.
pub fn safety_number(ours: &[u8], theirs: &[u8]) -> Result<String> {
    let key = |b: &[u8]| <[u8; 32]>::try_from(b).map_err(|_| "an identity key is 32 bytes".to_string());
    Ok(conversation::safety_number(&key(ours)?, &key(theirs)?))
}

/// Group chats (crates/erevos-group): a member's state goes in and comes back out with every
/// call that changes it, like a conversation's. A leaf is a 4-byte big-endian number.
mod group {
    use super::{parts, Result};
    use erevos_group::{Member, Opened};

    fn fail(e: erevos_group::Error) -> String {
        e.to_string()
    }

    fn member(state: &[u8]) -> Result<Member> {
        Member::from_bytes(state).map_err(fail)
    }

    fn leaf(bytes: &[u8]) -> Result<u32> {
        Ok(u32::from_be_bytes(bytes.try_into().map_err(|_| "a leaf is 4 bytes".to_string())?))
    }

    /// A new member's state, saying `about` of itself.
    pub fn group_new(about: &[u8]) -> Result<Vec<u8>> {
        Ok(Member::new(about).map_err(fail)?.to_bytes())
    }

    /// The state, then a key package for an admin to add this member with.
    pub fn group_key_package(state: &[u8]) -> Result<Vec<u8>> {
        let member = member(state)?;
        let package = member.key_package().map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &package]))
    }

    /// The state, with what this member says about itself in groups it joins from now on.
    pub fn group_set_about(state: &[u8], about: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        member.set_about(about);
        Ok(member.to_bytes())
    }

    /// The state, then the new group's id.
    pub fn group_create(state: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let id = member.create().map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &id]))
    }

    /// The state, the commit for the members already in, and the welcome for the new one.
    pub fn group_add(state: &[u8], id: &[u8], key_package: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let (commit, welcome) = member.add(id, &[key_package]).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &commit, &welcome]))
    }

    /// The state, then the commit that takes the member at `leaf` out.
    pub fn group_remove(state: &[u8], id: &[u8], leaf_bytes: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let commit = member.remove(id, &[leaf(leaf_bytes)?]).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &commit]))
    }

    /// The state, then the commit for what members asked, empty when there is nothing to commit.
    pub fn group_commit_pending(state: &[u8], id: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let commit = member.commit_pending(id).map_err(fail)?.unwrap_or_default();
        Ok(parts(&[&member.to_bytes(), &commit]))
    }

    /// The state, then the id of the group the welcome joins.
    pub fn group_join(state: &[u8], welcome: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let id = member.join(welcome).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &id]))
    }

    /// The state, then the sealed message.
    pub fn group_seal(state: &[u8], id: &[u8], text: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let message = member.seal(id, text).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &message]))
    }

    /// The state, then the message asking the admin to take this member out.
    pub fn group_leave(state: &[u8], id: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let message = member.leave(id).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &message]))
    }

    /// The state without the group.
    pub fn group_forget(state: &[u8], id: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        member.forget(id).map_err(fail)?;
        Ok(member.to_bytes())
    }

    /// The group's members as UTF-8 JSON: `{own, members: [{leaf, about, key}]}`, `about` as
    /// UTF-8, `key` (the key the member signs with) in hex.
    pub fn group_members(state: &[u8], id: &[u8]) -> Result<Vec<u8>> {
        let (seats, own) = member(state)?.members(id).map_err(fail)?;
        let hex = |bytes: &[u8]| bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();
        let members: Vec<serde_json::Value> = seats
            .iter()
            .map(|seat| serde_json::json!({ "leaf": seat.leaf, "about": String::from_utf8_lossy(&seat.about), "key": hex(&seat.key) }))
            .collect();
        serde_json::to_vec(&serde_json::json!({ "own": own, "members": members })).map_err(|e| e.to_string())
    }

    // Public groups (docs/public-groups.md).

    // The values of an array of length-prefixed parts.
    fn split(bytes: &[u8]) -> Result<Vec<&[u8]>> {
        let mut out = Vec::new();
        let mut rest = bytes;
        while !rest.is_empty() {
            let len = rest.get(..4).map(|l| u32::from_be_bytes(l.try_into().unwrap()) as usize).ok_or("damaged parts")?;
            out.push(rest.get(4..4 + len).ok_or("damaged parts")?);
            rest = &rest[4 + len..];
        }
        Ok(out)
    }

    /// The state, then a new key to sign with in one public group (its public half).
    pub fn group_new_signer(state: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let key = member.new_signer().map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &key]))
    }

    /// The state, then a key package to ask to join a public group with, signed with `key` (from
    /// `group_new_signer`) and saying `about`.
    pub fn group_key_package_as(state: &[u8], key: &[u8], about: &[u8]) -> Result<Vec<u8>> {
        let member = member(state)?;
        let package = member.key_package_as(key, about).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &package]))
    }

    /// The state, then the id of a new public group, signed in with `key`, saying `about`, with
    /// the app's first `rules`.
    pub fn group_create_public(state: &[u8], key: &[u8], about: &[u8], rules: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let id = member.create_public(key, about, rules).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &id]))
    }

    /// The group's epoch now (8 bytes), its keeper's leaf, then its rules: empty for a private group.
    pub fn group_rules(state: &[u8], id: &[u8]) -> Result<Vec<u8>> {
        let rules = member(state)?.rules(id).map_err(fail)?;
        Ok(parts(&[&rules.epoch.to_be_bytes(), &rules.keeper.to_be_bytes(), &rules.rules]))
    }

    /// The state, the commit, then the welcome (empty without adds): the keeper's one commit of
    /// `key_packages` (as parts) to add, the leaves in `removes` (4 bytes each) to take out, and
    /// with `rules` not empty, a keeper's leaf (4 bytes) and the rules after it.
    pub fn group_commit(state: &[u8], id: &[u8], key_packages: &[u8], removes: &[u8], rules: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let packages = split(key_packages)?;
        if !removes.len().is_multiple_of(4) {
            return Err("a leaf is 4 bytes".to_string());
        }
        let leaves: Vec<u32> = removes.chunks(4).map(|l| u32::from_be_bytes(l.try_into().unwrap())).collect();
        let rules = match rules.len() {
            0 => None,
            1..=3 => return Err("a leaf is 4 bytes".to_string()),
            _ => Some((leaf(&rules[..4])?, &rules[4..])),
        };
        let (commit, welcome) = member.commit(id, &packages, &leaves, rules).map_err(fail)?;
        Ok(parts(&[&member.to_bytes(), &commit, &welcome]))
    }

    /// What a key package says about its member, then the key it signs with, once its signatures hold.
    pub fn group_package_about(key_package: &[u8]) -> Result<Vec<u8>> {
        let (about, key) = Member::package_about(key_package).map_err(fail)?;
        Ok(parts(&[&about, &key]))
    }

    /// The epoch a group message was sent in (8 bytes), without opening it.
    pub fn group_epoch(message: &[u8]) -> Result<Vec<u8>> {
        Ok(Member::epoch_of(message).map_err(fail)?.to_be_bytes().to_vec())
    }

    /// The id of the group a message is for.
    pub fn group_of(message: &[u8]) -> Result<Vec<u8>> {
        Member::group_of(message).map_err(fail)
    }

    /// Opens a group message: the state, then one byte for what it was, the group's id, the
    /// sender's leaf, what the sender says about itself, and the text. The byte: 1 a message,
    /// 2 the group changed, 3 this member was taken out, 4 a member asks to leave, 5 to try again
    /// after the next commit, 0 nothing to show.
    pub fn group_open(state: &[u8], message: &[u8]) -> Result<Vec<u8>> {
        let mut member = member(state)?;
        let opened = member.open(message).map_err(fail)?;
        let none: &[u8] = &[];
        let (kind, id, sender, about, text) = match &opened {
            Opened::Message { group, sender, about, text } => (1u8, group.as_slice(), *sender, about.as_slice(), text.as_slice()),
            Opened::Changed { group } => (2, group.as_slice(), 0, none, none),
            Opened::Removed { group } => (3, group.as_slice(), 0, none, none),
            Opened::Leaving { group, sender } => (4, group.as_slice(), *sender, none, none),
            Opened::Later { group } => (5, group.as_slice(), 0, none, none),
            Opened::Nothing => (0, none, 0, none, none),
        };
        Ok(parts(&[&member.to_bytes(), &[kind], id, &sender.to_be_bytes(), about, text]))
    }
}

pub use group::*;

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
    fn seals_for_a_relay() {
        let relay = erevos_core::relay_seal::RelayKey::generate();
        let sealed = relay_seal(&relay.public(), &[3; 24], b"hi").unwrap();
        assert_eq!(relay.open(&sealed).unwrap(), ([3; 24], b"hi".to_vec()));
        assert!(relay_seal(&[1; 31], &[3; 24], b"hi").is_err());
        assert!(relay_seal(&relay.public(), &[3; 23], b"hi").is_err());
    }

    #[test]
    fn opens_what_was_sealed_to_a_secret() {
        let secret = [9u8; 32];
        let sealed = relay_seal(&seal_public(&secret).unwrap(), &[3; 24], b"hi").unwrap();
        assert_eq!(seal_open(&secret, &sealed).unwrap(), [[3u8; 24].as_slice(), b"hi"].concat());
        assert!(seal_open(&[8; 32], &sealed).is_err());
        assert!(seal_public(&[1; 31]).is_err());
    }

    #[test]
    fn imports_a_chat_as_json() {
        let text = "17/10/2026, 09:06 - Μαρία: γεια\n17/10/2026, 09:07 - Nekten: IMG-1.jpg (file attached)";
        let json: serde_json::Value =
            serde_json::from_slice(&import_chats("WhatsApp Chat with Μαρία.txt".as_bytes(), text.as_bytes()).unwrap())
                .unwrap();
        assert_eq!(json[0]["source"], "whatsapp");
        assert_eq!(json[0]["title"], "Μαρία");
        assert_eq!(json[0]["messages"][0]["text"], "γεια");
        assert_eq!(json[0]["messages"][0]["local"], true);
        assert_eq!(json[0]["messages"][0]["at"], 1_792_227_960);
        assert_eq!(json[0]["messages"][1]["attachments"][0], "photo");
        assert_eq!(json[0]["messages"][1]["paths"][0], "IMG-1.jpg");
        assert!(import_chats(b"x.html", b"<html>").unwrap_err().contains("result.json"));
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
    fn a_group_talks_through_bytes_only() {
        let alice = group_new(b"{\"a\":1}").unwrap();
        let bob = group_new(b"bob").unwrap();
        let [alice, id]: [Vec<u8>; 2] = split(&group_create(&alice).unwrap()).try_into().unwrap();
        let [bob, package]: [Vec<u8>; 2] = split(&group_key_package(&bob).unwrap()).try_into().unwrap();
        let [alice, _commit, welcome]: [Vec<u8>; 3] = split(&group_add(&alice, &id, &package).unwrap()).try_into().unwrap();
        let [bob, joined]: [Vec<u8>; 2] = split(&group_join(&bob, &welcome).unwrap()).try_into().unwrap();
        assert_eq!(joined, id);

        let [_bob, message]: [Vec<u8>; 2] = split(&group_seal(&bob, &id, b"hi").unwrap()).try_into().unwrap();
        assert_eq!(group_of(&message).unwrap(), id);
        let opened = split(&group_open(&alice, &message).unwrap());
        assert_eq!(opened[1], [1]);
        assert_eq!(opened[2], id);
        assert_eq!(opened[3], 1u32.to_be_bytes());
        assert_eq!(opened[4], b"bob");
        assert_eq!(opened[5], b"hi");

        let members: serde_json::Value = serde_json::from_slice(&group_members(&opened[0], &id).unwrap()).unwrap();
        assert_eq!(members["own"], 0);
        assert_eq!(members["members"][0]["about"], "{\"a\":1}");
        assert_eq!(members["members"][1]["leaf"], 1);

        let [alice, commit]: [Vec<u8>; 2] = split(&group_remove(&opened[0], &id, &1u32.to_be_bytes()).unwrap()).try_into().unwrap();
        assert!(!commit.is_empty());
        assert!(group_remove(&alice, &id, &[1]).is_err());
        let [alice, nothing]: [Vec<u8>; 2] = split(&group_commit_pending(&alice, &id).unwrap()).try_into().unwrap();
        assert!(nothing.is_empty());
        assert!(group_members(&group_forget(&alice, &id).unwrap(), &id).is_err());
    }

    #[test]
    fn a_public_group_goes_through_bytes_only() {
        let [alice, key]: [Vec<u8>; 2] = split(&group_new_signer(&group_new(b"a").unwrap()).unwrap()).try_into().unwrap();
        let [alice, id]: [Vec<u8>; 2] = split(&group_create_public(&alice, &key, b"alice", b"{}").unwrap()).try_into().unwrap();
        let [bob, bob_key]: [Vec<u8>; 2] = split(&group_new_signer(&group_new(b"b").unwrap()).unwrap()).try_into().unwrap();
        let [bob, package]: [Vec<u8>; 2] = split(&group_key_package_as(&bob, &bob_key, b"bob").unwrap()).try_into().unwrap();
        assert_eq!(split(&group_package_about(&package).unwrap()), [b"bob".to_vec(), bob_key.clone()]);

        let rules = [&0u32.to_be_bytes()[..], b"{\"v\":1}"].concat();
        let [alice, commit, welcome]: [Vec<u8>; 3] =
            split(&group_commit(&alice, &id, &parts(&[&package]), &[], &rules).unwrap()).try_into().unwrap();
        assert!(!commit.is_empty());
        let [bob, _]: [Vec<u8>; 2] = split(&group_join(&bob, &welcome).unwrap()).try_into().unwrap();
        assert_eq!(split(&group_rules(&bob, &id).unwrap()), [1u64.to_be_bytes().to_vec(), 0u32.to_be_bytes().to_vec(), b"{\"v\":1}".to_vec()]);
        let members: serde_json::Value = serde_json::from_slice(&group_members(&bob, &id).unwrap()).unwrap();
        assert_eq!(members["members"][1]["key"], bob_key.iter().map(|b| format!("{b:02x}")).collect::<String>());

        let [_, message]: [Vec<u8>; 2] = split(&group_seal(&bob, &id, b"hi").unwrap()).try_into().unwrap();
        assert_eq!(group_epoch(&message).unwrap(), 1u64.to_be_bytes());
        // Taking out Bob, with no new rules and no welcome.
        let [_, _, welcome]: [Vec<u8>; 3] = split(&group_commit(&alice, &id, &[], &1u32.to_be_bytes(), &[]).unwrap()).try_into().unwrap();
        assert!(welcome.is_empty());
        assert!(group_commit(&alice, &id, &[], &[1, 2], &[]).is_err());
    }

    #[test]
    fn a_damaged_bundle_is_refused() {
        let mut link = account_bundle(&account_new()).unwrap();
        link[40] ^= 1;
        assert_eq!(bundle_identity(&link).unwrap_err(), "prekey bundle signature is invalid");
        assert!(bundle_identity(&link[..100]).is_err());
    }
}
