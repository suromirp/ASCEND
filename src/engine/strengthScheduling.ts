// ASCEND — Strength Scheduling (Strength Program Strategy Addendum v0.1
// §3, Phase 8).
//
// "ASCEND is the source of truth for WHEN a strength session is planned...
// the external workout app remains the source of truth for the exercise
// content." This module only ever decides PLACEMENT — which existing
// SessionTemplate (type: 'strength') occupies which date — never content:
// it emits 'add'/'remove' PlanChangeItems exclusively, the same fully-
// supported actions the rest of this codebase already applies via
// engine/proposalEngine.ts#applyPlanChangeItems. It never emits
// 'replace'/'reduce' (that would mean touching a TrainingPrescription for
// role/content, exactly what the Adaptive Replanner's own strength
// exclusion (engine/adaptiveReplanner.ts) exists to prevent for exactly
// this reason).
//
// Forecast range ONLY (week +2 onward, engine/planningHorizon.ts) —
// mirrors engine/goalActivation.ts's own committedWeekChanges, which never
// invents anything for the committed range either
// (SYSTEM_INVARIANTS: confirmation_horizon_respected). Triggered by an
// explicit strategy change (state/AppDataContext.tsx#activateStrengthProgram),
// never running continuously in the background the way the Adaptive
// Replanner does — a discrete "the split/frequency changed" event, not a
// generative "keep inventing new weeks forever" process.
//
// Weekly Prescription Builder architecture pass, Fase 3: the actual week-
// composition reconciliation mechanics (compare current composition to a
// target, emit add/remove, place via Groep C's searchWeeklyPlacement) were
// extracted to engine/weekReconciliation.ts as a discipline-agnostic
// ReconciliationTarget — this file now only builds that target from
// StrengthProgramStrategy and shapes the resulting PlanChangeProposal's
// strength-specific copy. Behavior-preserving by construction.

