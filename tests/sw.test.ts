// public/sw.js in a mocked service-worker environment (no browser needed), and the page side that follows it
// (src/lib/offline.svelte.ts) in a mocked page.
import { plugin } from 'bun';
import { describe, expect, setSystemTime, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileModule } from 'svelte/compiler';
import { sha16 } from '../vite.config';

// offline.svelte.ts is a Svelte rune module (.svelte.ts): compile it the way Vite does.
plugin({
  name: 'svelte-rune-modules',
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text());
      return { contents: compileModule(js, { filename: path, generate: 'client' }).js.code, loader: 'js' };
    });
  },
});
const { OfflineMode, STALL_MS, TOP_UP_DELAY_MS, WAKE_GAP_MS } = await import('../src/lib/offline.svelte');

const CODE = readFileSync(join(import.meta.dir, '../public/sw.js'), 'utf8');
const SCOPE = 'https://user.github.io/kempanion/';
type Handler = (ev: any) => void;
type Store = Map<string, Map<string, Response>>;
const realSetTimeout = globalThis.setTimeout;

/** The worker's source with a few knobs turned (tests only: no backoff waits, other build id, small cache, timeout). */
function code(opts: { version?: string; tries?: number; maxEntries?: number; fetchTimeout?: number } = {}): string {
  let src = CODE.replace('400 * attempt * attempt', '0');
  if (opts.version) src = src.replace("'__KEMPANION_BUILD__'", `'${opts.version}'`);
  if (opts.tries) src = src.replace('const PRECACHE_TRIES = 3;', `const PRECACHE_TRIES = ${opts.tries};`);
  if (opts.maxEntries) src = src.replace('const MAX_ENTRIES = 600;', `const MAX_ENTRIES = ${opts.maxEntries};`);
  if (opts.fetchTimeout) src = src.replace('const FETCH_TIMEOUT_MS = 30000;', `const FETCH_TIMEOUT_MS = ${opts.fetchTimeout};`);
  return src;
}

/** Headers of the request each cached response was stored with: what the response's Vary compares. */
const storedWith = new WeakMap<Response, Headers>();
const headersOf = (req: any) => new Headers(typeof req === 'string' ? undefined : req.headers);

/** Cache.match's Vary rule: each header the response varies on must be equal on the stored and the asking request. */
function varyMatches(res: Response, asking: Headers): boolean {
  const vary = res.headers.get('vary');
  if (!vary) return true;
  const stored = storedWith.get(res) ?? new Headers();
  return vary.split(',').map((h) => h.trim().toLowerCase()).every((h) => h !== '*' && stored.get(h) === asking.get(h));
}

function env(net: (url: string) => Response | Promise<Response>, opts: { code?: string; store?: Store } = {}) {
  const listeners: Record<string, Handler> = {};
  const store: Store = opts.store ?? new Map();
  const fetched: string[] = [];
  const posted: any[] = [];
  const page = { postMessage: (m: unknown) => void posted.push(structuredClone(m)) };
  const bucket = (m: Map<string, Response>) => ({
    match: async (req: any, o?: { ignoreSearch?: boolean; ignoreVary?: boolean }) => {
      let u: string = typeof req === 'string' ? req : req.url;
      if (o?.ignoreSearch) u = u.split('?')[0];
      const hit = m.get(u);
      return hit && (o?.ignoreVary || varyMatches(hit, headersOf(req))) ? hit.clone() : undefined;
    },
    put: async (req: any, res: Response) => {
      const copy = res.clone();
      storedWith.set(copy, headersOf(req));
      m.set(typeof req === 'string' ? req : req.url, copy);
    },
    keys: async () => [...m.keys()].map((url) => ({ url })),
    delete: async (req: any) => m.delete(typeof req === 'string' ? req : req.url),
  });
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      return bucket(store.get(name)!);
    },
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
  };
  // like fetch(): an aborted signal (the worker's FETCH_TIMEOUT_MS) ends a request the network never answers
  const fetchMock = async (req: any, init?: { signal?: AbortSignal }) => {
    const url = typeof req === 'string' ? req : req.url;
    fetched.push(url);
    const signal = init?.signal;
    if (!signal) return net(url);
    return Promise.race([
      net(url),
      new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    ]);
  };
  const self = {
    registration: { scope: SCOPE, navigationPreload: { enable: async () => {} } },
    location: { origin: 'https://user.github.io' },
    skipWaiting: async () => {},
    clients: { claim: async () => {}, matchAll: async () => [page] },
    addEventListener: (type: string, fn: Handler) => (listeners[type] = fn),
  };
  new Function('self', 'caches', 'fetch', opts.code ?? CODE)(self, caches, fetchMock);

  function fire(type: string, ev: Record<string, unknown> = {}) {
    const waits: Promise<unknown>[] = [];
    let responded: Promise<Response> | null = null;
    listeners[type]({
      ...ev,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: (p: Promise<Response>) => (responded = Promise.resolve(p)),
    });
    return { waits, responded: responded as Promise<Response> | null };
  }
  const request = (url: string, extra: Record<string, unknown> = {}) => ({ url, method: 'GET', mode: 'cors', headers: new Headers(), ...extra });
  /** Ask for the download (as a page would) and wait for the worker to finish. */
  const precache = async (source: unknown = page) => settle(fire('message', { data: { type: 'kempanion-precache' }, source }).waits);
  const status = async () => {
    await settle(fire('message', { data: { type: 'kempanion-offline-status' }, source: page }).waits);
    return posted.at(-1);
  };
  return { listeners, store, fetched, posted, page, fire, request, precache, status };
}

