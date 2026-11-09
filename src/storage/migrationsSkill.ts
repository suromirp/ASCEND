// Migratiestap voor het doel Vaardigheid (F4e, docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md).
//
// `skillGoals` is nieuw, optioneel en aanvullend: een back-up van daarvoor heeft het niet en leest gelijk (dan
// blijft het toestel zijn eigen houden). Daarom geen hogere schemaversie, net als `missedTraining` en `mornings`.
// Wat wel kan: een kapotte waarde. Die valt weg, nooit de hele back-up en nooit een fout:
// - een doel zonder id, zonder ladder of met een doelstap die geen geheel getal vanaf 1 is valt weg; een ladder die
//   deze versie niet kent of een doelstap boven de ladder blijft staan en wordt bij het tonen verborgen;
// - een rij van een gehaalde stap zonder id, doel, geldige stap of echte datum valt weg; een tweede rij voor
//   dezelfde stap van hetzelfde doel ook (een stap is één keer gehaald).
// Een rij van een doel dat weg is, blijft staan: gehaalde stappen worden nooit weggegooid.
//
// `SkillGoal.general` (het doel Algemeen sterk met eigen gewicht) is ook optioneel en aanvullend: een doel zonder
// leest precies als voorheen. Met een kapotte `general` valt het doel weg (geteld als overgeslagen); zie readGeneral.

import type { SkillGoal, SkillGoalStore, SkillStepProgress } from '../models/skillGoals';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isText = (v: unknown, max = 200): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Alleen de vorm: een id, een ladder als tekst en een doelstap als geheel getal vanaf 1. Een ladder die deze versie
// niet kent of een doelstap boven de ladder blijft ongewijzigd staan (ook velden van een nieuwere versie); het tonen
// verbergt hem (engine/skillGoal.ts#liveSkillGoals) of stopt bij de laatste stap (skillStepMilestones). Zo laat een
// lees-en-terugschrijfroute (toevoegen, weghalen, stappen bijschrijven) nooit een doel vallen.
function readGoal(raw: unknown): SkillGoal | undefined {
  if (!isRecord(raw)) return undefined;
  const { id, ladderId, targetStep } = raw;
  if (!isText(id) || !isText(ladderId, 60)) return undefined;
  if (typeof targetStep !== 'number' || !Number.isInteger(targetStep) || targetStep < 1) return undefined;
  // `general` (het algemene doel) blijft ongewijzigd staan, ook met een vorm die deze versie niet kent: een migratie
  // van een optioneel veld valideert om te tonen, nooit om op te schonen. Het tonen toetst de vorm
  // (engine/skillGoal.ts#isGeneralGoal) en verbergt wat niet klopt.
  return { ...raw } as unknown as SkillGoal;
}

function readProgress(raw: unknown): SkillStepProgress | undefined {
  if (!isRecord(raw)) return undefined;
  const { id, goalId, ladderId, step, exerciseId, clearedDate } = raw;
  if (!isText(id) || !isText(goalId) || !isText(ladderId, 60) || !isText(exerciseId, 80)) return undefined;
  if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > 50) return undefined;
  if (typeof clearedDate !== 'string' || !ISO_DATE.test(clearedDate)) return undefined;
  return { id, goalId, ladderId, step, exerciseId, clearedDate };
}

export interface SkillGoalsRead {
  // Undefined: er stond niets (een oudere back-up); het toestel houdt dan het zijne.
  store: SkillGoalStore | undefined;
  skipped: number;
}

export function migrateSkillGoals(raw: unknown): SkillGoalsRead {
  if (raw === undefined || raw === null) return { store: undefined, skipped: 0 };
  if (!isRecord(raw)) return { store: undefined, skipped: 1 };
  let skipped = 0;
  const goals: SkillGoal[] = [];
  const goalIds = new Set<string>();
  for (const g of Array.isArray(raw.goals) ? raw.goals : []) {
    const read = readGoal(g);
    if (!read || goalIds.has(read.id)) { skipped++; continue; }
    goals.push(read);
    goalIds.add(read.id);
  }
  const progress: SkillStepProgress[] = [];
  const seen = new Set<string>();
  for (const p of Array.isArray(raw.progress) ? raw.progress : []) {
    const read = readProgress(p);
    const key = read ? `${read.goalId}|${read.step}` : '';
    if (!read || seen.has(key) || seen.has(`id:${read.id}`)) { skipped++; continue; }
    progress.push(read);
    seen.add(key);
    seen.add(`id:${read.id}`);
  }
  return { store: { goals, progress }, skipped };
}

// Het toestel zelf: altijd een opslag, ook als er nog niets of iets kapots staat.
export function readSkillGoalStore(raw: unknown): SkillGoalStore {
  return migrateSkillGoals(raw).store ?? { goals: [], progress: [] };
}
