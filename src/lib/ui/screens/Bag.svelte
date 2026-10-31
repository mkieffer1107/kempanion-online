<script lang="ts">
  // Bag: inventory grid with tabs, item details, USE on your Kempanion (applyAction) or GIVE a gift to a pig.
  // params: { back?: ScreenId, backParams?: object, pigs?: PigId[] (who is here to receive gifts) }
  import '../meta/meta.css';
  import { tick } from 'svelte';
  import { PIG_IDS, type Expression, type ItemDef, type PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { getItem } from '../../pet';
  import { faceUrl } from '../meta/assets';
  import ItemIcon from '../meta/ItemIcon.svelte';
  import MetaFrame from '../meta/MetaFrame.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import PortraitImg from '../meta/PortraitImg.svelte';
  import Tabs from '../meta/Tabs.svelte';
  import TasteRow from '../meta/TasteRow.svelte';
  import { actionForItem, effectSummary, shopTabOf, type ShopTab } from '../meta/save-utils';
  import { goBack } from '../meta/nav';
  import { ui } from '../meta/sfx';
  import { Typewriter } from '../meta/typewriter.svelte';

  const params = game.params;
  const present: PigId[] = Array.isArray(params.pigs) ? (params.pigs as PigId[]).filter((p) => PIG_IDS.includes(p)) : [...PIG_IDS];

  const humanize = (id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  /** Unknown ids (e.g. a story [give] of something the pet module doesn't define) become keepsakes. */
  function defFor(id: string): ItemDef {
    return getItem(id) ?? { id, name: humanize(id), desc: '', category: 'key', price: 0, effects: {}, icon: id };
  }

  const TAB_DEFS: { id: ShopTab; label: string; jp: string }[] = [
    { id: 'food', label: 'FOOD', jp: 'たべもの' },
    { id: 'drinks', label: 'DRINKS', jp: 'のみもの' },
    { id: 'care', label: 'CARE', jp: 'ケア' },
    { id: 'gifts', label: 'GIFTS', jp: 'プレゼント' },
    { id: 'key', label: 'KEEP', jp: 'たからもの' },
  ];

  const entries = $derived(
    Object.entries(game.save.inventory)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ def: defFor(id), n })),
  );
  const tabs = $derived(
    TAB_DEFS.map((t) => {
      const c = entries.filter((e) => shopTabOf(e.def) === t.id).reduce((a, e) => a + e.n, 0);
      return { ...t, count: c ? String(c) : undefined };
    }),
  );

  let tab = $state<ShopTab>('food');
  let selId = $state<string | null>(null);
  /** Just used the last one: its card stays up ("all gone") with his reaction until you pick something else. */
  let gone = $state<ItemDef | null>(null);
  let slots: HTMLButtonElement[] = $state([]);
  let detailsEl = $state<HTMLElement>();
  let speaker = $state<PigId | null>(null);
  let speakerExpr = $state<Expression>('happy');
  let notice = $state('');
  const tw = new Typewriter();
  $effect(() => () => tw.stop());

  const list = $derived(entries.filter((e) => shopTabOf(e.def) === tab));
  const sel = $derived(
    list.find((e) => e.def.id === selId) ?? (gone && gone.id === selId ? { def: gone, n: 0 } : null) ?? list[0] ?? null,
  );
  const companion = $derived(game.save.companion);
  const action = $derived(sel ? actionForItem(sel.def) : null);
  const canUse = $derived(!!sel && sel.n > 0 && !!companion && !!action && action !== 'gift');
  const isGift = $derived(sel?.def.category === 'gift');
  const showTastes = $derived(!!sel && ['food', 'drink', 'gift'].includes(sel.def.category));
  const SLOT_MIN = 12;
  const empties = $derived(Math.max(0, SLOT_MIN - list.length));

  /** A reaction or notice belongs to the item it was about: drop it when the selection moves on. */
  function clearFeedback() {
    tw.stop();
    speaker = null;
    notice = '';
    gone = null;
  }

  function pick(id: string) {
    if (selId === id) return;
    selId = id;
    clearFeedback();
    ui.move();
  }

  /** Feedback lands at the bottom of the details; bring it into view when they scroll (phone landscape, short phones). */
  async function showFeedback() {
    await tick();
    if (detailsEl) detailsEl.scrollTop = detailsEl.scrollHeight;
  }

  function react(pig: PigId, text: string, expr: Expression = 'happy') {
    speaker = pig;
    speakerExpr = expr;
    notice = '';
    tw.start(text, pig);
    void showFeedback();
  }

  function use() {
    if (!sel || !action) return;
    if (!companion) {
      ui.error();
      notice = 'Pick a Kempanion first!';
      void showFeedback();
      return;
    }
    run(companion, action === 'gift' ? 'gift' : action, sel.def);
  }

  function give(p: PigId) {
    if (!sel) return;
    run(p, 'gift', sel.def);
  }

  function run(pig: PigId, act: NonNullable<typeof action>, def: ItemDef) {
    const res = game.act(pig, act, def.id);
    if (!res.ok) {
      ui.error();
      speaker = null;
      notice = res.reason ?? "He can't use that right now.";
      void showFeedback();
      return;
    }
    if (res.sfx) ui.sfx(res.sfx);
    else ui.select();
    // stay on this item even if that was the last one (otherwise the details would jump to the next item)
    selId = def.id;
    gone = (game.save.inventory[def.id] ?? 0) > 0 ? null : def;
    const fallback = act === 'gift' ? `For me? Thank you!` : `Thanks! That hit the spot.`;
    react(pig, res.line ?? fallback, res.expression ?? (act === 'gift' ? 'shy_blush' : 'happy'));
  }

  /** Slots per row right now (the grid is auto-fill). */
  function colsNow(): number {
    const els = slots.filter(Boolean);
    if (els.length < 2) return 1;
    const top = els[0].offsetTop;
    let c = 0;
    for (const el of els) {
      if (el.offsetTop !== top) break;
      c++;
    }
    return Math.max(1, c);
  }

  function onkeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t?.getAttribute('role') === 'tab') return;
    const cols = colsNow();
    const i = Math.max(0, list.findIndex((x) => x.def.id === sel?.def.id));
    let n = -1;
    if (e.key === 'ArrowRight') n = i + 1;
    else if (e.key === 'ArrowLeft') n = i - 1;
    else if (e.key === 'ArrowDown') n = i + cols;
    else if (e.key === 'ArrowUp') n = i - cols;
    else if (e.key === 'u' || e.key === 'U') {
      e.preventDefault();
      if (canUse) use();
      return;
    } else if (e.key === ']' || e.key === '[') {
      e.preventDefault();
      const j = TAB_DEFS.findIndex((x) => x.id === tab) + (e.key === ']' ? 1 : -1);
      tab = TAB_DEFS[(j + TAB_DEFS.length) % TAB_DEFS.length].id;
      selId = null;
      clearFeedback();
      ui.move();
      return;
    } else return;
    e.preventDefault();
    if (!list.length) return;
    n = Math.max(0, Math.min(list.length - 1, n));
    pick(list[n].def.id);
    slots[n]?.focus();
  }
