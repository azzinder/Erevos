// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Whisper's encoder and decoder (OpenAI's whisper/model.py), read from the GGUF file
// examples/make_model.rs makes. The weights come 8-bit, to take less to download, and are
// opened to 32-bit floats here, as matrix products on 8-bit weights run far slower on a phone's
// processor. The decoder keeps the keys and values of what it wrote, so each new token costs one
// step, not all of them again; the audio's keys and values are made once per window.

use std::collections::HashMap;
use std::path::Path;

use candle_core::quantized::gguf_file;
use candle_core::{DType, Device, Tensor, D};

use crate::mel;
use crate::{Error, Result};

pub(crate) struct Linear {
    // (in, out), contiguous: x · w.
    w: Tensor,
    b: Option<Tensor>,
}

impl Linear {
    pub(crate) fn forward(&self, x: &Tensor) -> Result<Tensor> {
        let y = x.broadcast_matmul(&self.w)?;
        Ok(match &self.b {
            Some(b) => y.broadcast_add(b)?,
            None => y,
        })
    }
}

pub(crate) struct Norm {
    w: Tensor,
    b: Tensor,
}

impl Norm {
    pub(crate) fn forward(&self, x: &Tensor) -> Result<Tensor> {
        Ok(candle_nn::ops::layer_norm(x, &self.w, &self.b, 1e-5)?)
    }
}

pub(crate) fn softmax(x: &Tensor) -> Result<Tensor> {
    Ok(candle_nn::ops::softmax_last_dim(x)?)
}

pub(crate) struct Attention {
    q: Linear,
    k: Linear,
    v: Linear,
    o: Linear,
    heads: usize,
    // The keys (b, h, d, s), scaled, and values (b, h, s, d): the audio's, or what was written so far.
    pub(crate) kept: Option<(Tensor, Tensor)>,
}

impl Attention {
    fn split(&self, x: &Tensor) -> Result<Tensor> {
        let (b, t, n) = x.dims3()?;
        Ok(x.reshape((b, t, self.heads, n / self.heads))?
            .transpose(1, 2)?)
    }

    // `audio`: attends to it (its keys and values made once). Otherwise to `x` itself: with
    // `writing`, to what was written before too, and to nothing after.
    pub(crate) fn forward(
        &mut self,
        x: &Tensor,
        audio: Option<&Tensor>,
        writing: bool,
    ) -> Result<Tensor> {
        let (_, t, n) = x.dims3()?;
        let scale = ((n / self.heads) as f64).powf(-0.25);
        let q = (self.split(&self.q.forward(x)?)? * scale)?;
        let shaped = |me: &Self, from: &Tensor| -> Result<(Tensor, Tensor)> {
            let k = (me.split(&me.k.forward(from)?)?.transpose(2, 3)? * scale)?.contiguous()?;
            let v = me.split(&me.v.forward(from)?)?.contiguous()?;
            Ok((k, v))
        };
        let (k, v) = match audio {
            Some(a) => match &self.kept {
                Some(kv) => kv.clone(),
                None => {
                    let kv = shaped(self, a)?;
                    self.kept = Some(kv.clone());
                    kv
                }
            },
            None if writing => {
                let (k, v) = shaped(self, x)?;
                let kv = match &self.kept {
                    Some((pk, pv)) => (Tensor::cat(&[pk, &k], 3)?, Tensor::cat(&[pv, &v], 2)?),
                    None => (k, v),
                };
                self.kept = Some(kv.clone());
                kv
            }
            None => shaped(self, x)?,
        };
        let mut w = q.matmul(&k)?;
        if writing && audio.is_none() && t > 1 {
            let s = w.dim(D::Minus1)?;
            let past = s - t;
            let mask: Vec<f32> = (0..t)
                .flat_map(|i| {
                    (0..s).map(move |j| if j > past + i { f32::NEG_INFINITY } else { 0.0 })
                })
                .collect();
            w = w.broadcast_add(&Tensor::from_vec(mask, (t, s), x.device())?)?;
        }
        let y = softmax(&w)?.matmul(&v)?.transpose(1, 2)?.flatten_from(2)?;
        self.o.forward(&y)
    }
}

struct Block {
    attn: Attention,
    attn_norm: Norm,
    cross: Option<(Attention, Norm)>,
    up: Linear,
    down: Linear,
    norm: Norm,
}

