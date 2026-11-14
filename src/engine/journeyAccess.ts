// ASCEND: wie de tochtschermen mag openen. Reisplanner, Paklijst, Etappes en Alleen onderweg
// horen bij een doel van de soort Trektocht (hutten of tent). Zonder zo'n doel zijn er geen
// ingangen, geen zoekresultaten, en valt een direct adres terug. Puur.

import type { GoalKindId, TrainingGoal } from '../models/goals';
import { goalKindOf } from './goalLabels';
import { listedGoals } from './goalList';

export const isTrekKind = (kind: GoalKindId): boolean => kind === 'trek_hut' || kind === 'trek_tent';

// Is er een doel dat een tocht is? Een hoofddoel zonder soort (van voor de soorten) telt als
// tocht, zoals de doelkaart dat ook doet.
export function hasTrekGoal(goals: readonly TrainingGoal[], ladderGoalIds: ReadonlySet<string>, today: string): boolean {
  return listedGoals(goals, ladderGoalIds, today).some(({ goal, isMain }) => {
    const kind = goalKindOf(goal) ?? (isMain ? 'trek_hut' : undefined);
    return !!kind && isTrekKind(kind);
  });
}

// De instellingen die alleen een verwijzing naar een tochtscherm zijn.
const JOURNEY_LINK_IDS: ReadonlySet<string> = new Set(['reisplanner', 'paklijst']);

export function isJourneyLink(settingId: string): boolean {
  return JOURNEY_LINK_IDS.has(settingId);
}

// In het zoekveld: zonder trekdoel staan de verwijzingen naar de tochtschermen er niet tussen.
export function visibleInSearch<T extends { id: string }>(items: readonly T[], trekGoal: boolean): T[] {
  return trekGoal ? [...items] : items.filter((i) => !isJourneyLink(i.id));
}

export const NO_TREK_LINE = 'Dit scherm hoort bij een tocht. Zodra je een tocht als doel hebt, vind je het bij je doel op Ascend.';
