// While Erevos waits for another app it opened on purpose, to pick a photo, a file or a folder or
// take a photo: the time away then closes no hidden chats (app/chat.tsx), so what is picked still comes
// to them.
let picking = 0;

/** Runs `pick`, which opens the phone's photos, camera, files or folders, counted as picking until it is done. */
export async function whilePicking<T>(pick: () => Promise<T>): Promise<T> {
  picking++;
  try {
    return await pick();
  } finally {
    picking--;
  }
}

/** Whether a photo or a file is being picked now. */
export function isPicking(): boolean {
  return picking > 0;
}
