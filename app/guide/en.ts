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

> This is an early test version. Messages are **not end to end encrypted yet**, and nothing has been audited. Do
> not rely on it to protect anyone yet. [What is protected today](#privacy) says exactly what is and is not.

This guide opens from **User guide** on the home screen. The search at its top finds any word in it, and the two
buttons above it switch between Greek and English.

## Getting started {#start}

For now Erevos is built from its source code; there is no download yet. Chat runs on Android. The other screens
also open on a computer, for testing.

The home screen leads to everything:

| Button | What it opens |
| --- | --- |
| **Chat (Android)** | Your chats, nearby or through a relay. See [Chat with a nearby phone](#nearby) and [Chat through a relay](#relay). |
| **Radio test (Android)** | A test of Bluetooth and Wi-Fi Aware between two phones. See [The test screens](#tests). |
| **Relay test (Wi-Fi)** | A test of a relay by hand. |
| **Lock and second password** | The password lock, the second password and hidden chats. See [Password lock](#lock). |
| **Appearance** | Looks, colours and glass. See [Appearance](#appearance). |
| **User guide** | This guide. |

A good first hour:

1. Open **Lock and second password** and set a password, so nobody who picks up the phone can open Erevos.
2. Open **Chat (Android)** on two phones that are close to each other, and allow what Android asks for.
3. When the other phone shows up, pick it and send a message.
4. To talk from further away, set up a relay as in [Chat through a relay](#relay).

## Chat with a nearby phone {#nearby}

With **Chat** open, Erevos looks for other Erevos phones around it, over Bluetooth and, where the phone has it,
Wi-Fi Aware. No internet, SIM or Wi-Fi network is needed.

1. Open **Chat (Android)** on both phones. The first time, Android asks to find nearby devices and for the location;
   allow both, or the phones cannot find each other.
2. The chat shows **Looking for a nearby Erevos phone** until the link is ready. Then the other phone appears as a
   button above the messages.
3. Tap it, type in **Message** and tap **Send**.

- **Both phones keep Chat open:** the radio starts when Chat opens and stops when you leave it.
- **Range:** a few tens of metres in the open, less through walls.
- **Wi-Fi Aware:** faster, but not every phone has it. Bluetooth works on all of them.
- **To reach them when they are far:** save their relay sender id for that chat, as in
  [How Erevos picks the path](#paths).

> Until messages are sealed with each space's own keys, a message from a nearby phone shows in whichever space is
> open. Hidden chats never use the nearby link.

## Chat through a relay {#relay}

A relay is a small server that keeps one-way queues: each phone has its own queue, and whoever knows its
**sender id** can drop messages into it. The relay holds no accounts, names or phone numbers. Both phones must use
the same relay for now.

1. In **Chat**, tap **Relay (Wi-Fi or internet)**.
2. Type the **Relay address**: \`ws://<computer address>:7879\` for a relay on your own network, or
   \`wss://relay.example.org\` for one on the internet. Add the **Token** if the relay needs one.
3. Tap **Create my relay queue**. Erevos shows **My relay sender id**.
4. Tap **Show my QR code** and let the other phone scan it with its camera, then open the link in Erevos. The
   **Add a contact** screen shows what it holds: tap **Add to chat** only if you scanned it yourself.
5. If their camera only shows the text, copy it and paste it into **Sender id or erevos://contact link**, then tap
   **Add**.

The new chat appears as a button named **relay** and the first characters of its id. It is enough that one phone
adds the other: once both have made their queue, the first message carries the sender's id, so the other phone
lists the chat and can answer. Erevos looks at its queue every few seconds.

> The relay settings, your queue and your contacts are kept in this space, sealed. The messages themselves are not
> kept yet: when you leave Chat or close Erevos, the conversation is cleared.

## How Erevos picks the path {#paths}

When you tap **Send**, Erevos tries the paths in this order:

1. **The nearby link,** if the chat is a nearby phone and the link is ready.
2. **The relay,** if a relay route is saved for that chat.
3. Otherwise the message is not sent, and a line under the chat says why.

To give a nearby chat a relay route, pick it, open **Relay (Wi-Fi or internet)**, paste their relay sender id
(48 characters, 0 to 9 and a to f) under **Relay sender id of …** and tap **Save**. From then on, when they are out
of range, the message goes through the relay.

| Line under the chat | What to do |
| --- | --- |
| **Sent through the relay.** | Nothing: it is on its way. |
| **Not sent. Type the relay address in Relay first.** | Fill in the relay address, as in [Chat through a relay](#relay). |
| **Not sent. The link to this phone is not ready, and no relay route is saved for it.** | Move closer, or save their relay sender id. |
| **Not sent. The relay does not have this contact's queue any more.** | Ask them for their new relay sender id. |

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
> queue ids, and when and how much arrives. Until messages are end to end encrypted, they can read them too.

## Password lock {#lock}

Under **Lock and second password**, **Lock when Erevos opens** has two choices: **No lock** and **Password**.

1. Tap **Password**, type it twice (at least 4 characters) and tap **Save**.
2. From then on Erevos asks for it every time it opens, and again after 30 seconds in the background.
3. **Change password** changes it, and **Lock now** locks Erevos straight away.

- **Wrong passwords:** after 5 wrong tries, each further one makes you wait, 30 seconds at first and twice as long
  each time, up to an hour. The count survives a restart.
- **What is sealed:** each space's contacts, relay settings and look are kept on the phone sealed with a key that
  only its password opens.

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
2. To open them, tap **Hidden chats** at the top of **Chat** and type that password.
3. They open as their own chat, titled **Hidden chats**, with **Change password** and **Close** at the top.

- **Relay only:** hidden chats have their own relay queue and never use the nearby link. While they are closed,
  their messages wait on the relay.
- **They close by themselves** when Erevos goes to the background.
- **A new password from Lock** starts them empty and replaces the ones before. To keep them and change only the
  password, open them and use **Change password** there.
- **Discretion:** the app never shows whether hidden chats are set, in any space.

## Appearance {#appearance}

**Appearance** follows LPHL FASOULI and the LPHL site.

| Setting | Choices |
| --- | --- |
| **Look** | **Flat**, or **Glass** as on lphl.nekten.eu. Glass comes in two kinds: **Panes** (each card a pane of glass over the wallpaper) and **One pane** (each screen on one frosted pane). |
| **Style** | **Classic** (Erevos's dark and gold), **Modernist** (Inter Tight), **Nocturne** (always dark, with its own colours). |
| **Theme** | **System**, **Light** or **Dark**. Nocturne is always dark. |
| **Colors** | The style's own, one of the twelve LPHL palettes, or **My color**. Choosing a palette under Nocturne goes back to the style it was chosen over. |
| **Text on colored areas** | **White**, **As in the palette**, or **My color**. |

The **Preview** shows a few messages and buttons in the look you chose. Every combination is checked so that text
always reads well, on glass too.

- **Each space keeps its own look.**
- **The password screen** shows the look last used. To do so it is kept outside the sealed data: it says nothing
  about your chats, but whoever opens the phone sees which look you use.

## The test screens {#tests}

Two screens on the home screen are there to test the connections, step by step.

- **Radio test (Android):** **Permissions** asks Android for what the radio needs, **Start** and **Stop** turn
  Bluetooth and Wi-Fi Aware on and off, **Send hello** sends a test message to the nearby phone, and the **Log**
  shows what happened.
- **Relay test (Wi-Fi):** **Create queue** makes a queue on a relay and shows two ids. Give the **sender id** to
  the phone that writes to you, and keep the **recipient id** private. **Send** and **Receive** move messages by hand.

## What is protected today {#privacy}

Erevos says plainly what it protects and what it does not, yet.

| What | Today | Coming |
| --- | --- | --- |
| **Account, phone number, email** | None needed. Contacts are pairs of one-way relay queues. | |
| **Contacts, relay settings, look** | Sealed on the phone with each space's key. | |
| **Messages on the way** | **Not end to end encrypted yet.** Whoever runs the relay, or listens to the nearby link, could read them. | End to end encryption (PQXDH with ML-KEM-768, and the double ratchet), already written in Erevos's core. |
| **Who talks to whom** | The relay sees IP addresses, queue ids, and when and how much. | Two relays, so that none sees both ends. Tor, optional. |
| **Message history** | Not kept: leaving Chat clears it. | Kept on the phone, sealed in its space. |
| **Nearby messages** | Show in whichever space is open. | Each space with its own keys. |

## What is coming {#coming}

End to end encryption comes first; most of what follows is built on it.

- **More ways to stay in touch:** the same Wi-Fi or a phone's hotspot without internet, Wi-Fi Direct, receiving
  while Erevos is closed, messages carried by other Erevos phones until they reach yours, and ways around censorship
  (Tor bridges).
  - **LoRa radios (Meshtastic):** kilometres of range for short texts, behind their own switch, off unless you turn
    it on, with privacy warnings first.
  - **SMS:** off unless you turn it on for a contact, with a warning first: the carrier sees who and when.
  - **Email, QR codes, USB, NFC:** for when nothing else gets through.
- **Calls:** walkie-talkie first (it works even over Bluetooth), then voice, then video.
- **Groups:** group chats, and group video calls. Up to four people connect directly; when more join, the call
  moves to a server by itself, still encrypted end to end.
- **Bringing your chats:** importing chats from Telegram, WhatsApp and Viber.
- **More systems:** Linux, macOS, iOS and Sailfish OS, and more than one device for the same person, with backups.

## Questions {#faq}

### I forgot my password.

There is no way to recover it. Erevos keeps nothing that could open your data without it.

### Chat stays on "Looking for a nearby Erevos phone".

- Keep **Chat** open on both phones.
- Check that Bluetooth and the location are on, and that Erevos may find nearby devices (Android settings → Apps →
  Erevos → Permissions).
- Bring the phones closer. If one of them has no Wi-Fi Aware, they meet over Bluetooth, which is slower to start.

### A contact code was not added.

Both phones must use the same relay for now. The line under the chat names both relays.

### Can the relay read my messages?

Today, yes: messages are not end to end encrypted yet. Use a relay you run yourself
([Running your own relay](#own-relay)), or only send what you would not mind being read.

### Why does Erevos not ask for my phone number?

Because nothing needs it. Each contact is a pair of one-way relay queues, so no server holds a list of who knows
whom.

### Does it work on an iPhone or a computer?

Not yet. Chat runs on Android. The other screens open on a computer for testing. See [What is coming](#coming).
`;
