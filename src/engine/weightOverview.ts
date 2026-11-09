// ASCEND: het overzicht Gewicht achter de kaart op Je stand
// (docs/beslissingen/2026-11-09-overzicht-gewicht.md). Puur: geen React, niets wordt opgeslagen en
// de planning leest hier niets van.
//
// De lijn is de trend van ASCEND over echte wegingen (`weightLineAt`), de stippen zijn de wegingen
// zelf. Een trendgewicht uit MacroFactor is geen weging: het staat niet als stip in de grafiek en
// telt niet mee in de lijn; de weging van die dag (`scaleKg`) wel.

import type { WeightEntry } from '../models/metrics';
import { addDays, daysBetween } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { weightSourceLabel } from './weightCard';
import { realWeighings, weightLineAt } from './weightTrend';

export type WeightRange = '4w' | '3m' | '1y';

export const WEIGHT_RANGE_ADVICE: WeightRange = '4w';

const RANGES: Record<WeightRange, { days: number; words: string }> = {
  '4w': { days: 28, words: '4 weken' },
  '3m': { days: 91, words: '3 maanden' },
  '1y': { days: 365, words: 'een jaar' },
};

export const isWeightRange = (v: unknown): v is WeightRange => v === '4w' || v === '3m' || v === '1y';

export interface WeightChartPoint {
  date: string;
  kg: number;
  // Plek op de tijdas, 0 (begin van de periode) tot 1 (vandaag).
  x: number;
}

export interface WeightChange {
  // Verschil tussen het eind en het begin van de lijn in de periode, op een decimaal.
  kg: number;
  // Het aantal dagen waarover dat verschil gaat.
  days: number;
  // Per week, alleen als de lijn minstens twee weken beslaat.
  perWeekKg?: number;
}

export interface WeighingRow {
  date: string;
  kg: number;
  source: string;
  // Dit getal is een trendgewicht uit de bron, geen weging.
  isSourceTrend: boolean;
}

export interface WeightOverview {
  range: WeightRange;
  from: string;
  to: string;
  dots: WeightChartPoint[];
  line: WeightChartPoint[];
  // De as: ruim om alle punten, op hele of halve kilo's, met de maatstreepjes.
  minKg: number;
  maxKg: number;
  ticks: number[];
  change?: WeightChange;
  // De wegingen van de periode, nieuwste eerst.
  rows: WeighingRow[];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function axis(values: number[]): { minKg: number; maxKg: number; ticks: number[] } {
  if (values.length === 0) return { minKg: 0, maxKg: 1, ticks: [] };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Een stap van een halve, één, twee of vijf kilo, zodat er hoogstens vijf strepen staan.
  const step = [0.5, 1, 2, 5, 10, 20].find((s) => (hi - lo) / s <= 3) ?? 50;
  let minKg = Math.floor(lo / step) * step;
  let maxKg = Math.ceil(hi / step) * step;
  if (minKg === maxKg) {
    minKg -= step;
    maxKg += step;
  }
  const ticks: number[] = [];
  for (let t = minKg; t <= maxKg + 1e-9; t += step) ticks.push(round1(t));
  return { minKg, maxKg, ticks };
}

// Het trendgewicht van een dag in de lijst en de grafiek: de weging als die er is.
const rowOf = (e: WeightEntry): WeighingRow =>
  e.basis === 'trend' && !(typeof e.scaleKg === 'number' && e.scaleKg > 0)
    ? { date: e.date, kg: e.kg, source: e.source, isSourceTrend: true }
    : { date: e.date, kg: e.basis === 'trend' ? (e.scaleKg as number) : e.kg, source: e.source, isSourceTrend: false };

// `entries` is wat `engine/bodyWeight.ts#weightsInUse` teruggeeft.
export function weightOverview(entries: WeightEntry[] | undefined, range: WeightRange, trendOn: boolean | undefined, today: string): WeightOverview {
  const days = RANGES[range].days;
  const from = addDays(today, -days);
  const inRange = (entries ?? []).filter((e) => e.date > from && e.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const xOf = (date: string) => 1 - daysBetween(date, today) / days;
  const dots = realWeighings(inRange).map((r) => ({ ...r, x: xOf(r.date) }));
  // Een punt op de lijn op elke dag met een weging of een trendgewicht; de lijn zelf leest ook de
  // twee weken voor het begin van de periode, zodat hij niet met een losse weging begint.
  const line: WeightChartPoint[] = [];
  for (const e of inRange) {
    const at = weightLineAt(entries, e.date, trendOn);
    if (at) line.push({ date: e.date, kg: at.kg, x: xOf(e.date) });
  }
  let change: WeightChange | undefined;
  if (line.length >= 2) {
    const first = line[0];
    const last = line[line.length - 1];
    const span = daysBetween(first.date, last.date);
    if (span >= 7) {
      const kg = round1(last.kg - first.kg);
      change = { kg, days: span, ...(span >= 14 ? { perWeekKg: round1((last.kg - first.kg) / (span / 7)) } : {}) };
    }
  }
  return {
    range,
    from: addDays(from, 1),
    to: today,
    dots,
    line,
    ...axis([...dots, ...line].map((p) => p.kg)),
    change,
    rows: inRange.map(rowOf).reverse(),
  };
}

// "−0,4 kg", "+0,3 kg" of "0,0 kg": met een echt minteken, geen streepje.
export function signedKg(kg: number): string {
  const r = round1(kg);
  return `${r < 0 ? '−' : r > 0 ? '+' : ''}${formatNumberNL(Math.abs(r), 1)} kg`;
}

// Over hoeveel tijd het verschil gaat: de gekozen periode als de lijn die bijna vult, anders wat er is.
function spanWords(change: WeightChange, range: WeightRange): string {
  if (change.days >= RANGES[range].days * 0.85) return RANGES[range].words;
  if (change.days < 14) return `${change.days} dagen`;
  return `${Math.round(change.days / 7)} weken`;
}

// De twee regels onder de grafiek: "−0,4 kg per week" en "−1,6 kg in 4 weken".
export function weightChangeLines(o: WeightOverview): { perWeek?: string; total: string } | undefined {
  if (!o.change) return undefined;
  return {
    ...(o.change.perWeekKg !== undefined ? { perWeek: `${signedKg(o.change.perWeekKg)} per week` } : {}),
    total: `${signedKg(o.change.kg)} in ${spanWords(o.change, o.range)}`,
  };
}

// De bron van een regel in de lijst: "Health Connect", "MacroFactor, trendgewicht", "Zelf ingevuld".
export function weighingRowSource(row: WeighingRow): string {
  return `${weightSourceLabel(row.source)}${row.isSourceTrend ? ', trendgewicht' : ''}`;
}

// De zin voor wie de grafiek niet ziet.
export function weightChartSummary(o: WeightOverview): string {
  const period = `de laatste ${RANGES[o.range].words === 'een jaar' ? '12 maanden' : RANGES[o.range].words}`;
  if (o.line.length === 0) return `Je gewicht, ${period}: nog geen wegingen.`;
  const lines = weightChangeLines(o);
  const count = o.dots.length === 1 ? 'één weging' : `${o.dots.length} wegingen`;
  return `Je gewicht, ${period}: ${count}${lines ? `, ${lines.total}` : ''}.`;
}
