# Linked devices

One Erevos account on a phone and on a computer (the desktop app, or the web app), as XMPP and
Signal let one account have several devices. This note says which way Erevos does it, and why.

## What there is today

A space is one account (lib/e2e.ts): an identity key whose bundle goes in the contact link, and
for each contact a double ratchet started with PQXDH (crates/erevos-core). Contacts write to the
space's one relay queue (lib/relay.ts), and the space reads it. Its messages are kept sealed in its
history (lock/history.ts). Hidden chats are a second account inside the space, read only while
their PIN has them open; a second password opens a separate space with its own account.

## The ways it could go

1. **One account copied to both devices.** Each device would have the same ratchets. The first
   time both send, each moves its copy of a conversation from the same state: the contact can open
   only one of them, and the conversation breaks. Both would also read the same queue, and the relay
   gives each message to whoever asks first. This does not work.

2. **Each device its own identity, contacts write to every device** (Signal). Robust once every
   contact runs a version that knows device lists: each contact keeps a ratchet with each device,
   checks a device list signed by the account, and seals every message once for each device. But a
   contact on an older Erevos knows one identity and one queue, and would never reach the computer.
   Safety numbers change with each device. Groups (MLS) would add each device as a member. All of
   it changes the protocol between people, at the same time as other work changes it.

3. **A primary that relays for its linked devices** (WhatsApp before 2021, and how XMPP's
   carbons look from outside). The phone stays the account: it alone holds the ratchets with
   contacts, reads the queue and seals for contacts. A linked device holds a ratchet with the phone
   only, through the relay, and the phone passes on what comes and what the device writes. Contacts
   see nothing new: one identity, one queue, one safety number, whatever version they run.

Erevos takes the third. It is the only one that keeps every contact on every older version
working, it changes nothing between people, and it uses only what the core has (PQXDH, the double
ratchet, sealed sends, the relay's file store): no new crypto. What it costs: the phone has to be
on and reach its relay for the computer to send and receive. On Android, Erevos keeps receiving in
the background (lib/background.ts), so in practice it is. What the computer writes while the phone
is off waits in the phone's queue on the relay and goes when the phone is back.

The second way can come later on top of this: once contacts know device lists, the primary can
stop relaying for those contacts.

## How it works

### Roles

The phone where the account lives is the **primary**. A **linked device** (the computer) has a
space of its own whose chats are the primary's: it keeps a copy of the contacts (names, timers,
looks, pictures, requests) and of the messages, in its own sealed history, and no keys of any
conversation with a contact. Linking happens in one space on each side, the one open on each, and
in no other: nothing of another space, of hidden chats or of what a second password opens goes to
a linked device, and nothing on the screens of one space shows that another is linked.

### The link

Every link is a conversation of the core's own kind (PQXDH, then the double ratchet), between a
key the computer makes for the link and a key the phone makes for it, through the relay like any
other: the relay sees packets of the same sizes as messages between people, on queues it cannot
tie to an account. The core's padding and two-hop sending apply as they do to contacts.

Linking, by QR code and a safety check:

1. On the computer, **Linked devices → Link to my phone**: it makes its link key, a queue on its
   relay and a one-time secret, and shows them as a QR code, `erevos://link?...` (the link key's
   bundle, the queue, the relay and its key, the secret, a name for the device).
2. The phone's camera opens the code in Erevos. The phone shows the device's name, a short safety
   code drawn from both link keys, and what of the history goes. Nothing goes until **Link** is
   tapped there.
3. The phone starts the conversation with the device's key: its first message carries the secret,
   where the phone's queue is and the account's identity. The computer shows the same safety code
   and asks whether the phone shows it too. Someone who photographed the QR code could answer first
   with their own phone: their code would not match, and the computer keeps waiting.
4. Once the codes match and **They match** is tapped on the computer, it answers, and only then does
   the phone send its contacts and the history chosen.

### Messages

