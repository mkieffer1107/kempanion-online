// The Kempa AI emblem: a five-petal pixel sakura whose centre is a pig snout.
// Generated procedurally (supersampled polar petal shape + outline pass) so it stays crisp at any size.

export const EMBLEM_PALETTE: Record<string, string> = {
  o: '#7a2850', // outline
  l: '#ffe3ea', // petal tip
  p: '#ffb7c5', // petal
  d: '#f48fb1', // petal base
  s: '#ff9fb8', // snout
  r: '#c2577a', // snout rim
  n: '#4a1530', // nostril
};

const SECTOR = (Math.PI * 2) / 5;

/** Angle from the nearest petal axis, −36°..36° (axis 0 points straight up). */
function petalAngle(theta: number): number {
  let phi = (theta + SECTOR / 2) % SECTOR;
  if (phi < 0) phi += SECTOR;
  return phi - SECTOR / 2;
}

function petalRadius(theta: number, rMax: number): number {
  const phi = petalAngle(theta);
  const a = Math.min(Math.PI / 2, Math.abs(phi) * 2.5);
  let r = rMax * (0.34 + 0.66 * Math.pow(Math.cos(a), 0.75));
  const notch = (8 * Math.PI) / 180;
  if (Math.abs(phi) < notch) r -= rMax * 0.2 * (1 - Math.abs(phi) / notch);
  return r;
}

/** Rows of palette letters ('.' = transparent), `size` x `size` (odd sizes look best). */
export function sakuraSnout(size = 17): string[] {
  const c = size / 2;
  const rMax = size / 2 - 1; // leave a pixel for the outline
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill('.'));
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = x + (sx + 0.5) / SS - c;
          const dy = y + (sy + 0.5) / SS - c;
          const r = Math.hypot(dx, dy);
          const theta = Math.atan2(dx, -dy); // 0 = straight up, clockwise
          if (r <= petalRadius(theta, rMax)) hits++;
        }
      }
      if (hits * 2 < SS * SS) continue;
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const t = Math.hypot(dx, dy) / rMax;
      // a deeper crease where two petals meet helps them read as five petals at tiny sizes
      const crease = Math.abs(Math.abs(petalAngle(Math.atan2(dx, -dy))) - SECTOR / 2) < 0.16 && t < 0.75;
      grid[y][x] = crease ? 'd' : t > 0.78 ? 'l' : t > 0.5 ? 'p' : 'd';
    }
  }
  // Snout: an ellipse in the middle with a rim and two nostrils.
  const rx = size * 0.2;
  const ry = size * 0.15;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ex = (x + 0.5 - c) / rx;
      const ey = (y + 0.5 - c) / ry;
      const e = ex * ex + ey * ey;
      if (e <= 1) grid[y][x] = e > 0.55 ? 'r' : 's';
    }
  }
  const mid = Math.floor(c);
  const off = Math.max(1, Math.round(size * 0.07));
  grid[mid][mid - off] = 'n';
  grid[mid][mid + off] = 'n';
  // Outline: transparent pixels touching the flower.
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && grid[y][x] !== '.' && grid[y][x] !== 'o';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] !== '.') continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) grid[y][x] = 'o';
    }
  }
  return grid.map((r) => r.join(''));
}
