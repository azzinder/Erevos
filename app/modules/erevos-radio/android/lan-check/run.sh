#!/bin/sh

# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

# Checks LanLink.kt against desktop/lan.js on this computer, without a phone: compiles it with
# the Android classes (android-all from Maven Central) and links it to the desktop app's side
# over real UDP broadcasts and TCP. Needs Java 17+, Maven and Node.
set -e
here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/src/main/kotlin" "$work/src/test/kotlin"
cp "$here/../src/main/java/expo/modules/erevosradio/LanLink.kt" "$here/../src/main/java/expo/modules/erevosradio/Framing.kt" "$work/src/main/kotlin/"
cp "$here/LanInteropTest.kt" "$work/src/test/kotlin/"
cp "$here/pom.xml" "$work/"
cd "$work" && mvn -q -B test -DechoScript="$here/echo.cjs"
echo "LanLink and desktop/lan.js linked and talked."
