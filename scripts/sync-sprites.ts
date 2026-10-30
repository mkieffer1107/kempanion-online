#!/usr/bin/env bun
/**
 * Sprite pack → game-ready pixel sprites.
 *
 * Reads the piggy sprite pack (manifest.json + strips + portraits) WITHOUT modifying it,
 * downsamples everything to 0.5×, hard-thresholds alpha, color-quantizes, packs atlases into
 * public/assets/sprites/, and writes src/generated/sprites.json for the renderer.
 *
 *   bun scripts/sync-sprites.ts /path/to/piggy-sprite-pack
 *   SPRITE_PACK=/path/to/piggy-sprite-pack bun run sync-sprites
 */
import sharp from 'sharp';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCALE = 0.5;
const SRC_FRAME = 256;
const FRAME = SRC_FRAME * SCALE; // 128
const PIVOT = { x: 128 * SCALE, y: 228 * SCALE }; // shared ground pivot
const SRC_PORTRAIT = { w: 384, h: 512 };
const PORTRAIT = { w: SRC_PORTRAIT.w * SCALE, h: SRC_PORTRAIT.h * SCALE }; // 192x256
const CLIPS_PER_PAGE = 8; // anim page = up to 9 frames × 8 rows (≤ 1152 × 1024)
const PORTRAIT_COLS = 4;
const ALPHA_CUT = 120;
const PORTRAIT_COLORS = 128;
const ANIM_COLORS = 128;

const OUTFIT_OF_ALT: Record<string, string> = { volleyball: 'volleyball', scrubs: 'scrubs', hoodie: 'hoodie' };

const pack = resolve(process.argv.slice(2).find((a) => a !== '--') ?? process.env.SPRITE_PACK ?? '');
if (!pack || !existsSync(join(pack, 'manifest.json'))) {
  console.error('usage: bun scripts/sync-sprites.ts <piggy-sprite-pack dir containing manifest.json>');
  process.exit(1);
}
const root = resolve(import.meta.dir, '..');
const outDir = join(root, 'public/assets/sprites');
const genFile = join(root, 'src/generated/sprites.json');

type SrcAnim = { strip?: string; frameFiles?: string[]; frames: number; durationsMs: number[]; loop: boolean; retriggerDelayMs?: number };
type SrcPortrait = { image: string };
type SrcSet = { id: string; animations: Record<string, SrcAnim>; portraits: Record<string, SrcPortrait> };
type SrcChar = SrcSet & { alternate?: SrcSet & { outfit: string } };

const manifest = JSON.parse(readFileSync(join(pack, 'manifest.json'), 'utf8')) as { characters: SrcChar[] };

/** Resize RGBA with high quality, then hard-threshold alpha so edges stay pixel-crisp. */
async function pixelate(input: Buffer | string, w: number, h: number): Promise<Buffer> {
  const { data } = await sharp(input)
    .ensureAlpha()
    .resize(w, h, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= ALPHA_CUT) data[i] = 255;
    else { data[i] = 0; data[i - 1] = 0; data[i - 2] = 0; data[i - 3] = 0; }
  }
  return data;
}

async function writeAtlas(file: string, w: number, h: number, parts: { buf: Buffer; w: number; h: number; x: number; y: number }[], colors: number) {
  const img = sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts.map((p) => ({ input: p.buf, raw: { width: p.w, height: p.h, channels: 4 as const }, left: p.x, top: p.y })));
  // Composite first, then quantize the flattened atlas into an indexed PNG.
  const flat = await img.png().toBuffer();
  await sharp(flat).png({ palette: true, colors, dither: 0, effort: 10, compressionLevel: 9 }).toFile(file);
}

const out: any = {
  version: 1,
  scale: SCALE,
  frame: { w: FRAME, h: FRAME, pivotX: PIVOT.x, pivotY: PIVOT.y },
  portrait: PORTRAIT,
  sets: {} as Record<string, any>,
};

await rm(outDir, { recursive: true, force: true });

