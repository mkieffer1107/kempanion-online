import type { Song } from '../mml';

// Purchase (~1.2 s): coin B5→E6, a glock sparkle up to E7, a soft low thunk for weight.
const song: Song = {
  id: 'purchase',
  title: 'Thank You!',
  bpm: 150,
  loop: false,
  echo: 0.2,
  tracks: [
    { inst: 'pulse25', vol: 0.98, mml: 'o5 v14 b16 > e8. r4 r4' },
    { inst: 'glock', vol: 0.72, pan: 0.25, mml: 'r8 o6 v12 l32 c e g > c l8 e r4 r8' },
    { inst: 'tri', vol: 0.91, mml: 'o3 v11 c8 r8 r4 r4' },
  ],
};

export default song;
