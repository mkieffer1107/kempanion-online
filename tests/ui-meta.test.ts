// Pure helpers behind the front door and meta screens (src/lib/ui/meta). No DOM, no runes.
import { describe, expect, test } from 'bun:test';
import { PIG_IDS, type SaveData } from '../src/lib/types';
import { newSave, secretFavorite } from '../src/lib/pet';
import {
  CASHIER, CREDITS, INTAKE_REACTION, MOVING_GAG, NAME_MAX, SECRET_FAVORITE, SHOPS, SLEEP, WHY_UF,
  applyIntake, cleanText, fill, isPorkFood, pickReactions,
} from '../src/lib/ui/meta/content';
import {
  actionForItem, cashierFor, continueSummary, dayNumber, effectSummary, hashString, humanizeFact,
  isMeaningfulSave, outfitUnlocked, secretFound, shopTabOf, switchedToday, SWITCH_FLAG,
} from '../src/lib/ui/meta/save-utils';
import { pauseAfter, VOICE_CPS } from '../src/lib/ui/meta/typing';
import { sakuraSnout, EMBLEM_PALETTE } from '../src/lib/ui/meta/emblem';
import { GLYPHS, glyphRuns, glyphSize } from '../src/lib/ui/meta/glyphs';

const T0 = Date.parse('2026-10-30T15:42:00');
const fresh = (): SaveData => newSave(T0);

describe('intake form (GAME_DESIGN §3)', () => {
  test('bond bonuses per answer', () => {
    expect(applyIntake({ name: 'Sam', whyUf: 'computing', sleep: 'early', comfortFood: '' }).bonds)
      .toEqual({ 'piggy-1': 50, 'piggy-2': 0, 'piggy-3': 0 });
    expect(applyIntake({ name: 'Sam', whyUf: 'medicine', sleep: 'nosleep', comfortFood: '' }).bonds)
      .toEqual({ 'piggy-1': 0, 'piggy-2': 50, 'piggy-3': 0 });
    expect(applyIntake({ name: 'Sam', whyUf: 'physics', sleep: 'night', comfortFood: '' }).bonds)
      .toEqual({ 'piggy-1': 0, 'piggy-2': 0, 'piggy-3': 50 });
    expect(applyIntake({ name: 'Sam', whyUf: 'arts', sleep: 'night', comfortFood: '' }).bonds)
      .toEqual({ 'piggy-1': 0, 'piggy-2': 0, 'piggy-3': 20 });
    expect(applyIntake({ name: 'Sam', whyUf: 'undecided', sleep: 'early', comfortFood: '' }).bonds)
      .toEqual({ 'piggy-1': 20, 'piggy-2': 0, 'piggy-3': 0 });
  });

  test('facts use the KScript [input] key=value shape; comfort food defaults to muffin', () => {
    const r = applyIntake({ name: 'Riley', whyUf: 'medicine', sleep: 'nosleep', comfortFood: '  ' });
    expect(r.facts).toEqual(['why_uf=Medicine & Life Sciences', "sleep=What's sleep?", 'comfort_food=muffin']);
    expect(r.flags).toEqual({
      'fact.why_uf': 'Medicine & Life Sciences', 'fact.sleep': "What's sleep?", 'fact.comfort_food': 'muffin',
      'intake.why_uf': 'medicine', 'intake.sleep': 'nosleep',
    });
    expect(applyIntake({ name: 'R', whyUf: 'arts', sleep: 'early', comfortFood: 'miso ramen' }).comfortFood).toBe('miso ramen');
  });

  test('names are cleaned and capped at 12 characters', () => {
    expect(applyIntake({ name: '  Alexandria Ocasio  ', whyUf: 'arts', sleep: 'early', comfortFood: '' }).name).toBe('Alexandria O');
    expect(applyIntake({ name: '<b>Sam\u0007</b>', whyUf: 'arts', sleep: 'early', comfortFood: '' }).name).toBe('bSam/b');
    expect(applyIntake({ name: '   ', whyUf: 'arts', sleep: 'early', comfortFood: '' }).name).toBe('You');
    expect(cleanText('ケンパニオン・オンライン!!', NAME_MAX)).toBe('ケンパニオン・オンライン');
    expect(NAME_MAX).toBe(12);
  });

  test('no pork food, ever: it is swapped for soup', () => {
    for (const f of ['bacon', 'Ham sandwich', 'pulled pork', 'pepperoni pizza', 'hot dogs', 'tonkatsu']) {
      expect(isPorkFood(f)).toBe(true);
      const r = applyIntake({ name: 'A', whyUf: 'arts', sleep: 'early', comfortFood: f });
      expect(r.porkSwap).toBe(true);
      expect(r.comfortFood).toBe('soup');
    }
    for (const f of ['hamburger', 'shampoo', 'chicken soup', 'graham crackers', 'veggie ramen']) expect(isPorkFood(f)).toBe(false);
  });

  test('options and reactions line up', () => {
    expect(WHY_UF).toHaveLength(5);
    expect(SLEEP.map((s) => s.id)).toEqual(['early', 'night', 'nosleep']);
    for (const w of WHY_UF) expect(INTAKE_REACTION.why[w.id].text.length).toBeGreaterThan(0);
    expect(INTAKE_REACTION.sleep.nosleep.speaker).toBe('piggy-2');
  });
});

