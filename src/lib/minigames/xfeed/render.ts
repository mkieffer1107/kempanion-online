// For You Pig — procedural pixel art for the feed (avatars, media strips, footer icons, the acorn badge, the read
// line's glasses, the phone's pig ears, the touch-grass lawn) and Piggy 3's portrait/clip lookups.
// Small canvases → cached PNG data URLs. Nothing touches the DOM at import time, so the tests can import this module.
// No birds anywhere (the avatar templates are pigs, cats, robots, books…), no logos: X is a plain letter.
import raw from '../../../generated/sprites.json';
import { drawText, fillCircle } from '../common/pixel';
import { drawPetal, drawSquirrel } from '../petals/render';
import { POSE_FALLBACK, hashStr, type Pose } from './host';
import type { Author, MediaKind, Species } from './posts';

const K = '#1b1229';
const CREAM = '#fff6ea';

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Paint a row pattern ('.' = transparent, other letters from `pal`). */
function rows(ctx: Ctx, rs: readonly string[], pal: Record<string, string>, ox = 0, oy = 0): void {
  rs.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const c = pal[r[x]];
      if (r[x] === '.' || !c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

/** Mirror 8-character left halves into 16-wide rows. */
const sym = (halves: readonly string[]) => halves.map((h) => h + [...h].reverse().join(''));

const cache = new Map<string, string>();
function cached(key: string, draw: () => HTMLCanvasElement): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const url = typeof document === 'undefined' ? '' : draw().toDataURL('image/png');
  cache.set(key, url);
  return url;
}

// ───────────────────────── avatars (16×16, shown at 2×) ─────────────────────────

/** Six disc palettes picked by the handle's hash: background, the species' main tint, its accent. */
const PALETTES = [
  { bg: '#d0b8f6', fur: '#fff6ea', acc: '#8c63d2' },
  { bg: '#9fdcc0', fur: '#ffe0b8', acc: '#3c8f6a' },
  { bg: '#ffd3a8', fur: '#ffb27a', acc: '#c9733a' },
  { bg: '#a8d8f0', fur: '#e4e7f5', acc: '#3d7fb8' },
  { bg: '#ffe08a', fur: '#c9c0d8', acc: '#b8862b' },
  { bg: '#f7b7c8', fur: '#fff6ea', acc: '#c2507a' },
] as const;

const PIG = [
  '................', '..kk........kk..', '.kpPk......kPpk.', '.kPPPkkkkkkPPPk.', '..kPPPPPPPPPPk..', '.kPPPPPPPPPPPPk.',
  '.kPPkkPPPPkkPPk.', '.kPPkkPPPPkkPPk.', '.kPPPPPPPPPPPPk.', '.kPPPkkkkkkPPPk.', '.kPPkppppppkPPk.', '.kPPkpkppkpkPPk.',
  '..kPPkkkkkkPPk..', '...kkPPPPPPkk...', '.....kkkkkk.....', '................',
];
const CAT = sym([
  '........', '..k.....', '..kk....', '..kak...', '..kaak..', '..kaaakk', '.kaaaaaa', '.kaaaaaa',
  '.kaeeaaa', '.kaeeaaa', '.kaaaaap', '.kbaaaak', '..kaaaaa', '...kkkkk', '........', '........',
]);
const ROBOT = [
  '.......kk.......', '.......yk.......', '.......kk.......', '...kkkkkkkkkk...', '..kGGGGGGGGGGk..', '..kGkkkGGkkkGk..',
  '..kGkCkGGkCkGk..', '..kGkkkGGkkkGk..', '..kGGGGGGGGGGk..', '..kGGkkkkkkGGk..', '..kGGkwkwkwGGk..', '..kGGkkkkkkGGk..',
  '..kGGGGGGGGGGk..', '...kkkkkkkkkk...', '................', '................',
];
const BRAIN = [
  '................', '................', '.....kkkkkk.....', '...kkBbBBbBkk...', '..kBBbBBBBbBBk..', '.kBbBBkBBkBBbBk.',
  '.kBBbBBkkBBbBBk.', '.kBbBBbkkbBBbBk.', '.kBBBbBkkBbBBBk.', '..kBbBBkkBBbBk..', '...kkBBkkBBkk...', '.....kkkkkk.....',
  '.......kk.......', '.......bk.......', '................', '................',
];
const CHIP = [
  '................', '....y.y..y.y....', '...kkkkkkkkkk...', '..kddddddddddk..', 'y.kdGGGGGGGGdk.y', '..kdGddddddGdk..',
  'y.kdGdyyyydGdk.y', '..kdGdyyyydGdk..', 'y.kdGdyyyydGdk.y', '..kdGddddddGdk..', 'y.kdGGGGGGGGdk.y', '..kddddddddddk..',
  '...kkkkkkkkkk...', '....y.y..y.y....', '................', '................',
];
const HEART = [
  '................', '................', '...kkk....kkk...', '..kRRRk..kRRRk..', '.kRRRRRkkRRRRRk.', '.kRRRRRRRRRRRRk.',
  '.kRRRRRRRRRRRRk.', '.kwwwwRwRRwwwwk.', '.kRRRRwRwRRRRRk.', '..kRRRRRwRRRRk..', '...kRRRRRRRRk...', '....kRRRRRRk....',
  '.....kRRRRk.....', '......kRRk......', '.......kk.......', '................',
];
const BOOK = [
  '................', '................', '................', '..kkkk....kkkk..', '.kwwwwkkkkwwwwk.', '.kwllwwkkwwllwk.',
  '.kwwwwwkkwwwwwk.', '.kwllwwkkwwllwk.', '.kwwwwwkkwwwwwk.', '.kwllwwkkwwllwk.', '.kwwwwwkkwwwwwk.', '.kaaaaakkaaaaak.',
  '..kkkkkkkkkkkk..', '................', '................', '................',
];
const BELL = [
  '................', '.......kk.......', '......kyyk......', '.....kyyyyk.....', '....kyywyyyk....', '....kywyyyyk....',
  '....kywyyyyk....', '...kyyyyyyyyk...', '...kyyyyyyyyk...', '..kyyyyyyyyyyk..', '..kddddddddddk..', '...kkkkkkkkkk...',
  '.......kk.......', '......kddk......', '.......kk.......', '................',
];
const ANCHOR = [
  '................', '.......kk.......', '......kaak......', '......kaak......', '.......kk.......', '....kkkaakkk....',
  '....kaaaaaak....', '....kkkaakkk....', '......kaak......', '......kaak......', '.k....kaak....k.', '.kak..kaak..kak.',
  '..kak.kaak.kak..', '...kaakaakaak...', '....kkaaaakk....', '......kkkk......',
];
const ROCKET = sym([
  '.......k', '......kw', '.....kww', '.....kww', '....kwwc', '....kwcb', '....kwcb', '....kwwc',
  '....kwww', '...kakww', '..kaakww', '..kaakww', '..kkk.kf', '......kf', '.......f', '........',
]);

/** A deterministic 16×16 avatar for an invented account (friends use their real face tokens instead). */
export function avatarUrl(a: Author): string {
  return cached(`av:${a.handle}`, () => {
    const [c, x] = canvas(16, 16);
    const pal = PALETTES[hashStr(a.handle) % PALETTES.length];
    x.fillStyle = K;
    fillCircle(x, 7.5, 7.5, 7.5);
    x.fillStyle = pal.bg;
    fillCircle(x, 7.5, 7.5, 6.5);
    drawSpecies(x, a.species, pal);
    return c;
  });
}

function drawSpecies(x: Ctx, sp: Species, pal: (typeof PALETTES)[number]): void {
  switch (sp) {
    case 'pig': rows(x, PIG, { k: K, P: '#ffc4cf', p: '#f48fb1' }); break;
    case 'cat': rows(x, CAT, { k: K, a: pal.fur, e: K, p: '#ff8fb1', b: '#ffb7c5' }); break;
    case 'robot': rows(x, ROBOT, { k: K, G: '#c9c2d9', C: '#8fd3ff', w: CREAM, y: '#ffd25a' }); break;
    case 'brain': rows(x, BRAIN, { k: K, B: '#ff8fb1', b: '#d6608a' }); break;
    case 'chip': rows(x, CHIP, { k: K, d: '#2e2142', G: '#5bd16b', y: '#ffd25a' }); break;
    case 'heart': rows(x, HEART, { k: K, R: '#ff5a5f', w: CREAM }); break;
    case 'book': rows(x, BOOK, { k: K, w: CREAM, l: '#9a8cc8', a: pal.acc }); break;
    case 'bell': rows(x, BELL, { k: K, y: '#ffd25a', w: '#fffbe0', d: '#b8862b' }); break;
    case 'anchor': rows(x, ANCHOR, { k: K, a: '#5a6a9a' }); break;
    case 'rocket': rows(x, ROCKET, { k: K, w: CREAM, c: '#8fd3ff', b: '#3d7fb8', a: '#ff5a5f', f: '#ffb020' }); break;
    case 'squirrel': drawSquirrel(x, 8, 15, false, 1); break;
    case 'moon':
      x.fillStyle = K;
      fillCircle(x, 7, 8, 5.5);
      x.fillStyle = '#ffd25a';
      fillCircle(x, 7, 8, 4.5);
      x.fillStyle = pal.bg;
      fillCircle(x, 9.5, 6, 4);
      x.fillStyle = K;
      x.fillRect(4, 9, 2, 1);
      x.fillRect(6, 11, 1, 1);
      break;
    case 'sakura': {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const px = 7.5 + Math.cos(a) * 3.6;
        const py = 8 + Math.sin(a) * 3.6;
        x.fillStyle = '#a8385a';
        fillCircle(x, px, py, 3);
        x.fillStyle = '#ffb7c5';
        fillCircle(x, px, py, 2);
      }
      x.fillStyle = '#ffd25a';
      fillCircle(x, 7.5, 8, 1.2);
      break;
    }
  }
}

