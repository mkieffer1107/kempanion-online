/* Kempanion Online — service worker: the offline app shell, plus the whole game for players who opt in.
 *
 * - Versioned cache "kempanion-shell-<VERSION>" (VERSION = the build id). Caches we didn't create (e.g.
 *   transformers.js' "transformers-cache" holding Big Brain's model) are never touched.
 * - Navigations and index.html: network-first (fresh deploys win), falling back to the cached shell offline.
 * - Same-origin GET assets under our scope: cache-first. Content-hashed build files are immutable;
 *   other files (public/ art like backgrounds) are refreshed in the background after being served.
 * - Cross-origin requests (huggingface.co model downloads, CDNs) are never intercepted.
 * - Offline mode ("Play offline" on the title screen, src/lib/offline.svelte.ts): the page posts
 *   {type: 'kempanion-precache'} and this worker downloads every file in offline-manifest.json (the whole game minus
 *   Big Brain, listed by vite.config.ts) into its cache, PRECACHE_CONCURRENCY at a time, skipping files it already
 *   has and checking each download against the manifest's SHA-256. Progress goes to every open page, starting with
 *   where the set stands by the kept copy of the list (before the network is asked for the current one, which on a
 *   slow or dead connection takes a while). Stopped half-way (worker stopped, page reloaded, connection lost), asking
 *   again fetches only what is still missing; asking while a download runs joins it.
 * - Cache lookups ignore Vary: entries refreshed from the network may carry the host's Vary (Origin, say), and the
 *   offline set must answer every request for its URLs, whatever headers the request has.
 * - Deploys: while the new worker installs (the old one keeps serving meanwhile) it copies every entry of the old
 *   cache whose content the new build still uses: content-hashed files by URL, the rest only when the bytes match the
 *   new manifest's hash. Activate picks up stragglers, then deletes the old cache, so a player who went offline-ready
 *   only downloads what changed.
 */
const VERSION = '__KEMPANION_BUILD__'; // stamped with the build id by vite.config.ts (dev keeps this literal)
const PREFIX = 'kempanion-shell-';
const CACHE = PREFIX + VERSION;
const SCOPE = self.registration.scope; // e.g. https://user.github.io/kempanion/
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];
const SHELL_URLS = new Set(SHELL.map((p) => new URL(p, SCOPE).href));
const MANIFEST_URL = new URL('offline-manifest.json', SCOPE).href;
/** Entries kept in the cache. The offline set (~260 files) must stay well under it: the build fails otherwise. */
const MAX_ENTRIES = 600;
const NAV_TIMEOUT_MS = 4000;
const HASHED = /[-.][A-Za-z0-9_-]{8,}\.(?:m?js|css|wasm|woff2?|ttf|png|jpe?g|gif|svg|webp|avif|json)$/;
const PRECACHE_CONCURRENCY = 4;
const PRECACHE_TRIES = 3;
const FETCH_TIMEOUT_MS = 30000;
const PROGRESS_EVERY_MS = 150;
/**
 * Every lookup ignores Vary. A response the host sent with Vary (Origin, Accept-Encoding, or *) is stored together
 * with the request that fetched it, and a lookup by another kind of request (an <img> after a fetch(), say) would
 * otherwise miss it: a file the offline set counts as saved would then fail with no network.
 */
