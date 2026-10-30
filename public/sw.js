/* Kempanion Online — service worker (offline app shell).
 *
 * - Versioned cache "kempanion-shell-<VERSION>"; activate deletes only OUR older versions.
 *   Caches we didn't create (e.g. transformers.js' "transformers-cache" for Big Brain models) are never touched.
 * - Navigations and index.html: network-first (fresh deploys win), falling back to the cached shell offline.
 * - Same-origin GET assets under our scope: cache-first. Content-hashed build files are immutable;
 *   other files (public/ art like backgrounds) are refreshed in the background after being served.
 * - Cross-origin requests (huggingface.co model downloads, CDNs) are never intercepted.
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
const MAX_ENTRIES = 600;
const NAV_TIMEOUT_MS = 4000;
const HASHED = /[-.][A-Za-z0-9_-]{8,}\.(?:m?js|css|wasm|woff2?|ttf|png|jpe?g|gif|svg|webp|avif|json)$/;
/** Unhashed files already revalidated while this worker has been alive (one 304 check each, not one per hit). */
const revalidated = new Set();

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        SHELL.map(async (path) => {
          try {
            const url = new URL(path, SCOPE).href;
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

/** Only complete, non-opaque responses are cached. */
function cacheable(res) {
  return !!res && res.ok && (res.type === 'basic' || res.type === 'default');
}

/** A cacheable copy of a response (drops the "redirected" flag Safari refuses to serve for navigations). */
async function cleanCopy(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
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
    (await cache.match(shellKey(url))) ||
    (await cache.match(new URL('./', SCOPE).href)) ||
    (await cache.match(new URL('./index.html', SCOPE).href))
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
  const hit = await cache.match(req);
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
      // oldest first (insertion order); never evict the shell itself
      const victims = keys.filter((k) => !SHELL_URLS.has(k.url)).slice(0, extra);
      await Promise.all(victims.map((k) => cache.delete(k)));
    }
  } catch {
    /* quota exceeded or similar: serving still works without the cache */
  }
}
