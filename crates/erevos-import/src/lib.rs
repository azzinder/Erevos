//! Reads chat history exported from other messengers into one model.
//!
//! Everything runs on the device. Imported messages are kept locally,
//! marked as imported, and never sent anywhere: Erevos cannot prove who
//! wrote them.

pub mod telegram;

use std::path::PathBuf;

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
    /// Seconds since the Unix epoch, when the source gives one.
    pub sent_at: Option<i64>,
    /// The sender's name as the source app showed it.
    pub sender: Option<String>,
    pub text: String,
    pub reply_to: Option<String>,
    pub edited: bool,
    /// Media files, relative to the export folder.
    pub attachments: Vec<Attachment>,
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
