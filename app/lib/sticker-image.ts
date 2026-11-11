// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { createElement, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import Svg, { parse, type SvgProps } from 'react-native-svg';

import { fromBase64 } from './crypto';
import { stickerPng, type StickerPng } from './sticker-svg';

// A built-in sticker as a PNG on the phone, for the networks that take a sticker only as a picture:
// its SVG (lib/sticker-svg.ts) drawn by react-native-svg, which draws the stickers' curves in the
// app already, into a picture of the size asked (its Svg's toDataURL), on a clear ground. That
// needs the drawing mounted, so StickerImageHost, mounted once at the app's root (app/_layout.tsx),
// holds each one in turn, out of sight, while its picture is made. Nothing is fetched, and nothing
// new is built into the app. On a computer, lib/sticker-image.web.ts.

type Job = { svg: string; size: number; done: (png: Uint8Array | null) => void };

const jobs: Job[] = [];
// The host's, while it is mounted: it takes the next job when it has none.
let wake: (() => void) | null = null;
let count = 0;

/** How long one picture may take before it is given up. */
const WAIT_MS = 10_000;

// Two points, all but clear, at the root's top left, under every screen: drawn, so its picture can be
// made, and never seen.
const OUT_OF_SIGHT = { position: 'absolute', left: 0, top: 0, width: 2, height: 2, opacity: 0.01 } as const;

function rasterize(svg: string, size: number): Promise<Uint8Array | null> {
  if (!wake) return Promise.resolve(null);
  return new Promise((done) => {
    jobs.push({ svg, size, done });
    wake?.();
  });
}

function take(): { id: number; job: Job } | null {
  const job = jobs.shift();
  return job ? { id: ++count, job } : null;
}

/**
 * The built-in sticker `name` as a PNG `size` across, with a clear ground, kept in memory by name,
 * language and size; null for one with no picture (lib/sticker-svg.ts stickerSvg), or while no
 * StickerImageHost is mounted.
 */
export function stickerImage(name: string, size = 512): Promise<StickerPng | null> {
  return stickerPng(name, size, rasterize);
}

/** Makes the stickers' pictures on the phone: mounted once, at the root of the open space's screens. */
export function StickerImageHost(): ReactElement | null {
  const [current, setCurrent] = useState<{ id: number; job: Job } | null>(null);
  const svg = useRef<Svg>(null);

  useEffect(() => {
    wake = () => setCurrent((now) => now ?? take());
    wake();
    return () => {
      wake = null;
      for (const job of jobs.splice(0)) job.done(null);
    };
  }, []);

  const ast = useMemo(() => {
    try {
      return current ? parse(current.job.svg) : null;
    } catch {
      return null;
    }
  }, [current]);

  useEffect(() => {
    if (!current) return;
    let over = false;
    const finish = (png: Uint8Array | null) => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      current.job.done(png);
    };
    const next = (png: Uint8Array | null) => {
      if (over) return;
      finish(png);
      setCurrent(take());
    };
    const timer = setTimeout(() => next(null), WAIT_MS);
    const drawing = svg.current;
    if (!ast || !drawing) next(null);
    else {
      try {
        // Drawn anew at the size asked, whatever the size it shows at.
        drawing.toDataURL((base64) => next(base64 ? fromBase64(base64) : null), { width: current.job.size, height: current.job.size });
      } catch {
        next(null);
      }
    }
    return () => finish(null);
  }, [current]);

  if (!current || !ast) return null;
  return createElement(
    View,
    { pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true, style: OUT_OF_SIGHT },
    createElement(Svg, { ...(ast.props as SvgProps), key: current.id, ref: svg, width: 2, height: 2 }, ast.children),
  );
}
