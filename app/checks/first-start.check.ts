// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The first start's screens as they are wired (components/setup.tsx, components/start-steps.tsx,
// app/_layout.tsx, app/first-steps.tsx, components/first-home.tsx), read from their source: the
// whole setup is chosen before the first space opens, kept as it goes, with Next and Back through
// every step, and nothing used until Done; Done makes the space with it, in its mode and locked with
// its password before it opens, and the rest goes on by itself once it is; Allow all asks in the
// order lib/permission-groups.ts says, and the home screen's first card opens New chat near.
// The steps, the colours and the setup kept are checked in checks/first-start-logic.check.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const read = (file: string) => readFileSync(join(import.meta.dirname, '..', file), 'utf8');
const steps = read('app/first-steps.tsx');
const setup = read('components/setup.tsx');
const shared = read('components/start-steps.tsx');
const layout = read('app/_layout.tsx');

// The text of `source` from the first `from` up to the next `to`.
function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  assert.ok(start >= 0, from);
  const end = source.indexOf(to, start + from.length);
  assert.ok(end > start, to);
  return source.slice(start, end);
}

// Where each of `parts` is in `source`, asserted in that order.
function inOrder(source: string, parts: readonly string[]): void {
  let at = -1;
  for (const part of parts) {
    const next = source.indexOf(part, at + 1);
    assert.ok(next > at, `${part} (after ${at}, at ${next})`);
    at = next;
  }
}

test('both halves of the first start count the same steps for their dots', () => {
  assert.ok(setup.includes('startSteps({ choice: !single, restored: false, checks: HAS_CHECKS })'));
  assert.ok(setup.includes('const dots = stepAt(steps, step);'));
  assert.ok(steps.includes("startSteps({ choice: modulesHere().length > 1 && !after.restore, restored: after.restore === 'done', checks: HAS_CHECKS })"));
  assert.ok(steps.includes('stepAt(full, step)'));
  // The welcome has no dots; the modules step has, and the steps after it theirs.
  const welcome = between(setup, "if (step === 'welcome') {", 'const row = ');
  assert.ok(!welcome.includes('<Dots'));
  assert.ok(setup.includes('<Dots n={dots.n} of={dots.of} />'));
  assert.equal(shared.split('<Dots n={dots.n} of={dots.of} />').length, 4);
});

test('the modules step starts the four main ones on and the other networks off, and needs one with chats', () => {
  assert.ok(setup.includes("const MAIN: readonly Module[] = ['erevos', 'phone', 'sms', 'collection'];"));
  assert.ok(setup.includes('newDraft(here.filter((m) => MAIN.includes(m)))'));
  assert.ok(setup.includes("t('Other networks')"));
  assert.ok(setup.includes('disabled={nothing}'));
  assert.ok(setup.includes('const single = here.length === 1;'));
});

test('the whole setup is chosen before the space opens, kept as it goes, and Next and Back go through it as it was left', () => {
  // Each choice kept as it is made, and the setup shown at the step it was left on.
  assert.ok(setup.includes('useState<SetupDraft>(() => draftNow() ?? newDraft('));
  assert.ok(setup.includes('useEffect(() => keepDraft(draft), [draft]);'));
  assert.ok(setup.includes("const step = steps.includes(draft.step) ? draft.step : 'welcome';"));
  assert.ok(setup.includes('const next = () => go(at + 1);'));
  assert.ok(setup.includes('const back = at > 0 && !busy ? () => go(at - 1) : undefined;'));
  // Every step after the welcome has Back, and Android's back key does the same.
  assert.ok(setup.includes('<NavRow onBack={back}>'));
  for (const step of ['<ModeStep', '<PermissionsStep', '<KeepStep']) assert.ok(between(setup, step, '/>').includes('onBack={back}'), step);
  assert.ok(between(setup, "BackHandler.addEventListener('hardwareBackPress'", '});').includes('backKey.current?.();'));
  // The shared steps only show and ask: nothing they choose is used by them.
  for (const used of ['chooseMode(', 'takeFirstServer(', 'wantFirstServer(', 'lockWithPassword(', 'turnOnBiometric(', 'setModules(', 'firstSpaceKey(', 'setMyNameAt(', 'secureSet(']) {
    assert.ok(!setup.includes(used), used);
    assert.ok(!shared.includes(used), used);
  }
  // Read before the setup shows, as Erevos starts.
  inOrder(between(layout, '} else if (!modulesChosen() && (await firstStart())) {', '} else {'), ['await loadDraft(modulesHere());', "setPhase({ kind: 'setup' });"]);
  // The password checked as Settings checks it before Done goes on, and held in memory only.
  const done = between(setup, 'async function done()', "if (step === 'mode')");
  inOrder(done, ['MIN_PASSWORD', "t('The passwords do not match.')", 'await onDone({']);
  assert.ok(done.includes('} else forgetPassword();'));
  // Done that could not finish says why, and can be tapped again: the setup stays as it was.
  inOrder(done, ['await onDone({', '} catch (error) {', 'setNote(', '} finally {', 'setBusy(false);']);
  assert.ok(setup.includes('typePassword(now);'));
});

