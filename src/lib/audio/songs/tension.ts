import type { Song } from '../mml';

// "Something's up" — curious-suspicious, never scary. E minor. A 16th-note pluck ostinato on an E pedal rocks
// between B and C (5 → b6) under everything. A 8: sneaky pulse12 | B 8: strings swell over VI–iv–ii°–V |
// C 8: breakdown, chromatic bass E–D#–D–C#, bell pings | A' 8 → A.
const song: Song = {
  id: 'tension',
  title: "Something's Up",
  bpm: 100,
  loop: true,
  echo: 0.25,
  tracks: [
    {
      inst: 'pulse12',
      vol: 0.78,
      mml: `
        @pulse12 v12 q6 l8
        o5 r2 b4 > c4 | < b2. r4 | g4 a4 b4 > c4 | < f+2 d+2 | r2 b4 > c4 | d+2 e2 | c2 < a2 | b2 a4 f+4 |
        @strings v11 q8 y4
        o5 e2. d4 | c2. < b4 | a2 > c2 | d+2 f+2 | g2. f+4 | e2. d4 | c2 e2 | e2 d+2 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        @pulse12 v12 q6 y0
        o5 r4 b4 > c4 < b4 | a+2 b2 | g4 a4 b4 > c4 | < b2 a4 f+4 | r4 b4 > c4 < b4 | > d+2 e2 | c2 < a2 | f+2 d+2 |
      `,
    },
    {
      // The ostinato
      inst: 'pluck',
      vol: 0.6,
      pan: -0.25,
      mml: `
        @pluck v8 q4 l16
        [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e > c < e]2 |
        [o4 e e > c < e]2 [o4 e e g e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 |
        [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e > c < e]2 |
        [o4 e e a e]2 [o4 e e > c < e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 |
        [o4 e e b e]2 [o4 e e g e]2 | [o4 e e a e]2 [o4 e e g e]2 | [o4 e e a e]2 [o4 e e > c < e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 |
        [o4 e e b e]2 [o4 e e g e]2 | [o4 e e a e]2 [o4 e e g e]2 | [o4 e e a e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 d+ d+ b d+]2 |
        v7 [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e a e]2 |
        [o4 e e > c < e]2 [o4 e e g e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 | [o4 e e b e]2 [o4 e e > c < e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 |
        v8 [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e > c < e]2 |
        [o4 e e > c < e]2 [o4 e e g e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 |
        [o4 e e b e]2 [o4 e e > c < e]2 | [o4 e e b e]2 [o4 e e > c < e]2 |
        [o4 e e a e]2 [o4 e e > c < e]2 | [o4 d+ d+ b d+]2 [o4 d+ d+ a d+]2 |
      `,
    },
    {
      // Low strings pad
      inst: 'strings',
      vol: 0.5,
      pan: 0.25,
      mml: `
        @strings v6 q8 o3
        'e g > e'1 | 'e g > e'1 | 'e g > c'1 | 'd+ f+ a'1 | 'e g > e'1 | 'e g > e'1 | 'e a > c'1 | 'd+ f+ a'1 |
        'e g b'1 | 'e g > c'1 | 'e a > c'1 | 'd+ f+ a'1 | 'e g b'1 | 'e g > c'1 | 'e a > c'1 | 'e f+ b'2 'd+ f+ a'2 |
        'e g > e'1 | 'g > e'1 | 'e g > e'1 | 'e g > e'1 | 'e g > c'1 | 'd+ f+ a'1 | 'e g > e'1 | 'd+ f+ a'1 |
        'e g > e'1 | 'e g > e'1 | 'e g > c'1 | 'd+ f+ a'1 | 'e g > e'1 | 'e g > e'1 | 'e a > c'1 | 'd+ f+ a'1 |
      `,
    },
    {
      // Pulsing bass; chromatic descent in the breakdown
      inst: 'bass',
      vol: 0.94,
      mml: `
        @bass v11 q4 l8
        [o2 e e e e e e e e]2 | o2 c c c c c c c c | o1 b b b b b b b b |
        [o2 e e e e e e e e]2 | o2 a a a a a a a a | o1 b b b b b b b b |
        o2 c c c c c c c c | o2 a a a a a a a a | o2 f+ f+ f+ f+ f+ f+ f+ f+ | o1 b b b b b b b b |
        o2 c c c c c c c c | o2 a a a a a a a a | o2 f+ f+ f+ f+ f+ f+ f+ f+ | o1 b b b b b b b b |
        v10 o2 e4 e4 e4 e4 | d+4 d+4 d+4 d+4 | d4 d4 d4 d4 | c+4 c+4 c+4 c+4 | c4 c4 c4 c4 | o1 b4 b4 b4 b4 | o2 e4 e4 e4 e4 | o1 b4 b4 b4 b4 |
        v11 [o2 e e e e e e e e]2 | o2 c c c c c c c c | o1 b b b b b b b b |
        [o2 e e e e e e e e]2 | o2 a a a a a a a a | o1 b b b b b b b b |
      `,
    },
    {
      inst: 'drums',
      vol: 0.62,
      mml: `
        @drums l8
        [v10 c v5 e16 e16 v5 e v9 c v8 a v5 e16 e16 v5 e e]7
        v10 c v5 e16 e16 v5 e v9 c v8 a16 a16 b16 b16 v9 a a
        [v10 c v5 e v8 d v5 e v10 c c v8 d v5 e]7
        v10 c v5 e v8 d v5 e v8 d16 d16 d16 d16 v9 a16 a16 a16 a16
        [v9 c v7 c r4 v4 e16 e16 e16 e16 v4 e16 e16 e16 e16]7
        v9 c v7 c r4 v7 d16 d16 v8 d16 d16 v9 d16 d16 v10 d16 d16
        [v10 c v5 e16 e16 v5 e v9 c v8 a v5 e16 e16 v5 e e]7
        v10 c v5 e16 e16 v5 e v9 c v8 a16 a16 b16 b16 v9 a a
      `,
    },
    {
      // Eerie-but-friendly bell pings in the breakdown
      inst: 'bell',
      vol: 0.56,
      pan: 0.35,
      mml: `
        @bell v8 l4
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r2. o6 b | r1 | r2. > c | r1 | r2. < a | r1 | r2. f+ |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
      `,
    },
  ],
};

export default song;
