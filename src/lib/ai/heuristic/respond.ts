// The Heuristic Brain's reply composer: hard quirks → repeat callout → intent → bank keys → line choice
// (bond tier, no repeats in the last 8 pig lines, fact availability) → optional lead-in and need interjection.
// Deterministic: the RNG is seeded from pig + normalized text + history length + local date.
import type { AnimId, ChatContext, ChatReply, ChatRequest, ChatTurn, Expression, PigId } from '../../types';
import { PIG_IDS } from '../../types';
import { now, nowDate } from '../../state/clock';
import { localDate } from '../../time';
import { isBedtime, whereIs } from '../../content/locations';
import { classifyIntent, LEAD_INTENTS, type Intent, type IntentResult } from './intents';
import { FOOD_LABEL } from './entities';
import { normalize } from './normalize';
import { pickWeighted, rngFrom, type Rng } from './rng';
import { LINES } from './lines';
import type { Bank, Tier, TierTag } from './lines/types';
import { extractSaid, fill, isPersonal, isUndecided, parseArithmetic, parseFacts, sentenceCount, type Vars } from './template';
import { DESSERTS, HOME_NAME, NICKNAME, OWN_MAJOR, OWN_PASSION, PIG_NAME, PLACE_NAME, TOPIC_LABEL, tasteFor } from './world';

export const MAX_CHARS = 280;
export const MAX_SENTENCES = 3;
/** A pig never repeats any of his last this-many lines (when he has any alternative). */
export const NO_REPEAT_WINDOW = 8;
const NEED_CHANCE = 0.3;

export function tierOf(bondLevel: number | undefined): Tier {
  const b = bondLevel ?? 0;
  return b >= 7 ? 'W' : b >= 3 ? 'F' : 'N';
}

/** Everyday clothes vs. the alternate outfit (undefined when the caller didn't say). */
export function outfitKind(outfit: string | undefined): 'everyday' | 'alt' | undefined {
  return outfit ? (outfit === 'everyday' ? 'everyday' : 'alt') : undefined;
}

function tierOk(tag: TierTag | undefined, tier: Tier): boolean {
  return !tag || tag.includes(tier);
}

// ───────────── hard quirks (exact single words; GAME_DESIGN §2) ─────────────

interface QuirkLine { text: string; expression: Expression; anim?: AnimId }

const HARD_QUIRKS: Record<PigId, Readonly<Record<string, QuirkLine>>> = {
  'piggy-1': {
    bump: { text: 'Set!', expression: 'excited', anim: 'volleyball_set' },
    set: { text: 'SPIKE!!', expression: 'excited', anim: 'volleyball_spike' },
    spike: { text: 'KILL! Point Gators!', expression: 'excited', anim: 'celebrate' },
  },
  'piggy-2': {
    based: { text: 'Patriot.', expression: 'proud' },
    patriot: { text: 'Based.', expression: 'proud' },
  },
  'piggy-3': {},
};

/** The fixed reply for a hard-quirk message ("based" → "Patriot." for Piggy 2…), or null. */
export function hardQuirk(pig: PigId, playerText: string): ChatReply | null {
  const q = HARD_QUIRKS[pig][normalize(playerText).text];
  return q ? { text: q.text, expression: q.expression, anim: q.anim, source: 'quirk' } : null;
}

// ───────────── context helpers ─────────────

type NeedState = 'sick' | 'hungry' | 'tired' | 'sad' | 'dirty' | 'bored';

function needState(ctx: Partial<ChatContext>): NeedState | undefined {
  if (ctx.sick) return 'sick';
  const n = ctx.needs;
  if ((n?.hunger ?? 100) < 30) return 'hungry';
  if ((n?.energy ?? 100) < 30) return 'tired';
  if (ctx.mood === 'low' || ctx.mood === 'awful') return 'sad';
  if ((n?.hygiene ?? 100) < 25) return 'dirty';
  if ((n?.fun ?? 100) < 25) return 'bored';
  return undefined;
}

/** State variant for "how are you" style answers. */
function moodVariant(ctx: Partial<ChatContext>): string | undefined {
  const s = needState(ctx);
  if (s === 'sick' || s === 'hungry' || s === 'tired' || s === 'sad') return s;
  return ctx.mood === 'great' ? 'great' : undefined;
}

