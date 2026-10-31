import { installNativeHaptics } from './native-haptics';

/** Short, gesture-only Android feedback. Apple uses trusted label surfaces, never synthetic switch clicks. */
export function createHaptics(doc: Document, nav: Navigator, enabled: () => boolean) {
  let last = -Infinity;
  let touchTarget: EventTarget | null = null;
  let touchAt = -Infinity;
  function touchEnd(event: TouchEvent) {
    if (!event.isTrusted) return;
    touchTarget = event.target;
    touchAt = performance.now();
  }
  const appleTouch = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

  function tap(event: Event) {
    const pointer = event as PointerEvent;
    if (!event.isTrusted || doc.visibilityState !== 'visible' || !enabled()) return;
    // Never buzz for mouse/keyboard activation, synthetic clicks, typing, or passive animations.
    const legacyTouch = event.type === 'click' && (!pointer.pointerType || pointer.pointerType === 'mouse') && event.target === touchTarget && performance.now() - touchAt < 700;
    if (pointer.pointerType !== 'touch' && pointer.pointerType !== 'pen' && !legacyTouch) return;
    if ((event.type !== 'click' && pointer.isPrimary === false) || pointer.button > 0) return;
    const time = performance.now();
    if (time - last < 90) return;
    last = time;
    try {
      if (!appleTouch && typeof nav.vibrate === 'function') {
        nav.vibrate(12);
      }
    } catch { /* Unsupported or blocked hardware must never interrupt the game. */ }
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
  return { tap, destroy() {
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
export function hapticTap(event: PointerEvent) { active?.tap(event); }
