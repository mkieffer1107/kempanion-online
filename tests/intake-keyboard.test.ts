import { expect, test } from 'bun:test';
import { editIntakeText } from '../src/lib/ui/components/intakeKeyboard';

test('inserts at the caret and replaces a selected range', () => {
  expect(editIntakeText('Ana', 1, 1, { text: 'n' }, 12)).toEqual({ value: 'Anna', cursor: 2 });
  expect(editIntakeText('Anna', 0, 4, { text: "Jo Li" }, 12)).toEqual({ value: 'Jo Li', cursor: 5 });
});
test('maxlength allows replacing a selection and never splits Unicode', () => {
  expect(editIntakeText('abcdefgh1234', 12, 12, { text: 'x' }, 12).value).toBe('abcdefgh1234');
  expect(editIntakeText('abcdefgh1234', 8, 12, { text: '56789' }, 12)).toEqual({ value: 'abcdefgh5678', cursor: 12 });
  expect(editIntakeText('ab', 2, 2, { text: '🐷' }, 3)).toEqual({ value: 'ab', cursor: 2 });
});
test('backspace and forward delete respect selection, boundaries and Unicode', () => {
  expect(editIntakeText('A🐷B', 3, 3, { action: 'backspace' }, 12)).toEqual({ value: 'AB', cursor: 1 });
  expect(editIntakeText('A🐷B', 1, 1, { action: 'delete' }, 12)).toEqual({ value: 'AB', cursor: 1 });
  expect(editIntakeText('Anna', 1, 3, { action: 'backspace' }, 12)).toEqual({ value: 'Aa', cursor: 1 });
  expect(editIntakeText('Ana', 0, 0, { action: 'backspace' }, 12)).toEqual({ value: 'Ana', cursor: 0 });
  expect(editIntakeText('Ana', 3, 3, { action: 'delete' }, 12)).toEqual({ value: 'Ana', cursor: 3 });
});
