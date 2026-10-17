// QR codes as rows of runs, so a screen can draw one with a few plain views and no native
// module. Self-contained on purpose, so it can run under plain Node for checks.

import qrcode from 'qrcode-generator';

/** A stretch of modules of one colour in a row. */
export type Run = { dark: boolean; length: number };

/** The modules of the QR code for `text`, row by row, without the quiet zone around it. */
export function qrRows(text: string): Run[][] {
  // Medium error correction: still reads with a smudge or glare on the screen.
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  const rows: Run[][] = [];
  for (let row = 0; row < count; row++) {
    const runs: Run[] = [];
    for (let col = 0; col < count; col++) {
      const dark = qr.isDark(row, col);
      const last = runs[runs.length - 1];
      if (last && last.dark === dark) last.length++;
      else runs.push({ dark, length: 1 });
    }
    rows.push(runs);
  }
  return rows;
}
