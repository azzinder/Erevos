//! Group chats: MLS (RFC 9420) through OpenMLS. Like the rest of the core, nothing is kept here
//! between calls: a member's state (its signing key and every group it is in) goes out as bytes
//! after each call, the app keeps them sealed, and passes them in again.
//!
//! How Erevos uses MLS:
//! - Whoever makes a group is its admin, leaf 0, and the only one who commits: adds, removes,
//!   and the removals members ask for when they leave. Members refuse a commit from anyone else,
//!   so commits never race, and no server has to order them.
//! - Every message, commits included, goes as an MLS PrivateMessage, so whoever carries it learns
//!   neither the text nor who is in the group.
//! - Each member's credential is what the app says about it (where to send to it), signed by its
//!   own key in its key package.
//! - A message from a later epoch than this member's (its commit has not come yet) is told apart,
//!   so the app keeps it and tries it again once the commit comes.
//!
//! Not audited.

use std::collections::HashMap;

use openmls::prelude::tls_codec::{Deserialize as _, Serialize as _};
use openmls::prelude::*;
use openmls_basic_credential::SignatureKeyPair;
use openmls_memory_storage::MemoryStorage;
use openmls_rust_crypto::RustCrypto;
use openmls_traits::OpenMlsProvider;

const CIPHERSUITE: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
const STATE_VERSION: u8 = 1;
// Epochs back whose messages still open: messages from another member sent just before a commit
// came here.
const PAST_EPOCHS: usize = 5;
/// The admin's leaf: the one who made the group, and the only one whose commits count.
pub const ADMIN: u32 = 0;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("the group state is damaged")]
    State,
    #[error("no such group here")]
    NoGroup,
    #[error("only the group's admin can do that")]
    NotAdmin,
    #[error("not a group message")]
    Malformed,
    #[error("group: {0}")]
    Mls(String),
}

pub type Result<T> = std::result::Result<T, Error>;

fn mls<E: std::fmt::Debug>(e: E) -> Error {
    Error::Mls(format!("{e:?}"))
}

struct Provider {
    crypto: RustCrypto,
    storage: MemoryStorage,
}

impl OpenMlsProvider for Provider {
    type CryptoProvider = RustCrypto;
    type RandProvider = RustCrypto;
    type StorageProvider = MemoryStorage;

    fn storage(&self) -> &MemoryStorage {
        &self.storage
    }

    fn crypto(&self) -> &RustCrypto {
        &self.crypto
    }

    fn rand(&self) -> &RustCrypto {
        &self.crypto
    }
}

/// One member's MLS state on this phone: its signing key, what it says about itself, and the
/// groups it is in.
pub struct Member {
    provider: Provider,
    signer: SignatureKeyPair,
    about: Vec<u8>,
}

/// What a group message was, once opened.
#[derive(Debug, PartialEq, Eq)]
pub enum Opened {
    /// A message from `sender` (its leaf), saying `about` of itself.
    Message { group: Vec<u8>, sender: u32, about: Vec<u8>, text: Vec<u8> },
    /// The admin changed who is in the group; this member is still in it.
    Changed { group: Vec<u8> },
    /// The admin took this member out: the group is gone from here.
    Removed { group: Vec<u8> },
    /// A member asks to leave. Only the admin acts on it (`commit_pending`).
    Leaving { group: Vec<u8>, sender: u32 },
    /// From an epoch this member has not reached: to try again after the next commit.
    Later { group: Vec<u8> },
    /// From before this member joined, or too old, or its own: nothing to show.
    Nothing,
}

/// A group member as the app shows it: its leaf and what it says about itself.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Seat {
    pub leaf: u32,
    pub about: Vec<u8>,
}

fn create_config() -> MlsGroupCreateConfig {
    MlsGroupCreateConfig::builder()
        .ciphersuite(CIPHERSUITE)
        .wire_format_policy(PURE_CIPHERTEXT_WIRE_FORMAT_POLICY)
        .max_past_epochs(PAST_EPOCHS)
        .use_ratchet_tree_extension(true)
        .build()
}

