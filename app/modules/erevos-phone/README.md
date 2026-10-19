# erevos-phone

Expo native module for the phone's calls. Android only. Written without an Android SDK: it has
been compile-checked against Android 16's framework classes, not built or run.

## What it does

- **Phone app.** The manifest has what Android asks before it lets an app be the phone app
  (`RoleManager.ROLE_DIALER`): an `InCallService` with `IN_CALL_SERVICE_UI` (`CallService`) and an
  activity for `DIAL` and `tel:` (`DialActivity`, which opens the app's Phone screen,
  `erevos://phone`). `requestDefault()` shows Android's question.
- **Call screen.** `CallActivity`, built in code: who calls with the contact's photo, Answer and
  Decline, Hold and answer for a second call, Mute, the keypad's tones, where the sound goes
  (earpiece, loudspeaker, Bluetooth, headset: call endpoints from Android 14, `CallAudioState`
  before), Hold, Add call, Merge, Swap, End. It shows over the lock screen and works with the app
  locked: it is its own task. The screen goes off at the ear.
- **Decline with a message.** Message on a call that rings offers the quick replies (`Replies`, the
  module's own preferences, set with `setQuickReplies()`) or one written then, and declines with
  `Call.reject(true, text)`: Telecom sends the SMS itself (its `RespondViaSmsManager`, through
  `SmsManager`), which writes it to the phone's SMS. The SMS app's `RespondViaSmsService` is not used.
- **Blocking.** `ScreeningService`, a `CallScreeningService` Telecom asks before a call rings once
  Erevos holds the call screening role too (`requestScreening()`), turns away the calls `Rules`
  blocks: prefixes, after the + or as the phone's country writes numbers (matched through
  `PhoneNumberUtils.formatNumberToE164`), never for a number in the phone's contacts. Holding both
  roles, Telecom asks it about the contacts' calls too. A call it did not see is ended by
  `CallService` once it rings. The rules are JSON from `lib/phone-rules.ts` (`setRules()`), in the
  module's preferences: the same for every space, only prefixes.
- **Notices.** `CallNotices`: a call that rings, with Answer and Decline and a full-screen intent,
  and one while a call is on, with End. Telecom rings itself, with each contact's own ringtone.
  Missed calls are Telecom's own notice.
- **Calls.** `placeCall(number, account)` on a SIM (`PhoneAccountHandle`), `accounts()` lists them.
- **Names.** The phone's contacts (`PhoneLookup`), and `setKnownNames()`: names the app knows while
  a space is open, in memory only; `forgetKnownNamesAfter()` lets them go when the space would lock.
- **History.** `History`: `history()` reads Android's call history (`CallLog.Calls`, with
  `FEATURES` for Wi-Fi calling and HD voice and `PHONE_ACCOUNT_ID` for the SIM), `favourites()` the
  starred contacts with their numbers, `seenMissed()` takes away Telecom's missed-call notice. An
  `onHistory` event follows changes to either. Nothing of it is kept.

## JS API

See `index.ts`.
