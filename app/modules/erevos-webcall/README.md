# erevos-webcall

Element Call's window, for Matrix calls on Android (`lib/matrix-calls.ts`,
`lib/element-call-window.ts`). Element Call is Element's own call app, the one
Element X calls with; Erevos carries it, built, from its npm package
(`@element-hq/element-call-embedded`, pinned in `package.json`) and is its
host through the Matrix Widget API (`lib/matrix-widget.ts`).

- `ElementCallActivity`: the call's screen, a WebView in a task of its own.
  The page comes from the app's assets (`element-call/`, which `build.gradle`
  copies from `node_modules` at build time, leaving out the source maps, the
  background blur's model and WebAssembly, Matrix's encryption in WebAssembly,
  which a widget does not use, and the older fonts) under
  `https://appassets.androidplatform.net`, an address Android keeps for pages
  served by the app itself, so it is a secure page and nothing of it comes from
  the network. A script put first in its page hands Erevos what Element Call
  posts to its host; Erevos's answers are posted into the page. Its
  `config.json` is empty, so it reports to no one. Known trackers are refused.
  The camera and the microphone go only to this page, and only when Erevos has
  them. Back, or leaving for another app, puts the call in a small window
  (picture in picture); closing that window hangs up. It shows over the lock
  screen and keeps the screen on.
- `CallWindow`: the window that shows, and whom it tells what happens.
- `ErevosWebCallModule`: `open`, `post`, `devices`, `close`, and the events
  `onMessage`, `onAudioDevice`, `onClosed`.

Where the sound goes (earpiece or loudspeaker) is Erevos's, as for its own
calls (`modules/erevos-call`); Element Call shows the choice
(`controlledAudioDevices`).

The manifest also turns off Safe Browsing and WebView's metrics for the whole
app, so no web page in Erevos tells Google where it goes.

Plain Android, no other library.
