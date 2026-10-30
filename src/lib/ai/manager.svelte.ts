// Big Brain manager (Svelte 5 runes): capability detection, cache/size info, consent-gated load, cancel,
// unload, remove, autoload with a crash-loop guard, progress/speed/ETA, tokens/s, and toast-able notices.
// Importing this module also installs the AI host (settings, memories, LLM) used by index.ts → respond().
import { game } from '../state/game.svelte';
import { CHARACTERS } from '../content/characters';
import * as client from './llm-client';
import { LlmError } from './llm-client';
import { BIG_BRAIN_FLAGS, installAiHost, type AiStatus, type LlmGenerateOptions } from './host';
import type { GenResult, LlmMessage, LoadPhase, LoadProgress } from './llm-protocol';
import {
  MODELS, MODEL_IDS, availability, dtypeFor, formatBytes, recommendDefault, resolveModelId,
  type DeviceCaps, type Dtype, type ModelId,
} from './models';

export type { AiStatus } from './host';

export interface AiCaps extends DeviceCaps {
  /** detect() has run. */
  checked: boolean;
  /** Why WebGPU is unavailable: 'no-api' (no navigator.gpu), 'no-adapter' (blocklisted GPU), 'error'. */
  reason: string | null;
  /** GPU vendor/architecture, when the browser tells us. */
  adapter: string | null;
  /** navigator.storage.estimate() in bytes. */
  storage: { quota: number; usage: number } | null;
  /** Data Saver is on. */
  saveData: boolean;
  /** Cellular / slow connection reported by navigator.connection. */
  cellular: boolean;
}

export interface AiProgress {
  loaded: number;
  total: number;
  file: string;
  /** Bytes per second (smoothed). */
  speed: number;
  /** Seconds remaining (0 = unknown). */
  eta: number;
  fromCache: boolean;
  files: number;
  filesDone: number;
}

/** Checklist position while loading: WebGPU check → Download → Prepare → Warm-up. */
export type AiPhase = 'idle' | 'download' | 'prepare' | 'warmup' | 'done';

export interface AiNotice {
  id: number;
  kind: 'info' | 'success' | 'error';
  text: string;
}

export const UNSUPPORTED_TEXT =
  "Your browser can't run Big Brain yet (it needs WebGPU: recent Chrome or Edge, or Safari 26+). The Heuristic Brain works great and needs no download.";
export const MOBILE_DATA_TEXT = "Looks like you're on mobile data. Maybe wait for Wi-Fi?";

const GUARD_KEY = 'kempanion.ai.loading';

function readGuard(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(GUARD_KEY);
  } catch {
    return null;
  }
}
function writeGuard(id: ModelId): void {
  try {
    localStorage.setItem(GUARD_KEY, id);
  } catch {
    /* storage blocked */
  }
}
function clearGuard(): void {
  try {
    localStorage.removeItem(GUARD_KEY);
  } catch {
    /* storage blocked */
  }
}

function emptyProgress(): AiProgress {
  return { loaded: 0, total: 0, file: '', speed: 0, eta: 0, fromCache: false, files: 0, filesDone: 0 };
}

function unknownCaps(): AiCaps {
  return {
    checked: false, webgpu: false, shaderF16: false, mobile: false, ios: false, deviceMemory: null,
    reason: null, adapter: null, storage: null, saveData: false, cellular: false,
  };
}

type NavigatorExtras = Navigator & {
  gpu?: { requestAdapter(opts?: { powerPreference?: string }): Promise<GpuAdapterLike | null> };
  deviceMemory?: number;
  userAgentData?: { mobile?: boolean };
  connection?: { saveData?: boolean; type?: string; effectiveType?: string };
};
interface GpuAdapterLike {
  features: { has(name: string): boolean };
  info?: { vendor?: string; architecture?: string; description?: string };
}