test('Done makes the first space with the whole setup: in its mode and locked with its password before it opens', () => {
  const done = between(layout, 'const setupDone = useCallback(', '// The password screen in front of the open space');
  inOrder(done, [
    'await keepSetupAfter({',
    '...(chosen ? { chosen } : {}),',
    'await (lphl ? wantFirstServer(0) : firstServerDone())',
    'await setModules(modules);',
    "keepLink('erevos://first-steps');",
    'const key = await firstSpaceKey();',
    'await updateSpaceData(0, key, modeChange(await loadSpaceData(0, key), chosen.mode));',
    'const password = chosen.lock ? typedPassword().password : \'\';',
    'await lockWithPassword(0, password, key);',
    'await prepareSpaces(1);',
    // Kept for the fingerprint only when the first steps will be there to forget it.
    'if (!chosen.fingerprint || !kept) forgetPassword();',
    'await dropDraft();',
    'await openSpace(0, !!password, key);',
  ]);
  // Moving from another phone or linking to it: a new space, as before, and the setup goes.
  inOrder(done, ['if (!chosen) {', 'await dropDraft();', 'forgetPassword();', 'await start();']);
  // The space opens in the mode its data says (lib/modes.ts), from the first moment.
  inOrder(between(layout, 'const openSpace = useCallback(', 'const start = useCallback('), ['const direct = directOf(data);', 'applyTor(data.tor, data.bridges)', 'setNostr(nostrOf(data.nostr)']);
  // Settings locks a space not locked yet with the same calls (app/security.tsx).
  const security = read('app/security.tsx');
  assert.ok(security.includes('const other = await lockWithPassword(space, password, key);') && security.includes('await prepareSpaces(space + 1);'));
});

test('Continue on the mode step asks before INVISIBLE; LPHL’s server or another is chosen there, and set once the space is open', () => {
  const go = between(setup, 'async function continueMode()', '// Done:');
  inOrder(go, ["if (draft.mode === 'invisible' && !invisibleAsked.current) {", 'await askInvisible()', 'invisibleAsked.current = true;', 'next();']);
  // Chosen again after another: asked again.
  assert.ok(setup.includes('if (mode !== draft.mode) invisibleAsked.current = false;'));
  // INVISIBLE is not chosen where there is no Tor.
  assert.ok(shared.includes("faint={each === 'invisible' && !canTor()}"));
  // The pill and the link only with Erevos's own chats, and no invite that brings a server.
  assert.ok(setup.includes("const serves = list.includes('erevos') && !bringsServer(link ?? undefined);"));
  const mode = between(setup, "if (step === 'mode') {", "if (step === 'permissions')");
  assert.ok(mode.includes("t('Another server · you set it once the setup is done') : t('LPHL’s server is waiting for you · free')"));
  assert.ok(mode.includes("{ text: t('Use LPHL’s server'), onPress: () => change({ server: 'lphl' }) }"));
  assert.ok(mode.includes("{ text: t('Another server (for advanced users)'), onPress: () => change({ server: 'other' }) }"));
  // Nothing is ready before the space is: the setup never says so.
  assert.ok(!setup.includes('Your server is ready'));
  assert.ok(between(setup, 'await onDone({', '});').includes("server: serves ? draft.server : 'lphl'"));
  // Started without a backup after all, with the space open: the mode is kept on Continue, then the server is taken.
  const kept = between(steps, 'async function continueMode()', '// Done: the password lock');
  const asked = kept.indexOf('askInvisible()');
  const chose = kept.indexOf('await chooseMode(choice)');
  const took = kept.indexOf('void takeFirstServer()');
  const onward = kept.indexOf('next()');
  assert.ok(asked > 0 && chose > asked && took > chose && onward > took, `${asked} ${chose} ${took} ${onward}`);
  assert.ok(!kept.includes('await takeFirstServer'));
  assert.ok(kept.includes('setModeNote(') && kept.includes('return;'));
  assert.ok(steps.includes("router.push('/chat?setup=relay')"));
});

