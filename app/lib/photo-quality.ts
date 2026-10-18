import { secureGet, secureSet } from './secure';
import type { PhotoQuality } from './pick-photo';

// How photos go, chosen where they are sent and remembered on this phone: the original (the
// default), or made smaller at 90% or 75%.

const KEY = 'erevos.photo-quality';

export const QUALITIES: { value: PhotoQuality; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 90, label: '90%' },
  { value: 75, label: '75%' },
];

export async function loadPhotoQuality(): Promise<PhotoQuality> {
  const kept = await secureGet(KEY).catch(() => null);
  return kept === '90' ? 90 : kept === '75' ? 75 : 'original';
}

export function savePhotoQuality(quality: PhotoQuality): Promise<void> {
  return secureSet(KEY, String(quality));
}

/** What the quality means, for under the choice. */
export function qualityNote(quality: PhotoQuality): string {
  return quality === 'original'
    ? 'Original: the photo as it was, full size, with only its place, phone and time taken out.'
    : `${quality}%: a new, smaller photo, quicker to send. It says nothing but its picture.`;
}
