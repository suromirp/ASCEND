// ASCEND: the rows an older version left behind when you changed or removed a
// tocht (Doorloop, punt 1). Each tochtdag the tocht had placed itself became a
// skipped row without a mark, next to the new days, and one more with every
// change. Since then such a day goes off the plan with the tocht
// (PlanChangeItem.discard). This finds the rows already stored that way, so the
// planning run can take them off too.
//
// Only what is demonstrably such a row: never logged, skipped, without a mark,
// taken out by an accepted proposal of a period (engine/leaveProposal.ts) that
// cleared its mark, and placed earlier by an accepted proposal of that same
// period on that same day with that same training. A training another period
// placed on that day says nothing about this row. Anything else stays, also a skip of
// your own. Past rows without a log count too: they never were a training of
// yours, and as skipped rows they counted as not done.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';

const LEAVE_SOURCE = 'engine/leaveProposal.ts';
const LEAVE_TRIGGERS = new Set(['leave_added', 'leave_removed']);

// The period a proposal is about: its own field, or for an older stored
// proposal the marks on its items (a change of a tocht keeps the id of the
// tocht). An older removal has neither (all its marks were cleared): undefined.
function periodsOf(p: PlanChangeProposal): string[] | undefined {
  if (p.leavePeriodId) return [p.leavePeriodId];
  const ids = [...new Set(p.changes.map((c) => c.leave?.periodId).filter((id): id is string => !!id))];
  return ids.length > 0 ? ids : undefined;
}

export function strayTrekRows(sessions: PlannedSession[], proposals: PlanChangeProposal[], logs: SessionLog[]): string[] {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const leave = proposals.filter((p) => LEAVE_TRIGGERS.has(p.trigger) && p.resolution === 'accepted');
  const byId = new Map(leave.map((p) => [p.id, p]));
  // Days a period placed a training itself: "periodId templateId date".
  const placedAdds = leave.flatMap((p) => p.changes).filter((c) => c.action === 'add' && !c.plannedSessionId && c.newSessionDraft && c.leave?.role === 'placed');
  const placed = new Set(placedAdds.map((c) => `${c.leave!.periodId} ${c.newSessionDraft!.templateId} ${c.newSessionDraft!.scheduledDate}`));
  // Which periods placed something on "templateId date".
  const placers = new Map<string, Set<string>>();
  for (const c of placedAdds) {
    const key = `${c.newSessionDraft!.templateId} ${c.newSessionDraft!.scheduledDate}`;
    placers.set(key, (placers.get(key) ?? new Set()).add(c.leave!.periodId));
  }
  const out: string[] = [];
  for (const s of sessions) {
    if (s.status !== 'skipped' || s.leave || logged.has(s.id) || s.lock?.by !== 'proposal' || !s.lock.proposalId) continue;
    const by = byId.get(s.lock.proposalId);
    if (!by) continue;
    const removedHere = by.changes.some((c) => c.action === 'remove' && c.plannedSessionId === s.id && c.leave === null && (c.generatedBy ?? []).includes(LEAVE_SOURCE));
    if (!removedHere) continue;
    const periods = periodsOf(by);
    const day = `${s.templateId} ${s.scheduledDate}`;
    // Of the same period. An older removal names no period: then only when a
    // single period ever placed this training on this day, so it can only be
    // that one; with two, it is not demonstrable and the row stays.
    const same = periods ? periods.some((periodId) => placed.has(`${periodId} ${day}`)) : placers.get(day)?.size === 1;
    if (same) out.push(s.id);
  }
  return out;
}
