# erevos-device

What a chat asks of the phone itself on Android that React Native does not give:

- `copyText(text)`: puts a message's words on the clipboard, for **Copy** in a
  message's menu. The copy is marked sensitive, so Android 13 and later show no
  preview of it in the notice that something was copied.
- `findPlace()` and the `onPlace` event: where the phone is, once, for a place
  sent from a chat. By satellite when Erevos may use the precise location and it
  is on, otherwise by the phone's network location. It waits 30 seconds at most,
  and takes a place the phone found in the last minute at once. Nothing follows
  the phone after. The location permission is declared here with
  `uses-permission-sdk-23`, so it does not clash with erevos-radio's, which is
  limited to Android 12 and older.
- `remind(id, at)` and `forgetReminder(id)`: the reminders of Chat with myself
  (`Reminders.kt`). Android itself tells each at its time, with Erevos closed and
  every space locked, in a notice that says only that a reminder came: just the
  id and the time are kept here, what it reminds of stays encrypted in its space.
  The alarm is set again when the phone starts, the app is updated or the time
  changes.

Used by `lib/clipboard.ts`, `lib/place.ts` and `lib/myself.ts`. Plain Kotlin on the Android SDK,
no other library.
