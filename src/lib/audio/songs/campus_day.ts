import type { Song } from '../mml';

// Daytime campus. Written in C, sounds in A major (k-3; drums untransposed). 40 bars:
// A 8 verse (I–V–vi–IV, syncopated lead over a tresillo comp) | B 8 (ii–V–iii–vi, the glock answers the lead) |
// C 8 chorus (I–V–vi–IV) | D 8 breakdown (lead rests, glock hums the verse, drums build) | C' 8 chorus + glock octave → A.
const song: Song = {
  id: 'campus_day',
  title: 'Gator Afternoon',
  bpm: 116,
  loop: true,
  echo: 0.2,
  tracks: [
    {
      inst: 'lead',
      vol: 0.66,
      mml: `
        @lead v13 y5 k-3 l8
        ; A
        o5 e d e g4 e d c | d2 r < a b > d | e d e a4 g e d | c4. < a > c4 d4 |
        e d e g4 e d c | d4 g4 b4 > d4 | c4. < b a4 e4 | a4 g f e4 d4 |
        ; B
        f4. e d4 c4 | d2 r2 | g4. a g4 e4 | e2 r2 | a4. g f4 e4 | d4. e f4 g4 | a4. g a4 > c4 | < b2 > d4 r4 |
        ; C — chorus
        o6 c4. < b > c4 e4 | d2 < b4 g4 | a4. g a4 > c4 | < a2 r4 g4 |
        > c4. < b > c4 e4 | g2 f4 e4 | e4. d c4 < a4 | > c2. r4 |
        ; D — breakdown
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; C'
        o6 c4. < b > c4 e4 | d2 < b4 g4 | a4. g a4 > c4 | < a2 r4 g4 |
        > c4. < b > c4 e4 | g2 f4 e4 | e4. d c4 < a4 | > c2. r4 |
      `,
    },
    {
      // Pluck arpeggios
      inst: 'pluck',
      vol: 0.46,
      pan: -0.3,
      mml: `
        @pluck v9 q6 k-3 l8
        [o4 c g > c < g > e < g > c < g | o3 b > d g d b d g d | o4 c e a e > c < e a e | o4 c f a f > c < f a f]2
        o4 d f a f > c < f a f | o3 b > d g d b d g d | o4 e g b g > d < g b g | o4 c e g e a e g e |
        o4 d f a f > c < f a f | o3 b > d g d b d g d | o4 c f a f > e < f a f | o3 b > d g d b d g d |
        [o4 c g > c < g > e < g > c < g | o3 b > d g d b d g d | o4 c e a e > c < e a e | o4 c f a f > c < f a f]2
        v8 o4 c e a e > c < e a e | o4 c f a f > c < f a f | o4 c g > c < g > e < g > c < g | o3 b > d g d b d g d |
        v9 o4 c e a e > c < e a e | o4 c f a f > c < f a f | o3 b > d g d b d g d | o3 b > d g d b d g d |
        [o4 c g > c < g > e < g > c < g | o3 b > d g d b d g d | o4 c e a e > c < e a e | o4 c f a f > c < f a f]2
      `,
    },
    {
      // E-piano: tresillo comp in verse/chorus, held chords elsewhere
      inst: 'epiano',
      vol: 0.46,
      pan: 0.3,
      mml: `
        @epiano v9 q6 k-3 o4
        ['e g > c'4. 'e g > c'4. 'e g > c'4 | 'd g b'4. 'd g b'4. 'd g b'4 | 'e a > c'4. 'e a > c'4. 'e a > c'4 | 'f a > c'4. 'f a > c'4. 'f a > c'4]2
        q8 v8 'c f a'1 | '<b>d g'1 | '<b>d g'1 | 'c e g'1 | 'c f a'1 | '<b>d g'1 | 'c f a'1 | '<b>d g'1 |
        q6 v9 ['e g > c'4. 'e g > c'4. 'e g > c'4 | 'd g b'4. 'd g b'4. 'd g b'4 | 'e a > c'4. 'e a > c'4. 'e a > c'4 | 'f a > c'4. 'f a > c'4. 'f a > c'4]2
        q8 v7 'e a > c'1 | 'f a > c'1 | 'e g > c'1 | 'd g b'1 | 'e a > c'1 | 'f a > c'1 | 'd g b'1 | 'd g b'1 |
        q6 v9 ['e g > c'4. 'e g > c'4. 'e g > c'4 | 'd g b'4. 'd g b'4. 'd g b'4 | 'e a > c'4. 'e a > c'4. 'e a > c'4 | 'f a > c'4. 'f a > c'4. 'f a > c'4]2
      `,
    },
    {
      inst: 'bass',
      vol: 0.74,
      mml: `
        @bass v12 k-3 o2 l8
        [> c4. c4. < g4 | g4. g4. b4 | a4. a4. e4 | f4. f4. g4]2
        d4 d4 a4 f4 | g4 g4 d4 g4 | e4 e4 b4 g4 | a4 a4 e4 g4 | d4 d4 a4 f4 | g4 g4 d4 b4 | f4 f4 > c4 < a4 | g4 g4 a4 b4 |
        [> c c c c c c c c < | g g g g g g g g | a a a a a a a a | f f f f f f f g]2
        v11 a1 | f1 | > c1 < | g1 | a2 a2 | f2 f2 | g4 g4 g4 g4 | g g g g g g g g |
        v12 [> c c c c c c c c < | g g g g g g g g | a a a a a a a a | f f f f f f f g]2
      `,
    },
    {
      inst: 'drums',
      vol: 0.51,
      mml: `
        @drums l8
        [v10 c v6 e v9 d v6 e v10 c v6 e v9 d v6 e]7
        v10 c v6 e v9 d v6 e v9 b16 b16 a16 a16 v10 d16 d16 d16 d16
        [v9 c4 v6 e e v8 g4 v6 e e]6
        v8 d d d d v9 d d d d | v9 d16 d16 d16 d16 v10 d16 d16 d16 d16 v11 d16 d16 d16 d16 v12 d16 d16 d16 d16 |
        v12 'c f' v7 e v10 d v7 e v11 c c v10 d v7 f
        [v11 c v7 e v10 d v7 e v11 c c v10 d v7 f]6
        v11 c v7 e v10 d v7 e v9 b16 b16 a16 a16 v10 d16 d16 d16 d16
        [v9 c4 v5 e e v5 e4 e e]4
        [v10 c4 v6 e e v9 d4 v6 e e]2
        v10 c v6 e v9 d v6 e v9 d d d d | v9 d16 d16 v10 d16 d16 v10 d16 d16 v11 d16 d16 v11 d16 d16 v12 d16 d16 v12 b16 b16 a16 a16 |
        v12 'c f' v7 e v10 d v7 e v11 c c v10 d v7 f
        [v11 c v7 e v10 d v7 e v11 c c v10 d v7 f]6
        v11 c v7 e v10 d v7 e v9 b16 b16 a16 a16 v10 d16 d16 d16 d16
      `,
    },
    {
      // Glock: answers in B, hums the verse in the breakdown, octave-doubles the last chorus
      inst: 'glock',
      vol: 0.41,
      pan: 0.35,
      mml: `
        @glock v9 k-3 l8
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r2 o6 d c < b g | r1 | r2 > e d c < a | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        v8 o5 e d e g4 e d c | d2 r2 | e d e a4 g e d | d2 r2 | r1 | r1 | r1 | r1 |
        v7 o7 c4. < b > c4 e4 | d2 < b4 g4 | a4. g a4 > c4 | < a2 r4 g4 |
        > c4. < b > c4 e4 | g2 f4 e4 | e4. d c4 < a4 | > c2. r4 |
      `,
    },
  ],
};

export default song;
