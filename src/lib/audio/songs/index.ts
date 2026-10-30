// Song registry: every src/lib/audio/songs/<id>.ts default-exports a Song. Vite-only (uses import.meta.glob);
// bun tests/scripts enumerate the directory themselves.
import type { Song } from '../mml';

const mods = import.meta.glob<{ default: Song }>('./*.ts', { eager: true });

// One page-wide registry, refilled in place: in dev, editing a song hot-swaps it into the running engine
// instead of remounting the app (a remount would start a second AudioContext and double the music).
const KEY = '__kempanionSongs';
const host = globalThis as typeof globalThis & { [KEY]?: Record<string, Song> };
export const SONGS: Record<string, Song> = (host[KEY] ??= {});
for (const id of Object.keys(SONGS)) delete SONGS[id];
for (const [path, mod] of Object.entries(mods)) {
  if (path.endsWith('/index.ts')) continue;
  const s = mod.default;
  if (s?.id) SONGS[s.id] = s;
}

if (import.meta.hot) {
  import.meta.hot.accept();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('kempanion:songs-updated'));
}
