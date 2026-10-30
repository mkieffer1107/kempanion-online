// Line templating ({player}, {food}, {major|your classes}…), remembered-fact parsing, safe echoes of player text,
// and the sentence counter used to keep replies within 3 sentences.

export type Vars = Readonly<Record<string, string | undefined>>;

const PLACEHOLDER = /\{([a-z_]+)(?:\|([^{}]*))?\}/g;

/** Placeholder names a line may use (anything else is a bug the tests catch). */
export const KNOWN_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'player', 'time', 'tod', 'day', 'place', 'home', 'food', 'other', 'otherplace', 'last', 'said', 'n',
  'major', 'hometown', 'comfort_food', 'likes', 'year', 'exam', 'chronotype',
]);

/** Placeholders always available, so lines using them never get filtered out. */
const ALWAYS = new Set(['player', 'time', 'tod', 'day', 'place', 'home']);

export function placeholdersIn(text: string): { key: string; fallback?: string }[] {
  const out: { key: string; fallback?: string }[] = [];
  for (const m of text.matchAll(PLACEHOLDER)) out.push({ key: m[1], fallback: m[2] });
  return out;
}

/** True when the line depends on a remembered or situational value (it is more personal, so it is preferred). */
export function isPersonal(text: string): boolean {
  return placeholdersIn(text).some((p) => !ALWAYS.has(p.key) && p.fallback === undefined);
}

/**
 * Fill placeholders. Returns null when a placeholder without a fallback has no value, so the caller can skip
 * the line. A value that starts a sentence is capitalized ("{place} is…" → "The Plaza is…").
 */