const TOD_PHRASE: Record<string, string> = { morning: 'this morning', day: 'today', evening: 'this evening', night: 'tonight' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_PREFIX: Record<string, string> = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

function clockTime(clock: string | undefined, d: Date): string {
  const fromCtx = clock ? /(\d{1,2}:\d{2}\s?[AP]M)/i.exec(clock)?.[1] : undefined;
  if (fromCtx) return fromCtx;
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function clockDay(clock: string | undefined): string | undefined {
  const m = clock ? /^\s*([A-Za-z]{3})/.exec(clock) : null;
  return m ? DAY_PREFIX[m[1].toLowerCase()] : undefined;
}

interface VarExtras {
  res?: IntentResult | null;
  other?: PigId;
  last?: string;
  said?: string;
}

export function buildVars(pig: PigId, ctx: Partial<ChatContext>, extras: VarExtras = {}): Vars {
  const d = nowDate();
  const facts = parseFacts(ctx.memories);
  const name = (ctx.playerName ?? '').trim().slice(0, 20);
  const tod = TOD_PHRASE[ctx.timeOfDay ?? 'day'] ?? 'today';
  const other = extras.other;
  const res = extras.res;
  return {
    ...facts,
    player: (ctx.bondLevel ?? 0) >= 1 && name ? name : NICKNAME[pig],
    time: clockTime(ctx.clock, d),
    tod,
    day: clockDay(ctx.clock) ?? DAY_NAMES[d.getDay()],
    place: (ctx.location && PLACE_NAME[ctx.location]) || 'campus',
    home: HOME_NAME[pig],
    food: res?.entities.foods[0]?.label,
    other: other ? PIG_NAME[other] : undefined,
    otherplace: other ? PLACE_NAME[whereIs(other, d)] : undefined,
    last: extras.last,
    said: extras.said,
    n: res?.entities.numbers[0]?.toString(),
    // the player's sum, solved in code (template.ts parseArithmetic): the 'arithmetic' lines say these and never a number of their own
    answer: res?.math?.answer,
    expr: res?.math?.expr,
  };
}

// ───────────── history helpers ─────────────

/** Callers may or may not have appended the current message to the history already. */
function stripCurrent(history: readonly ChatTurn[], playerText: string): ChatTurn[] {
  const h = history.slice(-40);
  const last = h[h.length - 1];
  if (last && last.role === 'player' && last.text === playerText) h.pop();
  return h;
}

/** The pig's own recent lines, most recent first. */
function recentPigLines(history: readonly ChatTurn[], k = NO_REPEAT_WINDOW): string[] {
  const out: string[] = [];
  for (let i = history.length - 1; i >= 0 && out.length < k; i--) if (history[i].role === 'pig') out.push(history[i].text);
  return out;
}

function playerTexts(history: readonly ChatTurn[], k: number): string[] {
  const out: string[] = [];
  for (let i = history.length - 1; i >= 0 && out.length < k; i--) if (history[i].role === 'player') out.push(history[i].text);
  return out;
}

/**
 * The sums the player asked within the no-repeat window, as vars: "19! Nice serve count." and "20! Nice serve count." are
 * one line to say twice in a row (the window compares what was said, and every sum renders differently).
 */
function pastSums(history: readonly ChatTurn[], vars: Vars): Vars[] {
  const out: Vars[] = [];
  for (const text of playerTexts(history, NO_REPEAT_WINDOW)) {
    const sum = parseArithmetic(text);
    if (sum) out.push({ ...vars, answer: sum.answer, expr: sum.expr });
  }
  return out;
}

function lastPigAsked(history: readonly ChatTurn[]): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'pig') return /\?["”]?\s*$/.test(history[i].text.trim());
    if (history[i].role === 'player') return false;
  }
  return false;
}

/** Intents that carry no topic to follow up on or reminisce about. */
const NON_TOPIC: ReadonlySet<Intent> = new Set<Intent>([
  'followup', 'yes', 'no', 'laugh', 'greeting', 'thanks', 'apology', 'unknown', 'question_generic', 'farewell',
  'based', 'patriot', 'bump', 'set', 'spike', 'distress', 'pork_joke', 'insult', 'hug', 'affection',
  'compliment_looks', 'compliment_skill', 'arithmetic',
]);

