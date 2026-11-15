// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! A voice message's voice changed before it goes (app/lib/voice-change.ts): higher or deeper,
//! the same length, so whoever hears it does not hear the voice they would know.
//!
//! Two steps on mono 16-bit samples: the sound is first made longer or shorter by `factor`
//! without changing its pitch, by laying windows of it over each other where they match best
//! (WSOLA), then read back at its old length, which moves the pitch and the voice's colour
//! (its formants) by `factor` together. Moving both is what makes a voice hard to know by ear;
//! it is no shield against someone who shifts it back and compares with care.

use crate::Error;

/// The changes a voice can have, by the number the app sends.
pub const DEEPER: u8 = 1;
pub const HIGHER: u8 = 2;

/// How much each change moves the pitch.
pub fn factor_of(kind: u8) -> Option<f32> {
    match kind {
        DEEPER => Some(0.78),
        HIGHER => Some(1.3),
        _ => None,
    }
}

/// The most samples taken: a minute at 48 kHz, with room.
pub const MOST: usize = 48_000 * 75;

/// `pcm` (16-bit little-endian, mono, at `rate` samples a second) with its voice changed as `kind` says.
pub fn change(pcm: &[u8], rate: u32, kind: u8) -> Result<Vec<u8>, Error> {
    let factor = factor_of(kind).ok_or(Error::Malformed)?;
    if pcm.len() % 2 != 0 || pcm.len() / 2 > MOST || !(8_000..=96_000).contains(&rate) {
        return Err(Error::Malformed);
    }
    let samples: Vec<f32> = pcm.chunks_exact(2).map(|b| f32::from(i16::from_le_bytes([b[0], b[1]]))).collect();
    let shifted = shift(&samples, rate, factor);
    Ok(shifted.iter().flat_map(|s| (s.round().clamp(-32768.0, 32767.0) as i16).to_le_bytes()).collect())
}

/// `samples` with the pitch moved by `factor`, as long as they were.
pub fn shift(samples: &[f32], rate: u32, factor: f32) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }
    let stretched = stretch(samples, rate, factor);
    resample(&stretched, samples.len())
}

// `samples` made `factor` times as long, the pitch as it was (WSOLA).
fn stretch(samples: &[f32], rate: u32, factor: f32) -> Vec<f32> {
    let frame = (rate as usize * 30 / 1000).max(16) & !1;
    let hop_out = frame / 2;
    let hop_in = hop_out as f32 / factor;
    let tolerance = rate as usize * 8 / 1000;
    let want = (samples.len() as f32 * factor).ceil() as usize;
    let window: Vec<f32> = (0..frame).map(|i| 0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / frame as f32).cos()).collect();
    let mut out = vec![0f32; want + frame];
    let mut weight = vec![0f32; want + frame];
    let at = |i: isize| -> f32 { if i >= 0 && (i as usize) < samples.len() { samples[i as usize] } else { 0.0 } };
    // Where the last window came from: the next should go on from there as the sound did.
    let mut previous: isize = 0;
    let mut k = 0usize;
    while k * hop_out < want {
        let nominal = (k as f32 * hop_in) as isize;
        let start = if k == 0 {
            0
        } else {
            let natural = previous + hop_out as isize;
            let mut best = nominal;
            let mut best_score = f32::MIN;
            let step = 2;
            let mut delta = -(tolerance as isize);
            while delta <= tolerance as isize {
                let candidate = nominal + delta;
                let mut score = 0f32;
                for i in (0..hop_out).step_by(2) {
                    score += at(candidate + i as isize) * at(natural + i as isize);
                }
                if score > best_score {
                    best_score = score;
                    best = candidate;
                }
                delta += step;
            }
            best
        };
        let base = k * hop_out;
        for i in 0..frame {
            out[base + i] += at(start + i as isize) * window[i];
            weight[base + i] += window[i];
        }
        previous = start;
        k += 1;
    }
    out.truncate(want);
    for (sample, w) in out.iter_mut().zip(weight.iter()) {
        if *w > 1e-3 {
            *sample /= *w;
        }
    }
    out
}

// `samples` read back as `length` of them, between each two by a straight line.
fn resample(samples: &[f32], length: usize) -> Vec<f32> {
    if samples.is_empty() || length == 0 {
        return vec![0.0; length];
    }
    let ratio = samples.len() as f64 / length as f64;
    (0..length)
        .map(|i| {
            let x = i as f64 * ratio;
            let j = x.floor() as usize;
            let f = (x - j as f64) as f32;
            let a = samples[j.min(samples.len() - 1)];
            let b = samples[(j + 1).min(samples.len() - 1)];
            a + (b - a) * f
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(hz: f32, rate: u32, seconds: f32) -> Vec<f32> {
        (0..(rate as f32 * seconds) as usize).map(|i| 8000.0 * (2.0 * std::f32::consts::PI * hz * i as f32 / rate as f32).sin()).collect()
    }

    // The frequency of a tone, by how often it crosses zero going up.
    fn pitch(samples: &[f32], rate: u32) -> f32 {
        let middle = &samples[samples.len() / 4..samples.len() * 3 / 4];
        let ups = middle.windows(2).filter(|w| w[0] < 0.0 && w[1] >= 0.0).count();
        ups as f32 * rate as f32 / middle.len() as f32
    }

    #[test]
    fn the_pitch_moves_and_the_length_stays() {
        let rate = 48_000;
        let input = tone(200.0, rate, 1.0);
        for (kind, want) in [(DEEPER, 200.0 * 0.78), (HIGHER, 200.0 * 1.3)] {
            let out = shift(&input, rate, factor_of(kind).unwrap());
            assert_eq!(out.len(), input.len());
            let got = pitch(&out, rate);
            assert!((got - want).abs() < want * 0.05, "kind {kind}: {got} Hz, wanted {want}");
        }
    }

    #[test]
    fn bytes_in_and_out() {
        let pcm: Vec<u8> = tone(300.0, 16_000, 0.5).iter().flat_map(|s| (*s as i16).to_le_bytes()).collect();
        let out = change(&pcm, 16_000, HIGHER).unwrap();
        assert_eq!(out.len(), pcm.len());
        assert_ne!(out, pcm);
        assert!(change(&pcm, 16_000, 9).is_err());
        assert!(change(&pcm[1..], 16_000, DEEPER).is_err());
        assert!(change(&pcm, 100, DEEPER).is_err());
        assert_eq!(change(&[], 48_000, DEEPER).unwrap(), Vec::<u8>::new());
    }
}
