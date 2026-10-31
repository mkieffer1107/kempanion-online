#!/usr/bin/env bun
/**
 * Pixel-art glove cursors → public/cursors/<name>.png and <name>@2x.png, each cropped to its art.
 *
 * One family: a cartoon white glove (4 fingers + thumb, back of a right hand) with a sakura-pink cuff, a 1-px ink
 * outline and 2-tone lilac shading.
 *   point — default cursor: the index finger points up out of a fist seen from the back (three knuckles stepping
 *           down, two creases), the thumb tucked along the index finger, the cuff below.
 *   grab  — over a pig you can lift: the hand hangs from its cuff, fingers open and straight, the thumb out to the
 *           right. The hotspot is the gap between the index fingertip and the thumb tip.
 *   hold  — carrying him: the same cuff and back of the hand, the fingers curled into a fist (shaded, facing away
 *           from the light) and the thumb pinched against the index fingertip, on the hotspot.
 *
 * Each cursor is drawn on a 32×32 grid below (1 art pixel = 1 CSS px), then cropped to its art's bounding box.
 * Safari and Chrome 156+ show the fallback keyword instead of a custom cursor whenever any part of its bitmap would
 * fall outside the viewport, so empty padding only widens the band along the window edges where the glove turns
 * into the OS cursor. Cursors on the same `frame` (grab and hold) share one box, the union of their art, so they
 * keep one hotspot and pressing only closes the fingers in place.
 *
 * The @2x art is Scale2x (EPX) of the cropped 1x: the art doubled with its staircase edges rounded off, no new
 * colors, so retina screens get smoother curves and the same 1-CSS-px outline weight.
 *
 * src/styles/cursors.css uses the PNGs through image-set() with the hotspots this script prints, in CSS px of the
 * cropped 1x PNG: point 4 0 (index fingertip) · grab 19 22 · hold 19 22 (the pinch). Redrawing the art can move
 * the crop, so the script also checks the CSS and warns when its hotspots no longer match.
 *
 *   bun scripts/make-cursors.ts                     write the PNGs into public/cursors
 *   bun scripts/make-cursors.ts --out <dir>         write them somewhere else
 *   bun scripts/make-cursors.ts --preview <file>    also write a review sheet (each PNG at 8× on light pink and on
 *                                                   night purple with the hotspot ringed in red, then 1x and @2x at
 *                                                   true size on pink, cream, hair, night)
 */
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * K ink outline · W glove white · L lilac shade · D deep lilac shade
 * P cuff pink · Q cuff shade · '.' transparent.
 */
const PALETTE: Record<string, readonly [number, number, number]> = {
  K: [0x1b, 0x12, 0x29],
  W: [0xff, 0xfd, 0xf8],
  L: [0xd9, 0xcf, 0xe6],
  D: [0xb7, 0xa7, 0xcf],
  P: [0xf4, 0x8f, 0xb1],
  Q: [0xc2, 0x60, 0x8a],
};

interface CursorArt {
  /** The drawing: 32 rows of 32 pixels. */
  rows: readonly string[];
  /** Hotspot on the 32×32 drawing; the script moves it into the cropped PNG. */
  hot: readonly [number, number];
  /** CSS fallback keyword. */
  fallback: string;
  /** Cursors on the same frame are cropped to one shared box, so they keep the same hotspot. */
  frame: string;
}

type CursorName = 'point' | 'grab' | 'hold';

const SIZE = 32;

