<script lang="ts">
  // Campus map: pins with the faces of whoever is there right now, a ♥ when a heart event is ready, a
  // selected-place card, and a list (also the screen-reader path). GO plays a short walk, then travels.
  import { onMount } from 'svelte';
  import { PIG_IDS, type LocationId, type PigId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { gameClock } from '../../state/ticker.svelte';
  import { audio } from '../../audio';
  import { eligibleScenes } from '../../vn';
  import { CHARACTERS } from '../../content/characters';
  import { LOCATIONS, LOCATION_IDS, whereIs } from '../../content/locations';
  import { timeOfDay, weekday } from '../../time';
  import { asset, faceUrl, hasBackground } from '../sprites';
  import { viewport } from '../viewport.svelte';
  import { ui } from '../ui.svelte';
  import ClockChip from '../components/ClockChip.svelte';
  import PigFace from '../components/PigFace.svelte';
  import Icon from '../components/Icon.svelte';
  import SpriteAnim from '../components/SpriteAnim.svelte';
  import { drawCampus, MAP_H, MAP_W } from '../map/campusMap';

  const d = $derived(new Date(gameClock.minute * 60_000));
  const here = $derived(game.save.location);
  const companion = game.save.companion;
  const painted = hasBackground('map');
  /** Half a pin's width: the faces row (20 px each + 1 px gap) or the 44 px tap target, so pins near the map's
   *  edge keep their faces inside it (Sakura House sits on the west edge, Midtown on the north one). */
  const pinHalf = (faces: number) => Math.max(22, (faces * 21) / 2 + 2);

  /** Where each pig is right now (an asleep Kempanion is at home even outside his bedtime). */
  const whereNow = $derived(
    Object.fromEntries(PIG_IDS.map((p) => [p, game.save.pigs[p].asleep && p === companion ? 'dorm' : whereIs(p, d)])) as Record<PigId, LocationId>,
  );
  const pigsAt = (loc: LocationId) => PIG_IDS.filter((p) => whereNow[p] === loc);

  /** 'heart' = a heart event is ready there; 'event' = some other scene is waiting. */
  const marks = $derived.by(() => {
    const out: Partial<Record<LocationId, 'heart' | 'event'>> = {};
    for (const loc of LOCATION_IDS) {
      try {
        const list = eligibleScenes({ location: loc, time: timeOfDay(d), weekday: weekday(d), save: game.save, date: d }, { ignoreChance: true });
        if (list.some((s) => s.heart)) out[loc] = 'heart';
        else if (list.length) out[loc] = 'event';
      } catch { /* scenes still loading */ }
    }
    return out;
  });

  const ordered = $derived(
    [...LOCATION_IDS].sort((a, b) => pigsAt(b).length - pigsAt(a).length || Number(!!marks[b]) - Number(!!marks[a]) || LOCATIONS[a].name.localeCompare(LOCATIONS[b].name)),
  );

  let selected = $state<LocationId>(game.save.location);
  let traveling = $state<LocationId | null>(null);
  let canvas = $state<HTMLCanvasElement | null>(null);

  function select(id: LocationId) {
    if (selected !== id) audio.sfx('ui_move');
    selected = id;
  }

  function go(id: LocationId) {
    if (traveling) return;
    audio.sfx('ui_select');
    if (ui.reduceMotion) { game.go('location', { location: id }); return; }
    traveling = id;
    audio.sfx('whoosh');
    const steps = [120, 300, 480].map((t) => setTimeout(() => audio.sfx('step'), t));
    setTimeout(() => {
      steps.forEach(clearTimeout);
      game.go('location', { location: id });
    }, 680);
  }

  function close() {
    audio.sfx('ui_back');
    game.back(companion ? 'hub' : 'title');
  }

  function names(list: PigId[]): string {
    return list.map((p) => CHARACTERS[p].name).join(', ');
  }

  onMount(() => {
    audio.playSong('map', { fadeMs: 600 });
    if (!painted && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawCampus(ctx);
    }
  });

  const sel = $derived(LOCATIONS[selected]);
  const selPigs = $derived(pigsAt(selected));
</script>

<div class="map-screen mode-{viewport.mode}">
  <header class="head">
    <button type="button" class="px-btn ghost small" onclick={close} aria-label="Close the map"><Icon id="back" size={18} /></button>
    <h1 class="px-title">CAMPUS MAP <span class="jp" aria-hidden="true">キャンパス</span></h1>
    <ClockChip small />
  </header>

  <div class="board">
    <div class="map-box">
      <div class="map" style:aspect-ratio="{MAP_W} / {MAP_H}">
        {#if painted}
          <img src={asset('bg/map.png')} alt="" draggable="false" />
        {:else}
          <canvas bind:this={canvas} width={MAP_W} height={MAP_H} aria-hidden="true"></canvas>
        {/if}
        {#each LOCATION_IDS as id (id)}
          {@const loc = LOCATIONS[id]}
          {@const who = pigsAt(id)}
          <button
            type="button"
            class="pin"
            class:sel={selected === id}
            class:here={here === id}
            style:left="clamp({pinHalf(who.length)}px, {loc.map.x * 100}%, calc(100% - {pinHalf(who.length)}px))"
            style:top="max({loc.map.y * 100}%, 38px)"
            onclick={() => select(id)}
            ondblclick={() => go(id)}
            aria-label="{loc.name}{who.length ? `. ${names(who)} here` : ''}{marks[id] === 'heart' ? '. A heart event is ready' : ''}"
            tabindex="-1"
          >
            <span class="dot"><Icon id="pin" size={20} /></span>
            {#if who.length}
              <span class="faces">
                {#each who as p (p)}<img src={faceUrl(p)} alt="" class="f" style:--c={CHARACTERS[p].color} />{/each}
              </span>
            {/if}
            {#if marks[id]}<span class="mark" class:heart={marks[id] === 'heart'}>{marks[id] === 'heart' ? '♥' : '!'}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <aside class="side">
      <section class="card px-panel dark" aria-live="polite">
        <p class="cname">{sel.name} <span class="jp" aria-hidden="true">{sel.jp}</span></p>
        <p class="blurb">{sel.blurb}</p>
        <p class="who">
          {#if selPigs.length}
            {#each selPigs as p (p)}<PigFace pig={p} size={24} />{/each}
            <span>{names(selPigs)} {selPigs.length === 1 ? 'is' : 'are'} {selected === 'dorm' ? 'home' : 'here'} now.</span>
          {:else}
            <span>Nobody’s around right now.</span>
          {/if}
        </p>
        {#if marks[selected] === 'heart'}<p class="heart-note">♥ Something special is about to happen here…</p>{/if}
        <button type="button" class="px-btn primary go" onclick={() => go(selected)}>
          <Icon id="pin" size={18} /> {here === selected ? 'Enter' : 'Go'}
        </button>
      </section>

      <ul class="list px-scroll" aria-label="Places">
        {#each ordered as id (id)}
          {@const loc = LOCATIONS[id]}
          {@const who = pigsAt(id)}
          <li class:sel={selected === id}>
            <button type="button" class="row" onclick={() => select(id)} aria-pressed={selected === id}>
              <span class="rn">{loc.name}{#if here === id} <small>(you)</small>{/if}</span>
              <span class="rf">
                {#each who as p (p)}<PigFace pig={p} size={20} label />{/each}
                {#if marks[id]}<span class="mark inline" class:heart={marks[id] === 'heart'} aria-label={marks[id] === 'heart' ? 'Heart event ready' : 'Event'}>{marks[id] === 'heart' ? '♥' : '!'}</span>{/if}
              </span>
            </button>
            <button type="button" class="px-btn small go-sm" onclick={() => go(id)} aria-label="Go to {loc.name}">GO</button>
          </li>
        {/each}
      </ul>
    </aside>
  </div>

  {#if traveling}
    <div class="travel" aria-live="assertive">
      <div class="strip">
        <div class="walker">
          <SpriteAnim pig={companion ?? 'piggy-1'} anim="walk_right" scale={viewport.mode === 'w' ? 1 : 0.75} />
        </div>
        <p class="to">→ {LOCATIONS[traveling].name}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .map-screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
    background: var(--night);
    color: var(--paper);
    overflow: hidden;
  }
  .head { display: flex; align-items: center; gap: 8px; padding: 6px 8px; flex: none; }
  h1 { flex: 1; margin: 0; font-size: 20px; letter-spacing: 0.08em; }
  .jp { font-size: 0.7em; color: var(--sakura-2); margin-left: 6px; }

  .board { flex: 1; min-height: 0; display: flex; gap: 10px; padding: 0 8px 8px; }
  .map-box { flex: 1; min-width: 0; min-height: 0; display: grid; place-items: center; container-type: size; }
  .map {
    position: relative;
    width: min(100cqw, 100cqh * 1.5);
    box-shadow: 0 0 0 3px var(--ink), 0 0 0 6px var(--sakura-3);
  }
  .map > img, .map > canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }

  .pin {
    position: absolute;
    transform: translate(-50%, -85%);
    min-width: 44px;
    min-height: 44px;
    display: grid;
    justify-items: center;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }
  .pin .dot { filter: drop-shadow(1px 1px 0 var(--ink)); }
  .pin.sel .dot { animation: pin-bob 0.8s steps(2) infinite; }
  .pin.sel::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 18px;
    height: 4px;
    background: var(--gold);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .faces { display: flex; gap: 1px; margin-top: -2px; }
  .f { width: 20px; height: 20px; image-rendering: pixelated; background: color-mix(in srgb, var(--c) 40%, var(--night)); box-shadow: 0 0 0 2px var(--c); }
  .mark {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    background: var(--gold);
    color: var(--ink);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    box-shadow: 0 0 0 2px var(--ink);
  }
  .mark.heart { background: var(--sakura-3); color: #fff; animation: pin-bob 1s steps(2) infinite; }
  .mark.inline { position: static; }
  @keyframes pin-bob { 50% { transform: translateY(-3px); } }

  .side { flex: 0 0 min(340px, 34%); min-height: 0; display: flex; flex-direction: column; gap: 8px; }
  .card { padding: 10px 12px; display: grid; gap: 6px; flex: none; }
  .card p { margin: 0; }
  .cname { font-family: var(--font-display); font-size: 18px; }
  .blurb { font-size: 14px; opacity: 0.9; }
  .who { display: flex; align-items: center; flex-wrap: wrap; gap: 2px 6px; font-size: 14px; }
  .heart-note { color: var(--sakura-2); font-size: 14px; }
  .go { justify-self: start; min-width: 120px; }
  .list { flex: 1; min-height: 0; list-style: none; margin: 0; padding: 0 2px 0 0; display: flex; flex-direction: column; gap: 4px; }
  .list li { display: flex; gap: 6px; align-items: center; }
  .row {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    color: inherit;
    border: 2px solid transparent;
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .row:focus-visible { outline: var(--px) dashed var(--gold); }
  li.sel .row { border-color: var(--sakura-3); background: rgba(244, 143, 177, 0.15); }
  .rn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rn small { color: var(--sakura-2); }
  .rf { display: flex; align-items: center; gap: 0; flex: none; }
  .rf :global(.face) { margin: 2px; }
  .go-sm { min-width: 52px; min-height: 44px; }
  .head .px-btn { min-height: 44px; min-width: 44px; }

  /* T: map on top, card + list below */
  .mode-t .board { flex-direction: column; }
  .mode-t .map-box { flex: none; container-type: inline-size; }
  .mode-t .map { width: 100cqw; }
  .mode-t .side { flex: 1; }
  /* S: compact header */
  .mode-s .head { padding: 2px 8px; }
  .mode-s h1 { font-size: 16px; }
  .mode-s .side { flex-basis: 42%; }
  .mode-s .card .blurb { display: none; }

  .travel {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    background: rgba(12, 6, 26, 0.6);
  }
  .strip {
    width: 100%;
    padding: 8px 0;
    background: linear-gradient(180deg, #2a1d4a, #1a1030);
    border-top: 3px solid var(--sakura-3);
    border-bottom: 3px solid var(--sakura-3);
    overflow: hidden;
    position: relative;
  }
  .walker { animation: walk-across 680ms linear both; width: max-content; }
  .to { margin: 0; text-align: center; font-family: var(--font-display); font-size: 18px; color: var(--gold); }
  @keyframes walk-across { from { transform: translateX(-20vw); } to { transform: translateX(100vw); } }
  :global(html.reduce-motion) .pin.sel .dot, :global(html.reduce-motion) .mark.heart { animation: none; }
</style>
