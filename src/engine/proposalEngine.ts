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
import type { PlanLock, PlannedSession, SessionTemplate } from '../models/training';
import type { EngineEvent, PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { isDateInCommittedRange, isDateInForecastRange, type HorizonZone } from './planningHorizon';
import { makeId } from '../utils/id';
import { weekCandidatesToAlternatives } from './candidatePlacement';
import { mondayOfWeek } from '../utils/dates';

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
  // Groep C, Fase 8 — nodig om searchWeeklyPlacement's overlevende
  // alternatieven (scheduleProposal.alternatives) terug te vertalen naar
  // sjabloonnamen voor PlanChangeAlternative. Ontbreekt (undefined) op elke
  // bestaande call site die dit nog niet doorgeeft — dan blijft
  // alternatives leeg, exact het oude gedrag, nooit een crash.
  templateById?: Map<string, SessionTemplate>,
): PlanChangeProposal {
  const changes = scheduleProposal.changes.map(scheduleChangeToPlanChangeItem);
  assertZone(changes, zone, asOf);

  const weekStartDate = changes[0]?.toDate ?? asOf;
  const alternatives = scheduleProposal.alternatives && templateById
    ? weekCandidatesToAlternatives(
        scheduleProposal.alternatives,
        (sessionOrDraft) => {
          // De alternatieve kandidaten dragen alleen sessionId's, geen
          // sjabloon-informatie direct — zoek de sjabloon van de
          // overeenkomstige plaatsing in scheduleProposal.changes op via de
          // sessionId, met een fallback op de eerste change (single-session
          // cascade, het enige huidige aanroepgeval van dit veld).
          const match = scheduleProposal.changes.find((c) => c.sessionId === sessionOrDraft);
          const templateId = match?.templateId ?? scheduleProposal.changes[0]?.templateId;
          return templateId ? templateById.get(templateId) : undefined;
        },
        weekStartDate,
      )
    : [];

  return {
    id: makeId('planchange'),
    trigger,
    issue: scheduleProposal.reason,
    changes,
    alternatives,
    consequences: scheduleProposal.resolved
      ? 'Wijziging wordt direct toegepast na bevestiging.'
      : 'Kon niet automatisch worden opgelost, controleer het schema handmatig.',
    explanation: scheduleProposal.reason,
    createdAt: new Date().toISOString(),
  };
}

