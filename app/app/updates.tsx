import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { Button, Card, Page, Text, Toggle } from '../components/ui';
import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { FDROID } from '../lib/distribution';
import { CAN_GIVE, CAN_TAKE, takeFromNearby } from '../lib/give-app';
import { canInstall, clearDownloads, downloadAndInstall } from '../lib/install-update';
import { readNearbyLink } from '../lib/nearby-link';
import { readQrPhoto } from '../lib/read-qr';
import { SHELL, shellFetch, shellSystem } from '../lib/shell';
import { loadNotice, noticeSeen, onNotice, setNoticeOn } from '../lib/release-notice';
import { fetchStatement, signingOf } from '../lib/update-signature';
import { buildNumber, fetchLatestRelease, formatSize, isNewer, packageFile, RELEASES_PAGE, type Release } from '../lib/updates';
import { loadCurrentSpaceData } from '../lock/space-data';
import { space } from '../theme/colors';
import { useColors } from '../theme/context';

// Updates (Settings → General → Updates), as in LPHL FASOULI: the installed version and Check for updates.
// Only this button asks GitHub (lib/updates.ts); by itself, on Android, Erevos asks LPHL's server once
// a day whether a new version is out, and says so at the top of the chats (lib/release-notice.ts),
// which can be turned off here. On Android the new
// version downloads, is checked and installs over this one; on a computer and Sailfish OS the
// download page opens, and the note says which file there updates this one. The web app updates
// itself (pwa/), so it has no button, nor has the F-Droid build, which F-Droid updates.

const supported = (Platform.OS === 'android' && !FDROID) || SHELL !== null;
// This app's version and its build number (app.config.js sets both for releases).
const VERSION = Constants.expoConfig?.version ?? '0.0.0';
const CURRENT_BUILD = buildNumber(Constants.expoConfig?.extra?.build, VERSION);
// A page cannot read GitHub's downloads itself, so on a computer and Sailfish OS the shell asks.
const latestFrom = (SHELL ? (_url: unknown, init?: RequestInit) => shellFetch('/__latest', init) : fetch) as typeof fetch;

