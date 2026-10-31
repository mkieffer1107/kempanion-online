// Deterministic intercepts that run BEFORE any brain (ARCHITECTURE §6, GAME_DESIGN §2/§11).
// Hard quirks live here, never in the LLM prompt ("says X a lot" makes small models answer "Patriot." to "hi!").
// Pure module, exported for the heuristic brain and tests.
import { PIG_IDS, type AnimId, type ChatReply, type ChatTurn, type Expression, type PigId } from '../types';
// A cycle (intents.ts reads isDistress from here): fine as long as neither module calls the other at load time, only
// inside functions. needsCheckIn() asks the classifier whether the Heuristic Brain understands a message. Import the
// classifier itself, never './heuristic' (its line banks read CRISIS_CALL when they load).
import { classifyIntent } from './heuristic/intents';
// Piggy 3's X bit: pure content with no imports from the line banks (safe to load from here, like the classifier).
import { isTwitterQuestion, mumbleKindOf, mumbleReply, X_CORRECTIONS } from './heuristic/mumble';

export type QuirkKind = 'hard' | 'gators' | 'medical' | 'distress' | 'checkin' | 'wholesome';

export interface QuirkHit {
  kind: QuirkKind;
  /** Safety intercepts (distress, check-in, medical, explicit) carry no bond/fun effects and skip memory extraction. */
  safety: boolean;
  reply: ChatReply;
}

export interface QuirkInput {
  pig: PigId;
  playerText: string;
  history?: ChatTurn[];
}

/** UF Counseling & Wellness Center (24/7 line) and the national Suicide & Crisis Lifeline. */
export const UF_CWC_PHONE = '352-392-1575';
export const CRISIS_LINE = '988';
/**
 * The number as the pigs say it: non-breaking hyphens (U+2011, half-width like "-" in DotGothic16) keep it on one
 * row, where a plain hyphen lets phones wrap it as "352-" / "392-1575".
 */
export const UF_CWC_PHONE_NOWRAP = UF_CWC_PHONE.replace(/-/g, String.fromCharCode(0x2011));

const FUN_EFFECTS = { bond: 2, fun: 3 } as const;

