// Tiny procedural particles: emotion bursts (glyph sprites), rain & lightning, and golden petals.
import { context2d, makeCanvas } from './assets';
import { stepped } from './layout';
import type { BurstKind, Weather } from './stage';

// ───────────────────────── glyph atlas ─────────────────────────

type GlyphId =
  | 'heart' | 'heartSmall' | 'spark0' | 'spark1' | 'spark2' | 'goldSpark0' | 'goldSpark1' | 'goldSpark2'
  | 'z4' | 'z5' | 'z6' | 'noteA' | 'noteB' | 'noteC' | 'bubble' | 'pop' | 'sweat' | 'anger' | 'angerSmall'
  | 'gold0' | 'gold1' | 'gold2';

interface GlyphDef { rows: string[]; colors: Record<string, string>; outline?: string }

const INK = '#1b1229';
const NOTE_ROWS = ['..nnn', '..n.n', '..n..', '..n..', 'nnn..', 'nnn..'];
const Z = { z: '#d8e6ff', w: '#ffffff' };
const GOLD = { y: '#ffd25a', w: '#fff4b8', s: '#e0a030' };

const GLYPHS: Record<GlyphId, GlyphDef> = {
  heart: { rows: ['.pp.pp.', 'pwppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'], colors: { p: '#ff5c8a', w: '#ffd6e7' }, outline: INK },
  heartSmall: { rows: ['.p.p.', 'pwppp', 'ppppp', '.ppp.', '..p..'], colors: { p: '#ff7aa2', w: '#ffe3ea' }, outline: INK },
  spark0: { rows: ['..y..', '..y..', 'yywyy', '..y..', '..y..'], colors: { y: '#fff2b3', w: '#ffffff' } },
  spark1: { rows: ['.y.', 'ywy', '.y.'], colors: { y: '#fff2b3', w: '#ffffff' } },
  spark2: { rows: ['w'], colors: { w: '#ffffff' } },
  goldSpark0: { rows: ['..y..', '..y..', 'yywyy', '..y..', '..y..'], colors: { y: '#ffd25a', w: '#fff8d8' } },
  goldSpark1: { rows: ['.y.', 'ywy', '.y.'], colors: { y: '#ffd25a', w: '#fff8d8' } },
  goldSpark2: { rows: ['y'], colors: { y: '#ffe9a0' } },
  z4: { rows: ['zzzz', '..z.', '.z..', 'zzzz'], colors: Z, outline: INK },
  z5: { rows: ['zzzzz', '...z.', '..z..', '.z...', 'zzzzz'], colors: Z, outline: INK },
  z6: { rows: ['zzzzzz', '....z.', '...z..', '..z...', '.z....', 'zzzzzz'], colors: Z, outline: INK },
  noteA: { rows: NOTE_ROWS, colors: { n: '#ffd25a' }, outline: INK },
  noteB: { rows: NOTE_ROWS, colors: { n: '#ff8fb8' }, outline: INK },
  noteC: { rows: NOTE_ROWS, colors: { n: '#8fc8ff' }, outline: INK },
  bubble: { rows: ['.bbb.', 'bw..b', 'b...b', 'b...b', '.bbb.'], colors: { b: '#a8dcff', w: '#ffffff' } },
  pop: { rows: ['b...b', '.....', '..b..', '.....', 'b...b'], colors: { b: '#d8f0ff' } },
  sweat: { rows: ['.s.', 'sss', 'sws', '.s.'], colors: { s: '#7ec8ff', w: '#e6f6ff' }, outline: INK },
  anger: { rows: ['.rr.rr.', 'r.r.r.r', 'rr...rr', '.......', 'rr...rr', 'r.r.r.r', '.rr.rr.'], colors: { r: '#ff3b3b' } },
  angerSmall: { rows: ['.r.r.', 'rr.rr', '.....', 'rr.rr', '.r.r.'], colors: { r: '#ff3b3b' } },
  gold0: { rows: ['..yyyyy..', '.ywwyyyyy', 'yywyyyyys', 'yyyyyyyss', '.yyyyyss.', '...ysss..'], colors: GOLD, outline: '#7a4b12' },
  gold1: { rows: ['.yyyy..', 'ywwyyy.', 'ywyyyys', 'yyyyyys', '.yyyss.', '..yss..'], colors: GOLD, outline: '#7a4b12' },
  gold2: { rows: ['.y.', 'yyy', 'ywy', 'yys', '.ss', '..s'], colors: GOLD, outline: '#7a4b12' },
};