fn join_config() -> MlsGroupJoinConfig {
    MlsGroupJoinConfig::builder()
        .wire_format_policy(PURE_CIPHERTEXT_WIRE_FORMAT_POLICY)
        .max_past_epochs(PAST_EPOCHS)
        .use_ratchet_tree_extension(true)
        .build()
}

fn about_of(credential: &Credential) -> Vec<u8> {
    BasicCredential::try_from(credential.clone())
        .map(|c| c.identity().to_vec())
        .unwrap_or_default()
}

fn put(out: &mut Vec<u8>, bytes: &[u8]) {
    out.extend_from_slice(&(bytes.len() as u32).to_be_bytes());
    out.extend_from_slice(bytes);
}

fn take<'a>(rest: &mut &'a [u8]) -> Result<&'a [u8]> {
    if rest.len() < 4 {
        return Err(Error::State);
    }
    let len = u32::from_be_bytes(rest[..4].try_into().unwrap()) as usize;
    if rest.len() < 4 + len {
        return Err(Error::State);
    }
    let bytes = &rest[4..4 + len];
    *rest = &rest[4 + len..];
    Ok(bytes)
}

impl Member {
    /// A new member, saying `about` of itself to every group it joins.
    pub fn new(about: &[u8]) -> Result<Self> {
        let provider = Provider { crypto: RustCrypto::default(), storage: MemoryStorage::default() };
        let signer = SignatureKeyPair::new(CIPHERSUITE.signature_algorithm()).map_err(mls)?;
        signer.store(provider.storage()).map_err(mls)?;
        Ok(Self { provider, signer, about: about.to_vec() })
    }

