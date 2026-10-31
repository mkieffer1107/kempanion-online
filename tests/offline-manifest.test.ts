// offline-manifest.json (vite.config.ts): which build files "Play offline" downloads. Big Brain's worker graph stays
// out, the rest of the app graph and public/ stay in. The last block checks a real dist/ when a build is there (CI
// builds before it tests).
import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import {
  buildOfflineManifest, isBigBrainModule, OFFLINE_SKIP, offlineManifest, sha16, splitOfflineFiles, thirdPartyNotices,
  type BuiltFile, type OfflineManifest, type WorkerBuild,
} from '../vite.config';

const ROOT = '/repo';
const nm = (p: string) => `${ROOT}/node_modules/${p}`;

/** The shape of the real build (see vite.config.ts): main graph + the LLM worker's and the audio worklet's builds. */
function fixture() {
  const main: BuiltFile[] = [
    {
      fileName: 'assets/index-A1.js', isEntry: true,
      refs: ['assets/models-B1.js', 'assets/songs-C1.js', 'assets/manager-D1.js', 'assets/index-E1.css', 'assets/worklet-F1.js',
        'assets/dot-0-G1.woff2', 'assets/dot-0-G2.woff', 'assets/dot-1-G3.woff'],
      moduleIds: [`${ROOT}/src/main.ts`, `${ROOT}/src/lib/ai/index.ts`, nm('svelte/src/index-client.js')],
    },
    { fileName: 'index.html', refs: [] },
    { fileName: 'assets/models-B1.js', refs: [], moduleIds: [`${ROOT}/src/lib/ai/models.ts`] },
    { fileName: 'assets/songs-C1.js', refs: ['assets/index-A1.js'], moduleIds: [`${ROOT}/src/lib/audio/songs/index.ts`] },
    // Big Brain's main-thread manager: part of the app graph (Settings → Brain), but its worker is not
    { fileName: 'assets/manager-D1.js', refs: ['assets/models-B1.js', 'assets/llm.worker-W1.js'], moduleIds: [`${ROOT}/src/lib/ai/manager.svelte.ts`] },
    { fileName: 'assets/index-E1.css', refs: [] },
    { fileName: 'assets/dot-0-G1.woff2', refs: [], sources: ['node_modules/@fontsource/dot/files/dot-0.woff2'] },
    { fileName: 'assets/dot-0-G2.woff', refs: [], sources: ['node_modules/@fontsource/dot/files/dot-0.woff'] },
    // its woff2 twin was small enough to be inlined into the CSS
    { fileName: 'assets/dot-1-G3.woff', refs: [], sources: ['node_modules/@fontsource/dot/files/dot-1.woff'] },
    // a woff with no woff2 twin stays
    { fileName: 'assets/old-H1.woff', refs: [], sources: ['node_modules/old/old.woff'] },
    // worker outputs, emitted into the main build as assets
    { fileName: 'assets/worklet-F1.js', refs: [] },
    { fileName: 'assets/llm.worker-W1.js', refs: [] },
    { fileName: 'assets/transformers.web-W2.js', refs: [] },
    { fileName: 'assets/dist-W3.js', refs: [] },
    { fileName: 'assets/ort-wasm-simd-threaded.asyncify-W4.wasm', refs: [] },
    { fileName: 'assets/ort-wasm-simd-threaded.asyncify-W5.mjs', refs: [] },
    { fileName: 'assets/orphan-Z1.js', refs: [] },
  ];
  const workers: WorkerBuild[] = [
    {
      entry: 'assets/llm.worker-W1.js',
      files: [
        {
          fileName: 'assets/llm.worker-W1.js', isEntry: true,
          refs: ['assets/transformers.web-W2.js', 'assets/dist-W3.js', 'assets/ort-wasm-simd-threaded.asyncify-W4.wasm', 'assets/ort-wasm-simd-threaded.asyncify-W5.mjs'],
          moduleIds: [`${ROOT}/src/lib/ai/llm.worker.ts`, `${ROOT}/src/lib/ai/llm-engine.ts`, `${nm('onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm')}?url`],
        },
        { fileName: 'assets/transformers.web-W2.js', refs: ['assets/ort-wasm-simd-threaded.asyncify-W4.wasm'], moduleIds: [nm('@huggingface/transformers/dist/transformers.web.js'), nm('onnxruntime-common/dist/esm/index.js')] },
        { fileName: 'assets/dist-W3.js', refs: ['assets/transformers.web-W2.js'], moduleIds: [nm('@huggingface/transformers-structured-output/dist/index.js')] },
        { fileName: 'assets/ort-wasm-simd-threaded.asyncify-W4.wasm', refs: [], sources: ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm'] },
        { fileName: 'assets/ort-wasm-simd-threaded.asyncify-W5.mjs', refs: [], sources: ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs'] },
      ],
    },
    { entry: 'assets/worklet-F1.js', files: [{ fileName: 'assets/worklet-F1.js', isEntry: true, refs: [], moduleIds: [`${ROOT}/src/lib/audio/worklet.ts`] }] },
  ];
  const woff2Twins = new Set(['node_modules/@fontsource/dot/files/dot-0.woff', 'node_modules/@fontsource/dot/files/dot-1.woff']);
  const hasTwin = (f: BuiltFile) => (f.sources ?? []).some((s) => woff2Twins.has(s));
  return { main, workers, hasTwin };
}

describe('offline manifest: what "Play offline" downloads', () => {
  test('Big Brain modules are recognised by package, on any path layout', () => {
    expect(isBigBrainModule(nm('@huggingface/transformers/dist/transformers.web.js'))).toBe(true);
    expect(isBigBrainModule(nm('@huggingface/transformers-structured-output/dist/index.js'))).toBe(true);
    expect(isBigBrainModule(`${nm('onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm')}?url`)).toBe(true);
    expect(isBigBrainModule('C:\\repo\\node_modules\\onnxruntime-common\\dist\\esm\\index.js')).toBe(true);
    expect(isBigBrainModule('/r/node_modules/.pnpm/x/node_modules/@huggingface/jinja/dist/index.js')).toBe(true);
    expect(isBigBrainModule('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm')).toBe(true);
    expect(isBigBrainModule(`${ROOT}/src/lib/ai/models.ts`)).toBe(false);
    expect(isBigBrainModule(`${ROOT}/src/lib/ai/llm.worker.ts`)).toBe(false); // the worker is found by what it bundles
    expect(isBigBrainModule(nm('svelte/src/index-client.js'))).toBe(false);
    expect(isBigBrainModule(nm('@huggingface/transformers-like/x.js'))).toBe(false);
  });

  test('the LLM worker and everything only it loads are left out; the app graph stays', () => {
    const { main, workers, hasTwin } = fixture();
    const split = splitOfflineFiles(main, workers, hasTwin);
    expect(split.bigBrain.sort()).toEqual([
      'assets/dist-W3.js', 'assets/llm.worker-W1.js', 'assets/ort-wasm-simd-threaded.asyncify-W4.wasm',
      'assets/ort-wasm-simd-threaded.asyncify-W5.mjs', 'assets/transformers.web-W2.js',
    ]);
    // shell first, then the entry and what it reaches (the main-thread Big Brain manager and the audio worklet too)
    expect(split.game.slice(0, 2)).toEqual(['index.html', 'assets/index-A1.js']);
    for (const f of ['assets/models-B1.js', 'assets/songs-C1.js', 'assets/manager-D1.js', 'assets/index-E1.css', 'assets/worklet-F1.js', 'assets/dot-0-G1.woff2']) {
      expect(split.game).toContain(f);
    }
    for (const f of split.bigBrain) expect(split.game).not.toContain(f);
    // .woff fallbacks of fonts that ship a .woff2 (as a file or inlined) are never fetched
    expect(split.woffFallbacks.sort()).toEqual(['assets/dot-0-G2.woff', 'assets/dot-1-G3.woff']);
    expect(split.game).not.toContain('assets/dot-0-G2.woff');
    // nothing imports these, but they're kept (and logged) to be safe
    expect(split.unreached.sort()).toEqual(['assets/old-H1.woff', 'assets/orphan-Z1.js']);
    expect(split.game).toContain('assets/orphan-Z1.js');
  });

  test('a file Big Brain shares with the app stays in the set', () => {
    const { main, workers, hasTwin } = fixture();
    // the app also loads ORT's glue by itself (say, a feature check): it's no longer Big Brain-only
    main[0].refs.push('assets/ort-wasm-simd-threaded.asyncify-W5.mjs');
    const split = splitOfflineFiles(main, workers, hasTwin);
    expect(split.game).toContain('assets/ort-wasm-simd-threaded.asyncify-W5.mjs');
    expect(split.bigBrain).not.toContain('assets/ort-wasm-simd-threaded.asyncify-W5.mjs');
    expect(split.bigBrain).toContain('assets/ort-wasm-simd-threaded.asyncify-W4.wasm');
  });

  test('a worker without the LLM runtime is not Big Brain', () => {
    const { main, workers, hasTwin } = fixture();
    const split = splitOfflineFiles(main, workers.filter((w) => w.entry !== 'assets/llm.worker-W1.js'), hasTwin);
    // with no worker graph to go on, nothing is dropped as Big Brain (the build log would name the unreached files)
    expect(split.bigBrain).toEqual([]);
    expect(split.game).toContain('assets/worklet-F1.js');
  });

  test('the manifest lists sizes, SHA-256 prefixes and immutability, skips non-game files, shell first', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kp-offline-'));
    try {
      const files: Record<string, string> = {
        'index.html': '<!doctype html>',
        'assets/index-A1.js': 'console.log(1)',
        'assets/llm.worker-W1.js': 'big brain',
        'assets/bg/title.png': 'png bytes',
        'assets/audio/kempa_synth.wasm': 'wasm',
        'icons/icon-192.png': 'icon',
        'manifest.webmanifest': '{}',
        'sw.js': 'self',
        'offline-manifest.json': '{}',
        'third-party-notices.txt': 'licenses',
        'og/kempanion-sakura-v1.mp4': 'video',
        'assets/.DS_Store': 'mac',
        'assets/index-A1.js.map': '{}',
      };
      for (const [p, body] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, p)), { recursive: true });
        writeFileSync(join(dir, p), body);
      }
      const bundle = new Set(['index.html', 'assets/index-A1.js', 'assets/llm.worker-W1.js', 'assets/index-A1.js.map']);
      const split = { game: ['index.html', 'assets/index-A1.js'], bigBrain: ['assets/llm.worker-W1.js'], woffFallbacks: [], unreached: [] };
      const m = buildOfflineManifest(dir, 'B42', bundle, split);
      expect(m.build).toBe('B42');
      expect(m.files.map((f) => f.path)).toEqual([
        'index.html', 'assets/index-A1.js', // bundle in reach order
        'assets/audio/kempa_synth.wasm', 'assets/bg/title.png', 'icons/icon-192.png', 'manifest.webmanifest', // public/ by path
      ]);
      const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
      for (const f of m.files) {
        expect(f.size).toBe(Buffer.byteLength(files[f.path]));
        expect(f.hash).toBe(sha(files[f.path]));
      }
      expect(m.files.find((f) => f.path === 'assets/index-A1.js')?.immutable).toBe(true);
      expect(m.files.find((f) => f.path === 'index.html')?.immutable).toBeUndefined();
      expect(m.files.find((f) => f.path === 'assets/bg/title.png')?.immutable).toBeUndefined();
      expect(m.bytes).toBe(m.files.reduce((n, f) => n + f.size, 0));
      expect(m.bigBrain).toEqual(['assets/llm.worker-W1.js']);
      for (const p of ['sw.js', 'offline-manifest.json', 'third-party-notices.txt', 'og/kempanion-sakura-v1.mp4', 'assets/.DS_Store', 'CNAME']) {
        expect(OFFLINE_SKIP.some((s) => s.test(p))).toBe(true);
      }
      expect(sha16(new TextEncoder().encode('png bytes'))).toBe(sha('png bytes'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// closeBundle runs after a failed build too, before Vite prints the failure: writing third-party-notices.txt or the
// manifest into an outDir the build never made threw ENOENT, and Vite printed that instead of the real error.
describe('a failed build', () => {
  test('the notices and manifest plugins leave an outDir the build never wrote alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kp-failed-'));
    const outDir = join(dir, 'dist');
    try {
      const notices = thirdPartyNotices();
      const manifest = offlineManifest().plugin;
      const config = { root: join(import.meta.dir, '..'), build: { outDir }, logger: null };
      for (const p of [notices, manifest]) (p.configResolved as (c: unknown) => void)(config);
      // as if the bundle had been handed over for writing before the failure
      (manifest.writeBundle as (o: unknown, b: unknown) => void)({}, { 'index.html': { type: 'asset', fileName: 'index.html', originalFileNames: [] } });
      expect(() => (notices.closeBundle as () => void)()).not.toThrow();
      expect(() => (manifest.closeBundle as () => void)()).not.toThrow();
      expect(existsSync(outDir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("reports the build's own error", async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kp-failed-'));
    try {
      writeFileSync(join(dir, 'index.html'), '<!doctype html><script type="module" src="./main.js"></script>');
      writeFileSync(join(dir, 'main.js'), 'export const = 1;\n'); // a syntax error
      const { build } = await import('vite');
      let error: unknown = null;
      try {
        await build({
          configFile: false, root: dir, logLevel: 'silent',
          plugins: [thirdPartyNotices(), offlineManifest().plugin],
          build: { outDir: join(dir, 'dist') },
        });
      } catch (e) {
        error = e;
      }
      const text = String((error as Error | null)?.message ?? error);
      expect(error).not.toBeNull();
      expect(text).not.toContain('ENOENT');
      expect(text).toMatch(/PARSE_ERROR|Unexpected|main\.js/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── the real build, when there is one (KEMPANION_DIST=<dir> checks another build output) ──
const DIST = process.env.KEMPANION_DIST || join(import.meta.dir, '../dist');
const MANIFEST = join(DIST, 'offline-manifest.json');

function walk(dir: string, base = dir, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

describe.skipIf(!existsSync(MANIFEST))('offline manifest of dist/ (after a build)', () => {
  const m = existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as OfflineManifest) : null!;

  test('every listed file exists with its size and hash; the build id matches the service worker', () => {
    for (const f of m.files) {
      const data = readFileSync(join(DIST, f.path));
      expect(data.length).toBe(f.size);
      expect(sha16(data)).toBe(f.hash);
    }
    expect(m.bytes).toBe(m.files.reduce((n, f) => n + f.size, 0));
    expect(readFileSync(join(DIST, 'sw.js'), 'utf8')).toContain(`const VERSION = '${m.build}'`);
  });

  test('the whole game is in: shell, code, CSS, fonts, synth, every background, CG and sprite', () => {
    const listed = new Set(m.files.map((f) => f.path));
    expect(m.files[0].path).toBe('index.html');
    expect(listed.has('manifest.webmanifest')).toBe(true);
    expect(listed.has('assets/audio/kempa_synth.wasm')).toBe(true);
    expect([...listed].some((p) => /^assets\/index-[\w-]+\.js$/.test(p))).toBe(true);
    expect([...listed].some((p) => /^assets\/index-[\w-]+\.css$/.test(p))).toBe(true);
    expect([...listed].some((p) => /^assets\/worklet-[\w-]+\.js$/.test(p))).toBe(true);
    expect([...listed].filter((p) => p.endsWith('.woff2')).length).toBeGreaterThan(50);
    const pub = join(import.meta.dir, '../public');
    for (const p of walk(join(pub, 'assets'))) {
      if (p.split('/').some((s) => s.startsWith('.'))) continue;
      expect(listed.has(`assets/${p}`)).toBe(true);
    }
    for (const dir of ['icons', 'cursors']) for (const p of walk(join(pub, dir))) expect(listed.has(`${dir}/${p}`)).toBe(true);
  });

  test("Big Brain's runtime, link previews, notices and the worker script are out", () => {
    for (const f of m.files) {
      expect(f.path).not.toMatch(/ort-wasm|transformers\.web|llm\.worker|^og\/|^sw\.js$|third-party-notices|offline-manifest/);
    }
    expect(m.bigBrain.some((p) => /ort-wasm-simd-threaded[^/]*\.wasm$/.test(p))).toBe(true);
    expect(m.bigBrain.some((p) => /llm\.worker-/.test(p))).toBe(true);
    for (const p of m.bigBrain) expect(existsSync(join(DIST, p))).toBe(true);
    // the set is the game, not the model runtime: well under the ~27 MB ONNX Runtime wasm alone
    const bigBrainBytes = m.bigBrain.reduce((n, p) => n + statSync(join(DIST, p)).size, 0);
    expect(bigBrainBytes).toBeGreaterThan(m.bytes);
    expect(m.bytes).toBeLessThan(25e6);
  });

  test('the set fits the service worker cache', () => {
    const max = Number(/\bMAX_ENTRIES\s*=\s*(\d+)/.exec(readFileSync(join(DIST, 'sw.js'), 'utf8'))?.[1]);
    expect(m.files.length + m.bigBrain.length + 50).toBeLessThanOrEqual(max);
  });

  test('what is neither listed, Big Brain nor skipped is a .woff fallback of a font that ships a .woff2', () => {
    const listed = new Set([...m.files.map((f) => f.path), ...m.bigBrain]);
    const rest = walk(DIST).filter((p) => !listed.has(p) && !OFFLINE_SKIP.some((s) => s.test(p)));
    const base = (p: string) => p.replace(/-[\w-]{8}\.woff2?$/, '');
    const woff2 = new Set(m.files.filter((f) => f.path.endsWith('.woff2')).map((f) => base(f.path)));
    const css = m.files.filter((f) => f.path.endsWith('.css')).map((f) => readFileSync(join(DIST, f.path), 'utf8')).join('\n');
    for (const p of rest) {
      expect(p).toMatch(/^assets\/[^/]+\.woff$/);
      // its woff2 twin is in the set, or was small enough to be inlined into the CSS
      expect(woff2.has(base(p)) || css.includes('data:font/woff2')).toBe(true);
    }
  });
});