async function probeCaps(): Promise<AiCaps> {
  const caps = unknownCaps();
  caps.checked = true;
  if (typeof navigator === 'undefined') {
    caps.reason = 'no-api';
    return caps;
  }
  const nav = navigator as NavigatorExtras;
  const ua = nav.userAgent ?? '';
  caps.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  caps.mobile = caps.ios || nav.userAgentData?.mobile === true || /Android|Mobi/i.test(ua);
  caps.deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const conn = nav.connection;
  caps.saveData = !!conn?.saveData;
  caps.cellular = conn?.type === 'cellular' || /^(slow-2g|2g|3g)$/.test(conn?.effectiveType ?? '');

  if (!nav.gpu) caps.reason = 'no-api';
  else if (typeof Worker === 'undefined' || typeof caches === 'undefined') caps.reason = 'no-api';
  else {
    try {
      const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) caps.reason = 'no-adapter';
      else {
        caps.webgpu = true;
        caps.shaderF16 = adapter.features.has('shader-f16');
        const i = adapter.info;
        caps.adapter = [i?.vendor, i?.architecture || i?.description].filter(Boolean).join(' ') || null;
      }
    } catch {
      caps.reason = 'error';
    }
  }
  caps.storage = await estimateStorage();
  return caps;
}

async function estimateStorage(): Promise<{ quota: number; usage: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    return est ? { quota: est.quota ?? 0, usage: est.usage ?? 0 } : null;
  } catch {
    return null;
  }
}

function friendlyError(e: LlmError): string {
  switch (e.code) {
    case 'quota':
      return 'Not enough storage space for this model. Try Lite, or free up some space.';
    case 'network':
      return 'The download was interrupted. Check your connection and try again; finished files are kept.';
    case 'device-lost':
      return 'Big Brain took a nap (the GPU reset). Using the Heuristic Brain.';
    case 'oom':
      return 'Your device ran out of memory for this model. Try a smaller one.';
    case 'unsupported':
      return "This browser's WebGPU can't run this model. The Heuristic Brain still works great.";
    case 'crashed':
      return 'Big Brain crashed while starting. The Heuristic Brain is still here.';
    default:
      return `Big Brain couldn't start (${e.message.slice(0, 120)}). The Heuristic Brain is still here.`;
  }
}

class AiManager {
  status = $state<AiStatus>('idle');
  phase = $state<AiPhase>('idle');
  progress = $state<AiProgress>(emptyProgress());
  /** The model that is loaded and ready. */
  modelId = $state<ModelId | null>(null);
  /** The model being downloaded/loaded. */
  loadingId = $state<ModelId | null>(null);
  error = $state<string | null>(null);
  errorCode = $state<string | null>(null);
  caps = $state<AiCaps>(unknownCaps());
  /** Fully cached (no download needed) per tier, for the current dtype. */
  cached = $state<Record<ModelId, boolean>>({ lfm3: false, lfm25: false, lite: false });
  /** Real download sizes in bytes (fetched when the panel opens). */
  sizes = $state<Partial<Record<ModelId, number>>>({});
  tokensPerSec = $state(0);
  /** Last generation stats (prompt tokens, KV-cache reuse, time to first token). */
  lastRun = $state<{ promptTokens: number; reusedTokens: number; firstTokenMs: number; tokens: number } | null>(null);
  lastNotice = $state<AiNotice | null>(null);
  /** The page died during the last load attempt: no autoload until a manual load succeeds. */
  crashGuard = $state(readGuard() !== null);

  /** Default tier for this device. */
  recommended = $derived(recommendDefault(this.caps));
  dtype = $derived<Dtype>(dtypeFor(this.caps));
  /** Downloading, loading or warming up. */
  busy = $derived(this.status === 'downloading' || this.status === 'loading' || this.status === 'warming');

  #detecting: Promise<AiCaps> | null = null;
  #sizesFetched = false;
  #loadPromise: Promise<boolean> | null = null;
  #lastT = 0;
  #lastLoaded = 0;
  #speed = 0;
  #failures = 0;
  #noticeId = 0;
  #noticeListeners = new Set<(n: AiNotice) => void>();

