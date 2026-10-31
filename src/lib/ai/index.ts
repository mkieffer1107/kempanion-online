// Public API of the AI dialogue module (ARCHITECTURE §6, GAME_DESIGN §11).
// Pipeline per player message: quirk intercepts → brain (Big Brain LLM when loaded AND enabled, else the
// Heuristic Brain) → post-filter → expression (LLM tag or lexicon) → memory extraction → bond/fun effects.
// This module only imports pure code (bun-testable). In the browser it lazily imports manager.svelte.ts,
// which installs the real host (game settings/memories + the LLM worker).
import { CHARACTERS } from '../content/characters';
import { now, nowDate } from '../state/clock';
import type { ChatContext, ChatReply, ChatRequest, ChatTurn, Expression, PigId, SaveData } from '../types';
import { classifyExpression, animFor, finishLine, isExpression, parseTagged, TaggedStream } from './emotion';
import { classifyIntent, heuristicBrain, suggestTopics } from './heuristic';
import { aiHostInstalled, BIG_BRAIN_FLAGS, getAiHost, type AiHost } from './host';
import { extractFacts, rememberFacts, type LearnedFact } from './memory';
import { MAX_CHARS, MAX_SENTENCES, postfilter, sentenceCutIndex } from './postfilter';
import { buildPrompt, createPromptMemo, recordExchange, type PromptMemo } from './prompts';
import { matchQuirk } from './quirks';
import { mumbleText } from './heuristic/mumble';
import { fallbackChips, topicMatch } from './topics';

export type { Brain } from './brain';
export type { AiHost, AiStatus, LlmHandle } from './host';
export { BIG_BRAIN_FLAGS, installAiHost, getAiHost } from './host';
export {
  matchQuirk, isDistress, isMedicalAdvice, isSafetyMessage, normalizeForQuirk, CODEX_LINES, UF_CWC_PHONE, CRISIS_LINE, CRISIS_CALL,
  CRISIS_REACH,
} from './quirks';
export type { QuirkHit, QuirkKind } from './quirks';
// Piggy 3's X mumble, for the Talk screen (the reply-effect contract: types.ts ChatReply.effect / ChatMumble)
export { isMumbleReply, mumbleText, MUMBLE_FACES } from './heuristic/mumble';
export type { MumbleKind, MumbleReply } from './heuristic/mumble';
export { postfilter, splitSentences, isNotPG } from './postfilter';
export { parseTagged, TaggedStream, classifyExpression, animFor, normalizeTag, finishLine, formatTagged, OUTPUT_REGEX } from './emotion';
export { extractFacts, rememberFacts, followUpsDue, resolveDay } from './memory';
export type { LearnedFact, MemoryStore } from './memory';
export { buildMessages, buildPrompt, systemPrompt, stateLine, estimateTokens, createPromptMemo } from './prompts';
export { MODELS, MODEL_IDS, recommendDefault, resolveModelId, availability, formatBytes } from './models';
export type { ModelId, ModelDef, DeviceCaps } from './models';

/** No first token within this → the Heuristic Brain answers instead. */
export const FIRST_TOKEN_TIMEOUT_MS = 8000;
/** Hard cap on one Big Brain reply (a partial line is kept if it is usable). */
export const TOTAL_TIMEOUT_MS = 25000;
/** Piggy 3 offers the Big Brain at most this often. */
export const OFFER_EVERY_MS = 3 * 24 * 3_600_000;

export type FallbackReason = 'timeout' | 'error' | 'empty' | 'aborted';

export interface RespondOptions {
  /** The portrait expression, as soon as it is known (LLM: the tag at the start of the stream). */
  onExpression?: (expression: Expression) => void;
  /** Facts remembered from this message (for a subtle "♪ remembered" hint). */
  onLearned?: (facts: LearnedFact[]) => void;
  /** The Big Brain was used but the Heuristic Brain answered (mark the line with the gear icon). */
  onFallback?: (reason: FallbackReason) => void;
  /** Override FIRST_TOKEN_TIMEOUT_MS / TOTAL_TIMEOUT_MS (tests, slow devices). */
  firstTokenTimeoutMs?: number;
  totalTimeoutMs?: number;
  /** 'heuristic' = the player picked one of the preset reply options: always the scripted answer, even with the
   *  Big Brain on. Only text the player writes goes to the LLM. Default 'auto'. */
  brain?: 'auto' | 'heuristic';
}

