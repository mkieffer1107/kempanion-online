// Care actions (GAME_DESIGN.md §6): feed, bath/brush, play, pet, rest, wake, medicine, gift, tidy.
// Refusals are short and friendly; a refused action never consumes anything.
import type { CareAction, Expression, NeedId, Needs, PigId, SaveData, SfxId } from '../types';
import { NEED_IDS } from '../types';
import { now as clockNow } from '../state/clock';
import { BOND, CARE, GIFT_BOND, GIFT_FUN, GIFT_MIN_HEARTS, HEALTH, SIM, TASTE_BOND, TASTE_FILL, clamp, type Taste } from './balance';
import { addBondCapped, bondLevel } from './bond';
import { discoverTaste, getItem, isEdible, tasteOf } from './items';
import { GIFT_SPECIAL, ITEM_LINES, LINES, REASONS, SECRET_AGAIN, SECRET_REVEAL, TASTE_LINES } from './lines';
import { line } from './rng';
import { recordSignal } from './signals';
import { cure, fallAsleep, isAsleep, nearBedtime, startNap, wakeUp } from './sim';
import { bool, bump, delFlag, nightOf, num, pk, setFlag, str, today, todayOf } from './state';
import type { CareResult, GameSignal } from './types';

const minuteSeed = (now: number) => Math.floor(now / 60_000);

function say(bank: Record<PigId, readonly string[]>, pig: PigId, now: number, salt = ''): string {
  return line(bank[pig], pig, salt, minuteSeed(now));
}

function refuse(reason: string, extra: Partial<CareResult> = {}): CareResult {
  return { ok: false, reason, sfx: 'ui_error', ...extra };
}

function owned(save: SaveData, id: string): boolean {
  return (save.inventory[id] ?? 0) > 0;
}

function consume(save: SaveData, id: string): void {
  const n = (save.inventory[id] ?? 0) - 1;
  if (n > 0) save.inventory[id] = n;
  else delete save.inventory[id];
}

function addNeed(save: SaveData, pig: PigId, need: NeedId, amount: number): void {
  const p = save.pigs[pig];
  const scaled = need === 'fun' && amount > 0 && p.sick ? amount * HEALTH.sickFunGainMult : amount;
  p.needs[need] = clamp(p.needs[need] + scaled, 0, 100);
}

interface Ctx { save: SaveData; pig: PigId; now: number; needs: Needs; level: number; bond: number }

/** Fill in needsDelta / bondDelta / levelUp, run signals (wants, tasks, achievements). */
function settle(ctx: Ctx, res: CareResult, sig: GameSignal | null): CareResult {
  const { save, pig, now } = ctx;
  if (res.ok && sig) {
    const s = recordSignal(save, sig, now);
    if (s.want) res.wantFulfilled = true;
    if (s.tasks.length) res.tasks = s.tasks;
    if (s.achievements.length) res.achievements = s.achievements;
  }
  const p = save.pigs[pig];
  const delta: Partial<Needs> = {};
  for (const n of NEED_IDS) {
    const d = Math.round(p.needs[n] - ctx.needs[n]);
    if (d) delta[n] = d;
  }
  if (Object.keys(delta).length) res.needsDelta = delta;
  const bondDelta = p.bond - ctx.bond;
  if (bondDelta > 0) res.bondDelta = bondDelta;
  const level = bondLevel(p.bond);
  if (level > ctx.level) res.levelUp = level;
  return res;
}

function careBond(ctx: Ctx, need: NeedId): void {
  if (ctx.needs[need] < BOND.careBelow) addBondCapped(ctx.save, ctx.pig, BOND.care, 'care', ctx.now);
}

const TASTE_EXPRESSION: Record<Taste, Record<PigId, Expression>> = {
  secret: { 'piggy-1': 'flustered_blush', 'piggy-2': 'shy_blush', 'piggy-3': 'affectionate_blush' },
  love: { 'piggy-1': 'excited', 'piggy-2': 'proud', 'piggy-3': 'happy' },
  like: { 'piggy-1': 'happy', 'piggy-2': 'happy', 'piggy-3': 'happy' },
  neutral: { 'piggy-1': 'neutral', 'piggy-2': 'neutral', 'piggy-3': 'neutral' },
  dislike: { 'piggy-1': 'sad', 'piggy-2': 'angry', 'piggy-3': 'confused' },
};

