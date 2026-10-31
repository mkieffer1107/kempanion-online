<script lang="ts">
  // VN profile card (Kempa AI dossier). `dossier` = the public pairing card; `full` = Profiles screen,
  // where likes / dislikes / the secret-favorite hint unlock with hearts (♥1 / ♥2 / ♥5).
  import { untrack } from 'svelte';
  import './meta.css';
  import type { PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { EPITHET, SECRET_FAVORITE } from './content';
  import { secretFound } from './save-utils';
  import PixelGlyph from './PixelGlyph.svelte';
  import { Typewriter } from './typewriter.svelte';

  let {
    pig,
    variant = 'dossier',
    hearts = 0,
    typeQuote = true,
  }: { pig: PigId; variant?: 'dossier' | 'full'; hearts?: number; typeQuote?: boolean } = $props();

  const c = $derived(CHARACTERS[pig]);
  const full = $derived(variant === 'full');
  const tw = new Typewriter();

  $effect(() => {
    const quote = CHARACTERS[pig].quote;
    const voice = pig;
    if (!typeQuote) return;
    untrack(() => tw.start(quote, voice));
    return () => tw.stop();
  });

  const likes = $derived(full ? (hearts >= 1 ? c.likes : c.likes.slice(0, 2)) : c.likes.slice(0, 3));
  const moreLikes = $derived(full && hearts < 1 ? c.likes.length - likes.length : 0);
  const dislikes = $derived(full ? (hearts >= 2 ? c.dislikes : c.dislikes.slice(0, 1)) : c.dislikes.slice(0, 3));
  const moreDislikes = $derived(full && hearts < 2 ? c.dislikes.length - dislikes.length : 0);
  const secret = $derived(SECRET_FAVORITE[pig]);
  const found = $derived(secretFound(game.save, pig));
  const quoteText = $derived(typeQuote ? tw.visible : c.quote);

  // On phones the facts get a few rows and scroll: show "▼ more" over a fade while rows are hidden below.
  let factsEl = $state<HTMLElement>();
  let more = $state(false);
  let bar = $state(0);
  $effect(() => {
    const el = factsEl;
    if (!el) return;
    const measure = () => {
      more = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
      bar = el.offsetWidth - el.clientWidth; // keep the cue off a desktop scrollbar
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    for (const row of el.children) ro?.observe(row); // web fonts and unlocked likes resize rows
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener('scroll', measure);
    };
  });
</script>

<article class="km-window paper card" style:--pig={c.color} aria-label="{c.name} profile">
  <header class="head">
    <div class="names">
      <h2 class="km-title name">{c.name}</h2>
      <span class="km-jp kana" aria-hidden="true">{c.kana}</span>
    </div>
    <p class="epithet">“{EPITHET[pig]}”</p>
    <p class="role">{c.role}</p>
  </header>

  <div class="factwrap">
    <dl class="facts px-scroll" bind:this={factsEl}>
      <div class="row"><dt>BIRTHDAY<span class="km-jp jp" aria-hidden="true">誕生日</span></dt><dd>{c.birthday}</dd></div>
      <div class="row"><dt>BLOOD<span class="km-jp jp" aria-hidden="true">血液型</span></dt><dd>{c.bloodType}</dd></div>
      <div class="row"><dt>HEIGHT<span class="km-jp jp" aria-hidden="true">身長</span></dt><dd>{c.height}</dd></div>
      <div class="row"><dt>YEAR<span class="km-jp jp" aria-hidden="true">学年</span></dt><dd>{c.year}</dd></div>
      <div class="row">
        <dt>LIKES<span class="km-jp jp" aria-hidden="true">好き</span></dt>
        <dd>
          {likes.join(' · ')}
          {#if moreLikes > 0}<span class="locked"><PixelGlyph name="lock" scale={1} /> +{moreLikes} more at ♥1</span>{/if}
        </dd>
      </div>
      <div class="row">
        <dt>DISLIKES<span class="km-jp jp" aria-hidden="true">苦手</span></dt>
        <dd>
          {dislikes.join(' · ')}
          {#if moreDislikes > 0}<span class="locked"><PixelGlyph name="lock" scale={1} /> +{moreDislikes} more at ♥2</span>{/if}
        </dd>
      </div>
      <div class="row"><dt>SPOT<span class="km-jp jp" aria-hidden="true">場所</span></dt><dd>{c.homeText}</dd></div>
      {#if full}
        <div class="row secret">
          <dt>SECRET<span class="km-jp jp" aria-hidden="true">ひみつ</span></dt>
          <dd>
            {#if found}
              <PixelGlyph name="star" scale={1} color="var(--sakura-4)" /> Secret favorite: <strong>{secret.name}</strong>
            {:else if hearts >= 5}
              {secret.hint}
            {:else}
              <span class="locked"><PixelGlyph name="lock" scale={1} /> A secret favorite food… reach ♥5 for a hint.</span>
            {/if}
          </dd>
        </div>
      {/if}
    </dl>
    {#if more}<span class="more" style:right="{bar}px" aria-hidden="true">▼ more</span>{/if}
  </div>

  <blockquote class="quote" aria-label="Quote: {c.quote}">
    <span aria-hidden="true">「{quoteText}<span class="ghost">{c.quote.slice(quoteText.length)}</span>」</span>
  </blockquote>
</article>

<style>
  .card {
    height: 100%;
    padding: 14px 16px 12px 22px;
    gap: 8px;
    overflow: hidden;
  }
  .card::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: calc(var(--px) * 3);
    background: var(--pig);
  }
  .head { flex: none; }
  .names {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .name {
    margin: 0;
    font-size: 28px;
    line-height: 1;
    color: var(--ink);
    text-shadow: 2px 2px 0 var(--pig);
  }
  .kana { font-size: 14px; color: #6b5a7a; }
  .epithet {
    margin: 4px 0 0;
    font-size: 15px;
    color: #7d4e9c;
  }
  .role {
    margin: 2px 0 0;
    font-size: 13px;
    color: #5b4a66;
  }
  .factwrap {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* the cue never spills over the header when the card is squeezed */
  }
  .facts {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding-right: 4px;
    border-top: var(--px) dotted rgba(27, 18, 41, 0.35);
  }
  /* scroll cue: a dithered fade into the paper and "▼ more" while rows are hidden below. A third of the facts area
     at most (18 px on the smallest phones, 30 px when there's room), with a solid band just under the label. */
  .more {
    position: absolute;
    left: 0;
    bottom: 0;
    height: clamp(18px, 30%, 30px);
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 0 6px 1px;
    font-family: var(--font-display);
    font-size: 12px;
    line-height: 1.1;
    letter-spacing: 0.06em;
    color: #7d4e9c;
    background:
      linear-gradient(var(--paper), var(--paper)) 0 100% / 100% 15px no-repeat,
      repeating-conic-gradient(var(--paper) 0 25%, transparent 0 50%) 0 0 / calc(var(--px) * 2) calc(var(--px) * 2);
    pointer-events: none;
  }
  .row {
    display: grid;
    grid-template-columns: 7.4em 1fr;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(27, 18, 41, 0.1);
    font-size: 15px;
    line-height: 1.4;
  }
  dt {
    display: flex;
    flex-direction: column;
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 0.06em;
    color: #7d4e9c;
  }
  .jp { font-size: 11px; color: #9a87a8; }
  dd { margin: 0; color: var(--ink); }
  .locked {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 4px;
    font-size: 13px;
    color: #8a7898;
  }
  .secret dd { color: #7a2850; }
  .quote {
    flex: none;
    margin: 0;
    padding: 8px 10px;
    font-size: 17px;
    line-height: 1.45;
    color: var(--ink);
    background: color-mix(in srgb, var(--pig) 28%, var(--paper));
    border: var(--px) solid var(--ink);
  }
  .ghost { visibility: hidden; }

  /* short phones (portrait or landscape): no role line, one-line rows (no Japanese sub-labels), so whole facts fit */
  @media (max-aspect-ratio: 5/4) and (max-height: 700px), (max-height: 499px) {
    .role, .jp { display: none; }
  }
  @media (max-aspect-ratio: 5/4), (max-height: 499px) {
    .card { padding: 10px 12px 10px 18px; }
    .name { font-size: 24px; }
    .row { grid-template-columns: 6.6em 1fr; font-size: 14px; padding: 4px 0; }
    .quote { font-size: 15px; }
  }
</style>
