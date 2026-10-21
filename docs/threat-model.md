# Threat model

Who Erevos tries to protect you from, and what each of them still learns. **Not audited**: this
page says what the code is meant to do, not what anyone has checked.

A *space* is what one password opens. A *second space* is what another password opens. *Hidden
chats* are the four places inside each space that open with a PIN typed into the home screen's
search.

| Who | Content | Who talks to whom | When | That you have a second space | Hidden chats |
| --- | --- | --- | --- | --- | --- |
| **Relay operator**, you and the contact on that one relay | No. It sees sizes: four message sizes, and how many file chunks of which size. Once both phones have had a message from each other, each packet is sealed once more for the phone it goes to, so it cannot tell from them which messages in your queue belong to one conversation; a conversation's first messages still show it. | Yes. It sees the IP addresses that write into your queue and yours reading it. With its call relay, both phones' addresses in each call. | Yes: when messages come, when they are taken, when your phone waits. | Likely. Each space has its own queues on the relay, read from the same IP address. Not if that space uses another relay or Tor. | Likely, if they use that relay too: a place's queue is read from the same IP address while it is open. With "say when a message comes" on, its queue is watched beside queues no one writes to, and only the real ones get messages. |
| **Relay operators**, when the two sides use different relays, or you use Tor | No, as above. | Less. Your relay sees your address and which relay you send to, not the queue. The contact's relay sees the queue and your relay, not your address. Through Tor, a relay sees a Tor exit. Two operators who compare logs can match by time. | Yes, each for what passes through it. | The IP address no longer ties it, if it uses another relay or Tor. Times still may. | As for a second space. |
| **Holder of your contact link** | No. | Your relay's address and key, your queue's sender id, your public keys, and your spare relay if you have one. They can write to your queue: a message from them waits as a request and gets nothing back, not even a delivery mark, until you accept it. | Nothing until you accept, only whether your queue still takes messages. | No: it has its own keys and queues. | No: they have their own keys and queues. |
| **A contact** | What you send them. Disappearing messages and deleting on both phones rely on their Erevos; nothing stops a changed app, or a photo of the screen. | What your link holds, as above. Without a call relay, your IP address in a call. | When you got and read their messages, when Erevos is open, and when you type. A chat set to appear offline says nothing of typing, shows it open only when you write, and holds the marks until then. | No. | No. |
| **Someone holding your unlocked phone**, with Erevos open | Yes, for the open space. Also Android's SMS, call log and contacts, which Erevos does not seal. | Yes, for the open space. | Yes, for the open space. | Not from the app. Wrong passwords at the lock screen make the next try wait, up to an hour. | Not from the app. Searches are tried as PINs and wrong ones are counted apart. A "New message" notice with nothing new may hint at them. |
| **Forensic access with root**, no password | Sealed. But a space with no password lock has its key in the keystore. With the keystore read, every password and PIN can be guessed offline, with no wait: each guess costs a PBKDF2-SHA256 of 200,000 rounds and an Argon2id of 32 MiB and 3 passes. A short PIN still falls: a 4-digit one is 10,000 guesses. | As for content. File sizes show roughly how much is kept. | As for content. | Not from what is stored: unused slots look like used ones, and every space's sealed values are the same size, with what is larger in pages among the history's. Values an older version kept stay their size until next saved. Yes once its password is guessed, or if the lock was turned off inside the second space, which the lock settings then say unsealed. | As for a second space. PINs may be as short as 4 characters. |
| **Whoever finds a backup file** | It needs the backup password (PBKDF2-SHA256, 200,000 rounds, then Argon2id, 32 MiB and 3 passes; at least 12 characters). A backup made before Argon2id has PBKDF2 only. Inside, each space is still sealed with its own password, except a space with no password lock, which the backup password alone opens. Photos and files sent in chats are not in backups. | As for content. | Its first bytes say it is an Erevos backup, and its size shows roughly how much. | Not from the file: every slot is in it, used or not. Yes once its password is guessed. | As for a second space. |
| **Someone nearby**, on Bluetooth or the same Wi-Fi | No. Until your contact's phone is known on a link, your short messages go, sealed, to every Erevos phone linked nearby. | Which phones nearby link and exchange data. That Erevos runs (see below). A message carried for you shows only the relay it goes to. | Yes: when, and how much. | No: the links are the phone's, and nothing on them names a space. | No: hidden chats never use the nearby links. |
| **A fellow group member** | What is said in the group, which they can copy. | Every member, with its relay address and queue sender id, the same as in its contact link; in a private group also its identity key from its chats. So these tie you across groups and to your link. Who is in a group call; without a call relay, their IP addresses. | When you write in the group, and when you join a call. | No: groups belong to one space. | No. |
| **Push providers** (Apple, Google, Mozilla), web app only, when notifications while closed are on | No: the push is empty. | No. They see that a browser gets pushes from your relay. | Yes: that something came, and when (at most one push per queue every 15 seconds). | No. | No: hidden chats never use pushes. |

