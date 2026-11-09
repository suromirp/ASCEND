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

// Een echte weging: één per dag, het getal van de weegschaal. Een dag met een trendgewicht uit
// MacroFactor telt met de weging van die dag (`scaleKg`); zonder die weging is het geen weging.
export interface Weighing {
  date: string;
  kg: number;
}

export function realWeighings(entries: WeightEntry[] | undefined): Weighing[] {
  return (entries ?? [])
    .flatMap((e) => {
      const kg = weighed(e);
      return kg === undefined ? [] : [{ date: e.date, kg }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Het gewogen gemiddelde van de echte wegingen in de 14 dagen tot en met `asOf`. Met drie of meer
// wegingen valt een uitschieter weg; blijven er dan minder dan `min` over, dan is er geen uitkomst.
function averageUpTo(real: Weighing[], asOf: string, min: number): { kg: number; raw: number; readings: number; outliers: number; from: string } | undefined {
  const anchor = addDays(asOf, -TREND_WINDOW_DAYS);
  const window = real.filter((r) => r.date > anchor && r.date <= asOf);
  if (window.length < min) return undefined;
  let kept = window;
  if (window.length >= TREND_MIN_WEIGHINGS) {
    const mid = median(window.map((r) => r.kg));
    kept = window.filter((r) => Math.abs(r.kg - mid) <= mid * OUTLIER_SHARE);
    // Te weinig over na de uitschieters: voor de trend is er dan geen uitkomst, de lijn houdt alles.
    if (kept.length < TREND_MIN_WEIGHINGS) {
      if (min >= TREND_MIN_WEIGHINGS) return undefined;
      kept = window;
    }
  }
  let sum = 0;
  let weights = 0;
  for (const r of kept) {
    const w = 0.5 ** (daysBetween(r.date, asOf) / TREND_HALF_LIFE_DAYS);
    sum += w * r.kg;
    weights += w;
  }
  return { kg: Math.round((sum / weights) * 10) / 10, raw: sum / weights, readings: kept.length, outliers: window.length - kept.length, from: kept[0].date };
}

export function weightTrend(entries: WeightEntry[] | undefined): WeightTrend | undefined {
  const latest = latestWeight(entries);
  if (!latest || latest.basis === 'trend') return undefined;
  const avg = averageUpTo(realWeighings(entries), latest.date, TREND_MIN_WEIGHINGS);
  return avg ? { kg: avg.kg, readings: avg.readings, outliers: avg.outliers, from: avg.from, asOf: latest.date, latestKg: latest.kg } : undefined;
}

// De lijn van je gewicht op één dag, voor de kaart op Je stand en het overzicht Gewicht
// (docs/beslissingen/2026-11-09-overzicht-gewicht.md). Altijd uit echte wegingen: het gewogen
// gemiddelde van de wegingen in de 14 dagen tot en met die dag, ook met één of twee wegingen, zodat
// de lijn niet springt op de dag dat de derde weging binnenkomt. Met Gewichtstrend uit is het de
// laatste weging in dat venster. Een trendgewicht uit MacroFactor telt nooit als losse weging; alleen
// als er in het venster geen enkele echte weging is, staat dat trendgewicht zelf op de lijn
// (`own: false`), want het is al een trend.
export function weightLineAt(entries: WeightEntry[] | undefined, day: string, trendOn: boolean | undefined): { kg: number; own: boolean } | undefined {
  const real = realWeighings(entries);
  if (trendOn === false) {
    const anchor = addDays(day, -TREND_WINDOW_DAYS);
    const last = real.filter((r) => r.date > anchor && r.date <= day).pop();
    if (last) return { kg: last.kg, own: true };
  } else {
    const avg = averageUpTo(real, day, 1);
    // Op twee decimalen: op één decimaal wordt de lijn een trap.
    if (avg) return { kg: Math.round(avg.raw * 100) / 100, own: true };
  }
  const anchor = addDays(day, -TREND_WINDOW_DAYS);
  const source = latestWeight((entries ?? []).filter((e) => e.basis === 'trend' && e.date > anchor && e.date <= day));
  return source ? { kg: source.kg, own: false } : undefined;
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
