// Piggy 3's favorite drink is sugar-free Red Bull (`red_bull_sf`). Cold brew stays on the menu as an ordinary coffee,
// and saves from before the change (cold brew in the bag, its old "loves" discovery) keep working.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { PIG_IDS, type ChatContext, type PigId, type SaveData } from '../src/lib/types';
import {
  ACHIEVEMENTS, ITEMS, advance, applyAction, checkAchievements, getItem, knownTaste, lovedFoods, newSave, repairSave, shopStock,
  tasteOf,
} from '../src/lib/pet';
import { ITEM_LINES } from '../src/lib/pet/lines';
import { ITEM_ICONS } from '../src/lib/content/icons/items';
import { CHARACTERS } from '../src/lib/content/characters';
import { classifyIntent, respondHeuristic } from '../src/lib/ai/heuristic';
import { FOOD_LABEL } from '../src/lib/ai/heuristic/entities';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { trimPersona } from '../src/lib/ai/prompts';
import { discoveredTaste } from '../src/lib/ui/meta/save-utils';
import { ITEM_IDS as KSCRIPT_ITEM_IDS, validateKScript } from '../src/lib/vn/validate';
import { setClockOffset } from '../src/lib/state/clock';

const H = 3_600_000;
const T = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

beforeAll(() => setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now()));
afterAll(() => setClockOffset(0));

function ctx(pig: PigId): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [],
  };
}

const reply = (pig: PigId, text: string) => respondHeuristic({ pig, playerText: text, history: [], context: ctx(pig) }).text;

describe('the item', () => {
  test('a caffeinated drink like cold brew, sold where cold brew is sold', () => {
    const can = getItem('red_bull_sf')!;
    const brew = getItem('cold_brew')!;
    expect(can).toMatchObject({ name: 'Sugar-Free Red Bull', category: 'drink', caffeine: true, icon: 'red_bull_sf' });
    expect(can.effects.energy).toBe(brew.effects.energy);
    expect(can.price).toBe(brew.price);
    expect(can.shops).toEqual(brew.shops);
    for (const at of [T(2026, 10, 30, 12), T(2026, 10, 30, 23)]) {
      for (const shop of ['reitz', 'midtown'] as const) {
        const ids = shopStock(shop, at).map((i) => i.id);
        expect(ids.includes('red_bull_sf')).toBe(ids.includes('cold_brew'));
      }
    }
  });

  test('Piggy 3 loves it; cold brew is no longer anyone\'s loved drink', () => {
    expect(tasteOf('piggy-3', 'red_bull_sf')).toBe('love');
    expect(lovedFoods('piggy-3')).toContain('red_bull_sf');
    expect(lovedFoods('piggy-3')).not.toContain('cold_brew');
    expect(tasteOf('piggy-3', 'cold_brew')).toBe('like');
    for (const pig of PIG_IDS) expect(tasteOf(pig, 'cold_brew')).not.toBe('love');
    expect(tasteOf('piggy-2', 'red_bull_sf')).toBe('dislike');
  });

  test('feeding it: a loved, caffeinated drink with its own reaction for each pig', () => {
    const s = newSave(T(2026, 10, 28, 12), 'Tester');
    s.companion = 'piggy-3';
    const t = s.lastTick;
    s.inventory.red_bull_sf = 2;
    s.pigs['piggy-3'].needs.energy = 40;
    const r = applyAction(s, 'piggy-3', 'feed', 'red_bull_sf', t);
    expect(r).toMatchObject({ ok: true, taste: 'love', anim: 'drink', line: ITEM_LINES.red_bull_sf['piggy-3'] });
    expect(r.line).toContain('Sugar-free Red Bull');
    expect(s.pigs['piggy-3'].needs.energy).toBeCloseTo(55, 5);
    // a second can within 3 h: jittery, no more energy
    const again = applyAction(s, 'piggy-3', 'feed', 'red_bull_sf', t + 5 * 60_000);
    expect(again.ok).toBe(true);
    expect(s.pigs['piggy-3'].needs.energy).toBeCloseTo(55, 5);
    expect(s.inventory.red_bull_sf).toBeUndefined();
    for (const pig of PIG_IDS) expect(ITEM_LINES.red_bull_sf[pig]?.length).toBeGreaterThan(10);
    expect(ITEM_LINES.red_bull_sf['piggy-2']).toContain('Arrhythmia in a can');
    // Piggy 1's cold brew stays Piggy 1's cold brew
    expect(ITEM_LINES.cold_brew['piggy-1']).toBe("That's not a drink, that's a dare.");
    expect(ITEM_LINES.cold_brew['piggy-3']).not.toMatch(/okay, now i can actually think/i);
  });
});

