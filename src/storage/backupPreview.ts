// Back-up terugzetten: de huidige gegevens lezen, het verschil berekenen en het
// voorbeeld tonen, zonder iets te schrijven.

import { anySportDefinition, type AnySportId } from '../data/sports';
import { MISSED_MEMORY_KEY } from '../engine/missedTraining';
import { isEmptyStart } from '../engine/freshStart';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { InjuryNote } from '../models/injury';
import { ProgramsRepo, SessionTemplatesRepo, PlannedSessionsRepo, SessionLogsRepo, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, CapabilityEvidenceRepo, InjuryNotesRepo, SettingsRepo, PlanChangeProposalsRepo, StrengthProgramStrategiesRepo, StrengthProgramRecommendationsRepo, type AppSettings } from './database';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import { ROUTE_PLAN_KEY, SOLO_PLAN_KEY } from './routePlan';
import { SKILL_GOALS_KEY, loadSkillGoals } from './skillGoals';
import { mergeSkillStores } from '../engine/skillGoal';
import type { SkillGoalStore } from '../models/skillGoals';
import { CURRENT_BACKUP_SCHEMA_VERSION, ALL_CATEGORIES, type NormalizedBackupData, type BackupDataCategory, type CategoryAction, type PlanPolicy, type ImportDiffEntry, type ImportPreview } from './backupTypes';
import { type ResolvedListCategory, type Keyed, resolveListCategory, mergeSettingsHistory, shallowEqual } from './backupMerge';

// --- preview ------------------------------------------------------------------

function resolvePlannedScheduleAction(planPolicy: PlanPolicy | undefined): CategoryAction {
  return planPolicy === 'restore_backup_plan' ? 'replace' : 'keep_current';
}

interface CurrentData {
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  goalMilestoneProgress: GoalMilestoneProgress[];
  capabilityEvidence: CapabilityEvidence[];
  injuryNotes: InjuryNote[];
  settings: AppSettings;
  strengthProgramStrategies: StrengthProgramStrategy[];
  strengthProgramRecommendations: StrengthProgramRecommendation[];
  planChangeProposals: PlanChangeProposal[];
  // Het doel Vaardigheid; optional so a caller without it reads as "nothing on the device".
  skillGoals?: SkillGoalStore;
}

export async function loadCurrentData(): Promise<CurrentData> {
  const [programs, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals] = await Promise.all([
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
    StrengthProgramStrategiesRepo.getAll(),
    StrengthProgramRecommendationsRepo.getAll(),
    PlanChangeProposalsRepo.getAll(),
  ]);
  const skillGoals = await loadSkillGoals();
  return { program: programs[0] ?? null, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals, skillGoals };
}

interface DiffResult {
  diffByCategory: ImportDiffEntry[];
  settingsChanges: { key: string; current: unknown; incoming: unknown }[];
  // The action that is actually applied per category: what the user asked,
  // except 'keep_current' when the file doesn't contain that category.
  effective: Record<BackupDataCategory, CategoryAction>;
  resolved: {
    program: Program | null;
    templates: ResolvedListCategory<SessionTemplate>;
    plannedSessions: ResolvedListCategory<PlannedSession>;
    sessionLogs: ResolvedListCategory<SessionLog>;
    trainingGoals: ResolvedListCategory<TrainingGoal>;
    goalMilestones: ResolvedListCategory<GoalMilestone>;
    goalMilestoneProgress: ResolvedListCategory<GoalMilestoneProgress>;
    capabilityEvidence: ResolvedListCategory<CapabilityEvidence>;
    injuryNotes: ResolvedListCategory<InjuryNote>;
    strengthProgramStrategies: ResolvedListCategory<StrengthProgramStrategy> | undefined;
    strengthProgramRecommendations: ResolvedListCategory<StrengthProgramRecommendation> | undefined;
    planChangeProposals: ResolvedListCategory<PlanChangeProposal> | undefined;
    settings: AppSettings | undefined;
    meta: Record<string, unknown>;
  };
}

