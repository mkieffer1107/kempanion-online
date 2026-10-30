import type { Song } from '../mml';

// Midtown on University Ave at night — "University Ave Neon". E dorian funk-lite, 110 BPM. 34 bars.
// Form: intro 2 (slap bass + hats, a synth pickup; not looped) | A 8 (synth-lead riff over an Em9 ⇄ A13 vamp,
// syncopated e-piano, slap-ish bass with octave pops; Cmaj7 → B7 turnaround) | B 8 (smoother: Gmaj7–F♯m7–Em7–A7,
// night pad) | A' 8 (the riff climbs higher) | breakdown 8 (bass and drums alone, then the keys and pad
// flicker back on; a pickup into A).
const song: Song = {
  id: 'midtown',
  title: 'University Ave Neon',
  bpm: 110,
  loop: true,
  echo: 0.24,
  tracks: [
    {
      inst: 'lead',
      vol: 0.64,
      mml: `
        @lead v13 y3 l8
        r1 | r2 o5 d+ f+ a b | L
        ; A
        o5 e g a b r > d < b r | a g e d e4 r4 | c+ e f+ g r a g r | f+ e c+ < b > c+4 r4 |
        e g a b r > d e r | d < b a g a4 r4 | e g b > d < b4 g4 | a f+ d+ f+ b4 r4 |
        ; B
        o5 b4. a f+4 d4 | a4. f+ e4 c+4 | g4. f+ e4 d4 | c+2 e4 a4 |
        b4. a f+4 d4 | a4. f+ e4 c+4 | e4 g4 b4 > d4 < | d+4 f+4 a4 b4 |
        ; A' — higher
        o5 e g a b r > d < b r | a g e d e4 r4 | c+ e f+ g r a g r | f+ e c+ < b > c+4 r4 |
        e g a b r > d e g | f+ e d < b > d4 r4 | e d < b g b4 g4 | a f+ d+ f+ b4 r4 |
        ; breakdown
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r2 o5 d+ f+ a b |
      `,
    },
    {
      // E-piano: syncopated 16th comping
      inst: 'epiano',
      vol: 0.5,
      pan: -0.25,
      mml: `
        @epiano v9 q3 o4
        r1 | r1 | L
        ; A
        [r16 'g b > d f+'16 r8 r16 'g b > d f+'16 r8 'g b > d f+'8 r8 r16 'g b > d f+'16 r8 |]2
        [r16 'g > c+ f+'16 r8 r16 'g > c+ f+'16 r8 'g > c+ f+'8 r8 r16 'g > c+ f+'16 r8 |]2
        [r16 'g b > d f+'16 r8 r16 'g b > d f+'16 r8 'g b > d f+'8 r8 r16 'g b > d f+'16 r8 |]2
        r16 'e g b'16 r8 r16 'e g b'16 r8 'e g b'8 r8 r16 'e g b'16 r8 |
        r16 'a > d+ f+'16 r8 r16 'a > d+ f+'16 r8 'a > d+ f+'8 r8 r16 'a > d+ f+'16 r8 |
        ; B
        r16 'f+ a b > d'16 r8 r16 'f+ a b > d'16 r8 'f+ a b > d'8 r8 r16 'f+ a b > d'16 r8 |
        r16 'e a > c+'16 r8 r16 'e a > c+'16 r8 'e a > c+'8 r8 r16 'e a > c+'16 r8 |
        r16 'g b > d f+'16 r8 r16 'g b > d f+'16 r8 'g b > d f+'8 r8 r16 'g b > d f+'16 r8 |
        r16 'g > c+ f+'16 r8 r16 'g > c+ f+'16 r8 'g > c+ f+'8 r8 r16 'g > c+ f+'16 r8 |
        r16 'f+ a b > d'16 r8 r16 'f+ a b > d'16 r8 'f+ a b > d'8 r8 r16 'f+ a b > d'16 r8 |
        r16 'e a > c+'16 r8 r16 'e a > c+'16 r8 'e a > c+'8 r8 r16 'e a > c+'16 r8 |
        r16 'e g b'16 r8 r16 'e g b'16 r8 'e g b'8 r8 r16 'e g b'16 r8 |
        r16 'a > d+ f+'16 r8 r16 'a > d+ f+'16 r8 'a > d+ f+'8 r8 r16 'a > d+ f+'16 r8 |
        ; A'
        [r16 'g b > d f+'16 r8 r16 'g b > d f+'16 r8 'g b > d f+'8 r8 r16 'g b > d f+'16 r8 |]2
        [r16 'g > c+ f+'16 r8 r16 'g > c+ f+'16 r8 'g > c+ f+'8 r8 r16 'g > c+ f+'16 r8 |]2
        [r16 'g b > d f+'16 r8 r16 'g b > d f+'16 r8 'g b > d f+'8 r8 r16 'g b > d f+'16 r8 |]2
        r16 'e g b'16 r8 r16 'e g b'16 r8 'e g b'8 r8 r16 'e g b'16 r8 |
        r16 'a > d+ f+'16 r8 r16 'a > d+ f+'16 r8 'a > d+ f+'8 r8 r16 'a > d+ f+'16 r8 |
        ; breakdown — keys flicker back in
        r1 | r1 | r1 | r1 |
        [r16 'g b > d f+'16 r8 r16 'g b > d f+'16 r8 'g b > d f+'8 r8 r16 'g b > d f+'16 r8 |]2
        r16 'e g b'16 r8 r16 'e g b'16 r8 'e g b'8 r8 r16 'e g b'16 r8 |
        r16 'a > d+ f+'16 r8 r16 'a > d+ f+'16 r8 'a > d+ f+'8 r8 r16 'a > d+ f+'16 r8 |
      `,
    },
    {
      // Slap-ish bass: staccato 16ths with octave pops
      inst: 'bass',
      vol: 0.8,
      mml: `
        @bass v12 q5
        o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 | o2 b8 r16 > b16 < b16 r16 b8 r16 > b16 < r16 a16 b8 > d+8 < | L
        ; A
        [o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 |]2
        [o2 a8 r16 > a16 < a16 r16 a8 r16 > a16 < r16 g16 a8 > c+8 < |]2
        [o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 |]2
        o3 c8 r16 > c16 < c16 r16 c8 r16 > c16 < r16 < b16 > c8 e8 | o2 b8 r16 > b16 < b16 r16 b8 r16 > b16 < r16 a16 b8 > d+8 < |
        ; B
        o2 g8 r16 > g16 < g16 r16 g8 r16 > g16 < r16 f+16 g8 a8 | o2 f+8 r16 > f+16 < f+16 r16 f+8 r16 > f+16 < r16 e16 f+8 a8 |
        o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 | o2 a8 r16 > a16 < a16 r16 a8 r16 > a16 < r16 g16 a8 > c+8 < |
        o2 g8 r16 > g16 < g16 r16 g8 r16 > g16 < r16 f+16 g8 a8 | o2 f+8 r16 > f+16 < f+16 r16 f+8 r16 > f+16 < r16 e16 f+8 a8 |
        o3 c8 r16 > c16 < c16 r16 c8 r16 > c16 < r16 < b16 > c8 e8 | o2 b8 r16 > b16 < b16 r16 b8 r16 > b16 < r16 a16 b8 > d+8 < |
        ; A'
        [o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 |]2
        [o2 a8 r16 > a16 < a16 r16 a8 r16 > a16 < r16 g16 a8 > c+8 < |]2
        [o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 |]2
        o3 c8 r16 > c16 < c16 r16 c8 r16 > c16 < r16 < b16 > c8 e8 | o2 b8 r16 > b16 < b16 r16 b8 r16 > b16 < r16 a16 b8 > d+8 < |
        ; breakdown
        [o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 |]2
        [o2 a8 r16 > a16 < a16 r16 a8 r16 > a16 < r16 g16 a8 > c+8 < |]2
        [o2 e8 r16 > e16 < e16 r16 e8 r16 > e16 < r16 d16 e8 g8 |]2
        o3 c8 r16 > c16 < c16 r16 c8 r16 > c16 < r16 < b16 > c8 e8 | o2 b8 r16 > b16 < b16 r16 b8 r16 > b16 < r16 a16 b8 > d+8 < |
      `,
    },
    {
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l16
        [v5 e v3 e v6 e v3 e]4 | [v5 e v3 e v6 e v3 e]3 v8 d v9 d v10 a v11 a | L
        ; A
        [v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v8 c v6 e v4 e v10 c v4 e v10 'd g' v4 e v7 f v4 e]7 |
        v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v8 c v6 e v4 e v10 c v4 e v8 b v9 b v10 a v11 a |
        ; B
        [v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v8 c v6 e v4 e v10 c v4 e v10 'd g' v4 e v7 f v4 e]7 |
        v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v8 c v6 e v4 e v10 c v4 e v8 b v9 b v10 a v11 a |
        ; A'
        [v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v8 c v6 e v4 e v10 c v4 e v10 'd g' v4 e v7 f v4 e]7 |
        v11 c v4 e v6 e v4 e v10 'd g' v4 e v6 e v8 c v6 e v4 e v10 c v4 e v8 b v9 b v10 a v11 a |
        ; breakdown — no claps, ghost notes
        [v11 c v4 e v6 e v4 d v10 d v4 e v6 e v8 c v6 e v4 d v10 c v4 e v10 d v4 e v7 f v4 d]7 |
        v11 c v4 e v6 e v4 d v10 d v4 e v6 e v8 c v8 d v9 d v10 d v10 d v8 b v9 b v10 a v11 a |
      `,
    },
    {
      // Night pad (B, the end of the breakdown, A')
      inst: 'pad',
      vol: 0.42,
      pan: 0.3,
      mml: `
        @pad v6 q8 o4
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; B
        'f+ a b > d'1 | 'e a > c+'1 | 'g b > d'1 | 'g > c+ e'1 | 'f+ a b > d'1 | 'e a > c+'1 | 'e g b'1 | 'a > d+ f+'1 |
        ; A'
        v5 'g b > d'1 | 'g b > d'1 | 'g > c+ e'1 | 'g > c+ e'1 | 'g b > d'1 | 'g b > d'1 | 'e g b'1 | 'a > d+ f+'1 |
        ; breakdown
        r1 | r1 | r1 | r1 | v6 'g b > d'1 | 'g b > d'1 | 'e g b'1 | 'a > d+ f+'1 |
      `,
    },
  ],
};

export default song;
