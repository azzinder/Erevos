// Release signing. Expo's Android project signs release builds with the public debug key; this
// makes the release build use Erevos's own key instead whenever android/app/release.keystore is
// there (the release workflow writes it from the ANDROID_KEYSTORE_BASE64 secret, see
// .github/workflows/release.yml and scripts/make-release-keystore.sh). Its passwords and alias
// come from Gradle properties or environment variables of the same names. Without the file (a
// build on a computer) nothing changes, unless EREVOS_UNSIGNED is set: then the release APK is left
// unsigned, to be compared with a published one (docs/reproducible-builds.md).
const { withAppBuildGradle } = require('expo/config-plugins');

const GRADLE = `
// --- Release signing (plugins/with-release-signing.js) ---
def erevosReleaseKeystore = file('release.keystore')
if (erevosReleaseKeystore.exists()) {
    def erevosSigning = { String name ->
        def value = findProperty(name) ?: System.getenv(name)
        if (!value) throw new GradleException("release.keystore is present but \$name is not set (release signing)")
        value.toString()
    }
    android.signingConfigs.create('erevosRelease') {
        storeFile erevosReleaseKeystore
        storePassword erevosSigning('ANDROID_KEYSTORE_PASSWORD')
        keyAlias erevosSigning('ANDROID_KEY_ALIAS')
        keyPassword erevosSigning('ANDROID_KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.erevosRelease
} else if (System.getenv('EREVOS_UNSIGNED')) {
    // An unsigned release APK, to compare with a published one (scripts/reproduce-apk.sh).
    android.buildTypes.release.signingConfig = null
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('with-release-signing')) c.modResults.contents += GRADLE;
    return c;
  });
};
