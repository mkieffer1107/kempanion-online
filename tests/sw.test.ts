// public/sw.js in a mocked service-worker environment (no browser needed).
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CODE = readFileSync(join(import.meta.dir, '../public/sw.js'), 'utf8');
const SCOPE = 'https://user.github.io/kempanion/';
type Handler = (ev: any) => void;

function env(net: (url: string) => Response | Promise<Response>) {
  const listeners: Record<string, Handler> = {};
  const store = new Map<string, Map<string, Response>>();
  const fetched: string[] = [];
  const bucket = (m: Map<string, Response>) => ({
    match: async (req: any, o?: { ignoreSearch?: boolean }) => {
      let u: string = typeof req === 'string' ? req : req.url;
      if (o?.ignoreSearch) u = u.split('?')[0];
      return m.get(u)?.clone();
    },
    put: async (req: any, res: Response) => void m.set(typeof req === 'string' ? req : req.url, res.clone()),
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
  const fetchMock = async (req: any) => {
    const url = typeof req === 'string' ? req : req.url;
    fetched.push(url);
    return net(url);
  };
  const self = {
    registration: { scope: SCOPE, navigationPreload: { enable: async () => {} } },
    location: { origin: 'https://user.github.io' },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    addEventListener: (type: string, fn: Handler) => (listeners[type] = fn),
  };
  new Function('self', 'caches', 'fetch', CODE)(self, caches, fetchMock);

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
  return { listeners, store, fetched, fire, request };
}

const ok = (body: string) => new Response(body, { status: 200 });
const settle = (w: Promise<unknown>[]) => Promise.all(w.map((p) => p.catch(() => {})));

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
