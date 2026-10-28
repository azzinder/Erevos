import {
  MatrixError,
  openIdToken,
  roomState,
  rtcTransports,
  sendDelayedState,
  sendEvent,
  sendStateEvent,
  sendToDevicePlain,
  sendToDeviceSealed,
  updateDelayed,
  type Json,
  type MatrixState,
} from './matrix';

// Element Call inside Erevos (lib/matrix-calls.ts): Element's own call app, the one Element X calls
// with, runs in a web view of its own (modules/erevos-webcall) and asks for what it needs of the
// Matrix account through the Matrix Widget API, as it asks Element. This is Erevos's side of that
// talk, the host's. It lets the call app into one room only, the call's, to send and read the
// events of a call there and nothing else: its members, the keys of its media (encrypted as Matrix
// encrypts, by the account here), its ring and its decline. It answers who the account is to the
// call's media server (an OpenID token, nothing more), and where that server is. The call's sound
// and picture go between the call app and the media server (LiveKit), never through here.
//
// The messages are the Widget API's (matrix-widget-api): requests from the widget, which this
// answers, and requests to it, which it answers. Every request waits 10 seconds for its answer.

/** A message of the Widget API, either way. */
export type WidgetMessage = { api: 'fromWidget' | 'toWidget'; widgetId: string; requestId: string; action: string; data: Json; response?: Json };

/** What the host needs of the Matrix account (lib/matrix-store.ts). */
export type WidgetAccount = {
  userId: string;
  deviceId: string;
  /** Runs `use` with the account after the changes asked for before it, and keeps what it changed. */
  change<T>(use: (state: MatrixState) => Promise<T>): Promise<T>;
  /** Runs `use` with the account at once, for what changes nothing of it (a request, no keys). */
  read<T>(use: (state: MatrixState) => Promise<T>): Promise<T>;
};

/** What the call app said about the call, for the call screen. */
export type WidgetNews = 'joined' | 'hangup' | 'close';

export type WidgetHost = {
  /** A message from the call app. */
  receive(message: unknown): void;
  /** An event of a room as sync brought it, opened: the call app gets it if it may. */
  roomEvent(event: Json, timeline: boolean): void;
  /** An event sent to this device, opened if it came encrypted. */
  toDevice(event: { type: string; sender: string; content: Json }, encrypted: boolean): void;
  /** Asks the call app something, as Element asks it (`im.vector.hangup` to hang up). */
  ask(action: string, data?: Json): Promise<Json>;
  stop(): void;
};

/** The versions of the Widget API this host speaks. */
export const HOST_VERSIONS = [
  '0.0.1',
  '0.0.2',
  'org.matrix.msc2762',
  'org.matrix.msc2762_update_state',
  'org.matrix.msc2871',
  'org.matrix.msc2876',
  'org.matrix.msc2974',
  'org.matrix.msc3819',
  'org.matrix.msc4515',
];

export const CALL_MEMBER = 'org.matrix.msc3401.call.member';

// The events of a call, all the call app may send to the room and read of it: its ring, the keys
// of its media, reactions and raised hands, a decline, a member (MatrixRTC's newer one).
const ROOM_EVENTS = new Set([
  'org.matrix.msc4075.call.notify',
  'org.matrix.msc4075.rtc.notification',
  'io.element.call.encryption_keys',
  'io.element.call.reaction',
  'm.reaction',
  'm.room.redaction',
  'org.matrix.msc4310.rtc.decline',
  'org.matrix.msc4143.rtc.member',
]);
// The room's state it may read: what the room is, who is in it, whether it is encrypted, the call's members.
const READ_STATE = new Set(['m.room.create', 'm.room.name', 'm.room.member', 'm.room.encryption', CALL_MEMBER]);
// What it may send to devices and get from them: a call's keys, and the steps of a call made the older way.
const TO_DEVICE = new Set([
  'm.call.invite',
  'm.call.candidates',
  'm.call.answer',
  'm.call.hangup',
  'm.call.reject',
  'm.call.select_answer',
  'm.call.negotiate',
  'm.call.sdp_stream_metadata_changed',
  'org.matrix.call.sdp_stream_metadata_changed',
  'm.call.replaces',
  'io.element.call.encryption_keys',
]);
const PLAIN = new Set(['m.always_on_screen', 'org.matrix.msc4157.send.delayed_event', 'org.matrix.msc4157.update_delayed_event', 'org.matrix.msc4515.rtc_transports']);

