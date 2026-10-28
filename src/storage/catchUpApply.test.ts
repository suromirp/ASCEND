// Inhalen schrijft de gemiste rij als overgeslagen en een nieuwe rij op de gekozen dag; ongedaan maken
// zet de oude rij terug zoals hij was en haalt de nieuwe weg. Er komt geen log aan te pas.
import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, seedIfEmpty, PlannedSessionsRepo, SessionLogsRepo } from './database';
import { writeCatchUp } from './catchUpApply';
import { undoPlanChangeNow } from './undoPlanChange';
import type { PlannedSession } from '../models/training';

const lock = { by: 'user' as const, at: '2026-09-29T08:00:00.000Z' };
const old: PlannedSession = { id: 'gemist1', templateId: 'tpl_upper_a', scheduledDate: '2026-09-23', weekStartDate: '2026-09-21', status: 'planned', order: 1, plannedMinutes: 50 };

describe('inhalen wegschrijven en ongedaan maken', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
    await PlannedSessionsRepo.put(old);
  });

  it('de oude rij blijft op zijn dag, overgeslagen; de nieuwe staat op de gekozen dag', async () => {
    const logsBefore = await SessionLogsRepo.getAll();
    const added = await writeCatchUp(old, '2026-10-01', lock, 'nieuw1');
    const rows = await PlannedSessionsRepo.getAll();
    expect(rows.find((s) => s.id === 'gemist1')).toMatchObject({ scheduledDate: '2026-09-23', status: 'skipped', lock });
    expect(rows.find((s) => s.id === added.id)).toMatchObject({ templateId: 'tpl_upper_a', scheduledDate: '2026-10-01', plannedMinutes: 50, catchUp: { fromId: 'gemist1', fromDate: '2026-09-23' } });
    expect(await SessionLogsRepo.getAll()).toEqual(logsBefore);
  });

  it('ongedaan maken zet beide terug', async () => {
    const added = await writeCatchUp(old, '2026-10-01', lock, 'nieuw1');
    await undoPlanChangeNow({ id: 'u1', trigger: 'session_moved', title: 'Bovenlichaam A ingehaald', lines: [], why: '', before: [old], addedIds: [added.id], createdAt: '2026-09-29T08:00:00.000Z' });
    const rows = await PlannedSessionsRepo.getAll();
    expect(rows.find((s) => s.id === 'gemist1')).toEqual(old);
    expect(rows.some((s) => s.id === 'nieuw1')).toBe(false);
  });
});
