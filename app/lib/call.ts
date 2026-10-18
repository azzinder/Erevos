import { MAX_SDP, type CallEnd, type CallSignal } from './call-signal';
import { randomBytes, toHex } from './crypto';
import type { CallRelay } from './relay';

// One voice or video call with a contact, over WebRTC (lib/webrtc.ts on the phone). It is set up
// with call signals sent in the chat's end-to-end encrypted messages (lib/call-signal.ts), and the
// sound and picture then go straight between the two phones, encrypted between them (DTLS-SRTP).
//
// With a call relay beside the chat's relay (a TURN server, see crates/erevos-relay/src/turn.rs),
// the call goes only through it: each phone offers only call relay addresses, so neither learns the
// other's IP address. Without one, the phones can only reach each other on the same network, and
// then each sees the other's address there; the chat says so before such a call.
//
// A phone has one call at a time.

/** How long a call rings before it is missed, milliseconds. */
export const RING_MS = 45_000;
/** How long an answered call may take to connect, milliseconds. */
export const CONNECT_MS = 30_000;
/** How long a connection that dropped may take to come back, milliseconds. */
export const RECONNECT_MS = 10_000;
/** How long to wait for the addresses to try before sending what there is, milliseconds. */
export const GATHER_MS = 5_000;
/** An offer older than this when it comes is a missed call, not one that rings, milliseconds. */
export const OFFER_FRESH_MS = 60_000;

// What lib/call.ts needs of WebRTC: the phone's (react-native-webrtc) and the browser's both fit.
export interface Track {
  readonly kind: string;
  enabled: boolean;
  stop(): void;
  _switchCamera?(): void;
}
export interface Stream {
  getTracks(): Track[];
  getAudioTracks(): Track[];
  getVideoTracks(): Track[];
}
type Description = { type: 'offer' | 'answer'; sdp: string };
export interface Connection {
  readonly iceGatheringState: string;
  readonly connectionState: string;
  readonly localDescription: { sdp: string } | null;
  addTrack(track: Track, stream: Stream): unknown;
  createOffer(): Promise<Description>;
  createAnswer(): Promise<Description>;
  setLocalDescription(description: Description): Promise<void>;
  setRemoteDescription(description: Description): Promise<void>;
  addEventListener(type: 'icegatheringstatechange' | 'connectionstatechange', listener: () => void): void;
  addEventListener(type: 'track', listener: (event: { streams: readonly Stream[] }) => void): void;
  close(): void;
}
export type IceServer = { urls: string[]; username?: string; credential?: string };
export type ConnectionConfig = { iceServers: IceServer[]; iceTransportPolicy: 'relay' | 'all' };
export interface Rtc {
  connect(config: ConnectionConfig): Connection;
  media(constraints: { audio: boolean; video: boolean }): Promise<Stream>;
}

export type CallState =
  // Ours, before their phone rings.
  | 'calling'
  // Ours, ringing on their phone.
  | 'ringing'
  // Theirs, ringing here.
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended';

/** How a call ended, and who ended it. */
export type Ended = { reason: CallEnd; byUs: boolean };

export type CallEvents = {
  /** Something about the call changed: its state, its streams, mute or camera. */
  onChange(call: Call): void;
  /** Sends a call signal to the contact. Rejects when the relay did not take it. */
  send(signal: CallSignal): Promise<void>;
};

export type CallOptions = {
  peer: string;
  video: boolean;
  /** The call relay, or null to call directly on the same network. */
  relay: CallRelay | null;
  rtc: Rtc;
  events: CallEvents;
};

let current: Call | null = null;

/** The call in progress on this phone, if any. */
export function currentCall(): Call | null {
  return current && current.state !== 'ended' ? current : null;
}

export function newCallId(): string {
  return toHex(randomBytes(8));
}

/** The connection set-up for a call: through the call relay only, or direct on the same network. */
export function connectionConfig(relay: CallRelay | null): ConnectionConfig {
  return relay
    ? { iceServers: [{ urls: relay.urls, username: relay.username, credential: relay.credential }], iceTransportPolicy: 'relay' }
    : { iceServers: [], iceTransportPolicy: 'all' };
}

/** A connection's session description once the addresses to try are in it, or after GATHER_MS
 *  with those found by then. */
export function describedSdp(connection: Connection): Promise<string> {
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      const sdp = connection.localDescription?.sdp ?? '';
      if (!sdp || sdp.length > MAX_SDP) reject(new Error('No session description to send.'));
      else resolve(sdp);
    };
    const timer = setTimeout(done, GATHER_MS);
    if (connection.iceGatheringState === 'complete') done();
    else connection.addEventListener('icegatheringstatechange', () => connection.iceGatheringState === 'complete' && done());
  });
}

export class Call {
  readonly id: string;
  readonly peer: string;
  readonly video: boolean;
  readonly outgoing: boolean;
  state: CallState;
  ended: Ended | null = null;
  local: Stream | null = null;
  remote: Stream | null = null;
  muted = false;
  cameraOff = false;
  /** When it connected, milliseconds, or 0. */
  connectedAt = 0;
  private connection: Connection | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly options: CallOptions;
  // The offer, for a call that rings here.
  private offer: string;

  private constructor(id: string, outgoing: boolean, offer: string, options: CallOptions) {
    this.id = id;
    this.peer = options.peer;
    this.video = options.video;
    this.outgoing = outgoing;
    this.state = outgoing ? 'calling' : 'incoming';
    this.offer = offer;
    this.options = options;
  }

