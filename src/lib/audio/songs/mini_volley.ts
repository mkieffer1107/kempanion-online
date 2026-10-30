import type { Song } from '../mml';

// Sakura Spike (volleyball mini-game). Written in G, sounds in A major (k2; drums untransposed), 156 BPM.
// A steady four-on-the-floor kick never drops out, so every tap lands on a beat. 42 bars: the 40-bar loop body is
// ~61.5 s, so a 60 s game hears no repeat. Form: intro 2 (count-in; not looped) | A 8 (PIGGY 1 motif) |
// B 8 (chant chorus C–D–Bm–Em) | C 8 (motif head as calls, rising answers) | A' 8 | B' 8 (turnaround back to A).
const song: Song = {
  id: 'mini_volley',
  title: 'Sakura Spike',
  bpm: 156,
  loop: true,
  echo: 0.15,
  tracks: [
    {
      inst: 'pulse25',
      vol: 0.72,
      mml: `
        @pulse25 v13 y3 k2 l8
        r1 | r2 o5 d e f+4 | L
        ; A
        o5 g g b > d4. < b r | > c d < b g a4 g4 | e e g b4. a r | f+ g a > d4 < a f+ d |
        g g b > d4. < b r | > c d e d4 c < b g | a b > c e d4 c4 | < a2 f+4 d4 |
        ; B
        o5 e4 g4 > c4. < b | a4 f+4 d4. e | f+4 b4 > d4. < b | > e2. r4 |
        < e4 g4 > c4. < b | a4 f+4 d4. e | g4 b4 > d4. < b | g2. r4 |
        ; C
        o5 g g b > d4. < b r | r1 | g g b > d4. < b r | r2 d e f+ a |
        b b > d e4. d r | c d < b g a4 g4 | b4 a4 g4 b4 | a2 > d2 |
        ; A'
        o5 g g b > d4. < b r | > c d < b g a4 g4 | e e g b4. a r | f+ g a > d4 < a f+ d |
        g g b > d4. < b r | > c d e d4 c < b g | a b > c e d4 c4 | < a2 f+4 d4 |
        ; B'
        o5 e4 g4 > c4. < b | a4 f+4 d4. e | f+4 b4 > d4. < b | > e2. r4 |
        < e4 g4 > c4. < b | a4 f+4 d4. e | g4 b4 > d4 < b4 | > c4 < a4 f+4 d4 |
      `,
    },
    {
      // pulse12 16th arpeggios
      inst: 'pulse12',
      vol: 0.58,
      pan: 0.3,
      mml: `
        @pulse12 v7 q4 k2 l16
        [o4 f+ a > d < a]4 | [o4 f+ a > d < a]2 [o5 d f+ a f+]2 | L
        ; A
        [o4 g b > d < b]4 | [o4 g > c e c <]4 | [o4 g b > e < b]4 | [o4 f+ a > d < a]4 |
        [o4 g b > d < b]4 | [o4 g > c e c <]4 | [o4 g a > c e <]2 [o4 f+ a > d < a]2 | [o4 f+ a > d < a]4 |
        ; B
        [o4 g > c e c <]4 | [o4 f+ a > d < a]4 | [o4 f+ b > d < b]4 | [o4 g b > e < b]4 |
        [o4 g > c e c <]4 | [o4 f+ a > d < a]4 | [o4 g b > d < b]4 | [o4 g b > d < b]4 |
        ; C — the arps answer the calls an octave up
        [o4 g b > e < b]4 | v8 [o5 g > c e c <]4 | v7 [o4 g b > d < b]4 | [o4 f+ a > d < a]4 |
        [o4 g b > e < b]4 | [o4 g > c e c <]4 | [o4 g b > d < b]4 | v8 [o5 f+ a > d < a]4 |
        ; A'
        v7 [o4 g b > d < b]4 | [o4 g > c e c <]4 | [o4 g b > e < b]4 | [o4 f+ a > d < a]4 |
        [o4 g b > d < b]4 | [o4 g > c e c <]4 | [o4 g a > c e <]2 [o4 f+ a > d < a]2 | [o4 f+ a > d < a]4 |
        ; B'
        [o4 g > c e c <]4 | [o4 f+ a > d < a]4 | [o4 f+ b > d < b]4 | [o4 g b > e < b]4 |
        [o4 g > c e c <]4 | [o4 f+ a > d < a]4 | [o4 g b > d < b]2 [o4 g b > e < b]2 | [o4 g a > c e <]2 [o4 f+ a > d < a]2 |
      `,
    },
    {
      // Saw stabs on the offbeats
      inst: 'saw',
      vol: 0.46,
      pan: -0.3,
      mml: `
        @saw v8 q3 k2 l8 o4
        r1 | [r 'f+ a > d']4 | L
        ; A
        [r 'g b > d']4 | [r 'g > c e']4 | [r 'g b > e']4 | [r 'f+ a > d']4 |
        [r 'g b > d']4 | [r 'g > c e']4 | [r 'a > c e']2 [r 'f+ a > d']2 | [r 'f+ a > d']4 |
        ; B
        [r 'g > c e']4 | [r 'f+ a > d']4 | [r 'f+ b > d']4 | [r 'g b > e']4 |
        [r 'g > c e']4 | [r 'f+ a > d']4 | [r 'g b > d']4 | [r 'g b > d']4 |
        ; C
        [r 'g b > e']4 | [r 'g > c e']4 | [r 'g b > d']4 | [r 'f+ a > d']4 |
        [r 'g b > e']4 | [r 'g > c e']4 | [r 'g b > d']4 | [r 'f+ a > d']4 |
        ; A'
        [r 'g b > d']4 | [r 'g > c e']4 | [r 'g b > e']4 | [r 'f+ a > d']4 |
        [r 'g b > d']4 | [r 'g > c e']4 | [r 'a > c e']2 [r 'f+ a > d']2 | [r 'f+ a > d']4 |
        ; B'
        [r 'g > c e']4 | [r 'f+ a > d']4 | [r 'f+ b > d']4 | [r 'g b > e']4 |
        [r 'g > c e']4 | [r 'f+ a > d']4 | [r 'g b > d']2 [r 'g b > e']2 | [r 'a > c e']2 [r 'f+ a > d']2 |
      `,
    },
    {
      // Pumping 8th bass with octave pops
      inst: 'bass',
      vol: 0.78,
      mml: `
        @bass v12 q6 k2 l8
        o3 d d d d d d d d | d d o4 d o3 d d d o4 d o3 d | L
        ; A
        o2 g g o3 g o2 g g g o3 g o2 g | o3 c c o4 c o3 c c c o4 c o3 c | o2 e e o3 e o2 e e e o3 e o2 e | o3 d d o4 d o3 d d d o4 d o3 d |
        o2 g g o3 g o2 g g g o3 g o2 g | o3 c c o4 c o3 c c c o4 c o3 c | o2 a a o3 a o2 a o3 d d o4 d o3 d | o3 d d o4 d o3 d d d o4 d o3 d |
        ; B
        o3 c c o4 c o3 c c c o4 c o3 c | o3 d d o4 d o3 d d d o4 d o3 d | o2 b b o3 b o2 b b b o3 b o2 b | o2 e e o3 e o2 e e e o3 e o2 e |
        o3 c c o4 c o3 c c c o4 c o3 c | o3 d d o4 d o3 d d d o4 d o3 d | o2 g g o3 g o2 g g g o3 g o2 g | o2 g g o3 g o2 g g g o3 g o2 g |
        ; C
        o2 e e o3 e o2 e e e o3 e o2 e | o3 c c o4 c o3 c c c o4 c o3 c | o2 g g o3 g o2 g g g o3 g o2 g | o3 d d o4 d o3 d d d o4 d o3 d |
        o2 e e o3 e o2 e e e o3 e o2 e | o3 c c o4 c o3 c c c o4 c o3 c | o2 g g o3 g o2 g g g o3 g o2 g | o3 d d o4 d o3 d d d o4 d o3 d |
        ; A'
        o2 g g o3 g o2 g g g o3 g o2 g | o3 c c o4 c o3 c c c o4 c o3 c | o2 e e o3 e o2 e e e o3 e o2 e | o3 d d o4 d o3 d d d o4 d o3 d |
        o2 g g o3 g o2 g g g o3 g o2 g | o3 c c o4 c o3 c c c o4 c o3 c | o2 a a o3 a o2 a o3 d d o4 d o3 d | o3 d d o4 d o3 d d d o4 d o3 d |
        ; B'
        o3 c c o4 c o3 c c c o4 c o3 c | o3 d d o4 d o3 d d d o4 d o3 d | o2 b b o3 b o2 b b b o3 b o2 b | o2 e e o3 e o2 e e e o3 e o2 e |
        o3 c c o4 c o3 c c c o4 c o3 c | o3 d d o4 d o3 d d d o4 d o3 d | o2 g g o3 g o2 g o2 e e o3 e o2 e | o2 a a o3 a o2 a o3 d d o2 a f+ |
      `,
    },
    {
      // Four on the floor — the kick never stops
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums
        [v11 c8 v5 e8]4 | v11 c8 v5 e8 v11 c8 v5 e8 v11 c16 v8 d16 v9 d16 v10 d16 v11 c16 v11 d16 v12 d16 v12 d16 | L
        [v12 'c f'16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 v12 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 |
         [v12 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16]12 |
         v12 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 v12 c16 v8 d16 v9 d16 v10 d16 v12 'c g'16 v10 d16 v11 d16 v12 d16 |]5
      `,
    },
    {
      // Sakura sparkles
      inst: 'glock',
      vol: 0.4,
      pan: 0.4,
      mml: `
        @glock v8 q4 k2
        r1 | r1 | L
        ; A
        [o5 g32 b32 > d32 g32 r8 r4 r2 | r1 | r1 | r1 |]2
        ; B
        [o5 e32 g32 > c32 e32 r8 r4 r2 | r1 | r1 | r1 |]2
        ; C
        [o5 e32 g32 b32 > e32 r8 r4 r2 | r1 | r1 | r1 |]2
        ; A'
        [o5 g32 b32 > d32 g32 r8 r4 r2 | r1 | r1 | r1 |]2
        ; B'
        [o5 e32 g32 > c32 e32 r8 r4 r2 | r1 | r1 | r1 |]2
      `,
    },
  ],
};

export default song;
