// Dailies (GAME_DESIGN.md §8): days played & chapters, login stamps, omikuji, daily tasks, acorn earnings.
import type { PigId, SaveData } from '../types';
import { scheduleSlot } from '../content/locations';
import { GREAT_BLESSING_MULT, OMIKUJI, STAMPS, TASKS, type OmikujiId } from './balance';
import { addBondCapped, chapter } from './bond';
import { getItem, lovedFoods } from './items';
import { rngFor, shuffle, weighted } from './rng';
import { bool, bump, counter, delFlag, json, setFlag, setJson, str, today, todayOf } from './state';
import { now as clockNow } from '../state/clock';
import type { DailyTask, GameSignal } from './types';

// ── days played & chapters ──

/** Saturdays from September through November are game days (Go Gators!). */
export function isGameDay(now: number): boolean {
  const d = new Date(now);
  const m = d.getMonth();
  return d.getDay() === 6 && m >= 8 && m <= 10;
}

/**
 * Count a distinct local day of play (counters.days_played, flag pet.lastDay). Call on load and on each tick;
 * it is a no-op within the same day. Chapters follow from it.
 */
export function recordDayPlayed(save: SaveData, now: number): { newDay: boolean; days: number; chapter: number } {
  const d = today(now);
  if (str(save, 'pet.lastDay') !== d) {
    setFlag(save, 'pet.lastDay', d);
    bump(save, 'days_played');
    if (isGameDay(now)) bump(save, 'gameday_days');
    return { newDay: true, days: counter(save, 'days_played'), chapter: chapter(save) };
  }
  return { newDay: false, days: counter(save, 'days_played'), chapter: chapter(save) };
}

// ── omikuji ──

export interface OmikujiSlip {
  id: OmikujiId;
  name: string;
  jp: string;
  /** The fortune, in a slightly over-serious voice. */
  text: string;
  /** What it does, plainly. */
  effect: string;
  /** Drawn just now (false = already drawn today; same slip). */
  fresh: boolean;
  date: string;
}

const SLIPS: Record<OmikujiId, Omit<OmikujiSlip, 'fresh' | 'date' | 'id'>> = {
  great: {
    name: 'Great Blessing', jp: '大吉',
    text: 'Acorns fall in your favor. Even the squirrels are impressed.',
    effect: '+25% acorns from tasks, petals and mini-games today.',
  },
  blessing: {
    name: 'Blessing', jp: '吉',
    text: 'First tries are lucky today. Swing at the first serve.',
    effect: "Each mini-game's first run today pays ×3 instead of ×2.",
  },
  small: {
    name: 'Small Blessing', jp: '小吉',
    text: 'A small kindness at the register awaits.',
    effect: 'Your next purchase today: one item at half price.',
  },
  future: {
    name: 'Future Blessing', jp: '末吉',
    text: 'Tie this slip to the branch. Tomorrow remembers.',
    effect: 'Your next login stamp is doubled.',
  },
};

function slipFrom(id: OmikujiId, date: string, fresh: boolean): OmikujiSlip {
  return { id, date, fresh, ...SLIPS[id] };
}

/** Today's slip if already drawn. */
export function omikujiToday(save: SaveData, now: number): OmikujiId | null {
  const [d, id] = str(save, 'pet.omikuji').split('|');
  return d === today(now) && id ? (id as OmikujiId) : null;
}

/** Deterministic per date (and save): drawing again the same day returns the same slip without re-applying it. */
export function omikujiFor(save: SaveData, now: number): OmikujiId {
  return weighted(rngFor('omikuji', today(now), save.createdAt), OMIKUJI).id;
}

/** Draw today's omikuji at the Century Tower sakura (once per day, never bad luck). */
export function rollOmikuji(save: SaveData, now: number): OmikujiSlip & { tasks: DailyTask[] } {
  const date = today(now);
  const had = omikujiToday(save, now);
  if (had) return { ...slipFrom(had, date, false), tasks: [] };
  const id = omikujiFor(save, now);
  setFlag(save, 'pet.omikuji', `${date}|${id}`);
  bump(save, 'omikuji');
  if (id === 'future') setFlag(save, 'pet.stampDouble', true);
  if (id === 'small') setFlag(save, 'pet.halfPrice', date);
  const tasks = progressTasks(save, { kind: 'omikuji' }, now);
  return { ...slipFrom(id, date, true), tasks };
}

/** Multiplier for acorn earnings today (Great Blessing). */
export function acornMultiplier(save: SaveData, now: number): number {
  return omikujiToday(save, now) === 'great' ? GREAT_BLESSING_MULT : 1;
}

