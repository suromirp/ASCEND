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

import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import { resolveHorizonZone, committedWeekStartDates } from './planningHorizon';
import { isDateAvailable } from './adaptiveReplanner';
import { resolveEffectiveStressProfile } from './stressProfile';
import { daysBetween, weekDates } from '../utils/dates';
import { makeId } from '../utils/id';

function isLegHeavyTemplate(template: SessionTemplate): boolean {
  return resolveEffectiveStressProfile(template).lowerBodyLoad === 'heavy';
}

function isSlotFree(sessions: PlannedSession[], date: string): boolean {
  return !sessions.some((s) => s.status !== 'skipped' && s.scheduledDate === date);
}

function wouldConflict(
  candidateDate: string,
  candidateTemplate: SessionTemplate,
  sessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
): boolean {
  if (!isLegHeavyTemplate(candidateTemplate)) return false;
  return sessions.some((s) => {
    if (s.status === 'skipped') return false;
    const other = templateById.get(s.templateId);
    if (!other || !isLegHeavyTemplate(other)) return false;
    return Math.abs(daysBetween(s.scheduledDate, candidateDate)) <= 1;
  });
}

// Only ever the first N ids the strategy lists (N = sessionsPerWeek),
// never a cross-week rotation — every worked example in the addendum (and
// the app's own current split) fits within one week with no template
// repeated inside it. A misconfigured sessionsPerWeek > available session
// types is clamped, never padded with an invented duplicate placement.
function targetTemplateIdsForWeek(strategy: StrengthProgramStrategy): string[] {
  return strategy.sessionTemplateIds.slice(0, Math.min(strategy.sessionsPerWeek, strategy.sessionTemplateIds.length));
}

interface WeekReconciliation {
  items: PlanChangeItem[];
  // Distinguished so the summary can tell the user the true reason nothing
  // was added: a week that's simply fully booked (every day already holds
  // some session — the normal state for every ASCEND week, forecast or
  // committed) is a different, more common situation than one where a free
  // day exists but placing there would violate the 48h leg-heavy rule. The
  // original single `unplaceable` boolean silently blamed the 48h rule for
  // both, which was actively misleading in the (far more common) fully-
  // booked case.
  noFreeDay: boolean;
  legHeavyConflict: boolean;
}

// The actual per-week reconciliation — shared by both the forecast-range
// entry point (computeStrengthPlacementPlan) and the committed-range one
// (computeStrengthPlacementPlanForCommittedRange). `protectedSessionIds` is
// how the committed-range caller keeps this from ever proposing to remove
// a session that's already been logged — the forecast range never needs
// it (nothing there can have happened yet), so it's passed as an empty set.
function reconcileWeek(
  weekStart: string,
  strategy: StrengthProgramStrategy,
  plannedSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  targetTemplateIds: string[],
  strategyTemplateIds: Set<string>,
  availability: TrainingAvailability,
  protectedSessionIds: Set<string>,
  source: string,
): WeekReconciliation {
  const items: PlanChangeItem[] = [];
  let noFreeDay = false;
  let legHeavyConflict = false;

  // A mutable per-week working snapshot so an item this same batch just
  // added/removed is immediately visible to the next placement's
  // occupancy/conflict checks — mirrors adaptiveReplanner.ts's own
  // `working` pattern for cascading proposeNoTimeToday changes.
  let weekSessions = plannedSessions.filter((s) => s.weekStartDate === weekStart);

  const strengthSessions = weekSessions.filter((s) => s.status !== 'skipped' && templateById.get(s.templateId)?.type === 'strength');
  const onStrategy = strengthSessions.filter((s) => strategyTemplateIds.has(s.templateId));
  const offStrategy = strengthSessions.filter((s) => !strategyTemplateIds.has(s.templateId) && !protectedSessionIds.has(s.id));

  for (const session of offStrategy) {
    const template = templateById.get(session.templateId);
    items.push({
      plannedSessionId: session.id,
      action: 'remove',
      fromDate: session.scheduledDate,
      toDate: session.scheduledDate,
      reason: `Krachtblok-plaatsing: ${template?.name ?? session.templateId} hoort niet meer bij het actieve krachtblok (${strategy.splitType}).`,
      generatedBy: [source],
    });
    weekSessions = weekSessions.map((s) => (s.id === session.id ? { ...s, status: 'skipped' as const } : s));
  }

  // A protected (already-logged) session still counts as "present" for this
  // template — never propose a duplicate placement on top of what already
  // happened.
  const presentTemplateIds = new Set(onStrategy.map((s) => s.templateId));
  const missingTemplateIds = targetTemplateIds.filter((id) => !presentTemplateIds.has(id));

  for (const templateId of missingTemplateIds) {
    const template = templateById.get(templateId);
    if (!template) continue; // strategy references a template that no longer exists — never invent a replacement

    const availableFreeDates = weekDates(weekStart).filter(
      (date) => isDateAvailable(date, availability) && isSlotFree(weekSessions, date),
    );
    const chosenDate = availableFreeDates.find((date) => !wouldConflict(date, template, weekSessions, templateById));
    if (!chosenDate) {
      // Every ASCEND week is always fully scheduled (7 sessions across 7
      // days) — an available, genuinely empty day essentially never exists.
      // Track that distinctly from "a free day existed but the 48h rule
      // blocked every one of them", so the summary never blames the 48h
      // rule for what's actually just a full week.
      if (availableFreeDates.length === 0) noFreeDay = true;
      else legHeavyConflict = true;
      continue; // no honest placement this week — never force an unavailable/conflicting slot
    }

    items.push({
      action: 'add',
      newSessionDraft: { templateId, scheduledDate: chosenDate, weekStartDate: weekStart },
      reason: `Krachtblok-plaatsing: ${template.name} toegevoegd volgens het actieve krachtblok (${strategy.sessionsPerWeek}x/week, ${strategy.splitType}).`,
      generatedBy: [source],
    });
    weekSessions = [
      ...weekSessions,
      { id: makeId('planned'), templateId, scheduledDate: chosenDate, weekStartDate: weekStart, status: 'planned' as const, order: weekSessions.length },
    ];
  }

  return { items, noFreeDay, legHeavyConflict };
}

