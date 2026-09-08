import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { addDays, daysBetween, mondayOfWeek, weekDates, weekdayOf } from '../utils/dates';
import { resolveEffectiveStressProfile } from './stressProfile';
import { detectRecentSpike } from './progressionSpikes';
import { resolveEffectiveFullDuration } from './substitutions';
import { searchWeeklyPlacement, type PlacementRequest, type WeekPlacementCandidate } from './candidatePlacement';

// ASCEND's scheduling engine is deterministic on purpose (spec §16, §29):
// it never guesses and it never runs an LLM in the loop. A future AI layer
// may translate free-text ("I only have 30 minutes Wednesday") into
// constraints, but every constraint still flows through the plain functions
// below. UI components call these functions and render their output — they
// never re-implement the rules themselves.
//
// V1 enforces one rule concretely: two "leg-heavy" sessions should not land
// within 48 hours of each other. Sports-science review (Fase 2, September
// 2026) refined this in two ways:
// 1. Leg-heaviness is now read through resolveEffectiveStressProfile()
//    (engine/stressProfile.ts) — the same source strengthScheduling.ts
//    already used — instead of a separately-maintained hardcoded template-id
//    set that had quietly drifted out of sync (tpl_hill_intervals and
//    tpl_long_run are both lowerBodyLoad:'heavy' in data/defaultProgram.ts,
//    but were never in the old set).
// 2. The 1-calendar-day minimum stays the conservative default, but widens
//    to 2 days when either session's own logged data shows it was unusually
//    heavy (a single-session spike per engine/progressionSpikes.ts, or a
//    logged RPE >= 9) — a normal/moderate leg day still only needs the
//    original 1-day gap.
//
// Other rules from the brief (avoid stacking too many high-load days,
// preserve optional sessions last, etc.) are documented here as the natural
// next additions but are not yet enforced — see README "Roadmap".

export function isLegHeavyTemplate(template: SessionTemplate): boolean {
  return resolveEffectiveStressProfile(template).lowerBodyLoad === 'heavy';
}

// data/defaultProgram.ts deliberately schedules Saturday's hill intervals
// and Sunday's long run back-to-back with no 48h gap between them ("Bewust
// een aaneengesloten, zwaar weekend... omdat dat 'op vermoeide benen'
// trainen hier het punt is, niet een fout") — both templates are
// lowerBodyLoad:'heavy', so without this explicit exception the unified
// leg-heavy check above would now flag that intentional pairing as a
// conflict. Only exempts these two FROM EACH OTHER — either one still
// conflicts normally with any other leg-heavy session (e.g. tpl_lower_a).
//
// Time-budget scheduling redesign (Fase 2): the hardcoded
// INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS set this used to be is now data —
// SessionTemplate.pairingOverride (models/training.ts) — instead of code,
// so a future intentional exception never again needs a scheduler.ts edit.
// Checked on either side (an override is only ever asserted from one
// template about a specific other one, never assumed symmetric).
export function isIntentionalBackToBack(templateA: SessionTemplate, templateB: SessionTemplate): boolean {
  return (
    !!templateA.pairingOverride?.some((o) => o.withTemplateId === templateB.id && o.verdict === 'prefer') ||
    !!templateB.pairingOverride?.some((o) => o.withTemplateId === templateA.id && o.verdict === 'prefer')
  );
}

// ASCEND_HEURISTIC(LOAD-AWARE-SPACING): the reviewed evidence supports
// ~48-72h for heavy/damaging lower-body work but only ~24-48h for a
// light/moderate, well-tolerated one — a single flat number can't represent
// both. This widens the minimum gap to 2 calendar days only when a
// session's own log shows it was unusually heavy (a logged RPE >= 9, or it
// was itself a single-session spike per engine/progressionSpikes.ts against
// its own prior baseline); otherwise the original 1-day minimum applies. A
// session with no log yet (nothing has happened there) always uses the
// conservative 1-day default — never assumed heavy in advance.
export function requiredSpacingDays(sessionId: string, recentLogs: SessionLog[]): number {
  const ownLog = recentLogs.find((l) => l.plannedSessionId === sessionId);
  if (!ownLog) return 1;
  if (ownLog.rpe !== undefined && ownLog.rpe >= 9) return 2;
  // Candidate-first, matching detectRecentSpike's own contract; it filters
  // the rest to the 30 days strictly before the candidate itself, so exact
  // ordering of the remainder doesn't matter here.
  const rest = recentLogs.filter((l) => l !== ownLog);
  return detectRecentSpike([ownLog, ...rest]).detected ? 2 : 1;
}

