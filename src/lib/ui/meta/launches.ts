// Launch counter for the splash length (2.8 s, then 1.2 s from the 3rd launch on).
const KEY = 'kempanion.launches';
let counted: number | null = null;

/** Count this launch once per page load and return the total (1 on the first launch). */
export function bumpLaunches(): number {
  if (counted !== null) return counted;
  let n = 0;
  try { n = Number(localStorage.getItem(KEY)) || 0; } catch { /* storage blocked */ }
  n += 1;
  try { localStorage.setItem(KEY, String(n)); } catch { /* storage blocked */ }
  counted = n;
  return n;
}
