#!/usr/bin/env bun
/**
 * Pixel-art "mumble" bubbles for Piggy 3's Deku-style mumbling in Talk mode → <out>/mumble-*.png.
 *
 * While his quiet, run-on mumble types out in the dialogue box, small cloud bubbles carrying its AI buzzwords
 * ("RLHF…", "JEPA?!", "foundation mo—") pop up around his portrait, drift up a little and fade, a few at once.
 * The bubble is a 9-slice, so one PNG fits any word:
 *
 *   mumble-<palette>.png        24×18 9-slice source. border-image-slice 8 (all sides) fill. The 8×8 corners are
 *                               rounded puffs; the 8-px top and bottom edge tiles are one puff each (a two-step arc),
 *                               the bottom puffs staggered half a puff against the top ones so the edge reads as a
 *                               cloud, not a postage stamp. Repeat the edges with `round`: a width of 16 + 8·m art px
 *                               repeats them exactly m times. The left/right band is a straight line (stretch).
 *                               One text line = 16 art px tall, two lines = 24.
 *   mumble-tail-<palette>-dl.png  5×4 tail pointing down-left (for a bubble on the pig's right); -dr is its mirror.
 *                               Its top row overlaps the bubble's last row 4 art px in from that side: its ink lands on
 *                               the bottom puff's outline and its shade pixels open the outline into the tail.
 *   mumble-<palette>-s|m|l.png  the cloud assembled at fixed sizes (32×16, 40×16, 56×24, no tail) for previews and
 *                               for places that can't use border-image.
 *
 * Palettes (the game's UI tokens, src/styles/global.css):
 *   lilac  ink outline, cool white fill, white top bevel, two lavender rows of bottom shade (Piggy 3's colour family;
 *          text #2e2142). The one Talk uses.
 *   paper  ink outline, --paper fill, white top bevel, two warm rows of bottom shade (the stage speech bubble's colours)
 *   night  ink outer ring, lavender inner ring, 90% --night-2 fill (a tiny copy of the VN text box; text #fffaf3)
 *
 * 1 art pixel = 1 PNG pixel. The page draws one art pixel as one UI pixel, var(--px) (2 CSS px on phones, 3 elsewhere),
 * with image-rendering: pixelated, so every edge stays on the UI's own pixel grid. Shading is derived from the mask
 * (top inner edge = bevel, bottom inner edges = shade), so redrawing the mask keeps the lighting consistent.
 *
 *   bun scripts/make-bubbles.ts --out <dir>                    write the PNGs (no default: pass the folder, e.g.
 *                                                              src/lib/ui/components/mumble — Vite inlines files
 *                                                              this small, so they work offline with no extra request)
 *   bun scripts/make-bubbles.ts --out <dir> --preview <file>   also write a review sheet (source and tail at 8× with
 *                                                              the slice lines, the fixed sizes at 4× with tails, then
 *                                                              2× and 3× on sky, cream, sakura and night grounds)
 *   --palettes lilac,paper                                     only some palettes
 *   --slice-only                                               only the 9-slice and its tails (no fixed sizes)
 *
 * Where they live: Talk's mumble (src/lib/vn/components/MumbleBubbles.svelte) loads public/assets/mumble/
 * (`--out public/assets/mumble --palettes lilac --slice-only`); For You Pig imports its own copy from
 * src/lib/minigames/xfeed/mumble/.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Rgba = readonly [number, number, number, number];

interface Palette {
  /** Outline (outer ring). */
  K: Rgba;
  /** Fill. */
  W: Rgba;
  /** Light palettes: top inner edge. Night: the whole inner ring. */
  H: Rgba;
  /** Light palettes: bottom inner edge (and the tail's inside). Night: unused (same as H). */
  S: Rgba;
  /** Light palettes: the row above the bottom inner edge (a second, lighter shade: volume, like a cloud's belly). */
  S2: Rgba;
  /** Night-style shading: every fill pixel touching the outline gets H (an inner ring), no top/bottom split. */
  ring: boolean;
  /** CSS text colour the page should use on this palette (printed, not drawn). */
  text: string;
}

