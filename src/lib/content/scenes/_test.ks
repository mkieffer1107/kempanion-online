# Engine sample for tests and the dev "trigger scene" panel. Not story content:
# files starting with "_" only load in dev builds. No trigger: these run only when called by id.

=== test_basics
title: Engine Test
pig: piggy-1
summary: Exercises the KScript engine end to end.
replayable: false
---
[bg dorm fade]
[bgm dorm]
[show piggy-1 happy center]
piggy-1 happy: Hey, {player}! Engine check. It's {time} on a {weekday}.
narrator: The KempaPager chirps twice.
player: Ready when you are.
? Bump!
  [bond piggy-1 +3]
  piggy-1 excited: Set!
? Spike?
  [set test_spiked]
  piggy-1 laughing: KILL! Point Gators!
[if flag(test_spiked) && bond(piggy-1) >= 0]
  [sfx spike] [shake 0.4 200]
  piggy-1 proud: Clean API call.
[else]
  piggy-1: Nice pass, teammate.
[endif]
[set test_count += 1]
[input test_snack "Favorite study snack?" "oranges"]
piggy-1 thinking: {fact:test_snack|oranges}? Noted. Fuel matters.
[goto wrap]
piggy-1 sad: (this line is jumped over)
*wrap
[outfit piggy-1 volleyball]
[petals heavy] [time evening]
[money +5] [give oranges 1]
piggy-1 happy: Test run number {flag:test_count|0}. Same time tomorrow?
[hide piggy-1]
[end]

=== test_call
title: Engine Test (call)
replayable: false
---
narrator: Playing the basics scene inline.
[call test_basics]
? Run it again? [if flag(test_count) >= 1]
  narrator: Maybe later.
? Done.
[end]
