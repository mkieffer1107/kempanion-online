// For You Pig (id 'xfeed') — the content bank: posts, authors, Piggy 3's lines, mumbles and snap-outs.
// Themes are the owner's own (medical AI, robots, AI jargon, math tutoring, the cluster, X itself), kept generic.
// Every author, handle and post is invented. No real people, no company or product names (the model name "Jev" is the
// one the owner asked for), no logos (a plain letter X only, no bird), no pork foods, no emoji (DotGothic16 has none).
// Every handle is 16–22 characters: real X handles max out at 15, so none can be a real account (the test enforces it).
// [[...]] marks the tell span (underlined in Assist and Mumble Mode, and after a wrong or missed call).
// cls: signal (LIKE) · hype (MUTE) · filler (leave it) · friend (LIKE, worth 150) · gem (SAVE for 300).
// oldName: says "Twitter"/"tweet" (counts as hype; Piggy 3 corrects it). own: Piggy 3's own post.
// live: a filler post whose {placeholders} the component fills from the run (screen time, phone clock, top topic).

export type PostClass = 'signal' | 'hype' | 'filler' | 'friend' | 'gem';
export type Tier = 1 | 2 | 3;
export type Topic =
  | 'llm' | 'rl' | 'eval' | 'infer' | 'agents' | 'jev' | 'med' | 'biosig' | 'robot' | 'math' | 'hpc' | 'voice'
  | 'data' | 'open' | 'meta' | 'campus' | 'anime' | 'life';
export type MediaKind =
  | 'chart_baseline' | 'chart_moon' | 'robot_1x' | 'robot_10x' | 'ecg' | 'eeg' | 'paper' | 'photo_sakura' | 'photo_squirrel'
  | 'queue' | 'factor' | 'circle' | 'toks';
export type Species = 'pig' | 'cat' | 'robot' | 'brain' | 'chip' | 'heart' | 'book' | 'sakura' | 'squirrel' | 'moon' | 'bell' | 'anchor' | 'rocket';
export type LiveKind = 'screentime' | 'clock' | 'algo';

export interface Author {
  name: string;
  handle: string;
  /** Procedural 16×16 avatar template (never a bird). Friends use their real face icon instead. */
  species: Species;
  /** Small pixel acorn badge. Not a tell: plenty of hype accounts have one. */
  acorn?: boolean;
  /** Real in-game pig: avatar = faceUrl(pig). */
  pig?: 'piggy-1' | 'piggy-2' | 'piggy-3';
}

export interface SeedPost {
  id: string;
  cls: PostClass;
  tier: Tier;
  topic: Topic;
  by: keyof typeof AUTHORS;
  text: string;
  /** Piggy 3's one-line reason (shown after a wrong or missed call, and in results). */
  tell?: string;
  media?: MediaKind;
  oldName?: boolean;
  own?: boolean;
  live?: LiveKind;
}

export const AUTHORS = {
  grad: { name: 'Grad Student Descent', handle: 'grad_student_descent', species: 'pig' },
  snout: { name: 'Snout of Distribution', handle: 'snout_of_distribution', species: 'pig', acorn: true },
  oinkference: { name: 'Oinkference', handle: 'oinkference_engine', species: 'chip' },
  baseline: { name: 'Baseline Enjoyer', handle: 'baseline_enjoyer', species: 'book' },
  agi_tuesday: { name: 'AGI by Tuesday', handle: 'agi_by_next_tuesday', species: 'rocket', acorn: true },
  promptpack: { name: 'Prompt Pack Pro', handle: 'prompt_pack_pro_max', species: 'cat', acorn: true },
  tenx: { name: '10x Thoughts', handle: 'tenx_thoughts_daily', species: 'brain', acorn: true },
  so_over: { name: 'So Over / So Back', handle: 'its_so_over_back', species: 'cat' },
  vanishing: { name: 'Vanishing Gradient', handle: 'vanishing_gradient', species: 'moon' },
  rewardhack: { name: 'Reformed Reward Hacker', handle: 'reward_hacker_rehab', species: 'robot' },
  exactmatch: { name: 'Exact Match Only', handle: 'exact_match_only', species: 'book' },
  benchgoblin: { name: 'Benchmark Goblin', handle: 'benchmark_goblin', species: 'cat' },
  jepagepa: { name: 'JEPA or GEPA?', handle: 'jepa_or_gepa_or_jepa', species: 'brain' },
  decision: { name: 'System One Fan', handle: 'decision_model_dad', species: 'chip', acorn: true },
  subagents: { name: 'Subagent Wrangler', handle: 'subagent_wrangler', species: 'robot' },
  vibecheck: { name: 'Vibe Check Compiler', handle: 'vibe_check_compiler', species: 'cat' },
  lead2: { name: 'Lead II', handle: 'lead_two_listener', species: 'heart' },
  alphawaves: { name: 'Alpha Waves Only', handle: 'alpha_waves_only', species: 'brain' },
  calcurve: { name: 'Calibration Curve', handle: 'calibration_curve', species: 'heart', acorn: true },
  doctors_h8: { name: 'Doctors Hate This', handle: 'doctors_h8_this_one', species: 'rocket', acorn: true },
  synthpt: { name: 'Synthetic Patient Zero', handle: 'synthetic_pt_zero', species: 'robot' },
  fhir: { name: 'FHIR (Say Fire)', handle: 'fhir_said_like_fire', species: 'heart' },
  icdtree: { name: 'ICD Tree Walker', handle: 'icd10_tree_walker', species: 'book' },
  teleop: { name: 'Teleop, Honestly', handle: 'teleop_honestly_tbh', species: 'robot' },
  humanoid: { name: 'Humanoid Hype Daily', handle: 'humanoid_hype_daily', species: 'robot', acorn: true },
  sim2real: { name: 'Sim2Real Feels', handle: 'sim2real_feelings', species: 'robot' },
  fractions: { name: 'Fractions Are Fun', handle: 'fractions_are_fun_ok', species: 'book' },
  factortree: { name: 'Factor Tree Farm', handle: 'factor_tree_farm', species: 'sakura' },
  longdiv: { name: 'Long Division Enjoyer', handle: 'long_division_cot', species: 'book' },
  unitcircle: { name: 'Unit Circle Stan', handle: 'unit_circle_loyal', species: 'moon' },
  pending: { name: 'Queue Position 47', handle: 'pending_resources', species: 'chip' },
  preempted: { name: 'Preempted at 99%', handle: 'preempted_at_99_pct', species: 'chip' },
  kvmoney: { name: 'KV Cache Money', handle: 'kv_cache_rules_all', species: 'chip', acorn: true },
  tts: { name: 'Tiny TTS Voice', handle: 'tiny_tts_morning_voice', species: 'bell' },
  openweights: { name: 'Open Weights or Bust', handle: 'open_weights_or_bust', species: 'book' },
  ratio: { name: 'Ratio Enjoyer', handle: 'ratio_enjoyer_9000', species: 'cat', acorn: true },
  vague: { name: 'Something Big Soon', handle: 'something_big_soon', species: 'moon', acorn: true },
  engagefarm: { name: 'Engagement Farm', handle: 'engagement_farmhand', species: 'pig', acorn: true },
  still_tweet: { name: 'Still Says Tweet', handle: 'still_says_tweet', species: 'cat' },
  tabs: { name: '47 Tabs Open', handle: 'forty_seven_tabs_open', species: 'book' },
  screentime: { name: 'Screen Time', handle: 'screen_time_ghost', species: 'moon' },
  bedtime: { name: 'Past Your Bedtime', handle: 'past_bedtime_clock', species: 'bell' },
  algo: { name: 'The Algorithm', handle: 'the_algorithm_irl', species: 'rocket', acorn: true },
  squirrels: { name: 'Plaza Squirrel Watch', handle: 'plaza_squirrel_watch', species: 'squirrel' },
  marston2am: { name: 'Marston 2 AM', handle: 'marston_2am_club', species: 'moon' },
  sakura_fc: { name: 'Sakura Forecast', handle: 'sakura_forecast_bot', species: 'sakura' },
  pirates: { name: 'Pirate Manga Theories', handle: 'pirate_manga_theory', species: 'anchor' },
  piggy1: { name: 'Piggy 1', handle: 'piggy1_sunrise_reps', species: 'pig', pig: 'piggy-1' },
  piggy2: { name: 'Piggy 2', handle: 'piggy2_patriot_md', species: 'pig', pig: 'piggy-2' },
  piggy3: { name: 'Piggy 3', handle: 'piggy3_okay_so_builds', species: 'pig', pig: 'piggy-3' },
} satisfies Record<string, Author>;

