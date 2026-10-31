// KScript engine tests + the scene VALIDATOR. Story writers: run `bun test tests/kscript.test.ts`.
// Every .ks file in src/lib/content/scenes is parsed and checked; failures print as file:line: message.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PigId, SaveData } from '../src/lib/types';
import { evalCondition, parseCondition, type CondState } from '../src/lib/vn/conditions';
import { interpolate, scanTokens } from '../src/lib/vn/interpolate';
import { runProgram, type VnEnv } from '../src/lib/vn/interpreter';
import { KScriptError, parseKScript, parseKScriptDetailed, type Command, type Scene } from '../src/lib/vn/kscript';
import { msPerChar, paginate, pauseAfter, PAUSES } from '../src/lib/vn/typewriter';
import { chapterFromDays, parseTrigger, rankScenes, sceneEligible, TriggerError, type TriggerEnv } from '../src/lib/vn/triggers';
import { formatIssue, validateKScript } from '../src/lib/vn/validate';

const one = (src: string) => parseKScript(src, 'test.ks')[0];
const scene = (body: string, meta = '') => one(`=== s\n${meta}---\n${body}`);
const cmds = (body: string): Command[] => scene(body).body.flatMap((n) => (n.t === 'cmd' ? [n.cmd] : []));

function errorsOf(src: string): string[] {
  return parseKScriptDetailed(src, 'bad.ks').errors.map((e) => `${e.line}: ${e.message}`);
}

// ───────────────────────── parser ─────────────────────────

