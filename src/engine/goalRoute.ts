// ASCEND — route profile of a goal (goal-flow redesign, Fase 1).
//
// A multi-day goal is entered the way people actually think about a trip:
// the route totals (600 km, 30.000 m D+ and D-), the number of walking or
// riding days, and — for a trip done in stages — the longest stretch of
// consecutive days. Training is never compared against those route totals
// directly (production report: "30.000 m D+" put next to a single training
// session). This module turns totals into a TYPICAL DAY (totals ÷ days,
// unless the user overrode a value with a PER_DAY requirement) — the one
// place that conversion happens, shared by engine/demand.ts and the goal
// wizard's "Typische dag · berekend" block, so the two can never disagree.

import type { GoalRequirement, GoalExecution, TrainingGoal } from '../models/goals';
import type { MeasuredValue } from '../models/units';
import { makeId } from '../utils/id';

export type RouteKind = 'distance' | 'elevationGain' | 'elevationLoss';
export const ROUTE_KINDS: RouteKind[] = ['distance', 'elevationGain', 'elevationLoss'];

export type DayValueSource = 'override' | 'derived' | 'single_day';

export interface DayValue {
  value: MeasuredValue;
  source: DayValueSource;
}

function find(requirements: GoalRequirement[], kind: GoalRequirement['kind'], perDay: boolean): GoalRequirement | undefined {
  return requirements.find((r) => r.kind === kind && (r.scope === 'PER_DAY') === perDay && r.target !== undefined);
}

export function eventDaysRequirement(requirements: GoalRequirement[]): GoalRequirement | undefined {
  return requirements.find((r) => r.kind === 'eventDays');
}

// A goal is multi-day once it says so — an eventDays requirement (filled
// in or still empty) or a longest stage of more than one day. Never
// inferred from how large a number looks.
export function isMultiDayGoal(requirements: GoalRequirement[]): boolean {
  const days = eventDaysRequirement(requirements);
  if (days) return days.target === undefined || days.target.amount > 1;
  const consecutive = requirements.find((r) => r.kind === 'consecutiveDays');
  return (consecutive?.target?.amount ?? 0) > 1;
}

function roundForUnit(value: MeasuredValue): MeasuredValue {
  if (value.unit === 'm_elevation_gain' || value.unit === 'm_elevation_loss') {
    return { ...value, amount: Math.round(value.amount / 10) * 10 };
  }
  return { ...value, amount: Math.round(value.amount * 10) / 10 };
}

// The per-day demand for one route dimension, or undefined when it can't
// honestly be stated: a multi-day goal whose day count is still empty has
// a route total but no typical day yet — never fall back to the total.
export function typicalDayValue(requirements: GoalRequirement[], kind: RouteKind): DayValue | undefined {
  const override = find(requirements, kind, true);
  if (override?.target) return { value: override.target, source: 'override' };

  const total = find(requirements, kind, false);
  if (!total?.target) return undefined;
  if (total.scope === 'SINGLE_EVENT') return { value: total.target, source: 'single_day' };

  const daysReq = eventDaysRequirement(requirements);
  if (!daysReq) {
    // No day count at all: a single-day goal — unless the longest stage
    // says it's multi-day, in which case the day count is simply missing.
    return isMultiDayGoal(requirements) ? undefined : { value: total.target, source: 'single_day' };
  }
  const days = daysReq.target?.amount;
  if (days === undefined || days <= 0) return undefined;
  if (days === 1) return { value: total.target, source: 'single_day' };
  return { value: roundForUnit({ ...total.target, amount: total.target.amount / days }), source: 'derived' };
}

export function routeTotal(requirements: GoalRequirement[], kind: RouteKind): MeasuredValue | undefined {
  return find(requirements, kind, false)?.target;
}

// For a continuous trip the longest stretch of consecutive days IS the
// whole trip — the wizard keeps consecutiveDays equal to eventDays then,
// this is the read side of that same rule.
export function longestStageDays(requirements: GoalRequirement[], execution: GoalExecution | undefined): number | undefined {
  if (execution === 'continuous') return eventDaysRequirement(requirements)?.target?.amount;
  return requirements.find((r) => r.kind === 'consecutiveDays')?.target?.amount;
}

// ASCEND_HEURISTIC(DIN-33466-WALKING-TIME): the standard German/Alpine-club
// walking-time rule — 4 km/h on the flat, 300 m/h up, 500 m/h down; the
// larger of horizontal and vertical time plus half of the smaller. Turns a
// typical hiking day (km + D+ + D-) into time on foot, so it can be
// compared with what training history actually records (duration in
// minutes) instead of a distance that time-based hiking evidence can never
// match. Not a personal prediction — a widely used signage norm,
// deliberately without pack/terrain correction.
export function estimatedHikingMinutes(distanceKm: number, elevationGainM = 0, elevationLossM = 0): number {
  const horizontalH = distanceKm / 4;
  const verticalH = elevationGainM / 300 + elevationLossM / 500;
  const hours = Math.max(horizontalH, verticalH) + Math.min(horizontalH, verticalH) / 2;
  return Math.round((hours * 60) / 5) * 5;
}

// Keeps a goal's route requirements internally consistent after every
// edit: for a continuous trip the longest stretch of consecutive days is
// the whole trip, so consecutiveDays mirrors eventDays (engine/demand.ts's
// multi-day line reads consecutiveDays only). A trip in stages keeps
// whatever longest stage the user entered.
export function normalizeRouteRequirements(requirements: GoalRequirement[], execution: GoalExecution | undefined): GoalRequirement[] {
  if (execution !== 'continuous') return requirements;
  const days = eventDaysRequirement(requirements)?.target;
  const others = requirements.filter((r) => r.kind !== 'consecutiveDays');
  if (!days) return others;
  const existing = requirements.find((r) => r.kind === 'consecutiveDays');
  return [...others, { id: existing?.id ?? makeId('req'), kind: 'consecutiveDays', scope: 'CONSECUTIVE_DAYS', target: { amount: days.amount, unit: 'days' } }];
}

// The sport a route goal is for — carried on its day-count requirement.
export function routeDiscipline(goal: Pick<TrainingGoal, 'requirements' | 'execution'>): string {
  return eventDaysRequirement(goal.requirements)?.discipline ?? goal.requirements.find((r) => r.discipline)?.discipline ?? 'hiking';
}

// A route goal can move on once the day count and distance are there and,
// for stages, a longest stage that fits inside the trip.
export function routeGoalComplete(goal: Pick<TrainingGoal, 'requirements' | 'execution'>): boolean {
  const days = eventDaysRequirement(goal.requirements)?.target?.amount;
  const distance = routeTotal(goal.requirements, 'distance')?.amount;
  if (!days || !distance) return false;
  if (goal.execution === 'stages') {
    const longest = goal.requirements.find((r) => r.kind === 'consecutiveDays')?.target?.amount;
    if (!longest || longest > days) return false;
  }
  return true;
}

