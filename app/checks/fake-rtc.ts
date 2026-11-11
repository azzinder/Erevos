// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A stand-in for WebRTC (lib/call.ts's Rtc) for the call checks: connections that only keep what
// they were given, and connect when told to; with the media of each kind as WebRTC keeps it
// (transceivers): one for each track added, or each kind their offer has, which a track of ours
// added later takes, as WebRTC's does.
/// <reference types="node" />
import type { Connection, ConnectionConfig, Rtc, Sender, Stream, Track, Transceiver } from '../lib/call';

let tracks = 0;

export class FakeTrack implements Track {
  enabled = true;
  stopped = false;
  switched = 0;
  readonly kind: string;
  readonly id = `track-${++tracks}`;
  /** Which camera it is, as a browser says. */
  deviceId = '';
  constructor(kind: string, deviceId = '') {
    this.kind = kind;
    this.deviceId = deviceId;
  }
  stop() {
    this.stopped = true;
  }
  _switchCamera() {
    this.switched++;
  }
  getSettings() {
    return { deviceId: this.deviceId };
  }
}

/** A browser's camera track: no switch of its own, the next camera is opened instead. */
export function browserTrack(kind: string, deviceId = ''): FakeTrack {
  const track = new FakeTrack(kind, deviceId);
  Object.defineProperty(track, '_switchCamera', { value: undefined });
  return track;
}

export class FakeSender implements Sender {
  track: Track | null;
  constructor(track: Track | null) {
    this.track = track;
  }
  async replaceTrack(track: Track | null) {
    this.track = track;
  }
}

export class FakeTransceiver implements Transceiver {
  direction: string;
  readonly sender: FakeSender;
  readonly receiver: { readonly track: Track };
  constructor(kind: string, direction: string, track: Track | null) {
    this.direction = direction;
    this.sender = new FakeSender(track);
    this.receiver = { track: new FakeTrack(kind) };
  }
}

export class FakeStream implements Stream {
  readonly tracks: FakeTrack[];
  constructor(tracks: FakeTrack[]) {
    this.tracks = tracks;
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
  addTrack(track: FakeTrack) {
    this.tracks.push(track);
  }
  removeTrack(track: FakeTrack) {
    const at = this.tracks.indexOf(track);
    if (at >= 0) this.tracks.splice(at, 1);
  }
}

export class FakeConnection implements Connection {
  iceGatheringState = 'new';
  connectionState = 'new';
  localDescription: { sdp: string } | null = null;
  remote: { type: string; sdp: string } | null = null;
  added: Track[] = [];
  transceivers: FakeTransceiver[] = [];
  closed = false;
  private listeners: Record<string, ((event?: unknown) => void)[]> = {};
  readonly config: ConnectionConfig;
  constructor(config: ConnectionConfig) {
    this.config = config;
  }
  addTrack(track: Track) {
    this.added.push(track);
    // One of its kind with no track of ours takes it, else one is made for it.
    const idle = this.transceivers.find((t) => t.receiver.track.kind === track.kind && !t.sender.track);
    if (idle) {
      idle.sender.track = track;
      if (idle.direction === 'recvonly') idle.direction = 'sendrecv';
    } else this.transceivers.push(new FakeTransceiver(track.kind, 'sendrecv', track));
    // Its sender, as WebRTC answers one.
    return track;
  }
  removeTrack(sender: unknown) {
    this.added = this.added.filter((track) => track !== sender);
    for (const t of this.transceivers) if (t.sender.track === sender) t.sender.track = null;
  }
  getSenders() {
    return this.transceivers.map((t) => t.sender);
  }
  getTransceivers() {
    return this.transceivers;
  }
  addTransceiver(kind: 'audio' | 'video', init: { direction: string }) {
    const transceiver = new FakeTransceiver(kind, init.direction, null);
    this.transceivers.push(transceiver);
    return transceiver;
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: 'v=0\r\noffer' };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: 'v=0\r\nanswer' };
  }
  async setLocalDescription(description: { sdp: string }) {
    this.localDescription = { sdp: `${description.sdp}\r\na=candidate:relay` };
    // Gathering ends a moment later.
    setTimeout(() => {
      this.iceGatheringState = 'complete';
      this.emit('icegatheringstatechange');
    }, 10);
  }
  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.remote = description;
    // Each kind their offer has, as many times as it has it.
    if (description.type !== 'offer') return;
    for (const kind of ['audio', 'video']) {
      const wanted = description.sdp.split(/\r?\n/).filter((line) => line.startsWith(`m=${kind} `)).length;
      const have = this.transceivers.filter((t) => t.receiver.track.kind === kind).length;
      for (let i = have; i < wanted; i++) this.transceivers.push(new FakeTransceiver(kind, 'recvonly', null));
    }
  }
  addEventListener(type: string, listener: (event: any) => void) {
    (this.listeners[type] ??= []).push(listener as (event?: unknown) => void);
  }
  close() {
    this.closed = true;
  }
  emit(type: string, event?: unknown) {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
  /** WebRTC connects, and the other phone's stream comes. */
  connect(stream: Stream) {
    this.emit('track', { streams: [stream] });
    this.connectionState = 'connected';
    this.emit('connectionstatechange');
  }
}

/** `cameras`: how many the phone says it has (none said when 0). `browser`: cameras as a browser's,
 *  switched by opening the next (Rtc.nextCamera), named cam-0, cam-1… */
export function fakeRtc({ cameras = 0, browser = false }: { cameras?: number; browser?: boolean } = {}) {
  const connections: FakeConnection[] = [];
  const streams: FakeStream[] = [];
  /** What media was asked for, each time. */
  const asked: { audio: boolean; video: boolean }[] = [];
  const camera = (deviceId: string) => (browser ? browserTrack('video', deviceId) : new FakeTrack('video', deviceId));
  const rtc: Rtc = {
    connect(config) {
      const connection = new FakeConnection(config);
      connections.push(connection);
      return connection;
    },
    async media({ audio, video }) {
      asked.push({ audio, video });
      const stream = new FakeStream([...(audio ? [new FakeTrack('audio')] : []), ...(video ? [camera('cam-0')] : [])]);
      streams.push(stream);
      return stream;
    },
    ...(cameras ? { cameras: async () => cameras } : {}),
    ...(browser
      ? {
          async nextCamera(current: Track) {
            if (cameras < 2) return null;
            const at = Number((current.getSettings?.().deviceId ?? 'cam-0').slice(4));
            return camera(`cam-${(at + 1) % cameras}`);
          },
        }
      : {}),
  };
  return { rtc, connections, streams, asked };
}