</script>

<svelte:window {onkeydown} />

<MetaFrame title="BAG" jp="かばん" money onBack={() => goBack('hub')}>
  <Tabs {tabs} bind:value={tab} label="Bag pockets" compact onchange={() => { selId = null; clearFeedback(); }} />

  <div class="bag">
    <section class="grid px-scroll" aria-label="Items">
      {#each list as e, i (e.def.id)}
        <button
          bind:this={slots[i]}
          class="slot"
          class:sel={sel?.def.id === e.def.id}
          onclick={() => pick(e.def.id)}
          aria-label="{e.def.name}, {e.n}"
          aria-pressed={sel?.def.id === e.def.id}
        >
          <ItemIcon id={e.def.icon} size={32} />
          <span class="count">×{e.n}</span>
        </button>
      {/each}
      {#each Array.from({ length: empties }, (_, i) => i) as i (i)}
        <span class="slot empty" aria-hidden="true"></span>
      {/each}
    </section>

    <section class="km-window details" aria-label="Item details" bind:this={detailsEl}>
      {#if sel}
        <div class="dhead">
          <span class="bigicon" class:empty={sel.n === 0}><ItemIcon id={sel.def.icon} size={64} /></span>
          <div>
            <h2 class="km-title dname">{sel.def.name} <span class="x">{sel.n > 0 ? `×${sel.n}` : 'all gone'}</span></h2>
            {#if effectSummary(sel.def).length}<p class="effects">{effectSummary(sel.def).join('  ')}</p>{/if}
          </div>
        </div>
        {#if sel.def.desc}<p class="desc">{sel.def.desc}</p>{/if}
        {#if showTastes}<TasteRow item={sel.def} />{/if}

        <div class="acts">
          {#if sel.n === 0}
            <p class="keep">That was the last one.</p>
          {:else if sel.def.category === 'key'}
            <p class="keep">A keepsake. It stays in your bag.</p>
          {:else if isGift}
            <p class="lbl">GIVE TO</p>
            <div class="givers">
              {#each present as p (p)}
                <button class="px-btn give" style:--pig={CHARACTERS[p].color} onclick={() => give(p)}>
                  <img src={faceUrl(p)} alt="" width="32" height="32" draggable="false" />{CHARACTERS[p].name}
                </button>
              {/each}
            </div>
          {:else}
            <button class="px-btn primary use" onclick={use} disabled={!companion}>
              USE ON {companion ? CHARACTERS[companion].name.toUpperCase() : 'YOUR KEMPANION'}
            </button>
          {/if}
        </div>

        {#if speaker}
          <div class="reply vn-box" aria-live="polite">
            <span class="mini"><PortraitImg pig={speaker} expression={speakerExpr} alt="" /></span>
            <div class="rtext">
              <span class="km-plate" style:--plate={CHARACTERS[speaker].color}>{CHARACTERS[speaker].name}</span>
              <p>{tw.visible}<span class="ghost">{tw.text.slice(tw.visible.length)}</span></p>
            </div>
          </div>
        {/if}
        {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      {:else}
        <div class="km-empty">
          <PixelGlyph name="box" scale={4} />
          <p>{entries.length ? 'Nothing in this pocket.' : 'Your bag is empty. The Union Market has snacks!'}</p>
        </div>
      {/if}
    </section>
  </div>
</MetaFrame>

<style>
  .bag {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 1fr);
    gap: 14px;
  }
  .grid {
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    grid-auto-rows: 76px;
    align-content: start;
    gap: 8px;
    padding: 2px 4px 2px 2px;
  }
  .slot {
    position: relative;
    display: grid;
    place-items: center;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.06);
    border: var(--px) solid rgba(255, 214, 224, 0.35);
    box-shadow: inset 0 0 0 var(--px) rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }
  .slot:hover { background: rgba(255, 255, 255, 0.12); }
  .slot.sel { background: var(--sakura-1); border-color: var(--ink); color: var(--ink); }
  .slot:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: 1px; }
  .slot.empty { cursor: default; background: rgba(0, 0, 0, 0.18); border-style: dashed; }
  .count {
    position: absolute;
    right: 4px;
    bottom: 2px;
    font-family: var(--font-display);
    font-size: 14px;
    text-shadow: 1px 1px 0 var(--ink);
  }
  .slot.sel .count { text-shadow: none; }

  .details { padding: 14px; gap: 10px; overflow: auto; }
  /* the icon and name stay pinned while the details scroll (down to his reply after the last one is used, on a phone
     in landscape): an opaque window-colored band that the text slides under, 4px of it above and 6px (the phone gap,
     where the 64px icon pokes out of its frame) below. Sticky offsets start inside the scroller's padding, so top =
     minus that padding pins it flush with the window's edge */
  .dhead {
    position: sticky;
    top: -14px;
    z-index: 1;
    display: flex;
    gap: 12px;
    align-items: center;
    margin: -4px 0 -6px;
    padding: 4px 0 6px;
    background: rgb(27, 20, 40);
  }
  .bigicon {
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    flex: none;
    background: rgba(255, 255, 255, 0.08);
    border: var(--px) solid var(--sakura-3);
  }
  .bigicon.empty { opacity: 0.4; }
  .dname { margin: 0; font-size: 22px; color: var(--sakura-1); }
  .x { font-size: 16px; color: var(--paper); opacity: 0.75; }
  .effects { margin: 4px 0 0; font-family: var(--font-display); font-size: 14px; color: var(--ok); }
  .desc { margin: 0; font-size: 15px; line-height: 1.5; }
  .acts { display: grid; gap: 8px; }
  .lbl { margin: 0; font-family: var(--font-display); font-size: 14px; color: var(--sakura-2); letter-spacing: 0.08em; }
  .keep { margin: 0; font-size: 14px; opacity: 0.8; }
  .givers { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
  .give { justify-content: flex-start; border-bottom-color: var(--pig); font-size: 15px; }
  .give img { width: 32px; height: 32px; image-rendering: pixelated; }
  .use { width: 100%; min-height: 48px; font-family: var(--font-display); font-size: 18px; }
  .reply {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 10px;
    margin-top: 6px;
  }
  .mini { width: 64px; height: 85px; flex: none; overflow: hidden; display: flex; align-items: flex-start; }
  .rtext p { margin: 6px 0 0; font-size: 15px; line-height: 1.45; }
  .ghost { visibility: hidden; }
  .notice { margin: 0; padding: 6px 10px; font-size: 14px; color: var(--ink); background: var(--warn); border: var(--px) solid var(--ink); }

  @media (max-aspect-ratio: 5/4) {
    .bag { grid-template-columns: 1fr; grid-template-rows: minmax(120px, 1fr) auto; gap: 8px; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); grid-auto-rows: 64px; gap: 6px; }
    .details { padding: 10px; gap: 6px; max-height: 58vh; }
    .dhead { top: -10px; }
    .bigicon { width: 52px; height: 52px; }
    .dname { font-size: 18px; }
  }
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .bag { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); grid-auto-rows: 60px; gap: 6px; }
    .details { padding: 10px; gap: 6px; }
    .dhead { top: -10px; }
    .bigicon { width: 48px; height: 48px; }
    /* a smaller reaction box, so more of the item stays in view above it */
    .reply { padding: 6px 8px; margin-top: 0; }
    .mini { width: 48px; height: 64px; }
  }
</style>
