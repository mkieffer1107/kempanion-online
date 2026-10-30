// Free chat with a pig in the VN box: greeting, then ask → respond (streamed, with blips and expressions)
// until the player leaves or maxTurns is reached. Chat bond is scored here, through the daily caps.
// The player answers through ChatChoices (quick replies as VN choice rows + a one-line "Say something else…").
import { EXPRESSIONS, type ChatContext, type ChatReply, type ChatTurn, type Expression, type LocationId, type OutfitId, type PigId } from '../types';
import { audio } from '../audio';
import { stage, type PortraitPos } from '../engine/stage';
import { game } from '../state/game.svelte';
import { now, nowDate } from '../state/clock';
import { clockString, timeOfDay } from '../time';
import { whereIs } from '../content/locations';
import { CHARACTERS } from '../content/characters';
import { respond, suggestReplies } from '../ai';
import { greeting } from '../ai/heuristic';
import { bondLevel, moodOf } from '../pet';
import { dialogue, type LineHandle } from './dialogue.svelte';
import { scoreChat } from './effects';

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
  /** Last expression the chat put on the portrait. */
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

function asExpression(e: string | undefined): Expression {
  return e && (EXPRESSIONS as readonly string[]).includes(e) ? (e as Expression) : 'neutral';
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
  const live = () => alive && dialogue.generation === gen;
  const onLeave = () => {
    alive = false;
    ctrl?.abort();
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
      const h = dialogue.beginLine(pig, expression);
      h.append(g.text);
      await h.finish(undefined, { wait: false });
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

      // Heuristic answers wait 250–450 ms on the thinking face; streamed tokens are held until then too.
      ctrl = new AbortController();
      const instantText = game.save.settings.textSpeed <= 0;
      let open = false;
      let buffered = '';
      let handle: LineHandle | null = null;
      // The LLM's [tag] arrives before the line; show that face as soon as the line starts typing.
      let early: Expression | null = null;
      const flush = () => {
        if (!open || !buffered || !live()) return;
        if (!handle) {
          handle = dialogue.beginLine(pig, early ?? undefined);
          face(early ?? 'neutral');
        }
        handle.append(buffered);
        buffered = '';
      };
      const gate = sleep(instantText ? 0 : 250 + Math.random() * 200).then(() => { open = true; flush(); });
      const onExpression = (e: string) => {
        early = asExpression(e);
        if (handle && live()) face(early);
      };

      let reply: ChatReply;
      try {
        reply = await respond(
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
      await gate;
      if (!live() || ctrl.signal.aborted) break;

      const expression = asExpression(reply.expression);
      face(expression);
      const instant = reply.source === 'quirk';
      const line: LineHandle = handle ?? dialogue.beginLine(pig, expression, { instant });
      dialogue.expression = expression;
      // Quirk replies appear at once with a single blip ("Patriot." gets Piggy 2's two-note signature in finish()).
      if (instant && !/^patriot[.!]?$/i.test(reply.text.trim())) audio.blip(pig, { index: 0, last: true });
      await line.finish(reply.text, { wait: false });

      // The game scores chat (+2, +1 on topic, daily cap); a brain proposing more than the base marks "on topic".
      scoreChat(pig, text, (reply.effects?.bond ?? 0) > 2);
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
