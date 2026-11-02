// ASCEND: een gekoppelde testloop in twee delen, voor de belasting (docs/onderzoek/RPE bij een testloop.md,
// voorstel 4; docs/beslissingen/2026-11-02-rpe-bij-een-testloop.md).
//
// Een test van het horloge komt via intervals.icu binnen als één activiteit: inlopen, de 5 km en uitlopen
// samen, met de RPE die je op het horloge of bij intervals.icu gaf (meestal 9 of 10). Minuten maal RPE telt
// dan 45 x 10 = 450, terwijl 25 minuten test op 10 en 20 minuten rustig op 3 samen 310 zijn. Heeft de log een
// snelste 5 km uit de reeks van het horloge (`SessionLog.bestEffort`), dan is dat het harde deel en de rest het
// rustige. Zonder die snelste 5 km (met de hand gelogd, alleen de 5 km, of geen reeks) blijft alles zoals het
// was. Een afgeleide berekening: de log zelf verandert nooit.
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { isStaleEffort, isUsableBestEffort, testTotals } from './bestEffort';
import { isTestOrRace, type RoleCarrier } from './templateRoles';

// De zwaarte van het inlopen en uitlopen: rustig.
export const EASY_PART_RPE = 3;
// Minder dan een minuut over: de log is de test zelf.
const MIN_EASY_MINUTES = 1;

export interface EffortSplit {
  // De minuten van de snelste 5 km (stilstaan telt daar niet in en dus bij het rustige deel).
  hardMinutes: number;
  // De rest van de log: inlopen, uitlopen en stilstaan.
  easyMinutes: number;
}

// Het harde en het rustige deel van een test of wedstrijd (herkend via de rol), of niets. De snelste 5 km
// telt ook als hij nog op je Akkoord voor de tempo's wacht: gelopen zijn de minuten hoe dan ook. Niet bij een
// snelste 5 km voor andere totalen (een correctie bij de bron) of bij een ingekorte log.
export function testEffortSplit(log: Pick<SessionLog, 'durationMinutes' | 'bestEffort' | 'trim' | 'cardioData' | 'outdoorData'>, template: RoleCarrier | undefined): EffortSplit | undefined {
  if (!template || !isTestOrRace(template) || log.trim) return undefined;
  const b = log.bestEffort;
  if (!isUsableBestEffort(b)) return undefined;
  const { km, minutes } = testTotals(log);
  if (b.km > km + 0.05 || isStaleEffort(b, km, minutes)) return undefined;
  const total = Math.max(0, log.durationMinutes || 0);
  const easyMinutes = total - b.minutes;
  if (!(easyMinutes >= MIN_EASY_MINUTES)) return undefined;
  return { hardMinutes: b.minutes, easyMinutes };
}
