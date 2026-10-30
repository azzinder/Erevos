import { mark } from './i18n';
import { laterThan } from './version-name';

// What's new (Settings → General → What's new, app/whats-new.tsx): what each version changed, in
// short, newest first, by its number alone, as CHANGELOG.md tells it in full. Each version says
// first what changes for you (new things to see and use, new looks), then what changed under the
// hood (fixes, speed, battery, security inside), as the CHANGELOG's releases do. The words are
// English, shown with t(); i18n/<lang>/whats-new.ts has them in each language. **Bold** and
// [links](#guide-section) are written as in the guide. NEXT is what is on main and not out yet: it
// shows under the number of the version that runs. After a release its two lists move into a new
// entry of VERSIONS under the release's number; checks/whats-new.check.ts holds VERSIONS to the
// releases of CHANGELOG.md.

/** What changed, in its two kinds. */
export type Changes = { forYou: string[]; underTheHood: string[] };

export type WhatsNew = Changes & { version: string };

export const NEXT: Changes = {
  forYou: [
    mark("**Numbers on the home chips**: each chip above the chats (All messages, SMS, Erevos, Matrix, XMPP, Nostr) shows how many messages are not read in it, as a small number after its name; muted chats and groups are not counted. See [Getting started](#start)."),
    mark("**Open a photo full screen in Matrix, XMPP and Nostr chats**: tap a photo shown in a Matrix, XMPP or Nostr chat to see it on the whole screen, with zoom, turning with the phone and Save, as in a chat with a contact. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats)."),
    mark("**Who got and who read your messages in groups**: in a group that is not public, your messages show ✓, then ✓✓ once they reached the phone of every member, and ✓✓✓ once every one read them. Hold one and choose **Who read it** to see who read it and when, whose phone it reached and when, and who has neither yet. A member whose Erevos is older says nothing. A linked computer shows the same marks. See [Chat through a relay](#relay) and [Group chats](#groups)."),
    mark("**Who read your messages in Matrix**: your messages in a Matrix chat show ✓ once the Matrix server took them and ✓✓✓ once every other member read them, as their Matrix apps tell their servers; **Who read it**, on a message held down, lists who read it and when, and who has not. Matrix has no mark for a message that reached a phone, so there is no ✓✓. See [Matrix](#matrix)."),
  ],
  underTheHood: [
    mark("**Quiet group messages for the marks**: the group message that says a message came or was read goes only to the senders concerned, and batched; after 300 such messages to some members only, the next goes to all, so no member falls behind in the phone's MLS keys (they accept a jump of 1000 at most). Groups let go of as their space closes send nothing more. See [Group chats](#groups)."),
  ],
};

