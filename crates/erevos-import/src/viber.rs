// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! A Viber chat saved by "Backup Text for Viber" (Viber itself exports no
//! chats): one HTML file per chat, text only. Its table has a row for each
//! day, `<div class="bubble date">2018-07-13</div>`, and then one for each
//! of that day's messages: `<div class="bubble out">` the owner's, with no
//! name, and `<div class="bubble in">` the other person's, starting with
//! their name and `: `. Each ends with `<br/><span class="time">22:41:05</span>`.
//! Emoticons are images whose `alt` is Viber's code, `(smiley)`: they become
//! emoji, never fetched.
//!
//! The times carry no time zone: they are the clock on the phone that saved
//! the chat. A day before Viber existed is a phone with a wrong clock, so its
//! messages have no time.

use std::collections::HashMap;

use crate::whatsapp::days_from_civil;
use crate::{ImportError, ImportedChat, ImportedMessage, Source, Time};

const BUBBLE: &str = "<div class=\"bubble ";
/// Viber came out in December 2010.
const FIRST_YEAR: u32 = 2010;

/// Whether the text is such a file.
pub fn is_viber(text: &str) -> bool {
    let text = text.trim_start_matches('\u{feff}').trim_start();
    text.starts_with('<') && text.contains(BUBBLE) && text.contains("bubble date")
}

/// Reads the HTML of a saved chat. `name` is its file name, the chat's
/// name when no message has the other person's.
pub fn parse(name: &str, text: &str) -> Result<ImportedChat, ImportError> {
    if !is_viber(text) {
        return Err(ImportError::Format("not a Viber backup".into()));
    }
    let mut day: Option<i64> = None;
    let mut skipped = 0;
    let mut messages = Vec::new();
    let mut rest = text;
    while let Some(start) = rest.find(BUBBLE) {
        rest = &rest[start + BUBBLE.len()..];
        let Some((kind, after)) = rest.split_once("\">") else {
            break;
        };
        let end = after.find("</div>").unwrap_or(after.len());
        let inner = &after[..end];
        rest = &after[end..];
        match kind {
            "date" => day = date(&plain(inner)),
            "out" | "in" => {
                let (body, time) = match inner.rfind("<span class=\"time\">") {
                    Some(at) => (&inner[..at], clock(&plain(&inner[at..]))),
                    None => (inner, None),
                };
                let body = body.trim_end();
                let body = body.strip_suffix("<br/>").or_else(|| body.strip_suffix("<br>")).unwrap_or(body);
                let words = plain(body);
                let (sender, words) = match kind {
                    "in" => match words.split_once(": ") {
                        Some((sender, words)) if !sender.trim().is_empty() => {
                            (Some(sender.trim().to_string()), words.to_string())
                        }
                        _ => (None, words),
                    },
                    // The owner's have no name; one that merely starts with "word: " keeps it.
                    _ => (None, words),
                };
                if words.trim().is_empty() {
                    skipped += 1;
                    continue;
                }
                let sent_at = match (day, time) {
                    (Some(day), Some(seconds)) => Some(Time::Local(day * 86_400 + seconds)),
                    _ => None,
                };
                messages.push((
                    kind == "in",
                    ImportedMessage {
                        source_id: None,
                        sent_at,
                        sender,
                        text: words,
                        reply_to: None,
                        edited: false,
                        attachments: Vec::new(),
                    },
                ));
            }
            _ => skipped += 1,
        }
    }
    // An incoming message without a name is still the other person's.
    let mut names: HashMap<&str, usize> = HashMap::new();
    for (_, m) in &messages {
        if let Some(sender) = m.sender.as_deref() {
            *names.entry(sender).or_default() += 1;
        }
    }
    let other = names.into_iter().max_by(|a, b| a.1.cmp(&b.1).then(b.0.cmp(a.0))).map(|(n, _)| n.to_string());
    let messages: Vec<ImportedMessage> = messages
        .into_iter()
        .map(|(incoming, mut m)| {
            if incoming && m.sender.is_none() {
                m.sender = other.clone();
            }
            m
        })
        .collect();
    let title = other.clone().unwrap_or_else(|| title(name));
    Ok(ImportedChat { source: Source::Viber, title, messages, skipped })
}

