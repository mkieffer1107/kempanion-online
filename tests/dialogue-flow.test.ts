// The dialogue controller's SKIP / AUTO / LOG flow (QA story2): every player decision ends SKIP (choices, [input],
// and the runner's name window, companion pick and mini-games), and the LOG pauses AUTO and SKIP until it closes, so
// nothing moves on (or ends the scene, or opens the name window) behind it. The LOG window itself is opaque.
// The real controller and scene runner run here on real timers; sound, the canvas stage, the scene registry and
// free chat are stubbed (no other test file loads those four modules).
import { plugin } from 'bun';
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileModule } from 'svelte/compiler';
import { parseKScript, type Scene } from '../src/lib/vn/kscript';

// The controller and the game store are Svelte rune modules (.svelte.ts): compile them the way Vite does.
plugin({
  name: 'svelte-rune-modules',
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text());
      return { contents: compileModule(js, { filename: path, generate: 'client' }).js.code, loader: 'js' };
    });
  },
});

/** Every stage / audio call is a no-op (timed ones resolve at once, as with no <Stage /> mounted). */
const silent = new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : () => Promise.resolve()) });
const SCENES = new Map<string, Scene>();
mock.module('../src/lib/audio', () => ({ audio: silent, VOICE_STYLE: {} }));
mock.module('../src/lib/engine/stage', () => ({ stage: silent }));
mock.module('../src/lib/vn/registry', () => ({ getCompiled: (id: string) => SCENES.get(id) }));
mock.module('../src/lib/vn/chat', () => ({ runFreeChat: async () => {} }));

const { dialogue } = await import('../src/lib/vn/dialogue.svelte');
const { game } = await import('../src/lib/state/game.svelte');
const { runScene, stopScene } = await import('../src/lib/vn/runner');
const { vnHooks } = await import('../src/lib/vn/hooks');

const read = (path: string) => readFileSync(join(import.meta.dir, '..', path), 'utf8');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until `pred` holds (true) or `ms` pass (false). */
async function until(pred: () => boolean, ms = 2000): Promise<boolean> {
  const t0 = performance.now();
  while (!pred()) {
    if (performance.now() - t0 > ms) return false;
    await sleep(4);
  }
  return true;
}

/** say() a line; `continued` turns true when the line lets the scene go on. */
function say(text: string) {
  const line = { continued: false, done: Promise.resolve() };
  line.done = dialogue.say('narrator', text).then(() => { line.continued = true; });
  return line;
}

/** The line is fully shown and waiting for the player (or AUTO / SKIP). */
const waitingOn = (text: string) => until(() => dialogue.waiting && dialogue.text === text);

/** Play a test scene through the real runner; `ended()` turns true when it is over. */
let lastRun: Promise<unknown> = Promise.resolve();
function play(id: string) {
  let ended = false;
  const run = runScene(id).then(() => { ended = true; });
  lastRun = run;
  return { run, ended: () => ended };
}

for (const [id, src] of Object.entries({
  t_name: 'narrator: One.\nnarrator: Two.\n[name]\nnarrator: Nice to meet you, {player}!\nnarrator: Question two.',
  t_pick: 'narrator: Choose your Kempanion!\n[companion pick]\nnarrator: Team of two!\nnarrator: Sakura House.',
  t_game: 'narrator: Find the bug with me?\n[minigame debug]\nnarrator: Found it!\nnarrator: Next.',
  t_last: 'narrator: The last line.',
})) SCENES.set(id, parseKScript(`=== ${id}\n---\n${src}\n`, 'flow.ks')[0]);

const SAVE = JSON.parse(JSON.stringify(game.save));

beforeEach(async () => {
  stopScene(); // a failed test must not leave its scene running into the next one
  await lastRun;
  dialogue.reset();
  dialogue.auto = false;
  game.save.settings.textSpeed = 0; // lines show at once
  game.save.settings.autoDelay = 0.05; // AUTO: 50 ms + 25 ms a character
});

afterAll(async () => {
  stopScene();
  await lastRun;
  dialogue.reset();
  dialogue.auto = false;
  delete vnHooks.enterName;
  delete vnHooks.pickCompanion;
  delete vnHooks.runMinigame;
  game.save = SAVE;
});