impl Block {
    fn forward(&mut self, x: &Tensor, audio: Option<&Tensor>, writing: bool) -> Result<Tensor> {
        let mut x = (x + self
            .attn
            .forward(&self.attn_norm.forward(x)?, None, writing)?)?;
        if let Some((cross, norm)) = &mut self.cross {
            x = (&x + cross.forward(&norm.forward(&x)?, audio, false)?)?;
        }
        let m = self
            .down
            .forward(&self.up.forward(&self.norm.forward(&x)?)?.gelu_erf()?)?;
        Ok((x + m)?)
    }

    fn forget(&mut self, audio_too: bool) {
        self.attn.kept = None;
        if audio_too {
            if let Some((cross, _)) = &mut self.cross {
                cross.kept = None;
            }
        }
    }
}

/// Whisper, opened (crate::open).
pub struct Model {
    mels: usize,
    filters: Vec<f32>,
    conv1: (Tensor, Tensor),
    conv2: (Tensor, Tensor),
    audio_pos: Tensor,
    encoder: Vec<Block>,
    encoder_norm: Norm,
    embed: Tensor,
    embed_t: Tensor,
    text_pos: Tensor,
    decoder: Vec<Block>,
    decoder_norm: Norm,
    text_ctx: usize,
    written: usize,
    tokens: Vec<Vec<u8>>,
    sot: u32,
    eot: u32,
    transcribe: u32,
    no_times: u32,
    languages: Vec<String>,
    first_language: u32,
}

// What a GGUF file holds, read as asked.
pub(crate) struct Reader {
    pub(crate) content: gguf_file::Content,
    file: std::fs::File,
    device: Device,
}

impl Reader {
    pub(crate) fn open(path: &Path, device: &Device) -> Result<Self> {
        let mut file = std::fs::File::open(path).map_err(|e| Error::Model(e.to_string()))?;
        let content =
            gguf_file::Content::read(&mut file).map_err(|e| Error::Model(e.to_string()))?;
        Ok(Self {
            content,
            file,
            device: device.clone(),
        })
    }
    pub(crate) fn tensor(&mut self, name: &str) -> Result<Tensor> {
        let q = self
            .content
            .tensor(&mut self.file, name, &self.device)
            .map_err(|e| Error::Model(format!("{name}: {e}")))?;
        Ok(q.dequantize(&self.device)?.to_dtype(DType::F32)?)
    }
    pub(crate) fn linear(&mut self, at: &str, bias: bool) -> Result<Linear> {
        let w = self.tensor(&format!("{at}.weight"))?.t()?.contiguous()?;
        let b = if bias {
            Some(self.tensor(&format!("{at}.bias"))?)
        } else {
            None
        };
        Ok(Linear { w, b })
    }
    pub(crate) fn norm(&mut self, at: &str) -> Result<Norm> {
        Ok(Norm {
            w: self.tensor(&format!("{at}.weight"))?,
            b: self.tensor(&format!("{at}.bias"))?,
        })
    }
    // Whisper's keys have no bias; Marian's do.
    pub(crate) fn attention(
        &mut self,
        at: &str,
        heads: usize,
        key_bias: bool,
    ) -> Result<Attention> {
        Ok(Attention {
            q: self.linear(&format!("{at}.q_proj"), true)?,
            k: self.linear(&format!("{at}.k_proj"), key_bias)?,
            v: self.linear(&format!("{at}.v_proj"), true)?,
            o: self.linear(&format!("{at}.out_proj"), true)?,
            heads,
            kept: None,
        })
    }
    fn block(&mut self, at: &str, heads: usize, cross: bool) -> Result<Block> {
        Ok(Block {
            attn: self.attention(&format!("{at}.self_attn"), heads, false)?,
            attn_norm: self.norm(&format!("{at}.self_attn_layer_norm"))?,
            cross: if cross {
                Some((
                    self.attention(&format!("{at}.encoder_attn"), heads, false)?,
                    self.norm(&format!("{at}.encoder_attn_layer_norm"))?,
                ))
            } else {
                None
            },
            up: self.linear(&format!("{at}.fc1"), true)?,
            down: self.linear(&format!("{at}.fc2"), true)?,
            norm: self.norm(&format!("{at}.final_layer_norm"))?,
        })
    }
    pub(crate) fn number(&self, key: &str) -> Result<usize> {
        let v = self
            .content
            .metadata
            .get(key)
            .ok_or_else(|| Error::Model(format!("no {key}")))?;
        Ok(v.to_u32()
            .map_err(|e| Error::Model(format!("{key}: {e}")))? as usize)
    }
    pub(crate) fn strings(&self, key: &str) -> Result<Vec<String>> {
        let v = self
            .content
            .metadata
            .get(key)
            .ok_or_else(|| Error::Model(format!("no {key}")))?;
        let list = v
            .to_vec()
            .map_err(|e| Error::Model(format!("{key}: {e}")))?;
        list.iter()
            .map(|s| {
                s.to_string()
                    .cloned()
                    .map_err(|e| Error::Model(format!("{key}: {e}")))
            })
            .collect()
    }
}

