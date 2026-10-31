// Runs a compiled KScript scene against an injected environment. Pure (bun-testable): the Vite-side
// runner (runner.ts) supplies the real stage, audio, dialogue and game store.
//
// Replay mode (album) never changes the save: bond/money/items/needs/memories/name/companion are skipped,
// [input] and [chat] are skipped, and [set]/[unset] write to a scene-local overlay that conditions still read.
import { PORTRAIT_FACES, type Expression, type NeedId, type OutfitId, type PigId, type SpeakerId } from '../types';
import type { MinigameResult } from '../minigames';
import { evalCondition, type CondState } from './conditions';
import { interpolate, type InterpContext } from './interpolate';
import type { Command, Op, Scene } from './kscript';

export interface SayLine { speaker: SpeakerId; text: string; expression?: Expression; key: string; line: number }

/** Commands the environment presents directly (stage, audio, CG, ambience, portrait outfits, name plates). */
export type PresentCommand = Extract<Command, {
  kind: 'bg' | 'bgm' | 'show' | 'hide' | 'expr' | 'sfx' | 'jingle' | 'wait' | 'shake' | 'flash' | 'fade' | 'burst'
    | 'petals' | 'weather' | 'time' | 'pager' | 'brain' | 'cg' | 'outfit' | 'nameplate';
}>;

/** Save mutations. Never called in replay mode. */
export interface VnStore {
  setFlag(name: string, value: boolean | number | string): void;
  unsetFlag(name: string): void;
  addBond(pig: PigId, n: number): void;
  addMoney(n: number): void;
  give(item: string, n: number): void;
  take(item: string, n: number): void;
  changeNeed(pig: PigId, need: NeedId, n: number): void;
  /** [input key] answer: stored as a fact (and remembered by `pig`, or by every pig). */
  setFact(key: string, value: string, pig?: PigId): void;
  setPlayerName(name: string): void;
  setCompanion(pig: PigId): void;
  remember(pig: PigId | 'all', fact: string): void;
  unlockOutfit(pig: PigId, outfit: OutfitId): void;
  /** Apply a mini-game result's rewards (money, capped bond, fun, tasks…). */
  applyMinigame(id: string, pig: PigId, result: MinigameResult): void;
}

export interface VnEnv {
  /** Show a line and wait for the player to advance. */
  say(line: SayLine): Promise<void>;
  /** Show numbered options; resolve with the picked index. */
  choose(options: string[]): Promise<number>;
  /** Free text for [input]; null = cancelled. */
  ask(opts: { prompt?: string; placeholder?: string }): Promise<string | null>;
  present(cmd: PresentCommand, ctx: { replay: boolean; scene: Scene }): Promise<void> | void;
  pickCompanion(): Promise<PigId>;
  enterName(): Promise<string>;
  runMinigame(id: string, pig: PigId, replay: boolean): Promise<MinigameResult | null>;
  chat(pig: PigId, prompt: string | undefined, maxTurns: number | undefined): Promise<void>;
  /** Play another scene inline ([call]). */
  call(sceneId: string, replay: boolean): Promise<RunResult>;
  cond: CondState;
  text: Omit<InterpContext, 'flag'>;
  store: VnStore;
  /** True once the scene was stopped from outside (menu → title…). */
  aborted(): boolean;
}

export type RunResult = 'end' | 'aborted';

const MINIGAME_PIG: Record<string, PigId> = { volley: 'piggy-1', perfusion: 'piggy-2', debug: 'piggy-3', surgery: 'piggy-2', xfeed: 'piggy-3' };

/** Unknown expressions fall back to neutral (design-ux §4.6); the validator reports them. Portrait poses pass. */
export function toExpression(e: string | undefined): Expression | undefined {
  if (!e) return undefined;
  return (PORTRAIT_FACES as readonly string[]).includes(e) ? (e as Expression) : 'neutral';
}

/** Max ops executed without waiting on the player before we assume a [goto] loop. */
const MAX_SILENT_STEPS = 20_000;