export interface ScheduleChange {
  sessionId: string;
  templateId: string;
  templateName: string;
  fromDate: string;
  toDate: string;
}

export interface ScheduleProposal {
  changes: ScheduleChange[];
  reason: string;
  resolved: boolean;
  // Groep C, Fase 8 — overlevende, niet-gekozen complete weekkandidaten uit
  // searchWeeklyPlacement's cascade-aanroep, direct herbruikbaar door
  // engine/proposalEngine.ts#wrapAsPlanChangeProposal via
  // candidatePlacement.ts#weekCandidatesToAlternatives. Leeg wanneer er geen
  // cascade nodig was (geen conflict) of geen alternatieven overleefden.
  alternatives?: WeekPlacementCandidate[];
}

function templateName(templates: Map<string, SessionTemplate>, id: string): string {
  return templates.get(id)?.name ?? id;
}

// ASCEND_HEURISTIC(TIME-BUDGET-SCHEDULING): time-budget scheduling redesign
// (production feedback: "1 trainingsdag = 1 training" was too rigid for
// anyone combining strength + running + hiking). Replaces the boolean
// "is this date already occupied" gate with a richer question: does this
// date have enough remaining time budget for one more session. Two
// independent, never-merged concerns feed the final answer — the caller's
// `sameDayPairingPreference` (a pure user preference, checked first,
// short-circuits everything else) and the day's own `DailyTimeBudget` (an
// objective practical constraint) — this function never reasons about
// recovery/training load at all; that stays engine/scheduler.ts's own
// separate leg-heavy check (requiredSpacingDays above, and Groep C's soft
// candidatePlacement.ts scoring),
// queried independently by the same callers.
//
// No budget configured for this weekday (the honest default until a
// Settings UI exists to set one, or for any day the user never filled in)
// never fabricates a ceiling — falls back to the original "only when
// genuinely empty" behavior, deferring entirely to the leg-heavy/
// interference checks for safety instead of a guessed time constraint.
export function dayHasRoomFor(
  date: string,
  candidateTemplate: SessionTemplate,
  weekSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  program: Program | null | undefined,
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'] = 'automatic',
): boolean {
  const existing = weekSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate === date);

  if (sameDayPairingPreference === 'never') {
    return existing.length === 0;
  }

  const budget = dailyTimeBudget?.[weekdayOf(date)];
  if (!budget) {
    return existing.length === 0;
  }

  const existingMinutes = existing.reduce((sum, s) => {
    const template = templateById.get(s.templateId);
    return template ? sum + resolveEffectiveFullDuration(template, date, program) : sum;
  }, 0);
  const candidateMinutes = resolveEffectiveFullDuration(candidateTemplate, date, program);
  const totalMinutes = existingMinutes + candidateMinutes;

  if (budget.hardMaximumMinutes !== undefined && totalMinutes > budget.hardMaximumMinutes) {
    return false;
  }

  // 'only_if_useful': pairing is allowed, but only within the plain
  // preferred budget (no soft-flex overshoot) — a stricter margin than
  // 'automatic'/'always', since this mode means "only pair when there's
  // truly no better option", not "pair whenever it roughly fits".
  const ceiling = sameDayPairingPreference === 'only_if_useful' && existing.length > 0
    ? budget.preferredMinutes
    : budget.preferredMinutes + budget.softFlexMinutes;
  return totalMinutes <= ceiling;
}