export default function UpdatesScreen() {
  const colors = useColors();
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  // Whether a new version is told at the top of the chats; null until read, and where none is told.
  const [telling, setTelling] = useState<boolean | null>(null);

  // A new version told of is seen once this opens.
  useEffect(() => {
    if (Platform.OS !== 'android' || FDROID) return;
    const read = () => void loadNotice().then((kept) => setTelling(kept.on), () => undefined);
    read();
    noticeSeen().catch(() => undefined);
    return onNotice(read);
  }, []);

  // A package downloaded earlier is installed by now, or was not wanted.
  useEffect(() => {
    try {
      clearDownloads();
    } catch {
      // Tried again next time.
    }
    return () => abort.current?.abort();
  }, []);

  async function install(release: Release) {
    const controller = new AbortController();
    abort.current = controller;
    setProgress({ received: 0, total: release.apk?.size ?? 0 });
    try {
      await downloadAndInstall(release, (received, total) => setProgress({ received, total }), controller.signal);
      setNote(t('Android shows its installer: tap Install. Erevos closes and opens as the new version, with everything kept.'));
    } catch (error) {
      if (!controller.signal.aborted) setNote(error instanceof Error ? error.message : String(error));
    } finally {
      abort.current = null;
      setProgress(null);
    }
  }

  // Erevos from a phone nearby with no internet (lib/give-app.ts): its QR code names the package's
  // SHA-256, and Erevos installs it only when it is Erevos signed as this one is, and newer.
  async function fromNearby() {
    setNote('');
    let text: string | null;
    try {
      text = await readQrPhoto('camera');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
      return;
    }
    if (text === null) return;
    const link = readNearbyLink(text);
    if (!link) {
      setNote(t('That is not the code of a phone giving Erevos.'));
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setProgress({ received: 0, total: 0 });
    try {
      const version = await takeFromNearby(link, (received, total) => setProgress({ received, total }), controller.signal);
      setNote(t('Erevos {version} came whole and is signed as this one is. Android shows its installer: tap Install. Erevos closes and opens as the new version, with everything kept.', { version }));
    } catch (error) {
      if (!controller.signal.aborted) setNote(error instanceof Error ? error.message : String(error));
    } finally {
      abort.current = null;
      setProgress(null);
    }
  }

  async function check() {
    setNote('');
    // A check outside Tor would show GitHub this device's internet address while the owner asked
    // for it to be hidden.
    const data = await loadCurrentSpaceData().catch(() => null);
    if (data?.tor === 'all') {
      setNote(
        t('Everything in this space goes through Tor, and this check would go to GitHub without it, showing your internet address. Choose Messages under Tor for a moment to check, or open the releases page in Tor Browser.'),
      );
      return;
    }
    setChecking(true);
    let release: Release | null;
    try {
      release = await fetchLatestRelease(latestFrom);
    } catch {
      setNote(t('GitHub could not be reached. Check the internet connection and try again.'));
      return;
    } finally {
      setChecking(false);
    }
    if (!release) {
      setNote(t('No release was found yet.'));
      return;
    }
    if (!CURRENT_BUILD) {
      setNote(t('This Erevos was built on a computer, so it does not update itself. The newest release is {version}: User guide → Updates says how to switch to it.', { version: release.version }));
      return;
    }
    if (!isNewer(release, CURRENT_BUILD)) {
      setNote(t('Erevos is up to date ({version}).', { version: VERSION }));
      return;
    }
    const found = release;
    const installable = canInstall && found.apk !== null;
    // An APK installs only once the release computer signed it (lib/update-signature.ts).
    // The note says which of the three stopped it, so that a server out of reach is not taken for a
    // bad signature.
    if (installable) {
      setChecking(true);
      let signing: Awaited<ReturnType<typeof signingOf>>;
      try {
        signing = await signingOf(await fetchStatement(), found);
      } catch (error) {
        setNote(
          t("Erevos {version} is out, but the web app's server, which holds the release computer's signature of it, could not be reached ({error}), so it does not install. Check the internet connection and try again.", {
            version: found.version,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
        return;
      } finally {
        setChecking(false);
      }
      if (signing === 'not yet') {
        setNote(t('Erevos {version} is out, but the release computer has not signed it yet, so it does not install. Try again later.', { version: found.version }));
        return;
      }
      if (signing === 'refused') {
        setNote(
          t("Erevos {version} is out, but the signature on the web app's server does not match it, or this Erevos could not check it, so it does not install. Try again later.", { version: found.version }),
        );
        return;
      }
    }
    const file = packageFile(SHELL, shellSystem());
    ask(
      t('Erevos {version} is out', { version: found.version }),
      [
        found.date ? t('Released {date}.', { date: found.date }) : '',
        t('Updating keeps your contacts, chats and settings. A backup first (Settings → Data and devices → Backups → Make a backup) covers any surprise.'),
        installable
          ? t('It downloads ({size}), is checked against the release and installs over this one.', { size: formatSize(found.apk!.size) })
          : file
            ? t('The download page opens: take {file}, see User guide → Updates.', { file })
            : t('The download page opens: take the file for this system, see User guide → Updates.'),
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
        { text: t('Not now'), style: 'cancel' },
        { text: t('Backups'), onPress: () => router.push('/backup') },
        {
          text: installable ? t('Install') : t('Open download page'),
          onPress: () => {
            if (installable) void install(found);
            else void Linking.openURL(RELEASES_PAGE).catch(() => setNote(t('Open {url} in a browser.', { url: RELEASES_PAGE })));
          },
        },
      ],
    );
  }

  const share = progress && progress.total > 0 ? Math.min(1, progress.received / progress.total) : 0;
  return (
    <Page>
      <Text variant="title">{t('Updates')}</Text>
      <Card>
        <Text variant="caption" tone="muted">
          {t('Installed')}
        </Text>
        <Text variant="heading">Erevos {VERSION}</Text>
        <Button title={t("What's new")} kind="secondary" onPress={() => router.push('/whats-new')} />
      </Card>
      {supported ? (
        <Card>
          <Text tone="muted">
            {t("Erevos asks GitHub for updates only when you tap the button: a regular check would tell GitHub that this device has Erevos. GitHub then sees this device's internet address, nothing else, and on Android so does the web app's server, which holds the release computer's signature of the update.")}
          </Text>
          {telling !== null ? (
            <>
              <Pressable
                onPress={() => void setNoticeOn(!telling).catch(() => undefined)}
                accessibilityRole="switch"
                accessibilityState={{ checked: telling }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
              >
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {t('Tell me when a new version is out')}
                </Text>
                <Toggle on={telling} />
              </Pressable>
              <Text variant="caption" tone="muted">
                {telling
                  ? t("Once a day Erevos asks LPHL's server, which runs the relay too, whether a new version is out, and says so at the top of the chats and in a notice. It asks only while this space uses LPHL's relay and does not send everything through Tor, so the server learns nothing it did not know. The answer counts only when signed by the release computer.")
                  : t('Erevos does not ask whether a new version is out: only Check for updates tells you.')}
              </Text>
            </>
          ) : null}
          {progress ? (
            <View style={{ gap: space.sm }}>
              <Text variant="bodyStrong">{t('Downloading…')}</Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(share * 100)}%`, height: 8, backgroundColor: colors.primary }} />
              </View>
              <Text variant="caption" tone="muted">
                {formatSize(progress.received)} / {formatSize(progress.total)}
              </Text>
              <Button title={t('Cancel')} kind="secondary" onPress={() => abort.current?.abort()} />
            </View>
          ) : (
            <>
              <Button title={t('Check for updates')} onPress={() => void check()} loading={checking} />
              {CAN_TAKE ? <Button title={t('From a phone nearby')} kind="secondary" onPress={() => void fromNearby()} /> : null}
            </>
          )}
          {note ? <Text tone="muted">{note}</Text> : null}
        </Card>
      ) : FDROID ? (
        <Card>
          <Text tone="muted">{t('This Erevos comes from F-Droid, which updates it: a new version shows in F-Droid, under Updates.')}</Text>
        </Card>
      ) : (
        <Card>
          <Text tone="muted">{t('This web app updates itself: a new signed version is taken the next time Erevos opens.')}</Text>
        </Card>
      )}
      {CAN_GIVE ? <Button title={t('Give Erevos to a phone nearby')} kind="secondary" onPress={() => router.push('/give-app')} /> : null}
      <Button title={t('How updating works')} kind="secondary" onPress={() => router.push({ pathname: '/guide/[id]', params: { id: 'updates' } })} />
    </Page>
  );
}
