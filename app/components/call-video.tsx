// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { RTCView, type MediaStream } from 'react-native-webrtc';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Stream } from '../lib/call';

/** A call's picture: the other phone's, or our own camera (`mirror`). */
export function CallVideo({ stream, mirror = false, cover = true, style }: { stream: Stream; mirror?: boolean; cover?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <RTCView
      streamURL={(stream as unknown as MediaStream).toURL()}
      mirror={mirror}
      objectFit={cover ? 'cover' : 'contain'}
      // Our own picture over theirs.
      zOrder={mirror ? 1 : 0}
      style={style}
    />
  );
}
