// Piggy 3's phone poses and the Talk side of his X mumble (talk-final §6–§7, "Piggy 3 and his phone"): the synced
// portrait cells, 'phone' / 'phone_mumble' as portrait faces (scenes, the renderer, stand-ins for the other pigs; never
// a brain's pick), the stream paged for the box with each bubble on the page where its fragment starts, and the bubble
// slots on the measured Talk stages: never over his face, the phone, his fist, the top bar or the dialogue window.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sprites from '../src/generated/sprites.json';
import { resolvePortrait } from '../src/lib/engine/sprites';
import {
  ALT_EXPRESSION_FALLBACK, EXPRESSIONS, PIG_IDS, PORTRAIT_FACES, PORTRAIT_POSES, POSE_FALLBACK, type OutfitId,
} from '../src/lib/types';
import { validateKScript, formatIssue } from '../src/lib/vn/validate';
import { toExpression } from '../src/lib/vn/interpreter';
import { charCols, PHONE_GRID, type TextGrid } from '../src/lib/vn/chat-pages';
import { mumbleFor, mumbleReply, type MumbleKind } from '../src/lib/ai/heuristic/mumble';
import {
  MUMBLE_KEEP, MUMBLE_SLOTS, MUMBLE_TIMING, hit, mumbleCap, mumbleKeepOut, mumblePages, placeMumble,
  type BubbleBox, type MumbleGeo, type MumbleMode, type Rect,
} from '../src/lib/vn/components/mumble-layout';

const ROOT = join(import.meta.dir, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
type Set = { portraitAtlas: string; portraits: Record<string, [number, number]>; anims: Record<string, { page: string; frames: number }> };
const SETS = (sprites as unknown as { sets: Record<string, Set> }).sets;
const PHONE_POSES = ['phone', 'phone_mumble', 'phone_mumble_nervous'] as const;

describe('the phone portraits (art-src/portraits-extra → sync-sprites)', () => {
  test("Piggy 3's sets have 'phone' and 'phone_mumble' after the pack's cells, in the same atlas", () => {
    for (const [outfit, pack] of [['everyday', 20], ['hoodie', 12]] as const) {
      const set = SETS[`piggy-3/${outfit}`];
      const names = Object.keys(set.portraits);
      const poses = ['phone', 'phone_mumble', 'phone_mumble_nervous'];
      expect(names.length).toBe(pack + poses.length);
      expect(names.slice(pack)).toEqual(poses);
      // the pack's cells keep their places (4 per row, in the manifest's order); the poses follow
      names.forEach((n, i) => expect([n, set.portraits[n]]).toEqual([n, [(i % 4) * 192, Math.floor(i / 4) * 256]]));
      expect(set.portraitAtlas).toBe(`sprites/piggy-3/${outfit}/portraits.png`);
      // and his full-body phone clip rides in extra-0 beside 'held'
      expect(set.anims.phone).toMatchObject({ page: `sprites/piggy-3/${outfit}/extra-0.png`, frames: 6 });
    }
    expect(read('scripts/sync-sprites.ts')).toContain("join(root, 'art-src/portraits-extra', pigId, outfit)");
  });

  test('only Piggy 3 has phone poses; the other pigs keep their pack portraits and own extras', () => {
    for (const key of ['piggy-1/everyday', 'piggy-1/volleyball', 'piggy-2/everyday', 'piggy-2/scrubs']) {
      const set = SETS[key];
      expect(set.portraits.phone).toBeUndefined();
      expect(set.portraits.phone_mumble).toBeUndefined();
      expect(set.portraits.phone_mumble_nervous).toBeUndefined();
      expect(Object.keys(set.portraits).filter((p) => p !== 'wink').length).toBe(key.endsWith('everyday') ? 20 : 12);
    }
  });

  test('the source PNGs are the pack format (384×512 RGBA)', () => {
    for (const outfit of ['everyday', 'hoodie']) {
      for (const pose of PHONE_POSES) {
        const png = readFileSync(join(ROOT, 'art-src/portraits-extra/piggy-3', outfit, `${pose}.png`));
        expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]]).toEqual([384, 512, 6]);
      }
    }
  });
});

