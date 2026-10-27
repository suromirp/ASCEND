import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, SettingsRepo } from './database';
import { planIllnessChange } from '../engine/illness';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { addDays, todayISO } from '../utils/dates';

// Ziek melden is een voorstel met Akkoord: het rekenen bewaart niets, Akkoord
// bewaart de periode en haalt de trainingen weg, Liever niet laat alles staan.

async function setup() {
  const [sessions, templates] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll()]);
  const stored = await SettingsRepo.get();
  const today = todayISO();
  const plan = planIllnessChange({ action: 'report', kind: 'below_neck' }, stored.illnessEpisodes ?? [], sessions, templates, [], today)!;
  return { sessions, plan, today };
}

describe('ziek melden als voorstel', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
    await syncProgramHorizon();
  });

  it('het voorstel bewaart niets: Liever niet laat planning en periodes zoals ze waren', async () => {
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());
    const { plan } = await setup();
    expect(plan.changesPlanning).toBe(true);
    // Liever niet: er wordt niets aangeroepen, dus niets bewaard.
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await SettingsRepo.get()).illnessEpisodes ?? []).toEqual([]);
  });

  it('Akkoord bewaart de periode en haalt de trainingen van het voorstel weg', async () => {
    const { plan, sessions, today } = await setup();
    const applied = applyPlanChangeItems(plan.proposal.changes, sessions, undefined, { by: 'proposal', proposalId: plan.proposal.id, at: new Date().toISOString() });
    expect(applied.unsupported).toEqual([]);
    await SettingsRepo.set({ illnessEpisodes: plan.episodesAfter });
    const stored = await SettingsRepo.get();
    expect(stored.illnessEpisodes).toHaveLength(1);
    expect(stored.illnessEpisodes![0]).toMatchObject({ kind: 'below_neck', startDate: today });
    const gone = new Set(plan.proposal.changes.map((c) => c.plannedSessionId));
    expect(applied.sessions.filter((s) => gone.has(s.id) && s.status !== 'skipped')).toEqual([]);
  });

  it('een lopende periode van voor deze versie blijft werken voor weer beter', async () => {
    await SettingsRepo.set({ illnessEpisodes: [{ id: 'oud', kind: 'stomach', startDate: addDays(todayISO(), -2) }] });
    const [sessions, templates, stored] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), SettingsRepo.get()]);
    const plan = planIllnessChange({ action: 'recover' }, stored.illnessEpisodes ?? [], sessions, templates, [], todayISO())!;
    expect(plan.episodesAfter).toEqual([{ id: 'oud', kind: 'stomach', startDate: addDays(todayISO(), -2), endDate: todayISO() }]);
    // Nog niet bewaard.
    expect((await SettingsRepo.get()).illnessEpisodes![0].endDate).toBeUndefined();
  });
});
