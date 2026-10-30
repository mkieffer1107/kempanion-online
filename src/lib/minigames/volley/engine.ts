// Sakura Spike rules (GAME_DESIGN.md §9): one-button timing on a shrinking ring.
// Bump → set → spike; Perfect ±60 ms = 100, Good ±130 ms = 50; combo ×(1 + 0.1 per 5 hits, max ×2);
// a late tap within 250 ms digs (once per point); 20% of returns are opponent spikes → block (+150);
// +5% speed per 10 touches (max +60%). No fail state: a dropped ball just starts a new point.
import { clamp, lerp, rng } from '../common/pixel';

export type Action = 'bump' | 'set' | 'spike' | 'block';
export type Judge = 'perfect' | 'good' | 'dig' | 'early';

export interface Pt { x: number; y: number; s: number; gy: number }

interface Seg { a: Pt; b: Pt; t0: number; t1: number; apex: number }

export interface Fx {
  kind: 'pop' | 'bubble' | 'sfx' | 'cheer';
  text?: string;
  color?: string;
  x?: number;
  y?: number;
  sfx?: 'ball_hit' | 'spike' | 'whistle' | 'cheer' | 'sparkle' | 'oink' | 'fail';
}

export interface Layout {
  w: number;
  ground: number;
  px: number;
  far: Pt;
  farHigh: Pt;
  contact: Record<Action | 'dig' | 'serve', Pt>;
}

export const DURATION = 60;

const BASE = { serveFly: 0.75, ret: 1.1, bs: 0.85, ss: 0.72, spikeFly: 0.3, oppDelay: 0.42, opp: 0.62, blockFly: 0.32, drop: 1.25 };
const WIN = { perfect: 0.06, good: 0.13, dig: 0.25, early: 0.4, lockout: 0.16 };

/** Source frame where each clip touches the ball (the sheet draws the ball on these frames). */
export const CONTACT_FRAME: Record<string, { frame: number; hide: number }> = {
  volleyball_bump: { frame: 2, hide: 2 },
  volleyball_set: { frame: 2, hide: 1 },
  volleyball_spike: { frame: 4, hide: 0 },
  volleyball_dig: { frame: 2, hide: 2 },
  volleyball_block: { frame: 3, hide: 1 },
  volleyball_serve: { frame: 3, hide: 1 },
};

export function layoutFor(w: number, h: number): Layout {
  const ground = h - 18;
  const px = Math.round(w < 260 ? w * 0.4 : w * 0.42);
  const farX = Math.round(px + Math.min(130, w * 0.42));
  const gy = ground + 3;
  const near = (dx: number, dy: number): Pt => ({ x: px + dx, y: ground - dy, s: 1, gy });
  return {
    w,
    ground,
    px,
    far: { x: farX, y: Math.round(h * 0.36), s: 0.45, gy: Math.round(h * 0.6) },
    farHigh: { x: farX - 12, y: Math.round(h * 0.26), s: 0.5, gy: Math.round(h * 0.6) },
    contact: {
      bump: near(3, 40),
      set: near(1, 104),
      spike: near(8, 108),
      block: near(1, 106),
      dig: near(12, 26),
      serve: near(14, 54),
    },
  };
}

export class VolleyEngine {
  L: Layout;
  t = 0;
  ended = false;
  score = 0;
  combo = 0;
  rally = 0;
  maxRally = 0;
  touches = 0;
  perfect = 0;
  good = 0;
  digs = 0;
  blocks = 0;
  drops = 0;
  /** P1's clip and when it started (game seconds). */
  anim = 'volleyball_ready';
  animStart = 0;
  /** Ball hidden until (the sprite draws the ball on contact frames). */
  hideBallUntil = 0;
  expect: { action: Action; at: number; lead: number } | null = null;
  fx: Fx[] = [];
  private seg: Seg | null = null;
  private dropping = false;
  private pending: { at: number; what: 'serve' | 'return' } | null = null;
  private digUsed = false;
  private lockUntil = 0;
  private rand: () => number;
  private assist: boolean;
  private contactMs: (anim: string) => number;

  constructor(layout: Layout, seed: number, assist: boolean, contactMs: (anim: string) => number) {
    this.L = layout;
    this.rand = rng(seed);
    this.assist = assist;
    this.contactMs = contactMs;
  }

  relayout(layout: Layout): void {
    this.L = layout;
  }

  get speed(): number {
    const ramp = 1 + Math.min(0.6, 0.05 * Math.floor(this.touches / 10));
    return ramp * (this.assist ? 0.8 : 1);
  }

  get multiplier(): number {
    return Math.min(2, 1 + 0.1 * Math.floor(this.combo / 5));
  }

  private win(k: 'perfect' | 'good' | 'dig'): number {
    return WIN[k] * (this.assist ? 1.5 : 1);
  }

  start(t: number): void {
    this.t = t;
    this.pending = { at: t + 0.35, what: 'serve' };
  }

