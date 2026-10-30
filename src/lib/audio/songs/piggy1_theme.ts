import type { Song } from '../mml';

// Piggy 1's theme. G major, 150 BPM, 44 bars. Form: intro 4 (the "ball" ping-pongs left/right over a D pedal,
// snare build; not looped) | A 8 (PIGGY 1 motif on pulse25 over offbeat chip stabs) | A' 8 (pulse12 harmony joins,
// claps; G7 into the chorus) | B 8 (chant chorus on the royal road C–D–Bm–Em, brass hits, four-on-the-floor) |
// breakdown 8 (he calls the motif, the pulse12 finishes it — "Yours!" — then both play it together; build) |
// B' 8 (chorus, Am7–D7 turnaround back to A).
const song: Song = {
  id: 'piggy1_theme',
  title: 'Rally!',
  bpm: 150,
  loop: true,
  echo: 0.18,
  tracks: [
    {
      // Lead
      inst: 'pulse25',
      vol: 0.74,
      mml: `
        @pulse25 v13 y3 l8
        r1 | r1 | r1 | r2 o5 d e f+4 | L
        ; A
        o5 g g b > d4. < b r | > c d < b g a4 g4 | e e g b4. g r | a b g e f+4 d4 |
        g g b > d4. < b r | > c d e g4 f+ e d | c < a > c e d4 c4 | < b4 a4 g4 r4 |
        ; A'
        o5 g g b > d4. < b r | > c d < b g a4 g4 | b b > d e4. d r | c < b a g f+4 a4 |
        g g b > d4. < b r | > e d c < b > c4 d4 | e4 g4 f+ e d c | < b4 a4 g4 f4 |
        ; B — chorus
        o5 e4 e d e4 g4 | f+4 f+ e f+4 a4 | b4 b a b4 > d4 | e2. < b4 |
        > c4. < b a4 g4 | a4. g f+4 d4 | g4 g a b4 > d4 | < b2 a4 r4 |
        ; breakdown — he calls it, the pulse12 takes it
        o5 g g b > d4. < b r | r1 | g g b > d4. < b r | r1 |
        g g b > d4. < b r | > c d < b g a4 g4 | a1 | r1 |
        ; B'
        o5 e4 e d e4 g4 | f+4 f+ e f+4 a4 | b4 b a b4 > d4 | e2. < b4 |
        > c4. < b a4 g4 | a4. g f+4 d4 | g4 g a b4 > e4 | c4 < a4 f+4 d4 |
      `,
    },
    {
      // pulse12: ping-pong "ball", harmony in A', arpeggios in the chorus, the answer in the breakdown
      inst: 'pulse12',
      vol: 0.55,
      pan: 0.25,
      mml: `
        @pulse12 v8 q4 l8
        [p-35 o5 a r p35 o6 d r]4 | p25 v6 l16 o4 [d f+ a > d <]4 | v8 o5 [d f+ a > d <]4 | L
        ; A — space, one bounce at the end
        l8 r1 | r1 | r1 | r1 | r1 | r1 | r1 | r2 l16 o6 d r < b r g r b r |
        ; A' — harmony under the lead
        l8 q5 o5 d d g b4. g r | a b g e f+4 d4 | g g b b4. b r | a g e e d4 f+4 |
        d d g b4. g r | > c < b a g a4 a4 | > c4 e4 d c < a a | g4 e4 d4 d4 |
        ; B — arpeggios
        q4 v7 l16 o5 [c e g e]4 | [d f+ a f+]4 | [d f+ b f+]4 | [e g b g]4 |
        [c e g e]4 | [d f+ a f+]4 | [d g b g]4 | [d g b g]2 [d f+ a f+]2 |
        ; breakdown — "Yours!"
        q5 v8 l8 r1 | o6 c d < b g a4 g4 | r1 | o5 a b g e f+4 d4 |
        o5 e e g b4. g r | a b g e c4 e4 | v6 l16 o4 a o5 c e g a o6 c e g o4 a o5 c e g a o6 c e g | v9 l8 o4 d f+ a > c d f+ a > c |
        ; B'
        q4 v7 l16 o5 [c e g e]4 | [d f+ a f+]4 | [d f+ b f+]4 | [e g b g]4 |
        [c e g e]4 | [d f+ a f+]4 | [d g b g]2 [e g b g]2 | [e g a > c <]2 [d f+ a > c <]2 |
      `,
    },
    {
      // Offbeat chip stabs in A, brass hits in the chorus, brass bed in the breakdown
      inst: 'pulse50',
      vol: 0.42,
      pan: -0.25,
      mml: `
        @pulse50 v8 q3 l8 o4
        r1 | r1 | @brass q8 v7 'd f+ a'1 | v9 'd f+ a > c'1 | L
        ; A
        @pulse50 q3 v8 o4
        [r 'g b > d']4 | [r 'g > c e']2 [r 'f+ a > d']2 | [r 'g b > e']4 | [r 'g > c e']2 [r 'f+ a > d']2 |
        [r 'g b > d']4 | [r 'g > c e']2 [r 'f+ a > d']2 | [r 'a > c e']2 [r 'f+ a > d']2 | [r 'g b > d']4 |
        ; A'
        [r 'g b > d']4 | [r 'g > c e']2 [r 'f+ a > d']2 | [r 'g b > e']4 | [r 'g > c e']2 [r 'f+ a > d']2 |
        [r 'g b > d']4 | [r 'g > c e']2 [r 'f+ a > d']2 | [r 'a > c e']2 [r 'f+ a > d']2 | [r 'g b > d']2 [r 'f g b > d']2 |
        ; B — brass chant hits
        @brass q7 v9
        'e g > c'4. 'e g > c' ^2 | 'f+ a > d'4. 'f+ a > d' ^2 | 'f+ b > d'4. 'f+ b > d' ^2 | 'e g b'4. 'e g b' ^2 |
        'e g > c'4. 'e g > c' ^2 | 'f+ a > d'4. 'f+ a > d' ^2 | 'd g b'4. 'd g b' ^2 | 'd g b'2 'd f+ a'2 |
        ; breakdown
        q8 v7 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 | 'e g b'1 | 'e g > c'1 | 'e g a > c'1 | v9 'f+ a > c d'1 |
        ; B'
        q7 v9
        'e g > c'4. 'e g > c' ^2 | 'f+ a > d'4. 'f+ a > d' ^2 | 'f+ b > d'4. 'f+ b > d' ^2 | 'e g b'4. 'e g b' ^2 |
        'e g > c'4. 'e g > c' ^2 | 'f+ a > d'4. 'f+ a > d' ^2 | 'd g b'4. 'd g b' ^4 'e g b'4 | 'e g a > c'4. 'e g a > c' 'f+ a > c d'2 |
      `,
    },
    {
      // Driving bass: 8ths with octave pops
      inst: 'bass',
      vol: 0.8,
      mml: `
        @bass v12 l8
        o2 d4 r4 d4 r4 | d4 r4 d4 r4 | d d d d d d d d | d d o3 d o2 d d o3 d o2 d d | L
        ; A
        o2 g g g o3 g o2 g g g o3 g | o3 c c c o4 c o3 d d d o4 d | o2 e e e o3 e o2 e e e o3 e | o3 c c c o4 c o3 d d d o4 d |
        o2 g g g o3 g o2 g g g o3 g | o3 c c c o4 c o3 d d d o4 d | o2 a a a o3 a o3 d d d o4 d | o2 g g g o3 g o2 g g d f+ |
        ; A'
        o2 g g g o3 g o2 g g g o3 g | o3 c c c o4 c o3 d d d o4 d | o2 e e e o3 e o2 e e e o3 e | o3 c c c o4 c o3 d d d o4 d |
        o2 g g g o3 g o2 g g g o3 g | o3 c c c o4 c o3 d d d o4 d | o2 a a a o3 a o3 d d d o4 d | o2 g g g o3 g o2 g g a b |
        ; B
        o3 c c c o4 c o3 c c c c+ | d d d o4 d o3 d d d d | o2 b b b o3 b o2 b b b b | o2 e e e o3 e o2 e g a b |
        o3 c c c o4 c o3 c c c c+ | d d d o4 d o3 d d d d | o2 g g g o3 g o2 g g g g | o2 g g g o3 g o3 d d d d |
        ; breakdown
        o2 e4. e e2 | o3 c4. c c2 | o2 g4. g g2 | o3 d4. d d2 | o2 e4. e e2 | o3 c4. c c2 |
        o2 a a a a a a a a | o3 d d d d d d d d |
        ; B'
        o3 c c c o4 c o3 c c c c+ | d d d o4 d o3 d d d d | o2 b b b o3 b o2 b b b b | o2 e e e o3 e o2 e g a b |
        o3 c c c o4 c o3 c c c c+ | d d d o4 d o3 d d d d | o2 g g g o3 g o2 e e e o3 e | o2 a a a o3 a o3 d d o2 a f+ |
      `,
    },
    {
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l8
        [v11 c4 v6 e4 v9 g4 v6 e4]2 | v6 d v7 d v8 d d v9 d d v10 d d |
        l16 v8 d d v9 d d v10 d d v11 d d v11 d d v12 d d v11 b b a a | L
        ; A
        l8 v12 'c f' v7 e v10 d v7 e v11 c c v10 d v7 e | [v11 c v7 e v10 d v7 e v11 c c v10 d v7 e]2 |
        v11 c v7 e v10 d v7 e v11 c c v9 d16 v10 d16 v11 d16 v12 d16 |
        [v11 c v7 e v10 d v7 e v11 c c v10 d v7 e]3 | v11 c v7 e v10 d v7 e l16 v10 b b a a v11 d d d d l8 |
        ; A' — claps with the snare
        v12 'c f' v7 e v10 'd g' v7 e v11 c c v10 'd g' v7 f | [v11 c v7 e v10 'd g' v7 e v11 c c v10 'd g' v7 f]2 |
        v11 c v7 e v10 'd g' v7 e v11 c c v9 d16 v10 d16 v11 d16 v12 d16 |
        [v11 c v7 e v10 'd g' v7 e v11 c c v10 'd g' v7 f]3 | v11 c v7 e v10 'd g' v7 e l16 v10 b b a a v11 d d d d l8 |
        ; B — four on the floor
        v12 'c f' v7 e v10 'c d g' v7 e v11 c v7 e v10 'c d g' v7 e | [v11 c v7 e v10 'c d g' v7 e v11 c v7 e v10 'c d g' v7 e]6 |
        v11 c v7 e v10 'c d g' v7 e l16 v10 b b a a v11 d d d d l8 |
        ; breakdown — kick and clap, then the build
        v12 'c f' v5 e v9 g v5 e v10 c v5 e v9 g v5 e | [v10 c v5 e v9 g v5 e v10 c v5 e v9 g v5 e]5 |
        v6 d v7 d v8 d d v9 d d v10 d d | l16 v9 d d d d v10 d d d d v11 d d d d v12 d d d d l8 |
        ; B'
        v12 'c f' v7 e v10 'c d g' v7 e v11 c v7 e v10 'c d g' v7 e | [v11 c v7 e v10 'c d g' v7 e v11 c v7 e v10 'c d g' v7 e]6 |
        v11 c v7 e v10 'c d g' v7 e l16 v10 b b a a v11 d d d d l8 |
      `,
    },
  ],
};

export default song;
