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

The second way comes on top of this, so linked devices work with the phone off: once contacts
know device lists, the primary stops relaying for those contacts. docs/multi-device.md is how. Its
first parts are here already: the linked devices reach each other directly (Devices to each other,
below), so with the phone off they still see what the others do; and contacts on this version are
given the account's device list and write to each device too (Contacts and endpoints, below), so
with the phone off a device still gets their messages and answers them. For contacts on older
versions the phone goes on passing on, as below.

## How it works

### Roles

The phone where the account lives is the **primary**. A **linked device** (the computer) has a
space of its own whose chats are the primary's: it keeps a copy of the contacts (names, timers,
looks, pictures, requests) and of the messages, in its own sealed history, and never the keys of the
account's conversations with contacts: only those of its own endpoint (below) with their accounts
and their endpoints. Linking happens in one space on each side, the one open on each, and
in no other: nothing of another space, of hidden chats or of what a second password opens goes to
a linked device, and nothing on the screens of one space shows that another is linked. A place of
hidden chats links the same way on its own, from inside it, to the same place on the device, with
links of its own (Hidden chats and second passwords, below).

### The link

Every link is a conversation of the core's own kind (PQXDH, then the double ratchet), between a
key the computer makes for the link and a key the phone makes for it, through the relay like any
other: the relay sees packets of the same sizes as messages between people, on queues it cannot
tie to an account. The core's padding and two-hop sending apply as they do to contacts. Once both
sides have this version, each gives the other a key of its own in the link (`pk`), and every packet
after the conversation's first is sealed once more with it for the relay (lib/sealed-packet.ts), as
between contacts, so the relay cannot tell which packets in a queue belong to one link.

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

With the short code, the same, with nothing typed or compared (`lib/link-quick.ts`,
`lib/link-nostr.ts`, `components/quick-link.tsx`), for the space only; hidden chats link as above,
from inside them:

1. A computer, even one with no relay yet, shows at once a small QR code,
   `erevos://link?n=<Nostr key>&s=<secret>&name=<name>`: the public key of a Nostr key made for this
   link alone, a one-time secret and its name, about 140 characters where the full code is some
   2000. It reads for that key on three public Nostr relays.
2. The phone's camera opens it in Erevos, which asks **Link {name} to this phone?**. On **Link**
   the phone sends the computer, in a Nostr wrap (NIP-59, as Erevos's texts on Nostr go), its relay
   and an invite to it for a token of the computer's own (or, where the phone cannot invite, the
   relay's token for all typed in it, never a token of the phone's own), and a key of its own made
   for the answer.
3. The computer takes the invite, makes its queue on that relay, and sends back its full code, the
   one step 1 above shows. The phone links it as with that code read, then sends the safety code
   it shows. The computer compares it with the one the phone's first message gave, and takes the
   link when they match.

Each wrap is signed by a key made for it alone, so the relays see only that someone wrote to a key
that names no one, and each carries the secret, so only whoever read the code is answered. What the
safety check guarded against, someone who photographed the code answering first, is guarded by
time instead: they would have to read it and answer before the phone, and the phone would then say
the link failed. Should no Nostr relay be reached, or the computer not be able to use the relay, it
goes back to the way above, with the phone's relay filled in and LPHL's sign-in.

### The device list

Once the codes match, the computer also makes a key of its own, its **endpoint** (a core account
like the account's, never the account's own and never the link's), and says it to the phone in the
link; a computer linked by a version from before does so the next time it opens, with no linking
again. The phone signs a list of its devices' endpoints with the account's identity key
(lib/device-list.ts), each time a device says one or is unlinked, and sends it in each link with
the account's bundle and which of its places are the devices'. It always has four places: those no
device takes hold keys made only for the list, whose secrets are thrown away. The computer keeps
the list once the bundle is the account's it was linked to (said in the phone's first message, in
the link whose codes were compared) and the bundle's key signed it, later than the one it has.

The phone also gives the list to each contact on this version, inside its conversation with them,
and they write to each endpoint in it (Contacts and endpoints, below). The devices' endpoints reach
each other (Devices to each other, below). A phone or a computer from before ignores what it does not know, and the phone
keeps passing on for every device as below. A build whose core cannot sign as the account makes no
endpoint and signs no list.