export const CURSORS: Record<CursorName, CursorArt> = {
  point: {
    hot: [5, 1],
    fallback: 'pointer',
    frame: 'point',
    rows: [
      '................................',
      '.....KKK........................',
      '....KWWLK.......................',
      '...KWWWLK.......................',
      '...KWWWLK.......................',
      '...KWWWLK.......................',
      '....KWWWLK......................',
      '....KWWWLK......................',
      '....KWWWLK......................',
      '.....KWWWLKKKKK.................',
      '.....KWWWLKWWWWK................',
      '...KKKWWWLKWWWLKKKK.............',
      '..KWWLKWWWLKWWLKWWWK............',
      '.KWWWLKWWWLKWWLKWWWLKKKK........',
      '.KWWWLKWWWLKWWWLWWWLKWWWK.......',
      '..KWWWLKWWWLKWWWWWWLKWWLK.......',
      '..KWWWLKWWWLKWWWWWWWKWWLK.......',
      '...KWWWWWWWWWWWWWWWWWWWLK.......',
      '...KWWWWWWWWWWWWWWWWWWWLK.......',
      '....KLWWWWWWWWWWWWWWWWWLK.......',
      '.....KLWWWWWWWWWWWWWWWLK........',
      '......KLLWWWWWWWWWWWWLK.........',
      '......KDLLWWWWWWWWLDKK..........',
      '.......KKLLWWWWWLLDKPK..........',
      '.......KPKKDDLLDDKKPPQK.........',
      '.......KPPPKKKKKKPPPPQK.........',
      '.......KPPPPPPPPPPPPPQK.........',
      '........KQPPPPPPPPPPQQK.........',
      '.........KQQQQQQQQQQQK..........',
      '..........KKKKKKKKKKKK..........',
      '................................',
      '................................',
    ],
  },
  grab: {
    hot: [22, 23],
    fallback: 'grab',
    frame: 'hand',
    rows: [
      '................................',
      '..........KKKKKKKKKKKK..........',
      '.........KPPPPPPPPPPPQK.........',
      '........KPPPPPPPPPPPPPQK........',
      '........KPPPPPPPPPPPPPQK........',
      '........KQPPPPPPPPPPPQQK........',
      '.........KQQQQQQQQQQQQK.........',
      '..........KKKKKKKKKKKK..........',
      '..........KLLLLLLLLLDK..........',
      '.........KWWWWWWWWWWWLK.........',
      '........KWWWWWWWWWWWWLK.........',
      '.......KWWWWWWWWWWWWWWLK........',
      '......KWWWWWWWWWWWWWLWWLK.......',
      '......KWWWWWWWWWWWWWWLWWLK......',
      '.....KWWWLWWWLWWWLWWWLKWWLK.....',
      '.....KWWLKWWLKWWLKWWLKKWWLK.....',
      '.....KWWDKWWLKWWLKWWLKKLWWLK....',
      '....KWWLKKWWLKWWLKWWLK.KWWLK....',
      '....KWWLKKWWLKWWLKWWLK.KWWLK....',
      '....KWWDKKWWLKWWLKWWLK.KLLDK....',
      '...KWWLK.KWWLKWWLKWWLK..KKK.....',
      '...KLLDK.KWWLKWWLKWWLK..........',
      '...KLLDK.KLLDKWWLKWWLK..........',
      '....KKK..KLLDKWWLKLLDK..........',
      '..........KKKKLLDKLLDK..........',
      '.............KLLDKKKK...........',
      '..............KKK...............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },
  hold: {
    hot: [22, 23],
    fallback: 'grabbing',
    frame: 'hand',
    rows: [
      '................................',
      '..........KKKKKKKKKKKK..........',
      '.........KPPPPPPPPPPPQK.........',
      '........KPPPPPPPPPPPPPQK........',
      '........KPPPPPPPPPPPPPQK........',
      '........KQPPPPPPPPPPPQQK........',
      '.........KQQQQQQQQQQQQK.........',
      '..........KKKKKKKKKKKK..........',
      '..........KLLLLLLLLLDK..........',
      '.........KWWWWWWWWWWWLK.........',
      '........KWWWWWWWWWWWWLK.........',
      '.......KWWWWWWWWWWWWWWLK........',
      '......KWWWWWWWWWWWWWLWWLK.......',
      '......KWWWWWWWWWWWWWWLWWLK......',
      '.....KWWWWWWWWWWWWWWWWLWWLK.....',
      '.....KWWWLWWWLWWWLWWWLKWWWLK....',
      '.....KWWLKWWLKWWLKWWLKKKWWLK....',
      '.....KWWLKWWLKWWLKWWLK.KWWLK....',
      '.....KLLDKWWLKWWLKWWLK.KWWLK....',
      '.....KLLDKLLDKWWLKWWLK.KWWLK....',
      '......KKKKLLDKLLDKWWLK.KWWLK....',
      '..........KKKKLLDKLWLK.KWWDK....',
      '..............KKK.KLWLKWWDK.....',
      '...................KLDLLDK......',
      '....................KKKKK.......',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },
};

/** Scale2x / EPX: double the art, rounding staircase corners with existing colors only. */
export function scale2x(rows: readonly string[]): string[] {
  const h = rows.length;
  const w = rows[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x]);
  const out = Array.from({ length: h * 2 }, () => Array<string>(w * 2).fill('.'));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y), a = at(x, y - 1), b = at(x + 1, y), c = at(x - 1, y), d = at(x, y + 1);
      out[y * 2][x * 2] = c === a && c !== d && a !== b ? a : p;
      out[y * 2][x * 2 + 1] = a === b && a !== c && b !== d ? b : p;
      out[y * 2 + 1][x * 2] = d === c && d !== b && c !== a ? c : p;
      out[y * 2 + 1][x * 2 + 1] = b === d && b !== a && d !== c ? d : p;
    }
  }
  return out.map((r) => r.join(''));
}

