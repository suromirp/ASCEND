// ASCEND: de ochtendkaart bovenaan Vandaag (docs/beslissingen/2026-10-23-
// ochtendkaart-en-melding.md): wanneer hij er staat, en wat er alvast voor je
// is ingevuld, met de bron erbij. Alles is een voorstel: jij tikt het
// antwoord, en ASCEND zegt erbij waar het vandaan komt.
//
// Puur: geen React, geen IndexedDB.

import type { EnergyFeeling, LegFeeling, MorningCheckIn, SleepFeeling } from '../models/checkIn';
import { fatigueWord, type LegFatigueResult } from './legFatigue';
import type { WellnessReading } from './wellnessCheck';

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
export const ENERGY: [EnergyFeeling, string][] = [['fit', 'Fit'], ['gewoon', 'Gewoon'], ['moe', 'Moe'], ['op', 'Op']];
export const SLEEP: [SleepFeeling, string][] = [['goed', 'Goed'], ['gewoon', 'Gewoon'], ['matig', 'Matig'], ['slecht', 'Slecht of kort']];
