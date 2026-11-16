// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Makes a translation model file the app takes (src/marian.rs), from a Helsinki-NLP OPUS-MT model
// as Hugging Face keeps it (for example Helsinki-NLP/opus-mt-en-el: config.json, vocab.json,
// source.spm, model.safetensors; CC-BY 4.0 / Apache-2.0): its matrices 8-bit (Q8_0), the rest as
// they are, with the model's sizes, its source pieces and its tokens beside them. `from` and `to`
// name the languages it reads and writes, as the app names them.
//
//   cargo run --release -p erevos-speech --example make_translation -- <folder> <from> <to> <out.gguf>
//
// The same input makes the same file, so its SHA-256 can be checked by anyone. make-translations.sh
// makes all ten the app takes, from the revisions it names.

use std::collections::{BTreeMap, HashMap};

use candle_core::quantized::gguf_file::{self, Value};
use candle_core::quantized::{GgmlDType, QTensor};
use candle_core::{DType, Device};

fn varint(b: &[u8], i: &mut usize) -> Result<u64, &'static str> {
    let (mut v, mut shift) = (0u64, 0);
    loop {
        let x = *b.get(*i).ok_or("short")?;
        *i += 1;
        v |= u64::from(x & 0x7f) << shift;
        if x & 0x80 == 0 {
            return Ok(v);
        }
        shift += 7;
    }
}

// Skips a field of protobuf wire type `w` at `i`, or reads it as bytes (type 2).
fn field<'a>(b: &'a [u8], i: &mut usize, w: u64) -> Result<Option<&'a [u8]>, &'static str> {
    match w {
        0 => {
            varint(b, i)?;
            Ok(None)
        }
        1 => {
            *i += 8;
            Ok(None)
        }
        5 => {
            *i += 4;
            Ok(None)
        }
        2 => {
            let n = varint(b, i)? as usize;
            let s = b.get(*i..*i + n).ok_or("short")?;
            *i += n;
            Ok(Some(s))
        }
        _ => Err("wire type"),
    }
}

// A SentencePiece model's pieces (ModelProto field 1: piece 1, score 2, type 3), NORMAL (1) and
// USER_DEFINED (4) only.
fn spm_pieces(b: &[u8]) -> Result<Vec<(String, f32)>, Box<dyn std::error::Error>> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < b.len() {
        let key = varint(b, &mut i)?;
        let Some(sub) = field(b, &mut i, key & 7)? else {
            continue;
        };
        if key >> 3 != 1 {
            continue;
        }
        let (mut piece, mut score, mut kind) = (String::new(), 0f32, 1u64);
        let mut j = 0;
        while j < sub.len() {
            let k = varint(sub, &mut j)?;
            match (k >> 3, k & 7) {
                (1, 2) => {
                    piece = String::from_utf8(field(sub, &mut j, 2)?.ok_or("piece")?.to_vec())?
                }
                (2, 5) => {
                    score = f32::from_le_bytes(sub.get(j..j + 4).ok_or("score")?.try_into()?);
                    j += 4;
                }
                (3, 0) => kind = varint(sub, &mut j)?,
                (_, w) => {
                    field(sub, &mut j, w)?;
                }
            }
        }
        if kind == 1 || kind == 4 {
            out.push((piece, score));
        }
    }
    Ok(out)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let (dir, from, to, out) = (&args[1], &args[2], &args[3], &args[4]);
    let config: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(format!("{dir}/config.json"))?)?;
    let vocab: HashMap<String, u32> =
        serde_json::from_str(&std::fs::read_to_string(format!("{dir}/vocab.json"))?)?;
    let n = |k: &str| -> Result<u32, String> {
        Ok(config[k].as_u64().ok_or_else(|| k.to_string())? as u32)
    };
    if config["normalize_before"].as_bool() != Some(false)
        || config["activation_function"].as_str() != Some("swish")
        || config["scale_embedding"].as_bool() != Some(true)
        // Older configs leave it out, as shared is Marian's own way.
        || config["share_encoder_decoder_embeddings"].as_bool() == Some(false)
        || n("encoder_attention_heads")? != n("decoder_attention_heads")?
    {
        return Err("not a Marian model as src/marian.rs reads one".into());
    }
    let size = n("vocab_size")?;
    let mut by_id: BTreeMap<u32, String> = BTreeMap::new();
    for (s, id) in &vocab {
        by_id.insert(*id, s.clone());
    }
    let tokens: Vec<Value> = (0..size)
        .map(|id| Value::String(by_id.get(&id).cloned().unwrap_or_default()))
        .collect();
    let unk = vocab["<unk>"];
    // In the source model's order, so the file is the same each time.
    let pieces = spm_pieces(&std::fs::read(format!("{dir}/source.spm"))?)?;
    let names = pieces
        .iter()
        .map(|(p, _)| Value::String(p.clone()))
        .collect();
    let scores = pieces.iter().map(|(_, s)| Value::F32(*s)).collect();
    let ids = pieces
        .iter()
        .map(|(p, _)| Value::U32(vocab.get(p).copied().unwrap_or(unk)))
        .collect();

    let metadata: Vec<(&str, Value)> = vec![
        ("general.architecture", Value::String("marian".into())),
        ("marian.from", Value::String(from.clone())),
        ("marian.to", Value::String(to.clone())),
        ("marian.d_model", Value::U32(n("d_model")?)),
        ("marian.heads", Value::U32(n("encoder_attention_heads")?)),
        ("marian.encoder_layers", Value::U32(n("encoder_layers")?)),
        ("marian.decoder_layers", Value::U32(n("decoder_layers")?)),
        (
            "marian.max_positions",
            Value::U32(n("max_position_embeddings")?),
        ),
        ("marian.eos", Value::U32(n("eos_token_id")?)),
        ("marian.pad", Value::U32(n("pad_token_id")?)),
        ("marian.unk", Value::U32(unk)),
        ("marian.source_pieces", Value::Array(names)),
        ("marian.source_scores", Value::Array(scores)),
        ("marian.source_ids", Value::Array(ids)),
        ("marian.tokens", Value::Array(tokens)),
    ];

    let mut weights: BTreeMap<String, candle_core::Tensor> =
        candle_core::safetensors::load(format!("{dir}/model.safetensors"), &Device::Cpu)?
            .into_iter()
            .collect();
    // A file that keeps the shared embeddings once may keep them under the decoder's name.
    if !weights.contains_key("model.shared.weight") {
        let t = weights
            .get("model.decoder.embed_tokens.weight")
            .ok_or("no embeddings")?
            .clone();
        weights.insert("model.shared.weight".into(), t);
    }
    let mut quantized: Vec<(String, QTensor)> = Vec::new();
    for (name, t) in weights {
        // The embeddings are shared (model.shared), and the positions made when opened.
        if name.contains("embed_tokens")
            || name.contains("embed_positions")
            || name == "lm_head.weight"
        {
            continue;
        }
        let t = t.to_dtype(DType::F32)?;
        let dims = t.dims().to_vec();
        let kind = if dims.len() == 2 && dims[1] % 32 == 0 && name != "final_logits_bias" {
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