const TASTE_REACT: Record<Taste, Record<PigId, CareResult['reactAnim']>> = {
  secret: { 'piggy-1': 'shy', 'piggy-2': 'shy', 'piggy-3': 'shy' },
  love: { 'piggy-1': 'love', 'piggy-2': 'love', 'piggy-3': 'love' },
  like: { 'piggy-1': 'happy', 'piggy-2': 'happy', 'piggy-3': 'happy' },
  neutral: { 'piggy-1': 'idle', 'piggy-2': 'idle', 'piggy-3': 'idle' },
  dislike: { 'piggy-1': 'sad', 'piggy-2': 'angry', 'piggy-3': 'confused' },
};

function feed(ctx: Ctx, itemId: string | undefined): CareResult {
  const { save, pig, now } = ctx;
  if (!itemId) return refuse(REASONS.needItem);
  const item = getItem(itemId);
  if (!item || !isEdible(item)) return refuse(REASONS.wrongKind);
  if (!item.free && !owned(save, itemId)) return refuse(REASONS.noItem);
  if (isAsleep(save, pig, now)) return refuse(REASONS.asleep, { line: say(LINES.sleepTalk, pig, now), expression: 'sleepy' });
  const p = save.pigs[pig];
  const fullAt = item.category === 'drink' ? CARE.drinkFullAt : CARE.fullAt;
  let betsubara = false;
  if (p.needs.hunger >= fullAt) {
    if (item.dessert && now - num(save, pk(pig, 'dessertAt'), -Infinity) >= CARE.dessertCooldownMs) betsubara = true;
    else return refuse("He's full — he'll save it for later.", { line: say(LINES.full, pig, now), expression: 'happy' });
  }
  const taste = tasteOf(pig, itemId);
  const fx = item.effects;
  if (!item.free) consume(save, itemId);
  addNeed(save, pig, 'hunger', (fx.hunger ?? 0) * TASTE_FILL[taste]);
  let jittery = false;
  if (fx.energy) {
    if (item.caffeine && now - num(save, pk(pig, 'caffeineAt'), -Infinity) < CARE.caffeineCooldownMs) jittery = true;
    else addNeed(save, pig, 'energy', fx.energy);
  }
  if (fx.fun) addNeed(save, pig, 'fun', fx.fun);
  if (fx.health) p.health = clamp(p.health + fx.health, 0, 100);
  if (item.caffeine && !jittery) setFlag(save, pk(pig, 'caffeineAt'), now);
  if (item.dessert) setFlag(save, pk(pig, 'dessertAt'), now);
  if (item.crumbs && save.companion === pig) p.mess = Math.min(SIM.messMax, p.mess + 1);
  p.lastFedAt = now;
  bump(save, 'feeds');
  bump(save, `served.${itemId}`);

  addBondCapped(save, pig, TASTE_BOND[taste], 'food', now);
  careBond(ctx, 'hunger');
  const discovered = discoverTaste(save, pig, itemId);
  let secretRevealed = false;
  if (taste === 'secret' && !bool(save, pk(pig, 'secret'))) {
    setFlag(save, pk(pig, 'secret'), true);
    bump(save, 'secrets_found');
    addBondCapped(save, pig, BOND.discovery, 'discovery', now);
    secretRevealed = true;
  }

  let text: string;
  if (secretRevealed) text = SECRET_REVEAL[pig];
  else if (taste === 'secret') text = say(SECRET_AGAIN, pig, now);
  else if (jittery) text = say(LINES.jittery, pig, now);
  else if (betsubara) text = say(LINES.betsubara, pig, now);
  else text = ITEM_LINES[itemId]?.[pig] ?? say(TASTE_LINES[taste], pig, now, itemId);

  const reactSfx: SfxId = taste === 'secret' ? 'heart' : taste === 'love' ? 'oink_happy' : taste === 'dislike' ? 'oink_sad' : item.category === 'drink' ? 'drink' : 'eat';
  return settle(ctx, {
    ok: true,
    anim: item.category === 'drink' ? 'drink' : 'eat',
    reactAnim: TASTE_REACT[taste][pig],
    expression: TASTE_EXPRESSION[taste][pig],
    sfx: reactSfx,
    line: text,
    taste,
    discovered,
    secretRevealed,
    consumed: item.free ? undefined : itemId,
  }, { kind: 'feed', pig, item: itemId, taste });
}

