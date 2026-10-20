//! Places lent on this relay to phones that have no relay of their own.
//!
//! A phone with the relay's token asks for a ticket (`LEND`) and puts it in
//! its contact link. A phone with no relay that adds that contact gives the
//! ticket where a token goes and asks for a place (`BORROW`): a queue, and a
//! token of its own for it from then on (a lent token). With a lent token a
//! phone uses its queue as one with the relay's token does, with less
//! allowed: it cannot have the relay connect anywhere (`FORWARD`, `FILE_VIA`,
//! `LATER`), take credentials for the call relay, or lend on. It sends to
//! contacts on other relays straight to their `/sealed` path and takes their
//! files from their `/files` path. Each lent token may make `MAX_QUEUES` more
//! queues and put `MAX_FILE_BYTES` of files a day.
//!
//! Neither tickets nor lent tokens are written down: each carries a code, an
//! HMAC-SHA256 cut to 16 bytes, keyed with a secret drawn from the relay's key
//! (`EREVOS_RELAY_KEY`). So they last across restarts, and a new key takes
//! them all back. A ticket lasts `TICKET_DAYS` and gives at most `MAX_BORROWS`
//! places. What each has used is counted in memory only: a restart starts the
//! counts again.
//!
//! Their text, which goes where a token goes:
//! - a ticket: `ticket.` and, in hex, when it expires (8 bytes, Unix
//!   seconds), a random nonce (16 bytes) and the code (16 bytes);
//! - a lent token: `lent.` and, in hex, a random nonce (16 bytes) and the code
//!   (16 bytes).

use std::collections::HashMap;
use std::sync::Mutex;

use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;

use erevos_core::relay_seal::RelayKey;

pub type Nonce = [u8; 16];

/// How long a ticket lasts, days.
pub const TICKET_DAYS: u64 = 30;
/// Places one ticket gives.
pub const MAX_BORROWS: u32 = 4;
/// Queues a lent token may make a day, besides the one it came with.
pub const MAX_QUEUES: u32 = 4;
/// Bytes of files a lent token may put a day.
pub const MAX_FILE_BYTES: u64 = 1 << 30;
/// Most tickets, and most lent tokens, counted at once, so the counts cannot
/// fill the relay's memory. Past it, new ones are refused until old ones go.
const MAX_COUNTED: usize = 100_000;
const DAY: u64 = 24 * 60 * 60;
const TICKET: &str = "ticket.";
const LENT: &str = "lent.";
const CODE_LEN: usize = 16;
// What a code is for, so a ticket's cannot serve as a lent token's.
const FOR_TICKET: u8 = 1;
const FOR_LENT: u8 = 2;

/// What a ticket or a lent token lets a connection do.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Pass {
    /// A ticket that expires at `expires` (Unix seconds): `BORROW` only.
    Ticket { nonce: Nonce, expires: u64 },
    /// A lent token.
    Lent(Nonce),
}

#[derive(Default)]
struct Counts {
    /// Places each ticket gave, with when it expires.
    borrowed: HashMap<Nonce, (u64, u32)>,
    /// The day `made` counts (days since 1970).
    day: u64,
    /// Queues made and bytes of files put that day, by lent token.
    made: HashMap<Nonce, (u32, u64)>,
}

pub struct Lend {
    secret: [u8; 32],
    counts: Mutex<Counts>,
}

impl Lend {
    /// Lending keyed with a secret drawn from the relay's key.
    pub fn new(key: &RelayKey) -> Lend {
        let mut mac = Hmac::<Sha256>::new_from_slice(&key.to_secret_bytes()).expect("any length");
        mac.update(b"erevos-relay lending");
        Lend {
            secret: mac.finalize().into_bytes().into(),
            counts: Mutex::default(),
        }
    }

