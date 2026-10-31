// Scene screen UI (story QA round 2): the tutorial's KempaPager panel on short phones, the companion picker's
// portrait window, MENU → Skip scene (its copy, and what a skipped prologue still sets up), and HIDE in landscape.
// Pure helpers plus the Svelte wiring they rely on (read from source, like cg-view.test.ts).
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SaveData } from '../src/lib/types';
import { newSave } from '../src/lib/pet';
import { PAGER_CLEAR, PAGER_KEY, PAGER_KEY_MIN, pagerCompact, pagerKey } from '../src/lib/vn/components/pager-fit';
import { parseKScript, walk } from '../src/lib/vn/kscript';
import { MET_FLAGS, STARTER_ITEMS, giveStarterKit, needsIntake, skipNote } from '../src/lib/ui/meta/prologue';
import { isMeaningfulSave } from '../src/lib/ui/meta/save-utils';

const read = (path: string) => readFileSync(join(import.meta.dir, '..', path), 'utf8');
const fresh = (): SaveData => newSave(Date.parse('2026-10-30T15:42:00'));

/** A stand-in for the game store: setFlag and persist write the save; `give` is what queues the "Got …" toast. */
function store(save = fresh()) {
  const calls: string[] = [];
  return {
    save,
    calls,
    give(item: string, n = 1) { save.inventory[item] = (save.inventory[item] ?? 0) + n; calls.push(`give ${item} ${n}`); },
    setFlag(name: string) { save.flags[name] = true; calls.push(`set ${name}`); },
    persist() { calls.push('persist'); },
  };
}

