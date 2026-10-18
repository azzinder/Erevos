import { connectionConfig, CONNECT_MS, currentCall, describedSdp, newCallId, RECONNECT_MS, RING_MS, type Connection, type Rtc, type Stream } from './call';
import type { GroupCallSignal } from './group-call-signal';
import type { CallRelay } from './relay';

// A group's call, voice or video: a WebRTC connection between each two members in it (a mesh),
// each set up as a call with a contact is (lib/call.ts), with signals sent in the group's own
// end-to-end encrypted messages (lib/group-call-signal.ts). Each member's sound and picture go
// straight to each other member, encrypted between the two (DTLS-SRTP), through the call relay
// when there is one. Each phone sends its picture to every other one, which only a few phones'
// uplinks carry: with more than MAX_VIDEO in a video call, the pictures pause and the sound goes on.
//
// Whoever starts it is in it at once, and it rings on the others' phones. Whoever joins says so to
// the group, and each member already in it offers a connection to them: so two members never
// offer to each other, but for two joining at once, when the one with the lower identity's offer
// counts. A phone has one call at a time, a group's or a contact's.

/** The most members in a group call: each sends its sound to each other one. */
export const MAX_GROUP_CALL = 8;
/** The most members in a video call whose pictures show: each sends its picture to each other one. */
export const MAX_VIDEO = 4;
/** How often a member in a call says it still is, milliseconds. */
export const HERE_EVERY = 60_000;

export type GroupCallState = 'incoming' | 'in' | 'ended';

export type CallPeer = {
  /** Their identity, hex. */
  identity: string;
  state: 'connecting' | 'connected';
  remote: Stream | null;
};

export type GroupCallEvents = {
  /** Something about the call changed: its state, who is in it, mute. */
  onChange(call: GroupCall): void;
  /** Says something to the group about the call. Rejects when it could not be sent. */
  send(signal: GroupCallSignal): Promise<void>;
};

export type GroupCallOptions = {
  group: string;
  video: boolean;
  /** This phone's identity, hex. */
  me: string;
  /** The call relay, or null to connect directly on the same network. */
  relay: CallRelay | null;
  rtc: Rtc;
  events: GroupCallEvents;
};

