#!/usr/bin/env bun
/**
 * Pixel-art hand cursors → public/cursors/<name>.png (32×32) and <name>@2x.png (64×64).
 * Each cursor is 16×16 art pixels drawn below as ASCII, scaled ×2 / ×4 nearest-neighbor, so it stays crisp
 * at 1x and on retina. src/styles/cursors.css uses them through image-set() with the CSS-px hotspots this
 * script prints (keep the two in sync when you move a hotspot).
 *
 *   bun scripts/make-cursors.ts                     write the PNGs
 *   bun scripts/make-cursors.ts --preview out.png   also write a big preview sheet (art at 10×, then 1x/2x)
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const outDir = join(root, 'public/cursors');

/** K ink outline · W glove white · S glove shade · P cuff pink · Q cuff dark pink · '.' transparent. */
const PALETTE: Record<string, readonly [number, number, number]> = {
  K: [0x1b, 0x12, 0x29],
  W: [0xff, 0xfb, 0xf4],
  S: [0xcf, 0xc3, 0xe0],
  P: [0xff, 0xa6, 0xc1],
  Q: [0xd6, 0x60, 0x8a],
};

interface CursorArt {
  /** 16 rows of 16 pixels. */
  rows: readonly string[];
  /** Hotspot in art pixels (the CSS hotspot is the center of that pixel). */
  hot: readonly [number, number];
  /** CSS fallback keyword. */
  fallback: string;
}

const ART = 16;

export const CURSORS: Record<'point' | 'grab' | 'hold', CursorArt> = {
  // A white glove pointing up-left, like a classic hand cursor. Hotspot: the fingertip.
  point: {
    hot: [1, 1],
    fallback: 'pointer',
    rows: [
      '.KK.............',
      'KWWK............',
      'KWWWK...........',
      '.KWWWK..KK......',
      '..KWWWKKWWK.....',
      '...KWWWKWWWKK...',
      '...KWWWWKWWWWK..',
      '..KKWWWWWKWWWSK.',
      '.KWWKWWWWWWWWSK.',
      '.KWWWKWWWWWWSSK.',
      '..KWWWWWWWWSSK..',
      '...KSWWWWWSSKK..',
      '....KSSWWSSKPPK.',
      '.....KKSSSKPPQK.',
      '.......KKKKQQK..',
      '..........KK....',
    ],
  },
  // Over a pig you can lift: the hand turns to face down, thumb and index finger open to pinch.
  // Hotspot: between the fingertips.
  grab: {
    hot: [6, 13],
    fallback: 'grab',
    rows: [
      '.....KKKKKKK....',
      '....KPPPPPPQK...',
      '....KQQQQQQQK...',
      '...KKWWWWWWSKK..',
      '..KWWWWWWWWWWSK.',
      '.KWWWWWWWWWWWSK.',
      '.KWWWWWWWWKWWSK.',
      '.KWWWWWWWKWWWSK.',
      '.KWWKWWWWKWWSK..',
      'KWWK.KWWWWKKK...',
      'KWWK..KWWSK.....',
      'KWWK..KWWSK.....',
      '.KWWK..KWSK.....',
      '..KWSK.KWSK.....',
      '...KK..KWK......',
      '........K.......',
    ],
  },
  // Holding a pig: thumb and index finger pinched together. Hotspot: the pinch.
  hold: {
    hot: [5, 13],
    fallback: 'grabbing',
    rows: [
      '.....KKKKKKK....',
      '....KPPPPPPQK...',
      '....KQQQQQQQK...',
      '...KKWWWWWWSKK..',
      '..KWWWWWWWWWWSK.',
      '.KWWWWWWWWWWWSK.',
      '.KWWWWWWWWKWWSK.',
      '.KWWWWWWWKWWWSK.',
      '.KWWKWWWWKWWSK..',
      'KWWK.KWWWWKKK...',
      'KWWK..KWWK......',
      '.KWWK.KWSK......',
      '..KWWKWSK.......',
      '...KWWSK........',
      '....KKK.........',
      '................',
    ],
  },
};

/** RGBA pixels of a cursor at an integer scale. */
function rgba(art: CursorArt, scale: number): Buffer {
  if (art.rows.length !== ART) throw new Error(`cursor art must have ${ART} rows`);
  const size = ART * scale;
  const buf = Buffer.alloc(size * size * 4);
  art.rows.forEach((row, y) => {
    if (row.length !== ART) throw new Error(`row ${y} is ${row.length} px wide: "${row}"`);
    for (let x = 0; x < ART; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const c = PALETTE[ch];
      if (!c) throw new Error(`unknown pixel "${ch}" at ${x},${y}`);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) buf.set([c[0], c[1], c[2], 255], ((y * scale + dy) * size + x * scale + dx) * 4);
      }
    }
  });
  return buf;
}

function toPng(art: CursorArt, scale: number) {
  const size = ART * scale;
  return sharp(rgba(art, scale), { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 });
}

mkdirSync(outDir, { recursive: true });
for (const [name, art] of Object.entries(CURSORS)) {
  const [hx, hy] = art.hot;
  if (art.rows[hy]?.[hx] === undefined) throw new Error(`${name}: hotspot outside the art`);
  await toPng(art, 2).toFile(join(outDir, `${name}.png`));
  await toPng(art, 4).toFile(join(outDir, `${name}@2x.png`));
  console.log(`✓ ${name}.png + ${name}@2x.png — CSS hotspot ${hx * 2 + 1} ${hy * 2 + 1}, fallback ${art.fallback}`);
}

const previewAt = process.argv.indexOf('--preview');
const previewOut = previewAt > 0 ? process.argv[previewAt + 1] : undefined;
if (previewOut) {
  // art at 10× on a checkerboard and on grass (hotspot in red), then actual 1x / 2x sizes on the night color
  const z = 10;
  const cell = ART * z + 20;
  const entries = Object.values(CURSORS);
  const W = cell * entries.length;
  const H = cell * 2 + 90;
  const img = Buffer.alloc(W * H * 4);
  const put = (x: number, y: number, c: readonly number[]) => img.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const check = ((x >> 3) + (y >> 3)) % 2 === 0;
      put(x, y, y < cell ? (check ? [205, 205, 215] : [235, 235, 242]) : y < cell * 2 ? [0x6a, 0x96, 0x6a] : [0x1a, 0x10, 0x30]);
    }
  }
  entries.forEach((art, i) => {
    const ox = i * cell + 10;
    art.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const hot = x === art.hot[0] && y === art.hot[1];
      const c = PALETTE[ch];
      for (let dy = 0; dy < z; dy++) {
        for (let dx = 0; dx < z; dx++) {
          const mark = hot && dx >= 3 && dx < 7 && dy >= 3 && dy < 7;
          if (c || mark) {
            put(ox + x * z + dx, 10 + y * z + dy, mark ? [255, 0, 0] : c!);
            if (c) put(ox + x * z + dx, cell + 10 + y * z + dy, c);
          }
        }
      }
      if (!c) return;
      for (let d = 0; d < 4; d++) put(ox + x * 2 + (d & 1), cell * 2 + 24 + y * 2 + (d >> 1), c);
      for (let d = 0; d < 16; d++) put(ox + 50 + x * 4 + (d & 3), cell * 2 + 10 + y * 4 + (d >> 2), c);
    }));
  });
  await sharp(img, { raw: { width: W, height: H, channels: 4 } }).png().toFile(previewOut);
  console.log('preview →', previewOut);
}
