// ASCEND: grenzen voor wat iemand intikt. Pure.
//
// Een duur die leeg of 0 is, betekent "geen duur" (0 minuten, zoals bij een
// rustdag); een duur boven een redelijke grens vraagt eerst "Klopt dit?"; en de
// hartslagwaarden hebben grenzen met een korte melding in plaats van dat de
// zones zonder uitleg verdwijnen.

import type { HeartRateSettings } from './heartRateZones';

// Een training van meer dan tien uur is bijna altijd een tikfout (999).
export const LONG_SESSION_MIN = 600;

// De duur zoals hij wordt opgeslagen: leeg, 0, negatief of geen getal is 0.
export function entryMinutes(value: number | '' | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

// Een training zonder duur bestaat niet: leeg, 0, negatief of minder dan een halve minuut houdt Opslaan uit,
// met deze zin onder het veld (profielen 14 november, punt B). Een rustdag heeft geen duurveld.
export const SHORT_DURATION_TEXT = 'Vul een duur in van minstens 1 minuut.';

export function durationTooShort(value: number | '' | undefined): boolean {
  return entryMinutes(value) < 1;
}

// Een afstand of hoogte die je intikt: negatief of geen getal is nooit een waarde, en 0 betekent "weet ik
// niet" (leeg), zodat er nooit "0 km" in het logboek staat (punt B).
export function entryAmount(value: number | '' | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function durationNeedsCheck(minutes: number): boolean {
  return minutes > LONG_SESSION_MIN;
}

// "999 min is 16 uur en 39 min."
export function longDurationText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${minutes} min is ${h} uur${m > 0 ? ` en ${m} min` : ''}`;
}

export type HeartRateField = keyof HeartRateSettings;

const HEART_RATE_LIMITS: Record<HeartRateField, [number, number]> = {
  lthr: [100, 220],
  maxHr: [120, 230],
  restingHr: [30, 110],
};

const LABEL: Record<HeartRateField, string> = { lthr: 'Je drempelhartslag', maxHr: 'Je maximale hartslag', restingHr: 'Je hartslag in rust' };

// De melding als `value` voor `field` niet kan; undefined als het mag (ook leeg:
// een veld leegmaken mag altijd). `hr` zijn de andere waarden zoals ze nu staan.
export function heartRateProblem(field: HeartRateField, value: number | undefined, hr: HeartRateSettings): string | undefined {
  if (value === undefined) return undefined;
  const [min, max] = HEART_RATE_LIMITS[field];
  if (!Number.isFinite(value) || value < min || value > max) return `${LABEL[field]} ligt tussen ${min} en ${max} bpm. Dit getal is niet bewaard.`;
  const next = { ...hr, [field]: value };
  if (next.restingHr !== undefined && next.lthr !== undefined && next.restingHr >= next.lthr) return 'Je hartslag in rust moet lager zijn dan je drempel- en je maximale hartslag. Dit getal is niet bewaard.';
  if (next.lthr !== undefined && next.maxHr !== undefined && next.lthr > next.maxHr) return 'Je drempelhartslag kan niet hoger zijn dan je maximale hartslag. Dit getal is niet bewaard.';
  return undefined;
}
