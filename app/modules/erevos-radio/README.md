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
- **BLE GATT** carries data when Wi-Fi Aware is missing or does not start, as on two of the
  test phones. Each phone advertises the service UUID as connectable and puts a random nonce
  in its scan response. The phone with the lower nonce dials, so each pair opens one link.
  The dialer writes frames to the RX characteristic. The other phone sends them back as TX
  notifications. Frames keep the same 4-byte length layout, cut into MTU-sized chunks, with
  one write or notification in flight at a time. Link ids start with `ble-link-`.
- **BLE presence** advertises the service UUID and reports other phones that advertise it.
  The nonce is random for each start, so it does not identify a person or a phone for long.

## JS API

See `index.ts`: `radioStatus()`, `startRadio()`, `stopRadio()`, `sendText(linkId, text)`,
and `onRadioEvent(name, listener)` for `onStatus`, `onPeer` and `onText`.

## Not done

- Payloads are UTF-8 text for now. Binary frames for the mesh need base64 or a `Uint8Array` path.
- Nothing is encrypted at this layer. The service name `erevos` and the BLE UUID are visible
  to anyone nearby. Encrypted sessions come from the ratchet in `erevos-core`, not from here.
- If both phones knock at the same time, each side may open a second socket. Frames still
  arrive, but there is no de-duplication yet.
- No reconnect. A dropped link needs a new discovery. A dropped BLE link is removed, and the
  next scan result dials again after 5 seconds.
- The Wi-Fi Aware path has only been checked on the Pixel 10 Pro. The BLE GATT path is new and
  not yet tested on two phones.
