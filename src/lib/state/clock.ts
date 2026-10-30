// Game clock. ALWAYS use now()/nowDate() for game time (needs decay, schedules, time of day, dailies)
// so the debug time-warp and the `?now=` URL override apply everywhere.

let offsetMs = 0;

if (typeof location !== 'undefined') {
  const p = new URLSearchParams(location.search).get('now');
  const t = p ? Date.parse(p) : NaN;
  if (!Number.isNaN(t)) offsetMs = t - Date.now();
}

/** Epoch ms of the (possibly warped) game clock. */
export function now(): number {
  return Date.now() + offsetMs;
}

export function nowDate(): Date {
  return new Date(now());
}

/** Debug only: shift the game clock by `ms` relative to real time. */
export function setClockOffset(ms: number) {
  offsetMs = ms;
}

export function clockOffset(): number {
  return offsetMs;
}
