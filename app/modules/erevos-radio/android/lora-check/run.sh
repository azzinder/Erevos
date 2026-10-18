#!/bin/sh
# Checks MeshtasticLink.kt on this computer, without a phone or a radio: compiles it with the
# Android classes (android-all from Maven Central), and runs MeshOps, the order of what goes to
# and from the radio. Needs Java 17+ and Maven.
set -e
here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/src/main/kotlin" "$work/src/test/kotlin"
cp "$here/../src/main/java/expo/modules/erevosradio/MeshtasticLink.kt" "$work/src/main/kotlin/"
cp "$here/MeshOpsTest.kt" "$work/src/test/kotlin/"
cp "$here/pom.xml" "$work/"
cd "$work" && mvn -q -B test
echo "MeshtasticLink compiled, and MeshOps keeps its order."
