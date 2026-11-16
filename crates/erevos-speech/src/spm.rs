// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Text cut into the pieces a translation model knows (a SentencePiece unigram model, as Marian's
// source.spm): of all the ways to cut it into known pieces, the one whose pieces' scores add up
// highest. Spaces are written as "▁", one before each word. A character no piece holds is a piece
// of its own, unknown, with a score well below any known one's.

use std::collections::HashMap;

/// The mark SentencePiece writes for a space.
pub const SPACE: char = '\u{2581}';

pub struct Pieces {
    score: HashMap<String, f32>,
    longest: usize,
    unknown: f32,
}

impl Pieces {
    /// From each piece with its score (NORMAL and USER_DEFINED pieces only).
    pub fn new(pieces: impl IntoIterator<Item = (String, f32)>) -> Self {
        let score: HashMap<String, f32> = pieces.into_iter().collect();
        let longest = score.keys().map(|k| k.chars().count()).max().unwrap_or(1);
        let lowest = score.values().copied().fold(0f32, f32::min);
        Self {
            score,
            longest,
            unknown: lowest - 10.0,
        }
    }

    /// `text` in pieces: its spaces, tabs and lines as one space each, "▁" before each word.
    pub fn cut(&self, text: &str) -> Vec<String> {
        let words: Vec<&str> = text.split_whitespace().collect();
        if words.is_empty() {
            return Vec::new();
        }
        let s: Vec<char> = words
            .iter()
            .flat_map(|w| std::iter::once(SPACE).chain(w.chars()))
            .collect();
        let n = s.len();
        // For each place, the best score of a cut up to it, and where its last piece starts.
        let mut best = vec![(f32::NEG_INFINITY, 0usize); n + 1];
        best[0].0 = 0.0;
        let mut piece = String::new();
        for i in 0..n {
            let here = best[i].0;
            if here == f32::NEG_INFINITY {
                continue;
            }
            piece.clear();
            let mut known_char = false;
            for l in 1..=self.longest.min(n - i) {
                piece.push(s[i + l - 1]);
                if let Some(sc) = self.score.get(&piece) {
                    if l == 1 {
                        known_char = true;
                    }
                    if here + sc > best[i + l].0 {
                        best[i + l] = (here + sc, i);
                    }
                }
            }
            if !known_char && here + self.unknown > best[i + 1].0 {
                best[i + 1] = (here + self.unknown, i);
            }
        }
        let mut out = Vec::new();
        let mut end = n;
        while end > 0 {
            let start = best[end].1;
            out.push(s[start..end].iter().collect());
            end = start;
        }
        out.reverse();
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_best_cut_is_taken() {
        let p = Pieces::new([
            ("▁κα".to_string(), -3.0),
            ("λη".to_string(), -3.0),
            ("▁καλη".to_string(), -4.0),
            ("μέρα".to_string(), -2.0),
            ("▁".to_string(), -5.0),
            ("κ".to_string(), -6.0),
        ]);
        assert_eq!(p.cut("  καλημέρα\n"), ["▁καλη", "μέρα"]);
        // An unknown character is a piece of its own.
        assert_eq!(p.cut("καλη!"), ["▁καλη", "!"]);
        assert_eq!(p.cut("κ κ"), ["▁", "κ", "▁", "κ"]);
        assert!(p.cut(" \t").is_empty());
    }
}
