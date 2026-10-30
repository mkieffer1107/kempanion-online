// The feature you and Piggy 3 ship in p3_h5 (flag p3_feature) really ships: a small KempaPager notice.
//   bat_forecast     once a day before dusk: Lake Alice emergence ≈ sunset + 15–20 min ("probably not tonight"
//                    when it's cold or wet; the bats are divas about weather)
//   carillon_alarm   weekdays one minute before the live carillon sets (12:35 and 16:55)
//   hydration_timer  every two hours, 10:00–20:00: a water reminder for Piggy 2
// Pure (no DOM): App checks it once a game minute and toasts what it returns.
import type { SaveData } from '../types';
import { weatherAt } from '../state/weather';

export type P3Feature = 'bat_forecast' | 'carillon_alarm' | 'hydration_timer';

export interface FeatureNotice {
  /** Unique per occurrence (date + slot), so a notice fires once even across reloads. */
  key: string;
  text: string;
  icon: string;
  sfx: 'bell' | 'notify';
}

/** Approximate Gainesville sunset on the 15th of each month, local clock minutes (DST included). */
const SUNSET_15TH = [1075, 1100, 1177, 1194, 1213, 1231, 1232, 1212, 1178, 1143, 1052, 1053];

/** Sunset (minutes after local midnight), interpolated between mid-month values. */
export function sunsetMinutes(d: Date): number {
  const m = d.getMonth();
  const day = d.getDate();
  const days = new Date(d.getFullYear(), m + 1, 0).getDate();
  const [a, b, t] = day >= 15
    ? [SUNSET_15TH[m], SUNSET_15TH[(m + 1) % 12], (day - 15) / days]
    : [SUNSET_15TH[(m + 11) % 12], SUNSET_15TH[m], (day + 30 - 15) / 30];
  return Math.round(a + (b - a) * t);
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** The notice due at this local time, if any (the caller remembers keys it already showed). */
export function featureNotice(save: SaveData, d: Date): FeatureNotice | null {
  const feature = save.flags.p3_feature as P3Feature | undefined;
  if (!feature) return null;
  const mins = d.getHours() * 60 + d.getMinutes();
  const today = dateKey(d);

  if (feature === 'bat_forecast') {
    const sunset = sunsetMinutes(d);
    // Posted 45 minutes before sunset, for 25 minutes (a late arrival still sees it).
    if (mins < sunset - 45 || mins > sunset - 20) return null;
    const month = d.getMonth() + 1;
    const dusk = new Date(d);
    dusk.setHours(Math.floor(sunset / 60), sunset % 60, 0, 0);
    const wet = weatherAt(dusk.getTime()) !== 'clear';
    const cold = month === 12 || month <= 2;
    const text = wet || cold
      ? `Bat Forecast: probably not tonight (${cold ? 'too cold' : 'rain'}). The bats are divas about weather.`
      : `Bat Forecast: Lake Alice emergence around ${clock(sunset + 15)}–${clock(sunset + 20)}. Clear and calm!`;
    return { key: `bats:${today}`, text, icon: 'moon', sfx: 'notify' };
  }

  if (feature === 'carillon_alarm') {
    const day = d.getDay();
    if (day === 0 || day === 6) return null;
    for (const set of [12 * 60 + 35, 16 * 60 + 55]) {
      if (mins >= set - 1 && mins < set + 1) {
        return { key: `carillon:${today}:${set}`, text: `Carillon Alarm: the ${clock(set)} set starts in a minute. Century Tower!`, icon: 'music', sfx: 'bell' };
      }
    }
    return null;
  }

  if (feature === 'hydration_timer') {
    const h = d.getHours();
    if (h < 10 || h > 20 || h % 2 !== 0 || d.getMinutes() > 4) return null;
    return { key: `water:${today}:${h}`, text: 'Hydration Timer: water break! (Piggy 2 says he hates this feature. He has never missed one.)', icon: 'drink', sfx: 'notify' };
  }
  return null;
}
