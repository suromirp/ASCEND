// ASCEND: het menu van het uitlegblad van een training (docs/ontwerp/uitlegblad-training.md).
//
// Welke rijen in welke groep staan, en de ene regel onder een rij. Puur: de component krijgt de
// groepen terug en tekent alleen. De voorwaarden zijn die van het blad voor de herindeling
// (plan, weken, Te zwaar, varianten, plekken); alleen "Achtergrond en bronnen" verdwijnt nu als er
// niets te lezen valt. Dit plant niets en verandert geen training.
//
// Sinds 11 november (docs/beslissingen/2026-11-11-info-blad-horloge.md) staan de Garmin-stappen, de
// datavelden en de opmerking over hartslagzones in het blad Je horloge (engine/watchSheet.ts), niet hier.

import type { WorkoutPlan } from './workoutPlan';

export type GuideRowId = 'stappen' | 'teZwaar' | 'varianten' | 'plekken' | 'weken' | 'achtergrond';
export type GuideGroupId = 'doen' | 'waar' | 'achtergrond';

export interface GuideRowSpec {
  id: GuideRowId;
  title: string;
  // Hoogstens één regel eronder: een feit.
  sub?: string;
  // Een rij die het blad verlaat: een pagina in plaats van een onderblad.
  page: boolean;
}

export interface GuideGroup {
  id: GuideGroupId;
  title: string;
  rows: GuideRowSpec[];
}

export interface GuideMenuInput {
  plan?: Pick<WorkoutPlan, 'totalMinutes' | 'items' | 'weeks'>;
  easeOffCount: number;
  modalityCount: number;
  showSpots: boolean;
  // De delen, het materiaal en de bronnen van "Achtergrond en bronnen".
  backgroundCount: number;
  hasGear: boolean;
  sourceCount: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function planStepCount(items: WorkoutPlan['items']): number {
  return items.reduce((sum, item) => sum + ('step' in item ? 1 : item.steps.length), 0);
}

export function guideMenu(input: GuideMenuInput): GuideGroup[] {
  const { plan } = input;
  const doen: GuideRowSpec[] = [];
  if (plan) doen.push({ id: 'stappen', title: 'De stappen', sub: `±${plan.totalMinutes} min, ${plural(planStepCount(plan.items), 'stap', 'stappen')}`, page: false });
  if (input.easeOffCount > 0) doen.push({ id: 'teZwaar', title: 'Te zwaar? Zo pas je het aan', page: false });

  const waar: GuideRowSpec[] = [];
  if (input.modalityCount > 0) waar.push({ id: 'varianten', title: 'Waar train je het best?', sub: plural(input.modalityCount, 'optie', 'opties'), page: false });
  if (input.showSpots) waar.push({ id: 'plekken', title: 'Waar kun je dit doen?', page: true });

  const achtergrond: GuideRowSpec[] = [];
  if (plan && plan.weeks.length > 0) {
    const now = plan.weeks.find((w) => w.current);
    achtergrond.push({ id: 'weken', title: 'Deze fase, week voor week', sub: now ? `Week ${now.week} van ${plan.weeks.length}` : undefined, page: false });
  }
  if (input.backgroundCount > 0 || input.hasGear || input.sourceCount > 0) {
    const parts = [
      input.backgroundCount > 0 ? plural(input.backgroundCount, 'deel', 'delen') : '',
      input.sourceCount > 0 ? plural(input.sourceCount, 'bron', 'bronnen') : '',
    ].filter(Boolean);
    achtergrond.push({ id: 'achtergrond', title: 'Achtergrond en bronnen', sub: parts.length > 0 ? parts.join(', ') : undefined, page: false });
  }

  const groups: GuideGroup[] = [
    { id: 'doen', title: 'Wat je doet', rows: doen },
    { id: 'waar', title: 'Waar en waarmee', rows: waar },
    { id: 'achtergrond', title: 'Achtergrond', rows: achtergrond },
  ];
  // Een groep zonder zichtbare rijen toont ook de kop niet.
  return groups.filter((g) => g.rows.length > 0);
}
