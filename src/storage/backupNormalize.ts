// Back-up inlezen: een bestand van elke versie omzetten naar het huidige model.

import { resolveMissedMemory } from '../engine/missedTraining';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { InjuryNote } from '../models/injury';
import type { AppSettings } from './database';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import { migrateGr5ObjectiveData, buildMarathonGoal } from '../engine/goalMigration';
import { migrateLogCountedSport, migratePlannedFixed, migratePlannedAmount, migrateLogCustomSport, migrateLogRpeAssumed, migrateExport, migrateLogDetail, migrateInjuryNote, migrateLogGymProfile, migrateLogFileDuration, migrateLogLinkedLater, migrateLogForgeLog, migrateLogBestEffort, migrateLogRunDetail, migrateLogZone2Pieces, migrateActivityStreams, migrateLogManualMeasured, migrateLogSets, migrateLogSetTimes, migrateLogSetAsked, migrateLogSetSkill, migrateLogSourceSync, migrateLogTrim, migrateTrainingGoals, migratePlanChangeProposal, migrateMornings, migrateSkillGoals, migratePlaces, migrateSavedRoutes, routesOfPlaces, type AscendExport } from './migrations';
import { sanitizeRoutePlan, sanitizeSoloPlan } from '../engine/routePlan';
import { CURRENT_BACKUP_SCHEMA_VERSION, type NormalizedBackupData } from './backupTypes';
import { BackupMessageError } from './backupMessage';
import { isRecord } from '../utils/guards';
import { type Counter, cleanList, isTemplate, isPlanned, cleanPlannedCatchUp, isLog, hasId, cleanSettings } from './backupClean';

// A V1 backup's legacy objectives/milestoneProgress are migrated into
// trainingGoals/goalMilestones/goalMilestoneProgress here — the exact same
// transform storage/goalMigration.ts runs on-device (engine/goalMigration.ts),
// so restoring an old backup never silently loses GR5/marathon goal
// progress just because the on-disk shape has moved on. Today's app only
// ever has one GR5-shaped Objective, but this maps every row present, not
// just the first, in case an old export ever carried more than one.
function migrateLegacyObjectives(
  objectives: Objective[],
  legacyProgress: MilestoneProgress[],
  settings: Partial<AppSettings>,
): { trainingGoals: TrainingGoal[]; goalMilestones: GoalMilestone[]; goalMilestoneProgress: GoalMilestoneProgress[] } {
  const trainingGoals: TrainingGoal[] = [];
  const goalMilestones: GoalMilestone[] = [];
  const goalMilestoneProgress: GoalMilestoneProgress[] = [];

  for (const objective of objectives) {
    const migrated = migrateGr5ObjectiveData(objective, legacyProgress);
    trainingGoals.push(migrated.goal);
    goalMilestones.push(...migrated.milestones);
    goalMilestoneProgress.push(...migrated.progress);
  }

  const marathonGoal = buildMarathonGoal(settings.marathonRaceType, settings.marathonTargetDate, settings.marathonTargetTimeMinutes);
  if (marathonGoal) trainingGoals.push(marathonGoal);

  return { trainingGoals, goalMilestones, goalMilestoneProgress };
}

interface RawSource {
  createdAt: string;
  sourceBackupSchemaVersion: number;
  raw: Record<string, unknown>;
  // V1 and the legacy flat export carry objectives/milestoneProgress
  // instead of goal-engine records.
  legacyGoals: boolean;
  hasCapability: boolean;
  hasV4Extras: boolean;
  hasV5Extras: boolean;
}

