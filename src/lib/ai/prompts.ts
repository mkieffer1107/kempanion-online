// Chat prompts for the Big Brain (ARCHITECTURE §9, llm-runtime.md §1.7–1.8).
// - STABLE system prompt per pig (+ tier and player name): persona + rules + output format. Hard quirks are NOT here.
// - 2–3 few-shot pairs from the pig's sample lines, in the exact `[expression] "line"` output format.
// - A history window that only moves in steps (so the KV-cache prefix stays reusable for several turns).
// - The NEWEST user turn starts with a bracketed state line: time · place · feelings · hearts · memories.
// Pure module (bun-testable).
import { CHARACTERS } from '../content/characters';
import { LOCATIONS } from '../content/locations';
import { EXPRESSIONS, type ChatContext, type ChatRequest, type ChatTurn, type Expression, type MoodTier, type PigId } from '../types';
import { formatTagged, isExpression } from './emotion';
import type { LlmMessage } from './llm-protocol';
import { MODELS, type ModelId, type PromptBudget } from './models';
import { splitSentences } from './postfilter';
import { isSafetyMessage } from './quirks';

export type { LlmMessage } from './llm-protocol';

// ───────────────────────── token estimate ─────────────────────────

/** Chat-template overhead per message (`<|im_start|>role\n … <|im_end|>\n`). */
export const MESSAGE_OVERHEAD = 5;

