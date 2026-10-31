// Runs in its own Bun process: the full suite warms the shared async interpreter enough to crash
// Bun 1.2.13's JSC on the input continuation. Keep the real runner and rune state under test.
import { plugin } from 'bun';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';
import { parseKScript, type Scene } from '../src/lib/vn/kscript';

plugin({
  name: 'svelte-rune-modules',
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text());
      return { contents: compileModule(js, { filename: path, generate: 'client' }).js.code, loader: 'js' };
    });
  },
});

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
const SAVE = JSON.parse(JSON.stringify(game.save));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(pred: () => boolean, ms = 2000): Promise<boolean> {
  const t0 = performance.now();
  while (!pred()) {
    if (performance.now() - t0 > ms) return false;
    await sleep(4);
  }
  return true;
}
const waitingOn = (text: string) => until(() => dialogue.waiting && dialogue.text === text);
let lastRun: Promise<unknown> = Promise.resolve();
function play(id: string) {
  const run = runScene(id);
  lastRun = run;
  return { run };
}

beforeEach(() => {
  dialogue.reset();
  dialogue.auto = false;
  game.save.settings.textSpeed = 0;
  game.save.settings.autoDelay = 0.05;
});
afterEach(async () => {
  stopScene();
  await lastRun;
  dialogue.reset();
  game.save = JSON.parse(JSON.stringify(SAVE));
});

describe('story name and comfort-food questions share the inline input', () => {
  beforeEach(() => {
    delete vnHooks.enterName; // exercise the real inline path, not the optional host override
    game.save.player.name = '';
    SCENES.set('t_inline_intake', parseKScript(`=== t_inline_intake
---
narrator: What should we call you?
[name]
narrator: Hello, {player}. Comfort food?
[input inline_food "Comfort food?" "soup"]
narrator: All set.
`, 'inline-intake.ks')[0]);
  });

  test('name keeps the narrative visible, normalizes before saving, then uses the same ask state for food', async () => {
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.visible).toBe(true);
    expect(dialogue.text).toBe('What should we call you?');
    expect(dialogue.input).toMatchObject({ kind: 'name', maxLength: 12, allowEmpty: true, initial: '' });
    expect(dialogue.submit('  Alex   Bee   ')).toBe(true);
    expect(await waitingOn('Hello, Alex Bee. Comfort food?')).toBe(true);
    expect(game.save.player.name).toBe('Alex Bee');
    dialogue.advance();
    expect(await until(() => dialogue.input?.prompt === 'Comfort food?')).toBe(true);
    expect(dialogue.input).toMatchObject({ maxLength: 60, allowEmpty: true, placeholder: 'soup' });
    expect(dialogue.text).toBe('Hello, Alex Bee. Comfort food?');
    expect(dialogue.submit('')).toBe(true);
    expect(await waitingOn('All set.')).toBe(true);
    expect(game.save.flags['fact.inline_food']).toBe('soup');
    dialogue.advance();
    await scene.run;
  });

  test('blank name gets the existing random default; saved names prefill and long names stay at 12 characters', async () => {
    const { RANDOM_NAMES } = await import('../src/lib/vn/name-entry');
    const blank = dialogue.ask({ kind: 'name', allowEmpty: true, maxLength: 12 });
    expect(dialogue.submit('  ')).toBe(true);
    expect(RANDOM_NAMES).toContain(await blank);
    game.save.player.name = 'Avery';
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.input?.initial).toBe('Avery');
    dialogue.submit('  Alex   the Great Gator  ');
    expect(await waitingOn('Hello, Alex the Gre. Comfort food?')).toBe(true);
    expect(game.save.player.name).toBe('Alex the Gre');
    stopScene();
    await scene.run;
  });

  test('stopping during name input releases the scene and never writes a cancelled name', async () => {
    game.save.player.name = 'Before';
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    stopScene();
    await scene.run;
    expect(game.save.player.name).toBe('Before');
    expect(dialogue.input).toBeNull();
    expect(dialogue.submit('Too late')).toBe(false);
  });

  test('SKIP stops at the inline name question and replay skips both intake questions', async () => {
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.toggleSkip();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.skipping).toBe(false);
    dialogue.submit('Sam');
    expect(await waitingOn('Hello, Sam. Comfort food?')).toBe(true);
    stopScene();
    await scene.run;
    const replay = runScene('t_inline_intake', { replay: true });
    lastRun = replay;
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await waitingOn('Hello, Sam. Comfort food?')).toBe(true);
    expect(dialogue.input).toBeNull();
    dialogue.advance();
    expect(await waitingOn('All set.')).toBe(true);
    expect(dialogue.input).toBeNull();
    dialogue.advance();
    await replay;
    expect(game.save.player.name).toBe('Sam');
  });
});
