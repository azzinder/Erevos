// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// How a chat, or a group, tells of what comes in it (Chat details → Notifications), apart from
// the app's own settings: muted for a while or for good, its messages with a sound of their own or
// none, and its calls with a ringtone of their own or none. Kept with the contact, or the group,
// in the space's encrypted data, on this phone only: a linked device keeps its own. A muted chat's
// messages make no sound and no notice, and the icon's number leaves them out; its calls still
// ring. In hidden chats only muting counts: a sound of its own would tell which chat it is.

/** A chat's own notifications, as kept: muted `until` then (ms; ALWAYS for good), and its messages'
 *  `sound` and calls' `ring`: a sound's address on the phone, or '' for none. What is missing is
 *  as the app has it. */
export type ChatNotify = { until?: number; sound?: string; ring?: string };

/** `until` for a chat muted for good: the last time a Date can hold. */
export const ALWAYS = 8_640_000_000_000_000;

/** Whether the chat is muted at `now`. */
export const mutedNow = (notify: ChatNotify | null | undefined, now = Date.now()): boolean => !!notify?.until && notify.until > now;

// What Android's sound picker gives: content://media/…, android.resource://…, file://….
const isSound = (v: unknown): v is string => typeof v === 'string' && (v === '' || (v.length <= 1024 && /^[a-z][a-z0-9+.-]*:\/\/\S+$/.test(v)));

/** A chat's notifications as kept, or null for none of its own (or the wrong shape). */
export function checkedChatNotify(value: unknown): ChatNotify | null {
  const v = (value ?? {}) as Partial<Record<keyof ChatNotify, unknown>>;
  const notify: ChatNotify = {
    ...(typeof v.until === 'number' && Number.isSafeInteger(v.until) && v.until > 0 && v.until <= ALWAYS ? { until: v.until } : {}),
    ...(isSound(v.sound) ? { sound: v.sound } : {}),
    ...(isSound(v.ring) ? { ring: v.ring } : {}),
  };
  return Object.keys(notify).length ? notify : null;
}
