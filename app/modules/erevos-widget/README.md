# erevos-widget

Expo native module for Erevos's widget on the phone's home screen. Android only. Built into the Android app.

## What it does

- **Four buttons.** Phone, SMS, Messages and Contacts, from left to right in the order the owner chose (Appearance →
  Widget, `order()`/`setOrder()`, kept as `order` in the `erevos-widget` preferences; the layout has four places
  that each draw whichever button sits there), each opening Erevos at that screen (erevos://phone,
  erevos://?show=sms, erevos://?show=erevos, erevos://contacts), behind its password like any link
  (app/+native-intent.ts), except the Phone when it may open without it. With missed calls, Phone opens Recents.
- **How many are new.** Over Phone, SMS and Messages, wherever they sit, a count: the missed calls Android's call history marks new,
  the unread SMS and MMS in Android's own store, and the Erevos messages the messages notice counts
  (erevos-call Notices.kt keeps it in the `erevos-widget` preferences). Never who, or what they say. A count shows
  only while Android lets Erevos read what it counts.
- **When it counts.** As the widget is added and every 30 minutes (Android's update), and when told to
  (`refresh()`, or the `expo.modules.erevoswidget.REFRESH` broadcast the other modules send it by its class
  name): as an SMS comes, a call ends, missed calls are seen, the messages notice changes, and Erevos goes to the
  background.
- **In the app's language.** Its words follow Erevos's language (the `erevos-lang` preferences); the widget's name
  in the phone's list of widgets follows the phone's.
- **A number on each launcher icon** (`IconNumbers.kt`), where the launcher takes one for each icon: Huawei's and
  Honor's (`change_badge` on their `…launcher.settings/badge/` provider, with the alias's class name; their
  `CHANGE_BADGE` permission). Each time the widget counts, with or without a widget on the home screen, the icon of
  Erevos that is on gets the messages count, SMS's the unread SMS and MMS, Phone's the missed calls, Contacts's 1
  while the birthday notice shows (erevos-contacts sends `REFRESH` as it comes and goes, erevos-icons after a colour
  or the calculator changes); icons that are off, and the calculator, get 0. Told only to that launcher, a system
  app that is the default home, and only what changed since (the `erevos-icon-numbers` preferences), with the icons
  that are on told again once per start. `setIconNumbers(on)` follows Number on the icon (lib/icon-number.ts); off, every icon gets 0. Every
  other launcher known gives a notice to the app, not to one icon (Launcher3 and Kvaesitso look it up by package,
  Samsung's and Xiaomi's count the app's notices): there nothing is told, and each notice shows on all four icons.
