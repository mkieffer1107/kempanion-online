// Outings (pet/outing.ts): your Kempanion goes where you take him for a while, and everything that asks where he is
// (spotOf: the KempaPager, Talk, the map, scene triggers) sees him there. Only places with ground for his sprite take
// outings (in their painting or an outing frame), and every one of those has a floor in the KempaPager.
import { describe, expect, test } from 'bun:test';
import { PIG_IDS, type LocationId, type PigId } from '../src/lib/types';
import { LOCATIONS, LOCATION_IDS, hubBackground, whereIs } from '../src/lib/content/locations';
import backgrounds from '../src/generated/backgrounds.json';
import { newSave, startNap, wakeUp } from '../src/lib/pet/sim';
import { OUTING } from '../src/lib/pet/balance';
import { outingBlock, outingOf, spotOf, startOuting } from '../src/lib/pet/outing';
import { clauseHolds, parseTrigger, type TriggerEnv } from '../src/lib/vn/triggers';
import { timeOfDay, weekday } from '../src/lib/time';
import { DESKTOP_FLOORS, MOBILE_FLOORS } from '../src/lib/ui/hub/hub';

// Tuesday 3 Nov 2026, local time: Piggy 1 is at Malachowsky in the morning, home asleep 02:30–10:30.
const at = (h: number, m = 0, day = 3) => new Date(2026, 10, day, h, m);
const H = 3_600_000;

function saveWith(companion: PigId | null = 'piggy-1') {
  const save = newSave(at(9).getTime(), 'Tester');
  save.companion = companion;
  return save;
}

describe('outings', () => {
  test('he goes where you take him for a couple of hours; the others keep their schedules', () => {
    const save = saveWith();
    const t = at(11).getTime();
    expect(spotOf(save, 'piggy-1', at(11))).toBe('malachowsky');
    const { block, outing } = startOuting(save, 'century_tower', t);
    expect(block).toBeNull();
    expect(outing).toEqual({ pig: 'piggy-1', location: 'century_tower', since: t, until: t + OUTING.ms });
    expect(spotOf(save, 'piggy-1', new Date(t + OUTING.ms - 60_000))).toBe('century_tower');
    for (const p of ['piggy-2', 'piggy-3'] as const) expect(spotOf(save, p, at(11))).toBe(whereIs(p, at(11)));
    // over: back on his schedule (13:00 is still Malachowsky)
    expect(outingOf(save, t + OUTING.ms)).toBeNull();
    expect(spotOf(save, 'piggy-1', new Date(t + OUTING.ms))).toBe('malachowsky');
  });

  test('bedtime, a nap or a new Kempanion ends it; he wakes up at home, not back out', () => {
    // 01:30: Piggy 1 is up late at home; bedtime is 02:30
    const late = saveWith();
    startOuting(late, 'plaza', at(1, 30, 4).getTime());
    expect(spotOf(late, 'piggy-1', at(2, 29, 4))).toBe('plaza');
    expect(spotOf(late, 'piggy-1', at(2, 30, 4))).toBe('dorm');

    const nap = saveWith();
    startOuting(nap, 'plaza', at(11).getTime());
    startNap(nap, 'piggy-1', at(11, 20).getTime());
    expect(spotOf(nap, 'piggy-1', at(11, 30))).toBe('dorm');
    wakeUp(nap, 'piggy-1', at(11, 45).getTime());
    expect(spotOf(nap, 'piggy-1', at(11, 50))).toBe('malachowsky');

    const swap = saveWith();
    startOuting(swap, 'plaza', at(11).getTime());
    swap.companion = 'piggy-2';
    expect(outingOf(swap, at(11, 30).getTime())).toBeNull();
    expect(spotOf(swap, 'piggy-1', at(11, 30))).toBe('malachowsky');
  });

  test('no outing to a place without ground for him; asleep or past bedtime he stays home', () => {
    const save = saveWith();
    const t = at(11).getTime();
    const plaza = LOCATIONS.plaza;
    plaza.outing = false; // a place with no floor in its painting and no outing frame
    try {
      expect(outingBlock(save, 'plaza', t)).toBe('place');
      expect(startOuting(save, 'plaza', t)).toEqual({ block: 'place', outing: null });
    } finally {
      plaza.outing = true;
    }
    expect(outingBlock(save, 'plaza', at(3).getTime())).toBe('bedtime');
    save.pigs['piggy-1'].asleep = true;
    expect(outingBlock(save, 'plaza', t)).toBe('asleep');
    // home is where he already is: the KempaPager in his room
    expect(outingBlock(save, 'dorm', t)).toBeNull();
    expect(outingBlock(saveWith(null), 'plaza', t)).toBe('none');
  });

  test('an outing starts on the minute, so the minute-ticking KempaPager and map see it at once', () => {
    const save = saveWith();
    startOuting(save, 'plaza', at(11).getTime() + 42_000);
    expect(outingOf(save, at(11).getTime())?.since).toBe(at(11).getTime());
    expect(spotOf(save, 'piggy-1', at(11))).toBe('plaza');
  });

  test('taking him where his schedule has him ends the outing; where he already is keeps its time', () => {
    const save = saveWith();
    const t = at(11).getTime();
    startOuting(save, 'century_tower', t);
    expect(startOuting(save, 'century_tower', t + 30 * 60_000).outing?.since).toBe(t);
    expect(startOuting(save, 'malachowsky', t + H)).toEqual({ block: null, outing: null });
    expect(outingOf(save, t + H)).toBeNull();
    expect(spotOf(save, 'piggy-1', new Date(t + H))).toBe('malachowsky');
  });

  test('scene triggers see him where you took him (present=, and hub scenes there)', () => {
    const save = saveWith();
    const d = at(11, 10);
    const env = (location: LocationId | 'hub'): TriggerEnv => ({
      location, time: timeOfDay(d), weekday: weekday(d), date: d, save, chapter: 0, days: 1, rng: () => 0,
    });
    const [present] = parseTrigger('present=piggy-1');
    const [plaza] = parseTrigger('location=plaza');
    expect(clauseHolds(present, env('plaza'))).toBe(false);
    startOuting(save, 'plaza', at(11).getTime());
    expect(clauseHolds(present, env('plaza'))).toBe(true);
    expect(clauseHolds(present, env('malachowsky'))).toBe(false);
    // the KempaPager's scenes play where he is: there, piggy-1 counts as present
    expect(clauseHolds(present, env('hub'))).toBe(true);
    expect(clauseHolds(plaza, env('plaza'))).toBe(true);
  });
});

