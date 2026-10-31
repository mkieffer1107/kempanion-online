// Big Brain download sizes (src/lib/ai/llm-client.ts fetchModelSize, which the manager's fetchSizes calls for the
// Settings → BRAIN picker): while the browser is offline (navigator.onLine === false) no Hugging Face HEAD request is
// sent, because it could only fail and log a console error. Cached files still give an exact size; otherwise the
// result is null and the picker keeps the approximate size (approxBytes). llm-client.ts is browser code, so these tests
// stub navigator, fetch and caches and put the real globals back afterwards.
import { afterEach, describe, expect, test } from 'bun:test';
import { fetchModelSize } from '../src/lib/ai/llm-client';
import { MODELS, MODEL_IDS, hfUrl, sizedFiles, type Dtype, type ModelId } from '../src/lib/ai/models';

const saved = new Map<string, PropertyDescriptor | undefined>();
function swap(name: string, value: unknown): void {
  if (!saved.has(name)) saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
afterEach(() => {
  for (const [name, d] of saved) {
    if (d) Object.defineProperty(globalThis, name, d);
    else delete (globalThis as Record<string, unknown>)[name];
  }
  saved.clear();
});

const online = (onLine: boolean | undefined) => swap('navigator', onLine === undefined ? {} : { onLine });

/** The Hub: records every request and answers each HEAD with this Content-Length. */
function hub(bytes = 1_000_000, onRequest?: () => void): { url: string; method: string }[] {
  const calls: { url: string; method: string }[] = [];
  swap('fetch', async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET' });
    onRequest?.();
    return new Response(null, { status: 200, headers: { 'content-length': String(bytes) } });
  });
  return calls;
}

/** Cache Storage ('transformers-cache') holding these file URLs, each with this Content-Length. */
function cacheWith(urls: string[], bytes = 2_000_000): void {
  const kept = new Set(urls);
  swap('caches', {
    open: async () => ({
      match: async (u: string) => (kept.has(u) ? new Response(null, { headers: { 'content-length': String(bytes) } }) : undefined),
    }),
  });
}

const ID: ModelId = 'lite';
const DT: Dtype = 'q4f16';
const URLS = sizedFiles(ID, DT).map((f) => hfUrl(MODELS[ID].repo, f));
/** Config, generation config and tokenizer config: fetchModelSize adds them on top of the sized files. */
const EXTRA = 30_000;

describe('Big Brain size probes while offline', () => {
  test('offline: no HEAD request, and null so the picker keeps the approximate size', async () => {
    online(false);
    const calls = hub();
    expect(await fetchModelSize(ID, DT)).toBeNull();
    expect(calls).toEqual([]);
  });

  test('offline: no request for any tier or dtype', async () => {
    online(false);
    const calls = hub();
    for (const id of MODEL_IDS) {
      for (const dtype of ['q4f16', 'q4'] as const) expect(await fetchModelSize(id, dtype)).toBeNull();
    }
    expect(calls).toEqual([]);
  });

  test('offline with every file cached: the exact size comes from the cache, still without a request', async () => {
    online(false);
    cacheWith(URLS);
    const calls = hub();
    expect(await fetchModelSize(ID, DT)).toBe(URLS.length * 2_000_000 + EXTRA);
    expect(calls).toEqual([]);
  });

  test('offline with only some files cached: null without a request', async () => {
    online(false);
    cacheWith(URLS.slice(0, 1));
    const calls = hub();
    expect(await fetchModelSize(ID, DT)).toBeNull();
    expect(calls).toEqual([]);
  });

  test('going offline mid-probe: no further request', async () => {
    const nav = { onLine: true };
    swap('navigator', nav);
    const calls = hub(1_000_000, () => (nav.onLine = false));
    expect(await fetchModelSize(ID, DT)).toBeNull();
    expect(calls.map((c) => c.url)).toEqual([URLS[0]]);
  });
});

describe('Big Brain size probes while online', () => {
  test('one HEAD request per file that is not cached, summed with the cached ones', async () => {
    online(true);
    cacheWith(URLS.slice(0, 1));
    const calls = hub();
    expect(await fetchModelSize(ID, DT)).toBe(2_000_000 + (URLS.length - 1) * 1_000_000 + EXTRA);
    expect(calls).toEqual(URLS.slice(1).map((url) => ({ url, method: 'HEAD' })));
  });

  test('a browser without navigator.onLine counts as online', async () => {
    online(undefined);
    const calls = hub(5_000);
    expect(await fetchModelSize(ID, DT)).toBe(URLS.length * 5_000 + EXTRA);
    expect(calls.map((c) => c.method)).toEqual(URLS.map(() => 'HEAD'));
  });

  test('a failed probe is still null (approximate size), as before', async () => {
    online(true);
    swap('fetch', async () => {
      throw new TypeError('Load failed');
    });
    expect(await fetchModelSize(ID, DT)).toBeNull();
  });
});
