// Intent detection: word-boundary regexes over normalized + typo-corrected text, weighted scoring,
// entity bonuses, and a runner-up for blended answers.
import type { PigId } from '../../types';
import { isDistress } from '../quirks';
import { COMMON_WORDS, allowedEdits, editDistance, normalize } from './normalize';
import { extractEntities, type Entities } from './entities';
import { isSubjectWord, parseArithmetic, statedMajor, type Arithmetic } from './template';

export const INTENTS = [
  'greeting', 'farewell', 'thanks', 'how_are_you', 'whats_up', 'compliment_looks', 'compliment_skill', 'affection',
  'hug', 'insult', 'apology', 'joke_request', 'ask_name', 'ask_about_self', 'ask_major', 'ask_hobby',
  'ask_favorite_food', 'ask_where', 'ask_schedule', 'hungry_talk', 'tired_talk', 'sick_talk', 'food_offer', 'study',
  'exam_stress', 'player_sad', 'player_happy', 'bored', 'weather', 'gators_football', 'campus_place', 'passion_p1',
  'passion_p2', 'passion_p3', 'ask_best', 'other_pig', 'yes', 'no', 'laugh', 'question_generic', 'go_gators',
  'based', 'patriot', 'bump', 'set', 'spike', 'pork_joke', 'distress', 'ask_about_me', 'share_self', 'followup',
  'ask_time', 'encourage', 'arithmetic', 'unknown',
] as const;

export type Intent = (typeof INTENTS)[number];

export interface IntentGuess {
  intent: Intent;
  topic?: string;
  score: number;
}

export interface IntentResult extends IntentGuess {
  /** Second-best intent when it scored close enough to blend into the answer. */
  runnerUp?: IntentGuess;
  entities: Entities;
  question: boolean;
  /** Normalized text (before typo correction). */
  normalized: string;
  /** Normalized text after typo correction (what the rules matched against). */
  corrected: string;
  /** The sum, for an 'arithmetic' intent: its words and its answer, solved in code (template.ts parseArithmetic). */
  math?: Arithmetic;
}

/** Intents that make a good one-line lead-in before a more specific answer ("Hey! …", "Ha! …"). */
export const LEAD_INTENTS: readonly Intent[] = ['greeting', 'thanks', 'laugh', 'apology', 'yes', 'no'];

/** Tie-break order (earlier wins). */
const PRIORITY: readonly Intent[] = [
  'distress', 'pork_joke', 'based', 'patriot', 'bump', 'set', 'spike', 'go_gators', 'arithmetic', 'insult', 'affection', 'hug',
  'encourage', 'food_offer', 'ask_best', 'exam_stress', 'player_sad', 'sick_talk', 'hungry_talk', 'tired_talk',
  'ask_where', 'ask_schedule', 'ask_time', 'ask_favorite_food', 'passion_p2', 'passion_p3', 'passion_p1', 'other_pig', 'campus_place',
  'gators_football', 'weather', 'study', 'player_happy', 'bored', 'compliment_skill', 'compliment_looks',
  'joke_request', 'ask_about_me', 'share_self', 'ask_name', 'ask_major', 'ask_hobby', 'ask_about_self',
  'how_are_you', 'whats_up', 'farewell', 'apology', 'thanks', 'greeting', 'followup', 'laugh', 'yes', 'no',
  'question_generic', 'unknown',
];

interface Rule {
  i: Intent;
  w: number;
  re: RegExp;
  topic?: string;
  /** Speaker-specific reading of the same words (e.g. "code" is CS to Piggy 1 but building to Piggy 3). */
  alt?: Partial<Record<PigId, { i: Intent; topic?: string }>>;
  /** Only counts when the whole message is short (≤ 5 words). */
  short?: boolean;
}

const r = (i: Intent, w: number, re: RegExp, topic?: string, extra: Partial<Rule> = {}): Rule => ({ i, w, re, topic, ...extra });

/**
 * What a pig can be asked to be ("are you a resident?"): school years, and for Piggy 2 the doctor's titles. Not a
 * title before "fan" or the name of something else ("are you a Dr Pepper fan?", "a Doctor Who fan?").
 */
const STATUS = String.raw`(?:student|freshman|sophomore|junior|senior|grad(?:uate)? student|med(?:ical)? student|phd student|resident(?! (?:evil|advis\w*|assistants?|directors?)\b)|intern|doctor|doc|dr|physician|surgeon|neuro ?surgeon|attending|md(?: phd)?|pgy(?: ?[1-7])?|researcher|scientist)(?! (?:pepper|(?:who )?fans?)\b)`;
/** "are you real?" asks what he is; "are you a real doctor?" asks his job. */
const REAL = String.raw`real(?! (?:doctor|doc|dr|surgeon|neuro ?surgeon|resident|student|med student|md|physician|attending)\b)`;

// One Piece vs JoJo: Piggy 3 always picks One Piece. The show and character names the comparison rules look for.
const OP_NAMES = String.raw`(?:one p(?:ie|ei)ce|luffy|zoro|sanji|straw hats?)`;
const JOJO_NAMES = String.raw`(?:jojo\w*|jjba|jotaro|giorno|joestar|bizarre adventure)`;

/**
 * X, the app (Piggy 3 is on it constantly): "are you on x", "do you use x", "x.com" (normalized "x com"), "x dot com",
 * "anything good on x", "what's on your timeline", "how's the timeline?", "your for you page", "doomscrolling again?". Not a
 * project's timeline ("the timeline is tight", "your timeline for finishing"). Never "x ray", "x axis",
 * "xbox", "spacex", "malcolm x", "solve for x", "depends on x" or "2 x 3"; not the player's own doomscrolling.
 */
const X_APP = new RegExp(
  String.raw`\bx(?: dot)? com\b` +
    String.raw`|\b(?:are you|you are|you|is he|he is) (?:still |always |ever |even |really |just )?on x\b` +
    String.raw`|\b(?:use|using|check|checking|scroll|scrolling|post on|posting on|follow (?:me|you) on|addicted to|obsessed with|(?:spend|spending|time) (?:so much |a lot of |all day |time )?on|anything (?:good |new |cool )?on|see (?:this |that |it |anything )?on|saw (?:this |that |it )?on|what is (?:new |good |happening )?on|read (?:it |this |that )?on) x\b(?! (?:ray|rays|axis|factor|chromosomes?|men|files|games|marks|as|to (?:solve|find|get|represent|stand|mean)|for (?:the|a|an))\b)` +
    String.raw`|\b(?:your|his) x (?:account|feed|timeline|posts?|app)\b|\bthe x app\b|\bx (?:feed|timeline|account|algorithm)\b` +
    String.raw`|\b(?:what is|anything(?: \w+)?|something(?: \w+)?|(?:saw|see|seen)(?: it| this| that)?) on (?:your|the|my) (?:timeline|tl|for you(?: page| feed)?|feed)\b` +
    String.raw`|\bhow is (?:the|your) (?:timeline|tl|feed)(?: (?:today|lately|tonight))?$|\byour (?:for you (?:page|feed)|fyp)\b` +
    String.raw`|^(?!.*\b(?:i|we) (?:am|was|were|keep|have been|got)\b).*\bdoom ?scroll\w*\b`,
);

/**
 * The player's own take that X beats Y: "x is (way) better (than y)", "x is the goat", "y is worse than x", "x over y".
 * Not when it is asked ("is x better…?", "would you pick x…") or negated ("x is not better", "i don't think…"),
 * and not when x is better than something else ("x is better than naruto"): those are no take on this match-up.
 */
function takeRule(x: string, y: string): RegExp {
  const better = String.raw`(?:better|superior|greater|goated|(?:the )?(?:best|goat|greatest))`;
  return new RegExp(
    String.raw`^(?!(?:is|are|was|were|do|does|did|would|will|can|could|should|which|what|who|why|how)\b)(?!.*\b(?:not|never|no way)\b)` +
      String.raw`.*\b(?:${x} (?:(?:is|are|was) )?(?:\w+ ){0,2}${better}\b(?! than (?!(?:the )?${y}\b))` +
      String.raw`|${y} (?:(?:is|are|was) )?(?:\w+ ){0,2}worse than (?:the )?${x}\b|${x} (?:over|beats) ${y}\b)`,
  );
}

/** Retired and expired medical equipment, as the player offers it to Piggy 2's collection. */
const GEAR = String.raw`(?:(?:old|expired|used|retired|broken|spare|extra|vintage|antique) )*(?:medical )?(?:stethoscopes?|equipment|gear|devices?|supplies|pulse ?ox\w*|thermometers?|monitors?|blood pressure cuffs?|otoscopes?|reflex hammers?)`;

