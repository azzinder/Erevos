import type { MatrixState } from '../lib/matrix';

import { sealedFile } from './sealed-file';

// A space's Matrix account (lib/matrix.ts, docs/matrix.md): its sign-in, its device's keys and
// sessions, and its rooms with their latest messages, as one value kept in FILE, sealed with the
// space's key, one for each space (sealed-file.ts), so nothing tells whether a space has one. Only
// the space's own, never its hidden places'. Not in backups yet: a restored phone signs in again.

export const FILE = 'erevos-matrix';
const BLOCK = 16 * 1024;

type MatrixData = { account: MatrixState | null };

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a kept account has its shape: a damaged one is left out, and the space signs in again. */
export function isMatrixState(value: unknown): value is MatrixState {
  if (!object(value)) return false;
  const v = value as Partial<Record<keyof MatrixState, unknown>>;
  return (
    typeof v.homeserver === 'string' &&
    /^https:\/\//.test(v.homeserver) &&
    typeof v.userId === 'string' &&
    typeof v.deviceId === 'string' &&
    typeof v.accessToken === 'string' &&
    object(v.account) &&
    object(v.rooms) &&
    object(v.devices) &&
    Array.isArray(v.outdated) &&
    object(v.olm) &&
    object(v.inbound) &&
    object(v.outbound) &&
    object(v.seen) &&
    (v.since === undefined || typeof v.since === 'string')
  );
}

// A kept push (lib/matrix-push.ts MatrixPush) that is not one is left out: the space then tells of nothing while closed.
const isPush = (value: unknown) => {
  const v = (value ?? {}) as Record<string, unknown>;
  return typeof v.url === 'string' && [v.recipientHex, v.senderHex].every((id) => typeof id === 'string' && /^[0-9a-f]{48}$/.test(id));
};

function checked(value: unknown): MatrixData {
  const account = object(value) ? value.account : null;
  if (!isMatrixState(account)) return { account: null };
  if (account.push !== undefined && !isPush(account.push)) delete account.push;
  return { account };
}

const store = sealedFile({ name: FILE, empty: { account: null } as MatrixData, checked, block: BLOCK });

/** The space's Matrix account, or null when it has none. */
export async function loadMatrix(space: number, key: Uint8Array): Promise<MatrixState | null> {
  return (await store.load('space', space, key)).account;
}

/** Keeps the space's Matrix account, or forgets it with null. */
export async function saveMatrix(space: number, key: Uint8Array, account: MatrixState | null): Promise<void> {
  await store.save('space', space, key, { account });
}
