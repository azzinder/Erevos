//! Tokens of their own for each phone, beside the relay's one token.
//!
//! The operator keeps a file (`EREVOS_RELAY_TOKENS`) of one token's SHA-256 a
//! line, in hex, and after it, if they like, a name for whose phone it is:
//!
//! ```text
//! # Nekten's Pixel
//! 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 pixel
//! ```
//!
//! `erevos-relay new-token NAME` makes a token and prints it, for the phone,
//! with its line, for the file. A connection whose token's SHA-256 is on a
//! line uses the relay as one with the relay's token does. Taking the line out
//! takes the phone's access back, without changing anyone else's: the file is
//! read again whenever it changes, and from then on the token is refused. The
//! relay never keeps the tokens themselves, so the file tells no one how to
//! connect. Blank lines and lines that start with `#` are left out; a file
//! that is not there holds no tokens.
//!
//! The relay adds lines itself too, for a phone invited by another (see
//! `invites.rs`) or signed in with a provider (see `signin.rs`), and takes
//! them out again when the phone that invited it takes its invite back, or
//! the provider no longer lets the account in. It writes the whole file again
//! then, through a file beside it and a rename (`journal::write_whole_then`),
//! keeping every other line as it was, so the folder the file is in must be
//! one the relay can write. What it adds says where the line came from, after
//! the name:
//!
//! ```text
//! 3b7c0e5a8d16...91e1 maria # invited by pixel on 2026-10-21
//! 5d41402abc4b...e2a0 lphl:nekten # signed in with LPHL on 2026-10-21
//! ```
//!
//! A line an invite made lasts only while the line of the phone that invited
//! it is there, and so on up (`set_invited`, from what `invites.rs` keeps).
//! The chain goes by the tokens' SHA-256s, not the names: a line the operator
//! puts in place of another with a new token is another line, and what the
//! old one invited goes. When a line goes, whatever took it out (its inviter,
//! the provider's check, the operator deleting it by hand), the lines it
//! invited are refused at once, and the lines those invited, all the way
//! down.
//!
//! Reading the file never writes it, so a save of the operator's under way,
//! read halfway, is never written over with its first half. The relay takes
//! the lines out of force out of the file only when it writes the file anyway
//! (`add`, `remove`) or in its hourly look (`prune`), and then only once the
//! file has stayed as it is for `SETTLE` (or is as the relay itself wrote
//! it), and only if it is still as read just before, by its time, length and
//! inode. A line the relay took out when the file could not be written is
//! refused all the same (`refused`), and written out at the next look. That
//! is kept in memory only, so after a restart the line is in force again
//! until whatever took it out does so again: the provider's check keeps its
//! record for that (see `signin.rs`), and an invite taken back stays until
//! then. Since the relay writes the file through a rename, its path must be
//! the file itself: the relay refuses to start, or to write, when it is a
//! symbolic link (`plain_file`).

use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{self, ErrorKind};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::journal;
use crate::lock::lock;

const TOKENS_LOCK: &str = "lock of the phones' tokens";

/// How long the file must have stayed as it is before the relay takes lines
/// out of force out of it, or takes a line missing from it as gone: an edit
/// being saved is over long before.
pub const SETTLE: Duration = Duration::from_secs(60);

/// Times the relay reads the file again for a change of its own when the
/// file changed while it was read or before it was written.
const TRIES: usize = 3;

/// When the file was last changed, how long it is and which file it is (its
/// inode): together they tell whether it changed since it was read.
type Stamp = (SystemTime, u64, u64);

pub struct Tokens {
    path: PathBuf,
    seen: Mutex<Seen>,
}

#[derive(Default)]
struct Seen {
    /// The file's stamp as last read; `None` when it was not there.
    stamp: Option<Stamp>,
    /// Whether it was read at all yet.
    read: bool,
    /// When the relay first saw the file as `stamp` says, by its own clock.
    since: Option<Instant>,
    /// The file's stamp as the relay itself last wrote it.
    wrote: Option<Stamp>,
    /// Whether the relay already said it cannot read the file, so it says so
    /// once until the file can be read again, not on every connection.
    complained: bool,
    /// Each token's SHA-256 with a line in the file, with the name on its
    /// line ('' when it has none).
    all: HashMap<[u8; 32], String>,
    /// Those whose line is in force.
    hashes: HashMap<[u8; 32], String>,
    /// For each line an invite made, by its token's SHA-256, that of the line
    /// of the phone that invited it.
    invited: HashMap<[u8; 32], [u8; 32]>,
    /// Lines the relay took out, refused whether or not that could be
    /// written yet; each goes from here once the file is written without it.
    refused: HashSet<[u8; 32]>,
    /// The lines whose inviter's line is gone, as last said in the log.
    told: HashSet<[u8; 32]>,
}

