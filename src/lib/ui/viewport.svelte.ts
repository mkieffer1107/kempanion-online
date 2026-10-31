// Reactive viewport: size, layout mode (see ./layout/mode.ts), pointer type. Also mirrors the visual
// viewport into --vvh / --vvt so the chat input stays above on-screen keyboards (iOS ignores
// interactive-widget=resizes-content).
import { layoutMode, type LayoutMode } from './layout/mode';

export { layoutMode, type LayoutMode };

class Viewport {
  w = $state(1280);
  h = $state(720);
  /** Layout height (ignores the on-screen keyboard), used to pick the mode so it doesn't flip while typing. */
  layoutH = $state(720);
  mode = $derived<LayoutMode>(layoutMode(this.w, this.layoutH));
  /** On-screen keyboard is probably open (visual viewport much shorter than the layout viewport). */
  keyboard = $derived(this.layoutH - this.h > 120);
  coarse = $state(false);

  constructor() {
    if (typeof window === 'undefined') return;
    let lastW = 0;
    const typing = () => !!document.activeElement?.matches?.('input, textarea');
    const update = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? innerWidth);
      this.w = w;
      this.h = Math.round(vv?.height ?? innerHeight);
      // Android (interactive-widget=resizes-content) shrinks innerHeight for the keyboard too: while a field has
      // focus and the width is unchanged, keep the layout height, or the mode flips T → S and the field is torn down.
      const next = Math.round(Math.max(innerHeight, this.h));
      this.layoutH = typing() && w === lastW ? Math.max(this.layoutH, next) : next;
      lastW = w;
      const root = document.documentElement.style;
      root.setProperty('--vvh', `${this.h}px`);
      root.setProperty('--vvt', `${Math.round(vv?.offsetTop ?? 0)}px`);
    };
    update();
    addEventListener('resize', update);
    addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    // iOS scrolls the page to show a focused field and sometimes leaves it there after the keyboard closes, which
    // shifts the whole (fixed) game up under the browser bar. The game never scrolls the page itself, so put it back
    // once focus leaves the text fields.
    let settle: ReturnType<typeof setTimeout> | null = null;
    addEventListener('focusout', (e) => {
      if (!(e.target as Element | null)?.matches?.('input, textarea, select')) return;
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => {
        if (document.activeElement?.matches('input, textarea, select')) return;
        if (scrollX || scrollY || (window.visualViewport?.offsetTop ?? 0) > 0) scrollTo(0, 0);
        update(); // the layout height held while typing can drop now
      }, 120);
    });
    const mq = matchMedia('(pointer: coarse)');
    this.coarse = mq.matches;
    mq.addEventListener?.('change', (e) => { this.coarse = e.matches; });
  }
}

export const viewport = new Viewport();
