# erevos-device

What a chat asks of the phone itself on Android that React Native does not give:

- `copyText(text)`: puts a message's words on the clipboard, for **Copy** in a
  message's menu. The copy is marked sensitive, so Android 13 and later show no
  preview of it in the notice that something was copied.

Used by `lib/clipboard.ts`. Plain Kotlin on the Android SDK, no other library.
