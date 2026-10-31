// The story's [name] question uses the same inline answer row as [input]. Keep its original defaults and limits.
export const NAME_MAX = 12;
export const RANDOM_NAMES = ['Alex', 'Sam', 'Jordan', 'Riley', 'Gator', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Avery', 'Quinn', 'Rowan'];

export function randomName(current = ''): string {
  const choices = RANDOM_NAMES.filter((name) => name !== current);
  return choices[Math.floor(Math.random() * choices.length)];
}

/** Name-entry whitespace is collapsed before truncation; blank submission picks a friendly default. */
export function enteredName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX) || randomName();
}
