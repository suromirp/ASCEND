// ASCEND: de ochtendkaart bovenaan Vandaag (docs/beslissingen/2026-10-23-
// ochtendkaart-en-melding.md): wanneer hij er staat, en wat er alvast voor je
// is ingevuld, met de bron erbij. Alles is een voorstel: jij tikt het
// antwoord, en ASCEND zegt erbij waar het vandaan komt.
//
// Puur: geen React, geen IndexedDB.

import type { EnergyFeeling, LegFeeling, MorningCheckIn, SleepFeeling } from '../models/checkIn';
import { fatigueWord, type LegFatigueResult } from './legFatigue';
import { suggestSleepFeeling, watchSummaryLine, type WellnessLine, type WellnessReading } from './wellnessCheck';

// De kaart staat er vanaf het begin van de ochtend (instelbaar, standaard 5 uur)
// tot de middag. Na middernacht is het nog geen ochtend.
export const MORNING_CARD_UNTIL_HOUR = 12;

export function showMorningCard(p: { enabled: boolean; hour: number; fromHour: number; checkIn: MorningCheckIn | undefined; trainedToday: boolean }): boolean {
  return p.enabled && !p.checkIn && p.hour >= p.fromHour && p.hour < MORNING_CARD_UNTIL_HOUR && !p.trainedToday;
}

type LegIndex = Pick<LegFatigueResult, 'index' | 'painRecent' | 'contributions'>;

// Benen uit de beenindex (engine/legFatigue.ts), in de woorden van de ochtendvraag:
// "Fris" blijft Fris, "Wat vermoeid" wordt Wat stijf, "Vermoeid" wordt Spierpijn.
// Flinke spierpijn stel je nooit voor: dat zegt alleen jij. Zonder iets wat nog
// meetelt valt er niets te zeggen, en bij pijn in de benen van de laatste dagen
// is "Fris" nooit het voorstel.
export function suggestLegs(result: LegIndex | undefined): LegFeeling | undefined {
  if (!result || result.contributions.length === 0) return undefined;
  const { level } = fatigueWord(result.index);
  if (level === 0) return result.painRecent ? 'stijf' : 'fris';
  return level === 1 ? 'stijf' : 'spierpijn';
}

export type SuggestionSource = 'beenindex' | 'horloge' | 'zelf';

export interface Suggested<T> {
  value: T;
  from: SuggestionSource;
}

export interface MorningPrefill {
  legs?: Suggested<LegFeeling>;
  energy?: Suggested<EnergyFeeling>;
  sleep?: Suggested<SleepFeeling>;
}

export function morningPrefill(p: { legIndex: LegIndex | undefined; reading: WellnessReading | undefined }): MorningPrefill {
  const out: MorningPrefill = {};
  const legs = suggestLegs(p.legIndex);
  if (legs) out.legs = { value: legs, from: 'beenindex' };
  if (p.reading?.suggestedSleep) out.sleep = { value: p.reading.suggestedSleep, from: p.reading.suggestedSleepFrom ?? 'horloge' };
  if (p.reading?.suggestedEnergy) out.energy = { value: p.reading.suggestedEnergy, from: 'horloge' };
  return out;
}

export const SOURCE_TEXT: Record<SuggestionSource, string> = {
  beenindex: 'volgens je beenindex',
  horloge: 'uit je horloge',
  zelf: 'zelf ingevuld',
};

// De keuzes van de ochtendvraag met hun woorden, voor de kaart, het blad en de samenvatting.
export const LEGS: [LegFeeling, string][] = [['fris', 'Fris'], ['stijf', 'Wat stijf'], ['spierpijn', 'Spierpijn'], ['flink', 'Flinke spierpijn']];
// Het antwoord over de benen in woorden; bij spierpijn alleen in het bovenlichaam zegt het dat.
export function legsAnswerText(c: Pick<MorningCheckIn, 'legs' | 'soreWhere'>): string | undefined {
  const base = LEGS.find(([k]) => k === c.legs)?.[1];
  if (base && c.soreWhere === 'upper' && (c.legs === 'spierpijn' || c.legs === 'flink')) return `${base} in je bovenlichaam`;
  return base;
}

