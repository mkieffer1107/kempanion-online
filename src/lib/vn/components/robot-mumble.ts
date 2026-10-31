// Decorative words for the prologue's existing robot rant. Match the current dialogue page so each cloud appears
// with its phrase, without changing the script, its pagination or the player's advance to Piggy 2's interruption.
import type { MumbleWord } from './mumble.svelte';

const ROBOT_WORDS = [
  'action chunking', 'Temporal ensembling', 'foundation model', 'autoregressive', 'diffusion-based',
  'flow matching', 'System 1', 'System 2', 'Jev', 'JEPA', 'receding-horizon', 'action tokens', 'zero-shot laundry',
] as const;

export function robotMumbleWords(text: string): MumbleWord[] {
  const lower = text.toLowerCase();
  return ROBOT_WORDS.flatMap((phrase) => {
    const at = lower.indexOf(phrase.toLowerCase());
    return at < 0 ? [] : [{ word: `${phrase === 'System 2' ? 'autoregressive' : phrase}…`, at }];
  }).sort((a, b) => a.at - b.at);
}
