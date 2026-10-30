// Petal Catch rules (GAME_DESIGN.md §9): run left/right under the Plaza sakura for 45 s.
// Pink petals +1, golden +10, snacks +2 (and +5 hunger, max +30); squirrel acorns make the pig tumble 0.8 s.
import { clamp, lerp, rng } from '../common/pixel';

export type ItemKind = 'petal' | 'gold' | 'snack' | 'acorn';

export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  vy: number;
  sway: number;
  freq: number;
  phase: number;
  icon?: string;
  /** Time it touched the ground (for a short landing fade). */
  landed?: number;
}

export interface Squirrel { x: number; appear: number; throwAt: number; leave: number; thrown: boolean; dir: 1 | -1 }

export interface PetalFx { kind: 'pop' | 'sfx'; text?: string; color?: string; x?: number; y?: number; sfx?: 'sparkle' | 'coin' | 'eat' | 'surprise' | 'whistle' | 'cheer' }

export const DURATION = 45;
export const BRANCH_Y = 22;

export class PetalEngine {
  w: number;
  h: number;
  ground: number;
  t = 0;
  ended = false;
  pig = { x: 0, facing: 1 as 1 | -1, moving: false, tumbleUntil: -1, happyUntil: -1 };
  items: Item[] = [];
  squirrels: Squirrel[] = [];
  score = 0;
  pink = 0;
  golden = 0;
  snacks = 0;
  acornHits = 0;
  fx: PetalFx[] = [];
  private nextAt = { petal: 0.2, gold: 4, snack: 5.5, squirrel: 6 };
  private nextId = 0;
  private rand: () => number;
  private assist: boolean;

  constructor(w: number, h: number, seed: number, assist: boolean) {
    this.w = w;
    this.h = h;
    this.ground = h - 6;
    this.pig.x = Math.round(w / 2);
    this.rand = rng(seed);
    this.assist = assist;
  }

  resize(w: number, h: number): void {
    const k = w / this.w;
    for (const it of this.items) it.x *= k;
    for (const s of this.squirrels) s.x *= k;
    this.pig.x *= k;
    this.w = w;
    this.h = h;
    this.ground = h - 6;
  }

  get speed(): number {
    return this.assist ? 140 : 160;
  }

  get fall(): number {
    return this.assist ? 0.8 : 1;
  }

  get catchHalf(): number {
    return this.assist ? 30 : 22;
  }

  /** Catch box (logical px) around the pig's head and arms. */
  box(): { x0: number; x1: number; y0: number; y1: number } {
    const h = this.catchHalf;
    return { x0: this.pig.x - h, x1: this.pig.x + h, y0: this.ground - 106, y1: this.ground - 34 };
  }

  get petalPoints(): number {
    return this.pink + this.golden * 10;
  }

  private spawn(kind: ItemKind, x: number): void {
    const r = this.rand;
    const base = { id: this.nextId++, kind, x, y: kind === 'acorn' ? BRANCH_Y + 6 : -6, phase: r() * Math.PI * 2 };
    if (kind === 'petal') this.items.push({ ...base, vy: lerp(38, 58, r()), sway: lerp(5, 12, r()), freq: lerp(1.4, 2.6, r()) });
    else if (kind === 'gold') this.items.push({ ...base, vy: 62, sway: 4, freq: 2.2 });
    else if (kind === 'snack') this.items.push({ ...base, vy: 72, sway: 0, freq: 0, icon: r() < 0.5 ? 'onigiri' : 'oranges' });
    else this.items.push({ ...base, vy: 124, sway: 0, freq: 0, icon: 'acorn' });
  }

