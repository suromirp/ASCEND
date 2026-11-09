// Het invoerpaneel van het workoutscherm van Forge (ForgeWorkout.tsx): welk veld open staat, een waarde
// invoeren, Minder en Meer, en naar het volgende veld. De regels staan in engine/forgeInput.ts.

import { useCallback, useLayoutEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
  applyReps,
  applyWeight,
  carryChange,
  makeLight,
  makeSnap,
  nextField,
  repsBounds,
  standJump,
  stepNumber,
  weightBounds,
  weightStepFor,
  REPS_STEP,
  type FieldName,
  type FieldRef,
  type RowRef,
} from '../../engine/forgeInput';
import { exerciseOf, type WorkoutExercise } from '../../engine/forgeWorkout';
import { reckonWeight, type ReckonContext } from '../../engine/forgeReckon';
import { profileFor } from '../../engine/strengthWeights';
import type { ForgeCause } from '../../engine/forgeLog';
import type { ResolvedStrengthSettings } from '../../engine/strengthSettings';
import { isAssisted } from './forgeWorkoutHelpers';

interface DockDeps {
  workout: WorkoutExercise[];
  setWorkout: Dispatch<SetStateAction<WorkoutExercise[]>>;
  setActiveRef: (ref: RowRef) => void;
  begin: () => number;
  markCause: (why: ForgeCause) => void;
  baseRef: MutableRefObject<{ key: string; ex: WorkoutExercise } | null>;
  strength: ResolvedStrengthSettings;
  bodyKg: number | undefined;
  readOnly: boolean;
  reckonCtx: ReckonContext;
}

export function useForgeDock({ workout, setWorkout, setActiveRef, begin, markCause, baseRef, strength, bodyKg, readOnly, reckonCtx }: DockDeps) {
  const [dock, setDock] = useState<FieldRef | null>(null);
  // Telt de tikken op een veld: ook dezelfde plek opnieuw aantikken begint opnieuw (dockFieldKey).
  const [dockTaps, setDockTaps] = useState(0);
  // Een blok dat al aan het sluiten is wordt bij een nieuwe tik op een veld vervangen (nieuwe epoch);
  // het sluiten van het oude blok mag het nieuwe dan niet meer dichtdoen.
  const [dockEpoch, setDockEpoch] = useState(0);
  const dockClosing = useRef(false);
  const epochRef = useRef(0);
  useLayoutEffect(() => {
    epochRef.current = dockEpoch;
  });
  const onDockClosing = useCallback(() => {
    dockClosing.current = true;
  }, []);
  const renewDockIfClosing = () => {
    if (!dockClosing.current) return;
    dockClosing.current = false;
    setDockEpoch((n) => n + 1);
  };
  const [selected, setSelected] = useState(true);
  const [dockH, setDockH] = useState(0);
  const [platesOn, setPlatesOn] = useState(true);
  const onDockHeight = useCallback((h: number) => setDockH(h), []);

  // Het blok weg, zonder het sluiten van een oud blok nog mee te laten tellen.
  function closeDock() {
    dockClosing.current = false;
    setDock(null);
  }
  // Het sluiten dat het blok zelf meldt: alleen als het nog het blok van deze epoch is.
  function closeDockIfCurrent(epoch: number) {
    if (epochRef.current === epoch) closeDock();
  }

  function openField(slot: string, rowId: string, field: FieldName) {
    if (readOnly) return;
    baseRef.current = null;
    renewDockIfClosing();
    setDockTaps((n) => n + 1);
    setDock({ slot, rowId, field });
    setSelected(true);
    setActiveRef({ slot, rowId });
  }

  function changeValue(v: number | undefined) {
    const d = dock;
    if (!d) return;
    if (!readOnly) begin();
    const key = `${d.slot}:${d.rowId}:${d.field}`;
    markCause({ kind: 'eigen', edited: { slot: d.slot, rowId: d.rowId } });
    setWorkout((w) =>
      w.map((e) => {
        if (e.slot !== d.slot) return e;
        // Wijzigingen doorvoeren (carryChange) vervangt het oude doorgeven van het verschil.
        // Doorvoeren rekent vanaf de stand van toen je het veld opende, zodat een
        // tussenstand (een leeg veld tijdens het typen) de andere sets niet losmaakt.
        if (baseRef.current?.key !== key) baseRef.current = { key, ex: e };
        const base = baseRef.current.ex;
        if (d.field === 'reps') {
          const changed = applyReps(base, d.rowId, v);
          return strength.carryMode === 'equal' ? carryChange(base, changed, d.rowId, 'reps') : changed;
        }
        const changed = applyWeight(base, d.rowId, v, strength.carryMode === 'shift', makeSnap(exerciseOf(e), profileFor(strength.profile, e.dumbbellTotal), bodyKg, v, e.dumbbellTotal), weightBounds(exerciseOf(e)).min, makeLight(exerciseOf(e), profileFor(strength.profile, e.dumbbellTotal)));
        const carried = strength.carryMode === 'equal' ? carryChange(base, changed, d.rowId, 'weightKg') : changed;
        // Forge rekent mee: een ander gewicht krijgt de herhalingen die je daarbij waarschijnlijk haalt.
        return reckonWeight(base, carried, d.rowId, reckonCtx);
      }),
    );
  }

  function stepDock(direction: 1 | -1): number {
    const d = dock;
    const ex = d ? workout.find((e) => e.slot === d.slot) : undefined;
    const row = ex?.rows.find((r) => r.id === d?.rowId);
    if (!d || !ex || !row) return 0;
    const isWeight = d.field === 'weightKg';
    const current = isWeight ? (row.weightKg ?? row.target.weightKg) : (row.reps ?? 0);
    const step = isWeight ? weightStepFor(exerciseOf(ex), profileFor(strength.profile, ex.dumbbellTotal), current) : REPS_STEP;
    // Een toestel met standen: Minder en Meer springen naar de vorige en volgende stand.
    if (isWeight && !isAssisted(ex)) {
      const jump = standJump(exerciseOf(ex), profileFor(strength.profile, ex.dumbbellTotal), current ?? 0, direction, strength.learnStands);
      if (jump !== undefined) {
        const bounded = Math.min(weightBounds(exerciseOf(ex)).max, Math.max(weightBounds(exerciseOf(ex)).min, jump));
        changeValue(bounded);
        return bounded;
      }
    }
    // Hulp van een toestel: het blok werkt met de hoeveelheid hulp (+ is meer hulp), opgeslagen als negatief.
    if (isWeight && isAssisted(ex)) {
      const help = stepNumber(Math.abs(current ?? 0), direction, step, 0, weightBounds(undefined).max);
      changeValue(-help);
      return help;
    }
    const bounds = isWeight ? weightBounds(exerciseOf(ex)) : repsBounds;
    const next = stepNumber(current, direction, step, bounds.min, bounds.max);
    changeValue(next);
    return next;
  }

  function goNext(close: () => void) {
    const n = dock ? nextField(workout, dock) : undefined;
    if (!n) {
      close();
      return;
    }
    baseRef.current = null;
    renewDockIfClosing();
    setDock(n);
    setSelected(true);
    setActiveRef({ slot: n.slot, rowId: n.rowId });
  }

  return { dock, dockTaps, dockEpoch, selected, setSelected, dockH, platesOn, setPlatesOn, onDockClosing, onDockHeight, closeDock, closeDockIfCurrent, openField, changeValue, stepDock, goNext };
}

export type ForgeDockApi = ReturnType<typeof useForgeDock>;
