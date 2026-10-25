// ASCEND: je eigen zweettempo (docs/beslissingen/2026-10-25-zweet-en-water.md).
//
// Waarop het steunt (docs/onderzoek/Zweetverlies en water.md):
// - Zweetverlies volgt uit het gewicht: 1 kg minder is ongeveer 1 liter, plus wat je
//   dronk, min wat je plaste (Sawka e.a. 2007, ACSM). Zonder drinken of plassen is het
//   gewichtsverschil zelf het verlies.
// - Hoeveel iemand zweet verschilt sterk van persoon tot persoon en van dag tot dag,
//   van 0,5 tot 4 liter per uur, met de meeste duursporters rond 1,0 tot 1,5 (Baker 2017;
//   NATA 2017). Een algemeen getal zegt dus weinig over jou: daarom eerst eigen metingen.
// - Zonder metingen geldt de standaard uit het GR5-onderzoek, regel B3: 0,4 tot 0,8 L per
//   uur bij gematigd bergweer en 0,8 tot 1,2 L per uur bij hete klimmen (docs/onderzoek/
//   Aanvullend onderzoek GR5 voorbereiding.md). Die staat hier als een lijn van 10 tot
//   30 graden. Het is een voorzichtige schatting, nooit een meting, en altijd gemarkeerd
//   als "nog niet gemeten".
// - Het doel is minder dan 2% verlies van je lichaamsgewicht, niet alles terugdrinken
//   (Sawka 2007). Daarom noemt de app het zweetverlies, geen drinkvoorschrift.
//
// Een eigen weging gaat altijd voor. intervals.icu heeft geen veld voor het zweetverlies
// van een activiteit (alleen "hydration" en "hydrationVolume" bij de dagwaarden: wat je
// dronk), dus de schatting van het horloge ('watch') wordt zelf overgenomen.
//
// Puur: geen React, geen IndexedDB.

import { logSport, type Sport } from './sports';
import type { SessionLog } from '../models/training';
import type { SweatActivity, SweatEntry } from '../models/sweat';

// Korter dan dit weegt de weegschaal (op 100 g) te zwaar mee in het tempo.
export const MIN_SWEAT_MINUTES = 30;
// Daarboven (ml per uur) is het geen zweet maar een vergissing in de invoer.
export const MAX_SWEAT_ML_PER_HOUR = 4000;
// Metingen binnen dit aantal graden tellen als "in de buurt".
export const NEAR_TEMP_C = 4;

export type SweatBasis = 'measured' | 'watch' | 'default';

export interface SweatRate {
  mlPerHour: number;
  basis: SweatBasis;
  // Hoeveel metingen eraan bijdroegen (0 bij de standaard).
  count: number;
  // De temperatuur waarvoor het geldt.
  tempC: number;
}

const finite = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

// Welke trainingen een zweetmeting krijgen: lopen, wandelen en tochten.
export function sweatActivityOf(sport: Sport | undefined): SweatActivity | undefined {
  if (sport === 'running') return 'run';
  if (sport === 'hiking') return 'walk';
  return undefined;
}

// Heeft deze training een zweetmeting nodig: een loop, wandeling of tocht.
export function isSweatLog(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'>): boolean {
  return sweatActivityOf(logSport(log)) !== undefined;
}

// Het zweetverlies van één weging in ml: gewichtsverschil, plus wat je dronk, min wat je
// plaste. Undefined zonder allebei de wegingen.
export function sweatLossMl(e: Pick<SweatEntry, 'weightBeforeKg' | 'weightAfterKg' | 'drankMl' | 'peeMl'>): number | undefined {
  if (!finite(e.weightBeforeKg) || !finite(e.weightAfterKg)) return undefined;
  return Math.round((e.weightBeforeKg - e.weightAfterKg) * 1000 + (e.drankMl ?? 0) - (e.peeMl ?? 0));
}

export interface EntryRate {
  mlPerHour: number;
  source: 'weighed' | 'watch';
}

// Het zweetverlies per uur van één meting. Een weging gaat voor de schatting van het
// horloge. Undefined als de meting te kort, negatief of onmogelijk groot is.
export function entryRate(e: SweatEntry): EntryRate | undefined {
  if (!(e.durationMinutes >= MIN_SWEAT_MINUTES)) return undefined;
  const hours = e.durationMinutes / 60;
  const ok = (ml: number | undefined) => (finite(ml) && ml > 0 && ml / hours <= MAX_SWEAT_ML_PER_HOUR ? Math.round(ml / hours) : undefined);
  const w = ok(sweatLossMl(e));
  if (w !== undefined) return { mlPerHour: w, source: 'weighed' };
  const h = ok(e.watchMl);
  return h !== undefined ? { mlPerHour: h, source: 'watch' } : undefined;
}

// Het aantal eigen wegingen dat meetelt (de schatting van het horloge niet).
export function weighedCount(entries: SweatEntry[] | undefined): number {
  return (entries ?? []).filter((e) => entryRate(e)?.source === 'weighed').length;
}

// De datum van de n-de eigen weging (van oud naar nieuw), voor "af sinds".
export function weighedDate(entries: SweatEntry[] | undefined, n: number): string | undefined {
  const dates = (entries ?? []).filter((e) => entryRate(e)?.source === 'weighed').map((e) => e.date).sort();
  return dates[n - 1];
}