### Devices to each other

With the list, the phone tells each device where each other device in it reads (`routes`, in the
link, not in the signed list). Each two devices then have a conversation of the core's own kind
between their endpoints (lib/siblings.ts): the one with the lower id starts it from the other's
bundle in the list, and the other takes a first packet only from an endpoint the list it checked
names, one that should start, and only once; one from an endpoint no list names is dropped. One that
said nothing in the conversation started with it, a day after, may never have had its first packet:
the next thing for it starts another, and so on until it answers, less often each time, the ones
before kept to open what it said there while away. Its packets are sealed for the relay as the
link's are. What a device writes to a contact goes to the phone as before, and to each other device
too, as its own: a message, what it read, reacted to, pinned, voted or deleted on both phones; so do
the changes it makes to contacts (names, timers, looks, pictures, appearing offline, accepting a
request, removing one) and where its queue is. So with the phone off, each device still shows what
the others write and do; the contacts get it once the phone is back, as before. A message sent for
later and a call's signals go through the phone only, and so does adding a contact, which needs the
phone. Groups still come only through the phone, as do the messages of contacts on older versions.

As two devices may change the same thing with the phone off, each change says when it was made,
and each field of a contact keeps when it was set: the later setting of each field wins, on every
device and on the phone. A request accepted on one stays accepted. A contact removed on one stays
removed for what comes of it later, until someone adds it again. A message deleted stays deleted,
should a copy come late. A message that comes both from a device and through the phone is kept
once, by its tag. Device names stay on each device. Hidden chats and second passwords never use
these conversations: a hidden place linked on its own has its own, between its devices.

A photo or file a device sends, when the list names other devices, stays on its relay for them to
take, and expires there after 14 days. A phone from before gives no routes, so its devices go
through it as before; a device from before meets no one, and is reached through the phone.

### Contacts and endpoints

A contact on this version says in each message which of the account's lists it holds (`dv`, none at
first). The phone gives it the one it signed last, with the account's bundle and where each endpoint
reads, in a message of its own inside their conversation; again a day later if they still say they
hold an older one, and again when one of its devices reads elsewhere, each by which list went, not
by the clock, so a clock set right after it was ahead gives it once more, not with every look. The contact takes it only
there, in the conversation with the account's identity, and only as that identity's bundle signed
it, for that account, later than the one it has. Then it writes every message to the account as
before, and a copy to each endpoint in the list, each in a conversation of the core's own kind it
starts with that endpoint, whose first message says for which account it is. An endpoint that has
not answered in it a day after it started may never have had that first message (the relay drops
what waits more than 14 days): the next copy starts another, and so on until it answers, less often
each time, the ones before kept to open what it sends in them. It carries what it writes, reads,
reacts to, pins, votes on, deletes and sets the timer of. That a message came goes back only the way
it came, saying only that; that a phone is open or someone types, calls, groups and messages sent
for later go to the account only, but for what they say was read, which goes to each endpoint alone,
and came, only the way it came. A list's entry that names an account the contact knows, its own or
one of its contacts', is written nothing. The copies are sealed only once what went to the account
went, each endpoint's in the order they go, so what never went moves no conversation with an
endpoint on; when the account's queue is full or its relay cannot be reached (as the relay said too
when only LoRa was left and it was too large for it), what is tried again as it is (a text, a mark,
what waits; of what a device wrote, what the phone keeps, not a reaction, pin, vote or delete) goes
to the endpoints all the same, and once however often it is tried; in hidden chats only while the
account's queue is full, as there it is then owed to the account, tried again while hidden chats
stay open. They wait sealed in an outbox (lock/fanout-data.ts) until the relay takes them, saved
after the conversations they were sealed in, for 14 days at most and 1000 in all, those for an
endpoint whose queue the relay said is full giving way first when it is full, then the contact with
the most; once 50 wait for one endpoint, or one waits while its queue is full, nothing new is copied
to it, but a voice message goes on to its last part, so it reaches it whole or not at all. Those for one relay go
on one connection. Each tells the relay what it carries as what went to the account does, a place
that fills the list's as a device's, for a closed web app's notice on a device to count, and the
phone passes the contact's message on quiet to a device it was written to as well. Should the
contact still hold an older list that names the device too, or their copy not reach it, the device's
notice counts that message twice, or not at all; twice too when their app tried it again after it
was closed, as what went to each endpoint is kept in its memory only. An Android device's own notice
in the background counts a message once, as one that came twice is no news.