/** Whether the call app may have `capability` in `roomId`: only what a call needs, there, and as
 *  its own member only (the state keys of this account and device). */
export function allowedCapability(capability: string, roomId: string, userId: string, deviceId: string): boolean {
  if (PLAIN.has(capability) || capability === `org.matrix.msc2762.timeline:${roomId}`) return true;
  for (const direction of ['send', 'receive']) {
    const event = `org.matrix.msc2762.${direction}.event:`;
    if (capability.startsWith(event)) return ROOM_EVENTS.has(capability.slice(event.length));
    const device = `org.matrix.msc3819.${direction}.to_device:`;
    if (capability.startsWith(device)) return TO_DEVICE.has(capability.slice(device.length));
  }
  const read = 'org.matrix.msc2762.receive.state_event:';
  if (capability.startsWith(read)) return READ_STATE.has(capability.slice(read.length).split('#')[0]);
  const write = 'org.matrix.msc2762.send.state_event:';
  if (capability.startsWith(write)) {
    const rest = capability.slice(write.length);
    const hash = rest.indexOf('#');
    if (hash < 0 || rest.slice(0, hash) !== CALL_MEMBER) return false;
    const key = rest.slice(hash + 1);
    return key === userId || key.startsWith(`_${userId}_${deviceId}_`) || key.startsWith(`${userId}_${deviceId}_`);
  }
  return false;
}

const TIMEOUT_MS = 10_000;

