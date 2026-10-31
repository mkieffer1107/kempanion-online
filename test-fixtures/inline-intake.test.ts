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
    delete game.save.flags['fact.comfort_food'];
    delete game.save.flags['intake.done'];
    SCENES.set('t_inline_intake', parseKScript(`=== t_inline_intake
---
narrator: What should we call you?
[name]
narrator: Hello, {player}. Comfort food?
[input comfort_food "Comfort food?" "muffin"]
[set intake.done]
narrator: All set.
`, 'inline-intake.ks')[0]);
  });

  test('name keeps the narrative visible and saves the normalized name only after confirmation, then asks for food', async () => {
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.visible).toBe(true);
    expect(dialogue.text).toBe('What should we call you?');
    expect(dialogue.input).toMatchObject({ kind: 'name', maxLength: 12, allowEmpty: true, initial: '' });
    expect(dialogue.submit('  Alex   Bee   ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('Alex Bee');
    expect(dialogue.input?.kind).toBe('name');
    expect(dialogue.submit('Different name')).toBe(false);
    await sleep(20);
    expect(game.save.player.name).toBe('');
    expect(dialogue.text).toBe('What should we call you?');
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(dialogue.pendingAnswer).toBeNull();
    expect(await waitingOn('Hello, Alex Bee. Comfort food?')).toBe(true);
    expect(game.save.player.name).toBe('Alex Bee');
    dialogue.advance();
    expect(await until(() => dialogue.input?.prompt === 'Comfort food?')).toBe(true);
    expect(dialogue.input).toMatchObject({ maxLength: 60, allowEmpty: true, kind: 'food', placeholder: 'muffin' });
    expect(dialogue.text).toBe('Hello, Alex Bee. Comfort food?');
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(dialogue.submit('')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('muffin');
    expect(dialogue.input?.kind).toBe('food');
    expect(dialogue.submit('ramen')).toBe(false);
    await sleep(20);
    expect(game.save.flags['fact.comfort_food']).toBeUndefined();
    expect(game.save.flags['intake.done']).toBeUndefined();
    expect(dialogue.text).toBe('Hello, Alex Bee. Comfort food?');
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await waitingOn('All set.')).toBe(true);
    expect(game.save.flags['fact.comfort_food']).toBe('muffin');
    expect(game.save.flags['intake.done']).toBe(true);
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.confirmAnswer()).toBe(false);
    dialogue.advance();
    await scene.run;
  });

  test('blank name gets the existing random default; saved names prefill and long names stay at 12 characters', async () => {
    const { RANDOM_NAMES } = await import('../src/lib/vn/name-entry');
    const blank = dialogue.ask({ kind: 'name', allowEmpty: true, maxLength: 12 });
    let resolved = false;
    void blank.then(() => { resolved = true; });
    expect(dialogue.submit('  ')).toBe(true);
    const generated = dialogue.pendingAnswer;
    expect(RANDOM_NAMES).toContain(generated);
    await sleep(20);
    expect(resolved).toBe(false);
    expect(game.save.player.name).toBe('');
    expect(dialogue.submit('')).toBe(false);
    expect(dialogue.pendingAnswer).toBe(generated);
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await blank).toBe(generated);
    game.save.player.name = 'Avery';
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.input?.initial).toBe('Avery');
    expect(dialogue.submit('  Alex   the Great Gator  ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('Alex the Gre');
    expect(game.save.player.name).toBe('Avery');
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await waitingOn('Hello, Alex the Gre. Comfort food?')).toBe(true);
    expect(game.save.player.name).toBe('Alex the Gre');
    stopScene();
    await scene.run;
  });

  test('stopping during name confirmation releases the scene and never writes the staged name', async () => {
    game.save.player.name = 'Before';
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.submit('  Cancel   Me ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('Cancel Me');
    expect(game.save.player.name).toBe('Before');
    stopScene();
    await scene.run;
    expect(game.save.player.name).toBe('Before');
    expect(dialogue.input).toBeNull();
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.submit('Too late')).toBe(false);
    expect(dialogue.confirmAnswer()).toBe(false);
  });

  test('editing rejects the staged name and prefills its normalized value before a new confirmation', async () => {
    game.save.player.name = 'Before';
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.submit('  Alex   Bee   ')).toBe(true);
    const previousInput = dialogue.input;
    dialogue.editAnswer();
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.input).not.toBe(previousInput);
    expect(dialogue.input).toMatchObject({ ...previousInput, initial: 'Alex Bee' });
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(game.save.player.name).toBe('Before');
    expect(dialogue.submit('  Nova   K.  ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('Nova K.');
    expect(game.save.player.name).toBe('Before');
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await waitingOn('Hello, Nova K.. Comfort food?')).toBe(true);
    expect(game.save.player.name).toBe('Nova K.');
    expect(dialogue.confirmAnswer()).toBe(false);
    stopScene();
    await scene.run;
  });

  test('AUTO and advance cannot bypass name or comfort-food confirmation', async () => {
    game.save.player.name = 'Before';
    dialogue.auto = true;
    const scene = play('t_inline_intake');
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.submit('  Sam  ')).toBe(true);
    dialogue.advance();
    await sleep(180);
    expect(dialogue.pendingAnswer).toBe('Sam');
    expect(dialogue.input?.kind).toBe('name');
    expect(dialogue.text).toBe('What should we call you?');
    expect(game.save.player.name).toBe('Before');
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await until(() => dialogue.input?.prompt === 'Comfort food?')).toBe(true);
    expect(game.save.player.name).toBe('Sam');
    expect(dialogue.submit('   ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('muffin');
    dialogue.advance();
    await sleep(180);
    expect(dialogue.pendingAnswer).toBe('muffin');
    expect(dialogue.input?.kind).toBe('food');
    expect(game.save.flags['fact.comfort_food']).toBeUndefined();
    expect(game.save.flags['intake.done']).toBeUndefined();
    expect(dialogue.confirmAnswer()).toBe(true);
    await scene.run;
    expect(game.save.flags['fact.comfort_food']).toBe('muffin');
    expect(game.save.flags['intake.done']).toBe(true);
  });

  test('editing comfort food prefills the trimmed answer and stores only the confirmed replacement', async () => {
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.submit('Sam')).toBe(true);
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await waitingOn('Hello, Sam. Comfort food?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'food')).toBe(true);
    expect(dialogue.submit('  miso ramen  ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('miso ramen');
    const previousInput = dialogue.input;
    dialogue.editAnswer();
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.input).not.toBe(previousInput);
    expect(dialogue.input).toMatchObject({ ...previousInput, initial: 'miso ramen' });
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(game.save.flags['fact.comfort_food']).toBeUndefined();
    expect(game.save.flags['intake.done']).toBeUndefined();
    expect(dialogue.submit('  oatmeal  ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('oatmeal');
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await waitingOn('All set.')).toBe(true);
    expect(game.save.flags['fact.comfort_food']).toBe('oatmeal');
    expect(game.save.flags['intake.done']).toBe(true);
    dialogue.advance();
    await scene.run;
  });

  test('stopping during food confirmation keeps the prior food and leaves intake incomplete', async () => {
    game.save.flags['fact.comfort_food'] = 'ramen';
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.submit('Sam')).toBe(true);
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await waitingOn('Hello, Sam. Comfort food?')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.input?.kind === 'food')).toBe(true);
    expect(dialogue.submit('  soup  ')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('soup');
    expect(game.save.flags['fact.comfort_food']).toBe('ramen');
    expect(game.save.flags['intake.done']).toBeUndefined();
    stopScene();
    await scene.run;
    expect(game.save.flags['fact.comfort_food']).toBe('ramen');
    expect(game.save.flags['intake.done']).toBeUndefined();
    expect(dialogue.input).toBeNull();
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.confirmAnswer()).toBe(false);
  });

  test('food confirmation limits the staged answer and preserves its exact value on acceptance', async () => {
    const answer = dialogue.ask({ kind: 'food', maxLength: 60, allowEmpty: true, placeholder: 'muffin' });
    const expected = 'a'.repeat(60);
    expect(dialogue.submit(`  ${'a'.repeat(75)}  `)).toBe(true);
    expect(dialogue.pendingAnswer).toBe(expected);
    expect(dialogue.confirmAnswer()).toBe(true);
    expect(await answer).toBe(expected);
    expect(dialogue.confirmAnswer()).toBe(false);
  });

  test.each(['leave', 'cancel', 'reset'] as const)('%s clears a staged name and makes stale confirmation inert', async (action) => {
    game.save.player.name = 'Before';
    const answer = dialogue.ask({ kind: 'name', allowEmpty: true, initial: 'Before' });
    expect(dialogue.submit('Staged')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('Staged');
    dialogue[action]();
    expect(await answer).toBeNull();
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.input).toBeNull();
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(game.save.player.name).toBe('Before');
  });

  test('a replacement ask clears the staged name without confirming it or contaminating text input', async () => {
    const name = dialogue.ask({ kind: 'name', allowEmpty: true });
    expect(dialogue.submit('Staged')).toBe(true);
    const food = dialogue.ask({ prompt: 'Favorite snack?', maxLength: 60 });
    expect(await name).toBeNull();
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(dialogue.submit('  soup  ')).toBe(true);
    expect(await food).toBe('soup');
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(game.save.player.name).toBe('');
  });

  test('other KScript free-text inputs continue to save immediately without confirmation', async () => {
    SCENES.set('t_generic_input', parseKScript(`=== t_generic_input
---
[input favorite_snack "Favorite snack?" "crackers"]
narrator: Snack noted.
`, 'generic-input.ks')[0]);
    const scene = play('t_generic_input');
    expect(await until(() => dialogue.input?.prompt === 'Favorite snack?')).toBe(true);
    expect(dialogue.input?.kind).toBeUndefined();
    expect(dialogue.submit('  apples  ')).toBe(true);
    expect(dialogue.pendingAnswer).toBeNull();
    expect(dialogue.confirmAnswer()).toBe(false);
    expect(await waitingOn('Snack noted.')).toBe(true);
    expect(game.save.flags['fact.favorite_snack']).toBe('apples');
    dialogue.advance();
    await scene.run;
  });

  test('SKIP stops at the inline name question and replay skips both intake questions', async () => {
    const scene = play('t_inline_intake');
    expect(await waitingOn('What should we call you?')).toBe(true);
    dialogue.toggleSkip();
    expect(await until(() => dialogue.input?.kind === 'name')).toBe(true);
    expect(dialogue.skipping).toBe(false);
    expect(dialogue.submit('Sam')).toBe(true);
    expect(dialogue.pendingAnswer).toBe('Sam');
    expect(game.save.player.name).toBe('');
    expect(dialogue.confirmAnswer()).toBe(true);
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
