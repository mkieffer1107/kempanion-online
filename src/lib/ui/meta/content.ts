// Copy and small pure rules for the front door and meta screens (pick reactions, moving gag, cashier lines,
// intake form, credits). Pure TS: safe to import from bun tests.
import type { Expression, PigId, SpeakerId } from '../../types';

export interface MetaLine { speaker: SpeakerId; text: string; expression?: Expression }

/** Short epithets for cards and credits. */
export const EPITHET: Record<PigId, string> = {
  'piggy-1': 'The Hype Ambassador',
  'piggy-2': 'The Perfusion Patriot',
  'piggy-3': 'The Midnight Builder',
};

export const CAST_LINE: Record<PigId, string> = {
  'piggy-1': "First-year AIBHS master's · Kempa AI ambassador · volleyball",
  'piggy-2': 'MD · PGY-4 neurosurgery resident (research year)',
  'piggy-3': 'Builder · physics computational lab',
};

/** Signature reaction when picked as Kempanion (design-story §3). */
export const PICKED: Record<PigId, { expression: Expression; line: string }> = {
  'piggy-1': { expression: 'excited', line: 'TEAM OF TWO!' },
  'piggy-2': { expression: 'proud', line: 'Patient accepted. Partner. I meant partner.' },
  'piggy-3': { expression: 'bashful_smile', line: "Okay okay okay. I'm making the home screen so good." },
};

/** Warm "not picked" reactions — nobody sulks for real. */
export const NOT_PICKED: Record<PigId, { expression: Expression; line: string }> = {
  'piggy-1': { expression: 'happy', line: "Respect. I'm still recruiting you for intramurals." },
  'piggy-2': { expression: 'neutral', line: 'Defensible choice. Still based.' },
  'piggy-3': { expression: 'bashful_smile', line: "Oh! No, totally, that makes sense. Best for what you need, right? …I'll make you a keychain anyway." },
};

export function pickReactions(chosen: PigId): MetaLine[] {
  const others = (['piggy-1', 'piggy-2', 'piggy-3'] as PigId[]).filter((p) => p !== chosen);
  return [
    { speaker: chosen, ...asLine(PICKED[chosen]) },
    ...others.map((p) => ({ speaker: p, ...asLine(NOT_PICKED[p]) })),
  ];
}
const asLine = (r: { expression: Expression; line: string }) => ({ expression: r.expression, text: r.line });

/** The 3-line moving gag when re-pairing (GAME_DESIGN §3). */
export const MOVING_GAG: Record<PigId, MetaLine[]> = {
  'piggy-1': [
    { speaker: 'narrator', text: 'Moving day. Piggy 1 carries everything he owns across the hall in one trip.' },
    { speaker: 'narrator', text: 'Everything he owns is four volleyballs and zero pillows.' },
    { speaker: 'piggy-1', expression: 'excited', text: 'Pillows are just slow volleyballs, teammate. TEAM OF TWO!' },
  ],
  'piggy-2': [
    { speaker: 'narrator', text: 'Moving day. Piggy 2 crosses the hall cradling a brain model like a newborn.' },
    { speaker: 'narrator', text: 'Then come the water bottles. Eleven of them. All labeled.' },
    { speaker: 'piggy-2', expression: 'proud', text: 'Hydration is perfusion. Patient accepted. Partner. I meant partner.' },
  ],
  'piggy-3': [
    { speaker: 'narrator', text: 'Moving day. Piggy 3 needs three trips.' },
    { speaker: 'narrator', text: 'He owns a printer, a printer, and a smaller printer.' },
    { speaker: 'piggy-3', expression: 'bashful_smile', text: "The small one's for you. Okay okay okay, I'm making the home screen so good." },
  ],
};

/** Hints for the Profiles card (item ids must match the pet module's secretFavorite()). */
export const SECRET_FAVORITE: Record<PigId, { item: string; name: string; hint: string }> = {
  'piggy-1': {
    item: 'strawberry_milk', name: 'Strawberry Milk',
    hint: 'Something pink, cold and very un-athletic. He keeps it hidden behind his sports drinks.',
  },
  'piggy-2': {
    item: 'truffle_fries', name: 'Truffle Fries',
    hint: 'He calls fries "nutritionally indefensible"… unless they are the fancy kind.',
  },
  'piggy-3': {
    item: 'sakura_dango', name: 'Sakura Dango',
    hint: 'Three colors on a stick. He goes quiet whenever a shop has them.',
  },
};

