<script lang="ts">
  // Extras: Album (CGs + seen scenes with replay), Music Room (heard songs play/stop), Achievements, Faces viewer.
  // params: { back?: ScreenId, tab?: 'album' | 'music' | 'trophies' | 'faces' } (no back → store history)
  import '../meta/meta.css';
  import { ALT_OUTFIT, PIG_IDS, type Expression, type OutfitId, type PigId, type SongId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { ICONS } from '../../content/icons';
  import { game } from '../../state/game.svelte';
  import { ACHIEVEMENTS } from '../../pet';
  import { allScenes, getScene, type SceneInfo } from '../../vn';
  import type { Song } from '../../audio/mml';
  import Icon from '../components/Icon.svelte';
  import { CG_IDS, cgUrl, expressionsFor, hasOutfit } from '../meta/assets';
  import { HEARD_PREFIX } from '../meta/heard';
  import MetaFrame from '../meta/MetaFrame.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import PortraitImg from '../meta/PortraitImg.svelte';
  import Tabs from '../meta/Tabs.svelte';
  import { outfitUnlocked } from '../meta/save-utils';
  import { goBack } from '../meta/nav';
  import { playSong, stopSong, ui } from '../meta/sfx';

  type TabId = 'album' | 'music' | 'trophies' | 'faces';
  const params = game.params;
  const startTab = (): TabId => (['album', 'music', 'trophies', 'faces'].includes(params.tab as string) ? (params.tab as TabId) : 'album');
  let tab = $state<TabId>(startTab());

  // ── album ──
  type Group = PigId | 'trio' | 'ending' | 'other';
  interface SceneCard { id: string; title: string; summary?: string; group: Group; order: number; seen: boolean }
  const GROUP_LABEL: Record<Group, string> = {
    'piggy-1': CHARACTERS['piggy-1'].name, 'piggy-2': CHARACTERS['piggy-2'].name, 'piggy-3': CHARACTERS['piggy-3'].name,
    trio: 'All three', ending: 'Endings', other: 'Everyone',
  };
  const groupOf = (s: SceneInfo): Group => (s.ending ? 'ending' : s.trio ? 'trio' : s.pig ?? 'other');
  const scenes: SceneCard[] = (() => {
    let known: SceneInfo[] = [];
    try { known = allScenes(); } catch { known = []; }
    const seen = new Set(game.save.seenScenes);
    const internal = (s: SceneInfo) => s.id.startsWith('_') || /(^|\/)_[^/]*$/.test(s.file ?? '');
    const cards: SceneCard[] = known
      .filter((s) => s.replayable !== false && !internal(s))
      .map((s, i) => ({ id: s.id, title: s.title || s.id, summary: s.summary, group: groupOf(s), order: s.heart ?? 100 + i, seen: seen.has(s.id) }));
    for (const id of seen) {
      if (cards.some((c) => c.id === id) || known.some((k) => k.id === id)) continue;
      const info = getScene(id);
      if (info && (info.replayable === false || internal(info))) continue;
      cards.push({ id, title: info?.title ?? id.replace(/_/g, ' '), group: info ? groupOf(info) : 'other', order: 999, seen: true });
    }
    return cards;
  })();
  const GROUPS: Group[] = ['piggy-1', 'piggy-2', 'piggy-3', 'trio', 'ending', 'other'];
  const sceneGroups = GROUPS
    .map((g) => ({ g, cards: scenes.filter((c) => c.group === g).sort((a, b) => a.order - b.order) }))
    .filter((x) => x.cards.length);
  const cgs = CG_IDS.map((id) => ({ id, unlocked: game.save.album.includes(id) }));
  const albumCount = `${cgs.filter((c) => c.unlocked).length + scenes.filter((s) => s.seen).length}/${cgs.length + scenes.length}`;
  let viewing = $state<string | null>(null);

  function replay(id: string) {
    ui.select();
    game.go('scene', { id, back: 'extras', backParams: { tab: 'album', back: params.back }, replay: true });
  }

  // ── music room ──
  const ORDER: SongId[] = [
    'kempa_logo', 'title', 'prologue', 'morning', 'campus_day', 'campus_evening', 'night', 'dorm', 'plaza',
    'piggy1_theme', 'piggy2_theme', 'piggy3_theme', 'malachowsky', 'physics', 'lab', 'hospital', 'library',
    'lake_alice', 'stadium', 'midtown', 'shop', 'map', 'mini_volley', 'mini_perfusion', 'mini_debug',
    'happy', 'sad', 'comedy', 'romance', 'tension', 'sleep', 'credits',
  ];
  // The song registry is lazy-loaded (the audio engine code-splits it), so load it on demand too.
  let songs = $state<Song[]>([]);
  let songsLoaded = $state(false);
  $effect(() => {
    if (tab !== 'music' || songsLoaded) return;
    import('../../audio/songs')
      .then(({ SONGS }) => {
        songs = Object.values(SONGS)
          .filter((s) => s.loop !== false || s.id === 'kempa_logo')
          .sort((a, b) => {
            const ia = ORDER.indexOf(a.id as SongId);
            const ib = ORDER.indexOf(b.id as SongId);
            return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.title.localeCompare(b.title);
          });
      })
      .catch(() => {})
      .finally(() => (songsLoaded = true));
  });
  const heard = (id: string) => (game.save.counters[HEARD_PREFIX + id] ?? 0) > 0;
  let playing = $state<string | null>(null);
  const heardCount = $derived(`${songs.filter((s) => heard(s.id)).length}/${songs.length}`);

  function toggleSong(id: string) {
    if (!heard(id)) {
      ui.error();
      return;
    }
    if (playing === id) {
      stopSong(400);
      playing = null;
      ui.back();
    } else {
      playSong(id as SongId, { restart: true, fadeMs: 300 });
      playing = id;
      ui.select();
    }
  }

  // ── achievements ──
  const unlockedAch = $derived(new Set(game.save.achievements));
  const achCount = $derived(`${ACHIEVEMENTS.filter((a) => unlockedAch.has(a.id)).length}/${ACHIEVEMENTS.length}`);

  // ── faces ──
  let facePig = $state<PigId>(game.save.companion ?? 'piggy-1');
  let faceOutfit = $state<OutfitId>('everyday');
  let faceExpr = $state<Expression>('neutral');
  const altOutfit = $derived(ALT_OUTFIT[facePig]);
  const altOpen = $derived(hasOutfit(facePig, altOutfit) && outfitUnlocked(game.save, facePig, altOutfit));
  const faces = $derived(expressionsFor(facePig, faceOutfit));

  function pickFacePig(p: PigId) {
    if (p === facePig) return;
    facePig = p;
    faceOutfit = 'everyday';
    faceExpr = 'neutral';
    ui.move();
  }
  function pickOutfit(o: OutfitId) {
    if (o === faceOutfit) return;
    if (o !== 'everyday' && !altOpen) {
      ui.error();
      return;
    }
    faceOutfit = o;
    if (!expressionsFor(facePig, o).includes(faceExpr)) faceExpr = 'neutral';
    ui.move();
  }

  const tabs = $derived([
    { id: 'album' as TabId, label: 'ALBUM', jp: 'アルバム', count: albumCount },
    { id: 'music' as TabId, label: 'MUSIC', jp: 'ミュージック', count: songsLoaded ? heardCount : undefined },
    { id: 'trophies' as TabId, label: 'TROPHIES', jp: 'じっせき', count: achCount },
    { id: 'faces' as TabId, label: 'FACES', jp: 'ひょうじょう' },
  ]);

  function leave() {
    if (playing) stopSong(300);
    goBack('title');
  }

  function onkeydown(e: KeyboardEvent) {
    if (viewing && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      viewing = null;
      ui.close();
    }
  }
</script>

<svelte:window onkeydowncapture={onkeydown} />

<MetaFrame title="EXTRAS" jp="おまけ" onBack={leave} keys={!viewing}>
  <Tabs {tabs} bind:value={tab} label="Extras sections" />

  <div class="panel px-scroll">
    {#if tab === 'album'}
      {#if cgs.length}
        <h2 class="km-title sect">MEMORIES</h2>
        <div class="cards">
          {#each cgs as cg (cg.id)}
            {#if cg.unlocked}
              <button class="polaroid" onclick={() => { viewing = cg.id; ui.open(); }} aria-label="View picture {cg.id.replace(/_/g, ' ')}">
                <img src={cgUrl(cg.id)} alt="" loading="lazy" />
              </button>
            {:else}
              <div class="polaroid locked" aria-label="Locked memory"><span>？？？</span></div>
            {/if}
          {/each}
        </div>
      {/if}
      <h2 class="km-title sect">SCENES</h2>
      {#if sceneGroups.length === 0}
        <div class="km-empty"><PixelGlyph name="camera" scale={4} /><p>No scenes yet. Go make some memories!</p></div>
      {:else}
        {#each sceneGroups as grp (grp.g)}
          <h3 class="grp" style:--pig={grp.g === 'piggy-1' || grp.g === 'piggy-2' || grp.g === 'piggy-3' ? CHARACTERS[grp.g].color : 'var(--sakura-2)'}>
            {GROUP_LABEL[grp.g]}
          </h3>
          <ul class="scenes">
            {#each grp.cards as sc (sc.id)}
              <li>
                {#if sc.seen}
                  <button class="scene" onclick={() => replay(sc.id)} title={sc.summary}>
                    <PixelGlyph name="play" scale={2} /> <span>{sc.title}</span>
                  </button>
                {:else}
                  <span class="scene locked"><PixelGlyph name="lock" scale={2} /> <span>？？？</span></span>
                {/if}
              </li>
            {/each}
          </ul>
        {/each}
      {/if}
    {:else if tab === 'music'}
      {#if !songsLoaded}
        <div class="km-empty"><PixelGlyph name="note" scale={4} /><p>Loading the jukebox…</p></div>
      {:else if songs.length === 0}
        <div class="km-empty"><PixelGlyph name="note" scale={4} /><p>The Kempa Synth is still tuning up.</p></div>
      {:else}
        <ol class="songs">
          {#each songs as s, i (s.id)}
            {@const ok = heard(s.id)}
            <li>
              <button class="song" class:on={playing === s.id} class:locked={!ok} onclick={() => toggleSong(s.id)} aria-pressed={playing === s.id} aria-label={ok ? `${playing === s.id ? 'Stop' : 'Play'} ${s.title}` : `${s.title} (locked: not heard yet)`}>
                <span class="no">{String(i + 1).padStart(2, '0')}</span>
                <PixelGlyph name={!ok ? 'lock' : playing === s.id ? 'stop' : 'play'} scale={2} />
                <span class="stitle">{s.title}</span>
                {#if !ok}<span class="lockedtag">not heard yet</span>{/if}
                {#if playing === s.id}<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>{/if}
              </button>
            </li>
          {/each}
        </ol>
        <p class="tip">A song unlocks for replay once you've heard it in the game.</p>
      {/if}
    {:else if tab === 'trophies'}
      {#if ACHIEVEMENTS.length === 0}
        <div class="km-empty"><PixelGlyph name="star" scale={4} /><p>No achievements registered yet.</p></div>
      {:else}
        <ul class="ach">
          {#each ACHIEVEMENTS as a (a.id)}
            {@const got = unlockedAch.has(a.id)}
            <li class:got>
              <span class="aicon">
                {#if got && ICONS[a.icon]}<Icon id={a.icon} size={32} />{:else}<PixelGlyph name={got ? 'star' : 'lock'} scale={3} color={got ? 'var(--gold)' : undefined} />{/if}
              </span>
              <span class="atext">
                <span class="km-title atitle">{a.title}</span>
                <span class="adesc">{a.desc}</span>
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <div class="faces">
        <div class="preview km-window">
          <div class="big">
            {#key `${facePig}/${faceOutfit}`}<PortraitImg pig={facePig} outfit={faceOutfit} expression={faceExpr} />{/key}
          </div>
          <p class="ename km-title">{faceExpr.replace(/_/g, ' ')}</p>
        </div>
        <div class="pickers">
          <div class="seg" role="group" aria-label="Pig">
            {#each PIG_IDS as p (p)}
              <button class="segbtn" class:on={facePig === p} style:--pig={CHARACTERS[p].color} aria-pressed={facePig === p} onclick={() => pickFacePig(p)}>{CHARACTERS[p].name}</button>
            {/each}
          </div>
          <div class="seg" role="group" aria-label="Outfit">
            <button class="segbtn" class:on={faceOutfit === 'everyday'} aria-pressed={faceOutfit === 'everyday'} onclick={() => pickOutfit('everyday')}>EVERYDAY</button>
            <button class="segbtn" class:on={faceOutfit === altOutfit} aria-pressed={faceOutfit === altOutfit} disabled={!altOpen} onclick={() => pickOutfit(altOutfit)}>
              {#if !altOpen}<PixelGlyph name="lock" scale={1} />{/if} {altOutfit.toUpperCase()}
            </button>
          </div>
          <div class="facegrid">
            {#each faces as ex (ex)}
              <button class="face" class:on={faceExpr === ex} aria-pressed={faceExpr === ex} aria-label={ex.replace(/_/g, ' ')} onclick={() => { faceExpr = ex; ui.move(); }}>
                <PortraitImg pig={facePig} outfit={faceOutfit} expression={ex} alt="" pop={false} />
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</MetaFrame>

{#if viewing}
  <div class="km-scrim viewer" role="dialog" aria-modal="true" aria-label="Memory">
    <button class="cgbtn" onclick={() => { viewing = null; ui.close(); }} aria-label="Close picture">
      <img src={cgUrl(viewing)} alt="" />
    </button>
  </div>
{/if}

<style>
  .panel { flex: 1; min-height: 0; padding-right: 4px; display: grid; align-content: start; gap: 10px; }
  .sect { margin: 4px 0 0; font-size: 18px; color: var(--sakura-1); letter-spacing: 0.08em; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .polaroid {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 9;
    padding: 6px 6px 18px;
    background: var(--paper);
    border: var(--px) solid var(--ink);
    cursor: pointer;
  }
  .polaroid img { width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
  .polaroid.locked { cursor: default; background: #5b3a6e; color: rgba(255, 255, 255, 0.6); font-size: 18px; }
  .grp {
    margin: 6px 0 0;
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--paper);
    border-left: calc(var(--px) * 2) solid var(--pig);
    padding-left: 8px;
  }
  .scenes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; }
  .scene {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 4px 10px;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.06);
    border: var(--px) solid rgba(255, 214, 224, 0.35);
    text-align: left;
    font-size: 15px;
    cursor: pointer;
  }
  .scene:hover { background: var(--sakura-1); color: var(--ink); }
  .scene.locked { cursor: default; opacity: 0.55; }
  .scene.locked:hover { background: rgba(255, 255, 255, 0.06); color: var(--paper); }

  .songs { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .song {
    display: grid;
    grid-template-columns: 2.2em 18px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 46px;
    padding: 4px 12px;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.05);
    border: var(--px) solid transparent;
    text-align: left;
    font-size: 16px;
    cursor: pointer;
  }
  .song:hover:not(.locked) { background: rgba(255, 255, 255, 0.12); }
  .song.on { color: var(--ink); background: var(--sakura-1); border-color: var(--ink); }
  .song.locked { opacity: 0.5; cursor: not-allowed; }
  .no { font-family: var(--font-display); opacity: 0.7; }
  .stitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lockedtag { font-size: 11px; opacity: 0.8; white-space: nowrap; }
  .eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; }
  .eq i { width: 4px; background: var(--sakura-4); animation: eq 0.6s steps(3) infinite; }
  .eq i:nth-child(2) { animation-delay: 0.2s; }
  .eq i:nth-child(3) { animation-delay: 0.4s; }
  @keyframes eq { 0% { height: 4px; } 50% { height: 14px; } 100% { height: 8px; } }
  :global(.km-reduced) .eq i { animation: none; height: 10px; }
  .tip { margin: 0; font-size: 12px; opacity: 0.65; }

  .ach { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
  .ach li {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.04);
    border: var(--px) solid rgba(255, 214, 224, 0.25);
    opacity: 0.6;
  }
  .ach li.got { opacity: 1; border-color: var(--gold); background: rgba(255, 210, 90, 0.1); }
  .aicon { width: 36px; height: 36px; display: grid; place-items: center; flex: none; }
  .atext { display: grid; gap: 2px; min-width: 0; }
  .atitle { font-size: 16px; color: var(--sakura-1); }
  .got .atitle { color: var(--gold); }
  .adesc { font-size: 13px; opacity: 0.85; }

  .faces { display: grid; grid-template-columns: minmax(200px, 0.8fr) minmax(0, 1.6fr); gap: 14px; min-height: 0; }
  .preview { padding: 10px; align-items: center; gap: 6px; }
  .big { height: min(52vh, 420px); display: flex; align-items: flex-end; justify-content: center; }
  .ename { margin: 0; font-size: 18px; color: var(--sakura-1); text-transform: capitalize; }
  .pickers { display: grid; gap: 8px; align-content: start; min-width: 0; }
  .seg { display: flex; flex-wrap: wrap; gap: 6px; }
  .segbtn {
    min-height: 44px;
    padding: 4px 12px;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.06);
    border: var(--px) solid rgba(255, 214, 224, 0.4);
    border-bottom: calc(var(--px) * 2) solid var(--pig, var(--sakura-3));
    font-family: var(--font-display);
    font-size: 15px;
    cursor: pointer;
  }
  .segbtn.on { color: var(--ink); background: var(--sakura-1); border-color: var(--ink); }
  .segbtn:disabled { opacity: 0.45; cursor: not-allowed; }
  .facegrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
  .face {
    height: 96px;
    padding: 2px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.06);
    border: var(--px) solid transparent;
    cursor: pointer;
  }
  .face.on { background: var(--sakura-1); border-color: var(--ink); }

  .viewer { position: fixed; z-index: 60; }
  .cgbtn { padding: 0; border: calc(var(--px) * 2) solid var(--paper); background: #000; cursor: zoom-out; max-width: 100%; }
  .cgbtn img { display: block; width: min(1440px, 92vw); max-height: 86vh; object-fit: contain; image-rendering: pixelated; }

  @media (max-aspect-ratio: 5/4) {
    .faces { grid-template-columns: 1fr; }
    .big { height: 200px; }
    .facegrid { grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); }
    .face { height: 80px; }
  }
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .big { height: 200px; }
  }
</style>
