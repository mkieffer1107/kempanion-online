// Opt-in offline mode: "Play offline" on the title screen (ui/meta/OfflinePill.svelte).
//
// public/sw.js does the work. Asked with {type: 'kempanion-precache'} it downloads every file in offline-manifest.json
// (the whole game except Big Brain, listed by vite.config.ts) into its cache and posts progress to every open page;
// {type: 'kempanion-offline-status'} only reports where that set stands. This module follows those messages (status,
// bytes done/total), remembers the opt-in per device in localStorage, asks the browser to keep the site's storage
// (navigator.storage.persist; Safari otherwise clears a site's storage after weeks without a visit), and on every
// later online visit asks the worker to top the set up, which after a deploy fetches only the files that changed.
// Every visit first asks where the set stands: the worker answers from its kept list and cache in milliseconds, so a
// complete copy reads OFFLINE READY at once (and a partial one its real progress) however slow or dead the network.
// A download the browser paused or whose worker it stopped resumes as soon as the page is back (tab shown, focus,
// connection back) instead of waiting for the stall timer.
// Without a service worker (the dev server, http://, old browsers, some private windows) it says why instead.

export type OfflineStatus = 'idle' | 'downloading' | 'ready' | 'error';
/** Why offline mode can't work in this browser. */
export type OfflineBlocker = 'dev' | 'insecure' | 'unsupported' | 'no-worker';

/** localStorage key ('on' once the player chose "Download"; all keys share the `kempanion` prefix). */
export const OFFLINE_KEY = 'kempanion.offline';

/** What public/sw.js posts back. */
interface WorkerState {
  type: 'kempanion-offline';
  state: 'idle' | 'running' | 'done' | 'error';
  /** The worker has the file list (sizes below are real). */
  known: boolean;
  totalFiles?: number;
  totalBytes?: number;
  doneFiles?: number;
  doneBytes?: number;
  failed?: number;
  complete?: boolean;
  /** Why a download stopped: 'offline' | 'network' | 'changed' | 'storage' | 'stopped' | 'failed'. */
  reason?: string;
}

/**
 * No word from a running download for this long: the worker was probably stopped, so ask again (a worker that is
 * still at it only reports where it stands: asking joins its download).
 */
export const STALL_MS = 10_000;
/** Asking again this many times without progress means the worker can't do it. */
const MAX_STALLS = 3;
/** Wait this long for a service worker to become active before saying offline mode isn't available. */
const READY_TIMEOUT_MS = 12_000;
/** An opted-in player's background top-up waits this long after start-up, so the game loads first. */
export const TOP_UP_DELAY_MS = 1500;
/** Wake-ups (tab shown, focus, back online) this close to the last request for the download ask once. */
export const WAKE_GAP_MS = 2000;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // blocked
  }
}

function readOptIn(): boolean {
  try {
    return storage()?.getItem(OFFLINE_KEY) === 'on';
  } catch {
    return false;
  }
}

function writeOptIn(on: boolean): void {
  try {
    if (on) storage()?.setItem(OFFLINE_KEY, 'on');
    else storage()?.removeItem(OFFLINE_KEY);
  } catch {
    /* blocked or full: the choice holds for this visit */
  }
}

function detectBlocker(): OfflineBlocker | null {
  if (import.meta.env?.DEV) return 'dev';
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return 'unsupported';
  return null;
}

function isWorkerState(d: unknown): d is WorkerState {
  return !!d && typeof d === 'object' && (d as { type?: unknown }).type === 'kempanion-offline';
}