interface GlyphRect { sx: number; sy: number; w: number; h: number }

let atlas: HTMLCanvasElement | null = null;
const rects = {} as Record<GlyphId, GlyphRect>;

function glyphAtlas(): HTMLCanvasElement {
  if (atlas) return atlas;
  const ids = Object.keys(GLYPHS) as GlyphId[];
  let x = 0;
  let maxH = 0;
  for (const id of ids) {
    const d = GLYPHS[id];
    const pad = d.outline ? 1 : 0;
    const w = d.rows[0].length + pad * 2;
    const h = d.rows.length + pad * 2;
    rects[id] = { sx: x, sy: 0, w, h };
    x += w + 1;
    maxH = Math.max(maxH, h);
  }
  const c = makeCanvas(x, maxH);
  const ctx = context2d(c);
  for (const id of ids) {
    const d = GLYPHS[id];
    const r = rects[id];
    const pad = d.outline ? 1 : 0;
    const filled = (gx: number, gy: number) => gy >= 0 && gy < d.rows.length && gx >= 0 && gx < d.rows[0].length && d.rows[gy][gx] !== '.';
    if (d.outline) {
      ctx.fillStyle = d.outline;
      for (let gy = -1; gy <= d.rows.length; gy++) {
        for (let gx = -1; gx <= d.rows[0].length; gx++) {
          if (filled(gx, gy)) continue;
          if (filled(gx - 1, gy) || filled(gx + 1, gy) || filled(gx, gy - 1) || filled(gx, gy + 1)) {
            ctx.fillRect(r.sx + gx + pad, r.sy + gy + pad, 1, 1);
          }
        }
      }
    }
    for (let gy = 0; gy < d.rows.length; gy++) {
      for (let gx = 0; gx < d.rows[gy].length; gx++) {
        const ch = d.rows[gy][gx];
        if (ch === '.') continue;
        ctx.fillStyle = d.colors[ch] ?? '#ffffff';
        ctx.fillRect(r.sx + gx + pad, r.sy + gy + pad, 1, 1);
      }
    }
  }
  atlas = c;
  return c;
}