/// A phone whose token is on a line of the file: the token's SHA-256 and the
/// name on its line.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Phone {
    pub hash: [u8; 32],
    pub name: String,
}

impl Tokens {
    /// The tokens in the file at `path`, read when first asked.
    pub fn new(path: PathBuf) -> Tokens {
        Tokens {
            path,
            seen: Mutex::default(),
        }
    }

    /// Whether `token` is on a line of the file, reading it again if it
    /// changed since.
    #[cfg(test)]
    pub fn has(&self, token: &str) -> bool {
        self.find(token).is_some()
    }

    /// The phone whose token `token` is, if it is on a line of the file,
    /// reading it again if it changed since.
    pub fn find(&self, token: &str) -> Option<Phone> {
        let hash: [u8; 32] = Sha256::digest(token.as_bytes()).into();
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes.get(&hash).map(|name| Phone {
            hash,
            name: name.clone(),
        })
    }

    /// Whether the token whose SHA-256 is `hash` is on a line of the file.
    pub fn holds(&self, hash: &[u8; 32]) -> bool {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes.contains_key(hash)
    }

    /// Whether the file has a line for the token whose SHA-256 is `hash`, in
    /// force or not.
    pub fn in_file(&self, hash: &[u8; 32]) -> bool {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.all.contains_key(hash)
    }

    /// Whether the line of the token whose SHA-256 is `hash` is surely gone
    /// from the file: not in it as read once the file had stayed as it is for
    /// `SETTLE`, or as the relay wrote it, so not halfway through a save. Never
    /// while the file is not there.
    pub fn gone(&self, hash: &[u8; 32]) -> bool {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        !seen.all.contains_key(hash) && seen.settled(seen.stamp)
    }

    /// How many lines the file has now, in force or not.
    pub fn lines_in_file(&self) -> usize {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.all.len()
    }

    /// The tokens' SHA-256s of the lines named `name`, in force or not, the
    /// case of its letters aside.
    pub fn named(&self, name: &str) -> Vec<[u8; 32]> {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        let name = name.to_lowercase();
        seen.all
            .iter()
            .filter(|(_, named)| named.to_lowercase() == name)
            .map(|(hash, _)| *hash)
            .collect()
    }

    /// The name on the line of the token whose SHA-256 is `hash`, if the file
    /// has that line.
    pub fn name_of(&self, hash: &[u8; 32]) -> Option<String> {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes.get(hash).cloned()
    }

    /// Each line in force: its token's SHA-256 and the name on it.
    pub fn lines(&self) -> Vec<([u8; 32], String)> {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes
            .iter()
            .map(|(hash, name)| (*hash, name.clone()))
            .collect()
    }

    /// Which lines invites made, each with the line of the phone that invited
    /// it, by their tokens' SHA-256s, as the invites keep them; set when the
    /// relay starts. A line whose inviter's line is gone is refused now.
    pub fn set_invited(&self, invited: HashMap<[u8; 32], [u8; 32]>) {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        seen.invited = invited;
        seen.read = false;
        self.refresh(&mut seen);
    }

    /// Forgets which phone invited each of `lines`, once their invites are
    /// gone (see `invites.rs`).
    pub fn forget_invited(&self, lines: &[[u8; 32]]) {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        for line in lines {
            seen.invited.remove(line);
        }
        self.refresh(&mut seen);
        seen.force();
    }

    /// Reads the file again, changed or not, and writes it again without the
    /// lines out of force: those whose inviter's line is gone, and those the
    /// relay took out when that could not be written. Only once the file has
    /// stayed as it is for `SETTLE`, and only if it did not change since it
    /// was read. The relay calls this now and then.
    pub fn prune(&self) {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        seen.read = false;
        self.refresh(&mut seen);
        if !seen.read || !seen.settled(seen.stamp) {
            return;
        }
        // Lines taken out that are gone from the file need refusing no more.
        let Seen { all, refused, .. } = &mut *seen;
        refused.retain(|hash| all.contains_key(hash));
        if seen.hashes.len() == seen.all.len() {
            return;
        }
        let invited = seen.invited.clone();
        if let Err(e) = self.rewrite(&mut seen, invited, |_| Ok(())) {
            elog!(
                "erevos-relay: cannot take the lines out of force out of {} now, so they are only refused until the next try: {e}",
                self.path.display()
            );
        }
    }

