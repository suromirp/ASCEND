// De vaste teksten van de trainingsgids (data/trainingGuide.ts) zeggen "je tocht". Dat klopt alleen als je doel een
// tocht is (I-163, na I-161): is er geen tocht, dan staat er "je doel". Puur en alleen tekst, nooit gedrag; de
// gegevens in data/ blijven zoals ze zijn.

import type { TrainingDayGuide } from '../data/trainingGuide';

const SWAPS: readonly [RegExp, string][] = [
  [/\bop je tocht\b/g, 'bij je doel'],
  [/\bje bergtocht\b/g, 'je doel'],
  [/\bje tocht\b/g, 'je doel'],
];

export function goalWords(text: string): string {
  return SWAPS.reduce((t, [from, to]) => t.replace(from, to), text);
}

function walk<T>(value: T): T {
  if (typeof value === 'string') return goalWords(value) as T;
  if (Array.isArray(value)) return value.map(walk) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'url' ? v : walk(v)])) as T;
  }
  return value;
}

// De gids voor dit doel: bij een tocht zoals hij is, anders met "je doel" waar "je tocht" stond.
export function guideForGoal(guide: TrainingDayGuide | undefined, hasTrek: boolean): TrainingDayGuide | undefined {
  return guide && !hasTrek ? walk(guide) : guide;
}
