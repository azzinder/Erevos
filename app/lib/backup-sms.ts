import { exportPhoneSms, smsStatus, smsToolsReady } from '../modules/erevos-sms';
import { secureDelete, secureGet, secureSet } from './secure';

// The phone's SMS and MMS in Erevos's backups (lock/backup.ts), when the owner wants them: read
// whole from Android's store as the SMS app (modules/erevos-sms, SmsBackup.kt) into the backup,
// sealed with its password like everything in it, and put back from one into the phone's SMS, each
// message the phone does not have yet. The choice is kept on the phone, outside every space and out
// of backups, as automatic backups' settings are: whichever space opens, it is the same, and the
// SMS are the phone's, the same in every space.

const KEY = 'erevos.backup-sms';
const MAGIC = 'EREVOS SMS 1\n';

/** The most bytes of MMS pictures a backup holds (SmsBackup.kt's MAX_DATA), in MB. */
export const SMS_PICTURES_MB = 32;

/** Whether this phone can put its SMS in backups: Android, in a build that can. */
export function canBackUpSms(): boolean {
  return smsToolsReady();
}

export async function backsUpSms(): Promise<boolean> {
  return (await secureGet(KEY).catch(() => null)) === '1';
}

export async function setBacksUpSms(on: boolean): Promise<void> {
  if (on) await secureSet(KEY, '1');
  else await secureDelete(KEY);
}

/** The phone's SMS and MMS for a backup being made, when the owner wants them and Erevos is the
 *  SMS app; else null, and the backup is made without them. */
export async function phoneSmsForBackup(): Promise<Uint8Array | null> {
  if (!canBackUpSms() || !smsStatus()?.isDefault || !(await backsUpSms())) return null;
  return exportPhoneSms();
}

/** How many SMS and MMS the phone's SMS in a backup hold, and how many MMS pictures were left out;
 *  null when the bytes are not such. */
export function smsCounts(bytes: Uint8Array): { sms: number; mms: number; left: number } | null {
  const head = MAGIC.length + 12;
  if (bytes.length < head) return null;
  for (let i = 0; i < MAGIC.length; i++) if (bytes[i] !== MAGIC.charCodeAt(i)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + MAGIC.length, 12);
  return { sms: view.getUint32(0), mms: view.getUint32(4), left: view.getUint32(8) };
}