// ───────────────────────── media strips (120×16, shown at 2×) ─────────────────────────

export const MEDIA_W = 120;
export const MEDIA_H = 16;

/** What the strip shows, for screen readers (the media itself is decoration; posts never hide their tell in it). */
export const MEDIA_ALT: Record<MediaKind, string> = {
  chart_baseline: 'Chart: ours vs baseline', chart_moon: 'Chart: one line going straight up, no axis',
  robot_1x: 'Video: robot gripper, 1× speed', robot_10x: 'Video: robot gripper, 10× speed', ecg: 'ECG trace',
  eeg: 'EEG, three channels with a burst', paper: 'A preprint page', photo_sakura: 'Photo: sakura tree',
  photo_squirrel: 'Photo: a squirrel and an onigiri', queue: 'Cluster queue: job 4182 pending, 0:00', factor: 'Factor tree: 12, 2×6, 2×2×3',
  circle: 'Unit circle', toks: 'Bar chart: tokens per second',
};

export function mediaUrl(kind: MediaKind): string {
  return cached(`media:${kind}`, () => {
    const [c, x] = canvas(MEDIA_W, MEDIA_H);
    drawMedia(x, kind);
    return c;
  });
}

function line(x: Ctx, pts: readonly (readonly [number, number])[], color: string, dash = 0): void {
  x.fillStyle = color;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) {
      const px = Math.round(x0 + ((x1 - x0) * k) / n);
      if (dash && Math.floor(px / dash) % 2 === 1) continue;
      x.fillRect(px, Math.round(y0 + ((y1 - y0) * k) / n), 1, 1);
    }
  }
}

