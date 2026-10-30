// Global UI state shared by App and the screens: motion preference, display prefs, the pager menu and
// shortcut overlay, the Esc stack, per-screen key handlers, and the screen-reader announcer.
import { game } from '../state/game.svelte';

export type TextSize = 's' | 'm' | 'l' | 'xl';
export type PetalPref = 'lots' | 'some' | 'off';

class UiState {
  /** OS-level prefers-reduced-motion. */
  systemReduce = $state(false);
  /** Esc on game screens: the pager menu. */
  menu = $state(false);
  /** ? / F1: keyboard shortcut overlay. */
  help = $state(false);
  /** Last polite announcement for screen readers. */
  announcement = $state('');

  constructor() {
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      this.systemReduce = mq.matches;
      mq.addEventListener?.('change', (e) => { this.systemReduce = e.matches; });
    }
  }

  /** Player setting OR the OS preference. */
  get reduceMotion(): boolean {
    return game.save.settings.reduceMotion || this.systemReduce;
  }

  get textSize(): TextSize {
    const v = game.save.flags['ui.textSize'];
    return v === 's' || v === 'l' || v === 'xl' ? v : 'm';
  }

  get petals(): PetalPref {
    const v = game.save.flags['ui.petals'];
    return v === 'lots' || v === 'off' ? v : 'some';
  }

  get highContrast(): boolean {
    return game.save.flags['ui.highContrast'] === true;
  }

  announce(text: string) {
    // Re-setting identical text wouldn't be re-read; nudge with a zero-width suffix.
    this.announcement = text === this.announcement ? `${text}​` : text;
  }
}

export const ui = new UiState();

// ── Esc stack: open modals/sheets register a closer; Esc closes the topmost one ──

const closers: (() => void)[] = [];

export function pushEscape(close: () => void): () => void {
  closers.push(close);
  return () => {
    const i = closers.lastIndexOf(close);
    if (i >= 0) closers.splice(i, 1);
  };
}

/** Close the topmost modal. Returns false when nothing was open. */
export function closeTopmost(): boolean {
  const close = closers[closers.length - 1];
  if (!close) return false;
  close();
  return true;
}

export function modalOpen(): boolean {
  return closers.length > 0;
}

// ── per-screen keyboard handling (App offers each keydown to the active screen first) ──

export type KeyHandler = (e: KeyboardEvent) => boolean | void;
let screenKeys: KeyHandler | null = null;

/** Register the active screen's key handler; returns an unregister function for onDestroy/$effect cleanup. */
export function setScreenKeys(handler: KeyHandler): () => void {
  screenKeys = handler;
  return () => { if (screenKeys === handler) screenKeys = null; };
}

export function offerScreenKey(e: KeyboardEvent): boolean {
  return screenKeys ? screenKeys(e) === true : false;
}