function check(name: string, rows: readonly string[], size: number) {
  if (rows.length !== size) throw new Error(`${name}: ${rows.length} rows, want ${size}`);
  rows.forEach((row, y) => {
    if (row.length !== size) throw new Error(`${name}: row ${y} is ${row.length} px wide: "${row}"`);
    for (const ch of row) if (ch !== '.' && !PALETTE[ch]) throw new Error(`${name}: unknown pixel "${ch}" in row ${y}`);
  });
}

/** Every glove/cuff pixel is sealed by ink: none touches transparency (or the canvas edge) side-on. */
function sealed(name: string, rows: readonly string[]) {
  const at = (x: number, y: number) => rows[y]?.[x] ?? '.';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.' || row[x] === 'K') continue;
      if ([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes('.')) {
        throw new Error(`${name}: "${row[x]}" at ${x},${y} touches transparency (a gap in the ink outline)`);
      }
    }
  });
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The smallest box on the 32×32 drawing holding every painted pixel and the hotspot. */
function bounds(art: CursorArt): Box {
  let [x0, y0] = art.hot;
  let [x1, y1] = art.hot;
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  });
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** A cursor as shipped: the cropped 1x art, its Scale2x @2x art, and the hotspot in CSS px of the cropped PNG. */
export interface BuiltCursor {
  name: CursorName;
  rows: string[];
  rows2x: string[];
  hot: [number, number];
  /** Where the PNG was cut from the 32×32 drawing. */
  crop: Box;
  fallback: string;
}

/** Check each drawing, crop it to its frame's box (the union of its frame's art), and Scale2x the crop. */
export function build(): BuiltCursor[] {
  const names = Object.keys(CURSORS) as CursorName[];
  const frames = new Map<string, Box>();
  for (const name of names) {
    const art = CURSORS[name];
    check(name, art.rows, SIZE);
    sealed(name, art.rows);
    const [hx, hy] = art.hot;
    if (art.rows[hy]?.[hx] === undefined) throw new Error(`${name}: hotspot ${hx},${hy} is off the 32×32 drawing`);
    const box = frames.get(art.frame);
    frames.set(art.frame, box ? union(box, bounds(art)) : bounds(art));
  }
  return names.map((name) => {
    const art = CURSORS[name];
    const crop = frames.get(art.frame)!;
    const rows = art.rows.slice(crop.y, crop.y + crop.h).map((row) => row.slice(crop.x, crop.x + crop.w));
    const rows2x = scale2x(rows);
    sealed(`${name}@2x`, rows2x);
    return { name, rows, rows2x, hot: [art.hot[0] - crop.x, art.hot[1] - crop.y], crop, fallback: art.fallback };
  });
}