    /// The state as bytes, for the app to keep sealed.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = vec![STATE_VERSION];
        put(&mut out, self.signer.public());
        put(&mut out, &self.about);
        let values = self.provider.storage.values.read().unwrap();
        let mut keys: Vec<&Vec<u8>> = values.keys().collect();
        keys.sort();
        out.extend_from_slice(&(keys.len() as u32).to_be_bytes());
        for key in keys {
            put(&mut out, key);
            put(&mut out, &values[key]);
        }
        out
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        let (&version, mut rest) = bytes.split_first().ok_or(Error::State)?;
        if version != STATE_VERSION {
            return Err(Error::State);
        }
        let public = take(&mut rest)?.to_vec();
        let about = take(&mut rest)?.to_vec();
        if rest.len() < 4 {
            return Err(Error::State);
        }
        let count = u32::from_be_bytes(rest[..4].try_into().unwrap()) as usize;
        rest = &rest[4..];
        let mut values = HashMap::with_capacity(count.min(4096));
        for _ in 0..count {
            let key = take(&mut rest)?.to_vec();
            let value = take(&mut rest)?.to_vec();
            values.insert(key, value);
        }
        if !rest.is_empty() {
            return Err(Error::State);
        }
        let provider = Provider { crypto: RustCrypto::default(), storage: MemoryStorage { values: values.into() } };
        let signer = SignatureKeyPair::read(provider.storage(), &public, CIPHERSUITE.signature_algorithm()).ok_or(Error::State)?;
        Ok(Self { provider, signer, about })
    }

    /// What this member says about itself.
    pub fn about(&self) -> &[u8] {
        &self.about
    }

    /// Changes what this member says about itself in the groups it joins from now on.
    pub fn set_about(&mut self, about: &[u8]) {
        self.about = about.to_vec();
    }

    fn credential(&self) -> CredentialWithKey {
        CredentialWithKey {
            credential: BasicCredential::new(self.about.clone()).into(),
            signature_key: self.signer.to_public_vec().into(),
        }
    }

    fn group(&self, id: &[u8]) -> Result<MlsGroup> {
        MlsGroup::load(self.provider.storage(), &GroupId::from_slice(id)).map_err(mls)?.ok_or(Error::NoGroup)
    }

    /// A key package, for an admin to add this member with. Each is used once.
    pub fn key_package(&self) -> Result<Vec<u8>> {
        let bundle = KeyPackage::builder()
            .build(CIPHERSUITE, &self.provider, &self.signer, self.credential())
            .map_err(mls)?;
        bundle.key_package().tls_serialize_detached().map_err(mls)
    }

    /// Makes a group with this member as its admin. Returns its id.
    pub fn create(&mut self) -> Result<Vec<u8>> {
        let group = MlsGroup::new(&self.provider, &self.signer, &create_config(), self.credential()).map_err(mls)?;
        Ok(group.group_id().as_slice().to_vec())
    }

    /// Adds members by their key packages: the commit for the members already in, then the
    /// welcome for the new ones. Admin only.
    pub fn add(&mut self, id: &[u8], key_packages: &[&[u8]]) -> Result<(Vec<u8>, Vec<u8>)> {
        let mut group = self.admin_group(id)?;
        let packages = key_packages
            .iter()
            .map(|bytes| {
                KeyPackageIn::tls_deserialize_exact(bytes)
                    .map_err(mls)?
                    .validate(self.provider.crypto(), ProtocolVersion::Mls10)
                    .map_err(mls)
            })
            .collect::<Result<Vec<_>>>()?;
        let (commit, welcome, _) = group.add_members(&self.provider, &self.signer, &packages).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        Ok((commit.to_bytes().map_err(mls)?, welcome.to_bytes().map_err(mls)?))
    }

    /// Takes members out by their leaves: the commit for everyone in the group before it. Admin only.
    pub fn remove(&mut self, id: &[u8], leaves: &[u32]) -> Result<Vec<u8>> {
        let mut group = self.admin_group(id)?;
        let leaves: Vec<LeafNodeIndex> = leaves.iter().map(|&l| LeafNodeIndex::new(l)).collect();
        let (commit, _, _) = group.remove_members(&self.provider, &self.signer, &leaves).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        commit.to_bytes().map_err(mls)
    }

    /// Commits what members asked (leaving), if anything: the commit, or None. Admin only.
    pub fn commit_pending(&mut self, id: &[u8]) -> Result<Option<Vec<u8>>> {
        let mut group = self.admin_group(id)?;
        if group.pending_proposals().next().is_none() {
            return Ok(None);
        }
        let (commit, _, _) = group.commit_to_pending_proposals(&self.provider, &self.signer).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        Ok(Some(commit.to_bytes().map_err(mls)?))
    }

    fn admin_group(&self, id: &[u8]) -> Result<MlsGroup> {
        let group = self.group(id)?;
        if group.own_leaf_index().u32() != ADMIN {
            return Err(Error::NotAdmin);
        }
        Ok(group)
    }

    /// Joins a group from the admin's welcome. Returns its id.
    pub fn join(&mut self, welcome: &[u8]) -> Result<Vec<u8>> {
        let message = MlsMessageIn::tls_deserialize_exact(welcome).map_err(|_| Error::Malformed)?;
        let MlsMessageBodyIn::Welcome(welcome) = message.extract() else {
            return Err(Error::Malformed);
        };
        let staged = StagedWelcome::new_from_welcome(&self.provider, &join_config(), welcome, None).map_err(mls)?;
        let group = staged.into_group(&self.provider).map_err(mls)?;
        Ok(group.group_id().as_slice().to_vec())
    }

    /// Seals a message to the group.
    pub fn seal(&mut self, id: &[u8], text: &[u8]) -> Result<Vec<u8>> {
        let mut group = self.group(id)?;
        let message = group.create_message(&self.provider, &self.signer, text).map_err(mls)?;
        message.to_bytes().map_err(mls)
    }

    /// Asks the admin to take this member out. The group stays here until the admin's commit
    /// comes (`Opened::Removed`), or the app forgets it.
    pub fn leave(&mut self, id: &[u8]) -> Result<Vec<u8>> {
        let mut group = self.group(id)?;
        let message = group.leave_group(&self.provider, &self.signer).map_err(mls)?;
        message.to_bytes().map_err(mls)
    }

    /// Forgets a group on this phone.
    pub fn forget(&mut self, id: &[u8]) -> Result<()> {
        if let Ok(mut group) = self.group(id) {
            group.delete(self.provider.storage()).map_err(mls)?;
        }
        Ok(())
    }

    /// The group's members, and this member's own leaf.
    pub fn members(&self, id: &[u8]) -> Result<(Vec<Seat>, u32)> {
        let group = self.group(id)?;
        let seats = group.members().map(|m| Seat { leaf: m.index.u32(), about: about_of(&m.credential) }).collect();
        Ok((seats, group.own_leaf_index().u32()))
    }

    /// The group a message is for, without opening it.
    pub fn group_of(message: &[u8]) -> Result<Vec<u8>> {
        let message = MlsMessageIn::tls_deserialize_exact(message).map_err(|_| Error::Malformed)?;
        let protocol = message.try_into_protocol_message().map_err(|_| Error::Malformed)?;
        Ok(protocol.group_id().as_slice().to_vec())
    }

    /// Opens a message to one of this member's groups.
    pub fn open(&mut self, message: &[u8]) -> Result<Opened> {
        let message = MlsMessageIn::tls_deserialize_exact(message).map_err(|_| Error::Malformed)?;
        let protocol = message.try_into_protocol_message().map_err(|_| Error::Malformed)?;
        let id = protocol.group_id().as_slice().to_vec();
        let mut group = self.group(&id)?;
        if !group.is_active() {
            return Ok(Opened::Nothing);
        }
        let epoch = protocol.epoch().as_u64();
        if epoch > group.epoch().as_u64() {
            return Ok(Opened::Later { group: id });
        }
        let processed = match group.process_message(&self.provider, protocol) {
            Ok(processed) => processed,
            // From an epoch too old, or one before this member joined.
            Err(ProcessMessageError::ValidationError(ValidationError::UnableToDecrypt(_)))
            | Err(ProcessMessageError::ValidationError(ValidationError::WrongEpoch)) => return Ok(Opened::Nothing),
            Err(e) => return Err(mls(e)),
        };
        let sender = match processed.sender() {
            Sender::Member(leaf) => leaf.u32(),
            _ => return Ok(Opened::Nothing),
        };
        let about = about_of(processed.credential());
        match processed.into_content() {
            ProcessedMessageContent::ApplicationMessage(text) => {
                Ok(Opened::Message { group: id, sender, about, text: text.into_bytes() })
            }
            ProcessedMessageContent::StagedCommitMessage(staged) => {
                if sender != ADMIN {
                    return Err(Error::NotAdmin);
                }
                let removed = staged.self_removed();
                group.merge_staged_commit(&self.provider, *staged).map_err(mls)?;
                if removed {
                    group.delete(self.provider.storage()).map_err(mls)?;
                    Ok(Opened::Removed { group: id })
                } else {
                    Ok(Opened::Changed { group: id })
                }
            }
            ProcessedMessageContent::ProposalMessage(proposal) => {
                // Only a member asking to take itself out counts.
                let own = matches!(proposal.proposal(), Proposal::Remove(remove) if remove.removed().u32() == sender);
                if !own {
                    return Ok(Opened::Nothing);
                }
                group.store_pending_proposal(self.provider.storage(), *proposal).map_err(mls)?;
                Ok(Opened::Leaving { group: id, sender })
            }
            _ => Ok(Opened::Nothing),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kept(member: &Member) -> Member {
        Member::from_bytes(&member.to_bytes()).unwrap()
    }

    #[test]
    fn three_members_talk_and_one_is_taken_out() {
        let mut alice = Member::new(b"alice").unwrap();
        let mut bob = Member::new(b"bob").unwrap();
        let mut carol = Member::new(b"carol").unwrap();

        let id = alice.create().unwrap();
        let (_, welcome) = alice.add(&id, &[&bob.key_package().unwrap()]).unwrap();
        // Every step goes through bytes, as the app keeps it.
        let mut alice = kept(&alice);
        assert_eq!(bob.join(&welcome).unwrap(), id);
        let mut bob = kept(&bob);

        let (commit, welcome) = alice.add(&id, &[&carol.key_package().unwrap()]).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        carol.join(&welcome).unwrap();

        let hello = carol.seal(&id, b"hello").unwrap();
        assert_eq!(Member::group_of(&hello).unwrap(), id);
        for member in [&mut alice, &mut bob] {
            assert_eq!(
                member.open(&hello).unwrap(),
                Opened::Message { group: id.clone(), sender: 2, about: b"carol".to_vec(), text: b"hello".to_vec() }
            );
        }
        let (seats, own) = bob.members(&id).unwrap();
        assert_eq!(own, 1);
        assert_eq!(seats.iter().map(|s| s.about.clone()).collect::<Vec<_>>(), [b"alice".to_vec(), b"bob".to_vec(), b"carol".to_vec()]);

        // Bob is taken out: he reads nothing after.
        let commit = alice.remove(&id, &[1]).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Removed { group: id.clone() });
        assert_eq!(carol.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        let secret = alice.seal(&id, b"without bob").unwrap();
        assert!(matches!(bob.open(&secret), Err(Error::NoGroup)));
        assert!(matches!(carol.open(&secret).unwrap(), Opened::Message { text, .. } if text == b"without bob"));
    }

    #[test]
    fn a_message_from_the_next_epoch_waits_for_its_commit() {
        let mut alice = Member::new(b"alice").unwrap();
        let mut bob = Member::new(b"bob").unwrap();
        let mut carol = Member::new(b"carol").unwrap();
        let id = alice.create().unwrap();
        let (_, welcome) = alice.add(&id, &[&bob.key_package().unwrap()]).unwrap();
        bob.join(&welcome).unwrap();

        // Carol joins and writes before Bob has the commit that added her.
        let (commit, welcome) = alice.add(&id, &[&carol.key_package().unwrap()]).unwrap();
        carol.join(&welcome).unwrap();
        let early = carol.seal(&id, b"hi all").unwrap();
        assert_eq!(bob.open(&early).unwrap(), Opened::Later { group: id.clone() });
        bob.open(&commit).unwrap();
        assert!(matches!(bob.open(&early).unwrap(), Opened::Message { text, .. } if text == b"hi all"));

        // A message from the epoch before still opens after the next commit.
        let late = bob.seal(&id, b"just before").unwrap();
        let commit = alice.remove(&id, &[2]).unwrap();
        assert!(matches!(alice.open(&late).unwrap(), Opened::Message { .. }));
        bob.open(&commit).unwrap();
    }

    #[test]
    fn a_member_leaves_through_the_admin_and_others_cannot_commit() {
        let mut alice = Member::new(b"alice").unwrap();
        let mut bob = Member::new(b"bob").unwrap();
        let mut carol = Member::new(b"carol").unwrap();
        let id = alice.create().unwrap();
        let (_, welcome) =
            alice.add(&id, &[&bob.key_package().unwrap(), &carol.key_package().unwrap()]).unwrap();
        bob.join(&welcome).unwrap();
        carol.join(&welcome).unwrap();

        assert!(matches!(bob.add(&id, &[&Member::new(b"eve").unwrap().key_package().unwrap()]), Err(Error::NotAdmin)));
        assert!(matches!(bob.remove(&id, &[2]), Err(Error::NotAdmin)));

        let leaving = carol.leave(&id).unwrap();
        assert_eq!(alice.open(&leaving).unwrap(), Opened::Leaving { group: id.clone(), sender: 2 });
        bob.open(&leaving).unwrap();
        let commit = alice.commit_pending(&id).unwrap().unwrap();
        assert_eq!(alice.commit_pending(&id).unwrap(), None);
        assert_eq!(carol.open(&commit).unwrap(), Opened::Removed { group: id.clone() });
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        assert_eq!(bob.members(&id).unwrap().0.len(), 2);
    }

    #[test]
    fn damaged_state_and_messages_are_refused() {
        let alice = Member::new(b"alice").unwrap();
        let mut bytes = alice.to_bytes();
        assert!(Member::from_bytes(&bytes[..bytes.len() - 1]).is_err());
        bytes[0] = 9;
        assert!(Member::from_bytes(&bytes).is_err());
        let mut alice = kept(&alice);
        assert!(matches!(alice.open(b"nothing"), Err(Error::Malformed)));
        assert!(matches!(alice.seal(b"no group", b"x"), Err(Error::NoGroup)));
    }
}
