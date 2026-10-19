import { ask } from './alert';
import { t } from './i18n';

// Giving a file out of the web app, in a plain browser: on a phone or tablet the system's share
// sheet (on an iPhone it saves to Files, or to any app), elsewhere the browser's downloads. The
// share sheet only opens straight after a tap; when the work before it took too long, a button
// asks for that tap.

export type HandedOver = 'shared' | 'downloaded';

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
  const file = new File([bytes as BlobPart], name, { type: mime || 'application/octet-stream' });
  const touch = navigator.maxTouchPoints > 0;
  if (!touch || !navigator.canShare?.({ files: [file] })) return download(file);
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (error) {
    if (failure(error) === 'AbortError') return null;
    if (failure(error) !== 'NotAllowedError') return download(file);
  }
  return new Promise((resolve) => {
    ask(name, t('Ready to save.'), [
      { text: t('Cancel'), style: 'cancel', onPress: () => resolve(null) },
      {
        text: t('Save'),
        onPress: () => {
          navigator.share({ files: [file] }).then(
            () => resolve('shared'),
            (error: unknown) => resolve(failure(error) === 'AbortError' ? null : download(file)),
          );
        },
      },
    ]);
  });
}
