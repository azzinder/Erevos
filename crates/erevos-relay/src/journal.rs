//! Keeps the queue store on disk, so queues and waiting messages survive a
//! restart. The file is an append-only journal: a header, then one record per
//! change, written and synced before the change is applied in memory.
//!
//! - `CREATE`: recipient id, sender id. Written by relays from before queues
//!   expired; still read, as a queue last used now.
//! - `CREATE_AT`: recipient id, sender id, the day its recipient last used it
//!   (8-byte Unix seconds at the start of that day).
//! - `SEND`: recipient id, a 4-byte length, the message. Written by relays
//!   from before messages expired; still read, as a message that came now.
//! - `SEND_AT`: recipient id, the hour it came (8-byte Unix seconds), a
//!   4-byte length, the message.
//! - `RECEIVE`: recipient id. The oldest message of that queue was handed
//!   over, or expired.
//! - `DELETE`: recipient id. Deleted by its recipient, or expired unused.
//! - `USED`: recipient id, the day its recipient used it (8-byte Unix
//!   seconds at the start of that day). Written at most once a day a queue.
//!
//! A journal written by relays from before queues expired starts with
//! `OLD_HEADER`, and is still read. One written now starts with `HEADER`,
//! which those relays do not take as a journal: put back in place of this
//! one, an older relay stops at start with a line saying so, instead of
//! reading up to the first record it does not know and cutting the rest off
//! the file.
//!
//! Received messages and deleted queues stay in the file until it is
//! rewritten. That happens on every start and whenever such records outweigh
//! the live ones. The old file is replaced by rename, so its blocks are freed,
//! not wiped: keep the journal on an encrypted disk.
//!
//! Not audited.

use std::fs::{File, OpenOptions};
use std::io::{self, BufReader, BufWriter, ErrorKind, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

use crate::queue::QueueId;
use crate::server::MAX_MESSAGE;

/// The first bytes of a journal, so the relay never replays or overwrites a
/// file that is something else.
pub const HEADER: &[u8; 8] = b"EREVOSJ2";
/// The first bytes of a journal written by a relay from before queues
/// expired, which wrote neither `CREATE_AT` nor `USED`.
pub const OLD_HEADER: &[u8; 8] = b"EREVOSJ1";

const CREATE: u8 = 1;
const SEND: u8 = 2;
const RECEIVE: u8 = 3;
const DELETE: u8 = 4;
const SEND_AT: u8 = 5;
const CREATE_AT: u8 = 6;
const USED: u8 = 7;

/// Bytes written since the last check before the relay works out whether a
/// rewrite is worth it.
const CHECK_EVERY: u64 = 4 << 20;

pub enum Record<'a> {
    /// `used` is the day its recipient last used it, in Unix seconds at the
    /// start of that day; 0 when the record is from before relays kept that.
    Create {
        recipient_id: QueueId,
        sender_id: QueueId,
        used: u64,
    },
    /// `at` is when the message came, in Unix seconds; 0 when the record
    /// is from before relays kept that.
    Send {
        recipient_id: QueueId,
        at: u64,
        message: &'a [u8],
    },
    Receive {
        recipient_id: QueueId,
    },
    Delete {
        recipient_id: QueueId,
    },
    /// The queue's recipient used it on `day`, in Unix seconds at the start
    /// of that day.
    Used {
        recipient_id: QueueId,
        day: u64,
    },
}

impl Record<'_> {
    /// Bytes this record takes in the journal.
    pub fn len(&self) -> u64 {
        match self {
            Record::Create { used: 0, .. } => 1 + 24 + 24,
            Record::Create { .. } => 1 + 24 + 24 + 8,
            Record::Send { at: 0, message, .. } => 1 + 24 + 4 + message.len() as u64,
            Record::Send { message, .. } => 1 + 24 + 8 + 4 + message.len() as u64,
            Record::Receive { .. } | Record::Delete { .. } => 1 + 24,
            Record::Used { .. } => 1 + 24 + 8,
        }
    }

    fn encode(&self, out: &mut Vec<u8>) {
        match self {
            Record::Create {
                recipient_id,
                sender_id,
                used,
            } => {
                out.push(if *used == 0 { CREATE } else { CREATE_AT });
                out.extend_from_slice(recipient_id);
                out.extend_from_slice(sender_id);
                if *used != 0 {
                    out.extend_from_slice(&used.to_be_bytes());
                }
            }
            Record::Send {
                recipient_id,
                at,
                message,
            } => {
                if *at == 0 {
                    out.push(SEND);
                    out.extend_from_slice(recipient_id);
                } else {
                    out.push(SEND_AT);
                    out.extend_from_slice(recipient_id);
                    out.extend_from_slice(&at.to_be_bytes());
                }
                out.extend_from_slice(&(message.len() as u32).to_be_bytes());
                out.extend_from_slice(message);
            }
            Record::Receive { recipient_id } => {
                out.push(RECEIVE);
                out.extend_from_slice(recipient_id);
            }
            Record::Delete { recipient_id } => {
                out.push(DELETE);
                out.extend_from_slice(recipient_id);
            }
            Record::Used { recipient_id, day } => {
                out.push(USED);
                out.extend_from_slice(recipient_id);
                out.extend_from_slice(&day.to_be_bytes());
            }
        }
    }
}

