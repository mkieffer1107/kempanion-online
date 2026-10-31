import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseKScript } from '../src/lib/vn/kscript';
import { paginate } from '../src/lib/vn/typewriter';
import { robotMumbleWords } from '../src/lib/vn/components/robot-mumble';
import { hit, mumbleKeepOut, mumbleNeighbours, placeMumble, placeRobotStack, planRobotStack, isRobotStackWord, type MumbleGeo, type Rect } from '../src/lib/vn/components/mumble-layout';

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
        const phrase = b.word === 'autoregressive…' && text.slice(b.at).startsWith('System 2') ? 'System 2' : b.word.slice(0, -1);
        expect(text.slice(b.at).toLowerCase().startsWith(phrase.toLowerCase())).toBe(true);
        words.push(b.word);
      }
    }
    expect(words).toContain('autoregressive…');
    expect(words).not.toContain('System 2…');
    expect(words).toContain('foundation model…');
    expect(words).toContain('action chunking…');
    const next = scene.ops[scene.ops.indexOf(rant) + 1];
    expect(next).toMatchObject({ op: 'say', speaker: 'piggy-2', expression: 'deadpan' });
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

  test('the mobile first-page names stay by Piggy 3: Jev on his cheek, JEPA at his left ear', () => {
    for (const width of [320, 393, 430, 768]) {
      const u = width / 270;
      const g: MumbleGeo = {
        mode: 't', px: 2, group: true, keep: mumbleKeepOut('everyday', 'right', 270, u, lineup),
        zone: { x: 4, y: 4, w: width - 8, h: width - 8 }, obstacles: mumbleNeighbours('right', lineup, 270, u, true),
      };
      const face = g.keep[0];
      const auto = placeMumble({ word: 'autoregressive…', w: 112, h: 32, tail: 6 }, g, [], [], 0)!;
      const jev = placeMumble({ word: 'Jev…', w: 48, h: 32, tail: 6 }, g, [auto.r], [], 0)!;
      const jepa = placeMumble({ word: 'JEPA…', w: 48, h: 32, tail: 6 }, g, [auto.r, jev.r], [], 0)!;
      expect([auto, jev, jepa].every(Boolean)).toBe(true);
      expect(hit(jev.r, face)).toBe(true);
      for (const keep of [...g.keep.slice(1), ...g.obstacles]) expect(hit(jev.r, keep)).toBe(false);
      expect(jepa.x + jepa.r.w).toBeGreaterThanOrEqual(face.x - 3);
      expect(jepa.y + jepa.r.h).toBeLessThanOrEqual(face.y + 8);
      expect(jepa.y).toBeGreaterThan(auto.y);
      expect(hit(jepa.r, auto.r)).toBe(false);
      expect(hit(jepa.r, jev.r)).toBe(false);
      expect(auto.r.y + auto.r.h).toBeLessThan(face.y);
    }
  });

  test('each second-page arrival raises all earlier mobile clouds and keeps a compact, clear stack', () => {
    const boxes = [
      { word: 'receding-horizon…', w: 128, h: 32, tail: 6 },
      { word: 'action tokens…', w: 112, h: 32, tail: 6 },
      { word: 'zero-shot laundry…', w: 128, h: 32, tail: 6 },
    ];
    expect(boxes.every((b) => isRobotStackWord(b.word))).toBe(true);
    expect(isRobotStackWord('Jev…')).toBe(false);
    for (const width of [320, 393, 430, 768]) {
      const u = width / 270;
      const g: MumbleGeo = {
        mode: 't', px: 2, group: true, keep: mumbleKeepOut('everyday', 'right', 270, u, lineup),
        zone: { x: 4, y: 4, w: width - 8, h: width - 8 }, obstacles: mumbleNeighbours('right', lineup, 270, u, true),
      };
      let previous = placeRobotStack(boxes.slice(0, 1), g)!;
      expect(previous).toHaveLength(1);
      for (const count of [2, 3]) {
        const next = placeRobotStack(boxes.slice(0, count), g)!;
        expect(next).toHaveLength(count);
        for (let i = 0; i < previous.length; i++) expect(next[i].y).toBeLessThan(previous[i].y);
        expect(next[count - 1].y).toBe(previous[previous.length - 1].y);
        for (let i = 0; i < next.length; i++) {
          const r = next[i].r;
          expect(r.y).toBeGreaterThanOrEqual(g.zone.y);
          for (const keep of [...g.keep, ...g.obstacles]) expect(hit(r, keep)).toBe(false);
          if (i + 1 < next.length) expect(next[i + 1].y - r.y - r.h).toBe(6);
        }
        previous = next;
      }
      expect(placeRobotStack(boxes, { ...g, mode: 'w' })).toBeNull();
      expect(placeRobotStack(boxes, { ...g, group: false })).toBeNull();
      // A wrapped last label changes the needed height without introducing overlaps.
      const wrapped = placeRobotStack([...boxes.slice(0, 2), { ...boxes[2], w: 80, h: 48 }], g)!;
      expect(wrapped).toHaveLength(3);
      expect(wrapped[1].r.y + wrapped[1].r.h + 6).toBe(wrapped[2].y);
    }
  });

  test('robot thoughts rise before the next entrance and alternate their tail sides, even after a skip', () => {
    const boxes = [
      { word: 'receding-horizon…', w: 128, h: 32, tail: 6 },
      { word: 'action tokens…', w: 112, h: 32, tail: 6 },
      { word: 'zero-shot laundry…', w: 80, h: 48, tail: 6 },
    ];
    for (const width of [320, 393, 768]) {
      const u = width / 270;
      const g: MumbleGeo = {
        mode: 't', px: 2, group: true, keep: mumbleKeepOut('everyday', 'right', 270, u, lineup),
        zone: { x: 4, y: 4, w: width - 8, h: width - 8 }, obstacles: mumbleNeighbours('right', lineup, 270, u, true),
      };
      const plan = planRobotStack(boxes, g)!;
      expect(plan.map((p) => p.side)).toEqual(['right', 'left', 'right']);
      for (const arrivals of [[0, 0, 0], [0, 2300, 3700], [0, 5000, 9000]]) {
        const starts = arrivals.map((at, i) => at);
        for (let i = 1; i < starts.length; i++) starts[i] = Math.max(starts[i], starts[i - 1] + plan[i].clearanceMs);
        const at = (i: number, time: number) => {
          const p = plan[i];
          const progress = Math.max(0, Math.min(1, (time - starts[i]) / p.riseMs));
          return { ...p.r, y: p.fromY + (p.y - p.fromY) * progress };
        };
        expect(at(0, 300).y).toBeLessThan(at(0, 0).y);
        expect(at(0, 0).y - at(0, 300).y).toBeLessThan(8);
        for (let i = 1; i < starts.length; i++) {
          const older = at(i - 1, starts[i]);
          expect(older.y + older.h + 6).toBeLessThanOrEqual(plan[i].fromY + 0.001);
        }
        for (let time = 0; time < 12000; time += 50) {
          const visible = plan.map((_, i) => i).filter((i) => starts[i] <= time);
          for (const i of visible) {
            const r = at(i, time);
            for (const keep of [...g.keep, ...g.obstacles]) expect(hit(r, keep)).toBe(false);
            for (const j of visible.filter((j) => j > i)) expect(hit(r, at(j, time))).toBe(false);
          }
        }
      }
      expect(planRobotStack(boxes, { ...g, mode: 'w' })).toBeNull();
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
