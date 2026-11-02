import type { SessionTemplate } from '../models/training';
import { templateSport } from './sports';

// De sport van een training: hardlopen, kracht, wandelen, bergtocht, fietsen of rust.
// Puur; de kleuren en pictogrammen staan in components/sportKind.ts.
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
