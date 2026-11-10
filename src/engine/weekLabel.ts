import type { ResolvedProgramPosition } from '../models/program';
import { waveHeader } from './programLayout';

// Eén tekst voor "waar sta je in het programma": de week binnen de fase.
// Vandaag, Stand, de weekterugblik en de dagvoorbeelden gebruiken dezelfde.
export function weekPositionLabel(position: Pick<ResolvedProgramPosition, 'weekInPhase' | 'phase'>): string {
  return `Week ${position.weekInPhase} van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}`;
}

// De kop van Week: dezelfde woorden als Vandaag (`waveHeader(position) ?? weekPositionLabel(position)`),
// verdeeld over een grote kop ("Week" met het getal) en een kleine regel ernaast ("van 18, basis").
// Zonder positie blijft het "Week" en is de regel leeg. Alleen tekst, de planning merkt er niets van.
export function weekHeading(position: ResolvedProgramPosition | null | undefined): { title: string; number?: number; line: string } {
  if (!position) return { title: 'Week', line: '' };
  const wave = waveHeader(position);
  if (wave) {
    const m = /^Week (\d+) (.+)$/.exec(wave);
    return m ? { title: 'Week', number: Number(m[1]), line: m[2] } : { title: wave, line: '' };
  }
  return { title: 'Week', number: position.weekInPhase, line: `van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}` };
}
