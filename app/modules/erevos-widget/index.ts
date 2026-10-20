import { requireOptionalNativeModule } from 'expo-modules-core';

// Erevos's widget on the phone's home screen, for Android (the module's manifest): Phone, SMS,
// Messages and Contacts, each with how many are new, never who or what. It counts again as calls,
// SMS and messages come, and as Erevos goes to the background (app/_layout.tsx), when what was
// read there is no longer new. On other platforms, and in an app built before this module, there
// is none, and refreshWidget does nothing.

type Native = { refresh(): void };

const native = requireOptionalNativeModule<Native>('ErevosWidget');

/** Has the widget count again, if it is on the home screen. */
export function refreshWidget(): void {
  try {
    native?.refresh();
  } catch {
    // The widget counts again when the next call, SMS or message comes.
  }
}
