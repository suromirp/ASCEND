// ASCEND: het vetpercentage uit de weegschaal (via MacroFactor), als trend.
//
// Een weegschaal meet vet met een zwak stroompje (bio-impedantie). Eén
// meting schommelt met vocht, eten en het tijdstip, en het getal zelf kan een
// paar procentpunten naast de werkelijkheid zitten. Daarom kijkt ASCEND naar
// het gemiddelde van de laatste 7 metingen tegenover 4 weken eerder, en niet
// naar één dag (docs/beslissingen/2026-10-25-vetpercentage-uit-macrofactor.md).
//
// De vetvrije massa is gewicht maal (1 min vetpercentage). Het gewicht is dat
// van dezelfde weging (`scaleKg`), omdat het percentage uit die weging komt;
// ontbreekt dat, dan het opgeslagen gewicht. Voor kracht en de GR5 zegt die
// massa meer dan het percentage: je kunt lichter worden en spier houden.
//
// Puur: geen React, geen opslag.

import type { WeightEntry } from '../models/metrics';
import { addDays } from '../utils/dates';

export const MIN_FAT_PCT = 3;
export const MAX_FAT_PCT = 60;

const WINDOW_DAYS = 28;
const PER_AVERAGE = 7;
// De vergelijking: metingen van 3 tot 8 weken voor de nieuwste, omdat een weegschaal
// niet elke dag gebruikt wordt; er zijn er minstens zoveel nodig.
const EARLIER_FROM_DAYS = 21;
const EARLIER_TO_DAYS = 56;
const MIN_PREVIOUS = 2;

export function isPlausibleFatPct(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_FAT_PCT && value <= MAX_FAT_PCT;
}

export function hasBodyFat(entries: WeightEntry[] | undefined): boolean {
  return (entries ?? []).some((e) => isPlausibleFatPct(e.fatPct));
}

export interface BodyFatTrend {
  // De datum van de nieuwste meting.
  asOf: string;
  // Aantal metingen in het huidige gemiddelde.
  readings: number;
  pct: number;
  previousPct?: number;
  deltaPct?: number;
  leanKg?: number;
  previousLeanKg?: number;
  leanDeltaKg?: number;
}

interface Reading {
  date: string;
  pct: number;
  leanKg?: number;
}

function mean(values: number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length;
}

function average(readings: Reading[]): { pct: number; leanKg?: number } {
  const lean = readings.flatMap((r) => (r.leanKg === undefined ? [] : [r.leanKg]));
  return { pct: mean(readings.map((r) => r.pct)) as number, leanKg: mean(lean) };
}

export function bodyFatTrend(entries: WeightEntry[] | undefined): BodyFatTrend | undefined {
  const all: Reading[] = (entries ?? [])
    .filter((e) => isPlausibleFatPct(e.fatPct))
    .map((e) => {
      const weighed = e.scaleKg ?? e.kg;
      return { date: e.date, pct: e.fatPct as number, leanKg: weighed > 0 ? weighed * (1 - (e.fatPct as number) / 100) : undefined };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (all.length === 0) return undefined;
  const asOf = all[all.length - 1].date;

  const anchor = addDays(asOf, -WINDOW_DAYS);
  const current = all.filter((r) => r.date > anchor).slice(-PER_AVERAGE);
  const now = average(current);

  // Een maand eerder: de laatste metingen van 3 tot 8 weken voor de nieuwste, en nooit
  // een meting die ook in het gemiddelde van nu zit.
  const firstNow = current[0]?.date ?? asOf;
  const earlier = all
    .filter((r) => r.date <= addDays(asOf, -EARLIER_FROM_DAYS) && r.date > addDays(asOf, -EARLIER_TO_DAYS) && r.date < firstNow)
    .slice(-PER_AVERAGE);
  const trend: BodyFatTrend = { asOf, readings: current.length, pct: now.pct };
  if (now.leanKg !== undefined) trend.leanKg = now.leanKg;
  if (earlier.length >= MIN_PREVIOUS) {
    const before = average(earlier);
    trend.previousPct = before.pct;
    trend.deltaPct = now.pct - before.pct;
    if (now.leanKg !== undefined && before.leanKg !== undefined) {
      trend.previousLeanKg = before.leanKg;
      trend.leanDeltaKg = now.leanKg - before.leanKg;
    }
  }
  return trend;
}

// Altijd één decimaal met komma: "18,0".
function one(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
}

function difference(delta: number, unit: string): string {
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  if (rounded === 0) return 'ongeveer gelijk aan een maand eerder';
  return `${one(rounded)}${unit} ${delta < 0 ? 'lager' : 'hoger'} dan een maand eerder`;
}

// De regels zoals ze op het scherm staan. De vetvrije massa alleen met een
// vergelijking: zonder die zegt hij weinig.
export function bodyFatLines(t: BodyFatTrend): { fat: string; lean?: string } {
  const fat = `Vet ${one(t.pct)}%, ${t.deltaPct === undefined ? 'nog geen vergelijking met een maand eerder' : difference(t.deltaPct, '')}`;
  const lean = t.leanKg !== undefined && t.leanDeltaKg !== undefined ? `Vetvrije massa ${one(t.leanKg)} kg, ${difference(t.leanDeltaKg, ' kg')}` : undefined;
  return { fat, lean };
}