export function computeDiff(
  current: CurrentData,
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): DiffResult {
  const diffByCategory: ImportDiffEntry[] = [];
  const requested: Record<BackupDataCategory, CategoryAction> = {
    program_and_templates: categorySelections.program_and_templates ?? 'keep_current',
    // An older plan could still carry 'replace' for history — logs are
    // append-only, so it can only ever mean merge.
    training_history: categorySelections.training_history === 'replace' ? 'merge' : (categorySelections.training_history ?? 'keep_current'),
    planned_schedule: resolvePlannedScheduleAction(planPolicy),
    objectives_and_milestones: categorySelections.objectives_and_milestones ?? 'keep_current',
    capability_evidence: categorySelections.capability_evidence ?? 'keep_current',
    injuries: categorySelections.injuries ?? 'keep_current',
    app_settings: categorySelections.app_settings ?? 'keep_current',
  };
  const effective = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, backup.present[c] ? requested[c] : 'keep_current']),
  ) as Record<BackupDataCategory, CategoryAction>;
  const missing = (c: BackupDataCategory) => !backup.present[c] && requested[c] !== 'keep_current' && requested[c] !== 'ignore';

  const entry = (category: BackupDataCategory, parts: ResolvedListCategory<unknown & Keyed>[]): ImportDiffEntry => ({
    category,
    action: effective[category],
    toAdd: parts.reduce((n, p) => n + p.toAdd, 0),
    toReplace: parts.reduce((n, p) => n + p.toReplace, 0),
    toSkipDuplicate: parts.reduce((n, p) => n + p.toSkipDuplicate, 0),
    toRemove: parts.reduce((n, p) => n + p.toRemove, 0),
    missingInBackup: missing(category),
    conflicts: parts.flatMap((p) => p.conflicts),
  });

  const programAction = effective.program_and_templates;
  // A device with nothing of your own (no program, planning, training or goal)
  // only holds the building blocks ASCEND put there. A full restore then keeps
  // the ones the backup does not know (a backup from an older version lacks the
  // newer templates): they are not removed, so nothing "disappears" that you
  // never chose.
  const deviceEmpty = isEmptyStart({ programs: current.program ? 1 : 0, plannedSessions: current.plannedSessions.length, sessionLogs: current.sessionLogs.length, trainingGoals: current.trainingGoals.length });
  const keepUnlisted = <T extends Keyed>(r: ResolvedListCategory<T>, currentList: T[]): ResolvedListCategory<T> => {
    if (!deviceEmpty || programAction !== 'replace' || r.toRemove === 0) return r;
    const incomingIds = new Set(r.final.map((x) => x.id));
    return { ...r, final: [...r.final, ...currentList.filter((c) => !incomingIds.has(c.id))], toRemove: 0 };
  };
  const templatesResolved = keepUnlisted(resolveListCategory(programAction, backup.templates, current.templates, true), current.templates);
  const strategiesResolved = backup.strengthProgramStrategies
    ? keepUnlisted(resolveListCategory(programAction, backup.strengthProgramStrategies, current.strengthProgramStrategies, true), current.strengthProgramStrategies)
    : undefined;
  const resolvedProgram = programAction === 'keep_current' || programAction === 'ignore'
    ? current.program
    : programAction === 'replace'
      ? (backup.program ?? current.program)
      : (current.program ?? backup.program); // merge: adopt backup's program only if there wasn't one already
  diffByCategory.push(entry('program_and_templates', [templatesResolved]));

  const historyAction = effective.training_history;
  const sessionLogsResolved = resolveListCategory(historyAction, backup.sessionLogs, current.sessionLogs, false);
  // Append-only audit trails travel with the history and only ever merge.
  const proposalsResolved = backup.planChangeProposals
    ? resolveListCategory(historyAction === 'merge' ? 'merge' : 'keep_current', backup.planChangeProposals, current.planChangeProposals, false)
    : undefined;
  const recommendationsResolved = backup.strengthProgramRecommendations
    ? resolveListCategory(historyAction === 'merge' ? 'merge' : 'keep_current', backup.strengthProgramRecommendations, current.strengthProgramRecommendations, false)
    : undefined;
  diffByCategory.push(entry('training_history', [sessionLogsResolved]));

  const scheduleAction = effective.planned_schedule;
  const plannedSessionsResolved = resolveListCategory(scheduleAction, backup.plannedSessions, current.plannedSessions, true);
  diffByCategory.push(entry('planned_schedule', [plannedSessionsResolved]));

  const goalsAction = effective.objectives_and_milestones;
  const trainingGoalsResolved = resolveListCategory(goalsAction, backup.trainingGoals, current.trainingGoals, true);
  const goalMilestonesResolved = resolveListCategory(goalsAction, backup.goalMilestones, current.goalMilestones, true);
  // Milestone progress is a record of what was actually cleared — append-
  // only like the logs, so even a goal 'replace' only ever merges it.
  const goalMilestoneProgressResolved = resolveListCategory(goalsAction === 'replace' ? 'merge' : goalsAction, backup.goalMilestoneProgress, current.goalMilestoneProgress, false);
  diffByCategory.push(entry('objectives_and_milestones', [trainingGoalsResolved, goalMilestonesResolved, goalMilestoneProgressResolved]));

  // Manual CapabilityEvidence rows are user-authored answers, not
  // append-only observed history — a conflicting id can be safely
  // overwritten by a newer answer on merge, same as InjuryNote.
  const capabilityEvidenceResolved = resolveListCategory(effective.capability_evidence, backup.capabilityEvidence, current.capabilityEvidence, true);
  diffByCategory.push(entry('capability_evidence', [capabilityEvidenceResolved]));

  const injuryNotesResolved = resolveListCategory(effective.injuries, backup.injuryNotes, current.injuryNotes, true);
  diffByCategory.push(entry('injuries', [injuryNotesResolved]));

  const settingsAction = effective.app_settings;
  const settingsChanges: { key: string; current: unknown; incoming: unknown }[] = [];
  let resolvedSettings: AppSettings | undefined;
  const meta: Record<string, unknown> = {};
  // Het doel Vaardigheid travels with the goals. The cleared steps only ever merge (append-only, like milestone
  // progress); with Vervangen a goal of the file wins over the one on the device with the same id.
  if (backup.skillGoals && (goalsAction === 'merge' || goalsAction === 'replace')) {
    meta[SKILL_GOALS_KEY] = mergeSkillStores(current.skillGoals ?? { goals: [], progress: [] }, backup.skillGoals, goalsAction === 'replace');
  }
  if (settingsAction === 'replace') {
    const incoming = mergeSettingsHistory(current.settings, backup.settings);
    resolvedSettings = { ...current.settings, ...incoming };
    for (const key of Object.keys(incoming) as (keyof AppSettings)[]) {
      if (!shallowEqual(current.settings[key], incoming[key])) {
        settingsChanges.push({ key, current: current.settings[key], incoming: incoming[key] });
      }
    }
    if (backup.goalEngineConfig) meta.goalEngineConfig = backup.goalEngineConfig;
    if (backup.adviceResponses) meta.adviceResponses = backup.adviceResponses;
    if (backup.missedTraining) meta[MISSED_MEMORY_KEY] = backup.missedTraining;
    if (backup.routePlan) meta[ROUTE_PLAN_KEY] = backup.routePlan;
    if (backup.soloPlan) meta[SOLO_PLAN_KEY] = backup.soloPlan;
  }
  diffByCategory.push({
    category: 'app_settings',
    action: settingsAction,
    toAdd: 0,
    toReplace: settingsChanges.length,
    toSkipDuplicate: 0,
    toRemove: 0,
    missingInBackup: missing('app_settings'),
    conflicts: [],
  });

  return {
    diffByCategory,
    settingsChanges,
    effective,
    resolved: {
      program: resolvedProgram,
      templates: templatesResolved,
      plannedSessions: plannedSessionsResolved,
      sessionLogs: sessionLogsResolved,
      trainingGoals: trainingGoalsResolved,
      goalMilestones: goalMilestonesResolved,
      goalMilestoneProgress: goalMilestoneProgressResolved,
      capabilityEvidence: capabilityEvidenceResolved,
      injuryNotes: injuryNotesResolved,
      strengthProgramStrategies: strategiesResolved,
      strengthProgramRecommendations: recommendationsResolved,
      planChangeProposals: proposalsResolved,
      settings: resolvedSettings,
      meta,
    },
  };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Vaste afspraken in de back-up (PlannedSession.fixed). De keuze per sport wordt samengevoegd en die op dit
