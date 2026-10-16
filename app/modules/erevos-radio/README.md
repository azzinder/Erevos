# erevos-radio

Expo native module for the phone radio. Android only. Written without an Android SDK,
so it has not been compiled yet. The first build is on two phones.

## What it does

- **Wi-Fi Aware (Android 12+)** carries data. Both phones publish and subscribe to the
  service name `erevos`. When a subscriber finds a publisher it sends KNOCK. The publisher
  opens a TCP server socket, requests a Wi-Fi Aware network on that port, and replies
  READY with the port. The subscriber requests the same kind of network and connects.
  Each socket then carries frames: a 4-byte big-endian length, then the payload. This is
  the layout in `crates/erevos-core/src/frame.rs`.
- **BLE** only signals presence. It advertises a custom service UUID and reports other
  phones that advertise it. It carries no identity and no messages.

## JS API

See `index.ts`: `radioStatus()`, `startRadio()`, `stopRadio()`, `sendText(linkId, text)`,
and `onRadioEvent(name, listener)` for `onStatus`, `onPeer` and `onText`.

## Not done

- Payloads are UTF-8 text for now. Binary frames for the mesh need base64 or a `Uint8Array` path.
- Nothing is encrypted at this layer. The service name `erevos` and the BLE UUID are visible
  to anyone nearby. Encrypted sessions come from the ratchet in `erevos-core`, not from here.
- If both phones knock at the same time, each side may open a second socket. Frames still
  arrive, but there is no de-duplication yet.
- No reconnect. A dropped link needs a new discovery.