/** Most recent topical player message (looks back up to 6 player turns). */
export function lastTopic(history: readonly ChatTurn[], pig: PigId): IntentResult | null {
  let seen = 0;
  for (let i = history.length - 1; i >= 0 && seen < 6; i--) {
    if (history[i].role !== 'player') continue;
    seen++;
    const r = classifyIntent(history[i].text, pig);
    if (!NON_TOPIC.has(r.intent)) return r;
  }
  return null;
}

/** A short noun phrase for an earlier topic, for "{last}" lines. */
export function topicLabel(r: IntentResult): string | undefined {
  if (r.intent === 'campus_place' && r.topic && r.topic in PLACE_NAME) return PLACE_NAME[r.topic as keyof typeof PLACE_NAME];
  if (r.intent === 'other_pig' && r.topic && r.topic in PIG_NAME) return PIG_NAME[r.topic as PigId];
  if ((r.intent === 'food_offer' || r.intent === 'ask_favorite_food') && r.topic && FOOD_LABEL[r.topic]) return FOOD_LABEL[r.topic];
  return TOPIC_LABEL[`${r.intent}:${r.topic}`] ?? TOPIC_LABEL[r.intent];
}

// ───────────── line choice ─────────────

interface Picked {
  text: string;
  e: Expression;
  a?: AnimId;
  key: string;
  w: number;
  /** The same line with an earlier sum's numbers in it (Env.past): said recently means the line, whatever its numbers. */
  was?: string[];
}

interface Env {
  rng: Rng;
  tier: Tier;
  /** Everyday clothes or the alternate outfit; undefined = unknown (outfit lines all qualify). */
  outfit?: 'everyday' | 'alt';
  vars: Vars;
  /** Most recent first. */
  recent: readonly string[];
  /** The vars of the sums the player asked within the no-repeat window, most recent first (arithmetic answers only). */
  past?: readonly Vars[];
}

/** A key, or a group of keys whose lines are pooled together. */
export type KeySpec = string | readonly string[];

function candidates(bank: Bank, spec: KeySpec, env: Env): Picked[] {
  const out: Picked[] = [];
  for (const key of typeof spec === 'string' ? [spec] : spec) {
    for (const raw of bank[key] ?? []) {
      const opts = raw[2];
      if (!tierOk(opts?.tier, env.tier)) continue;
      if (opts?.outfit && env.outfit && opts.outfit !== env.outfit) continue;
      const text = fill(raw[1], env.vars);
      if (text === null) continue;
      let w = 1;
      if (opts?.tier) w += 0.5;
      if (isPersonal(raw[1])) w += 1;
      const was = env.past?.map((v) => fill(raw[1], v)).filter((t): t is string => t !== null && t !== text);
      out.push({ text, e: raw[0], a: opts?.a, key, w, was });
    }
  }
  return out;
}

function seenRecently(text: string, recent: readonly string[]): number {
  return recent.findIndex((r) => r === text || r.includes(text));
}

