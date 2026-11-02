// ASCEND: de oefeningen van een krachttraining zoals Forge ze plant, op één plek, zodat Forge en de melding over
// spieren voor de berg (components/MountainMuscleNotice.tsx) altijd naar dezelfde lijst kijken: het programma uit
// MacroFactor voor die week als dat er is, anders het sjabloon, met daarachter wat je na een voorstel toevoegde
// (engine/addedExercises.ts). Puur.

import type { ExercisePrescription, SessionTemplate } from '../models/training';
import { addedSlotsFor, type AddedExercises } from './addedExercises';
import { programExercisesFor } from './macrofactorProgram';
import type { StoredStrengthProgram } from './strengthProgramStore';

export function forgeSlotsFor(
  template: Pick<SessionTemplate, 'id' | 'exercises'>,
  model: { program?: StoredStrengthProgram; addedExercises?: AddedExercises } | undefined,
  date: string,
): ExercisePrescription[] {
  const base = programExercisesFor(model?.program, template.id, date) ?? template.exercises ?? [];
  return [...base, ...addedSlotsFor(model, template.id, base)];
}
