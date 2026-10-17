// The app's files, in memory, for checks under Node (see node-hooks.mjs).
export const files = new Map<string, string>();

export async function readFile(name: string): Promise<string | null> {
  return files.get(name) ?? null;
}

export async function writeFile(name: string, text: string): Promise<void> {
  files.set(name, text);
}
