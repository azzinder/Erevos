// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Brought } from '../lock/devices-data';
import { loadMatrix } from '../lock/matrix-data';
import { loadNostrDm } from '../lock/nostr-dm-data';
import { hiddenHolder } from '../lock/sealed-file';
import { loadXmpp } from '../lock/xmpp-data';
import { canMatrix, canNostrChat, canXmpp } from './core';
import { handAccounts, placeLinksNow, spaceLinks } from './devices';
import { openHiddenPlace } from './hidden-contacts';
import type { GivenAccounts, GivenMatrix } from './link-wire';
import { loginToken } from './matrix-account';
import { matrixLetGo, matrixNow, matrixTake, onMatrixChange } from './matrix-store';
import { nostrDmLetGo, nostrDmPublicOf, nostrDmTake } from './nostr-dm-store';
import type { PlaceKey } from './place-lives';
import { xmppLetGo, xmppTake } from './xmpp-store';

// The space's own Matrix, XMPP and Nostr accounts, given by the phone to a device linked to it
// (lib/devices.ts, `accounts`; docs/linked-devices.md), once the codes match when that was chosen,
// or when asked again on the phone. A hidden place linked on its own gives its own accounts the
// same way, inside its own link, to the device's same place: read from the place's own value of
// each network's file and brought into it (lib/place-networks.ts runs them), never the space's.
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
// opens (a hidden place: each time its links start, lib/place-chats.ts), and a Matrix account waits
// for its sign-in. Once unlinked, the device lets go of what it brought, as it lets go of the
// chats: signed out as that device, or the key forgotten.

// The hidden place `pocket` opened with `key`, as the network stores run it; none for the space.
const placeOf = (key: Uint8Array, pocket: number | null): PlaceKey | undefined => (pocket === null ? undefined : { pocket, key });

async function give(space: number, key: Uint8Array, pocket: number | null): Promise<GivenAccounts> {
  const holder = pocket === null ? 'space' : hiddenHolder(pocket);
  const [matrix, xmpp, nostr] = await Promise.all([loadMatrix(space, key, holder).catch(() => null), loadXmpp(space, key, holder).catch(() => null), loadNostrDm(space, key, holder).catch(() => null)]);
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

async function take(space: number, key: Uint8Array, given: GivenAccounts, pocket: number | null): Promise<{ left: GivenAccounts; brought: Brought; problems: string[] }> {
  const place = placeOf(key, pocket);
  const left: GivenAccounts = {};
  const brought: Brought = {};
  const problems: string[] = [];
  const { xmpp, nostr, matrix } = given;
  // A build without the network keeps it, for one that has it.
  if (xmpp && !canXmpp()) left.xmpp = xmpp;
  else if (xmpp) {
    try {
      const done = await xmppTake(space, xmpp.jid, xmpp.password, xmpp.server, place);
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
      const done = await nostrDmTake(space, nostr, place);
      if (done === null) left.nostr = nostr;
      const publicKey = done === 'brought' ? await nostrDmPublicOf(space, place) : undefined;
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
      const done = await matrixTake(space, matrix, place);
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

async function letGo(space: number, key: Uint8Array, brought: Brought, pocket: number | null): Promise<void> {
  const place = placeOf(key, pocket);
  if (brought.xmpp && canXmpp()) await xmppLetGo(space, brought.xmpp, place).catch(() => undefined);
  if (brought.nostr && canNostrChat()) await nostrDmLetGo(space, brought.nostr, place).catch(() => undefined);
  if (brought.matrix && canMatrix()) await matrixLetGo(space, brought.matrix, place).catch(() => undefined);
}

handAccounts({ give, take, letGo });

/** On a linked device: the Matrix account the phone gave, while it waits to be signed in to here by hand. */
export function matrixWaiting(given: GivenAccounts | undefined): GivenMatrix | null {
  return given?.matrix?.waited ? given.matrix : null;
}

/**
 * While the space is open: once its Matrix account is signed in to (by hand, as one the phone gave
 * waits for), the device takes what the phone gave for it; and the same for the open hidden chats'
 * own account, in their own links. Returns how to stop.
 */
export function startLinkedAccounts(): () => void {
  let last = '';
  let lastPlace = '';
  return onMatrixChange(() => {
    const state = matrixNow('space').state;
    const now = state ? `${state.userId} ${state.deviceId}` : '';
    if (now !== last) {
      last = now;
      if (state) {
        void spaceLinks()
          .then((links) => (links.accountsHere()?.left.matrix ? links.bringAccounts() : undefined))
          .catch(() => undefined);
      }
    }
    const open = openHiddenPlace();
    const placeState = open ? matrixNow('place').state : null;
    const nowPlace = open && placeState ? `${open.space} ${open.pocket} ${placeState.userId} ${placeState.deviceId}` : '';
    if (nowPlace === lastPlace) return;
    lastPlace = nowPlace;
    const links = open && placeState ? placeLinksNow(open.space, open.pocket) : null;
    if (links?.accountsHere()?.left.matrix) void links.bringAccounts().catch(() => undefined);
  });
}