// De standaard zonder metingen: een lijn van 400 ml per uur bij 10 graden of kouder naar
// 1.200 bij 30 of warmer, afgerond op 50.
export function defaultSweatRate(tempC: number): number {
  const t = Math.min(30, Math.max(10, tempC));
  return Math.round((400 + ((t - 10) / 20) * 800) / 50) * 50;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round50 = (v: number) => Math.max(100, Math.round(v / 50) * 50);

interface Point { rate: number; tempC?: number }

// Uit de metingen van één soort (gewogen of horloge) het tempo bij deze temperatuur, of
// undefined als er geen zijn.
function fromPoints(points: Point[], tempC: number): { mlPerHour: number; count: number } | undefined {
  if (points.length === 0) return undefined;
  const withTemp = points.filter((p): p is Point & { tempC: number } => finite(p.tempC));
  const temps = withTemp.map((p) => p.tempC);
  // 1. Een lijn, als er genoeg spreiding in de temperatuur is en we er niet ver buiten gaan.
  if (withTemp.length >= 3) {
    const lo = Math.min(...temps);
    const hi = Math.max(...temps);
    if (hi - lo >= 5 && tempC >= lo - NEAR_TEMP_C && tempC <= hi + NEAR_TEMP_C) {
      const mt = mean(temps);
      const mr = mean(withTemp.map((p) => p.rate));
      const sxx = withTemp.reduce((a, p) => a + (p.tempC - mt) ** 2, 0);
      const sxy = withTemp.reduce((a, p) => a + (p.tempC - mt) * (p.rate - mr), 0);
      // Zweten neemt niet af met warmte: een negatieve helling is ruis, dan het gemiddelde.
      const slope = Math.max(0, sxy / sxx);
      return { mlPerHour: round50(mr + slope * (tempC - mt)), count: withTemp.length };
    }
  }
  // 2. Het gemiddelde van wat in de buurt van die temperatuur is gemeten.
  const near = withTemp.filter((p) => Math.abs(p.tempC - tempC) <= NEAR_TEMP_C);
  if (near.length > 0) return { mlPerHour: round50(mean(near.map((p) => p.rate))), count: near.length };
  // 3. Metingen op een andere temperatuur: jouw verhouding tot de standaard, op de
  //    standaardlijn van nu. Zo schuift een meting van 13 graden mee naar een warme dag.
  if (withTemp.length > 0) {
    const factor = mean(withTemp.map((p) => p.rate / defaultSweatRate(p.tempC)));
    return { mlPerHour: round50(defaultSweatRate(tempC) * factor), count: withTemp.length };
  }
  // 4. Metingen zonder temperatuur: het gemiddelde, zonder de temperatuur mee te rekenen.
  return { mlPerHour: round50(mean(points.map((p) => p.rate))), count: points.length };
}

// Je zweettempo (ml per uur) bij een temperatuur. Eigen wegingen eerst, dan schattingen van
// het horloge, dan de standaard. Metingen van dezelfde soort (lopen of wandelen) gaan voor,
// want lopen geeft meer zweet dan wandelen op dezelfde temperatuur.
export function sweatRateAt(entries: SweatEntry[] | undefined, tempC: number, activity?: SweatActivity): SweatRate {
  const rated = (entries ?? []).flatMap((e) => {
    const r = entryRate(e);
    return r ? [{ e, r }] : [];
  });
  for (const source of ['weighed', 'watch'] as const) {
    const ofSource = rated.filter((x) => x.r.source === source);
    const same = activity ? ofSource.filter((x) => x.e.activity === activity) : [];
    const pool = same.length > 0 ? same : ofSource;
    const found = fromPoints(pool.map((x) => ({ rate: x.r.mlPerHour, tempC: x.e.tempC })), tempC);
    if (found) return { mlPerHour: found.mlPerHour, basis: source === 'weighed' ? 'measured' : 'watch', count: found.count, tempC };
  }
  return { mlPerHour: defaultSweatRate(tempC), basis: 'default', count: 0, tempC };
}

// --- tekst ---------------------------------------------------------------------------

export function basisLabel(rate: Pick<SweatRate, 'basis' | 'count'>): string {
  if (rate.basis === 'measured') return rate.count === 1 ? 'op je eigen meting' : `op je ${rate.count} eigen metingen`;
  if (rate.basis === 'watch') return 'op de schatting van je horloge';
  return 'nog niet gemeten, een voorzichtige standaard';
}

// "750 ml per uur"; boven de 1.000 in liters met een komma.
export function mlPerHourText(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} liter per uur` : `${Math.round(ml)} ml per uur`;
}

// Een uitkomst voor onder de meting in het blad van een training.
export function entryResultLine(e: SweatEntry): string | undefined {
  const r = entryRate(e);
  if (!r) return undefined;
  const loss = r.source === 'weighed' ? sweatLossMl(e) : e.watchMl;
  const source = r.source === 'weighed' ? 'Gewogen' : 'Schatting van je horloge';
  return `${source}: ongeveer ${loss} ml verloren, ${mlPerHourText(r.mlPerHour)}.`;
}

// --- herstel uit een back-up -------------------------------------------------------------

export const MAX_SWEAT_ENTRIES = 500;

// Samenvoegen bij herstel: per id de som, het exemplaar op dit toestel wint; per training
// blijft er één over (de nieuwste). Een meting die je hier wiste, komt met een herstel terug,
// zoals een oordeel over een nacht.
export function mergeSweatEntries(current: SweatEntry[] | undefined, incoming: SweatEntry[] | undefined): SweatEntry[] | undefined {
  if (!current && !incoming) return undefined;
  const byId = new Map((incoming ?? []).map((e) => [e.id, e]));
  for (const e of current ?? []) byId.set(e.id, e);
  const byLog = new Map<string, SweatEntry>();
  for (const e of byId.values()) {
    const seen = byLog.get(e.logId);
    if (!seen || e.updatedAt > seen.updatedAt) byLog.set(e.logId, e);
  }
  return [...byLog.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).slice(-MAX_SWEAT_ENTRIES);
}