/**
 * Conservative token estimate for LFM tokenizers (65K / 128K BPE): ~4 chars per token for English prose,
 * punctuation and quotes cost extra. Calibrated against the real LFM3 and LFM2.5 tokenizers (it overestimates
 * slightly so budgets hold).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const punct = (text.match(/[^\p{L}\p{N}\s]/gu) ?? []).length;
  const nonAscii = (text.match(/[^\x00-\x7f]/g) ?? []).length;
  return Math.ceil(text.length / 4.1 + punct * 0.45 + nonAscii * 0.5);
}

export function estimateMessages(messages: readonly LlmMessage[]): number {
  let n = 2; // BOS + generation prompt
  for (const m of messages) n += estimateTokens(m.content) + MESSAGE_OVERHEAD;
  return n;
}

// ───────────────────────── persona ─────────────────────────

/** Sentences that are notes to writers or hard rules (quirks.ts handles those), not voice. */
const PERSONA_DROP: RegExp[] = [
  /if the player says only/i,
  /\bthe real user\b/i,
  /curated character information/i,
  /\bfictional adaptations?\b/i,
  /accidental spelling|transcription errors|mechanically insert/i,
  /typed replies|lowercase fragments/i,
  /editing away/i,
];
const PERSONA_REWRITE: [RegExp, string][] = [[/,?\s*inspired by the user's own conversational style/gi, '']];

function sanitizePersona(prompt: string): string[][] {
  let text = prompt ?? '';
  for (const [re, to] of PERSONA_REWRITE) text = text.replace(re, to);
  return text
    .split(/\n\s*\n/)
    .map((p) => splitSentences(p.replace(/\s+/g, ' ').trim()).filter((s) => !PERSONA_DROP.some((re) => re.test(s))))
    .filter((p) => p.length > 0);
}

/**
 * Fit the persona into a token budget without losing whole topics: paragraph 1 (who he is) always stays;
 * then sentences are taken round-robin — the first sentence of every later paragraph, then the second, … —
 * and re-assembled in their original order.
 */
export function trimPersona(prompt: string, budget: number): string {
  const paras = sanitizePersona(prompt);
  if (!paras.length) return '';
  const keep = paras.map((p) => p.map(() => false));
  let used = 0;
  paras[0].forEach((s, i) => {
    keep[0][i] = true;
    used += estimateTokens(s) + 1;
  });
  const rounds = Math.max(...paras.map((p) => p.length));
  for (let r = 0; r < rounds; r++) {
    for (let p = 1; p < paras.length; p++) {
      const s = paras[p][r];
      if (!s) continue;
      const cost = estimateTokens(s) + 1;
      if (used + cost <= budget) {
        keep[p][r] = true;
        used += cost;
      }
    }
  }
  return paras
    .map((p, pi) => p.filter((_, si) => keep[pi][si]).join(' '))
    .filter(Boolean)
    .join('\n\n');
}

const personaCache = new Map<string, string>();
function personaFor(pig: PigId, budget: number): string {
  const key = `${pig}:${budget}`;
  let p = personaCache.get(key);
  if (p === undefined) {
    p = trimPersona(CHARACTERS[pig].prompt, budget);
    personaCache.set(key, p);
  }
  return p;
}

/** Soft quirks only ("sometimes"); exact call-and-response quirks are deterministic code in quirks.ts. */
const SOFT_QUIRK: Record<PigId, string> = {
  'piggy-1': 'Now and then use a volleyball call like "Free ball!" or "Let\'s goooo!", not in every line.',
  'piggy-2': 'Sometimes call a good thing "based". Save "Patriot." for rare moments.',
  // the rules list is never trimmed, so every model tier knows "never Twitter" (the persona's X sentence is trimmed at 190 tokens)
  'piggy-3': 'Sometimes think out loud with "Okay, so..." or "Actually...", not in every line. It\'s X or X.com to you, never Twitter.',
};

/** Player names go inside the prompt: keep them short and harmless. */
export function sanitizeName(name: string | undefined | null): string {
  return (name ?? '')
    .replace(/[\[\]{}<>"`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

/** The stable system prompt for one pig (changes only with the tier or the player's name). */
export function systemPrompt(pig: PigId, tier: ModelId, playerName = ''): string {
  const c = CHARACTERS[pig];
  const budget = MODELS[tier].budget;
  const name = sanitizeName(playerName);
  const rules = [
    `Speak only as ${c.name}, out loud, in 1-2 short sentences: no narration, *actions*, stage directions, emojis or lists.`,
    "Never say you are an AI or a model. Keep it kind and PG. You're at the University of Florida in Gainesville.",
    name ? `The player's name is ${name}. Use it sometimes, not in every line.` : "You don't know the player's name yet.",
    'Never make up facts about the player.',
    SOFT_QUIRK[pig],
    "The [bracketed line] before the player's message is private context (time, place, how you feel, hearts 0-10, what you remember about them). Let it color your reply; bring up a memory only when it fits. Never read it out.",
  ];
  // A concrete example instead of a placeholder: small models copy placeholders ('"line"') literally.
  const format = `Reply format: your face in brackets, then your words in double quotes, like [happy] "Hey! Good to see you." Faces: ${EXPRESSIONS.join(', ')}.`;
  return `${personaFor(pig, budget.persona)}\n\nRules:\n${rules.map((r) => `- ${r}`).join('\n')}\n\n${format}`;
}

// ───────────────────────── few-shot ─────────────────────────

interface Shot {
  beat: string;
  user: string;
  expression: Expression;
  /** Optional state line (shows the model what the bracket looks like). */
  state?: string;
}

const SHOTS: Record<PigId, Shot[]> = {
  'piggy-1': [
    { beat: 'Greeting', user: 'Morning! What are you up to?', expression: 'excited', state: 'Tue 7:05 AM · Sand Volleyball Courts · you feel cheerful · hearts 1' },
    { beat: 'Explaining volleyball', user: 'How does volleyball even work?', expression: 'happy' },
    { beat: 'Encouraging the player', user: 'I bombed my quiz today...', expression: 'loving' },
  ],
  'piggy-2': [
    { beat: 'Greeting', user: 'Hi! What are you doing here so early?', expression: 'neutral', state: 'Mon 5:40 AM · UF Health Shands · you feel upbeat · hearts 1' },
    { beat: 'Explaining perfusion', user: "What's perfusion?", expression: 'excited' },
    { beat: 'Concerned for player', user: "I've been studying since six and forgot to eat.", expression: 'thinking' },
  ],
  'piggy-3': [
    { beat: 'Starting a project', user: 'Hey! What are you working on?', expression: 'excited', state: 'Wed 4:15 PM · Physics Building · you feel upbeat · hearts 1' },
    { beat: 'Comparing models', user: 'This new model scored 95% on a benchmark!', expression: 'thinking' },
    { beat: 'Shy blush', user: "That's really cool. You're so good at this.", expression: 'shy_blush' },
  ],
};

/** Sample lines as spoken text: *emphasis* → emphasis, no double quotes. */
function speakable(line: string): string {
  return line.replace(/\*([^*]+)\*/g, '$1').replace(/"/g, "'").replace(/\s+/g, ' ').trim();
}

function fewShots(pig: PigId, count: number): LlmMessage[] {
  const samples = CHARACTERS[pig].samples ?? [];
  const out: LlmMessage[] = [];
  for (const shot of SHOTS[pig]) {
    if (out.length / 2 >= count) break;
    const sample = samples.find((s) => s.beat === shot.beat);
    if (!sample || !sample.line) continue;
    out.push({ role: 'user', content: shot.state ? `[${shot.state}]\n${shot.user}` : shot.user });
    out.push({ role: 'assistant', content: formatTagged(shot.expression, speakable(sample.line)) });
  }
  return out;
}

// ───────────────────────── state line ─────────────────────────

const MOOD_WORD: Record<MoodTier, string> = { great: 'cheerful', good: 'upbeat', okay: 'okay', low: 'down', awful: 'miserable' };

export function placeName(location: string): string {
  const loc = (LOCATIONS as Record<string, { name?: string } | undefined>)[location];
  return loc?.name ?? location.replace(/_/g, ' ');
}

function feelings(ctx: ChatContext): string[] {
  const f: string[] = [];
  if (ctx.sick) f.push('sick');
  const n = ctx.needs;
  if (n) {
    if (n.hunger < 15) f.push('starving');
    else if (n.hunger < 30) f.push('hungry');
    if (n.energy < 15) f.push('exhausted');
    else if (n.energy < 30) f.push('sleepy');
    if (n.hygiene < 25) f.push('grubby');
    if (n.fun < 25) f.push('bored');
  }
  f.splice(3);
  f.push(MOOD_WORD[ctx.mood] ?? 'okay');
  return f;
}

/** "Player's major is biology." → "player's major is biology"; "comfort_food=soup" → "player's comfort food: soup". */
export function compactMemory(fact: string): string {
  let f = (fact ?? '').trim().replace(/[.!]+$/, '').replace(/[\[\]]/g, '');
  const kv = /^([a-z][a-z_ ]{0,30})\s*=\s*(.+)$/i.exec(f);
  if (kv) f = `player's ${kv[1].replace(/_/g, ' ').trim()}: ${kv[2].trim()}`;
  f = f.replace(/^Player's\b/, "player's").replace(/^Player\b/, 'player');
  return f.length > 70 ? `${f.slice(0, 69).trimEnd()}…` : f;
}

export interface StateLineOptions {
  maxMemories?: number;
}

/**
 * "[Thu 3:42 PM · Malachowsky Hall · you feel hungry, cheerful · hearts 3 · remembers: player's major is biology;
 * player likes ramen]". Feelings say "you feel" and memories keep "player" so small models don't read them out
 * as their own lines.
 */
export function stateLine(ctx: ChatContext, opts: StateLineOptions = {}): string {
  const parts: string[] = [];
  if (ctx.clock) parts.push(ctx.clock.replace(/[\[\]]/g, ''));
  if (ctx.location) parts.push(placeName(ctx.location));
  parts.push(`you feel ${feelings(ctx).join(', ')}`);
  parts.push(`hearts ${Math.max(0, Math.min(10, Math.round(ctx.bondLevel ?? 0)))}`);
  if (ctx.situation) parts.push(ctx.situation.replace(/[\[\]\n]/g, ' ').trim().slice(0, 90));
  const max = opts.maxMemories ?? 4;
  const mems = (ctx.memories ?? []).filter((m) => m && m.trim()).slice(-max).map(compactMemory).filter(Boolean);
  if (mems.length) parts.push(`remembers: ${mems.join('; ')}`);
  return `[${parts.filter(Boolean).join(' · ')}]`;
}

// ───────────────────────── history + KV-stable memo ─────────────────────────

/**
 * Remembers exactly what was sent/generated so earlier turns re-render byte-identically next time
 * (the worker's KV-cache prefix check then passes and only the new tokens are prefilled).
 * Keep one memo per pig.
 */
export interface PromptMemo {
  /** player text → the user message content that was sent (with its state line). */
  users: Map<string, string>;
  /** displayed reply → raw model output (`[happy] "…"`). */
  replies: Map<string, string>;
  /** `at` of the first history turn in the window. */
  anchor: number | null;
}

const MEMO_CAP = 48;
/** Tokens of headroom left after trimming history (about one exchange). */
const HISTORY_SLACK = 110;

export function createPromptMemo(): PromptMemo {
  return { users: new Map(), replies: new Map(), anchor: null };
}

function capMap(m: Map<string, string>): void {
  while (m.size > MEMO_CAP) m.delete(m.keys().next().value as string);
}

/** Record one LLM exchange: what the newest user message looked like and what the model really wrote. */
export function recordExchange(memo: PromptMemo, playerText: string, userContent: string, replyText: string, rawOutput: string): void {
  memo.users.delete(playerText);
  memo.users.set(playerText, userContent);
  if (replyText && rawOutput) {
    memo.replies.delete(replyText);
    memo.replies.set(replyText, rawOutput.trim());
  }
  capMap(memo.users);
  capMap(memo.replies);
}

/**
 * History turns before the newest message (drops it if the caller already appended it). A safety exchange (a crisis,
 * medical or explicit message and the pig's safety line after it) is never sent to the model, not even as history.
 */
function priorTurns(req: ChatRequest): ChatTurn[] {
  const h = (req.history ?? []).filter((t) => t && typeof t.text === 'string' && t.text.trim());
  const last = h.at(-1);
  const prior = last && last.role === 'player' && last.text.trim() === req.playerText.trim() ? h.slice(0, -1) : h;
  let unsafe = false;
  return prior.filter((t) => {
    if (t.role === 'player') unsafe = isSafetyMessage(t.text);
    return !unsafe;
  });
}

/**
 * The window keeps `size` turns but only moves every few turns (up to size + 3) so the rendered prefix stays
 * identical between turns. Always starts on a player turn.
 */
function historyWindow(turns: ChatTurn[], size: number, memo?: PromptMemo): ChatTurn[] {
  if (!turns.length || size <= 0) {
    if (memo) memo.anchor = null;
    return [];
  }
  let start = Math.max(0, turns.length - size);
  if (memo && memo.anchor !== null) {
    const i = turns.findIndex((t) => t.at === memo.anchor);
    if (i >= 0 && turns.length - i <= size + 3) start = i;
  }
  while (start < turns.length && turns[start].role !== 'player') start++;
  if (memo) memo.anchor = turns[start]?.at ?? null;
  return turns.slice(start);
}

function renderHistory(turns: ChatTurn[], memo?: PromptMemo): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (const t of turns) {
    const text = t.text.replace(/\s+/g, ' ').trim();
    if (t.role === 'player') {
      const content = memo?.users.get(t.text) ?? text;
      const prev = out.at(-1);
      if (prev && prev.role === 'user') prev.content += `\n${text}`;
      else out.push({ role: 'user', content });
    } else {
      const prev = out.at(-1);
      if (prev && prev.role === 'assistant') {
        // Two pig lines in a row: one tagged line.
        const e = isExpression(t.expression) ? t.expression : 'neutral';
        const before = prev.content.replace(/^\[[^\]]*\]\s*"|"$/g, '');
        prev.content = formatTagged(e, `${before} ${text}`);
      } else {
        const raw = memo?.replies.get(t.text);
        out.push({ role: 'assistant', content: raw ?? formatTagged(isExpression(t.expression) ? t.expression : 'neutral', text) });
      }
    }
  }
  return out;
}

// ───────────────────────── build ─────────────────────────

export interface BuildOptions {
  /** Active tier (default 'lfm3'). */
  tier?: ModelId;
  /** Per-pig memo for KV-cache-stable re-rendering (see PromptMemo). */
  memo?: PromptMemo;
}

export interface BuiltPrompt {
  messages: LlmMessage[];
  /** Estimated prompt tokens. */
  tokens: number;
  /** Content of the newest user message (record it with recordExchange after generating). */
  userContent: string;
}

/** Messages for the active tier: system, few-shot pairs, history window, newest user turn with the state line. */
export function buildPrompt(req: ChatRequest, opts: BuildOptions = {}): BuiltPrompt {
  const tier: ModelId = opts.tier ?? 'lfm3';
  const budget: PromptBudget = MODELS[tier].budget;
  const ctx = req.context;
  const system = systemPrompt(req.pig, tier, ctx?.playerName ?? '');
  const player = (req.playerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 280);

  const turns = priorTurns(req);
  let window = historyWindow(turns, budget.historyTurns, opts.memo);
  let shots = budget.fewShots;
  let memories = budget.memories;

  const assemble = () => {
    const state = ctx ? stateLine(ctx, { maxMemories: memories }) : '';
    const history = renderHistory(window, opts.memo);
    // History ending on an unanswered player turn: fold it into the newest message (state line stays first).
    let lead = '';
    if (history.at(-1)?.role === 'user') lead = `${history.pop()!.content.replace(/^\[[^\]\n]*\]\n/, '')}\n`;
    const userContent = `${state ? `${state}\n` : ''}${lead}${player}`;
    const messages: LlmMessage[] = [
      { role: 'system', content: system },
      ...fewShots(req.pig, shots),
      ...history,
      { role: 'user', content: userContent },
    ];
    return { messages, userContent };
  };

  let built = assemble();
  let tokens = estimateMessages(built.messages);
  const rebuild = () => {
    built = assemble();
    tokens = estimateMessages(built.messages);
  };
  const dropOldestExchange = () => {
    let cut = 1;
    while (cut < window.length && window[cut].role !== 'player') cut++;
    window = window.slice(cut);
    rebuild();
  };
  if (tokens > budget.total) {
    // 1. Drop the oldest exchanges with ~one exchange of slack (keeping the last exchange), so the next turn
    //    fits without moving the window again: a moving window changes the prompt prefix (full prefill).
    const target = budget.total - HISTORY_SLACK;
    while (tokens > target && window.length > 2) dropOldestExchange();
    // 2. Then fewer few-shot pairs (down to 2), 3. then the rest of the history, 4. then 1 pair and memories.
    while (tokens > budget.total && shots > 2) {
      shots--;
      rebuild();
    }
    while (tokens > budget.total && window.length > 0) dropOldestExchange();
    while (tokens > budget.total && shots > 1) {
      shots--;
      rebuild();
    }
    while (tokens > budget.total && memories > 0) {
      memories = Math.max(0, memories - 2);
      rebuild();
    }
    if (opts.memo) opts.memo.anchor = window[0]?.at ?? null;
  }
  return { messages: built.messages, tokens, userContent: built.userContent };
}

/** Messages for the active tier (see buildPrompt). */
export function buildMessages(req: ChatRequest, opts: BuildOptions = {}): LlmMessage[] {
  return buildPrompt(req, opts).messages;
}
