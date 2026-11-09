import type { SessionTemplate } from '../models/training';
import { isBodyweightTemplate, sportKind, type SportKind } from '../engine/sportKind';
import type { PictogramName } from './pictograms';
import { anySportDefinition, sportDefinition } from '../data/sports';

// De sport van een training in één van de sportkleuren: hardlopen oranje,
// kracht paars, wandelen groen, een bergtocht bergzon-geel, fietsen roze (zoals
// in het Logboek), een rustdag de hangmat in ijs. De indeling zelf staat in engine/sportKind.ts.
export { isMountainTrip, sportKind } from '../engine/sportKind';
export type { SportKind };

export const SPORT_COLOR: Record<SportKind, string> = {
  run: sportDefinition('running').colorToken,
  strength: 'var(--color-sport-strength)',
  walk: sportDefinition('hiking').colorToken,
  mountain: 'var(--color-sport-mountain)',
  bike: sportDefinition('cycling').colorToken,
  rest: 'var(--color-status)',
};

// Het pictogram bij een training (de hangmat voor een rustdag).
export const SPORT_PICTOGRAM: Record<SportKind, PictogramName> = {
  run: sportDefinition('running').pictogram as PictogramName,
  strength: 'kracht',
  walk: sportDefinition('hiking').pictogram as PictogramName,
  mountain: 'bergtocht',
  bike: sportDefinition('cycling').pictogram as PictogramName,
  rest: 'rust',
};

// Kracht zonder gewicht: dezelfde sport en kleur als kracht, een eigen pictogram.
export const BODYWEIGHT_PICTOGRAM: PictogramName = 'eigengewicht';

export function sportPictogram(template: SessionTemplate): PictogramName {
  // A sport that only counts (zwemmen, padel, voetbal) has its own pictogram in sage.
  if (template.countedSport) return anySportDefinition(template.countedSport).pictogram ?? 'rekken';
  if (isBodyweightTemplate(template)) return BODYWEIGHT_PICTOGRAM;
  return SPORT_PICTOGRAM[sportKind(template)];
}

export function sportColor(template: SessionTemplate): string {
  if (template.countedSport) return anySportDefinition(template.countedSport).colorToken;
  return SPORT_COLOR[sportKind(template)];
}
