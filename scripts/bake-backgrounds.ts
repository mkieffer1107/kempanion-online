#!/usr/bin/env bun
/**
 * Generated art → exact pixel grid.
 *
 * Every PNG in art-src/raw/bg (1536x1024 from the image model) is cropped to 16:9, box-downsampled
 * to 480x270 and quantized to an indexed palette, then written to public/assets/bg/<id>.png.
 * CGs in art-src/raw/cg go to public/assets/cg/. Per-image overrides live in art-src/bg/crop.json:
 *   { "<id>": { "focusY": 0.6, "colors": 64, "w": 480, "h": 320 } }   focusY: 0 = keep top, 1 = keep bottom
 *
 *   bun scripts/bake-backgrounds.ts [id ...]
 */
import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const W = 480;
const H = 270;
const DEFAULT_COLORS = 64;

const root = resolve(import.meta.dir, '..');
const jobs = [
  { src: join(root, 'art-src/raw/bg'), dst: join(root, 'public/assets/bg') },
  { src: join(root, 'art-src/raw/cg'), dst: join(root, 'public/assets/cg') },
];
const cropFile = join(root, 'art-src/bg/crop.json');
const overrides: Record<string, { focusY?: number; colors?: number; w?: number; h?: number }> = existsSync(cropFile)
  ? JSON.parse(readFileSync(cropFile, 'utf8'))
  : {};
const only = new Set(process.argv.slice(2));

for (const { src, dst } of jobs) {
  if (!existsSync(src)) continue;
  await mkdir(dst, { recursive: true });
  for (const f of (await readdir(src)).filter((f) => f.endsWith('.png')).sort()) {
    const id = basename(f, '.png');
    if (only.size && !only.has(id)) continue;
    const o = overrides[id] ?? overrides[id.replace(/_night$/, '')] ?? {};
    const img = sharp(join(src, f));
    const meta = await img.metadata();
    const sw = meta.width!, sh = meta.height!;
    const w = o.w ?? W, h = o.h ?? H;
    let left = 0, top = 0, cw = sw, ch = sh;
    if (sw / sh > w / h) { cw = Math.round(sh * (w / h)); left = Math.round((sw - cw) / 2); }
    else { ch = Math.round(sw / (w / h)); top = Math.round((sh - ch) * (o.focusY ?? 0.5)); }
    const out = join(dst, `${id}.png`);
    await img
      .extract({ left, top, width: cw, height: ch })
      .resize(w, h, { kernel: 'linear', fit: 'fill' })
      .png({ palette: true, colors: o.colors ?? DEFAULT_COLORS, dither: 0, effort: 10, compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${id} → ${out.replace(root + '/', '')}`);
  }
}

// Index of what exists, so the renderer knows which ids have night variants.
const index: { bg: string[]; cg: string[] } = { bg: [], cg: [] };
for (const [key, dir] of [['bg', join(root, 'public/assets/bg')], ['cg', join(root, 'public/assets/cg')]] as const) {
  if (existsSync(dir)) index[key] = (await readdir(dir)).filter((f) => f.endsWith('.png')).map((f) => basename(f, '.png')).sort();
}
await mkdir(join(root, 'src/generated'), { recursive: true });
await writeFile(join(root, 'src/generated/backgrounds.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`indexed ${index.bg.length} backgrounds, ${index.cg.length} CGs`);