describe('poses as portrait faces', () => {
  test("never a brain's pick: EXPRESSIONS is still the pack's 20, PORTRAIT_FACES adds the poses", () => {
    expect(EXPRESSIONS.length).toBe(20);
    for (const p of PORTRAIT_POSES) expect(EXPRESSIONS).not.toContain(p);
    expect(PORTRAIT_FACES).toEqual([...EXPRESSIONS, ...PHONE_POSES, 'wink']);
    // the stand-ins are brain faces that every set has, and the renderer's fallback table carries them
    expect(POSE_FALLBACK).toEqual({ phone: 'happy', phone_mumble: 'neutral', phone_mumble_nervous: 'confused', wink: 'neutral' });
    for (const p of PORTRAIT_POSES) {
      expect(EXPRESSIONS).toContain(POSE_FALLBACK[p]);
      expect(ALT_EXPRESSION_FALLBACK[p]).toBe(POSE_FALLBACK[p]);
    }
  });

  test('Piggy 3 shows his own phone cells in both outfits; the others show the stand-ins', () => {
    for (const outfit of ['everyday', 'hoodie'] as OutfitId[]) {
      for (const p of PHONE_POSES) {
        const r = resolvePortrait('piggy-3', outfit, p);
        expect([r.expression, r.outfit]).toEqual([p, outfit]);
        expect([r.x, r.y]).toEqual(SETS[`piggy-3/${outfit}`].portraits[p]);
      }
    }
    expect(resolvePortrait('piggy-1', 'everyday', 'phone').expression).toBe('happy');
    expect(resolvePortrait('piggy-1', 'volleyball', 'phone_mumble').expression).toBe('neutral');
    expect(resolvePortrait('piggy-2', 'scrubs', 'phone').expression).toBe('happy');
    expect(resolvePortrait('piggy-2', 'everyday', 'phone_mumble')).toMatchObject({ expression: 'neutral', outfit: 'everyday' });
    // every face resolves to a real cell for every pig in every outfit
    for (const pig of PIG_IDS) {
      for (const outfit of ['everyday', 'volleyball', 'scrubs', 'hoodie'] as OutfitId[]) {
        for (const e of PORTRAIT_FACES) {
          const r = resolvePortrait(pig, outfit, e);
          expect(SETS[`${pig}/${r.outfit}`].portraits[r.expression]).toEqual([r.x, r.y]);
        }
      }
    }
  });

  test('KScript: `piggy-3 phone: …` validates and plays the pose; a typo is an error; another pig gets a warning', () => {
    const src = [
      '=== phone_check',
      'title: Phone check',
      '---',
      '[show piggy-3 phone right]',
      'piggy-3 phone: Oh— hey, did you see this on X today?',
      'piggy-3 phone_mumble_nervous: ...wait, is it sped up? Where is the 1x label?',
      '[expr piggy-3 phone]',
      '[show piggy-3@hoodie phone_mumble right]',
      'piggy-3 flustered_blush: Sorry. Phone away.',
      'piggy-1 phone: Mine is just for volleyball clips.',
      'piggy-3 phon: typo',
    ].join('\n');
    const { issues } = validateKScript([{ file: 'phone.ks', src }]);
    expect(issues.map((i) => formatIssue(i).replace('phone.ks:', ''))).toEqual([
      '10: warning: piggy-1 has no "phone" portrait, so it shows "happy"',
      '11: error: unknown expression "phon" (did you mean "phone"?)',
    ]);
    // the runtime keeps the pose (unknown faces still fall back to neutral)
    expect(toExpression('phone')).toBe('phone');
    expect(toExpression('phone_mumble')).toBe('phone_mumble');
    expect(toExpression('phone_mumble_nervous')).toBe('phone_mumble_nervous');
    expect(resolvePortrait('piggy-2', 'everyday', 'phone_mumble_nervous').expression).toBe('confused');
    expect(toExpression('smug')).toBe('neutral');
    expect(read('src/lib/vn/runner.ts')).toContain('(PORTRAIT_FACES as readonly string[]).includes(e)');
  });

  test("Piggy 2's wink is a real portrait and scene face, with safe fallbacks in other sets", () => {
    expect(resolvePortrait('piggy-2', 'everyday', 'wink')).toMatchObject({ expression: 'wink', x: 0, y: 1280 });
    expect(resolvePortrait('piggy-2', 'scrubs', 'wink').expression).toBe('neutral');
    expect(resolvePortrait('piggy-1', 'everyday', 'wink').expression).toBe('neutral');
    expect(toExpression('wink')).toBe('wink');
    const { issues } = validateKScript([{ file: 'wink.ks', src: '=== wink_check\ntitle: Wink check\n---\n[show piggy-2 neutral center]\npiggy-2 wink: Wink, wink.\n[expr piggy-2 neutral]' }]);
    expect(issues).toEqual([]);
    const png = readFileSync(join(ROOT, 'art-src/portraits-extra/piggy-2/everyday/wink.png'));
    expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]]).toEqual([384, 512, 6]);
  });
});

