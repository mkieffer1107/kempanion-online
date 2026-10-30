import { describe, expect, test } from 'bun:test';
import type { PigId, SaveData } from '../src/lib/types';
import {
  ACHIEVEMENTS, EDIBLE_IDS, ITEMS, addBondCapped, advance, applyAction, applyMinigameResult, bondLevel, bondProgress,
  buyItem, catchGoldenPetal, chapter, checkAchievements, claimDaily, completeTask, currentWant, dailyTasks,
  discoverTaste, doctorsRounds, fulfillWant, getItem, goldenPetalAvailable, heartEventId, heartGateCap, isAsleep,
  knownTaste, minigameReward, moodOf, newSave, nextHeartEvent, omikujiFor, priceOf, recordDayPlayed, recordSignal,
  rollOmikuji, shopStock, stampCard, tasteOf, welcomeBack, wantSlot,
} from '../src/lib/pet';
import { BUG_TYPES, TEMPLATES, bugSites, bugTierFor, generateGame, supportedBugs } from '../src/lib/minigames/bughunt/generator';
import { ITEM_ICONS } from '../src/lib/content/icons/items';
import { DURATION as VOLLEY_SECONDS, VolleyEngine, layoutFor } from '../src/lib/minigames/volley/engine';
import { PLAN, PerfusionEngine, makeChart } from '../src/lib/minigames/perfusion/engine';
import { DURATION as PETAL_SECONDS, PetalEngine } from '../src/lib/minigames/petals/engine';
import { medalFor } from '../src/lib/pet';
import { featureNotice, sunsetMinutes } from '../src/lib/content/p3-features';

const H = 3_600_000;
const MIN = 60_000;
/** Local wall-clock time (tests are timezone independent). */
const T = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

function fresh(pig: PigId = 'piggy-1', at = T(2026, 10, 28, 12)): SaveData {
  const s = newSave(at, 'Tester');
  s.companion = pig;
  return s;
}

function openGate(s: SaveData, pig: PigId) {
  for (let n = 1; n <= 7; n++) s.seenScenes.push(heartEventId(pig, n));
}

/** Today (2026-10-28) has no daily tasks. The draw depends on createdAt (a local-time epoch), so in some time zones
 *  it would hand out a task (feed a loved food, tuck-in…) whose +10 bond lands in the numbers these tests check. */
function noTasks(s: SaveData) {
  s.flags['pet.tasks'] = JSON.stringify({ d: '2026-10-28', ids: [], done: [] });
}

/** Advance in small present steps (like the 10 s game tick, but coarser). */
function tickPresent(s: SaveData, from: number, to: number, step = 5 * MIN) {
  for (let t = from + step; t <= to; t += step) advance(s, t, { present: true });
}

describe('decay', () => {
  test('present decay uses base rates × pig multipliers', () => {
    const s = fresh('piggy-1');
    const t0 = s.lastTick;
    advance(s, t0 + H, { present: true });
    const n = s.pigs['piggy-1'].needs;
    expect(n.hunger).toBeCloseTo(80 - 6 * 1.2, 5);
    expect(n.energy).toBeCloseTo(80 - 4.5, 5);
    expect(n.hygiene).toBeCloseTo(80 - 3 * 1.25, 5);
    expect(n.fun).toBeCloseTo(80 - 5 * 1.2, 5);
    expect(s.lastTick).toBe(t0 + H);
  });

  test('per-pig multipliers (Piggy 2, Piggy 3)', () => {
    const s2 = fresh('piggy-2');
    advance(s2, s2.lastTick + H, { present: true });
    expect(s2.pigs['piggy-2'].needs.energy).toBeCloseTo(80 - 4.5 * 1.15, 5);
    expect(s2.pigs['piggy-2'].needs.hygiene).toBeCloseTo(80 - 3 * 0.8, 5);
    expect(s2.pigs['piggy-2'].needs.fun).toBeCloseTo(80 - 5 * 0.9, 5);
    const s3 = fresh('piggy-3');
    advance(s3, s3.lastTick + H, { present: true });
    expect(s3.pigs['piggy-3'].needs.hunger).toBeCloseTo(80 - 6 * 0.9, 5);
    expect(s3.pigs['piggy-3'].needs.fun).toBeCloseTo(80 - 5 * 0.8, 5);
  });

  test('only the companion decays; the others hold comfortable values', () => {
    const s = fresh('piggy-1');
    s.pigs['piggy-2'].needs.hunger = 40;
    advance(s, s.lastTick + 6 * H, { present: true });
    expect(s.pigs['piggy-3'].needs.hunger).toBeGreaterThanOrEqual(80);
    expect(s.pigs['piggy-2'].needs.hunger).toBeGreaterThan(40);
    expect(s.pigs['piggy-1'].needs.hunger).toBeLessThan(80);
  });

  test('a gap over 10 minutes is offline (×0.7)', () => {
    const s = fresh('piggy-1', T(2026, 10, 28, 8));
    advance(s, T(2026, 10, 28, 18));
    const n = s.pigs['piggy-1'].needs;
    expect(n.hunger).toBeCloseTo(80 - 6 * 1.2 * 0.7 * 10, 5);
    expect(n.fun).toBeCloseTo(80 - 5 * 1.2 * 0.7 * 10, 5);
    expect(n.energy).toBeCloseTo(80 - 4.5 * 0.7 * 10, 5);
  });

  test('offline floors: needs never drop below 20 while away, and are not raised either', () => {
    const s = fresh('piggy-1', T(2026, 10, 26, 8));
    s.pigs['piggy-1'].needs.fun = 12;
    advance(s, T(2026, 10, 27, 20));
    const n = s.pigs['piggy-1'].needs;
    expect(n.hunger).toBe(20);
    expect(n.hygiene).toBe(20);
    expect(n.fun).toBe(12);
    for (const v of Object.values(n)) expect(v).toBeGreaterThanOrEqual(12);
    expect(s.pigs['piggy-1'].health).toBe(100);
  });

  test('present needs can drop below the floor', () => {
    const s = fresh('piggy-1');
    advance(s, s.lastTick + 12 * H, { present: true });
    expect(s.pigs['piggy-1'].needs.hunger).toBeLessThan(20);
  });

  test('robust to negative, zero, NaN and huge gaps', () => {
    const s = fresh();
    const t0 = s.lastTick;
    expect(advance(s, t0 - 5 * H)).toEqual([]);
    expect(s.lastTick).toBe(t0 - 5 * H);
    expect(advance(s, s.lastTick)).toEqual([]);
    expect(advance(s, Number.NaN)).toEqual([]);
    s.pigs['piggy-1'].needs.hunger = Number.NaN as unknown as number;
    advance(s, s.lastTick + 30 * MIN, { present: true });
    expect(Number.isFinite(s.pigs['piggy-1'].needs.hunger)).toBe(true);
    const ev = advance(s, s.lastTick + 1000 * 24 * H);
    expect(ev.some((e) => e.kind === 'welcome_party')).toBe(true);
  });

  test('mood tiers follow needs and distress', () => {
    const s = fresh();
    const p = s.pigs['piggy-1'];
    p.needs = { hunger: 100, energy: 100, hygiene: 100, fun: 100 };
    expect(moodOf(p, 'piggy-1')).toBe('great');
    p.needs = { hunger: 70, energy: 70, hygiene: 70, fun: 70 };
    expect(moodOf(p, 'piggy-1')).toBe('good');
    p.needs = { hunger: 5, energy: 5, hygiene: 5, fun: 5 };
    expect(moodOf(p, 'piggy-1')).toBe('awful');
  });
});

