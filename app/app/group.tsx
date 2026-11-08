// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ChatScreen } from '../components/chat-look';
import { GroupChat } from '../components/group-chat';
import type { ChatLook } from '../theme/chat-theme';

// A group of the space, on its own screen (components/group-chat.tsx), in the group's own look or
// the space's (components/chat-look.tsx). `at`: the tag of a message to go to, starred or found.

/** Back to the screen before, or home when the group was opened first. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function GroupScreen() {
  const { id = '', at } = useLocalSearchParams<{ id?: string; at?: string }>();
  const [look, setLook] = useState<ChatLook | null>(null);
  return (
    <ChatScreen chat={look} onBack={goBack}>
      <GroupChat id={id} at={at} onBack={goBack} onLook={setLook} />
    </ChatScreen>
  );
}
