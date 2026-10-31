// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { requireOptionalNativeModule } from 'expo-modules-core';

import type { Core } from '../../lib/core';

// The Erevos core (crates/erevos-ffi) on Android, as lib/core.ts uses it. Null in a build made
// before this module was added, and on other platforms, where the chat does not run yet.
export const nativeCore = requireOptionalNativeModule<Core>('ErevosCore');