describe('72 h welcome back', () => {
  test('away > 72 h: needs = max(current, 55), +100 acorns, party flag, letter', () => {
    const s = fresh('piggy-2', T(2026, 10, 20, 12));
    s.pigs['piggy-2'].needs = { hunger: 30, energy: 90, hygiene: 10, fun: 60 };
    s.pigs['piggy-2'].sick = true;
    const money = s.money;
    const ev = advance(s, T(2026, 10, 24, 13));
    const n = s.pigs['piggy-2'].needs;
    expect(n).toEqual({ hunger: 55, energy: 90, hygiene: 55, fun: 60 });
    expect(s.pigs['piggy-2'].sick).toBe(false);
    expect(s.money).toBe(money + 100);
    expect(s.flags.welcome_party_ready).toBe(true);
    expect(ev.find((e) => e.kind === 'welcome_party')).toBeTruthy();
    const letter = welcomeBack(s);
    expect(letter?.party).toBe(true);
    expect(letter?.entries.length).toBe(3);
    expect(letter?.hours).toBe(97);
  });

  test('away 5 h writes a letter in each voice, companion first with need deltas', () => {
    const s = fresh('piggy-3', T(2026, 10, 28, 9));
    advance(s, T(2026, 10, 28, 14));
    const letter = welcomeBack(s)!;
    expect(letter.party).toBe(false);
    expect(letter.hours).toBe(5);
    expect(letter.entries[0].pig).toBe('piggy-3');
    expect(letter.entries[0].deltas.length).toBeGreaterThan(0);
    for (const e of letter.entries) expect(e.line.length).toBeGreaterThan(5);
  });
});

describe('sleep', () => {
  test('the companion falls asleep at bedtime and wakes at wake time', () => {
    const s = fresh('piggy-1', T(2026, 10, 28, 21, 0));
    tickPresent(s, s.lastTick, T(2026, 10, 28, 22, 20));
    expect(s.pigs['piggy-1'].asleep).toBe(false);
    tickPresent(s, s.lastTick, T(2026, 10, 28, 22, 45));
    expect(s.pigs['piggy-1'].asleep).toBe(true);
    expect(isAsleep(s, 'piggy-1', s.lastTick)).toBe(true);
    s.pigs['piggy-1'].needs.energy = 20;
    const hunger = s.pigs['piggy-1'].needs.hunger;
    tickPresent(s, s.lastTick, T(2026, 10, 29, 2, 45), 15 * MIN);
    expect(s.pigs['piggy-1'].needs.energy).toBeCloseTo(20 + 4 * 15, 5);
    expect(s.pigs['piggy-1'].needs.hunger).toBeCloseTo(hunger - 4 * 6 * 1.2 * 0.25, 5);
    tickPresent(s, s.lastTick, T(2026, 10, 29, 6, 45));
    expect(s.pigs['piggy-1'].asleep).toBe(false);
  });

  test('other pigs sleep by their own bedtimes', () => {
    const s = fresh('piggy-1');
    expect(isAsleep(s, 'piggy-3', T(2026, 10, 28, 1, 0))).toBe(true);
    expect(isAsleep(s, 'piggy-3', T(2026, 10, 28, 0, 15))).toBe(false);
    expect(isAsleep(s, 'piggy-2', T(2026, 10, 28, 22, 30))).toBe(true);
  });

  test('tuck-in near bedtime gives bond; nap only when tired; wake keeps him up for a while', () => {
    const s = fresh('piggy-1', T(2026, 10, 28, 15));
    expect(applyAction(s, 'piggy-1', 'sleep', undefined, T(2026, 10, 28, 15)).ok).toBe(false);
    s.pigs['piggy-1'].needs.energy = 40;
    const nap = applyAction(s, 'piggy-1', 'sleep', undefined, T(2026, 10, 28, 15));
    expect(nap.ok).toBe(true);
    expect(s.pigs['piggy-1'].asleep).toBe(true);
    s.lastTick = T(2026, 10, 28, 15);
    tickPresent(s, s.lastTick, T(2026, 10, 28, 15, 35));
    expect(s.pigs['piggy-1'].asleep).toBe(false);
    expect(s.pigs['piggy-1'].needs.energy).toBeGreaterThan(70);

    const night = fresh('piggy-1', T(2026, 10, 28, 21, 30));
    noTasks(night);
    const tuck = applyAction(night, 'piggy-1', 'sleep', undefined, T(2026, 10, 28, 21, 30));
    expect(tuck.ok).toBe(true);
    expect(tuck.bondDelta).toBe(10);
    expect(night.counters.tuck_nights).toBe(1);
    tickPresent(night, night.lastTick, T(2026, 10, 28, 22, 15));
    expect(night.pigs['piggy-1'].asleep).toBe(true); // tucked in early: stays asleep into bedtime
    const w = applyAction(night, 'piggy-1', 'wake', undefined, T(2026, 10, 28, 23, 0));
    expect(w.ok).toBe(true);
    night.lastTick = T(2026, 10, 28, 23, 0);
    tickPresent(night, night.lastTick, T(2026, 10, 28, 23, 20));
    expect(night.pigs['piggy-1'].asleep).toBe(false);
    tickPresent(night, night.lastTick, T(2026, 10, 28, 23, 40));
    expect(night.pigs['piggy-1'].asleep).toBe(true);
  });
});

