// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A Marian translation model (Helsinki-NLP's OPUS-MT, one language into another), read from the
// GGUF file examples/make_translation.rs makes: weights 8-bit to download, opened to 32-bit floats
// as Whisper's are (whisper.rs, whose parts it shares). The text is cut into pieces (spm.rs) and
// read by the encoder; the decoder writes the other language a piece at a time, greedily, keeping
// the keys and values of what it wrote. Unlike Whisper, each layer normalises after adding, its
// feed-forward is SiLU, and the embeddings are scaled by the square root of their width.

use std::path::Path;

use candle_core::quantized::gguf_file;
use candle_core::{DType, Device, Tensor};

use crate::spm::{Pieces, SPACE};
use crate::whisper::{Attention, Linear, Norm, Reader};
use crate::{Error, Result};

struct Block {
    attn: Attention,
    attn_norm: Norm,
    cross: Option<(Attention, Norm)>,
    up: Linear,
    down: Linear,
    norm: Norm,
}

impl Block {
    fn read(r: &mut Reader, at: &str, heads: usize, cross: bool) -> Result<Self> {
        Ok(Self {
            attn: r.attention(&format!("{at}.self_attn"), heads, true)?,
            attn_norm: r.norm(&format!("{at}.self_attn_layer_norm"))?,
            cross: if cross {
                Some((
                    r.attention(&format!("{at}.encoder_attn"), heads, true)?,
                    r.norm(&format!("{at}.encoder_attn_layer_norm"))?,
                ))
            } else {
                None
            },
            up: r.linear(&format!("{at}.fc1"), true)?,
            down: r.linear(&format!("{at}.fc2"), true)?,
            norm: r.norm(&format!("{at}.final_layer_norm"))?,
        })
    }

    fn forward(&mut self, x: &Tensor, source: Option<&Tensor>, writing: bool) -> Result<Tensor> {
        let mut x = self
            .attn_norm
            .forward(&(x + self.attn.forward(x, None, writing)?)?)?;
        if let Some((cross, norm)) = &mut self.cross {
            x = norm.forward(&(&x + cross.forward(&x, source, false)?)?)?;
        }
        let m = self.down.forward(&self.up.forward(&x)?.silu()?)?;
        self.norm.forward(&(x + m)?)
    }

    fn forget(&mut self) {
        self.attn.kept = None;
        if let Some((cross, _)) = &mut self.cross {
            cross.kept = None;
        }
    }
}

/// A translation model, from one language into another, opened (crate::open_translation).
pub struct Translator {
    from: String,
    to: String,
    pieces: Pieces,
    // Each source piece's token, by the piece.
    source_ids: std::collections::HashMap<String, u32>,
    tokens: Vec<String>,
    embed: Tensor,
    embed_t: Tensor,
    logits_bias: Tensor,
    positions: Tensor,
    scale: f64,
    encoder: Vec<Block>,
    decoder: Vec<Block>,
    eos: u32,
    pad: u32,
    unk: u32,
}

// Marian's positions: sines of each place over the first half of the width, cosines over the second.
fn positions(length: usize, width: usize, device: &Device) -> Result<Tensor> {
    let inv: Vec<f32> = (0..width / 2)
        .map(|i| 1.0 / 10000f32.powf((2 * i) as f32 / width as f32))
        .collect();
    let inv = Tensor::new(inv.as_slice(), device)?.unsqueeze(0)?;
    let at = Tensor::arange(0u32, length as u32, device)?
        .to_dtype(DType::F32)?
        .unsqueeze(1)?;
    let t = at.broadcast_mul(&inv)?;
    Ok(Tensor::cat(&[t.sin()?, t.cos()?], 1)?)
}

fn list<'a>(r: &'a Reader, key: &str) -> Result<&'a Vec<gguf_file::Value>> {
    r.content
        .metadata
        .get(key)
        .ok_or_else(|| Error::Model(format!("no {key}")))?
        .to_vec()
        .map_err(|e| Error::Model(format!("{key}: {e}")))
}

fn string(r: &Reader, key: &str) -> Result<String> {
    r.content
        .metadata
        .get(key)
        .ok_or_else(|| Error::Model(format!("no {key}")))?
        .to_string()
        .cloned()
        .map_err(|e| Error::Model(format!("{key}: {e}")))
}

// Sentences of a line: each ends at . ! ? ; or … followed by a space. A model reads one at a time
// best, and may leave out a sentence when given several.
fn sentences(line: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let mut start = 0;
    let chars: Vec<(usize, char)> = line.char_indices().collect();
    for (k, (i, c)) in chars.iter().enumerate() {
        let ends = matches!(c, '.' | '!' | '?' | ';' | '…' | '·')
            && chars.get(k + 1).is_some_and(|(_, n)| n.is_whitespace());
        if ends {
            let end = i + c.len_utf8();
            out.push(line[start..end].trim());
            start = end;
        }
    }
    out.push(line[start..].trim());
    out.retain(|s| !s.is_empty());
    out
}

impl Translator {
    /// Opens a model file without checking which it is: for trying one out (examples), never the app.
    pub fn open_unchecked(path: &Path) -> Result<Self> {
        Self::open(path, &Device::Cpu)
    }