/// The chat's name from the file's: `Viber` when it says nothing.
fn title(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name);
    let base = base.strip_suffix(".html").or_else(|| base.strip_suffix(".htm")).unwrap_or(base).trim();
    if base.is_empty() {
        "Viber".into()
    } else {
        base.into()
    }
}

/// Days since 1970 of `2018-07-13`, or None for no date or one before Viber.
fn date(text: &str) -> Option<i64> {
    let mut parts = text.trim().splitn(3, '-').map(|p| p.parse::<u32>().ok());
    let (year, month, day) = (parts.next()??, parts.next()??, parts.next()??);
    if year < FIRST_YEAR || !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    Some(days_from_civil(year as i64, month as i64, day as i64))
}

/// Seconds into the day of `22:41:05` or `22:41`.
fn clock(text: &str) -> Option<i64> {
    let parts: Vec<i64> = text.trim().split(':').map(|p| p.parse().ok()).collect::<Option<_>>()?;
    let (hour, minute, second) = match parts[..] {
        [h, m] => (h, m, 0),
        [h, m, s] => (h, m, s),
        _ => return None,
    };
    if !(0..24).contains(&hour) || !(0..60).contains(&minute) || !(0..60).contains(&second) {
        return None;
    }
    Some(hour * 3600 + minute * 60 + second)
}

/// The words of a piece of the file: a line break for `<br/>`, an emoji for
/// an emoticon, no other tags, and its entities read.
fn plain(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(open) = rest.find('<') {
        out.push_str(&entities(&rest[..open]));
        let Some(close) = rest[open..].find('>') else {
            out.push_str(&entities(&rest[open..]));
            return out;
        };
        let tag = &rest[open + 1..open + close];
        let tag_name = tag.trim_start_matches('/').split([' ', '/']).next().unwrap_or("").to_ascii_lowercase();
        match tag_name.as_str() {
            "br" => out.push('\n'),
            "img" => {
                if let Some(alt) = attribute(tag, "alt") {
                    let alt = entities(alt);
                    out.push_str(emoji(&alt).unwrap_or(&alt));
                }
            }
            _ => {}
        }
        rest = &rest[open + close + 1..];
    }
    out.push_str(&entities(rest));
    out
}

fn attribute<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let at = tag.find(&format!(" {name}=\""))? + name.len() + 3;
    let len = tag[at..].find('"')?;
    Some(&tag[at..at + len])
}

