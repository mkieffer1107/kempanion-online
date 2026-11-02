import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseKScript } from '../src/lib/vn/kscript';
import { paginate } from '../src/lib/vn/typewriter';
import { robotMumbleWords } from '../src/lib/vn/components/robot-mumble';
import { gapBetween, hit, reachOf, rimsOnly, mumbleCap, mumbleKeepOut, mumbleNeighbours, placeMumble, type MumbleGeo, type Rect } from '../src/lib/vn/components/mumble-layout';

const scene = parseKScript(readFileSync(join(import.meta.dir, '../src/lib/content/scenes/prologue.ks'), 'utf8'), 'prologue.ks')[0];
const rant = scene.ops.find((o) => o.op === 'say' && o.speaker === 'piggy-3' && o.expression === 'phone_mumble');
const lineup = ['left', 'center', 'right'] as const;

describe('the prologue robot mumble', () => {
  test('every existing page has robotics clouds timed to phrases on that page', () => {
    if (!rant || rant.op !== 'say') throw new Error('Missing robot rant');
    const pages = paginate(rant.text);
    expect(pages.length).toBeGreaterThan(1);
    const words: string[] = [];
    for (const text of pages) {
      const bubbles = robotMumbleWords(text);
      expect(bubbles.length).toBeGreaterThan(0);
      for (const b of bubbles) {
        const phrase = b.word.slice(0, -1);
        expect(text.slice(b.at).toLowerCase().startsWith(phrase.toLowerCase())).toBe(true);
        words.push(b.word);
      }
    }
    expect(words).toContain('autoregressive…');
    expect(words).toContain('System 2…');
    expect(new Set(words).size).toBe(words.length);
    expect(words).toContain('foundation model…');
    expect(words).toContain('action chunking…');
    const next = scene.ops[scene.ops.indexOf(rant) + 1];
    expect(next).toMatchObject({ op: 'say', speaker: 'piggy-2', expression: 'deadpan' });
    expect(robotMumbleWords(next.op === 'say' ? next.text : '')).toEqual([]);
  });

  test('the whole rant clusters on Piggy 3: every cloud by his head, clear of his face, phone, fist and the window', () => {
    if (!rant || rant.op !== 'say') throw new Error('Missing robot rant');
    const words = paginate(rant.text).flatMap((t) => robotMumbleWords(t).map((b) => b.word));
    // an upright phone, a short phone, phone landscape, desktop
    for (const [lw, u, px, mode, floor] of [[270, 393 / 270, 2, 't', 340], [270, 320 / 270, 2, 't', 275], [480, 1.1, 2, 's', 185], [480, 2.66, 3, 'w', 500]] as const) {
      const g: MumbleGeo = {
        mode, px, keep: mumbleKeepOut('everyday', 'right', lw, u, lineup), soft: mumbleNeighbours('right', lineup, lw, u),
        obstacles: [], zone: { x: 4, y: 4, w: lw * u - 8, h: floor - 8 },
      };
      const face = g.keep[0];
      const live: Rect[] = [];
      for (const word of words) {
        while (live.length >= mumbleCap(g)) live.shift();
        const w = (16 + 8 * Math.max(1, Math.ceil(((word.length * (px === 2 ? 6 : 8)) / px + 6 - 16) / 8))) * px;
        let p = placeMumble({ w, h: 16 * px, tail: 3 * px }, g, live);
        while (!p && live.length) { live.shift(); p = placeMumble({ w, h: 16 * px, tail: 3 * px }, g, live); }
        expect([lw, u, word, !!p]).toEqual([lw, u, word, true]);
        const r = p!.r;
        for (const k of g.keep) expect(hit(r, k)).toBe(false);
        expect(r.y + r.h).toBeLessThanOrEqual(floor);
        // clearly his: within reach of his face
        const gap = gapBetween(r, face);
        expect([lw, floor, word, gap <= reachOf(face, px) + 0.01 ? 0 : Math.round(gap / face.w * 100)]).toEqual([lw, floor, word, 0]);
        // the tail points at him
        expect(p!.side).toBe(r.x + r.w / 2 >= face.x + face.w / 2 ? 'right' : 'left');
        for (const o of live) expect(rimsOnly(r, o, px)).toBe(true);
        live.push(r);
      }
    }
  });

  test('a narrow stage keeps only the speaking pig clear; a group scales his keep-outs with his portrait', () => {
    expect(mumbleNeighbours('right', lineup, 240, 1)).toEqual([]);
    expect(mumbleKeepOut('everyday', 'right', 240, 1, lineup)).toEqual(mumbleKeepOut('everyday', 'right', 240, 1));
    const group = mumbleKeepOut('everyday', 'right', 270, 1, lineup)[0];
    const solo = mumbleKeepOut('everyday', 'right', 270, 1)[0];
    expect(group.w).toBeLessThan(solo.w);
    expect(group.y).toBeGreaterThan(solo.y);
  });
});