function clean(ctx: Ctx, itemId: string | undefined): CareResult {
  const { save, pig, now } = ctx;
  if (isAsleep(save, pig, now)) return refuse(REASONS.asleep);
  const p = save.pigs[pig];
  const brushing = itemId === 'brush' || itemId === 'mint_toothpaste';
  if (brushing) {
    if (now - num(save, pk(pig, 'brushAt'), -Infinity) < CARE.brushCooldownMs) return refuse('Teeth already sparkling. Try again later.', { line: say(LINES.brushCooldown, pig, now) });
    const paste = itemId === 'mint_toothpaste';
    if (paste && !owned(save, 'mint_toothpaste')) return refuse(REASONS.noItem);
    if (paste) consume(save, 'mint_toothpaste');
    addNeed(save, pig, 'hygiene', paste ? CARE.toothpasteHygiene : CARE.brushHygiene);
    if (paste) addNeed(save, pig, 'fun', CARE.toothpasteFun);
    setFlag(save, pk(pig, 'brushAt'), now);
    bump(save, 'brushes');
    careBond(ctx, 'hygiene');
    return settle(ctx, {
      ok: true, anim: 'brush_teeth', reactAnim: 'happy', expression: 'happy', sfx: 'brush',
      line: say(LINES.brush, pig, now), consumed: paste ? 'mint_toothpaste' : undefined,
    }, { kind: 'care', pig, action: 'brush' });
  }
  if (itemId && itemId !== 'bath' && itemId !== 'lavender_soap') return refuse(REASONS.wrongKind);
  const soap = itemId === 'lavender_soap';
  if (soap && !owned(save, 'lavender_soap')) return refuse(REASONS.noItem);
  if (now - num(save, pk(pig, 'bathAt'), -Infinity) < CARE.bathCooldownMs) return refuse('Already squeaky clean. Baths have a 3-hour cooldown.', { line: say(LINES.bathCooldown, pig, now) });
  if (soap) {
    consume(save, 'lavender_soap');
    setFlag(save, pk(pig, 'freshUntil'), now + SIM.freshMs);
  }
  p.needs.hygiene = 100;
  addNeed(save, pig, 'fun', CARE.bathFun[pig] + (soap ? CARE.soapFun : 0));
  setFlag(save, pk(pig, 'bathAt'), now);
  bump(save, 'baths');
  careBond(ctx, 'hygiene');
  return settle(ctx, {
    ok: true, anim: 'bath', reactAnim: pig === 'piggy-2' ? 'proud' : 'happy', expression: pig === 'piggy-2' ? 'proud' : 'happy',
    sfx: 'bath', line: say(LINES.bath, pig, now), consumed: soap ? 'lavender_soap' : undefined,
  }, { kind: 'care', pig, action: 'clean' });
}

function play(ctx: Ctx): CareResult {
  const { save, pig, now } = ctx;
  if (isAsleep(save, pig, now)) return refuse(REASONS.asleep);
  const p = save.pigs[pig];
  if (p.needs.energy < CARE.playMinEnergy) return refuse('Too tired to play. A nap would help.', { line: say(LINES.tooTired, pig, now), expression: 'sleepy', anim: 'yawn' });
  for (const [n, v] of Object.entries(CARE.play) as [NeedId, number][]) addNeed(save, pig, n, v);
  p.lastPlayedAt = now;
  bump(save, 'plays');
  careBond(ctx, 'fun');
  return settle(ctx, {
    ok: true, anim: 'play_ball', reactAnim: 'laugh', expression: pig === 'piggy-1' ? 'excited' : 'happy', sfx: 'ball_hit',
    line: say(LINES.play, pig, now),
  }, { kind: 'care', pig, action: 'play' });
}

