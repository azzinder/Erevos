// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { fetch as expoFetch } from 'expo/fetch';

// The fetch whose answer comes as a stream, so a download can be stopped as soon as it is too
// large (lib/net-http.ts readCapped). React Native's own fetch gives no stream: it holds the whole
// answer before handing any of it over. Expo's does, on Android as elsewhere.

export const streamingFetch = expoFetch as unknown as typeof fetch;
