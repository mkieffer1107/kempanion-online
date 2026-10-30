// Entity extraction on normalized text: foods → canonical item ids (GAME_DESIGN §8), places → LocationId,
// pig names/numbers → PigId, plain numbers. Also flags pork foods, which no pig will ever eat.
import type { LocationId, PigId } from '../../types';

export interface FoodRef {
  /** Canonical item id, or 'generic' for everyday food that is not a shop item. */
  id: string;
  /** How a pig says it out loud. */
  label: string;
}

export interface Entities {
  foods: FoodRef[];
  places: LocationId[];
  pigs: PigId[];
  numbers: number[];
  /** Mentions a pork food (or a bacon joke). */
  pork: boolean;
  /** Mentions "the other pigs" / everyone. */
  allPigs: boolean;
}

/** Dialogue names for every food/drink/care item a pig might talk about. */
export const FOOD_LABEL: Record<string, string> = {
  dining_tray: 'a dining hall tray', water_bottle: 'water', tender_sub: 'tender sub', pizza_slice: 'pizza',
  cup_ramen: 'cup ramen', onigiri: 'onigiri', melonpan: 'melonpan', apple_pie: 'apple pie', key_lime_pie: 'key lime pie',
  boiled_peanuts: 'boiled peanuts', acai_bowl: 'acai bowl', protein_shake: 'banana protein shake', watermelon: 'watermelon',
  oranges: 'oranges', pastelito: 'pastelito', blueberries: 'blueberries', sakura_dango: 'sakura dango',
  truffle_fries: 'truffle fries', sideline_sip: 'Sideline Sip', florida_oj: 'Florida OJ', sweet_tea: 'sweet tea',
  cafecito: 'cafecito', cold_brew: 'cold brew', boba_tea: 'boba', strawberry_milk: 'strawberry milk',
  vegan_ice_cream: 'vegan ice cream', honey_lemon_tea: 'honey lemon tea', ginger_ale: 'ginger ale', cold_medicine: 'cold medicine',
};

// Order matters: longer / more specific phrases first; each match is blanked out before the next rule runs.
const FOOD_RULES: [RegExp, string, string?][] = [
  [/\bstrawberry milk\b|\bpink milk\b/g, 'strawberry_milk'],
  [/\bhoney (?:lemon )?tea\b|\blemon tea\b/g, 'honey_lemon_tea'],
  [/\bginger ale\b/g, 'ginger_ale'],
  [/\bcold (?:medicine|meds)\b|\bmedicine\b|\bcough syrup\b/g, 'cold_medicine'],
  [/\bsweet tea\b|\biced tea\b/g, 'sweet_tea'],
  [/\bbubble tea\b|\bmilk tea\b|\bboba(?: tea)?\b/g, 'boba_tea'],
  [/\bcold brew\b|\biced coffee\b|\blatte\b|\bcoffee\b/g, 'cold_brew'],
  [/\bcafecito\b|\bcuban coffee\b|\bcolada\b|\bespresso\b|\bcafe con leche\b/g, 'cafecito'],
  [/\b(?:florida )?(?:oj|orange juice)\b/g, 'florida_oj'],
  [/\bgatorade\b/g, 'sideline_sip', 'Gatorade'],
  [/\bsports drinks?\b|\bsideline sip\b|\belectrolytes?\b|\bpowerade\b/g, 'sideline_sip'],
  [/\bkey lime(?: pie)?\b/g, 'key_lime_pie'],
  [/\bapple pie\b|\bpie\b/g, 'apple_pie'],
  [/\b(?:chicken )?tender subs?\b|\bpub ?subs?\b|\bsubs?\b|\bsandwich(?:es)?\b|\bhoagies?\b|\bchicken tenders?\b/g, 'tender_sub'],
  [/\bpizza(?: slices?)?\b|\bslices? of pizza\b/g, 'pizza_slice'],
  [/\b(?:cup )?ramen\b|\bcup noodles?\b|\binstant noodles\b|\bnoodles\b/g, 'cup_ramen'],
  [/\bonigiri\b|\brice balls?\b/g, 'onigiri'],
  [/\bmelon ?pan\b|\bmelon bread\b/g, 'melonpan'],
  [/\bboiled peanuts?\b|\bpeanuts?\b/g, 'boiled_peanuts'],
  [/\bacai(?: bowls?)?\b/g, 'acai_bowl'],
  [/\b(?:banana )?protein (?:shakes?|smoothies?)\b|\bbanana (?:shakes?|smoothies?)\b|\bsmoothies?\b|\bshakes?\b|\bprotein\b/g, 'protein_shake'],
  [/\bwatermelons?\b/g, 'watermelon'],
  [/\boranges?\b|\bclementines?\b|\btangerines?\b/g, 'oranges'],
  [/\bpastelitos?\b|\bguava(?: pastry| pastries)?\b/g, 'pastelito'],
  [/\bblueberr(?:y|ies)\b|\bberries\b/g, 'blueberries'],
  [/\b(?:sakura )?dango\b|\bmochi\b/g, 'sakura_dango'],
  [/\btruffle fries\b|\bfrench fries\b|\bfries\b/g, 'truffle_fries'],
  [/\b(?:vegan )?ice cream\b|\bgelato\b|\bkarma cream\b/g, 'vegan_ice_cream'],
  [/\bdining hall\b|\bcafeteria\b|\bdining tray\b/g, 'dining_tray'],
  [/\bwater(?: bottle)?\b|\bh2o\b/g, 'water_bottle'],
  [/\btea\b/g, 'sweet_tea'],
];

