# erevos-radio

Expo native module for the phone radio. Android only. Built and run on the test phones since
2026-10-16 (chat over BLE both ways); the same-Wi-Fi link has not run on a phone yet.

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
- **The same Wi-Fi or a hotspot** (`LanLink`, `startLan` and `stopLan`), apart from the radio:
  each phone broadcasts `EVL1 <nonce> <port>` on UDP port 47905 every 3 seconds, the lower
  nonce connects over TCP (either does after 6 seconds without a link), and each side's first
  frame is `EVL1 <nonce>`. Then frames carry text, or `EVL1` alone every 3 seconds to say the link
  is still there; a link silent for 15 seconds closes. Link ids start with `lan-`. The desktop app
  speaks the same protocol (`desktop/lan.js`). Each socket goes on the Android network whose
  addresses hold the other's, as Android sends to a Wi-Fi without internet only when told to.
  `android/lan-check/run.sh` compiles `LanLink` with the Android classes and links it to
  `desktop/lan.js` on a computer, without a phone; it passed on 2026-10-18.

## JS API

See `index.ts`: `radioStatus()`, `startRadio()`, `stopRadio()`, `startLan()`, `stopLan()`,
`sendText(linkId, text)`, and `onRadioEvent(name, listener)` for `onStatus`, `onPeer` and `onText`.
The app uses them through `lib/radio.ts`, which also has the desktop app's same-Wi-Fi links.

## Not done

- Payloads are UTF-8 text. The chat sends end-to-end encrypted packets over it as base64 text
  frames that start with `EVN1:`, in pieces of 12 000 bytes, and packets other phones carry to
  a relay in frames that start with `EVC1:` (`lib/nearby.ts`). A `Uint8Array` path would save
  the base64.
- Nothing is encrypted at this layer, and it does not need to be: what goes over it is sealed by
  the ratchet in `erevos-core` already. The service name `erevos` and the BLE UUID are visible
  to anyone nearby, and so is when and how much two phones send.
- If both phones knock at the same time, each side may open a second socket. Frames still
  arrive, but there is no de-duplication yet.
- No reconnect. A dropped link needs a new discovery. A dropped BLE link is removed, and the
  next scan result dials again after 5 seconds.
- The Wi-Fi Aware path has only been checked on the Pixel 10 Pro, where it attaches and publishes.
  No text has crossed it between two phones yet.
- The BLE GATT path carried a text both ways between a Pixel 10 Pro (Android 17) and a phone on
  Android 16 on 2026-10-16. The Android 16 phone also keeps dialing a third address that never
  becomes ready. The cause is not known yet.