describe('sickness', () => {
  test('needs under 15 drain health; under 30 he gets sick (present only)', () => {
    const s = fresh('piggy-1');
    s.pigs['piggy-1'].needs = { hunger: 5, energy: 50, hygiene: 5, fun: 5 };
    s.pigs['piggy-1'].health = 40;
    const t0 = s.lastTick;
    const ev = advance(s, t0 + 30 * MIN, { present: true });
    expect(s.pigs['piggy-1'].health).toBeCloseTo(40 - 12 * 0.5, 5);
    expect(s.pigs['piggy-1'].sick).toBe(false);
    expect(ev.some((e) => e.kind === 'sick')).toBe(false);
    const ev2 = advance(s, t0 + 2 * H, { present: true });
    expect(s.pigs['piggy-1'].sick).toBe(true);
    expect(ev2.some((e) => e.kind === 'sick')).toBe(true);
  });

  test('offline floors mean offline time never makes him sick', () => {
    const s = fresh('piggy-1', T(2026, 10, 26, 8));
    advance(s, T(2026, 10, 28, 20));
    expect(s.pigs['piggy-1'].sick).toBe(false);
  });

  test('health recovers when all needs are ≥ 50', () => {
    const s = fresh('piggy-1');
    s.pigs['piggy-1'].health = 50;
    advance(s, s.lastTick + H, { present: true });
    expect(s.pigs['piggy-1'].health).toBeCloseTo(53, 5);
  });

  test('cures: medicine, 24 h cap, overnight sleep, Doctor\'s Rounds', () => {
    const s = fresh('piggy-1');
    s.pigs['piggy-1'].sick = true;
    s.flags['pet.piggy-1.sickAt'] = s.lastTick;
    // not-sick refusal keeps the item
    const ok = fresh('piggy-1');
    ok.inventory.cold_medicine = 1;
    expect(applyAction(ok, 'piggy-1', 'medicine', 'cold_medicine', ok.lastTick).ok).toBe(false);
    expect(ok.inventory.cold_medicine).toBe(1);
    // medicine
    s.inventory.cold_medicine = 1;
    const r = applyAction(s, 'piggy-1', 'medicine', 'cold_medicine', s.lastTick);
    expect(r.ok).toBe(true);
    expect(r.cured).toBe(true);
    expect(s.pigs['piggy-1'].sick).toBe(false);
    expect(s.counters.cures).toBe(1);
    expect(s.inventory.cold_medicine).toBeUndefined();
    // 24 h cap
    const c = fresh('piggy-1', T(2026, 10, 28, 9));
    c.pigs['piggy-1'].sick = true;
    c.flags['pet.piggy-1.sickAt'] = c.lastTick;
    advance(c, c.lastTick + 25 * H);
    expect(c.pigs['piggy-1'].sick).toBe(false);
    // overnight sleep with hunger ≥ 40
    const o = fresh('piggy-1', T(2026, 10, 28, 22, 0));
    o.pigs['piggy-1'].sick = true;
    o.pigs['piggy-1'].needs.hunger = 90;
    o.flags['pet.piggy-1.sickAt'] = o.lastTick;
    tickPresent(o, o.lastTick, T(2026, 10, 29, 7, 0), 15 * MIN);
    expect(o.pigs['piggy-1'].sick).toBe(false);
    // Doctor's Rounds needs Piggy 2 at ♥4
    const d = fresh('piggy-3');
    d.pigs['piggy-3'].sick = true;
    expect(doctorsRounds(d, d.lastTick).ok).toBe(false);
    d.pigs['piggy-2'].bond = 420;
    const rounds = doctorsRounds(d, d.lastTick);
    expect(rounds.ok).toBe(true);
    expect(rounds.anim).toBe('neuro_exam');
    expect(d.pigs['piggy-3'].sick).toBe(false);
  });

  test('gentle mode never gets sick and freezes needs while away', () => {
    const s = fresh('piggy-1', T(2026, 10, 28, 8));
    s.flags['pet.gentle'] = true;
    advance(s, T(2026, 10, 28, 18));
    expect(s.pigs['piggy-1'].needs.hunger).toBe(80);
    s.pigs['piggy-1'].needs = { hunger: 1, energy: 50, hygiene: 1, fun: 1 };
    s.pigs['piggy-1'].health = 20;
    advance(s, s.lastTick + H, { present: true });
    expect(s.pigs['piggy-1'].sick).toBe(false);
  });
});

describe('bond caps & heart gates', () => {
  test('levels and titles', () => {
    expect(bondLevel(0)).toBe(0);
    expect(bondLevel(199)).toBe(1);
    expect(bondLevel(5000)).toBe(10);
    expect(bondProgress(250)).toEqual({ level: 2, into: 50, span: 100, title: 'Lab Partner' });
    expect(bondProgress(1000).title).toBe('Kempanion');
  });

  test('heart gate: bond stops at (next unseen event requirement + 1) × 100 − 1', () => {
    const s = fresh('piggy-1');
    const now = s.lastTick;
    expect(heartGateCap(s, 'piggy-1')).toBe(99);
    expect(addBondCapped(s, 'piggy-1', 500, 'scene', now)).toBe(99);
    expect(s.pigs['piggy-1'].bond).toBe(99);
    s.seenScenes.push('p1_h1');
    expect(heartGateCap(s, 'piggy-1')).toBe(199);
    expect(nextHeartEvent(s, 'piggy-1')?.id).toBe('p1_h2');
    expect(addBondCapped(s, 'piggy-1', 60, 'event', now)).toBe(60);
    expect(s.pigs['piggy-1'].bond).toBe(159);
    expect(addBondCapped(s, 'piggy-1', 1000, 'event', now)).toBe(841);
    expect(s.pigs['piggy-1'].bond).toBe(1000);
  });

  test('chapters by distinct days played gate heart events', () => {
    const s = fresh('piggy-2', T(2026, 10, 1, 10));
    expect(recordDayPlayed(s, T(2026, 10, 1, 10)).newDay).toBe(true);
    expect(recordDayPlayed(s, T(2026, 10, 1, 23)).newDay).toBe(false);
    expect(chapter(s)).toBe(1);
    recordDayPlayed(s, T(2026, 10, 5, 10));
    expect(chapter(s)).toBe(2);
    recordDayPlayed(s, T(2026, 10, 6, 10));
    recordDayPlayed(s, T(2026, 10, 7, 10));
    expect(chapter(s)).toBe(3);
    recordDayPlayed(s, T(2026, 10, 8, 10));
    recordDayPlayed(s, T(2026, 10, 9, 10));
    expect(chapter(s)).toBe(4);
    s.seenScenes.push('p2_h1', 'p2_h2');
    s.pigs['piggy-2'].bond = 250;
    expect(nextHeartEvent(s, 'piggy-2')).toEqual({ n: 3, id: 'p2_h3', hearts: 2, chapter: 2, ready: true });
  });

  test('daily per-source caps and the 120/day routine total; reset next day', () => {
    const s = fresh('piggy-3');
    openGate(s, 'piggy-3');
    const day1 = T(2026, 10, 28, 12);
    let pet = 0;
    for (let i = 0; i < 10; i++) pet += addBondCapped(s, 'piggy-3', 2, 'pet', day1);
    expect(pet).toBe(10);
    expect(addBondCapped(s, 'piggy-3', 100, 'minigame', day1)).toBe(100);
    expect(addBondCapped(s, 'piggy-3', 40, 'food', day1)).toBe(10);
    expect(addBondCapped(s, 'piggy-3', 10, 'want', day1)).toBe(0);
    expect(addBondCapped(s, 'piggy-3', 10, 'task', day1)).toBe(10);
    expect(addBondCapped(s, 'piggy-3', 50, 'discovery', day1)).toBe(50);
    expect(addBondCapped(s, 'piggy-3', 40, 'food', T(2026, 10, 29, 9))).toBe(40);
    expect(addBondCapped(s, 'piggy-3', -5, 'care', day1)).toBe(0);
  });

  test('chat: +2 per exchange (+1 on topic), ×1.25 for the companion, capped', () => {
    const s = fresh('piggy-1');
    openGate(s, 'piggy-1');
    openGate(s, 'piggy-2');
    const now = s.lastTick;
    expect(recordSignal(s, { kind: 'chat', pig: 'piggy-2', text: 'hello' }, now).bond).toBe(2);
    expect(recordSignal(s, { kind: 'chat', pig: 'piggy-1', text: 'nice serve', topicMatch: true }, now).bond).toBe(4);
    let total = 0;
    for (let i = 0; i < 30; i++) total += recordSignal(s, { kind: 'chat', pig: 'piggy-2', text: 'hi' }, now).bond;
    expect(total + 2).toBe(30);
  });
});