// ── shop ──

export type ShopLocation = 'reitz' | 'midtown' | 'shands';

export const SHOPS: Record<ShopLocation, { name: string; jp: string; place: string }> = {
  reitz: { name: 'Union Market', jp: 'ユニオン・マーケット', place: 'Reitz Union' },
  midtown: { name: 'Midtown Late-Night', jp: 'ミッドタウン・ナイト', place: 'University Ave' },
  shands: { name: 'Shands Pharmacy', jp: 'シャンズ薬局', place: 'UF Health Shands' },
};

export interface CashierLines { greet: string[]; buy: string[]; broke: string[]; bye: string[] }

export const CASHIER: Record<PigId, CashierLines> = {
  'piggy-1': {
    greet: [
      "Welcome to the Union Market! I'm on register today. Let's goooo!",
      "Hey, teammate! Snack run? I've got stats on every snack in here.",
      "Register's open! Ball's up — what are we getting?",
    ],
    buy: [
      'Nice set! Bagged it.',
      "Clean transaction. That's a perfect API call!",
      'Rung up! {qty} × {item}. Personal record, probably.',
    ],
    broke: [
      "Short on acorns? No stress. Mini-games pay out, and I'll hold the rally!",
      "Not enough acorns yet. We lost one point, not the set!",
    ],
    bye: ['Good rally! Come back anytime!'],
  },
  'piggy-2': {
    greet: [
      'Welcome. Everything here is based. Mostly.',
      "Register's open. Hydrate first, questions second.",
      "Hey. I'm covering the register. Pick something with good perfusion.",
    ],
    buy: [
      '{price} acorns. Based purchase.',
      'Transaction complete. Patriot.',
      'Bagged. Store at room temperature. Like a professional.',
    ],
    broke: [
      'Insufficient acorns. Not a diagnosis. Just math.',
      "You're a few acorns short. Play a mini-game, then come back. Based.",
    ],
    bye: ['Hydrate. Stay based.'],
  },
  'piggy-3': {
    greet: [
      'Oh! Hi. I redid the price tags — the old ones looked like a microwave clock.',
      'Okay, so I was thinking… you should get the onigiri. Best for what? Best for lunch.',
      "Hey! Take your time. I'm basically just people-watching the snacks.",
    ],
    buy: [
      "Okay, it's yours! That was a good pick, actually.",
      "Done. I'd print you a receipt, but the printer is busy printing… a smaller printer.",
      'Rung up. {qty} of them! Nice.',
    ],
    broke: [
      "Hmm, the numbers don't line up yet. A couple more acorns and we're there.",
      'Actually — you are a few acorns short. The mini-games pay out, though!',
    ],
    bye: ['See you! Wait, actually — come back later? I might redo the shelves.'],
  },
};

/** Location-specific greetings that replace the generic ones. */
export const SHOP_GREET: Partial<Record<ShopLocation, Partial<Record<PigId, string[]>>>> = {
  midtown: {
    'piggy-1': ['Late-night snack run? Respect. Practice is at seven, though!'],
    'piggy-2': ["It's late. Eat something, then sleep. Doctor's orders. Sleep-deprived doctor's."],
    'piggy-3': ['Oh, hey! Night owl club. The boba place next door is basically my second office.'],
  },
  shands: {
    'piggy-1': ["Piggy 2 left me in charge of the pharmacy for five minutes. I'm doing great. Probably."],
    'piggy-2': ['Pharmacy is open. Take with food. Hydrate. Based.', 'Feeling off? Medicine is on the shelf. Rest is free.'],
    'piggy-3': ["I'm covering for Piggy 2. He labeled everything. Like, everything. It's honestly a great UI."],
  },
};

