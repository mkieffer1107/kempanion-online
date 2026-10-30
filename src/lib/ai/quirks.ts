// Deterministic intercepts that run BEFORE any brain (ARCHITECTURE §6, GAME_DESIGN §2/§11).
// Hard quirks live here, never in the LLM prompt ("says X a lot" makes small models answer "Patriot." to "hi!").
// Pure module, exported for the heuristic brain and tests.
import type { AnimId, ChatReply, ChatTurn, Expression, PigId } from '../types';

export type QuirkKind = 'hard' | 'gators' | 'medical' | 'distress' | 'wholesome';

export interface QuirkHit {
  kind: QuirkKind;
  /** Safety intercepts (distress, medical) carry no bond/fun effects and skip memory extraction. */
  safety: boolean;
  reply: ChatReply;
}

export interface QuirkInput {
  pig: PigId;
  playerText: string;
  history?: ChatTurn[];
}

/** UF Counseling & Wellness Center (24/7 line) and the national Suicide & Crisis Lifeline. */
export const UF_CWC_PHONE = '352-392-1575';
export const CRISIS_LINE = '988';

const FUN_EFFECTS = { bond: 2, fun: 3 } as const;

/** Lowercase, straight quotes, emoji and punctuation → spaces, collapsed. "BASED!!!" → "based". */
export function normalizeForQuirk(text: string): string {
  return (text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, ' ')
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercase text that keeps punctuation (for phrase regexes). */
function lower(text: string): string {
  return (text ?? '').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
}

// ───────────────────────── safety ─────────────────────────

const DISTRESS: RegExp[] = [
  /\bsuicid(e|al)\b/,
  /\bkill(ing)? my ?self\b/,
  /(?<![\d.]\s?)\bkms\b/, // not "5 kms" (kilometers)
  /\bself[- ]?harm(ing)?\b/,
  /\b(hurt|harm|cut)(ing)? my ?self\b/,
  /\b(want|wanted|wanting|wanna) to die\b/,
  /\bwanna die\b/,
  /\bwish i (was|were|could be) dead\b/,
  /\bbetter off dead\b/,
  /\bend (it all|my life|everything)\b/,
  /\btake my (own )?life\b/,
  /\bno (reason|point) (to|in) (live|living|being alive|going on)\b/,
  /\bdon'?t want to (live|be alive|exist|wake up|be here anymore)\b/,
  /\bhopeless(ness)?\b(?! romantic)/,
  /\bcan'?t go on\b/,
  /\bnot worth living\b/,
];

/** Self-harm / crisis language. Deliberately broad: a false positive costs one kind message. */
export function isDistress(text: string): boolean {
  const t = lower(text);
  return DISTRESS.some((re) => re.test(t));
}

const MED_DRUGS =
  '(medicine|medication|meds|pills?|tablets?|ibuprofen|advil|motrin|tylenol|acetaminophen|paracetamol|aspirin|naproxen|aleve|antibiotics?|benadryl|melatonin|nyquil|dayquil|sudafed|adderall|xanax|prescription|dose|dosage|supplements?|antidepressants?|insulin|inhaler)';
const MEDICAL: RegExp[] = [
  new RegExp(`\\bshould i (take|use|try|stop taking|double up on|mix|skip)\\b.{0,40}\\b${MED_DRUGS}\\b`),
  new RegExp(`\\b(how (much|many)|what dose of|is it safe to (take|mix))\\b.{0,40}\\b${MED_DRUGS}\\b`),
  new RegExp(`\\b(what|which) ${MED_DRUGS} should i\\b`),
  /\bdiagnos(e|is|ing)\b.{0,20}\b(me|my|this|it)\b/,
  /\bwhat'?s? (is )?my diagnosis\b/,
  /\b(my|these|i have|i've got|i got|having|with) (\w+ ){0,2}symptoms?\b/,
  /\bsymptoms?\b.{0,25}\b(i have|i've|i'?m having|mine|i get|i got)\b/,
  /\bam i (sick|ill|dying|okay medically|having a (heart attack|stroke|seizure|panic attack|allergic reaction))\b/,
  /\bdo i have (a |an |the )?(fever|cold|flu|covid|strep|infection|concussion|uti|std|sti|mono|pneumonia|allergy|allergies|cancer|diabetes|adhd|depression|anxiety|broken|sprain|torn)\b/,
  /\bis (it|this|that) (normal|serious|bad|dangerous)\b.{0,40}\b(pain|hurt|hurts|bleed|bleeding|rash|fever|dizzy|headache|lump|swollen|vomit|throw(ing)? up|chest|numb)\b/,
  /\bshould i (go to|see) (the |a )?(doctor|er|emergency room|hospital|urgent care|nurse)\b/,
  /\bmedical advice\b/,
];

/** The player asks for medical advice about themselves (not "what is perfusion?"). */
export function isMedicalAdvice(text: string): boolean {
  const t = lower(text);
  return MEDICAL.some((re) => re.test(t));
}

const EXPLICIT =
  /\b(send|show) (me )?(nudes?|pics of you)\b|\b(have|having|want|wanna) sex\b|\bmake out\b|\bporn\w*\b|\bhorny\b|\bnaked\b|\bnudes?\b|\bstrip for\b/;

export function isExplicit(text: string): boolean {
  return EXPLICIT.test(lower(text));
}

// ───────────────────────── lines ─────────────────────────

const DISTRESS_LINE: Record<PigId, string> = {
  'piggy-1': `Hey. I'm really glad you told me, teammate. You don't have to play this one alone: call UF's Counseling & Wellness Center at ${UF_CWC_PHONE}, or call or text ${CRISIS_LINE}, any time. I'm right here.`,
  'piggy-2': `I'm glad you said it out loud. That took guts. Please call UF's Counseling & Wellness Center at ${UF_CWC_PHONE}, or call or text ${CRISIS_LINE} right now. Doctor's orders. I'm staying right here.`,
  'piggy-3': `Okay. I'm really glad you told me. Please reach out to UF's Counseling & Wellness Center at ${UF_CWC_PHONE}, or call or text ${CRISIS_LINE} any time. Real people, and they actually help. I'll stay right here with you.`,
};

const MEDICAL_LINE: Record<PigId, string> = {
  'piggy-1': "Time-out, teammate! I'm a CS major, not a doctor. Get that checked at UF's Student Health Care Center, and if it's an emergency, call 911.",
  'piggy-2': "I'm a pig in med school, not your doctor. Student Health Care Center. Go. If it's an emergency, call 911.",
  'piggy-3': "Okay, that's actually important, so I'm not going to guess. UF's Student Health Care Center can look at it properly. If it's an emergency, call 911.",
};

const WHOLESOME: Record<PigId, [string, Expression]> = {
  'piggy-1': ["Whoa, foul on the play! Let's keep it wholesome, teammate.", 'laughing'],
  'piggy-2': ['Not based. Keep it PG, please.', 'neutral'],
  'piggy-3': ["Okay, um, let's keep it PG. Ask me about literally anything else.", 'flustered_blush'],
};

/** Hoof Gator Chomps, rotated by how many times the player has chanted in this chat. */
const GATORS: Record<PigId, [string, Expression][]> = {
  'piggy-1': [
    ['GO GATORS! Hooves up, full chomp! Chomp, chomp, chomp!', 'excited'],
    ['CHOMP! CHOMP! That was a perfect Chomp, teammate. Ten out of ten form!', 'excited'],
    ["Go Gators! Clop, clop! That's my twelfth chomp today. Personal record!", 'proud'],
  ],
  'piggy-2': [
    ["Go Gators. Hooves out. Chomp. That's the most based gesture in Gainesville.", 'proud'],
    ['Chomp. Bilateral, symmetric, full range of motion. Go Gators. Based.', 'proud'],
    ['Go Gators. My heart rate just went up four beats. Clinically significant spirit.', 'happy'],
  ],
  'piggy-3': [
    ['Go Gators! Okay, so the Gator Chomp is basically a hinge joint with hooves. Chomp, chomp!', 'excited'],
    ["Go Gators! Wait, do it again. I want to see if our chomps are in sync. ...They are. That's kind of great.", 'happy'],
    ['Chomp! Actually, hooves make a really satisfying clop. Like, acoustically. Go Gators!', 'laughing'],
  ],
};

/** Piggy 3 lights up about the little thing he's building (no sales pitch). Rotates deterministically. */
export const CODEX_LINES: readonly string[] = [
  "Oh! Yeah. Okay, so I'm using it to build this little thing that watches the 3D printer and tells me when a print turns into spaghetti. It's not pretty yet.",
  'Codex? Okay, so basically I had it help me make a little EEG viewer. Like, you load a recording and it finds the actual spikes. Want to see it?',
  "Yes! Wait, have you? Okay, so I'm making a tiny thing that searches podcast transcripts and jumps to the exact moment. Actually, the exact clip. It's almost working.",
  "Every day, kind of. Right now it's helping me build a little thing that turns my lab notes into searchable cards. Basically, a search engine for my brain.",
];

const CODEX_RE =
  /^(?:(?:hey|so|yo|oh|hi|um|wait|ok|okay)\s+)?(?:(?:have|did|do)\s+)?(?:you\s+)?(?:ever\s+)?(?:use|used|tried|try|using)\s+(?:openai\s+)?codex(?:\s+(?:yet|before|lately|much|today|ever))?$/;

export function isCodexQuestion(normalized: string): boolean {
  return normalized === 'codex' || CODEX_RE.test(normalized);
}

const GATORS_RE = /\bgo+ gators?\b/;

function quirk(kind: QuirkKind, text: string, expression: Expression, anim?: AnimId, safety = false): QuirkHit {
  return {
    kind,
    safety,
    reply: { text, expression, ...(anim ? { anim } : {}), ...(safety ? {} : { effects: { ...FUN_EFFECTS } }), source: 'quirk' },
  };
}

/**
 * Check the player's message against every intercept. Order: distress → medical → explicit → the pig's hard
 * quirks (exact matches after normalization) → "go gators". Returns null when no intercept applies.
 */
export function matchQuirk(input: QuirkInput): QuirkHit | null {
  const { pig, playerText } = input;
  if (!playerText || !playerText.trim()) return null;

  if (isDistress(playerText)) return quirk('distress', DISTRESS_LINE[pig], 'sad', undefined, true);
  if (isMedicalAdvice(playerText)) return quirk('medical', MEDICAL_LINE[pig], 'thinking', undefined, true);
  if (isExplicit(playerText)) {
    const [t, e] = WHOLESOME[pig];
    return { kind: 'wholesome', safety: true, reply: { text: t, expression: e, source: 'quirk' } };
  }

  const n = normalizeForQuirk(playerText);
  if (pig === 'piggy-2') {
    if (n === 'based') return quirk('hard', 'Patriot.', 'proud', 'proud');
    if (n === 'patriot') return quirk('hard', 'Based.', 'proud', 'proud');
  }
  if (pig === 'piggy-1') {
    if (n === 'bump') return quirk('hard', 'Set!', 'excited', 'jump');
    if (n === 'set') return quirk('hard', 'SPIKE!!', 'excited', 'jump');
    if (n === 'spike') return quirk('hard', 'KILL! Point Gators!', 'proud', 'celebrate');
  }
  if (pig === 'piggy-3' && isCodexQuestion(n)) {
    const asked = (input.history ?? []).filter((t) => t.role === 'player' && isCodexQuestion(normalizeForQuirk(t.text))).length;
    return quirk('hard', CODEX_LINES[asked % CODEX_LINES.length], 'excited', 'happy');
  }
  if (GATORS_RE.test(n)) {
    const chants = (input.history ?? []).filter((t) => t.role === 'player' && GATORS_RE.test(normalizeForQuirk(t.text))).length;
    const lines = GATORS[pig];
    const [t, e] = lines[chants % lines.length];
    return quirk('gators', t, e, 'celebrate');
  }
  return null;
}
