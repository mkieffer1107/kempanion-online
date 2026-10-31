// [brain] (KScript): the hub's Big Brain chip shown over a scene while the companion talks about it
// (tutorial_big_brain). BrainInset.svelte draws it; the runner turns it off when the scene ends.
export const brainInset = $state<{ on: boolean }>({ on: false });
