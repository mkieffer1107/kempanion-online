import type { Song } from '../mml';

// Fail (~2.2 s), gentle and never sad: a little "oops" fall over Fmaj7, a shrug on G, and a soft C major landing.
const song: Song = {
  id: 'fail',
  title: 'Oops!',
  bpm: 110,
  loop: false,
  echo: 0.25,
  tracks: [
    { inst: 'marimba', vol: 0.8, mml: 'o5 l8 v13 e d c < a g4 > c4' },
    { inst: 'epiano', vol: 0.55, pan: -0.2, mml: "o4 v9 q8 'c f a'2 '<b>d g'4 'c e g'4" },
    { inst: 'tri', vol: 0.8, mml: 'o3 v12 q6 f2 g4 c4' },
    { inst: 'glock', vol: 0.4, pan: 0.3, mml: 'r2. o6 v8 c4' },
  ],
};

export default song;
