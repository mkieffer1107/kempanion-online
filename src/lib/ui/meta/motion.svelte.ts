// Reduced-motion preference: the player's setting OR the OS-level prefers-reduced-motion.
import { game } from '../../state/game.svelte';

class MotionPrefs {
  system = $state(false);

  constructor() {
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      this.system = mq.matches;
      mq.addEventListener?.('change', (e) => { this.system = e.matches; });
    }
  }

  get reduced(): boolean {
    return game.save.settings.reduceMotion || this.system;
  }
}

export const motion = new MotionPrefs();
