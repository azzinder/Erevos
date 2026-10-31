// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! WhatsApp's "Export chat": a text file, one message per line, each
//! starting with its date and time. Android writes
//! `17/10/2026, 22:41 - Μαρία: γεια`, an iPhone `[17/10/2026, 22:41:05] Μαρία: γεια`.
//! The date order and the clock follow the phone's language, so the order is
//! worked out from the whole file. A line without a date continues the
//! message before it. Lines without a sender are WhatsApp's own notices.
//!
//! The times carry no time zone: they are the clock on the exporting phone.

use std::path::PathBuf;

use crate::{Attachment, AttachmentKind, ImportError, ImportedChat, ImportedMessage, Source, Time};

/// Reads the text of an export. `name` is its file name, which holds the
/// chat's name on Android.
pub fn parse(name: &str, text: &str) -> Result<ImportedChat, ImportError> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut lines: Vec<(Header, String)> = Vec::new();
    let mut before_first = 0;
    for line in text.lines() {
        match header(line) {
            Some((header, rest)) => lines.push((header, rest.to_string())),
            None => match lines.last_mut() {
                Some((_, rest)) => {
                    rest.push('\n');
                    rest.push_str(line);
                }
                None if line.trim().is_empty() => {}
                None => before_first += 1,
            },
        }
    }
    if lines.is_empty() || before_first > 0 {
        return Err(ImportError::Format("not a WhatsApp export".into()));
    }
    let order = Order::of(lines.iter().map(|(h, _)| h.date));

    let mut skipped = 0;
    let mut messages = Vec::new();
    for (header, rest) in lines {
        let Some((sender, text)) = split_sender(&rest) else {
            skipped += 1;
            continue;
        };
        let (text, attachments) = attachment(text);
        messages.push(ImportedMessage {
            source_id: None,
            sent_at: order.local_time(&header),
            sender: Some(sender.to_string()),
            text,
            reply_to: None,
            edited: false,
            attachments,
        });
    }
    Ok(ImportedChat { source: Source::WhatsApp, title: title(name, &messages), messages, skipped })
}

#[derive(Clone, Copy)]
struct Header {
    date: [u32; 3],
    hour: u32,
    minute: u32,
    second: u32,
    /// Some(false) before noon, Some(true) after, None on a 24-hour clock.
    pm: Option<bool>,
}

/// The header of a line that starts a message, and what follows it.
fn header(line: &str) -> Option<(Header, &str)> {
    let line = line.trim_start_matches(['\u{200e}', '\u{200f}', '\u{202a}', '\u{202b}', '\u{202c}']);
    let (bracket, mut s) = match line.strip_prefix('[') {
        Some(rest) => (true, rest),
        None => (false, line),
    };
    let mut date = [0u32; 3];
    for (i, part) in date.iter_mut().enumerate() {
        let (n, rest) = number(s, 1, 4)?;
        *part = n;
        s = rest;
        if i < 2 {
            s = s.strip_prefix(['/', '.', '-'])?;
        }
    }
    s = s.strip_prefix('.').unwrap_or(s);
    s = s.strip_prefix(',').unwrap_or(s);
    s = s.trim_start_matches([' ', '\u{a0}', '\u{202f}']);
    let (hour, rest) = number(s, 1, 2)?;
    let (minute, rest) = number(rest.strip_prefix(':')?, 2, 2)?;
    s = rest;
    let mut second = 0;
    if let Some(rest) = s.strip_prefix(':') {
        let (n, rest) = number(rest, 2, 2)?;
        second = n;
        s = rest;
    }
    let mut pm = None;
    let spaced = s.trim_start_matches([' ', '\u{a0}', '\u{202f}']);
    for (mark, after) in [
        ("AM", false),
        ("PM", true),
        ("am", false),
        ("pm", true),
        ("a.m.", false),
        ("p.m.", true),
        ("π.μ.", false),
        ("μ.μ.", true),
        ("πμ", false),
        ("μμ", true),
    ] {
        if let Some(rest) = spaced.strip_prefix(mark) {
            pm = Some(after);
            s = rest;
            break;
        }
    }
    let rest = if bracket {
        s.strip_prefix(']')?.strip_prefix(' ')?
    } else {
        s.strip_prefix(" - ").or_else(|| s.strip_prefix(" – "))?
    };
    if hour > 23 || minute > 59 || second > 59 || (pm.is_some() && !(1..=12).contains(&hour)) {
        return None;
    }
    Some((Header { date, hour, minute, second, pm }, rest))
}

