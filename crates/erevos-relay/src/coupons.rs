// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Coupons: a token on this relay for a phone that is a member of another
//! one, without either relay learning which phone it is
//! (`erevos_core::coupon`).
//!
//! Two halves, each off unless the operator turns it on:
//!
//! - Signing (`EREVOS_RELAY_COUPON_KEY`, the file of a key made with
//!   `erevos-relay new-coupon-key FILE`, readable by its owner alone): a
//!   phone with a token of its own here (a line of the file of tokens, not a
//!   line a coupon made) has a blinded coupon signed (`COUPON_SIGN`), at most
//!   `MAX_SIGNED_A_DAY` a day and `MAX_SIGNED_A_MONTH` in 30 days (counted
//!   while the relay runs), and the relay at most `MAX_SIGNED_ALL` a day for
//!   all of them: one phone cannot fill another relay's lines from coupons. The relay sees the blinded message only, which tells
//!   nothing of the coupon the phone takes away, and says its public key to
//!   whoever asks (`COUPON_KEY`).
//! - Taking (`EREVOS_RELAY_COUPON_ISSUERS`, a file with the public keys of
//!   the relays whose coupons this one takes, one in hex on each line, as
//!   `new-coupon-key` writes it in `FILE.pub`; needs `EREVOS_RELAY_TOKENS`):
//!   on the `/join` path, with no token, the relay says which issuers it
//!   takes (`COUPON_KEYS`, the SHA-256 of each key), and takes a coupon
//!   signed by one of them with the SHA-256 of a token the phone made for
//!   itself (`COUPON_REDEEM`): it adds a line for that token to the file of
//!   tokens, named `spare`, which lasts `COUPON_DAYS`. Each coupon is taken
//!   once (the same one again with the same token is answered again, for a
//!   phone whose answer was lost); a line past its days is taken out of the
//!   file, so a phone that is no longer a member of the issuer's relay loses
//!   this one too in the end. At most `EREVOS_RELAY_MAX_COUPONS` lines from
//!   coupons stand at once (`MAX_LINES` unless set).
//!
//! What is kept, in `<file of tokens>.coupons` (written whole on each
//! change): for each coupon taken, the SHA-256 of its nonce, the SHA-256 of
//! the token it let in, and when that line ends. Nothing ties a line to the
//! phone's token on the other relay, nor to the phone. A line a coupon made
//! cannot have coupons signed, nor invite: it is no one's to answer for.
//!
//! Not audited.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{self, ErrorKind};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use erevos_core::coupon::{self, Issuer, NONCE, RANDOMIZER};
use sha2::{Digest, Sha256};

use crate::invites::date;
use crate::journal;
use crate::lock::lock;
use crate::tokens::{to_hex, Tokens};

/// How long a line a coupon made lasts, days: the phone takes a new coupon
/// before it ends (the app does at half of it).
pub const COUPON_DAYS: u64 = 90;
/// Coupons one phone may have signed a day, and in 30 days: the app takes
/// one every 30 to 60 days, and a few more when one is lost.
pub const MAX_SIGNED_A_DAY: usize = 2;
pub const MAX_SIGNED_A_MONTH: usize = 6;
/// Coupons the relay signs a day, for all its phones together.
pub const MAX_SIGNED_ALL: u32 = 1000;
/// Lines from coupons that stand at once, unless `EREVOS_RELAY_MAX_COUPONS`
/// says otherwise.
pub const MAX_LINES: usize = 2000;
/// Coupons taken that are kept, standing or not, so none is taken twice:
/// past this, no more are taken until the operator makes the issuers new keys.
pub const MAX_KEPT: usize = 200_000;
/// The longest blinded message or signature: a 4096-bit key's.
pub const MAX_SIGNATURE: usize = 512;
/// Issuers taken at most: few, as a relay that is let give its phones keys
/// of their own, all taken here, could tell them apart by the key.
pub const MAX_ISSUERS: usize = 4;
const DAY: u64 = 24 * 60 * 60;
const HEADER: &[u8; 8] = b"EREVOSC1";
const COUPONS_LOCK: &str = "lock of the coupons";
const SIGNED_LOCK: &str = "lock of the day's coupons signed";

