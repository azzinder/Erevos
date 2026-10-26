#!/bin/sh
# Builds a release's Android app again from its source and says whether it comes out the same as
# the published APK, apart from the signature (docs/reproducible-builds.md):
#
#   scripts/reproduce-apk.sh 3.3.2
#
# It downloads erevos-android.apk of that release from the public download repository and checks
# it against the release's SHA256SUMS, takes the commit and build version.json names, builds that
# commit unsigned with the same steps as the apk job of .github/workflows/release.yml, then copies
# the published APK's signature onto the one built here and checks that it verifies
# (apksigcopier compare, as F-Droid does): it verifies only if every other byte is the same.
#
# Needs what that job needs (Node 22, Java 21, rustup with cargo-ndk 4.1.2, Go, the Android SDK
# with ANDROID_HOME set) and apksigcopier (pip install apksigcopier). The C++ of React Native's
# modules keeps the paths it was built at, so build in the same folder as GitHub's runner did
# (/home/runner/work/Erevos/Erevos); .github/workflows/reproduce-apk.yml does. Nothing is signed
# or sent anywhere.
set -eu

version=${1:-}
case $version in
[0-9]*.[0-9]*.[0-9]*) ;;
*)
	echo "usage: scripts/reproduce-apk.sh <version, e.g. 3.3.2> [folder to build in]" >&2
	exit 2
	;;
esac
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || git -C "${2:-.}" rev-parse --show-toplevel)
repo=${EREVOS_RELEASES_REPO:-azzinder/erevos-releases}
base=${EREVOS_RELEASES_URL:-https://github.com/$repo/releases/download}/v$version
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
src=${2:-$work/src}

echo "== Downloading the Android app of v$version"
curl -fsSL "$base/SHA256SUMS" -o "$work/SHA256SUMS"
curl -fsSL "$base/version.json" -o "$work/version.json"
curl -fL --progress-bar "$base/erevos-android.apk" -o "$work/erevos-android.apk"
(cd "$work" && grep ' erevos-android.apk$' SHA256SUMS | sha256sum -c -)
field() { node -e "const v = JSON.parse(require('fs').readFileSync(process.argv[1]))[process.argv[2]]; console.log(v ?? '')" "$1" "$2"; }
commit=$(field "$work/version.json" commit)
build=$(field "$work/version.json" build)
if [ -z "$commit" ] || [ -z "$build" ]; then
	echo "version.json of v$version does not say its commit and build." >&2
	exit 1
fi
echo "   commit $commit, build $build"

echo "== Building commit $commit in $src"
if [ "$src" != "$(git -C "$src" rev-parse --show-toplevel 2>/dev/null)" ]; then
	git clone -q --no-checkout "$root" "$src"
fi
cp "$root/app/plugins/with-release-signing.js" "$work/"
git -C "$src" checkout -q "$commit"
if ! grep -q EREVOS_UNSIGNED "$src/app/plugins/with-release-signing.js"; then
	# Made before it could build unsigned: only how Gradle signs changes, not what goes in the APK.
	cp "$work/with-release-signing.js" "$src/app/plugins/"
fi
(
	export EXPO_NO_TELEMETRY=1
	cd "$src/app"
	npm ci --no-audit --no-fund
	EREVOS_VERSION=$version EREVOS_BUILD=$build npx expo prebuild --platform android --no-install
	cd android
	EREVOS_VERSION=$version EREVOS_BUILD=$build EREVOS_UNSIGNED=1 \
		./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
) >"$work/build.log" 2>&1 || {
	tail -40 "$work/build.log" >&2
	echo "The build failed; its log is above." >&2
	exit 1
}
built=$(ls "$src"/app/android/app/build/outputs/apk/release/*.apk | head -1)

echo "== Comparing"
if apksigcopier compare --unsigned "$work/erevos-android.apk" "$built"; then
	echo "SAME as the published erevos-android.apk, apart from its signature."
else
	echo "DIFFERENT from the published erevos-android.apk. What differs: unzip -l, or diffoscope, on the two:" >&2
	cp "$built" "./erevos-android-rebuilt.apk"
	cp "$work/erevos-android.apk" "./erevos-android-published.apk"
	echo "  ./erevos-android-published.apk ./erevos-android-rebuilt.apk" >&2
	exit 1
fi
