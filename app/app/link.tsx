// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState } from 'react';

import { openHiddenPlace } from '../lib/hidden-contacts';
import { LinkedDevices } from './devices';

// Opens from a device's code, erevos://link?key=...&id=...&s=... (lib/link-code.ts), which the
// phone's camera hands to Erevos: Linked devices, with the code read. Nothing is linked until Link
// is tapped there, as any link can open this screen. Hidden chats open beneath take it, as they
// take a contact's code: it links to them, never to the space, even once they close.
export default function Link() {
  const [hidden] = useState(() => openHiddenPlace() !== null);
  return <LinkedDevices hidden={hidden} />;
}
