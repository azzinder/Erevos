// The web app's icon, drawn here so the repository needs no image files: a gold crescent, an
// eclipse, on Erevos's dark background. Square PNGs of any size, with a margin wide enough for
// the masks that Android and iOS cut icons with.
import { deflateSync } from 'node:zlib';

const DARK = [0x0d, 0x0b, 0x09];
const GOLD = [0xd9, 0xa4, 0x41];

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** How much of the point (x, y), in units of the icon's size, is gold. */
function gold(x, y) {
  const inside = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  return inside(0.5, 0.5, 0.25) && !inside(0.6, 0.42, 0.22);
}

export function icon(size) {
  const SAMPLES = 4;
  const rows = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    rows[row] = 0;
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++)
        for (let sx = 0; sx < SAMPLES; sx++) if (gold((x + (sx + 0.5) / SAMPLES) / size, (y + (sy + 0.5) / SAMPLES) / size)) hits++;
      const t = hits / SAMPLES ** 2;
      for (let c = 0; c < 3; c++) rows[row + 1 + x * 3 + c] = Math.round(DARK[c] + (GOLD[c] - DARK[c]) * t);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
