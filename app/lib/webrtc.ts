// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';

import type { Connection, Rtc, Stream } from './call';

// WebRTC on the phone (react-native-webrtc, Google's WebRTC built by Jitsi, with no Google
// services in it). lib/webrtc.web.ts is the browser's own. The camera turns front to back, and
// back, by its own switch (Track._switchCamera).

// Video as most phones send it well over mobile data: 720p at most, 30 frames a second.
const VIDEO = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

export const rtc: Rtc = {
  connect: (config) => new RTCPeerConnection(config) as unknown as Connection,
  media: async ({ audio, video }) => (await mediaDevices.getUserMedia({ audio, video: video ? VIDEO : false })) as unknown as Stream,
  cameras: async () => ((await mediaDevices.enumerateDevices()) as { kind?: string }[]).filter((device) => device.kind === 'videoinput').length,
};
