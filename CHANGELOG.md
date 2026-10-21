# Changelog

What each release changed, newest first, for whoever taps **Update**. After 0.1.16 comes 2.0.0.
Until then releases were numbered `0.1.<run of the release workflow>`, so some numbers have none:
0.1.1 went out only on the private repository, without an Android app, and 0.1.3, 0.1.9, 0.1.13
and 0.1.15 never came out.
No release so far has a macOS build. **Not audited.**

## Unreleased

On main, not released yet. The next release is **2.0.0**.

- **Newer keys every month**: each chat's account makes new prekeys (X25519 and ML-KEM-768) every
  30 days and gives them to its contacts inside their chats, whose Erevos starts a new conversation
  with them; keys older than the last three are thrown away. So a phone or backup taken later no
  longer opens, even with a quantum computer, what was said in conversations those keys started.
  The safety number stays the same, and contact links keep working. Contacts on 0.1.16 and before
  stay in the conversation they have.

- Linked devices make keys of their own, and the phone signs the list of them with the account's
  key, a first step towards linked devices that work with the phone off. Nothing changes yet in
  what they do; devices linked before need no linking again.

- Linked devices reach each other directly: with the phone off, each still shows what the others
  write, read, react to and change in contacts, and the contacts get it once the phone is back, as
  before. With a phone or device from before, everything goes through the phone as now.

- **Group keys made new every week**: in every group, private or public, the admin's phone makes
  its own keys new, and each member's phone asks the admin to put it in anew with new ones. So keys
  taken from a phone once stop reading the group within a week. Members see no one leave or join.
  An admin on 0.1.16 and before does not do it, and its members stay as before.

- **Stickers in sets, that move, and your own**: 48 built-in stickers in five sets (Moons, Animals,
  Celebrations, Words and Treats). The moons, animals and celebrations move a little for a few
  seconds as they come and when tapped, then rest, and stay still with the phone's reduce motion
  setting; the words show in the app's language. Each phone draws them, and only a sticker's name
  travels. **Mine** holds stickers made from a photo: cut square, 512 by 512 and about 100 KB at
  most, with nothing but the picture, kept sealed in the space or the hidden chats they were made
  in, up to 100. They go end-to-end encrypted as photos do, marked as stickers, in chats and
  groups; an Erevos from before shows them as photos. **Add to my stickers** keeps one you were sent.

- **Android updates need the release computer's signature**: Check for updates installs an APK
  only once `deploy/web/publish.sh` on the release computer has signed its build and SHA-256 with
  the web app's offline key (`android-update.json`, served beside the web app). Until then it says
  the version is out but not signed yet. Whoever took over the GitHub account alone can no longer
  get an APK installed this way.

- **Builds**: every GitHub action the workflows use is pinned to a commit (its version in a
  comment), so a moved tag in an action's repository cannot change what runs beside the signing key.
  Each build checks the locked Rust crates (`cargo audit`, with what passes and why in
  `.cargo/audit.toml`) and the app's packages (`npm audit`, failing on a critical one) for known
  advisories. Updated for them: rustls-webpki and webpki-roots (the relay's and Tor's TLS),
  ml-kem 0.3.3 and fflate 0.8.3.

- **An F-Droid build** (`EREVOS_DISTRIBUTION=fdroid`): F-Droid updates it, so its Updates screen
  says so and has no Check for updates, and it may not install packages. The release APK keeps
  both. No build's manifest names Google Play services any more: expo-image-picker's hint to
  Google Play, to install its photo picker on Android 10 and older, is left out.

- **Permissions** (Android, menu → Permissions): what Android lets Erevos do for calls and messages
  in the background (notices, the call notice, calls over the lock screen, battery saving, Data
  Saver, the microphone) and for other things (camera, phones nearby, contacts, exact times), each
  with why and a button for Android's own question or setting. On Huawei, Honor, Xiaomi, OPPO,
  realme, OnePlus, vivo, Samsung and ASUS it also says where the maker's own background setting is,
  and opens it. After each new version, and the first time, it opens by itself when calls need
  something. Also under Lock and second password → In the background → All permissions.

- **Serbo-Croatian** (Srpskohrvatski): the whole app, in Latin letters and ijekavian, in words
  understood alike in Croatia, Bosnia and Herzegovina, Montenegro and Serbia. A phone in Serbian,
  Croatian, Bosnian or Montenegrin starts in it. A count takes the form its last digits ask for
  (1 kontakt, 2 kontakta, 5 kontakata, 21 kontakt), and dates are written as in Bosnia unless the
  phone itself writes Croatian, Bosnian or Serbian in Latin letters. The user guide shows in
  English, and Android's notices too, as in the other languages besides Greek.