// Proposes moving one session to a new date, cascading a single conflicting
// leg-heavy session out of the way within the same week if needed. Returns a
// proposal for the UI to confirm — nothing is mutated here.
//
// Time-budget scheduling redesign (Fase 3): the cascade search's free-day
// gate is dayHasRoomFor (budget-aware) rather than the plain isSlotFree —
// the trailing three params are optional and default to the exact old
// "only when genuinely empty" behavior (dayHasRoomFor's own fallback when no
// budget is configured), so every existing caller that doesn't pass them is
// unaffected.
export function proposeMove(
  weekSessions: PlannedSession[],
  templates: SessionTemplate[],
  sessionId: string,
  targetDate: string,
  recentLogs: SessionLog[] = [],
  program?: Program | null,
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>,
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'],
): ScheduleProposal {
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const session = weekSessions.find((s) => s.id === sessionId);
  if (!session) return { changes: [], reason: 'Sessie niet gevonden.', resolved: false };

  const changes: ScheduleChange[] = [
    {
      sessionId: session.id,
      templateId: session.templateId,
      templateName: templateName(templateMap, session.templateId),
      fromDate: session.scheduledDate,
      toDate: targetDate,
    },
  ];

  // Simulate the week after this move.
  const simulated = weekSessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: targetDate } : s));

  const movedTemplate = templateMap.get(session.templateId);
  const conflicting = simulated.find((s) => {
    if (s.id === sessionId || s.status === 'skipped') return false;
    if (!movedTemplate || !isLegHeavyTemplate(movedTemplate)) return false;
    const other = templateMap.get(s.templateId);
    if (!other || !isLegHeavyTemplate(other)) return false;
    if (isIntentionalBackToBack(movedTemplate, other)) return false;
    const spacing = Math.max(requiredSpacingDays(sessionId, recentLogs), requiredSpacingDays(s.id, recentLogs));
    return Math.abs(daysBetween(s.scheduledDate, targetDate)) <= spacing;
  });

  if (!conflicting) {
    return { changes, reason: 'Geen conflicten gevonden.', resolved: true };
  }

  // Groep C, Fase 7: in plaats van de eerste vrije, niet-conflicterende dag
  // te pakken (first-fit), scoort searchWeeklyPlacement alle kandidaatdagen
  // voor de conflicterende sessie en kiest de beste — met een expliciete
  // compromised/unplaceable-uitkomst wanneer geen enkele dag goed genoeg is,
  // i.p.v. stilzwijgend de eerste conflictloze dag te accepteren.
  //
  // `fixedExistingSessions` sluit de conflicterende sessie zelf uit
  // (correctheidseis, Fase 7): hij mag nooit tegelijk op zijn oude datum
  // aanwezig zijn terwijl searchWeeklyPlacement een nieuwe datum voor hem
  // zoekt — anders ontstaat een self-conflict.
  const conflictingTemplate = templateMap.get(conflicting.templateId);
  if (!conflictingTemplate) {
    return {
      changes,
      reason: `Let op: ${templateName(templateMap, conflicting.templateId)} valt nu te dicht op een andere zware beensessie. Geen vrije dag gevonden om dit automatisch op te lossen.`,
      resolved: false,
    };
  }

  const fixedExistingSessions = simulated.filter((s) => s.id !== conflicting.id);
  const toPlace: PlacementRequest[] = [{ template: conflictingTemplate, source: 'cascade', sessionId: conflicting.id }];
  const monday = mondayOfWeek(targetDate);

  const hardValidDatesProvider = (template: SessionTemplate, tentativePlacements: { sessionOrDraft: string; date: string }[]) => {
    const tentativeAsSessions: PlannedSession[] = tentativePlacements.map((p, i) => ({
      id: p.sessionOrDraft,
      templateId: template.id,
      scheduledDate: p.date,
      weekStartDate: monday,
      status: 'planned' as const,
      order: 1000 + i,
    }));
    return weekDates(monday).filter(
      (d) =>
        d !== conflicting.scheduledDate &&
        dayHasRoomFor(d, template, [...fixedExistingSessions, ...tentativeAsSessions], templateMap, program, dailyTimeBudget, sameDayPairingPreference),
    );
  };

  const result = searchWeeklyPlacement(toPlace, fixedExistingSessions, hardValidDatesProvider, templateMap, recentLogs, new Map());

  if (result.status === 'clean' || result.status === 'compromised') {
    const newSpot = result.bestFound.placements[0]?.date;
    if (newSpot) {
      changes.push({
        sessionId: conflicting.id,
        templateId: conflicting.templateId,
        templateName: templateName(templateMap, conflicting.templateId),
        fromDate: conflicting.scheduledDate,
        toDate: newSpot,
      });
    }
    const alternatives = result.alternatives;
    const reason = result.status === 'compromised'
      ? `Let op: ${result.compromisedReason} ${templateName(templateMap, conflicting.templateId)} schuift op naar de minst slechte optie.`
      : `Probeert zware beenbelasting over meerdere dagen te spreiden en niet te dicht op elkaar te plannen: ${templateName(templateMap, conflicting.templateId)} schuift op.`;
    return { changes, reason, resolved: true, alternatives };
  }

  return {
    changes,
    reason: `Let op: ${templateName(templateMap, conflicting.templateId)} valt nu binnen de gewenste hersteltijd van een andere zware beensessie. Geen vrije dag gevonden om dit automatisch op te lossen.`,
    resolved: false,
  };
}