async function processSet(pigId: string, outfit: string, set: SrcSet) {
  const key = `${pigId}/${outfit}`;
  const dir = join(outDir, pigId, outfit);
  await mkdir(dir, { recursive: true });
  const rel = (f: string) => `sprites/${pigId}/${outfit}/${f}`;

  // ── portraits ──
  const exprs = Object.keys(set.portraits);
  const rows = Math.ceil(exprs.length / PORTRAIT_COLS);
  const pParts = [] as { buf: Buffer; w: number; h: number; x: number; y: number }[];
  const cells: Record<string, [number, number]> = {};
  for (const [i, ex] of exprs.entries()) {
    const buf = await pixelate(join(pack, set.portraits[ex].image), PORTRAIT.w, PORTRAIT.h);
    const x = (i % PORTRAIT_COLS) * PORTRAIT.w, y = Math.floor(i / PORTRAIT_COLS) * PORTRAIT.h;
    pParts.push({ buf, w: PORTRAIT.w, h: PORTRAIT.h, x, y });
    cells[ex] = [x, y];
  }
  await writeAtlas(join(dir, 'portraits.png'), PORTRAIT_COLS * PORTRAIT.w, rows * PORTRAIT.h, pParts, PORTRAIT_COLORS);

  // ── face icon (head crop of the neutral portrait) ──
  const neutral = set.portraits['neutral']?.image;
  if (neutral) {
    const crop = await sharp(join(pack, neutral)).extract({ left: 42, top: 6, width: 300, height: 300 }).png().toBuffer();
    const face = await pixelate(crop, 48, 48);
    await sharp(face, { raw: { width: 48, height: 48, channels: 4 } }).png({ palette: true, colors: 48, dither: 0 }).toFile(join(dir, 'face.png'));
  }

  // ── animations ──
  const clips = Object.keys(set.animations);
  const anims: Record<string, any> = {};
  for (let page = 0; page * CLIPS_PER_PAGE < clips.length; page++) {
    const pageClips = clips.slice(page * CLIPS_PER_PAGE, (page + 1) * CLIPS_PER_PAGE);
    const parts = [] as { buf: Buffer; w: number; h: number; x: number; y: number }[];
    for (const [row, clip] of pageClips.entries()) {
      const a = set.animations[clip];
      const n = a.frames;
      let strip: Buffer;
      if (a.strip && existsSync(join(pack, a.strip))) {
        strip = await pixelate(join(pack, a.strip), FRAME * n, FRAME);
      } else {
        // fall back to individual frames
        const frames = await Promise.all((a.frameFiles ?? []).map((f) => pixelate(join(pack, f), FRAME, FRAME)));
        const tmp = sharp({ create: { width: FRAME * n, height: FRAME, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite(frames.map((buf, i) => ({ input: buf, raw: { width: FRAME, height: FRAME, channels: 4 as const }, left: i * FRAME, top: 0 })));
        strip = await tmp.raw().toBuffer();
      }
      parts.push({ buf: strip, w: FRAME * n, h: FRAME, x: 0, y: row * FRAME });
      anims[clip] = {
        page: rel(`anim-${page}.png`), y: row * FRAME, frames: n, durations: a.durationsMs, loop: a.loop,
        ...(a.retriggerDelayMs ? { retriggerDelayMs: a.retriggerDelayMs } : {}),
      };
    }
    // Clips have 4–9 frames; size the page to its longest strip.
    const pageFrames = Math.max(6, ...pageClips.map((c) => set.animations[c].frames));
    await writeAtlas(join(dir, `anim-${page}.png`), FRAME * pageFrames, pageClips.length * FRAME, parts, ANIM_COLORS);
  }

  // ── extra clips made for the game (art-src/sprites-extra/<pig>/<outfit>/<clip>/NN.png + meta.json) ──
  const extraDir = join(root, 'art-src/sprites-extra', pigId, outfit);
  const extraClips = existsSync(extraDir)
    ? readdirSync(extraDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  if (extraClips.length) {
    const parts = [] as { buf: Buffer; w: number; h: number; x: number; y: number }[];
    for (const [row, clip] of extraClips.entries()) {
      const clipDir = join(extraDir, clip);
      const files = readdirSync(clipDir).filter((f) => /^\d+\.png$/.test(f)).sort();
      const meta = existsSync(join(clipDir, 'meta.json')) ? JSON.parse(readFileSync(join(clipDir, 'meta.json'), 'utf8')) : {};
      const frames = await Promise.all(files.map((f) => pixelate(join(clipDir, f), FRAME, FRAME)));
      const strip = await sharp({ create: { width: FRAME * 6, height: FRAME, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(frames.slice(0, 6).map((buf, i) => ({ input: buf, raw: { width: FRAME, height: FRAME, channels: 4 as const }, left: i * FRAME, top: 0 })))
        .raw()
        .toBuffer();
      parts.push({ buf: strip, w: FRAME * 6, h: FRAME, x: 0, y: row * FRAME });
      const n = Math.min(6, frames.length);
      anims[clip] = {
        page: rel('extra-0.png'), y: row * FRAME, frames: n,
        durations: (meta.durationsMs ?? Array(n).fill(120)).slice(0, n), loop: meta.loop ?? true,
      };
    }
    await writeAtlas(join(dir, 'extra-0.png'), FRAME * 6, extraClips.length * FRAME, parts, ANIM_COLORS);
  }

  out.sets[key] = {
    portraitAtlas: rel('portraits.png'),
    portraits: cells,
    face: neutral ? rel('face.png') : null,
    anims,
  };
  console.log(`✓ ${key}: ${exprs.length} portraits, ${clips.length} clips`);
}

for (const c of manifest.characters) {
  await processSet(c.id, 'everyday', c);
  if (c.alternate) await processSet(c.id, OUTFIT_OF_ALT[c.alternate.outfit] ?? c.alternate.outfit, c.alternate);
}

await mkdir(join(root, 'src/generated'), { recursive: true });
await writeFile(genFile, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${genFile}`);
