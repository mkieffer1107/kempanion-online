// Perfusion! drawing: the ECG monitor, perfusion meter and Piggy 2 (pure canvas calls).
import { drawBackground, drawBubble, drawText, type BgImage, type Pops } from '../common/pixel';
import type { Sprite } from '../common/sprites';
import type { Grade, Note, PerfusionEngine } from './engine';

/** Seconds of chart visible to the right of the hit line. */
export const LOOKAHEAD = 1.6;

export interface PerfusionScene {
  engine: PerfusionEngine | null;
  t: number;
  wall: number;
  bg: BgImage | null;
  focusX: number;
  doc: Sprite;
  anim: { name: string; start: number };
  bubble: { text: string; until: number } | null;
  pops: Pops;
  reduceMotion: boolean;
}

export function monitor(w: number, h: number) {
  const mh = Math.round(h * 0.44);
  return { x: 6, y: 8, w: w - 12, h: mh, sx: 10, sy: 12, sw: w - 20, sh: mh - 8 };
}

export function hitX(w: number, h: number): number {
  const m = monitor(w, h);
  return m.sx + Math.round(m.sw * 0.22);
}

/** ECG deflection (px, up = positive) for a beat note `dx` pixels away from its R peak. */
function qrs(dx: number, amp: number): number {
  if (dx >= -18 && dx < -9) return Math.sin(((dx + 18) / 9) * Math.PI) * 3 * amp;
  if (dx >= -4 && dx < -2) return -3 * amp;
  if (dx >= -2 && dx <= 2) return (34 - Math.abs(dx) * 14) * amp;
  if (dx > 2 && dx <= 5) return -9 * amp;
  if (dx >= 10 && dx < 24) return Math.sin(((dx - 10) / 14) * Math.PI) * 6 * amp;
  return 0;
}

const GRADE_COLOR: Record<Grade, string> = { perfect: '#fff3a0', good: '#d8ffd0', miss: '#ff5a5f', ok: '#7fd6ff', broken: '#ffb020' };