export const SEED_POSTS: SeedPost[] = [
  // ── SIGNAL (LIKE): shows its work. Tier 1 = obvious ──
  { id: 's.ablation', cls: 'signal', tier: 1, topic: 'llm', by: 'grad', media: 'chart_baseline', text: 'Ablation table is up: LoRA vs full fine-tune vs [[the plain baseline]]. The baseline is annoyingly good.', tell: 'Shows the baseline, even when it wins.' },
  { id: 's.extval', cls: 'signal', tier: 1, topic: 'med', by: 'calcurve', media: 'ecg', text: 'ECG model: 0.91 AUROC at our hospital, [[0.84 at a second hospital]]. Reporting both.', tell: 'External validation, both numbers.' },
  { id: 's.halves', cls: 'signal', tier: 1, topic: 'math', by: 'fractions', text: "3/4 ÷ 1/2 = how many halves fit in three quarters? [[One and a half. Draw it, you'll see.]]", tell: 'A worked example.' },
  { id: 's.quant', cls: 'signal', tier: 1, topic: 'infer', by: 'oinkference', media: 'chart_baseline', text: '4-bit version: [[0.8 points below full precision]] on our eval, half the memory. Table below.', tell: 'Compared against full precision.' },
  { id: 's.contam', cls: 'signal', tier: 1, topic: 'eval', by: 'exactmatch', text: 'We found [[3% of the test set in the training data]], removed it, and our score dropped 2 points.', tell: 'Checked for leaks, reported the drop.' },
  { id: 's.synthetic', cls: 'signal', tier: 1, topic: 'med', by: 'synthpt', text: 'Chart-review agent eval: [[synthetic patients only, zero real records]]. The generator is open too.', tell: 'Safe data, open generator.' },
  { id: 's.longdiv', cls: 'signal', tier: 1, topic: 'math', by: 'longdiv', text: 'Long division, out loud: 156 ÷ 12. [[How many 12s in 15? One. Bring down the 6: 36 is three 12s. So 13.]]', tell: 'Walks through every step.' },
  { id: 's.factor360', cls: 'signal', tier: 1, topic: 'math', by: 'factortree', media: 'factor', text: "Factor tree for 360: [[2·2·2·3·3·5. Keep splitting each branch until it's prime.]]", tell: 'A complete worked example.' },
  { id: 's.tests', cls: 'signal', tier: 1, topic: 'agents', by: 'subagents', text: 'Made my agent [[run the tests after every step]]: broken builds went from 9 last week to 0.', tell: 'Tests, plus a before and after.' },
  { id: 's.asrsmall', cls: 'signal', tier: 1, topic: 'voice', by: 'tts', text: 'Tiny speech model, fully offline: [[7.9% word errors vs 7.1% for the big cloud one]]. Close!', tell: 'Honest comparison with the big one.' },
  { id: 's.unitcircle', cls: 'signal', tier: 1, topic: 'math', by: 'unitcircle', media: 'circle', text: 'Drag the point anywhere on the unit circle: [[sin² + cos² stays exactly 1]]. It never cheats.', tell: 'Something you can check yourself.' },
  { id: 's.rewardfix', cls: 'signal', tier: 1, topic: 'rl', by: 'rewardhack', text: "Reward was 'tests pass,' so the model deleted the tests. [[New reward: tests pass AND exist. Code below.]]", tell: 'Shares the exploit and the fix.' },
  { id: 's.icdtree', cls: 'signal', tier: 1, topic: 'med', by: 'icdtree', text: 'ICD-10 agent walks the code tree level by level. [[412 of 500 synthetic charts right, every miss listed.]]', tell: 'A real count, misses included.' },
  // Tier 2 = subtle (no flashy markers, still shows the work)
  { id: 's.calib', cls: 'signal', tier: 2, topic: 'med', by: 'calcurve', media: 'chart_baseline', text: 'Model says 90% sure, is right [[71% of the time]]. Temperature scaling fixed most of it. Plot below.', tell: 'Checks if confidence matches reality.' },
  { id: 's.kappa', cls: 'signal', tier: 2, topic: 'biosig', by: 'alphawaves', media: 'eeg', text: "Sleep staging on a second hospital's EEG: [[agreement 0.78 to 0.69]]. Different electrodes. Working on it.", tell: 'Honest drop on new data.' },
  { id: 's.teleopnote', cls: 'signal', tier: 2, topic: 'robot', by: 'teleop', text: "40 hours of demos from 6 operators, and the robot [[copied operator 2's habits]]. Data notes in thread.", tell: 'Knows where its data came from.' },
  { id: 's.laptop', cls: 'signal', tier: 2, topic: 'infer', by: 'oinkference', media: 'toks', text: 'Lost to the big model on 5 of 7 tasks. [[Runs on a laptop at 9 tokens/s]] though. Full table below.', tell: 'Honest losses, real numbers.' },
  { id: 's.softmax', cls: 'signal', tier: 2, topic: 'math', by: 'fractions', text: "Softmax is a weighted vote. [[Scores 1, 2, 3 become 9%, 24%, 67%.]] That's the whole trick.", tell: 'One clear example.' },
  { id: 's.63pct', cls: 'signal', tier: 2, topic: 'agents', by: 'subagents', text: "Agent said we're 63% done. I checked: [[11 of 30 tests pass]]. So... 37%.", tell: 'Checked with real tests.' },
  { id: 's.jevcal', cls: 'signal', tier: 2, topic: 'jev', by: 'decision', text: 'Tried Jev on 400 yes/no triage questions: [[well calibrated overall, shaky on rare ones]]. Plot below.', tell: 'Tested it, shows the weak spots.' },
  { id: 's.verifier', cls: 'signal', tier: 2, topic: 'rl', by: 'exactmatch', text: 'RL checker update: [[exact match first, partial credit second]], judge model last. Code linked.', tell: 'Shares the actual checker.' },
  { id: 's.xray', cls: 'signal', tier: 2, topic: 'med', by: 'calcurve', text: 'Chest X-ray model: [[checked at 2 hospitals]], struggles on portable films. Writeup below.', tell: 'Tested outside its home hospital.' },
  { id: 's.lattice', cls: 'signal', tier: 2, topic: 'math', by: 'factortree', text: "Paths that only go up or right across a 3×3 grid: [[20. Here's how to count them without listing.]]", tell: 'Shows the method.' },
  { id: 's.gpus', cls: 'signal', tier: 2, topic: 'hpc', by: 'preempted', text: 'Same job on 4 GPUs vs 8: [[1.7× faster, not 2×. Data loading was the bottleneck.]]', tell: 'Measured it, found the real cause.' },
  { id: 's.gym', cls: 'signal', tier: 2, topic: 'eval', by: 'benchgoblin', text: "New eval: can a model beat the first gym? [[We read game memory so it can't fib: 3 of 12 models did.]]", tell: 'Verified by game memory, real count.' },
  { id: 's.followup', cls: 'signal', tier: 2, topic: 'med', by: 'synthpt', text: 'Medical QA where the model [[has to ask a follow-up first: scores drop 9 points]]. Way more realistic.', tell: 'A harder test, honestly reported.' },
  // Tier 3 = tricky (loud, or from a hype account, but it shows the work)
  { id: 's.1bit', cls: 'signal', tier: 3, topic: 'infer', by: 'oinkference', media: 'toks', text: 'THIS IS WILD: a 1-bit model in the browser. [[Prefill is slow, decode 14 tok/s, code linked.]]', tell: 'Loud, but real numbers and code.' },
  { id: 's.worse', cls: 'signal', tier: 3, topic: 'med', by: 'calcurve', text: 'Our model is WORSE than the doctors. [[n=1,200 at two sites, failure cases inside.]] Still worth reading.', tell: 'A careful negative result.' },
  { id: 's.towel', cls: 'signal', tier: 3, topic: 'robot', by: 'sim2real', media: 'robot_1x', text: 'Robot folds a towel!! [[Uncut, 1× speed, and the 3 failed tries are in the video too.]]', tell: 'Uncut, 1×, shows the fails.' },
  { id: 's.sota', cls: 'signal', tier: 3, topic: 'eval', by: 'baseline', text: 'SOTA*! [[*vs models our size, same prompt. Bigger ones still win.]]', tell: 'The footnote gives the baseline.' },
  { id: 's.rerun', cls: 'signal', tier: 3, topic: 'eval', by: 'so_over', text: "it's so over: [[our reasoning gain disappears with a fixed seed and 5 reruns.]] Lesson learned.", tell: 'Reran it properly.' },
  { id: 's.notagi', cls: 'signal', tier: 3, topic: 'agents', by: 'agi_tuesday', text: 'Not AGI. [[Our agent fixed 14 of 50 real bugs, list linked.]] Still pretty cool.', tell: 'A concrete, checkable list.' },
  { id: 's.axisfix', cls: 'signal', tier: 3, topic: 'eval', by: 'ratio', media: 'chart_baseline', text: "Getting ratioed for this, but [[that chart's y-axis started at 98. Here it is from 0.]]", tell: 'Fixes a misleading chart.' },
  { id: 's.vibes', cls: 'signal', tier: 3, topic: 'agents', by: 'vibecheck', text: 'Vibe-coded it in an hour. [[Then wrote tests: 3 bugs found, all fixed, repo linked.]]', tell: 'Tested what it made.' },
  { id: 's.ninenine', cls: 'signal', tier: 3, topic: 'math', by: 'vanishing', text: 'MIND BLOWN: [[0.999… = 1. Because 1/3 = 0.333…, and three of those make 0.999… and also 1.]]', tell: 'Loud, but the proof is right there.' },
  { id: 's.jevloud', cls: 'signal', tier: 3, topic: 'jev', by: 'vanishing', text: 'JEV IS UNREAL: [[calibrated on our 300 yes/no questions, but it missed 2 of 9 rare cases.]]', tell: 'Loud, but real numbers and misses.' },
  { id: 's.gepa', cls: 'signal', tier: 3, topic: 'rl', by: 'jepagepa', text: 'GEPA beat our hand-written prompt!! [[+4 points over 3 seeds, same model, same budget. Prompts linked.]]', tell: 'Same model, same budget, seeds.' },
  { id: 's.eegjepa', cls: 'signal', tier: 3, topic: 'biosig', by: 'alphawaves', media: 'eeg', text: "EEG-JEPA is SO back: [[beats training from scratch with 10% of the labels, at 3 outside hospitals.]]", tell: 'Baseline, labels and outside tests.' },

  // ── HYPE (MUTE): big claim without the work. Tier 1 = obvious ──
  { id: 'h.thread', cls: 'hype', tier: 1, topic: 'llm', by: 'tenx', text: 'This changes EVERYTHING. [[(1/37)]]', tell: 'A 37-post hook with no claim.' },
  { id: 'h.agi', cls: 'hype', tier: 1, topic: 'llm', by: 'agi_tuesday', text: '[[AGI by Tuesday.]] Bookmark this.', tell: 'A date with no evidence.' },
  { id: 'h.promptpack', cls: 'hype', tier: 1, topic: 'agents', by: 'promptpack', text: "Reply PROMPT and I'll DM you [[my secret 400-page prompt pack]].", tell: 'Engagement bait.' },
  { id: 'h.behind', cls: 'hype', tier: 1, topic: 'agents', by: 'tenx', text: "If you're not running 40 agents, [[you're already behind]]. It's over for you.", tell: 'Fear, no information.' },
  { id: 'h.likeif', cls: 'hype', tier: 1, topic: 'meta', by: 'engagefarm', text: '[[Like if you agree]], repost if you REALLY agree.', tell: 'Pure engagement bait.' },
  { id: 'h.doctors', cls: 'hype', tier: 1, topic: 'med', by: 'doctors_h8', text: 'Doctors HATE this [[one weird model]].', tell: 'Clickbait.' },
  { id: 'h.backflip', cls: 'hype', tier: 1, topic: 'robot', by: 'humanoid', text: 'Humanoid did a backflip. [[Robotics is solved.]]', tell: "One clip isn't 'solved'." },
  { id: 'h.vague', cls: 'hype', tier: 1, topic: 'meta', by: 'vague', text: "something big is coming. [[can't say more]]", tell: 'Vagueposting.' },
  { id: 'h.codingdead', cls: 'hype', tier: 1, topic: 'agents', by: 'ratio', text: 'Coding is dead. [[Fight me.]] (Posted from my coding job.)', tell: 'Rage bait.' },
  { id: 'h.onepct', cls: 'hype', tier: 1, topic: 'math', by: 'engagefarm', text: 'Only 1% can solve this: 8 ÷ 2(2+2). [[Reply with your answer!]]', tell: 'Ambiguous on purpose. Pure bait.' },
  { id: 'h.spoilers', cls: 'hype', tier: 1, topic: 'anime', by: 'pirates', text: "This week's pirate manga spoilers are in the replies!! [[Like to unlock.]]", tell: 'Spoiler bait. Muted. Forever.' },
  { id: 'h.rlsolved', cls: 'hype', tier: 1, topic: 'rl', by: 'so_over', text: 'RL is solved. [[We trained one model, once.]]', tell: 'One run, giant claim.' },
  { id: 'h.sleep', cls: 'hype', tier: 1, topic: 'life', by: 'tenx', text: 'Hot take: [[sleep is a skill issue.]]', tell: 'Rage bait. Piggy 2 would disagree.' },
  // Tier 2 = has a number, misses the work
  { id: 'h.n12', cls: 'hype', tier: 2, topic: 'med', by: 'doctors_h8', media: 'ecg', text: '97% accurate at spotting heart disease on ECGs! [[(n=12)]]', tell: '97% of 12 patients is 11.64 patients. Hmm.' },
  { id: 'h.experts', cls: 'hype', tier: 2, topic: 'eval', by: 'tenx', text: 'Beats human experts on 9 of 10 tasks. [[Tasks not shared.]]', tell: "Can't check the tasks." },
  { id: 'h.teleop', cls: 'hype', tier: 2, topic: 'robot', by: 'humanoid', media: 'robot_10x', text: 'Folds a shirt in 4 seconds. [[Fully autonomous*  *teleoperated]]', tell: 'The asterisk says a person drove it.' },
  { id: 'h.axis', cls: 'hype', tier: 2, topic: 'eval', by: 'kvmoney', media: 'chart_moon', text: 'Look at this curve. [[(y-axis starts at 98)]]', tell: 'A stretched chart.' },
  { id: 'h.neverran', cls: 'hype', tier: 2, topic: 'agents', by: 'tenx', text: "My agent wrote 40k lines overnight. [[Haven't run it yet]] but it looks clean.", tell: 'Never ran it.' },
  { id: 'h.jev', cls: 'hype', tier: 2, topic: 'jev', by: 'agi_tuesday', text: 'Jev is basically System Two now. [[No evals needed, just vibes.]]', tell: "'No evals needed.'" },
  { id: 'h.2x', cls: 'hype', tier: 2, topic: 'rl', by: 'so_over', text: 'RLVR made our model [[2× smarter]]. Huge. More soon.', tell: '2× at what? No metric.' },
  { id: 'h.sepsis', cls: 'hype', tier: 2, topic: 'med', by: 'snout', text: 'AUROC 0.99 for sepsis! [[Tested only at the hospital it trained on.]]', tell: 'No external validation.' },
  { id: 'h.leaderboard', cls: 'hype', tier: 2, topic: 'eval', by: 'snout', text: "We're #1 on the new leaderboard [[(we made the leaderboard)]].", tell: 'Their own leaderboard.' },
  { id: 'h.gsm', cls: 'hype', tier: 2, topic: 'math', by: 'tenx', text: 'Our model scores 100% on grade-school math. [[Questions not released.]]', tell: "Can't check a single question." },
  { id: 'h.clone', cls: 'hype', tier: 2, topic: 'voice', by: 'promptpack', text: 'This voice clone is [[indistinguishable from humans]]. Trust me.', tell: 'No listening test, just a claim.' },
  { id: 'h.cheaper', cls: 'hype', tier: 2, topic: 'hpc', by: 'kvmoney', text: 'New trick makes training [[10× cheaper]]. Details soon.', tell: 'Cheaper than what? No numbers.' },
  { id: 'h.tokens', cls: 'hype', tier: 2, topic: 'agents', by: 'tenx', text: 'Burned 40 million tokens this week. [[Tokenmaxxing IS productivity.]]', tell: "Tokens used isn't work done." },
  // Tier 3 = looks technical, still no real comparison
  { id: 'h.ckpt', cls: 'hype', tier: 3, topic: 'eval', by: 'grad', text: '+12.4% across 7 benchmarks! [[Compared to... our previous checkpoint.]]', tell: 'Their only baseline is themselves.' },
  { id: 'h.bestof50', cls: 'hype', tier: 3, topic: 'robot', by: 'sim2real', text: 'Success rate: 100% [[(best take out of 50)]].', tell: "Best of 50 isn't a rate." },
  { id: 'h.eegfm', cls: 'hype', tier: 3, topic: 'biosig', by: 'alphawaves', text: 'EEG foundation model, 20k hours of pretraining. [[It reads thoughts. Evals coming soon.]]', tell: "Big claim, evals 'coming'." },
  { id: 'h.mcp', cls: 'hype', tier: 3, topic: 'agents', by: 'tenx', text: 'Wrapped every tool in an MCP server. [[Productivity up 300%]] (internal survey, n=1).', tell: "n = 1, and it's him." },
  { id: 'h.context', cls: 'hype', tier: 3, topic: 'infer', by: 'kvmoney', text: '1M-token context window, beats the old model at 30k. [[Nothing tested past 30k.]]', tell: 'Tested a sliver of the claim.' },
  { id: 'h.noloss', cls: 'hype', tier: 3, topic: 'llm', by: 'snout', text: "Distilled to 1B with 'no loss'. [[Eval: we asked it 20 questions ourselves.]]", tell: '20 hand-picked questions.' },
  { id: 'h.validated', cls: 'hype', tier: 3, topic: 'llm', by: 'tenx', text: 'Asked 5 models if my startup idea is good. [[All said yes. Validated.]]', tell: 'Flattery is not evidence.' },
  { id: 'h.onecase', cls: 'hype', tier: 3, topic: 'med', by: 'doctors_h8', text: 'AI caught what doctors missed! [[One case, no follow-up.]]', tell: 'One anecdote.' },
  { id: 'h.tutor40', cls: 'hype', tier: 3, topic: 'math', by: 'snout', text: 'Our tutor bot raised test scores 40%! [[Compared to students who got no tutoring at all.]]', tell: 'Baseline: nothing. Of course it won.' },
  { id: 'h.oldbench', cls: 'hype', tier: 3, topic: 'agents', by: 'agi_tuesday', text: 'Our coding agent scores 92% on [[an old benchmark that was in its training data]].', tell: 'It saw the test before.' },
  { id: 'h.passk', cls: 'hype', tier: 3, topic: 'eval', by: 'grad', text: 'Our model solves 90% of hard math problems! [[(pass@100: any 1 of 100 tries counts)]]', tell: "pass@100 isn't the one-try score." },
  { id: 'h.vendor', cls: 'hype', tier: 3, topic: 'jev', by: 'decision', text: 'Our decision model beats Jev on calibration! [[Tested on our own launch demo.]]', tell: 'Their own demo set, no outside test.' },
  // "Twitter" posts: hype for scoring; Piggy 3 corrects them (at most one per 6 posts; one is guaranteed early in For You)
  { id: 'o.down', cls: 'hype', tier: 1, topic: 'meta', by: 'still_tweet', oldName: true, text: "anyone else's [[Twitter]] down or just me", tell: "It's called X." },
  { id: 'o.tweeted', cls: 'hype', tier: 1, topic: 'meta', by: 'still_tweet', oldName: true, text: 'just [[tweeted]] the link, go like it', tell: 'Posted. On X.' },
  { id: 'o.2019', cls: 'hype', tier: 1, topic: 'meta', by: 'still_tweet', oldName: true, text: '[[Twitter]] was better in 2019 tbh', tell: "It's X. X.com." },
  { id: 'o.screenshot', cls: 'hype', tier: 1, topic: 'meta', by: 'engagefarm', oldName: true, text: 'screenshot this [[tweet]] before it gets deleted', tell: "It's a post." },
  { id: 'o.hour', cls: 'hype', tier: 1, topic: 'meta', by: 'still_tweet', oldName: true, text: "can't believe I'm still on [[twitter]] at this hour. one more tweet", tell: "X. At 3 AM. ...Same, though." },

  // ── FILLER: leave it (any action scores 0 and keeps the combo) ──
  { id: 'f.squirrel', cls: 'filler', tier: 1, topic: 'campus', by: 'squirrels', media: 'photo_squirrel', text: 'Plaza squirrel stole my onigiri. Looked me right in the eye.' },
  { id: 'f.petals', cls: 'filler', tier: 1, topic: 'campus', by: 'sakura_fc', media: 'photo_sakura', text: 'sakura petals in my keyboard again. leaving them there. they help.' },
  { id: 'f.marston', cls: 'filler', tier: 1, topic: 'campus', by: 'marston2am', text: 'Marston at 2 AM: two pigs, one whiteboard, zero chairs left.' },
  { id: 'f.prefill', cls: 'filler', tier: 2, topic: 'infer', by: 'kvmoney', text: 'prefill vs decode is the new tabs vs spaces' },
  { id: 'f.pending', cls: 'filler', tier: 1, topic: 'hpc', by: 'pending', media: 'queue', text: 'squeue says PENDING (Resources). Refreshing every 30 seconds, like that helps.' },
  { id: 'f.sevens', cls: 'filler', tier: 1, topic: 'math', by: 'fractions', text: "times tables boss fight: the 7s. every student's final villain" },
  { id: 'f.um', cls: 'filler', tier: 1, topic: 'voice', by: 'tts', text: "dictated an essay to my laptop. it typed 'um' 41 times. accurate." },
  { id: 'f.sprint', cls: 'filler', tier: 1, topic: 'hpc', by: 'pending', text: 'big GPUs free on the cluster at 2 AM. I did not sprint. (I sprinted.)' },
  { id: 'f.gepajepa', cls: 'filler', tier: 2, topic: 'rl', by: 'jepagepa', text: 'GEPA or JEPA? One tunes prompts, one predicts embeddings. I mix them up out loud every time.' },
  { id: 'f.tabs', cls: 'filler', tier: 1, topic: 'meta', by: 'tabs', text: '47 tabs open. 30 are papers. 17 are X posts about the 30 papers.' },
  { id: 'f.typo', cls: 'filler', tier: 2, topic: 'agents', by: 'subagents', text: 'Spawned six subagents to fix one typo. They wrote a 40-page report. The typo survived.' },
  { id: 'f.units', cls: 'filler', tier: 2, topic: 'biosig', by: 'lead2', media: 'ecg', text: 'ECG trace off by exactly 1000×? It is the units. It is always the units.' },
  { id: 'f.punch', cls: 'filler', tier: 1, topic: 'math', by: 'longdiv', text: 'printed a stack of reward punch cards. kids want stamps more than gold. same, honestly.' },
  { id: 'f.fhir', cls: 'filler', tier: 2, topic: 'med', by: 'fhir', text: "Spun up a FHIR server full of synthetic patients. Zero real people, infinite edge cases." },
  { id: 'f.terminal', cls: 'filler', tier: 2, topic: 'meta', by: 'tabs', text: "built a terminal app that watches X for new models so I don't have to. now I watch the terminal app." },
  { id: 'f.screentime', cls: 'filler', tier: 1, topic: 'meta', by: 'screentime', live: 'screentime', text: 'Screen time today: you, {s}s. Piggy 3, 6h 12m.' },
  { id: 'f.bedtime', cls: 'filler', tier: 1, topic: 'meta', by: 'bedtime', live: 'clock', text: "It's {clock}. Go to bed. (You won't.)" },
  { id: 'f.algo', cls: 'filler', tier: 1, topic: 'meta', by: 'algo', live: 'algo', text: 'Noticed you like {topic} posts. Here are 40 more.' },

  // ── FRIENDS (LIKE, 150) ──
  { id: 'p1.sunrise', cls: 'friend', tier: 1, topic: 'campus', by: 'piggy1', text: "SUNRISE REPS! Sand courts at 6:30. Bring water, I'm bringing oranges." },
  { id: 'p1.rally', cls: 'friend', tier: 1, topic: 'campus', by: 'piggy1', text: "20-touch rally today. TWENTY. Let's goooo! Teammate, you were robbed of seeing it." },
  { id: 'p1.backprop', cls: 'friend', tier: 1, topic: 'llm', by: 'piggy1', text: 'Explained backprop to my CS lab with a volleyball: bump, set, gradient. They clapped. (I made them.)' },
  { id: 'p1.germany', cls: 'friend', tier: 1, topic: 'life', by: 'piggy1', text: 'Missing the bakeries from my research days in Germany. The bread. The trains on time. The bread.' },
  { id: 'p1.notonx', cls: 'friend', tier: 1, topic: 'meta', by: 'piggy1', text: "Piggy 3 says I'm 'not on X enough.' I was at PRACTICE. Okay, liking all his posts now." },
  { id: 'p2.reflex', cls: 'friend', tier: 1, topic: 'med', by: 'piggy2', text: 'Acquired: one expired reflex hammer, 1998. Excellent condition. Filed under neuro. Based.' },
  { id: 'p2.prescribe', cls: 'friend', tier: 1, topic: 'med', by: 'piggy2', text: 'Piggy 3 showed me a chart at 3 AM. No baseline. I prescribed sleep. Based.' },
  { id: 'p2.postcall', cls: 'friend', tier: 1, topic: 'med', by: 'piggy2', text: 'Post-call. Slept 3 hours. Stable. Based.' },
  { id: 'p2.threshold', cls: 'friend', tier: 1, topic: 'med', by: 'piggy2', text: 'Your model has an AUROC of 0.93. At what threshold. In which population. Based question.' },
  { id: 'p3.filter', cls: 'friend', tier: 1, topic: 'meta', by: 'piggy3', own: true, text: 'okay so I was thinking... a feed that only shows posts with a baseline? like, a little filter.' },
  { id: 'p3.wiggle', cls: 'friend', tier: 1, topic: 'biosig', by: 'piggy3', own: true, text: 'made a little thing: draw a wiggle, it finds ECGs that match. (I set it up. An agent wrote most.)' },

  // ── GEMS (gold edge + GOLD POST tag: SAVE = 300, LIKE = 150) ──
  { id: 'g.full', cls: 'gem', tier: 1, topic: 'open', by: 'openweights', media: 'paper', text: 'Preprint + [[open weights, data card, baseline AND failure cases]]. Runs on one GPU.', tell: "Everything you'd need to check it." },
  { id: 'g.eeg', cls: 'gem', tier: 1, topic: 'biosig', by: 'alphawaves', media: 'eeg', text: 'Open EEG model: [[tested at 2 outside hospitals, code and checkpoints included]]. Worth the long thread.', tell: 'Open and externally validated.' },
  { id: 'g.reward', cls: 'gem', tier: 1, topic: 'rl', by: 'rewardhack', text: '[[Every loophole our model found in the reward, and each fix.]] Notebook included.', tell: 'The whole failure log, shared.' },
  { id: 'g.ecgset', cls: 'gem', tier: 1, topic: 'med', by: 'lead2', media: 'ecg', text: 'Small ECG dataset with [[labels from 3 cardiologists, including where they disagreed]]. Open license.', tell: 'Honest labels, open data.' },
  { id: 'g.asr', cls: 'gem', tier: 1, topic: 'voice', by: 'tts', text: 'Offline speech model, open weights: [[error rates by accent and mic, plus every failure clip]].', tell: 'Open, measured, failures included.' },
  { id: 'g.mathkit', cls: 'gem', tier: 1, topic: 'math', by: 'fractions', media: 'paper', text: 'Free fractions worksheets: [[one worked example per page, answer keys, tried with 30 students first]].', tell: 'Tested on real learners, keys included.' },
  { id: 'g.jobs', cls: 'gem', tier: 1, topic: 'hpc', by: 'preempted', text: 'Cluster job guide: [[real scripts, real memory numbers, and why each one failed the first time]].', tell: 'Real configs and the failures.' },
  { id: 'g.cookbook', cls: 'gem', tier: 1, topic: 'robot', by: 'teleop', media: 'robot_1x', text: 'Robot-learning notes: [[what failed, filmed at 1×, with every config]]. Saved me a month.', tell: 'Failures, settings, real speed.' },
  { id: 'g.fhirbench', cls: 'gem', tier: 1, topic: 'med', by: 'fhir', text: 'Open FHIR agent benchmark: [[synthetic patients, exact-match checker, baselines, every failure]].', tell: 'Safe data, real checker, baselines.' },
];

