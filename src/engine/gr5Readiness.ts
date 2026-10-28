// ASCEND, "Klaar voor de GR5": de oude naam voor "Klaar voor je doel".
//
// De berekening staat sinds ronde 2a in engine/goalReadiness.ts, met de meters per doelsoort
// uit data/goalKinds.ts. Dit bestand is een dunne wrapper voor de meerdaagse tocht met
// hutten, met de GR5 als naam en een grens van twee dagen achter elkaar: precies wat dit
// bestand deed voor de generalisatie. De uitkomst is exact gelijk (zie goalReadiness.test.ts,
// die de bevroren uitkomsten van toen naast de nieuwe berekening legt). De schermen lezen
// dit nog; ze mogen straks overstappen op computeGoalReadiness zonder dat het getal verandert.
//
// De uitleg bij de rekenregel (waarom het gemiddelde, waarom begrensd op 100%, waarom twee
// dagen op rij) staat nu in goalReadiness.ts en in docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md.

import type { GoalRequirement } from '../models/goals';
import type { SessionLog } from '../models/training';
import { changeLabel, computeGoalReadiness, metersLinkLabel, VERGELIJK_DAGEN, type GoalReadiness, type MeterPart } from './goalReadiness';

// Hoeveel dagen achter elkaar je thuis oefent bij een tocht met hutten.
export const THUIS_DAGEN_OP_RIJ = 2;
export { changeLabel, metersLinkLabel, VERGELIJK_DAGEN };
export type { MeterPart };

// Wat de kaart op Je stand toont: de uitkomst van het doel met meters van elke soort.
export interface ShownReadiness {
  percent: number;
  meters: { key: string; label: string; parts: MeterPart[]; share: number; text: string; why: string }[];
  weakest?: { key: string; label: string };
  sentence: string;
  weakestSentence?: string;
  change?: number;
}

const GR5_NAMING = { the: 'de GR5', your: 'je GR5' };

// De ene rekenregel voor het doel met de mijlpalen: Je stand en de Ascend-tab lezen allebei deze.
export function computeMainGoalReadiness(requirements: GoalRequirement[], logs: SessionLog[], today: string): GoalReadiness {
  return computeGoalReadiness({ kind: 'trek_hut', requirements }, logs, today, { naming: GR5_NAMING, homeDays: THUIS_DAGEN_OP_RIJ });
}
