// One entry point for "something happened": chat bond, quirk achievements, wants and daily tasks.
import type { PigId, SaveData } from '../types';
import { scheduleSlot } from '../content/locations';
import { BOND, clamp } from './balance';
import { checkAchievements } from './achievements';
import { addBondCapped } from './bond';
import { progressTasks } from './daily';
import { bump, json, setJson, todayOf } from './state';
import type { Achievement, DailyTask, GameSignal } from './types';
import { fulfillWant, type WantResult } from './wants';

export interface SignalResult {
  /** Bond actually added (chat exchange + want). */
  bond: number;
  fun: number;
  tasks: DailyTask[];
  achievements: Achievement[];
  want: WantResult | null;
  /** Bond for task completions is reported per task. */
}

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** "based" as praise, not "based on …" (same rule as the chat quirk). */
export function saysBased(text: string): boolean {
  return /\bbased\b(?!\s+(on|upon|off|in)\b)/i.test(text);
}

function callAndResponse(save: SaveData, text: string, now: number): void {
  const word = norm(text);
  const steps = ['bump', 'set', 'spike'];
  const prev = json<{ step: number; at: number }>(save, 'pet.call');
  const fresh = prev && now - prev.at < 10 * 60_000 ? prev.step : 0;
  const idx = steps.indexOf(word);
  if (idx < 0) return;
  const next = idx === 0 ? 1 : idx === fresh ? fresh + 1 : 0;
  if (next === 3) {
    bump(save, 'set_spike');
    setJson(save, 'pet.call', { step: 0, at: now });
  } else setJson(save, 'pet.call', { step: next, at: now });
}

function chatQuirks(save: SaveData, pig: PigId, text: string, now: number): void {
  if (pig === 'piggy-2' && saysBased(text)) bump(save, 'said_based');
  if (pig === 'piggy-3' && /\bbest\b/i.test(text)) bump(save, 'asked_best');
  if (pig === 'piggy-3' && /\bcodex\b/i.test(text)) bump(save, 'asked_codex');
  if (pig === 'piggy-1') callAndResponse(save, text, now);
  if (pig === 'piggy-2' && new Date(now).getHours() < 6) bump(save, 'early_rounds');
}

function wantFor(save: SaveData, sig: GameSignal, now: number): WantResult | null {
  const comp = save.companion;
  if (!comp) return null;
  switch (sig.kind) {
    case 'feed':
      return sig.pig === comp ? fulfillWant(save, comp, 'food', sig.item, now) : null;
    case 'care':
      if (sig.pig !== comp) return null;
      if (sig.action === 'play') return fulfillWant(save, comp, 'activity', 'play', now);
      if (sig.action === 'clean') return fulfillWant(save, comp, 'activity', 'bath', now);
      if (sig.action === 'pet') return fulfillWant(save, comp, 'activity', 'pet', now);
      return null;
    case 'minigame':
      return fulfillWant(save, comp, 'activity', `minigame:${sig.id}`, now);
    case 'visit':
      return fulfillWant(save, comp, 'place', sig.location, now);
    case 'chat':
      return sig.pig === comp ? fulfillWant(save, comp, 'talk', 'any', now) : null;
    default:
      return null;
  }
}

/**
 * Report a game event. 'chat' (one free-chat exchange, after the reply) and 'visit' (arrival at a location)
 * come from the UI/VN; the pet module reports care, feeding, gifts, mini-games, petals, omikuji and purchases.
 * Chat: +2 bond (+1 when on-topic; ×1.25 for the companion) through the daily talk cap.
 */
export function recordSignal(save: SaveData, sig: GameSignal, now: number): SignalResult {
  let bond = 0;
  let fun = 0;
  if (sig.kind === 'chat') {
    const p = save.pigs[sig.pig];
    const mult = save.companion === sig.pig ? BOND.companionTalkMult : 1;
    bond += addBondCapped(save, sig.pig, Math.round((BOND.talk + (sig.topicMatch ? BOND.talkTopic : 0)) * mult), 'talk', now);
    p.lastTalkedAt = now;
    todayOf(p, now).talks += 1;
    bump(save, 'chats');
    if (save.companion === sig.pig && !p.asleep) {
      const before = p.needs.fun;
      p.needs.fun = clamp(before + (p.sick ? 1.5 : 3), 0, 100);
      fun += p.needs.fun - before;
    }
    chatQuirks(save, sig.pig, sig.text, now);
  } else if (sig.kind === 'visit') {
    bump(save, `visits.${sig.location}`);
    const slot = scheduleSlot(new Date(now));
    if (sig.location === 'lake_alice' && slot === 'dusk') bump(save, 'bat_signal');
    if (sig.present?.includes('piggy-2') && new Date(now).getHours() < 6) bump(save, 'early_rounds');
  }
  const want = wantFor(save, sig, now);
  if (want) {
    bond += want.bond;
    fun += want.fun;
  }
  const tasks = progressTasks(save, sig, now);
  const achievements = checkAchievements(save);
  return { bond, fun, tasks, achievements, want };
}
