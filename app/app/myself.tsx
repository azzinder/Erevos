// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { MyselfChat } from '../components/myself-chat';

// Chat with myself, the open space's (components/myself-chat.tsx): its row is always at the top of
// the chats (app/index.tsx), and a reminder's notice opens it.
export default function MyselfScreen() {
  return <MyselfChat />;
}
