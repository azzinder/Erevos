# Threat model

Who Erevos tries to protect you from, and what each of them still learns. **Not audited**: this
page says what the code is meant to do, not what anyone has checked.

A *space* is what one password opens. A *second space* is what another password opens. *Hidden
chats* are the four places inside each space that open with a PIN typed into the home screen's
search.

| Who | Content | Who talks to whom | When | That you have a second space | Hidden chats |
| --- | --- | --- | --- | --- | --- |
| **Relay operator**, you and the contact on that one relay | No. It sees sizes: four message sizes, and how many file chunks of which size. It sees which packets the sending phone marked as a message someone reads and which as word between phones (that a message came or was read, new keys), so that a web app's notice can count messages; and a call that rings as a call, so it also sees when a call starts. Once both phones have had a message from each other, each packet is sealed once more for the phone it goes to, so its bytes do not tell which messages belong to one conversation; a conversation's first messages still show it. But each contact you kept writes to a queue of their own (see below), so it sees how much and when each of them writes, apart from the others, though not what they say nor, beyond the address that writes, who they are, with Tor or without. What contacts on this version write to your linked devices, and to the places that fill your list, is sealed alike, each contact with keys of its own, so a relay that works with one of your contacts opens only that contact's. | Yes. It sees the IP addresses that write into your queue and yours reading it. With its call relay, both phones' addresses in each call. | Yes: when messages come, when they are taken, when your phone waits. | Likely. Each space has its own queues on the relay, read from the same IP address. Not if that space uses another relay or Tor. | Likely, if they use that relay too: a place's queue is read from the same IP address while it is open, and, with "receive while closed" on, whenever its space is open, as the space's queues are. With "say when a message comes" on, its queue is watched beside queues no one writes to, and only the real ones get messages. |
| **Relay operators**, when the two sides use different relays, or you use Tor | No, as above. | Less. Your relay sees your address and which relay you send to, not the queue. The contact's relay sees the queue and your relay, not your address. Through Tor, a relay sees a Tor exit. Two operators who compare logs can match by time. | Yes, each for what passes through it. | The IP address no longer ties it, if it uses another relay or Tor. Times still may. | As for a second space. |
| **Someone in between** your phone and its relay: a network, or whoever gets a certificate for the relay's name | No. | Once the relay has proved its own key to this phone, nothing more than any network sees: that you connect, when, and how much. Before that, or for a relay of 3.3.2 or earlier, whoever shows a valid certificate for its name sees what the relay sees, the token too. | When you connect, and how much. | As the network. | As the network. |
| **Holder of your contact link** | No. | Your relay's address and key, the sender id of the queue the link names, your public keys, and your spare relay if you have one. They can write to that queue: a message from them waits as a request and gets nothing back, not even a delivery mark, until you accept it. From the first time you delete or block a contact, your contacts write to a queue of their own that the link does not name, which moves again with each deletion or block; the link's moves only with **New contact link**, or when junk fills it, and the one before keeps working 14 days, or when the relay lost it, and then the one before works no more. | Nothing until you accept, only whether your queue still takes messages. | No: it has its own keys and queues. | No: they have their own keys and queues. |
| **A contact** | What you send them. Disappearing messages and deleting on both phones rely on their Erevos; nothing stops a changed app, or a photo of the screen. | What your link holds, as above, and the queue you read on, which each of your messages says. Once you delete or block them, your queue moves and every other contact is told the new one quietly; what they send to the one before shows nothing (the first time, that one becomes the queue your contact link names; later ones are read 14 days, then deleted), and with your contact link they can ask again, as anyone can, unless blocked: then nothing of theirs adds them again until you unblock them, neither their link, which asks you first, nor their answer to an invite by SMS, nor their contact link in a group. In a group you share they can still write to you. Without a call relay, your IP address in a call. With linked devices, and on this version: the list of four keys your phone signs, with where each reads and a key to seal for each that is theirs alone, so which of them sit on your phone's relay, and in time which of them answer, so which relay each device of yours reads on, though not how many there are until each has answered; and that you linked a device once, as there is a list only then (or, on a phone a backup that held none was put back on, once a contact you accepted said they hold one, which they can say falsely). | When you got and read their messages, when Erevos is open, and when you type. A chat set to appear offline says nothing of typing, shows it open only when you write, and holds the marks until then. With linked devices, when the list last changed, and when each device that answers takes their messages. | No. | No: of linked devices, a chat made there says and does what a chat of a space that never linked a device does, and writes to their devices as one. But a chat moved into hidden chats, or out of them into your chats, stops saying anything of linked devices at the move, as one put back on an Erevos from before does, which a contact on this version sees; one your chat gave its list (there is one only once you linked a device) can tell from it that the chat went into hidden chats, unless it was put back on an Erevos from before. While their phone's queue is full, what hidden chats write reaches their devices, as from your chats, but is tried again for their phone only while hidden chats stay open: a phone that never gets what its devices have is a little more likely of hidden chats. And a contact who knows a chat was put back from a backup can tell which it is: saying falsely that they hold a list of yours from before it was put back, or up to a day after, makes a space's chat sign one, never hidden chats. |
| **Someone holding your unlocked phone**, with Erevos open | Yes, for the open space. Also Android's SMS, call log and contacts, which Erevos does not seal. | Yes, for the open space. | Yes, for the open space. | Not from the app. Wrong passwords at the lock screen make the next try wait, up to an hour. In the web app with notifications while closed on in another space, a notice can come with nothing new in this one. | Not from the app. Searches are tried as PINs and wrong ones are counted apart. A "New message" notice with nothing new may hint at them, as may a call that rings with no name, or a "Reminder" notice with no reminder in your Chat with myself (a place's reminders make one only while "receive while closed" is on for it). With "receive while closed" on, what comes to a place is kept on the phone while it is closed, but nothing in the app shows it without its PIN. |
| **Forensic access with root**, no password | Sealed. But a space with no password lock has its key in the keystore. With the keystore read, every password and PIN can be guessed offline, with no wait: each guess costs a PBKDF2-SHA256 of 200,000 rounds and an Argon2id of 32 MiB and 3 passes. A short PIN still falls: a 4-digit one is 10,000 guesses. | As for content. File sizes show roughly how much is kept. | As for content. | Not from what is stored: unused slots look like used ones, and every space's sealed values are the same size, with what is larger in pages among the history's. Values an older version kept stay their size until next saved. Yes once its password is guessed, or if the lock was turned off inside the second space, which the lock settings then say unsealed. In the web app with notifications while closed, until Erevos next opens, the browser keeps a short tag of each queue that pushed, unsealed: how many there are may show more than one space, and how many contacts wrote, never who. | As for a second space. PINs may be as short as 4 characters. A place with "receive while closed" on has its key kept with its space, among a random one for each other place: whoever also has the space's password, or copies the phone's memory while the space is open, opens it with no PIN, but cannot tell from the space which other places are set. |
| **Whoever finds a backup file** | It needs the backup password (PBKDF2-SHA256, 200,000 rounds, then Argon2id, 32 MiB and 3 passes; at least 12 characters). A backup made before Argon2id has PBKDF2 only. Inside, each space is still sealed with its own password, except a space with no password lock, which the backup password alone opens. Photos and files sent in chats are not in backups. | As for content. | Its first bytes say it is an Erevos backup, and its size shows roughly how much. | Not from the file: every slot is in it, used or not. Yes once its password is guessed. | As for a second space. A place with "receive while closed" on opens with the space's password too. |
| **Someone nearby**, on Bluetooth or the same Wi-Fi | No. Until your contact's phone is known on a link, your short messages go, sealed, to every Erevos phone linked nearby. | Which phones nearby link and exchange data. That Erevos runs (see below). A message carried for you shows only the relay it goes to. | Yes: when, and how much. | No: the links are the phone's, and nothing on them names a space. | No: hidden chats never use the nearby links. |
| **A fellow group member** | What is said in the group, which they can copy. | Every member, with its relay address and the sender id of the queue it reads its groups on: from 2.0.0 one for its private groups and another for its public ones, neither the one in its contact link nor the one its contacts write to (an Erevos before says that one); in a private group also its identity key from its chats. So these tie you across your groups of each kind, and a private group's to your chats. Who is in a group call; without a call relay, their IP addresses. | When you write in the group, and when you join a call. | No: groups belong to one space, or to one place of hidden chats. | No: a hidden place's group shows its members that place's identity key and its own queue for groups, on the place's relay, never the space's, as its chats do. |
| **Push providers** (Apple, Google, Mozilla), web app only, when notifications while closed are on | No: the push holds only how many messages came and whether a call rang, encrypted for the browser, and is always the same size. | No. They see that a browser gets pushes from your relay. | Yes: that a message came, or a call rang, and when (at most one push to a browser every 15 seconds, for all its spaces on that relay; what comes sooner waits for the end of them, and its queues then take turns, one push each: a space's own, its groups' and those of the contacts who wrote, so a run of pushes 15 seconds apart can hint how many contacts wrote at once, never who). | No. | No: hidden chats never use pushes. |

