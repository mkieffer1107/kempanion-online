// Pixel sakura petals drawn on a low-res canvas (one canvas px = `pixel` CSS px, upscaled nearest-neighbour).
// Motion follows design-ux §6: fall 10–22 px/s, drift ±6, sway 4–10 px at 1.6–3.2 rad/s, flips every 150–300 ms,
// gusts every 25–45 s (+35 px/s over 1.2 s, dying over 2 s).

export interface PetalOptions {
  count: number;
  /** CSS px per petal pixel (a function is re-evaluated on resize). */
  pixel: number | (() => number);
  night?: boolean;
}

export interface PetalHandle {
  stop(): void;
  resize(): void;
}

type Pal = Record<'a' | 'b' | 'c', string>;
const DAY: Pal = { a: '#ffe3ea', b: '#f49ac1', c: '#d9578c' };

function mixHex(hex: string, to: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(hex, i) * (1 - t) + p(to, i) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const NIGHT: Pal = { a: mixHex(DAY.a, '#2a1d4a', 0.5), b: mixHex(DAY.b, '#2a1d4a', 0.55), c: mixHex(DAY.c, '#2a1d4a', 0.6) };

const SMALL: string[][] = [
  ['.bb.', 'baab', '.bc.'],
  ['.b.', 'bab', '.c.'],
  ['b.', 'bc'],
  ['.b.', 'bab', '.c.'],
];
const BIG: string[][] = [
  ['.bbb.', 'baabb', 'babbc', '.bcc.'],
  ['.bb.', 'babb', 'bbbc', '.cc.'],
  ['.b.', 'bab', 'bbc', '.c.'],
  ['.bb.', 'babb', 'bbbc', '.cc.'],
];

// The eight opaque pixel shapes never change. Rasterize them once per palette instead of
// resubmitting every colored pixel on every animation frame.
const frameCache = new Map<Pal, HTMLCanvasElement[]>();

function petalFrames(pal: Pal): HTMLCanvasElement[] {
  const cached = frameCache.get(pal);
  if (cached) return cached;
  const frames = [...SMALL, ...BIG].map((rows) => {
    const tile = document.createElement('canvas');
    tile.width = Math.max(...rows.map((row) => row.length));
    tile.height = rows.length;
    const g = tile.getContext('2d')!;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x] as keyof Pal | '.';
        if (ch === '.') continue;
        g.fillStyle = pal[ch];
        g.fillRect(x, y, 1, 1);
      }
    }
    return tile;
  });
  frameCache.set(pal, frames);
  return frames;
}

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  amp: number;
  omega: number;
  phase: number;
  frame: number;
  flipIn: number;
  flipEvery: number;
  big: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function runPetals(canvas: HTMLCanvasElement, opts: PetalOptions): PetalHandle {
  const maybe = canvas.getContext('2d');
  if (!maybe) return { stop() {}, resize() {} };
  const ctx: CanvasRenderingContext2D = maybe;
  const pal = opts.night ? NIGHT : DAY;
  const frames = petalFrames(pal);
  let w = 1;
  let h = 1;
  let wind = 0;
  let gustAge = -1;
  let nextGust = rand(25, 45);
  let raf = 0;
  let last = performance.now();
  let t = 0;

  function resize() {
    const px = Math.max(1, typeof opts.pixel === 'function' ? opts.pixel() : opts.pixel);
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.ceil(r.width / px));
    h = Math.max(1, Math.ceil(r.height / px));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function spawn(initial: boolean): Petal {
    return {
      x: rand(-30, w),
      y: initial ? rand(-10, h) : rand(-12, -4),
      vx: rand(-6, 6),
      vy: rand(10, 22),
      amp: rand(4, 10),
      omega: rand(1.6, 3.2),
      phase: rand(0, Math.PI * 2),
      frame: Math.floor(rand(0, 4)),
      flipEvery: rand(0.15, 0.3),
      flipIn: rand(0, 0.3),
      big: Math.random() < 0.3,
    };
  }

  resize();
  const petals: Petal[] = Array.from({ length: Math.max(0, opts.count) }, () => spawn(true));

  function draw(p: Petal) {
    const ox = Math.round(p.x + p.amp * Math.sin(p.omega * t + p.phase));
    const oy = Math.round(p.y);
    ctx.drawImage(frames[(p.big ? 4 : 0) + p.frame], ox, oy);
  }

  function tick(now: number) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    t += dt;

    nextGust -= dt;
    if (nextGust <= 0 && gustAge < 0) gustAge = 0;
    if (gustAge >= 0) {
      gustAge += dt;
      wind = gustAge < 1.2 ? 35 * (gustAge / 1.2) : 35 * Math.max(0, 1 - (gustAge - 1.2) / 2);
      if (gustAge > 3.2) {
        gustAge = -1;
        wind = 0;
        nextGust = rand(25, 45);
      }
    }

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.x += (p.vx + wind) * dt;
      p.y += p.vy * dt;
      p.flipIn -= dt * (1 + wind / 35);
      if (p.flipIn <= 0) {
        p.frame = (p.frame + 1) % 4;
        p.flipIn = p.flipEvery;
      }
      if (p.y > h + 6 || p.x > w + 16) petals[i] = spawn(false);
      else draw(p);
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    stop() {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    },
    resize,
  };
}
