// Expressions for chat replies: the LLM's `[tag] "line"` output (full + streaming parser), tag synonyms,
// and a deterministic per-pig lexicon classifier for replies without a tag. Pure module.
import { EXPRESSIONS, type AnimId, type Expression, type PigId } from '../types';

const EXPRESSION_SET: ReadonlySet<string> = new Set(EXPRESSIONS);

export function isExpression(v: unknown): v is Expression {
  return typeof v === 'string' && EXPRESSION_SET.has(v);
}

/** Regex the LLM output is constrained to (StructuredOutputProcessor): `[expression] "line"`, one line, ≤ 240 chars. */
export const OUTPUT_REGEX = `\\[(${EXPRESSIONS.join('|')})\\] "[^"\\n]{1,240}"`;

/** Render a line in the exact output format (few-shot examples and history). */
export function formatTagged(expression: Expression, line: string): string {
  const clean = line.replace(/["\n\r]+/g, (m) => (m.startsWith('"') ? "'" : ' ')).trim();
  return `[${expression}] "${clean}"`;
}

// ───────────────────────── synonyms ─────────────────────────

const SYN: Record<string, Expression> = {};
function syn(e: Expression, words: string): void {
  for (const w of words.split(/\s*,\s*/)) if (w) SYN[w] = e;
}
for (const e of EXPRESSIONS) SYN[e] = e;
syn('neutral', 'calm, normal, default, serious, deadpan, flat, plain, blank, stoic, composed, idle, none');
syn('happy', 'smile, smiling, glad, cheerful, content, pleased, joy, joyful, warm, friendly, grin, grinning, relieved, upbeat, chipper, bright, hopeful');
syn('laughing', 'laugh, laughs, lol, amused, giggle, giggling, giggles, chuckle, chuckling, playful, teasing, haha, cackling, snicker');
syn('sad', 'unhappy, down, disappointed, gloomy, sorry, apologetic, worried, concerned, lonely, hurt, grave, somber, sombre, melancholy, dejected, regretful, sympathetic');
syn('angry', 'mad, annoyed, frustrated, irritated, grumpy, pouting, pout, offended, stern, irked, indignant, huffy, disapproving');
syn('surprised', 'surprise, shocked, astonished, amazed, wow, startled, stunned, wide-eyed, gasp');
syn('scared', 'afraid, fear, fearful, frightened, nervous, anxious, panicked, panic, terrified, spooked, uneasy');
syn('confused', 'puzzled, unsure, uncertain, perplexed, huh, baffled, lost, bewildered, doubtful');
syn('shy', 'timid, quiet, reserved, meek, demure');
syn('loving', 'love, caring, tender, fond, gentle, kind, supportive, sincere, grateful, thankful, compassionate, soft, comforting, reassuring');
syn('proud', 'confident, smug, determined, triumphant, satisfied, cool, accomplished, assured, victorious');
syn('sleepy', 'tired, yawning, yawn, drowsy, exhausted, weary, bored, sluggish');
syn('sick', 'ill, unwell, queasy, feverish, nauseous');
syn('crying', 'cry, tearful, teary, sobbing, tears, weeping, emotional, moved');
syn('excited', 'hyped, hype, thrilled, eager, enthusiastic, energetic, pumped, ecstatic, delighted, giddy, elated, fired up, stoked');
syn('thinking', 'thoughtful, pensive, curious, pondering, contemplative, considering, analytical, hmm, interested, focused, skeptical, wondering, inquisitive, intrigued');
syn('shy_blush', 'blush, blushing, shy blush, blushes, pink');
syn('flustered_blush', 'flustered, embarrassed, awkward, flustered blush, frazzled, caught off guard');
syn('affectionate_blush', 'affectionate, adoring, affectionate blush, smitten, lovestruck');
syn('bashful_smile', 'bashful, sheepish, soft smile, modest, humble, bashful smile, coy, small smile');

/** Map a free-form tag ("Blushing", "expression: happy", "shy-blush") to one of the 20 expressions, or null. */
export function normalizeTag(raw: string): Expression | null {
  let t = raw.toLowerCase().trim();
  t = t.replace(/^(expression|emotion|face|mood|tag)\s*[:=]\s*/, '').replace(/[*_`'"]+$/g, '').replace(/^[*_`'"]+/g, '');
  if (!t) return null;
  const candidates = [t, t.replace(/[\s-]+/g, '_'), t.replace(/[_-]+/g, ' ')];
  for (const c of candidates) if (SYN[c]) return SYN[c];
  // "happy, excited" / "happy and excited" / "very happy" → first known word
  for (const w of t.split(/[^a-z]+/)) if (w && SYN[w]) return SYN[w];
  return null;
}

// ───────────────────────── tagged-line parsing ─────────────────────────

const OPEN_QUOTES: Record<string, string> = { '"': '"', '“': '”', '«': '»', '「': '」' };
const MAX_TAG_LEN = 40;

export interface TaggedStreamOptions {
  /** Called once, as soon as the tag is known (even before the line starts). */
  onTag?: (expression: Expression, raw: string) => void;
  /** Stop emitting after this many visible characters (the post-filter caps replies anyway). */
  maxChars?: number;
}

/**
 * Incremental parser for `[tag] "line"` (and tolerant variants: `(tag)`, `**[tag]**`, `[tag]: line`, no quotes,
 * curly quotes, a truncated line with no closing quote). Feed raw deltas with push(); it returns the visible part
 * of each delta (tag and quotes stripped, nothing after the closing quote).
 */
export class TaggedStream {
  tag: Expression | null = null;
  rawTag: string | null = null;
  /** The closing quote was seen (false = the line was cut off, e.g. by max_new_tokens). */
  closed = false;
  #buf = '';
  #mode: 'start' | 'tag' | 'pre' | 'body' | 'done' = 'start';
  #close: string | null = null;
  #quoted = false;
  #closer = ']';
  #out = '';
  #opts: TaggedStreamOptions;

  constructor(opts: TaggedStreamOptions = {}) {
    this.#opts = opts;
  }

  /** All visible text so far. */
  get text(): string {
    return this.#out;
  }

  get finished(): boolean {
    return this.#mode === 'done';
  }

  /** The line started with an opening quote. */
  get quoted(): boolean {
    return this.#quoted;
  }

  push(delta: string): string {
    if (!delta || this.#mode === 'done') return '';
    this.#buf += delta;
    return this.#drain(false);
  }

  /** End of stream: flush whatever was held back. */
  end(): string {
    return this.#drain(true);
  }

  #emit(s: string): string {
    const max = this.#opts.maxChars ?? 600;
    const room = max - this.#out.length;
    if (room <= 0) {
      this.#mode = 'done';
      return '';
    }
    const piece = s.length > room ? s.slice(0, room) : s;
    if (s.length > room) this.#mode = 'done';
    this.#out += piece;
    return piece;
  }

  #drain(final: boolean): string {
    let visible = '';
    for (let guard = 0; guard < 8; guard++) {
      if (this.#mode === 'start') {
        const m = /^[\s*_>]*/.exec(this.#buf);
        const lead = m ? m[0].length : 0;
        if (lead === this.#buf.length) {
          if (final) this.#buf = '';
          return visible;
        }
        const c = this.#buf[lead];
        if (c === '[' || c === '(') {
          this.#closer = c === '[' ? ']' : ')';
          this.#buf = this.#buf.slice(lead + 1);
          this.#mode = 'tag';
          continue;
        }
        this.#buf = this.#buf.slice(lead);
        this.#mode = 'pre';
        continue;
      }
      if (this.#mode === 'tag') {
        const end = this.#buf.indexOf(this.#closer);
        if (end >= 0 && end <= MAX_TAG_LEN) {
          const raw = this.#buf.slice(0, end);
          this.#buf = this.#buf.slice(end + 1);
          const e = normalizeTag(raw);
          if (e) {
            this.tag = e;
            this.rawTag = raw.trim();
            this.#opts.onTag?.(e, raw.trim());
          } else if (this.#closer === ')') {
            // "(Terrible patient.) …" is speech, not a tag: give it back to the text.
            this.#buf = `(${raw})${this.#buf}`;
            this.#mode = 'body';
            this.#close = null;
            continue;
          }
          this.#mode = 'pre';
          continue;
        }
        if (this.#buf.length > MAX_TAG_LEN || (end > MAX_TAG_LEN) || final) {
          // Not a tag after all: it was text.
          this.#buf = (this.#closer === ']' ? '[' : '(') + this.#buf;
          this.#mode = 'pre';
          continue;
        }
        return visible;
      }
      if (this.#mode === 'pre') {
        const m = /^[\s*_:\-–—>]*/.exec(this.#buf);
        const lead = m ? m[0].length : 0;
        if (lead === this.#buf.length) {
          if (final) this.#buf = '';
          return visible;
        }
        const c = this.#buf[lead];
        if (OPEN_QUOTES[c]) {
          this.#close = OPEN_QUOTES[c];
          this.#quoted = true;
          this.#buf = this.#buf.slice(lead + 1);
        } else {
          this.#close = null;
          this.#buf = this.#buf.slice(lead);
        }
        this.#mode = 'body';
        continue;
      }
      if (this.#mode === 'body') {
        let take = this.#buf;
        let done = false;
        if (this.#close) {
          const i = take.indexOf(this.#close);
          if (i >= 0) {
            take = take.slice(0, i);
            done = true;
            this.closed = true;
          }
        } else {
          const i = take.indexOf('\n');
          if (i >= 0) {
            take = take.slice(0, i);
            done = true;
          }
        }
        this.#buf = '';
        visible += this.#emit(take);
        if (done) this.#mode = 'done';
        return visible;
      }
      return visible;
    }
    return visible;
  }
}

export interface TaggedLine {
  expression: Expression | null;
  /** The spoken line (tag and quotes removed). */
  text: string;
  /** True when a recognizable tag was found. */
  tagged: boolean;
  rawTag: string | null;
  /** False when a quoted line never got its closing quote (cut off). Unquoted text counts as complete. */
  complete: boolean;
}

/** Parse a complete reply. Never throws; untagged text comes back as-is (trimmed). */
export function parseTagged(text: string): TaggedLine {
  const s = new TaggedStream({ maxChars: 4000 });
  s.push(text ?? '');
  s.end();
  const out = s.text.trim();
  return { expression: s.tag, text: out, tagged: s.tag !== null, rawTag: s.rawTag, complete: s.closed || !s.quoted };
}

/**
 * A line that was cut off mid-sentence: keep the complete sentences, or end the fragment with "…".
 * Complete lines pass through.
 */
export function finishLine(text: string, complete: boolean): string {
  const t = text.trim();
  if (complete || !t || /[.!?…]["'”’)]*$/.test(t)) return t;
  const lastEnd = Math.max(t.lastIndexOf('. '), t.lastIndexOf('! '), t.lastIndexOf('? '), t.lastIndexOf('… '));
  if (lastEnd > 0) return t.slice(0, lastEnd + 1).trim();
  return `${t.replace(/[\s,;:—–-]+$/, '')}…`;
}

// ───────────────────────── lexicon classifier ─────────────────────────

type Rule = [RegExp, Expression, number];

const GENERAL: Rule[] = [
  [/\b(ha(ha)+|hah|heh(eh)*|hehe+|lol|lmao)\b/i, 'laughing', 3],
  [/\b(valid strategy|zero points|that's hilarious|so funny)\b/i, 'laughing', 2],
  [/\b(sorry|sad|miss (you|it|them)|unfortunately|oh no|that's rough|rough day|tough day|i'm here for you|ugh)\b/i, 'sad', 2],
  [/\b(z{3,}|yawn\w*|sleepy|so tired|exhausted|nap\b|battery|filing a complaint)/i, 'sleepy', 3],
  [/\b(fever|cough\w*|sneez\w*|achoo|i feel sick|i'?m sick|benched)\b/i, 'sick', 3],
  [/\b(wait|hmm+|let me think|i wonder|what if|best for what|compared against|actually)\b/i, 'thinking', 1.5],
  [/\b(huh\??|confus\w*|doesn'?t (quite )?line up|not sure|what do you mean|lost me)\b/i, 'confused', 2.5],
  [/\b(wow|whoa|no way|seriously\?|really\?!|you did\?|wait,? what)\b/i, 'surprised', 2.5],
  [/\b(let'?s go+|awesome|amazing|incredible|so cool|can'?t wait|yes!|woo+|yay)\b/i, 'excited', 2],
  [/\b(nailed it|did it|it works|clinical success|write that down|proud|personal record|nice set)\b/i, 'proud', 2],
  [/\b(thank(s| you)|glad you|means a lot|appreciate|we got this|not the set|you can do (it|this)|i believe in you|take care)\b/i, 'loving', 2],
  [/\b(scared|spooky|afraid|yikes|eek|creepy|terrif\w*)\b/i, 'scared', 2.5],
  [/\b(not based|unacceptable|rude|hmph|stop that|seriously\.)\b/i, 'angry', 2.5],
  [/\b(more fun with you|best teammate|glad you stayed|most based person|improves my perfusion|showing you this)\b/i, 'affectionate_blush', 3],
  [/\b(cry(ing)?|tears|sniff)\b/i, 'crying', 2],
];

const PER_PIG: Record<PigId, Rule[]> = {
  'piggy-1': [
    [/\b(free ball|side out|pancake|kill!|spike|let'?s go+|rally|ace|dig|serve)\b/i, 'excited', 2],
    [/\b(time-?out|let'?s reset|okay\. okay)\b/i, 'thinking', 1.5],
    [/\b(rematch|good game)\b/i, 'laughing', 1.5],
  ],
  'piggy-2': [
    [/\bischemi\w*\b|\bthe enemy\b/i, 'sad', 2.5],
    [/\b(perfusion|csf|electrode\w*|spinal|cortex|neuro\w*|lumbar drain|decompress\w*)\b/i, 'excited', 1.5],
    [/\b(based|patriot)\b/i, 'proud', 2],
    [/\b(doctor'?s orders|hydrate|eat something|sit\.|drink some water)\b/i, 'thinking', 2],
  ],
  'piggy-3': [
    [/\b(okay,? so|i was thinking|i'?m thinking|basically|a little thing|like, for example)\b/i, 'thinking', 1.5],
    [/\b(it works|look[—-]|this is the bit|okay, it works)\b/i, 'proud', 2.5],
    [/\b(codex|3d print\w*|hipergator|eeg|ecg|one piece|jojo)\b/i, 'excited', 1.5],
  ],
};

const COMPLIMENT =
  /\b(you('?re| are) (so |really |super |kinda |very |the )?(smart|cute|cool|amazing|awesome|sweet|kind|funny|talented|great|best|adorable|handsome|brilliant|genius|nice|good at)|i (like|love) (you|your|talking)|proud of you|good job|nice job|well done|you('?re| are) my favorite)\b/i;
const HESITATION = /(—|–|\.\.\.|…|\b(um+|uh+|oh\.|wait,|that'?s— )\b)/i;

const PIG_DEFAULT: Record<PigId, Expression> = { 'piggy-1': 'happy', 'piggy-2': 'neutral', 'piggy-3': 'neutral' };

/** Suggested full-body animation for an expression (base clips available in every everyday set). */
const ANIM_FOR: Partial<Record<Expression, AnimId>> = {
  happy: 'happy', laughing: 'laugh', sad: 'sad', angry: 'angry', surprised: 'surprised', scared: 'scared',
  confused: 'confused', shy: 'shy', loving: 'love', proud: 'proud', sleepy: 'yawn', sick: 'sick', crying: 'cry',
  excited: 'celebrate', thinking: 'thinking', shy_blush: 'shy', flustered_blush: 'shy', affectionate_blush: 'love',
  bashful_smile: 'shy',
};

export function animFor(expression: Expression): AnimId | undefined {
  return ANIM_FOR[expression];
}

export interface ExpressionGuess {
  expression: Expression;
  anim?: AnimId;
  /** Winning score (0 = default). */
  score: number;
}

/**
 * Deterministic expression for a reply without a tag (heuristic replies, untagged LLM output).
 * `playerText` adds context (a compliment makes the pig blush).
 */
export function classifyExpression(pig: PigId, text: string, playerText = ''): ExpressionGuess {
  const scores = new Map<Expression, number>();
  const add = (e: Expression, w: number) => scores.set(e, (scores.get(e) ?? 0) + w);
  for (const [re, e, w] of GENERAL) if (re.test(text)) add(e, w);
  for (const [re, e, w] of PER_PIG[pig] ?? []) if (re.test(text)) add(e, w);
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs) add('excited', Math.min(2, bangs * 0.75));
  if (/\?\s*$/.test(text)) add('thinking', 0.75);
  if (playerText && COMPLIMENT.test(playerText)) {
    const flustered = HESITATION.test(text);
    if (pig === 'piggy-3') add(flustered ? 'flustered_blush' : 'shy_blush', 3.5);
    else if (pig === 'piggy-2') add(flustered ? 'flustered_blush' : 'shy_blush', 3.5);
    else add(flustered ? 'flustered_blush' : 'bashful_smile', 3.5);
  }
  let best: Expression = /\?\s*$/.test(text) && pig !== 'piggy-1' ? 'thinking' : PIG_DEFAULT[pig] ?? 'neutral';
  let bestScore = 0;
  // Iterate in canonical order so ties are deterministic.
  for (const e of EXPRESSIONS) {
    const s = scores.get(e) ?? 0;
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return { expression: best, anim: bestScore > 0 ? animFor(best) : undefined, score: bestScore };
}
