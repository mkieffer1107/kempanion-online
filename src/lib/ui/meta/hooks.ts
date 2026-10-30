// Glue between the meta UI and other modules:
//  • vnHooks.pickCompanion → the "Who's your Kempanion?" cards as a modal overlay (resolves with the PigId)
//  • a tiny tracker that marks songs as heard (save.counters['heard:<id>']) for the Music Room
// (vnHooks.enterName / runMinigame are registered by App.svelte.)
import { mount, unmount } from 'svelte';
import { vnHooks } from '../../vn';
import type { PigId } from '../../types';
import { audio } from '../../audio';
import CompanionPicker from './CompanionPicker.svelte';
import { markHeard } from './heard';

export { HEARD_PREFIX, markHeard } from './heard';

/** A fresh host inside #app for a modal overlay. */
function overlayHost(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'km-overlay-host';
  (document.getElementById('app') ?? document.body).appendChild(el);
  return el;
}

/** Make everything else in #app inert while a modal overlay is up; returns the undo. */
function isolate(host: HTMLElement): () => void {
  const others = [...(host.parentElement?.children ?? [])].filter((el): el is HTMLElement => el !== host && el instanceof HTMLElement);
  const before = others.map((el) => el.inert);
  others.forEach((el) => (el.inert = true));
  return () => others.forEach((el, i) => (el.inert = before[i]));
}

/** Stop pointer events at the host so the scene below stays put. Must run AFTER mount(): Svelte's delegated
 *  listener on the same node has to run first, or it would see cancelBubble and skip our buttons. */
function shield(el: HTMLElement) {
  const stop = (e: Event) => e.stopPropagation();
  for (const type of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'wheel']) el.addEventListener(type, stop);
}

let picking: Promise<PigId> | null = null;

/** Show the companion cards over whatever is on screen; resolves with the chosen pig (also saved as companion). */
export function openCompanionPicker(): Promise<PigId> {
  if (picking) return picking;
  picking = new Promise<PigId>((resolve) => {
    const target = overlayHost();
    const restore = isolate(target);
    let inst: ReturnType<typeof mount> | null = null;
    const done = (pig: PigId) => {
      picking = null;
      restore();
      resolve(pig);
      queueMicrotask(() => {
        if (inst) void unmount(inst);
        inst = null;
        target.remove();
      });
    };
    inst = mount(CompanionPicker, { target, props: { mode: 'overlay', onChosen: done } });
    shield(target);
  });
  return picking;
}

let registered = false;

/** Idempotent; every meta screen module calls it so the hook exists before any scene can run. */
export function registerMetaHooks(): void {
  if (registered || typeof window === 'undefined') return;
  registered = true;
  vnHooks.pickCompanion = openCompanionPicker;
  setInterval(() => {
    try { markHeard(audio.currentSong()); } catch { /* audio optional */ }
  }, 2000);
}
