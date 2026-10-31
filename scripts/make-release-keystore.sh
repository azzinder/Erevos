#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Makes the key that signs the Android releases, once. The release workflow
# (.github/workflows/release.yml) reads it from the repository's Actions secrets:
#   ANDROID_KEYSTORE_BASE64    the keystore file, base64
#   ANDROID_KEYSTORE_PASSWORD  its password
#   ANDROID_KEY_ALIAS          the key's alias (erevos below)
#   ANDROID_KEY_PASSWORD       the key's password (the same as the keystore's:
#                              PKCS12 keystores keep one password)
# Keep the keystore file and its password safe and out of the repository: Android installs
# an update only over an app signed with the same key, so a lost key means every phone has
# to uninstall Erevos and restore a backup.
#
# Usage: scripts/make-release-keystore.sh [FILE]   (default ~/.erevos/erevos-release.keystore)
set -euo pipefail

file=${1:-$HOME/.erevos/erevos-release.keystore}
alias=erevos

if [ -e "$file" ]; then
  echo "$file exists already; not touching it" >&2
  exit 1
fi
command -v keytool > /dev/null || { echo "keytool (part of a JDK) is needed" >&2; exit 1; }
mkdir -p "$(dirname "$file")"

read -r -s -p "Password for the keystore and the key (at least 8 characters): " password
echo
read -r -s -p "Again: " again
echo
[ "$password" = "$again" ] || { echo "The passwords differ" >&2; exit 1; }
[ ${#password} -ge 8 ] || { echo "Too short" >&2; exit 1; }

keytool -genkeypair -keystore "$file" -storetype PKCS12 -alias "$alias" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$password" -keypass "$password" -dname "CN=Erevos, O=LPHL, C=GR"
chmod 600 "$file"

echo
echo "Made $file (alias $alias). Its fingerprints:"
keytool -list -v -keystore "$file" -storepass "$password" -alias "$alias" | grep -E '^\s+SHA(1|256):'
echo
echo "Add four secrets to the repository (Settings → Secrets and variables → Actions):"
echo "  ANDROID_KEYSTORE_BASE64   the line printed below"
echo "  ANDROID_KEYSTORE_PASSWORD the password you typed"
echo "  ANDROID_KEY_ALIAS         $alias"
echo "  ANDROID_KEY_PASSWORD      the same password"
echo
echo "ANDROID_KEYSTORE_BASE64 (one line):"
base64 -w0 "$file"
echo
