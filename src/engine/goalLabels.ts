// ASCEND: wat de planning van het label van een doel leest (ronde 2b,
// docs/beslissingen/2026-10-26-planning-met-labels.md). Eén plek voor de vraag
// "hoe belangrijk is dit doel, welke soort is het en hoeveel dagen afbouw en
// herstel horen erbij", zodat het wedstrijdblok, de weekcontrole en de
// botsingen van doelen hetzelfde lezen.
//
// Het label (`TrainingGoal.priority`) wint. Een doel zonder label valt terug op de
// oude rol (`planRole`, die defensief gelezen blijft): het hoofddoel is top, een andere
// hardloopwedstrijd voortop, de rest verkenning.
//
// Puur: geen React, geen IndexedDB.

import type { GoalDetails, GoalKindId, GoalPriority, TrainingGoal } from '../models/goals';
import { GOAL_PRIORITIES } from '../models/goals';
import { recoveryDaysFor, taperDaysFor } from '../data/goalKinds';

export type GoalPlanRole = 'main' | 'secondary' | 'track';

export function isRaceGoal(goal: TrainingGoal): boolean {
  return goal.requirements.some((r) => (r.kind === 'distance' || r.kind === 'targetTime') && r.discipline === 'running');
}

// The role a goal plays in the plan: the main goal is fixed; any other
// running race defaults to a tussendoel, everything else to "only follow".
export function goalPlanRole(goal: TrainingGoal, mainGoalId: string | undefined): GoalPlanRole {
  if (goal.id === mainGoalId) return 'main';
  return goal.planRole ?? (isRaceGoal(goal) ? 'secondary' : 'track');
}

export const PRIORITY_NAME: Record<GoalPriority, string> = { top: 'Top', voortop: 'Voortop', verkenning: 'Verkenning' };

const fromRole: Record<GoalPlanRole, GoalPriority> = { main: 'top', secondary: 'voortop', track: 'verkenning' };

export function effectivePriority(goal: TrainingGoal, mainGoalId: string | undefined): GoalPriority {
  if (goal.id === mainGoalId) return 'top';
  const own: unknown = goal.priority;
  if (typeof own === 'string' && (GOAL_PRIORITIES as readonly string[]).includes(own)) return own as GoalPriority;
  return fromRole[goalPlanRole(goal, mainGoalId)];
}

// De soort van een doel. Een hardloopwedstrijd zonder soort (nog niet overgezet) is run_race.
export function goalKindOf(goal: TrainingGoal): GoalKindId | undefined {
  if (goal.kind) return goal.kind;
  return isRaceGoal(goal) ? 'run_race' : undefined;
}

// De ingevulde gegevens, voor een hardloopwedstrijd aangevuld uit de eisen van het doel.
export function goalDetailsOf(goal: TrainingGoal): GoalDetails {
  const d: GoalDetails = { ...(goal.details ?? {}) };
  if (goalKindOf(goal) === 'run_race') {
    const km = goal.requirements.find((r) => r.kind === 'distance' && r.target?.unit === 'km')?.target?.amount;
    const min = goal.requirements.find((r) => r.kind === 'targetTime' && r.target?.unit === 'min')?.target?.amount;
    if (d.distanceKm === undefined && km !== undefined) d.distanceKm = km;
    if (d.targetMinutes === undefined && min !== undefined) d.targetMinutes = min;
    if (d.variant === undefined && d.distanceKm !== undefined) {
      d.variant = d.distanceKm <= 5.5 ? '5k' : d.distanceKm <= 11 ? '10k' : d.distanceKm <= 22 ? 'half' : 'marathon';
    }
  }
  return d;
}

// De afbouw in dagen die dit doel nu krijgt: die van de soort en het label, hoogstens
// zijn eigen kortere afbouw (`TrainingGoal.taperDays`, wat een botsing kort kan maken).
export function goalTaperDays(goal: TrainingGoal, priority: GoalPriority): number {
  const kind = goalKindOf(goal);
  if (!kind) return 0;
  const advice = taperDaysFor(kind, priority, goalDetailsOf(goal)).value;
  const own = goal.taperDays;
  return typeof own === 'number' && Number.isFinite(own) && own >= 0 ? Math.min(advice, Math.round(own)) : advice;
}

// Het herstel in dagen na dit doel: van de soort en de afstand, niet van het label.
export function goalRecoveryDays(goal: TrainingGoal): number {
  const kind = goalKindOf(goal);
  return kind ? recoveryDaysFor(kind, goalDetailsOf(goal)).value : 0;
}
