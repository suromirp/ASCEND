// ASCEND — Schedule Anomaly Detection
//
// Detects clear, mechanical scheduling patterns that no thoughtful plan
// would produce on purpose — right now: multiple rest days landing back to
// back — and proposes a concrete fix through the same PlanChangeProposal/
// confirm flow every other planning engine already uses (never auto-
// applied). Deliberately narrow: only patterns unambiguous enough to name
// a confident fix for; anything requiring judgment about training intent
// stays a manual decision via the existing VERPLAATS action, never a
// guessed "fix" here.
//
// Committed range only (this week + next week, engine/planningHorizon.ts)
// — the two weeks a user is actually looking at day to day. The forecast
// range gets reconciled by other engines (Adaptive Replanner, Strength
// Scheduling) on their own regular passes, so a gap that far out is lower
// stakes and more likely to resolve itself before it matters.
//
// The fix itself is a SWAP, not a move-to-empty-day: every default week in
// this app schedules all 7 days, so a run trapped inside one already-full
// week (the normal case — verified against a live reproduction of the bug
// report below) would never find a genuinely empty destination to move
// into. Swapping the later rest day with the nearest non-rest day instead
// works within that reality, and reuses the 'swap' PlanChangeItem pair
// engine/proposalEngine.ts#applyPlanChangeItems already fully supports —
// never a new apply mechanism.
//
// Production bug report that prompted this: a schedule-content migration
// moved Herstel from Sunday to Monday, and the migration's own "never
// touch the committed range" boundary happened to land exactly between an
// old-pattern Sunday Herstel and a new-pattern Monday Herstel — two rest
// days back to back, invisible until the user noticed and asked "can
// ASCEND catch this and suggest a fix?".

import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { committedWeekStartDates } from './planningHorizon';
import { isDateAvailable } from './adaptiveReplanner';
import { resolveEffectiveStressProfile } from './stressProfile';
import { daysBetween, weekDates } from '../utils/dates';
import { makeId } from '../utils/id';

const MIN_CONSECUTIVE_REST_DAYS_TO_FLAG = 2;
// How far to look, in either direction, for a session to swap the extra
// rest day with — wide enough to reliably find a candidate without
// reaching into territory that no longer reads as "the same stretch of
// training."
const SWAP_SEARCH_WINDOW_DAYS = 10;

function isLegHeavyTemplate(template: SessionTemplate): boolean {
  return resolveEffectiveStressProfile(template).lowerBodyLoad === 'heavy';
}

// Would placing candidateTemplate on candidateDate put a leg-heavy session
// within 48h of another one already on the board (excluding the sessions
// this same swap is already moving)? Mirrors
// engine/strengthScheduling.ts#wouldConflict's own rule.
function wouldCreateLegHeavyConflict(
  candidateDate: string,
  candidateTemplate: SessionTemplate,
  sessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  excludeSessionIds: Set<string>,
): boolean {
  if (!isLegHeavyTemplate(candidateTemplate)) return false;
  return sessions.some((s) => {
    if (excludeSessionIds.has(s.id) || s.status === 'skipped') return false;
    const other = templateById.get(s.templateId);
    if (!other || !isLegHeavyTemplate(other)) return false;
    return Math.abs(daysBetween(s.scheduledDate, candidateDate)) <= 1;
  });
}

export interface ConsecutiveRestRun {
  sessions: PlannedSession[]; // the recovery-type PlannedSessions, in date order
}

// Finds runs of MIN_CONSECUTIVE_REST_DAYS_TO_FLAG+ consecutive calendar
// days, within the committed range, that are all recovery-type sessions.
// A run containing only already-logged sessions is never returned — moving
// something that already happened is never on the table.
export function detectConsecutiveRestDays(
  plannedSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  sessionLogs: SessionLog[],
  asOf: string,
): ConsecutiveRestRun[] {
  const loggedPlannedIds = new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const scanDates = committedWeekStartDates(asOf).flatMap((w) => weekDates(w));

  const byDate = new Map<string, PlannedSession>();
  for (const s of plannedSessions) {
    if (s.status === 'skipped') continue;
    if (scanDates.includes(s.scheduledDate)) byDate.set(s.scheduledDate, s);
  }

  const runs: ConsecutiveRestRun[] = [];
  let current: PlannedSession[] = [];
  for (const date of scanDates) {
    const s = byDate.get(date);
    if (s && templateById.get(s.templateId)?.type === 'recovery') {
      current.push(s);
    } else {
      if (current.length >= MIN_CONSECUTIVE_REST_DAYS_TO_FLAG) runs.push({ sessions: current });
      current = [];
    }
  }
  if (current.length >= MIN_CONSECUTIVE_REST_DAYS_TO_FLAG) runs.push({ sessions: current });

  return runs.filter((run) => run.sessions.some((s) => !loggedPlannedIds.has(s.id)));
}