  private play(anim: string, t: number, alignContact = false): void {
    this.anim = anim;
    this.animStart = alignContact ? t - this.contactMs(anim) / 1000 : t;
    const c = CONTACT_FRAME[anim];
    if (alignContact && c && c.hide > 0) this.hideBallUntil = t + c.hide * 0.083 + 0.02;
  }

  private bubble(text: string): void {
    this.fx.push({ kind: 'bubble', text });
  }

  private serve(t: number): void {
    const hit = t + this.contactMs('volleyball_serve') / 1000;
    this.play('volleyball_serve', t);
    this.hideBallUntil = hit + 0.1;
    this.digUsed = false;
    this.rally = 0;
    this.dropping = false;
    this.seg = { a: this.L.contact.serve, b: this.L.far, t0: hit, t1: hit + BASE.serveFly / this.speed, apex: 46 };
    this.pending = { at: this.seg.t1 + BASE.oppDelay / this.speed, what: 'return' };
    this.fx.push({ kind: 'sfx', sfx: 'whistle' });
  }

  private opponent(t: number): void {
    const spike = this.touches > 2 && this.rand() < 0.2;
    if (spike) {
      const d = BASE.opp / this.speed;
      this.seg = { a: this.L.farHigh, b: this.L.contact.block, t0: t, t1: t + d, apex: -6 };
      this.expect = { action: 'block', at: t + d, lead: d };
      this.fx.push({ kind: 'pop', text: 'INCOMING!', color: '#ff5a5f', x: this.L.far.x, y: this.L.far.y - 18 });
    } else {
      const d = BASE.ret / this.speed;
      this.seg = { a: this.L.far, b: this.L.contact.bump, t0: t, t1: t + d, apex: 80 };
      this.expect = { action: 'bump', at: t + d, lead: d };
    }
  }

  /** Player input at game time t. */
  tap(t: number): Judge | null {
    if (this.ended || !this.expect || t < this.lockUntil) return null;
    const dt = t - this.expect.at;
    if (dt < -WIN.early) return null;
    if (Math.abs(dt) <= this.win('perfect')) return this.hit('perfect', t);
    if (Math.abs(dt) <= this.win('good')) return this.hit('good', t);
    if (dt < 0) {
      this.lockUntil = t + WIN.lockout;
      this.fx.push({ kind: 'pop', text: 'TOO EARLY', color: '#c9b8ff', x: this.L.px, y: this.L.ground - 152 });
      return 'early';
    }
    if (dt <= this.win('dig') && !this.digUsed) return this.hit('dig', t);
    return null;
  }

  private hit(kind: 'perfect' | 'good' | 'dig', t: number): Judge {
    const ex = this.expect!;
    const action = ex.action;
    this.expect = null;
    this.touches += 1;
    this.combo += 1;
    this.rally += 1;
    this.maxRally = Math.max(this.maxRally, this.rally);
    let base = kind === 'perfect' ? 100 : kind === 'good' ? 50 : 25;
    if (action === 'block') base += kind === 'dig' ? 0 : 100;
    const pts = Math.round(base * this.multiplier);
    this.score += pts;
    if (kind === 'perfect') this.perfect += 1;
    else if (kind === 'good') this.good += 1;
    else {
      this.digs += 1;
      this.digUsed = true;
    }
    if (action === 'block' && kind !== 'dig') this.blocks += 1;

    const at = Math.max(t, ex.at - 0.05);
    const c = this.L.contact;
    const label = kind === 'perfect' ? 'PERFECT!' : kind === 'good' ? 'GOOD' : 'DIG!';
    const color = kind === 'perfect' ? '#ffd25a' : kind === 'good' ? '#fff6ea' : '#7fd6c2';
    const from = kind === 'dig' ? c.dig : c[action];
    // score pops stack above P1's speech bubble so they never overlap it
    this.fx.push({ kind: 'pop', text: label, color, x: this.L.px, y: this.L.ground - 153 });
    this.fx.push({ kind: 'pop', text: `+${pts}`, color: '#ffb7c5', x: this.L.px, y: this.L.ground - 142 });
    this.play(kind === 'dig' ? 'volleyball_dig' : `volleyball_${action}`, at, true);
    this.fx.push({ kind: 'sfx', sfx: action === 'spike' ? 'spike' : 'ball_hit' });
    if (kind === 'perfect') this.fx.push({ kind: 'sfx', sfx: 'sparkle' });

    const sp = this.speed;
    if (action === 'bump') {
      const d = BASE.bs / sp;
      this.seg = { a: from, b: c.set, t0: at, t1: at + d, apex: 64 };
      this.expect = { action: 'set', at: at + d, lead: d };
      this.bubble(kind === 'dig' ? 'PANCAKE!' : 'SET!');
    } else if (action === 'set') {
      const d = BASE.ss / sp;
      this.seg = { a: from, b: c.spike, t0: at, t1: at + d, apex: 34 };
      this.expect = { action: 'spike', at: at + d, lead: d };
      this.bubble(kind === 'dig' ? 'PANCAKE! SPIKE!!' : 'SPIKE!!');
    } else {
      const d = (action === 'spike' ? BASE.spikeFly : BASE.blockFly) / sp;
      this.seg = { a: from, b: this.L.far, t0: at, t1: at + d, apex: action === 'spike' ? -8 : 20 };
      this.pending = { at: at + d + BASE.oppDelay / sp, what: 'return' };
      if (action === 'block') {
        this.bubble('STUFF BLOCK!');
        this.fx.push({ kind: 'cheer' }, { kind: 'sfx', sfx: 'cheer' });
      } else this.bubble(this.rally % 9 === 3 ? 'KILL! POINT GATORS!' : this.rand() < 0.5 ? 'KILL!' : 'SIDE OUT!');
    }
    if (this.rally > 0 && this.rally % 10 === 0) {
      this.fx.push({ kind: 'pop', text: `RALLY ${this.rally}!`, color: '#ff8a5f', x: this.L.w / 2, y: 40 }, { kind: 'cheer' });
    }
    return kind;
  }

