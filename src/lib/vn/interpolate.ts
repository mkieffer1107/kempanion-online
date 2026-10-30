// Text interpolation for KScript lines and choices. Pure (bun-testable).
//   {player} {companion} {time} ("3:42 PM") {timeofday} ("evening") {weekday} ("Friday")
//   {fact:comfort_food|soup}  a remembered fact, else the fallback
//   {flag:name|fallback}      a flag's value, else the fallback
//   {{ and }}                 literal braces

export interface InterpContext {
  player(): string;
  companion(): string;
  time(): string;
  timeOfDay(): string;
  weekday(): string;
  fact(key: string): string | undefined;
  flag(name: string): boolean | number | string | undefined;
}

export const SIMPLE_TOKENS = ['player', 'companion', 'time', 'timeofday', 'weekday'] as const;

const TOKEN = /\{\{|\}\}|\{([A-Za-z_]+)(?::([^{}|]*))?(?:\|([^{}]*))?\}/g;

export interface TokenRef { raw: string; name: string; arg?: string; fallback?: string; known: boolean }

/** Every {token} in a string (used by the validator). */
export function scanTokens(text: string): TokenRef[] {
  const out: TokenRef[] = [];
  for (const m of text.matchAll(TOKEN)) {
    if (m[0] === '{{' || m[0] === '}}') continue;
    const name = m[1].toLowerCase();
    const known = m[2] !== undefined ? name === 'fact' || name === 'flag' : (SIMPLE_TOKENS as readonly string[]).includes(name);
    out.push({ raw: m[0], name, arg: m[2]?.trim(), fallback: m[3], known });
  }
  return out;
}

export function interpolate(text: string, ctx: InterpContext): string {
  if (!text.includes('{') && !text.includes('}')) return text;
  return text.replace(TOKEN, (raw, name: string | undefined, arg: string | undefined, fallback: string | undefined) => {
    if (raw === '{{') return '{';
    if (raw === '}}') return '}';
    const n = (name ?? '').toLowerCase();
    if (arg !== undefined) {
      const key = arg.trim();
      if (n === 'fact') return ctx.fact(key) || fallback || '';
      if (n === 'flag') {
        const v = ctx.flag(key);
        return v === undefined || v === false || v === '' ? fallback ?? '' : String(v);
      }
      return raw;
    }
    let v: string;
    switch (n) {
      case 'player': v = ctx.player(); break;
      case 'companion': v = ctx.companion(); break;
      case 'time': v = ctx.time(); break;
      case 'timeofday': v = ctx.timeOfDay(); break;
      case 'weekday': v = ctx.weekday(); break;
      default: return raw;
    }
    return v || fallback || '';
  });
}