/// A coupon taken: the token's SHA-256 it let in, and when that line ends (0
/// once it was taken out of the file).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
struct Taken {
    line: [u8; 32],
    ends: u64,
}

#[derive(Clone, Default)]
struct State {
    // By the SHA-256 of each coupon's nonce.
    taken: HashMap<[u8; 32], Taken>,
    // The lines of `taken` still in the file of tokens, to tell at once.
    lines: HashSet<[u8; 32]>,
}

impl State {
    fn encode(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(12 + 72 * self.taken.len());
        out.extend_from_slice(HEADER);
        out.extend_from_slice(&(self.taken.len() as u32).to_be_bytes());
        for (nonce, taken) in &self.taken {
            out.extend_from_slice(nonce);
            out.extend_from_slice(&taken.line);
            out.extend_from_slice(&taken.ends.to_be_bytes());
        }
        out
    }

    fn decode(bytes: &[u8]) -> Option<State> {
        let rest = bytes.strip_prefix(HEADER)?;
        let count = u32::from_be_bytes(rest.get(..4)?.try_into().ok()?) as usize;
        let rest = &rest[4..];
        if rest.len() != count.checked_mul(72)? {
            return None;
        }
        let mut state = State::default();
        for entry in rest.as_chunks::<72>().0 {
            state.insert(
                entry[..32].try_into().expect("32 bytes"),
                Taken {
                    line: entry[32..64].try_into().expect("32 bytes"),
                    ends: u64::from_be_bytes(entry[64..].try_into().expect("8 bytes")),
                },
            );
        }
        Some(state)
    }

    fn insert(&mut self, nonce: [u8; 32], taken: Taken) {
        if let Some(was) = self.taken.insert(nonce, taken) {
            self.lines.remove(&was.line);
        }
        if taken.line != [0; 32] {
            self.lines.insert(taken.line);
        }
    }

    fn standing(&self, now: u64) -> usize {
        self.taken.values().filter(|t| t.ends > now).count()
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum SignError {
    /// The relay signs no coupons, or not for this token.
    Off,
    /// This phone, or the relay, signed all it may today.
    Full,
    /// Not a blinded message for this key.
    Bad,
}

#[derive(Debug, PartialEq, Eq)]
pub enum RedeemError {
    /// No such issuer here, or the signature is not its, or the relay takes no coupons.
    NotFound,
    /// The coupon was taken already, with another token.
    Used,
    /// The relay has all the lines from coupons it may.
    Full,
    /// It could not be written, or the file has a line for that token already.
    Storage,
}

pub struct Coupons {
    issuer: Option<Issuer>,
    // Each issuer taken: the SHA-256 of its key, and the key.
    trusted: Vec<([u8; 32], Vec<u8>)>,
    state: Mutex<State>,
    path: Option<PathBuf>,
    most: usize,
    signed: Mutex<Signed>,
}

// The coupons signed: when, for each phone, in the last 30 days; and how many
// today, for all of them.
#[derive(Default)]
struct Signed {
    day: u64,
    all: u32,
    by: HashMap<[u8; 32], Vec<u64>>,
}

/// The issuer's key from its file, which only its owner may read.
pub fn read_issuer(path: &Path) -> io::Result<Issuer> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = fs::metadata(path)?.permissions().mode();
        if mode & 0o077 != 0 {
            return Err(io::Error::new(
                ErrorKind::PermissionDenied,
                format!("{} can be read by others than its owner: chmod 600 it", path.display()),
            ));
        }
    }
    let pem = fs::read_to_string(path)?;
    Issuer::from_pem(&pem).map_err(|_| {
        io::Error::new(ErrorKind::InvalidData, format!("{} is not a key for coupons", path.display()))
    })
}

