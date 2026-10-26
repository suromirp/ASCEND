// ASCEND: de lange loop bij een hardloopdoel (ronde 2b, keuze van de eigenaar op 26 oktober 2026,
// docs/beslissingen/2026-10-26-planning-met-labels.md en docs/onderzoek/Doelsoorten duur.md,
// gedeelde regel 3 en 4).
//
// 1. De lange loop groeit bij een hardloopdoel als Top of Voortop elke week met 10% (instelling
//    "Groei van de lange loop"), in plaats van 10% per blok van vier weken (engine/programLayout.ts#runBuildMultiplier). Het
//    plafond blijft de 110%-rem op de langste loop van de laatste 30 dagen
//    (engine/substitutions.ts), die op je eigen logs rekent.
// 2. Na een wedstrijd telt de wedstrijd niet als referentie voor die 110%, en in de eerste week
//    terug is de lange loop hoogstens de helft van de wedstrijdafstand.
//
// Alleen een hardloopdoel als Top of Voortop; ook in een programma naar een tocht (keuze van de
// eigenaar, docs/beslissingen/2026-10-26-groei-lange-loop.md).
// Sterkte: de rem zelf is matig tot sterk (Frandsen 2025), de snelheid van de groei en de helft
// van de afstand zijn afgeleid.
//
// Puur: geen React, geen IndexedDB.

import type { Program } from '../models/program';
import type { TrainingGoal } from '../models/goals';
import { effectivePriority, goalDetailsOf, isRaceGoal } from './goalLabels';
import { addDays, daysBetween } from '../utils/dates';

// Hoe snel de lange loop groeit naar een hardloopwedstrijd (AppSettings.longRunGrowth).
// - wave ("Heel rustig"): per blok van vier weken, het gedrag van voor ronde 2b (geen Program.runBuild).
// - biweekly ("Rustiger"): om de twee weken een stap van hoogstens 10%.
// - weekly ("Volgens het onderzoek", het advies): elke week een stap van hoogstens 10%, altijd binnen
//   de 110%-rem, met de lichtere week van de golf en de piek om de week (Frandsen 2025, matig;
//   Nielsen 2014, matig: tot 30% per twee weken geen hoger risico, boven 30% wel).
// - firm ("Stevig"): als weekly, maar de piek mag elke week staan. Nog binnen de 110%-rem.
// - fast ("Sneller dan het onderzoek", onder Geavanceerd): wekelijks een stap tot 120% van je langste
//   loop van 30 dagen. Buiten het onderzoek, op verzoek van de eigenaar, met een waarschuwing vooraf;
//   de lichtere week, de herstart na een pauze, de rem bij pijn en het rekenen vanaf wat je echt liep
//   blijven. De 110% blijft de standaard en het advies.
export type LongRunGrowth = 'weekly' | 'biweekly' | 'wave' | 'firm' | 'fast';
export const LONG_RUN_GROWTH_ADVICE: LongRunGrowth = 'weekly';
export const FAST_GROWTH_WARNING = 'Boven 10% langer dan je langste loop gaf in het grootste onderzoek ongeveer 64% meer kans op een overbelastingsblessure (Frandsen 2025).';

// Per keuze: weken per stap, de stap, of de piek afwisselt en de rem op je langste loop van 30 dagen.
const GROWTH_SPEC: Record<Exclude<LongRunGrowth, 'wave'>, NonNullable<Program['runBuild']>> = {
  biweekly: { raceDate: '', stepWeeks: 2, peakMinutes: 0 },
  weekly: { raceDate: '', stepWeeks: 1, peakMinutes: 0 },
  firm: { raceDate: '', stepWeeks: 1, peakMinutes: 0, alternatePeak: false },
  fast: { raceDate: '', stepWeeks: 1, peakMinutes: 0, alternatePeak: false, stepPercent: 20, spikeLimit: 1.2 },
};

// Defensief gelezen: wat geen bekende keuze is, wordt het advies.
export function resolveLongRunGrowth(raw: unknown): LongRunGrowth {
  return raw === 'weekly' || raw === 'biweekly' || raw === 'wave' || raw === 'firm' || raw === 'fast' ? raw : LONG_RUN_GROWTH_ADVICE;
}

// Hoe lang de lange loop hoogstens wordt vlak voor de wedstrijd, per afstand (minuten).
// Uit Doelsoorten duur.md deel 3.1: 10 km tot 60 à 75, halve marathon 90 à 120, marathon
// 165 à 180 (28 tot 32 km). Het hoogste van het bereik; de bestaande piek van 120 blijft minimaal.
const PEAK_BY_VARIANT: Record<string, number> = { '5k': 50, '10k': 75, half: 120, marathon: 180 };

export function longRunPeakMinutes(variant: string | undefined): number {
  return (variant && PEAK_BY_VARIANT[variant]) || 0;
}

// De opbouw van het programma naar de eerstvolgende hardloopwedstrijd van een Top of Voortop
// (Program.runBuild), ook in een programma naar een tocht: de wedstrijd is dan een tussendoel dat
// de lange loop sneller laat groeien, binnen de 110%-rem, en de piek is het grootste van de piek
// voor de wedstrijd en de bestaande piek van het programma. Zonder zo'n wedstrijd, of op
// "per blok van vier weken", niets: dan blijft de gewone opbouw.
export function programRunBuild(goals: TrainingGoal[], mainGoalId: string | undefined, today: string, growth: unknown = LONG_RUN_GROWTH_ADVICE): NonNullable<Program['runBuild']> | undefined {
  const choice = resolveLongRunGrowth(growth);
  if (choice === 'wave') return undefined;
  const next = goals
    .filter((g): g is TrainingGoal & { targetDate: string } => g.status === 'active' && !!g.targetDate && g.targetDate >= today && isRaceGoal(g))
    .filter((g) => effectivePriority(g, mainGoalId) !== 'verkenning')
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  if (!next) return undefined;
  return { ...GROWTH_SPEC[choice], raceDate: next.targetDate, peakMinutes: longRunPeakMinutes(goalDetailsOf(next).variant) };
}

// --- na een wedstrijd -----------------------------------------------------------

export interface RaceLogLike {
  completedDate: string;
  durationMinutes?: number;
  distanceKm?: number;
}

// Rustig tempo is langzamer dan wedstrijdtempo: de helft van de afstand duurt langer dan de
// helft van de wedstrijdtijd. Afgeleid, een startwaarde.
const EASY_PACE_SLOWER = 1.2;
const FIRST_WEEK_DAYS = 7;

// De lange loop in minuten in de eerste week na een wedstrijd: hoogstens de helft van de
// wedstrijdafstand, in minuten gerekend naar het tempo van die wedstrijd, rustiger genomen.
// Undefined als de wedstrijd te weinig gegevens heeft of de week al voorbij is.
export function longRunCapAfterRace(race: RaceLogLike, date: string): number | undefined {
  const after = daysBetween(race.completedDate, date);
  if (after < 1 || after > FIRST_WEEK_DAYS) return undefined;
  if (!(race.durationMinutes && race.durationMinutes > 0)) return undefined;
  return Math.max(15, Math.round((race.durationMinutes * 0.5 * EASY_PACE_SLOWER) / 5) * 5);
}

// De laatste dag waarop de lange loop nog door een wedstrijd begrensd wordt.
export const lastCappedDay = (raceDate: string) => addDays(raceDate, FIRST_WEEK_DAYS);
