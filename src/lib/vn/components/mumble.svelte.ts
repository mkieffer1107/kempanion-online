// The mumble on screen. chat.ts plays Piggy 3's X mumble (ChatReply.effect 'mumble', ai/heuristic/mumble.ts) in the
// dialogue box and says here which page of the stream is up; MumbleBubbles.svelte pops that page's bubble words around
// his portrait as the typewriter reaches them, and Talk shows the stream small and dim while `stream` is on.

export interface MumbleWord {
  word: string;
  /** Index in the page's text where its fragment starts: it pops when the typewriter gets there. */
  at: number;
}

class MumbleStage {
  /** The stream is in the box (small, dim, fast): from its first page until he snaps out of it. */
  stream = $state(false);
  /** The stream page typing now (`id` changes with every page), or null outside the stream. */
  page = $state.raw<{ id: number; words: readonly MumbleWord[] } | null>(null);
  #id = 0;

  /** The stream starts (its first page follows once the box is measured at the stream's font). */
  begin(): void {
    this.stream = true;
    this.page = null;
  }

  /** A page of the stream starts typing: its bubbles pop as the typewriter reaches them. */
  showPage(words: readonly MumbleWord[]): void {
    this.page = { id: ++this.#id, words };
  }

  /** He snaps out of it (or the chat ends): every bubble pops, the stream style goes. */
  end(): void {
    this.stream = false;
    this.page = null;
  }
}

export const mumbleStage = new MumbleStage();