/// The issuers' public keys from their file: one in hex on each line, `#`
/// starting a comment.
pub fn read_issuers(path: &Path) -> io::Result<Vec<Vec<u8>>> {
    let text = fs::read_to_string(path)?;
    let mut keys = Vec::new();
    for (at, line) in text.lines().enumerate() {
        let line = line.split('#').next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }
        let key = from_hex(line)
            .filter(|key| coupon::blind(key, &[0; NONCE]).is_ok())
            .ok_or_else(|| {
                io::Error::new(
                    ErrorKind::InvalidData,
                    format!("line {} of {} is not a key for coupons", at + 1, path.display()),
                )
            })?;
        if keys.len() >= MAX_ISSUERS {
            return Err(io::Error::new(
                ErrorKind::InvalidData,
                format!("{} names more than {MAX_ISSUERS} issuers", path.display()),
            ));
        }
        if !keys.contains(&key) {
            keys.push(key);
        }
    }
    Ok(keys)
}

fn from_hex(hex: &str) -> Option<Vec<u8>> {
    if !hex.len().is_multiple_of(2) || !hex.is_ascii() {
        return None;
    }
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).ok())
        .collect()
}

/// A new key for coupons: the secret key's PEM, and the public key in hex,
/// for the issuers' files of other relays.
pub fn new_key() -> Result<(String, String), String> {
    let issuer = Issuer::generate().map_err(|e| e.to_string())?;
    let pem = issuer.to_pem().map_err(|e| e.to_string())?;
    Ok((pem, to_hex(issuer.public_spki())))
}

impl Coupons {
    /// Signing with `issuer`, if given, and taking the coupons of `trusted`,
    /// what is taken kept at `path`, which is read now.
    pub fn open(
        issuer: Option<Issuer>,
        trusted: Vec<Vec<u8>>,
        path: Option<&Path>,
        most: usize,
    ) -> io::Result<Coupons> {
        let state = match path.map(fs::read) {
            Some(Ok(bytes)) => State::decode(&bytes).ok_or_else(|| {
                io::Error::new(
                    ErrorKind::InvalidData,
                    format!("{} is not a file of coupons", path.expect("a path").display()),
                )
            })?,
            Some(Err(e)) if e.kind() != ErrorKind::NotFound => return Err(e),
            _ => State::default(),
        };
        Ok(Coupons {
            issuer,
            trusted: trusted.into_iter().map(|key| (coupon::key_id(&key), key)).collect(),
            state: Mutex::new(state),
            path: path.map(Path::to_path_buf),
            most,
            signed: Mutex::new(Signed::default()),
        })
    }

    pub fn signs(&self) -> bool {
        self.issuer.is_some()
    }

    pub fn takes(&self) -> bool {
        !self.trusted.is_empty()
    }

    /// The public key coupons are signed with here.
    pub fn issuer_key(&self) -> Option<&[u8]> {
        self.issuer.as_ref().map(Issuer::public_spki)
    }

    /// The SHA-256 of each issuer's key whose coupons are taken here.
    pub fn trusted_ids(&self) -> Vec<[u8; 32]> {
        self.trusted.iter().map(|(id, _)| *id).collect()
    }

    /// Whether the token whose SHA-256 is `line` came with a coupon, past its
    /// days too while its line is not out of the file yet.
    pub fn made(&self, line: &[u8; 32]) -> bool {
        line != &[0; 32] && lock(&self.state, COUPONS_LOCK).lines.contains(line)
    }

    /// Signs `blinded` for the phone whose token's SHA-256 is `phone`.
    pub fn sign(&self, phone: &[u8; 32], blinded: &[u8], now: u64) -> Result<Vec<u8>, SignError> {
        let issuer = self.issuer.as_ref().ok_or(SignError::Off)?;
        if self.made(phone) {
            return Err(SignError::Off);
        }
        let mut signed = lock(&self.signed, SIGNED_LOCK);
        if signed.day != now / DAY {
            signed.day = now / DAY;
            signed.all = 0;
            // A phone's times past 30 days count no more.
            signed.by.retain(|_, times| {
                times.retain(|&at| at + 30 * DAY > now);
                !times.is_empty()
            });
        }
        let times = signed.by.get(phone).map(Vec::as_slice).unwrap_or(&[]);
        let today = times.iter().filter(|&&at| at / DAY == now / DAY).count();
        let month = times.iter().filter(|&&at| at + 30 * DAY > now).count();
        if today >= MAX_SIGNED_A_DAY || month >= MAX_SIGNED_A_MONTH || signed.all >= MAX_SIGNED_ALL {
            return Err(SignError::Full);
        }
        let signature = issuer.sign(blinded).map_err(|_| SignError::Bad)?;
        // Counted once signed: a bad one costs the phone nothing but its connection.
        signed.by.entry(*phone).or_default().push(now);
        signed.all += 1;
        Ok(signature)
    }

