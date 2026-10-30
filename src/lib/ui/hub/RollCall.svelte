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

  function stamp() {
    if (claim || card.claimedToday) return;
    const money = game.save.money;
    claim = claimDaily(game.save, now());
    if (!claim) return;
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
</script>

<Modal title="Roll Call" icon="stamp" size="md" onclose={close}>
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
    {:else}
      <button type="button" class="px-btn primary stamp-btn" onclick={stamp} data-autofocus>
        <Icon id="stamp" size={24} /> Stamp it!
      </button>
    {/if}
  </section>

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

  {#snippet footer()}
    <button type="button" class="px-btn primary" onclick={close}>Let’s go!</button>
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
  .n { font-family: var(--font-display); font-size: 18px; opacity: 0.7; }
  .r { font-size: 10px; text-align: center; line-height: 1.1; opacity: 0.85; }
  .got { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; color: var(--gold); }
  .stamp-btn { min-width: 160px; }
  section :global(.px-btn) { min-height: 44px; }
  .tasks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .tasks li { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .tasks li.done .tt { text-decoration: line-through; opacity: 0.7; }
  .tt { flex: 1; }
  .rw { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; color: var(--gold); white-space: nowrap; }
  @keyframes stamp-in { from { transform: scale(1.6); opacity: 0; } to { transform: none; opacity: 1; } }
  :global(html.reduce-motion) .card li.today { animation: none; }
</style>
