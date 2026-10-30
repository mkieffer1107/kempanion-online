import type { Song } from '../mml';

// Confessions & endings. Written in C, sounds in D (k2). Royal road. Intro 2 (not looped) |
// A 8: a duet — the bell asks with the TITLE motif, the strings answer | B 8: the strings sing over vi–iii–IV–I–ii–iii–IV–V,
// landing on E7 (→ IV, bittersweet) | A' 8: bell motif with the strings in harmony, ends on vi with a pickup into the loop.
const song: Song = {
  id: 'romance',
  title: 'Under the Century Sakura',
  bpm: 76,
  loop: true,
  echo: 0.35,
  tracks: [
    {
      inst: 'bell',
      vol: 0.7,
      pan: 0.15,
      mml: `
        @bell v11 k2 l8
        r1 | r1 | L
        o5 e g a4 g e d4 | c d e4 d4 r4 | r1 | r2. c d |
        e g a4 g e d4 | c d e4 d e g4 | r1 | r1 |
        v8 r1 | r2 o5 b2 | r1 | r2 > c2 | r1 | r2 e2 | r1 | r2 < b2 |
        v11 o5 e g a4 g e d4 | c d e4 g4 r4 | g a b4 > d < b a4 | > c2 < b4 a g |
        e g a4 g e d4 | c d e4 d e g4 | b4. a g4 e4 | a2 r4 c d |
      `,
    },
    {
      inst: 'strings',
      vol: 0.62,
      pan: -0.15,
      mml: `
        @strings v10 q8 k2 l8 y3
        r1 | r1 | L
        r1 | r1 | o4 b4. a g4 e4 | a2. r4 |
        r1 | r1 | o4 b4. a g4 > c+4 | d2 c2 |
        v11 o5 e2 d4 c4 | < b2. g4 | a4. > c f4 e4 | e2 g2 | a4. g f4 e4 | d4 e4 g4 b4 | a2 b2 | a2 g+2 |
        v9 o5 c e e4 e c < a4 | a g > c4 e4 r4 | e e g4 b g e4 | a2 g4 e d |
        c e e4 e c < a4 | a g > c4 < b g b4 | > g4. f+ e4 < b4 | > e2 r4 < a b |
      `,
    },
    {
      inst: 'epiano',
      vol: 0.5,
      pan: -0.35,
      mml: `
        @epiano v8 q8 k2 l8
        o4 e g b > d < b g e g | o4 e a > c e c < a e a | L
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d < b g e g | o4 e a > c e c < a e a |
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d o4 a > c+ e g | o4 d f a > c o4 g > c d f |
        o4 e a > c e c < a e a | o4 e g b > d < b g e g | o4 f a > c e c < a f a | o4 e g > c e c < g e g |
        o4 d f a > c < a f d f | o4 e g b > d < b g e g | o4 f a > c e o4 g b > d g | o4 e a b > e o4 e g+ b > d |
        [o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d < b g e g | o4 e a > c e c < a e a]2
      `,
    },
    {
      inst: 'pad',
      vol: 0.45,
      pan: 0.3,
      mml: `
        @pad v7 q8 k2 o4
        '<b>d g'1 | 'c e g'1 | L
        'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'1 | 'c e g'1 | 'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'2 'c+ e g'2 | 'c f a'2 'c f g'2 |
        'c e g'1 | '<b>d g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | '<b>d g'1 | 'c f a'2 '<b>d g'2 | '<b>e a'2 '<b>d g+'2 |
        ['c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'1 | 'c e g'1]2
      `,
    },
    {
      inst: 'bass',
      vol: 0.7,
      mml: `
        @bass v10 q7 k2 o2
        e1 | a1 | L
        f2 c2 | g2 d2 | e2 b2 | a2 e2 | f2 c2 | g2 d2 | e2 a2 | d2 g2 |
        a2 e2 | e2 b2 | f2 c2 | e2 c2 | d2 a2 | e2 b2 | f2 g2 | e2 e2 |
        [f2 c2 | g2 d2 | e2 b2 | a2 e2]2
      `,
    },
  ],
};

export default song;