describe('tastes', () => {
  test('secret favorites and canonical tastes', () => {
    expect(tasteOf('piggy-1', 'strawberry_milk')).toBe('secret');
    expect(tasteOf('piggy-2', 'truffle_fries')).toBe('secret');
    expect(tasteOf('piggy-3', 'sakura_dango')).toBe('secret');
    expect(tasteOf('piggy-1', 'tender_sub')).toBe('love');
    expect(tasteOf('piggy-1', 'boiled_peanuts')).toBe('dislike');
    expect(tasteOf('piggy-2', 'boiled_peanuts')).toBe('like');
    expect(tasteOf('piggy-3', 'onigiri')).toBe('love');
    expect(tasteOf('piggy-2', 'apple_pie')).toBe('love');
    expect(tasteOf('piggy-1', 'not_an_item')).toBe('neutral');
  });

  test('every canonical item exists, no pork, every edible has an icon id', () => {
    const canonical = ['dining_tray', 'water_bottle', 'tender_sub', 'pizza_slice', 'cup_ramen', 'onigiri', 'melonpan', 'apple_pie',
      'key_lime_pie', 'boiled_peanuts', 'acai_bowl', 'protein_shake', 'watermelon', 'oranges', 'pastelito', 'blueberries',
      'sakura_dango', 'truffle_fries', 'sideline_sip', 'florida_oj', 'sweet_tea', 'cafecito', 'cold_brew', 'boba_tea',
      'strawberry_milk', 'vegan_ice_cream', 'lavender_soap', 'mint_toothpaste', 'honey_lemon_tea', 'cold_medicine', 'ginger_ale',
      'knee_pad_tape', 'signed_volleyball', 'brain_model', 'big_water_bottle', 'sakura_filament', 'pirate_manga', 'pennant',
      'sakura_charm', 'comic_sans_stickers', 'kempapager', 'name_badge', 'sakura_keychain'];
    for (const id of canonical) expect(getItem(id)?.id).toBe(id);
    expect(Object.keys(ITEMS).sort()).toEqual(canonical.slice().sort());
    for (const item of Object.values(ITEMS)) {
      expect(`${item.name} ${item.desc}`).not.toMatch(/\b(pork|bacon|ham|sausage|pepperoni|lard)\b/i);
      expect(item.icon).toBe(item.id);
      expect(item.desc.length).toBeGreaterThan(10);
    }
  });

  test('love fills ×1.2 and gives +10 bond; dislike ×0.8 and no bond', () => {
    const s = fresh('piggy-1');
    openGate(s, 'piggy-1');
    noTasks(s);
    s.pigs['piggy-1'].needs.hunger = 30;
    s.inventory.tender_sub = 1;
    const r = applyAction(s, 'piggy-1', 'feed', 'tender_sub', s.lastTick);
    expect(r.ok).toBe(true);
    expect(r.taste).toBe('love');
    expect(s.pigs['piggy-1'].needs.hunger).toBeCloseTo(30 + 55 * 1.2, 5);
    expect(r.bondDelta).toBe(13); // +10 love, +3 care (hunger was < 60)
    expect(s.inventory.tender_sub).toBeUndefined();

    s.pigs['piggy-1'].needs.hunger = 70;
    s.inventory.boiled_peanuts = 1;
    const d = applyAction(s, 'piggy-1', 'feed', 'boiled_peanuts', s.lastTick);
    expect(d.taste).toBe('dislike');
    expect(s.pigs['piggy-1'].needs.hunger).toBeCloseTo(70 + 20 * 0.8, 5);
    expect(d.bondDelta).toBeUndefined();
    expect(d.line).toContain('peanuts');
  });

  test('first secret favorite: +50 bond and a reveal, only once', () => {
    const s = fresh('piggy-3');
    openGate(s, 'piggy-3');
    noTasks(s);
    s.pigs['piggy-3'].needs.hunger = 70;
    s.inventory.sakura_dango = 2;
    const r = applyAction(s, 'piggy-3', 'feed', 'sakura_dango', s.lastTick);
    expect(r.secretRevealed).toBe(true);
    expect(r.bondDelta).toBe(60);
    expect(knownTaste(s, 'piggy-3', 'sakura_dango')).toBe('secret');
    s.pigs['piggy-3'].needs.hunger = 50;
    const again = applyAction(s, 'piggy-3', 'feed', 'sakura_dango', s.lastTick + 3 * H);
    expect(again.secretRevealed).toBe(false);
    expect(again.bondDelta).toBe(13);
  });

  test('food bond is capped at 40/day', () => {
    const s = fresh('piggy-1');
    openGate(s, 'piggy-1');
    noTasks(s);
    let bond = 0;
    for (let i = 0; i < 6; i++) {
      s.pigs['piggy-1'].needs.hunger = 70;
      s.inventory.oranges = 1;
      bond += applyAction(s, 'piggy-1', 'feed', 'oranges', s.lastTick + i).bondDelta ?? 0;
    }
    expect(bond).toBe(40);
  });

  test('discovering tastes for the shop', () => {
    const s = fresh();
    expect(knownTaste(s, 'piggy-2', 'apple_pie')).toBeNull();
    expect(discoverTaste(s, 'piggy-2', 'apple_pie')).toBe(true);
    expect(discoverTaste(s, 'piggy-2', 'apple_pie')).toBe(false);
    expect(knownTaste(s, 'piggy-2', 'apple_pie')).toBe('love');
  });
});

