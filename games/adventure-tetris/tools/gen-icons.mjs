// One-off generator for PWA icons (pure Node, no deps).
// Draws a colorful tetris wall on a rounded dark tile and writes PNGs.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---- PNG encoding ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing ----
const COLORS = {
  I: [0x00, 0xf0, 0xff], O: [0xff, 0xd7, 0x00], T: [0xa8, 0x55, 0xf7], S: [0x22, 0xc5, 0x5e],
  Z: [0xef, 0x44, 0x44], J: [0x3b, 0x82, 0xf6], L: [0xf9, 0x73, 0x16],
};
const BG = [15, 23, 42]; // slate-900

// decorative wall: rows of pieces (null = empty cell)
const WALL = [
  ['I', 'I', 'I', 'I'],
  ['O', 'O', 'S', 'S'],
  ['T', 'Z', 'J', 'L'],
];

function drawIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const bgRadius = maskable ? 0 : Math.round(size * 0.18);
  // content safe zone: maskable keeps art within inner 80%
  const margin = Math.round(size * (maskable ? 0.22 : 0.125));
  const cell = Math.round((size - margin * 2) / 4);
  const inset = Math.max(2, Math.round(cell * 0.09));
  const radius = Math.round(cell * 0.22);
  const gap = Math.max(2, Math.round(cell * 0.08));

  const inRoundRect = (x, y, rx, ry, rw, rh, r) => {
    if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
    const cx = x < rx + r ? rx + r : x >= rx + rw - r ? rx + rw - r : x;
    const cy = y < ry + r ? ry + r : y >= ry + rh - r ? ry + rh - r : y;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dx) <= r && Math.abs(dy) <= r) return false; // inside inner square region handled below
    return true;
  };
  const insideRR = (x, y, rx, ry, rw, rh, r) => {
    if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
    const nx = Math.max(rx + r, Math.min(x, rx + rw - r));
    const ny = Math.max(ry + r, Math.min(y, ry + rh - r));
    const dx = x - nx;
    const dy = y - ny;
    return dx * dx + dy * dy <= r * r || (x >= rx + r && x < rx + rw - r) || (y >= ry + r && y < ry + rh - r);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = 0, g = 0, b = 0, a = 255;

      if (!maskable) {
        if (!insideRR(x, y, 0, 0, size, size, bgRadius)) { a = 0; }
      }
      if (a !== 0) {
        [r, g, b] = BG;
      }

      if (a !== 0) {
        // draw wall cells
        for (let row = 0; row < WALL.length; row++) {
          for (let col = 0; col < 4; col++) {
            const key = WALL[row][col];
            if (!key) continue;
            const cx0 = margin + col * (cell + gap);
            const cy0 = margin + row * (cell + gap);
            if (insideRR(x, y, cx0, cy0, cell, cell, radius)) {
              const [cr, cg, cb] = COLORS[key];
              // subtle vertical shade
              const shade = 0.92 + 0.08 * (1 - (y - cy0) / cell);
              r = Math.round(cr * shade);
              g = Math.round(cg * shade);
              b = Math.round(cb * shade);
              // top-left highlight
              if (insideRR(x, y, cx0 + inset * 2, cy0 + inset * 2, cell - inset * 4, cell - inset * 4, Math.max(1, radius - inset))) {
                r = Math.min(255, r + 46); g = Math.min(255, g + 46); b = Math.min(255, b + 46);
              }
            }
          }
        }
      }

      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
    }
  }
  return encodePNG(size, px);
}

const files = [
  ['icon-192.png', drawIcon(192)],
  ['icon-512.png', drawIcon(512)],
  ['icon-maskable-512.png', drawIcon(512, { maskable: true })],
  ['apple-touch-icon.png', drawIcon(180)],
];
for (const [name, buf] of files) {
  writeFileSync(join(outDir, name), buf);
  console.log(name, buf.length, 'bytes');
}
console.log('icons written to', outDir);
