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
- **Changes elsewhere.** `watch()` sends `onContactsChanged` when Android's contacts change.

## JS API

See `index.ts`.