- **From a contact:** the phone opens it as always, keeps it, and passes it on to each linked device,
  end-to-end encrypted in that device's link. The device opens it as if it came from the contact:
  the same tags, marks, timers and voice parts. Call signals go as the phone decides for each call
  (see Calls, below); group signals (invitations, key packages, welcomes) are not passed on: the
  phone is the group's member (see Groups, below).
- **Written on the computer:** the device seals it for the phone, which seals it for the contact as
  it came (whatever fields a later version adds go on with it), saying where its own queue is. A
  text, voice message, photo or file also goes into the phone's history as the phone's own, with the
  same tag, so both show the same marks; one the contact cannot be reached for now is marked Waiting
  there and goes as everything that waits does (lib/waiting.ts). A photo or file is first taken from
  the computer's relay to the phone, then sent on from the phone's. What only says that messages
  were read, deletes messages on both phones, or sets the timer goes on as it is, and the phone does
  the same in its own history. What only says that messages came is not sent on: the phone said it.
- **Written on the phone:** once the phone has kept it as sent, each linked device is told, and shows
  it as its own. A photo or file goes to the devices as a copy on the relay of their own, since the
  contact deletes theirs once taken. That the phone read a chat, or deleted messages on both phones,
  goes to the devices too.

A photo or file that came, or a copy of one the phone put on the relay for its devices, is left there
when taken until each device told of it said it took it (in its link), and the phone took it too if
it was still to; whichever is last, the phone then deletes it there, as a phone with no devices does
once it took one. A device unlinked takes nothing more, so what waited only for it is deleted then.
What no one takes expires after 14 days, as before. Group files stay on the relay for the other
members, as always.

What the phone seals for a device waits, sealed, in that device's outbox until the relay takes it,
so nothing is sealed twice. When a device is away so long that its outbox is full (300 packets),
nothing more is sealed for it, so its ratchet never has to skip more than it can; once the outbox
drained, it is sent the contacts again and the history from when it fell behind.

### Contacts and settings

The phone keeps the contacts; each device keeps a copy. A contact added on the computer (from a
link) is added by the phone, which starts the conversation. Names, timers for disappearing messages,
chat looks, pictures from signs, appearing offline, accepting or refusing a request: changed on
either side, they reach the other. A photo picture stays on the device it was chosen on. The
computer shows the account's own contact link and QR code, so people add the account from there too.

### History

The phone chooses what of the history goes: all of it, the last month, the last week or none, and
whether photos and files go too. It goes in packs through the relay's file store, each sealed with a
key of its own that travels in the link, so the relay sees only chunks of a file. Voice messages go
inside the packs; photos and files as copies on the relay, which the device takes as its chats show
them. **Bring over messages again** sends a period again later; what the device has already is not
kept twice.

### Disappearing messages

The timer is a contact's setting and goes with every message, as before, so every device takes the
later setting. Each device deletes its copy of a message when its time is up, counted from when it
was read on that device or when another said it was read.

### Unlinking

On the phone, **Unlink** forgets the device's link at once: nothing more goes to it, and what it
sends is not opened. That is how a lost device is cut off: it keeps what it had, behind its own lock,
but gets nothing new. If it is still on, it is told, and forgets the account's chats. On the
computer, **Unlink this device** does the same from that side.

### Hidden chats and second passwords