function pet(ctx: Ctx): CareResult {
  const { save, pig, now } = ctx;
  const p = save.pigs[pig];
  if (isAsleep(save, pig, now)) return { ok: true, expression: 'sleepy', sfx: 'zzz', line: say(LINES.sleepTalk, pig, now) };
  const burstAt = num(save, pk(pig, 'petBurstAt'), -Infinity);
  const burst = now - burstAt <= CARE.petBurstGapMs ? num(save, pk(pig, 'petBurst')) + 1 : 1;
  setFlag(save, pk(pig, 'petBurstAt'), now);
  if (burst >= CARE.petBurstCount) {
    setFlag(save, pk(pig, 'petBurst'), 0);
    return { ok: true, anim: 'angry', expression: 'angry', sfx: 'oink', line: say(LINES.petSpam, pig, now) };
  }
  setFlag(save, pk(pig, 'petBurst'), burst);
  const n = now - p.lastPettedAt > CARE.petWindowMs ? 1 : num(save, pk(pig, 'petN')) + 1;
  setFlag(save, pk(pig, 'petN'), n);
  p.lastPettedAt = now;
  addNeed(save, pig, 'fun', CARE.petFun * Math.pow(CARE.petDecay, n - 1));
  addBondCapped(save, pig, BOND.pet, 'pet', now);
  todayOf(p, now).pets += 1;
  bump(save, 'pets');
  const level = bondLevel(p.bond);
  const tier = level >= 6 ? 'high' : level >= 3 ? 'mid' : 'low';
  const bank = tier === 'high' ? LINES.petHigh : tier === 'mid' ? LINES.petMid : LINES.petLow;
  const expression: Expression = tier === 'high' ? 'loving' : tier === 'mid' ? 'shy' : 'surprised';
  return settle(ctx, {
    ok: true, anim: 'pet_reaction', reactAnim: tier === 'high' ? 'love' : tier === 'mid' ? 'shy' : 'happy',
    expression, sfx: 'pet', line: say(bank, pig, now),
  }, { kind: 'care', pig, action: 'pet' });
}

function rest(ctx: Ctx): CareResult {
  const { save, pig, now } = ctx;
  const p = save.pigs[pig];
  if (p.asleep) return refuse(REASONS.alreadyAsleep);
  if (nearBedtime(pig, now)) {
    fallAsleep(save, pig, now);
    delFlag(save, pk(pig, 'napUntil'));
    addBondCapped(save, pig, BOND.tuck, 'tuck', now);
    bump(save, 'tuck_ins');
    const night = nightOf(now);
    if (str(save, 'pet.tuckNight') !== night) {
      setFlag(save, 'pet.tuckNight', night);
      bump(save, 'tuck_nights');
    }
    return settle(ctx, { ok: true, anim: 'yawn', reactAnim: 'sleep', expression: 'sleepy', sfx: 'zzz', line: say(LINES.tuck, pig, now) },
      { kind: 'care', pig, action: 'tuck' });
  }
  if (p.needs.energy < SIM.napBelow) {
    startNap(save, pig, now);
    return settle(ctx, { ok: true, anim: 'yawn', reactAnim: 'sleep', expression: 'sleepy', sfx: 'zzz', line: say(LINES.nap, pig, now) },
      { kind: 'care', pig, action: 'nap' });
  }
  return refuse("He's not sleepy yet.", { line: say(LINES.notSleepy, pig, now), expression: 'happy' });
}

function wake(ctx: Ctx): CareResult {
  const { save, pig, now } = ctx;
  const p = save.pigs[pig];
  if (!p.asleep) return refuse(REASONS.alreadyAwake);
  const cured = wakeUp(save, pig, now);
  if (nearBedtime(pig, now, 0)) setFlag(save, pk(pig, 'awakeUntil'), now + SIM.wakeGraceMs);
  return settle(ctx, {
    ok: true, anim: 'wake_up', reactAnim: 'idle', expression: 'sleepy', sfx: 'alarm', cured,
    line: cured ? say(LINES.cured, pig, now) : say(LINES.wake, pig, now),
  }, { kind: 'care', pig, action: 'wake' });
}