describe('old saves', () => {
  test('a save holding cold brew (and its old "loves" discovery) still loads, shows today\'s taste and feeds', () => {
    const old = newSave(T(2026, 10, 20, 12), 'Tester');
    old.companion = 'piggy-3';
    old.inventory.cold_brew = 3;
    old.flags['taste.piggy-3.cold_brew'] = 'love';
    old.counters['served.cold_brew'] = 4;
    // through JSON, the way it sits in localStorage
    const s = JSON.parse(JSON.stringify(old)) as SaveData;
    const now = T(2026, 10, 30, 12);
    repairSave(s, now);
    expect(() => advance(s, now, { present: false })).not.toThrow();
    expect(() => checkAchievements(s)).not.toThrow();
    expect(getItem('cold_brew')?.name).toBe('Cold Brew');
    // the bag/shop read today's table, not the stale tier stored with the discovery
    expect(knownTaste(s, 'piggy-3', 'cold_brew')).toBe('like');
    expect(discoveredTaste(s, 'piggy-3', 'cold_brew')).toBe('like');
    expect(knownTaste(s, 'piggy-3', 'red_bull_sf')).toBeNull();
    s.pigs['piggy-3'].asleep = false;
    s.pigs['piggy-3'].needs.hunger = 50;
    const r = applyAction(s, 'piggy-3', 'feed', 'cold_brew', now);
    expect(r).toMatchObject({ ok: true, taste: 'like', consumed: 'cold_brew' });
    expect(s.inventory.cold_brew).toBe(2);
    expect(s.counters['served.cold_brew']).toBe(5);
  });
});

describe('chat (heuristic brain)', () => {
  test('"red bull", "sugar-free red bull", "sugarfree" and "energy drink" mean red_bull_sf', () => {
    const offers = [
      'want a red bull?', 'I brought you a sugar-free Red Bull!', 'here, have an energy drink', 'grab me a redbull',
      'want a sugarfree?', 'i got you a sugar-free', 'have some energy drinks', 'SF Red Bull for you',
    ];
    for (const text of offers) {
      const r = classifyIntent(text, 'piggy-3');
      expect([text, r.intent, r.topic]).toEqual([text, 'food_offer', 'red_bull_sf']);
    }
    expect(classifyIntent('do you like red bull?', 'piggy-3')).toMatchObject({ intent: 'ask_favorite_food', topic: 'red_bull_sf' });
    expect(FOOD_LABEL.red_bull_sf).toBe('sugar-free Red Bull');
  });

  test('coffee still means cold brew, and other "sugar-free" things are not the can', () => {
    for (const text of ['want some coffee?', 'i got you a cold brew', 'iced coffee?', 'latte for you']) {
      expect([text, classifyIntent(text, 'piggy-3').topic]).toEqual([text, 'cold_brew']);
    }
    expect(classifyIntent('i made sugar-free cookies').entities.foods.map((f) => f.id)).not.toContain('red_bull_sf');
    expect(classifyIntent('sugar-free sweet tea?').entities.foods[0]?.id).toBe('sweet_tea');
    expect(classifyIntent('is the tea sugar free?').entities.foods.map((f) => f.id)).toEqual(['sweet_tea']);
    for (const text of ['want some sugarfree gum', 'is it sugar free?', 'i prefer sugar free', 'do you have anything sugar free']) {
      expect([text, classifyIntent(text, 'piggy-3').entities.foods.some((f) => f.id === 'red_bull_sf')]).toEqual([text, false]);
    }
  });

  test('each pig answers the offer in his own voice', () => {
    expect(reply('piggy-3', 'want a red bull?')).toBe('Sugar-free Red Bull! Okay, this is basically fuel for the next three hours. Thank you.');
    expect(reply('piggy-2', 'want a red bull?')).toContain('Arrhythmia in a can.');
    expect(reply('piggy-1', 'want an energy drink?')).toContain('I AM the energy drink');
    expect(reply('piggy-3', 'want some coffee?')).toContain('not my usual');
  });

  test('Piggy 3 names sugar-free Red Bull as his drink and his comfort food; cold brew only comes up as cold brew', () => {
    const bank = (key: string) => LINES['piggy-3'].chat[key].map((l) => l[1]);
    expect(bank('ask_favorite_food:comfort')).toEqual(["Sugar-free Red Bull. Not a food, technically. But it's load-bearing."]);
    for (const text of bank('ask_favorite_food:drink')) expect(text).toStartWith('Sugar-free Red Bull');
    expect(bank('ask_favorite_food').some((t) => /red bull/i.test(t))).toBe(true); // "…2 a.m. coding is sugar-free Red Bull."
    const all: [string, string][] = [];
    for (const section of [LINES['piggy-3'].chat, LINES['piggy-3'].greet]) {
      for (const [key, lines] of Object.entries(section)) for (const l of lines) all.push([key, l[1]]);
    }
    for (const [kind, lines] of Object.entries(LINES['piggy-3'].idle)) {
      for (const l of lines) all.push([`idle.${kind}`, typeof l === 'string' ? l : l[1]]);
    }
    expect(all.filter(([, text]) => /cold brew/i.test(text)).map(([key]) => key)).toEqual(['food_offer:cold_brew']);
    expect(all.filter(([, text]) => /red bull/i.test(text)).length).toBeGreaterThanOrEqual(7);
  });
});

