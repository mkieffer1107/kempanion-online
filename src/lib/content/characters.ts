// Character profiles, generated from characters/piggy-*.md (bun scripts/gen-characters.ts).
import raw from '../../generated/characters.json';
import type { LocationId, PigId, SpeakerId } from '../types';

export interface SampleLine { beat: string; line: string }

export interface CharacterDef {
  id: PigId;
  name: string;
  kana: string;
  role: string;
  /** Prose description of the home spot (from the personality file). */
  homeText: string;
  /** Primary location id where they hang out. */
  home: LocationId;
  color: string;
  birthday: string;
  bloodType: string;
  height: string;
  year: string;
  likes: string[];
  dislikes: string[];
  quote: string;
  voice: { wave: string; pitch: number; rate: number };
  /** One-sentence bolded summary from the personality file. */
  summary: string;
  /** "Compact character prompt" — the LLM system prompt core. */
  prompt: string;
  samples: SampleLine[];
}

const HOME: Record<PigId, LocationId> = {
  'piggy-1': 'malachowsky',
  'piggy-2': 'communicore',
  'piggy-3': 'physics',
};

type RawChar = {
  character: string; kana: string; role: string; home: string; color: string; birthday: string;
  blood_type: string; height: string; year: string; likes: string[]; dislikes: string[]; quote: string;
  voice: { wave: string; pitch: number; rate: number }; summary: string; prompt: string; samples: SampleLine[];
};

function build(id: PigId): CharacterDef {
  const r = (raw as unknown as Record<string, RawChar>)[id];
  return {
    id,
    name: r.character,
    kana: r.kana,
    role: r.role,
    homeText: r.home,
    home: HOME[id],
    color: r.color,
    birthday: r.birthday,
    bloodType: r.blood_type,
    height: r.height,
    year: r.year,
    likes: r.likes,
    dislikes: r.dislikes,
    quote: r.quote,
    voice: { wave: r.voice.wave, pitch: Number(r.voice.pitch), rate: Number(r.voice.rate) },
    summary: r.summary,
    prompt: r.prompt,
    samples: r.samples,
  };
}

export const CHARACTERS: Record<PigId, CharacterDef> = {
  'piggy-1': build('piggy-1'),
  'piggy-2': build('piggy-2'),
  'piggy-3': build('piggy-3'),
};

export const PLAYER_COLOR = '#7fd6c2';
export const NARRATOR_COLOR = '#c9b8ff';

/** Name-plate text for a speaker. */
export function speakerName(speaker: SpeakerId, playerName: string): string {
  if (speaker === 'player') return playerName || 'You';
  if (speaker === 'narrator') return '';
  return CHARACTERS[speaker].name;
}

export function speakerColor(speaker: SpeakerId): string {
  if (speaker === 'player') return PLAYER_COLOR;
  if (speaker === 'narrator') return NARRATOR_COLOR;
  return CHARACTERS[speaker].color;
}
