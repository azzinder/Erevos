// The colours and the look, checked the way LPHL FASOULI's colors.test.ts checks its own.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { EMPTY_SPACE, loadSpaceData, saveSpaceData, updateSpaceData } from '../lock/space-data';
import {
  buildColors,
  contrast,
  customAccentChoices,
  FRAME_TEXTS,
  frameTextChoices,
  mixHex,
  PALETTE_CHOICES,
  palettes,
  resolveScheme,
  STYLES,
} from '../theme/colors';
import { changeLook, checkedLook, DEFAULT_LOOK, loadLockScreenLook, saveLockScreenLook } from '../theme/look';
import { LPHL_PALETTES } from '../theme/lphl-palettes';
import { store } from './secure-memory';

const SCHEMES = ['light', 'dark'] as const;

test('offers the style default, the 12 LPHL palettes and a color of your own', () => {
  assert.equal(PALETTE_CHOICES.length, 14);
  assert.equal(PALETTE_CHOICES[0], 'auto');
  assert.equal(PALETTE_CHOICES[13], 'custom');
  assert.ok(customAccentChoices().length > 20);
  assert.ok(['#FFFFFF', '#000000', ...customAccentChoices()].every((c) => frameTextChoices().includes(c)));
});

test("keeps Erevos's own dark and gold in Classic", () => {
  const c = buildColors('classic', 'dark', 'auto');
  assert.equal(c.background, '#0D0B09');
  assert.equal(c.primary, '#D9A441');
  assert.equal(c.onPrimary, '#0D0B09');
  assert.equal(c.ground, c.background);
  assert.equal(resolveScheme('classic', DEFAULT_LOOK.theme, 'light'), 'dark');
  assert.equal(resolveScheme('nocturne', 'light', 'light'), 'dark');
});

test("keeps the palette's own fills and text when asked, or puts your own text color on them", () => {
  const p = LPHL_PALETTES.rodakini.light;
  const kept = buildColors('classic', 'light', 'rodakini', { customAccent: '#000000', frameText: 'palette' });
  assert.equal(kept.hero, p.accentField);
  assert.equal(kept.heroText, p.onAccent);
  const white = buildColors('classic', 'light', 'rodakini', { customAccent: '#000000', frameText: 'white' });
  assert.equal(white.heroText, '#FFFFFF');
  assert.notEqual(white.hero, p.accentField);
  const own = buildColors('classic', 'light', 'kipos', { customAccent: '#000000', frameText: 'custom', frameTextColor: '#201e1d' });
  assert.equal(own.onPrimary, '#201E1D');
  assert.equal(own.heroMuted, mixHex('#201E1D', LPHL_PALETTES.kipos.light.accentField, 0.3));
  // A missing color falls back to white.
  assert.equal(buildColors('classic', 'light', 'kipos', { customAccent: '#000000', frameText: 'custom' }).heroText, '#FFFFFF');
});

test('builds a palette around your own color', () => {
  const light = buildColors('classic', 'light', 'custom', { customAccent: '#2F7FC4', frameText: 'palette' });
  assert.equal(light.hero, '#2F7FC4');
  assert.equal(light.background, LPHL_PALETTES.house.light.bg);
  const dark = buildColors('modernist', 'dark', 'custom', { customAccent: '#2F7FC4', frameText: 'white' });
  assert.equal(dark.background, LPHL_PALETTES.house.dark.bg);
  assert.ok(contrast(dark.hero, dark.heroText) >= 3);
});

test('reads well in every style, scheme, palette and text setting', () => {
  for (const style of STYLES) {
    for (const scheme of SCHEMES) {
      for (const palette of PALETTE_CHOICES) {
        for (const frameText of FRAME_TEXTS) {
          const c = buildColors(style, scheme, palette, { customAccent: '#D9A441', frameText, frameTextColor: '#FFFFFF' });
          const where = `${style} ${scheme} ${palette} ${frameText}`;
          for (const [key, value] of Object.entries(c)) {
            if (key !== 'overlay') assert.match(value, /^#[0-9A-F]{6}$/i, `${where}: ${key}`);
          }
          assert.ok(contrast(c.text, c.background) >= 4.5, `${where}: text`);
          assert.ok(contrast(c.accentText, c.background) >= 4.5, `${where}: accent as text`);
          assert.ok(contrast(c.success, c.background) >= 4.5, `${where}: success`);
          // The palettes' own text on their fills is theirs to choose; white is made to read.
          if (frameText === 'white' && style !== 'nocturne') {
            assert.ok(contrast(c.primary, c.onPrimary) >= 3, `${where}: button`);
            assert.ok(contrast(c.hero, c.heroText) >= 3, `${where}: hero`);
          }
        }
      }
    }
  }
  for (const scheme of SCHEMES) {
    const c = palettes.classic[scheme];
    assert.ok(contrast(c.primary, c.onPrimary) >= 4.5, `classic ${scheme}: dark text on the gold`);
  }
});

test('a kept look is checked, and Nocturne remembers the style it was chosen over', () => {
  assert.deepEqual(checkedLook(null), DEFAULT_LOOK);
  assert.deepEqual(checkedLook({ style: 'glass', theme: 'dusk', palette: 'nope', customAccent: 'red' }), DEFAULT_LOOK);
  assert.deepEqual(checkedLook({ ...DEFAULT_LOOK, style: 'modernist', customAccent: '#2f7fc4' }), {
    ...DEFAULT_LOOK,
    style: 'modernist',
    customAccent: '#2F7FC4',
  });
  const modern = { ...DEFAULT_LOOK, style: 'modernist' as const };
  const night = changeLook(modern, { style: 'nocturne' });
  assert.equal(night.prevStyle, 'modernist');
  assert.equal(changeLook(night, { palette: 'kipos', style: night.prevStyle }).style, 'modernist');
});

test("a space keeps its look beside the chat's data, whichever saves first", async () => {
  store.clear();
  const key = randomBytes(32);
  await saveSpaceData(1, key, EMPTY_SPACE);
  const look = { ...DEFAULT_LOOK, style: 'nocturne' as const };
  // The chat and the Appearance screen save at the same moment: neither undoes the other.
  await Promise.all([
    updateSpaceData(1, key, { url: 'wss://relay.example.org', token: 't', ownQueue: null, routes: {} }),
    updateSpaceData(1, key, { look }),
    updateSpaceData(1, key, { token: 'later' }),
  ]);
  assert.deepEqual(await loadSpaceData(1, key), { ...EMPTY_SPACE, url: 'wss://relay.example.org', token: 'later', look });
  assert.ok(!store.get('erevos.space.1')!.includes('nocturne'));
  // The password screen's copy holds nothing but the look.
  await saveLockScreenLook(look);
  assert.deepEqual(await loadLockScreenLook(), look);
  assert.deepEqual(Object.keys(JSON.parse(store.get('erevos.look')!)).sort(), Object.keys(DEFAULT_LOOK).sort());
});