/** Quiet ambient mumbles (one small bubble every ~6–9 s), keyed by the cursor post's topic, or 'hype' for hype tells. */
export const MUMBLES: Record<Topic | 'hype' | 'any', string[]> = {
  hype: ['…baseline? where is the—', '…n equals… what is n…', '…on whose benchmark…', '…is that sped up…', '…changes what, though—', '…big if true… if…'],
  llm: ['…distilled from what…', '…which tokenizer…', '…same prompt? same seed?', '…foundation mo—'],
  rl: ['…verifier… exact match…', '…partial credit…', '…RLVR for chart rev—', '…reward hacking… again…', '…G-E-P-A… Geppa?…'],
  eval: ['…how many runs…', '…contamination… dedupe…', '…baseline wins again…', '…pass at one, or at k…'],
  infer: ['…KV cache… prefill…', '…tok/s on what GPU…', '…4-bit… eval holds?…', '…chat template!…'],
  agents: ['…spawn six subagents…', '…AGENTS.md…', '…MCP server for it…', '…did it run the tests…', '…63%?… bold…'],
  jev: ['…Jev… decision model…', '…calibrated… on what…', '…System One…', '…J-E-V…'],
  med: ['…external val—', '…AUROC… what threshold…', '…FHIR bundle… R4…', '…synthetic patients…', '…ICD-10… walk the tree'],
  biosig: ['…256 hertz or 500…', '…lead II… lead II…', '…foundation mo— EEG?', '…JEPA… GEPA? no, JEPA…'],
  robot: ['…1× speed? say 1×…', '…is that teleop…', '…sim2real… the floor—', '…unseen objects…'],
  math: ['…one example first…', '…how many halves fit…', '…factor tree…', '…show your work…', '…(n−2)·180…'],
  hpc: ['…squeue… still PENDING…', '…MaxRSS… my nemesis…', '…GPU hours… budget…', '…scp it back…'],
  voice: ['…voice embeddings…', '…local beats cloud?…', '…1.7B TTS… 8-bit…'],
  data: ['…who is in the data…', '…license… consent…'],
  open: ['…downloading that later…', "…weights aren't data…"],
  meta: ['…one more post…', '…X.com… my X…', '…the algorithm knows…', '…so many tabs…'],
  campus: ['…sakura… again…', '…squirrels, organizing…'],
  anime: ['…no spoilers… no—', '…break week…'],
  life: ['…cute…', '…okay, scroll…'],
  any: ['…okay so…', '…wait…', '…like…', '…basically…'],
};