/// Size of a journal that holds exactly `records`.
pub fn size<'a>(records: impl Iterator<Item = Record<'a>>) -> u64 {
    HEADER.len() as u64 + records.map(|r| r.len()).sum::<u64>()
}

pub struct Journal {
    file: File,
    path: PathBuf,
    len: u64,
    next_check: u64,
}

impl Journal {
    /// Writes a new journal holding `records` and puts it in place of the file
    /// at `path` in one rename, so a crash leaves either the old file or the
    /// new one.
    pub fn create<'a>(
        path: &Path,
        records: impl Iterator<Item = Record<'a>>,
    ) -> io::Result<Journal> {
        let mut tmp = path.as_os_str().to_owned();
        tmp.push(".tmp");
        let tmp = PathBuf::from(tmp);
        let mut out = BufWriter::new(private_file(&tmp)?);
        out.write_all(HEADER)?;
        let mut len = HEADER.len() as u64;
        let mut bytes = Vec::new();
        for record in records {
            bytes.clear();
            record.encode(&mut bytes);
            out.write_all(&bytes)?;
            len += bytes.len() as u64;
        }
        let file = out.into_inner().map_err(|e| e.into_error())?;
        file.sync_all()?;
        std::fs::rename(&tmp, path)?;
        sync_dir(path)?;
        Ok(Journal {
            file,
            path: path.to_path_buf(),
            len,
            next_check: len + CHECK_EVERY,
        })
    }

    /// Adds one record and syncs it to disk. On failure the file is cut back
    /// to where it was, so a half-written record never stays behind.
    pub fn append(&mut self, record: &Record) -> io::Result<()> {
        let mut bytes = Vec::with_capacity(record.len() as usize);
        record.encode(&mut bytes);
        let written = self
            .file
            .write_all(&bytes)
            .and_then(|()| self.file.sync_data());
        if let Err(e) = written {
            let _ = self.file.set_len(self.len);
            let _ = self.file.seek(SeekFrom::Start(self.len));
            return Err(e);
        }
        self.len += bytes.len() as u64;
        Ok(())
    }

    /// Whether enough has been written since the last check to look at
    /// rewriting the file.
    pub fn due(&self) -> bool {
        self.len >= self.next_check
    }

    /// Rewrites the file from `live` if most of it no longer matters, and
    /// schedules the next check either way.
    pub fn tidy<'a>(
        &mut self,
        live_len: u64,
        live: impl Iterator<Item = Record<'a>>,
    ) -> io::Result<()> {
        if self.len - live_len.min(self.len) > live_len {
            *self = Journal::create(&self.path, live)?;
        } else {
            self.next_check = self.len + CHECK_EVERY;
        }
        Ok(())
    }

    #[cfg(test)]
    pub fn len(&self) -> u64 {
        self.len
    }
}

/// Reads the journal at `path` and hands each record to `apply`, oldest first.
/// A missing or empty file is an empty journal. Returns how many bytes at the
/// end were skipped because they do not form a whole record, which is what a
/// write cut short by a crash leaves.
pub fn replay(path: &Path, mut apply: impl FnMut(Record)) -> io::Result<u64> {
    let file = match File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(0),
        Err(e) => return Err(e),
    };
    let total = file.metadata()?.len();
    if total == 0 {
        return Ok(0);
    }
    let mut r = BufReader::new(file);
    let mut header = [0u8; 8];
    if r.read_exact(&mut header).is_err() || (&header != HEADER && &header != OLD_HEADER) {
        return Err(io::Error::new(
            ErrorKind::InvalidData,
            format!("{} is not an erevos-relay journal", path.display()),
        ));
    }
    let mut at = HEADER.len() as u64;
    let mut message = Vec::new();
    loop {
        match read_record(&mut r, &mut message) {
            Ok(None) => return Ok(0),
            Ok(Some(record)) => {
                at += record.len();
                apply(record);
            }
            Err(e) if matches!(e.kind(), ErrorKind::UnexpectedEof | ErrorKind::InvalidData) => {
                return Ok(total - at)
            }
            Err(e) => return Err(e),
        }
    }
}

