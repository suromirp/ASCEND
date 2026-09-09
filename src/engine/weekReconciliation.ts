// ASCEND — Week composition reconciliation (Weekly Prescription Builder
// architecture pass, Fase 3).
//
// Extracted from engine/strengthScheduling.ts#reconcileWeek/buildPlan —
// that module was already, structurally, exactly the pattern a Weekly
// Prescription Builder needs downstream: compare a week's current session-
// template composition against a target composition, emit 'add'/'remove'
// PlanChangeItems for the delta, and place the adds via
// engine/candidatePlacement.ts#searchWeeklyPlacement (Groep C's beam
// search, scored not first-fit). It was hardcoded to strength only — this
// file generalizes it behind a ReconciliationTarget so any "family" of
// session templates (strength via StrengthProgramStrategy, or a Weekly
// Prescription Line's own candidateTemplateIds) can reuse the identical
// mechanics. engine/strengthScheduling.ts now only builds a
// ReconciliationTarget from StrengthProgramStrategy and delegates here —
// behavior-preserving by construction (strengthScheduling.test.ts runs
// unmodified and must keep passing).

import type { PlannedSession, SessionTemplate, SessionLog, SessionType } from '../models/training';
import type { Program } from '../models/program';
import type { TrainingAvailability, TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { PlanChangeAlternative, PlanChangeItem } from '../models/planChange';
import type { GoalOverview } from './goalOverview';
import { isDateAvailable } from './adaptiveReplanner';
import { dayHasRoomFor } from './scheduler';
import { resolveSessionContributions, type GoalDemand } from './sessionContribution';
import { computeDemand } from './demand';
import { weekDates } from '../utils/dates';
import { makeId } from '../utils/id';
import { searchWeeklyPlacement, keyForPlacementRequest, weekCandidatesToAlternatives, type PlacementRequest } from './candidatePlacement';

function isGoalUnderPressure(overviews: GoalOverview[]): boolean {
  return overviews.some(
    (o) => o.feasibility.status === 'challenging' || o.feasibility.status === 'unlikely' || o.focus.reasons.some((r) => r.component === 'phase'),
  );
}

interface SwapCandidate {
  session: PlannedSession;
  reason: string;
}

// Ranks the week's non-protected, off-target sessions by goal relevance
// (lowest first) and returns the first one both under the urgency-scaled
// threshold and usable on its own date for the template being placed there
// instead — evaluated with the CANDIDATE'S OWN session excluded from that
// check each time, since a candidate can itself be leg-heavy and must
// never be treated as conflicting with its own removal.
//
// Groep C invariant: the only thing that may veto a swap day is the same
// HARD gate everything else in this file uses — dayHasRoomFor (real
// availability/time-budget). Training-load overlap (lowerBodyLoad and
// every other axis in candidatePlacement.ts#LOAD_AXIS_CONFIG) is soft
// everywhere, including here — it was never this function's job to
// second-guess candidatePlacement.ts's own scoring with a parallel,
// binary "kan niet"-rule.
function pickSwapCandidate(
  weekSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  targetTemplateIds: string[],
  protectedSessionIds: Set<string>,
  protectedTypes: Set<SessionType>,
  urgentThresholdPct: number,
  calmThresholdPct: number,
  goalOverviews: GoalOverview[],
  newTemplate: SessionTemplate,
  program: Program | null | undefined,
  dailyTimeBudget: TrainingAvailability['dailyTimeBudget'] | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'] | undefined,
): SwapCandidate | null {
  const candidates = weekSessions.filter((s) => {
    if (s.status === 'skipped' || protectedSessionIds.has(s.id) || targetTemplateIds.includes(s.templateId)) return false;
    const template = templateById.get(s.templateId);
    return !!template && !protectedTypes.has(template.type);
  });
  if (candidates.length === 0) return null;

  const goalDemands: GoalDemand[] = goalOverviews.map((o) => ({ goalId: o.goal.id, demands: computeDemand(o.goal.requirements) }));
  const focusById = new Map(goalOverviews.map((o) => [o.goal.id, o.focus]));
  const contributions = resolveSessionContributions(candidates, [...templateById.values()], goalDemands);

  const ranked = candidates
    .map((session) => {
      const goalIds = contributions.filter((c) => c.plannedSessionId === session.id).map((c) => c.goalId);
      const relevancePct = goalIds.reduce((sum, goalId) => sum + (focusById.get(goalId)?.normalizedPct ?? 0), 0);
      return { session, relevancePct };
    })
    .sort((a, b) => a.relevancePct - b.relevancePct || a.session.scheduledDate.localeCompare(b.session.scheduledDate));

  const threshold = isGoalUnderPressure(goalOverviews) ? urgentThresholdPct : calmThresholdPct;

  for (const candidate of ranked) {
    if (candidate.relevancePct > threshold) break; // ranked ascending — nothing after this qualifies either
    const otherSessions = weekSessions.filter((s) => s.id !== candidate.session.id);
    if (!dayHasRoomFor(candidate.session.scheduledDate, newTemplate, otherSessions, templateById, program, dailyTimeBudget, sameDayPairingPreference)) continue;

    const template = templateById.get(candidate.session.templateId);
    const name = template?.name ?? candidate.session.templateId;
    const reason = candidate.relevancePct === 0
      ? `${name} draagt momenteel niet aantoonbaar bij aan een actief doel — deze dag is vrijgemaakt.`
      : `${name} draagt het minst bij aan je actieve doelen van de sessies deze week (${Math.round(candidate.relevancePct)}% Goal Focus) — vrijgemaakt omdat een doel op dit moment onder druk staat of dichtbij is.`;
    return { session: candidate.session, reason };
  }

  return null;
}

// What one caller (strengthScheduling.ts, or the Weekly Prescription
// Builder) considers "this week's desired composition" — every strategy-
// specific/goal-specific concern lives here, never inside
// reconcileWeekComposition itself.
export interface ReconciliationTarget {
  // Which of this week's existing sessions belong to the "family" being
  // reconciled at all. strengthScheduling.ts passes
  // (s,t) => t.type === 'strength'; the Weekly Prescription Builder passes
  // (s,t) => candidateTemplateIds.includes(t.id) per line.
  isInFamily: (session: PlannedSession, template: SessionTemplate) => boolean;
  targetTemplateIds: string[]; // desired composition this week, priority order
  removeReason: (template: SessionTemplate) => string;
  addReason: (template: SessionTemplate) => string; // compromised-prefix, if any, is prepended by the caller of reconcileWeekComposition
  protectedTypes: Set<SessionType>; // never a swap candidate, regardless of relevance
  urgentSwapThresholdPct: number;
  calmSwapThresholdPct: number;
  source: string; // PlanChangeItem.generatedBy value
}

export interface WeekReconciliation {
  items: PlanChangeItem[];
  // True only when hard capacity (availability + dayHasRoomFor, including
  // the swap-a-low-relevance-session last resort) genuinely proves there
  // was no valid day left this week. Training-load overlap (lowerBodyLoad
  // included) is a soft cost handled entirely inside searchWeeklyPlacement
  // — it can make a placement 'compromised', but it can never by itself be
  // the reason noFreeDay is true.
  noFreeDay: boolean;
  // The overlevende, niet-gekozen complete weekkandidaten uit de batch
  // searchWeeklyPlacement-aanroep, direct herbruikbaar als
  // PlanChangeProposal.alternatives. Empty when the batch wasn't used
  // (unplaceable/search-limited fell back to the per-template loop) or no
  // alternatives survived.
  alternatives: PlanChangeAlternative[];
}

// The actual per-week reconciliation. `protectedSessionIds` is how a
// committed-range caller keeps this from ever proposing to remove a
// session that's already been logged.
export function reconcileWeekComposition(
  weekStart: string,
  target: ReconciliationTarget,
  plannedSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  availability: TrainingAvailability,
  protectedSessionIds: Set<string>,
  goalOverviews: GoalOverview[],
  sessionLogs: SessionLog[],
  program: Program | null | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'] | undefined,
): WeekReconciliation {
  const items: PlanChangeItem[] = [];
  let noFreeDay = false;
  let alternatives: PlanChangeAlternative[] = [];

  // A mutable per-week working snapshot so an item this same batch just
  // added/removed is immediately visible to the next placement's
  // occupancy/conflict checks.
  let weekSessions = plannedSessions.filter((s) => s.weekStartDate === weekStart);

  // Shared by the batch searchWeeklyPlacement call below AND the
  // per-template fallback loop — ONE hard-availability definition, reused
  // rather than reimplemented per call site. Closes over `weekSessions`
  // (the mutable let above) by reference, so it always sees the latest
  // working snapshot at call time, not a stale copy from when the factory
  // ran.
  const hardValidDatesProviderFor = (keyToTemplate: Map<string, SessionTemplate>) =>
    (template: SessionTemplate, tentativePlacements: { sessionOrDraft: string; date: string }[]) => {
      const tentativeAsSessions: PlannedSession[] = tentativePlacements.map((p, i) => ({
        id: p.sessionOrDraft,
        templateId: keyToTemplate.get(p.sessionOrDraft)?.id ?? p.sessionOrDraft,
        scheduledDate: p.date,
        weekStartDate: weekStart,
        status: 'planned' as const,
        order: 1000 + i,
      }));
      return weekDates(weekStart).filter(
        (date) =>
          isDateAvailable(date, availability) &&
          dayHasRoomFor(date, template, [...weekSessions, ...tentativeAsSessions], templateById, program, availability.dailyTimeBudget, sameDayPairingPreference),
      );
    };

  const familySessions = weekSessions.filter((s) => {
    if (s.status === 'skipped') return false;
    const template = templateById.get(s.templateId);
    return !!template && target.isInFamily(s, template);
  });
  const onTarget = familySessions.filter((s) => target.targetTemplateIds.includes(s.templateId));
  const offTarget = familySessions.filter((s) => !target.targetTemplateIds.includes(s.templateId) && !protectedSessionIds.has(s.id));

  for (const session of offTarget) {
    const template = templateById.get(session.templateId);
    items.push({
      plannedSessionId: session.id,
      action: 'remove',
      fromDate: session.scheduledDate,
      toDate: session.scheduledDate,
      reason: template ? target.removeReason(template) : `${session.templateId} hoort niet meer bij de gewenste samenstelling.`,
      generatedBy: [target.source],
    });
    weekSessions = weekSessions.map((s) => (s.id === session.id ? { ...s, status: 'skipped' as const } : s));
  }

  // A protected (already-logged) session still counts as "present" for
  // this template — never propose a duplicate placement on top of what
  // already happened.
  const presentTemplateIds = new Set(onTarget.map((s) => s.templateId));
  const missingTemplateIds = target.targetTemplateIds.filter((id) => !presentTemplateIds.has(id));

  // All missing templates are first optimized TOGETHER via
  // searchWeeklyPlacement (Groep C) — this is where the real win is:
  // multiple sessions scored jointly against a complete week candidate
  // instead of placed one at a time, greedily. Only when the FULL batch
  // can't be placed in one go (unplaceable/search-limited) does this fall
  // back to the original per-template loop below (including the swap
  // fallback), so each template still gets an individual chance instead of
  // the whole batch silently giving up.
  const missingTemplates = missingTemplateIds
    .map((id) => templateById.get(id))
    .filter((t): t is SessionTemplate => !!t);

  let templatesForIndividualPass = missingTemplates;

  if (missingTemplates.length > 0) {
    const toPlace: PlacementRequest[] = missingTemplates.map((template) => ({ template, source: 'strength-missing' }));
    const keyToTemplate = new Map(toPlace.map((req, i) => [keyForPlacementRequest(req, i), req.template]));

    // No per-session Goal Focus weight known generically here (the caller
    // may supply one via a future extension) — every session to place
    // weighs equally, same as strengthScheduling.ts's own behavior today.
    const sessionPriorityWeightById = new Map<string, number>();

    const result = searchWeeklyPlacement(toPlace, weekSessions, hardValidDatesProviderFor(keyToTemplate), templateById, sessionLogs, sessionPriorityWeightById);

    if (result.status === 'clean' || result.status === 'compromised') {
      templatesForIndividualPass = [];
      const compromisedPrefix = result.status === 'compromised' ? `Let op: ${result.compromisedReason} ` : '';
      alternatives = weekCandidatesToAlternatives(result.alternatives, (sessionOrDraft) => keyToTemplate.get(sessionOrDraft), weekStart);

      const newSessionIds = result.bestFound.placements.map((p, i) => ({ placement: p, id: makeId('planned'), index: i }));
      for (const { placement, id } of newSessionIds) {
        const template = keyToTemplate.get(placement.sessionOrDraft);
        if (!template) continue;
        const existingOnDate = weekSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate === placement.date).map((s) => s.id);
        const siblingNewIds = newSessionIds.filter((o) => o.placement.date === placement.date && o.id !== id).map((o) => o.id);
        const coPlacedWithSessionIds = [...existingOnDate, ...siblingNewIds];
        items.push({
          action: 'add',
          newSessionDraft: { templateId: template.id, scheduledDate: placement.date, weekStartDate: weekStart },
          reason: `${compromisedPrefix}${target.addReason(template)}`,
          generatedBy: [target.source],
          coPlacedWithSessionIds: coPlacedWithSessionIds.length > 0 ? coPlacedWithSessionIds : undefined,
        });
      }
      const addedSessions: PlannedSession[] = [];
      for (const { placement, id, index } of newSessionIds) {
        const template = keyToTemplate.get(placement.sessionOrDraft);
        if (!template) continue;
        addedSessions.push({ id, templateId: template.id, scheduledDate: placement.date, weekStartDate: weekStart, status: 'planned', order: weekSessions.length + index });
      }
      weekSessions = [...weekSessions, ...addedSessions];
    }
    // status === 'unplaceable' | 'search-limited': templatesForIndividualPass
    // stays the full missingTemplates list — fall back to the per-template
    // loop below.
  }

  // Reached only when the joint batch above couldn't place everything —
  // each remaining template still gets its own individual chance, via the
  // SAME single source of truth (searchWeeklyPlacement) rather than a
  // second, parallel placement rule. A single-item toPlace batch degrades
  // to exactly "find a hard-valid day with the lowest load-overlap cost",
  // which is what this loop needs.
  for (const template of templatesForIndividualPass) {
    const templateId = template.id;

    const toPlace: PlacementRequest[] = [{ template, source: 'strength-missing' }];
    const keyToTemplate = new Map(toPlace.map((req, i) => [keyForPlacementRequest(req, i), req.template]));
    const sessionPriorityWeightById = new Map<string, number>();
    const result = searchWeeklyPlacement(toPlace, weekSessions, hardValidDatesProviderFor(keyToTemplate), templateById, sessionLogs, sessionPriorityWeightById);

    if (result.status === 'clean' || result.status === 'compromised') {
      const compromisedPrefix = result.status === 'compromised' ? `Let op: ${result.compromisedReason} ` : '';
      const placement = result.bestFound.placements[0];
      const chosenDate = placement.date;
      const existingOnDate = weekSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate === chosenDate).map((s) => s.id);
      items.push({
        action: 'add',
        newSessionDraft: { templateId, scheduledDate: chosenDate, weekStartDate: weekStart },
        reason: `${compromisedPrefix}${target.addReason(template)}`,
        generatedBy: [target.source],
        coPlacedWithSessionIds: existingOnDate.length > 0 ? existingOnDate : undefined,
      });
      weekSessions = [
        ...weekSessions,
        { id: makeId('planned'), templateId, scheduledDate: chosenDate, weekStartDate: weekStart, status: 'planned' as const, order: weekSessions.length },
      ];
      continue;
    }

    // status === 'unplaceable' | 'search-limited' — no hard-valid day exists
    // (or the search couldn't find one, but a feasibility check didn't rule
    // it out either way; either way this template gets no day for free). See
    // if an existing, low-goal-relevance session is worth giving up for this
    // one instead of giving up outright — still gated purely by the same
    // hard dayHasRoomFor check (pickSwapCandidate), never by load overlap.
    const swapCandidate = pickSwapCandidate(
      weekSessions,
      templateById,
      target.targetTemplateIds,
      protectedSessionIds,
      target.protectedTypes,
      target.urgentSwapThresholdPct,
      target.calmSwapThresholdPct,
      goalOverviews,
      template,
      program,
      availability.dailyTimeBudget,
      sameDayPairingPreference,
    );

    if (!swapCandidate) {
      // Both the direct search and the swap fallback failed to find any
      // hard-valid day — this is a genuine hard-capacity exhaustion, never
      // a load-overlap veto (that can only ever produce 'compromised'
      // above, handled before this point is ever reached).
      noFreeDay = true;
      continue; // no honest placement this week — never force an unavailable slot
    }

    items.push({
      plannedSessionId: swapCandidate.session.id,
      action: 'remove',
      fromDate: swapCandidate.session.scheduledDate,
      toDate: swapCandidate.session.scheduledDate,
      reason: swapCandidate.reason,
      generatedBy: [target.source],
    });
    weekSessions = weekSessions.map((s) => (s.id === swapCandidate.session.id ? { ...s, status: 'skipped' as const } : s));

    items.push({
      action: 'add',
      newSessionDraft: { templateId, scheduledDate: swapCandidate.session.scheduledDate, weekStartDate: weekStart },
      reason: target.addReason(template),
      generatedBy: [target.source],
    });
    weekSessions = [
      ...weekSessions,
      { id: makeId('planned'), templateId, scheduledDate: swapCandidate.session.scheduledDate, weekStartDate: weekStart, status: 'planned' as const, order: weekSessions.length },
    ];
  }

  return { items, noFreeDay, alternatives };
}

