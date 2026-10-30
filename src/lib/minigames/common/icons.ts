// Pixel icons as offscreen canvases for drawing inside game stages.
import { ICONS } from '../../content/icons';

const cache = new Map<string, HTMLCanvasElement | null>();

export function iconCanvas(id: string): HTMLCanvasElement | null {
  if (cache.has(id)) return cache.get(id) ?? null;
  const icon = ICONS[id];
  if (!icon || typeof document === 'undefined') {
    cache.set(id, null);
    return null;
  }
  const h = icon.rows.length;
  const w = Math.max(...icon.rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = icon.palette[row[x]];
      if (!color || row[x] === '.' || row[x] === ' ') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  cache.set(id, c);
  return c;
}
