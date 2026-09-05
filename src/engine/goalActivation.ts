// ASCEND — Goal Activation (Technical Architecture v0.3.1 REVISED, Phase 5,
// review point 11 — "Plan Preview → single activation transaction").
//
// Compute ONE GoalActivationPlan from a goal draft: Demand → Preparation
// Targets → Gaps → Feasibility → strategy options, plus a committed-range
// PlanChangeProposal and a summary-level forecast one, so the user reviews
// the exact same plan they later activate — never a silent re-analysis at
// confirm time (the inputStateHash below is what detects that).
//
// The user's explicit requirement this phase must preserve: INSUFFICIENT_DATA
// is a real blocker against unfounded goal-driven replanning. A goal may
// still be activated with no evidence yet (that's how evidence starts
// accumulating in the first place), but computeGoalActivationPlan below
// NEVER proposes a schedule change on behalf of a goal it has insufficient
// data about — committedWeekChanges.changes is unconditionally empty in
// that case, checked before any SessionContribution lookup even runs.

import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability, TrainingGuardrail } from '../models/goalEngineConfig';
import type { GoalActivationPlan, PlanChangeProposal } from '../models/planChange';
import { computeDemand } from './demand';
import { computeCapabilityEstimate } from './capability';
import { computeCapabilityGaps } from './gap';
import { computePreparationTargets } from './preparationTarget';
import { computeFeasibility } from './feasibility';
import { resolveSessionContributions } from './sessionContribution';
import { committedWeekStartDates } from './planningHorizon';
import { applyPlanChangeItems } from './proposalEngine';
import { daysBetween } from '../utils/dates';
import { makeId } from '../utils/id';

const STRATEGY_OPTIONS: GoalActivationPlan['strategyOptions'] = [
  { label: 'Conservatief', description: 'Vaker consolideren; voorkeur voor de lage kant van de bruikbare opbouw-range.' },
  { label: 'Gebalanceerd', description: 'Standaard: het midden van de bruikbare opbouw-range.' },
  { label: 'Agressief', description: 'Vaker de bovenkant van de bruikbare range — nooit een stille overschrijding van je ingestelde guardrails.' },
  { label: 'Aangepast', description: 'Later los instelbaar per stressor.' },
];

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function computeInputStateHash(inputs: {
  goalDraft: TrainingGoal;
  allEvidence: CapabilityEvidence[];
  plannedSessions: PlannedSession[];
}): string {
  const canonical = JSON.stringify({
    goal: {
      requirements: inputs.goalDraft.requirements,
      status: inputs.goalDraft.status,
      targetDate: inputs.goalDraft.status === 'active' ? inputs.goalDraft.targetDate : undefined,
    },
    evidence: [...inputs.allEvidence.map((e) => ({ id: e.id, date: e.date }))].sort((a, b) => a.id.localeCompare(b.id)),
    sessions: [...inputs.plannedSessions.map((s) => ({ id: s.id, date: s.scheduledDate, status: s.status }))].sort((a, b) => a.id.localeCompare(b.id)),
  });
  return djb2Hash(canonical);
}

export interface GoalActivationInputs {
  goalDraft: TrainingGoal;
  allEvidence: CapabilityEvidence[];
  availability: TrainingAvailability;
  guardrails: TrainingGuardrail[];
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  asOf: string;
}

