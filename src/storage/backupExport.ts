// Back-up maken: de envelop en de bestandsnaam (zie backup.ts voor de hele stroom).

import { localDateOf, todayISO } from '../utils/dates';
import { logIdsForBackup, resolveStreamsBackup, type StreamsBackup } from '../engine/streamsBackup';
import { morningsForBackup, resolveMorningBackup } from '../engine/morningBackup';
import { MISSED_MEMORY_KEY, resolveMissedMemory } from '../engine/missedTraining';
import { ProgramsRepo, SessionTemplatesRepo, PlannedSessionsRepo, SessionLogsRepo, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, CapabilityEvidenceRepo, InjuryNotesRepo, SettingsRepo, MetaRepo, PlanChangeProposalsRepo, ActivityStreamsRepo, RecoveryMetricsRepo, StrengthProgramStrategiesRepo, StrengthProgramRecommendationsRepo } from './database';
import { serializeStreams } from '../engine/streamPack';
import { RoutePlanRepo, SoloPlanRepo } from './routePlan';
import { CURRENT_BACKUP_SCHEMA_VERSION, type AscendBackupEnvelope, type AscendBackupPayloadV5 } from './backupTypes';

// --- export direction --------------------------------------------------------

export interface BuildEnvelopeOptions {
  // Whether the full series travel along. Left out: the setting "Reeksen in back-up" decides
  // (on unless you turned it off). The copy taken before an import passes false: it only
  // has to undo that import, and the series would make every copy tens of megabytes.
  streams?: boolean;
  // For the tests: the day "the last 2 years" counts back from.
  today?: string;
  // Whether the mornings of the watch travel along. Left out: the setting "Ochtendgetallen in
  // back-up" decides (on unless you turned it off). The copy taken before an import passes false.
  mornings?: boolean;
}

export async function buildBackupEnvelope(options: BuildEnvelopeOptions = {}): Promise<AscendBackupEnvelope> {
  const [programs, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, goalEngineConfig, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals, adviceResponses, routePlan, soloPlan] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
    GoalMilestoneProgressRepo.getAll(),
    CapabilityEvidenceRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
    MetaRepo.get<Partial<import('../models/goalEngineConfig').GoalEngineConfig>>('goalEngineConfig'),
    StrengthProgramStrategiesRepo.getAll(),
    StrengthProgramRecommendationsRepo.getAll(),
    PlanChangeProposalsRepo.getAll(),
    MetaRepo.get<Record<string, unknown>>('adviceResponses'),
    RoutePlanRepo.get(),
    SoloPlanRepo.get(),
  ]);
  const missedMemory = await MetaRepo.get<unknown>(MISSED_MEMORY_KEY);

  const payload: AscendBackupPayloadV5 = {
    version: 5,
    program: programs[0] ?? null,
    templates,
    plannedSessions,
    sessionLogs,
    trainingGoals,
    goalMilestones,
    goalMilestoneProgress,
    capabilityEvidence,
    injuryNotes,
    settings,
    goalEngineConfig: goalEngineConfig ?? null,
    strengthProgramStrategies,
    strengthProgramRecommendations,
    planChangeProposals,
    adviceResponses: adviceResponses ?? null,
    // Never filled in is stored as null, not as an empty plan, so a restore
    // doesn't overwrite a plan on another device with nothing.
    routePlan: routePlan.updatedAt ? routePlan : null,
    soloPlan: soloPlan.updatedAt ? soloPlan : null,
    // Your answers on "Training die niet doorging", only when there are any (engine/missedTraining.ts).
    ...(missedMemory !== undefined ? { missedTraining: resolveMissedMemory(missedMemory) } : {}),
  };

  // The full series of runs and tochten, as base64. They may not be fetchable again from the
  // source, so they go along by default (docs/beslissingen/2026-10-27-run-in-detail-gegevens.md),
  // those of the last 2 years unless you chose all or none
  // (docs/beslissingen/2026-10-31-data-lange-termijn.md). The summary per run (runDetail,
  // bestEffort) is on the log itself and always goes along.
  const choice: StreamsBackup = options.streams === false ? 'none' : options.streams === true ? 'all' : resolveStreamsBackup(settings);
  if (choice !== 'none') {
    // Only the series of a log that still exists: a leftover of a deleted log stays out.
    const logIds = logIdsForBackup(sessionLogs, choice, options.today ?? todayISO());
    const streams = (await ActivityStreamsRepo.getAll()).filter((s) => logIds.has(s.logId));
    // In small steps, so a year of series does not hold the screen still in one long block.
    const serialized = [];
    for (let i = 0; i < streams.length; i++) {
      serialized.push(serializeStreams(streams[i]));
      if (i % 25 === 24) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (serialized.length > 0) payload.activityStreams = serialized;
  }

  // The mornings of the watch (date, resting heart rate, HRV, sleep), so they survive when the
  // source stops giving them out (docs/beslissingen/2026-10-31-kansen-stap-0.md).
  if (options.mornings ?? resolveMorningBackup(settings)) {
    const mornings = morningsForBackup(await RecoveryMetricsRepo.getAll());
    if (mornings.length > 0) payload.mornings = mornings;
  }

  return {
    backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined,
    createdAt: new Date().toISOString(),
    payload,
  };
}

export function backupFileName(createdAt: string): string {
  // Double extension is deliberate (v0.3.2 §File naming): the leading
  // `.ascend-backup` segment is what a future ASCEND-aware file picker or
  // Android/iOS share-sheet integration can filter on, while the trailing
  // `.json` keeps every existing OS/browser/text-editor treating it as
  // plain, previewable JSON — nothing generic breaks on a file it doesn't
  // recognize.
  return `ascend-${localDateOf(createdAt)}.ascend-backup.json`;
}
