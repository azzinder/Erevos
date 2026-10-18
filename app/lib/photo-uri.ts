import { toBase64 } from './crypto';

// A photo's bytes as something an Image can show, in memory only: never written out unsealed.
// On the phone a data: address; on a computer a blob: one (photo-uri.web.ts).

export function photoUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${toBase64(bytes)}`;
}

export function releaseUri(_uri: string): void {}
