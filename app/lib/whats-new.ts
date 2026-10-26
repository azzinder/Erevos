import { mark } from './i18n';

// What's new (Settings → General → What's new, app/whats-new.tsx): what each version changed, in
// short, newest first, by its number alone, as CHANGELOG.md tells it in full. The words are
// English, shown with t(); i18n/<lang>/whats-new.ts has them in each language. **Bold** and
// [links](#guide-section) are written as in the guide. NEXT is what is on main and not out yet: it
// shows under the number of the version that runs. After a release its words move into a new
// entry of VERSIONS under the release's number; checks/whats-new.check.ts holds VERSIONS to the
// releases of CHANGELOG.md.

export type WhatsNew = { version: string; items: string[] };

export const NEXT: string[] = [
  mark('**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.'),
  mark('[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.'),
  mark("**What's new**: this list, in Settings → General, by version."),
  mark("**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through."),
  mark("**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat."),
  mark("**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it."),
  mark("**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden)."),
  mark("**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden)."),
  mark("**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden)."),
  mark("**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden)."),
  mark("**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden)."),
  mark("**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden)."),
  mark("**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden)."),
  mark("**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy)."),
];

export const VERSIONS: WhatsNew[] = [
  {
    version: '3.3.2',
    items: [
      mark('**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.'),
    ],
  },
  {
    version: '3.3.1',
    items: [mark('**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.')],
  },
  {
    version: '3.3.0',
    items: [
      mark('**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.'),
      mark('**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.'),
      mark('**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.'),
      mark('**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.'),
      mark('**A new handset** on the green tiles: Phone, and the call in a chat.'),
      mark('**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.'),
      mark('**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.'),
      mark('**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.'),
      mark('**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.'),
      mark('**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.'),
      mark('**A phone call button** in Erevos chats and SMS chats.'),
    ],
  },
  {
    version: '3.2.1',
    items: [
      mark('**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.'),
      mark('**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.'),
      mark('**Coloured call buttons** at the top of a chat: video blue, voice green.'),
    ],
  },
  {
    version: '3.2.0',
    items: [
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
  },
  {
    version: '3.1.2',
    items: [
      mark('**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.'),
    ],
  },
  {
    version: '3.1.1',
    items: [
      mark('Check for updates says what stopped an update.'),
      mark('Invite someone is not made from a token for all; it asks you to sign in to the relay first.'),
      mark('The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).'),
      mark('A relay that refuses through Tor says why.'),
    ],
  },
  {
    version: '3.1.0',
    items: [
      mark('Less battery in the background: the relay, Tor and the nearby radios.'),
      mark('Erevos no longer closes when you make a sticker from a photo.'),
      mark('Hidden chats’ notices are right.'),
      mark('Hidden chats by holding New chat.'),
      mark('A search for contacts on the Phone.'),
      mark('New chat shows first how to add a contact.'),
      mark('A call shows over the screen saver, and the screen wakes.'),
      mark('Erevos in other apps’ Share.'),
      mark('A sound for every new message, also while Erevos shows.'),
      mark('The SMS settings say right what holding does.'),
    ],
  },
  {
    version: '3.0.0',
    items: [
      mark('Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.'),
      mark('**Messages through Tor by default**: Messages, Everything or Nothing.'),
      mark('**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.'),
    ],
  },
  {
    version: '2.0.3',
    items: [
      mark('One invite for everything: the relay and the contact together.'),
      mark('Spam rules for senders and numbers abroad, with the reason.'),
      mark('480 stickers in 20 sets.'),
      mark('Lighter chats on older phones; QR codes at once.'),
      mark('Copy code for one-time codes in SMS.'),
      mark('Locked, Erevos keeps receiving.'),
      mark('Faster contacts; the hidden chats’ notice counts only messages.'),
      mark('The relay tries every address: push, other relays, the LPHL sign-in.'),
    ],
  },
  {
    version: '2.0.2',
    items: [mark('Swiping on the tabs only changes the tab.'), mark('The icons fill the launcher’s shape.')],
  },
  {
    version: '2.0.1',
    items: [
      mark('Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.'),
      mark('A colour for each icon, and the order of the widget’s buttons.'),
      mark('Swipe to go back, and between tabs.'),
    ],
  },
  {
    version: '2.0.0',
    items: [
      mark('An update of the WebView no longer closes Erevos.'),
      mark('Deleting or blocking a contact gives you a new queue on the relay.'),
      mark('A new contact can take the name of a contact on the phone.'),
      mark('**Sign in to the relay with LPHL**, and **invites to the relay**.'),
      mark('Permissions in the web app, and more on Android; the web app’s notice says how many came.'),
      mark('Hidden chats can ring calls while they are closed.'),
      mark('New keys every month in chats, every week in groups.'),
      mark('Linked devices work with the phone off.'),
      mark('A new chat screen; QR codes from a photo; the Phone for small screens.'),
      mark('Add as contact inside a group.'),
      mark('Stickers in sets, moving, and your own.'),
      mark('SMS inside the Erevos chat.'),
      mark('Android updates need the release computer’s signature.'),
      mark('An F-Droid build; Serbo-Croatian; new version numbers.'),
      mark('Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.'),
    ],
  },
  {
    version: '0.1.16',
    items: [
      mark('Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.'),
      mark('A phone without a relay talks through a place on a contact’s relay.'),
    ],
  },
  {
    version: '0.1.14',
    items: [mark('Back to my chats, for hidden chats.'), mark('Erevos receives and rings even after you swipe it away from the recent apps.')],
  },
  {
    version: '0.1.12',
    items: [mark('Hidden chats can say a message came.'), mark('Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.')],
  },
  {
    version: '0.1.11',
    items: [mark('The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.')],
  },
  {
    version: '0.1.10',
    items: [mark('Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.')],
  },
  {
    version: '0.1.8',
    items: [
      mark('61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.'),
    ],
  },
  { version: '0.1.7', items: [mark('SMS notices in the background.')] },
  { version: '0.1.6', items: [mark('The web app comes out with every release.')] },
  { version: '0.1.5', items: [mark('Greek in the whole app.')] },
  { version: '0.1.4', items: [mark('Web Push in the web app.')] },
  {
    version: '0.1.2',
    items: [
      mark('The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.'),
    ],
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
export function whatsNewFor(running: string): { version: string | null; items: string[] }[] {
  const released = VERSIONS[0]?.version ?? '0';
  const next = NEXT.length > 0 && !VERSIONS.some((v) => v.version === running) ? [{ version: laterThan(running, released) ? running : null, items: NEXT }] : [];
  return [...next, ...VERSIONS];
}
