// The owner's call: the game never names the tutoring business Piggy 3 used to work at. He "used to tutor math",
// "tutored math at a tutoring center", "back when I tutored math", and that is all the game says. This guard fails when
// the name shows up in anything a player (or the Big Brain model) can read: line banks, scenes, thoughts, prompts, UI,
// mini-games, the character files and the docs.
//
// Directories are walked recursively, so a new folder or a new mini-game is covered the moment it exists. The one allowed
// place is intents.ts, which still RECOGNIZES the word when a player types it (so "<name>?" reaches his job topic): it
// may match the word, never say it. Tests may mention the name, to forbid it, so tests/ is not scanned.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const NAME = /mathnasium/i;
const FIX = 'never name the tutoring business: say he "used to tutor math", "tutored math at a tutoring center" or "back when I tutored math"';

/** Game content: everything the player or the Big Brain model can read. Each root is a directory (walked recursively) or a file. */
const GAME_CONTENT = [
  'src/lib/content', // scenes (.ks), locations, characters, icons
  'src/lib/ai/heuristic', // the chat line banks, idle lines, topics (intents.ts: see INPUT_MATCHERS)
  'src/lib/pet', // pet lines, welcome, achievements, wants, the thought bank
  'src/lib/minigames', // every mini-game, new ones included
  'src/lib/ui', // screens, hub, location, settings, overlays, labels
  'characters', // piggy-N.md: the profiles and the Big Brain prompts
  'src/generated/characters.json', // built from them by `bun run gen`
];
/** The rest of what ships or is public: the other source (prompts, engine, state, ...) and the docs. */
const ELSEWHERE = ['src', 'docs', 'README.md', 'index.html'];
/** Files that may recognize the word in what a player TYPES (a regex alternative, never said: see the last test). */
const INPUT_MATCHERS = ['src/lib/ai/heuristic/intents.ts'];

const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|ogg|mp3|wav|mid|woff2?|ttf|otf|wasm|onnx|bin|mp4|webm|zip|gz)$|(?:^|\/)\.DS_Store$/i;

/** Every file under `rel` (a file or a directory), as repo-relative paths with forward slashes. */
function filesUnder(rel: string): string[] {
  let stat;
  try {
    stat = statSync(join(ROOT, rel));
  } catch {
    return [];
  }
  if (!stat.isDirectory()) return [rel];
  return readdirSync(join(ROOT, rel)).sort().flatMap((entry) => filesUnder(`${rel}/${entry}`));
}

function read(file: string): string {
  try {
    return readFileSync(join(ROOT, file), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ''; // deleted while the tests ran
    throw e;
  }
}

/** The words around the first mention in a line (some lines are thousands of characters long). */
function around(line: string): string {
  const m = NAME.exec(line)!;
  return `…${line.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).trim()}…`;
}

/** Where the name shows up in these files (and in their names): "path:line: …context…". */
function mentions(files: string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    if (NAME.test(file)) hits.push(`${file}: the file name`);
    if (BINARY.test(file)) continue;
    read(file).split('\n').forEach((line, i) => {
      if (NAME.test(line)) hits.push(`${file}:${i + 1}: ${around(line)}`);
    });
  }
  return hits;
}

const withoutMatchers = (files: string[]) => files.filter((f) => !INPUT_MATCHERS.includes(f));
const covered = new Set(GAME_CONTENT.flatMap(filesUnder));

describe('the tutoring business is never named in the game', () => {
  test('the scan really sees the game content (a guard that finds no files would pass by accident)', () => {
    for (const root of [...GAME_CONTENT, ...ELSEWHERE]) expect([root, filesUnder(root).length > 0]).toEqual([root, true]);
    for (const file of ['src/lib/ai/heuristic/lines/piggy3.ts', 'characters/piggy-3.md', 'src/generated/characters.json']) {
      expect([file, covered.has(file)]).toEqual([file, true]);
    }
    expect(covered.size).toBeGreaterThan(100);
  });

  for (const root of GAME_CONTENT) {
    test(`game content: ${root}`, () => {
      expect(mentions(withoutMatchers(filesUnder(root))), FIX).toEqual([]);
    });
  }

  test('the rest of the source and the docs do not name it either', () => {
    expect(mentions(withoutMatchers(ELSEWHERE.flatMap(filesUnder)).filter((f) => !covered.has(f))), FIX).toEqual([]);
  });

  test('the input matchers only recognize the word in what a player types: a regex alternative, never a comment or a string', () => {
    const bad: string[] = [];
    for (const file of INPUT_MATCHERS) {
      read(file).split('\n').forEach((line, i) => {
        if (!NAME.test(line)) return;
        const comment = /^\s*(?:\/\/|\/\*|\*)/.test(line);
        const stray = NAME.test(line.replace(/\\bmathnasium\\b/gi, '')); // anything but the regex form \bword\b
        if (comment || stray) bad.push(`${file}:${i + 1}: ${around(line)}`);
      });
    }
    expect(bad, 'it may only match the word inside a regex (\\bword\\b); reword any comment, never put it in a string').toEqual([]);
  });
});
