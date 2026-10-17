//! Reads chat history exported from other messengers into one model.
//!
//! Everything runs on the device. Imported messages are kept locally,
//! marked as imported, and never sent anywhere: Erevos cannot prove who
//! wrote them.

pub mod telegram;
pub mod whatsapp;
mod zip;

use std::path::PathBuf;

/// Reads an export the user picked: Telegram's `result.json`, WhatsApp's
/// text file, or either in a zip. `name` is the file's name.
pub fn read(name: &str, data: &[u8]) -> Result<Vec<ImportedChat>, ImportError> {
    if zip::is_zip(data) {
        let names = zip::names(data)?;
        let inside = |wanted: &dyn Fn(&str) -> bool| names.iter().find(|n| wanted(n.rsplit('/').next().unwrap_or(n)));
        if let Some(json) = inside(&|n| n == "result.json") {
            return read_text(json, &zip::read(data, json)?);
        }
        if let Some(text) = inside(&|n| n == "_chat.txt").or_else(|| inside(&|n| n.ends_with(".txt"))) {
            // An iPhone names the text `_chat.txt`; the zip's own name holds the chat's.
            let text = zip::read(data, text)?;
            return Ok(vec![whatsapp::parse(name, &utf8(&text)?)?]);
        }
        return Err(unknown());
    }
    read_text(name, data)
}

fn read_text(name: &str, data: &[u8]) -> Result<Vec<ImportedChat>, ImportError> {
    let text = utf8(data)?;
    if text.trim_start_matches('\u{feff}').trim_start().starts_with('{') {
        return telegram::parse(text.trim_start_matches('\u{feff}'));
    }
    whatsapp::parse(name, &text).map(|chat| vec![chat]).map_err(|_| unknown())
}

fn utf8(data: &[u8]) -> Result<String, ImportError> {
    String::from_utf8(data.to_vec()).map_err(|_| unknown())
}

fn unknown() -> ImportError {
    ImportError::Format(
        "Erevos reads Telegram's JSON export (result.json) and WhatsApp's exported chat (.txt or .zip)".into(),
    )
}

/// One conversation from another app.
#[derive(Debug, Clone, PartialEq)]
pub struct ImportedChat {
    pub source: Source,
    pub title: String,
    pub messages: Vec<ImportedMessage>,
    /// Entries that were read but could not be turned into messages, so the
    /// app can say what was left out.
    pub skipped: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    Telegram,
    Viber,
    WhatsApp,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ImportedMessage {
    /// The message's id in the source app, for replies.
    pub source_id: Option<String>,
    /// When it was sent, when the source says.
    pub sent_at: Option<Time>,
    /// The sender's name as the source app showed it.
    pub sender: Option<String>,
    pub text: String,
    pub reply_to: Option<String>,
    pub edited: bool,
    /// Media files, relative to the export folder.
    pub attachments: Vec<Attachment>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Time {
    /// Seconds since the Unix epoch.
    Unix(i64),
    /// The clock on the exporting phone, with no time zone, counted as
    /// seconds since 1970-01-01 00:00 on that clock.
    Local(i64),
}

#[derive(Debug, Clone, PartialEq)]
pub struct Attachment {
    pub kind: AttachmentKind,
    pub path: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttachmentKind {
    Photo,
    Video,
    Voice,
    Sticker,
    File,
}

#[derive(Debug, thiserror::Error)]
pub enum ImportError {
    #[error("not a recognised export: {0}")]
    Format(String),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_each_kind_of_file() {
        let json = br#"{"name": "A", "messages": [{"id": 1, "type": "message", "text": "hi"}]}"#;
        assert_eq!(read("result.json", json).unwrap()[0].source, Source::Telegram);

        let text = "17/10/2026, 09:06 - Μαρία: γεια";
        let chats = read("WhatsApp Chat with Μαρία.txt", text.as_bytes()).unwrap();
        assert_eq!((chats[0].source, chats[0].title.as_str()), (Source::WhatsApp, "Μαρία"));

        let zipped = zip::tests::zip(&[("_chat.txt", text.as_bytes()), ("IMG-1.jpg", b"jpeg")]);
        let chats = read("WhatsApp Chat - Μαρία.zip", &zipped).unwrap();
        assert_eq!(chats[0].title, "Μαρία");
        assert_eq!(chats[0].messages[0].text, "γεια");

        let telegram = zip::tests::zip(&[("Export/result.json", json)]);
        assert_eq!(read("export.zip", &telegram).unwrap()[0].title, "A");
    }

    #[test]
    fn says_what_it_reads_when_it_cannot() {
        for (name, data) in [("a.html", &b"<html></html>"[..]), ("b.bin", &[0xff, 0xfe, 0][..])] {
            let error = read(name, data).unwrap_err().to_string();
            assert!(error.contains("result.json"), "{error}");
        }
        assert!(read("c.zip", &zip::tests::zip(&[("photo.jpg", b"x")])).is_err());
    }
}