const ok = (body: string) => new Response(body, { status: 200 });
const settle = (w: Promise<unknown>[]) => Promise.all(w.map((p) => p.catch(() => {})));
/** Wait (real time) until `cond` holds. */
async function until(cond: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => realSetTimeout(r, 1));
  }
}

describe('service worker', () => {
  test('install precaches the shell; activate removes only its own old caches', async () => {
    const e = env((u) => ok(`shell:${u}`));
    e.store.set('kempanion-shell-old', new Map());
    e.store.set('transformers-cache', new Map([['https://huggingface.co/x.onnx', ok('model')]]));
    await settle(e.fire('install').waits);
    const shell = [...e.store.keys()].find((k) => k.startsWith('kempanion-shell-') && k !== 'kempanion-shell-old')!;
    expect(e.store.get(shell)!.has(SCOPE)).toBe(true);
    await settle(e.fire('activate').waits);
    expect(e.store.has('kempanion-shell-old')).toBe(false);
    expect(e.store.has('transformers-cache')).toBe(true);
    expect(e.store.has(shell)).toBe(true);
  });

  test('never intercepts cross-origin, out-of-scope, non-GET or range requests', () => {
    const e = env(() => ok('x'));
    expect(e.fire('fetch', { request: e.request('https://huggingface.co/LiquidAI/model.onnx') }).responded).toBeNull();
    expect(e.fire('fetch', { request: e.request('https://user.github.io/other-project/app.js') }).responded).toBeNull();
    expect(e.fire('fetch', { request: e.request(SCOPE + 'assets/a.js', { method: 'POST' }) }).responded).toBeNull();
    const headers = new Headers({ range: 'bytes=0-10' });
    expect(e.fire('fetch', { request: e.request(SCOPE + 'assets/song.ogg', { headers }) }).responded).toBeNull();
  });

  test('navigations are network-first and fall back to the cached shell offline', async () => {
    let online = true;
    const e = env((u) => (online ? ok(`fresh:${u}`) : Promise.reject(new TypeError('offline'))));
    const nav = (url: string) => e.fire('fetch', { request: e.request(url, { mode: 'navigate' }), preloadResponse: Promise.resolve(undefined) });
    const a = nav(SCOPE + '?debug');
    expect(await (await a.responded!).text()).toBe(`fresh:${SCOPE}?debug`);
    await settle(a.waits);
    online = false;
    const b = nav(SCOPE + 'index.html');
    expect(await (await b.responded!).text()).toBe(`fresh:${SCOPE}?debug`);
  });

  test('assets are cache-first; unhashed ones are revalidated once', async () => {
    const e = env((u) => ok(`net:${u}`));
    const get = async (url: string) => {
      const r = e.fire('fetch', { request: e.request(url) });
      const body = await (await r.responded!).text();
      await settle(r.waits);
      return body;
    };
    const hashed = SCOPE + 'assets/index-AbCd1234.js';
    await get(hashed);
    await get(hashed);
    expect(e.fetched.filter((u) => u === hashed)).toHaveLength(1);

    const art = SCOPE + 'assets/bg/title.png';
    await get(art); // network
    await get(art); // cache + one background revalidation
    await get(art); // cache only
    expect(e.fetched.filter((u) => u === art)).toHaveLength(2);
  });
});

// ── offline mode: offline-manifest.json → the whole game in the cache ──

const CACHE = 'kempanion-shell-__KEMPANION_BUILD__'; // the unstamped worker's cache
const enc = new TextEncoder();

/** A deployed build: its files and the manifest vite.config.ts would write for them. */
function deploy(files: Record<string, string>, opts: { build?: string; immutable?: string[]; bigBrain?: Record<string, string> } = {}) {
  const list = Object.entries(files).map(([path, body]) => ({
    path,
    size: enc.encode(body).length,
    hash: sha16(enc.encode(body)),
    ...(opts.immutable?.includes(path) ? { immutable: true } : {}),
  }));
  const manifest = {
    build: opts.build ?? 'B1',
    bytes: list.reduce((n, f) => n + f.size, 0),
    files: list,
    bigBrain: Object.keys(opts.bigBrain ?? {}),
  };
  const served: Record<string, string> = { ...files, ...opts.bigBrain };
  /** The web server: files by path (query strings ignored), "./" is index.html, anything else 404s. */
  const net = (url: string): Response => {
    const u = new URL(url);
    if (u.origin !== 'https://user.github.io' || !u.pathname.startsWith('/kempanion/')) return new Response('elsewhere', { status: 404 });
    const path = u.pathname.slice('/kempanion/'.length) || 'index.html';
    if (path === 'offline-manifest.json') return ok(JSON.stringify(manifest));
    return path in served ? ok(served[path]) : new Response('not found', { status: 404 });
  };
  return { manifest, net, served };
}

