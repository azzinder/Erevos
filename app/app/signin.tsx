// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { offerSignInCode } from '../lib/relay-signin';

// Opens from the relay's sign-in page, erevos://signin?code=<six digits> (Open Erevos there,
// crates/erevos-relay/src/signin.rs): hands the code to the sign-in under way on the screen beneath
// (components/relay-signin.tsx), which claims with it and the claim secret only it holds, and goes
// back to that screen. A code from any other link claims nothing: no sign-in waits for it, or the
// relay refuses it, as a code typed wrong.
export default function SignInCode() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    if (typeof code === 'string') offerSignInCode(code);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [code]);
  return null;
}