const MATCH = { ignoreVary: true };
/** Unhashed files already revalidated while this worker has been alive (one 304 check each, not one per hit). */
const revalidated = new Set();

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // The heavy part of the carry-over runs now, while the previous worker still serves the open pages; then
      // only the shell files it couldn't vouch for are fetched.
      const manifest = await loadManifest('network').catch(() => null);
      if (manifest) await carryOver(cache, manifest).catch(() => {});
      const have = new Set((await cache.keys()).map((r) => r.url));
      await Promise.all(
        SHELL.map(async (path) => {
          try {
            const url = new URL(path, SCOPE).href;
            if (have.has(url)) return;
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (cacheable(res)) await cache.put(url, await cleanCopy(res));
          } catch {
            /* offline during install: the shell is filled in on the next visit */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const manifest = (await loadManifest('cache')) || (await loadManifest('network').catch(() => null));
      if (manifest) await carryOver(cache, manifest).catch(() => {}); // entries the old worker added since install
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* unsupported */
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (models, CDNs)
  if (!url.href.startsWith(SCOPE)) return; // other projects on the same github.io origin
  if (req.headers.has('range')) return; // partial content: let the browser handle it
  if (url.pathname.endsWith('/sw.js')) return;
  // Big Brain's ONNX Runtime (~27 MB) is cached by transformers.js itself; don't keep a second copy here.
  if (/\/ort-wasm[^/]*\.(?:wasm|mjs)$/.test(url.pathname)) return;

  const isShellDoc = req.mode === 'navigate' || url.pathname === new URL('./', SCOPE).pathname || url.pathname.endsWith('/index.html');
  if (isShellDoc) {
    const { response, done } = networkFirst(event, url);
    event.respondWith(response);
    event.waitUntil(done);
    return;
  }
  event.respondWith(cacheFirst(event, req, url));
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'kempanion-offline-status') event.waitUntil(answerStatus(event.source));
  else if (data.type === 'kempanion-precache') event.waitUntil(precache(event.source));
});

/** Only complete, non-opaque responses are cached. */
function cacheable(res) {
  return !!res && res.ok && (res.type === 'basic' || res.type === 'default');
}

/**
 * A cacheable copy of a response: without the "redirected" flag (Safari refuses to serve such a response for a
 * navigation) and without Vary (an entry with Vary sits beside the next copy of its URL instead of being replaced).
 */
async function cleanCopy(res) {
  if (!res.redirected && !res.headers.has('vary')) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: noVary(res.headers) });
}

function noVary(headers) {
  const h = new Headers(headers);
  h.delete('vary');
  return h;
}

function shellKey(url) {
  const u = new URL(url.href);
  u.search = '';
  u.hash = '';
  if (u.pathname.endsWith('/index.html')) u.pathname = u.pathname.slice(0, -'index.html'.length);
  return u.href;
}

async function cachedShell(url) {
  const cache = await caches.open(CACHE);
  return (
    (await cache.match(shellKey(url), MATCH)) ||
    (await cache.match(new URL('./', SCOPE).href, MATCH)) ||
    (await cache.match(new URL('./index.html', SCOPE).href, MATCH))
  );
}

/** Network first; offline (or after NAV_TIMEOUT_MS of silence) fall back to the cached shell. */
function networkFirst(event, url) {
  let copy = null;
  const network = (async () => {
    let res;
    try {
      res = await event.preloadResponse;
    } catch {
      res = undefined;
    }
    if (!res) res = await fetch(event.request);
    // clone now, before the page starts reading the body
    if (cacheable(res)) copy = res.clone();
    return res;
  })();

  const done = network
    .then(async () => {
      if (!copy) return;
      const cache = await caches.open(CACHE);
      await cache.put(shellKey(url), await cleanCopy(copy));
    })
    .catch(() => {});

  const response = (async () => {
    let timer;
    const slow = new Promise((resolve) => {
      timer = setTimeout(() => cachedShell(url).then(resolve, () => resolve(undefined)), NAV_TIMEOUT_MS);
    });
    try {
      const first = await Promise.race([network, slow]);
      clearTimeout(timer);
      return first || (await network);
    } catch (err) {
      clearTimeout(timer);
      const hit = await cachedShell(url);
      if (hit) return hit;
      throw err;
    }
  })();

  return { response, done };
}

async function cacheFirst(event, req, url) {
  const cache = await caches.open(CACHE);
  // A cache-busting query (cursors.css asks for point.png?v=c1) is served by the same file without it: the
  // offline set stores plain paths, kept current by the manifest's hashes.
  const hit = (await cache.match(req, MATCH)) || (url.search ? await cache.match(req, { ...MATCH, ignoreSearch: true }) : undefined);
  if (hit) {
    if (!HASHED.test(url.pathname) && !revalidated.has(req.url)) {
      revalidated.add(req.url);
      event.waitUntil(refresh(cache, req));
    }
    return hit;
  }
  const res = await fetch(req);
  if (cacheable(res)) event.waitUntil(store(cache, req, res.clone()));
  return res;
}

