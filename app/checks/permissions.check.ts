// The permissions check (lib/permission-checks.ts): what it shows, and when it shows by itself.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checksFrom, known, makerOf, needsLook, offerFor, type Check, type CheckInput } from '../lib/permission-checks';
import type { BackgroundState, NoticeChannel } from '../modules/erevos-call';

const ALL = { notices: true, fullScreen: true, battery: true, calls: true, data: true, alarms: true, maker: 'google' };
const NEARBY = ['android.permission.NEARBY_WIFI_DEVICES', 'android.permission.BLUETOOTH_SCAN', 'android.permission.ACCESS_LOCAL_NETWORK'];

function input(over: Partial<CheckInput> = {}, refused: string[] = []): CheckInput {
  return { background: ALL, granted: async (p) => !refused.includes(p), sdk: 35, nearby: NEARBY, makerDone: false, messageNotices: true, ...over };
}

test('a phone with everything allowed shows every check as allowed, and nothing to offer', async () => {
  const checks = await checksFrom(input());
  assert.deepEqual(
    checks.map((c) => c.id),
    ['notices', 'calls', 'fullScreen', 'battery', 'data', 'microphone', 'camera', 'nearby', 'contacts', 'alarms'],
  );
  assert.ok(checks.every((c) => c.state === 'ok'));
  assert.equal(needsLook(checks), false);
});

test('battery saving, Data Saver or the microphone missing is something calls need', async () => {
  for (const background of [{ ...ALL, battery: false }, { ...ALL, data: false }]) {
    assert.equal(needsLook(await checksFrom(input({ background }))), true);
  }
  assert.equal(needsLook(await checksFrom(input({}, ['android.permission.RECORD_AUDIO']))), true);
  // The camera and the others are for one thing each: shown, not offered for.
  const checks = await checksFrom(input({}, ['android.permission.CAMERA', 'android.permission.READ_CONTACTS']));
  assert.equal(checks.find((c) => c.id === 'camera')?.state, 'missing');
  assert.equal(needsLook(checks), false);
});

test("a Huawei, whose own setting Erevos cannot read, asks the owner to look until they say it is done", async () => {
  assert.equal(makerOf('HUAWEI'), 'huawei');
  assert.equal(makerOf('honor'), 'huawei');
  assert.equal(makerOf('Google'), null);
  const huawei = { ...ALL, maker: 'huawei' };
  const open = await checksFrom(input({ background: huawei }));
  assert.equal(open.find((c) => c.id === 'maker')?.state, 'yours');
  assert.equal(needsLook(open), true);
  const done = await checksFrom(input({ background: huawei, makerDone: true }));
  assert.equal(done.find((c) => c.id === 'maker')?.state, 'ok');
  assert.equal(needsLook(done), false);
  // A Pixel has no such setting.
  assert.equal((await checksFrom(input())).some((c) => c.id === 'maker'), false);
});

test('a permission an older Android does not know counts as given', async () => {
  assert.deepEqual(known(NEARBY, 30), []);
  assert.deepEqual(known(NEARBY, 33), NEARBY.slice(0, 2));
  assert.deepEqual(known(NEARBY, 37), NEARBY);
  const old = await checksFrom(input({ sdk: 30 }, NEARBY));
  assert.equal(old.find((c) => c.id === 'nearby')?.state, 'ok');
  // With notices off, the call notice's own switch is not shown; a build without the call module shows only the permissions.
  const off = await checksFrom(input({ background: { ...ALL, notices: false } }));
  assert.equal(off.some((c) => c.id === 'calls'), false);
  assert.deepEqual(
    (await checksFrom(input({ background: null }))).map((c) => c.id),
    ['microphone', 'camera', 'nearby', 'contacts'],
  );
  // A build from before the newer readings leaves them out.
  const before = await checksFrom(input({ background: { notices: true, fullScreen: true, battery: true } }));
  assert.deepEqual(before.map((c) => c.id).slice(0, 3), ['notices', 'fullScreen', 'battery']);
});

test('the check offers itself once for each version, only when calls need something and ring in the background', async () => {
  const missing = await checksFrom(input({ background: { ...ALL, battery: false } }));
  const fine = await checksFrom(input());
  assert.equal(offerFor(null, '2.0.0+17', true, missing), true);
  assert.equal(offerFor('0.1.16+0', '2.0.0+17', true, missing), true);
  assert.equal(offerFor('2.0.0+17', '2.0.0+17', true, missing), false);
  assert.equal(offerFor('0.1.16+0', '2.0.0+17', true, fine), false);
  // Ringing in the background turned off on this phone: it does not need them.
  assert.equal(offerFor('0.1.16+0', '2.0.0+17', false, missing), false);
});

