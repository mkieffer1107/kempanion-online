// Text normalization for intent matching: lowercase, contractions, chat slang, emoji, elongations.

export interface Normalized {
  raw: string;
  /** Lowercase words separated by single spaces; no punctuation. Regexes run on this. */
  text: string;
  tokens: string[];
  /** The message reads as a question (has "?" or starts with a question word). */
  question: boolean;
  exclaim: boolean;
}

const EMOJI: [RegExp, string][] = [
  [/<3+|❤️?|♥️?|💕|💖|💗|💓|💞|😍|🥰|😘|💘|💝|🩷|💜|🧡|💙/gu, ' heartemoji '],
  [/😂|🤣|😆|😹|😹/gu, ' lol '],
  [/😢|😭|😞|😔|☹️?|🙁|😿|💔|🥺/gu, ' sad '],
  [/😴|💤|🥱/gu, ' sleepy '],
  [/🤒|🤧|🤢|😷|🤮/gu, ' sick '],
  [/🍕/gu, ' pizza '], [/🍙/gu, ' onigiri '], [/🍡/gu, ' dango '], [/🍉/gu, ' watermelon '], [/🍊/gu, ' oranges '],
  [/🫐/gu, ' blueberries '], [/☕/gu, ' coffee '], [/🧋/gu, ' boba '], [/🍓/gu, ' strawberry '], [/🍟/gu, ' fries '],
  [/🍜/gu, ' ramen '], [/🥧/gu, ' pie '], [/🍦|🍨/gu, ' ice cream '], [/🥪/gu, ' sub '],
  [/🏐/gu, ' volleyball '], [/🧠/gu, ' brain '], [/🐊/gu, ' gators '], [/🦇/gu, ' bats '], [/🌸/gu, ' sakura '],
  [/👋/gu, ' hi '], [/🤗/gu, ' hugs '], [/🐷|🐖|🐽/gu, ' oink '], [/🙏/gu, ' thanks '], [/😡|🤬|😠/gu, ' angry '],
  [/🎉|🥳|🎊/gu, ' yay '], [/👍/gu, ' okay '], [/👎/gu, ' no '], [/😊|🙂|😄|😁|😀|☺️?/gu, ' smile '],
];

/** Whole-token chat slang and apostrophe-less contractions. */
const SLANG: Record<string, string> = {
  u: 'you', ya: 'you', yu: 'you', ur: 'your', yur: 'your', r: 'are', n: 'and', y: 'why',
  im: 'i am', imma: 'i am going to', ima: 'i am going to', youre: 'you are', whats: 'what is', wats: 'what is',
  wat: 'what', wut: 'what', hows: 'how is', wheres: 'where is', whos: 'who is', thats: 'that is', theres: 'there is',
  dont: 'do not', doesnt: 'does not', didnt: 'did not', cant: 'cannot', wont: 'will not', isnt: 'is not',
  arent: 'are not', wasnt: 'was not', havent: 'have not', ive: 'i have', youve: 'you have', youll: 'you will',
  hes: 'he is', shes: 'she is', theyre: 'they are', wanna: 'want to', gonna: 'going to', gotta: 'got to',
  kinda: 'kind of', sorta: 'sort of', lemme: 'let me', gimme: 'give me', dunno: 'do not know', idk: 'i do not know',
  idc: 'i do not care', pls: 'please', plz: 'please', plez: 'please', thx: 'thanks', thnx: 'thanks', thanx: 'thanks',
  tnx: 'thanks', tx: 'thanks', ty: 'thank you', tysm: 'thank you so much', tyvm: 'thank you very much',
  gm: 'good morning', gn: 'good night', nite: 'night', wyd: 'what are you doing', wbu: 'what about you',
  hbu: 'how about you', rn: 'right now', tmrw: 'tomorrow', tmr: 'tomorrow', tmrrw: 'tomorrow', tonite: 'tonight',
  '2nite': 'tonight', '2day': 'today', b4: 'before', bc: 'because', bcuz: 'because', cuz: 'because', coz: 'because',
  abt: 'about', sry: 'sorry', srry: 'sorry', soz: 'sorry', k: 'okay', kk: 'okay', ok: 'okay', okie: 'okay',
  okey: 'okay', oki: 'okay', yea: 'yeah', yah: 'yeah', yeh: 'yeah', ye: 'yeah', yh: 'yeah', ppl: 'people',
  cya: 'see you', ttyl: 'talk to you later', brb: 'be right back', gtg: 'got to go', g2g: 'got to go',
  ofc: 'of course', nvm: 'never mind', tbh: 'to be honest', ngl: 'not going to lie', fr: 'for real',
  frfr: 'for real', luv: 'love', lub: 'love', ily: 'i love you', ilu: 'i love you', ilysm: 'i love you so much',
  bestie: 'best friend', bff: 'best friend', fav: 'favorite', fave: 'favorite', favourite: 'favorite',
  favorit: 'favorite', faves: 'favorites', hw: 'homework', prob: 'probably', probs: 'probably', def: 'definitely',
  defo: 'definitely', vball: 'volleyball', wassup: 'what is up', wazzup: 'what is up', whatsup: 'what is up',
  sup: 'what is up', hiya: 'hi', heya: 'hey', mornin: 'morning', nighty: 'night', yall: 'you all',
  pic: 'picture', pics: 'pictures', convo: 'conversation', lil: 'little', smth: 'something', sth: 'something',
  bday: 'birthday',
};