describe('refusals', () => {
  test('full pig refuses food and keeps it; one dessert allowed every 2 h (betsubara)', () => {
    const s = fresh('piggy-2');
    s.pigs['piggy-2'].needs.hunger = 95;
    s.inventory.pizza_slice = 1;
    s.inventory.apple_pie = 2;
    const r = applyAction(s, 'piggy-2', 'feed', 'pizza_slice', s.lastTick);
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
    expect(s.inventory.pizza_slice).toBe(1);
    expect(applyAction(s, 'piggy-2', 'feed', 'apple_pie', s.lastTick).ok).toBe(true);
    expect(applyAction(s, 'piggy-2', 'feed', 'apple_pie', s.lastTick + 30 * MIN).ok).toBe(false);
    expect(s.inventory.apple_pie).toBe(1);
    expect(applyAction(s, 'piggy-2', 'feed', 'apple_pie', s.lastTick + 2 * H + MIN).ok).toBe(true);
  });

  test('free items are never consumed; missing items are refused', () => {
    const s = fresh();
    s.pigs['piggy-1'].needs.hunger = 20;
    expect(applyAction(s, 'piggy-1', 'feed', 'dining_tray', s.lastTick).ok).toBe(true);
    expect(applyAction(s, 'piggy-1', 'feed', 'onigiri', s.lastTick).ok).toBe(false);
    expect(applyAction(s, 'piggy-1', 'feed', 'brain_model', s.lastTick).ok).toBe(false);
    expect(applyAction(s, 'piggy-1', 'feed', undefined, s.lastTick).ok).toBe(false);
  });

  test('bath cooldown, brushing cooldown, play needs energy', () => {
    const s = fresh('piggy-1');
    const t = s.lastTick;
    s.pigs['piggy-1'].needs.hygiene = 30;
    expect(applyAction(s, 'piggy-1', 'clean', undefined, t).ok).toBe(true);
    expect(s.pigs['piggy-1'].needs.hygiene).toBe(100);
    expect(applyAction(s, 'piggy-1', 'clean', 'bath', t + H).ok).toBe(false);
    expect(applyAction(s, 'piggy-1', 'clean', 'bath', t + 3 * H).ok).toBe(true);
    expect(applyAction(s, 'piggy-1', 'clean', 'brush', t).ok).toBe(true);
    expect(applyAction(s, 'piggy-1', 'clean', 'brush', t + H).ok).toBe(false);
    s.pigs['piggy-1'].needs.energy = 5;
    const p = applyAction(s, 'piggy-1', 'play', undefined, t);
    expect(p.ok).toBe(false);
    expect(p.line).toBeTruthy();
  });

  test('asleep, not-the-companion and gift-lock refusals', () => {
    const s = fresh('piggy-1', T(2026, 10, 28, 23, 0));
    s.pigs['piggy-1'].asleep = true;
    s.inventory.onigiri = 1;
    expect(applyAction(s, 'piggy-1', 'feed', 'onigiri', s.lastTick).reason).toContain('asleep');
    expect(applyAction(s, 'piggy-1', 'pet', undefined, s.lastTick).ok).toBe(true); // whispers, no penalty
    expect(applyAction(s, 'piggy-2', 'clean', undefined, s.lastTick).ok).toBe(false);
    const g = fresh('piggy-1');
    g.inventory.pennant = 1;
    expect(applyAction(g, 'piggy-3', 'gift', 'pennant', g.lastTick).reason).toContain('♥1');
    g.pigs['piggy-3'].bond = 120;
    const ok = applyAction(g, 'piggy-3', 'gift', 'pennant', T(2026, 10, 28, 14));
    expect(ok.ok).toBe(true);
    expect(g.inventory.pennant).toBeUndefined();
  });

  test('pet: diminishing fun within 15 min, spam = playful pout without penalty', () => {
    const s = fresh('piggy-1');
    s.pigs['piggy-1'].needs.fun = 50;
    const t = s.lastTick + 20 * MIN;
    applyAction(s, 'piggy-1', 'pet', undefined, t);
    expect(s.pigs['piggy-1'].needs.fun).toBeCloseTo(56, 5);
    applyAction(s, 'piggy-1', 'pet', undefined, t + 5000);
    expect(s.pigs['piggy-1'].needs.fun).toBeCloseTo(56 + 3.6, 5);
    let pout = null;
    for (let i = 0; i < 6; i++) {
      const r = applyAction(s, 'piggy-1', 'pet', undefined, t + 10_000 + i * 200);
      if (r.anim === 'angry') pout = r;
    }
    expect(pout?.ok).toBe(true);
    expect(pout?.expression).toBe('angry');
  });

  test('tidy clears crumbs; nothing to tidy is refused', () => {
    const s = fresh('piggy-1');
    expect(applyAction(s, 'piggy-1', 'tidy', undefined, s.lastTick).ok).toBe(false);
    s.pigs['piggy-1'].mess = 3;
    expect(applyAction(s, 'piggy-1', 'tidy', undefined, s.lastTick).ok).toBe(true);
    expect(s.pigs['piggy-1'].mess).toBe(0);
  });
});