function medicine(ctx: Ctx, itemId: string | undefined): CareResult {
  const { save, pig, now } = ctx;
  if (!itemId) return refuse(REASONS.needItem);
  const item = getItem(itemId);
  if (!item || item.category !== 'medicine') return refuse(REASONS.wrongKind);
  if (!owned(save, itemId)) return refuse(REASONS.noItem);
  if (isAsleep(save, pig, now)) return refuse(REASONS.asleep);
  const p = save.pigs[pig];
  if (item.effects.cure && !p.sick) return refuse("He isn't sick — keep it for later.", { line: say(LINES.notSick, pig, now), expression: 'happy' });
  consume(save, itemId);
  const fx = item.effects;
  if (fx.hunger) addNeed(save, pig, 'hunger', fx.hunger);
  if (fx.fun) addNeed(save, pig, 'fun', fx.fun);
  if (fx.health) p.health = clamp(p.health + fx.health, 0, 100);
  bump(save, `served.${itemId}`);
  let cured = false;
  if (fx.cure) {
    cured = cure(save, pig, 'medicine');
    if (itemId === 'honey_lemon_tea') startNap(save, pig, now);
  }
  return settle(ctx, {
    ok: true, anim: 'drink', reactAnim: cured ? 'happy' : 'idle', expression: 'happy', sfx: 'medicine', cured, consumed: itemId,
    line: cured ? say(LINES.cured, pig, now) : say(LINES.soothed, pig, now),
  }, { kind: 'care', pig, action: 'medicine' });
}

function gift(ctx: Ctx, itemId: string | undefined): CareResult {
  const { save, pig, now } = ctx;
  if (!itemId) return refuse(REASONS.needItem);
  const item = getItem(itemId);
  if (!item || item.category !== 'gift') return refuse(REASONS.wrongKind);
  if (!owned(save, itemId)) return refuse(REASONS.noItem);
  if (isAsleep(save, pig, now)) return refuse(REASONS.asleep);
  const p = save.pigs[pig];
  if (bondLevel(p.bond) < GIFT_MIN_HEARTS) return refuse(REASONS.giftLocked);
  consume(save, itemId);
  const taste = tasteOf(pig, itemId);
  const t = todayOf(p, now);
  if (t.gifts === 0) addBondCapped(save, pig, GIFT_BOND[taste], 'gift', now);
  t.gifts += 1;
  addNeed(save, pig, 'fun', GIFT_FUN[taste]);
  const discovered = discoverTaste(save, pig, itemId);
  bump(save, 'gifts');
  const bank = taste === 'love' || taste === 'secret' ? LINES.giftLove : taste === 'like' ? LINES.giftLike : LINES.giftNeutral;
  const special = GIFT_SPECIAL[itemId]?.[pig];
  const sticker = itemId === 'comic_sans_stickers' && pig === 'piggy-3';
  return settle(ctx, {
    ok: true, anim: 'surprised', reactAnim: sticker ? 'shy' : TASTE_REACT[taste][pig] === 'idle' ? 'happy' : TASTE_REACT[taste][pig],
    expression: sticker ? 'bashful_smile' : taste === 'love' ? 'loving' : taste === 'like' ? 'happy' : 'surprised',
    sfx: 'gift', line: special ?? say(bank, pig, now), taste, discovered, consumed: itemId,
  }, { kind: 'gift', pig, item: itemId, taste });
}

function tidy(ctx: Ctx): CareResult {
  const { save, pig, now } = ctx;
  const p = save.pigs[pig];
  if (p.mess <= 0) return refuse(REASONS.noMess);
  const n = p.mess;
  p.mess = 0;
  addNeed(save, pig, 'hygiene', CARE.tidyHygienePerMess * n);
  bump(save, 'tidies');
  return settle(ctx, { ok: true, anim: 'happy', expression: 'happy', sfx: 'tidy', line: say(LINES.tidy, pig, now) },
    { kind: 'care', pig, action: 'tidy' });
}

const COMPANION_ONLY: readonly CareAction[] = ['clean', 'sleep', 'wake', 'play', 'medicine', 'tidy'];

