// Shared image loader so atlases decode once and later draws are synchronous.
const pending = new Map<string, Promise<HTMLImageElement>>();
const ready = new Map<string, HTMLImageElement>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = pending.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        ready.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        pending.delete(url);
        reject(new Error(`Could not load ${url}`));
      };
      img.src = url;
    });
    pending.set(url, p);
  }
  return p;
}

/** The decoded image if it is already loaded, else null. */
export function peekImage(url: string): HTMLImageElement | null {
  return ready.get(url) ?? null;
}

/** Draw `img` (or the loaded image for `url`) as soon as possible; returns a cancel function. */
export function whenImage(url: string, draw: (img: HTMLImageElement) => void): () => void {
  let live = true;
  const hit = peekImage(url);
  if (hit) draw(hit);
  else loadImage(url).then((img) => { if (live) draw(img); }, () => {});
  return () => { live = false; };
}
