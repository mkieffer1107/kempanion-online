<script lang="ts">
  // Pixel shop. params: { location?: 'reitz' | 'midtown' | 'shands' (default: save.location), back?, backParams? }
  // Tabs FOOD / DRINKS / CARE / GIFTS, today's cashier (a pig, deterministic by date), item list,
  // taste hints for discovered tastes only, quantity, BUY (acorns) with purchase SFX + jingle.
  import '../meta/meta.css';
  import { untrack } from 'svelte';
  import type { ItemDef, LocationId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { LOCATIONS } from '../../content/locations';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { localDate } from '../../time';
  import { buyItem, couponActive, shopStatus, shopStock } from '../../pet';
  import { bgUrl, hasBackground } from '../meta/assets';
  import { CASHIER, SHOPS, SHOP_GREET, fill, pickOne, type ShopLocation } from '../meta/content';
  import ItemIcon from '../meta/ItemIcon.svelte';
  import MetaFrame from '../meta/MetaFrame.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import PortraitImg from '../meta/PortraitImg.svelte';
  import ShopBackdrop from '../meta/ShopBackdrop.svelte';
  import Tabs from '../meta/Tabs.svelte';
  import TasteRow from '../meta/TasteRow.svelte';
  import { cashierFor, effectSummary, shopTabOf, type ShopTab } from '../meta/save-utils';
  import { goBack } from '../meta/nav';
  import { jingle, playSong, ui } from '../meta/sfx';
  import { Typewriter } from '../meta/typewriter.svelte';
  import { motion } from '../meta/motion.svelte';

  const params = game.params;
  const LOCS: ShopLocation[] = ['reitz', 'midtown', 'shands'];
  const loc: ShopLocation = LOCS.includes(params.location as ShopLocation)
    ? (params.location as ShopLocation)
    : LOCS.includes(game.save.location as ShopLocation) ? (game.save.location as ShopLocation) : 'reitz';
  const shop = SHOPS[loc];
  const cashier = cashierFor(loc, localDate(now()));
  const lines = CASHIER[cashier];
  const status = shopStatus(loc as LocationId, now());
  const stock: ItemDef[] = (() => {
    try {
      return shopStock(loc as LocationId, now()).filter((i) => i.category !== 'key');
    } catch {
      return [];
    }
  })();
  const hourLabel = (h: number) => {
    const hh = ((h % 24) + 24) % 24;
    return `${hh % 12 === 0 ? 12 : hh % 12} ${hh < 12 ? 'AM' : 'PM'}`;
  };
  const hoursText = status.hours
    ? status.hours[0] === 0 && status.hours[1] === 24
      ? 'Open 24 hours'
      : `Open ${hourLabel(status.hours[0])} – ${hourLabel(status.hours[1])}`
    : '';

  const TAB_DEFS: { id: ShopTab; label: string; jp: string }[] = [
    { id: 'food', label: 'FOOD', jp: 'たべもの' },
    { id: 'drinks', label: 'DRINKS', jp: 'のみもの' },
    { id: 'care', label: 'CARE', jp: 'ケア' },
    { id: 'gifts', label: 'GIFTS', jp: 'プレゼント' },
  ];
  const tabs = TAB_DEFS.map((t) => ({ ...t, disabled: !stock.some((i) => shopTabOf(i) === t.id) }));
  const firstTab = () => tabs.find((t) => !t.disabled)?.id ?? 'food';

  let tab = $state<ShopTab>(firstTab());
  let selId = $state<string | null>(null);
  let qty = $state(1);
  let pop = $state<{ key: number; text: string } | null>(null);
  let rows: HTMLButtonElement[] = $state([]);

  const list = $derived(stock.filter((i) => shopTabOf(i) === tab));
  const item = $derived(list.find((i) => i.id === selId) ?? list[0] ?? null);
  const money = $derived(game.save.money);
  // Small Blessing (omikuji): one unit of one purchase is half price today — same math as buyItem().
  const coupon = $derived(couponActive(game.save, now()));
  const discount = $derived(item && coupon ? Math.floor(item.price / 2) : 0);
  const maxQty = $derived(item && item.price > 0 ? Math.max(1, Math.min(99, Math.floor((money + discount) / item.price))) : 99);
  const total = $derived(item ? item.price * qty - discount : 0);
  const affordable = $derived(!!item && total <= money);
  const owned = $derived(item ? (game.save.inventory[item.id] ?? 0) : 0);
  const showTastes = $derived(!!item && (item.category === 'food' || item.category === 'drink' || item.category === 'gift'));


  // cashier speech
  const tw = new Typewriter();
  let cashierExpr = $state<'happy' | 'neutral' | 'excited' | 'sad' | 'proud' | 'laughing'>('happy');
  function say(text: string, expr: typeof cashierExpr = 'happy') {
    cashierExpr = expr;
    tw.start(text, cashier);
  }

  $effect(() => {
    playSong(LOCATIONS[loc]?.song ?? 'shop');
    untrack(() => {
      const greet = SHOP_GREET[loc]?.[cashier] ?? lines.greet;
      if (!status.open) say(`We're closed right now, sorry! ${hoursText}.`, 'sad');
      else if (!stock.length) say('The shelves are being restocked. Come back soon!', 'sad');
      else say(pickOne(greet), 'happy');
    });
    return () => tw.stop();
  });

  function select(id: string) {
    if (selId === id) return;
    selId = id;
    qty = 1;
    ui.move();
  }

  function changeQty(d: number) {
    const next = Math.max(1, Math.min(maxQty, qty + d));
    if (next !== qty) {
      qty = next;
      ui.move();
    } else ui.error();
  }

  function buy() {
    if (!item) return;
    if (!affordable) {
      ui.error();
      say(pickOne(lines.broke), 'sad');
      return;
    }
    const it = item;
    const moneyBefore = game.save.money;
    const res = buyItem(game.save, it.id, qty, now(), loc as LocationId);
    if (!res.ok) {
      ui.error();
      say(res.reason?.startsWith('Not enough') ? pickOne(lines.broke) : (res.reason ?? 'Hmm, that did not go through.'), 'sad');
      return;
    }
    game.report({ moneyBefore, tasks: res.tasks, achievements: res.achievements });
    game.events.push({ kind: 'item', item: it.id, count: res.qty });
    game.persist();
    ui.sfx('purchase');
    jingle('purchase');
    const line = fill(pickOne(lines.buy), { price: res.cost, qty: res.qty, item: it.name });
    say(res.discounted ? `${line} (Small Blessing: one was half price!)` : line, cashier === 'piggy-1' ? 'excited' : cashier === 'piggy-2' ? 'proud' : 'happy');
    pop = { key: (pop?.key ?? 0) + 1, text: `−${res.cost}` };
    qty = 1;
  }

  function moveSel(d: number) {
    if (!list.length) return;
    const i = Math.max(0, list.findIndex((x) => x.id === item?.id));
    const n = (i + d + list.length) % list.length;
    select(list[n].id);
    rows[n]?.focus({ preventScroll: false });
  }

  function switchTab(d: number) {
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length < 2) return;
    const i = enabled.findIndex((t) => t.id === tab);
    tab = enabled[(i + d + enabled.length) % enabled.length].id;
    selId = null;
    qty = 1;
    ui.move();
  }

  function onkeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t?.getAttribute('role') === 'tab') return; // the tab bar handles its own arrows
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveSel(1); break;
      case 'ArrowUp': e.preventDefault(); moveSel(-1); break;
      case 'ArrowRight': case '+': case '=': e.preventDefault(); changeQty(1); break;
      case 'ArrowLeft': case '-': e.preventDefault(); changeQty(-1); break;
      case ']': case 'e': case 'E': e.preventDefault(); switchTab(1); break;
      case '[': case 'q': case 'Q': e.preventDefault(); switchTab(-1); break;
      case 'b': case 'B': e.preventDefault(); buy(); break;
      case 'Enter':
        if (t?.tagName === 'BUTTON' && !t.dataset.row) return;
        e.preventDefault();
        buy();
        break;
    }
  }

  // a painted shop background once one exists (never the OR suite for the pharmacy)
  const bgId = hasBackground(loc) ? loc : null;
  const cashierName = CHARACTERS[cashier].name;
