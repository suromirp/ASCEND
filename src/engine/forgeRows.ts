// ASCEND: sets die jij toevoegt of weghaalt in een training in Forge, en wat zichtbaar blijft van het
// programma. Zuiver en getest; geen React. Besluit: docs/beslissingen/2026-10-29-snelknoppen-in-forge.md
// (aanvulling over vegen en eigen sets).
//
// Een set die uit het programma komt heeft een id met `:s<n>` (werkset) of `:w<n>` (opwarmset); wat jij
// toevoegt (`:a...`) of kopieert (`:c...`) is eigen. Haal je een werkset van het programma weg, dan
// onthoudt de oefening hem in `dropped` (met zijn plek), zodat er één stille regel kan staan met
// "Terugzetten" in plaats van een spookrij. De training wordt het logboek niet geschreven met wat
// weggehaald is; alleen de afgevinkte sets gaan het log in (engine/forgeWorkout.ts#toStrengthData).

import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';

export interface DroppedRow {
  row: WorkoutRow;
  index: number;
}

export function isOwnRow(row: Pick<WorkoutRow, 'id'>): boolean {
  const tail = row.id.slice(row.id.lastIndexOf(':') + 1);
  return /^[ac][0-9a-z]+$/.test(tail);
}

// Het nummer zoals het op het scherm staat: "3" voor de derde werkset, "W1" voor de eerste opwarmset.
export function rowLabel(ex: Pick<WorkoutExercise, 'rows'>, rowId: string): string {
  const row = ex.rows.find((r) => r.id === rowId);
  if (!row) return '';
  const n = ex.rows.filter((r) => r.kind === row.kind).findIndex((r) => r.id === rowId) + 1;
  return row.kind === 'warmup' ? `W${n}` : String(n);
}

// Kan deze set weg? Altijd, ook een afgevinkte, behalve de laatste rij van de oefening.
export const canRemoveRow = (ex: Pick<WorkoutExercise, 'rows'>, rowId: string): boolean => ex.rows.length > 1 && ex.rows.some((r) => r.id === rowId);

export interface RemoveResult {
  ex: WorkoutExercise;
  removed?: DroppedRow;
  label: string;
}

// Haalt een set weg. Een werkset uit het programma wordt onthouden in `dropped`.
export function removeSet(ex: WorkoutExercise, rowId: string): RemoveResult {
  if (!canRemoveRow(ex, rowId)) return { ex, label: '' };
  const index = ex.rows.findIndex((r) => r.id === rowId);
  const row = ex.rows[index];
  const label = rowLabel(ex, rowId);
  const rows = ex.rows.filter((r) => r.id !== rowId);
  const keep = row.kind === 'work' && !isOwnRow(row);
  return {
    ex: { ...ex, rows, ...(keep ? { dropped: [...(ex.dropped ?? []), { row, index }] } : {}) },
    removed: { row, index },
    label,
  };
}

// Zet een weggehaalde set terug op zijn plek (of op het eind als de plek er niet meer is).
export function reinsertRow(ex: WorkoutExercise, removed: DroppedRow): WorkoutExercise {
  if (ex.rows.some((r) => r.id === removed.row.id)) return ex;
  const at = Math.max(0, Math.min(removed.index, ex.rows.length));
  const dropped = (ex.dropped ?? []).filter((d) => d.row.id !== removed.row.id);
  return { ...ex, rows: [...ex.rows.slice(0, at), removed.row, ...ex.rows.slice(at)], ...(dropped.length > 0 ? { dropped } : { dropped: undefined }) };
}

// "Terugzetten" onder de sets: alles wat je van het programma weghaalde komt terug.
export function restoreDropped(ex: WorkoutExercise): WorkoutExercise {
  let out = ex;
  for (const d of [...(ex.dropped ?? [])].sort((a, b) => a.index - b.index)) out = reinsertRow(out, d);
  return out;
}

export const droppedCount = (ex: Pick<WorkoutExercise, 'dropped'>): number => (ex.dropped ?? []).length;

export function droppedLine(n: number): string {
  return n === 1 ? '1 set van je programma weggehaald' : `${n} sets van je programma weggehaald`;
}

// Het aantal werksets dat het programma vroeg: wat nog staat uit het programma plus wat jij weghaalde.
export function programmedWorkSets(ex: WorkoutExercise): number {
  return ex.rows.filter((r) => r.kind === 'work' && !isOwnRow(r)).length + (ex.dropped ?? []).filter((d) => d.row.kind === 'work').length;
}

// Klopt de tekst "Je programma vraagt nu 3 sets..." niet meer met wat jij doet, dan komt er één korte zin bij.
export function ownCountSentence(ex: WorkoutExercise): string | undefined {
  if (!ex.reason?.startsWith('Je programma vraagt nu') && !ex.reason?.includes(' Je programma vraagt nu')) return undefined;
  const mine = ex.rows.filter((r) => r.kind === 'work').length;
  return mine === programmedWorkSets(ex) ? undefined : `Jij doet er ${mine}.`;
}

export function reasonWithOwnCount(ex: WorkoutExercise): string | undefined {
  const extra = ownCountSentence(ex);
  return ex.reason && extra ? `${ex.reason} ${extra}` : ex.reason;
}
