import { installNativeHaptics } from './native-haptics';

/** Short Android tap and typewriter feedback. Apple uses trusted label surfaces, never synthetic switch clicks. */
export function createHaptics(doc: Document, nav: Navigator, enabled: () => boolean, clock: () => number = () => performance.now()) {
  let last = -Infinity;
  let lastText = -Infinity;
  let interacted = false;
  let touchTarget: EventTarget | null = null;
  let touchAt = -Infinity;
  function touchEnd(event: TouchEvent) {
    if (!event.isTrusted) return;
    interacted = true;
    touchTarget = event.target;
    touchAt = clock();
  }
  const appleTouch = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

  function tap(event: Event) {
    const pointer = event as PointerEvent;
    if (!event.isTrusted || doc.visibilityState !== 'visible' || !enabled()) return;
    // Mouse/keyboard activation and synthetic clicks are not direct touch feedback.
    const legacyTouch = event.type === 'click' && (!pointer.pointerType || pointer.pointerType === 'mouse') && event.target === touchTarget && clock() - touchAt < 700;
    if (pointer.pointerType !== 'touch' && pointer.pointerType !== 'pen' && !legacyTouch) return;
    if ((event.type !== 'click' && pointer.isPrimary === false) || pointer.button > 0) return;
    interacted = true;
    const time = clock();
    if (time - last < 90) return;
    last = time;
    try {
      if (!appleTouch && typeof nav.vibrate === 'function') {
        nav.vibrate(20);
      }
    } catch { /* Unsupported or blocked hardware must never interrupt the game. */ }
  }

  function text() {
    // Safari's trusted native switch has no programmable intensity or timer API.
    // This path uses only the Vibration API, after a real mobile interaction.
    if (appleTouch || nav.maxTouchPoints < 1 || typeof nav.vibrate !== 'function') return;
    if (doc.visibilityState !== 'visible' || !enabled()) return;
    if (nav.userActivation?.hasBeenActive === false || (!interacted && !nav.userActivation?.hasBeenActive)) return;
    const time = clock();
    if (time - lastText < 120 || time - last < 90) return;
    lastText = time;
    try { nav.vibrate(7); } catch { /* optional feedback */ }
  }

  function click(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('button, a[href], [role="button"], [role="switch"], [role="radio"]');
    if (!control || control.closest('[disabled], [aria-disabled="true"], [inert], [data-haptics="off"]')) return;
    tap(event);
  }
  function cancel() {
    try { if (!appleTouch) nav.vibrate?.(0); } catch { /* best effort */ }
  }
  function visibility() { if (doc.visibilityState !== 'visible') cancel(); }
  doc.addEventListener('touchend', touchEnd, { capture: true, passive: true });
  doc.addEventListener('click', click, true);
  doc.addEventListener('visibilitychange', visibility);
  return { tap, text, destroy() {
    doc.removeEventListener('touchend', touchEnd, true);
    doc.removeEventListener('click', click, true);
    doc.removeEventListener('visibilitychange', visibility);
    cancel();
  } };
}

let active: ReturnType<typeof createHaptics> | undefined;
export function installHaptics(enabled: () => boolean) {
  active?.destroy();
  const controller = createHaptics(document, navigator, enabled);
  active = controller;
  const appleTouch = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const stopNative = appleTouch ? installNativeHaptics(document, enabled) : undefined;
  return () => { stopNative?.(); controller.destroy(); if (active === controller) active = undefined; };
}
/** For canvas interactions that have no button; call only after a successful hit test. */
export function hapticTap(event: MouseEvent | PointerEvent) { active?.tap(event); }

/** Called by natural typewriter letter progress; no timers or synthetic native-switch toggles. */
export function hapticText() { active?.text(); }
