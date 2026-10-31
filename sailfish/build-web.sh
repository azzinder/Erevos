#!/bin/sh

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Puts the app's web build, with its core in WebAssembly, into sailfish/web for the package, and
# copies the icons into sailfish/icons. Needs what app/scripts/build-web-core.mjs needs (Rust with
# the wasm32-unknown-unknown target and wasm-bindgen-cli 0.2.129) and Node. Then build the RPM
# with the Sailfish SDK (README.md).
set -eu

here=$(cd "$(dirname "$0")" && pwd)
root=$(dirname "$here")

cd "$root/app"
npm ci --no-audit --no-fund
node scripts/build-web-core.mjs
rm -rf "$here/web"
EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_SHELL=sailfish npx expo export --clear --platform web --output-dir "$here/web"
test -f "$here/web/core/erevos_ffi_bg.wasm"

# Sailfish WebView is Gecko 91: what the build needs and it lacks comes first.
cp "$here/polyfills.js" "$here/web/polyfills.js"
node -e '
const fs = require("fs");
const file = process.argv[1];
const html = fs.readFileSync(file, "utf8");
if (!html.includes("<script src=\"/_expo/")) throw new Error("index.html has no app script");
fs.writeFileSync(file, html.replace("<script src=\"/_expo/", "<script src=\"/polyfills.js\"></script>\n  <script src=\"/_expo/"));
' "$here/web/index.html"

# The icons are the artwork in brand/, as they are.
for size in 86 108 128 172; do
  mkdir -p "$here/icons/${size}x${size}"
  cp "$root/brand/png/sailfish/icon-$size.png" "$here/icons/${size}x${size}/erevos.png"
done
echo "Web build in $here/web, icons in $here/icons."
