import { MAX_SDP, type CallEnd, type CallSignal } from './call-signal';
import { randomBytes, toHex } from './crypto';
import type { CallRelay } from './relay';
import { t } from './i18n';

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
/**
 * How long a call we make waits, once its offer went, for their phone to say it rings, beyond
 * OFFER_FRESH_MS: their phone still rings for an offer that long on the way, and its word that it
 * does takes a while to come back, milliseconds. Once it rings there, it rings RING_MS from then, so
 * an offer that came late does not ring there only to stop at once.
 */
export const RINGING_BACK_MS = 15_000;

// How far this phone's clock is behind its relay's, as last measured (lib/receiver.ts): calls are
// stamped, and judged fresh, by the relay's time, so a phone whose clock is off by minutes still
// rings and is rung. 0 with no relay to say, or one from before it: this phone's own clock.
let clockOffset = 0;

/** This phone's clock is `ms` behind its relay's (ahead, when less than 0). */
export function setClockOffset(ms: number): void {
  clockOffset = ms;
}

/** Now, by the relay's clock as far as this phone knows it: what a call's stamp is made and judged by. */
export function callNow(): number {
  return Date.now() + clockOffset;
}

/** Whether an offer stamped `at` is too old to ring: a missed call. */
export function offerMissed(at: number, now = callNow()): boolean {
  return now - at > OFFER_FRESH_MS;
}