// ───────────────────────── the stream in the box ─────────────────────────

/** The box at the stream's font (Talk.svelte: 0.8em, same height): a phone's 42×4 turns 52×5, a desktop's 88×3 110×3. */
const atStreamFont = (g: TextGrid): TextGrid => ({ cols: Math.floor(g.cols / 0.8), rows: Math.floor(g.rows / 0.8 + 0.05) });
const PHONE_STREAM = atStreamFont(PHONE_GRID);
const DESKTOP_STREAM = atStreamFont({ cols: 88, rows: 3 });

function someMumbles() {
  const out = [mumbleFor('on_x', 0)];
  for (const kind of ['on_x', 'timeline', 'doomscroll'] as MumbleKind[]) {
    for (let asked = 1; asked <= 12; asked++) for (const turns of [0, 7, 22]) out.push(mumbleFor(kind, asked, turns));
  }
  return out;
}

describe('the stream, paged for the box', () => {
  test('the stream font grids: 52×5 on the small phone, 110×3 on desktop', () => {
    expect(PHONE_STREAM).toEqual({ cols: 52, rows: 5 });
    expect(DESKTOP_STREAM).toEqual({ cols: 110, rows: 3 });
  });

  test('every bubble pops on the page where its fragment starts, at that fragment; pages rejoin into the stream', () => {
    for (const m of someMumbles()) {
      for (const grid of [PHONE_STREAM, DESKTOP_STREAM, PHONE_GRID]) {
        const pages = mumblePages(m, grid);
        expect(pages.length).toBeGreaterThanOrEqual(1);
        expect(pages.length).toBeLessThanOrEqual(grid === PHONE_GRID ? 3 : 2);
        expect(pages.map((p) => p.text).join(' ')).toBe(m.stream);
        const words = pages.flatMap((p) => p.bubbles.map((b) => b.word));
        expect(words).toEqual(m.bubbles.map((b) => b.word));
        let i = 0;
        for (const p of pages) {
          for (const b of p.bubbles) {
            const frag = m.fragments[i++];
            const shown = p.text.slice(b.at, b.at + frag.length);
            expect(frag.startsWith(shown) && shown.length > 0).toBe(true);
          }
        }
      }
    }
  });

  test('the first mumble: Jev pops with the first letter; the five words come in order', () => {
    const m = mumbleReply('on_x', 0).mumble;
    const pages = mumblePages(m, PHONE_STREAM);
    expect(pages[0].bubbles[0]).toEqual({ word: 'Jev…', at: 0 });
    const words = pages.flatMap((p) => p.bubbles.map((b) => b.word)).join(' ');
    for (const w of ['Jev', 'calibrated', 'foundation mo', 'LLM', 'RLHF', 'RLVR']) expect(words).toContain(w);
    expect(m.faces).toEqual({ opener: 'phone', stream: 'phone_mumble', catch: 'flustered_blush' });
  });
});

// ───────────────────────── where the bubbles go ─────────────────────────