async function refresh(cache, req) {
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (cacheable(res)) await cache.put(req, await cleanCopy(res));
  } catch {
    /* offline: keep the cached copy */
  }
}

async function store(cache, req, res) {
  try {
    await cache.put(req, await cleanCopy(res));
    const keys = await cache.keys();
    const extra = keys.length - MAX_ENTRIES;
    if (extra > 0) {
      // oldest first (insertion order); never the shell, nor the offline set a player downloaded
      const keep = await protectedUrls();
      const victims = keys.filter((k) => !keep.has(k.url)).slice(0, extra);
      await Promise.all(victims.map((k) => cache.delete(k)));
    }
  } catch {
    /* quota exceeded or similar: serving still works without the cache */
  }
}

// ── offline set (offline-manifest.json) ──

/** The download in progress: one at a time, and a page that asks meanwhile (say, after a reload) joins it. */
let running = null;
/** Latest progress of `running`, for pages that join. */
let progress = null;
/** "<old cache> <url>" pairs already found changed during this worker's life (not hashed again on activate). */
const rejected = new Set();

/** Absolute URL of a manifest path, or null when it would leave our scope. */
function abs(path) {
  try {
    const u = new URL(path, SCOPE);
    return u.origin === self.location.origin && u.href.startsWith(SCOPE) ? u.href : null;
  } catch {
    return null;
  }
}

/** Cache keys a manifest file lives under: index.html is also the shell served for navigations to "./". */
function keysFor(path) {
  const url = abs(path);
  return path === 'index.html' ? [url, SCOPE] : [url];
}

function parseManifest(text) {
  try {
    const m = JSON.parse(text);
    if (!m || typeof m.build !== 'string' || !Array.isArray(m.files)) return null;
    const files = m.files.filter(
      (f) => f && typeof f.path === 'string' && typeof f.size === 'number' && typeof f.hash === 'string' && abs(f.path),
    );
    const bigBrain = Array.isArray(m.bigBrain) ? m.bigBrain.filter((p) => typeof p === 'string' && abs(p)) : [];
    return { build: m.build, files, bytes: files.reduce((n, f) => n + f.size, 0), bigBrain };
  } catch {
    return null;
  }
}

/**
 * The game's file list: 'network' fetches the deployed offline-manifest.json past every HTTP/CDN cache and keeps a
 * copy, 'cache' reads the kept copy, 'either' tries the network first. null when there's none.
 */
async function loadManifest(from) {
  const cache = await caches.open(CACHE);
  if (from !== 'cache') {
    try {
      const { res, body } = await fetchBody(`${MANIFEST_URL}?v=${Date.now()}`, { cache: 'no-store' });
      const text = new TextDecoder().decode(body);
      const manifest = res.ok ? parseManifest(text) : null;
      if (manifest) {
        await cache.put(MANIFEST_URL, new Response(text, { headers: { 'content-type': 'application/json' } }));
        return manifest;
      }
    } catch {
      /* offline */
    }
    if (from === 'network') return null;
  }
  try {
    const hit = await cache.match(MANIFEST_URL, MATCH);
    return hit ? parseManifest(await hit.text()) : null;
  } catch {
    return null;
  }
}

/** First 16 hex digits of the SHA-256 of `buf` (vite.config.ts writes the same into the manifest). */
async function sha16(buf) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  let hex = '';
  for (let i = 0; i < 8; i++) hex += d[i].toString(16).padStart(2, '0');
  return hex;
}

/** fetch + read the body, giving up after FETCH_TIMEOUT_MS. */
async function fetchBody(url, init) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, ctrl ? { ...init, signal: ctrl.signal } : init);
    return { res, body: await res.arrayBuffer() };
  } finally {
    clearTimeout(timer);
  }
}

/** Shell, manifest and offline set: never evicted to make room. */
async function protectedUrls() {
  const keep = new Set(SHELL_URLS);
  keep.add(MANIFEST_URL);
  const manifest = await loadManifest('cache');
  for (const f of manifest ? manifest.files : []) for (const url of keysFor(f.path)) keep.add(url);
  return keep;
}