Notes:

- **Nearby, Erevos shows that it runs.** Whenever a space is open on Android, in the background
  too, the Bluetooth beacon advertises a fixed service UUID (`6e8f0c1a-3b5d-4f2e-9a7c-5d1e0b2f8a41`),
  Wi-Fi Aware publishes the service `erevos`, the same Wi-Fi gets UDP broadcasts `EVL1 …` on port
  47905, and Wi-Fi Direct announces `_erevos._tcp`. The nonce in them is new at each start. A LoRa
  radio can be heard kilometres away, and its signal traced.
- **The Android app uses no push service.** It waits at the relay itself.
- **Tor** is on Android only, per space, and carries only relay and Nostr relay connections. Calls,
  through the call relay or direct, never go through Tor. Link previews are not made while Tor is
  on, and the update check refuses to run.
- **Nostr relays** (Android, only through Tor) carry texts to contacts whose Erevos reads there, each
  gift-wrapped (NIP-59) by a key made for that message alone, for a key the contact made for that
  chat alone and told only in the chat. A Nostr relay sees a Tor exit, the size (padded), a time
  backdated by up to an hour, and that key, so it can tell which wraps go to the same chat, not who
  is in it. It sees the reading phone ask for its chats' keys together, from one Tor circuit, so it
  can tell that those chats are read by one phone. A text not said to have come in five minutes
  goes through the relay too, and hidden chats' contacts also get a bell in their relay queue, so
  the relay operator still sees that something came, as before.