function buildNormalized({ createdAt, sourceBackupSchemaVersion, raw, legacyGoals, hasCapability, hasV4Extras, hasV5Extras }: RawSource): NormalizedBackupData {
  const skipped: Counter = { n: 0 };
  const templates = cleanList<SessionTemplate>(raw.templates, isTemplate, skipped);
  const plannedSessions = cleanList<PlannedSession>(raw.plannedSessions, isPlanned, skipped)?.map(cleanPlannedCatchUp).map(migratePlannedFixed).map(migratePlannedAmount);
  const sessionLogs = cleanList<SessionLog>(raw.sessionLogs, isLog, skipped)?.map(migrateLogManualMeasured).map(migrateLogSets).map(migrateLogSetTimes).map(migrateLogSetAsked).map(migrateLogSetSkill).map(migrateLogDetail).map(migrateLogTrim).map(migrateLogSourceSync).map(migrateLogGymProfile).map(migrateLogFileDuration).map(migrateLogForgeLog).map(migrateLogBestEffort).map(migrateLogRunDetail).map(migrateLogZone2Pieces).map(migrateLogRpeAssumed).map(migrateLogCountedSport).map(migrateLogCustomSport).map(migrateLogLinkedLater);
  const injuryNotes = cleanList<InjuryNote>(raw.injuryNotes, hasId, skipped)?.map(migrateInjuryNote);
  const capabilityEvidence = hasCapability ? cleanList<CapabilityEvidence>(raw.capabilityEvidence, hasId, skipped) : undefined;
  const settings = cleanSettings(raw.settings, skipped);
  const program = hasId(raw.program) ? (raw.program as unknown as Program) : null;

  let trainingGoals: TrainingGoal[] | undefined;
  let goalMilestones: GoalMilestone[] | undefined;
  let goalMilestoneProgress: GoalMilestoneProgress[] | undefined;
  if (legacyGoals) {
    const objectives = cleanList<Objective>(raw.objectives, hasId, skipped);
    if (objectives !== undefined) {
      const migrated = migrateLegacyObjectives(objectives, cleanList<MilestoneProgress>(raw.milestoneProgress, hasId, skipped) ?? [], settings ?? {});
      trainingGoals = migrated.trainingGoals;
      goalMilestones = migrated.goalMilestones;
      goalMilestoneProgress = migrated.goalMilestoneProgress;
    }
  } else {
    trainingGoals = cleanList<TrainingGoal>(raw.trainingGoals, hasId, skipped);
    goalMilestones = cleanList<GoalMilestone>(raw.goalMilestones, hasId, skipped);
    goalMilestoneProgress = cleanList<GoalMilestoneProgress>(raw.goalMilestoneProgress, hasId, skipped);
  }

  const normalized: NormalizedBackupData = {
    createdAt,
    sourceBackupSchemaVersion,
    program,
    templates: templates ?? [],
    plannedSessions: plannedSessions ?? [],
    sessionLogs: sessionLogs ?? [],
    trainingGoals: trainingGoals ?? [],
    goalMilestones: goalMilestones ?? [],
    goalMilestoneProgress: goalMilestoneProgress ?? [],
    capabilityEvidence: capabilityEvidence ?? [],
    injuryNotes: injuryNotes ?? [],
    settings: settings ?? {},
    present: {
      program_and_templates: templates !== undefined,
      training_history: sessionLogs !== undefined,
      planned_schedule: plannedSessions !== undefined,
      objectives_and_milestones: trainingGoals !== undefined,
      capability_evidence: capabilityEvidence !== undefined,
      injuries: injuryNotes !== undefined,
      app_settings: settings !== undefined,
    },
    skippedInvalid: 0,
  };

  if (hasV4Extras) {
    if (isRecord(raw.goalEngineConfig)) normalized.goalEngineConfig = raw.goalEngineConfig as NormalizedBackupData['goalEngineConfig'];
    normalized.strengthProgramStrategies = cleanList<StrengthProgramStrategy>(raw.strengthProgramStrategies, hasId, skipped);
    normalized.strengthProgramRecommendations = cleanList<StrengthProgramRecommendation>(raw.strengthProgramRecommendations, hasId, skipped);
    normalized.planChangeProposals = cleanList<PlanChangeProposal>(raw.planChangeProposals, hasId, skipped)?.map(migratePlanChangeProposal);
    if (isRecord(raw.adviceResponses)) normalized.adviceResponses = raw.adviceResponses;
  }

  if (hasV5Extras) {
    // A plan that can't be read is dropped, never half-restored.
    const routePlan = sanitizeRoutePlan(raw.routePlan);
    if (routePlan) normalized.routePlan = routePlan;
    else if (raw.routePlan != null) skipped.n++;
    const soloPlan = sanitizeSoloPlan(raw.soloPlan);
    if (soloPlan) normalized.soloPlan = soloPlan;
    else if (raw.soloPlan != null) skipped.n++;
    // The full series: set by set, a damaged one is dropped and counted; no key means the
    // file has none and the device keeps its own.
    const streams = migrateActivityStreams(raw.activityStreams);
    if (streams.list) normalized.activityStreams = streams.list;
    skipped.n += streams.skipped;
  }
  // Your answers on "Training die niet doorging": only what resolveMissedMemory can read; a file from
  // before has none and the device keeps its own.
  if (isRecord(raw.missedTraining)) normalized.missedTraining = resolveMissedMemory(raw.missedTraining);
  else if (raw.missedTraining != null) skipped.n++;
  // The mornings of the watch (storage/migrations.ts#migrateMornings): a file from before them has none.
  {
    const mornings = migrateMornings(raw.mornings);
    if (mornings.list) normalized.mornings = mornings.list;
    skipped.n += mornings.skipped;
  }

  // Het doel Vaardigheid (storage/migrations.ts#migrateSkillGoals): a file from before it has none; a damaged
  // goal or row is dropped and counted.
  {
    const skill = migrateSkillGoals(raw.skillGoals);
    if (skill.store) normalized.skillGoals = skill.store;
    skipped.n += skill.skipped;
  }

  // Plekken en bewaarde routes (storage/migrationsPlaces.ts): a file from before them has none and the device
  // keeps its own; a damaged place or route is dropped and counted, never the rest. A list of which nothing
  // could be read counts as "not in this file": damaged rows never empty the device. Only a list that was
  // empty in the file itself (the copy taken before an import) says "no places". A route of a place that is
  // not in the same file is dropped and counted too; a file with routes only is checked against the places of
  // the device at the import (storage/backupPreview.ts).
  {
    const places = migratePlaces(raw.places);
    const readable = (list: unknown[] | undefined, source: unknown): boolean => !!list && (list.length > 0 || (Array.isArray(source) && source.length === 0));
    if (readable(places.list, raw.places)) normalized.places = places.list;
    skipped.n += places.skipped;
    const routes = migrateSavedRoutes(raw.savedRoutes);
    skipped.n += routes.skipped;
    if (routes.list && readable(routes.list, raw.savedRoutes)) {
      const kept = normalized.places ? routesOfPlaces(routes.list, normalized.places) : routes.list;
      skipped.n += routes.list.length - kept.length;
      normalized.savedRoutes = kept;
    }
  }

  // Soort, gegevens en belangrijkheid van elk doel (ronde 2a): een back-up van voor deze
  // ronde heeft ze niet. Het hoofddoel is het doel met mijlpalen.
  normalized.trainingGoals = migrateTrainingGoals(normalized.trainingGoals, new Set(normalized.goalMilestones.map((m) => m.goalId)), normalized.routePlan, { ladderKnown: false });

  normalized.skippedInvalid = skipped.n;
  return normalized;
}

