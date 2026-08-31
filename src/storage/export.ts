import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  ObjectivesRepo,
  MilestoneProgressRepo,
  SettingsRepo,
} from './database';
import { CURRENT_SCHEMA_VERSION, type AscendExport } from './migrations';

export async function buildExportPayload(): Promise<AscendExport> {
  const [program, templates, plannedSessions, sessionLogs, objectives, milestoneProgress, settings] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    ObjectivesRepo.getAll(),
    MilestoneProgressRepo.getAll(),
    SettingsRepo.get(),
  ]);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    program: program[0] ?? null,
    templates,
    plannedSessions,
    sessionLogs,
    objectives,
    milestoneProgress,
    settings,
  };
}

export async function downloadExport(): Promise<void> {
  const payload = await buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = payload.exportDate.slice(0, 10);
  a.href = url;
  a.download = `ascend-export-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
