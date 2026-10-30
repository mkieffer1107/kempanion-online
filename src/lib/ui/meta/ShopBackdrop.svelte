<script lang="ts">
  // Procedural pixel shop interior (wall, shelves of goods, a sign) used until a painted background exists.
  import type { ShopLocation } from './content';
  import { hashString } from './save-utils';

  let { kind }: { kind: ShopLocation } = $props();

  const W = 160;
  const H = 120;
  const THEMES: Record<ShopLocation, { wall: string; wall2: string; trim: string; shelf: string; goods: string[]; sign: string; glow?: string }> = {
    reitz: {
      wall: '#f3e3cf', wall2: '#ead2b8', trim: '#d6608a', shelf: '#8a5a3a',
      goods: ['#f48fb1', '#ffd25a', '#5bd16b', '#4a90e2', '#ff8a5f', '#b07ce8', '#fff6ea'], sign: '#d6608a',
    },
    midtown: {
      wall: '#2a1d4a', wall2: '#22173d', trim: '#ff5aa8', shelf: '#4a2f2a',
      goods: ['#ff5aa8', '#5af0ff', '#ffd25a', '#9b7bff', '#ff8a5f', '#7fd6c2'], sign: '#ff5aa8', glow: 'rgba(255, 90, 168, 0.35)',
    },
    shands: {
      wall: '#e8f2f6', wall2: '#d6e6ee', trim: '#4a90e2', shelf: '#9aa8b4',
      goods: ['#ffffff', '#4a90e2', '#5bd16b', '#ff5a5f', '#ffd25a', '#b8d8ea'], sign: '#5bd16b',
    },
  };

  let canvas = $state<HTMLCanvasElement>();

  function rng(seed: number) {
    let s = seed || 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 10000) / 10000;
    };
  }

  $effect(() => {
    const cv = canvas;
    const t = THEMES[kind];
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const r = rng(hashString(kind));
    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    rect(0, 0, W, H, t.wall);
    for (let x = 0; x < W; x += 8) rect(x, 0, 4, H, t.wall2);
    rect(0, 14, W, 2, t.trim);
    // sign
    rect(W / 2 - 22, 2, 44, 10, t.sign);
    rect(W / 2 - 21, 3, 42, 1, 'rgba(255,255,255,0.45)');
    if (kind === 'shands') {
      rect(W / 2 - 2, 4, 4, 7, '#ffffff');
      rect(W / 2 - 5, 6, 10, 3, '#ffffff');
    } else {
      for (let i = 0; i < 5; i++) rect(W / 2 - 16 + i * 7, 6, 4, 3, i % 2 ? '#ffffff' : '#ffe3ea');
    }
    if (t.glow) {
      ctx.fillStyle = t.glow;
      ctx.fillRect(W / 2 - 28, 0, 56, 16);
    }
    // shelves with goods
    for (const y of [36, 60, 84]) {
      let x = 4;
      while (x < W - 8) {
        const w = 4 + Math.floor(r() * 6);
        const h = 5 + Math.floor(r() * 9);
        const c = t.goods[Math.floor(r() * t.goods.length)];
        rect(x, y - h, w, h, c);
        rect(x, y - h, w, 1, 'rgba(255,255,255,0.35)');
        rect(x + w - 1, y - h, 1, h, 'rgba(0,0,0,0.15)');
        x += w + 1 + Math.floor(r() * 3);
      }
      rect(0, y, W, 3, t.shelf);
      rect(0, y + 3, W, 1, 'rgba(0,0,0,0.25)');
    }
  });
</script>

<canvas bind:this={canvas} class="backdrop" width={W} height={H} aria-hidden="true"></canvas>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
  }
</style>
