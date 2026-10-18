/** The user guide in English. Its format: lib/guide.ts. The same sections, in the same order and shape, as the Greek one. */
export const guide = `
## What Erevos is {#about}

Erevos is a messenger made for privacy. You need no account, no phone number and no email to use it, and it is
meant to keep working wherever you are: through a nearby phone with no network at all, over Wi-Fi, or over the
internet.

- **Nearby, without internet:** two Android phones talk directly over Bluetooth or Wi-Fi Aware.
- **Through a relay:** over Wi-Fi or the internet, through a small server (a relay) that you can run yourself.
- **Spaces:** a password lock, a second password that opens a separate, empty Erevos, and hidden chats in every
  space.
- **Appearance:** the LPHL looks: Classic, Modernist and Nocturne, twelve palettes, and glass as on lphl.nekten.eu.

> This is an early test version. Messages through a relay are **end-to-end encrypted**, but nothing has been
> audited yet, and messages to a nearby phone are **not encrypted yet**. Do not rely on it to protect anyone yet.
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
| **Hidden chats** | The hidden chats, with their own password. See [Hidden chats](#hidden). |
| **Nearby phones** | Chat over Bluetooth and Wi-Fi Aware. See [Chat with a nearby phone](#nearby). |
| **Imported chats** | Chats brought in from Telegram or WhatsApp. See [Imported chats](#import). |
| **Appearance** | Looks, colours and glass. See [Appearance](#appearance). |
| **Lock and second password** | The password lock, the second password and hidden chats. See [Password lock](#lock). |
| **Backups** | Backups of everything on the phone, made by hand or by themselves, and restoring one. See [Backups](#backup). |
| **User guide** | This guide. |
| **Relay test**, **Radio test** | Tests of the connections. See [The test screens](#tests). |

Inside a chat, its name and picture are at the top with how it travels: **End-to-end encrypted** through the relay,
or **Nearby radio link, not encrypted yet**. Tap the name, or **Details**, for the safety number, **Rename**,
**Delete messages**, **Disappearing**, your other chats and the relay; **Done** hides them again.

A good first hour:

1. Open **Lock and second password** and set a password, so nobody who picks up the phone can open Erevos.
2. Open **Nearby phones** from the menu on two phones that are close to each other, and allow what Android asks for.
3. When the other phone shows up, tap it and send a message.
4. To talk from further away, set up a relay as in [Chat through a relay](#relay).

## Chat with a nearby phone {#nearby}

With **Chat** open, Erevos looks for other Erevos phones around it, over Bluetooth and, where the phone has it,
Wi-Fi Aware. No internet, SIM or Wi-Fi network is needed.

1. Open **Nearby phones** from the menu on both phones. The first time, Android asks to find nearby devices (on Android 12 and
   older, also for the location); allow it, or the phones cannot find each other.
2. The chat shows **Looking for a nearby Erevos phone** until the link is ready. Then the other phone appears as a
   button above the messages.
3. Tap it, type in **Message** and tap **Send**.

- **Both phones keep Chat open:** the radio starts when Chat opens and stops when you leave it.
- **Range:** a few tens of metres in the open, less through walls.
- **Wi-Fi Aware:** faster, but not every phone has it. Bluetooth works on all of them.
- **Not encrypted yet:** messages over the nearby link are plain text, and the line above the messages says so. To
  write encrypted, add them as a contact through the relay, as in [Chat through a relay](#relay).

> Until messages are sealed with each space's own keys, a message from a nearby phone shows in whichever space is
> open. Hidden chats never use the nearby link.

## Chat through a relay {#relay}

A relay is a small server that keeps one-way queues: each phone has its own queue, and whoever has its **contact
link** can drop messages into it. The relay holds no accounts, names or phone numbers, and cannot read the messages:
they are end-to-end encrypted, and only the two phones have the keys. Both phones must use the same relay for now.

1. On the home screen, tap **New chat**. The relay settings open (in a chat they are under **Details**, then
   **Relay and new contacts**).
2. Type the **Relay address**: \`ws://<computer address>:7879\` for a relay on your own network, or
   \`wss://relay.example.org\` for one on the internet. Add the **Token** if the relay needs one.
3. Tap **Create my relay queue**. Erevos says **Your relay queue is ready**.
4. Tap **Show my QR code** and let the other phone scan it with its camera, then open the link in Erevos. The
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

Under each of your messages to a contact, **✓** says the relay took it, **✓✓** that it came to their phone, and
**✓✓✓** that they read it. Their phone tells yours, inside the encryption, the next time each looks at the relay. A
message counts as read once its chat shows on the screen. Messages to a nearby phone have no marks.

- **They see when you read:** your phone tells theirs, as theirs tells yours. There is no switch to stop it yet.

### Names and deleting

Open a chat, tap its name and then **Rename** to give it a name. The name stays on this phone, sealed with the chat: the other phone
does not see it. An empty name brings back the start of their key.

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

- **Through the relay only,** end-to-end encrypted like the words, in several pieces. The relay cannot hear them, but
  from the pieces it can tell that something long was sent, and roughly how long. Nearby phones cannot get them yet.
- **On the phone** each sound is kept in a file of its own, sealed with its own key, which only the chat's sealed
  history holds. When the message goes, deleted, disappeared or the oldest, its file goes too. How many of these files
  there are, and their sizes, show roughly how many voice messages the phone keeps, in all its spaces together, not
  in which.
- **While it plays** the sound is unsealed in Erevos's cache, and deleted once it stops. If Erevos is closed while it
  records or plays, what was left goes the next time a chat opens.

> The relay settings, your queue, your contacts and their names, the keys of your conversations and the messages are
> kept in this space, sealed. About a thousand short messages fit; when it is full, the oldest go first. Deleted
> messages can stay for a while in the phone's storage, sealed like the rest, until something is written over them.
> Messages to and from a nearby phone are not kept.

## How Erevos picks the path {#paths}

When you tap **Send**, the chat you picked decides the path:

1. **A contact** goes through the relay, end-to-end encrypted.
2. **A nearby phone** goes over the nearby link, if it is ready, not encrypted.
3. Otherwise the message is not sent, and a line under the chat says why.

For now a nearby phone and a contact are two separate chats, even when they are the same person. Once the nearby
link is encrypted too, one chat will move between the paths by itself.

| Line under the chat | What to do |
| --- | --- |
| **Sent through the relay, end-to-end encrypted.** | Nothing: it is on its way. |
| **Sent over the radio link, not encrypted.** | Nothing, but anyone nearby could read it. |
| **Not sent. Type the relay address in Relay first.** | Fill in the relay address, as in [Chat through a relay](#relay). |
| **Not sent. The link to this phone is not ready.** | Move closer, or add them as a contact through the relay. |
| **Not sent. The relay does not have this contact's queue any more.** | Ask them to write to you, or for their new contact link. |
| **This build cannot encrypt, so chats through the relay are off.** | Build the app again: this build is older than its encryption. |

## Running your own relay {#own-relay}

A relay you run yourself is the safest one, since whoever runs a relay sees who connects to it. The source code
has everything in \`deploy/relay\`.

- **On your own network:** run the relay on a computer, open port 7879 in its firewall, and type
  \`ws://<its address>:7879\` on every phone. Close the port again when you are done.
- **On the internet:** a server (VPS) with Debian 12 or Ubuntu 22.04 or later, a domain name (or a free
  \`sslip.io\` name) and ports 80 and 443 open. One command installs the relay behind Caddy, with a certificate from
  Let's Encrypt and a random token. Every phone then uses \`wss://<your domain>\` and that token.

Queues and waiting messages are kept on the server's disk, so a restart loses nothing, and no request is logged.

> Never post the token where others can read it. Whoever runs the server sees the IP addresses that connect, the
> queue ids, and when and how much arrives. They cannot read the messages, which are end-to-end encrypted.

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

Every space can keep hidden chats: chats that open only with their own password, and never show among your other
chats.

1. In **Lock and second password**, under **Hidden chats**, tap **Set hidden chats password**, type it twice and
   tap **Save**.
2. To open them, tap **Hidden chats** in the home screen's menu, or at the top of a chat, and type that password.
3. They open as their own chat, titled **Hidden chats**, with **Change password** and **Close** at the top.

- **Relay only:** hidden chats have their own relay queue and their own keys, and never use the nearby link. While
  they are closed, their messages wait on the relay.
- **They close by themselves** when Erevos goes to the background.
- **A new password from Lock** starts them empty and replaces the ones before. To keep them and change only the
  password, open them and use **Change password** there.
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
- **Not in a backup:** the count of wrong passwords, and how automatic backups are set.

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
| **Wallpaper** | What lies behind every screen: **Style default** (the style's own scene or glow), **Plain**, or a pattern drawn faintly in the accent: **Dots**, **Grid**, **Stripes**, **Stars**, **Lights** (soft circles of light) or **Gradient**. A photo of your own is not offered yet. |
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

1. Install it. On Linux: the package for Arch-based systems (\`erevos-x86_64.pacman\`, with \`sudo pacman -U\`) or the
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
- **A computer and a phone are two devices:** they do not share contacts and chats yet. A backup moves everything
  from one to the other, see [Backups](#backup), and from then on use only the one.
- **Tested so far** on Linux. The Mac version is built and opened on GitHub's Mac computers, not yet by a person.

## The test screens {#tests}

Two screens in the home screen's menu are there to test the connections, step by step.

- **Radio test (Android):** **Permissions** asks Android for what the radio needs, **Start** and **Stop** turn
  Bluetooth and Wi-Fi Aware on and off, **Send hello** sends a test message to the nearby phone, and the **Log**
  shows what happened.
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
| **Messages to a nearby phone** | **Not encrypted yet.** Whoever listens to the nearby link could read them. | The same encryption as through the relay. |
| **Who talks to whom** | The relay sees IP addresses, queue ids, and when and how much. | Two relays, so that none sees both ends. Tor, optional. |
| **Imported chats** | Sealed in the space they were brought into. Only their words; photos and files stay behind. The file's size tells roughly how much was imported, not where. | Viber, and the photos and files. |
| **Message history** | Kept on the phone, sealed in its space: about a thousand short messages, the oldest go first. Every space's history takes the same room, used or not. Nearby messages are not kept. Deleting on both phones, and disappearing messages, rely on the other phone's Erevos. | |
| **Nearby messages** | Show in whichever space is open. | Each space with its own keys. |
| **Voice messages** | End-to-end encrypted through the relay, in pieces: the relay can tell roughly how long each is. Each sound is sealed in a file of its own; how many files there are, and their sizes, show roughly how many are kept, not in which space. Unsealed in the cache only while it plays. | Sound files all of one size. |
| **On a computer** | Sealed as on the phone, in the app's own folder. Its keystore is sealed with the system's keyring; a Linux system without one keeps it as it is. | |
| **Backups** | One file sealed with its own password, holding every space as it is sealed on the phone. Its name says it is an Erevos backup, and its size shows roughly how much is kept. Automatic backups keep their password on the phone. | Backups straight to Nextcloud or WebDAV. |
| **Marks ✓✓ and ✓✓✓** | The contact's phone learns when yours got and read their messages, encrypted. The relay sees one more small message. | A switch to stop telling when you read. |

## What is coming {#coming}

End-to-end encryption through the relay is here. The nearby link comes next, and most of what follows is built on it.

- **More ways to stay in touch:** the same Wi-Fi or a phone's hotspot without internet, Wi-Fi Direct, receiving
  while Erevos is closed, messages carried by other Erevos phones until they reach yours, and ways around censorship
  (Tor bridges).
  - **LoRa radios (Meshtastic):** kilometres of range for short texts, behind their own switch, off unless you turn
    it on, with privacy warnings first.
  - **SMS:** off unless you turn it on for a contact, with a warning first: the carrier sees who and when.
  - **Email, QR codes, USB, NFC:** for when nothing else gets through.
- **Calls:** walkie-talkie first (it works even over Bluetooth), then voice, then video. Their buttons, **Call** and
  **Video**, are already under the message field: for now they say when each comes. **Voice** already sends voice
  messages, see [Chat through a relay](#relay).
- **Groups:** group chats, and group video calls. Up to four people connect directly; when more join, the call
  moves to a server by itself, still encrypted end to end.
- **Bringing your chats:** Viber, and the photos and files of imported chats. Telegram and WhatsApp already come
  in, see [Imported chats](#import).
- **More systems:** iOS and Sailfish OS, and more than one device for the same person. Linux and macOS are here, see
  [On a computer](#desktop), and so are backups, see [Backups](#backup).

## Questions {#faq}

### I forgot my password.

There is no way to recover it. Erevos keeps nothing that could open your data without it.

### Chat stays on "Looking for a nearby Erevos phone".

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