const hex = (h: string, a = 255): Rgba => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];

export const PALETTES: Record<string, Palette> = {
  lilac: { K: hex('#1b1229'), W: hex('#f8f3ff'), H: hex('#ffffff'), S: hex('#d9c8f8'), S2: hex('#ece3fc'), ring: false, text: '#2e2142' },
  paper: { K: hex('#1b1229'), W: hex('#fff6ea'), H: hex('#ffffff'), S: hex('#ecd8be'), S2: hex('#f7ebdb'), ring: false, text: '#1b1229' },
  night: { K: hex('#1b1229'), W: hex('#2a1d4a', 230), H: hex('#d0b8f6'), S: hex('#d0b8f6'), S2: hex('#2a1d4a', 230), ring: true, text: '#fffaf3' },
};

/** Corner size (border-image-slice), edge scallop period, straight side band height in the source. */
export const CORNER = 8;
export const SCALLOP = 8;
const BAND = 2;

/**
 * Masks: K outline · W inside · '.' outside. The left corners and the edge tiles are drawn; the right corners are
 * mirrors. Every edge tile meets its corners the same way: on top the corner's last column and the tile's first column
 * are both [., ., K, W…] (a 2-px notch between puffs), at the bottom both are [W…, K] (a puff's flat underside).
 * A puff rises in two steps (1 px, then 2 px across, then a 2-px top) so it reads round at 4–6 device px per art px;
 * single 1-px stairs read as square teeth (a postage-stamp edge) at that size.
 */
const TL = [
  '...KK...',
  '..KWWKK.',
  '.KWWWWWK',
  '.KWWWWWW',
  'KWWWWWWW',
  'KWWWWWWW',
  'KWWWWWWW',
  '.KWWWWWW',
];
const TOP = [
  '...KK...',
  '.KKWWKK.',
  'KWWWWWWK',
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWWWWWW',
];
/** Bottom-left corner and bottom tile: the tile starts and ends under a puff, its notch sits mid-tile. The corners'
 *  1-px indents where they meet (TL's last row, BL's first) give each round end two puffs. */
const BL = [
  '.KWWWWWW',
  'KWWWWWWW',
  'KWWWWWWW',
  'KWWWWWWW',
  '.KWWWWWW',
  '.KWWWWWW',
  '..KKWWWW',
  '....KKKK',
];
const BOTTOM = [
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWWWWWW',
  'WWWKKWWW',
  'WKK..KKW',
  'K......K',
];

/**
 * Tail pointing down-left: K ink · S the bubble's bottom shade (the night palette's ring colour) · '.' clear. Row 0
 * sits on the bubble's last row at x = TAIL_INSET…TAIL_INSET+4, which is the first bottom puff's flat underside on
 * every width (the BL corner's KKKK plus the bottom tile's first K), so its K pixels repeat the outline there and its
 * S pixels open it; the straight side is the inner one, the stepped side leans toward the pig.
 */
const TAIL = ['KSSSK', 'KSSK.', 'KSK..', 'KK...'];
/** Tail offset from the bubble's left edge (down-left tail) or right edge (down-right tail), in art px. */
export const TAIL_INSET = 4;
export const TAIL_W = TAIL[0].length;
export const TAIL_H = TAIL.length;

const mirrorX = (rows: readonly string[]) => rows.map((r) => [...r].reverse().join(''));

/** A cloud mask `m` puffs wide (width 16 + 8m) and `band` rows of straight side between the top and bottom halves. */
export function cloudMask(m: number, band: number): string[] {
  const tr = mirrorX(TL);
  const br = mirrorX(BL);
  const top = TL.map((row, y) => row + TOP[y].repeat(m) + tr[y]);
  const bottom = BL.map((row, y) => row + BOTTOM[y].repeat(m) + br[y]);
  const side = 'K' + 'W'.repeat(CORNER - 1 + SCALLOP * m + CORNER - 1) + 'K';
  return [...top, ...Array.from({ length: band }, () => side), ...bottom];
}