/** Apply today's earnings multiplier to a base amount. */
export function earn(save: SaveData, base: number, now: number): number {
  return Math.round(base * acornMultiplier(save, now));
}

// ── login stamps ──

export interface StampInfo {
  /** Stamps on the current card (0–6 before claiming today's). */
  onCard: number;
  /** Stamp number (1–7) the next claim gives. */
  next: number;
  cards: number;
  claimedToday: boolean;
  doubled: boolean;
}

export function stampCard(save: SaveData, now: number): StampInfo {
  const total = counter(save, 'stamps');
  return {
    onCard: total % STAMPS.length,
    next: (total % STAMPS.length) + 1,
    cards: Math.floor(total / STAMPS.length),
    claimedToday: save.lastDaily === today(now),
    doubled: bool(save, 'pet.stampDouble'),
  };
}

export interface DailyClaim {
  money: number;
  /** Lifetime stamps (pauses on missed days, never resets). Mirrors save.streak. */
  streak: number;
  item?: string;
  /** Stamp number 1–7 just earned. */
  stamp: number;
  doubled: boolean;
  /** 7th stamp: the group scene is ready (flag `stamp_party_ready`). */
  scene: boolean;
}

/**
 * Claim today's login stamp (7-stamp card: 30, 40+item, 50, 60, 70+item, 80, 100+group scene).
 * Missed days pause the card; it never resets. Returns null when already claimed today.
 */
export function claimDaily(save: SaveData, now: number): DailyClaim | null {
  const d = today(now);
  if (save.lastDaily === d) return null;
  const idx = counter(save, 'stamps') % STAMPS.length;
  const reward = STAMPS[idx];
  const doubled = bool(save, 'pet.stampDouble');
  const money = reward.money * (doubled ? 2 : 1);
  if (doubled) delFlag(save, 'pet.stampDouble');
  let item: string | undefined;
  if (reward.item === 'companion_love') item = (save.companion && lovedFoods(save.companion)[0]) || 'onigiri';
  else if (reward.item) item = reward.item;
  save.money += money;
  if (item) save.inventory[item] = (save.inventory[item] ?? 0) + 1;
  if (reward.scene) setFlag(save, 'stamp_party_ready', true);
  save.lastDaily = d;
  save.streak = bump(save, 'stamps');
  return { money, streak: save.streak, item, stamp: idx + 1, doubled, scene: !!reward.scene };
}

// ── daily tasks ──

type TaskPig = PigId | 'companion' | 'signal';
type TaskGroup = 'care' | 'social' | 'play';

interface TaskDef {
  id: string;
  group: TaskGroup;
  pig: TaskPig;
  text: string;
  match: (s: GameSignal, save: SaveData, now: number) => boolean;
}

const P1: PigId = 'piggy-1';
const P2: PigId = 'piggy-2';
const P3: PigId = 'piggy-3';
const said = (text: string, re: RegExp) => re.test(text.toLowerCase());
const loved = (s: GameSignal, pig: PigId) => s.kind === 'feed' && s.pig === pig && (s.taste === 'love' || s.taste === 'secret');
const medalAtLeast = (m: string, min: 'bronze' | 'silver' | 'gold') =>
  ['none', 'bronze', 'silver', 'gold'].indexOf(m) >= ['none', 'bronze', 'silver', 'gold'].indexOf(min);