const GAME = {
  'index.html': '<!doctype html><script src="assets/index-A1.js"></script>',
  'assets/index-A1.js': 'import "./songs-S1.js"',
  'assets/songs-S1.js': 'export const songs = 1',
  'assets/index-C1.css': 'body{}',
  'assets/audio/kempa_synth.wasm': 'wasm!',
  'assets/bg/title.png': 'title art',
  'assets/bg/map.png': 'campus map',
  'assets/cg/cg_p1_yours.png': 'a cg',
  'assets/sprites/piggy-1/everyday/anim-0.png': 'piggy frames',
  'manifest.webmanifest': '{"name":"Kempanion"}',
};
const IMMUTABLE = ['assets/index-A1.js', 'assets/songs-S1.js', 'assets/index-C1.css'];
const BIG_BRAIN = { 'assets/llm.worker-W1.js': 'worker', 'assets/transformers.web-W2.js': 'tf' };
const url = (path: string) => SCOPE + path;
const finalOf = (posted: any[]) => posted.filter((m) => m.type === 'kempanion-offline').at(-1);

describe('service worker: offline mode', () => {
  test('a precache request downloads the whole set into the current cache and reports files and bytes', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE, bigBrain: BIG_BRAIN });
    const e = env(site.net, { code: code() });
    await e.precache();
    const cache = e.store.get(CACHE)!;
    for (const path of Object.keys(GAME)) expect(await cache.get(url(path))!.clone().text()).toBe(GAME[path as keyof typeof GAME]);
    expect(await cache.get(SCOPE)!.clone().text()).toBe(GAME['index.html']); // the shell for navigations to "./"
    expect(cache.get(url('assets/bg/title.png'))!.headers.get('content-type')).toBeTruthy();

    const running = e.posted.filter((m) => m.state === 'running' && m.known);
    expect(running[0]).toMatchObject({ totalFiles: 10, totalBytes: site.manifest.bytes, doneFiles: 0, doneBytes: 0 });
    expect(finalOf(e.posted)).toMatchObject({ state: 'done', complete: true, doneFiles: 10, doneBytes: site.manifest.bytes, failed: 0, build: 'B1' });
    // Big Brain's files and anything outside the scope are never fetched
    expect(e.fetched.some((u) => /llm\.worker|transformers/.test(u))).toBe(false);
    expect(e.fetched.every((u) => u.startsWith(SCOPE))).toBe(true);
  });

  test('files already cached are skipped, and a second request while it runs joins the same download', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    const e = env(site.net, { code: code() });
    const cache = (e.store.set(CACHE, new Map()), e.store.get(CACHE)!);
    cache.set(url('assets/bg/title.png'), ok(GAME['assets/bg/title.png']));
    cache.set(url('assets/cg/cg_p1_yours.png'), ok(GAME['assets/cg/cg_p1_yours.png']));
    const other: any[] = [];
    const first = e.fire('message', { data: { type: 'kempanion-precache' }, source: e.page }).waits;
    await Promise.resolve();
    const second = e.fire('message', { data: { type: 'kempanion-precache' }, source: { postMessage: (m: unknown) => other.push(m) } }).waits;
    await settle([...first, ...second]);
    expect(other[0]).toMatchObject({ type: 'kempanion-offline', state: 'running' }); // told at once where it stands
    for (const path of Object.keys(GAME)) {
      const n = e.fetched.filter((u) => u === url(path)).length;
      expect(n).toBe(path === 'assets/bg/title.png' || path === 'assets/cg/cg_p1_yours.png' ? 0 : 1);
    }
    expect(e.posted.find((m) => m.state === 'running' && m.known)).toMatchObject({ doneFiles: 2 });
    expect(finalOf(e.posted)).toMatchObject({ state: 'done', complete: true });
  });

  test('downloads run a few at a time', async () => {
    const files: Record<string, string> = { 'index.html': 'shell' };
    for (let i = 0; i < 24; i++) files[`assets/sprites/p${i}.png`] = `sprite ${i}`;
    const site = deploy(files);
    let inflight = 0;
    let peak = 0;
    const e = env(async (u) => {
      inflight++;
      peak = Math.max(peak, inflight);
      await new Promise((r) => setTimeout(r, 2));
      inflight--;
      return site.net(u);
    }, { code: code() });
    await e.precache();
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(4);
    expect(finalOf(e.posted)).toMatchObject({ state: 'done', complete: true });
  });

  test('a download cut short reports what failed; asking again fetches only the missing files', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    const broken = new Set([url('assets/bg/map.png'), url('assets/cg/cg_p1_yours.png'), url('assets/songs-S1.js')]);
    let flaky = true;
    const e = env((u) => (flaky && broken.has(u) ? Promise.reject(new TypeError('Failed to fetch')) : site.net(u)), { code: code({ tries: 2 }) });
    await e.precache();
    expect(finalOf(e.posted)).toMatchObject({ state: 'error', reason: 'network', failed: 3, complete: false, doneFiles: 7 });
    expect(await e.status()).toMatchObject({ state: 'idle', complete: false, doneFiles: 7, totalFiles: 10 });

    flaky = false;
    e.fetched.length = 0;
    await e.precache();
    expect(e.fetched.filter((u) => !u.includes('offline-manifest.json')).sort()).toEqual([...broken].sort());
    expect(finalOf(e.posted)).toMatchObject({ state: 'done', complete: true, doneFiles: 10 });
  });

  test('a copy that does not match the manifest is fetched again past every cache, then refused if still different', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    // an HTTP/CDN cache still serves the previous deploy's title art at the plain URL
    const e = env((u) => (u === url('assets/bg/title.png') ? ok('old title art') : site.net(u)), { code: code() });
    await e.precache();
    expect(e.fetched.some((u) => u.startsWith(url('assets/bg/title.png?v=')))).toBe(true);
    expect(await e.store.get(CACHE)!.get(url('assets/bg/title.png'))!.clone().text()).toBe('title art');
    expect(finalOf(e.posted)).toMatchObject({ state: 'done', complete: true });

    const f = env((u) => (u.startsWith(url('assets/bg/map.png')) ? ok('something else') : site.net(u)), { code: code() });
    await f.precache();
    expect(finalOf(f.posted)).toMatchObject({ state: 'error', reason: 'changed', failed: 1, complete: false });
    expect(f.store.get(CACHE)!.has(url('assets/bg/map.png'))).toBe(false);
  });

  test('offline: no file list from the server means no downloads, and a complete copy still reads complete', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    let online = true;
    const e = env((u) => (online ? site.net(u) : Promise.reject(new TypeError('offline'))), { code: code() });
    await e.precache();
    online = false;
    e.fetched.length = 0;
    await e.precache();
    expect(e.fetched.every((u) => u.includes('offline-manifest.json'))).toBe(true);
    expect(finalOf(e.posted)).toMatchObject({ state: 'error', reason: 'offline', complete: true });
    expect(await e.status()).toMatchObject({ complete: true, totalFiles: 10 }); // from the kept copy of the list

    const fresh = env(() => Promise.reject(new TypeError('offline')), { code: code() });
    await fresh.precache();
    expect(finalOf(fresh.posted)).toMatchObject({ state: 'error', reason: 'offline', known: false });
  });

  test("complete means every file is cached and the cached shell is this build's", async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    const e = env(site.net, { code: code() });
    expect(await e.status()).toMatchObject({ known: true, complete: false, doneFiles: 0, totalFiles: 10 });
    await e.precache();
    expect(await e.status()).toMatchObject({ complete: true, doneFiles: 10, doneBytes: site.manifest.bytes });
    // a navigation stored another deploy's index.html as the shell: not this build's offline set any more
    e.store.get(CACHE)!.set(SCOPE, ok('<!doctype html><script src="assets/index-ZZ.js"></script>'));
    expect(await e.status()).toMatchObject({ complete: false, doneFiles: 10 });
    e.fetched.length = 0;
    await e.precache();
    expect(e.fetched.filter((u) => !u.includes('offline-manifest.json'))).toEqual([url('index.html')]);
    expect(await e.status()).toMatchObject({ complete: true });
  });

  test('a deploy carries unchanged entries over, drops the rest, and the top-up fetches only what changed', async () => {
    const v1 = deploy(GAME, { build: 'v1', immutable: IMMUTABLE, bigBrain: BIG_BRAIN });
    const store: Store = new Map([['transformers-cache', new Map([['https://huggingface.co/m.onnx', ok('model')]])]]);
    const old = env(v1.net, { code: code({ version: 'v1' }), store });
    await settle(old.fire('install').waits);
    await settle(old.fire('activate').waits);
    await old.precache();
    expect(finalOf(old.posted)).toMatchObject({ complete: true });
    const oldCache = store.get('kempanion-shell-v1')!;
    oldCache.set(url('assets/llm.worker-W1.js'), ok('worker')); // the player used Big Brain once
    oldCache.set(url('assets/stale-X9.js'), ok('from an older build'));

    // v2 changes the shell, the entry chunk (new hash), the map art (same URL, new bytes) and adds a CG
    const v2files = { ...GAME } as Record<string, string>;
    delete v2files['assets/index-A1.js'];
    v2files['assets/index-A2.js'] = 'import "./songs-S1.js" // v2';
    v2files['index.html'] = '<!doctype html><script src="assets/index-A2.js"></script>';
    v2files['assets/bg/map.png'] = 'campus map, repainted';
    v2files['assets/cg/cg_new.png'] = 'new cg';
    const v2 = deploy(v2files, { build: 'v2', immutable: ['assets/index-A2.js', 'assets/songs-S1.js', 'assets/index-C1.css'], bigBrain: BIG_BRAIN });
    const next = env(v2.net, { code: code({ version: 'v2' }), store });
    await settle(next.fire('install').waits);
    await settle(next.fire('activate').waits);

    expect(store.has('kempanion-shell-v1')).toBe(false);
    expect(store.get('transformers-cache')!.has('https://huggingface.co/m.onnx')).toBe(true);
    const cache = store.get('kempanion-shell-v2')!;
    for (const p of ['assets/songs-S1.js', 'assets/index-C1.css', 'assets/audio/kempa_synth.wasm', 'assets/bg/title.png', 'assets/cg/cg_p1_yours.png', 'assets/sprites/piggy-1/everyday/anim-0.png', 'assets/llm.worker-W1.js']) {
      expect(cache.has(url(p))).toBe(true);
    }
    expect(await cache.get(url('assets/bg/title.png'))!.clone().text()).toBe('title art');
    expect(cache.has(url('assets/bg/map.png'))).toBe(false); // same URL, different bytes: not carried
    expect(cache.has(url('assets/index-A1.js'))).toBe(false); // not part of v2
    expect(cache.has(url('assets/stale-X9.js'))).toBe(false);
    // installing fetched only the new list and the shell files that changed (index.html), not the unchanged ones
    expect(next.fetched.some((u) => /title\.png|cg_p1_yours|anim-0|kempa_synth|songs-S1|manifest\.webmanifest/.test(u))).toBe(false);
    expect(next.fetched).toContain(url('index.html'));
    expect(await cache.get(SCOPE)!.clone().text()).toBe(v2files['index.html']);

    next.fetched.length = 0;
    await next.precache();
    expect(next.fetched.filter((u) => !u.includes('offline-manifest.json')).sort()).toEqual(
      [url('assets/bg/map.png'), url('assets/cg/cg_new.png'), url('assets/index-A2.js')].sort(),
    );
    expect(finalOf(next.posted)).toMatchObject({ state: 'done', complete: true, build: 'v2', totalFiles: 11 });
    expect(await cache.get(url('assets/bg/map.png'))!.clone().text()).toBe('campus map, repainted');
  });

  test('making room in the cache never drops the offline set', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    const e = env((u) => (u.includes('/assets/extra/') ? ok('extra') : site.net(u)), { code: code({ maxEntries: 14 }) });
    await e.precache(); // 10 files + the "./" shell + the kept list = 12 entries
    for (let i = 0; i < 6; i++) {
      const r = e.fire('fetch', { request: e.request(url(`assets/extra/e-${i}.png`)) });
      await r.responded;
      await settle(r.waits);
    }
    const cache = e.store.get(CACHE)!;
    expect(cache.size).toBeLessThanOrEqual(14);
    for (const path of Object.keys(GAME)) expect(cache.has(url(path))).toBe(true);
    expect(cache.has(SCOPE)).toBe(true);
    expect(cache.has(url('assets/extra/e-5.png'))).toBe(true); // the newest extra stays, the oldest went
    expect(cache.has(url('assets/extra/e-0.png'))).toBe(false);
  });

  test('a worker replaced mid-download stops without recreating its deleted cache', async () => {
    const files: Record<string, string> = { 'index.html': 'shell' };
    for (let i = 0; i < 40; i++) files[`assets/sprites/p${i}.png`] = `sprite ${i}`;
    const site = deploy(files);
    let n = 0;
    let store: Store | null = null;
    const e = env((u) => {
      if (u.includes('/sprites/') && ++n === 3) store!.delete(CACHE); // the new worker activated and cleaned up
      return site.net(u);
    }, { code: code() });
    store = e.store;
    await e.precache();
    expect(e.store.has(CACHE)).toBe(false);
    expect(e.fetched.filter((u) => u.includes('/sprites/')).length).toBeLessThan(40);
    expect(e.posted.some((m) => m.state === 'done' || m.state === 'error')).toBe(false);
  });

  test('a cache-busting query is served by the downloaded file when there is no network', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    let online = true;
    const e = env((u) => (online ? site.net(u) : Promise.reject(new TypeError('offline'))), { code: code() });
    await e.precache();
    online = false;
    const r = e.fire('fetch', { request: e.request(url('assets/bg/title.png?v=c1')) });
    expect(await (await r.responded!).text()).toBe('title art');
    await settle(r.waits);
  });

  test('manifest entries outside the scope or origin are ignored', async () => {
    const site = deploy({ 'index.html': 'shell' });
    const bad = { ...site.manifest, files: [...site.manifest.files, { path: 'https://evil.example/x.js', size: 1, hash: 'x' }, { path: '../other/y.js', size: 1, hash: 'y' }] };
    const e = env((u) => (u.includes('offline-manifest.json') ? ok(JSON.stringify(bad)) : site.net(u)), { code: code() });
    await e.precache();
    expect(e.fetched.every((u) => u.startsWith(SCOPE))).toBe(true);
    expect(finalOf(e.posted)).toMatchObject({ state: 'done', complete: true, totalFiles: 1 });
  });

  test('a top-up first reports where the set stands by its kept list, before the network has answered', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    let lieFi = false;
    // Wi-Fi that goes nowhere (captive portal, dead hotspot): requests are taken and never answered
    const e = env((u) => (lieFi ? new Promise<Response>(() => {}) : site.net(u)), { code: code({ fetchTimeout: 60 }) });
    await e.precache();
    lieFi = true;
    e.posted.length = 0;
    const run = e.fire('message', { data: { type: 'kempanion-precache' }, source: e.page }).waits;
    await until(() => e.posted.length > 0);
    expect(e.posted).toHaveLength(1); // told at once, while the list request still hangs
    expect(e.posted[0]).toMatchObject({ state: 'running', known: true, complete: true, doneFiles: 10, totalFiles: 10, doneBytes: site.manifest.bytes });
    expect(await e.status()).toMatchObject({ state: 'running', complete: true }); // a page asking meanwhile hears the same
    await settle(run);
    expect(finalOf(e.posted)).toMatchObject({ state: 'error', reason: 'offline', complete: true }); // no list: still complete

    // a partial copy reports its real progress the same way
    const p = env((u) => (u === url('assets/bg/map.png') ? Promise.reject(new TypeError('Failed to fetch')) : site.net(u)), { code: code({ tries: 1, fetchTimeout: 60 }) });
    await p.precache();
    expect(finalOf(p.posted)).toMatchObject({ state: 'error', doneFiles: 9 });
    p.posted.length = 0;
    const again = p.fire('message', { data: { type: 'kempanion-precache' }, source: p.page }).waits;
    await until(() => p.posted.length > 0);
    expect(p.posted[0]).toMatchObject({ state: 'running', known: true, complete: false, doneFiles: 9, totalFiles: 10 });
    await settle(again);
  });

  test('entries the host sent with Vary still answer every request for their URL offline, and count as saved', async () => {
    const site = deploy(GAME, { immutable: IMMUTABLE });
    let online = true;
    // a host that adds Vary: Origin (as Vite's server does), and Vary: * on pages
    const host = (u: string): Response => {
      const res = site.net(u);
      const headers = new Headers(res.headers);
      headers.set('vary', u === SCOPE || u.endsWith('.html') ? '*' : 'Origin');
      return new Response(res.body, { status: res.status, headers });
    };
    const e = env((u) => (online ? host(u) : Promise.reject(new TypeError('offline'))), { code: code() });
    const get = async (req: Record<string, unknown>) => {
      const r = e.fire('fetch', { request: req, preloadResponse: Promise.resolve(undefined) });
      const body = await (await r.responded!).text();
      await settle(r.waits);
      return body;
    };
    await e.precache();
    // online: a CORS request (it carries Origin) revalidates the title art, a navigation stores the shell
    await get(e.request(url('assets/bg/title.png'), { headers: new Headers({ origin: 'https://user.github.io' }) }));
    await get(e.request(SCOPE, { mode: 'navigate' }));
    expect(await e.status()).toMatchObject({ complete: true });

    online = false;
    // an <img> (no Origin header) still gets the art, a navigation the shell
    expect(await get(e.request(url('assets/bg/title.png'), { mode: 'no-cors' }))).toBe('title art');
    expect(await get(e.request(SCOPE + '?utm=x', { mode: 'navigate' }))).toBe(GAME['index.html']);

    // entries that already carry Vary (written before the worker stripped it) are found too, query or not
    const cache = e.store.get(CACHE)!;
    const withVary = (body: string, vary: string, from: Record<string, string> = {}) => {
      const res = new Response(body, { headers: { vary, 'content-type': 'text/plain' } });
      storedWith.set(res, new Headers(from));
      return res;
    };
    cache.set(url('assets/bg/map.png'), withVary('campus map', 'Origin', { origin: 'https://user.github.io' }));
    expect(await get(e.request(url('assets/bg/map.png'), { mode: 'no-cors' }))).toBe('campus map');
    expect(await get(e.request(url('assets/bg/map.png?v=c1'), { mode: 'no-cors' }))).toBe('campus map');
    // and a shell stored with Vary: * (which a plain lookup never matches) still makes the set complete
    for (const k of [SCOPE, url('index.html')]) cache.set(k, withVary(GAME['index.html'], '*'));
    expect(await e.status()).toMatchObject({ complete: true, doneFiles: 10 });
    expect(await get(e.request(SCOPE, { mode: 'navigate' }))).toBe(GAME['index.html']);
  });

  test('a worker the browser stopped mid-download: the next one fetches only what is still missing, once', async () => {
    const files: Record<string, string> = { 'index.html': 'shell' };
    for (let i = 0; i < 20; i++) files[`assets/sprites/p${i}.png`] = `sprite ${i}`;
    const site = deploy(files);
    const store: Store = new Map();
    // the first worker gets 8 sprites in, then the browser stops it: its other requests never come back
    let served = 0;
    let stopped = false;
    const hanging: (() => void)[] = [];
    const first = env((u) => {
      if (stopped) return Promise.reject(new TypeError('worker stopped'));
      if (u.includes('/sprites/') && ++served > 8) return new Promise<Response>((_, reject) => hanging.push(() => reject(new TypeError('worker stopped'))));
      return site.net(u);
    }, { code: code(), store });
    const firstRun = first.fire('message', { data: { type: 'kempanion-precache' }, source: first.page }).waits;
    const sprites = () => [...(store.get(CACHE)?.keys() ?? [])].filter((k) => k.includes('/sprites/'));
    await until(() => sprites().length === 8 && hanging.length === 4);
    const saved = [...store.get(CACHE)!.keys()]; // the shell and 8 sprites (and the kept list)

    // the page asks again (back to the tab, or the stall timer) and a fresh worker on the same caches resumes;
    // a second ask right behind it (focus after visibilitychange) joins that download
    const next = env(site.net, { code: code(), store });
    const a = next.fire('message', { data: { type: 'kempanion-precache' }, source: next.page }).waits;
    const b = next.fire('message', { data: { type: 'kempanion-precache' }, source: next.page }).waits;
    await settle([...a, ...b]);
    const got = next.fetched.filter((u) => !u.includes('offline-manifest.json'));
    expect(got.filter((u) => saved.includes(u))).toEqual([]); // nothing the stopped worker had saved
    expect(new Set(got).size).toBe(got.length); // nothing twice
    expect(got.sort()).toEqual(Object.keys(files).map(url).filter((u) => !saved.includes(u)).sort());
    expect(finalOf(next.posted)).toMatchObject({ state: 'done', complete: true, doneFiles: 21 });

    stopped = true;
    hanging.forEach((stop) => stop());
    await settle(firstRun);
  });
});

