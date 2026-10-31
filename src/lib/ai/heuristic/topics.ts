// Quick-reply chips for the chat box. The box shows only the first THREE (vn/components/chat-choices.ts MAX_REPLY_ROWS), so
// the order is the design: one "your thing" chip, one care chip (or a social one), one signature or contextual chip (or
// a social one), and a social spare that only a wider box would show. Never suggests something the player just said.
// Piggy 3's "your thing" is "Are you on X?" more often until someone has asked him about X, and right after he corrects
// "Twitter" it comes first. Under a crisis or medical safety line (and for a couple of messages after it), only the
// gentle chips from ai/topics.ts.
import type { ChatContext, ChatTurn, LocationId, PigId } from '../../types';
import { PIG_IDS } from '../../types';
import { now, nowDate } from '../../state/clock';
import { localDate } from '../../time';
import { gentleChips } from '../topics';
import { classifyIntent } from './intents';
import { normalize } from './normalize';
import { pick, rngFrom, type Rng } from './rng';
import { parseFacts } from './template';
import { PIG_NAME } from './world';

const PASSION_CHIPS: Record<PigId, readonly string[]> = {
  'piggy-1': [
    "How's volleyball?", 'Teach me a serve!', 'What are you coding?', "How's your serve?", 'Sports drink facts?',
    'What was Germany like?', 'Say something in German!', 'Haikyu!! fave character?', 'Sand or indoor?',
    'Can I join your team?', 'Volleyball lingo?', 'Claude or Codex?', 'Favorite algorithm?', "Best bug you've fixed?",
  ],
  'piggy-2': [
    "What's perfusion?", "What's ischemia?", "How's the research?", "What's CSF?", 'Tell me about the lab pigs',
    'Want my old stethoscope?', "What's a research year?", 'Do you miss the OR?', 'Why neurosurgery?',
    'Favorite cranial nerve?', "Who's Professor Snout?", 'Fireworks fan?', 'Am I based?',
  ],
  // Centered on the owner: X, math (he used to tutor it), AI words, coding agents, EEG/ECG, medical AI, robots,
  // One Piece, his drink, physics, HiPerGator. 3D printing is a now-and-then hobby: he answers about it
  // when asked, he doesn't lead with it ("What are you building?" and "What's the best AI model?" stay typed questions
  // and fallback chips).
  'piggy-3': [
    'Are you on X?', 'Are you on Twitter?', 'Teach me a math trick!', 'Were you a math tutor?', 'What even is an LLM?',
    'Have you used Codex?', 'Claude or Codex?', 'What does an EEG show?', "What's medical AI?", 'Would you build a robot?', 'One Piece or JoJo?',
    'Why sugar-free Red Bull?', 'Favorite physics fact?', "What's HiPerGator?",
  ],
};

/** Piggy 3's headline chip: first right after he corrects "Twitter", and his "thing" more often until he's been asked. */
export const X_CHIP = 'Are you on X?';
/** Chance "Are you on X?" is Piggy 3's "your thing" chip while nobody in the chat log has asked him about X yet. */
const X_BOOST = 0.4;
/** Cheap pre-check before classifying a message (every X question has one of these words). */
const X_HINT = /\bx\b|timeline|\btl\b|for you|\bfeed\b|doom ?scroll/i;

/** The topic of the player's last message when it was one of Piggy 3's ("twitter", "x", …). */
function lastP3Topic(history: readonly ChatTurn[], pig: PigId): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== 'player') continue;
    const r = classifyIntent(history[i].text, pig);
    return r.intent === 'passion_p3' ? r.topic : undefined;
  }
  return undefined;
}

/** Has the player asked him about X ("are you on x?", "what's on your timeline?", "doomscrolling?") in this chat log? */
function askedAboutX(history: readonly ChatTurn[], pig: PigId): boolean {
  return history.some((t) => t.role === 'player' && X_HINT.test(t.text) && classifyIntent(t.text, pig).topic === 'x');
}

/** Chips that fit where the pig is right now: half the time, his "your thing" chip comes from here. */
const PASSION_AT: Partial<Record<PigId, Partial<Record<LocationId, readonly string[]>>>> = {
  'piggy-1': {
    volleyball_courts: ['Sand or indoor?', 'Can I join your team?', 'Volleyball lingo?', "How's your serve?"],
    malachowsky: ['Favorite algorithm?', "Best bug you've fixed?", 'What are you coding?', 'Claude or Codex?'],
  },
  'piggy-2': {
    shands: ['Do you miss the OR?', "What's a research year?", 'Why neurosurgery?'],
    communicore: ["What's a research year?", 'Why neurosurgery?', 'Favorite cranial nerve?'],
    anatomy_lab: ['Favorite cranial nerve?', 'Why neurosurgery?'],
    dorm: ['Want my old stethoscope?', "Who's Professor Snout?"],
  },
};

const FALLBACK_CHIPS = ['How are you?', 'Tell me a joke', 'Favorite food?', 'What do you know about me?'];

/** Chips every pig answers in his own voice (lines: encourage:hype, ask_about_self:*, study:teach, ask_hobby:shows). */
export const SHARED_CHIPS = [
  'Hype me up!', 'Early bird or night owl?', 'Teach me something!', "What's your dream?", 'What are you watching?',
  'Are you competitive?',
] as const;
const SOCIAL_CHIPS: readonly string[] = [
  'Tell me a joke', 'Favorite food?', 'What do you know about me?', 'Favorite spot on campus?', ...SHARED_CHIPS,
];
/** Piggy 1 and Piggy 2 get asked about X now and then too (Piggy 3's X chips are in his own list). */
const SOCIAL_EXTRA: Partial<Record<PigId, readonly string[]>> = {
  'piggy-1': ['Are you on X?', 'Are you on Twitter?'],
  'piggy-2': ['Are you on X?', 'Are you on Twitter?'],
};