/** "14 MB", "3.2 MB", "640 KB". */
export function formatSize(bytes: number): string {
  if (!(bytes > 0)) return '0 MB';
  if (bytes >= 10e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

/** Exported for tests; the game uses the one `offline` below. */
export class OfflineMode {
  /** idle: not on this device (or not asked for) · downloading · ready: the whole game is here · error: retry. */
  status = $state<OfflineStatus>('idle');
  /** Set when offline mode can't work here; the pill explains it instead of offering the download. */
  blocker = $state<OfflineBlocker | null>(null);
  /** The player chose "Download" on this device (auto top-ups follow). */
  optedIn = $state(readOptIn());
  /** Size of the offline set, from the manifest (0 until the worker has read it). */
  totalBytes = $state(0);
  doneBytes = $state(0);
  totalFiles = $state(0);
  doneFiles = $state(0);
  /** Why the last download stopped (see WorkerState.reason), '' otherwise. */
  reason = $state('');
  /** navigator.storage.persisted(): the browser promised not to clear the site's storage (null: unknown). */
  persisted = $state<boolean | null>(null);
  /** The worker has answered (or there's no worker to ask). */
  checked = $state(false);
  /** A status question is out and unanswered (the size isn't known yet: the confirm says it's being checked). */
  asking = $state(false);

  /** Whole percent of bytes downloaded. */
  get percent(): number {
    if (this.totalBytes <= 0) return 0;
    return Math.max(0, Math.min(100, Math.floor((100 * this.doneBytes) / this.totalBytes)));
  }

  #started = false;
  /** A download was asked for (tap or top-up) and hasn't reported its end yet. */
  #pending = false;
  /** The player tapped Download this visit (show progress at once, report failures). */
  #userAsked = false;
  /** This opted-in visit's top-up is scheduled but hasn't asked the worker yet. */
  #topUpDue = false;
  /** When the download was last asked for (Date.now()), so a burst of wake-ups asks once. */
  #askedAt = 0;
  #stallTimer: ReturnType<typeof setTimeout> | undefined;
  #stalls = 0;

  /** Start following the service worker. Idempotent; pwa.ts calls it after registering, the pill on mount. */
  init(): void {
    if (this.#started) return;
    this.#started = true;
    this.blocker = detectBlocker();
    if (this.blocker) {
      this.checked = true;
      return;
    }
    const sw = navigator.serviceWorker;
    sw.addEventListener('message', (e: MessageEvent) => this.#onMessage(e.data));
    // a new worker took over (a deploy): it carried the unchanged files over; ask it to finish what's left
    sw.addEventListener('controllerchange', () => {
      if (this.blocker === 'no-worker') this.blocker = null; // it was only slow to start
      void this.#ask(this.#pending || this.optedIn ? 'precache' : 'status');
    });
    sw.startMessages?.();
    // Back online, back to the tab or back from the background: a download the browser paused, or whose worker it
    // stopped, resumes now rather than after STALL_MS (asking while the worker is still at it only joins its download).
    addEventListener('online', () => this.#wake(true));
    addEventListener('focus', () => this.#wake(false));
    addEventListener('pageshow', (e) => {
      if ((e as PageTransitionEvent).persisted) this.#wake(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.#wake(false);
    });
    void navigator.storage?.persisted?.().then((p) => (this.persisted = p), () => {});
    // Where the set stands, at once: the worker answers from its kept list and cache without the network, so a returning
    // player's complete copy reads OFFLINE READY right away (slow connection, Wi-Fi that goes nowhere, airplane mode).
    void this.#ask('status');
    if (this.optedIn && navigator.onLine !== false) {
      this.#topUpDue = true;
      setTimeout(() => void this.#topUp(), TOP_UP_DELAY_MS);
    }
  }

  /**
   * An opted-in visit online: first let a deploy's new worker take over (it carries the unchanged files over and
   * controllerchange then asks it), so the outgoing worker doesn't fetch the new files only to have them dropped.
   */
  async #topUp(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await Promise.race([reg.update(), new Promise((resolve) => setTimeout(resolve, 5000))]);
        if (reg.installing || reg.waiting) {
          this.#topUpDue = false;
          this.#pending = true;
          this.#watch();
          return;
        }
      }
    } catch {
      /* offline or no registration: just ask */
    }
    this.#topUpDue = false;
    await this.#ask('precache');
  }

  /** The page is back (tab shown, focus) or so is the connection: resume a download the browser may have stopped. */
  #wake(online: boolean): void {
    if (this.blocker) return;
    if (this.#pending) {
      if (Date.now() - this.#askedAt >= WAKE_GAP_MS) void this.#ask('precache');
    } else if (online && this.optedIn && this.status !== 'ready' && this.status !== 'downloading') {
      void this.#ask('precache');
    }
  }

  /** The player chose "Download": opt in, ask to keep the storage, download everything that's missing. */
  start(): void {
    this.init();
    if (this.blocker) return;
    this.optedIn = true;
    writeOptIn(true);
    // inside the tap, so browsers that ask the player (Firefox) can show their prompt
    try {
      void navigator.storage?.persist?.().then((p) => (this.persisted = p), () => {});
    } catch {
      /* unsupported */
    }
    this.#userAsked = true;
    this.#stalls = 0;
    this.reason = '';
    this.status = 'downloading';
    void this.#ask('precache');
  }

  /** Ask the worker where the offline set stands (e.g. when the pill is opened). */
  refresh(): void {
    if (!this.#started) return this.init();
    if (!this.blocker && this.status !== 'downloading') void this.#ask('status');
  }

  async #worker(): Promise<ServiceWorker | null> {
    const sw = navigator.serviceWorker;
    if (sw.controller) return sw.controller;
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS));
      const reg = await Promise.race([sw.ready, timeout]);
      return reg?.active ?? null;
    } catch {
      return null;
    }
  }

  async #ask(kind: 'status' | 'precache'): Promise<void> {
    if (kind === 'precache') {
      this.#pending = true;
      this.#askedAt = Date.now();
      this.#watch();
    } else this.asking = true;
    const worker = await this.#worker();
    if (!worker) {
      // registration failed or never finished (blocked, or a very old browser): nothing will answer
      this.#unwatch();
      this.#pending = false;
      this.#topUpDue = false;
      this.blocker = 'no-worker';
      this.checked = true;
      this.asking = false;
      if (this.status === 'downloading') this.status = 'idle';
      return;
    }
    try {
      worker.postMessage({ type: kind === 'precache' ? 'kempanion-precache' : 'kempanion-offline-status' });
    } catch {
      /* the worker is being replaced; controllerchange asks again */
    }
  }

  /** While a download is pending, a silent worker gets asked again (it may have been stopped mid-way). */
  #watch(): void {
    clearTimeout(this.#stallTimer);
    this.#stallTimer = setTimeout(() => {
      if (!this.#pending) return;
      if (++this.#stalls >= MAX_STALLS) {
        this.#pending = false;
        this.reason = 'stopped';
        this.status = this.status === 'ready' ? 'ready' : 'error';
        return;
      }
      void this.#ask('precache');
    }, STALL_MS);
  }

  #unwatch(): void {
    clearTimeout(this.#stallTimer);
  }

  #numbers(data: WorkerState): void {
    this.totalBytes = data.totalBytes ?? 0;
    this.totalFiles = data.totalFiles ?? 0;
    this.doneBytes = data.doneBytes ?? 0;
    this.doneFiles = data.doneFiles ?? 0;
  }

  #onMessage(data: unknown): void {
    if (!isWorkerState(data)) return;
    this.checked = true;
    this.asking = false;
    if (data.state === 'idle' && this.#pending) {
      // A status answer that a download asked for since has overtaken: only a complete copy is news (it reads OFFLINE
      // READY at once). The download's own messages tell the rest, and it shows once it finds something to fetch.
      if (data.known && data.complete && this.status !== 'downloading') {
        this.#numbers(data);
        if (this.optedIn) {
          this.reason = '';
          this.status = 'ready';
        }
      }
      return;
    }
    if (data.known) this.#numbers(data);
    if (data.state === 'running') {
      this.#pending = true;
      this.#stalls = 0;
      this.#watch();
      // A background top-up only shows once there's really something to fetch. Until then (the worker first reports
      // by its kept list, then checks the server's) a complete copy stays ready.
      if (this.#userAsked || (data.known && !data.complete && this.doneFiles < this.totalFiles)) this.status = 'downloading';
      else if (data.known && data.complete && this.optedIn) {
        this.reason = '';
        this.status = 'ready';
      }
      return;
    }
    this.#unwatch();
    const ended = data.state === 'done' || data.state === 'error';
    if (ended) this.#pending = false;
    if (data.complete) {
      // the whole set is here; an 'offline' error only means the update check couldn't reach the server
      this.reason = '';
      this.#userAsked = false;
      this.status = this.optedIn ? 'ready' : 'idle';
      return;
    }
    if (ended && (this.optedIn || this.#userAsked)) {
      this.reason = data.reason || 'changed'; // 'done' yet incomplete: the game was updated meanwhile
      this.status = 'error';
      this.#userAsked = false;
      return;
    }
    if (this.optedIn && !ended) {
      // Opted in but incomplete (a deploy, or a download cut short): show where it stands, never the idle pill, and
      // top it up when there's a connection (the top-up this visit has scheduled does it, after the game has loaded).
      if (navigator.onLine === false) {
        this.reason = 'offline';
        this.status = 'error';
      } else {
        this.status = 'downloading';
        if (!this.#topUpDue) void this.#ask('precache');
      }
      return;
    }
    this.status = 'idle';
  }
}

export const offline = new OfflineMode();