describe('parser', () => {
  test('scenes, metadata and defaults', () => {
    const scenes = parseKScript(
      [
        '# comment',
        '=== p2_h1',
        'title: Perfusion Is Everything',
        'pig: piggy-2',
        'heart: 1',
        'trigger: location=communicore; time=day,morning; bond>=0; seen!=p1_h1',
        'cg: cg_p2_lab',
        '---',
        'narrator: Hello.',
        '',
        '=== vignette',
        'title: "Quoted Title"',
        'trio: yes',
        'repeat: true',
        'replayable: false',
        'summary: Everyone eats lunch.',
        'mood: cozy',
        '---',
        'narrator: Hi.',
      ].join('\n'),
      'two.ks',
    );
    expect(scenes.map((s) => s.id)).toEqual(['p2_h1', 'vignette']);
    const [a, b] = scenes;
    expect(a.meta).toMatchObject({ title: 'Perfusion Is Everything', pig: 'piggy-2', heart: 1, priority: 50, cg: 'cg_p2_lab', repeat: false, replayable: true });
    expect(a.meta.trigger).toHaveLength(4);
    expect(a.file).toBe('two.ks');
    expect(a.line).toBe(2);
    expect(b.meta).toMatchObject({ title: 'Quoted Title', trio: true, priority: 40, repeat: true, replayable: false, summary: 'Everyone eats lunch.' });
    expect(b.meta.extra).toEqual({ mood: 'cozy' });
    expect(scene('narrator: x').meta.priority).toBe(10);
    expect(scene('narrator: x', 'heart: 3\npig: piggy-1\npriority: 7\n').meta.priority).toBe(7);
  });

  test('speaker lines', () => {
    const s = scene([
      'piggy-2 happy: Hey, {player}! Based.',
      'piggy-2: Expression omitted: keeps the current one.',
      'narrator: The hallway smells faintly of coffee.',
      'player: Hi! (name plate)',
      'piggy-3 Thinking: Okay, so I was thinking…\\nWhat if?',
      'piggy-1: "Quoted lines lose their quotes."',
    ].join('\n'));
    expect(s.body).toEqual([
      { t: 'say', line: 3, speaker: 'piggy-2', expression: 'happy', text: 'Hey, {player}! Based.' },
      { t: 'say', line: 4, speaker: 'piggy-2', expression: undefined, text: 'Expression omitted: keeps the current one.' },
      { t: 'say', line: 5, speaker: 'narrator', expression: undefined, text: 'The hallway smells faintly of coffee.' },
      { t: 'say', line: 6, speaker: 'player', expression: undefined, text: 'Hi! (name plate)' },
      { t: 'say', line: 7, speaker: 'piggy-3', expression: 'thinking', text: 'Okay, so I was thinking…\nWhat if?' },
      { t: 'say', line: 8, speaker: 'piggy-1', expression: undefined, text: 'Quoted lines lose their quotes.' },
    ]);
  });

  test("mumble delivery is independent of a line's portrait expression", () => {
    const s = scene('piggy-3 phone mumble: Action chunking?');
    expect(s.body[0]).toMatchObject({ t: 'say', speaker: 'piggy-3', expression: 'phone', delivery: 'mumble', text: 'Action chunking?' });
    expect(s.ops[0]).toMatchObject({ op: 'say', expression: 'phone', delivery: 'mumble' });
    for (const line of ['piggy-3 phone shout: Nope.', 'piggy-3 phone mumble extra: Nope.']) {
      expect(errorsOf(`=== bad\n---\n${line}`).length).toBeGreaterThan(0);
    }
  });

  test('nameplates accept scene aliases and reset to the real name', () => {
    expect(cmds('[nameplate piggy-1 "???"] [nameplate piggy-2 "Pig in scrubs"] [nameplate piggy-1]')).toEqual([
      { kind: 'nameplate', pig: 'piggy-1', name: '???' },
      { kind: 'nameplate', pig: 'piggy-2', name: 'Pig in scrubs' },
      { kind: 'nameplate', pig: 'piggy-1', name: null },
    ]);
    for (const command of ['[nameplate]', '[nameplate narrator "???"]', '[nameplate piggy-4 "???"]', '[nameplate piggy-1 too many words]']) {
      expect(errorsOf(`=== bad\n---\n${command}`).length).toBeGreaterThan(0);
    }
  });

  test('all documented commands', () => {
    const c = cmds([
      '[bg communicore fade]',
      '[bg dorm]',
      '[bgm piggy2_theme]',
      '[bgm stop]',
      '[show piggy-2@scrubs neutral center]',
      '[show piggy-1 left]',
      '[hide piggy-2]',
      '[sfx oink]',
      '[wait 400]',
      '[shake] [flash] [petals heavy] [weather rain]',
      '[cg cg_p2_lab]   [cg off]',
      '[set met_p2]  [set p2_mood = 3]  [unset met_p2]',
      '[bond piggy-2 +5]  [money +20]  [give pub_sub 1]  [take pub_sub]  [need piggy-2 fun +10]',
      '[goto here]',
      '*here',
      '[chat piggy-2 "Ask him anything about the lab!"]',
      '[minigame volley]',
      '[outfit piggy-2 scrubs]',
      '[name]',
      '[input comfort_food "Comfort food?"]',
      '[companion pick]',
      '[time evening]',
      '[end]',
    ].join('\n'));
    expect(c).toEqual([
      { kind: 'bg', id: 'communicore', transition: 'fade' },
      { kind: 'bg', id: 'dorm', transition: undefined },
      { kind: 'bgm', id: 'piggy2_theme', fadeMs: undefined },
      { kind: 'bgm', id: null, fadeMs: undefined },
      { kind: 'show', pig: 'piggy-2', outfit: 'scrubs', expression: 'neutral', pos: 'center' },
      { kind: 'show', pig: 'piggy-1', outfit: undefined, expression: undefined, pos: 'left' },
      { kind: 'hide', pig: 'piggy-2' },
      { kind: 'sfx', id: 'oink' },
      { kind: 'wait', ms: 400 },
      { kind: 'shake', intensity: undefined, ms: undefined },
      { kind: 'flash', color: undefined, ms: undefined },
      { kind: 'petals', level: 'heavy' },
      { kind: 'weather', weather: 'rain' },
      { kind: 'cg', id: 'cg_p2_lab' },
      { kind: 'cg', id: null },
      { kind: 'set', name: 'met_p2', op: '=', value: true },
      { kind: 'set', name: 'p2_mood', op: '=', value: 3 },
      { kind: 'unset', name: 'met_p2' },
      { kind: 'bond', pig: 'piggy-2', n: 5 },
      { kind: 'money', n: 20 },
      { kind: 'give', item: 'pub_sub', n: 1 },
      { kind: 'take', item: 'pub_sub', n: 1 },
      { kind: 'need', pig: 'piggy-2', need: 'fun', n: 10 },
      { kind: 'goto', label: 'here' },
      { kind: 'chat', pig: 'piggy-2', prompt: 'Ask him anything about the lab!', maxTurns: undefined },
      { kind: 'minigame', id: 'volley' },
      { kind: 'outfit', pig: 'piggy-2', outfit: 'scrubs' },
      { kind: 'name' },
      { kind: 'input', key: 'comfort_food', prompt: 'Comfort food?', fallback: undefined },
      { kind: 'companion', pig: 'pick' },
      { kind: 'time', time: 'evening' },
      { kind: 'end' },
    ]);
  });

  test('extension commands', () => {
    expect(cmds('[wait 1.5s] [bgm title 900] [shake 0.6 300] [flash #fff 120] [fade out 400] [burst hearts] [jingle bond_up]')).toEqual([
      { kind: 'wait', ms: 1500 },
      { kind: 'bgm', id: 'title', fadeMs: 900 },
      { kind: 'shake', intensity: 0.6, ms: 300 },
      { kind: 'flash', color: '#fff', ms: 120 },
      { kind: 'fade', to: 'black', ms: 400 },
      { kind: 'burst', burst: 'hearts' },
      { kind: 'jingle', id: 'bond_up' },
    ]);
    expect(cmds('[set score += 2] [set score -= 1] [set major = "Computing & Data"] [set ok = false]')).toEqual([
      { kind: 'set', name: 'score', op: '+=', value: 2 },
      { kind: 'set', name: 'score', op: '-=', value: 1 },
      { kind: 'set', name: 'major', op: '=', value: 'Computing & Data' },
      { kind: 'set', name: 'ok', op: '=', value: false },
    ]);
    expect(cmds('[chat piggy-3 "Ask about [codex]" 3] [input food "Snack?" "soup"] [companion piggy-2] [remember all "likes {fact:food}"] [call other] [hide all] [expr piggy-1 surprised]')).toEqual([
      { kind: 'chat', pig: 'piggy-3', prompt: 'Ask about [codex]', maxTurns: 3 },
      { kind: 'input', key: 'food', prompt: 'Snack?', fallback: 'soup' },
      { kind: 'companion', pig: 'piggy-2' },
      { kind: 'remember', pig: 'all', fact: 'likes {fact:food}' },
      { kind: 'call', scene: 'other' },
      { kind: 'hide', pig: null },
      { kind: 'expr', pig: 'piggy-1', expression: 'surprised' },
    ]);
    expect(cmds('[pager] [pager Feed drink] [pager bottom] [pager top play] [pager off]')).toEqual([
      { kind: 'pager', keys: [] },
      { kind: 'pager', keys: ['feed', 'drink'] },
      { kind: 'pager', keys: ['light', 'care', 'talk', 'stats'] },
      { kind: 'pager', keys: ['feed', 'drink', 'play', 'wash'] },
      { kind: 'pager', keys: null },
    ]);
    expect(() => cmds('[pager snack]')).toThrow(/pager key/);
  });

  test('[brain] / [brain off]: the hub’s Big Brain chip over the scene', () => {
    expect(cmds('[brain] [brain on] [BRAIN Off] [brain off]')).toEqual([
      { kind: 'brain', on: true },
      { kind: 'brain', on: true },
      { kind: 'brain', on: false },
      { kind: 'brain', on: false },
    ]);
    expect(errorsOf('=== s\n---\n[brain big]')).toEqual(['3: [brain] must be one of off, on (got "big")']);
    expect(errorsOf('=== s\n---\n[brain of]')).toEqual(['3: [brain] must be one of off, on (got "of" (did you mean "off"?))']);
    expect(errorsOf('=== s\n---\n[brain on off]')).toEqual(['3: usage: [brain] or [brain off]']);
    expect(errorsOf('=== s\n---\n[brian]')).toEqual(['3: unknown command [brian] (did you mean "brain"?)']);
  });

  test('CRLF, tabs, BOM, // comments and trailing # comments', () => {
    const src = '﻿=== s\r\n---\r\n? A\r\n\tpiggy-1: tab-indented\r\n// note\r\n[sfx oink]  # trailing comment\r\n';
    const s = parseKScript(src)[0];
    expect(s.body).toHaveLength(2);
    const ch = s.body[0];
    expect(ch.t === 'choice' && ch.options[0].body[0]).toMatchObject({ t: 'say', speaker: 'piggy-1', text: 'tab-indented' });
    expect(s.body[1]).toMatchObject({ t: 'cmd', line: 6, cmd: { kind: 'sfx', id: 'oink' } });
  });

  test('choices nest by indentation and may carry [if]', () => {
    const s = scene([
      '? Based.',
      '  [bond piggy-2 +3]',
      '  piggy-2 proud: Patriot.',
      '  ? Again?',
      '    piggy-2: Based.',
      '  ? Enough.',
      '? What is this place? [if !flag(toured)]',
      '  piggy-2 excited: The College of Medicine!',
      'narrator: After.',
    ].join('\n'));
    expect(s.body).toHaveLength(2);
    const ch = s.body[0];
    if (ch.t !== 'choice') throw new Error('expected a choice');
    expect(ch.options.map((o) => o.text)).toEqual(['Based.', 'What is this place?']);
    expect(ch.options[0].body.map((n) => n.t)).toEqual(['cmd', 'say', 'choice']);
    expect(ch.options[1].cond).toBeDefined();
    expect(s.body[1]).toMatchObject({ t: 'say', speaker: 'narrator' });
  });

  test('if / elif / else / endif, nested, indented or not', () => {
    const s = scene([
      '[if bond(piggy-2) >= 5]',
      '  piggy-2 shy_blush: You keep coming back here...',
      '  [if flag(a)]',
      '  narrator: a',
      '  [endif]',
      '[elif money >= 100]',
      'narrator: rich',
      '[else]',
      '  piggy-2: Anyway.',
      '[endif]',
      'narrator: done',
    ].join('\n'));
    expect(s.body.map((n) => n.t)).toEqual(['if', 'say']);
    const n = s.body[0];
    if (n.t !== 'if') throw new Error('expected if');
    expect(n.branches.map((b) => b.cond === null)).toEqual([false, false, true]);
    expect(n.branches[0].body.map((x) => x.t)).toEqual(['say', 'if']);
  });

  test('errors carry file:line and helpful messages', () => {
    try {
      parseKScript('=== s\n---\nnarrator: ok\n[bgx dorm]\n', 'scenes/p1.ks');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(KScriptError);
      const err = e as KScriptError;
      expect(err.message).toBe('scenes/p1.ks:4: unknown command [bgx] (did you mean "bg"?)');
      expect(err.line).toBe(4);
      expect(err.file).toBe('scenes/p1.ks');
    }
    expect(errorsOf('=== s\n---\npiggy1: hi')).toEqual(['3: unknown speaker "piggy1" (did you mean "piggy-1"?) (speakers: piggy-1, piggy-2, piggy-3, player, narrator)']);
    expect(errorsOf('narrator: hi\n=== s\n---\n')).toEqual(['1: text before the first "=== scene_id" header']);
    expect(errorsOf('=== s\ntitle: x\nnarrator: hi')[0]).toMatch(/^1: scene "s" is missing the "---"/);
    expect(errorsOf('=== s\ntrigger: location=plaza; mood=happy\n---\n')[0]).toMatch(/^2: trigger: unknown trigger key "mood"/);
    expect(errorsOf('=== s\npig: piggy-4\n---\n')[0]).toMatch(/^2: pig: must be piggy-1, piggy-2 or piggy-3/);
    expect(errorsOf('=== s\nheart: 9\npig: piggy-1\n---\n')).toEqual(['2: heart: must be 1–7']);
    expect(errorsOf('=== s\nheart: 2\n---\n')).toEqual(['2: heart: needs a pig: line']);
    expect(errorsOf('=== Bad-Id\n---\n')[0]).toMatch(/may only use a-z, 0-9 and _/);
    expect(errorsOf('=== s\n---\n=== s\n---\n')).toEqual(['3: duplicate scene id "s"']);
    expect(errorsOf('=== s\n---\n[goto nowhere]\n*there')).toEqual(['3: [goto nowhere]: no label *nowhere in scene s']);
    expect(errorsOf('=== s\n---\n[if flag(x)]\nnarrator: a')).toEqual(['3: [if] is missing its [endif] (an [endif] may not be indented less than its [if])']);
    expect(errorsOf('=== s\n---\n[else]')).toEqual(['3: [else] without a matching [if]']);
    expect(errorsOf('=== s\n---\n[if bond(piggy-2) >=]\n[endif]')[0]).toMatch(/^3: bad condition/);
    expect(errorsOf('=== s\n---\n[show piggy-1@scrub happy]')[0]).toMatch(/outfit must be one of .*did you mean "scrubs"/);
    expect(errorsOf('=== s\n---\n[bond piggy-1 lots]')[0]).toMatch(/bond amount must be a whole number/);
    expect(errorsOf('=== s\n---\n[sfx oink] hello')[0]).toMatch(/unexpected text after a command/);
    expect(errorsOf('=== s\n---\n[chat piggy-2 "unclosed]')[0]).toMatch(/unclosed quote|missing "]"/);
    expect(errorsOf('=== s\n---\n[if a] [sfx oink]\n[endif]')[0]).toMatch(/must be on a line of its own/);
    expect(errorsOf('=== s\n---\n*lab el')[0]).toMatch(/label looks like/);
    expect(errorsOf('=== s\n---\nPiggy 2 happy: hi')).toEqual(['3: write the speaker as piggy-2 (lowercase, with a dash)']);
    expect(errorsOf('=== s\n---\n[show piggy-1 volleyball happy]')).toEqual(['3: outfits attach with @: [show piggy-1@volleyball …]']);
    // several errors are collected in one pass
    expect(errorsOf('=== s\n---\nfoo: a\n[nope]\npiggy-1 happy:')).toHaveLength(3);
  });
});

