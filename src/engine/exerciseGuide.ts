// ASCEND: wat het blad van een oefening laat zien van de uitleg (data/exerciseGuides.ts). Puur, zonder React.
// Docs: docs/beslissingen/2026-11-09-uitleg-bij-oefeningen.md.

import type { Exercise, ExerciseGuide } from '../models/exercise';

// De zorgzin: staat altijd zichtbaar onder "In het kort", nooit achter "Lees verder".
export const GUIDE_CARE = 'Doet het pijn, stop dan en vraag een arts of fysiotherapeut.';

export interface GuideLink {
  id: string;
  name: string;
}

// Lichter en Zwaarder: alleen als het id van een bestaande oefening is.
export function guideLinks(guide: ExerciseGuide, byId: (id: string) => Exercise | undefined): { easier: GuideLink | null; harder: GuideLink | null } {
  const link = (id: string | undefined): GuideLink | null => {
    const e = id ? byId(id) : undefined;
    return e ? { id: e.id, name: e.name } : null;
  };
  return { easier: link(guide.easier), harder: link(guide.harder) };
}

// De alinea's van "Lees verder", in de volgorde waarin ze staan.
export function readMoreText(guide: ExerciseGuide): string[] {
  return [guide.setup, guide.movement, guide.tempo, ...guide.mistakes.flatMap((m) => [m.fault, m.fix])];
}

export function readMoreWords(guide: ExerciseGuide): number {
  return readMoreText(guide).join(' ').split(/\s+/).filter(Boolean).length;
}