describe('copy', () => {
  test('pick reactions: chosen pig first, then the other two', () => {
    const lines = pickReactions('piggy-2');
    expect(lines.map((l) => l.speaker)).toEqual(['piggy-2', 'piggy-1', 'piggy-3']);
    expect(lines[0].text).toContain('Patient accepted');
    expect(lines[0].expression).toBe('proud');
  });

  test('moving gag is three lines ending with the new pig', () => {
    for (const p of PIG_IDS) {
      expect(MOVING_GAG[p]).toHaveLength(3);
      expect(MOVING_GAG[p][2].speaker).toBe(p);
    }
  });

  test('secret favorites match the pet module', () => {
    for (const p of PIG_IDS) expect(SECRET_FAVORITE[p].item).toBe(secretFavorite(p));
  });

  test('credits carry the required lines', () => {
    const all = CREDITS.flatMap((b) => [b.heading ?? '', ...b.lines]).join('\n');
    expect(all).toContain('KEMPANION ONLINE');
    expect(all).toContain('Kempa Synth');
    expect(all).toContain('Rust → WebAssembly');
    expect(all).toContain('Transformers.js + ONNX Runtime Web');
    expect(all).toContain('DotGothic16');
    expect(all).toContain('Pixelify Sans');
    expect(all).toContain('SIL Open Font License');
    expect(all).toContain('Pixel art generated for Kempa AI');
    expect(all).toContain('not affiliated with or endorsed by the University of Florida');
  });

  test('content rules: nothing off-limits in the meta copy', () => {
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v.toLowerCase());
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk({ CASHIER, CREDITS, MOVING_GAG, SECRET_FAVORITE, INTAKE_REACTION, SHOPS });
    const text = strings.join('\n');
    for (const banned of ['krishna', 'gator bait', 'albert', 'bacon', 'pork', 'ham ']) expect(text).not.toContain(banned);
  });

  test('fill() replaces known placeholders only', () => {
    expect(fill('{price} acorns for {item}. {nope}', { price: 12, item: 'Onigiri' })).toBe('12 acorns for Onigiri. {nope}');
  });
});

describe('typewriter timing', () => {
  test('punctuation pauses', () => {
    expect(pauseAfter(',', ' ')).toBe(120);
    expect(pauseAfter('.', ' ')).toBe(250);
    expect(pauseAfter('!', undefined)).toBe(250);
    expect(pauseAfter('?', '"')).toBe(250);
    expect(pauseAfter('—', 'a')).toBe(180);
    expect(pauseAfter('…', ' ')).toBe(450);
    expect(pauseAfter('.', '5')).toBe(0); // "3.5"
    expect(pauseAfter('.', '.')).toBe(150); // "..."
    expect(pauseAfter('a', ' ')).toBe(0);
  });

  test('per-pig speeds at Normal', () => {
    expect([VOICE_CPS['piggy-1'], VOICE_CPS['piggy-2'], VOICE_CPS['piggy-3']]).toEqual([45, 35, 32]);
  });
});

