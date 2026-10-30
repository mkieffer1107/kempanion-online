// Sakura Spike drawing (pure canvas calls; the component owns timing and input).
import { drawBackground, drawBubble, drawText, fillEllipse, lerp, strokeEllipse, type Pops, type BgImage } from '../common/pixel';
import type { Sprite } from '../common/sprites';
import { layoutFor, type VolleyEngine } from './engine';

export interface VolleyScene {
  engine: VolleyEngine | null;
  /** Game time (s) and wall clock (ms) for idle animation. */
  t: number;
  wallMs: number;
  playing: boolean;
  bg: BgImage | null;
  focusX: number;
  p1: Sprite;
  cheer2: Sprite;
  cheer3: Sprite;
  bubble: { text: string; until: number };
  cheerUntil: number;
  pops: Pops;
  reduceMotion: boolean;
  /** Show the "TAP!" teaching prompt. */
  teach: boolean;
}

export function drawBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const R = Math.max(2, Math.round(r));
  ctx.fillStyle = '#1b1229';
  for (let dy = -R - 1; dy <= R + 1; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, (R + 1) * (R + 1) - dy * dy)));
    ctx.fillRect(x0 - half, y0 + dy, half * 2 + 1, 1);
  }
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)));
    for (let dx = -half; dx <= half; dx++) {
      const d = dx + dy * 0.7;
      ctx.fillStyle = d < -R * 0.35 ? '#2f5bd3' : d > R * 0.45 ? '#ffd25a' : '#fffaf0';
      ctx.fillRect(x0 + dx, y0 + dy, 1, 1);
    }
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0 - Math.ceil(R / 2), y0 - Math.ceil(R / 2), 1, 1);
}

export function renderVolley(ctx: CanvasRenderingContext2D, w: number, h: number, s: VolleyScene): void {
  const { engine, t, wallMs } = s;
  const L = engine?.L ?? layoutFor(w, h);
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, s.bg, w, h, s.focusX);

  if (w >= 330) {
    const cheering = t < s.cheerUntil;
    const anim = cheering ? 'celebrate' : 'happy';
    const ms = cheering ? 800 - (s.cheerUntil - t) * 1000 : wallMs;
    s.cheer2.draw(ctx, anim, cheering ? ms : wallMs * 0.9, 34, L.ground - 6);
    s.cheer3.draw(ctx, anim, cheering ? ms : wallMs * 1.1 + 200, w - 34, L.ground - 6, true);
  }

  // target spot + the ring that shrinks onto the ball's landing shadow
  const ring = s.playing ? engine?.ring(t) : null;
  ctx.fillStyle = 'rgba(255, 246, 234, 0.55)';
  strokeEllipse(ctx, L.px, L.ground + 3, 9, 3, 1);
  if (ring) {
    const rx = lerp(9, 38, ring.k);
    const color = ring.quality === 'perfect' ? '#ffd25a' : ring.quality === 'good' ? '#fffaf0' : ring.action === 'block' ? '#ff5a5f' : '#ffb7c5';
    ctx.fillStyle = '#1b1229';
    strokeEllipse(ctx, L.px, L.ground + 4, rx, rx * 0.34, 2);
    ctx.fillStyle = color;
    strokeEllipse(ctx, L.px, L.ground + 3, rx, rx * 0.34, 2);
  }

  const ball = engine && s.playing ? engine.ballAt(t) : null;
  if (ball?.visible) {
    const lift = Math.max(0, ball.gy - ball.y);
    ctx.fillStyle = `rgba(40, 18, 34, ${Math.max(0.12, 0.38 - lift / 600)})`;
    fillEllipse(ctx, ball.x, ball.gy, 3 + 4 * ball.s, 1.2 + 1.4 * ball.s);
  }

  const anim = engine ? engine.anim : 'volleyball_ready';
  const animMs = engine ? (t - engine.animStart) * 1000 : wallMs;
  s.p1.draw(ctx, anim, animMs, L.px, L.ground);

  if (ball?.visible) drawBall(ctx, ball.x, ball.y, 5 * ball.s);

  if (ring && s.teach && ring.quality !== 'far') {
    drawText(ctx, 'TAP!', Math.min(w - 26, L.px + 54), L.ground - 12, { color: '#ffd25a', align: 'center', scale: 2 });
  }
  if (ring && ring.action === 'block' && ring.k > 0.2) {
    drawText(ctx, 'BLOCK!', L.px, 12, { color: '#ff5a5f', align: 'center', scale: 2 });
  }
  if (s.bubble.text && t < s.bubble.until) drawBubble(ctx, s.bubble.text, L.px + 4, L.ground - 106, w);
  s.pops.draw(ctx, s.reduceMotion);
}
