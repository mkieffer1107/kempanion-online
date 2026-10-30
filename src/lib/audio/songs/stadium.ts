import type { Song } from '../mml';

// Game day in the Swamp — an original march (no real fight songs quoted). B-flat major, 120 BPM. 40 bars.
// Form: intro 4 (drumline cadence under a rising crowd; not looped) | A 8 (brass march tune, marching-bell glock in
// octaves, tuba "oom" on 1 and 3, horn "pah" on 2 and 4, big bass drum + snare rudiments) | B 8 (trio in E-flat:
// lyrical brass over sustained horns, piccolo obbligato) | drum break 4 (the drumline shows off; the crowd rises) |
// C 8 (chant: brass calls in thirds, the crowd answers "HEY!" on beat 4) | A' 8 (tune + flute descant; a cheer
// swells back into A).
const song: Song = {
  id: 'stadium',
  title: 'Swamp Stomp',
  bpm: 120,
  loop: true,
  echo: 0.2,
  tracks: [
    {
      // Brass lead
      inst: 'brass',
      vol: 0.82,
      mml: `
        @brass v13 l8
        r1 | r1 | r1 | r1 | L
        ; A
        o4 b-4. f b-8. > c16 d4 | c8. d16 e-8. d16 c4 < f4 | g4. e- g8. a16 b-4 | a8. b-16 > c8. < a16 f2 |
        b-4. f b-8. > c16 d4 | d8. e-16 f8. e-16 d4 < b-4 | > e-4 g4 f4 e-4 | d2 < b-4 r4 |
        ; B — trio in E-flat
        v11 o4 g2 b-4. g | f2 a-4. f | e-4 g4 b-4 > e-4 < | > c2. < r4 |
        b-2 > c4. < b- | a-2 f4. d | e-4 g4 b-4 > e-4 < | > f2. < r4 |
        ; drum break
        r1 | r1 | r1 | r1 |
        ; C — the chant
        v13 o4 f f b- > d f4 r4 | o4 g g b- > e- g4 r4 | o4 a a > c f a4 r4 | o5 b-4 f4 d4 r4 |
        o4 f f b- > d f4 r4 | o4 g g b- > e- g4 r4 | o5 a4 > c4 < a4 f4 | b-2. r4 |
        ; A'
        o4 b-4. f b-8. > c16 d4 | c8. d16 e-8. d16 c4 < f4 | g4. e- g8. a16 b-4 | a8. b-16 > c8. < a16 f2 |
        b-4. f b-8. > c16 d4 | d8. e-16 f8. e-16 d4 < b-4 | > e-4 g4 f4 e-4 | d2 < b-4 r4 |
      `,
    },
    {
      // Marching bells: the tune an octave up
      inst: 'glock',
      vol: 0.5,
      pan: 0.3,
      mml: `
        @glock v8 q5 l8
        r1 | r1 | r1 | r1 | L
        ; A
        o5 b-4. f b-8. > c16 d4 | c8. d16 e-8. d16 c4 < f4 | g4. e- g8. a16 b-4 | a8. b-16 > c8. < a16 f2 |
        b-4. f b-8. > c16 d4 | d8. e-16 f8. e-16 d4 < b-4 | > e-4 g4 f4 e-4 | d2 < b-4 r4 |
        ; B, break, C
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; A'
        o5 b-4. f b-8. > c16 d4 | c8. d16 e-8. d16 c4 < f4 | g4. e- g8. a16 b-4 | a8. b-16 > c8. < a16 f2 |
        b-4. f b-8. > c16 d4 | d8. e-16 f8. e-16 d4 < b-4 | > e-4 g4 f4 e-4 | d2 < b-4 r4 |
      `,
    },
    {
      // Horns: "pah" on 2 and 4, sustained in the trio, thirds under the chant
      inst: 'brass',
      vol: 0.48,
      pan: -0.3,
      mml: `
        @brass v8 q4 o4
        r1 | r1 | r1 | r1 | L
        ; A
        r4 'd f b-'4 r4 'd f b-'4 | r4 'c e- a'4 r4 'c e- a'4 | r4 'e- g b-'4 r4 'e- g b-'4 | r4 'c f a'4 r4 'c f a'4 |
        r4 'd f b-'4 r4 'd f b-'4 | r4 'd g b-'4 r4 'd g b-'4 | r4 'e- g b-'4 r4 'c e- a'4 | r4 'd f b-'4 r4 'd f b-'4 |
        ; B
        q8 v7 'e- g b-'1 | 'd f a-'1 | 'e- g b-'1 | 'e- a- > c'1 | 'e- g b-'1 | 'd f a-'1 | 'e- g b-'2 'e- g > c'2 | 'e- a > c'1 |
        ; break
        r1 | r1 | r1 | v9 q4 'd f b-'4 'd f b-'4 r2 |
        ; C
        q5 l8 o4 d d f b- > d4 < r4 | o4 e- e- g b- > e-4 < r4 | o4 f f a > c f4 < r4 | o4 'd f b-'4 'd f b-'4 'd f b-'4 r4 |
        o4 d d f b- > d4 < r4 | o4 e- e- g b- > e-4 < r4 | o4 'c e- a'4 'c e- a'4 'c e- a'4 'c e- a'4 | 'd f b-'2. r4 |
        ; A'
        q4 v8 o4
        r4 'd f b-'4 r4 'd f b-'4 | r4 'c e- a'4 r4 'c e- a'4 | r4 'e- g b-'4 r4 'e- g b-'4 | r4 'c f a'4 r4 'c f a'4 |
        r4 'd f b-'4 r4 'd f b-'4 | r4 'd g b-'4 r4 'd g b-'4 | r4 'e- g b-'4 r4 'c e- a'4 | r4 'd f b-'4 r4 'd f b-'4 |
      `,
    },
    {
      // Tuba "oom"
      inst: 'bass',
      vol: 0.72,
      mml: `
        @bass v12 q5 o2
        r1 | r1 | r1 | r1 | L
        ; A
        b-4 r4 f4 r4 | f4 r4 > c4 < r4 | e-4 r4 b-4 r4 | f4 r4 > c4 < r4 |
        b-4 r4 f4 r4 | g4 r4 d4 r4 | > c4 < r4 f4 r4 | b-4 r4 f4 r4 |
        ; B
        e-4 r4 b-4 r4 | b-4 r4 f4 r4 | e-4 r4 b-4 r4 | a-4 r4 e-4 r4 |
        e-4 r4 b-4 r4 | b-4 r4 f4 r4 | e-4 r4 > c4 < r4 | f4 r4 > c4 < r4 |
        ; break
        r1 | r1 | r1 | b-4 b-4 r2 |
        ; C
        b-4 f4 b-4 f4 | e-4 b-4 e-4 b-4 | f4 > c4 < f4 > c4 < | b-4 f4 b-4 f4 |
        b-4 f4 b-4 f4 | e-4 b-4 e-4 b-4 | f4 > c4 < f4 > c4 < | b-4 f4 b-4 r4 |
        ; A'
        b-4 r4 f4 r4 | f4 r4 > c4 < r4 | e-4 r4 b-4 r4 | f4 r4 > c4 < r4 |
        b-4 r4 f4 r4 | g4 r4 d4 r4 | > c4 < r4 f4 r4 | b-4 r4 f4 r4 |
      `,
    },
    {
      // Drumline: big bass drum (kick + low tom), snare rudiments, cymbal (open hat)
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums
        v11 'c a'8 v6 d16 d16 v10 d8 v6 d16 d16 v11 'c a'8 v6 d16 d16 v10 d8 v6 d16 d16 |
        v11 'c a'8 v6 d16 d16 v10 d8 v6 d16 d16 v11 'c a'8 v10 d16 d16 l32 v7 d d v8 d d v9 d d v10 d d |
        l24 [v8 d v6 d d v10 d v6 d d]4 |
        v12 'c f'4 v12 'c f'4 v12 'c a'8 v10 'c a'8 l32 v8 d d v9 d d v10 d d v11 d d | L
        ; A
        [v11 'c a f'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |
         v11 'c a'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |]3
        v11 'c a f'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |
        v11 'c a'8 v6 d16 d16 v10 d8 v6 d8 l32 v7 d d v8 d d v9 d d v10 d d v11 d d v12 d d l16 v12 'c a' v10 'c a' |
        ; B — trio, lighter
        [v9 'c a'4 v7 d8 v5 d8 v9 'c a'4 v7 d8 v5 d16 d16 |]7
        v9 'c a'4 v7 d8 v5 d8 l32 v6 d d v7 d d v8 d d v9 d d v10 d d v11 d d v12 d d d d |
        ; drum break
        [v12 d16 v6 d16 v8 d16 v6 d16]2 v12 'c a'8 v12 'c a'8 v8 d16 d16 d16 d16 |
        l24 [v8 d d d]4 l8 v12 'c a' v6 d v12 'c a' v6 d |
        [v12 d16 v6 d16 v8 d16 v6 d16]2 v12 'c a'8 v12 'c a'8 v8 d16 d16 d16 d16 |
        v12 'c a f'4 r8 v12 'c a'8 l32 v6 d d v7 d d v8 d d v9 d d v10 d d v11 d d v12 d d d d |
        ; C — claps, "HEY!" on 4
        [v11 'c a f'8 v6 d8 v9 'd g'8 v6 d8 v11 'c a'8 v6 d8 v12 'c g f'4 |]6
        v11 'c a'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |
        v11 'c a f'8 v6 d8 v9 'd g'8 v6 d8 v11 'c a'8 v6 d8 v12 'c g f'4 |
        ; A'
        [v11 'c a f'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |
         v11 'c a'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |]3
        v11 'c a f'8 v6 d16 d16 v10 d8 v6 d8 v11 'c a'8 v6 d16 d16 v10 d8 v5 d32 v6 d32 v7 d32 v8 d32 |
        v11 'c a'8 v6 d16 d16 v10 d8 v6 d8 l32 v7 d d v8 d d v9 d d v10 d d v11 d d v12 d d l16 v12 'c a' v10 'c a' |
      `,
    },
    {
      // Piccolo obbligato in the trio, descant in A'
      inst: 'flute',
      vol: 0.42,
      pan: 0.2,
      mml: `
        @flute v10 l8
        r1 | r1 | r1 | r1 | L
        ; A
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; B
        o5 e- g b- g e- g b- > e- < | o5 d f a- f d f a- > d < | o5 e- g b- g e- g b- > e- < | o5 c e- a- e- c e- a- > c < |
        o5 e- g b- g e- g b- > e- < | o5 d f a- f d f a- > d < | o5 e- g b- g c e- g b- | o5 c f a > c < a f e- c |
        ; break, C
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; A' — descant
        v9 o6 d1 | c1 | < b-1 | a1 | b-2 > d2 | d1 | e-2 c2 | d2. r4 |
      `,
    },
    {
      // The crowd: chip-noise roars and "HEY!"s
      inst: 'noise',
      vol: 0.5,
      mml: `
        @noise q8
        o2 v3 'c g'1 | v4 'c g'1 | v5 'c g'1 | v6 'c g'2 v8 o3 'c g'2 | L
        ; A — a cheer on the downbeat
        o4 v9 'c e g'4 v7 'c e g'4 v5 o3 'c g'2 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; B
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; break — rising
        r1 | r1 | r1 | r2 o3 v5 'c g'8 v6 'c g'8 v7 'c g'8 v9 'c g'8 |
        ; C — "HEY!"
        [o2 v3 'c g'2. o4 v10 'c g'4 |]6 o2 v3 'c g'1 | o2 v3 'c g'2. o4 v10 'c g'4 |
        ; A' — cheer, then a big one back into A
        o4 v9 'c e g'4 v7 'c e g'4 v5 o3 'c g'2 | r1 | r1 | r1 | r1 | r1 | r1 | o3 v6 'c g'4 v7 'c g'4 o4 v8 'c e g'4 v10 'c e g'4 |
      `,
    },
  ],
};

export default song;