/** The 9-slice source: one scallop and BAND rows of side, so every slice exists exactly once. */
export const sourceMask = () => cloudMask(1, BAND);

/** Validate a mask: rectangular, known characters, and no inside pixel touching the outside (a closed outline). */
function check(name: string, rows: readonly string[]) {
  const w = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${name}: row ${y} is ${row.length} wide, expected ${w}`);
    if (/[^KW.]/.test(row)) throw new Error(`${name}: row ${y} has an unknown pixel: ${row}`);
    for (let x = 0; x < w; x++) {
      if (row[x] !== 'W') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = rows[y + dy]?.[x + dx];
        if (n === undefined || n === '.') throw new Error(`${name}: inside pixel ${x},${y} leaks to the outside`);
      }
    }
  });
}

/** The tail must sit on a flat run of outline (K at TAIL_INSET…+4 on the bubble's last row) and be closed below. */
function checkTail(bubble: readonly string[]) {
  const last = bubble[bubble.length - 1];
  const under = last.slice(TAIL_INSET, TAIL_INSET + TAIL_W);
  if (under !== 'K'.repeat(TAIL_W)) throw new Error(`tail: bubble's last row under the tail is "${under}", not solid outline`);
  const right = [...last].reverse().join('').slice(TAIL_INSET, TAIL_INSET + TAIL_W);
  if (right !== 'K'.repeat(TAIL_W)) throw new Error(`tail: mirrored spot on the bubble's last row is "${right}"`);
  TAIL.forEach((row, y) => {
    if (row.length !== TAIL_W) throw new Error(`tail: row ${y} is ${row.length} wide`);
    for (let x = 0; x < TAIL_W; x++) {
      if (row[x] !== 'S') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
        const n = TAIL[y + dy]?.[x + dx];
        if (n === undefined || n === '.') throw new Error(`tail: inside pixel ${x},${y} leaks to the outside`);
      }
    }
  });
}

/**
 * Mask → RGBA with the palette's shading (`bead`: a dot, solid inner colour on ring palettes). Rows in `flat` get no
 * bevel or shade (ring palettes keep their ring, which is the same on every row): the 9-slice source's side band is
 * stretched over the height of a second text line, so a bevel pixel there would become a stripe.
 */
export function paint(
  rows: readonly string[],
  pal: Palette,
  bead = false,
  flat: ReadonlySet<number> = new Set(),
): { w: number; h: number; px: Uint8Array } {
  const w = rows[0].length;
  const h = rows.length;
  const px = new Uint8Array(w * h * 4);
  const at = (x: number, y: number) => rows[y]?.[x] ?? '.';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c === '.') continue;
      let col: Rgba = c === 'K' ? pal.K : pal.W;
      if (c === 'W' && (pal.ring || !flat.has(y))) {
        if (pal.ring) {
          if (bead || [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].includes('K')) col = pal.H;
        } else if (at(x, y - 1) === 'K') col = pal.H;
        else if (at(x, y + 1) === 'K') col = pal.S;
        else if (!bead && at(x, y + 2) === 'K') col = pal.S2;
      }
      px.set(col, (y * w + x) * 4);
    }
  }
  return { w, h, px };
}

/** The tail in a palette; `mirror` gives the down-right one. */
function paintTail(pal: Palette, mirror: boolean): { w: number; h: number; px: Uint8Array } {
  const rows = mirror ? mirrorX(TAIL) : TAIL;
  const inside = pal.ring ? pal.H : pal.S;
  const px = new Uint8Array(TAIL_W * TAIL_H * 4);
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '.') px.set(c === 'K' ? pal.K : inside, (y * TAIL_W + x) * 4);
  }));
  return { w: TAIL_W, h: TAIL_H, px };
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
/** Minimal RGBA PNG encoder (8-bit, unfiltered rows, zlib level 9), as in make-cursors.ts: no image library. */
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