- **A queue for each contact** (lib/contact-queues.ts), at a relay that reads queues on its `/read`
  path with no token: each kept contact writes to a queue of their own, said only inside the
  encrypted messages, and the contact link's queue is for first messages only. So the relay sees how
  much and when each kept contact writes, each queue apart, never what or who. The relay sees no
  token on those reads, so the token, which names the phone, does not tie the queues together;
  through Tor each group of eight is waited on and read on circuits of its own, so the relay can
  tell that up to eight queues go together, not that two groups are one phone's. Without Tor it sees
  them read from one address anyway. They are still made and deleted with the token, so a relay that
  logs that can tie them together when they are made, and the times they are read can too. Deleting
  or blocking a contact deletes their queue at once; the own queue moves only when they knew it
  (contacts from before, and those who came through the link before its first move). Hidden places
  and linked devices keep one queue for all, for now. The web app has no Tor, so the relay sees its
  contact queues waited on together from one address while it is open. With notifications while
  closed, it also gives the relay the browser's one push address for its own queue and all its
  contact queues, with the token, each time Erevos opens, and the relay keeps that address on each of
  them for as long as notifications stay on, so it ties them with no logs (lib/push-queues.ts).
  Not audited.
- **The relay's own key** (crates/erevos-core/src/relay_channel.rs, lib/relay.ts). A connection to a
  relay whose key the phone knows opens with a channel to that key, as Noise's NK pattern: the phone's
  fresh X25519 key, the relay's answer with a fresh key of its own and a proof that takes the relay's
  secret key, then every message each way under ChaCha20-Poly1305, the token in the first. A
  certificate for the relay's name is then not enough to read or change what goes; the relay's secret
  key alone opens nothing that went before. The key comes from a contact link, or from what the relay
  said the first time it was asked, over TLS only: whoever is in between that first time, and every
  time after, can give a key of their own (trust on first use). A relay that never proved a key, one
  older than this (3.3.2 and earlier) or one whose answer someone in between keeps from coming, is
  reached without the channel, and tried again after an hour; once a key was proven, the open space
  keeps it, and that relay is never reached without proving it again, so a new key on the relay cuts
  the phone off until it is forgotten by hand. Calls (DTLS-SRTP, end to end), Nostr relays and the
  connections between relays (two-hop sends, already sealed for the far relay) have no such channel.
  Not audited.