/**
 * Copy into `cache` each entry of our older caches that this build still uses unchanged: content-hashed build files
 * (and Big Brain's, which players may have from using it) by URL, everything else only when its bytes hash to the
 * manifest's value. Entries already in `cache` are left alone.
 */
async function carryOver(cache, manifest) {
  const wanted = new Map();
  for (const f of manifest.files) for (const url of keysFor(f.path)) wanted.set(url, f);
  for (const path of manifest.bigBrain) wanted.set(abs(path), { path, immutable: true });
  const have = new Set((await cache.keys()).map((r) => r.url));
  for (const name of await caches.keys()) {
    if (!name.startsWith(PREFIX) || name === CACHE) continue;
    const old = await caches.open(name);
    for (const req of await old.keys()) {
      const f = wanted.get(req.url);
      if (!f || have.has(req.url) || rejected.has(`${name} ${req.url}`)) continue;
      const res = await old.match(req, MATCH);
      if (!res) continue;
      let copy = res;
      if (!f.immutable) {
        const body = await res.arrayBuffer();
        if ((await sha16(body)) !== f.hash) {
          rejected.add(`${name} ${req.url}`);
          continue;
        }
        copy = new Response(body, { status: res.status, statusText: res.statusText, headers: noVary(res.headers) });
      } else copy = await cleanCopy(res);
      await cache.put(req, copy);
      have.add(req.url);
    }
  }
}

function message(fields) {
  return { type: 'kempanion-offline', version: VERSION, ...fields };
}

function post(client, msg) {
  try {
    if (client) client.postMessage(msg);
  } catch {
    /* page gone */
  }
}

async function broadcast(msg) {
  try {
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const page of pages) post(page, msg);
  } catch {
    /* nobody to tell */
  }
}

/** The cached shell is this manifest's index.html (a navigation may have stored a newer deploy's). */
async function shellMatches(cache, manifest) {
  const shell = manifest.files.find((f) => f.path === 'index.html');
  if (!shell) return true;
  const hit = (await cache.match(SCOPE, MATCH)) || (await cache.match(abs('index.html'), MATCH));
  return !!hit && (await sha16(await hit.arrayBuffer())) === shell.hash;
}

/** Where the offline set stands in the cache right now. */
async function snapshot(manifest, fields) {
  if (!manifest) return message({ state: 'idle', known: false, ...fields });
  const cache = await caches.open(CACHE);
  const have = new Set((await cache.keys()).map((r) => r.url));
  let doneFiles = 0;
  let doneBytes = 0;
  for (const f of manifest.files) {
    if (keysFor(f.path).every((url) => have.has(url))) {
      doneFiles++;
      doneBytes += f.size;
    }
  }
  const complete = doneFiles === manifest.files.length && (await shellMatches(cache, manifest));
  return message({
    state: 'idle',
    known: true,
    build: manifest.build,
    totalFiles: manifest.files.length,
    totalBytes: manifest.bytes,
    doneFiles,
    doneBytes,
    failed: 0,
    complete,
    ...fields,
  });
}

/** Where the set stands: the running download's progress, or a snapshot by the kept list (milliseconds, no network). */
async function answerStatus(client) {
  if (running && progress && progress.known) return post(client, progress);
  const manifest = (await loadManifest('cache')) || (await loadManifest('network'));
  const snap = await snapshot(manifest);
  post(client, running && progress && progress.known ? progress : snap); // a download that started meanwhile knows better
}

function precache(client) {
  if (running) {
    if (progress) post(client, progress);
    return running;
  }
  running = runPrecache()
    .catch(async () => broadcast(message({ state: 'error', reason: 'failed', complete: false })))
    .finally(() => {
      running = null;
    });
  return running;
}

/** Run `fn` over `items`, `n` at a time. */
async function pool(items, n, fn) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, lane));
}

/** A newer worker took over and deleted our cache: stop (and don't recreate it with caches.open). */
async function superseded() {
  return !(await caches.keys()).includes(CACHE);
}