// ───────────────────────── conditions ─────────────────────────

function condState(over: Partial<CondState> = {}, flags: Record<string, boolean | number | string> = {}): CondState {
  const hearts: Record<PigId, number> = { 'piggy-1': 2, 'piggy-2': 5, 'piggy-3': 0 };
  return {
    hearts: (p) => hearts[p],
    points: (p) => hearts[p] * 100 + 30,
    sick: (p) => p === 'piggy-3',
    need: (_p, n) => (n === 'energy' ? 20 : 80),
    flag: (n) => flags[n],
    item: (id) => (id === 'oranges' ? 2 : 0),
    seen: (id) => id === 'p1_h1',
    money: () => 120,
    chapter: () => 2,
    days: () => 3,
    month: () => 10,
    day: () => 31,
    hour: () => 18,
    replay: () => false,
    time: () => 'evening',
    slot: () => 'dusk',
    weekday: () => 'fri',
    companion: () => 'piggy-2',
    location: () => 'lake_alice',
    ...over,
  };
}

describe('conditions', () => {
  const t = (src: string, flags: Record<string, boolean | number | string> = {}, pig: PigId | null = null) =>
    evalCondition(parseCondition(src), condState({}, flags), pig);

  test('documented forms', () => {
    expect(t('bond(piggy-2) >= 5')).toBe(true);
    expect(t('bond(piggy-1) >= 5')).toBe(false);
    expect(t('flag(met)', { met: true })).toBe(true);
    expect(t('!flag(met)', { met: true })).toBe(false);
    expect(t('!flag(met)')).toBe(true);
    expect(t('money>=100')).toBe(true);
    expect(t('item(oranges)>=2')).toBe(true);
    expect(t('item(pub_sub)')).toBe(false);
    expect(t('time=evening')).toBe(true);
    expect(t('time=day,morning')).toBe(false);
    expect(t('companion=piggy-2')).toBe(true);
  });

  test('operators, keywords and values', () => {
    expect(t('bond(piggy-2) >= 5 && !sick(piggy-2)')).toBe(true);
    expect(t('bond(piggy-1) >= 5 || flag(x)', { x: 1 })).toBe(true);
    expect(t('not (money < 50 or chapter = 1)')).toBe(true);
    expect(t('flag(score) >= 2 and flag(major) = computing', { score: 3, major: 'Computing' })).toBe(true);
    expect(t('met_p2', { met_p2: true })).toBe(true);
    expect(t('quiz = 0')).toBe(true);
    expect(t('need(piggy-2, energy) < 30 && seen(p1_h1) && hour >= 17 && month = 10 && day = 31')).toBe(true);
    expect(t('weekday = friday && slot = dusk && location = lake_alice && days >= 3')).toBe(true);
    expect(t('points(piggy-1) > 200 && hearts(piggy-3) = 0 && !replay')).toBe(true);
    expect(t('time != night,day')).toBe(true);
    expect(t('true && !false')).toBe(true);
  });

  test('bare bond/hearts use the scene pig, or every pig', () => {
    expect(t('bond >= 5', {}, 'piggy-2')).toBe(true);
    expect(t('bond >= 1', {}, null)).toBe(false); // piggy-3 has 0
    expect(t('hearts >= 0')).toBe(true);
  });

  test('syntax errors', () => {
    for (const bad of ['', 'bond(piggy-9) > 1', 'bond(piggy-1) >= x', 'time = noon', 'flag()', 'money >=', 'a &&', '(a', 'seen(x) = 1', 'zap(1)']) {
      expect(() => parseCondition(bad)).toThrow();
    }
  });
});

