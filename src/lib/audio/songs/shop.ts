import type { Song } from '../mml';

// Campus store. Written in C, sounds in G (k-5; drums untransposed). Bossa-ish: root–fifth bass, 3-2 clave on the
// high tom, 16th shaker, syncopated pluck comp. 32 bars:
// A 8: flute, dotted and jaunty, ii–V to iii at the end | B 8: marimba runs | C 4: breakdown, marimba price-tag blips |
// A' 8 | tag 4: iii–VI–ii–V twice → A.
const song: Song = {
  id: 'shop',
  title: 'Union Market',
  bpm: 120,
  loop: true,
  echo: 0.2,
  tracks: [
    {
      inst: 'flute',
      vol: 0.68,
      mml: `
        @flute v12 y3 k-5 l8
        o5 e4. d e4. g | a4. g e4 r4 | f4. e f4. a | g4. f d4 r4 |
        e4. d e4. g | b-4. a g4 e4 | a4. > c < a4 f4 | a4. f+ d+4 r4 |
        @marimba v12 y0
        r e g b > d4 < b4 | > c+4 < a g e4 r4 | r d f a > c4 < a4 | b4 g f d4 r4 |
        e g b4 a g e4 | d f a4 g f d4 | e2 a2 | g2. r4 |
        v9 r1 | r2 e g a g | r1 | r2 f a g f |
        @flute v12 y3
        o5 e4. d e4. g | a4. g e4 r4 | f4. e f4. a | g4. f d4 r4 |
        e4. d e4. g | b-4. a g4 e4 | a4. > c < a4 f4 | a4. f+ d+4 r4 |
        r e g b a g e4 | r d f a g f d4 | e g b > d c+ < a g e | d f a > c < b g f d |
      `,
    },
    {
      // Bossa comp, two-bar rhythm cell
      inst: 'pluck',
      vol: 0.5,
      pan: -0.3,
      mml: `
        @pluck v9 q4 k-5 l8 o4
        'e g b' r 'e g b' r r 'e g b' r 'e g b' | r 'g > c e' r 'g > c e' 'g > c e' r 'g > c e' r |
        'f a > c' r 'f a > c' r r 'f a > c' r 'f a > c' | r 'f b > d' r 'f b > d' 'f b > d' r 'f b > d' r |
        'e g b' r 'e g b' r r 'e g b' r 'e g b' | r 'e b- > d' r 'e b- > d' 'e b- > d' r 'e b- > d' r |
        'f a > c' r 'f a > c' r r 'f a > c' r 'f a > c' | r 'e a > c' r 'e a > c' 'd+ a b' r 'd+ a b' r |
        'd g b' r 'd g b' r r 'd g b' r 'd g b' | r 'c+ e g' r 'c+ e g' 'c+ e g' r 'c+ e g' r |
        'f a > c' r 'f a > c' r r 'f a > c' r 'f a > c' | r 'f b > d' r 'f b > d' 'f b > d' r 'f b > d' r |
        'd g b' r 'd g b' r r 'c+ e g' r 'c+ e g' | r 'f a > c' r 'f a > c' 'f b > d' r 'f b > d' r |
        'e g a' r 'e g a' r r 'e g a' r 'e g a' | r 'f b > d' r 'f b > d' 'f b > d' r 'f b > d' r |
        'e g b' r 'e g b' r r 'e g b' r 'e g b' | r 'g > c e' r 'g > c e' 'g > c e' r 'g > c e' r |
        'f a > c' r 'f a > c' r r 'f a > c' r 'f a > c' | r 'f b > d' r 'f b > d' 'f b > d' r 'f b > d' r |
        'e g b' r 'e g b' r r 'e g b' r 'e g b' | r 'g > c e' r 'g > c e' 'g > c e' r 'g > c e' r |
        'f a > c' r 'f a > c' r r 'f a > c' r 'f a > c' | r 'f b > d' r 'f b > d' 'f b > d' r 'f b > d' r |
        'e g b' r 'e g b' r r 'e g b' r 'e g b' | r 'e b- > d' r 'e b- > d' 'e b- > d' r 'e b- > d' r |
        'f a > c' r 'f a > c' r r 'f a > c' r 'f a > c' | r 'e a > c' r 'e a > c' 'd+ a b' r 'd+ a b' r |
        ['d g b' r 'd g b' r r 'c+ e g' r 'c+ e g' | r 'f a > c' r 'f a > c' 'f b > d' r 'f b > d' r]2
      `,
    },
    {
      // Bossa bass: root, fifth below
      inst: 'bass',
      vol: 0.8,
      mml: `
        @bass v12 q6 k-5 l8
        o3 c4. o2 g g4. o3 c | o2 a4. e e4. a | o3 d4. o2 a a4. o3 d | o2 g4. d d4. g |
        o3 c4. o2 g g4. o3 c | o3 c4. o2 g g4. o3 c | o2 f4. o3 c c4. o2 f | o2 f+4. o3 c o2 b4. f+ |
        o3 e4. o2 b b4. o3 e | o2 a4. e e4. a | o3 d4. o2 a a4. o3 d | o2 g4. d d4. g |
        o3 e4. o2 b a4. e | o3 d4. o2 a g4. d | o3 c4. o2 g g4. o3 c | o2 g4. d d4. g |
        o3 c4. o2 g g4. o3 c | o2 a4. e e4. a | o3 d4. o2 a a4. o3 d | o2 g4. d d4. g |
        o3 c4. o2 g g4. o3 c | o2 a4. e e4. a | o3 d4. o2 a a4. o3 d | o2 g4. d d4. g |
        o3 c4. o2 g g4. o3 c | o3 c4. o2 g g4. o3 c | o2 f4. o3 c c4. o2 f | o2 f+4. o3 c o2 b4. f+ |
        [o3 e4. o2 b a4. e | o3 d4. o2 a g4. d]2
      `,
    },
    {
      // Kick follows the bass
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l8
        [v9 c4. v7 c v8 c4. v7 c]15
        v9 c4. v7 c v9 a16 a16 b16 b16 v10 a b
        [v9 c4. v7 c v8 c4. v7 c]15
        v9 c4. v7 c v9 a16 a16 b16 b16 v10 a b
      `,
    },
    {
      // 3-2 clave on the high tom
      inst: 'drums',
      vol: 0.4,
      pan: 0.2,
      mml: `
        @drums l8
        [v8 b r r b r r b r | r r b r b r r r]16
      `,
    },
    {
      // Shaker
      inst: 'drums',
      vol: 0.35,
      pan: -0.2,
      mml: `
        @drums
        [[v5 e16 v3 e16 v4 e16 v3 e16]4]32
      `,
    },
  ],
};

export default song;