// ── the page side: src/lib/offline.svelte.ts following the worker ──

type Listener = (ev: any) => void;

/**
 * One page in a fake browser: a controlling worker that records what the page asks ('status' | 'precache'), window and
 * document events, localStorage, and a clock the test moves (timers and Date.now()). restore() puts the globals back.
 */
function browser(opts: { optedIn?: boolean; onLine?: boolean } = {}) {
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const swap = (name: string, value: unknown) => {
    if (!saved.has(name)) saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };
  const on: Record<string, Listener[]> = {};
  const listen = (scope: string) => (type: string, fn: Listener) => void (on[`${scope} ${type}`] ??= []).push(fn);
  const asked: string[] = [];
  const worker = { postMessage: (m: { type: string }) => void asked.push(m.type === 'kempanion-precache' ? 'precache' : 'status') };
  let update = async () => {};
  const reg = { update: () => update(), installing: null, waiting: null, active: worker };
  swap('navigator', {
    onLine: opts.onLine ?? true,
    serviceWorker: { controller: worker, ready: Promise.resolve(reg), getRegistration: async () => reg, addEventListener: listen('sw'), startMessages() {} },
    storage: { persisted: async () => true, persist: async () => true },
  });
  const kept = new Map<string, string>(opts.optedIn ? [['kempanion.offline', 'on']] : []);
  swap('localStorage', { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) });
  swap('window', { isSecureContext: true });
  const doc = { visibilityState: 'visible', addEventListener: listen('document') };
  swap('document', doc);
  swap('addEventListener', listen('window'));
  const start = Date.now();
  let now = 0;
  let ids = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  swap('setTimeout', (fn: () => void, ms = 0) => (timers.set(++ids, { at: now + ms, fn }), ids));
  swap('clearTimeout', (id: number) => void timers.delete(id));
  setSystemTime(new Date(start));
  const flush = async () => {
    for (let i = 0; i < 50; i++) await Promise.resolve();
  };
  return {
    asked,
    doc,
    flush,
    /** The worker posts to the page. */
    async say(m: Record<string, unknown>) {
      for (const fn of on['sw message'] ?? []) fn({ data: { type: 'kempanion-offline', ...m } });
      await flush();
    },
    async fire(target: 'window' | 'document', type: string, ev: Record<string, unknown> = {}) {
      for (const fn of on[`${target} ${type}`] ?? []) fn(ev);
      await flush();
    },
    /** The update check (reg.update()) never comes back: Wi-Fi that goes nowhere. */
    hangUpdates() {
      update = () => new Promise<void>(() => {});
    },
    /** Move the clock, running the timers that come due on the way. */
    async tick(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        setSystemTime(new Date(start + now));
        due[1].fn();
        await flush();
      }
      now = end;
      setSystemTime(new Date(start + now));
      await flush();
    },
    restore() {
      for (const [name, d] of saved) {
        if (d) Object.defineProperty(globalThis, name, d);
        else delete (globalThis as Record<string, unknown>)[name];
      }
      setSystemTime();
    },
  };
}

