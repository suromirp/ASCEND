// ASCEND: één munt voor belasting (docs/visie/Sporten die meetellen.md, 1 en 2.6): minuten maal hoe zwaar
// het voelde (RPE, 0 tot 10). Ontbreekt dat gevoel, dan neemt ASCEND een waarde aan uit de bedoelde of
// gebruikelijke zwaarte (engine/legFatigue.ts#PLANNED_RPE) en zegt dat. Een aangenomen waarde telt iets
// voorzichtiger mee, een punt hoger: aan de veilige kant. Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { PLANNED_RPE } from './legFatigue';

export type FeltWord = 'rustig' | 'pittig' | 'zwaar' | 'heel-zwaar';

// De vier woorden van "Hoe zwaar voelde het?" en de RPE die ze zetten.
export const FELT_RPE: Record<FeltWord, number> = { rustig: 3, pittig: 5, zwaar: 7, 'heel-zwaar': 9 };
export const FELT_LABEL: Record<FeltWord, string> = { rustig: 'Rustig', pittig: 'Pittig', zwaar: 'Zwaar', 'heel-zwaar': 'Heel zwaar' };

// Het woord bij een RPE, voor het logblad: het dichtstbij liggende.
export function feltWordOf(rpe: number): FeltWord {
  return (Object.keys(FELT_RPE) as FeltWord[]).reduce((best, w) => (Math.abs(FELT_RPE[w] - rpe) < Math.abs(FELT_RPE[best] - rpe) ? w : best), 'rustig');
}

// De aangenomen RPE bij een zwaarte.
export function assumedRpe(intensity: 'low' | 'moderate' | 'high'): number {
  return PLANNED_RPE[intensity] ?? PLANNED_RPE.moderate;
}

export interface SessionLoad {
  load: number;
  rpe: number;
  // De RPE is aangenomen, niet door jou gegeven.
  assumed: boolean;
}

// De belasting van een log. `intensity` is de bedoelde of gebruikelijke zwaarte, voor een log zonder RPE.
export function sessionLoad(log: Pick<SessionLog, 'durationMinutes' | 'rpe' | 'rpeAssumed'>, intensity: 'low' | 'moderate' | 'high'): SessionLoad {
  const minutes = Math.max(0, log.durationMinutes || 0);
  const given = typeof log.rpe === 'number' && Number.isFinite(log.rpe) ? Math.min(10, Math.max(0, log.rpe)) : undefined;
  const assumed = given === undefined || log.rpeAssumed === true;
  const base = given ?? assumedRpe(intensity);
  const rpe = assumed ? Math.min(10, base + 1) : base;
  return { load: Math.round(minutes * rpe), rpe, assumed };
}
