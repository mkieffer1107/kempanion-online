// [brain] (owner feedback fb7): while the companion explains the Big Brain in tutorial_big_brain, the hub's real brain
// chip shows over the scene (BrainInset.svelte), ringed. Parsing and validating the command are in kscript.test.ts;
// here: the store, the real scene runner turning it on and off and always off once a scene ends or is stopped, the
// cues in every companion's branch, and the Scene / BrainInset wiring. Sound, the canvas stage, the scene registry and
// free chat are stubbed as in dialogue-flow.test.ts.
import { plugin } from 'bun';
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileModule } from 'svelte/compiler';
import { parseKScript, type Scene } from '../src/lib/vn/kscript';
import type { PigId } from '../src/lib/types';

// The stores are Svelte rune modules (.svelte.ts): compile them the way Vite does.
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

const { brainInset } = await import('../src/lib/vn/brain.svelte');
const { dialogue } = await import('../src/lib/vn/dialogue.svelte');
const { game } = await import('../src/lib/state/game.svelte');
const { runScene, stopScene } = await import('../src/lib/vn/runner');

const read = (path: string) => readFileSync(join(import.meta.dir, '..', path), 'utf8');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(pred: () => boolean, ms = 2000): Promise<boolean> {
  const t0 = performance.now();
  while (!pred()) {
    if (performance.now() - t0 > ms) return false;
    await sleep(4);
  }
  return true;
}

let lastRun: Promise<unknown> = Promise.resolve();
function play(id: string) {
  let ended = false;
  const run = runScene(id).then(() => { ended = true; });
  lastRun = run;
  return { run, ended: () => ended };
}

/** Advance through a playing scene, noting for every line whether the chip shows; stops when the scene ends. */
async function lines(p: { ended: () => boolean }): Promise<{ text: string; on: boolean }[]> {
  const seen: { text: string; on: boolean }[] = [];
  for (let i = 0; i < 60; i++) {
    if (!(await until(() => p.ended() || dialogue.waiting))) throw new Error('scene stuck');
    if (p.ended()) return seen;
    seen.push({ text: dialogue.text, on: brainInset.on });
    dialogue.advance();
    await until(() => p.ended() || !dialogue.waiting, 500);
  }
  throw new Error('scene too long');
}

SCENES.set('t_brain', parseKScript('=== t_brain\n---\nnarrator: Before.\n[brain]\nnarrator: On.\n[brain off]\nnarrator: Off.\n[brain]\nnarrator: Left on.\n', 'brain.ks')[0]);
const home = parseKScript(read('src/lib/content/scenes/home.ks'), 'home.ks');
SCENES.set('tutorial_big_brain', home.find((s) => s.id === 'tutorial_big_brain')!);

const SAVE = JSON.parse(JSON.stringify(game.save));

beforeEach(async () => {
  stopScene();
  await lastRun;
  dialogue.reset();
  dialogue.auto = false;
  game.save.settings.textSpeed = 0; // lines show at once
});

afterAll(async () => {
  stopScene();
  await lastRun;
  dialogue.reset();
  game.save = SAVE;
});

describe('brainInset store', () => {
  test('starts off', () => {
    expect(brainInset.on).toBe(false);
  });
});

describe('the scene runner', () => {
  test('[brain] / [brain off] show and hide the chip between lines; the scene’s end turns it off', async () => {
    const p = play('t_brain');
    expect(await lines(p)).toEqual([
      { text: 'Before.', on: false },
      { text: 'On.', on: true },
      { text: 'Off.', on: false },
      { text: 'Left on.', on: true },
    ]);
    await p.run;
    expect(brainInset.on).toBe(false); // the script left it on: the runner's reset
  });

  test('a scene stopped with the chip up (MENU → Skip scene) turns it off too', async () => {
    const p = play('t_brain');
    expect(await until(() => dialogue.waiting && dialogue.text === 'Before.')).toBe(true);
    dialogue.advance();
    expect(await until(() => dialogue.waiting && dialogue.text === 'On.')).toBe(true);
    expect(brainInset.on).toBe(true);
    stopScene();
    await p.run;
    expect(brainInset.on).toBe(false);
  });
});

describe('tutorial_big_brain', () => {
  for (const pig of ['piggy-1', 'piggy-2', 'piggy-3'] as PigId[]) {
    test(`${pig}: the chip comes up on the first line about it and stays through the tip`, async () => {
      game.save.companion = pig;
      const p = play('tutorial_big_brain');
      const seen = await lines(p);
      await p.run;
      const first = seen.findIndex((l) => /brain|chip/i.test(l.text));
      expect(first).toBeGreaterThan(0);
      expect(seen.slice(0, first).every((l) => !l.on)).toBe(true);
      expect(seen.slice(first).every((l) => l.on)).toBe(true);
      expect(seen.at(-1)!.text).toMatch(/^【KEMPA AI】Tip: the brain chip always opens Big Brain controls/);
      expect(brainInset.on).toBe(false);
      expect(game.save.flags['tut.big_brain_coach']).toBe(true); // the hub's coach mark takes over
    });
  }
});

describe('wiring', () => {
  const scene = read('src/lib/ui/screens/Scene.svelte');
  const inset = read('src/lib/vn/components/BrainInset.svelte');
  const runner = read('src/lib/vn/runner.ts');

  test('the runner sets it per cue and clears it with the pager when a scene ends', () => {
    expect(runner).toContain("case 'brain': brainInset.on = cmd.on; break;");
    const fin = runner.slice(runner.lastIndexOf('} finally {'));
    expect(fin).toContain('pagerInset.keys = null;');
    expect(fin).toContain('brainInset.on = false;');
  });

  test('Scene mounts it next to the pager: over the stage in W and S, in the band above it in T', () => {
    expect(scene).toMatch(/\{#if viewport\.mode !== 't'\}[\s\S]*<PagerInset place="stage" \/>\s*<BrainInset place="stage" \/>[\s\S]*\{\/if\}/);
    expect(scene).toMatch(/\{#snippet overlay\(\)\}[\s\S]*<BrainInset place="top" \/>[\s\S]*\{\/snippet\}/);
  });

  test('it is the real chip, inert, even before opting into Big Brain', () => {
    expect(inset).toMatch(/<span class="ring" inert><BrainChip small \/><\/span>/);
    expect(inset).not.toContain('bigBrainUiEnabled');
    expect(inset).toContain('brainInset.on');
  });
});
