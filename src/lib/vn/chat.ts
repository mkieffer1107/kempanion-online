// Free chat with a pig in the VN box: greeting, then ask → respond (streamed, with blips and expressions)
// until the player leaves or maxTurns is reached. Chat bond is scored here, through the daily caps.
// The player answers through ChatChoices (quick replies as VN choice rows + a one-line "Say something else…").
// A line too long for the box is paged like a scene line (chat-pages.ts): a tap between pages.
// A reply with a scripted delivery plays it instead of one line: Piggy 3's X mumble (playMumble).
import { tick } from 'svelte';
import {
  PORTRAIT_FACES, type ChatContext, type ChatMumble, type ChatReply, type ChatTurn, type Expression, type LocationId, type OutfitId,
  type PigId,
} from '../types';
import { audio } from '../audio';
import { stage, type PortraitPos } from '../engine/stage';
import { game } from '../state/game.svelte';
import { now, nowDate } from '../state/clock';
import { clockString, timeOfDay } from '../time';
import { whereIs } from '../content/locations';
import { CHARACTERS } from '../content/characters';
import { respond, suggestReplies } from '../ai';
import { greeting } from '../ai/heuristic';
import { isDistress, isSafetyReply } from '../ai/quirks';
import { bondLevel, moodOf } from '../pet';
import { dialogue, type LineHandle } from './dialogue.svelte';
import { scoreChat } from './effects';
import { fitsGrid, fittingWords, gridOf, pageLine, PHONE_GRID, type TextGrid } from './chat-pages';
import { mumbleStage } from './components/mumble.svelte';
import { mumblePages } from './components/mumble-layout';

export interface FreeChatOptions {
  /** Hint above the chat field, e.g. "Ask him anything about the lab!". */
  prompt?: string;
  /** Stop after this many player messages (default: until Leave). */
  maxTurns?: number;
  /** Open with the pig's greeting (default true; scenes pass false). */
  greet?: boolean;
  /** ChatContext.situation for the brain (what is going on). */
  situation?: string;
  /** Where the chat happens (default: where the pig is now). */
  location?: LocationId;
  /** Show the pig's portrait (default true). */
  showPortrait?: boolean;
  /**
   * Portrait slot (default 'center'). The talk screen stands the pig on the left on wide layouts so the reply
   * options fit beside him; setFreeChatPosition() moves him when the layout changes mid-chat.
   */
  position?: PortraitPos;
  /** Portrait outfit (default: the pig's current outfit). */
  outfit?: OutfitId;
}

/** Longest free-chat message: one line of the reply field on a wide screen (narrower screens fit fewer). */
export const FREE_CHAT_MAX_CHARS = 48;

const CHAT_LOG_CAP = 40;

/** The free chat in progress (there is one dialogue box, so at most one), for setFreeChatPosition(). */
interface ActiveChat {
  pig: PigId;
  outfit: OutfitId;
  /** Last expression the chat put on the portrait (a pose too: his phone stays out through a rotate). */
  face: Expression;
  pos: PortraitPos;
  portrait: boolean;
}
let active: ActiveChat | null = null;

