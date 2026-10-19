import { requireOptionalNativeModule } from 'expo-modules-core';

import { checkedTones, type SystemTones } from '../../theme/colors';

// The phone's own colours for the Material You style (theme/colors.ts materialColors), which
// Android 12 and later make from the wallpaper. Null on older Android, on other platforms and in
// a build made before this module was added: the style is not offered there.
const native = requireOptionalNativeModule<{ systemColors(): unknown }>('ErevosLook');

/** The phone's colours as they are now, or null where it has none. */
export function phoneTones(): SystemTones | null {
  try {
    return checkedTones(native?.systemColors() ?? null);
  } catch {
    return null;
  }
}