/**
 * Apply a care action. Mutates save (needs, inventory, bond through the daily caps, counters, tasks, wants).
 * Feed, pet and gift work on any pig; the rest only on your Kempanion.
 * For clean: itemId undefined/'bath'/'lavender_soap' = bath, 'brush'/'mint_toothpaste' = brush teeth.
 */
export function applyAction(save: SaveData, pig: PigId, action: CareAction, itemId?: string, now: number = clockNow()): CareResult {
  const p = save.pigs[pig];
  if (!p) return refuse(REASONS.wrongKind);
  if (COMPANION_ONLY.includes(action)) {
    if (!save.companion) return refuse(REASONS.noCompanion);
    if (save.companion !== pig) return refuse(REASONS.notCompanion);
  }
  todayOf(p, now);
  const ctx: Ctx = { save, pig, now, needs: { ...p.needs }, level: bondLevel(p.bond), bond: p.bond };
  switch (action) {
    case 'feed': return feed(ctx, itemId);
    case 'clean': return clean(ctx, itemId);
    case 'play': return play(ctx);
    case 'pet': return pet(ctx);
    case 'sleep': return rest(ctx);
    case 'wake': return wake(ctx);
    case 'medicine': return medicine(ctx, itemId);
    case 'gift': return gift(ctx, itemId);
    case 'tidy': return tidy(ctx);
    default: return refuse(REASONS.wrongKind);
  }
}

/** Can Piggy 2 do Doctor's Rounds on your sick Kempanion right now (♥4+, once per illness)? */
export function canDoctorsRounds(save: SaveData): { ok: boolean; reason?: string } {
  const comp = save.companion;
  if (!comp || !save.pigs[comp].sick) return { ok: false, reason: REASONS.sickNoRounds };
  if (comp === 'piggy-2') return { ok: false, reason: "He can't do rounds on himself. \"Physician, heal thyself\" is not based." };
  if (bondLevel(save.pigs['piggy-2'].bond) < HEALTH.doctorRoundsHearts) return { ok: false, reason: "Doctor's Rounds unlocks at ♥4 with Piggy 2." };
  if (bool(save, pk(comp, 'rounds'))) return { ok: false, reason: 'Piggy 2 already checked on him for this one.' };
  return { ok: true };
}

/** Doctor's Rounds: Piggy 2 (♥4+) checks your sick Kempanion (neuro_exam → write_chart) — instant cure. */
export function doctorsRounds(save: SaveData, now: number = clockNow()): CareResult {
  const can = canDoctorsRounds(save);
  if (!can.ok) return refuse(can.reason ?? REASONS.sickNoRounds);
  const comp = save.companion as PigId;
  setFlag(save, pk(comp, 'rounds'), true);
  cure(save, comp, 'rounds');
  return {
    ok: true, anim: 'neuro_exam', reactAnim: 'write_chart', expression: 'proud', sfx: 'medicine', cured: true,
    line: "Pupils equal and reactive. Perfusion's great. Prescribing soup. Based.",
    achievements: recordSignal(save, { kind: 'care', pig: comp, action: 'medicine' }, now).achievements,
  };
}

/** Shands pharmacy: one free check-up per day cures your sick Kempanion. */
export function freeCheckup(save: SaveData, now: number = clockNow()): CareResult {
  const comp = save.companion;
  if (!comp) return refuse(REASONS.noCompanion);
  const d = today(now);
  if (str(save, pk(comp, 'pharmacy')) === d) return refuse('The free check-up is once a day. The pharmacy still sells medicine!');
  if (!save.pigs[comp].sick) return { ok: true, expression: 'happy', line: 'The pharmacist says: clean bill of health. Drink water anyway.' };
  setFlag(save, pk(comp, 'pharmacy'), d);
  cure(save, comp, 'pharmacy');
  return {
    ok: true, anim: 'happy', expression: 'happy', sfx: 'medicine', cured: true,
    line: "The nurse said I'm fine. She also said, quote, \"drink water, goober.\"",
    achievements: recordSignal(save, { kind: 'care', pig: comp, action: 'medicine' }, now).achievements,
  };
}
