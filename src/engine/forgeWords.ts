// ASCEND: de woorden in Forge en in de lopen (docs/visie/Ontwerp beginner heel licht.md, deel 3). Gewone woorden voor
// iedereen, de vaktaal voor wie hem wil zien (instelling Woorden in Forge). Alleen wat je ziet verandert: de tekst
// `RPE 3-4` in de sjablonen blijft staan, want engine/weekReview.ts en engine/coach.ts lezen hem.
// Puur: geen React, geen IndexedDB.

export type ForgeWords = 'plain' | 'jargon';
export const FORGE_WORDS_ADVICE: ForgeWords = 'plain';
export const FORGE_WORDS: ForgeWords[] = ['plain', 'jargon'];

export function resolveForgeWords(raw: unknown): ForgeWords {
  return raw === 'jargon' ? 'jargon' : FORGE_WORDS_ADVICE;
}

export interface ForgeLabels {
  // De koppen boven de sets en wat een schermlezer zegt.
  plan: string;
  reps: string;
  repsSpoken: string;
  over: string;
  // De zwaarte van de hele training, op het blad Hoe ging het.
  effort: string;
}

export function forgeLabels(mode: ForgeWords): ForgeLabels {
  return mode === 'jargon'
    ? { plan: 'Voorschrift', reps: 'Herh.', repsSpoken: 'Herhalingen', over: 'RIR', effort: 'Zwaarte (RPE)' }
    : { plan: 'Plan', reps: 'Herh.', repsSpoken: 'Herhalingen', over: 'Over', effort: 'Zwaarte' };
}

export const CALM_WORDS = 'rustig, je kunt hele zinnen praten';

// "RPE 3-4" (ook "RPE 3-4/10") in een tekst die je ziet: in gewone woorden zegt het wat je voelt. Andere RPE's
// (5-6, 8-9) blijven staan: die hebben geen vaste zin die iedereen kent.
export function effortWords(text: string, mode: ForgeWords): string {
  if (mode === 'jargon') return text;
  return text.replace(/RPE 3(?:-| tot )4(?:\/10)?/g, CALM_WORDS);
}