const LAST_RESORT: Record<PigId, string> = {
  'piggy-1': 'Whoa, that one went over the net! Say it again?',
  'piggy-2': 'History unclear. Again, slower.',
  'piggy-3': 'Wait, I lost the thread. Say that again?',
};

const PASSION_INTENT: Record<PigId, string> = { 'piggy-1': 'passion_p1', 'piggy-2': 'passion_p2', 'piggy-3': 'passion_p3' };

const memos = new Map<PigId, PromptMemo>();
let sessionExchanges = 0;
let hostLoad: Promise<unknown> | null = null;

function memoFor(pig: PigId): PromptMemo {
  let m = memos.get(pig);
  if (!m) memos.set(pig, (m = createPromptMemo()));
  return m;
}

/** In the browser, make sure the real host (game store + LLM manager) is installed. Never throws. */
async function ensureHost(): Promise<AiHost> {
  if (!aiHostInstalled() && typeof window !== 'undefined' && typeof document !== 'undefined') {
    hostLoad ??= import('./manager.svelte').catch(() => null);
    await hostLoad;
  }
  return getAiHost();
}

function wantsLlm(host: AiHost): boolean {
  try {
    return !!host.llm && host.llm.status() === 'ready' && host.settings().aiMode === 'llm';
  } catch {
    return false;
  }
}

function heuristicIntent(text: string, pig: PigId): string | null {
  try {
    const r = classifyIntent(text, pig) as { intent?: unknown } | null;
    return typeof r?.intent === 'string' ? r.intent : null;
  } catch {
    return null;
  }
}

/** +2 bond per exchange, +1 when the player brings up the pig's thing; +3 fun. The caller applies daily caps. */
export function exchangeEffects(pig: PigId, playerText: string): { bond: number; fun: number } {
  const intent = heuristicIntent(playerText, pig);
  if (intent === 'insult') return { bond: 0, fun: 0 };
  const topical = intent === PASSION_INTENT[pig] || topicMatch(pig, playerText);
  return { bond: 2 + (topical ? 1 : 0), fun: 3 };
}

/**
 * The reply-effect contract (types.ts ChatReply.effect): a reply with `effect: 'mumble'` carries its `mumble`, and its
 * `text` is the same words as one plain line (opener, stream, catch), which the chat log, the backlog and the Big
 * Brain's history keep. So a UI that plays the effect and one that only shows `text` say the same thing. A half-made
 * effect (no mumble, or a `text` something rewrote) is dropped, and the plain line shows.
 */
export function withEffect(reply: ChatReply): ChatReply {
  if (reply.effect === undefined && reply.mumble === undefined) return reply;
  const m = reply.mumble;
  if (reply.effect === 'mumble' && m && reply.text === mumbleText(m)) return reply;
  const plain: ChatReply = { ...reply };
  delete plain.effect;
  delete plain.mumble;
  return plain;
}