async function runPrecache() {
  progress = message({ state: 'running', known: false, doneFiles: 0, doneBytes: 0, totalFiles: 0, totalBytes: 0, failed: 0 });
  // First where the set stands by the kept list, so pages show a complete copy as complete (and a partial one's real
  // progress) while the current list is on its way: on a slow or dead connection that takes up to FETCH_TIMEOUT_MS.
  const kept = await loadManifest('cache');
  if (kept) {
    progress = await snapshot(kept, { state: 'running' });
    await broadcast(progress);
  }
  const manifest = await loadManifest('network'); // no list from the server: offline, nothing to try
  if (!manifest) {
    progress = await snapshot(await loadManifest('cache'), { state: 'error', reason: 'offline' });
    return broadcast(progress);
  }
  const cache = await caches.open(CACHE);
  const have = new Set((await cache.keys()).map((r) => r.url));
  const shellOk = await shellMatches(cache, manifest);
  const todo = manifest.files.filter(
    (f) => !keysFor(f.path).every((url) => have.has(url)) || (f.path === 'index.html' && !shellOk),
  );
  progress = message({
    state: 'running',
    known: true,
    build: manifest.build,
    totalFiles: manifest.files.length,
    totalBytes: manifest.bytes,
    doneFiles: manifest.files.length - todo.length,
    doneBytes: manifest.bytes - todo.reduce((n, f) => n + f.size, 0),
    failed: 0,
    complete: todo.length === 0,
  });
  await broadcast(progress);
  let reason = '';
  let stop = false;
  let sentAt = Date.now();
  let count = 0;
  let lostInARow = 0;
  await pool(todo, PRECACHE_CONCURRENCY, async (f) => {
    if (!stop && ++count % 25 === 0 && (await superseded())) stop = true;
    const result = stop ? 'stopped' : await download(cache, f);
    lostInARow = result === 'network' ? lostInARow + 1 : 0;
    if (result === true) {
      progress.doneFiles++;
      progress.doneBytes += f.size;
    } else {
      progress.failed++;
      reason = reason || result;
      // a full disk fails every file the same way, and so does a lost connection: stop instead of retrying them all
      if (result === 'storage' || lostInARow >= 2 * PRECACHE_CONCURRENCY) stop = true;
    }
    if (Date.now() - sentAt >= PROGRESS_EVERY_MS) {
      sentAt = Date.now();
      await broadcast(progress);
    }
  });
  if (await superseded()) return; // the new worker answers from here on (pages ask it again on controllerchange)
  const failed = progress.failed;
  progress = await snapshot(manifest, failed ? { state: 'error', failed, reason } : { state: 'done' });
  await broadcast(progress);
}

const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json',
  wasm: 'application/wasm', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', woff: 'font/woff',
  webmanifest: 'application/manifest+json',
};

/** Download one manifest file into the cache. true, or why not: 'network' | 'changed' | 'storage'. */
async function download(cache, f) {
  const url = abs(f.path);
  let reason = 'network';
  let bust = false;
  for (let attempt = 0; attempt < PRECACHE_TRIES; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 400 * attempt * attempt));
    try {
      // a copy that came back different (an HTTP/CDN cache still holding the previous deploy): ask past every cache
      const { res, body } = await fetchBody(bust ? `${url}?v=${Date.now()}` : url, { cache: f.immutable ? 'default' : 'no-cache' });
      if (!res.ok) {
        reason = 'network';
        continue;
      }
      if ((await sha16(body)) !== f.hash) {
        reason = 'changed';
        bust = true;
        continue;
      }
      const ext = f.path.slice(f.path.lastIndexOf('.') + 1).toLowerCase();
      const type = res.headers.get('content-type') || TYPES[ext] || 'application/octet-stream';
      for (const key of keysFor(f.path)) await cache.put(key, new Response(body, { headers: { 'content-type': type } }));
      return true;
    } catch (err) {
      if (err && err.name === 'QuotaExceededError') return 'storage';
      reason = 'network';
    }
  }
  return reason;
}
