// hub1-hub: what takes over the companion's room on arrival (ui/hub/hub.ts arrivalScene + game.session.roomShown), the
// hub's PLAY sheet (Steady Hoof for Piggy 2), and the Hub / App wiring of the brain chip in phone landscape and of
// pet news during mini-games.
// QA story2-extra-scene-after-tutorial: on a brand-new save a random (chance=) home scene could start right after
// "Tutorial complete!" and skip the room. Now the room shows first; tutorial_big_brain (priority 99, no chance=) still
// plays right after the tutorial, and the random home scenes come back once the room has been shown.
import { plugin } from 'bun';
import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileModule } from 'svelte/compiler';
import { parseKScript } from '../src/lib/vn/kscript';
import { rankScenes, type TriggerEnv } from '../src/lib/vn/triggers';
import { newSave } from '../src/lib/pet';
import { timeOfDay, weekday } from '../src/lib/time';
import { GAME_ICON, HUB_TUTORIAL, arrivalScene, chanceGated, gameIcon, playGames, type ArrivalSession } from '../src/lib/ui/hub/hub';
import { META } from '../src/lib/minigames/meta';
import { MINIGAME_IDS } from '../src/lib/minigames/types';
import { UI_ICONS } from '../src/lib/content/icons/ui';
import type { PigId, SaveData } from '../src/lib/types';

// The game store is a Svelte rune module (.svelte.ts): compile it the way Vite does (as in settings-flags.test.ts).
plugin({
  name: 'svelte-rune-modules',
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text());
      return { contents: compileModule(js, { filename: path, generate: 'client' }).js.code, loader: 'js' };
    });
  },
});
const { game } = await import('../src/lib/state/game.svelte');

const read = (path: string) => readFileSync(join(import.meta.dir, '..', path), 'utf8');
const HOME = parseKScript(read('src/lib/content/scenes/home.ks'), 'home.ks');
const byId = (id: string) => HOME.find((s) => s.id === id)!;

/** Fri Oct 30 2026, 15:00 local: Piggy 3's rainy-afternoon home scene (hour=14-17, month=10, chance=0.2) is in season. */
const AFTERNOON = new Date(2026, 9, 30, 15, 0);

function freshSave(pig: PigId, flags: Record<string, boolean | string> = {}): SaveData {
  const save = newSave(AFTERNOON.getTime(), 'Gator');
  save.companion = pig;
  save.seenScenes.push('prologue', HUB_TUTORIAL); // "Tutorial complete!" just played
  Object.assign(save.flags, flags);
  return save;
}

/** The hub's pick on arrival, like Hub.svelte: the trigger roll's winner (dice forced to hit), then arrivalScene. */
function arrive(save: SaveData, session: ArrivalSession): { rolled: string | null; plays: string | null } {
  const env: TriggerEnv = {
    location: 'hub', time: timeOfDay(AFTERNOON), weekday: weekday(AFTERNOON), date: AFTERNOON, save,
    chapter: 1, days: 1, rng: () => 0.05,
  };
  const best = rankScenes(HOME, env, { heartScene: () => undefined })[0];
  const pick = best ? { id: best.id, chance: chanceGated(best.meta.trigger) } : null;
  return { rolled: best?.id ?? null, plays: arrivalScene(pick, session) };
}

describe('arrival right after the tutorial (story2-extra-scene-after-tutorial)', () => {
  const afterTutorial: ArrivalSession = { autoScenes: [HUB_TUTORIAL], roomShown: false };

  test('a random home scene that wins the roll waits: the room shows first', () => {
    const r = arrive(freshSave('piggy-3'), afterTutorial);
    expect(r.rolled).toBe('home_p3_rain');
    expect(r.plays).toBeNull();
  });

  test('tutorial_big_brain (no chance=, priority 99) still plays right after the tutorial', () => {
    const r = arrive(freshSave('piggy-3', { bigbrain: 'accepted' }), afterTutorial);
    expect(r.rolled).toBe('tutorial_big_brain');
    expect(r.plays).toBe('tutorial_big_brain');
  });

  test('…and the random scene still waits after it (the room has not shown yet)', () => {
    const save = freshSave('piggy-3', { bigbrain: 'accepted' });
    save.seenScenes.push('tutorial_big_brain');
    expect(arrive(save, { autoScenes: [HUB_TUTORIAL, 'tutorial_big_brain'], roomShown: false })).toEqual({
      rolled: 'home_p3_rain', plays: null,
    });
  });

  test('once the room has shown, random home scenes may take over again', () => {
    expect(arrive(freshSave('piggy-3'), { autoScenes: [HUB_TUTORIAL], roomShown: true }).plays).toBe('home_p3_rain');
  });

  test('a returning player (no tutorial this session) gets them on the first visit as before', () => {
    expect(arrive(freshSave('piggy-3'), { autoScenes: [], roomShown: false }).plays).toBe('home_p3_rain');
  });

  test('a scene already auto-played this session never plays twice', () => {
    expect(arrive(freshSave('piggy-3'), { autoScenes: ['home_p3_rain'], roomShown: true }).plays).toBeNull();
    expect(arrivalScene(null, { autoScenes: [], roomShown: true })).toBeNull();
  });

  test('the home scenes: every random one has a chance= clause, the tutorial, party and stamp scenes have none', () => {
    const random = HOME.filter((s) => /^home_p[123]_/.test(s.id));
    expect(random.length).toBe(12);
    for (const s of random) expect(chanceGated(s.meta.trigger), s.id).toBe(true);
    for (const id of ['tutorial_hub', 'tutorial_big_brain', 'welcome_back', 'home_stamp_party']) {
      expect(chanceGated(byId(id).meta.trigger), id).toBe(false);
    }
    expect(chanceGated(undefined)).toBe(false);
  });
});

