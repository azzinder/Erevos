import { requireOptionalNativeModule } from 'expo-modules-core';

// The colour of each launcher icon (modules/erevos-icons, Appearance → Launcher icons). Android
// only; null on other platforms and in a build made before this module was added, where the choice
// is not offered.
export type LauncherIcon = 'erevos' | 'phone' | 'sms' | 'contacts';
export type LauncherColor = 'red' | 'orange' | 'green' | 'blue' | 'violet' | 'dark';

export const LAUNCHER_ICONS: LauncherIcon[] = ['erevos', 'phone', 'sms', 'contacts'];
export const LAUNCHER_COLORS: LauncherColor[] = ['red', 'orange', 'green', 'blue', 'violet', 'dark'];

const native = requireOptionalNativeModule<{
  colors(): Record<string, string> | null;
  setColor(icon: string, color: string): boolean;
}>('ErevosIcons');

/** Each icon's colour as the launcher shows it now, or null where there is no choice. */
export function launcherColors(): Record<LauncherIcon, LauncherColor> | null {
  try {
    const colors = native?.colors();
    if (!colors) return null;
    const known = (color: string | undefined): color is LauncherColor => LAUNCHER_COLORS.includes(color as LauncherColor);
    if (!LAUNCHER_ICONS.every((icon) => known(colors[icon]))) return null;
    return colors as Record<LauncherIcon, LauncherColor>;
  } catch {
    return null;
  }
}

/** Shows the icon in that colour in the launcher; false if it could not be changed. */
export function setLauncherColor(icon: LauncherIcon, color: LauncherColor): boolean {
  try {
    return native?.setColor(icon, color) ?? false;
  } catch {
    return false;
  }
}
