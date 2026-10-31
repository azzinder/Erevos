// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Just enough of the zip format to take one file out of an export: the
//! central directory, and entries stored as they are or deflated. Zip64,
//! encryption and other methods are refused.

use crate::ImportError;

const END: u32 = 0x0605_4b50;
const CENTRAL: u32 = 0x0201_4b50;
const LOCAL: u32 = 0x0403_4b50;

/// What a file taken out may grow to, so a small zip cannot fill the phone.
pub const MAX_SIZE: usize = 256 * 1024 * 1024;

pub fn is_zip(data: &[u8]) -> bool {
    data.len() >= 4 && u32le(data, 0) == Some(LOCAL)
}

/// The names of the files in the zip, in its order.
pub fn names(data: &[u8]) -> Result<Vec<String>, ImportError> {
    Ok(entries(data)?.into_iter().map(|e| e.name).collect())
}

/// The file called `name`, uncompressed.
pub fn read(data: &[u8], name: &str) -> Result<Vec<u8>, ImportError> {
    let entry =
        entries(data)?.into_iter().find(|e| e.name == name).ok_or_else(|| bad("a file is missing from the zip"))?;
    let at = entry.offset;
    if u32le(data, at) != Some(LOCAL) {
        return Err(bad("a damaged zip"));
    }
    let name_len = u16le(data, at + 26).ok_or_else(|| bad("a damaged zip"))? as usize;
    let extra_len = u16le(data, at + 28).ok_or_else(|| bad("a damaged zip"))? as usize;
    let start = at + 30 + name_len + extra_len;
    // Sizes come from the file: added with care, as a 32-bit phone could overflow.
    let end = start.checked_add(entry.compressed).ok_or_else(|| bad("a damaged zip"))?;
    let body = data.get(start..end).ok_or_else(|| bad("a damaged zip"))?;
    if entry.size > MAX_SIZE {
        return Err(bad("a file in the zip is too large"));
    }
    match entry.method {
        0 => Ok(body.to_vec()),
        8 => miniz_oxide::inflate::decompress_to_vec_with_limit(body, MAX_SIZE).map_err(|_| bad("a damaged zip")),
        _ => Err(bad("a zip packed in a way Erevos cannot read")),
    }
}

struct Entry {
    name: String,
    method: u16,
    compressed: usize,
    size: usize,
    offset: usize,
}

fn entries(data: &[u8]) -> Result<Vec<Entry>, ImportError> {
    // The end record is the last thing in the file, before a comment of at most 64 KB.
    let lowest = data.len().saturating_sub(22 + 0xffff);
    let end = (lowest..=data.len().saturating_sub(22))
        .rev()
        .find(|&at| u32le(data, at) == Some(END))
        .ok_or_else(|| bad("a damaged zip"))?;
    let count = u16le(data, end + 10).ok_or_else(|| bad("a damaged zip"))? as usize;
    let mut at = u32le(data, end + 16).ok_or_else(|| bad("a damaged zip"))? as usize;
    let mut out = Vec::with_capacity(count);
    for _ in 0..count {
        if u32le(data, at) != Some(CENTRAL) {
            return Err(bad("a damaged zip"));
        }
        let field = |offset: usize| u16le(data, at + offset).ok_or_else(|| bad("a damaged zip"));
        let word = |offset: usize| u32le(data, at + offset).ok_or_else(|| bad("a damaged zip"));
        let flags = field(8)?;
        let method = field(10)?;
        let compressed = word(20)?;
        let size = word(24)?;
        let name_len = field(28)? as usize;
        let extra_len = field(30)? as usize;
        let comment_len = field(32)? as usize;
        let offset = word(42)?;
        if flags & 1 != 0 {
            return Err(bad("an encrypted zip"));
        }
        if compressed == u32::MAX || size == u32::MAX || offset == u32::MAX {
            return Err(bad("a zip too large for Erevos"));
        }
        let name = data.get(at + 46..at + 46 + name_len).ok_or_else(|| bad("a damaged zip"))?;
        out.push(Entry {
            name: String::from_utf8_lossy(name).into_owned(),
            method,
            compressed: compressed as usize,
            size: size as usize,
            offset: offset as usize,
        });
        at += 46 + name_len + extra_len + comment_len;
    }
    Ok(out)
}

fn bad(what: &str) -> ImportError {
    ImportError::Format(what.to_string())
}

fn u16le(data: &[u8], at: usize) -> Option<u16> {
    data.get(at..at + 2).map(|b| u16::from_le_bytes([b[0], b[1]]))
}

fn u32le(data: &[u8], at: usize) -> Option<u32> {
    data.get(at..at + 4).map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    /// A zip holding `files`, deflated, as the tests need one.
    pub fn zip(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut out = Vec::new();
        let mut central = Vec::new();
        for (name, body) in files {
            let packed = miniz_oxide::deflate::compress_to_vec(body, 6);
            let offset = out.len() as u32;
            let header = |sig: u32, central: bool| {
                let mut h = Vec::new();
                h.extend(sig.to_le_bytes());
                if central {
                    h.extend(20u16.to_le_bytes());
                }
                h.extend(20u16.to_le_bytes());
                h.extend(0u16.to_le_bytes());
                h.extend(8u16.to_le_bytes());
                h.extend([0u8; 8]);
                h.extend((packed.len() as u32).to_le_bytes());
                h.extend((body.len() as u32).to_le_bytes());
                h.extend((name.len() as u16).to_le_bytes());
                h.extend(0u16.to_le_bytes());
                if central {
                    h.extend([0u8; 10]);
                    h.extend(offset.to_le_bytes());
                }
                h.extend(name.as_bytes());
                h
            };
            out.extend(header(LOCAL, false));
            out.extend(&packed);
            central.extend(header(CENTRAL, true));
        }
        let start = out.len() as u32;
        out.extend(&central);
        out.extend(END.to_le_bytes());
        out.extend([0u8; 4]);
        out.extend((files.len() as u16).to_le_bytes());
        out.extend((files.len() as u16).to_le_bytes());
        out.extend((central.len() as u32).to_le_bytes());
        out.extend(start.to_le_bytes());
        out.extend(0u16.to_le_bytes());
        out
    }

    #[test]
    fn takes_a_file_out() {
        let data = zip(&[("a.jpg", b"not text"), ("_chat.txt", "γεια σου ".repeat(100).as_bytes())]);
        assert!(is_zip(&data));
        assert_eq!(names(&data).unwrap(), ["a.jpg", "_chat.txt"]);
        assert_eq!(read(&data, "_chat.txt").unwrap(), "γεια σου ".repeat(100).as_bytes());
        assert!(read(&data, "missing").is_err());
    }

    #[test]
    fn refuses_damaged_zips() {
        let data = zip(&[("_chat.txt", b"hello")]);
        assert!(names(&data[..data.len() - 5]).is_err());
        assert!(!is_zip(b"hello"));
        let mut cut = data.clone();
        cut.truncate(20);
        assert!(names(&cut).is_err());
    }
}
