import { beforeEach, describe, expect, it } from 'vitest';
import { GoalMilestoneProgressRepo, PlanChangeProposalsRepo, PlannedSessionsRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { tidyOldProposals } from './proposalTidy';
import { normalizeBackupToCurrentModel } from './backup';
import type { PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';

// Nagemaakte gegevens: een paar oude en nieuwe voorstellen, een geplande training en een log.
const TODAY = '2026-10-31';

function proposal(id: string, extra: Partial<PlanChangeProposal> = {}): PlanChangeProposal {
  return {
    id,
    trigger: 'session_moved',
    issue: 'Verplaatst naar donderdag',
    changes: [{ plannedSessionId: 'ps_old', action: 'move', fromDate: '2026-05-05', toDate: '2026-05-07', reason: 'Geen tijd op dinsdag' }],
    alternatives: [{ label: 'Laten staan', changes: [], consequences: 'Niets verandert' }],
    consequences: 'Je loop gaat naar donderdag.',
    explanation: 'Op dinsdag had je geen tijd.',
    createdAt: '2026-05-04T18:00:00.000Z',
    resolvedAt: '2026-05-04T18:01:00.000Z',
    resolution: 'accepted',
    ...extra,
  };
}

const oldSession: PlannedSession = { id: 'ps_old', templateId: 'tpl_easy_run', scheduledDate: '2026-05-07', weekStartDate: '2026-05-04', status: 'moved', order: 0 };
const lockedSession: PlannedSession = { id: 'ps_locked', templateId: 'tpl_easy_run', scheduledDate: '2026-05-08', weekStartDate: '2026-05-04', status: 'planned', order: 0, lock: { by: 'proposal', proposalId: 'p_locked', at: '2026-05-04T18:01:00.000Z' } };
const log: SessionLog = { id: 'log_a', templateId: 'tpl_easy_run', plannedSessionId: 'ps_old', type: 'cardio', completedDate: '2026-05-07', completedAt: '2026-05-07T18:00:00.000Z', variant: 'full', durationMinutes: 40, source: 'manual' };

describe('tidyOldProposals', () => {
  beforeEach(async () => {
    await wipeAllData();
    await PlannedSessionsRepo.put(oldSession);
    await PlannedSessionsRepo.put(lockedSession);
    await SessionLogsRepo.put(log);
    await GoalMilestoneProgressRepo.put({ id: 'mp1', goalId: 'g1', milestoneId: 'm1', clearedDate: '2026-04-01' });
    await PlanChangeProposalsRepo.put(proposal('p_old'));
    await PlanChangeProposalsRepo.put(proposal('p_open', { resolution: undefined, resolvedAt: undefined }));
    await PlanChangeProposalsRepo.put(proposal('p_locked'));
    await PlanChangeProposalsRepo.put(proposal('p_new', { createdAt: '2026-10-20T08:00:00.000Z', resolvedAt: '2026-10-20T08:00:05.000Z' }));
  });

  it('vat alleen het oude, besliste voorstel samen; open, aangewezen en nieuw blijven zoals ze waren', async () => {
    expect(await tidyOldProposals({ today: TODAY, now: '2026-10-31T09:00:00.000Z' })).toBe(1);
    const byId = new Map((await PlanChangeProposalsRepo.getAll()).map((p) => [p.id, p]));
    expect(byId.get('p_old')).toMatchObject({ id: 'p_old', issue: 'Verplaatst naar donderdag', resolution: 'accepted', createdAt: '2026-05-04T18:00:00.000Z', summarizedAt: '2026-10-31T09:00:00.000Z', changeCount: 1, changes: [], alternatives: [] });
    expect(byId.get('p_open')).toEqual(proposal('p_open', { resolution: undefined, resolvedAt: undefined }));
    expect(byId.get('p_locked')).toEqual(proposal('p_locked'));
    expect(byId.get('p_new')).toEqual(proposal('p_new', { createdAt: '2026-10-20T08:00:00.000Z', resolvedAt: '2026-10-20T08:00:05.000Z' }));
    // Historie en planning blijven zoals ze waren.
    expect(await SessionLogsRepo.getAll()).toEqual([log]);
    expect(await GoalMilestoneProgressRepo.getAll()).toHaveLength(1);
    expect((await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id))).toEqual([lockedSession, oldSession]);
    // Een tweede keer doet niets.
    expect(await tidyOldProposals({ today: TODAY })).toBe(0);
  });

  it('uit is uit, en 6 maanden laat dit voorstel nog staan', async () => {
    await SettingsRepo.set({ proposalTidyMonths: 0 });
    expect(await tidyOldProposals({ today: TODAY })).toBe(0);
    await SettingsRepo.set({ proposalTidyMonths: 6 });
    expect(await tidyOldProposals({ today: TODAY })).toBe(0);
    expect(await tidyOldProposals({ today: '2026-12-31' })).toBe(1);
  });

  it('een samengevat voorstel komt heel uit een back-up, en een oude back-up zonder samenvatting ook', async () => {
    await tidyOldProposals({ today: TODAY });
    const summary = (await PlanChangeProposalsRepo.getAll()).find((p) => p.id === 'p_old')!;
    const file = { backupSchemaVersion: 5, createdAt: '2026-10-31T09:00:00.000Z', payload: { version: 5, planChangeProposals: [summary, proposal('p_full')], goalEngineConfig: {}, strengthProgramStrategies: [], strengthProgramRecommendations: [] } };
    const read = normalizeBackupToCurrentModel(file);
    expect(read.planChangeProposals).toEqual([summary, proposal('p_full')]);
    // Een kapotte samenvatting verliest alleen die velden.
    const broken = normalizeBackupToCurrentModel({ ...file, payload: { ...file.payload, planChangeProposals: [{ ...summary, summarizedAt: 7, changeCount: -1, changes: undefined }] } });
    expect(broken.planChangeProposals![0]).toMatchObject({ id: 'p_old', changes: [], issue: 'Verplaatst naar donderdag' });
    expect('summarizedAt' in broken.planChangeProposals![0]).toBe(false);
    expect('changeCount' in broken.planChangeProposals![0]).toBe(false);
  });
});
