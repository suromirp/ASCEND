import type { ResolvedProgramPosition } from '../models/program';

// Eén tekst voor "waar sta je in het programma": de week binnen de fase.
// Vandaag, Stand, de weekterugblik en de dagvoorbeelden gebruiken dezelfde.
export function weekPositionLabel(position: Pick<ResolvedProgramPosition, 'weekInPhase' | 'phase'>): string {
  return `Week ${position.weekInPhase} van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}`;
}
