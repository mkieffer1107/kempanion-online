import type { Song } from '../mml';

// Event start (~2.4 s): "something is happening" — a quartal bell arpeggio (C F Bb Eb) over a held sus chord,
// a low tom double hit and a deep triangle C. Curious, not scary.
const song: Song = {
  id: 'event_start',
  title: 'Something Happened',
  bpm: 100,
  loop: false,
  echo: 0.35,
  tracks: [
    { inst: 'bell', vol: 0.77, pan: 0.2, mml: 'o5 l16 v11 c f b- > e-4.. r8 r4' },
    { inst: 'strings', vol: 0.55, pan: -0.2, mml: "o4 v9 q8 'c f b-'1" },
    { inst: 'tri', vol: 0.88, mml: 'o2 v12 q8 c2. r4' },
    { inst: 'drums', vol: 0.66, mml: 'l16 v11 a a v12 a8 r4 v7 f4 r4' },
  ],
};

export default song;