describe('dailies', () => {
  test('login stamps pause on missed days and never reset', () => {
    const s = fresh('piggy-1', T(2026, 10, 1, 9));
    const m0 = s.money;
    const c1 = claimDaily(s, T(2026, 10, 1, 9))!;
    expect(c1).toMatchObject({ stamp: 1, money: 30, streak: 1 });
    expect(claimDaily(s, T(2026, 10, 1, 20))).toBeNull();
    const c2 = claimDaily(s, T(2026, 10, 2, 9))!;
    expect(c2.stamp).toBe(2);
    expect(c2.item).toBe('oranges');
    const c3 = claimDaily(s, T(2026, 10, 9, 9))!; // a week later: card paused, not reset
    expect(c3).toMatchObject({ stamp: 3, money: 50, streak: 3 });
    for (let d = 10; d <= 13; d++) claimDaily(s, T(2026, 10, d, 9));
    expect(s.flags.stamp_party_ready).toBe(true);
    const c8 = claimDaily(s, T(2026, 10, 14, 9))!;
    expect(c8.stamp).toBe(1);
    expect(stampCard(s, T(2026, 10, 14, 10))).toMatchObject({ cards: 1, onCard: 1, claimedToday: true });
    expect(s.money).toBe(m0 + 30 + 40 + 50 + 60 + 70 + 80 + 100 + 30);
  });

  test('omikuji is deterministic per date, once per day, never bad', () => {
    const s = fresh('piggy-1', T(2026, 10, 30, 9));
    const a = rollOmikuji(s, T(2026, 10, 30, 9));
    const b = rollOmikuji(s, T(2026, 10, 30, 21));
    expect(a.fresh).toBe(true);
    expect(b.fresh).toBe(false);
    expect(b.id).toBe(a.id);
    const twin = fresh('piggy-2', T(2026, 10, 30, 9));
    twin.createdAt = s.createdAt;
    expect(omikujiFor(twin, T(2026, 10, 30, 13))).toBe(a.id);
    const counts: Record<string, number> = { great: 0, blessing: 0, small: 0, future: 0 };
    for (let d = 0; d < 4000; d++) counts[omikujiFor(s, T(2026, 1, 1, 12) + d * 24 * H)]++;
    expect(Object.keys(counts).sort()).toEqual(['blessing', 'future', 'great', 'small']);
    expect(counts.great / 4000).toBeCloseTo(0.1, 1);
    expect(counts.small / 4000).toBeCloseTo(0.4, 1);
  });

  test('omikuji effects: future doubles the next stamp, small gives one half-price unit', () => {
    const s = fresh('piggy-1', T(2026, 10, 30, 9));
    s.flags['pet.stampDouble'] = true;
    expect(claimDaily(s, T(2026, 10, 30, 9))!.money).toBe(60);
    s.flags['pet.halfPrice'] = '2026-10-30';
    s.money = 100;
    expect(priceOf(s, 'brain_model', T(2026, 10, 30, 12))).toBe(30);
    const buy = buyItem(s, 'brain_model', 2, T(2026, 10, 30, 12), 'reitz');
    expect(buy.ok).toBe(true);
    expect(buy.cost).toBe(90);
    expect(priceOf(s, 'brain_model', T(2026, 10, 30, 12))).toBe(60);
  });

  test('three daily tasks; completing one pays 25 acorns and +10 bond', () => {
    const s = fresh('piggy-1', T(2026, 10, 30, 9));
    openGate(s, 'piggy-1');
    const tasks = dailyTasks(s, T(2026, 10, 30, 9));
    expect(tasks.length).toBe(3);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(3);
    expect(dailyTasks(s, T(2026, 10, 30, 22)).map((t) => t.id)).toEqual(tasks.map((t) => t.id));
    const m = s.money;
    const done = completeTask(s, tasks[0].id, T(2026, 10, 30, 10));
    expect(done?.done).toBe(true);
    expect(s.money).toBe(m + 25);
    expect(completeTask(s, tasks[0].id, T(2026, 10, 30, 10))).toBeNull();
    expect(dailyTasks(s, T(2026, 10, 31, 9)).every((t) => !t.done)).toBe(true);
  });

  test('signals complete matching tasks (say "based" to Piggy 2)', () => {
    const s = fresh('piggy-1', T(2026, 10, 30, 9));
    s.flags['pet.tasks'] = JSON.stringify({ d: '2026-10-30', ids: ['say_based', 'bath', 'any_minigame'], done: [] });
    const r = recordSignal(s, { kind: 'chat', pig: 'piggy-2', text: 'Based.' }, T(2026, 10, 30, 9, 5));
    expect(r.tasks.map((t) => t.id)).toEqual(['say_based']);
    expect(r.achievements.map((a) => a.id)).toContain('patriot');
    expect(recordSignal(s, { kind: 'chat', pig: 'piggy-2', text: 'based on the data' }, T(2026, 10, 30, 9, 6)).achievements.length).toBe(0);
  });

  test('golden petals: +5 acorns, 10 per day, 3 minutes apart', () => {
    const s = fresh('piggy-1', T(2026, 10, 30, 9));
    let t = T(2026, 10, 30, 9);
    expect(goldenPetalAvailable(s, t)).toBe(true);
    let money = 0;
    for (let i = 0; i < 12; i++) {
      const r = catchGoldenPetal(s, t);
      money += r.money;
      t += 4 * MIN;
    }
    expect(money).toBe(50);
    expect(goldenPetalAvailable(s, t)).toBe(false);
    expect(goldenPetalAvailable(s, T(2026, 10, 31, 9))).toBe(true);
  });

  test('shops: Reitz by day, Midtown at night, Shands always', () => {
    expect(shopStock('reitz', T(2026, 10, 30, 12)).length).toBeGreaterThan(20);
    expect(shopStock('reitz', T(2026, 10, 30, 23))).toEqual([]);
    expect(shopStock('midtown', T(2026, 10, 30, 12))).toEqual([]);
    const late = shopStock('midtown', T(2026, 10, 30, 23)).map((i) => i.id);
    expect(late).toContain('truffle_fries');
    expect(shopStock('shands', T(2026, 10, 30, 3)).map((i) => i.id)).toContain('cold_medicine');
    expect(shopStock('plaza', T(2026, 10, 30, 12))).toEqual([]);
    for (const i of shopStock('midtown', T(2026, 10, 31, 1))) expect(['food', 'drink']).toContain(i.category);
  });
});

describe('wants', () => {
  test('a want is stable inside its slot, fulfils once for +8 bond and +5 fun, then expires', () => {
    const s = fresh('piggy-1', T(2026, 10, 30, 9));
    openGate(s, 'piggy-1');
    let t = T(2026, 10, 30, 6);
    let slot = wantSlot(t);
    while (!slot) slot = wantSlot((t += 5 * MIN));
    const w = currentWant(s, 'piggy-1', t)!;
    expect(w).toBeTruthy();
    expect(currentWant(s, 'piggy-1', t + 30 * MIN)?.id).toBe(w.id);
    expect(currentWant(s, 'piggy-2', t)).toBeNull();
    expect(currentWant(s, 'piggy-1', w.until + 1)).toBeNull();
    s.pigs['piggy-1'].needs.fun = 50;
    const kindId = w.kind === 'talk' ? 'anything' : w.id;
    expect(fulfillWant(s, 'piggy-1', w.kind === 'food' ? 'activity' : 'food', 'nope', t)).toBeNull();
    const r = fulfillWant(s, 'piggy-1', w.kind, kindId, t)!;
    expect(r.bond).toBe(8);
    expect(s.pigs['piggy-1'].needs.fun).toBeCloseTo(55, 5);
    expect(currentWant(s, 'piggy-1', t + MIN)).toBeNull();
  });
});