A device takes a conversation a contact's account starts with its endpoint, for its own account,
from a contact it knows, and keeps it as its own way to them; one from a contact the phone has not
told it of yet waits for the phone to, kept with the chat (the latest of each, 8 in all, 14 days). A
new one from a contact it had one with, as when they deleted the account and added it again, starts
each of its ways to their endpoints again with the next copy. Once the contact holds the list that
names the device, the device writes to them itself in that way, and to their endpoints if their list
names any; the phone and the other devices are told it as their own, and what came of it, so all of
them mark it. What it writes to them so tells the relay what it carries as the phone's would, and
the phone sends none of it again. With the phone off, a device so still gets their messages and
answers them. Once the phone's queue on the relay is full, as with the phone off for long, what they
try again as it is still reaches the devices: texts, marks, the keys, and a voice message or file
once it waits for the phone; a reaction, pin, vote or delete, a walkie-talkie message or a call goes
nowhere until the phone empties its queue. What comes both directly and through the phone is kept
once, by its tag, even once the first left the history: each chat keeps the tags it took, with the
day each came, for 30 days, 2000 of one contact at most, on a device of every contact and elsewhere
of those whose account lists devices; once 2000 are kept, one that came twice gives way to a new
one, and while none did, the new one is not kept, so a second copy of it shows again if it already
left the history, as does one that comes later than 30 days. A voice message sealed again with its
tag has the same parts, so what came of it before counts. Those tags stay after the messages left
the history, in a backup too, until their 30 days are over: whoever opens the chat sees that a
message came that day, not what it said. The phone tells each device what it knows of each contact's devices (`way`), so they
write to those too.

