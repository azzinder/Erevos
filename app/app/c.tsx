import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

// The address of a contact page (CONTACT_PAGE in lib/contact-code.ts). The page of its own there
// (pwa/c/) opens it, but a web app whose worker came before that page serves the app at /c
// instead, until every Erevos window is closed: so the app takes the link from the address bar
// itself, on to the screen that asks before it adds.
export default function ContactAddress() {
  const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  const fields: Record<string, string> = {};
  for (const pair of hash.split('&')) {
    const at = pair.indexOf('=');
    if (at <= 0) continue;
    try {
      fields[pair.slice(0, at)] = decodeURIComponent(pair.slice(at + 1).replace(/\+/g, ' '));
    } catch {
      // A field that does not read is left out: the screen says when the link is not one.
    }
  }
  return <Redirect href={fields.key ? { pathname: '/contact', params: fields } : '/'} />;
}