fn sinusoids(length: usize, channels: usize, device: &Device) -> Result<Tensor> {
    let step = 10000f32.ln() / (channels / 2 - 1) as f32;
    let inv: Vec<f32> = (0..channels / 2)
        .map(|i| (-(i as f32) * step).exp())
        .collect();
    let inv = Tensor::new(inv.as_slice(), device)?.unsqueeze(0)?;
    let at = Tensor::arange(0u32, length as u32, device)?
        .to_dtype(DType::F32)?
        .unsqueeze(1)?;
    let t = at.broadcast_mul(&inv)?;
    Ok(Tensor::cat(&[t.sin()?, t.cos()?], 1)?)
}

// GPT-2's bytes as characters, back to bytes: the tokens are written so.
fn byte_of() -> HashMap<char, u8> {
    let mut bytes: Vec<u32> = (u32::from(b'!')..=u32::from(b'~'))
        .chain(0xA1..=0xAC)
        .chain(0xAE..=0xFF)
        .collect();
    let mut chars = bytes.clone();
    let mut extra = 0;
    for b in 0..256u32 {
        if !bytes.contains(&b) {
            bytes.push(b);
            chars.push(256 + extra);
            extra += 1;
        }
    }
    bytes
        .iter()
        .zip(&chars)
        .filter_map(|(b, c)| char::from_u32(*c).map(|c| (c, *b as u8)))
        .collect()
}

impl Model {
    /// Opens a model file without checking which it is: for trying one out (examples), never the app.
    pub fn open_unchecked(path: &Path) -> Result<Self> {
        Self::open(path, &Device::Cpu)
    }

    pub(crate) fn open(path: &Path, device: &Device) -> Result<Self> {
        let mut r = Reader::open(path, device)?;
        let (n, mels) = (r.number("whisper.d_model")?, r.number("whisper.mels")?);
        let (enc_heads, dec_heads) = (
            r.number("whisper.encoder_heads")?,
            r.number("whisper.decoder_heads")?,
        );
        let (enc_layers, dec_layers) = (
            r.number("whisper.encoder_layers")?,
            r.number("whisper.decoder_layers")?,
        );
        let (audio_ctx, text_ctx) = (
            r.number("whisper.audio_ctx")?,
            r.number("whisper.text_ctx")?,
        );
        let to_bytes = byte_of();
        let tokens = r
            .strings("whisper.tokens")?
            .iter()
            .map(|s| {
                s.chars()
                    .filter_map(|c| to_bytes.get(&c).copied())
                    .collect()
            })
            .collect();
        let id = |r: &Reader, key: &str| -> Result<u32> { Ok(r.number(key)? as u32) };
        let model = Self {
            mels,
            filters: mel::filters(mels),
            conv1: (
                r.tensor("model.encoder.conv1.weight")?,
                r.tensor("model.encoder.conv1.bias")?,
            ),
            conv2: (
                r.tensor("model.encoder.conv2.weight")?,
                r.tensor("model.encoder.conv2.bias")?,
            ),
            audio_pos: sinusoids(audio_ctx, n, device)?,
            encoder: (0..enc_layers)
                .map(|i| r.block(&format!("model.encoder.layers.{i}"), enc_heads, false))
                .collect::<Result<_>>()?,
            encoder_norm: r.norm("model.encoder.layer_norm")?,
            embed: r.tensor("model.decoder.embed_tokens.weight")?,
            embed_t: r
                .tensor("model.decoder.embed_tokens.weight")?
                .t()?
                .contiguous()?,
            text_pos: r.tensor("model.decoder.embed_positions.weight")?,
            decoder: (0..dec_layers)
                .map(|i| r.block(&format!("model.decoder.layers.{i}"), dec_heads, true))
                .collect::<Result<_>>()?,
            decoder_norm: r.norm("model.decoder.layer_norm")?,
            text_ctx,
            written: 0,
            tokens,
            sot: id(&r, "whisper.sot")?,
            eot: id(&r, "whisper.eot")?,
            transcribe: id(&r, "whisper.transcribe")?,
            no_times: id(&r, "whisper.no_timestamps")?,
            languages: r.strings("whisper.languages")?,
            first_language: id(&r, "whisper.first_language")?,
        };
        if model.tokens.len() != model.embed.dim(0)? {
            return Err(Error::Model("tokens and embeddings differ".into()));
        }
        Ok(model)
    }

