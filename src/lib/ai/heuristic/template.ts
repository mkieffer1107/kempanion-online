// Line templating ({player}, {food}, {major|your classes}…), remembered-fact parsing, safe echoes of player text,
// the player's stated major (shared with memory.ts), the player's sums ("what's 9 plus 10?", solved here, in code), and
// the sentence counter used to keep replies within 3 sentences.

export type Vars = Readonly<Record<string, string | undefined>>;

const PLACEHOLDER = /\{([a-z_]+)(?:\|([^{}]*))?\}/g;

/**
 * Placeholder names a line may use (anything else is a bug the tests catch). {answer} and {expr} are the player's sum
 * as a pig says it ("19", "9 plus 10"): only the 'arithmetic' pools use them, and the answer always comes from
 * parseArithmetic(), never from a line.
 */
export const KNOWN_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'player', 'time', 'tod', 'day', 'place', 'home', 'food', 'other', 'otherplace', 'last', 'said', 'n',
  'major', 'hometown', 'comfort_food', 'likes', 'year', 'exam', 'chronotype', 'answer', 'expr',
]);

/** Placeholders always available, so lines using them never get filtered out. */
const ALWAYS = new Set(['player', 'time', 'tod', 'day', 'place', 'home']);

export function placeholdersIn(text: string): { key: string; fallback?: string }[] {
  const out: { key: string; fallback?: string }[] = [];
  for (const m of text.matchAll(PLACEHOLDER)) out.push({ key: m[1], fallback: m[2] });
  return out;
}

/** True when the line depends on a remembered or situational value (it is more personal, so it is preferred). */
export function isPersonal(text: string): boolean {
  return placeholdersIn(text).some((p) => !ALWAYS.has(p.key) && p.fallback === undefined);
}

/**
 * Fill placeholders. Returns null when a placeholder without a fallback has no value, so the caller can skip
 * the line. A value that starts a sentence is capitalized ("{place} is…" → "The Plaza is…").
 */
