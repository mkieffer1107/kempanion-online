// Plays KScript scenes: wires the pure interpreter to the stage, audio, dialogue box, game store and UI hooks.
import { EXPRESSIONS, PIG_IDS, type Expression, type JingleId, type LocationId, type OutfitId, type PigId, type SfxId, type SongId } from '../types';
import type { MinigameId } from '../minigames';
import { stage, type PortraitPos } from '../engine/stage';
import { audio } from '../audio';
import { game } from '../state/game.svelte';
import { nowDate } from '../state/clock';
import { timeOfDay, weekday as weekdayOf } from '../time';
import { LOCATIONS, scheduleSlot } from '../content/locations';
import { CHARACTERS } from '../content/characters';
import type { CondState } from './conditions';
import type { Scene } from './kscript';
import { runProgram, type PresentCommand, type RunResult, type VnEnv } from './interpreter';
import { dialogue } from './dialogue.svelte';
import { vnHooks } from './hooks';
import { addStoryBond, applyMinigame, factOf, setFact, storyChapter } from './effects';
import { getCompiled } from './registry';
import { runFreeChat } from './chat';

// ── read-line tracking for skip mode (kept apart from the save: it's only a convenience) ──

const READ_KEY = 'kempanion.vn.read.v1';
const READ_CAP = 6000;
let readLines: Set<string> | null = null;
let readTimer: ReturnType<typeof setTimeout> | null = null;

function readSet(): Set<string> {
  if (readLines) return readLines;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(READ_KEY) : null;
    readLines = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    readLines = new Set();
  }
  return readLines;
}

function markRead(key: string) {
  const set = readSet();
  if (set.has(key)) return;
  set.add(key);
  if (readTimer) return;
  readTimer = setTimeout(() => {
    readTimer = null;
    try {
      const keys = [...set];
      localStorage.setItem(READ_KEY, JSON.stringify(keys.slice(Math.max(0, keys.length - READ_CAP))));
    } catch {
      /* storage full or blocked: skip just stops earlier next time */
    }
  }, 1500);
}

// ── scene runs ──

interface Portrait { expression: Expression; pos: PortraitPos; outfit: OutfitId }

/** Presentation state shared by a scene and the scenes it [call]s. */
interface RunState {
  portraits: Map<PigId, Portrait>;
  outfits: Map<PigId, OutfitId>;
  expressions: Map<PigId, Expression>;
  cgs: Set<string>;
  cgOn: boolean;
  overrides: { time: boolean; petals: boolean; weather: boolean };
}

let queue: Promise<void> = Promise.resolve();
let stopped = false;
let running = 0;

const expr = (e: string | undefined): Expression | undefined =>
  e === undefined ? undefined : (EXPRESSIONS as readonly string[]).includes(e) ? (e as Expression) : 'neutral';

/** The location whose day background is `id` (so the stage picks its day/night variant), if any. */
function locationOfBg(id: string): LocationId | undefined {
  return (Object.values(LOCATIONS) as { id: LocationId; bg: string }[]).find((l) => l.bg === id)?.id;
}

function freePosition(rs: RunState): PortraitPos {
  const used = new Set([...rs.portraits.values()].map((p) => p.pos));
  return (['center', 'right', 'left', 'far-right', 'far-left'] as const).find((p) => !used.has(p)) ?? 'center';
}

function condState(): CondState {
  const s = () => game.save;
  return {
    hearts: (p) => Math.min(10, Math.floor(s().pigs[p].bond / 100)),
    points: (p) => s().pigs[p].bond,
    sick: (p) => s().pigs[p].sick,
    need: (p, n) => s().pigs[p].needs[n],
    flag: (n) => s().flags[n],
    item: (id) => s().inventory[id] ?? 0,
    seen: (id) => s().seenScenes.includes(id),
    money: () => s().money,
    chapter: () => storyChapter(s()),
    days: () => Math.max(1, s().counters['days_played'] ?? 1),
    month: () => nowDate().getMonth() + 1,
    day: () => nowDate().getDate(),
    hour: () => nowDate().getHours(),
    replay: () => false,
    time: () => timeOfDay(nowDate()),
    slot: () => scheduleSlot(nowDate()),
    weekday: () => weekdayOf(nowDate()),
    companion: () => s().companion,
    location: () => s().location,
  };
}

