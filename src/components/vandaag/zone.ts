import type { Program } from '../../models/program';
import type { SessionTemplate } from '../../models/training';
import { buildSessionBrief } from '../../engine/sessionBrief';

export type Zone = 1 | 2 | 3 | 4 | 5;

// De zone van een training, als de training er een heeft (uit de feiten van de
// sessiebrief: "Zone 2"). Anders niets: er wordt geen zone verzonnen.
export function zoneOfTemplate(template: SessionTemplate, date: string | undefined, program: Program | null | undefined, templates: SessionTemplate[]): Zone | undefined {
  const fact = buildSessionBrief(template, date, program, { templates }).facts.find((f) => /^zone \d/i.test(f.value));
  const n = fact ? Number(/\d/.exec(fact.value)![0]) : 0;
  return n >= 1 && n <= 5 ? (n as Zone) : undefined;
}

// Wat de zone in het lijf voelt, in één zin.
export const ZONE_SENTENCE: Record<Zone, string> = {
  1: 'Heel rustig. Je kunt zonder moeite praten.',
  2: 'Hele zinnen praten moet kunnen.',
  3: 'Stevig. Praten gaat in korte zinnen.',
  4: 'Hard. Praten lukt nauwelijks.',
  5: 'Alles wat je hebt, maar kort.',
};