    // The audio's features, from its spectrogram (1, mels, frames). The decoder starts anew.
    fn encode(&mut self, mel: &Tensor) -> Result<Tensor> {
        for b in self.decoder.iter_mut() {
            b.forget(true);
        }
        self.written = 0;
        let (w1, b1) = &self.conv1;
        let x = mel
            .conv1d(w1, 1, 1, 1, 1)?
            .broadcast_add(&b1.unsqueeze(1)?)?
            .gelu_erf()?;
        let (w2, b2) = &self.conv2;
        let x = x
            .conv1d(w2, 1, 2, 1, 1)?
            .broadcast_add(&b2.unsqueeze(1)?)?
            .gelu_erf()?
            .transpose(1, 2)?;
        let t = x.dim(1)?;
        let mut x = x.broadcast_add(&self.audio_pos.narrow(0, 0, t)?)?;
        for b in self.encoder.iter_mut() {
            x = b.forward(&x, None, false)?;
        }
        self.encoder_norm.forward(&x)
    }

    // The logits of the token after `tokens`, those written since the last call.
    fn next(&mut self, tokens: &[u32], audio: &Tensor) -> Result<Vec<f32>> {
        let t = Tensor::new(tokens, audio.device())?;
        let mut x = self
            .embed
            .index_select(&t, 0)?
            .broadcast_add(&self.text_pos.narrow(0, self.written, tokens.len())?)?
            .unsqueeze(0)?;
        self.written += tokens.len();
        for b in self.decoder.iter_mut() {
            x = b.forward(&x, Some(audio), true)?;
        }
        let x = self.decoder_norm.forward(&x)?;
        let last = x.narrow(1, tokens.len() - 1, 1)?.squeeze(1)?;
        Ok(last.matmul(&self.embed_t)?.squeeze(0)?.to_vec1()?)
    }

    fn restart(&mut self) {
        for b in self.decoder.iter_mut() {
            b.forget(false);
        }
        self.written = 0;
    }

    // The language heard: of the language tokens, the likeliest after the start.
    fn hear_language(&mut self, audio: &Tensor) -> Result<u32> {
        let logits = self.next(&[self.sot], audio)?;
        self.restart();
        let first = self.first_language as usize;
        let (best, _) = logits[first..first + self.languages.len()]
            .iter()
            .enumerate()
            .fold(
                (0, f32::MIN),
                |(bi, bv), (i, v)| if *v > bv { (i, *v) } else { (bi, bv) },
            );
        Ok(self.first_language + best as u32)
    }

    /// The words in `samples` (at 16 kHz, between -1 and 1), in `language` or the one heard.
    pub fn transcribe(&mut self, samples: &[f32], language: &str) -> Result<String> {
        let mut asked = if language.is_empty() {
            None
        } else {
            let at = self
                .languages
                .iter()
                .position(|l| l == language)
                .ok_or_else(|| Error::Language(language.into()))?;
            Some(self.first_language + at as u32)
        };
        let mut text: Vec<u8> = Vec::new();
        let device = self.embed.device().clone();
        let most = self.text_ctx / 2;
        for window in samples.chunks(mel::WINDOW) {
            // A last bit of under a tenth of a second has nothing to say.
            if window.len() < crate::RATE as usize / 10 && !text.is_empty() {
                break;
            }
            let spectrogram = mel::spectrogram(window, &self.filters, self.mels);
            let audio = self.encode(&Tensor::from_vec(
                spectrogram,
                (1, self.mels, mel::FRAMES),
                &device,
            )?)?;
            let language = match asked {
                Some(l) => l,
                None => {
                    let l = self.hear_language(&audio)?;
                    asked = Some(l);
                    l
                }
            };
            let mut feed = vec![self.sot, language, self.transcribe, self.no_times];
            for _ in 0..most {
                let mut logits = self.next(&feed, &audio)?;
                // No marks of its own (times, languages, tasks) in the words: only words, or the end.
                for (id, l) in logits.iter_mut().enumerate().skip(self.eot as usize + 1) {
                    let _ = id;
                    *l = f32::NEG_INFINITY;
                }
                let (best, _) =
                    logits
                        .iter()
                        .enumerate()
                        .fold(
                            (0usize, f32::MIN),
                            |(bi, bv), (i, v)| if *v > bv { (i, *v) } else { (bi, bv) },
                        );
                let best = best as u32;
                if best == self.eot {
                    break;
                }
                if let Some(t) = self.tokens.get(best as usize) {
                    text.extend_from_slice(t);
                }
                feed = vec![best];
            }
            text.push(b' ');
        }
        Ok(String::from_utf8_lossy(&text)
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" "))
    }
}
