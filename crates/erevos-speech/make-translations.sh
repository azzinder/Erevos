#!/bin/sh

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Makes the ten translation model files the app takes (src/lib.rs TRANSLATIONS), from Helsinki-NLP's
# OPUS-MT models on Hugging Face at the revisions below (those with model.safetensors), into
# <out folder>, and prints their SHA-256, which must be those in TRANSLATIONS. Run from the
# repository's root:
#
#   sh crates/erevos-speech/make-translations.sh <work folder> <out folder>
set -eu

work=${1:?work folder}
out=${2:?out folder}
mkdir -p "$work" "$out"
cargo build --release -p erevos-speech --example make_translation

# Hugging Face name, revision, the language it reads, the one it writes.
while read -r name rev from to; do
	dir=$work/$name
	mkdir -p "$dir"
	for f in config.json vocab.json source.spm model.safetensors; do
		if [ ! -s "$dir/$f" ]; then
			curl -fsSL -o "$dir/$f" "https://huggingface.co/Helsinki-NLP/$name/resolve/$rev/$f"
		fi
	done
	./target/release/examples/make_translation "$dir" "$from" "$to" "$out/erevos-opus-$from-$to-q8.gguf"
done <<'LIST'
opus-mt-grk-en ac5f7495cab983e71b6d0a32027747f0c148ce2b el en
opus-mt-en-el d5fb4a45d9219cc45472fc84102f1d920152a0b5 en el
opus-mt-de-en 8be33f00bcaf451dc5ed05fdd94282649696b8e7 de en
opus-mt-en-de 73d41abacc3107122955929d3f6e2407ac52a0e0 en de
opus-mt-es-en d7a4e7e03d08f8aa6ed2948f8f52d0285bed7cce es en
opus-mt-en-es 8a8ff40364ed947066045b4f2504f58f029c7040 en es
opus-mt-fr-en c4aed37b318c763fd177aa449b44e3b783cc6c02 fr en
opus-mt-en-fr aca69acf54f699c9f5b217f02c30dea009311638 en fr
opus-mt-it-en 3a1b763a296ef5e4dbc9c6f12c014447ba61c88e it en
opus-mt-en-it 4106a035fb5cb94073793de781668e47c13015cb en it
LIST
(cd "$out" && sha256sum erevos-opus-*-q8.gguf)
