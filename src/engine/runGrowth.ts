// ASCEND: de lange loop bij een hardloopdoel (ronde 2b, keuze van de eigenaar op 26 oktober 2026,
// docs/beslissingen/2026-10-26-planning-met-labels.md en docs/onderzoek/Doelsoorten duur.md,
// gedeelde regel 3 en 4).
//
// 1. De lange loop groeit bij een hardloopdoel als Top of Voortop elke twee weken met 10%, in
//    plaats van 10% per blok van vier weken (engine/programLayout.ts#runBuildMultiplier). Het
//    plafond blijft de 110%-rem op de langste loop van de laatste 30 dagen
//    (engine/substitutions.ts), die op je eigen logs rekent.
// 2. Na een wedstrijd telt de wedstrijd niet als referentie voor die 110%, en in de eerste week
//    terug is de lange loop hoogstens de helft van de wedstrijdafstand.
//
// Alleen een hardloopdoel als Top of Voortop in een programma zonder tocht als hoofddoel; een
// tocht houdt zijn eigen opbouw, ook met een wedstrijd ernaast.
// Sterkte: de rem zelf is matig tot sterk (Frandsen 2025), de snelheid van de groei en de helft
// van de afstand zijn afgeleid.
//
// Puur: geen React, geen IndexedDB.

import type { Program } from '../models/program';
import type { TrainingGoal } from '../models/goals';
import { effectivePriority, goalDetailsOf, isRaceGoal } from './goalLabels';
import { addDays, daysBetween } from '../utils/dates';

// Om de twee weken: de voorzichtige kant van "wekelijks of tweewekelijks".
export const LONG_RUN_STEP_WEEKS = 2;

// Hoe lang de lange loop hoogstens wordt vlak voor de wedstrijd, per afstand (minuten).
// Uit Doelsoorten duur.md deel 3.1: 10 km tot 60 à 75, halve marathon 90 à 120, marathon
// 165 à 180 (28 tot 32 km). Het hoogste van het bereik; de bestaande piek van 120 blijft minimaal.
const PEAK_BY_VARIANT: Record<string, number> = { '5k': 50, '10k': 75, half: 120, marathon: 180 };

export function longRunPeakMinutes(variant: string | undefined): number {
  return (variant && PEAK_BY_VARIANT[variant]) || 0;
}

// De opbouw van het programma naar de eerstvolgende hardloopwedstrijd van een Top of Voortop
// (Program.runBuild). Zonder zo'n wedstrijd niets: dan blijft de gewone opbouw.
export function programRunBuild(goals: TrainingGoal[], mainGoalId: string | undefined, today: string): NonNullable<Program['runBuild']> | undefined {
  // Een programma dat naar een tocht toewerkt (het doel met de ladder) bepaalt de opbouw van de
  // lange loop zelf: een hardloopwedstrijd ernaast is een tussendoel en verandert die niet.
  if (mainGoalId) return undefined;
  const next = goals
    .filter((g): g is TrainingGoal & { targetDate: string } => g.status === 'active' && !!g.targetDate && g.targetDate >= today && isRaceGoal(g) && g.id !== mainGoalId)
    .filter((g) => effectivePriority(g, mainGoalId) !== 'verkenning')
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  if (!next) return undefined;
  return { raceDate: next.targetDate, stepWeeks: LONG_RUN_STEP_WEEKS, peakMinutes: longRunPeakMinutes(goalDetailsOf(next).variant) };
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