Notes:

- **Nearby, Erevos shows that it runs.** Whenever a space is open on Android, in the background
  too, the Bluetooth beacon advertises a fixed service UUID (`6e8f0c1a-3b5d-4f2e-9a7c-5d1e0b2f8a41`),
  Wi-Fi Aware publishes the service `erevos`, the same Wi-Fi gets UDP broadcasts `EVL1 …` on port
  47905, and Wi-Fi Direct announces `_erevos._tcp`. The nonce in them is new at each start. A LoRa
  radio can be heard kilometres away, and its signal traced.
- **The Android app uses no push service.** It waits at the relay itself.
- **Tor** is on Android only, per space, and carries only relay connections. Calls, through the
  call relay or direct, never go through Tor. Link previews are not made while Tor is on, and the
  update check refuses to run.
- **Post-quantum, and a phone taken.** A chat starts with PQXDH, whose ML-KEM-768 half holds against
  a future quantum computer only while the ML-KEM secret it used stays secret. The contact link's
  is kept for as long as the account, so whoever takes the phone (or a backup) and has such a
  computer could open the conversations started with the link. Erevos makes newer prekeys every 30
  days, gives them to each contact in their chat, and the contact's Erevos starts a new conversation
  with them; secrets older than the last three are thrown away. So, against that adversary, a chat
  is open only in the conversation started with the link (until the first renewal, usually the
  first answer) and in those started with prekeys still kept, or kept in a backup made then. Contacts on an older Erevos
  never move. Groups are not post-quantum at all.
- **Group keys taken once** read the group until that phone's keys are next made new: within a
  week (lib/groups.ts `RENEW_EVERY`) for the keeper, and for a member whose keeper's Erevos does it
  too (2.0.0 and later), as both phones are on. A member's renewal is the keeper taking its leaf
  out and putting a key package of its own in, so the keeper decides when it happens; a member
  whose keeper never does it stays as before.
- **One queue per space.** Every contact of a space writes to the same queue, so one relay sees all
  of them arrive there.
- **Linked devices' own keys** (docs/multi-device.md). Each linked computer makes a key of its own,
  never the account's secret, and the phone signs the list of them with the account's identity key.
  A computer takes that list only as checked against the account's bundle that came in its link,
  whose safety code was compared, and only if that bundle names the account the phone said there.
  Whoever can use the account's key, with the phone open or with its backup and password, can sign
  a list naming a key of their own. The list always has four places, those no device takes holding
  keys whose secrets are thrown away, so it does not show how many devices there are; only the
  phone and its devices know which are which. In this version only the account's own devices are
  given the list, and no contact writes to a key in it. A key the phone names to its devices as one
  of theirs, in their links and with where it reads, gets from each of them, in a conversation of
  their own, what it writes to contacts and the changes it makes to them. Naming one so takes the
  account's key and the links both, which whoever holds the open phone already has; the account's
  key alone, from a backup, does not. Packets between devices, and on a device's link to the
  phone, are sealed once more for the relay after a conversation's first, as between contacts; the
  relay still sees which queues write to which, the devices' to each other too.

## Out of scope

- **Process memory.** While a space is open, its key and the conversations' secrets are in the
  app's JavaScript memory between core calls. The Rust core keeps nothing between calls, and
  JavaScript cannot reliably wipe memory. Whoever can read the app's memory reads them.
- **A compromised operating system**, or an app with the rights to read the screen or other apps'
  memory.
- **A compromise of the GitHub account, for Android updates, in part.** The APK signing key is a
  GitHub Actions secret, and `version.json`, whose size and SHA-256 the app checks, is published by
  the same workflow. Check for updates also needs the release computer's signature, with the web
  app's key kept offline, of the release's build and APK SHA-256 (`app/lib/update-signature.ts`),
  so GitHub alone cannot get an APK installed that way. Whoever controls the account can still
  publish an APK that Android installs over Erevos by hand, from the releases page, and the release
  computer signs what GitHub built: it checks it is the release's, not how it was built. The web app
  is signed with the same offline key (see `pwa/README.md`). The workflows' actions are pinned to commits, so a tag
  moved by an action's own repository cannot change what runs with the signing key; they are
  updated by hand.
- **Traffic analysis by a global observer** who sees both ends. Erevos sends no cover traffic and
  adds no delays, so messages can be matched by time and size.
