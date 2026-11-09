// Het concept van de lopende Forge-sessie en de regel van het voorstel "toestel in ponden", uit ForgeWorkout.tsx.
// Puur: geen React.

import type { WorkoutExercise } from '../../engine/forgeWorkout';
import { cleanForgeLog, spotterEvents, type ForgeEvent } from '../../engine/forgeLog';
import { makeId } from '../../utils/id';
import type { Pause } from '../../engine/forgeSession';
import { poundStackProposal, poundStackText } from '../../engine/poundStack';
import type { Rest } from './forgeWorkoutHelpers';

export const DRAFT_VERSION = 1;

export interface WorkoutDraft {
  v: number;
  savedAt: number;
  startedAt: number;
  exercises: WorkoutExercise[];
  rest?: Rest;
  column: 'target' | 'previous';
  // Of de rijen met Lichter gepland zijn; een concept van voor deze keuze heeft het niet.
  eased?: boolean;
  // Het verloop van de training (engine/forgeLog.ts) en het moment dat je het voor het laatst opende.
  // Optioneel: een concept van voor het verloop heeft ze niet.
  log?: ForgeEvent[];
  seen?: number;
  // De sessie (engine/forgeSession.ts): de klok is nu min startedAt min de pauzes. Optioneel: een concept van
  // voor de sessie heeft ze niet en werkt gewoon.
  pauses?: Pause[];
  lastActionAt?: number;
}

// Het laatste moment van handelen in een concept: het bewaarde moment, of de laatst afgevinkte set, of het wegschrijven.
export function lastActionOfDraft(d: Partial<WorkoutDraft>, startedAt: number): number {
  const ticks = (d.exercises ?? []).flatMap((e) => e.rows.map((r) => r.doneAt)).filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  const saved = typeof d.lastActionAt === 'number' ? d.lastActionAt : typeof d.savedAt === 'number' ? d.savedAt : startedAt;
  return Math.max(saved, ...ticks);
}

// De regel van het voorstel "toestel in ponden", of undefined.
export function poundLine(ex: WorkoutExercise, profile: Parameters<typeof poundStackProposal>[1]): string | undefined {
  const p = poundStackProposal(ex, profile);
  return p ? poundStackText(p) : undefined;
}

// Het verloop bij het openen: leeg, of het bewaarde verloop, met het teken "Zonder spotter" van het plan van nu.
export function initialForgeLog(workout: WorkoutExercise[], restored: WorkoutDraft | undefined, readOnly: boolean): ForgeEvent[] {
  if (readOnly) return restored ? (cleanForgeLog(restored.log) ?? []) : [];
  const fresh = spotterEvents(workout, Date.now(), () => makeId('fe'));
  if (!restored) return fresh;
  // Een concept van voor Zonder spotter krijgt het plan van nu (mergeDraft); het teken komt dan ook in het verloop.
  const kept = cleanForgeLog(restored.log) ?? [];
  return [...kept, ...fresh.filter((f) => !kept.some((k) => k.kind === 'spotter' && k.exerciseId === f.exerciseId))];
}
