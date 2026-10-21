//! One end-to-end encrypted conversation between two people, as the apps use
//! it. The first message carries the PQXDH handshake, and every message is a
//! double-ratchet message over a padded plaintext. The associated data binds
//! both identity keys, so a message cannot be moved to another pair.
//!
//! An account has no one-time prekeys: its bundle goes into a contact link,
//! and several people may use the same link. Without them a relay could
//! replay a first message, so the app keeps the ids of the first messages it
//! accepted ([`first_message_id`]) and ignores one it has seen.
//!
//! Packets, as they cross a relay or a radio link:
//!
//! ```text
//! first:     version, 1, handshake length (u32), handshake, header, ciphertext
//! following: version, 2, header, ciphertext
//! ```
//!
//! Not audited.

use sha2::{Digest, Sha256, Sha512};
use x25519_dalek::PublicKey;
use zeroize::Zeroizing;

use crate::padding;
use crate::pqxdh::{self, Identity, InitialMessage, PrekeyBundle, Prekeys};
use crate::ratchet::{Header, Session};
use crate::wire::{Reader, VERSION};
use crate::Error;

const FIRST: u8 = 1;
const FOLLOWING: u8 = 2;

/// What a packet is, read from its first two bytes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    /// Starts a conversation: open it with [`accept`].
    First,
    /// Belongs to a conversation already started: open it with [`Conversation::open`].
    Following,
}

/// One person's keys, in one space of one app.
pub struct Account {
    identity: Identity,
    prekeys: Prekeys,
}

/// Both sides of one conversation, from one side.
/// Keys a conversation put back from a backup skips before it seals again
/// (`Conversation::restored`): below `MAX_SKIP`, so the other side still opens
/// what comes next even after a few lost messages.
pub const RESTORE_SKIP: u32 = 900;
const _: () = assert!(RESTORE_SKIP < crate::ratchet::MAX_SKIP);

pub struct Conversation {
    session: Session,
    /// The initiator's identity key, then the responder's.
    ad: [u8; 64],
    /// The other person's identity key.
    peer: [u8; 32],
}

impl Account {
    pub fn generate() -> Self {
        let identity = Identity::generate();
        let (prekeys, _) = Prekeys::generate(&identity, 0);
        Account { identity, prekeys }
    }

    /// The signed public keys to put in a contact link.
    pub fn bundle(&self) -> PrekeyBundle {
        self.prekeys.bundle(&self.identity)
    }

    /// This account's identity key, the one its contacts compare.
    pub fn identity_key(&self) -> [u8; 32] {
        PublicKey::from(&self.identity.dh).to_bytes()
    }

    /// Fresh prekeys (a signed X25519 prekey and an ML-KEM key, no one-time
    /// ones) signed by this account's identity, and their bundle. The account
    /// keeps the prekeys of its contact link; these the app keeps beside it
    /// and gives its contacts inside their conversations, so a first message
    /// started with them opens only while the app keeps them ([`accept_with`]).
    /// Thrown away later, they take what they opened with them, the ML-KEM
    /// half included.
    pub fn new_prekeys(&self) -> (Prekeys, PrekeyBundle) {
        let (prekeys, mut bundles) = Prekeys::generate(&self.identity, 0);
        (prekeys, bundles.remove(0))
    }

    /// The bundle of prekeys this account made ([`Account::new_prekeys`]).
    pub fn bundle_of(&self, prekeys: &Prekeys) -> PrekeyBundle {
        prekeys.bundle(&self.identity)
    }

    /// Signs `message` under `context` with this account's identity key, for
    /// those who hold its bundle to check with [`PrekeyBundle::verify_signed`]
    /// (the list of an account's linked devices). Never the same bytes as a
    /// bundle's own signature.
    pub fn sign(&self, context: &[u8], message: &[u8]) -> Result<[u8; 64], Error> {
        use ed25519_dalek::Signer;
        Ok(self.identity.signing.sign(&pqxdh::signed_statement(context, message)?).to_bytes())
    }