The places of the list no device takes are written to alike: the phone makes a queue for each on
its own relay, with a key of its own as a device has, gives it with the list, and empties
it every hour while it is open, so the relay keeps it and takes what is sent to it as it takes a
device's; one lost, or left on a relay the phone no longer uses, is made again, with the same key.
One the phone cannot make now (offline, the relay full, a lent place's queues for the day used up)
keeps where it was, and is tried again every minute while the space is open; a relay whose key the
phone could not ask, as it opens offline, counts as the one it was on. Until each place has a queue
no contact is given the list, but one whose list may name a device it no longer names. Each
contact is given, for each place and each device, a key to seal with drawn from that place's or
device's own key and the contact's identity, so no two contacts have the same, and a relay that
works with one of them opens only that one's copies; a device finds whose a copy is by its mark, as
the phone does. A contact cannot
tell them from devices by what it does or by what the relay answers; only by where each reads, as
those sit on the phone's relay, and, over time, by which never answer. The phone's relay can: it
sees the phone empty them, and no one does while the phone is not open.

An endpoint of a contact's account that starts a conversation with this one, saying it speaks for
that account, is taken only once that account's list as checked here names it; until a later list
comes it waits (the latest of each endpoint, 4 of one account, 16 in all, 14 days), and then it is
taken, or goes. Those that wait are the first that came: one made up, under as many keys as one
likes, never pushes out another, though while they are full a real one is left out, and is taken
when its endpoint starts again a day or more later. It is never a message request, and an account
takes none, only a device. Unlinked, a device is left out of the next list, which the phone gives
each contact the next time it reaches the relay, even before each place in it has a queue (they
then see which has none): the contact lets go of the conversations with it,
so nothing it sealed opens any more, and anything new it starts waits for a list that names it. The
contact's details show, under the safety number, when the list it holds last changed.

### Messages

These are the ways through the phone, for contacts on older versions, and for what goes to the
account only.

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
  were read, deletes messages on both phones, sets the timer, reacts to a message, pins it or votes
  on a poll goes on as it is, and the phone does the same in its own history. What only says that
  messages came is not sent on: the phone said it.
- **Written on the phone:** once the phone has kept it as sent, each linked device is told, and shows
  it as its own. A photo or file goes to the devices as a copy on the relay of their own, since the
  contact deletes theirs once taken. That the phone read a chat, deleted messages on both phones,
  reacted, pinned or voted goes to the devices too, and each does it as its own.
- **Done on the phone only:** a star, or deleting a message or a chat's messages on the phone alone,
  is nothing the contact hears of; it goes to the devices as a change (`changed`, by the chat and
  the message's tag), and each does the same. A device's own stars and deletes stay on it. Hidden
  chats are told of only to their own linked devices, never to the space's.

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

### Matrix, XMPP and Nostr accounts

The space's own accounts on other networks go to a linked device when **Matrix, XMPP and Nostr
accounts too** was chosen as it was linked, or later with **Send the accounts** on the phone
(`accounts`, `lib/linked-accounts.ts`). They go in the link, end-to-end encrypted as the rest, and
only the space's. A hidden place linked on its own gives its own accounts the same way, in its own
link, into the same place on the device (kept under the place's holder, run while the place is
open or receives while closed): never the space's, and the space's never go to it. The device
signs in to each as a new device, never a copy of the phone's, whose keys would then be used twice:

- **XMPP**: the address, its password and its server when given by hand. The device signs in as a
  new resource, with an OMEMO device of its own.
- **Nostr chats**: the key itself (Nostr has no devices), with the relays it reads on, its name and
  its file servers. The phone told those already, so the device tells them again only a week later,
  or once changed there.
- **Matrix**: the homeserver and the user, with the account's cross-signing keys and its key
  backup's key when the phone has them. When the homeserver gives the phone a one-use login token
  for a new device without asking for the password again (spec 1.7, `login/get_token`), which few
  do, the device signs in with it; otherwise it asks to be signed in to by hand, once, with the
  Matrix ID filled in. Either way it then takes the keys, each only if it makes the keys the
  homeserver has, as a Security Key would open them: other people's apps trust it as the account's
  own, with no Security Key or check by emoji, and it opens the messages from before that the
  backup holds.

A device that has an account of that network already keeps it; only the Matrix keys go to one
signed in as the same user. What could not be brought yet (offline, say) is kept sealed with the
device's links and tried again each time the space opens; sent again, the newer takes its place.
Once unlinked, the device signs out of what it brought, as that device only, or forgets the Nostr
key, as its chats go. A device from before leaves `accounts` alone.

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
but gets nothing new. If it is still on, it is told, and forgets the account's chats and its
endpoint, and signs out of the accounts it brought from the phone. On the computer, **Unlink this device** does the same from that side. Either way the phone
signs a list without it, a new filling key taking its place.

### Hidden chats and second passwords

Hidden chats have their own account, and nothing of them goes over the space's link. Each place
of hidden chats links on its own instead, from inside it (docs/multi-device.md, Hidden places): on
the device, in a place opened with its PIN, empty, with a relay queue of its own made under **For
advanced users**, **Linked devices** then **Link to my phone** shows the code; on the phone, in the
place, **Linked devices** then **Link a device** scans it. The place's links are its own: their
conversations and keys sealed with the place's key under its holder in `lock/devices-data.ts`, its
own account signing its own device list, so its contacts write to the device's place directly, and
its chats, messages, groups, calls, Chat with myself and Matrix, XMPP and Nostr accounts go between
the two places as a space's go between its devices. Nothing of it shows in the space, on its
screens or on its devices; the file keeps a value of the same size for every place of every
space, written or not, so neither it nor the space's value says which places link. The link runs
while the place is open, and while it is closed with **Receive while closed** on; closed with it
off, what the other side sends waits on the relay (14 days). On the device's place, new groups and
group calls stay on the phone, a chat cannot be moved into it or out of it, and a call answered
there stops the phone's ring only while the phone's place is open.

Hidden chats write to the devices of contacts on this version as the space's chats do, and take
what those write, so to a contact they are the chats of a phone that never linked a device, or,
once their place links one, of one that did. A chat moved into hidden chats on the phone leaves
the space's computer, messages and all. Moved into hidden chats, or
out of them, a chat is known to its contact by the identity of where it was made, and says nothing
of devices to them, as an Erevos from before, until it goes back there: it tells them first, so
their devices let go of its own, and they can see that it stopped knowing of devices; one it gave
its list can tell from that it went into hidden chats, unless it was put back on an Erevos from
before. While a contact's queue is full, what hidden chats write still reaches the contact's
devices, but is tried again for their phone only while hidden chats stay open. On a linked
computer, moving a chat into hidden chats is not offered (the chat is the phone's). A space opened by
a second password has its own devices or none, and links only when its owner links it, from inside
it.

### Calls

A contact's call rings on the phone and on every linked device: the phone passes its offer on to
each, in their links, and rings itself; what the offer says was read it passes on as a receipt.
Whichever answers first takes the call. A device's answer goes to the phone, which seals it for the
contact as the account's own, as long as no one answered before; the phone and the other devices
then stop ringing, quietly, and show the call was answered on another device. If another was first,
the device is told so, and stops. Turning a call down on one turns it down for the account, and the
others stop too; a device that only stops ringing (no answer there, or in a call of its own) leaves
the others ringing. A device calls a contact the same way: its offer goes to the phone, which seals
it for the contact as the account's, and passes on to that device alone what the contact says of
that call. lib/linked-calls.ts decides, on the phone, where each call signal goes.

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

What members do later to a message the devices have (a reaction, a vote, a pin, deleting it for
everyone), and what the phone does to it alone (a star, deleting it there), reaches the devices
too. The phone keeps, in memory, what was done to each group's messages as last told, and for each
device a mark of it: what changed since goes, by tag, only what changed of each message. A device
whose mark differs from what the phone has (the app closed before it told a change, or the device
was caught up after its outbox was full) is told the group's marks whole: what was done to each
message that has anything, and the tags of all of them, so it lets go of what was done to the
others and of the messages the phone no longer has (but its own of the last minutes, which may not
have reached the phone yet). The messages told after carry what was done to them, as do those of
the history packs. Edits are not there: no message is edited in Erevos yet.

What is written or done on a device goes to the phone, which does it as its own: a message goes to
the group from the account, with the tag the device kept it by, so the device does not keep it
twice, and with what it answers or is beyond its words (lib/group-parts.ts); a reaction, a vote, a
pin or deleting its own for everyone; adding and taking out members and renaming (when the account
is the admin), leaving, deleting a closed group and reading. A message the phone could not send to
the group (one it left or closed meanwhile) is said back to the device that wrote it, which shows it
as not sent. A photo, file or voice message the device sends stays where the device
put it, on its relay, as a member's does: the members, the phone among them, take it from there. One
that came from a member goes to the devices as where it waits for the members; one the phone keeps
(its own, or taken already) goes as a copy on the relay for the devices, deleted there once each
took it, as for a chat's.

A device makes and joins no group: it has no MLS state of its own. New groups, public groups
(lib/public-groups.ts: their keys made for each group, their doors and moderation) and group calls
stay on the phone for now; public groups are not told to the devices at all.

### Older versions

Contacts on any older Erevos see nothing new: same identity, same queue, same ratchet, same safety
number. They never say `dv`, so they are given no list, and the phone passes on for them as before;
a contact whose account stops saying it (an Erevos from before put back, or the chat moved into
hidden chats or out of them, which tells their devices too first) has what was known of its devices dropped, and is
written to at its account only. Both the phone and the computer need this version to link. A device
from before changes in messages told already leaves `changed` alone, and shows those done on it
only, as before. Devices reach each other only when the phone and both of them have this version;
otherwise everything goes through the phone, as before, and nothing is sealed once more on a link
with a version from before. A phone from before signs no list, so its contacts write to it alone; a
device from before endpoints is in no list, and the phone passes on to it what the others wrote to
contacts themselves and what came of it; one of the version before this, which says no key for
contacts to seal with, is listed as a place no device takes is, so contacts' copies to it go to a
queue the phone empties, and it gets their messages through the phone. Updated, it makes a new
endpoint, which takes a place in the list as a device linked does.

### Backups

A backup does not carry links (lock/devices-data.ts is left out, as it holds the links'
conversations, and restoring one deletes it), so no message key of a link is ever used twice. It
carries instead, with the chat (lock/e2e-data.ts `relinks`), what a phone it is put back on needs to
ask each linked device to link again: the device's endpoint and its bundle, where it reads, its
name, and a key the device made and gave the phone in their link (`relink`), which only the two of
them hold. A device gives it once its link has an endpoint, and gives it again when the phone asks
for it (`relink` with no key: a phone updated after the device was linked).

#### Linking again

On a phone a backup was put back on, the devices of the phone it was made on are kept apart
(`back`, by the restore id of lock/restored.ts) and show under **From the backup** in Linked
devices, of the space or of hidden chats, each in its own. Nothing goes to them until the holder
taps **Ask to link again** for one: a device the backup names may since have been sold, lost or
stolen. Then the phone starts a conversation of the core's own kind as the account itself with the
device's endpoint, and says first `again` (lib/link-again.ts): a statement the account signs
(context `again`: the account, that endpoint, when, the phone's name) and an HMAC of it with the
device's key. The device takes it only from its own account (the peer of that conversation, which
only the holder of the account's identity can start), signed by the bundle its phone gave over their
link, for its own endpoint, from no more than 14 days before, with its own key, and each once. It
shows it as **{name} asks to link again**, and links nothing until **Link again** is tapped there:
a backup that leaked, with its password, asks devices, but cannot have them link.

Said yes, the device makes the key of a new link and its secret, as for a code to show, and sends
that code in the conversation of the ask (`agreed`, with when it last heard from its phone). The
phone links it as if it read the code, bringing the history from a day before then, and sends back
in the same conversation the safety code of the new link (`match`), which the device compares
itself with the one it works out from the phone's `hello`: equal, the device takes the new link,
says `ready`, and is that phone's. Nothing is typed, scanned or compared by hand, as the code only
travels inside a conversation started by the account and opened by that endpoint alone. The device
keeps its chats, its contacts as the phone sends them (all of them, so one the backup does not have
goes), and gets what came since; what came to the lost phone after the backup was made stays on
the device only. It lets go of the link before, without telling the lost phone, of its endpoint,
the others it met as that endpoint and the account's list it checked, and makes a new endpoint,
which the phone signs a new list for and gives contacts; and of its key, giving the new phone a
new one. So the lost phone, or anyone with the same backup, can ask it nothing more: what it says
in the link before opens nowhere, its asks go to an endpoint that is gone, and even one aimed at the
new endpoint fails on the key. A device of a version before this one ignores an ask, and a device
that gave no key takes none: those link again as the first time, after **Unlink this device**
there, which clears the account's chats from it. **Let go** drops a device from the backup's list.

#### A device's own backup

A linked computer's own backup holds the phone's chats as they were, without the
link to write in them, so the guide says to make backups on the phone. Restored on another computer,
those chats open to be read: Erevos says once that they came from a linked device's backup, and what
is written there says why it cannot go (a contact as a device keeps it has no conversation of its
own). Such a space links again as an empty one does: once the phone sends its contacts, the chats it
has stay, the history brought over joins them, each message once, and the others go; the first
`groups` after linking says all the groups there are (`all`), so a group the phone no longer has
goes too. Such a copy lets go of the computer's endpoint as it opens, before it seals anything, so
two computers never take one endpoint; linked again, it makes a new one. The conversations with the
other devices are kept with the links, so a backup put back on the same computer finds them as
they were, and one put back elsewhere has none. A phone's backup carries the device list it signed
last, so restored on another phone, where no device is linked, it signs a later one that names none
of them, and once more should a contact say they hold a later one still, as when its clock is
behind the lost phone's. What contacts say of the list they hold counts only there, after a backup
was put back, only from a contact it accepted and up to a day after: one who says it falsely can
have it sign a list of places only, or one dated a day later, once (docs/multi-device.md, Costs).

## Where it is in the code

- `lib/link-code.ts`: the QR code's link, and the safety code.
- `lib/link-quick.ts`, `lib/link-nostr.ts`, `components/quick-link.tsx`: the short code, and the
  two sides talking through Nostr until the link is made.
- `lib/link-wire.ts`: what goes between the devices, and which messages are passed on.
- `lib/device-list.ts`: the device list, signed by the account and checked against its bundle.
- `lib/link-again.ts`: the ask to link again, signed by the account and with the device's key, and
  how a device checks it.
- `lib/endpoints.ts`: the ways to the endpoints of a contact's account, and what goes to them.
- `lib/fanout.ts`, `lock/fanout-data.ts`: the copies for those endpoints, and sending them.
- `lib/siblings.ts`: on a linked device, the account's other devices it reaches directly, and how
  what two of them change at once settles.
- `lib/linked-calls.ts`: on the phone, where each call signal goes: who rings, who has the call.
- `lib/groups.ts`: on a linked device, the groups kept as the phone says them (`mirror`), and what
  is done in them goes through it (`GroupLink`).
- `lock/devices-data.ts`: each space's links, sealed with the space's key, and each hidden place's,
  sealed with its own, a value for every place written or not (`keepDevicesFile`).
- `lib/devices.ts`: linking, the link conversations, passing messages on, copying contacts and
  history; a hidden place's own links (`placeLinks`, `placeLinksNow`), opened with its chats
  (`joinPlaceChats` in `lib/place-chats.ts`) and following its queue's moves (`onPlaceMoved` in
  `lib/queue-move.ts`).
- `lib/linked-accounts.ts`: the space's Matrix, XMPP and Nostr accounts, or a hidden place's own,
  given by the phone and brought on the device (`matrixTake`, `xmppTake`, `nostrDmTake` in their
  stores, with the place).
- `lib/e2e.ts`: a linked device's chat seals for its primary, and the primary's tells its devices
  what it opened and sealed (`Link`).
- `lib/attachments.ts`: a photo or file taken stays on the relay while another device is still to take
  it (`watchTakenFiles`).
- `app/app/devices.tsx`: Settings → Data and devices → Linked devices, and with `hidden=1` an open
  hidden place's own, from **Linked devices** under its list; `app/app/link.tsx` opens it from a
  scanned code, for the hidden place open beneath if there is one.
- `app/checks/devices.check.ts`: a phone, a computer and a contact on an older version, through a
  real relay and the real core; devices reaching each other with the phone off; contacts writing to
  every endpoint, each with keys of its own the computer finds them by, hidden chats among them, and
  a device answering them with the phone off, and getting what they try again
  once with the phone's queue full, told of once; what a computer writes through the phone to a
  contact whose queue is full, a reaction copying nothing; hidden chats owing what a full queue
  refused; a computer on an older version listed as a place; a phone put
  back from a backup, its clock behind or not, signing a later list, and one never put back signing
  none for what anyone says; a computer unlinked left out of the list before its place has a queue;
  the places keeping their queues and keys offline or while the relay's key is not known; and a
  hidden place linked on its own, with its own list and accounts, messages both ways, its contacts
  writing to the device's place directly, unlinking, and nothing of it in the space, on the space's
  devices or in the size of the file; and a phone put back from a backup asking a device to link
  again, the device linking once said yes there, keeping its chats with what came since, and then
  out of reach of the lost phone and of the same backup elsewhere, hidden chats asking their own.
- `app/checks/place-receiver.check.ts`, last: a hidden place linked on its own syncing while it
  receives closed, and not while closed without it, what was sent then waiting on the relay.
- `app/checks/endpoints.check.ts`: what goes to which endpoint, and what is kept of them.
- `app/checks/copies.check.ts`: what a chat writes to the endpoints of a contact's account, with the
  real core and no relay: whose a list's entries can be, each contact's key of its own for each,
  hidden chats writing to them as a space's chat that never linked a device and a chat moved in or
  out saying nothing of devices, the copies hidden chats keep apart, when the copies are sealed and
  go, what goes once however often it is tried, copies for a full queue keeping no one out, a voice
  message whole and, sealed again, put together once, what is kept of what came and for how long,
  each space's value in the outbox's file, and when the list is given:
  by which list went, not by the clock, and what contacts say of the one they hold counting only
  after a backup was put back.
- `app/checks/siblings.check.ts`: which devices meet, and how their changes settle.
