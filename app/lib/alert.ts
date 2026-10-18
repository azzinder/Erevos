import { Alert, Platform, type AlertButton } from 'react-native';

// Questions with buttons, as Alert.alert asks them on the phone. The web build has no Alert with
// buttons (react-native-web's does nothing), so there the app's own sheet asks them
// (components/alert-host.tsx), on a computer too.

export type Question = { title: string; message: string; buttons: AlertButton[] };

let host: ((question: Question) => void) | null = null;

/** The sheet that asks on the web, set while it is shown. */
export function setAlertHost(next: ((question: Question) => void) | null): void {
  host = next;
}

export function ask(title: string, message: string, buttons: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  host?.({ title, message, buttons });
}

/** Asks whether to go on with `action`, a destructive one. True if the owner chose it. */
export function confirm(title: string, message: string, action = title): Promise<boolean> {
  return new Promise((resolve) => {
    ask(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
