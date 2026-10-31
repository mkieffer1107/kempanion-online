// Content rules shared by the line-bank tests (not a test file itself). The same lists as heuristic.test.ts's ANIMS
// and BANNED; that file can import them from here instead of keeping its own copy.

/** Every AnimId: the 42 everyday base clips plus 'held', and the 24 alternate-outfit specialty clips. */
export const ANIMS: ReadonlySet<string> = new Set([
  'idle', 'blink', 'wave', 'look_around', 'walk_right', 'walk_front', 'walk_back', 'run_right', 'walk_left', 'run_left',
  'jump', 'tumble', 'sit_down', 'stand_up', 'eat', 'drink', 'bath', 'brush_teeth', 'yawn', 'sleep', 'wake_up', 'sick',
  'happy', 'sad', 'angry', 'scared', 'love', 'shy', 'surprised', 'confused', 'celebrate', 'dance', 'play_ball', 'bored',
  'hungry', 'thirsty', 'dirty', 'cry', 'laugh', 'proud', 'thinking', 'pet_reaction', 'held', 'phone',
  'volleyball_serve', 'volleyball_bump', 'volleyball_set', 'volleyball_spike', 'volleyball_dig', 'volleyball_block',
  'volleyball_ready', 'volleyball_win', 'review_mri', 'brain_model', 'neuro_exam', 'write_chart', 'scrub_up',
  'surgical_focus', 'preop_check', 'clinical_success', 'typing', 'debugging', 'explain_code', 'ai_idea', 'code_review',
  'build_success', 'coffee_break', 'invite_to_code',
]);

/** Krishna Lunch, the retired chant, pork foods, weight jokes, mascot likenesses, politics. */
export const BANNED =
  /krishna|gator bait|bacon|\bhams?\b|pork|sausage|pepperoni|prosciutto|chorizo|hot ?dog|\bribs\b|salami|\blard\b|\bfat\b|albert|trump|biden|maga|democrat|republican/i;
