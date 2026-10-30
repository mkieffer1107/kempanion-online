import type { Song } from '../mml';

// Perfusion! (rhythm mini-game). D dorian, a CONSTANT 96 BPM (no tempo changes anywhere), 26 bars = 65 s.
// The heartbeat track never changes: a crisp lub (kick) on every beat and a dub (kick tuned up) a 16th later,
// so a chart can sync to beats: beat n is at n × 0.625 s from the song start.
// Form: count-in 2 bars (heart + a monitor beep on every beat; not looped) | I "resting" 8 (PIGGY 2 motif,
// strings, whole-note bass, a beep each bar) | II "elevated" 8 (+ offbeat hats, e-piano 8ths, 8th bass, beeps on
// 1 and 3) | III "cardio" 8 (+ claps on 2 and 4, 16th hats, pluck 16ths, octave bass, a beep on every beat).
// Every section is the same 8-bar progression: Dm–Gsus4–Dm–C–Dm–G–F/C–Dm. Loops back to I.
const song: Song = {
  id: 'mini_perfusion',
  title: 'Perfusion!',
  bpm: 96,
  loop: true,
  echo: 0.15,
  tracks: [
    {
      inst: 'pulse50',
      vol: 0.76,
      mml: `
        @pulse50 v13 q6 l8
        r1 | r1 | L
        ; I — resting
        o4 d4 a4 g f e f | d2 c4 d4 | f4 > c4 < b a g a | f2 e4 c4 |
        d4 a4 g f e f | b2 a4 g4 | a4 > c4 < g4 e4 | d2 c4 d4 |
        ; II — elevated
        o5 d4 a4 g f e f | d2 c4 d4 | f g a > c < b a g a | g4 e4 c4 e4 |
        d4 a4 g f e f | b a g a b4 > d4 < | > c4 < a4 g4 e4 | f2 d4 r4 |
        ; III — cardio
        o5 d d a a g f e f | d4 d c c4 d4 | f a > c d c < b a g | e g > c < g e g > c e |
        o5 d d a a g f e f | g b > d < b g b > d g | o5 a > c f c < g > c e c | o5 d2. r4 |
      `,
    },
    {
      inst: 'strings',
      vol: 0.5,
      pan: -0.2,
      mml: `
        @strings v7 q8 o4
        r1 | 'd f a'1 | L
        ; I — an octave down, under the motif
        o3 v8 'd f a'1 | 'd g > c'1 | 'd f a'1 | 'c f g'2 'c e g'2 | 'd f a'1 | 'd g b'1 | 'c f a'2 'c e g'2 | 'd f a'1 |
        ; II
        o4 'd f a'1 | 'd g > c'1 | 'd f a'1 | 'c e g'1 | 'd f a'1 | 'd g b'1 | 'c f a'2 'c e g'2 | 'd f a'1 |
        ; III
        v9 'd f a'1 | 'd g > c'1 | 'd f a'1 | 'c e g'1 | 'd f a'1 | 'd g b'1 | 'c f a'2 'c e g'2 | 'd f a'1 |
      `,
    },
    {
      // Arpeggios: tacet in I, e-piano 8ths in II, pluck 16ths in III
      inst: 'epiano',
      vol: 0.46,
      pan: 0.3,
      mml: `
        @epiano v7 l8
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; II
        o3 d a > d f a f d < a | o3 g > d g > c d c < g d | o3 d a > d f a f d < a | o3 c g > c e g e c < g |
        o3 d a > d f a f d < a | o3 g > d g b > d < b g d | o3 f > c f a o3 c g > c e | o3 d a > d f a f d < a |
        ; III
        @pluck v8 q5 l16
        [o4 d f a f]4 | [o4 d g > c < g]4 | [o4 d f a f]4 | [o4 c e g e]4 |
        [o4 d f a f]4 | [o4 d g b g]4 | [o4 c f a f]2 [o4 c e g e]2 | [o4 d f a f]4 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.74,
      mml: `
        @bass v12 l8
        r1 | o2 d1 | L
        ; I
        q8 o2 d1 | g1 | d1 | c1 | d1 | g1 | f2 c2 | d1 |
        ; II
        q6 o2 d d d d d d d d | g g g g g g g g | d d d d d d d d | c c c c c c c c |
        d d d d d d d d | g g g g g g g g | f f f f c c c c | d d d d d d d d |
        ; III
        o2 d d o3 d o2 d d d o3 d o2 d | g g o3 g o2 g g g o3 g o2 g | d d o3 d o2 d d d o3 d o2 d | c c o3 c o2 c c c o3 c o2 c |
        d d o3 d o2 d d d o3 d o2 d | g g o3 g o2 g g g o3 g o2 g | f f o3 f o2 f c c o3 c o2 c | d d o3 d o2 d d d o3 d o2 d |
      `,
    },
    {
      // The heartbeat: lub on every beat, dub a 16th later — identical in every bar
      inst: 'drums',
      vol: 0.64,
      mml: `
        @drums
        [o4 v13 c16 o5 v9 c16 r8]8 | L
        [[o4 v13 c16 o5 v9 c16 r8]4 |]24
      `,
    },
    {
      // Kit layers: offbeat hats (II), claps on 2 and 4 + 16th hats (III)
      inst: 'drums',
      vol: 0.6,
      mml: `
        @drums
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        [r8 v6 e8 r8 v6 e8 r8 v6 e8 r8 v7 f8 |]8
        [r16 v4 e16 v7 e16 v4 e16 v9 g16 v4 e16 v7 e16 v4 e16 r16 v4 e16 v7 e16 v4 e16 v9 g16 v4 e16 v7 f16 v4 e16 |]8
      `,
    },
    {
      // Monitor beep: every beat in the count-in, then 1 → 2 → 4 per bar
      inst: 'glock',
      vol: 0.5,
      pan: 0.2,
      mml: `
        @glock v9 q2 l16
        [o5 a r r8]8 | L
        [o5 a r r8 r4 r2 |]8
        [o5 a r r8 r4 a r r8 r4 |]8
        [o5 a r r8 a r r8 a r r8 a r r8 |]8
      `,
    },
  ],
};

export default song;
