<script lang="ts">
  // "+20 FUN" pop that rises 12 stage px over 600 ms (stepped). Position in % of the stage box.
  let { text, x = 50, y = 40, color = 'var(--gold)', delay = 0 }: { text: string; x?: number; y?: number; color?: string; delay?: number } = $props();
</script>

<span class="pop" style:left="{x}%" style:top="{y}%" style:color={color} style:animation-delay="{delay}ms" aria-hidden="true">{text}</span>

<style>
  .pop {
    position: absolute;
    z-index: 4;
    transform: translate(-50%, 0);
    /* DotGothic16, not the display font: in bold Pixelify Sans "+5" read as "+S" and 3 as 8 */
    font-family: var(--font-body);
    font-weight: 400;
    font-size: max(14px, calc(9 * var(--u, 2px)));
    white-space: nowrap;
    pointer-events: none;
    text-shadow: 1px 1px 0 var(--ink), -1px 1px 0 var(--ink), 1px -1px 0 var(--ink), -1px -1px 0 var(--ink), 2px 2px 0 var(--ink);
    animation: pop-rise 900ms steps(9) both;
  }
  @keyframes pop-rise {
    0% { transform: translate(-50%, 0); opacity: 1; }
    66% { transform: translate(-50%, calc(-12 * var(--u, 2px))); opacity: 1; }
    100% { transform: translate(-50%, calc(-14 * var(--u, 2px))); opacity: 0; }
  }
  :global(html.reduce-motion) .pop { animation: pop-fade 900ms steps(3) both; }
  @keyframes pop-fade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
</style>
