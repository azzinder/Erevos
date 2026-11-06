// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { payOfLink } from '../lib/pay';

import { SendTo } from './share';

// A payment request another app asks to send, as Fasouli does (erevos://pay?…, lib/pay.ts): Send
// to, with only Erevos chats, after the password; the chat picked asks before it goes.
export default function PayScreen() {
  const params = useLocalSearchParams<{ a?: string; d?: string; c?: string; w?: string; r?: string }>();
  const pay = useMemo(() => payOfLink(params), [params.a, params.d, params.c, params.w, params.r]);
  return <SendTo pay={pay} />;
}
