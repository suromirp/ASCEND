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

export interface WellnessPlan {
  ranges: { from: string; to: string }[];
  // Waar het opgehaalde stuk na een geslaagde sync begint, om te onthouden wat gedekt is.
  coveredFrom: string;
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
  const normal = addDays(today, -BASELINE_DAYS);
  const need = neededFrom(today, input.mornings);
  const covered = input.coveredFrom;
  // Niets nodig, of alles wat nodig is is al gedekt: de gewone 28 dagen.
  if (!need || need >= normal || (covered !== undefined && covered <= need)) {
    return { ranges: [{ from: normal, to: today }], coveredFrom: covered !== undefined && covered < normal ? covered : normal };
  }
  const ranges: { from: string; to: string }[] = [];
  let from = need;
  while (from <= today) {
    const to = addDays(from, CHUNK_DAYS - 1);
    ranges.push({ from, to: to > today ? today : to });
    from = addDays(to, 1);
  }
  return { ranges, coveredFrom: need };
}
