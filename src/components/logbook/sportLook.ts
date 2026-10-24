import type { SessionLog } from '../../models/training';
import { logSport } from '../../engine/sports';
import type { IconName } from '../icons';

// Hoe een sport eruitziet in het Logboek: de kleur van het bolletje, het icoon
// in de getinte schijf en het woord. Alleen weergave; welke sport een log was
// beslist engine/sports.ts#logSport.
export type SportKey = 'run' | 'strength' | 'walk' | 'bike' | 'other';

export const SPORT_LOOK: Record<SportKey, { label: string; color: string; icon: IconName }> = {
  run: { label: 'Lopen', color: 'var(--color-sport-run)', icon: 'lopen' },
  strength: { label: 'Kracht', color: 'var(--color-sport-strength)', icon: 'kracht' },
  walk: { label: 'Wandelen', color: 'var(--color-sport-walk)', icon: 'wandelen' },
  bike: { label: 'Fietsen', color: 'var(--color-sport-stretch)', icon: 'buiten' },
  other: { label: 'Overig', color: 'var(--color-sport-stretch)', icon: 'rekken' },
};

export function sportKeyOfLog(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'>): SportKey {
  if (log.type === 'strength') return 'strength';
  const sport = logSport(log);
  if (sport === 'running') return 'run';
  if (sport === 'hiking') return 'walk';
  if (sport === 'cycling') return 'bike';
  return 'other';
}