// A period of free days or a holiday (models/leave.ts) put its mark on the
// item: it goes on the session, `null` takes an earlier mark off.
function withLeave(session: PlannedSession, item: PlanChangeItem): PlannedSession {
  if (item.leave === undefined) return session;
  const next = { ...session };
  if (item.leave === null) delete next.leave;
  else next.leave = item.leave;
  return next;
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
  // Anything this function structurally cannot execute at all — e.g. a
  // 'swap' item with no pairedWithSessionId, or one whose named partner
  // isn't present/doesn't mirror it back. Surfaced so a caller can never
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
  // An accepted proposal: what it moves, adds or keeps is fixed in place.
  lock?: PlanLock,
): ApplyPlanChangeResult {
  const locked = lock ? { lock } : {};
  let next = sessions;
  const prescriptionChanges: PlanChangeItem[] = [];
  const unsupported: PlanChangeItem[] = [];

  for (const item of items) {
    switch (item.action) {
      case 'keep':
        // A session the proposal shows unchanged ("Benen A erna") is part
        // of what you agreed to.
        if (lock && item.plannedSessionId) next = next.map((s) => (s.id === item.plannedSessionId ? { ...s, lock } : s));
        break;
      case 'replace':
      case 'reduce':
        prescriptionChanges.push(item);
        break;
      case 'swap': {
        // A genuine swap is always two items, each naming the other via
        // pairedWithSessionId, each already carrying its own new toDate
        // (the partner's original date) — never inferred here. Anything
        // less (no partner named, or the named partner isn't present or
        // doesn't mirror back) can't be honored as a swap at all.
        if (!item.plannedSessionId || !item.toDate || !item.pairedWithSessionId) {
          unsupported.push(item);
          break;
        }
        const partner = items.find(
          (other) => other.action === 'swap' && other.plannedSessionId === item.pairedWithSessionId && other.pairedWithSessionId === item.plannedSessionId,
        );
        if (!partner || !partner.toDate) {
          unsupported.push(item);
          break;
        }
        next = next.map((s) =>
          s.id === item.plannedSessionId
            ? withLeave({ ...s, scheduledDate: item.toDate as string, weekStartDate: mondayOfWeek(item.toDate as string), status: 'moved', movedFromDate: s.movedFromDate ?? item.fromDate, ...(item.plannedMinutes ? { plannedMinutes: item.plannedMinutes } : {}), ...locked }, item)
            : s,
        );
        break;
      }
      case 'add': {
        if (!item.newSessionDraft) {
          unsupported.push(item);
          break;
        }
        // An 'add' that names a row of a session that was let go: that row
        // itself comes back on the plan (planned again, on the new day, mark
        // and old move gone), instead of a second row next to the skipped one.
        const draft = item.newSessionDraft;
        const named = item.plannedSessionId ? next.find((s) => s.id === item.plannedSessionId) : undefined;
        // The named row is not skipped any more (it came back some other way):
        // a second row next to it would be a double, so this cannot be done.
        if (item.plannedSessionId && (!named || named.status !== 'skipped')) {
          unsupported.push(item);
          break;
        }
        const revived = named;
        if (revived) {
          next = next.map((s) => {
            if (s !== revived) return s;
            // Back where the system had it: not fixed in place, so a later
            // change of the same period can move it again (with its own proposal).
            const back: PlannedSession = { ...s, status: 'planned', scheduledDate: draft.scheduledDate, weekStartDate: draft.weekStartDate };
            delete back.movedFromDate;
            delete back.lock;
            return withLeave(back, item);
          });
          break;
        }
        const created: PlannedSession = {
          id: idGenerator(),
          templateId: item.newSessionDraft.templateId,
          scheduledDate: item.newSessionDraft.scheduledDate,
          weekStartDate: item.newSessionDraft.weekStartDate,
          status: 'planned',
          order: next.length,
          ...locked,
          ...(item.leave ? { leave: item.leave } : {}),
        };
        next = [...next, created];
        break;
      }
      case 'move': {
        if (!item.plannedSessionId || !item.toDate) {
          unsupported.push(item);
          break;
        }
        // A restore (a tocht changed back or removed) puts the session back as the
        // system had it: planned, not fixed in place, no fixed length.
        if (item.restore) {
          next = next.map((s) => {
            if (s.id !== item.plannedSessionId) return s;
            const back: PlannedSession = { ...s, scheduledDate: item.toDate as string, weekStartDate: mondayOfWeek(item.toDate as string), status: 'planned' };
            delete back.lock;
            delete back.movedFromDate;
            delete back.plannedMinutes;
            if (item.plannedMinutes) back.plannedMinutes = item.plannedMinutes;
            return withLeave(back, item);
          });
          break;
        }
        next = next.map((s) =>
          s.id === item.plannedSessionId
            ? withLeave({ ...s, scheduledDate: item.toDate as string, weekStartDate: mondayOfWeek(item.toDate as string), status: 'moved', movedFromDate: s.movedFromDate ?? item.fromDate, ...(item.plannedMinutes ? { plannedMinutes: item.plannedMinutes } : {}), ...locked }, item)
            : s,
        );
        break;
      }
      case 'remove': {
        if (!item.plannedSessionId) {
          unsupported.push(item);
          break;
        }
        // A session a period placed itself goes with the period: off the plan.
        if (item.discard) {
          next = next.filter((s) => s.id !== item.plannedSessionId);
          break;
        }
        next = next.map((s) => (s.id === item.plannedSessionId ? withLeave({ ...s, status: 'skipped', ...locked }, item) : s));
        break;
      }
    }
  }

  return { sessions: next, prescriptionChanges, unsupported };
}
