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
  sent it or what it says. One that Spam's built-in rule catches (`BuiltInSpam.kt`: a phone number in
  none of the contacts and never answered, a link, and words that try to fool) comes with none, while
  `setSpamFilter()` says the filter is on.
- **SMS invites.** Data SMS to port 16180, which messaging apps do not show. Pieces that come are
  kept in the app's preferences until `takeInvites()` takes them. The format is in
  `lib/sms-invite.ts`.
- **Encrypted messages by SMS.** On the same port, told from an invite by the first byte (`P`):
  pieces of end-to-end encrypted messages sent when nothing else works (`lib/sms-way.ts`, format in
  `lib/sms-packets.ts`). `sendPacket()` sends a message's pieces and says whether the phone sent
  them all; pieces that come are kept in the app's preferences (96 at most, 32 from one number, two
  hours) until `forgetPackets()` drops them, `smsPackets()` reads them, and `onSmsPacket` says one
  came. Nothing is logged, and nothing goes into the phone's SMS.
- **Deleting and sending again.** As the default app, `deleteThread()` deletes a conversation's SMS
  and MMS up to a time (the space's Trash, `lib/sms-folders.ts`), `deleteMessages()` single ones,
  and `resend()` sends one of ours that failed again, in place of the old row.
- **Blocked numbers.** `blocked()`, `block()` and `unblock()` use Android's own list
  (`BlockedNumberContract`), which only the default SMS app (or dialer) may read and change.
  Android then rejects those numbers' SMS, MMS and calls itself.
- **Backups.** `exportSms()` reads the phone's SMS and MMS into one byte array for Erevos's sealed
  backups (`SmsBackup.kt`, format there), with up to 32 MB of MMS pictures; it never touches a
  file. `importSms()` puts back each message the phone does not have yet, and deletes none.
- **Contact photos.** `contactCards()` gives the phone contacts' names with their thumbnail
  addresses (`content://`), shown as they are and kept nowhere.

## JS API

See `index.ts`.

## Not done

- MMS (pictures, group SMS).
- Contact names from the phone's address book: numbers show as they are.
- Dual SIM: the phone's default SIM sends.
- Google Play allows SMS permissions only to apps it approves, so Erevos with SMS ships outside
  Play.