// ───────────────────────── triggers ─────────────────────────

function save(over: Partial<SaveData> = {}): SaveData {
  const pig = (bond: number) => ({
    needs: { hunger: 80, energy: 80, hygiene: 80, fun: 80 }, health: 100, sick: false, bond, asleep: false, outfit: 'everyday',
    mess: 0, lastFedAt: 0, lastPlayedAt: 0, lastTalkedAt: 0, lastPettedAt: 0, today: { date: '', talks: 0, gifts: 0, pets: 0, minigames: 0 },
  });
  return {
    version: 1, createdAt: 0, lastTick: 0, player: { name: 'Alex' }, companion: 'piggy-2',
    pigs: { 'piggy-1': pig(150), 'piggy-2': pig(320), 'piggy-3': pig(40) },
    inventory: { oranges: 1 }, money: 100, location: 'plaza', flags: { met_p2: true }, seenScenes: [], album: [], achievements: [],
    counters: { days_played: 2 }, chatLog: { 'piggy-1': [], 'piggy-2': [], 'piggy-3': [] }, memories: { 'piggy-1': [], 'piggy-2': [], 'piggy-3': [] },
    lastDaily: '', streak: 0,
    settings: { textSpeed: 40, autoDelay: 1.6, masterVolume: 1, bgmVolume: 1, sfxVolume: 1, voiceVolume: 1, reduceMotion: false, crt: false, aiMode: 'heuristic', aiModel: 'x', aiAutoload: false, echoPlayer: true },
    ...over,
  } as SaveData;
}

// Friday 2026-10-30 18:30 local: dusk slot, evening.
const FRIDAY_DUSK = new Date(2026, 9, 30, 18, 30);

function env(over: Partial<TriggerEnv> = {}): TriggerEnv {
  return { location: 'communicore', time: 'evening', weekday: 'fri', date: FRIDAY_DUSK, save: save(), chapter: 2, days: 2, rng: () => 0.5, ...over };
}