function makeEnv(scene: Scene, rs: RunState, sceneRead: boolean): VnEnv {
  const skipping = () => dialogue.skipping;
  return {
    async say(line) {
      const read = sceneRead || readSet().has(line.key);
      markRead(line.key);
      if (line.expression && PIG_IDS.includes(line.speaker as PigId)) {
        const pig = line.speaker as PigId;
        rs.expressions.set(pig, line.expression);
        const p = rs.portraits.get(pig);
        if (p) p.expression = line.expression;
      }
      await dialogue.say(line.speaker, line.text, line.expression, { read });
    },
    choose: (options) => dialogue.choose(options),
    ask: (o) => dialogue.ask({ prompt: o.prompt, placeholder: o.placeholder, allowEmpty: !!o.placeholder, maxLength: 60 }),

    async present(cmd: PresentCommand) {
      switch (cmd.kind) {
        case 'bg': {
          const t = skipping() ? 'cut' : cmd.transition;
          if (t !== 'cut') dialogue.conceal();
          const loc = locationOfBg(cmd.id);
          if (loc) await stage.setLocation(loc, t);
          else await stage.setBackground(cmd.id, t);
          break;
        }
        case 'bgm':
          if (cmd.id) audio.playSong(cmd.id as SongId, { fadeMs: cmd.fadeMs });
          else audio.stopSong(cmd.fadeMs ?? 800);
          break;
        case 'show': {
          const prev = rs.portraits.get(cmd.pig);
          const p: Portrait = {
            outfit: cmd.outfit ?? rs.outfits.get(cmd.pig) ?? prev?.outfit ?? 'everyday',
            expression: expr(cmd.expression) ?? prev?.expression ?? rs.expressions.get(cmd.pig) ?? 'neutral',
            pos: cmd.pos ?? prev?.pos ?? freePosition(rs),
          };
          rs.portraits.set(cmd.pig, p);
          rs.expressions.set(cmd.pig, p.expression);
          stage.showPortrait(cmd.pig, p.expression, p.pos, p.outfit);
          break;
        }
        case 'hide':
          if (cmd.pig) { stage.hidePortrait(cmd.pig); rs.portraits.delete(cmd.pig); }
          else { stage.clearPortraits(); rs.portraits.clear(); }
          break;
        case 'expr': {
          const e = expr(cmd.expression)!;
          rs.expressions.set(cmd.pig, e);
          const p = rs.portraits.get(cmd.pig);
          if (p) p.expression = e;
          stage.setExpression(cmd.pig, e);
          break;
        }
        case 'outfit': {
          rs.outfits.set(cmd.pig, cmd.outfit);
          const p = rs.portraits.get(cmd.pig);
          if (p) {
            p.outfit = cmd.outfit;
            stage.showPortrait(cmd.pig, p.expression, p.pos, p.outfit);
          }
          break;
        }
        case 'sfx': audio.sfx(cmd.id as SfxId); break;
        case 'jingle': audio.jingle(cmd.id as JingleId); break;
        case 'wait': if (!skipping()) await dialogue.pause(cmd.ms); break;
        case 'shake': stage.shake(cmd.intensity, cmd.ms); break;
        case 'flash': stage.flash(cmd.color, cmd.ms); break;
        case 'fade': await stage.fade(cmd.to, skipping() ? 0 : cmd.ms); break;
        case 'burst': stage.burst(cmd.burst); break;
        case 'petals': stage.setPetals(cmd.level); rs.overrides.petals = true; break;
        case 'weather': stage.setWeather(cmd.weather); rs.overrides.weather = true; break;
        case 'time': stage.setTimeOfDay(cmd.time); rs.overrides.time = cmd.time !== 'auto'; break;
        case 'cg':
          dialogue.conceal();
          await stage.showCG(cmd.id);
          rs.cgOn = !!cmd.id;
          if (cmd.id) rs.cgs.add(cmd.id);
          break;
      }
    },

    async pickCompanion() {
      dialogue.conceal();
      return vnHooks.pickCompanion ? vnHooks.pickCompanion() : 'piggy-1';
    },
    async enterName() {
      dialogue.conceal();
      return vnHooks.enterName ? vnHooks.enterName() : 'Gator';
    },
    async runMinigame(id, pig, replay) {
      if (!vnHooks.runMinigame) return null;
      dialogue.conceal();
      return vnHooks.runMinigame(id as MinigameId, { pig, replay });
    },
    async chat(pig, prompt, maxTurns) {
      const shown = rs.portraits.has(pig);
      const outfit = rs.outfits.get(pig) ?? 'everyday';
      await runFreeChat(pig, { prompt, maxTurns, greet: false, showPortrait: !shown, outfit });
      if (!shown) rs.portraits.set(pig, { expression: rs.expressions.get(pig) ?? 'neutral', pos: 'center', outfit });
    },
    async call(id, replay) {
      const other = getCompiled(id);
      if (!other || running > 8) {
        console.warn(`[vn] [call ${id}] skipped: ${other ? 'calls nested too deep' : 'no such scene'}`);
        return 'end';
      }
      return playScene(other, rs, replay);
    },

    cond: condState(),
    text: {
      player: () => game.save.player.name || 'Gator',
      companion: () => (game.save.companion ? CHARACTERS[game.save.companion].name : 'your Kempanion'),
      time: () => nowDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      timeOfDay: () => timeOfDay(nowDate()),
      weekday: () => nowDate().toLocaleDateString('en-US', { weekday: 'long' }),
      fact: (key) => factOf(key),
    },
    store: {
      setFlag: (n, v) => game.setFlag(n, v),
      unsetFlag: (n) => game.unsetFlag(n),
      addBond: (pig, n) => {
        // The heart event's own pig gets uncapped event bond; everyone else goes through the heart gate.
        const added = addStoryBond(pig, n, scene.meta.heart && pig === scene.meta.pig ? 'event' : 'scene');
        if (added > 0 && rs.portraits.has(pig)) stage.burst('hearts');
      },
      addMoney: (n) => game.addMoney(n),
      give: (item, n) => game.give(item, n),
      take: (item, n) => { game.take(item, Math.min(n, game.save.inventory[item] ?? 0)); },
      changeNeed: (pig, need, n) => game.changeNeed(pig, need, n),
      setFact: (key, value, pig) => setFact(key, value, pig),
      setPlayerName: (name) => { game.save.player.name = name; game.persist(); },
      setCompanion: (pig) => { game.save.companion = pig; game.persist(); },
      remember: (pig, fact) => { for (const p of pig === 'all' ? PIG_IDS : [pig]) game.remember(p, fact); },
      unlockOutfit: (_pig, outfit) => { if (outfit !== 'everyday') game.setFlag(`outfit_${outfit}`, true); },
      applyMinigame: (id, pig, r) => applyMinigame(id as MinigameId, pig, r),
    },
    aborted: () => stopped,
  };
}

