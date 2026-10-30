import type { Song } from '../mml';

// Level-up fanfare (~2.4 s): "ta ta-ta TAA, ta-ta TAAA" in C with a glock sparkle on the last note.
const song: Song = {
  id: 'level_up',
  title: 'Level Up!',
  bpm: 150,
  loop: false,
  echo: 0.2,
  tracks: [
    { inst: 'pulse25', vol: 0.8, mml: 'o5 l16 v13 g8 g g > c4 < g8 > c8 e4. r8 r4' },
    { inst: 'pulse12', vol: 0.6, pan: -0.2, mml: 'o5 l16 v10 e8 e e g4 e8 g8 > c4. r8 r4' },
    { inst: 'tri', vol: 0.8, mml: 'o3 l16 v12 c8 c c c4 < g8 g8 > c4. r8 r4' },
    { inst: 'glock', vol: 0.55, pan: 0.3, mml: 'r4. r4. o6 l32 v10 c e g > c e4 r4.' },
    { inst: 'drums', vol: 0.6, mml: 'l16 v10 d d d d v12 \'c f\'4 r8 v10 d d v12 \'c f\'4. r8 r4' },
  ],
};

export default song;
