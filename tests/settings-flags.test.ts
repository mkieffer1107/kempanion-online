// Settings that live in save.flags (text size, petals, high contrast, mute-when-hidden, skip-read-only, Gentle mode,
// mini-game Assist) survive NEW GAME / START OVER and "Reset everything", and Settings' "Restore defaults" resets
// exactly those (QA SS-2 and its follow-ups).
import { plugin } from 'bun';
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileModule } from 'svelte/compiler';
import { SETTINGS_FLAGS, carrySettingsFlags, clearSettingsFlags } from '../src/lib/state/settings-flags';

// The game store is a Svelte rune module (.svelte.ts): compile it the way Vite does, so the real reset() runs here.
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
const SETTINGS_SRC = read('src/lib/ui/screens/Settings.svelte');
/** Keys a component reads or writes as save flags: flags['key'] and setFlag('key', …). */
const flagKeys = (src: string) => new Set([...src.matchAll(/flags\['([^']+)'\]|setFlag\('([^']+)'/g)].map((m) => m[1] ?? m[2]));

/** The body of `function name(…) { … }` in a component's source (brace-matched). */
function fnBody(src: string, name: string): string {
  const at = src.search(new RegExp(`function ${name}\\s*\\(`));
  if (at < 0) return '';
  const open = src.indexOf('{', at);
  for (let i = open, depth = 0; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  return '';
}

/** Every settings flag at a non-default value. */
const CUSTOM = {
  'ui.textSize': 'xl', 'ui.petals': 'off', 'ui.thoughts': 'off', 'ui.highContrast': true, 'ui.muteHidden': false,
  'ui.skipReadOnly': true, 'pet.gentle': true, 'minigame.assist': true,
} as const;
/** Story / sim flags that belong to the old semester. */
const STORY = { 'intake.done': true, met_p1: true, ui_accent: 'orange', 'pet.wantSeen': '2026-10-30#1', p3_feature_last: 'x' } as const;

describe('settings kept in save.flags (SS-2)', () => {
  test('the list names every settings flag once', () => {
    expect([...SETTINGS_FLAGS].sort()).toEqual(Object.keys(CUSTOM).sort());
    expect(new Set(SETTINGS_FLAGS).size).toBe(SETTINGS_FLAGS.length);
  });

  test('every flag Settings.svelte stores is in the list', () => {
    const keys = flagKeys(SETTINGS_SRC);
    expect(keys.size).toBeGreaterThan(0);
    for (const k of keys) expect(SETTINGS_FLAGS as readonly string[], k).toContain(k);
  });

  test("the mini-games' Assist toggle is in the list too (MinigameShell keeps it in flags)", () => {
    const keys = flagKeys(read('src/lib/minigames/common/MinigameShell.svelte'));
    expect([...keys]).toContain('minigame.assist');
    for (const k of keys) expect(SETTINGS_FLAGS as readonly string[], k).toContain(k);
  });

  test("Settings' Restore defaults clears them through the list, not a hand-written one", () => {
    const body = fnBody(SETTINGS_SRC, 'restoreDefaults');
    expect(body, 'restoreDefaults() not found in Settings.svelte').not.toBe('');
    expect(body).toMatch(/\bclearSettingsFlags\(\s*game\.save\.flags\s*\)/);
    // a flag deleted or set by hand next to it would be a second list that drifts from SETTINGS_FLAGS
    expect(body).not.toMatch(/delete\s+[\w.]*flags|flags\[/);
    expect(SETTINGS_SRC).toMatch(/import\s*\{[^}]*\bclearSettingsFlags\b[^}]*\}\s*from\s*'[./]*state\/settings-flags'/);
  });

  test('NEW GAME / START OVER (game.reset) keeps them, and save.settings, but not the story', () => {
    Object.assign(game.save.flags, CUSTOM, STORY);
    game.save.settings.textSpeed = 70;
    game.save.settings.crt = true;
    game.save.player.name = 'Max';
    game.reset();
    expect(game.save.flags).toEqual({ ...CUSTOM });
    expect(game.save.settings.textSpeed).toBe(70);
    expect(game.save.settings.crt).toBe(true);
    expect(game.save.player.name).toBe('');
    expect(game.save.companion).toBeNull();
  });

  test("'Reset everything' (game.wipe) keeps them as well, with save.settings, and drops the rest", () => {
    Object.assign(game.save.flags, CUSTOM, STORY);
    game.save.settings.textSpeed = 55;
    game.save.player.name = 'Max';
    game.save.money = 900;
    game.wipe();
    expect(game.save.flags).toEqual({ ...CUSTOM });
    expect(game.save.settings.textSpeed).toBe(55);
    expect(game.save.player.name).toBe('');
    expect(game.save.money).not.toBe(900);
    expect(game.save.companion).toBeNull();
    expect(game.hasSave).toBe(false);
  });

  test('a reset never invents settings flags that were not set', () => {
    clearSettingsFlags(game.save.flags);
    game.save.flags['ui.textSize'] = 'l';
    game.reset();
    expect(game.save.flags).toEqual({ 'ui.textSize': 'l' });
    game.reset();
    expect(game.save.flags).toEqual({ 'ui.textSize': 'l' });
  });

  test('carry copies set values (false included) and nothing else', () => {
    const to: Record<string, boolean | number | string> = {};
    carrySettingsFlags({ ...STORY, 'ui.muteHidden': false, 'pet.gentle': true }, to);
    expect(to).toEqual({ 'ui.muteHidden': false, 'pet.gentle': true });
  });

  test('Restore defaults clears exactly the settings flags', () => {
    const flags: Record<string, boolean | number | string> = { ...CUSTOM, ...STORY };
    clearSettingsFlags(flags);
    expect(flags).toEqual({ ...STORY });
  });
});