    fn counts(&self) -> std::sync::MutexGuard<'_, Counts> {
        self.counts.lock().expect("counts lock")
    }

    fn code(&self, kind: u8, fields: &[u8]) -> [u8; CODE_LEN] {
        let mut mac = Hmac::<Sha256>::new_from_slice(&self.secret).expect("any length");
        mac.update(&[kind]);
        mac.update(fields);
        let mut code = [0u8; CODE_LEN];
        code.copy_from_slice(&mac.finalize().into_bytes()[..CODE_LEN]);
        code
    }

    /// A new ticket, lasting `TICKET_DAYS` from `now` (Unix seconds).
    pub fn ticket(&self, now: u64) -> String {
        let mut fields = Vec::with_capacity(8 + 16);
        fields.extend_from_slice(&(now + TICKET_DAYS * DAY).to_be_bytes());
        fields.extend_from_slice(&random_nonce());
        let code = self.code(FOR_TICKET, &fields);
        format!("{TICKET}{}{}", hex(&fields), hex(&code))
    }

    fn lent_token(&self) -> String {
        let nonce = random_nonce();
        let code = self.code(FOR_LENT, &nonce);
        format!("{LENT}{}{}", hex(&nonce), hex(&code))
    }

    /// What `token` lets do: a ticket made here that has not expired at
    /// `now`, or a lent token made here. `None` for anything else.
    pub fn check(&self, token: &str, now: u64) -> Option<Pass> {
        if let Some(rest) = token.strip_prefix(TICKET) {
            let bytes = unhex(rest)?;
            if bytes.len() != 8 + 16 + CODE_LEN {
                return None;
            }
            let (fields, code) = bytes.split_at(8 + 16);
            if !same(code, &self.code(FOR_TICKET, fields)) {
                return None;
            }
            let expires = u64::from_be_bytes(fields[..8].try_into().expect("8 bytes"));
            let nonce = fields[8..].try_into().expect("16 bytes");
            return (expires > now).then_some(Pass::Ticket { nonce, expires });
        }
        let bytes = unhex(token.strip_prefix(LENT)?)?;
        if bytes.len() != 16 + CODE_LEN {
            return None;
        }
        let (nonce, code) = bytes.split_at(16);
        same(code, &self.code(FOR_LENT, nonce))
            .then(|| Pass::Lent(nonce.try_into().expect("16 bytes")))
    }

    /// One place on the ticket `nonce`, which expires at `expires`: the lent
    /// token for it, or `None` when the ticket gave all its places.
    pub fn borrow(&self, nonce: Nonce, expires: u64, now: u64) -> Option<String> {
        {
            let mut counts = self.counts();
            counts.borrowed.retain(|_, (until, _)| *until > now);
            if !counts.borrowed.contains_key(&nonce) && counts.borrowed.len() >= MAX_COUNTED {
                return None;
            }
            let (_, given) = counts.borrowed.entry(nonce).or_insert((expires, 0));
            if *given >= MAX_BORROWS {
                return None;
            }
            *given += 1;
        }
        Some(self.lent_token())
    }

    /// Whether the lent token `nonce` may make one more queue today, counted
    /// if so.
    pub fn may_create(&self, nonce: Nonce, now: u64) -> bool {
        self.count(nonce, now, 1, 0)
    }

    /// Whether the lent token `nonce` may put `bytes` more of files today,
    /// counted if so.
    pub fn may_put(&self, nonce: Nonce, now: u64, bytes: u64) -> bool {
        self.count(nonce, now, 0, bytes)
    }

    fn count(&self, nonce: Nonce, now: u64, queues: u32, bytes: u64) -> bool {
        let mut counts = self.counts();
        let today = now / DAY;
        if counts.day != today {
            counts.day = today;
            counts.made.clear();
        }
        if !counts.made.contains_key(&nonce) && counts.made.len() >= MAX_COUNTED {
            return false;
        }
        let (made, put) = counts.made.entry(nonce).or_insert((0, 0));
        if *made + queues > MAX_QUEUES || *put + bytes > MAX_FILE_BYTES {
            return false;
        }
        *made += queues;
        *put += bytes;
        true
    }
}

fn random_nonce() -> Nonce {
    let mut nonce = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut nonce);
    nonce
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Lowercase hex only, as `hex` writes it.
fn unhex(text: &str) -> Option<Vec<u8>> {
    if !text.len().is_multiple_of(2)
        || !text
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return None;
    }
    (0..text.len())
        .step_by(2)
        .map(|at| u8::from_str_radix(&text[at..at + 2], 16).ok())
        .collect()
}

