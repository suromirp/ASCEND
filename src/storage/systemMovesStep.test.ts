import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, PlannedSessionsRepo, PlanChangeProposalsRepo } from './database';
import { releaseSystemMoves } from './systemMovesStep';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';

describe('releaseSystemMoves (opstartstap)', () => {
  beforeEach(async () => { await wipeAllData(); });

  it('maakt een rij die de weekprescriptie verplaatste weer van het systeem, en een tweede keer verandert er niets', async () => {
    const date = addDays(todayISO(), 3);
    await PlannedSessionsRepo.put({ id: 's', templateId: 'tpl_lower', scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'moved', movedFromDate: addDays(date, -1), order: 0 });
    await PlanChangeProposalsRepo.put({ id: 'p', trigger: 'weekly_prescription_computed', issue: '', alternatives: [], consequences: '', explanation: '', createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: '2026-01-01T00:00:00.000Z', resolution: 'accepted', changes: [{ plannedSessionId: 's', action: 'move', toDate: date }] });
    expect(await releaseSystemMoves()).toBe(1);
    expect((await PlannedSessionsRepo.getAll())[0]).toMatchObject({ status: 'planned', movedFromDate: addDays(date, -1) });
    expect(await releaseSystemMoves()).toBe(0);
  });
});
