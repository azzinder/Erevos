/** The user guide in English. Its format: lib/guide.ts. The same sections, in the same order and shape, as the Greek one. */
export const guide = `
## What Erevos is {#about}

Erevos is a messenger made for privacy. You need no account, no phone number and no email to use it, and it is
meant to keep working wherever you are: through a nearby phone with no network at all, over Wi-Fi, or over the
internet.

- **Nearby, without internet:** two Android phones talk directly over Bluetooth or Wi-Fi Aware, end-to-end encrypted.
- **Through a relay:** over Wi-Fi or the internet, through a small server (a relay) that you can run yourself.
- **Spaces:** a password lock, a second password that opens a separate, empty Erevos, and hidden chats in every
  space.
- **Appearance:** the LPHL looks: Classic, Modernist and Nocturne, twelve palettes, and glass as on lphl.nekten.eu.

> This is an early test version. Messages are **end-to-end encrypted**, through a relay and nearby alike, but
> nothing has been audited yet. Do not rely on it to protect anyone yet.
> [What is protected today](#privacy) says exactly what is and is not.

This guide opens from **User guide** in the home screen's menu (the three dots at the top). The search at its top finds any word in it, and the two
buttons above it switch between Greek and English.

## Getting started {#start}

For now Erevos is built from its source code; there is no download yet. Chat runs on Android. The other screens
also open on a computer, for testing.

The home screen is the list of your chats, the one that moved last at the top. Each shows the contact's picture,
the last message with its marks, when it came, and how many of their messages you have not read. A clock beside it
means its messages disappear. **Search chats** finds a chat by its name or its last message.

- **The picture** is drawn from the contact's key: the same key always gives the same colours and moon (in greens under Matrix), so you know
  a chat at a glance without any photo. It is not a check of the key; the [safety number](#relay) is.
- **The line under the search** says whether a relay is set and your queue is ready. Tap it to set one up.
- **New chat**, at the bottom, opens the relay settings and adding a contact.
- **The lock** at the top locks Erevos at once when a password is set, or opens the lock settings when not.
- **The three dots** open the rest:

| In the menu | What it opens |
| --- | --- |
| **Nearby phones** | Your contacts over Bluetooth and Wi-Fi Aware, without internet. See [Chat with a nearby phone](#nearby). |
| **Imported chats** | Chats brought in from Telegram or WhatsApp. See [Imported chats](#import). |
| **Appearance** | Looks, colours and glass. See [Appearance](#appearance). |
| **Lock and second password** | The password lock, the second password and hidden chats. See [Password lock](#lock). |
| **Backups** | Backups of everything on the phone, made by hand or by themselves, and restoring one. See [Backups](#backup). |
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

## Chat with a nearby phone {#nearby}

With **Chat** open, Erevos looks for other Erevos phones around it, over Bluetooth and, where the phone has it,
Wi-Fi Aware. No internet, SIM or Wi-Fi network is needed. It carries messages to your contacts, end-to-end encrypted
like those through the relay.

1. Open **Nearby phones** from the menu on both phones. The first time, Android asks to find nearby devices (on Android 12 and
   older, also for the location); allow it, or the phones cannot find each other.
2. If you are not contacts yet, add each other: on one phone tap **Relay and new contacts**, then **Show my QR code**,
   and scan it with the other, as in [Chat through a relay](#relay). Without a relay the code holds only your keys,
   and you reach each other nearby only, until you have one.
3. Pick the contact, type in **Message** and tap **Send**. Once their phone answers, the top of the chat says
   **Nearby**.

- **Both phones keep Chat open:** the radio starts when Chat opens and stops when you leave it.
- **Range:** a few tens of metres in the open, less through walls.
- **Wi-Fi Aware:** faster, but not every phone has it. Bluetooth works on all of them.
- **Other phones nearby** get only sealed bytes they cannot open, and only until your contact's phone is known: from
  then on what you send goes to it alone. Voice messages go only to a contact known to be near. Photos and files need
  the relay.
- **With a relay as well,** each message also goes through it, so nothing is lost if the link drops; the copy that
  comes second is not shown again. If the relay cannot be reached, the copy nearby is the one that counts.

> A message from nearby opens only in the space that has that contact. One for another space of this phone waits in
> memory, six hours at most, until that space opens. Hidden chats never use the nearby link.

## Chat through a relay {#relay}

A relay is a small server that keeps one-way queues: each phone has its own queue, and whoever has its **contact
link** can drop messages into it. The relay holds no accounts, names or phone numbers, and cannot read the messages:
they are end-to-end encrypted, and only the two phones have the keys. Both phones must use the same relay for now.

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

### The safety number

Open the chat, tap its name and then **Show safety number**. Both phones show the same 60 digits for the two of you. Compare them
in person or on a call: if they match, no one is in between. If they differ, do not trust that chat, and add the
link again, scanned from their own phone.

### Sent, came and read

Under each of your messages to a contact, **✓** says the relay or a phone nearby took it, **✓✓** that it came to
their phone, and **✓✓✓** that they read it. Their phone tells yours, inside the encryption, the next time each looks
at the relay, or at once when they are nearby. A message counts as read once its chat shows on the screen.

- **They see when you read:** your phone tells theirs, as theirs tells yours, unless that chat appears offline (below).
- **When messages come:** Erevos looks at the relay every few seconds while it is open and unlocked, on any screen,
  and the home screen moves the chat to the top by itself. On Android it goes on in the background too, while
  **Calls in the background** rings (below). Closed, locked, or long in the background otherwise, it does not:
  messages wait on the relay, up to 14 days, and come once Erevos opens again. There are no message notifications yet.

### Online, and appearing offline

While a contact's chat is open on your screen, Erevos asks their phone now and then whether it is open, and says yours
is. If theirs is, the chat says **Online** under their name with a green dot, and the home screen shows the dot on
their picture. Writing to someone also shows you online to them for two minutes. All of it goes inside the encryption,
only between you and that contact: the relay sees a message now and then, as with any chat. There is no "last seen".

To hide it from one contact, open their chat, tap its name and then **Appear offline: off**. With it on:

- **They do not see you online**, and your phone sends them nothing while you read.
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

To delete one message, press and hold it. To delete all the messages of a chat, tap its name and then **Delete messages**.
Either way Erevos asks where:

- **This phone:** only here. The other phone keeps its own.
- **Both phones:** their phone deletes them too, the next time it looks at the relay. Their Erevos does so, but a
  changed app, a screenshot or a copy can still keep them.

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
- **Ringing in the background (Android):** while a space is open, Erevos keeps running when you leave it, with a
  quiet notice that says only "Erevos", and a call rings with the phone's ringtone and a notice that says only
  "Incoming call", over the lock screen too. Tap it to answer. With the password lock on, a call that rings shows
  before the password, and Erevos locks as soon as it ends. Set it under **Lock and second password** → **Calls in
  the background**: **Ring** (the default) or **Only while Erevos shows**. There too, if Android asks for them,
  **Keep running on battery** and **Show calls over the lock screen**.
- **Where it cannot ring:** swiped away from the recent apps, stopped by Android, in another space, or on a computer
  or in the web app while closed. A call there shows as a missed call once Erevos opens. A message request cannot
  call you until you accept it.
- **One call at a time.** A call goes on while you move between screens of the space. It ends when the space closes,
  and a call in hidden chats when they close, as they do when Erevos goes to the background.
- Not over a nearby phone or Bluetooth yet: a walkie-talkie that works there is still to come.

> The relay settings, your queue, your contacts and their names, the keys of your conversations and the messages are
> kept in this space, sealed. About a thousand short messages fit; when it is full, the oldest go first. Deleted
> messages can stay for a while in the phone's storage, sealed like the rest, until something is written over them.
> Messages sent or received nearby are kept the same way.

## How Erevos picks the path {#paths}

When you tap **Send**, Erevos picks the path by itself:

1. **Their phone is near** (the top of the chat says **Nearby**): it goes over the nearby link, and through the relay
   too when there is one.
2. **Otherwise, with a relay:** it goes through the relay, and a short message also goes to the Erevos phones linked
   nearby, so theirs can answer nearby if it is one of them. If the relay cannot be reached, that copy is the one
   that counts.
3. Otherwise the message is not sent, and a line under the chat says why.

Every path is end-to-end encrypted: no relay and no phone in between can read what you send.

| Line under the chat | What to do |
| --- | --- |
| **Sent nearby, end-to-end encrypted.** | Nothing: their phone is near and has it. |
| **Sent through the relay, end-to-end encrypted.** | Nothing: it is on its way. |
| **Sent to the Erevos phones nearby, end-to-end encrypted, as the relay could not be reached.** | It comes only if one of them is theirs: wait for **✓✓**, or check the relay. |
| **Not sent. There is no relay, and no Erevos phone is linked nearby.** | Fill in the relay address, as in [Chat through a relay](#relay), or come near their phone. |
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

> Never post the token where others can read it. Whoever runs the server sees the IP addresses that connect, the
> queue ids, and when and how much arrives. They cannot read the messages, which are end-to-end encrypted.

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

## SMS {#sms}

On Android, Erevos can be the phone's SMS app, under **SMS** in the menu. The home screen then shows SMS and Erevos
chats in one list.

- **Writing to someone with Erevos:** it goes through Erevos, end-to-end encrypted, once their number is linked to
  their contact. Link it by hand in the SMS conversation, or let a hidden invite find it.
- **Hidden invites:** with the first SMS to a number that is not a contact, Erevos also sends a short hidden
  invite. A phone without Erevos shows nothing; a phone with Erevos answers through the relay and the two become
  contacts. Each number is asked once a month at most, and **Turn invites off** stops them.
- **Everyone else:** a plain SMS, marked SMS. The phone company can read it, as it reads every SMS.

## Password lock {#lock}

Under **Lock and second password**, **Lock when Erevos opens** has two choices: **No lock** and **Password**.

1. Tap **Password**, type it twice (at least 4 characters) and tap **Save**.
2. From then on Erevos asks for it every time it opens, and again after 30 seconds in the background.
3. **Change password** changes it, and **Lock now** locks Erevos straight away.

- **Wrong passwords:** after 5 wrong tries, each further one makes you wait, 30 seconds at first and twice as long
  each time, up to an hour. The count survives a restart.
- **What is sealed:** each space's contacts, the keys of its conversations, its messages, its relay settings and its
  look are kept on the phone sealed with a key that only its password opens.

> There is no way to recover a forgotten password: nothing is stored that could open the data without it.

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

Every space can keep hidden chats: chats that open only with their own PIN, and never show among your other
chats. There is no button for them anywhere.

1. Start them in either of two ways: in **Lock and second password**, under **Hidden chats**, tap **Set hidden chats
   PIN**, type it twice and tap **Save**; or open a chat's **Details**, tap **Move to hidden chats**, type a PIN of 4
   characters or more and tap **New hidden chats**, then **Start and move**.
2. To open them, type the PIN in **Search chats** on the home screen and press Enter (the keyboard's search key). A
   wrong PIN is just a search: nothing happens.
3. They open as their own chat, titled **Hidden chats**, with **Change PIN** at the top. The back arrow closes them.
4. To move another chat there, open its **Details**, tap **Move to hidden chats**, type the PIN and tap **Move**. The
   chat leaves your list with its messages, name, picture and look, and its safety number stays the same. Their phone
   is told at once to write to the hidden chats from now on; a message they send in that very moment may not come.

- **Relay only:** hidden chats have their own relay queue and their own keys, and never use the nearby link. While
  they are closed, their messages wait on the relay.
- **They close by themselves** when Erevos goes to the background.
- **A new PIN** (from Lock, or **New hidden chats**) starts them empty and replaces the ones before. To keep them
  and change only the PIN, open them and use **Change PIN** there.
- **Wrong PINs in the search** are counted apart from the lock screen's: after five, searches stop trying for a while,
  silently, and the lock screen never waits because of them.
- **Discretion:** the app never shows whether hidden chats are set, in any space.

## Backups {#backup}

A backup is one file holding everything Erevos keeps on this phone: every space, with its contacts, the keys of its
conversations, its messages, voice messages, imported chats and hidden chats, and the lock. Inside it each space stays
sealed with its own password, and the file is sealed again with a password of its own. It is under **Backups** in the
home screen's menu.

1. **Make a backup:** tap **Make a backup**, choose a folder (on the phone, a memory card, or a cloud app that shows
   its folders there; on a computer, any folder), type a password for the backup twice and tap **Save**.
2. **Automatic backups:** choose **Every day** or **Every week**, then a folder and a password. Erevos makes one when
   it opens and the last one is older than that, and the folder keeps the 3 newest. Under them are **Back up now**,
   **Change folder** and **Change password**; **Off** stops them, and the ones made stay in the folder.
3. **Restore:** tap **Restore a backup**, choose the file and type its password. Erevos asks once more, then puts the
   backup in place of everything on the phone, and opens as it was when the backup was made, with the passwords used
   then.

- **Keep the backup's password:** nothing opens a backup without it, and no one can recover it. Without a password
  lock, the backup's password is all that protects it.
- **Automatic backups keep their password on the phone,** so they need no password each time. Whoever opens their
  folder still needs the spaces' passwords to read the chats.
- **Chats that went on after the backup:** restoring puts back each conversation's keys as they were then. Messages
  that came after the backup and were already read are not in it, and a chat that went on may stop opening new
  messages. Then ask the contact for their contact link again.
- **One phone at a time:** a backup restored on a second phone reads the same relay queues as the first, and each
  takes messages the other then never gets. Use it to move to a new phone, not to keep two.
- **Discretion:** every space shows the same Backups screen, and a backup holds every space, so neither tells how
  many spaces there are or whether hidden chats are set. The file's name says it is an Erevos backup, and its size
  shows roughly how much is kept.
- **Not in a backup:** photos and files, not yet: a backup is made in the phone's memory, and they would not fit. A
  backup restored on the same phone shows them again; on another phone they show as not on it. Also left out: the
  count of wrong passwords, and how automatic backups are set.

## Imported chats {#import}

Your old chats from Telegram and WhatsApp can come into Erevos, to read. They stay on this phone, sealed in the
space you bring them into, and are never sent anywhere.

First export the chat from the other app:

- **WhatsApp:** open the chat, then **More**, **Export chat**, **Without media**, and save the file to the phone.
- **Telegram Desktop:** **Export chat history**, format **JSON**, then copy **result.json** to the phone.

Then:

1. In Erevos, open **Imported chats** and tap **Import a file**, then pick the file. A .zip of either works too.
2. Erevos says what it found. Tap your own name, so your messages show on the right, and tap **Keep**.
3. Delete the export file from the phone yourself: Erevos keeps its own sealed copy, but the file you saved is not
   sealed.

To go on with the conversation in Erevos, the other person needs Erevos too:

1. In **Chat**, add them as a contact through the relay, as in [Chat through a relay](#relay).
2. Open the imported chat, tap **Continue in Erevos** and pick them.
3. Their chat now shows the old messages ahead of the new ones, a little fainter, with **Continued in Erevos**
   between them. **Open the chat** takes you there, and a contact you have not named takes the imported chat's name.

- **Only the words:** photos, voice messages and other files stay behind, and the chat says where one was.
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
| **Style** | **Classic** (Erevos's dark and gold), **Modernist** (Inter Tight), **Nocturne** (always dark, with its own colours), **Neon** (cyan and magenta LEDs that glow, over a grid running to a setting sun), **Matrix** (green on black in monospace, with code raining behind), **Paper** (fountain-pen blue on cream, in a serif, over ruled lines with a red margin), **Aurora** (violet on near-white, soft and round, over pools of mint, lilac and peach light) and **Custom** (your own background and accent). |
| **Theme** | **System**, **Light** or **Dark**. Nocturne, Neon and Matrix are always dark, Paper and Aurora always light, and Custom is light or dark as its background is. |
| **Colors** | The style's own, one of the twelve LPHL palettes, or **My color**. Choosing a palette under a style with its own colours goes back to the style chosen before. |
| **Custom** | With **Custom** chosen: its **background** (eight light, eight dark) and its **accent**. The text and the surfaces are made from the background, and every color is checked to read on it. |
| **Text on colored areas** | **White**, **As in the palette**, or **My color**. |
| **Wallpaper** | What lies behind every screen: **Style default** (the style's own scene or glow), **Plain**, or a pattern drawn faintly in the accent: **Dots**, **Grid**, **Stripes**, **Stars**, **Lights** (soft circles of light) or **Gradient**; or **Photo**, a photo of your own, made smaller, drawn anew and sealed, under a veil so the text reads (**Change photo** picks another). The password screen shows the style's own instead. |
| **Messages** | How a chat draws messages: **Round** bubbles, **Square** ones, or **Line**, no bubble but a line beside the text, as a log. |

Neon, Matrix, Paper and Aurora draw their own scene behind every screen, and Custom keeps the background you chose,
so **Glass** waits while they are chosen. The rain stands
still when the phone is set to reduce motion.

The **Preview** shows a few messages and buttons in the look you chose. Every combination is checked so that text
always reads well, on glass too.

- **Each space keeps its own look.**
- **The password screen** shows the look last used. To do so it is kept outside the sealed data: it says nothing
  about your chats, but whoever opens the phone sees which look you use.

## On a computer {#desktop}

Erevos also runs on a computer, Linux or macOS, as an app of its own. It chats through a relay, end-to-end encrypted
as on the phone, and keeps its contacts, messages and settings sealed the same way.

1. Install it. On Linux: the package for Arch-based systems (\`erevos-x64.pacman\`, with \`sudo pacman -U\`) or the
   AppImage. On a Mac: open the disk image and drag Erevos to Applications. It has no paid Apple signature, so the
   first time allow it under **System Settings → Privacy & Security → Open Anyway**.
2. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay). **Copy my contact link** copies
   your link, to paste where it should go.

- **What only the phone does:** the nearby link (Bluetooth and Wi-Fi Aware) and its tests. The rest is the same:
  spaces and the second password, hidden chats, voice messages, imported chats and backups.
- **Where it keeps things:** in its own folder (on Linux \`~/.config/Erevos\`, on a Mac
  \`~/Library/Application Support/Erevos\`), sealed as on the phone. Its keystore is sealed with the system's keyring
  (on a Mac the Keychain). A Linux system without a keyring keeps it as it is: set a password lock there.
- **Voice messages** recorded on a computer are Opus, on a phone AAC. Both play on both.
- **Photos** come from the computer's files; there is no camera. **Save** asks where to put a photo or file.
- **A computer and a phone are two devices:** they do not share contacts and chats yet. A backup moves everything
  from one to the other, see [Backups](#backup), and from then on use only the one.
- **Tested so far** on Linux. The Mac version is built and opened on GitHub's Mac computers, not yet by a person.

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
  on the relay until then. Notifications come later, and they too would pass through Apple, encrypted.
- **Backups** are made by hand: **Make a backup** saves the file through the share sheet (Files, iCloud Drive or
  another app). A browser gives out a file only after a tap, so there are no automatic backups.
- **Voice messages** recorded on an iPhone are AAC; they play everywhere.
- **Apple** makes Safari and could change it, as with any app on an iPhone.

## On Sailfish OS {#sailfish}

On a Sailfish OS phone Erevos is an app of its own: the same app as in the browser, shown by Sailfish's own browser
engine inside a Sailfish window, with its code installed with the app and not fetched from a server. It chats through a
relay, end-to-end encrypted as on the phone, and keeps its contacts, messages and settings sealed the same way.

1. Allow apps from outside the Jolla Store: **Settings → Untrusted software → Allow untrusted software**.
2. Copy \`erevos-<version>.aarch64.rpm\` to the phone (Downloads) and tap it in **Files**, then **Install**. From a
   terminal (Developer mode) it is \`pkcon install-local erevos-<version>.aarch64.rpm\`. Needs Sailfish OS 5 in its
   64-bit (aarch64) version.
3. Set a password lock (**Lock and second password**). See below why it matters here.
4. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay).

- **What only Android does:** the nearby link (Bluetooth and Wi-Fi Aware) and SMS. The rest is the same: spaces and
  the second password, hidden chats, voice messages, imported chats and backups.
- **Where it keeps things:** in \`~/.local/share/erevos\` on the phone, sealed as on the phone. Sailfish has no
  keyring for apps, so the keystore is kept there as it is, readable by your user only: the password lock is what
  seals it.
- **Backups** go to \`Documents/Erevos\` on the phone, by hand or every day; copy them from there to a memory card or
  another device. **Save** puts a photo or file in Downloads.
- **Only while it runs:** when Erevos is closed, messages wait on the relay until it opens.
- **Tested so far** on Sailfish's browser engine (Gecko 91) on a computer, chatting with a browser through a relay.
  Not yet on a Sailfish phone.

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
| **Messages to a nearby phone** | End-to-end encrypted, the same as through the relay. Whoever listens nearby can tell that Erevos phones are near each other, and when and how much they send. Until your contact's phone is known, the other Erevos phones linked nearby get your short messages, sealed. | Wi-Fi Direct, and messages carried by other phones. |
| **Who talks to whom** | The relay sees IP addresses, queue ids, and when and how much. With a second relay, your relay never sees your address. [Through Tor](#tor), off unless turned on, no relay sees it. | Tor bridges, for where Tor is blocked. |
| **SMS** | A plain SMS is read by the phone company, as every SMS. To a number linked to an Erevos contact it goes through Erevos instead. A hidden invite is one more short SMS the phone company sees. | MMS, and two SIM cards. |
| **Imported chats** | Sealed in the space they were brought into. Only their words; photos and files stay behind. The file's size tells roughly how much was imported, not where. | Viber, and the photos and files. |
| **Message history** | Kept on the phone, sealed in its space: about a thousand short messages, the oldest go first. Every space's history takes the same room, used or not. Deleting on both phones, and disappearing messages, rely on the other phone's Erevos. | |
| **Nearby messages** | Open only in the space that has the contact. One for another space waits in memory, six hours at most, until that space opens. Hidden chats never use the nearby link. | Hidden chats nearby. |
| **Voice messages** | End-to-end encrypted through the relay or nearby, in pieces: the relay, or whoever listens nearby, can tell roughly how long each is. Each sound is sealed in a file of its own; how many files there are, and their sizes, show roughly how many are kept, not in which space. Unsealed in the cache only while it plays. | Sound files all of one size. |
| **Photos and files** | End-to-end encrypted, through the relay's file store, in pieces of one size: the relay sees how many and when, so roughly how big. Your relay sees your address, as for messages; the contact takes them through their own relay. Photos lose their place, phone and time, unless sent as a file; a file keeps what it says inside. Sealed on the phone in their pieces, shown from memory. Saved copies are outside Erevos. Not in backups yet. | Backups that hold them. |
| **On a computer** | Sealed as on the phone, in the app's own folder. Its keystore is sealed with the system's keyring; a Linux system without one keeps it as it is. | |
| **Backups** | One file sealed with its own password, holding every space as it is sealed on the phone. Its name says it is an Erevos backup, and its size shows roughly how much is kept. Automatic backups keep their password on the phone. | Backups straight to Nextcloud or WebDAV. |
| **Marks ✓✓ and ✓✓✓** | The contact's phone learns when yours got and read their messages, encrypted. The relay, or whoever listens nearby, sees one more small message. | A switch to stop telling when you read. |
| **Calls** | End-to-end encrypted (DTLS-SRTP, its key sent in the encrypted chat). Through the call relay, neither phone sees the other's IP address; the server running it sees both, when and how long, and how much passes. Without a call relay, on the same Wi-Fi only, each phone sees the other's address. | Ringing on a computer and in the web app while closed. A walkie-talkie over Bluetooth. |

## What is coming {#coming}

End-to-end encryption is here, through the relay and over the nearby link, and most of what follows is built on it.

- **More ways to stay in touch:** the same Wi-Fi or a phone's hotspot without internet, Wi-Fi Direct, receiving
  while Erevos is closed, messages carried by other Erevos phones until they reach yours, and ways around censorship
  (Tor bridges).
  - **LoRa radios (Meshtastic):** kilometres of range for short texts, behind their own switch, off unless you turn
    it on, with privacy warnings first.
  - **SMS:** Erevos as the SMS app is here, see [SMS](#sms). Next: MMS and two SIM cards.
  - **Email, QR codes, USB, NFC:** for when nothing else gets through.
- **Calls:** voice and video calls are here, and on Android they ring in the background, see [Chat through a
  relay](#relay). Next: a walkie-talkie that works even over Bluetooth.
- **Groups:** group chats, and group video calls. Up to four people connect directly; when more join, the call
  moves to a server by itself, still encrypted end to end.
- **Bringing your chats:** Viber, and the photos and files of imported chats. Telegram and WhatsApp already come
  in, see [Imported chats](#import).
- **More systems:** more than one device for the same person. Linux and macOS are here, see
  [On a computer](#desktop), the iPhone from the browser, see [On an iPhone](#iphone), and Sailfish OS, see
  [On Sailfish OS](#sailfish); and so are backups, see [Backups](#backup).

## Questions {#faq}

### I forgot my password.

There is no way to recover it. Erevos keeps nothing that could open your data without it.

### A contact who is near never shows "Nearby".

- Write to them: the phones learn which is which from the first message that
  comes nearby. Only contacts are found, so add each other first.
- Keep **Chat** open on both phones.
- Check that Bluetooth is on (and, on Android 12 and older, the location), and that Erevos may find nearby devices
  (Android settings → Apps → Erevos → Permissions).
- Bring the phones closer. If one of them has no Wi-Fi Aware, they meet over Bluetooth, which is slower to start.

### A contact code was not added.

Both phones must use the same relay for now. The line under the chat names both relays. A code from an older
Erevos has no keys and is refused: ask for a new one.

### Can the relay read my messages?

No. Messages through a relay are end-to-end encrypted, and only the two phones have the keys. The relay still
sees which queues are used, and when and how much arrives ([Running your own relay](#own-relay)). Compare the safety
number, as in [Chat through a relay](#relay), to be sure no one is in between. Nothing has been audited yet.

### Why does Erevos not ask for my phone number?

Because nothing needs it. Each contact is a pair of one-way relay queues, so no server holds a list of who knows
whom.

### Does it work on an iPhone or a computer?

On a computer, yes: Linux and macOS, see [On a computer](#desktop). On an iPhone not yet, see [What is coming](#coming).
`;
