import { mark } from './i18n';

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
    mark("**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings \u2192 Notifications \u2192 Number on the icon turns it off. See [Chat through a relay](#relay)."),
    mark('**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).'),
    mark('**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).'),
    mark('**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).'),
    mark('**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).'),
    mark('**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).'),
    mark("**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone)."),
    mark("**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay)."),
    mark('**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).'),
    mark("**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay)."),
    mark("**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on. See [Chat through a relay](#relay)."),
    mark("**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text only, for now. See [Matrix](#matrix)."),
  ],
  underTheHood: [
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
  ],
};

export const VERSIONS: WhatsNew[] = [
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

/** A version's numbers, for comparing: "3.10.0" comes after "3.9.1". */
function numbers(version: string): number[] {
  return version.split('.').map((n) => Number.parseInt(n, 10) || 0);
}

/** Whether `a` comes after `b`. */
export function laterThan(a: string, b: string): boolean {
  const x = numbers(a);
  const y = numbers(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

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