export function renderPerfusion(ctx: CanvasRenderingContext2D, w: number, h: number, s: PerfusionScene): void {
  const { engine, t, wall } = s;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, s.bg, w, h, s.focusX, 0.55);
  const m = monitor(w, h);
  const ischemic = !!engine?.ischemic;
  // bezel
  ctx.fillStyle = '#1b1229';
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.fillStyle = ischemic ? '#4a6bff' : '#8a8fa3';
  ctx.fillRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
  ctx.fillStyle = '#071510';
  ctx.fillRect(m.sx, m.sy, m.sw, m.sh);
  ctx.fillStyle = '#0f2a1d';
  for (let gx = m.sx; gx < m.sx + m.sw; gx += 10) ctx.fillRect(gx, m.sy, 1, m.sh);
  for (let gy = m.sy; gy < m.sy + m.sh; gy += 10) ctx.fillRect(m.sx, gy, m.sw, 1);

  const hx = hitX(w, h);
  const by = m.sy + Math.round(m.sh * 0.66);
  const pps = (m.sx + m.sw - hx) / LOOKAHEAD;
  const amp = Math.min(1, m.sh / 120);
  const notes: Note[] = engine ? engine.chart.notes.filter((n) => n.end >= t - (hx - m.sx) / pps - 0.3 && n.t <= t + LOOKAHEAD + 0.3) : [];

  // drain bands and skip markers (under the trace)
  for (const n of notes) {
    const x0 = Math.round(hx + (n.t - t) * pps);
    if (n.type === 'drain') {
      const x1 = Math.round(hx + (n.end - t) * pps);
      const g = engine?.grades.get(n.id);
      const active = engine?.holding?.id === n.id;
      ctx.fillStyle = g === 'broken' ? '#5a3a10' : active ? '#7fd6ff' : g === 'ok' ? '#2a6f8a' : '#1f5a74';
      const a = Math.max(m.sx, x0);
      const b = Math.min(m.sx + m.sw, x1);
      if (b > a) ctx.fillRect(a, by - 5, b - a, 10);
      if (x0 >= m.sx && x0 < m.sx + m.sw) {
        ctx.fillStyle = '#c9f1ff';
        ctx.fillRect(x0 - 1, by - 8, 3, 16);
        if (!g) drawText(ctx, 'HOLD', x0, m.sy + 13, { color: '#7fd6ff', align: 'center' });
      }
    } else if (n.type === 'skip' && x0 > m.sx - 20 && x0 < m.sx + m.sw + 20) {
      const g = engine?.grades.get(n.id);
      ctx.fillStyle = g === 'miss' ? '#ff5a5f' : '#5d6b63';
      for (let dx = -16; dx <= 16; dx += 4) if (x0 + dx >= m.sx && x0 + dx < m.sx + m.sw) ctx.fillRect(x0 + dx, by - 1, 2, 2);
      if (!g) drawText(ctx, 'SKIP', x0, m.sy + 13, { color: '#c3cdc6', align: 'center' });
    }
  }

  // the trace
  let prevY = by;
  for (let x = m.sx; x < m.sx + m.sw; x++) {
    const tx = t + (x - hx) / pps;
    let v = 0;
    let color = '#59f58d';
    for (const n of notes) {
      if (n.type !== 'beat') continue;
      const dx = (tx - n.t) * pps;
      if (dx < -20 || dx > 26) continue;
      v += qrs(Math.round(dx), amp);
      const g = engine?.grades.get(n.id);
      if (g) color = GRADE_COLOR[g];
    }
    if (!engine) v += qrs(Math.round(((tx % 0.833) + 0.833) % 0.833 * pps - 40), amp) * 0.6;
    const noise = ((Math.sin(Math.floor(tx * 90) * 12.9898) * 43758.5453) % 1) * 0.8;
    const y = Math.round(by - v + noise);
    const top = Math.min(prevY, y);
    const len = Math.max(1, Math.abs(prevY - y) + 1);
    ctx.fillStyle = '#1e6b3e';
    ctx.fillRect(x, top + 1, 1, len);
    ctx.fillStyle = x > hx ? color : '#3fb86b';
    ctx.fillRect(x, top, 1, len);
    prevY = y;
  }

  // hit line
  const flash = engine && t - engine.flashAt < 0.12;
  ctx.fillStyle = flash ? '#ffffff' : '#ff8fb1';
  for (let y = m.sy; y < m.sy + m.sh; y += 3) ctx.fillRect(hx, y, 1, 2);
  drawText(ctx, '♥', hx, m.sy + m.sh - 10, { color: flash ? '#fff' : '#ff8fb1', align: 'center' });

  // readouts
  const phaseIdx = engine ? Math.max(0, engine.phaseIdx) : 0;
  const hr = engine ? engine.chart.phases[phaseIdx].hr : 72;
  drawText(ctx, `II HR ${hr}`, m.sx + 3, m.sy + 3, { color: '#59f58d', outline: null });
  const meter = engine ? Math.round(engine.meter) : 70;
  const mColor = meter < 30 ? '#7f9cff' : meter < 60 ? '#ffd25a' : '#59f58d';
  drawText(ctx, `${meter}%`, m.sx + m.sw - 3, m.sy + 3, { color: mColor, outline: null, align: 'right' });
  if (engine?.holding) drawText(ctx, 'DRAINING CSF...', m.sx + m.sw / 2, m.sy + m.sh - 10, { color: '#7fd6ff', align: 'center', outline: null });

  // perfusion meter bar
  const my = m.y + m.h + 5;
  drawText(ctx, 'PERFUSION', m.x, my, { color: '#fff6ea' });
  const bx = m.x + 56;
  const bw = m.w - 56;
  ctx.fillStyle = '#1b1229';
  ctx.fillRect(bx, my - 1, bw, 9);
  ctx.fillStyle = mColor;
  ctx.fillRect(bx + 1, my, Math.round((bw - 2) * (meter / 100)), 7);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(bx + 1, my, Math.round((bw - 2) * (meter / 100)), 1);
  ctx.fillStyle = '#ff5a5f';
  ctx.fillRect(bx + Math.round(bw * 0.3), my - 2, 1, 11);

  // Piggy 2
  const docX = w < 300 ? Math.round(w / 2) : Math.round(w * 0.2);
  const ground = h - 2;
  s.doc.draw(ctx, engine ? s.anim.name : 'surgical_focus', engine ? (t - s.anim.start) * 1000 : wall, docX, ground);
  if (s.bubble && t < s.bubble.until) drawBubble(ctx, s.bubble.text, docX + 4, ground - 98, w);

  s.pops.draw(ctx, s.reduceMotion);
  if (ischemic) {
    ctx.fillStyle = 'rgba(40, 90, 255, 0.18)';
    ctx.fillRect(0, 0, w, h);
  }
}
