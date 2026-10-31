// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { RELOCK_MS } from '../lock/chat-pin';

// Hidden chats close once Erevos was in the background more than RELOCK_MS, as a chat's own PIN
// locks again (app/chat.tsx): by a timer while it is away, which runs while Erevos receives in the
// background, so a call to them meanwhile rings as for closed hidden chats, with their PIN to
// answer; or as it comes back, when that timer could not run. Not during a call, which keeps them
// open until it ends, nor while a photo or a file is picked for them (lib/picking.ts).

export type HiddenAwayWays = {
  /** Calls the listener with each change of the app's state ('active', 'background', …). Returns how to stop. */
  onAppState: (listener: (state: string) => void) => () => void;
  /** Calls the listener as a call, or a group call, starts or ends. Returns how to stop. */
  onCallChange: (listener: () => void) => () => void;
  inCall: () => boolean;
  picking: () => boolean;
  now?: () => number;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
};

/** Closes the hidden chats (`close`) as said, once each time Erevos is away. Returns how to stop. */
export function watchHiddenAway(close: () => void, ways: HiddenAwayWays): () => void {
  const now = ways.now ?? Date.now;
  const setTimer = ways.setTimer ?? ((run: () => void, ms: number) => setTimeout(run, ms));
  const clearTimer = ways.clearTimer ?? ((timer: unknown) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  let away = 0;
  let timer: unknown = null;
  let afterCall = false;
  let closed = false;
  const stopTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  const shut = () => {
    if (closed) return;
    closed = true;
    close();
  };
  const due = () => {
    timer = null;
    if (ways.picking()) return;
    if (ways.inCall()) afterCall = true;
    else shut();
  };
  const stopState = ways.onAppState((state) => {
    if (state === 'background' && !away) {
      away = now();
      closed = false;
      stopTimer();
      timer = setTimer(due, RELOCK_MS);
    } else if (state === 'active' && away) {
      stopTimer();
      if (now() - away > RELOCK_MS) due();
      away = 0;
    }
  });
  const stopCall = ways.onCallChange(() => {
    if (!afterCall || ways.inCall()) return;
    afterCall = false;
    shut();
  });
  return () => {
    stopState();
    stopCall();
    stopTimer();
  };
}
