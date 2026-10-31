import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

/** One id per build: public/sw.js's cache version and offline-manifest.json's `build` are the same string. */
const BUILD_ID = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

/** Stamp public/sw.js's cache version with the build id so every deploy rolls the offline cache. */
function stampServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'kempanion-stamp-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (!existsSync(file)) return;
      writeFileSync(file, readFileSync(file, 'utf8').replace('__KEMPANION_BUILD__', BUILD_ID));
    },
  };
}

/** Packages whose code ships in the browser build (fonts included); their licenses ask for the notice to travel along. */
const BUNDLED = [
  'svelte', 'clsx', 'esm-env', 'devalue',
  '@huggingface/transformers', '@huggingface/transformers-structured-output', '@huggingface/tokenizers', '@huggingface/jinja',
  'onnxruntime-web', 'onnxruntime-common', 'flatbuffers', 'protobufjs', 'long', 'guid-typescript', 'platform',
  '@fontsource/dotgothic16', '@fontsource/pixelify-sans',
];

/** onnxruntime-web's npm package ships no LICENSE file; this is the MIT license of the onnxruntime repository. */
const ONNXRUNTIME_LICENSE = `MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

/**
 * closeBundle also runs after a failed build, before Vite prints the failure: there's no fresh output then (the outDir
 * may not even exist), and an error thrown here (ENOENT writing into it) would be printed instead of the real one.
 */
function noOutput(outDir: string, error?: Error): boolean {
  return !!error || !existsSync(outDir);
}

/** dist/third-party-notices.txt: name, version, license and license text of every bundled package. */
export function thirdPartyNotices(): Plugin {
  let outDir = 'dist';
  let root = '.';
  return {
    name: 'kempanion-third-party-notices',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle(error?: Error) {
      if (noOutput(outDir, error)) return;
      const parts = [
        'Kempanion Online (https://kempanion.online) bundles the open-source software below. Their licenses follow.',
        'Background and CG photo credits: https://github.com/mkieffer1107/kempanion-online/blob/main/art-src/bg/REFERENCES.md',
        '',
      ];
      for (const name of BUNDLED) {
        const dir = resolve(root, 'node_modules', name);
        if (!existsSync(dir)) continue;
        const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
        const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
        const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
        const text = file
          ? readFileSync(resolve(dir, file), 'utf8')
          : name.startsWith('onnxruntime')
            ? ONNXRUNTIME_LICENSE
            : `${pkg.license} license${author ? `, copyright ${author}` : ''}.`;
        parts.push('='.repeat(78), `${pkg.name} ${pkg.version} (${pkg.license})`, '='.repeat(78), text.trim(), '');
      }
      writeFileSync(resolve(outDir, 'third-party-notices.txt'), parts.join('\n'));
    },
  };
}

// ── Offline mode: dist/offline-manifest.json ──
// "Play offline" on the title screen (src/lib/offline.svelte.ts) asks public/sw.js to download every file listed in
// offline-manifest.json: the whole game minus what only Big Brain (the optional on-device LLM) needs. Big Brain is
// found from the bundle graph, not from file names. Vite bundles each worker in a build of its own, and the worker
// build that pulls in the LLM runtime (BIG_BRAIN_PACKAGES) is Big Brain's: everything it emits (its entry, the
// transformers.js and structured-output chunks, ONNX Runtime's .mjs glue and ~27 MB .wasm) stays out unless the
// main app reaches the same file on its own. Whatever the app reaches from index.html (static and dynamic imports,
// CSS, fonts, other workers such as the audio worklet) stays in, and so does every public/ file but OFFLINE_SKIP.
// Fonts keep only their .woff2: each @font-face lists it before the .woff, and every browser that runs this es2022
// build reads woff2, so the .woff fallbacks are never fetched.

/** npm packages that make up the on-device LLM runtime: a worker that bundles any of them is Big Brain's. */
export const BIG_BRAIN_PACKAGES = [
  '@huggingface/transformers', '@huggingface/transformers-structured-output', '@huggingface/tokenizers',
  '@huggingface/jinja', 'onnxruntime-web', 'onnxruntime-common',
];

export function isBigBrainModule(id: string): boolean {
  const path = id.replace(/\\/g, '/');
  return BIG_BRAIN_PACKAGES.some((p) => path.includes(`/node_modules/${p}/`) || path.startsWith(`node_modules/${p}/`));
}

/** What the manifest needs to know about one emitted file (an output chunk or asset). */
export interface BuiltFile {
  fileName: string;
  /** Chunks: an entry point of its build. */
  isEntry?: boolean;
  /** Files it loads: static and dynamic imports, imported CSS and assets (fonts, worker entries, wasm…). */
  refs: string[];
  /** Chunks: the source modules bundled into it. */
  moduleIds?: string[];
  /** Assets: the source files it was emitted from (fonts: node_modules/@fontsource/…/x.woff). */
  sources?: string[];
}

/** One worker bundle. Vite builds each worker on its own and emits its files into the main build as assets. */
export interface WorkerBuild {
  entry: string;
  files: BuiltFile[];
}

type Output = import('vite').Rollup.OutputChunk | import('vite').Rollup.OutputAsset;

function toBuiltFile(f: Output): BuiltFile {
  if (f.type === 'chunk') {
    const meta = (f as { viteMetadata?: { importedCss?: Set<string>; importedAssets?: Set<string> } }).viteMetadata;
    return {
      fileName: f.fileName,
      isEntry: f.isEntry,
      refs: [...f.imports, ...f.dynamicImports, ...(meta?.importedCss ?? []), ...(meta?.importedAssets ?? [])],
      moduleIds: [...f.moduleIds],
    };
  }
  return { fileName: f.fileName, refs: [], sources: [...((f as { originalFileNames?: string[] }).originalFileNames ?? [])] };
}

export interface OfflineSplit {
  /** Files of the main build the game needs offline, entry first. */
  game: string[];
  /** Files only Big Brain needs. */
  bigBrain: string[];
  /** .woff fallbacks of fonts that also ship a .woff2. */
  woffFallbacks: string[];
  /** In `game` although nothing reached them from an entry (kept to be safe; the build log names them). */
  unreached: string[];
}

/**
 * Split the main build's files (worker files included, as Vite emits them there) into the offline set and Big Brain.
 * `hasWoff2Twin` says whether a .woff asset's font also ships as .woff2.
 */
export function splitOfflineFiles(main: BuiltFile[], workers: WorkerBuild[], hasWoff2Twin: (f: BuiltFile) => boolean): OfflineSplit {
  const nodes = new Map(main.map((f) => [f.fileName, f]));
  for (const w of workers) for (const f of w.files) nodes.set(f.fileName, f); // worker files carry their own refs
  const bigBrainWorkers = workers.filter((w) => w.files.some((f) => f.moduleIds?.some(isBigBrainModule)));
  const bigBrainEntries = new Set(bigBrainWorkers.map((w) => w.entry));

  // Everything the app reaches from its entry points (breadth first), without stepping into Big Brain's worker.
  const reached = new Set<string>();
  const roots = main.filter((f) => f.isEntry || f.fileName.endsWith('.html'));
  const queue = [...roots.filter((f) => f.fileName.endsWith('.html')), ...roots.filter((f) => !f.fileName.endsWith('.html'))].map((f) => f.fileName);
  while (queue.length) {
    const name = queue.shift()!;
    if (reached.has(name) || bigBrainEntries.has(name)) continue;
    reached.add(name);
    queue.push(...(nodes.get(name)?.refs ?? []));
  }

  const inMain = new Set(main.map((f) => f.fileName));
  const bigBrain = new Set<string>();
  for (const w of bigBrainWorkers) for (const f of w.files) if (!reached.has(f.fileName) && inMain.has(f.fileName)) bigBrain.add(f.fileName);
  const woffFallbacks = main.filter((f) => f.fileName.endsWith('.woff') && hasWoff2Twin(f)).map((f) => f.fileName);
  const dropped = new Set([...bigBrain, ...woffFallbacks]);
  const keep = (name: string) => inMain.has(name) && !dropped.has(name) && !name.endsWith('.map');
  const game = [...reached].filter(keep);
  const unreached = main.map((f) => f.fileName).filter((n) => keep(n) && !reached.has(n));
  return { game: [...game, ...unreached], bigBrain: [...bigBrain], woffFallbacks, unreached };
}

/** Files outside the bundle (public/ copies, generated extras) that are never part of the offline set, and why. */
export const OFFLINE_SKIP: { why: string; test: (path: string) => boolean }[] = [
  { why: 'the service worker script itself (the browser keeps it)', test: (p) => p === 'sw.js' },
  { why: 'this list (the service worker keeps its own copy)', test: (p) => p === 'offline-manifest.json' },
  { why: 'license notices for the repo; the game only names the URL', test: (p) => p === 'third-party-notices.txt' },
  { why: 'link-preview media for chat apps (og:image / og:video)', test: (p) => p.startsWith('og/') },
  { why: 'hosting and OS files', test: (p) => p === 'CNAME' || p.split('/').some((s) => s.startsWith('.')) },
  { why: 'source maps', test: (p) => p.endsWith('.map') },
];

export interface OfflineEntry {
  /** Path relative to the site root, as the service worker resolves it against its scope. */
  path: string;
  size: number;
  /** First 16 hex digits of the file's SHA-256 (downloads and deploy carry-over are checked against it). */
  hash: string;
  /** Content-hashed build file: a URL that never changes content. */
  immutable?: true;
}

export interface OfflineManifest {
  build: string;
  /** Total size of `files`. */
  bytes: number;
  files: OfflineEntry[];
  /** Big Brain's files in this build: never downloaded by "Play offline", but a player's copies survive deploys. */
  bigBrain: string[];
}

export function sha16(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
}

function walk(dir: string, base = dir, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else if (e.isFile()) out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

/** The manifest for a written build: `split` decides bundle files, OFFLINE_SKIP the rest of outDir. */
export function buildOfflineManifest(outDir: string, build: string, bundle: Set<string>, split: OfflineSplit): OfflineManifest {
  const order = new Map(split.game.map((name, i) => [name, i]));
  const game = new Set(split.game);
  const paths = walk(outDir).filter((p) => (bundle.has(p) ? game.has(p) : !OFFLINE_SKIP.some((s) => s.test(p))));
  // shell and entry first, then the rest of the bundle in reach order, then public/ files by path: a download that
  // stops half-way still holds a game that boots
  const rank = (p: string) => order.get(p) ?? Number.MAX_SAFE_INTEGER;
  paths.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
  const files = paths.map((path): OfflineEntry => {
    const data = readFileSync(resolve(outDir, path));
    const entry: OfflineEntry = { path, size: data.length, hash: sha16(data) };
    if (bundle.has(path) && !path.endsWith('.html')) entry.immutable = true;
    return entry;
  });
  return { build, bytes: files.reduce((n, f) => n + f.size, 0), files, bigBrain: [...split.bigBrain].sort() };
}

/** The plugin for the main build, plus one that records each worker build's own graph (worker.plugins). */
export function offlineManifest(): { plugin: Plugin; workerPlugin: () => Plugin } {
  const workers = new Map<string, WorkerBuild>();
  let main: BuiltFile[] = [];
  let root = '.';
  let outDir = 'dist';
  let logger: import('vite').Logger | null = null;
  const workerPlugin = (): Plugin => ({
    name: 'kempanion-offline-worker-graph',
    generateBundle(_options, bundle) {
      const files = Object.values(bundle).map(toBuiltFile);
      const entry = files.find((f) => f.isEntry);
      if (entry) workers.set(entry.fileName, { entry: entry.fileName, files });
    },
  });
  const plugin: Plugin = {
    name: 'kempanion-offline-manifest',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
      logger = config.logger;
    },
    writeBundle(_options, bundle) {
      main = Object.values(bundle).map(toBuiltFile); // every plugin's files are in by now (index.html, worker assets)
    },
    closeBundle(error?: Error) {
      if (!main.length || noOutput(outDir, error)) return;
      const woff2 = new Set(main.filter((f) => f.fileName.endsWith('.woff2')).flatMap((f) => f.sources ?? []));
      const hasWoff2Twin = (f: BuiltFile) =>
        (f.sources ?? []).some((s) => woff2.has(`${s}2`) || existsSync(resolve(root, `${s}2`)));
      const split = splitOfflineFiles(main, [...workers.values()], hasWoff2Twin);
      const manifest = buildOfflineManifest(outDir, BUILD_ID, new Set(main.map((f) => f.fileName)), split);
      writeFileSync(resolve(outDir, 'offline-manifest.json'), JSON.stringify(manifest));

      // Safety nets: Big Brain code must not slip into the set, and the set must fit the service worker's cache.
      const listed = new Set(manifest.files.map((f) => f.path));
      for (const f of main) {
        if (listed.has(f.fileName) && [...(f.moduleIds ?? []), ...(f.sources ?? [])].some(isBigBrainModule)) {
          logger?.warn(`offline-manifest.json: ${f.fileName} carries Big Brain code but is in the offline set`);
        }
      }
      const sw = resolve(outDir, 'sw.js');
      const max = existsSync(sw) ? Number(/\bMAX_ENTRIES\s*=\s*(\d+)/.exec(readFileSync(sw, 'utf8'))?.[1]) : 0;
      if (max && manifest.files.length + manifest.bigBrain.length + 50 > max) {
        throw new Error(`offline-manifest.json lists ${manifest.files.length} files: raise MAX_ENTRIES (${max}) in public/sw.js`);
      }
      const size = (paths: string[]) => paths.reduce((n, p) => n + (existsSync(resolve(outDir, p)) ? statSync(resolve(outDir, p)).size : 0), 0);
      const mb = (n: number) => `${(n / 1e6).toFixed(2)} MB`;
      if (split.unreached.length) logger?.warn(`offline-manifest.json: kept ${split.unreached.length} files nothing imports: ${split.unreached.join(', ')}`);
      logger?.info(
        `offline-manifest.json: ${manifest.files.length} files, ${mb(manifest.bytes)} for "Play offline" ` +
          `(left out: Big Brain ${manifest.bigBrain.length} files ${mb(size(manifest.bigBrain))}, ` +
          `${split.woffFallbacks.length} .woff fallbacks ${mb(size(split.woffFallbacks))})`,
      );
    },
  };
  return { plugin, workerPlugin };
}

const offline = offlineManifest();

// Static build for GitHub Pages: relative base, so it works at the custom domain's root and under /<repo>/.
export default defineConfig({
  base: './',
  plugins: [svelte(), stampServiceWorker(), thirdPartyNotices(), offline.plugin],
  worker: { format: 'es', plugins: () => [offline.workerPlugin()] },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 2048,
  },
});
