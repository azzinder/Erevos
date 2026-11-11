// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
// A call that rings is answered with the camera or with voice only. While it goes on, either side
// may send a new description of it (reoffer), sealed as the offer is: video added to a voice call,
// which the other side's screen asks about, or a camera turned on in a video call answered without
// it, which it takes at once. Only between phones whose offer and answer said they take one: an
// Erevos from before is sent none. XMPP's and Matrix's calls do the same their own way
// (CallEvents.addMedia). On a computer, the camera switches to the next one it has.
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
/** How long a new description of ours, as video is added to a call, waits for their answer: their screen asks them, milliseconds. */
export const ADD_MS = 60_000;
/** How long their asking to add video waits for a yes here before it is a no: less than they wait, milliseconds. */
export const ASK_MS = 50_000;

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
  /** The browser's and the phone's have one: a view of a camera is made anew when it changes. */
  readonly id?: string;
  enabled: boolean;
  stop(): void;
  _switchCamera?(): void;
  /** Which camera it is: `environment` is one facing away, whose picture is not mirrored. */
  getSettings?(): { deviceId?: string; facingMode?: string };
}
/** What sends one of our tracks to them. */
export interface Sender {
  readonly track: Track | null;
  replaceTrack?(track: Track | null): Promise<void>;
}
/** One kind of media of a connection, its sending and its receiving. */
export interface Transceiver {
  direction: string;
  readonly sender: Sender;
  readonly receiver: { readonly track: Track | null };
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
  addEventListener(type: 'track', listener: (event: { streams: readonly Stream[]; track?: Track }) => void): void;
  /** One more address of theirs to try, as XMPP's calls send them one at a time (lib/xmpp-calls.ts). */
  addIceCandidate?(candidate: { candidate: string; sdpMid: string }): Promise<void>;
  getSenders?(): Sender[];
  getTransceivers?(): Transceiver[];
  /** Media with no track of ours on it: their picture, in a video call we are in without our camera. */
  addTransceiver?(kind: 'audio' | 'video', init: { direction: string }): unknown;
  close(): void;
}
export type IceServer = { urls: string[]; username?: string; credential?: string };
export type ConnectionConfig = { iceServers: IceServer[]; iceTransportPolicy: 'relay' | 'all' };
export interface Rtc {
  connect(config: ConnectionConfig): Connection;
  media(constraints: { audio: boolean; video: boolean }): Promise<Stream>;
  /** How many cameras there are, as told once one was opened. */
  cameras?(): Promise<number>;
  /** The next camera's track after `current`'s, where a camera is switched by opening the next (a
   *  browser's); null when there is no other. */
  nextCamera?(current: Track): Promise<Track | null>;
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
  /** Our answer to their asking to add video: our whole description, or null for no. A call with
   *  neither (Erevos's own) says both with its own signals (reoffer, reanswer). */
  answerMedia?(id: string, sdp: string | null): Promise<void>;
  /** addMedia only adds media to the call (XMPP's content-add): our camera is not turned on with it
   *  in a video call answered without it. */
  addsOnly?: boolean;
  /** An answer without our camera still says video goes both ways, as other XMPP apps expect: our
   *  camera, turned on later, goes on it with nothing more to say. */
  bothWays?: boolean;
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

/** How many cameras `rtc` says there are; 0 when it cannot say. */
export async function cameraCount(rtc: Rtc): Promise<number> {
  try {
    return (await rtc.cameras?.()) ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Turns the camera of `local` to the next one: on the phone front to back, and back, by its own
 * switch; in a browser to the next camera it has, whose track then goes on each of `connections` in
 * place of the one before. `live`: whether the call still goes on. Resolves with whether it turned.
 */
export async function turnCamera(rtc: Rtc, local: Stream | null, connections: Connection[], live: () => boolean): Promise<boolean> {
  const [track] = local?.getVideoTracks() ?? [];
  if (!local || !track) return false;
  if (track._switchCamera) {
    track._switchCamera();
    return true;
  }
  if (!rtc.nextCamera) return false;
  const next = await rtc.nextCamera(track).catch(() => null);
  if (!next) return false;
  if (!live() || !local.getVideoTracks().includes(track)) {
    next.stop();
    return false;
  }
  next.enabled = track.enabled;
  for (const connection of connections) {
    const sender = connection.getSenders?.().find((s) => s.track === track);
    await sender?.replaceTrack?.(next).catch(() => undefined);
  }
  local.removeTrack?.(track);
  local.addTrack?.(next);
  track.stop();
  // It ended meanwhile: the camera goes off with it.
  if (!live()) next.stop();
  return true;
}

export class Call {
  readonly id: string;
  readonly peer: string;
  /** Video goes both ways: from the start, or once added to a voice call. A video call answered
   *  without the camera is one too: their picture comes, and ours goes once the camera is on. */
  video: boolean;
  readonly outgoing: boolean;
  /** Video is being added to the call from here, until they say yes or no; or our camera turned on. */
  addingVideo = false;
  state: CallState;
  ended: Ended | null = null;
  local: Stream | null = null;
  remote: Stream | null = null;
  muted = false;
  cameraOff = false;
  /** How many cameras the phone or computer has, once one was opened; 0 while not known. */
  cameras = 0;
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
  // Their description that adds video, while they wait for our yes or no, and how long it waits.
  private videoOffer: string | null = null;
  private askTimer: ReturnType<typeof setTimeout> | null = null;
  // An offer of ours could not be taken back: the call goes on, but nothing more is added to it.
  private settled = false;
  // They take a new description of the call while it goes on, as their offer or answer said
  // (CallSignal's reoffer); an Erevos from before does not, and is sent none.
  private theyChange = false;
  // A voice call answered with the camera: video is asked for once it connects.
  private videoWanted = false;
  // A video call answered without the camera, where the answer still said video goes both ways
  // (CallEvents.bothWays): what sends our camera, once it is turned on.
  private idle: Sender | null = null;
  // Our new description, waiting for their answer as Erevos's own signals say it.
  private reanswered: ((sdp: string | null) => void) | null = null;
  // Their new description being taken; and the last one of Erevos's own signals, so one come twice is taken once.
  private taking = false;
  private lastChange = '';

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
    call.theyChange = signal.reoffer === true;
    current = call;
    call.wait(RING_MS, 'missed', true);
    call.say({ id: call.id, kind: 'ringing' });
    return call;
  }

  /** Whether our camera is on its way to them: not in a call answered with voice only, until it is turned on. */
  get hasCamera(): boolean {
    return (this.local?.getVideoTracks().length ?? 0) > 0;
  }

  /** Whether this call, ringing here, can be answered with video: a video call, or a voice call whose way can add video. */
  get canAnswerWithVideo(): boolean {
    return this.video || this.theyChange;
  }

  /**
   * Answers a call that rings here, with the camera (`video`) or with voice only. A voice call
   * answered with the camera asks them, once it connects, to take its video and send theirs; a
   * video call answered without it gets their picture, and ours goes only once the camera is on.
   */
  async answer(video = this.video): Promise<void> {
    if (this.outgoing || this.state !== 'incoming') return;
    this.set('connecting');
    this.wait(CONNECT_MS, 'failed', true);
    this.videoWanted = video && !this.video;
    const camera = video && this.video;
    if (this.video && !camera) this.cameraOff = true;
    try {
      if (!this.offer && this.options.events.offer) this.offer = await this.options.events.offer();
      if ((this.state as CallState) === 'ended') return;
      const connection = await this.connect(camera);
      await connection.setRemoteDescription({ type: 'offer', sdp: this.offer });
      this.described = true;
      this.addCandidates([]);
      if (this.video && !camera && this.options.events.bothWays) this.keepBothWays(connection);
      await connection.setLocalDescription(await connection.createAnswer());
      const sdp = await describedSdp(connection);
      // Hung up while it connected.
      if ((this.state as CallState) === 'ended') return;
      await this.options.events.send({ id: this.id, kind: 'answer', sdp, reoffer: true });
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
      if (signal.reoffer) this.theyChange = true;
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
    } else if (signal.kind === 'reoffer' && this.theyChange) {
      // The same that came twice, through the account's phone and straight: taken once.
      if (signal.sdp === this.lastChange) return;
      this.lastChange = signal.sdp;
      this.videoAsked(signal.sdp);
    } else if (signal.kind === 'reanswer') {
      this.reanswered?.(signal.sdp ?? null);
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
    // No camera to turn on: one answered with voice only is turned on by turnCameraOn.
    if (!off && !this.hasCamera) return;
    this.cameraOff = off;
    this.local?.getVideoTracks().forEach((track) => (track.enabled = !off));
    this.changed();
  }

  /** Front camera to back, or back; in a browser, the next camera there is. */
  switchCamera(): void {
    void turnCamera(this.options.rtc, this.local, this.connection ? [this.connection] : [], () => this.state !== 'ended').then((turned) => {
      if (!turned) return;
      this.changed();
      // The phone says which way it faces once it turned: its picture is mirrored only facing us.
      setTimeout(() => this.state !== 'ended' && this.changed(), 600);
    });
  }

  // A change of the call can be asked for now: where its way can, connected, nothing else being changed.
  private get changeable(): boolean {
    return this.theyChange && this.state === 'connected' && !this.addingVideo && !this.taking && this.videoOffer === null && !this.settled;
  }

  /** Whether video can be added to this voice call from here: once it is connected, where its way of calling can. */
  get canAddVideo(): boolean {
    return !this.video && this.changeable;
  }

  /** Whether our camera can be turned on in a video call answered without it. */
  get canTurnCameraOn(): boolean {
    if (!this.video || this.hasCamera || this.state !== 'connected' || this.addingVideo) return false;
    return !!this.idle || (this.changeable && !this.options.events.addsOnly);
  }

  /** Whether they ask to add video to this voice call, waiting for acceptVideo or declineVideo. */
  get askingVideo(): boolean {
    return this.videoOffer !== null;
  }

  /** Turns the camera on in a voice call, and asks them to take its video and send theirs; in a
   *  video call answered without the camera, turns it on (turnCameraOn). */
  async addVideo(): Promise<void> {
    const connection = this.connection;
    if (!connection || !(this.canAddVideo || (this.canTurnCameraOn && !this.idle))) return;
    this.addingVideo = true;
    this.changed();
    let camera: { track: Track; sender: unknown } | null = null;
    let offered = false;
    try {
      camera = await this.camera(connection);
      await connection.setLocalDescription(await connection.createOffer());
      offered = true;
      const sdp = await describedSdp(connection);
      const answer = await this.changeMedia(sdp);
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

  /**
   * Turns our camera on in a video call answered without it: at once where the answer kept video
   * both ways (CallEvents.bothWays), else as a new description of the call, which their phone takes
   * without asking, as it sends its own picture already.
   */
  async turnCameraOn(): Promise<void> {
    if (!this.canTurnCameraOn) return;
    const idle = this.idle;
    if (!idle) return this.addVideo();
    this.idle = null;
    this.addingVideo = true;
    this.changed();
    let track: Track | undefined;
    try {
      const camera = await this.options.rtc.media({ audio: false, video: true });
      camera.getAudioTracks().forEach((t) => t.stop());
      track = camera.getVideoTracks()[0];
      if (!track || !idle.replaceTrack) throw new Error('No camera.');
      if ((this.state as CallState) === 'ended') throw new Error(t('The call ended.'));
      await idle.replaceTrack(track);
      if ((this.state as CallState) === 'ended') throw new Error(t('The call ended.'));
      this.local?.addTrack?.(track);
      this.cameraOff = false;
      void this.countCameras();
    } catch {
      track?.stop();
      this.idle = idle;
    } finally {
      this.addingVideo = false;
      this.changed();
    }
  }

  /**
   * Their new description of the call, while it goes on. In a voice call it asks to add video, and
   * waits ASK_MS for acceptVideo or declineVideo; in a video call it is taken at once, as their
   * camera turned on. `ask` false: taken at once in either (Matrix's calls, which have no no).
   */
  videoAsked(sdp: string, ask = true): void {
    // Where media can only be added (XMPP's), more of it in a video call is not taken.
    const more = this.video && !!this.options.events.addsOnly;
    if (more || this.state !== 'connected' || this.addingVideo || this.taking || this.videoOffer !== null || this.settled) {
      this.answerChange(null).catch(() => undefined);
      return;
    }
    if (this.video || !ask) {
      void this.takeChange(sdp);
      return;
    }
    this.videoOffer = sdp;
    this.askTimer = setTimeout(() => this.declineVideo(), ASK_MS);
    this.changed();
  }

  /** Yes to their video: our camera goes on too. */
  async acceptVideo(): Promise<void> {
    const connection = this.connection;
    const offer = this.videoOffer;
    if (!connection || offer === null) return;
    this.stopAsking();
    this.taking = true;
    this.changed();
    let camera: { track: Track; sender: unknown } | null = null;
    try {
      camera = await this.camera(connection);
      await connection.setRemoteDescription({ type: 'offer', sdp: offer });
      await connection.setLocalDescription(await connection.createAnswer());
      const sdp = await describedSdp(connection);
      if ((this.state as CallState) === 'ended') return;
      await this.answerChange(sdp);
      this.video = true;
      this.cameraOff = false;
    } catch {
      if (camera) this.dropCamera(connection, camera);
      this.answerChange(null).catch(() => undefined);
      // Their offer was taken, but no answer went: nothing more can be added.
      this.settled = true;
    } finally {
      this.taking = false;
      this.changed();
    }
  }

  /** No to their video: the call goes on as a voice call. */
  declineVideo(): void {
    if (this.videoOffer === null) return;
    this.stopAsking();
    this.answerChange(null).catch(() => undefined);
    this.changed();
  }

  private stopAsking(): void {
    this.videoOffer = null;
    if (this.askTimer) clearTimeout(this.askTimer);
    this.askTimer = null;
  }

  // Their answer to our new description: the call's way's (XMPP's content-add, Matrix's
  // negotiate), or Erevos's own signals, waiting ADD_MS for theirs.
  private changeMedia(sdp: string): Promise<string> {
    const add = this.options.events.addMedia;
    if (add) return add(this.id, sdp);
    return new Promise((resolve, reject) => {
      const done = (answer: string | null) => {
        clearTimeout(timer);
        if (this.reanswered === done) this.reanswered = null;
        if (answer) resolve(answer);
        else reject(new Error('They did not take it.'));
      };
      const timer = setTimeout(() => done(null), ADD_MS);
      this.reanswered = done;
      this.options.events.send({ id: this.id, kind: 'reoffer', sdp }).catch(() => done(null));
    });
  }

  // Our answer to their new description, or with null our no.
  private answerChange(sdp: string | null): Promise<void> {
    const answer = this.options.events.answerMedia;
    if (answer) return answer(this.id, sdp);
    return this.options.events.send(sdp === null ? { id: this.id, kind: 'reanswer' } : { id: this.id, kind: 'reanswer', sdp });
  }

  // Their new description taken as it is, with nothing of ours added: their camera turned on in a
  // video call, or (Matrix's) whatever they changed, their picture added to a voice call too.
  private async takeChange(offer: string): Promise<void> {
    const connection = this.connection;
    if (!connection) return;
    this.taking = true;
    try {
      await connection.setRemoteDescription({ type: 'offer', sdp: offer });
      await connection.setLocalDescription(await connection.createAnswer());
      const sdp = await describedSdp(connection);
      if ((this.state as CallState) === 'ended') return;
      await this.answerChange(sdp);
      // Their picture, added to a voice call: it shows, and our camera stays off until turned on.
      if (!this.video && /^m=video /m.test(offer)) {
        this.video = true;
        this.cameraOff = true;
      }
    } catch {
      if ((this.state as CallState) !== 'ended') {
        this.settled = true;
        this.answerChange(null).catch(() => undefined);
      }
    } finally {
      this.taking = false;
      this.changed();
    }
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
    void this.countCameras();
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

  // XMPP's: the answer still says video goes both ways, with nothing of ours on it until the camera is on.
  private keepBothWays(connection: Connection): void {
    const idle = connection.getTransceivers?.().find((t) => t.receiver.track?.kind === 'video' && !t.sender.track);
    if (!idle) return;
    try {
      idle.direction = 'sendrecv';
      this.idle = idle.sender;
    } catch {
      // As it came: their picture only.
    }
  }

  private async countCameras(): Promise<void> {
    const count = await cameraCount(this.options.rtc);
    if (count === this.cameras || this.state === 'ended') return;
    this.cameras = count;
    this.changed();
  }

  private async dial(): Promise<void> {
    this.wait(RING_MS, 'missed', true);
    try {
      const connection = await this.connect(this.video);
      await connection.setLocalDescription(await connection.createOffer());
      const sdp = await describedSdp(connection);
      if (this.state === 'ended') return;
      await this.options.events.send({ id: this.id, kind: 'offer', video: this.video, sdp, at: callNow(), reoffer: true });
      // Gone: their phone may ring for it until it is OFFER_FRESH_MS old (calls.ts), so this waits
      // that long for it to say so, unless it said so already, or answered.
      if (this.state === 'calling') this.wait(OFFER_FRESH_MS + RINGING_BACK_MS, 'missed', true);
    } catch {
      this.end('failed', true);
    }
  }

  // The microphone, and the camera when `camera`, and the connection carrying them.
  private async connect(camera: boolean): Promise<Connection> {
    const local = await this.options.rtc.media({ audio: true, video: camera });
    if (this.state === 'ended') {
      local.getTracks().forEach((track) => track.stop());
      throw new Error(t('The call ended.'));
    }
    this.local = local;
    if (camera) void this.countCameras();
    const connection = this.options.rtc.connect(connectionConfig(this.options.relay));
    this.connection = connection;
    local.getTracks().forEach((track) => connection.addTrack(track, local));
    connection.addEventListener('track', ({ streams, track }) => {
      // Their video, added to a voice call, comes in the stream of its sound: shown anew all the same.
      if (streams[0]) {
        this.remote = streams[0];
        this.changed();
      } else if (track && this.remote && !this.remote.getTracks().includes(track)) {
        // One said with no stream of its own (from an answer that kept video both ways): with their sound's.
        this.remote.addTrack?.(track);
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
      // Answered with the camera: their phone is asked to take its video now.
      if (this.videoWanted) {
        this.videoWanted = false;
        if (this.canAddVideo) void this.addVideo();
      }
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
    this.stopAsking();
    this.ended = { reason, byUs, ...(elsewhere ? { elsewhere } : {}) };
    this.state = 'ended';
    this.local?.getTracks().forEach((track) => track.stop());
    try {
      this.connection?.close();
    } catch {
      // Closed already.
    }
    if (current === this) current = null;
    // Our new description waits no more.
    this.reanswered?.(null);
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