export function fill(text: string, vars: Vars): string | null {
  let missing = false;
  const out = text.replace(PLACEHOLDER, (_m, key: string, fb: string | undefined, offset: number, whole: string) => {
    let v = vars[key];
    if (v === undefined || v === '') {
      if (fb === undefined) {
        missing = true;
        return '';
      }
      v = fb;
    }
    const before = whole.slice(0, offset);
    if (/^\s*$/.test(before) || /[.!?]["”')\]]*\s+$/.test(before)) v = v.charAt(0).toUpperCase() + v.slice(1);
    return v;
  });
  return missing ? null : out;
}

/**
 * Sentence count: a terminator (. ! ? …, repeated, optionally followed by a closing quote) that ends the text
 * or is followed by whitespace and a capital letter/digit. "…" before a lowercase word is a pause, not an end.
 */
export function sentenceCount(text: string): number {
  const m = text.trim().match(/[.!?…]+["”’')\]]*(?=\s+["“‘'(\[]?[A-Z0-9]|\s*$)/g);
  return Math.max(1, m ? m.length : 0);
}

// ───────────── safe echoes of player text ─────────────

const BLOCKED = /\b(?:fuck\w*|shit\w*|bitch\w*|ass|asshole\w*|dick\w*|cock\w*|puss\w*|cunt\w*|sex\w*|porn\w*|nazi\w*|hitler|kill\w*|die|died|dead|death|suicid\w*|rape\w*|drugs?|weed|cocaine|meth|krishna\w*|bait|bacon|hams?|pork\w*|sausages?|pepperoni|hate\w*|stupid|idiot\w*|slut\w*|whore\w*|fag\w*|retard\w*|nigg\w*|kkk|terror\w*|bomb\w*|guns?|shoot\w*|politic\w*|trump|biden|maga|democrat\w*|republican\w*)\b/i;

/** Clean a short piece of player text for echoing back, or undefined if it is too long or not kind. */
export function safeEcho(raw: string | undefined, maxWords = 3, maxLen = 24): string | undefined {
  if (!raw) return undefined;
  const s = raw.replace(/[^a-z0-9&' -]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > maxLen || s.split(' ').length > maxWords || BLOCKED.test(s)) return undefined;
  return s;
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s-])([a-z])/g, (_m, sep: string, c: string) => sep + c.toUpperCase());
}

const STOP_TAIL = '(?=\\s+(?:and|but|at|because|so|in|with|now|right|too|a lot|very much|originally|though)\\b|$)';

/** Pull the shared value out of "my name is …", "I study …", "I'm from …", "I love …" (normalized text). */
export function extractSaid(text: string, topic: string | undefined): string | undefined {
  let m: RegExpExecArray | null = null;
  switch (topic) {
    case 'name':
      m = /\b(?:my name is|call me|i go by)\s+([a-z][a-z'-]{1,15})\b/.exec(text);
      return m ? optTitle(safeEcho(m[1], 1, 16)) : undefined;
    case 'major':
      m = new RegExp(`\\b(?:i study|i am studying|my major is|i major in|i am majoring in)\\s+([a-z][a-z ]*?)${STOP_TAIL}`).exec(text)
        ?? /\bi am (?:a |an )?([a-z]+) major\b/.exec(text);
      return m ? safeEcho(m[1], 3, 28) : undefined;
    case 'hometown':
      m = new RegExp(`\\b(?:i am from|i grew up in|my hometown is)\\s+([a-z][a-z ]*?)${STOP_TAIL}`).exec(text);
      return m ? optTitle(safeEcho(m[1], 3, 24)) : undefined;
    case 'likes':
      m = new RegExp(`\\bi (?:really )?(?:like|love|enjoy|adore|am into)\\s+([a-z][a-z ]*?)${STOP_TAIL}`).exec(text);
      return m ? safeEcho(m[1], 3, 24) : undefined;
    default:
      return undefined;
  }
}

function optTitle(s: string | undefined): string | undefined {
  return s ? titleCase(s) : undefined;
}

// ───────────── remembered facts ─────────────

const FACT_KEYS: Record<string, string> = {
  major: 'major', study: 'major', studies: 'major', field: 'major', interest: 'major', brings: 'major',
  brings_you: 'major', brings_you_to_uf: 'major', what_brings_you_to_uf: 'major', path: 'major',
  hometown: 'hometown', home: 'hometown', from: 'hometown', home_town: 'hometown',
  comfort_food: 'comfort_food', comfortfood: 'comfort_food',
  likes: 'likes', like: 'likes', hobby: 'likes', hobbies: 'likes',
  exam: 'exam', exams: 'exam', test: 'exam',
  chronotype: 'chronotype', sleep: 'chronotype', early_bird: 'chronotype', bird_or_owl: 'chronotype',
  year: 'year', class_year: 'year',
};

/**
 * Turn the pig's memory strings into fact slots. Accepts both "key=value" (intake form / KScript [input])
 * and prose like "Player's major is biology." or "Player is from Tampa.".
 */
export function parseFacts(memories: readonly string[] | undefined): Record<string, string> {
  const facts: Record<string, string> = {};
  const put = (key: string, value: string | undefined) => {
    const clean = safeEcho(value?.replace(/[.!]+$/, ''), 4, 32);
    if (!clean || facts[key]) return;
    if (key === 'major' && /\b(?:still deciding|undecided|not sure|unsure|deciding)\b/i.test(clean)) return;
    facts[key] = key === 'hometown' ? titleCase(clean) : clean;
  };
  for (const raw of memories ?? []) {
    const t = String(raw ?? '').trim();
    if (!t) continue;
    const kv = /^([a-z][a-z _-]{1,30}?)\s*[=:]\s*(.+)$/i.exec(t);
    const kvKey = kv ? FACT_KEYS[kv[1].toLowerCase().replace(/[\s-]+/g, '_')] : undefined;
    if (kv && kvKey) {
      put(kvKey, kv[2]);
      continue;
    }
    let r: RegExpExecArray | null;
    if ((r = /\bmajor is ([^.,;]+)/i.exec(t) ?? /\b(?:studies|is studying|majoring in) ([^.,;]+)/i.exec(t))) put('major', r[1]);
    if ((r = /\b(?:is from|comes from|grew up in|hometown is) ([^.,;]+)/i.exec(t))) put('hometown', r[1]);
    if ((r = /\bcomfort food is ([^.,;]+)/i.exec(t))) put('comfort_food', r[1]);
    if ((r = /\b(?:likes|loves|enjoys|is into) (?!to be called\b)([^.,;]+)/i.exec(t))) put('likes', r[1].replace(/\btheir\b/gi, 'your'));
    if ((r = /\b(?:has|have) (?:an? |the )?([^.,;]*?\b(?:exam|midterm|final|test|quiz))\b/i.exec(t))) put('exam', r[1]);
    if ((r = /\b(early bird|night owl)\b/i.exec(t))) put('chronotype', r[1].toLowerCase());
    if ((r = /\b(freshman|sophomore|junior|senior|grad student|graduate student|first year|second year|third year|fourth year)\b/i.exec(t))) {
      put('year', r[1].toLowerCase());
    }
  }
  return facts;
}
