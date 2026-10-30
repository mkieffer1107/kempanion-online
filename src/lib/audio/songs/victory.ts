import type { Song } from '../mml';

// Victory (~3.4 s): brass fanfare in C that climbs C–E–G, then a bVI–bVII–I (Ab–Bb–C) landing with crashes.
const song: Song = {
  id: 'victory',
  title: 'Victory!',
  bpm: 140,
  loop: false,
  echo: 0.2,
  tracks: [
    { inst: 'brass', vol: 0.75, mml: 'o5 l8 v13 c e g4 e g > c4 < a-4 b-4 > c2' },
    { inst: 'pulse25', vol: 0.55, pan: -0.25, mml: 'o4 l8 v10 g > c e4 c e g4 e-4 f4 g2' },
    { inst: 'strings', vol: 0.5, pan: 0.25, mml: "o4 v10 q8 r1 'a- > c e-'4 'b- > d f'4 '> c e g'2" },
    { inst: 'tri', vol: 0.8, mml: 'o3 v12 c4 c4 c4 c4 < a-4 b-4 > c2' },
    { inst: 'glock', vol: 0.5, pan: 0.3, mml: 'r1 r2 o6 l32 v10 c e g > c e8 r4' },
    { inst: 'drums', vol: 0.6, mml: "l8 v10 c v7 e v10 d v7 e v10 c c v10 d v7 e v12 'c f'4 'c f'4 'c f'2" },
  ],
};

export default song;