/** Run one scene (and mark it seen/unlocked when it reaches its end). */
async function playScene(scene: Scene, rs: RunState, replay: boolean): Promise<RunResult> {
  running++;
  try {
    const sceneRead = replay || game.seen(scene.id);
    const result = await runProgram(scene, makeEnv(scene, rs, sceneRead), { replay });
    if (result === 'end' && !stopped && !replay) {
      game.markSeen(scene.id);
      if (scene.meta.cg) game.unlock(scene.meta.cg);
      if (scene.meta.replayable) game.unlock(scene.id);
    }
    return result;
  } finally {
    running--;
  }
}

async function play(id: string, opts: { replay?: boolean }): Promise<void> {
  const scene = getCompiled(id);
  if (!scene) {
    console.warn(`[vn] runScene: unknown scene "${id}"`);
    return;
  }
  const replay = opts.replay ?? game.params.replay === true;
  stopped = false;
  const rs: RunState = {
    portraits: new Map(), outfits: new Map(), expressions: new Map(), cgs: new Set(), cgOn: false,
    overrides: { time: false, petals: false, weather: false },
  };
  dialogue.reset();
  dialogue.mode = 'scene';
  dialogue.sceneId = id;
  stage.clearPortraits();
  try {
    const result = await playScene(scene, rs, replay);
    if (result === 'end' && !stopped && !replay) for (const cg of rs.cgs) game.unlock(cg);
  } catch (e) {
    console.error(`[vn] scene "${id}" failed:`, e);
  } finally {
    stage.setTalking(null);
    if (rs.cgOn) await stage.showCG(null);
    if (rs.overrides.time) stage.setTimeOfDay('auto');
    if (rs.overrides.petals) stage.setPetals('normal');
    if (rs.overrides.weather) stage.setWeather('clear');
    stage.clearPortraits();
    dialogue.reset();
    game.persist();
  }
}

/**
 * Play a scripted KScript scene to completion (stage, music, dialogue, effects). Calls queue up.
 * Replay mode (album) comes from `opts.replay` or `game.params.replay === true`.
 */
export function runScene(id: string, opts: { replay?: boolean } = {}): Promise<void> {
  const run = queue.then(() => play(id, opts));
  queue = run.catch(() => {});
  return run;
}

/** Stop the running scene (e.g. MENU → Title). It is not marked seen. */
export function stopScene(): void {
  if (!running) return;
  stopped = true;
  dialogue.cancel();
}

/** True while a scene is playing. */
export function sceneRunning(): boolean {
  return running > 0;
}
