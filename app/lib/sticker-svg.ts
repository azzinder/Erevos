// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { lang, t } from './i18n';
import { ART, type Corners, type Shape } from './sticker-art';
import { GONE_SETS, stickerOf, WORDS_ROOM, wordsSize } from './stickers';

// A built-in sticker (lib/stickers.ts) as a picture of its own, for the networks that take a
// sticker only as an image (Matrix, XMPP, Nostr, MMS and the like): one SVG document of its shapes
// (lib/sticker-art.ts) on the grid of 100 by 100, at rest, on a clear ground, each shape drawn as
// components/stickers.tsx draws it with views (a disc's rounded box, a triangle's borders, a
// side's border colour, the turns about a shape's middle), so the picture is the sticker as it
// shows in Erevos. A Words sticker carries its words in the app's language. lib/sticker-image.ts
// makes a PNG of it on the device itself: nothing is fetched. Plain TypeScript, so the checks run
// it under Node.

const NS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';

/** A number for an attribute, short (`digits` after the point); NaN or Infinity throws, and stickerSvg gives no picture. */
function num(value: number, digits = 3): string {
  if (!Number.isFinite(value)) throw new RangeError('A sticker shape has a number that is not one');
  const short = Math.round(value * 10 ** digits) / 10 ** digits;
  return String(short === 0 ? 0 : short);
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** Text for XML, in an attribute or between tags, without what XML cannot hold. */
export function escapeXml(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

const paint = (c: string) => escapeXml(c === 'transparent' ? 'none' : c);

/** What drawing a sticker keeps as it goes: the clips (one <defs>), a counter for their ids, and the words. */
type Drawing = { defs: string[]; ids: number; words: string; xlink: boolean };

type Four = [number, number, number, number];

/**
 * A box's corners (top left, top right, bottom right, bottom left) as a browser and the phone round
 * them: when two corners of a side are more than the side, every corner shrinks alike until they fit.
 */
function radii(r: Corners | undefined, w: number, h: number): Four {
  const all = (typeof r === 'number' ? [r, r, r, r] : (r ?? [0, 0, 0, 0])).map((v) => Math.max(0, v)) as Four;
  const sides: [number, number][] = [
    [w, all[0] + all[1]],
    [h, all[1] + all[2]],
    [w, all[2] + all[3]],
    [h, all[3] + all[0]],
  ];
  const fit = Math.min(1, ...sides.filter(([, sum]) => sum > 0).map(([side, sum]) => Math.max(0, side) / sum));
  return all.map((v) => v * fit) as Four;
}

/** The outline of a box with rounded corners, as path data. */
function roundRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: Four): string {
  const corner = (r: number, ex: number, ey: number) => (r > 0 ? `A${num(r)} ${num(r)} 0 0 1 ${num(ex)} ${num(ey)}` : `L${num(ex)} ${num(ey)}`);
  return (
    `M${num(x + tl)} ${num(y)}H${num(x + w - tr)}${corner(tr, x + w, y + tr)}V${num(y + h - br)}${corner(br, x + w - br, y + h)}` +
    `H${num(x + bl)}${corner(bl, x, y + h - bl)}V${num(y + tl)}${corner(tl, x + tl, y)}Z`
  );
}

/** A turn about a point, as a transform attribute; none for no turn. */
const turned = (turn: number, x: number, y: number) => (turn ? ` transform="rotate(${num(turn)} ${num(x)} ${num(y)})"` : '');

/** Where the middle of a line of the words sits above its baseline, as a share of their size. */
const BASELINE = 0.35;

/** The fonts the words are asked in: the app's own first, then the computer's or the phone's bold sans-serif. */
const WORDS_FONT = 'Inter Tight, Inter, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif';

/**
 * About how wide `text` is in bold sans-serif letters (the app's Inter Tight, a phone's Roboto), as
 * a share of their size: closer than lib/stickers.ts's even estimate, which sizes the words to fit
 * whatever the font, so the lines break where the screen breaks them.
 */
export function wordsWidth(text: string): number {
  let width = 0;
  for (const letter of text) {
    width += /\s/.test(letter)
      ? 0.25
      : /[ijlIΙιίΐϊ.,;:'’!|]/.test(letter)
        ? 0.3
        : /[tfr\-()"“”«»]/.test(letter)
          ? 0.42
          : /[mwMWΜωώψφΦΨΩ]/.test(letter)
            ? 0.88
            : letter !== letter.toLowerCase()
              ? 0.72
              : 0.61;
  }
  return width;
}

/**
 * How a Words sticker's words are set on its card, `room` across: their size, as the screen
 * sizes them (lib/stickers.ts wordsSize; smaller still for words no size there fits in two
 * lines), and their lines, broken between words where they no longer fit; two at most, as the
 * screen shows them, the second cut short when there would be more.
 */
export function wordsLayout(words: string, room = WORDS_ROOM): { size: number; lines: string[] } {
  const all = words.split(/\s+/).filter(Boolean);
  const wrap = (size: number) => {
    const lines: string[] = [];
    for (const word of all) {
      const last = lines[lines.length - 1];
      if (last !== undefined && wordsWidth(`${last} ${word}`) * size <= room) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  let size = wordsSize(words);
  let lines = wrap(size);
  while (lines.length > 2 && size > 6) lines = wrap(--size);
  if (lines.length > 2) lines = [lines[0], `${lines[1]}…`];
  return { size, lines };
}

/** A drawing of curves (a shape `svg`) in its box, its viewBox fitted in as SvgXml fits it, cut to the box. */
function layer(xml: string, x: number, y: number, w: number, h: number, drawing: Drawing): string {
  const open = /^\s*(?:<\?xml[^>]*\?>\s*)?<svg\b([^>]*)>/.exec(xml);
  const close = xml.lastIndexOf('</svg>');
  if (!open || close < open.index + open[0].length) return '';
  const attrs = open[1];
  let body = xml.slice(open.index + open[0].length, close);
  const box = /\bviewBox="([^"]*)"/.exec(attrs)?.[1].trim().split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] = box && box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0 ? box : [0, 0, w, h];
  // preserveAspectRatio: xMidYMid meet unless the drawing says otherwise, as in a browser.
  const fitting = /\bpreserveAspectRatio="([^"]*)"/.exec(attrs)?.[1].trim() ?? '';
  let sx = w / vw;
  let sy = h / vh;
  let ax = 0.5;
  let ay = 0.5;
  if (fitting.startsWith('none')) {
    ax = ay = 0;
  } else {
    sx = sy = fitting.endsWith('slice') ? Math.max(sx, sy) : Math.min(sx, sy);
    const align = /x(Min|Mid|Max)Y(Min|Mid|Max)/.exec(fitting);
    if (align) {
      ax = { Min: 0, Mid: 0.5, Max: 1 }[align[1] as 'Min'];
      ay = { Min: 0, Mid: 0.5, Max: 1 }[align[2] as 'Min'];
    }
  }
  const tx = x + (w - vw * sx) * ax - vx * sx;
  const ty = y + (h - vh * sy) * ay - vy * sy;
  // Its ids are its own: each layer's are made distinct, and what points to them follows.
  drawing.ids += 1;
  const prefix = `l${drawing.ids}_`;
  const ids = new Set([...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  if (ids.size > 0) {
    const named = [...ids].map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    body = body.replace(new RegExp(`(\\bid="|url\\(#|href="#)(${named})(?=["\\)])`, 'g'), (_, before: string, id: string) => `${before}${prefix}${id}`);
  }
  if (/\bxlink:/.test(body)) drawing.xlink = true;
  // What the drawing's own <svg> says of its insides (a fill, a stroke) goes on the group in its place.
  const kept = [...attrs.matchAll(/\s([A-Za-z_:][-\w.:]*)="([^"]*)"/g)]
    .filter(([, name]) => !/^(xmlns(:\w+)?|viewBox|preserveAspectRatio|width|height|x|y|id|version|class|style)$/.test(name))
    .map(([, name, value]) => ` ${name}="${value}"`)
    .join('');
  drawing.ids += 1;
  const clip = `c${drawing.ids}`;
  drawing.defs.push(`<clipPath id="${clip}"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"/></clipPath>`);
  return `<g clip-path="url(#${clip})"><g transform="matrix(${num(sx, 6)} 0 0 ${num(sy, 6)} ${num(tx)} ${num(ty)})"${kept}>${body}</g></g>`;
}

/** A sticker's shapes as SVG, on the grid of 100 by 100, as components/stickers.tsx draws them. */
function drawn(shapes: Shape[], drawing: Drawing): string {
  return shapes
    .map((shape): string => {
      switch (shape.s) {
        case 'dot': {
          const { x, y, d, c } = shape;
          return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(d / 2)}" fill="${paint(c)}"/>`;
        }
        case 'oval': {
          // A disc as wide as the oval, pressed to its height, then turned.
          const { x, y, w, h, c, turn = 0 } = shape;
          return `<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(w / 2)}" ry="${num(h / 2)}" fill="${paint(c)}"${turned(turn, x, y)}/>`;
        }
        case 'ring': {
          // A disc's border, inside its edge; pressed to its height and turned, its border with it.
          const { x, y, d, c, h = d, turn = 0 } = shape;
          const w = Math.min(shape.w, d / 2);
          const stroke = `r="${num((d - w) / 2)}" fill="none" stroke="${paint(c)}" stroke-width="${num(w)}"`;
          if (h === d && !turn) return `<circle cx="${num(x)}" cy="${num(y)}" ${stroke}/>`;
          return `<circle cx="0" cy="0" ${stroke} transform="translate(${num(x)} ${num(y)}) rotate(${num(turn)}) scale(1 ${num(h / d, 6)})"/>`;
        }
        case 'arc': {
          // One side of a disc's border: the quarter of the ring between the corners' diagonals.
          const { x, y, d, side, c } = shape;
          const w = Math.min(shape.w, d / 2);
          const middle = { right: 0, bottom: 90, left: 180, top: 270 }[side];
          const at = (r: number, degrees: number) => `${num(x + r * Math.cos((degrees * Math.PI) / 180))} ${num(y + r * Math.sin((degrees * Math.PI) / 180))}`;
          const out = d / 2;
          const inner = d / 2 - w;
          const from = middle - 45;
          const to = middle + 45;
          const back = inner > 0 ? `L${at(inner, to)}A${num(inner)} ${num(inner)} 0 0 0 ${at(inner, from)}` : `L${num(x)} ${num(y)}`;
          return `<path d="M${at(out, from)}A${num(out)} ${num(out)} 0 0 1 ${at(out, to)}${back}Z" fill="${paint(c)}"/>`;
        }
        case 'tri': {
          // A box of no size whose bottom border is the triangle: its point at the top, turned about its middle.
          const { x, y, w, h, c, turn = 0 } = shape;
          return `<polygon points="${num(x)},${num(y - h / 2)} ${num(x + w / 2)},${num(y + h / 2)} ${num(x - w / 2)},${num(y + h / 2)}" fill="${paint(c)}"${turned(turn, x, y)}/>`;
        }
        case 'heart': {
          // A square turned on its corner, with two discs, turned about the middle of their box.
          const { x, y, size, c } = shape;
          const a = size / 1.5;
          const fill = paint(c);
          return (
            `<g${turned(45, x, y + 0.1 * a)}>` +
            `<rect x="${num(x - 0.25 * a)}" y="${num(y - 0.15 * a)}" width="${num(a)}" height="${num(a)}" fill="${fill}"/>` +
            `<circle cx="${num(x - 0.25 * a)}" cy="${num(y + 0.35 * a)}" r="${num(a / 2)}" fill="${fill}"/>` +
            `<circle cx="${num(x + 0.25 * a)}" cy="${num(y - 0.15 * a)}" r="${num(a / 2)}" fill="${fill}"/>` +
            `</g>`
          );
        }
        case 'box': {
          // Its ground, its edge inside its outline, and what is inside it cut to the inside of the edge.
          const { x, y, w, h, c, r, turn = 0, edge, inside } = shape;
          const outer = radii(r, w, h);
          const e = edge ? Math.min(Math.max(0, edge.w), w / 2, h / 2) : 0;
          const innerRadii = outer.map((v) => Math.max(0, v - e)) as Four;
          const open = w - 2 * e > 0 && h - 2 * e > 0;
          const innerPath = open ? roundRect(x + e, y + e, w - 2 * e, h - 2 * e, innerRadii) : '';
          let out = '';
          if (c !== 'transparent') {
            out += outer.every((v) => v === outer[0])
              ? `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${outer[0] ? ` rx="${num(outer[0])}" ry="${num(outer[0])}"` : ''} fill="${paint(c)}"/>`
              : `<path d="${roundRect(x, y, w, h, outer)}" fill="${paint(c)}"/>`;
          }
          if (edge && e > 0 && edge.c !== 'transparent') out += `<path d="${roundRect(x, y, w, h, outer)}${innerPath}" fill-rule="evenodd" fill="${paint(edge.c)}"/>`;
          if (inside && inside.length > 0 && open) {
            drawing.ids += 1;
            const clip = `c${drawing.ids}`;
            drawing.defs.push(`<clipPath id="${clip}"><path d="${innerPath}"/></clipPath>`);
            out += `<g clip-path="url(#${clip})"><g transform="translate(${num(x + e)} ${num(y + e)})">${drawn(inside, drawing)}</g></g>`;
          }
          return turn ? `<g${turned(turn, x + w / 2, y + h / 2)}>${out}</g>` : out;
        }
        case 'bar': {
          // A rounded box as long as the stroke and its round ends, turned along it.
          const { x1, y1, x2, y2, w, c } = shape;
          const length = Math.hypot(x2 - x1, y2 - y1) + w;
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return `<rect x="${num(mx - length / 2)}" y="${num(my - w / 2)}" width="${num(length)}" height="${num(w)}" rx="${num(w / 2)}" ry="${num(w / 2)}" fill="${paint(c)}"${turned(angle, mx, my)}/>`;
        }
        case 'words': {
          // The words in bold, in the middle of their box, a line at most two.
          const { x, y, w, h, c } = shape;
          const { size, lines } = wordsLayout(drawing.words, w);
          const height = size * 1.15;
          const top = y + (h - lines.length * height) / 2;
          return lines
            .map(
              (line, i) =>
                `<text x="${num(x + w / 2)}" y="${num(top + i * height + height / 2 + BASELINE * size)}" fill="${paint(c)}" font-family="${WORDS_FONT}" font-size="${num(size)}" font-weight="800" text-anchor="middle">${escapeXml(line)}</text>`,
            )
            .join('');
        }
        case 'svg':
          return layer(shape.xml, shape.x, shape.y, shape.w, shape.h, drawing);
        case 'tilt':
          return `<g${turned(shape.turn, shape.about[0], shape.about[1])}>${drawn(shape.shapes, drawing)}</g>`;
        case 'part':
          // At rest a part is where it is drawn.
          return drawn(shape.shapes, drawing);
      }
    })
    .join('');
}

/**
 * The built-in sticker `name` at rest, as one SVG document (viewBox 0 0 100 100, a clear ground);
 * a Words sticker with `words`, else its words in the app's language as the screen shows them.
 * Null for a name this Erevos does not have, or one of a set gone from the picker.
 */
export function stickerSvg(name: string, words?: string): string | null {
  const sticker = stickerOf(name);
  const shapes = Object.prototype.hasOwnProperty.call(ART, name) ? ART[name] : undefined;
  if (!sticker || !shapes || GONE_SETS.includes(sticker.set)) return null;
  const drawing: Drawing = { defs: [], ids: 0, words: (words ?? t(sticker.label)).replace(/\s+/g, ' ').trim(), xlink: false };
  let body: string;
  try {
    body = drawn(shapes, drawing);
  } catch {
    return null;
  }
  const defs = drawing.defs.length > 0 ? `<defs>${drawing.defs.join('')}</defs>` : '';
  return `<svg xmlns="${NS}"${drawing.xlink ? ` xmlns:xlink="${XLINK}"` : ''} viewBox="0 0 100 100">${defs}${body}</svg>`;
}

/** An SVG document `size` points across, for a rasterizer that wants its size said (a browser's Image). */
export function sizedSvg(svg: string, size: number): string {
  return svg.replace(/^<svg /, `<svg width="${size}" height="${size}" `);
}

/** A sticker as a PNG, with how large it is. */
export type StickerPng = { bytes: Uint8Array; mime: 'image/png'; w: number; h: number };

/** The width and height of a PNG, from its header; null for what is not one. */
export function pngSize(bytes: Uint8Array): { w: number; h: number } | null {
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || SIGNATURE.some((b, i) => bytes[i] !== b) || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w = view.getUint32(16);
  const h = view.getUint32(20);
  return w > 0 && h > 0 ? { w, h } : null;
}

/** The smallest and the largest a sticker's PNG may be asked, in points across. */
export const PNG_SIDES = { least: 16, most: 2048 } as const;

/** How many PNGs stay in memory, the last ones asked. */
const KEPT = 48;
const made = new Map<string, Promise<StickerPng | null>>();

function drawPng(name: string, side: number, rasterize: (svg: string, size: number) => Promise<Uint8Array | null>): Promise<StickerPng | null> | null {
  const svg = stickerSvg(name);
  if (!svg) return null;
  return rasterize(svg, side).then(
    (bytes) => {
      const header = bytes ? pngSize(bytes) : null;
      return bytes && header ? { bytes, mime: 'image/png' as const, ...header } : null;
    },
    () => null,
  );
}

/**
 * The sticker `name` as a PNG `size` across, drawn by `rasterize` from its SVG (lib/sticker-image.ts
 * and its .web twin give theirs), kept in memory by name, language and size; null when it has no
 * picture or the rasterizer gave none (tried again the next time). Each caller gets bytes of its own.
 */
export function stickerPng(name: string, size: number, rasterize: (svg: string, size: number) => Promise<Uint8Array | null>): Promise<StickerPng | null> {
  const side = Math.round(size);
  if (!(side >= PNG_SIDES.least && side <= PNG_SIDES.most)) return Promise.resolve(null);
  const key = `${lang()}\n${side}\n${name}`;
  let png = made.get(key) ?? null;
  if (!png) {
    const drawing = drawPng(name, side, rasterize);
    if (!drawing) return Promise.resolve(null);
    void drawing.then((kept) => {
      if (!kept && made.get(key) === drawing) made.delete(key);
    });
    png = drawing;
  }
  // The last asked stays the longest.
  made.delete(key);
  made.set(key, png);
  while (made.size > KEPT) made.delete(made.keys().next().value as string);
  return png.then((kept) => kept && { ...kept, bytes: kept.bytes.slice() });
}
