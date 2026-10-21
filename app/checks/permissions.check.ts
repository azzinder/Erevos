// The permissions check (lib/permission-checks.ts): what it shows, and when it shows by itself.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checksFrom, known, makerOf, needsLook, offerFor, type CheckInput } from '../lib/permission-checks';

const ALL = { notices: true, fullScreen: true, battery: true, calls: true, data: true, alarms: true, maker: 'google' };
const NEARBY = ['android.permission.NEARBY_WIFI_DEVICES', 'android.permission.BLUETOOTH_SCAN', 'android.permission.ACCESS_LOCAL_NETWORK'];

function input(over: Partial<CheckInput> = {}, refused: string[] = []): CheckInput {
  return { background: ALL, granted: async (p) => !refused.includes(p), sdk: 35, nearby: NEARBY, makerDone: false, ...over };
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
