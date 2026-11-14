// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
  NOCTURNE,
  customAccentChoices,
  FRAME_TEXTS,
  frameTextChoices,
  mixHex,
  PALETTE_CHOICES,
  palettes,
  resolveScheme,
  STYLES,
  isFixed,
  isScene,
  takesGlass,
  CUSTOM_GROUNDS,
  checkedTones,
  setSystemTones,
  TONE_NAMES,
  type SystemTones,
} from '../theme/colors';
import { rawAccent, withAlpha } from '../theme/colors';
import { backdropKind, GLASS_KINDS, glassSide, inkGround, paneFrame, withLook } from '../theme/glass';
import { changeLook, checkedLook, DEFAULT_LOOK, KEPT_LOOK, loadLockScreenLook, saveLockScreenLook } from '../theme/look';
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
  assert.equal(resolveScheme('classic', 'dark', 'light'), 'dark');
  assert.equal(resolveScheme('nocturne', 'light', 'light'), 'dark');
});

test('a new space looks as the maintainer chose; a kept look missing them keeps the old defaults', () => {
  const { style, theme, palette, customAccent, frameText, look, glassKind, bubbles, font } = DEFAULT_LOOK;
  assert.deepEqual(
    { style, theme, palette, customAccent, frameText, look, glassKind, bubbles, font },
    { style: 'modernist', theme: 'system', palette: 'custom', customAccent: '#0EA5E9', frameText: 'palette', look: 'glass', glassKind: 'cards', bubbles: 'square', font: 'sans' },
  );
  assert.equal(resolveScheme(style, theme, 'light'), 'light');
  assert.equal(resolveScheme(style, theme, 'dark'), 'dark');
  const kept = checkedLook({ wallpaper: 'dots' });
  assert.deepEqual([kept.style, kept.theme, kept.palette, kept.look, kept.bubbles, kept.font], ['classic', 'dark', 'auto', 'flat', 'round', 'style']);
  assert.deepEqual(checkedLook(null), DEFAULT_LOOK);
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

test('puts dark text on a light color of your own, in the dark too', () => {
  for (const scheme of SCHEMES) {
    const c = buildColors('classic', scheme, 'custom', { customAccent: '#0EA5E9', frameText: 'palette' });
    assert.ok(contrast(c.primary, c.onPrimary) >= 4.5, `${scheme}: button`);
    assert.ok(contrast(c.hero, c.heroText) >= 4.5, `${scheme}: hero`);
    const glass = withLook(c, { look: 'glass', style: 'classic', scheme, palette: 'custom', customAccent: '#0EA5E9' });
    assert.ok(contrast(glass.primary, glass.onPrimary) >= 4.5, `${scheme} glass: button`);
  }
  // A dark color keeps white on it.
  const deep = buildColors('classic', 'dark', 'custom', { customAccent: '#1E3A8A', frameText: 'palette' });
  assert.equal(deep.onPrimary, '#FFFFFF');
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
          if (frameText === 'white' && !isFixed(style)) {
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
  assert.deepEqual(checkedLook({ style: 'glass', theme: 'dusk', palette: 'nope', customAccent: 'red' }), KEPT_LOOK);
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

/** A #rrggbb or rgba() colour as an opaque one over a ground, for contrast. */
function over(color: string, ground: string): string {
  const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color);
  if (!m) return color;
  const n = parseInt(ground.slice(1), 16);
  const g = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const a = Number(m[4]);
  const ch = (i: number) => Math.round(a * Number(m[i + 1]) + (1 - a) * g[i]).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

test('the flat look changes nothing but lets Nocturne\'s glow through; glass draws the wallpaper', () => {
  const c = buildColors('classic', 'dark', 'auto');
  assert.equal(withLook(c, { look: 'flat', style: 'classic', scheme: 'dark', palette: 'auto', customAccent: '#D9A441' }), c);
  const night = buildColors('nocturne', 'dark', 'auto');
  assert.equal(withLook(night, { look: 'flat', style: 'nocturne', scheme: 'dark', palette: 'auto', customAccent: '' }).ground, 'transparent');
  assert.equal(backdropKind('classic', 'flat'), null);
  assert.equal(backdropKind('nocturne', 'flat'), 'glow');
  assert.equal(backdropKind('modernist', 'glass'), 'wall');
  assert.deepEqual(paneFrame(390), { left: 8, width: 374, radius: 22 });
});

test('glass turns surfaces, lines, bars and sheets to glass and keeps every fill', () => {
  const c = buildColors('classic', 'light', 'kipos');
  const g = withLook(c, { look: 'glass', style: 'classic', scheme: 'light', palette: 'kipos', customAccent: '#D9A441', blur: false });
  assert.equal(g.ground, 'transparent');
  assert.equal(g.background, '#FBFCFD');
  assert.equal(g.surface, 'rgba(255, 255, 255, 0.66)');
  assert.equal(g.popover, 'rgba(255, 255, 255, 0.97)');
  for (const key of ['primary', 'onPrimary', 'hero', 'heroText', 'overlay'] as const) assert.equal(g[key], c[key]);
  const blurred = withLook(c, { look: 'glass', style: 'classic', scheme: 'light', palette: 'kipos', customAccent: '#D9A441', blur: true });
  assert.equal(blurred.popover, blurred.sheet);
});

test('under glass every ink reads on the wallpaper or the pane, in every kind, style, scheme and palette', () => {
  for (const glassKind of GLASS_KINDS) {
    for (const style of STYLES.filter(takesGlass)) {
      for (const theme of SCHEMES) {
        const scheme = resolveScheme(style, theme, null);
        for (const palette of PALETTE_CHOICES) {
          for (const frameText of FRAME_TEXTS) {
            const opts = { customAccent: '#D9A441', frameText, frameTextColor: '#FFFFFF' };
            const g = withLook(buildColors(style, scheme, palette, opts), { look: 'glass', glassKind, style, scheme, palette, customAccent: '#D9A441' });
            const side = glassSide(scheme);
            const accent = rawAccent(style, scheme, palette, '#D9A441');
            const [wall, field] = [inkGround(side, accent, false, glassKind), inkGround(side, accent, true, glassKind)];
            const where = `${glassKind} ${style} ${scheme} ${palette} ${frameText}`;
            for (const key of ['text', 'textMuted'] as const) assert.ok(contrast(g[key], field) >= 4.5, `${where}: ${key}`);
            assert.ok(contrast(g.textFaint, field) >= 3, `${where}: textFaint`);
            for (const key of ['accentText', 'success', 'warning', 'danger'] as const) assert.ok(contrast(g[key], wall) >= 4.5, `${where}: ${key}`);
            // On their tints: a danger button's label, the chosen chip's.
            assert.ok(contrast(g.danger, over(withAlpha(g.danger, 0.12), wall)) >= 4.5, `${where}: danger on its tint`);
            assert.ok(contrast(g.accentText, over(withAlpha(g.primary, 0.14), wall)) >= 4.5, `${where}: chosen chip`);
            if (style === 'nocturne') assert.ok(contrast(NOCTURNE.accentPale, field) >= 4.5, `${where}: kicker`);
          }
        }
      }
    }
  }
});

test('a kept look keeps flat or glass and the kind of glass', () => {
  assert.deepEqual(checkedLook({ ...DEFAULT_LOOK, look: 'glass', glassKind: 'sheet' }), { ...DEFAULT_LOOK, look: 'glass', glassKind: 'sheet' });
  assert.deepEqual(checkedLook({ ...DEFAULT_LOOK, look: 'frosted', glassKind: 'bowl' }), { ...DEFAULT_LOOK, look: KEPT_LOOK.look, glassKind: KEPT_LOOK.glassKind });
});

test('Neon and Matrix are dark in their own colours, take no glass, and draw their scenes', () => {
  for (const style of ['neon', 'matrix'] as const) {
    assert.equal(resolveScheme(style, 'light', 'light'), 'dark');
    const c = buildColors(style, 'dark', 'kipos', { customAccent: '#2F7FC4', frameText: 'white' });
    assert.deepEqual(c, buildColors(style, 'light', 'auto'));
    assert.ok(contrast(c.primary, c.onPrimary) >= 4.5, `${style}: text on the accent`);
    assert.ok(contrast(c.textMuted, c.background) >= 4.5, `${style}: muted`);
    assert.ok(contrast(c.textFaint, c.background) >= 3, `${style}: faint`);
    assert.ok(contrast(c.text, c.surfaceAlt) >= 4.5, `${style}: their messages`);
    assert.equal(withLook(c, { look: 'glass', style, scheme: 'dark', palette: 'auto', customAccent: '' }).ground, 'transparent');
    assert.equal(withLook(c, { look: 'glass', style, scheme: 'dark', palette: 'auto', customAccent: '' }).surface, c.surface);
  }
  assert.equal(backdropKind('neon', 'glass'), 'grid');
  assert.equal(backdropKind('matrix', 'flat'), 'rain');
  const modern = { ...DEFAULT_LOOK, style: 'modernist' as const };
  assert.equal(changeLook(modern, { style: 'matrix' }).prevStyle, 'modernist');
  assert.equal(changeLook(changeLook(modern, { style: 'neon' }), { style: 'matrix' }).prevStyle, 'modernist');
});

test('a kept look keeps how messages are drawn', () => {
  assert.equal(checkedLook({ ...DEFAULT_LOOK, bubbles: 'line' }).bubbles, 'line');
  assert.equal(checkedLook({ ...DEFAULT_LOOK, bubbles: 'blob' }).bubbles, 'round');
  assert.equal(checkedLook({ ...DEFAULT_LOOK, style: 'matrix' }).style, 'matrix');
});

test('Paper and Aurora are light in their own colours, with their scenes and no glass', () => {
  for (const style of ['paper', 'aurora'] as const) {
    assert.equal(resolveScheme(style, 'dark', 'dark'), 'light');
    assert.ok(isScene(style) && !takesGlass(style));
    const c = buildColors(style, 'light', 'kipos', { customAccent: '#2F7FC4', frameText: 'white' });
    assert.deepEqual(c, buildColors(style, 'dark', 'auto'));
    assert.ok(contrast(c.primary, c.onPrimary) >= 4.5, `${style}: text on the accent`);
    assert.ok(contrast(c.textMuted, c.background) >= 4.5, `${style}: muted`);
    assert.ok(contrast(c.textFaint, c.background) >= 3, `${style}: faint`);
    assert.ok(contrast(c.text, c.surfaceAlt) >= 4.5, `${style}: their messages`);
    for (const key of ['warning', 'danger'] as const) assert.ok(contrast(c[key], c.background) >= 4.5, `${style}: ${key}`);
  }
  assert.equal(backdropKind('paper', 'flat'), 'ruled');
  assert.equal(backdropKind('aurora', 'glass'), 'aurora');
});

test('Custom reads on every background and accent offered, light or dark as its background', () => {
  assert.equal(resolveScheme('custom', 'dark', 'dark', '#FFFFFF'), 'light');
  assert.equal(resolveScheme('custom', 'light', 'light', '#0D0B09'), 'dark');
  assert.ok(!takesGlass('custom'));
  assert.equal(backdropKind('custom', 'glass'), null);
  for (const customGround of CUSTOM_GROUNDS) {
    for (const customAccent of customAccentChoices()) {
      const c = buildColors('custom', 'light', 'auto', { customAccent, customGround, frameText: 'palette' });
      const where = `custom ${customGround} ${customAccent}`;
      assert.equal(c.background, customGround);
      for (const [key, value] of Object.entries(c)) {
        if (key !== 'overlay') assert.match(value, /^#[0-9A-F]{6}$/i, `${where}: ${key}`);
      }
      assert.ok(contrast(c.text, c.background) >= 7, `${where}: text`);
      assert.ok(contrast(c.text, c.surfaceAlt) >= 4.5, `${where}: their messages`);
      for (const key of ['textMuted', 'accentText', 'success', 'warning', 'danger'] as const) {
        assert.ok(contrast(c[key], c.background) >= 4.5, `${where}: ${key}`);
      }
      assert.ok(contrast(c.textFaint, c.background) >= 3, `${where}: faint`);
      assert.ok(contrast(c.primary, c.onPrimary) >= 3, `${where}: text on the accent`);
    }
  }
  // Not a glass look: the screens are painted with the background itself.
  const c = buildColors('custom', 'dark', 'auto', { customAccent: '#D9A441', customGround: '#0F1A24', frameText: 'palette' });
  assert.equal(withLook(c, { look: 'glass', style: 'custom', scheme: 'dark', palette: 'auto', customAccent: '#D9A441' }).ground, '#0F1A24');
});

test('a kept look keeps the Custom background', () => {
  assert.equal(checkedLook({ ...DEFAULT_LOOK, customGround: '#0f1a24' }).customGround, '#0F1A24');
  assert.equal(checkedLook({ ...DEFAULT_LOOK, customGround: 'blue' }).customGround, DEFAULT_LOOK.customGround);
});

test('a wallpaper lies behind the screens of any style', () => {
  for (const style of STYLES) {
    assert.equal(backdropKind(style, 'flat', 'dots'), 'pattern', style);
    const c = buildColors(style, 'dark', 'auto', { customAccent: '#D9A441', frameText: 'palette' });
    const flat = withLook(c, { look: 'flat', style, scheme: 'dark', palette: 'auto', customAccent: '#D9A441', wallpaper: 'stars' });
    assert.equal(flat.ground, 'transparent', style);
    // The pattern lies on the style's own ground, so the text reads as it does there.
    assert.equal(flat.background, c.background, style);
  }
  // Plain takes a style's scene or glow away, but the glass keeps its wallpaper.
  assert.equal(backdropKind('neon', 'flat', 'plain'), null);
  assert.equal(backdropKind('nocturne', 'flat', 'plain'), null);
  assert.equal(backdropKind('classic', 'glass', 'plain'), 'wall');
  assert.equal(backdropKind('paper', 'flat', 'auto'), 'ruled');
  assert.equal(checkedLook({ ...DEFAULT_LOOK, wallpaper: 'bokeh' }).wallpaper, 'bokeh');
  assert.equal(checkedLook({ ...DEFAULT_LOOK, wallpaper: 'photo' }).wallpaper, 'auto');
  assert.equal(checkedLook({}).wallpaper, 'auto');
});

test('a photo wallpaper keeps its photo in the space, and the password screen\'s copy leaves it out', async () => {
  const photo = { id: 'ab'.repeat(16), key: 'cd'.repeat(32) };
  const look = checkedLook({ ...DEFAULT_LOOK, wallpaper: 'photo', wallpaperPhoto: photo });
  assert.equal(look.wallpaper, 'photo');
  assert.deepEqual(look.wallpaperPhoto, photo);
  assert.equal(backdropKind('classic', 'flat', 'photo'), 'pattern');
  // Without its photo it is the style's own.
  assert.equal(checkedLook({ ...DEFAULT_LOOK, wallpaper: 'photo' }).wallpaper, 'auto');
  assert.equal(checkedLook({ ...DEFAULT_LOOK, wallpaper: 'photo', wallpaperPhoto: { id: 'x', key: 'y' } }).wallpaperPhoto, null);
  await saveLockScreenLook(look);
  const copy = await loadLockScreenLook();
  assert.equal(copy.wallpaper, 'auto');
  assert.equal(copy.wallpaperPhoto, null);
});

// Material 3's baseline tones, as a phone with its purple wallpaper gives them: Android's
// system_*_0 to _1000, lightest first.
const BASELINE: SystemTones = {
  accent1: ['#FFFFFF', '#FFFBFE', '#F6EDFF', '#EADDFF', '#D0BCFF', '#B69DF8', '#9A82DB', '#7F67BE', '#6750A4', '#4F378B', '#381E72', '#21005D', '#000000'],
  accent2: ['#FFFFFF', '#FFFBFE', '#F6EDFF', '#E8DEF8', '#CCC2DC', '#B0A7C0', '#958DA5', '#7A7289', '#625B71', '#4A4458', '#332D41', '#1D192B', '#000000'],
  accent3: ['#FFFFFF', '#FFFBFA', '#FFECF1', '#FFD8E4', '#EFB8C8', '#D29DAC', '#B58392', '#986977', '#7D5260', '#633B48', '#492532', '#31111D', '#000000'],
  neutral1: ['#FFFFFF', '#FFFBFE', '#F4EFF4', '#E6E1E5', '#C9C5CA', '#AEAAAE', '#939094', '#787579', '#605D62', '#484649', '#313033', '#1C1B1F', '#000000'],
  neutral2: ['#FFFFFF', '#FFFBFE', '#F5EEFA', '#E7E0EC', '#CAC4D0', '#AEA9B4', '#938F99', '#79747E', '#605D66', '#49454F', '#322F37', '#1D1A22', '#000000'],
};

/** Greys at Android's tones (L* 100, 99, 95, 90 … 10, 0): a wallpaper with no colour at all. */
function greyTones(): SystemTones {
  const grey = (l: number) => {
    const y = l > 8 ? ((l + 16) / 116) ** 3 : l / 903.3;
    const v = Math.round(255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055));
    const h = v.toString(16).padStart(2, '0').toUpperCase();
    return `#${h}${h}${h}`;
  };
  const list = [100, 99, 95, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(grey);
  return Object.fromEntries(TONE_NAMES.map((name) => [name, list])) as SystemTones;
}

test("the phone's own colors are taken only whole: five palettes of 13 tones", () => {
  assert.deepEqual(checkedTones(BASELINE), BASELINE);
  const lower = Object.fromEntries(TONE_NAMES.map((name) => [name, BASELINE[name].map((c) => c.toLowerCase())]));
  assert.deepEqual(checkedTones(lower), BASELINE);
  assert.equal(checkedTones(null), null);
  assert.equal(checkedTones({ ...BASELINE, accent3: undefined }), null);
  assert.equal(checkedTones({ ...BASELINE, neutral1: BASELINE.neutral1.slice(1) }), null);
  assert.equal(checkedTones({ ...BASELINE, accent1: [...BASELINE.accent1.slice(1), 'black'] }), null);
});

test("Material You reads well in the phone's colors, light or dark as the theme says, and takes no glass", () => {
  assert.equal(resolveScheme('material', 'light', 'dark'), 'light');
  assert.equal(resolveScheme('material', 'system', 'dark'), 'dark');
  assert.equal(resolveScheme('material', 'system', 'light'), 'light');
  assert.ok(isFixed('material') && !takesGlass('material') && !isScene('material'));
  assert.equal(backdropKind('material', 'glass'), null);
  // Where the phone gives no colours, it shows in Classic's.
  setSystemTones(null);
  assert.deepEqual(buildColors('material', 'dark', 'auto'), buildColors('classic', 'dark', 'auto'));
  try {
    for (const tones of [BASELINE, greyTones()]) {
      setSystemTones(tones);
      for (const scheme of SCHEMES) {
        const c = buildColors('material', scheme, 'auto');
        const where = `material ${scheme} ${tones.accent1[8]}`;
        for (const [key, value] of Object.entries(c)) {
          if (key !== 'overlay') assert.match(value, /^#[0-9A-F]{6}$/, `${where}: ${key}`);
        }
        assert.equal(c.primary, tones.accent1[scheme === 'light' ? 8 : 4], `${where}: the phone's accent`);
        assert.equal(c.text, tones.neutral1[scheme === 'light' ? 11 : 3], `${where}: the phone's text`);
        assert.ok(contrast(c.text, c.background) >= 7, `${where}: text`);
        for (const ground of [c.surface, c.surfaceAlt]) assert.ok(contrast(c.text, ground) >= 4.5, `${where}: text on ${ground}`);
        for (const key of ['textMuted', 'accentText', 'success', 'warning', 'danger'] as const) {
          assert.ok(contrast(c[key], c.background) >= 4.5, `${where}: ${key}`);
        }
        assert.ok(contrast(c.textFaint, c.background) >= 3, `${where}: faint`);
        assert.ok(contrast(c.primary, c.onPrimary) >= 4.5, `${where}: text on the accent`);
        assert.ok(contrast(c.hero, c.heroText) >= 4.5, `${where}: text on colored areas`);
        // The palettes and the text on coloured areas leave it as it is.
        assert.deepEqual(buildColors('material', scheme, 'kipos', { customAccent: '#2F7FC4', frameText: 'white' }), c);
        assert.equal(rawAccent('material', scheme, 'auto', '#D9A441'), c.primary);
      }
    }
  } finally {
    setSystemTones(null);
  }
  // Kept with the look, and a palette chosen from it goes back to the style before.
  assert.equal(checkedLook({ ...DEFAULT_LOOK, style: 'material' }).style, 'material');
  assert.equal(changeLook({ ...DEFAULT_LOOK, style: 'modernist' }, { style: 'material' }).prevStyle, 'modernist');
});