describe('SKIP ends at every player decision (story2-skip-through-pick)', () => {
  test('stopSkip() turns SKIP off: the waiting line stays for the player', async () => {
    const line = say('One.');
    expect(await waitingOn('One.')).toBe(true);
    dialogue.toggleSkip(); // SKIP would move on in 50 ms
    expect(dialogue.skip).toBe(true);
    dialogue.stopSkip();
    expect(dialogue.skip).toBe(false);
    await sleep(200);
    expect(line.continued).toBe(false);
    expect(dialogue.waiting).toBe(true);
    dialogue.advance();
    await line.done;
    expect(line.continued).toBe(true);
  });

  test('stopSkip() hands a waiting line back to AUTO, with its whole delay', async () => {
    game.save.settings.autoDelay = 0.4; // 400 ms + 100 ms
    dialogue.auto = true;
    const line = say('Two.');
    expect(await waitingOn('Two.')).toBe(true);
    dialogue.toggleSkip();
    dialogue.stopSkip();
    await sleep(200);
    expect(line.continued).toBe(false); // not SKIP's 50 ms
    expect(await until(() => line.continued)).toBe(true); // AUTO's 500 ms
  });

  test('stopSkip() leaves AUTO alone when SKIP is already off', async () => {
    game.save.settings.autoDelay = 0.4;
    dialogue.auto = true;
    const line = say('Three.');
    expect(await waitingOn('Three.')).toBe(true);
    const t0 = performance.now();
    await sleep(300);
    dialogue.stopSkip(); // must not restart AUTO's 550 ms (that would make it 850)
    expect(await until(() => line.continued)).toBe(true);
    expect(performance.now() - t0).toBeLessThan(700);
  });

  test('a choice and an [input] end SKIP', async () => {
    dialogue.toggleSkip();
    const picked = dialogue.choose(['A', 'B']);
    expect(dialogue.skip).toBe(false);
    dialogue.pick(1);
    expect(await picked).toBe(1);
    dialogue.toggleSkip();
    const answer = dialogue.ask({});
    expect(dialogue.skip).toBe(false);
    expect(dialogue.submit('ramen')).toBe(true);
    expect(await answer).toBe('ramen');
  });

  // Scene: line, line, [hook], the reaction the player must see, one more line. SKIP from the first line.
  async function skipThrough(id: string, reaction: string, register: (seen: (skip: boolean) => void) => void) {
    let skipAtHook: boolean | null = null;
    register((skip) => { skipAtHook = skip; });
    const scene = play(id);
    expect(await until(() => dialogue.waiting && dialogue.text !== '')).toBe(true);
    dialogue.toggleSkip();
    expect(await until(() => skipAtHook !== null)).toBe(true);
    expect(skipAtHook).toBe(false); // off before the window / picker / mini-game opened
    expect(await waitingOn(reaction)).toBe(true);
    expect(dialogue.skipping).toBe(false);
    await sleep(250); // SKIP moves on every 50 ms: the reaction would be long gone
    expect(dialogue.text).toBe(reaction);
    expect(scene.ended()).toBe(false);
    dialogue.advance();
    expect(await until(() => dialogue.waiting && dialogue.text !== reaction)).toBe(true);
    dialogue.advance();
    await scene.run;
  }

  test('the name window ends SKIP: "Nice to meet you" waits for the player', async () => {
    await skipThrough('t_name', 'Nice to meet you, Max!', (seen) => {
      vnHooks.enterName = async () => { seen(dialogue.skipping); return 'Max'; };
    });
  });

  test('the companion pick ends SKIP: the pick reaction waits for the player', async () => {
    await skipThrough('t_pick', 'Team of two!', (seen) => {
      vnHooks.pickCompanion = async () => { seen(dialogue.skipping); return 'piggy-3'; };
    });
  });

  test('a mini-game ends SKIP: the line after it waits for the player', async () => {
    await skipThrough('t_game', 'Found it!', (seen) => {
      vnHooks.runMinigame = async () => { seen(dialogue.skipping); return null; };
    });
  });
});

describe('the LOG pauses AUTO and SKIP (story2-auto-behind-log)', () => {
  test('AUTO waits while the LOG is open and goes on, with its whole delay, when it closes', async () => {
    dialogue.auto = true;
    const line = say('Gainesville, October.'); // 50 + 25 * 21 = 575 ms
    expect(await waitingOn('Gainesville, October.')).toBe(true);
    dialogue.openBacklog();
    expect(dialogue.backlogOpen).toBe(true);
    await sleep(900);
    expect(line.continued).toBe(false);
    dialogue.closeBacklog();
    const t0 = performance.now();
    expect(await until(() => line.continued)).toBe(true);
    expect(performance.now() - t0).toBeGreaterThan(450);
  });

  test('SKIP waits while the LOG is open and goes on when it closes', async () => {
    const line = say('Live oaks.');
    expect(await waitingOn('Live oaks.')).toBe(true);
    dialogue.toggleSkip(); // SKIP and LOG in the same instant
    dialogue.openBacklog();
    await sleep(250);
    expect(line.continued).toBe(false);
    expect(dialogue.skip).toBe(true); // still on, just waiting
    dialogue.closeBacklog();
    expect(await until(() => line.continued, 500)).toBe(true);
  });

  test('Ctrl-held skip waits too', async () => {
    const line = say('Sakura.');
    expect(await waitingOn('Sakura.')).toBe(true);
    dialogue.openBacklog();
    dialogue.setSkipHeld(true);
    await sleep(250);
    expect(line.continued).toBe(false);
    dialogue.closeBacklog();
    expect(await until(() => line.continued, 500)).toBe(true);
    dialogue.setSkipHeld(false);
  });

  test('a line that finishes typing under the LOG waits for it to close', async () => {
    dialogue.addLog('narrator', 'Earlier.');
    dialogue.toggleSkip();
    dialogue.openBacklog();
    const line = say('Typed under the LOG.');
    expect(await waitingOn('Typed under the LOG.')).toBe(true);
    await sleep(250);
    expect(line.continued).toBe(false);
    dialogue.closeBacklog();
    expect(await until(() => line.continued, 500)).toBe(true);
  });

  test('with AUTO on, the scene does not end under the LOG (it used to close the LOG and leave)', async () => {
    dialogue.auto = true;
    const scene = play('t_last');
    expect(await waitingOn('The last line.')).toBe(true);
    dialogue.openBacklog();
    await sleep(900); // AUTO's delay here: 50 + 25 * 14 = 400 ms
    expect(scene.ended()).toBe(false);
    expect(dialogue.backlogOpen).toBe(true);
    dialogue.closeBacklog();
    await scene.run;
    expect(scene.ended()).toBe(true);
  });
});

