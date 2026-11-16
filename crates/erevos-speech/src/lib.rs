// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! A voice message written out on the phone itself (app/lib/speech.ts): nothing of it leaves the
//! phone. The model, Whisper small (OpenAI, MIT licence), is not in the app: it is taken once,
//! when asked for, as one GGUF file whose SHA-256 the app knows (`MODEL_SHA256`), so a file
//! changed on the way or on the server is refused. It holds the weights (8-bit), the model's
//! sizes and its tokens (examples/make_model.rs makes it from OpenAI's release).
//!
//! Text is translated on the phone the same way (marian.rs): a model for each language into
//! another (Helsinki-NLP's OPUS-MT, CC-BY 4.0), taken when asked for and checked against the
//! SHA-256 in `TRANSLATIONS`.
//!
//! The sound is read in windows of 30 seconds: each made into a log-mel spectrogram (mel.rs),
//! heard by the encoder, then written out token by token by the decoder (whisper.rs), greedily,
//! without times. The language is the one asked for, or else the one the model hears.

mod marian;
mod mel;
mod spm;
mod whisper;

use std::path::Path;

use candle_core::Device;
use sha2::{Digest, Sha256};

pub use marian::Translator;
pub use whisper::Model;

/// The SHA-256 of the one model file the app takes (Whisper small, 8-bit), hex.
pub const MODEL_SHA256: &str = "dc6f15a0762ac70cbe128c34628bddab1b6c05eb8b7bf2b1fb41022f0ba6a83b";

/// The translation models the app takes (src/marian.rs, examples/make_translation.rs): the
/// language each reads, the one it writes, and its file's SHA-256 (hex).
pub const TRANSLATIONS: &[(&str, &str, &str)] = &[
    (
        "de",
        "en",
        "6dce0f2040d9d38bfe90c7dc495c057ef4818d650cdcd0022f488d2ae1162a04",
    ),
    (
        "el",
        "en",
        "eba046519f5897da7ed6a362b55a9a9ed7511a8a131579afdfc7e59595353f4b",
    ),
    (
        "en",
        "de",
        "02ebbaa10860482fdf472f7a2c71dfc11f2c06a5683e8780ff08e5007ee3c45f",
    ),
    (
        "en",
        "el",
        "d7e5627fefa3b092447c4a0722dc6e4335ab694681e5086d0365683c69eec892",
    ),
    (
        "en",
        "es",
        "e29bcdf472736dd8ad9464a97dac813475d48f00ac24bc462ea1519f7f2cb89a",
    ),
    (
        "en",
        "fr",
        "3278981ad0bf2a4993cdbcd33f5566c6224b4a0ce5fec6bfdcdd632740b713e7",
    ),
    (
        "en",
        "it",
        "c01c38e498bf51a7501816547e7a2dd157fdcd88ddb38d59a01cfbeb17d0ac36",
    ),
    (
        "es",
        "en",
        "28a0db0a043d65f494384fb324c751d9e4127a0c0e4fa0c001dd3641036252ea",
    ),
    (
        "fr",
        "en",
        "9582d7b0da9e4e0d1edd432945e55c55ac380ea4dc7736efe7084204fc23f7a9",
    ),
    (
        "it",
        "en",
        "fec0bd7f352c9b5d0fb88cd1c3dba7a2b4cbc0757a9e6e1922b31fb0c505b7e7",
    ),
];

/// The samples a second the model hears.
pub const RATE: u32 = 16_000;

