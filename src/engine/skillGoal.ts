// ASCEND: het doel Vaardigheid, puur (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md).
//
// Een vaardigheid is een doelstap op een ladder. De mijlpalen zijn de stappen tot en met de doelstap
// (`skillStep`, afgeleid uit het doel). Of een stap gehaald is komt uit de logs, met dezelfde regels als
// engine/skillLadder.ts#ladderState: een stap is gehaald als je de toets erop haalde, of als je de onderkant van
// een zwaardere stap haalde. Een gehaalde stap wordt één keer als SkillStepProgress bewaard en daarna nooit
// herschreven, zodat hij gehaald blijft als de toets of de ladder later verandert.
//
// Dit bestand plant niets, verandert geen log en leest geen TrainingGoal: een vaardigheid stuurt de planning
// niet en wordt nooit het hoofddoel. Puur: geen React, geen opslag.

import { SKILL_LADDERS, skillLadderById, type SkillLadder } from '../data/skillLadders';
import { exerciseById } from '../data/exercises';
import type { SessionLog } from '../models/training';
import type { SkillGoal, SkillGoalStore, SkillStepMilestone, SkillStepProgress } from '../models/skillGoals';
import { ladderState, type LadderState } from './skillLadder';

// De naam van een stap: de naam van de oefening, zoals Forge hem toont.
export function skillStepName(ladder: SkillLadder, step: number): string {
  const id = ladder.steps[step - 1]?.exerciseId;
  return (id && exerciseById(id)?.name) || `Stap ${step}`;
}

// De mijlpalen van een vaardigheid: één per ladderstap tot en met de doelstap. Een onbekende ladder heeft er geen.
export function skillStepMilestones(goal: Pick<SkillGoal, 'ladderId' | 'targetStep'>): SkillStepMilestone[] {
  const ladder = skillLadderById(goal.ladderId);
  if (!ladder) return [];
  const last = Math.min(goal.targetStep, ladder.steps.length);
  return ladder.steps.slice(0, Math.max(0, last)).map((s, i) => ({ kind: 'skillStep', ladderId: ladder.id, step: i + 1, exerciseId: s.exerciseId }));
}

// Alleen de logs met een oefening op deze ladder: de rest verandert de stand niet.
function logsOnLadder(ladder: SkillLadder, logs: readonly SessionLog[]): SessionLog[] {
  const ids = new Set(ladder.steps.map((s) => s.exerciseId));
  return logs.filter((l) => !!l && Array.isArray(l.strengthData) && l.strengthData.some((e) => !!e && ids.has(e.exerciseId)));
}

// Per stap de eerste dag waarop hij gehaald was, uit de logs tot en met `today`. Een log van na vandaag telt niet;
// een training van vandaag wel (hij is gedaan). Elke trainingsdag wordt gelezen zoals ladderState hem die dag las.
export function clearedSkillSteps(ladder: SkillLadder, logs: readonly SessionLog[], today: string): Map<number, string> {
  const own = logsOnLadder(ladder, logs);
  const days = [...new Set(own.map((l) => l.completedDate).filter((d): d is string => typeof d === 'string' && d <= today))].sort();
  const cleared = new Map<number, string>();
  for (const day of days) {
    const state = ladderState(ladder, own, day);
    if (state.current === null) continue;
    const top = state.passed ? state.current : state.current - 1;
    for (let step = 1; step <= top; step++) if (!cleared.has(step)) cleared.set(step, day);
  }
  return cleared;
}

export const liveSkillGoals = (store: SkillGoalStore): SkillGoal[] => store.goals.filter((g) => !g.removedAt && !!skillLadderById(g.ladderId));