describe('KempaPager panel above the picture (phone portrait)', () => {
  // The two-row panel: top: safe-top + 10px, 128 px tall → bottom edge 138.
  test('compact when the band above the picture is shorter than the panel and its shadow', () => {
    expect(pagerCompact(138, 64)).toBe(true); // 375x553: the picture starts 64 px down (it overlapped by 74 px)
    expect(pagerCompact(138, 152)).toBe(false); // iPhone 15 Pro portrait
    expect(pagerCompact(138, 313)).toBe(false); // Pixel 7
    expect(pagerCompact(138, 138 + PAGER_CLEAR)).toBe(false);
    expect(pagerCompact(138, 138 + PAGER_CLEAR - 1)).toBe(true);
  });

  test('never compact before the panel was measured', () => {
    expect(pagerCompact(0, 0)).toBe(false);
    expect(pagerCompact(0, 64)).toBe(false);
  });

  // The compact panel: top safe-top + 6 → 6, padding + border 12, so it is key + 12 tall and its bottom edge is 18 + key.
  test('the compact keys shrink with the band above the picture, between PAGER_KEY_MIN and PAGER_KEY', () => {
    const key = (pictureTop: number) => pagerKey(pictureTop, 6, 12);
    expect(key(78)).toBe(PAGER_KEY); // 375x553, Text Size S (20 px to spare)
    expect(key(64)).toBe(PAGER_KEY); // M: 40 px keys end exactly 6 px above the picture
    expect(key(63)).toBe(39);
    expect(key(51)).toBe(27); // L: it overlapped by 7 px at 40 px keys
    expect(key(50)).toBe(26);
    // a short band never goes under the minimum: the panel reaches the picture's top (scenery) instead
    expect(key(32)).toBe(PAGER_KEY_MIN); // XL
    expect(key(26)).toBe(PAGER_KEY_MIN); // 320x460
    expect(key(0)).toBe(PAGER_KEY_MIN);
    expect(key(-20)).toBe(PAGER_KEY_MIN);
    // plenty of room, and a measurement that is not a number
    expect(key(400)).toBe(PAGER_KEY);
    expect(pagerKey(NaN, 6, 12)).toBe(PAGER_KEY);
  });

  test('where the compact keys fit the band, the panel ends PAGER_CLEAR above the picture', () => {
    for (const pictureTop of [51, 55, 60, 64, 70, 120]) {
      const keyH = pagerKey(pictureTop, 6, 12);
      expect(6 + keyH + 12 + PAGER_CLEAR).toBeLessThanOrEqual(pictureTop);
    }
  });

  test('Scene hands the stage element to the top panel; the panel measures it and has a one-row compact form', () => {
    const scene = read('src/lib/ui/screens/Scene.svelte');
    expect(scene).toMatch(/<div class="stage-wrap" bind:this=\{stageEl\}/);
    expect(scene).toMatch(/<PagerInset place="top" picture=\{stageEl\} strip=\{id === 'tutorial_hub'\} \/>/);
    const inset = read('src/lib/vn/components/PagerInset.svelte');
    expect(inset).toMatch(/class:compact/);
    expect(inset).toMatch(/new ResizeObserver\(fit\)/);
    expect(inset).toMatch(/\.pager\.top\.compact \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(inset).toMatch(/class="lbl" class:visually-hidden=\{compact\}/); // labels are still read out
  });

  test('the panel sizes its compact keys from --key-h, and observes the picture, not the panel its callback resizes', () => {
    const inset = read('src/lib/vn/components/PagerInset.svelte');
    expect(inset).toMatch(/style:--key-h="\{keyH\}px"/);
    expect(inset).toMatch(/\.compact \.key \{ min-height: var\(--key-h, 40px\)/);
    expect(inset).toMatch(/\.compact \.glyph \{ --glyph: clamp\(16px, calc\(var\(--key-h, 40px\) - 12px\), 28px\); \}/);
    expect(inset).toMatch(/keyH = pagerKey\(pictureTop, /);
    expect(inset).toMatch(/ro\?\.observe\(pic\);/);
    expect(inset).not.toMatch(/ro\?\.observe\(el\)/); // "ResizeObserver loop completed with undelivered notifications"
  });
});

describe('companion picker', () => {
  const picker = read('src/lib/ui/meta/CompanionPicker.svelte');

  test('the portrait window has explicit minmax(0, 1fr) tracks, so the portrait scales down instead of being cut', () => {
    const stage = picker.match(/\n {2}\.stage \{[^}]*\}/)?.[0] ?? '';
    expect(stage).toMatch(/grid-template-rows: minmax\(0, 1fr\)/);
    expect(stage).toMatch(/grid-template-columns: minmax\(0, 1fr\)/);
  });

  test('the portrait box takes its width from its height, so WebKit does not shrink it per remount', () => {
    const portrait = picker.match(/\n {2}\.portrait \{[^}]*\}/)?.[0] ?? '';
    expect(portrait).toMatch(/height: min\(96%, 640px\)/);
    expect(portrait).toMatch(/aspect-ratio: 192 \/ 256;/); // the sprite's cell (PORTRAIT_W x PORTRAIT_H)
  });

  test('short phones give the profile card more of the height', () => {
    expect(picker).toMatch(
      /@media \(max-aspect-ratio: 5\/4\) and \(max-height: 600px\) \{\s*\.main \{ grid-template-rows: minmax\(110px, 0\.6fr\) minmax\(0, 1\.4fr\); \}/,
    );
  });
});

describe('MENU → Skip scene', () => {
  test('only a scene with a trigger is promised to come back', () => {
    expect(skipNote({ triggered: true })).toBe('Skip the rest of this scene? It won’t count as seen, so it can come back later.');
    expect(skipNote({ triggered: false })).toBe('Skip the rest of this scene? It won’t count as seen.');
    expect(skipNote({})).not.toMatch(/come back/);
    expect(skipNote({ replay: true, triggered: true })).toBe('Leave this replay?');
  });

  test('the prologue skips ahead to selection, after completing the intake if needed', () => {
    expect(skipNote({ prologue: true, intake: true })).toBe(
      'Skip ahead to the Kempa intake questions? You’ll meet your Kempanions afterward.',
    );
    expect(skipNote({ prologue: true, intake: false })).toBe('Skip the rest of the intro?');
    for (const intake of [true, false]) expect(skipNote({ prologue: true, intake, triggered: false })).not.toMatch(/come back/);
  });

  test('Scene picks the copy by trigger, sends a prologue skipped before its intake to the form, and hands over the rest', () => {
    const scene = read('src/lib/ui/screens/Scene.svelte');
    expect(scene).toMatch(/skipNote\(\{ replay: params\.replay, triggered: info\?\.triggered, prologue, intake: prologue && needsIntake\(game\.save\) \}\)/);
    const leave = scene.slice(scene.indexOf('function leave()'), scene.indexOf('function skipScene()'));
    expect(leave).toMatch(/if \(prologue && skipped\)/);
    expect(leave).toMatch(/needsIntake\(game\.save\)\) \{\s*game\.go\('newgame', \{ intake: true \}\);/);
    expect(leave).toMatch(/giveStarterKit\(game\);/);
    const newgame = read('src/lib/ui/screens/NewGame.svelte');
    expect(newgame).toMatch(/const skippedPrologue = game\.params\.intake === true;/);
    expect(newgame).toMatch(/skippedPrologue \? 'intake'/); // straight to the form, no overwrite prompt
    const finish = newgame.slice(newgame.indexOf('function finishIntake'));
    expect(finish.indexOf("game.go('scene'")).toBeGreaterThan(finish.indexOf("game.setFlag('intake.done')"));
  });
});

describe('what a skipped prologue still sets up', () => {
  const [prologue] = parseKScript(read('src/lib/content/scenes/prologue.ks'), 'prologue.ks');

  test('the prologue has no automatic trigger (the title starts or continues it)', () => {
    expect(prologue.id).toBe('prologue');
    expect(prologue.meta.trigger).toBeUndefined();
  });

  test('starter items and met flags match what prologue.ks hands over', () => {
    const items: Record<string, number> = {};
    const flags: string[] = [];
    walk(prologue.body, (n) => {
      if (n.t !== 'cmd') return;
      if (n.cmd.kind === 'give') items[n.cmd.item] = (items[n.cmd.item] ?? 0) + n.cmd.n;
      if (n.cmd.kind === 'set' && /^met_/.test(n.cmd.name)) flags.push(n.cmd.name);
      if (n.cmd.kind === 'set' && n.cmd.name === 'intake.done') flags.push(n.cmd.name);
    });
    expect(items).toEqual({ ...STARTER_ITEMS });
    expect(flags.filter((f) => f !== 'intake.done').sort()).toEqual([...MET_FLAGS]);
    expect(flags).toContain('intake.done'); // what needsIntake() reads
  });

  test('needsIntake until intake.done is set', () => {
    const s = fresh();
    expect(needsIntake(s)).toBe(true);
    s.flags['intake.done'] = true;
    expect(needsIntake(s)).toBe(false);
  });

  test('giveStarterKit hands over only what is missing, once, and without the item toasts', () => {
    const a = store();
    giveStarterKit(a);
    expect(a.save.inventory).toEqual({ water_bottle: 1, kempapager: 1 });
    expect(MET_FLAGS.every((f) => a.save.flags[f] === true)).toBe(true);
    // store.give queues "Got Water Bottle" / "Got KempaPager": over Select they covered the companion window and the card
    expect(a.calls.filter((c) => c.startsWith('give'))).toEqual([]);
    expect(a.calls.at(-1)).toBe('persist');
    const once = JSON.stringify(a.save);
    giveStarterKit(a);
    expect(JSON.stringify(a.save)).toBe(once);

    // skipped after Piggy 2's water bottle and the Plaza, before Piggy 3's KempaPager
    const b = store();
    b.save.inventory.water_bottle = 1;
    b.save.flags.met_p1 = true;
    giveStarterKit(b);
    expect(b.calls).toEqual(['set met_p2', 'set met_p3', 'persist']);
    expect(b.save.inventory).toEqual({ water_bottle: 1, kempapager: 1 });

    // a second water bottle from play is not a reason to hand over another one
    const c = store();
    c.save.inventory.water_bottle = 3;
    giveStarterKit(c);
    expect(c.save.inventory).toEqual({ water_bottle: 3, kempapager: 1 });
  });

  test('only the late skip hands out starter items; recovery intake returns to the story', () => {
    expect(read('src/lib/ui/screens/NewGame.svelte')).not.toContain('giveStarterKit(game)');
    expect(read('src/lib/ui/screens/Scene.svelte')).toMatch(/giveStarterKit\(game\);\s*game\.flush\(\);/);
  });
});

describe('a skipped prologue leaves no half-made save behind the intake form', () => {
  const newgame = read('src/lib/ui/screens/NewGame.svelte');

  test('the save goes back to blank once the form is up, so CANCEL (or a reload) there has nothing to CONTINUE', () => {
    // after the form has read the name (child components mount first), before the form is submitted
    expect(newgame).toMatch(/onMount\(\(\) => \{\s*if \(skippedPrologue && hasPrologue\) freshSave\(\);\s*\}\);/);
    expect(newgame).toMatch(/<IntakeForm onDone=\{finishIntake\} onCancel=\{\(\) => game\.go\('title'\)\} \/>/);
    // submitting still builds the whole save from the form's answers
    const finish = newgame.slice(newgame.indexOf('function finishIntake'), newgame.indexOf('const bg ='));
    expect(finish).toMatch(/freshSave\(\);\s*game\.save\.player\.name = r\.name;/);
  });

  test('neither a blank save nor a half-made intake is offered to CONTINUE', () => {
    const blank = fresh();
    expect(isMeaningfulSave(blank, true)).toBe(false);
    const half = fresh();
    half.player.name = 'Kei';
    expect(isMeaningfulSave(half, true)).toBe(false);
  });
});

describe('HIDE', () => {
  test('Scene passes the hidden state to GameLayout, so the S right rail hides with the box', () => {
    const scene = read('src/lib/ui/screens/Scene.svelte');
    expect(scene).toMatch(/<GameLayout chrome="vn" centered dockedDialogue \{topClearance\} hideUi=\{dialogue\.uiHidden\} onreveal=\{\(\) => \(dialogue\.uiHidden = false\)\}>/);
    // the rail's controls are in GameLayout's `bottom` region, which hide-ui hides
    expect(scene).toMatch(/\{#snippet bottom\(\)\}\s*\{#if viewport\.mode === 's'\}<DialogueControls vertical/);
    expect(read('src/lib/ui/layout/GameLayout.svelte')).toMatch(/\.hide-ui \.bottom[^{]*\{[^}]*visibility: hidden/);
  });
});

describe('recovery intake preserves the introduction', () => {
  test('uses the story dialogue frame without premature companion reactions', () => {
    const intake = read('src/lib/ui/meta/IntakeForm.svelte');
    expect(intake).toContain('<GameLayout chrome="vn" centered dockedDialogue');
    expect(intake).toContain('<DialogueBox layout="docked"');
    expect(intake).toContain("kind: 'name'");
    expect(intake).toContain("kind: 'food'");
    expect(intake).not.toMatch(/INTAKE_REACTION|faceUrl|CHARACTERS|class="tablet|class="bubble/);
  });

  test('completed recovery intake resumes the story before first meetings and selection', () => {
    const screen = read('src/lib/ui/screens/NewGame.svelte');
    const finish = screen.slice(screen.indexOf('function finishIntake'), screen.indexOf('const bg ='));
    expect(finish).toContain("game.setFlag('intake.done')");
    expect(finish).toContain("game.go('scene', { id: 'prologue', back: 'hub' })");
    expect(finish).not.toContain('giveStarterKit(game)');
    expect(screen).not.toContain("game.go('select'");
    expect(screen).toContain("!hasPrologue ? 'unavailable'");
    expect(screen).toContain('window.location.reload()');
    expect(finish.indexOf("game.setFlag('intake.done')")).toBeLessThan(finish.indexOf("game.go('scene'"));
  });
});
