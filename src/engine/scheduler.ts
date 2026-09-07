import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import { addDays, daysBetween, mondayOfWeek, weekDates } from '../utils/dates';
import { resolveEffectiveStressProfile } from './stressProfile';
import { detectRecentSpike } from './progressionSpikes';

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
const INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS = new Set(['tpl_hill_intervals', 'tpl_long_run']);

export function isIntentionalBackToBack(templateIdA: string, templateIdB: string): boolean {
  return INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS.has(templateIdA) && INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS.has(templateIdB);
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
}

function templateName(templates: Map<string, SessionTemplate>, id: string): string {
  return templates.get(id)?.name ?? id;
}

function isSlotFree(sessions: PlannedSession[], date: string, excludeId: string): boolean {
  return !sessions.some((s) => s.id !== excludeId && s.status !== 'skipped' && s.scheduledDate === date);
}

function conflictsWith(
  candidateDate: string,
  candidateTemplateId: string,
  sessions: PlannedSession[],
  templates: Map<string, SessionTemplate>,
  excludeId: string,
  recentLogs: SessionLog[] = [],
): boolean {
  const candidateTemplate = templates.get(candidateTemplateId);
  if (!candidateTemplate || !isLegHeavyTemplate(candidateTemplate)) return false;
  return sessions.some((s) => {
    if (s.id === excludeId || s.status === 'skipped') return false;
    const other = templates.get(s.templateId);
    if (!other || !isLegHeavyTemplate(other)) return false;
    if (isIntentionalBackToBack(candidateTemplateId, s.templateId)) return false;
    const spacing = Math.max(requiredSpacingDays(excludeId, recentLogs), requiredSpacingDays(s.id, recentLogs));
    return Math.abs(daysBetween(s.scheduledDate, candidateDate)) <= spacing;
  });
}

// Proposes moving one session to a new date, cascading a single conflicting
// leg-heavy session out of the way within the same week if needed. Returns a
// proposal for the UI to confirm — nothing is mutated here.
export function proposeMove(
  weekSessions: PlannedSession[],
  templates: SessionTemplate[],
  sessionId: string,
  targetDate: string,
  recentLogs: SessionLog[] = [],
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
    if (isIntentionalBackToBack(session.templateId, s.templateId)) return false;
    const spacing = Math.max(requiredSpacingDays(sessionId, recentLogs), requiredSpacingDays(s.id, recentLogs));
    return Math.abs(daysBetween(s.scheduledDate, targetDate)) <= spacing;
  });

  if (!conflicting) {
    return { changes, reason: 'Geen conflicten gevonden.', resolved: true };
  }

  // Try to find the conflicting session a free, non-conflicting day within
  // the same calendar week, preferring later days first.
  const monday = mondayOfWeek(targetDate);
  const candidates = weekDates(monday).filter((d) => d !== conflicting.scheduledDate);
  const ordered = [...candidates.filter((d) => d > conflicting.scheduledDate), ...candidates.filter((d) => d < conflicting.scheduledDate).reverse()];

  const newSpot = ordered.find(
    (d) =>
      isSlotFree(simulated, d, conflicting.id) &&
      !conflictsWith(d, conflicting.templateId, simulated, templateMap, conflicting.id, recentLogs),
  );

  if (newSpot) {
    changes.push({
      sessionId: conflicting.id,
      templateId: conflicting.templateId,
      templateName: templateName(templateMap, conflicting.templateId),
      fromDate: conflicting.scheduledDate,
      toDate: newSpot,
    });
    return {
      changes,
      reason: `Behoudt 48 uur hersteltijd tussen beenbelasting: ${templateName(templateMap, conflicting.templateId)} schuift op.`,
      resolved: true,
    };
  }

  return {
    changes,
    reason: `Let op: ${templateName(templateMap, conflicting.templateId)} valt nu binnen 48 uur van een andere zware beensessie. Geen vrije dag gevonden om dit automatisch op te lossen.`,
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
export function proposeNoTimeToday(
  weekSessions: PlannedSession[],
  templates: SessionTemplate[],
  todayDate: string,
  recentLogs: SessionLog[] = [],
): ScheduleProposal[] {
  const todaysSessions = weekSessions.filter((s) => s.scheduledDate === todayDate && s.status !== 'skipped');
  const proposals: ScheduleProposal[] = [];
  let working = weekSessions;

  for (const session of todaysSessions) {
    const monday = mondayOfWeek(todayDate);
    const candidates = weekDates(monday).filter((d) => d !== todayDate && d > todayDate);
    const freeDay = candidates.find((d) => isSlotFree(working, d, session.id));
    if (freeDay) {
      const proposal = proposeMove(working, templates, session.id, freeDay, recentLogs);
      proposals.push(proposal);
      working = working.map((s) => {
        const change = proposal.changes.find((c) => c.sessionId === s.id);
        return change ? { ...s, scheduledDate: change.toDate } : s;
      });
    } else {
      proposals.push({
        changes: [{ sessionId: session.id, templateId: session.templateId, templateName: templateName(new Map(templates.map((t) => [t.id, t])), session.templateId), fromDate: todayDate, toDate: todayDate }],
        reason: 'Geen vrije dag meer deze week — sessie wordt overgeslagen.',
        resolved: false,
      });
    }
  }
  return proposals;
}

export { addDays };