export async function runProgram(scene: Scene, env: VnEnv, opts: { replay?: boolean } = {}): Promise<RunResult> {
  const replay = !!opts.replay;
  const scenePig = scene.meta.pig ?? null;
  // Replay-mode flag writes ([set]/[unset] and mini-game results) live here; `null` = unset.
  const overlay = new Map<string, boolean | number | string | null>();
  const flag = (name: string) => (overlay.has(name) ? overlay.get(name) ?? undefined : env.cond.flag(name));
  const cond: CondState = { ...env.cond, flag, replay: () => replay };
  const text: InterpContext = { ...env.text, flag };
  const interp = (s: string) => interpolate(s, text);
  const setFlag = (name: string, value: boolean | number | string) => {
    if (replay) overlay.set(name, value);
    else env.store.setFlag(name, value);
  };

  const exec = async (cmd: Command): Promise<void> => {
    switch (cmd.kind) {
      case 'set': {
        let value = cmd.value;
        if (cmd.op !== '=') {
          const cur = Number(flag(cmd.name) ?? 0) || 0;
          value = cur + (cmd.op === '+=' ? 1 : -1) * Number(cmd.value);
        }
        setFlag(cmd.name, value);
        return;
      }
      case 'unset':
        if (replay) overlay.set(cmd.name, null);
        else env.store.unsetFlag(cmd.name);
        return;
      case 'bond': if (!replay) env.store.addBond(cmd.pig, cmd.n); return;
      case 'money': if (!replay) env.store.addMoney(cmd.n); return;
      case 'give': if (!replay) env.store.give(cmd.item, cmd.n); return;
      case 'take': if (!replay) env.store.take(cmd.item, cmd.n); return;
      case 'need': if (!replay) env.store.changeNeed(cmd.pig, cmd.need, cmd.n); return;
      case 'remember': if (!replay) env.store.remember(cmd.pig, interp(cmd.fact)); return;
      case 'name': {
        if (replay) return;
        const name = (await env.enterName()).trim().slice(0, 12) || 'Gator';
        if (!env.aborted()) env.store.setPlayerName(name);
        return;
      }
      case 'companion': {
        if (replay) return;
        const pig = cmd.pig === 'pick' ? await env.pickCompanion() : cmd.pig;
        if (!env.aborted()) env.store.setCompanion(pig);
        return;
      }
      case 'input': {
        if (replay) return;
        const answer = await env.ask({ prompt: cmd.prompt ? interp(cmd.prompt) : undefined, placeholder: cmd.fallback });
        if (env.aborted()) return;
        const value = (answer ?? '').trim().slice(0, 60) || cmd.fallback || '';
        if (value) env.store.setFact(cmd.key, value, scenePig ?? undefined);
        return;
      }
      case 'chat':
        if (!replay) await env.chat(cmd.pig, cmd.prompt ? interp(cmd.prompt) : undefined, cmd.maxTurns);
        return;
      case 'minigame': {
        const pig = MINIGAME_PIG[cmd.id] ?? scenePig ?? 'piggy-1';
        const result = await env.runMinigame(cmd.id, pig, replay);
        if (!result || env.aborted()) return;
        setFlag('minigame_score', result.score);
        setFlag('minigame_won', result.won);
        if (!replay) env.store.applyMinigame(cmd.id, pig, result);
        return;
      }
      case 'outfit':
        await env.present(cmd, { replay, scene });
        if (!replay) env.store.unlockOutfit(cmd.pig, cmd.outfit);
        return;
      case 'call':
        await env.call(cmd.scene, replay);
        return;
      case 'goto': case 'end':
        return; // compiled into jumps
      default:
        await env.present(cmd, { replay, scene });
    }
  };

  const ops: Op[] = scene.ops;
  let pc = 0;
  let silent = 0;
  while (pc >= 0 && pc < ops.length) {
    if (env.aborted()) return 'aborted';
    if (++silent > MAX_SILENT_STEPS) throw new Error(`${scene.file}: scene ${scene.id} loops forever (line ${ops[pc].line})`);
    const op = ops[pc];
    switch (op.op) {
      case 'say':
        silent = 0;
        await env.say({ speaker: op.speaker, text: interp(op.text), expression: toExpression(op.expression), key: op.key, line: op.line });
        pc++;
        break;
      case 'choice': {
        silent = 0;
        const open = op.options.filter((o) => !o.cond || evalCondition(o.cond, cond, scenePig));
        if (!open.length) { pc = op.end; break; }
        const picked = await env.choose(open.map((o) => interp(o.text)));
        if (env.aborted()) return 'aborted';
        pc = (open[picked] ?? open[0]).target;
        break;
      }
      case 'jump': pc = op.target; break;
      case 'branch': pc = evalCondition(op.cond, cond, scenePig) ? pc + 1 : op.target; break;
      case 'end': return 'end';
      case 'cmd': {
        const k = op.cmd.kind;
        if (k === 'wait' || k === 'name' || k === 'companion' || k === 'input' || k === 'chat' || k === 'minigame' || k === 'call') silent = 0;
        await exec(op.cmd);
        pc++;
        break;
      }
    }
  }
  return env.aborted() ? 'aborted' : 'end';
}
