// Petal Catch drawing: sakura branch, squirrels, falling petals/snacks/acorns and the pig (pure canvas calls).
import { drawBackground, drawBubble, type BgImage, type Pops } from '../common/pixel';
import type { Sprite } from '../common/sprites';
import { BRANCH_Y, type Item, type PetalEngine } from './engine';

export interface PetalScene {
  engine: PetalEngine | null;
  t: number;
  wall: number;
  bg: BgImage | null;
  focusX: number;
  sprite: Sprite;
  anim: { name: string; start: number };
  ouch: { text: string; until: number };
  pops: Pops;
  reduceMotion: boolean;
  /** Icon canvases by id (snacks, acorn). */
  icon: (id: string) => CanvasImageSource | null;
}

/** Which clip the pig should play right now. */
export function petalAnim(e: PetalEngine, t: number): string {
  if (e.ended) return 'celebrate';
  if (t < e.pig.tumbleUntil) return 'tumble';
  if (e.pig.moving) return e.pig.facing > 0 ? 'run_right' : 'run_left';
  if (t < e.pig.happyUntil) return 'happy';
  return 'idle';
}

type Pattern = { rows: string[]; pal: Record<string, string> };

const PETAL_ROWS = ['..kk.k..', '.kPPkPk.', 'kPhPPPPk', 'kPhPPPsk', 'kPPPPssk', 'kPPPsssk', '.kPsssk.', '..kssk..', '...kk...'];
const PINK: Pattern = { rows: PETAL_ROWS, pal: { P: '#ffb7c5', h: '#ffffff', s: '#f48fb1', k: '#a8385a' } };
const GOLD: Pattern = { rows: PETAL_ROWS, pal: { P: '#ffd25a', h: '#fffbe0', s: '#e0a020', k: '#7a5210' } };
const SQUIRREL: Pattern = {
  rows: [
    '..kkkk..........', '.kTTTTk.........', '.kTTTTTk...k....', 'kTTTttTk..kBk...', 'kTTtttTTkkBBBk..', 'kTTtttTTkBBBBBk.',
    'kTTtttTTkBBBEBk.', 'kTTtttTTBBBBBBnk', 'kTTtttBBBBBBBBk.', '.kTTtTBBBWBBkbk.', '.kTTTTBBWWWBkk..', '..kkkkBBBWWBk...',
    '......kkbBbk....', '........kkk.....',
  ],
  pal: { T: '#a8784e', t: '#7a5232', B: '#9a6b48', b: '#6e4a2e', W: '#f0d8b8', E: '#1b1229', n: '#3d2618', k: '#3d2618' },
};

function drawPattern(ctx: CanvasRenderingContext2D, p: Pattern, x: number, y: number, flip: boolean): void {
  const h = p.rows.length;
  const w = p.rows[0].length;
  const ox = Math.round(x - w / 2);
  const oy = Math.round(y - h / 2);
  for (let ry = 0; ry < h; ry++) {
    const row = p.rows[ry];
    for (let rx = 0; rx < w; rx++) {
      const ch = row[flip ? w - 1 - rx : rx];
      if (ch === '.') continue;
      ctx.fillStyle = p.pal[ch];
      ctx.fillRect(ox + rx, oy + ry, 1, 1);
    }
  }
}

export function drawPetal(ctx: CanvasRenderingContext2D, x: number, y: number, gold: boolean, flip: boolean, twinkle: boolean): void {
  drawPattern(ctx, gold ? GOLD : PINK, x, y, flip);
  if (gold && twinkle) {
    const X = Math.round(x);
    const Y = Math.round(y);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(X, Y - 9, 1, 3);
    ctx.fillRect(X, Y + 7, 1, 3);
    ctx.fillRect(X - 8, Y, 3, 1);
    ctx.fillRect(X + 6, Y, 3, 1);
  }
}

/** Squirrel on the branch, facing `dirn`; it bobs while winding up its throw. */
export function drawSquirrel(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: boolean, dirn: 1 | -1): void {
  drawPattern(ctx, SQUIRREL, x, y - 7 + (wiggle ? -1 : 0), dirn === -1);
}

export function drawBranch(ctx: CanvasRenderingContext2D, w: number): void {
  ctx.fillStyle = '#3d2618';
  ctx.fillRect(0, BRANCH_Y - 1, w, 5);
  ctx.fillStyle = '#6b4428';
  ctx.fillRect(0, BRANCH_Y, w, 2);
  ctx.fillStyle = '#8a5a34';
  for (let x = 7; x < w; x += 31) ctx.fillRect(x, BRANCH_Y, 4, 1);
  for (let x = 6; x < w; x += 26) {
    const y = BRANCH_Y - 5 + ((x * 7) % 4);
    ctx.fillStyle = '#a8385a';
    ctx.fillRect(x - 1, y, 7, 6);
    ctx.fillStyle = '#ffb7c5';
    ctx.fillRect(x, y + 1, 5, 4);
    ctx.fillStyle = '#ffe3ea';
    ctx.fillRect(x + 1, y + 1, 2, 1);
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(x + 2, y + 2, 1, 1);
  }
}

export function renderPetals(ctx: CanvasRenderingContext2D, w: number, h: number, s: PetalScene): void {
  const { engine: e, t, wall } = s;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, s.bg, w, h, s.focusX);
  drawBranch(ctx, w);
  if (e) for (const q of e.squirrels) drawSquirrel(ctx, q.x, BRANCH_Y, !q.thrown && Math.floor((t - q.appear) * 10) % 2 === 0, q.dir);
  const ground = e?.ground ?? h - 6;
  const pigX = e?.pig.x ?? Math.round(w / 2);
  if (e) s.sprite.draw(ctx, s.anim.name, (t - s.anim.start) * 1000, pigX, ground);
  else s.sprite.draw(ctx, 'wave', wall % 2400, pigX, ground);
  if (e) {
    for (const it of e.items as Item[]) {
      const x = e.itemX(it);
      if (it.landed !== undefined && it.landed > 0 && Math.floor((t - it.landed) * 10) % 2 === 1) continue;
      if (it.kind === 'petal' || it.kind === 'gold') drawPetal(ctx, x, it.y, it.kind === 'gold', Math.sin(t * it.freq * 2 + it.phase) > 0, Math.floor(t * 8 + it.id) % 3 === 0);
      else if (it.icon) {
        const ic = s.icon(it.icon);
        if (ic) ctx.drawImage(ic, Math.round(x - 8), Math.round(it.y - 8));
      }
    }
    if (t < s.ouch.until) drawBubble(ctx, s.ouch.text, pigX, ground - 104, w);
  }
  s.pops.draw(ctx, s.reduceMotion);
}