export function computeGoalActivationPlan(inputs: GoalActivationInputs): GoalActivationPlan {
  const { goalDraft, allEvidence, availability, guardrails, plannedSessions, templates, asOf } = inputs;

  const demands = computeDemand(goalDraft.requirements);
  const estimates = demands.map((d) => computeCapabilityEstimate(d.key, allEvidence, asOf));
  const gaps = computeCapabilityGaps(demands, estimates);
  const preparationTargets = computePreparationTargets(demands);

  const weeksRemaining = goalDraft.status === 'active' ? Math.ceil(daysBetween(asOf, goalDraft.targetDate) / 7) : undefined;
  const feasibility = computeFeasibility({ goalId: goalDraft.id, gaps, weeksRemaining, availability, guardrails });

  const committedWeeks = committedWeekStartDates(asOf);
  const committedSessions = plannedSessions.filter((s) => committedWeeks.includes(s.weekStartDate) && s.status !== 'skipped');

  const committedWeekChanges: PlanChangeProposal = feasibility.status === 'insufficient_data'
    ? {
        id: makeId('planchange'),
        trigger: 'goal_created',
        issue: 'Onvoldoende evidence om verantwoord te plannen',
        changes: [],
        alternatives: [],
        consequences: 'Geen schemawijzigingen worden voorgesteld totdat er meer capability-evidence is voor dit doel.',
        explanation: feasibility.explanation,
        createdAt: new Date().toISOString(),
      }
    : buildCommittedWeekChanges(goalDraft, committedSessions, templates, demands.length > 0);

  const forecastChanges: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: 'goal_created',
    issue: 'Vervolgweken',
    changes: [],
    alternatives: [],
    consequences: 'Nog geen automatische aanpassingen — de Adaptive Replanner voor de forecast-periode is nog niet actief.',
    explanation: `Zodra er voldoende evidence en ruimte is, past een latere fase het schema vanaf twee weken verder geleidelijk aan (huidige status: ${feasibility.status}).`,
    createdAt: new Date().toISOString(),
  };

  return {
    id: makeId('activationplan'),
    goalDraft,
    preparationTargets,
    gaps,
    feasibility,
    strategyOptions: STRATEGY_OPTIONS,
    committedWeekChanges,
    forecastChanges,
    consequences: feasibility.status === 'insufficient_data'
      ? 'Dit doel wordt geactiveerd zonder schemawijzigingen totdat er meer evidence is.'
      : 'Bestaande sessies die al bijdragen blijven ongewijzigd; latere aanpassingen verschijnen als voorstel zodra dat nodig is.',
    computedAt: new Date().toISOString(),
    inputStateHash: computeInputStateHash({ goalDraft, allEvidence, plannedSessions }),
  };
}

// Only ever reached once feasibility has already cleared the
// insufficient_data check above — real demand exists and was actually
// assessed. Marks existing committed-range sessions that already serve
// this goal (via Phase 4's SessionContribution resolver) as 'keep' — a
// grounded, non-fabricated committed-range proposal: it reports what is
// genuinely already happening, never invents a new session (that stays
// the Adaptive Replanner's job, Phase 6).
function buildCommittedWeekChanges(
  goalDraft: TrainingGoal,
  committedSessions: PlannedSession[],
  templates: SessionTemplate[],
  hasDemand: boolean,
): PlanChangeProposal {
  const contributions = hasDemand
    ? resolveSessionContributions(committedSessions, templates, [{ goalId: goalDraft.id, demands: computeDemand(goalDraft.requirements) }])
    : [];

  const changes = contributions.map((c) => ({ plannedSessionId: c.plannedSessionId, action: 'keep' as const }));

  return {
    id: makeId('planchange'),
    trigger: 'goal_created',
    issue: changes.length > 0 ? 'Bestaande sessies die al bijdragen aan dit doel' : 'Geen bestaande sessies dragen nu al bij',
    changes,
    alternatives: [],
    consequences: changes.length > 0
      ? `${changes.length} geplande sessie(s) deze en volgende week dragen al bij aan dit doel en blijven ongewijzigd.`
      : 'Geen van de geplande sessies deze en volgende week draagt op dit moment al bij aan dit doel.',
    explanation: 'Gebaseerd op de bestaande sessie-inhoud (Session Contribution) — er wordt niets nieuws toegevoegd in deze fase.',
    createdAt: new Date().toISOString(),
  };
}

export function isGoalActivationPlanStale(plan: GoalActivationPlan, currentInputStateHash: string): boolean {
  return plan.inputStateHash !== currentInputStateHash;
}

export interface GoalActivationResult {
  applied: boolean;
  reason?: 'stale';
  updatedSessions?: PlannedSession[];
}

// The single-transaction activation flow (review point 11): the caller
// (state layer) is responsible for actually persisting goalDraft — this
// function only ever decides the schedule side, and only against the SAME
// plan the user was shown (never a silent re-analysis). Never special-
// cases feasibility here: committedWeekChanges.changes is already
// guaranteed empty for an insufficient_data plan, so the block on
// unfounded replanning is enforced once, at the source, not duplicated.
export function applyGoalActivationPlan(
  plan: GoalActivationPlan,
  currentInputStateHash: string,
  currentSessions: PlannedSession[],
): GoalActivationResult {
  if (isGoalActivationPlanStale(plan, currentInputStateHash)) {
    return { applied: false, reason: 'stale' };
  }
  // committedWeekChanges only ever contains 'keep' entries (built above) —
  // never 'replace'/'reduce'/'swap' — so prescriptionChanges/unsupported
  // are always empty here; the richer ApplyPlanChangeResult shape only
  // matters once the Adaptive Replanner (Phase 6) starts producing those.
  const { sessions: updatedSessions } = applyPlanChangeItems(plan.committedWeekChanges.changes, currentSessions);
  return { applied: true, updatedSessions };
}