    fn save(&self, state: &State) -> io::Result<()> {
        match &self.path {
            Some(path) => journal::write_whole(path, &state.encode()),
            None => Ok(()),
        }
    }

    /// Takes the coupon of `nonce`, `randomizer` and `signature`, by the issuer
    /// whose key's SHA-256 is `issuer`, for the token whose SHA-256 is `line`:
    /// adds a line for it to `tokens`, ending `COUPON_DAYS` from `now`, and
    /// returns the name on it. The coupon is written down as taken before the
    /// line goes in, so no stop lets it in twice; if the line cannot go in, it
    /// is open again.
    #[allow(clippy::too_many_arguments)]
    pub fn redeem(
        &self,
        issuer: &[u8; 32],
        nonce: &[u8; NONCE],
        randomizer: &[u8; RANDOMIZER],
        signature: &[u8],
        line: &[u8; 32],
        tokens: &Tokens,
        now: u64,
    ) -> Result<String, RedeemError> {
        let (_, key) = self
            .trusted
            .iter()
            .find(|(id, _)| id == issuer)
            .ok_or(RedeemError::NotFound)?;
        coupon::verify(key, signature, randomizer, nonce).map_err(|_| RedeemError::NotFound)?;
        let spent: [u8; 32] = Sha256::digest(nonce).into();
        let mut state = lock(&self.state, COUPONS_LOCK);
        if let Some(taken) = state.taken.get(&spent) {
            if &taken.line == line && taken.ends > now && tokens.holds(line) {
                return tokens.name_of(line).ok_or(RedeemError::Storage);
            }
            return Err(RedeemError::Used);
        }
        if state.standing(now) >= self.most || state.taken.len() >= MAX_KEPT {
            return Err(RedeemError::Full);
        }
        if tokens.holds(line) {
            return Err(RedeemError::Storage);
        }
        let ends = now + COUPON_DAYS * DAY;
        let mut next = state.clone();
        next.insert(spent, Taken { line: *line, ends });
        self.save(&next).map_err(|_| RedeemError::Storage)?;
        let note = format!("came with a coupon on {}, until {}", date(now), date(ends));
        match tokens.add(line, "spare", true, &note, None) {
            Ok(name) => {
                *state = next;
                Ok(name)
            }
            // Written all the same (the error came after): taken, so never again.
            Err(_) if tokens.holds(line) => {
                *state = next;
                Err(RedeemError::Storage)
            }
            Err(_) => {
                if let Err(e) = self.save(&state) {
                    // Taken in the file with no line: it lets no one in, the safe way to be wrong.
                    elog!("erevos-relay: cannot write the coupons: {e}");
                    *state = next;
                }
                Err(RedeemError::Storage)
            }
        }
    }