/**
 * Talk stages measured in the game (CSS px, relative to the stage view): Piggy 3 on an iPhone 15 Pro and a small
 * phone (letterboxed: the bars are `wide`), a phone in landscape and a desktop window; the top bar sits over the stage
 * in S and W. The zone ends at the dialogue window's top (its name plate / LOG strip).
 */
interface Stage { name: string; mode: MumbleMode; pos: 'left' | 'center'; lw: number; u: number; px: number; zone: Rect; wide?: Rect; obstacles: Rect[] }
const STAGES: Stage[] = [
  { name: '393×659', mode: 't', pos: 'center', lw: 437, u: 0.8993, px: 2, zone: { x: 4, y: 4, w: 385, h: 187.4 }, obstacles: [] },
  {
    name: '375×553', mode: 't', pos: 'center', lw: 480, u: 0.5074, px: 2,
    zone: { x: 4, y: 4, w: 235.6, h: 81.4 }, wide: { x: -61.7, y: 4, w: 367, h: 81.4 }, obstacles: [],
  },
  {
    name: '852×393', mode: 's', pos: 'left', lw: 480, u: 1.4556, px: 2,
    zone: { x: 4, y: 4, w: 690.7, h: 259.1 }, wide: { x: -25.7, y: 4, w: 750.3, h: 259.1 },
    obstacles: [{ x: -27.7, y: 2, w: 231.4, h: 62 }],
  },
  {
    name: '1280×800', mode: 'w', pos: 'left', lw: 480, u: 2.6667, px: 3,
    zone: { x: 4, y: 4, w: 1272, h: 503.2 }, obstacles: [{ x: 12, y: 8.7, w: 317.9, h: 64 }],
  },
];

/** A bubble's box the way MumbleBubbles builds it: DotGothic16 draws ASCII 0.5em wide; 12px text on phones, 16px else. */
function bubble(word: string, s: Stage): BubbleBox {
  const font = s.px === 2 ? 12 : 16;
  const width = (t: string) => [...t].reduce((n, ch) => n + charCols(ch), 0) * font * 0.5;
  const maxW = Math.min(s.zone.w - 4 * s.px, (s.mode === 't' ? 64 : 80) * s.px);
  let w = width(word);
  let two = false;
  if (w + 6 * s.px > maxW && word.includes(' ')) {
    const i = word.indexOf(' ');
    w = Math.max(width(word.slice(0, i)), width(word.slice(i + 1)));
    two = true;
  }
  const m = Math.max(1, Math.ceil((w / s.px + 6 - 16) / 8));
  return { w: (16 + 8 * m) * s.px, h: (two ? 24 : 16) * s.px, tail: 3 * s.px };
}

function geoOf(s: Stage, outfit: OutfitId = 'everyday'): MumbleGeo {
  return { mode: s.mode, px: s.px, keep: mumbleKeepOut(outfit, s.pos, s.lw, s.u), zone: s.zone, wide: s.wide, obstacles: s.obstacles };
}

/** MumbleBubbles' spawn() without the DOM: retire the oldest at the cap, the picture first, then the bars. */
function popAll(words: readonly string[], s: Stage, outfit: OutfitId = 'everyday') {
  const g = geoOf(s, outfit);
  const live: Rect[] = [];
  const fading: Rect[] = [];
  const placed: Rect[][] = [];
  let slot = 0;
  for (const word of words) {
    while (live.length >= mumbleCap(g)) fading.push(live.shift()!);
    const b = bubble(word, s);
    const zones = g.wide ? [g.zone, g.wide] : [g.zone];
    const tryPlace = (avoidFading: boolean) => {
      for (const zone of zones) {
        const p = placeMumble(b, g, live, fading, slot, { avoidFading, zone });
        if (p) return p;
      }
      return null;
    };
    let p = tryPlace(true) ?? tryPlace(false);
    while (!p && live.length) {
      fading.push(live.shift()!);
      p = tryPlace(false);
    }
    expect([s.name, word, !!p]).toEqual([s.name, word, true]);
    if (!p) continue;
    slot = p.slot + 1;
    live.push(p.r);
    placed.push([...live]);
    if (fading.length > 4) fading.shift();
  }
  return { g, placed };
}

