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

> Messages are **end-to-end encrypted**, through a relay and nearby alike, but nothing has been audited yet by
> independent experts. [What is protected today](#privacy) says exactly what is and is not.

This guide opens from **User guide** in the home screen's menu (the three dots at the top). The search at its top finds any word in it. The guide
is in every language of the app, and shows in the one you chose, see [Language](#start).

### Who makes it, and why

- **Who:** Erevos is made by the same person who made FASOULI.
- **Where:** it does not matter. What matters is that the relay and the app for the browser run on the maker's own
  server (lphl.nekten.eu).
- **For whom:** for anyone who wants to talk with their own people without giving a phone number, an email or an
  account: friends, families, groups, and those who live where the internet is cut off or watched. And for those who,
  with nothing to hide, want to keep their personal space private, away from prying eyes.
- **Why:** because the well-known apps ask for a phone number, know who talks to whom, and stop when the internet goes
  down. Because the "terms of use" of some of them do not cover us, and we have doubts about how they protect our
  privacy. Because others lack features we need. Erevos asks for nothing, and finds a way through whatever is there:
  the internet, Wi-Fi, Bluetooth, a phone nearby.
- **Who pays:** no one: no ads, no investors, no data collection. Whoever wants can help with the running costs, such
  as the server: **Settings** → **General** → **Support Erevos** has the ways, Liberapay, PayPal, Monero and Bitcoin.
  Giving or not changes nothing in the app.
  **Why:** each way opens outside Erevos, in the browser or a wallet, only when tapped, so Erevos itself sends nothing
  and never knows who gave. PayPal knows who gives; Monero shows neither who gave nor how much; Bitcoin shows no names,
  but what the address received is public.

This part opens from **Settings** → **General** → **About Erevos** too.

## Getting started {#start}

Erevos is downloaded from its releases page, one file for each system: see [Updates](#updates) for where, and how to
update it. It runs on Android, on a computer (Linux, macOS and Windows), on Sailfish OS and, from the browser, on an
iPhone. If you are new to it, start with an invite from someone who uses it: one QR code or link, and you are in,
with them as a contact (see Inviting someone new, under [Chat through a relay](#relay)).

The home screen is the list of your chats, the one that moved last at the top. Each shows the contact's picture,
the last message with its marks, when it came, and how many of their messages you have not read. A clock beside it
means its messages disappear. **Search chats** finds a chat by its name or its last message, and, under the chats,
the messages that have what you type in them, in all the space's chats: tap one to open its chat at it. In a chat, its
details have **Search in this chat**: ▲ and ▼ go to what it found earlier and later. Either looks only on this phone:
in what it keeps sealed, and **Search in this chat** in the SMS a contact's chat shows too; hidden chats are searched
only from inside them. A long chat opens at its latest 100 messages, and earlier ones, those imported from Telegram or
WhatsApp among them, come by themselves as you scroll up (**Show earlier messages**, above them, brings them too); going
to an earlier one (from the search, a starred message or the one a message answers) brings it too.
Scrolled up a little, two round arrows show at the lower right, in a chat, a group and an SMS conversation alike: the
upper one goes to the chat's start, the lower one back to its end. From the start, **Show later messages**, under what
shows, brings more; writing a message, or the lower arrow, goes back to the end.

**Why:** a long chat opens at its latest messages so that it opens at once: drawing all of it at a time would be slow,
on older phones most of all. Hidden chats are left out of the home screen's search so that the home screen looks the
same whether a space has any or not: their messages can be read only while their PIN has them open.

- **The picture** is drawn from the contact's key: the same key always gives the same colours and moon (in greens under Matrix), so you know
  a chat at a glance without any photo. It is not a check of the key; the [safety number](#relay) is.
- **The line under the search** says whether a relay is set and your queue is ready. Tap it to set one up.
- **Chat with myself**, always first in the chats, with a pin, holds your notes to yourself: see Chat with myself and
  reminders below.
- **New chat**, at the bottom, opens the relay settings and adding a contact. **Remind me**, the orange bell beside it,
  writes a reminder for you.
- **The green handset and the violet person** at the top, on Android, open **Phone** and **Contacts** at once, in the
  colours of their icons on the phone's home screen. They are not in the menu under the three dots as well.
- **All messages**, **SMS** and **Erevos**, above the chats once there are SMS conversations too, show all of them,
  only the SMS (with the chats whose last message was an SMS), or only the Erevos chats, every contact's whatever
  came last.
- **The widget**, on Android: add Erevos from your home screen's widgets. Its four buttons open **Phone**, the
  **SMS**, the Erevos **Messages** and **Contacts**, after the password like any link (the Phone without it, if you
  let it). Over the first three it shows how many missed calls, unread SMS and new messages there are, never who or
  what; with missed calls, **Phone** opens on **Recents**. A button tapped again shows its screen again, also after
  you chose another tab there. Its words follow Erevos's language. **Settings** → **Appearance** → **Widget** sets the
  order of its buttons.
- **The orange lock** at the top locks Erevos at once when a password is set, or opens the lock settings when not.
- **The three dots** open the rest:

| In the menu | What it opens |
| --- | --- |
| **New group** | A group chat with your contacts. See [Group chats](#groups). |
| **Public groups** | A group anyone with its link can ask to join, with an owner and admins. See [Public groups](#public-groups). |
| **Starred messages** | The messages you starred, in all your chats. See A message's menu, under Chat through a relay. |
| **Nearby phones** | Your contacts over Bluetooth and Wi-Fi Aware, or on the same Wi-Fi, without internet. See [Chat with a nearby phone](#nearby). |
| **User guide** | This guide. |
| **Settings** | The last row, with a cog: everything you can set, in groups, with a search. See Settings below. |

Inside a chat, its name and picture are at the top with how it travels: **Encrypted** (end to end), **Online**,
**Nearby** while their phone is linked to yours over the radio, or **typing…**, with a stopwatch when the chat's
messages disappear. Beside them, the blue tile with a camera starts a video call and the green one with a handset a voice call. Tap the name, or **⋯**
after them (**⋮** on Android), for the chat's **Details**: its picture (tap it to change it), **Call**, **Video**, **Rename** and **Picture**, then **Disappearing messages**,
**Appear offline**, **Chat look**, the **Safety number**, **Move to hidden chats** and **Delete messages**. **Done**
closes them.

**Media, links and files**, in the details under **Search in this chat**, lists what the chat holds, each kind under its
own tab with how many there are: **Photos** (in a grid), **Videos**, **Voice messages**, **Music**, **Files** and
**Links**, the newest first under their months, those imported from Telegram or WhatsApp too. A tap opens a photo or a
file to look at or save, plays a sound right there, or opens a link after asking; held, each offers **Show in chat**,
which goes to its message. One not yet taken from the relay is gone to in the chat, where a tap takes it. The calendar
at the top goes to a day: the days that have any of that kind are marked. **Go to a day**, under it in the details,
does the same for the chat itself: it goes to that day's first message.

**Why:** the lists are made on this phone from what it already keeps, so no server learns what a chat holds; and only
the photos on the screen are read, as in the chat, so a chat with thousands of them opens as fast as one with none.

A good first hour:

1. Open **Settings** → **Privacy and security** → **Lock and second password** and set a password, so nobody who
   picks up the phone can open Erevos.
2. Open **Nearby phones** from the menu on two phones that are close to each other, and allow what Android asks for.
3. Add each other with **Show my QR code**, as in [Chat with a nearby phone](#nearby), and send a message: it goes
   nearby, end-to-end encrypted, with no relay and no internet.
4. To talk from further away, set up a relay as in [Chat through a relay](#relay).

### Chat with myself and reminders

**Chat with myself** is always at the top of the chats, with a pin, in every space. It is a chat with no one else in
it: write notes, links, photos, files and voice messages to yourself, as in any chat. Nothing in it goes anywhere: it
stays on this phone, encrypted in the space, and is not passed on to your linked devices. A backup takes its notes and
voice messages, but not its photos and files, as with chats.

- **A reminder:** tap **Remind me** (the orange bell beside **New chat**), write what to remind you of, pick a time
  (**In 1 hour**, **Tonight 20:00**, **Tomorrow 09:00**, or any day, hour and minute) and tap **Remind me**. It goes in
  Chat with myself, with a bell and its time. In the chat, **+** → **Remind me**, or holding the send arrow, gives the
  note you write a time too.
- **At its time**, on Android, the phone shows a notice, **Reminder** (or **3 reminders**) – "Open Chat with myself to
  read it", never what it says, with Erevos closed and locked too; tapped, it opens Chat with myself, after the
  password. Until you open the chat, the reminder shows on its row at the top of the chats, with a count, and in the
  chat with a coloured edge; seen there, it goes from the notice too. On a computer, in the web app, or with notices
  turned off, that is where you see it. If **Exact times** is not allowed (**Settings** → **General** →
  **Permissions**), Android may show it a few minutes late.
- **Holding a note** offers **Copy**, **Open** (a photo or a file), **Remind me**, or **Change the reminder** and **No
  reminder**, and **Delete**.
- Each space has a Chat with myself of its own, and so does each place of hidden chats, at the top of their list (see
  [Hidden chats](#hidden)). A hidden place's reminders show there once its PIN opens it; the phone tells them at their
  time only while **Receive while closed** is on for that place, in the same notice. A new PIN for the place, which
  starts it empty, or the place removed, takes its reminders off the phone.

**Why:** a notice shows on the locked screen to whoever holds the phone, so what a reminder says stays encrypted in its
space and Android is told only its time: the notice cannot tell anyone what you wanted to remember, nor which space it
is in. And the notes go to no one, not even your other devices, so no relay ever carries them.

### Moving around with swipes

- **Back:** swipe to the right anywhere on a screen to go back, as the back arrow does. A round arrow comes out at
  the left; let go once it is whole, or flick, and you are back. Let go sooner and you stay. In a chat it does what
  its back arrow does: back to the list of chats, or out of hidden chats, closing them. In a chat's **Details** it
  closes them.
- **Tabs:** swipe to the left or right to go to the tab beside, as tapping its chip does: **All messages**, **SMS**
  and **Erevos** on the home screen, **Keypad**, **Recents** and **Favourites** in **Phone**, the filters in
  **Contacts**, and the sets of stickers.
- On a screen with tabs, a swipe only changes the tab, on the rows of its list too, and past the first or the last
  tab it does nothing: go back there with the back arrow. An SMS conversation is archived or deleted by holding it
  down.

### Settings

**Settings**, the last row of the menu (the three dots), holds everything you can set in Erevos, in groups, as a
phone's own settings do. In the other languages it is named in that language and in English, such as
**Einstellungen · Settings**, so it is found in a language you cannot read.

- **Search the settings,** at the top, finds a setting by the start of its words, with or without accents, and shows
  where it is, such as **Phone and SMS › SMS**. Tap it to open it.
- **Language · Γλώσσα,** the row under the search, opens the list of languages, see Language below.
- **A group** opens the list of its settings, and a setting opens its screen. A setting with parts, such as **SMS**,
  lists them, and each part opens alone.
- **Only what works here shows:** on a computer, on Sailfish OS and in the web app there is no **Phone and SMS**,
  Tor, Nostr or LoRa, and a group with nothing to set here does not show.

| Group | What is in it |
| --- | --- |
| **General** | **Language**, **Updates** and **Permissions** (Android and the web app). See Language below, and [Updates](#updates). |
| **Appearance** | **Style and colours** (look, glass, style, theme, colours and text on coloured areas, with the preview), **Wallpaper**, **Messages** (the bubbles' shape), **Launcher icons** (Android) and **Widget** (Android). See [Appearance](#appearance). |
| **Notifications** | **In the background** (Android): receiving and ringing while Erevos is closed, and the notice for messages. **Notifications while closed** (the web app): Web Push. **Number on the icon**: how many messages are not read, on Erevos's icon. See [On an iPhone](#iphone). |
| **Privacy and security** | **Lock and second password** (lock when Erevos opens, the password, screen privacy, fingerprint or face, the second password), **Hidden chats** (the PINs of the 4 places) and **This web app** (the web app only). See [Password lock](#lock), [Second password](#second) and [Hidden chats](#hidden). |
| **Relay and networks** | **Relay** (it opens **New chat** with **For advanced users** open), **Home relay**, **Tor** (Android), **Nostr** (Android) and **LoRa radio** (Android). See [Chat through a relay](#relay), [Home relay](#home-relay), [Through Tor](#tor), [Through Nostr](#nostr) and [Over a LoRa radio](#lora). |
| **Phone and SMS** (Android) | **Phone**, the phone app's settings, the same as **Phone** → **Settings**. **SMS**, in parts: **Erevos as the SMS app**, **Find Erevos on a number**, **Names from your contacts**, **Archived, Spam and Trash**, **Spam filter**, **Blocked numbers**, **Taking an SMS back**, **Two SIMs** (only with two SIMs) and **New SMS**. See [Phone](#phone) and [SMS](#sms). |
| **Data and devices** | **Backups**, **Linked devices** and **Imported chats**. See [Backups](#backup), [Linked devices](#devices) and [Imported chats](#import). |
| **For testing** | **Relay test** and **Radio test** (Android). See [The test screens](#tests). |

### Language

Erevos is in English, Greek, German, French, Spanish, Italian, Portuguese and Serbo-Croatian. The first time it
starts, it follows the phone's language if it is one of these (a phone in Serbian, Croatian, Bosnian or Montenegrin
starts in Serbo-Croatian), and is in English otherwise. To change it, open the menu (the three dots), tap
**Settings**, its last row, and then the first row there, **Language · Γλώσσα**. In the other languages both are
named in that language and in English, such as **Einstellungen · Settings** and **Sprache · Language**. Then tap the
language, each named in its own words: **Ελληνικά**, **English**,
**Deutsch**, **Español**, **Français**, **Italiano**, **Português** or **Srpskohrvatski**. The whole app changes
at once.

- **This guide** is in each of these languages too, and names the buttons as the app shows them in yours. In the
  languages other than English and Greek, a word new to the app may show in English for a while, until it is
  translated.
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
2. If you are not contacts yet, add each other: on one phone tap **New chat**, then **Show my QR code** (under **Start
   without a relay** while it has no relay), and scan it with the other, as in [Chat through a relay](#relay). Without a relay the code holds only your keys,
   and you reach each other nearby only, until you have one.
3. Pick the contact, type in the message bar at the bottom and tap the send arrow. Once their phone answers, the top of the chat says
   **Nearby**.

- **While a space is open:** the links start when a space opens, whatever screen shows, and stop when another space
  opens: locked, the space goes on behind the password screen. A message from nearby shows on the home screen as one through the relay does, and a call rings
  there too. On Android they stay up with Erevos in the background, while **In the background** is on **Receive and
  ring**. To spare the battery there, it looks for phones less often: Wi-Fi Direct every ten minutes, Wi-Fi Aware a
  minute in every five, and on the same Wi-Fi it hears the others twenty seconds in every two minutes. A phone nearby
  may so be found a few minutes later; links that are up stay up, and once Erevos shows it looks as often as before.
- **Range:** a few tens of metres in the open, less through walls.
- **Wi-Fi Aware:** faster, but not every phone has it. Bluetooth works on all of them. To stop it, turn off **Look
  with Wi-Fi Aware**, above **Find Erevos on the same Wi-Fi**.
- **The same Wi-Fi or a hotspot:** phones on one Wi-Fi, or on one phone's hotspot, find each other and talk directly,
  even when that Wi-Fi has no internet; the desktop app too. If Android asks whether to stay on a Wi-Fi with no
  internet, stay. Anyone on that Wi-Fi can tell an Erevos app is there, not whose. A computer's firewall must let
  port 47905 in (UDP and TCP). To stop it, turn off **Find Erevos on the same Wi-Fi** under **Nearby, with no
  internet**, on **New chat**.
- **A Wi-Fi of their own (Android 10 and later):** with no Wi-Fi in common, two Erevos phones near each other make a
  small Wi-Fi of their own (Wi-Fi Direct) and talk over it as on the same Wi-Fi: faster than Bluetooth, and a call
  goes over it with no internet. It asks nothing; each phone stays on its own Wi-Fi too where it can. Anyone near can
  tell an Erevos phone is there, and could join that small Wi-Fi, getting only sealed bytes. It needs **Find Erevos
  on the same Wi-Fi** on; to stop it alone, turn off **Make a Wi-Fi with phones nearby** below it.
- **On a Samsung phone** **Look with Wi-Fi Aware** and **Make a Wi-Fi with phones nearby** are off until you turn
  them on: while an app uses them, Samsung asks to turn off its own sharing. Bluetooth and the same Wi-Fi work without
  them.
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
  unless you turn on **Carry messages for others** under **Nearby, with no internet**, on **New chat**, and then only for relays on the
  internet over TLS (wss://): a stranger nearby never has your phone, or your relay, reach one on a local network or
  on the phone itself. Your own messages are carried by the phones nearby that have it on.

**Why:** a packet does not say who it is for, so no one nearby can tell from it whose it is. Until your contact's
phone answers on a link, your phone cannot tell which of the phones nearby is theirs either: so the short packets go to
all of them, each tries them, and from the first that opens, that link is your contact's. A voice message, in larger
pieces, waits for that.

> A message from nearby opens only in the space that has that contact. One for another space of this phone waits in
> memory, six hours at most, until that space opens. Hidden chats never use the nearby link.

**Why:** the nearby links belong to the phone, not to a space, and nothing on them names one: what comes is tried in
the chats of the space that is open, and kept a while in memory for the others, never written to the phone. Hidden
chats do not use them yet: that is still to come (see [What is protected today](#privacy)).

## Over a LoRa radio {#lora}

With a Meshtastic LoRa radio linked to the phone by Bluetooth, Erevos reaches Erevos with a radio on the same mesh,
kilometres away, with no internet: straight, or through the Meshtastic radios between. It is off unless you set a
radio, and on Android only.

1. Set up the radio in the Meshtastic app first, its **region** above all: without one it sends nothing. Then close
   the Meshtastic app, or disconnect it there: a radio links to one app at a time.
2. Open **Settings** → **Relay and networks** → **LoRa radio**, tap **Find my radio**, read what it says, and tap
   your radio when it shows. A radio not paired yet asks for its PIN: it shows on the radio's screen, or is 123456.
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

**Why:** what a Meshtastic radio says of itself goes in the clear, to anyone listening kilometres away: its name and
where it is could show where you are and tie the radio to you, so Erevos keeps it quiet unless you choose otherwise.
And as the law allows a radio only so much air time, LoRa is kept for your own texts, when nothing else can take them,
never for what other phones would have it carry.

> A LoRa radio is heard kilometres away, and its signal can be traced to where it is, quiet or not. What Erevos sends
> stays end-to-end encrypted, but anyone with a radio can tell that yours sends, when and how much. With
> **Said to all in reach**, anyone with a radio can also read its name and where it is.

## Chat through a relay {#relay}

A relay is a small server that keeps one-way queues: each phone has its own queue, and whoever has its **contact
link** can drop messages into it. The relay holds no accounts, names or phone numbers, and cannot read the messages:
they are end-to-end encrypted, and only the two phones have the keys. Each phone may use a relay of its own: a message
to a contact on another relay is sealed for theirs and handed to yours, which passes it on, so their relay never sees
your phone's address. A phone with no relay gets a place on its contact's, see **No relay of your own** below.

**Why:** with queues and no accounts, no server holds a list of who knows whom, and no one needs your phone number or
email to reach you: whoever has your contact link can write to your queue, and only you read it.

1. On the home screen, tap **New chat**. At the top, **How you connect now** says in plain words how your contacts
   reach you: through your relay, through Nostr with no relay, or only nearby. Below it are the ways in for a phone
   with no relay yet, or, with a relay, **Add a contact** and **Your contact link**. The relay's own settings are under
   **For advanced users**, at the bottom; **Settings** → **Relay and networks** → **Relay** opens New chat with them open.
2. Under **For advanced users**, type the **Relay address**: \`ws://<computer address>:7879\` for a relay on your own network, or
   \`wss://relay.example.org\` for one on the internet. Add the **Token** if the relay needs one.
3. Tap **Create my relay queue**. Erevos says **Relay queue created**, and **How you connect now** says **Through your
   relay**: everything works, texts, photos, voice messages, calls and groups.
4. Under **Your contact link**, tap **Show my QR code**: it opens over the screen. Let the other phone scan it with its camera, then open the link in Erevos. The
   **Add a contact** screen shows what it holds: tap **Add to chat** only if you scanned it yourself. **Add and connect
   to one of my contacts** adds them too, linked to the contact you choose, whose name the chat takes.
5. If their camera only shows the text, or they are far away, tap **Share my contact link** and send it to them.
   They paste it into the field under **Add a contact** and tap **Add**.
6. Or the other way round: under **Add a contact**, tap **Take a photo of the QR code** on their screen, or **Choose a photo of the
   QR code** for a screenshot or a photo of it they sent you. Erevos reads it and adds them at once. On a computer, on
   Sailfish OS and in the web app there is only **Choose a photo of the QR code**; on an iPhone it offers the camera too.
   Hidden chats have neither, as a photo leaves Erevos, which closes them: paste their link there.

The new chat appears on the home screen named **contact** and the first characters of their key, until it has a name:
**Rename** in its details gives it one. Right after you add them here, **Connect to one of my contacts** under the note
that they were added lets you choose one of your contacts instead (**Not now** leaves it): the chat takes that
contact's name, if it has none of its own, and the contact's card shows the chat. Hidden chats offer only their own
contacts, never the phone's. It is enough that one phone adds the other: adding a link starts an encrypted
conversation and tells the other phone how to answer, so it lists the chat the next time it looks at its queue, which
it does every few seconds.

**What the relay sees of a chat:** all your contacts write to your one queue. Once each phone has had a message from
the other, every message between them is sealed once more for the phone it goes to, with a key that phone gave inside
the chat, so to the relay each is random bytes of one of a few sizes, and it cannot tell from them which conversation
they belong to. The first message of a chat, and any sent before the answer comes, still show it. The relay still sees
which address puts each message in, and when. And each one tells the relay, in a byte it reads, what it carries: a
message someone reads, word between phones (that a message came or was read, typing, being online, reactions, new
keys), or a call that rings. So the relay sees which are messages, and when a call starts, whether notifications are
on or not: it is how a closed web app's notice can count them, and the notice of closed hidden chats.

### Ways in to the relay

A relay that needs a token lets a phone in three ways. Each way ends with a token of the phone's own there, so whoever
runs the relay can take any one phone out alone.

- **An invite:** a QR code or link from a phone already on the relay (see Inviting someone new below). Nothing to type,
  and you are contacts at once.
- **An account:** **Sign in with LPHL**, when the relay offers it (see Signing in to the relay below). Any LPHL account
  can, on up to 10 phones.
- **The relay's token:** the one token for all, from whoever runs the relay, typed in under **Token**. Erevos trades
  it at once, by itself, for a token of the phone's own, named there as you name yourself in invites (\`phone\` when
  you gave no name), says so, and uses only that from then on. So this phone can invite too. It needs a relay that
  takes invites, from after Erevos 3.1.0; with an older one, or one that takes no invites, the phone keeps the relay's
  token and cannot invite.
- **The limits:** a phone may have 5 invites waiting at once and make 10 a day (the day by UTC); each is for one phone
  and lasts 7 days. The relay lets in 100 phones by invite in all, the invites still waiting counting too, unless its
  operator chose otherwise. Phones that came with an account or with the relay's token do not count in those 100: the
  relay gives a token of their own to 50 phones a day that came with its token, and an account has 10 phones. The
  relay serves 512 connections at once, whoever they are, unless its operator chose otherwise.
- **Taking a phone out:** whoever runs the relay deletes its line in the relay's file of tokens: it can no longer use
  the relay, nor can the phones it invited. When it ever had the relay's token, they also change that token, so it
  cannot come back with it. Phones with tokens of their own go on as they are: only a phone with the old token still
  typed in (not opened since, or with an older Erevos) needs the new one.
- **Hidden chats** keep the relay token typed in for them: trading it at the same moment as the space's would show the
  relay that they are this phone's. When the relay's token changes, type the new one under their **For advanced users**.

**Why:** the relay gives each connection a thread of its own, so it serves only so many at once; and it adds only so
many lines a day for phones that came with its one token, so a token that went where it should not cannot fill its file
of tokens.

### Inviting someone new

One QR code or link brings someone new in: their phone joins Erevos on your relay, with access of its own, typing
nothing, and you are each other's contacts at once, with no message request.

- **To invite:** in the chats, with no contact picked, tap **Invite someone**. Type who it is for (their name in your
  chats) and, if you like, **Your name, for them**, then tap **Make the invite**. A QR code opens: once Erevos is on
  their phone, they scan it with the camera and open the link in Erevos, or tap **Share the invite** and send them the
  link. It is for one person, for 7 days, or less when the relay's invite ends sooner. Whoever takes it first has it,
  so give it to them only.
- **To join:** on a phone with no relay yet, **New chat** shows **Choose how to start**: tap **I have an invite**. Scan
  the invite with the camera and open the link in Erevos, or tap **Take a photo of the invite** or **Choose a photo of the invite**, or paste the link and tap
  **Join**. The link opens **… invites you to Erevos**: tap **Join** only if it came from them. Erevos takes access of
  its own to their relay and a queue there, adds them and says **Welcome to Erevos**. Its first message tells their
  phone, which adds this one as a contact at once, named as they typed.
- **With an account instead:** **Sign in with LPHL**, the second way in, signs this phone in to LPHL's relay with an
  LPHL account, in the browser (see Signing in to the relay below); then add your contacts by their invites or links.
  The third, **Start without a relay**, is in With no relay at all, under Through Nostr. **For advanced users** has
  the relay settings, as in 1 to 6 above.
- **What your relay must allow:** the access of its own is an invite to your relay (see Invites to the relay below),
  so it comes only from a phone with a token of its own on a relay that takes invites. It counts among your invites,
  under the name you typed for them, and goes with yours. A phone with the relay's one token for all trades it for one
  of its own first (see Ways in to the relay above); where the relay does not, it makes no invite: sign in to the relay
  first (below the **Token**, under **For advanced users**), or take an invite to it. When your relay takes no invites, the invite still makes you contacts, and their phone uses your relay only as
  your contact link lets it, as in No relay of your own below.
- **A phone with a relay already** keeps its own: the invite only adds you, and you are contacts at once all the same.
- **What is kept:** your phone keeps each invite's secret and the name for them, sealed in the space, until it is used
  or its 7 days end, 20 at most at once. Nothing of it is on the relay but the invite to the relay.
- **By SMS, to someone with no Erevos yet:** on Android, the card of a contact who is not in Erevos has **Invite by
  SMS**. It writes an SMS to their first number with a short link, in the SMS app (Erevos's own when it is the phone's
  SMS app), for you to send or not. The link's page on LPHL's web server offers them Erevos (the Android app, or the
  web app on an iPhone) and then opens the invite in it; in the web app on an iPhone, they paste the link under **I
  have an invite**. They tap **Join**: their phone joins your relay as above and answers yours through it, which adds
  them, linked to that number and named as on the card. Its first message, which goes by itself, makes you their
  contact, named as you named yourself in your last invite. The invite follows the **#** in the link, which no web
  server is sent, but the phone company sees the SMS, as every SMS: so it is for one person, for two days, and when
  the two days end with no phone having used it, your phone takes its invite to the relay back. It needs a relay
  that lets your phone invite, as above.

### No relay of your own

A phone with no relay chats over the internet all the same: adding the link of a contact whose relay lends places, it
takes a place there, with no token.

- **How:** add their link as in 4 and 5, with nothing under **Relay**. Erevos says you now have a place on their
  relay, lent through their link, and uses it as its own from then on: your own link names it, so others reach you
  there too.
- **Who lends:** your link carries a ticket for a place on your relay only when you turn on **Share a place on my
  relay with this link**, under **Your contact link** on **New chat**, and only for the link shown then: the next
  time the chat opens, it is off again. The relay needs a key for two-hop sending, and lends only once whoever runs
  it turns lending on; they can also take back a ticket's places. A ticket lasts 30 days and gives up to four places. Anyone who sees a link with a ticket
  can take a place with it, so give such a link only to whom you mean to.
- **What a lent place does not do:** messages to contacts on other relays go straight to their relay, which then sees
  your phone's address. It keeps nothing for later (a message sent later waits on the phone), gives no call relay
  (calls go straight between the phones), and makes 4 more queues and sends 50 MB of files a day at most. Your link
  lends nothing on.
- **Your own relay instead:** type its address under **Relay**: the lent place is let go of, and contacts learn the
  new one from your next message.
- **A link without a ticket** (from an older relay or Erevos): a relay that needs no token is used as it is;
  otherwise you reach each other nearby only, until you have a relay.

**Why:** a link with a ticket is a key to your relay for whoever sees it, so your link carries one only when you choose,
for the link shown then, and the relay lends only once whoever runs it allows it. A lent place's files are kept to a few
photos and voice messages a day, so it never takes the relay's whole store.

### Invites to the relay

A phone with a token of its own on a relay that takes invites can let one more phone use that relay, with a token of
that phone's own, so no token is typed or passed on.

- **To invite:** under **For advanced users** on **New chat**, below the **Token**, tap **Invite to the relay**, type who it is
  for and tap **Make the invite**. A QR code opens: let their phone scan it with its camera and open the link in
  Erevos, or tap **Share the invite** and send it to them. It is good for one phone for 7 days, and whoever takes it
  first has it, so show it to them only.
- **To take one:** the link opens **Invite to a relay**, with the relay's address: tap **Use this relay** only if it
  came from someone you know. In Erevos, **Take a photo of the QR code** and **Choose a photo of the QR code** under
  **Add a contact** read an invite too, and its link can be pasted into the field there. Erevos makes a token for this
  phone, keeps it with the relay's address in this space only, makes your queue there and says the name the relay gave
  the phone. If the phone uses another relay, it asks first, and contacts learn your new queue from your next message.
  Erevos takes an invite to a wss:// relay, or to a ws:// one on a home network only (such as
  \`ws://192.168.1.10:7879\`). Hidden chats take no invites.
- **Your invites:** listed under the button, waiting or in use. **Take back** takes back one still waiting, or cuts off
  the phone that took it at once, and the phones it invited in turn.
- **For as long as yours:** a phone you invited uses the relay only while yours may. When your line goes, because the
  phone that invited you took it back, the account you signed in with may no longer use the relay, or its operator took
  it out, the lines of the phones you invited go too, and those of the phones they invited. Signing in again on your
  phone keeps them.
- **What the relay keeps:** the name you typed, in Latin letters (Μαρία is \`maria\`), that you invited that phone,
  and a fingerprint of its token, not the token. Whoever runs the relay sees this, and can take any phone off it. A
  phone may have 5 invites waiting at once, and make 10 a day, and the relay lets in only so many phones by invite
  (100, unless its operator chose otherwise).
- **Who can invite:** a phone with a token of its own, on a relay whose operator turned invites on (see [Running your
  own relay](#own-relay)). A phone with the relay's one token for all trades it for one of its own first (see Ways in
  to the relay above). With a lent place there is no **Invite to the relay**.

**Why:** the relay keeps only a fingerprint of each token, never the token, so its file tells no one how to connect.
And an invite names a wss:// relay, or a ws:// one at home, so it can never send your phone's requests across the
internet in the clear.

### Signing in to the relay

A relay can let phones sign in with an account its operator trusts, such as LPHL, for a token of their own, with
nothing to type in Erevos.

- **To sign in:** type the relay's address under **Relay**. When the relay offers it, **Sign in with LPHL** shows
  below the **Token**. Tap it: the browser opens the sign-in page, where you type your name and password, which
  Erevos never sees. The relay's page then shows six digits. Back in Erevos, which puts you straight in **Code from the
  page**, type them there and tap **Finish signing in**: the phone keeps its token with the relay's address in this
  space only, and makes your queue there. Type the code only in Erevos on your own phone and give it to no one, even if
  asked: whoever types it uses the relay as you. After 5 wrong codes the sign-in is over: sign in again. Erevos opens
  only a sign-in page on the relay's own address, over https.
- **Signing in again** on the same phone takes the place of its line on the relay, when its token is the one it got
  from that relay. Each phone gets a line of its own, 10 at most for one account.
- **What the relay and LPHL see:** the relay names the phone's line after your user name (\`lphl:nekten\`), and every
  hour it asks LPHL whether the account may still use it: once the account is closed or disabled, or LPHL cannot be
  asked for 3 days, the line goes, and the phone can no longer use the relay, nor can the phones it invited. LPHL sees
  each sign-in and these checks, but nothing of your spaces, chats or contacts. Signing in from another space with
  the same account shows the relay that both are yours.
- **Hidden chats** do not sign in.

**Why:** the page shows the code and you type it in Erevos, not the other way round, so a sign-in link someone else
sends you gets them nothing: only whoever signed in sees the code, and five wrong ones end it. Erevos opens a sign-in
page only on the relay's own address, over https, so nothing answering in the relay's place can send you to a page
somewhere else. And a provider that cannot be asked for a while cuts no phone off at once: only 3 days without a good
answer do.

### The relay's own key

Once Erevos knows your relay's key (it asks the relay the first time, or a contact link gives it), every connection to
that relay starts with a check: the relay must prove it holds that key, and the token and everything after it go
encrypted to that key, inside the connection's own encryption (TLS). Under **How you connect now**, Erevos then says
that your relay proved its own key. From then on, this space never reaches that relay without the check.

- A relay older than this app proves nothing: it works as before, and **How you connect now** says it is older. Erevos
  tries again every hour.
- A relay that cannot prove the key Erevos keeps for it gets nothing, and your messages wait; **How you connect now**
  says so in red. Only if its operator told you it has a new key, tap **It has a new key**: Erevos then takes the key
  the relay gives next.

**Why:** the connection's certificate says only that whoever answers holds a certificate for the relay's name, which a
company that issues certificates can also give someone else, by mistake or when made to. The relay's own key is only on
its server, so no one in between can pass for it, and a renewed certificate changes nothing.

### The safety number

Open the chat, tap its name and then **Safety number**. Both phones show the same 60 digits for the two of you. Compare them
in person or on a call: if they match, no one is in between. If they differ, do not trust that chat, and add the
link again, scanned from their own phone. Once they have linked a device, it also says when the list of their devices
last changed: your messages go to each place in it too, so if they did not link or unlink one then, ask them.

### Sent, came and read

Under each of your messages to a contact, **✓** says the relay or a phone nearby took it, **✓✓** that it came to
their phone, and **✓✓✓** that they read it. Their phone tells yours, inside the encryption, the next time each looks
at the relay, or at once when they are nearby. A message counts as read once its chat shows on the screen.

- **Sending…:** the moment you press Send, the phone gives a short buzz, the field empties and the message shows,
  marked **Sending…** until the relay or their phone takes it. If it cannot go and cannot wait, its words go back in
  the field.
- **Waiting:** a message nothing could take, as the relay cannot be reached and their phone is not near, stays in
  the chat marked **Waiting**, and goes by itself, in order, once the relay or their phone nearby can take it, while a
  space is open; then it shows **✓**. A text waits at once. A voice message, photo or file asks first: **Keep it
  waiting** or **Delete it**. A waiting message is deleted on this phone only. In hidden chats it waits too, but goes
  through their relay only, never to the phone nearby or over LoRa: while they are open, or, with **Receive while
  closed** on, while the space is open. When the contact's queue on the relay is full, a text, voice message, photo or file still goes to their linked
  devices, if they have any, shows as sent, and is tried again for their phone while hidden chats stay open: closed
  before it went, their phone never gets it.
- **Send later:** hold the send arrow down and choose **Later…**, or tap **+** and then **Send later**. Choose a time
  at a tap (**In 1 hour**, **Tonight 20:00**, **Tomorrow 09:00**) or the day, hour and minutes, up to a year ahead, then **Send later**. The message stays in the chat marked
  **Scheduled** with its time. It goes encrypted to the relay, which keeps it and sends it at that time, even if this
  phone is off or locked then, and their phone shows it from that time, not sooner. With no relay reachable now, it
  waits on this phone and goes to the relay once one can be reached. With nothing typed, the time you choose is for
  the next photo, file or voice message: a photo or file goes to your relay at once and stays there until they take
  it, 14 days after its time at most. Hidden chats have it too, the same way, through their relay. Until its time, delete it to take it back from the relay, and it never goes. Should their relay queue
  change before then, Erevos holds it again for the new one the next time it reaches the relay.
  With a token of this phone's own, it goes only if the phone still has its line on that relay then. A message without sound
  stays without sound. A relay from before this keeps nothing for later: then the message waits on this phone and
  goes at its time while Erevos runs, in the background too while **In the background** is on **Receive and ring**
  (below), or when Erevos next opens.
- **Send without sound:** hold the send arrow down and choose **Without sound**: their phone shows the notice without
  a sound or vibration. An Erevos from before it does not know this and sounds as usual, and so does Erevos as a web
  app, whose notice comes from the browser. So does the notice of a place of hidden chats that is closed, with **Say
  when a message comes** on, and of a closed space with **Also while another space is open**: these only ask the relay
  how many came, and it cannot tell one without sound from another, as only the encrypted message says so.
- **Links:** a web address in a message is underlined. Tap it and Erevos shows it whole, to open in the browser
  only if it is where you want to go. Nothing is fetched before that.
- **Share from another app** (Android): in another app's **Share**, such as the browser's for a page, pick
  **Erevos**. Once a space is open, **Send to** lists the chats, groups and SMS conversations the home screen showed
  last, then every other chat and group, with a search; never hidden chats. Words and links open in the message field
  of the one you pick, to read and send there; a photo or file (100 MB at most) goes as soon as that chat or group
  opens, a photo at the quality you chose for photos, and never as an SMS. Until then its copy waits in Erevos's own
  storage on the phone, and goes once sent, or when you leave **Send to**.
- **They see when you read:** your phone tells theirs, as theirs tells yours, unless that chat appears offline (below).
- **When messages come:** Erevos looks at the relay every few seconds while it is open and unlocked, on any screen,
  and the home screen moves the chat to the top by itself. On Android each new message sounds, with a notice that
  says only how many came, while Erevos shows too; in the chat or group open on the screen only the sound plays, and
  opening a chat takes what came there off the count. Typing, and that a message came or was read, make none. On
  Android it goes on in the background too, while **In
  the background** is on **Receive and ring** (below): there it waits at the relay until something comes, a minute at
  a time, instead of asking every few seconds, and asks nothing more when nothing came, so the battery lasts, and a
  notice says only how many messages came. Closed, locked, or
  long in the background otherwise, it does not: messages wait on the relay, up to 14 days, and come once Erevos
  opens again. A question to the relay with no answer in time (a wait there its minute and half a minute more,
  anything else 45 seconds, a part of a file 2 minutes) counts as failed and is asked again, so a connection that
  died on the way, as when the phone's network sleeps or changes, holds nothing back.

### Online, and appearing offline

While a contact's chat is open on your screen, Erevos asks their phone now and then whether it is open, and says yours
is. If theirs is, the chat says **Online** under their name with a green dot, and the home screen shows the dot on
their picture. Writing to someone also shows you online to them for two minutes. All of it goes inside the encryption,
only between you and that contact: the relay sees a message now and then, as with any chat. There is no "last seen".

While you type to a contact who shows online, their chat shows **typing…** under your name for a few seconds, and
yours under theirs when they type. It is said every few seconds at most, only while they show online, never to a
message request, and not in groups.

**Why:** being online is said only between you and a contact whose chat is open, inside the encryption, so the relay
sees no more than a message now and then between two people talking, and nothing of it is kept: so there is no "last
seen" to show. Someone who only has your link, writing as a message request, hears nothing back until you accept: not
that you read, nor that you are online or typing.

To hide it from one contact, open their chat, tap its name and then **Appear offline**. With it on:

- **They do not see you online**, nor that you are typing, and your phone sends them nothing while you read.
- **Their messages stay ✓** on their phone, not ✓✓ or ✓✓✓, while you read them.
- **When you write to them**, you show online for two minutes, and every message of theirs you read turns ✓✓✓ at once.
- **You do not see them online either**, since your phone does not ask.

It is set for each chat, on this phone only. Turn it off again and they see what you read with your next look at the relay.

### Names and deleting

Open a chat, tap its name and then **Rename** to give it a name. The name stays on this phone, sealed with the chat: the other phone
does not see it. An empty name brings back the start of their key, unless one of your contacts is linked to them: then they take its
name again the next time its card opens, while the link stays (see [Contacts](#contacts)).

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

**Why:** a message that disappears is left out, and so is a quote of one, as whoever sent it meant it to disappear,
not to stay in a file.

To delete one message, press and hold it and tap **Delete**. To delete all the messages of a chat, tap its name and then **Delete messages**.
Either way Erevos asks where:

- **This phone:** only here. The other phone keeps its own.
- **Both phones:** their phone deletes them too, the next time it looks at the relay. Their Erevos does so, but a
  changed app, a screenshot or a copy can still keep them.

### Deleting and blocking a contact

Tap a chat's name and then **Delete contact** to forget them: their chat goes from this phone, and Erevos gives you a
new relay queue at once. Your other contacts are told it quietly, in a message with nothing in it, and again 7, 14 and
21 days later while they have not written to the new one; what they wrote to the old one meanwhile still shows for 14
days. The one you deleted is not told, and nothing they send there shows. Your contact link stays as it was, so they
can still ask to talk again with it, as a message request, like anyone who has it.

**Why:** all your contacts write to your one queue, so whoever you delete still knows where it is; once it moves, they
can no longer write to you there, nor can whoever sent the junk below. Your contact link names a queue of its own,
which a deletion leaves alone, so every link and QR code you gave keeps working.

**A queue for each contact:** at a relay updated for it, each contact writes to a queue of their own, which only they
know, said inside your encrypted messages; your contact link's queue is then only for first messages. So the relay
cannot tell from where messages go that two contacts write to the same phone, and deleting or blocking someone deletes
their queue alone: your own moves only if they knew it too, as contacts from before this do, and someone who came
through your contact link before its first move. Contacts from before get one of their own in turn, a few at a time,
quietly, and an Erevos of theirs from before takes it too. These queues are read with no token, so the token, which
names your phone, does not tie them together; through Tor, eight at a time, each eight on circuits of their own. They
are still made and deleted with the token, so a relay that keeps logs can tie them together then. Hidden chats and
linked computers keep one queue for everyone, for now. The web app has no Tor, so while it is open it waits on all
your contacts' queues together, from one address; with notifications while closed turned on, your relay also has one
push address for all your contacts' queues (see [On an iPhone](#iphone)).

- **Block contact**, under it, does the same, and also drops what they send later, a request too. **Block**, beside
  **Refuse**, blocks a message request: a request knows only your contact link, so it moves your queue only while the
  link still names that one, as it does until your first move. Whoever you blocked is under **Blocked contacts** on
  **New chat**, with **Unblock**. Adding them again from their link asks you to unblock them first;
  until then nothing adds them, neither their answer to an invite by SMS nor their contact link in a group. Each
  person who writes from your contact link can make the phone sound, as any message does: **Refuse** or **Block**
  stops that one, **Notifications** → **Muted** in their chat silences them without refusing, and **New contact link**
  stops whoever has the old link once its 14 days are over.
- **Groups:** someone in one of your groups can still write to you there. Erevos says in how many you are together:
  leave them, or ask their admin to take them out.
- **When the relay cannot be reached**, the queue changes as soon as it answers, and until then nothing they send
  shows.
- **Scheduled messages** you had for them are taken back from the relay, at once or as soon as it answers, so they
  never go.
- **Junk:** when your queue fills with what is for no one here, Erevos gives you a new one the same way and says so, at
  most once a day. When junk fills the queue your contact link names, you get a new link instead. A flood of made-up
  message requests counts as junk too, while a batch of real ones still comes.
- **New contact link**, beside **Share my contact link**, gives you a new link: the links and QR codes you gave before
  work for 14 more days, then no more. Your contacts are not affected. Should the relay lose the queue your link
  names, you get a new link the same way, but the ones you gave before stop working at once.
- **On a linked computer** it goes to the phone, which deletes or blocks them too and moves its queues, the computer's
  as well. The phone keeps who is blocked and tells the computer: adding them there from their link asks you to
  unblock them too, and **Unblock** unblocks them on the phone as well.
- **In hidden chats** only that place's queues move, its ring queue at once, so the one you deleted can no longer make
  the phone ring. Nothing of the space or the other places moves.

The contact card's **Delete** (see [Contacts](#contacts)) takes only the card away, not the chat. A backup made before
a deletion or a block brings that contact back: delete or block them again after restoring it. Once restored, your
queue says it is newer than any your contacts know, and each is told it again, so they all write where you read.

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
- **Edit:** for a message of yours, up to a day after you sent it. Its words go in the field under **Edit message**:
  change them and send, or **✕** to leave it as it was. Both phones show the new words, with **Edited** beside the
  time. Only words are edited, not a sticker, a place, a poll, a voice message, a photo or a file, nor words you
  forwarded. One that still waits to go goes with the new words, not marked; one sent for later is not edited. The
  edit goes at once, or not at all, as a reaction does, and your linked devices show it too. An Erevos from before
  this keeps the old words.
  **Why:** a day is time enough to put a mistake right, and no one can change what they said days ago. The mark
  shows the words are not the first ones.
- **Delete:** on this phone, or on both, as above.

Reactions, replies, pins and edits travel inside the encryption, like the messages.

### Disappearing messages

Open a chat, tap its name and then **Disappearing messages** to choose how long its new messages last once read: 5 minutes, 1 hour,
1 day or 1 week. To make only the next message disappear, tap the stopwatch beside the message field (or
**Disappearing message** under **+**, or **Disappear** in the send arrow's menu): **Disappears 1 hour after it is read**
shows over the field. Tap the time to pick another, or **✕** to turn it off. It goes with the next message you send:
words, a voice message, a photo or file, a sticker, a place or a poll, now or later. An SMS cannot disappear: sent as
an SMS, it stays on both phones (Erevos says so first), and the stopwatch is off again. Its time starts when the other phone shows it on the screen, and your copy starts when their phone says so
(**✓✓✓**). Each message says when it disappears. The other phone learns the chat's setting the next time it looks at
the relay, and either phone can change it: the later change wins. Messages already in the chat stay.

- **Until it is read** a disappearing message stays on both phones, sealed like the rest. If their Erevos never says
  it read it, your copy stays.
- **While Erevos is closed:** a message whose time has come is deleted when the chat next opens. Until then it stays
  on the phone, sealed like the rest.
- **Not a guarantee:** their Erevos deletes them, but a changed app, a screenshot or a copy can still keep them.

### Notifications for this chat

On Android, open a chat, tap its name and then **Notifications**; in a group, tap its name (in a public group, **⋯**)
and then **Notifications**. **Muted** for 8 hours, 1 week or **Always**: its messages make no sound and show no
notice, so Erevos's icon does not count them either; the list still shows them, with a struck-through bell, and its
calls still ring. **Message sound** and **Ringtone** give it a sound of its own for its messages and for its calls,
from Android's own list of sounds, or **Without sound**. In a chat's details the row then says **Muted until** and the
time, or **Sounds of its own**.

**Why:** a muted chat still counts in the list, so nothing that came is lost: only the phone stops calling you to it.
Its sounds are kept on this phone only, with the chat in the space's encrypted data, as each phone has sounds of its
own: a linked device keeps its own, and the other phone learns nothing of them.

- **In hidden chats** there is only **Muted**: a sound of its own would tell anyone near which chat it is.
- **A closed space, and hidden chats while closed,** do not know which chat a message came in, so they tell of it as
  the app's settings say.
- **Only on Android** for now: the web app tells of every chat as its settings say.

### Voice messages

In a contact's chat, with nothing typed, press and hold the microphone at the end of the message bar while you talk,
and let go to send; slide left before you let go to drop it instead. A press of under a second is taken for a slip
and sends nothing. After a minute it sends by itself. The first time, Android asks whether Erevos may use the
microphone: it records only while you hold it. With TalkBack, tap it once to start and again to send. Tap a voice
message to play it, and tap it again to stop. Voice messages have the same marks as the rest, and follow the chat's
disappearing setting.

**Why:** on a phone a voice message is AAC at 64 kbit/s, about 480 KB a minute: as clear as speech gets. More would
not be heard in a voice, but would be slower to send, over Bluetooth most of all.

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

In a contact's chat, tap **+** beside the message field, which opens where the keyboard was, then **Photo** to pick one
from the phone's photos, **Camera** to take one, or **File** for anything else, up to 100 MB. Under them, **Photo
quality** sets how photos go, and
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

### More under +

Under **+** there is more to send than photos and files (the smiley at the end of the message field opens the
stickers too):

- **Sticker:** one of the 528 stickers built into Erevos, in 22 sets of 24 (among them **Moons**, **Dogs**,
  **Greece**, **Words** and **Treats**), drawn by each phone itself: only its name travels, so nothing is ever
  downloaded. An Erevos from before this shows its emoji instead. All but the words and the treats move a little for a
  few seconds as they come and when tapped, then rest; with the phone's reduce motion setting on, they stay still. The
  words show in the app's language.
- **Mine**, among the stickers, holds those you make from photos. **New sticker from a photo** cuts one square, makes it
  small (512 by 512, about 100 KB at most) and keeps only its picture, nothing of where or with what it was taken. It is
  kept sealed in the space, or in the hidden chats it was made in, and shows only there, up to 100 of them; hold one to
  delete it. Like the rest, it goes into a backup, sealed, and never to the account's other devices. It goes as a photo
  goes, end-to-end encrypted through the relay, marked as a sticker, so it shows on its own with no bubble; an Erevos
  from before this shows it as a photo. Hold a sticker someone sent you and tap **Add to my stickers** to keep it.
- **Location** (on Android): sends where you are, once, as a place. The first time, Android asks whether Erevos may use
  the location. The phone looks on every way it has at once: by satellite, when you allowed the precise location, and by
  its network location, which on many phones asks Google or the phone's maker. A sheet opens at once and says it is
  looking; indoors, where the satellites are hard to see, that can take up to a minute. When nothing comes in time, it
  offers the place the phone found in the last ten minutes, saying how long ago, or says why none was found, with **Try
  again** and the phone's screen that changes it. Erevos looks only when you tap, shows you the place before it goes, and
  does not follow you after. The message holds only the coordinates, end-to-end encrypted; no map is loaded in Erevos.
  **Open in maps** hands the place to your maps app, which may load its map from the internet. An Erevos from before this
  shows the coordinates as words.
- **Poll:** a question with two options or more, up to 12, and, with **More than one answer**, more than one to choose.
  Tap an option to choose it, again to take it back; each option shows how many chose it, and who. Votes travel inside
  the encryption, as reactions do. An Erevos from before this shows the question and its options as words, to answer in
  words.

**Why:** a sticker pack fetched from the internet would tell a server that this phone has Erevos, so the stickers are
built in and only their names travel. Your own are listed in one sealed value of the same size for every space and
hidden place, used or not, so a list in use looks like one that is not: 100 is what it holds. A place is sent only from
Android: on a computer or in the web app, the browser would ask an outside service where it is.

### Link previews

A link in a message is underlined, and opens only once you tap it and say so. With **Link previews** on, in a chat's
details, a link you send goes with its preview: as you send it, this phone fetches the page and takes its title, a line
about it and a small picture, and they go inside the message, end-to-end encrypted. The phone that gets it fetches
nothing: it shows what came. It is off unless you turn it on, and then it is on for all the chats of the space;
each place of hidden chats has a switch of its own, in a chat's details there.

**Why:** only the sender's phone fetches the page, so the phone that gets a link reaches no site someone else chose,
and shows that site nothing of itself, not even its address.

- **The site sees this phone's internet address**, and when, as it would from a browser, but not who the message is
  for. Through Tor, Erevos sends only its relay requests, not pages, so while everything in the space goes through Tor
  (**Everything** under Tor) no previews are made at all.
- Erevos on a computer makes none, but shows those that come all the same.
- **Over LoRa**, which takes only a little, a message goes without its preview rather than wait, and keeps none here.
- A preview is what the page says of itself, true or not. An Erevos from before this shows the link without it.

### Voice and video calls

In a contact's chat, tap the green handset at the top for a voice call, or the blue camera beside it for a video call. The first time, Android asks whether
Erevos may use the microphone, and the camera for video. Their phone rings while Erevos is open there, on any screen of
the space: they tap **Answer** or **Decline**. During the call you can mute, switch the loudspeaker, turn your camera off, flip
between the front and back camera, and **End**. Each call leaves a line in the chat, such as how long it lasted, or
a missed call.

**A plain call on the mobile network:** when a contact has their phone number linked to them, or is connected to one
of your contacts with a number (**Connect to one of my contacts** in their chat, a mobile number first), the orange
keypad at the top of their chat, before the camera, opens a keypad with that number typed, and so does the one at the
top of an SMS conversation. It is Erevos's **Phone** when Erevos is the phone app, or else the phone's own: tap the call key there. Such a
call goes over the phone company's network and is not encrypted, as a plain SMS is not. Hidden chats and computers do not have it.

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
  swiping it away from the recent apps, with a quiet notice, "Erevos – Ready for calls and messages", that does not
  show on the lock screen. It waits at the relay and on the links to phones nearby, so messages come: a notice
  says only "New message", or how many came, and on a locked phone only "Erevos". A message request, from someone who
  has only your contact link, makes the same notice and sound, and counts on the icon, as any message does. A call
  rings with the phone's ringtone and a notice, "Incoming call" (or "Incoming video call") – "Open Erevos to answer",
  with no name, over the lock screen and the screen saver too, and the screen wakes. Tap it to answer. With the password
  lock on, a call that rings shows before the password, and Erevos locks as soon as it ends. Locked, the space goes on
  behind the password screen, so messages and calls still come, and a call shows over the password screen. Only that space's chats
  and groups come so, and hidden chats with **Receive while closed** on; other hidden chats only say that a message
  came, or ring with no name, if you let them (see Hidden chats). Set it under **Settings** → **Notifications** → **In the background**:
  **Receive and ring** (the default) or **Only while Erevos shows**, and **Say a message came** (the default) or **No
  notice**, which goes for while Erevos shows too. There too, if Android asks for them, **Keep running on battery** and **Show calls over the lock
  screen**.
- **The number on the icon:** with **Say a message came** on, when you leave Erevos with messages not read in the open
  space's chats and groups, the notice stays, without sound, and says how many, with those it tells of after; it goes
  while Erevos shows, and comes back as you leave it, until you have read them. Messages in a muted chat are not
  counted (see Notifications for this chat), nor those in a hidden chat as you leave. Android's launcher shows it on
  Erevos's icon, as a number, or on some phones, such as Pixels, as a dot. **Settings** → **Notifications** → **Number
  on the icon** turns it off: the notice then tells only of what came since you last had Erevos open, and the
  launcher's number goes with it. A message deleted for everyone before you read it, or read on a linked computer, no
  longer counts.

  **Why:** on Android only a notice can put a number on an app's icon, so the notice stays while messages wait; it
  says no more than how many, as it always did.
- **A space that is closed:** it receives nothing, as its key is only in memory while it is open: its messages wait at
  its relay and come when you open it. Unless you choose, in that space, **Also while another space is open** under
  **Settings** → **Notifications** → **In the background** (the default is **This space only while open**): then, while
  another space is open and receives, it says only "New message", or how many came, with the same notice as that space,
  never which space, and its hidden chats say nothing. What other phones carried to its relay counts as a message,
  deletes too, and a message sent to it without sound sounds as usual (see **Send without sound**). For it the phone keeps the addresses of its queues at its relay
  outside its password, including the queue each contact writes to, for up to 64 contacts, never its keys, who its
  contacts are, or its messages, and asks the relay only how many came, never for them: they stay there until the space
  opens. A space that goes through Tor (**Messages**, the default, or **Everything**, under **What goes through Tor**) is asked
  about only through Tor: while the open space has Tor off, or its Tor is starting or has just failed, the closed space
  says nothing, and what came is told once Tor is ready there.

  **Why:** a space behind a second password must not show that it is there, so it is off unless you turn it on, and then
  it says no more than the space that is open would. Asked straight from the phone while another space is open, its
  relay or someone watching the network could tie the two spaces together by the phone's internet address. Since each contact writes to a queue of their own, the space must
  ask about each of those too, or their messages would say nothing. The cost is that its relay may tell that the two
  spaces are on one phone, and someone who examines the phone with tools may find that a second space keeps addresses
  there, and how many contacts it has.
- **Where it cannot ring:** stopped by Android (or by the phone's battery saving, or the phone maker's own setting),
  after the phone restarts until you open Erevos and the space once, in another space (it only says a message came, if
  you let it, as above), or on a computer or in the web
  app while closed. A call there shows as a missed call once Erevos opens. When Android closes Erevos while it
  receives and starts it again, as it usually does, a quiet notice says so: open Erevos and the space to receive
  again. After **Force stop**, with battery use set to Restricted, or when the phone maker's own setting closes it,
  Android starts nothing again, so no notice says so: the "Erevos" notice just goes, and nothing rings until you open
  Erevos. **Permissions** (below) says ahead if one of these is set. So does one, "Locked", when the space
  that received closes (after a backup is restored, say) and Erevos leaves the screen with the password asked. A message request cannot call you until
  you accept it.
- **Permissions (Android):** **Settings** → **General** → **Permissions** shows what Android lets Erevos do for calls
  and messages in the background (notices, the call notice and that it pops up, the message notice, with its
  "Messages without sound" and "Messages with a chat's own sound" notices, which also keep the number on the icon,
  calls over the lock screen, running on battery, running in the background with battery use not set to Restricted,
  not paused when unused, mobile data in the background, the microphone) and for other things (the sound for new
  messages, notices on the lock screen, calls through Do Not Disturb, camera, phones nearby, contacts, exact times for
  SMS sent later and reminders, the reminder notice once a reminder came), each with why and a
  button that opens Android's own question or setting. It also says when the phone is on silent or vibrate, when
  battery saver is on, and when Do Not Disturb is on while Erevos calls are not let through it. On Huawei, Honor,
  Xiaomi, OPPO, realme, OnePlus, vivo, Samsung and ASUS phones it also says where the maker's own setting is, which
  Erevos cannot read: tap **I did it** once it is set. After each new version, and the first time, it opens by itself
  when calls or messages need something. In the web app it shows what the browser allows, see [On an iPhone](#iphone).
- **One call at a time.** A call goes on while you move between screens of the space. It ends when the space closes,
  and a call in hidden chats when they close, which they do not do during a call. Swiping Erevos away from
  the recent apps ends a call too.
- Calls do not go over a nearby phone or Bluetooth. There, **Talkie** under **+** turns the chat into a
  walkie-talkie, and **Talkie is on** shows over the field: hold the walkie-talkie at the end of the bar while you
  talk, let go, and it plays on their phone as it comes, if the chat with you is open
  there; if not, it waits as a voice message. It is a smaller voice message (about 3 KB a second), so it goes
  everywhere a message goes, Bluetooth included.

**Why:** the keys that open a space's messages are in memory only while it is open, and sealed behind its password
otherwise. So after the phone restarts, nothing can be read and nothing rings until you open Erevos and the space once;
and hidden chats, whose key is in memory only while they are open unless **Receive while closed** keeps it with the
space, otherwise only say that a message came, or ring with no name, if you let them.

> The relay settings, your queue, your contacts and their names, the keys of your conversations and the messages are
> kept in this space, sealed. History has no limit: it is kept in sealed pages of the same size, mixed with the pages
> of the other spaces and hidden chats, so only how much they all take together shows, not whose they are. The rest
> is kept the same size for every space and hidden chats, used or not; what is larger goes to pages like the
> history's, among them. Deleted
> messages can stay for a while in the phone's storage, sealed like the rest, until something is written over them.
> Messages sent or received nearby are kept the same way.

## Group chats {#groups}

From the home screen's menu, **New group**: give it a name, tick the contacts to ask, and tap **Make the group**.
You are its admin. Each contact's phone answers by itself the next time Erevos is open there, and joins: the group
then shows on their home screen, with a note of who added them. A phone joins only a group whose admin is the contact
who asked it, and an admin lets a contact in only as themselves, never as someone else. Groups go through the relay,
so it has to be set.

**Why:** only the admin's phone changes the group (who is in it, its name), so no server has to put the changes in
order: every phone takes them from that one. So a member leaves by asking the admin, and only the admin adds or takes
out members.

- **Who can be asked:** contacts you have accepted, in this space. Members who are not each other's contacts still
  talk in the group, and show by the start of their key.
- **Add as contact:** in the members list (**⋯**), **Add as contact** under a member who is not your contact asks
  them, in a message only they get, for their contact link, and gives them yours. On their phone the ask shows once,
  at the top of the group, and they tap **Send** or **Don’t**; if they tap **Don’t**, you are not told. Once they send
  it you are each other's contacts, with a chat of your own, and **Name** gives them a name, as it does under any
  contact who has none yet. No answer can mean they have not opened the group yet, said no, have an older Erevos, or
  still have you as a contact, which shows them nothing; after a week you can ask again. Once you are each other's
  contacts, in any group or by a contact link, what was asked in your other groups goes, and their ask no longer
  shows. A member taken out of the group asks nothing more. If two members show the same key, one of them is not who
  they say, and no contact link goes to either or is taken from either. Not in public groups. Asking is for the phone
  that holds the account; **Name** works on a linked device too.
- **End-to-end encrypted for the group:** MLS (RFC 9420). Each message is encrypted once for the group, then sealed
  again for each member, so what reaches each member's queue looks like nothing the others get, and no relay can tell
  who is in a group. It goes straight to each member's queue, through your relay. Every week each phone's keys in the
  group are made new, the admin's by itself and each member's through the admin, so keys taken from a phone once stop
  reading the group.
- **Members:** tap the group's name at the top, or **⋯** beside it. The admin adds contacts, takes members out and renames the group. A
  member taken out reads nothing the group says from then on, and the group stays on their phone, read only, until
  they delete it.
- **Leaving:** **Leave the group** asks the admin, whose phone takes you out the next time Erevos is open there. The
  admin's own button is **Close the group**: it takes every member out.
- **Group calls:** the green handset at the top of the group starts a voice call in it, and the blue camera beside it
  a video call (also **Video call** under **⋯**). While one is going on, only its own button shows, to join it. It
  rings on the members' phones where Erevos is open, and whoever answers is in it. A call going on shows at the top of
  the group, to join it later. Up to eight people: each phone connects to each other one, through the call relay, so
  no phone sees another's IP address; without a call relay, only on the same Wi-Fi. End-to-end encrypted between each
  two phones, their keys sent in the group's encryption. In a video call each phone sends its picture to each other
  one, so pictures show for up to four people; with more, they pause and the sound goes on, until a server for bigger
  video calls is set up.
- **Photos, files and voice messages:** **+** beside the field sends a photo or a file, as in a contact's chat,
  with the same **Photo quality**; hold the microphone while you talk, and let go to send. Each is encrypted with a key of
  its own and put on your relay once, and only where it is and its key go to the group, in its encryption. Each
  member's phone takes it from there through its own relay: up to 16 MB by itself while the group is open, a bigger
  one when tapped. Tap a photo to see it whole, a file to save it, a voice message to play it.
  - **The relay keeps it 14 days,** encrypted, as it cannot know when every member has taken it.
  - **Through the relay only,** even when members are nearby.
  - **A member who joins later** does not get what came before, as with the words. A member whose Erevos is from
    before this version sees nothing of it.
  - **On the phone** each is kept in its pieces, sealed, as in a contact's chat. Deleting the group here deletes them.
- **A message's menu,** held down, as in a contact's chat: the reactions, **Reply**, **Forward**, **Star**, **Pin**,
  **Copy**, **Edit** and **Delete**. Each member has one reaction on a message, and a poll shows who chose what. A pin is for
  everyone, and any member can **Unpin** it. **Edit** gives your own words new ones for every member, up to a day after
  they went, marked **Edited**. **Delete** asks **This phone** or, for your own message, **Everyone**:
  the members' Erevos delete it too, and a photo, file or voice message of yours leaves your relay at once instead of
  in 14 days. **+** has **Sticker**, **Location** and **Poll** here too. Links are underlined and asked before
  they open, and **Link previews**, when on, go with yours. In the members sheet, or a public group's own screen, **Search in this chat** goes through the group's messages and **Export chat**
  writes them out; **Starred messages** and the home screen's search take in the groups too. A member whose Erevos is
  from before this version sees the words, a sticker's emoji, a place's coordinates and a poll's question, and
  nothing of reactions, pins, edits and deleting.
- **Not yet:** marks, typing and disappearing messages in groups, and groups over a nearby phone.

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

**Why:** only the owner's phone changes the group and lets people in, so changes never race and no server has to put
them in order. That is why the group goes on without it, but no one new comes in: hand it over before you change
phones.

### What a public group gives away

> Anyone with the link can read the group from when they are let in, never what was said before, and the link can be
> passed on: change it to stop that.

- **The link** shows the group's name and your relay's address to whoever sees it.
- **Every member sees every member's** chosen name, a key made for this group alone, their relay's address and their
  queue's sender id. The key says nothing of who they are in their chats, nor which other groups they are in. The
  queue is one their public groups alone read on, not the one in their contact link, the same in each of their public
  groups (an Erevos before 2.0.0 says the one in its contact link).
- **Names are chosen, not proven:** anyone can call themselves anything. The start of each member's key shows beside
  the name, and the owner and the admins are marked.
- **Whatever is said can be copied** by anyone in the group: end-to-end encryption keeps the relays out, not the members.
- **The relays** read nothing and learn no one in the group. Yours sees requests come to the group's door, how many and
  when, not from whom. Members can fill each other's queue with what cannot be read, up to what the relay takes.

## How Erevos picks the path {#paths}

When you send a message, Erevos picks the path by itself:

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

**Why:** what the relay keeps has limits, so the phones that use it cannot fill its disk or its memory.

**Its own key:** the relay's key file (\`EREVOS_RELAY_KEY\`, which the one command sets up) is what it proves on every
connection, so phones know it by that key rather than by its certificate (see [The relay's own key](#relay)). Keep that
file, in its backups too: with a new one, every phone that knew the old key refuses the relay until someone taps **It
has a new key** on it.

**Invites:** the relay can let each phone have a token of its own, in a file of tokens, and then let those phones
invite more, each invite for one phone (see [Invites to the relay](#relay)). Turn it on with
\`EREVOS_RELAY_INVITES=on\` beside \`EREVOS_RELAY_TOKENS\`; the relay then writes the lines of invited phones in that
file itself, with who invited them and when, and taking a line out cuts that phone off, and the phones it invited. It
lets in 100 phones by invite at most (\`EREVOS_RELAY_MAX_INVITED\`). Who invited whom goes by the token, not the name: a
line put in place of another with a new token cuts the phones the old one invited, unless
\`erevos-relay free-line NAME\`, run with the relay stopped, frees them first. A phone that comes with the relay's
token (\`EREVOS_RELAY_TOKEN\`) asks once for a line of its own, which the relay adds as one of yours, saying it came
with the relay's token and when, 50 a day at most: so you can hand out that token, delete any one phone's line, and
then change the token without cutting off the others. \`deploy/relay/README.md\` says how.

**Signing in:** with a file of tokens, the relay can also let phones sign in with an OpenID Connect provider, such as
Authentik, for a token of their own, and checks each account every hour, taking its phones off after 3 days without an
answer and two more checks of each phone that fail an hour apart (see [Signing in to the relay](#relay)). One browser
may start 10 sign-ins a minute. With \`EREVOS_RELAY_OIDC_GROUP\`, only the accounts in that group may.
It needs a client at the provider, a few settings, and \`/signin/\` passed to the relay as plain HTTP:
\`deploy/relay/README.md\` says how.

> Never post the token where others can read it. Whoever runs the server sees the IP addresses that connect, the
> queue ids, and when and how much arrives. They cannot read the messages, which are end-to-end encrypted.

## Home relay {#home-relay}

Under **Settings** → **Relay and networks** → **Home relay**, a space can have a second relay with a queue of its own:
one at home, on a Raspberry Pi or an old computer, or any other relay you trust. It is optional.

- **What it does:** your contact link and every message say that queue beside your relay. While your relay cannot be
  reached, contacts write there, and Erevos takes what comes there with each look. What you send goes through it
  when your own relay is down.
- **How to set it up:** run a relay as in [Running your own relay](#own-relay), type its address (and token, if it
  has one) and choose **Save**. Contacts learn it from your next message to them, or from your new contact link.
- **What it sees:** what your relay sees, this phone's address when it takes messages, and when and how much comes.
  Hidden chats do not use it.
- **For hidden chats:** each hidden place can have a home relay of its own, under **For advanced users** on its
  screen with no chat picked, while it is open. It is kept with that place only, sealed with its PIN, so the space knows nothing of it, and it is looked
  at while the place is open. Use another relay than the space's: one relay seeing both queues would tie them
  together.

## Through Tor {#tor}

Under **Settings** → **Relay and networks** → **Tor**, **What goes through Tor** chooses which of this space's
requests to its relays go through the Tor network. Each space has its own choice:

| Choice | What goes through Tor |
| --- | --- |
| **Messages** | Unless you change it. What you write, and what tells your contacts something, such as that a message was read. Pictures, files and voice messages go straight, which is faster: for them the relay sees your phone's IP address. |
| **Everything** | Files too. Nothing goes to a relay without Tor. |
| **Nothing** | The relay sees your phone's IP address for everything. |

**Why:** with **Messages**, what you write is hidden by Tor and never waits for it, while pictures, files and voice
messages, which are large, go straight and so faster.

- **What it hides:** the relay no longer sees your phone's IP address, only a Tor exit (or nothing, for a relay
  with a \`.onion\` address). Your phone company or the Wi-Fi sees only that you use Tor, not which relay.
- **What it costs:** what goes through Tor comes and goes slower, and the first start of Tor takes a while. The screen
  shows how far Tor is. To spare the battery, Erevos sends the reduced padding Tor made for phones: the filler Tor
  sends to hide when you talk goes every 9 to 14 seconds, not every few, and none comes to the phone.
- **What it does not cover:** calls, whose sound and picture go straight between the phones or through the call
  relay; nearby phones and SMS, which do not use the internet.
- **On Android only:** Erevos on a computer and the web app have no Tor yet, so there everything goes straight.

> With **Messages**, a message never waits for Tor: one Tor could not take to the relay goes straight at once, and so
> do messages while Tor starts, or for a minute after it could not reach the relay; then Tor is tried again. With
> **Everything**, nothing goes to a relay without Tor:
> when Tor cannot reach the relay, the message waits and is tried again; Erevos never falls back to your own
> connection by itself.

### Bridges

Where Tor itself is blocked, **Bridges** on the same screen lets Tor reach its network through bridges instead. It
is **No bridges** unless you choose, each space has its own, and it counts only while something goes through Tor.

| Choice | What it is |
| --- | --- |
| **obfs4** | The obfs4 bridges Tor Browser comes with. To whoever watches the network, Tor looks like random bytes. A censor that knows them may block them. |
| **Snowflake** | Through volunteers' browsers, over WebRTC, the way a video call goes. To find one, Erevos asks Snowflake's broker through a CDN, behind another site's name, and STUN servers tell the phone its own address: they see that address, never your messages. Slower, and hard to block. |
| **My own** | Bridge lines from bridges.torproject.org, from bridges@torproject.org by email, or from @GetBridgesBot on Telegram, pasted one per line; then tap **Use these bridges**. obfs4, Snowflake, WebTunnel, meek and plain bridges work. |

- **Only through them:** with bridges, Tor never goes straight to its relays. When no bridge answers, with
  **Everything** messages wait, as they do when Tor cannot reach the relay; with **Messages** they go to the relay
  without Tor until one does. Lines that are not bridges are not taken, and Tor stays off.
- **Changing them** while Tor runs closes its connections and makes them again the new way.
- **On Android only:** the app carries lyrebird, Tor's own program for obfs4, Snowflake, WebTunnel and meek. A
  computer and the web app have no Tor yet, so no bridges either.

## Through Nostr {#nostr}

Under **Settings** → **Relay and networks** → **Nostr**, **Texts through Nostr** is **On** unless you change it. Then
what you write to a contact whose Erevos reads on Nostr too goes through public Nostr relays, through Tor, instead of
through your relay. Each space has its own choice, and its own Nostr relays.

- **How it is sealed:** end-to-end encrypted as always, then sealed once more for a key your contact gave this chat
  alone, and signed by a key made for that one text (a NIP-59 gift wrap). The Nostr relays see that someone wrote to
  a key that names no one, when, and how big; not who wrote it, nor to whom. Your relay does not see it at all.
- **What the Nostr relays can tell:** your phone asks each of them for all its keys at once, through Tor: a relay can
  tell that those keys are read together, never from where. Each relay is reached on Tor circuits of its own, so no Tor
  exit carries what goes to two of them, and none can tell it is one phone's. Some relays refuse some Tor exits, and
  some exits cannot reach a relay: after a failure like that, the next try goes through another exit.
- **Only through Tor:** with Tor set to **Nothing**, or while Tor starts, texts go through your relay.
- **The relays:** relay.damus.io, nos.lol and relay.primal.net unless you change them; you can add your own, five at
  most. Your contacts are told the relays you read on, and write to you there; one that takes a text is enough.
- **What stays on your relay:** pictures, files, voice messages, calls, reactions, and the marks that a message came
  or was read; and what you write to contacts on an iPhone or a computer, which do not read on Nostr.
- **Which way it went:** hold a message: its menu says **Went through Nostr** or **Came through Nostr** when a Nostr
  relay took it. One that says nothing went through your relay, or nearby. The note under the messages says **Sent
  through Nostr** too. Two phones side by side give each other texts nearby first: to try Nostr, turn off Bluetooth and
  **Find Erevos on the same Wi-Fi** on both.
- **What the relays did last:** the **Nostr** screen shows, for each relay, whether it took the last text it was given
  and how many seconds after, or why not, and whether your phone reads on it. It is kept on this phone only, until
  Erevos closes. A relay that took a text but did not say so within 20 seconds counts as one that did not: the text
  then goes through your relay as well, and your contact sees it once.
- **On Android only,** as Tor is.

**Why:** the Nostr relays are public, so Erevos reaches them only through Tor, and they never learn where your phone
is. Only texts go there: a text has your relay as its backup, should it not come, while the marks that a message came
or was read would have none, and a message sent for later needs your relay to hold it until its time. Pictures and
voice messages through Nostr are still to come.

> Should your contact's phone not say within five minutes that a text came, it goes through your relay as well, and
> they see it once. When no Nostr relay takes it, it goes through your relay at once.

- **Hidden chats:** they read on Nostr too, while they are open, and closed as well while **Receive while closed** is
  on for them and the space is open (see [Hidden chats](#hidden)). Closed, they still show "New message": with each
  text through Nostr, your contact also sends your relay a bell, a message that says nothing, which your relay counts
  as one, as before. With no relay, their contact link and QR code say where they read on Nostr, with a key of that
  place alone, and texts, reactions and the marks that a message came go there, as from a phone with no relay.

### With no relay at all {#nostr-only}

A phone with no relay, no invite and no LPHL account can still begin: its contact link and QR code say where it reads
on Nostr, and that is enough to talk.

- **To begin:** on **New chat**, tap **Start without a relay**, then **Show my QR code** or **Share my contact link**,
  and give it to someone who uses Erevos. Who adds it writes to you through Nostr, over Tor, and shows as a message request,
  which you accept. You can add their link or QR code too, the same way.
- **What goes:** texts, stickers, reactions, edits, and the marks that a message came or was read, all through Nostr.
  Photos, voice messages, files, calls and groups need a relay, or the other phone nearby. Hidden chats work so too,
  through Nostr only (see [Hidden chats](#hidden)).
- **When it does not come:** the Nostr relays keep a text for two days. Until your contact's phone says it came, Erevos
  gives it to them again once a day, for two weeks.
- **A relay by itself:** when your contact has a relay that lets them invite, their Erevos sends yours an invite to it
  by itself, once, in the chat, whether you first met through Nostr or nearby, over Bluetooth, Wi-Fi or a QR code.
  Your phone takes it by itself, and from then on photos, voice messages and calls work too, with everyone. It counts
  as one of their invites. Someone whose message request you have not accepted chooses no relay for you: their invite
  waits until you accept them, a week at most.
- **An older Erevos** does not read the Nostr part of a link: it reaches you nearby only, until you have a relay.

**Why:** Nostr is only the way in. No one needs an invite to begin, and once one of you has a relay, it carries what
is too big for Nostr.

## SMS {#sms}

On Android, Erevos can be the phone's SMS app: under **Settings** → **Phone and SMS** → **SMS** → **Erevos as the SMS
app**, tap **Make Erevos the SMS app**. The home screen then shows SMS and Erevos chats in one list.

> **SMS and MMS are not encrypted by Erevos.** They travel as every SMS does, and stay in Android's own SMS store, where
> any app allowed to read SMS sees them and Android's backups hold them. Only Erevos chats are end-to-end encrypted.

- **SMS from before:** nothing to import. Erevos shows the SMS and MMS already on the phone, from Android's own
  store, where they stay for any other SMS app. Android keeps them, not sealed by Erevos, as with every SMS app.
- **If Erevos does not become the SMS app:** Android 15 and later can hold this back from an app installed from a
  browser. Under **Settings** → **Phone and SMS** → **SMS** → **Erevos as the SMS app**, tap **Open Default
  apps** → **SMS app** → Erevos. If Android calls it a restricted setting, open **Erevos's App info**, tap **⋮** at
  the top right → **Allow restricted settings**, and choose Erevos again.
- **When an SMS comes:** a notice says "New message", without who sent it or what it says. If none comes,
  **Erevos as the SMS app** shows **Allow notifications** while Android holds them back.
- **One-time codes:** an SMS that says it holds a code (a bank's, a sign-in's), in any of the app's languages, gets
  **Copy code** under it in the chat, and on its notice too, without the code showing there; on Android 12 and later
  the notice's button asks to unlock the phone first. Only its 4 to 8 digits are copied, never a phone number, an
  amount, a date or a time, and Android shows no preview of them. Any app that reads the clipboard can read them, so
  paste the code soon.
- **If no SMS show:** Android 15 and later hold the SMS permission back from an app installed from a browser. Under
  **Settings** → **Phone and SMS** → **SMS** → **Erevos as the SMS app**, tap **Allow SMS**. If Android calls it a
  restricted setting, open **Erevos's App info**, tap **⋮** at the top right → **Allow restricted settings**, and
  allow SMS under **Permissions**. Chats sent as RCS ("chat" in Google Messages) stay in that app and do not show.
  **Erevos as the SMS app** says how many SMS conversations Erevos reads, or why it could not read them.
- **Writing to someone with Erevos:** it goes through Erevos, end-to-end encrypted, once their number is linked to
  their contact. Link it by hand in the SMS conversation, or let a hidden invite find it. From then on their SMS
  conversation opens their chat.
- **Their SMS in the chat:** the SMS and MMS with their number, those from before and those that come, show among
  the chat's messages by time, each edged and marked **SMS (not encrypted)**, with its ✓ and its photos. Hold one
  down to copy, forward or delete it, as in the SMS conversation. They stay in the phone's SMS, never in the
  chat's sealed history; only the conversation with that one number shows, not a group MMS, and only while Erevos
  is the SMS app or may read SMS, never in hidden chats. The latest show first: **Show earlier SMS**, above them,
  brings more, and the chat's search finds them too. Opening the chat reads all of theirs, the earlier ones too, so
  none is left counted on the home screen. A number on their contact card does the same, without linking it.
- **A plain SMS to them:** when there is no internet, say. **Plain SMS** in the chat's **Details** opens their SMS
  conversation to write it there, and **+** → **Send as SMS**, or **As SMS** when you hold the send arrow, sends
  what you typed as one, after asking. It shows in the chat as an SMS. The phone company can read it. An SMS cannot
  disappear nor answer a message: with the stopwatch on, or a message being answered, Erevos says so when it asks.
- **Hidden invites:** with the first SMS to a number that is not a contact, Erevos also sends a short hidden invite.
  None goes to an Erevos contact's number, linked or on their contact card. A phone without Erevos shows nothing; a
  phone with Erevos answers through the relay and the two become contacts. Each number is asked once a month at most,
  and **Turn invites off**, under **Settings** → **Phone and SMS** → **SMS** → **Find Erevos on a number**, stops
  them.

**Why:** so that two Erevos phones find each other from a phone number alone, with no server that knows numbers. The
invite is a data SMS, which messaging apps do not show, so a phone without Erevos shows nothing.

- **Everyone else:** a plain SMS, marked SMS. The phone company can read it, as it reads every SMS.
- **✓ and ✓✓✓:** an SMS of yours shows ✓ once it went, and ✓✓✓ once the network's delivery report says it reached
  their phone, or "not delivered". Some phone companies send no delivery reports; then it stays ✓. SMS cannot say
  whether it was read.
- **Photos (MMS):** the picture before the message field (**Photo**) adds a photo, made smaller to fit one MMS (about 280 KB),
  with nothing in it besides the picture. Photos that come by MMS show in the conversation. An MMS is as plain as an
  SMS: the phone company can see it.
- **Group MMS:** under **Settings** → **Phone and SMS** → **SMS** → **New SMS**, type several numbers separated by
  commas and tap **Write**. Every message goes to all of them as one MMS, text alone too, and their answers come into
  the same conversation, each with who wrote it. Everyone in it sees everyone's number, and the phone company sees all
  of it.
- **Two SIMs:** the SIM to send on shows above the message field; tap **Choose the SIM** once to let Erevos see
  them. Your choice is kept for that number; until then, Erevos answers on the SIM the last message came on. Each
  message shows its SIM.
- **SMS later:** hold the round **Send** after the field down and choose a time, as in a chat. The SMS shows at the end of the conversation
  marked **Scheduled**; tap it to cancel it. It goes at that time, with Erevos closed and locked too; if the phone is
  off then, as soon as it is on and unlocked again. Until then it is not in the phone's SMS, where other apps would
  see it, and the phone company does not have it. It waits locked with a key of the phone itself (Android
  Keystore), not with your space's password, as Android has to send it while Erevos is locked: the protection every
  SMS has once sent, as sent SMS stay in the phone's SMS. Text only, to one number.
- **Links:** a web address in an SMS is underlined, and opens as in a chat, once you have seen it whole.
- **Names from your contacts:** off at first, so SMS numbers show as numbers. **Names**, above the list, unlocks them
  (as does **Show names from my contacts** under **Settings** → **Phone and SMS** → **SMS** → **Names from your
  contacts**): the names your phone's contacts give SMS numbers, and the pictures they have for them, or else those of
  your contacts kept only in Erevos, in the list and in the conversation. Tap **Names** again for numbers only. Erevos
  only reads them to show them, and keeps no copy.
- **Senders with a name:** an SMS from a name instead of a number, like a bank's, opens to read, but cannot be
  answered.

### Keeping the SMS in order

- **Hold down:** in the list, hold an SMS conversation down for what it can do: **Pin to the top**, **Archive**,
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
- **Spam:** a filter that works on the phone alone, by rules, and sends nothing anywhere. An SMS from a number that is
  no contact and that you never answered goes to **Spam** when it has a link with words that try to fool, like a
  parcel held or a prize, or one of the words you add under **Settings** → **Phone and SMS** → **SMS** → **Spam
  filter**. **Mark as spam** and **Not spam** decide for a number for good. A notice still says "New message" when
  spam comes, as it shows before Erevos is opened. Each conversation in **Spam**, in the folder and at the top of the
  conversation, says why it is there: the number is blocked, you marked it, your rule names the sender, a number from
  abroad, your word, or a link and which words.
- **Rules on who sends:** under **Spam filter**, **Senders** takes a sender's name, as shops and banks send (letters,
  without accents or case), or a number, where \`*\` stands for anything: \`+4470*\` is every number that starts so,
  \`1234*\` every short code that does, and with your country code known, \`69*\` is every number \`+3069...\` too.
  **To Spam** sends theirs there; **Let through** keeps the filter's rules off them, as your bank's or your family's,
  though a number you marked as spam, or blocked, still goes there. **Send numbers from abroad to Spam** sends every
  number written with another country code than **Your country code**, which Erevos takes from the numbers you answer
  and you can change. A number written without one is from here. Tap a rule to remove it.
- **Block:** **Block** in the menu of a conversation, or **Settings** → **Phone and SMS** → **SMS** → **Blocked
  numbers**, puts a number in Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, and every
  space and the phone app see the same list. Only the SMS app or the phone app may see and change it.
- **Drafts:** what you type and do not send stays with that conversation, and the list shows it as **Draft**. An SMS
  that could not go stays there as the draft too.
- **Taking an SMS back:** an SMS you send waits 5 seconds at the end of the conversation first: tap it then to take it
  back into the message field. **Settings** → **Phone and SMS** → **SMS** → **Taking an SMS back** sets **Off**, 5 or
  10 seconds. When you leave Erevos, it goes at once.
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
the phone's apps, **Phone**, green with a handset on Erevos's mark, which opens the keypad. Each of these, like a tel: link,
opens it once Erevos is unlocked: with a password, after you type it, unless the Phone opens without it (see Erevos's
password, below). Until then a card at the top says **Erevos is not the phone app**; on a small phone it shows only
that title, and tapping it opens the Phone's **Settings**.

- **Search contacts:** at the top of the Phone, type a name, a number or part of either: the contacts with a number
  show instead of the tabs, each number on a line of its own. Tap one to call it, or hold it down to put it on the
  keypad. It looks in the phone's contacts and, with Erevos unlocked, in those kept only in Erevos and your Erevos
  contacts with a number; never in hidden chats.
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
  **Settings** → **Phone and SMS** → **SMS** → **Blocked numbers**: type a number and tap **Block**, or tap one to
  unblock it. In **Recents**, a row's calls show **Block this number** or **Unblock this number**, with **Undo**.
  Android rejects their calls before they ring, and their SMS and MMS. Every space sees the same list.
- **A contact group for a while:** under **Phone** → **Settings**, **Block a contact group** lists the groups (the
  labels) of your phone's contacts. **Block** beside one blocks its contacts' calls **For an hour**,
  **Until tomorrow morning** (7:00) or **Until I lift it**; the line under the group says until when, and **Lift**
  ends it sooner. Such a call is blocked like the others: it does not ring, and shows in **Recents**, under
  **Blocked**. Erevos only reads the groups, and keeps the group's id and the time, not its name. While a group is
  blocked, the **Phone** screen says so at the top, until when, with **Lift**.

**Why:** a call is screened with Erevos locked too, so what is blocked cannot be sealed inside a space; and kept the
same for every space, it shows nothing of any of them.

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
the phone's apps, **Contacts**, violet with a person on Erevos's mark, which opens them behind Erevos's lock: with a
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
  hidden chats close. A new contact there is always one of theirs. A photo can be given to one, as hidden chats stay
  open while you pick or take it. Their menu has only what is theirs: **Import from a .vcf file** keeps a file's
  contacts with them, sealed, never in the phone's contacts; **Save as a .vcf file** saves those shown, or one on its
  card, in a folder you choose (outside Erevos and not encrypted); **Read a contact's QR code** starts one of their
  contacts. An Erevos ID typed or read there adds them to the hidden chats, never to the space's. Calling one through
  the phone app closes the hidden chats once Erevos is away more than 30 seconds, and shows in its call log.
- **Erevos ID:** a contact's Erevos ID is the contact link their Erevos shows, under **Copy my contact link** or as
  their QR code. On a contact's card, or under **Erevos ID** when you write one, paste it, or read it with **Take a photo
  of the QR code** or **Choose a photo of the QR code**: **Add to Erevos** (or **Save**) adds them to your Erevos chats,
  which open with them, and links the contact to them, and the chat takes the contact's name if it has none of its
  own. A contact that is an Erevos contact shows the start of their key as **Erevos ID**.
- **Erevos contacts:** a contact that is the same person as one of your chats' Erevos contacts shows as one card with
  it: by a number linked to them in Erevos, by their Erevos ID, or with **Choose from my Erevos chats** on its card, a
  link sealed in the space, never in Android's contacts (**Not this Erevos contact** undoes it). The card then has
  **Message**, **Call** and **Video**, end-to-end encrypted through Erevos instead of the phone company. A chats' contact that no contact is
  has a card of its own, with the shield, where **Add to contacts** makes one and **Connect to one of my contacts**
  links it to one you have, whose card then shows it; the **Erevos contacts** chip lists them all. An Erevos contact without a name of its own takes the name of the contact linked to it, as they are linked or
  as that contact's card opens; a name you gave it in Erevos stays, and one you emptied comes back from the contact
  then. In hidden chats, these are the hidden chats' own contacts, and their chat opens there.
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

Under **Settings** → **Privacy and security** → **Lock and second password**, **Lock when Erevos opens** has two
choices: **No lock** and **Password**.

1. Tap **Password**, type it twice (at least 4 characters) and tap **Save**.
2. From then on Erevos asks for it every time it opens, and again after 30 seconds in the background.
3. **Change password** changes it, and **Lock now** locks Erevos straight away.

- **Locked, still receiving:** when Erevos locks, the password screen comes in front of the open space, which goes on
  behind it: messages and calls still come, with their notices, and a call shows over the password screen. Its
  screens close, hidden chats too, and the call screen no longer shows its contacts' names. Its password opens it
  again; another space's password closes it first, with nothing of it kept in memory.

- **Wrong passwords:** after 5 wrong tries, each further one makes you wait, 30 seconds at first and twice as long
  each time, up to an hour. The count survives a restart.
- **What is sealed:** each space's contacts, the keys of its conversations, its messages, its relay settings and its
  look are kept on the phone sealed with a key that only its password opens.
- **The list at once:** the home screen keeps a sealed copy of its first rows, so the list shows as soon as the space
  opens and then updates. It is always the same size, so it tells no one how many chats there are or which spaces
  are used, and it never holds what a disappearing message said.

**Why:** each password tried costs time and a lot of memory on purpose (PBKDF2, then Argon2id), so that whoever copies
what the phone keeps cannot try passwords fast; and someone holding the phone waits longer after each wrong try. The
count is one for the whole phone, kept across restarts, as the password screen comes before any space opens.

> There is no way to recover a forgotten password: nothing is stored that could open the data without it. Only a
> fingerprint or face, while it is on, still opens the first space (see below).

### Screenshots

With the password lock on, Android keeps Erevos out of screenshots, screen recordings and the recent apps: there the
last screen of Erevos shows blank, so whoever holds the unlocked phone a moment does not see your chats in it. Under
**Settings** → **Privacy and security** → **Screenshots**, **Turn off** lets screenshots work again (to send one, say),
and **Turn on** brings it back. Hidden
chats always stay out of them while they are open, whatever the setting. The setting is the phone's, the same in
every space. On a computer and in the web app it does not exist.

**Why:** without it, the last screen of Erevos stays as a picture among the recent apps until Erevos opens again, so
hidden chats always keep out, never to show there without their PIN. The setting is the same in every space so that it
tells nothing of which space opened.

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

**Why:** a finger is easier to force than a password, and anyone whose finger or face the phone knows could use it, so
it never opens a second password's space or hidden chats. Turned on in another space, it keeps a key that opens
nothing, in the same shape, so what is stored does not show which space it was turned on in.

## Second password {#second}

If someone forces you to open Erevos, type the second password instead of your own. It opens a separate, empty
Erevos with its own contacts, relay and look. Your real chats stay hidden, and nothing in the app shows that they
exist.

1. With the password lock on, tap **Set second password**.
2. Type it twice and tap **Save**. It must differ from your own password.

- **The look:** the second space starts with the look of the space it was set in, so it does not stand out.
- **One at a time:** setting a second password again replaces the one before. **Remove second password** removes it.
- **Discretion:** for privacy, the app never shows whether a second password is set. In the web app with
  notifications while closed on, the number on Erevos's icon stays while Erevos is closed: one that does not match
  the space you open may hint at another (**Number on the icon** turns it off).

## Hidden chats {#hidden}

Every space has 4 places for hidden chats, each opened only with its own PIN, and they never show among your other
chats. There is no button for them anywhere. Each place can hold one chat or several, so 2 spaces have 8 places.

**Why:** each place already has a PIN of its own, so a chat alone in a place has a key of its own, and a place can also
hold several chats under one PIN. The number of places is fixed for two reasons:

- **So that nothing shows.** All 4 places exist from the first start, filled with random data while unused. Whoever
  makes you open the phone, or copies what it keeps, cannot tell whether you have hidden chats, or how many. With a key
  for each chat, the sealed files would grow with each new hidden chat, and give away how many there are.
- **So that it stays quick.** A PIN typed in the search is tried on every place, and each try is slow on purpose
  (Argon2id, which takes a lot of memory and time, so that PINs cannot be guessed fast). With 4 places opening stays
  short and always takes the same time, so the time does not tell how many are used either.

The number can be raised later with nothing lost, at the cost of opening a little slower; lowering it would delete
what the places taken away hold.

1. Start a place in either of two ways: under **Settings** → **Privacy and security** → **Hidden chats**, pick **Place
   1** to **Place 4**, tap **Set hidden chats PIN**, type it twice and tap **Save**; or open a chat's **Details**, tap
   **Move to hidden chats**, type a PIN of 4 characters or more, tap **New hidden chats**, pick a place, then **Start
   and move**. Remember which places you use: for privacy, Erevos cannot tell which are free.
2. To open them, type the PIN in **Search chats** on the home screen and press Enter (the keyboard's search key). Or
   hold **New chat** down for a second: a field for the PIN opens, the same in every space; type it and
   tap **Open**. It opens only the place with that PIN. A wrong PIN is just a search, or only closes the field:
   nothing happens.
3. They open titled **Hidden chats**, with **Contacts** and **Change PIN** at the top, and list their chats and groups
   as the home screen lists yours: the newest first, each with what was said last, when, and how many are not read. Tap
   one to open it. The back arrow closes them.
4. To move another chat into a place, open its **Details**, tap **Move to hidden chats**, type that place's PIN and
   tap **Move**. The
   chat leaves your list with its messages, name, picture and look, and the chats imported into it, and its safety
   number stays the same. Their phone
   is told at once to write to the hidden chats from now on; a message they send in that very moment may not come.
5. To move a chat back among the space's chats, open it in the hidden chats, then its **Details**, tap **Move back to
   my chats** and **Move**. It goes with its messages, name, picture, look and imported chats, and its phone is told
   where to write.

- **Relay or Nostr only:** hidden chats have their own relay queue and their own keys, and never use the nearby link.
  With no relay, their contact link says where they read on Nostr, with a key of that place alone, and texts go there,
  as from a phone with no relay; photos, voice messages, calls and groups need a relay. While they are closed, their
  messages wait on the relay, or on Nostr for two days, unless **Receive while closed** is on.
- **Receive while closed:** a switch at the top of each place. On, its hidden chats receive as your other chats do
  while the space is open, whatever screen shows and with Erevos in the background: their contacts see at once that a
  message came, a notice says only "New message", on Android a call rings with "Incoming call" and no name (on the
  ringing screen, tap the small sign, type the PIN and tap **Connect** to answer), and a reminder of their Chat with
  myself shows a notice that says only **Reminder**. What comes to them through Nostr is read then too. A call that
  ended before you opened them, or rang too long, shows as missed. Nothing of them shows anywhere until the PIN opens
  them. A new place starts with it on; places set before stay as they were until you turn it on. For it, the place's
  key is kept encrypted with the space, among a random key for each other place, so opening the space does not show
  which places receive, or are set. But whoever opens the space and copies what the phone keeps could open that place
  too, with no PIN: the PIN then keeps them out of sight of whoever holds the phone, not of a forensic tool. Off,
  their key is only behind the PIN, and their messages wait on the relay until you open them. Backups keep the switch.
- **They close by themselves** once Erevos was in the background for more than 30 seconds, as a chat's own PIN
  locks again, but not during a call, nor while you pick a photo or a file for them or take a photo.
- **While they are open,** a message that comes plays the sound for new messages, as in your other chats. With Erevos
  in the background before they close, a notice says "New message" only if **Receive while closed** or **Say when a
  message comes** is on for that place.
- **Like your other chats:** what cannot go now waits, marked **Waiting**, through their relay only, or Nostr with no
  relay (see **Waiting** under [Chat through a relay](#relay)), **Send later** works as there, and a chat exported
  from another app can be imported into a hidden chat's details (see [Imported chats](#import)). A contact can be
  added from a photo of their QR code there too, taken or picked while they stay open. Each place has its own
  **Chat with myself**, first in its list (see **Chat with myself and reminders** under [Getting started](#start)).
- **Groups:** **New group**, under their list, makes a group with their contacts, as on the home screen (see
  [Group chats](#groups)), and it shows in their list among their chats. Its members are only contacts of that place,
  and one you add as a contact from it becomes a contact of that place. What is written in it goes through the place's
  relay only, to a queue of its own there, never to a phone nearby; while the place is closed it is read only with
  **Receive while closed** on, and **Say when a message comes** does not count it. Its calls ring only while the
  hidden chats are open: one started while they are closed shows as missed. A group there has no PIN of its own, and
  none is public.
- **Link previews** have a switch of their own in a hidden chat's details, for all the chats of that place, off unless
  you turn it on (see **Link previews** under [Chat through a relay](#relay)).
- **Say when a message comes** (Android): at the top of a place while **Receive while closed** is off. Turned on,
  while the place is closed a notice says only "New message", or how many came, as for the other chats, with Erevos in the background or showing, each message
  once, also when Erevos was closed and started again; what came while the place was open makes none once it closes. That a message of yours came to them or was read, typing and new keys make none, nor does a call that rang (see **Ring
  calls when closed**); one that did not ring counts as a message. A message or a delete that other Erevos phones
  carried to the relay (see **Carried by other phones** in [Chat with a nearby phone](#nearby)) cannot say what it carries, since the phones that carry it
  must not know: it counts as a message, so a delete shows "New message" too, and the first message of a chat may count
  as two; and one sent without sound sounds as usual (see **Send without sound**). It needs **Receive and ring** and
  **Say a message came** under **In the background**, which the switch says when they are not on, and a relay that
  waits (from 18 October 2026 on); one from before 23 October
  2026 can only say that something waits, so then "New message" shows for that too, once until you open that place.
  For it, the space keeps a relay queue for each of its 4 places, those not in use made for nothing on the same
  relay, so opening the space shows neither whether hidden chats are set nor which, as long as they use the space's
  relay; the relay is asked only how many messages came, as it counts them by the byte each one carries (see what
  the relay sees, above), never for them. Whoever sees the notice and finds nothing new in your chats may guess there
  are more. After you delete or block someone in the place, a first message from someone new, by the place's contact
  link or QR code, makes none: it shows when you open the place. Backups do not keep it: turn it on again after
  restoring.
- **Ring calls when closed** (Android): below **Say when a message comes**, while **Receive while closed** is off.
  Turned on, while the place is closed, with Erevos in the background or on any screen, a call from one of its
  contacts makes the phone ring and show "Incoming call" with no name, as a call from your other chats does. On the ringing screen, tap the small sign,
  type the PIN and tap **Connect** to answer; a plain **Answer** cannot connect it, and **Decline** stops the ring. The
  ring lasts about 45 seconds. It needs **Receive and ring** under **In the background**, which the switch says when
  it is not on, and a relay that waits, and
  uses a relay queue of its own for each of the 4 places, those not ringing made for nothing on the same relay, the
  same as the message notice above, so opening the space gives nothing away. The caller only rings a queue there; the
  call itself waits on the chat's own queue until the PIN opens it. A contact you have deleted can still make it ring,
  but the call can never connect. A call placed from a linked computer rings only while the hidden chats are open.
  Backups do not keep it: turn it on again after restoring.
- **A new PIN for a place** (from **Hidden chats** in **Settings**, or **New hidden chats**) starts it empty and
  replaces what was in it. To keep them and change only the PIN, open them and use **Change PIN** there. Each PIN must
  differ from the others and from the password that opens Erevos.
- **Wrong PINs in the search** are counted apart from the lock screen's: after five, searches stop trying for a while,
  silently, and the lock screen never waits because of them.
- **A PIN keeps out whoever picks up the phone,** not whoever copies what it keeps: with a forensic tool on an
  unlocked or rooted phone, PINs can be tried with no wait. Each try costs Argon2id (a lot of memory and time), but a
  PIN of 4 digits is only 10,000 tries. If that is what you fear, use a longer PIN, or a few words.
- **Discretion:** every space has all 4 places from the start, the unused ones filled with random data that looks
  like used ones, and the search tries every place each time. So nothing shows whether any hidden chats are set, or
  how many.

### A chat locked with a PIN {#chat-pin}

A chat or a group can have a PIN of its own, apart from hidden chats: it stays among your chats, but opens only with
its PIN.

1. Open the chat, tap **⋮** at the top for its **Details**, then **Lock with a PIN** (in a group: the group's name at
   the top, then **Lock with a PIN**).
2. Type a PIN of at least 4 characters twice, then **Lock**.

- **Opening it:** it asks for the PIN. It locks again once you leave it, open another chat, or Erevos is away more
  than half a minute (as the password lock).
- **Behind the PIN** nothing of the chat shows: none of its messages is drawn until the PIN is typed, and with glass,
  a wallpaper or a style's own scene, the PIN screen lies on a dense frost that lets nothing through.
- **In the list** it shows its name with a lock and **Locked with a PIN**, nothing of its messages, nor in the
  search, in **Starred messages** or in **Imported chats**. The notice says only **New message**, as for every chat.
- **Wrong PINs** are counted on the phone, for every chat at once and apart from the lock screen's: after five, the
  next try waits, longer each time.
- **Forgot the PIN?** Under the PIN, where the space has a password, **Forgot the PIN?** takes it off with the
  password that opens the space. Without a password, nothing can open it again: deleting the contact is then the only
  way.
- **Into hidden chats:** a chat you move into hidden chats takes its PIN with it, which asks nothing there, as the
  hidden chats' own PIN guards them. Moved back to the chats, the same PIN asks again.
- **To take it off:** **Details** → **Lock with a PIN** again, and type its PIN.
- **Only this phone knows it,** and each linked device has its own. Backups keep it.

**Why:** some chats should stay where they are, but not open for whoever holds the phone a moment. The PIN is kept
only as Argon2id of it, so it cannot be read from the phone, and guesses are slow. It is a lock on the screen, not a
key of its own: the chat's messages stay encrypted with the rest of the space, and whoever copies what the phone keeps
while the space is open could still read them. For a chat that must not even be seen, use hidden chats.

## Backups {#backup}

A backup is one file holding everything Erevos keeps on this phone: every space, with its contacts, the keys of its
conversations, its messages, voice messages, imported chats and hidden chats, its Chat with myself, and the lock. Inside it each space stays
sealed with its own password, and the file is sealed again with a password of its own. It is under **Settings** →
**Data and devices** → **Backups**.

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
  first time, see [Linked devices](#devices). Contacts on this version then stop writing to your computers until you
  do: the phone gives them a new list of its devices that names none. If this phone's clock is behind the lost one's,
  that list goes once they write to it, and their chat details may say it changed the day after you restored. A
  linked computer's own backup holds the phone's chats as they were, but
  not the link to write in them: restored, they can be read there but not written in, and Erevos says so once. To write
  in them, link that computer to the phone again: the chats the phone still has stay, with what came since, and the
  others go. On the phone, unlink the device it was before. Make the backups on the phone.
- **A backup from a newer Erevos:** Erevos 0.1.8 and later open it too, and restore all of it they know; before
  that, they say some of it stays out. Update Erevos first to restore all of it.

## Imported chats {#import}

Your old chats from Telegram and WhatsApp can come into Erevos, to read, with their photos, videos, voice messages and
files, and those from Viber with their words. They stay on this phone, sealed in the space you bring them into, and are
never sent anywhere.

First export the chat from the other app:

- **WhatsApp:** open the chat, then **More**, **Export chat**, **Include media**, and save the .zip to the phone.
  **Without media** brings only the words.
- **Telegram Desktop:** **Export chat history**, format **JSON**, with the photos, videos, voice messages and files you
  want. Then make a .zip of the folder it made (on Windows: right-click it, **Send to**, **Compressed (zipped) folder**)
  and copy the .zip to the phone. **result.json** on its own brings only the words.
- **Viber:** Viber itself exports no chats. On Android, the app **Backup Text for Viber** saves one as an .html file:
  copy that to the phone. Only the words come in, with Viber's emoticons as emoji. Your own messages there carry no
  name, so they come in as **Me**, already picked as you. Messages from a day before Viber existed, such as 1970, are
  from a phone whose clock was wrong: they come in with no time.

Then:

1. In Erevos, open **Settings** → **Data and devices** → **Imported chats** and tap **Import a file**, then pick the
   file.
2. Erevos says what it found, with how many photos and files and how large they are together. Tap your own name, so
   your messages show on the right, and tap **Keep**. The files come in one after another, and it says how many and
   what share of them are in. **Cancel** stops it then, and keeps none of them.
3. Delete the export file from the phone yourself: Erevos keeps its own sealed copy, but the file you saved is not
   sealed.

To go on with the conversation in Erevos, the other person needs Erevos too:

1. With **New chat**, add them as a contact through the relay, as in [Chat through a relay](#relay).
2. Open the imported chat, tap **Continue in Erevos** and pick them.
3. Their chat now shows the old messages ahead of the new ones, as if they had always been in Erevos: in bubbles, by
   day, with their times, and **Continued in Erevos** between them and the new. **Open the chat** takes you there, and
   a contact you have not named takes the imported chat's name.

**From inside the chat:** a contact's chat has **Imported chats** in its **Details**, above **Privacy**. **Import a chat
here** brings a file in straight into that chat, without going through **Settings**: when the file holds several
chats, as a Telegram export of all of them does, it asks which one goes on here, and offers the longest. Each imported
chat that goes on there is listed with three buttons:

- **Keep only in the chat** takes it out of **Settings** → **Data and devices** → **Imported chats**: it shows only in
  that chat, as if it had always been there. A chat brought in from the chat's details is kept so from the start.
  **Show in Imported chats too** puts it back in the list, and so does the list itself, when that contact is gone.
- **Unlink** stops it showing in the chat; it stays in **Imported chats**, to read or to go on with someone else.
- **Delete** deletes it from the phone, with its photos and files, after asking.

**Why:** an old chat belongs with the person it was with, so it is brought in, kept and deleted where you talk to them,
and the list in **Settings** keeps only what has nowhere else to go. Nothing of it leaves the phone either way.

- **Photos, videos, voice messages and files** come in from a .zip, each sealed in this space as a file in a chat is.
  Photos show in the chat as you scroll to them, and stickers as stickers; tap a photo or file to see it on its own and
  **Save** it. Voice messages and songs play right in the chat with a tap; a video plays in the phone's own app once
  saved. Hold an imported message to **Copy** it or **Open** its file. **Search in this chat** finds the imported
  messages too. Files larger than 1 GB, and those the export does not hold, stay behind, and the chat says where
  one was.
- **Room on the phone:** while a .zip comes in, the phone needs about twice its size free, as Erevos reads a copy of it
  and keeps the files sealed. Imported files are not in backups yet, as other files are not.
- **Only on this phone, only to read:** imported messages are never sent, so the other phone does not get them. Erevos
  cannot show who really wrote them.
- **Notices and calls** from the other app are left out, and the chat says how many.
- **In hidden chats** too: in a hidden chat's **Details**, **Import a chat here** keeps the chat with that place,
  encrypted with its key, and shows it only in that chat, never in **Settings** → **Data and devices** → **Imported
  chats**; there it can only be deleted. A chat moved into hidden chats takes the chats imported into it along, kept
  only in it there, and brings them back if it moves back.
- **Delete messages** in a chat leaves the imported ones: delete those in the chat's **Details**, under **Imported
  chats**, or in **Settings** → **Data and devices** → **Imported chats**.

> The file of imported chats grows with what you bring in, so its size tells roughly how much was imported, but not
> into which space.

## Appearance {#appearance}

**Appearance** follows LPHL FASOULI and the LPHL site. It is under **Settings** → **Appearance**, in parts that each
open alone: **Style and colours** (the look, glass, style, theme, colours and text on coloured areas below, with the
**Preview**), **Wallpaper**, **Messages**, and on Android **Launcher icons** and **Widget**.

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
- **Launcher icons** (Android): the colour of each of Erevos's icons among the phone's apps, **Erevos** (red, it
  opens the Erevos chats, or the chat you left open), **Phone** (green, it opens the keypad), **SMS** (blue, it opens
  the SMS list) and **Contacts** (violet): red, orange, green, blue, violet or dark. Each tap opens what its icon
  names, also when Erevos showed another of them. The colour is the phone's, not each space's, as the icons show
  before Erevos is unlocked. After a change some launchers take the icon off the home screen: add it again from the
  list of apps.
- **Widget** (Android): the order of the widget's four buttons, from left to right, with the widget drawn as it will
  look. Tap ↑ or ↓ to move a button; **First order** puts them back.

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
  sealed with the system's keyring (on a Mac the Keychain, on Windows the key of your Windows account). On a Linux
  system without a keyring (KWallet or GNOME Keyring), or one Erevos does not find, Erevos opens with a note and keeps
  nothing: start the keyring, or give Erevos \`--password-store=gnome-libsecret\`. Started with \`--plain-secrets\`, it
  keeps its keystore there as it is, readable by your user: then set a password lock. The portable Windows app keeps its things in the
  same folder as the installed one, and uninstalling leaves them there.

**Why:** without a keyring, the keystore would lie on the disk as it is, readable by your user, so Erevos keeps nothing
there unless you choose it with \`--plain-secrets\`: no password slot lies there unsealed by surprise.

- **Windows' firewall** asks, the first time Erevos opens, whether it may use the network. Allow it on private
  networks, or phones and computers on the same Wi-Fi cannot reach it; relays work either way.
- **Voice messages** recorded on a computer are Opus, on a phone AAC. Both play on both.
- **Photos** come from the computer's files; there is no camera. **Save** asks where to put a photo or file.
- **A computer and a phone can share an account:** link the computer to the phone, and both have the same chats and
  contacts, see [Linked devices](#devices). Or a backup moves everything from one to the other, see
  [Backups](#backup), and from then on use only the one.
- **No notices or sounds:** Erevos on a computer shows no notice from the system and makes no sound. While it runs, a
  new message shows only in its window, and a call shows its screen there without ringing, so with the window
  minimised or behind another, nothing tells you. Closed, it receives nothing: messages wait on the relay, and a call
  shows as a missed call once it opens.
- **Tested so far** on Linux. The Mac and Windows versions are built and opened on GitHub's computers, not yet by a
  person.

## Linked devices {#devices}

The same account on the phone and on a computer, or in a browser: the same chats, contacts and messages on both. The
phone stays the account: it alone adds contacts, and links and unlinks devices. Each linked device has keys of its
own, which the phone signs into a list of the account's devices and gives its contacts. Contacts on this version then
write to each device too, end-to-end encrypted, so it gets their messages with the phone off; for those on older
versions the phone passes on to the computer what comes, and seals for them what the computer writes. Contacts see the
same account and the same safety number, whatever version of Erevos they have.

**Why:** each device has keys of its own, never a copy of the account's: Erevos has no server that could cut off a lost
device, so a device is never more than an entry in a list the phone signs, and unlinking it is enough. The list always
has four places, those no device takes holding keys made for nothing, so contacts cannot tell how many devices you
have. And with the phone as the account, contacts on any older Erevos reach you as before.

To link a computer:

1. On the computer, in a space with no chats of its own (a new install, a space a new password opens, or a linked
   computer's chats restored from its backup), open **Settings** → **Data and devices** → **Linked devices**. Fill in
   the relay if it asks, name the device, and tap **Link to my phone**. It shows a QR code.
2. On the phone, scan the code with the camera: Erevos opens on **Linked devices** with it. Or copy the code on the
   computer, paste it on the phone under **Code from the computer**, and tap **Next**.
3. The phone shows the computer's name and a code of four groups of five digits. Choose what of the history goes
   (**All of it**, **The last month**, **The last week** or **None**) and whether **Photos and files too**, then tap
   **Link**.
4. The computer shows a code too. If it is the phone's, tap **They match**. If not, tap **They differ**: someone else
   may have read its QR code, and nothing went to them.

The chats then come to the computer, and after them the messages chosen.

- **Messages** from contacts come to both, and each keeps them once: one that comes again within 30 days (up to 2000
  from one contact) is not kept again, even after it disappeared or was deleted there. For that each keeps, for 30
  days, which messages came and on what day, not what they said, also once they disappeared or were deleted, and in a
  backup made meanwhile; the phone keeps it too for a contact who linked a device. What you write on the computer
  goes to a contact on this version straight from it, once they wrote to the computer, and through the phone
  otherwise: the phone shows it as yours, and the contact gets it from the account. What you write on the phone shows
  on the computer too. Read marks, reactions, pins, votes, deleting from both phones, names, timers, chat looks and
  pictures, appearing offline and accepting requests go both ways. A star, or deleting on **This phone**, done on the
  phone goes to the computer too; done on the computer, it stays there.
- **With the phone off**, contacts on this version still reach the computer, and the computer them: what they write,
  read and react to comes, and what you write goes. If the phone stays off so long that its queue on the relay fills
  (1000 messages), what they write and read still reaches the computer, a long voice message whole; what they react
  to, pin, vote on or delete, and their calls, do not go through until the phone is on again. For contacts on older
  versions, groups, calls, adding a contact and messages sent for later, **the phone has to be on** and reach the
  relay: what the computer writes meanwhile waits on the relay, and goes once the phone is back. Two or more linked
  devices also reach each other directly: with the phone off, each still shows what the others write, read and react
  to, and the changes they make to contacts; one that missed the first message of another gets a new one a day or more
  later. A computer that was off for longer than the relay keeps messages (14 days), or missed a contact's first
  message to it, still gets what they write after: their Erevos starts again with it a day or more later, then ever
  less often, until it answers. After a contact deletes you and adds you again, the computer starts again with their
  devices too.
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
- **Hidden chats and second passwords** are never linked. Hidden chats write to the devices of a contact on this
  version as your other chats do, so those get them with the contact's phone off, and to the contact they look like
  the chats of a phone that never linked a device. A chat moved into hidden chats on the phone leaves the computer.
  Moved into hidden chats, or out of them into your chats, a chat writes to the contact's phone only, as an older
  Erevos does, until it goes back to where it was made: their Erevos is told first, so their devices stop writing to
  yours, and they can tell from it that the chat stopped knowing of linked devices: if it gave them the list of your
  devices, that it went into hidden chats. A space a second password opens
  links only from inside it, to devices of its own.
- **Bring over messages again**, on the phone, sends a period of the history again, with its reactions, pins, votes
  and stars; what the computer has already is not kept twice.
- **Unlink**, on the phone, cuts a device off at once: nothing more goes to it, and nothing it sends is taken.
  Contacts on this version are told the next time the phone reaches the relay: they stop writing to it, and take
  nothing more from it. That is how to cut off a lost computer. If it is on, it is told, and the account's chats leave
  it. On the computer, **Unlink this device** does the same from there.
- **Up to four** devices link to one phone. A backup does not carry the links: after restoring one on another phone,
  tap **Unlink this device** on the computer and link it again, see [Backups](#backup).

## On an iPhone, from the browser {#iphone}

Erevos has no App Store app. On an iPhone it runs as a web app, added to the home screen from Safari, with no Apple
account. It chats through a relay, end-to-end encrypted as on the phone, and keeps its contacts, messages and settings
sealed the same way, in Safari's storage for the app.

1. Open the address of the Erevos server you were given in **Safari**. Erevos shows how to add it: tap **Share** (on
   iOS 26, under **•••**), then **Add to Home Screen**, then open Erevos from the home screen. Needs iOS 17 or later.
2. In Erevos, open **Settings** → **Privacy and security** → **This web app** and compare the release key's
   fingerprint with the one you were given with the address, character by character. If it differs, delete the app and
   tell whoever gave you the address.
3. Set a password lock (in Erevos, **Settings** → **Privacy and security** → **Lock and second password**). On the
   web it matters most: see below.
4. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay).

**How it checks itself.** A web app is code the server sends, so a server that is broken into, or ordered to, could
send changed code. Erevos does not take that code on trust:

- The first time it opens, it fetches its code with a list of every file and its fingerprint, signed with the
  release key, which only the person who makes the releases holds; the server does not have it. It checks the
  signature and every file, keeps them on the iPhone, and from then on runs only those. The server cannot change them.
- An update is taken only if it is signed with the same key and newer than the one in use; it starts the next time
  Erevos opens. An unsigned or older one is refused, and Erevos says so.
- Whoever wants to can check the server: \`node pwa/release.mjs verify https://<address>\` checks the signature and
  every file the server gives out, and \`scripts/reproduce-web.sh <version> https://<address>\` builds that release again
  from its source and checks that every file comes out the same.

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
- **Notifications** while Erevos is closed are off unless you turn them on: in Erevos, **Settings** →
  **Notifications** → **Notifications while closed** → **Turn on** (iOS 16.4 or later, from the home screen). When
  messages come, or a call rings, your relay sends a push through Apple, and Erevos shows how many messages came since
  you last opened it (**3 new messages**), or **Call** when only a call rang, in the app's language, nothing more. The
  count is encrypted for your iPhone: Apple sees when something comes for your iPhone, and that it uses Erevos, never
  what or from whom. With a relay or a sender's Erevos older than 2.0.0, or a message that other phones carried to the
  relay, there is no number: Erevos shows **New message**, or **New messages** once more came, until you open it. They
  are per space, never for hidden chats, and your relay must be set up to send them. They come for each contact's own
  queue too: your relay then has one push address for all your contacts' queues, and Apple gets one push for each
  contact who wrote, 15 seconds apart, so from such a run it can guess how many wrote at once, never who. Erevos's
  icon on the home screen then shows a number too: the messages not read in the space you had open, which stays
  once Erevos is closed, and those that came since (what came with no number counts as one), never a hidden chat's.
  **Settings** → **Notifications** → **Number on the icon** turns it off. Notifications work through Apple's push
  service, Google's (Chrome, and Edge on Android, Brave and Opera), Mozilla's (Firefox) and Microsoft's (Edge on
  Windows): a browser that uses another cannot turn them on, unless whoever runs your relay allows its push service.
  Spaces on different relays share the browser's notifications: only the one opened last gets them. A message
  request from someone new, through your contact link, may show only once Erevos opens.
- **Permissions:** in Erevos, **Settings** → **General** → **Permissions** shows what the browser lets Erevos do:
  whether it runs from the home screen, notifications while closed (needed once this space turned them on), the
  microphone for calls, the camera for video calls, and whether the browser keeps Erevos's data for good. Without
  that, Safari may clear the data when the iPhone runs low on space, so a backup is the safety net. Each has why, and
  a button with the browser's own question; where the browser no longer asks, it says where the setting is (**Settings
  → Notifications → Erevos**, or **Settings → Apps → Safari → Microphone**). It only reads what the browser says. A
  browser does not let Erevos read battery saving or Low Power Mode, so those are not there. After each new signed
  release it opens by itself when something messages, calls or the data need is missing. In another browser (Chrome,
  Firefox) it is the same, with that browser's settings.
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
3. Set a password lock (in Erevos, **Settings** → **Privacy and security** → **Lock and second password**). See
   below why it matters here.
4. Set the relay and add contacts as on the phone, see [Chat through a relay](#relay).

- **What only Android does:** the nearby link (Bluetooth and Wi-Fi Aware), LoRa and SMS. The rest is the same: spaces and
  the second password, hidden chats, voice messages, imported chats and backups.
- **Where it keeps things:** in \`~/.local/share/erevos\` on the phone, sealed as on the phone. Sailfish has no
  keyring for apps, so the keystore is kept there as it is, readable by your user, and so by any app that runs as
  you: the password lock is what seals it.
- **Backups** go to \`Documents/Erevos\` on the phone, by hand or every day; copy them from there to a memory card or
  another device. **Save** puts a photo or file in Downloads.
- **Only while it runs:** when Erevos is closed, messages wait on the relay until it opens.
- **Tested so far** on Sailfish's browser engine (Gecko 91) on a computer, chatting with a browser through a relay.
  Not yet on a Sailfish phone.

## Updates {#updates}

Erevos asks GitHub for updates only when you tap the button, as in LPHL FASOULI: a regular check would tell GitHub,
every day, that this phone or computer has Erevos. On Android it also tells you when a new version is out, without
asking GitHub, as **Told when a new version is out** below says. To update:

1. Open **Settings** → **General** → **Updates** (or **Check for updates** at the bottom of this guide's first
   screen).
   It shows the version you have, such as **Erevos 2.0.0**.
2. Tap **Check for updates**. GitHub then sees this device's internet address, nothing else; on Android so does the web
   app's server, which holds the release computer's signature of the update. While everything in the
   space goes through Tor (**Everything** under Tor), Erevos does not check, since that would go around Tor.
3. When there is a new version: on Android tap **Install**. It downloads, is checked against the release (its size and
   SHA-256), and Android's installer opens: tap **Install** there. Erevos offers it only once the release computer,
   which keeps its key offline, has signed that build and SHA-256: whoever took over the GitHub account alone could
   not get an APK of their own installed. Until then it says the version is out but not signed yet. When the
   web app's server cannot be reached it says so, with the reason, and when the signature there does not match it says
   that: either way nothing installs. The first time, Android asks to allow installing
   apps from Erevos. On a computer and Sailfish OS, **Open download page** opens the releases page: take the file
   Erevos names, the one of the package you have, and update as in the table below.

### What's new {#whats-new}

**Settings** → **General** → **What's new** (also **What's new** in **Updates**) says in short what each version
changed, the newest first, by its number alone; the version you have says **This version**. Each release adds its own.
The CHANGELOG of the source code tells every change in full.
Each version, there as here, says first what changes **For you**, what you see and use, then what changed
**Under the hood**: fixes, speed, battery and security inside.

### Told when a new version is out {#release-notice}

On Android, once a day, Erevos asks LPHL's server, which runs the relay too, whether a new version is out. When one is,
**Erevos** shows at the top of the chats, pinned, with its icon: **Erevos 3.3.0 is out. Tap to see what is new and
update.**, marked until you open it, and a notice says **Erevos 3.3.0 is out** too. Tap either for **Updates**, then
**Check for updates**. It goes once you have that version.

- **Only when signed:** it counts only once the release computer has signed both the build and its name, the same
  signature that lets **Updates** install it. So it comes once that version can be installed, and the server alone
  cannot make one up.
- **Only on LPHL's relay:** a space asks only while it uses LPHL's relay and does not send everything through Tor
  (**Everything** under Tor): the server then sees nothing it does not see already. A space on another relay, or with
  no relay, asks nothing; there **Check for updates** tells you.
- **To turn it off:** **Settings** → **General** → **Updates** → **Tell me when a new version is out**.
- It works from the version that has it on: the one before says nothing. Not in the F-Droid build, which F-Droid
  updates.

**Why:** so no one has to look on GitHub, one by one, for each new version, and GitHub never learns which phones have
Erevos: the server asked is the one the phone already talks to, and what it says counts only with the release
computer's signature, kept offline.

The rest of this section is for updating by hand.

**Where new versions are:** on Erevos's releases page, \`https://github.com/azzinder/erevos-releases/releases\`. The newest is at the top, such as **Erevos 2.0.0**, with a file for each
system. The five newest stay there.

**Check the file** if you can, on a computer: each release has \`SHA256SUMS\`, and in the folder with the downloaded
files \`sha256sum -c --ignore-missing SHA256SUMS\` must say **OK** for each.

**Make a backup first** (**Settings** → **Data and devices** → **Backups** → **Make a backup**), see
[Backups](#backup). An update keeps everything, but a backup costs a minute and covers any surprise.

| On | How to update |
| --- | --- |
| **Android** | **Settings** → **General** → **Updates** → **Check for updates** → **Install**, or by hand: open the releases page on the phone, tap \`erevos-android.apk\`, then **Install**. It installs over the one you have and keeps everything. Allow installing from the browser once, when Android asks. |
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
- **Erevos from F-Droid**, once it is there, is updated by F-Droid: its **Updates** shows the version and says so,
  with no **Check for updates**. F-Droid signs it with a key of its own, so Android installs neither it over the
  Erevos from the releases page nor that one over it. To switch: make a backup, uninstall Erevos, install the other one
  and restore the backup.
- **Never older:** do not install an older version over a newer one. Its data may be in a form the older one cannot
  read. Restore a backup made with that older version instead.
- **A release that lacks your system** says so in its notes: that build failed, so take the release before.

## The test screens {#tests}

Two screens under **Settings** → **For testing** are there to test the connections, step by step.

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
| **Messages through a relay** | End-to-end encrypted: PQXDH with ML-KEM-768 to start, then the double ratchet. The relay cannot read them, and once both phones have had a message from each other it cannot tell them apart by conversation either: each is sealed once more for the phone it goes to. It sees which are messages someone reads, which are word between phones, and which are calls that ring, as each says. Not audited yet. | An outside audit. |
| **Messages to a nearby phone** | End-to-end encrypted, the same as through the relay. Whoever listens nearby can tell that Erevos phones are near each other, and when and how much they send; on the same Wi-Fi, so can anyone on it, and over Wi-Fi Direct anyone who joins the phones' own Wi-Fi. Until your contact's phone is known, the other Erevos phones linked nearby get your short messages, sealed. | |
| **Messages carried by other phones** | Sealed twice: end-to-end for your contact, and for their relay. A phone that carries one sees which relay it goes to, when, and how big; not who it is from or for. Its relay sees which relay it goes to, and that relay sees the carrier's relay, not its phone. Kept sealed on the phone, three days at most: those for others in a file of the phone's, whose size shows roughly how many; your own in your space, sealed with its key. Hidden chats are never carried. | |
| **Messages over LoRa** | End-to-end encrypted, the same as through the relay. Anyone with a radio, kilometres away, can tell that yours sends, when and how much, and its signal can be traced to where it is. Erevos keeps your radio from saying its name and where it is (role Client hidden, GPS off, no fixed position) unless you let it; it still answers a radio that asks its name. Every Erevos on the mesh gets your LoRa messages, sealed. | Setting the radio's name from Erevos. |
| **Who talks to whom** | The relay sees IP addresses, queue ids, and when and how much. With a second relay, your relay never sees your address. From a place lent on a contact's relay, every relay you send to sees it. [Through Tor](#tor), which carries messages unless you change it, no relay sees it for what you write, and with **Everything** for pictures and files too; with bridges, for where Tor is blocked, the network sees only a bridge. Snowflake's broker and STUN servers see your address. | Tor on a computer. |
| **The connection to the relay** | TLS, and inside it, once the relay's key is known, a channel to that key: the relay proves it holds it on every connection, and the token and every request go encrypted to it, so someone in between with a certificate for the relay's name cannot pass for it. A relay that proved its key once is never reached without it again. A relay older than this app goes as before, and **How you connect now** says so. The first key comes from the relay the first time it is asked, or from a contact link: whoever is in between that very first time could give one of their own. [The relay's own key](#relay). Not audited. | Our relay's key built into the app, and in invites. |
| **Texts through Nostr** | End-to-end encrypted as through a relay, then wrapped once more for a key your contact gave that chat alone, signed by a key made for that text alone. The Nostr relays see when and how big, and that a key that names no one gets a text; your phone reads all its keys on one connection, through Tor, so a relay can tell they are read together, never from where. Your relay sees them only as the backup, and a bell for hidden chats. [Through Nostr](#nostr). | Pictures and voice messages through Nostr. |
| **SMS** | A plain SMS is read by the phone company, as every SMS. To a number linked to an Erevos contact it goes through Erevos instead. A hidden invite is one more short SMS the phone company sees. | |
| **The phone's contacts** | In Android's own contacts, not sealed by Erevos, as with every contacts app: every app allowed to read them sees them, and an account (Google) may sync them. Erevos sends them nowhere. A .vcf file saved from them is outside Erevos, not sealed. A contact's calls and SMS are read from the phone's own call log and SMS only to show its history, and kept nowhere. | |
| **Contacts kept only in Erevos** | Sealed with the space's key, or with the hidden chats' for theirs, in one file for every space whose size shows roughly how many there are in all, not whose they are; their photos each in a file of its own. Never in Android's contacts. A .vcf file saved from them, hidden chats' too, is outside Erevos, not encrypted. Calls and SMS to them go through the phone, and show in its call log and SMS. | |
| **Phone calls** | Plain phone calls: the phone company carries them and can listen, as with every phone app. Android keeps the call history, not sealed by Erevos, as for every phone app; Erevos reads it, and the favourites, to show them, deletes from it only the calls you delete, and keeps no copy. The SIM chosen for each number is sealed in the space; the quick replies, and what is blocked (prefixes, group ids and times only, the same for every space), are kept on the phone, not sealed. | |
| **Imported chats** | Sealed in the space they were brought into, their photos and files too, each in its pieces as a chat's file is. The file's size, and how many pieces there are, tell roughly how much was imported, not where. | Viber's photos and files, and files over 1 GB. |
| **Message history** | Kept on the phone, sealed in its space, with no limit, in same-size pages mixed for all spaces. Only how much it all takes shows, not which space it belongs to. Deleting on both phones, and disappearing messages, rely on the other phone's Erevos. | |
| **Nearby messages** | Open only in the space that has the contact. One for another space waits in memory, six hours at most, until that space opens. Hidden chats never use the nearby link. | Hidden chats nearby. |
| **Voice messages** | End-to-end encrypted through the relay or nearby, in pieces: the relay, or whoever listens nearby, can tell roughly how long each is. Each sound is sealed in a file of its own; how many files there are, and their sizes, show roughly how many are kept, not in which space. Unsealed in the cache only while it plays. | Sound files all of one size. |
| **Photos and files** | End-to-end encrypted, through the relay's file store, in pieces of one size: the relay sees how many and when, so roughly how big. Your relay sees your address, as for messages; the contact takes them through their own relay. Photos lose their place, phone and time, unless sent as a file; a file keeps what it says inside. Sealed on the phone in their pieces, shown from memory. Saved copies are outside Erevos. Not in backups yet. | Backups that hold them. |
| **On a computer** | Sealed as on the phone, in the app's own folder. Its keystore is sealed with the system's keyring (on Windows, your account's key); on a Linux system without one, Erevos keeps nothing unless started with \`--plain-secrets\`, and then keeps it as it is. | |
| **Backups** | One file sealed with its own password, holding every space as it is sealed on the phone. Its name says it is an Erevos backup, and its size shows roughly how much is kept. Automatic backups keep their password on the phone. | Backups straight to Nextcloud or WebDAV. |
| **Marks ✓✓ and ✓✓✓** | The contact's phone learns when yours got and read their messages, encrypted. The relay, or whoever listens nearby, sees one more small message. | A switch to stop telling when you read. |
| **Fingerprint or face (Android)** | Off unless turned on. Opens only the first password's space: its key sealed in the Android Keystore, usable only right after a strong fingerprint or face check, and dropped when they change. Someone who holds you can use your finger. | |
| **Notices (Android)** | In the background: "Erevos – Ready for calls and messages" (not on the lock screen), "Incoming call" or "Incoming video call" – "Open Erevos to answer", and "New message" or how many came; when Android or the password stops it, "Closed by Android" or "Locked" – "Open it to receive calls and messages again"; a reminder, "Reminder" or how many; a new version, "Erevos X is out". Never who or what. On a locked phone the one for messages says only "Erevos". Hidden chats that may say so show the same notice, counted with the rest: whoever sees it and finds nothing new may guess there are more. As the phone app, the notice of a phone call names who calls, over the lock screen too, as every phone app's does, but never by a name only hidden chats know: a call from one of their contacts shows the number. | |
| **Widget and Phone (Android)** | The widget, once added, shows how many missed calls, unread SMS and new messages there are, never who or what. The Phone opens without the password only if you let it: then anyone holding the unlocked phone sees the calls and favourites Android keeps, with the names of the phone's contacts only. | |
| **Calls** | End-to-end encrypted (DTLS-SRTP, its key sent in the encrypted chat). Through the call relay, neither phone sees the other's IP address; the server running it sees both, when and how long, and how much passes. Without a call relay, on the same Wi-Fi only, each phone sees the other's address. The relays see when a call starts ringing. | Ringing on a computer and in the web app while closed. Calls over Bluetooth (the walkie-talkie works there). |
| **Group chats** | End-to-end encrypted with MLS (RFC 9420); members taken out read nothing after. Each member's copy is sealed apart, so relays cannot tell who is in a group; each relay still sees a message reach a queue. Members see each other's keys and relay addresses. Photos, files and voice messages go through the sender's relay's file store, as to a contact, and stay there 14 days. Not audited. | |
| **Group calls** | Voice and video, end-to-end encrypted between each two phones in the call (DTLS-SRTP, its keys sent in the group's encryption). Through the call relay, no phone sees another's IP address; the server running it sees each phone's, when and how long, and how much passes. Every member, in the call or not, learns who is in it. The relays see when one starts. | Video with more than four people, through a server; more than eight people. |
| **Public groups** | As group chats, and anyone with the link can ask to join and read from when let in. Requests come to the owner's relay sealed for the owner's phone: the relay sees how many and when, not from whom. Members see each other's chosen names, keys made for that group alone, relay addresses and queue sender ids. Not audited. | |
| **Link previews** | Off unless turned on. Then, as you send a link, your phone fetches its page straight from the site, which sees your IP address and when, not who the message is for. The preview goes inside the encrypted message; the phone that gets it fetches nothing. None while the space goes through Tor; in hidden chats only with their place's own switch. | Previews through Tor. |

## Transparency {#transparency}

What the server behind Erevos (lphl.nekten.eu) keeps, and what has been asked of it. This page goes out inside every
release, so it is signed with the release, as the app is.

**Requests from authorities.** As of this release: none. No authority, court or company has asked for data about
anyone who uses Erevos, and no one has been asked to keep quiet about such a request. If this paragraph is ever gone,
or no longer says "none", take it as a sign. **Why:** a request that comes with an order to keep quiet cannot be told,
but a sentence that stops being written can be noticed. That works only as long as it is renewed: each release says it
again.

What the relay keeps, and for how long:

| What | For how long |
| --- | --- |
| **Messages that wait**, encrypted end to end | Until taken, 14 days at most. |
| **Photos and files**, encrypted, in pieces | As messages: until taken, 14 days at most. |
| **Messages sent for later**, encrypted | Until their time comes. |
| **Queues**, random ids with no name | Until their phone has not used them for 180 days. |
| **Access lines**: for each phone, the SHA-256 of its token and a name: the one the inviter typed, or the LPHL user name for those who signed in with LPHL | Until the line is taken out, or the line that invited it goes. |
| **Web app push addresses**, for notices while the web app is closed | Until turned off in the web app. |

What it does not keep:

- **No list of connections.** The relay writes no log of who connected or when, and the web server in front of the
  relay and of the web app keeps no access log since 24 October 2026. Errors are logged, and an error can name an
  address.
- **No contacts, names or phone numbers.** It has none to keep.

What it still sees while it runs: the IP addresses that connect, when messages come and go, and how big they are, as
[What is protected today](#privacy) says. During a call through the call relay, the IP addresses of the phones in it.

**Copies.** The relay's folder is backed up every day, with the waiting messages still encrypted end to end. The copies
hold what the table above lists, for as long as they are kept.

**Others who see something:** the hosting company (Hetzner), which runs the machine and its network; LPHL's sign-in
(Authentik), which sees each sign-in with LPHL; and for the web app with notices while closed, the push service of the
browser (Apple, Google or Mozilla), which sees that a notice came, never what.

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
- **Bringing your chats:** Telegram and WhatsApp already come in, with their photos and files, and Viber with its
  words, see [Imported chats](#import). Next: Viber's photos and files.
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
- **LoRa radio**, under **Settings** → **Relay and networks**, must say **Linked**. If it does not, close the
  Meshtastic app: a radio links to one app at a time.
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
On an iPhone, yes, from the browser, as a web app, see [On an iPhone](#iphone).
`;
