// Minimal sprite-atlas reader for the mini-games (src/generated/sprites.json + public/assets/sprites).
import raw from '../../../generated/sprites.json';
import type { OutfitId, PigId } from '../../types';

export interface ClipDef { page: string; y: number; frames: number; durations: number[]; loop: boolean }
interface SetDef { face: string; anims: Record<string, ClipDef> }
interface Atlas { frame: { w: number; h: number; pivotX: number; pivotY: number }; sets: Record<string, SetDef> }

const atlas = raw as unknown as Atlas;
export const FRAME = atlas.frame;

/** Frames that came out blank or ghosted in the generated sheets. */
const SKIP_FRAMES: Record<string, number[]> = {
  'piggy-1/volleyball:volleyball_set': [3],
  'piggy-1/volleyball:volleyball_spike': [3],
};

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}

const ready = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

/** Load an image once; resolves null on error (callers draw a placeholder). */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  const hit = ready.get(url);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        ready.set(url, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    pending.set(url, p);
  }
  return p;
}

/** First background in the list that exists (e.g. a location that is still being painted falls back). */
export async function loadBackground(ids: string[]): Promise<HTMLImageElement | null> {
  for (const id of ids) {
    const img = await loadImage(assetUrl(`bg/${id}.png`));
    if (img) return img;
  }
  return null;
}

export function faceUrl(pig: PigId, outfit: OutfitId = 'everyday'): string {
  const set = atlas.sets[`${pig}/${outfit}`] ?? atlas.sets[`${pig}/everyday`];
  return assetUrl(set.face);
}

interface Clip { def: ClipDef; frames: number[]; durations: number[]; total: number }

export class Sprite {
  readonly key: string;
  private set: SetDef;
  private clips = new Map<string, Clip>();

  constructor(pig: PigId, outfit: OutfitId = 'everyday') {
    this.key = atlas.sets[`${pig}/${outfit}`] ? `${pig}/${outfit}` : `${pig}/everyday`;
    this.set = atlas.sets[this.key];
  }

  has(anim: string): boolean {
    return !!this.set.anims[anim];
  }

  clip(anim: string): Clip | null {
    const cached = this.clips.get(anim);
    if (cached) return cached;
    const def = this.set.anims[anim];
    if (!def) return null;
    const skip = SKIP_FRAMES[`${this.key}:${anim}`] ?? [];
    const frames: number[] = [];
    const durations: number[] = [];
    for (let i = 0; i < def.frames; i++) {
      if (skip.includes(i)) continue;
      frames.push(i);
      durations.push(def.durations[i] ?? 100);
    }
    const clip = { def, frames, durations, total: durations.reduce((a, b) => a + b, 0) };
    this.clips.set(anim, clip);
    return clip;
  }

  /** Total clip length in ms (0 if missing). */
  duration(anim: string): number {
    return this.clip(anim)?.total ?? 0;
  }

  /** Time into the clip at which a given source frame starts (for lining up contact frames). */
  frameStart(anim: string, sourceFrame: number): number {
    const c = this.clip(anim);
    if (!c) return 0;
    let t = 0;
    for (let i = 0; i < c.frames.length && c.frames[i] < sourceFrame; i++) t += c.durations[i];
    return t;
  }

  async load(anims: string[]): Promise<void> {
    const pages = new Set<string>();
    for (const a of anims) {
      const def = this.set.anims[a];
      if (def) pages.add(def.page);
    }
    await Promise.all([...pages].map((p) => loadImage(assetUrl(p))));
  }

  /** Source frame index shown `ms` after the clip started (non-looping clips hold the last frame). */
  frameAt(anim: string, ms: number): number {
    const c = this.clip(anim);
    if (!c || !c.frames.length) return 0;
    let t = Math.max(0, ms);
    if (c.def.loop) t %= c.total;
    else if (t >= c.total) return c.frames[c.frames.length - 1];
    for (let i = 0; i < c.frames.length; i++) {
      if (t < c.durations[i]) return c.frames[i];
      t -= c.durations[i];
    }
    return c.frames[c.frames.length - 1];
  }

  /** Draw a frame with its pivot (feet) at (x, y). Returns false if the page is not loaded yet. */
  draw(ctx: CanvasRenderingContext2D, anim: string, ms: number, x: number, y: number, flip = false): boolean {
    const c = this.clip(anim) ?? this.clip('idle');
    if (!c) return false;
    const img = ready.get(assetUrl(c.def.page));
    if (!img) return false;
    const f = this.frameAt(this.has(anim) ? anim : 'idle', ms);
    const { w, h, pivotX, pivotY } = FRAME;
    const dx = Math.round(x - pivotX);
    const dy = Math.round(y - pivotY);
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x) * 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, f * w, c.def.y, w, h, dx, dy, w, h);
      ctx.restore();
    } else ctx.drawImage(img, f * w, c.def.y, w, h, dx, dy, w, h);
    return true;
  }
}