describe('mumble bubbles on the Talk stage', () => {
  test('3 up on an upright phone (2 when the picture is short), 4 in landscape, 5 on desktop', () => {
    expect(STAGES.map((s) => mumbleCap(geoOf(s)))).toEqual([3, 2, 4, 5]);
  });

  test('his keep-outs sit where world.ts draws his portrait: centered in T, at the left slot in S and W', () => {
    const [phone, , landscape, desktop] = STAGES;
    const face = (s: Stage) => geoOf(s).keep[0];
    // T: the cell is centered, so the face (cell columns 26–166) is too, within a few px
    const f = face(phone);
    expect(Math.abs(f.x + f.w / 2 - (phone.lw * phone.u) / 2)).toBeLessThan(3 * phone.u);
    // W: the cell starts at 100 − 96 = 4 stage px, the face 26 − 3 px in from there; the phone ends at 188 + 3
    const d = geoOf(desktop).keep;
    expect(d[0].x).toBeCloseTo((4 + 26 - 3) * desktop.u, 3);
    expect(d[1].x + d[1].w).toBeCloseTo((4 + 188 + 3) * desktop.u, 3);
    expect(d[0].y).toBeCloseTo((30 + 84 - 3) * desktop.u, 3);
    expect(geoOf(landscape).keep.length).toBe(3);
    // the hoodie's phone pose sits higher
    expect(mumbleKeepOut('hoodie', 'left', 480, 1)[0].y).toBeLessThan(mumbleKeepOut('everyday', 'left', 480, 1)[0].y);
    expect(MUMBLE_KEEP.everyday.face).toEqual([26, 84, 166, 184]);
  });

  test('both outfit unions contain the opener and focused-pose landmarks, including the mouth-covering hoof', () => {
    // Independent 384×512 source-art landmarks: outer glasses/chin, phone/holding hoof, free hoof.
    const landmarks = {
      everyday: {
        face: [[60, 168], [320, 344], [54, 190], [330, 366]],
        phone: [[260, 250], [362, 394], [270, 260], [376, 404]],
        fist: [[58, 330], [122, 394], [120, 298], [210, 374]],
      },
      hoodie: {
        face: [[72, 148], [314, 324], [54, 190], [330, 366]],
        phone: [[256, 224], [350, 358], [270, 260], [376, 404]],
        fist: [[72, 298], [132, 356], [120, 298], [210, 374]],
      },
    };
    for (const outfit of ['everyday', 'hoodie'] as const) for (const part of ['face', 'phone', 'fist'] as const) {
      const [x0, y0, x1, y1] = MUMBLE_KEEP[outfit][part];
      for (const [x, y] of landmarks[outfit][part]) {
        expect(x / 2).toBeGreaterThanOrEqual(x0);
        expect(x / 2).toBeLessThanOrEqual(x1);
        expect(y / 2).toBeGreaterThanOrEqual(y0);
        expect(y / 2).toBeLessThanOrEqual(y1);
      }
    }
  });

  test('every bubble of a long mumble finds a place, clear of his face, the phone, the fist, the chrome and each other', () => {
    const words = someMumbles().slice(0, 8).flatMap((m) => m.bubbles.map((b) => b.word));
    for (const s of STAGES) {
      for (const outfit of ['everyday', 'hoodie'] as OutfitId[]) {
        const { g, placed } = popAll(words, s, outfit);
        for (const up of placed) {
          for (const r of up) {
            for (const k of g.keep) expect([s.name, hit(r, k)]).toEqual([s.name, false]);
            for (const o of g.obstacles) expect([s.name, hit(r, o)]).toEqual([s.name, false]);
            const inside = (z: Rect) => r.x >= z.x - 0.5 && r.y >= z.y - 0.5 && r.x + r.w <= z.x + z.w + 0.5 && r.y + r.h <= z.y + z.h + 0.5;
            expect([s.name, inside(g.zone) || (!!g.wide && inside(g.wide))]).toEqual([s.name, true]);
          }
          for (let i = 0; i < up.length; i++) for (let j = i + 1; j < up.length; j++) expect(hit(up[i], up[j])).toBe(false);
        }
        // a full screen of bubbles is up at some point
        expect(Math.max(...placed.map((p) => p.length))).toBe(mumbleCap(g));
      }
    }
  });

  test('beside him on a phone, to his right on wide layouts (the tail points at him)', () => {
    for (const s of STAGES) {
      const g = geoOf(s);
      const p = placeMumble(bubble('RLHF…', s), g, [], [], 0);
      expect(p).not.toBeNull();
      if (s.mode !== 't') {
        expect(MUMBLE_SLOTS[s.mode].every((slot) => slot.side === 'right')).toBe(true);
        // right of his face, and of whatever else shares its rows (at temple height that's only the face)
        expect(p!.x).toBeGreaterThanOrEqual(g.keep[0].x + g.keep[0].w);
        for (const k of g.keep) if (k.y < p!.r.y + p!.r.h && k.y + k.h > p!.r.y) expect(p!.x).toBeGreaterThanOrEqual(k.x + k.w);
      } else {
        expect(new Set(MUMBLE_SLOTS.t.map((slot) => slot.side))).toEqual(new Set(['left', 'right']));
      }
    }
  });

  test('timing: pop, a 3.2 s drift of 4 art px, fade; the snap is quick', () => {
    expect(MUMBLE_TIMING).toMatchObject({ popMs: 150, lifeMs: 3200, fadeMs: 300, snapMs: 140, driftArt: 4 });
  });
});