/** Fill {key} placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function pickOne<T>(list: readonly T[], seed = Math.random()): T {
  return list[Math.min(list.length - 1, Math.floor(seed * list.length))];
}

// ── intake form (built-in prologue fallback) ──

export const NAME_MAX = 12;
export const RANDOM_NAMES = ['Alex', 'Sam', 'Jordan', 'Riley', 'Taylor', 'Casey', 'Morgan', 'Jamie', 'Avery', 'Quinn', 'Rowan', 'Mika', 'Remy', 'Sky', 'Gator'];

export type WhyUf = 'computing' | 'medicine' | 'physics' | 'arts' | 'undecided';
export type SleepType = 'early' | 'night' | 'nosleep';

export const WHY_UF: { id: WhyUf; label: string; pig?: PigId }[] = [
  { id: 'computing', label: 'Computing', pig: 'piggy-1' },
  { id: 'medicine', label: 'Medicine & Life Sciences', pig: 'piggy-2' },
  { id: 'physics', label: 'Physics & Engineering', pig: 'piggy-3' },
  { id: 'arts', label: 'Arts & Humanities' },
  { id: 'undecided', label: 'Still deciding' },
];

export const SLEEP: { id: SleepType; label: string; pig: PigId }[] = [
  { id: 'early', label: 'Early bird', pig: 'piggy-1' },
  { id: 'night', label: 'Night owl', pig: 'piggy-3' },
  { id: 'nosleep', label: '"What\'s sleep?"', pig: 'piggy-2' },
];

export const INTAKE_REACTION = {
  name: { speaker: 'piggy-1', expression: 'happy', text: 'Nice name! Real team-captain energy.' } as MetaLine,
  why: {
    computing: { speaker: 'piggy-1', expression: 'excited', text: "A fellow coder?! Let's goooo!" },
    medicine: { speaker: 'piggy-2', expression: 'proud', text: 'Medicine. Based.' },
    physics: { speaker: 'piggy-3', expression: 'happy', text: 'Oh! Physics. Okay, so I was thinking we should hang out. Not in a weird way.' },
    arts: { speaker: 'piggy-3', expression: 'happy', text: 'Arts & Humanities! Somebody has to make our stuff look good. Seriously.' },
    undecided: { speaker: 'piggy-1', expression: 'happy', text: "Undeclared is just a free ball. Every option's open!" },
  } as Record<WhyUf, MetaLine>,
  sleep: {
    early: { speaker: 'piggy-1', expression: 'excited', text: 'Sunrise crew! Sand courts at six, teammate?' },
    night: { speaker: 'piggy-3', expression: 'happy', text: 'Night owl. Marston at 2 a.m. is basically my second apartment.' },
    nosleep: {
      speaker: 'piggy-2', expression: 'thinking',
      text: "Sleep is when your glymphatic system clears out the brain. Seven hours. Minimum. That's not advice. That's perfusion.",
    },
  } as Record<SleepType, MetaLine>,
  food: { speaker: 'piggy-2', expression: 'neutral', text: '{food}. Noted in your chart. Based.' } as MetaLine,
  porkFood: { speaker: 'piggy-2', expression: 'angry', text: "…Not based. I'm writing down soup." } as MetaLine,
};

const PORK = /\b(bacon|ham|hams|pork|porkchops?|sausages?|pepperoni|prosciutto|chorizo|salami|carnitas|ribs|spare ?ribs|spam|chicharr[oó]n(?:es)?|lech[oó]n|tonkatsu|char ?siu|chashu|hot ?dogs?)\b/i;

/** No pork food, ever: a pig never notes it down as your comfort food. */
export function isPorkFood(text: string): boolean {
  return PORK.test(text);
}

/** Every pork word swapped for something a pig would actually eat. */
export function swapPork(text: string, swap = 'banana'): string {
  return text.replace(new RegExp(PORK.source, 'gi'), swap);
}

/** Trim, drop control characters and collapse spaces; cap by code points. */
export function cleanText(raw: string, max: number): string {
  const s = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('').trim();
}

export interface IntakeAnswers { name: string; whyUf: WhyUf; sleep: SleepType; comfortFood: string }

export interface IntakeResult {
  name: string;
  comfortFood: string;
  porkSwap: boolean;
  bonds: Record<PigId, number>;
  /** Memory facts (`key=value`, same shape as KScript `[input]`) every pig remembers. */
  facts: string[];
  /** `fact.<key>` (what KScript `{fact:key}` reads) plus `intake.*` ids for scene conditions. */
  flags: Record<string, string>;
}

