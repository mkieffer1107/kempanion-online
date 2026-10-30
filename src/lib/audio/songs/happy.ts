import type { Song } from '../mml';

// Celebration. Written in C, sounds in E (k-8; drums untransposed). Intro 2 (not looped): horn hits + snare roll |
// A 8: I–vi–IV–V, pulse lead over 16th pulse12 arps, offbeat brass stabs, four-on-the-floor |
// B 8: chant-like chorus (IV–V–iii–vi–ii–V–I) | C 8: brass bridge (ii–V–iii–VI…, minor iv) | B' 8 with glock on top → A.
const song: Song = {
  id: 'happy',
  title: 'Best Day Ever',
  bpm: 128,
  loop: true,
  echo: 0.18,
  tracks: [
    {
      inst: 'pulse25',
      vol: 0.66,
      mml: `
        @pulse25 v13 y3 k-8 l8
        r1 | r1 | L
        o5 e4 e d e4 g4 | a4 a g e4 c4 | f4 f g a4 f4 | e4 d4 r4 g g |
        > c4 < b > c d4 c4 | e4 d c < a4 > c4 | d4 c < a f4 a4 | g2 r4 a b |
        > c c < a > c r c d c | < b b g b r b > c < b | g g e g r g a g | a2 e4 r4 |
        f f d f r f g f | g g d g r g a b | > c4 e4 d4 c4 | c2. r4 |
        @brass v13 y4
        o5 d4 f4 a4 > c4 | < b4 g4 f4 d4 | e4 g4 b4 > d4 | c+4 < a4 g4 e4 |
        f4 a4 > c4 e4 | d4 < b4 g4 f4 | a-4 > c4 < a-4 f4 | g2 r4 a b |
        @pulse25 v13 y3
        > c c < a > c r c d c | < b b g b r b > c < b | g g e g r g a g | a2 e4 r4 |
        f f d f r f g f | g g d g r g a b | > c4 e4 d4 c4 | < b2 g4 r4 |
      `,
    },
    {
      // 16th-note pulse12 arpeggios (rest in the bridge)
      inst: 'pulse12',
      vol: 0.39,
      pan: -0.3,
      mml: `
        @pulse12 v7 k-8 l16
        r1 | r1 | L
        [[o5 c e g e]4 | [o5 c e a e]4 | [o5 c f a f]4 | [o5 d g b g]4]2
        [o5 c f a f]4 | [o5 d g b g]4 | [o5 e g b g]4 | [o5 c e a e]4 |
        [o5 d f a f]4 | [o5 d g b g]4 | [o5 c e g e]4 | [o5 c e g e]4 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        [o5 c f a f]4 | [o5 d g b g]4 | [o5 e g b g]4 | [o5 c e a e]4 |
        [o5 d f a f]4 | [o5 d g b g]4 | [o5 c e g e]4 | [o5 d f g b]4 |
      `,
    },
    {
      // Brass stabs on the offbeats of 2 and 4; strings pad in the bridge
      inst: 'brass',
      vol: 0.46,
      pan: 0.25,
      mml: `
        @brass v10 q4 k-8 l8 o5
        'e g > c' r r4 'e g > c' r r4 | 'f a > c' r 'f a > c' r 'd g b'4 r4 | L
        [r4 r 'e g > c' r4 r 'e g > c' | r4 r 'e a > c' r4 r 'e a > c' | r4 r 'f a > c' r4 r 'f a > c' | r4 r 'd g b' r4 r 'd g b']2
        r4 r 'f a > c' r4 r 'f a > c' | r4 r 'd g b' r4 r 'd g b' | r4 r 'e g b' r4 r 'e g b' | r4 r 'e a > c' r4 r 'e a > c' |
        r4 r 'd f a' r4 r 'd f a' | r4 r 'd g b' r4 r 'd g b' | r4 r 'e g > c' r4 r 'e g > c' | 'e g > c'4 r4 r2 |
        @strings v8 q8 o4 'c f a'1 | '<b > d f'1 | '<b > e g'1 | 'c+ e g'1 | 'c f a'1 | '<b > d f'1 | 'c f a-'1 | '<b > d g'1 |
        @brass v10 q4 o5
        r4 r 'f a > c' r4 r 'f a > c' | r4 r 'd g b' r4 r 'd g b' | r4 r 'e g b' r4 r 'e g b' | r4 r 'e a > c' r4 r 'e a > c' |
        r4 r 'd f a' r4 r 'd f a' | r4 r 'd g b' r4 r 'd g b' | r4 r 'e g > c' r4 r 'e g > c' | r4 r 'd f b' r4 r 'd f b' |
      `,
    },
    {
      inst: 'bass',
      vol: 0.74,
      mml: `
        @bass v12 q6 k-8 l8
        o3 c r r4 c r r4 | o2 f r f r g4 r4 | L
        o3 c c > c < c c c > c < c | o2 a a > a < a a a > a < a | o2 f f > f < f f f > f < f | o2 g g > g < g g g > g < g |
        o3 c c > c < c c c > c < c | o2 a a > a < a a a > a < a | o2 f f > f < f f f > f < f | o2 g g > g < g g g e e |
        o2 f f > f < f f f > f < f | o2 g g > g < g g g > g < g | o3 e e > e < e e e > e < e | o2 a a > a < a a a > a < a |
        o3 d d > d < d d d > d < d | o2 g g > g < g g g > g < g | o3 c c > c < c c c > c < c | o3 c c > c < c c c c+ c+ |
        o3 d4 d4 f4 a4 | o2 g4 g4 b4 > d4 | o3 e4 e4 g4 b4 | o2 a4 a4 > c+4 e4 |
        o3 d4 d4 f4 a4 | o2 g4 g4 b4 > d4 | o3 f4 f4 a-4 > c4 | o2 g4 g4 g4 e4 |
        o2 f f > f < f f f > f < f | o2 g g > g < g g g > g < g | o3 e e > e < e e e > e < e | o2 a a > a < a a a > a < a |
        o3 d d > d < d d d > d < d | o2 g g > g < g g g > g < g | o3 c c > c < c c c > c < c | o2 g g > g < g g g a b |
      `,
    },
    {
      // Four on the floor, clap on 2 and 4
      inst: 'drums',
      vol: 0.51,
      mml: `
        @drums l8
        v12 'c f' r r4 'c f' r r4 | v10 d16 d16 d16 d16 v11 d16 d16 d16 d16 v12 d16 d16 d16 d16 v12 d16 d16 d16 d16 | L
        [v11 c4 v10 'c g'4 v11 c4 v10 'c g'4]7
        v11 c4 v10 'c g'4 v10 b16 b16 a16 a16 v11 g16 g16 g16 g16
        [v11 c4 v10 'c g'4 v11 c4 v10 'c g'4]7
        v11 c4 v10 'c g'4 v10 b16 b16 a16 a16 v11 g16 g16 g16 g16
        [v10 c4 v9 g4 v10 c c v9 g4]7
        v10 c4 v9 g4 v10 d16 d16 d16 d16 v11 d16 d16 v12 d16 d16
        v12 'c f'4 v10 'c g'4 v11 c4 v10 'c g'4
        [v11 c4 v10 'c g'4 v11 c4 v10 'c g'4]6
        v11 c4 v10 'c g'4 v10 b16 b16 a16 a16 v11 g16 g16 g16 g16
      `,
    },
    {
      // Hats: closed on the beat, open on the offbeat
      inst: 'drums',
      vol: 0.32,
      pan: 0.2,
      mml: `
        @drums l8
        r1 | r1 | L
        [v6 e v8 f v6 e v8 f v6 e v8 f v6 e v8 f]32
      `,
    },
    {
      // Glock sparkles in B, doubles the last chorus an octave up
      inst: 'glock',
      vol: 0.39,
      pan: 0.35,
      mml: `
        @glock v8 k-8 l8
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        o6 c4 r2. | r1 | < b4 r2. | r1 | a4 r2. | r1 | > c4 r2. | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        v8 o7 c c < a > c r c d c | < b b g b r b > c < b | g g e g r g a g | a2 e4 r4 |
        f f d f r f g f | g g d g r g a b | > c4 e4 d4 c4 | < b2 g4 r4 |
      `,
    },
  ],
};

export default song;
