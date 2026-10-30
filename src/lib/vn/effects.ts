// Save helpers shared by the scene runner and free chat. Bond, chat scoring and mini-game rewards go
// through the pet module (daily caps, heart gate, tasks, achievements); this adds level-up celebrations.
import { addBondCapped, applyMinigameResult, bondLevel, chapter, recordSignal, type SignalResult } from '../pet';
import { PIG_IDS, type PigId, type SaveData } from '../types';
import type { MinigameId, MinigameResult } from '../minigames';
import { game } from '../state/game.svelte';
import { now } from '../state/clock';
import { vnHooks } from './hooks';
import { isPorkFood, swapPork } from '../ui/meta/content';

/** Story chapter 1–4 (distinct days played; see pet chapter()). */
export function storyChapter(save: SaveData): number {
  return chapter(save);
}

function celebrate(pig: PigId, levelBefore: number) {
  const after = bondLevel(game.save.pigs[pig].bond);
  if (after > levelBefore) game.events.push({ kind: 'bond_level', pig, level: after });
}

/**
 * Story bond from [bond pig ±n]: heart events ('event') are uncapped; other scenes ('scene') skip the daily
 * caps but respect the heart gate. Negative amounts go straight to the store. Returns the amount applied.
 */
export function addStoryBond(pig: PigId, amount: number, source: 'event' | 'scene'): number {
  if (!amount) return 0;
  if (amount < 0) {
    game.addBond(pig, amount);
    return amount;
  }
  const before = bondLevel(game.save.pigs[pig].bond);
  const added = addBondCapped(game.save, pig, amount, source, now());
  celebrate(pig, before);
  game.persist();
  return added;
}

/** Score one free-chat exchange (bond through the talk cap, fun, quirk counters, wants, tasks, achievements). */
export function scoreChat(pig: PigId, playerText: string, topicMatch: boolean): SignalResult {
  const before = bondLevel(game.save.pigs[pig].bond);
  const result = recordSignal(game.save, { kind: 'chat', pig, text: playerText, topicMatch }, now());
  celebrate(pig, before);
  game.persist();
  vnHooks.onSignal?.(result);
  return result;
}

/** Apply a mini-game result's rewards from a scene ([minigame id]). */
export function applyMinigame(id: MinigameId, pig: PigId, result: MinigameResult): void {
  const before = bondLevel(game.save.pigs[pig].bond);
  const applied = applyMinigameResult(game.save, pig, { ...result, id }, now());
  if (applied.money > 0) game.events.push({ kind: 'money', amount: applied.money });
  celebrate(pig, before);
  game.persist();
  vnHooks.onSignal?.({ bond: applied.bond, fun: result.fun, tasks: applied.tasks, achievements: applied.achievements, want: null });
}

// ── facts ([input key "prompt"] answers and {fact:key} lookups) ──

const factFlag = (key: string) => `fact.${key}`;

/** Store a fact answer: flags['fact.<key>'] plus a "key=value" memory for `pig` (or every pig).
 *  No pork food, ever: a pork comfort food is flagged as plain `bacon` (the prologue's "Not based." check) and
 *  remembered as soup; pork words in any other answer become a banana. */
export function setFact(key: string, value: string, pig?: PigId): void {
  let remembered = value;
  if (isPorkFood(value)) {
    if (key === 'comfort_food') {
      game.setFlag(factFlag(key), 'bacon');
      remembered = 'soup';
    } else {
      value = remembered = swapPork(value);
    }
  }
  if (remembered === value) game.setFlag(factFlag(key), value);
  for (const p of pig ? [pig] : PIG_IDS) {
    const list = game.save.memories[p];
    const prefix = `${key}=`;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].startsWith(prefix)) list.splice(i, 1);
    game.remember(p, `${key}=${remembered}`);
  }
}

/** A remembered fact: flags['fact.<key>'], then a plain string/number flag `key`, then any pig's "key=value" memory. */
export function factOf(key: string): string | undefined {
  const flags = game.save.flags;
  const direct = flags[factFlag(key)] ?? flags[key];
  if (typeof direct === 'string' || typeof direct === 'number') return String(direct);
  const prefix = `${key}=`;
  for (const p of PIG_IDS) {
    const hit = game.save.memories[p].find((m) => m.startsWith(prefix));
    if (hit) return hit.slice(prefix.length);
  }
  return undefined;
}