  update(t: number, input: { dir: number; target: number | null }): void {
    const dt = clamp(t - this.t, 0, 0.1);
    this.t = t;
    if (this.ended) return;
    if (t >= DURATION) {
      this.ended = true;
      this.pig.happyUntil = t + 3;
      this.fx.push({ kind: 'sfx', sfx: 'whistle' });
      return;
    }
    const r = this.rand;
    const density = clamp(this.w / 320, 0.6, 1.5);
    if (t >= this.nextAt.petal) {
      this.spawn('petal', lerp(6, this.w - 6, r()));
      this.nextAt.petal = t + lerp(0.42, 0.27, t / DURATION) / density;
    }
    if (t >= this.nextAt.gold) {
      this.spawn('gold', lerp(16, this.w - 16, r()));
      this.nextAt.gold = t + lerp(4.2, 6.2, r());
    }
    if (t >= this.nextAt.snack) {
      this.spawn('snack', lerp(14, this.w - 14, r()));
      this.nextAt.snack = t + lerp(5, 7, r());
    }
    if (t >= this.nextAt.squirrel) {
      const aim = clamp(this.pig.x + lerp(-36, 36, r()), 14, this.w - 14);
      this.squirrels.push({ x: aim, appear: t, throwAt: t + 0.8, leave: t + 1.4, thrown: false, dir: r() < 0.5 ? 1 : -1 });
      this.nextAt.squirrel = t + lerp(3.4, 5.2, r()) / Math.min(1.25, density);
    }
    for (const s of this.squirrels) {
      if (!s.thrown && t >= s.throwAt) {
        s.thrown = true;
        this.spawn('acorn', s.x);
      }
    }
    this.squirrels = this.squirrels.filter((s) => t < s.leave);

    // movement
    const p = this.pig;
    const tumbling = t < p.tumbleUntil;
    let vx = 0;
    if (!tumbling) {
      if (input.target !== null) {
        const d = input.target - p.x;
        if (Math.abs(d) > 2) vx = Math.sign(d) * Math.min(this.speed, Math.abs(d) / Math.max(dt, 0.001));
      } else vx = input.dir * this.speed;
    }
    p.moving = Math.abs(vx) > 1;
    if (p.moving) p.facing = vx > 0 ? 1 : -1;
    p.x = clamp(p.x + vx * dt, 18, this.w - 18);

    // falling + catching
    const b = this.box();
    for (const it of this.items) {
      if (it.landed !== undefined) continue;
      it.y += it.vy * this.fall * dt;
      const x = this.itemX(it);
      const inBox = x >= b.x0 && x <= b.x1 && it.y >= b.y0 && it.y <= b.y1;
      if (inBox && it.kind === 'acorn') {
        it.landed = -1;
        if (!tumbling) {
          p.tumbleUntil = t + 0.8;
          this.acornHits += 1;
          this.fx.push({ kind: 'pop', text: 'OW!', color: '#ff5a5f', x: p.x, y: b.y0 - 6 }, { kind: 'sfx', sfx: 'surprise' });
        }
      } else if (inBox && !tumbling) {
        it.landed = -1;
        if (it.kind === 'petal') {
          this.pink += 1;
          this.score += 1;
          this.fx.push({ kind: 'pop', text: '+1', color: '#ffb7c5', x, y: it.y - 4 });
        } else if (it.kind === 'gold') {
          this.golden += 1;
          this.score += 10;
          p.happyUntil = t + 0.6;
          this.fx.push({ kind: 'pop', text: '+10', color: '#ffd25a', x, y: it.y - 4 }, { kind: 'sfx', sfx: 'sparkle' });
        } else if (it.kind === 'snack') {
          this.snacks += 1;
          this.score += 2;
          this.fx.push({ kind: 'pop', text: '+2 YUM', color: '#7fd6c2', x, y: it.y - 4 }, { kind: 'sfx', sfx: 'eat' });
        }
      } else if (it.y >= this.ground - 2) {
        it.y = this.ground - 2;
        it.landed = t;
      }
    }
    this.items = this.items.filter((it) => it.landed === undefined || (it.landed > 0 && t - it.landed < 0.6));
  }

  itemX(it: Item): number {
    return it.x + Math.sin(this.t * it.freq + it.phase) * it.sway;
  }

  takeFx(): PetalFx[] {
    const out = this.fx;
    this.fx = [];
    return out;
  }

  stats(): Record<string, number> {
    return { petals: this.petalPoints, pink: this.pink, golden: this.golden, snacks: this.snacks, acorns: this.acornHits };
  }
}