/** GAME_DESIGN §3: Computing → P1 +30, Medicine → P2 +30, Physics → P3 +30; early bird → P1 +20,
 *  night owl → P3 +20, "What's sleep?" → P2 +20. */
export function applyIntake(a: IntakeAnswers): IntakeResult {
  const name = cleanText(a.name, NAME_MAX) || 'You';
  let food = cleanText(a.comfortFood, 24) || 'muffin';
  const porkSwap = isPorkFood(food);
  if (porkSwap) food = 'soup';
  const bonds: Record<PigId, number> = { 'piggy-1': 0, 'piggy-2': 0, 'piggy-3': 0 };
  const why = WHY_UF.find((w) => w.id === a.whyUf) ?? WHY_UF[4];
  if (why.pig) bonds[why.pig] += 30;
  const sleep = SLEEP.find((s) => s.id === a.sleep) ?? SLEEP[0];
  bonds[sleep.pig] += 20;
  const sleepLabel = sleep.label.replace(/"/g, '');
  return {
    name,
    comfortFood: food,
    porkSwap,
    bonds,
    facts: [`why_uf=${why.label}`, `sleep=${sleepLabel}`, `comfort_food=${food}`],
    flags: {
      'fact.why_uf': why.label,
      'fact.sleep': sleepLabel,
      'fact.comfort_food': food,
      'intake.why_uf': why.id,
      'intake.sleep': sleep.id,
    },
  };
}

// ── credits ──

export interface CreditBlock { heading?: string; lines: string[]; big?: boolean; /** lines 0–2 are Piggy 1–3 */ cast?: boolean }

export const CREDITS: CreditBlock[] = [
  { big: true, lines: ['KEMPANION ONLINE', 'a Kempa AI production'] },
  { heading: 'Starring', cast: true, lines: [
    "Piggy 1 — first-year AIBHS master's · Kempa AI ambassador · volleyball",
    'Piggy 2 — MD · PGY-4 neurosurgery resident (research year)',
    'Piggy 3 — builder · physics computational lab',
    'and you, as yourself',
  ] },
  { heading: 'Story, Design & Code', lines: ['Kempa AI'] },
  { heading: 'Music & SFX', lines: ['Procedural chiptune by the Kempa Synth', '(Rust → WebAssembly)'] },
  { heading: 'Big Brain', lines: [
    'Liquid AI LFM via Transformers.js + ONNX Runtime Web',
    '(optional, runs on your device)',
    'Transformers.js — Apache-2.0 · ONNX Runtime Web — MIT',
  ] },
  { heading: 'Heuristic Brain', lines: ['Hand-written by Kempa AI, no download required'] },
  { heading: 'Fonts', lines: ['DotGothic16 · Pixelify Sans', 'SIL Open Font License'] },
  { heading: 'Backgrounds', lines: [
    'Pixel art generated for Kempa AI',
    'Campus scenes painted from Wikimedia Commons photos by',
    'Pinofarese · WillMcC · Daysaway · Hughs · Reitz Union · William M · Porsche997SBS',
    'Those scenes and the CGs set in them: CC BY-SA 4.0',
    'creativecommons.org/licenses/by-sa/4.0',
    'Sources: github.com/mkieffer1107/kempanion-online',
    '(art-src/bg/REFERENCES.md)',
  ] },
  { heading: 'Characters', lines: ['Piggy 1, Piggy 2 and Piggy 3 by Kempa AI'] },
  { heading: 'Built with', lines: ['Svelte · TypeScript · Vite · Bun', 'Open-source licenses: kempanion.online/third-party-notices.txt'] },
  { heading: 'Special Thanks', lines: [
    'The Lake Alice bats, for showing up at dusk',
    'The Plaza squirrels, for keeping us humble',
    'Every sakura that blooms out of season',
  ] },
  { lines: [
    'Kempanion Online is a fan-made work.',
    'It is not affiliated with or endorsed by the University of Florida.',
    'No real-world logos or marks are used.',
  ] },
];

export const SIGN_OFF: Record<PigId, string> = {
  'piggy-1': 'Good rally today. Same time tomorrow?',
  'piggy-2': "Hydrate. Sleep. Doctor's orders. Stay based.",
  'piggy-3': "Okay, I'll— yeah. Bye! Wait, actually— see you tomorrow?",
};
