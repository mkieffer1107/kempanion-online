import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseKScript } from '../src/lib/vn/kscript';
import { paginate } from '../src/lib/vn/typewriter';
import { robotMumbleWords } from '../src/lib/vn/components/robot-mumble';
import { hit, mumbleKeepOut, mumbleNeighbours, placeMumble, type MumbleGeo } from '../src/lib/vn/components/mumble-layout';

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
});