export const VERSIONS: WhatsNew[] = [
  {
    version: '4.0.0-rc.3',
    forYou: [
      mark("**Delete me from everywhere**: Settings → Privacy and security → Delete me from everywhere deletes what the servers keep for the open space (its queues on the relays with the messages in them, what a relay holds for you to send later, files waiting there, invites nobody used), asks the Nostr relays through Tor to forget the keys your chats read on, and stops the space until you tap Start again. Your phone keeps everything. You can also sign out of Matrix and XMPP and delete the Nostr account made here. See [Delete me from everywhere](#forget)."),
      mark("**Bold, italic, code and hidden words**: in chats and groups, words typed between * become bold, between _ italic, between ~ struck through, between ` code, and between || hidden behind a grey bar until tapped. See [Chat through a relay](#relay)."),
      mark("**Hidden photo**: under + in a chat or a group, a photo that shows blurred until it is tapped. See [Chat through a relay](#relay)."),
      mark("**Safety message**: under + in a chat, words to a contact that the relay sends by itself if you do not open Erevos for 6 hours to a week; each time you open it, they move on again. See [Chat through a relay](#relay)."),
      mark("**Name a member in a group with @**: type @ and pick a member; they are told of the message even if they muted the group. See [Group chats](#groups)."),
      mark("**Reply, change, react and delete in XMPP chats**: hold a message in an XMPP chat or group to answer it, change your words, delete it for everyone or react with an emoji, as Conversations, Dino, Gajim, Monal and Kaidan do; and **typing…** shows while the other person writes. See [XMPP](#xmpp)."),
      mark("**See who is writing in a Matrix chat**: **typing…** shows under a Matrix chat while someone writes in it, as the Matrix server says. It shows of you too only if you turn on **Say when I am writing** on the Matrix or XMPP screen: off at first, as it goes through the server not encrypted. See [Matrix](#matrix)."),
      mark("**Block someone on XMPP**: Block, at the bottom of an XMPP chat, keeps that person's messages, calls and requests from every app of your XMPP account; Unblock lets them through again. See [XMPP](#xmpp)."),
      mark("**Voice messages in XMPP chats**: hold the microphone under an XMPP chat's message box to record, and let go to send; it goes encrypted as the chat is, as Conversations sends one. See [XMPP](#xmpp)."),
      mark("**Matrix groups from Erevos**: New group, on the Matrix screen, makes an encrypted group with a name and the people you invite; Join a group joins one by its address; Invite, in a group, asks someone else in; typing @ in a group names a member, who is told of it. See [Matrix](#matrix)."),
      mark("**Profile pictures on Matrix and XMPP**: contacts and Matrix rooms show their picture in the chat list, and you can set your own on the Matrix and XMPP screens (Choose a photo). Pictures are not encrypted on either network: the server sees them. See [Matrix](#matrix) and [XMPP](#xmpp)."),
      mark("**Run an XMPP group**: a group's admins can set its subject and take people out or bar them, its owner can rename it and make admins, and in a channel the admin sees who is in it and can put them out. See [XMPP](#xmpp)."),
      mark("**Check a Matrix device by QR code**: once both sides accept a check, Erevos shows a code for Element (or another Erevos) to photograph, or photographs theirs, as Element does; comparing emoji stays one tap away. See [Matrix](#matrix)."),
      mark("**Sign in to Matrix with single sign-on** (Android): when your Matrix server signs people in on its own page, as matrix.org does, Sign in with single sign-on opens it in the browser and comes back to Erevos. See [Matrix](#matrix)."),
      mark("**A closed space tells of XMPP messages**: on Android, Say a message came under While this space is closed, on the XMPP screen, has a closed space say \"New message\" when something comes on XMPP while another space is open, never what, from whom or in which chat. Off until you choose it. It needs a relay updated for it and an XMPP server that sends notices to apps that are away; the XMPP server then learns the relay's name, and the relay when messages come. See [XMPP](#xmpp)."),
      mark("**The panic button on a computer and on Sailfish OS**: Settings → Privacy and security → Panic button now wipes Erevos there too, with its automatic backups if you choose; on a computer it then starts again as new. See [Panic button](#panic)."),
      mark("**Every chat opens at its latest message**: chats with contacts, groups and SMS, and the Matrix, XMPP and Nostr chats, all open at the last message with the message bar under it, and have round arrows to the start, to where you left off (the first message that was new when you opened it) and to the end. See [Getting started](#start)."),
      mark("**Matrix: threads, polls, places and link previews**: hold a message and choose **Reply in thread**; **Poll** and **Location** sit under the message box; and the first link in a message goes with a preview when link previews are on, never through Tor. See [Matrix](#matrix)."),
      mark("**Matrix: pins, forwarding, favourites and finding**: **Pin** a message to the top of a room, **Forward** it to another chat, hold a chat for **Make a favourite**, **Low priority** or **Leave and forget**, **Find a group** among public rooms and spaces, and **Search messages** kept on this phone. See [Matrix](#matrix)."),
      mark("**Matrix: make an account and look after devices**: **Make a new account** on a Matrix server that allows it, and **Devices** to see them, rename one, or sign the others out. See [Matrix](#matrix)."),
      mark("**Older Matrix calls**: one-to-one calls as FluffyChat, Nheko and Element on a computer make them now ring here, and in a chat with one person the call tiles offer **Element Call** or **Older call**. See [Matrix](#matrix)."),
      mark("**Linking a computer is clearer**: on a computer, Settings → Data and devices → Linked devices now starts with Link to my phone, with LPHL's relay filled in and Sign in with LPHL under the token, so no token has to be copied from the phone; and it says that the QR code shows once Link to my phone is tapped. See [Linked devices](#devices)."),
      mark("**Matrix, XMPP and Nostr on a linked computer**: linking a computer can bring this space's Matrix and XMPP accounts and the key of its Nostr chats over too, each signed in there as a new device of its own; for a computer linked already, tap Send the accounts under it on the phone. A Matrix server seldom lets the phone sign the computer in: the computer then asks for the Matrix password once, and the account's keys come from the phone, so no Security Key or check by emoji is needed. See [Linked devices](#devices)."),
      mark("**XMPP: make an account, change the password, delete it, find groups**: **Make a new account** on an XMPP server that allows it, **Account** to change the password or delete the account for good, **Find a group** on your server or among public groups, **Location** as Conversations sends it, and link previews in chats written without encryption. See [XMPP](#xmpp)."),
    ],
    underTheHood: [
      mark("**Every relay queue on one list**: the queues a space keeps on the relays are gathered in one place, and the checks fail if a new kind of queue is made without being added there, so Delete me from everywhere cannot leave one behind."),
      mark("**The panic button says when it refused**: when your panic app asked to wipe Erevos while the switch was off, or signed with another key, the panic screen now says so, with the time. An app that moves to a new key the way Android allows stays trusted; otherwise you can trust it again as it is now. See [Panic button](#panic)."),
      mark("**The home screen's chips stay on one line**: with a Nostr, Matrix or XMPP chip as well, **Names** went to a line of its own and the chips moved. Now they stay on one line that slides to the side, and the chosen one is always in sight."),
      mark("**Screens come down when the keyboard is gone**: back from another app that had its keyboard open, the home screen's buttons (or a chat's field) could stay up where the keyboard had been, until a keyboard opened again. Now they come down within a second."),
    ],
  },
  {
    version: '4.0.0-rc.2',
    forYou: [
      mark("**See what you type in a password or a PIN**: every field for a password, a PIN or a token has an eye at its end: tap it to see what you type, and again to hide it. It is hidden again the next time. See [Password lock](#lock)."),
      mark("**Link for a website**: under New chat → Your contact link, a link to put on a web page, such as your contact page. It opens a page that offers Erevos to whoever has none yet, then adds you; what they send comes as a message request. See [Chat through a relay](#relay)."),
    ],
    underTheHood: [
      mark("**A chat read as it opens stays read**: messages read while their chat was still opening, as Erevos ended a look at the relay, showed as unread on the home screen once you went back. Now they are marked read as soon as they show."),
      mark("**An update's download that stalls is tried again**: when the connection brings nothing for a while, Erevos starts the download again by itself, three times in all, and then says so in its own words. See [Updates](#updates)."),
    ],
  },
  {
    version: '4.0.0-rc.1',
    forYou: [
      mark("**Backups to your server from a computer and the web app too**: in the desktop app, automatic backups go to your WebDAV server as on Android; in the web app, Send a backup now sends one there, with a server that lets the web app in. Both can restore from it. Not through Tor. See [Backups](#backup)."),
      mark("**Restore a backup straight from your server**: Restore from a server, under Backups, lists the backups on your server, newest first, and opens the one you choose with its password, with no download by hand, on a new phone too. See [Backups](#backup)."),
      mark("**Backups to your server through Tor**: on Android, automatic backups sent to your own server now follow the space's choice under Settings → Relay and networks → Tor, as Matrix does, so with Tor the server no longer sees where you are. To a server too says when they go through Tor. See [Backups](#backup)."),
      mark("**Media, links and files in groups too**: in a group's details, a list of its photos, videos, voice messages, music, files and links, each kind apart under its months, with a calendar, as in a contact's chat. A tap opens or plays; held, each goes to its message. See [Group chats](#groups)."),
      mark("**Every message says which way it went**: hold a message and its menu says whether it went or came through the relay, through Nostr, to a phone nearby or over LoRa. Messages from before say nothing. See [Through Nostr](#nostr)."),
      mark("**More battery saved in the background, if you choose**: under Settings → Notifications → In the background, Only the waste stays the default; And nearby phones also turns off the radios for phones nearby while Erevos is in the background; And sleep also lets the phone sleep, so Erevos looks at your relay about once a minute and a message or a call can be a minute or two late. Android only. See [Chat through a relay](#relay)."),
      mark("**Photos, files and voice messages with no relay**: when there is no relay between you and your contact and they read on Nostr, a voice message goes through Nostr like a text, a photo up to 3 MB in pieces, and a larger photo, a video or another file, up to 20 MB, to an encrypted file server (Blossom), all through Tor. See [Through Nostr](#nostr)."),
      mark("**A new sticker set, Takis**: a caricature in a dark suit and a purple tie with dots, in 24 moods that move."),
      mark("**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay)."),
      mark('**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).'),
      mark('**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).'),
      mark('**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).'),
      mark('**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).'),
      mark('**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).'),
      mark("**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone)."),
      mark("**Calls ring in the web app, on the computer and on Sailfish OS**: a call that comes while Erevos is open now rings, where only its screen showed, and vibrates where the phone can. On an iPhone it rings once you have touched Erevos, and not on silent. See [On an iPhone](#iphone)."),
      mark('**Erevos on a computer keeps running with its window closed**: in the system tray (on a Mac, in the Dock) it goes on receiving, a call rings and brings the window back, and a notification says how many messages are not read, never who or what. Turn it off under Settings → Notifications → In the background. See [On a computer](#desktop).'),
      mark("**Erevos on Sailfish OS tells of messages and calls while it is closed**: while it is out of sight or closed, a small helper waits at the relay for the open space, a notification says how many messages came, never who or what, and a call rings with the phone's ringtone. See [On Sailfish OS](#sailfish)."),
      mark("**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay)."),
      mark('**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).'),
      mark("**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay)."),
      mark("**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on, and a photo shown on its own even when it is off. See [Chat through a relay](#relay)."),
      mark("**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text, photos and files. See [Matrix](#matrix)."),
      mark("**Every network's chats on the home screen**: once you sign in to Matrix, its chats are in the list with the Erevos chats and the SMS, newest first, each marked Matrix, and the Matrix chip shows them alone, as SMS and Erevos do. See [Matrix](#matrix)."),
      mark("**Check Matrix devices by emoji**: in a chat with one person on Matrix, Check by emoji shows you both seven pictures; if they match, nobody sits in between, and Element sees the check too. Check this device with another of yours makes your own Element trust Erevos. See [Matrix](#matrix)."),
      mark("**Automatic backups to your own server too**: on Android, each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. Off until you add one. The server gets random bytes under a random name and cannot open them; it still sees your account, your address and when. See [Backups](#backup)."),
      mark("**Matrix Security Key and key backup**: enter the Security Key Element made, under Settings → Relay and networks → Matrix, and earlier messages open, new keys are backed up, and your other devices trust Erevos. An account with none can set one up there. See [Matrix](#matrix)."),
      mark("**Matrix through Tor**: on Android, a space's Matrix account follows its choice under Settings → Relay and networks → Tor, so the Matrix server no longer sees where you are; the Matrix screen says when it goes through Tor. See [Matrix](#matrix)."),
      mark("**XMPP accounts in Erevos**: sign a space in to XMPP, under Settings → Relay and networks → XMPP, and chat with people who use Conversations, Monal, Gajim, Dino or another XMPP app, encrypted with OMEMO. These chats are not anonymous, and say so: the XMPP server sees who talks with whom. Text with delivery and read marks, photos and files, in the home list under an XMPP chip of its own, and through Tor on Android as you chose. See [XMPP](#xmpp)."),
      mark("**Voice and video calls with people on XMPP**: the two tiles at the top of an XMPP chat call the person, and their calls ring on the same screen as Erevos's own, with apps that call as Conversations does. The call goes through your call relay or the XMPP server's, so they do not learn your address; the key that proves it passes through the XMPP servers, which could put themselves in between. See [XMPP](#xmpp)."),
      mark("**Voice and video calls with people on Matrix**: on Android, the two tiles at the top of a Matrix chat call with Element Call, the call app of Element and Element X, which opens inside Erevos in a window of its own, and their calls ring here as Erevos's own do. Sound and picture are end-to-end encrypted and go through the media server your Matrix server names, never through Tor. See [Matrix](#matrix)."),
      mark("**Voice and video calls with people on Matrix, in the web app and on a computer**: the two tiles at the top of a Matrix chat call with Element Call there too, as on Android, over the app; its back arrow makes it small in a corner, so you can keep using Erevos during the call. Element Call runs apart from Erevos and can read nothing of it. See [Matrix](#matrix)."),
      mark("**Chats with people on other Nostr apps**: give a space a Nostr key of its own, under Settings → Relay and networks → Nostr chats, and chat with people who use Damus, Amethyst, Primal, 0xchat or another Nostr app, one to one or in groups, encrypted as NIP-17 asks: the relays see whom a message is for, not who wrote it. These chats are not anonymous, and say so: your key is the same to everyone you write to. Text, photos, files and reactions, in the home list under a Nostr chip of its own, and through Tor on Android as you chose. See [Chats with other Nostr apps](#nostr-chats)."),
      mark("**Notices for Matrix, XMPP and Nostr messages**: a message in a chat on Matrix, XMPP or Nostr shows a notice and counts in the number on Erevos's icon, as in Erevos's own chats. On Android, Notifications at the bottom of such a chat mutes it or gives it a sound of its own, and an XMPP or Matrix call rings with its chat's ringtone. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats)."),
      mark("**A closed space tells of Matrix messages**: on Android, Say a message came under While this space is closed, on the Matrix screen, has a closed space say \"New message\" when something comes on Matrix while another space is open, never what, from whom or in which chat. Off until you choose it. The Matrix server then tells the space's relay of each message, with no words in it: it learns the relay's address, and the relay when messages come. See [Matrix](#matrix)."),
      mark("**Made with others' open source**: About Erevos, and the guide, now name the open-source projects Erevos is built on, with their makers and their licences. See [What Erevos is](#about)."),
      mark("**Groups on XMPP**: under Settings → Relay and networks → XMPP, make a private group with your contacts, encrypted with OMEMO for every member as Conversations' private groups are, or join a group by its address, and answer invitations to groups. A group that is not private, a channel, is not encrypted, and says so. Your groups follow your account's other XMPP apps, and a channel tells only of messages that name you. See [XMPP](#xmpp)."),
      mark("**More in Matrix chats**: hold a message to react to it, reply to it, copy it and, if it is yours, edit it or delete it for everyone. Load earlier messages brings in older ones, and the microphone under the message box sends voice messages that Element plays too. Reactions are not encrypted, as Element sends them. See [Matrix](#matrix)."),
      mark("**Video added to an XMPP call**: in a voice call with someone on XMPP, either of you can turn on video with Add video; the other is asked first and can say Not now. It works with apps that add video to a call as Conversations does. See [XMPP](#xmpp)."),
      mark("**Voice messages and replies in Nostr chats**: hold the microphone under the message box to send a voice message, which plays with Play; hold a message to reply to it, and the answer shows the message it is to, here and in other Nostr apps. See [Chats with other Nostr apps](#nostr-chats)."),
      mark("**OMEMO 2 in XMPP chats**: a message to someone whose app speaks OMEMO 2, as Kaidan does, now goes with OMEMO 2 to that app and with OMEMO 0.3 to their others, as before. The XMPP screen shows this device's key both ways, to compare with what each app shows. See [XMPP](#xmpp)."),
      mark("**Hidden chats can have their own Matrix, XMPP and Nostr accounts**: under the list of a place of hidden chats, Matrix, XMPP and Nostr open an account of that place alone, apart from the space's, kept encrypted with the hidden chats' key. Its chats show among the hidden chats only. It connects while they are open, and while they are closed too if Receive while closed is on, as the hidden chats do: then a message says only \"New message\", and a call rings with no name and is answered with the PIN. See [Hidden chats](#hidden)."),
      mark("**Matrix, XMPP and Nostr in backups**: a backup now holds the Matrix, XMPP and Nostr accounts of every space and of its hidden chats. After a restore, a Nostr key comes back with its chats as they were; an XMPP account goes on as a new device of the account, with its contacts and chats; a Matrix account is let go of on this phone, and the space signs in again as a new device; its Security Key opens the messages from before. See [Backups](#backup)."),
      mark("**Matrix voice messages show their waveform, and Nostr answers can be photos**: a voice message sent in a Matrix chat carries its waveform, which Element draws, and one that comes with a waveform shows it under Play; in a Nostr chat, a photo, file or voice message sent while a message shows over the message box answers it. See [Matrix](#matrix) and [Chats with other Nostr apps](#nostr-chats)."),
      mark("**Group calls in XMPP groups**: in a private XMPP group, start a voice or video call, answer one that rings, or join one going on, together with people who use Dino. See [XMPP](#xmpp)."),
      mark("**Spam SMS come quietly**: on Android, an SMS that the spam filter's own words catch, a link with words that try to fool from a number that is no contact and that you never answered, still goes to Spam but no longer shows a notice or makes a sound. Spam by your own words and rules still shows one, as they stay encrypted in the space; with the Spam filter off, every SMS does. See [SMS](#sms)."),
      mark("**Check a contact in person with QR codes**: under Safety number in a chat's details, each phone shows a code; take a photo of the code on the other phone, and they of yours. When it matches, the contact is marked Checked in person. Nothing is sent. See [Chat through a relay](#relay)."),
      mark("**Up to three home relays**: under Settings → Relay and networks → Home relay, Add another home relay gives a space up to two more, each with a queue of its own. Your contact link and your messages name them in order, and contacts try each while the ones before cannot be reached. See [Home relay](#home-relay)."),
      mark("**Introduce two of your contacts**: in a contact's chat details, Introduce to a contact asks them and another contact of yours, each in your chat with them. Only if both say yes do they become contacts, and neither learns whether the other said no. See [Chat through a relay](#relay)."),
      mark("**Encrypted SMS when nothing else works, if you choose**: on Android, when the relay, Nostr, the phones nearby and LoRa all fail, a text to an Erevos contact whose number is linked can go by SMS, end-to-end encrypted, hidden from their SMS app. Off until you turn it on, for all such contacts under Settings → Phone and SMS → SMS, or for one in a chat's Details. It costs SMS (3 for a short text, up to 10 for a longer one), and the phone company sees who wrote to whom, and when. Both phones need Erevos as the SMS app. See [SMS](#sms)."),
      mark("**Your backup password in pieces with friends**: under Settings → Data and devices → Backup pieces, give pieces of it to 3 to 5 contacts; any 2 or 3 of them give it back, one alone shows nothing. Each goes inside the encryption of your chat with them and only their Erevos keeps it; your phone keeps none. See [Backup pieces with friends](#backup-pieces)."),
      mark("**Panic button**: under Settings → Privacy and security → Panic button, wipe everything Erevos keeps here with one tap, on Android and in the web app. On Android, a panic app such as Ripple can do it too, but only the one you say yes to, checked by its signature. See [Panic button](#panic)."),
      mark("**Answer a hidden call with Answer**: on the \"Incoming call\" screen with no name that a call to your hidden chats brings, **Answer** now asks for the PIN, as the small sign does, and the right PIN answers the call; before, it could not connect, and only the small sign could. See [Hidden chats](#hidden)."),
      mark("**Erevos to a phone nearby, with no internet**: under Settings → General → Give Erevos to a phone nearby, this phone serves its Erevos over the same Wi-Fi or its hotspot for ten minutes, with a QR code. A phone without Erevos downloads it in the browser; one with an older Erevos takes it under Updates → From a phone nearby, which installs it only when it is Erevos, signed as that one is. See [Erevos to a phone nearby](#give-app)."),
      mark("**Hidden chats with phones nearby**: while hidden chats are open, or receive while closed, they reach a contact's phone nearby over Bluetooth, Wi-Fi Aware, Wi-Fi Direct or the same Wi-Fi, with no internet, as your other chats do. The space never learns that a hidden contact is near, and nothing on the air tells their messages from the space's; other phones never carry them, and they never go over LoRa or by SMS. See [Hidden chats](#hidden)."),
      mark("**The same Wi-Fi on Sailfish OS**: Erevos on Sailfish OS finds Erevos phones and computers on the same Wi-Fi or a phone's hotspot and talks with them with no internet, as on a computer. See [On Sailfish OS](#sailfish)."),
    ],
    underTheHood: [
      mark("**Pieces of photos through Nostr stay with their chats**: while a photo that comes through Nostr waits for the rest of its pieces, they are now kept encrypted with the space or the hidden chats they came for, no longer apart where they could be counted, so nothing outside a hidden chats' password says that a photo is on its way to them. Pieces kept before go to the first chats whose photo they are, or after four days. See [Through Nostr](#nostr)."),
      mark("**A relay restart no longer brings a false notice**: after your relay restarted, a hidden chat or a closed space said New message once more for messages it had told of already. Your relay needs an update for it. See [Hidden chats](#hidden)."),
      mark("**The spam filter reads words as they look**: a scam text that swaps a letter for a look-alike of another alphabet, or hides a mark that shows nothing inside a word, no longer gets past it. See [SMS](#sms)."),
      mark("**A contact you delete no longer comes back from an old ask**: in a group, a member you asked for their contact link, or who asked for yours, and whom you then deleted as a contact before Erevos looked at the relay again, could be added again by that old ask. Deleting them now lets go of it at once. See [Group chats](#groups)."),
      mark("**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden)."),
      mark('**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.'),
      mark('**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).'),
      mark('**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).'),
      mark('**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).'),
      mark('**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).'),
      mark('**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).'),
      mark('**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).'),
      mark("**A closed space tells of its contacts' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts' queues too, up to 64. See [Chat through a relay](#relay)."),
      mark("**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it."),
      mark("**Calls ring as they should**: with Do Not Disturb only when their notice may break through, with a phone's clock off too once the relay is updated, and to the end on Android 7 and 8; a second call is told busy, and a ring stops only for its own call. See [Chat through a relay](#relay)."),
      mark('**Hidden calls**: one turned down no longer leaves Erevos over the lock screen, one that comes while the password screen shows comes over it, and none rings twice. See [Hidden chats](#hidden).'),
      mark('**Notices come again at once after a change of network**, and receiving starts again as Erevos shows when Android refused it. See [Chat through a relay](#relay).'),
      mark("**Hidden chats' notices tell each message once**: what came since a place last looked is told as it closes, a call that rang is not told again as a message, and a place whose queue the relay lost keeps its switch on. See [Hidden chats](#hidden)."),
      mark('**Hidden chats close while Erevos is away**, after 30 seconds, so a call to them meanwhile rings with their PIN to answer. See [Hidden chats](#hidden).'),
      mark('**A voice message counts once**, on its last part, also when it goes again whole.'),
      mark('**The number on the icon counts only what is still there**: a message deleted for everyone, or read on a linked computer, no longer counts. See [Chat through a relay](#relay).'),
      mark('**Messages sent for later** tell of themselves only while their space is open, without sound if sent so.'),
      mark('**SMS**: one to the chat on screen only sounds there, they are marked read only while their screen shows, and Android names their notices SMS. See [SMS](#sms).'),
      mark("**Reminders**: one seen in Chat with myself goes from the notice, a hidden place's go with a new PIN, and birthdays come at 9:00. See [Getting started](#start)."),
      mark('**Nostr reads as soon as Tor is ready.** See [Through Nostr](#nostr).'),
      mark("**Erevos's notices show its mark** in the status bar."),
      mark('**Notices are asked for with receiving off too**, when Say a message came is on.'),
      mark('**Test versions before a release**: Erevos reads a version such as 4.0.0-rc.1, a test version that comes before 4.0.0, when it looks for updates, tells of a new version and shows what is new. See [Updates](#updates).'),
      mark('**A call to a slow phone rings in full**: the caller now waits up to a minute and a quarter for the other phone to say it rings, and then 45 seconds from then, so a call that reached it late no longer rings there only to stop at once; and the phone called reads a call before anything it has to send, and waits for calls again at once after its network changes. See [Chat through a relay](#relay).'),
      mark("**The web app and the computer reach Matrix, XMPP and Nostr servers over HTTPS**: their page policy allowed only WebSocket connections, so Matrix sign-in, XMPP server discovery and file sharing, and Nostr files and name lookups failed there. They work now. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats)."),
      mark("**Bluetooth that cannot be followed**: the random number your phone sends out over Bluetooth for phones nearby to find it changed only when Erevos started again; it now changes every nine to twelve minutes, so someone listening cannot follow your phone from place to place by it. Older Erevos phones still find yours. See [Chat with a nearby phone](#nearby)."),
      mark("**Downloads stop at 100 MB**: a file, a backup from a server or any other download is read as it comes and stopped as soon as it passes 100 MB, or less where the network's files are smaller, such as 20 MB for Nostr files, so a file server a contact names can no longer fill the phone's memory with an answer without end. A backup on a server comes back up to 100 MB; download a larger one and open it with Restore a backup. See [Backups](#backup)."),
      mark("**Hidden chats show at once**: as the PIN opens them, their chats and contacts show at once, to read, while what they were receiving in the background ends; before, that could hold them back a long while, as it may go through Tor. See [Hidden chats](#hidden)."),
    ],
  },
  {
    version: '3.4.2',
    forYou: [
      mark('**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.'),
    ],
    underTheHood: [
      mark('**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.'),
      mark('**What you read as a chat opens stays read**: the home screen no longer counts it as new.'),
      mark('**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).'),
    ],
  },
  {
    version: '3.4.1',
    forYou: [
      mark('**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.'),
    ],
    underTheHood: [
      mark('**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.'),
      mark('**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).'),
    ],
  },
  {
    version: '3.4.0',
    forYou: [
      mark('[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.'),
      mark("**What's new**: this list, in Settings → General, by version."),
      mark("**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat."),
      mark("**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden)."),
      mark("**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden)."),
      mark("**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden)."),
      mark("**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden)."),
      mark("**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden)."),
      mark("**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden)."),
      mark("**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden)."),
      mark("**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy)."),
      mark("**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts)."),
      mark("**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls."),
    ],
    underTheHood: [
      mark('**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.'),
      mark("**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through."),
      mark("**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it."),
    ],
  },
  {
    version: '3.3.2',
    forYou: [
      mark('**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.'),
    ],
    underTheHood: [],
  },
  {
    version: '3.3.1',
    forYou: [
      mark('**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.'),
    ],
    underTheHood: [],
  },
  {
    version: '3.3.0',
    forYou: [
      mark('**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.'),
      mark('**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.'),
      mark('**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.'),
      mark('**A new handset** on the green tiles: Phone, and the call in a chat.'),
      mark('**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.'),
      mark('**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.'),
      mark('**A phone call button** in Erevos chats and SMS chats.'),
    ],
    underTheHood: [
      mark('**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.'),
      mark('**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.'),
      mark('**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.'),
      mark('**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.'),
    ],
  },
  {
    version: '3.2.1',
    forYou: [
      mark('**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.'),
      mark('**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.'),
      mark('**Coloured call buttons** at the top of a chat: video blue, voice green.'),
    ],
    underTheHood: [],
  },
  {
    version: '3.2.0',
    forYou: [
      mark('Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.'),
      mark('Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.'),
      mark('Dogs instead of cats in the stickers.'),
      mark('Screenshots: a switch in Settings → Privacy and security.'),
      mark('Hidden chats from New chat: hold it for a second.'),
      mark('Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.'),
      mark('**Chat with myself**, always first, and **Remind me**, the orange bell.'),
      mark('**Media, links and files** in a chat’s Details, with a calendar and Go to a day.'),
      mark('Import a chat from inside the chat: Details → Imported chats.'),
      mark('A closed space can say that a message came while another space is open.'),
      mark('The message menu says when a message went or came through Nostr.'),
      mark('**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.'),
      mark('Who makes Erevos and why, in About Erevos; the guide says why everywhere.'),
    ],
    underTheHood: [],
  },
  {
    version: '3.1.2',
    forYou: [
      mark('**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.'),
    ],
    underTheHood: [],
  },
  {
    version: '3.1.1',
    forYou: [],
    underTheHood: [
      mark('Check for updates says what stopped an update.'),
      mark('Invite someone is not made from a token for all; it asks you to sign in to the relay first.'),
      mark('The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).'),
      mark('A relay that refuses through Tor says why.'),
    ],
  },
  {
    version: '3.1.0',
    forYou: [
      mark('Hidden chats by holding New chat.'),
      mark('A search for contacts on the Phone.'),
      mark('New chat shows first how to add a contact.'),
      mark('Erevos in other apps’ Share.'),
      mark('A sound for every new message, also while Erevos shows.'),
    ],
    underTheHood: [
      mark('Less battery in the background: the relay, Tor and the nearby radios.'),
      mark('Erevos no longer closes when you make a sticker from a photo.'),
      mark('Hidden chats’ notices are right.'),
      mark('A call shows over the screen saver, and the screen wakes.'),
      mark('The SMS settings say right what holding does.'),
    ],
  },
  {
    version: '3.0.0',
    forYou: [
      mark('Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.'),
      mark('**Messages through Tor by default**: Messages, Everything or Nothing.'),
      mark('**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.'),
    ],
    underTheHood: [],
  },
  {
    version: '2.0.3',
    forYou: [
      mark('One invite for everything: the relay and the contact together.'),
      mark('Spam rules for senders and numbers abroad, with the reason.'),
      mark('480 stickers in 20 sets.'),
      mark('Copy code for one-time codes in SMS.'),
    ],
    underTheHood: [
      mark('Lighter chats on older phones; QR codes at once.'),
      mark('Locked, Erevos keeps receiving.'),
      mark('Faster contacts; the hidden chats’ notice counts only messages.'),
      mark('The relay tries every address: push, other relays, the LPHL sign-in.'),
    ],
  },
  {
    version: '2.0.2',
    forYou: [
      mark('The icons fill the launcher’s shape.'),
    ],
    underTheHood: [
      mark('Swiping on the tabs only changes the tab.'),
    ],
  },
  {
    version: '2.0.1',
    forYou: [
      mark('Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.'),
      mark('A colour for each icon, and the order of the widget’s buttons.'),
      mark('Swipe to go back, and between tabs.'),
    ],
    underTheHood: [],
  },
  {
    version: '2.0.0',
    forYou: [
      mark('A new contact can take the name of a contact on the phone.'),
      mark('**Sign in to the relay with LPHL**, and **invites to the relay**.'),
      mark('Permissions in the web app, and more on Android; the web app’s notice says how many came.'),
      mark('Hidden chats can ring calls while they are closed.'),
      mark('A new chat screen; QR codes from a photo; the Phone for small screens.'),
      mark('Add as contact inside a group.'),
      mark('Stickers in sets, moving, and your own.'),
      mark('SMS inside the Erevos chat.'),
      mark('An F-Droid build; Serbo-Croatian; new version numbers.'),
    ],
    underTheHood: [
      mark('An update of the WebView no longer closes Erevos.'),
      mark('Deleting or blocking a contact gives you a new queue on the relay.'),
      mark('New keys every month in chats, every week in groups.'),
      mark('Linked devices work with the phone off.'),
      mark('Android updates need the release computer’s signature.'),
      mark('Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.'),
    ],
  },
  {
    version: '0.1.16',
    forYou: [
      mark('Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.'),
      mark('A phone without a relay talks through a place on a contact’s relay.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.14',
    forYou: [
      mark('Back to my chats, for hidden chats.'),
    ],
    underTheHood: [
      mark('Erevos receives and rings even after you swipe it away from the recent apps.'),
    ],
  },
  {
    version: '0.1.12',
    forYou: [
      mark('Hidden chats can say a message came.'),
    ],
    underTheHood: [
      mark('Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.'),
    ],
  },
  {
    version: '0.1.11',
    forYou: [
      mark('The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.10',
    forYou: [
      mark('Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.8',
    forYou: [
      mark('61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.7',
    forYou: [
      mark('SMS notices in the background.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.6',
    forYou: [],
    underTheHood: [
      mark('The web app comes out with every release.'),
    ],
  },
  {
    version: '0.1.5',
    forYou: [
      mark('Greek in the whole app.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.4',
    forYou: [
      mark('Web Push in the web app.'),
    ],
    underTheHood: [],
  },
  {
    version: '0.1.2',
    forYou: [
      mark('The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.'),
    ],
    underTheHood: [],
  },
];

/**
 * The list as the version that runs (`running`) shows it: NEXT under `running`'s number when it
 * comes after the last release, else (a build of main for testing) with no number, then every
 * release.
 */
export function whatsNewFor(running: string): (Changes & { version: string | null })[] {
  const released = VERSIONS[0]?.version ?? '0';
  const pending = NEXT.forYou.length + NEXT.underTheHood.length > 0;
  const next = pending && !VERSIONS.some((v) => v.version === running) ? [{ version: laterThan(running, released) ? running : null, ...NEXT }] : [];
  return [...next, ...VERSIONS];
}