- **Version numbers**: the next release is 2.0.0, and each one after it the next number (2.0.1,
  2.0.2…) unless it is given one when started (Actions, release, Run workflow, version). Every
  release still has its own build number, the run's, so Android installs it over the one before.
  Updates → Check for updates in 0.1.16 and before offers 2.0.0 as **0.1.<build>** (the only kind
  of number they read); it is 2.0.0 all the same, and shows as 2.0.0 once installed.

- **Relay**: closes connections left quiet for 5 minutes or slow in their handshake, and takes at
  most 512 at once (128 without a token). `FORWARD` and `FILE_VIA` refuse addresses that are not
  on the public internet, unless `EREVOS_RELAY_PRIVATE_PEERS=allow`. At most 100,000 queues, and
  queues no one has read for 180 days are removed. A relay that panics while holding a lock stops,
  for its service manager to start it again. Its journal changes shape: an older relay no longer
  reads it. See [deploy/relay/README.md](deploy/relay/README.md).
- **A token for each phone** (relay): `erevos-relay new-token NAME` makes one, and the relay keeps
  only its hash in the file `EREVOS_RELAY_TOKENS` names, beside its one token. Deleting a phone's
  line takes its access back, from the next connection on, without touching the others.
- **Lent places** are off unless the relay's operator turns them on (`EREVOS_RELAY_LEND=on`). A
  lent place may put 50 MB of files a day, its counts last across restarts, and the operator can
  revoke a ticket in a file. Lent tokens are longer, so those given before stop working. In the
  app, a ticket goes into a contact link only when you turn on **Share a place on my relay with
  this link**, for the link shown then.
- **After a backup is restored**, each chat skips ahead past the sending keys used since the
  backup, so no message key is used twice.
- **No link starts a call** any more: a call starts only from a tap inside Erevos.
- **Screen privacy** (Android): while hidden chats are open, and while a space with a password lock
  is open unless turned off, Erevos stays out of screenshots and of the recent-apps preview.
- Hidden chats' contact names no longer show on the call screen or in call notices.
- **Backup passwords** need at least 12 characters.
- **Argon2id** after PBKDF2 for passwords, PINs and backups, so each guess costs memory as well as
  time. The lock's slots and hidden chats' PINs get it at the next start, without their passwords;
  automatic backups at their next run. Backups made from now on open only in this version or later.
- **Stored sizes**: every space's and hidden chats' value in a sealed file is the same size, used or
  not; what is larger goes to pages among the history's.
- **Messages sealed for the relay**: once each phone has had a message from the other, every
  message in a chat is sealed once more for the phone it goes to, so the relay can no longer tell
  from them which conversation they belong to, and the phone opens each in one chat only instead of
  trying it in all. An older Erevos does not seal, and its messages are read as before.
- An old first message a relay sends again is refused however many new contacts came since.
- A group's keeper cannot leave or take itself out, and hands the group only to a member who stays.
- An MMS with a length past its end is refused at once. A new fingerprint key opens only while the
  phone is unlocked.
- **The desktop app on Linux with no keyring** keeps no keys, and says how to start one, unless
  started with `--plain-secrets`; then it keeps them as before, readable by your user.
- The guide says at the top of SMS that Erevos does not encrypt SMS and MMS.
- **Carrying messages for phones nearby** is off unless turned on, and then goes only to relays on
  the internet over TLS (`wss://`).
- A README that matches the code, this changelog, and a threat model (`docs/threat-model.md`).
- **The keyboard** no longer covers the end of the list while you search the chats on the home
  screen or the contacts: the list ends above it, and **New chat**, **New contact** and Undo
  float above it, as Undo now does in an SMS conversation too. The fields in a chat's details
  scroll above it. The Phone opened while Erevos is locked, and the password and error screens,
  start below the status bar, as the other screens do.

## 0.1.16 (2026-10-20)

- Imported Telegram and WhatsApp chats bring their photos, videos, voice messages and files, up to
  1 GB each. An export larger than the phone's memory can be read.
- A phone with no relay of its own can chat over the internet through a place lent on its
  contact's relay. That relay must run this version.
- Adding a link whose relay gives no place adds the contact for nearby use, instead of refusing it.

## 0.1.14 (2026-10-20)

- Hidden chats: a chat's Details has **Move back to my chats**.
- Erevos keeps receiving messages and ringing for calls after you swipe it away from the recent
  apps.
- The Phone and Contacts icons open the keypad and the contacts every time.

## 0.1.12 (2026-10-20)

