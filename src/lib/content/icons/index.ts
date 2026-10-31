import type { PixelIcon } from './types';
import { UI_ICONS } from './ui';
import { ITEM_ICONS } from './items';
import { THOUGHT_ICONS } from './thoughts';

export type { PixelIcon } from './types';

/** Registry of every pixel icon. UI icons are owned by the UI module, item icons by the pet module, thought-cloud icons by
 *  the thought banks. THOUGHT_ICONS goes first so that a thought icon can never override an existing id. */
export const ICONS: Record<string, PixelIcon> = { ...THOUGHT_ICONS, ...UI_ICONS, ...ITEM_ICONS };

const cache = new Map<string, string>();

/** Render an icon to a PNG data URL (cached). Unknown ids render a magenta "missing" square. */
export function iconUrl(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const icon = ICONS[id] ?? MISSING;
  const h = icon.rows.length;
  const w = Math.max(...icon.rows.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    const row = icon.rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = icon.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}

const MISSING: PixelIcon = {
  palette: { m: '#ff00ff', k: '#000000' },
  rows: ['kkkkkkkk', 'kmmmmmmk', 'kmkmmkmk', 'kmmkkmmk', 'kmmkkmmk', 'kmkmmkmk', 'kmmmmmmk', 'kkkkkkkk'],
};
