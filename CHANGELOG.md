# Changelog

What each release changed, newest first, for whoever taps **Update**. After 0.1.16 comes 2.0.0.
Until then releases were numbered `0.1.<run of the release workflow>`, so some numbers have none:
0.1.1 went out only on the private repository, without an Android app, and 0.1.3, 0.1.9, 0.1.13
and 0.1.15 never came out.
No release so far has a macOS build. **Not audited.**

## Unreleased

On main, not released yet:

- **Less battery in the background** (Android): Erevos waits at the relay a minute at a time, also for what comes to
  your contact link and your public groups, and asks nothing more when nothing came, where before it asked about
  ten times a minute. Tor sends the reduced padding Tor made for phones (every 9 to 14 seconds, none to the phone).
  Looking for phones nearby in the background: Wi-Fi Direct every ten minutes instead of two, Wi-Fi Aware a minute
  in every five, and on the same Wi-Fi Erevos hears the others twenty seconds in every two minutes, so a phone
  nearby may be found a few minutes later. A Wi-Fi Aware link that ended no longer keeps the Wi-Fi awake. Nothing
  changes while Erevos shows.
- **Erevos no longer closes by itself** (Android) when part of a screen is redrawn elsewhere while a screen is still
  sliding away, as could happen back from choosing a photo for a sticker, and again when Erevos opened after
  cropping it. Android said "The specified child already has a parent".
- **Hidden chats' notices are right again** (Android): messages already told of no longer show "New message" again
  when Android closes Erevos in the background and starts it anew, nor do the ones you read while the hidden chats
  were open once they close. A text to hidden chats whose bell their relay did not take (Nostr) is now counted when
  it goes through the relay five minutes later, where before it made no notice at all.
- **Hidden chats open from New chat too**: hold **New chat** down for a second and a half, type the PIN and tap
  **Open**. It shows the same in every space, and a wrong PIN only closes it, as a search that finds nothing.
- **Search contacts in the Phone** (Android): a search at the top finds a contact by name or number, in the phone's
  contacts and, with Erevos unlocked, in those kept only in Erevos and your Erevos contacts, never in hidden chats.
  Tap a number to call it, or hold it down to put it on the keypad.
- **New chat shows how to add a contact first**: the relay's own settings (its address, token, second relay, invites
  and queue) are closed under **Relay settings** until you tap it; your contact link, its QR code and adding a contact
  show at once, as before. **Hide relay** is now **Hide relay and new contacts**.
- **A call shows over the screen saver** (Android): while the phone showed its screen saver (as while charging), a
  call rang but its screen did not show. Now the call notice shows then too, also with Erevos open under it, and the
  screen wakes, which ends the screen saver; so does a screen that is off.
- **Share to Erevos from other apps** (Android): Erevos is now in other apps' **Share**, such as the browser's for a
  link. **Send to** lists your chats, groups and SMS conversations, recent ones first, with a search, never hidden
  chats. Words and links open in the message field of the one you pick, to read and send there; a photo or file goes
  as soon as that chat or group opens. Before, Erevos took only SMS links from other apps.
- **Every new message sounds, also while Erevos shows** (Android): the notice that says how many messages came now
  sounds for each message, not only the first, and shows while you use Erevos too. In the chat or group you have open
  only the sound plays, and opening a chat takes what came there off the count. Typing, and that a message came or
  was read, still make none, nor does a message sent without sound. Hidden chats that say when a message comes say so
  at once too, unless that place is open. **Say a message came** or **No notice** now shows with **Only while Erevos
  shows** as well.
- **SMS settings say how the list works now**: an SMS conversation is pinned, archived, marked as spam, blocked or
  deleted by holding it down, as a swipe to the side goes to the tab beside; they still said to swipe it.

## 3.0.0 (2026-10-24)

