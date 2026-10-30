// Built-in fallback jingles (short one-shot stings played over ducked BGM). A composer's
// src/lib/audio/songs/<jingleId>.ts (Song id = the JingleId, or 'jingle_<id>') takes precedence.
import type { JingleId } from '../types';
import type { Song } from './mml';

const j = (id: JingleId, title: string, bpm: number, tracks: Song['tracks'], echo = 0.22): Song => ({
  id: `jingle_${id}`, title, bpm, loop: false, echo, tracks,
});

export const JINGLES: Record<JingleId, Song> = {
  level_up: j('level_up', 'Level Up!', 160, [
    { inst: 'lead', vol: 0.8, mml: 'v13 o5 l16 c e g > c e g > c8 ^4 r8' },
    { inst: 'pulse12', vol: 0.55, pan: -0.2, mml: 'v10 o4 l16 g > c e g > c e g8 ^4 r8' },
    { inst: 'tri', vol: 0.8, mml: 'v13 o3 l8 c g > c e c4 r8' },
    { inst: 'drums', vol: 0.7, mml: 'v11 o4 l16 c r e r c r e r g8 r4' },
  ]),
  bond_up: j('bond_up', 'Closer', 120, [
    { inst: 'epiano', vol: 0.8, mml: 'v13 o4 l16 g b > d g b4 ^8 r8' },
    { inst: 'bell', vol: 0.6, mml: 'v10 o5 r4 g4 ^8 r8' },
    { inst: 'pad', vol: 0.6, mml: "v10 o4 'gb>d'4 ^4 ^8 r8" },
    { inst: 'tri', vol: 0.7, mml: 'v12 o3 g4 ^4 ^8 r8' },
    { inst: 'glock', vol: 0.5, pan: 0.25, mml: 'v9 o6 r4 r16 d16 g8 ^8 r8' },
  ], 0.3),
  victory: j('victory', 'Point Gators!', 140, [
    { inst: 'lead', vol: 0.8, mml: 'v13 o5 l8 e g > c4 c16 d16 e8 d8 c4 ^4 r8' },
    { inst: 'brass', vol: 0.6, pan: -0.15, mml: 'v11 o4 l8 c e g4 a16 b16 > c8 < b8 g4 ^4 r8' },
    { inst: 'bass', vol: 0.8, mml: 'v12 o3 l8 c c c c g g g g c4 ^4' },
    { inst: 'drums', vol: 0.75, mml: "v12 o4 l8 c e g e c e g e 'cf'4 r4" },
    { inst: 'glock', vol: 0.5, pan: 0.2, mml: 'v9 r1 o6 c4 r4' },
  ]),
  fail: j('fail', 'Next Time', 100, [
    { inst: 'flute', vol: 0.7, mml: 'v11 o5 l8 e d c < a g4 ^8 r8' },
    { inst: 'epiano', vol: 0.6, mml: "v9 o4 'ce'4 '<a>c'4 '<fa>c'4 ^8 r8" },
    { inst: 'bass', vol: 0.6, mml: 'v10 o3 c4 < a4 f4 ^8 r8' },
  ], 0.3),
  purchase: j('purchase', 'Ka-ching', 180, [
    { inst: 'pulse25', vol: 0.7, mml: 'v12 o5 l16 b > e8. r8' },
    { inst: 'glock', vol: 0.7, mml: 'v10 o6 r16 e8. r8' },
    { inst: 'drums', vol: 0.5, mml: 'v8 o4 r16 f8. r8' },
  ]),
  event_start: j('event_start', 'Something Happens', 90, [
    { inst: 'pluck', vol: 0.7, mml: 'v11 o4 l32 c e g b > c e g b > c e g b ^4 ^8 r4' },
    { inst: 'bell', vol: 0.6, mml: 'v10 o5 r4 r8 e2 r8' },
    { inst: 'pad', vol: 0.6, mml: "v9 o4 'cegb'2 ^4 r4" },
    { inst: 'sine', vol: 0.6, mml: 'v8 o3 c2 ^4 r4' },
  ], 0.35),
  daily_bonus: j('daily_bonus', 'Roll Call', 150, [
    { inst: 'pulse25', vol: 0.7, mml: 'v12 o5 l16 g > c e g > c8 < g8 > c4 r8' },
    { inst: 'glock', vol: 0.6, pan: 0.25, mml: 'v10 o6 l16 r4 c8 e8 g4 r8' },
    { inst: 'tri', vol: 0.8, mml: 'v12 o3 l8 c g > c < g c4 r8' },
    { inst: 'drums', vol: 0.65, mml: "v10 o4 l8 c e c e 'cg'4 r8" },
  ]),
};
