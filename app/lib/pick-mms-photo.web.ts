// MMS, as pick-mms-photo.ts, on a computer: there is no SMS there, so no photo for one.

export const MMS_MAX = 280 * 1024;

export type MmsPhoto = { bytes: Uint8Array; mime: 'image/jpeg' };

export async function pickMmsPhoto(): Promise<MmsPhoto | null> {
  return null;
}
