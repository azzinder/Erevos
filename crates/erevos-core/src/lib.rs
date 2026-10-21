//! Erevos core: protocol, crypto and storage shared by every app.
//!
//! Not audited. Do not rely on it to protect anyone yet.

pub mod conversation;
pub mod frame;
pub mod keep;
pub mod mesh;
pub mod padding;
pub mod pqxdh;
pub mod ratchet;
pub mod relay_seal;
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

/// Checks an Ed25519 signature (strictly, so no other bytes pass for the same
/// one) by the 32-byte public key `key` over `message`: what the app checks a
/// release's signed statements with (app/lib/update-signature.ts).
pub fn verify_signature(key: &[u8], message: &[u8], signature: &[u8]) -> Result<(), Error> {
    let key = <[u8; 32]>::try_from(key).map_err(|_| Error::Malformed)?;
    let signature = <[u8; 64]>::try_from(signature).map_err(|_| Error::Malformed)?;
    let key = ed25519_dalek::VerifyingKey::from_bytes(&key).map_err(|_| Error::Malformed)?;
    key.verify_strict(message, &ed25519_dalek::Signature::from_bytes(&signature))
        .map_err(|_| Error::BadSignature)
}