test('once the space is open, the setup goes on by itself, nothing going out in another mode than the one chosen', () => {
  const on = between(steps, 'async function goOn(setup: SetupChosen)', '// Another server chosen, and none set yet');
  inOrder(on, [
    // What the setup kept goes, should Erevos have closed before Done took it away.
    'void dropDraft();',
    'if (modeOf(await loadCurrentSpaceData()) !== setup.mode) await chooseMode(setup.mode);',
    "setGoing('stopped');",
    "if (setup.server === 'lphl') void waitForTor(TOR_WAIT_MS).then(() => takeFirstServer());",
    'const typed = typedPassword().password;',
    'if (setup.lock && !passwordLock) {',
    "t('Erevos closed before the password was kept: type it again.')",
    'await lockWithPassword(space, typed, currentSpace().key);',
    'await prepareSpaces(space + 1);',
    '!(await biometricOn(biometricSealer).catch(() => false))',
    'await turnOnBiometric(biometricSealer, space, typed,',
    "e.reason === 'cancelled'",
    'forgetPassword();',
    'await onward(setup.server, setup.backup);',
  ]);
  // A mode that could not be kept stops before LPHL's server: Try again tries it all again.
  assert.ok(between(steps, "if (chosen && going === 'stopped') {", '</StartScreen>').includes('onPress={() => void goOn(chosen)}'));
  // Once, as what the setup chose is read; not the steps of a move from another phone.
  assert.ok(steps.includes('const chosen = after && !after.restore ? (after.chosen ?? null) : null;'));
  assert.ok(between(steps, 'useEffect(() => {\n    if (!chosen || started.current) return;', '}, [chosen]);').includes('void goOn(chosen);'));
  // Another server: its page, then the backups once back from it; else the backups, or home.
  const next = between(steps, 'async function onward(', "if (!after) return");
  inOrder(next, ["if (to === 'other' && !data?.url.trim()) {", 'serverPage.current = { backup: kept };', "router.push('/chat?setup=relay');", 'await finish(kept ? `/backup?start=${kept}` : undefined);']);
  assert.ok(between(steps, '// Back from another server', '// Done: Erevos opens').includes('void finish(then.backup ? `/backup?start=${then.backup}` : undefined);'));
  // The password goes from memory once done.
  assert.ok(between(steps, 'async function finish(then?: string)', 'await setupAfterDone();').includes('forgetPassword();'));
});

test('Done turns the lock on as Settings does, then the fingerprint, then goes to the backups with the choice', () => {
  const done = between(steps, 'async function done()', '// The whole setup going on by itself');
  inOrder(done, [
    'lockWithPassword(space, password, spaceKey)',
    'setPasswordLock(true)',
    'prepareSpaces(space + 1)',
    'turnOnBiometric(biometricSealer, space, password',
    'if (chosen) await onward(chosen.server, backup);',
    'else await finish(backup ? `/backup?start=${backup}` : undefined);',
  ]);
  assert.ok(done.includes('MIN_PASSWORD') && done.includes("t('The passwords do not match.')"));
  assert.ok(done.includes("e.reason === 'cancelled'"));
  // Google Drive asks first, and Back from the warning leaves it unchosen.
  assert.ok(shared.includes("setSheet(each.id === 'drive')"));
  assert.ok(shared.includes('const goBackFromSheet = () => {'));
  assert.ok(between(shared, 'const goBackFromSheet = () => {', '};').includes('onBackup(null);'));
});

