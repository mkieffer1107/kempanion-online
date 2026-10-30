// Procedural pixel campus (480x320), used only when public/assets/bg/map.png is missing: grass with a
// dither, University Ave, Lake Alice, paths between the pins, brick buildings, live oaks and sakura.
import { LOCATIONS } from '../../content/locations';
import type { LocationId } from '../../types';

export const MAP_W = 480;
export const MAP_H = 320;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0xffffffff);
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

function path(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }) {
  // Manhattan-ish paths with a 3px pale stroke (pixel lines, no anti-aliasing).
  ctx.fillStyle = '#e8d8b0';
  const midX = Math.round((a.x + b.x) / 2);
  const seg = (x0: number, y0: number, x1: number, y1: number) => {
    const xs = Math.min(x0, x1), ys = Math.min(y0, y1);
    ctx.fillRect(xs - 1, ys - 1, Math.abs(x1 - x0) + 3, Math.abs(y1 - y0) + 3);
  };
  seg(a.x, a.y, midX, a.y);
  seg(midX, a.y, midX, b.y);
  seg(midX, b.y, b.x, b.y);
}

export function drawCampus(ctx: CanvasRenderingContext2D) {
  const r = rng(1906);
  ctx.imageSmoothingEnabled = false;
  // grass + 2x2 dither
  ctx.fillStyle = '#5fa35a';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.fillStyle = '#56984f';
  for (let y = 0; y < MAP_H; y += 2) for (let x = (y / 2) % 2 ? 0 : 2; x < MAP_W; x += 4) ctx.fillRect(x, y, 1, 1);

  // University Ave across the top
  ctx.fillStyle = '#6b6478';
  ctx.fillRect(0, 4, MAP_W, 14);
  ctx.fillStyle = '#f3e3cf';
  for (let x = 4; x < MAP_W; x += 16) ctx.fillRect(x, 10, 8, 2);

  const pos = (id: LocationId) => ({ x: Math.round(LOCATIONS[id].map.x * MAP_W), y: Math.round(LOCATIONS[id].map.y * MAP_H) });

  // Lake Alice
  const lake = pos('lake_alice');
  ctx.fillStyle = '#3f86c6';
  for (let y = -26; y <= 26; y++) {
    const w = Math.floor(46 * Math.sqrt(1 - (y * y) / (26 * 26)));
    ctx.fillRect(lake.x - w, lake.y + y, w * 2, 1);
  }
  ctx.fillStyle = '#7fc4e8';
  for (let i = 0; i < 18; i++) ctx.fillRect(lake.x - 30 + Math.floor(r() * 60), lake.y - 14 + Math.floor(r() * 28), 4, 1);

  // paths from the Plaza / Century Tower hub to every pin
  const center = pos('century_tower');
  for (const id of Object.keys(LOCATIONS) as LocationId[]) if (id !== 'century_tower') path(ctx, center, pos(id));

  // trees
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * MAP_W), y = 24 + Math.floor(r() * (MAP_H - 30));
    const sakura = r() < 0.3;
    disc(ctx, x, y + 1, 5, '#2b5a2e');
    disc(ctx, x, y, 5, sakura ? '#f48fb1' : '#3e7a3a');
    disc(ctx, x - 1, y - 2, 2, sakura ? '#ffd6e0' : '#4f9447');
  }

  // buildings at each pin
  for (const id of Object.keys(LOCATIONS) as LocationId[]) {
    const p = pos(id);
    if (id === 'lake_alice' || id === 'plaza' || id === 'volleyball_courts') continue;
    if (id === 'stadium') {
      ctx.fillStyle = '#d8d0c0';
      for (let y = -16; y <= 16; y++) {
        const w = Math.floor(28 * Math.sqrt(1 - (y * y) / 256));
        ctx.fillRect(p.x - w, p.y + y, w * 2, 1);
      }
      ctx.fillStyle = '#4f9447';
      ctx.fillRect(p.x - 16, p.y - 7, 32, 14);
      continue;
    }
    if (id === 'century_tower') {
      ctx.fillStyle = '#b5523b';
      ctx.fillRect(p.x - 4, p.y - 26, 9, 30);
      ctx.fillStyle = '#7a3324';
      ctx.fillRect(p.x - 5, p.y - 30, 11, 4);
      continue;
    }
    ctx.fillStyle = '#2b1d14';
    ctx.fillRect(p.x - 15, p.y - 9, 32, 20);
    ctx.fillStyle = '#b5523b';
    ctx.fillRect(p.x - 14, p.y - 10, 30, 18);
    ctx.fillStyle = '#7a3324';
    ctx.fillRect(p.x - 14, p.y - 10, 30, 4);
    ctx.fillStyle = '#ffe9a0';
    for (let wx = -10; wx < 14; wx += 6) ctx.fillRect(p.x + wx, p.y - 3, 3, 3);
  }
  // Plaza lawn + sand courts
  const plaza = pos('plaza');
  ctx.fillStyle = '#7cc46a';
  ctx.fillRect(plaza.x - 22, plaza.y - 12, 44, 24);
  const courts = pos('volleyball_courts');
  ctx.fillStyle = '#e8cf8a';
  ctx.fillRect(courts.x - 20, courts.y - 12, 40, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(courts.x - 1, courts.y - 12, 2, 24);
}
