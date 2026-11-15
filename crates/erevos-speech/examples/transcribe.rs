// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Writes out a WAV (16-bit mono) with a model file, to try it:
//   cargo run --release -p erevos-speech --example transcribe -- <model.gguf> <sound.wav> [language]

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let wav = std::fs::read(&args[2])?;
    // The samples start after "data" and its length; the rate is at 24.
    let at = wav
        .windows(4)
        .position(|w| w == b"data")
        .ok_or("not a WAV")?
        + 8;
    let rate = u32::from_le_bytes(wav[24..28].try_into()?);
    let start = std::time::Instant::now();
    let mut model = erevos_speech::Model::open_unchecked(std::path::Path::new(&args[1]))?;
    eprintln!("opened in {:?}", start.elapsed());
    let start = std::time::Instant::now();
    let text = erevos_speech::transcribe(
        &mut model,
        &wav[at..],
        rate,
        args.get(3).map(String::as_str).unwrap_or(""),
    )?;
    eprintln!("written in {:?}", start.elapsed());
    println!("{text}");
    Ok(())
}
