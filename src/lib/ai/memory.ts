// Regex fact extraction from the player's messages ("What {Pig} knows about you"). Pure: storage goes through a
// small MemoryStore interface (the AI host wires it to game.remember / game.forget).
import { PIG_IDS, type PigId } from '../types';

export type FactKey =
  | 'name' | 'nickname' | 'hometown' | 'major' | 'year' | 'likes' | 'dislikes' | 'favorite' | 'exam' | 'pet';

export interface LearnedFact {
  key: FactKey;
  /** Sentence stored in save.memories, e.g. "Player's major is biology." */
  fact: string;
  /** Said with "don't tell…": kept by the pig who heard it, not shared with the others. */
  private: boolean;
  /**
   * Single-valued facts replace older facts matching this pattern (a new major replaces the old one).
   * Absent for additive facts (likes, pets…).
   */
  replaces?: RegExp;
  /** Exams/deadlines with a day: when to ask how it went (local YYYY-MM-DD). */
  followUp?: { date: string; about: string };
}

export interface MemoryStore {
  remember(pig: PigId, fact: string): void;
  /** Remove facts matching the predicate (optional; used to replace single-valued facts). */
  forget?(pig: PigId, predicate: (fact: string) => boolean): void;
}

export const SECRET_MARK = ' (secret)';
const MAX_VALUE = 40;

/** Values that are clauses or filler, not facts. */
const BAD_START =
  /^(to|for|at|in|on|with|about|so|really|very|just|it|that|this|them|him|her|you|your|yours|u|ur|me|everything|nothing|anything|something|when|how|what|why|who|because|but|and|or|if|as|like|though|being|having|doing|getting)\b/i;
const LIKE_BAD_START = /^(how|when|what|why|who|that|it|this|them|him|her|you|your|yours|u|ur|because|if|so|but|and|or|being|having|me)\b/i;
const PRONOUN_ONLY = /^(it|that|this|them|him|her|you|u|those|these|stuff|things?|everything|nothing|anything|one|ones)$/i;