export function skipSession(session: PlannedSession): PlannedSession {
  return { ...session, status: 'skipped' };
}

// Phase 5 ("skipSession folded into the same pattern" — Technical
// Architecture v0.3.1 REVISED): skipSession() itself stays the underlying
// mutator, unchanged; this is the missing ScheduleProposal-producing
// sibling proposeMove() already has, so a skip goes through the same
// confirm-before-applying UI instead of mutating instantly and silently.
// A same-date change (toDate === fromDate) is how a skip is represented —
// engine/proposalEngine.ts and AppDataContext#applyProposal both already
// read that shape to mean "skip", matching proposeNoTimeToday's fallback.
export function proposeSkip(session: PlannedSession, templates: SessionTemplate[]): ScheduleProposal {
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  return {
    changes: [{
      sessionId: session.id,
      templateId: session.templateId,
      templateName: templateName(templateMap, session.templateId),
      fromDate: session.scheduledDate,
      toDate: session.scheduledDate,
    }],
    reason: 'Sessie wordt overgeslagen.',
    resolved: true,
  };
}

// "Geen tijd vandaag" — try to move every one of today's sessions to the
// next free day this week; falls back to skip if the week is full.
//
// Time-budget scheduling redesign (Fase 3): same dayHasRoomFor rewiring and
// backward-compatible optional trailing params as proposeMove above.
export function proposeNoTimeToday(
  weekSessions: PlannedSession[],
  templates: SessionTemplate[],
  todayDate: string,
  recentLogs: SessionLog[] = [],
  program?: Program | null,
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>,
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'],
): ScheduleProposal[] {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const todaysSessions = weekSessions.filter((s) => s.scheduledDate === todayDate && s.status !== 'skipped');
  const proposals: ScheduleProposal[] = [];
  let working = weekSessions;

  for (const session of todaysSessions) {
    const monday = mondayOfWeek(todayDate);
    const candidates = weekDates(monday).filter((d) => d !== todayDate && d > todayDate);
    const candidateTemplate = templateById.get(session.templateId);
    const freeDay = candidates.find(
      (d) => !candidateTemplate || dayHasRoomFor(d, candidateTemplate, working, templateById, program, dailyTimeBudget, sameDayPairingPreference),
    );
    if (freeDay) {
      const proposal = proposeMove(working, templates, session.id, freeDay, recentLogs, program, dailyTimeBudget, sameDayPairingPreference);
      proposals.push(proposal);
      working = working.map((s) => {
        const change = proposal.changes.find((c) => c.sessionId === s.id);
        return change ? { ...s, scheduledDate: change.toDate } : s;
      });
    } else {
      proposals.push({
        changes: [{ sessionId: session.id, templateId: session.templateId, templateName: templateName(templateById, session.templateId), fromDate: todayDate, toDate: todayDate }],
        reason: 'Geen vrije dag meer deze week — sessie wordt overgeslagen.',
        resolved: false,
      });
    }
  }
  return proposals;
}

export { addDays };
