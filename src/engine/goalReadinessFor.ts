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
//   een vaardigheid (SkillGoal)  skillReadinessFor: de ladder als trap uit ladderState, geen percentage
//     (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md)
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
import type { SkillGoal, SkillStepProgress } from '../models/skillGoals';
import { skillLadderById, type SkillTest } from '../data/skillLadders';
import { formatDayMonthNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { ladderState } from './skillLadder';
import { clearedSkillSteps, skillStepMilestones, skillStepName } from './skillGoal';

// Hoe een doel in de zinnen heet ("die je tocht vraagt").
const GOAL_NAMING: Record<GoalKindId, string> = {
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

// --- een vaardigheid -------------------------------------------------------------------------------
// Een vaardigheid (models/skillGoals.ts) is geen TrainingGoal en krijgt geen percentage: de kaart toont de ladder
// als trap, het werk op je huidige stap en één droge regel. De stand komt uit ladderState; een stap is gehaald
// als er een rij voor is (bewaard, nooit herschreven) of als de logs hem nu gehaald noemen.

export interface SkillStepView {
  step: number;
  name: string;
  // Gehaald, de stap waar je aan werkt, of nog niet aan de beurt.
  status: 'cleared' | 'current' | 'ahead';
  clearedDate?: string;
  target: boolean;
}

export interface SkillReadiness {
  goalId: string;
  ladderId: string;
  ladderName: string;
  targetStep: number;
  targetName: string;
  // Stap 1 tot en met de doelstap.
  steps: SkillStepView[];
  // De stap uit ladderState (de zwaarste met de onderkant in je laatste training), of null.
  current: number | null;
  reached: boolean;
  // Het werk: waar je nu op traint en de toets.
  work: string;
  // Eén droge regel, geen oordeel over het doel.
  line: string;
}

function testText(test: SkillTest): string {
  if (test.kind === 'hold') return `${test.sets} keer ${test.seconds} seconden`;
  return `${test.sets} keer ${test.reps}${test.addedKg !== undefined ? ` met ${formatNumberNL(test.addedKg)} kg extra` : ''}`;
}

export function skillReadinessFor(goal: SkillGoal, logs: readonly SessionLog[], today: string, progress: readonly SkillStepProgress[]): SkillReadiness | undefined {
  const ladder = skillLadderById(goal.ladderId);
  const milestones = skillStepMilestones(goal);
  if (!ladder || milestones.length === 0) return undefined;
  const state = ladderState(ladder, logs, today);
  const derived = clearedSkillSteps(ladder, logs, today);
  const stored = new Map<number, string>();
  for (const p of progress) if (p.goalId === goal.id && !stored.has(p.step)) stored.set(p.step, p.clearedDate);
  const targetStep = milestones.length;
  const firstOpen = milestones.find((m) => !stored.has(m.step) && !derived.has(m.step))?.step;
  const steps: SkillStepView[] = milestones.map((m) => {
    const date = stored.get(m.step) ?? derived.get(m.step);
    const status = date ? 'cleared' : m.step === firstOpen ? 'current' : 'ahead';
    return { step: m.step, name: skillStepName(ladder, m.step), status, ...(date ? { clearedDate: date } : {}), target: m.step === targetStep };
  });
  const targetName = skillStepName(ladder, targetStep);
  const reached = firstOpen === undefined;
  const open = steps.filter((s) => s.status !== 'cleared').length;

  // Zonder training in de logs maar met bewaarde stappen (een back-up, een andere ladder): begin bij de eerste open stap,
  // zodat trap en werk hetzelfde zeggen.
  const start = firstOpen ?? 1;
  const anyCleared = steps.some((s) => s.status === 'cleared');
  const work = state.current === null
    ? `Begin bij ${skillStepName(ladder, start)}. Toets: ${testText(ladder.steps[start - 1].test)}.`
    : `Nu: ${skillStepName(ladder, state.current)}. Toets: ${testText(ladder.steps[state.current - 1].test)}.`;
  let line: string;
  if (reached) line = `Doelstap gehaald op ${formatDayMonthNL(steps[targetStep - 1].clearedDate!)}.`;
  else if (state.current === null && !anyCleared) line = 'Nog geen training op deze ladder.';
  else if (state.proposal?.kind === 'harder') line = `Toets gehaald. Volgende stap: ${skillStepName(ladder, state.proposal.step)}.`;
  else if (state.proposal?.kind === 'lighter') line = `Drie trainingen onder de onderkant. Lichtere stap: ${skillStepName(ladder, state.proposal.step)}.`;
  else line = open === 1 ? 'Je werkt aan je doelstap.' : `Nog ${open} stappen tot ${targetName}.`;

  return { goalId: goal.id, ladderId: ladder.id, ladderName: ladder.name, targetStep, targetName, steps, current: state.current, reached, work, line };
}
