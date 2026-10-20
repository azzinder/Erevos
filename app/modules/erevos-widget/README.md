# erevos-widget

Expo native module for Erevos's widget on the phone's home screen. Android only. Written without an Android SDK:
it has been compiled against Android's framework classes, not built into the app or run yet.

## What it does

- **Four buttons.** Phone, SMS, Messages and Contacts, each opening Erevos at that screen (erevos://phone,
  erevos://?show=sms, erevos://?show=erevos, erevos://contacts), behind its password like any link
  (app/+native-intent.ts), except the Phone when it may open without it. With missed calls, Phone opens Recents.
- **How many are new.** Over each of the first three, a count: the missed calls Android's call history marks new,
  the unread SMS and MMS in Android's own store, and the Erevos messages the messages notice counts
  (erevos-call Notices.kt keeps it in the `erevos-widget` preferences). Never who, or what they say. A count shows
  only while Android lets Erevos read what it counts.
- **When it counts.** As the widget is added and every 30 minutes (Android's update), and when told to
  (`refresh()`, or the `expo.modules.erevoswidget.REFRESH` broadcast the other modules send it by its class
  name): as an SMS comes, a call ends, missed calls are seen, the messages notice changes, and Erevos goes to the
  background.
- **In the app's language.** Its words follow Erevos's language (the `erevos-lang` preferences); the widget's name
  in the phone's list of widgets follows the phone's.
