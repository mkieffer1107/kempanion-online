// Public API of the VN engine (KScript scenes, dialogue box, free chat). Vite-only: it loads every
// src/lib/content/scenes/*.ks through import.meta.glob. Bun tests import the pure modules directly
// (kscript.ts, conditions.ts, triggers.ts, interpreter.ts, validate.ts).
export { dialogue } from './dialogue.svelte';
export type { LineHandle, AskOptions, LogLine, SayOptions } from './dialogue.svelte';

export type { SceneInfo, TriggerContext } from './triggers';
export { runScene, stopScene, sceneRunning } from './runner';
export { getScene, allScenes, findTriggeredScene, eligibleScenes, heartScene } from './registry';
export { storyChapter } from './effects';
export { runFreeChat, chatContext, setFreeChatPosition, FREE_CHAT_MAX_CHARS, type FreeChatOptions } from './chat';
export { vnHooks, type VnHooks } from './hooks';
export { parseKScript, KScriptError } from './kscript';

export { default as DialogueBox } from './components/DialogueBox.svelte';
export { default as DialogueControls } from './components/DialogueControls.svelte';
export { default as ChoiceMenu } from './components/ChoiceMenu.svelte';
export { default as ChatChoices } from './components/ChatChoices.svelte';
/** The [input] row (scenes ask a short free-text question). Free chat answers through ChatChoices. */
export { default as ChatInput } from './components/ChatInput.svelte';
export { liftAboveKeyboard } from './components/keyboard';
export { default as Backlog } from './components/Backlog.svelte';
