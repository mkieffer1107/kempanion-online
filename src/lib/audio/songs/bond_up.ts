import type { Song } from '../mml';

// Bond up (~2 s): a fluttering glock trill (a racing heart), a lub-dub triangle pulse, then a sweet C major landing.
const song: Song = {
  id: 'bond_up',
  title: 'Heart Flutter',
  bpm: 120,
  loop: false,
  echo: 0.3,
  tracks: [
    { inst: 'glock', vol: 0.75, pan: 0.2, mml: 'o6 l32 v11 e g e g e g e g l8 a b > c4 r4' },
    { inst: 'pulse25', vol: 0.81, mml: 'o5 l8 v11 r4 e g > c4 r4' },
    { inst: 'tri', vol: 1.0, mml: 'o3 l16 v12 c r c8 r4 c r c8 r4' },
    { inst: 'pad', vol: 0.62, mml: 'o4 v8 q8 r4 \'c e g\'2.' },
  ],
};

export default song;
