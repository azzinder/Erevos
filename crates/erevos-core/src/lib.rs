//! Erevos core: protocol, crypto and storage shared by every app.
//!
//! Not audited. Do not rely on it to protect anyone yet.

pub mod mesh;
pub mod padding;
pub mod pqxdh;
pub mod ratchet;
pub mod wire;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("message failed to authenticate")]
    Crypto,
    #[error("malformed input")]
    Malformed,
    #[error("session cannot send yet")]
    NotReady,
    #[error("too many skipped messages")]
    TooManySkipped,
    #[error("sending chain exhausted")]
    ChainExhausted,
    #[error("message too large")]
    TooLarge,
    #[error("prekey bundle signature is invalid")]
    BadSignature,
    #[error("store is full")]
    Full,
    #[error("one-time prekey is unknown or already used")]
    UnknownPrekey,
}
