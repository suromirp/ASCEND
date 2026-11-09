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

import { LADDER_PLACE, SKILL_LADDERS, skillLadderById, type SkillLadder } from '../data/skillLadders';
import { exerciseById } from '../data/exercises';
import type { SessionLog, SessionTemplate } from '../models/training';
import type { SkillGoal, SkillGoalStore, SkillStepMilestone, SkillStepProgress } from '../models/skillGoals';
import { forgeSlotsFor } from './forgeSlots';
import { ladderState, type LadderState } from './skillLadder';
import { slotExerciseId, type StepSwaps } from './stepSwaps';
import type { StoredStrengthProgram } from './strengthProgramStore';

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

// Een algemeen doel valt hier uitdrukkelijk buiten, ook als er ooit een ladder 'algemeen' komt: het volgt meerdere
// ladders, dus de sleutel `goalId|stap` van newSkillStepProgress zou tussen ladders botsen; het krijgt nooit rijen.
export const liveSkillGoals = (store: SkillGoalStore): SkillGoal[] => store.goals.filter((g) => !g.removedAt && !g.general && !!skillLadderById(g.ladderId));

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
// Zonder logs op de ladder begint hij bij de stap waar je plan al op staat (`start`), anders bij de eerste.
export function defaultTargetStep(ladder: SkillLadder, state: Pick<LadderState, 'current'>, start?: number): number {
  if (state.current === null) return start === undefined ? 1 : Math.min(start + 1, ladder.steps.length);
  return Math.min(state.current + 1, ladder.steps.length);
}

// De hoogste stap per ladder waar je plan al op staat: een oefening van een ladder in een van je krachttrainingen
// (met de stappen die je met Akkoord koos). Voor een ladder zonder logs is dat waar je begint.
export function planStartSteps(templates: readonly SessionTemplate[], model: { program?: StoredStrengthProgram; stepSwaps?: StepSwaps } | undefined, date: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const template of templates) {
    for (const slot of forgeSlotsFor(template, model, date)) {
      const id = slotExerciseId(slot);
      const place = id ? LADDER_PLACE.get(id) : undefined;
      if (place && place.step > (out.get(place.id) ?? 0)) out.set(place.id, place.step);
    }
  }
  return out;
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

// --- algemeen sterk met eigen gewicht ----------------------------------------------------------------
// De tweede vorm van het doel Calisthenics: vijf basisladders tegelijk, zonder doelstap en zonder datum. Het plant
// niets en schrijft geen SkillStepProgress (zie liveSkillGoals). "Hoger" telt tegen de stap bij de start.

// Bewust geen bestaande ladder: een oudere app verbergt het doel dan (liveSkillGoals) en bewaart het ongewijzigd.
export const GENERAL_LADDER_ID = 'algemeen';
export const GENERAL_GOAL_NAME = 'Algemeen sterk met eigen gewicht';
export const GENERAL_LADDER_IDS: readonly string[] = ['push-up', 'pull-up', 'dip', 'pistol', 'l-sit'];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Een doel met een `general` van een geldige vorm: ladders als tekst (minstens één), een dag en een baseline.
export function isGeneralGoal(goal: SkillGoal): boolean {
  const g: unknown = goal.general;
  if (!isPlainObject(g)) return false;
  return Array.isArray(g.ladderIds) && g.ladderIds.some((id) => typeof id === 'string' && id.length > 0)
    && isRealDay(g.startDate) && isPlainObject(g.baseline);
}

// Een echte dag: JJJJ-MM-DD die als datum terugkomt (geen 31 februari).
function isRealDay(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DAY.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Het ene levende algemene doel; bij meer dan één het oudste (createdAt, dan id). Undefined als er geen is.
export function liveGeneralGoal(store: SkillGoalStore): SkillGoal | undefined {
  const live = store.goals.filter((g) => !g.removedAt && isGeneralGoal(g));
  live.sort((a, b) => (a.createdAt !== b.createdAt ? (a.createdAt < b.createdAt ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return live[0];
}

export interface GeneralGoalInput {
  id: string;
  now: string;
  // De lokale dag van Akkoord.
  today: string;
  logs: readonly SessionLog[];
}

// Het algemene doel, met per ladder de stap van nu als baseline (0 als er nog geen training op die ladder is).
export function buildGeneralGoal(input: GeneralGoalInput): SkillGoal {
  const baseline: Record<string, number> = {};
  for (const id of GENERAL_LADDER_IDS) {
    const ladder = skillLadderById(id);
    baseline[id] = ladder ? ladderState(ladder, input.logs, input.today).current ?? 0 : 0;
  }
  return {
    id: input.id, name: GENERAL_GOAL_NAME, ladderId: GENERAL_LADDER_ID, targetStep: 1, createdAt: input.now, updatedAt: input.now,
    general: { ladderIds: [...GENERAL_LADDER_IDS], startDate: input.today, baseline },
  };
}

// De stap waartegen "hoger" telt. Een bewaarde stap van minstens 1: die. Bij 0 of zonder: de stap op de startdag
// uit de logs van nu (een log van voor de start kan later binnenkomen, via een import of een koppeling), en anders
// de stap van de eerste trainingsdag na de start tot en met `today` waarop de ladder een stap gaf. Zo is een eerste
// Pull-Up op stap 4 niet meteen "een stap hoger". Undefined zonder zo'n training.
export function generalBaseline(goal: SkillGoal, ladder: SkillLadder, logs: readonly SessionLog[], today: string): number | undefined {
  const stored = goal.general?.baseline?.[ladder.id];
  if (typeof stored === 'number' && Number.isInteger(stored) && stored >= 1) return stored;
  const own = logsOnLadder(ladder, logs);
  const start = goal.general?.startDate;
  if (typeof start === 'string' && start <= today) {
    const atStart = ladderState(ladder, own, start).current;
    if (atStart !== null) return atStart;
  }
  const days = [...new Set(own.map((l) => l.completedDate).filter((d): d is string => typeof d === 'string' && d <= today && (typeof start !== 'string' || d > start)))].sort();
  for (const day of days) {
    const current = ladderState(ladder, own, day).current;
    if (current !== null) return current;
  }
  return undefined;
}