    /// Adds a line for the token whose SHA-256 is `hash`, named `name`, and
    /// `note` after it as a comment. With `unique`, a name another line has
    /// already gets `-2`, `-3` and so on after it. With `instead`, the line of
    /// that token goes in the same write, and the lines it invited are the new
    /// line's from then on. With `by`, an invite from the line of that token
    /// made the new line, which lasts only as long as that one. Returns the
    /// name written. The file is read again first, so a line the operator just
    /// added stays; one for `hash` already there is an error (`AlreadyExists`),
    /// and nothing is written.
    pub fn add(
        &self,
        hash: &[u8; 32],
        name: &str,
        unique: bool,
        note: &str,
        instead: Option<&[u8; 32]>,
        by: Option<&[u8; 32]>,
    ) -> io::Result<String> {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        let mut invited = seen.invited.clone();
        if let Some(gone) = instead {
            invited.remove(gone);
            for inviter in invited.values_mut() {
                if inviter == gone {
                    *inviter = *hash;
                }
            }
        }
        match by {
            Some(by) => invited.insert(*hash, *by),
            None => invited.remove(hash),
        };
        let written = self.rewrite(&mut seen, invited, |lines| {
            if lines.iter().any(|line| line_hash(line) == Some(*hash)) {
                return Err(io::Error::new(
                    ErrorKind::AlreadyExists,
                    "a line for that token is in the file already",
                ));
            }
            lines.retain(|line| !matches!(instead, Some(gone) if line_hash(line) == Some(*gone)));
            let taken: Vec<String> = lines
                .iter()
                .filter_map(|line| line_name(line))
                .map(|name| name.to_lowercase())
                .collect();
            let mut written = name.to_string();
            let mut n = 1;
            while unique && taken.contains(&written.to_lowercase()) {
                n += 1;
                written = format!("{name}-{n}");
            }
            lines.push(format!("{} {written} # {note}", to_hex(hash)));
            Ok(written)
        })?;
        // The relay put it in itself, so it is wanted whatever it refused before.
        seen.refused.remove(hash);
        seen.force();
        Ok(written)
    }

    /// Takes out the line of the token whose SHA-256 is `hash`, and the lines
    /// it invited with it. False when the file has no such line. The line is
    /// refused from now on, even when the file cannot be written now: the
    /// next look writes it out (`prune`).
    pub fn remove(&self, hash: &[u8; 32]) -> io::Result<bool> {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        seen.refused.insert(*hash);
        seen.force();
        let invited = seen.invited.clone();
        let found = self.rewrite(&mut seen, invited, |lines| {
            let before = lines.len();
            lines.retain(|line| line_hash(line) != Some(*hash));
            Ok(lines.len() != before)
        })?;
        // Not in a file read once it stayed as it is: nothing is left to refuse.
        self.refresh(&mut seen);
        if !seen.all.contains_key(hash) && seen.settled(seen.stamp) {
            seen.refused.remove(hash);
        }
        Ok(found)
    }

    /// Writes the file again from what it holds now, with `change` made to its
    /// lines, `invited` as the lines invites made from then on, and, when the
    /// file has stayed as it is for `SETTLE`, without the lines out of force.
    /// The file is read again first, so no line written since is lost, and
    /// written only if it is still as read then; when it changed meanwhile,
    /// all that is done again, `TRIES` times at most. Nothing is written when
    /// nothing changed.
    fn rewrite<T>(
        &self,
        seen: &mut Seen,
        invited: HashMap<[u8; 32], [u8; 32]>,
        mut change: impl FnMut(&mut Vec<String>) -> io::Result<T>,
    ) -> io::Result<T> {
        let mut tries = 0;
        loop {
            let again = |e: &io::Error, tries: &mut usize| {
                *tries += 1;
                let more = e.kind() == ErrorKind::Interrupted && *tries < TRIES;
                if more {
                    thread::sleep(Duration::from_millis(50));
                }
                more
            };
            let (text, stamp) = match self.read_now() {
                Ok(read) => read,
                Err(e) if again(&e, &mut tries) => continue,
                Err(e) => return Err(e),
            };
            let before: Vec<String> = text.lines().map(str::to_string).collect();
            let mut lines = before.clone();
            let out = change(&mut lines)?;
            if seen.settled(stamp) {
                let held: HashSet<[u8; 32]> = lines
                    .iter()
                    .filter_map(|line| line_hash(line))
                    .filter(|hash| !seen.refused.contains(hash))
                    .collect();
                let gone = orphans(&held, &invited);
                lines.retain(|line| {
                    line_hash(line).is_none_or(|hash| held.contains(&hash) && !gone.contains(&hash))
                });
            }
            if lines == before {
                seen.invited = invited;
                seen.force();
                return Ok(out);
            }
            match self.write(seen, &lines, &invited, stamp) {
                Ok(()) => return Ok(out),
                Err(e) if again(&e, &mut tries) => continue,
                Err(e) => return Err(e),
            }
        }
    }

