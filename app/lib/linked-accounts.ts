// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Brought } from '../lock/devices-data';
import { loadMatrix } from '../lock/matrix-data';
import { loadNostrDm } from '../lock/nostr-dm-data';
import { loadXmpp } from '../lock/xmpp-data';
import { canMatrix, canNostrChat, canXmpp } from './core';
import { handAccounts, spaceLinks } from './devices';
import type { GivenAccounts, GivenMatrix } from './link-wire';
import { loginToken } from './matrix-account';
import { matrixLetGo, matrixNow, matrixTake, onMatrixChange } from './matrix-store';
import { nostrDmLetGo, nostrDmNow, nostrDmTake } from './nostr-dm-store';
import { xmppLetGo, xmppTake } from './xmpp-store';

// The space's own Matrix, XMPP and Nostr accounts, given by the phone to a device linked to it
// (lib/devices.ts, `accounts`; docs/linked-devices.md), once the codes match when that was chosen,
// or when asked again on the phone. Never a hidden place's: no device is linked to those.
//
// The device signs in as a new device of each, never a copy of the phone's, whose keys would be
// used twice: XMPP with the account's password, as a new resource with an OMEMO device of its own;
// Nostr with the key itself, which has no devices, reading on the relays the phone reads on.
// Matrix with a one-use login token, when the homeserver gives the phone one without asking for
// the password again, as few do; otherwise the device is signed in to by hand, once. Then it takes
// the account's cross-signing keys and its key backup's key, as a Security Key would open them, so
// other people's apps trust it as the account's own and it opens the messages from before.
//
// A space that has an account of that network already keeps it: only the Matrix keys go to one
// signed in as the same user. What could not be brought yet is tried again each time the space
// opens, and a Matrix account waits for its sign-in. Once unlinked, the device lets go of what it
// brought, as it lets go of the chats: signed out as that device, or the key forgotten.

async function give(space: number, key: Uint8Array): Promise<GivenAccounts> {
  const [matrix, xmpp, nostr] = await Promise.all([loadMatrix(space, key).catch(() => null), loadXmpp(space, key).catch(() => null), loadNostrDm(space, key).catch(() => null)]);
  const given: GivenAccounts = {};
  if (matrix) {
    const token = await loginToken(matrix);
    given.matrix = {
      homeserver: matrix.homeserver,
      userId: matrix.userId,
      ...(token ? { token } : {}),
      ...(matrix.crossSigning ? { keys: matrix.crossSigning } : {}),
      ...(matrix.backup ? { backup: matrix.backup.secret } : {}),
    };
  }
  if (xmpp) given.xmpp = { jid: xmpp.jid, password: xmpp.password, ...(xmpp.server ? { server: xmpp.server } : {}) };
  if (nostr) given.nostr = { secret: nostr.secret, inbox: nostr.inbox, ...(nostr.name !== undefined ? { name: nostr.name } : {}), ...(nostr.files?.length ? { files: nostr.files } : {}) };
  return given;
}

const why = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function take(space: number, _key: Uint8Array, given: GivenAccounts): Promise<{ left: GivenAccounts; brought: Brought; problems: string[] }> {
  const left: GivenAccounts = {};
  const brought: Brought = {};
  const problems: string[] = [];
  const { xmpp, nostr, matrix } = given;
  // A build without the network keeps it, for one that has it.
  if (xmpp && !canXmpp()) left.xmpp = xmpp;
  else if (xmpp) {
    try {
      const done = await xmppTake(space, xmpp.jid, xmpp.password, xmpp.server);
      if (done === null) left.xmpp = xmpp;
      if (done === 'brought') brought.xmpp = xmpp.jid;
    } catch (error) {
      left.xmpp = xmpp;
      problems.push(`XMPP: ${why(error)}`);
    }
  }
  if (nostr && !canNostrChat()) left.nostr = nostr;
  else if (nostr) {
    try {
      const done = await nostrDmTake(space, nostr);
      if (done === null) left.nostr = nostr;
      const publicKey = done === 'brought' ? nostrDmNow('space').state?.public : undefined;
      if (publicKey) brought.nostr = publicKey;
    } catch (error) {
      left.nostr = nostr;
      problems.push(`Nostr: ${why(error)}`);
    }
  }
  if (matrix && !canMatrix()) left.matrix = matrix;
  else if (matrix) {
    // A login token is good once, and not for long: what waits, waits without it.
    const { token: _token, ...waiting } = matrix;
    try {
      const done = await matrixTake(space, matrix);
      if (done.state === 'closed') left.matrix = matrix;
      if (done.state === 'wait') left.matrix = { ...waiting, waited: true };
      if (done.state === 'done') {
        const ours = done.signedIn || matrix.waited === true;
        if (ours) brought.matrix = { userId: matrix.userId, deviceId: done.deviceId };
        if (done.problem) {
          left.matrix = { ...waiting, ...(ours ? { waited: true as const } : {}) };
          problems.push(`Matrix: ${done.problem}`);
        }
      }
    } catch (error) {
      left.matrix = waiting;
      problems.push(`Matrix: ${why(error)}`);
    }
  }
  return { left, brought, problems };
}

async function letGo(space: number, _key: Uint8Array, brought: Brought): Promise<void> {
  if (brought.xmpp && canXmpp()) await xmppLetGo(space, brought.xmpp).catch(() => undefined);
  if (brought.nostr && canNostrChat()) await nostrDmLetGo(space, brought.nostr).catch(() => undefined);
  if (brought.matrix && canMatrix()) await matrixLetGo(space, brought.matrix).catch(() => undefined);
}

handAccounts({ give, take, letGo });

/** On a linked device: the Matrix account the phone gave, while it waits to be signed in to here by hand. */
export function matrixWaiting(given: GivenAccounts | undefined): GivenMatrix | null {
  return given?.matrix?.waited ? given.matrix : null;
}

/**
 * While the space is open: once its Matrix account is signed in to (by hand, as one the phone gave
 * waits for), the device takes what the phone gave for it. Returns how to stop.
 */
export function startLinkedAccounts(): () => void {
  let last = '';
  return onMatrixChange(() => {
    const state = matrixNow('space').state;
    const now = state ? `${state.userId} ${state.deviceId}` : '';
    if (now === last) return;
    last = now;
    if (!state) return;
    void spaceLinks()
      .then((links) => (links.accountsHere()?.left.matrix ? links.bringAccounts() : undefined))
      .catch(() => undefined);
  });
}
