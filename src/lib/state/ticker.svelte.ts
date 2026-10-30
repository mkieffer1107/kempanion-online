// Reactive view of the game clock (clock.ts stays the source of truth). Components read `gameClock.ms`
// so clocks, schedules and day/night update every second and immediately after a debug time warp.
import { clockOffset, now, setClockOffset } from './clock';

class GameClock {
  ms = $state(now());
  /** Changes once per minute — cheaper dependency for schedule lookups. */
  minute = $derived(Math.floor(this.ms / 60_000));

  sync() {
    this.ms = now();
  }

  /** Debug: shift the clock by `deltaMs`. */
  warp(deltaMs: number) {
    setClockOffset(clockOffset() + deltaMs);
    this.sync();
  }

  /** Debug: jump the clock to an absolute epoch ms. */
  set(targetMs: number) {
    setClockOffset(clockOffset() + (targetMs - now()));
    this.sync();
  }

  /** Debug: back to real time. */
  realTime() {
    setClockOffset(0);
    this.sync();
  }

  date(): Date {
    return new Date(this.ms);
  }
}

export const gameClock = new GameClock();

if (typeof window !== 'undefined') setInterval(() => gameClock.sync(), 1000);