describe('the Talk screen and the dialogue box', () => {
  const talk = read('src/lib/ui/screens/Talk.svelte');
  const chat = read('src/lib/vn/chat.ts');
  const bubbles = read('src/lib/vn/components/MumbleBubbles.svelte');

  test('the stream is small (0.8em: 11 px or more at every Text Size), dim, in a window that keeps its height', () => {
    expect(talk).toContain('.mumbling :global(.vn .box .text)');
    expect(talk).toContain('font-size: 0.8em;');
    expect(talk).toContain('max-height: calc(var(--rows) * 1.45em / 0.8);');
    // the smallest box font is 16px × 0.875 (Text Size S)
    expect(16 * 0.875 * 0.8).toBeGreaterThanOrEqual(11);
    // bubble text: 12px on phones (--px 2), 16px elsewhere and at 1 dppx
    expect(bubbles).toContain('font-size: calc(4px + 4 * var(--px));');
  });

  test('the bubbles live on his stage, and the brain chip shows in every layout (S too, like the hub)', () => {
    expect(talk).toMatch(/<StageHost [^>]*>\s*<MumbleBubbles mode=\{viewport\.mode\} pos=\{slot\} outfit=\{p\.outfit\} avoid="\.topbar" \/>/);
    expect(talk).toContain('<BrainChip small />');
    expect(talk).not.toMatch(/viewport\.mode !== 's'\}<BrainChip/);
  });

  test('chat.ts plays the effect (opener, stream fast and whispered, catch) and keeps one backlog entry', () => {
    expect(chat).toMatch(/reply\.effect === 'mumble' && reply\.mumble && me\.portrait/);
    expect(chat).toContain("dialogue.beginLine(pig, m.faces.stream, { whisper: true, rate: MUMBLE_RATE })");
    expect(chat).toContain('export const MUMBLE_RATE = 2;');
    expect(read('src/lib/vn/dialogue.svelte.ts')).toContain('L.delay = L.msPer + pauseAfter(text, i - 1) / L.rate;');
  });

  test('the cloud art is the lilac 9-slice from make-bubbles, in public/assets/mumble', () => {
    for (const f of ['mumble-lilac.png', 'mumble-tail-lilac-dl.png', 'mumble-tail-lilac-dr.png']) {
      const png = readFileSync(join(ROOT, 'public/assets/mumble', f));
      const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      expect([f, w, h]).toEqual([f, f === 'mumble-lilac.png' ? 24 : 5, f === 'mumble-lilac.png' ? 18 : 4]);
    }
  });
});