function drawMedia(x: Ctx, kind: MediaKind): void {
  const W = MEDIA_W;
  const H = MEDIA_H;
  x.fillStyle = '#0b0717';
  x.fillRect(0, 0, W, H);
  const label = (t: string, px: number, py: number, color: string) => drawText(x, t, px, py, { color, outline: null });
  switch (kind) {
    case 'chart_baseline': {
      x.fillStyle = '#33284f';
      x.fillRect(3, 1, 1, 14);
      x.fillRect(3, 14, 82, 1);
      line(x, [[5, 12], [30, 11], [55, 9], [84, 8]], '#9a8cc8', 2);
      line(x, [[5, 13], [30, 10], [55, 7], [84, 4]], '#ffd25a');
      label('OURS', 90, 0, '#ffd25a');
      label('BASE', 90, 8, '#9a8cc8');
      break;
    }
    case 'chart_moon': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 24; i++) {
        const k = i / 24;
        pts.push([4 + k * 92, 14 - Math.round(13 * k ** 4)]);
      }
      line(x, pts, '#ff8fb1');
      x.fillStyle = '#ffd25a';
      fillCircle(x, 108, 5, 3.5);
      x.fillStyle = '#0b0717';
      fillCircle(x, 110, 4, 2.5);
      label('!!', 102, 9, '#ff8fb1');
      break;
    }
    case 'robot_1x':
    case 'robot_10x': {
      x.fillStyle = '#33284f';
      x.fillRect(0, 13, W, 3);
      x.fillStyle = '#c9c2d9';
      x.fillRect(10, 10, 9, 3);
      x.fillRect(13, 3, 3, 7);
      x.fillRect(13, 3, 24, 2);
      x.fillRect(35, 3, 2, 5);
      x.fillStyle = '#8fd3ff';
      x.fillRect(32, 8, 1, 3);
      x.fillRect(39, 8, 1, 3);
      x.fillStyle = '#8c63d2';
      fillCircle(x, 36, 10, 2);
      const fast = kind === 'robot_10x';
      x.fillStyle = fast ? '#ff5a5f' : '#5bd16b';
      x.fillRect(W - (fast ? 26 : 20), 3, fast ? 24 : 18, 10);
      label(fast ? '10×' : '1×', W - (fast ? 24 : 18), 5, K);
      if (fast) for (let i = 0; i < 3; i++) line(x, [[46 + i * 6, 5 + i * 2], [56 + i * 6, 5 + i * 2]], '#4a3a6e');
      break;
    }
    case 'ecg': {
      x.fillStyle = '#0f2a1a';
      for (let i = 0; i < W; i += 5) x.fillRect(i, 0, 1, H);
      for (let j = 0; j < H; j += 5) x.fillRect(0, j, W, 1);
      const base = 10;
      const pts: [number, number][] = [];
      for (let i = 0; i < W; i++) {
        const p = i % 30;
        let y = base;
        if (p > 3 && p < 7) y = base - 1;
        if (p === 10) y = base + 1;
        if (p === 11) y = 1;
        if (p === 12) y = base + 4;
        if (p > 17 && p < 23) y = base - 2;
        pts.push([i, y]);
      }
      line(x, pts, '#5bd16b');
      break;
    }
    case 'eeg': {
      x.fillStyle = 'rgba(255, 90, 95, 0.3)';
      x.fillRect(66, 0, 22, H);
      ['#d0b8f6', '#b28fe9', '#d0b8f6'].forEach((col, ch) => {
        let s = hashStr(`eeg${ch}`);
        const pts: [number, number][] = [];
        for (let i = 0; i < W; i++) {
          s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0;
          const burst = i >= 66 && i < 88 ? 2.4 : 0.9;
          pts.push([i, 3 + ch * 5 + Math.round(Math.sin(i * (0.7 + ch * 0.17)) * burst + ((s & 3) - 1.5) * 0.4)]);
        }
        line(x, pts, col);
      });
      break;
    }
    case 'paper': {
      for (const [ox, tint] of [[6, '#e4e7f5'], [2, CREAM]] as const) {
        x.fillStyle = K;
        x.fillRect(ox, 1 + (ox === 6 ? 0 : 1), 18, 14);
        x.fillStyle = tint;
        x.fillRect(ox + 1, 2 + (ox === 6 ? 0 : 1), 16, 12);
      }
      x.fillStyle = '#9a8cc8';
      for (let j = 0; j < 4; j++) x.fillRect(4, 5 + j * 2 + 1, j === 0 ? 8 : 12, 1);
      label('PREPRINT', 26, 1, '#d0b8f6');
      label('+ CODE', 26, 9, '#5bd16b');
      break;
    }
    case 'photo_sakura': {
      x.fillStyle = '#a8d8f0';
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#7fc4a0';
      x.fillRect(0, 13, W, 3);
      for (const tx of [18, 58, 98]) {
        x.fillStyle = '#6b4428';
        x.fillRect(tx, 7, 2, 7);
        for (const [dx, dy, r] of [[-5, 5, 3.5], [0, 3, 4], [5, 5, 3.5], [-2, 7, 3], [3, 7, 3]] as const) {
          x.fillStyle = '#f48fb1';
          fillCircle(x, tx + dx, dy, r);
          x.fillStyle = '#ffb7c5';
          fillCircle(x, tx + dx - 0.5, dy - 0.5, r - 1);
        }
      }
      x.fillStyle = '#ffe3ea';
      for (const [px, py] of [[34, 4], [41, 9], [76, 6], [84, 11], [112, 3]]) x.fillRect(px, py, 2, 1);
      break;
    }
    case 'photo_squirrel': {
      x.fillStyle = '#a8d8f0';
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#7fc4a0';
      x.fillRect(0, 11, W, 5);
      x.fillStyle = '#5ba882';
      for (let i = 2; i < W; i += 7) x.fillRect(i, 10, 1, 1);
      drawSquirrel(x, 46, 15, false, 1);
      // the stolen onigiri, right next to him
      x.fillStyle = K;
      x.fillRect(60, 8, 7, 6);
      x.fillRect(61, 7, 5, 1);
      x.fillRect(62, 6, 3, 1);
      x.fillStyle = CREAM;
      x.fillRect(61, 8, 5, 5);
      x.fillRect(62, 7, 3, 1);
      x.fillStyle = '#20403a';
      x.fillRect(62, 11, 3, 2);
      break;
    }
    case 'queue': {
      // squeue's own columns for a waiting job: state PD, time 0:00
      label('JOB 4182', 3, 4, '#5bd16b');
      label('PD', 58, 4, '#ffd25a');
      label('0:00', 76, 4, '#9a8cc8');
      x.fillStyle = '#5bd16b';
      x.fillRect(3, 13, 4, 2);
      break;
    }
    case 'factor': {
      const arrow = (ax: number) => {
        x.fillStyle = '#9a8cc8';
        x.fillRect(ax, 7, 7, 1);
        x.fillRect(ax + 5, 6, 1, 3);
        x.fillRect(ax + 4, 5, 1, 5);
      };
      label('12', 4, 4, CREAM);
      arrow(18);
      label('2×6', 30, 4, CREAM);
      arrow(52);
      label('2×2×3', 64, 4, '#ffd25a');
      x.fillStyle = '#5bd16b';
      for (const px of [64, 76, 88]) x.fillRect(px + 1, 13, 3, 1);
      break;
    }
    case 'circle': {
      x.fillStyle = '#33284f';
      x.fillRect(2, 8, 24, 1);
      x.fillRect(14, 0, 1, 16);
      x.fillStyle = '#4a3a6e';
      for (let a = 0; a < Math.PI * 2; a += 0.08) x.fillRect(Math.round(14 + Math.cos(a) * 7), Math.round(8 + Math.sin(a) * 7), 1, 1);
      line(x, [[14, 8], [19, 3]], '#8fd3ff');
      x.fillStyle = '#ffd25a';
      x.fillRect(19, 3, 1, 5);
      x.fillStyle = '#ff8fb1';
      x.fillRect(14, 8, 6, 1);
      x.fillStyle = CREAM;
      x.fillRect(19, 3, 1, 1);
      label('SIN', 32, 0, '#ffd25a');
      label('COS', 32, 8, '#ff8fb1');
      label('= 1', 56, 4, CREAM);
      break;
    }
    case 'toks': {
      [3, 5, 8, 11, 14].forEach((h, i) => {
        x.fillStyle = i === 4 ? '#5bd16b' : '#4a3a6e';
        x.fillRect(4 + i * 9, H - 1 - h, 6, h);
      });
      label('TOK/S', 56, 4, '#9a8cc8');
      label('14', 92, 4, '#5bd16b');
      break;
    }
  }
}