describe('mini-game rewards', () => {
  test('always pays ≥ 5, first run of the day ×2, medals add bond', () => {
    const s = fresh('piggy-3', T(2026, 10, 30, 14));
    openGate(s, 'piggy-3');
    const now = T(2026, 10, 30, 14);
    const zero = minigameReward(s, 'debug', 'piggy-3', { score: 0, stats: { correct: 0, hints: 0 } }, now);
    expect(zero.money).toBe(10);
    expect(zero.medal).toBe('none');
    expect(zero.bond).toBe(10);
    const gold = minigameReward(s, 'debug', 'piggy-3', { score: 200, stats: { correct: 10, hints: 0 } }, now);
    expect(gold.medal).toBe('gold');
    expect(gold.bond).toBe(25);
    expect(gold.money).toBe(90);
    const energy = s.pigs['piggy-3'].needs.energy;
    const applied = applyMinigameResult(s, 'piggy-3', gold, now);
    expect(applied.bond).toBe(25);
    expect(s.pigs['piggy-3'].needs.energy).toBe(energy - 8);
    expect(s.counters['mg.debug.zero_day']).toBe(1);
    expect(applied.achievements.map((a) => a.id)).toContain('zero_day_hunter');
    const second = minigameReward(s, 'debug', 'piggy-3', { score: 200, stats: { correct: 10, hints: 1 } }, now + MIN);
    expect(second.firstRun).toBe(false);
    expect(second.money).toBe(45);
  });
});

describe('achievements', () => {
  test('definitions are unique and checks are idempotent', () => {
    expect(ACHIEVEMENTS.length).toBe(20);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(20);
    const s = fresh();
    expect(checkAchievements(s)).toEqual([]);
    s.pigs['piggy-2'].bond = 210;
    expect(checkAchievements(s).map((a) => a.id)).toEqual(['lab_partners']);
    expect(checkAchievements(s)).toEqual([]);
  });

  test('Squeaky Clean after 10 baths; Set! Spike! call-and-response; Secret Menu; Five-Star Dining', () => {
    const s = fresh('piggy-1');
    let t = s.lastTick;
    for (let i = 0; i < 10; i++) {
      applyAction(s, 'piggy-1', 'clean', undefined, t);
      t += 3 * H + MIN;
    }
    expect(s.achievements).toContain('squeaky_clean');
    for (const w of ['bump', 'set', 'spike']) recordSignal(s, { kind: 'chat', pig: 'piggy-1', text: w }, t);
    expect(s.achievements).toContain('set_spike');
    for (const p of ['piggy-1', 'piggy-2', 'piggy-3'] as PigId[]) s.flags[`pet.${p}.secret`] = true;
    for (const id of EDIBLE_IDS) s.counters[`served.${id}`] = 1;
    const got = checkAchievements(s).map((a) => a.id);
    expect(got).toContain('secret_menu');
    expect(got).toContain('five_star_dining');
  });

  test('Bat Signal and Early Rounds from visits', () => {
    const s = fresh('piggy-1');
    recordSignal(s, { kind: 'visit', location: 'lake_alice' }, T(2026, 10, 30, 18, 50));
    recordSignal(s, { kind: 'visit', location: 'shands', present: ['piggy-2'] }, T(2026, 10, 30, 5, 30));
    expect(s.achievements).toContain('bat_signal');
    expect(s.achievements).toContain('early_rounds');
  });
});

describe('mini-game engines', () => {
  const contact = (a: string) => ({ volleyball_bump: 166, volleyball_set: 166, volleyball_spike: 249, volleyball_dig: 166, volleyball_block: 249, volleyball_serve: 249 })[a] ?? 0;

  test('Sakura Spike: perfect play earns gold, idle play still ends with a score of 0 and no crash', () => {
    const e = new VolleyEngine(layoutFor(480, 270), 1, false, contact);
    e.start(0);
    for (let t = 0; t <= VOLLEY_SECONDS + 0.5; t += 1 / 120) {
      e.update(t);
      if (e.expect && Math.abs(t - e.expect.at) < 1 / 240) e.tap(e.expect.at);
    }
    expect(e.ended).toBe(true);
    expect(e.stats().drops).toBe(0);
    expect(medalFor('volley', { score: e.score, stats: e.stats() })).toBe('gold');
    const idle = new VolleyEngine(layoutFor(200, 270), 2, false, contact);
    idle.start(0);
    for (let t = 0; t <= VOLLEY_SECONDS + 0.5; t += 1 / 30) idle.update(t);
    expect(idle.ended).toBe(true);
    expect(idle.score).toBe(0);
    expect(idle.stats().drops).toBeGreaterThan(5);
  });

  test('Sakura Spike: late tap digs once per point, early taps lock out briefly', () => {
    const e = new VolleyEngine(layoutFor(480, 270), 3, false, contact);
    e.start(0);
    let t = 0;
    while (!e.expect) e.update((t += 1 / 120));
    const at = e.expect.at;
    expect(e.tap(at - 0.3)).toBe('early');
    expect(e.tap(at - 0.2)).toBeNull();
    expect(e.tap(at + 0.2)).toBe('dig');
    expect(e.digs).toBe(1);
  });

  test('Perfusion!: chart rides the steady 96 BPM song (HR 72/96/120); perfect play is 100% accuracy and 100% perfusion', () => {
    const c = makeChart(9);
    expect(c.phases.map((p) => p.bpm)).toEqual([96, 96, 96]);
    expect(c.phases.map((p) => p.hr)).toEqual([72, 96, 120]);
    expect(c.phases[0].start).toBeCloseTo(PLAN.firstBeat * (60 / 96), 5); // 5 s: after the 2-bar count-in
    expect(c.phases[1].start).toBeCloseTo(25, 5);
    expect(c.phases[2].start).toBeCloseTo(45, 5);
    expect(c.end).toBeGreaterThan(64);
    expect(c.end).toBeLessThan(68);
    expect(c.notes.length).toBeGreaterThan(45);
    for (let i = 1; i < c.notes.length; i++) expect(c.notes[i].t).toBeGreaterThan(c.notes[i - 1].end - 1e-9);
    const e = new PerfusionEngine(9, false);
    let hold = -1;
    for (let t = 0; t <= e.chart.end + 0.5; t += 1 / 240) {
      for (const n of e.chart.notes) {
        if (n.type === 'skip' || e.grades.has(n.id)) continue;
        if (Math.abs(t - n.t) < 1 / 480) {
          e.press(n.t);
          if (n.type === 'drain') hold = n.end;
        }
      }
      if (hold > 0 && t >= hold) {
        e.release(t);
        hold = -1;
      }
      e.update(t);
    }
    expect(e.ended).toBe(true);
    expect(e.accuracy()).toBe(100);
    expect(e.stats().perfusion).toBe(100);
    expect(e.stats().miss).toBe(0);
  });

  test('Perfusion!: tapping a skip or missing beats drains the meter (no fail state)', () => {
    const e = new PerfusionEngine(4, false);
    for (let t = 0; t <= e.chart.end + 0.5; t += 1 / 60) e.update(t);
    expect(e.ended).toBe(true);
    expect(e.meter).toBe(0);
    expect(e.accuracy()).toBeLessThan(25);
    const s = new PerfusionEngine(5, false);
    const skip = s.chart.notes.find((n) => n.type === 'skip')!;
    for (let t = 0; t < skip.t; t += 1 / 60) s.update(t);
    expect(s.press(skip.t)).toBe('miss');
  });

  test('Petal Catch: ends at 45 s; catching petals scores; acorns tumble without costing points', () => {
    const e = new PetalEngine(320, 270, 11, false);
    for (let t = 0; t <= PETAL_SECONDS + 0.2; t += 1 / 60) {
      const b = e.box();
      let target: number | null = null;
      let best = Infinity;
      for (const it of e.items) {
        if (it.landed !== undefined || it.kind === 'acorn') continue;
        const tf = (b.y1 - it.y) / it.vy;
        if (tf > 0 && tf < best) {
          best = tf;
          target = e.itemX(it);
        }
      }
      e.update(t, { dir: 0, target });
    }
    expect(e.ended).toBe(true);
    expect(e.score).toBe(e.pink + e.golden * 10 + e.snacks * 2);
    expect(e.score).toBeGreaterThan(40);
  });
});