// Builds one concrete proposal covering every flagged run: swaps the LAST
// (never-logged) rest day in each run with the nearest same-availability
// non-rest day that the swap wouldn't turn into a new leg-heavy conflict —
// never touching an already-logged session, never forcing a swap that
// trades one problem for another. A run with no honest swap partner is
// silently skipped (no forced placement), matching every other placement
// engine in this codebase.
export function buildConsecutiveRestFixProposal(
  runs: ConsecutiveRestRun[],
  plannedSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  availability: TrainingAvailability,
  sessionLogs: SessionLog[],
): PlanChangeProposal | null {
  const loggedPlannedIds = new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const byDate = new Map(plannedSessions.filter((s) => s.status !== 'skipped').map((s) => [s.scheduledDate, s]));
  const items: PlanChangeItem[] = [];

  for (const run of runs) {
    const moveable = [...run.sessions].reverse().find((s) => !loggedPlannedIds.has(s.id));
    if (!moveable) continue;

    const runSessionIds = new Set(run.sessions.map((s) => s.id));

    let partner: PlannedSession | undefined;
    for (let offset = 1; offset <= SWAP_SEARCH_WINDOW_DAYS && !partner; offset++) {
      for (const direction of [1, -1] as const) {
        const candidateDate = shiftDate(moveable.scheduledDate, offset * direction);
        const candidate = byDate.get(candidateDate);
        if (!candidate || runSessionIds.has(candidate.id) || loggedPlannedIds.has(candidate.id)) continue;
        const candidateTemplate = templateById.get(candidate.templateId);
        if (!candidateTemplate || candidateTemplate.type === 'recovery') continue; // swapping two rest days doesn't fix anything
        if (!isDateAvailable(moveable.scheduledDate, availability) || !isDateAvailable(candidate.scheduledDate, availability)) continue;
        if (wouldCreateLegHeavyConflict(moveable.scheduledDate, candidateTemplate, plannedSessions, templateById, new Set([moveable.id, candidate.id]))) continue;
        partner = candidate;
        break;
      }
    }
    if (!partner) continue;

    items.push(
      {
        plannedSessionId: moveable.id,
        action: 'swap',
        fromDate: moveable.scheduledDate,
        toDate: partner.scheduledDate,
        pairedWithSessionId: partner.id,
        reason: `${run.sessions.length} rustdagen op rij (${run.sessions[0].scheduledDate} t/m ${run.sessions[run.sessions.length - 1].scheduledDate}) — verwisseld met ${partner.scheduledDate}.`,
        generatedBy: ['engine/scheduleAnomalies.ts#buildConsecutiveRestFixProposal'],
      },
      {
        plannedSessionId: partner.id,
        action: 'swap',
        fromDate: partner.scheduledDate,
        toDate: moveable.scheduledDate,
        pairedWithSessionId: moveable.id,
        reason: `Ruimt plek voor Herstel op ${partner.scheduledDate}, om de rustdagenreeks op ${moveable.scheduledDate} te doorbreken.`,
        generatedBy: ['engine/scheduleAnomalies.ts#buildConsecutiveRestFixProposal'],
      },
    );
  }

  if (items.length === 0) return null;

  return {
    id: makeId('planchange'),
    trigger: 'schedule_anomaly_detected',
    issue: 'Meerdere rustdagen op rij gevonden',
    changes: items,
    alternatives: [],
    consequences: 'Verwisselt één van de rustdagen met de dichtstbijzijnde andere sessie — verder verandert er niets.',
    explanation: 'ASCEND controleert je actuele planning op patronen die waarschijnlijk niet bewust zo zijn ingepland.',
    createdAt: new Date().toISOString(),
  };
}

function shiftDate(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