</script>

<svelte:window {onkeydown} />

<MetaFrame title={shop.name.toUpperCase()} jp={shop.jp} money onBack={() => goBack('location')}>
  <div class="shop">
    <section class="km-window counter" style:--pig={CHARACTERS[cashier].color} aria-label="Cashier">
      <div class="scene">
        {#if bgId}
          <div class="km-cover" style:background-image="url({bgUrl(bgId)})" aria-hidden="true"></div>
        {:else}
          <ShopBackdrop kind={loc} />
        {/if}
        <div class="clerk"><PortraitImg pig={cashier} expression={cashierExpr} alt="" /></div>
        <div class="desk" aria-hidden="true"></div>
        <span class="place km-jp" aria-hidden="true">{status.name || shop.place}</span>
      </div>
      <div class="speech vn-box" aria-live="polite">
        <span class="km-plate plate" style:--plate={CHARACTERS[cashier].color}>{cashierName}</span>
        <span class="role">cashier today</span>
        <p class="said">{tw.visible}<span class="ghost">{tw.text.slice(tw.visible.length)}</span></p>
      </div>
    </section>

    <section class="catalog" aria-label="Items">
      <Tabs {tabs} bind:value={tab} label="Shop sections" compact onchange={() => { selId = null; qty = 1; }} />
      {#if coupon && stock.length}
        <p class="coupon" role="note"><PixelGlyph name="star" scale={2} color="var(--gold)" /> Small Blessing: one item is half price today!</p>
      {/if}
      {#if !status.open}
        <div class="km-empty closed">
          <span class="sign km-title">CLOSED</span>
          <p>{hoursText}</p>
        </div>
      {:else if !stock.length}
        <div class="km-empty"><PixelGlyph name="box" scale={4} /><p>Nothing on the shelves right now.</p></div>
      {:else}
        <ul class="list px-scroll" role="listbox" aria-label="{tab} items">
          {#each list as it, i (it.id)}
            <li role="none">
              <button
                bind:this={rows[i]}
                class="row"
                class:sel={item?.id === it.id}
                data-row="1"
                role="option"
                aria-selected={item?.id === it.id}
                onclick={() => select(it.id)}
              >
                <span class="cursor" aria-hidden="true"><PixelGlyph name="cursor" scale={2} /></span>
                <ItemIcon id={it.icon} size={32} />
                <span class="nm">{it.name}</span>
                {#if (game.save.inventory[it.id] ?? 0) > 0}<span class="have">×{game.save.inventory[it.id]}</span>{/if}
                <span class="price" class:free={it.price === 0}>
                  {#if it.price === 0}FREE{:else}<PixelGlyph name="acorn" scale={2} />{it.price}{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="km-window details" aria-label="Item details">
      {#if item}
        <div class="dhead">
          <span class="bigicon"><ItemIcon id={item.icon} size={64} /></span>
          <div class="dnames">
            <h2 class="km-title dname">{item.name}</h2>
            <p class="dprice">
              {#if item.price === 0}FREE{:else}<PixelGlyph name="acorn" scale={2} /> {item.price} acorns{/if}
              <span class="owned">· in bag: {owned}</span>
            </p>
          </div>
        </div>
        <p class="desc">{item.desc}</p>
        {#if effectSummary(item).length}
          <p class="effects">{effectSummary(item).join('  ')}</p>
        {/if}
        {#if showTastes}<TasteRow {item} />{/if}
        <div class="buyrow">
          <div class="qty" role="group" aria-label="Quantity">
            <button class="px-btn small" onclick={() => changeQty(-1)} disabled={qty <= 1} aria-label="One less">−</button>
            <output class="n" aria-live="polite">{qty}</output>
            <button class="px-btn small" onclick={() => changeQty(1)} disabled={qty >= maxQty} aria-label="One more">+</button>
          </div>
          <button class="px-btn orange buy" onclick={buy} aria-disabled={!affordable}>
            BUY {#if total > 0}· <PixelGlyph name="acorn" scale={2} />{total}{/if}
          </button>
          {#if pop}
            {#key pop.key}<span class="pop" class:still={motion.reduced} aria-hidden="true">{pop.text}</span>{/key}
          {/if}
        </div>
      {:else}
        <div class="km-empty"><p>{!status.open ? 'See you during opening hours!' : stock.length ? 'Pick something from the shelf.' : 'Restocking — check back soon.'}</p></div>
      {/if}
    </section>
  </div>
</MetaFrame>

<style>
  .shop {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.15fr) minmax(260px, 1fr);
    gap: 14px;
  }
  .counter { overflow: hidden; display: grid; grid-template-rows: minmax(0, 1fr) auto; }
  .scene { position: relative; overflow: hidden; min-height: 0; }
  .scene :global(.km-cover) { filter: brightness(0.8); }
  .clerk {
    position: absolute;
    left: 50%;
    bottom: 12%;
    height: 92%;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-end;
  }
  .desk {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 22%;
    background:
      linear-gradient(180deg, #c98a4b 0 calc(var(--px) * 2), #8a5a3a calc(var(--px) * 2) calc(var(--px) * 3), #a8703f calc(var(--px) * 3) 100%);
    border-top: var(--px) solid var(--ink);
    box-shadow: inset 0 calc(var(--px) * -2) 0 rgba(0, 0, 0, 0.25);
  }
  .place {
    position: absolute;
    left: 8px;
    top: 6px;
    font-size: 12px;
    padding: 1px 6px;
    color: var(--paper);
    background: rgba(27, 18, 41, 0.7);
  }
  .speech {
    position: relative;
    margin: 18px 8px 8px;
    padding: 16px 12px 10px;
    min-height: 92px;
  }
  .plate { position: absolute; left: 10px; top: 0; transform: translateY(-60%); font-size: 14px; }
  .role { position: absolute; right: 10px; top: 4px; font-size: 11px; opacity: 0.7; }
  .said { margin: 4px 0 0; font-size: 15px; line-height: 1.45; }
  .ghost { visibility: hidden; }

  .catalog { min-height: 0; display: flex; flex-direction: column; gap: 8px; }
  .coupon {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 4px 10px;
    font-size: 14px;
    color: var(--ink);
    background: var(--gold);
    border: var(--px) solid var(--ink);
  }
  .closed .sign {
    padding: 6px 18px;
    font-size: 28px;
    color: var(--paper);
    background: var(--bad);
    border: calc(var(--px) * 2) solid var(--paper);
    outline: var(--px) solid var(--ink);
    transform: rotate(-4deg);
  }
  .list { list-style: none; margin: 0; padding: 0 4px 0 0; flex: 1; min-height: 0; display: grid; align-content: start; gap: 4px; }
  .row {
    display: grid;
    grid-template-columns: 14px 32px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 4px 10px 4px 6px;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.05);
    border: var(--px) solid transparent;
    text-align: left;
    font-size: 16px;
    cursor: pointer;
  }
  .row:hover { background: rgba(255, 255, 255, 0.1); }
  .row.sel { color: var(--ink); background: var(--sakura-1); border-color: var(--ink); }
  .row:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: -2px; }
  .cursor { visibility: hidden; display: inline-flex; color: var(--sakura-4); }
  .row.sel .cursor { visibility: visible; }
  .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .have { font-size: 12px; opacity: 0.75; }
  .price { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-display); font-size: 17px; }
  .price.free { color: var(--ok); }
  .row.sel .price.free { color: #1f7a2e; }

  .details { padding: 14px; gap: 10px; overflow: auto; }
  .dhead { display: flex; gap: 12px; align-items: center; }
  .bigicon {
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    flex: none;
    background: rgba(255, 255, 255, 0.08);
    border: var(--px) solid var(--sakura-3);
  }
  .dname { margin: 0; font-size: 22px; color: var(--sakura-1); }
  .dprice { margin: 4px 0 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 15px; color: var(--gold); }
  .owned { color: rgba(255, 246, 234, 0.7); font-size: 13px; }
  .desc { margin: 0; font-size: 15px; line-height: 1.5; }
  .effects { margin: 0; font-family: var(--font-display); font-size: 14px; color: var(--ok); letter-spacing: 0.04em; }
  .buyrow { position: relative; display: flex; align-items: center; gap: 10px; margin-top: auto; flex-wrap: wrap; }
  .qty { display: inline-flex; align-items: center; gap: 6px; }
  .qty .px-btn { min-width: 44px; min-height: 44px; font-size: 20px; }
  .n { min-width: 2.2em; text-align: center; font-family: var(--font-display); font-size: 22px; }
  .buy { flex: 1; min-height: 48px; font-family: var(--font-display); font-size: 19px; }
  .buy[aria-disabled='true'] { filter: grayscale(0.6) brightness(0.85); }
  .pop {
    position: absolute;
    right: 12px;
    top: -6px;
    font-family: var(--font-display);
    font-size: 20px;
    color: var(--gold);
    text-shadow: 2px 2px 0 var(--ink);
    animation: popup 700ms steps(7) forwards;
    pointer-events: none;
  }
  .pop.still { animation: fadeout 900ms linear forwards; }
  @keyframes popup { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-24px); opacity: 0; } }
  @keyframes fadeout { 0%, 60% { opacity: 1; } to { opacity: 0; } }

  /* T: phone portrait */
  @media (max-aspect-ratio: 5/4) {
    .shop {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 8px;
    }
    .counter { grid-template-rows: auto; grid-template-columns: 88px minmax(0, 1fr); }
    .scene { height: 100%; min-height: 96px; }
    .clerk { height: 150%; bottom: -55%; }
    .desk, .place { display: none; }
    .speech { margin: 12px 6px 6px; min-height: 72px; padding: 14px 10px 8px; }
    .said { font-size: 14px; }
    .details { padding: 10px; gap: 6px; max-height: 46vh; }
    .bigicon { width: 52px; height: 52px; }
    .dname { font-size: 18px; }
    .desc { font-size: 14px; }
  }
  /* S: phone landscape — cashier as a strip on top, list | details below */
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .shop {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      gap: 8px;
    }
    .counter { grid-column: 1 / -1; grid-template-rows: auto; grid-template-columns: 72px minmax(0, 1fr); }
    .scene { min-height: 60px; }
    .clerk { height: 170%; bottom: -75%; }
    .desk, .place { display: none; }
    .speech { margin: 10px 6px 4px; min-height: 0; padding: 12px 10px 6px; }
    .role { display: none; }
    .said { font-size: 14px; }
    .details { padding: 10px; gap: 6px; }
    .bigicon { width: 52px; height: 52px; }
    .dname { font-size: 18px; }
  }
</style>