describe('asking a pig what he drinks, and his comfort food', () => {
  const bank = (pig: PigId, key: string) => LINES[pig].chat[key].map((l) => l[1]);
  const asked = (pig: PigId, text: string) => {
    const out = new Set<string>();
    for (let h = 0; h < 12; h++) {
      const history = Array.from({ length: h }, (_, i) => ({ role: i % 2 ? 'pig' as const : 'player' as const, text: `filler ${i}`, at: i }));
      out.add(respondHeuristic({ pig, playerText: text, history, context: ctx(pig) }).text);
    }
    return [...out];
  };

  test('"favorite drink" / "like to drink" get his drink, never a food', () => {
    for (const text of ["what's your favorite drink?", 'what do you like to drink?', 'what do you drink', 'favorite beverage?', 'what do you want to drink?']) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'ask_favorite_food', topic: 'drink' }]);
        for (const r of asked(pig, text)) expect([text, pig, bank(pig, 'ask_favorite_food:drink')]).toEqual([text, pig, expect.arrayContaining([r])]);
      }
    }
    expect(asked('piggy-3', "what's your favorite drink?").every((t) => t.startsWith('Sugar-free Red Bull'))).toBe(true);
    expect(asked('piggy-1', 'what do you like to drink?').some((t) => /Sideline Sip|protein shake/.test(t))).toBe(true);
    expect(asked('piggy-2', 'what do you like to drink?').some((t) => /coffee|sweet tea/i.test(t))).toBe(true);
    // a named drink is still about that drink
    expect(classifyIntent('is red bull your favorite drink?', 'piggy-3')).toMatchObject({ intent: 'ask_favorite_food', topic: 'red_bull_sf' });
  });

  test('"what\'s your comfort food?" gets his own comfort food; "what\'s MY comfort food?" is still about the player', () => {
    for (const text of ["what's your comfort food?", 'do you have a comfort food?', 'What is your favorite comfort food?', "what's ur go-to comfort food"]) {
      for (const pig of PIG_IDS) {
        expect(classifyIntent(text, pig)).toMatchObject({ intent: 'ask_favorite_food', topic: 'comfort' });
        expect([pig, asked(pig, text)]).toEqual([pig, bank(pig, 'ask_favorite_food:comfort')]);
      }
    }
    expect(asked('piggy-3', "what's your comfort food?")).toEqual(["Sugar-free Red Bull. Not a food, technically. But it's load-bearing."]);
    expect(classifyIntent("what's my comfort food?", 'piggy-3').intent).toBe('ask_about_me');
  });

  test('"favorite food" stays food, and "where should we eat?" reaches the restaurant lines', () => {
    for (const pig of PIG_IDS) {
      for (const r of asked(pig, "what's your favorite food?")) expect(bank(pig, 'ask_favorite_food')).toContain(r);
      for (const r of asked(pig, 'where should we eat?')) expect(bank(pig, 'ask_favorite_food:places')).toContain(r);
    }
  });
});

describe('everything else that names the drink', () => {
  test('icon, achievement, KScript item list and the Big Brain persona', () => {
    const icon = ITEM_ICONS.red_bull_sf;
    expect(icon.rows.length).toBe(16);
    for (const row of icon.rows) expect(row.length).toBe(16);
    expect(ACHIEVEMENTS.find((a) => a.id === 'best_for_what')?.icon).toBe('red_bull_sf');
    expect(KSCRIPT_ITEM_IDS).toContain('red_bull_sf');
    expect(KSCRIPT_ITEM_IDS).toContain('cold_brew');
    expect(Object.keys(ITEMS).filter((id) => !(KSCRIPT_ITEM_IDS as readonly string[]).includes(id))).toEqual([]);
    const ks = (line: string) => validateKScript([{ file: 'v.ks', src: `=== v\ntitle: V\npig: piggy-3\n---\n${line}\n` }], { backgrounds: [] })
      .issues.map((i) => i.message);
    expect(ks('[give red_bull_sf 1]')).toEqual([]);
    expect(ks('[give red_bull 1]')[0]).toContain('did you mean "red_bull_sf"?');
    expect(ks('[give energy_drink 1]')[0]).toContain('did you mean "red_bull_sf"?');
    const prompt = CHARACTERS['piggy-3'].prompt;
    expect(prompt.startsWith('You are Piggy 3, a fictional pig character.')).toBe(true);
    expect(trimPersona(prompt, 190)).toContain('Your favorite drink is sugar-free Red Bull.');
    expect(CHARACTERS['piggy-3'].likes).toContain('sugar-free Red Bull');
  });
});