/** A chip for the moment itself: bats at dusk at Lake Alice, Friday lunch on the Plaza, a Gator Saturday. */
function occasionChip(ctx: Partial<ChatContext>): string | undefined {
  const d = nowDate();
  const h = d.getHours();
  if (ctx.location === 'lake_alice' && (ctx.timeOfDay === 'evening' || ctx.timeOfDay === 'night')) return 'Bats tonight?';
  if (d.getDay() === 5 && h >= 11 && h < 15) return 'Pig Pen Friday!';
  if (d.getDay() === 6 && d.getMonth() >= 8 && d.getMonth() <= 10) return 'Go Gators!';
  return undefined;
}

/** The contextual chip when there is no occasion: a remembered exam, the hour, otherwise a spot, a pig or a social chip. */
function contextChip(pig: PigId, ctx: Partial<ChatContext>, rng: Rng, social: () => string | undefined): string | undefined {
  const h = nowDate().getHours();
  // a remembered exam asks for a pep talk; late at night or first thing in the morning, the sleep-schedule question
  if (parseFacts(ctx.memories).exam && rng() < 0.4) return 'Hype me up!';
  if ((h >= 23 || h < 5 || ctx.timeOfDay === 'morning') && rng() < 0.3) return 'Early bird or night owl?';
  const r = rng();
  if (r < 0.25) return 'Favorite spot on campus?';
  if (r < 0.45) return `Where's ${PIG_NAME[pick(rng, PIG_IDS.filter((p) => p !== pig))]}?`;
  return social();
}

/** 3–4 short quick-reply chips (deterministic for a given pig, history length and day); the gentle ones under a safety line. */
export function suggestTopics(pig: PigId, ctx: Partial<ChatContext>, history: readonly ChatTurn[] = []): string[] {
  // "Thank you." / "I need a hug." under the crisis line, never "Pig Pen Friday!" or a joke
  const gentle = gentleChips(history);
  if (gentle) return gentle;
  const rng = rngFrom('chips', pig, history.length, localDate(now()));
  const recentlySaid = new Set(
    history.filter((t) => t.role === 'player').slice(-6).map((t) => normalize(t.text).text),
  );
  const chips: string[] = [];
  const fresh = (c: string) => !recentlySaid.has(normalize(c).text) && !chips.includes(c);
  const add = (c: string | undefined) => {
    if (c && fresh(c)) chips.push(c);
  };
  /** A social chip nobody has said lately (the pool is 10–12 deep, so there is nearly always one). */
  const social = () => {
    const pool = [...SOCIAL_CHIPS, ...(SOCIAL_EXTRA[pig] ?? [])].filter(fresh);
    return pool.length ? pick(rng, pool) : undefined;
  };
  const pigLines = history.filter((t) => t.role === 'pig');
  const lastPig = pigLines[pigLines.length - 1]?.text.trim();

  // Piggy 1's call-and-response: bump → "Set!" → set → "SPIKE!!" → spike → "KILL! Point Gators!"
  if (pig === 'piggy-1' && lastPig === 'Set!') chips.push('Set');
  else if (pig === 'piggy-1' && lastPig === 'SPIKE!!') chips.push('Spike');
  // Piggy 3 just corrected "Twitter": now the player can ask him the right way (and get the mumble)
  else if (pig === 'piggy-3' && lastP3Topic(history, pig) === 'twitter') chips.push(X_CHIP);

  // his thing; half the time one that fits where he is (the courts, the hospital). Piggy 3, until someone has asked him
  // about X: "Are you on X?" 40% of the time (Piggy 1 and Piggy 2 never draw that number, so their chips don't move).
  const here = (ctx.location ? PASSION_AT[pig]?.[ctx.location] ?? [] : []).filter(fresh);
  const passion = PASSION_CHIPS[pig].filter(fresh);
  const boostX = pig === 'piggy-3' && fresh(X_CHIP) && !askedAboutX(history, pig) && rng() < X_BOOST;
  add(boostX ? X_CHIP : here.length && rng() < 0.5 ? pick(rng, here) : passion.length ? pick(rng, passion) : undefined);

  // care: what he needs first; otherwise "How are you?" / "What's up?", or about one turn in three a social chip
  if (ctx.sick) add('Are you feeling okay?');
  else if ((ctx.needs?.hunger ?? 100) < 40) add('Want a snack?');
  else if ((ctx.needs?.energy ?? 100) < 40) add('You should rest.');
  else if (rng() < 0.35) add(social());
  else add(rng() < 0.6 ? 'How are you?' : "What's up?");

  // "based" is there while Piggy 2 has just said it to you (his last few lines), then it makes room; the moment's own chip
  // (bats, Pig Pen Friday, a Gator Saturday) comes before Piggy 1's "Bump"
  const occasion = occasionChip(ctx);
  if (pig === 'piggy-2' && pigLines.slice(-4).some((t) => /\bbased\b/i.test(t.text))) add('based');
  else if (occasion) add(occasion);
  else if (pig === 'piggy-1' && chips.length < 3 && !chips.includes('Set') && !chips.includes('Spike') && rng() < 0.5) add('Bump');
  else add(contextChip(pig, ctx, rng, social));

  if (chips.length < 4) add(social());
  for (const c of FALLBACK_CHIPS) {
    if (chips.length >= 3) break;
    add(c);
  }
  return chips.slice(0, 4);
}
