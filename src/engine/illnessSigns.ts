// ASCEND: vroeg zien dat je ziek wordt (docs/onderzoek/Kansen met gegevens.md, kans B,
// docs/beslissingen/2026-10-31-kansen-stap-0.md).
//
// Een sterke stijging van je rusthartslag tegen je eigen gewone gaf in een cohort met
// smartwatches bij een deel van de zieken een signaal voor de klachten (bewijs zwak tot matig).
// Alcohol, een warme kamer, een late training en stress geven hetzelfde patroon. Daarom alleen:
//
// - twee signalen tegelijk: je rusthartslag minstens 6 slagen boven je gemiddelde van de 28 dagen
//   ervoor, en je HRV onder je gewone bereik (dezelfde marge als de ochtendkaart);
// - minstens twee ochtenden op rij, tot en met vandaag;
// - niet als je zelf al iets vastlegde bij "Wat speelde er" voor een van die ochtenden, of een
//   nacht niet liet meetellen, en niet als je al ziek gemeld bent.
//
// Het is een vraag, geen waarschuwing en geen diagnose. Het verandert niets aan de planning; wie
// "Word ziek" kiest, komt in de gewone ziekmelding, die zelf een voorstel met Akkoord is.
//
// Puur: geen React, geen IndexedDB.

import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';
import { baselineValues, dayRecord, MIN_BASELINE_DAYS } from './wellnessCheck';

export const ILLNESS_RHR_RISE = 6;
export const ILLNESS_MIN_MORNINGS = 2;
// Verder dan dit kijkt de regel niet terug (een week).
const LOOKBACK = 7;

export interface IllnessSign {
  // De eerste ochtend van de reeks: zo herkent "Voel me goed" dezelfde reeks.
  from: string;
  mornings: number;
  // Hoeveel slagen je rusthartslag vandaag boven je gemiddelde ligt.
  rhrRise: number;
  text: string;
}

export interface IllnessSignInput {
  today: string;
  metrics: readonly RecoveryMetric[];
  // Ochtenden waar je zelf iets bij vastlegde, of die je niet liet meetellen.
  explained?: ReadonlySet<string>;
  ill?: boolean;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

// De stijging van de rusthartslag op deze ochtend als beide signalen afwijken, anders undefined.
function offMorning(day: string, metrics: RecoveryMetric[], explained: ReadonlySet<string>): number | undefined {
  if (explained.has(day)) return undefined;
  const r = dayRecord(day, metrics);
  if (r?.restingHeartRate === undefined || r.hrv === undefined) return undefined;
  const rhrBase = baselineValues(day, metrics, (m) => m.restingHeartRate, explained);
  const hrvBase = baselineValues(day, metrics, (m) => m.hrv, explained);
  if (rhrBase.length < MIN_BASELINE_DAYS || hrvBase.length < MIN_BASELINE_DAYS) return undefined;
  const rise = r.restingHeartRate - Math.round(mean(rhrBase));
  const hrvAvg = mean(hrvBase);
  const margin = Math.max(stdev(hrvBase), hrvAvg * 0.07);
  return rise >= ILLNESS_RHR_RISE && r.hrv < hrvAvg - margin ? rise : undefined;
}

const COUNT_WORD = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven'];

export function illnessSign(input: IllnessSignInput): IllnessSign | undefined {
  if (input.ill) return undefined;
  const explained = input.explained ?? new Set<string>();
  const metrics = [...input.metrics];
  const todayRise = offMorning(input.today, metrics, explained);
  if (todayRise === undefined) return undefined;
  let mornings = 1;
  let from = input.today;
  for (let i = 1; i < LOOKBACK; i++) {
    const day = addDays(input.today, -i);
    if (offMorning(day, metrics, explained) === undefined) break;
    mornings++;
    from = day;
  }
  if (mornings < ILLNESS_MIN_MORNINGS) return undefined;
  return {
    from,
    mornings,
    rhrRise: todayRise,
    text: `Je rusthartslag ligt ${COUNT_WORD[mornings] ?? mornings} ochtenden achter elkaar ${todayRise} slagen boven je gewone, en je HRV eronder. Voel je je goed?`,
  };
}
