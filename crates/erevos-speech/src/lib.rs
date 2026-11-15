// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! A voice message written out on the phone itself (app/lib/speech.ts): nothing of it leaves the
//! phone. The model, Whisper small (OpenAI, MIT licence), is not in the app: it is taken once,
//! when asked for, as one GGUF file whose SHA-256 the app knows (`MODEL_SHA256`), so a file
//! changed on the way or on the server is refused. It holds the weights (8-bit), the model's
//! sizes and its tokens (examples/make_model.rs makes it from OpenAI's release).
//!
//! The sound is read in windows of 30 seconds: each made into a log-mel spectrogram (mel.rs),
//! heard by the encoder, then written out token by token by the decoder (whisper.rs), greedily,
//! without times. The language is the one asked for, or else the one the model hears.

mod mel;
mod whisper;

use std::path::Path;

use candle_core::Device;
use sha2::{Digest, Sha256};

pub use whisper::Model;

/// The SHA-256 of the one model file the app takes (Whisper small, 8-bit), hex.
pub const MODEL_SHA256: &str = "dc6f15a0762ac70cbe128c34628bddab1b6c05eb8b7bf2b1fb41022f0ba6a83b";

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
