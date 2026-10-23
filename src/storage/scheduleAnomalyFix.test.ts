import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wipeAllData, PlannedSessionsRepo, SessionTemplatesRepo, PlanChangeProposalsRepo } from './database';
import { applyScheduleAnomalyFixNow } from './scheduleAnomalyFix';
import { lockLevel } from '../engine/weekValidator';
import type { PlannedSession, SessionTemplate } from '../models/training';

// Warden Planning punt 4: "Aanpassen" op de kaart Opgevallen in je schema is
// jouw akkoord. Wat het verplaatst krijgt het slot van een aangenomen voorstel
// en is daarna van jou (lockLevel 1), niet meer van de automatische planning.

const ASOF = '2026-09-09';
const MONDAY = '2026-09-07';
const tpl = (id: string, type: SessionTemplate['type'], legs: 'none' | 'heavy' = 'none'): SessionTemplate => ({
  id, name: id, type, durationVariants: { full: 45 },
  ...(type === 'recovery' ? {} : { baseStressProfile: { lowerBodyLoad: legs, impact: 'light', eccentricLoad: 'none', intensity: 'moderate' } }),
});
const row = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: MONDAY, status: 'planned', order: 0 });

describe('applyScheduleAnomalyFixNow', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${ASOF}T08:00:00`));
    await wipeAllData();
  });
  afterEach(() => vi.useRealTimers());

  it('zet wat het verplaatst vast als jouw akkoord', async () => {
    for (const t of [tpl('tpl_herstel', 'recovery'), tpl('tpl_easy_run', 'cardio'), tpl('tpl_lower_a', 'strength', 'heavy')]) await SessionTemplatesRepo.put(t);
    const sessions = [
      row('s1', 'tpl_herstel', '2026-09-07'),
      row('s2', 'tpl_herstel', '2026-09-08'),
      row('s3', 'tpl_lower_a', '2026-09-09'),
      row('s4', 'tpl_easy_run', '2026-09-10'),
      row('s5', 'tpl_easy_run', '2026-09-11'),
      row('s6', 'tpl_easy_run', '2026-09-12'),
      row('s7', 'tpl_easy_run', '2026-09-13'),
    ];
    for (const s of sessions) await PlannedSessionsRepo.put(s);
    expect(await applyScheduleAnomalyFixNow()).toBe(true);
    const proposal = (await PlanChangeProposalsRepo.getAll())[0];
    const moved = (await PlannedSessionsRepo.getAll()).filter((s) => s.movedFromDate);
    expect(moved.length).toBeGreaterThan(0);
    for (const s of moved) {
      expect(s.lock).toMatchObject({ by: 'proposal', proposalId: proposal.id });
      expect(s.status).toBe('moved');
      if (s.scheduledDate >= ASOF) expect(lockLevel(s, new Set(), ASOF)).toBe(1);
    }
  });
});
