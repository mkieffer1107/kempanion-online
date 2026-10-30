import type { Song } from '../mml';

// Communicore — "Communicore Corridors". Written in D dorian, sounds in G dorian (k5; drums and the monitor beep
// untransposed), 100 BPM funk-lite bustle. 34 bars. Form: intro 2 (monitor beeps + hats; not looped) |
// A 8 (PIGGY 2 motif on a clipped pulse50 over a i–IV9sus vamp, marimba footsteps, clav-ish pluck stabs, 16th bass)
// | B 8 (rounds: the marimba leads over walking bass; the pulse50 answers with a two-note "Pa-triot.") | A' 8 (claps) |
// breakdown 8 (stop-time hits under a deadpan motif, beeps on every beat, then a build back into A).
const song: Song = {
  id: 'lab',
  title: 'Communicore Corridors',
  bpm: 100,
  loop: true,
  echo: 0.18,
  tracks: [
    {
      inst: 'pulse50',
      vol: 0.84,
      mml: `
        @pulse50 v13 q5 k5 l8
        r1 | r2. o3 a4 | L
        ; A
        o4 d4 a4 g f e f | d2 c4 d4 | r f16 g16 a a g f e f | d4 r < b > d < b g4 |
        o4 d4 a4 g f e f | d2 c4 d4 | a a g a > c < b g e | a4 r e a > c < a g |
        ; B — "Pa-triot."
        r1 | r1 | r1 | r2. o3 d g | r1 | r1 | r1 | r2. o3 d g |
        ; A'
        o4 d4 a4 g f e f | d2 c4 d4 | r f16 g16 a a g f e f | d4 r < b > d < b g4 |
        o4 d4 a4 g f e f | d2 c4 d4 | a a g a > c < b g e | a4 r e a > c < a g |
        ; breakdown — stop-time, deadpan
        o4 d4 a4 g f e f | d2 c4 d4 | f4 > c4 < b a g a | f2 e4 c4 |
        r1 | r1 | d4 r4 d4 r4 | e4 r4 e e e e |
      `,
    },
    {
      // Marimba: corridor footsteps, the B tune, a run into the top
      inst: 'marimba',
      vol: 0.56,
      pan: 0.3,
      mml: `
        @marimba v10 q3 k5 l8
        r1 | r1 | L
        ; A
        o4 r a r f r a r > c < | r a r f r a r > c < | r a r f r a r > c < | r b r g r b r > d < |
        r a r f r a r > c < | r a r f r a r > c < | r a r e r g r b | r a r e r a r > c < |
        ; B — the tune
        q5 o5 c < a16 > c16 e c f e c < a | o4 b g16 b16 o5 d o4 b o5 e d o4 b g |
        o4 a f16 a16 o5 c o4 a o5 d c o4 a f | o4 g b16 o5 d16 f d o4 b g r4 |
        o5 c < a16 > c16 e c f e c < a | o4 b g16 b16 o5 d o4 b o5 e d o4 b g |
        o4 a e16 a16 o5 c o4 a o5 e d c o4 a | o5 e e r4 r2 |
        ; A'
        q3 o5 r a r f r a r > c < | r a r f r a r > c < | r a r f r a r > c < | r b r g r b r > d < |
        r a r f r a r > c < | r a r f r a r > c < | r a r e r g r b | r a r e r a r > c < |
        ; breakdown
        r1 | r1 | r1 | r1 |
        q5 o5 c < a16 > c16 e c f e c < a | o4 b g16 b16 o5 d o4 b o5 e d o4 b g | r1 |
        l16 o3 e f g a b > c d e f g a b > c d e f |
      `,
    },
    {
      // Pluck clav stabs
      inst: 'pluck',
      vol: 0.38,
      pan: -0.3,
      mml: `
        @pluck v8 q3 k5 o4
        r1 | r1 | L
        ; A
        [r8 'f a > c'8 r8 'f a > c'16 'f a > c'16 r8 'f a > c'8 r8 'f a > c'8 |]3
        r8 'f b > d'8 r8 'f b > d'16 'f b > d'16 r8 'f b > d'8 r8 'f b > d'8 |
        [r8 'f a > c'8 r8 'f a > c'16 'f a > c'16 r8 'f a > c'8 r8 'f a > c'8 |]2
        r8 'e a > c'8 r8 'e a > c'16 'e a > c'16 r8 'd g b'8 r8 'd g b'8 |
        r8 'e g > c'8 r8 'e g > c'16 'e g > c'16 r8 'e g > c'8 r8 'e g > c'8 |
        ; B — on the offbeats
        [r8 'e a > c'8]4 | [r8 'd g b'8]4 | [r8 'f a > c'8]4 | [r8 'f b > d'8]4 |
        [r8 'e a > c'8]4 | [r8 'd g b'8]4 | [r8 'e g > c'8]4 | [r8 'e g > c'8]4 |
        ; A'
        [r8 'f a > c'8 r8 'f a > c'16 'f a > c'16 r8 'f a > c'8 r8 'f a > c'8 |]3
        r8 'f b > d'8 r8 'f b > d'16 'f b > d'16 r8 'f b > d'8 r8 'f b > d'8 |
        [r8 'f a > c'8 r8 'f a > c'16 'f a > c'16 r8 'f a > c'8 r8 'f a > c'8 |]2
        r8 'e a > c'8 r8 'e a > c'16 'e a > c'16 r8 'd g b'8 r8 'd g b'8 |
        r8 'e g > c'8 r8 'e g > c'16 'e g > c'16 r8 'e g > c'8 r8 'e g > c'8 |
        ; breakdown — hits on the one
        'f a > c'8 r8 r4 r2 | 'f a > c'8 r8 r4 r2 | 'f a > c'8 r8 r4 r2 | 'c f g'8 r8 r4 r2 |
        'e a > c'8 r8 r4 r2 | 'd g b'8 r8 r4 r2 | [r8 'f a > c'8]4 | [r8 'd g b'8]4 |
      `,
    },
    {
      // Funk bass
      inst: 'bass',
      vol: 0.78,
      mml: `
        @bass v12 q5 k5 o2
        r1 | r2. o2 a4 | L
        ; A
        [o2 d8 r16 d16 r16 d16 > d16 < r16 f8 g8 a8 > c8 < | o2 g8 r16 g16 r16 g16 > g16 < r16 f8 e8 d8 c8 |]2
        o2 d8 r16 d16 r16 d16 > d16 < r16 f8 g8 a8 > c8 < | o2 g8 r16 g16 r16 g16 > g16 < r16 f8 e8 d8 c8 |
        o2 f8 r16 f16 r8 f8 e8 r16 e16 r8 e8 | o2 a8 r16 a16 r16 a16 > a16 < r16 g8 f8 e8 c8 |
        ; B — walking rounds
        o2 f4 a4 > c4 < a4 | e4 g4 b4 g4 | d4 f4 a4 f4 | g4 b4 > d4 < b4 |
        f4 a4 > c4 < a4 | e4 g4 b4 g4 | a4 > c4 e4 c4 < | a4 g4 f4 e4 |
        ; A'
        [o2 d8 r16 d16 r16 d16 > d16 < r16 f8 g8 a8 > c8 < | o2 g8 r16 g16 r16 g16 > g16 < r16 f8 e8 d8 c8 |]2
        o2 d8 r16 d16 r16 d16 > d16 < r16 f8 g8 a8 > c8 < | o2 g8 r16 g16 r16 g16 > g16 < r16 f8 e8 d8 c8 |
        o2 f8 r16 f16 r8 f8 e8 r16 e16 r8 e8 | o2 a8 r16 a16 r16 a16 > a16 < r16 g8 f8 e8 c8 |
        ; breakdown
        o2 d8 r8 r4 r2 | g8 r8 r4 r2 | d8 r8 r4 r2 | > c8 < r8 r4 r2 | f8 r8 r4 r2 | e8 r8 r4 r2 |
        d8 r8 d8 r8 d8 r8 d8 r8 | l16 v10 e e e e v11 e e e e v12 e e e e v13 e e e e |
      `,
    },
    {
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l16
        [v4 e v3 e v5 e v3 e]4 | v10 c v3 e v5 e v3 e [v4 e v3 e v5 e v3 e]2 v6 d v7 d v8 d v9 d | L
        ; A
        [v11 c v4 e v6 e v4 e v10 d v4 e v6 e v9 c v6 e v4 d v10 c v4 e v10 d v4 e v6 e v4 d]7 |
        v11 c v4 e v6 e v4 e v10 d v4 e v6 e v9 c v6 e v4 d v10 c v4 e v8 b v9 b v10 a v11 a |
        ; B
        [v11 c v4 e v6 e v4 e v10 d v4 e v6 e v9 c v6 e v4 d v10 c v4 e v10 d v4 e v7 f v4 d]7 |
        v11 c v4 e v6 e v4 e v10 d v4 e v6 e v9 c v6 e v4 d v10 c v4 e v8 b v9 b v10 a v11 a |
        ; A' — claps
        [v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v9 c v6 e v4 d v10 c v4 e v10 'd g' v4 e v6 e v4 d]7 |
        v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v9 c v6 e v4 d v10 c v4 e v8 b v9 b v10 a v11 a |
        ; breakdown — stop-time, then the build
        [v11 'c f' v3 e v3 e v3 e v3 e v2 e v3 e v2 e v3 e v2 e v3 e v2 e v3 e v2 e v3 e v2 e]6 |
        [v10 c8 v4 e8 v10 d8 v4 e8]2 | v6 d d v7 d d v8 d d v9 d d v10 d d v11 d d v12 d d b a |
      `,
    },
    {
      // Monitor beeps (untransposed A5)
      inst: 'glock',
      vol: 0.45,
      pan: 0.2,
      mml: `
        @glock v9 q2 l16
        o5 a r r8 r4 r2 | o5 a r a r r4 r2 | L
        ; A
        [o5 a r r8 r4 r2 | r1 |]3 o5 a r r8 r4 r2 | r2. o5 a r a r |
        ; B
        r1 | r2. o5 a r a r | r1 | r1 | r1 | r2. o5 a r a r | r1 | r1 |
        ; A'
        [o5 a r r8 r4 r2 | r1 |]3 o5 a r r8 r4 r2 | r2. o5 a r a r |
        ; breakdown
        [r2 o5 a r r8 r4 |]6 [o5 a r r8]4 | v11 [o5 a r]8 |
      `,
    },
  ],
};

export default song;