    /// Takes the lines of coupons past their days out of `tokens`. A coupon
    /// stays kept after, so it is never taken again.
    pub fn sweep(&self, tokens: &Tokens, now: u64) {
        let mut state = lock(&self.state, COUPONS_LOCK);
        let ended: Vec<[u8; 32]> = state
            .taken
            .iter()
            .filter(|(_, t)| t.ends != 0 && t.ends <= now)
            .map(|(nonce, _)| *nonce)
            .collect();
        if ended.is_empty() {
            return;
        }
        let mut next = state.clone();
        for nonce in ended {
            let taken = next.taken[&nonce];
            match tokens.remove(&taken.line) {
                Ok(_) => {
                    next.insert(nonce, Taken { line: [0; 32], ends: 0 });
                }
                Err(e) => elog!("erevos-relay: cannot take out the line of an old coupon: {e}"),
            }
        }
        match self.save(&next) {
            Ok(()) => *state = next,
            Err(e) => elog!("erevos-relay: cannot write the coupons: {e}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::OnceLock;

    const NOW: u64 = 1_800_000_000;

    fn issuer() -> &'static Issuer {
        static KEY: OnceLock<Issuer> = OnceLock::new();
        KEY.get_or_init(|| Issuer::generate().unwrap())
    }

    fn copy(issuer: &Issuer) -> Issuer {
        Issuer::from_pem(&issuer.to_pem().unwrap()).unwrap()
    }

    fn dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("erevos-coupons-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn tokens_in(dir: &Path) -> Tokens {
        let path = dir.join("phones.tokens");
        fs::write(&path, format!("{} member\n", to_hex(&[1u8; 32]))).unwrap();
        Tokens::new(path)
    }

    // A coupon signed by `signer` for `nonce`, as a phone finishes it.
    fn coupon_of(signer: &Coupons, phone: &[u8; 32], nonce: &[u8; NONCE]) -> ([u8; RANDOMIZER], Vec<u8>) {
        let key = signer.issuer_key().unwrap().to_vec();
        let blinded = coupon::blind(&key, nonce).unwrap();
        let signed = signer.sign(phone, &blinded.message, NOW).unwrap();
        let signature = coupon::finalize(&key, &signed, &blinded.secret, &blinded.randomizer, nonce).unwrap();
        (blinded.randomizer, signature)
    }

    #[test]
    fn a_member_of_one_relay_gets_a_line_on_the_other() {
        let dir = dir("round");
        let first = Coupons::open(Some(copy(issuer())), vec![], None, MAX_LINES).unwrap();
        let id = coupon::key_id(first.issuer_key().unwrap());
        let second =
            Coupons::open(None, vec![first.issuer_key().unwrap().to_vec()], Some(&dir.join("c")), MAX_LINES).unwrap();
        assert_eq!(second.trusted_ids(), vec![id]);
        let tokens = tokens_in(&dir);
        let nonce = [5u8; NONCE];
        let (randomizer, signature) = coupon_of(&first, &[1u8; 32], &nonce);
        let line = [9u8; 32];
        let name = second.redeem(&id, &nonce, &randomizer, &signature, &line, &tokens, NOW).unwrap();
        assert_eq!(name, "spare");
        assert!(tokens.holds(&line));
        assert!(second.made(&line));
        // Lost answer: the same again.
        assert_eq!(second.redeem(&id, &nonce, &randomizer, &signature, &line, &tokens, NOW).unwrap(), "spare");
        // Once only.
        assert_eq!(
            second.redeem(&id, &nonce, &randomizer, &signature, &[8u8; 32], &tokens, NOW),
            Err(RedeemError::Used)
        );
        // Kept through a restart.
        let again =
            Coupons::open(None, vec![first.issuer_key().unwrap().to_vec()], Some(&dir.join("c")), MAX_LINES).unwrap();
        assert_eq!(
            again.redeem(&id, &nonce, &randomizer, &signature, &[8u8; 32], &tokens, NOW),
            Err(RedeemError::Used)
        );
        // Past its days its line goes, and the coupon still is never taken again.
        again.sweep(&tokens, NOW + COUPON_DAYS * DAY);
        assert!(!tokens.holds(&line));
        assert!(!again.made(&line));
        assert_eq!(
            again.redeem(&id, &nonce, &randomizer, &signature, &line, &tokens, NOW + COUPON_DAYS * DAY),
            Err(RedeemError::Used)
        );
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_coupon_of_another_issuer_or_bent_is_refused() {
        let dir = dir("refused");
        let first = Coupons::open(Some(copy(issuer())), vec![], None, MAX_LINES).unwrap();
        let stranger = Coupons::open(Some(Issuer::generate().unwrap()), vec![], None, MAX_LINES).unwrap();
        let id = coupon::key_id(first.issuer_key().unwrap());
        let second = Coupons::open(None, vec![first.issuer_key().unwrap().to_vec()], None, MAX_LINES).unwrap();
        let tokens = tokens_in(&dir);
        let nonce = [6u8; NONCE];
        let (randomizer, signature) = coupon_of(&stranger, &[1u8; 32], &nonce);
        assert_eq!(
            second.redeem(&id, &nonce, &randomizer, &signature, &[9u8; 32], &tokens, NOW),
            Err(RedeemError::NotFound)
        );
        let stranger_id = coupon::key_id(stranger.issuer_key().unwrap());
        assert_eq!(
            second.redeem(&stranger_id, &nonce, &randomizer, &signature, &[9u8; 32], &tokens, NOW),
            Err(RedeemError::NotFound)
        );
        let (randomizer, signature) = coupon_of(&first, &[1u8; 32], &nonce);
        assert_eq!(
            second.redeem(&id, &[7u8; NONCE], &randomizer, &signature, &[9u8; 32], &tokens, NOW),
            Err(RedeemError::NotFound)
        );
        assert!(!tokens.holds(&[9u8; 32]));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn signing_is_limited_and_never_for_a_coupons_line() {
        let dir = dir("limits");
        let both = Coupons::open(
            Some(copy(issuer())),
            vec![issuer().public_spki().to_vec()],
            None,
            1,
        )
        .unwrap();
        let key = both.issuer_key().unwrap().to_vec();
        let blinded = coupon::blind(&key, &[0u8; NONCE]).unwrap();
        let phone = [1u8; 32];
        for _ in 0..MAX_SIGNED_A_DAY {
            both.sign(&phone, &blinded.message, NOW).unwrap();
        }
        assert_eq!(both.sign(&phone, &blinded.message, NOW), Err(SignError::Full));
        // The next day again, until the 30 days' most.
        both.sign(&phone, &blinded.message, NOW + DAY).unwrap();
        both.sign(&phone, &blinded.message, NOW + 2 * DAY).unwrap();
        both.sign(&phone, &blinded.message, NOW + 2 * DAY).unwrap();
        both.sign(&phone, &blinded.message, NOW + 3 * DAY).unwrap();
        assert_eq!(both.sign(&phone, &blinded.message, NOW + 4 * DAY), Err(SignError::Full));
        both.sign(&phone, &blinded.message, NOW + 30 * DAY).unwrap();
        assert_eq!(both.sign(&[2u8; 32], &[1u8; 3], NOW), Err(SignError::Bad));
        // A line a coupon made has none signed.
        let tokens = tokens_in(&dir);
        let id = coupon::key_id(&key);
        let (randomizer, signature) = coupon_of(&both, &[3u8; 32], &[4u8; NONCE]);
        let line = [9u8; 32];
        both.redeem(&id, &[4u8; NONCE], &randomizer, &signature, &line, &tokens, NOW).unwrap();
        assert_eq!(both.sign(&line, &blinded.message, NOW), Err(SignError::Off));
        // At most `most` lines from coupons stand.
        let (randomizer, signature) = coupon_of(&both, &[3u8; 32], &[5u8; NONCE]);
        assert_eq!(
            both.redeem(&id, &[5u8; NONCE], &randomizer, &signature, &[8u8; 32], &tokens, NOW),
            Err(RedeemError::Full)
        );
        // A relay with no key signs none.
        let none = Coupons::open(None, vec![key], None, MAX_LINES).unwrap();
        assert_eq!(none.sign(&phone, &blinded.message, NOW), Err(SignError::Off));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn the_files_are_read_as_written() {
        let dir = dir("files");
        let (pem, public) = new_key().unwrap();
        let key = dir.join("coupon.key");
        fs::write(&key, &pem).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&key, fs::Permissions::from_mode(0o644)).unwrap();
            assert!(read_issuer(&key).is_err());
            fs::set_permissions(&key, fs::Permissions::from_mode(0o600)).unwrap();
        }
        let issuer = read_issuer(&key).unwrap();
        assert_eq!(to_hex(issuer.public_spki()), public);
        let list = dir.join("issuers");
        fs::write(&list, format!("# the other relay\n{public} # coupon.key\n\n{public}\n")).unwrap();
        assert_eq!(read_issuers(&list).unwrap(), vec![issuer.public_spki().to_vec()]);
        fs::write(&list, "abcd\n").unwrap();
        assert!(read_issuers(&list).is_err());
        let state = dir.join("bad");
        fs::write(&state, b"something else").unwrap();
        assert!(Coupons::open(None, vec![], Some(&state), MAX_LINES).is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
