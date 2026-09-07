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
import type { GoalOverview } from './goalOverview';
import { resolveHorizonZone, committedWeekStartDates } from './planningHorizon';
import { isDateAvailable } from './adaptiveReplanner';
import { resolveEffectiveStressProfile } from './stressProfile';
import { requiredSpacingDays } from './scheduler';
import { resolveSessionContributions, type GoalDemand } from './sessionContribution';
import { computeDemand } from './demand';
import { daysBetween, weekDates } from '../utils/dates';
import { makeId } from '../utils/id';

function isLegHeavyTemplate(template: SessionTemplate): boolean {
  return resolveEffectiveStressProfile(template).lowerBodyLoad === 'heavy';
}

function isSlotFree(sessions: PlannedSession[], date: string): boolean {
  return !sessions.some((s) => s.status !== 'skipped' && s.scheduledDate === date);
}

// `recentLogs` lets an already-logged existing session widen its own
// required spacing when it was unusually heavy (engine/scheduler.ts's
// requiredSpacingDays, shared with the same load-aware-spacing rework
// there) — the candidate template being placed here is never itself
// logged yet (it doesn't exist), so only the OTHER (existing) session's
// own history can ever widen the gap.
function wouldConflict(
  candidateDate: string,
  candidateTemplate: SessionTemplate,
  sessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  recentLogs: SessionLog[] = [],
): boolean {
  if (!isLegHeavyTemplate(candidateTemplate)) return false;
  return sessions.some((s) => {
    if (s.status === 'skipped') return false;
    const other = templateById.get(s.templateId);
    if (!other || !isLegHeavyTemplate(other)) return false;
    const spacing = requiredSpacingDays(s.id, recentLogs);
    return Math.abs(daysBetween(s.scheduledDate, candidateDate)) <= spacing;
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

// ASCEND_HEURISTIC(SWAP-URGENCY-THRESHOLD, seeded this session from
// production feedback: "Ascend adviseert wat belangrijker is richting het
// doel, ook afhankelijk van hoe ver het doel is [...] als iets echt
// belangrijk is om te halen kan dat [...] dat mag ook een upper zijn met
// onderbouwing"). engine/demand.ts deliberately never produces a numeric
// CapabilityDemand for 'strength' itself (qualitative context, not a
// fabricated target — its own comment) — so there is no honest way to
// score the MISSING strength session against a goal the way an existing
// cardio/hiking session can be scored. Rather than invent that number,
// this only ranks the week's EXISTING swappable sessions by their own
// (honestly computable) goal relevance, and only actually proposes giving
// one up when that relevance is low enough — where "low enough" scales
// with how urgent/close the most-pressured active goal currently is.
const URGENT_GOAL_SWAP_THRESHOLD_PCT = 20;
const CALM_GOAL_SWAP_THRESHOLD_PCT = 0;

// Recovery days are never a candidate — injury-prevention/adherence value
// the goal-demand pipeline structurally can't see and never should
// override, unlike goal relevance itself. Hiking sessions used to be
// hard-protected here too ("core to ASCEND's own mountain adventure
// identity"), but production feedback pushed back on that: a hiking
// session that genuinely serves an active goal (e.g. GR5) already ranks
// high via resolveSessionContributions/Goal Focus below and so is
// protected in practice anyway — a session that DOESN'T currently link to
// any active goal's demand has no principled reason to be exempt from the
// same trade-off every other non-recovery session already faces. Letting
// the ranking decide (not a blanket type rule) is exactly what the user
// asked ASCEND to do: weigh "does the MacroFactor split stay fully intact"
// against "should another leg session yield instead", using real Goal
// Focus data rather than a hard-coded answer either way.
const SWAP_PROTECTED_TYPES = new Set(['recovery']);

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
// instead (the caller's own 48h leg-heavy check, `newTemplate`/`weekSessions`
// /`templateById`) — evaluated with the CANDIDATE'S OWN session excluded
// from that check each time, since a candidate can itself be leg-heavy
// (e.g. Heuvel-/Incline-Intervallen) and must never be treated as
// conflicting with its own removal.
function pickSwapCandidate(
  weekSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  targetTemplateIds: string[],
  protectedSessionIds: Set<string>,
  goalOverviews: GoalOverview[],
  newTemplate: SessionTemplate,
  sessionLogs: SessionLog[],
): SwapCandidate | null {
  const candidates = weekSessions.filter((s) => {
    if (s.status === 'skipped' || protectedSessionIds.has(s.id) || targetTemplateIds.includes(s.templateId)) return false;
    const template = templateById.get(s.templateId);
    return !!template && !SWAP_PROTECTED_TYPES.has(template.type);
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

  const threshold = isGoalUnderPressure(goalOverviews) ? URGENT_GOAL_SWAP_THRESHOLD_PCT : CALM_GOAL_SWAP_THRESHOLD_PCT;

  for (const candidate of ranked) {
    if (candidate.relevancePct > threshold) break; // ranked ascending — nothing after this qualifies either
    const otherSessions = weekSessions.filter((s) => s.id !== candidate.session.id);
    if (wouldConflict(candidate.session.scheduledDate, newTemplate, otherSessions, templateById, sessionLogs)) continue;

    const template = templateById.get(candidate.session.templateId);
    const name = template?.name ?? candidate.session.templateId;
    const reason = candidate.relevancePct === 0
      ? `${name} draagt momenteel niet aantoonbaar bij aan een actief doel — deze dag is vrijgemaakt voor de extra kracht-sessie.`
      : `${name} draagt het minst bij aan je actieve doelen van de sessies deze week (${Math.round(candidate.relevancePct)}% Goal Focus) — vrijgemaakt voor de extra kracht-sessie omdat een doel op dit moment onder druk staat of dichtbij is.`;
    return { session: candidate.session, reason };
  }

  return null;
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
  goalOverviews: GoalOverview[],
  sessionLogs: SessionLog[],
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
    let chosenDate = availableFreeDates.find((date) => !wouldConflict(date, template, weekSessions, templateById, sessionLogs));
    let swapCandidate: SwapCandidate | null = null;

    if (!chosenDate && availableFreeDates.length === 0) {
      // No genuinely empty day exists (the normal state for every ASCEND
      // week) — see if an existing, low-goal-relevance session is worth
      // giving up for this one instead of giving up outright.
      swapCandidate = pickSwapCandidate(
        weekSessions,
        templateById,
        targetTemplateIds,
        protectedSessionIds,
        goalOverviews,
        template,
        sessionLogs,
      );
      if (swapCandidate) chosenDate = swapCandidate.session.scheduledDate;
    }

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

    if (swapCandidate) {
      items.push({
        plannedSessionId: swapCandidate.session.id,
        action: 'remove',
        fromDate: swapCandidate.session.scheduledDate,
        toDate: swapCandidate.session.scheduledDate,
        reason: swapCandidate.reason,
        generatedBy: [source],
      });
      weekSessions = weekSessions.map((s) => (s.id === swapCandidate!.session.id ? { ...s, status: 'skipped' as const } : s));
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
  goalOverviews: GoalOverview[],
  sessionLogs: SessionLog[],
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
      goalOverviews,
      sessionLogs,
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
  goalOverviews: GoalOverview[],
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
  );
}