/** Fixed sizes: scallops and side-band rows (s/m one text line, l two lines). */
export const SIZES = { s: { m: 2, band: 0 }, m: { m: 3, band: 0 }, l: { m: 5, band: 8 } } as const;

interface Sprite { name: string; w: number; h: number; px: Uint8Array }

export function build(palettes: readonly string[], { fixed = true }: { fixed?: boolean } = {}): Sprite[] {
  const out: Sprite[] = [];
  const src = sourceMask();
  check('source', src);
  checkTail(src);
  for (const [k, s] of Object.entries(SIZES)) {
    check(`size ${k}`, cloudMask(s.m, s.band));
    checkTail(cloudMask(s.m, s.band));
  }
  for (const p of palettes) {
    const pal = PALETTES[p];
    if (!pal) throw new Error(`unknown palette ${p} (have ${Object.keys(PALETTES).join(', ')})`);
    out.push({ name: `mumble-${p}`, ...paint(src, pal, false, new Set(Array.from({ length: BAND }, (_, i) => CORNER + i))) });
    out.push({ name: `mumble-tail-${p}-dl`, ...paintTail(pal, false) });
    out.push({ name: `mumble-tail-${p}-dr`, ...paintTail(pal, true) });
    if (!fixed) continue;
    for (const [k, s] of Object.entries(SIZES)) out.push({ name: `mumble-${p}-${k}`, ...paint(cloudMask(s.m, s.band), pal) });
  }
  return out;
}

/**
 * Review sheet: one band per palette. Left (on a checkerboard): the 9-slice source at 8× with the slice lines in red
 * and its down-left tail in place, then s and m at 4× with tails and l under them. Right: s, m and l with tails at
 * true size, 2× and 3× (phone and desktop UI pixels), on sky, cream, sakura and night grounds.
 */
