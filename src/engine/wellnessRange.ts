// ASCEND: welk stuk ochtendgetallen er opgehaald en bewaard wordt.
//
// Gewoon zijn dat de laatste 28 dagen (je eigen gemiddelde voor de ochtendkaart). "Wat speelde er"
// (docs/beslissingen/2026-10-25-wat-speelde-er.md) vergelijkt een vastgelegde ochtend met de 28 dagen
// ervoor, dus dan moet het stuk terug tot 28 dagen voor de oudste ochtend die een notitie raakt. Dat
// lange stuk wordt niet bij elke sync opgehaald: alleen als die ochtenden nog niet gedekt zijn
// (een nieuwe notitie, een teruggezette back-up), daarna weer de gewone 28 dagen.
//
// Puur: geen React, geen IndexedDB.

import { addDays } from '../utils/dates';
import { BASELINE_DAYS } from './wellnessCheck';

// Zo lang blijven records van intervals.icu bewaard, en zo ver terug halen we hooguit op.
export const KEEP_DAYS = 400;
// Een lang stuk gaat in delen, zodat elk verzoek klein blijft en zijn eigen tijdsgrens heeft.
export const CHUNK_DAYS = 120;

export interface DateSpan {
  from: string;
  to: string;
}

export interface WellnessPlan {
  // De gewone 28 dagen: dit moet lukken, en alleen dit telt voor de uitslag van de sync.
  normal: DateSpan;
  // Het lange stuk erachter, best effort: nieuwste deel eerst, zodat een gelukt deel altijd aansluit op
  // wat er al is. Na elk gelukt deel is `from` van dat deel de nieuwe "gedekt vanaf".
  long: DateSpan[];
}

// De oudste dag die nodig is: 28 dagen voor de oudste ochtend, binnen het plafond.
export function neededFrom(today: string, mornings: string[]): string | undefined {
  const floor = addDays(today, -KEEP_DAYS);
  const usable = mornings.filter((m) => m <= today && m >= floor).sort();
  if (usable.length === 0) return undefined;
  const from = addDays(usable[0], -BASELINE_DAYS);
  return from < floor ? floor : from;
}

export function wellnessPlan(input: { today: string; mornings: string[]; coveredFrom?: string }): WellnessPlan {
  const { today } = input;
  const normal = { from: addDays(today, -BASELINE_DAYS), to: today };
  const need = neededFrom(today, input.mornings);
  // Wat nog ontbreekt loopt tot vlak voor wat al gedekt is (of voor de gewone 28 dagen).
  const upper = addDays(input.coveredFrom !== undefined && input.coveredFrom < normal.from ? input.coveredFrom : normal.from, -1);
  if (!need || need > upper) return { normal, long: [] };
  const long: DateSpan[] = [];
  let to = upper;
  while (to >= need) {
    const from = addDays(to, -(CHUNK_DAYS - 1));
    long.push({ from: from < need ? need : from, to });
    to = addDays(from, -1);
  }
  return { normal, long };
}