function rgba(rows: readonly string[]): Uint8Array {
  const w = rows[0].length;
  const buf = new Uint8Array(w * rows.length * 4);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const c = PALETTE[row[x]];
      if (c) buf.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
    }
  });
  return buf;
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(bytes: Uint8Array) {
  let c = -1;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
/** Minimal RGBA PNG encoder (8-bit, unfiltered rows, zlib level 9): no image library needed. */
export function png(w: number, h: number, pixels: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) raw.set(pixels.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/**
 * Review sheet (--preview), one column per cursor: the shipped 1x PNG at 8× on light pink (--sakura-1) and on night
 * purple (--night-2), its bitmap shown as a faint checkerboard and the hotspot pixel ringed in red; then the 1x and
 * @2x PNGs at true size on pager pink, cream, Piggy's hair brown and night.
 */
function previewSheet(cursors: readonly BuiltCursor[]): Buffer {
  const Z = 8;
  const PAD = 12;
  const maxW = Math.max(...cursors.map((c) => c.crop.w));
  const maxH = Math.max(...cursors.map((c) => c.crop.h));
  const CELL = maxW * Z + PAD * 2;
  const ZOOM = maxH * Z + PAD * 2;
  const BAND = maxH * 2 + 12;
  const zoomGrounds = [[0xff, 0xe3, 0xea], [0x2a, 0x1d, 0x4a]] as const;
  const grounds = [[0xf6, 0xc9, 0xd8], [0xff, 0xfa, 0xf3], [0x8a, 0x5a, 0x3a], [0x2a, 0x1f, 0x3d]] as const;
  const w = CELL * cursors.length;
  const h = ZOOM * zoomGrounds.length + BAND * grounds.length;
  const px = new Uint8Array(w * h * 4);
  const put = (x: number, y: number, c: readonly number[]) => px.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
  const fill = (x0: number, y0: number, fw: number, fh: number, c: readonly number[]) => {
    for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) put(x, y, c);
  };
  const blit = (rows: readonly string[], x0: number, y0: number, z: number) =>
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = PALETTE[row[x]];
        if (c) fill(x0 + x * z, y0 + y * z, z, z, c);
      }
    });
  zoomGrounds.forEach((ground, g) => {
    fill(0, g * ZOOM, w, ZOOM, ground);
    const dark = ground[0] + ground[1] + ground[2] < 384;
    const tint = ground.map((v) => v + (dark ? 12 : -14));
    cursors.forEach((cur, i) => {
      const ox = i * CELL + PAD;
      const oy = g * ZOOM + PAD;
      for (let y = 0; y < cur.crop.h; y++) for (let x = 0; x < cur.crop.w; x++) if ((x + y) & 1) fill(ox + x * Z, oy + y * Z, Z, Z, tint);
      blit(cur.rows, ox, oy, Z);
      const [hx, hy] = cur.hot;
      for (let d = -2; d < Z + 2; d++) {
        for (const t of [1, 2]) {
          for (const [x, y] of [[d, -t], [d, Z - 1 + t], [-t, d], [Z - 1 + t, d]]) {
            put(ox + hx * Z + x, oy + hy * Z + y, [0xff, 0x20, 0x20]);
          }
        }
      }
    });
  });
  grounds.forEach((ground, g) => {
    const top = ZOOM * zoomGrounds.length + g * BAND;
    fill(0, top, w, BAND, ground);
    cursors.forEach((cur, i) => {
      const ox = i * CELL + PAD;
      blit(cur.rows, ox + 40, top + 6 + Math.floor((maxH * 2 - cur.crop.h) / 2), 1);
      blit(cur.rows2x, ox + 100, top + 6 + (maxH - cur.crop.h), 1);
    });
  });
  return png(w, h, px);
}

/** Warn when src/styles/cursors.css doesn't use these hotspots in all three declarations of a cursor's rule. */
function checkCss(file: string, cursors: readonly BuiltCursor[]) {
  if (!existsSync(file)) return;
  const css = readFileSync(file, 'utf8');
  for (const { name, hot } of cursors) {
    // An optional ?v= version query follows the file name (see the note at the top of cursors.css).
    const declared = new RegExp(`/cursors/${name}(?:@2x)?\\.png(?:\\?[^'")\\s]*)?['"]?\\)(?:\\s+2x\\))?\\s+(\\d+)\\s+(\\d+)`, 'g');
    const found = [...css.matchAll(declared)].map((m) => `${m[1]} ${m[2]}`);
    const want = `${hot[0]} ${hot[1]}`;
    if (found.length !== 3 || found.some((f) => f !== want)) {
      console.warn(`⚠ ${file}: ${name} hotspots are [${found.join(', ')}]; set all three declarations to ${want}`);
    }
  }
}

if (import.meta.main) {
  const here = dirname(fileURLToPath(import.meta.url));
  const outAt = process.argv.indexOf('--out');
  const outDir = resolve(outAt > 0 ? process.argv[outAt + 1] : join(here, '..', 'public', 'cursors'));
  mkdirSync(outDir, { recursive: true });
  const cursors = build();
  for (const { name, rows, rows2x, hot, crop, fallback } of cursors) {
    writeFileSync(join(outDir, `${name}.png`), png(crop.w, crop.h, rgba(rows)));
    writeFileSync(join(outDir, `${name}@2x.png`), png(crop.w * 2, crop.h * 2, rgba(rows2x)));
    console.log(
      `✓ ${name}.png ${crop.w}×${crop.h} + ${name}@2x.png ${crop.w * 2}×${crop.h * 2} (cut at ${crop.x},${crop.y}) — ` +
        `CSS hotspot ${hot[0]} ${hot[1]}, fallback ${fallback}`,
    );
  }
  console.log(`→ ${outDir}`);
  checkCss(join(here, '..', 'src', 'styles', 'cursors.css'), cursors);
  const previewAt = process.argv.indexOf('--preview');
  if (previewAt > 0) {
    const file = resolve(process.argv[previewAt + 1] ?? 'cursors-preview.png');
    writeFileSync(file, previewSheet(cursors));
    console.log(`preview → ${file}`);
  }
}