export const ENERGY: [EnergyFeeling, string][] = [['fit', 'Fit'], ['gewoon', 'Gewoon'], ['moe', 'Moe'], ['op', 'Op']];
export const SLEEP: [SleepFeeling, string][] = [['goed', 'Goed'], ['gewoon', 'Gewoon'], ['matig', 'Matig'], ['slecht', 'Slecht of kort']];

// --- de getallen bovenaan de kaart ---------------------------------------------------

export interface CardStat {
  label: string;
  value: string;
  unit?: string;
  from: 'horloge' | 'zelf';
}

// De drie getallen van het horloge als waarde en eenheid apart.
function statOf(l: WellnessLine): CardStat | undefined {
  if (l.key === 'restingHeartRate') {
    const n = /^(\d+)/.exec(l.value)?.[1];
    return n ? { label: 'Rusthart', value: n, unit: 'bpm', from: 'horloge' } : undefined;
  }
  if (l.key === 'hrv') {
    const n = /^(\d+)/.exec(l.value)?.[1];
    return n ? { label: 'HRV', value: n, unit: 'ms', from: 'horloge' } : undefined;
  }
  const hm = /^(\d+) uur(?: (\d+))?$/.exec(l.value);
  if (hm) return { label: 'Slaap', value: `${hm[1]}:${(hm[2] ?? '0').padStart(2, '0')}`, unit: 'u', from: 'horloge' };
  const min = /^(\d+) min$/.exec(l.value);
  if (min) return { label: 'Slaap', value: min[1], unit: 'min', from: 'horloge' };
  return { label: 'Slaap', value: l.value, from: 'horloge' };
}

export interface MorningCardView {
  stats: CardStat[];
  // Waar de getallen vandaan komen: 'horloge' alleen als ze allemaal van het horloge zijn,
  // 'horloge en zelf' bij een mengsel, anders niets (alleen een eigen schatting).
  heading: 'van je horloge' | 'horloge en zelf' | undefined;
  // De compacte regel als er geen getallen te tonen zijn.
  line: string;
}

// Een nacht die je niet goed gemeten noemde laat de gemeten slaap overal weg: in de
// plaats komt je eigen schatting (met "zelf" erbij), of niets als je die niet weet.
export function morningCardView(reading: WellnessReading | undefined, options: { sleepExpected?: boolean; linked?: boolean } = {}): MorningCardView {
  const ignored = reading?.night?.state === 'ignored' ? reading.night : undefined;
  const stats = (reading?.lines ?? []).flatMap((l): CardStat[] => {
    if (l.key === 'sleep' && ignored) return ignored.hours ? [{ label: 'Slaap, zelf', value: `±${ignored.hours}`, unit: 'u', from: 'zelf' }] : [];
    const stat = statOf(l);
    return stat ? [stat] : [];
  });
  const fromWatch = stats.filter((s) => s.from === 'horloge').length;
  const heading = stats.length === 0 || fromWatch === 0 ? undefined : fromWatch === stats.length ? 'van je horloge' : 'horloge en zelf';
  const line = reading || options.linked ? watchSummaryLine(reading, { sleepExpected: options.sleepExpected }) : '';
  return { stats, heading, line };
}

// Is de ochtendcheck al opgeslagen met een slaapantwoord dat alleen uit het voorstel
// kwam, en verandert je oordeel over de nacht, dan gaat dat antwoord mee. Wat je zelf
// koos blijft staan. Zonder eigen schatting is er geen voorstel meer. Bij "Klopt" blijft
// alles zoals het was.
export function reviseCheckInSleep(checkIn: MorningCheckIn, judgment: { verdict: 'klopt' | 'niet_goed'; hours?: number } | null): MorningCheckIn {
  if (!checkIn.sleepSuggested || judgment?.verdict === 'klopt') return checkIn;
  const sleep = judgment?.hours ? suggestSleepFeeling({ sleepMinutes: judgment.hours * 60 }) : undefined;
  const { sleep: _old, ...rest } = checkIn;
  return sleep ? { ...rest, sleep } : rest;
}
