// Analisis kualitas warna pada screenshot PNG (decode manual, tanpa dependency).
import fs from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const d = b.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const stride = w * ch;
  const out = Buffer.alloc(w * h * ch);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    const line = raw.slice(pos, pos + stride); pos += stride;
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.slice(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, bq = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (ft === 1) v += a; else if (ft === 2) v += bq;
      else if (ft === 3) v += (a + bq) >> 1;
      else if (ft === 4) { const pa = Math.abs(bq - c), pb = Math.abs(a - c), pc = Math.abs(a + bq - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bq : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}

const files = process.argv.slice(2);
console.log('babak              meanLum  bright%  saturated%  hueSpread  vividBall%');
console.log('------------------ --------  --------  ----------  ---------  ----------');

for (const f of files) {
  const im = decodePNG(f);
  let sum = 0, n = 0, bright = 0, sat = 0, satN = 0;
  const hues = new Array(12).fill(0);
  // statistik hanya di area bola (pusat layar, radius ~28% lebar)
  const cx = im.w / 2, cy = im.h / 2, rad = im.w * 0.26;
  let ballSat = 0, ballN = 0;

  for (let p = 0; p < im.data.length; p += im.ch) {
    const x = (p / im.ch) % im.w, y = Math.floor((p / im.ch) / im.w);
    const r = im.data[p] / 255, g = im.data[p + 1] / 255, b = im.data[p + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const s = mx === 0 ? 0 : (mx - mn) / mx;
    sum += l; n++;
    if (l > 0.65) bright++;
    if (s > 0.35 && l > 0.12) { sat++; satN++; }
    if (s > 0.25 && l > 0.15) {
      let h;
      if (mx === r) h = ((g - b) / (mx - mn)) % 6;
      else if (mx === g) h = (b - r) / (mx - mn) + 2;
      else h = (r - g) / (mx - mn) + 4;
      h = ((h * 60) + 360) % 360;
      hues[Math.floor(h / 30) % 12]++;
    }
    if (Math.hypot(x - cx, y - cy) < rad) { ballSat += s; ballN++; }
  }
  const ht = hues.reduce((a, b) => a + b, 0) || 1;
  const spread = hues.filter(h => h / ht > 0.03).length;
  const name = f.split(/[\\/]/).pop().replace(/^v2_/, '').replace('.png', '');

  console.log(
    name.padEnd(18) +
    (sum / n).toFixed(4).padStart(8) +
    ((bright / n) * 100).toFixed(1).padStart(9) + '%' +
    ((satN / n) * 100).toFixed(1).padStart(11) + '%' +
    String(spread).padStart(11) +
    ((ballSat / ballN) * 100).toFixed(1).padStart(12) + '%'
  );
}