Hidden chats have their own account and are never linked; nothing of them is passed on or brought
over. A chat moved into hidden chats on the phone leaves the computer, messages and all. On a linked
computer, moving a chat into hidden chats is not offered (the chat is the phone's). A space opened by
a second password has its own devices or none, and links only when its owner links it, from inside
it.

### Calls

A contact's call rings on the phone and on every linked device: the phone passes its offer on to
each, in their links, and rings itself. Whichever answers first takes the call. A device's answer
goes to the phone, which seals it for the contact as the account's own, as long as no one answered
before; the phone and the other devices then stop ringing, quietly, and show the call was answered
on another device. If another was first, the device is told so, and stops. Turning a call down on
one turns it down for the account, and the others stop too; a device that only stops ringing (no
answer there, or in a call of its own) leaves the others ringing. A device calls a contact the same
way: its offer goes to the phone, which seals it for the contact as the account's, and passes on to
that device alone what the contact says of that call. lib/linked-calls.ts decides, on the phone,
where each call signal goes.

This is sound end to end. A call's sound and picture go straight between the contact and the device
that has the call (WebRTC, through the call relays as any call does), encrypted between the two with
the key the device's answer or offer names (DTLS-SRTP). That answer or offer reaches the contact
sealed in the account's own conversation with them, after reaching the phone sealed in the device's
link, which the safety code checked at linking: no one in between, the relays included, can put a key
of their own in its place. The contact learns nothing new but that the call came from the account.
The phone sees the signals, as it holds the account, but never the call itself. While a device has a
call, a contact who calls the account hears it is in another one, as from a phone in a call.

Once the call is set up the phone is not needed for it; ending it goes through the phone, and if
the phone is off then, the contact's side ends by itself as the connection closes. Unlinking a
device ends a call it has.

### Groups

The phone stays the group's member (MLS): it alone holds the group's keys, and no member sees a new
device, as no contact does. Each linked device keeps the account's groups as the phone tells it, in
its link: a group as it is now (name, admin or not, in or leaving or out, who was asked, who is in
it, until when it was read), whenever that changes, and each message the device was not told of yet,
in order, told apart by sender and tag. When a device is linked, or caught up after its outbox was
full, it is told every group first; their messages up to then go in the history packs with the
chats', from the period chosen, and those after as they come.

What is written or done on a device goes to the phone, which does it as its own: a message goes to
the group from the account, with the tag the device kept it by, so the device does not keep it
twice; adding and taking out members and renaming (when the account is the admin), leaving, deleting
a closed group and reading. A photo, file or voice message the device sends stays where the device
put it, on its relay, as a member's does: the members, the phone among them, take it from there. One
that came from a member goes to the devices as where it waits for the members; one the phone keeps
(its own, or taken already) goes as a copy on the relay for the devices, deleted there once each
took it, as for a chat's.

A device makes and joins no group: it has no MLS state of its own. New groups, public groups
(lib/public-groups.ts: their keys made for each group, their doors and moderation) and group calls
stay on the phone for now; public groups are not told to the devices at all.

### Older versions

Contacts on any older Erevos see nothing new: same identity, same queue, same ratchet, same safety
number. Both the phone and the computer need this version to link.

### Backups

A backup does not carry links (lock/devices-data.ts is left out), and restoring one leaves them as
they are: on the same phone the devices stay linked, and on another phone there are none. There, a
computer is linked again once it unlinked itself (**Unlink this device**, which clears the account's
chats from it). A linked computer's own backup holds the phone's chats as they were, without the
link to write in them, so the guide says to make backups on the phone.

## Where it is in the code

- `lib/link-code.ts`: the QR code's link, and the safety code.
- `lib/link-wire.ts`: what goes between the devices, and which messages are passed on.
- `lib/linked-calls.ts`: on the phone, where each call signal goes: who rings, who has the call.
- `lib/groups.ts`: on a linked device, the groups kept as the phone says them (`mirror`), and what
  is done in them goes through it (`GroupLink`).
- `lock/devices-data.ts`: each space's links, sealed with the space's key.
- `lib/devices.ts`: linking, the link conversations, passing messages on, copying contacts and
  history.
- `lib/e2e.ts`: a linked device's chat seals for its primary, and the primary's tells its devices
  what it opened and sealed (`Link`).
- `lib/attachments.ts`: a photo or file taken stays on the relay while another device is still to take
  it (`watchTakenFiles`).
- `app/app/devices.tsx`: Menu → Linked devices; `app/app/link.tsx` opens it from a scanned code.
- `app/checks/devices.check.ts`: a phone, a computer and a contact on an older version, through a
  real relay and the real core.