/// The most sound written out at once: ten minutes.
pub const MOST_SECONDS: usize = 600;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("the model file is not the one expected")]
    WrongModel,
    #[error("the model file does not read: {0}")]
    Model(String),
    #[error("the sound is not 16-bit samples at a rate between 8 and 96 kHz, ten minutes at most")]
    Sound,
    #[error("no such language: {0}")]
    Language(String),
    #[error("{0}")]
    Tensor(#[from] candle_core::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Whether the file at `path` is the model expected: its SHA-256 is `want` (hex).
pub fn file_is(path: &Path, want: &str) -> Result<bool> {
    use std::io::Read;
    let mut file = std::fs::File::open(path).map_err(|e| Error::Model(e.to_string()))?;
    let mut hash = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    loop {
        let n = file
            .read(&mut buf)
            .map_err(|e| Error::Model(e.to_string()))?;
        if n == 0 {
            break;
        }
        hash.update(&buf[..n]);
    }
    let got: String = hash.finalize().iter().map(|b| format!("{b:02x}")).collect();
    Ok(got == want)
}

/// Opens the model at `path`, after checking it is the one `want` (hex SHA-256) names.
pub fn open(path: &Path, want: &str) -> Result<Model> {
    if !file_is(path, want)? {
        return Err(Error::WrongModel);
    }
    Model::open(path, &Device::Cpu)
}

/// Opens the translation model at `path` from `from` into `to`, after checking it is the one
/// TRANSLATIONS names for them.
pub fn open_translation(path: &Path, from: &str, to: &str) -> Result<Translator> {
    let (_, _, want) = TRANSLATIONS
        .iter()
        .find(|(f, t, _)| *f == from && *t == to)
        .ok_or_else(|| Error::Language(format!("{from} to {to}")))?;
    if !file_is(path, want)? {
        return Err(Error::WrongModel);
    }
    let model = Translator::open(path, &Device::Cpu)?;
    if model.languages() != (from, to) {
        return Err(Error::WrongModel);
    }
    Ok(model)
}

/// `pcm` (16-bit little-endian, mono, at `rate`) as samples between -1 and 1 at RATE.
pub fn samples(pcm: &[u8], rate: u32) -> Result<Vec<f32>> {
    if !pcm.len().is_multiple_of(2)
        || !(8_000..=96_000).contains(&rate)
        || pcm.len() / 2 > rate as usize * MOST_SECONDS
    {
        return Err(Error::Sound);
    }
    let raw: Vec<f32> = pcm
        .as_chunks::<2>()
        .0
        .iter()
        .map(|b| f32::from(i16::from_le_bytes(*b)) / 32768.0)
        .collect();
    Ok(resample(&raw, rate))
}

// Read at RATE: a whole multiple by the mean of each group (which keeps out what would fold back
// down), otherwise between each two by a straight line.
fn resample(raw: &[f32], rate: u32) -> Vec<f32> {
    if rate == RATE {
        return raw.to_vec();
    }
    if rate.is_multiple_of(RATE) {
        let n = (rate / RATE) as usize;
        return raw
            .chunks(n)
            .map(|c| c.iter().sum::<f32>() / c.len() as f32)
            .collect();
    }
    let ratio = f64::from(rate) / f64::from(RATE);
    let length = (raw.len() as f64 / ratio) as usize;
    (0..length)
        .map(|i| {
            let x = i as f64 * ratio;
            let j = x as usize;
            let f = (x - j as f64) as f32;
            let a = raw[j.min(raw.len() - 1)];
            let b = raw[(j + 1).min(raw.len() - 1)];
            a + (b - a) * f
        })
        .collect()
}

/// The words in `pcm` (16-bit little-endian, mono, at `rate`), in `language` (a code such as "el",
/// or "" for the one heard).
pub fn transcribe(model: &mut Model, pcm: &[u8], rate: u32, language: &str) -> Result<String> {
    let samples = samples(pcm, rate)?;
    model.transcribe(&samples, language)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sound_is_read_at_16_khz() {
        let pcm: Vec<u8> = (0..4800)
            .flat_map(|i| ((i % 100) as i16 * 100).to_le_bytes())
            .collect();
        assert_eq!(samples(&pcm, 48_000).unwrap().len(), 1600);
        assert_eq!(samples(&pcm, 16_000).unwrap().len(), 4800);
        assert_eq!(samples(&pcm, 44_100).unwrap().len(), 1741);
        assert!(samples(&pcm[1..], 16_000).is_err());
        assert!(samples(&pcm, 100).is_err());
        let loud: Vec<u8> = [i16::MAX, i16::MIN]
            .iter()
            .flat_map(|s| s.to_le_bytes())
            .collect();
        let s = samples(&loud, 16_000).unwrap();
        assert!(s[0] < 1.0 && s[1] == -1.0);
    }
}
