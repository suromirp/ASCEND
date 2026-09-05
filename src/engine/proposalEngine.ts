// ASCEND — Proposal Engine (Technical Architecture v0.3.1 REVISED, Phase 5).
//
// The central interaction layer for committed-range changes (engine module
// map): takes any EngineEvent + the ScheduleProposal produced by the
// existing, unchanged scheduler mechanics (proposeMove/proposeNoTimeToday/
// proposeSkip) and wraps it into a PlanChangeProposal — "PlanChangeProposal
// wraps their output, doesn't replace it." Never mutates storage itself
// (module map's own "Must NOT" column) — applyPlanChangeItems below is a
// pure transform over a PlannedSession[] snapshot; the caller persists.

import type { ScheduleProposal } from './scheduler';
import type { PlannedSession } from '../models/training';
import type { EngineEvent, PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { isDateInCommittedRange } from './planningHorizon';
import { makeId } from '../utils/id';

function scheduleChangeToPlanChangeItem(change: ScheduleProposal['changes'][number]): PlanChangeItem {
  return {
    plannedSessionId: change.sessionId,
    // A same-date change is how proposeSkip() represents a skip — the
    // session is removed from the active plan, never "moved" onto the
    // date it already occupied.
    action: change.toDate === change.fromDate ? 'remove' : 'move',
    fromDate: change.fromDate,
    toDate: change.toDate,
  };
}

// Enforces SYSTEM_INVARIANTS' 'confirmation_horizon_respected': a
// committed-range proposal is never allowed to reach into the forecast
// range. In practice scheduler.ts's own mechanics never produce such a
// change (proposeMove only ever searches within the same calendar week),
// so this is a defensive assertion, not a case expected to fire — but a
// silently-accepted out-of-range change would be exactly the kind of
// "invariant technically violated, nobody noticed" bug this module exists
// to prevent.
function assertCommittedRange(items: PlanChangeItem[], asOf: string): void {
  for (const item of items) {
    if (item.toDate && !isDateInCommittedRange(item.toDate, asOf)) {
      throw new Error(`Proposal Engine: change targets ${item.toDate}, outside the committed (current+next week) range — this belongs to the Adaptive Replanner instead.`);
    }
  }
}

export function wrapAsPlanChangeProposal(
  scheduleProposal: ScheduleProposal,
  trigger: EngineEvent,
  asOf: string,
): PlanChangeProposal {
  const changes = scheduleProposal.changes.map(scheduleChangeToPlanChangeItem);
  assertCommittedRange(changes, asOf);

  return {
    id: makeId('planchange'),
    trigger,
    issue: scheduleProposal.reason,
    changes,
    alternatives: [],
    consequences: scheduleProposal.resolved
      ? 'Wijziging wordt direct toegepast na bevestiging.'
      : 'Kon niet automatisch worden opgelost — controleer het schema handmatig.',
    explanation: scheduleProposal.reason,
    createdAt: new Date().toISOString(),
  };
}

// Applies a resolved proposal's changes to a PlannedSession[] snapshot,
// returning the next snapshot — pure, no IO. The caller (state/storage
// layer) persists only the rows that actually changed.
//
// 'keep' is a no-op by construction. 'add' creates a new row from
// newSessionDraft (idGenerator defaults to a real id when omitted — tests
// may inject a deterministic one). 'move'/'remove' update the matched row
// exactly like AppDataContext#applyProposal/applyNoTimeToday already do.
// 'replace'/'swap'/'reduce' are prescription-level concerns (they change
// what a session asks of you, never its date) — no TrainingPrescription
// writer/apply-mechanism exists yet (Phase 3 deliberately stopped at
// candidate prescriptions), so they're routed here for completeness but
// intentionally left as a no-op on PlannedSession[] itself.
export function applyPlanChangeItems(
  items: PlanChangeItem[],
  sessions: PlannedSession[],
  idGenerator: () => string = () => makeId('planned'),
): PlannedSession[] {
  let next = sessions;

  for (const item of items) {
    switch (item.action) {
      case 'keep':
      case 'replace':
      case 'swap':
      case 'reduce':
        break;
      case 'add': {
        if (!item.newSessionDraft) break;
        const created: PlannedSession = {
          id: idGenerator(),
          templateId: item.newSessionDraft.templateId,
          scheduledDate: item.newSessionDraft.scheduledDate,
          weekStartDate: item.newSessionDraft.weekStartDate,
          status: 'planned',
          order: next.length,
        };
        next = [...next, created];
        break;
      }
      case 'move': {
        if (!item.plannedSessionId || !item.toDate) break;
        next = next.map((s) =>
          s.id === item.plannedSessionId
            ? { ...s, scheduledDate: item.toDate as string, status: 'moved', movedFromDate: s.movedFromDate ?? item.fromDate }
            : s,
        );
        break;
      }
      case 'remove': {
        if (!item.plannedSessionId) break;
        next = next.map((s) => (s.id === item.plannedSessionId ? { ...s, status: 'skipped' } : s));
        break;
      }
    }
  }

  return next;
}
