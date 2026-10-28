// ASCEND, welke berekening van "Klaar voor je doel" bij welk doel hoort. Eén plek: de Ascend-kaart, het
// blad van het doel en wat er verder het getal van een doel toont lezen deze functie, zodat twee schermen
// nooit twee verschillende getallen voor hetzelfde doel geven.
//
//   het hoofddoel dat een tocht is (trek_hut, trek_tent) of geen soort heeft   computeMainGoalReadiness
//     (zoals Je stand); een hoofddoel van een andere soort krijgt hieronder de rekening van zijn soort
//   hardlopen met een afstand   computeRaceReadiness (met een doeltijd: snelheid als weken werk)
//   sterker worden              computeStrengthReadiness (krachttrend als weken werk)
//   dagtocht en trailrun        computeLimitReadiness (de voorwaarde tijdslimiet of cutoff)
//   al het andere               computeGoalReadiness
//
// Het verschil met vier weken terug (`since`): bij een hardloopwedstrijd, sterker worden, een dagtocht en een
// trailrun telt het pas als het doel zelf al vier weken bestond en toen een waarde had (`since` is de dag
// waarop het doel is gemaakt). De overige doelen en het doel met de mijlpalen krijgen geen `since`.
// Besluit: docs/beslissingen/2026-10-28-klaar-voor-je-doel-logisch-afwerking.md.
//
// Puur: geen React, geen opslag.

import type { GoalKindId, TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import type { TestJudgment } from '../models/testJudgment';
import { resolveGrowthChoice, resolveLimitMargin } from '../data/goalGrowth';
import { computeGoalReadiness, readinessInputOf } from './goalReadiness';
import { goalKindOf } from './goalLabels';
import { computeMainGoalReadiness } from './gr5Readiness';
import { computeLimitReadiness } from './limitReadiness';
import { computeRaceReadiness, resolveReadinessWeighting, type RaceReadiness } from './raceReadiness';
import { computeStrengthReadiness } from './strengthReadiness';

// Hoe een doel in de zinnen heet ("die je tocht vraagt").
export const GOAL_NAMING: Record<GoalKindId, string> = {
  trek_hut: 'je tocht', trek_tent: 'je tocht', day_hike: 'je bergtocht', mountaineering: 'je bergtocht', run_race: 'je wedstrijd',
  trail: 'je trailrun', bike: 'je fietsdoel', triathlon: 'je triathlon', stronger: 'je krachtdoel', fit: 'je beweegdoel',
};

// De instellingen die de getallen van een doel raken.
export interface ReadinessSettings {
  testJudgments?: TestJudgment[];
  askDoubtTest?: boolean;
  readinessWeighting?: unknown;
  goalGrowth?: unknown;
  limitMargin?: unknown;
}

export interface ReadinessForOptions {
  // Het hoofddoel (het doel met de mijlpalen). Is het een tocht met hutten of tent, of een doel zonder
  // soort, dan rekent het zoals Je stand; een ander soort hoofddoel krijgt de rekening van zijn eigen soort.
  isMain?: boolean;
}

// De mijlpalenrekening (GR5) is er alleen voor een tocht met hutten of tent en voor een doel zonder soort.
export function usesMilestoneReadiness(goal: TrainingGoal): boolean {
  const kind = goalKindOf(goal);
  return kind === undefined || kind === 'trek_hut' || kind === 'trek_tent';
}

export function goalReadinessFor(goal: TrainingGoal, logs: SessionLog[], today: string, settings: ReadinessSettings, options: ReadinessForOptions = {}): RaceReadiness | undefined {
  if (options.isMain && usesMilestoneReadiness(goal)) {
    const readiness = computeMainGoalReadiness(goal.requirements, logs, today);
    return readiness.percent === undefined ? undefined : readiness;
  }
  const input = readinessInputOf(goal);
  if (!input) return undefined;
  const naming = { the: GOAL_NAMING[input.kind], your: GOAL_NAMING[input.kind] };
  const growth = resolveGrowthChoice(settings.goalGrowth);
  const weighting = resolveReadinessWeighting(settings.readinessWeighting);
  if (input.kind === 'run_race') {
    const race = computeRaceReadiness(goal, logs, today, { naming, judgments: settings.testJudgments, ask: settings.askDoubtTest !== false, weighting, growth });
    if (race) return race;
  }
  if (input.kind === 'stronger') {
    const strength = computeStrengthReadiness(goal, logs, today, { naming, weighting, growth });
    if (strength) return strength;
  }
  if (input.kind === 'trail' || input.kind === 'day_hike') {
    const limit = computeLimitReadiness(goal, logs, today, { naming, growth, margin: resolveLimitMargin(settings.limitMargin) });
    if (limit) return limit;
  }
  return computeGoalReadiness(input, logs, today, { naming });
}