/** Move the portrait of the free chat in progress to another slot (e.g. the layout switched between wide and tall). */
export function setFreeChatPosition(pos: PortraitPos): void {
  const a = active;
  if (!a || a.pos === pos) return;
  a.pos = pos;
  if (a.portrait) stage.showPortrait(a.pig, a.face, pos, a.outfit);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The mumble stream types this many times faster than his voice (punctuation pauses too): Deku-fast. */
export const MUMBLE_RATE = 2;
/** The opener stays this long once typed before the stream starts (no tap; a tap skips the wait). */
export const MUMBLE_HOLD_MS = 350;

/** Dev builds: the next free-chat reply instead of the brain's (debugNextReply), to check a delivery by hand. */
let nextReply: ChatReply | null = null;

/**
 * Dev builds only (Vite dev server): answer the next free-chat message with `reply` (null cancels). For checking a
 * scripted delivery such as the mumble on screen without steering the brain into it.
 */
export function debugNextReply(reply: ChatReply | null): void {
  if (import.meta.env?.DEV) nextReply = reply;
}

/** A sentence end inside streamed text (the next sentence has begun), as in chat-pages.ts sentencesOf(). */
const SENTENCE_END = /[.!?…]+["”’')\]]*\s+(?=["“‘'(\[]?[A-Z0-9])/;
/** Streamed text that ends with a whole sentence. */
const SENTENCE_SHOWN = /[.!?…]+["”’')\]]*\s*$/;

function asExpression(e: string | undefined): Expression {
  return e && (PORTRAIT_FACES as readonly string[]).includes(e) ? (e as Expression) : 'neutral';
}

/** ChatContext from the live save (plain copies: it may be posted to the LLM worker). */
export function chatContext(pig: PigId, opts: Pick<FreeChatOptions, 'location' | 'situation'> = {}): ChatContext {
  const d = nowDate();
  const p = game.save.pigs[pig];
  return {
    playerName: game.save.player.name,
    pig,
    isCompanion: game.save.companion === pig,
    location: opts.location ?? whereIs(pig, d),
    timeOfDay: timeOfDay(d),
    clock: clockString(d),
    needs: { ...p.needs },
    mood: moodOf(p),
    sick: p.sick,
    bondLevel: bondLevel(p.bond),
    memories: [...game.save.memories[pig]],
    situation: opts.situation,
    outfit: p.outfit,
  };
}

function history(pig: PigId): ChatTurn[] {
  return game.save.chatLog[pig].map((t) => ({ ...t }));
}

function record(pig: PigId, turns: ChatTurn[]) {
  const log = game.save.chatLog[pig];
  log.push(...turns);
  if (log.length > CHAT_LOG_CAP) log.splice(0, log.length - CHAT_LOG_CAP);
  game.persist();
}

function placeholder(pig: PigId): string {
  return game.save.settings.aiMode === 'llm' ? `Say anything to ${CHARACTERS[pig].name}…` : `Say something to ${CHARACTERS[pig].name}…`;
}

/** Rows × characters the dialogue box shows right now (layout, Text Size); the small-phone box when not measurable. */
function textGrid(): TextGrid {
  const el = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.vn-box .text');
  if (!el) return PHONE_GRID;
  const cs = getComputedStyle(el);
  return gridOf(el.clientWidth, parseFloat(cs.fontSize), parseFloat(cs.lineHeight), parseFloat(cs.maxHeight)) ?? PHONE_GRID;
}

/** say() logs a paged line once, in full: the first page's backlog entry gets the whole line, later pages none. */
function logOnce(pig: PigId, page: string, index: number, whole: string): void {
  const log = dialogue.log;
  const last = log[log.length - 1];
  if (!last || last.speaker !== pig || last.text !== page) return;
  if (index === 0) last.text = whole;
  else log.pop();
}

/**
 * Piggy 3's X mumble (ChatReply.effect 'mumble', ai/heuristic/mumble.ts), played instead of one line:
 *   opener  his voice, phone out (pose 'phone'); typed, it holds a moment and flows on (no tap)
 *   stream  small, dim and fast (×MUMBLE_RATE, whispered blips) while he mumbles at the phone ('phone_mumble'),
 *           paged at the stream's font with a tap between pages; each fragment's buzzword pops around him as the
 *           typewriter reaches it (mumbleStage → MumbleBubbles.svelte, on the Talk screen)
 *   catch   his voice again ('flustered_blush'); every bubble pops as he catches himself; the options come up after it
 * `face` puts a face on the portrait and remembers it. The backlog keeps one entry: `whole` (reply.text). A set without
 * the pose cells shows their stand-ins (types.ts POSE_FALLBACK).
 */
async function playMumble(
  pig: PigId,
  m: ChatMumble,
  whole: string,
  grid: TextGrid,
  live: () => boolean,
  left: Promise<void>,
  face: (e: Expression) => void,
): Promise<void> {
  let logged = false;
  /** The line just finished went to the backlog: the first becomes the whole mumble, the rest leave. */
  const keepOne = (text: string) => {
    const log = dialogue.log;
    const last = log[log.length - 1];
    if (!last || last.speaker !== pig || last.text !== text) return;
    if (logged) log.pop();
    else last.text = whole;
    logged = true;
  };
  try {
    face(m.faces.opener);
    await showLine(pig, m.opener, m.faces.opener, grid, live, left);
    keepOne(m.opener);
    if (!live()) return;
    await Promise.race([dialogue.pause(MUMBLE_HOLD_MS), left]);
    if (!live()) return;
    face(m.faces.stream);
    mumbleStage.begin();
    // the box takes the stream's small font now: page the stream for it
    await tick();
    for (const page of mumblePages(m, textGrid())) {
      if (!live()) return;
      mumbleStage.showPage(page.bubbles);
      const line = dialogue.beginLine(pig, m.faces.stream, { whisper: true, rate: MUMBLE_RATE });
      const done = line.finish(page.text, { wait: true });
      keepOne(page.text);
      await Promise.race([done, left]);
    }
    if (!live()) return;
  } finally {
    mumbleStage.end();
  }
  face(m.faces.catch);
  await tick();
  await showLine(pig, m.catch, m.faces.catch, textGrid(), live, left);
  keepOne(m.catch);
}

/**
 * Show a pig's chat line like a scene line: a line too long for the box is paged at sentence boundaries, every page
 * but the last waits for a tap, and the last one doesn't (the reply options come up). `first` is a line already
 * streaming into the box with `streamed` on it. `left` settles when the player leaves (BYE): stop at once, even on a
 * page that waits for a tap. `front`: a safety line, paged front-first so where to reach out is all on the first page.
 */
async function showLine(
  pig: PigId,
  text: string,
  expression: Expression,
  grid: TextGrid,
  live: () => boolean,
  left: Promise<void>,
  opts: { first?: LineHandle | null; streamed?: string; instant?: boolean; front?: boolean } = {},
): Promise<void> {
  const first = opts.first ?? null;
  const streamed = opts.streamed ?? '';
  let pages = pageLine(text, grid, opts.front);
  // The typewriter already passed the first page's sentence break: keep what is on screen as the first page.
  if (first && pages.length > 1 && streamed.trim() && text.startsWith(streamed) && dialogue.shown > pages[0].length) {
    pages = [streamed.trim(), ...pageLine(text.slice(streamed.length), grid)];
  }
  for (let i = 0; i < pages.length; i++) {
    const last = i === pages.length - 1;
    const line = i === 0 && first ? first : dialogue.beginLine(pig, expression, { instant: opts.instant && pages.length === 1 });
    const done = line.finish(pages[i], { wait: !last });
    if (pages.length > 1) logOnce(pig, pages[i], i, text);
    await Promise.race([done, left]);
    if (!live()) return;
  }
}

/**
 * Free-chat loop with a pig: greeting, then ask → respond (streamed, with blips, expressions,
 * memory) until the player leaves or maxTurns is reached.
 */
export async function runFreeChat(pig: PigId, opts: FreeChatOptions = {}): Promise<void> {
  const standalone = dialogue.mode === null;
  if (standalone) dialogue.mode = 'chat';
  dialogue.chatOpen = true;
  const outfit = opts.outfit ?? game.save.pigs[pig].outfit;
  // dialogue.cancel()/reset() (Back, Esc, a scene taking over) bumps the generation: stop at the next step.
  const gen = dialogue.generation;
  let alive = true;
  let ctrl: AbortController | null = null;
  // dialogue.leave() with no open question (S layout's BYE while he talks) only calls onLeave: `left` lets the line
  // on screen go, a page waiting for a tap included.
  let leftNow: () => void = () => {};
  const left = new Promise<void>((resolve) => (leftNow = resolve));
  const live = () => alive && dialogue.generation === gen;
  const onLeave = () => {
    alive = false;
    ctrl?.abort();
    leftNow();
  };
  dialogue.onLeave = onLeave;
  const me: ActiveChat = { pig, outfit, face: 'neutral', pos: opts.position ?? 'center', portrait: opts.showPortrait !== false };
  active = me;
  /** Set the portrait's expression and remember it (setFreeChatPosition re-shows him with it). */
  const face = (e: Expression) => {
    me.face = e;
    stage.setExpression(pig, e);
  };

  try {
    if (me.portrait) stage.showPortrait(pig, 'neutral', me.pos, outfit);
    if (opts.greet !== false) {
      // Passing the chat log lets the greeting check in on earlier topics ("How did the exam go?").
      const g = greeting(pig, chatContext(pig, opts), history(pig));
      const expression = asExpression(g.expression);
      face(expression);
      // Open the box first so it can be measured: a long greeting is paged like any line.
      const h = dialogue.beginLine(pig, expression);
      await tick();
      await showLine(pig, g.text, expression, textGrid(), live, left, { first: h });
    }

    for (let turn = 0; live() && (opts.maxTurns === undefined || turn < opts.maxTurns); turn++) {
      const ctx = chatContext(pig, opts);
      const past = history(pig);
      const presets = suggestReplies(pig, ctx, past);
      const text = await dialogue.ask({
        prompt: opts.prompt,
        placeholder: placeholder(pig),
        quickReplies: presets,
        allowLeave: true,
        maxLength: FREE_CHAT_MAX_CHARS,
      });
      if (text === null || !live()) break;
      const playerTurn: ChatTurn = { role: 'player', text, at: now() };

      if (game.save.settings.echoPlayer) {
        const echo = dialogue.beginLine('player', undefined, { instant: true });
        echo.append(text);
        await echo.finish(undefined, { wait: false });
        dialogue.setThinking(true);
      } else {
        dialogue.addLog('player', text);
        dialogue.setThinking(true, pig);
      }
      face('thinking');

      // Heuristic answers wait 250–450 ms on the thinking face; streamed tokens are held until then too. A stream only
      // fills the first page of the box: the first sentence word by word, every later one only once it is complete
      // and fits, so a long reply's first page ends at a sentence end. The finished reply is paged by showLine().
      ctrl = new AbortController();
      const instantText = game.save.settings.textSpeed <= 0;
      let open = false;
      let settled = false;
      let buffered = '';
      let streamed = '';
      let full = false;
      let grid: TextGrid = PHONE_GRID;
      let handle: LineHandle | null = null;
      // The LLM's [tag] arrives before the line; show that face as soon as the line starts typing.
      let early: Expression | null = null;
      const flush = () => {
        while (open && !settled && !full && live() && buffered) {
          let take = '';
          if (SENTENCE_SHOWN.test(streamed)) {
            // a sentence is on screen: add whole sentences that fit; once the next one can't, the page ends here
            const ended = new RegExp(SENTENCE_END.source, 'g');
            for (let m = ended.exec(buffered); m; m = ended.exec(buffered)) {
              if (!fitsGrid(streamed + buffered.slice(0, ended.lastIndex), grid)) break;
              take = buffered.slice(0, ended.lastIndex);
            }
            if (!fitsGrid(streamed + buffered.trimEnd(), grid)) full = true;
            if (!take) return;
          } else {
            // the first sentence, word by word (up to its end)
            const words = buffered.search(/\s\S*$/) + 1;
            if (!words) return;
            take = buffered.slice(0, words);
            const end = SENTENCE_END.exec(take);
            if (end) take = take.slice(0, end.index + end[0].length);
            if (!fitsGrid(streamed + take, grid)) {
              take = fittingWords(streamed, take, grid);
              full = true;
            }
          }
          buffered = buffered.slice(take.length);
          if (!take) return;
          if (!handle) {
            handle = dialogue.beginLine(pig, early ?? undefined);
            face(early ?? 'neutral');
          }
          handle.append(take);
          streamed += take;
        }
      };
      const gate = sleep(instantText ? 0 : 250 + Math.random() * 200).then(() => {
        grid = textGrid();
        open = true;
        flush();
      });
      const onExpression = (e: string) => {
        early = asExpression(e);
        if (handle && live()) face(early);
      };

      let reply: ChatReply;
      const forced = nextReply;
      nextReply = null;
      try {
        reply = forced ?? await respond(
          { pig, playerText: text, history: past, context: ctx },
          (d) => { buffered += d; flush(); },
          ctrl.signal,
          // A preset option gets the scripted (heuristic) answer; only the player's own words use the Big Brain.
          { onExpression, brain: presets.some((q) => q.trim() === text.trim()) ? 'heuristic' : 'auto' },
        );
      } catch (e) {
        console.error('[vn] chat brain failed:', e);
        reply = { text: '…', expression: 'confused', source: 'heuristic' };
      }
      settled = true;
      await gate;
      if (!live() || ctrl.signal.aborted) break;

      const expression = asExpression(reply.expression);
      // A crisis, medical or explicit message isn't a chat: never scored (no hearts, want, daily task, so no toasts
      // over the line), and the crisis line is paged front-first (where to reach out never waits behind a tap).
      const safety = isSafetyReply(reply) || isDistress(text);
      // Piggy 3's X mumble plays as opener, stream and catch, with his phone poses (only on his portrait: anywhere
      // else the plain `text` holds the whole thing).
      const mumble = !safety && reply.effect === 'mumble' && reply.mumble && me.portrait ? reply.mumble : null;
      if (mumble) {
        await playMumble(pig, mumble, reply.text, grid, live, left, face);
      } else {
        face(expression);
        // Short quirk punchlines ("Patriot.", "SPIKE!!") pop in at once with a single blip ("Patriot." gets Piggy 2's
        // two-note signature in finish()); longer quirk lines (Go Gators, safety notes) type out like any reply.
        const instant = reply.source === 'quirk' && reply.text.length <= 24;
        if (handle) dialogue.expression = expression;
        if (instant && !/^patriot[.!]?$/i.test(reply.text.trim())) audio.blip(pig, { index: 0, last: true });
        await showLine(pig, reply.text, expression, grid, live, left, { first: handle, streamed, instant, front: safety });
      }

      // The game scores chat (+2, +1 on topic, daily cap); a brain proposing more than the base marks "on topic".
      if (!safety) scoreChat(pig, text, (reply.effects?.bond ?? 0) > 2);
      record(pig, [playerTurn, { role: 'pig', text: reply.text, at: now(), expression }]);
    }
  } finally {
    ctrl?.abort();
    if (active === me) active = null;
    if (dialogue.onLeave === onLeave) dialogue.onLeave = null;
    if (standalone) {
      // Only reset if nothing else (a scene) has taken the box over in the meantime.
      if (dialogue.mode === 'chat') dialogue.reset();
    } else if (dialogue.generation === gen) {
      dialogue.thinking = false;
      dialogue.chatOpen = false;
    }
  }
}