// ───────────────────────── small UI pixels ─────────────────────────

export type FootIcon = 'reply' | 'repost' | 'heart' | 'heartOn' | 'save' | 'saveOn';

const FOOT: Record<FootIcon, readonly string[]> = {
  reply: ['.kkkkkk.', 'k......k', 'k......k', 'k......k', '.kkkkkk.', '..k.....', '.k......', '........'],
  repost: ['..k.....', '.kkkkkk.', '..k...k.', '..k...k.', '.k...k..', '.k...k..', '.kkkkkk.', '.....k..'],
  heart: ['.kk.kk..', 'k..k..k.', 'k.....k.', '.k...k..', '..k.k...', '...k....', '........', '........'],
  heartOn: ['.rr.rr..', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........', '........'],
  save: ['kkkkkk..', 'k....k..', 'k....k..', 'k....k..', 'k.kk.k..', 'kk..kk..', 'k....k..', '........'],
  saveOn: ['gggggg..', 'gggggg..', 'gggggg..', 'gggggg..', 'gggggg..', 'gg..gg..', 'g....g..', '........'],
};

/** 8×8 footer icons (reply, repost, heart, bookmark): outlines in the sub-text colour, filled pink / gold when used. */
export function footIconUrl(id: FootIcon): string {
  return cached(`foot:${id}`, () => {
    const [c, x] = canvas(8, 8);
    rows(x, FOOT[id], { k: '#a99cc7', r: '#ff8fb1', g: '#ffd25a' });
    return c;
  });
}

/** 6×6 acorn badge (not a checkmark, and not a tell: hype accounts have one too). */
export function acornUrl(): string {
  return cached('acorn', () => {
    const [c, x] = canvas(6, 6);
    rows(x, ['.kkkk.', 'kccccc', 'kkkkkk', '.knnk.', '.knnk.', '..kk..'], { k: '#3d2618', c: '#8a5a34', n: '#c98b4e' });
    return c;
  });
}

/** 12×5 round glasses that sit at the read line's left end: where he reads. */
export function glassesUrl(): string {
  return cached('glasses', () => {
    const [c, x] = canvas(12, 5);
    rows(x, ['.kkk....kkk.', 'k...k..k...k', 'k...kkkk...k', 'k...k..k...k', '.kkk....kkk.'], { k: '#d0b8f6' });
    return c;
  });
}

/** 10×8 pig ear for the phone case's top corners (lavender, pink inside); its base row melts into the case. */
export function earUrl(flip: boolean): string {
  return cached(`ear:${flip}`, () => {
    const [c, x] = canvas(10, 8);
    const r = ['..kk......', '.kcck.....', '.kcpck....', 'kcppcck...', 'kcpppcck..', 'kcppppcck.', 'kcccccccck', 'cccccccccc'];
    rows(x, flip ? r.map((s) => [...s].reverse().join('')) : r, { k: K, c: '#b07ce8', p: '#ff8fb1' });
    return c;
  });
}

// ───────────────────────── touch grass ─────────────────────────

/** The lawn he goes out to while the phone is down: stripes, tufts and falling sakura (still under Reduce motion). */
export function drawGrass(x: Ctx, w: number, h: number, t: number, reduceMotion: boolean): void {
  x.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y += 6) {
    x.fillStyle = Math.floor(y / 6) % 2 ? '#6fbf8a' : '#62b27e';
    x.fillRect(0, y, w, 6);
  }
  x.fillStyle = '#4e9a6a';
  for (let i = 0; i < 60; i++) {
    const px = (hashStr(`g${i}`) % 1000) / 1000;
    const py = (hashStr(`h${i}`) % 1000) / 1000;
    const gx = Math.round(px * w);
    const gy = Math.round(py * h);
    x.fillRect(gx, gy, 1, 2);
    x.fillRect(gx + 2, gy - 1, 1, 3);
  }
  for (let i = 0; i < 9; i++) {
    const sx = (hashStr(`p${i}`) % 997) / 997;
    const speed = 10 + (i % 4) * 4;
    const y = reduceMotion ? ((i * 37) % Math.max(1, h)) : ((t * speed + i * 31) % (h + 20)) - 10;
    const xx = sx * w + (reduceMotion ? 0 : Math.sin(t * 1.3 + i) * 6);
    drawPetal(x, xx, y, i === 4, !reduceMotion && Math.sin(t * 2 + i) > 0, false);
  }
}

