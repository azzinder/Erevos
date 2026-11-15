// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Makes the one model file the app takes (src/lib.rs), from OpenAI's Whisper as Hugging Face
// keeps it (openai/whisper-small: config.json, tokenizer.json, model.safetensors, MIT licence):
// its matrices 8-bit (Q8_0), the rest as they are, with the model's sizes and tokens beside them.
//
//   cargo run --release -p erevos-speech --example make_model -- <folder> <out.gguf>
//
// The same input makes the same file, so its SHA-256 can be checked by anyone.

use std::collections::{BTreeMap, HashMap};

use candle_core::quantized::gguf_file::{self, Value};
use candle_core::quantized::{GgmlDType, QTensor};
use candle_core::{DType, Device};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let (dir, out) = (&args[1], &args[2]);
    let config: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(format!("{dir}/config.json"))?)?;
    let tokenizer: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(format!("{dir}/tokenizer.json"))?)?;
    let n = |k: &str| Value::U32(config[k].as_u64().unwrap_or_else(|| panic!("{k}")) as u32);

    // Every token by its id: the vocabulary's, then those added (specials, languages).
    let mut by_id: BTreeMap<u32, String> = BTreeMap::new();
    for (s, id) in tokenizer["model"]["vocab"].as_object().ok_or("vocab")? {
        by_id.insert(id.as_u64().ok_or("id")? as u32, s.clone());
    }
    let mut special: HashMap<String, u32> = HashMap::new();
    for t in tokenizer["added_tokens"].as_array().ok_or("added_tokens")? {
        let (s, id) = (
            t["content"].as_str().ok_or("content")?.to_string(),
            t["id"].as_u64().ok_or("id")? as u32,
        );
        by_id.insert(id, s.clone());
        special.insert(s, id);
    }
    let vocab = config["vocab_size"].as_u64().ok_or("vocab_size")? as u32;
    let tokens: Vec<Value> = (0..vocab)
        .map(|id| Value::String(by_id.get(&id).cloned().unwrap_or_default()))
        .collect();
    let sot = special["<|startoftranscript|>"];
    let translate = special["<|translate|>"];
    // The languages' tokens lie between the start and translate, in order.
    let languages: Vec<Value> = (sot + 1..translate)
        .map(|id| {
            Value::String(
                by_id[&id]
                    .trim_start_matches("<|")
                    .trim_end_matches("|>")
                    .to_string(),
            )
        })
        .collect();

    let id = |s: &str| Value::U32(special[s]);
    let metadata: Vec<(&str, Value)> = vec![
        ("general.architecture", Value::String("whisper".into())),
        ("whisper.d_model", n("d_model")),
        ("whisper.mels", n("num_mel_bins")),
        ("whisper.encoder_layers", n("encoder_layers")),
        ("whisper.decoder_layers", n("decoder_layers")),
        ("whisper.encoder_heads", n("encoder_attention_heads")),
        ("whisper.decoder_heads", n("decoder_attention_heads")),
        ("whisper.audio_ctx", n("max_source_positions")),
        ("whisper.text_ctx", n("max_target_positions")),
        ("whisper.sot", Value::U32(sot)),
        ("whisper.eot", id("<|endoftext|>")),
        ("whisper.transcribe", id("<|transcribe|>")),
        ("whisper.no_timestamps", id("<|notimestamps|>")),
        ("whisper.first_language", Value::U32(sot + 1)),
        ("whisper.languages", Value::Array(languages)),
        ("whisper.tokens", Value::Array(tokens)),
    ];

    // In a set order, so the file is the same each time.
    let weights: BTreeMap<String, candle_core::Tensor> =
        candle_core::safetensors::load(format!("{dir}/model.safetensors"), &Device::Cpu)?
            .into_iter()
            .collect();
    let mut quantized: Vec<(String, QTensor)> = Vec::new();
    for (name, t) in weights {
        // proj_out is the embedding again, unused here.
        if name == "proj_out.weight" {
            continue;
        }
        let t = t.to_dtype(DType::F32)?;
        let dims = t.dims().to_vec();
        let kind = if dims.len() == 2 && dims[1] % 32 == 0 && !name.contains("embed_positions") {
            GgmlDType::Q8_0
        } else {
            GgmlDType::F32
        };
        quantized.push((name, QTensor::quantize(&t, kind)?));
    }
    let meta: Vec<(&str, &Value)> = metadata.iter().map(|(k, v)| (*k, v)).collect();
    let tensors: Vec<(&str, &QTensor)> = quantized.iter().map(|(k, v)| (k.as_str(), v)).collect();
    gguf_file::write(&mut std::fs::File::create(out)?, &meta, &tensors)?;
    Ok(())
}
