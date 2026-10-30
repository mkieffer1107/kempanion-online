// Tempo map for compiled songs: converts song seconds ↔ ticks the same way the synth plays them
// (tempo events on track 0, seamless loop back to loopTick). Pure TS — usable by rhythm games and tests.
import { TICKS_PER_QUARTER, type CompiledSong } from './mml';

export interface TempoPoint { tick: number; sec: number; bpm: number }

export interface TempoMap {
  points: TempoPoint[];
  length: number;
  loopTick: number;
  loop: boolean;
  lengthSec: number;
  loopSec: number;
}

const secPerTick = (bpm: number) => 60 / (bpm * TICKS_PER_QUARTER);

export function tempoMap(song: CompiledSong): TempoMap {
  const points: TempoPoint[] = [{ tick: 0, sec: 0, bpm: song.bpm }];
  const tempos = (song.tracks[0]?.events ?? [])
    .filter((e): e is Extract<typeof e, { k: 'tempo' }> => e.k === 'tempo')
    .sort((a, b) => a.t - b.t);
  for (const ev of tempos) {
    const last = points[points.length - 1];
    if (ev.t === last.tick) {
      last.bpm = ev.bpm;
      continue;
    }
    points.push({ tick: ev.t, sec: last.sec + (ev.t - last.tick) * secPerTick(last.bpm), bpm: ev.bpm });
  }
  const map: TempoMap = { points, length: song.length, loopTick: song.loop ? song.loopTick : 0, loop: song.loop, lengthSec: 0, loopSec: 0 };
  map.lengthSec = tickToSeconds(map, song.length);
  map.loopSec = tickToSeconds(map, map.loopTick);
  return map;
}

/** Seconds at a tick within the first pass. */
export function tickToSeconds(map: TempoMap, tick: number): number {
  let p = map.points[0];
  for (const q of map.points) {
    if (q.tick > tick) break;
    p = q;
  }
  return p.sec + (tick - p.tick) * secPerTick(p.bpm);
}

/** Tick at a time within the first pass (not wrapped). */
function secondsToTickFirstPass(map: TempoMap, sec: number): number {
  let p = map.points[0];
  for (const q of map.points) {
    if (q.sec > sec) break;
    p = q;
  }
  return p.tick + (sec - p.sec) / secPerTick(p.bpm);
}

/**
 * Unwrapped ticks elapsed after `sec` seconds of playback: keeps counting through loops
 * (length + k·loopLength + …), so beats stay monotonic for rhythm games.
 */
export function songTicksAt(map: TempoMap, sec: number): number {
  if (sec <= 0) return 0;
  if (sec < map.lengthSec || !map.loop) return Math.min(secondsToTickFirstPass(map, sec), map.loop ? Infinity : map.length);
  const loopLenSec = map.lengthSec - map.loopSec;
  const loopLenTicks = map.length - map.loopTick;
  if (loopLenSec <= 0 || loopLenTicks <= 0) return map.length;
  const over = sec - map.lengthSec;
  const k = Math.floor(over / loopLenSec);
  const rem = over - k * loopLenSec;
  return map.length + k * loopLenTicks + (secondsToTickFirstPass(map, map.loopSec + rem) - map.loopTick);
}

/** Tick inside the song (wrapped into [loopTick, length) after the first pass). */
export function songTickWrapped(map: TempoMap, sec: number): number {
  const raw = songTicksAt(map, sec);
  if (!map.loop || raw < map.length) return Math.min(raw, map.length);
  const loopLenTicks = map.length - map.loopTick;
  return map.loopTick + ((raw - map.length) % loopLenTicks);
}