/// A number of `min` to `max` digits at the start of `s`.
fn number(s: &str, min: usize, max: usize) -> Option<(u32, &str)> {
    let digits = s.bytes().take_while(u8::is_ascii_digit).count();
    if digits < min || digits > max {
        return None;
    }
    Some((s[..digits].parse().ok()?, &s[digits..]))
}

/// Which of a date's three numbers is the day, the month and the year.
enum Order {
    DayMonthYear,
    MonthDayYear,
    YearMonthDay,
}

impl Order {
    fn of(dates: impl Iterator<Item = [u32; 3]>) -> Order {
        let mut month_first = false;
        for [a, b, _] in dates {
            if a > 31 {
                return Order::YearMonthDay;
            }
            if a > 12 {
                return Order::DayMonthYear;
            }
            if b > 12 {
                month_first = true;
            }
        }
        // Without a day above 12 to tell, the order most of the world uses.
        if month_first {
            Order::MonthDayYear
        } else {
            Order::DayMonthYear
        }
    }

    fn local_time(&self, h: &Header) -> Option<Time> {
        let [a, b, c] = h.date;
        let (year, month, day) = match self {
            Order::DayMonthYear => (c, b, a),
            Order::MonthDayYear => (c, a, b),
            Order::YearMonthDay => (a, b, c),
        };
        let year = if year < 100 { 2000 + year } else { year };
        if !(1..=12).contains(&month) || day == 0 || day > 31 {
            return None;
        }
        let hour = match h.pm {
            None => h.hour,
            Some(false) => h.hour % 12,
            Some(true) => h.hour % 12 + 12,
        };
        let days = days_from_civil(year as i64, month as i64, day as i64);
        Some(Time::Local(days * 86_400 + (hour * 3600 + h.minute * 60 + h.second) as i64))
    }
}

/// Days since 1970-01-01 of a date in the proleptic Gregorian calendar
/// (Howard Hinnant's algorithm).
pub(crate) fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * ((month + 9) % 12) + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// `Name: text`, or None for WhatsApp's own notices, which have no sender.
fn split_sender(rest: &str) -> Option<(&str, &str)> {
    let (sender, text) = rest.split_once(": ")?;
    let sender = sender.trim_matches(['\u{200e}', '\u{200f}', '\u{202a}', '\u{202c}']);
    if sender.is_empty() || sender.chars().count() > 60 || sender.contains('\n') {
        return None;
    }
    Some((sender, text))
}

/// A message that only names an attached file: its media, without the name.
fn attachment(text: &str) -> (String, Vec<Attachment>) {
    let plain = text.trim_matches(['\u{200e}', '\u{200f}']);
    let file = plain
        .strip_prefix("<attached: ")
        .and_then(|s| s.strip_suffix('>'))
        .or_else(|| plain.strip_suffix(" (file attached)"));
    match file {
        Some(file) if !file.contains('\n') => {
            let file = file.trim();
            let kind = kind_of(file);
            (String::new(), vec![Attachment { kind, path: PathBuf::from(file) }])
        }
        _ => (text.to_string(), Vec::new()),
    }
}

fn kind_of(file: &str) -> AttachmentKind {
    let upper = file.to_uppercase();
    let has = |s: &str| upper.contains(s);
    if has("STICKER") || upper.starts_with("STK-") {
        AttachmentKind::Sticker
    } else if has("PTT-") || has("AUDIO") || upper.starts_with("AUD-") || upper.ends_with(".OPUS") {
        AttachmentKind::Voice
    } else if has("PHOTO")
        || upper.starts_with("IMG-")
        || [".JPG", ".JPEG", ".PNG", ".WEBP"].iter().any(|e| upper.ends_with(e))
    {
        AttachmentKind::Photo
    } else if has("VIDEO") || upper.starts_with("VID-") || upper.ends_with(".MP4") {
        AttachmentKind::Video
    } else {
        AttachmentKind::File
    }
}