fn entities(text: &str) -> String {
    if !text.contains('&') {
        return text.to_string();
    }
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(amp) = rest.find('&') {
        out.push_str(&rest[..amp]);
        rest = &rest[amp..];
        let name = rest[1..].find(';').filter(|&end| end <= 10).map(|end| &rest[1..end + 1]);
        let read = name.and_then(|name| match name {
            "amp" => Some('&'),
            "lt" => Some('<'),
            "gt" => Some('>'),
            "quot" => Some('"'),
            "apos" => Some('\''),
            "nbsp" => Some('\u{a0}'),
            _ => {
                let number = name.strip_prefix('#')?;
                let code = match number.strip_prefix(['x', 'X']) {
                    Some(hex) => u32::from_str_radix(hex, 16).ok()?,
                    None => number.parse().ok()?,
                };
                char::from_u32(code)
            }
        });
        match (name, read) {
            (Some(name), Some(c)) => {
                out.push(c);
                rest = &rest[name.len() + 2..];
            }
            _ => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// The emoji for one of Viber's emoticons, `(smiley)`.
fn emoji(alt: &str) -> Option<&'static str> {
    let code = alt.strip_prefix('(')?.strip_suffix(')')?;
    Some(match code.to_ascii_lowercase().as_str() {
        "smiley" => "🙂",
        "sad" => "😞",
        "wink" => "😉",
        "angry" => "😠",
        "inlove" => "😍",
        "yummi" => "😋",
        "laugh" => "😆",
        "surprised" => "😮",
        "moa" | "kiss" => "😘",
        "happy" => "😊",
        "cry" => "😢",
        "sick" => "🤒",
        "shy" => "😳",
        "teeth" => "😁",
        "tongue" => "😛",
        "money" => "🤑",
        "mad" => "😡",
        "flirt" => "😏",
        "crazy" => "🤪",
        "confused" => "😕",
        "depressed" => "😔",
        "scream" => "😱",
        "nerd" => "🤓",
        "not_sure" => "😐",
        "cool" => "😎",
        "huh" => "🤔",
        "happycry" => "😂",
        "relax" => "😌",
        "devil" => "😈",
        "angel" => "😇",
        "heart" => "❤️",
        "heart_break" => "💔",
        "purple_heart" => "💜",
        "yellow_heart" => "💛",
        "blue_heart" => "💙",
        "green_heart" => "💚",
        "music" => "🎵",
        "sun" => "☀️",
        "rain" => "🌧️",
        "cloud" => "☁️",
        "moon" => "🌙",
        "star" => "⭐",
        "run" => "🏃",
        "like" => "👍",
        "unlike" => "👎",
        "ok" => "👌",
        "v" => "✌️",
        "coffee" => "☕",
        "time" => "⏰",
        "airplane" => "✈️",
        "car" => "🚗",
        "zzz" => "💤",
        "wine" => "🍷",
        "beer" => "🍺",
        "soda" => "🥤",
        "pizza" => "🍕",
        "cupcake" => "🧁",
        "cake" => "🎂",
        "ice_cream" => "🍦",
        "!" => "❗",
        "q" => "❓",
        "$" => "💲",
        "christmas_tree" => "🎄",
        "gift" => "🎁",
        "flower" => "🌸",
        "rose" => "🌹",
        "cat" => "🐱",
        "dog" => "🐶",
        "tv" => "📺",
        "tape" => "📼",
        "cigarette" => "🚬",
        "light_bulb" => "💡",
        "soccer" => "⚽",
        "fire" => "🔥",
        "ghost" => "👻",
        "poo" => "💩",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page(rows: &str) -> String {
        format!(
            "\u{feff}<!DOCTYPE html><html><head><title>Generated by Backup Text for Viber</title></head><body>\
             <p class=\"total\">Total 4 Messages</p><table><tbody>{rows}</tbody></table></body></html>"
        )
    }
    fn day(date: &str) -> String {
        format!("<tr><td class=\"tac\"><div class=\"bubble date\">{date}</div></td></tr>")
    }
    fn out(text: &str, time: &str) -> String {
        format!("<tr><td class=\"tar\"><div class=\"bubble out\">{text}<br/><span class=\"time\">{time}</span></div></td></tr>")
    }
    fn into(text: &str, time: &str) -> String {
        format!("<tr><td><div class=\"bubble in\">{text}<br/><span class=\"time\">{time}</span></div></td></tr>")
    }

    #[test]
    fn reads_each_side_with_its_day_and_time() {
        let html = page(
            &[
                day("2018-07-12"),
                out("Καλημέρα &quot;Μαρία&quot; &amp; όλοι", "09:06:05"),
                into("Μαρία: Γεια σου! Τι κάνεις;", "09:07:00"),
                day("2018-07-13"),
                out("Σημείωση: να πάρω ψωμί", "22:41:05"),
                into("Μαρία: δύο<br/>γραμμές", "23:00:59"),
            ]
            .concat(),
        );
        let chat = parse("LP_vbr_chat_20180713.html", &html).unwrap();
        assert_eq!((chat.source, chat.title.as_str(), chat.skipped), (Source::Viber, "Μαρία", 0));
        let m = &chat.messages;
        assert_eq!(m.len(), 4);
        assert_eq!((m[0].sender.as_deref(), m[0].text.as_str()), (None, "Καλημέρα \"Μαρία\" & όλοι"));
        assert_eq!((m[1].sender.as_deref(), m[1].text.as_str()), (Some("Μαρία"), "Γεια σου! Τι κάνεις;"));
        // The owner's own words that look like a name keep it.
        assert_eq!((m[2].sender.as_deref(), m[2].text.as_str()), (None, "Σημείωση: να πάρω ψωμί"));
        assert_eq!(m[3].text, "δύο\nγραμμές");
        let day = days_from_civil(2018, 7, 12) * 86_400;
        assert_eq!(m[0].sent_at, Some(Time::Local(day + 9 * 3600 + 6 * 60 + 5)));
        assert_eq!(m[3].sent_at, Some(Time::Local(day + 86_400 + 23 * 3600 + 59)));
    }

    #[test]
    fn emoticons_become_emoji_and_are_never_fetched() {
        let icon = |code: &str, alt: &str| {
            format!("<img src=\"http://i.smeiti.com/vbtt/{code}.png\" width=\"22\" height=\"22\" alt=\"{alt}\" class=\"emoticon\"/>")
        };
        let html = page(
            &[
                day("2018-07-13"),
                out(&format!("τέλεια{}", icon("yummi", "(yummi)")), "10:00:00"),
                into(&format!("Μαρία: {}{}", icon("heart", "(heart)"), icon("tv", "(TV)")), "10:01:00"),
                out(&icon("new", "(brand_new)"), "10:02:00"),
            ]
            .concat(),
        );
        let chat = parse("chat.html", &html).unwrap();
        let texts: Vec<&str> = chat.messages.iter().map(|m| m.text.as_str()).collect();
        assert_eq!(texts, ["τέλεια😋", "❤️📺", "(brand_new)"]);
        assert!(chat.messages.iter().all(|m| !m.text.contains("http")));
    }

    #[test]
    fn a_day_from_a_wrong_clock_has_no_time() {
        let html =
            page(&[day("1970-03-09"), out("νωρίς", "08:00:00"), day("2017-07-10"), out("μετά", "08:00:00")].concat());
        let chat = parse("chat.html", &html).unwrap();
        assert_eq!(chat.messages[0].sent_at, None);
        assert_eq!(chat.messages[1].sent_at, Some(Time::Local(days_from_civil(2017, 7, 10) * 86_400 + 8 * 3600)));
    }

    #[test]
    fn a_chat_with_only_the_owner_is_named_from_the_file_and_empty_bubbles_are_counted() {
        let html = page(&[day("2018-07-13"), out("μόνος", "10:00:00"), out("", "10:01:00")].concat());
        let chat = parse("/sdcard/Download/Ταξίδι.html", &html).unwrap();
        assert_eq!((chat.title.as_str(), chat.messages.len(), chat.skipped), ("Ταξίδι", 1, 1));
        // An incoming message with no name is still the other person's.
        let html =
            page(&[day("2018-07-13"), into("Νίκος: γεια", "10:00:00"), into("χωρίς όνομα", "10:01:00")].concat());
        let chat = parse("chat.html", &html).unwrap();
        assert_eq!(chat.messages[1].sender.as_deref(), Some("Νίκος"));
    }

    #[test]
    fn entities_and_odd_text_are_read_safely() {
        assert_eq!(entities("a &lt;b&gt; &#916; &#x3a9; &apos;x&apos; &unknown; & 5"), "a <b> Δ Ω 'x' &unknown; & 5");
        assert_eq!(plain("<b>bold</b> <i"), "bold <i");
        assert_eq!(clock("24:00:00"), None);
        assert_eq!(date("2018-13-01"), None);
        assert!(!is_viber("<html><body>hi</body></html>"));
        assert!(parse("x.html", "<html></html>").is_err());
    }
}