- **Post-quantum, and a phone taken.** A chat starts with PQXDH, whose ML-KEM-768 half holds against
  a future quantum computer only while the ML-KEM secret it used stays secret. The contact link's
  is kept for as long as the account, so whoever takes the phone (or a backup) and has such a
  computer could open the conversations started with the link. Erevos makes newer prekeys every 30
  days, gives them to each contact in their chat, and the contact's Erevos starts a new conversation
  with them; secrets older than the last three are thrown away. So, against that adversary, a chat
  is open only in the conversation started with the link (until the first renewal, usually the
  first answer) and in those started with prekeys still kept, or kept in a backup made then. Contacts on an older Erevos
  never move. Groups are not post-quantum at all.
- **What came, after it is gone.** On a linked device, and from a contact whose account lists
  devices, each chat keeps for 30 days the random tag of each message that came and the day it came,
  after the message disappeared or was deleted, so a second copy of it, through the phone or from
  one of their devices, is not kept again. Whoever opens that space, or a backup made meanwhile with
  its passwords, sees that a message came that day from that contact, though not what it said; the
  tag tells which message it was only to someone who has it from elsewhere, as from the contact's
  phone.
- **Group keys taken once** read the group until that phone's keys are next made new: within a
  week (lib/groups.ts `RENEW_EVERY`) for the keeper, and for a member whose keeper's Erevos does it
  too (2.0.0 and later), as both phones are on. A member's renewal is the keeper taking its leaf
  out and putting a key package of its own in, so the keeper decides when it happens; a member
  whose keeper never does it stays as before.
- **Deleting or blocking moves your queue** (lib/queue-move.ts). The relay sees a new queue made,
  the old one read a while then deleted, and the space's contacts write to the new one: it can tie
  the two together by your IP address and the time, as it ties a phone's spaces, and, from which
  sender's messages stop coming to the new one, guess who was deleted. A contact you deleted is not
  told; one who still writes to an old queue that is no longer your link's sees it go after 14 days,
  so they can tell they were deleted, as they could from your silence. A contact who scheduled a
  message for you holds it again for your new queue and takes back the one before, at once, so the
  relay sees the two together there too, as it sees them write to both. A move in hidden chats moves
  only that place's queues, its ring queue at once, and nothing of the space or the other places:
  someone with the space's password and two copies of its storage can tell which place's entries
  changed, as when its notice or its ring is turned on or off. A place that rings also moves its
  ring queue after three rings within a day that its PIN answered and no call came to within two
  minutes, so whoever rings it for nothing can no longer; its contacts are told the new ring queue
  as of a moved queue, in a message with nothing in it. Each message says when the queue it names
  was made (`qa`, lib/moves.ts `queueAge`), so that a late copy from before a move never takes a
  contact back to the old queue: the first queue says 1, and each later one the hour put off by an
  offset the space or place drew once (up to 30 days) and by a few random hours more at each move,
  so the number tells a contact no more than the move itself does, and two of your places that move
  together hardly ever say the same. Put back from a backup, one from before 2.0.0 too (whose queue
  says 1), the queue says it was made as the backup was put back, with an offset past any it could
  have had when the backup held none, so later than any a contact holds, and every kept contact is
  told it anew: the relay sees them all told at once, as after a move. Messages
  sealed for a contact in hidden chats after a move into or out of them say the place's `qa` raised
  past the one the contact last heard, and higher with each later move there. A flood of first
  packets past the few read at a time (lib/queue-move.ts) counts as junk, unless one of those read
  was a real request: then the rest are read too. A flood of made-up ones moves the queue unopened
  and a batch of real ones all come, but a real one behind the few made-up ones read first in the
  same look is lost with the flood, as junk. A linked device keeps who is blocked, as the phone
  tells it, so someone with that device's password sees the list, as on the phone. A group admin
  says its new queue with new keys, which members take only while they say the same admin, and in a
  public group the same key, so they cannot make it someone else.
