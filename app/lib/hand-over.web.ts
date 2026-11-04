// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { ask } from './alert';
import { t } from './i18n';

// Giving a file out of the web app, in a plain browser: on a phone or tablet the system's share
// sheet (on an iPhone it saves to Files, or to any app), elsewhere the browser's downloads. The
// share sheet only opens straight after a tap; when the work before it took too long, a button
// asks for that tap. A browser lets a page download one file by itself, but stops it downloading
// more until a tap: several files go to the downloads one after the other, each after a tap but
// the first, and the owner sees how many went.

export type HandedOver = 'shared' | 'downloaded';

/** The owner stopped before all the files went to the downloads: `given` of `all` did. */
export class HandOverStopped extends Error {
  readonly given: number;
  readonly all: number;

  constructor(given: number, all: number) {
    super(t('Only {given} of the {all} files went to the downloads, so they are not all saved.', { given, all }));
    this.given = given;
    this.all = all;
  }
}

function download(file: globalThis.File): HandedOver {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

const failure = (error: unknown) => (error instanceof DOMException ? error.name : '');

/** Gives the file out. Null if the owner closed the share sheet. */
export async function handOver(name: string, mime: string, bytes: Uint8Array): Promise<HandedOver | null> {
  return handOverAll([new File([bytes as BlobPart], name, { type: mime || 'application/octet-stream' })]);
}

// Each file to the downloads: the first at once, each next one at a tap on Save, so the browser
// lets it go. Throws HandOverStopped when the owner stops before the last.
async function downloadAll(files: globalThis.File[]): Promise<HandedOver> {
  if (files.length) download(files[0]);
  for (let i = 1; i < files.length; i++) {
    const next = files[i];
    const tapped = await new Promise<boolean>((resolve) => {
      ask(t('Save the files'), t('{given} of the {all} files went to the downloads. Tap Save for the next one: {name}', { given: i, all: files.length, name: next.name }), [
        { text: t('Stop'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: t('Save'),
          onPress: () => {
            download(next);
            resolve(true);
          },
        },
      ]);
    });
    if (!tapped) throw new HandOverStopped(i, files.length);
  }
  return 'downloaded';
}

/** Gives the files out together, as one share. Null if the owner closed the share sheet. To the
 *  downloads, throws HandOverStopped when the owner stopped before they all went. */
export async function handOverAll(files: globalThis.File[]): Promise<HandedOver | null> {
  const touch = navigator.maxTouchPoints > 0;
  if (!touch || !navigator.canShare?.({ files })) return downloadAll(files);
  try {
    await navigator.share({ files });
    return 'shared';
  } catch (error) {
    if (failure(error) === 'AbortError') return null;
    if (failure(error) !== 'NotAllowedError') return downloadAll(files);
  }
  return new Promise((resolve, reject) => {
    ask(files[0]?.name ?? '', t('Ready to save.'), [
      { text: t('Cancel'), style: 'cancel', onPress: () => resolve(null) },
      {
        text: t('Save'),
        onPress: () => {
          navigator.share({ files }).then(
            () => resolve('shared'),
            (error: unknown) => (failure(error) === 'AbortError' ? resolve(null) : downloadAll(files).then(resolve, reject)),
          );
        },
      },
    ]);
  });
}
