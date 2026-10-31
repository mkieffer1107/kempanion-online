/** DOM selections use UTF-16 offsets; preserve whole Unicode characters when erasing. */
export type KeyboardEdit = { text: string } | { action: 'backspace' | 'delete' };

export function editIntakeText(value: string, start: number, end: number, edit: KeyboardEdit, max: number) {
  start = Math.max(0, Math.min(start, value.length));
  end = Math.max(start, Math.min(end, value.length));
  if ('action' in edit) {
    if (start === end) {
      if (edit.action === 'backspace') start -= Array.from(value.slice(0, start)).at(-1)?.length ?? 0;
      else end += Array.from(value.slice(end))[0]?.length ?? 0;
    }
  }
  const insert = 'text' in edit ? edit.text : '';
  const room = Math.max(0, max - (value.length - (end - start)));
  // Match the native maxlength contract without splitting surrogate pairs.
  let accepted = '';
  for (const char of insert) {
    if (accepted.length + char.length > room) break;
    accepted += char;
  }
  return { value: value.slice(0, start) + accepted + value.slice(end), cursor: start + accepted.length };
}
