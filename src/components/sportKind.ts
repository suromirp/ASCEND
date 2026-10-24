import type { SessionTemplate } from '../models/training';
import { templateSport } from '../engine/sports';
import type { IconName } from './icons';

// De sport van een training in één van de sportkleuren: hardlopen oranje,
// kracht paars, wandelen groen, een rustdag het maantje in ijs.
export type SportKind = 'run' | 'strength' | 'walk' | 'rest';

export function sportKind(template: SessionTemplate): SportKind {
  if (template.type === 'recovery') return 'rest';
  if (template.type === 'strength') return 'strength';
  const sport = templateSport(template);
  return sport === 'hiking' || template.type === 'adventure' ? 'walk' : 'run';
}

export const SPORT_COLOR: Record<SportKind, string> = {
  run: 'var(--color-sport-run)',
  strength: 'var(--color-sport-strength)',
  walk: 'var(--color-sport-walk)',
  rest: 'var(--color-status)',
};

// Het pictogram bij een training (het maantje voor een rustdag).
export function templateIcon(template: SessionTemplate): IconName | 'maan' {
  return sportKind(template) === 'rest' ? 'maan' : sportIcon(template);
}

export function sportIcon(template: SessionTemplate): IconName {
  if (template.type === 'strength') return 'kracht';
  if (template.type === 'adventure') return 'rugzak';
  return sportKind(template) === 'walk' ? 'wandelen' : 'lopen';
}