- **Each launcher icon opens what it names** (Android): **Erevos**'s own icon opens its chats (the **Erevos** tab),
  or leaves the chat you had open, instead of whatever Erevos showed last, such as the SMS after SMS's icon or the
  Phone after Phone's. **SMS** opens the SMS list again also when Erevos showed it before and you went to another
  tab, **Phone** opens the keypad (with missed calls the widget's button opens **Recents**), and the widget's
  buttons do the same each time they are tapped. A tel: link with the same number a second time types it again.
- **Messages go through Tor by default** (Android): under **Tor**, **What goes through Tor** is now **Messages**,
  **Everything** or **Nothing** instead of a switch, and **Messages** unless you change it. With **Messages**, what
  you write and what tells your contacts something (such as that a message was read) goes to the relay through Tor,
  so the relay does not see your phone's IP address for it; pictures, files and voice messages go straight, which is
  faster. A message never waits for Tor: while Tor starts, or for a minute after it could not reach the relay, it
  goes straight. **Everything** is the old switch turned on: files too, and nothing without Tor. A space that had Tor
  on keeps **Everything**; one that had it off gets **Messages**.
- **Texts through Nostr** (Android): under **Nostr**, on unless changed, what you write to a contact whose Erevos
  reads on Nostr too goes through three public Nostr relays, through Tor, instead of through your relay. It is
  end-to-end encrypted as always and wrapped once more (NIP-59) for a Nostr key your contact made for that chat
  alone, by a key made for that message alone, so the Nostr relays see neither who wrote it nor to whom, and your
  relay does not see it. Should your contact's phone not say within five minutes that it came, it goes through your
  relay as well, and they see it once; while Tor starts, or when no Nostr relay takes it, it goes through your
  relay at once. Hidden chats read on Nostr while they are open, and still show **New message** when closed: with
  each text through Nostr your contact also sends your relay a bell that says nothing. Pictures, files, voice
  messages, calls, reactions, the marks that a message came or was read, texts sent for later, and whatever goes to
  contacts on an iPhone or a computer stay on your relay. Each space has its own list of Nostr relays: the first
  three unless changed, up to five, your own too. With Tor off for a space, Nostr is not used. Nothing changes on
  the relay. Tor's connections also no longer hold up the app's other work while they wait.

## 2.0.3 (2026-10-23)

- **One invite for everything**: **Invite someone**, in the chats, makes one QR code or link for
  someone new, for one person and 7 days. Their phone scans or opens it in Erevos and taps
  **Join**: it gets access of its own to your relay and a queue there, typing nothing, and you are
  each other's contacts at once, with no message request, named as each of you typed. A phone with
  no relay yet shows **Start with an invite** instead of the relay settings (with **Sign in with
  LPHL** and **Set it up yourself** under it), so a new user never sees the words relay and token.
  The access is an invite to the relay, so it takes a relay that invites; without one the invite
  still makes you contacts.
- **Spam rules on who sends, and why** (Android, SMS): under **Spam filter**, **Senders** takes a
  sender's name (as shops and banks send) or a number with * for anything (`+4470*`, `1234*`),
  **To Spam** or **Let through**: a sender let through is never caught by the filter's rules, though
  a number marked as spam or blocked still is. **Send numbers from abroad to Spam** catches every
  number written with another country code than yours, which Erevos takes from the numbers you
  answer. Each conversation in Spam now says why it is there: blocked, marked, which rule, abroad,
  which of your words, or a link and which words that try to fool.
- **480 stickers in 20 sets of 24**: the nine sets grew to 24 each, and eleven new ones came:
  Cats, Dinosaurs, Monsters, Robots, Love, Greece, Sports, Music, On the move, Flowers and plants,
  and Fruit and veg. All but Words and Treats move. As before each phone draws them and only a
  sticker's name travels, so an Erevos from before shows a new one's emoji.
- **Chats are lighter on older phones**: typing redraws only the message bar, not the whole chat
  with its thread; a message of the thread draws again only when it changes (a voice message
  playing redraws its own line, once a second); a long chat opens at its latest 100 messages, with
  **Show earlier messages** above them, and going to an earlier one (from the search, a starred
  message or the one a message answers) brings it, and a chat shows its messages as it opens,
  without first waiting for a look at the relay under way. Messages, files and pictures go through native
  base64 and UTF-8 where the phone has them, and the open space's history and queues are kept
  open instead of read again every few seconds, as are the SMS invites unless something changed
  them. Groups' message bar too.
- **QR codes show at once**, on older phones too: each is one picture now, made in a fraction of
  the time, instead of a view for each stretch of modules (about 11,000 for a contact's code) and a
  slow search for its mask. It looks and scans the same, and letters beyond English go into it as
  UTF-8.
- **Copy code** for one-time codes (Android, SMS): an SMS that says it holds a code, in any of
  the app's languages, gets **Copy code** under it in the chat and on its notice, which does not
  show the code (and on Android 12 and later asks to unlock first). Only the code's digits are
  copied, marked sensitive so Android shows no preview; a phone number, an amount, a date or a
  time is never taken for one.
- **Locked, Erevos still receives** (password lock): when it locks, after 30 seconds away or with
  **Lock now**, the password screen comes in front of the open space, which goes on behind it, so
  messages and calls still come, with their notices, and a call shows over the password screen.
  Before, the space closed as the password screen showed, and Erevos left there received nothing,
  with no notice saying so. Its screens still close, hidden chats too, and the call screen still
  loses its contacts' names; another space's password closes it first, nothing of it kept. When
  the space does close (after a backup is restored) and Erevos leaves the screen with the password
  asked, a quiet notice says "Locked" (Android).
- **Contacts open faster** (Android): the phone's contacts show as soon as Android gives them, and
  at once when you come back, while they are read again; those kept only in Erevos and the chats'
  Erevos contacts join them a moment later. Putting them in order by name no longer takes seconds
  with many contacts, and the search no longer reads every contact again at each letter.
- **Hidden chats' notice counts only messages** (Android, **Say when a message comes**): while a
  place is closed, the notice says "New message", or how many came, each message once, as for the
  other chats. Before, anything that came for the place made it, also that a message of yours came
  to them or was read, and after that one it said nothing more until you opened the place, so a
  real answer could pass in silence. A call that rang (**Ring calls when closed**) makes none; one
  that did not ring counts as a message. The relay counts what comes into a queue by the byte each
  send carries, as it does for the web app's notice, and tells the phone how many (`NEWS`); it
  needs the relay updated, and an older one only says that something waits, as before.
- **The relay tries every address of a push service** (web app notices): one after the other, all
  within the same 15 seconds, so an address that does not answer, such as an IPv6 one on a server
  whose IPv6 does not work, no longer loses the notice. Its service (`deploy/relay`) starts it at most 5 times
  in 5 minutes, and not again when it refuses its settings, instead of every 2 seconds for ever.
- **The relay tries every address of another relay and of the sign-in provider** as well, for
  forwards, files kept on another relay and **Sign in with** checks. It also keeps less in its log
  and is safer on a power cut: of a sign-in the provider refused it logs only the error's code word,
  never other text a browser sent; its debug output leaves out secrets, tokens and who signed in;
  its keys (its own and the one for web app notices) are written whole or not at all, so a stop
  while it makes one no longer leaves a short key that refuses every later start; a file part or a message sent for later, once stored, stays after
  a power cut; and a line with letters other than English ones in the file of revoked lending
  tickets no longer stops it.

## 2.0.2 (2026-10-23)

- **Swipes on tabs only change the tab**: on a screen with tabs a sideways swipe always moves between
  them; past the first or last tab it gives a little and comes back, instead of going back a screen.
  SMS conversations in the home list no longer swipe to archive or delete: hold one down for both.
- **Launcher icons fill the launcher's shape** (Android 8 and later), as FASOULI's do, in every colour,
  instead of a small square inside a pale tile.

## 2.0.1 (2026-10-23)

- **Launcher icons of their own colour** (Android): Erevos red, Phone green, SMS blue and Contacts
  violet, so they can be told apart at a glance. **SMS** is a new icon of its own, which opens the SMS
  list as the widget's button does.
- **Choose each icon's colour** (Android, **Appearance** → **Launcher icons**): red, orange, green,
  blue, violet or dark, for each of the four. It is the phone's choice, not a space's, as the icons
  show before Erevos is unlocked. After a change some launchers take the icon off the home screen:
  add it again from the list of apps. After this update Erevos's own icon may need adding again once.
- **Rearrange the widget's buttons** (Android, **Appearance** → **Widget**): move each of its four
  buttons with ↑ and ↓, with the widget drawn as it will look; **First order** puts back Phone, SMS,
  Messages and Contacts.
- **Swipe to go back** on every screen: swipe right anywhere, as with the back arrow. **Swipe to the
  side** between tabs: **All messages**, **SMS** and **Erevos** on the home screen, **Keypad**,
  **Recents** and **Favourites** in the Phone, the filters in Contacts and the sticker sets. An SMS
  conversation in the list keeps its own swipes.

## 2.0.0 (2026-10-22)

- **An update of the phone's WebView no longer closes Erevos** while it receives in the
  background, which took its notice away and with it calls and messages until you opened it. Erevos
  keeps no cookies, so its relay connections no longer load the WebView (and hold less memory).
  When Android closes Erevos all the same while it receives, for memory say, a quiet notice says so
  from then on: open Erevos and the space to receive again.
- **Deleting or blocking a contact gives you a new relay queue**: **Delete contact** and **Block
  contact** in a chat's details forget them and their chat, and Erevos makes a new queue at once,
  which your other contacts are told quietly, in a message with nothing in it, and again 7, 14 and
  21 days later while they have not written there; what they wrote to the old one still shows for 14
  days. The one deleted is not told and nothing they send there shows; your contact link stays, so
  they can still ask to talk again, unless blocked: then what they send is dropped, a request too,
  until **Unblock** under **Blocked contacts**, and adding them again from their link asks you to
  unblock them first; nothing else adds them, neither their answer to an invite by SMS nor their
  contact link in a group. **Block** sits beside **Refuse** on a request, and moves your queue only
  while your link still names it, as a request knows only your link. The note says in how many of
  your groups they still are. What you scheduled for them is taken back from the relay, at once or
  as soon as it answers, and what you scheduled for a contact whose queue moved is held again for
  their new one. When junk fills your queue it moves the same way, at most once a day, and junk on
  the queue your link names gives you a new link, as **New contact link** under **Relay and new
  contacts** does: the old links and QR codes work 14 days more; when the relay has lost that queue,
  the new link comes the same way, and the old ones stop at once. Your groups and public groups each
  say a queue of their own from now on, so a member no longer learns the one in your link, and a
  group admin says it with new keys, which members take only if it is still the same admin. On a
  linked computer, deleting or blocking goes to the phone, which moves the places of its list and
  asks the computer to move its own, and tells the computer who is blocked: adding them there from
  their link asks to unblock them as the phone does, and **Unblock** unblocks them on the phone too.
  A backup put back, one from before this version too, says a newer queue than any your contacts
  hold, and each is told it, so none keeps writing to a queue you no longer read. A flood of
  made-up requests counts as junk, while a batch of real ones still comes. In hidden chats only
  that place moves, its ring queue at once, as it does after three rings within a day that brought
  no call within two minutes of your answer, and its contacts learn the new one as they learn a
  moved queue. A linked computer never rings a contact's ring queue itself, so a call from it rings
  their closed hidden chats only once they are open, as the phone does not pass it on to that
  queue.

- **A new Erevos contact can take the name of one of your contacts**: adding someone by their
  Erevos ID, from a scanned link (**Add and connect to one of my contacts**) or under **Relay and
  new contacts** (**Connect to one of my contacts**, under the note that they were added), lets you
  choose one of your contacts, the phone's or those kept only in Erevos (in hidden chats only
  theirs, never the phone's). The two are linked, and the chat takes that contact's name instead of
  "contact 1a2b3c4d" in the chat list, the chat, the search and calls. An Erevos contact that is no
  contact yet has the same on its card. **Add to Erevos** and **Choose from my Erevos chats** on a
  contact's card name the chat too, and a card linked before to a nameless Erevos contact names it
  once opened. A name you gave in Erevos is never changed. On a linked computer the name goes to
  the phone too.

- **Sign in to the relay with LPHL**: on a relay whose operator set up an OpenID Connect provider
  (`EREVOS_RELAY_OIDC_ISSUER` and the rest, such as LPHL's Authentik), **Sign in with LPHL** shows
  under the token in **Relay and new contacts**. It opens the provider's sign-in page in the
  browser, where the name and password are typed, never in Erevos; the relay's page then shows six
  digits of its own making, typed back in Erevos under **Code from the page** (coming back puts you
  there) with **Finish signing in**, and the phone claims a token of its own over the WebSocket with
  them and a secret it made first, so no token is ever in an address, and a sign-in link someone
  sends gives nothing to a phone that did not sign in itself. Five wrong codes end the sign-in. The
  relay adds the line `lphl:<user name>` for it (signing in again on the phone replaces it, when its
  token is the one it got from that relay; 10 phones at most for one account) and every hour
  refreshes the account's token, checks it is still active and asks userinfo whose it is, taking
  the line out once the account is closed or disabled, is not in the group the operator names
  (`EREVOS_RELAY_OIDC_GROUP`), or the provider could not be asked for 3 days and then failed two
  more checks of that line an hour apart: no line goes for another's check, nor all at once after
  the relay was off or the clock moved. It keeps only the account's id, user name and refresh
  token, sealed with a key from the client secret, and writes that down before the line, with a
  mark while a line is to go, so a restart before it is out of the file takes it out again. One
  browser starts 10 sign-ins a minute at most, told by `X-Forwarded-For` from a proxy on the same
  machine. The pages are on `/signin/`, which a proxy in front passes as plain HTTP; Erevos opens
  them only over https on the relay's own host.

- **Invites to the relay**: on a relay whose operator turns invites on (`EREVOS_RELAY_INVITES=on`,
  with a file of phones' own tokens), a phone with a token of its own has **Invite to the relay**
  under its token in **Relay and new contacts**. It names who the invite is for and shows a QR
  code, good for one phone for 7 days; the phone that scans it (with its camera, a photo of it in
  Erevos, or its link pasted) makes a token of its own, keeps it sealed in its space with the
  relay's address, and makes its queue there, typing nothing. The relay keeps only a fingerprint
  of the invite and of the token, and adds a line for the phone to its file of tokens, named as
  typed, made safe and unique, saying who invited it. The inviter lists their invites and takes
  back one waiting, or the phone that took one. A phone let in by an invite uses the relay only as
  long as the phone that invited it: once that one's line goes (taken back, signed out, or taken out
  of the file by hand), the lines it invited go too, and theirs, and a connection a phone has open
  is closed at its next request once its line is gone, and a message it sent for later no longer
  goes. That goes by the token, so a line put in place of another with a new token cuts what the
  old one invited; `erevos-relay free-line NAME`, run with the relay stopped, frees a line from its
  inviter. The relay never writes the file of tokens because it read it: it takes refused lines out
  of it only once the file stayed unchanged for a minute and is as it read it, so a save it reads
  halfway loses no line, and who invited whom stays through a failed write or a restart, signing in
  again too. At most 5 waiting at once and 10 a day for each phone, and 100 phones let in by invite
  on the relay (`EREVOS_RELAY_MAX_INVITED`). An invite names a wss:// relay, or a ws:// one on a
  home network only. The relay refuses a file of tokens that is a symbolic link. Older relays and
  phones are unchanged: the button does not show.

- **Permissions in the web app** (menu → Permissions): what the browser lets Erevos do, each with
  why and the browser's own question, or where its setting is once it no longer asks: running from
  the home screen, notifications while closed for a space that turned them on, the microphone, the
  camera, and keeping its data for good (Safari may clear it otherwise; a backup is the safety
  net). It knows an iPhone or iPad, Chrome and the browsers made from it, Firefox and Safari on a
  Mac. After each new signed release it opens by itself when something messages, calls or the data
  need is missing. A browser cannot tell battery saving, so it is not there. On Android the screen
  now also reads the message notice, whether the call notice pops up, battery use set to
  Restricted and pausing when unused (these open it by itself too), the message sound, notices on
  the lock screen and calls through Do Not Disturb, and says when the phone is on silent or
  vibrate, or battery saver or Do Not Disturb is on.

- **The web app's notice says how many**: while Erevos is closed, its one notice says how many
  messages came since it was last open, such as "3 new messages", in the app's language, or "Call"
  when only a call rang, and opening Erevos starts again. The relay counts what the sending phones
  marked as messages (below) and puts the count in the push, encrypted for the browser and always
  the same size, so the push service (Apple's on an iPhone) sees only that something came, and
  when. Receipts, typing and new keys push nothing, and messages read on the screen end a push
  still waiting. At most one push every 15 seconds goes to a browser, for all its spaces on one
  relay. With a relay or a sender's Erevos older than 2.0.0, or a message other phones carried to
  the relay, there is no number: the notice says "New message", or "New messages" once more came,
  until Erevos is open again. The browser keeps a short tag of each queue that pushed, to count
  each message once, only until Erevos next opens or closes: until then, how many there are may
  show more than one space. An iPhone keeps every notice, so the older ones are closed once the new
  one shows (an iPhone keeps those less than 30 seconds old).

- Each send now tells the relay what it carries: a message someone reads (a text, a voice message
  in its parts, a photo or file, a sticker, place or poll, a group's message), or word between
  phones (that it came or was read, typing, reactions, new keys, a group's own changes, what goes
  between linked devices), which pushes nothing; a call that rings, a group's call that starts
  too, pushes as a call, counted as no message. What waits for the relay, or is sent for later,
  says it when it goes, and so does a contact's message the phone passes on to a linked computer,
  and each group message, however many reach it at once. What a linked device writes goes to the
  phone as word between them, as it is the account's own, and the phone counts it once as it
  passes it on, a voice message too when one of its parts had to wait. A message carried by phones
  nearby says it when this phone hands its own copy to the relay; a phone carrying it for another
  cannot know, so says nothing. What 0.1.16 kept waiting for a linked computer says nothing either
  when it goes after the update, so it still pushes. So a relay that counts can say in a closed web
  app's push how many messages came (above). The relay sees these marks on every system,
  notifications on or not: which packets are messages, and when a call starts.

- **Hidden chats can ring their contacts' calls while closed** (**Ring calls when closed**,
  Android): turned on at the top of a place, a call from one of its contacts then makes the phone
  ring and show "Incoming call" with no name, as the other chats do, though the place is shut and
  Erevos is in the background. On the ringing screen a small, discreet sign opens a PIN field; the
  right PIN opens the place and answers, a plain Answer cannot connect, and Decline stops the ring
  (about 45 seconds). Like the message notice it needs **Receive and ring** and a relay that waits,
  and the space keeps a ring queue for each of its 4 places, those not ringing made for nothing on
  the same relay, so opening the space gives nothing away; the relay is asked only whether a ring
  waits there, never what, and a caller sends only random bytes of a call's size, never opened. The
  call's own offer waits on the chat's message queue until the PIN opens it. A contact you deleted
  can still make it ring but never connect; a call from a linked computer rings only while the
  hidden chats are open. Backups do not keep it.

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
  before. One that missed the first message of another gets a new one a day or more later. With a
  phone or device from before, everything goes through the phone as now.

- Contacts on this version write to each linked device too, so a computer gets their messages and
  answers them with the phone off, also once the phone's queue on the relay is full: what they try
  again reaches the computer all the same, once however often it is tried, and a voice message
  reaches it whole, however long. A computer that was off for longer than the relay keeps messages,
  or missed a contact's first message to it, still gets what they write after, as their Erevos
  starts again with it a day or more later, then ever less often, until it answers; after a contact
  deletes the account and adds it again, the computer starts again with their devices too. Each
  message shows once, even after it disappeared, when it comes again within 30 days (up to 2000
  from one contact, the oldest that came twice giving way first), as each keeps for 30 days which
  messages came and on what day, not what they said, in a backup made meanwhile too; it counts once
  in an Android device's notice, and a voice message sent again after only part of it went is put
  together once. What came and was read shows on all, also what a call or a message sent for later
  says was read. Only a linked device of the account takes what is written to it, so a list
  naming someone else's account on this version has it read nothing. Under the safety number, a
  chat's details say when the list of the contact's devices last changed. A phone put back from a
  backup gives its contacts a new list, without the computers linked since, also when its clock is
  behind the lost one's, once they write to it; a computer unlinked is left out of the list they
  are given the next time the phone reaches the relay, even while the relay makes no new queue. Each
  contact seals what they write to each device with a key no other contact has, so a relay that
  works with one of them opens none of the others'. A device whose queue on the relay is full keeps
  no other contact or device out of what waits to go, and a reaction, pin or vote a computer writes
  through the phone goes to a contact's devices once it reaches the contact. Hidden chats write to a
  contact's devices too, and to the contact look like the chats of a phone that never linked a
  device; while a contact's queue is full, what they write still reaches the contact's devices and
  is tried again for their phone while hidden chats stay open. A chat moved into hidden chats or out
  of them writes only to the contact's phone until it goes back, and tells the contact's devices
  first, who can tell from it, if it gave them its list, that it went into hidden chats. With contacts, phones or devices from before,
  everything goes through the phone as now. What they write to each device, and what a computer
  writes to them itself, tells the relay what it carries as the phone's messages do, for a closed
  web app's notice to count; the phone passes a contact's message on quiet to a computer they wrote
  it to as well.

- **A new chat screen**: one bar at the top with the contact's picture and name, whether they are
  online, nearby or typing, and buttons for a video and a voice call, with ⋯ (⋮ on Android) set
  apart for the chat's details. Under the messages, one floating bar: **+** opens, where the
  keyboard was, what to send (photo, camera, file, sticker, location, poll) and how the next message
  goes (disappearing, Talkie, send later, and as an SMS for a contact with a number); the smiley
  opens the stickers, the stopwatch makes the next message disappear, and the microphone, held,
  records a voice message. Slide left to drop it; under a second sends nothing, and TalkBack starts
  and stops it with a tap. With something typed it is the send arrow, which held sends without
  sound, later, disappearing or as an SMS. A disappearing message can now be a voice message (a
  walkie-talkie one too), photo, file, sticker, place or poll, sent now or later. Groups have the
  same bars, with their video call under ⋯. Switches show their knob when off on dark glass, and a
  light color of your own takes dark text on its buttons in the dark too.

- **Add a contact from a photo of their QR code**: under the contact link field in **Relay and new
  contacts**, **Take a photo of the QR code** and **Choose a photo of the QR code** read it and add
  them at once (not in hidden chats, which a photo would close). The computer app, the web app and
  the Sailfish OS app read QR codes from a photo now too, with **Choose a photo of the QR code**,
  which on an iPhone offers the camera as well; until now they could not. There, photos sent at a
  smaller size, contacts' pictures, your own stickers and wallpapers now also work in older browsers
  (an older Safari, Sailfish OS), which refused them. A button's long label goes on two lines on a
  narrow phone instead of out of the screen.

- **The Phone screen fits a small phone**: on a short screen (360×640 to 360×800) the keypad no
  longer runs up over the tabs and the "Erevos is not the phone app" card. That card shows only its
  title there, with a > that opens the phone settings; the keys, the number and Call shrink to what
  is left, down to 70%, and scroll past that. The title stays on one line, the three tabs share one
  row, and "Type a phone number." goes as soon as one is typed.

- **Add as contact in a group**: in a group's members list (**⋯**), **Add as contact** under a
  member who is not your contact asks them, in a message only they get, for their contact link, and
  gives them yours. On their phone the ask shows once, at the top of the group, to **Send** or
  **Don’t**; once they send it you are each other's contacts, with a chat of your own and no message
  request on either side. Don't, or no answer, tells you nothing, and after a week you can ask
  again. A member who is your contact already is never changed by it, and nothing of it reaches
  hidden chats: once you are each other's contacts, in any group or by a contact link, what was
  asked in your other groups goes, so nothing left over adds them again after their chat is deleted
  or moved into hidden chats. A member taken out of the group asks nothing more, and when two
  members show the same key no contact link goes to either or is taken from either. **Name** under a
  contact who has no name yet gives them one, on a linked device too. Not in public groups, and
  asking is for the phone that holds the account; an Erevos from before drops the ask. An admin now
  adds a contact only by a key package that is theirs: one that says it is someone else does not
  join. A phone joins a group only when its admin is the contact who asked it in.

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

- **SMS in the Erevos chat**: with a contact whose number is linked to them, or is on their contact
  card, the chat shows the SMS and MMS with that number among its messages, by time, each edged and
  marked SMS (not encrypted), with its ✓ marks and photos. They are read from the phone's SMS,
  never kept in the chat's history; held down, one is copied, forwarded or deleted as in the SMS
  conversation, and the chat's search finds them. Only the conversation with that one number, only
  while Erevos is the SMS app or may read SMS, and never in hidden chats; the latest 50 first, and
  **Show earlier SMS** for more. New ones show as they come, also while another app is the SMS
  app: the chat and the SMS conversation hear when Android's SMS store changes, and read it again
  as Erevos comes back.
  **Plain SMS** in the chat's details opens the SMS conversation itself, to write one there, and
  **+** → **Send as SMS** (or **As SMS**, holding the send arrow) sends what is typed as a plain
  SMS, naming the SIM when there are two, and saying so first when the message was to disappear
  or to answer one, which an SMS cannot. Before, once a number was linked, its SMS could no longer be reached from the chat. The
  home screen's **Erevos** list keeps a contact whose last message was an SMS, which it used to
  drop. No hidden SMS invite goes to an Erevos contact's number any more, linked or on their
  contact card.

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