/** Everyday foods that are not shop items: still food talk, just no taste table entry. */
const GENERIC_FOOD = /\b(cookies?|cake|cupcakes?|brownies?|donuts?|doughnuts?|candy|chocolate|popcorn|bagels?|burritos?|tacos?|sushi|curry|pasta|soup|salad|burgers?|nachos|muffins?|pancakes?|waffles?|cereal|fruit|apples?|bananas?|grapes|crackers|pretzels|chips|gummies|snacks?|treats?)\b/;

const PORK = /\b(?:bacon|hams?|pork|porkchops?|pork chops?|pulled pork|sausages?|pepperoni|prosciutto|chorizo|chicharrones|chicharron|carnitas|tonkatsu|spam|hot ?dogs?|ribs|bratwursts?|brats|salami|pancetta|lard|cuban sandwich(?:es)?|croquetas?|bbq pork|bacon bits)\b/;

const PLACE_RULES: [RegExp, LocationId][] = [
  [/\bcentury tower\b|\bthe tower\b|\bbell tower\b|\bcarillon\b|\bclock tower\b|\bthe bells\b/, 'century_tower'],
  [/\bplaza(?: of the americas)?\b|\bthe lawn\b/, 'plaza'],
  [/\bmarston\b|\bscience library\b|\blibrary west\b|\blib west\b|\blibrary\b|\bmakerspace\b/, 'marston'],
  [/\bmalachowsk[iy]\b|\bmalachowsky hall\b|\bdata science (?:building|hall)\b|\bthe starship\b/, 'malachowsky'],
  [/\bphysics (?:building|lab|department)\b|\bnew physics building\b|\bnpb\b/, 'physics'],
  [/\bcommunicore\b|\bcollege of medicine\b|\bhealth science center\b|\bhsc\b/, 'communicore'],
  [/\banatomy lab\b|\bcadaver lab\b|\bgross lab\b/, 'anatomy_lab'],
  [/\bshands\b|\buf health\b|\bthe hospital\b|\bpharmacy\b/, 'shands'],
  [/\bstadium\b|\bthe swamp\b|\bben hill griffin\b|\bflorida field\b/, 'stadium'],
  [/\blake alice\b|\bbat (?:houses?|barns?)\b|\bthe bats\b|\bbats\b/, 'lake_alice'],
  [/\breitz(?: union)?\b|\bstudent union\b|\bthe union\b|\bcampus store\b|\bgame room\b/, 'reitz'],
  [/\b(?:sand |volleyball )courts?\b|\bthe courts\b|\buvs\b|\bflavet\b/, 'volleyball_courts'],
  [/\bmidtown\b|\buniversity ave(?:nue)?\b/, 'midtown'],
  [/\bsakura house\b|\bdorm\b|\bthe co ?op\b|\byour room\b/, 'dorm'],
];

const PIG_RULES: [RegExp, PigId][] = [
  [/\bpigg?y ?(?:1|one)\b|\bpig ?(?:1|one)\b|\bp1\b|\bvolleyball (?:guy|pig|one|boy)\b/, 'piggy-1'],
  [/\bpigg?y ?(?:2|two)\b|\bpig ?(?:2|two)\b|\bp2\b|\bthe (?:doctor|surgeon|med student)\b|\bdoctor pig\b|\bdoc\b/, 'piggy-2'],
  [/\bpigg?y ?(?:3|three)\b|\bpig ?(?:3|three)\b|\bp3\b|\bthe builder\b|\bhoodie (?:guy|pig|one)\b/, 'piggy-3'],
];

const ALL_PIGS = /\b(?:the other (?:pigs|piggies|two|boys|guys)|the others|everyone else|all three|the pig pen|pig pen|your (?:friends|roommates)|the piggies|the boys)\b/;

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, fifty: 50, hundred: 100,
};

export function extractEntities(text: string): Entities {
  const foods: FoodRef[] = [];
  if (!/\bham radio\b/.test(text)) {
    let rest = text;
    for (const [re, id, label] of FOOD_RULES) {
      re.lastIndex = 0;
      if (re.test(rest)) {
        re.lastIndex = 0;
        rest = rest.replace(re, ' ');
        if (!foods.some((f) => f.id === id)) foods.push({ id, label: label ?? FOOD_LABEL[id] ?? id });
      }
    }
    const generic = foods.length ? null : GENERIC_FOOD.exec(rest);
    if (generic && !PORK.test(text)) foods.push({ id: 'generic', label: generic[1] });
  }
  const places: LocationId[] = [];
  for (const [re, id] of PLACE_RULES) if (re.test(text) && !places.includes(id)) places.push(id);
  const pigs: PigId[] = [];
  for (const [re, id] of PIG_RULES) if (re.test(text) && !pigs.includes(id)) pigs.push(id);
  const numbers: number[] = [];
  for (const tok of text.split(' ')) {
    if (/^\d+(?:\.\d+)?$/.test(tok)) numbers.push(Number(tok));
    else if (tok in NUMBER_WORDS) numbers.push(NUMBER_WORDS[tok]);
  }
  return {
    foods,
    places,
    pigs,
    numbers,
    pork: PORK.test(text.replace(/\bham radio\b/g, ' ')),
    allPigs: ALL_PIGS.test(text),
  };
}
