import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wipeAllData, seedIfEmpty, SettingsRepo, PlanChangeProposalsRepo } from './database';
import { undoReentryNow } from './reentryUndo';
import { undoPlanChangeNow } from './undoPlanChange';
import { buildChangeLog } from '../engine/changeLog';
import { addDays } from '../utils/dates';

// Een rustiger instap terugzetten en dat weer ongedaan maken (Warden 15 november): het terugzetten staat zelf in het
// logboek van wijzigingen, en Ongedaan maken verwijst naar die regel. Alles nagemaakt.
const TODAY = '2026-10-21';

describe('rustiger instap terugzetten in het logboek', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
  });
  afterEach(() => vi.useRealTimers());

  it('terugzetten schrijft een eigen regel; Ongedaan maken verwijst ernaar en zet de instap terug', async () => {
    const week = { from: TODAY, until: addDays(TODAY, 6), factor: 0.75 };
    await SettingsRepo.set({ reentryWeeks: [week] });

    const out = await undoReentryNow(TODAY);
    expect(out.settings.reentryWeeks).toEqual([]);
    expect((await SettingsRepo.get()).reentryWeeks).toEqual([]);
    expect(out.record).toMatchObject({ trigger: 'reentry_planned', issue: 'Rustiger instap teruggezet', resolution: 'accepted' });
    expect((await PlanChangeProposalsRepo.getAll()).map((p) => p.id)).toContain(out.record!.id);

    await undoPlanChangeNow({ id: out.record!.id, trigger: 'reentry_planned', title: 'Rustiger instap teruggezet', lines: [], why: '', before: [], addedIds: [], settingsBefore: { reentryWeeks: out.before }, createdAt: new Date().toISOString() });
    expect((await SettingsRepo.get()).reentryWeeks).toEqual([week]);
    const log = await PlanChangeProposalsRepo.getAll();
    const revert = log.find((p) => p.revertsProposalId)!;
    expect(revert.issue).toBe('Ongedaan gemaakt: Rustiger instap teruggezet');
    // De verwijzing wijst naar een regel die bestaat.
    expect(log.some((p) => p.id === revert.revertsProposalId)).toBe(true);
    // Het logboek toont het terugzetten, als ongedaan gemaakt, met zijn eigen regel.
    const entry = buildChangeLog(log, [], [], addDays(TODAY, -1)).find((e) => e.id === out.record!.id)!;
    expect(entry.undone).toBe(true);
    expect(entry.lines[0]).toMatch(/^Je trainingen hebben weer hun gewone duur\./);
  });

  it('een instap die al weg is: niets in het logboek', async () => {
    const out = await undoReentryNow(TODAY);
    expect(out.record).toBeUndefined();
    expect(await PlanChangeProposalsRepo.getAll()).toEqual([]);
  });
});
