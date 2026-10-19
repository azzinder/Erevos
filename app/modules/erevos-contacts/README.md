# erevos-contacts

Expo native module for the phone's contacts. Android only. Written without an Android SDK: it has been
compiled against Android 16's framework classes, not built into the app or run yet.

## What it does

- **The phone's contacts.** `all()` and `one()` read Android's own contacts (ContactsContract): each contact
  with its numbers, emails, addresses, note, birthday, company and job title, groups, star, photo and
  ringtone, from every raw contact (account) it is kept in. The same value kept in two accounts is given
  once, with all its rows.
- **Changing them.** `save()` takes a contact as JSON and changes it row by row in one batch: an entry
  without rows is inserted, an entry with rows updates the first and deletes the rest, and a row of the
  contact no entry names is deleted. Rows Erevos does not show (another app's own, a middle name) are not
  touched. A new contact is a raw contact in the account named, or on the phone only.
- **Favourites.** Android's STARRED, which every phone app lists.
- **Groups.** Android's own groups (ContactsContract.Groups), with how many contacts are in each; those
  Android fills itself (an account's "My Contacts", the starred) are left out. A contact joins a group in
  its raw contact of the group's account (a GroupMembership row there), as an account's sync keeps only its
  own groups; `addToGroup()` is false when it has none in that account.
- **Photos.** `photo()` gives a contact's thumbnail or its large photo; `setPhoto()` writes the bytes in a Photo
  row of its main raw contact (the one its name is from), which Android turns into its large photo and thumbnail at
  once, and makes it the one shown (super primary). No bytes take away its photos in every account.
- **Ringtones.** `pickRingtone()` opens Android's ringtone picker (RingtoneManager) for a contact and keeps what is
  picked as its CUSTOM_RINGTONE at once, which the phone plays when it calls; the picker's Default clears it.
  `ringtoneName()` is a ringtone's title.
- **QR codes.** `readQr()` reads the QR code in a photo (a file:// or content:// address) with ZXing's core (the one
  dependency), at most 1600 points wide, as UTF-8 when the code does not say; nothing leaves the phone.
- **Merging.** The fields are merged in JS and saved into the contact kept; `takeOver()` then gives it the others'
  photo and ringtone when it has none, their star and their groups (in its own accounts), and deletes the others.
- **Birthday reminders.** `setBirthdays()` turns them on or off (off at first). An alarm (not exact) goes off each
  morning at 9:00, set again on BOOT_COMPLETED, MY_PACKAGE_REPLACED, TIME_SET and TIMEZONE_CHANGED (BirthdayReceiver),
  and a notice names whose birthday it is (29 February on the 28th in other years), private on the lock screen; a
  morning missed with the phone off is told once it is on, that day. Only Android's contacts.
- **The SIM.** `simContacts()` reads the SIM cards' phone books (ADN): every SIM's with its slot on Android 12 and
  later (SimPhonebookContract), the main SIM's before (content://icc/adn).
- **Calls.** `calls()` gives the latest calls with a contact's numbers from the phone's call log (CallLog), the newest
  first, a row matching by its last ten digits; it needs READ_CALL_LOG, asked for on a contact's card. Shown only.
- **Other apps.** ContactIntentActivity takes INSERT (a new contact with the extras and DATA rows another app gives),
  INSERT_OR_EDIT (the contacts, to choose one to add them to), EDIT, VIEW and QUICK_CONTACT (a contact's address,
  by lookup key, id, raw contact or row), and opens the screen for it by an erevos:// link, behind the app's lock,
  giving no answer back. PickContactActivity answers PICK and GET_CONTENT for a contact, a number, an email or an
  address with a list of its own (framework views, in the app's language), and gives back the address of the one
  tapped with a read grant for it.
- **Changes elsewhere.** `watch()` sends `onContactsChanged` when Android's contacts change.

## JS API

See `index.ts`.