/** How recently the line was said (0 = last; -1 = not within the window), counting it with an earlier sum's numbers too. */
function lastSaid(c: Picked, recent: readonly string[]): number {
  let at = seenRecently(c.text, recent);
  for (const t of c.was ?? []) {
    const i = seenRecently(t, recent);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  return at;
}

/**
 * First key (in order) that has a line not said recently (among those, lines passing `prefer` win). With
 * `allowRepeat`, falls back to the least recently said line of the first non-empty key when everything is exhausted.
 */
function pickLine(
  bank: Bank,
  specs: readonly KeySpec[],
  env: Env,
  allowRepeat = true,
  prefer?: (text: string) => boolean,
): Picked | null {
  for (const spec of specs) {
    const fresh = candidates(bank, spec, env).filter((c) => lastSaid(c, env.recent) < 0);
    if (!fresh.length) continue;
    const preferred = prefer ? fresh.filter((c) => prefer(c.text)) : [];
    return pickWeighted(env.rng, preferred.length ? preferred : fresh, (c) => c.w);
  }
  if (!allowRepeat) return null;
  for (const spec of specs) {
    const all = candidates(bank, spec, env);
    if (!all.length) continue;
    let best = all[0];
    let bestAge = -1;
    for (const c of all) {
      const age = lastSaid(c, env.recent);
      if (age > bestAge) {
        best = c;
        bestAge = age;
      }
    }
    return best;
  }
  return null;
}

/**
 * Topics that answer one particular question ("One Piece or JoJo?", "who's Buggy?"). A pig with no lines for one
 * answers from the topic it points to, and a follow-up's segue into his own passion never picks one (it would
 * answer a question nobody asked).
 */
const ANSWER_TOPICS: Readonly<Record<string, string>> = {
  'passion_p3:opvsjojo': 'passion_p3:onepiece',
  'passion_p3:jojo_better': 'passion_p3:opvsjojo',
  'passion_p3:op_better': 'passion_p3:opvsjojo',
  'passion_p3:buggy': 'passion_p3:onepiece',
  // Each of these pools answers one quick reply, so a follow-up's segue into his own passion never picks it, and a
  // drained pool falls back to his general lines on the subject (Piggy 1's and Piggy 2's new chips)
  'passion_p1:germany': 'passion_p1', 'passion_p1:german': 'passion_p1', 'passion_p1:haikyu': 'passion_p1',
  'passion_p1:sand': 'passion_p1', 'passion_p1:team': 'passion_p1', 'passion_p1:calls': 'passion_p1',
  'passion_p1:claude': 'passion_p1', 'passion_p1:algorithm': 'passion_p1', 'passion_p1:bug': 'passion_p1',
  'passion_p2:donation': 'passion_p2:collection', 'passion_p2:research_year': 'passion_p2:medschool',
  'passion_p2:or': 'passion_p2:medschool', 'passion_p2:why': 'passion_p2:neurosurgery',
  'passion_p2:nerves': 'passion_p2:neurosurgery', 'passion_p2:snout': 'passion_p2:pig_models',
  // Piggy 3: "are you on X?" (his mumble is a quirk; these are the bank's answers) and the "Twitter" correction; the AI
  // words he decodes ("what's RLHF?"); and the questions only his chips ask
  'passion_p3:x': 'passion_p3:ai', 'passion_p3:twitter': 'passion_p3:x',
  'passion_p3:llm': 'passion_p3:ai', 'passion_p3:rlhf': 'passion_p3:llm', 'passion_p3:rlvr': 'passion_p3:llm',
  'passion_p3:jev': 'passion_p3:llm', 'passion_p3:foundation': 'passion_p3:llm',
  'passion_p3:mathtrick': 'passion_p3:math', 'passion_p3:eeg': 'passion_p3:signals', 'passion_p3:medai': 'passion_p3:ai',
  'passion_p3:robots': 'passion_p3:building',
  // "Hype me up!" is not the player cheering for the pig: a drained pool answers with his good-news lines, not "Thanks, teammate!"
  'encourage:hype': 'player_happy',
};

/** Bank keys for an intent, most specific first. */
function keysFor(pig: PigId, r: IntentResult, ctx: Partial<ChatContext>, history: readonly ChatTurn[]): string[] {
  const { intent: i, topic: t } = r;
  const keys: string[] = [];
  switch (i) {
    case 'how_are_you':
    case 'whats_up': {
      const v = moodVariant(ctx);
      if (v) keys.push(`${i}:${v}`);
      keys.push(i);
      break;
    }
    case 'hungry_talk':
    case 'tired_talk':
    case 'sick_talk': {
      const needy = i === 'hungry_talk' ? (ctx.needs?.hunger ?? 100) < 40
        : i === 'tired_talk' ? (ctx.needs?.energy ?? 100) < 40 : !!ctx.sick;
      const self = i === 'hungry_talk' ? 'hungry' : i === 'tired_talk' ? 'tired' : 'sick';
      if (t === 'invite') keys.push('hungry_talk:invite');
      // "are you hungry?" is answered about himself; "I'm hungry" gets a reply to the player
      else if (t === 'ask') keys.push(...(needy ? [`how_are_you:${self}`, `${i}:needy`] : [`${i}:ask`]));
      else if (needy) keys.push(`${i}:needy`);
      keys.push(i);
      break;
    }
    case 'player_happy':
      if (t === 'fine') keys.push('player_happy:fine', 'followup:ack');
      else keys.push(i);
      break;
    case 'food_offer':
    case 'ask_favorite_food': {
      if (t && FOOD_LABEL[t]) {
        const taste = tasteFor(pig, t);
        if (i === 'food_offer' && (ctx.needs?.hunger ?? 0) >= 90 && !DESSERTS.has(t)) keys.push('food_offer:full');
        if (taste === 'secret') keys.push(`${i}:secret`);
        keys.push(`${i}:${t}`, `${i}:${taste}`);
      } else if (t) {
        // his favorite drink, his comfort food, where to eat
        keys.push(`${i}:${t}`);
      }
      keys.push(i);
      break;
    }
    case 'ask_where': {
      if (!t || t === 'self' || t === pig) keys.push('ask_where:self');
      else if (t === 'all') keys.push('ask_where:all', 'ask_where:self');
      else {
        if (isBedtime(t as PigId, nowDate())) keys.push('ask_where:other_asleep');
        keys.push('ask_where:other');
      }
      break;
    }
    case 'arithmetic':
      // 'meme' (9 + 10) can fall back to the plain answer; a division by zero has no answer, and a rounded one needs its "about"
      if (t) keys.push(`arithmetic:${t}`);
      if (!t || t === 'meme') keys.push(i);
      break;
    case 'other_pig':
      if (t) keys.push(`other_pig:${t}`);
      keys.push(t === pig ? 'ask_name' : 'other_pig:all');
      break;
    case 'ask_about_me':
      if (!Object.keys(parseFacts(ctx.memories)).length) keys.push('ask_about_me:none');
      keys.push(i);
      break;
    case 'yes':
    case 'no':
      if (lastPigAsked(history)) keys.push(`${i}:q`);
      keys.push(i);
      break;
    case 'followup':
      // "hmm" / "not much" stand alone; the others only get here when there is no earlier topic to continue
      if (t === 'hmm' || t === 'nothing') keys.push(`followup:${t}`);
      else if (t === 'ack') keys.push('followup:ack', 'yes');
      else keys.push('followup');
      break;
    default:
      if (t) keys.push(`${i}:${t}`);
      if (t && ANSWER_TOPICS[`${i}:${t}`]) keys.push(ANSWER_TOPICS[`${i}:${t}`]);
      keys.push(i);
  }
  return keys;
}

// ───────────── reply composition ─────────────

const NO_CALLOUT: ReadonlySet<Intent> = new Set<Intent>([
  'yes', 'no', 'laugh', 'followup', 'distress', 'based', 'patriot', 'bump', 'set', 'spike', 'go_gators',
]);
const NO_INTERJECTION: ReadonlySet<Intent> = new Set<Intent>([
  'distress', 'pork_joke', 'hungry_talk', 'tired_talk', 'sick_talk', 'food_offer', 'based', 'patriot', 'bump', 'set',
  'spike', 'insult', 'player_sad', 'exam_stress', 'affection',
]);
const DEFAULT_ANIM: Partial<Record<Intent, AnimId>> = {
  greeting: 'wave', farewell: 'wave', go_gators: 'celebrate', hug: 'love', laugh: 'laugh', joke_request: 'laugh',
  insult: 'sad', pork_joke: 'angry', player_happy: 'celebrate', bored: 'bored', question_generic: 'thinking',
  unknown: 'confused', affection: 'shy', compliment_looks: 'shy', compliment_skill: 'proud', exam_stress: 'thinking',
  arithmetic: 'thinking',
};
/** Need states that override the portrait (GAME_DESIGN §6: sick/asleep override the visuals). */
const NEED_FACE: Partial<Record<NeedState, Expression>> = { sick: 'sick', tired: 'sleepy' };

function otherPigFor(pig: PigId, r: IntentResult, rng: Rng): PigId {
  const t = r.topic;
  if ((r.intent === 'ask_where' || r.intent === 'other_pig') && t && t !== pig && (PIG_IDS as readonly string[]).includes(t)) {
    return t as PigId;
  }
  const others = PIG_IDS.filter((p) => p !== pig);
  return others[Math.floor(rng() * others.length)];
}

function joinFits(parts: readonly string[]): boolean {
  const text = parts.join(' ');
  return text.length <= MAX_CHARS && sentenceCount(text) <= MAX_SENTENCES;
}

/** Synchronous core of `heuristicBrain.respond`. */
export function respondHeuristic(req: ChatRequest): ChatReply {
  const pig = req.pig;
  const ctx: Partial<ChatContext> = req.context ?? {};
  const playerText = req.playerText ?? '';

  const quirk = hardQuirk(pig, playerText);
  if (quirk) return quirk;

  const history = stripCurrent(req.history ?? [], playerText);
  const n = normalize(playerText);
  const rng = rngFrom(pig, n.text, history.length, localDate(now()));
  const env: Env = { rng, tier: tierOf(ctx.bondLevel), outfit: outfitKind(ctx.outfit), vars: {}, recent: recentPigLines(history) };
  const bank = LINES[pig].chat;
  const res = classifyIntent(playerText, pig);

  // follow-ups ("why?", "tell me more", "really?", "cool") continue the last topic
  let main: IntentResult = res;
  let openerKey: string | undefined;
  if (res.intent === 'followup' && res.topic !== 'hmm' && res.topic !== 'nothing') {
    const last = lastTopic(history, pig);
    if (last) {
      main = last;
      openerKey = `followup:${res.topic === 'why' || res.topic === 'really' || res.topic === 'ack' ? res.topic : 'more'}`;
    }
  }
  // "I'm good" right after "Want a snack?" means "no thanks"; after "How about you?" it means "fine"
  let politeDecline = false;
  if (res.intent === 'player_happy' && res.topic === 'fine' && lastPigAsked(history)) {
    const lastPig = recentPigLines(history, 1)[0] ?? '';
    politeDecline = !/\bhow (?:are|about|is|was|have)\b|\byou doing\b|\bfeeling\b/i.test(lastPig);
  }

  // repeated player input gets a playful callout
  const prev = playerTexts(history, 4).map((t) => normalize(t).text);
  const repeated = n.text.length > 1 && !NO_CALLOUT.has(res.intent)
    && (prev[0] === n.text || prev.filter((p) => p === n.text).length >= 2);

  const other = otherPigFor(pig, main, rng);
  // a major is read from the same corrected text as the intent and memory.ts (what he reads back is what he remembers)
  const said = main === res && res.intent === 'share_self'
    ? extractSaid(res.topic === 'major' ? res.corrected : n.text, res.topic, playerText)
    : undefined;
  env.vars = buildVars(pig, ctx, { res: main, other, said });
  if (main.intent === 'arithmetic') env.past = pastSums(history, env.vars);

  const fallback = res.question ? 'question_generic' : 'unknown';
  let specs: KeySpec[];
  if (repeated) specs = ['repeat'];
  else if (main.intent === 'distress') specs = ['distress'];
  else {
    specs = politeDecline ? ['no:q', 'no'] : keysFor(pig, main, ctx, history);
    // the player studies what he studies
    if (said && main.topic === 'major' && OWN_MAJOR[pig]?.test(said)) specs.unshift('share_self:major_same');
    // a major with nothing to read back ("my major is terrible", "i'm a tiktok major"): ask about it instead
    if (!said && main === res && main.intent === 'share_self' && main.topic === 'major' && !isUndecided(res.corrected)) {
      specs.unshift('share_self:major_more');
    }
    if (openerKey) {
      // a follow-up on a topic with every line already used segues into the pig's own passion
      const own = OWN_PASSION[pig];
      specs.push(Object.keys(bank).filter((k) => (k === own || k.startsWith(`${own}:`)) && !(k in ANSWER_TOPICS)));
    } else if (main.intent !== 'arithmetic') {
      // the same thing asked again in other words, with everything already said: own it instead of deflecting
      const askedBefore = playerTexts(history, 4).some((t) => {
        const p = classifyIntent(t, pig);
        return p.intent === main.intent && p.topic === main.topic;
      });
      if (askedBefore) specs.push('repeat');
    }
    // a sum is always answered (and a new sum is not "asked before"): a drained pool says its least recent line again
    if (main.intent !== 'arithmetic') specs.push(fallback);
  }

  // Short extras are planned first so the main line can be chosen to leave room for them:
  // a follow-up opener or a blended lead-in ("Hey!", "Ha!"), and ~30% of the time a need-state interjection.
  let lead: Picked | null = null;
  if (!repeated && main.intent !== 'distress') {
    if (openerKey) lead = pickLine(bank, [openerKey], env, false);
    else if (res.runnerUp && LEAD_INTENTS.includes(res.runnerUp.intent) && !LEAD_INTENTS.includes(main.intent)) {
      lead = pickLine(bank, [`lead:${res.runnerUp.intent}`], env, false);
    }
  }
  const need = needState(ctx);
  let extra: Picked | null = null;
  if (need && !repeated && !NO_INTERJECTION.has(main.intent) && rng() < NEED_CHANCE) {
    extra = pickLine(bank, [`need:${need}`], env, false);
  }
  const roomFor = (text: string) => joinFits([lead?.text, text, extra?.text].filter((x): x is string => !!x));
  const picked = pickLine(bank, specs, env, true, lead || extra ? roomFor : undefined) ?? pickLine(bank, ['unknown'], env);
  if (!picked) return { text: '…', expression: 'neutral', source: 'heuristic' };
  // "How are you?" already answered with the hungry variant: no extra hunger interjection
  if (extra && picked.key.split(':')[1] === need) extra = null;

  let parts = [lead?.text, picked.text, extra?.text].filter((x): x is string => !!x);
  if (!joinFits(parts) && extra) {
    extra = null;
    parts = [lead?.text, picked.text].filter((x): x is string => !!x);
  }
  if (!joinFits(parts) && lead) {
    lead = null;
    parts = [picked.text];
  }

  let expression = picked.e;
  if (extra && need && NEED_FACE[need]) expression = NEED_FACE[need]!;

  // A quiet "I'm good" is not a celebration.
  const anim = picked.a ?? (politeDecline || main.topic === 'fine' ? undefined : DEFAULT_ANIM[main.intent]);
  // No `effects`: chat bond/fun is scored by the AI pipeline (exchangeEffects), the same for both brains.
  return { text: parts.join(' '), expression, anim, source: 'heuristic' };
}

// ───────────── opening line ─────────────

/** Opening line for a free chat: time of day, bond tier, needs, and sometimes the last chat or a remembered fact. */
export function greetingLine(
  pig: PigId,
  ctx: Partial<ChatContext>,
  history: readonly ChatTurn[] = [],
): { text: string; expression: Expression; anim?: AnimId } {
  const d = nowDate();
  const hour = d.getHours();
  const rng = rngFrom('greet', pig, localDate(now()), hour, history.length, ctx.bondLevel ?? 0);
  const facts = parseFacts(ctx.memories);
  const last = lastTopic(history, pig);
  const env: Env = {
    rng,
    tier: tierOf(ctx.bondLevel),
    outfit: outfitKind(ctx.outfit),
    vars: buildVars(pig, ctx, { last: last ? topicLabel(last) : undefined }),
    recent: recentPigLines(history),
  };
  const lastAt = history.length ? history[history.length - 1].at : undefined;
  const hoursAway = lastAt ? (now() - lastAt) / 3_600_000 : Infinity;

  const specs: KeySpec[] = [];
  if (ctx.sick) {
    if (rng() < 0.7) specs.push('greet:sick');
  } else if ((ctx.needs?.hunger ?? 100) < 30) {
    if (rng() < 0.5) specs.push('greet:hungry');
  } else if ((ctx.needs?.energy ?? 100) < 30) {
    if (rng() < 0.5) specs.push('greet:tired');
  }
  if (last && hoursAway >= 1 && hoursAway < 72) {
    const aboutPlayer = /\bi (?:am|feel|have|got|think)\b/.test(last.normalized);
    if (last.intent === 'player_sad' && rng() < 0.8) specs.push('greet:checkin_sad');
    else if (last.intent === 'exam_stress' && rng() < 0.7) specs.push('greet:checkin_exam');
    else if (facts.exam && rng() < 0.3) specs.push('greet:checkin_exam');
    else if (last.intent === 'sick_talk' && aboutPlayer && rng() < 0.7) specs.push('greet:checkin_sick');
    else if (rng() < 0.35) specs.push('greet:last');
  }
  if (history.length && hoursAway > 72 && rng() < 0.6) specs.push('greet:long');
  if (Object.keys(facts).length && rng() < 0.25) specs.push('greet:memory');
  specs.push([hour < 5 ? 'greet:late' : `greet:${ctx.timeOfDay ?? 'day'}`, 'greet:any']);

  const p = pickLine(LINES[pig].greet, specs, env) ?? pickLine(LINES[pig].chat, ['greeting'], env);
  return p ? { text: p.text, expression: p.e, anim: p.a } : { text: 'Hey!', expression: 'happy' };
}
