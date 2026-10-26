import type { SessionLog } from '../../models/training';
import { logSport } from '../../engine/sports';
import type { PictogramName } from '../pictograms';
import { isMountainTrip } from '../sportKind';
import { sportDefinition } from '../../data/sports';

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

export function sportKeyOfLog(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'> & { templateId?: string }): SportKey {
  if (log.type === 'strength') return 'strength';
  if (isMountainTrip(log)) return 'mountain';
  const sport = logSport(log);
  if (sport === 'running') return 'run';
  if (sport === 'hiking') return 'walk';
  if (sport === 'cycling') return 'bike';
  return 'other';
}