const QUESTION_START = /^(?:what|why|how|when|where|who|which|whose|do|does|did|are|is|am|can|could|would|will|should|have|has|was|were|wanna|want)\b/;

/** Collapse runs of 3+ identical letters to 2 ("heyyyy" → "heyy", "sooo" → "soo"). */
function squeeze(s: string): string {
  return s.replace(/([a-z])\1{2,}/g, '$1$1');
}

export function normalize(raw: string): Normalized {
  let s = (raw ?? '').normalize('NFKC');
  const question = /\?/.test(s);
  const exclaim = /!/.test(s);
  for (const [re, rep] of EMOJI) s = s.replace(re, rep);
  s = s.toLowerCase().replace(/[‘’‛`´]/g, "'").replace(/[“”]/g, '"');
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bain't\b/g, 'is not')
    .replace(/n't\b/g, ' not')
    .replace(/'re\b/g, ' are')
    .replace(/'m\b/g, ' am')
    .replace(/'ll\b/g, ' will')
    .replace(/'ve\b/g, ' have')
    .replace(/'d\b/g, ' would')
    .replace(/\blet's\b/g, 'lets')
    .replace(/'s\b/g, ' is')
    .replace(/'/g, '');
  // keep letters, digits and a few joiners; everything else becomes a space
  s = s.replace(/[^a-z0-9+#]+/g, ' ');
  s = squeeze(s);
  const words: string[] = [];
  for (const w of s.split(' ')) {
    if (!w) continue;
    const rep = SLANG[w];
    if (rep !== undefined) words.push(...rep.split(' '));
    else words.push(w);
  }
  const text = words.join(' ');
  return {
    raw,
    text,
    tokens: words,
    question: question || QUESTION_START.test(text),
    exclaim,
  };
}

// ───────────── typo tolerance ─────────────

/** Optimal-string-alignment distance (Levenshtein + adjacent transpositions), early-exit above `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let prev2 = new Array<number>(m + 1).fill(0);
  let prev = new Array<number>(m + 1);
  let cur = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const t = prev2;
    prev2 = prev;
    prev = cur;
    cur = t;
  }
  return prev[m];
}

/** Edits allowed when fuzzily matching a token against `keyword`. */
export function allowedEdits(keyword: string): number {
  if (keyword.length >= 9) return 2;
  if (keyword.length >= 5) return 1;
  return 0;
}

/**
 * Everyday words that must never be "corrected" into a keyword ("tried" is not "tired",
 * "suck" is not "sick"). Every exact keyword is added to this set at startup too.
 */
export const COMMON_WORDS = new Set(
  `a about above after again against all almost alone along already also always am an and another any anyone
  anything are around as ask asked at away back bad be because been before being below best better between big
  both bring brought but buy by call came can cannot care case cause change check class close come coming could
  day days did different do does doing done down during each early easy eat else end enough even ever every
  everyone everything feel few find fine first for found friend friends from full fun funny game get gets getting
  give go goes going gone good got great had hand happen happened hard has have having he hear heard help her here
  him his hold home hope hot hour hours house how i if in into is it its just keep kind knew know last late later
  least leave left less let life like liked likes line little live long look looked looking lot lots love made
  make makes many may maybe me mean meant might mind mine more most move much must my myself name need never new
  next nice night no none nope not nothing now of off often oh okay old on once one only open or other our out
  over own part people person pick place plan play played please point pretty put quite rather read real really
  right room run said same saw say says school see seem seen self send sent set she short should show side since
  sleep small so some someone something sometimes soon sorry start started still stop stuff such sure take taken
  talk talked tell than thank thanks that the their them then there these they thing things think this those
  though thought through time tired to today together told too took tried tries try trying turn two under until
  up upon us use used very wait want wanted was watch way we week weird well went were what whatever when where
  which while who whole why will win wish with without word words work worked working would wow yeah year years
  yes yet you young your yours yourself yours suck sucks tires tire tried tries hungary hunger cord cords code
  coded codes coder cool cold could sick sock sack sets settle bumpy spiked spice spite based bass base basis
  vase patriots chomps model modes mode modal brain brains train trains grain plain gain rain drain drains rains
  ever even eve fever never clever fewer lever shoot sheet shot shirt short sport sports spot spots post posts
  spine spin spins swine wine wins print prints printer sprint sprints point points pint joint codex index
  hello hell help held hold helm hey they hay hi his him hit hip hips ship shop chip chips chop chomp
  ruin ruins ruined ruining`
    .split(/\s+/)
    .filter(Boolean),
);
