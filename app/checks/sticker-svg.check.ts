// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The built-in stickers as pictures (lib/sticker-svg.ts), for the networks that take a sticker only
// as an image: every sticker of every set is one well-formed SVG document, the same each time, its
// numbers all numbers; a name Erevos does not have, or one of a set gone from the picker, has none;
// a Words sticker carries its words in the app's language, escaped for XML, in at most two lines
// as the screen sets them; and the PNGs made of them (lib/sticker-image.ts) are kept in memory by
// name, language and size, each caller getting bytes of its own. A picked one goes to another
// network (lib/sticker-send.ts) as its PNG, 512 across or smaller to fit an MMS, with its words in
// the app's language; nothing goes for one with no picture.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lang, LANGS, setLang, words, type Lang } from '../lib/i18n';
import { SEND_SIDES, stickerToSend } from '../lib/sticker-send';
import { escapeXml, PNG_SIDES, pngSize, sizedSvg, stickerPng, stickerSvg, wordsLayout, wordsWidth, type StickerPng } from '../lib/sticker-svg';
import { GONE_SETS, SETS, STICKERS, stickersIn, WORDS_ROOM, wordsLines, wordsSize } from '../lib/stickers';

/** What is wrong with `xml` as one XML document: tags out of balance, bad attributes, ids and what points to them. */
function problems(xml: string): string[] {
  const found: string[] = [];
  const open: string[] = [];
  const ids = new Set<string>();
  const pointed: string[] = [];
  const NUMERIC = new Set(['x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'font-size', 'stroke-width', 'opacity', 'stop-opacity', 'fill-opacity', 'stroke-opacity']);
  const token = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*="[^"<]*")*)\s*(\/?)>|([^<]+)|(<)/g;
  let at = 0;
  let roots = 0;
  for (let m = token.exec(xml); m; m = token.exec(xml)) {
    if (m.index !== at) found.push(`what is at ${at} is no tag`);
    at = token.lastIndex;
    if (m[6]) {
      found.push(`a < that opens no tag at ${m.index}`);
      continue;
    }
    if (m[5] !== undefined) {
      if (open.length === 0) found.push('text outside the root');
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(m[5])) found.push(`a bare & in ${JSON.stringify(m[5])}`);
      continue;
    }
    const [, closing, tag, attrs, self] = m;
    if (closing) {
      if (attrs || self) found.push(`</${tag}> with attributes`);
      if (open.pop() !== tag) found.push(`</${tag}> closes what it did not open`);
      continue;
    }
    if (open.length === 0 && roots++ > 0) found.push('a second root');
    const names = new Set<string>();
    for (const [, name, value] of attrs.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
      if (names.has(name)) found.push(`<${tag}> has ${name} twice`);
      names.add(name);
      if (/\b(NaN|undefined|null|Infinity)\b/.test(value)) found.push(`<${tag} ${name}="${value}">`);
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(value)) found.push(`a bare & in ${name}`);
      if (NUMERIC.has(name) && !(value.trim() !== '' && Number.isFinite(Number(value.replace(/%$/, ''))))) found.push(`<${tag} ${name}="${value}"> is no number`);
      if (name === 'id') {
        if (ids.has(value)) found.push(`id ${value} twice`);
        ids.add(value);
      }
      for (const [, id] of value.matchAll(/url\(#([^)]+)\)/g)) pointed.push(id);
      if (/(^|:)href$/.test(name) && value.startsWith('#')) pointed.push(value.slice(1));
    }
    if (!self) open.push(tag);
  }
  if (at !== xml.length) found.push('something after the last tag');
  if (open.length > 0) found.push(`not closed: ${open.join(', ')}`);
  for (const id of pointed) if (!ids.has(id)) found.push(`#${id} points nowhere`);
  return found;
}

/** The words a sticker's SVG writes, its lines joined. */
const written = (svg: string) => [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');

const shown = STICKERS.filter((sticker) => !GONE_SETS.includes(sticker.set));

async function inLanguage<T>(l: Lang, run: () => T | Promise<T>): Promise<T> {
  const before = lang();
  await setLang(l);
  try {
    return await run();
  } finally {
    await setLang(before);
  }
}

test('the check finds what is not well-formed', () => {
  assert.deepEqual(problems('<svg><g/><text x="1">a &amp; b</text></svg>'), []);
  const bad = ['<svg><g></svg>', '<svg></g></svg>', '<svg x="NaN"/>', '<svg r="1px"/>', '<svg>a & b</svg>', '<svg/><svg/>', '<svg fill="url(#c1)"/>', '<svg><g id="a"/><g id="a"/></svg>', '<svg><g x="1" x="2"/></svg>', '<svg>'];
  for (const xml of bad) assert.notDeepEqual(problems(xml), [], xml);
});

test('every sticker of every set is one well-formed SVG document on the grid of 100, with a clear ground', () => {
  let count = 0;
  for (const { set } of SETS) {
    for (const sticker of stickersIn(set)) {
      const svg = stickerSvg(sticker.name);
      assert.ok(svg, `${sticker.name} has a picture`);
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), sticker.name);
      assert.match(svg, /^<svg [^>]*viewBox="0 0 100 100"/, sticker.name);
      assert.ok(svg.endsWith('</svg>'), sticker.name);
      // No ground of its own: the picture starts with what the sticker draws, not a box over all of it.
      assert.doesNotMatch(svg, /^<svg[^>]*><rect x="0" y="0" width="100" height="100"/, sticker.name);
      assert.deepEqual(problems(svg), [], sticker.name);
      count += 1;
    }
  }
  assert.equal(count, shown.length);
});

test('a sticker is drawn the same every time, whatever was drawn before it', () => {
  const first = new Map(shown.map((sticker) => [sticker.name, stickerSvg(sticker.name)]));
  for (const sticker of [...shown].reverse()) assert.equal(stickerSvg(sticker.name), first.get(sticker.name), sticker.name);
});

test('a name Erevos does not have, or one of a set gone from the picker, has no picture', () => {
  for (const name of ['', 'no-such-sticker', 'MOON-SMILE', ' moon-smile', '__proto__', 'constructor', 'toString', 'hasOwnProperty']) assert.equal(stickerSvg(name), null, JSON.stringify(name));
  const gone = STICKERS.filter((sticker) => GONE_SETS.includes(sticker.set));
  assert.ok(gone.length > 0);
  for (const sticker of gone) assert.equal(stickerSvg(sticker.name), null, sticker.name);
});

test('the shapes come out as the views draw them', () => {
  const smile = stickerSvg('moon-smile')!;
  // The moon's disc (a box rounded to a circle), its edge inside its outline, an eye and the smile (a ring's bottom quarter).
  assert.match(smile, /<rect x="6" y="6" width="88" height="88" rx="44" ry="44" fill="#F4CF57"\/>/);
  assert.match(smile, /<path d="M50 6H50A44 44 0 0 1 94 50[^"]*ZM50 9H50A41 41 0 0 1 91 50[^"]*Z" fill-rule="evenodd" fill="#D9A441"\/>/);
  assert.match(smile, /<circle cx="36" cy="40" r="4.5" fill="#3B2A1A"\/>/);
  assert.match(smile, /<path d="M62.728 62.728A18 18 0 0 1 37.272 62.728L40.808 59.192A13 13 0 0 0 59.192 59.192Z" fill="#3B2A1A"\/>/);
  // A heart is a square on its corner with two discs; a planet's ring is pressed and turned, its border with it.
  assert.match(stickerSvg('heart')!, /<g transform="rotate\(45 /);
  assert.match(stickerSvg('planet')!, /rotate\(-18\) scale\(1 0\.266667\)/);
  // Tux's layers keep their gradients, each with an id of its own, fitted into their box and cut to it.
  const tux = stickerSvg('tux-hello')!;
  assert.match(tux, /<g clip-path="url\(#c\d+\)"><g transform="matrix\(0\.346863 0 0 0\.346863 /);
  assert.match(tux, /id="l\d+_tux1"/);
  assert.doesNotMatch(tux, /id="tux1"/);
});

test('a Words sticker writes its words escaped for XML, and nothing XML cannot hold', () => {
  const svg = stickerSvg('hello', 'Tom & Jerry <3 "yes" \'no\'\u0007')!;
  assert.deepEqual(problems(svg), []);
  assert.equal(written(svg), 'Tom &amp; Jerry &lt;3 &quot;yes&quot; &apos;no&apos;');
  assert.equal(escapeXml('a<b>&"c"\''), 'a&lt;b&gt;&amp;&quot;c&quot;&apos;');
  // Only a Words sticker writes words.
  assert.equal(written(stickerSvg('moon-smile', 'Hello')!), '');
});

test('a Words sticker writes its words in the app\'s language, as the screen shows them', async () => {
  for (const l of LANGS) {
    await inLanguage(l, () => {
      for (const sticker of stickersIn('words')) {
        const text = words(l)[sticker.label] ?? sticker.label;
        assert.equal(written(stickerSvg(sticker.name)!), escapeXml(text), `${l} ${sticker.name}`);
      }
    });
  }
});

test('the words are as large as the screen draws them, in at most two lines that fit the card', () => {
  for (const l of LANGS) {
    for (const sticker of stickersIn('words')) {
      const text = words(l)[sticker.label] ?? sticker.label;
      const { size, lines } = wordsLayout(text);
      assert.equal(size, wordsSize(text), `${l} ${text}`);
      assert.ok(lines.length >= 1 && lines.length <= 2, `${l} ${text}`);
      // Never more lines than the screen's own count, and broken between words only.
      assert.ok(lines.length <= wordsLines(text, size), `${l} ${text}`);
      assert.equal(lines.join(' '), text.split(/\s+/).join(' '), `${l} ${text}`);
      for (const line of lines) assert.ok(!line.includes(' ') || wordsWidth(line) * size <= WORDS_ROOM, `${l} ${line}`);
    }
  }
  // Words that would take more than two lines are made smaller, and at the smallest cut short.
  const long = wordsLayout('word '.repeat(60));
  assert.equal(long.lines.length, 2);
  assert.ok(long.size < wordsSize('word '.repeat(60)));
  assert.ok(long.lines[1].endsWith('…'));
  assert.deepEqual(wordsLayout('   ').lines, []);
});

// A PNG's first bytes, as wide and as high as said.
function pngHeader(w: number, h: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, w);
  new DataView(bytes.buffer).setUint32(20, h);
  return bytes;
}

test('a PNG\'s size is read from its header', () => {
  // A real one, one point across.
  const dot = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
  assert.deepEqual(pngSize(dot), { w: 1, h: 1 });
  assert.deepEqual(pngSize(pngHeader(512, 256)), { w: 512, h: 256 });
  assert.equal(pngSize(new Uint8Array(10)), null);
  assert.equal(pngSize(Uint8Array.from([0xff, 0xd8, 0xff, ...new Uint8Array(30)])), null);
  assert.equal(pngSize(pngHeader(0, 5)), null);
  assert.equal(sizedSvg('<svg xmlns="x" viewBox="0 0 100 100"></svg>', 512), '<svg width="512" height="512" xmlns="x" viewBox="0 0 100 100"></svg>');
});

test('a sticker\'s PNG is made once for each name, language and size, and each caller gets bytes of its own', async () => {
  const asked: string[] = [];
  const draw = async (svg: string, size: number) => {
    asked.push(`${size} ${svg.length}`);
    return pngHeader(size, size);
  };
  const first = await stickerPng('moon-smile', 256, draw);
  assert.ok(first);
  assert.equal(first.mime, 'image/png');
  assert.equal(first.w, 256);
  assert.equal(first.h, 256);
  first.bytes[0] = 0;
  const again = await stickerPng('moon-smile', 256, draw);
  assert.equal(again?.bytes[0], 0x89, 'kept bytes are not the caller\'s');
  assert.equal(asked.length, 1, 'kept');
  // At once, twice: drawn once.
  await Promise.all([stickerPng('heart', 256, draw), stickerPng('heart', 256, draw)]);
  assert.equal(asked.length, 2);
  await stickerPng('moon-smile', 128, draw);
  assert.equal(asked.length, 3, 'another size');
  // In another language a Words sticker says other words, so it is drawn again.
  await inLanguage(lang() === 'el' ? 'de' : 'el', () => stickerPng('moon-smile', 256, draw));
  assert.equal(asked.length, 4, 'another language');
  // None for a name with no picture, nor a size out of bounds: nothing is drawn for them.
  assert.equal(await stickerPng('no-such-sticker', 256, draw), null);
  assert.equal(await stickerPng(STICKERS.find((s) => GONE_SETS.includes(s.set))!.name, 256, draw), null);
  for (const size of [PNG_SIDES.least - 1, PNG_SIDES.most + 1, Number.NaN, Infinity]) assert.equal(await stickerPng('sun', size, draw), null, String(size));
  assert.equal(asked.length, 4);
  // What the rasterizer could not draw is null, and tried again the next time.
  let tries = 0;
  const fails = async () => {
    tries += 1;
    return tries === 1 ? null : tries === 2 ? Uint8Array.from([1, 2, 3]) : pngHeader(64, 64);
  };
  assert.equal(await stickerPng('sun', 64, fails), null);
  assert.equal(await stickerPng('sun', 64, fails), null, 'not a PNG');
  assert.deepEqual(await stickerPng('sun', 64, fails).then((png) => png && [png.w, png.h]), [64, 64]);
  assert.equal(tries, 3);
  const throws = async (): Promise<Uint8Array | null> => {
    throw new Error('no canvas');
  };
  assert.equal(await stickerPng('coffee', 64, throws), null);
});

test('a built-in sticker picked for another network goes as its PNG, 512 across, with its words in the app\'s language', async () => {
  const asked: string[] = [];
  const draw = async (name: string, size: number): Promise<StickerPng | null> => {
    asked.push(`${name} ${size}`);
    return { bytes: pngHeader(size, size), mime: 'image/png', w: size, h: size };
  };
  const smile = await inLanguage('en', () => stickerToSend('moon-smile', draw));
  assert.ok(smile);
  assert.deepEqual([smile.mime, smile.w, smile.h, smile.label], ['image/png', 512, 512, 'Smiling moon']);
  assert.deepEqual(pngSize(smile.bytes), { w: 512, h: 512 });
  assert.deepEqual(asked, ['moon-smile 512']);
  // A Words sticker says its words, and another its name, as the screen says them, in each language.
  for (const l of LANGS) {
    await inLanguage(l, async () => {
      for (const sticker of [stickersIn('words')[0], stickersIn('moons')[0], stickersIn('tux')[3]]) {
        const sent = await stickerToSend(sticker.name, draw);
        assert.equal(sent?.label, words(l)[sticker.label] ?? sticker.label, `${l} ${sticker.name}`);
      }
    });
  }
  // With the real drawing's memory, as the phone and the computer make it.
  const drawn = await stickerToSend('thank-you', (name, size) => stickerPng(name, size, async (_, side) => pngHeader(side, side)));
  assert.deepEqual(drawn && [drawn.w, drawn.h, drawn.mime], [512, 512, 'image/png']);
  assert.equal(SEND_SIDES[0], 512);
});

test('nothing goes for a sticker Erevos does not have, one of a set gone, or one whose picture could not be made', async () => {
  let calls = 0;
  const draw = async (_: string, size: number): Promise<StickerPng | null> => {
    calls += 1;
    return { bytes: pngHeader(size, size), mime: 'image/png', w: size, h: size };
  };
  const gone = STICKERS.find((sticker) => GONE_SETS.includes(sticker.set))!;
  for (const name of ['', 'no-such-sticker', 'MOON-SMILE', '__proto__', 'constructor', gone.name]) assert.equal(await stickerToSend(name, draw), null, JSON.stringify(name));
  assert.equal(calls, 0, 'nothing is drawn for them');
  // No picture, one that throws, one that is not a PNG or has no size: nothing, and no smaller one is tried.
  const bad: ((name: string, size: number) => Promise<StickerPng | null>)[] = [
    async () => null,
    async () => {
      throw new Error('no canvas');
    },
    () => {
      throw new Error('not even a promise');
    },
    async () => ({ bytes: new Uint8Array(0), mime: 'image/png', w: 512, h: 512 }),
    async () => ({ bytes: pngHeader(512, 512), mime: 'image/png', w: 0, h: 512 }),
    async () => ({ bytes: pngHeader(512, 512), mime: 'image/jpeg' as 'image/png', w: 512, h: 512 }),
  ];
  for (const [i, fails] of bad.entries()) {
    let tries = 0;
    const counted = (name: string, size: number) => {
      tries += 1;
      return fails(name, size);
    };
    assert.equal(await stickerToSend('sun', counted), null, String(i));
    assert.equal(tries, 1, String(i));
  }
});

test('for an MMS a sticker\'s picture is made smaller until it fits, or none goes', async () => {
  const sizes: number[] = [];
  // As many bytes as a hundred times its side.
  const draw = async (_: string, size: number): Promise<StickerPng | null> => {
    sizes.push(size);
    const bytes = new Uint8Array(size * 100);
    bytes.set(pngHeader(size, size));
    return { bytes, mime: 'image/png', w: size, h: size };
  };
  const fits = await stickerToSend('heart', draw, 300 * 100);
  assert.deepEqual(fits && [fits.w, fits.bytes.length], [256, 25_600]);
  assert.deepEqual(sizes, [512, 384, 256]);
  sizes.length = 0;
  assert.equal((await stickerToSend('heart', draw, 51_200))?.w, 512, 'as many bytes as it may have');
  assert.deepEqual(sizes, [512]);
  sizes.length = 0;
  assert.equal(await stickerToSend('heart', draw, 1000), null);
  assert.deepEqual(sizes, [...SEND_SIDES]);
});