describe('game.session.roomShown', () => {
  const SAVE = JSON.parse(JSON.stringify(game.save)) as SaveData;
  afterAll(() => {
    game.save = SAVE;
    game.session.autoScenes = [];
    game.session.roomShown = false;
  });

  test('starts false and goes back to false with every new save (NEW GAME, Reset everything, import)', () => {
    expect(game.session.roomShown).toBe(false);
    game.session.roomShown = true;
    game.reset('Gator');
    expect(game.session.roomShown).toBe(false);
    game.session.roomShown = true;
    game.wipe();
    expect(game.session.roomShown).toBe(false);
    game.session.roomShown = true;
    game.importSave(JSON.parse(JSON.stringify(SAVE)));
    expect(game.session.roomShown).toBe(false);
  });
});

describe('PLAY sheet', () => {
  const games = Object.values(META);
  const ids = (pig: PigId) => playGames(games, pig).map((g) => g.id);

  test('each pig gets his own games, then Petal Catch; Steady Hoof only for Piggy 2', () => {
    expect(ids('piggy-1')).toEqual(['volley', 'petals']);
    expect(ids('piggy-2')).toEqual(['perfusion', 'surgery', 'petals']);
    expect(ids('piggy-3')).toEqual(['debug', 'xfeed', 'petals']);
  });

  test('Steady Hoof shows the suture icon, like its button at Shands', () => {
    expect(META.surgery.title).toBe('Steady Hoof');
    expect(gameIcon('surgery')).toBe('suture');
    expect(read('src/lib/ui/screens/Location.svelte')).toContain("'minigame:surgery': { label: MINIGAMES.surgery.title, icon: 'suture'");
  });

  test('every mini-game has a drawn icon', () => {
    for (const id of MINIGAME_IDS) {
      expect(GAME_ICON[id], id).toBeDefined();
      expect(UI_ICONS[gameIcon(id)], id).toBeDefined();
    }
  });
});

describe('wiring', () => {
  const hub = read('src/lib/ui/screens/Hub.svelte');
  const app = read('src/App.svelte');

  test('Hub: the arrival pick goes through arrivalScene, and the room marks itself shown once it mounts', () => {
    expect(hub).toContain('const redirect = arrivalScene(');
    const mount = hub.slice(hub.indexOf('onMount(() => {'));
    expect(mount.indexOf('game.session.roomShown = true')).toBeGreaterThan(mount.indexOf("if (!ready) { game.go('select'); return; }"));
  });

  test('Hub: the brain chip ends the status pill in every layout (phone landscape too) and keeps its size', () => {
    const status = hub.slice(hub.indexOf('{#snippet status()}'), hub.indexOf('{/snippet}', hub.indexOf('{#snippet status()}')));
    expect(status).toContain('<BrainChip small />');
    expect(status).not.toMatch(/\{#if viewport\.mode !== 's'\}\s*<BrainChip/);
    expect(hub).toMatch(/\.statusbar > :global\(\[data-coach='brain'\]\) \{ flex-shrink: 0; \}/);
    // the PLAY sheet lists the pig's games through playGames (Steady Hoof for Piggy 2) with gameIcon's icons
    expect(hub).toContain('...playGames(Object.values(MINIGAMES), pig)');
    expect(hub).toContain('icon: gameIcon(m.id)');
  });

  test('App: pet news waits while a mini-game runs (screen or scene overlay); the coach mark waits for windows', () => {
    const blocked = app.slice(app.indexOf('const newsBlocked = $derived('), app.indexOf(');', app.indexOf('const newsBlocked = $derived(')));
    expect(blocked).toContain("game.screen === 'minigame'");
    expect(blocked).toContain("shownScreen === 'minigame'");
    expect(blocked).toContain('overlays.minigame');
    const coach = app.slice(app.indexOf('const brainCoach = $derived('), app.indexOf(');', app.indexOf('const brainCoach = $derived(')));
    expect(coach).toContain('!dialogOpen');
    expect(app).toMatch(/within=\{viewport\.mode === 's' \? '\.gl\.mode-s \.r\.stage' : undefined\}/);
  });
});
