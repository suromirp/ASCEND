// ASCEND: bijwerken van een vrije periode, een vakantie of een tocht in Week
// (docs/beslissingen/2026-11-01-vakantie-bijwerken.md). Andere data of een andere
// soort raakt de planning: dat is één voorstel met Akkoord via
// engine/leaveProposal.ts#planLeaveChange met `replaces`, dezelfde weg als een
// tocht die je wijzigt. Alleen een andere notitie of, bij zonder sportschool,
// alleen Heuvels in de buurt raakt de planning niet en mag direct bewaard
// worden, met Ongedaan maken. Anders kwam er een voorstel zonder één wijziging.
//
// Pure: no React, no IndexedDB.

import type { LeaveKind, LeavePeriod, NoGymDetails } from '../models/leave';
import { resolveNoGym } from './noGymDetails';

// 'note': only the words of the period (its note, and of a period without a gym
// the hills) are different; they are saved at once.
export type LeaveEditScope = 'none' | 'note' | 'plan';

export interface LeaveEditDraft {
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  note: string;
  // Only for a period without a gym: its choices (models/leave.ts#NoGymDetails).
  noGym?: NoGymDetails;
}

// What the planning reads of a period without a gym: how much and the strength.
// The hills are words only (models/leave.ts#NoGymDetails).
const sameNoGym = (a: LeavePeriod, b: LeavePeriod) => {
  if (a.kind !== 'no_gym') return true;
  const x = resolveNoGym(a);
  const y = resolveNoGym(b);
  return x.amount === y.amount && x.strength === y.strength;
};
const hillsOf = (p: LeavePeriod) => p.kind === 'no_gym' && resolveNoGym(p).hills;

const cleanNote = (note: string | undefined) => (note ?? '').trim();

// What the edit touches: nothing, only the note, or the planning.
export function leaveEditScope(before: LeavePeriod, after: LeavePeriod): LeaveEditScope {
  if (before.kind !== after.kind || before.startDate !== after.startDate || before.endDate !== after.endDate || !sameNoGym(before, after)) return 'plan';
  return cleanNote(before.note) === cleanNote(after.note) && hillsOf(before) === hillsOf(after) ? 'none' : 'note';
}

// The words of an edit that only changes words: the line in the sheet, and the
// title and reason of the message after saving.
export function leaveWordsChange(before: LeavePeriod, after: LeavePeriod): { line: string; title: string; why: string } {
  const note = cleanNote(before.note) !== cleanNote(after.note);
  const hills = hillsOf(before) !== hillsOf(after);
  const kept = 'Dat bewaar je meteen; je planning blijft zoals ze is.';
  if (note && hills) return { line: `Alleen de notitie en Heuvels in de buurt zijn anders. ${kept}`, title: 'Periode bijgewerkt', why: 'Alleen de notitie en Heuvels in de buurt van je periode zijn anders.' };
  if (hills) return { line: `Alleen Heuvels in de buurt is anders. ${kept}`, title: `Heuvels in de buurt ${hillsOf(after) ? 'aan' : 'uit'}`, why: 'Alleen Heuvels in de buurt van je periode is anders.' };
  return { line: `Alleen de notitie is anders. ${kept}`, title: 'Notitie bewaard', why: 'Alleen de notitie van je periode is anders.' };
}

// The period as it will be: the same id, so what it moved, let go or placed is
// found again. The details of a tocht stay only while it stays a tocht.
export function editedPeriod(before: LeavePeriod, draft: LeaveEditDraft): LeavePeriod {
  const note = cleanNote(draft.note);
  const next: LeavePeriod = { id: before.id, kind: draft.kind, startDate: draft.startDate, endDate: draft.endDate };
  if (note) next.note = note;
  if (draft.kind === 'trek' && before.trek) next.trek = before.trek;
  if (draft.kind === 'no_gym') next.noGym = draft.noGym ?? resolveNoGym(before);
  return next;
}

// The part of the periods the planning reads, for the key that decides whether
// the planning runs again: id, kind, days, and of a tocht its terrain and
// importance, and of a period without a gym how much and the strength. The note,
// the name and the hills are words only, so they are left out.
export function leaveKey(periods: LeavePeriod[] | undefined): unknown[] {
  return (periods ?? []).map((p) => [p.id, p.kind, p.startDate, p.endDate, p.trek?.terrain ?? null, p.trek?.importance ?? null, ...(p.kind === 'no_gym' ? [resolveNoGym(p).amount, resolveNoGym(p).strength] : [])]);
}

// The stored list with a new note on one period. An empty note goes. With
// `hills`, a period without a gym gets that choice too; how much and the
// strength stay as they were.
export function withNote(periods: LeavePeriod[], periodId: string, note: string, hills?: boolean): LeavePeriod[] {
  const clean = cleanNote(note);
  return periods.map((p) => {
    if (p.id !== periodId) return p;
    const next: LeavePeriod = { ...p };
    if (clean) next.note = clean;
    else delete next.note;
    if (hills !== undefined && p.kind === 'no_gym') next.noGym = { ...resolveNoGym(p), hills };
    return next;
  });
}