    /// The file as it is now, and its stamp; empty, with none, when it is not
    /// there. An error (`Interrupted`) when it changed while it was read.
    fn read_now(&self) -> io::Result<(String, Option<Stamp>)> {
        let before = stamp_of(&self.path)?;
        let text = match fs::read_to_string(&self.path) {
            Ok(text) => text,
            Err(e) if e.kind() == ErrorKind::NotFound => String::new(),
            Err(e) => return Err(e),
        };
        let after = stamp_of(&self.path)?;
        if before != after {
            return Err(io::Error::new(
                ErrorKind::Interrupted,
                "the file changed while it was read",
            ));
        }
        Ok((text, after))
    }

    /// Writes `lines` as the whole file, with `invited` as the lines invites
    /// made from then on, if the file is still as `read` says it was, and
    /// reads it back. An error (`Interrupted`) when it changed since.
    fn write(
        &self,
        seen: &mut Seen,
        lines: &[String],
        invited: &HashMap<[u8; 32], [u8; 32]>,
        read: Option<Stamp>,
    ) -> io::Result<()> {
        plain_file(&self.path)?;
        let mut text = lines.join("\n");
        text.push('\n');
        let mut wrote = None;
        journal::write_whole_then(&self.path, text.as_bytes(), |file| {
            if stamp_of(&self.path)? != read {
                return Err(io::Error::new(
                    ErrorKind::Interrupted,
                    "the file changed since it was read",
                ));
            }
            // A rename keeps the time, length and inode of the file it puts in place.
            wrote = Some(stamped(&file.metadata()?));
            Ok(())
        })?;
        seen.wrote = wrote;
        seen.invited = invited.clone();
        let kept: HashSet<[u8; 32]> = lines.iter().filter_map(|line| line_hash(line)).collect();
        seen.refused.retain(|hash| kept.contains(hash));
        seen.read = false;
        self.refresh(seen);
        Ok(())
    }

    /// How many tokens the file holds now, reading it if it changed.
    pub fn count(&self) -> usize {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes.len()
    }

    /// Reads the file again if it changed since, or was not read yet. Never
    /// writes it.
    fn refresh(&self, seen: &mut Seen) {
        let stamp = match stamp_of(&self.path) {
            Ok(stamp) => stamp,
            Err(e) => {
                // Unreadable for now: the tokens read last stay as they were.
                seen.complain(&format!(
                    "cannot look at the phones' tokens in {}: {e}",
                    self.path.display()
                ));
                return;
            }
        };
        if seen.read && stamp == seen.stamp {
            return;
        }
        let text = match stamp {
            None => String::new(),
            Some(_) => match fs::read_to_string(&self.path) {
                Ok(text) => text,
                Err(e) => {
                    seen.complain(&format!(
                        "cannot read the phones' tokens in {}: {e}",
                        self.path.display()
                    ));
                    return;
                }
            },
        };
        let mut all = HashMap::new();
        for (n, line) in text.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            match line_hash(line) {
                Some(hash) => {
                    all.insert(hash, line_name(line).unwrap_or_default().to_string());
                }
                None => elog!(
                    "erevos-relay: line {} of {} does not start with a token's SHA-256 (64 hex characters), left out",
                    n + 1,
                    self.path.display()
                ),
            }
        }
        if stamp != seen.stamp || seen.since.is_none() {
            seen.since = Some(Instant::now());
        }
        seen.all = all;
        // The stamp from before the read: a change while it was read is read at the next look.
        seen.stamp = stamp;
        seen.read = true;
        seen.complained = false;
        seen.force();
        elog!(
            "erevos-relay: {} phones' tokens in {}",
            seen.hashes.len(),
            self.path.display()
        );
    }
}

impl Seen {
    fn complain(&mut self, what: &str) {
        if !self.complained {
            elog!("erevos-relay: {what}");
            self.complained = true;
        }
    }

    /// Works out the lines in force from the lines read, the lines invites
    /// made and the lines refused, and says in the log each line that went out
    /// of force for its inviter's since.
    fn force(&mut self) {
        let held: HashSet<[u8; 32]> = self
            .all
            .keys()
            .filter(|hash| !self.refused.contains(*hash))
            .copied()
            .collect();
        let gone = orphans(&held, &self.invited);
        for hash in gone.difference(&self.told) {
            elog!(
                "erevos-relay: the line {} is refused: the line of the phone that invited it is gone",
                short(hash)
            );
        }
        self.hashes = self
            .all
            .iter()
            .filter(|(hash, _)| held.contains(*hash) && !gone.contains(*hash))
            .map(|(hash, name)| (*hash, name.clone()))
            .collect();
        self.told = gone;
    }

