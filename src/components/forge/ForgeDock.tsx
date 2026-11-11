// Het invoerpaneel onder het workoutscherm van Forge (ForgeWorkout.tsx): alleen tonen, de handelingen komen van
// useForgeDock.ts. Het blok blijft staan van veld naar veld; de key volgt alleen de epoch (dockKey.scan.test.ts).

import { useMemo } from 'react';
import { dockFieldKey, standHints } from '../../engine/forgeInput';
import { exerciseOf, plateSteps, usesPlates, type WorkoutExercise } from '../../engine/forgeWorkout';
import type { ResolvedStrengthSettings } from '../../engine/strengthSettings';
import { profileFor } from '../../engine/strengthWeights';
import { dockRowLabel, isAssisted } from './forgeWorkoutHelpers';
import { InputDock } from './InputDock';
import { addedKgOf } from '../../engine/forgeLadder';
import type { ForgeDockApi } from './useForgeDock';

export function ForgeDock({ api, workout, strength, readOnly }: { api: ForgeDockApi; workout: WorkoutExercise[]; strength: ResolvedStrengthSettings; readOnly: boolean }) {
  const { dock, dockEpoch, dockTaps, platesOn } = api;
  // De schijven van de oefening bij het invoerpaneel (de tabel rekent de zijne zelf, per oefening).
  const dockPlates = useMemo(() => {
    const ex = dock ? workout.find((e) => e.slot === dock.slot) : undefined;
    return ex && usesPlates(exerciseOf(ex)) ? plateSteps(ex, strength.profile) : undefined;
  }, [dock, workout, strength.profile]);
  const dockEx = dock ? workout.find((e) => e.slot === dock.slot) : undefined;
  const dockIndex = dockEx && dock ? dockEx.rows.findIndex((r) => r.id === dock.rowId) : -1;
  const dockRow = dockEx && dockIndex >= 0 ? dockEx.rows[dockIndex] : undefined;
  // Op een toestel met standen: waar Minder en Meer heen springen, klein onder de toets.
  const dockStepHints = (() => {
    if (!dock || dock.field !== 'weightKg' || !dockEx || !dockRow || isAssisted(dockEx)) return undefined;
    // Een leeg veld zegt bij Minder niets (standHints), nooit "naar 0 kilo".
    return standHints(exerciseOf(dockEx), profileFor(strength.profile, dockEx.dumbbellTotal), dockRow.weightKg ?? dockRow.target.weightKg, strength.learnStands);
  })();
  if (!dock || readOnly || !dockEx || !dockRow) return null;
  return (
    <InputDock
      // Geen key per veld: het blok blijft staan van veld naar veld (fieldKey zet de waarde opnieuw).
      key={dockEpoch}
      label={`${dock.field === 'weightKg' ? (isAssisted(dockEx) ? 'Hulp' : addedKgOf(exerciseOf(dockEx)) !== undefined ? 'Gewicht erbij' : 'Gewicht') : dock.field === 'seconds' ? 'Seconden' : 'Herhalingen'}, set ${dockRowLabel(dockEx, dockIndex)}, ${dockEx.name}`}
      fieldKey={dockFieldKey(dock, dockTaps)}
      value={dock.field === 'weightKg' ? (isAssisted(dockEx) && dockRow.weightKg !== undefined ? Math.abs(dockRow.weightKg) : dockRow.weightKg) : dock.field === 'seconds' ? dockRow.seconds : dockRow.reps}
      decimals={dock.field === 'weightKg' ? 2 : 0}
      onChange={(v) => api.changeValue(dock.field === 'weightKg' && isAssisted(dockEx) && v !== undefined ? -v : v)}
      onStep={api.stepDock}
      onSelected={api.setSelected}
      onNext={api.goNext}
      onClose={() => api.closeDockIfCurrent(dockEpoch)}
      onClosing={api.onDockClosing}
      onHeight={api.onDockHeight}
      stepHints={dockStepHints}
      plate={dockPlates?.[dockIndex]}
      plateOn={platesOn}
      onTogglePlates={() => api.setPlatesOn((v) => !v)}
    />
  );
}
