// ASCEND — Proposal Engine (Technical Architecture v0.3.1 REVISED, Phase 5;
// extended Phase 6 for the forecast range).
//
// The central interaction layer for plan changes (engine module map): takes
// any EngineEvent + the ScheduleProposal produced by the existing,
// unchanged scheduler mechanics (proposeMove/proposeNoTimeToday/
// proposeSkip) and wraps it into a PlanChangeProposal — "PlanChangeProposal
// wraps their output, doesn't replace it." Never mutates storage itself
// (module map's own "Must NOT" column) — applyPlanChangeItems below is a
// pure transform over a PlannedSession[] snapshot; the caller persists.
// Phase 5 only ever wrapped committed-range changes; Phase 6's Adaptive
// Replanner reuses the exact same wrapper for the forecast range, so the
// zone the proposal must stay inside is now an explicit parameter rather
// than a hardcoded assumption.

import type { ScheduleProposal } from './scheduler';
import type { PlannedSession } from '../models/training';
import type { EngineEvent, PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { isDateInCommittedRange, isDateInForecastRange, type HorizonZone } from './planningHorizon';
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

// Enforces SYSTEM_INVARIANTS' 'confirmation_horizon_respected' in both
// directions: a committed-range proposal is never allowed to reach into
// the forecast range, and (Phase 6) a forecast-range proposal — the
// Adaptive Replanner's own output — is never allowed to silently reach
// back into the committed range, which is the Proposal Engine/user's
// territory alone. In practice scheduler.ts's own mechanics never produce
// a change outside the week they were asked about, so this is a defensive
// assertion, not a case expected to fire — but a silently-accepted
// out-of-zone change would be exactly the kind of "invariant technically
// violated, nobody noticed" bug this module exists to prevent.
function assertZone(items: PlanChangeItem[], zone: HorizonZone, asOf: string): void {
  const inZone = zone === 'committed' ? isDateInCommittedRange : isDateInForecastRange;
  for (const item of items) {
    if (item.toDate && !inZone(item.toDate, asOf)) {
      throw new Error(`Proposal Engine: change targets ${item.toDate}, outside the ${zone} range.`);
    }
  }
}

export function wrapAsPlanChangeProposal(
  scheduleProposal: ScheduleProposal,
  trigger: EngineEvent,
  zone: HorizonZone,
  asOf: string,
): PlanChangeProposal {
  const changes = scheduleProposal.changes.map(scheduleChangeToPlanChangeItem);
  assertZone(changes, zone, asOf);

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

export interface ApplyPlanChangeResult {
  // The next PlannedSession[] snapshot — pure, no IO. The caller persists
  // only the rows that actually changed.
  sessions: PlannedSession[];
  // 'replace'/'reduce' items — by the locked domain model (review point 5)
  // a TrainingPrescription relationship is one-directional, so these NEVER
  // mutate PlannedSession itself; that's correct, not a gap. But something
  // must still actually happen system-wide, or "supported" would just mean
  // "silently does nothing" under a different name — so these are handed
  // back for the caller to act on (engine/prescriptionWriter.ts + write the
  // referenced TrainingPrescription), never silently dropped here.
  prescriptionChanges: PlanChangeItem[];
  // Anything this function structurally cannot execute at all — e.g.
  // 'swap' has no second session id to pair with in this domain model, so
  // a bare 'swap' item can never be honored as a single PlanChangeItem (a
  // real swap must be expressed as two paired 'move' items instead, which
  // this function already fully supports). Surfaced so a caller can never
  // mistake "nothing happened" for "successfully applied".
  unsupported: PlanChangeItem[];
}

// 'keep' is a no-op by construction. 'add' creates a new row from
// newSessionDraft (idGenerator defaults to a real id when omitted — tests
// may inject a deterministic one). 'move'/'remove' update the matched row
// exactly like AppDataContext#applyProposal/applyNoTimeToday already do.
export function applyPlanChangeItems(
  items: PlanChangeItem[],
  sessions: PlannedSession[],
  idGenerator: () => string = () => makeId('planned'),
): ApplyPlanChangeResult {
  let next = sessions;
  const prescriptionChanges: PlanChangeItem[] = [];
  const unsupported: PlanChangeItem[] = [];

  for (const item of items) {
    switch (item.action) {
      case 'keep':
        break;
      case 'replace':
      case 'reduce':
        prescriptionChanges.push(item);
        break;
      case 'swap':
        unsupported.push(item);
        break;
      case 'add': {
        if (!item.newSessionDraft) {
          unsupported.push(item);
          break;
        }
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
        if (!item.plannedSessionId || !item.toDate) {
          unsupported.push(item);
          break;
        }
        next = next.map((s) =>
          s.id === item.plannedSessionId
            ? { ...s, scheduledDate: item.toDate as string, status: 'moved', movedFromDate: s.movedFromDate ?? item.fromDate }
            : s,
        );
        break;
      }
      case 'remove': {
        if (!item.plannedSessionId) {
          unsupported.push(item);
          break;
        }
        next = next.map((s) => (s.id === item.plannedSessionId ? { ...s, status: 'skipped' } : s));
        break;
      }
    }
  }

  return { sessions: next, prescriptionChanges, unsupported };
}
