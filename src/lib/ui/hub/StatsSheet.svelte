<script lang="ts">
  // STATS: needs with numbers, mood, bond (hearts, title, next unlock), today's counters, wardrobe.
  import { ALT_OUTFIT, NEED_IDS, type OutfitId, type PigId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { gameClock } from '../../state/ticker.svelte';
  import { moodOf, nextHeartEvent } from '../../pet';
  import { CHARACTERS } from '../../content/characters';
  import { localDate } from '../../time';
  import { audio } from '../../audio';
  import Modal from '../components/Modal.svelte';
  import NeedMeter from '../components/NeedMeter.svelte';
  import Hearts, { bondView } from '../components/Hearts.svelte';
  import PigFace from '../components/PigFace.svelte';

  let { pig, onclose, onoutfit }: { pig: PigId; onclose: () => void; onoutfit?: (o: OutfitId) => void } = $props();

  const p = $derived(game.save.pigs[pig]);
  const c = $derived(CHARACTERS[pig]);
  const bond = $derived(bondView(p.bond));
  const mood = $derived(moodOf(p, pig));
  const next = $derived(nextHeartEvent(game.save, pig));
  const alt = $derived(ALT_OUTFIT[pig]);
  const altUnlocked = $derived(game.save.flags[`outfit_${alt}`] === true);
  const today = $derived(p.today.date === localDate(gameClock.ms) ? p.today : { talks: 0, gifts: 0, pets: 0, minigames: 0 });
  const outfits = $derived<OutfitId[]>(['everyday', alt]);

  const MOOD: Record<string, string> = { great: 'Radiant', good: 'Content', okay: 'Meh', low: 'Down', awful: 'Blue' };
  const UNLOCKS: [number, string][] = [
    [1, 'Uses your name · accepts gifts'], [2, 'Lunch invites'], [3, 'Alternate outfit (heart event)'],
    [4, 'Picks a nickname for you'], [5, '“Walk with me”'], [7, 'A unique home idle'],
    [8, 'The Legend of the Century Sakura'], [10, 'Gold name plate'],
  ];
  const nextUnlock = $derived(UNLOCKS.find(([lv]) => lv > bond.level));
  const OUTFIT_NAME: Record<OutfitId, string> = { everyday: 'Everyday', volleyball: 'Volleyball kit', scrubs: 'Scrubs', hoodie: 'Black hoodie' };

  function wear(o: OutfitId) {
    if (p.outfit === o) return;
    audio.sfx('ui_toggle');
    p.outfit = o;
    game.persist();
    onoutfit?.(o);
  }
</script>

<Modal title="Stats" icon="stats" size="md" {onclose}>
  <div class="head">
    <PigFace {pig} size={56} outfit={p.outfit} />
    <div>
      <p class="name" style:color={c.color}>{c.name}</p>
      <p class="sub">
        Mood: <strong>{MOOD[mood] ?? mood}</strong>
        {#if p.asleep} · <strong>asleep</strong>{/if}
        {#if p.sick} · <strong class="sick">a bit sick</strong>{/if}
      </p>
    </div>
  </div>

  <section aria-label="Needs" class="needs">
    {#each NEED_IDS as n (n)}<NeedMeter need={n} value={p.needs[n]} />{/each}
  </section>

  <section class="bond" aria-label="Bond">
    <Hearts bond={p.bond} variant="row" />
    <p><strong>♥{bond.level} {bond.title}</strong>{#if bond.level < 10} · {bond.into}/{bond.span} to the next heart{/if}</p>
    <div class="px-meter" aria-hidden="true"><div class="fill" style:width="{bond.level >= 10 ? 100 : (bond.into / bond.span) * 100}%" style:--meter-color="var(--sakura-3)"></div></div>
    {#if nextUnlock}<p class="small">Next unlock at ♥{nextUnlock[0]}: {nextUnlock[1]}</p>{/if}
    {#if next}
      <p class="small">
        Heart event {next.n}: {next.ready ? 'ready — look for the ♥ on the map!' : `needs ♥${next.hearts}${next.chapter > 1 ? ` and chapter ${next.chapter}` : ''}.`}
      </p>
    {/if}
  </section>

  <section class="today" aria-label="Today">
    <h3>Today</h3>
    <ul>
      <li>Chats <strong>{today.talks}</strong></li>
      <li>Pats <strong>{today.pets}</strong></li>
      <li>Gifts <strong>{today.gifts}</strong></li>
      <li>Games <strong>{today.minigames}</strong></li>
    </ul>
  </section>

  {#if altUnlocked}
    <section class="wardrobe" aria-label="Wardrobe">
      <h3>Wardrobe</h3>
      <div class="row">
        {#each outfits as o (o)}
          <button type="button" class="px-btn small" class:primary={p.outfit === o} aria-pressed={p.outfit === o} onclick={() => wear(o)}>
            {OUTFIT_NAME[o]}
          </button>
        {/each}
      </div>
    </section>
  {/if}
</Modal>

<style>
  .head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .name { margin: 0; font-family: var(--font-display); font-size: 22px; }
  .sub { margin: 2px 0 0; font-size: 14px; }
  .sick { color: var(--warn); }
  .needs { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px 14px; margin: 8px 0 14px; }
  .bond { display: grid; gap: 6px; margin-bottom: 14px; }
  .bond p { margin: 0; }
  .small { font-size: 13px; opacity: 0.9; }
  h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 15px; letter-spacing: 0.06em; }
  .today ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 13px; }
  .today li { display: flex; flex-direction: column; align-items: center; padding: 4px; background: rgba(255, 255, 255, 0.06); }
  .wardrobe { margin-top: 14px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
