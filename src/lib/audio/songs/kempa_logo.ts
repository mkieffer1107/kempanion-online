import type { Song } from '../mml';

// Kempa AI splash sting (~2.5 s): C5–G5–C6 pulse arpeggio over a triangle C4, a glock sparkle,
// then two tiny pulse12 "oinks" (a grace-note grunt each, the second one higher and happier).
const song: Song = {
  id: 'kempa_logo',
  title: 'Kempa AI',
  bpm: 180,
  loop: false,
  echo: 0.35,
  tracks: [
    { inst: 'pulse25', vol: 0.96, mml: 'o5 l16 v13 c g > c4. r8 v6 < c g > c8 r1' },
    { inst: 'tri', vol: 0.96, mml: 'o4 v12 q8 c2&c4. r1' },
    { inst: 'glock', vol: 0.72, pan: 0.3, mml: 'r4 o6 l32 v9 e g > c e g8 r1 r4.' },
    { inst: 'pulse12', vol: 0.9, mml: 'r1 r4. o4 v12 y14 q6 d32 < a16 r16 > g32 e16. r8 r16 r32' },
  ],
};

export default song;
