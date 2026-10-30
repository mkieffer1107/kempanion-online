import type { Song } from '../mml';

// Malachowsky Hall — the data-science "starship". E minor (i–VI–III–VII), 124 BPM, techno-lite. 36 bars.
// Form: intro 4 (saw sequencer alone, then kick, a noise riser; not looped) | A 8 (PIGGY 1 motif head as fragments over
// the arp, four-on-the-floor, offbeat bass) | B 8 (the motif's bounce sequenced over C–D–Em, pulse12 "data" bleeps) |
// breakdown 8 (no kick: pad swell, then the full motif; kick/snare build and a riser) | A' 8 (whole motif, higher answer,
// F♯ leading back to the top).
const song: Song = {
  id: 'malachowsky',
  title: 'The Starship',
  bpm: 124,
  loop: true,
  echo: 0.28,
  tracks: [
    {
      inst: 'lead',
      vol: 0.7,
      mml: `
        @lead v13 y4 l8
        r1 | r1 | r1 | r1 | L
        ; A — motif fragments
        o5 g g b > d4. < b r | r1 | g g b > d4. < b r | a4 f+4 d2 |
        g g b > d4. < b r | > c d < b g a4 g4 | r2 b a g f+ | e4 f+4 d2 |
        ; B
        o5 e e g b4. a r | f+ f+ a > d4. < a r | g g b > e4. d r | e2. r4 |
        < c c e a4. g r | e e g > c4. < b r | a4 f+4 d4 f+4 | a2. r4 |
        ; breakdown
        r1 | r1 | r1 | r1 | o5 g g b > d4. < b r | > c d < b g a4 g4 | r1 | r1 |
        ; A'
        o5 g g b > d4. < b r | > c d < b g a4 g4 | b b > d g4. f+ r | e d < a f+ a4 d4 |
        g g b > d4. < b r | > c d e g4 f+ e d | < b4 a4 g4 a4 | f+2 d4 r4 |
      `,
    },
    {
      // Saw sequencer
      inst: 'saw',
      vol: 0.58,
      pan: -0.3,
      mml: `
        @saw v6 q5 l16
        [o4 e b > e g]4 | v7 [o4 c g > c e]4 | v8 [o3 g > d g b]4 | [o3 a > d f+ a]4 | L
        ; A
        [[o4 e b > e g]4 | [o4 c g > c e]4 | [o3 g > d g b]4 | [o3 a > d f+ a]4 |]2
        ; B
        [o4 c g > c e]4 | [o3 a > d f+ a]4 | [o4 e b > e g]4 | [o4 e b > e g]4 |
        [o3 a > e a > c]4 | [o4 c g > c e]4 | [o3 a > d f+ a]4 | [o3 a > d f+ a]4 |
        ; breakdown
        v7 [[o4 e b > e g]4 | [o4 c g > c e]4 | [o3 g > d g b]4 | [o3 a > d f+ a]4 |]2
        ; A'
        v8 [[o4 e b > e g]4 | [o4 c g > c e]4 | [o3 g > d g b]4 | [o3 a > d f+ a]4 |]2
      `,
    },
    {
      inst: 'pad',
      vol: 0.5,
      pan: 0.25,
      mml: `
        @pad v6 q8 o4
        r1 | r1 | 'd g b'1 | v7 'd f+ a'1 | L
        ; A
        v8 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 | 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 |
        ; B
        'e g > c'1 | 'd f+ a'1 | 'e g b'1 | 'e g b'1 | 'e a > c'1 | 'e g > c'1 | 'd f+ a'1 | 'd f+ a'1 |
        ; breakdown — swell
        v9 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 | v10 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 |
        ; A'
        v8 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 | 'e g b'1 | 'e g > c'1 | 'd g b'1 | 'd f+ a'1 |
      `,
    },
    {
      // Offbeat techno bass
      inst: 'bass',
      vol: 0.78,
      mml: `
        @bass v12 q5 l8
        r1 | r1 | o2 r g r g r g r g | r d r d r d r d | L
        ; A
        [o2 r e r e r e r e | o2 r c r c r c r c | o2 r g r g r g r g | o2 r d r d r d o3 d o2 d |]2
        ; B
        o2 r c r c r c r c | r d r d r d r d | r e r e r e r e | r e r e r e o3 e o2 e |
        o2 r a r a r a r a | o2 r c r c r c r c | r d r d r d r d | r d r d o3 d o2 d o3 d o2 d |
        ; breakdown
        r1 | r1 | r1 | r1 | o2 e1 | c1 | g g g g g g g g | d d d d d d d d |
        ; A'
        [o2 r e r e r e r e | o2 r c r c r c r c | o2 r g r g r g r g | o2 r d r d r d o3 d o2 d |]2
      `,
    },
    {
      // Four on the floor, offbeat open hats, claps on 2 and 4
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums
        r1 | [v4 e16 v3 e16 v5 f8]4 | [v10 c16 v4 e16 v6 f8]4 | [v10 c16 v4 e16 v6 f8]3 l32 v8 d d v9 d d v10 d d v11 d d | L
        ; A
        v12 'c f'16 v5 e16 v8 f8 v11 'c g'16 v5 e16 v8 f8 v11 c16 v5 e16 v8 f8 v11 'c g'16 v5 e16 v8 f8 |
        [v11 c16 v5 e16 v8 f8 v11 'c g'16 v5 e16 v8 f8]12 |
        v11 c16 v5 e16 v8 f8 v11 'c g'16 v5 e16 v8 f8 v11 c16 v5 e16 v8 f8 l32 v8 d d v9 d d v10 d d v11 d d |
        ; B — 16th hats
        v12 'c f'16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 v11 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 |
        [v11 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16]12 |
        v11 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 l16 v9 b b a a v11 d d d d |
        ; breakdown — no kick, then the build
        v10 'f g'16 v3 e16 v6 f8 v9 g16 v3 e16 v6 f8 v5 e16 v3 e16 v6 f8 v9 g16 v3 e16 v6 f8 |
        [v5 e16 v3 e16 v6 f8 v9 g16 v3 e16 v6 f8]10 |
        [v10 c8 v7 d8]4 | l16 v7 d d v8 d d v9 d d v10 d d v10 d d v11 d d v12 d d d d |
        ; A'
        v12 'c f'16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 v11 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 |
        [v11 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16]12 |
        v11 c16 v5 e16 v8 f16 v5 e16 v11 'c g'16 v5 e16 v8 f16 v5 e16 l16 v9 b b a a v11 d d d d |
      `,
    },
    {
      // pulse12 data bleeps; chip-noise risers into the A sections
      inst: 'pulse12',
      vol: 0.5,
      pan: 0.35,
      mml: `
        @pulse12 v7 q2
        r1 | r1 | r1 | @noise q8 l16 o3 v2 c c+ d d+ v3 e f f+ g v4 g+ a a+ b v5 > c c+ d d+ | L
        ; A
        @pulse12 v7 q2 r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; B — data
        [r8 o6 e16 r16 r4 r8 b16 r16 r4 | r4 r8 o6 g16 r16 r8 o6 d16 r16 r4 |]4
        ; breakdown
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | @noise q8 l16 o3 v2 c c+ d d+ v3 e f f+ g v4 g+ a a+ b v5 > c c+ d d+ |
        ; A'
        @pulse12 v7 q2 [r8 o6 e16 r16 r4 r8 b16 r16 r4 | r4 r8 o6 g16 r16 r8 o6 d16 r16 r4 |]4
      `,
    },
  ],
};

export default song;
