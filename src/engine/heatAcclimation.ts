// ASCEND: wennen aan warmte in de laatste weken voor een zomertocht (docs/onderzoek/Kansen met
// gegevens.md, kans D, tweede helft; docs/beslissingen/2026-11-01-kansen-middelgroot.md).
//
// Hitte-acclimatisatie gaat in 1 tot 2 weken met trainingen van 60 tot 90 minuten in de warmte
// (Racinais e.a. 2015, consensus, sterk voor het principe). Een GR5 in de zomer is warm in de
// dalen. Daarom staat er in de reisplanner, in de laatste drie weken voor een vertrek van juni tot
// en met september, één regel. Een raad, geen training: de planning verandert er niet door.
//
// Puur: geen React, geen IndexedDB.

import { daysBetween } from '../utils/dates';

export const HEAT_ACCLIMATION_DAYS = 21;
const SUMMER_MONTHS = new Set([6, 7, 8, 9]);

export function isSummerDeparture(date: string): boolean {
  return SUMMER_MONTHS.has(Number(date.slice(5, 7)));
}

// `on`: de instelling "Wennen aan warmte" (AppSettings.heatAcclimation, standaard aan).
export function heatAcclimationLine(departure: string | undefined, today: string, on = true): string | undefined {
  if (!on || !departure || !isSummerDeparture(departure)) return undefined;
  const days = daysBetween(today, departure);
  if (days < 1 || days > HEAT_ACCLIMATION_DAYS) return undefined;
  return 'Je vertrekt in de zomer. In de laatste twee weken kunnen een paar trainingen in de warmte, van een uur tot anderhalf, je lichaam helpen wennen. Drink genoeg en houd het rustig.';
}
