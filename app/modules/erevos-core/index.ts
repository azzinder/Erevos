import { requireOptionalNativeModule } from 'expo-modules-core';

import type { Core } from '../../lib/core';

// The Erevos core (crates/erevos-ffi) on Android, as lib/core.ts uses it. Null in a build made
// before this module was added, and on other platforms, where the chat does not run yet.
export const nativeCore = requireOptionalNativeModule<Core>('ErevosCore');