  constructor() {
    client.onDeviceLost(() => this.#lost('Big Brain took a nap (the GPU reset). Using the Heuristic Brain.', 'device-lost'));
    client.onCrash(() => this.#lost('Big Brain crashed. Using the Heuristic Brain.', 'crashed'));
  }

  /** Probe WebGPU, shader-f16, phone/iOS, memory, storage and connection; then refresh the cache map. */
  detect(force = false): Promise<AiCaps> {
    if (this.#detecting && !force) return this.#detecting;
    this.#detecting = (async () => {
      if (this.status === 'idle' || this.status === 'unsupported') this.status = 'checking';
      let caps: AiCaps;
      try {
        caps = await probeCaps();
      } catch {
        caps = { ...unknownCaps(), checked: true, reason: 'error' };
      }
      this.caps = caps;
      if (this.status === 'checking') this.status = caps.webgpu ? 'idle' : 'unsupported';
      await this.refreshCached();
      return caps;
    })();
    return this.#detecting;
  }

  async refreshCached(): Promise<Record<ModelId, boolean>> {
    const dtype = dtypeFor(this.caps);
    const results = await Promise.all(MODEL_IDS.map(async (id) => [id, await client.isCached(id, dtype)] as const));
    const next = { ...this.cached };
    for (const [id, v] of results) next[id] = v;
    this.cached = next;
    return next;
  }

  /** Real download sizes (cache headers or HEAD requests). Approximate sizes are used until these arrive. */
  async fetchSizes(force = false): Promise<Partial<Record<ModelId, number>>> {
    if (this.#sizesFetched && !force) return this.sizes;
    this.#sizesFetched = true;
    if (!this.caps.checked) await this.detect();
    const dtype = dtypeFor(this.caps);
    await Promise.all(
      MODEL_IDS.map(async (id) => {
        const n = await client.fetchModelSize(id, dtype);
        if (n) this.sizes = { ...this.sizes, [id]: n };
      }),
    );
    return this.sizes;
  }

  /** Download size for the picker: real when known, else the approximate size for this GPU's dtype. */
  sizeOf(id: ModelId): { bytes: number; exact: boolean; label: string } {
    const real = this.sizes[id];
    const bytes = real ?? MODELS[id].approxBytes[dtypeFor(this.caps)];
    return { bytes, exact: !!real, label: `${real ? '' : '~'}${formatBytes(bytes)}` };
  }

  /** Free space from the storage estimate (null = unknown). */
  get freeBytes(): number | null {
    const s = this.caps.storage;
    return s && s.quota > 0 ? Math.max(0, s.quota - s.usage) : null;
  }

  /** The tier the settings point at (old values like 'lfm' map to the recommendation). */
  get selectedId(): ModelId {
    return resolveModelId(game.save.settings.aiModel, this.caps);
  }

  /**
   * Download (or read from cache), compile and warm up a model. Only call after the player said yes (the UI does).
   * With optIn (default) a successful load switches the chat brain to Big.
   */
  load(id: ModelId, opts: { optIn?: boolean } = {}): Promise<boolean> {
    if (this.#loadPromise) return this.#loadPromise;
    this.#loadPromise = this.#load(id, opts).finally(() => {
      this.#loadPromise = null;
    });
    return this.#loadPromise;
  }

  async #load(id: ModelId, opts: { optIn?: boolean }): Promise<boolean> {
    const caps = this.caps.checked ? this.caps : await this.detect();
    if (!caps.webgpu) {
      this.status = 'unsupported';
      return false;
    }
    const av = availability(id, caps);
    if (!av.ok) {
      this.#fail(av.reason ?? 'This model is not available on this device.', 'unsupported', true);
      return false;
    }
    const dtype = dtypeFor(caps);
    this.loadingId = id;
    this.error = null;
    this.errorCode = null;
    this.progress = emptyProgress();
    this.#lastT = 0;
    this.#lastLoaded = 0;
    this.#speed = 0;
    this.status = this.cached[id] ? 'loading' : 'downloading';
    this.phase = 'download';
    if (this.modelId && this.modelId !== id) this.modelId = null; // the client swaps workers
    writeGuard(id);
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* best effort: ask the browser not to evict the model */
    }
    try {
      await client.load(id, { dtype, onProgress: (p) => this.#onProgress(p), onPhase: (ph) => this.#onPhase(ph) });
      clearGuard();
      this.crashGuard = false;
      this.modelId = id;
      this.loadingId = null;
      this.status = 'ready';
      this.phase = 'done';
      this.#failures = 0;
      this.cached = { ...this.cached, [id]: true };
      const s = game.save.settings;
      s.aiModel = id;
      if (opts.optIn !== false) s.aiMode = 'llm';
      game.persist();
      this.#notify('success', `Big Brain ready (${MODELS[id].label}). Try asking ${CHARACTERS['piggy-3'].name} anything.`);
      void this.#refreshStorage();
      return true;
    } catch (e) {
      clearGuard();
      this.loadingId = null;
      const err = e instanceof LlmError ? e : new LlmError(String((e as Error)?.message ?? e), 'load');
      if (err.code === 'cancelled') {
        if (this.status !== 'ready') {
          this.status = this.caps.webgpu ? 'idle' : 'unsupported';
          this.phase = 'idle';
        }
        void this.refreshCached();
        return false;
      }
      client.terminate('Load failed.');
      this.#fail(friendlyError(err), err.code, true);
      void this.refreshCached();
      return false;
    }
  }

  #onPhase(phase: LoadPhase): void {
    this.phase = phase;
    if (phase === 'prepare') this.status = 'loading';
    else if (phase === 'warmup') this.status = 'warming';
  }