    pub fn to_secret_bytes(&self) -> Zeroizing<Vec<u8>> {
        let identity = self.identity.to_secret_bytes();
        let prekeys = self.prekeys.to_secret_bytes();
        let mut out = Zeroizing::new(Vec::with_capacity(1 + 4 + identity.len() + prekeys.len()));
        out.push(VERSION);
        out.extend_from_slice(&(identity.len() as u32).to_be_bytes());
        out.extend_from_slice(&identity);
        out.extend_from_slice(&prekeys);
        out
    }

    pub fn from_secret_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let len = r.u32()? as usize;
        let identity = Identity::from_secret_bytes(r.take(len)?)?;
        let prekeys = Prekeys::from_secret_bytes(r.rest())?;
        Ok(Account { identity, prekeys })
    }
}

/// Reads what kind of packet this is, without opening it.
pub fn kind(packet: &[u8]) -> Result<Kind, Error> {
    match packet {
        [VERSION, FIRST, ..] => Ok(Kind::First),
        [VERSION, FOLLOWING, ..] => Ok(Kind::Following),
        _ => Err(Error::Malformed),
    }
}

/// Starts a conversation with the person whose bundle this is, and seals the
/// first message to them.
pub fn start(me: &Account, bundle: &PrekeyBundle, plaintext: &[u8]) -> Result<(Conversation, Vec<u8>), Error> {
    let (session, handshake) = pqxdh::initiate(&me.identity, bundle)?;
    let mut conversation = Conversation {
        session,
        ad: pair(&me.identity_key(), bundle.identity_dh.as_bytes()),
        peer: bundle.identity_dh.to_bytes(),
    };
    let handshake = handshake.to_bytes();
    let (header, ciphertext) = conversation.encrypt(plaintext)?;
    let mut packet = Vec::with_capacity(6 + handshake.len() + Header::LEN + ciphertext.len());
    packet.extend_from_slice(&[VERSION, FIRST]);
    packet.extend_from_slice(&(handshake.len() as u32).to_be_bytes());
    packet.extend_from_slice(&handshake);
    packet.extend_from_slice(&header.to_bytes());
    packet.extend_from_slice(&ciphertext);
    Ok((conversation, packet))
}

/// Opens a first message sent to this account, and the conversation it starts.
pub fn accept(me: &mut Account, packet: &[u8]) -> Result<(Conversation, Vec<u8>), Error> {
    let identity_key = me.identity_key();
    accept_using(&me.identity, identity_key, &mut me.prekeys, packet)
}

/// Opens a first message started with prekeys this account made
/// ([`Account::new_prekeys`]) rather than those of its contact link. Which
/// prekeys a message was started with shows only in whether it opens: with
/// others, the keys come out different and its first message fails.
pub fn accept_with(me: &Account, prekeys: &mut Prekeys, packet: &[u8]) -> Result<(Conversation, Vec<u8>), Error> {
    accept_using(&me.identity, me.identity_key(), prekeys, packet)
}

fn accept_using(identity: &Identity, identity_key: [u8; 32], prekeys: &mut Prekeys, packet: &[u8]) -> Result<(Conversation, Vec<u8>), Error> {
    let (handshake, header, ciphertext) = split_first(packet)?;
    let handshake = InitialMessage::from_bytes(handshake)?;
    let session = pqxdh::respond(identity, prekeys, &handshake)?;
    let mut conversation = Conversation {
        session,
        ad: pair(handshake.identity_dh.as_bytes(), &identity_key),
        peer: handshake.identity_dh.to_bytes(),
    };
    let plaintext = conversation.decrypt(&header, ciphertext)?;
    Ok((conversation, plaintext))
}

/// An id for the handshake in a first message, the same however often the
/// message is sent, so an app can tell a replayed one.
pub fn first_message_id(packet: &[u8]) -> Result<[u8; 32], Error> {
    let (handshake, _, _) = split_first(packet)?;
    Ok(Sha256::digest(handshake).into())
}

