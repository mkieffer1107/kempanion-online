// Toast store. Anyone can call toast(); <Toasts/> (mounted once by App) renders them.
export type ToastKind = 'info' | 'good' | 'warn' | 'bond' | 'money';

export interface Toast {
  id: number;
  text: string;
  icon?: string;
  kind: ToastKind;
  ms: number;
}

let nextId = 1;

class ToastStore {
  list = $state<Toast[]>([]);

  push(text: string, opts: { icon?: string; kind?: ToastKind; ms?: number } = {}): number {
    const t: Toast = { id: nextId++, text, icon: opts.icon, kind: opts.kind ?? 'info', ms: opts.ms ?? 2800 };
    // Merge an identical toast that is still on screen instead of stacking duplicates.
    if (this.list.some((x) => x.text === text)) return t.id;
    this.list.push(t);
    if (this.list.length > 4) this.list.splice(0, this.list.length - 4);
    setTimeout(() => this.dismiss(t.id), t.ms);
    return t.id;
  }

  dismiss(id: number) {
    const i = this.list.findIndex((t) => t.id === id);
    if (i >= 0) this.list.splice(i, 1);
  }
}

export const toasts = new ToastStore();

export function toast(text: string, opts: { icon?: string; kind?: ToastKind; ms?: number } = {}): number {
  return toasts.push(text, opts);
}
