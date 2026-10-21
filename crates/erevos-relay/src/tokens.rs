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

use std::collections::HashSet;
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;

use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::lock::lock;

const TOKENS_LOCK: &str = "lock of the phones' tokens";

pub struct Tokens {
    path: PathBuf,
    seen: Mutex<Seen>,
}

#[derive(Default)]
struct Seen {
    /// When the file was last changed and how long it was, as last read;
    /// `None` when it was not there.
    stamp: Option<(SystemTime, u64)>,
    /// Whether it was read at all yet.
    read: bool,
    /// Whether the relay already said it cannot read the file, so it says so
    /// once until the file can be read again, not on every connection.
    complained: bool,
    hashes: HashSet<[u8; 32]>,
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
    pub fn has(&self, token: &str) -> bool {
        let hash: [u8; 32] = Sha256::digest(token.as_bytes()).into();
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes.contains(&hash)
    }

    /// How many tokens the file holds now, reading it if it changed.
    pub fn count(&self) -> usize {
        let mut seen = lock(&self.seen, TOKENS_LOCK);
        self.refresh(&mut seen);
        seen.hashes.len()
    }

    fn refresh(&self, seen: &mut Seen) {
        let stamp = match fs::metadata(&self.path) {
            Ok(meta) => Some((
                meta.modified().unwrap_or(SystemTime::UNIX_EPOCH),
                meta.len(),
            )),
            Err(e) if e.kind() == ErrorKind::NotFound => None,
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
        seen.hashes.clear();
        for (n, line) in text.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            match line.split_whitespace().next().and_then(hash_of) {
                Some(hash) => {
                    seen.hashes.insert(hash);
                }
                None => eprintln!(
                    "erevos-relay: line {} of {} does not start with a token's SHA-256 (64 hex characters), left out",
                    n + 1,
                    self.path.display()
                ),
            }
        }
        eprintln!(
            "erevos-relay: {} phones' tokens in {}",
            seen.hashes.len(),
            self.path.display()
        );
        seen.stamp = stamp;
        seen.read = true;
        seen.complained = false;
    }
}

impl Seen {
    fn complain(&mut self, what: &str) {
        if !self.complained {
            eprintln!("erevos-relay: {what}");
            self.complained = true;
        }
    }
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

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
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
}
