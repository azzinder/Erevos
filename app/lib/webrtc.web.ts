// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Connection, Rtc, Stream, Track } from './call';

// WebRTC in the browser, for the web build. lib/webrtc.ts is the phone's. A camera is switched by
// opening the next one the browser lists, whose track then takes the place of the one before on
// each connection (lib/call.ts turnCamera).

const SIZE = { width: { ideal: 1280 }, height: { ideal: 720 } };

/** The cameras the browser lists, by their ids: all of them once one was allowed. */
async function cameraIds(): Promise<string[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput' && device.deviceId).map((device) => device.deviceId);
}

async function open(deviceId: string): Promise<Track | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: deviceId }, ...SIZE } });
  return (stream.getVideoTracks()[0] as unknown as Track | undefined) ?? null;
}

export const rtc: Rtc = {
  connect: (config) => new RTCPeerConnection(config) as unknown as Connection,
  media: async ({ audio, video }) =>
    (await navigator.mediaDevices.getUserMedia({ audio, video: video ? { facingMode: 'user', ...SIZE } : false })) as unknown as Stream,
  cameras: async () => (await cameraIds()).length,
  async nextCamera(current) {
    const ids = await cameraIds();
    if (ids.length < 2) return null;
    const now = current.getSettings?.().deviceId ?? '';
    const next = ids[(ids.indexOf(now) + 1) % ids.length];
    if (!next || next === now) return null;
    try {
      return await open(next);
    } catch {
      // A phone's browser opens one camera at a time: the one in use is let go first, and opened
      // again should the next not open.
      current.stop();
      return open(next).catch(() => (now ? open(now).catch(() => null) : null));
    }
  },
};
