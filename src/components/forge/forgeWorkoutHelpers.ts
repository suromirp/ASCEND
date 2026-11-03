// Kleine hulpjes en typen die het workoutscherm van Forge (ForgeWorkout.tsx) deelt met zijn onderdelen, zonder JSX.

import type { FieldName } from '../../engine/forgeInput';
import { exerciseOf, type WorkoutExercise } from '../../engine/forgeWorkout';
import type { GymProfile } from '../../engine/strengthSettings';
import type { Exercise } from '../../models/exercise';
import { addOnsFor, formatAddOns } from '../../engine/machineWeights';

export interface Rest {
  endsAt: number;
  total: number;
  name: string;
}

export const clock = () => Date.now();

export const isAssisted = (ex: WorkoutExercise) => exerciseOf(ex)?.resistance === 'assisted_bodyweight';

// "W" voor een opwarmset, anders het nummer van de werkset.
export function dockRowLabel(ex: WorkoutExercise, index: number): string {
  const row = ex.rows[index];
  if (!row) return '';
  if (row.kind === 'warmup') return 'W';
  return String(ex.rows.slice(0, index + 1).filter((r) => r.kind === 'work').length);
}

// De handelingen van de tabel. Eén vaste set (nooit een nieuwe functie per render),
// zodat een oefening alleen opnieuw tekent als hijzelf verandert.
export interface BlockActions {
  column: () => void;
  fold: (slot: string) => void;
  menu: (slot: string) => void;
  tick: (slot: string, rowId: string) => void;
  open: (slot: string, rowId: string, name: FieldName) => void;
  take: (slot: string, rowId: string) => void;
  rowMenu: (slot: string, rowId: string) => void;
  rir: (slot: string, rowId: string) => void;
  // "Hoeveel over?" na het afvinken: je RIR in één tik.
  quickRir: (slot: string, rowId: string, rir: number) => void;
  // Het toestel als ponden opslaan, of het voorstel laten liggen.
  poundSave: (slot: string) => void;
  poundKeep: (slot: string) => void;
  add: (slot: string) => void;
  lighter: (slot: string) => void;
  // Terugzetten van de stap omhoog die Forge rekent mee zette.
  unraise: (slot: string) => void;
  keep: (slot: string) => void;
  fill: (slot: string) => void;
  keepFit: (slot: string) => void;
  // Uitleg bij "1 over, zonder spotter".
  spotter: () => void;
  // Een set weghalen (vegen of het setmenu), terugzetten wat je van het programma weghaalde, de melding terugdraaien.
  remove: (slot: string, rowId: string) => void;
  restore: (slot: string) => void;
  undo: () => void;
}

// De regel onder "Tussengewicht van dit toestel" in het menu van een oefening.
export function addOnMenuSub(profile: GymProfile, exercise: Exercise | undefined): string {
  const list = addOnsFor(profile, exercise);
  return list.length > 0 ? `${formatAddOns(list)} erbij, in ${profile.name}.` : `Geen los gewicht in ${profile.name}.`;
}