describe('triggers', () => {
  test('parse', () => {
    expect(parseTrigger('location=communicore; time=day,morning; bond>=2; seen!=p2_h1')).toEqual([
      { k: 'location', values: ['communicore'], neg: false },
      { k: 'time', values: ['day', 'morning'], neg: false },
      { k: 'hearts', pig: null, op: '>=', n: 2 },
      { k: 'seen', ids: ['p2_h1'], neg: true },
    ]);
    expect(parseTrigger('!flag=met_p2; weekday=Saturday,sun; month=oct,11; date=10-31; chance=25%; hearts(piggy-3)>=4; hour=17-19')).toEqual([
      { k: 'flag', names: ['met_p2'], neg: true },
      { k: 'weekday', values: ['sat', 'sun'], neg: false },
      { k: 'month', values: [10, 11], neg: false },
      { k: 'date', values: ['10-31'], neg: false },
      { k: 'chance', p: 0.25 },
      { k: 'hearts', pig: 'piggy-3', op: '>=', n: 4 },
      { k: 'hour', ranges: [[17, 19]], neg: false },
    ]);
    for (const bad of ['mood=happy', 'time=noon', 'slot=brunch', 'chance=2', 'date=13-01', 'hearts>=many', 'location>=2', '!bond>=2', 'present=piggy-9', '']) {
      expect(() => parseTrigger(bad)).toThrow(TriggerError);
    }
  });

  test('clauses against the clock and the save', () => {
    const ok = (trigger: string, e: Partial<TriggerEnv> = {}, pig?: PigId) =>
      sceneEligible({ id: 'x', meta: { trigger: parseTrigger(trigger), priority: 10, repeat: false, pig } }, env(e), { heartScene: () => undefined });
    expect(ok('location=communicore,hub')).toBe(true);
    expect(ok('location=hub')).toBe(false);
    expect(ok('location=hub', { location: 'hub' })).toBe(true);
    expect(ok('time=evening; slot=dusk; weekday=fri; month=10; date=10-30; hour=18')).toBe(true);
    expect(ok('slot=night')).toBe(false);
    expect(ok('hearts>=3', {}, 'piggy-2')).toBe(true);
    expect(ok('bond>=3', {}, 'piggy-1')).toBe(false);
    expect(ok('hearts>=1')).toBe(false); // no pig: everyone needs it, piggy-3 has 0
    expect(ok('hearts(piggy-1)>=1; hearts(piggy-3)<1')).toBe(true);
    expect(ok('flag=met_p2; !flag=nope; item=oranges; companion=piggy-2; money>=100; chapter>=2; days=2')).toBe(true);
    expect(ok('companion=none')).toBe(false);
    expect(ok('seen=p1_h1')).toBe(false);
    expect(ok('seen=p1_h1', { save: save({ seenScenes: ['p1_h1'] }) })).toBe(true);
    // Friday dusk: Piggy 2 is at the Communicore, Piggy 1 at the volleyball courts.
    expect(ok('present=piggy-2')).toBe(true);
    expect(ok('present=piggy-1')).toBe(false);
    expect(ok('!present=piggy-1')).toBe(true);
    // At the hub, "present" means with your Kempanion (Piggy 2 → Communicore).
    expect(ok('present=piggy-2', { location: 'hub' })).toBe(true);
    expect(ok('chance=0.6')).toBe(true);
    expect(ok('chance=0.4')).toBe(false);
  });

  test('heart events: hearts ≥ n−1, chapter, previous event seen; plays once unless repeat', () => {
    const meta = (heart: number, extra: object = {}) => ({ pig: 'piggy-2' as PigId, heart, trigger: parseTrigger('location=communicore'), priority: 50, repeat: false, ...extra });
    const heartScene = (_p: PigId, n: number) => `p2_h${n}`;
    const ok = (id: string, m: ReturnType<typeof meta>, e: Partial<TriggerEnv> = {}) => sceneEligible({ id, meta: m }, env(e), { heartScene });
    expect(ok('p2_h1', meta(1))).toBe(true);
    expect(ok('p2_h2', meta(2))).toBe(false); // h1 not seen
    const seen1 = save({ seenScenes: ['p2_h1', 'p2_h2'] });
    expect(ok('p2_h3', meta(3), { save: seen1 })).toBe(true); // 3 hearts ≥ 2, chapter 2
    expect(ok('p2_h3', meta(3), { save: seen1, chapter: 1 })).toBe(false);
    expect(ok('p2_h4', meta(4), { save: save({ seenScenes: ['p2_h1', 'p2_h2', 'p2_h3'] }) })).toBe(true);
    expect(ok('p2_h5', meta(5), { save: save({ seenScenes: ['p2_h1', 'p2_h2', 'p2_h3', 'p2_h4'] }), chapter: 3 })).toBe(false); // needs 4 hearts
    expect(ok('p2_h1', meta(1), { save: seen1 })).toBe(false); // already seen
    expect(ok('p2_h1', meta(1, { repeat: true }), { save: seen1 })).toBe(true);
    expect(ok('p2_h1', { ...meta(1), trigger: undefined } as never)).toBe(false); // no trigger: by id only
    expect(chapterFromDays(1)).toBe(1);
    expect(chapterFromDays(2)).toBe(2);
    expect(chapterFromDays(4)).toBe(3);
    expect(chapterFromDays(6)).toBe(4);
  });

  test('ranking: priority, then companion, then unseen, then file order', () => {
    const mk = (id: string, priority: number, pig?: PigId, repeat = true) => ({ id, meta: { id, pig, trigger: parseTrigger('location=communicore'), priority, repeat } });
    const e = env({ save: save({ seenScenes: ['b'] }) });
    const ranked = rankScenes([mk('a', 10), mk('b', 10), mk('c', 10, 'piggy-1'), mk('d', 10, 'piggy-2'), mk('e', 40)], e, { heartScene: () => undefined });
    expect(ranked.map((s) => s.id)).toEqual(['e', 'd', 'a', 'c', 'b']);
  });
});

// ───────────────────────── interpreter ─────────────────────────

interface Run { log: string[]; store: string[]; flags: Record<string, boolean | number | string>; result: string }

