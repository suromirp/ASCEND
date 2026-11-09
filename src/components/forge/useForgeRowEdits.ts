// Een oefening of set aanpassen in het workoutscherm van Forge (ForgeWorkout.tsx): een oefening bijwerken, een set
// toevoegen of weghalen, in het verloop, met een korte melding om het terug te draaien. De regels staan in
// engine/forgeRows.ts en engine/forgeWorkout.ts.

import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { canRemoveRow, reinsertRow, removeSet, rowLabel, type DroppedRow } from '../../engine/forgeRows';
import { addRow, type WorkoutExercise } from '../../engine/forgeWorkout';
import { appendEvents, setCountEvent, type ForgeEvent } from '../../engine/forgeLog';
import { haptics } from '../../utils/haptics';
import { makeId } from '../../utils/id';

interface RowEditDeps {
  workout: WorkoutExercise[];
  setWorkout: Dispatch<SetStateAction<WorkoutExercise[]>>;
  setForgeLog: Dispatch<SetStateAction<ForgeEvent[]>>;
  begin: () => number;
  baseRef: MutableRefObject<{ key: string; ex: WorkoutExercise } | null>;
  readOnly: boolean;
}

export function useForgeRowEdits({ workout, setWorkout, setForgeLog, begin, baseRef, readOnly }: RowEditDeps) {
  function setExercise(slot: string, update: (ex: WorkoutExercise) => WorkoutExercise) {
    if (!readOnly) begin();
    baseRef.current = null;
    setWorkout((w) => w.map((e) => (e.slot === slot ? update(e) : e)));
  }

  // Een set die jij toevoegt of weghaalt: in het verloop, en met een korte melding om het terug te draaien.
  const [undo, setUndo] = useState<{ slot: string; removed: DroppedRow; label: string; eventId: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 10000);
    return () => window.clearTimeout(t);
  }, [undo]);

  function addSetLogged(slot: string, kind: 'work' | 'warmup') {
    const ex = workout.find((e) => e.slot === slot);
    if (!ex) return;
    setUndo(null);
    const next = addRow(ex, kind);
    const made = next.rows.find((r) => !ex.rows.some((o) => o.id === r.id));
    setExercise(slot, () => next);
    if (made && !readOnly) setForgeLog((l) => appendEvents(l, [setCountEvent('toegevoegd', ex, made, rowLabel(next, made.id), Date.now(), makeId('fe'))]));
  }

  function removeSetLogged(slot: string, rowId: string) {
    const ex = workout.find((e) => e.slot === slot);
    if (!ex || !canRemoveRow(ex, rowId)) return;
    const r = removeSet(ex, rowId);
    if (!r.removed) return;
    haptics.tap();
    const eventId = makeId('fe');
    setExercise(slot, () => r.ex);
    if (!readOnly) setForgeLog((l) => appendEvents(l, [setCountEvent('weggehaald', ex, r.removed!.row, r.label, Date.now(), eventId)]));
    setUndo({ slot, removed: r.removed, label: r.label, eventId });
  }

  function undoRemove() {
    if (!undo) return;
    const { slot, removed, eventId } = undo;
    setExercise(slot, (e) => reinsertRow(e, removed));
    setForgeLog((l) => l.filter((ev) => ev.id !== eventId));
    setUndo(null);
  }

  return { setExercise, undo, addSetLogged, removeSetLogged, undoRemove };
}
