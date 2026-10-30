// Backgrounds → graded 480x270 canvases per time of day (cached), CG canvases, and placeholders for
// anything not painted yet.
import { CHARACTERS } from '../content/characters';
import { LOCATIONS } from '../content/locations';
import type { PigId, TimeOfDay } from '../types';
import { context2d, hasBackground, hasCG, hasNightVariant, loadImage, makeCanvas } from './assets';
import { gradePixels } from './grade';
import { BG_H, BG_W } from './layout';
import { paintPlaceholderBackground, paintPlaceholderCG, type CGFace } from './placeholder';
import { resolvePortrait } from './sprites';

/** Already lit for a fixed time of day (or not a place): never graded. */
const NEVER_GRADED = new Set(['title', 'map', 'midtown', 'legend_sakura']);
/** Placeholder lighting for ungraded ids that belong to a particular hour. */
const PLACEHOLDER_TOD: Record<string, TimeOfDay> = { title: 'evening', legend_sakura: 'evening', midtown: 'night' };
/** Interiors: lights are on whatever the hour (unless a painted night variant says otherwise). */
const INDOOR = new Set<string>();
for (const l of Object.values(LOCATIONS)) {
  if (!l.outdoor) INDOOR.add(l.bg);
  if (l.interior) INDOOR.add(l.interior);
}

/**
 * Draw an image to fill the 480x270 frame, preserving its aspect (center crop). Paintings that are
 * not 16:9 (the 3:2 campus map) are cropped 1:1 instead of being squashed.
 */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const iw = img.naturalWidth || img.width || BG_W;
  const ih = img.naturalHeight || img.height || BG_H;
  const k = Math.max(BG_W / iw, BG_H / ih);
  const sw = BG_W / k, sh = BG_H / k;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, BG_W, BG_H);
}

/** Whether a background id gets time-of-day grading by default. */
export function shouldGrade(id: string): boolean {
  if (id.endsWith('_night') || NEVER_GRADED.has(id)) return false;
  if (hasNightVariant(id)) return true;
  return !INDOOR.has(id);
}

/** The location whose daytime background is `id` (for focusX / names). */
export function locationForBackground(id: string) {
  for (const l of Object.values(LOCATIONS)) if (l.bg === id) return l;
  return undefined;
}

const cache = new Map<string, HTMLCanvasElement>();
const pending = new Map<string, Promise<HTMLCanvasElement>>();
const MAX_CACHED = 10;

function remember(key: string, c: HTMLCanvasElement) {
  cache.delete(key);
  cache.set(key, c);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
}

function memo(key: string, build: () => Promise<HTMLCanvasElement>): Promise<HTMLCanvasElement> {
  const hit = cache.get(key);
  if (hit) {
    remember(key, hit);
    return Promise.resolve(hit);
  }
  let p = pending.get(key);
  if (!p) {
    p = build().then((c) => {
      pending.delete(key);
      remember(key, c);
      return c;
    });
    pending.set(key, p);
  }
  return p;
}

/** A 480x270 canvas with the background graded for `tod` (painted night variant, blend or synthesis). */
export function backgroundCanvas(id: string, tod: TimeOfDay, grade?: boolean): Promise<HTMLCanvasElement> {
  return memo(`${id}|${tod}|${grade ?? ''}`, () => buildBackground(id, tod, grade));
}

async function buildBackground(id: string, tod: TimeOfDay, grade?: boolean): Promise<HTMLCanvasElement> {
  const canvas = makeCanvas(BG_W, BG_H);
  const ctx = context2d(canvas, { willReadFrequently: true });
  const graded = grade ?? shouldGrade(id);
  const placeholder = () => {
    paintPlaceholderBackground(ctx, id, graded ? tod : (PLACEHOLDER_TOD[id] ?? 'day'), BG_W, BG_H);
    return canvas;
  };
  if (!hasBackground(id)) return placeholder();
  const wantNight = graded && (tod === 'night' || tod === 'evening') && hasNightVariant(id);
  const [day, night] = await Promise.all([
    loadImage(`bg/${id}.png`),
    wantNight ? loadImage(`bg/${id}_night.png`) : Promise.resolve(null),
  ]);
  if (!day) return placeholder();
  if (!graded || tod === 'day') {
    drawCover(ctx, day);
    return canvas;
  }
  if (tod === 'night' && night) {
    drawCover(ctx, night);
    return canvas;
  }
  let nightPx: Uint8ClampedArray | null = null;
  if (night) {
    drawCover(ctx, night);
    nightPx = ctx.getImageData(0, 0, BG_W, BG_H).data;
  }
  ctx.clearRect(0, 0, BG_W, BG_H);
  drawCover(ctx, day);
  const dayPx = ctx.getImageData(0, 0, BG_W, BG_H).data;
  const out = ctx.createImageData(BG_W, BG_H);
  gradePixels(tod, dayPx, nightPx, BG_W, BG_H, out.data);
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Warm the cache for a background (both the day image and the variant for `tod`). */
export function preloadBackground(id: string, tod: TimeOfDay): Promise<void> {
  return backgroundCanvas(id, tod).then(() => undefined);
}

// ── CGs ──

const CG_PIGS: Record<string, PigId[]> = {
  p1: ['piggy-1'],
  p2: ['piggy-2'],
  p3: ['piggy-3'],
  trio: ['piggy-1', 'piggy-2', 'piggy-3'],
};

/** "cg_p1_petal_dive" → { pigs: [piggy-1], title: "Petal Dive" }. */
export function describeCG(id: string): { pigs: PigId[]; title: string } {
  const parts = id.replace(/^cg_/, '').split('_').filter(Boolean);
  const pigs = CG_PIGS[parts[0]] ?? [];
  const words = pigs.length ? parts.slice(1) : parts;
  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Memory';
  return { pigs, title };
}

async function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const load = Promise.all([document.fonts.load('16px "DotGothic16"'), document.fonts.load('12px "Pixelify Sans"')]).then(() => undefined, () => undefined);
  await Promise.race([load, new Promise<void>((r) => setTimeout(r, 1200))]);
}

/** The CG image (public/assets/cg/<id>.png), or a polaroid placeholder card. */
export function cgCanvas(id: string): Promise<HTMLCanvasElement> {
  return memo(`cg|${id}`, async () => {
    const canvas = makeCanvas(BG_W, BG_H);
    const ctx = context2d(canvas);
    if (hasCG(id)) {
      const img = await loadImage(`cg/${id}.png`);
      if (img) {
        drawCover(ctx, img);
        return canvas;
      }
    }
    const { pigs, title } = describeCG(id);
    const faces: CGFace[] = [];
    for (const pig of pigs) {
      const ref = resolvePortrait(pig, 'everyday', 'happy');
      const img = await loadImage(ref.atlas);
      if (img) faces.push({ img, sx: ref.x, sy: ref.y });
    }
    await fontsReady();
    const who = pigs.length === 3 ? 'The Pig Pen' : pigs.map((p) => CHARACTERS[p].name).join(' & ');
    paintPlaceholderCG(ctx, id, title, who ? `${who} · a memory` : 'a memory', faces, BG_W, BG_H);
    return canvas;
  });
}
