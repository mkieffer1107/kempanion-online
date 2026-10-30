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
    const update = () => {
      const vv = window.visualViewport;
      this.w = Math.round(vv?.width ?? innerWidth);
      this.h = Math.round(vv?.height ?? innerHeight);
      this.layoutH = Math.round(Math.max(innerHeight, this.h));
      const root = document.documentElement.style;
      root.setProperty('--vvh', `${this.h}px`);
      root.setProperty('--vvt', `${Math.round(vv?.offsetTop ?? 0)}px`);
    };
    update();
    addEventListener('resize', update);
    addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    const mq = matchMedia('(pointer: coarse)');
    this.coarse = mq.matches;
    mq.addEventListener?.('change', (e) => { this.coarse = e.matches; });
  }
}

export const viewport = new Viewport();
