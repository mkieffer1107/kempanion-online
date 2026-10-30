// Deterministic randomness: every roll is seeded from stable strings (dates, ids), never Math.random().

/** FNV-1a 32-bit hash. */
export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small, fast PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;

/** A PRNG seeded from the joined parts. */
export function rngFor(...parts: (string | number)[]): Rand {
  return mulberry32(hash32(parts.join('|')));
}

export function pick<T>(rand: Rand, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length) % list.length];
}

export function weighted<T extends { weight: number }>(rand: Rand, list: readonly T[]): T {
  const total = list.reduce((s, x) => s + Math.max(0, x.weight), 0);
  let r = rand() * total;
  for (const x of list) {
    r -= Math.max(0, x.weight);
    if (r < 0) return x;
  }
  return list[list.length - 1];
}

export function shuffle<T>(rand: Rand, list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick a line deterministically, varying with the seed parts (e.g. pig, kind, minute). */
export function line(lines: readonly string[], ...seed: (string | number)[]): string {
  return lines.length ? pick(rngFor(...seed), lines) : '';
}
