// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Framing for byte links. A frame is a 4-byte big-endian length followed by
//! the payload. The reader takes bytes in any split, so one implementation
//! serves a stream socket and a radio link that only carries small writes.
//!
//! Frames carry encoded packets (see `wire`). A reader that sees a length
//! above `MAX_FRAME` returns an error, and the caller must drop the link.
//!
//! Not audited.

use crate::Error;

/// Largest payload: an encoded packet with a full 16 KiB body.
pub const MAX_FRAME: usize = 16 * 1024 + 64;

/// Wraps `payload` in a frame.
pub fn encode(payload: &[u8]) -> Result<Vec<u8>, Error> {
    if payload.len() > MAX_FRAME {
        return Err(Error::TooLarge);
    }
    let mut out = Vec::with_capacity(4 + payload.len());
    out.extend_from_slice(&(payload.len() as u32).to_be_bytes());
    out.extend_from_slice(payload);
    Ok(out)
}

/// Splits an encoded frame into writes of at most `mtu` bytes.
pub fn chunks(frame: &[u8], mtu: usize) -> impl Iterator<Item = &[u8]> {
    frame.chunks(mtu.max(1))
}

/// Collects bytes from a link and yields each complete payload.
#[derive(Default)]
pub struct Reader {
    buf: Vec<u8>,
}

impl Reader {
    /// Adds bytes from the link and returns every payload they complete.
    pub fn push(&mut self, bytes: &[u8]) -> Result<Vec<Vec<u8>>, Error> {
        self.buf.extend_from_slice(bytes);
        let mut out = Vec::new();
        while self.buf.len() >= 4 {
            let len = u32::from_be_bytes(self.buf[..4].try_into().map_err(|_| Error::Malformed)?) as usize;
            if len > MAX_FRAME {
                return Err(Error::TooLarge);
            }
            if self.buf.len() < 4 + len {
                break;
            }
            out.push(self.buf[4..4 + len].to_vec());
            self.buf.drain(..4 + len);
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mesh::Packet;

    #[test]
    fn whole_frame_in_one_push() {
        let frame = encode(b"hello").unwrap();
        let mut r = Reader::default();
        assert_eq!(r.push(&frame).unwrap(), vec![b"hello".to_vec()]);
    }

    #[test]
    fn byte_by_byte_and_several_frames_in_one_push() {
        let mut stream = encode(b"one").unwrap();
        stream.extend(encode(b"").unwrap());
        stream.extend(encode(b"three").unwrap());
        let mut r = Reader::default();
        let mut got = Vec::new();
        for b in &stream {
            got.extend(r.push(&[*b]).unwrap());
        }
        assert_eq!(got, vec![b"one".to_vec(), Vec::new(), b"three".to_vec()]);
    }

    #[test]
    fn oversized_frames_are_refused() {
        assert!(matches!(encode(&vec![0; MAX_FRAME + 1]), Err(Error::TooLarge)));
        let mut r = Reader::default();
        let bad = ((MAX_FRAME as u32) + 1).to_be_bytes();
        assert!(matches!(r.push(&bad), Err(Error::TooLarge)));
    }

    #[test]
    fn packet_survives_small_radio_writes() {
        let packet = Packet::new([5; 16], b"over the air").unwrap();
        let frame = encode(&packet.to_bytes()).unwrap();
        let mut r = Reader::default();
        let mut payloads = Vec::new();
        for piece in chunks(&frame, 20) {
            payloads.extend(r.push(piece).unwrap());
        }
        assert_eq!(payloads.len(), 1);
        assert_eq!(Packet::from_bytes(&payloads[0]).unwrap(), packet);
    }
}
