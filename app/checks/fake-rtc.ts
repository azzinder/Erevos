// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A stand-in for WebRTC (lib/call.ts's Rtc) for the call checks: connections that only keep what
// they were given, and connect when told to.
/// <reference types="node" />
import type { Connection, ConnectionConfig, Rtc, Stream, Track } from '../lib/call';

export class FakeTrack implements Track {
  enabled = true;
  stopped = false;
  switched = 0;
  readonly kind: string;
  constructor(kind: string) {
    this.kind = kind;
  }
  stop() {
    this.stopped = true;
  }
  _switchCamera() {
    this.switched++;
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
  closed = false;
  private listeners: Record<string, ((event?: unknown) => void)[]> = {};
  readonly config: ConnectionConfig;
  constructor(config: ConnectionConfig) {
    this.config = config;
  }
  addTrack(track: Track) {
    this.added.push(track);
    // Its sender, as WebRTC answers one.
    return track;
  }
  removeTrack(sender: unknown) {
    this.added = this.added.filter((track) => track !== sender);
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

export function fakeRtc() {
  const connections: FakeConnection[] = [];
  const streams: FakeStream[] = [];
  const rtc: Rtc = {
    connect(config) {
      const connection = new FakeConnection(config);
      connections.push(connection);
      return connection;
    },
    async media({ video }) {
      const stream = new FakeStream([new FakeTrack('audio'), ...(video ? [new FakeTrack('video')] : [])]);
      streams.push(stream);
      return stream;
    },
  };
  return { rtc, connections, streams };
}
