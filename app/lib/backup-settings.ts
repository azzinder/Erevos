// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { loadAutoBackup } from './backup-folder';
import { putPhoneSettings } from './backup-native';
import { reloadBatteryMode } from './battery-mode';
import { reloadHaptics } from './haptics';
import { reloadLang } from './i18n';
import { iconNumberChanged } from './icon-number';
import { modulesOn, reloadModules } from './modules';
import { panicFolderChanged } from './panic';
import { offerChecksAfterRestore } from './permissions';
import { setupRestored } from './setup-after';
import { putBack, type SavedRadio } from './lora';
import { canLora, lora, resumeLora, savedRadio } from './radio';

// Once a backup was restored (lock/backup.ts), the phone's own settings it held are in the
// keystore, and what Erevos keeps of them in memory follows them here at once: the language, the
// modules on, vibrate on touch, the number on the icon, the battery mode, the folder a wipe deletes
// automatic backups in, and the LoRa radio: a radio linked that the backup does not name gets back
// the settings Erevos changed first (lib/radio.ts), as when LoRa is turned off, which this phone
// kept and the restore did not (beforeRestore). The rest is read where it is used, or as a space
// opens again. The phone module's own settings go back into the module (lib/backup-native.ts), and on
// Android the permissions check shows when a space next opens (lib/permissions.ts), as what
// Android allows stays with the phone.

// Each in turn: one that fails leaves the others to follow.
async function each(steps: (() => unknown)[]): Promise<void> {
  for (const step of steps) {
    try {
      await step();
    } catch {
      // As it was until Erevos starts again.
    }
  }
}

/** What afterRestore needs of the phone as it was before the restore. */
export type BeforeRestore = { radio: SavedRadio | null };

/** Read just before a backup is restored, for afterRestore: the LoRa radio this phone had. */
export async function beforeRestore(): Promise<BeforeRestore> {
  return { radio: canLora() ? await savedRadio().catch(() => null) : null };
}

/** Follows the settings a backup just restored put in place; `native`, the phone module's it held
 *  (backupNative), and `before`, beforeRestore's. */
export async function afterRestore(native: Uint8Array | null, before: BeforeRestore = { radio: null }): Promise<void> {
  await each([
    () => putPhoneSettings(native),
    reloadLang,
    reloadModules,
    reloadHaptics,
    iconNumberChanged,
    reloadBatteryMode,
    async () => panicFolderChanged((await loadAutoBackup())?.folder ?? ''),
    async () => {
      if (!canLora()) return;
      // The radio the backup set, or none: one linked that it does not name lets go, with its own
      // settings back first, which only this phone kept.
      const radio = await savedRadio();
      const linked = lora.state().status !== 'off' ? lora.state().address : '';
      if (linked && linked !== radio?.address) {
        const was = before.radio;
        if (was?.kept && was.address === linked && putBack(lora, was.kept)) {
          // Its Bluetooth sends them before it lets go.
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        lora.turnOff();
      } else if (!radio) lora.turnOff();
      if (radio) resumeLora();
    },
    offerChecksAfterRestore,
    // Moving from another phone at the first start: its steps go on, for the modules restored.
    () => setupRestored(modulesOn()),
  ]);
}