async function run(src: string, opts: { replay?: boolean; choices?: number[]; asks?: (string | null)[]; flags?: Record<string, boolean | number | string>; abortAfter?: number } = {}): Promise<Run> {
  const scenes = parseKScript(src, 'run.ks');
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const log: string[] = [];
  const store: string[] = [];
  const flags: Record<string, boolean | number | string> = { ...opts.flags };
  const facts: Record<string, string> = {};
  const choices = [...(opts.choices ?? [])];
  const asks = [...(opts.asks ?? [])];
  let lines = 0;
  const cond = condState({ flag: (n) => flags[n] });
  const env: VnEnv = {
    async say(l) { lines++; log.push(`${l.speaker}${l.expression ? ` ${l.expression}` : ''}: ${l.text}`); },
    async choose(o) { log.push(`? ${o.join(' | ')}`); return choices.shift() ?? 0; },
    async ask(o) { log.push(`ask ${o.prompt ?? ''}`); return asks.length ? asks.shift()! : null; },
    present(cmd) { log.push(`[${cmd.kind}${'id' in cmd && cmd.id ? ` ${cmd.id}` : ''}]`); },
    async pickCompanion() { return 'piggy-3'; },
    async enterName() { return '  Alex the Great Gator  '; },
    async runMinigame(id, pig, replay) { log.push(`minigame ${id} ${pig}${replay ? ' replay' : ''}`); return { score: 42, won: true, money: 10, bond: 15, fun: 20 }; },
    async chat(pig, prompt, max) { log.push(`chat ${pig} ${prompt ?? ''} ${max ?? ''}`.trim()); },
    async call(id, replay) { return runProgram(byId.get(id)!, env, { replay }); },
    cond,
    text: {
      player: () => 'Alex', companion: () => 'Piggy 2', time: () => '6:30 PM', timeOfDay: () => 'evening', weekday: () => 'Friday',
      fact: (k) => facts[k],
    },
    store: {
      setFlag: (n, v) => { flags[n] = v; store.push(`flag ${n}=${v}`); },
      unsetFlag: (n) => { delete flags[n]; store.push(`unset ${n}`); },
      addBond: (p, n) => store.push(`bond ${p} ${n}`),
      addMoney: (n) => store.push(`money ${n}`),
      give: (i, n) => store.push(`give ${i} ${n}`),
      take: (i, n) => store.push(`take ${i} ${n}`),
      changeNeed: (p, need, n) => store.push(`need ${p} ${need} ${n}`),
      setFact: (k, v, p) => { facts[k] = v; store.push(`fact ${k}=${v}${p ? ` (${p})` : ''}`); },
      setPlayerName: (n) => store.push(`name ${n}`),
      setCompanion: (p) => store.push(`companion ${p}`),
      remember: (p, f) => store.push(`remember ${p} ${f}`),
      unlockOutfit: (p, o) => store.push(`outfit ${p} ${o}`),
      applyMinigame: (id, p, r) => store.push(`minigame ${id} ${p} +${r.money} +${r.bond} +${r.fun}`),
    },
    aborted: () => opts.abortAfter !== undefined && lines >= opts.abortAfter,
  };
  const result = await runProgram(scenes[0], env, { replay: opts.replay });
  return { log, store, flags, result };
}

