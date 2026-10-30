// Scene registry: every src/lib/content/scenes/*.ks, parsed once at startup. Vite-only (import.meta.glob);
// bun tests read the directory themselves (tests/kscript.test.ts). Files starting with "_" load in dev only.
import type { PigId } from '../types';
import { nowDate } from '../state/clock';
import { parseKScriptDetailed, type Scene } from './kscript';
import { storyChapter } from './effects';
import { minChapter, rankScenes, type SceneInfo, type TriggerContext, type TriggerEnv } from './triggers';

// Dev builds also load "_*.ks" samples; production builds don't even bundle their text.
const sources: Record<string, string> = import.meta.env.DEV
  ? import.meta.glob<string>('../content/scenes/*.ks', { query: '?raw', import: 'default', eager: true })
  : import.meta.glob<string>(['../content/scenes/*.ks', '!../content/scenes/_*.ks'], { query: '?raw', import: 'default', eager: true });

// The parsed scenes live in one page-wide store that is rebuilt in place, so editing a .ks file in dev
// hot-swaps the scenes without remounting the app (which would restart a running scene).
interface SceneStore { scenes: Scene[]; byId: Map<string, Scene>; heartIndex: Map<string, string> }
const STORE_KEY = '__kempanionScenes';
const host = globalThis as typeof globalThis & { [STORE_KEY]?: SceneStore };
const store: SceneStore = (host[STORE_KEY] ??= { scenes: [], byId: new Map(), heartIndex: new Map() } as SceneStore);
const { scenes, byId, heartIndex } = store;
scenes.length = 0;
byId.clear();
heartIndex.clear();

for (const path of Object.keys(sources).sort()) {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const { scenes: parsed, errors } = parseKScriptDetailed(sources[path], `scenes/${name}`);
  const broken = new Set<string>();
  for (const e of errors) {
    console.error(`[kscript] ${e.file}:${e.line}: ${e.message}`);
    if (e.scene) broken.add(e.scene);
  }
  for (const s of parsed) {
    if (broken.has(s.id)) continue; // a half-parsed scene would misbehave; `bun test` reports it
    if (byId.has(s.id)) {
      console.error(`[kscript] ${s.file}:${s.line}: duplicate scene id "${s.id}" (first in ${byId.get(s.id)!.file})`);
      continue;
    }
    byId.set(s.id, s);
    scenes.push(s);
    if (s.meta.heart && s.meta.pig) heartIndex.set(`${s.meta.pig}#${s.meta.heart}`, s.id);
  }
}

export function sceneInfo(s: Scene): SceneInfo {
  const m = s.meta;
  return {
    id: s.id, title: m.title || s.id, pig: m.pig, priority: m.priority, cg: m.cg, repeat: m.repeat,
    heart: m.heart, chapter: minChapter(m), trio: m.trio, ending: m.ending, replayable: m.replayable,
    summary: m.summary, triggered: !!m.trigger, file: s.file,
  };
}

/** Parsed + compiled scene (runner use). */
export function getCompiled(id: string): Scene | undefined {
  return byId.get(id);
}

export function getScene(id: string): SceneInfo | undefined {
  const s = byId.get(id);
  return s ? sceneInfo(s) : undefined;
}

/** Every loaded scene in file order (the album filters by `replayable`). */
export function allScenes(): SceneInfo[] {
  return scenes.map(sceneInfo);
}

/** Scene id of a pig's heart event n, if written. */
export function heartScene(pig: PigId, n: number): string | undefined {
  return heartIndex.get(`${pig}#${n}`);
}

function envOf(ctx: TriggerContext): TriggerEnv {
  const days = Math.max(1, ctx.save.counters['days_played'] ?? 1);
  return {
    location: ctx.location, time: ctx.time, weekday: ctx.weekday, save: ctx.save,
    date: ctx.date ?? nowDate(), chapter: storyChapter(ctx.save), days, rng: ctx.rng ?? Math.random,
  };
}

/** Highest-priority eligible scene for this context, or null (rolls chance= clauses). */
export function findTriggeredScene(ctx: TriggerContext): SceneInfo | null {
  const best = rankScenes(scenes, envOf(ctx), { heartScene })[0];
  return best ? sceneInfo(best) : null;
}

/**
 * Every scene eligible right now, best first. `ignoreChance` gives a stable answer for UI hints
 * (e.g. the ♥ on a map pin when a heart event is ready there).
 */
export function eligibleScenes(ctx: TriggerContext, opts: { ignoreChance?: boolean } = {}): SceneInfo[] {
  return rankScenes(scenes, envOf(ctx), { heartScene, ignoreChance: opts.ignoreChance }).map(sceneInfo);
}

if (import.meta.hot) import.meta.hot.accept();