function buildPlan(
  weekStarts: string[],
  strategy: StrengthProgramStrategy,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  availability: TrainingAvailability,
  protectedSessionIds: Set<string>,
  source: string,
  zoneLabel: 'forecast' | 'committed',
): PlanChangeProposal {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const strategyTemplateIds = new Set(strategy.sessionTemplateIds);
  const targetTemplateIds = targetTemplateIdsForWeek(strategy);

  const items: PlanChangeItem[] = [];
  // Tracked separately from `items` so the summary can honestly distinguish
  // "already matches" from "couldn't fully place the requested frequency" —
  // a week that's already too dense with leg-heavy sessions (other
  // disciplines included) to fit one more without breaking the 48h rule is
  // a real, silent gap the Plan Preview must surface, never a false "all
  // good" the moment nothing gets added.
  let noFreeDayWeekCount = 0;
  let legHeavyConflictWeekCount = 0;

  for (const weekStart of weekStarts) {
    const { items: weekItems, noFreeDay, legHeavyConflict } = reconcileWeek(
      weekStart,
      strategy,
      plannedSessions,
      templateById,
      targetTemplateIds,
      strategyTemplateIds,
      availability,
      protectedSessionIds,
      source,
    );
    items.push(...weekItems);
    if (noFreeDay) noFreeDayWeekCount++;
    if (legHeavyConflict) legHeavyConflictWeekCount++;
  }

  const unplaceableCount = noFreeDayWeekCount + legHeavyConflictWeekCount;
  const unplaceableParts: string[] = [];
  if (noFreeDayWeekCount > 0) {
    unplaceableParts.push(
      `in ${noFreeDayWeekCount} week(en) zit elke dag al vol met een andere sessie — er was geen vrije dag om de extra frequentie te plaatsen zonder een bestaande sessie te verplaatsen of te verwijderen`,
    );
  }
  if (legHeavyConflictWeekCount > 0) {
    unplaceableParts.push(
      `in ${legHeavyConflictWeekCount} week(en) kon de extra sessie niet geplaatst worden zonder de 48-uursregel voor zware beenbelasting te schenden`,
    );
  }
  const unplaceableNote = unplaceableParts.length > 0
    ? ` Let op: ${unplaceableParts.join('; ')} — dat is geen "geen wijzigingen nodig", maar een echte planningsgrens.`
    : '';

  const zoneNote = zoneLabel === 'forecast'
    ? 'Wordt toegepast op het forecast-bereik (week +2 en verder) na bevestiging — nooit op de huidige of volgende week.'
    : 'Past ook deze week en/of volgende week aan — sessies die al gepland staan maar niet bij het nieuwe krachtblok horen, worden verplaatst/verwijderd. Al gelogde sessies worden nooit aangepast.';

  return {
    id: makeId('planchange'),
    trigger: 'strength_program_changed',
    issue: items.length > 0 ? 'Krachtblok-plaatsing' : unplaceableCount > 0 ? 'Kon niet volledig plaatsen' : 'Geen aanpassingen nodig',
    changes: items,
    alternatives: [],
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
    'engine/strengthScheduling.ts#computeStrengthPlacementPlan',
    'forecast',
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
): PlanChangeProposal {
  const protectedSessionIds = new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));

  return buildPlan(
    committedWeekStartDates(asOf),
    strategy,
    plannedSessions,
    templates,
    availability,
    protectedSessionIds,
    'engine/strengthScheduling.ts#computeStrengthPlacementPlanForCommittedRange',
    'committed',
  );
}
