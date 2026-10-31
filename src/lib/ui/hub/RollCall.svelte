<script lang="ts">
  // Daily roll call (first hub visit of the day): login stamp, omikuji reminder, today's tasks.
  import type { PigId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { claimDaily, dailyTasks, getItem, omikujiToday, stampCard, type DailyClaim } from '../../pet';
  import { idleLine } from '../../ai/heuristic';
  import { CHARACTERS } from '../../content/characters';
  import { audio } from '../../audio';
  import Modal from '../components/Modal.svelte';
  import Icon from '../components/Icon.svelte';
  import PigFace from '../components/PigFace.svelte';

  let { pig, onclose, onomikuji }: { pig: PigId; onclose: () => void; onomikuji: () => void } = $props();

  const card = stampCard(game.save, now());
  const greet = $derived(idleLine(pig, 'greet', { playerName: game.save.player.name, pig, isCompanion: true }));
  const fortune = omikujiToday(game.save, now());
  const FORTUNE_NAME: Record<string, string> = { great: 'Great Blessing 大吉', blessing: 'Blessing 吉', small: 'Small Blessing 小吉', future: 'Future Blessing 末吉' };
  const REWARDS = ['30', '40 + snack', '50', '60', '70 + charm', '80', '100 + party'];

  let claim = $state<DailyClaim | null>(null);
  let tasks = $state(dailyTasks(game.save, now()));
  const filled = $derived(claim ? claim.stamp : card.onCard);
  /** Today's stamp is still waiting: the footer's main button stamps it (the footer stays on screen on any phone). */
  const unclaimed = $derived(!claim && !card.claimedToday);
  let stampedAt = 0;

  function stamp() {
    if (claim || card.claimedToday) return;
    const money = game.save.money;
    claim = claimDaily(game.save, now());
    if (!claim) return;
    stampedAt = performance.now();
    audio.jingle('daily_bonus');
    game.report({ moneyBefore: money });
    if (claim.item) game.events.push({ kind: 'item', item: claim.item, count: 1 });
    game.checkAchievements();
    tasks = dailyTasks(game.save, now());
    game.persist();
  }

  function close() {
    if (!claim && !card.claimedToday) stamp();
    onclose();
  }

  /** Footer: "Stamp it!" until today's stamp is on the card, then "Let's go!" (the same button, so focus stays). */
  function main() {
    if (unclaimed) {
      stamp();
      if (claim) return; // stay and watch it land (already stamped in another tab: just go)
    } else if (performance.now() - stampedAt < 450) {
      return; // a double tap on "Stamp it!" shouldn't close the card before the stamp lands
    }
    onclose();
  }
</script>

<Modal title="Roll Call" icon="stamp" size="md" onclose={close}>
  <!-- two columns on short landscape screens (greeting + stamp card | omikuji + tasks), one column elsewhere -->
  <div class="cols">
    <div class="col">
      <div class="greet">
        <PigFace {pig} size={48} />
        <p><strong style:color={CHARACTERS[pig].color}>{CHARACTERS[pig].name}:</strong> {greet.text}</p>
      </div>

      <section class="stamps" aria-label="Login stamp card">
        <h3>Stamp card {card.doubled ? '· next stamp doubled!' : ''}</h3>
        <ol class="card">
          {#each REWARDS as r, i (i)}
            <li class:on={i < filled} class:today={claim !== null && i === filled - 1}>
              {#if i < filled}<Icon id="stamp" size={32} alt="Stamped" />{:else}<span class="n">{i + 1}</span>{/if}
              <span class="r">{r}</span>
            </li>
          {/each}
        </ol>
        {#if claim}
          <p class="got">
            Day {claim.streak} stamp! <Icon id="acorn" size={18} /> +{claim.money} acorns
            {#if claim.item} · {getItem(claim.item)?.name ?? claim.item}{/if}
            {#if claim.scene} · a group hangout is ready on the KempaPager!{/if}
          </p>
        {:else if card.claimedToday}
          <p class="got">Today’s stamp is already on the card.</p>
        {/if}
      </section>
    </div>

    <div class="col">
      <section aria-label="Omikuji">
        <h3>Omikuji</h3>
        {#if fortune}
          <p>Today’s slip: <strong>{FORTUNE_NAME[fortune] ?? fortune}</strong></p>
        {:else}
          <p>Draw today’s fortune at the Century Tower sakura. No bad luck, ever.</p>
          <button type="button" class="px-btn small" onclick={() => { close(); onomikuji(); }}>
            <Icon id="pin" size={18} /> Go to Century Tower
          </button>
        {/if}
      </section>

      {#if tasks.length}
        <section aria-label="Today's tasks">
          <h3>Today’s tasks</h3>
          <ul class="tasks">
            {#each tasks as t (t.id)}
              <li class:done={t.done}>
                <Icon id={t.done ? 'star' : 'heart_empty'} size={18} />
                <span class="tt">{t.text}</span>
                <span class="rw">+{t.money}<Icon id="acorn" size={14} />{#if t.pig} · +{t.bond}♥{/if}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  </div>

  {#snippet footer()}
    <button type="button" class="px-btn primary main" onclick={main} data-autofocus>
      {#if unclaimed}<Icon id="stamp" size={24} /> Stamp it!{:else}Let’s go!{/if}
    </button>
  {/snippet}
</Modal>

<style>
  .greet { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .greet p { margin: 0; }
  section { margin-bottom: 14px; }
  h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 15px; letter-spacing: 0.06em; color: var(--sakura-2); }
  p { margin: 0 0 6px; }
  .card { list-style: none; margin: 0 0 8px; padding: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .card li {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 4px 2px;
    background: rgba(255, 255, 255, 0.06);
    border: 2px dashed rgba(255, 214, 224, 0.35);
    min-height: 58px;
    align-content: center;
  }
  .card li.on { border-style: solid; border-color: var(--sakura-3); }
  .card li.today { animation: stamp-in 240ms steps(3) both; }
  /* DotGothic16 (the body font), not the display font: in Pixelify Sans the 5 read as S and the 3 as 8 */
  .n { font-family: var(--font-body); font-size: 16px; line-height: 1.1; opacity: 0.7; }
  .r { font-size: 11px; text-align: center; line-height: 1.1; opacity: 0.85; }
  .got { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; color: var(--gold); }
  .main { min-width: 160px; }
  section :global(.px-btn) { min-height: 44px; }
  .tasks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .tasks li { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .tasks li.done .tt { text-decoration: line-through; opacity: 0.7; }
  .tt { flex: 1; }
  .rw { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; color: var(--gold); white-space: nowrap; }
  @keyframes stamp-in { from { transform: scale(1.6); opacity: 0; } to { transform: none; opacity: 1; } }
  :global(html.reduce-motion) .card li.today { animation: none; }
  /* Short screens (phone landscape): tighter card, so the stamp landing and the reward line fit above the footer. */
  @media (max-height: 499px) {
    .greet { margin-bottom: 6px; }
    section { margin-bottom: 8px; }
    h3 { margin-bottom: 4px; }
    .card li { min-height: 46px; padding: 2px; }
    .card li :global(img) { width: 24px; height: 24px; }
  }
  /* …and side by side when there's the width (phone landscape): the Century Tower button sits above the fold. */
  @media (max-height: 499px) and (min-width: 600px) {
    .cols { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 0 14px; align-items: start; }
  }
</style>
