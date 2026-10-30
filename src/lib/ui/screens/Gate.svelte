<script lang="ts">
  // Tiny instant gate: browsers only start audio after a user gesture, so the first key/tap unlocks it.
  import '../meta/meta.css';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import { motion } from '../meta/motion.svelte';
  import { isMeaningfulSave } from '../meta/save-utils';
  import { initAudio, ui } from '../meta/sfx';

  const SOUND_KEY = 'kempanion.sound';

  function storedSound(): boolean | null {
    try {
      const v = localStorage.getItem(SOUND_KEY);
      return v === null ? null : v === 'on';
    } catch {
      return null;
    }
  }

  const realSave = isMeaningfulSave(game.save, game.hasSave);
  let soundOn = $state(realSave ? game.save.settings.masterVolume > 0 : (storedSound() ?? true));
  let going = $state(false);
  let startBtn = $state<HTMLButtonElement>();

  /** Mirror the toggle into settings (in memory; persisted only if a real save exists) and the audio engine. */
  function applySound() {
    const s = game.save.settings;
    if (soundOn && s.masterVolume <= 0) s.masterVolume = 0.8;
    if (!soundOn) s.masterVolume = 0;
    try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch { /* blocked */ }
    try { audio.setVolumes({ master: s.masterVolume, bgm: s.bgmVolume, sfx: s.sfxVolume, voice: s.voiceVolume }); } catch { /* optional */ }
    if (isMeaningfulSave(game.save, game.hasSave)) game.persist();
  }
  applySound();

  function toggleSound(e: MouseEvent) {
    e.stopPropagation();
    soundOn = !soundOn;
    applySound();
    ui.toggle();
  }

  function toggleMotion(e: MouseEvent) {
    e.stopPropagation();
    game.save.settings.reduceMotion = !game.save.settings.reduceMotion;
    if (isMeaningfulSave(game.save, game.hasSave)) game.persist();
    ui.toggle();
  }

  async function start() {
    if (going) return;
    going = true;
    const ready = initAudio(); // must be called synchronously inside the gesture
    await ready;
    applySound();
    ui.select();
    game.go('splash');
  }

  const IGNORE = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Fn', 'OS']);
  function onkeydown(e: KeyboardEvent) {
    if (IGNORE.has(e.key) || e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t?.dataset.toggle !== undefined && (e.key === 'Enter' || e.key === ' ')) return; // let the toggle handle it
    e.preventDefault();
    void start();
  }

  $effect(() => {
    startBtn?.focus({ preventScroll: true });
  });
</script>

<svelte:window {onkeydown} />

<div class="km-screen gate" class:km-reduced={motion.reduced}>
  <button bind:this={startBtn} class="start" onclick={start} aria-label="Press any key or tap to start Kempanion Online">
    <span class="logo">KEMPANION <span class="online">ONLINE</span></span>
    {#if going}
      <span class="press" role="status">♪ TUNING THE KEMPA SYNTH…</span>
    {:else}
      <span class="press" class:blink={!motion.reduced} aria-hidden="true">
        <PixelGlyph name="cursor" scale={2} /> PRESS ANY KEY · TAP <span class="flip"><PixelGlyph name="cursor" scale={2} /></span>
      </span>
    {/if}
  </button>

  <div class="opts">
    <button class="px-btn ghost small" data-toggle aria-pressed={soundOn} onclick={toggleSound}>
      <PixelGlyph name={soundOn ? 'sound' : 'mute'} scale={2} /> SOUND: {soundOn ? 'ON' : 'OFF'}
    </button>
    <button
      class="px-btn ghost small"
      data-toggle
      aria-pressed={motion.reduced}
      disabled={motion.system}
      onclick={toggleMotion}
    >
      MOTION: {motion.reduced ? 'REDUCED' : 'FULL'}{motion.system ? ' (SYSTEM)' : ''}
    </button>
  </div>
  <p class="hint">text blips are half the charm — sound on is recommended</p>
</div>

<style>
  .gate {
    background: radial-gradient(ellipse at 50% 40%, #2a1d4a 0%, var(--night) 70%);
  }
  .start {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 28px;
    width: 100%;
    padding: 0 16px 80px;
    color: var(--paper);
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .start:focus-visible { outline: none; }
  .logo {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(28px, 6vw, 56px);
    letter-spacing: 0.08em;
    color: var(--sakura-1);
    text-shadow: 3px 3px 0 var(--sakura-4), 6px 6px 0 var(--ink);
    text-align: center;
  }
  .online { color: var(--paper); }
  .press {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-display);
    font-size: clamp(16px, 2.4vw, 22px);
    letter-spacing: 0.12em;
    color: var(--gold);
  }
  .flip { display: inline-flex; transform: scaleX(-1); }
  .opts {
    position: absolute;
    left: 0;
    right: 0;
    bottom: max(56px, calc(var(--safe-bottom) + 44px));
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    padding: 0 16px;
    z-index: 1;
  }
  .opts .px-btn { min-height: 44px; font-size: 15px; }
  .hint {
    position: absolute;
    left: 0;
    right: 0;
    bottom: max(16px, var(--safe-bottom));
    margin: 0;
    padding: 0 16px;
    text-align: center;
    font-size: 13px;
    color: rgba(255, 246, 234, 0.6);
    pointer-events: none;
  }
  @media (max-height: 420px) {
    .start { padding-bottom: 96px; gap: 16px; }
    .opts { bottom: max(36px, calc(var(--safe-bottom) + 28px)); }
    .hint { bottom: max(8px, var(--safe-bottom)); }
  }
</style>
