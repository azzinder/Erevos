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

Used by `lib/clipboard.ts` and `lib/place.ts`. Plain Kotlin on the Android SDK,
no other library.
