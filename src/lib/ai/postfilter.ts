// Post-filter for chat replies: strip AI-isms, labels, *actions*, (stage directions), markdown, emojis and
// reasoning leaks; keep it PG; cap at 3 sentences / 280 chars. Returns '' when nothing usable is left
// (the caller then falls back to the Heuristic Brain). Pure module.
import { EXPRESSIONS, type PigId } from '../types';

export interface PostfilterOptions {
  pig?: PigId;
  /** Display name of the pig ("Piggy 2"); used to strip "Piggy 2:" labels. */
  pigName?: string;
  maxSentences?: number;
  maxChars?: number;
  /**
   * Light mode for curated (heuristic) lines: sanitize only (think tags, markdown, labels, emojis) —
   * no sentence cap, no stage-direction or AI-ism removal — and a 400-char safety cap.
   */
  light?: boolean;
}

export const MAX_SENTENCES = 3;
export const MAX_CHARS = 280;

const LABELS = ['piggy\\s*[123]', 'piggy', 'assistant', 'ai', 'bot', 'pig', 'character', 'response', 'reply', 'answer', 'output'];

const AI_ISM =
  /\b(as an ai|i'?m an ai|i am an ai|an ai (language )?model|language model|ai assistant|virtual assistant|i'?m (just |only )?a (computer )?program|i am (just |only )?a (computer )?program|i don'?t have (personal )?(feelings|emotions|a body|a physical)|as a virtual|i cannot (browse|access the internet)|openai|chatgpt|large language|my training data|i was trained)\b/i;

const LEAK =
  /\b(the (user|player) (is|was|has|wants|asked|asks|said|says|seems|mentioned|might|may|just|wrote)|i (need|should|must|will) (to )?(respond|reply|answer|stay in character|keep (it|the reply))|stay in character|as piggy\b|output format|expression is one of|the bracketed line|private context)/i;

/** The whole reply is a format placeholder the model copied ("Line", "your words"…). */
const PLACEHOLDER =
  /^(?:the |your |my )?(?:spoken )?(?:line|lines|text|dialogue|reply|response|answer|words|expression|face|quote|message|output)s?[.!?…]*$/i;

/** Strong profanity / explicit content: the reply is dropped (heuristic fallback). Mild "dang/heck" are fine. */
const NOT_PG =
  /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|dick(s|head)?|cock\w*|pussy|asshole\w*|bastard\w*|slut\w*|whore\w*|nigg\w*|fag\w*|retard\w*|porn\w*|sex(y|ual(ly)?)?|nude\w*|naked|horny|boob\w*)\b/i;

