<script lang="ts" module>
  export interface SheetAction {
    id: string;
    label: string;
    icon: string;
    desc?: string;
    /** Greyed out with the reason as its description. */
    disabled?: boolean;
    wanted?: boolean;
    run: () => void;
  }
</script>

<script lang="ts">
  // A short list of actions (PLAY / WASH / CARE …) as big pixel buttons.
  import type { Snippet } from 'svelte';
  import Modal from '../components/Modal.svelte';
  import Icon from '../components/Icon.svelte';
  import { audio } from '../../audio';

  interface Props { title: string; icon: string; actions: SheetAction[]; onclose: () => void; children?: Snippet }
  let { title, icon, actions, onclose, children }: Props = $props();

  function run(a: SheetAction) {
    if (a.disabled) { audio.sfx('ui_error'); return; }
    a.run();
  }
</script>

<Modal {title} {icon} kind="sheet" size="sm" {onclose}>
  {#if children}<div class="intro">{@render children()}</div>{/if}
  <ul class="list">
    {#each actions as a (a.id)}
      <li>
        <button type="button" class="px-btn ghost act" class:wanted={a.wanted} aria-disabled={a.disabled} onclick={() => run(a)} data-cycle>
          <Icon id={a.icon} size={28} />
          <span class="txt">
            <span class="lbl">{a.label}</span>
            {#if a.desc}<span class="desc">{a.desc}</span>{/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</Modal>

<style>
  .intro { margin-bottom: 10px; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .act { width: 100%; min-height: 56px; justify-content: flex-start; text-align: left; gap: 10px; }
  .act[aria-disabled='true'] { opacity: 0.5; }
  .act.wanted { border-color: var(--sakura-2); }
  .txt { display: flex; flex-direction: column; gap: 2px; }
  .lbl { font-size: 16px; }
  .desc { font-size: 12px; opacity: 0.8; }
</style>