/** What the worker reports about a 259-file, 14 MB set: all of it, or 100 files (42%). */
const SET = { known: true, totalFiles: 259, totalBytes: 14_000_000 };
const WHOLE = { ...SET, doneFiles: 259, doneBytes: 14_000_000, complete: true };
const PART = { ...SET, doneFiles: 100, doneBytes: 5_880_000, complete: false };
const precaches = (asked: string[]) => asked.filter((k) => k === 'precache').length;

describe('offline mode: the page (offline.svelte.ts)', () => {
  test('a returning player with the whole game reads OFFLINE READY at once, even on Wi-Fi that goes nowhere', async () => {
    const b = browser({ optedIn: true });
    try {
      b.hangUpdates();
      const o = new OfflineMode();
      o.init();
      await b.flush();
      expect(b.asked).toEqual(['status']); // right away, not after the top-up
      expect(o.asking).toBe(true);
      await b.say({ state: 'idle', ...WHOLE }); // the worker answers from its kept list and cache
      expect(o.status).toBe('ready');
      expect(o.asking).toBe(false);
      // the top-up still runs once the game has loaded, after at most 5 s on an update check that goes nowhere
      await b.tick(TOP_UP_DELAY_MS);
      expect(b.asked).toEqual(['status']);
      await b.tick(5000);
      expect(b.asked).toEqual(['status', 'precache']);
      // the worker reports by its kept list first, then waits on the server's: ready all along, never a download
      await b.say({ state: 'running', ...WHOLE });
      expect(o.status).toBe('ready');
      await b.tick(STALL_MS); // silence meanwhile: asked again, and the worker (still at it) says where it stands
      expect(precaches(b.asked)).toBe(2);
      await b.say({ state: 'running', ...WHOLE });
      expect(o.status).toBe('ready');
      await b.say({ state: 'error', reason: 'offline', ...WHOLE }); // no list from the server: the copy is complete
      expect(o.status).toBe('ready');
      expect(o.reason).toBe('');
    } finally {
      b.restore();
    }
  });

  test('a status answer the top-up overtook still reads a complete copy as ready, and never undoes progress', async () => {
    const b = browser({ optedIn: true });
    try {
      const o = new OfflineMode();
      o.init();
      await b.tick(TOP_UP_DELAY_MS); // a slow worker: the top-up asks before the status answer is back
      expect(b.asked).toEqual(['status', 'precache']);
      await b.say({ state: 'idle', ...WHOLE });
      expect(o.status).toBe('ready');
    } finally {
      b.restore();
    }
    const c = browser({ optedIn: true });
    try {
      const o = new OfflineMode();
      o.init();
      await c.tick(TOP_UP_DELAY_MS);
      await c.say({ state: 'running', ...PART, doneFiles: 150, doneBytes: 7_000_000 }); // the download got further
      expect(o.status).toBe('downloading');
      await c.say({ state: 'idle', ...PART }); // the older, incomplete status answer arrives late: ignored
      expect([o.status, o.doneFiles, o.percent]).toEqual(['downloading', 150, 50]);
    } finally {
      c.restore();
    }
  });

  test('a partial copy shows its real progress at once (never the idle pill) and resumes with the top-up', async () => {
    const b = browser({ optedIn: true });
    try {
      const o = new OfflineMode();
      o.init();
      await b.say({ state: 'idle', ...PART });
      expect(o.status).toBe('downloading');
      expect(o.percent).toBe(42);
      expect(b.asked).toEqual(['status']); // the scheduled top-up resumes it, once the game has loaded
      await b.tick(TOP_UP_DELAY_MS);
      expect(b.asked).toEqual(['status', 'precache']);
      await b.say({ state: 'running', ...PART });
      expect([o.status, o.percent]).toEqual(['downloading', 42]);
      await b.say({ state: 'done', ...WHOLE });
      expect(o.status).toBe('ready');
    } finally {
      b.restore();
    }
    // airplane mode: where it stands, as a retry (the window says how many files are saved)
    const c = browser({ optedIn: true, onLine: false });
    try {
      const o = new OfflineMode();
      o.init();
      await c.say({ state: 'idle', ...PART });
      expect([o.status, o.reason, o.doneFiles]).toEqual(['error', 'offline', 100]);
      await c.tick(60_000);
      expect(c.asked).toEqual(['status']); // no top-up without a connection
    } finally {
      c.restore();
    }
  });

  test('a download the browser paused resumes as soon as the page is back, asking once per wake-up', async () => {
    const b = browser();
    try {
      const o = new OfflineMode();
      o.init();
      await b.say({ state: 'idle', ...SET, doneFiles: 0, doneBytes: 0, complete: false });
      expect(o.status).toBe('idle');
      o.start();
      await b.flush();
      expect(b.asked).toEqual(['status', 'precache']);
      await b.say({ state: 'running', ...PART });
      // the tab goes to the background and the browser stops the worker: silence
      b.doc.visibilityState = 'hidden';
      await b.fire('document', 'visibilitychange');
      await b.tick(STALL_MS / 2);
      expect(precaches(b.asked)).toBe(1);
      // back to the tab: asked again at once, not after STALL_MS; the focus and online events right behind it add nothing
      b.doc.visibilityState = 'visible';
      await b.fire('document', 'visibilitychange');
      await b.fire('window', 'focus');
      await b.fire('window', 'online');
      expect(precaches(b.asked)).toBe(2);
      await b.say({ state: 'running', ...PART, doneFiles: 120, doneBytes: 7_000_000 });
      // a later wake-up asks again (a worker still at it only reports where it stands: no file is fetched twice)
      await b.tick(WAKE_GAP_MS);
      await b.fire('window', 'pageshow', { persisted: true });
      expect(precaches(b.asked)).toBe(3);
      // with the page in view and no word at all, the stall timer asks
      await b.tick(STALL_MS);
      expect(precaches(b.asked)).toBe(4);
      await b.say({ state: 'done', ...WHOLE });
      expect(o.status).toBe('ready');
      // nothing pending: waking up asks nothing
      await b.tick(WAKE_GAP_MS);
      await b.fire('document', 'visibilitychange');
      await b.fire('window', 'focus');
      await b.fire('window', 'online');
      expect(precaches(b.asked)).toBe(4);
    } finally {
      b.restore();
    }
  });

  test('back online, a download that stopped for lack of connection starts again', async () => {
    const b = browser({ optedIn: true, onLine: false });
    try {
      const o = new OfflineMode();
      o.init();
      await b.say({ state: 'idle', ...PART });
      expect(o.status).toBe('error');
      await b.fire('window', 'online');
      expect(b.asked).toEqual(['status', 'precache']);
    } finally {
      b.restore();
    }
  });
});