    /// Whether the file, as `stamp` says it is, has stayed as it is for
    /// `SETTLE`, by its time or the relay's clock, or is as the relay wrote it.
    fn settled(&self, stamp: Option<Stamp>) -> bool {
        let Some(stamp) = stamp else {
            return false;
        };
        let old = SystemTime::now()
            .duration_since(stamp.0)
            .is_ok_and(|age| age >= SETTLE);
        let seen_long =
            self.stamp == Some(stamp) && self.since.is_some_and(|since| since.elapsed() >= SETTLE);
        self.wrote == Some(stamp) || old || seen_long
    }
}

/// The stamp of the file at `path`; `None` when it is not there.
fn stamp_of(path: &Path) -> io::Result<Option<Stamp>> {
    match fs::metadata(path) {
        Ok(meta) => Ok(Some(stamped(&meta))),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}

fn stamped(meta: &fs::Metadata) -> Stamp {
    #[cfg(unix)]
    let inode = std::os::unix::fs::MetadataExt::ino(meta);
    #[cfg(not(unix))]
    let inode = 0;
    (
        meta.modified().unwrap_or(SystemTime::UNIX_EPOCH),
        meta.len(),
        inode,
    )
}

/// An error when `path` is a symbolic link: the relay writes the file through
/// a file beside it and a rename, which would put a file of its own where the
/// link was, so it never writes through one.
pub fn plain_file(path: &Path) -> io::Result<()> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.file_type().is_symlink() => Err(io::Error::new(
            ErrorKind::InvalidInput,
            format!(
                "{} is a symbolic link; the relay writes this file, so it must be the file itself",
                path.display()
            ),
        )),
        _ => Ok(()),
    }
}

/// The lines of `held` that are not in force: in force are the lines no
/// invite made, and each line `invited` says one in force invited. So a line
/// whose inviter's line is gone is not, nor any it invited, nor lines that
/// invited each other in a ring.
fn orphans(held: &HashSet<[u8; 32]>, invited: &HashMap<[u8; 32], [u8; 32]>) -> HashSet<[u8; 32]> {
    let mut live: HashSet<[u8; 32]> = held
        .iter()
        .filter(|hash| !invited.contains_key(*hash))
        .copied()
        .collect();
    loop {
        let more: Vec<[u8; 32]> = held
            .iter()
            .filter(|hash| {
                !live.contains(*hash) && invited.get(*hash).is_some_and(|by| live.contains(by))
            })
            .copied()
            .collect();
        if more.is_empty() {
            break;
        }
        live.extend(more);
    }
    held.difference(&live).copied().collect()
}

/// The SHA-256 a line of the file starts with, if it is one.
fn line_hash(line: &str) -> Option<[u8; 32]> {
    let line = line.trim();
    if line.starts_with('#') {
        return None;
    }
    line.split_whitespace().next().and_then(hash_of)
}

/// The name on a line of the file, after the SHA-256, if it has one.
fn line_name(line: &str) -> Option<&str> {
    line_hash(line)?;
    line.split_whitespace()
        .nth(1)
        .filter(|name| !name.starts_with('#'))
}

fn hash_of(hex: &str) -> Option<[u8; 32]> {
    if hex.len() != 64 || !hex.is_ascii() {
        return None;
    }
    let mut hash = [0u8; 32];
    for (i, byte) in hash.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[2 * i..2 * i + 2], 16).ok()?;
    }
    Some(hash)
}

pub fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// A line as the log names it: the first 12 hex digits of its token's
/// SHA-256, which start the line in the file, never the name after it, so
/// the log holds no one's name (`grep ^<these> <file>` finds the line).
pub fn short(line: &[u8; 32]) -> String {
    to_hex(&line[..6])
}