  #onProgress(p: LoadProgress): void {
    const t = performance.now();
    if (!this.#lastT) {
      this.#lastT = t;
      this.#lastLoaded = p.loaded;
    } else {
      const dt = (t - this.#lastT) / 1000;
      if (dt >= 0.5) {
        const inst = Math.max(0, (p.loaded - this.#lastLoaded) / dt);
        this.#speed = this.#speed ? this.#speed * 0.7 + inst * 0.3 : inst;
        this.#lastT = t;
        this.#lastLoaded = p.loaded;
      }
    }
    const remaining = Math.max(0, p.total - p.loaded);
    this.progress = {
      loaded: p.loaded,
      total: p.total,
      file: p.file,
      speed: this.#speed,
      eta: this.#speed > 1 && remaining > 0 ? remaining / this.#speed : 0,
      fromCache: p.fromCache,
      files: p.files,
      filesDone: p.filesDone,
    };
    if (p.fromCache && this.status === 'downloading') this.status = 'loading';
  }

  /** Cancel a download/load in progress (finished files stay cached), or interrupt a reply being generated. */
  cancel(): void {
    client.cancel();
  }

  /** Free the model's memory; the files stay cached for next time. */
  async unload(): Promise<void> {
    if (this.busy) client.cancel();
    await client.unload();
    this.modelId = null;
    this.loadingId = null;
    this.tokensPerSec = 0;
    this.status = this.caps.checked && !this.caps.webgpu ? 'unsupported' : 'idle';
    this.phase = 'idle';
  }

  /** Delete a model's cached files. Returns the bytes freed (approximate). */
  async remove(id: ModelId): Promise<number> {
    if (this.loadingId === id) client.cancel();
    if (this.modelId === id) await this.unload();
    const bytes = await client.cachedBytes(id);
    await client.removeCached(id);
    await this.refreshCached();
    await this.#refreshStorage();
    this.#notify('info', bytes > 0 ? `Removed ${MODELS[id].label} (freed ${formatBytes(bytes)}).` : `Removed ${MODELS[id].label}.`);
    return bytes;
  }

  /**
   * On startup: load the selected model only if settings.aiAutoload is on, the model is ALREADY cached
   * (never downloads), the device supports it, and the last load attempt didn't crash the page.
   */
  async autoload(): Promise<boolean> {
    if (!game.save.settings.aiAutoload || this.crashGuard || this.busy || this.status === 'ready') return false;
    const caps = await this.detect();
    if (!caps.webgpu) return false;
    if (caps.deviceMemory !== null && caps.deviceMemory < 4) return false;
    const id = resolveModelId(game.save.settings.aiModel, caps);
    if (!availability(id, caps).ok || !this.cached[id]) return false;
    return this.load(id, { optIn: false });
  }

  /** Used by respond() through the AI host. */
  async generate(messages: LlmMessage[], opts: LlmGenerateOptions): Promise<GenResult> {
    if (this.status !== 'ready') throw new LlmError('Big Brain is not ready.', 'generate');
    const r = await client.generate(messages, opts);
    if (r.tps > 0 && r.tokens > 2) this.tokensPerSec = Math.round(r.tps * 10) / 10;
    this.lastRun = { promptTokens: r.promptTokens, reusedTokens: r.reusedTokens, firstTokenMs: r.firstTokenMs, tokens: r.tokens };
    this.#failures = 0;
    return r;
  }

  /** A generation failed: give up on the model after a lost device, a crash, or two failures in a row. */
  reportFailure(err: unknown): void {
    const code = err instanceof LlmError ? err.code : 'generate';
    // 'terminated' = we stopped the worker on purpose (unload, model switch); not the model's fault.
    if (code === 'cancelled' || code === 'busy' || code === 'terminated') return;
    this.#failures++;
    if (code === 'device-lost' || code === 'crashed' || code === 'oom' || this.#failures >= 2) {
      client.terminate('Big Brain stopped after errors.');
      this.#lost('Big Brain took a nap. Using the Heuristic Brain.', code);
    }
  }

  /** Subscribe to toast-able notices (ready, errors, removals). Returns an unsubscribe function. */
  onNotice(cb: (n: AiNotice) => void): () => void {
    this.#noticeListeners.add(cb);
    return () => this.#noticeListeners.delete(cb);
  }

  #lost(text: string, code: string): void {
    if (this.busy) return; // a load in progress rejects and reports it itself
    const wasReady = this.status === 'ready';
    this.modelId = null;
    this.loadingId = null;
    if (wasReady) this.#fail(text, code, true);
  }

  #fail(text: string, code: string, notify: boolean): void {
    this.status = 'error';
    this.phase = 'idle';
    this.error = text;
    this.errorCode = code;
    if (notify) this.#notify('error', text);
  }

