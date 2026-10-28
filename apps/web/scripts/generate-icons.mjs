import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generates the PWA icons as plain RGBA PNGs — no image dependency, no design
 * asset to drift from the palette in globals.css. Run with:
 *
 *   node scripts/generate-icons.mjs
 *
 * Design: an amber field with three stacked bars (a drive/stack glyph) and a
 * status dot. The maskable variant drops the rounded corners and shrinks the
 * glyph so it survives a circular or squircle crop.
 */

const AMBER = [0xd9, 0x77, 0x06, 0xff];
const INK = [0x1f, 0x1a, 0x12, 0xff];

const OUT_DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));

// --- PNG encoding ---------------------------------------------------------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(
      raw,
      row + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- drawing --------------------------------------------------------------

function createCanvas(size) {
  return { size, pixels: new Uint8Array(size * size * 4) };
}

/** Source-over with an extra coverage factor (used for edge anti-aliasing). */
function blend(canvas, x, y, [r, g, b, a], coverage = 1) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const i = (y * canvas.size + x) * 4;
  const alpha = (a / 255) * coverage;
  if (alpha <= 0) return;
  canvas.pixels[i] = Math.round(r * alpha + canvas.pixels[i] * (1 - alpha));
  canvas.pixels[i + 1] = Math.round(g * alpha + canvas.pixels[i + 1] * (1 - alpha));
  canvas.pixels[i + 2] = Math.round(b * alpha + canvas.pixels[i + 2] * (1 - alpha));
  canvas.pixels[i + 3] = Math.round(255 * alpha + canvas.pixels[i + 3] * (1 - alpha));
}

/**
 * Filled rounded rectangle with a 1px anti-aliased edge. Uses a signed
 * distance field so radius 0 (the maskable full-bleed background) still fills
 * opaquely instead of fading to half alpha.
 */
function fillRoundRect(canvas, x, y, width, height, radius, colour) {
  const r = Math.min(radius, width / 2, height / 2);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const extentX = width / 2 - r;
  const extentY = height / 2 - r;
  for (let py = 0; py < canvas.size; py += 1) {
    for (let px = 0; px < canvas.size; px += 1) {
      const dx = Math.abs(px + 0.5 - centerX) - extentX;
      const dy = Math.abs(py + 0.5 - centerY) - extentY;
      const outsideX = Math.max(dx, 0);
      const outsideY = Math.max(dy, 0);
      const sdf =
        Math.hypot(outsideX, outsideY) + Math.min(Math.max(dx, dy), 0) - r;
      const coverage = Math.min(1, Math.max(0, 0.5 - sdf));
      if (coverage > 0) blend(canvas, px, py, colour, coverage);
    }
  }
}

function fillCircle(canvas, cx, cy, radius, colour) {
  for (let py = Math.floor(cy - radius) - 1; py <= cy + radius + 1; py += 1) {
    for (let px = Math.floor(cx - radius) - 1; px <= cx + radius + 1; px += 1) {
      const distance = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      const coverage = Math.min(1, Math.max(0, radius + 0.5 - distance));
      if (coverage > 0) blend(canvas, px, py, colour, coverage);
    }
  }
}

/**
 * Draws the glyph in a 512-unit design space and scales it to the canvas, so
 * every exported size shares the same proportions.
 */
function drawIcon(size, { maskable }) {
  const canvas = createCanvas(size);
  const scale = size / 512;

  // Maskable icons must fill the whole canvas; the OS crops the outer ring.
  fillRoundRect(
    canvas,
    0,
    0,
    size,
    size,
    maskable ? 0 : Math.round(96 * scale),
    AMBER,
  );

  // Maskable art keeps the glyph inside the centre safe zone.
  const inset = maskable ? 0.78 : 1;
  const glyphWidth = 288 * inset;
  const glyphX = 112 + (1 - inset) * 128;
  const glyphHeight = 64 * inset;
  const topOf = (designTop) => 140 + (designTop - 140) * inset;
  let lastBarY = 0;
  for (const designTop of [140, 224, 308]) {
    lastBarY = topOf(designTop);
    fillRoundRect(
      canvas,
      Math.round(glyphX * scale),
      Math.round(lastBarY * scale),
      Math.round(glyphWidth * scale),
      Math.round(glyphHeight * scale),
      Math.round(32 * inset * scale),
      INK,
    );
  }

  // Status dot on the bottom bar: "stored and healthy".
  fillCircle(
    canvas,
    (glyphX + glyphWidth - 34 * inset) * scale,
    (lastBarY + glyphHeight / 2) * scale,
    15 * inset * scale,
    AMBER,
  );

  return encodePng(size, size, canvas.pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['apple-touch-icon.png', 180, false],
  ['icon-maskable-512.png', 512, true],
];

for (const [name, size, maskable] of targets) {
  writeFileSync(path.join(OUT_DIR, name), drawIcon(size, { maskable }));
  console.log(`wrote icons/${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
}
