// UI sound helpers. Audio failures must never break a screen, so every call is guarded, and calls are
// untracked so an effect that plays a sound never subscribes to whatever state the audio engine reads.
import { untrack } from 'svelte';
import { audio } from '../../audio';
import type { JingleId, SfxId, SongId, VoiceId } from '../../types';
import { markHeard } from './heard';

function sfx(id: SfxId) {
  try { untrack(() => audio.sfx(id)); } catch { /* audio is optional */ }
}

export function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

export const ui = {
  move: () => sfx('ui_move'),
  select: () => { sfx('ui_select'); haptic(10); },
  back: () => sfx('ui_back'),
  open: () => sfx('ui_open'),
  close: () => sfx('ui_close'),
  error: () => sfx('ui_error'),
  toggle: () => sfx('ui_toggle'),
  sfx,
};

export function jingle(id: JingleId) {
  try { untrack(() => audio.jingle(id)); } catch { /* optional */ }
}

export function blip(voice: VoiceId) {
  try { untrack(() => audio.blip(voice)); } catch { /* optional */ }
}

export function playSong(id: SongId, opts?: { fadeMs?: number; restart?: boolean }) {
  try { untrack(() => audio.playSong(id, opts)); } catch { /* optional */ }
  untrack(() => markHeard(id));
}

export function stopSong(fadeMs?: number) {
  try { untrack(() => audio.stopSong(fadeMs)); } catch { /* optional */ }
}

/** Start audio from a user gesture. Never rejects and never hangs longer than `timeoutMs`. */
export function initAudio(timeoutMs = 2500): Promise<void> {
  let p: Promise<void>;
  try { p = Promise.resolve(untrack(() => audio.init())); } catch { p = Promise.resolve(); }
  return Promise.race([
    p.catch(() => {}),
    new Promise<void>((r) => setTimeout(r, timeoutMs)),
  ]);
}
