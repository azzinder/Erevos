import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

// The address of an invite by SMS (TEXT_INVITE_PAGE in lib/text-invite.ts). The page of its own
// there (pwa/i/) opens it, but a web app whose worker came before that page serves the app at
// /i instead, until every Erevos window is closed: so the app takes the invite from the address
// bar itself, on to the screen that asks before it joins.
export default function InviteAddress() {
  const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  return <Redirect href={hash ? { pathname: '/text-invite', params: { d: hash } } : '/'} />;
}