  private drop(t: number): void {
    this.expect = null;
    this.combo = 0;
    this.rally = 0;
    this.drops += 1;
    this.digUsed = false;
    this.dropping = true;
    const from = this.ballAt(t);
    const land: Pt = { x: this.L.px + 26, y: this.L.ground - 4, s: 1, gy: this.L.ground + 3 };
    this.seg = { a: { ...from, gy: this.L.ground + 3 }, b: land, t0: t, t1: t + 0.3, apex: 0 };
    this.play('volleyball_ready', t);
    this.bubble(this.rand() < 0.5 ? 'FREE BALL! AGAIN!' : 'NOT THE SET! NEXT!');
    this.pending = { at: t + BASE.drop, what: 'serve' };
  }

  update(t: number): void {
    this.t = t;
    if (this.ended) return;
    if (t >= DURATION) {
      this.ended = true;
      this.expect = null;
      this.pending = null;
      this.seg = null;
      this.play('volleyball_win', t);
      this.fx.push({ kind: 'sfx', sfx: 'whistle' }, { kind: 'cheer' });
      this.bubble(this.maxRally >= 20 ? 'WHAT A RALLY!' : 'GOOD GAME! REMATCH?');
      return;
    }
    if (this.pending && t >= this.pending.at) {
      const what = this.pending.what;
      this.pending = null;
      if (what === 'serve') this.serve(t);
      else this.opponent(t);
    }
    if (this.expect) {
      const late = t - this.expect.at;
      if (late > (this.digUsed ? this.win('good') : this.win('dig'))) this.drop(t);
    }
    const clipDone = this.anim !== 'volleyball_ready' && this.anim !== 'volleyball_win' && t - this.animStart > 0.55;
    if (clipDone) this.play('volleyball_ready', t);
  }

  /** Ball position (x, y, size factor) and its shadow at time t; null when hidden. */
  ballAt(t: number): Pt & { visible: boolean } {
    const s = this.seg;
    if (!s) return { x: -99, y: -99, s: 1, gy: this.L.ground, visible: false };
    const span = Math.max(0.001, s.t1 - s.t0);
    const u = (t - s.t0) / span;
    const uc = clamp(u, 0, 1);
    let x = lerp(s.a.x, s.b.x, u);
    let y = lerp(s.a.y, s.b.y, u) - s.apex * 4 * u * (1 - u);
    const gy = u > 1 ? this.L.ground + 3 : lerp(s.a.gy, s.b.gy, uc);
    if (this.dropping && u > 1) {
      // little bounces after the drop
      const k = (t - s.t1) / 0.35;
      x = s.b.x + Math.min(20, k * 8);
      y = s.b.y - Math.max(0, Math.sin(Math.min(k, 3) * Math.PI)) * (14 / (1 + Math.floor(k)));
    }
    y = Math.min(y, this.L.ground - 4);
    return { x, y, s: lerp(s.a.s, s.b.s, uc), gy, visible: t >= this.hideBallUntil && t >= s.t0 - 0.001 };
  }

  /** The timing ring around the landing spot: r shrinks to rMin at the contact time. */
  ring(t: number): { x: number; y: number; k: number; quality: 'far' | 'good' | 'perfect'; action: Action } | null {
    const e = this.expect;
    if (!e) return null;
    const k = clamp((e.at - t) / e.lead, 0, 1);
    const d = Math.abs(t - e.at);
    const quality = d <= this.win('perfect') ? 'perfect' : d <= this.win('good') ? 'good' : 'far';
    return { x: this.L.px, y: this.L.ground + 3, k, quality, action: e.action };
  }

  takeFx(): Fx[] {
    const out = this.fx;
    this.fx = [];
    return out;
  }

  stats(): Record<string, number> {
    return { maxRally: this.maxRally, touches: this.touches, perfect: this.perfect, good: this.good, digs: this.digs, blocks: this.blocks, drops: this.drops };
  }
}
