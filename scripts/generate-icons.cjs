// One-off script to generate PWA icon PNGs without any image-library dependency.
// Draws a rounded green square with a white checkmark, at the given sizes.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })());
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - 1 - radius);
  const cy = Math.min(Math.max(y, radius), size - 1 - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

// Distance from point to a line segment
function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 === 0 ? 0 : (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx, cy = ay + t * aby;
  const dx = px - cx, dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function makeIcon(size) {
  const bg = [34, 197, 94]; // green-500
  const fg = [255, 255, 255];
  const radius = size * 0.18;
  const strokeW = size * 0.09;
  // checkmark points (relative to size)
  const p1 = [size * 0.27, size * 0.53];
  const p2 = [size * 0.44, size * 0.70];
  const p3 = [size * 0.75, size * 0.32];

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type none
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      if (inRoundedSquare(x, y, size, radius)) {
        [r, g, b] = bg;
        a = 255;
        const d1 = distToSegment(x, y, p1[0], p1[1], p2[0], p2[1]);
        const d2 = distToSegment(x, y, p2[0], p2[1], p3[0], p3[1]);
        if (d1 < strokeW / 2 || d2 < strokeW / 2) {
          [r, g, b] = fg;
        }
      }
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

const outDir = path.join(__dirname, '..', 'public');
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `pwa-${size}.png`), makeIcon(size));
}
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), makeIcon(180));
console.log('Generated PWA icons in public/');
