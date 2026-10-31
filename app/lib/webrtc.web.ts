// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Connection, Rtc, Stream } from './call';

// WebRTC in the browser, for the web build. lib/webrtc.ts is the phone's.

export const rtc: Rtc = {
  connect: (config) => new RTCPeerConnection(config) as unknown as Connection,
  media: async ({ audio, video }) =>
    (await navigator.mediaDevices.getUserMedia({ audio, video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false })) as unknown as Stream,
};