/// Compares without stopping at the first difference, so timing does not show
/// how much of a code matched.
fn same(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: u64 = 1_800_000_000;

    #[test]
    fn a_ticket_gives_its_places_until_it_expires() {
        let lend = Lend::new(&RelayKey::generate());
        let ticket = lend.ticket(NOW);
        assert!(ticket.starts_with("ticket.") && ticket.len() == 7 + 80);
        let Some(Pass::Ticket { nonce, expires }) = lend.check(&ticket, NOW) else {
            panic!("not a ticket");
        };
        assert_eq!(expires, NOW + TICKET_DAYS * DAY);
        assert_eq!(lend.check(&ticket, expires), None);
        let tokens: Vec<String> = (0..MAX_BORROWS)
            .map(|_| lend.borrow(nonce, expires, NOW).expect("a place"))
            .collect();
        assert_eq!(lend.borrow(nonce, expires, NOW), None);
        // Each place has its own token.
        for token in &tokens {
            assert!(token.starts_with("lent.") && token.len() == 5 + 64);
            assert!(matches!(lend.check(token, NOW), Some(Pass::Lent(_))));
        }
        assert_ne!(tokens[0], tokens[1]);
        // Another ticket gives its own.
        let Some(Pass::Ticket { nonce, expires }) = lend.check(&lend.ticket(NOW), NOW) else {
            panic!("not a ticket");
        };
        assert!(lend.borrow(nonce, expires, NOW).is_some());
    }

    #[test]
    fn only_what_this_relay_made_is_taken() {
        let lend = Lend::new(&RelayKey::generate());
        let other = Lend::new(&RelayKey::generate());
        let ticket = lend.ticket(NOW);
        let Some(Pass::Ticket { nonce, expires }) = lend.check(&ticket, NOW) else {
            panic!("not a ticket");
        };
        let token = lend.borrow(nonce, expires, NOW).unwrap();
        assert_eq!(other.check(&ticket, NOW), None);
        assert_eq!(other.check(&token, NOW), None);
        // Changed anywhere, or in capitals.
        let mut changed = ticket.clone().into_bytes();
        changed[10] = if changed[10] == b'0' { b'1' } else { b'0' };
        assert_eq!(
            lend.check(std::str::from_utf8(&changed).unwrap(), NOW),
            None
        );
        assert_eq!(
            lend.check(&token.to_uppercase().replace("LENT.", "lent."), NOW),
            None
        );
        // A ticket's code does not make a lent token, nor the other way.
        let code = &ticket[7 + 48..];
        let nonce_hex = &ticket[7 + 16..7 + 48];
        assert_eq!(lend.check(&format!("lent.{nonce_hex}{code}"), NOW), None);
        assert_eq!(lend.check("lent.", NOW), None);
        assert_eq!(lend.check("the relay's token", NOW), None);
        // The same key makes the same codes, as after a restart.
        let key = RelayKey::generate();
        let first = Lend::new(&RelayKey::from_secret_bytes(key.to_secret_bytes()));
        let again = Lend::new(&key);
        assert!(again.check(&first.ticket(NOW), NOW).is_some());
    }

    #[test]
    fn a_lent_token_makes_and_puts_so_much_a_day() {
        let lend = Lend::new(&RelayKey::generate());
        let nonce = [7u8; 16];
        for _ in 0..MAX_QUEUES {
            assert!(lend.may_create(nonce, NOW));
        }
        assert!(!lend.may_create(nonce, NOW));
        assert!(lend.may_put(nonce, NOW, MAX_FILE_BYTES - 10));
        assert!(!lend.may_put(nonce, NOW, 11));
        assert!(lend.may_put(nonce, NOW, 10));
        // Another lent token counts on its own.
        assert!(lend.may_create([8u8; 16], NOW));
        // The next day starts again.
        assert!(lend.may_create(nonce, NOW + DAY));
        assert!(lend.may_put(nonce, NOW + DAY, MAX_FILE_BYTES));
    }
}