// toestel gaat voor (mergeSettingsHistory). Staat een sport hier niet op Vaste dag, dan haalt de volgende
// planningsronde de open rijen die nog op hun eigen dag staan weg en zegt dat; wat je verplaatste, oversloeg of
// logde blijft. Een noot in het importvoorbeeld, zodat het nooit stil gebeurt.
export function fixedSportImportNote(backup: Pick<NormalizedBackupData, 'plannedSessions' | 'settings'>, current: Partial<AppSettings>): string | undefined {
  const sports = [...new Set(backup.plannedSessions.filter((s) => s.fixed).map((s) => s.fixed!.sport))];
  if (sports.length === 0) return undefined;
  const merged = { ...(backup.settings?.sportHandling ?? {}), ...(current.sportHandling ?? {}) };
  const notFixed = sports.filter((s) => merged[s]?.role !== 'fixed');
  const names = (list: string[]) => list.map((s) => anySportDefinition(s as AnySportId).label.toLowerCase()).join(' en ');
  if (notFixed.length === 0) return `Deze back-up heeft vaste afspraken voor ${names(sports)}. Ze komen terug zoals ze waren.`;
  return `Deze back-up heeft vaste afspraken voor ${names(notFixed)}, maar op deze telefoon staat die sport niet op Vaste dag. Die keuze blijft; de volgende planningsronde haalt de open afspraken weg en zegt dat. Wat je verplaatste, oversloeg of logde blijft staan.`;
}

