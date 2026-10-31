// Kempanion Online link-preview scene: the title screen's dusk Century Tower, falling pixel sakura and the three
// pigs greeting you from the brick path, under the title logo (DOM, in scene.html).
// scripts/build-og.ts opens scene.html, awaits window.og.ready, then calls window.og.render(i) for each frame.
//
// The art is drawn on the game's 480-wide grid (title.png cropped to 480x252, the 1200x630 ratio) at SCALE output
// px per grid px, nearest-neighbour. Sprites use three output pixels per atlas pixel so their faces read in a chat card.
//
// Everything that moves repeats exactly every LOOP_S seconds, so the last frame flows into the first:
// - Petals ride "lanes": a lane's n petals share one fall path, LOOP_S apart in time, so after one loop each petal
//   is exactly where the next one down the lane was at the start, while a full fall still takes n x LOOP_S
//   (12-24 s, so 11-22 px/s, inside the game's 10-22). Positions are whole frames, so frame FRAMES == frame 0.
// - Sprite clips: idle cycles are 2 s (3 per loop); a wave starts and ends on the standing pose.

const SCALE = 4;
const W = 480;
const H = 252;
const LOOP_S = 6;
const FPS = 30;
const FRAMES = LOOP_S * FPS;

const BG = '/assets/bg/title.png';
const BG_CROP_Y = 0; // keep the top of the tower; the 18 dropped rows are flowerbed and path
const LANES = 13;
const SEED = 0x6b656d70; // "kemp"

// Petal sprites and palette, as in src/lib/ui/meta/petals.ts (DAY palette, which the title screen uses).
const PAL = { a: '#ffe3ea', b: '#f49ac1', c: '#d9578c' };
const SMALL = [
  ['.bb.', 'baab', '.bc.'],
  ['.b.', 'bab', '.c.'],
  ['b.', 'bc'],
  ['.b.', 'bab', '.c.'],
];
const BIG = [
  ['.bbb.', 'baabb', 'babbc', '.bcc.'],
  ['.bb.', 'babb', 'bbbc', '.cc.'],
  ['.b.', 'bab', 'bbc', '.c.'],
  ['.bb.', 'babb', 'bbbc', '.cc.'],
];

// A foreground trio on the brick path: 60 grid px apart, the middle one a step further back.
// x/feet are grid px; idle offsets keep them from bobbing in sync; wave = start time in seconds.
const PIGS = [
  { id: 'piggy-1', x: 264, feet: 244, idleMs: 0, wave: 0.9 },
  { id: 'piggy-2', x: 324, feet: 238, idleMs: 700, wave: 2.1 },
  { id: 'piggy-3', x: 384, feet: 244, idleMs: 1330, wave: 3.3 },
];

const cv = /** @type {HTMLCanvasElement} */ (document.getElementById('cv'));
const ctx = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
cv.width = W * SCALE;
cv.height = H * SCALE;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const rand = (a, b) => a + rnd() * (b - a);
const mod = (a, n) => ((a % n) + n) % n;

// ── petal lanes ──
// n petals per lane, one loop apart: the fall takes n loops (2 → 12 s, 3 → 18 s, 4 → 24 s).
const MARGIN = 6; // grid px above/below the frame where a petal wraps, out of sight
const kinds = Array.from({ length: LANES }, (_, i) => [2, 3, 4, 3][i % 4]);
for (let i = kinds.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
}
const lanes = kinds.map((n, i) => {
  const fall = n * FRAMES; // frames for one full fall
  const vx = rand(-6, 6); // grid px per second
  const xc = -12 + ((i + rand(0.2, 0.8)) * (W + 24)) / LANES; // stratified, so no clumps or gaps
  return {
    n,
    fall,
    x0: xc - (vx * fall) / FPS / 2,
    vx,
    amp: rand(4, 10),
    omega: rand(1.6, 3.2),
    phase: rand(0, Math.PI * 2),
    flipEvery: rand(0.15, 0.3),
    frame0: Math.floor(rand(0, 4)),
    big: rnd() < 0.3,
    start: Math.floor(rand(0, fall)),
  };
});

// A few petals close to the camera, in front of the pigs: drawn at 3 grid px per petal pixel and falling twice as
// fast (one fall per loop), so the motion still reads in a thumbnail-sized chat bubble (an iPhone draws the video
// about 260 pt wide). FG_MARGIN must cover a big petal at that size (4 rows × 3) so it wraps out of sight.
const FG_LANES = 10;
const FG_PX = 3;
const FG_MARGIN = 14;
const fgLanes = Array.from({ length: FG_LANES }, (_, i) => {
  const vx = rand(-10, 10);
  const xc = 20 + ((i + rand(0.15, 0.85)) * (W - 40)) / FG_LANES;
  return {
    x0: xc - (vx * LOOP_S) / 2,
    vx,
    amp: rand(8, 16),
    omega: rand(1.6, 2.6),
    phase: rand(0, Math.PI * 2),
    flipEvery: rand(0.18, 0.3),
    frame0: Math.floor(rand(0, 4)),
    big: rnd() < 0.5,
    start: Math.floor(rand(0, FRAMES)),
  };
});

function drawPetal(rows, ox, oy, px = 1) {
  const size = SCALE * px;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      ctx.fillStyle = PAL[ch];
      ctx.fillRect(ox * SCALE + x * size, oy * SCALE + y * size, size, size);
    }
  }
}

