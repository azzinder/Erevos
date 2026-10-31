// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
//! Public groups (docs/public-groups.md), which anyone with the group's link can ask to join, are
//! the same but for three things:
//! - Their group context has a `RULES` extension: the leaf of the group's keeper, the one member
//!   whose commits count there (its owner, not always leaf 0), then what the app says of the
//!   group (its admins, bans and link). Every member has the same rules in an epoch, as MLS binds
//!   the group context to the epoch's keys; only the keeper changes them, by a commit.
//! - Each member signs in a public group with a key made for that group alone, so the groups it
//!   is in cannot be told apart by its key, and what it says of itself there is its own to choose.
//! - The keeper commits adds, removals and new rules together (`commit`).
//!
//! Keys that change (post-compromise security): the keeper gives its own leaf new keys with a
//! commit of its own (`self_update`). A member, whose proposals only the keeper could commit, and
//! which a member from before would not take, is put in again instead: it gives the keeper a key
//! package signed with the key it signs with there (`renewal`), the keeper commits its leaf out and
//! the key package in (`renew`), and the member takes the group back from the welcome
//! (`rejoin`). Members from before see a member go and come back in one commit, as the same one.
//!
//! Not audited.

use std::collections::HashMap;

use openmls::prelude::tls_codec::{Deserialize as _, Serialize as _};
use openmls::prelude::*;
use openmls_basic_credential::SignatureKeyPair;
use openmls_memory_storage::MemoryStorage;
use openmls_rust_crypto::RustCrypto;
use openmls_traits::storage::StorageProvider as _;
use openmls_traits::OpenMlsProvider;

const CIPHERSUITE: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
const STATE_VERSION: u8 = 1;
// Epochs back whose messages still open: messages from another member sent just before a commit
// came here.
const PAST_EPOCHS: usize = 5;
/// The admin's leaf: the one who made the group, and the only one whose commits count.
pub const ADMIN: u32 = 0;
/// The group context extension of a public group: its keeper's leaf (4 bytes, big-endian), then
/// the app's rules. In the range RFC 9420 leaves for private use.
pub const RULES: u16 = 0xf001;
// Where the state keeps, beside OpenMLS's own values, the key package a member gave for its
// renewal in a group (`renewal`), by its reference: the group's id comes after it.
const RENEWING: &[u8] = b"erevos/renewing/";

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("the group state is damaged")]
    State,
    #[error("no such group here")]
    NoGroup,
    #[error("only the group's admin can do that")]
    NotAdmin,
    #[error("the group's keeper cannot take itself out")]
    OwnLeaf,
    #[error("the group's next keeper must be a member who stays in it")]
    NoKeeper,
    #[error("not a group message")]
    Malformed,
    #[error("no member there signs with that key package's key")]
    NotTheMember,
    #[error("not the welcome of a renewal asked here")]
    NotRenewing,
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
    /// The keeper put this member in anew, with the key package it gave (`renewal`): the group
    /// stays here as it was until the welcome comes (`rejoin`).
    Renewing { group: Vec<u8> },
    /// From before this member joined, or too old, or its own: nothing to show.
    Nothing,
}

/// A group member as the app shows it: its leaf, what it says about itself, and the key it signs with.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Seat {
    pub leaf: u32,
    pub about: Vec<u8>,
    pub key: Vec<u8>,
}

/// A group's rules as its group context has them, in its epoch now. A group made by an admin has
/// none: its keeper is `ADMIN` and its rules are empty.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Rules {
    pub epoch: u64,
    pub keeper: u32,
    pub rules: Vec<u8>,
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

// What a public group's members can do beyond a private group's: hold its rules.
fn public_capabilities() -> Capabilities {
    Capabilities::new(None, Some(&[CIPHERSUITE]), Some(&[ExtensionType::Unknown(RULES)]), None, None)
}

fn rules_extension(keeper: u32, rules: &[u8]) -> Extension {
    Extension::Unknown(RULES, UnknownExtension([&keeper.to_be_bytes(), rules].concat()))
}

// A public group's keeper and rules, from its group context; None for a private group.
fn rules_in(extensions: &Extensions<GroupContext>) -> Option<(u32, Vec<u8>)> {
    let bytes = &extensions.unknown(RULES)?.0;
    let keeper = u32::from_be_bytes(bytes.get(..4)?.try_into().ok()?);
    Some((keeper, bytes[4..].to_vec()))
}

// The leaf whose commits count in a group: its keeper's in a public group, the admin's otherwise.
fn keeper_of(group: &MlsGroup) -> u32 {
    rules_in(group.extensions()).map_or(ADMIN, |(keeper, _)| keeper)
}

// The leaves of the members who asked to leave, which the keeper's next commit takes out.
fn leaving(group: &MlsGroup) -> Vec<u32> {
    group
        .pending_proposals()
        .filter_map(|p| match p.proposal() {
            Proposal::Remove(remove) => Some(remove.removed().u32()),
            _ => None,
        })
        .collect()
}

// The key this member signs with in a group.
fn own_key(group: &MlsGroup) -> Option<Vec<u8>> {
    group.own_leaf_node().map(|leaf| leaf.signature_key().as_slice().to_vec())
}