function previewSheet(sprites: readonly Sprite[], palettes: readonly string[]): Buffer {
  const grounds: Rgba[] = [hex('#8fc3ea'), hex('#fff6ea'), hex('#ffb7c5'), hex('#1a1030')];
  const BANDH = 232;
  const LEFT = 600;
  const CELL = 420;
  const W = LEFT + 8 + CELL * grounds.length;
  const H = BANDH * palettes.length + 8;
  const px = new Uint8Array(W * H * 4);
  const put = (x: number, y: number, c: Rgba) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    const a = c[3] / 255;
    for (let k = 0; k < 3; k++) px[i + k] = Math.round(c[k] * a + px[i + k] * (1 - a));
    px[i + 3] = 255;
  };
  const fill = (x0: number, y0: number, w: number, h: number, c: Rgba) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, c);
  };
  const blit = (s: Sprite, x0: number, y0: number, z: number) => {
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        const i = (y * s.w + x) * 4;
        if (s.px[i + 3]) fill(x0 + x * z, y0 + y * z, z, z, [s.px[i], s.px[i + 1], s.px[i + 2], s.px[i + 3]]);
      }
    }
  };
  /** A bubble with its tail where the page puts it: TAIL_INSET in from the tail side, top row on the bubble's last. */
  const withTail = (b: Sprite, t: Sprite, side: 'dl' | 'dr', x0: number, y0: number, z: number) => {
    blit(b, x0, y0, z);
    const tx = side === 'dl' ? TAIL_INSET : b.w - TAIL_INSET - TAIL_W;
    blit(t, x0 + tx * z, y0 + (b.h - 1) * z, z);
  };
  const get = (n: string) => sprites.find((s) => s.name === n)!;
  const red: Rgba = [255, 40, 40, 255];
  fill(0, 0, W, H, hex('#3a2a5e'));
  palettes.forEach((p, i) => {
    const top = 8 + i * BANDH;
    // checkerboard behind the zoomed art so transparency shows
    for (let y = 0; y < BANDH - 8; y += 8) {
      for (let x = 0; x < LEFT - 8; x += 8) fill(8 + x, top + y, 8, 8, ((x + y) / 8) % 2 ? hex('#d9d2e6') : hex('#efeaf6'));
    }
    const src = get(`mumble-${p}`);
    const dl = get(`mumble-tail-${p}-dl`);
    const dr = get(`mumble-tail-${p}-dr`);
    withTail(src, dl, 'dl', 16, top + 8, 8);
    for (const sx of [CORNER, src.w - CORNER]) fill(16 + sx * 8 - 1, top + 8, 2, src.h * 8, red);
    for (const sy of [CORNER, src.h - CORNER]) fill(16, top + 8 + sy * 8 - 1, src.w * 8, 2, red);
    const s = get(`mumble-${p}-s`);
    const m = get(`mumble-${p}-m`);
    const l = get(`mumble-${p}-l`);
    const x0 = 16 + src.w * 8 + 16;
    withTail(s, dl, 'dl', x0, top + 8, 4);
    withTail(m, dr, 'dr', x0 + s.w * 4 + 12, top + 8, 4);
    withTail(l, dl, 'dl', x0, top + 8 + (s.h + TAIL_H) * 4 + 8, 4);
    // true size at 2× (phones) and 3× (desktop): s and m side by side, l under them
    grounds.forEach((g, gi) => {
      const gx = LEFT + 8 + gi * CELL;
      fill(gx, top, CELL - 8, BANDH - 8, g);
      let cx = gx + 8;
      for (const z of [2, 3]) {
        let y = top + 8;
        withTail(s, dl, 'dl', cx, y, z);
        withTail(m, dr, 'dr', cx + (s.w + 2) * z, y, z);
        y += (s.h + TAIL_H + 2) * z;
        withTail(l, dl, 'dl', cx + 4 * z, y, z);
        cx += (s.w + 2 + m.w) * z + 10;
      }
    });
  });
  return png(W, H, px);
}

if (import.meta.main) {
  const arg = (flag: string) => {
    const i = process.argv.indexOf(flag);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const outArg = arg('--out');
  if (!outArg) {
    console.error('usage: bun scripts/make-bubbles.ts --out <dir> [--preview <file>] [--palettes lilac,paper,night] [--slice-only]');
    process.exit(2);
  }
  const outDir = resolve(outArg);
  const palettes = (arg('--palettes') ?? Object.keys(PALETTES).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  const sliceOnly = process.argv.includes('--slice-only');
  if (sliceOnly && arg('--preview')) {
    console.error('--preview draws the fixed sizes: leave out --slice-only');
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });
  const sprites = build(palettes, { fixed: !sliceOnly });
  for (const s of sprites) writeFileSync(join(outDir, `${s.name}.png`), png(s.w, s.h, s.px));
  console.log(`✓ ${sprites.length} PNGs → ${outDir}`);
  console.log(`  9-slice: border-image: url(mumble-<palette>.png) ${CORNER} fill / calc(${CORNER} * var(--px)) / 0 round stretch;`);
  console.log(`  width = (16 + ${SCALLOP}·m) art px repeats the puff exactly m times; height 16 (1 line) or 24 (2 lines).`);
  console.log(`  tail: ${TAIL_W}×${TAIL_H}, ${TAIL_INSET} art px in from the tail side, top row on the bubble's last row.`);
  for (const p of palettes) console.log(`  ${p}: text ${PALETTES[p].text}`);
  const prev = arg('--preview');
  if (prev) {
    const file = resolve(prev);
    writeFileSync(file, previewSheet(sprites, palettes));
    console.log(`preview → ${file}`);
  }
}