test('Allow all asks in Erevos first, then the default apps, then each screen of settings in turn', () => {
  const all = between(shared, 'async function allowAll()', 'const { ok, all: count } = countAllowed(groups);');
  const asked = all.indexOf('await askAll(asked.checks)');
  const phone = all.indexOf('requestDefaultPhone()');
  const sms = all.indexOf('requestDefaultSms()');
  const screens = all.indexOf('nextSettingsScreen(now, opened)');
  assert.ok(all.includes('askedInApp(now)'));
  assert.ok(asked > 0 && phone > asked && sms > phone && screens > sms, `${asked} ${phone} ${sms} ${screens}`);
  // Each next one when the app is back in the foreground, and the round ends when the step is left.
  assert.ok(all.includes('await comeBack(hold.current)') && all.includes('going()'));
  assert.ok(shared.includes('round.current++;'));
  // The roles are read as the default-apps cards read them, for the modules chosen.
  assert.ok(shared.includes('smsStatus() !== null && !smsMirrored()'));
  assert.ok(setup.includes('<PermissionsStep dots={dots} modules={list} before onBack={back} onContinue={next} />'));
  // Before the space opens, the web app's notices while closed, which go through its server, wait for Settings.
  assert.ok(shared.includes("const NEEDS_SPACE: ReadonlySet<CheckId> = new Set<CheckId>(['push']);"));
  assert.ok(shared.includes('permissionGroups(before ? checks.filter((check) => !NEEDS_SPACE.has(check.id)) : checks, readRoles(list))'));
});

test('the first home offers near and far, and the first card opens New chat on Near me', () => {
  const home = read('components/first-home.tsx');
  assert.ok(home.includes("router.push('/chat?setup=near')") && home.includes("router.push('/chat?setup=invite')"));
  assert.ok(home.includes("router.push('/chat?setup=relay')") && home.includes('void takeFirstServer()'));
  assert.ok(home.includes("router.push('/permissions')"));
  const index = read('app/index.tsx');
  assert.ok(index.includes("erevosOn && linkedRole() !== 'linked' ? ("));
  assert.ok(index.includes('<FirstHome />'));
  const chat = read('app/chat.tsx');
  assert.ok(chat.includes("nearNow={setup === 'near'}"));
  assert.ok(chat.includes("codeNow ? 'code' : nearNow ? 'near' : 'root'"));
  assert.ok(chat.includes('inviteNow || codeNow || nearNow)'));
});

test("LPHL's open server is wanted for a new start unless another or the invite brings a server, tried again once the steps are done, and offered on the first home", () => {
  assert.ok(layout.includes("const lphl = modules.includes('erevos') && !restore && !linkPhone && !bringsServer(invite) && chosen?.server !== 'other';"));
  // At each opening of a space, after the steps (lib/open-place.ts waits for them itself).
  const opened = between(layout, 'collectionServerOpened();', 'cameraFollows(passwordLock);');
  assert.ok(opened.includes('void retryFirstServer().catch(() => undefined);'));
  // Start without a backup, after choosing to move from another phone, is a new start too; Back
  // from its first step goes back to the backup, with no place wanted any more.
  const fresh = between(steps, "title={t('Start without a backup')}", 'setAfter(next);');
  assert.ok(fresh.includes("if (after.modules.includes('erevos') && !bringsServer(after.invite)) void wantFirstServer(currentSpace().space)"));
  inOrder(between(steps, ': fromRestore', ': undefined;'), ["restore: 'wanted'", 'keepSetupAfter(was)', 'void firstServerDone();', 'setAfter(was);']);
  // The first home: read again on each return, offered where a space has none, and its line on top follows.
  const home = read('components/first-home.tsx');
  assert.ok(home.includes('void readFirstServer().catch(() => undefined);'));
  assert.ok(home.includes("onPress={() => void askFirstServer().catch(() => undefined)}"));
  const index = read('app/index.tsx');
  assert.ok(index.includes('const stopServer = onFirstServer(() => {'));
  // The place's own queue is one that Forget me gathers (checks/forget-me.check.ts).
  assert.ok(read('lib/server-queues.ts').includes("'lib/open-place.ts': ['own'],"));
  // It is taken with the relay's OPEN (lib/relay.ts, checks/open-place.check.ts), its refusals told apart,
  // and a failure is said in plain words, with no error of the network's.
  const place = read('lib/open-place.ts');
  assert.ok(place.includes('({ token } = await takeOpenPlace(LPHL_RELAY));') && place.includes('const why = openPlaceRefusal(error);'));
  assert.ok(!place.includes('setOpenTaker'));
  assert.ok(home.includes("t('Erevos could not reach it now. It tries again by itself each time Erevos opens.')") && !home.includes('server.error'));
});

