// "PigScript" snippets for Bug Hunt: small, correct, game-themed programs (2-space indent, ≤ 34 chars/line).
// Generic mutators find most bug sites themselves; templates add the ones that need context
// (wrong constants, special off-by-ones) and optional Piggy 3 explanations with more flavor.

export type BugType =
  | 'typo' | 'wrong_constant' | 'flipped_comparison' | 'assign_vs_equals'
  | 'assign_vs_plus_equals' | 'swapped_args' | 'missing_increment' | 'off_by_one';

export const BUG_TYPES: readonly BugType[] = [
  'typo', 'wrong_constant', 'flipped_comparison', 'assign_vs_equals',
  'assign_vs_plus_equals', 'swapped_args', 'missing_increment', 'off_by_one',
] as const;

export interface ConstantSite { line: number; from: string; to: string; why: string }
export interface ExplicitSite { line: number; to: string; why: string }

export interface Template {
  id: string;
  /** What the code is supposed to do (shown above the code). */
  title: string;
  lines: string[];
  constants?: ConstantSite[];
  offByOne?: ExplicitSite[];
  /** Flavor explanations that override the generic ones for this template. */
  explain?: Partial<Record<BugType, string>>;
}

export const TEMPLATES: readonly Template[] = [
  {
    id: 'feed_all', title: 'Feed every pig',
    lines: ['def feed_all(pigs):', '  for i in range(len(pigs)):', '    pigs[i].hunger += 25', '  return pigs'],
    constants: [{ line: 2, from: '25', to: '250', why: "A tray is 25 hunger, not 250. He'd explode. Politely." }],
    explain: { off_by_one: "Actually, that's an off-by-one. The loop skips the last pig. Which is me. Rude." },
  },
  {
    id: 'rally', title: 'Three touches per side',
    lines: ['touches = 0', 'while touches < 3:', '  bump_set_spike()', '  touches += 1', 'print("Point Gators!")'],
    constants: [{ line: 1, from: '3', to: '4', why: 'Three touches per side. A fourth touch is a violation. Piggy 1 would know.' }],
  },
  {
    id: 'bedtime', title: 'Is it bedtime?',
    lines: ['def is_bedtime(hour):', '  if hour >= 22:', '    return True', '  return False'],
    constants: [{ line: 1, from: '22', to: '12', why: 'Bedtime at 12? Noon naps are nice, but bedtime is 22:00.' }],
    explain: { flipped_comparison: 'Actually, `<=` makes it bedtime all day. Piggy 2 would be thrilled, honestly.' },
  },
  {
    id: 'perfusion', title: 'Perfusion meter',
    lines: ['meter = 70', 'for beat in beats:', '  if beat == "perfect":', '    meter += 3', '  elif beat == "miss":', '    meter -= 6'],
    constants: [{ line: 0, from: '70', to: '7', why: 'The meter starts at 70, not 7. Starting at 7 is just... ischemic.' }],
  },
  {
    id: 'wallet', title: 'Pay for a tender sub',
    lines: ['def pay(wallet, price):', '  if wallet >= price:', '    wallet -= price', '  return wallet', 'acorns = pay(acorns, 18)'],
    explain: { swapped_args: 'The arguments are swapped. `pay` wants the wallet first, then the price. Otherwise the sub pays you.' },
  },
  {
    id: 'eeg', title: 'Read one second of EEG',
    lines: ['samples = []', 'i = 0', 'while i < 256:', '  samples.append(read_eeg(i))', '  i += 1'],
  },
  {
    id: 'bats', title: 'Count the Lake Alice bats',
    lines: ['bats = 0', 'for barn in bat_barns:', '  bats += barn.count', 'print(bats, "bats tonight!")'],
    explain: { assign_vs_plus_equals: 'Actually, `=` keeps only the last barn. It has to add with `+=`. Half a million bats, lost.' },
  },
  {
    id: 'hydrate', title: 'Hydration check',
    lines: ['def needs_water(cups):', '  if cups < 8:', '    return "Hydrate. Based."', '  return "Patriot."'],
    constants: [{ line: 1, from: '8', to: '80', why: 'Eighty cups is not hydration. That is a lake. It should be 8.' }],
  },
  {
    id: 'study', title: 'Study timer',
    lines: ['def study_minutes(hours):', '  return hours * 60', 'timer = study_minutes(2)', 'print(timer, "minutes. Go.")'],
    constants: [{ line: 1, from: '60', to: '100', why: 'An hour is 60 minutes, not 100. Metric time is not real. Sadly.' }],
  },
  {
    id: 'practice', title: 'Sand practice days',
    lines: ['practice = 0', 'for day in range(7):', '  if day % 2 == 0:', '    practice += 1', 'print(practice, "sessions")'],
    constants: [{ line: 1, from: '7', to: '8', why: 'A week has 7 days. Piggy 1 wishes it had 8, but no.' }],
  },
  {
    id: 'tuck', title: 'Tuck everyone in',
    lines: ['def tuck_in(pigs):', '  for pig in pigs:', '    pig.asleep = True', '    pig.bond += 10', '  return pigs'],
    explain: { assign_vs_plus_equals: "Okay, so `=` sets everyone's bond to 10. We'd all be strangers again. It needs `+=`." },
  },
  {
    id: 'ischemia', title: 'Ischemia alarm',
    lines: ['def check(perfusion):', '  if perfusion < 30:', '    alarm("ISCHEMIA!")', '  else:', '    chart("Perfusion: based")'],
    constants: [{ line: 1, from: '30', to: '300', why: 'Perfusion is a percent, so 300 never happens and the alarm never rings. It should be 30.' }],
    explain: { flipped_comparison: 'Actually, `>` rings the alarm when perfusion is GOOD. Piggy 2 would honestly love that.' },
  },
  {
    id: 'print_queue', title: 'Run the 3D print queue',
    lines: ['jobs = ["charm", "badge", "tower"]', 'while len(jobs) > 0:', '  job = jobs.pop(0)', '  print_3d(job)'],
    offByOne: [{ line: 1, to: 'while len(jobs) > 1:', why: 'Actually, `> 1` stops with one job left. The tower never prints. It leans anyway.' }],
  },
  {
    id: 'serve_stats', title: 'Serve accuracy',
    lines: ['def accuracy(made, attempts):', '  return made / attempts * 100', 'score = accuracy(made, attempts)', 'print(score, "% on serves!")'],
    constants: [{ line: 1, from: '100', to: '10', why: 'A percent needs × 100, not × 10. Piggy 1 is not 8.75% accurate.' }],
    explain: { swapped_args: "Swapped arguments. It's made over attempts, not attempts over made. 114% sounds cool though." },
  },
  {
    id: 'petal_score', title: 'Score the petals',
    lines: ['score = 0', 'for petal in caught:', '  if petal == "gold":', '    score += 10', '  else:', '    score += 1'],
    constants: [{ line: 3, from: '10', to: '100', why: 'A golden petal is worth 10, not 100. Nice try, though.' }],
  },
  {
    id: 'hearts', title: 'Hearts from bond',
    lines: ['def hearts(bond):', '  level = bond // 100', '  if level > 10:', '    level = 10', '  return level'],
    constants: [{ line: 1, from: '100', to: '10', why: 'One heart per 100 bond, not 10. That would be ten hearts on day one.' }],
    explain: { flipped_comparison: 'Actually, `<` caps everyone at ten hearts. Even total strangers. That is backwards.' },
  },
  {
    id: 'csf', title: 'Drain CSF until normal',
    lines: ['pressure = read_pressure()', 'while pressure > 20:', '  drain(5)', '  pressure -= 5', 'print("Pressure normalizing.")'],
    explain: { missing_increment: 'Okay, so `pressure - 5` is computed and thrown away. Pressure never drops. Piggy 2 is NOT okay.' },
  },
  {
    id: 'chomp', title: 'Clap the chomp',
    lines: ['def chomp(times):', '  for i in range(times):', '    clap()', '  return "Go Gators!"'],
    offByOne: [{ line: 1, to: '  for i in range(times - 1):', why: "Off-by-one. `times - 1` claps one short. The whole section would notice." }],
  },
  {
    id: 'battery', title: 'KempaPager battery',
    lines: ['battery = 100', 'for hour in range(8):', '  battery -= 10', 'if battery < 20:', '  print("Charge me!")'],
    constants: [{ line: 0, from: '100', to: '10', why: 'It starts full at 100, not 10. At 10 the pager dies before breakfast.' }],
  },
  {
    id: 'share', title: 'Share the oranges',
    lines: ['def share(snacks, friends):', '  return snacks // friends', 'each = share(12, 3)', 'print(each, "oranges each")'],
    explain: { swapped_args: 'The arguments are swapped. Twelve oranges for three pigs is 4 each. Swapped, it is zero. Tragic.' },
  },
  {
    id: 'sleep_avg', title: 'Average sleep this week',
    lines: ['hours = 0', 'for night in week:', '  hours += night.sleep', 'avg = hours / 7'],
    constants: [{ line: 3, from: '7', to: '5', why: 'A week has 7 nights, so divide by 7. Dividing by 5 makes everyone look well-rested.' }],
  },
  {
    id: 'fix_lines', title: 'Count fixed lines',
    lines: ['fixed = 0', 'for line in code:', '  if line.broken == True:', '    fix(line)', '    fixed += 1'],
  },
  {
    id: 'find_pig', title: 'Find Piggy 3 in the list',
    lines: ['i = 0', 'while i < len(pigs):', '  if pigs[i] == "Piggy 3":', '    break', '  i += 1'],
    explain: { missing_increment: "Okay, so `i + 1` doesn't save anything. `i` stays 0 forever. You'd never find me." },
  },
  {
    id: 'countdown', title: '3-2-1 countdown',
    lines: ['count = 3', 'while count > 0:', '  print(count)', '  count -= 1', 'print("Go!")'],
    constants: [{ line: 0, from: '3', to: '30', why: "It's a 3-2-1 countdown, not 30. Nobody is waiting that long." }],
  },
  {
    id: 'dango', title: 'Eat the dango',
    lines: ['stick = ["pink", "white", "green"]', 'for i in range(len(stick)):', '  eat(stick[i])', 'print("Hanami complete.")'],
    explain: { off_by_one: 'Actually, that is an off-by-one. One dango never gets eaten. I would notice. I always notice.' },
  },
  {
    id: 'vitals', title: 'Stable vitals',
    lines: ['def stable(hr, bp):', '  if hr >= 60 and hr <= 100:', '    return bp == "normal"', '  return False'],
    constants: [{ line: 1, from: '100', to: '1000', why: 'A heart rate of 1000 is not stable. It is a hummingbird. The limit is 100.' }],
  },
  {
    id: 'omikuji', title: 'Draw an omikuji',
    lines: ['def draw(roll):', '  if roll < 10:', '    return "Great Blessing"', '  elif roll < 40:', '    return "Blessing"', '  return "Small Blessing"'],
  },
  {
    id: 'walk', title: 'Walk to the sand courts',
    lines: ['steps = 0', 'distance = 400', 'while steps < distance:', '  walk()', '  steps += 1'],
  },
  {
    id: 'gift', title: 'Give a daily gift',
    lines: ['def give(gift, pig):', '  pig.bond += gift.value', '  pig.gifts += 1', 'give(charm, piggy3)'],
    explain: { swapped_args: "Swapped. `give` wants the gift first, then the pig. Otherwise you're gifting me to the charm." },
  },
  {
    id: 'feed_one', title: 'Feed one pig a snack',
    lines: ['def feed(pig, snack):', '  pig.hunger += snack.fill', '  pig.fed += 1', 'feed(piggy1, orange)'],
    explain: { swapped_args: "Swapped. `feed` wants the pig first, then the snack. Right now the orange is eating Piggy 1." },
  },
  {
    id: 'rotation', title: 'Rotate the lineup',
    lines: ['def rotate(team, k):', '  return team[k:] + team[:k]', 'lineup = rotate(players, 1)', 'serve(lineup[0])'],
    explain: { swapped_args: 'Swapped arguments: `rotate` wants the team first, then how far to turn. A rotation IS a circular buffer.' },
  },
  {
    id: 'heart_rate', title: 'Average heart rate',
    lines: ['beats = [72, 74, 71, 73]', 'total = 0', 'for i in range(len(beats)):', '  total += beats[i]', 'avg = total / len(beats)'],
    explain: { off_by_one: 'Off-by-one: the loop skips the last beat, so the average comes out low. Piggy 2 would chart it.' },
  },
  {
    id: 'wave', title: 'Wave at everyone',
    lines: ['names = ["P1", "P2", "P3"]', 'for i in range(len(names)):', '  wave_at(names[i])', 'print("Hi, team!")'],
    explain: { off_by_one: "Actually, that's an off-by-one. Nobody waves at P3. Which is me. Again." },
  },
  {
    id: 'secret', title: 'Secret favorite check',
    lines: ['def is_secret(food, pig):', '  if food == pig.secret:', '    return True', '  return False'],
    explain: { assign_vs_equals: 'Wait— `=` would overwrite his secret favorite. Checking needs `==`. And it stays secret.' },
  },
  {
    id: 'carillon', title: 'Ring the carillon',
    lines: ['def chime(hour):', '  for i in range(hour):', '    ring_bell()', 'chime(12)'],
    offByOne: [{ line: 1, to: '  for i in range(hour - 1):', why: 'Off-by-one: it rings 11 times at noon. Century Tower would be so embarrassed.' }],
  },
];