const RULES: Rule[] = [
  // ── social ──
  r('greeting', 3, /^(?:hi+|hello+|hey+|heyy+|hii+|howdy|hola|yo+|ohayo|konnichiwa|greetings|aloha|hai|oink+)\b/),
  r('greeting', 2, /\b(?:hi+|hello+|he+y+|howdy|hola)\b/),
  r('greeting', 3, /\bgood (?:morning|afternoon|evening|day)\b/),
  r('greeting', 2.5, /^(?:morning|evening|afternoon)\b/),
  r('greeting', 3, /\b(?:nice|pleased|great) to meet you\b|\bwhat is good\b|\bhow do you do\b/),
  r('greeting', 1.5, /\boink+\b/),
  r('farewell', 3, /\b(?:bye+|goodbye|good bye|farewell|peace out|talk to you later|catch you later|see you(?: later| tomorrow| soon| around| next time)?|got to go|have to go|need to go|heading out|logging off|signing off|be right back|until next time|i am off|i am out)\b/),
  r('farewell', 3, /\bgood ?night\b|\bnight night\b|\bsleep (?:well|tight)\b|\bsweet dreams\b/),
  r('farewell', 3, /^(?:night|bye|later|laters)\b/),
  r('farewell', 1, /\blater\b/),
  r('thanks', 3, /\b(?:thanks+|thank you|thank u|much appreciated|appreciate (?:it|you|that|this)|cheers|grateful|thankful)\b/),
  r('how_are_you', 3, /\bhow are you\b/),
  r('how_are_you', 3, /\bhow (?:is|are) (?:it going|things|life|your day|your week|everything|your morning|your night|you doing|you feeling|you holding up)\b/),
  r('how_are_you', 3, /\bhow (?:you|ya) doing\b|\bhow have you been\b|\bhow do you feel\b|\bhow (?:are you|you) feeling\b|\bhow was your day\b/),
  r('how_are_you', 2.5, /\b(?:are you|you) (?:ok|okay|alright|all right|good|doing ok|doing okay|doing well|doing good)\b/),
  r('how_are_you', 2, /\b(?:how about you|what about you|and you)\b/),
  r('whats_up', 3, /\bwhat is up\b|\bwhat up\b/),
  r('whats_up', 3, /\bwhat are you (?:doing|up to)\b|\bwhat you doing\b|\bwhat are you doing right now\b/),
  r('whats_up', 2.5, /\bwhat is (?:new|going on|happening|the plan)\b|\banything new\b|\bwhat have you been (?:up to|doing)\b|\bwhat are you working on\b/),

  // ── compliments, affection, conflict ──
  r('compliment_looks', 3.5, /\b(?:you are|your|you|you look|looking) (?:so |really |very |super |kind of |pretty |soo |extra |too |such a |a )?(?:cute|adorable|handsome|pretty|gorgeous|beautiful|good looking|stylish|fluffy|precious|charming|lovely|photogenic|cutie|fashionable|dapper)\b/),
  r('compliment_looks', 2, /\b(?:cute|adorable|cutie|handsome|gorgeous|precious|cutest)\b/),
  r('compliment_looks', 3.5, /\b(?:nice|love|like|cool|great|cute|sick|awesome|neat) (?:the |that |your )?(?:outfit|hair|curls|fringe|spikes|hoodie|glasses|scrubs|uniform|jersey|snout|ears|tail|shirt|look|style|fit|tee|knee pads|shoes|hat)\b/),
  r('compliment_looks', 3.5, /\byou look (?:nice|good|great|amazing|cool|sharp|fresh|happy|adorable|cute|handsome)\b/),
  r('compliment_skill', 2.5, /\b(?:you are|your|you) (?:so |really |very |super |such a |an |a |kind of |pretty |soo )?(?:smart|clever|genius|talented|brilliant|amazing|awesome|cool|great|impressive|skilled|incredible|goat|legend|hardworking|hard working|inspiring|funny|kind|nice|sweet|strong|wise|helpful|thoughtful)\b/),
  r('compliment_skill', 3, /\b(?:good|great|nice|amazing|awesome|sick|cool|clean) (?:job|work|one|serve|spike|call|code|project|explanation|answer|point|rally|dig|block|build|print|idea|move|catch|pass)\b/),
  r('compliment_skill', 3, /\bwell done\b|\bproud of you\b|\bimpressive\b|\bkudos\b|\bbravo\b|\byou rock\b|\byou did (?:it|great|good|amazing)\b|\byou nailed it\b|\byou are the (?:best|goat|greatest)\b/),
  r('compliment_skill', 3.5, /\byou are (?:good|great|amazing|so good|really good) at\b|\byou (?:play|code|explain|build|teach|serve|spike) (?:so |really )?(?:well|good|great)\b/),
  r('compliment_skill', 2.5, /\b(?:best|great|amazing|good) (?:player|doctor|surgeon|coder|programmer|builder|engineer|teacher|teammate|friend|setter|hitter|scientist|student)\b/),
  r('affection', 4.5, /\bi (?:really |kind of |think i |actually |just |also |do |still )?(?:like|love|adore) (?:you|ya)\b/),
  r('affection', 3.5, /\blove (?:you|ya)\b/),
  r('affection', 4, /\b(?:i have a crush|crush on you|my crush|you are my (?:favorite|best friend|person|kempanion|favorite pig|favorite person)|i missed you|missed you|marry me|be my (?:boyfriend|partner|valentine|best friend|kempanion)|date me|go out with me|i care about you|you mean (?:a lot|so much|everything)|you are special|you make me happy)\b/),
  r('affection', 4, /\b(?:be friends|be (?:my|your) friends?|friends with me|we are friends|are we friends|we friends)\b/),
  r('affection', 2.5, /\bheartemoji\b|\bxoxo\b|\bmwah\b|\bkiss(?:es)?\b|\bsmooch\b/),
  r('hug', 3, /\b(?:hugs?|hugging|huggies|cuddles?|cuddling|snuggles?|snuggling|embrace|squeeze|hold you)\b/),
  r('hug', 4, /\bcan i (?:hug|pet|pat) you\b|\bgive (?:you|me) a hug\b|\bneed a hug\b|\bgroup hug\b|\bbear hug\b/),
  r('hug', 3, /\bhead ?pats?\b|\bpats? (?:you|your head)\b|\bpets? (?:you|your head)\b|\bboops?\b|\bscritch(?:es)?\b|\bear scratch(?:es)?\b/),
  r('insult', 3.5, /\b(?:you are|you|your) (?:so |really |very |a |an |such a |kind of |the )?(?:stupid|dumb|ugly|annoying|boring|lame|gross|smelly|stinky|useless|idiot|loser|fat|trash|garbage|terrible|worst|cringe|mid|creepy|jerk|clown|moron|dummy)\b/),
  r('insult', 4, /\bshut up\b|\bi hate you\b|\byou suck\b|\bgo away\b|\bleave me alone\b|\b(?:nobody|no one) likes you\b|\bscrew you\b|\bget lost\b|\bi do not like you\b/),
  r('insult', 1.5, /\b(?:stupid|dumb|idiot|loser|ugly|trash|garbage|cringe|lame|moron|dummy)\b/),
  r('insult', 3.5, /\b(?:you are|you) (?:a |just a |such a |an )?(?:pig|piggy|hog|swine|oinker)\b|\b(?:filthy|dirty|stinky|smelly) pig\b/, 'pig'),
  r('apology', 3, /\b(?:sorry|i apologize|apologies|my bad|forgive me|my fault|i did not mean|oops|whoops|pardon me)\b/),
  r('joke_request', 4, /\b(?:tell|say|know|got|have|hear) (?:me |us )?(?:a |any |another |some |one more |a good |a funny |your best )?(?:jokes?|puns?|something funny)\b/),
  r('joke_request', 3.5, /\bmake me (?:laugh|smile)\b|\bbe funny\b|\bfunny story\b|\bdad jokes?\b|\bknock knock\b/),
  r('joke_request', 2.5, /\b(?:jokes?|puns?)\b/),

  // ── about the pig ──
  r('ask_name', 3.5, /\bwhat is your name\b|\bwhat (?:do|should|can) i call you\b|\bwho are you\b|\byour name\b|\bwhat are you called\b|\bdo you have a (?:name|nickname)\b|\bwhy (?:are you|is your name) (?:called )?piggy\b|\bis piggy your (?:real )?name\b|\bwhat is your real name\b/),
  r('ask_name', 1.5, /\bnicknames?\b/),
  r('ask_about_self', 3.5, /\btell me (?:about|more about) (?:yourself|you)\b|\babout yourself\b|\bwho are you really\b|\bwhat are you like\b|\bdescribe yourself\b|\bwhat is your (?:story|deal|background|vibe|personality)\b|\bget to know you\b|\bintroduce yourself\b/),
  r('ask_about_self', 3.5, /\bwhere are you from\b|\bwhere did you grow up\b|\byour hometown\b|\bwhere is home for you\b/, 'hometown'),
  r('ask_about_self', 3.5, /\bhow old are you\b|\byour age\b|\bwhen is your birthday\b|\byour birthday\b|\bbirthday\b/, 'birthday'),
  r('ask_about_self', 3, new RegExp(String.raw`\bare you (?:a |an |actually a |really a )?(?:pig|${REAL}|human|robot|ai|bot|person|chatbot)\b|^what are you$`), 'what'),
  r('ask_about_self', 3.6, /\b(?:do|did) you (?:have|ever have|ever had) a (?:job|part[- ]time job)\b|\bhave you (?:ever )?(?:had a job|worked|tutored|been a (?:math )?tutor)\b|\bwhere do you work\b|\bwhat do you do for (?:work|money|a living)\b|\byour (?:old |first |last |part[- ]time )?job\b|\bwere you (?:ever )?a (?:math )?tutor\b|\bmathnasium\b|\byour (?:profession|occupation|career|line of work)\b/, 'job'),
  r('ask_about_self', 3.5, /\b(?:your|you) (?:blood type|height|favorite color|zodiac|star sign)\b|\bhow tall are you\b/, 'trivia'),
  r('ask_major', 3.5, /\bwhat (?:is|are) your (?:major|degree|program|field|year|track|specialty|classes|courses)\b|\bwhat do you (?:study|major in|research)\b|\bwhat are you (?:studying|majoring in|researching)\b|\bwhat classes\b/),
  // What he is and does. Piggy 2 is a doctor (an MD, a fourth-year neurosurgery resident), the other two are students:
  // "what do you do?", "are you a (real) doctor?", "are you still a student?", "do you have a phd?", "did you match?"
  // (the residency Match, never a bare "match"). Above a passion word ("surgeon", "doctor") and "are you a pig", below a
  // need or a feeling ("are you a doctor? i feel sick").
  r('ask_major', 3.9, new RegExp(
    String.raw`\bare you (?:still |already |actually |really |even |just |also |now |currently )?(?:(?:a|an|the) (?:(?:first|second|third|fourth|fifth|sixth|seventh|1st|2nd|3rd|4th|5th|6th|7th) year |\w+ )?)?${STATUS}\b` +
      String.raw`|\bare you (?:still |already |even )?(?:in|done with|finished with|out of|through) (?:med school|medical school|school|college|grad school|residency|training(?! for\b))\b` +
      String.raw`|\bdo you (?:have|hold) (?:a |an |your )?(?:phd|md(?: phd)?|doctorate|medical degree|medical license|degree)\b` +
      String.raw`|\b(?:did|have) you (?:already |ever |even |finally )?match(?:ed)?(?= (?:into|in|at|for|yet|already|anywhere|somewhere)\b|$)` +
      String.raw`|\bwhat (?:kind|type|sort) of (?:doctor|surgeon|resident|student|physician|md|major) are you\b` +
      String.raw`|\bwhat (?:year|pgy)(?: of (?:residency|med school|medical school|school|college))? are you\b` +
      String.raw`|\bwhat (?:exactly |even )?do you (?:actually |even |really )?do(?: exactly| again| anyway| anyways| all day| these days| nowadays| now| here)?(?: (?:pigg?y|pig) ?(?:1|2|3|one|two|three)| doc)?(?: (?:lol|lmao|haha\w*|tho|though|btw))?$`,
  )),
  r('ask_major', 1, /\b(?:major|degree|classes|courses|semester|thesis|dissertation)\b/),
  r('ask_hobby', 3.5, /\bhobb(?:y|ies)\b|\bfor fun\b|\bfree time\b|\bspare time\b|\bdays? off\b|\bwhat do you like (?:to do|doing)\b|\bwhat are you into\b|\binterests\b|\bwhat do you do (?:after class|on weekends?|at night|when you are not)\b|\boutside of (?:class|school|work)\b/),
  r('ask_hobby', 2.5, /\bdo you (?:like|watch|play|read|listen to|enjoy) (?:anime|games|video games|music|movies|tv|shows|books|manga|sports|any sports)\b/),
  r('ask_hobby', 1, /\bweekends?\b/),
  r('ask_favorite_food', 4, /\bfavorite (?:food|foods|snack|snacks|meal|dessert|treat|thing to eat|restaurant|place to eat|fruit|breakfast|lunch|dinner)\b/),
  r('ask_favorite_food', 3.5, /\bwhat do you (?:like to )?eat\b|\bwhat (?:food|foods|snacks?) do you (?:like|love|want)\b|\bwhat is your go to (?:food|snack|order)\b|\bdo you like (?:food|snacks|sweets|dessert|desserts|spicy food)\b|\bwhat should i (?:feed|get) you\b|\bwhat do you want to eat\b/),
  // his drink and his comfort food have their own answers (a food named in the message still wins: "is red bull your favorite drink?")
  r('ask_favorite_food', 4, /\bfavorite (?:drinks?|beverages?|thing to drink)\b|\bwhat do you (?:like to |want to |usually |normally |always )?drink\b|\bwhat (?:drinks?|beverages?) do you (?:like|love|want|get|order)\b|\bwhat is your (?:go to |usual )?drink\b/, 'drink'),
  // "Why sugar-free Red Bull?" asks about his can (the named drink sets the topic: ask_favorite_food:red_bull_sf)
  r('ask_favorite_food', 4.5, /\bwhy (?:the |so much |all the )?(?:sugar ?free |sf )?red ?bulls?\b|\bwhy sugar ?free\b|\bred ?bulls? again\b|\bhow many red ?bulls?\b|\bso (?:much|many) red ?bulls?\b/, 'drink'),
  r('ask_favorite_food', 4, /\b(?:your|you have a|you got a) (?:favorite |go to |usual )?comfort (?:foods?|snacks?|meals?)\b|\bwhat do you eat when you are (?:sad|stressed|down|tired|sick|upset)\b/, 'comfort'),
  r('ask_where', 3.5, /\bwhere (?:are|were) you\b|\bwhere is (?:he|piggy|pig)\b|\bwhere (?:can|do|would|will|should) i find\b|\bwhere do you (?:hang out|live|stay|usually go|spend|go)\b|\bwhere have you been\b|\bwhere (?:is|are) (?:the others|everyone|the boys|the pigs|everybody)\b|\bwhere to find\b/),
  r('ask_where', 1, /\bwhere\b/),
  r('ask_schedule', 3.5, /\b(?:your|you) (?:schedule|routine|plans)\b|\bwhen do you (?:wake up|sleep|go to bed|practice|have class|get up|work|study|eat|go to sleep|get home)\b|\bwhat time do you\b|\bwhen are you (?:free|busy|done|off|home|awake)\b|\bare you (?:free|busy)\b|\bwhat are you doing (?:later|tomorrow|tonight|this weekend|after|today|this afternoon)\b|\bbed ?time\b|\bwhen is (?:practice|class|your shift|rounds)\b|\bwhat is your day like\b|\bplans (?:for )?(?:today|tonight|tomorrow|this weekend|later)\b|\bwhat does your day look like\b|\bdaily routine\b/),
  r('ask_schedule', 2.5, /\bschedule\b/),

  // ── needs ──
  r('hungry_talk', 4, /\bi am (?:so |really |very |kind of |super |getting |pretty |actually |literally )?(?:hungry|starving|famished|starved|peckish|hangry)\b/),
  r('hungry_talk', 2.5, /\b(?:hungry|starving|famished|hangry|peckish|munchies)\b/),
  r('hungry_talk', 3.5, /\blets (?:eat|get food|grab food|get lunch|get dinner|grab lunch|grab dinner|get breakfast|get a snack|grab a bite|get something to eat)\b|\bgrab (?:a bite|food|lunch|dinner|a snack)\b|\b(?:snack|lunch|dinner|breakfast) time\b|\bwant to (?:eat|get food|grab food)\b|\bare you hungry\b|\bdid you eat\b|\bhave you eaten\b|\bwhen did you (?:last )?eat\b|\bwhat is for (?:lunch|dinner|breakfast)\b/),
  r('hungry_talk', 1, /\b(?:lunch|dinner|breakfast|brunch|food|eat|eating|meal)\b/),
  r('tired_talk', 4, /\bi am (?:so |really |very |kind of |super |dead |pretty |literally |getting )?(?:tired|sleepy|exhausted|drained|wiped|beat|burnt out|burned out|worn out|fried|dead tired)\b/),
  r('tired_talk', 2.5, /\b(?:tired|sleepy|exhausted|drowsy|yawn|yawns|zzz|insomnia|cannot sleep|all ?nighter|no sleep|need (?:a )?nap|nap time|need sleep|did not sleep|stayed up)\b/),
  r('tired_talk', 3.5, /\bare you (?:tired|sleepy)\b|\byou (?:look|seem|sound) (?:tired|sleepy|exhausted)\b|\bget some (?:rest|sleep)\b|\byou should (?:rest|sleep|nap|go to bed)\b|\bgo to (?:bed|sleep)\b|\btake a nap\b/),
  r('tired_talk', 1, /\b(?:sleep|nap|rest|bed|naps)\b/),
  r('sick_talk', 4, /\bi am (?:so |really |kind of |feeling |getting |a little )?(?:sick|ill|unwell|feverish|nauseous|congested)\b|\bi (?:feel|am feeling) (?:sick|ill|unwell|awful|terrible|gross|crummy|under the weather|feverish|nauseous)\b|\bi (?:have|got|caught|think i have) (?:a |the )?(?:cold|flu|fever|cough|headache|migraine|sore throat|stomach ?ache|virus|bug|stuffy nose|runny nose)\b/),
  r('sick_talk', 2, /\b(?:sick|flu|fever|cough|coughing|sneeze|sneezing|headache|migraine|nausea|sore throat|stomach ?ache|runny nose|under the weather|achoo)\b/),
  r('sick_talk', 3.5, /\bare you (?:sick|feeling sick|feeling better|feeling ok|feeling okay|feeling alright|ill)\b|\byou (?:look|seem|sound) (?:sick|pale|unwell|ill)\b|\bget well(?: soon)?\b|\bfeel better\b/),
  r('food_offer', 3.5, /\b(?:want|would you like|do you want|you want|care for|how about|have|try|grab) (?:a |an |some |the |my |this |something to )?(?:snack|snacks|bite|treat|treats|food|something to eat|lunch|dinner|drink)\b/),
  r('food_offer', 2.5, /\bi (?:brought|got|made|bought|baked|packed|saved) (?:you|some|this|a)\b|\bhere is (?:a|an|some|your)\b|\bhere you go\b|\bthis is for you\b|\bfor you\b|\bi will (?:buy|get) you\b|\blet me (?:buy|get) you\b|\bhave some\b|\btry some\b|\btry this\b|\beat this\b|\bshare (?:my|some|this)\b|\bmy treat\b/),

  // ── school & feelings ──
  r('study', 2, /\b(?:study|studying|studied|homework|assignment|assignments|problem set|pset|essay|lab report|readings?|lecture|lectures|class|project due|due tomorrow|due tonight|deadlines?|procrastinat\w*|focus|focusing|study group|study session|office hours|tutoring|tutor|notes|flashcards)\b/),
  r('study', 3.5, /\blets study\b|\bstudy (?:together|with me|buddy|buddies)\b|\bhelp me (?:study|with (?:my )?homework)\b|\bstudy tips?\b|\bhow do you study\b|\bwhere do you study\b|\bstudy spot\b|\bcannot focus\b/),
  r('exam_stress', 2.5, /\b(?:exam|exams|midterm|midterms|finals|test|tests|quiz|quizzes|mcat|gre|boards)\b/),
  r('exam_stress', 4.5, /\b(?:stressed|stressing|anxious|nervous|worried|panicking|freaking out|overwhelmed|scared|dreading) (?:about|for|over) (?:my |the |an |this |a |tomorrow is |the next )?(?:exam|midterm|final|test|quiz|class|grades?|finals|midterms|presentation)\b/),
  r('exam_stress', 2.5, /\bi (?:am going to|will|might|think i will|could) fail\b|\bfailing\b|\bflunk\w*\b|\bgpa\b|\bgrades?\b|\bstudy for\b|\bcramming\b|\bcram\b/),
  r('exam_stress', 2, /\b(?:stressed|stressed out|overwhelmed|anxious|so much work|too much work|behind on)\b/),
  r('player_sad', 4.5, /\bi (?:am|feel|am feeling|have been|have been feeling) (?:so |really |very |kind of |pretty |a bit |a little |super |just )?(?:sad|down|depressed|lonely|alone|bad|awful|terrible|upset|miserable|blue|low|homesick|heartbroken|hurt|unhappy|empty|lost|stuck|meh|not okay|not good|not great|crappy|rough|gloomy|discouraged|left out|invisible|like a failure)\b/),
  r('player_sad', 4, /\b(?:bad|rough|terrible|awful|hard|tough|long|crappy|horrible|sad|worst) day\b|\bday (?:was|is|has been) (?:bad|rough|terrible|awful|hard|the worst)\b|\b(?:nobody|no one) likes me\b|\bi miss (?:home|my family|my friends|my mom|my dad|my dog|my cat|my parents|my sister|my brother)\b|\bi am crying\b|\bi cried\b|\bbroke up\b|\bgot dumped\b|\bfeel like crying\b|\bi failed\b|\bi messed up\b|\bi got rejected\b|\bi did bad(?:ly)?\b|\b(?:i am having|i have|i had|i get|i got|i keep having|i keep getting|having|had) (?:a |an )?(?:\w+ )?(?:panic|anxiety) attacks?\b|\bi am panicking\b/),
  r('player_sad', 2, /\b(?:sad|lonely|depressed|homesick|crying|upset|miserable|heartbroken|unhappy|sadness)\b/),
  // 'distress' has no rule here: it is quirks.ts isDistress(), the same check that routes the message to the crisis
  // line before any brain (classifyIntent below), so the scripted brain and the router never disagree.
  r('player_happy', 3.5, /\bi (?:am|feel|am feeling) (?:so |really |very |super |kind of |pretty |just )?(?:happy|great|good|amazing|awesome|excited|fantastic|wonderful|proud|pumped|stoked|hyped|thrilled|blessed|better|relieved|glad)\b/),
  r('player_happy', 4, /\bi (?:passed|aced|nailed|crushed|won|finished|did it|made it|got (?:an a|a job|the job|an internship|the internship|in|accepted|a scholarship|an offer|a 100|a perfect score|a good grade))\b/),
  r('player_happy', 3, /\b(?:good|great|amazing|awesome|best|wonderful) (?:news|day|week)\b|\byay+\b|\bwoo+\b|\bwoohoo+\b|\bhooray\b|\bcelebrate\b|\bcelebration\b/),
  r('bored', 3.5, /\bbored\b|\bboring\b|\bnothing to do\b|\bentertain me\b|\bwhat should we do\b|\blets do something\b|\bwant to (?:do something|hang out|play something)\b|\blets (?:play|hang out|go somewhere|go out|do something fun)\b|\bplay (?:a game|with me|something)\b/),

  // ── world ──
  r('weather', 2.5, /\b(?:weather|rain|raining|rainy|rained|storm|storms|stormy|thunder|thunderstorm|thunderstorms|lightning|hurricane|tropical storm|forecast|humid|humidity|muggy|sunny|sunshine|cloudy|drizzle|downpour|umbrella|heat index|pollen|lovebugs?|cold front|freezing|chilly|temperature)\b/),
  r('weather', 3.5, /\b(?:it is|so|very|too|really) (?:hot|cold|humid|warm|chilly|sticky|nice out|nice outside|gross outside|raining|pouring|sunny|freezing)\b|\bnice (?:weather|day out)\b/),
  r('weather', 1, /\b(?:hot|cold|warm)\b/),
  r('gators_football', 3, /\b(?:football|game ?day|tailgat\w*|kickoff|touchdowns?|quarterback|field goal|florida georgia|georgia game|homecoming|gator walk|two bits|marching band|end zone|bowl game|the sway|season tickets|gator growl)\b/),
  r('gators_football', 3.5, /\bgators? (?:game|football|won|lost|win|lose|score|play|playing)\b|\bdid we win\b|\bthe game (?:today|tonight|tomorrow|this weekend|on saturday)\b|\bwho (?:won|is winning)\b/),
  r('gators_football', 2, /\b(?:basketball|baseball|softball|gymnastics|sec|the swamp)\b/),
  r('go_gators', 5, /\bgo+ gators?\b|\bgo gata\b|\bgator chomp\b|\bchomp(?: chomp)+\b|\bit is great to be a florida gator\b|^gators+$|^chomp$/),
  r('campus_place', 3.5, /\bfavorite (?:spot|place|building)(?: on campus)?\b|\bbest spot on campus\b/, 'any'),
  r('campus_place', 1.5, /\bcampus\b|\bwhere should we go\b|\blets go to\b|\bwant to go to\b|\bhave you (?:ever )?been to\b|\bever been to\b|\btake me to\b|\bmeet (?:me )?at\b/),

  // ── everyday small talk the pigs answer about themselves ──
  r('greeting', 3.5, /^oink+\b/, 'oink'),
  r('greeting', 4, /\bhappy (?:halloween|spooky season)\b|\btrick or treat\b/, 'halloween'),
  r('greeting', 4, /\b(?:merry christmas|happy holidays|happy hanukkah|happy thanksgiving|happy new year|happy diwali|happy lunar new year)\b/, 'holiday'),
  r('how_are_you', 3.8, /\b(?:how about you|what about you|and you|and yourself)$|^(?:i am |im )?(?:good|fine|okay|great|alright|not bad|pretty good|tired|ok)(?: thanks| thank you)? (?:and |what about |how about )?(?:you|yourself)$/),
  r('player_happy', 3.6, /^(?:(?:i am|i feel|i am feeling|doing|feeling) (?:good|fine|okay|alright|all right|great|well|not bad|pretty good)|good|fine|not bad|pretty good|doing good|doing well|doing fine|doing okay)(?: (?:thanks|thank you|too|honestly|mostly|i guess|actually))*$/, 'fine'),
  r('whats_up', 3.5, /\bwhat did you do (?:today|this morning|tonight|yesterday|this weekend)\b|\bwhat have you been doing\b|\bhow was your (?:morning|weekend)\b/),
  r('hungry_talk', 3.6, /\bare you hungry\b|\bdid you eat\b|\bhave you eaten\b|\bwhen did you (?:last )?eat\b|\byou (?:look|seem|sound) hungry\b|\byou should eat\b/, 'ask'),
  r('hungry_talk', 3.8, /\b(?:want to|lets|let us|should we|do you want to|we should|can we) (?:get|grab|have|go (?:get|for)|go out for|eat) (?:some |a |an )?(?:food|lunch|dinner|breakfast|brunch|snack|bite|something to eat|coffee|boba|pizza|ice cream|tacos)\b/, 'invite'),
  r('tired_talk', 3.6, /^(?!.*\bi (?:should|need to|have to|will|got to|am going to|might)\b).*(?:\bare you (?:tired|sleepy|exhausted)\b|\byou (?:look|seem|sound) (?:tired|sleepy|exhausted)\b|\byou should (?:get some |go to )?(?:rest|sleep|bed|nap)\b|\bgo (?:to bed|to sleep|rest|take a nap)\b|\bget some (?:rest|sleep)\b|\btake a nap\b)/, 'ask'),
  r('sick_talk', 3.6, /\bare you (?:sick|ill|feeling sick|feeling better|feeling ok|feeling okay|feeling alright|feeling unwell)\b|\byou (?:look|seem|sound) (?:sick|pale|unwell|ill)\b|\bget well(?: soon)?\b|\bhope you feel better\b|\bfeel better\b/, 'ask'),
  r('ask_about_self', 4, /\b(?:your|you) (?:favorite|fav) colou?r\b|\bwhat colou?r do you like\b/, 'color'),
  r('ask_about_self', 3.6, /\b(?:do you like|do you have|what about|thoughts on|opinion on|how do you feel about|fan of|favorite) (?:a |any )?(?:dogs?|cats?|puppies|kittens?|pets?|animals?|squirrels?|bats?|gators?|alligators?|birds?|bunnies|rabbits?|hamsters?)\b|\bfavorite animal\b/, 'animals'),
  r('ask_about_self', 3.8, /\b(?:girlfriend|boyfriend|gf|bf|single|dating|seeing anyone|seeing someone|date anyone|in a relationship|have a crush|got a crush|love life|significant other)\b/, 'dating'),
  r('ask_about_self', 3.8, /\bkempa(?: ai)?\b|\bkempanions?\b|\bbuddy program\b|\bwho (?:made|created|built|designed) you\b/, 'kempa'),
  r('ask_about_self', 4, new RegExp(String.raw`\bare you (?:a |an |actually a |really a )?(?:robot|ai|bot|chatbot|${REAL}|human|person)\b`), 'what'),
  r('ask_hobby', 3.6, /\b(?:music|songs?|playlists?|bands?|singers?|albums?|kpop|k pop|listen to)\b/, 'music'),
  r('ask_hobby', 3.6, /\bvideo games?\b|\bgaming\b|\bnintendo\b|\bplaystation\b|\bxbox\b|\bsteam deck\b/, 'games'),
  r('ask_hobby', 2, /\bgames?\b/, 'games'),
  r('ask_major', 4, /\bfavorite (?:class|subject|course|lecture|professor)\b/),
  r('ask_favorite_food', 3.8, /\b(?:good |best |favorite )?(?:restaurants?|places? to eat|food spots?|spots? to eat)\b|\bwhere (?:should|can|do) (?:i|we) (?:eat|get food|get lunch|get dinner)\b|\bwhere to eat\b/, 'places'),
  r('player_sad', 4.6, /\bdied\b(?! laughing| of laughter| inside)|\bpassed away\b|\bpassed on\b|\blost my (?:dog|cat|mom|dad|mother|father|grandma|grandpa|grandmother|grandfather|friend|pet|brother|sister|uncle|aunt)\b|\bfuneral\b|\bput down\b|\bis dying\b|\bgrieving\b|\bgrief\b|\brest in peace\b/, 'grief'),
  r('insult', 4, /\byou (?:smell|stink|reek)\b|\b(?:smelly|stinky)\b/, 'smell'),
  r('compliment_looks', 4.5, /\byou smell (?:nice|good|great|amazing|like (?:flowers|sakura|vanilla|cookies))\b/),
  r('compliment_looks', 3, /^aw+$/),
  r('based', 4, /\bwhat (?:does|is) based(?: mean)?\b|\bwhat do you mean by based\b|\bwhy (?:do you|does he) (?:always )?say based\b|\bmeaning of based\b/, 'meaning'),
  r('patriot', 4, /\bwhat (?:does|is) patriot(?: mean)?\b|\bwhy (?:do you|does he) (?:always )?say patriot\b|\bmeaning of patriot\b/, 'meaning'),
  r('ask_time', 4, /\bwhat time is it\b|\bwhat is the time\b|\bdo you (?:know|have) (?:what time it is|the time)\b|\bwhat day is (?:it|today)\b|\bwhat is the date\b|\bwhat is today\b/),
  r('encourage', 4.2, /\bgood luck\b|\bbreak a leg\b|\byou (?:got|have got|have) this\b|\byou (?:can|will) do (?:it|this|great)\b|\byou will do (?:great|amazing|well)\b|\bi believe in you\b|\brooting for you\b|\bcheering for you\b|\bknock (?:it|em|them) dead\b/),

  // ── Piggy 1: volleyball, CS, stats, Gatorade ──
  r('passion_p1', 3.5, /\bvolleyball\b|\bvolley\b|\bbeach volleyball\b|\boutside hitter\b|\blibero\b|\bsetter\b|\bmintonette\b/, 'volleyball'),
  r('passion_p1', 2, /\bspik(?:e|es|ing|ed)\b|\bbump(?:ing|ed|s)?\b|\bserv(?:e|es|ing)\b|\brally\b|\brallies\b|\bdig(?:s|ging)?\b|\bblock(?:s|ing|ed)?\b|\bace\b|\baces\b|\bjump serve\b|\bfree ball\b|\bside out\b|\bpancake\b|\bpractice\b|\bnet violations?\b|\bhitter\b|\bsetting\b|\bkill shot\b|\brotations?\b|\bknee pads?\b/, 'volleyball'),
  r('passion_p1', 3, /\bcomputer science\b|\bcomp sci\b|\bcs\b|\bcise\b|\balgorithms?\b|\bdata structures?\b|\bleetcode\b|\bcompetitive programming\b|\bbig o\b|\brecursion\b|\bcircular (?:queue|buffer)\b|\bround robin\b|\bgame dev\b|\bjava\b|\bpython\b|\bc\+\+\b|\bjavascript\b|\bmerge conflicts?\b|\btest coverage\b|\bunit tests?\b|\bcompiler\b|\bsegfault\b/, 'cs'),
  r('passion_p1', 2, /\bcod(?:e|es|ing|er|ers)\b|\bprogramming\b|\bprogrammer\b|\bdebug(?:ging)?\b|\bbugs?\b|\bsoftware\b|\bcomputers?\b/, 'cs', { alt: { 'piggy-3': { i: 'passion_p3', topic: 'building' } } }),
  r('passion_p1', 4, /\bwhat are you coding\b/, 'cs', { alt: { 'piggy-3': { i: 'passion_p3', topic: 'building' } } }),
  r('passion_p1', 2.5, /\bstats?\b|\bstatistics\b|\banalytics\b|\bserve (?:percentage|accuracy|stats)\b|\bdata analysis\b|\bpercentages?\b/, 'stats'),
  r('passion_p1', 3.5, /\bspreadsheets?\b|\bexcel\b|\bgoogle sheets\b|\bpivot tables?\b/, 'spreadsheet'),
  r('passion_p1', 3, /\bgatorade\b|\bsports drinks?\b|\belectrolytes?\b|\binvented (?:at uf|here)\b|\bsideline sip\b|\bcade\b/, 'gatorade'),
  r('passion_p1', 3.5, /\bhackathons?\b|\bswamphacks\b|\bhack night\b/, 'hackathon'),
  // match day: a volleyball match to Piggy 1 (and Piggy 3), the residency Match to Piggy 2
  r('passion_p1', 2, /\bmatch day\b/, 'volleyball', { alt: { 'piggy-2': { i: 'ask_major' } } }),

  // ── Piggy 2: neuro ──
  r('passion_p2', 2.5, /\bneuro ?surg\w*\b|\bneurosurgeons?\b|\bneuroscience\b|\bneurology\b|\bneuro\b|\bneurons?\b|\bcortex\b|\bgyri\b|\bglymphatic\b|\brhoton\b|\bnervous system\b|\bsynapses?\b|\bbrain surgery\b/, 'neurosurgery'),
  r('passion_p2', 2, /\bbrains?\b/, 'neurosurgery'),
  r('passion_p2', 2.5, /\bsurgery\b|\bsurgeons?\b|\boperating room\b|\bscrub(?:bing)? in\b|\bscrubs\b|\bsterile\b|\bneuromonitoring\b|\bsurgical\b/, 'neurosurgery'),
  r('passion_p2', 3.5, /\bischemi\w*\b|\bischaemi\w*\b|\bstrokes?\b|\bpenumbra\b|\btime is brain\b|\black of blood flow\b/, 'ischemia'),
  r('passion_p2', 3.5, /\bperfus\w*\b|\bblood flow\b|\bblood pressure\b|\bmean arterial pressure\b|\bcpp\b|\bcirculation\b|\bcircle of willis\b|\bblood supply\b/, 'perfusion'),
  r('passion_p2', 3.5, /\bcsf\b|\bcerebro ?spinal(?: fluid)?\b|\bspinal fluid\b|\blumbar drains?\b|\blumbar\b|\bevds?\b|\bexternal ventricular drains?\b|\bventricles?\b|\bintracranial(?: pressure)?\b|\bicp\b|\bhydrocephalus\b|\btragus\b/, 'csf'),
  r('passion_p2', 2, /\bdrain(?:s|ing|ed)?\b/, 'csf'),
  // "SCI" is a spinal cord injury, not "poli sci", "comp sci" or sci-fi; "Why pig spines?" is his chip
  r('passion_p2', 3.5, /\bspin(?:es?|al)\b|\bspinal cord\b|(?<!\b(?:poli|comp|data|rocket) )\bsci\b(?! fi\b)|\bspinal (?:cord )?injur(?:y|ies)\b|\bdecompress\w*\b|\bvertebra\w*\b|\bparaly\w*\b|\bwalk again\b/, 'spine'),
  r('passion_p2', 3.5, /\belectrodes?\b|\bmicro ?chips?\b|\bbrain chips?\b|\bimplants?\b|\bbci\b|\bbrain computer interfaces?\b|\becog\b|\butah array\b|\bdbs\b|\bdeep brain stimulation\b|\bneural (?:implants?|interfaces?)\b|\bneuralink\b/, 'electrodes'),
  r('passion_p2', 3.5, /\bpig models?\b|\bswine(?: models?)?\b|\bporcine\b|\blab pigs?\b|\banimal (?:research|models?|studies|testing)\b|\bminipigs?\b|\byucatan\b|\biacuc\b|\bprofessor snout\b|\bsir lancelot\b|\bresearch pigs?\b|\bpigs in (?:research|science|medicine)\b|\btranslational\b/, 'pig_models'),
  r('passion_p2', 3, /\bmri\b|\bmris\b|\bscans?\b|\bimaging\b|\bct scans?\b|\btesla\b|\bmcknight\b|\bbrain institute\b|\bmotion artifacts?\b|\bmagnets?\b/, 'mri'),
  r('passion_p2', 3.5, /\banatomy\b|\bcadavers?\b|\bdonors?\b|\bdissect\w*\b|\bformaldehyde\b|\bgross anatomy\b|\bbody donation\b/, 'anatomy'),
  // He collects (hogs) retired and expired medical equipment: labeled boxes at home and in the lab.
  r('passion_p2', 3.5, /\bhoard(?:s|ing|er)?\b|\b(?:old|expired|used|retired|decommissioned|vintage) (?:medical )?(?:equipment|gear|devices?|supplies|stethoscopes?|monitors?)\b|\bmedical (?:equipment|gear|devices?|supplies)\b|\bstethoscopes?\b|\byour (?:collection|boxes)\b/, 'collection'),
  r('passion_p2', 2, /\bcollect(?:s|ing|ion|or)?\b/, 'collection'),
  r('passion_p2', 2.5, /\bmed ?school\b|\bmedical school\b|\bmedicine\b|\bmd ?phd\b|\bmdphd\b|\bresidency\b|\brounds\b|\bpre ?med\b|\bwhite coat\b|\bstethoscope\b|\bclinicals?\b|\bshadowing\b/, 'medschool'),
  r('passion_p2', 3, /\b(?:your|the|his) research\b|\bresearch (?:going|project|lab)\b/, 'spine', {
    alt: { 'piggy-1': { i: 'passion_p1', topic: 'cs' }, 'piggy-3': { i: 'passion_p3', topic: 'signals' } },
  }),
  r('passion_p2', 1.5, /\bdoctors?\b|\bphysician\b|\bmedical\b|\bresearch\b/, 'medschool'),

  // ── Piggy 3: building ──
  r('passion_p3', 4, /\bcodex\b|\bcoding agents?\b|\bai agents?\b|\bagentic\b|\bcopilot\b/, 'codex'),
  r('passion_p3', 2, /\bagents?\b/, 'codex'),
  r('passion_p3', 3, /\bai\b|\bartificial intelligence\b|\bmachine learning\b|\bml\b|\bllms?\b|\blanguage models?\b|\bneural (?:nets?|networks?)\b|\bdeep learning\b|\btransformers?\b|\bgpt\w*\b|\bchatgpt\b|\bchatbots?\b|\bgemini\b|\bclaude\b|\bllama\b|\bfine ?tun\w*\b|\bbenchmarks?\b|\bnavigator(?: ai)?\b|\bbig brain\b|\bgatortron\b|\bembeddings?\b|\binference\b|\bquantiz\w*\b/, 'ai'),
  r('passion_p3', 1.5, /\bmodels?\b|\btraining\b|\bdatasets?\b|\bdata\b/, 'ai'),
  r('passion_p3', 3.5, /\bopen ?source\b|\bopen models?\b|\bopen weights?\b|\bgithub\b|\blinux\b|\blicens\w*\b|\bself ?host\w*\b|\blocal models?\b|\brun (?:it )?locally\b/, 'opensource'),
  r('passion_p3', 3.5, /\bhi ?per ?gator\b|\bhipergator\b|\bsuper ?computers?\b|\bgpus?\b|\bclusters?\b|\bslurm\b|\bblackwell\b|\bnvidia\b|\bjob queue\b|\bdgx\b/, 'hipergator'),
  r('passion_p3', 3.5, /\becg\b|\bekg\b|\bsignals?\b|\bsignal processing\b|\bartifacts?\b|\bheadbands?\b|\bseizure detection\b|\bwaveforms?\b|\bfourier\b|\bfft\b|\bbiosignals?\b/, 'signals'),
  r('passion_p3', 3.5, /\beeg\b|\bbrain ?waves?\b|\balpha waves?\b/, 'signals', { alt: { 'piggy-2': { i: 'passion_p2', topic: 'electrodes' } } }),
  // "What does an EEG show?" (his chip) asks for an explanation; Piggy 2 hears his electrodes, as above
  r('passion_p3', 3.8, /\bwhat (?:does|do|can) (?:an? |the |your )?eegs? (?:show|tell you|measure|read|record|pick up|see|do)\b|\bwhat (?:is|are) (?:an? )?eegs?\b|\bhow (?:does|do) (?:an? )?eegs? work\b/, 'eeg', { alt: { 'piggy-2': { i: 'passion_p2', topic: 'electrodes' } } }),
  r('passion_p3', 2.5, /\bprint(?:s)?\b|\bmake me (?:a|something)\b/, 'printing'),
  r('passion_p3', 3.5, /\b3d print\w*\b|\b3d printers?\b|\bprinters?\b|\bprinting\b|\bfilament\b|\bpla\b|\bspaghetti\b|\bmakerspace\b|\bcad\b|\bstl\b|\bprinted\b|\bnozzle\b|\blayer lines?\b/, 'printing'),
  r('passion_p3', 4, /\bone p(?:ie|ei)ce\b|\bluffy\b|\bzoro\b|\bsanji\b|\bgrand line\b|\bstraw hats?\b|\bgear (?:4|5|five|fourth|fifth)\b|\bpirate king\b|\bthousand sunny\b|\bdevil fruits?\b/, 'onepiece'),
  r('passion_p3', 2, /\bpirates?\b/, 'onepiece'),
  r('passion_p3', 4, /\bjojo\w*\b|\bjjba\b|\bstand (?:user|power)\b|\bmenacing\b|\bgo go go\b|\bora ora\b|\bza warudo\b|\bjotaro\b|\bgiorno\b|\bbizarre adventure\b|\bjoestar\b/, 'jojo'),
  // One Piece or JoJo, in any order or wording ("One Piece or JoJo?", "jojo vs one piece", "which is better…", "pick
  // one…"): the two rules above match it at 4 each, and the tie went to JoJo. He always picks One Piece.
  r('passion_p3', 4.5, new RegExp(String.raw`\b${OP_NAMES}\b.*\b${JOJO_NAMES}\b|\b${JOJO_NAMES}\b.*\b${OP_NAMES}\b`), 'opvsjojo'),
  // the player's own take ("jojo is better than one piece", "one piece is the goat") gets its own reaction
  r('passion_p3', 4.6, takeRule(JOJO_NAMES, OP_NAMES), 'jojo_better'),
  r('passion_p3', 4.6, takeRule(OP_NAMES, JOJO_NAMES), 'op_better'),
  // Buggy the Clown, the One Piece villain in his favorite joke: "who's Buggy?" right after he brings him up
  r('passion_p3', 4.2, /\bbuggy the clown\b|\bcaptain buggy\b|\bbuggy pirates?\b|\bwho is buggy\b|^buggy (?:is|was)\b|^(?:what is |about )?buggy$/, 'buggy'),
  r('passion_p3', 3.5, /\banime\b|\bmanga\b|\bpokemon\b|\bswampcon\b|\bcosplay\b|\bghibli\b|\bnaruto\b|\bdemon slayer\b|\bjujutsu kaisen\b|\bfrieren\b|\bchainsaw man\b|\botaku\b/, 'anime'),
  r('passion_p3', 3, /\bui\b|\bux\b|\buser interfaces?\b|\binterfaces?\b|\bdesigns?\b|\bdesigning\b|\bfigma\b|\bfonts?\b|\btypography\b|\bcomic sans\b|\bdashboards?\b|\bwebsites?\b|\bweb ?apps?\b|\bapps?\b|\blayout\b|\bpixel art\b|\bkempapager\b|\bpager\b|\bfrontend\b|\bcss\b|\bsvelte\b/, 'ui'),
  r('passion_p3', 4, /\bwhat are you (?:building|making|working on|printing|tinkering with|cooking up)\b|\byour (?:little )?(?:project|projects|thing|side project|prototype)\b|\blittle (?:project|thing)\b/, 'building'),
  r('passion_p3', 2, /\bprojects?\b|\bprototypes?\b|\bbuild(?:ing|s)?\b|\bship(?:ping|ped)?(?: it)?\b|\bdemo\b|\bside projects?\b|\btinker\w*\b|\bmaker\b|\bgadgets?\b/, 'building'),
  r('passion_p3', 3, /\bphysics\b|\bsimulations?\b|\bsimulating\b|\bquantum\b|\bligo\b|\bgravitational waves?\b|\bmicrokelvin\b|\bhiggs\b|\bparticles?\b|\bastronomy\b|\btelescopes?\b|\bobservatory\b|\bblack holes?\b|\bsaturn\b|\buniverse\b/, 'physics'),
  // He used to tutor math.
  r('passion_p3', 3, /\bmath(?:s|ematics)?\b|\bcalculus\b|\balgebra\b|\bgeometry\b|\btrig(?:onometry)?\b|\bfractions?\b|\blong division\b/, 'math'),
  r('passion_p3', 4.2, /\bmath (?:tricks?|hacks?|shortcuts?|puzzles?|riddles?|facts?)\b|\bmental math\b|\bteach me (?:some |a |any |a little |more )?math\b|\btimes tables?\b|\bmultiply(?:ing)? by (?:9|11|nine|eleven)\b|\bshortcuts? for (?:multiplying|multiplication|fractions|percentages?|percents?|division)\b/, 'mathtrick'),
  // X (the mumble and the "it's called X" correction are quirks.ts + heuristic/mumble.ts; these are the bank's answers)
  r('passion_p3', 4.4, X_APP, 'x'),
  r('passion_p3', 4.6, /\btwitter\b|\btweet(?:s|ed|ing)?\b|\bretweet\w*\b|\bbird app\b|\bthe bird (?:site|app)\b/, 'twitter'),
  // AI words he'd explain (the five the owner listed, plus "what is an LLM?")
  r('passion_p3', 4.3, /\bwhat (?:even )?(?:is|are) (?:an? )?(?:llms?|large language models?|language models?)\b|\bhow do (?:llms|large language models|language models|chatbots|ai models) (?:even )?(?:work|learn|think)\b|\bexplain (?:llms?|large language models?|language models?)\b/, 'llm'),
  r('passion_p3', 4.3, /\brlhf\b|\breinforcement learning from human feedback\b/, 'rlhf'),
  r('passion_p3', 4.3, /\brlvr\b|\bverifiable rewards?\b/, 'rlvr'),
  r('passion_p3', 4.3, /\bjev\b|\bdecision models?\b|\bsystem one models?\b/, 'jev'),
  r('passion_p3', 4.3, /\bfoundation models?\b/, 'foundation'),
  // medical AI over health records (his research side; Piggy 2 is the doctor)
  r('passion_p3', 4.3, /\bmedical (?:ai|models?|coding|records?|data)\b|\b(?:ai|models?) (?:in|for) (?:medicine|health ?care|hospitals?)\b|\bhealth ?care ai\b|\bclinical (?:ai|notes?|models?|data)\b|\bfhir\b|\bsynthetic patients?\b|\bsynthea\b|\bicd ?10\b|\behrs?\b|\b(?:electronic )?health records?\b/, 'medai'),
  // robots, someday (below "are you a robot?", which asks what he is)
  r('passion_p3', 3.5, /\brobots?\b|\brobotics\b|\bhumanoids?\b|\brobot arms?\b|\bteleop\w*\b|\bimitation learning\b|\bsim ?(?:2|to) ?real\b|\bvlas?\b/, 'robots'),
  r('ask_best', 4, /\b(?:what is|which is|what are|who is|which) (?:the |your )?best\b|\bbest (?:ai|model|models|laptop|phone|language|programming language|editor|gpu|printer|filament|anime|way|option|choice|study spot|place to study|food|snack|pizza|coffee|app|tool|framework|computer|keyboard|song|movie|game|one)\b|\bwhich (?:one )?(?:is|should i) (?:better|best|get|use|pick|choose|buy)\b|\bwhat should i (?:use|get|buy|pick|choose)\b|\bwhich is better\b|\bwhat is better\b|\bis \w+ better than\b/),
  r('ask_best', 1.5, /\bthe best\b|\bbetter than\b/),

  // ── more quick replies: Piggy 1's and Piggy 2's new chips, and the six shared ones ──
  // Every new topic has its own answer pool (lines/piggy*.ts) and an ANSWER_TOPICS entry (respond.ts). Weights sit above the
  // general rule of the same subject, so the specific question wins and plain talk keeps its old answer.

  // Piggy 1: his years as a researcher in Germany. Under share_self:hometown's 3.5, so "I'm from Germany" is still read back
  // as a hometown; not bare "german" ("I study German" is a stated major, below).
  r('passion_p1', 3.4, /\bgermany\b|\bdeutschland\b/, 'germany'),
  // his German: "say something in German", "do you speak German?", the words themselves
  r('passion_p1', 3.8, /\b(?:say|speak|sing|count|teach me|how do you say|translate)\b[^?]*\b(?:german|deutsch)\b|\bdo you (?:speak|know|understand) (?:any |some )?(?:german|deutsch)\b|\bguten (?:tag|morgen|abend)\b|\btschuss\b|\bauf wiedersehen\b/, 'german'),
  // Haikyu!! has its own answers (it used to count as plain volleyball talk). Under One Piece's 4, so "haikyu or one piece" still
  // gets his "we argue about it every Friday" line.
  r('passion_p1', 3.6, /\bhaikyu+\b|\bkarasuno\b|\bkageyama\b|\bbokuto\b|\bnishinoya\b|\btsukishima\b|\bfukurodani\b|\bnekoma\b|\bhinata\b(?! (?:hyuga|from naruto|of naruto)\b)/, 'haikyu'),
  r('passion_p1', 4, /\b(?:sand|beach) or indoor\b|\bindoor or (?:sand|beach)\b|\b(?:sand|beach|indoor) (?:vs|versus) (?:sand|beach|indoor)\b|\bsand volleyball\b/, 'sand'),
  // joining his club team ("can i join you" is any pig's invitation; "join your lab" is not his)
  r('passion_p1', 4, /\bjoin (?:your|the|his) (?:volleyball |club )?(?:team|club|squad|roster)\b|\b(?:can|could|may) i (?:come to|watch|try out for) (?:your |the )?(?:practice|team|club)\b|\btry ?outs?\b|\bmake the team\b/, 'team'),
  // the calls he yells: "volleyball lingo?", "what's a pancake?" (above the food reading of pancake)
  r('passion_p1', 4, /\bvolleyball (?:lingo|slang|terms?|jargon|calls?|vocab\w*)\b|\bwhat do (?:the|your) calls mean\b|\bwhat(?: does| is|'s)? (?:a |an |the )?(?:free ?ball|side ?out|pancake)\b/, 'calls'),
  // a named algorithm or "favorite algorithm" (bare "algorithms" stays general CS talk, at 3 above)
  r('passion_p1', 3.6, /\bfavorite (?:algorithm|data structure|sorting algorithm)s?\b|\bbinary search\b|\bmerge ?sort\b|\bquick ?sort\b|\bbubble ?sort\b|\bhash ?(?:maps?|tables?)\b|\blinked lists?\b|\bbreadth first\b|\bdepth first\b|\bbfs\b|\bdfs\b|\bdijkstra\b|\bsliding window\b/, 'algorithm'),
  r('passion_p1', 3.6, /\b(?:best|worst|funniest|weirdest|craziest|hardest|dumbest|favorite) bug\b|\bbug (?:stor(?:y|ies)|you (?:ever )?(?:fixed|found|wrote|hit))\b|\bdebugging stor(?:y|ies)\b/, 'bug'),

  // Piggy 2: offering him equipment for the collection. Finding it or asking about it stays 'collection' ("i found an old
  // stethoscope", "got any expired medical equipment?").
  r('passion_p2', 4, new RegExp(
    String.raw`\b(?:want|take|have|keep) (?:my|this|these|those|our|an?|some) ${GEAR}\b` +
      String.raw`|\bfor (?:your|the) collection\b|\bi (?:brought|got|saved) you (?:some |an? |my )?${GEAR}\b|\bi have (?:an? |some )?${GEAR}\b` +
      String.raw`|\b(?:donate|give you|bring you) (?:my |some |an? |this )?${GEAR}\b`,
  ), 'donation'),
  // not "pgy": "what pgy are you?" is ask_major's, above
  r('passion_p2', 4, /(?<!\bmy )\bresearch year\b|\bprotected (?:research )?time\b|\bdedicated research (?:time|year)\b|\blab year\b/, 'research_year'),
  // "OR" reads as "or" once normalized, so only "miss the or" (never the bare word) is the operating room
  r('passion_p2', 4, /\bmiss (?:the |being in the |being in )?(?:or|operating room|surgery|operating|scrubbing in)\b|\bdo you (?:still )?(?:operate|do surgery|do surgeries|scrub in)\b|\bsim lab\b/, 'or'),
  // over ask_major ("are you a doctor?") and 'neurosurgery': "why" asks why
  r('passion_p2', 4.2, /\bwhy (?:did you (?:choose|pick|go into|get into|become|want to (?:do|be|become)) |do you (?:do|like|love) |are you |be |become )?(?:a )?(?:neuro ?surg\w*|neurosurgeon|surgeon|doctor|medicine|med school|surgery)\b/, 'why'),
  r('passion_p2', 4, /\bcranial nerves?\b|\bvag(?:us|al)\b|\bolfactory\b|\btrigeminal\b|\bfacial nerve\b|\boptic nerve\b|\btrochlear\b|\bhypoglossal\b/, 'nerves'),
  // the lead lab pig (pig_models, above, lists him too, at 3.5)
  r('passion_p2', 4.2, /\bprofessor snout\b|\bwho is snout\b/, 'snout'),
  // his birthday is July 4; birthday itself stays 'birthday' (3.5)
  r('ask_about_self', 4, /\bjuly (?:4|4th|fourth)\b|\b(?:fourth|4th) of july\b|\bindependence day\b|\bfireworks?\b/, 'july4'),
  // "Am I based?" gets a score on his based scale (a bare "based" is still the hard quirk: "Patriot.")
  r('based', 4, /\bam i (?:(?:so|really|very|even|actually|still|kind of|also) )?based\b|\bhow based am i\b|\bbased scale\b|\bbased rating\b/, 'rate'),

  // the six shared chips: every pig answers each in his own way
  // "Hype me up!": the player asks for a pep talk (the 'encourage' rule above is the player cheering for the pig). Not "cheer me up",
  // which is comfort (player_sad), and below exam_stress / player_sad ("i'm stressed about my exam, give me a pep talk").
  r('encourage', 4.4, /\bhype me(?: up)?\b|\bpump me up\b|(?<!\b(?:no|not|without) )\bpep talk\b|\bcheer me on\b|\bmotivate me\b|\bi need (?:some )?(?:motivation|encouragement|a pep talk|a boost)\b/, 'hype'),
  r('ask_about_self', 4, /\bearly bird\b|\bnight owl\b|\bmorning person\b|\bnight person\b|\bmorning or night\b/, 'chronotype'),
  r('study', 4, /\bteach me (?:something|anything|a (?:fun )?fact|a thing)\b|\btell me (?:something|anything|a (?:fun |cool |random )?fact) (?:cool|interesting|new|fun|random|neat)\b|\b(?:fun|cool|random) facts?\b/, 'teach'),
  r('ask_about_self', 4, /\bwhat is your (?:biggest |big |life |dream )?(?:dream|goal)s?\b(?! (?:for|today|this|tonight)\b)|\byour dreams?\b|\bdream job\b|\bwhere do you see yourself\b|\bin (?:5|five|10|ten) years\b|\bwhen you grow up\b/, 'dream'),
  r('ask_hobby', 3.6, /\bwhat (?:are you|have you been) (?:watching|bingeing|binging)\b|\bwhat should (?:i|we) watch\b|\bwatching anything\b|\bany good shows\b|\bfavorite (?:shows?|series|tv shows?)\b/, 'shows'),
  r('ask_about_self', 4, /\bare you (?:so |really |very |super |kind of |pretty |a little |that )?competitive\b|\bhow competitive are you\b|\bdo you (?:hate|mind) losing\b|\bdo you (?:like|love|hate) to win\b|\bare you a (?:sore|bad|good) loser\b/, 'competitive'),

  // ── quirk words inside a longer message ──
  r('based', 3.5, /\bbased\b/),
  r('patriot', 3.5, /\bpatriots?\b/),

  // ── player talks about themself ──
  r('ask_about_me', 4, /\bwhat do you (?:know|remember) about me\b|\bdo you (?:remember|know) (?:me|my|who i am|anything about me)\b|\bwhat is my (?:name|major|comfort food|hometown|favorite food)\b|\bwho am i\b|\bguess my\b|\bremember me\b|\bask (?:me something|about me|me a question)\b|\bwhat do you think (?:of|about) me\b/),
  r('share_self', 3.5, /\bmy name is\b|\bcall me\b|\bi go by\b/, 'name'),
  r('share_self', 3.5, /\bi am (?:a |an )?(?:freshman|sophomore|junior|senior|grad student|graduate student|transfer student|phd student|med student|first year|second year|third year|fourth year|new student)\b/, 'year'),
  // share_self:major (a stated major) is scored in classifyIntent from template.ts statedMajor()
  r('share_self', 3.5, /\bi am from\b|\bi grew up in\b|\bmy hometown is\b/, 'hometown'),
  r('share_self', 2, /\bi (?:really )?(?:like|love|enjoy|adore|am into) (?!you\b|ya\b|it\b|that\b|this\b|your\b|when\b|how\b|to\b|the way\b)[a-z]+/, 'likes'),

  // ── short reactions ──
  r('yes', 3, /^(?:yes+|yeah+|yep|yup|yess|sure+|okay+|alright|aight|of course|definitely|absolutely|totally|certainly|mhm+|uh huh|sounds good|sounds great|deal|bet|for sure|i guess|why not|lets do it|yes please|indeed|affirmative|correct|right|you bet|i do|i will|i would|i think so|probably|maybe|perhaps|sure thing|go for it|lets go+|great|perfect|awesome|excellent|sounds fun)(?: (?:please|sure|thanks|thank you|okay|then|definitely|absolutely|yes|yeah|of course|lets go+|why not|i guess|totally))*$/, undefined, { short: true }),
  r('yes', 1.6, /^(?:yes+|yeah+|yep|yup|sure|okay|of course|definitely|absolutely|totally)\b/),
  r('no', 3, /^(?:no+|nope|nah+|naw|not really|no thanks|no thank you|never|i do not think so|negative|nuh uh|pass|hard pass|not now|maybe later|i do not|i will not|i would not|not yet|not today)(?: (?:thanks|thank you|sorry|really|way|not really|i am good|maybe later))*$/, undefined, { short: true }),
  r('no', 1.6, /^(?:no+|nope|nah+|naw)\b/),
  r('laugh', 3, /\b(?:lol+|lmao+|lmfao+|rofl|lul|kek|xd+|haha\w*|hah+|hehe\w*|heh|hihi|ahaha\w*|bahaha\w*|lolol\w*|ha ha\w*)\b/),
  r('laugh', 3, /\bthat is (?:so )?funny\b|\bhilarious\b|\bso funny\b|\bi am dead\b|\bi am crying laughing\b|\b(?:died|dying) laughing\b|\bi am dying\b|\byou are (?:so )?(?:funny|hilarious)\b/),
  r('followup', 4, /^(?:why|why not|how so|how come|why is that|why do you say that|but why|wait why)$/, 'why'),
  r('followup', 4, /^(?:tell me more|more|go on|and then|then what|keep going|say more|continue|elaborate|explain|explain more|explain that|what do you mean|what does that mean|meaning|what is that|what|huh|like what|such as|example|for example|give me an example|and|how|how does that work|how does it work|tell me more about (?:it|that))$/, 'more'),
  r('followup', 4, /^(?:really|for real|seriously|no way|is that true|are you sure|wait what|what really|for real though|you sure|no kidding|true)$/, 'really'),
  r('followup', 3.5, /^(?:hmm+|hm+|um+|uh+|err+|erm+|well|i do not know|not sure|let me think|thinking)$/, 'hmm'),
  r('followup', 3.5, /^(?:nothing|nothing much|not much|nm|nmu|just chilling|chilling|just vibing|vibing|same old|nothing really|not a lot)$/, 'nothing'),
  r('followup', 3.5, /^(?:same|me too|same here|mood|relatable|so true|facts)$/, 'ack'),
  r('followup', 3.5, /^(?:cool|nice|wow|oh|ohh|ah|ahh|interesting|neat|i see|got it|makes sense|whoa|woah|dang|sweet|fair|fair enough|gotcha|wild|oh nice|oh cool|that is cool|that is interesting|that is wild|so cool|very cool|smile)$/, 'ack'),
];

// ───────────── typo correction ─────────────

/** Single words worth correcting toward (typos of these get fixed before the rules run). */
const VOCAB = `hello howdy morning evening afternoon greetings goodbye goodnight thanks thank appreciate adorable handsome
gorgeous beautiful amazing awesome talented brilliant impressive genius incredible adore hugs cuddle cuddles snuggle
stupid annoying useless idiot sorry apologize apologies joke jokes funny hilarious hungry starving famished snack lunch
dinner breakfast tired sleepy exhausted drowsy sick fever headache migraine nauseous study studying homework
assignment library exam exams midterm midterms finals stressed anxious lonely depressed homesick miserable upset happy
excited bored boring weather raining thunderstorm humid hurricane lightning forecast football gameday tailgate touchdown
stadium gators chomp century carillon plaza marston malachowsky communicore anatomy shands swamp reitz midtown sakura
volleyball spike serve setter libero rally practice gatorade spreadsheet statistics analytics algorithm algorithms
programming computer hackathon mintonette neurosurgery neurosurgeon surgery surgeon perfusion ischemia ischemic
cerebrospinal spinal electrode electrodes microchip microchips implant porcine swine cadaver donors medicine medical
hospital neuroscience neurons cortex intracranial ventricle lumbar codex claude claudecode agents artificial intelligence models machine
learning hipergator supercomputer opensource github signals printing printer filament anime manga interface design
dashboard typography simulation physics building project prototype schedule birthday favorite remember weekend
hobbies hobby whatever because tomorrow definitely probably`
  .split(/\s+/)
  .filter(Boolean);

const KNOWN = new Set<string>([...COMMON_WORDS, ...VOCAB]);

/**
 * Real words the corrector would turn into a keyword: "comp sci" is not "chomp sci". A field of study is never a typo
 * either ("painting" is not "printing"), so a major is read back and remembered as the player said it.
 */
const NOT_TYPOS: ReadonlySet<string> = new Set(['comp']);

function correctToken(tok: string): string {
  if (tok.length < 4 || KNOWN.has(tok) || NOT_TYPOS.has(tok) || isSubjectWord(tok) || /\d/.test(tok)) return tok;
  let best = tok;
  let bestD = 99;
  for (const kw of VOCAB) {
    const max = allowedEdits(kw);
    if (max === 0 || kw[0] !== tok[0] || Math.abs(kw.length - tok.length) > max) continue;
    const d = editDistance(tok, kw, max);
    if (d <= max && d < bestD) {
      best = kw;
      bestD = d;
    }
  }
  return best;
}

export function correctTypos(tokens: readonly string[]): string[] {
  return tokens.map(correctToken);
}

/** What the rules read: the message normalized, then typo-corrected (memory.ts reads a major from the same text). */
export function correctedText(text: string): string {
  return correctTypos(normalize(text).tokens).join(' ');
}

/**
 * `text` (normalized) names one of the pigs' own topics outright ("perfusion", "volleyball", "codex"; not the broader
 * "computer science" or "physics", which are majors too).
 */
export function isPassionTopic(text: string): boolean {
  return RULES.some((rule) => rule.w > 3 && rule.i.startsWith('passion_') && rule.re.test(text));
}

// ───────────── classification ─────────────

const EXACT_QUIRKS: Record<string, Intent> = { based: 'based', patriot: 'patriot', bump: 'bump', set: 'set', spike: 'spike' };

const OFFER_WORDS = /\b(?:want|have|try|eat|bring|brought|share|buy|bought|made|got you|got some|for you|here|craving|would you like|how about|grab|treat|give|gift|packed|saved)\b/;
const OPINION_WORDS = /\b(?:like|love|enjoy|into|hate|favorite|think of|opinion|taste|tasty|good|gross|feel about|thoughts on|rate)\b/;
/** "Hey Piggy 1, …" — the name used as an address, not as the topic. */
const VOCATIVE = /^(?:(?:hi|hey|hello|yo|okay|so|oh|good morning|morning|dear)\s+)?(?:pigg?y|pig|p) ?(?:1|2|3|one|two|three)\b/;
const OTHER_PIG_WORDS =/\bwhat do you think (?:of|about)\b|\bdo you like\b|\btell me about\b|\bfriends?\b|\bget along\b|\broommates?\b|\bwhat is (?:he|piggy \w+) like\b|\bhow is\b/;
/** A message that ends by asking the same thing back ("…, what about you?", "hbu"). */
const ASKED_BACK = /\b(?:how about you|what about you|and you|and yourself|what is yours|how about yours|what about yours)$/;

interface Acc {
  score: number;
  topic?: string;
  topW: number;
  hits: number[];
}

/**
 * Classify a player message. `pig` (optional) resolves words whose meaning depends on who is listening.
 * Pure and deterministic.
 */
export function classifyIntent(text: string, pig?: PigId): IntentResult {
  const n = normalize(text);
  const corrected = correctTypos(n.tokens).join(' ');
  const entities = extractEntities(corrected);
  const acc = new Map<Intent, Acc>();
  const add = (i: Intent, w: number, topic?: string) => {
    let a = acc.get(i);
    if (!a) acc.set(i, (a = { score: 0, topW: 0, hits: [] }));
    a.hits.push(w);
    if (topic && w >= a.topW) {
      a.topic = topic;
      a.topW = w;
    }
  };

  const shortMsg = n.tokens.length <= 5;
  for (const rule of RULES) {
    if (rule.short && !shortMsg) continue;
    if (!rule.re.test(corrected)) continue;
    const alt = pig ? rule.alt?.[pig] : undefined;
    if (alt) add(alt.i, rule.w, alt.topic);
    else add(rule.i, rule.w, rule.topic);
  }

  // A stated major outranks its subject's words ("my major is computer science" is not CS small talk). "I study X"
  // (X a field of study) is one too, unless X is one of the pigs' topics ("i'm studying perfusion": that topic's
  // answer, and memory.ts doesn't file it either).
  const major = statedMajor(corrected);
  if (major) {
    add('share_self', major.strong ? 4.2 : major.value && isPassionTopic(major.value) ? 3 : 3.8, 'major');
    // "I'm a CS major, hbu?" asks for his major back, not how he is
    if (ASKED_BACK.test(corrected) && !/\bhow (?:are|is|have|was) (?:you|it|things|life|your)\b/.test(corrected)) acc.delete('how_are_you');
  }

  // "what's 9 plus 10?", "9+10", "6 * 7 = ?": a message that is nothing but a sum is read from the raw text (normalize()
  // drops the signs) and beats every word in it ("quick math" is not Piggy 3's math talk). Its topic is what is special
  // about it: 'meme' (9 + 10), 'zero' (a division by zero), 'approx' (a division with decimals left over).
  const math = parseArithmetic(text);
  if (math) add('arithmetic', 6, math.kind);

  // His program and ambassador role are identity questions, not a generic AI or coding topic.
  if (pig === 'piggy-1') {
    if (/\b(?:aibhs|(?:ai|artificial intelligence) in biomedical and health sciences)\b/.test(corrected) && !major?.value) add('ask_major', 5);
    if (/\bambassador\b|\bkempa ai\b|^what do you do[?!.]*$/.test(corrected)) add('ask_about_self', 5, 'job');
    // His research questions have their own answers; the other pigs retain their existing subject routes.
    // A player's stated field still goes through share_self rather than becoming a lecture about his work.
    if (!major?.value && !entities.pigs.some((p) => p !== pig)) {
      if (/\b(?:research(?! year\b)|researching)\b|\bdata(?:set)? (?:labels?|leakage|splits?|curation)\b|\bmechanistic interpretability\b/.test(corrected)) add('passion_p1', 4, 'research');
      if (/\bnlp\b|\bnatural language (?:processing|inference)\b|\bnli\b|\blanguage (?:research|data|ambiguity)\b|\btext (?:classification|annotations?)\b/.test(corrected)) add('passion_p1', 4.5, 'nlp');
      if (/\b(?:medical|clinical|health ?care|interpretable|explainable) ai\b|\bai (?:in|for) (?:medicine|health ?care)\b|\bmri\b|\bmultimodal\b|\bclinical (?:notes?|data|models?)\b|\bknowledge graphs?\b/.test(corrected)) add('passion_p1', 6, 'health_ai');
      if (/\b(?:ai|research|data) ethics\b|\bethical ai\b|\b(?:algorithmic|model|dataset) (?:bias|fairness)\b|\bresponsible ai\b/.test(corrected)) add('passion_p1', 4.7, 'ethics');
      if (/\beconomics?\b|\bopportunity costs?\b|\bcareer pathways?\b|\bengineering education\b/.test(corrected)) add('passion_p1', 4.5, 'economics');
    }
  }

  // entity bonuses
  if (entities.pork) add('pork_joke', 7);
  const food = entities.foods[0];
  if (food) {
    if (OFFER_WORDS.test(corrected)) add('food_offer', 4, food.id);
    else if (OPINION_WORDS.test(corrected)) add('ask_favorite_food', 3.5, food.id);
    else add('food_offer', 2.5, food.id);
  }
  const place = entities.places[0];
  if (place) add('campus_place', 2.5, place);
  // A mention of the listening pig himself is usually just his name ("Hey Piggy 1, how are you?").
  const otherPig = entities.pigs.find((p) => p !== pig) ?? entities.pigs[0];
  const vocative = VOCATIVE.test(corrected) && entities.pigs.length === 1 && n.tokens.length > 3;
  if (otherPig && (otherPig === pig || vocative)) {
    add('other_pig', 1.5, otherPig);
  } else if (otherPig) {
    add('other_pig', 3, otherPig);
    if (OTHER_PIG_WORDS.test(corrected)) add('other_pig', 1.5, otherPig);
  } else if (entities.allPigs) {
    add('other_pig', 3, 'all');
  }

  // Claude is Piggy 1's coding teammate; Piggy 3 takes the other side of their friendly rivalry.
  // Keep introductions and questions about another pig on their own topics, even if Claude is mentioned.
  const claude = /\bclaude(?: ?code)?\b/.test(corrected);
  const disclosure = major || ['name', 'year', 'hometown'].includes(acc.get('share_self')?.topic ?? '');
  const aboutOtherPig = otherPig && otherPig !== pig && !vocative;
  if (claude && !disclosure && aboutOtherPig && (pig === 'piggy-1' || pig === 'piggy-3')) {
    acc.delete('passion_p3');
    add('other_pig', 5.2, otherPig);
  }
  if (claude && !disclosure && !aboutOtherPig) {
    if (pig === 'piggy-1' || pig === 'piggy-3') {
      // A comparison also hits Codex, code and AI rules; those are the same question, not extra evidence.
      acc.delete('passion_p3');
      add('passion_p1', 5.2, 'claude');
    } else if (/\bclaude code\b/.test(corrected)) add('passion_p3', 4, 'codex');
  }

  // combine hits with diminishing returns
  const guesses: IntentGuess[] = [];
  for (const [intent, a] of acc) {
    const sorted = a.hits.sort((x, y) => y - x);
    const top = sorted[0];
    const rest = sorted.slice(1).reduce((s, v) => s + v, 0);
    let score = top + 0.35 * rest;
    if (shortMsg && n.tokens.length <= 2) score *= 1.3;
    guesses.push({ intent, topic: a.topic, score });
  }

  // a typed quirk word on its own is a hard rule, regardless of anything else
  const exact = EXACT_QUIRKS[n.text];
  if (exact) guesses.push({ intent: exact, score: 99 });
  if (n.text === 'codex') guesses.push({ intent: 'passion_p3', topic: 'codex', score: 99 });
  // crisis language beats everything, and it is exactly what the router sends to the crisis line (quirks.ts)
  if (isDistress(text)) guesses.push({ intent: 'distress', score: 100 });

  const rank = (i: Intent) => PRIORITY.indexOf(i);
  guesses.sort((a, b) => b.score - a.score || rank(a.intent) - rank(b.intent));

  let best: IntentGuess = guesses[0] ?? { intent: 'unknown', score: 0 };
  let runnerUp: IntentGuess | undefined;
  // "Hi! How's volleyball?" — answer the content and keep the greeting as a lead-in.
  if (LEAD_INTENTS.includes(best.intent) && best.score < 99) {
    const content = guesses.find((g) => !LEAD_INTENTS.includes(g.intent) && g.score >= 2);
    if (content) {
      runnerUp = best;
      best = content;
    }
  }
  if (best.score < 1.5) best = { intent: n.question ? 'question_generic' : 'unknown', score: best.score };
  if (!runnerUp) {
    const second = guesses.find((g) => g.intent !== best.intent);
    if (second && second.score >= 1.5 && second.score >= best.score * 0.5) runnerUp = second;
  }

  // topics that come from entities rather than from a rule
  if (best.intent === 'ask_where') best = { ...best, topic: otherPig ?? (entities.allPigs ? 'all' : 'self') };
  if (best.intent === 'campus_place' && place) best = { ...best, topic: place };
  if ((best.intent === 'food_offer' || best.intent === 'ask_favorite_food') && food) best = { ...best, topic: food.id };
  if (best.intent === 'weather') best = { ...best, topic: weatherTopic(corrected) };

  return {
    ...best,
    runnerUp,
    entities,
    question: n.question,
    normalized: n.text,
    corrected,
    ...(best.intent === 'arithmetic' && math ? { math } : {}),
  };
}

function weatherTopic(t: string): string | undefined {
  if (/\b(?:rain|raining|rainy|rained|storm|storms|stormy|thunder\w*|lightning|hurricane|tropical storm|drizzle|downpour|umbrella|pouring)\b/.test(t)) return 'rain';
  if (/\b(?:cold|chilly|freezing|cold front)\b/.test(t)) return 'cold';
  if (/\b(?:hot|humid|humidity|muggy|heat index|sticky|warm|sunny|sunshine)\b/.test(t)) return 'hot';
  return undefined;
}