const EMOJI = /\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}]|️|‍|⃣/gu;
const ASCII_EMOTICON = /(^|\s)(?:[:;=][-^']?[)(DPpOo3\]\[|/\\]|<3|\^_\^|xD|XD)(?=\s|$|[.,!?])/g;
const ACTION_WORDS =
  /^(smile|sigh|laugh|blush|grin|nod|wink|giggle|shrug|chuckle|yawn|gasp|pause|beat|wave|pout|snort|oink|squeal|stretch|lean|look|glance|adjust|tilt|point|whisper|mutter|cough|sniff|beam|hug|pat|blink|stare|frown|scratch|rub|tap|clap|chomp|salute|bounce|jump|spin|bow|smirk|groan|huff|cheer|grumble|hum|sip|munch|type)/i;
const EXPRESSION_WORDS: ReadonlySet<string> = new Set(EXPRESSIONS);

function stripThink(s: string): string {
  let t = s.replace(/<think>[\s\S]*?<\/think>/gi, ' ');
  // An unclosed <think> means everything after it is reasoning.
  const open = t.search(/<think>/i);
  if (open >= 0) t = t.slice(0, open);
  // A stray </think>: the answer is what comes after it.
  const close = t.search(/<\/think>/i);
  if (close >= 0) t = t.slice(close + '</think>'.length);
  return t.replace(/<\|[^|>]{1,40}\|>/g, ' ');
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\((?:https?:)?[^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?])/g, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/gm, '');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Piggy 2: …", "**Assistant**: …", "Piggy 2 (happy): …" → "…". */
function stripLabels(s: string, pigName?: string): string {
  const names = [...LABELS];
  if (pigName) names.unshift(escapeRe(pigName).replace(/\s+/g, '\\s*'));
  const re = new RegExp(`^\\s*(?:\\*\\*|__)?(?:${names.join('|')})(?:\\*\\*|__)?\\s*(?:\\([^)]{0,24}\\)|\\[[^\\]]{0,24}\\])?\\s*[:：]\\s*`, 'i');
  let t = s;
  for (let i = 0; i < 2 && re.test(t); i++) t = t.replace(re, '');
  return t;
}

/** *smiles* / *waves happily* → removed; single-word *emphasis* → kept without asterisks. */
function stripActions(s: string): string {
  return s.replace(/\*{1,2}([^*\n]{1,80})\*{1,2}/g, (_m, inner: string) => {
    const w = inner.trim();
    if (/^[\p{L}'’-]+$/u.test(w) && !ACTION_WORDS.test(w) && !/ing$/i.test(w)) return w;
    return ' ';
  });
}

/** (smiles), (adjusts glasses), (happy), [laughs] → removed; "(Terrible patient.)" stays. */
function stripStageDirections(s: string): string {
  return s
    .replace(/\(\s*([^()]{1,60})\)/g, (m, inner: string) => {
      const t = inner.trim();
      if (EXPRESSION_WORDS.has(t.toLowerCase().replace(/\s+/g, '_'))) return ' ';
      if (/^[a-z]/.test(t) && (ACTION_WORDS.test(t) || /^[a-z]+(s|es|ed|ing)\b/.test(t))) return ' ';
      if (/^(expression|emotion|face|mood)\s*[:=]/i.test(t)) return ' ';
      return m;
    })
    .replace(/\[[^\]\n]{1,30}\]/g, ' ');
}

/**
 * Split into sentences, keeping terminal punctuation and closing quotes/brackets with the sentence. A boundary
 * needs whitespace and then a sentence start (capital, digit, opening quote), so `“Okay, so…”, “Actually…”`,
 * "I'm... at like 12%", "a.m." and "87.5%" stay in one piece.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?…]+(?:[.!?…]+["'”’)\]]*)?|[.!?…]+["'”’)\]]*/g;
  let carry = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const piece = carry + m[0];
    const rest = text.slice(re.lastIndex);
    const ended = /[.!?…]["'”’)\]]*$/.test(piece);
    const boundary = /^\s+[\p{Lu}\p{N}"“'‘(\[¿¡*]/u.test(rest);
    const abbrev =
      /(^|[\s(])(a\.m|p\.m|e\.g|i\.e|dr|mr|mrs|ms|st|vs|etc)\.$/i.test(piece) || /(^|\s)[A-Za-z]\.$/.test(piece);
    if (rest.trim() && (!ended || !boundary || abbrev)) {
      carry = piece;
      continue;
    }
    carry = '';
    if (piece.trim()) out.push(piece.trim());
  }
  if (carry.trim()) out.push(carry.trim());
  return out;
}

/**
 * Streaming helper: the index just after the `n`-th sentence once the next sentence has visibly started
 * (so the first `n` sentences are final), else -1.
 */
export function sentenceCutIndex(text: string, n: number): number {
  const re = /[^.!?…]+(?:[.!?…]+["'”’)\]]*)?|[.!?…]+["'”’)\]]*/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const piece = text.slice(0, end);
    const ended = /[.!?…]["'”’)\]]*$/.test(piece);
    const boundary = /^\s+[\p{Lu}\p{N}"“'‘(\[¿¡*]/u.test(text.slice(end));
    const abbrev =
      /(^|[\s(])(a\.m|p\.m|e\.g|i\.e|dr|mr|mrs|ms|st|vs|etc)\.$/i.test(piece) || /(^|\s)[A-Za-z]\.$/.test(piece);
    if (ended && boundary && !abbrev && ++count === n) return end;
  }
  return -1;
}

function capLength(text: string, maxSentences: number, maxChars: number): string {
  let sentences = splitSentences(text);
  if (sentences.length > maxSentences) sentences = sentences.slice(0, maxSentences);
  // Drop whole sentences from the end while that keeps something.
  while (sentences.length > 1 && sentences.join(' ').length > maxChars) sentences.pop();
  const out = sentences.join(' ');
  if (out.length <= maxChars) return out;
  // One long sentence: cut at a word boundary.
  const cut = out.slice(0, maxChars - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > maxChars * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:—–-]+$/, '')}…`;
}

function tidy(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    // Keep a pause beat ("Bye. …Text me") separate; only glue punctuation that ends a clause.
    .replace(/\s+([,.!?;:]|…(?![\p{L}\p{N}]))/gu, '$1')
    .replace(/([,;])(?=[^\s\d"'”’)])/g, '$1 ')
    .replace(/^[\s,;:—–-]+/, '')
    .trim();
}

function hasWords(s: string): boolean {
  return /[\p{L}\p{N}]/u.test(s);
}

/** True when the text contains content the game must never show (used for LLM output). */
export function isNotPG(text: string): boolean {
  return NOT_PG.test(text);
}

export function postfilter(raw: string, opts: PostfilterOptions = {}): string {
  if (!raw) return '';
  const light = !!opts.light;
  let t = stripThink(String(raw));
  t = stripMarkdown(t);
  t = t.replace(/\r?\n+/g, ' ');
  t = stripLabels(t, opts.pigName);
  // A line wrapped in quotes: "…" → …
  t = t.trim().replace(/^["“]([^"“”]*)["”]$/, '$1');
  t = t.replace(EMOJI, '');
  // Piggy 3 texts "<3" and ":)" now and then; the others don't.
  if (opts.pig !== 'piggy-3') t = t.replace(ASCII_EMOTICON, '$1');

  if (!light) {
    t = stripActions(t);
    t = stripStageDirections(t);
    t = splitSentences(tidy(t))
      .filter((s) => !AI_ISM.test(s) && !LEAK.test(s))
      .join(' ');
    if (isNotPG(t)) return '';
  }
  t = tidy(t);
  if (!hasWords(t) || (!light && PLACEHOLDER.test(t))) return '';
  t = light ? capLength(t, 99, opts.maxChars ?? 400) : capLength(t, opts.maxSentences ?? MAX_SENTENCES, opts.maxChars ?? MAX_CHARS);
  t = tidy(t);
  return hasWords(t) ? t : '';
}
