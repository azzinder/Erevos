// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';

import { FooterLink, Glass, Highlighted, L, MainButton, StartScreen } from '../components/first-start-look';
import { askInvisible, chooseMode, useMode } from '../components/mode-picker';
import { MIN_PASSWORD } from '../components/PasswordSheet';
import { KeepStep, ModeStep, PermissionsStep } from '../components/start-steps';
import { findMoves, takeMove, type FoundMove } from '../lib/edition-move';
import { startSteps, stepAt, type StartStep } from '../lib/first-start';
import { t } from '../lib/i18n';
import { modeOf, type Mode } from '../lib/modes';
import { modulesHere } from '../lib/modules';
import { setMyNameAt } from '../lib/my-name';
import { hrefLink, holdLink } from '../lib/open-link';
import { bringsServer } from '../lib/invite-server';
import { firstServerDone, takeFirstServer, useFirstServer, wantFirstServer } from '../lib/open-place';
import { checksOffered, HAS_CHECKS } from '../lib/permissions';
import { waitForTor } from '../lib/relay';
import { keepSetupAfter, loadSetupAfter, setupAfterDone, type BackupChoice, type SetupAfter, type SetupChosen } from '../lib/setup-after';
import { dropDraft, forgetPassword, typedPassword } from '../lib/setup-draft';
import { holdReceiver } from '../lib/receiver';
import { spaceGroupsAt } from '../lib/space-groups';
import { updateEditionName } from '../lib/update-channel';
import { BiometricError, biometricOn, turnOnBiometric } from '../lock/biometric';
import { lockWithPassword } from '../lock/config';
import { useLock } from '../lock/context';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, prepareSpaces } from '../lock/space-data';
import { biometricSealer } from '../modules/erevos-biometric';

// The first start's setup, once the first space is open (components/setup.tsx, lib/setup-after.ts,
// lib/first-start.ts), in the first start's look (components/first-start-look.tsx). The name typed
// goes to the space. After the whole setup, made before the space opened, the space is open
// already in the mode chosen and locked with the password typed (app/_layout.tsx): what needs it
// open follows here by itself, the place on LPHL's server, the fingerprint or face, another
// server's page, then the backups screen, or the first home (app/index.tsx). Should Erevos have
// closed before the mode or the lock were kept, they are kept here; a password lost so, or a
// fingerprint that did not take, brings Keep it safe back for it. Moving from another phone, the
// backup is restored first, and its steps follow with the space open: the permissions and Keep it
// safe (components/start-steps.tsx); starting without a backup after all, How visible are you?
// first, its Back going back to the backup. On a computer or in a browser linked to the phone,
// Linked devices opens instead. Until done, it shows again at the next start (app/index.tsx).

// A server's host, as the status pill says it.
function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// How long LPHL's server waits for Tor, still starting as the space has just opened in INVISIBLE,
// as a backup to a server waits (lib/backup-cloud.ts): then it is asked all the same, through Tor.
const TOR_WAIT_MS = 120_000;

/** Where the whole setup is as it goes on here: at work, back at Keep it safe for what it needs
 *  again, stopped on a mode that could not be kept, or waiting on another server's page. */
type Going = 'working' | 'keep' | 'stopped' | 'server';

