// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { createElement, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { Stream } from '../lib/call';

/** A call's picture in the browser: the other side's, or our own camera (`mirror`). */
export function CallVideo({ stream, mirror = false, cover = true, style }: { stream: Stream; mirror?: boolean; cover?: boolean; style?: StyleProp<ViewStyle> }) {
  const video = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream as unknown as MediaStream;
  }, [stream]);
  return (
    <View style={style}>
      {createElement('video', {
        ref: video,
        autoPlay: true,
        playsInline: true,
        // Our own sound would echo.
        muted: mirror,
        style: { width: '100%', height: '100%', objectFit: cover ? 'cover' : 'contain', transform: mirror ? 'scaleX(-1)' : undefined },
      })}
    </View>
  );
}
