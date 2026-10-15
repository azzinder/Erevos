//! Pads every plaintext to a fixed bucket size before encryption, so relays
//! and observers only ever see a few message lengths.
//!
//! Padding is ISO/IEC 7816-4: a 0x80 marker, then zeros.

use crate::Error;

/// Bucket sizes in bytes. A message goes in the smallest bucket that holds
/// it plus the marker byte.
pub const BUCKETS: [usize; 4] = [256, 1024, 4096, 16384];

pub fn pad(msg: &[u8]) -> Result<Vec<u8>, Error> {
    let size = BUCKETS
        .iter()
        .copied()
        .find(|b| msg.len() < *b)
        .ok_or(Error::TooLarge)?;
    let mut out = Vec::with_capacity(size);
    out.extend_from_slice(msg);
    out.push(0x80);
    out.resize(size, 0);
    Ok(out)
}

pub fn unpad(padded: &[u8]) -> Result<&[u8], Error> {
    if !BUCKETS.contains(&padded.len()) {
        return Err(Error::Malformed);
    }
    let end = padded.iter().rposition(|b| *b != 0).ok_or(Error::Malformed)?;
    if padded[end] != 0x80 {
        return Err(Error::Malformed);
    }
    Ok(&padded[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_and_sizes() {
        for len in [0, 1, 255, 256, 1023, 4000, 16383] {
            let msg = vec![0u8; len];
            let p = pad(&msg).unwrap();
            assert!(BUCKETS.contains(&p.len()));
            assert_eq!(unpad(&p).unwrap(), &msg[..]);
        }
        assert_eq!(pad(&[1; 255]).unwrap().len(), 256);
        assert_eq!(pad(&[1; 256]).unwrap().len(), 1024);
    }

    #[test]
    fn rejects_bad_input() {
        assert!(matches!(pad(&[0; 16384]), Err(Error::TooLarge)));
        assert!(unpad(&[0; 256]).is_err());
        assert!(unpad(&[0x80; 100]).is_err());
        let mut p = pad(b"hi").unwrap();
        p[2] = 0x81;
        assert!(unpad(&p).is_err());
    }
}
