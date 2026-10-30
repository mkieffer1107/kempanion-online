// Svelte action: while a text field inside `node` has focus, translate `node` up just enough to clear the
// on-screen keyboard (visualViewport). Does nothing when the layout already resized (Android with
// interactive-widget=resizes-content, or a shell sized from --vvh), so it never double-lifts.
export function liftAboveKeyboard(node: HTMLElement, enabled = true) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  let on = enabled;
  let lift = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const apply = (next: number) => {
    if (next === lift) return;
    lift = next;
    node.style.translate = lift ? `0 ${-lift}px` : '';
  };
  const update = () => {
    if (!vv || !on) return apply(0);
    const active = document.activeElement as HTMLElement | null;
    if (!active || !node.contains(active) || !active.matches('input, textarea')) return apply(0);
    const bottom = node.getBoundingClientRect().bottom + lift;
    const visibleBottom = vv.offsetTop + vv.height;
    apply(Math.max(0, Math.ceil(bottom - visibleBottom) + (bottom > visibleBottom ? 6 : 0)));
  };
  const later = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(update, 60);
  };

  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  node.addEventListener('focusin', later);
  node.addEventListener('focusout', later);

  return {
    update(next: boolean) {
      on = next;
      update();
    },
    destroy() {
      if (timer) clearTimeout(timer);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      node.removeEventListener('focusin', later);
      node.removeEventListener('focusout', later);
      node.style.translate = '';
    },
  };
}
