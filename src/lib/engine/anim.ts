// Sprite clip timing with per-frame durations (pure).

export function clipLength(durations: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < durations.length; i++) total += Math.max(0, durations[i]);
  return total;
}

/**
 * Frame index after `elapsed` ms. Looping clips wrap; one-shots play `times` cycles and then hold
 * their last frame.
 */
export function frameIndexAt(durations: readonly number[], elapsed: number, loop: boolean, times = 1): number {
  const n = durations.length;
  if (n === 0) return 0;
  const total = clipLength(durations);
  if (total <= 0) return n - 1;
  if (!(elapsed > 0)) return 0;
  if (!loop && elapsed >= total * Math.max(1, times)) return n - 1;
  let t = elapsed % total;
  for (let i = 0; i < n; i++) {
    t -= Math.max(0, durations[i]);
    if (t < 0) return i;
  }
  return n - 1;
}

/**
 * Looping clip with an intro: frames 0..from-1 play once, then frames from..n-1 loop
 * (the 'held' clip: a startled first frame, then the wiggle). from ≤ 0 or ≥ n loops the whole clip.
 */
export function frameIndexIntroLoop(durations: readonly number[], elapsed: number, from: number): number {
  const n = durations.length;
  if (n === 0) return 0;
  if (!(from > 0) || from >= n) return frameIndexAt(durations, elapsed, true);
  if (!(elapsed > 0)) return 0;
  let t = elapsed;
  for (let i = 0; i < from; i++) {
    t -= Math.max(0, durations[i]);
    if (t < 0) return i;
  }
  let loop = 0;
  for (let i = from; i < n; i++) loop += Math.max(0, durations[i]);
  if (loop <= 0) return n - 1;
  t %= loop;
  for (let i = from; i < n; i++) {
    t -= Math.max(0, durations[i]);
    if (t < 0) return i;
  }
  return n - 1;
}

/** True once `times` full cycles have elapsed (looping clips keep playing afterwards). */
export function clipFinished(durations: readonly number[], elapsed: number, times = 1): boolean {
  return elapsed >= clipLength(durations) * Math.max(1, times);
}
