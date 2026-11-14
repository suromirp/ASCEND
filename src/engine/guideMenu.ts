// ASCEND: de lijst van het blad Waarom deze training (het oude Info-blad), richting A van
// docs/visie/Ontwerp Info-blad.md.
//
// Welke rijen er staan, en de ene regel onder een rij. Puur: de component krijgt de rijen terug en
// tekent alleen. Dit plant niets en verandert geen training.
//
// Sinds 11 november staan de Garmin-stappen, de datavelden en de opmerking over hartslagzones in het
// blad Je horloge (engine/watchSheet.ts). Sinds 14 november (docs/beslissingen/2026-11-14-info-blad-a.md)
// staan De stappen en Waar kun je dit doen? op het trainingsscherm en in de Briefing, niet meer hier:
// het blad houdt alleen wat je wilt begrijpen, als één lijst zonder groepskoppen.

import type { WorkoutPlan } from './workoutPlan';

export type GuideRowId = 'teZwaar' | 'varianten' | 'weken' | 'achtergrond';

export interface GuideRowSpec {
  id: GuideRowId;
  title: string;
  // Hoogstens één regel eronder: een feit.
  sub?: string;
  // Een rij die het blad verlaat: een pagina in plaats van een onderblad. Hier nu nooit.
  page: boolean;
}

export interface GuideMenuInput {
  plan?: Pick<WorkoutPlan, 'weeks'>;
  easeOffCount: number;
  modalityCount: number;
  // De delen, het materiaal en de bronnen van "Achtergrond en bronnen".
  backgroundCount: number;
  hasGear: boolean;
  sourceCount: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Hoogstens vier rijen: Te zwaar, Waar train je het best, Deze fase, Achtergrond en bronnen.
export function guideMenu(input: GuideMenuInput): GuideRowSpec[] {
  const { plan } = input;
  const rows: GuideRowSpec[] = [];
  if (input.easeOffCount > 0) rows.push({ id: 'teZwaar', title: 'Te zwaar? Zo pas je het aan', page: false });
  if (input.modalityCount > 0) rows.push({ id: 'varianten', title: 'Waar train je het best?', sub: plural(input.modalityCount, 'optie', 'opties'), page: false });
  if (plan && plan.weeks.length > 0) {
    const now = plan.weeks.find((w) => w.current);
    rows.push({ id: 'weken', title: 'Deze fase, week voor week', sub: now ? `Week ${now.week} van ${plan.weeks.length}` : undefined, page: false });
  }
  if (input.backgroundCount > 0 || input.hasGear || input.sourceCount > 0) {
    const parts = [
      input.backgroundCount > 0 ? plural(input.backgroundCount, 'deel', 'delen') : '',
      input.sourceCount > 0 ? plural(input.sourceCount, 'bron', 'bronnen') : '',
    ].filter(Boolean);
    rows.push({ id: 'achtergrond', title: 'Achtergrond en bronnen', sub: parts.length > 0 ? parts.join(', ') : undefined, page: false });
  }
  return rows;
}