// ───────────────────────── Piggy 3's portrait and full-body clip ─────────────────────────

interface SetDef { portraitAtlas: string; portraits: Record<string, [number, number]>; anims: Record<string, unknown> }
const SPRITES = raw as unknown as { portrait: { w: number; h: number }; sets: Record<string, SetDef> };

export const PORTRAIT = SPRITES.portrait;
/** The bust shows the top 200 rows of the 192×256 portrait cell (head, glasses, the phone in his hooves). */
export const BUST_H = 200;

export interface Cell { atlas: string; x: number; y: number; pose: string }

/**
 * Atlas cell for a bust pose: the pose itself once sync-sprites has added it, else its stand-in (phone → happy,
 * phone_mumble → confused), else neutral. `atlas` is relative to public/assets (wrap it with assetUrl).
 */
export function portraitCell(pose: Pose, outfit = 'everyday'): Cell | null {
  const set = SPRITES.sets[`piggy-3/${outfit}`] ?? SPRITES.sets['piggy-3/everyday'];
  if (!set) return null;
  for (const p of [pose, POSE_FALLBACK[pose], 'neutral'] as (string | undefined)[]) {
    const xy = p ? set.portraits[p] : undefined;
    if (xy) return { atlas: set.portraitAtlas, x: xy[0], y: xy[1], pose: p! };
  }
  return null;
}

/** The full-body clip for the how-to and results: his phone-out clip once synced, else a wave, else idle. */
export function introClip(has: (anim: string) => boolean, gold = false): string {
  if (gold && has('celebrate')) return 'celebrate';
  return ['phone', 'wave', 'idle'].find(has) ?? 'idle';
}