fn split_first(packet: &[u8]) -> Result<(&[u8], Header, &[u8]), Error> {
    if kind(packet)? != Kind::First {
        return Err(Error::Malformed);
    }
    let mut r = Reader::new(packet)?;
    r.u8()?;
    let len = r.u32()? as usize;
    let handshake = r.take(len)?;
    let header = Header::from_bytes(r.take(Header::LEN)?)?;
    Ok((handshake, header, r.rest()))
}

fn pair(initiator: &[u8; 32], responder: &[u8; 32]) -> [u8; 64] {
    let mut ad = [0u8; 64];
    ad[..32].copy_from_slice(initiator);
    ad[32..].copy_from_slice(responder);
    ad
}

impl Conversation {
    /// Seals a message for the other person.
    pub fn seal(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, Error> {
        let (header, ciphertext) = self.encrypt(plaintext)?;
        let mut packet = Vec::with_capacity(2 + Header::LEN + ciphertext.len());
        packet.extend_from_slice(&[VERSION, FOLLOWING]);
        packet.extend_from_slice(&header.to_bytes());
        packet.extend_from_slice(&ciphertext);
        Ok(packet)
    }

    /// Makes a conversation put back from a backup safe to send in again:
    /// its sending chain moves past `RESTORE_SKIP` keys, more than any one
    /// chain is likely to have sealed with since the backup was made.
    pub fn restored(&mut self) -> Result<(), Error> {
        self.session.skip_sending(RESTORE_SKIP)
    }

    /// Opens a message from the other person. A packet that is not theirs
    /// fails and leaves the conversation as it was.
    pub fn open(&mut self, packet: &[u8]) -> Result<Vec<u8>, Error> {
        if kind(packet)? != Kind::Following {
            return Err(Error::Malformed);
        }
        let mut r = Reader::new(packet)?;
        r.u8()?;
        let header = Header::from_bytes(r.take(Header::LEN)?)?;
        self.decrypt(&header, r.rest())
    }

    /// The other person's identity key.
    pub fn peer(&self) -> [u8; 32] {
        self.peer
    }

    pub fn to_secret_bytes(&self) -> Zeroizing<Vec<u8>> {
        let session = self.session.to_secret_bytes();
        let mut out = Zeroizing::new(Vec::with_capacity(1 + 64 + 32 + session.len()));
        out.push(VERSION);
        out.extend_from_slice(&self.ad);
        out.extend_from_slice(&self.peer);
        out.extend_from_slice(&session);
        out
    }

    pub fn from_secret_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let ad = r.array::<64>()?;
        let peer = r.array::<32>()?;
        // The other person's key is one of the two the associated data binds.
        if peer[..] != ad[..32] && peer[..] != ad[32..] {
            return Err(Error::Malformed);
        }
        let session = Session::from_secret_bytes(r.rest())?;
        Ok(Conversation { session, ad, peer })
    }

    fn encrypt(&mut self, plaintext: &[u8]) -> Result<(Header, Vec<u8>), Error> {
        let padded = Zeroizing::new(padding::pad(plaintext)?);
        self.session.encrypt(&padded, &self.ad)
    }

    fn decrypt(&mut self, header: &Header, ciphertext: &[u8]) -> Result<Vec<u8>, Error> {
        let padded = Zeroizing::new(self.session.decrypt(header, ciphertext, &self.ad)?);
        Ok(padding::unpad(&padded)?.to_vec())
    }
}

