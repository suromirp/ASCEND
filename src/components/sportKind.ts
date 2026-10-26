import type { SessionTemplate } from '../models/training';
import { templateSport } from '../engine/sports';
import type { PictogramName } from './pictograms';

// De sport van een training in één van de sportkleuren: hardlopen oranje,
// kracht paars, wandelen groen, een bergtocht bergzon-geel, fietsen roze (zoals
// in het Logboek), een rustdag de hangmat in ijs.
export type SportKind = 'run' | 'strength' | 'walk' | 'mountain' | 'bike' | 'rest';

// Een bergtocht is de template "Bergtocht" of een training van het soort tocht
// (avontuur). Alleen weergave: de planning kijkt hier niet naar. Werkt voor een
// template en voor een log (die dezelfde templateId en hetzelfde soort draagt).
export function isMountainTrip(item: { templateId?: string; id?: string; type: SessionTemplate['type'] }): boolean {
  return item.type === 'adventure' || (item.templateId ?? item.id) === 'tpl_mountain_hike';
}

export function sportKind(template: SessionTemplate): SportKind {
  if (template.type === 'recovery') return 'rest';
  if (template.type === 'strength') return 'strength';
  if (isMountainTrip(template)) return 'mountain';
  const sport = templateSport(template);
  if (sport === 'cycling') return 'bike';
  return sport === 'hiking' ? 'walk' : 'run';
}

export const SPORT_COLOR: Record<SportKind, string> = {
  run: 'var(--color-sport-run)',
  strength: 'var(--color-sport-strength)',
  walk: 'var(--color-sport-walk)',
  mountain: 'var(--color-sport-mountain)',
  bike: 'var(--color-sport-stretch)',
  rest: 'var(--color-status)',
};

// Het pictogram bij een training (de hangmat voor een rustdag).
export const SPORT_PICTOGRAM: Record<SportKind, PictogramName> = {
  run: 'lopen',
  strength: 'kracht',
  walk: 'wandelen',
  mountain: 'bergtocht',
  bike: 'fietsen',
  rest: 'rust',
};

export function sportPictogram(template: SessionTemplate): PictogramName {
  return SPORT_PICTOGRAM[sportKind(template)];
}