/** First-person → third-person inside a captured value ("my dog" → "their dog"). */
function thirdPerson(s: string): string {
  return s
    .replace(/\bmy\b/gi, 'their')
    .replace(/\bmine\b/gi, 'theirs')
    .replace(/\bmyself\b/gi, 'themself')
    .replace(/\bme\b/gi, 'them')
    .replace(/\bI'm\b/g, "they're")
    .replace(/\bI\b/g, 'they');
}

/** Trim a captured value at clause boundaries and punctuation; cap its length. */
function clean(raw: string, maxWords = 6): string {
  let v = raw
    .split(/\s*(?:[!?;,]|\.(?:\s|$)|\b(?:and then|but|because|so|though|although|since|lol|lmao|haha|tbh|honestly|right now|rn)\b)\s*/i)[0]
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = v.split(' ');
  if (words.length > maxWords) v = words.slice(0, maxWords).join(' ');
  if (v.length > MAX_VALUE) v = v.slice(0, MAX_VALUE).replace(/\s+\S*$/, '');
  return v.replace(/[\s'’.-]+$/, '');
}

function isUsable(v: string): boolean {
  return !!v && /[\p{L}\p{N}]/u.test(v) && !PRONOUN_ONLY.test(v);
}

/** Pattern for "facts that start with this prefix" (optionally ending in the secret marker). */
function prefixRe(prefix: string): RegExp {
  return new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

function cap1(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const NOT_NAMES =
  /^(fine|good|okay|ok|tired|hungry|sad|happy|bored|back|here|home|sorry|sure|done|busy|sick|great|new|lost|not|so|just|from|in|at|a|an|the|very|really|excited|stressed|alright|cool|glad|ready|late|early|free|okayy|awake|up|down|alive|good|bad|well|confused|curious|thinking|studying|working|joking|kidding|serious|mad|nervous|scared|hangry|thirsty|cold|hot|warm|full|broke|single|taken|human|pig|a\s.*)$/i;

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WD_RE = '(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?\\b';
const EVENT_RE =
  '(exam|test|midterm|final|quiz|presentation|deadline|interview|essay|paper|project|lab report|problem set|pset|recital|game|match|tournament|audition)s?';
const EXAM_LIKE = /^(exam|test|midterm|final|quiz|presentation|interview|audition|recital|deadline)s?$/;
const PETS =
  '(dog|puppy|cat|kitten|kitty|hamster|rabbit|bunny|bird|parrot|parakeet|fish|goldfish|turtle|tortoise|snake|lizard|gecko|guinea pig|ferret|horse|pig|chicken|duck|hedgehog|rat|mouse|axolotl|frog)';
const YEARS =
  "(freshman|sophomore|junior|senior|first[- ]year|second[- ]year|third[- ]year|fourth[- ]year|fifth[- ]year|grad(?:uate)? student|phd student|master'?s student|med student|medical student|transfer student|exchange student|postdoc)";

function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function weekdayIndex(word: string): number {
  const w = word.toLowerCase().slice(0, 3);
  return WEEKDAYS.findIndex((d) => d.startsWith(w));
}

/** Resolve "friday" / "next friday" / "tomorrow" / "today" / "tonight" / "next week" to a local date. */
export function resolveDay(when: string, now: Date): Date | null {
  const w = when.toLowerCase().replace(/\s+/g, ' ').trim();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const plus = (n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  if (/^(today|tonight|this (morning|afternoon|evening))$/.test(w)) return base;
  if (/^tomorrow( (morning|afternoon|night|evening))?$/.test(w)) return plus(1);
  if (w === 'next week') return plus(7);
  const m = new RegExp(`^(?:this |next |on )?${WD_RE}$`).exec(w);
  if (m) {
    const target = weekdayIndex(m[1]);
    if (target < 0) return null;
    let diff = (target - base.getDay() + 7) % 7;
    if (/^next /.test(w) && diff < 2) diff += 7;
    return plus(diff);
  }
  return null;
}

/**
 * Extract facts the player states about themselves. Deterministic; `now` resolves "Friday" to a date.
 */
export function extractFacts(text: string, now: Date = new Date()): LearnedFact[] {
  const out: LearnedFact[] = [];
  if (!text || text.length > 600) return out;
  const raw = text.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const isPrivate =
    /\b(don'?t|do not|dont|never) tell\b|\bkeep (it|this) (a )?secret\b|\bbetween (you and me|us)\b|\bpromise not to tell\b|\b(it'?s|this is) a secret\b|\bsecret:/i.test(raw);
  const add = (f: Omit<LearnedFact, 'private'>) => {
    if (out.some((o) => o.fact === f.fact)) return;
    out.push({ ...f, private: isPrivate });
  };

  for (const s of raw.split(/(?<=[.!?])\s+/)) {
    let m: RegExpExecArray | null;
    // "I'm Jordan, a biology major from Orlando." — a self-introduction lists several facts in one sentence.
    const intro = /^(?:(?:hi|hey|hello|yo|hiya|heya|howdy)[,!.\s]+)?(?:i'?m|i am)\s/i.test(s);

    // ── name / nickname
    if ((m = /\b[Mm]y name(?:'s| is)\s+([\p{L}][\p{L}'-]{0,23})(?:\s+([A-Z][\p{L}'-]{0,23}))?/u.exec(s))) {
      const v = cap1(m[1]) + (m[2] ? ` ${m[2]}` : '');
      if (!NOT_NAMES.test(m[1])) add({ key: 'name', fact: `Player's name is ${v}.`, replaces: prefixRe("Player's name is") });
    } else if ((m = /^(hi|hey|hello|yo|hiya|heya|howdy)?[,!.\s]*(?:i'?m|i am)\s+([\p{L}][\p{L}'-]{0,23})[.!]*$/iu.exec(s))) {
      const greeted = !!m[1];
      const v = m[2];
      const looksLikeName = /^\p{Lu}/u.test(v) || (greeted && !/(ing|ed|ly)$/i.test(v));
      if (looksLikeName && !NOT_NAMES.test(v)) add({ key: 'name', fact: `Player's name is ${cap1(v)}.`, replaces: prefixRe("Player's name is") });
    } else if (intro && (m = /(?:[Ii]'?m|[Ii] am)\s+(\p{Lu}[\p{L}'-]{0,23}),/u.exec(s)) && !NOT_NAMES.test(m[1])) {
      add({ key: 'name', fact: `Player's name is ${m[1]}.`, replaces: prefixRe("Player's name is") });
    }
    if ((m = /\b(?:you can |just |please )?call me ([\p{L}][\p{L}'-]{0,23})(?:\s+(\p{Lu}[\p{L}'-]{0,23}))?/iu.exec(s)) || (m = /\bmy nickname is ([\p{L}][\p{L}'-]{0,23})()/iu.exec(s))) {
      const first = m[1];
      if (!BAD_START.test(first) && !NOT_NAMES.test(first) && !/^(back|later|maybe|anytime|tomorrow|tonight|crazy|whenever|sometime)$/i.test(first)) {
        const v = cap1(first) + (m[2] ? ` ${m[2]}` : '');
        add({ key: 'nickname', fact: `Player likes to be called ${v}.`, replaces: prefixRe('Player likes to be called') });
      }
    }

    // ── hometown
    if (
      (m = /\b(?:i'?m|i am|i come) from ([\p{L}][\p{L}.' -]{1,40})/iu.exec(s)) ||
      (m = /\bi grew up in ([\p{L}][\p{L}.' -]{1,40})/iu.exec(s)) ||
      (m = /\bmy hometown is ([\p{L}][\p{L}.' -]{1,40})/iu.exec(s)) ||
      (intro && (m = /\bfrom (\p{Lu}[\p{L}.' -]{1,40})/u.exec(s)))
    ) {
      const v = clean(m[1], 4);
      if (isUsable(v) && !/^(here|there|class|work|lab|practice|the gym|home|school|campus|nowhere|everywhere|out|outside|now on|then on)\b/i.test(v)) {
        add({ key: 'hometown', fact: `Player is from ${v}.`, replaces: prefixRe('Player is from') });
      }
    }

    // ── major
    if (
      (m = /\b(?:i'?m|i am) (?:an? )?([\p{L}][\p{L} &-]{1,30}?) major\b/iu.exec(s)) ||
      (intro && (m = /\ban? ([\p{L}][\p{L} &-]{1,30}?) major\b/iu.exec(s))) ||
      (m = /\bmy major is ([\p{L}][\p{L} &-]{1,30})/iu.exec(s)) ||
      (m = /\bi(?:'?m| am)? major(?:ing)? in ([\p{L}][\p{L} &-]{1,30})/iu.exec(s)) ||
      (m = /\bi (?:study|am studying|'m studying) ([\p{L}][\p{L} &-]{1,30})/iu.exec(s))
    ) {
      const v = clean(m[1], 4);
      if (isUsable(v) && !BAD_START.test(v) && !/^(a|an|the|hard|late|a lot|all|every|here|there|now|today|tonight|abroad|together|online|a bit|alone)\b/i.test(v)) {
        add({ key: 'major', fact: `Player's major is ${v}.`, replaces: prefixRe("Player's major is") });
      }
    }

    // ── year
    if ((m = new RegExp(`\\b(?:i'?m|i am) (?:a |an )?${YEARS}\\b`, 'i').exec(s)) || (intro && (m = new RegExp(`\\ban? ${YEARS}\\b`, 'i').exec(s)))) {
      const v = m[1].toLowerCase().replace(/\s+/g, ' ').replace(/^(first|second|third|fourth|fifth) year$/, '$1-year');
      add({ key: 'year', fact: `Player is ${/^[aeiou]/.test(v) ? 'an' : 'a'} ${v}.`, replaces: new RegExp(`^Player is an? ${YEARS}\\b`, 'i') });
    }

    // ── favorite X is Y
    if ((m = /\bmy fav(?:ou?rite|e)? ([\p{L}][\p{L} -]{1,24}?) (?:is|are) ([^.!?]{1,60})/iu.exec(s))) {
      const what = clean(m[1], 3).toLowerCase();
      const val = clean(thirdPerson(m[2]), 5);
      if (isUsable(what) && isUsable(val)) {
        add({ key: 'favorite', fact: `Player's favorite ${what} is ${val}.`, replaces: prefixRe(`Player's favorite ${what} is`) });
      }
    }

    // ── likes / loves / dislikes / hates
    const likeRe =
      /\bi (?:really |totally |absolutely |just |also |kinda |kind of |honestly |so )?(love|adore|like|enjoy|hate|dislike|can'?t stand|don'?t like|do not like)\s+([^.!?]{1,80})/gi;
    while ((m = likeRe.exec(s)) !== null) {
      const verb = m[1].toLowerCase();
      const v = clean(thirdPerson(m[2].trim()), 6);
      if (!isUsable(v) || LIKE_BAD_START.test(v) || /^(talking to|hanging out with|being with) (you|them)\b/i.test(v)) continue;
      const neg = /hate|dislike|can'?t stand|don'?t like|do not like/.test(verb);
      const word =
        verb === 'love' || verb === 'adore' ? 'loves' : verb === 'hate' || verb.startsWith('can') ? 'hates' : neg ? 'dislikes' : 'likes';
      add({ key: neg ? 'dislikes' : 'likes', fact: `Player ${word} ${v}.` });
    }
    if ((m = /\bi'?m (?:obsessed with|really into|so into|into|a (?:huge |big )?fan of)\s+([^.!?]{1,60})/i.exec(s))) {
      const v = clean(thirdPerson(m[1]), 6);
      if (isUsable(v) && !LIKE_BAD_START.test(v)) add({ key: 'likes', fact: `Player loves ${v}.` });
    }

    // ── exams / deadlines / big days
    const evRe = new RegExp(
      `\\b(?:i (?:have|'ve got|got)|i'?ve got|there'?s|my)\\s+(?:an? |my |the |this |two |three |a big |a huge |a final )?((?:[\\p{L}-]+ ){0,2}?)${EVENT_RE}(?:\\s+(?:is|due))?(?:\\s+(?:on|coming up|due))?\\s*(today|tonight|tomorrow(?: morning| afternoon| night)?|next week|(?:this |next |on )?${WD_RE})?`,
      'iu',
    );
    if ((m = evRe.exec(s))) {
      const subject = clean(m[1] ?? '', 2).toLowerCase();
      const event = m[2].toLowerCase();
      const when = m[3] ?? '';
      const about = `${subject && !BAD_START.test(subject) && !/^(so|much|many|lots|a lot)\b/.test(subject) ? `${subject} ` : ''}${event}`.trim();
      const article = /^[aeiou]/i.test(about) ? 'an' : 'a';
      const day = when ? resolveDay(when, now) : null;
      if (day) {
        add({ key: 'exam', fact: `Player has ${article} ${about} on ${shortDate(day)}.`, followUp: { date: localDate(day), about } });
      } else if (EXAM_LIKE.test(event) && /\b(have|got|coming up)\b/i.test(s)) {
        add({ key: 'exam', fact: `Player has ${article} ${about} coming up.` });
      }
    }

    // ── pets
    if ((m = new RegExp(`\\bi (?:have|'ve got|got|own) (an? |two |three |four |\\d+ )${PETS}s?(?: (?:named|called) ([\\p{L}'-]{1,20}))?`, 'iu').exec(s))) {
      const count = m[1].trim().toLowerCase();
      const kind = m[2].toLowerCase();
      const name = m[3] ? cap1(m[3]) : '';
      const plural = /^(two|three|four)$/.test(count) || (/^\d+$/.test(count) && count !== '1');
      const fact = plural
        ? `Player has ${count} ${kind}s.`
        : `Player has ${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}${name ? ` named ${name}` : ''}.`;
      add({ key: 'pet', fact });
    } else if ((m = new RegExp(`\\b[Mm]y ${PETS}(?:'s name is| is named| is called|,)? (\\p{Lu}[\\p{L}'-]{1,20})`, 'u').exec(s))) {
      const kind = m[1].toLowerCase();
      add({ key: 'pet', fact: `Player has ${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind} named ${cap1(m[2])}.` });
    }
  }
  return out;
}

/**
 * Store learned facts for `pig`, sharing non-private ones with the other pigs. Private facts get a
 * " (secret)" marker so the pig (and the LLM) know not to spread them. Returns the stored facts.
 */
export function rememberFacts(pig: PigId, facts: LearnedFact[], store: MemoryStore): LearnedFact[] {
  const stored: LearnedFact[] = [];
  for (const f of facts) {
    const text = f.private ? `${f.fact.replace(/\.$/, '')}${SECRET_MARK}.` : f.fact;
    const targets = f.private ? [pig] : [pig, ...PIG_IDS.filter((p) => p !== pig)];
    for (const p of targets) {
      if (f.replaces && store.forget) {
        const re = f.replaces;
        store.forget(p, (old) => re.test(old) && old !== text);
      }
      store.remember(p, text);
    }
    stored.push({ ...f, fact: text });
  }
  return stored;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Facts like "Player has a chem exam on Fri, Nov 6." whose day has passed (for "How did it go?"). */
export function followUpsDue(memories: readonly string[], now: Date = new Date()): { fact: string; about: string; date: string }[] {
  const out: { fact: string; about: string; date: string }[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const fact of memories) {
    const m = /^Player has an? (.+?) on (?:[A-Z][a-z]{2}, )?([A-Z][a-z]{2}) (\d{1,2})\b/.exec(fact);
    if (!m) continue;
    const month = MONTHS.indexOf(m[2]);
    if (month < 0) continue;
    // The year that puts the date closest to today.
    let best: Date | null = null;
    for (const y of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
      const d = new Date(y, month, Number(m[3]));
      if (!best || Math.abs(d.getTime() - today.getTime()) < Math.abs(best.getTime() - today.getTime())) best = d;
    }
    if (best && best.getTime() < today.getTime()) out.push({ fact, about: m[1], date: localDate(best) });
  }
  return out;
}
