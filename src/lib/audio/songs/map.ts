import type { Song } from '../mml';

// Campus map. Written in C, sounds in Ab (k-4; drums untransposed). Light swing on the triplet grid,
// walking bass with chromatic approach notes, brushed ride pattern. 32 bars:
// A 8: I–vi–ii–V / iii–VI–ii–V, marimba asks "where to?" | B 8: IV–iv–iii–VI–ii–V–I | C 8: flute bridge (I7 → IV, bVII7) |
// A' 8 → A.
const song: Song = {
  id: 'map',
  title: 'Where To?',
  bpm: 100,
  loop: true,
  echo: 0.22,
  tracks: [
    {
      inst: 'marimba',
      vol: 0.72,
      mml: `
        @marimba v12 k-4
        o5 r4 e6 f+12 g4 b4 | a2 r4 g6 a12 | > c4 < a6 f12 d4 f4 | e2 r2 |
        g4 b6 a12 g4 e4 | > c+4 < a6 e12 g4 e4 | f4 a6 > c12 e4 d4 | < b2 g4 r4 |
        a4 g6 a12 > c4 < a4 | a-2 g4 f4 | e4 g6 b12 > d4 < b4 | > c+2 < a4 r4 |
        > d4 c6 < a12 f4 a4 | g4 f6 d12 < b4 > d4 | e2. r4 | r4 f6 e12 d4 < b4 |
        @flute v11 y4 o5 e2 b-2 | a2. g4 | a-2 f4 d4 | g2 > c+2 | d2. c4 | < b2 g4 f4 | e2 c+2 | d2 < b2 |
        @marimba v12 y0 o5 r4 e6 f+12 g4 > c4 | < b2 r4 a6 g12 | f4 a6 > c12 d4 < a4 | g2 r2 |
        g4 b6 a12 g4 e4 | > c+4 < a6 e12 g4 e4 | f4 a6 > c12 e4 d4 | < b2 g4 r4 |
      `,
    },
    {
      // E-piano comping: short hit on 1, another on the swung "and" of 2
      inst: 'epiano',
      vol: 0.48,
      pan: -0.3,
      mml: `
        @epiano v8 q6 k-4 o4
        'e g b'6 r12 r6 'e g b'12 r2 | 'e g > c'6 r12 r6 'e g > c'12 r2 | 'f a > c'6 r12 r6 'f a > c'12 r2 | 'f a b'6 r12 r6 'f a b'12 r2 |
        'd g b'6 r12 r6 'd g b'12 r2 | 'c+ e g'6 r12 r6 'c+ e g'12 r2 | 'f a > c'6 r12 r6 'f a > c'12 r2 | 'f a b'6 r12 r6 'f a b'12 r2 |
        'e a > c'6 r12 r6 'e a > c'12 r2 | 'd f a-'6 r12 r6 'd f a-'12 r2 | 'd g b'6 r12 r6 'd g b'12 r2 | 'c+ e g'6 r12 r6 'c+ e g'12 r2 |
        'f a > c'6 r12 r6 'f a > c'12 r2 | 'f a b'6 r12 r6 'f a b'12 r2 | 'e g b'6 r12 r6 'e g b'12 r2 | 'f a > c'6 r12 r6 'f a b'12 r2 |
        'e g b'6 r12 r6 'e b- > d'12 r2 | 'e a > c'6 r12 r6 'e a > c'12 r2 | 'd a- > c'6 r12 r6 'd a- > c'12 r2 | 'd g b'6 r12 r6 'c+ e g'12 r2 |
        'f a > c'6 r12 r6 'f a > c'12 r2 | 'f a b'6 r12 r6 'f a b'12 r2 | 'd g b'6 r12 r6 'c+ e g'12 r2 | 'f a > c'6 r12 r6 'f a b'12 r2 |
        'e g b'6 r12 r6 'e g b'12 r2 | 'e g > c'6 r12 r6 'e g > c'12 r2 | 'f a > c'6 r12 r6 'f a > c'12 r2 | 'f a b'6 r12 r6 'f a b'12 r2 |
        'd g b'6 r12 r6 'd g b'12 r2 | 'c+ e g'6 r12 r6 'c+ e g'12 r2 | 'f a > c'6 r12 r6 'f a > c'12 r2 | 'f a b'6 r12 r6 'f a b'12 r2 |
      `,
    },
    {
      // Walking bass
      inst: 'bass',
      vol: 0.8,
      mml: `
        @bass v12 q6 k-4
        o3 c4 o2 g4 a4 g+4 | o2 a4 o3 c4 o2 g4 o3 c+4 | o3 d4 o2 a4 f4 a-4 | o2 g4 b4 o3 d4 d+4 |
        o3 e4 o2 b4 g4 b-4 | o2 a4 o3 c+4 e4 e-4 | o3 d4 o2 a4 f4 a-4 | o2 g4 a4 b4 o3 d4 |
        o2 f4 a4 o3 c4 o2 f+4 | o2 f4 a-4 o3 c4 d+4 | o3 e4 d4 o2 b4 b-4 | o2 a4 o3 c+4 e4 e-4 |
        o3 d4 c4 o2 a4 a-4 | o2 g4 b4 o3 d4 c+4 | o3 c4 e4 g4 e4 | o3 d4 c4 o2 b4 g4 |
        o3 c4 o2 g4 b-4 a4 | o2 f4 a4 o3 c4 o2 b4 | o2 b-4 a-4 g4 f4 | o2 e4 g4 a4 o3 c+4 |
        o3 d4 o2 a4 f4 a-4 | o2 g4 b4 o3 d4 d+4 | o3 e4 o2 b4 a4 o3 c+4 | o3 d4 o2 a4 g4 b4 |
        o3 c4 o2 g4 a4 g+4 | o2 a4 o3 c4 o2 g4 o3 c+4 | o3 d4 o2 a4 f4 a-4 | o2 g4 b4 o3 d4 d+4 |
        o3 e4 o2 b4 g4 b-4 | o2 a4 o3 c+4 e4 e-4 | o3 d4 o2 a4 f4 a-4 | o2 g4 a4 b4 o3 d4 |
      `,
    },
    {
      // Brushed ride: ding, ding-a, ding, ding-a
      inst: 'drums',
      vol: 0.4,
      pan: 0.25,
      mml: `
        @drums
        [v6 e4 v5 e6 v4 e12 v6 e4 v5 e6 v4 e12]15
        v6 e4 v5 e6 v4 e12 v6 e4 v6 f4
        [v6 e4 v5 e6 v4 e12 v6 e4 v5 e6 v4 e12]15
        v6 e4 v5 e6 v4 e12 v7 b6 b12 v8 a6 a12
      `,
    },
    {
      // Feathered kick on 1 and 3, hat foot on 2 and 4
      inst: 'drums',
      vol: 0.45,
      mml: `
        @drums
        [v7 c4 v5 e4 v7 c4 v5 e4]32
      `,
    },
  ],
};

export default song;
