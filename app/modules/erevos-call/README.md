# erevos-call

The phone's side of a call on Android that WebRTC (react-native-webrtc) leaves
to the app: the sound set up for talking, through the earpiece or the
loudspeaker, the screen off while the phone is at the ear, and kept on while a
call shows. `stop()` puts everything back.

It also lets a call ring while Erevos is in the background, since Erevos uses no
push service:

- `ReceiveService`: a foreground service that keeps Erevos running while a space
  is open, so it goes on waiting at the relay and on the links to phones nearby
  (a `connectedDevice` service too, from Android 14). Android requires a notice
  for it; it says only "Erevos" and shows nothing on the lock screen. With it runs a
  React Native background task (`ErevosReceive`, registered in
  `lib/background.ts`), since React Native stops the app's timers in the
  background otherwise.
- `ring()`: the phone's ringtone, and the call notice (`Notices`), shown over
  the lock screen with a full-screen intent. It names no one: "Incoming call" or
  "Incoming video call".
- `tellMessages(count, quiet)`, `clearMessages()`: the notice that messages came
  while Erevos was in the background. It says only "New message" or how many, and
  on a locked phone only "Erevos". While only messages sent without sound came
  (`quiet`), it shows on a channel that never sounds or vibrates.
- `backgroundState()`, `askBattery()`, `askFullScreen()`: what Android allows,
  and its own screens to change that.

Used by `components/call-host.tsx` and `lib/background.ts`. Plain Kotlin on the
Android SDK and React Native's own background tasks, no other library.
