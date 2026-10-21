/** The user guide in English. Its format: lib/guide.ts. The same sections, in the same order and shape, as the Greek one. */
export const guide = `
## What Erevos is {#about}

Erevos is a messenger made for privacy. You need no account, no phone number and no email to use it, and it is
meant to keep working wherever you are: through a nearby phone with no network at all, over Wi-Fi, or over the
internet.

- **Nearby, without internet:** two Android phones talk directly over Bluetooth, Wi-Fi Aware or Wi-Fi Direct, end-to-end
  encrypted, and phones and computers on the same Wi-Fi or a phone's hotspot do too. With a LoRa radio, texts go kilometres.
- **Through a relay:** over Wi-Fi or the internet, through a small server (a relay) that you can run yourself.
- **Spaces:** a password lock, a second password that opens a separate, empty Erevos, and hidden chats in every
  space.
- **Appearance:** the LPHL looks: Classic, Modernist and Nocturne, twelve palettes, and glass as on lphl.nekten.eu.

> This is an early test version. Messages are **end-to-end encrypted**, through a relay and nearby alike, but
> nothing has been audited yet. Do not rely on it to protect anyone yet.
> [What is protected today](#privacy) says exactly what is and is not.

This guide opens from **User guide** in the home screen's menu (the three dots at the top). The search at its top finds any word in it. The guide
is in English and Greek, and shows in English in the app's other languages, see [Language](#start).

## Getting started {#start}

Erevos is downloaded from its releases page, one file for each system: see [Updates](#updates) for where, and how to
update it. It runs on Android, on a computer (Linux, macOS and Windows), on Sailfish OS and, from the browser, on an
iPhone.

The home screen is the list of your chats, the one that moved last at the top. Each shows the contact's picture,
the last message with its marks, when it came, and how many of their messages you have not read. A clock beside it
means its messages disappear. **Search chats** finds a chat by its name or its last message, and, under the chats,
the messages that have what you type in them, in all the space's chats: tap one to open its chat at it. In a chat, its
details have **Search in this chat**: ▲ and ▼ go to what it found earlier and later. Either looks only on this phone,
in what it keeps sealed; hidden chats are searched only from inside them.

- **The picture** is drawn from the contact's key: the same key always gives the same colours and moon (in greens under Matrix), so you know
  a chat at a glance without any photo. It is not a check of the key; the [safety number](#relay) is.
- **The line under the search** says whether a relay is set and your queue is ready. Tap it to set one up.
- **New chat**, at the bottom, opens the relay settings and adding a contact.
- **The handset and the person** at the top, on Android, open **Phone** and **Contacts** at once.
- **All messages**, **SMS** and **Erevos**, above the chats once there are SMS conversations too, show all of them,
  only the SMS (with the chats whose last message was an SMS), or only the Erevos chats.
- **The widget**, on Android: add Erevos from your home screen's widgets. Its four buttons open **Phone**, the
  **SMS**, the Erevos **Messages** and **Contacts**, after the password like any link (the Phone without it, if you
  let it). Over the first three it shows how many missed calls, unread SMS and new messages there are, never who or
  what; with missed calls, **Phone** opens on **Recents**. Its words follow Erevos's language.
- **The lock** at the top locks Erevos at once when a password is set, or opens the lock settings when not.
- **The three dots** open the rest:

| In the menu | What it opens |
| --- | --- |
| **Language · Γλώσσα** | The app's language: English, Greek, German, French, Spanish, Italian or Portuguese. See Language below. |
| **New group** | A group chat with your contacts. See [Group chats](#groups). |
| **Public groups** | A group anyone with its link can ask to join, with an owner and admins. See [Public groups](#public-groups). |
| **Nearby phones** | Your contacts over Bluetooth and Wi-Fi Aware, or on the same Wi-Fi, without internet. See [Chat with a nearby phone](#nearby). |
| **LoRa radio** | Texts over a Meshtastic radio, kilometres away, without internet; off unless set. See [Over a LoRa radio](#lora). |
| **Contacts** | The phone's contacts, with their groups and birthdays, and contacts kept only in Erevos. See [Contacts](#contacts). |
| **Linked devices** | The same account on a computer or in a browser too. See [Linked devices](#devices). |
| **Imported chats** | Chats brought in from Telegram or WhatsApp. See [Imported chats](#import). |
| **Appearance** | Looks, colours and glass. See [Appearance](#appearance). |
| **Lock and second password** | The password lock, the second password and hidden chats. See [Password lock](#lock). |
| **Backups** | Backups of everything on the phone, made by hand or by themselves, and restoring one. See [Backups](#backup). |
| **Updates** | The version you have, and **Check for updates**. See [Updates](#updates). |
| **User guide** | This guide. |
| **Relay test**, **Radio test** | Tests of the connections. See [The test screens](#tests). |

Inside a chat, its name and picture are at the top with how it travels: **End-to-end encrypted**, and **Nearby**
while their phone is linked to yours over the radio. Tap the name, or **⋯** beside it, for the chat's **Details**: its
picture (tap it to change it), **Call**, **Video**, **Rename** and **Picture**, then **Disappearing messages**,
**Appear offline**, **Chat look**, the **Safety number**, **Move to hidden chats** and **Delete messages**. **Done**
closes them.

A good first hour:

1. Open **Lock and second password** and set a password, so nobody who picks up the phone can open Erevos.
2. Open **Nearby phones** from the menu on two phones that are close to each other, and allow what Android asks for.
3. Add each other with **Show my QR code**, as in [Chat with a nearby phone](#nearby), and send a message: it goes
   nearby, end-to-end encrypted, with no relay and no internet.
4. To talk from further away, set up a relay as in [Chat through a relay](#relay).

### Language

Erevos is in English, Greek, German, French, Spanish, Italian and Portuguese. The first time it starts, it follows
the phone's language if it is one of these, and is in English otherwise. To change it, open the menu (the three
dots) and tap its first row, **Language · Γλώσσα**: in the other languages it is named in that language and in
English, such as **Sprache · Language**. Then tap the language, each named in its own words: **Ελληνικά**,
**English**, **Deutsch**, **Español**, **Français**, **Italiano** or **Português**. The whole app changes at once.

- **This guide** is in English and Greek only: in the other languages it shows in English, and names the buttons as
  the app does in English. A word new to the app may also show in English in those languages for a while, until it
  is translated.
- **Kept on the phone:** the choice is kept on this phone, outside every space, so the password screen shows in it
  too, and every space opens in it. It is not sealed: whoever holds the phone can see which language you chose.
- **Android's notices** (an incoming call, new messages, Erevos receiving in the background) are in Greek when Erevos
  is, and in English in every other language.

## Chat with a nearby phone {#nearby}

While a space is open, on any screen, Erevos looks for other Erevos phones around it, over Bluetooth and, where the
phone has it, Wi-Fi Aware, and on the Wi-Fi it is on, phones and computers alike. No internet, SIM or Wi-Fi network is
needed. It carries messages to your contacts, end-to-end encrypted like those through the relay.

1. Open **Nearby phones** from the menu on both phones. The first time, Android asks to find nearby devices (on Android 12 and
   older, also for the location); allow it, or the phones cannot find each other.
2. If you are not contacts yet, add each other: on one phone tap **Relay and new contacts**, then **Show my QR code**,
   and scan it with the other, as in [Chat through a relay](#relay). Without a relay the code holds only your keys,
   and you reach each other nearby only, until you have one.
3. Pick the contact, type in **Message** and tap **Send**. Once their phone answers, the top of the chat says
   **Nearby**.

- **While a space is open:** the links start when a space opens, whatever screen shows, and stop when it locks or
  another space opens. A message from nearby shows on the home screen as one through the relay does, and a call rings
  there too. On Android they stay up with Erevos in the background, while **In the background** is on **Receive and
  ring**.
- **Range:** a few tens of metres in the open, less through walls.
- **Wi-Fi Aware:** faster, but not every phone has it. Bluetooth works on all of them.
- **The same Wi-Fi or a hotspot:** phones on one Wi-Fi, or on one phone's hotspot, find each other and talk directly,
  even when that Wi-Fi has no internet; the desktop app too. If Android asks whether to stay on a Wi-Fi with no
  internet, stay. Anyone on that Wi-Fi can tell an Erevos app is there, not whose. A computer's firewall must let
  port 47905 in (UDP and TCP). To stop it, turn off **Find Erevos on the same Wi-Fi** under **Relay and new
  contacts**.
- **A Wi-Fi of their own (Android 10 and later):** with no Wi-Fi in common, two Erevos phones near each other make a
  small Wi-Fi of their own (Wi-Fi Direct) and talk over it as on the same Wi-Fi: faster than Bluetooth, and a call
  goes over it with no internet. It asks nothing; each phone stays on its own Wi-Fi too where it can. Anyone near can
  tell an Erevos phone is there, and could join that small Wi-Fi, getting only sealed bytes. It needs **Find Erevos
  on the same Wi-Fi** on; to stop it alone, turn off **Make a Wi-Fi with phones nearby** below it.
- **Other phones nearby** get only sealed bytes they cannot open, and only until your contact's phone is known: from
  then on what you send goes to it alone. Voice messages go only to a contact known to be near. Photos and files need
  the relay.
- **With a relay as well,** each message also goes through it, so nothing is lost if the link drops; the copy that
  comes second is not shown again. If the relay cannot be reached, the copy nearby is the one that counts.
- **Carried by other phones:** when the relay cannot be reached and your contact is not near, the Erevos phones
  nearby also take your message sealed for your contact's relay. Each keeps it, three days at most, gives it to two
  more phones at most that it meets, and hands it to that relay through its own relay once it can; so does yours.
  They cannot read it, nor tell who it is from or for: they see only the relay's address. It stays when Erevos
  closes, sealed on the phone. Yours stay in your space, and go only while it is open. Carrying for others is off
  unless you turn on **Carry messages for others** under **Relay and new contacts**, and then only for relays on the
  internet over TLS (wss://): a stranger nearby never has your phone, or your relay, reach one on a local network or
  on the phone itself. Your own messages are carried by the phones nearby that have it on.

> A message from nearby opens only in the space that has that contact. One for another space of this phone waits in
> memory, six hours at most, until that space opens. Hidden chats never use the nearby link.

## Over a LoRa radio {#lora}

With a Meshtastic LoRa radio linked to the phone by Bluetooth, Erevos reaches Erevos with a radio on the same mesh,
kilometres away, with no internet: straight, or through the Meshtastic radios between. It is off unless you set a
radio, and on Android only.

1. Set up the radio in the Meshtastic app first, its **region** above all: without one it sends nothing. Then close
   the Meshtastic app, or disconnect it there: a radio links to one app at a time.
2. Open **LoRa radio** from the menu, tap **Find my radio**, read what it says, and tap your radio when it shows. A
   radio not paired yet asks for its PIN: it shows on the radio's screen, or is 123456.
3. Your contact does the same with theirs, on the same mesh: the same region and the same first channel.
4. Write as always. When the relay cannot be reached and no phone is near, a text goes over LoRa,
   and the line under the chat says so.

- **Only text, and slowly:** a message goes in pieces of about 220 bytes, each a second or two on the air, and the law
  allows a radio only so much air time (in the EU, a tenth of each hour). So LoRa takes only texts and deletes, and
  only when nothing else does. Voice messages, photos and files wait in the chat, marked **Waiting**, and go by
  themselves once the relay or a phone nearby can take them; calls need one of those too. The first message to a
  contact takes longer, as it holds the keys.
- **Marks:** **✓✓** comes with their next message, as marks alone do not go over LoRa.
- **To every radio in reach:** each message is heard by every radio around, and passed on by the Meshtastic radios, as
  Meshtastic does. Every Erevos tries it; only your contact's opens it. Nothing is carried for others over LoRa.
- **Its name and where it is:** Meshtastic radios say their name to every radio in reach now and then, and where they
  are if they have GPS or a fixed position, in the clear. Erevos keeps yours from doing so (**Kept quiet**): it sets
  its role to Client hidden, turns its GPS off and removes a fixed position. It still answers a radio that asks its
  name, so give it a name that says nothing of you, in the Meshtastic app. **Said to all in reach** puts its role and
  GPS back, after a warning; a fixed position is set again in the Meshtastic app. If the radio does not keep the
  settings, the LoRa screen says so.
- **It stays linked** while Erevos runs, and links again by itself when the radio comes back in reach. **Turn LoRa
  off** gives the radio back its role and GPS, if it is linked, then unlinks it and forgets it. Hidden chats never go
  over LoRa.

> A LoRa radio is heard kilometres away, and its signal can be traced to where it is, quiet or not. What Erevos sends
> stays end-to-end encrypted, but anyone with a radio can tell that yours sends, when and how much. With
> **Said to all in reach**, anyone with a radio can also read its name and where it is.

## Chat through a relay {#relay}

A relay is a small server that keeps one-way queues: each phone has its own queue, and whoever has its **contact
link** can drop messages into it. The relay holds no accounts, names or phone numbers, and cannot read the messages:
they are end-to-end encrypted, and only the two phones have the keys. Each phone may use a relay of its own: a message
to a contact on another relay is sealed for theirs and handed to yours, which passes it on, so their relay never sees
your phone's address. A phone with no relay gets a place on its contact's, see **No relay of your own** below.

1. On the home screen, tap **New chat**. The relay settings open (they are under **Relay and new contacts** in
   a chat with no contact picked).
2. Type the **Relay address**: \`ws://<computer address>:7879\` for a relay on your own network, or
   \`wss://relay.example.org\` for one on the internet. Add the **Token** if the relay needs one.
3. Tap **Create my relay queue**. Erevos says **Your relay queue is ready**.
4. Tap **Show my QR code**: it opens over the screen. Let the other phone scan it with its camera, then open the link in Erevos. The
   **Add a contact** screen shows what it holds: tap **Add to chat** only if you scanned it yourself.
5. If their camera only shows the text, or they are far away, tap **Share my contact link** and send it to them.
   They paste it into **erevos://contact link** and tap **Add**.

The new chat appears on the home screen named **contact** and the first characters of their key. It is enough that one
phone adds the other: adding a link starts an encrypted conversation and tells the other phone how to answer, so it
lists the chat the next time it looks at its queue, which it does every few seconds.

### No relay of your own

A phone with no relay chats over the internet all the same: adding the link of a contact whose relay lends places, it
takes a place there, with no token.

- **How:** add their link as in 4 and 5, with nothing under **Relay**. Erevos says you now have a place on their
  relay, lent through their link, and uses it as its own from then on: your own link names it, so others reach you
  there too.
- **Who lends:** your link carries a ticket for a place on your relay only when you turn on **Share a place on my
  relay with this link**, under your link in **Relay and new contacts**, and only for the link shown then: the next
  time the chat opens, it is off again. The relay needs a key for two-hop sending, and whoever runs it decides
  whether it lends at all. A ticket lasts 30 days and gives up to four places. Anyone who sees a link with a ticket
  can take a place with it, so give such a link only to whom you mean to.
- **What a lent place does not do:** messages to contacts on other relays go straight to their relay, which then sees
  your phone's address. It keeps nothing for later (a message sent later waits on the phone), gives no call relay
  (calls go straight between the phones), and makes 4 more queues and sends 1 GB of files a day at most. Your link
  lends nothing on.
- **Your own relay instead:** type its address under **Relay**: the lent place is let go of, and contacts learn the
  new one from your next message.
- **A link without a ticket** (from an older relay or Erevos): a relay that needs no token is used as it is;
  otherwise you reach each other nearby only, until you have a relay.

### The safety number

Open the chat, tap its name and then **Show safety number**. Both phones show the same 60 digits for the two of you. Compare them
in person or on a call: if they match, no one is in between. If they differ, do not trust that chat, and add the
link again, scanned from their own phone.

### Sent, came and read

Under each of your messages to a contact, **✓** says the relay or a phone nearby took it, **✓✓** that it came to
their phone, and **✓✓✓** that they read it. Their phone tells yours, inside the encryption, the next time each looks
at the relay, or at once when they are nearby. A message counts as read once its chat shows on the screen.

- **Waiting:** a message nothing could take, as the relay cannot be reached and their phone is not near, stays in
  the chat marked **Waiting**, and goes by itself, in order, once the relay or their phone nearby can take it, while a
  space is open; then it shows **✓**. A text waits at once. A voice message, photo or file asks first: **Keep it
  waiting** or **Delete it**. A waiting message is deleted on this phone only. Hidden chats keep nothing waiting.
- **Send later:** hold **Send** down and choose a time at a tap (**In 1 hour**, **Tonight 20:00**, **Tomorrow
  09:00**) or the day, hour and minutes, up to a year ahead, then **Send later**. The message stays in the chat marked
  **Scheduled** with its time. It goes encrypted to the relay, which keeps it and sends it at that time, even if this
  phone is off or locked then, and their phone shows it from that time, not sooner. With no relay reachable now, it
  waits on this phone and goes to the relay once one can be reached. With nothing typed, the time you choose is for
  the next photo, file or voice message: a photo or file goes to your relay at once and stays there until they take
  it, 14 days after its time at most. Hidden chats have it too, but there the relay has to be reachable when you
  schedule. Until its time, delete it to take it back from the relay, and it never goes. A message without sound
  stays without sound. A relay from before this keeps nothing for later: then the message waits on this phone and
  goes at its time while Erevos runs, in the background too while **In the background** is on **Receive and ring**
  (below), or when Erevos next opens.
- **Send without sound:** hold **Send** down and choose **Send without sound**: their phone shows the notice without
  a sound or vibration. An Erevos from before it does not know this and sounds as usual, and so does Erevos as a web
  app, whose notice comes from the browser.
- **Links:** a web address in a message is underlined. Tap it and Erevos shows it whole, to open in the browser
  only if it is where you want to go. Nothing is fetched before that.
- **They see when you read:** your phone tells theirs, as theirs tells yours, unless that chat appears offline (below).
- **When messages come:** Erevos looks at the relay every few seconds while it is open and unlocked, on any screen,
  and the home screen moves the chat to the top by itself. On Android it goes on in the background too, while **In
  the background** is on **Receive and ring** (below): there it waits at the relay until something comes, instead of
  asking every few seconds, so the battery lasts, and a notice says only how many messages came. Closed, locked, or
  long in the background otherwise, it does not: messages wait on the relay, up to 14 days, and come once Erevos
  opens again.

### Online, and appearing offline

While a contact's chat is open on your screen, Erevos asks their phone now and then whether it is open, and says yours
is. If theirs is, the chat says **Online** under their name with a green dot, and the home screen shows the dot on
their picture. Writing to someone also shows you online to them for two minutes. All of it goes inside the encryption,
only between you and that contact: the relay sees a message now and then, as with any chat. There is no "last seen".

While you type to a contact who shows online, their chat shows **typing…** under your name for a few seconds, and
yours under theirs when they type. It is said every few seconds at most, only while they show online, never to a
message request, and not in groups.

To hide it from one contact, open their chat, tap its name and then **Appear offline: off**. With it on:

- **They do not see you online**, nor that you are typing, and your phone sends them nothing while you read.
- **Their messages stay ✓** on their phone, not ✓✓ or ✓✓✓, while you read them.
- **When you write to them**, you show online for two minutes, and every message of theirs you read turns ✓✓✓ at once.
- **You do not see them online either**, since your phone does not ask.

It is set for each chat, on this phone only. Turn it off again and they see what you read with your next look at the relay.

### Names and deleting

Open a chat, tap its name and then **Rename** to give it a name. The name stays on this phone, sealed with the chat: the other phone
does not see it. An empty name brings back the start of their key.

Tap its name and then **Picture** to give them a picture of your own choosing, a sign on a colour, instead of the one drawn
from their key. Or tap **Photo** (or **Take photo**) for a photo: cut square, made small and drawn anew, so nothing it said besides its
picture (a place, a phone) is kept, then sealed in a file of its own. It too stays on this phone, and goes into backups;
**Picture from their key** brings the drawn one back.

Each chat can also look its own way: tap its name and then **Chat look** for the same choices as **Appearance** (style, theme,
colors, wallpaper, messages), for that chat only. Like the name, it stays on this phone, sealed with the chat. **Same as the app**
gives it the app's look again.

To keep a chat outside Erevos, tap its name and then **Export chat**: its messages go into a text file, each day under its
date and each message with its time and who wrote it, saved in the folder you pick (on a computer, where you choose). The
file is not encrypted: anyone who has it, or any app that reads that folder, can read it. Photos, files and voice messages
are only named, messages that disappear are left out, and hidden chats are not exported, so that no file outside Erevos
shows they are there.

To delete one message, press and hold it and tap **Delete**. To delete all the messages of a chat, tap its name and then **Delete messages**.
Either way Erevos asks where:

- **This phone:** only here. The other phone keeps its own.
- **Both phones:** their phone deletes them too, the next time it looks at the relay. Their Erevos does so, but a
  changed app, a screenshot or a copy can still keep them.

### A message's menu

Press and hold a message for its menu: the reactions at the top, then what you can do with it.

- **Reactions:** tap one, or **+** for more. It shows under the message on both phones, yours lit; tap it
  again to take it back. Each of you has one reaction on a message. It goes at once, or not at all: when neither
  the relay nor their phone nearby can take it, nothing changes.
- **Reply:** your next message answers it, and shows it quoted above your words, on both phones. Tap the quote to go
  to the message it answers; **✕** drops it. An Erevos from before this shows the answer without the quote.
- **Forward:** sends a copy of it to another chat: pick a contact, or a group. Its words, sticker or place go anew, a
  poll as a new one with no answers yet, and a voice message's sound or a photo's or file's bytes are sent again,
  encrypted with a new key, so nothing ties the copy to the message it came from. The copy says **Forwarded** under
  it, not from where; an Erevos from before this shows it without that. A message that disappears
  is not forwarded, and from hidden chats a message goes only to the same hidden chats.
- **Star:** stars it, on this phone only, to find it again: **Starred messages** in the home screen's menu lists them
  from all your chats, and a chat's details list its own. A tap goes to the message. Hidden chats' starred messages
  show only in their chats' details.
- **Pin:** pins it to the top of the chat, on both phones; either of you can **Unpin** it. With more than one pinned,
  the latest shows; tap it to go to it, and the next one shows.
- **Copy:** puts its words on the clipboard, to paste in another app. On Android the copy is marked private, so the
  phone's notice of it does not show the words, but any app that reads the clipboard can read them.
- **Delete:** on this phone, or on both, as above.

Reactions, replies and pins travel inside the encryption, like the messages.

### Disappearing messages

Open a chat, tap its name and then **Disappearing: Off** to choose how long its new messages last once read: 5 minutes, 1 hour,
1 day or 1 week. To make only one message disappear, type it and tap **Disappear** under the message field, then pick
how long. Its time starts when the other phone shows it on the screen, and your copy starts when their phone says so
(**✓✓✓**). Each message says when it disappears. The other phone learns the chat's setting the next time it looks at
the relay, and either phone can change it: the later change wins. Messages already in the chat stay.

- **Until it is read** a disappearing message stays on both phones, sealed like the rest. If their Erevos never says
  it read it, your copy stays.
- **While Erevos is closed:** a message whose time has come is deleted when the chat next opens. Until then it stays
  on the phone, sealed like the rest.
- **Not a guarantee:** their Erevos deletes them, but a changed app, a screenshot or a copy can still keep them.

### Voice messages

In a contact's chat, press and hold **Voice** while you talk, and let go to send. After a minute it sends by itself. The
first time, Android asks whether Erevos may use the microphone: it records only while you hold **Voice**. Tap a voice
message to play it, and tap it again to stop. Voice messages have the same marks as the rest, and follow the chat's
disappearing setting.

- **Through the relay, or nearby,** end-to-end encrypted like the words, in several pieces. No one in between can
  hear them, but from the pieces the relay, or whoever listens nearby, can tell that something long was sent, and
  roughly how long. Nearby they go only to a contact's phone known to be near.
- **On the phone** each sound is kept in a file of its own, sealed with its own key, which only the chat's sealed
  history holds. When the message goes, deleted, disappeared or the oldest, its file goes too. How many of these files
  there are, and their sizes, show roughly how many voice messages the phone keeps, in all its spaces together, not
  in which.
- **While it plays** the sound is unsealed in Erevos's cache, and deleted once it stops. If Erevos is closed while it
  records or plays, what was left goes the next time a chat opens.

### Photos and files

In a contact's chat, tap **Attach**, then **Photo** to pick one from the phone's photos, **Take photo** to take one
with the camera, or **File** for anything else, up to 100 MB. Under them, **Photo quality** sets how photos go, and
Erevos remembers it:

- **Original** (the default): the photo exactly as it was, full size, no quality lost. Only what it says besides its
  picture is taken out: where it was taken, the phone, the time, thumbnails. Its name is just "photo".
- **90%** and **75%:** a new, smaller photo, quicker to send, that says nothing but its picture.

Their photos and files up to 16 MB come by themselves; tap a bigger one to take it. Tap a photo to see it whole, with its size, or a
file to save it. **Save** puts a copy in a folder you choose the first time, and **Save in another folder** changes
it. Photos and files have the same marks as the rest, and follow the chat's disappearing setting.

- **How they travel:** each file is encrypted on the phone with a key of its own, in pieces all of one size, and put
  on your relay. Only where the pieces are and the key go to the contact, end-to-end encrypted. Their phone takes the
  pieces through their own relay, so your relay never sees their phone's address, checks every piece, and then
  deletes them from the relay. Pieces nobody takes are deleted after 14 days.
- **What the relay sees:** how many pieces there are and their size, so roughly how big the file is, and when. Not
  what it is or who it is for.
- **A file goes as it is,** with whatever it says inside: a document's author, or a photo's place and phone if you
  send it with **File**. Send photos with **Photo**.
- **On the phone** each file is kept in its pieces, as they travelled, sealed with its own key, which only the chat's
  sealed history holds. When the message goes, its pieces go too. How many pieces there are shows roughly how much the
  phone keeps, in all its spaces together, not in which. A photo is shown from memory, never written out unsealed.
  The phone's photo picker hands over a copy in Erevos's cache, deleted once read, and a photo taken here is not kept
  in the phone's photos.
- **Saved** photos and files are outside Erevos, not sealed: anyone with the phone can open them.
- **Through the relay only:** files need its file store, even when the contact is nearby. A relay older than this
  version cannot take files: update it.

### More under Attach

Under **Attach** there is more to send than photos and files:

- **Sticker:** one of the stickers built into Erevos, drawn by each phone itself: only its name travels, so nothing is
  ever downloaded. An Erevos from before this shows its emoji instead.
- **Location** (on Android): sends where you are, once, as a place. The first time, Android asks whether Erevos may use
  the location. The phone finds where it is by satellite when you allowed the precise location and it is on, otherwise
  as its location settings say, which on many phones asks Google or the phone's maker. Erevos looks only when you tap,
  shows you the place before it goes, and does not follow you after. The message holds only the coordinates, end-to-end
  encrypted; no map is loaded in Erevos. **Open in maps** hands the place to your maps app, which may load its map from
  the internet. An Erevos from before this shows the coordinates as words.
- **Poll:** a question with two options or more, up to 12, and, with **More than one answer**, more than one to choose.
  Tap an option to choose it, again to take it back; each option shows how many chose it, and who. Votes travel inside
  the encryption, as reactions do. An Erevos from before this shows the question and its options as words, to answer in
  words.

### Link previews

A link in a message is underlined, and opens only once you tap it and say so. With **Link previews** on, in a chat's
details, a link you send goes with its preview: as you send it, this phone fetches the page and takes its title, a line
about it and a small picture, and they go inside the message, end-to-end encrypted. The phone that gets it fetches
nothing: it shows what came. It is off unless you turn it on, and then it is on for all the chats of the space.

- **The site sees this phone's internet address**, and when, as it would from a browser, but not who the message is
  for. Through Tor, Erevos sends only its relay requests, not pages, so while the space goes through Tor no previews
  are made at all.
- Hidden chats make none, nor Erevos on a computer, which shows those that come all the same.
- **Over LoRa**, which takes only a little, a message goes without its preview rather than wait, and keeps none here.
- A preview is what the page says of itself, true or not. An Erevos from before this shows the link without it.

### Voice and video calls

In a contact's chat, tap **Call** for a voice call or **Video** for a video call. The first time, Android asks whether
Erevos may use the microphone, and the camera for video. Their phone rings while Erevos is open there, on any screen of
the space: they tap **Answer** or **Decline**. During the call you can mute, switch the loudspeaker, turn your camera off, flip
between the front and back camera, and **End**. Each call leaves a line in the chat, such as how long it lasted, or
a missed call.

- **End-to-end encrypted:** the call is set up with messages through the relay, encrypted like the rest. Those carry
  the key that encrypts the call itself, so no one in between can listen, not even the call relay below.
- **Through the call relay:** a relay set up with the kit in \`deploy/relay\` has a call relay beside it. The call
  goes through it, so neither phone learns the other's IP address. Over Wi-Fi or mobile data, anywhere.
- **Without a call relay** (a relay on your own computer, for example), Erevos asks first: the call then goes
  straight between the phones, only works on the same Wi-Fi, and each phone sees the other's address on it.
- **Without internet:** on the same Wi-Fi, a phone's hotspot, or the Wi-Fi two phones make (Wi-Fi Direct), with a
  space open on both, a call needs no relay at all: it is set up over the nearby link and goes straight between the phones (or computers). The same goes for group
  messages and group calls.
- **In the background (Android):** while a space is open, Erevos keeps running when you leave it, with Home or by
  swiping it away from the recent apps, with a quiet notice that says only "Erevos". It waits at the relay and on the links to phones nearby, so messages come: a notice
  says only "New message", or how many came, and on a locked phone only "Erevos". A call rings with the phone's
  ringtone and a notice that says only "Incoming call", over the lock screen too. Tap it to answer. With the password
  lock on, a call that rings shows before the password, and Erevos locks as soon as it ends. Only that space's chats
  and groups come so; hidden chats only say that a message came, if you let them (see Hidden chats). Set it under **Lock and second password** → **In the background**:
  **Receive and ring** (the default) or **Only while Erevos shows**, and **Say a message came** (the default) or **No
  notice**. There too, if Android asks for them, **Keep running on battery** and **Show calls over the lock
  screen**.
- **Where it cannot ring:** stopped by Android (or by the phone's battery saving), in another space, or on a computer
  or in the web app while closed. A call there shows as a missed call once Erevos opens. A message request cannot
  call you until you accept it.
- **One call at a time.** A call goes on while you move between screens of the space. It ends when the space closes,
  and a call in hidden chats when they close, as they do when Erevos goes to the background. Swiping Erevos away from
  the recent apps ends a call too.
- Calls do not go over a nearby phone or Bluetooth. There, **Talkie** under the message field turns the chat into a
  walkie-talkie: hold **Hold to talk**, let go, and it plays on their phone as it comes, if the chat with you is open
  there; if not, it waits as a voice message. It is a smaller voice message (about 3 KB a second), so it goes
  everywhere a message goes, Bluetooth included.

> The relay settings, your queue, your contacts and their names, the keys of your conversations and the messages are
> kept in this space, sealed. History has no limit: it is kept in sealed pages of the same size, mixed with the pages
> of the other spaces and hidden chats, so only how much they all take together shows, not whose they are. Deleted
> messages can stay for a while in the phone's storage, sealed like the rest, until something is written over them.
> Messages sent or received nearby are kept the same way.

## Group chats {#groups}

From the home screen's menu, **New group**: give it a name, tick the contacts to ask, and tap **Make the group**.
You are its admin. Each contact's phone answers by itself the next time Erevos is open there, and joins: the group
then shows on their home screen, with a note of who added them. Groups go through the relay, so it has to be set.

- **Who can be asked:** contacts you have accepted, in this space. Members who are not each other's contacts still
  talk in the group, and show by the start of their key until a name is given in a chat with them.
- **End-to-end encrypted for the group:** MLS (RFC 9420). Each message is encrypted once for the group, then sealed
  again for each member, so what reaches each member's queue looks like nothing the others get, and no relay can tell
  who is in a group. It goes straight to each member's queue, through your relay.
- **Members:** tap the group's name at the top. The admin adds contacts, takes members out and renames the group. A
  member taken out reads nothing the group says from then on, and the group stays on their phone, read only, until
  they delete it.
- **Leaving:** **Leave the group** asks the admin, whose phone takes you out the next time Erevos is open there. The
  admin's own button is **Close the group**: it takes every member out.
- **Group calls:** **Call** at the top of the group starts a voice call in it, **Video** a video call. It rings on the members' phones
  where Erevos is open, and whoever answers is in it. A call going on shows at the top of the group, to join it
  later. Up to eight people: each phone connects to each other one, through the call relay, so no phone sees another's
  IP address; without a call relay, only on the same Wi-Fi. End-to-end encrypted between each two phones, their keys
  sent in the group's encryption. In a video call each phone sends its picture to each other one, so pictures show
  for up to four people; with more, they pause and the sound goes on, until a server for bigger video calls is set up.
- **Photos, files and voice messages:** **Attach** under the field sends a photo or a file, as in a contact's chat,
  with the same **Photo quality**; hold **Voice** while you talk, and let go to send. Each is encrypted with a key of
  its own and put on your relay once, and only where it is and its key go to the group, in its encryption. Each
  member's phone takes it from there through its own relay: up to 16 MB by itself while the group is open, a bigger
  one when tapped. Tap a photo to see it whole, a file to save it, a voice message to play it.
  - **The relay keeps it 14 days,** encrypted, as it cannot know when every member has taken it.
  - **Through the relay only,** even when members are nearby.
  - **A member who joins later** does not get what came before, as with the words. A member whose Erevos is from
    before this version sees nothing of it.
  - **On the phone** each is kept in its pieces, sealed, as in a contact's chat. Deleting the group here deletes them.
- **A message's menu,** held down, as in a contact's chat: the reactions, **Reply**, **Forward**, **Star**, **Pin**,
  **Copy** and **Delete**. Each member has one reaction on a message, and a poll shows who chose what. A pin is for
  everyone, and any member can **Unpin** it. **Delete** asks **This phone** or, for your own message, **Everyone**:
  the members' Erevos delete it too, and a photo, file or voice message of yours leaves your relay at once instead of
  in 14 days. **Attach** has **Sticker**, **Location** and **Poll** here too. Links are underlined and asked before
  they open, and **Link previews**, when on, go with yours. In the members sheet, or a public group's own screen, **Search in this chat** goes through the group's messages and **Export chat**
  writes them out; **Starred messages** and the home screen's search take in the groups too. A member whose Erevos is
  from before this version sees the words, a sticker's emoji, a place's coordinates and a poll's question, and
  nothing of reactions, pins and deleting.
- **Not yet:** marks, typing and disappearing messages in groups, groups in hidden chats, and groups over a nearby phone.

## Public groups {#public-groups}

A public group is one anyone with its link, or its QR code, can ask to join: for a club, a street or a class, where
not everyone is your contact. From the home screen's menu, **Public groups**: give it a name and the name you go by in
it, choose who comes in, and tap **Make the public group**. You own it. Its messages are end-to-end encrypted with MLS
and go to each member as in any group, and no relay learns who is in it.

- **The link:** tap the group's name at the top for its link and QR code, and **Share the link**. Whoever opens it, or
  scans the code with the phone's camera, chooses the name the group sees and taps **Ask to join**. A link can also be
  pasted under **Join by a link**. Every member has the link, and can pass it on.
- **Joining while you are away:** the request waits on your relay, sealed so that only your phone opens it, until
  Erevos is open on your phone: it looks every few seconds while Erevos shows, and about every minute in the
  background. Then it lets them in, and the group shows on their phone.
- **Who comes in:** **Anyone with the link**, or **An admin lets them in**: then whoever asks waits under **Asking to
  join**, for you or an admin to tap **Let in** or **Turn away**. Your phone still lets them in, once it hears.
- **Admins:** under **Members**, tap **Moderate** beside a member, then **Make an admin**. Admins mute, take out and ban
  members, let in who asks, and delete a message for everyone; only you moderate admins, and nobody moderates you.
  - **Mute:** their phone sends nothing in the group, and no phone shows what theirs sends anyway. **Let them write**
    undoes it.
  - **Take out:** they read nothing the group says from then on, and can ask to join again by the link.
  - **Ban:** taken out, and what their phone asks after is turned away. **Lift the ban**, under **Banned**, undoes it.
    A ban stops the same phone, not someone who comes back with a new relay queue: against that, choose **An admin
    lets them in**, or change the link.
  - **Delete for everyone:** the latest messages are listed at the bottom; **Delete** takes one off every member's
    phone. Whoever read it already may have kept a copy.
- **Change the link:** the link and QR code shared so far stop working at once, and every member gets the new one.
  Requests still waiting at the old one are lost.
- **Hand the group over:** under a member's **Moderate**. Their phone owns it from then on and lets people in, so the
  link changes to one on their relay; you stay an admin. If your phone is lost before you hand it over, no one can let
  anyone in again, though the group goes on for those in it.
- **Close the group** takes every member out. A member's **Leave the group** asks your phone to take them out.
- **Up to 100 members,** as the whole group has to fit in the one message that lets someone in.
- **Every phone in a public group needs this version of Erevos.** Groups made from contacts work as before.

### What a public group gives away

> Anyone with the link can read the group from when they are let in, never what was said before, and the link can be
> passed on: change it to stop that.

- **The link** shows the group's name and your relay's address to whoever sees it.
- **Every member sees every member's** chosen name, a key made for this group alone, their relay's address and their
  queue's sender id. The key says nothing of who they are in their chats, nor which other groups they are in; the
  sender id is also in their contact link, so whoever has that can tell it is them.
- **Names are chosen, not proven:** anyone can call themselves anything. The start of each member's key shows beside
  the name, and the owner and the admins are marked.
- **Whatever is said can be copied** by anyone in the group: end-to-end encryption keeps the relays out, not the members.
- **The relays** read nothing and learn no one in the group. Yours sees requests come to the group's door, how many and
  when, not from whom. Members can fill each other's queue with what cannot be read, up to what the relay takes.

## How Erevos picks the path {#paths}

When you tap **Send**, Erevos picks the path by itself:

1. **Their phone is near** (the top of the chat says **Nearby**): it goes over the nearby link, and through the relay
   too when there is one.
2. **Otherwise, with a relay:** it goes through the relay, and a short message also goes to the Erevos phones linked
   nearby, so theirs can answer nearby if it is one of them. If the relay cannot be reached, that copy is the one
   that counts, and those phones carry it to your contact's relay too, as in [Chat with a nearby phone](#nearby).
3. **Otherwise, with no relay,** it goes to the Erevos phones linked nearby, as in 2.
4. **And over LoRa,** when a radio is set and the relay could not take a text, as in [Over a LoRa radio](#lora). With
   no way at all, the message waits, marked **Waiting**, and goes by itself once there is one, as in
   [Sent, came and read](#relay); a line under the chat says why.

Every path is end-to-end encrypted: no relay and no phone in between can read what you send.

| Line under the chat | What to do |
| --- | --- |
| **Sent nearby, end-to-end encrypted.** | Nothing: their phone is near and has it. |
| **Sent through the relay, end-to-end encrypted.** | Nothing: it is on its way. |
| **Sent to the Erevos phones nearby, end-to-end encrypted, as the relay could not be reached.** | It comes only if one of them is theirs: wait for **✓✓**, or check the relay. |
| **… If their phone is not one of them, they hand it to their relay once they reach the internet, and so does this phone.** | Nothing: it comes once one of them, or this phone, reaches the internet. Wait for **✓✓**. |
| **Sent over LoRa, end-to-end encrypted, as the relay could not be reached.** | It comes if their Erevos has a radio on the same mesh, within reach: wait for **✓✓**, or check the relay. |
| **Waiting. The relay cannot be reached (or There is no relay), and their phone is not near.** | Nothing: it goes by itself once the relay or their phone nearby can take it, and then shows **✓**. Without a relay, fill in its address, as in [Chat through a relay](#relay), or come near their phone. |
| **Waiting. It is too long for LoRa.** | Nothing: it goes once the relay or their phone nearby can take it. Or send it in shorter parts. |
| **Not sent. The relay does not have this contact's queue any more.** | Ask them to write to you, or for their new contact link. |
| **This build cannot encrypt, so chats through the relay are off.** | Build the app again: this build is older than its encryption. |

## Running your own relay {#own-relay}

A relay you run yourself is the safest one, since whoever runs a relay sees who connects to it. The source code
has everything in \`deploy/relay\`.

- **On your own network:** run the relay on a computer, open port 7879 in its firewall, and type
  \`ws://<its address>:7879\` on every phone. Close the port again when you are done.
- **On the internet:** a server (VPS) with Debian 12 or Ubuntu 22.04 or later, a domain name (or a free
  \`sslip.io\` name) and ports 80 and 443 open. One command installs the relay behind Caddy, with a certificate from
  Let's Encrypt and a random token. Every phone then uses \`wss://<your domain>\` and that token. The same command
  sets up the call relay for calls, which needs port 3478 and the UDP ports 50000 to 50999 open too.

Queues and waiting messages are kept on the server's disk, and so are the encrypted pieces of photos and files until
they are taken (1024 MB together at most), so a restart loses nothing, and no request is logged.
Messages sent for later are kept there until their time too, 10,000 or 256 MB at most: the relay sees when
each is to go, not what it says.

> Never post the token where others can read it. Whoever runs the server sees the IP addresses that connect, the
> queue ids, and when and how much arrives. They cannot read the messages, which are end-to-end encrypted.

## Home relay {#home-relay}

Under **Home relay** in the menu, a space can have a second relay with a queue of its own: one at home, on a
Raspberry Pi or an old computer, or any other relay you trust. It is optional.

- **What it does:** your contact link and every message say that queue beside your relay. While your relay cannot be
  reached, contacts write there, and Erevos takes what comes there with each look. What you send goes through it
  when your own relay is down.
- **How to set it up:** run a relay as in [Running your own relay](#own-relay), type its address (and token, if it
  has one) and choose **Save**. Contacts learn it from your next message to them, or from your new contact link.
- **What it sees:** what your relay sees, this phone's address when it takes messages, and when and how much comes.
  Hidden chats do not use it.
- **For hidden chats:** each hidden place can have a home relay of its own, under **Relay and new contacts** while it
  is open. It is kept with that place only, sealed with its PIN, so the space knows nothing of it, and it is looked
  at while the place is open. Use another relay than the space's: one relay seeing both queues would tie them
  together.

## Through Tor {#tor}

Under **Tor** in the menu, **Turn Tor on** sends every request of this space to its relays through the Tor network.
It is off unless you turn it on, and each space has its own switch.

- **What it hides:** the relay no longer sees your phone's IP address, only a Tor exit (or nothing, for a relay
  with a \`.onion\` address). Your phone company or the Wi-Fi sees only that you use Tor, not which relay.
- **What it costs:** messages come and go slower, and the first start of Tor takes a while. The screen shows how far
  Tor is.
- **What it does not cover:** calls, whose sound and picture go straight between the phones or through the call
  relay; nearby phones and SMS, which do not use the internet.

> While Tor is on, nothing goes to a relay without it. When Tor cannot reach the relay, the message waits and is
> tried again; Erevos never falls back to your own connection by itself.

### Bridges

Where Tor itself is blocked, **Bridges** on the same screen lets Tor reach its network through bridges instead. It
is **No bridges** unless you choose, each space has its own, and it counts only while Tor is on.

| Choice | What it is |
| --- | --- |
| **obfs4** | The obfs4 bridges Tor Browser comes with. To whoever watches the network, Tor looks like random bytes. A censor that knows them may block them. |
| **Snowflake** | Through volunteers' browsers, over WebRTC, the way a video call goes. To find one, Erevos asks Snowflake's broker through a CDN, behind another site's name, and STUN servers tell the phone its own address: they see that address, never your messages. Slower, and hard to block. |
| **My own** | Bridge lines from bridges.torproject.org, from bridges@torproject.org by email, or from @GetBridgesBot on Telegram, pasted one per line; then tap **Use these bridges**. obfs4, Snowflake, WebTunnel, meek and plain bridges work. |

- **Only through them:** with bridges, Tor never goes straight to its relays. When no bridge answers, messages wait,
  as they do when Tor cannot reach the relay. Lines that are not bridges are not taken, and Tor stays off.
- **Changing them** while Tor runs closes its connections and makes them again the new way.
- **On Android only:** the app carries lyrebird, Tor's own program for obfs4, Snowflake, WebTunnel and meek. A
  computer and the web app have no Tor yet, so no bridges either.

## SMS {#sms}

On Android, Erevos can be the phone's SMS app, under **SMS** in the menu. The home screen then shows SMS and Erevos
chats in one list.

- **SMS from before:** nothing to import. Erevos shows the SMS and MMS already on the phone, from Android's own
  store, where they stay for any other SMS app. Android keeps them, not sealed by Erevos, as with every SMS app.
- **If Erevos does not become the SMS app:** Android 15 and later can hold this back from an app installed from a
  browser. Under **SMS** in the menu, tap **Open Default apps** → **SMS app** → Erevos. If Android calls it a
  restricted setting, open **Erevos's App info**, tap **⋮** at the top right → **Allow restricted settings**, and
  choose Erevos again.
- **When an SMS comes:** a notice says "New message", without who sent it or what it says. If none comes, the
  **SMS** screen shows **Allow notifications** while Android holds them back.
- **If no SMS show:** Android 15 and later hold the SMS permission back from an app installed from a browser.
  Under **SMS** in the menu, tap **Allow SMS**. If Android calls it a restricted setting, open **Erevos's App
  info**, tap **⋮** at the top right → **Allow restricted settings**, and allow SMS under **Permissions**. Chats
  sent as RCS ("chat" in Google Messages) stay in that app and do not show. The **SMS** screen says how many SMS
  conversations Erevos reads, or why it could not read them.
- **Writing to someone with Erevos:** it goes through Erevos, end-to-end encrypted, once their number is linked to
  their contact. Link it by hand in the SMS conversation, or let a hidden invite find it.
- **Hidden invites:** with the first SMS to a number that is not a contact, Erevos also sends a short hidden
  invite. A phone without Erevos shows nothing; a phone with Erevos answers through the relay and the two become
  contacts. Each number is asked once a month at most, and **Turn invites off** stops them.
- **Everyone else:** a plain SMS, marked SMS. The phone company can read it, as it reads every SMS.
- **✓ and ✓✓✓:** an SMS of yours shows ✓ once it went, and ✓✓✓ once the network's delivery report says it reached
  their phone, or "not delivered". Some phone companies send no delivery reports; then it stays ✓. SMS cannot say
  whether it was read.
- **Photos (MMS):** **Photo** beside the message field adds a photo, made smaller to fit one MMS (about 280 KB),
  with nothing in it besides the picture. Photos that come by MMS show in the conversation. An MMS is as plain as an
  SMS: the phone company can see it.
- **Group MMS:** under **SMS** in the menu, type several numbers separated by commas and tap **Write**. Every
  message goes to all of them as one MMS, text alone too, and their answers come into the same conversation, each
  with who wrote it. Everyone in it sees everyone's number, and the phone company sees all of it.
- **Two SIMs:** the SIM to send on shows above the message field; tap **Choose the SIM** once to let Erevos see
  them. Your choice is kept for that number; until then, Erevos answers on the SIM the last message came on. Each
  message shows its SIM.
- **SMS later:** hold **Send** down and choose a time, as in a chat. The SMS shows at the end of the conversation
  marked **Scheduled**; tap it to cancel it. It goes at that time, with Erevos closed and locked too; if the phone is
  off then, as soon as it is on and unlocked again. Until then it is not in the phone's SMS, where other apps would
  see it, and the phone company does not have it. It waits locked with a key of the phone itself (Android
  Keystore), not with your space's password, as Android has to send it while Erevos is locked: the protection every
  SMS has once sent, as sent SMS stay in the phone's SMS. Text only, to one number.
- **Links:** a web address in an SMS is underlined, and opens as in a chat, once you have seen it whole.
- **Names from your contacts:** off at first, so SMS numbers show as numbers. **Names**, above the list, unlocks
  them (as does **Show names from my contacts** under **SMS** in the menu): the names your phone's contacts give SMS
  numbers, and the pictures they have for them, or else those of your contacts kept only in Erevos, in the list and
  in the conversation. Tap **Names** again for numbers only. Erevos only reads them to show them, and keeps no copy.
- **Senders with a name:** an SMS from a name instead of a number, like a bank's, opens to read, but cannot be
  answered.

### Keeping the SMS in order

- **Swipe:** in the list, swipe an SMS conversation to the right to archive it, or to the left to delete it.
  **Undo** shows for a few seconds after. Hold a conversation down for the rest: **Pin to the top**, **Archive**,
  **Mark as spam**, **Block** and **Delete**, and **Add to contacts** for a number that is none of your contacts. In
  a conversation, **⋮** at the top shows the same, and such a number has **Add to contacts** under its name too: a
  new contact with the number in it.
- **Pinned:** up to 10 SMS conversations stay at the top of the list, with a pin. **Unpin** lets one go back to its
  place.
- **Archived conversations:** out of the list, under **Archived** at the top of the home screen. One comes back to
  the list by itself when a new SMS comes from them, or with **Unarchive**.
- **Trash:** a deleted conversation waits in the **Trash** 30 days, then Erevos deletes it from the phone's SMS. Until
  then **Bring back** puts it back in the list; **Delete now** and **Empty the Trash** delete at once, for good. An
  SMS that comes after it went to the Trash shows in the list again. Only the SMS app may delete SMS.
- **Spam:** a filter that works on the phone alone, by rules, and sends nothing anywhere. An SMS from a number that
  is no contact and that you never answered goes to **Spam** when it has a link with words that try to fool, like a
  parcel held or a prize, or one of the words you add under **SMS** in the menu → **Spam filter**. **Mark as spam**
  and **Not spam** decide for a number for good. A notice still says "New message" when spam comes, as it shows
  before Erevos is opened.
- **Block:** **Block** in the menu of a conversation, or **Blocked numbers** under **SMS** in the menu, puts a number
  in Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, and every space and the phone app
  see the same list. Only the SMS app or the phone app may see and change it.
- **Drafts:** what you type and do not send stays with that conversation, and the list shows it as **Draft**. An SMS
  that could not go stays there as the draft too.
- **Taking an SMS back:** an SMS you send waits 5 seconds at the end of the conversation first: tap it then to take
  it back into the message field. Under **SMS** in the menu, **Taking an SMS back** sets **Off**, 5 or 10 seconds.
  When you leave Erevos, it goes at once.
- **Send again:** one of yours that did not go, or was not delivered, says so: tap it to send it again. Hold any
  message down for **Forward**, **Send again** and **Delete**, with its words to select and copy; a deleted message
  has **Undo** too.
- **Forward:** hold a message down → **Forward**, then type a number and tap **Write**, or choose a contact under
  **Into an Erevos chat**. It opens in that conversation, to read and send there. To a number its picture goes too,
  as an MMS; into a chat only its words.
- **Each space its own:** pins, archived conversations, the Trash, spam marks and drafts belong to the space, sealed
  with its password. The SMS themselves stay in the phone's SMS: another space sees them as they are, and one in the
  Trash here shows there until it is deleted from the phone.

## Phone {#phone}

On Android, Erevos can be the phone's phone app: under **Phone** in the menu, tap **Settings** → **Make Erevos the
phone app**. Every call then shows on Erevos's own call screen, and tel: links and the phone's call button open
Erevos's keypad. **Phone** opens from the handset at the top of the home screen too, and has an icon of its own in
the phone's apps, **Phone** with a handset on Erevos's icon, which opens the keypad. Each of these, like a tel: link,
opens it once Erevos is unlocked: with a password, after you type it, unless the Phone opens without it (see Erevos's
password, below).

- **The call screen:** who calls, or who you call, with the name and photo your phone's contacts give them; while
  Erevos is unlocked, a number linked to one of your Erevos contacts shows the name you gave them, and so does the
  number of a contact kept only in Erevos; that of a contact of open hidden chats, only while they are open. It shows over the
  lock screen and needs no password, as a call has to be answered with Erevos locked. A call that comes shows
  **Answer**, **Decline** and **Message**, and Android rings with the contact's own ringtone; the volume keys quiet
  it. In a call: **Mute**, **Keypad** for the tones a menu asks for, **Speaker**, **Hold**, **Add call** and **End**.
  At your ear the screen goes off.
- **Where the sound goes:** with a Bluetooth device or a headset, the button beside **Keypad** names where the sound
  goes, and a tap lets you choose: the phone, the speaker, the headset or the Bluetooth device.
- **A second call:** one that comes during a call shows **Hold and answer**, **End and answer** and **Decline**.
  With a call on hold, the line under the name says so: tap it, or **Swap**, to talk with the other. **Merge** puts
  the two in one call, when your phone company allows it.
- **Decline with a message:** **Message**, on a call that rings, declines it with a quick reply, or one you write,
  which your phone sends the caller as an SMS; it shows among your SMS. Under **Phone** → **Settings**,
  **Quick replies** changes them: **Add a reply**, **Remove**, **Save**, and **Use the usual replies**. They are kept
  on the phone, not sealed, as the call screen shows them with Erevos locked.
- **The keypad:** under **Phone**, type a number and tap **Call**; hold **0** for +. Held down, the number's field
  pastes one. **Add call**, during a call, opens it once Erevos is unlocked.
- **Two SIMs:** above **Call**, tap the SIM to call on; the first time, **Choose the SIM** asks Android to let Erevos
  see them. A number you call without choosing asks **Call on** which. Erevos keeps the SIM you used for each number,
  sealed in the space, and calls it on the same one next time. The call screen names the SIM of each call.
- **The calls:** under **Phone**, **Recents** lists Android's call history, newest first, under each day: who, what
  the call was, on which SIM, and how. **All**, **Missed**, **Incoming**, **Outgoing** and, once a call was blocked,
  **Blocked** filter it; with two SIMs, **SIM 1** or **SIM 2** keeps that SIM's calls. Calls one after another with
  the same number show once, with how many. **☏** calls back; a tap on the row shows its calls, how long each lasted,
  and **Call** (with two SIMs, one for each), **Send an SMS**, **Add to contacts** for a number that is none of your
  contacts, and **Change the number before calling**. Seen there, missed calls leave Android's notice, and that
  notice opens **Recents**.
- **Deleting calls:** in the row's calls, **Delete this call** (or **Delete these 3 calls**, for a row of several)
  deletes them from Android's call history, **Delete** beside one of several deletes only that one, and
  **Delete every call with this number**, when it has more, deletes them all, the older ones too. **Undo** shows for
  a few seconds first; until then they only hide.
- **Favourites:** the contacts starred in your phone's contacts, with their photos. A tap calls the contact's
  default number, or asks which when there are several and none is the default; held down, it shows them all.
- **Wi-Fi calling and HD voice:** the call screen says so under the name when a call goes over Wi-Fi or with HD
  voice, and **Recents** says it for each call.
- **Blocking:** under **Phone** → **Settings**, **Block telemarketing** blocks calls from the numbers some countries
  keep for telemarketing: France (01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24, 04 25, 05 68, 05 69, 09 48, 09 49
  and 09 475 to 09 479, by ARCEP's decision 2022-1583), Spain (400, since 17 October 2026), Chile (809), India (140)
  and Brazil (0303, which callers there may leave out since August 2025). Other countries keep no such numbers, or
  Erevos is not sure they do, so nothing is blocked for them. Under **Numbers starting with**, type the start of more
  numbers to block, with the country code (+33 162) or as you dial it here (0162), and tap **Block**; **Remove**
  takes one away. These never block a number in your phone's contacts. A blocked call does not ring and leaves no
  notice; it shows in **Recents**, under **Blocked**. Android asks once whether Erevos may screen calls
  (**Let Erevos screen calls**): without that, a blocked call rings a moment before Erevos ends it. What is blocked
  is the same in every space, so it tells nothing of another, and is kept on the phone with no names.
- **Blocked numbers:** under **Phone** → **Settings**, **Blocked numbers** is Android's own list, the same one as
  under **SMS**: type a number and tap **Block**, or tap one to unblock it. In **Recents**, a row's calls show
  **Block this number** or **Unblock this number**, with **Undo**. Android rejects their calls before they ring, and
  their SMS and MMS. Every space sees the same list.
- **A contact group for a while:** under **Phone** → **Settings**, **Block a contact group** lists the groups (the
  labels) of your phone's contacts. **Block** beside one blocks its contacts' calls **For an hour**,
  **Until tomorrow morning** (7:00) or **Until I lift it**; the line under the group says until when, and **Lift**
  ends it sooner. Such a call is blocked like the others: it does not ring, and shows in **Recents**, under
  **Blocked**. Erevos only reads the groups, and keeps the group's id and the time, not its name. While a group is
  blocked, the **Phone** screen says so at the top, until when, with **Lift**.
- **Erevos's password:** the **Phone** screen, with the keypad, the calls and the favourites, is behind it like the
  rest of Erevos. Only the call screen is not, unless you let the Phone open without it: under **Phone** →
  **Settings**, **Open the Phone without the password** (off at first, and shown only while Erevos has a password).
  With Erevos locked, the Phone's icon, a tel: link and the notice of a missed call then open the keypad,
  **Recents** and **Favourites**, which Android keeps for every phone app, with the names of the phone's contacts only:
  never those kept only in Erevos or of hidden chats, and no SIM kept for a number. There you can call, nothing more:
  no deleting, blocking, SMS or adding to contacts. **Open Erevos** at the top shows the password screen, as does
  Erevos's own icon after Erevos was in the background for more than 30 seconds, unless a call made there took it
  away. **Keep the Phone behind the password** turns it off.
- **If Erevos does not become the phone app:** as with SMS, Android 15 and later can hold it back from an app
  installed from a browser. Under **Settings**, tap **Open Default apps** → **Phone app** → Erevos. If Android calls
  it a restricted setting, open **Erevos's App info**, tap **⋮** at the top right → **Allow restricted settings**,
  and choose Erevos again. **Allow calls and contacts** shows while Android still holds back calls, the call history
  or the contacts.
- **After the phone restarts:** until you unlock the phone for the first time, Android's own call screen answers.
- **What a phone call is:** a plain phone call, as with every phone app: the phone company carries it and can
  listen. Calls to your Erevos contacts from a chat are another thing: end-to-end encrypted, through the internet.

## Contacts {#contacts}

On Android, **Contacts** in the menu shows the phone's contacts: the ones in Android's own contacts, which your
other apps use too, so there is nothing to import. Android asks once whether Erevos may read and change them
(**Allow contacts**). They open from the person at the top of the home screen too, and have an icon of their own in
the phone's apps, **Contacts** with a person on Erevos's icon, which opens them behind Erevos's lock: with a
password, once you type it.

- **Finding someone:** **Search contacts** looks in every field: names, numbers (however they are written, with or
  without the country code), emails, addresses, the company, the birthday and the note. **Favourites** shows only
  the contacts with a star.
- **A contact:** tap one to see all of it. Tap a number to call it, or **SMS** beside it to write to it in Erevos;
  tap an email or an address to open it. **Add to favourites** at the top gives it a star, in Android's contacts,
  so the phone app lists it among the favourites too.
- **New contact** and **Edit:** first and last name, company and job title, as many numbers, emails and addresses
  as you need, each with its kind (**Mobile**, **Home**, **Work**, **Other**), a birthday (day/month/year, or
  day/month) and a note. A new contact is kept **On this phone only**, or in an account the phone syncs contacts
  with (Google), as you choose. What Erevos does not show of a contact, such as another app's own details, stays as
  it was.
- **Photo:** tap the picture at the top of a contact to **Choose a photo** from the phone's photos, **Take photo**
  with the camera, or **Remove the photo**. You cut it square, and Erevos draws it anew, so nothing the photo said
  besides its picture (a place, a phone) is kept. It is kept with the contact in Android's contacts, where the phone
  shows it when they call.
- **Ringtone:** on a contact, **Choose ringtone** opens Android's own picker, with the phone's sounds and those you
  added; the phone rings with it when that contact calls. **Default ringtone** there gives back the phone's own.
- **.vcf files:** **Import from a .vcf file** in the menu of Contacts reads a vCard file that another phone or app
  saved (any of its versions, old Greek phones' too) and saves those not on the phone yet, with their photos and
  groups, on this phone only or in an account. **Save as a .vcf file** there saves the contacts shown (all of them,
  the favourites, a group, or what the search found) as one file, in a folder you choose; on a contact, it saves
  that one. The file is outside Erevos and not sealed: anyone who has it can read the contacts.
- **QR codes:** **QR code** on a contact shows its vCard as a QR code, which another phone's camera reads as a
  contact to add: its name, numbers, emails, addresses and note, without its photo (a long note or many addresses
  are left out to fit). Whoever sees it can read it. **Read a contact's QR code** in the menu reads one from a photo
  you take or choose, here on the phone, and starts a new contact with it, saved only when you save it. Someone's
  Erevos QR code starts one with their Erevos ID.
- **Duplicates:** **Find duplicates** in the menu lists the contacts that look like the same person kept twice: the
  same name (its words in any order), number or email. **Merge** keeps the fullest of them, with every number, email
  and address of the others, their notes, and their photo, ringtone, star and groups when it has none, and deletes
  the others; **Merge all** does so for every set. **Not the same** hides a set until you open the list again.
- **Birthdays:** the **Birthdays** chip under the search lists the contacts with a birthday, the next one first,
  with how many days are left and the age they turn. **Birthday reminders** in the menu (off at first) puts a notice
  on the morning of each one, from 9:00, even with Erevos closed; on the lock screen it says only that there is a
  birthday. They are the phone's contacts' birthdays only, never those of contacts kept only in Erevos.
- **SIM contacts** in the menu reads the contacts on the phone's SIM cards and copies those not on the phone yet
  (all chosen at first) into Android's contacts, on this phone only or in an account. The SIM keeps its own.
- **Only in Erevos:** under **Kept in**, a new contact can be kept **Only in Erevos** instead: sealed in this space
  like its chats, never in Android's contacts, so no other app or account sees it, and other apps show only its
  number; Erevos's call screen shows its name while Erevos is unlocked. It has a lock in the list, and the **Only in
  Erevos** chip shows just those.
  **Keep only in Erevos** on a phone contact moves it in, with its photo and star, and deletes it from the phone's
  contacts; **Move to the phone's contacts** takes it back out. Its photo is sealed with it. Groups, ringtones and
  birthday reminders are Android's, so it has none. A call or SMS to it still goes through the phone, and shows in
  the phone's call log and SMS like any other. An Erevos backup holds these contacts, sealed.
- **In hidden chats:** **Contacts** at the top of open hidden chats lists their own contacts, kept only there and
  sealed with them: they show nowhere else, not even in the space's contacts, and the screen shows nothing once the
  hidden chats close. A new contact there is always one of theirs. They take no photo, file or menu, as those leave
  Erevos, which closes the hidden chats; so does calling one, which goes through the phone app and its call log.
- **Erevos ID:** a contact's Erevos ID is the contact link their Erevos shows, under **Copy my contact link** or as
  their QR code. On a contact's card, or under **Erevos ID** when you write one, paste it, or read it with **Take a photo
  of the QR code** or **Choose a photo of the QR code**: **Add to Erevos** (or **Save**) adds them to your Erevos chats,
  which open with them, and links the contact to them. A contact that is an Erevos contact shows the start of their
  key as **Erevos ID**.
- **Erevos contacts:** a contact that is the same person as one of your chats' Erevos contacts shows as one card with
  it: by a number linked to them in Erevos, by their Erevos ID, or with **Choose from my Erevos chats** on its card, a
  link sealed in the space, never in Android's contacts (**Not this Erevos contact** undoes it). The card then has
  **Message**, **Call** and **Video**, end-to-end encrypted through Erevos instead of the phone company. A chats' contact that no contact is
  has a card of its own, with the shield, where **Add to contacts** makes one; the **Erevos contacts** chip lists them
  all. In hidden chats, these are the hidden chats' own contacts, and their chat opens there.
- **History:** a contact's card lists its latest calls in the phone's call log, its SMS and its messages in Erevos,
  the newest first; tap one to call back, write an SMS or open the chat. The calls show once you let Erevos read the
  call log (**Show calls**). Erevos only reads them to show them, and keeps no copy.
- **Other apps:** another app's **Add to contacts** (a number in the phone app, an email in mail) can open in Erevos:
  a new contact with what that app gave, or the list to tap the contact to add it to. An app that shows or changes a
  contact can open it in Erevos too, behind Erevos's lock. Android asks which app to use; choose Erevos. An app that
  asks you to pick a contact, or a number, email or address, gets only the one you tap, from the phone's contacts:
  those kept only in Erevos never show there.
- **Delete** takes the contact off the phone, from every account it is kept in; one kept only in Erevos, from Erevos.
- **Groups:** **Groups** in the menu of Contacts (the three dots) lists Android's own groups, such as Family or
  Work, with how many are in each, and makes new ones. Open one to **Add contacts**, take one out with **×**,
  **Rename** it or **Delete group** (its contacts stay). On a contact, **Choose groups** puts it in groups or takes
  it out. The chips under the search show one group's contacts. A group is kept in an account, as its contacts are:
  a contact joins it only if it is kept in that account too.

## Password lock {#lock}

Under **Lock and second password**, **Lock when Erevos opens** has two choices: **No lock** and **Password**.

1. Tap **Password**, type it twice (at least 4 characters) and tap **Save**.
2. From then on Erevos asks for it every time it opens, and again after 30 seconds in the background.
3. **Change password** changes it, and **Lock now** locks Erevos straight away.

- **Wrong passwords:** after 5 wrong tries, each further one makes you wait, 30 seconds at first and twice as long
  each time, up to an hour. The count survives a restart.
- **What is sealed:** each space's contacts, the keys of its conversations, its messages, its relay settings and its
  look are kept on the phone sealed with a key that only its password opens.
- **The list at once:** the home screen keeps a sealed copy of its first rows, so the list shows as soon as the space
  opens and then updates. It is always the same size, so it tells no one how many chats there are or which spaces
  are used, and it never holds what a disappearing message said.

> There is no way to recover a forgotten password: nothing is stored that could open the data without it. Only a
> fingerprint or face, while it is on, still opens the first space (see below).

### Screen privacy

With the password lock on, Android keeps Erevos out of screenshots, screen recordings and the recent apps: there the
last screen of Erevos shows blank, so whoever holds the unlocked phone a moment does not see your chats in it. Under
**Screen privacy**, **Turn off** lets screenshots work again (to send one, say), and **Turn on** brings it back. Hidden
chats always stay out of them while they are open, whatever the setting. The setting is the phone's, the same in
every space. On a computer and in the web app it does not exist.

### Fingerprint or face

On Android 11 and later, with a fingerprint or face set up in the phone's settings, Erevos can open with it too. It
is off unless you turn it on.

1. With the password lock on, under **Fingerprint or face**, tap **Turn on**.
2. Type the password of the space you are in, tap **Turn on**, and touch the sensor (or look at the phone).
3. From then on the password screen has a **Fingerprint or face** button. The password always works too, and
   **Turn off** turns it off.

- **Only the first password's space:** a fingerprint never opens the space of a second password, nor hidden chats.
  Turned on in the space a second password opens, it opens nothing: the first time it is tried it turns itself off,
  and the password opens Erevos. The setting looks the same in every space.
- **Under pressure:** someone who holds you can press your finger to the phone, or hold it to your face. If that may
  happen, keep it off: then they need a password, and you can give them the second one.
- **How it is kept:** the first space's key is sealed by a key in the phone's secure hardware (the Android Keystore)
  that works only right after a strong fingerprint or face check, once for each use. Adding or removing a
  fingerprint or face makes Android drop that key: it is then off, and you turn it on again. Nothing leaves the
  phone.
- **Which face:** a face counts only where Android rates its face unlock as strong, as on the Pixel 8 and later;
  elsewhere it is the fingerprint.
- **Wrong passwords** are counted as before: a fingerprint does not change the count.
- **Not on a computer or the web:** it is offered only on Android. Turning the lock off turns it off too.

## Second password {#second}

If someone forces you to open Erevos, type the second password instead of your own. It opens a separate, empty
Erevos with its own contacts, relay and look. Your real chats stay hidden, and nothing in the app shows that they
exist.

1. With the password lock on, tap **Set second password**.
2. Type it twice and tap **Save**. It must differ from your own password.

- **The look:** the second space starts with the look of the space it was set in, so it does not stand out.
- **One at a time:** setting a second password again replaces the one before. **Remove second password** removes it.
- **Discretion:** for privacy, the app never shows whether a second password is set.

## Hidden chats {#hidden}

Every space has 4 places for hidden chats, each opened only with its own PIN, and they never show among your other
chats. There is no button for them anywhere. Each place can hold one chat or several, so 2 spaces have 8 places.

1. Start a place in either of two ways: in **Lock and second password**, under **Hidden chats**, pick **Place 1** to
   **Place 4**, tap **Set hidden chats PIN**, type it twice and tap **Save**; or open a chat's **Details**, tap **Move
   to hidden chats**, type a PIN of 4 characters or more, tap **New hidden chats**, pick a place, then **Start and
   move**. Remember which places you use: for privacy, Erevos cannot tell which are free.
2. To open them, type the PIN in **Search chats** on the home screen and press Enter (the keyboard's search key). It
   opens only the place with that PIN. A wrong PIN is just a search: nothing happens.
3. They open as their own chat, titled **Hidden chats**, with **Change PIN** at the top. The back arrow closes them.
4. To move another chat into a place, open its **Details**, tap **Move to hidden chats**, type that place's PIN and
   tap **Move**. The
   chat leaves your list with its messages, name, picture and look, and its safety number stays the same. Their phone
   is told at once to write to the hidden chats from now on; a message they send in that very moment may not come.
5. To move a chat back among the space's chats, open it in the hidden chats, then its **Details**, tap **Move back to
   my chats** and **Move**. It goes with its messages, name, picture and look, and its phone is told where to write.

- **Relay only:** hidden chats have their own relay queue and their own keys, and never use the nearby link. While
  they are closed, their messages wait on the relay.
- **They close by themselves** when Erevos goes to the background.
- **Say when a message comes** (Android): turned on at the top of a place, while it is closed and Erevos is in the
  background a notice says only "New message", as for the other chats, until you open that place. It needs **Receive
  and ring** and **Say a message came** under **In the background**, and a relay that waits (from 18 October 2026 on).
  For it, the space keeps a relay queue for each of its 4 places, those not in use made for nothing on the same
  relay, so opening the space shows neither whether hidden chats are set nor which, as long as they use the space's
  relay; the relay is asked only whether
  something waits, never for the message. Whoever sees the notice and finds nothing new in your chats may guess there
  are more. Backups do not keep it: turn it on again after restoring.
- **A new PIN for a place** (from Lock, or **New hidden chats**) starts it empty and replaces what was in it. To keep
  them and change only the PIN, open them and use **Change PIN** there. Each PIN must differ from the others and from
  the password that opens Erevos.
- **Wrong PINs in the search** are counted apart from the lock screen's: after five, searches stop trying for a while,
  silently, and the lock screen never waits because of them.
- **Discretion:** every space has all 4 places from the start, the unused ones filled with random data that looks
  like used ones, and the search tries every place each time. So nothing shows whether any hidden chats are set, or
  how many.

## Backups {#backup}

A backup is one file holding everything Erevos keeps on this phone: every space, with its contacts, the keys of its
conversations, its messages, voice messages, imported chats and hidden chats, and the lock. Inside it each space stays
sealed with its own password, and the file is sealed again with a password of its own. It is under **Backups** in the
home screen's menu.

1. **Make a backup:** tap **Make a backup**, choose a folder (on the phone, a memory card, or a cloud app that shows
   its folders there; on a computer, any folder), type a password for the backup twice (at least 12 characters, or
   four words) and tap **Save**.
2. **Automatic backups:** choose **Every day** or **Every week**, then a folder and a password. Erevos makes one when
   it opens and the last one is older than that, and the folder keeps the 3 newest. Under them are **Back up now**,
   **Change folder** and **Change password**; **Off** stops them, and the ones made stay in the folder.
3. **Restore:** tap **Restore a backup**, choose the file and type its password. Erevos asks once more, then puts the
   backup in place of everything on the phone, and opens as it was when the backup was made, with the passwords used
   then.

- **Keep the backup's password:** nothing opens a backup without it, and no one can recover it. Without a password
  lock, the backup's password is all that protects it. Whoever has the file can try passwords on it as fast as their
  computer goes, with no phone to slow them down, so a short one does not hold: Erevos takes none under 12 characters.
- **Automatic backups keep their password on the phone,** so they need no password each time. Whoever opens their
  folder still needs the spaces' passwords to read the chats.
- **Chats that went on after the backup:** restoring puts back each conversation's keys as they were then. Messages
  that came after the backup and were already read are not in it, and a chat that went on may stop opening new
  messages. Then ask the contact for their contact link again. Before a restored chat writes again, its conversations
  skip ahead past the keys they may have used since the backup, so no key ever seals two messages: one sealed twice
  would let whoever kept both packets read the two together.
- **One phone at a time:** a backup restored on a second phone reads the same relay queues as the first, and each
  takes messages the other then never gets. Use it to move to a new phone, not to keep two.
- **Discretion:** every space shows the same Backups screen, and a backup holds every space, so neither tells how
  many spaces there are or whether hidden chats are set. The file's name says it is an Erevos backup, and its size
  shows roughly how much is kept.
- **The phone's SMS:** on Android, **Put the SMS in backups** adds the phone's SMS and MMS to each backup from then
  on, with up to 32 MB of their pictures, while Erevos is the SMS app. They are sealed with the backup's password like
  the rest. Restoring the backup puts back into the phone's SMS each message it does not have yet, and deletes none;
  Erevos has to be the SMS app then too, or the rest is restored without them. The SMS are the phone's, the same in
  every space. An older Erevos does not open a backup that holds SMS.
- **The SMS in order:** each space's pins, archived conversations, Trash, drafts, spam filter and marks, and how long
  an SMS waits to be taken back are in every backup, sealed with the space's password like the rest. The SMS sent
  later (**SMS later**) are not, so a backup restored on another phone never sends one again; nor are invites, names
  from your contacts and the SIM chosen for each number. An older Erevos does not open a backup that holds them; one
  made by an older Erevos restores as ever, without them.
- **Not in a backup:** photos and files, not yet: a backup is made in the phone's memory, and they would not fit. A
  backup restored on the same phone shows them again; on another phone they show as not on it. Also left out: the
  count of wrong passwords, and how automatic backups are set.
- **Linked devices** are not in a backup: a link stays with the phone and the computer it was made on. After restoring
  a backup on another phone, link the computer again: on the computer, tap **Unlink this device**, then link it as the
  first time, see [Linked devices](#devices). A linked computer's own backup holds the phone's chats as they were, but
  not the link to write in them: restored, they can be read there but not written in, and Erevos says so once. To write
  in them, link that computer to the phone again: the chats the phone still has stay, with what came since, and the
  others go. On the phone, unlink the device it was before. Make the backups on the phone.
- **A backup from a newer Erevos:** Erevos 0.1.8 and later open it too, and restore all of it they know; before
  that, they say some of it stays out. Update Erevos first to restore all of it.

## Imported chats {#import}

Your old chats from Telegram and WhatsApp can come into Erevos, to read, with their photos, videos, voice messages and
files. They stay on this phone, sealed in the space you bring them into, and are never sent anywhere.

First export the chat from the other app:

- **WhatsApp:** open the chat, then **More**, **Export chat**, **Include media**, and save the .zip to the phone.
  **Without media** brings only the words.
- **Telegram Desktop:** **Export chat history**, format **JSON**, with the photos, videos, voice messages and files you
  want. Then make a .zip of the folder it made (on Windows: right-click it, **Send to**, **Compressed (zipped) folder**)
  and copy the .zip to the phone. **result.json** on its own brings only the words.

Then:

1. In Erevos, open **Imported chats** and tap **Import a file**, then pick the file.
2. Erevos says what it found, with how many photos and files and how large they are together. Tap your own name, so
   your messages show on the right, and tap **Keep**. The files come in one after another, and it says how far it is.
3. Delete the export file from the phone yourself: Erevos keeps its own sealed copy, but the file you saved is not
   sealed.

To go on with the conversation in Erevos, the other person needs Erevos too:

1. With **New chat**, add them as a contact through the relay, as in [Chat through a relay](#relay).
2. Open the imported chat, tap **Continue in Erevos** and pick them.
3. Their chat now shows the old messages ahead of the new ones, a little fainter, with **Continued in Erevos**
   between them. **Open the chat** takes you there, and a contact you have not named takes the imported chat's name.

- **Photos, videos, voice messages and files** come in from a .zip, each sealed in this space as a file in a chat is.
  Photos show in the chat; tap any of them to see it on its own and **Save** it, to play a video or voice message in
  the phone's own app. Files larger than 1 GB, and those the export does not hold, stay behind, and the chat says where
  one was.
- **Room on the phone:** while a .zip comes in, the phone needs about twice its size free, as Erevos reads a copy of it
  and keeps the files sealed. Imported files are not in backups yet, as other files are not.
- **Only on this phone, only to read:** imported messages are never sent, so the other phone does not get them. Erevos
  cannot show who really wrote them.
- **Notices and calls** from the other app are left out, and the chat says how many.
- **Only a space's own chats** can go on from an imported chat, not hidden chats.
- **Delete messages** in a chat leaves the imported ones: delete those in **Imported chats**. **Unlink** there stops
  them showing in the chat.
- **Viber** is not read yet.

> The file of imported chats grows with what you bring in, so its size tells roughly how much was imported, but not
> into which space.

## Appearance {#appearance}

**Appearance** follows LPHL FASOULI and the LPHL site.

| Setting | Choices |
| --- | --- |
| **Look** | **Flat**, or **Glass** as on lphl.nekten.eu. Glass comes in two kinds: **Panes** (each card a pane of glass over the wallpaper) and **One pane** (each screen on one frosted pane). |
| **Style** | **Classic** (Erevos's dark and gold), **Modernist** (Inter Tight), **Nocturne** (always dark, with its own colours), **Neon** (cyan and magenta LEDs that glow, over a grid running to a setting sun), **Matrix** (green on black in monospace, with code raining behind), **Paper** (fountain-pen blue on cream, in a serif, over ruled lines with a red margin), **Aurora** (violet on near-white, soft and round, over pools of mint, lilac and peach light), **Material You** (the phone's own colors, on Android 12 and later) and **Custom** (your own background and accent). |
| **Theme** | **System**, **Light** or **Dark**. Nocturne, Neon and Matrix are always dark, Paper and Aurora always light, and Custom is light or dark as its background is. Material You follows it. |
| **Colors** | The style's own, one of the twelve LPHL palettes, or **My color**. Choosing a palette under a style with its own colours goes back to the style chosen before. |
| **Custom** | With **Custom** chosen: its **background** (eight light, eight dark) and its **accent**. The text and the surfaces are made from the background, and every color is checked to read on it. |
| **Text on colored areas** | **White**, **As in the palette**, or **My color**. |
| **Wallpaper** | What lies behind every screen: **Style default** (the style's own scene or glow), **Plain**, or a pattern drawn faintly in the accent: **Dots**, **Grid**, **Stripes**, **Stars**, **Lights** (soft circles of light) or **Gradient**; or **Photo**, a photo of your own, made smaller, drawn anew and sealed, under a veil so the text reads (**Change photo** picks another). The password screen shows the style's own instead. |
| **Messages** | How a chat draws messages: **Round** bubbles, **Square** ones, or **Line**, no bubble but a line beside the text, as a log. |

Neon, Matrix, Paper and Aurora draw their own scene behind every screen, Custom keeps the background you chose and
Material You the phone's colors, so **Glass** waits while they are chosen. The rain stands
still when the phone is set to reduce motion.

The **Preview** shows a few messages and buttons in the look you chose. Every combination is checked so that text
always reads well, on glass too.

- **Each space keeps its own look.**
- **The password screen** shows the look last used. To do so it is kept outside the sealed data: it says nothing
  about your chats, but whoever opens the phone sees which look you use.
- **Material You** takes the colors Android makes from your wallpaper (Android 12 and later), light or dark as
  **Theme** says, with round buttons and softly rounded cards, in the phone's own font. A new wallpaper changes them
  in Erevos too, once it shows again. They are read on the phone and go nowhere. On older Android and on a computer
  it is not offered.

## On a computer {#desktop}

Erevos also runs on a computer, Linux, macOS or Windows, as an app of its own. It chats through a relay, end-to-end
encrypted as on the phone, and keeps its contacts, messages and settings sealed the same way.

1. Install it. On Linux: the package for Arch-based systems (\`erevos-linux-x86_64.pacman\`, with \`sudo pacman -U\`) or the
   AppImage. On a Mac: open the disk image and drag Erevos to Applications. It has no paid Apple signature, so the
   first time allow it under **System Settings → Privacy & Security → Open Anyway**. On Windows 10 or 11: run
   \`erevos-windows-x64-setup.exe\`, which installs Erevos for you alone, with no administrator, and puts it in the
   Start menu; or keep \`erevos-windows-x64-portable.exe\` where you like and run it, with nothing installed. Neither
   has a paid signature, so the first time Windows says it protected your PC: tap **More info**, then **Run anyway**.
2. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay). **Copy my contact link** copies
   your link, to paste where it should go.

- **What only the phone does:** Bluetooth, Wi-Fi Aware and LoRa, and their tests. Contacts on the same Wi-Fi it reaches
  as a phone does, see [Chat with a nearby phone](#nearby). The rest is the same: spaces and the second password,
  hidden chats, voice messages, imported chats and backups.
- **Where it keeps things:** in its own folder (on Linux \`~/.config/Erevos\`, on a Mac
  \`~/Library/Application Support/Erevos\`, on Windows \`%APPDATA%\\Erevos\`), sealed as on the phone. Its keystore is
  sealed with the system's keyring (on a Mac the Keychain, on Windows the key of your Windows account). A Linux system
  without a keyring keeps it as it is: set a password lock there. The portable Windows app keeps its things in the
  same folder as the installed one, and uninstalling leaves them there.
- **Windows' firewall** asks, the first time Erevos opens, whether it may use the network. Allow it on private
  networks, or phones and computers on the same Wi-Fi cannot reach it; relays work either way.
- **Voice messages** recorded on a computer are Opus, on a phone AAC. Both play on both.
- **Photos** come from the computer's files; there is no camera. **Save** asks where to put a photo or file.
- **A computer and a phone can share an account:** link the computer to the phone, and both have the same chats and
  contacts, see [Linked devices](#devices). Or a backup moves everything from one to the other, see
  [Backups](#backup), and from then on use only the one.
- **Tested so far** on Linux. The Mac and Windows versions are built and opened on GitHub's computers, not yet by a
  person.

## Linked devices {#devices}

The same account on the phone and on a computer, or in a browser: the same chats, contacts and messages on both. The
phone stays the account. It alone holds the keys of each conversation with a contact: it passes on to the computer,
end-to-end encrypted, what comes and what it sent, and seals for the contact what the computer writes. Contacts see
nothing new: the same account and the same safety number, whatever version of Erevos they have.

To link a computer:

1. On the computer, in a space with no chats of its own (a new install, a space a new password opens, or a linked
   computer's chats restored from its backup), open **Linked devices** in the menu. Fill in the relay if it asks, name the device, and tap **Link to my phone**. It
   shows a QR code.
2. On the phone, scan the code with the camera: Erevos opens on **Linked devices** with it. Or copy the code on the
   computer, paste it on the phone under **Code from the computer**, and tap **Next**.
3. The phone shows the computer's name and a code of four groups of five digits. Choose what of the history goes
   (**All of it**, **The last month**, **The last week** or **None**) and whether **Photos and files too**, then tap
   **Link**.
4. The computer shows a code too. If it is the phone's, tap **They match**. If not, tap **They differ**: someone else
   may have read its QR code, and nothing went to them.

The chats then come to the computer, and after them the messages chosen.

- **Messages** from contacts come to both. What you write on the computer goes through the phone: the phone shows it
  as yours, and the contact gets it from the account. What you write on the phone shows on the computer too. Read
  marks, reactions, pins, votes, deleting from both phones, names, timers, chat looks and pictures, appearing offline
  and accepting requests go both ways. A star, or deleting on **This phone**, done on the phone goes to the computer
  too; done on the computer, it stays there.
- **The phone has to be on** and reach the relay for the computer to send and receive. What the computer writes
  meanwhile waits on the relay, and goes once the phone is back.
- **Photos and files** that come stay on the relay until both the phone and the computer took them; then the phone
  deletes them there. One the computer never takes goes when it is unlinked, or after 14 days, as any not taken.
- **Calls** ring on the phone and on the computer. Answer on either: the other stops ringing, and says it was
  answered on another device. Turning a call down on one turns it down on both. The computer calls through the phone
  too; the call itself then goes straight between the computer and the contact, encrypted between them, and the phone
  has to stay on only to set it up.
- **Groups** are on the computer too, with their messages, photos, files and voice messages. Write in them, answer,
  react, vote, pin, delete your own for everyone, add and take out members, rename one or leave it, there as on the
  phone: the phone does it for the computer, as its own. A photo or file the phone keeps goes to the computer as a copy
  on the relay, deleted there once the computer took it. What the members do later to a message (react, vote, pin,
  delete it for everyone) shows on the computer too, as does a star or deleting on **This phone** done on the phone. A
  message the phone could not send to the group (one closed meanwhile, say) shows on the computer as **Not sent by the
  phone**. Making a group, public groups and group calls stay on the phone for now.
- **Hidden chats and second passwords** are never linked. A chat moved into hidden chats on the phone leaves the
  computer. A space a second password opens links only from inside it, to devices of its own.
- **Bring over messages again**, on the phone, sends a period of the history again, with its reactions, pins, votes
  and stars; what the computer has already is not kept twice.
- **Unlink**, on the phone, cuts a device off at once: nothing more goes to it, and nothing it sends is taken. That is
  how to cut off a lost computer. If it is on, it is told, and the account's chats leave it. On the computer,
  **Unlink this device** does the same from there.
- **Up to four** devices link to one phone. A backup does not carry the links: after restoring one on another phone,
  tap **Unlink this device** on the computer and link it again, see [Backups](#backup).

## On an iPhone, from the browser {#iphone}

Erevos has no App Store app. On an iPhone it runs as a web app, added to the home screen from Safari, with no Apple
account. It chats through a relay, end-to-end encrypted as on the phone, and keeps its contacts, messages and settings
sealed the same way, in Safari's storage for the app.

1. Open the address of the Erevos server you were given in **Safari**. Erevos shows how to add it: tap **Share**,
   then **Add to Home Screen**, then open Erevos from the home screen. Needs iOS 17 or later.
2. In Erevos, open **Lock and second password**. Under **This web app** compare the release key's fingerprint with
   the one you were given with the address, character by character. If it differs, delete the app and tell whoever
   gave you the address.
3. Set a password lock (**Lock and second password**). On the web it matters most: see below.
4. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay).

**How it checks itself.** A web app is code the server sends, so a server that is broken into, or ordered to, could
send changed code. Erevos does not take that code on trust:

- The first time it opens, it fetches its code with a list of every file and its fingerprint, signed with the
  release key, which only the person who makes the releases holds; the server does not have it. It checks the
  signature and every file, keeps them on the iPhone, and from then on runs only those. The server cannot change them.
- An update is taken only if it is signed with the same key and newer than the one in use; it starts the next time
  Erevos opens. An unsigned or older one is refused, and Erevos says so.
- Whoever wants to can check the server: \`node pwa/release.mjs verify https://<address>\` checks the signature and
  every file the server gives out.

**What is left.** These are real limits; know them:

- **The first time** you open it, you trust the server: it is the one that sends the checking part. Step 2 is how
  you catch a wrong one.
- **The checking part itself** (the service worker) is fetched again by Safari at least once a day, and Safari can
  replace it without asking Erevos. Erevos then checks the new one against the signed release and warns you
  (**Erevos was tampered with**), but a server that knows how could get past that check. If you see the warning, do
  not open Erevos from that server again until it is explained. With a password lock your chats stay sealed.
- **No Bluetooth or nearby link** and no SMS: Safari does not allow them.
- **Only while it is open:** iOS stops web apps in the background, so messages arrive when you open Erevos; they wait
  on the relay until then.
- **Notifications** while Erevos is closed are off unless you turn them on: **Lock and second password → Notifications
  while closed → Turn on** (iOS 16.4 or later, from the home screen). When a message comes, your relay sends an empty
  push through Apple, and Erevos shows **New message**, nothing more. Apple sees when something comes for your iPhone,
  and that it uses Erevos, never what or from whom. They are per space, never for hidden chats, and your relay must be
  set up to send them.
- **Backups** are made by hand: **Make a backup** saves the file through the share sheet (Files, iCloud Drive or
  another app). A browser gives out a file only after a tap, so there are no automatic backups.
- **Voice messages** recorded on an iPhone are AAC; they play everywhere.
- **Apple** makes Safari and could change it, as with any app on an iPhone.

## On Sailfish OS {#sailfish}

On a Sailfish OS phone Erevos is an app of its own: the same app as in the browser, shown by Sailfish's own browser
engine inside a Sailfish window, with its code installed with the app and not fetched from a server. It chats through a
relay, end-to-end encrypted as on the phone, and keeps its contacts, messages and settings sealed the same way.

1. Allow apps from outside the Jolla Store: **Settings → Untrusted software → Allow untrusted software**.
2. Copy \`erevos-sailfish-aarch64.rpm\` to the phone (Downloads) and tap it in **Files**, then **Install**. From a
   terminal (Developer mode) it is \`pkcon install-local erevos-sailfish-aarch64.rpm\`. Needs Sailfish OS 5 in its
   64-bit (aarch64) version.
3. Set a password lock (**Lock and second password**). See below why it matters here.
4. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay).

- **What only Android does:** the nearby link (Bluetooth and Wi-Fi Aware), LoRa and SMS. The rest is the same: spaces and
  the second password, hidden chats, voice messages, imported chats and backups.
- **Where it keeps things:** in \`~/.local/share/erevos\` on the phone, sealed as on the phone. Sailfish has no
  keyring for apps, so the keystore is kept there as it is, readable by your user only: the password lock is what
  seals it.
- **Backups** go to \`Documents/Erevos\` on the phone, by hand or every day; copy them from there to a memory card or
  another device. **Save** puts a photo or file in Downloads.
- **Only while it runs:** when Erevos is closed, messages wait on the relay until it opens.
- **Tested so far** on Sailfish's browser engine (Gecko 91) on a computer, chatting with a browser through a relay.
  Not yet on a Sailfish phone.

## Updates {#updates}

Erevos never looks for updates on its own: a regular check would tell the place it asks, every day, that this phone
or computer has Erevos. It asks only when you tap the button, as in LPHL FASOULI:

1. Open **Updates** in the home screen's menu (or **Check for updates** at the bottom of this guide's first screen).
   It shows the version you have, **Erevos 0.1.N**.
2. Tap **Check for updates**. GitHub then sees this device's internet address, nothing else. While Tor is on in the
   space, Erevos does not check, since that would go around Tor.
3. When there is a new version: on Android tap **Install**. It downloads, is checked against the release (its size and
   SHA-256), and Android's installer opens: tap **Install** there. The first time, Android asks to allow installing
   apps from Erevos. On a computer and Sailfish OS, **Open download page** opens the releases page: take the file
   Erevos names, the one of the package you have, and update as in the table below.

The rest of this section is for updating by hand.

**Where new versions are:** on Erevos's releases page, \`https://github.com/azzinder/erevos-releases/releases\`. The newest is at the top, **Erevos 0.1.N**, with a file for each
system. The five newest stay there.

**Check the file** if you can, on a computer: each release has \`SHA256SUMS\`, and in the folder with the downloaded
files \`sha256sum -c --ignore-missing SHA256SUMS\` must say **OK** for each.

**Make a backup first** (**Backups → Make a backup**), see [Backups](#backup). An update keeps everything, but a backup
costs a minute and covers any surprise.

| On | How to update |
| --- | --- |
| **Android** | **Updates → Check for updates → Install**, or by hand: open the releases page on the phone, tap \`erevos-android.apk\`, then **Install**. It installs over the one you have and keeps everything. Allow installing from the browser once, when Android asks. |
| **Linux, Arch-based** | \`sudo pacman -U erevos-linux-x86_64.pacman\` |
| **Linux, AppImage** | Replace the old \`erevos-linux-x86_64.AppImage\` with the new one and make it executable. |
| **macOS** | Open \`erevos-macos.dmg\` and drag Erevos to Applications, **Replace**. Then allow it again under **System Settings → Privacy & Security → Open Anyway**. |
| **Windows, installed** | Close Erevos and run the new \`erevos-windows-x64-setup.exe\`: it installs over the one you have. Windows may warn again: **More info**, then **Run anyway**. |
| **Windows, portable** | Close Erevos and put the new \`erevos-windows-x64-portable.exe\` in the place of the old one. |
| **Sailfish OS** | Tap \`erevos-sailfish-aarch64.rpm\` in **Files**, then **Install**, or \`pkcon install-local erevos-sailfish-aarch64.rpm\`. |
| **iPhone, browser** | Nothing to do: the web app takes a new signed version by itself when it opens, see [On an iPhone](#iphone). |

- **Contacts, chats and settings stay** on every system: they live in Erevos's own folder, not in the app.
- **Android, the first time from the releases page:** an Erevos built on a computer for testing is signed with
  another key, and Android refuses to install over it (**App not installed**). Make a backup, uninstall Erevos,
  install the one from the releases page and restore the backup. After that, every update installs over it.
- **Never older:** do not install an older version over a newer one. Its data may be in a form the older one cannot
  read. Restore a backup made with that older version instead.
- **A release that lacks your system** says so in its notes: that build failed, so take the release before.

## The test screens {#tests}

Two screens in the home screen's menu are there to test the connections, step by step.

- **Radio test (Android):** **Permissions** asks Android for what the radio needs, **Start** and **Stop** turn
  Bluetooth and Wi-Fi Aware on and off, **Send hello** sends a plain test message to the nearby phone's Radio test (a
  chat does not show it), and the **Log** shows what happened.
- **Relay test (Wi-Fi):** **Create queue** makes a queue on a relay and shows two ids. Give the **sender id** to
  the phone that writes to you, and keep the **recipient id** private. **Send** and **Receive** move messages by hand.

> With one phone you can still try a chat through the relay: your chats and your **Hidden chats** each have their
> own relay queue and their own keys. Create both queues on the same relay, tap **Share my contact link** in one and
> copy it, then add it in the other, and write both ways. A chat's own link is refused as a contact.

## What is protected today {#privacy}

Erevos says plainly what it protects and what it does not, yet.

| What | Today | Coming |
| --- | --- | --- |
| **Account, phone number, email** | None needed. Contacts are pairs of one-way relay queues. | |
| **Contacts and their names, keys, relay settings, look** | Sealed on the phone with each space's key. | |
| **Messages through a relay** | End-to-end encrypted: PQXDH with ML-KEM-768 to start, then the double ratchet. The relay cannot read them. Not audited yet. | An outside audit. |
| **Messages to a nearby phone** | End-to-end encrypted, the same as through the relay. Whoever listens nearby can tell that Erevos phones are near each other, and when and how much they send; on the same Wi-Fi, so can anyone on it, and over Wi-Fi Direct anyone who joins the phones' own Wi-Fi. Until your contact's phone is known, the other Erevos phones linked nearby get your short messages, sealed. | |
| **Messages carried by other phones** | Sealed twice: end-to-end for your contact, and for their relay. A phone that carries one sees which relay it goes to, when, and how big; not who it is from or for. Its relay sees which relay it goes to, and that relay sees the carrier's relay, not its phone. Kept sealed on the phone, three days at most: those for others in a file of the phone's, whose size shows roughly how many; your own in your space, sealed with its key. Hidden chats are never carried. | |
| **Messages over LoRa** | End-to-end encrypted, the same as through the relay. Anyone with a radio, kilometres away, can tell that yours sends, when and how much, and its signal can be traced to where it is. Erevos keeps your radio from saying its name and where it is (role Client hidden, GPS off, no fixed position) unless you let it; it still answers a radio that asks its name. Every Erevos on the mesh gets your LoRa messages, sealed. | Setting the radio's name from Erevos. |
| **Who talks to whom** | The relay sees IP addresses, queue ids, and when and how much. With a second relay, your relay never sees your address. From a place lent on a contact's relay, every relay you send to sees it. [Through Tor](#tor), off unless turned on, no relay sees it, and with bridges, for where Tor is blocked, the network sees only a bridge. Snowflake's broker and STUN servers see your address. | Tor on a computer. |
| **SMS** | A plain SMS is read by the phone company, as every SMS. To a number linked to an Erevos contact it goes through Erevos instead. A hidden invite is one more short SMS the phone company sees. | |
| **The phone's contacts** | In Android's own contacts, not sealed by Erevos, as with every contacts app: every app allowed to read them sees them, and an account (Google) may sync them. Erevos sends them nowhere. A .vcf file saved from them is outside Erevos, not sealed. A contact's calls and SMS are read from the phone's own call log and SMS only to show its history, and kept nowhere. | |
| **Contacts kept only in Erevos** | Sealed with the space's key, or with the hidden chats' for theirs, in one file for every space whose size shows roughly how many there are in all, not whose they are; their photos each in a file of its own. Never in Android's contacts. Calls and SMS to them go through the phone, and show in its call log and SMS. | |
| **Phone calls** | Plain phone calls: the phone company carries them and can listen, as with every phone app. Android keeps the call history, not sealed by Erevos, as for every phone app; Erevos reads it, and the favourites, to show them, deletes from it only the calls you delete, and keeps no copy. The SIM chosen for each number is sealed in the space; the quick replies, and what is blocked (prefixes, group ids and times only, the same for every space), are kept on the phone, not sealed. | |
| **Imported chats** | Sealed in the space they were brought into, their photos and files too, each in its pieces as a chat's file is. The file's size, and how many pieces there are, tell roughly how much was imported, not where. | Viber, and files over 1 GB. |
| **Message history** | Kept on the phone, sealed in its space, with no limit, in same-size pages mixed for all spaces. Only how much it all takes shows, not which space it belongs to. Deleting on both phones, and disappearing messages, rely on the other phone's Erevos. | |
| **Nearby messages** | Open only in the space that has the contact. One for another space waits in memory, six hours at most, until that space opens. Hidden chats never use the nearby link. | Hidden chats nearby. |
| **Voice messages** | End-to-end encrypted through the relay or nearby, in pieces: the relay, or whoever listens nearby, can tell roughly how long each is. Each sound is sealed in a file of its own; how many files there are, and their sizes, show roughly how many are kept, not in which space. Unsealed in the cache only while it plays. | Sound files all of one size. |
| **Photos and files** | End-to-end encrypted, through the relay's file store, in pieces of one size: the relay sees how many and when, so roughly how big. Your relay sees your address, as for messages; the contact takes them through their own relay. Photos lose their place, phone and time, unless sent as a file; a file keeps what it says inside. Sealed on the phone in their pieces, shown from memory. Saved copies are outside Erevos. Not in backups yet. | Backups that hold them. |
| **On a computer** | Sealed as on the phone, in the app's own folder. Its keystore is sealed with the system's keyring (on Windows, your account's key); a Linux system without one keeps it as it is. | |
| **Backups** | One file sealed with its own password, holding every space as it is sealed on the phone. Its name says it is an Erevos backup, and its size shows roughly how much is kept. Automatic backups keep their password on the phone. | Backups straight to Nextcloud or WebDAV. |
| **Marks ✓✓ and ✓✓✓** | The contact's phone learns when yours got and read their messages, encrypted. The relay, or whoever listens nearby, sees one more small message. | A switch to stop telling when you read. |
| **Fingerprint or face (Android)** | Off unless turned on. Opens only the first password's space: its key sealed in the Android Keystore, usable only right after a strong fingerprint or face check, and dropped when they change. Someone who holds you can use your finger. | |
| **Notices (Android)** | In the background: "Erevos", "Incoming call", and "New message" or how many came, never who or what. On a locked phone the one for messages says only "Erevos". Hidden chats that may say so show the same "New message": whoever sees it and finds nothing new may guess there are more. As the phone app, the notice of a phone call names who calls, over the lock screen too, as every phone app's does, but never by a name only hidden chats know: a call from one of their contacts shows the number. | |
| **Widget and Phone (Android)** | The widget, once added, shows how many missed calls, unread SMS and new messages there are, never who or what. The Phone opens without the password only if you let it: then anyone holding the unlocked phone sees the calls and favourites Android keeps, with the names of the phone's contacts only. | |
| **Calls** | End-to-end encrypted (DTLS-SRTP, its key sent in the encrypted chat). Through the call relay, neither phone sees the other's IP address; the server running it sees both, when and how long, and how much passes. Without a call relay, on the same Wi-Fi only, each phone sees the other's address. | Ringing on a computer and in the web app while closed. Calls over Bluetooth (the walkie-talkie works there). |
| **Group chats** | End-to-end encrypted with MLS (RFC 9420); members taken out read nothing after. Each member's copy is sealed apart, so relays cannot tell who is in a group; each relay still sees a message reach a queue. Members see each other's keys and relay addresses. Photos, files and voice messages go through the sender's relay's file store, as to a contact, and stay there 14 days. Not audited. | |
| **Group calls** | Voice and video, end-to-end encrypted between each two phones in the call (DTLS-SRTP, its keys sent in the group's encryption). Through the call relay, no phone sees another's IP address; the server running it sees each phone's, when and how long, and how much passes. Every member, in the call or not, learns who is in it. | Video with more than four people, through a server; more than eight people. |
| **Public groups** | As group chats, and anyone with the link can ask to join and read from when let in. Requests come to the owner's relay sealed for the owner's phone: the relay sees how many and when, not from whom. Members see each other's chosen names, keys made for that group alone, relay addresses and queue sender ids. Not audited. | |
| **Link previews** | Off unless turned on. Then, as you send a link, your phone fetches its page straight from the site, which sees your IP address and when, not who the message is for. The preview goes inside the encrypted message; the phone that gets it fetches nothing. None while the space goes through Tor, and none in hidden chats. | Previews through Tor. |

## What is coming {#coming}

End-to-end encryption is here, through the relay and over the nearby link, and most of what follows is built on it.

- **More ways to stay in touch:** Tor bridges for where Tor is blocked are here, see [Through Tor](#tor). Next: Tor
  on a computer.
  - **LoRa radios (Meshtastic):** here, see [Over a LoRa radio](#lora). Next: setting the radio's name from Erevos.
  - **SMS:** Erevos as the SMS app is here, with MMS photos, group MMS and two SIMs, see [SMS](#sms).
  - **Phone:** Erevos as the phone app is here, with its own call screen, see [Phone](#phone).
  - **Email, QR codes, USB, NFC:** for when nothing else gets through.
- **Calls:** voice and video calls are here, and on Android they ring in the background, see [Chat through a
  relay](#relay), and so is a walkie-talkie that works even over Bluetooth.
- **Groups:** group chats, with photos, files and voice messages, and group voice and video calls are here, see [Group chats](#groups). Next: video with
  more than four people, through a server the call moves to by itself, still encrypted end to end.
- **Bringing your chats:** Viber. Telegram and WhatsApp already come in, with their photos and files, see
  [Imported chats](#import).
- **More systems:** public groups and group calls on linked devices too; the account, its calls and its groups are on
  a computer already, see [Linked devices](#devices). Linux, macOS and Windows are here, see [On a computer](#desktop), the iPhone from the browser, see [On an iPhone](#iphone), and Sailfish OS, see
  [On Sailfish OS](#sailfish); and so are backups, see [Backups](#backup).

## Questions {#faq}

### I forgot my password.

There is no way to recover it. Erevos keeps nothing that could open your data without it. Only if unlocking with a
[fingerprint or face](#lock) is on does it still open the first space: set a new password there with
**Change password**.

### A contact who is near never shows "Nearby".

- Write to them: the phones learn which is which from the first message that
  comes nearby. Only contacts are found, so add each other first.
- Keep a space open on both phones: Erevos on the screen, or in the background with **In the background** on
  **Receive and ring**.
- Check that Bluetooth is on (and, on Android 12 and older, the location), and that Erevos may find nearby devices
  (Android settings → Apps → Erevos → Permissions).
- Bring the phones closer. If one of them has no Wi-Fi Aware, they meet over Bluetooth, which is slower to start.
- Or join both to one Wi-Fi, or one phone's hotspot, with **Find Erevos on the same Wi-Fi** on. Some public Wi-Fi
  keeps the devices on it apart: there it cannot work. With no Wi-Fi in common, **Make a Wi-Fi with phones nearby**
  lets them make one (Android 10 and later); give it up to a minute or two.

### Nothing comes over LoRa.

- Both radios need the same region and the same first channel (its name and key) in the Meshtastic app, and to be in
  reach of each other, or of radios between.
- **LoRa radio** must say **Linked**. If it does not, close the Meshtastic app: a radio links to one app at a time.
- Only texts go, and only when the relay cannot be reached and no phone is near.
- In the EU a radio may send only so much each hour: after many messages, it waits.

### A contact code was not added.

A contact on another relay needs a link with that relay's key, which links from an up-to-date Erevos have: the line
under the chat names that relay. A code from an older Erevos has no keys and is refused: ask for a new one.

### Can the relay read my messages?

No. Messages through a relay are end-to-end encrypted, and only the two phones have the keys. The relay still
sees which queues are used, and when and how much arrives ([Running your own relay](#own-relay)). Compare the safety
number, as in [Chat through a relay](#relay), to be sure no one is in between. Nothing has been audited yet.

### Why does Erevos not ask for my phone number?

Because nothing needs it. Each contact is a pair of one-way relay queues, so no server holds a list of who knows
whom.

### Does it work on an iPhone or a computer?

On a computer, yes: Linux, macOS and Windows, see [On a computer](#desktop).
On an iPhone not yet, see [What is coming](#coming).
`;