type Peer = CallPeer & {
  connection: Connection;
  /** We offered: their answer is still to come, or came. */
  offered: boolean;
  answered: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

let current: GroupCall | null = null;

/** The group call on this phone, if any. */
export function currentGroupCall(): GroupCall | null {
  return current && current.state !== 'ended' ? current : null;
}

export class GroupCall {
  readonly id: string;
  readonly group: string;
  /** Who started it, hex: empty for this phone. */
  readonly startedBy: string;
  readonly video: boolean;
  state: GroupCallState;
  /** Why it ended: hung up here, or it rang here without an answer or was turned down. */
  ended: 'hangup' | 'missed' | 'decline' | 'failed' | null = null;
  local: Stream | null = null;
  muted = false;
  cameraOff = false;
  /** When this phone joined, milliseconds, or 0. */
  joinedAt = 0;
  private readonly peerMap = new Map<string, Peer>();
  private readonly options: GroupCallOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private here: ReturnType<typeof setInterval> | null = null;

  private constructor(id: string, startedBy: string, state: GroupCallState, options: GroupCallOptions) {
    this.id = id;
    this.group = options.group;
    this.startedBy = startedBy;
    this.video = options.video;
    this.state = state;
    this.options = options;
  }

  /** Starts a call in the group. Throws if a call is already in progress. */
  static async start(options: GroupCallOptions): Promise<GroupCall> {
    busy();
    const call = new GroupCall(newCallId(), '', 'incoming', options);
    current = call;
    await call.enter({ id: call.id, kind: 'start', at: Date.now(), video: call.video });
    return call;
  }

  /** Joins a call going on in the group, without its ringing here. Throws if a call is already in progress. */
  static async join(id: string, startedBy: string, options: GroupCallOptions): Promise<GroupCall> {
    busy();
    const call = new GroupCall(id, startedBy, 'incoming', options);
    current = call;
    await call.enter({ id, kind: 'join' });
    return call;
  }

  /** A call someone started that rings here. Null if a call is already in progress. */
  static incoming(id: string, startedBy: string, options: GroupCallOptions): GroupCall | null {
    if (currentCall() || currentGroupCall()) return null;
    const call = new GroupCall(id, startedBy, 'incoming', options);
    current = call;
    call.timer = setTimeout(() => call.end('missed'), RING_MS);
    return call;
  }

  /** Who else is in the call with this phone. */
  peers(): CallPeer[] {
    return [...this.peerMap.values()].map(({ identity, state, remote }) => ({ identity, state, remote }));
  }

  /** Answers the call that rings here. */
  async answer(): Promise<void> {
    if (this.state !== 'incoming') return;
    this.stopRinging();
    await this.enter({ id: this.id, kind: 'join' }).catch(() => undefined);
  }

  /** Turns down the call that rings here. */
  decline(): void {
    if (this.state === 'incoming') this.end('decline');
  }

  /** Leaves the call. */
  hangUp(): void {
    if (this.state === 'ended') return;
    if (this.state === 'in') this.say({ id: this.id, kind: 'leave' });
    this.end(this.state === 'in' ? 'hangup' : 'decline');
  }

  /** Nobody is in the call any more, while it rang here. */
  missed(): void {
    if (this.state === 'incoming') this.end('missed');
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.local?.getAudioTracks().forEach((track) => (track.enabled = !muted));
    this.changed();
  }

  setCameraOff(off: boolean): void {
    this.cameraOff = off;
    this.changed();
  }

  /** Front camera to back, or back. */
  switchCamera(): void {
    this.local?.getVideoTracks().forEach((track) => track._switchCamera?.());
  }

  /** A video call with too many in it for pictures: only the sound goes on. */
  get videoPaused(): boolean {
    return this.video && this.peerMap.size + 1 > MAX_VIDEO;
  }

  /** What a member said about this call. */
  receive(from: string, signal: GroupCallSignal): void {
    if (signal.id !== this.id || this.state !== 'in' || from === this.options.me) return;
    switch (signal.kind) {
      case 'join':
        if (!this.peerMap.has(from) && this.peerMap.size < MAX_GROUP_CALL - 1) void this.offer(from);
        break;
      case 'offer': {
        const ours = this.peerMap.get(from);
        // Both offered, as both joined at once: the offer of the lower identity counts.
        if (ours?.offered && !ours.answered && this.options.me < from) return;
        if (ours) this.drop(from);
        if (this.peerMap.size >= MAX_GROUP_CALL - 1) return;
        void this.answerOffer(from, signal.sdp);
        break;
      }
      case 'answer': {
        const peer = this.peerMap.get(from);
        if (!peer?.offered || peer.answered) return;
        peer.answered = true;
        peer.connection.setRemoteDescription({ type: 'answer', sdp: signal.sdp }).catch(() => this.drop(from));
        break;
      }
      case 'leave':
        this.drop(from);
        break;
      default:
        break;
    }
  }

  // The microphone, then into the call, saying `signal` to the group.
  private async enter(signal: GroupCallSignal): Promise<void> {
    try {
      const local = await this.options.rtc.media({ audio: true, video: this.video });
      if (this.state === 'ended') {
        local.getTracks().forEach((track) => track.stop());
        return;
      }
      this.local = local;
      local.getAudioTracks().forEach((track) => (track.enabled = !this.muted));
      this.state = 'in';
      this.joinedAt = Date.now();
      this.here = setInterval(() => this.say({ id: this.id, kind: 'here', video: this.video }), HERE_EVERY);
      this.changed();
      await this.options.events.send(signal);
    } catch (error) {
      this.end('failed');
      throw error;
    }
  }

  private connect(identity: string, offered: boolean): Peer {
    const connection = this.options.rtc.connect(connectionConfig(this.options.relay));
    const peer: Peer = { identity, state: 'connecting', remote: null, connection, offered, answered: false, timer: null };
    this.peerMap.set(identity, peer);
    const local = this.local!;
    local.getTracks().forEach((track) => connection.addTrack(track, local));
    connection.addEventListener('track', ({ streams }) => {
      if (streams[0] && peer.remote !== streams[0]) {
        peer.remote = streams[0];
        this.changed();
      }
    });
    connection.addEventListener('connectionstatechange', () => this.connectionChanged(peer, connection.connectionState));
    this.waitFor(peer, CONNECT_MS);
    this.changed();
    return peer;
  }

  private async offer(identity: string): Promise<void> {
    const peer = this.connect(identity, true);
    try {
      await peer.connection.setLocalDescription(await peer.connection.createOffer());
      const sdp = await describedSdp(peer.connection);
      if (this.peerMap.get(identity) !== peer) return;
      await this.options.events.send({ id: this.id, kind: 'offer', to: identity, sdp });
    } catch {
      if (this.peerMap.get(identity) === peer) this.drop(identity);
    }
  }

  private async answerOffer(identity: string, offer: string): Promise<void> {
    const peer = this.connect(identity, false);
    try {
      await peer.connection.setRemoteDescription({ type: 'offer', sdp: offer });
      await peer.connection.setLocalDescription(await peer.connection.createAnswer());
      const sdp = await describedSdp(peer.connection);
      if (this.peerMap.get(identity) !== peer) return;
      await this.options.events.send({ id: this.id, kind: 'answer', to: identity, sdp });
    } catch {
      if (this.peerMap.get(identity) === peer) this.drop(identity);
    }
  }

  private connectionChanged(peer: Peer, state: string) {
    if (this.peerMap.get(peer.identity) !== peer) return;
    if (state === 'connected') {
      if (peer.timer) clearTimeout(peer.timer);
      peer.timer = null;
      if (peer.state !== 'connected') {
        peer.state = 'connected';
        this.changed();
      }
    } else if (state === 'disconnected') {
      // Wi-Fi to mobile data, a tunnel: give it a moment to come back.
      this.waitFor(peer, RECONNECT_MS);
    } else if (state === 'failed') {
      this.drop(peer.identity);
    }
  }

  private waitFor(peer: Peer, ms: number) {
    if (peer.timer) clearTimeout(peer.timer);
    peer.timer = setTimeout(() => this.drop(peer.identity), ms);
  }

  private drop(identity: string) {
    const peer = this.peerMap.get(identity);
    if (!peer) return;
    this.peerMap.delete(identity);
    if (peer.timer) clearTimeout(peer.timer);
    try {
      peer.connection.close();
    } catch {
      // Closed already.
    }
    this.changed();
  }

  private end(reason: NonNullable<GroupCall['ended']>): void {
    if (this.state === 'ended') return;
    this.stopRinging();
    if (this.here) clearInterval(this.here);
    this.here = null;
    for (const identity of [...this.peerMap.keys()]) this.drop(identity);
    this.local?.getTracks().forEach((track) => track.stop());
    this.ended = reason;
    this.state = 'ended';
    if (current === this) current = null;
    this.changed();
  }

  private stopRinging() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // A signal whose loss only means the others find out later.
  private say(signal: GroupCallSignal) {
    this.options.events.send(signal).catch(() => undefined);
  }

  private changed() {
    // Our picture goes out only while it shows.
    const sends = !this.cameraOff && !this.videoPaused;
    this.local?.getVideoTracks().forEach((track) => (track.enabled = sends));
    this.options.events.onChange(this);
  }
}

function busy() {
  if (currentCall() || currentGroupCall()) throw new Error('There is a call already.');
}