describe('interpreter', () => {
  const SRC = [
    '=== quiz',
    'pig: piggy-2',
    '---',
    'piggy-2 happy: Hey, {player}! It is {time} on a {weekday}.',
    '? Based.',
    '  [bond piggy-2 +3]',
    '  [set score += 1]',
    '  piggy-2 proud: Patriot.',
    '? What is this place?',
    '  piggy-2 excited: The College of Medicine!',
    '[if flag(score) >= 1]',
    '  piggy-2 shy_blush: You keep coming back here...',
    '[elif bond >= 5]',
    '  piggy-2: Bond five.',
    '[else]',
    '  piggy-2: Anyway.',
    '[endif]',
    '[goto end]',
    'narrator: never shown',
    '*end',
    '[money +20] [give oranges 2]',
    'narrator: Score {flag:score|0}.',
  ].join('\n');

  test('lines, choices, conditions, gotos and effects', async () => {
    const r = await run(SRC, { choices: [0] });
    expect(r.result).toBe('end');
    expect(r.log).toEqual([
      'piggy-2 happy: Hey, Alex! It is 6:30 PM on a Friday.',
      '? Based. | What is this place?',
      'piggy-2 proud: Patriot.',
      'piggy-2 shy_blush: You keep coming back here...',
      'narrator: Score 1.',
    ]);
    expect(r.store).toEqual(['bond piggy-2 3', 'flag score=1', 'money 20', 'give oranges 2']);
  });

  test('other branch: elif with the scene pig', async () => {
    const r = await run(SRC, { choices: [1] });
    expect(r.log).toContain('piggy-2: Bond five.');
    expect(r.log).not.toContain('narrator: never shown');
    expect(r.store).toEqual(['money 20', 'give oranges 2']);
  });

  test('replay mode never touches the save but keeps flags consistent inside the scene', async () => {
    const r = await run(SRC, { choices: [0], replay: true });
    expect(r.store).toEqual([]);
    expect(r.log).toContain('piggy-2 shy_blush: You keep coming back here...');
    expect(r.log.at(-1)).toBe('narrator: Score 1.');
    expect(r.flags.score).toBeUndefined();
  });

  test('choice [if] filters options; nested choices; [end]', async () => {
    const r = await run([
      '=== s', '---',
      '? Ask about Snout [if seen(p2_h4)]', '  narrator: no',
      '? Ask about lunch [if seen(p1_h1)]',
      '  ? Pizza', '    narrator: pizza', '    [end]',
      '  ? Tacos', '    narrator: tacos',
      'narrator: after',
    ].join('\n'), { choices: [0, 0] });
    expect(r.log).toEqual(['? Ask about lunch', '? Pizza | Tacos', 'narrator: pizza']);
  });

  test('a menu whose options are all hidden is skipped', async () => {
    const r = await run('=== s\n---\n? Hidden [if false]\n  narrator: no\nnarrator: yes');
    expect(r.log).toEqual(['narrator: yes']);
  });

  test('interactive hooks: name, companion, input, chat, minigame, outfit, remember', async () => {
    const r = await run([
      '=== s', 'pig: piggy-1', '---',
      '[name]', '[companion pick]', '[companion piggy-1]',
      '[input comfort_food "Comfort food?" "soup"]', '[input major "Major?"]',
      'narrator: {fact:comfort_food|?} / {fact:major|undecided}',
      '[chat piggy-1 "Talk shop, {player}!" 2]',
      '[minigame volley]', '[minigame petals]',
      '[if flag(minigame_won)]', 'narrator: won {flag:minigame_score}', '[endif]',
      '[outfit piggy-1 volleyball]', '[remember all "met at the {weekday} rally"]',
    ].join('\n'), { asks: ['', 'Physics'] });
    expect(r.store).toEqual([
      'name Alex the Gre',
      'companion piggy-3',
      'companion piggy-1',
      'fact comfort_food=soup (piggy-1)',
      'fact major=Physics (piggy-1)',
      'flag minigame_score=42',
      'flag minigame_won=true',
      'minigame volley piggy-1 +10 +15 +20',
      'flag minigame_score=42',
      'flag minigame_won=true',
      'minigame petals piggy-1 +10 +15 +20',
      'outfit piggy-1 volleyball',
      'remember all met at the Friday rally',
    ]);
    expect(r.log).toContain('narrator: soup / Physics');
    expect(r.log).toContain('chat piggy-1 Talk shop, Alex! 2');
    expect(r.log).toContain('minigame volley piggy-1');
    expect(r.log).toContain('narrator: won 42');
  });

  test('replay skips hooks that would change the save', async () => {
    const r = await run('=== s\n---\n[name]\n[companion pick]\n[input x "X?"]\n[chat piggy-2 "hi"]\n[minigame debug]\n[outfit piggy-3 hoodie]\nnarrator: end', { replay: true });
    expect(r.store).toEqual([]);
    expect(r.log).toEqual(['minigame debug piggy-3 replay', '[outfit]', 'narrator: end']);
  });

  test('[brain] goes to the stage between its lines, in album replays too', async () => {
    for (const replay of [false, true]) {
      const r = await run('=== s\n---\nnarrator: a\n[brain]\nnarrator: b\n[brain off]\nnarrator: c', { replay });
      expect(r.log).toEqual(['narrator: a', '[brain]', 'narrator: b', '[brain]', 'narrator: c']);
      expect(r.store).toEqual([]);
    }
  });

  test('[call] plays another scene inline', async () => {
    const r = await run('=== a\n---\nnarrator: a1\n[call b]\nnarrator: a2\n=== b\n---\nnarrator: b1');
    expect(r.log).toEqual(['narrator: a1', 'narrator: b1', 'narrator: a2']);
  });

  test('abort stops at the next step', async () => {
    const r = await run('=== s\n---\nnarrator: 1\nnarrator: 2\nnarrator: 3', { abortAfter: 2 });
    expect(r.result).toBe('aborted');
    expect(r.log).toEqual(['narrator: 1', 'narrator: 2']);
  });

  test('infinite goto loops are caught', async () => {
    await expect(run('=== s\n---\n*a\n[set x = 1]\n[goto a]')).rejects.toThrow(/loops forever/);
  });

  test('unknown expressions fall back to neutral at runtime', async () => {
    const r = await run('=== s\n---\npiggy-1 smug: heh');
    expect(r.log).toEqual(['piggy-1 neutral: heh']);
  });
});

// ───────────────────────── text helpers ─────────────────────────

describe('interpolation', () => {
  const ctx = {
    player: () => 'Alex', companion: () => 'Piggy 3', time: () => '3:42 PM', timeOfDay: () => 'day', weekday: () => 'Thursday',
    fact: (k: string) => (k === 'food' ? 'ramen' : undefined), flag: (n: string) => (n === 'n' ? 3 : undefined),
  };
  test('tokens', () => {
    expect(interpolate('Hi {player}, {companion} says {timeofday} at {time} on {weekday}.', ctx)).toBe('Hi Alex, Piggy 3 says day at 3:42 PM on Thursday.');
    expect(interpolate('{fact:food|soup} / {fact:none|soup} / {fact:none} / {flag:n|0} / {flag:m|0}', ctx)).toBe('ramen / soup /  / 3 / 0');
    expect(interpolate('{{literal}} and {unknown}', ctx)).toBe('{literal} and {unknown}');
    expect(scanTokens('{player} {plyer} {fact:x|y} {flag:z}').map((t) => [t.name, t.known])).toEqual([['player', true], ['plyer', false], ['fact', true], ['flag', true]]);
  });
});

describe('typewriter', () => {
  test('punctuation pauses', () => {
    const s = 'Wait, what? Okay... so—fine… 3.14 is pi. "Done."';
    const at = (needle: string, offset = 0) => pauseAfter(s, s.indexOf(needle) + offset);
    expect(at(',')).toBe(PAUSES.comma);
    expect(at('?')).toBe(PAUSES.stop);
    expect(at('...', 0)).toBe(0);
    expect(at('...', 2)).toBe(PAUSES.ellipsis);
    expect(at('—')).toBe(PAUSES.dash);
    expect(at('…')).toBe(PAUSES.ellipsis);
    expect(at('3.14', 1)).toBe(0);
    expect(at('pi.', 2)).toBe(PAUSES.stop);
    expect(at('Done."', 4)).toBe(PAUSES.stop);
    expect(pauseAfter('Hi.', 2)).toBe(0); // nothing follows the last character
  });

  test('speed and paging', () => {
    expect(msPerChar(40, 40)).toBe(25);
    expect(msPerChar(45, 80)).toBeCloseTo(1000 / 90);
    expect(msPerChar(40, 0)).toBe(0);
    expect(paginate('short')).toEqual(['short']);
    const long = 'One sentence here. '.repeat(12).trim();
    const pages = paginate(long, 80);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((p) => p.length <= 80)).toBe(true);
    expect(pages.join(' ')).toBe(long);
    const word = paginate('x'.repeat(50) + ' ' + 'y'.repeat(50), 60);
    expect(word).toEqual(['x'.repeat(50), 'y'.repeat(50)]);
  });
});

