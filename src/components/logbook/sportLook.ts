import type { SessionLog } from '../../models/training';
import { logSport } from '../../engine/sports';
import type { PictogramName } from '../pictograms';
import { isMountainTrip } from '../sportKind';
import { anySportDefinition, sportDefinition } from '../../data/sports';

// Hoe een sport eruitziet in het Logboek: de kleur van het bolletje, het
// pictogram in de getinte schijf en het woord. Alleen weergave; welke sport een
// log was beslist engine/sports.ts#logSport.
export type SportKey = 'run' | 'strength' | 'walk' | 'mountain' | 'bike' | 'other';

export const SPORT_LOOK: Record<SportKey, { label: string; color: string; icon: PictogramName }> = {
  run: { label: 'Lopen', color: sportDefinition('running').colorToken, icon: sportDefinition('running').pictogram as PictogramName },
  strength: { label: 'Kracht', color: 'var(--color-sport-strength)', icon: 'kracht' },
  walk: { label: 'Wandelen', color: sportDefinition('hiking').colorToken, icon: sportDefinition('hiking').pictogram as PictogramName },
  mountain: { label: 'Bergtocht', color: 'var(--color-sport-mountain)', icon: 'bergtocht' },
  bike: { label: 'Fietsen', color: sportDefinition('cycling').colorToken, icon: sportDefinition('cycling').pictogram as PictogramName },
  other: { label: 'Overig', color: 'var(--color-ink-dim)', icon: 'rekken' },
};

// The look of one log: a sport that only counts (zwemmen, padel, voetbal) with its own name and pictogram.
export function lookOfLog(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData' | 'countedSport'> & { templateId?: string }): { label: string; color: string; icon: PictogramName } {
  if (log.countedSport) {
    const def = anySportDefinition(log.countedSport);
    return { label: def.label, color: def.colorToken, icon: def.pictogram ?? 'rekken' };
  }
  return SPORT_LOOK[sportKeyOfLog(log)];
}

export function sportKeyOfLog(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'> & { templateId?: string }): SportKey {
  if (log.type === 'strength') return 'strength';
  if (isMountainTrip(log)) return 'mountain';
  const sport = logSport(log);
  if (sport === 'running') return 'run';
  if (sport === 'hiking') return 'walk';
  if (sport === 'cycling') return 'bike';
  return 'other';
}