  /** Calls a contact. Throws if a call is already in progress. */
  static start(options: CallOptions): Call {
    if (currentCall()) throw new Error('There is a call already.');
    const call = new Call(newCallId(), true, '', options);
    current = call;
    void call.dial();
    return call;
  }

  /** A contact's call that rings here, from their offer. Null if a call is already in progress. */
  static incoming(signal: Extract<CallSignal, { kind: 'offer' }>, options: Omit<CallOptions, 'video'>): Call | null {
    if (currentCall()) return null;
    const call = new Call(signal.id, false, signal.sdp, { ...options, video: signal.video });
    current = call;
    call.wait(RING_MS, 'missed', true);
    call.say({ id: call.id, kind: 'ringing' });
    return call;
  }

  /** Answers a call that rings here. */
  async answer(): Promise<void> {
    if (this.outgoing || this.state !== 'incoming') return;
    this.set('connecting');
    this.wait(CONNECT_MS, 'failed', true);
    try {
      const connection = await this.connect();
      await connection.setRemoteDescription({ type: 'offer', sdp: this.offer });
      await connection.setLocalDescription(await connection.createAnswer());
      const sdp = await describedSdp(connection);
      // Hung up while it connected.
      if ((this.state as CallState) === 'ended') return;
      await this.options.events.send({ id: this.id, kind: 'answer', sdp });
    } catch {
      this.end('failed', true);
    }
  }

  /** Turns down a call that rings here. */
  decline(): void {
    if (this.state === 'incoming') this.end('decline', true);
  }

  /** Ends the call from here. */
  hangUp(): void {
    if (this.state === 'ended') return;
    // Ours, not answered: to them, a call they missed.
    this.end(this.outgoing && this.state !== 'connecting' && this.state !== 'connected' ? 'missed' : 'hangup', true);
  }

  /** What the contact's phone said about this call. */
  receive(signal: CallSignal): void {
    if (signal.id !== this.id || this.state === 'ended') return;
    if (signal.kind === 'ringing' && this.state === 'calling') {
      this.set('ringing');
    } else if (signal.kind === 'answer' && this.outgoing && (this.state === 'calling' || this.state === 'ringing')) {
      this.set('connecting');
      this.wait(CONNECT_MS, 'failed', true);
      this.connection?.setRemoteDescription({ type: 'answer', sdp: signal.sdp }).catch(() => this.end('failed', true));
    } else if (signal.kind === 'end') {
      this.end(signal.reason, false);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.local?.getAudioTracks().forEach((track) => (track.enabled = !muted));
    this.changed();
  }

  setCameraOff(off: boolean): void {
    this.cameraOff = off;
    this.local?.getVideoTracks().forEach((track) => (track.enabled = !off));
    this.changed();
  }

  /** Front camera to back, or back. */
  switchCamera(): void {
    this.local?.getVideoTracks().forEach((track) => track._switchCamera?.());
  }

  private async dial(): Promise<void> {
    this.wait(RING_MS, 'missed', true);
    try {
      const connection = await this.connect();
      await connection.setLocalDescription(await connection.createOffer());
      const sdp = await describedSdp(connection);
      if (this.state === 'ended') return;
      await this.options.events.send({ id: this.id, kind: 'offer', video: this.video, sdp, at: Date.now() });
    } catch {
      this.end('failed', true);
    }
  }

  // The camera and microphone, and the connection carrying them.
  private async connect(): Promise<Connection> {
    const local = await this.options.rtc.media({ audio: true, video: this.video });
    if (this.state === 'ended') {
      local.getTracks().forEach((track) => track.stop());
      throw new Error('The call ended.');
    }
    this.local = local;
    const connection = this.options.rtc.connect(connectionConfig(this.options.relay));
    this.connection = connection;
    local.getTracks().forEach((track) => connection.addTrack(track, local));
    connection.addEventListener('track', ({ streams }) => {
      if (streams[0] && this.remote !== streams[0]) {
        this.remote = streams[0];
        this.changed();
      }
    });
    connection.addEventListener('connectionstatechange', () => this.connectionChanged(connection.connectionState));
    this.changed();
    return connection;
  }

  private connectionChanged(state: string) {
    if (this.state === 'ended') return;
    if (state === 'connected') {
      this.stopWaiting();
      if (!this.connectedAt) this.connectedAt = Date.now();
      this.set('connected');
    } else if (state === 'disconnected' && this.state === 'connected') {
      // Wi-Fi to mobile data, a tunnel: give it a moment to come back.
      this.wait(RECONNECT_MS, 'failed', true);
    } else if (state === 'failed') {
      this.end('failed', true);
    }
  }

  private end(reason: CallEnd, byUs: boolean): void {
    if (this.state === 'ended') return;
    this.stopWaiting();
    this.ended = { reason, byUs };
    this.state = 'ended';
    this.local?.getTracks().forEach((track) => track.stop());
    try {
      this.connection?.close();
    } catch {
      // Closed already.
    }
    if (current === this) current = null;
    if (byUs) this.say({ id: this.id, kind: 'end', reason });
    this.changed();
  }

  // A signal whose loss only means the other phone finds out later (by its own timeout).
  private say(signal: CallSignal) {
    this.options.events.send(signal).catch(() => undefined);
  }

  private wait(ms: number, reason: CallEnd, byUs: boolean) {
    this.stopWaiting();
    this.timer = setTimeout(() => this.end(reason, byUs), ms);
  }

  private stopWaiting() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private set(state: CallState) {
    if (this.state === state || this.state === 'ended') return;
    this.state = state;
    this.changed();
  }

  private changed() {
    this.options.events.onChange(this);
  }
}
