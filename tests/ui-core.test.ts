// UI core: pure helpers (layout mode, hub logic, weather) and the 16x16 UI icon set.
import { describe, expect, test } from 'bun:test';
import { layoutMode } from '../src/lib/ui/layout/mode';
import { UI_ICONS } from '../src/lib/content/icons/ui';
import {
  awayText, crumbSpots, hubSong, idleKind, lowestNeed, needsAttention, popsFor, statusClip,
} from '../src/lib/ui/hub/hub';
import { weatherAt } from '../src/lib/state/weather';
import type { PigState } from '../src/lib/types';

function pig(needs: Partial<PigState['needs']> = {}, extra: Partial<PigState> = {}): PigState {
  return {
    needs: { hunger: 80, energy: 80, hygiene: 80, fun: 80, ...needs }, health: 100, sick: false, bond: 0, asleep: false,
    outfit: 'everyday', mess: 0, lastFedAt: 0, lastPlayedAt: 0, lastTalkedAt: 0, lastPettedAt: 0,
    today: { date: '', talks: 0, gifts: 0, pets: 0, minigames: 0 }, ...extra,
  };
}

describe('layout modes (GAME_DESIGN §14)', () => {
  test('phone portrait is T', () => {
    expect(layoutMode(360, 640)).toBe('t');
    expect(layoutMode(390, 844)).toBe('t');
    expect(layoutMode(820, 1180)).toBe('t');
  });
  test('phone landscape is S', () => {
    expect(layoutMode(844, 390)).toBe('s');
    expect(layoutMode(640, 360)).toBe('s');
  });
  test('desktop is W', () => {
    expect(layoutMode(1440, 900)).toBe('w');
    expect(layoutMode(1920, 1080)).toBe('w');
    expect(layoutMode(1024, 768)).toBe('w');
  });
  test('aspect boundary 1.25', () => {
    expect(layoutMode(1249, 1000)).toBe('t');
    expect(layoutMode(1250, 1000)).toBe('w');
  });
});

describe('UI icons', () => {
  const REQUIRED = [
    'hunger', 'drink', 'energy', 'hygiene', 'fun', 'health', 'heart', 'heart_empty', 'acorn', 'clock', 'sun', 'moon', 'rain',
    'feed', 'wash', 'play', 'light', 'care', 'talk', 'stats', 'map', 'bag', 'menu', 'settings', 'back', 'close', 'star',
    'lock', 'sparkle', 'brain_heur', 'brain_big', 'pin', 'camera', 'music', 'trophy', 'book', 'log', 'auto', 'skip', 'hide',
  ];
  test('every required icon exists', () => {
    for (const id of REQUIRED) expect(UI_ICONS[id], id).toBeDefined();
  });
  test('all icons are 16x16 with known palette chars', () => {
    for (const [id, icon] of Object.entries(UI_ICONS)) {
      expect(icon.rows.length, id).toBe(16);
      icon.rows.forEach((row, y) => {
        expect(row.length, `${id} row ${y}`).toBe(16);
        for (const ch of row) if (ch !== '.') expect(icon.palette[ch], `${id} '${ch}'`).toBeDefined();
      });
    }
  });
});

describe('hub helpers', () => {
  test('lowest need and status clips', () => {
    expect(lowestNeed(pig({ fun: 12 }).needs).need).toBe('fun');
    expect(statusClip(pig(), 0)).toBeNull();
    expect(statusClip(pig({ hygiene: 20 }), 0)).toBe('dirty');
    expect(statusClip(pig({ energy: 10 }), 0)).toBe('yawn');
    expect(statusClip(pig({ fun: 5 }), 0)).toBe('bored');
    expect(statusClip(pig({ hunger: 10 }), 0)).toBe('hungry');
    expect(statusClip(pig({ hunger: 10 }), 1)).toBe('thirsty');
    expect(statusClip(pig({ hunger: 10 }, { sick: true }), 0)).toBe('sick');
  });
  test('idle line kinds follow needs, sleep and sickness', () => {
    expect(idleKind(pig({}, { asleep: true }), 0.9)).toBe('sleepy');
    expect(idleKind(pig({}, { sick: true }), 0.9)).toBe('sick');
    expect(idleKind(pig({ hunger: 10 }), 0.9)).toBe('hungry');
    expect(idleKind(pig({ energy: 10 }), 0.9)).toBe('tired');
    expect(idleKind(pig({ hunger: 95, energy: 95, hygiene: 95, fun: 95 }), 0.1)).toBe('happy');
    expect(idleKind(pig(), 0.9)).toBe('random');
  });
  test('attention light: any need under 25 or sick', () => {
    expect(needsAttention(pig())).toBe(false);
    expect(needsAttention(pig({ fun: 24 }))).toBe(true);
    expect(needsAttention(pig({}, { sick: true }))).toBe(true);
  });
  test('number pops', () => {
    let id = 0;
    const pops = popsFor({ needsDelta: { hunger: 25, energy: -8 }, bondDelta: 4, moneyDelta: 5 }, 50, 40, () => ++id);
    expect(pops.map((p) => p.text)).toEqual(['+25 TUMMY', '-8 ENERGY', '+4 ♥', '+5 acorns']);
    expect(pops[1].y).toBeLessThan(pops[0].y);
    expect(popsFor({}, 50, 40, () => 1)).toEqual([]);
  });
  test('hub song', () => {
    expect(hubSong('dorm', true, true)).toBe('sleep');
    expect(hubSong('dorm', false, true)).toBe('night');
    expect(hubSong('dorm', false, false)).toBe('dorm');
    expect(hubSong('lake_alice', false, false)).toBe('lake_alice');
  });
  test('away text and crumbs', () => {
    expect(awayText(5, 12)).toBe('5 h 12 m');
    expect(awayText(0, 40)).toBe('40 m');
    expect(awayText(73, 0)).toBe('3 days');
    const a = crumbSpots(3, 42);
    expect(a).toHaveLength(3);
    expect(crumbSpots(3, 42)).toEqual(a);
    for (const c of a) {
      expect(c.x).toBeGreaterThanOrEqual(14);
      expect(c.x).toBeLessThanOrEqual(86);
    }
  });
});

describe('weather', () => {
  test('deterministic and valid', () => {
    const t = Date.UTC(2026, 6, 15, 19, 30);
    expect(weatherAt(t)).toBe(weatherAt(t));
    let storms = 0;
    for (let day = 0; day < 120; day++) {
      const w = weatherAt(new Date(2026, 5, 1 + day, 15, 30).getTime());
      expect(['clear', 'rain', 'storm']).toContain(w);
      if (w === 'storm') storms++;
    }
    expect(storms).toBeLessThan(60);
  });
});
