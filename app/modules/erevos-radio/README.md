# erevos-radio

Expo native module for the phone radio. Android only. Built and run on the test phones since
2026-10-16 (chat over BLE both ways); the same-Wi-Fi link, Wi-Fi Direct, the quiet mode and the
Meshtastic link have not run on a phone yet.

## What it does

- **Wi-Fi Aware (Android 12+)** carries data. Both phones publish and subscribe to the
  service name `erevos`. When a subscriber finds a publisher it sends KNOCK. The publisher
  opens a TCP server socket, requests a Wi-Fi Aware network on that port, and replies
  READY with the port. The subscriber requests the same kind of network and connects.
  Each socket then carries frames: a 4-byte big-endian length, then the payload. This is
  the layout in `crates/erevos-core/src/frame.rs`.
- **BLE GATT** carries data when Wi-Fi Aware is missing or does not start, as on two of the
  test phones. Each phone advertises the service UUID as connectable and puts a random nonce
  in its scan response, and in the advertisement too as manufacturer data under the test
  company id 0xFFFF. The phone with the lower nonce dials, so each pair opens one link.
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
- **Wi-Fi Direct** (`WifiDirectLink`, `startDirect` and `stopDirect`, Android 10+), on top of the
  same-Wi-Fi link: each phone says by Wi-Fi Direct service discovery (`_erevos._tcp`, TXT `n` =
  LanLink's nonce) that it is there. Of two not linked yet, the lower nonce makes a group with a
  random name (`DIRECT-ev-` and 6 hex) and passphrase (24 hex) and adds them to its TXT (`g`, `p`);
  the other joins with `WifiP2pConfig.Builder`, which shows no dialog. LanLink then finds the other
  on the group's interface. A group no one is in for 90 seconds, or joined with no link after 60,
  is removed, and that phone is left alone for 5 minutes. Only groups it made or joined are removed.
  Compiled with the Android classes; not run on a phone yet.
- **Quiet** (`setQuiet`), while Erevos is in the background: BLE advertises and scans at low power,
  and scans with a filter on the service UUID, as Android stops unfiltered scans with the screen
  off; the same Wi-Fi is announced every 15 seconds, and its multicast lock is held only 20 seconds
  in every 2 minutes, long enough to hear another quiet phone; Wi-Fi Direct looks every 10 minutes,
  not 30 seconds; Wi-Fi Aware, with no link or handshake under way, stays attached a minute, then
  rests 4 minutes out of it. Links that are up stay up. A Wi-Fi Aware network asked for is let go
  once its socket closes, or when it did not come within a minute.
- **A Meshtastic LoRa radio** (`MeshtasticLink`, `meshScan`, `meshConnect`, `meshDisconnect`,
  `meshSend`), over BLE as Meshtastic's own apps link to it: service
  `6ba1b218-15a8-461f-9fa8-5dcae273eafd`, ToRadio written, FromRadio read until it comes empty after
  each write and each FromNum notification (UUIDs from the firmware's `src/BluetoothCommon.h`). A
  radio not paired yet is paired first, with Android's dialog for its PIN. The bytes go to and from
  JS as base64 on `onMesh` events, and `lib/lora.ts` speaks the protocol (`lib/meshtastic.ts`).
  `android/lora-check/run.sh` compiles `MeshtasticLink` with the Android classes and checks the order
  of its Bluetooth operations (`MeshOps`); it passed on 2026-10-18. No radio was at hand to try it on.

## JS API

See `index.ts`: `radioStatus()`, `startRadio()`, `stopRadio()`, `startLan()`, `stopLan()`,
`hasDirect()`, `startDirect()`, `stopDirect()`, `setRadioQuiet(on)`,
`sendText(linkId, text)`, `hasMesh()`, `meshScan()`, `meshConnect(address)`, `meshDisconnect()`,
`meshSend(base64)`, and `onRadioEvent(name, listener)` for `onStatus`, `onPeer`, `onText` and
`onMesh`. The app uses them through `lib/radio.ts`, which also has the desktop app's same-Wi-Fi links.

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
