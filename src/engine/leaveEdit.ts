// ASCEND: bijwerken van een vrije periode, een vakantie of een tocht in Week
// (docs/beslissingen/2026-11-01-vakantie-bijwerken.md). Andere data of een andere
// soort raakt de planning: dat is één voorstel met Akkoord via
// engine/leaveProposal.ts#planLeaveChange met `replaces`, dezelfde weg als een
// tocht die je wijzigt. Alleen een andere notitie raakt de planning niet en mag
// direct bewaard worden, met Ongedaan maken.
//
// Pure: no React, no IndexedDB.

import type { LeaveKind, LeavePeriod } from '../models/leave';

export type LeaveEditScope = 'none' | 'note' | 'plan';

export interface LeaveEditDraft {
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  note: string;
}

const cleanNote = (note: string | undefined) => (note ?? '').trim();

// What the edit touches: nothing, only the note, or the planning.
export function leaveEditScope(before: LeavePeriod, after: LeavePeriod): LeaveEditScope {
  if (before.kind !== after.kind || before.startDate !== after.startDate || before.endDate !== after.endDate) return 'plan';
  return cleanNote(before.note) === cleanNote(after.note) ? 'none' : 'note';
}

// The period as it will be: the same id, so what it moved, let go or placed is
// found again. The details of a tocht stay only while it stays a tocht.
export function editedPeriod(before: LeavePeriod, draft: LeaveEditDraft): LeavePeriod {
  const note = cleanNote(draft.note);
  const next: LeavePeriod = { id: before.id, kind: draft.kind, startDate: draft.startDate, endDate: draft.endDate };
  if (note) next.note = note;
  if (draft.kind === 'trek' && before.trek) next.trek = before.trek;
  return next;
}

// The part of the periods the planning reads, for the key that decides whether
// the planning runs again: id, kind, days, and of a tocht its terrain and
// importance. The note and the name are words only, so they are left out.
export function leaveKey(periods: LeavePeriod[] | undefined): unknown[] {
  return (periods ?? []).map((p) => [p.id, p.kind, p.startDate, p.endDate, p.trek?.terrain ?? null, p.trek?.importance ?? null]);
}

// The stored list with a new note on one period. An empty note goes.
export function withNote(periods: LeavePeriod[], periodId: string, note: string): LeavePeriod[] {
  const clean = cleanNote(note);
  return periods.map((p) => {
    if (p.id !== periodId) return p;
    const next: LeavePeriod = { ...p };
    if (clean) next.note = clean;
    else delete next.note;
    return next;
  });
}
