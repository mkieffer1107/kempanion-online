import type { Song } from '../mml';

// Piggy 2's theme. D dorian, 72 BPM — one lub-dub per beat, i.e. a resting heart rate. 30 bars.
// The drum track is a heartbeat throughout: lub (kick) on every beat, dub (a kick tuned up a step) a 16th later.
// A glock "monitor beep" rides the lub. Form: intro 2 (heart alone, then the monitor; not looped) |
// A 8 (PIGGY 2 motif on a clipped pulse50, i–IV dorian vamp) | B 8 (determined: the melody climbs in even quarters,
// e-piano arpeggios, beeps on 1 and 3) | A' 8 (motif + arpeggios + 16th hats) |
// breakdown 4 (heart and a beep on every beat while the strings climb Dm–Em–F–G; a C pickup back into A).
const song: Song = {
  id: 'piggy2_theme',
  title: 'Perfusion',
  bpm: 72,
  loop: true,
  echo: 0.25,
  tracks: [
    {
      // Lead — even, clipped, a surgeon's metronome
      inst: 'pulse50',
      vol: 0.8,
      mml: `
        @pulse50 v12 y2 q6 l4
        r1 | r2. o4 a | L
        ; A
        o5 d a g8 f8 e8 f8 | d2 c d | f > c < b8 a8 g8 a8 | f2 e c |
        d a g8 f8 e8 f8 | b2 a g | a > c < g e | d2 c d |
        ; B
        o5 c d e f | g2 e2 | d e f g | a2 f2 | e f g a | > c2 < g2 | a b > c d | q7 d2. r |
        ; A'
        q6 o5 d a g8 f8 e8 f8 | d2 c d | f > c < b8 a8 g8 a8 | f2 e c |
        d a g8 f8 e8 f8 | d2 c d | f a g e | q7 d1 |
        ; breakdown
        r1 | r1 | r1 | r2. q6 o4 a |
      `,
    },
    {
      inst: 'strings',
      vol: 0.55,
      pan: 0.15,
      mml: `
        @strings v8 q8 o4
        r1 | v6 'd f a'1 | L
        ; A
        v8 'd f a'1 | 'd g > c'1 | 'd f a'1 | 'c f g'2 'c e g'2 | 'd f a'1 | 'd g b'1 | 'c f a'2 'c e g'2 | 'd f a'1 |
        ; B
        v9 'c f a'1 | 'c e g'1 | 'd g b'1 | 'd f a'1 | 'c f a'1 | 'c e g'1 | 'd g b'2 'd g > c'2 | 'd g b'1 |
        ; A'
        v8 'd f a'1 | 'd g > c'1 | 'd f a'1 | 'c f g'2 'c e g'2 | 'd f a'1 | 'd g > c'1 | 'c f a'2 'c e g'2 | 'd f a'1 |
        ; breakdown — parallel triads climb
        v7 'd f a'1 | 'e g b'1 | v8 'f a > c'1 | v9 'g b > d'1 |
      `,
    },
    {
      // E-piano arpeggios (B and A' only)
      inst: 'epiano',
      vol: 0.5,
      pan: -0.35,
      mml: `
        @epiano v7 l8
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; B
        o3 f > c f a > c < a f c | o3 c g > c e g e c < g | o3 g > d g b > d < b g d | o3 d a > d f a f d < a |
        o3 f > c f a > c < a f c | o3 c g > c e g e c < g | o3 g > d g b > d c < g d | o3 g > d g b > d < b g d |
        ; A'
        o3 d a > d f a f d < a | o3 g > d g > c d c < g d | o3 d a > d f a f d < a | o3 c g > c f g e c < g |
        o3 d a > d f a f d < a | o3 g > d g > c d c < g d | o3 f > c f a o3 c g > c e | o3 d a > d f a f d < a |
        ; breakdown
        r1 | r1 | r1 | r1 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.76,
      mml: `
        @bass v12 l4
        r1 | o2 d1 | L
        ; A
        o2 d2 d a | g2 g d | d2 d a | c2 c g | d2 d a | g2 g d | f2 c2 | d2 d c |
        ; B — walking, determined
        o2 f f a g | c c e f | g g f e | d d a c | f f a g | c c e f | g g a g | g g f e |
        ; A'
        o2 d2 d a | g2 g d | d2 d a | c2 c g | d2 d a | g2 g d | f2 c2 | d1 |
        ; breakdown
        o2 d1 | e1 | f1 | g2. a |
      `,
    },
    {
      // Heartbeat (lub on the beat, dub a 16th later) + light kit
      inst: 'drums',
      vol: 0.52,
      mml: `
        @drums
        [o4 v12 c16 o5 v8 c16 r8]8 | L
        ; A — hat on the "and"
        [o4 v12 c16 o5 v8 c16 o4 v5 e8]32 |
        ; B — a soft rim of snare on the "and" of 2 and 4
        [o4 v12 c16 o5 v8 c16 o4 v5 e8 o4 v12 c16 o5 v8 c16 o4 v7 d8]16 |
        ; A' — 16th hats
        [o4 v12 c16 o5 v8 c16 o4 v5 e16 v3 e16]32 |
        ; breakdown — the heart alone, then hats creep back
        [o4 v12 c16 o5 v8 c16 r8]12 | [o4 v12 c16 o5 v8 c16 o4 v4 e16 v6 e16]4 |
      `,
    },
    {
      // Monitor beep
      inst: 'glock',
      vol: 0.55,
      pan: 0.3,
      mml: `
        @glock v9 q2 l16
        r1 | o5 a r r8 r4 r2 | L
        ; A — one beep a bar, on the lub
        [o5 a r r8 r4 r2]8 |
        ; B — beats 1 and 3
        v7 [o5 a r r8 r4 a r r8 r4]8 |
        ; A'
        v9 [o5 a r r8 r4 r2]8 |
        ; breakdown — every heartbeat
        v7 [o5 a r r8]8 | v8 [o5 a r r8]4 | v10 [o5 a r r8]4 |
      `,
    },
  ],
};

export default song;