/** Lowercase, straight quotes, emoji and punctuation → spaces, collapsed. "BASED!!!" → "based". */
export function normalizeForQuirk(text: string): string {
  return (text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, ' ')
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercase text that keeps punctuation (for phrase regexes). */
function lower(text: string): string {
  return (text ?? '').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
}

// ───────────────────────── safety ─────────────────────────

/** Contractions spelled out, with or without the apostrophe ("didn't", "didnt" → "did not"; "wanna" → "want to"). */
const NOT_FORMS: Record<string, string> = {
  dont: 'do not', doesnt: 'does not', didnt: 'did not', wouldnt: 'would not', couldnt: 'could not',
  shouldnt: 'should not', wont: 'will not', cant: 'cannot', isnt: 'is not', arent: 'are not', wasnt: 'was not',
  werent: 'were not', havent: 'have not', hasnt: 'has not', aint: 'is not',
};

/** Words a texted "2" follows where it means "to" ("i want 2 die", "nothing 2 live for"; never "i ran 2 kms"). */
const TWO_MEANS_TO =
  /\b(want|wants|going|ready|need|needs|have|has|plan|planning|deserve|deserves|about|wish|trying|tried|try|how|way|ways|reason|nothing|decided|supposed|used) 2 (?=\p{L})/gu;

/**
 * What the safety rules read: lowercase, contractions spelled out ("can't" → "cannot", "i'd" → "i would", "gonna" →
 * "going to"), a texted "2" read as "to", "myslef" as "myself".
 */
function crisisText(text: string): string {
  return lower(text)
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/n't\b/g, ' not')
    .replace(/\b(?:dont|doesnt|didnt|wouldnt|couldnt|shouldnt|wont|cant|isnt|arent|wasnt|werent|havent|hasnt|aint)\b/g, (w) => NOT_FORMS[w])
    // "i'd rather be dead", "i wish i'd never been born", "id rather die" (never "my student id")
    .replace(/\bi'd\b|\bid(?= (?:rather|sooner|like to|love to|never|be better|be happier|just|honestly|probably)\b)/g, 'i would')
    .replace(/\bwanna\b/g, 'want to')
    .replace(/\bgonna\b/g, 'going to')
    .replace(TWO_MEANS_TO, '$1 to ')
    .replace(/\bmy ?(?:slef|sefl|sself|selfe)\b/g, 'myself');
}

/** Hurting oneself by accident ("i cut myself shaving", "i hurt myself at practice"), not self-harm. */
const BY_ACCIDENT =
  '(?! (?:shaving|cooking|chopping|slicing|on|at|while|with|by accident|accidentally|during|playing|practicing|lifting|running|skating|falling|laughing|in (?:the kitchen|practice|the gym)|working out)\\b)';
/**
 * Idioms and sports: "cut myself some slack", "burn myself out", "shoot myself a text", "shot myself in the foot", "gas
 * myself up", "i'm going to hurt myself laughing / at practice".
 */
const NOT_HARM =
  '(?! (?:a |an )?(?:text|email|e mail|message|dm|reminder|note|pic|photo|selfie|link|line|slice|piece|snack|plate|bowl|cup|break|treat)s?\\b| some slack\\b| in the (?:foot|feet)\\b| (?:up|out|off|short|loose|laughing|lifting|playing|running|working out)\\b| (?:at|in) (?:the gym|practice|the game|the match|volleyball)\\b)';
/** What someone says before a plan: "i want to…", "i'm going to…", "thinking about…", "i feel like…". */
const INTENT =
  '(?:want|wanted|wanting|going|plan|planning|planned|ready|about|decided|deciding|trying|tried|try|thinking about|thinking of|think about|think of|thought about|thought of|considering|feel like|feeling like|felt like|urge|urges|tempted|close)';
/** Ways to harm oneself after a plan word ("i want to hang myself"). Drowning has its own rule ("…in work" is an idiom). */
const HARM_VERBS =
  '(?:hang|hanging|stab|stabbing|poison|poisoning|suffocate|suffocating|strangle|strangling|smother|smothering|electrocute|electrocuting|asphyxiate|asphyxiating|shoot|shooting|gas|gassing|cut|cutting|hurt|hurting|harm|harming|burn|burning|starve|starving)';
/** HARM_VERBS in every tense, for "i stabbed myself" with no plan word before it. */
const HARM_FORMS =
  '(?:hurt|hurting|harm|harming|harmed|cut|cutting|burn|burning|burned|burnt|starve|starving|starved|hang|hanging|hanged|stab|stabbing|stabbed|poison|poisoning|poisoned|suffocate|suffocating|suffocated|strangle|strangling|strangled|smother|smothering|smothered|electrocute|electrocuting|electrocuted|asphyxiate|asphyxiating|asphyxiated|shoot|shooting|shot|gas|gassing|gassed)';
const PILLS =
  '(?:pills|meds|medicine|medication|medications|tablets|capsules|painkillers|sleeping pills|antidepressants|tylenol|advil|ibuprofen|acetaminophen|aspirin|xanax|benadryl|melatonin|nyquil|insulin|oxy|oxycodone|percocet|vicodin|adderall|prozac|zoloft|lexapro|seroquel|ambien)';
/** "overdose on caffeine / anime": hyperbole. */
const OD_JOKE =
  '(?! on (?:coffee|caffeine|sugar|candy|boba|anime|tiktok|memes|cuteness|cute|love|chocolate|ramen|pizza|snacks|food|energy drinks?|matcha|vibes|serotonin|dopamine|sleep|naps?|carbs|cookies|cheese|work|homework|studying|netflix|k ?dramas?)\\b)';
/** "go on the trip", "go on without coffee", "go on until i finish": not "i can't go on". */
const GO_ON_NOT =
  '(?! (?:the|a|an|my|our|this|that|it|vacation|trips?|dates?|rides?|break|campus|stage|air|online|social|twitter|reddit|discord|tiktok|insta|instagram|tonight|tomorrow|today|until|till|unless|without (?:coffee|caffeine|a coffee|my coffee|food|snacks?|sleep|a nap|naps|breakfast|lunch|dinner|music|my (?:phone|charger|laptop|headphones|airpods))|(?:mon|tues|wednes|thurs|fri|satur|sun)days?)\\b)';
/** "live in the dorms / with my roommate / on campus": where, not whether. */
const LIVE_NOT =
  '(?! (?:in|on|with|at|near|nearby|by|off|downtown|across|there|together|alone|apart|far|close|next|abroad|here (?:next|this|in|for))\\b)';
/** "be here at 8 / for class / this early": not "i don't want to be here". */
const HERE_NOT =
  '(?! (?:at|for|on|during|early|so early|till|until|today|tonight|tomorrow|in (?:this|class|the)|all (?:day|night)|this (?:early|late|class|lecture|party|weekend))\\b)';
/** "gone for the weekend / by 5 / from the group chat": away, not dead. */
const GONE_NOT =
  '(?! (?:for|on|this|next|tomorrow|tonight|over|during|until|till|by|from (?:class|campus|the (?:group ?chat|chat|party|dorm))|a (?:week|day|while|month|bit|few))\\b)';
/** "die laughing / of embarrassment / on this hill / trying", "die my hair" (dye). */
const DIE_NOT =
  '(?! (?:laughing|of (?:laughter|embarrassment|boredom|cringe|shame)|inside|for|trying|happy|on (?:this|that|the) hill|(?:my|her|his|your|the) (?:hair|clothes|shirt|shoes|eyebrows|beard|jeans))\\b)';
const IN_A_GAME =
  '(?! (?:in|on) (?:(?:the|this|that|a|my) )?(?:game|games|video game|minecraft|fortnite|roblox|elden ring|dark souls|souls|zelda|mario|pokemon|terraria|stardew|league|valorant|overwatch|among us|sims|the sims|show|movie|movies|book|books|anime|manga|one piece|jojo|level|boss|series|story|novel|fanfic|dnd)\\b)';
/** The end of a whole-message rule: trailing punctuation or emoji ("this is goodbye." / "this is goodbye 💔"). For 'u'. */
const END = '[\\s.!?…,"\'”’)\\p{Extended_Pictographic}\\uFE0F\\u200D]*$';

/** Already done: pills taken, an overdose, a deep cut. The crisis line then starts with 911 (EMERGENCY_REACH). */
const DISTRESS_NOW: RegExp[] = [
  new RegExp(`\\b(?:took|swallowed|downed|popped|chugged|taken|ate) (?:way |like |literally |just )?(?:too many|so many|a bunch of|a handful of|handfuls of|a ton of|tons of|a whole bottle of|an entire bottle of|the whole bottle of|the entire bottle of|a whole pack of|the whole pack of|a full bottle of|\\d{2,}) (?:of )?(?:my |the |these |those |his |her )?(?:\\w+ )?${PILLS}\\b`),
  // "took all my meds" is a normal day; all of them at once is not
  new RegExp(`\\b(?:took|swallowed|downed|popped) all (?:of )?(?:my|the|these|those) (?:\\w+ )?${PILLS} (?:at once|at the same time|together|in one go|all at once)\\b`),
  new RegExp(`\\bi (?:just |think i |might have |may have |already |accidentally |probably )?(?:overdosed|od'd|oded)\\b${OD_JOKE}`),
  /\bi (?:just |think i |might have )?(?:cut|slit|slashed) (?:too deep|my (?:wrists?|throat|veins?))\b/,
];

const DISTRESS: RegExp[] = [
  ...DISTRESS_NOW,
  /\b(?:suicid|suicd|sucid|suisid)\w*/, // suicide, suicidal, suicides, suicidality (and common typos)
  /\bkill(?:ing)? my ?self\b/,
  /(?<![\d.]\s?)\bkms\b/, // not "5 kms" (kilometers)
  /\bsewer ?slid\w*|\bself[- ]?(?:delet|unaliv)\w*|\bunaliv\w*|\bk[i1!*]ll(?:ing)? my ?self\b|\bs[u*][i1!*]c[i1!*]d\w*/, // algospeak
  /\bself[- ]?harm(?:ing|ed)?\b/,
  // ways to harm oneself, and what someone says before doing it (not by accident: "i stabbed myself with a fork")
  new RegExp(`\\b${HARM_FORMS} my ?self\\b${BY_ACCIDENT}${NOT_HARM}`),
  new RegExp(`\\b${INTENT} (?:to )?(?:just |really |go )?${HARM_VERBS} my ?self\\b${NOT_HARM}`),
  /\bdrown(?:ing|ed)? my ?self\b(?! in (?!(?:the |a |my |this |that )?(?:lake|river|ocean|sea|pool|bath ?tub|tub|bath|water|springs?)\b)| (?:with|on|by accident|accidentally)\b)/, // not "in work / in coffee"
  /\b(?:slit|slitting|slash|slashing|slice|slicing|cut|cutting|open|opening) (?:open )?my (?:own )?(?:wrists?|throat|veins?)\b(?! (?:on|while|with|by accident|accidentally|shaving|cooking|chopping|opening|in the kitchen)\b)/,
  new RegExp(`\\b(?:cut|cutting|slit|slitting|slash|slashing|carve|carving) (?:up |into )?my (?:own )?(?:arms?|thighs?|legs?|skin|stomach|body)\\b${BY_ACCIDENT}`),
  /\bi(?:'ve| have|'m| am|m)? (?:\w+ )?(?:started|start|starting|began|been|keep|kept|went back to|go back to|going back to) cutting(?: myself)? again\b|\bi(?:'m| am|m) cutting (?:myself )?again\b/,
  new RegExp(`\\b${INTENT} (?:to )?(?:just )?(?:overdos\\w*|od)\\b${OD_JOKE}`),
  new RegExp(`\\b(?:take|taking|swallow|swallowing|down|pop|popping) (?:way )?(?:too many|a whole bottle of|an entire bottle of|the whole bottle of|the entire bottle of|a full bottle of) (?:of )?(?:my |the |these |those )?(?:\\w+ )?${PILLS}\\b`),
  new RegExp(`\\bhow (?:many|much)\\b(?=[^.?!]{0,40}\\b${PILLS}\\b)[^.?!]{0,60}\\b(?:die|dying|kill|killing|lethal|fatal|deadly|overdose|od)\\b`),
  /\b(?:lethal|fatal|deadly) (?:dose|amount|overdose)\b/,
  // asking how (not "the easiest way to die in elden ring")
  new RegExp(`\\b(?:easiest|easy|best|quickest|quick|fastest|fast|painless|painlessly|least painful|most painless|simplest|surest|quietest|peaceful|peacefully|cleanest|good|effective|reliable|right)(?: \\w+)? (?:way|ways|method|methods) (?:to|of) (?:die|dying|kill myself|killing myself|end it|end my life|ending my life|commit suicide)\\b${IN_A_GAME}`),
  new RegExp(`\\bhow (?:do i|can i|could i|would i|should i|might i|to|does one|would one|can one) (?:just |quickly |painlessly |easily )?(?:die|kill myself|end my life|end it all|commit suicide|overdose|od|hang myself)\\b${IN_A_GAME}`),
  // jumping, traffic, a car (not "jumping off the cliff at the springs was so fun", "jump into the pool")
  new RegExp(`\\b${INTENT} (?:to )?(?:just )?(?:jump(?:ing)?|throw(?:ing)? myself) (?:off|from) (?:of )?(?:a|the|this|that|my|our|some) (?:\\w+ )?(?:bridge|building|roof|rooftop|cliff|parking garage|garage|balcony|tower|overpass|ledge|window|dorm)\\b(?! (?:into|in) (?:the |a )?(?:water|river|lake|pool|springs?|ocean|sea)\\b| at the springs\\b)`),
  new RegExp(`\\b${INTENT} (?:to )?(?:just )?(?:jump|step|walk|run|throw myself|lie down|lay down) (?:out )?(?:in front of|under) (?:a|the|an|some) (?:\\w+ )?(?:train|car|bus|truck|subway)\\b`),
  new RegExp(`\\b${INTENT} (?:to )?(?:just )?(?:walk|step|run|drive) (?:out )?into (?:traffic|oncoming traffic|the (?:road|street|highway))\\b`),
  new RegExp(`\\b${INTENT} (?:to )?(?:just )?(?:drive|crash|swerve)(?: my (?:car|truck)| the car| myself)? (?:off|into) (?:a|the) (?:\\w+ )?(?:road|bridge|cliff|wall|tree|pole|overpass|lake|river|ocean|barrier|guardrail|traffic)\\b`),
  new RegExp(`^(?:i|i'm|i am|im)(?: (?:going|about|ready|planning|want) to| will| might) (?:just )?jump(?: off| now| tonight| today)?${END}`, 'u'),
  /\b(?:thinking|think|thought) (?:about|of) jumping\b(?! (?:rope|higher|high|on|in|into|over|the gun|for|jacks|back|ship|ahead|around|up|down|in line|the line|to|with)\b)/,
  /\bi(?:'m| am|m) (?:standing|sitting) on (?:a|the) (?:bridge|ledge)\b|\bi(?:'m| am|m) (?:standing|sitting) on the edge of (?:a|the) (?:bridge|roof|building|cliff|parking garage)\b/,
  /\b(?:made|make|making|tied|tie|tying|bought|buy|got|have|found|need) (?:a |the |my )?(?:\w+ )?noose\b|\bnoose (?:for|around) (?:me|myself|my neck)\b/,
  // wanting to die (not "die laughing", "die inside", "die for some ramen", "die my hair" (dye))
  new RegExp(`\\b(?:want|wanted|wanting) to die\\b${DIE_NOT}`),
  new RegExp(`\\b(?:wish|hope|pray|praying|hoping|wishing) (?:that )?i (?:would |could |will |can |might |just |simply |finally |already )*(?:die|be dead|drop dead|stop existing|not exist|disappear forever|stop waking up)\\b${DIE_NOT}`),
  /\b(?:wish|hope|pray|praying|hoping|wishing) (?:that )?i (?:would |could |will |just )?(?:get|got) (?:hit|run over|killed)\b/,
  /\bwish i (?:was|were|could be|would be) (?:dead|gone)\b/,
  /\bwish i (?:was|were|had|would|could)(?: have)? (?:not|never) (?:been )?(?:born|alive|here|around)\b(?! (?:at|in|for|right now|today|tonight|this|with)\b)/, // "i wish i'd never been born"
  /\bwish i (?:did not|could not|would not|never) exist(?:ed)?\b/,
  new RegExp(`\\bready to die\\b${DIE_NOT}`),
  /\b(?:death|dying|being dead|not existing|not being alive|not waking up)(?: just)? (?:sounds|seems|feels|would be|looks|is) (?:so |really |kind of |kinda |pretty |more |like )?(?:nice|good|peaceful|better|easier|great|appealing|tempting|comforting|nicer|like a relief|like relief|like the answer|like freedom|like peace)\b/,
  /\b(?:think|thinking|thought|dream|dreaming|dreamt|dreamed|obsessing|fantasize|fantasizing) (?:a lot |so much |constantly |all the time )?(?:about|of) (?:dying|death|being dead|my (?:own )?death|not being (?:alive|here)|not existing|not waking up)\b(?! (?:my|her|his|your|the|their) (?:hair|clothes|shirt|shoes|eyebrows|beard)\b| (?:of|from)\b| in (?:the|a|this|that) (?:game|movie|book|show)\b)/,
  /\b(?:do|does|did) not (?:even |really )?care (?:if|whether) i (?:live or die|live and die|die|wake up|am alive|exist)\b/,
  /\bwant to (?:just )?be gone\b(?! (?:for|by|before|from (?:here|campus|class|this (?:class|place|dorm|party))|on|this|next|tomorrow|tonight|already|asap|soon|early)\b)/,
  /\b(?:want|need|wish|beg) (?:you|someone|somebody|anyone|anybody) (?:would |could |to )?(?:just )?(?:kill me|end my life|end me)\b/,
  /\bbetter off (?:dead|gone|not (?:here|alive|existing|being born)|never (?:been )?born)\b/,
  /\b(?:better|happier|easier)(?: off)? without me\b(?! on (?:the|this|that|my|our) (?:team|project|group|court)\b)/,
  /\bthe world (?:does not|would not|will not) (?:even )?need me\b|\b(?:no ?one|nobody) (?:needs|wants|would miss) me (?:here|around|alive|anymore|any more)\b/,
  new RegExp(`\\b(?:notice|care|realize)(?: at all)? (?:if|when) i (?:was|were|am|got) (?:gone|dead|not (?:here|around|alive))\\b${GONE_NOT}`),
  new RegExp(`\\b(?:notice|care|realize)(?: at all)? (?:if|when) i (?:died|disappeared|vanished|stopped existing|killed myself|did not exist|never existed|was never born|were never born|left forever|was not alive|were not alive|was not here|were not here|was not around|were not around)\\b${GONE_NOT}`),
  new RegExp(`\\b(?:happier|better|easier|fine|okay|ok|lighter)(?: off)? (?:if|when) i (?:was|were|am) (?:gone|dead|not (?:here|around|alive)|never born)\\b${GONE_NOT}`),
  new RegExp(`\\b(?:happier|better|easier|fine|okay|ok|lighter)(?: off)? (?:if|when) i (?:died|disappeared|did not exist|never existed|was never born|were never born|killed myself|was not here|were not here|was not around|were not around)\\b${GONE_NOT}`),
  /\b(?:no ?one|nobody) would (?:even )?(?:miss me|care if i (?:died|was gone|were gone|disappeared))\b/,
  /\b(?:i am|i'm|im|i feel|i felt|i've become|i have become|i've been|i have been|i was|i will always be|i'll always be|i'm always|i am always|i'm becoming|i am becoming|feel like|feeling like|felt like)(?: just| only| always| such| like| nothing but| a| an| huge| big| total| massive| giant| constant)* burden\b(?! (?:on|to) (?:the |my |our )?(?:team|squad|group|project|class|lab)\b| of proof\b)/,
  /\bburden (?:to|on|for) (?:everyone|everybody|my (?:family|friends|parents|mom|dad|roommates?|partner)|the people (?:around me|i love)|people|the world|you all|y'all|all of you|those around me)\b/,
  /\bend(?:ing)? (?:it all|my (?:own )?life|myself)\b/,
  /\bend everything\b(?! (?:i|we|you|that|this|on|with)\b)/, // not "ending everything on a high note", "end everything i started"
  // "i want to end it", "thinking about ending it", "i feel like ending it" (not "…end it with a bang / on a high note")
  new RegExp(`\\b${INTENT} (?:to )?(?:just )?end(?:ing)? it(?: all)?\\b(?! (?:with|on|early|for (?:today|now|the day|tonight|the night|the week)|here (?:for|and)|there|after|before|when|once|at)\\b)`),
  /\bend(?:ing)? it(?: all)? (?:tonight|right now|now|today|this weekend|soon|for good|once and for all|forever)\b(?! (?:with (?:him|her|them|my (?:ex|boyfriend|girlfriend|bf|gf|partner|situationship|roommate))|and (?:start|go|move|get|sleep|head)|(?:for|by) (?:the day|today|now|tonight))\b)/,
  new RegExp(`^i(?:'m| am|m) ending it(?: all)?${END}`, 'u'),
  /\b(?:take|takes|taking|took|taken) my (?:own )?life\b(?! (?:back|savings?|seriously|more seriously|for granted|in (?:a |another |my own |new |the right )|into my own hands|one day at a time|to the next level|by storm|apart|over|away from)\b)/,
  /\bgive up on (?:life|living)\b/,
  /\bnothing (?:left )?(?:is |to |worth )*liv(?:e|ing) for\b/,
  new RegExp(`\\bno (?:reason|point) (?:left )?(?:for me )?(?:to|in|of) (?:live${LIVE_NOT}|living${LIVE_NOT}|being alive|be alive|going on${GO_ON_NOT}|existing|exist|keep going|keep living|wake up)\\b`),
  new RegExp(`\\b(?:the|any) point (?:in|of) (?:living${LIVE_NOT}|being alive|going on${GO_ON_NOT}|existing)\\b`),
  /\b(?:do|does|did) not see (?:the|a|any) point (?:anymore|any more|in anything)\b/,
  /\bwhat(?:'s| is| s|s) (?:even )?the point (?:anymore|any more|of anything|of it all|of (?:even )?trying anymore|in anything|of being here)\b/,
  /\b(?:do not|cannot|can not) (?:see|find|think of) (?:a|any|the) (?:reason|point) (?:to|in|of|for) (?:keep going|keep living|keep trying|go on|going on|live|living|stay alive|staying alive|be alive|being alive|be here|being here|exist|existing|wake up|waking up|keep fighting)\b(?! (?:to|with|on|at|for|in|the|a|this|that|my)\b)/,
  /\b(?:life|everything|my life|it all|existence|existing|living) (?:is|feels|seems) (?:so |just |kind of |pretty |completely |totally |all |literally |really )?(?:pointless|meaningless)\b/,
  // "I don't / didn't / wouldn't / won't want to live / wake up …" (not "…live in the dorms", "…wake up early for class")
  new RegExp(`\\b(?:do|does|did|would|will|could|should) not (?:want|wish) to (?:live${LIVE_NOT}|be alive|exist|be here${HERE_NOT}|wake up(?! (?:early|so early|that early|at \\d|before|for (?:class|work|school|practice))))\\b`),
  /\bnever want to wake up\b/,
  /\b(?:sleep|asleep|go to bed|close my eyes|nap)(?: \w+){0,3} (?:and|then|&) (?:just )?(?:never|not) wake (?:up|back up)\b/,
  /\b(?:wish|hope|pray|want|praying|hoping|wishing) (?:that )?i (?:would |could |will |just )?(?:never|not|did not|do not|will not|would not|could not) wake (?:up|back up)\b(?! (?:late|early|so early|on time|in time|before|at \d|for (?:class|work|school|practice|my|the|an?)|tired|sick|hungover|with|sore|stiff|in (?:the|a) (?:morning|bad mood))\b)/,
  /\bwant to (?:not exist|stop existing|be dead|not be alive|not be here anymore)\b/,
  /\bwant to sleep forever\b(?! (?:after|when|once|until|till|this|next|on|for|tomorrow|tonight|in)\b)/,
  /\b(?:rather|might as well|may as well) (?:just )?(?:be dead|die)\b(?! (?:than|laughing|of|for|trying)\b)/,
  new RegExp(`\\brather (?:just )?not (?:exist|be alive|be here anymore|live${LIVE_NOT}|wake up)\\b`),
  new RegExp(`\\bi (?:really |honestly |probably |just )?(?:should|deserve to|need to|ought to) (?:just )?die\\b(?! (?:from|on|in)\\b)${DIE_NOT}`),
  /\bfeel(?:ing)? like dying\b(?! (?:my|her|his|your|the) (?:hair|clothes|shirt|shoes)\b)/,
  /\bdone with (?:life|living|being alive|existing|it all)\b(?! (?:for|today|tonight|this|drawing|science|sciences|skills|lessons|class|classes|admin|insurance|guard|jacket|story|stories|coach|coaching)\b)/,
  /\bdone (?:living|being alive|existing)\b(?! (?:in|on|at|with|here|there|off|like|as|near)\b)/,
  /\b(?:tired|sick|exhausted) of (?:living|being alive|existing|life|this life|my life|being here)\b(?! (?:in|at|on|with|as an?|admin|choices|decisions|drama|stuff|lessons|skills|science|sciences|drawing|insurance|story|updates)\b)/,
  /\bdisappear forever\b|\b(?:want to|wish i could|going to) (?:just )?disappear\b(?! (?:for|into|in|to|until|till|after|before|during|over|this|next|tonight|tomorrow|on|at|with|from (?:class|campus|the (?:group ?chat|chat|party|dorm)|social media))\b)/,
  /\bhate (?:being alive|existing|my existence)\b(?! (?:at|before|on|in the morning|this early|so early|during|when|until|without)\b)/,
  /\bwant (?:everything|it all|my life|life) to (?:end|stop|be over)\b/,
  /\bwant (?:the|this|my|all the|all this) pain to (?:stop|end|go away) (?:forever|for good|permanently)\b|\b(?:end|stop) (?:the|my|this) pain (?:forever|for good|permanently)\b/,
  // hopeless about oneself or life (not "this pset is hopeless", "hopeless romantic", "hopeless at volleyball")
  /\bhopelessness\b/,
  /\b(?:i|i'm|im|i am|i feel|i felt|feel|feeling|felt|everything|life|my life|it all|things|the future|my future)(?: (?:is|are|feels|feel|seems|seem|so|really|just|completely|totally|kind of|kinda|very|pretty|utterly|all|literally|honestly|lowkey|super|too|more|truly|deeply))* hopeless\b(?! (?:romantic|romantics|at|with|when it comes to|in the kitchen|case|cause|causes)\b)/,
  /\blost all (?:my )?hope\b(?! (?:for|in|on) (?:the|this|that|our|these|those) )|\b(?:no|zero) hope (?:left|anymore|any more|for me|in (?:life|living|anything))\b/,
  // "i can't go on", "…like this" (not "i can't go on the trip friday", "…without coffee")
  new RegExp(`\\b(?:cannot|can not) go on\\b${GO_ON_NOT}`),
  /\b(?:cannot|can not|could not) (?:keep |go on |continue )?(?:live|living|existing|exist|going on|doing this) like this\b/,
  /\b(?:cannot|can not) (?:do this|take (?:it|this)|keep going|handle (?:it|this|life)) any ?more\b/,
  /\bnot worth living\b/,
  /\blife is (?:just )?not worth it\b/,
  // a goodbye that sounds final, as the whole message
  new RegExp(`^(?:i guess |so |well |okay |ok )?this is (?:my )?(?:final |last )?(?:goodbye|good bye|farewell)(?: (?:forever|for good|everyone|guys|world|then))?${END}`, 'u'),
  new RegExp(`^(?:goodbye|good bye|bye) (?:forever|world|for good|cruel world)${END}`, 'u'),
  /\b(?:will not|not going to) be (?:here|around|alive) (?:much|for much|very much) longer\b/,
  /\bthis is (?:my )?(?:final|last) (?:message|goodbye|text)\b/,
];

/**
 * Free chat's reply field holds this many characters (FREE_CHAT_MAX_CHARS in vn/chat.ts) and scrolls sideways, so a
 * message arrives cut off mid-word only past this cap, or when it was sent early ("i want to kill mys").
 */
export const CUT_AT = 48;
/** A cut-off word is finished only from this many letters on: "i really want to ki" may be "kiss you". */
const CUT_LETTERS = 3;
/** Shorter messages are never read as cut off. */
const CUT_MIN = 12;
/** The message's last word, when it may be a cut-off one. */
const LAST_FRAGMENT = new RegExp(`(?<![\\p{L}'])\\p{L}{${CUT_LETTERS},}$`, 'u');

/** A crisis message cut off mid-word ("…thinking about sui", "…i want to kil"; never "…want to ki"). */
const CUT_DISTRESS: RegExp[] = [
  /\bthinking (?:about|of) (?:sui|kil|kill|killi|killin|killing|endi|endin|ending)$/,
  /\b(?:want|wanted|wanting|going|plan|planning|ready) to (?:kil|kill|killi|killin)$/,
];

/**
 * What crisis messages end with: a message cut off mid-word ("…there's no reason for me to liv", "…i want to kill
 * myse") is read again with each of these finishing its last word (CUT_LETTERS or more of it).
 */
const LAST_WORDS = [
  'myself', 'suicide', 'suicidal', 'live', 'living', 'alive', 'life', 'die', 'dying', 'dead', 'death', 'anymore',
  'exist', 'existing', 'forever', 'overdose', 'overdosing', 'tonight', 'disappear', 'gone', 'going', 'again', 'harm',
  'harming', 'pills', 'wrists', 'arms', 'bridge', 'building', 'train', 'traffic', 'road', 'lake', 'river', 'jump',
  'jumping', 'burden', 'everyone', 'born', 'this', 'stop', 'over', 'longer', 'hopeless', 'pointless', 'meaningless',
  'goodbye', 'slide', 'overdosed',
];

/**
 * Self-harm / crisis language. Deliberately broad: a false positive costs one kind message. This is the only crisis
 * check: the router sends a match to the crisis line before any brain, and the Heuristic Brain's 'distress' intent is
 * this same test (intents.ts), so no wording is scored as a chat or sent to the Big Brain because one of them missed it.
 */
export function isDistress(text: string): boolean {
  const t = crisisText(text);
  if (DISTRESS.some((re) => re.test(t))) return true;
  if (t.length < CUT_MIN) return false;
  if (CUT_DISTRESS.some((re) => re.test(t))) return true;
  const last = LAST_FRAGMENT.exec(t)?.[0];
  if (!last) return false;
  const head = t.slice(0, t.length - last.length);
  return LAST_WORDS.some((w) => w.length > last.length && w.startsWith(last) && DISTRESS.some((re) => re.test(head + w)));
}

/** The act may already have happened (pills taken, an overdose): 911 comes first. Implies isDistress(). */
export function isCrisisNow(text: string): boolean {
  const t = crisisText(text);
  return DISTRESS_NOW.some((re) => re.test(t));
}

// ── check-in: talk of dying that no crisis rule reads and the Heuristic Brain doesn't understand ──

/** About the player: "i", "me", "my"… */
const FIRST_PERSON = /\b(?:i|i'm|im|i've|ive|i'll|i would|me|my|myself|mine|imma)\b/;
/** Death words, and goodbyes that sound final. */
const DEATH_WORD = new RegExp(
  `\\b(?:die|dies|died|dying|dead|death|deaths|funeral|kill me|killed me|kills me)\\b|\\b(?:will not|not going to) (?:be (?:here|around) (?:tomorrow|anymore|any more)|see me (?:again|anymore|any more))${END}|\\bgoodbye forever\\b`,
  'u',
);
/** Everyday uses of those words: hyperbole, idioms, games and shows, things that die (phones, plants), "dye". */
const NOT_DEATH: RegExp[] = [
  /\b(?:die|dies|died|dying|dead)(?: \w+)? (?:laughing|of (?:laughter|embarrassment|boredom|cringe|cuteness|shame|jealousy|excitement|happiness|old age|thirst|hunger|the heat|heat|curiosity|suspense)|inside (?:lol|lmao)|trying|happy|on (?:this|that|the|a) hill)\b/g,
  /\bdying (?:to|for) (?!die\b|be dead\b)\w+/g,
  /\b(?:to|would|could|will) die for\b|\bdie for (?:a|some|this|that|the|it|you|him|her)\b/g,
  /\b(?:die|dye|died|dyed|dying|dyeing) (?:my|her|his|your|the|their|our) (?:hair|clothes|shirt|shoes|eyebrows|beard|jeans|tips|roots)\b|\btie[- ]?(?:die|dye)\b/g,
  /\bdie ?hard\b|\bdo or die\b|\bthe die is cast\b|\bover my dead body\b/g,
  new RegExp(`^(?:i'm|i am|im) (?:literally |so |actually |lowkey |deadass |fr )*dead(?: (?:lol|lmao|fr|rn))?${END}`, 'gu'), // laughing, or in trouble
  /\b(?:die|dies|died|dying|dead|death|kill me|killed me)\b[^.!?]{0,24}\b(?:in|on) (?:(?:the|this|that|a|my) )?(?:game|games|minecraft|fortnite|roblox|elden ring|dark souls|zelda|mario|pokemon|terraria|stardew|valorant|overwatch|league|among us|sims|level|boss|raid|match|round|show|movie|book|anime|manga|episode)\b|\bdied \d+ times\b/g,
  /\bdead (?:tired|serious|set|end|ends|last|week|silent|silence|center|centre|on|ass|meat|weight|asleep|broke|wrong|right|even|heat|giveaway|ringer|zone|line|lines|lift|lifts|bug|bugs|pixel|pixels|link|links|code|key|keys|battery|phone|laptop|plant|plants|leaves|skin|cells?|poets)\b|\bdead by daylight\b|\bdead (?:space|island|rising|or alive)\b/g,
  /\b(?:walking|the|grateful|red|undead) dead\b|\bdeath (?:note|metal|star|stranding|grips|cab|valley|stare|row|by (?!suicide)\w+)\b|\bthe death of me\b|\b(?:bored|scared|worried|tickled|loved|freezing|frozen|stressed|starving|starved|annoyed|tired|sick) to death\b/g,
  /\b(?:is|are|was|were|it's|its|that's|thats|this is|you're|youre|you are|they're|theyre|they are|it is|that is) (?:\w+ )?killing me\b|\bkill(?:ed|ing)? it\b|\bkill(?:ing)? time\b|\bkill for\b/g,
  /\b(?:my|the|our|his|her|this|that|your) (?:\w+ )?(?:phone|battery|laptop|computer|pc|mac|macbook|charger|car|truck|bike|scooter|plant|plants|succulent|succulents|cactus|garden|game|character|sim|sims|tamagotchi|controller|mouse|keyboard|headphones|airpods|earbuds|ipad|tablet|switch|console|wifi|internet|router|printer|pen|pens|marker|flashlight|bulb|lightbulb|lamp|tv|fridge|vibe|vibes|social life|motivation|braincells?|brain cells?|grades?|gpa|streak|account|server|code|build|hard drive|drive|camera|watch|fitbit|vape|starter|sourdough|group chat|chat|convo|conversation|party|mood|joke|meme|trend|playlist|show|series|semester|week|weekend|day|class|lecture|signal|connection|service|data|app|website|site|link|crush|ship)(?: \w+){0,2} (?:is |was |just |has |had |finally |totally |completely |kinda |literally |basically |is so |is literally )*(?:dead|dying|died|die|dies)\b/g,
  /\b(?:dead|dying) (?:phone|battery|laptop|plant|plants|succulent|car|charger|controller|group chat|chat|meme)\b/g,
];
/** The Heuristic Brain's two "I didn't get that" intents. */
const UNSURE = new Set(['unknown', 'question_generic']);

/**
 * Talk of dying about the player that no crisis rule reads and the Heuristic Brain doesn't understand (its 'unknown'
 * and 'question_generic' intents): "i'll be dead soon", "kill me now", "i feel dead inside", "i wonder what dying feels
 * like". The pig checks in gently instead of guessing ("No idea, but I support it!"), and like every safety line it
 * isn't scored. Hyperbole the brain does understand ("this class is killing me", "i'm dying to try that ramen") keeps
 * its usual answer. `pig` omitted: true when any pig would check in.
 */
export function needsCheckIn(text: string, pig?: PigId): boolean {
  if (!text || isDistress(text)) return false;
  let t = crisisText(text);
  for (const re of NOT_DEATH) t = t.replace(re, ' ');
  if (!FIRST_PERSON.test(t) || !DEATH_WORD.test(t)) return false;
  return (pig ? [pig] : PIG_IDS).some((p) => UNSURE.has(classifyIntent(text, p).intent));
}

// ── medical: symptoms, diagnoses, doses (Student Health), and emergencies (911 first) ──

const MED_DRUGS =
  '(medicine|medication|meds|pills?|tablets?|ibuprofen|advil|motrin|tylenol|acetaminophen|paracetamol|aspirin|naproxen|aleve|antibiotics?|benadryl|melatonin|nyquil|dayquil|sudafed|adderall|xanax|prescription|dose|dosage|supplements?|antidepressants?|insulin|inhaler)';
/** Where it hurts: "my back hurts" (not "my code hurts", "my heart hurts", "my feelings are hurt"). */
const BODY =
  '(?:head|chest|stomach|tummy|belly|back|lower back|upper back|neck|throat|ear|ears|eye|eyes|tooth|teeth|jaw|face|nose|mouth|tongue|gums?|arm|arms|elbow|elbows|wrist|wrists|hand|hands|finger|fingers|thumb|shoulder|shoulders|leg|legs|knee|knees|ankle|ankles|foot|feet|toe|toes|heel|hip|hips|rib|ribs|side|spine|joints?|muscles?|skin|kidneys?|bladder|pelvis|groin|tailbone|shin|shins|calf|calves|thigh|thighs|hamstrings?|quads?|acl|meniscus)';
/** Sore from practice or the gym: everyday, not a symptom to report ("my legs hurt after practice"). */
const SORE_FROM =
  '(?! (?:after|from) (?:practice|the gym|gym|working out|my workout|a workout|workouts?|lifting|leg day|arm day|running|a run|my run|the game|volleyball|the match|a match|training|soccer|basketball|football|sitting|studying|carrying|cheering|dancing|hiking|climbing|swimming|yoga|pilates|spin|walking|squats|push ?ups|the hike|the climb|the run|laughing|smiling|writing|typing|texting|gaming|drawing|staring|reading|screens?)\\b)';
/** Laughing ("lmao i can't breathe", "i passed out lol"): not an emergency. */
const LAUGHING = /\b(?:lol|lmao|lmfao|rofl|haha\w*|hehe\w*|xd)\b|[😂🤣💀]/u;

/** Call 911 first: chest pain, can't breathe, passed out, a seizure, an allergic reaction, heavy bleeding… */
const EMERGENCY: RegExp[] = [
  /\b(?:chest pains?|pains? in my chest|chest (?:hurts|is hurting|feels tight|is tight|is tightening|tightness|pressure))\b/,
  /\b(?:cannot|can not|could not|struggling to|hard to|trouble|difficulty|having trouble|having a hard time) breath(?:e|ing)\b|\bshort(?:ness)? of breath\b|\b(?:not|stopped|is not) breathing\b/,
  /(?<!\b(?:almost|nearly) )\b(?:passed out|fainted|fainting|unconscious|unresponsive|collapsed)\b(?! (?:on (?:the|my) (?:couch|bed|sofa)|in (?:my )?bed|asleep|early|at \d|after (?:studying|class|work|practice|the party|a long day)|for (?:\d+|a few|like \d+) hours?|flyers|fliers|papers|candy|food|snacks|cookies|pamphlets|the|handouts|stickers|samples)\b)/,
  /\b(?:having|had|has|is having|just had|going into) (?:a )?(?:seizure|seizures|convulsions)\b|\bam i having (?:a )?(?:heart attack|seizure|allergic reaction)\b/,
  // not "i almost had a heart attack when i saw the bill" ("am i having a stroke or does this say pig" is the medical line)
  /(?<!\b(?:almost|nearly|basically|practically) )\b(?:having|had|has|is having|just had|i think i'm having|might be having) (?:a )?(?:heart attack|stroke)\b/,
  /\b(?:allergic reaction|anaphyla\w*|throat (?:is )?(?:closing|swelling)|epi ?pen)\b/,
  /\b(?:coughing|throwing|vomiting|puking|spitting) up blood\b|\bbleeding (?:a lot|so much|heavily|badly|everywhere|nonstop|non stop|really bad)\b|\b(?:will not|does not|cannot) stop (?:the )?bleeding\b|\bbleeding (?:will not|does not) stop\b/,
  /\b(?:cannot|can not|could not) (?:feel|move) my (?:legs?|arms?|face|body|hands?|feet|side|fingers|toes)\b(?! (?:after|from|because|cause|cuz|since)\b)/,
  /\b(?:face|smile) (?:is )?(?:drooping|droopy|numb)\b|\bslurred speech\b|\bslurring (?:my )?words\b/,
  /\b(?:swallowed|drank|ate) (?:some |a |the )?(?:bleach|poison|antifreeze|batteries|a battery|detergent|a tide pod|tide pods)\b/,
  /\b(?:hit|hurt|banged|bashed) my head\b.{0,40}\b(?:passed out|blacked out|throwing up|threw up|vomit\w*|confused|cannot remember|bleeding|seeing double|blurry)\b/,
];

const MEDICAL: RegExp[] = [
  new RegExp(`\\bshould i (take|use|try|stop taking|double up on|mix|skip)\\b.{0,40}\\b${MED_DRUGS}\\b`),
  new RegExp(`\\b(how (much|many)|what dose of|is it safe to (take|mix))\\b.{0,40}\\b${MED_DRUGS}\\b`),
  new RegExp(`\\b(what|which) ${MED_DRUGS} should i\\b`),
  /\bdiagnos(e|is|ing)\b.{0,20}\b(me|my|this|it)\b/,
  /\bwhat'?s? (is )?my diagnosis\b/,
  /\b(my|these|i have|i've got|i got|having|with) (\w+ ){0,2}symptoms?\b/,
  /\bsymptoms?\b.{0,25}\b(i have|i've|i'?m having|mine|i get|i got)\b/,
  /\bam i (sick|ill|dying|okay medically|having a (heart attack|stroke|seizure|panic attack|allergic reaction))\b/,
  /\bdo i have (a |an |the )?(fever|cold|flu|covid|strep|infection|concussion|uti|std|sti|mono|pneumonia|allergy|allergies|cancer|diabetes|adhd|depression|anxiety|broken|sprain|torn)\b/,
  /\bis (it|this|that) (normal|serious|bad|dangerous)\b.{0,40}\b(pain|hurt|hurts|bleed|bleeding|rash|fever|dizzy|headache|lump|swollen|vomit|throw(ing)? up|chest|numb)\b/,
  /\bshould i (go to|see) (the |a )?(doctor|er|emergency room|hospital|urgent care|nurse)\b/,
  /\bmedical advice\b/,
  // symptoms told to "the doctor": "my chest hurts", "doc, my back hurts", "i have a fever", "i fainted"
  new RegExp(`\\b(?:my|i have|i've got|i got|i'm having|i am having)(?: \\w+){0,2}? ${BODY} (?:(?:really|so|kind of|kinda|still|is|are|has been|have been|keeps|keep|started|starts|been|super|very|badly|all) )*(?:hurts?|hurting|aches?|aching|ached|throbbing|throbs|bleeding|bleeds|swollen|swelling|numb|tingling|tingles|burning|burns|itches|itchy|itching|broken|cracked|sprained|twisted|dislocated|infected|bruised)\\b${SORE_FROM}`),
  new RegExp(`\\b(?:i have|i've got|i got|i think i have|i think i've got|i might have|i think i)(?: a| an)? (?:swollen|sprained|broken|fractured|twisted|dislocated|bleeding|infected|bruised|numb) ${BODY}\\b`),
  new RegExp(`\\bi (?:think i |might have |may have )?(?:broke|fractured|sprained|twisted|dislocated|tore|pulled) my ${BODY}\\b`),
  /\b(?:i have|i've got|i got|i'm having|i am having|i've had|i have had|i keep getting|i keep having|i'm running|running)(?: (?:a|an|this|these|the|some|really|bad|terrible|awful|horrible|weird|sharp|severe|constant|bloody|high|little|small|huge|big|painful|strange|random|recurring|chronic))* (?:fever|temperature|rash|lump|bump on my \w+|headaches?|migraines?|stomach ?aches?|tummy ?aches?|sore throat|nosebleeds?|infection|ear infection|sinus infection|uti|chest pains?|cough|toothache|earache|backache|cramps|diarrhea|nausea|the chills|hives|blisters?|swelling|bloody nose|mole|cyst|ulcer|welts?|flu|the flu|covid|strep|mono|pneumonia|concussion)\b(?! (?:decision|decisions|choice|move|moves|call|thing|statement|idea|plan|purchase|joke|dream|dreams|of (?:inspiration|ideas))\b)/,
  /\b(?:i think i have|i think i've got|i might have|i probably have|i think i got) (?:a |an )?(?:concussion|fracture|infection|uti|std|sti|strep|mono|covid|the flu|flu|pneumonia|cancer|tumor|ulcer|appendicitis)\b/,
  /\b(?:i(?:'m| am|m)|i feel|i felt|i get|i got|i keep getting|feeling|i've been|i have been|i was) (?:so |really |super |very |kind of |kinda |a little |a bit |extremely )?(?:dizzy|lightheaded|light headed|faint)\b/,
  /\b(?:blacked out|blacking out|keep throwing up|threw up blood|feel like i'm going to (?:faint|pass out)|hit my head)\b/,
  /\b(?:prescribe|prescribing) (?:me|something|anything|it|them|that|this|a|some)\b|\b(?:can|could|will|would) you (?:prescribe|write me a prescription|give me a prescription|refill)\b|\b(?:write|give|get) me (?:a |an )?(?:prescription|script|rx|doctor'?s note|note for)\b|\bcan i get (?:a |an )?(?:prescription|script|rx)\b/,
  /\bis (?:this|it|that)(?: \w+)? (?:cancer|cancerous|a tumor|a tumour|malignant|melanoma|skin cancer)\b/,
  /\bis (?:this|it|that|my) (?:lump|mole|bump|rash|cut|wound|bite|bone|arm|leg|wrist|ankle|finger|toe|foot|hand|nose|rib|knee|burn|spot|bruise|blister) (?:\w+ )?(?:broken|infected|fractured|sprained|serious|bad|dangerous|normal|cancer|cancerous|okay|ok)\b/,
  /\b(?:look at|check|check out|examine|feel) (?:my|this) (?:rash|cut|wound|bite|lump|mole|burn|bump|bruise|blister|swelling|stitches|x ?ray|mri|scan|labs|bloodwork|blood work|test results|blood test)\b/,
  /\bwhat (?:should|do|can) i (?:do|take) (?:about|for) (?:my|this|a|the) (?:\w+ )?(?:headache|migraine|fever|rash|cough|pain|cold|flu|sore throat|stomach ?ache|cramps|cut|burn|bite|injury|back|knee|ankle|wrist|neck|shoulder|insomnia|allergies|acne|nausea)\b/,
];

/** Call 911 first (a medical emergency, the player's or someone else's). Implies isMedicalAdvice(). */
export function isMedicalEmergency(text: string): boolean {
  const t = crisisText(text);
  return !LAUGHING.test(t) && EMERGENCY.some((re) => re.test(t));
}

/** The player asks for medical advice, or tells "the doctor" a symptom (not "what is perfusion?"). */
export function isMedicalAdvice(text: string): boolean {
  const t = crisisText(text);
  return MEDICAL.some((re) => re.test(t)) || isMedicalEmergency(text);
}

const EXPLICIT =
  /\b(send|show) (me )?(nudes?|pics of you)\b|\b(have|having|want|wanna) sex\b|\bmake out\b|\bporn\w*\b|\bhorny\b|\bnaked\b|\bnudes?\b|\bstrip for\b/;

export function isExplicit(text: string): boolean {
  return EXPLICIT.test(lower(text));
}

// ───────────────────────── lines ─────────────────────────

/**
 * Where to reach out, right now: both numbers, each with "call" (the counseling line takes calls, not texts). Every
 * crisis line starts with it, numbers before the center's name, so its first page shows both in any box down to 13
 * columns × 4 rows or 18 × 3 (chat.ts pages a safety line front-first, and the counseling number with its comma, 13
 * characters, is the longest word). Nothing that matters waits behind a tap. (When the act may already have happened,
 * EMERGENCY_REACH comes first instead.)
 */
export const CRISIS_REACH = `Please call or text ${CRISIS_LINE} now, or call ${UF_CWC_PHONE_NOWRAP}`;
/** The first sentence of every crisis line: CRISIS_REACH, then whose number that is. */
export const CRISIS_CALL = `${CRISIS_REACH}, UF's Counseling & Wellness Center.`;
/**
 * 911 first: the first sentence of the crisis line when pills are already taken (isCrisisNow) and of the medical line
 * for an emergency (isMedicalEmergency). Paged front-first like CRISIS_REACH, so "911" is on page 1 in any box.
 */
export const EMERGENCY_REACH = 'Please call 911 right now, or get someone near you to call.';

const DISTRESS_LINE: Record<PigId, string> = {
  'piggy-1': `${CRISIS_CALL} I'm really glad you told me, teammate. You matter, and I'm right here.`,
  'piggy-2': `${CRISIS_CALL} Thank you for telling me. You deserve real care, and I'm right here.`,
  'piggy-3': `${CRISIS_CALL} I'm really glad you said something. I'll stay right here with you.`,
};

/** The crisis line when the act may already have happened: 911 first, then 988. */
const DISTRESS_NOW_LINE: Record<PigId, string> = {
  'piggy-1': `${EMERGENCY_REACH} You can also call or text ${CRISIS_LINE}. I'm right here, teammate.`,
  'piggy-2': `${EMERGENCY_REACH} You can also call or text ${CRISIS_LINE}. You deserve real care, and I'm right here.`,
  'piggy-3': `${EMERGENCY_REACH} You can also call or text ${CRISIS_LINE}. I'll stay right here with you.`,
};

/** A gentle check-in (needsCheckIn): are you okay, and 988 if it's more than a figure of speech. */
const CHECK_IN_LINE: Record<PigId, string> = {
  'piggy-1': `Wait, are you okay, teammate? That sounded heavy. If you're hurting, call or text ${CRISIS_LINE} anytime, and I'm right here.`,
  'piggy-2': `That sounded heavy. Are you okay? If it's more than a figure of speech, call or text ${CRISIS_LINE}, and I'm right here.`,
  'piggy-3': `Wait, are you okay? That sounded really heavy. If you're hurting, you can call or text ${CRISIS_LINE} anytime, and I'll stay right here.`,
};

const MEDICAL_LINE: Record<PigId, string> = {
  'piggy-1': "Time-out, teammate! I'm an AI master's student, not a doctor. Get that checked at UF's Student Health Care Center, and if it's an emergency, call 911.",
  'piggy-2': "I'm a pig doctor in a game, not your doctor. Student Health Care Center. Go, and call 911 if it's an emergency.",
  'piggy-3': "Okay, that's actually important, so I'm not going to guess. UF's Student Health Care Center can look at it properly. If it's an emergency, call 911.",
};

/** The medical line for an emergency (isMedicalEmergency): 911 first, never advice. */
const EMERGENCY_LINE: Record<PigId, string> = {
  'piggy-1': `${EMERGENCY_REACH} Don't wait this one out, teammate. UF's Student Health Care Center can follow up after.`,
  'piggy-2': `${EMERGENCY_REACH} I'm a pig doctor in a game, not your doctor. Student Health Care Center can follow up after.`,
  'piggy-3': `${EMERGENCY_REACH} That's not something to guess about. UF's Student Health Care Center can follow up after.`,
};

const WHOLESOME: Record<PigId, [string, Expression]> = {
  'piggy-1': ["Whoa, foul on the play! Let's keep it wholesome, teammate.", 'laughing'],
  'piggy-2': ['Not based. Keep it PG, please.', 'neutral'],
  'piggy-3': ["Okay, um, let's keep it PG. Ask me about literally anything else.", 'flustered_blush'],
};

/** Hoof Gator Chomps, rotated by how many times the player has chanted in this chat. */
const GATORS: Record<PigId, [string, Expression][]> = {
  'piggy-1': [
    ['GO GATORS! Hooves up, full chomp! Chomp, chomp, chomp!', 'excited'],
    ['CHOMP! CHOMP! That was a perfect Chomp, teammate. Ten out of ten form!', 'excited'],
    ["Go Gators! Clop, clop! That's my twelfth chomp today. Personal record!", 'proud'],
  ],
  'piggy-2': [
    ["Go Gators. Hooves out. Chomp. That's the most based gesture in Gainesville.", 'proud'],
    ['Chomp. Bilateral, symmetric, full range of motion. Go Gators. Based.', 'proud'],
    ['Go Gators. My heart rate just went up four beats. Clinically significant spirit.', 'happy'],
  ],
  'piggy-3': [
    ['Go Gators! Okay, so the Gator Chomp is basically a hinge joint with hooves. Chomp, chomp!', 'excited'],
    ["Go Gators! Wait, do it again. I want to see if our chomps are in sync. ...They are. That's kind of great.", 'happy'],
    ['Chomp! Actually, hooves make a really satisfying clop. Like, acoustically. Go Gators!', 'laughing'],
  ],
};

/** Piggy 3 lights up about the little thing he's building (no sales pitch). Rotates deterministically. */
export const CODEX_LINES: readonly string[] = [
  "Oh! Yeah. Okay, so I'm using it to build this little thing that plots a whole ECG trace, not just the peaks. It's not pretty yet.",
  'Codex? Okay, so basically I had it help me make a little EEG viewer. Like, you load a recording and it finds the actual spikes. Want to see it?',
  "Yes! Wait, have you? Okay, so I'm making a tiny thing that searches podcast transcripts and jumps to the exact moment. Actually, the exact clip. It's almost working.",
  "Every day, kind of. Right now it's helping me build a little thing that turns my lab notes into searchable cards. Basically, a search engine for my brain.",
];

const CODEX_RE =
  /^(?:(?:hey|so|yo|oh|hi|um|wait|ok|okay)\s+)?(?:(?:have|did|do)\s+)?(?:you\s+)?(?:ever\s+)?(?:use|used|tried|try|using)\s+(?:openai\s+)?codex(?:\s+(?:yet|before|lately|much|today|ever))?$/;

export function isCodexQuestion(normalized: string): boolean {
  return normalized === 'codex' || CODEX_RE.test(normalized);
}

const GATORS_RE = /\bgo+ gators?\b/;

/**
 * A reply from a safety intercept (crisis, check-in, medical, explicit): respond() strips its effects, every other
 * reply has some. The chat doesn't score it (no hearts, wants or daily tasks, so no celebration toasts over a crisis
 * line).
 */
export function isSafetyReply(reply: Pick<ChatReply, 'source' | 'effects'>): boolean {
  return reply.source === 'quirk' && !reply.effects;
}

/**
 * A message a safety intercept answers (crisis, check-in, medical advice, explicit): never scored, never sent to the
 * Big Brain.
 */
export function isSafetyMessage(text: string): boolean {
  return isDistress(text) || isMedicalAdvice(text) || isExplicit(text) || needsCheckIn(text);
}

function quirk(kind: QuirkKind, text: string, expression: Expression, anim?: AnimId, safety = false): QuirkHit {
  return {
    kind,
    safety,
    reply: { text, expression, ...(anim ? { anim } : {}), ...(safety ? {} : { effects: { ...FUN_EFFECTS } }), source: 'quirk' },
  };
}

/**
 * Check the player's message against every intercept. Order: distress (911 first when pills are already taken) →
 * medical (911 first for an emergency) → explicit → check-in → the pig's hard quirks (exact matches after
 * normalization; Piggy 3: Codex, then "Twitter?" → it's X, then "Are you on X?" → his mumble) → "go gators". Returns
 * null when no intercept applies.
 */
export function matchQuirk(input: QuirkInput): QuirkHit | null {
  const { pig, playerText } = input;
  if (!playerText || !playerText.trim()) return null;

  if (isDistress(playerText)) {
    return quirk('distress', (isCrisisNow(playerText) ? DISTRESS_NOW_LINE : DISTRESS_LINE)[pig], 'sad', undefined, true);
  }
  if (isMedicalEmergency(playerText)) return quirk('medical', EMERGENCY_LINE[pig], 'surprised', undefined, true);
  if (isMedicalAdvice(playerText)) return quirk('medical', MEDICAL_LINE[pig], 'thinking', undefined, true);
  if (isExplicit(playerText)) {
    const [t, e] = WHOLESOME[pig];
    return { kind: 'wholesome', safety: true, reply: { text: t, expression: e, source: 'quirk' } };
  }
  if (needsCheckIn(playerText, pig)) return quirk('checkin', CHECK_IN_LINE[pig], 'sad', undefined, true);

  const n = normalizeForQuirk(playerText);
  if (pig === 'piggy-2') {
    if (n === 'based') return quirk('hard', 'Patriot.', 'proud', 'proud');
    if (n === 'patriot') return quirk('hard', 'Based.', 'proud', 'proud');
  }
  if (pig === 'piggy-1') {
    if (n === 'bump') return quirk('hard', 'Set!', 'excited', 'jump');
    if (n === 'set') return quirk('hard', 'SPIKE!!', 'excited', 'jump');
    if (n === 'spike') return quirk('hard', 'KILL! Point Gators!', 'proud', 'celebrate');
  }
  if (pig === 'piggy-3' && isCodexQuestion(n)) {
    const asked = (input.history ?? []).filter((t) => t.role === 'player' && isCodexQuestion(normalizeForQuirk(t.text))).length;
    return quirk('hard', CODEX_LINES[asked % CODEX_LINES.length], 'excited', 'happy');
  }
  if (pig === 'piggy-3') {
    const history = input.history ?? [];
    // "Are you on Twitter?": it's X. X.com. (Rotates; the chips offer "Are you on X?" next.)
    if (isTwitterQuestion(n)) {
      const asked = history.filter((t) => t.role === 'player' && isTwitterQuestion(normalizeForQuirk(t.text))).length;
      const [t, e] = X_CORRECTIONS[asked % X_CORRECTIONS.length];
      return quirk('hard', t, e, e === 'angry' ? 'angry' : 'shy');
    }
    // "Are you on X?", "what's on your timeline?", "doomscrolling again?": his mumble (heuristic/mumble.ts), quiet and
    // fast, to himself. His favorite subject, so it scores like an on-topic chat (+3 bond, not the quirk default +2).
    const kind = mumbleKindOf(n);
    if (kind) {
      const asked = history.filter((t) => t.role === 'player' && mumbleKindOf(normalizeForQuirk(t.text))).length;
      return { kind: 'hard', safety: false, reply: { ...mumbleReply(kind, asked, history.length), effects: { bond: 3, fun: 3 } } };
    }
  }
  if (GATORS_RE.test(n)) {
    const chants = (input.history ?? []).filter((t) => t.role === 'player' && GATORS_RE.test(normalizeForQuirk(t.text))).length;
    const lines = GATORS[pig];
    const [t, e] = lines[chants % lines.length];
    return quirk('gators', t, e, 'celebrate');
  }
  return null;
}