export function fill(text: string, vars: Vars): string | null {
  let missing = false;
  const out = text.replace(PLACEHOLDER, (_m, key: string, fb: string | undefined, offset: number, whole: string) => {
    let v = vars[key];
    if (v === undefined || v === '') {
      if (fb === undefined) {
        missing = true;
        return '';
      }
      v = fb;
    }
    const before = whole.slice(0, offset);
    if (/^\s*$/.test(before) || /[.!?]["”')\]]*\s+$/.test(before)) v = v.charAt(0).toUpperCase() + v.slice(1);
    return v;
  });
  return missing ? null : out;
}

/**
 * Sentence count: a terminator (. ! ? …, repeated, optionally followed by a closing quote) that ends the text
 * or is followed by whitespace and a capital letter/digit. "…" before a lowercase word is a pause, not an end.
 */
export function sentenceCount(text: string): number {
  const m = text.trim().match(/[.!?…]+["”’')\]]*(?=\s+["“‘'(\[]?[A-Z0-9]|\s*$)/g);
  return Math.max(1, m ? m.length : 0);
}

// ───────────── safe echoes of player text ─────────────

const BLOCKED = /\b(?:fuck\w*|shit\w*|bitch\w*|ass|asshole\w*|dick\w*|cock\w*|puss\w*|cunt\w*|sex\w*|porn\w*|nazi\w*|hitler|kill\w*|die|died|dead|death|suicid\w*|rape\w*|drugs?|weed|cocaine|meth|krishna\w*|bait|bacon|hams?|pork\w*|sausages?|pepperoni|hate\w*|stupid|idiot\w*|slut\w*|whore\w*|fag\w*|retard\w*|nigg\w*|kkk|terror\w*|bomb\w*|guns?|shoot\w*|politic\w*|trump|biden|maga|democrat\w*|republican\w*)\b/i;

/**
 * Clean a short piece of player text for echoing back, or undefined if it is too long or not kind. `allow`: phrases
 * that are fine although a blocked word is in them ("political science" the major, not political talk).
 */
export function safeEcho(raw: string | undefined, maxWords = 3, maxLen = 24, allow?: RegExp): string | undefined {
  if (!raw) return undefined;
  const s = raw.replace(/[^a-z0-9&' -]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > maxLen || s.split(' ').length > maxWords || BLOCKED.test(allow ? s.replace(allow, ' ') : s)) return undefined;
  return s;
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s-])([a-z])/g, (_m, sep: string, c: string) => sep + c.toUpperCase());
}

const STOP_TAIL = '(?=\\s+(?:and|but|at|because|so|in|with|now|right|too|a lot|very much|originally|though)\\b|$)';

// ───────────── the player's major ─────────────
// One reading of "my major is X" / "I'm an X major" / "majoring in X" / "I study X", shared by the intent rules
// (intents.ts), the pig's echo ("Studying X? Love that!", extractSaid) and memory ("Player's major is X.", memory.ts),
// all on classifyIntent's typo-corrected text (intents.ts correctedText), so the pig never echoes a major he doesn't
// remember, or remembers one he didn't echo.
//
// A major is read back and remembered only when it names a field of study (isSubject: "bio", "computer science",
// "zoology"): what follows "my major is" or "I study" is as often how it's going ("terrible", "way too hard", "atm").
// "my major is terrible" still gets an answer about the major, without "Terrible!" read back; "i'm studying atm" isn't
// about a major at all; "I'm a(n) X major" with an X that isn't a known field counts only when nothing follows
// "major" ("i'm a tiktok major lol"), never when "major" describes the next word ("a total major disaster").
// The name ends on its field (fieldName): "i'm studying chem atm" is chem, "my major is bio notes" bio, "majoring in
// bio and minoring in chem" bio; what comes after the field is when, how or what is being studied, never the name.

/** Words that name a field of study on their own, as normalize() spells them ("bio", "econ", "pre-med" → "med"). */
const SUBJECT_WORDS = new Set(
  `accounting acting actuarial administration advertising aerospace aeronautical aeronautics agribusiness agricultural
  agriculture agronomy anatomy animation anthro anthropology arabic archaeology architecture art arts astronomy
  astrophysics audiology auditing aviation banking bio biochem biochemistry bioengineering bioinformatics biology biomed
  biomedical biophysics biostatistics biotech biotechnology botany broadcasting business ceramics chem chemical
  chemistry chinese cinema cinematography civil classics coaching cognitive comm communication communications comms
  compsci computer computing conservation construction consulting counseling counselling crim criminology culinary
  cybersecurity dance dancing dental dentistry design dietetics drama drawing ecology econ econometrics economics
  education electrical electronics engineering english entomology entrepreneurship environmental epidemiology fashion
  film finance fisheries forensic forensics forestry french genetics geography geology geomatics geoscience geosciences
  german gerontology government graphic graphics greek health healthcare hebrew hindi history horticulture hospitality
  humanities hydrology illustration immunology industrial informatics information italian japanese journalism kines
  kinesiology korean landscape landscaping languages latin law legal linguistics literature logistics management
  manufacturing marine marketing materials math mathematics maths mechanical mechatronics med media medicine
  merchandising meteorology microbio microbiology mining molecular music musicology nanotechnology neuro neurobiology
  neuroscience nuclear nursing nutrition nutritional oceanography optometry painting paralegal pathology pharm
  pharmaceutical pharmacology pharmacy philosophy photography physics physiology planning poli policy polisci politics
  portuguese prelaw premed prevet printmaking programming psych psychology publishing radiology recreation religion
  religious robotics russian sci science sciences sculpture singing soc sociology software spanish sport sports
  statistics stats studies surveying sustainability teaching technology telecom telecommunication telecommunications
  theater theatre theology therapy tourism toxicology vet veterinary viticulture welding wildlife writing zoology
  abe ai aibhs bme che cise compe cpe cs ece ee hci ise isom mis ml mse pr stem
  affairs behavior composition development disorders environment hygiene performance production services systems theory`
    .split(/\s+/)
    .filter(Boolean),
);
/** Fields named by two words that aren't fields on their own ("social work", "real estate", "pre-PA", "English lit"). */
const SUBJECT_PHRASE =
  '(?:social work|public relations|real estate|criminal justice|international relations|supply chain|human resources|cyber security|artificial intelligence|machine learning|game dev|athletic training|pre (?:pa|pt|ot|dent)|(?:english|american|british|comparative|comp|world) lit)';
const SUBJECT_PHRASES = new RegExp(`\\b${SUBJECT_PHRASE}\\b`);
const ENDS_ON_PHRASE = new RegExp(`\\b${SUBJECT_PHRASE}$`);
/** -ology, -onomy, -graphy, -istry, -sophy, -ics name a field ("zoology", "agronomy", "linguistics"), with these exceptions. */
const SUBJECT_SUFFIX =
  /^(?!(?:apology|apologies|anthology|basics|antics|comics|topics|tactics|picnics|lyrics|critics)$)[a-z]{2,}(?:olog(?:y|ies)|onomy|graphy|istry|sophy|ics)$/;

/** `value` names a field of study: one of its words does ("food & resource economics", "pre-med"), or a two-word field. */
export function isSubject(value: string | undefined): boolean {
  const words = (value ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return SUBJECT_PHRASES.test(words.join(' ')) || words.some(isFieldWord);
}

function isFieldWord(word: string): boolean {
  return SUBJECT_WORDS.has(word) || SUBJECT_SUFFIX.test(word);
}

/** One normalized word that names a field of study ("painting", "bio"): a real word, never a typo (intents.ts). */
export function isSubjectWord(word: string): boolean {
  return SUBJECT_WORDS.has(word);
}

/** "minor", "minoring": the minor is not the major ("majoring in bio and minoring in chem", "a chem minor and bio major"). */
const MINOR_WORD = /^minor(?:s|ing)?$/;
/** Chat tone around a statement, not part of it ("i study chem tho", "my major is lowkey bio"). */
const TONE_WORDS = ['tho', 'smh', 'ig', 'imo', 'irl', 'lowkey', 'highkey'];
/**
 * After a field, a word that makes it describe the major instead of naming it ("my major is math-heavy", "STEM-adjacent").
 * Not "based": "my major is CS, based." is Piggy 2's word.
 */
const DESCRIBES_FIELD =
  /^(?:heavy|intensive|adjacent|related|focused|oriented|centered|centric|casual|ish|leaning|themed|inspired|friendly|free|minded|driven|flavored|coded|brained)$/;

/**
 * A major's name (normalized words) cut to end on its field: the last word names a field, or a two-word field ends
 * there. What follows the field is when, how or what is being studied ("chem atm", "bio notes", "math is hard",
 * "computer science honors"), never part of the name; a name that came with a minor keeps only the major ("bio and
 * minoring" → "bio", "chem minor and bio" → "bio"). undefined when no field is left ("atm", "terrible") or the field
 * only describes the major ("math heavy", "STEM adjacent").
 */
export function fieldName(value: string | undefined): string | undefined {
  let words = (value ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    if (MINOR_WORD.test(words[i])) {
      words = words.slice(i + 1);
      break;
    }
  }
  while (words.length && !isFieldWord(words[words.length - 1]) && !ENDS_ON_PHRASE.test(words.join(' '))) {
    if (DESCRIBES_FIELD.test(words.pop()!)) return undefined;
  }
  // "and bio" after the minor, "lowkey bio"
  while (words.length && (/^(?:and|or|of|the)$/.test(words[0]) || TONE_WORDS.includes(words[0]))) words.shift();
  return words.length ? words.join(' ') : undefined;
}

/** The longest major read back or remembered ("family youth and community sciences", "materials science and engineering"). */
const MAJOR_WORDS = 5;
const MAJOR_MAX = 40;
/** Fields of study with a word safeEcho otherwise blocks. */
const MAJOR_ALLOW = /\bpolitical (?:science|sciences|economy|theory|philosophy)\b|\bpolitics\b/gi;

/**
 * Words that are never part of a major's name. Before "major" they make it the adjective, a role, someone else's
 * major, an old one or the year ("having a major panic attack", "stressed about my major", "a drum major", "a double
 * major", "a former bio major", "a sophomore major in biology").
 */
export const NOT_MAJOR_WORDS = [
  'a', 'an', 'the', 'my', 'your', 'his', 'her', 'their', 'our', 'its', 'it', 'this', 'that', 'these', 'those', 'some',
  'any', 'such', 'no', 'not', 'so', 'too', 'just', 'really', 'very', 'still', 'also', 'actually', 'now', 'currently',
  'kind', 'sort', 'about', 'in', 'on', 'to', 'for', 'of', 'under', 'through', 'with', 'without', 'at', 'from', 'into',
  'over', 'by', 'as', 'like', 'than', 'double', 'triple', 'dual', 'having', 'taking', 'changing', 'switching',
  'thinking', 'going', 'working', 'getting', 'doing', 'making', 'facing', 'dealing', 'considering', 'declaring',
  'choosing', 'picking', 'dropping', 'drum', 'former', 'ex', 'past', 'previous', 'old', 'freshman', 'sophomore',
  'junior', 'senior',
].join('|');

/**
 * Before the name in "I'm a(n) … major": the year, the pride, how it's going ("a junior CS major", "a stressed out bio
 * major"). Up to two of them; a field named with one ("real estate") is still read whole.
 */
const MAJOR_KIND = [
  'freshman', 'sophomore', 'junior', 'senior', '(?:first|second|third|fourth|fifth)[- ]year', 'fellow', 'proud',
  'future', 'prospective', 'current', 'declared', 'new', 'aspiring', 'struggling', 'stressed', 'out', 'tired', 'broke',
  'typical', 'hardcore', 'humble', 'lowkey', 'highkey', 'total', 'real', 'true', 'big', 'huge', 'lil', 'little',
  'certified', 'official',
].join('|');

/** After "major", the thing it describes: "major" is the adjective ("a big major league fan", "a total major nerd"). */
const MAJOR_DESCRIBES = [
  'league', 'leagues', 'leaguer', 'leaguers', 'nerd', 'nerds', 'geek', 'dork', 'fan', 'fans', 'fanboy', 'fangirl',
  'stan', 'simp', 'weeb', 'gamer', 'foodie', 'flirt', 'problem', 'problems', 'issue', 'issues', 'key', 'chord', 'scale',
  'crisis', 'deal', 'award', 'general', 'part', 'role', 'mood', 'vibe', 'vibes', 'bummer', 'flex', 'win', 'loss',
  'change', 'changes', 'upgrade', 'update', 'project', 'exam', 'test', 'surgery', 'injury', 'setback', 'headache',
  'pain', 'player', 'players', 'factor', 'news', 'event', 'mistake', 'fail', 'failure', 'success', 'milestone',
].join('|');

/**
 * Words a major's name can't start with after "my major is" / "I study": how it's going, where or when, what is being
 * studied right now, or a question back ("my major is so hard", "I study at the library", "i study twice a week",
 * "i'm studying while eating", "i'm studying, what are you doing?").
 */
const NOT_MAJOR_START = [
  NOT_MAJOR_WORDS, 'pretty', 'super', 'quite', 'literally', 'honestly', 'basically', 'probably', 'definitely', 'hard',
  'harder', 'late', 'easy', 'fun', 'boring', 'tough', 'stressful', 'difficult', 'confusing', 'rough', 'brutal', 'crazy',
  'insane', 'killing', 'great', 'good', 'bad', 'okay', 'cool', 'chill', 'awesome', 'interesting', 'all', 'every',
  'everyday', 'everything', 'here', 'there', 'today', 'tonight', 'tomorrow', 'abroad', 'together', 'online', 'alone',
  'right', 'daily', 'best', 'better', 'well', 'more', 'less', 'much', 'lots', 'sometimes', 'usually', 'mostly',
  'always', 'never', 'what', 'how', 'who', 'why', 'where', 'when', 'which', 'whatever', 'twice', 'once', 'while',
  'whenever', 'until', 'since', 'because', 'if', 'again', 'instead', 'anyway', 'anyways', 'nonstop', 'constantly',
  'often', 'rarely', 'weekly', 'nightly', 'hours', 'lol', 'lmao', 'haha\\w*', 'hehe\\w*', 'btw', 'tbh', 'ngl', 'i',
  'you', 'me', 'him', 'them', 'up', 'out', 'off', 'yet', 'is', 'am', 'are', 'was', 'and', 'or', 'but', 'stuff',
  'things', 'something', 'nothing', 'anything', 'notes', 'chapter', 'chapters', 'flashcards', 'slides', 'lecture',
  'lectures', 'homework', 'readings', 'pset', 'psets', 'problems', 'material', 'fine(?! arts?)', 'mid', 'meh', 'ugh\\w*',
  'uh\\w*', 'um+', 'hm+', 'sigh\\w*', 'oof', 'bruh', 'fml', 'smh', 'yay', 'help',
  // a course being studied right now, not a major ("i'm studying ochem")
  'ochem', 'orgo', 'calc', 'calculus', 'precalc', 'algebra', 'trig', 'trigonometry', 'geometry', 'intro', 'gen',
].join('|');

/** -ing words that name a major ("my major is nursing"); any other -ing word there is how it goes ("…is stressing me out"). */
const ING_MAJORS = [
  'engineering', 'nursing', 'accounting', 'marketing', 'computing', 'programming', 'banking', 'acting', 'mining',
  'advertising', 'counseling', 'counselling', 'planning', 'teaching', 'writing', 'publishing', 'broadcasting',
  'consulting', 'farming', 'printing', 'painting', 'drawing', 'dancing', 'singing', 'landscaping', 'manufacturing',
  'merchandising', 'modeling', 'modelling', 'welding', 'building', 'surveying', 'auditing', 'coaching', 'cooking',
].join('|');

/**
 * Words that end a major's name: a new clause, a question back, when or where, the tone, the minor ("my major is bio,
 * what's yours?" → "bio").
 */
const MAJOR_END_WORDS = [
  'but', 'or', 'so', 'because', 'cause', 'since', 'though', 'although', 'while', 'when', 'whenever', 'where', 'which',
  'who', 'that', 'what', 'how', 'why', 'for', 'at', 'in', 'with', 'on', 'from', 'to', 'by', 'about', 'during', 'before',
  'after', 'until', 'like', 'now', 'today', 'tonight', 'tomorrow', 'too', 'also', 'again', 'instead', 'anyway',
  'anyways', 'actually', 'honestly', 'lol', 'lmao', 'haha\\w*', 'hehe\\w*', 'btw', 'tbh', 'ngl', 'originally', 'i',
  'you', 'it', 'its', 'my', 'your', 'yet', 'still', 'every', 'all', 'here', 'there', 'as', 'than', 'if', 'not', 'just',
  'please', 'okay', 'yeah', 'yes', 'no', 'thanks', 'thank', 'am', 'are', 'was', 'were', 'right', 'very', 'minor',
  'minors', 'minoring', ...TONE_WORDS,
].join('|');
/**
 * "and" joins a major's words ("computer science and engineering") unless a new clause starts ("…and I love it") or
 * the minor does ("…and minoring in chem", "…and a minor in chem").
 */
const AND_CLAUSE = 'and (?:i|it|its|my|that|thats|this|they|we|you|so|then|now|also|what|how|is|am|honestly|lol|haha\\w*|(?:a )?minor\\w*)';
const MAJOR_END = `(?:${MAJOR_END_WORDS}|${AND_CLAUSE})\\b`;

/** No major yet: nothing to echo or remember as a subject. */
const UNDECIDED = /\b(?:still deciding|undecided|undeclared|not sure|unsure|deciding)\b/i;

/** "my major is undecided", "i'm an undeclared major": a major statement without a major in it. */
export function isUndecided(text: string): boolean {
  return UNDECIDED.test(text);
}

/** Studying for a test is not a major ("i'm studying chem for my exam"). */
const EXAM_WORDS = /\b(?:exams?|tests?|quiz|quizzes|midterms?|finals?|mcat|gre|lsat)\b/;

/** One word of a major's name in normalized text. */
const MAJOR_WORD = `(?!(?:${NOT_MAJOR_WORDS})\\b)[a-z]+`;
/** The first word after "my major is" / "I study": not NOT_MAJOR_START, and an -ing word only if it names a major. */
const SAID_FIRST = `(?!(?:${NOT_MAJOR_START})\\b)(?!(?!(?:${ING_MAJORS})\\b)[a-z]+ing\\b)[a-z]+`;
/** The next words, up to a word that ends the name. */
const SAID_NEXT = `(?!${MAJOR_END})[a-z]+`;
const SAID_VALUE = `(${SAID_FIRST}(?: ${SAID_NEXT}){0,4}?)`;

/**
 * "I'm (also) a(n) … major" in normalized text: group 1 is everything naming it (up to two MAJOR_KIND words, then 1–5
 * words, none of them NOT_MAJOR_WORDS), group 2 the name without the kind words, group 3 the word after "major".
 * Without "a"/"an", an -ing first word is a verb ("I'm facing major delays") unless it names a major ("im nursing
 * major"). statedMajor() decides from group 3 whether "major" is the noun.
 */
const MAJOR_NOUN_RE = new RegExp(
  `\\bi am (?:(?:also|actually|now|currently|still|officially|technically|finally|just) )*(?:an? |(?!(?!(?:${ING_MAJORS})\\b)[a-z]+ing\\b))((?:(?:${MAJOR_KIND}) ){0,2}(${MAJOR_WORD}(?: ${MAJOR_WORD}){0,4}))(?: (?:double|dual|triple))? major\\b(?: ([a-z]+))?`,
  'g',
);
/** After "major", a word that describes: "major" is the adjective ("a big major league fan", "a total major nerd"). */
const DESCRIBED_RE = new RegExp(`^(?:${MAJOR_DESCRIBES})$`);
/** After "major", the end of the name: a new clause, a question back, where or when ("i'm a tiktok major lol"). */
const AFTER_MAJOR_RE = new RegExp(`^(?:${MAJOR_END_WORDS}|and|me|myself)$`);

/** "my major is (in) X" ("my major's in biology", "my majors in biology"), "my degree is in X", "majoring in X". */
const SAID_TRIGGER = '(?:my (?:major|degree)(?: is|s) in|my major is|my majors are|i major in|i am (?:also |double )?majoring in|majoring in)';
/** "my major is X" / "majoring in X", X ending at a word that ends a major's name or at the end. */
const MAJOR_SAID_RE = new RegExp(`\\b${SAID_TRIGGER} ${SAID_VALUE}(?=\\s+${MAJOR_END}|\\s*$)`);
/** …with a name too long to read back ("my major is" and a real first word). */
const MAJOR_SAID_START_RE = new RegExp(`\\b${SAID_TRIGGER} ${SAID_FIRST}\\b`);
/**
 * "I study X" / "I'm studying X" is a major only when nothing says it's a study session: the sentence ends after X or
 * goes on with a new clause, a question back, the tone or "at UF" ("i'm studying chem tonight" and "…with friends" are
 * not). X ends on its field, or it is what is being studied right now: "i'm studying chem atm / notes / outside" is a
 * study session like "…tonight", and "i study law and order reruns" is no major either (statedMajor).
 */
const STUDY_GOES_ON = [
  AND_CLAUSE, 'but', 'so', 'because', 'lol', 'lmao', 'haha\\w*', 'hehe\\w*', 'btw', 'tbh', 'honestly', 'actually',
  'too', 'also', 'here', 'what about you', 'how about you', 'and you', 'what do you', 'what is your', 'what are you',
  'do you', 'i am', 'i love', 'i like', 'it is', 'at (?:uf|the university|college|university|school)', 'in college',
  'as (?:my|a) major', 'to be honest', 'not going to lie', 'for real', ...TONE_WORDS,
].join('|');
const MAJOR_STUDY_RE = new RegExp(
  `\\bi (?:(?:currently|also|now) )?(?:study|am (?:(?:currently|also|now) )?studying) ${SAID_VALUE}(?=\\s+(?:${STUDY_GOES_ON})\\b|\\s*$)`,
);

export interface StatedMajor {
  /** "my major is …", "I'm a … major", "majoring in …" (true); "I study …", "I'm studying …" (false: remembered as
   *  "Player studies X.", never replacing the stated major, and when X is one of the pigs' topics that topic wins and
   *  nothing is remembered, "i'm studying perfusion"). */
  strong: boolean;
  /** The major in normalized words, ending on its field of study (fieldName: "my major is bio atm" → "bio"). Absent:
   *  the pig answers about the player's major without reading anything back ("my major is terrible", "i'm a tiktok
   *  major"). */
  value?: string;
}

/**
 * The player states their major (corrected text, see intents.ts correctedText), or null: "i'm having a major panic
 * attack", "a total major disaster", "i'm studying atm".
 */
export function statedMajor(text: string): StatedMajor | null {
  // This program name contains an internal "in" and exceeds the general five-word echo limit.
  // Use its canonical acronym without relaxing the clause boundaries for any other major.
  text = text.replace(/\b(?:ai|artificial intelligence) in biomedical and health sciences\b/g, 'aibhs');
  for (const m of text.matchAll(MAJOR_NOUN_RE)) {
    const [, whole, name, next] = m;
    if (next && DESCRIBED_RE.test(next)) continue;
    const value = fieldName(name) ?? fieldName(whole);
    if (value) return { strong: true, value };
    if (!next || AFTER_MAJOR_RE.test(next)) return { strong: true };
  }
  const said = MAJOR_SAID_RE.exec(text);
  if (said) {
    const value = fieldName(said[1]);
    return value ? { strong: true, value } : { strong: true };
  }
  if (MAJOR_SAID_START_RE.test(text)) return { strong: true };
  if (EXAM_WORDS.test(text)) return null;
  // said in passing, the name must end on its field: anything after it makes it a study session ("chem atm")
  const study = MAJOR_STUDY_RE.exec(text);
  return study && fieldName(study[1]) === study[1] ? { strong: false, value: study[1] } : null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where a phrase from normalized text is in what the player typed, in their spelling: "pre med" → "pre-med",
 * "food resource economics" → "food & resource economics", "women is studies" → "women's studies" (normalize()
 * reads "'s" as "is"). undefined when it can't be found.
 */
export function rawSpelling(raw: string, phrase: string): string | undefined {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return undefined;
  const src = words.map((w, i) => (i === 0 ? escapeRe(w) : w === 'is' ? "(?:['’]s|[\\s/&+-]+is)" : `[\\s/&+-]+${escapeRe(w)}`)).join('');
  const m = new RegExp(`(?<![\\p{L}\\p{N}])${src}(?![\\p{L}\\p{N}])`, 'iu').exec(raw);
  return m ? m[0].replace(/\s+/g, ' ') : undefined;
}

/**
 * A stated major's name as the player spelled it (`raw`, when given), cut at a clause ("my major is math is hard" →
 * "math") and without a dangling "and"/"of". undefined when nothing is left.
 */
export function majorName(value: string | undefined, raw?: string): string | undefined {
  if (!value) return undefined;
  const v = ((raw && rawSpelling(raw, value)) || value)
    .split(/\s+(?:is|am|are|was|were)\b/i)[0]
    .replace(/(?:\s+(?:and|or|of|the|a|an|to|for|in|at|with|&))+$/i, '')
    .trim();
  return v || undefined;
}

/**
 * A stated major (statedMajor().value) as the pig reads it back and remembers it: the player's spelling, cut clean,
 * lowercase but for initials and languages ("CS", "English"). undefined when what's left isn't a field of study or is
 * "undecided" (the pig still answers, without reading anything back, and nothing is remembered).
 */
export function saidMajor(value: string | undefined, raw?: string): string | undefined {
  const name = majorName(value, raw)?.toLowerCase();
  if (!name || UNDECIDED.test(name) || !isSubject(name)) return undefined;
  return majorCase(safeEcho(name, MAJOR_WORDS, MAJOR_MAX, MAJOR_ALLOW));
}

/** Pull the shared value out of "my name is …", "I study …", "I'm from …", "I love …" (normalized text, typo-corrected
 *  for a major; `raw` is what the player typed, for their spelling of a major). */
export function extractSaid(text: string, topic: string | undefined, raw?: string): string | undefined {
  let m: RegExpExecArray | null = null;
  switch (topic) {
    case 'name':
      m = /\b(?:my name is|call me|i go by)\s+([a-z][a-z'-]{1,15})\b/.exec(text);
      return m ? optTitle(safeEcho(m[1], 1, 16)) : undefined;
    case 'major':
      // "my major is undecided" / "…is terrible" get a line about the major without reading anything back
      return saidMajor(statedMajor(text)?.value, raw);
    case 'hometown':
      m = new RegExp(`\\b(?:i am from|i grew up in|my hometown is)\\s+([a-z][a-z ]*?)${STOP_TAIL}`).exec(text);
      return m ? optTitle(safeEcho(m[1], 3, 24)) : undefined;
    case 'likes':
      m = new RegExp(`\\bi (?:really )?(?:like|love|enjoy|adore|am into)\\s+([a-z][a-z ]*?)${STOP_TAIL}`).exec(text);
      return m ? safeEcho(m[1], 3, 24) : undefined;
    default:
      return undefined;
  }
}

function optTitle(s: string | undefined): string | undefined {
  return s ? titleCase(s) : undefined;
}

/** Majors said as initials keep their capitals ("i'm a cs major" → "CS"), languages and peoples theirs ("English"). */
export function majorCase(s: string | undefined): string | undefined {
  return s
    ?.replace(/\b(?:cs|cise|ai|aibhs|ece|ee|bme|mis|hci|ml|stem|uf|pr|abe|che|cpe|ise|isom|mse)\b/g, (w) => w.toUpperCase())
    .replace(
      /\b(?:english|spanish|french|german|italian|portuguese|chinese|mandarin|japanese|korean|arabic|russian|latin|greek|hebrew|hindi|vietnamese|american|african|asian|european|caribbean|jewish|latino|latina|latinx|florida)\b/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1),
    );
}

// ───────────── remembered facts ─────────────

const FACT_KEYS: Record<string, string> = {
  major: 'major', study: 'major', studies: 'major', field: 'major', interest: 'major', brings: 'major',
  brings_you: 'major', brings_you_to_uf: 'major', what_brings_you_to_uf: 'major', path: 'major',
  hometown: 'hometown', home: 'hometown', from: 'hometown', home_town: 'hometown',
  comfort_food: 'comfort_food', comfortfood: 'comfort_food',
  likes: 'likes', like: 'likes', hobby: 'likes', hobbies: 'likes',
  exam: 'exam', exams: 'exam', test: 'exam',
  chronotype: 'chronotype', sleep: 'chronotype', early_bird: 'chronotype', bird_or_owl: 'chronotype',
  year: 'year', class_year: 'year',
};

/**
 * Turn the pig's memory strings into fact slots. Accepts both "key=value" (intake form / KScript [input])
 * and prose like "Player's major is biology." or "Player is from Tampa.".
 */
export function parseFacts(memories: readonly string[] | undefined): Record<string, string> {
  const facts: Record<string, string> = {};
  const put = (key: string, value: string | undefined) => {
    const clean = key === 'major'
      ? safeEcho(value?.replace(/[.!]+$/, ''), MAJOR_WORDS, MAJOR_MAX, MAJOR_ALLOW)
      : safeEcho(value?.replace(/[.!]+$/, ''), 4, 32);
    if (!clean || facts[key]) return;
    if (key === 'major' && UNDECIDED.test(clean)) return;
    facts[key] = key === 'hometown' ? titleCase(clean) : clean;
  };
  // "Player studies chem." (said in passing) is the major only when no major was stated ("Player's major is biology.")
  let studies: string | undefined;
  for (const raw of memories ?? []) {
    const t = String(raw ?? '').trim();
    if (!t) continue;
    const kv = /^([a-z][a-z _-]{1,30}?)\s*[=:]\s*(.+)$/i.exec(t);
    const kvKey = kv ? FACT_KEYS[kv[1].toLowerCase().replace(/[\s-]+/g, '_')] : undefined;
    if (kv && kvKey) {
      put(kvKey, kv[2]);
      continue;
    }
    let r: RegExpExecArray | null;
    if ((r = /\bmajor is ([^.,;]+)/i.exec(t) ?? /\bmajoring in ([^.,;]+)/i.exec(t))) put('major', r[1]);
    else if ((r = /\b(?:studies|is studying) ([^.,;]+)/i.exec(t))) studies ??= r[1];
    if ((r = /\b(?:is from|comes from|grew up in|hometown is) ([^.,;]+)/i.exec(t))) put('hometown', r[1]);
    if ((r = /\bcomfort food is ([^.,;]+)/i.exec(t))) put('comfort_food', r[1]);
    if ((r = /\b(?:likes|loves|enjoys|is into) (?!to be called\b)([^.,;]+)/i.exec(t))) put('likes', r[1].replace(/\btheir\b/gi, 'your'));
    if ((r = /\b(?:has|have) (?:an? |the )?([^.,;]*?\b(?:exam|midterm|final|test|quiz))\b/i.exec(t))) put('exam', r[1]);
    if ((r = /\b(early bird|night owl)\b/i.exec(t))) put('chronotype', r[1].toLowerCase());
    if ((r = /\b(freshman|sophomore|junior|senior|grad student|graduate student|first year|second year|third year|fourth year)\b/i.exec(t))) {
      put('year', r[1].toLowerCase());
    }
  }
  put('major', studies);
  return facts;
}

// ───────────── the player's sums ─────────────
// "what's 9 plus 10?", "9+10", "6 * 7 = ?", "quick math: 15 divided by 3", "what is nine plus ten?": ONE operation on two
// numbers (digits, simple decimals, or number words up to nine hundred ninety-nine). The pig's answer is solved here,
// exactly (BigInt, so 0.1 + 0.2 is 0.3; a division is rounded to two decimals), from what the player TYPED, because
// normalize() drops the signs ("2*3" is "2 3" there). The answer lines only ever say {answer} and {expr}.
//
// A message is a sum only when it is nothing but the sum: a question word before it ("what's", "how much is",
// "calculate", "quick math:"), "= ?" or "equals what" or the answer the player has in mind ("9 + 10 = 21") after it.
// "we won 3-1", "what's 4-1-1 on the party?", "i need a 2x4" and "see you 10/31" are not sums. A "-", "x" or "/" with no
// spaces around it ("3-1", "2x4", "1920×1080", "10/31", "50/50") is as often a score, a size, a date or odds, so it counts
// only when something says it is math ("calculate 10/31", "6x7 = ?"); "9+10", "6 * 7", "10 divided by 4" and "3 - 1" always do.

export type ArithmeticOp = '+' | '-' | '*' | '/';

export interface Arithmetic {
  op: ArithmeticOp;
  /** The sum as a pig says it: "9 plus 10", "7 divided by 2", "negative 3 times 4". */
  expr: string;
  /**
   * The result as written: "19", "3.5", "negative 2", "25,000" (never "-2" or "19." at the start of a line, which the
   * post-filter would eat as a bullet). A division is rounded to two decimals. Absent for a division by zero.
   */
  answer?: string;
  /**
   * 'meme': 9 + 10 either way round, which the internet says is 21. 'zero': a division by zero (no answer).
   * 'approx': a division with decimals left over, so the answer is rounded.
   */
  kind?: 'meme' | 'zero' | 'approx';
}

const WORD_ONES: Readonly<Record<string, number>> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const WORD_TENS: Readonly<Record<string, number>> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const longestFirst = (words: Readonly<Record<string, number>>) => Object.keys(words).sort((a, b) => b.length - a.length).join('|');
const ONE_TO_NINE = 'one|two|three|four|five|six|seven|eight|nine';
const BELOW_100 = `(?:(?:${longestFirst(WORD_TENS)})(?:[ -](?:${ONE_TO_NINE}))?|${longestFirst(WORD_ONES)})`;
/** "nine", "twenty-one", "a hundred", "one hundred and five", "negative five". */
const WORD_NUMBER = `(?:negative )?(?:(?:a|${ONE_TO_NINE}) hundred(?: and)?(?:[ -]${BELOW_100})?|${BELOW_100})`;
/** "9", "1,250", "3.14", ".5", "-4": up to nine digits and three decimals, so every sum is exact and fits a line. */
const DIGIT_NUMBER = String.raw`-?(?:\d{1,3}(?:,\d{3}){1,2}|\d{1,9})(?:\.\d{1,3})?|-?\.\d{1,3}`;
const SUM_NUMBER = `(?:${DIGIT_NUMBER}|${WORD_NUMBER})`;

/** Before the sum: a greeting, the pig's name, a polite wrapper, a question word ("what's", "how much is", "quick math:"). */
const SUM_LEAD = String.raw`(?:(?:hey|hi|hello|yo|ok|okay|so|um|uh|oh|ooh|wait|well|alright|quick question|piggy ?[123]|(?:piggy|pig)(?=[,!:]))\b[,!.:]*\s+)*`;
const SUM_POLITE = String.raw`(?:(?:can|could|would|will) you (?:please )?(?:(?:tell me|do|solve|calculate|compute|figure out|work out) )?|do you know |tell me |please |pls |i need to know |any idea )?`;
const SUM_ASK = String.raw`what(?:'s| is|s| are| does)|wat'?s?(?: is)?|what|how much (?:is|are|does)|quick math|mental math|do the math|calculate|calc|compute|solve|evaluate|math`;
/** Words that say "this is math" on their own, so a tight "6x7" or "10/31" after them is a sum. */
const MATH_ASK = /^(?:calc|calculate|compute|solve|evaluate|quick math|mental math|do the math|math|how much)/;
const SUM_OP = String.raw`(?:\s+(?<word>plus|minus|times|multiplied by|divided by|over)\s+|(?<pre>\s*)(?<sym>[-+*×÷/x])(?<post>\s*))`;
/** After the sum: "= ?", "equals what", "= 21" (the answer the player has in mind), "please", the pig's name. */
const SUM_TAIL = String.raw`(?:\s*(?<eq>=+|equals?|is|makes?|gives?)\s*(?:what|\?+|${SUM_NUMBER})?)?(?:[\s,]+(?:please|pls|plz|right|correct|yeah|huh|lol|lmao|haha|piggy ?[123]|pigg?y|pig|buddy|friend|dude|bro|teammate))*[\s?!.]*`;
const SUM_RE = new RegExp(
  String.raw`^${SUM_LEAD}${SUM_POLITE}(?:(?<ask>${SUM_ASK})[:,]?\s*)?(?<a>${SUM_NUMBER})${SUM_OP}(?<b>${SUM_NUMBER})${SUM_TAIL}$`,
);

const WORD_OPS: Readonly<Record<string, ArithmeticOp>> = {
  plus: '+', minus: '-', times: '*', 'multiplied by': '*', 'divided by': '/', over: '/',
};
const SIGN_OPS: Readonly<Record<string, ArithmeticOp>> = { '+': '+', '-': '-', '*': '*', '×': '*', x: '*', '/': '/', '÷': '/' };
const OP_SAYS: Readonly<Record<ArithmeticOp, string>> = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };
/** Signs that are as often a score (3-1), a size (2x4, 1920×1080), a date (10/31) or odds (50/50) when nothing is spaced around them. */
const TIGHT_SIGNS: ReadonlySet<string> = new Set(['-', 'x', '×', '/']);

/** The message as the sum grammar reads it: lowercase, one space between words, math signs and quotes made plain. */
function cleanSum(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[✕✖]/g, '*')
    .replace(/➕/g, '+')
    .replace(/➖/g, '-')
    .replace(/➗/g, '/')
    .replace(/\p{Extended_Pictographic}|[\u200d\ufe0f]/gu, ' ')
    .replace(/[“”"()[\]]/g, ' ')
    .replace(/[‘’`´]/g, "'")
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A number exactly: `n / 10^s` (BigInt, so no 0.30000000000000004). */
interface Decimal {
  n: bigint;
  s: number;
}

const pow10 = (k: number) => 10n ** BigInt(k);

function wordsToNumber(words: string): number {
  let total = 0;
  for (const w of words.split(/[ -]+/)) {
    if (w === 'hundred') total = (total || 1) * 100;
    else if (w in WORD_ONES) total += WORD_ONES[w];
    else if (w in WORD_TENS) total += WORD_TENS[w];
  }
  return total;
}

/** One operand the grammar matched ("9", "1,250", "-.5", "twenty-one", "negative five") as an exact number. */
function toDecimal(text: string): Decimal {
  if (/^-?[\d.]/.test(text)) {
    const [whole, frac = ''] = text.replace(/,/g, '').replace(/^-/, '').split('.');
    const n = BigInt((whole || '0') + frac);
    return { n: text.startsWith('-') ? -n : n, s: frac.length };
  }
  const n = BigInt(wordsToNumber(text.replace(/^negative /, '')));
  return { n: text.startsWith('negative ') ? -n : n, s: 0 };
}

/** "19", "negative 2", "3.5", "25,000": no trailing zeros, commas from five digits, "negative" in words. */
function showDecimal({ n, s }: Decimal): string {
  const digits = (n < 0n ? -n : n).toString().padStart(s + 1, '0');
  let whole = digits.slice(0, digits.length - s);
  const frac = digits.slice(digits.length - s).replace(/0+$/, '');
  if (whole.length > 4) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = frac ? `${whole}.${frac}` : whole;
  return n < 0n ? `negative ${body}` : body;
}

/** `x / y` to two decimals (half away from zero); `exact` when nothing was left over. `y` is not zero. */
function divide(x: Decimal, y: Decimal): { value: Decimal; exact: boolean } {
  const num = x.n * pow10(y.s + 2);
  const den = y.n * pow10(x.s);
  const negative = num < 0n !== den < 0n;
  const top = num < 0n ? -num : num;
  const bottom = den < 0n ? -den : den;
  let q = top / bottom;
  const rest = top % bottom;
  if (2n * rest >= bottom) q += 1n;
  return { value: { n: negative ? -q : q, s: 2 }, exact: rest === 0n };
}

/**
 * The sum a message is, or null when it is anything else. Pure and deterministic; reads the raw text, not normalize().
 * parseArithmetic("what's 9 plus 10?") → { op: '+', expr: '9 plus 10', answer: '19', kind: 'meme' }.
 */
export function parseArithmetic(raw: string): Arithmetic | null {
  if (typeof raw !== 'string') return null;
  const text = cleanSum(raw);
  if (text.length < 3 || text.length > 100) return null;
  const g = SUM_RE.exec(text)?.groups;
  if (!g) return null;
  const op = g.word ? WORD_OPS[g.word] : SIGN_OPS[g.sym];
  if (!g.word && TIGHT_SIGNS.has(g.sym) && !(g.pre && g.post) && !MATH_ASK.test(g.ask ?? '') && !/^(?:=|equal)/.test(g.eq ?? '')) return null;

  const x = toDecimal(g.a);
  const y = toDecimal(g.b);
  const expr = `${showDecimal(x)} ${OP_SAYS[op]} ${showDecimal(y)}`;
  if (op === '/') {
    if (y.n === 0n) return { op, expr, kind: 'zero' };
    const { value, exact } = divide(x, y);
    return exact ? { op, expr, answer: showDecimal(value) } : { op, expr, answer: showDecimal(value), kind: 'approx' };
  }
  const s = Math.max(x.s, y.s);
  const [p, q] = [x.n * pow10(s - x.s), y.n * pow10(s - y.s)];
  const value: Decimal = op === '+' ? { n: p + q, s } : op === '-' ? { n: p - q, s } : { n: x.n * y.n, s: x.s + y.s };
  const answer = showDecimal(value);
  // 9 + 10, either way round: the "21" joke
  const [shownX, shownY] = [showDecimal(x), showDecimal(y)];
  const meme = op === '+' && ((shownX === '9' && shownY === '10') || (shownX === '10' && shownY === '9'));
  return meme ? { op, expr, answer, kind: 'meme' } : { op, expr, answer };
}
