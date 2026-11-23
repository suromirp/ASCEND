import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, SessionLogsRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan } from './horizonPlan';
import { primePlanningRegisters } from '../state/planningSync';
import { reentryFirstDay, reentryFirstDayItems, reentryNote, REENTRY_TITLE, REENTRY_WHY } from '../engine/reentry';
import { addDays } from '../utils/dates';

// I-144: de eerste dag van een rustiger instap is geen herstel maar je eerste lichte training. Door de echte
// planningsronde: voor Akkoord verandert er niets, na Akkoord staat de training op die dag en het herstel op haar dag,
// en een nieuwe ronde zet het niet terug. Nagemaakte gebruiker: het volledige programma met zijn doel.

const START = '2026-11-16';

async function dayOf(date: string): Promise<string[]> {
  const logged = new Set((await SessionLogsRepo.getAll()).map((l) => l.plannedSessionId));
  return (await PlannedSessionsRepo.getAll())
    .filter((s) => s.scheduledDate === date && s.status !== 'skipped' && !logged.has(s.id))
    .map((s) => s.templateId)
    .sort();
}

describe('rustiger instap: de eerste dag wordt een training, alleen met Akkoord', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${START}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-reentry-first-day', seedProgram: true });
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  it('de ruil staat in het voorstel, gebeurt pas na Akkoord en blijft na een nieuwe ronde', async () => {
    const [planned, templates, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), SessionLogsRepo.getAll()]);
    // De eerste dag in de komende weken met alleen herstel en een kracht- of looptraining erna.
    let first;
    for (let k = 0; k < 28 && !first; k++) first = reentryFirstDay({ from: addDays(START, k), until: addDays(START, k + 6) }, planned, logs, templates);
    expect(first).toBeDefined();
    const f = first!;
    vi.setSystemTime(new Date(`${f.date}T08:00:00`));
    const week = { from: f.date, until: addDays(f.date, 6), factor: 0.75 };
    const training = planned.find((s) => s.id === f.trainingId)!.templateId;
    const rest = planned.find((s) => s.id === f.restId)!.templateId;
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());

    const plan = await computeHorizonPlan({
      title: REENTRY_TITLE, why: 'Rustiger instap na een pauze.', explanation: REENTRY_WHY, trigger: 'reentry_planned',
      settings: { reentryWeeks: [week] }, notes: [reentryNote(week, undefined, f)], startItems: reentryFirstDayItems(f),
    }, { prime: primePlanningRegisters });
    expect(plan.proposal.changes.some((c) => c.plannedSessionId === f.trainingId && c.toDate === f.date)).toBe(true);
    // Voor Akkoord verandert er niets.
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await SettingsRepo.get()).reentryWeeks).toBeUndefined();

    expect((await applyHorizonPlanNow(plan, { prime: primePlanningRegisters })).status).toBe('applied');
    expect(await dayOf(f.date)).toContain(training);
    expect(await dayOf(f.date)).not.toContain(rest);
    expect(await dayOf(f.trainingDate)).toContain(rest);
    // Een nieuwe ronde zet het niet terug.
    await syncProgramHorizon();
    expect(await dayOf(f.date)).toContain(training);
    expect(await dayOf(f.date)).not.toContain(rest);
  });
});
