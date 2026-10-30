// Pure helpers behind the chat options (ChatChoices) and the start-menu Big Brain question (BigBrainPrompt).
import { afterEach, describe, expect, test } from 'bun:test';
import {
  BIG_BRAIN_CHOICE_KEY, bigBrainUiEnabled, getBigBrainChoice, onBigBrainChoice, parseBigBrainChoice,
  setBigBrainChoice, shouldAskBigBrain, type ChoiceStorage,
} from '../src/lib/ai/choice';
import { CHAR_EM, MAX_REPLY_ROWS, charsLeftHint, fitChars, replyRows } from '../src/lib/vn/components/chat-choices';

function memoryStorage(): ChoiceStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, String(v));
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

const blocked: ChoiceStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('Big Brain choice (per device)', () => {
  afterEach(() => setBigBrainChoice(null, memoryStorage()));

  test('only the two answers parse', () => {
    expect(parseBigBrainChoice('accepted')).toBe('accepted');
    expect(parseBigBrainChoice('declined')).toBe('declined');
    for (const raw of [null, undefined, '', 'yes', 'ACCEPTED', 1, true]) expect(parseBigBrainChoice(raw)).toBeNull();
  });

  test('a new device has no answer: ask, and keep Big Brain UI out', () => {
    const s = memoryStorage();
    expect(getBigBrainChoice(s)).toBeNull();
    expect(shouldAskBigBrain(getBigBrainChoice(s))).toBe(true);
    expect(bigBrainUiEnabled(getBigBrainChoice(s))).toBe(false);
  });

  test('accepted is stored under kempanion.bigbrain and turns the UI on', () => {
    const s = memoryStorage();
    setBigBrainChoice('accepted', s);
    expect(s.data.get(BIG_BRAIN_CHOICE_KEY)).toBe('accepted');
    expect(BIG_BRAIN_CHOICE_KEY.startsWith('kempanion')).toBe(true);
    expect(getBigBrainChoice(s)).toBe('accepted');
    expect(bigBrainUiEnabled('accepted')).toBe(true);
    expect(shouldAskBigBrain('accepted')).toBe(false);
  });

  test('declined is remembered, never asks again, and keeps the UI out', () => {
    const s = memoryStorage();
    setBigBrainChoice('declined', s);
    expect(getBigBrainChoice(s)).toBe('declined');
    expect(shouldAskBigBrain('declined')).toBe(false);
    expect(bigBrainUiEnabled('declined')).toBe(false);
  });

  test('null forgets the answer', () => {
    const s = memoryStorage();
    setBigBrainChoice('declined', s);
    setBigBrainChoice(null, s);
    expect(s.data.has(BIG_BRAIN_CHOICE_KEY)).toBe(false);
    expect(getBigBrainChoice(s)).toBeNull();
  });

  test('garbage in storage counts as no answer', () => {
    const s = memoryStorage();
    s.data.set(BIG_BRAIN_CHOICE_KEY, 'maybe');
    expect(getBigBrainChoice(s)).toBeNull();
  });

  test('blocked storage keeps the answer for this session', () => {
    setBigBrainChoice('accepted', blocked);
    expect(getBigBrainChoice(blocked)).toBe('accepted');
    expect(getBigBrainChoice(null)).toBe('accepted');
  });

  test('subscribers hear every change until they unsubscribe', () => {
    const s = memoryStorage();
    const heard: (string | null)[] = [];
    const stop = onBigBrainChoice((v) => heard.push(v));
    setBigBrainChoice('accepted', s);
    setBigBrainChoice('declined', s);
    stop();
    setBigBrainChoice('accepted', s);
    expect(heard).toEqual(['accepted', 'declined']);
  });

  test('a failing subscriber does not stop the others', () => {
    const s = memoryStorage();
    const heard: (string | null)[] = [];
    const a = onBigBrainChoice(() => {
      throw new Error('boom');
    });
    const b = onBigBrainChoice((v) => heard.push(v));
    setBigBrainChoice('declined', s);
    a();
    b();
    expect(heard).toEqual(['declined']);
  });
});

describe('chat options: quick-reply rows', () => {
  test('at most three rows; the 4th row is always "Say something else…"', () => {
    expect(MAX_REPLY_ROWS).toBe(3);
    expect(replyRows(['How are you?', "How's volleyball?", 'Tell me a joke', 'Favorite food?'])).toEqual([
      'How are you?',
      "How's volleyball?",
      'Tell me a joke',
    ]);
  });

  test('trims, drops blanks and duplicates, keeps order', () => {
    expect(replyRows(['  Hi!  ', '', 'Hi!', '   ', 'Bump', 'Set'])).toEqual(['Hi!', 'Bump', 'Set']);
  });

  test('no replies (or junk) leaves only the typing row', () => {
    expect(replyRows(undefined)).toEqual([]);
    expect(replyRows(null)).toEqual([]);
    expect(replyRows([1, null, 'Go Gators!'] as unknown as string[])).toEqual(['Go Gators!']);
  });
});

describe('chat options: one-line field limit', () => {
  test('DotGothic16 ASCII is half an em wide', () => {
    expect(CHAR_EM).toBe(0.5);
  });

  test('a wide (W) row holds the full 48 characters', () => {
    // 1280×720 stage: 22.9 px text, ~556 px left for the field after badge, pencil and ×.
    expect(fitChars(556, 22.9, 48)).toBe(48);
    // 889×500 (smallest W): 16 px text, ~387 px.
    expect(fitChars(387, 16, 48)).toBe(48);
  });

  test('narrower rows hold fewer, so the text never scrolls out of view', () => {
    // 360 px phone portrait: 16 px text, ~212 px for the field.
    expect(fitChars(212, 16, 48)).toBe(26);
    // 844×390 phone landscape: ~250 px.
    expect(fitChars(250, 16, 48)).toBe(31);
    for (const w of [120, 200, 300, 400, 500]) {
      const n = fitChars(w, 16, 48);
      expect(n * 16 * CHAR_EM).toBeLessThanOrEqual(w);
    }
  });

  test('unknown sizes give the cap; tiny ones a floor; never above the cap', () => {
    expect(fitChars(0, 16, 48)).toBe(48);
    expect(fitChars(300, 0, 48)).toBe(48);
    expect(fitChars(Number.NaN, 16, 48)).toBe(48);
    expect(fitChars(40, 16, 48)).toBe(12);
    expect(fitChars(5000, 16, 48)).toBe(48);
    expect(fitChars(40, 16, 8)).toBe(8);
  });

  test('the counter shows only when 10 or fewer characters are left', () => {
    expect(charsLeftHint(0, 48)).toBeNull();
    expect(charsLeftHint(37, 48)).toBeNull();
    expect(charsLeftHint(38, 48)).toBe(10);
    expect(charsLeftHint(47, 48)).toBe(1);
    expect(charsLeftHint(48, 48)).toBe(0);
    expect(charsLeftHint(60, 48)).toBe(0);
    expect(charsLeftHint(20, 26)).toBe(6);
  });
});