describe('icons', () => {
  test('every item, achievement and extra has a valid 16×16 icon', () => {
    const ids = new Set([
      ...Object.values(ITEMS).map((i) => i.icon), ...ACHIEVEMENTS.map((a) => a.icon),
      'medal_bronze', 'medal_silver', 'medal_gold', 'omikuji', 'stamp', 'acorn', 'petal_pink', 'petal_gold',
      'ball', 'speech', 'pin', 'bubbles', 'hand', 'ecg', 'bug',
    ]);
    for (const id of ids) {
      const icon = ITEM_ICONS[id];
      expect(icon, id).toBeTruthy();
      expect(icon.rows.length).toBe(16);
      for (const row of icon.rows) {
        expect(row.length).toBe(16);
        for (const ch of row) if (ch !== '.') expect(icon.palette[ch], `${id}:${ch}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('Bug Hunt generator', () => {
  test('at least 25 templates, every bug type is reachable from several', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(25);
    for (const b of BUG_TYPES) expect(TEMPLATES.filter((t) => bugSites(t, b).length > 0).length).toBeGreaterThanOrEqual(4);
    for (const t of TEMPLATES) {
      expect(t.lines.length).toBeGreaterThanOrEqual(4);
      expect(t.lines.length).toBeLessThanOrEqual(7);
      for (const l of t.lines) expect(l.length).toBeLessThanOrEqual(34);
      expect(supportedBugs(t).length).toBeGreaterThanOrEqual(2);
    }
  });

  test('exactly one bug per round with a valid one-line explanation', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      const game = generateGame(seed);
      expect(game.length).toBe(10);
      expect(new Set(game.map((r) => r.templateId)).size).toBe(10);
      game.forEach((r, i) => {
        seen.add(r.bug);
        expect(r.lines.length).toBe(r.correct.length);
        const diff = r.lines.map((l, j) => (l !== r.correct[j] ? j : -1)).filter((j) => j >= 0);
        expect(diff).toEqual([r.bugLine]);
        expect(r.explanation.length).toBeGreaterThan(15);
        expect(r.explanation.length).toBeLessThanOrEqual(140);
        expect(r.explanation).not.toMatch(/[{}]/);
        expect(r.explanation).not.toContain('\n');
        expect(r.hintLines).toContain(r.bugLine);
        expect(new Set(r.hintLines).size).toBe(3);
        expect(bugTierFor(i)).toContain(r.bug);
      });
    }
    expect([...seen].sort()).toEqual([...BUG_TYPES].sort());
  });

  test('deterministic per seed', () => {
    expect(generateGame('abc')).toEqual(generateGame('abc'));
    expect(generateGame('abc')).not.toEqual(generateGame('abd'));
  });
});

describe("Piggy 3's shipped feature", () => {
  const withFeature = (f?: string) => {
    const s = newSave(Date.parse('2026-10-30T09:00:00'));
    if (f) s.flags.p3_feature = f;
    return s;
  };
  test('sunset table is sane for Gainesville (Oct ~7 PM, Dec ~5:30 PM, Jun ~8:30 PM)', () => {
    expect(sunsetMinutes(new Date(2026, 9, 15))).toBeCloseTo(19 * 60 + 3, -1);
    expect(sunsetMinutes(new Date(2026, 11, 15))).toBeGreaterThan(17 * 60 + 20);
    expect(sunsetMinutes(new Date(2026, 5, 20))).toBeGreaterThan(20 * 60 + 20);
  });
  test('no feature → no notices; carillon chimes a minute early on weekdays only', () => {
    expect(featureNotice(withFeature(), new Date(2026, 9, 30, 12, 34))).toBeNull();
    const fri = featureNotice(withFeature('carillon_alarm'), new Date(2026, 9, 30, 12, 34));
    expect(fri?.text).toContain('12:35 PM');
    expect(featureNotice(withFeature('carillon_alarm'), new Date(2026, 9, 31, 12, 34))).toBeNull(); // Saturday
    expect(featureNotice(withFeature('carillon_alarm'), new Date(2026, 9, 30, 16, 54))?.key).toBe('carillon:2026-10-30:1015');
  });
  test('hydration every two hours 10–20; bat forecast before dusk (or "probably not tonight")', () => {
    expect(featureNotice(withFeature('hydration_timer'), new Date(2026, 9, 30, 14, 2))?.key).toBe('water:2026-10-30:14');
    expect(featureNotice(withFeature('hydration_timer'), new Date(2026, 9, 30, 15, 2))).toBeNull();
    const d = new Date(2026, 9, 30);
    const sunset = sunsetMinutes(d);
    const at = new Date(2026, 9, 30, Math.floor((sunset - 30) / 60), (sunset - 30) % 60);
    expect(featureNotice(withFeature('bat_forecast'), at)?.text).toMatch(/Bat Forecast/);
    expect(featureNotice(withFeature('bat_forecast'), new Date(2026, 0, 10, Math.floor((sunsetMinutes(new Date(2026, 0, 10)) - 30) / 60), (sunsetMinutes(new Date(2026, 0, 10)) - 30) % 60))?.text).toMatch(/probably not tonight/);
  });
});
