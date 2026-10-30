// Gainesville weather, deterministic per date and hour so every screen (and every reload) agrees.
// Summer afternoons get the classic thunderstorm; the rest of the year is mostly clear (GAME_DESIGN §10).
export type WeatherKind = 'clear' | 'rain' | 'storm';

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Weather at a local wall-clock time (epoch ms). */
export function weatherAt(ms: number): WeatherKind {
  const d = new Date(ms);
  const month = d.getMonth() + 1;
  const h = d.getHours();
  const day = `${d.getFullYear()}-${month}-${d.getDate()}`;
  const summer = month >= 5 && month <= 9;
  // One afternoon storm window per day (14:00–18:00), rolled once per date.
  if (h >= 14 && h < 18) {
    const roll = hash(`storm:${day}`);
    if (roll < (summer ? 0.25 : 0.06)) {
      const start = 14 + Math.floor(hash(`storm-start:${day}`) * 3);
      if (h >= start && h < start + 1) return 'storm';
      if (h === start + 1) return 'rain';
    }
  }
  // Occasional light rain at other times.
  const block = Math.floor(h / 3);
  if (hash(`rain:${day}:${block}`) < (summer ? 0.07 : 0.05)) return 'rain';
  return 'clear';
}

export function weatherLabel(w: WeatherKind): string {
  return w === 'storm' ? 'Thunderstorm' : w === 'rain' ? 'Rain' : 'Clear';
}
