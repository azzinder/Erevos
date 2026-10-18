# erevos-sms

Expo native module for the phone's SMS. Android only. Written without an Android SDK, so it has
not been compiled yet.

## What it does

- **Default SMS app.** The manifest has the four parts Android asks for before it lets an app be
  the SMS app: an `SMS_DELIVER` receiver, a `WAP_PUSH_DELIVER` receiver (MMS are not handled yet),
  a `RESPOND_VIA_MESSAGE` service, and an activity for `sms:`/`smsto:` links. `requestDefault()`
  shows Android's question (`RoleManager.ROLE_SMS` on Android 10+).
- **SMS store.** As the default app, Erevos writes what comes and what it sends into Android's SMS
  provider, as every SMS app does, so another SMS app finds them later. `threads()` and
  `messages()` read it.
- **Notifications.** A text that comes while the app is closed shows "New message", without who
  sent it or what it says.
- **SMS invites.** Data SMS to port 16180, which messaging apps do not show. Pieces that come are
  kept in the app's preferences until `takeInvites()` takes them. The format is in
  `lib/sms-invite.ts`.

## JS API

See `index.ts`.

## Not done

- MMS (pictures, group SMS).
- Contact names from the phone's address book: numbers show as they are.
- Dual SIM: the phone's default SIM sends.
- Google Play allows SMS permissions only to apps it approves, so Erevos with SMS ships outside
  Play.