export function normalizeBackupToCurrentModel(raw: unknown): NormalizedBackupData {
  if (!isRecord(raw)) {
    throw new BackupMessageError('Kon het bestand niet lezen. Is dit een geldig ASCEND-back-upbestand (.json)?');
  }
  const obj = raw;

  // New-style envelope (v0.3.2+).
  if (typeof obj.backupSchemaVersion === 'number' && isRecord(obj.payload)) {
    if (obj.backupSchemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
      throw new BackupMessageError(
        `Deze back-up komt van een nieuwere versie van ASCEND (schema v${obj.backupSchemaVersion}). Werk de app bij voordat je hem importeert.`,
      );
    }
    const payload = obj.payload;
    const createdAt = typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString();
    const version = payload.version;
    if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5) {
      throw new BackupMessageError('Deze back-up heeft een onbekende gegevensversie en kan niet worden geïmporteerd.');
    }
    return buildNormalized({
      createdAt,
      sourceBackupSchemaVersion: obj.backupSchemaVersion,
      raw: payload,
      legacyGoals: version === 1,
      // V1/V2 predate the Capability Engine: no manual baseline evidence
      // could exist yet, so it's a true absence, not data loss.
      hasCapability: version >= 3,
      hasV4Extras: version >= 4,
      hasV5Extras: version >= 5,
    });
  }

  // Legacy flat export shape (pre-v0.3.2 — see migrations.ts).
  if (typeof obj.schemaVersion === 'number' && typeof obj.exportDate === 'string') {
    const migrated = migrateExport(obj as unknown as AscendExport) as unknown as Record<string, unknown> & { exportDate: string };
    return buildNormalized({
      createdAt: migrated.exportDate,
      sourceBackupSchemaVersion: 0,
      raw: migrated,
      legacyGoals: true,
      hasCapability: false,
      hasV4Extras: false,
      hasV5Extras: false,
    });
  }

  throw new BackupMessageError('Kon het bestand niet herkennen als een ASCEND-back-upbestand.');
}

// JSON.parse with a message the user can act on. A file cut off halfway
// (a failed download, a sync conflict) is the common case.
export function parseBackupText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new BackupMessageError('Dit bestand is beschadigd of onvolledig: het is geen geldige back-up. Er is niets gewijzigd.');
  }
}