    pub(crate) fn open(path: &Path, device: &Device) -> Result<Self> {
        let mut r = Reader::open(path, device)?;
        let width = r.number("marian.d_model")?;
        let heads = r.number("marian.heads")?;
        let (enc_layers, dec_layers) = (
            r.number("marian.encoder_layers")?,
            r.number("marian.decoder_layers")?,
        );
        let most = r.number("marian.max_positions")?;
        let names = r.strings("marian.source_pieces")?;
        let scores = list(&r, "marian.source_scores")?
            .iter()
            .map(|v| v.to_f32().map_err(|e| Error::Model(e.to_string())))
            .collect::<Result<Vec<f32>>>()?;
        let ids = list(&r, "marian.source_ids")?
            .iter()
            .map(|v| v.to_u32().map_err(|e| Error::Model(e.to_string())))
            .collect::<Result<Vec<u32>>>()?;
        if names.len() != scores.len() || names.len() != ids.len() {
            return Err(Error::Model("source pieces, scores and ids differ".into()));
        }
        let embed = r.tensor("model.shared.weight")?;
        let model = Self {
            from: string(&r, "marian.from")?,
            to: string(&r, "marian.to")?,
            pieces: Pieces::new(names.iter().cloned().zip(scores)),
            source_ids: names.into_iter().zip(ids).collect(),
            tokens: r.strings("marian.tokens")?,
            embed_t: embed.t()?.contiguous()?,
            embed,
            logits_bias: r.tensor("final_logits_bias")?.squeeze(0)?,
            positions: positions(most, width, device)?,
            scale: (width as f64).sqrt(),
            encoder: (0..enc_layers)
                .map(|i| Block::read(&mut r, &format!("model.encoder.layers.{i}"), heads, false))
                .collect::<Result<_>>()?,
            decoder: (0..dec_layers)
                .map(|i| Block::read(&mut r, &format!("model.decoder.layers.{i}"), heads, true))
                .collect::<Result<_>>()?,
            eos: r.number("marian.eos")? as u32,
            pad: r.number("marian.pad")? as u32,
            unk: r.number("marian.unk")? as u32,
        };
        if model.tokens.len() != model.embed.dim(0)? {
            return Err(Error::Model("tokens and embeddings differ".into()));
        }
        Ok(model)
    }

    /// The language it reads, and the one it writes (codes such as "el", "en").
    pub fn languages(&self) -> (&str, &str) {
        (&self.from, &self.to)
    }

    fn embed(&self, ids: &[u32], from: usize) -> Result<Tensor> {
        let t = Tensor::new(ids, self.embed.device())?;
        Ok((self.embed.index_select(&t, 0)? * self.scale)?
            .broadcast_add(&self.positions.narrow(0, from, ids.len())?)?
            .unsqueeze(0)?)
    }

    // One sentence, in the other language.
    fn sentence(&mut self, text: &str) -> Result<String> {
        let most = self.positions.dim(0)?;
        let mut ids: Vec<u32> = self
            .pieces
            .cut(text)
            .iter()
            .map(|p| self.source_ids.get(p).copied().unwrap_or(self.unk))
            .collect();
        ids.truncate(most - 1);
        ids.push(self.eos);
        let mut x = self.embed(&ids, 0)?;
        for b in self.encoder.iter_mut() {
            x = b.forward(&x, None, false)?;
        }
        let source = x;
        for b in self.decoder.iter_mut() {
            b.forget();
        }
        let mut written = vec![self.pad];
        let longest = (ids.len() * 3 + 10).min(most - 1);
        while written.len() <= longest {
            let at = written.len() - 1;
            let mut y = self.embed(&written[at..], at)?;
            for b in self.decoder.iter_mut() {
                y = b.forward(&y, Some(&source), true)?;
            }
            let logits: Vec<f32> = y
                .squeeze(0)?
                .matmul(&self.embed_t)?
                .squeeze(0)?
                .add(&self.logits_bias)?
                .to_vec1()?;
            let (best, _) =
                logits
                    .iter()
                    .enumerate()
                    .fold((0usize, f32::MIN), |(bi, bv), (i, v)| {
                        let banned = i == self.pad as usize || i == self.unk as usize;
                        if !banned && *v > bv {
                            (i, *v)
                        } else {
                            (bi, bv)
                        }
                    });
            if best as u32 == self.eos {
                break;
            }
            written.push(best as u32);
        }
        let text: String = written[1..]
            .iter()
            .filter_map(|&i| self.tokens.get(i as usize))
            .map(String::as_str)
            .collect();
        Ok(text.replace(SPACE, " ").trim().to_string())
    }

    /// `text` in the other language: line by line, and each line sentence by sentence.
    pub fn translate(&mut self, text: &str) -> Result<String> {
        let mut out = Vec::new();
        for line in text.lines() {
            let mut said = Vec::new();
            for s in sentences(line) {
                said.push(self.sentence(s)?);
            }
            out.push(said.join(" "));
        }
        Ok(out.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_line_is_read_sentence_by_sentence() {
        assert_eq!(
            sentences("Γεια σου! Τι κάνεις; Καλά. 3.5 ευρώ…"),
            ["Γεια σου!", "Τι κάνεις;", "Καλά.", "3.5 ευρώ…"]
        );
        assert!(sentences("   ").is_empty());
    }
}
