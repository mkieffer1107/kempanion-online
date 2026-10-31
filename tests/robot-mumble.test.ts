import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseKScript } from '../src/lib/vn/kscript';
import { paginate } from '../src/lib/vn/typewriter';
import { robotMumbleWords } from '../src/lib/vn/components/robot-mumble';
import { hit, mumbleKeepOut, mumbleNeighbours, placeMumble, type MumbleGeo, type Rect } from '../src/lib/vn/components/mumble-layout';

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
        expect(text.slice(b.at).toLowerCase().startsWith(b.word.slice(0, -1).toLowerCase())).toBe(true);
        words.push(b.word);
      }
    }
    expect(words).toContain('foundation model…');
    expect(words).toContain('action chunking…');
    const next = scene.ops[scene.ops.indexOf(rant) + 1];
    expect(next).toMatchObject({ op: 'say', speaker: 'piggy-2', expression: 'thinking' });
    expect(robotMumbleWords(next.op === 'say' ? next.text : '')).toEqual([]);
  });

  test('group clouds fit above the trio without covering any face, phone or dialogue', () => {
    for (const [lw, u, px, mode, floor] of [[270, 393 / 270, 2, 't', 340], [270, 320 / 270, 2, 't', 275], [480, 1.1, 2, 's', 185], [480, 2.66, 3, 'w', 500]] as const) {
      const g: MumbleGeo = {
        mode, px, group: true, keep: mumbleKeepOut('everyday', 'right', lw, u, lineup),
        obstacles: mumbleNeighbours('right', lineup, lw, u), zone: { x: 4, y: 4, w: lw * u - 8, h: floor - 8 },
      };
      for (const b of [{ w: 64, h: 16 }, { w: 56, h: 24 }, { w: 80, h: 16 }]) {
        const placed = placeMumble({ w: b.w * px, h: b.h * px, tail: 3 * px }, g, [], [], 0);
        expect(placed).not.toBeNull();
        for (const r of [...g.keep, ...g.obstacles]) expect(hit(placed!.r, r)).toBe(false);
        expect(placed!.r.y + placed!.r.h).toBeLessThanOrEqual(floor);
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

  test('mobile group clouds refill near the head, staying in two compact rows through a long stream', () => {
    for (const width of [320, 393, 430, 768]) {
      const u = width / 270;
      const keep = mumbleKeepOut('everyday', 'right', 270, u, lineup);
      const g: MumbleGeo = {
        mode: 't', px: 2, group: true, keep, zone: { x: 4, y: 4, w: width - 8, h: width - 8 },
        obstacles: [...mumbleNeighbours('right', lineup, 270, u, true), { x: 0, y: width - 44, w: width, h: 44 }],
      };
      const live: Rect[] = [];
      let start = 0;
      for (let i = 0; i < 24; i++) {
        if (live.length === 3) live.shift();
        const b = { w: [48, 96, 128, 112][i % 4], h: i % 4 === 3 ? 48 : 32, tail: 6 };
        let p = placeMumble(b, g, live, [], start);
        while (!p && live.length) { live.shift(); p = placeMumble(b, g, live, [], start); }
        expect(p).not.toBeNull();
        if (!p) throw new Error('No room for mobile cloud');
        expect(p.r.y).toBeGreaterThanOrEqual(keep[0].y - 0.2 * keep[0].h - 134);
        expect(p.r.x).toBeGreaterThanOrEqual(keep[0].x - 0.5 * keep[0].w - 1);
        for (const r of [...keep, ...g.obstacles, ...live]) expect(hit(p.r, r)).toBe(false);
        live.push(p.r);
        start = p.slot + 1;
      }
      const first = placeMumble({ w: 96, h: 32, tail: 6 }, g, [], [], 0);
      expect(placeMumble({ w: 96, h: 32, tail: 6 }, g, [], [], start)).toEqual(first);
    }
  });

  test('relaxing the center pig does not move the other face bounds or relax Piggy 3', () => {
    const all = mumbleNeighbours('right', lineup, 270, 393 / 270);
    const mobile = mumbleNeighbours('right', lineup, 270, 393 / 270, true);
    expect(mobile).toEqual([all[0]]);
    expect(all).toHaveLength(2);
    expect(mumbleKeepOut('everyday', 'right', 270, 393 / 270, lineup)).toHaveLength(3);
  });
});