// A phone from this version on, which also says how the notices are set, and the rest.
const CALLS: NoticeChannel = { importance: 4, sound: false, lockScreen: 1, bypassDnd: false };
const MESSAGES: NoticeChannel = { importance: 3, sound: true, lockScreen: 0, bypassDnd: false };
const NEWER: BackgroundState = {
  ...ALL,
  callChannel: CALLS,
  messageChannel: MESSAGES,
  lockScreen: true,
  dnd: false,
  restricted: false,
  unusedExempt: true,
  saver: false,
  ringer: 2,
  ringVolume: 5,
};

const stateOf = (checks: Check[], id: string) => checks.find((c) => c.id === id)?.state;

test('a newer phone also shows the message notice, Restricted battery use, pausing when unused and how its notices are set', async () => {
  const checks = await checksFrom(input({ background: { ...NEWER, callChannel: { ...CALLS, bypassDnd: true } } }));
  assert.deepEqual(
    checks.map((c) => c.id),
    ['notices', 'calls', 'messages', 'fullScreen', 'battery', 'restricted', 'unused', 'data', 'microphone', 'messageSound', 'lockScreen', 'dnd', 'camera', 'nearby', 'contacts', 'alarms'],
  );
  assert.ok(checks.every((c) => c.state === 'ok'));
  assert.deepEqual(
    checks.filter((c) => c.needed).map((c) => c.id),
    ['notices', 'calls', 'messages', 'fullScreen', 'battery', 'restricted', 'unused', 'data', 'microphone'],
  );
  assert.equal(needsLook(checks), false);
});

test('the message notice turned off is something messages need; set silent, it is only shown', async () => {
  const off = await checksFrom(input({ background: { ...NEWER, messageChannel: { ...MESSAGES, importance: 0 } } }));
  assert.equal(stateOf(off, 'messages'), 'missing');
  assert.equal(needsLook(off), true);
  // Off, its sound and its lock screen are no matter.
  assert.equal(off.some((c) => c.id === 'messageSound'), false);
  for (const messageChannel of [{ ...MESSAGES, importance: 2 }, { ...MESSAGES, sound: false }]) {
    const quiet = await checksFrom(input({ background: { ...NEWER, messageChannel } }));
    assert.equal(stateOf(quiet, 'messages'), 'ok');
    assert.equal(stateOf(quiet, 'messageSound'), 'missing');
    assert.equal(needsLook(quiet), false);
  }
  // With "No notice" chosen under Settings → Notifications → In the background, the messages notice is as the owner wants it.
  const unwanted = await checksFrom(input({ background: { ...NEWER, messageChannel: { ...MESSAGES, importance: 0 } }, messageNotices: false }));
  assert.equal(unwanted.some((c) => c.id === 'messages' || c.id === 'messageSound'), false);
  assert.equal(needsLook(unwanted), false);
});

test('the same notice without sound, or with a chat\'s own sound, turned off is something messages need too; hidden on the lock screen, it is shown', async () => {
  const QUIET: NoticeChannel = { importance: 2, sound: false, lockScreen: 0, bypassDnd: false };
  const OWN: NoticeChannel = { importance: 3, sound: false, lockScreen: 0, bypassDnd: false };
  const all = await checksFrom(input({ background: { ...NEWER, quietChannel: QUIET, ownChannel: OWN } }));
  assert.equal(stateOf(all, 'messages'), 'ok');
  assert.equal(needsLook(all), false);
  for (const off of [{ quietChannel: { ...QUIET, importance: 0 } }, { ownChannel: { ...OWN, importance: 0 } }]) {
    const checks = await checksFrom(input({ background: { ...NEWER, quietChannel: QUIET, ownChannel: OWN, ...off } }));
    assert.equal(stateOf(checks, 'messages'), 'missing');
    assert.equal(needsLook(checks), true);
    // Not wanted: as the owner wants it.
    const unwanted = await checksFrom(input({ background: { ...NEWER, quietChannel: QUIET, ownChannel: OWN, ...off }, messageNotices: false }));
    assert.equal(unwanted.some((c) => c.id === 'messages'), false);
    // All notices off: that is what shows.
    const none = await checksFrom(input({ background: { ...NEWER, notices: false, quietChannel: QUIET, ownChannel: OWN, ...off } }));
    assert.equal(none.some((c) => c.id === 'messages'), false);
  }
  const hidden = await checksFrom(input({ background: { ...NEWER, quietChannel: { ...QUIET, lockScreen: -1 }, ownChannel: OWN } }));
  assert.equal(stateOf(hidden, 'lockScreen'), 'missing');
  assert.equal(needsLook(hidden), false);
});

