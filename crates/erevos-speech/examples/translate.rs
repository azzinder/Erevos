// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Translates text with a model file, to try it:
//   cargo run --release -p erevos-speech --example translate -- <model.gguf> "<text>"

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let start = std::time::Instant::now();
    let mut model = erevos_speech::Translator::open_unchecked(std::path::Path::new(&args[1]))?;
    eprintln!("opened in {:?}", start.elapsed());
    let start = std::time::Instant::now();
    let text = model.translate(&args[2])?;
    eprintln!("translated in {:?}", start.elapsed());
    println!("{text}");
    Ok(())
}