function drawGlyph(ctx: CanvasRenderingContext2D, id: GlyphId, cx: number, cy: number, scale = 1) {
  const a = glyphAtlas();
  const r = rects[id];
  const w = r.w * scale, h = r.h * scale;
  ctx.drawImage(a, r.sx, r.sy, r.w, r.h, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
}

// ───────────────────────── bursts ─────────────────────────

const K_HEART = 0, K_SPARK = 1, K_GOLD = 2, K_Z = 3, K_NOTE = 4, K_CRUMB = 5, K_BUBBLE = 6, K_SWEAT = 7, K_ANGER = 8;
const CRUMB_COLORS = ['#c8945a', '#8a5a2e', '#e9c08a'];
const SPARK_CYCLE: readonly GlyphId[] = ['spark2', 'spark1', 'spark0', 'spark1', 'spark2'];
const GOLD_CYCLE: readonly GlyphId[] = ['goldSpark2', 'goldSpark1', 'goldSpark0', 'goldSpark1', 'goldSpark2'];
const NOTES: readonly GlyphId[] = ['noteA', 'noteB', 'noteC'];

interface Particle {
  on: boolean;
  k: number;
  glyph: GlyphId;
  x: number;
  y: number;
  x0: number;
  vx: number;
  vy: number;
  ay: number;
  t: number;
  life: number;
  floor: number;
  seed: number;
  bounces: number;
  color: string;
  size: number;
}

function newParticle(): Particle {
  return { on: false, k: 0, glyph: 'spark2', x: 0, y: 0, x0: 0, vx: 0, vy: 0, ay: 0, t: 0, life: 1, floor: 0, seed: 0, bounces: 0, color: '', size: 1 };
}

export class Bursts {
  reduce = false;
  private pool: Particle[] = Array.from({ length: 160 }, newParticle);

  private take(): Particle | null {
    for (const p of this.pool) if (!p.on) return p;
    return null;
  }

  private add(k: number, glyph: GlyphId, x: number, y: number, vx: number, vy: number, life: number, delay = 0, ay = 0): Particle | null {
    const p = this.take();
    if (!p) return null;
    p.on = true;
    p.k = k;
    p.glyph = glyph;
    p.x = p.x0 = x;
    p.y = y;
    p.vx = this.reduce ? 0 : vx;
    p.vy = this.reduce ? 0 : vy;
    p.ay = this.reduce ? 0 : ay;
    p.t = -delay;
    p.life = this.reduce ? Math.min(life, 500) : life;
    p.floor = Infinity;
    p.seed = Math.random() * 10;
    p.bounces = 0;
    return p;
  }

  /** Spawn a burst centered at (x, y); `floor` is the ground line for bouncing crumbs. */
  spawn(kind: BurstKind, x: number, y: number, floor = y + 24): void {
    const r = Math.random;
    switch (kind) {
      case 'hearts':
        for (let i = 0; i < 3; i++) this.add(K_HEART, i === 1 ? 'heart' : 'heartSmall', x + (i - 1) * 8 + (r() - 0.5) * 3, y - (i === 1 ? 4 : 0), 0, -23, 760, i * 90);
        break;
      case 'sparkles':
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + r() * 0.6;
          const d = 4 + r() * 6;
          const sp = 10 + r() * 16;
          this.add(K_SPARK, 'spark2', x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp, 450 + r() * 300, r() * 120);
        }
        break;
      case 'zzz':
        for (let i = 0; i < 3; i++) this.add(K_Z, 'z4', x + i * 3, y - i * 2, 8, -12, 1600, i * 380);
        break;
      case 'notes':
        for (let i = 0; i < 3; i++) this.add(K_NOTE, NOTES[i], x + (i - 1) * 9, y, (i - 1) * 3, -18, 1200, i * 220);
        break;
      case 'crumbs':
        for (let i = 0; i < 8; i++) {
          const p = this.add(K_CRUMB, 'spark2', x + (r() - 0.5) * 6, y, (r() - 0.5) * 50, -10 - r() * 26, 900 + r() * 300, r() * 60, 170);
          if (p) {
            p.floor = floor;
            p.color = CRUMB_COLORS[i % CRUMB_COLORS.length];
            p.size = r() < 0.4 ? 2 : 1;
          }
        }
        break;
      case 'bubbles':
        for (let i = 0; i < 6; i++) this.add(K_BUBBLE, 'bubble', x + (r() - 0.5) * 18, y + (r() - 0.5) * 6, 0, -14 - r() * 10, 900 + r() * 600, i * 110);
        break;
      case 'sweat':
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          this.add(K_SWEAT, 'sweat', x + side * 10, y, side * 28, -22, 650, i * 120, 130);
        }
        break;
      case 'anger':
        this.add(K_ANGER, 'anger', x + 12, y - 4, 0, 0, 950);
        break;
    }
  }

  /** Gold twinkles (golden petal catch). */
  goldBurst(x: number, y: number): void {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const sp = 14 + Math.random() * 20;
      this.add(K_GOLD, 'goldSpark2', x, y, Math.cos(a) * sp, Math.sin(a) * sp, 520 + Math.random() * 260, Math.random() * 80);
    }
  }

  clear(): void {
    for (const p of this.pool) p.on = false;
  }

  update(dt: number): void {
    const s = dt / 1000;
    const drag = Math.exp(-3 * s);
    for (const p of this.pool) {
      if (!p.on) continue;
      p.t += dt;
      if (p.t < 0) continue;
      if (p.t >= p.life) {
        p.on = false;
        continue;
      }
      const f = p.t / p.life;
      switch (p.k) {
        case K_HEART:
        case K_NOTE:
          p.y += p.vy * s;
          p.x = p.x0 + (this.reduce ? 0 : Math.round(Math.sin(p.t / 160 + p.seed) * (p.k === K_NOTE ? 3 : 1.5)));
          break;
        case K_SPARK:
        case K_GOLD:
          p.x += p.vx * s;
          p.y += p.vy * s;
          p.vx *= drag;
          p.vy *= drag;
          p.glyph = (p.k === K_GOLD ? GOLD_CYCLE : SPARK_CYCLE)[Math.min(4, (f * 5) | 0)];
          break;
        case K_Z:
          p.x += p.vx * s;
          p.y += p.vy * s;
          p.glyph = f < 0.33 ? 'z4' : f < 0.66 ? 'z5' : 'z6';
          break;
        case K_BUBBLE:
          p.y += p.vy * s;
          p.x = p.x0 + (this.reduce ? 0 : Math.round(Math.sin(p.t / 110 + p.seed) * 2));
          p.glyph = p.life - p.t < 120 ? 'pop' : 'bubble';
          break;
        case K_CRUMB:
        case K_SWEAT:
          p.vy += p.ay * s;
          p.x += p.vx * s;
          p.y += p.vy * s;
          if (p.y > p.floor) {
            p.y = p.floor;
            if (p.bounces < 2) {
              p.vy = -p.vy * 0.35;
              p.vx *= 0.6;
              p.bounces++;
            } else {
              p.vy = 0;
              p.vx = 0;
            }
          }
          break;
        case K_ANGER:
          p.glyph = this.reduce || ((p.t / 150) | 0) % 2 === 0 ? 'anger' : 'angerSmall';
          break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, ox = 0, oy = 0): void {
    for (const p of this.pool) {
      if (!p.on || p.t < 0) continue;
      const f = p.t / p.life;
      const alpha = f > 0.7 ? stepped(1 - (f - 0.7) / 0.3, 3) : 1;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      if (p.k === K_CRUMB) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x) + ox, Math.round(p.y) - p.size + 1 + oy, p.size, p.size);
      } else {
        drawGlyph(ctx, p.glyph, p.x + ox, p.y + oy);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ───────────────────────── rain & lightning ─────────────────────────

interface Drop { x: number; y: number; len: number; vy: number; near: boolean; hitY: number }
interface Splash { on: boolean; x: number; y: number; t: number }

const RAIN_COUNTS: Record<Weather, readonly [far: number, near: number]> = { clear: [0, 0], rain: [90, 60], storm: [140, 100] };

export class Rain {
  weather: Weather = 'clear';
  /** Called when thunder should sound (after a strike). */
  onThunder: (() => void) | null = null;
  private drops: Drop[] = Array.from({ length: 240 }, () => ({ x: 0, y: 0, len: 6, vy: 300, near: false, hitY: 260 }));
  private n = 0;
  private splashes: Splash[] = Array.from({ length: 48 }, () => ({ on: false, x: 0, y: 0, t: 0 }));
  private vx = 0;
  private strikeIn = 7000;
  private flashT = -1;
  private thunderIn = -1;
  private bolt: number[] = [];
  private lw = 480;
  private h = 270;
  reduce = false;

  set(w: Weather, lw: number, h: number): void {
    this.weather = w;
    this.lw = lw;
    this.h = h;
    const [far, near] = RAIN_COUNTS[w];
    this.n = far + near;
    this.vx = w === 'storm' ? -90 : -40;
    for (let i = 0; i < this.n; i++) this.spawn(this.drops[i], i >= far, true);
    if (w !== 'storm') {
      this.flashT = -1;
      this.thunderIn = -1;
    }
    this.strikeIn = 4000 + Math.random() * 6000;
  }

  resize(lw: number, h: number): void {
    this.lw = lw;
    this.h = h;
  }

  private spawn(d: Drop, near: boolean, initial: boolean) {
    const storm = this.weather === 'storm';
    d.near = near;
    d.len = near ? 7 + Math.random() * 4 : 4 + Math.random() * 3;
    d.vy = (near ? 300 : 220) + Math.random() * 80 + (storm ? 80 : 0);
    const lead = (-this.vx / d.vy) * this.h;
    d.x = -10 + Math.random() * (this.lw + 20 + Math.max(0, lead));
    d.y = initial ? Math.random() * this.h : -d.len - Math.random() * 40;
    d.hitY = 226 + Math.random() * 42;
  }

  update(dt: number): void {
    if (this.n === 0) return;
    const s = dt / 1000;
    for (let i = 0; i < this.n; i++) {
      const d = this.drops[i];
      d.y += d.vy * s;
      d.x += this.vx * s * (d.near ? 1 : 0.8);
      if (d.near && d.y >= d.hitY) {
        this.splash(d.x, Math.round(d.hitY));
        this.spawn(d, true, false);
      } else if (d.y > this.h + 2) {
        this.spawn(d, d.near, false);
      }
    }
    for (const sp of this.splashes) {
      if (!sp.on) continue;
      sp.t += dt;
      if (sp.t >= 180) sp.on = false;
    }
    if (this.weather === 'storm') {
      if (this.flashT >= 0) {
        this.flashT += dt;
        if (this.flashT > 600) this.flashT = -1;
      } else if ((this.strikeIn -= dt) <= 0) {
        this.strike();
      }
      if (this.thunderIn >= 0 && (this.thunderIn -= dt) < 0) this.onThunder?.();
    }
  }

  private splash(x: number, y: number) {
    for (const sp of this.splashes) {
      if (sp.on) continue;
      sp.on = true;
      sp.x = Math.round(x);
      sp.y = y;
      sp.t = 0;
      return;
    }
  }

  private strike() {
    this.flashT = 0;
    this.strikeIn = 6000 + Math.random() * 10000;
    this.thunderIn = 300 + Math.random() * 900;
    this.bolt.length = 0;
    if (this.reduce) return;
    let x = this.lw * (0.2 + Math.random() * 0.6);
    let y = 0;
    const end = 90 + Math.random() * 50;
    this.bolt.push(Math.round(x), y);
    while (y < end) {
      y += 8 + Math.random() * 7;
      x += (Math.random() - 0.5) * 14;
      this.bolt.push(Math.round(x), Math.round(y));
    }
  }

  /** Multiply-darken the world for rainy light. */
  drawTint(ctx: CanvasRenderingContext2D): void {
    if (this.weather === 'clear') return;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = this.weather === 'storm' ? '#8e97b4' : '#b8c2d8';
    ctx.fillRect(0, 0, this.lw, this.h);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Far layer (behind characters) or near layer + splashes (in front). */
  draw(ctx: CanvasRenderingContext2D, near: boolean, ox = 0, oy = 0): void {
    if (this.n === 0) return;
    const slope = this.vx / 300;
    ctx.fillStyle = near ? 'rgba(226,236,255,0.62)' : 'rgba(196,212,255,0.34)';
    for (let i = 0; i < this.n; i++) {
      const d = this.drops[i];
      if (d.near !== near) continue;
      const x = Math.round(d.x) + ox;
      const y = Math.round(d.y) + oy;
      const segs = 1 + Math.min(2, Math.round(Math.abs(slope) * d.len));
      const segLen = Math.ceil(d.len / segs);
      // A slanted drop may cross the edge even when its first segment is outside.
      const endX = x + Math.round(slope * segLen * (segs - 1));
      if (Math.max(x, endX) + 1 <= 0 || Math.min(x, endX) >= this.lw || y + segLen * segs <= 0 || y >= this.h) continue;
      for (let k = 0; k < segs; k++) ctx.fillRect(x + Math.round(slope * segLen * k), y + segLen * k, 1, segLen);
    }
    if (!near) return;
    ctx.fillStyle = 'rgba(226,236,255,0.7)';
    for (const sp of this.splashes) {
      if (!sp.on) continue;
      const f = (sp.t / 60) | 0;
      const x = sp.x + ox, y = sp.y + oy;
      if (f === 0) ctx.fillRect(x, y, 1, 1);
      else if (f === 1) {
        ctx.fillRect(x - 1, y - 1, 1, 1);
        ctx.fillRect(x + 1, y - 1, 1, 1);
      } else {
        ctx.fillRect(x - 2, y, 1, 1);
        ctx.fillRect(x + 2, y, 1, 1);
      }
    }
  }

  /** Lightning bolt + flash; call last so it lights everything. */
  drawFlash(ctx: CanvasRenderingContext2D): void {
    if (this.flashT < 0) return;
    const t = this.flashT;
    let a: number;
    if (this.reduce) a = t < 500 ? 0.22 * (1 - t / 500) : 0;
    else if (t < 70) a = 0.72;
    else if (t < 130) a = 0.08;
    else if (t < 210) a = 0.5;
    else a = Math.max(0, 0.5 * (1 - (t - 210) / 300));
    if (!this.reduce && t < 140 && this.bolt.length >= 4) {
      for (let i = 0; i + 3 < this.bolt.length; i += 2) {
        const x0 = this.bolt[i], y0 = this.bolt[i + 1], x1 = this.bolt[i + 2], y1 = this.bolt[i + 3];
        const steps = Math.max(1, y1 - y0);
        for (let k = 0; k < steps; k++) {
          const x = Math.round(x0 + ((x1 - x0) * k) / steps);
          ctx.fillStyle = '#c8d8ff';
          ctx.fillRect(x - 1, y0 + k, 3, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y0 + k, 1, 1);
        }
      }
    }
    if (a > 0) {
      ctx.globalAlpha = stepped(a, 8);
      ctx.fillStyle = '#f4f6ff';
      ctx.fillRect(0, 0, this.lw, this.h);
      ctx.globalAlpha = 1;
    }
  }
}

// ───────────────────────── golden petals ─────────────────────────

export interface Golden {
  on: boolean;
  id: number;
  x: number;
  y: number;
  vy: number;
  drift: number;
  phase: number;
  t: number;
  /** ms resting on the ground (still catchable while it twinkles out), −1 while falling. */
  landed: number;
  onCatch: (() => void) | null;
  onMiss: (() => void) | null;
}

const GOLD_FRAMES: readonly GlyphId[] = ['gold0', 'gold1', 'gold2', 'gold1'];
/** How long a golden petal lies on the ground before it fades (counts as missed). */
export const GOLDEN_REST_MS = 900;
let goldenSerial = 0;

export class GoldenPetals {
  readonly list: Golden[] = Array.from({ length: 4 }, () => ({
    on: false, id: 0, x: 0, y: 0, vy: 0, drift: 0, phase: 0, t: 0, landed: -1, onCatch: null, onMiss: null,
  }));
  reduce = false;

  spawn(onCatch: () => void, onMiss: (() => void) | null, x: number): Golden | null {
    const g = this.list.find((s) => !s.on);
    if (!g) return null;
    g.on = true;
    g.id = ++goldenSerial;
    g.x = x;
    g.y = -10;
    g.vy = this.reduce ? 8 : 12 + Math.random() * 5;
    g.drift = (Math.random() - 0.5) * 8;
    g.phase = Math.random() * Math.PI * 2;
    g.t = 0;
    g.landed = -1;
    g.onCatch = onCatch;
    g.onMiss = onMiss;
    return g;
  }

  /** Drawn x including sway. */
  posX(g: Golden): number {
    return g.x + (this.reduce ? 0 : 10 * Math.sin(g.phase));
  }

  /**
   * Advance; collects petals that left the stage or faded on the ground uncaught (their onMiss is the caller's
   * to call). `floor` is where a petal comes to rest (the actors' ground line; default: below the stage).
   */
  update(dt: number, lw: number, h: number, missed: Golden[], floor = h + 24): void {
    const s = dt / 1000;
    for (const g of this.list) {
      if (!g.on) continue;
      g.t += dt;
      if (g.landed >= 0) {
        g.landed += dt;
        if (g.landed >= GOLDEN_REST_MS) {
          g.on = false;
          missed.push(g);
        }
        continue;
      }
      g.y += g.vy * s;
      g.x += g.drift * s;
      g.phase += 1.7 * s;
      if (g.y >= floor) {
        g.y = floor;
        g.landed = 0;
      } else if (g.y > h + 12 || g.x < -40 || g.x > lw + 40) {
        g.on = false;
        missed.push(g);
      }
    }
  }

  hit(x: number, y: number, radius: number): Golden | null {
    let best: Golden | null = null;
    let bestD = radius * radius;
    for (const g of this.list) {
      if (!g.on) continue;
      const dx = this.posX(g) - x, dy = g.y - y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) { best = g; bestD = d; }
    }
    return best;
  }

  clear(): void {
    for (const g of this.list) {
      g.on = false;
      g.onCatch = g.onMiss = null;
    }
  }

  /** `scale` 2 on compact (phone) stages keeps the petal big enough to spot and tap. */
  draw(ctx: CanvasRenderingContext2D, ox = 0, oy = 0, scale = 1): void {
    for (const g of this.list) {
      if (!g.on) continue;
      // resting on the ground: twinkles out
      if (g.landed > GOLDEN_REST_MS * 0.45 && ((g.landed / 90) | 0) % 2 === 1) continue;
      const x = Math.round(this.posX(g)) + ox;
      const y = Math.round(g.y) + oy;
      // soft halo so the petal reads on busy paintings
      ctx.fillStyle = 'rgba(255,236,160,0.35)';
      ctx.fillRect(x - 6 * scale, y - 4 * scale, 12 * scale, 8 * scale);
      ctx.fillRect(x - 4 * scale, y - 6 * scale, 8 * scale, 12 * scale);
      drawGlyph(ctx, this.reduce ? 'gold0' : GOLD_FRAMES[((g.t / 220) | 0) & 3], x, y, scale);
      if (!this.reduce && ((g.t / 600) | 0) % 2 === 0) drawGlyph(ctx, 'spark1', x + 6 * scale, y - 5 * scale, scale);
    }
  }
}
