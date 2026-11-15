// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The log-mel spectrogram Whisper hears, as OpenAI's own whisper/audio.py makes it: 30 seconds
// at 16 kHz padded with silence, a Hann window of 400 samples every 160 (centred, the edges
// mirrored), the power of each frequency, weighed into mel bands (Slaney's, as librosa makes
// them), its log10, held within 8 of its loudest, then shifted and scaled.

/// Samples in one window, and frames of the spectrogram in one.
pub const WINDOW: usize = 480_000;
pub const FRAMES: usize = 3_000;
const N_FFT: usize = 400;
const HOP: usize = 160;
const BINS: usize = N_FFT / 2 + 1;

/// The mel bands' weights for each frequency, `mels` × BINS, by rows.
pub fn filters(mels: usize) -> Vec<f32> {
    let sr = 16_000f64;
    let f_sp = 200.0 / 3.0;
    let (min_log_hz, min_log_mel) = (1000.0, 1000.0 / f_sp);
    let logstep = 6.4f64.ln() / 27.0;
    let to_mel = |f: f64| {
        if f >= min_log_hz {
            min_log_mel + (f / min_log_hz).ln() / logstep
        } else {
            f / f_sp
        }
    };
    let to_hz = |m: f64| {
        if m >= min_log_mel {
            min_log_hz * (logstep * (m - min_log_mel)).exp()
        } else {
            f_sp * m
        }
    };
    let top = to_mel(sr / 2.0);
    let edges: Vec<f64> = (0..mels + 2)
        .map(|i| to_hz(top * i as f64 / (mels + 1) as f64))
        .collect();
    let mut out = vec![0f32; mels * BINS];
    for m in 0..mels {
        let norm = 2.0 / (edges[m + 2] - edges[m]);
        for k in 0..BINS {
            let f = k as f64 * sr / N_FFT as f64;
            let rise = (f - edges[m]) / (edges[m + 1] - edges[m]);
            let fall = (edges[m + 2] - f) / (edges[m + 2] - edges[m + 1]);
            out[m * BINS + k] = (rise.min(fall).max(0.0) * norm) as f32;
        }
    }
    out
}

/// The spectrogram of `samples` (WINDOW at most, padded with silence to it): `mels` × FRAMES, by rows.
pub fn spectrogram(samples: &[f32], filters: &[f32], mels: usize) -> Vec<f32> {
    let mut padded = vec![0f32; WINDOW + N_FFT];
    // Centred: N_FFT/2 mirrored at the start; the end is silence, mirrored as silence.
    let half = N_FFT / 2;
    let n = samples.len().min(WINDOW);
    padded[half..half + n].copy_from_slice(&samples[..n]);
    for i in 0..half {
        padded[half - 1 - i] = if n > i + 1 { samples[i + 1] } else { 0.0 };
    }
    let hann: Vec<f32> = (0..N_FFT)
        .map(|i| 0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / N_FFT as f32).cos())
        .collect();
    let (cos, sin): (Vec<f32>, Vec<f32>) = (0..BINS * N_FFT)
        .map(|i| {
            let (k, t) = (i / N_FFT, i % N_FFT);
            let a = 2.0 * std::f64::consts::PI * ((k * t) % N_FFT) as f64 / N_FFT as f64;
            (a.cos() as f32, a.sin() as f32)
        })
        .unzip();
    let mut power = vec![0f32; BINS];
    let mut frame = vec![0f32; N_FFT];
    let mut out = vec![0f32; mels * FRAMES];
    // Frames past the sound are silence: their power is none, worked out once.
    let sounding = (n + half) / HOP + 1;
    for f in 0..FRAMES {
        if f < sounding {
            for t in 0..N_FFT {
                frame[t] = padded[f * HOP + t] * hann[t];
            }
            for k in 0..BINS {
                let (c, s) = (
                    &cos[k * N_FFT..(k + 1) * N_FFT],
                    &sin[k * N_FFT..(k + 1) * N_FFT],
                );
                let (mut re, mut im) = (0f32, 0f32);
                for t in 0..N_FFT {
                    re += frame[t] * c[t];
                    im += frame[t] * s[t];
                }
                power[k] = re * re + im * im;
            }
        } else {
            power.iter_mut().for_each(|p| *p = 0.0);
        }
        for m in 0..mels {
            let w = &filters[m * BINS..(m + 1) * BINS];
            let e: f32 = w.iter().zip(&power).map(|(a, b)| a * b).sum();
            out[m * FRAMES + f] = e.max(1e-10).log10();
        }
    }
    let loudest = out.iter().copied().fold(f32::MIN, f32::max);
    for v in out.iter_mut() {
        *v = (v.max(loudest - 8.0) + 4.0) / 4.0;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bands_cover_the_frequencies_once_each() {
        let f = filters(80);
        assert_eq!(f.len(), 80 * BINS);
        // Each band has some weight, and the lowest bin (0 Hz) none.
        for m in 0..80 {
            assert!(
                f[m * BINS..(m + 1) * BINS].iter().any(|w| *w > 0.0),
                "band {m}"
            );
        }
        assert_eq!(f[0], 0.0);
    }

    #[test]
    fn a_tone_is_loudest_in_its_band() {
        let tone: Vec<f32> = (0..16_000)
            .map(|i| (2.0 * std::f32::consts::PI * 1000.0 * i as f32 / 16_000.0).sin() * 0.5)
            .collect();
        let f = filters(80);
        let s = spectrogram(&tone, &f, 80);
        let frame = 50;
        let loudest = (0..80)
            .max_by(|a, b| s[a * FRAMES + frame].total_cmp(&s[b * FRAMES + frame]))
            .unwrap();
        // 1 kHz sits about 28 bands up on Slaney's scale of 80 bands to 8 kHz.
        assert!((25..=32).contains(&loudest), "band {loudest}");
        // After the sound, silence: the floor.
        assert!(s[loudest * FRAMES + 2000] < s[loudest * FRAMES + frame]);
    }
}