/// The number two people compare, side by side or out loud, to check that
/// no relay swapped their keys: sixty digits in groups of five, the same on
/// both phones whichever side computes it.
pub fn safety_number(ours: &[u8; 32], theirs: &[u8; 32]) -> String {
    let (low, high) = if ours <= theirs { (ours, theirs) } else { (theirs, ours) };
    let mut hash = Sha512::new();
    hash.update(b"erevos safety number v1");
    hash.update(low);
    hash.update(high);
    let digest = hash.finalize();
    digest[..60]
        .chunks(5)
        .map(|chunk| {
            let n = chunk.iter().fold(0u64, |acc, b| (acc << 8) | u64::from(*b));
            format!("{:05}", n % 100_000)
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reload(c: &Conversation) -> Conversation {
        Conversation::from_secret_bytes(&c.to_secret_bytes()).unwrap()
    }

    #[test]
    fn a_conversation_from_a_contact_link() {
        let alice = Account::generate();
        let mut bob = Account::generate();
        let link_bundle = PrekeyBundle::from_bytes(&bob.bundle().to_bytes()).unwrap();

        let (mut a, first) = start(&alice, &link_bundle, b"hi bob, it's alice").unwrap();
        assert_eq!(kind(&first).unwrap(), Kind::First);
        let (mut b, text) = accept(&mut bob, &first).unwrap();
        assert_eq!(text, b"hi bob, it's alice");
        assert_eq!(b.peer(), alice.identity_key());
        assert_eq!(a.peer(), bob.identity_key());

        // Alice writes again before Bob answers, then they go back and forth,
        // each side reloaded from storage in between.
        let again = a.seal(b"are you there?").unwrap();
        assert_eq!(kind(&again).unwrap(), Kind::Following);
        assert_eq!(b.open(&again).unwrap(), b"are you there?");
        for i in 0..3 {
            let (mut a2, mut b2) = (reload(&a), reload(&b));
            let reply = b2.seal(format!("yes {i}").as_bytes()).unwrap();
            assert_eq!(a2.open(&reply).unwrap(), format!("yes {i}").as_bytes());
            let more = a2.seal(b"good").unwrap();
            assert_eq!(b2.open(&more).unwrap(), b"good");
            (a, b) = (a2, b2);
        }
    }

    #[test]
    fn a_conversation_put_back_from_a_backup_never_seals_with_a_key_twice() {
        let alice = Account::generate();
        let mut bob = Account::generate();
        let (mut a, first) = start(&alice, &bob.bundle(), b"hi").unwrap();
        let (mut b, _) = accept(&mut bob, &first).unwrap();
        let backup = reload(&a);
        // After the backup, Alice goes on writing; Bob reads it all.
        let mut sent = Vec::new();
        for i in 0..5 {
            let packet = a.seal(format!("after the backup {i}").as_bytes()).unwrap();
            assert_eq!(b.open(&packet).unwrap(), format!("after the backup {i}").as_bytes());
            sent.push(packet);
        }
        // The backup is put back: what it seals next is under keys no packet used.
        let mut restored = reload(&backup);
        restored.restored().unwrap();
        let again = restored.seal(b"after the restore").unwrap();
        let header = |p: &[u8]| Header::from_bytes(&p[2..2 + Header::LEN]).unwrap();
        assert!(sent.iter().all(|p| header(p).n < header(&again).n));
        assert_eq!(header(&again).n, header(&sent[0]).n + RESTORE_SKIP);
        // Bob opens it as after lost messages, and the conversation goes on both ways.
        assert_eq!(b.open(&again).unwrap(), b"after the restore");
        let reply = b.seal(b"got it").unwrap();
        assert_eq!(restored.open(&reply).unwrap(), b"got it");
        // Unrestored, the backup's next packet would have been the first one sent after it.
        assert_eq!(header(&reload(&backup).seal(b"x").unwrap()).n, header(&sent[0]).n);
    }

    #[test]
    fn every_message_has_one_of_a_few_lengths() {
        let alice = Account::generate();
        let bob = Account::generate();
        let (mut a, _) = start(&alice, &bob.bundle(), b"x").unwrap();
        let short = a.seal(b"ok").unwrap();
        let longer = a.seal(&[b'a'; 200]).unwrap();
        assert_eq!(short.len(), longer.len());
        assert_ne!(a.seal(&[b'a'; 300]).unwrap().len(), short.len());
    }

    #[test]
    fn a_stranger_cannot_open_or_take_over() {
        let alice = Account::generate();
        let mut bob = Account::generate();
        let mut mallory = Account::generate();
        let (mut a, first) = start(&alice, &bob.bundle(), b"for bob only").unwrap();
        assert!(accept(&mut mallory, &first).is_err());
        let (mut b, _) = accept(&mut bob, &first).unwrap();

        // Mallory's own conversation with Bob cannot open Alice's messages.
        let (mut m, m_first) = start(&mallory, &bob.bundle(), b"hello").unwrap();
        let (mut bm, _) = accept(&mut bob, &m_first).unwrap();
        let from_alice = a.seal(b"still for bob").unwrap();
        assert!(bm.open(&from_alice).is_err());
        assert_eq!(b.open(&from_alice).unwrap(), b"still for bob");
        let from_mallory = m.seal(b"me again").unwrap();
        assert!(b.open(&from_mallory).is_err());
    }

    #[test]
    fn first_messages_have_their_own_ids() {
        let alice = Account::generate();
        let mut bob = Account::generate();
        let (_, first) = start(&alice, &bob.bundle(), b"one").unwrap();
        let (_, other) = start(&alice, &bob.bundle(), b"one").unwrap();
        assert_ne!(first_message_id(&first).unwrap(), first_message_id(&other).unwrap());
        // Without the id, a replayed first message would open again: that is why the app keeps it.
        let id = first_message_id(&first).unwrap();
        accept(&mut bob, &first).unwrap();
        assert!(accept(&mut bob, &first).is_ok());
        assert_eq!(first_message_id(&first).unwrap(), id);
        let (mut a, _) = start(&alice, &bob.bundle(), b"two").unwrap();
        assert!(first_message_id(&a.seal(b"three").unwrap()).is_err());
    }

    #[test]
    fn an_account_survives_a_restart() {
        let bob = Account::generate();
        let bundle = bob.bundle().to_bytes();
        let mut bob = Account::from_secret_bytes(&bob.to_secret_bytes()).unwrap();
        assert_eq!(bob.bundle().to_bytes(), bundle);
        let alice = Account::generate();
        let (_, first) = start(&alice, &PrekeyBundle::from_bytes(&bundle).unwrap(), b"later").unwrap();
        assert_eq!(accept(&mut bob, &first).unwrap().1, b"later");
    }

    #[test]
    fn packets_of_the_wrong_kind_or_damaged_fail() {
        let alice = Account::generate();
        let mut bob = Account::generate();
        let (mut a, first) = start(&alice, &bob.bundle(), b"x").unwrap();
        let (mut b, _) = accept(&mut bob, &first).unwrap();
        assert!(b.open(&first).is_err());
        let next = a.seal(b"y").unwrap();
        assert!(accept(&mut bob, &next).is_err());
        assert!(kind(&[]).is_err());
        assert!(kind(&[VERSION, 7]).is_err());
        let mut damaged = next.clone();
        let last = damaged.len() - 1;
        damaged[last] ^= 1;
        assert!(b.open(&damaged).is_err());
        assert_eq!(b.open(&next).unwrap(), b"y");
        assert!(accept(&mut bob, &first[..first.len() - 20]).is_err());
    }

    #[test]
    fn a_conversation_started_with_newer_prekeys_opens_only_with_them() {
        let alice = Account::generate();
        let mut bob = Account::generate();
        let (mut fresh, bundle) = bob.new_prekeys();
        let bundle = PrekeyBundle::from_bytes(&bundle.to_bytes()).unwrap();
        bundle.verify().unwrap();
        assert_eq!(bundle.identity_dh.to_bytes(), bob.identity_key());
        assert_eq!(bob.bundle_of(&fresh).to_bytes(), bundle.to_bytes());
        assert_ne!(bundle.to_bytes(), bob.bundle().to_bytes());

        let (mut a, first) = start(&alice, &bundle, b"again, with your new keys").unwrap();
        // Not with the link's prekeys, nor with other new ones.
        assert!(accept(&mut bob, &first).is_err());
        let (mut other, _) = bob.new_prekeys();
        assert!(accept_with(&bob, &mut other, &first).is_err());
        // With the same prekeys, kept and loaded again.
        let mut kept = Prekeys::from_secret_bytes(&fresh.to_secret_bytes()).unwrap();
        let (mut b, text) = accept_with(&bob, &mut kept, &first).unwrap();
        assert_eq!(text, b"again, with your new keys");
        assert_eq!(b.peer(), alice.identity_key());
        let reply = b.seal(b"got it").unwrap();
        assert_eq!(a.open(&reply).unwrap(), b"got it");
        // And it does not use up the prekeys: a second contact can start with them too.
        let carol = Account::generate();
        let (_, first) = start(&carol, &bundle, b"hi").unwrap();
        assert_eq!(accept_with(&bob, &mut fresh, &first).unwrap().1, b"hi");
        // The link's still open what was started with them.
        let (_, first) = start(&carol, &bob.bundle(), b"by the link").unwrap();
        assert_eq!(accept(&mut bob, &first).unwrap().1, b"by the link");
    }

    #[test]
    fn an_account_signs_statements_its_bundle_checks() {
        let alice = Account::generate();
        let bundle = PrekeyBundle::from_bytes(&alice.bundle().to_bytes()).unwrap();
        let signature = alice.sign(b"devices", b"the list").unwrap();
        bundle.verify_signed(b"devices", b"the list", &signature).unwrap();
        // Another context, message or account, or a changed signature: refused.
        assert!(bundle.verify_signed(b"device", b"the list", &signature).is_err());
        assert!(bundle.verify_signed(b"devices", b"the list!", &signature).is_err());
        let other = PrekeyBundle::from_bytes(&Account::generate().bundle().to_bytes()).unwrap();
        assert!(other.verify_signed(b"devices", b"the list", &signature).is_err());
        let mut changed = signature;
        changed[5] ^= 1;
        assert!(bundle.verify_signed(b"devices", b"the list", &changed).is_err());
        assert!(bundle.verify_signed(b"devices", b"the list", &signature[..63]).is_err());
        // A context cannot run into the message.
        assert!(alice.sign(b"dev\0ices", b"x").is_err());
        assert!(alice.sign(b"", b"x").is_err());
        assert!(bundle.verify_signed(b"devices\0the", b" list", &signature).is_err());
    }

    #[test]
    fn a_statement_and_a_bundle_never_pass_for_each_other() {
        let alice = Account::generate();
        let bundle = alice.bundle();
        // The bundle's own signature, over its own transcript, is no statement.
        assert!(bundle.verify_signed(b"erevos prekey bundle v1", b"", &bundle.signature).is_err());
        // A statement over a bundle's transcript bytes is no bundle signature.
        let mut forged = bundle.clone();
        let transcript = super::pqxdh::signed_statement(b"devices", b"x").unwrap();
        assert!(!transcript.starts_with(b"erevos prekey bundle v1"));
        forged.signature = alice.sign(b"erevos prekey bundle v1", b"").unwrap();
        assert!(forged.verify().is_err());
        // Its identity, named in a bundle someone else signed, does not check its statements.
        let mallory = Account::generate();
        let mut stolen = mallory.bundle();
        stolen.identity_dh = bundle.identity_dh;
        let signature = alice.sign(b"devices", b"x").unwrap();
        assert!(stolen.verify_signed(b"devices", b"x", &signature).is_err());
    }

    #[test]
    fn both_sides_see_the_same_safety_number() {
        let alice = Account::generate();
        let bob = Account::generate();
        let one = safety_number(&alice.identity_key(), &bob.identity_key());
        let two = safety_number(&bob.identity_key(), &alice.identity_key());
        assert_eq!(one, two);
        assert_eq!(one.len(), 12 * 5 + 11);
        assert!(one.split(' ').all(|g| g.len() == 5 && g.bytes().all(|c| c.is_ascii_digit())));
        assert_ne!(one, safety_number(&alice.identity_key(), &Account::generate().identity_key()));
    }
}