// ───────────────────────── validator ─────────────────────────

describe('validator', () => {
  const issues = (src: string) => validateKScript([{ file: 'v.ks', src }], { backgrounds: ['dorm', 'century_tower'] }).issues.map((i) => `${i.level} ${i.line}: ${i.message}`);

  test('catches references the parser cannot', () => {
    const out = issues([
      '=== v1',
      'title: V',
      'pig: piggy-1',
      '---',
      'piggy-1 happpy: hi',                // 5
      '[bgm piggy1_thme]',                 // 6
      '[sfx oinkk]',                       // 7
      '[bg plaza]',                        // 8 planned → warning
      '[bg nowhere]',                      // 9
      '[give pub_sub 1]',                  // 10
      '[show piggy-1@scrubs happy]',       // 11
      '[minigame chess]',                  // 12
      '[if flag(never_set) && item(oranges) >= 1]', // 13
      '[endif]',
      'narrator: Hi {plyer}!',             // 15
      '[jingle fanfare]',                  // 16
      'narrator: Pepperoni pizza time.',   // 17
      '[call missing_scene]',              // 18
    ].join('\n'));
    expect(out).toEqual([
      'error 5: unknown expression "happpy" (did you mean "happy"?)',
      'error 6: unknown song "piggy1_thme" (did you mean "piggy1_theme"?)',
      'error 7: unknown sfx "oinkk" (did you mean "oink"?)',
      'warning 8: background "plaza" is planned but not painted yet (a placeholder is drawn)',
      'error 9: unknown background "nowhere"',
      'error 10: unknown item "pub_sub" (did you mean "tender_sub"?) (canonical ids: GAME_DESIGN.md §8)',
      'error 11: piggy-1 has no "scrubs" outfit (his are everyday and volleyball)',
      'error 12: unknown mini-game "chess" (volley, perfusion, debug, petals, surgery, xfeed)',
      'warning 13: flag "never_set" is read but no scene sets it (fine if game code sets it)',
      'error 15: unknown text token {plyer} (known: {player} {companion} {time} {timeofday} {weekday} {fact:key|fallback} {flag:name|fallback})',
      'error 16: unknown jingle "fanfare"',
      'warning 17: content rule: no pork food, ever (fine only as a Piggy 2 "no bacon jokes" line)',
      'warning 18: no scene "missing_scene" exists (yet)',
    ]);
  });

  test('cross-file checks: unique ids, heart numbers, trigger references', () => {
    const files = [
      { file: 'a.ks', src: '=== p1_h1\ntitle: A\npig: piggy-1\nheart: 1\ntrigger: location=plaza\n---\nnarrator: a' },
      { file: 'b.ks', src: '=== p1_h1\ntitle: B\n---\nnarrator: b\n=== other\ntitle: O\npig: piggy-1\nheart: 1\ntrigger: location=moon; seen=p1_h9\n---\nnarrator: c' },
    ];
    const out = validateKScript(files, { backgrounds: [] }).issues.map(formatIssue);
    expect(out).toEqual([
      'b.ks:1: error: scene id "p1_h1" is already used in a.ks:1',
      'b.ks:5: error: heart event 1 of piggy-1 must be named "p1_h1" (the bond heart gate looks it up by that id)',
      'b.ks:8: error: piggy-1 already has heart event 1 (p1_h1 in a.ks:1)',
      'b.ks:9: error: unknown location "moon"',
      'b.ks:9: warning: no scene "p1_h9" exists (yet) (did you mean "p1_h1"?)',
    ]);
  });

  test('metadata typos', () => {
    expect(issues('=== m\ntitel: Oops\ntrigerr: location=plaza\nmood: x\n---\nnarrator: hi')).toEqual([
      'warning 1: scene "m" has no title: (the album shows it)',
      'error 2: unknown metadata key "titel" (did you mean "title"?)',
      'error 3: unknown metadata key "trigerr" (did you mean "trigger"?)',
      'warning 4: unknown metadata key "mood: x" (known: title, pig, heart, chapter, trio, ending, trigger, priority, cg, repeat, replayable, summary)',
    ]);
  });

  test('[brain] cues validate clean; a bad one is reported at its line', () => {
    const src = '=== b\ntitle: B\n---\nnarrator: Look up.\n[brain]\nnarrator: That chip.\n[brain off]\n[brain big]\n[brain on off]';
    expect(issues(src)).toEqual([
      'error 8: [brain] must be one of off, on (got "big")',
      'error 9: usage: [brain] or [brain off]',
    ]);
    expect(issues('=== b\ntitle: B\n---\n[if companion = piggy-1]\n  [brain]\n  narrator: Up top.\n[endif]\n[brain off]')).toEqual([]);
  });
});

// ───────────────────────── every scene file on disk ─────────────────────────

const SCENES_DIR = join(import.meta.dir, '..', 'src', 'lib', 'content', 'scenes');
const sceneFiles = readdirSync(SCENES_DIR)
  .filter((f) => f.endsWith('.ks'))
  .sort()
  .map((f) => ({ file: `src/lib/content/scenes/${f}`, src: readFileSync(join(SCENES_DIR, f), 'utf8') }));
const validation = validateKScript(sceneFiles);

describe('scene files (src/lib/content/scenes/*.ks)', () => {
  const warnings = validation.issues.filter((i) => i.level === 'warning');
  if (warnings.length) console.warn(`\nKScript warnings (${warnings.length}):\n${warnings.map(formatIssue).join('\n')}\n`);

  test('found scene files', () => {
    expect(sceneFiles.length).toBeGreaterThan(0);
  });

  for (const f of sceneFiles) {
    test(f.file, () => {
      const errors = validation.issues.filter((i) => i.file === f.file && i.level === 'error').map(formatIssue);
      expect(errors).toEqual([]);
    });
  }

  test('scene ids are unique across files', () => {
    const ids = validation.scenes.map((s: Scene) => s.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