/// The chat's name from Android's file name, or else the people in it.
fn title(name: &str, messages: &[ImportedMessage]) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name);
    let base = base.strip_suffix(".txt").or_else(|| base.strip_suffix(".zip")).unwrap_or(base);
    for prefix in ["WhatsApp Chat with ", "WhatsApp Chat - ", "Συνομιλία WhatsApp με ", "WhatsApp-Chat mit "]
    {
        if let Some(rest) = base.strip_prefix(prefix) {
            if !rest.trim().is_empty() {
                return rest.trim().to_string();
            }
        }
    }
    let mut people: Vec<&str> = Vec::new();
    for sender in messages.iter().filter_map(|m| m.sender.as_deref()) {
        if !people.contains(&sender) {
            people.push(sender);
        }
    }
    people.truncate(3);
    people.join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    const ANDROID: &str = "\u{feff}17/10/2026, 09:05 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
17/10/2026, 09:06 - Μαρία: Καλημέρα!
Τι κάνεις;
17/10/2026, 22:41 - Nekten: IMG-20261017-WA0001.jpg (file attached)
3/11/2026, 07:00 - Nekten: <Media omitted>
3/11/2026, 07:01 - Μαρία: ώρα: 7";

    #[test]
    fn android_export() {
        let chat = parse("WhatsApp Chat with Μαρία.txt", ANDROID).unwrap();
        assert_eq!(chat.title, "Μαρία");
        assert_eq!(chat.skipped, 1);
        let m = &chat.messages;
        assert_eq!(m.len(), 4);
        assert_eq!(m[0].text, "Καλημέρα!\nΤι κάνεις;");
        assert_eq!(m[0].sender.as_deref(), Some("Μαρία"));
        // 2026-10-17 09:06 on the exporting phone's clock.
        assert_eq!(m[0].sent_at, Some(Time::Local(1_792_227_960)));
        assert_eq!(m[1].attachments[0].kind, AttachmentKind::Photo);
        assert_eq!(m[1].text, "");
        assert_eq!(m[2].text, "<Media omitted>");
        assert_eq!(m[3].text, "ώρα: 7");
        assert_eq!(m[3].sent_at, Some(Time::Local(days_from_civil(2026, 11, 3) * 86_400 + 7 * 3600 + 60)));
    }

    #[test]
    fn iphone_export_with_a_twelve_hour_clock_and_the_month_first() {
        let text = "[10/17/26, 9:06:05\u{202f}PM] Μαρία: hello
\u{200e}[10/17/26, 9:07:00\u{202f}PM] Nekten: \u{200e}<attached: 00000012-PHOTO-2026-10-17-21-07-00.jpg>
[10/18/26, 12:00:00 AM] Nekten: midnight";
        let chat = parse("_chat.txt", text).unwrap();
        assert_eq!(chat.title, "Μαρία, Nekten");
        let m = &chat.messages;
        let day = days_from_civil(2026, 10, 17) * 86_400;
        assert_eq!(m[0].sent_at, Some(Time::Local(day + 21 * 3600 + 6 * 60 + 5)));
        assert_eq!(m[1].attachments[0].path, PathBuf::from("00000012-PHOTO-2026-10-17-21-07-00.jpg"));
        assert_eq!(m[2].sent_at, Some(Time::Local(day + 86_400)));
    }

    #[test]
    fn greek_and_german_dates() {
        let greek = "17/10/26, 9:06 μ.μ. - Μαρία: γεια\n18/10/26, 12:30 π.μ. - Μαρία: αργά";
        let m = parse("x.txt", greek).unwrap().messages;
        let day = days_from_civil(2026, 10, 17) * 86_400;
        assert_eq!(m[0].sent_at, Some(Time::Local(day + 21 * 3600 + 6 * 60)));
        assert_eq!(m[1].sent_at, Some(Time::Local(day + 86_400 + 30 * 60)));
        let german = "17.10.26, 21:06 - Anna: Hallo";
        assert_eq!(parse("WhatsApp-Chat mit Anna.txt", german).unwrap().title, "Anna");
    }

    #[test]
    fn refuses_other_text() {
        assert!(parse("notes.txt", "just some notes\n17/10/2026, 09:06 - Μαρία: hi").is_err());
        assert!(parse("empty.txt", "").is_err());
        assert!(parse("x.txt", "99/99/2026, 25:06 - Μαρία: hi").is_err());
    }

    #[test]
    fn days_since_1970() {
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        assert_eq!(days_from_civil(2000, 3, 1), 11_017);
        assert_eq!(days_from_civil(2024, 2, 29), 19_782);
    }
}
