<script lang="ts">
  // Pixel button with a 16px icon (scaled) and an optional visible label. Always ≥ 44px.
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { audio } from '../../audio';
  import Icon from './Icon.svelte';

  interface Props extends Omit<HTMLButtonAttributes, 'children'> {
    icon: string;
    label: string;
    /** Show the label next to the icon (otherwise it is only the accessible name + tooltip). */
    showLabel?: boolean;
    variant?: 'ghost' | 'primary' | 'plain' | 'orange' | 'blue';
    small?: boolean;
    iconSize?: number;
    pressed?: boolean;
    /** Play ui_select on click (default true). */
    sound?: boolean;
  }

  let {
    icon, label, showLabel = false, variant = 'ghost', small = false, iconSize, pressed, sound = true,
    onclick, class: cls = '', ...rest
  }: Props = $props();

  function click(e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    if (sound) audio.sfx('ui_select');
    onclick?.(e);
  }
</script>

<button
  type="button"
  class="px-btn {variant === 'plain' ? '' : variant} {cls}"
  class:small
  class:icon-only={!showLabel}
  aria-label={showLabel ? undefined : label}
  aria-pressed={pressed}
  title={label}
  onclick={click}
  {...rest}
>
  <Icon id={icon} size={iconSize ?? (small ? 18 : 22)} />
  {#if showLabel}<span class="lbl">{label}</span>{/if}
</button>

<style>
  .icon-only { padding: 0; min-width: 44px; }
  .lbl { white-space: nowrap; }
  button[aria-pressed='true'] { --btn-bg: var(--sakura-2); --btn-ink: var(--ink); }
</style>