describe('where outings can go', () => {
  // every place a schedule puts a pig (a week of hours): those already show him in the KempaPager
  const scheduled = new Set<LocationId>();
  for (let day = 1; day <= 7; day++) for (let h = 0; h < 24; h++) for (const p of PIG_IDS) scheduled.add(whereIs(p, at(h, 0, day)));

  test('everywhere his schedule takes him has ground; the lake and the stands get outing frames', () => {
    for (const loc of scheduled) expect([loc, LOCATIONS[loc].outing]).toEqual([loc, true]);
    expect(LOCATION_IDS.filter((l) => LOCATIONS[l].outingBg)).toEqual(['stadium', 'lake_alice']);
    // painted with a night version, like the places themselves
    for (const l of LOCATION_IDS) {
      const frame = LOCATIONS[l].outingBg;
      if (frame) for (const id of [frame, `${frame}_night`]) expect(backgrounds.bg).toContain(id);
    }
    expect(hubBackground('lake_alice', 'piggy-3')).toBe('lake_alice_boardwalk');
    expect(hubBackground('dorm', 'piggy-3')).toBe('home_p3');
    expect(hubBackground('plaza', 'piggy-3')).toBe('plaza');
  });

  test('a place you can only reach by outing has a measured floor on phones and desktop, framed like its painting', () => {
    const extra = LOCATION_IDS.filter((l) => LOCATIONS[l].outing && !scheduled.has(l));
    expect(extra).toEqual(['century_tower', 'stadium', 'lake_alice']);
    for (const l of extra) {
      const bg = hubBackground(l, 'piggy-1');
      for (const floors of [MOBILE_FLOORS, DESKTOP_FLOORS]) {
        const f = floors[bg];
        expect([l, f !== undefined]).toEqual([l, true]);
        // outing frames are painted centred; a place's own painting keeps its framing
        expect(f.focus).toBe(LOCATIONS[l].outingBg ? 240 : LOCATIONS[l].focusX);
        expect(f.min).toBeLessThan(f.max);
      }
    }
  });
});