  #notify(kind: AiNotice['kind'], text: string): void {
    const n: AiNotice = { id: ++this.#noticeId, kind, text };
    this.lastNotice = n;
    for (const cb of this.#noticeListeners) {
      try {
        cb(n);
      } catch {
        /* a listener failing must not break the manager */
      }
    }
  }

  async #refreshStorage(): Promise<void> {
    const storage = await estimateStorage();
    if (storage) this.caps = { ...this.caps, storage };
  }
}

export const aiManager = new AiManager();

// ── AI host for respond(): game settings + memories, and the LLM when it's ready ──
installAiHost({
  settings: () => game.save.settings,
  remember: (pig, fact) => game.remember(pig, fact),
  forget: (pig, predicate) => {
    const list = game.save.memories[pig];
    if (!list) return;
    for (const fact of [...list]) {
      if (!predicate(fact)) continue;
      if (typeof game.forget === 'function') game.forget(pig, fact);
      else {
        const i = list.indexOf(fact);
        if (i >= 0) list.splice(i, 1);
      }
    }
  },
  countExchange: () => {
    const k = BIG_BRAIN_FLAGS.chats;
    game.save.flags[k] = (Number(game.save.flags[k]) || 0) + 1;
    game.persist();
  },
  persist: () => game.persist(),
  llm: {
    status: () => aiManager.status,
    modelId: () => aiManager.modelId,
    supported: () => (aiManager.caps.checked ? aiManager.caps.webgpu : null),
    generate: (messages, opts) => aiManager.generate(messages, opts),
    reportFailure: (err) => aiManager.reportFailure(err),
  },
});