export const TASK_POOL: readonly TaskDef[] = [
  // care (your Kempanion)
  { id: 'tuck_in', group: 'care', pig: 'companion', text: 'Tuck in your Kempanion at bedtime', match: (s, v) => s.kind === 'care' && s.action === 'tuck' && s.pig === v.companion },
  { id: 'bath', group: 'care', pig: 'companion', text: 'Give your Kempanion a bath', match: (s, v) => s.kind === 'care' && s.action === 'clean' && s.pig === v.companion },
  { id: 'brush', group: 'care', pig: 'companion', text: "Brush your Kempanion's teeth", match: (s, v) => s.kind === 'care' && s.action === 'brush' && s.pig === v.companion },
  { id: 'pet_5', group: 'care', pig: 'companion', text: 'Pet your Kempanion 5 times', match: (s, v, n) => s.kind === 'care' && s.action === 'pet' && s.pig === v.companion && todayOf(v.pigs[s.pig], n).pets >= 5 },
  { id: 'play_ball', group: 'care', pig: 'companion', text: 'Play ball with your Kempanion', match: (s, v) => s.kind === 'care' && s.action === 'play' && s.pig === v.companion },
  { id: 'tidy', group: 'care', pig: 'companion', text: 'Tidy up the crumbs at Sakura House', match: (s) => s.kind === 'care' && s.action === 'tidy' },
  { id: 'feed_love', group: 'care', pig: 'companion', text: 'Feed your Kempanion something he loves', match: (s, v) => !!v.companion && loved(s, v.companion) },
  // social
  { id: 'feed_love_p1', group: 'social', pig: P1, text: 'Feed Piggy 1 something he loves', match: (s) => loved(s, P1) },
  { id: 'feed_love_p2', group: 'social', pig: P2, text: 'Feed Piggy 2 something he loves', match: (s) => loved(s, P2) },
  { id: 'feed_love_p3', group: 'social', pig: P3, text: 'Feed Piggy 3 something he loves', match: (s) => loved(s, P3) },
  { id: 'say_based', group: 'social', pig: P2, text: 'Say "based" to Piggy 2', match: (s) => s.kind === 'chat' && s.pig === P2 && said(s.text, /\bbased\b/) },
  { id: 'ask_best', group: 'social', pig: P3, text: "Ask Piggy 3 what's best", match: (s) => s.kind === 'chat' && s.pig === P3 && said(s.text, /\bbest\b/) },
  { id: 'call_bump', group: 'social', pig: P1, text: 'Say "bump" to Piggy 1', match: (s) => s.kind === 'chat' && s.pig === P1 && said(s.text, /\bbump\b/) },
  { id: 'ask_codex', group: 'social', pig: P3, text: 'Ask Piggy 3 about Codex', match: (s) => s.kind === 'chat' && s.pig === P3 && said(s.text, /\bcodex\b/) },
  { id: 'chat_p1', group: 'social', pig: P1, text: 'Chat with Piggy 1', match: (s) => s.kind === 'chat' && s.pig === P1 },
  { id: 'chat_p2', group: 'social', pig: P2, text: 'Chat with Piggy 2', match: (s) => s.kind === 'chat' && s.pig === P2 },
  { id: 'chat_p3', group: 'social', pig: P3, text: 'Chat with Piggy 3', match: (s) => s.kind === 'chat' && s.pig === P3 },
  { id: 'gift_any', group: 'social', pig: 'signal', text: 'Give anyone a gift', match: (s) => s.kind === 'gift' },
  { id: 'drink_p2', group: 'social', pig: P2, text: 'Get Piggy 2 a drink (hydration is based)', match: (s) => s.kind === 'feed' && s.pig === P2 && getItem(s.item)?.category === 'drink' },
  { id: 'visit_p1', group: 'social', pig: P1, text: 'Cheer for Piggy 1 at the sand courts', match: (s) => s.kind === 'visit' && s.location === 'volleyball_courts' && !!s.present?.includes(P1) },
  { id: 'visit_p2', group: 'social', pig: P2, text: 'Drop by the Communicore while Piggy 2 is there', match: (s) => s.kind === 'visit' && s.location === 'communicore' && !!s.present?.includes(P2) },
  { id: 'visit_p3', group: 'social', pig: P3, text: "Visit Piggy 3's lab in the Physics Building", match: (s) => s.kind === 'visit' && s.location === 'physics' && !!s.present?.includes(P3) },
  // play & explore
  { id: 'rally_20', group: 'play', pig: P1, text: 'Get a 20-touch rally in Sakura Spike', match: (s) => s.kind === 'minigame' && s.id === 'volley' && (s.stats.maxRally ?? 0) >= 20 },
  { id: 'perfusion_silver', group: 'play', pig: P2, text: 'Earn silver or better in Swinus Rhythms', match: (s) => s.kind === 'minigame' && s.id === 'perfusion' && medalAtLeast(s.medal, 'silver') },
  { id: 'bugs_7', group: 'play', pig: P3, text: 'Squash 7 bugs in one Bug Hunt', match: (s) => s.kind === 'minigame' && s.id === 'debug' && (s.stats.correct ?? 0) >= 7 },
  { id: 'petals_80', group: 'play', pig: 'signal', text: 'Catch 80 petals in one Petal Catch', match: (s) => s.kind === 'minigame' && s.id === 'petals' && (s.stats.petals ?? 0) >= 80 },
  { id: 'gold_any', group: 'play', pig: 'signal', text: 'Earn a gold medal in any mini-game', match: (s) => s.kind === 'minigame' && s.medal === 'gold' },
  { id: 'any_minigame', group: 'play', pig: 'signal', text: 'Play any mini-game', match: (s) => s.kind === 'minigame' },
  { id: 'golden_petal', group: 'play', pig: 'companion', text: 'Catch a golden petal on the KempaPager', match: (s) => s.kind === 'petal' },
  { id: 'omikuji', group: 'play', pig: 'companion', text: 'Draw an omikuji at Century Tower', match: (s) => s.kind === 'omikuji' },
  { id: 'lake_dusk', group: 'play', pig: 'companion', text: 'Visit Lake Alice at dusk (bats!)', match: (s, _v, n) => s.kind === 'visit' && s.location === 'lake_alice' && scheduleSlot(new Date(n)) === 'dusk' },
  { id: 'marston_night', group: 'play', pig: 'companion', text: 'Study at Marston after dark', match: (s, _v, n) => s.kind === 'visit' && s.location === 'marston' && ['night', 'owl'].includes(scheduleSlot(new Date(n))) },
  { id: 'buy_snack', group: 'play', pig: 'companion', text: 'Buy a snack at the Reitz Union', match: (s) => s.kind === 'buy' && ['food', 'drink'].includes(getItem(s.item)?.category ?? '') },
];