export default function FirstSteps() {
  const [after, setAfter] = useState<SetupAfter | null>(null);
  const [at, setAt] = useState(0);
  const [noBackup, setNoBackup] = useState(false);
  // Started without a backup after all, here: Back from the first step goes back to it.
  const [fromRestore, setFromRestore] = useState(false);
  // Another edition on this phone that made a move for this one (lib/edition-move.ts), and how far
  // taking it is, in percent (null while not taking it), or what went wrong.
  const [move, setMove] = useState<FoundMove | null>(null);
  const [taking, setTaking] = useState<number | null>(null);
  const [moveError, setMoveError] = useState('');
  const { closeNow, space, setPasswordLock, passwordLock } = useLock();
  const modules = after?.modules ?? [];
  // How visible: the mode now, the one chosen, and what went wrong choosing it.
  const mode = useMode();
  const [choice, setChoice] = useState<Mode>(mode);
  const [modeNote, setModeNote] = useState('');
  const [busy, setBusy] = useState(false);
  const server = useFirstServer();
  // Keep it safe.
  const [passwordOn, setPasswordOn] = useState(false);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [fingerprint, setFingerprint] = useState(true);
  const [locked, setLocked] = useState(false);
  const [backup, setBackup] = useState<BackupChoice | null>(null);
  const [warning, setWarning] = useState(false);
  const [error, setError] = useState('');
  // The whole setup, as it goes on here (goOn), once; and the backups, past another server's page.
  const [going, setGoing] = useState<Going>('working');
  const started = useRef(false);
  const serverPage = useRef<{ backup: BackupChoice | null } | null>(null);

  // What waits, with the name typed given to the space now that it is open.
  useEffect(() => {
    let active = true;
    void (async () => {
      let found = await loadSetupAfter();
      if (found?.name) {
        await setMyNameAt(spaceGroupsAt, found.name).catch(() => undefined);
        found = { ...found, name: '' };
        await keepSetupAfter(found).catch(() => undefined);
      }
      if (!active) return;
      // These steps ask for what the modules need: the check after a new version need not (lib/permissions.ts).
      if (found) void checksOffered();
      if (!found) {
        router.replace('/');
        return;
      }
      if (found.linkPhone) {
        await setupAfterDone();
        router.replace('/devices');
        return;
      }
      setAfter(found);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (after?.restore !== 'wanted') return;
    let active = true;
    void findMoves().then((found) => active && setMove(found[0] ?? null), () => undefined);
    return () => {
      active = false;
    };
  }, [after?.restore]);

  // The whole setup, made before the space opened, goes on by itself.
  const chosen = after && !after.restore ? (after.chosen ?? null) : null;
  useEffect(() => {
    if (!chosen || started.current) return;
    started.current = true;
    void goOn(chosen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, as what the setup chose is read
  }, [chosen]);

  // Android's back key goes back a step; on the first, it leaves, and the steps show again at the
  // next start. Not while the whole setup goes on by itself.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (chosen) return going === 'working' || going === 'server';
        if (at === 0) return false;
        setAt(at - 1);
        return true;
      });
      return () => subscription.remove();
    }, [at, chosen, going]),
  );

  // Back from another server's page: on to the backups, or home.
  useFocusEffect(
    useCallback(() => {
      const then = serverPage.current;
      if (!then) return;
      serverPage.current = null;
      void finish(then.backup ? `/backup?start=${then.backup}` : undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- on coming back to the screen, with the invite read
    }, [after]),
  );

  // Done: Erevos opens, and an invite it was opened with opens over it.
  async function finish(then?: string) {
    const invite = after?.invite;
    forgetPassword();
    await setupAfterDone();
    if (then) router.replace(then as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
    if (invite) setTimeout(() => holdLink(hrefLink(invite)), 400);
  }

  // Takes the move: what this space has now (only what these steps made) gives way to it, and
  // Erevos opens again as the other edition was, with its passwords; these steps then go on.
  async function bring(found: FoundMove) {
    setMoveError('');
    setTaking(0);
    const release = await holdReceiver();
    try {
      await takeMove(found, (done, all) => setTaking(Math.floor((done * 100) / Math.max(1, all))));
    } catch (error) {
      setMoveError(t('It could not be brought: {error}. Backups does the same by hand: make one in {edition}, then restore it here.', { error: error instanceof Error ? error.message : String(error), edition: updateEditionName(found.from) }));
      return;
    } finally {
      setTaking(null);
      release();
    }
    closeNow();
  }

  // The whole setup, chosen before the space opened (components/setup.tsx): the mode and the lock
  // again should Erevos have closed before they were kept, nothing going out in another mode
  // meanwhile; LPHL's server, with no waiting for it (in INVISIBLE once Tor is ready, or has had its
  // while); the fingerprint or face, with the password still in memory; then another server's
  // page, the backups, or home.
  async function goOn(setup: SetupChosen) {
    setGoing('working');
    setError('');
    // What the setup kept, should Erevos have closed before it went: the setup is over.
    void dropDraft();
    try {
      if (modeOf(await loadCurrentSpaceData()) !== setup.mode) await chooseMode(setup.mode);
    } catch (e) {
      setError(errorText(e));
      setGoing('stopped');
      return;
    }
    if (setup.server === 'lphl') void waitForTor(TOR_WAIT_MS).then(() => takeFirstServer());
    setBackup(setup.backup);
    setFingerprint(setup.fingerprint);
    const typed = typedPassword().password;
    // Keep it safe again, for the password: typed again, as Erevos closed before the space was locked.
    const typeAgain = (note: string) => {
      setPasswordOn(true);
      setPassword('');
      setAgain('');
      setError(note);
      setGoing('keep');
    };
    if (setup.lock && !passwordLock) {
      if (!typed) return typeAgain(t('Erevos closed before the password was kept: type it again.'));
      try {
        const other = await lockWithPassword(space, typed, currentSpace().key);
        if (other) return typeAgain(t('Use a different password.'));
        setLocked(true);
        setPasswordLock(true);
        await prepareSpaces(space + 1);
      } catch (e) {
        return typeAgain(errorText(e));
      }
    }
    if (setup.lock && setup.fingerprint && biometricSealer.available() && !(await biometricOn(biometricSealer).catch(() => false))) {
      // Erevos closed before it was set: Keep it safe says so, with the way to where Settings sets it.
      if (!typed) {
        setGoing('keep');
        return;
      }
      try {
        await turnOnBiometric(biometricSealer, space, typed, { title: t('Fingerprint or face for Erevos'), cancel: t('Cancel') });
      } catch (e) {
        if (!(e instanceof BiometricError && e.reason === 'cancelled')) {
          // The lock stays on: the error is shown, and Done goes on from there.
          setPasswordOn(true);
          setPassword(typed);
          setAgain(typed);
          setLocked(true);
          setWarning(true);
          setError(errorText(e));
          setGoing('keep');
          return;
        }
      }
    }
    forgetPassword();
    await onward(setup.server, setup.backup);
  }

  // Another server chosen, and none set yet: its page first, the backups once back from it.
  async function onward(to: SetupChosen['server'], kept: BackupChoice | null) {
    const data = await loadCurrentSpaceData().catch(() => null);
    if (to === 'other' && !data?.url.trim()) {
      serverPage.current = { backup: kept };
      setGoing('server');
      router.push('/chat?setup=relay');
      return;
    }
    await finish(kept ? `/backup?start=${kept}` : undefined);
  }

  if (!after) return <StartScreen>{null}</StartScreen>;

  if (after.restore === 'wanted') {
    return (
      <StartScreen
        footer={
          noBackup ? undefined : <FooterLink link={t('I have no backup yet')} onPress={() => setNoBackup(true)} />
        }
      >
        <View style={{ paddingTop: 10, gap: 8 }}>
          <L size={12} weight="800" tone="muted" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {t('Moving from another phone')}
          </L>
          <Highlighted text={t('Bring your Erevos here')} size={27} align="left" />
          <L size={14.5} tone="muted" line={21}>
            {t('A backup brings everything over: every space, with its contacts, messages and hidden chats, your name, the modules, and the settings that go with you.')}
          </L>
        </View>
        {move ? (
          <Glass style={{ padding: 14, gap: 8 }}>
            <L size={15} weight="700">
              {t('From {edition} on this phone', { edition: updateEditionName(move.from) })}
            </L>
            <L size={12.5} tone="muted" line={17}>
              {t('{edition} made everything ready for this app, here on the phone. Bring it: Erevos then opens as {edition} was, with its passwords, and these steps go on.', { edition: updateEditionName(move.from) })}
            </L>
            {taking !== null ? (
              <L size={12.5} tone="muted" line={17}>
                {t('Bringing everything here… {percent}%', { percent: taking })}
              </L>
            ) : (
              <MainButton title={t('Bring everything here')} onPress={() => void bring(move)} />
            )}
            {moveError ? (
              <L size={12.5} tone="warn" line={17}>
                {moveError}
              </L>
            ) : null}
          </Glass>
        ) : null}
        <Glass style={{ padding: 14, gap: 8 }}>
          <L size={15} weight="700">
            {t('Restore a backup')}
          </L>
          <L size={12.5} tone="muted" line={17}>
            {t('Under Restore, choose the backup on this phone or on your server, and type its password. Erevos then opens as the old phone was, with its passwords, and these steps go on.')}
          </L>
          <MainButton title={t('Open Backups')} onPress={() => router.push('/backup')} />
        </Glass>
        <L size={12.5} tone="muted" line={17} align="center">
          {t('One phone at a time: after the backup, do not open Erevos on the old phone, and delete it there once new messages come here.')}
        </L>
        {noBackup ? (
          <Glass style={{ padding: 14, gap: 8 }}>
            <L size={13.5} line={19}>
              {t('On the old phone: Settings → Data and devices → Backups → Make a backup. Copy it here with every file whose name starts as its name, all in one folder, then restore it. A backup on your server needs no copying.')}
            </L>
            <MainButton
              title={t('Start without a backup')}
              onPress={() => {
                const next: SetupAfter = { ...after, restore: undefined };
                void keepSetupAfter(next).catch(() => undefined);
                // A new start after all: with Erevos's own chats, the place on LPHL's open server
                // is taken once the mode is chosen, as for anyone new (lib/open-place.ts).
                if (after.modules.includes('erevos') && !bringsServer(after.invite)) void wantFirstServer(currentSpace().space).catch(() => undefined);
                setAfter(next);
                setAt(0);
                setFromRestore(true);
              }}
            />
          </Glass>
        ) : null}
      </StartScreen>
    );
  }


  // The steps as the dots count them, the same list components/setup.tsx counts from: the welcome
  // and the modules came before the space opened; those left are here.
  const full = startSteps({ choice: modulesHere().length > 1 && !after.restore, restored: after.restore === 'done', checks: HAS_CHECKS });
  const steps = full.filter((s): s is Exclude<StartStep, 'welcome' | 'modules'> => s !== 'welcome' && s !== 'modules');
  const step = chosen ? 'keep' : steps[Math.min(at, steps.length - 1)];
  const dots = stepAt(full, step);
  const next = () => setAt(Math.min(at + 1, steps.length - 1));
  // Back from the first step, started without a backup after all: to the backup again, with no
  // place on LPHL's server wanted for it any more.
  const back =
    at > 0
      ? () => setAt(at - 1)
      : fromRestore
        ? () => {
            const was: SetupAfter = { ...after, restore: 'wanted' };
            void keepSetupAfter(was).catch(() => undefined);
            void firstServerDone();
            setFromRestore(false);
            setAfter(was);
          }
        : undefined;

  // How visible: INVISIBLE asks first; a choice that is not the space's is kept; then the server
  // LPHL gives is taken, with no waiting for it.
  async function continueMode() {
    if (busy) return;
    setModeNote('');
    if (choice === 'invisible' && mode !== 'invisible' && !(await askInvisible())) return;
    setBusy(true);
    try {
      if (choice !== mode) await chooseMode(choice);
    } catch (error) {
      setModeNote(error instanceof Error ? error.message : String(error));
      setBusy(false);
      return;
    }
    setBusy(false);
    void takeFirstServer();
    next();
  }

  // Done: the password lock, as Settings turns it on, with the fingerprint or face; then the
  // backups screen, which starts from the choice (after the whole setup, another server's page first).
  async function done() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (passwordOn && !locked) {
        if ([...password].length < MIN_PASSWORD) return setError(t('Use at least {n} characters.', { n: MIN_PASSWORD }));
        if (password !== again) return setError(t('The passwords do not match.'));
        const { key: spaceKey } = currentSpace();
        const other = await lockWithPassword(space, password, spaceKey);
        if (other) return setError(t('Use a different password.'));
        setLocked(true);
        setPasswordLock(true);
        // The spaces second passwords open exist from now on, used or not.
        await prepareSpaces(space + 1);
      }
      if (passwordOn && fingerprint && biometricSealer.available() && !warning) {
        try {
          await turnOnBiometric(biometricSealer, space, password, { title: t('Fingerprint or face for Erevos'), cancel: t('Cancel') });
        } catch (e) {
          if (!(e instanceof BiometricError && e.reason === 'cancelled')) {
            // The lock stays on: the error is shown, and Done goes on from here.
            setWarning(true);
            return setError(e instanceof Error ? e.message : String(e));
          }
        }
      }
      if (chosen) await onward(chosen.server, backup);
      else await finish(backup ? `/backup?start=${backup}` : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // The whole setup going on by itself, or on another server's page.
  if (chosen && (going === 'working' || going === 'server')) return <StartScreen>{null}</StartScreen>;

  // A mode that could not be kept: nothing goes out until it is.
  if (chosen && going === 'stopped') {
    return (
      <StartScreen footer={<MainButton title={t('Try again')} onPress={() => void goOn(chosen)} />}>
        <View style={{ alignItems: 'center', gap: 8, paddingTop: 24 }}>
          <Highlighted text={t('How *visible* are you?')} />
        </View>
        <L size={12.5} tone="warn" line={17} align="center">
          {error}
        </L>
      </StartScreen>
    );
  }

  if (step === 'mode') {
    const status =
      server.kind === 'ready' && !server.lphl
        ? t('Your server is ready · {server}', { server: hostOf(server.url) })
        : server.kind === 'ready'
          ? t('Your server is ready · LPHL, free')
          : server.kind === 'waiting' || server.kind === 'taking'
            ? // Not taken yet: it is once the mode is chosen, and the server may still give none.
              t('LPHL’s server is waiting for you · free')
            : null;
    return (
      <ModeStep
        dots={dots}
        choice={choice}
        onChoose={setChoice}
        status={status}
        link={{ text: t('Another server (for advanced users)'), onPress: () => router.push('/chat?setup=relay') }}
        note={modeNote}
        onNote={setModeNote}
        busy={busy}
        onBack={back}
        onContinue={() => void continueMode()}
      />
    );
  }

  if (step === 'permissions') {
    return <PermissionsStep dots={dots} modules={modules} onBack={back} onContinue={next} />;
  }

  // Keep it safe.
  // A lock this screen did not turn on was there before it: a backup restored brings its own, or
  // the whole setup locked the space as it opened. Then the card only says so, and the fingerprint,
  // which stays with each phone, is set where Settings sets it.
  const lockedBefore =
    passwordLock && !locked
      ? {
          status: after.restore === 'done' ? t('On, as on the other phone') : t('On'),
          line: after.restore === 'done' ? t('The fingerprint or face stays with each phone: turn it on again on this one.') : t('To open it with your fingerprint or face too, turn that on here.'),
          onSettings: () => router.push('/security?part=lock'),
        }
      : null;
  return (
    <KeepStep
      dots={dots}
      lock={{ on: passwordOn, password, again, fingerprint, locked }}
      onLock={(patch) => {
        if (patch.on !== undefined) setPasswordOn(patch.on);
        if (patch.password !== undefined) setPassword(patch.password);
        if (patch.again !== undefined) setAgain(patch.again);
        if (patch.fingerprint !== undefined) setFingerprint(patch.fingerprint);
      }}
      lockedBefore={lockedBefore}
      backup={backup}
      onBackup={setBackup}
      mode={mode}
      error={error}
      busy={busy}
      onBack={chosen ? undefined : back}
      onDone={() => void done()}
    />
  );
}
