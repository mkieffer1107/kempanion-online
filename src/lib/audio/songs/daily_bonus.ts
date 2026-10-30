import type { Song } from '../mml';

// Daily bonus (~2.6 s): the TITLE motif's opening (E G A) as a cheerful pickup, F → G7 → C, glock coins on top.
const song: Song = {
  id: 'daily_bonus',
  title: 'Daily Bonus',
  bpm: 140,
  loop: false,
  echo: 0.2,
  tracks: [
    { inst: 'pulse25', vol: 0.8, mml: 'o5 l8 v13 e g a4 > c < b > c4 e4. r' },
    { inst: 'glock', vol: 0.5, pan: 0.3, mml: 'r1 o6 l32 v10 c e g > c e4.' },
    { inst: 'epiano', vol: 0.55, pan: -0.25, mml: "o4 v9 'c f a'4 'c f a'4 '<b>d f g'4 '<b>d f g'4 'c e g'2" },
    { inst: 'tri', vol: 0.8, mml: 'o3 v12 q6 f4 f4 g4 g4 c2' },
    { inst: 'drums', vol: 0.55, mml: "l8 v10 c v7 e v10 d v7 e v10 c c v10 d v7 e v12 'c f'4 r4" },
  ],
};

export default song;