/** Speaks the Widget API with the call app in `roomId`: `post` sends it a message, `told` hears what it says of the call. */
export function hostWidget(options: {
  widgetId: string;
  roomId: string;
  account: WidgetAccount;
  post: (message: WidgetMessage) => void;
  told: (news: WidgetNews) => void;
}): WidgetHost {
  const { widgetId, roomId, account, post, told } = options;
  const approved = new Set<string>();
  const waiting = new Map<string, { resolve: (data: Json) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let asked = 0;
  let began = false;
  let stopped = false;
  // State that changed before the room's state first went to the call app, by type and key.
  let early: Map<string, Json> | null = new Map();
  let beginSoon: ReturnType<typeof setTimeout> | null = null;

  const has = (capability: string) => approved.has(capability);
  const canState = (direction: 'send' | 'receive', type: string, key: string) =>
    has(`org.matrix.msc2762.${direction}.state_event:${type}`) || has(`org.matrix.msc2762.${direction}.state_event:${type}#${key}`);
  const canEvent = (direction: 'send' | 'receive', type: string) => has(`org.matrix.msc2762.${direction}.event:${type}`);
  const canDevice = (direction: 'send' | 'receive', type: string) => has(`org.matrix.msc3819.${direction}.to_device:${type}`);

  function ask(action: string, data: Json = {}): Promise<Json> {
    if (stopped) return Promise.reject(new Error('stopped'));
    const requestId = `erevos-${++asked}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting.delete(requestId);
        reject(new Error('Request timed out'));
      }, TIMEOUT_MS);
      waiting.set(requestId, { resolve, reject, timer });
      post({ api: 'toWidget', widgetId, requestId, action, data });
    });
  }

  const reply = (request: WidgetMessage, response: Json) => {
    if (!stopped) post({ ...request, response });
  };
  const refuse = (request: WidgetMessage, message: string, error?: unknown) =>
    reply(request, {
      error: {
        message,
        // The homeserver's refusal as it gave it, which the call app acts on (a rate limit, say).
        ...(error instanceof MatrixError ? { matrix_api_error: { http_status: error.status, http_headers: {}, url: '', response: { errcode: error.code, error: error.message } } } : {}),
      },
    });

  // The call app is ready: what it asks to do, allowed as far as a call needs, then the room's state as it is.
  async function begin(): Promise<void> {
    if (began || stopped) return;
    began = true;
    if (beginSoon) clearTimeout(beginSoon);
    const answered: Json = await ask('capabilities').catch(() => ({}));
    const requested = Array.isArray(answered.capabilities) ? (answered.capabilities as string[]) : [];
    allow(requested);
    await pushState();
  }

  function allow(requested: string[]): void {
    for (const c of requested) if (allowedCapability(c, roomId, account.userId, account.deviceId)) approved.add(c);
    void ask('notify_capabilities', { requested, approved: [...approved] }).catch(() => undefined);
  }

  // The state the call app may read, at once, as the Widget API's update_state gives it; then only what changes.
  async function pushState(): Promise<void> {
    let events: Json[] = [];
    try {
      events = await account.read((state) => roomState(state, roomId));
    } catch {
      // Without it the call app starts from nothing, and learns as state changes.
    }
    const latest = new Map<string, Json>();
    for (const e of events) latest.set(`${e.type} ${e.state_key}`, e);
    for (const [key, e] of early ?? []) latest.set(key, e);
    early = null;
    const shown = [...latest.values()].filter((e) => canState('receive', String(e.type), String(e.state_key)));
    await ask('update_state', { state: shown }).catch(() => undefined);
  }

  async function act(request: WidgetMessage): Promise<void> {
    const data = request.data ?? {};
    switch (request.action) {
      case 'supported_api_versions':
        return reply(request, { supported_versions: HOST_VERSIONS });
      case 'content_loaded':
        reply(request, {});
        return begin();
      case 'org.matrix.msc2974.request_capabilities': {
        reply(request, {});
        const more = ((data.capabilities as string[] | undefined) ?? []).filter((c) => !has(c));
        return allow(more);
      }
      case 'send_event':
        return sendFor(request, data);
      case 'send_to_device':
        return sendToDeviceFor(request, data);
      case 'org.matrix.msc2876.read_events':
        return readFor(request, data);
      case 'get_openid': {
        const token = await account.read((state) => openIdToken(state)).catch((error: unknown) => error);
        if (token instanceof Error) return refuse(request, 'The homeserver gave no OpenID token', token);
        return reply(request, { state: 'allowed', ...(token as Json) });
      }
      case 'org.matrix.msc4157.update_delayed_event': {
        const action = data.action;
        if (!has('org.matrix.msc4157.update_delayed_event')) return refuse(request, 'Missing capability');
        if (typeof data.delay_id !== 'string' || (action !== 'send' && action !== 'restart' && action !== 'cancel')) return refuse(request, 'Invalid request');
        const done = await account.read((state) => updateDelayed(state, data.delay_id as string, action)).catch((error: unknown) => error);
        return done instanceof Error ? refuse(request, 'Error updating delayed event', done) : reply(request, {});
      }
      case 'org.matrix.msc4515.get_rtc_transports': {
        if (!has('org.matrix.msc4515.rtc_transports')) return refuse(request, 'Missing capability');
        const transports = await account.read((state) => rtcTransports(state)).catch((error: unknown) => error);
        return transports instanceof Error ? refuse(request, 'Error getting the RTC transports', transports) : reply(request, { rtc_transports: transports as Json[] });
      }
      case 'set_always_on_screen':
        return reply(request, { success: true });
      case 'io.element.join':
        reply(request, {});
        return told('joined');
      case 'im.vector.hangup':
        reply(request, {});
        return told('hangup');
      case 'io.element.close':
        reply(request, {});
        return told('close');
      // How its microphone and camera stand: nothing to do with it here.
      case 'io.element.device_mute':
        return reply(request, {});
      default:
        return refuse(request, `Unknown or unsupported from-widget action: ${request.action}`);
    }
  }

  async function sendFor(request: WidgetMessage, data: Json): Promise<void> {
    const type = data.type;
    if (typeof type !== 'string' || !type) return refuse(request, 'Invalid request - missing event type');
    if (data.room_id !== undefined && data.room_id !== roomId) return refuse(request, `Unable to access room timeline: ${String(data.room_id)}`);
    if (data.sticky_duration_ms !== undefined) return refuse(request, 'Sticky events are not supported');
    const content = (data.content as Json | undefined) ?? {};
    const delay = data.delay;
    if (delay !== undefined && (!has('org.matrix.msc4157.send.delayed_event') || typeof delay !== 'number')) return refuse(request, 'Missing capability for org.matrix.msc4157.send.delayed_event');
    let sent: Json | Error;
    if (data.state_key !== undefined) {
      const key = String(data.state_key);
      if (!canState('send', type, key)) return refuse(request, 'Cannot send state events of this type');
      sent = await account
        .read(async (state) =>
          typeof delay === 'number' ? { delay_id: await sendDelayedState(state, roomId, type, key, content, delay) } : { event_id: await sendStateEvent(state, roomId, type, key, content) },
        )
        .catch((error: unknown) => (error instanceof Error ? error : new Error(String(error))));
    } else {
      if (!canEvent('send', type)) return refuse(request, 'Cannot send room events of this type');
      // A room's events go encrypted as the room is, and a delayed one could not.
      if (delay !== undefined) return refuse(request, 'Delayed room events are not supported');
      sent = await account
        .change(async (state) => ({ event_id: await sendEvent(state, roomId, type, content) }))
        .catch((error: unknown) => (error instanceof Error ? error : new Error(String(error))));
    }
    if (sent instanceof Error) return refuse(request, 'Error sending event', sent);
    reply(request, { room_id: roomId, ...sent });
  }

  async function sendToDeviceFor(request: WidgetMessage, data: Json): Promise<void> {
    const { type, encrypted, messages } = data;
    if (typeof type !== 'string' || !type) return refuse(request, 'Invalid request - missing event type');
    if (!messages || typeof messages !== 'object') return refuse(request, 'Invalid request - missing event contents');
    if (typeof encrypted !== 'boolean') return refuse(request, 'Invalid request - missing encryption flag');
    if (!canDevice('send', type)) return refuse(request, 'Cannot send to-device events of this type');
    const to = messages as Record<string, Record<string, Json>>;
    const done = await (encrypted ? account.change((state) => sendToDeviceSealed(state, type, to)) : account.read((state) => sendToDevicePlain(state, type, to)))
      .catch((error: unknown) => (error instanceof Error ? error : new Error(String(error))));
    return done instanceof Error ? refuse(request, 'Error sending event', done) : reply(request, {});
  }

  // The call app reads the room's state through update_state; asked anyway, it gets the state as it is now.
  async function readFor(request: WidgetMessage, data: Json): Promise<void> {
    const type = data.type;
    if (typeof type !== 'string' || !type) return refuse(request, 'Invalid request - missing event type');
    const rooms = data.room_ids;
    if (rooms !== undefined && (!Array.isArray(rooms) || rooms.some((r) => r !== roomId))) return refuse(request, 'Unable to access room timeline');
    if (data.state_key === undefined) return canEvent('receive', type) ? reply(request, { events: [] }) : refuse(request, 'Cannot read room events of this type');
    const key = data.state_key === true ? null : String(data.state_key);
    if (!(key === null ? has(`org.matrix.msc2762.receive.state_event:${type}`) : canState('receive', type, key))) return refuse(request, 'Cannot read state events of this type');
    const events = await account.read((state) => roomState(state, roomId)).catch(() => [] as Json[]);
    reply(request, { events: events.filter((e) => e.type === type && (key === null || e.state_key === key)) });
  }

  return {
    receive(message: unknown) {
      if (stopped || !message || typeof message !== 'object') return;
      const m = message as WidgetMessage;
      if (m.widgetId !== widgetId || typeof m.requestId !== 'string' || typeof m.action !== 'string') return;
      if (m.api === 'toWidget' && m.response) {
        const waited = waiting.get(m.requestId);
        if (!waited) return;
        waiting.delete(m.requestId);
        clearTimeout(waited.timer);
        const error = (m.response as Json).error as Json | undefined;
        if (error) waited.reject(new Error(String(error.message ?? 'The call app refused')));
        else waited.resolve(m.response);
        return;
      }
      if (m.api !== 'fromWidget' || m.response) return;
      // A call app that never says it loaded still gets going.
      if (!began && !beginSoon) beginSoon = setTimeout(() => void begin(), 5000);
      void act(m).catch((error: unknown) => refuse(m, error instanceof Error ? error.message : String(error)));
    },
    roomEvent(event: Json, timeline: boolean) {
      if (stopped || event.room_id !== roomId) return;
      const type = String(event.type);
      const isState = typeof event.state_key === 'string';
      if (isState) {
        if (early) early.set(`${type} ${event.state_key}`, event);
        else if (canState('receive', type, String(event.state_key))) void ask('update_state', { state: [event] }).catch(() => undefined);
      }
      if (!timeline || !began) return;
      if (isState ? canState('receive', type, String(event.state_key)) : canEvent('receive', type)) void ask('send_event', event).catch(() => undefined);
    },
    toDevice(event, encrypted) {
      if (stopped || !canDevice('receive', event.type)) return;
      void ask('send_to_device', { type: event.type, sender: event.sender, content: event.content, encrypted }).catch(() => undefined);
    },
    ask,
    stop() {
      stopped = true;
      if (beginSoon) clearTimeout(beginSoon);
      for (const { timer, reject } of waiting.values()) {
        clearTimeout(timer);
        reject(new Error('stopped'));
      }
      waiting.clear();
    },
  };
}