describe('the LOG window (story2-log-translucent)', () => {
  test('is opaque: the dark panel colour at full alpha (other dark panels keep theirs)', () => {
    const dark = /\.px-panel\.dark\s*\{[^}]*--panel-bg:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*0?\.\d+\)/.exec(read('src/styles/global.css'));
    const log = /\.sheet\.dark\s*\{[^}]*--panel-bg:\s*#([0-9a-f]{6})\s*;/i.exec(read('src/lib/vn/components/Backlog.svelte'));
    expect(dark).not.toBeNull();
    expect(log).not.toBeNull();
    const rgb = [0, 2, 4].map((i) => parseInt(log![1].slice(i, i + 2), 16));
    expect(rgb).toEqual(dark!.slice(1, 4).map(Number));
  });
});

describe('scene-local introduction nameplates', () => {
  beforeEach(() => { dialogue.log = []; }); // reset() intentionally keeps the player's backlog across scenes

  function register(id: string, body: string) {
    SCENES.set(id, parseKScript(`=== ${id}\n---\n${body}\n`, 'nameplates.ks')[0]);
  }

  test('aliases hide the first meeting and backlog keeps the original name after reveal', async () => {
    register('t_alias_reveal', '[nameplate piggy-1 "???"]\npiggy-1 happy: Hello, stranger.\npiggy-1 happy: I am Piggy 1.\n[nameplate piggy-1]\npiggy-1 happy: Now we know each other.');
    const scene = play('t_alias_reveal');
    expect(await waitingOn('Hello, stranger.')).toBe(true);
    expect(dialogue.name).toBe('???');
    dialogue.advance();
    expect(await waitingOn('I am Piggy 1.')).toBe(true);
    expect(dialogue.name).toBe('???');
    dialogue.advance();
    expect(await waitingOn('Now we know each other.')).toBe(true);
    expect(dialogue.name).toBe('Piggy 1');
    expect(dialogue.log.filter((line) => line.speaker === 'piggy-1').map((line) => line.name)).toEqual(['???', '???', 'Piggy 1']);
    dialogue.advance();
    await scene.run;
  });

  test('aliases are per pig and never leak into the next scene after an interrupted introduction', async () => {
    register('t_alias_interrupted', '[nameplate piggy-2 "???"]\npiggy-2 neutral: Next, please.\npiggy-1 happy: I already introduced myself.');
    register('t_alias_next', 'piggy-2 neutral: Off duty.');
    const first = play('t_alias_interrupted');
    expect(await waitingOn('Next, please.')).toBe(true);
    expect(dialogue.name).toBe('???');
    dialogue.advance();
    expect(await waitingOn('I already introduced myself.')).toBe(true);
    expect(dialogue.name).toBe('Piggy 1');
    stopScene();
    await first.run;
    const second = play('t_alias_next');
    expect(await waitingOn('Off duty.')).toBe(true);
    expect(dialogue.name).toBe('Piggy 2');
    dialogue.advance();
    await second.run;
  });

  test('replay repeats the reveal without changing saved meeting state', async () => {
    register('t_alias_replay', '[nameplate piggy-3 "???"]\npiggy-3 thinking: I am Piggy 3.\n[nameplate piggy-3]\npiggy-3 happy: Nice to meet you.');
    const flags = JSON.stringify(game.save.flags);
    const seen = JSON.stringify(game.save.seenScenes);
    const run = runScene('t_alias_replay', { replay: true });
    lastRun = run;
    expect(await waitingOn('I am Piggy 3.')).toBe(true);
    expect(dialogue.name).toBe('???');
    dialogue.advance();
    expect(await waitingOn('Nice to meet you.')).toBe(true);
    expect(dialogue.name).toBe('Piggy 3');
    expect(dialogue.log.filter((line) => line.speaker === 'piggy-3').map((line) => line.name)).toEqual(['???', 'Piggy 3']);
    dialogue.advance();
    await run;
    expect(JSON.stringify(game.save.flags)).toBe(flags);
    expect(JSON.stringify(game.save.seenScenes)).toBe(seen);
  });
});
