<script lang="ts">
  // ?debug panel: time warp, bond/acorns, needs, sickness, thought clouds, scenes, album, saves. Never shown without ?debug.
  import { NEED_IDS, PIG_IDS, type PigId } from '../types';
  import { game, type ScreenId } from '../state/game.svelte';
  import { clockOffset, now } from '../state/clock';
  import { gameClock } from '../state/ticker.svelte';
  import { allScenes } from '../vn';
  import { CHARACTERS } from '../content/characters';
  import { clockString, localDate, timeOfDay } from '../time';
  import { thoughtsToday } from '../pet/thoughts';
  import { toast } from '../ui/toasts.svelte';

  const H = 3_600_000;
  let open = $state(false);
  let skipSim = $state(false);
  let sceneId = $state('');
  let jump = $state<ScreenId>('hub');

  const scenes = $derived(open ? allScenes() : []);
  const d = $derived(gameClock.date());
  const offsetH = $derived((gameClock.ms && clockOffset() / H).toFixed(1));
  const comp = $derived(game.save.companion);

  function afterWarp() {
    if (skipSim) game.save.lastTick = now();
    else if (game.save.companion) game.tick();
    game.persist();
  }

  function warp(hours: number) {
    gameClock.warp(hours * H);
    afterWarp();
  }

  function at(hour: number, minute = 0) {
    const t = new Date(gameClock.ms);
    t.setHours(hour, minute, 0, 0);
    if (t.getTime() < gameClock.ms - 60_000) t.setDate(t.getDate() + 1);
    gameClock.set(t.getTime());
    afterWarp();
  }

  function realTime() {
    gameClock.realTime();
    afterWarp();
  }

  function bond(pig: PigId, n: number) {
    game.addBond(pig, n);
  }

  function setNeeds(v: number) {
    if (!comp) return;
    for (const n of NEED_IDS) game.save.pigs[comp].needs[n] = v;
    game.persist();
  }

  function sick() {
    if (!comp) return;
    const p = game.save.pigs[comp];
    p.sick = true;
    p.health = 25;
    game.save.flags[`pet.${comp}.sickAt`] = now();
    game.persist();
    toast(`${CHARACTERS[comp].name} is sick (debug).`, { icon: 'care' });
  }

  // Thought clouds (pet/thoughts.ts): today's log is marked when a cloud shows. ?debug&thoughts=fast shortens the gaps.
  const thoughtLog = $derived(
    PIG_IDS.map((p) => {
      const ids = thoughtsToday(game.save, p, gameClock.ms);
      return `${CHARACTERS[p].name} ${ids.length}${ids.length ? ` (last ${ids.slice(-2).join(', ')})` : ''}`;
    }).join(' · '),
  );

  /** The hub or place screen runs its next ambient beat right now (blocks still apply). */
  function thinkNow() {
    dispatchEvent(new Event('kempanion:think-now'));
  }

  function clearThoughts() {
    for (const p of PIG_IDS) delete game.save.flags[`pet.${p}.thoughts`];
    game.persist();
    toast('Today’s thoughts cleared (debug).', { icon: 'talk' });
  }

  function playScene() {
    if (!sceneId) return;
    open = false;
    game.go('scene', { id: sceneId, back: game.screen === 'scene' ? 'hub' : game.screen, backParams: { ...game.params } });
  }

  function unlockAll() {
    for (const s of allScenes()) {
      game.unlock(s.id);
      if (s.cg) game.unlock(s.cg);
    }
    for (const o of ['volleyball', 'scrubs', 'hoodie']) game.save.flags[`outfit_${o}`] = true;
    game.persist();
    toast('Album and outfits unlocked.', { icon: 'camera' });
  }

  function letter() {
    if (!comp) return;
    const t = now();
    game.save.flags['pet.away'] = JSON.stringify({ from: t - 5 * H - 12 * 60_000, to: t, party: false, pig: comp, deltas: { hunger: -21, energy: 12, fun: -9 } });
    game.persist();
    toast('Welcome-back letter queued (open the hub).', { icon: 'log' });
  }

  function rollCall() {
    game.save.lastDaily = '';
    game.persist();
    toast('Login stamp reset for today.', { icon: 'stamp' });
  }

  function setCompanion(p: PigId) {
    game.save.companion = p;
    game.persist();
    if (game.screen === 'hub') game.go('hub');
  }

  function wipe() {
    if (!confirm('Wipe the Kempanion save? (debug)')) return;
    game.wipe();
    location.reload();
  }

  const SCREENS: ScreenId[] = ['gate', 'splash', 'title', 'newgame', 'select', 'hub', 'talk', 'map', 'location', 'shop', 'bag', 'profiles', 'extras', 'settings', 'credits'];
</script>

<button type="button" class="dbg-toggle" onclick={() => (open = !open)} aria-expanded={open}>DBG</button>