describe('save helpers', () => {
  test('Continue needs completed intake, not just settings, a name, or partial story progress', () => {
    const s = fresh();
    expect(isMeaningfulSave(s, false)).toBe(false);
    expect(isMeaningfulSave(s, true)).toBe(false);
    s.player.name = 'Sam';
    expect(isMeaningfulSave(s, true)).toBe(false);
    s.flags['intake.why_uf'] = 'computing';
    s.flags['intake.sleep'] = 'early';
    s.seenScenes.push('some_scene');
    expect(isMeaningfulSave(s, true)).toBe(false);
    s.flags['intake.done'] = true;
    expect(isMeaningfulSave(s, true)).toBe(true);
    expect(isMeaningfulSave(s, false)).toBe(false);
    expect(continueSummary(s, T0)).toBe('Introduction · Sam');
    const t = fresh();
    t.companion = 'piggy-3';
    expect(isMeaningfulSave(t, true)).toBe(true);
  });

  test('day number: days_played counter, else calendar days', () => {
    const s = fresh();
    expect(dayNumber(s, T0)).toBe(1);
    expect(dayNumber(s, T0 + 3 * 86_400_000)).toBe(4);
    s.counters.days_played = 12;
    expect(dayNumber(s, T0)).toBe(12);
    s.location = 'malachowsky';
    s.lastTick = T0;
    expect(continueSummary(s, T0)).toBe('Day 12 · Malachowsky Hall · Fri 3:42 PM');
  });

  test('cashier is deterministic by date; the pharmacy is always Piggy 2', () => {
    expect(cashierFor('reitz', '2026-10-30')).toBe(cashierFor('reitz', '2026-10-30'));
    expect(cashierFor('shands', '2026-10-30')).toBe('piggy-2');
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) seen.add(cashierFor('reitz', `2026-11-${String(d).padStart(2, '0')}`));
    expect(seen.size).toBe(3);
    expect(hashString('abc')).toBe(hashString('abc'));
  });

  test('switch once per day', () => {
    const s = fresh();
    expect(switchedToday(s, '2026-10-30')).toBe(false);
    s.flags[SWITCH_FLAG] = '2026-10-30';
    expect(switchedToday(s, '2026-10-30')).toBe(true);
    expect(switchedToday(s, '2026-10-31')).toBe(false);
  });

  test('item tabs and actions', () => {
    expect(shopTabOf({ category: 'drink' })).toBe('drinks');
    expect(shopTabOf({ category: 'medicine' })).toBe('care');
    expect(shopTabOf({ category: 'key' })).toBe('key');
    expect(actionForItem({ category: 'food', effects: {} })).toBe('feed');
    expect(actionForItem({ category: 'medicine', effects: { cure: true } })).toBe('medicine');
    expect(actionForItem({ category: 'care', effects: { hygiene: 20 } })).toBe('clean');
    expect(actionForItem({ category: 'care', effects: { fun: 8 } })).toBe('clean'); // lavender soap = bath
    expect(actionForItem({ category: 'gift', effects: {} })).toBe('gift');
    expect(actionForItem({ category: 'key', effects: {} })).toBe(null);
    expect(effectSummary({ effects: { hunger: 30, energy: 20, cure: true } })).toEqual(['TUMMY +30', 'ENERGY +20', 'CURES COLDS']);
  });

  test('memory facts read nicely', () => {
    expect(humanizeFact('comfort_food=miso ramen')).toBe('Comfort food: miso ramen');
    expect(humanizeFact('why_uf=Computing')).toBe('What brings you to UF: Computing');
    expect(humanizeFact('fav_color=teal')).toBe('Fav color: teal');
    expect(humanizeFact("Player's major is biology.")).toBe("Player's major is biology.");
  });

  test('secret favorite discovery reads the pet flags', () => {
    const s = fresh();
    expect(secretFound(s, 'piggy-1')).toBe(false);
    s.flags['pet.piggy-1.secret'] = true;
    expect(secretFound(s, 'piggy-1')).toBe(true);
  });

  test('alt outfits unlock at ♥3 (or when worn)', () => {
    const s = fresh();
    expect(outfitUnlocked(s, 'piggy-2', 'everyday')).toBe(true);
    expect(outfitUnlocked(s, 'piggy-2', 'scrubs')).toBe(false);
    s.pigs['piggy-2'].bond = 300;
    expect(outfitUnlocked(s, 'piggy-2', 'scrubs')).toBe(true);
  });
});

describe('pixel art', () => {
  test('sakura-snout emblem', () => {
    const rows = sakuraSnout(21);
    expect(rows).toHaveLength(21);
    for (const r of rows) expect(r).toHaveLength(21);
    const all = rows.join('');
    expect((all.match(/n/g) ?? []).length).toBe(2); // two nostrils
    for (const ch of new Set(all.replace(/\./g, ''))) expect(EMBLEM_PALETTE[ch]).toBeTruthy();
    // left/right mirror symmetry within a pixel of tolerance on the silhouette
    const filled = rows.map((r) => [...r].map((c) => c !== '.'));
    let asym = 0;
    for (const r of filled) for (let x = 0; x < 21; x++) if (r[x] !== r[20 - x]) asym++;
    expect(asym).toBeLessThan(21);
  });

  test('glyph runs merge horizontal pixels', () => {
    const runs = glyphRuns({ rows: ['xx.x', 'aaaa'], palette: { a: '#fff' } });
    expect(runs).toEqual([
      { x: 0, y: 0, w: 2, fill: 'currentColor' },
      { x: 3, y: 0, w: 1, fill: 'currentColor' },
      { x: 0, y: 1, w: 4, fill: '#fff' },
    ]);
    for (const g of Object.values(GLYPHS)) {
      const { w } = glyphSize(g);
      for (const r of g.rows) expect(r.length).toBe(w);
    }
  });
});
