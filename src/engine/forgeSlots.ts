// ASCEND: de oefeningen van een krachttraining zoals Forge ze plant, op één plek, zodat Forge en de melding over
// spieren voor de berg (components/MountainMuscleNotice.tsx) altijd naar dezelfde lijst kijken: het programma uit
// MacroFactor voor die week als dat er is, anders het sjabloon, met daarachter wat je na een voorstel toevoegde
// (engine/addedExercises.ts). Een ladderstap die je na een voorstel koos staat op de plek van zijn oefening
// (engine/stepSwaps.ts). Puur.

import type { ExercisePrescription, SessionTemplate } from '../models/training';
import { addedSlotsFor, type AddedExercises } from './addedExercises';
import { programExercisesFor } from './macrofactorProgram';
import { withStepSwaps, type StepSwaps } from './stepSwaps';
import type { StoredStrengthProgram } from './strengthProgramStore';

// De plekken van het programma of het sjabloon, voor stappen en toevoegingen: waar een stap (`from`) tegen klopt.
export function baseSlotsFor(
  template: Pick<SessionTemplate, 'id' | 'exercises'>,
  model: { program?: StoredStrengthProgram; addedExercises?: AddedExercises; stepSwaps?: StepSwaps } | undefined,
  date: string,
): ExercisePrescription[] {
  return programExercisesFor(model?.program, template.id, date) ?? template.exercises ?? [];
}

export function forgeSlotsFor(
  template: Pick<SessionTemplate, 'id' | 'exercises'>,
  model: { program?: StoredStrengthProgram; addedExercises?: AddedExercises; stepSwaps?: StepSwaps } | undefined,
  date: string,
): ExercisePrescription[] {
  const base = withStepSwaps(baseSlotsFor(template, model, date), model, template.id);
  return [...base, ...addedSlotsFor(model, template.id, base)];
}