test("the reminders' notice turned off shows, once a reminder made it, and never opens the check by itself", async () => {
  const REMINDERS: NoticeChannel = { importance: 4, sound: true, lockScreen: 0, bypassDnd: false };
  assert.equal((await checksFrom(input({ background: NEWER }))).some((c) => c.id === 'reminders'), false);
  assert.equal(stateOf(await checksFrom(input({ background: { ...NEWER, reminderChannel: REMINDERS } })), 'reminders'), 'ok');
  const off = await checksFrom(input({ background: { ...NEWER, reminderChannel: { ...REMINDERS, importance: 0 } } }));
  assert.equal(stateOf(off, 'reminders'), 'missing');
  assert.equal(off.find((c) => c.id === 'reminders')?.needed, false);
  assert.equal(needsLook(off), false);
  const none = await checksFrom(input({ background: { ...NEWER, notices: false, reminderChannel: { ...REMINDERS, importance: 0 } } }));
  assert.equal(none.some((c) => c.id === 'reminders'), false);
});

test('a call notice that does not pop up is something calls need, as one turned off', async () => {
  for (const importance of [3, 2]) {
    const quiet = await checksFrom(input({ background: { ...NEWER, callChannel: { ...CALLS, importance } } }));
    assert.equal(stateOf(quiet, 'calls'), 'missing');
    assert.equal(needsLook(quiet), true);
  }
  const off = await checksFrom(input({ background: { ...NEWER, calls: false, callChannel: { ...CALLS, importance: 0 } } }));
  assert.equal(stateOf(off, 'calls'), 'missing');
  // Off, whether it breaks through Do Not Disturb is no matter.
  assert.equal(off.some((c) => c.id === 'dnd'), false);
  // With all notices off, only that shows of them.
  const none = await checksFrom(input({ background: { ...NEWER, notices: false } }));
  assert.deepEqual(
    none.filter((c) => ['calls', 'messages', 'messageSound', 'lockScreen', 'dnd'].includes(c.id)),
    [],
  );
  assert.equal(stateOf(none, 'notices'), 'missing');
});

test('battery use set to Restricted and pausing when unused are things calls need', async () => {
  for (const background of [{ ...NEWER, restricted: true }, { ...NEWER, unusedExempt: false }]) {
    assert.equal(needsLook(await checksFrom(input({ background }))), true);
  }
  assert.equal(stateOf(await checksFrom(input({ background: NEWER })), 'restricted'), 'ok');
  // Android 9 and 10 say only whether it is Restricted, and know nothing of pausing.
  const older = await checksFrom(input({ background: { ...ALL, restricted: false } }));
  assert.equal(stateOf(older, 'restricted'), 'ok');
  assert.equal(older.some((c) => c.id === 'unused'), false);
});

test('the lock screen, Do Not Disturb, the ringer and battery saver are shown, and never open the check by themselves', async () => {
  const hidden = [
    { ...NEWER, lockScreen: false },
    { ...NEWER, callChannel: { ...CALLS, lockScreen: -1 } },
    { ...NEWER, messageChannel: { ...MESSAGES, lockScreen: -1 } },
  ];
  for (const background of hidden) {
    const checks = await checksFrom(input({ background }));
    assert.equal(stateOf(checks, 'lockScreen'), 'missing');
    assert.equal(needsLook(checks), false);
  }
  // A phone that does not let Erevos read the whole phone's setting goes by the channels.
  const { lockScreen: _unread, ...unread } = NEWER;
  assert.equal(stateOf(await checksFrom(input({ background: unread })), 'lockScreen'), 'ok');
  // Calls not let through Do Not Disturb: the owner's choice, and a note while it is on.
  assert.equal(stateOf(await checksFrom(input({ background: NEWER })), 'dnd'), 'missing');
  const quiet = await checksFrom(input({ background: { ...NEWER, dnd: true, ringer: 1, saver: true } }));
  assert.equal(stateOf(quiet, 'dnd'), 'note');
  assert.equal(stateOf(quiet, 'ringer'), 'note');
  assert.equal(stateOf(quiet, 'saver'), 'note');
  assert.equal(needsLook(quiet), false);
  assert.equal(stateOf(await checksFrom(input({ background: { ...NEWER, ringVolume: 0 } })), 'ringer'), 'note');
  // Ringing out loud, with battery saver off, they are not shown.
  const loud = await checksFrom(input({ background: NEWER }));
  assert.equal(loud.some((c) => c.id === 'ringer' || c.id === 'saver'), false);
});
