import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';

import type { Connection, Rtc, Stream } from './call';

// WebRTC on the phone (react-native-webrtc, Google's WebRTC built by Jitsi, with no Google
// services in it). lib/webrtc.web.ts is the browser's own.

// Video as most phones send it well over mobile data: 720p at most, 30 frames a second.
const VIDEO = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

export const rtc: Rtc = {
  connect: (config) => new RTCPeerConnection(config) as unknown as Connection,
  media: async ({ audio, video }) => (await mediaDevices.getUserMedia({ audio, video: video ? VIDEO : false })) as unknown as Stream,
};
