#!/usr/bin/env bun
/** PWA icons: the three pig faces (from the synced sprites) on a sakura-pink pixel tile. */
import sharp from 'sharp';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const face = (pig: string) => join(root, `public/assets/sprites/${pig}/everyday/face.png`);

async function icon(size: number, out: string, maskable = false) {
  const base = 64; // draw at 64x64 logical pixels, then nearest-neighbor upscale
  const pad = maskable ? 10 : 2;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${base}" height="${base}" shape-rendering="crispEdges">
    <rect width="${base}" height="${base}" fill="${maskable ? '#ffb7c5' : 'none'}"/>
    <rect x="${pad}" y="${pad}" width="${base - pad * 2}" height="${base - pad * 2}" fill="#ffb7c5"/>
    <rect x="${pad}" y="${base - pad - 18}" width="${base - pad * 2}" height="18" fill="#f48fb1"/>
    <rect x="${pad}" y="${pad}" width="${base - pad * 2}" height="2" fill="#ffe3ea"/>
  </svg>`);
  const s = maskable ? 20 : 26; // face size in logical px
  const faces = await Promise.all(['piggy-1', 'piggy-3', 'piggy-2'].map((p) => sharp(face(p)).resize(s, s, { kernel: 'nearest' }).png().toBuffer()));
  const y = Math.round(base / 2 - s / 2 + 3);
  const cx = base / 2;
  const tile = await sharp(bg)
    .composite([
      { input: faces[0], left: Math.round(cx - s - s * 0.15 + 4), top: y + 3 },
      { input: faces[1], left: Math.round(cx + s * 0.15 - 4), top: y + 3 },
      { input: faces[2], left: Math.round(cx - s / 2), top: y - 4 },
    ])
    .png()
    .toBuffer();
  await sharp(tile).resize(size, size, { kernel: 'nearest' }).png({ compressionLevel: 9 }).toFile(join(root, 'public/icons', out));
  console.log('✓', out);
}

await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');
await icon(512, 'maskable-512.png', true);
await icon(180, 'apple-touch-icon.png', true);