{#if open}
  <div class="dbg" role="dialog" aria-label="Debug panel">
    <header>
      <strong>DEBUG</strong>
      <span>{clockString(d)} · {timeOfDay(d)} · {localDate(gameClock.ms)} · offset {offsetH} h</span>
      <button type="button" onclick={() => (open = false)} aria-label="Close debug">×</button>
    </header>

    <section>
      <h4>Time warp</h4>
      <div class="r">
        <button type="button" onclick={() => warp(-24)}>−1 d</button>
        <button type="button" onclick={() => warp(-1)}>−1 h</button>
        <button type="button" onclick={() => warp(1)}>+1 h</button>
        <button type="button" onclick={() => warp(3)}>+3 h</button>
        <button type="button" onclick={() => warp(6)}>+6 h</button>
        <button type="button" onclick={() => warp(24)}>+1 d</button>
      </div>
      <div class="r">
        <button type="button" onclick={() => at(6)}>dawn 06:00</button>
        <button type="button" onclick={() => at(12, 15)}>noon</button>
        <button type="button" onclick={() => at(18, 40)}>dusk</button>
        <button type="button" onclick={() => at(23)}>night</button>
        <button type="button" onclick={realTime}>real time</button>
      </div>
      <label class="r"><input type="checkbox" bind:checked={skipSim} /> skip sim catch-up on warp</label>
    </section>

    <section>
      <h4>Bond · acorns</h4>
      <div class="r">
        {#each PIG_IDS as p (p)}
          <button type="button" onclick={() => bond(p, 100)} style:border-color={CHARACTERS[p].color}>+100 {CHARACTERS[p].name} ({game.save.pigs[p].bond})</button>
        {/each}
      </div>
      <div class="r">
        <button type="button" onclick={() => game.addMoney(500)}>+500 acorns ({game.save.money})</button>
        <button type="button" onclick={rollCall}>reset today’s stamp</button>
        <button type="button" onclick={letter}>queue welcome letter</button>
      </div>
    </section>

    <section>
      <h4>Kempanion {comp ? `(${CHARACTERS[comp].name})` : '(none)'}</h4>
      <div class="r">
        {#each PIG_IDS as p (p)}
          <button type="button" class:on={comp === p} onclick={() => setCompanion(p)}>{CHARACTERS[p].name}</button>
        {/each}
      </div>
      <div class="r">
        <button type="button" onclick={() => setNeeds(100)}>needs 100</button>
        <button type="button" onclick={() => setNeeds(50)}>50</button>
        <button type="button" onclick={() => setNeeds(20)}>20</button>
        <button type="button" onclick={() => setNeeds(5)}>5</button>
        <button type="button" onclick={sick}>make sick</button>
        <button type="button" onclick={() => { if (comp) { game.save.pigs[comp].mess = 3; game.persist(); } }}>crumbs</button>
      </div>
      <div class="r">
        <button type="button" onclick={thinkNow}>think now</button>
        <button type="button" onclick={clearThoughts}>clear today’s thoughts</button>
      </div>
      <div class="r log">thoughts today: {thoughtLog}</div>
    </section>

    <section>
      <h4>Scenes ({scenes.length})</h4>
      <div class="r">
        <select bind:value={sceneId} aria-label="Scene">
          <option value="">— pick a scene —</option>
          {#each scenes as s (s.id)}<option value={s.id}>{s.id}{s.title && s.title !== s.id ? ` · ${s.title}` : ''}</option>{/each}
        </select>
        <button type="button" onclick={playScene} disabled={!sceneId}>play</button>
        <button type="button" onclick={unlockAll}>unlock all album</button>
      </div>
    </section>

    <section>
      <h4>Screens · save</h4>
      <div class="r">
        <select bind:value={jump} aria-label="Screen">
          {#each SCREENS as sc (sc)}<option value={sc}>{sc}</option>{/each}
        </select>
        <button type="button" onclick={() => { open = false; game.go(jump); }}>go</button>
        <button type="button" onclick={() => { game.flush(); toast('Saved.'); }}>flush save</button>
        <button type="button" class="bad" onclick={wipe}>wipe save</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .dbg-toggle {
    position: fixed;
    z-index: 200;
    left: calc(var(--safe-left) + 4px);
    bottom: calc(var(--safe-bottom) + 4px);
    min-width: 44px;
    min-height: 32px;
    padding: 2px 6px;
    font: 11px/1 monospace;
    color: #0f0;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #0f0;
    cursor: pointer;
    opacity: 0.7;
  }
  .dbg {
    position: fixed;
    z-index: 199;
    left: calc(var(--safe-left) + 4px);
    bottom: calc(var(--safe-bottom) + 40px);
    width: min(560px, calc(100vw - 8px));
    max-height: min(70vh, 640px);
    overflow: auto;
    padding: 8px;
    font: 12px/1.35 monospace;
    color: #d8ffd8;
    background: rgba(6, 12, 8, 0.94);
    border: 1px solid #0f0;
    user-select: text;
    -webkit-user-select: text;
  }
  header { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  header span { flex: 1; opacity: 0.8; }
  h4 { margin: 8px 0 4px; color: #7fff7f; font-size: 12px; }
  .r { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 4px; }
  .log { font-size: 11px; opacity: 0.8; overflow-wrap: anywhere; }
  button, select {
    font: inherit;
    min-height: 32px;
    padding: 2px 8px;
    color: #d8ffd8;
    background: #10261a;
    border: 1px solid #2f7a4a;
    cursor: pointer;
  }
  button.on { background: #2f7a4a; }
  button.bad { border-color: #ff5a5f; color: #ffb0b0; }
  button:disabled { opacity: 0.5; cursor: default; }
  select { max-width: 280px; }
</style>
