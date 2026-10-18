# erevos-call

The phone's side of a call on Android that WebRTC (react-native-webrtc) leaves
to the app: the sound set up for talking, through the earpiece or the
loudspeaker, the screen off while the phone is at the ear, and kept on while a
call shows. `stop()` puts everything back.

Used by `lib/call.ts`. Plain Kotlin on the Android SDK, no other library.