function drawPetals(i) {
  for (const L of lanes) {
    for (let j = 0; j < L.n; j++) {
      const f = mod(i + j * FRAMES + L.start, L.fall); // frames into this petal's fall
      const s = f / FPS;
      const y = -MARGIN + ((H + 2 * MARGIN) * f) / L.fall;
      const x = L.x0 + L.vx * s + L.amp * Math.sin(L.omega * s + L.phase);
      const frame = (Math.floor(s / L.flipEvery) + L.frame0) % 4;
      drawPetal((L.big ? BIG : SMALL)[frame], Math.round(x), Math.round(y));
    }
  }
}

function drawForegroundPetals(i) {
  for (const L of fgLanes) {
    const f = mod(i + L.start, FRAMES);
    const s = f / FPS;
    const y = -FG_MARGIN + ((H + 2 * FG_MARGIN) * f) / FRAMES;
    const x = L.x0 + L.vx * s + L.amp * Math.sin(L.omega * s + L.phase);
    const frame = (Math.floor(s / L.flipEvery) + L.frame0) % 4;
    drawPetal((L.big ? BIG : SMALL)[frame], Math.round(x), Math.round(y), FG_PX);
  }
}

// ── pigs ──
const SPRITE = 128; // atlas cell
const PIVOT_Y = 114; // feet line inside a cell (src/generated/sprites.json "frame.pivotY")
let sprites = null; // filled by load()

function clipFrame(def, ms) {
  let acc = 0;
  for (let k = 0; k < def.frames; k++) {
    acc += def.durations[k];
    if (ms < acc) return k;
  }
  return def.frames - 1;
}

/** A flat, pixel-stepped oval under the feet (sprite px), so the pigs stand on the path instead of hovering. */
function drawShadow(cx, cy, rx, ry, ps) {
  ctx.fillStyle = 'rgba(26, 16, 48, 0.38)';
  for (let dy = -ry + 1; dy < ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2));
    ctx.fillRect(cx - half * ps, cy + dy * ps, half * 2 * ps, ps);
  }
}

function drawPigs(i) {
  const ms = (i * 1000) / FPS;
  const ps = 3;
  for (const p of PIGS) drawShadow(p.x * SCALE, p.feet * SCALE - ps, 21, 4, ps);
  for (const p of PIGS) {
    const set = sprites[p.id];
    let clip = set.idle;
    let frame = clipFrame(set.idle.def, mod(ms + p.idleMs, set.idle.total));
    if (p.wave !== null) {
      const into = mod(ms, LOOP_S * 1000) - p.wave * 1000;
      if (into >= 0 && into < set.wave.total) {
        clip = set.wave;
        frame = clipFrame(set.wave.def, into);
      }
    }
    ctx.drawImage(
      clip.img,
      frame * SPRITE, clip.def.y, SPRITE, SPRITE,
      p.x * SCALE - (SPRITE / 2) * ps, p.feet * SCALE - PIVOT_Y * ps, SPRITE * ps, SPRITE * ps,
    );
  }
}

// ── static layer: background + the title screen's shade ──
const base = document.createElement('canvas');
base.width = cv.width;
base.height = cv.height;

function paintBase(bg) {
  const b = /** @type {CanvasRenderingContext2D} */ (base.getContext('2d'));
  b.imageSmoothingEnabled = false;
  b.drawImage(bg, 0, BG_CROP_Y, W, H, 0, 0, base.width, base.height);
  // Title.svelte .shade: darker on the left behind the logo, a little at the bottom.
  const g1 = b.createLinearGradient(0, 0, base.width, 0);
  g1.addColorStop(0, 'rgba(26, 16, 48, 0.62)');
  g1.addColorStop(0.4, 'rgba(26, 16, 48, 0.25)');
  g1.addColorStop(0.62, 'rgba(26, 16, 48, 0)');
  b.fillStyle = g1;
  b.fillRect(0, 0, base.width, base.height);
  const g2 = b.createLinearGradient(0, base.height, 0, 0);
  g2.addColorStop(0, 'rgba(26, 16, 48, 0.55)');
  g2.addColorStop(0.18, 'rgba(26, 16, 48, 0)');
  b.fillStyle = g2;
  b.fillRect(0, 0, base.width, base.height);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function load() {
  const atlas = await (await fetch('/sprites.json')).json();
  const clip = async (pig, anim) => {
    const def = atlas.sets[`${pig}/everyday`].anims[anim];
    return { def, total: def.durations.reduce((a, b) => a + b, 0), img: await loadImage(`/assets/${def.page}`) };
  };
  const entries = await Promise.all(
    PIGS.map(async (p) => [p.id, { idle: await clip(p.id, 'idle'), wave: await clip(p.id, 'wave') }]),
  );
  sprites = Object.fromEntries(entries);
  paintBase(await loadImage(BG));
  await Promise.all([
    document.fonts.load('700 160px "Pixelify Sans"', 'KEMPANION ONLINE'),
    document.fonts.load('400 32px "DotGothic16"', 'ケンパニオン・オンライン「～Sakura Campus Days～」'),
  ]);
  await document.fonts.ready;
}

function render(i) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0);
  drawPetals(i);
  drawPigs(i);
  drawForegroundPetals(i);
}

window.og = { ready: load().then(() => render(0)), render, FRAMES, FPS, LOOP_S, width: cv.width, height: cv.height };
