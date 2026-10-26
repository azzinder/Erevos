import { router, useLocalSearchParams } from 'expo-router';

import { GroupChat } from '../components/group-chat';

// A group of the space, on its own screen (components/group-chat.tsx). `at`: the tag of a message
// to go to, starred or found.

/** Back to the screen before, or home when the group was opened first. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function GroupScreen() {
  const { id = '', at } = useLocalSearchParams<{ id?: string; at?: string }>();
  return <GroupChat id={id} at={at} onBack={goBack} />;
}