fn credential_with(about: &[u8], signer: &SignatureKeyPair) -> CredentialWithKey {
    CredentialWithKey { credential: BasicCredential::new(about.to_vec()).into(), signature_key: signer.to_public_vec().into() }
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
        credential_with(&self.about, &self.signer)
    }

    fn group(&self, id: &[u8]) -> Result<MlsGroup> {
        MlsGroup::load(self.provider.storage(), &GroupId::from_slice(id)).map_err(mls)?.ok_or(Error::NoGroup)
    }

    // A key made for one public group, kept in the state.
    fn signer_kept(&self, public: &[u8]) -> Result<SignatureKeyPair> {
        SignatureKeyPair::read(self.provider.storage(), public, CIPHERSUITE.signature_algorithm()).ok_or(Error::State)
    }

    // The key this member signs with in a group when it is not its own one: the one made for it.
    fn group_signer(&self, group: &MlsGroup) -> Result<Option<SignatureKeyPair>> {
        let key = own_key(group).ok_or(Error::State)?;
        if key == self.signer.public() {
            return Ok(None);
        }
        self.signer_kept(&key).map(Some)
    }

    // The key package this member gave for its renewal in a group, if it waits for the welcome.
    fn renewing(&self, id: &[u8]) -> Option<KeyPackageRef> {
        let values = self.provider.storage.values.read().unwrap();
        values.get(&[RENEWING, id].concat()).and_then(|r| KeyPackageRef::tls_deserialize_exact(r).ok())
    }

    // Keeps `asked` as the key package of this member's renewal in a group, or none; the one
    // before goes, with its secrets.
    fn set_renewing(&self, id: &[u8], asked: Option<&KeyPackageRef>) -> Result<()> {
        if let Some(before) = self.renewing(id) {
            self.provider.storage().delete_key_package(&before).map_err(mls)?;
        }
        let asked = asked.map(|r| r.tls_serialize_detached()).transpose().map_err(mls)?;
        let mut values = self.provider.storage.values.write().unwrap();
        let key = [RENEWING, id].concat();
        match asked {
            Some(asked) => values.insert(key, asked),
            None => values.remove(&key),
        };
        Ok(())
    }

    /// A new key to sign with in one public group. Returns its public half, which the app says of
    /// itself there (`key_package_as`, `create_public`).
    pub fn new_signer(&mut self) -> Result<Vec<u8>> {
        let signer = SignatureKeyPair::new(CIPHERSUITE.signature_algorithm()).map_err(mls)?;
        signer.store(self.provider.storage()).map_err(mls)?;
        Ok(signer.to_public_vec())
    }

    /// A key package to ask to join a public group with: signed with the key made for it
    /// (`new_signer`), saying `about`. Each is used once.
    pub fn key_package_as(&self, public: &[u8], about: &[u8]) -> Result<Vec<u8>> {
        let signer = self.signer_kept(public)?;
        let bundle = KeyPackage::builder()
            .leaf_node_capabilities(public_capabilities())
            .build(CIPHERSUITE, &self.provider, &signer, credential_with(about, &signer))
            .map_err(mls)?;
        bundle.key_package().tls_serialize_detached().map_err(mls)
    }

    /// Makes a public group with this member as its keeper, at leaf 0, signing with the key made
    /// for it, saying `about`, and with the app's first `rules`. Returns its id.
    pub fn create_public(&mut self, public: &[u8], about: &[u8], rules: &[u8]) -> Result<Vec<u8>> {
        let signer = self.signer_kept(public)?;
        let required = Extension::RequiredCapabilities(RequiredCapabilitiesExtension::new(&[ExtensionType::Unknown(RULES)], &[], &[]));
        let extensions = Extensions::from_vec(vec![required, rules_extension(ADMIN, rules)]).map_err(mls)?;
        let group = MlsGroup::builder()
            .ciphersuite(CIPHERSUITE)
            .with_wire_format_policy(PURE_CIPHERTEXT_WIRE_FORMAT_POLICY)
            .max_past_epochs(PAST_EPOCHS)
            .use_ratchet_tree_extension(true)
            .with_capabilities(public_capabilities())
            .with_group_context_extensions(extensions)
            .build(&self.provider, &signer, credential_with(about, &signer))
            .map_err(mls)?;
        Ok(group.group_id().as_slice().to_vec())
    }

    /// The group's rules in its epoch now.
    pub fn rules(&self, id: &[u8]) -> Result<Rules> {
        let group = self.group(id)?;
        let (keeper, rules) = rules_in(group.extensions()).unwrap_or((ADMIN, Vec::new()));
        Ok(Rules { epoch: group.epoch().as_u64(), keeper, rules })
    }

    /// One commit by the keeper of a public group: adds members by their key packages, takes
    /// members out by their leaves, and with `rules` gives the group a keeper (by leaf) and rules.
    /// Members who asked to leave go with it. Returns the commit, then the welcome for the new
    /// members, empty when there are none. The keeper never takes itself out: it hands over first.
    pub fn commit(&mut self, id: &[u8], key_packages: &[&[u8]], removes: &[u32], rules: Option<(u32, &[u8])>) -> Result<(Vec<u8>, Vec<u8>)> {
        let mut group = self.keeper_group(id)?;
        let own = group.own_leaf_index().u32();
        let leaving = leaving(&group);
        if removes.contains(&own) || leaving.contains(&own) {
            return Err(Error::OwnLeaf);
        }
        // A leaf left empty is filled by whoever is added next, so the keeper is one who stays.
        if let Some((keeper, _)) = rules {
            if removes.contains(&keeper) || leaving.contains(&keeper) || !group.members().any(|m| m.index.u32() == keeper) {
                return Err(Error::NoKeeper);
            }
        }
        let packages = key_packages.iter().map(|bytes| self.checked_package(bytes)).collect::<Result<Vec<_>>>()?;
        let extensions = match rules {
            Some((keeper, rules)) => {
                let mut extensions = group.extensions().clone();
                extensions.add_or_replace(rules_extension(keeper, rules)).map_err(mls)?;
                Some(extensions)
            }
            None => None,
        };
        let signer = self.group_signer(&group)?;
        let signer = signer.as_ref().unwrap_or(&self.signer);
        let mut builder = group
            .commit_builder()
            .propose_adds(packages)
            .propose_removals(removes.iter().map(|&leaf| LeafNodeIndex::new(leaf)));
        if let Some(extensions) = extensions {
            builder = builder.propose_group_context_extensions(extensions).map_err(mls)?;
        }
        let bundle = builder
            .load_psks(self.provider.storage())
            .map_err(mls)?
            .build(self.provider.rand(), self.provider.crypto(), signer, |_| true)
            .map_err(mls)?
            .stage_commit(&self.provider)
            .map_err(mls)?;
        let (commit, welcome, _) = bundle.into_messages();
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        let welcome = welcome.map(|w| w.to_bytes()).transpose().map_err(mls)?.unwrap_or_default();
        Ok((commit.to_bytes().map_err(mls)?, welcome))
    }

    fn checked_package(&self, bytes: &[u8]) -> Result<KeyPackage> {
        KeyPackageIn::tls_deserialize_exact(bytes)
            .map_err(mls)?
            .validate(self.provider.crypto(), ProtocolVersion::Mls10)
            .map_err(mls)
    }

    /// What a key package says about its member, then the key it signs with, once its signatures
    /// hold: for the keeper to look at before letting it in.
    pub fn package_about(bytes: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        let package = KeyPackageIn::tls_deserialize_exact(bytes)
            .map_err(|_| Error::Malformed)?
            .validate(&RustCrypto::default(), ProtocolVersion::Mls10)
            .map_err(mls)?;
        let leaf = package.leaf_node();
        Ok((about_of(leaf.credential()), leaf.signature_key().as_slice().to_vec()))
    }

    /// The epoch a group message was sent in, without opening it.
    pub fn epoch_of(message: &[u8]) -> Result<u64> {
        let message = MlsMessageIn::tls_deserialize_exact(message).map_err(|_| Error::Malformed)?;
        let protocol = message.try_into_protocol_message().map_err(|_| Error::Malformed)?;
        Ok(protocol.epoch().as_u64())
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
        let mut group = self.keeper_group(id)?;
        let packages = key_packages.iter().map(|bytes| self.checked_package(bytes)).collect::<Result<Vec<_>>>()?;
        let signer = self.group_signer(&group)?;
        let (commit, welcome, _) = group.add_members(&self.provider, signer.as_ref().unwrap_or(&self.signer), &packages).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        Ok((commit.to_bytes().map_err(mls)?, welcome.to_bytes().map_err(mls)?))
    }

    /// Takes members out by their leaves: the commit for everyone in the group before it. Admin only.
    pub fn remove(&mut self, id: &[u8], leaves: &[u32]) -> Result<Vec<u8>> {
        let mut group = self.keeper_group(id)?;
        if leaves.contains(&group.own_leaf_index().u32()) {
            return Err(Error::OwnLeaf);
        }
        let leaves: Vec<LeafNodeIndex> = leaves.iter().map(|&l| LeafNodeIndex::new(l)).collect();
        let signer = self.group_signer(&group)?;
        let (commit, _, _) = group.remove_members(&self.provider, signer.as_ref().unwrap_or(&self.signer), &leaves).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        commit.to_bytes().map_err(mls)
    }

    /// Commits what members asked (leaving), if anything: the commit, or None. Admin only.
    pub fn commit_pending(&mut self, id: &[u8]) -> Result<Option<Vec<u8>>> {
        let mut group = self.keeper_group(id)?;
        if group.pending_proposals().next().is_none() {
            return Ok(None);
        }
        if leaving(&group).contains(&group.own_leaf_index().u32()) {
            return Err(Error::OwnLeaf);
        }
        let signer = self.group_signer(&group)?;
        let (commit, _, _) = group.commit_to_pending_proposals(&self.provider, signer.as_ref().unwrap_or(&self.signer)).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        Ok(Some(commit.to_bytes().map_err(mls)?))
    }

    // The group, if this member is the one whose commits count there: its admin, or a public
    // group's keeper.
    fn keeper_group(&self, id: &[u8]) -> Result<MlsGroup> {
        let group = self.group(id)?;
        if group.own_leaf_index().u32() != keeper_of(&group) {
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

    /// A key package for the keeper to put this member in its group anew with (`renew`), so
    /// that its leaf has new keys: signed with the key it signs with there, saying `about`. Not
    /// for the keeper, which renews its own leaf itself (`self_update`). One made again replaces
    /// the one before.
    pub fn renewal(&self, id: &[u8], about: &[u8]) -> Result<Vec<u8>> {
        let group = self.group(id)?;
        if !group.is_active() {
            return Err(Error::NoGroup);
        }
        if group.own_leaf_index().u32() == keeper_of(&group) {
            return Err(Error::OwnLeaf);
        }
        let signer = self.group_signer(&group)?;
        let signer = signer.as_ref().unwrap_or(&self.signer);
        let mut builder = KeyPackage::builder();
        if rules_in(group.extensions()).is_some() {
            builder = builder.leaf_node_capabilities(public_capabilities());
        }
        let bundle = builder.build(CIPHERSUITE, &self.provider, signer, credential_with(about, signer)).map_err(mls)?;
        let package = bundle.key_package();
        self.set_renewing(id, Some(&package.hash_ref(self.provider.crypto()).map_err(mls)?))?;
        package.tls_serialize_detached().map_err(mls)
    }

    /// Puts the member at `leaf` in the group anew with the key package it gave for that
    /// (`renewal`): one commit takes its leaf out and the key package in, so its keys are new.
    /// The key package must be signed with the key that leaf signs with, which only the member
    /// has. Keeper only. Returns the commit, then the member's welcome.
    pub fn renew(&mut self, id: &[u8], leaf: u32, key_package: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        let group = self.keeper_group(id)?;
        let package = self.checked_package(key_package)?;
        let key = group.members().find(|m| m.index.u32() == leaf).map(|m| m.signature_key);
        if leaf == group.own_leaf_index().u32() || leaving(&group).contains(&leaf) || key.as_deref() != Some(package.leaf_node().signature_key().as_slice()) {
            return Err(Error::NotTheMember);
        }
        self.commit(id, &[key_package], &[leaf], None)
    }

    /// New keys for the keeper's own leaf, and so for every member's path to it: a commit that
    /// takes out those who asked to leave too. Keeper only: members renew theirs with `renewal`.
    /// With `about`, the leaf says that of itself from then on, as a member's renewal does, signed
    /// with the key it signs with there; without, what it said stays.
    pub fn self_update(&mut self, id: &[u8], about: Option<&[u8]>) -> Result<Vec<u8>> {
        let mut group = self.keeper_group(id)?;
        if leaving(&group).contains(&group.own_leaf_index().u32()) {
            return Err(Error::OwnLeaf);
        }
        let signer = self.group_signer(&group)?;
        let signer = signer.as_ref().unwrap_or(&self.signer);
        let parameters = match about {
            Some(about) => LeafNodeParameters::builder().with_credential_with_key(credential_with(about, signer)).build(),
            None => LeafNodeParameters::default(),
        };
        let bundle = group.self_update(&self.provider, signer, parameters).map_err(mls)?;
        group.merge_pending_commit(&self.provider).map_err(mls)?;
        let (commit, _, _) = bundle.into_messages();
        commit.to_bytes().map_err(mls)
    }

    /// Takes the group back from the keeper's welcome after this member's renewal, in place of
    /// the one kept here: only with the key package of the renewal asked here, for the same group
    /// and of the same kind, from the same keeper, at a later epoch, and with this member signing
    /// with the same key.
    pub fn rejoin(&mut self, id: &[u8], welcome: &[u8]) -> Result<()> {
        let mut old = self.group(id)?;
        let asked = self.renewing(id).ok_or(Error::NotRenewing)?;
        let keeper = keeper_of(&old);
        let keeper_key = old.members().find(|m| m.index.u32() == keeper).map(|m| m.signature_key).ok_or(Error::State)?;
        let own = own_key(&old).ok_or(Error::State)?;
        let message = MlsMessageIn::tls_deserialize_exact(welcome).map_err(|_| Error::Malformed)?;
        let MlsMessageBodyIn::Welcome(welcome) = message.extract() else {
            return Err(Error::Malformed);
        };
        let builder = StagedWelcome::build_from_welcome(&self.provider, &join_config(), welcome).map_err(mls)?;
        let crypto = self.provider.crypto();
        if !builder.processed_welcome().own_key_package().is_some_and(|p| p.hash_ref(crypto).is_ok_and(|r| r == asked)) {
            return Err(Error::NotRenewing);
        }
        let staged = builder.replace_old_group().build().map_err(mls)?;
        let context = staged.group_context();
        let same = context.group_id().as_slice() == id
            && context.epoch().as_u64() > old.epoch().as_u64()
            && rules_in(context.extensions()).is_some() == rules_in(old.extensions()).is_some()
            && staged.welcome_sender().is_ok_and(|s| s.signature_key().as_slice() == keeper_key)
            && staged.own_leaf_node().is_some_and(|l| l.signature_key().as_slice() == own);
        if !same {
            return Err(Error::NotRenewing);
        }
        old.delete(self.provider.storage()).map_err(mls)?;
        staged.into_group(&self.provider).map_err(mls)?;
        self.set_renewing(id, None)
    }

    /// Seals a message to the group.
    pub fn seal(&mut self, id: &[u8], text: &[u8]) -> Result<Vec<u8>> {
        let mut group = self.group(id)?;
        let signer = self.group_signer(&group)?;
        let message = group.create_message(&self.provider, signer.as_ref().unwrap_or(&self.signer), text).map_err(mls)?;
        message.to_bytes().map_err(mls)
    }

    /// Asks the admin to take this member out. The group stays here until the admin's commit
    /// comes (`Opened::Removed`), or the app forgets it. The keeper itself hands the group over
    /// first: none could take it out.
    pub fn leave(&mut self, id: &[u8]) -> Result<Vec<u8>> {
        let mut group = self.group(id)?;
        if group.own_leaf_index().u32() == keeper_of(&group) {
            return Err(Error::OwnLeaf);
        }
        let signer = self.group_signer(&group)?;
        let message = group.leave_group(&self.provider, signer.as_ref().unwrap_or(&self.signer)).map_err(mls)?;
        message.to_bytes().map_err(mls)
    }

    /// Forgets a group on this phone, and the key made for it, if it had one.
    pub fn forget(&mut self, id: &[u8]) -> Result<()> {
        if let Ok(mut group) = self.group(id) {
            self.forget_signer(own_key(&group))?;
            group.delete(self.provider.storage()).map_err(mls)?;
        }
        self.set_renewing(id, None)
    }

    // Forgets a key made for one public group, once out of it; never this member's own.
    fn forget_signer(&self, key: Option<Vec<u8>>) -> Result<()> {
        match key.filter(|key| key.as_slice() != self.signer.public()) {
            Some(key) => SignatureKeyPair::delete(self.provider.storage(), &key, CIPHERSUITE.signature_algorithm()).map_err(mls),
            None => Ok(()),
        }
    }

    /// The group's members, and this member's own leaf.
    pub fn members(&self, id: &[u8]) -> Result<(Vec<Seat>, u32)> {
        let group = self.group(id)?;
        let seats = group
            .members()
            .map(|m| Seat { leaf: m.index.u32(), about: about_of(&m.credential), key: m.signature_key })
            .collect();
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
        // Who may commit, as the group was before this message.
        let keeper = keeper_of(&group);
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
                if sender != keeper {
                    return Err(Error::NotAdmin);
                }
                let removed = staged.self_removed();
                // Out and in again, with the key package of its renewal: the welcome puts it back.
                let crypto = self.provider.crypto();
                if removed
                    && self.renewing(&id).is_some_and(|asked| {
                        staged.add_proposals().any(|p| p.add_proposal().key_package().hash_ref(crypto).is_ok_and(|r| r == asked))
                    })
                {
                    return Ok(Opened::Renewing { group: id });
                }
                let own = own_key(&group);
                group.merge_staged_commit(&self.provider, *staged).map_err(mls)?;
                if removed {
                    self.forget_signer(own)?;
                    group.delete(self.provider.storage()).map_err(mls)?;
                    self.set_renewing(&id, None)?;
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

/// The most members a public group has, so its welcome fits in one relay message.
pub const MOST_MEMBERS: usize = 100;

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

    // A member who asks to join a public group: a key of its own for it, and a key package with it.
    fn asking(member: &mut Member, about: &[u8]) -> (Vec<u8>, Vec<u8>) {
        let key = member.new_signer().unwrap();
        (key.clone(), member.key_package_as(&key, about).unwrap())
    }

    #[test]
    fn a_public_group_is_joined_by_key_packages_and_has_its_rules() {
        let mut alice = Member::new(b"alice in chats").unwrap();
        let mut bob = Member::new(b"bob in chats").unwrap();
        let mut carol = Member::new(b"carol in chats").unwrap();
        let key = alice.new_signer().unwrap();
        let id = alice.create_public(&key, b"alice here", b"{\"v\":1}").unwrap();
        let mut alice = kept(&alice);
        assert_eq!(alice.rules(&id).unwrap(), Rules { epoch: 0, keeper: 0, rules: b"{\"v\":1}".to_vec() });

        // Bob asks; the keeper looks at what he says, then lets him in with new rules.
        let (bob_key, package) = asking(&mut bob, b"bob here");
        assert_eq!(Member::package_about(&package).unwrap(), (b"bob here".to_vec(), bob_key.clone()));
        let (_, welcome) = alice.commit(&id, &[&package], &[], Some((0, b"{\"v\":2}"))).unwrap();
        assert_eq!(kept(&bob).join(&welcome).unwrap(), id);
        bob.join(&welcome).unwrap();
        assert_eq!(bob.rules(&id).unwrap(), Rules { epoch: 1, keeper: 0, rules: b"{\"v\":2}".to_vec() });

        // Carol too; Bob gets the commit.
        let (_, package) = asking(&mut carol, b"carol here");
        let (commit, welcome) = alice.commit(&id, &[&package], &[], None).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        carol.join(&welcome).unwrap();
        assert_eq!(carol.rules(&id).unwrap().rules, b"{\"v\":2}");

        // Each signs with the key made for the group, and says there what it said when it asked.
        let hello = carol.seal(&id, b"hello").unwrap();
        assert_eq!(Member::epoch_of(&hello).unwrap(), 2);
        assert!(matches!(bob.open(&hello).unwrap(), Opened::Message { sender: 2, about, .. } if about == b"carol here"));
        let (seats, own) = bob.members(&id).unwrap();
        assert_eq!(own, 1);
        assert_eq!(seats[1].key, bob_key);
        assert_ne!(seats[1].key, bob.signer.public());
        assert_eq!(seats.iter().map(|s| s.about.clone()).collect::<Vec<_>>(), [b"alice here".to_vec(), b"bob here".to_vec(), b"carol here".to_vec()]);

        // A member's own group still signs with its own key.
        let private = bob.create().unwrap();
        assert_eq!(bob.members(&private).unwrap().0[0].key, bob.signer.public());
        assert_eq!(bob.rules(&private).unwrap(), Rules { epoch: 0, keeper: ADMIN, rules: Vec::new() });
    }

    #[test]
    fn only_the_keeper_commits_and_it_hands_over() {
        let mut alice = Member::new(b"a").unwrap();
        let mut bob = Member::new(b"b").unwrap();
        let mut carol = Member::new(b"c").unwrap();
        let key = alice.new_signer().unwrap();
        let id = alice.create_public(&key, b"alice", b"r").unwrap();
        let (_, bob_package) = asking(&mut bob, b"bob");
        let (_, carol_package) = asking(&mut carol, b"carol");
        let (_, welcome) = alice.commit(&id, &[&bob_package, &carol_package], &[], None).unwrap();
        bob.join(&welcome).unwrap();
        carol.join(&welcome).unwrap();

        // Bob is not the keeper: he cannot commit, and a commit he makes all the same is refused.
        assert!(matches!(bob.commit(&id, &[], &[2], None), Err(Error::NotAdmin)));
        let mut group = bob.group(&id).unwrap();
        let signer = bob.group_signer(&group).unwrap().unwrap();
        let (forged, _, _) = group.remove_members(&bob.provider, &signer, &[LeafNodeIndex::new(2)]).unwrap();
        assert!(matches!(carol.open(&forged.to_bytes().unwrap()), Err(Error::NotAdmin)));
        assert!(matches!(alice.open(&forged.to_bytes().unwrap()), Err(Error::NotAdmin)));
        let mut bob = Member::from_bytes(&bob.to_bytes()).unwrap();
        bob.group(&id).unwrap().clear_pending_commit(bob.provider.storage()).unwrap();

        // The keeper does not take itself out, and hands the group over to Bob.
        assert!(matches!(alice.commit(&id, &[], &[0], None), Err(Error::OwnLeaf)));
        assert!(matches!(alice.remove(&id, &[0]), Err(Error::OwnLeaf)));
        assert!(matches!(alice.leave(&id), Err(Error::OwnLeaf)));
        // Nor to a leaf no one is in, or to one it takes out: whoever came there next would keep it.
        assert!(matches!(alice.commit(&id, &[], &[], Some((5, b"no one"))), Err(Error::NoKeeper)));
        assert!(matches!(alice.commit(&id, &[], &[2], Some((2, b"carol, going"))), Err(Error::NoKeeper)));
        let (handed, _) = alice.commit(&id, &[], &[], Some((1, b"bob keeps it"))).unwrap();
        for member in [&mut bob, &mut carol] {
            assert_eq!(member.open(&handed).unwrap(), Opened::Changed { group: id.clone() });
            assert_eq!(member.rules(&id).unwrap().keeper, 1);
        }
        assert!(matches!(alice.commit(&id, &[], &[2], None), Err(Error::NotAdmin)));
        let removed = bob.commit(&id, &[], &[2], None).unwrap().0;
        assert_eq!(alice.open(&removed).unwrap(), Opened::Changed { group: id.clone() });
        assert_eq!(carol.open(&removed).unwrap(), Opened::Removed { group: id.clone() });
        assert!(matches!(carol.seal(&id, b"x"), Err(Error::NoGroup)));
        // A member who asks to leave goes with the keeper's next commit.
        let leaving = alice.leave(&id).unwrap();
        assert_eq!(bob.open(&leaving).unwrap(), Opened::Leaving { group: id.clone(), sender: 0 });
        assert!(matches!(bob.commit(&id, &[], &[], Some((0, b"alice, going"))), Err(Error::NoKeeper)));
        let commit = bob.commit(&id, &[], &[], Some((1, b"bob alone"))).unwrap().0;
        assert_eq!(alice.open(&commit).unwrap(), Opened::Removed { group: id.clone() });
        assert_eq!(bob.members(&id).unwrap().0.len(), 1);
    }

    // Alice's group with Bob at leaf 1 and Carol at leaf 2, each kept through bytes.
    fn three() -> (Member, Member, Member, Vec<u8>) {
        let mut alice = Member::new(b"alice").unwrap();
        let mut bob = Member::new(b"bob").unwrap();
        let mut carol = Member::new(b"carol").unwrap();
        let id = alice.create().unwrap();
        let (_, welcome) = alice.add(&id, &[&bob.key_package().unwrap(), &carol.key_package().unwrap()]).unwrap();
        bob.join(&welcome).unwrap();
        carol.join(&welcome).unwrap();
        (kept(&alice), kept(&bob), kept(&carol), id)
    }

    #[test]
    fn a_member_renews_its_keys_through_the_keeper() {
        let (mut alice, bob, mut carol, id) = three();
        // What someone who took Bob's state before the renewal has.
        let mut stolen = kept(&bob);

        let package = bob.renewal(&id, b"bob, renewed").unwrap();
        let mut bob = kept(&bob);
        let (commit, welcome) = alice.renew(&id, 1, &package).unwrap();
        // The welcome first, as the app sends it: the commit then finds the group past it.
        bob.rejoin(&id, &welcome).unwrap();
        let mut bob = kept(&bob);
        assert!(!matches!(bob.open(&commit), Ok(Opened::Removed { .. })));
        // Carol, who knows nothing of renewals, sees the same member, saying what it says now.
        assert_eq!(carol.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        let (seats, _) = carol.members(&id).unwrap();
        let renewed = seats.iter().find(|s| s.key == bob.signer.public()).unwrap();
        assert_eq!(renewed.about, b"bob, renewed");
        assert_eq!(seats.len(), 3);

        let hello = bob.seal(&id, b"new keys").unwrap();
        for member in [&mut alice, &mut carol] {
            assert!(matches!(member.open(&hello).unwrap(), Opened::Message { text, about, .. } if text == b"new keys" && about == b"bob, renewed"));
        }
        let back = alice.seal(&id, b"welcome back").unwrap();
        assert!(matches!(bob.open(&back).unwrap(), Opened::Message { text, .. } if text == b"welcome back"));
        // The state taken before reads none of it.
        assert_eq!(stolen.open(&commit).unwrap(), Opened::Removed { group: id.clone() });
        assert!(matches!(stolen.open(&back), Err(Error::NoGroup)));
        // Nothing is left of the renewal: a welcome again finds none asked.
        assert!(matches!(bob.rejoin(&id, &welcome), Err(Error::NotRenewing)));
        assert!(bob.renewing(&id).is_none());
    }

    #[test]
    fn a_renewal_whose_commit_comes_first_waits_for_its_welcome() {
        let (mut alice, mut bob, mut carol, id) = three();
        let package = bob.renewal(&id, b"bob").unwrap();
        let (commit, welcome) = alice.renew(&id, 1, &package).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Renewing { group: id.clone() });
        carol.open(&commit).unwrap();
        // What the others write meanwhile waits.
        let early = carol.seal(&id, b"while you were out").unwrap();
        assert_eq!(bob.open(&early).unwrap(), Opened::Later { group: id.clone() });
        let mut bob = kept(&bob);
        bob.rejoin(&id, &welcome).unwrap();
        assert!(matches!(bob.open(&early).unwrap(), Opened::Message { text, .. } if text == b"while you were out"));
        let reply = bob.seal(&id, b"back").unwrap();
        assert!(matches!(alice.open(&reply).unwrap(), Opened::Message { .. }));
    }

    #[test]
    fn only_the_member_renews_itself_and_only_from_its_keeper() {
        let (mut alice, mut bob, carol, id) = three();
        assert!(matches!(alice.renewal(&id, b"alice"), Err(Error::OwnLeaf)));
        let bobs = bob.renewal(&id, b"bob").unwrap();
        let carols = carol.renewal(&id, b"carol").unwrap();
        // A key package of another member, or for the keeper's own leaf, or one not from a renewal.
        assert!(matches!(alice.renew(&id, 1, &carols), Err(Error::NotTheMember)));
        assert!(matches!(alice.renew(&id, 0, &bobs), Err(Error::NotTheMember)));
        assert!(matches!(alice.renew(&id, 7, &bobs), Err(Error::NotTheMember)));
        assert!(matches!(bob.renew(&id, 2, &carols), Err(Error::NotAdmin)));
        // A welcome to another group, from one asked for nothing.
        let mut dave = Member::new(b"dave").unwrap();
        let other = dave.create().unwrap();
        let (_, welcome) = dave.add(&other, &[&bob.key_package().unwrap()]).unwrap();
        assert!(matches!(bob.rejoin(&id, &welcome), Err(Error::NotRenewing)));
        // A renewal asked again replaces the one before: the first key package no longer joins.
        bob.renewal(&id, b"bob").unwrap();
        let (_, stale) = alice.renew(&id, 1, &bobs).unwrap();
        assert!(bob.rejoin(&id, &stale).is_err());
    }

    #[test]
    fn a_member_taken_out_while_it_renews_is_out() {
        let (mut alice, mut bob, _carol, id) = three();
        bob.renewal(&id, b"bob").unwrap();
        let commit = alice.remove(&id, &[1]).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Removed { group: id.clone() });
        assert!(bob.renewing(&id).is_none());
    }

    #[test]
    fn the_keeper_renews_its_own_keys() {
        let (mut alice, mut bob, mut carol, id) = three();
        let mut stolen = kept(&alice);
        assert!(matches!(bob.self_update(&id, None), Err(Error::NotAdmin)));
        let commit = alice.self_update(&id, None).unwrap();
        for member in [&mut bob, &mut carol] {
            assert_eq!(member.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        }
        let hello = bob.seal(&id, b"hi").unwrap();
        assert!(matches!(alice.open(&hello).unwrap(), Opened::Message { .. }));
        assert!(matches!(carol.open(&hello).unwrap(), Opened::Message { .. }));
        // The state taken before cannot follow it.
        assert!(!matches!(stolen.open(&commit), Ok(Opened::Changed { .. })));
        assert!(!matches!(stolen.open(&hello), Ok(Opened::Message { .. })));
        // Who asked to leave goes with it.
        let leaving = carol.leave(&id).unwrap();
        for member in [&mut alice, &mut bob] {
            assert_eq!(member.open(&leaving).unwrap(), Opened::Leaving { group: id.clone(), sender: 2 });
        }
        let commit = alice.self_update(&id, None).unwrap();
        assert_eq!(carol.open(&commit).unwrap(), Opened::Removed { group: id.clone() });
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
    }

    #[test]
    fn the_keeper_says_where_it_reads_now_with_its_new_keys() {
        let (mut alice, mut bob, mut carol, id) = three();
        // Members from before see the new `about` on the keeper's leaf, the same leaf and key.
        let key = alice.members(&id).unwrap().0[0].key.clone();
        let commit = alice.self_update(&id, Some(b"alice, moved")).unwrap();
        for member in [&mut bob, &mut carol] {
            assert_eq!(member.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
            let seats = member.members(&id).unwrap().0;
            assert_eq!((seats[0].leaf, seats[0].about.clone(), seats[0].key.clone()), (0, b"alice, moved".to_vec(), key.clone()));
        }
        let hello = alice.seal(&id, b"from the new queue").unwrap();
        assert!(matches!(bob.open(&hello).unwrap(), Opened::Message { sender: 0, about, .. } if about == b"alice, moved"));
        // Without one, what it said stays.
        let commit = alice.self_update(&id, None).unwrap();
        assert_eq!(carol.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        assert_eq!(carol.members(&id).unwrap().0[0].about, b"alice, moved");
        assert!(matches!(bob.self_update(&id, Some(b"bob")), Err(Error::NotAdmin)));
    }

    #[test]
    fn a_public_keeper_says_where_it_reads_now_with_the_key_made_for_the_group() {
        let mut alice = Member::new(b"a").unwrap();
        let mut bob = Member::new(b"b").unwrap();
        let alice_key = alice.new_signer().unwrap();
        let id = alice.create_public(&alice_key, b"alice", b"r").unwrap();
        let (_, package) = asking(&mut bob, b"bob");
        let (_, welcome) = alice.commit(&id, &[&package], &[], None).unwrap();
        bob.join(&welcome).unwrap();
        let commit = alice.self_update(&id, Some(b"alice, moved")).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        let seats = bob.members(&id).unwrap().0;
        assert_eq!((seats[0].about.clone(), seats[0].key.clone()), (b"alice, moved".to_vec(), alice_key));
        assert_eq!(bob.rules(&id).unwrap().rules, b"r");
    }

    #[test]
    fn a_public_group_renews_too() {
        let mut alice = Member::new(b"a").unwrap();
        let mut bob = Member::new(b"b").unwrap();
        let key = alice.new_signer().unwrap();
        let id = alice.create_public(&key, b"alice", b"r").unwrap();
        let (bob_key, package) = asking(&mut bob, b"bob");
        let (_, welcome) = alice.commit(&id, &[&package], &[], None).unwrap();
        bob.join(&welcome).unwrap();

        let package = bob.renewal(&id, b"bob, renewed").unwrap();
        assert_eq!(Member::package_about(&package).unwrap(), (b"bob, renewed".to_vec(), bob_key.clone()));
        let (commit, welcome) = alice.renew(&id, 1, &package).unwrap();
        bob.rejoin(&id, &welcome).unwrap();
        let _ = bob.open(&commit);
        // Bob signs with the key made for the group still, and the rules stay.
        assert_eq!(bob.members(&id).unwrap().0[1].key, bob_key);
        assert_eq!(bob.rules(&id).unwrap().rules, b"r");
        let commit = alice.self_update(&id, None).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        let (commit, _) = alice.commit(&id, &[], &[], Some((0, b"r2"))).unwrap();
        assert_eq!(bob.open(&commit).unwrap(), Opened::Changed { group: id.clone() });
        assert_eq!(bob.rules(&id).unwrap().rules, b"r2");
        let hello = bob.seal(&id, b"hi").unwrap();
        assert!(matches!(alice.open(&hello).unwrap(), Opened::Message { about, .. } if about == b"bob, renewed"));
    }

    #[test]
    fn a_public_group_of_the_most_members_fits_its_welcome_in_one_message() {
        // What a member says of itself there, as long as the app makes it.
        let about = |n: usize| format!("{{\"id\":\"{}\",\"sender\":\"{}\",\"relay\":\"wss://relay.example.org/erevos\",\"relayKey\":\"{}\",\"seal\":\"{}\",\"name\":\"Member number {n:>20}\"}}", "a".repeat(64), "b".repeat(48), "c".repeat(43), "d".repeat(43));
        let mut alice = Member::new(b"a").unwrap();
        let key = alice.new_signer().unwrap();
        let id = alice.create_public(&key, about(0).as_bytes(), &[b'r'; 4000]).unwrap();
        let mut others: Vec<Member> = Vec::new();
        let mut welcome = Vec::new();
        for n in 1..MOST_MEMBERS {
            let mut member = Member::new(b"m").unwrap();
            let (_, package) = asking(&mut member, about(n).as_bytes());
            welcome = alice.commit(&id, &[&package], &[], None).unwrap().1;
            others.push(member);
        }
        assert_eq!(alice.members(&id).unwrap().0.len(), MOST_MEMBERS);
        // A relay takes 64 KiB in one message: the welcome, sealed for its member, fits.
        assert!(welcome.len() < 60_000, "{} bytes", welcome.len());
        others.last_mut().unwrap().join(&welcome).unwrap();
    }
}
