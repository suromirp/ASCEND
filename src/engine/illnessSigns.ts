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
//   nacht niet liet meetellen, en niet als je al ziek gemeld bent;
// - de HRV van een nacht die je "Niet goed gemeten" noemde telt niet en blijft uit je gemiddelde.
//   Ligt je rusthartslag die ochtend wel minstens 6 slagen hoger, dan wordt de ochtend overgeslagen:
//   hij telt niet mee en breekt de reeks niet. Een ochtend die je niet kunt beoordelen is geen
//   bewijs van gezond. Met een gewone rusthartslag breekt hij de reeks wel. Er blijven minstens
//   twee ochtenden met beide signalen nodig (docs/beslissingen/2026-11-20-niet-goed-gemeten-rest.md).
//
// Het is een vraag, geen waarschuwing en geen diagnose. Het verandert niets aan de planning; wie
// "Word ziek" kiest, komt in de gewone ziekmelding, die zelf een voorstel met Akkoord is.
//
// Puur: geen React, geen IndexedDB.

import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';
import { baselineValues, dayRecord, MIN_BASELINE_DAYS } from './wellnessCheck';
import { mean, stdev } from '../utils/stats';

const ILLNESS_RHR_RISE = 6;
const ILLNESS_MIN_MORNINGS = 2;
// Verder dan dit kijkt de regel niet terug (een week).
const LOOKBACK = 7;

export interface IllnessSign {
  // De eerste ochtend van de reeks met beide signalen: zo herkent "Voel me goed" dezelfde reeks.
  from: string;
  // Alleen ochtenden met beide signalen; een overgeslagen ochtend telt niet.
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
  // Nachten die je "Niet goed gemeten" noemde (engine/shortNight.ts#ignoredNightDates): alleen de HRV.
  ignoredNights?: ReadonlySet<string>;
  ill?: boolean;
}

// Wat deze ochtend voor de reeks is: `counts` als beide signalen afwijken, niet `counts` als hij
// wordt overgeslagen (niet goed gemeten, rusthartslag wel hoog), undefined als hij de reeks breekt.
// `rise` is de stijging van de rusthartslag.
interface Morning { rise: number; counts: boolean }
function offMorning(day: string, metrics: RecoveryMetric[], explained: ReadonlySet<string>, hrvSkip: ReadonlySet<string>): Morning | undefined {
  if (explained.has(day)) return undefined;
  const r = dayRecord(day, metrics);
  if (r?.restingHeartRate === undefined) return undefined;
  const rhrBase = baselineValues(day, metrics, (m) => m.restingHeartRate, explained);
  if (rhrBase.length < MIN_BASELINE_DAYS) return undefined;
  const rise = r.restingHeartRate - Math.round(mean(rhrBase));
  if (rise < ILLNESS_RHR_RISE) return undefined;
  // Niet goed gemeten: de HRV zegt niets, de hoge rusthartslag wel. Overslaan, niet breken.
  if (hrvSkip.has(day)) return { rise, counts: false };
  if (r.hrv === undefined) return undefined;
  const hrvBase = baselineValues(day, metrics, (m) => m.hrv, hrvSkip);
  if (hrvBase.length < MIN_BASELINE_DAYS) return undefined;
  const hrvAvg = mean(hrvBase);
  const margin = Math.max(stdev(hrvBase), hrvAvg * 0.07);
  return r.hrv < hrvAvg - margin ? { rise, counts: true } : undefined;
}

const COUNT_WORD = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven'];

export function illnessSign(input: IllnessSignInput): IllnessSign | undefined {
  if (input.ill) return undefined;
  const explained = input.explained ?? new Set<string>();
  const ignored = input.ignoredNights;
  const hrvSkip = ignored && ignored.size > 0 ? new Set([...explained, ...ignored]) : explained;
  const metrics = [...input.metrics];
  let todayRise: number | undefined;
  let mornings = 0;
  let from = input.today;
  // Hoeveel dagen terug de vroegste ochtend met beide signalen ligt.
  let reach = 0;
  for (let i = 0; i < LOOKBACK; i++) {
    const day = addDays(input.today, -i);
    const m = offMorning(day, metrics, explained, hrvSkip);
    if (!m) break;
    if (i === 0) todayRise = m.rise;
    if (!m.counts) continue;
    mornings++;
    from = day;
    reach = i;
  }
  if (todayRise === undefined || mornings < ILLNESS_MIN_MORNINGS) return undefined;
  const word = COUNT_WORD[mornings] ?? mornings;
  // Met een overgeslagen ochtend ertussen zijn het geen ochtenden achter elkaar: dan het aantal dagen
  // dat je rusthartslag hoog ligt, en op hoeveel ochtenden je HRV eronder lag.
  const gap = reach + 1 > mornings;
  const days = reach + 1;
  return {
    from,
    mornings,
    rhrRise: todayRise,
    text: gap
      ? `Je rusthartslag ligt al ${COUNT_WORD[days] ?? days} dagen boven je gewone, vandaag ${todayRise} slagen, en je HRV lag op ${word} ochtenden eronder. Voel je je goed?`
      : `Je rusthartslag ligt ${word} ochtenden achter elkaar ${todayRise} slagen boven je gewone, en je HRV eronder. Voel je je goed?`,
  };
}