const TASK_BY_ID = new Map(TASK_POOL.map((t) => [t.id, t]));

interface TaskDay { d: string; ids: string[]; done: string[]; pigs?: Record<string, PigId> }

function pickTasks(save: SaveData, date: string): string[] {
  const rand = rngFor('tasks', date, save.createdAt);
  const usable = TASK_POOL.filter((t) => t.pig !== 'companion' || save.companion);
  const out: string[] = [];
  for (const g of ['care', 'social', 'play'] as TaskGroup[]) {
    const pool = shuffle(rand, usable.filter((t) => t.group === g && !out.includes(t.id)));
    if (pool.length) out.push(pool[0].id);
  }
  for (const t of shuffle(rand, usable)) if (out.length < TASKS.perDay && !out.includes(t.id)) out.push(t.id);
  return out.slice(0, TASKS.perDay);
}

function taskDay(save: SaveData, now: number): TaskDay {
  const d = today(now);
  const rec = json<TaskDay>(save, 'pet.tasks');
  if (rec && rec.d === d && Array.isArray(rec.ids)) return rec;
  const fresh: TaskDay = { d, ids: pickTasks(save, d), done: [] };
  setJson(save, 'pet.tasks', fresh);
  return fresh;
}

function resolvePig(save: SaveData, def: TaskDef, signalPig?: PigId | null): PigId | null {
  if (def.pig === 'companion') return save.companion;
  if (def.pig === 'signal') return signalPig ?? save.companion;
  return def.pig;
}

function toTask(save: SaveData, now: number, def: TaskDef, day: TaskDay): DailyTask {
  return {
    id: def.id,
    text: def.text,
    pig: day.pigs?.[def.id] ?? resolvePig(save, def),
    done: day.done.includes(def.id),
    money: earn(save, TASKS.money, now),
    bond: TASKS.bond,
  };
}

/** Today's 3 tasks (generated and stored on first call each day). */
export function dailyTasks(save: SaveData, now: number): DailyTask[] {
  const day = taskDay(save, now);
  return day.ids.map((id) => TASK_BY_ID.get(id)).filter((d): d is TaskDef => !!d).map((def) => toTask(save, now, def, day));
}

/** Complete one of today's tasks: +25 acorns (Great Blessing applies) and +10 bond with its pig. */
export function completeTask(save: SaveData, taskId: string, now: number = clockNow(), signalPig?: PigId | null): DailyTask | null {
  const day = taskDay(save, now);
  const def = TASK_BY_ID.get(taskId);
  if (!def || !day.ids.includes(taskId) || day.done.includes(taskId)) return null;
  day.done.push(taskId);
  const pig = resolvePig(save, def, signalPig);
  if (pig) {
    day.pigs = { ...(day.pigs ?? {}), [taskId]: pig };
    addBondCapped(save, pig, TASKS.bond, 'task', now);
  }
  setJson(save, 'pet.tasks', day);
  const money = earn(save, TASKS.money, now);
  save.money += money;
  bump(save, 'tasks_done');
  return { ...toTask(save, now, def, day), done: true, money };
}

/** Complete every open task matching a signal. */
export function progressTasks(save: SaveData, sig: GameSignal, now: number): DailyTask[] {
  const day = taskDay(save, now);
  const out: DailyTask[] = [];
  const signalPig = 'pig' in sig ? sig.pig : null;
  for (const id of day.ids) {
    if (day.done.includes(id)) continue;
    const def = TASK_BY_ID.get(id);
    if (!def || !def.match(sig, save, now)) continue;
    const t = completeTask(save, id, now, signalPig);
    if (t) out.push(t);
  }
  return out;
}
