import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import { ProgramsRepo, SessionTemplatesRepo, PlannedSessionsRepo, SessionLogsRepo, ObjectivesRepo, MilestoneProgressRepo, MetaRepo, wipeAllData } from './database';
import { migrateExport, type AscendExport } from './migrations';

export async function importFromFile(file: File): Promise<void> {
  const text = await file.text();
  let parsed: AscendExport;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Kon het bestand niet lezen — is dit een geldig ASCEND-export bestand (.json)?');
  }

  if (typeof parsed.schemaVersion !== 'number') {
    throw new Error('Dit bestand bevat geen ASCEND schemaversie en kan niet worden geïmporteerd.');
  }

  const migrated = migrateExport(parsed);

  await wipeAllData();

  if (migrated.program) await ProgramsRepo.put(migrated.program as Program);
  for (const t of (migrated.templates as SessionTemplate[]) ?? []) await SessionTemplatesRepo.put(t);
  for (const p of (migrated.plannedSessions as PlannedSession[]) ?? []) await PlannedSessionsRepo.put(p);
  for (const l of (migrated.sessionLogs as SessionLog[]) ?? []) await SessionLogsRepo.put(l);
  for (const o of (migrated.objectives as Objective[]) ?? []) await ObjectivesRepo.put(o);
  for (const m of (migrated.milestoneProgress as MilestoneProgress[]) ?? []) await MilestoneProgressRepo.put(m);

  await MetaRepo.set('seeded', true);
  await MetaRepo.set('schemaVersion', migrated.schemaVersion);
}
