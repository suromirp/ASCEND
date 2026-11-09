// ASCEND: je gewicht als trend in plaats van de nieuwste weging
// (docs/beslissingen/2026-11-09-gewichtstrend.md).
//
// Wie zich elke dag weegt (bijvoorbeeld via Health Connect) ziet het getal een kilo op en neer
// gaan met water, zout en eten. De trend is een gewogen gemiddelde van de wegingen van de laatste
// 14 dagen, waarbij een weging van een week oud half zo zwaar telt als de nieuwste. Een
// uitschieter (meer dan 3 % van de middelste weging af) telt niet mee. Zijn er minder dan drie
// wegingen over, dan is er geen trend en telt de nieuwste weging, zoals voorheen.
//
// Het trendgewicht van MacroFactor is al een trend: is de nieuwste dag zo'n trendgewicht, dan
// rekent ASCEND hem niet nog eens af. Een trenddag eerder in het venster telt met de weging van
// die dag (`scaleKg`), of niet.
//
// De invoer is wat `engine/bodyWeight.ts#weightsInUse` teruggeeft: één gewicht per dag, met de
// schakelaars van MacroFactor en Health Connect al toegepast. Puur: geen React, geen opslag.
//
// Het blad en de rij Lichaamsgewicht lezen de trend; Forge, rugzak en beenindex rekenen met `loadBodyKg`
// (docs/beslissingen/2026-11-09-gewicht-bij-eigen-gewicht.md).

import type { WeightEntry } from '../models/metrics';
import { addDays, daysBetween } from '../utils/dates';
import { latestWeight, weightsInUse } from './bodyWeight';

export const TREND_WINDOW_DAYS = 14;
export const TREND_HALF_LIFE_DAYS = 7;
export const TREND_MIN_WEIGHINGS = 3;
const OUTLIER_SHARE = 0.03;

export interface WeightTrend {
  // Het trendgewicht, op een decimaal.
  kg: number;
  // Aantal wegingen dat meetelt, en hoeveel er als uitschieter buiten bleven.
  readings: number;
  outliers: number;
  // De oudste weging die meetelt, en de nieuwste dag in het venster.
  from: string;
  asOf: string;
  // De nieuwste weging zelf, ook als die een uitschieter is.
  latestKg: number;
}

const weighed = (e: WeightEntry): number | undefined => {
  const v = e.basis === 'trend' ? e.scaleKg : e.kg;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function weightTrend(entries: WeightEntry[] | undefined): WeightTrend | undefined {
  const latest = latestWeight(entries);
  if (!latest || latest.basis === 'trend') return undefined;
  const anchor = addDays(latest.date, -TREND_WINDOW_DAYS);
  const window = (entries ?? [])
    .filter((e) => e.date > anchor && e.date <= latest.date)
    .flatMap((e) => {
      const kg = weighed(e);
      return kg === undefined ? [] : [{ date: e.date, kg }];
    });
  if (window.length < TREND_MIN_WEIGHINGS) return undefined;
  const mid = median(window.map((r) => r.kg));
  const kept = window.filter((r) => Math.abs(r.kg - mid) <= mid * OUTLIER_SHARE);
  if (kept.length < TREND_MIN_WEIGHINGS) return undefined;
  let sum = 0;
  let weights = 0;
  for (const r of kept) {
    const w = 0.5 ** (daysBetween(r.date, latest.date) / TREND_HALF_LIFE_DAYS);
    sum += w * r.kg;
    weights += w;
  }
  return {
    kg: Math.round((sum / weights) * 10) / 10,
    readings: kept.length,
    outliers: window.length - kept.length,
    from: kept.map((r) => r.date).sort()[0],
    asOf: latest.date,
    latestKg: latest.kg,
  };
}

// Het gewicht dat het blad Lichaamsgewicht groot laat zien: de trend als "Gewichtstrend
// gebruiken" aan staat (AppSettings.weightTrend, afwezig is aan) en er genoeg wegingen zijn,
// anders de nieuwste weging.
export function weightShown(entries: WeightEntry[] | undefined, trendOn: boolean | undefined): { kg: number; latest: WeightEntry; trend?: WeightTrend } | undefined {
  const latest = latestWeight(entries);
  if (!latest) return undefined;
  const trend = trendOn === false ? undefined : weightTrend(entries);
  return trend ? { kg: trend.kg, latest, trend } : { kg: latest.kg, latest };
}

// Het gewicht waarmee ASCEND rekent (docs/beslissingen/2026-11-09-gewicht-bij-eigen-gewicht.md): Forge (eigen
// gewicht, optrekhulp, dips), het rugzakaandeel en de beenindex. Met "Gewicht bij eigen gewicht" op Trend
// (afwezig is Trend, het advies) is dat de gewichtstrend; met te weinig wegingen, een trendgewicht uit
// MacroFactor of de keuze Laatste weging is het de laatste weging, zoals `currentBodyKg`.
export interface LoadWeightSettings {
  weightEntries?: WeightEntry[];
  weightFromMacroFactor?: boolean;
  weightFromHealthConnect?: boolean;
  weightForLoad?: 'trend' | 'latest';
}

export interface LoadWeight {
  kg: number;
  // Is het de trend (en dus niet de laatste weging)?
  isTrend: boolean;
  // De laatste weging zelf, ook als de trend telt.
  latest: WeightEntry;
}

export function loadWeight(s: LoadWeightSettings): LoadWeight | undefined {
  const used = weightsInUse(s.weightEntries, s.weightFromMacroFactor, s.weightFromHealthConnect);
  const latest = latestWeight(used);
  if (!latest) return undefined;
  const trend = s.weightForLoad === 'latest' ? undefined : weightTrend(used);
  return trend ? { kg: trend.kg, isTrend: true, latest } : { kg: latest.kg, isTrend: false, latest };
}

export function loadBodyKg(s: LoadWeightSettings): number | undefined {
  return loadWeight(s)?.kg;
}