- **One queue per space.** Every contact of a space writes to the same queue, so one relay sees all
  of them arrive there. The contact link names another once a contact was deleted or blocked, and
  the space's groups and public groups each read on one more, on the same relay and connection, so
  the relay can tie them together. A hidden place's groups read on one of its own beside the place's
  queue, made and read as the place's (only while it is open, or receives while closed). With linked devices, a contact on this version writes each message to the
  phone's queue and at once to a queue for each of the four places in the device list, so a relay
  that sees them can tie those queues together, and how many go together says roughly what kind of
  message it is: a delivered mark goes to one place, a text to all, and a message tried again to the
  phone's queue alone once its copies went, as they do with a try the phone's full queue refused.
  The places no device takes have queues on the phone's relay, which the phone empties every hour
  from its own connection, so that relay can tell them from the devices' and tie them to the phone.
  Each packet of the burst is marked as the one to the phone is, so which are messages someone reads
  shows on every queue alike; and a device whose web app says when a message comes gives the relay
  it reads on a push address for its queue, which a filler's never has. A change of devices shows as
  a burst of the largest packets to every contact. A place that never answers a contact, a filler or
  a device that never writes to them, gets a conversation's first packet from them again a day, two,
  four and then every eight days after the first, while they write: its relay sees those, so it
  learns over time which places never answer, as the contact does.
- **Linked devices' own keys** (docs/multi-device.md). Each linked computer makes a key of its own,
  never the account's secret, and the phone signs the list of them with the account's identity key.
  A computer takes that list only as checked against the account's bundle that came in its link,
  whose safety code was compared, and only if that bundle names the account the phone said there.
  Whoever can use the account's key, with the phone open or with its backup and password, can sign a
  list naming a key of their own. The list always has four places, those no device takes holding
  keys whose secrets are thrown away (a device of the version before, which takes nothing from
  contacts, is listed as one of those), so it does not show how many devices there are; the phone
  tells its devices which are which, and contacts are not told, though the phone's relay sees it
  (above) and a contact sees over time which answer. Contacts on this version are given the list
  too, inside their conversation with the account, take it only as the account's bundle that came
  there signed it, and then write to every key in it, each in a conversation of its own whose first
  message names the account it is for: only a linked device of that account takes it, and no
  account, so a list naming someone else's key, a device's or an account's, cannot make it read
  anything on this version, and a contact writes nothing to a key in it that is an account it knows:
  its own, another of its contacts', or the one a contact knows it by. An Erevos from before does
  not check whose a conversation is for: a list can name such an account, which then gets what the
  list's owner's contacts write to them, as a message request, its answers shown to them as the
  owner's. The owner could forward those messages anyway. A contact takes a conversation one of
  those keys starts with it only once the list names that key. So whoever can use the account's key
  and its conversations, with the phone open, or with its backup and password, can sign a list
  naming a key of their own and give it to every contact on this version, who then write to that key
  too, and the safety number does not change: under the safety number, a chat's details show when
  the list it holds last changed. A device unlinked is left out of the next list, which each contact
  is given the next time the phone reaches the relay; until then they still write to it. It goes
  even while a place of the new list has no queue yet (the relay full, or a lent place's queues for
  the day used up), and then shows the contacts who held the list before which place is no
  device's. Put back from a backup, the phone believes what a contact it accepted says of the list
  they hold, up to a day after: one who says it falsely has it sign a list of places only, that its
  contacts then write to for good, or one dated a day later, once (docs/multi-device.md, Costs). A key the
  phone names to its devices as one of theirs, in their links and with where it reads, gets from
  each of them, in a conversation of their own, what it writes to contacts and the changes it makes
  to them. Naming one so takes the account's key and the links both, which whoever holds the open
  phone already has; the account's key alone, from a backup, does not. Packets between devices, and
  on a device's link to the phone, are sealed once more for the relay after a conversation's first,
  as between contacts; the relay still sees which queues write to which, the devices' to each other
  too. Whoever has the list and knows where a device reads can fill what it keeps of first packets
  it cannot take yet (from a contact it was not told of, from a key a list it holds does not name
  yet) with ones made up: none of those pushes out one that waits, but while they are full a real
  one is left out, and is taken only when its way starts again, a day or more later.

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
