// Opslag van het doel Vaardigheid (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md): één sleutel in
// de meta-opslag met de doelen en de gehaalde stappen. Elke schrijfactie leest wat er nu staat en schrijft de hele
// opslag in één put: een fout halverwege laat de oude opslag staan. De schrijfacties lopen achter elkaar (een keten
// op moduleniveau), zodat een tweede schrijfactie nooit een oudere stand terugschrijft over een nieuwere heen.
//
// Een gehaalde stap (SkillStepProgress) wordt alleen toegevoegd; een doel weghalen zet `removedAt` en laat de
// gehaalde stappen en de logs ongemoeid. Niets hier raakt de planning, een TrainingGoal of een log.

import { MetaRepo } from './database';
import { readSkillGoalStore } from './migrationsSkill';
import { newSkillStepProgress } from '../engine/skillGoal';
import type { SessionLog } from '../models/training';
import type { SkillGoal, SkillGoalStore } from '../models/skillGoals';
import { makeId } from '../utils/id';

export const SKILL_GOALS_KEY = 'skillGoals';

// Wat de opslag nodig heeft; de tests geven er een eigen in om een fout halverwege na te spelen.
export interface SkillGoalsMeta {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<unknown>;
}

const metaRepo: SkillGoalsMeta = { get: (key) => MetaRepo.get<unknown>(key), set: (key, value) => MetaRepo.set(key, value) };

// De keten: elke schrijfactie wacht tot de vorige klaar is, ook als die mislukte.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

export async function loadSkillGoals(meta: SkillGoalsMeta = metaRepo): Promise<SkillGoalStore> {
  return readSkillGoalStore(await meta.get(SKILL_GOALS_KEY));
}

// Een nieuw doel, na Akkoord. De stappen die je al haalde komen in dezelfde put mee.
export async function addSkillGoal(goal: SkillGoal, logs: readonly SessionLog[], today: string, meta: SkillGoalsMeta = metaRepo): Promise<SkillGoalStore> {
  return serial(async () => {
    const store = await loadSkillGoals(meta);
    const withGoal: SkillGoalStore = { goals: [...store.goals.filter((g) => g.id !== goal.id), goal], progress: store.progress };
    const next: SkillGoalStore = { ...withGoal, progress: [...withGoal.progress, ...newSkillStepProgress(withGoal, logs, today, () => makeId('skillstep'))] };
    await meta.set(SKILL_GOALS_KEY, next);
    return next;
  });
}

// Een doel weghalen: het verdwijnt van Ascend; gehaalde stappen en logs blijven.
export async function removeSkillGoal(id: string, now: string, meta: SkillGoalsMeta = metaRepo): Promise<SkillGoalStore> {
  return serial(async () => {
    const store = await loadSkillGoals(meta);
    if (!store.goals.some((g) => g.id === id && !g.removedAt)) return store;
    const next: SkillGoalStore = { goals: store.goals.map((g) => (g.id === id ? { ...g, removedAt: now, updatedAt: now } : g)), progress: store.progress };
    await meta.set(SKILL_GOALS_KEY, next);
    return next;
  });
}

// De stappen die je sinds de vorige keer haalde, als rij erbij. Schrijft alleen als er iets bij komt.
export async function recordSkillSteps(logs: readonly SessionLog[], today: string, meta: SkillGoalsMeta = metaRepo): Promise<SkillGoalStore> {
  return serial(async () => {
    const store = await loadSkillGoals(meta);
    const rows = newSkillStepProgress(store, logs, today, () => makeId('skillstep'));
    if (rows.length === 0) return store;
    const next: SkillGoalStore = { goals: store.goals, progress: [...store.progress, ...rows] };
    await meta.set(SKILL_GOALS_KEY, next);
    return next;
  });
}
