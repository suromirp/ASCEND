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
  if (raw.general === undefined) return { ...raw } as unknown as SkillGoal;
  const general = readGeneral(raw.general);
  if (!general) return undefined;
  return { ...raw, general } as unknown as SkillGoal;
}

// Een echte dag: JJJJ-MM-DD die als datum terugkomt (geen 31 februari).
function isRealDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Het algemene doel (SkillGoal.general). Een lijst ladders met minstens één tekst (de eerste 12, elk hoogstens 60
// tekens; iets anders en dubbelen vallen weg), een echte startdag en een baseline als object, waaruit elke waarde
// wegvalt die geen geheel getal van 0 tot 50 is of geen ladder uit de lijst heeft. Een ladder die deze versie niet
// kent en velden van een nieuwere versie blijven staan. Kapot (geen object, geen ladders, geen echte dag): undefined.
function readGeneral(raw: unknown): Record<string, unknown> | undefined {
  if (!isRecord(raw)) return undefined;
  const { ladderIds, startDate, baseline } = raw;
  if (!Array.isArray(ladderIds) || !isRealDate(startDate) || !isRecord(baseline)) return undefined;
  const ids = [...new Set(ladderIds.filter((id): id is string => isText(id, 60)))].slice(0, 12);
  if (ids.length === 0) return undefined;
  const kept: Record<string, number> = {};
  for (const [key, value] of Object.entries(baseline)) {
    if (ids.includes(key) && typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 50) kept[key] = value;
  }
  return { ...raw, ladderIds: ids, startDate, baseline: kept };
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
