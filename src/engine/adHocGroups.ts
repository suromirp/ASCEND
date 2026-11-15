// ASCEND: de sjablonen in het blad Losse training, in kopjes per sport (components/AdHocLogSheet.tsx).
// Wandelen staat bovenaan: een wandeling achteraf loggen was onvindbaar onder alle hardloopsjablonen
// (eigenaar, 15 november). Binnen een kopje op naam. Puur; plant niets.

import type { SessionTemplate } from '../models/training';
import { SPORT_LABEL, templateSport } from './sports';

export type AdHocGroupKey = 'hiking' | 'running' | 'cycling' | 'strength' | 'other';

// De vaste volgorde van de kopjes.
export const AD_HOC_GROUP_ORDER: readonly AdHocGroupKey[] = ['hiking', 'running', 'cycling', 'strength', 'other'];

const GROUP_LABEL: Record<AdHocGroupKey, string> = {
  hiking: SPORT_LABEL.hiking,
  running: SPORT_LABEL.running,
  cycling: SPORT_LABEL.cycling,
  strength: 'Kracht',
  other: 'Overig',
};

// Kracht is een soort, geen sport; herstel, een tocht zonder sport en een sport die alleen telt vallen onder Overig.
export function adHocGroupOf(template: SessionTemplate): AdHocGroupKey {
  if (template.type === 'strength') return 'strength';
  const sport = templateSport(template);
  return sport === 'hiking' || sport === 'running' || sport === 'cycling' ? sport : 'other';
}

export interface AdHocGroup {
  key: AdHocGroupKey;
  label: string;
  templates: SessionTemplate[];
}

// Alleen kopjes met iets erin.
export function adHocGroups(templates: SessionTemplate[]): AdHocGroup[] {
  return AD_HOC_GROUP_ORDER.flatMap((key) => {
    const list = templates.filter((t) => adHocGroupOf(t) === key).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    return list.length > 0 ? [{ key, label: GROUP_LABEL[key], templates: list }] : [];
  });
}
