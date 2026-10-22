// ASCEND: the rows an older version left behind when you changed or removed a
// tocht (Doorloop, punt 1). Each tochtdag the tocht had placed itself became a
// skipped row without a mark, next to the new days, and one more with every
// change. Since then such a day goes off the plan with the tocht
// (PlanChangeItem.discard). This finds the rows already stored that way, so the
// planning run can take them off too.
//
// Only what is demonstrably such a row: never logged, skipped, without a mark,
// taken out by an accepted proposal of a period (engine/leaveProposal.ts) that
// cleared its mark, and placed earlier by an accepted proposal of a period on
// that same day with that same training. Anything else stays, also a skip of
// your own. Past rows without a log count too: they never were a training of
// yours, and as skipped rows they counted as not done.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';

const LEAVE_SOURCE = 'engine/leaveProposal.ts';
const LEAVE_TRIGGERS = new Set(['leave_added', 'leave_removed']);

export function strayTrekRows(sessions: PlannedSession[], proposals: PlanChangeProposal[], logs: SessionLog[]): string[] {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const leave = proposals.filter((p) => LEAVE_TRIGGERS.has(p.trigger) && p.resolution === 'accepted');
  const byId = new Map(leave.map((p) => [p.id, p]));
  // Days a period placed a training itself: "templateId date".
  const placed = new Set(
    leave.flatMap((p) => p.changes)
      .filter((c) => c.action === 'add' && !c.plannedSessionId && c.newSessionDraft && c.leave?.role === 'placed')
      .map((c) => `${c.newSessionDraft!.templateId} ${c.newSessionDraft!.scheduledDate}`),
  );
  const out: string[] = [];
  for (const s of sessions) {
    if (s.status !== 'skipped' || s.leave || logged.has(s.id) || s.lock?.by !== 'proposal' || !s.lock.proposalId) continue;
    const by = byId.get(s.lock.proposalId);
    if (!by) continue;
    const removedHere = by.changes.some((c) => c.action === 'remove' && c.plannedSessionId === s.id && c.leave === null && (c.generatedBy ?? []).includes(LEAVE_SOURCE));
    if (removedHere && placed.has(`${s.templateId} ${s.scheduledDate}`)) out.push(s.id);
  }
  return out;
}
