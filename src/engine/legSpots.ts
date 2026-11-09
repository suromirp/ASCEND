// ASCEND: welke plekken van het lichaam bij de benen horen. Eén lijst voor INJURY-LEGS
// (engine/adviceEngine.ts) en voor spierpijn in de benen (engine/legSoreness.ts), zodat een
// nieuwe beenplek op één plek bijkomt. Puur.

import type { InjuryNote } from '../models/injury';
import { isOpenOn, isSoreness } from './injuryKind';

export const LEG_BODY_PARTS = ['knie', 'enkel', 'heup', 'hamstring', 'kuit', 'voet', 'achilles', 'quadriceps', 'scheen', 'bil', 'been', 'benen'];

// Een melding staat onder de naam van de plek met de kant erachter ("Knie links").
export function isLegSpot(bodyPart: string): boolean {
  const name = bodyPart.toLowerCase();
  return LEG_BODY_PARTS.some((p) => name.includes(p));
}

// Een klacht aan een knie of been op Matig of erger staat open: de planning kiest dan geen sprints met afdalen
// (zonder sportschool, Heuvels in de buurt; engine/noGym.ts). Spierpijn en stijf tellen niet mee, ze zijn geen klacht
// voor de planning (engine/bodyMap.ts#isOpen).
export function legComplaintOpen(notes: InjuryNote[], today: string): boolean {
  return notes.some((n) => isOpenOn(n, today) && !isSoreness(n) && n.severity !== 'licht' && isLegSpot(n.bodyPart));
}