export interface WeeksReconciliation {
  items: PlanChangeItem[];
  alternatives: PlanChangeAlternative[];
  noFreeDayWeekCount: number;
}

// The weekly-loop mechanics shared by any caller reconciling multiple
// weeks against the same ReconciliationTarget shape — strengthScheduling.ts's
// own PlanChangeProposal shaping (issue/consequences/explanation/trigger
// text) stays there, since that's strategy-specific copy, not mechanics.
export function reconcileWeeksComposition(
  weekStarts: string[],
  target: ReconciliationTarget,
  plannedSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  availability: TrainingAvailability,
  protectedSessionIds: Set<string>,
  goalOverviews: GoalOverview[],
  sessionLogs: SessionLog[],
  program: Program | null | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'] | undefined,
): WeeksReconciliation {
  const items: PlanChangeItem[] = [];
  const alternatives: PlanChangeAlternative[] = [];
  let noFreeDayWeekCount = 0;

  for (const weekStart of weekStarts) {
    const week = reconcileWeekComposition(
      weekStart, target, plannedSessions, templateById, availability, protectedSessionIds, goalOverviews, sessionLogs, program, sameDayPairingPreference,
    );
    items.push(...week.items);
    alternatives.push(...week.alternatives);
    if (week.noFreeDay) noFreeDayWeekCount++;
  }

  return { items, alternatives, noFreeDayWeekCount };
}