test("LPHL's place is promised only once taken, a home with no server warns first, and a free place says its day's limits", () => {
  // The mode step with the space open: ready only once it is; waiting until then, as the server may still give none.
  const mode = between(steps, "if (step === 'mode') {", 'return (');
  assert.ok(mode.includes("server.kind === 'ready'\n          ? t('Your server is ready · LPHL, free')"));
  assert.ok(mode.includes("server.kind === 'waiting' || server.kind === 'taking'") && mode.includes("t('LPHL’s server is waiting for you · free')"));
  // The first home: the dot warns with no server, and what to do about it comes above the two ways.
  const home = read('components/first-home.tsx');
  assert.ok(home.includes("const served = server.kind === 'ready' || server.kind === 'waiting' || server.kind === 'taking';"));
  assert.ok(home.includes('backgroundColor: served ? colors.success : colors.warning'));
  const doors = home.indexOf("title={t('They are beside me')}");
  assert.ok(home.indexOf("{server.kind === 'none' ? (") < doors && home.indexOf("{server.kind === 'refused' || server.kind === 'failed' ? (") < doors);
  // Under the two ways, a free place's limits for a day: LPHL's as they are set, another's in general.
  assert.ok(home.indexOf("{server.kind === 'ready' && server.open ? (") > doors);
  assert.ok(home.includes("t('Free on LPHL’s server: up to 20 new contacts, 50 MB of files and 30 calls through it each day.')"));
  // The place is kept as a free one, and known as such only for the token it was given with.
  const place = read('lib/open-place.ts');
  assert.ok(place.includes('ownToken: { ...ownToken(LPHL_RELAY, token), open: true }'));
  assert.ok(place.includes("if (!url || !data.token.trim() || data.ownToken.open !== true) return false;"));
  // A free place's day used is said in plain words, and what was sent goes again later.
  const relay = read('lib/relay.ts');
  assert.ok(relay.includes("if (reply[0] === DAY_FULL) throw new RelayError(t('{what}: your free place on this server has used all it may today. It goes on tomorrow.', { what }), DAY_FULL);"));
  assert.ok(relay.includes("if (reply[0] === DAY_FULL) throw new RelayError(t('{what}: your free place on this server has moved all the files it may today. Files go again tomorrow.', { what }), DAY_FULL);"));
  assert.ok(relay.includes('error.status === UNREACHABLE || error.status === DAY_FULL);'));
});

test('on the web, the icons in the tiles are drawn over their gradient and the highlighted words keep the title size', () => {
  const look = read('components/first-start-look.tsx');
  const tile = between(look, 'export function Tile(', '\n}\n');
  assert.ok(tile.indexOf('<Gradient') < tile.indexOf('<View>') && tile.indexOf('<View>') < tile.indexOf('<Icon'));
  const title = between(look, 'export function Highlighted(', '\n}\n');
  assert.ok(title.includes('style={own}'));
  const bold = between(look, 'export function Bolded(', '\n}\n');
  assert.ok(bold.includes("style={{ ...own, fontWeight: '700' }}"));
});

test('a lock on before Keep it safe shows as on, and the fingerprint is set where Settings sets it', () => {
  inOrder(between(steps, 'const lockedBefore =', 'return ('), [
    'passwordLock && !locked',
    "after.restore === 'done' ? t('On, as on the other phone') : t('On')",
    "t('To open it with your fingerprint or face too, turn that on here.')",
    "onSettings: () => router.push('/security?part=lock')",
  ]);
  const card = between(shared, '{lockedBefore ? (', ') : (');
  assert.ok(card.includes('{lockedBefore.status}') && card.includes('onPress={lockedBefore.onSettings}'));
  assert.ok(!card.includes('<TextInput'));
  // Done sets a lock only from the fields, so one already on is left as it is.
  const done = between(steps, 'async function done()', '// The whole setup going on by itself');
  assert.ok(done.includes('if (passwordOn && !locked) {'));
  // After the whole setup, the fingerprint that did not take leaves the lock as it is, with the error.
  inOrder(between(steps, 'if (!(e instanceof BiometricError', "setGoing('keep');\n          return;"), ['setLocked(true);', 'setWarning(true);', 'setError(errorText(e));']);
});
