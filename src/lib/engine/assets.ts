// Asset URLs, the generated background/CG index, and a shared image cache.
// DOM objects are only created inside functions, so pure modules can import this under bun test.
import index from '../../generated/backgrounds.json';

const BG = new Set<string>((index as { bg?: string[] }).bg ?? []);
const CG = new Set<string>((index as { cg?: string[] }).cg ?? []);

export function hasBackground(id: string): boolean {
  return BG.has(id);
}

export function hasNightVariant(id: string): boolean {
  return BG.has(`${id}_night`);
}

export function hasCG(id: string): boolean {
  return CG.has(id);
}

/** URL of a file under public/assets (path like "bg/dorm.png"). */
export function assetUrl(path: string): string {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? './';
  return `${base}assets/${path}`;
}

interface CacheEntry {
  img: HTMLImageElement | null;
  promise: Promise<HTMLImageElement | null>;
}

const images = new Map<string, CacheEntry>();

/** Load (once) an image under assets/. Resolves null when it is missing or broken. */
export function loadImage(path: string): Promise<HTMLImageElement | null> {
  const hit = images.get(path);
  if (hit) return hit.promise;
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const entry: CacheEntry = { img: null, promise: Promise.resolve(null) };
  const img = new Image();
  img.decoding = 'async';
  entry.promise = new Promise((resolve) => {
    img.onload = () => {
      const ready = () => {
        entry.img = img;
        resolve(img);
      };
      // decode() keeps the first draw from stalling the frame; fall back to plain onload
      img.decode().then(ready, ready);
    };
    img.onerror = () => resolve(null);
  });
  img.src = assetUrl(path);
  images.set(path, entry);
  return entry.promise;
}

/** The image if it has finished loading; otherwise starts loading it and returns null. */
export function imageIfReady(path: string): HTMLImageElement | null {
  const hit = images.get(path);
  if (hit) return hit.img;
  void loadImage(path);
  return null;
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** 2D context with nearest-neighbor sampling. */
export function context2d(c: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', opts);
  if (!ctx) throw new Error('Canvas 2D is not available.');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
