<script lang="ts">
  // Game-clock chip: sun/moon by time of day, wall-clock string, and weather.
  import { gameClock } from '../../state/ticker.svelte';
  import { weatherAt, weatherLabel } from '../../state/weather';
  import { clockString, timeOfDay } from '../../time';
  import Icon from './Icon.svelte';

  let { small = false, showWeather = true }: { small?: boolean; showWeather?: boolean } = $props();

  const d = $derived(new Date(gameClock.minute * 60_000));
  const tod = $derived(timeOfDay(d));
  const weather = $derived(weatherAt(d.getTime()));
  const text = $derived(clockString(d));
</script>

<span class="clock" class:small title="{text} · {tod}{showWeather ? ` · ${weatherLabel(weather)}` : ''}">
  <Icon id={tod === 'night' ? 'moon' : 'sun'} size={small ? 16 : 20} />
  <span class="t">{text}</span>
  {#if showWeather && weather !== 'clear'}<Icon id="rain" size={small ? 16 : 20} alt={weatherLabel(weather)} />{/if}
</span>

<style>
  .clock {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    font-size: 14px;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }
  .small { font-size: 12px; gap: 3px; }
</style>
