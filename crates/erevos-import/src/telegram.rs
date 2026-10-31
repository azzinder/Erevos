// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Telegram Desktop's "Export chat history" in machine-readable JSON
//! (`result.json`). A single chat export has the chat at the top level; a
//! full account export lists chats under `chats.list`.

use std::path::PathBuf;

use serde::Deserialize;
use serde_json::Value;

use crate::{Attachment, AttachmentKind, ImportError, ImportedChat, ImportedMessage, Source, Time};

#[derive(Deserialize)]
struct Export {
    chats: Option<ChatList>,
    #[serde(flatten)]
    single: Option<Chat>,
}

#[derive(Deserialize)]
struct ChatList {
    list: Vec<Chat>,
}

#[derive(Deserialize)]
struct Chat {
    name: Option<String>,
    messages: Vec<Message>,
}

#[derive(Deserialize)]
struct Message {
    id: Option<Value>,
    #[serde(rename = "type")]
    kind: Option<String>,
    date_unixtime: Option<String>,
    from: Option<String>,
    text: Option<Value>,
    reply_to_message_id: Option<Value>,
    edited: Option<String>,
    photo: Option<String>,
    file: Option<String>,
    media_type: Option<String>,
}

/// Reads `result.json`. Returns one chat per conversation in the export.
pub fn parse(json: &str) -> Result<Vec<ImportedChat>, ImportError> {
    let export: Export = serde_json::from_str(json)?;
    let chats = match (export.chats, export.single) {
        (Some(list), _) => list.list,
        (None, Some(chat)) => vec![chat],
        (None, None) => return Err(ImportError::Format("no chats in Telegram export".into())),
    };
    Ok(chats.into_iter().map(convert).collect())
}

fn convert(chat: Chat) -> ImportedChat {
    let mut skipped = 0;
    let mut messages = Vec::new();
    for m in chat.messages {
        // Service entries (joins, pins, calls) carry no text of their own.
        if m.kind.as_deref() != Some("message") {
            skipped += 1;
            continue;
        }
        let mut attachments = Vec::new();
        if let Some(p) = m.photo.filter(|p| is_file(p)) {
            attachments.push(Attachment { kind: AttachmentKind::Photo, path: PathBuf::from(p) });
        }
        if let Some(p) = m.file.filter(|p| is_file(p)) {
            let kind = match m.media_type.as_deref() {
                Some("voice_message") | Some("audio_file") => AttachmentKind::Voice,
                Some("video_file") | Some("video_message") | Some("animation") => AttachmentKind::Video,
                Some("sticker") => AttachmentKind::Sticker,
                _ => AttachmentKind::File,
            };
            attachments.push(Attachment { kind, path: PathBuf::from(p) });
        }
        messages.push(ImportedMessage {
            source_id: m.id.as_ref().map(id_string),
            sent_at: m.date_unixtime.and_then(|s| s.parse().ok()).map(Time::Unix),
            sender: m.from,
            text: m.text.as_ref().map(flatten_text).unwrap_or_default(),
            reply_to: m.reply_to_message_id.as_ref().map(id_string),
            edited: m.edited.is_some(),
            attachments,
        });
    }
    ImportedChat {
        source: Source::Telegram,
        title: chat.name.unwrap_or_default(),
        messages,
        skipped,
    }
}

/// Telegram leaves a placeholder instead of a path for media that was not
/// included in the export.
fn is_file(p: &str) -> bool {
    !p.starts_with("(File not included")
}

fn id_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

/// `text` is either a string or a list of strings and formatted pieces
/// (`{"type":"bold","text":"…"}`); formatting is dropped, the words kept.
fn flatten_text(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Array(parts) => parts
            .iter()
            .map(|p| match p {
                Value::String(s) => s.as_str(),
                Value::Object(o) => o.get("text").and_then(Value::as_str).unwrap_or(""),
                _ => "",
            })
            .collect(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SINGLE: &str = r#"{
      "name": "Μαρία",
      "type": "personal_chat",
      "id": 42,
      "messages": [
        {"id": 1, "type": "service", "date_unixtime": "1700000000", "action": "phone_call"},
        {"id": 2, "type": "message", "date_unixtime": "1700000010", "from": "Μαρία",
         "text": "Γεια σου!", "text_entities": []},
        {"id": 3, "type": "message", "date_unixtime": "1700000020", "from": "Nekten",
         "text": ["δες ", {"type": "bold", "text": "αυτό"}, " εδώ"],
         "reply_to_message_id": 2, "edited": "2023-11-14T22:15:00",
         "photo": "photos/photo_1@14-11-2023_22-13-40.jpg"},
        {"id": 4, "type": "message", "date_unixtime": "1700000030", "from": "Μαρία", "text": "",
         "file": "voice_messages/audio_1.ogg", "media_type": "voice_message"},
        {"id": 5, "type": "message", "date_unixtime": "1700000040", "from": "Μαρία", "text": "",
         "file": "(File not included. Change data exporting settings to download.)",
         "media_type": "video_file"}
      ]
    }"#;

    #[test]
    fn single_chat() {
        let chats = parse(SINGLE).unwrap();
        assert_eq!(chats.len(), 1);
        let c = &chats[0];
        assert_eq!(c.title, "Μαρία");
        assert_eq!(c.skipped, 1);
        assert_eq!(c.messages.len(), 4);

        assert_eq!(c.messages[0].text, "Γεια σου!");
        assert_eq!(c.messages[0].sent_at, Some(Time::Unix(1700000010)));

        let m = &c.messages[1];
        assert_eq!(m.text, "δες αυτό εδώ");
        assert_eq!(m.reply_to.as_deref(), Some("2"));
        assert!(m.edited);
        assert_eq!(m.attachments[0].kind, AttachmentKind::Photo);

        assert_eq!(c.messages[2].attachments[0].kind, AttachmentKind::Voice);
        assert!(c.messages[3].attachments.is_empty());
    }

    #[test]
    fn full_account_export() {
        let json = r#"{"about": "x", "chats": {"about": "y", "list": [
            {"name": "A", "messages": []},
            {"name": "B", "messages": [{"id": 1, "type": "message", "text": "hi"}]}
        ]}}"#;
        let chats = parse(json).unwrap();
        assert_eq!(chats.iter().map(|c| c.title.as_str()).collect::<Vec<_>>(), ["A", "B"]);
        assert_eq!(chats[1].messages[0].sent_at, None);
    }

    #[test]
    fn rejects_other_json() {
        assert!(matches!(parse(r#"{"foo": 1}"#), Err(ImportError::Format(_))));
        assert!(parse("not json").is_err());
    }
}