- Hidden chats can say that a message came (**Say when a message comes**, Android), with the same
  "New message" notice as other chats.
- The home menu no longer goes under the status bar.
- Reading a QR code from a photo works again.
- No more Bluetooth crashes on Android 17, and a Bluetooth scan Android refuses starts again later.
- Long lists no longer close Erevos on Android.

## 0.1.11 (2026-10-20)

- The Phone can open without the password, if you allow it in the phone settings.
- Recents show at once.
- A home-screen widget: Phone, SMS, Messages and Contacts, with how many are new.
- The chat list can show only SMS or only Erevos chats.
- **Names** above the list shows contact names on SMS, also of contacts kept only in Erevos. Off
  unless turned on.

## 0.1.10 (2026-10-20)

- A link Erevos opens with (the Phone and Contacts icons, `tel:` links, an SMS notice, a scanned
  code) waits for the password and then opens, instead of being lost.
- Phone and Contacts have their own icons, and buttons on the home screen.
- A contact can have an Erevos ID: paste their contact link or read their QR code from a photo.
- **Add to contacts** for a number that is no contact, from its SMS or its calls.

## 0.1.8 (2026-10-19)

- German, French, Spanish, Italian and Portuguese.
- **Linked devices**: link a computer or a browser to the phone by QR code.
- **Public groups**, joined by a link or QR code, with admins.
- Messages: replies, reactions, pins, stars, polls, stickers, sending a place, forwarding, search
  in a chat and in all chats, exporting a chat, and "typing…".
- Link previews, off unless turned on. Links in chats and SMS can be tapped, and ask before they
  open.
- **Send later**, held on the relay (it needs an updated relay), and SMS later.
- Photos, files and voice messages in group chats, and the same message menu there.
- Erevos can be the phone app (its own call screen, two SIMs, Recents with filters, blocking) and
  the contacts app (groups, birthdays, duplicates, `.vcf` files, the SIM card, contacts kept only in
  Erevos).
- SMS: drafts, a few seconds to take one back, sending again, forwarding, pin, archive, Trash, a
  spam filter and blocked numbers.
- Tor bridges (obfs4, Snowflake, or your own).
- Fingerprint or face unlock on Android, off unless turned on.
- Material You style on Android 12 and later.
- Windows: an installer and a portable `.exe`.
- Backups can hold the phone's SMS and MMS. A backup from a newer Erevos opens, leaving out what
  this one does not know.

## 0.1.7 (2026-10-19)

- SMS notices while Erevos runs in the background, and **Allow notifications** when Android holds
  them back.
- No crash when a phone knocks over Wi-Fi Aware on Android 17.

## 0.1.6 (2026-10-19)

- Nothing new on the phone. The web app is now built with every release, at the same version, and
  signed on the release computer.

## 0.1.5 (2026-10-19)

- The whole app in English or Greek: Home → Menu → Language. The first start follows the phone's
  language.
- SMS: Android now counts Erevos as the SMS app, and Erevos says how to choose it in Default apps.

## 0.1.4 (2026-10-19)

- Web app: notifications while it is closed, through Web Push, off unless turned on.
- **Check for updates** works on a computer and on Sailfish OS.
- Linux: the icon shows in the launcher and the task bar.
- SMS: Erevos says when Android holds back reading the SMS and how to allow it, and one MMS it
  cannot read no longer empties the list.
- Typing a relay address no longer closes Erevos.

## 0.1.2 (2026-10-19)

The first release with a signed Android app in the public download repository, and the first that
**Check for updates** finds. Packages: Android, Linux and Sailfish OS. It had:

- 1:1 chats through a relay, end-to-end encrypted (PQXDH, then the double ratchet), with marks for
  sent, came and read, online status, appearing offline, and message requests.
- Voice messages, photos and files, voice and video calls, a walkie-talkie, and calls without
  internet on the same Wi-Fi.
- Group chats (MLS), group voice and video calls.
- Disappearing messages.
- A second password for a second space, and hidden chats: four places per space, each with its own
  PIN.
- Backups, by hand and automatic.
- Imports of Telegram and WhatsApp chats (text only).
- Nearby without internet: Bluetooth, Wi-Fi Aware, the same Wi-Fi, Wi-Fi Direct and LoRa, with
  messages carried by phones nearby.
- Tor on Android, a second relay to send through, and a spare relay.
- Receiving and ringing in the background on Android.
- Erevos as the phone's SMS app, with MMS and two SIMs.
- The desktop app, the web app and Sailfish OS, built from the same code.
- A user guide in English and Greek. The app itself was in English.
