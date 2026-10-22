import { describe, it, expect, beforeEach } from 'vitest';
import {
  wipeAllData,
  PlanChangeProposalsRepo,
  SessionLogsRepo,
  GoalMilestoneProgressRepo,
  GoalMilestonesRepo,
  TrainingGoalsRepo,
  ProgramsRepo,
} from './database';
import { mergeDuplicateWeeklyPrescriptionLines } from './planLogCleanup';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import type { PlanChangeProposal } from '../models/planChange';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens: een logboek zoals de herschrijffout het achterliet.
function weeklyLine(i: number): PlanChangeProposal {
  const at = new Date(Date.UTC(2026, 9, 1, 4, 0, i)).toISOString();
  return {
    id: `pcp_dup_${i}`,
    trigger: 'weekly_prescription_computed',
    issue: 'Weekprescriptie bijgewerkt',
    changes: [
      { plannedSessionId: 's1', action: 'replace', newPrescriptionId: `prescription_${i}_a`, reason: 'Meer duur', generatedBy: ['engine'] },
      { plannedSessionId: 's2', action: 'replace', newPrescriptionId: `prescription_${i}_b`, reason: 'Meer afstand', generatedBy: ['engine'] },
    ],
    alternatives: [],
    consequences: 'Wordt toegepast op het forecast-bereik.',
    explanation: 'Gebaseerd op actieve doelen.',
    createdAt: at,
    resolvedAt: at,
    resolution: 'accepted',
  };
}

const userMove: PlanChangeProposal = {
  id: 'pcp_user_move',
  trigger: 'session_moved',
  issue: 'Verplaatst naar donderdag',
  changes: [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-10-20', toDate: '2026-10-22' }],
  alternatives: [],
  consequences: '',
  explanation: '',
  createdAt: '2026-10-01T09:30:00.000Z',
  resolvedAt: '2026-10-01T09:30:00.000Z',
  resolution: 'accepted',
};

const fakeLog: SessionLog = {
  id: 'fake_log_a', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2026-10-01', completedAt: '2026-10-01T18:00:00.000Z', variant: 'full', durationMinutes: 40, source: 'manual',
};

describe('mergeDuplicateWeeklyPrescriptionLines', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  async function seedLogbook() {
    // 110 identieke regels, een eigen verplaatsing er middenin, en daarna weer 20 van de oude soort.
    for (let i = 0; i < 110; i++) await PlanChangeProposalsRepo.put(weeklyLine(i));
    await PlanChangeProposalsRepo.put(userMove);
    for (let i = 200; i < 220; i++) await PlanChangeProposalsRepo.put({ ...weeklyLine(i), createdAt: `2026-10-02T08:${String(i - 200).padStart(2, '0')}:00.000Z` });
  }

  it('voegt ruim honderd identieke regels samen en laat de eigen verplaatsing staan', async () => {
    await seedLogbook();
    await SessionLogsRepo.put(fakeLog);
    await TrainingGoalsRepo.put({ id: 'g1', name: 'Doel', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', status: 'paused' });
    await GoalMilestonesRepo.put({ id: 'm1', goalId: 'g1', order: 1, title: 'Eerste', requirement: { kind: 'manual' } });
    const progress = { id: 'mp1', goalId: 'g1', milestoneId: 'm1', clearedDate: '2026-09-01' };
    await GoalMilestoneProgressRepo.put(progress);

    const removed = await mergeDuplicateWeeklyPrescriptionLines();

    expect(removed).toBe(109 + 19);
    const left = await PlanChangeProposalsRepo.getAll();
    expect(left.map((p) => p.id).sort()).toEqual(['pcp_dup_0', 'pcp_dup_200', 'pcp_user_move'].sort());
    // Historie blijft zoals ze was.
    expect(await SessionLogsRepo.getAll()).toEqual([fakeLog]);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([progress]);
  });

  it('is idempotent: een tweede keer verandert niets en schrijft niets', async () => {
    await seedLogbook();
    await mergeDuplicateWeeklyPrescriptionLines();
    const after = await PlanChangeProposalsRepo.getAll();
    expect(await mergeDuplicateWeeklyPrescriptionLines()).toBe(0);
    expect(await PlanChangeProposalsRepo.getAll()).toEqual(after);
  });

  it('een leeg logboek geeft niets te doen', async () => {
    expect(await mergeDuplicateWeeklyPrescriptionLines()).toBe(0);
  });

  it('een oude back-up met de dubbele regels blijft importeerbaar en wordt bij de volgende start opgeschoond', async () => {
    await ProgramsRepo.put({ id: 'p1', name: 'Test', startDate: '2026-01-05', phases: [] });
    await SessionLogsRepo.put(fakeLog);
    await seedLogbook();
    const oldBackup = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(oldBackup.payload.planChangeProposals).toHaveLength(131);

    await wipeAllData();
    const backup = normalizeBackupToCurrentModel(oldBackup);
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), defaultPlanPolicyForMode('full_restore'));
    const snapshot = await createPreImportSnapshot();
    await applyImportPlan(
      backup,
      createImportPlan(backup, 'full_restore', defaultActionsForMode('full_restore'), defaultPlanPolicyForMode('full_restore'), preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id),
    );

    // De import zelf verandert niets aan het logboek ...
    expect(await PlanChangeProposalsRepo.getAll()).toHaveLength(131);
    expect(await SessionLogsRepo.getAll()).toEqual([fakeLog]);
    // ... en de opschoonstap van de volgende start ruimt het op.
    await mergeDuplicateWeeklyPrescriptionLines();
    expect(await PlanChangeProposalsRepo.getAll()).toHaveLength(3);
    expect(await SessionLogsRepo.getAll()).toEqual([fakeLog]);
  });
});
