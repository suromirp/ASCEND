// Korte teksten bij een advies: de eerste zin van het effect en de regel voor
// de kaart op Vandaag. Puur; het blad en de kaart lezen dezelfde functies.

const ABBREVIATIONS = ['ca', 'bijv', 'enz', 'o.a', 'vs', 'nr', 'dr', 'max', 'min'];

// De eerste zin van een tekst, met zijn leesteken. Een punt na een afkorting
// of tussen cijfers is geen einde van de zin.
export function firstSentence(text: string): string {
  const t = text.trim();
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (c !== '.' && c !== '?' && c !== '!') continue;
    const next = t[i + 1];
    if (next !== undefined && next !== ' ') continue;
    if (c === '.') {
      const word = t.slice(0, i).split(/\s+/).at(-1)?.toLowerCase() ?? '';
      if (ABBREVIATIONS.includes(word)) continue;
    }
    return t.slice(0, i + 1);
  }
  return t;
}

interface AdviceTexts {
  effect: string;
  lead?: string;
  brief?: string;
}

// Eén feitregel: het eigen `lead`, anders de eerste zin van het effect.
export const adviceLead = (a: AdviceTexts): string => a.lead ?? firstSentence(a.effect);

// De regel op de kaart op Vandaag: nog korter dan het lead als een advies dat heeft.
export const adviceBrief = (a: AdviceTexts): string => a.brief ?? adviceLead(a);