/// A new token for a phone, and its line for the file, with `name` after it.
pub fn new_token(name: &str) -> (String, String) {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    let token = to_hex(&bytes);
    let hash = to_hex(&Sha256::digest(token.as_bytes()));
    let name: String = name.split_whitespace().collect::<Vec<_>>().join("-");
    let line = if name.is_empty() {
        hash
    } else {
        format!("{hash} {name}")
    };
    (token, line)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    struct TempPath(PathBuf);

    impl TempPath {
        fn new(name: &str) -> TempPath {
            let mut bytes = [0u8; 8];
            rand::rngs::OsRng.fill_bytes(&mut bytes);
            TempPath(std::env::temp_dir().join(format!("erevos-tokens-{name}-{}", to_hex(&bytes))))
        }
    }

    impl Drop for TempPath {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.0);
        }
    }

    // Writes the file and makes sure it reads as changed, even within one
    // tick of the clock.
    fn write(path: &PathBuf, text: &str, n: u64) {
        fs::write(path, text).unwrap();
        let file = fs::File::options().write(true).open(path).unwrap();
        file.set_modified(SystemTime::UNIX_EPOCH + Duration::from_secs(1_000_000 + n))
            .unwrap();
    }

    #[test]
    fn a_phone_with_a_token_on_the_list_comes_in_until_its_line_goes() {
        let path = TempPath::new("list");
        let tokens = Tokens::new(path.0.clone());
        let (pixel, pixel_line) = new_token("Nekten's Pixel");
        let (other, other_line) = new_token("");
        assert_eq!(pixel.len(), 64);
        assert!(pixel_line.ends_with(" Nekten's-Pixel"));
        assert!(!other_line.contains(' '));
        // No file yet: no phone's token.
        assert!(!tokens.has(&pixel));
        write(
            &path.0,
            &format!("# phones\n\n{pixel_line}\n{other_line}\nnot a hash\n"),
            1,
        );
        assert!(tokens.has(&pixel));
        assert!(tokens.has(&other));
        assert_eq!(tokens.count(), 2);
        // A token is not its hash, nor another's.
        assert!(!tokens.has(pixel_line.split(' ').next().unwrap()));
        assert!(!tokens.has(&new_token("").0));
        // The Pixel's line taken out: its token is refused, the other's still taken.
        write(&path.0, &format!("{other_line}\n"), 2);
        assert!(!tokens.has(&pixel));
        assert!(tokens.has(&other));
        // The file gone: none.
        fs::remove_file(&path.0).unwrap();
        assert!(!tokens.has(&other));
    }

    #[test]
    fn the_relay_adds_and_takes_out_lines_keeping_the_rest() {
        let path = TempPath::new("written");
        let tokens = Tokens::new(path.0.clone());
        let (pixel, pixel_line) = new_token("pixel");
        let operator = format!("# Nekten's phones\n\n{pixel_line}\n  # an old one\nnot a hash\n");
        write(&path.0, &operator, 1);
        let maria: [u8; 32] = Sha256::digest(b"maria's token").into();
        let anna: [u8; 32] = Sha256::digest(b"anna's token").into();
        assert_eq!(
            tokens
                .add(
                    &maria,
                    "maria",
                    true,
                    "invited by pixel on 2026-10-21",
                    None,
                    None
                )
                .unwrap(),
            "maria"
        );
        assert_eq!(
            tokens
                .add(&anna, "PIXEL", true, "invited by pixel", None, None)
                .unwrap(),
            "PIXEL-2"
        );
        let text = fs::read_to_string(&path.0).unwrap();
        assert_eq!(
            text,
            format!(
                "{operator}{} maria # invited by pixel on 2026-10-21\n{} PIXEL-2 # invited by pixel\n",
                to_hex(&maria),
                to_hex(&anna)
            )
        );
        assert!(tokens.has("maria's token") && tokens.has(&pixel));
        assert_eq!(tokens.name_of(&maria).as_deref(), Some("maria"));
        assert_eq!(
            tokens.find(&pixel).map(|p| p.name),
            Some("pixel".to_string())
        );
        // Taken out: only that line goes.
        assert!(tokens.remove(&maria).unwrap());
        assert!(!tokens.remove(&maria).unwrap());
        assert!(!tokens.has("maria's token") && tokens.has("anna's token"));
        assert_eq!(
            fs::read_to_string(&path.0).unwrap(),
            format!("{operator}{} PIXEL-2 # invited by pixel\n", to_hex(&anna))
        );
        // Not unique, and in place of another line, in one write.
        let again: [u8; 32] = Sha256::digest(b"anna's new token").into();
        assert_eq!(
            tokens
                .add(&again, "PIXEL-2", false, "again", Some(&anna), None)
                .unwrap(),
            "PIXEL-2"
        );
        assert!(!tokens.has("anna's token") && tokens.has("anna's new token"));
        // A file that is not there yet is made.
        fs::remove_file(&path.0).unwrap();
        tokens
            .add(&maria, "maria", true, "new", None, None)
            .unwrap();
        assert!(tokens.has("maria's token"));
        assert_eq!(tokens.count(), 1);
    }

    #[test]
    fn a_line_an_invite_made_goes_with_its_inviter_and_what_it_invited_with_it() {
        let path = TempPath::new("invited");
        let tokens = Tokens::new(path.0.clone());
        let line = |token: &str| -> [u8; 32] { Sha256::digest(token.as_bytes()).into() };
        let (pixel, maria, anna, other) =
            (line("pixel"), line("maria"), line("anna"), line("other"));
        write(
            &path.0,
            &format!(
                "# phones\n{} pixel\n{} maria # invited by pixel\n{} anna # invited by maria\n{} other\n",
                to_hex(&pixel),
                to_hex(&maria),
                to_hex(&anna),
                to_hex(&other)
            ),
            1,
        );
        tokens.set_invited(HashMap::from([(maria, pixel), (anna, maria)]));
        assert!(tokens.has("pixel") && tokens.has("maria") && tokens.has("anna"));
        // The operator deletes Pixel's line by hand: Maria's goes with it, and Anna's with hers.
        write(
            &path.0,
            &format!(
                "# phones\n{} maria # invited by pixel\n{} anna # invited by maria\n{} other\n",
                to_hex(&maria),
                to_hex(&anna),
                to_hex(&other)
            ),
            2,
        );
        assert!(!tokens.has("maria") && !tokens.has("anna"));
        assert!(tokens.has("other"));
        assert!(tokens.in_file(&maria) && !tokens.gone(&maria));
        assert!(
            fs::read_to_string(&path.0)
                .unwrap()
                .contains(&to_hex(&maria)),
            "reading the file never writes it"
        );
        // The hourly look writes it again without them.
        tokens.prune();
        assert_eq!(
            fs::read_to_string(&path.0).unwrap(),
            format!("# phones\n{} other\n", to_hex(&other)),
        );
        assert!(tokens.gone(&maria) && !tokens.gone(&other));
        // Taken out by the relay, as the provider's check does: what it invited goes in the same call.
        let (signed, invitee) = (line("signed in"), line("invitee"));
        tokens
            .add(&signed, "lphl:x", true, "signed in", None, None)
            .unwrap();
        tokens
            .add(
                &invitee,
                "y",
                true,
                "invited by lphl:x",
                None,
                Some(&signed),
            )
            .unwrap();
        assert!(tokens.has("invitee"));
        assert!(tokens.remove(&signed).unwrap());
        assert!(!tokens.has("invitee"));
        assert!(!fs::read_to_string(&path.0)
            .unwrap()
            .contains(&to_hex(&invitee)));
        // A line replaced for the same phone keeps what it invited.
        let (again, newer) = (line("signed in again"), line("newer"));
        tokens
            .add(&signed, "lphl:x", true, "signed in", None, None)
            .unwrap();
        tokens
            .add(
                &invitee,
                "y",
                true,
                "invited by lphl:x",
                None,
                Some(&signed),
            )
            .unwrap();
        tokens
            .add(
                &again,
                "lphl:x",
                false,
                "signed in again",
                Some(&signed),
                None,
            )
            .unwrap();
        assert!(!tokens.has("signed in") && tokens.has("signed in again") && tokens.has("invitee"));
        tokens
            .add(&newer, "lphl:x", false, "and again", Some(&again), None)
            .unwrap();
        assert!(tokens.has("invitee"));
        tokens.remove(&newer).unwrap();
        assert!(!tokens.has("invitee"));
        // Lines that invited each other, with no line of the operator's above them, are not in force.
        write(
            &path.0,
            &format!(
                "{} a\n{} b\n{} other\n",
                to_hex(&line("a")),
                to_hex(&line("b")),
                to_hex(&other)
            ),
            3,
        );
        tokens.set_invited(HashMap::from([
            (line("a"), line("b")),
            (line("b"), line("a")),
        ]));
        assert!(!tokens.has("a") && !tokens.has("b") && tokens.has("other"));
        assert_eq!(tokens.count(), 1);
    }

    #[test]
    fn a_line_for_a_token_already_there_is_refused_and_nothing_is_written() {
        let path = TempPath::new("twice");
        let tokens = Tokens::new(path.0.clone());
        let maria: [u8; 32] = Sha256::digest(b"maria").into();
        tokens
            .add(&maria, "maria", true, "first", None, None)
            .unwrap();
        let before = fs::read_to_string(&path.0).unwrap();
        let e = tokens
            .add(&maria, "someone", true, "again", None, None)
            .unwrap_err();
        assert_eq!(e.kind(), ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(&path.0).unwrap(), before);
    }

    #[cfg(unix)]
    #[test]
    fn a_file_of_tokens_that_is_a_link_is_never_written() {
        let path = TempPath::new("target");
        let link = TempPath::new("link");
        let pixel: [u8; 32] = Sha256::digest(b"pixel").into();
        let maria: [u8; 32] = Sha256::digest(b"maria").into();
        write(
            &path.0,
            &format!("{} pixel\n{} maria\n", to_hex(&pixel), to_hex(&maria)),
            1,
        );
        std::os::unix::fs::symlink(&path.0, &link.0).unwrap();
        let e = plain_file(&link.0).unwrap_err();
        assert!(e.to_string().contains("symbolic link"), "{e}");
        assert!(plain_file(&path.0).is_ok());
        assert!(plain_file(&path.0.with_extension("none")).is_ok());
        let tokens = Tokens::new(link.0.clone());
        assert!(tokens.has("pixel"));
        let e = tokens
            .add(
                &Sha256::digest(b"anna").into(),
                "anna",
                true,
                "new",
                None,
                None,
            )
            .unwrap_err();
        assert_eq!(e.kind(), ErrorKind::InvalidInput);
        // A line taken out cannot be written out through the link, but is refused all the same.
        assert!(tokens.remove(&pixel).is_err());
        assert!(!tokens.has("pixel"));
        // So is a line that went with its inviter.
        tokens.set_invited(HashMap::from([(maria, [9; 32])]));
        assert!(!tokens.has("maria"));
        tokens.prune();
        assert!(!tokens.has("pixel") && !tokens.has("maria"));
        assert!(fs::symlink_metadata(&link.0)
            .unwrap()
            .file_type()
            .is_symlink());
        let text = fs::read_to_string(&path.0).unwrap();
        assert!(text.contains(&to_hex(&pixel)) && text.contains(&to_hex(&maria)));
        // The file itself in the link's place: the next look writes both out.
        fs::remove_file(&link.0).unwrap();
        fs::rename(&path.0, &link.0).unwrap();
        tokens.prune();
        assert_eq!(fs::read_to_string(&link.0).unwrap(), "\n");
        assert!(!tokens.has("pixel") && !tokens.has("maria"));
    }

    #[test]
    fn a_save_read_halfway_loses_no_line_and_a_file_changed_since_it_was_read_is_not_written() {
        let path = TempPath::new("halfway");
        let tokens = Tokens::new(path.0.clone());
        let line = |token: &str| -> [u8; 32] { Sha256::digest(token.as_bytes()).into() };
        let (pixel, maria, other) = (line("pixel"), line("maria"), line("other"));
        let first = format!("# phones\n{} maria # invited by pixel\n", to_hex(&maria));
        let rest = format!("{} pixel\n{} other\n", to_hex(&pixel), to_hex(&other));
        write(&path.0, &format!("{first}{rest}"), 1);
        tokens.set_invited(HashMap::from([(maria, pixel)]));
        assert!(tokens.has("maria") && tokens.has("pixel"));
        // The operator saves the file in place (nano, cat >), and the relay reads it halfway through.
        fs::write(&path.0, &first).unwrap();
        assert!(!tokens.has("maria") && !tokens.has("pixel"));
        assert!(
            !tokens.gone(&pixel),
            "a file just changed may be halfway saved"
        );
        tokens.prune();
        assert_eq!(
            fs::read_to_string(&path.0).unwrap(),
            first,
            "nothing written"
        );
        // The rest comes: every line is there, and in force again.
        let mut file = fs::File::options().append(true).open(&path.0).unwrap();
        std::io::Write::write_all(&mut file, rest.as_bytes()).unwrap();
        drop(file);
        assert!(tokens.has("maria") && tokens.has("pixel") && tokens.has("other"));
        tokens.prune();
        assert_eq!(
            fs::read_to_string(&path.0).unwrap(),
            format!("{first}{rest}")
        );
        // A write from a read the file changed since is refused, and leaves the file as it is.
        let (text, stamp) = tokens.read_now().unwrap();
        let more = format!("{first}{rest}{} anna\n", to_hex(&line("anna")));
        fs::write(&path.0, &more).unwrap();
        let lines: Vec<String> = text.lines().map(str::to_string).collect();
        let mut seen = lock(&tokens.seen, TOKENS_LOCK);
        let e = tokens
            .write(&mut seen, &lines, &HashMap::new(), stamp)
            .unwrap_err();
        assert_eq!(e.kind(), ErrorKind::Interrupted);
        drop(seen);
        assert_eq!(fs::read_to_string(&path.0).unwrap(), more);
        assert!(!path.0.with_extension("tmp").exists());
        // The relay's own changes read the file again and keep that line.
        tokens.remove(&other).unwrap();
        assert!(tokens.has("anna") && !tokens.has("other"));
        // A line missing from a file left as it is for a minute is gone; from a file not there, never.
        write(&path.0, &first, 2);
        assert!(tokens.gone(&pixel) && !tokens.gone(&maria));
        write(&path.0, "# nothing\n", 3);
        assert!(tokens.gone(&pixel) && tokens.lines_in_file() == 0);
        fs::remove_file(&path.0).unwrap();
        assert!(!tokens.gone(&pixel));
    }
}