import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { TrainingAvailability, TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { GoalOverview } from './goalOverview';
import { resolveHorizonZone, committedWeekStartDates } from './planningHorizon';
import { reconcileWeeksComposition, type ReconciliationTarget } from './weekReconciliation';
import { makeId } from '../utils/id';

// Only ever the first N ids the strategy lists (N = sessionsPerWeek),
// never a cross-week rotation — every worked example in the addendum (and
// the app's own current split) fits within one week with no template
// repeated inside it. A misconfigured sessionsPerWeek > available session
// types is clamped, never padded with an invented duplicate placement.
function targetTemplateIdsForWeek(strategy: StrengthProgramStrategy): string[] {
  return strategy.sessionTemplateIds.slice(0, Math.min(strategy.sessionsPerWeek, strategy.sessionTemplateIds.length));
}

// ASCEND_HEURISTIC(SWAP-URGENCY-THRESHOLD, seeded this session from
// production feedback: "Ascend adviseert wat belangrijker is richting het
// doel, ook afhankelijk van hoe ver het doel is [...] als iets echt
// belangrijk is om te halen kan dat [...] dat mag ook een upper zijn met
// onderbouwing"). engine/demand.ts deliberately never produces a numeric
// CapabilityDemand for 'strength' itself (qualitative context, not a
// fabricated target — its own comment) — so there is no honest way to
// score the MISSING strength session against a goal the way an existing
// cardio/hiking session can be scored. Rather than invent that number,
// engine/weekReconciliation.ts only ranks the week's EXISTING swappable
// sessions by their own (honestly computable) goal relevance, and only
// actually proposes giving one up when that relevance is low enough —
// where "low enough" scales with how urgent/close the most-pressured
// active goal currently is.
// Exported so engine/weeklyPrescriptionEngine.ts (Fase 5) reuses the exact
// same threshold for its own ReconciliationTarget — never a second,
// disagreeing swap-urgency number.
export const URGENT_GOAL_SWAP_THRESHOLD_PCT = 20;
export const CALM_GOAL_SWAP_THRESHOLD_PCT = 0;

// Recovery days are never a candidate — injury-prevention/adherence value
// the goal-demand pipeline structurally can't see and never should
// override, unlike goal relevance itself. Hiking sessions used to be
// hard-protected here too ("core to ASCEND's own mountain adventure
// identity"), but production feedback pushed back on that: a hiking
// session that genuinely serves an active goal (e.g. GR5) already ranks
// high via resolveSessionContributions/Goal Focus and so is protected in
// practice anyway.
const SWAP_PROTECTED_TYPES = new Set(['recovery'] as const);

function buildReconciliationTarget(strategy: StrengthProgramStrategy, source: string): ReconciliationTarget {
  return {
    isInFamily: (_session, template) => template.type === 'strength',
    targetTemplateIds: targetTemplateIdsForWeek(strategy),
    removeReason: (template) => `Krachtblok-plaatsing: ${template.name} hoort niet meer bij het actieve krachtblok (${strategy.splitType}).`,
    addReason: (template) => `Krachtblok-plaatsing: ${template.name} toegevoegd volgens het actieve krachtblok (${strategy.sessionsPerWeek}x/week, ${strategy.splitType}).`,
    protectedTypes: SWAP_PROTECTED_TYPES,
    urgentSwapThresholdPct: URGENT_GOAL_SWAP_THRESHOLD_PCT,
    calmSwapThresholdPct: CALM_GOAL_SWAP_THRESHOLD_PCT,
    source,
  };
}

function buildPlan(
  weekStarts: string[],
  strategy: StrengthProgramStrategy,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  availability: TrainingAvailability,
  protectedSessionIds: Set<string>,
  goalOverviews: GoalOverview[],
  sessionLogs: SessionLog[],
  source: string,
  zoneLabel: 'forecast' | 'committed',
  program: Program | null | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'] | undefined,
): PlanChangeProposal {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const target = buildReconciliationTarget(strategy, source);

  const { items, alternatives, noFreeDayWeekCount } = reconcileWeeksComposition(
    weekStarts, target, plannedSessions, templateById, availability, protectedSessionIds, goalOverviews, sessionLogs, program, sameDayPairingPreference,
  );

  // Training-load overlap (lowerBodyLoad included) is a soft cost inside
  // searchWeeklyPlacement — it can make a placement 'compromised' (see the
  // "Let op: ..." prefix reconcileWeekComposition attaches per item in that
  // case), but it can never by itself make a week noFreeDay. So the only
  // thing that can legitimately drive this note is genuine hard-capacity
  // exhaustion (every day already booked, including the swap-a-session last
  // resort) — there is no second, load-driven unplaceable reason to report
  // here anymore.
  const unplaceableCount = noFreeDayWeekCount;
  const unplaceableNote = noFreeDayWeekCount > 0
    ? ` Let op: in ${noFreeDayWeekCount} week(en) zit elke dag al vol met een andere sessie — er was geen vrije dag om de extra frequentie te plaatsen zonder een bestaande sessie te verplaatsen of te verwijderen — dat is geen "geen wijzigingen nodig", maar een echte planningsgrens.`
    : '';

  const zoneNote = zoneLabel === 'forecast'
    ? 'Wordt toegepast op het forecast-bereik (week +2 en verder) na bevestiging — nooit op de huidige of volgende week.'
    : 'Past ook deze week en/of volgende week aan — sessies die al gepland staan maar niet bij het nieuwe krachtblok horen, worden verplaatst/verwijderd. Al gelogde sessies worden nooit aangepast.';

  return {
    id: makeId('planchange'),
    trigger: 'strength_program_changed',
    issue: items.length > 0 ? 'Krachtblok-plaatsing' : unplaceableCount > 0 ? 'Kon niet volledig plaatsen' : 'Geen aanpassingen nodig',
    changes: items,
    alternatives,
    consequences: items.length > 0
      ? `${zoneNote}${unplaceableNote}`
      : unplaceableCount > 0
        ? unplaceableNote.trim()
        : 'De betreffende week(en) komen al overeen met het actieve krachtblok.',
    explanation: `Gebaseerd op het actieve krachtblok (${strategy.sessionsPerWeek}x/week, ${strategy.splitType}) — MacroFactor Workouts blijft de inhoud van elke sessie bepalen.`,
    createdAt: new Date().toISOString(),
  };
}

// Computes the forecast-range reconciliation for ONE active strategy
// against the sessions that already exist there (Phase 8 never generates
// brand-new weeks beyond what's already scheduled — only which template
// occupies which day within them). Idempotent: a week that already matches
// the strategy produces no items for that week at all, so re-running this
// against an unchanged strategy is a no-op, never accumulating churn.
export function computeStrengthPlacementPlan(
  strategy: StrengthProgramStrategy,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  availability: TrainingAvailability,
  asOf: string,
  goalOverviews: GoalOverview[],
  program?: Program | null,
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'],
): PlanChangeProposal {
  const forecastWeekStarts = [
    ...new Set(
      plannedSessions
        .filter((s) => resolveHorizonZone(s.weekStartDate, asOf) === 'forecast')
        .map((s) => s.weekStartDate),
    ),
  ].sort();

  return buildPlan(
    forecastWeekStarts,
    strategy,
    plannedSessions,
    templates,
    availability,
    new Set(),
    goalOverviews,
    [], // forecast weeks are, by definition (week +2 onward), never logged yet
    'engine/strengthScheduling.ts#computeStrengthPlacementPlan',
    'forecast',
    program,
    sameDayPairingPreference,
  );
}

// The explicit, user-requested opt-in this week/next week variant — never
// called automatically. By default a krachtblok change only ever reaches
// the forecast range (computeStrengthPlacementPlan above); this exists
// purely so the wizard can offer "apply it sooner" as a deliberate, clearly
// separate action, with its own confirm step, rather than silently folding
// committed-range changes into the same always-applied plan. An already-
// logged session (sessionLogs) is always excluded from removal — the one
// thing this must never do, even when explicitly asked to touch the
// committed range.
export function computeStrengthPlacementPlanForCommittedRange(
  strategy: StrengthProgramStrategy,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  availability: TrainingAvailability,
  sessionLogs: SessionLog[],
  asOf: string,
  goalOverviews: GoalOverview[],
  program?: Program | null,
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'],
): PlanChangeProposal {
  const protectedSessionIds = new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));

  return buildPlan(
    committedWeekStartDates(asOf),
    strategy,
    plannedSessions,
    templates,
    availability,
    protectedSessionIds,
    goalOverviews,
    sessionLogs,
    'engine/strengthScheduling.ts#computeStrengthPlacementPlanForCommittedRange',
    'committed',
    program,
    sameDayPairingPreference,
  );
}