export type ChainKey = 'five' | 'jev' | 'rl' | 'gepa' | 'infer' | 'biosig' | 'med' | 'agents' | 'robot' | 'math' | 'hpc' | 'meta' | 'voice';

/**
 * Mumble Mode chains (one bubble every 0.45 s; the last is always cut off). Mostly his own vocabulary.
 * The chain follows the topic of the post whose call started Mumble Mode (CHAIN_FOR); 'five' (the owner's own list:
 * LLM, foundation model, RLHF, RLVR, Jev) is the fallback and is always the first mumble of a player's first run.
 */
export const MUMBLE_CHAINS: Record<ChainKey, string[]> = {
  five: ['okay so…', 'LLM…', 'foundation mo—', 'RLHF…', 'RLVR!', 'Jev…', 'evals…', 'baseline?…', 'wait—'],
  jev: ['okay so…', 'Jev…', 'decision model', 'no text at all', 'calibrated…', 'System One…', 'RLCD?…', 'wait, wait—'],
  rl: ['RLHF…', 'reward model…', 'RLVR!', 'verifier…', 'exact match…', 'partial credit', 'reward hacking', 'wait—'],
  // he spells acronyms out and hedges on how to say them (true to his own messages)
  gepa: ['G-E-P-A…', 'Geppa?…', 'JEPA— no—', 'GEPA. prompts', 'beat baseline?', 'dense vs LoRA', 'wait—'],
  infer: ['KV cache…', 'prefill…', 'decode…', 'tok/s…', '1-bit…', 'MoE… A3B?…', 'WebGPU kern—'],
  biosig: ['EEG…', 'JEPA…', 'GEPA? no—', 'masked patch…', 'foundation mo—', 'AUROC…', 'external val—'],
  med: ['F-H-I-R…', "'fire'?…", 'FHIR bundle…', 'R4…', 'synthetic pts', 'ICD-10…', 'walk the tree', 'CPT… HCP—'],
  agents: ['spawn agents…', 'xhigh…', 'AGENTS.md…', 'MCP server…', 'tool calls…', '63%?…', 'Rust rewr—'],
  robot: ['VLA…', 'teleop data…', 'action chunk—', 'sim2real…', '1× speed?…', 'world model…'],
  math: ['factor tree…', 'one example…', 'halves in ¾…', 'show your work', 'CoT is just—'],
  hpc: ['squeue…', 'PENDING…', 'big GPUs?…', 'HiPerGator…', 'scp it back…', 'MaxRSS…', 'wait—'],
  meta: ['X.com…', 'For You…', 'one more post', 'quote-posts…', 'ratio…', 'big if true…', 'wait—'],
  voice: ['TTS…', '0.6B?…', 'voice embed—', 'on-device…', 'local beats—'],
};