/// `Ok(None)` at a clean end of file. `UnexpectedEof` for a record cut short,
/// `InvalidData` for bytes that are not a record.
fn read_record<'a>(r: &mut impl Read, message: &'a mut Vec<u8>) -> io::Result<Option<Record<'a>>> {
    let mut tag = [0u8; 1];
    if r.read(&mut tag)? == 0 {
        return Ok(None);
    }
    let recipient_id = read_id(r)?;
    let record = match tag[0] {
        CREATE => Record::Create {
            recipient_id,
            sender_id: read_id(r)?,
            used: 0,
        },
        CREATE_AT => Record::Create {
            recipient_id,
            sender_id: read_id(r)?,
            used: read_day(r)?,
        },
        USED => Record::Used {
            recipient_id,
            day: read_day(r)?,
        },
        SEND | SEND_AT => {
            let at = if tag[0] == SEND_AT {
                let mut at = [0u8; 8];
                r.read_exact(&mut at)?;
                match u64::from_be_bytes(at) {
                    0 => return Err(ErrorKind::InvalidData.into()),
                    at => at,
                }
            } else {
                0
            };
            let mut len = [0u8; 4];
            r.read_exact(&mut len)?;
            let len = u32::from_be_bytes(len) as usize;
            if len > MAX_MESSAGE {
                return Err(ErrorKind::InvalidData.into());
            }
            message.resize(len, 0);
            r.read_exact(message)?;
            Record::Send {
                recipient_id,
                at,
                message,
            }
        }
        RECEIVE => Record::Receive { recipient_id },
        DELETE => Record::Delete { recipient_id },
        _ => return Err(ErrorKind::InvalidData.into()),
    };
    Ok(Some(record))
}

fn read_id(r: &mut impl Read) -> io::Result<QueueId> {
    let mut id = [0u8; 24];
    r.read_exact(&mut id)?;
    Ok(id)
}

/// A day a queue was used, which is never 0.
fn read_day(r: &mut impl Read) -> io::Result<u64> {
    let mut day = [0u8; 8];
    r.read_exact(&mut day)?;
    match u64::from_be_bytes(day) {
        0 => Err(ErrorKind::InvalidData.into()),
        day => Ok(day),
    }
}

/// Writes `bytes` as the whole of the file at `path`, as the journal is
/// rewritten: to a file beside it first, then put in its place in one rename,
/// so a crash leaves either the old file or the new one, never half of it.
/// Only the owner can read it.
pub fn write_whole(path: &Path, bytes: &[u8]) -> io::Result<()> {
    write_whole_then(path, bytes, |_| Ok(()))
}

/// As `write_whole`, with `ready` called on the new file once it is written,
/// just before it takes the old one's place: an error from it leaves the old
/// file as it was.
pub fn write_whole_then(
    path: &Path,
    bytes: &[u8],
    ready: impl FnOnce(&File) -> io::Result<()>,
) -> io::Result<()> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    let mut file = private_file(&tmp)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    if let Err(e) = ready(&file) {
        let _ = std::fs::remove_file(&tmp);
        return Err(e);
    }
    std::fs::rename(&tmp, path)?;
    sync_dir(path)
}

/// Creates a new file only its owner can read.
///
/// A file or link left at `path` is removed first and the new one is made
/// with `create_new`, which never follows a link: run as root (`free-line`),
/// a link someone left there cannot have root write over the file it points to.
fn private_file(path: &Path) -> io::Result<File> {
    match std::fs::remove_file(path) {
        Ok(()) => {}
        Err(e) if e.kind() == ErrorKind::NotFound => {}
        Err(e) => return Err(e),
    }
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
    options.open(path)
}

/// Makes the rename itself durable.
fn sync_dir(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        let dir = match path.parent() {
            Some(dir) if !dir.as_os_str().is_empty() => dir,
            _ => Path::new("."),
        };
        File::open(dir)?.sync_all()?;
    }
    #[cfg(not(unix))]
    let _ = path;
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    #[test]
    fn a_link_left_where_the_new_file_goes_is_never_written_through() {
        let dir = std::env::temp_dir().join(format!("erevos-journal-link-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let other = dir.join("someone-elses");
        std::fs::write(&other, b"keep me").unwrap();
        let path = dir.join("phones.tokens.invites");
        let mut tmp = path.as_os_str().to_owned();
        tmp.push(".tmp");
        std::os::unix::fs::symlink(&other, PathBuf::from(tmp)).unwrap();
        write_whole(&path, b"new").unwrap();
        assert_eq!(std::fs::read(&other).unwrap(), b"keep me");
        assert_eq!(std::fs::read(&path).unwrap(), b"new");
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
