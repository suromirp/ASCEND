import type { TrainingGoal } from '../models/goals';

// Het hoofddoel is het doel met de Ascent Ladder (mijlpalen). Dit is de enige
// plek waar die zoekregel staat. Drie varianten, omdat de plekken die hem
// gebruikten niet allemaal hetzelfde vroegen:
//  - 'active'      alleen een actief doel (planning, fasen, weekvraag)
//  - 'live'        elk doel dat niet gearchiveerd is (schermen, samenvatting)
//  - 'activeFirst' een actief doel, anders een niet gearchiveerd doel (rugzakdoel)
export type MainGoalScope = 'active' | 'live' | 'activeFirst';

export type Ladder = ReadonlySet<string> | readonly { goalId: string }[];

function ladderIds(milestones: Ladder): ReadonlySet<string> {
  if (Array.isArray(milestones)) return new Set((milestones as readonly { goalId: string }[]).map((m) => m.goalId));
  return milestones as ReadonlySet<string>;
}

export function mainGoal<G extends Pick<TrainingGoal, 'id' | 'status'>>(
  goals: readonly G[],
  milestones: Ladder,
  scope: MainGoalScope = 'active',
): G | undefined {
  const ids = ladderIds(milestones);
  const active = () => goals.find((g) => g.status === 'active' && ids.has(g.id));
  const live = () => goals.find((g) => g.status !== 'archived' && ids.has(g.id));
  if (scope === 'active') return active();
  if (scope === 'live') return live();
  return active() ?? live();
}

// TODO: het marathondoel wordt op naam herkend; een eigen soort of veld op het
// doel is robuuster. Tot dan staat de naamvergelijking alleen hier.
export const MARATHON_GOAL_NAME = 'Marathon';
export function isMarathonGoal(goal: Pick<TrainingGoal, 'name'>): boolean {
  return goal.name === MARATHON_GOAL_NAME;
}