// Vaardigheden in de back-up: ze reizen mee met Doelen en mijlpalen en komen erbij, ook bij Vervangen; wat op dit
// toestel staat blijft (engine/skillGoal.ts#mergeSkillStores).
export function skillGoalImportNote(skillGoals: SkillGoalStore | undefined, goalsAction: CategoryAction): string | undefined {
  if (!skillGoals || (goalsAction !== 'merge' && goalsAction !== 'replace')) return undefined;
  const n = skillGoals.goals.filter((g) => !g.removedAt).length;
  if (n === 0) return undefined;
  // Met een algemeen calisthenicsdoel erbij is "vaardigheid" niet waar: dan heet het een calisthenicsdoel.
  if (skillGoals.goals.some((g) => !g.removedAt && g.general)) {
    return `Deze back-up heeft ${n === 1 ? 'één calisthenicsdoel' : `${n} calisthenicsdoelen`}. ${n === 1 ? 'Het komt' : 'Ze komen'} erbij; wat op dit toestel staat blijft. Ascend toont één algemeen doel tegelijk.`;
  }
  return `Deze back-up heeft ${n === 1 ? 'één vaardigheid' : `${n} vaardigheden`}. Ze ${n === 1 ? 'komt' : 'komen'} erbij; vaardigheden en gehaalde stappen op dit toestel blijven staan.`;
}

export async function buildImportPreview(
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): Promise<ImportPreview> {
  const current = await loadCurrentData();
  const { diffByCategory, settingsChanges, effective } = computeDiff(current, backup, categorySelections, planPolicy);

  const recordCounts: Partial<Record<BackupDataCategory, number>> = {
    program_and_templates: backup.templates.length,
    training_history: backup.sessionLogs.length,
    planned_schedule: backup.plannedSessions.length,
    objectives_and_milestones: backup.trainingGoals.length + backup.goalMilestones.length + backup.goalMilestoneProgress.length,
    capability_evidence: backup.capabilityEvidence.length,
    injuries: backup.injuryNotes.length,
    app_settings: Object.keys(backup.settings).length,
  };

  const ageMs = Date.now() - new Date(backup.createdAt).getTime();
  const restoreDateWarning =
    Number.isFinite(ageMs) && ageMs > THIRTY_DAYS_MS
      ? 'Deze back-up is meer dan 30 dagen oud. Je planning en instellingen gaan terug naar die stand.'
      : undefined;
  const logsSinceBackup = current.sessionLogs.filter((l) => l.completedAt > backup.createdAt).length;
  const fixedSportNote = fixedSportImportNote(backup, current.settings);
  const skillGoalNote = skillGoalImportNote(backup.skillGoals, effective.objectives_and_milestones);

  return {
    backupMeta: {
      createdAt: backup.createdAt,
      backupSchemaVersion: backup.sourceBackupSchemaVersion,
      recordCounts,
      hasTrainingPlan: backup.program !== null,
      isFromOlderVersion: backup.sourceBackupSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION,
      restoreDateWarning,
      logsSinceBackup,
      skippedInvalid: backup.skippedInvalid,
      ...(fixedSportNote ? { fixedSportNote } : {}),
      ...(skillGoalNote ? { skillGoalNote } : {}),
    },
    diffByCategory,
    settingsChanges,
  };
}
