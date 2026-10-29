// What phones nearby see of Erevos over BLE (modules/erevos-radio, BleBeacon.kt and BleLink.kt),
// read from the Kotlin itself, as it runs only on a phone: the nonce comes from a secure random
// source and changes every few minutes, with the beacon started again; and it is still four bytes
// in the service data and under the test company id, where a phone from before reads it, with the
// same service UUID, so old and new phones still find each other.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('../modules/erevos-radio/android/src/main/java/expo/modules/erevosradio/', import.meta.url);
const link = readFileSync(new URL('BleLink.kt', dir), 'utf8');
const beacon = readFileSync(new URL('BleBeacon.kt', dir), 'utf8');

const constant = (name: string) => {
  const found = new RegExp(`const val ${name} = ([0-9_]+) \\* 60_000L`).exec(link);
  assert.ok(found, name);
  return Number(found[1].replace(/_/g, '')) * 60_000;
};

test('the BLE nonce is random from a secure source, and changes every few minutes', () => {
  assert.match(link, /import java\.security\.SecureRandom/);
  assert.doesNotMatch(link, /kotlin\.random\.Random|Random\.nextInt\(\)/);
  assert.match(link, /private var ownNonce = freshNonce\(\)/);
  const every = constant('ROTATE_MS');
  const jitter = constant('ROTATE_JITTER_MS');
  assert.ok(every >= 5 * 60_000 && every + jitter <= 15 * 60_000, `${every} + ${jitter}`);
  // Each turn: a new nonce, and the beacon started again with it; the turns stop with the links.
  const turn = /override fun run\(\) \{([\s\S]*?)main\.postDelayed\(this, nextRotation\(\)\)/.exec(link)?.[1] ?? '';
  assert.match(turn, /ownNonce = freshNonce\(\)/);
  assert.match(turn, /it\.stop\(\)\s*\n\s*it\.start\(ownNonce, quiet\)/);
  assert.match(link, /private fun stopOnMain\(\) \{\s*\n\s*main\.removeCallbacks\(rotate\)/);
  assert.match(link, /main\.postDelayed\(rotate, nextRotation\(\)\)/);
});

test('a phone from before still reads the nonce where it always was', () => {
  assert.match(beacon, /UUID\.fromString\("6e8f0c1a-3b5d-4f2e-9a7c-5d1e0b2f8a41"\)/);
  assert.match(beacon, /ByteBuffer\.allocate\(4\)\.putInt\(nonce\)/);
  assert.match(beacon, /\.addManufacturerData\(TEST_COMPANY, nonceBytes\)/);
  assert.match(beacon, /\.addServiceData\(ParcelUuid\(SERVICE_UUID\), nonceBytes\)/);
  assert.match(beacon, /private const val TEST_COMPANY = 0xFFFF/);
  // No name, no address of its own, nothing else that stays.
  assert.equal((beacon.match(/setIncludeDeviceName\(false\)/g) ?? []).length, 2);
  assert.doesNotMatch(beacon, /setIncludeTxPowerLevel\(true\)|setIncludeDeviceName\(true\)/);
});