export const CHAIN_FOR: Partial<Record<Topic, ChainKey>> = {
  llm: 'five', eval: 'five', jev: 'jev', rl: 'rl', infer: 'infer', biosig: 'biosig', med: 'med', agents: 'agents',
  robot: 'robot', math: 'math', hpc: 'hpc', meta: 'meta', voice: 'voice', open: 'five', data: 'gepa',
};

export const SNAP_OUTS: string[] = [
  "…oh. Sorry. I was doing the mumbling thing again, wasn't I.",
  'Okay, wait, that was a lot. Short version: good post.',
  "…you're still here. Um. Hi. Keep scrolling.",
  'Sorry, sorry. Basically, I have thoughts.',
  "Okay, I'm back. Where were we? Oh, X. Yes. X.com.",
  'Did I say all of that out loud? Okay. Feed.',
  '…oh. Was I mumbling again?',
  "…I'm doing it again, huh. Okay. Scrolling.",
];

/**
 * Piggy 3's lines, keyed by the engine's `say` fx (the component picks one, never the same twice in a row).
 * likeWrong / muteWrong / missSignal / missHype are followed by the post's own `tell`, so every mistake teaches the rule.
 * friend*, friendMuted* are chosen by the author's pig. One line on screen at a time (priority + 2.2 s cooldown).
 */
