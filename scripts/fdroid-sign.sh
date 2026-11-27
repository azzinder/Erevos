#!/bin/bash

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Signs an F-Droid APK that scripts/fdroid-build.sh built, adding the signature and changing nothing
# else, then checks that: F-Droid copies the signature onto its own build of the same commit
# (apksigcopier) and hands out the signed APK only if it then verifies. An APK Signature Scheme v2
# signature, as Gradle signs the release APK (no v1 from Android 7 up, no v3), so the two are signed
# alike. Needs the Android SDK's build-tools (ANDROID_HOME) and apksigcopier.
#
#   scripts/fdroid-sign.sh <unsigned APK> <signed APK to write>
#
# with the keystore's file in ANDROID_KEYSTORE and ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and
# ANDROID_KEY_PASSWORD set.

set -euo pipefail

in=${1:?unsigned APK} out=${2:?signed APK to write}
: "${ANDROID_KEYSTORE:?}" "${ANDROID_KEYSTORE_PASSWORD:?}" "${ANDROID_KEY_ALIAS:?}" "${ANDROID_KEY_PASSWORD:?}"
tools="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
export PATH="$tools:$PATH"

apksigner sign --ks "$ANDROID_KEYSTORE" --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:ANDROID_KEYSTORE_PASSWORD --key-pass env:ANDROID_KEY_PASSWORD \
  --alignment-preserved true --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled false \
  --v4-signing-enabled false --out "$out" "$in"
apksigner verify --print-certs "$out"
# The signed APK is the unsigned one and its signature, nothing else.
apksigcopier compare --unsigned "$out" "$in"
echo "Signed: the signature copied onto $in verifies."
