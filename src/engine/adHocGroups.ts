// ASCEND: Losse training in twee stappen (components/AdHocLogSheet.tsx). Stap 1 is de sport, vijf
// knoppen in een vaste volgorde: Wandelen, Hardlopen, Fietsen, Kracht, Anders. Daarna meteen loggen met de
// algemeenste training van die sport (adHocDefault); welke training precies kies je daarna nog
// (adHocChoices). Kracht en Anders hebben geen algemene training: daar kies je eerst. Puur; plant niets
// (besluit docs/beslissingen/2026-11-15-wandeling-plannen.md).

import type { SessionTemplate } from '../models/training';
import { SPORT_LABEL, templateSport } from './sports';
import { walkKind } from './routeTarget';

export type AdHocGroupKey = 'hiking' | 'running' | 'cycling' | 'strength' | 'other';

// De vaste volgorde van de vijf knoppen.
export const AD_HOC_GROUP_ORDER: readonly AdHocGroupKey[] = ['hiking', 'running', 'cycling', 'strength', 'other'];

export const AD_HOC_GROUP_LABEL: Record<AdHocGroupKey, string> = {
  hiking: SPORT_LABEL.hiking,
  running: SPORT_LABEL.running,
  cycling: SPORT_LABEL.cycling,
  strength: 'Kracht',
  other: 'Anders',
};

// De algemeenste training per sport, als standaard. Wandelen: de gewone Wandeling (de herstelwandeling
// blijft kiesbaar bij Welke training precies?). Hardlopen: de rustige duurloop. Fietsen: de fietstocht (de enige).
// Kracht en Anders: geen, je kiest zelf.
export const AD_HOC_DEFAULT_ID: Partial<Record<AdHocGroupKey, string>> = {
  hiking: 'tpl_walk',
  running: 'tpl_easy_run',
  cycling: 'tpl_bike',
};

// Kracht is een soort, geen sport. Een herstelwandeling is een wandeling (routeTarget.ts#walkKind), de
// rest van herstel, een tocht zonder sport en een sport die alleen telt vallen onder Anders.
export function adHocGroupOf(template: SessionTemplate): AdHocGroupKey {
  if (template.type === 'strength') return 'strength';
  if (walkKind(template) === 'recovery') return 'hiking';
  const sport = templateSport(template);
  return sport === 'hiking' || sport === 'running' || sport === 'cycling' ? sport : 'other';
}

// De trainingen van een sport, op naam: de lijst achter Welke training precies?, en voor Kracht en Anders de stap 2.
export function adHocChoices(templates: SessionTemplate[], key: AdHocGroupKey): SessionTemplate[] {
  return templates.filter((t) => adHocGroupOf(t) === key).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
}

// Wat rustig is: geen zware, test-, wedstrijd-, begin- of afdaaltraining.
const NOT_CALM = new Set(['hard_run', 'hard_load', 'hard_effort', 'test', 'race', 'start_only', 'descent', 'ruck', 'long']);

// De standaard van een sport: de vaste training als die er is, anders de kortste rustige van die sport,
// anders geen. Kracht en Anders hebben nooit een standaard.
export function adHocDefault(templates: SessionTemplate[], key: AdHocGroupKey): SessionTemplate | undefined {
  if (key === 'strength' || key === 'other') return undefined;
  const list = adHocChoices(templates, key);
  const fixed = list.find((t) => t.id === AD_HOC_DEFAULT_ID[key]);
  if (fixed) return fixed;
  const calm = list.filter((t) => !(t.roles ?? []).some((r) => NOT_CALM.has(r)));
  return [...calm].sort((a, b) => (a.durationVariants?.full ?? 0) - (b.durationVariants?.full ?? 0))[0];
}

// Alleen knoppen voor een sport met minstens één training.
export function adHocGroups(templates: SessionTemplate[]): AdHocGroupKey[] {
  return AD_HOC_GROUP_ORDER.filter((key) => templates.some((t) => adHocGroupOf(t) === key));
}