// De rijen die erbij komen: een gehaalde stap van een doel die nog geen rij heeft. Bestaande rijen blijven zoals
// ze zijn; een stap met een rij krijgt nooit een tweede.
export function newSkillStepProgress(store: SkillGoalStore, logs: readonly SessionLog[], today: string, newId: () => string): SkillStepProgress[] {
  const have = new Set(store.progress.map((p) => `${p.goalId}|${p.step}`));
  const out: SkillStepProgress[] = [];
  const perLadder = new Map<string, Map<number, string>>();
  for (const goal of liveSkillGoals(store)) {
    const ladder = skillLadderById(goal.ladderId)!;
    if (!perLadder.has(ladder.id)) perLadder.set(ladder.id, clearedSkillSteps(ladder, logs, today));
    const cleared = perLadder.get(ladder.id)!;
    for (const m of skillStepMilestones(goal)) {
      const day = cleared.get(m.step);
      if (!day || have.has(`${goal.id}|${m.step}`)) continue;
      out.push({ id: newId(), goalId: goal.id, ladderId: ladder.id, step: m.step, exerciseId: m.exerciseId, clearedDate: day });
      have.add(`${goal.id}|${m.step}`);
    }
  }
  return out;
}

// De stappen die al een vaardigheid zijn ("ladder|stap"): een tweede doel met dezelfde ladder en doelstap kan niet.
export function takenSkillSteps(store: SkillGoalStore): Set<string> {
  return new Set(liveSkillGoals(store).map((g) => `${g.ladderId}|${g.targetStep}`));
}

// De doelstap die het blad voorstelt: `preferred` als die vrij is, anders de eerste vrije stap erboven, dan eronder.
// Undefined als elke stap van de ladder al een vaardigheid is.
export function freeTargetStep(ladder: SkillLadder, preferred: number, taken: ReadonlySet<string>): number | undefined {
  const free = (n: number) => !taken.has(`${ladder.id}|${n}`);
  for (let n = preferred; n <= ladder.steps.length; n++) if (free(n)) return n;
  for (let n = preferred - 1; n >= 1; n--) if (free(n)) return n;
  return undefined;
}

// De doelstap die het blad voorstelt: de stap boven je huidige, of de eerste stap zonder training.
export function defaultTargetStep(ladder: SkillLadder, state: Pick<LadderState, 'current'>): number {
  if (state.current === null) return 1;
  return Math.min(state.current + 1, ladder.steps.length);
}

export interface SkillGoalInput {
  id: string;
  now: string;
  ladderId: string;
  targetStep: number;
}

// Het doel uit de keuze in het blad. Undefined bij een ladder of stap die niet bestaat.
export function buildSkillGoal(input: SkillGoalInput): SkillGoal | undefined {
  const ladder = skillLadderById(input.ladderId);
  if (!ladder || !Number.isInteger(input.targetStep) || input.targetStep < 1 || input.targetStep > ladder.steps.length) return undefined;
  return { id: input.id, name: skillStepName(ladder, input.targetStep), ladderId: ladder.id, targetStep: input.targetStep, createdAt: input.now, updatedAt: input.now };
}

// Twee opslagen samen (een back-up inlezen). De doelen per id: bij Vervangen die van het bestand, anders die van
// het toestel. De gehaalde stappen worden altijd samengevoegd: een rij gaat nooit weg en een stap van een doel die
// al een rij heeft krijgt er geen tweede.
export function mergeSkillStores(current: SkillGoalStore, incoming: SkillGoalStore, replace: boolean): SkillGoalStore {
  const goals = new Map<string, SkillGoal>();
  const [first, second] = replace ? [current.goals, incoming.goals] : [incoming.goals, current.goals];
  for (const g of first) goals.set(g.id, g);
  for (const g of second) goals.set(g.id, g);
  const progress = [...current.progress];
  const ids = new Set(progress.map((p) => p.id));
  const steps = new Set(progress.map((p) => `${p.goalId}|${p.step}`));
  for (const p of incoming.progress) {
    if (ids.has(p.id) || steps.has(`${p.goalId}|${p.step}`)) continue;
    progress.push(p);
    ids.add(p.id);
    steps.add(`${p.goalId}|${p.step}`);
  }
  return { goals: [...goals.values()], progress };
}

export const SKILL_LADDER_CHOICES = SKILL_LADDERS.map((l) => ({ id: l.id, name: l.name }));