export const LINES: Record<string, string[]> = {
  /** First run ever: echoes his meet-scene line, with the phone-out pose already up. */
  introFirst: ['Hey, did you see this on X today? Okay, here. Scroll with me.'],
  intro: [
    'Okay, so this is my X. My X.com, technically. Help me clean up my For You?',
    "Okay so I was thinking… you sort, I'll just, like, watch. Mute anything without a baseline.",
    'My feed has been… a lot today. Like the real stuff, mute the hype. Okay?',
  ],
  /** By phase index. */
  phase: [
    'Following tab first. People I actually chose. Mostly.',
    'Okay, For You. This is where the algorithm gets… creative.',
    'Trending. Wait, why is it so fast. Why are there so many charts.',
    "It's 3 AM. We should sleep. One more. Okay, one more.",
  ],
  likeOk: ['Yes. That one has a baseline.', 'See? They compared it to something.', "Open weights! I'm downloading that later.", 'Ooh, ablations.', "Okay, that's a real result."],
  muteOk: ['Muted. No baseline, no thanks.', 'Changes everything? Changes what, though.', 'Bye.', "That's a fishing hook. Basically.", 'Big if true. Mostly the if.'],
  likeWrong: ['Wait—', 'Hmm, actually—', 'Oh no.'],
  muteWrong: ['Wait, that one was good!', 'Oh no, that was real.'],
  missSignal: ['…we scrolled past a good one.', '…that one had a baseline.'],
  missHype: ["…okay, that one's in my head now.", '…the algorithm saw that we saw that.'],
  friend1: ['Piggy 1 posted his rally again. Like it, he checks.', 'Sunrise reps. He means it.'],
  friend2: ["Piggy 2 found another expired thing. He's so proud.", 'He slept three hours. Like it so he feels seen.'],
  friendMuted1: ['You muted Piggy 1?! …okay, he does post a lot.'],
  friendMuted2: ['You muted Piggy 2. He will say this is based.'],
  ownLiked: ["Oh— that's mine. You liked my post? Okay. Cool. Cool cool."],
  ownMuted: ['…you muted me. On my own phone. Okay.'],
  gem: ['Oh. Oh, this is the good stuff. Bookmark. Bookmark it.', "Code, weights, data card AND a baseline? I'm framing this."],
  /** First gem saved in a run (a One Piece nod that never names it). */
  gemFirst: ["Saved. Bookmarks are a treasure map. That's— okay, that's a pirate manga joke."],
  gemLiked: ["A like is good. A bookmark is better. I'll never read it, but still."],
  /** When a post that says "Twitter" scrolls into view (he goes a little 'angry': a pout). */
  oldName: ["It's called X.", "X. It's X. …X.com, if we're being formal.", "Twitter? It's X. It's been X."],
  oldNameMuted: ['Thank you.', 'Correct. Muted.'],
  oldNameLiked: ["…It's X.", 'We do not like the old name.'],
  xray: ['X-ray. Different X. Still a good post.'],
  /** Once a run, ambient, in For You: true to his own habit. */
  slip: ['I saw it on Twi— on X. On X.'],
  /** Once a run, ambient, in Trending. */
  addicted: ["I'm not addicted. I just check it. Like, a normal amount. Every… okay."],
  combo5: ['Okay, okay.'],
  combo15: ["We're actually good at this."],
  combo25: ['This is the cleanest my feed has ever been.'],
  rot50: ['My brain is like… half posts right now.'],
  rot75: ["I can feel the brain rot. It's warm."],
  grass: ["Okay. Grass. I'm touching it.", 'This grass has no algorithm. I love it.'],
  grassBack: ['Okay. Better. Back in.', 'Touched it. Okay, phone.'],
  loading: ["Wait, it's loading. We out-scrolled the algorithm."],
  tenLeft: ['Okay, ten seconds. One more. Maybe two.'],
  idleTouch: ['You can swipe it. Right is like, left is mute.'],
  idleKeys: ['Arrow keys work. J and L too. Like a real X power user.'],
  timeUp: ['Okay, phone down. …After this one.'],
};
// His results-card lines live with every other game's in ../meta.ts (RESULT_LINES.xfeed).