async function llmReply(
  req: ChatRequest,
  host: AiHost,
  onToken: ((delta: string) => void) | undefined,
  signal: AbortSignal | undefined,
  opts: RespondOptions,
): Promise<{ reply: ChatReply | null; reason: FallbackReason; streamed: boolean }> {
  const llm = host.llm!;
  if (signal?.aborted) return { reply: null, reason: 'aborted', streamed: false };
  const tier = llm.modelId() ?? 'lfm3';
  const memo = memoFor(req.pig);
  let built: ReturnType<typeof buildPrompt>;
  try {
    built = buildPrompt(req, { tier, memo });
  } catch {
    return { reply: null, reason: 'error', streamed: false };
  }

  const ac = new AbortController();
  let reason: FallbackReason | null = null;
  let sawToken = false;
  let totalTimedOut = false;
  let tagSent = false;
  let streamed = false;
  let shown = '';
  let capped = false;
  const onAbort = () => {
    reason ??= 'aborted';
    ac.abort();
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  const firstTimer = setTimeout(() => {
    if (!sawToken) {
      reason ??= 'timeout';
      ac.abort();
    }
  }, opts.firstTokenTimeoutMs ?? FIRST_TOKEN_TIMEOUT_MS);
  const totalTimer = setTimeout(() => {
    totalTimedOut = true;
    ac.abort();
  }, opts.totalTimeoutMs ?? TOTAL_TIMEOUT_MS);
  const stream = new TaggedStream({
    maxChars: MAX_CHARS,
    onTag: (e) => {
      tagSent = true;
      opts.onExpression?.(e);
    },
  });

  try {
    const res = await llm.generate(built.messages, {
      sessionKey: req.pig,
      signal: ac.signal,
      onToken: (delta) => {
        sawToken = true;
        if (reason || capped) return;
        let visible = stream.push(delta);
        if (!visible) return;
        // Once a 4th sentence starts, the first three are the reply: show up to there and stop generating.
        const cut = sentenceCutIndex(shown + visible, MAX_SENTENCES);
        if (cut >= 0) {
          visible = (shown + visible).slice(shown.length, cut);
          capped = true;
          ac.abort();
        }
        shown += visible;
        if (visible) {
          streamed = true;
          onToken?.(visible);
        }
      },
    });
    if (reason) return { reply: null, reason, streamed };
    const parsed = parseTagged(res.text);
    // A line that stopped without final punctuation was cut off (token limit, the regex's 240-char cap, or an
    // interrupt): keep whole sentences.
    const cutOff = !parsed.complete || res.interrupted || (parsed.text.length >= 230 && !/[.!?…]["'”’)]*$/.test(parsed.text));
    const text = capped ? shown : parsed.text;
    const line = postfilter(finishLine(text, capped || !cutOff), {
      pig: req.pig,
      pigName: CHARACTERS[req.pig].name,
    });
    if (!line) return { reply: null, reason: 'empty', streamed };
    const expression = parsed.expression ?? classifyExpression(req.pig, line, req.playerText).expression;
    if (!tagSent) opts.onExpression?.(expression);
    // Re-use the raw output in later prompts only when it is exactly the clean line we showed; otherwise the
    // history renders `[expression] "line"` (a well-formed turn matters more than a KV-cache hit).
    const clean = !capped && !cutOff && parsed.tagged && line === parsed.text;
    recordExchange(memo, req.playerText, built.userContent, line, clean ? res.text : '');
    return { reply: { text: line, expression, anim: animFor(expression), source: 'llm' }, reason: 'empty', streamed };
  } catch (e) {
    if (!reason && !totalTimedOut) llm.reportFailure?.(e);
    return { reply: null, reason: reason ?? (totalTimedOut ? 'timeout' : 'error'), streamed };
  } finally {
    clearTimeout(firstTimer);
    clearTimeout(totalTimer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function heuristicReply(
  req: ChatRequest,
  onToken: ((delta: string) => void) | undefined,
  signal: AbortSignal | undefined,
  opts: RespondOptions,
): Promise<ChatReply> {
  try {
    const r = await heuristicBrain.respond(req, onToken, signal);
    const text = postfilter(r.text, { pig: req.pig, pigName: CHARACTERS[req.pig].name, light: true }) || LAST_RESORT[req.pig];
    const expression = isExpression(r.expression) ? r.expression : classifyExpression(req.pig, text, req.playerText).expression;
    opts.onExpression?.(expression);
    return { ...r, text, expression, source: r.source === 'quirk' ? 'quirk' : 'heuristic' };
  } catch {
    opts.onExpression?.('confused');
    return { text: LAST_RESORT[req.pig], expression: 'confused', source: 'heuristic' };
  }
}

/**
 * Full reply pipeline: quirk overrides → active brain (LLM if loaded, enabled and the player wrote the message;
 * else heuristic) → post-filter → expression → memory extraction. Never rejects: falls back to the heuristic brain
 * on error.
 *
 * `onToken` gets display text as it streams (tag and quotes already stripped). The returned `text` is
 * authoritative: show it when the promise resolves (it is post-filtered, and a fallback replaces a stalled stream).
 */
export async function respond(
  req: ChatRequest,
  onToken?: (delta: string) => void,
  signal?: AbortSignal,
  opts: RespondOptions = {},
): Promise<ChatReply> {
  const host = await ensureHost();
  const pig = req.pig;
  let reply: ChatReply | null = null;
  let safety = false;

  // 1. Deterministic intercepts (hard quirks, Go Gators, medical/distress/explicit, Piggy 3's X mumble). Not streamed:
  //    they appear at once (source 'quirk'), and a quirk's scripted delivery (`effect`, `mumble`) comes along as is.
  try {
    const hit = matchQuirk({ pig, playerText: req.playerText, history: req.history });
    if (hit) {
      reply = { ...hit.reply };
      safety = hit.safety;
      opts.onExpression?.(reply.expression);
    }
  } catch {
    /* intercepts must never block a reply */
  }

  // 2. Brain.
  let streamed = false;
  if (!reply && opts.brain !== 'heuristic' && wantsLlm(host)) {
    const r = await llmReply(req, host, onToken, signal, opts);
    streamed = r.streamed;
    if (r.reply) reply = r.reply;
    else opts.onFallback?.(r.reason);
  }
  // A fallback after a partial stream doesn't append to it: the caller shows reply.text when we resolve.
  if (!reply) reply = await heuristicReply(req, streamed ? undefined : onToken, signal, opts);
  // The Talk screen plays an effect only when it is whole (its mumble, and `text` saying the same words).
  reply = withEffect(reply);

  // 3. Effects + memory (not for safety intercepts).
  if (!safety) {
    reply.effects ??= exchangeEffects(pig, req.playerText);
    try {
      const facts = extractFacts(req.playerText, nowDate());
      if (facts.length) {
        const stored = rememberFacts(pig, facts, {
          remember: (p, f) => host.remember(p, f),
          forget: host.forget ? (p, pred) => host.forget!(p, pred) : undefined,
        });
        opts.onLearned?.(stored);
      }
    } catch {
      /* memory is a bonus */
    }
  } else {
    delete reply.effects;
  }

  // A safety exchange isn't a chat: it doesn't count toward the chats the Big Brain offer waits for either.
  if (!safety) {
    sessionExchanges++;
    try {
      host.countExchange?.();
    } catch {
      /* counters are a bonus */
    }
  }
  return reply;
}

/** 3–4 short quick-reply chips for the chat input (deterministic, context-aware). */
export function suggestReplies(pig: PigId, ctx: ChatContext, history: ChatTurn[]): string[] {
  try {
    const chips = suggestTopics(pig, ctx, history) as unknown;
    if (Array.isArray(chips)) {
      const clean = [...new Set(chips.filter((c): c is string => typeof c === 'string' && !!c.trim()).map((c) => c.trim()))];
      if (clean.length >= 2) return clean.slice(0, 4);
    }
  } catch {
    /* fall through to the built-in chips */
  }
  return fallbackChips(pig, ctx, history);
}

// ───────────────────────── Big Brain offer (Piggy 3's card after the 3rd exchange) ─────────────────────────

function playerTurns(save: SaveData): number {
  let n = 0;
  for (const turns of Object.values(save.chatLog ?? {})) n += (turns ?? []).filter((t) => t.role === 'player').length;
  return n;
}

/**
 * True when Piggy 3 should offer the Big Brain: after the 3rd free-chat exchange this session, at most once every
 * 3 days, never after "Don't ask again", and not when a model is loaded/loading or WebGPU is known missing.
 * Record the offer with markBigBrainOffered().
 */
export function bigBrainOfferDue(save: SaveData, at: number = now()): boolean {
  const flags = save.flags ?? {};
  if (flags[BIG_BRAIN_FLAGS.never]) return false;
  const llm = getAiHost().llm;
  try {
    const st = llm?.status();
    if (st && st !== 'idle' && st !== 'error') return false;
    if (llm?.supported() === false) return false;
  } catch {
    /* unknown → allowed */
  }
  if (sessionExchanges < 3) return false;
  const lifetime = Math.max(Number(flags[BIG_BRAIN_FLAGS.chats]) || 0, playerTurns(save));
  if (lifetime < 3) return false;
  const last = Number(flags[BIG_BRAIN_FLAGS.offeredAt]) || 0;
  return at - last >= OFFER_EVERY_MS;
}

/** The offer card was shown (starts the 3-day quiet period). */
export function markBigBrainOffered(save: SaveData, at: number = now()): void {
  save.flags[BIG_BRAIN_FLAGS.offeredAt] = at;
  getAiHost().persist?.();
}

/** "Not now" (quiet for 3 days) or "Don't ask again" (forever). */
export function dismissBigBrainOffer(save: SaveData, forever = false, at: number = now()): void {
  save.flags[BIG_BRAIN_FLAGS.offeredAt] = at;
  if (forever) save.flags[BIG_BRAIN_FLAGS.never] = true;
  getAiHost().persist?.();
}

/** Free-chat exchanges since the page loaded. */
export function sessionExchangeCount(): number {
  return sessionExchanges;
}

/** Forget per-session state (prompt memos, exchange count). For tests and "Clear chat memory". */
export function resetAiSession(): void {
  memos.clear();
  sessionExchanges = 0;
}