/** How much longer an offer stamped `at` may wait to be answered: never more than OFFER_FRESH_MS, though its stamp is ahead. */
export function offerRingsFor(at: number, now = callNow()): number {
  return Math.min(OFFER_FRESH_MS, Math.max(0, at + OFFER_FRESH_MS - now));
}

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
  /** A camera's track joins the stream of a call's sound, as video is added to a voice call. */
  addTrack?(track: Track): void;
  removeTrack?(track: Track): void;
}
// A rollback takes back an offer of ours that the other side would not have.
type Description = { type: 'offer' | 'answer' | 'rollback'; sdp: string };
export interface Connection {
  readonly iceGatheringState: string;
  readonly connectionState: string;
  readonly localDescription: { sdp: string } | null;
  addTrack(track: Track, stream: Stream): unknown;
  removeTrack?(sender: unknown): void;
  createOffer(): Promise<Description>;
  createAnswer(): Promise<Description>;
  setLocalDescription(description: Description): Promise<void>;
  setRemoteDescription(description: Description): Promise<void>;
  addEventListener(type: 'icegatheringstatechange' | 'connectionstatechange', listener: () => void): void;
  addEventListener(type: 'track', listener: (event: { streams: readonly Stream[] }) => void): void;
  /** One more address of theirs to try, as XMPP's calls send them one at a time (lib/xmpp-calls.ts). */
  addIceCandidate?(candidate: { candidate: string; sdpMid: string }): Promise<void>;
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

/** How a call ended, and who ended it. `elsewhere`: another device of the account answered it, or turned it down (lib/devices.ts). */
export type Ended = { reason: CallEnd; byUs: boolean; elsewhere?: boolean };

export type CallEvents = {
  /** Something about the call changed: its state, its streams, mute or camera. */
  onChange(call: Call): void;
  /** Sends a call signal to the contact. Rejects when the relay did not take it. */
  send(signal: CallSignal): Promise<void>;
  /** The offer of a call that rang before its offer came, asked for as it is answered: XMPP's
   *  calls ring first, and the caller sends the offer once one of the person's devices answers
   *  (lib/xmpp-calls.ts). */
  offer?(): Promise<string>;
  /** Asks them to take the video our new description `sdp` adds to the call, and answers their
   *  whole description for it; rejects when they would not. XMPP's content-add (lib/xmpp-calls.ts);
   *  a call without it cannot have video added. */
  addMedia?(id: string, sdp: string): Promise<string>;
  /** Our answer to their asking to add video: our whole description, or null for no. */
  answerMedia?(id: string, sdp: string | null): Promise<void>;
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

// A call not of Erevos's own, on this phone (a Matrix one, lib/matrix-calls.ts): none of ours starts
// or rings meanwhile.
let other: () => boolean = () => false;

/** How to know whether a call not of Erevos's own is on. */
export function callsOther(busy: () => boolean): void {
  other = busy;
}

/** Whether a call not of Erevos's own is on. */
export function otherCallOn(): boolean {
  return other();
}

/** `promise`, or `fallback` if it has not settled within `ms`: for a relay that may take long to
 *  fail, as on a Wi-Fi with no internet. */
export function soon<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
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

/** The call relay to answer an offer with: none when the offer has no call relay address, as
 *  from a phone with no internet on the same Wi-Fi, where only a direct connection can work. */
export function relayToAnswer(offer: string, relay: CallRelay | null): CallRelay | null {
  return / typ relay/.test(offer) ? relay : null;
}

export class Call {
  readonly id: string;
  readonly peer: string;
  /** Video goes both ways: from the start, or once added to a voice call. */
  video: boolean;
  readonly outgoing: boolean;
  /** Video is being added to the call from here, until they say yes or no. */
  addingVideo = false;
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
  // Their addresses that came before their description was set, and whether it is.
  private candidates: { candidate: string; sdpMid: string }[] = [];
  private described = false;
  // Their description that adds video, while they wait for our yes or no.
  private videoOffer: string | null = null;
  // An offer of ours could not be taken back: the call goes on, but nothing more is added to it.
  private settled = false;

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
    if (currentCall() || otherCallOn()) throw new Error(t('There is a call already.'));
    const call = new Call(newCallId(), true, '', options);
    current = call;
    void call.dial();
    return call;
  }

  /** A contact's call that rings here, from their offer. Null if a call is already in progress. */
  static incoming(signal: Extract<CallSignal, { kind: 'offer' }>, options: Omit<CallOptions, 'video'>): Call | null {
    if (currentCall() || otherCallOn()) return null;
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
      if (!this.offer && this.options.events.offer) this.offer = await this.options.events.offer();
      if ((this.state as CallState) === 'ended') return;
      const connection = await this.connect();
      await connection.setRemoteDescription({ type: 'offer', sdp: this.offer });
      this.described = true;
      this.addCandidates([]);
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

  /**
   * Stops a call that rings here, or was just answered here, as another device of the account
   * answered it first, or turned it down (`declined`). Nothing is said to the contact: that device did.
   */
  endedElsewhere(declined: boolean): void {
    if (this.outgoing || (this.state !== 'incoming' && this.state !== 'connecting')) return;
    this.end(declined ? 'decline' : 'hangup', true, true);
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
      this.wait(RING_MS, 'missed', true);
    } else if (signal.kind === 'answer' && this.outgoing && (this.state === 'calling' || this.state === 'ringing')) {
      this.set('connecting');
      this.wait(CONNECT_MS, 'failed', true);
      this.connection
        ?.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        .then(() => {
          this.described = true;
          this.addCandidates([]);
        })
        .catch(() => this.end('failed', true));
    } else if (signal.kind === 'end') {
      this.end(signal.reason, false);
    }
  }

  /** Their addresses that came apart from their description, tried once it is set. */
  addCandidates(candidates: { candidate: string; sdpMid: string }[]): void {
    this.candidates.push(...candidates);
    const connection = this.connection;
    if (!this.described || !connection?.addIceCandidate || this.state === 'ended') return;
    for (const candidate of this.candidates.splice(0)) connection.addIceCandidate(candidate).catch(() => undefined);
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

  /** Whether video can be added to this voice call from here: once it is connected, where its way of calling can. */
  get canAddVideo(): boolean {
    return !!this.options.events.addMedia && !this.video && this.state === 'connected' && !this.addingVideo && this.videoOffer === null && !this.settled;
  }

  /** Whether they ask to add video to this voice call, waiting for acceptVideo or declineVideo. */
  get askingVideo(): boolean {
    return this.videoOffer !== null;
  }

  /** Turns the camera on in a voice call, and asks them to take its video and send theirs. */
  async addVideo(): Promise<void> {
    const connection = this.connection;
    const add = this.options.events.addMedia;
    if (!connection || !add || !this.canAddVideo) return;
    this.addingVideo = true;
    this.changed();
    let camera: { track: Track; sender: unknown } | null = null;
    let offered = false;
    try {
      camera = await this.camera(connection);
      await connection.setLocalDescription(await connection.createOffer());
      offered = true;
      const sdp = await describedSdp(connection);
      const answer = await add(this.id, sdp);
      if ((this.state as CallState) === 'ended') return;
      await connection.setRemoteDescription({ type: 'answer', sdp: answer });
      this.video = true;
      this.cameraOff = false;
    } catch {
      // They would not, or it did not go: the call goes on as it was.
      if ((this.state as CallState) !== 'ended') await this.takeBack(connection, camera, offered);
    } finally {
      this.addingVideo = false;
      this.changed();
    }
  }

  /** What they said, asking to add video to this voice call: their whole description, which waits for our yes or no. */
  videoAsked(sdp: string): void {
    const answer = this.options.events.answerMedia;
    if (!answer) return;
    if (this.state !== 'connected' || this.video || this.addingVideo || this.settled) {
      answer(this.id, null).catch(() => undefined);
      return;
    }
    this.videoOffer = sdp;
    this.changed();
  }

  /** Yes to their video: our camera goes on too. */
  async acceptVideo(): Promise<void> {
    const connection = this.connection;
    const offer = this.videoOffer;
    const answer = this.options.events.answerMedia;
    if (!connection || offer === null || !answer) return;
    this.videoOffer = null;
    this.changed();
    let camera: { track: Track; sender: unknown } | null = null;
    try {
      camera = await this.camera(connection);
      await connection.setRemoteDescription({ type: 'offer', sdp: offer });
      await connection.setLocalDescription(await connection.createAnswer());
      const sdp = await describedSdp(connection);
      if ((this.state as CallState) === 'ended') return;
      await answer(this.id, sdp);
      this.video = true;
      this.cameraOff = false;
    } catch {
      if (camera) this.dropCamera(connection, camera);
      answer(this.id, null).catch(() => undefined);
      // Their offer was taken, but no answer went: nothing more can be added.
      this.settled = true;
    } finally {
      this.changed();
    }
  }

  /** No to their video: the call goes on as a voice call. */
  declineVideo(): void {
    if (this.videoOffer === null) return;
    this.videoOffer = null;
    this.options.events.answerMedia?.(this.id, null).catch(() => undefined);
    this.changed();
  }

  // The camera's track, in the stream of the call's sound and on its way to them.
  private async camera(connection: Connection): Promise<{ track: Track; sender: unknown }> {
    const camera = await this.options.rtc.media({ audio: false, video: true });
    camera.getAudioTracks().forEach((track) => track.stop());
    const [track] = camera.getVideoTracks();
    if (!track) throw new Error('No camera.');
    if ((this.state as CallState) === 'ended') {
      track.stop();
      throw new Error(t('The call ended.'));
    }
    const local = this.local ?? camera;
    if (local !== camera) local.addTrack?.(track);
    const sender = connection.addTrack(track, local);
    return { track, sender };
  }

  private dropCamera(connection: Connection, camera: { track: Track; sender: unknown }): void {
    try {
      connection.removeTrack?.(camera.sender);
    } catch {
      // Gone with the connection.
    }
    this.local?.removeTrack?.(camera.track);
    camera.track.stop();
  }

  // Back to the voice call as it was: our offer taken back, the camera off.
  private async takeBack(connection: Connection, camera: { track: Track; sender: unknown } | null, offered: boolean): Promise<void> {
    if (offered) {
      try {
        await connection.setLocalDescription({ type: 'rollback', sdp: '' });
      } catch {
        this.settled = true;
      }
    }
    if (camera) this.dropCamera(connection, camera);
  }

  private async dial(): Promise<void> {
    this.wait(RING_MS, 'missed', true);
    try {
      const connection = await this.connect();
      await connection.setLocalDescription(await connection.createOffer());
      const sdp = await describedSdp(connection);
      if (this.state === 'ended') return;
      await this.options.events.send({ id: this.id, kind: 'offer', video: this.video, sdp, at: callNow() });
      // Gone: their phone may ring for it until it is OFFER_FRESH_MS old (calls.ts), so this waits
      // that long for it to say so, unless it said so already, or answered.
      if (this.state === 'calling') this.wait(OFFER_FRESH_MS + RINGING_BACK_MS, 'missed', true);
    } catch {
      this.end('failed', true);
    }
  }

  // The camera and microphone, and the connection carrying them.
  private async connect(): Promise<Connection> {
    const local = await this.options.rtc.media({ audio: true, video: this.video });
    if (this.state === 'ended') {
      local.getTracks().forEach((track) => track.stop());
      throw new Error(t('The call ended.'));
    }
    this.local = local;
    const connection = this.options.rtc.connect(connectionConfig(this.options.relay));
    this.connection = connection;
    local.getTracks().forEach((track) => connection.addTrack(track, local));
    connection.addEventListener('track', ({ streams }) => {
      // Their video, added to a voice call, comes in the stream of its sound: shown anew all the same.
      if (streams[0]) {
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

  private end(reason: CallEnd, byUs: boolean, elsewhere = false): void {
    if (this.state === 'ended') return;
    this.stopWaiting();
    this.videoOffer = null;
    this.ended = { reason, byUs, ...(elsewhere ? { elsewhere } : {}) };
    this.state = 'ended';
    this.local?.getTracks().forEach((track) => track.stop());
    try {
      this.connection?.close();
    } catch {
      // Closed already.
    }
    if (current === this) current = null;
    if (byUs && !elsewhere) this.say({ id: this.id, kind: 'end', reason });
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
