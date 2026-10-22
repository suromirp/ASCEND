import { describe, it, expect, beforeEach } from 'vitest';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, ProgramsRepo, SettingsRepo, MetaRepo,
} from './database';
import { planRestDayChange } from '../engine/restDayProposal';
import { patternDays } from '../engine/planPass';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { resolveVariantDuration } from '../engine/substitutions';
import { addDays, isoWeekday, mondayOfWeek, todayISO } from '../utils/dates';

// Doorloop, punt 5: de rustdag wijzigen verschoof tientallen trainingen, ook
// deze week, zonder voorstel, en de melding telde alleen de reparaties van de
// weekcontrole. Nu: een voorstel met een eerlijke telling, niets verandert voor
// Akkoord, en na Akkoord verandert de planningsronde niets meer.

const quiet = { phasesChanged: false, added: 0, swapped: 0, removed: 0 };

async function plan(restDay: number) {
  const [sessions, templates, programs, settings] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll(), SettingsRepo.get()]);
  const program = programs[0];
  const today = todayISO();
  let n = 0;
  return planRestDayChange({
    restDay, sessions, logs: [], templates, today,
    context: {
      today, logs: [], templates, program, blocks: [], restDay, slotDays: patternDays(templates, settings, restDay),
      minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program), newId: () => `rd-${n++}`,
    },
  });
}

describe('de rustdag wijzigen is een voorstel met Akkoord', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
    await syncProgramHorizon();
  });

  it('telt elke training die verschuift, ook in deze en volgende week, en verandert niets voor Akkoord', async () => {
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());
    const result = await plan(3);
    const moves = result.proposal.changes.filter((c) => c.action === 'move');
    expect(moves.length).toBeGreaterThan(2);
    expect(result.near).toBeGreaterThan(0);
    expect(result.proposal.consequences).toContain(String(result.proposal.changes.length));
    // Geen slot: het blijven sessies van het systeem.
    for (const m of moves) expect(m.restore).toBe(true);
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
  });

  it('na Akkoord staat er niets meer op de nieuwe rustdag, en de planningsronde erna schrijft niets', async () => {
    const result = await plan(3);
    const sessions = await PlannedSessionsRepo.getAll();
    const applied = applyPlanChangeItems(result.proposal.changes, sessions, undefined, { by: 'proposal', proposalId: result.proposal.id, at: new Date().toISOString() });
    expect(applied.unsupported).toEqual([]);
    const ids = new Set(applied.sessions.map((s) => s.id));
    for (const s of sessions) if (!ids.has(s.id)) await PlannedSessionsRepo.delete(s.id);
    for (const s of applied.sessions) await PlannedSessionsRepo.put(s);
    await SettingsRepo.set({ restDay: 3 });
    await MetaRepo.set('appliedRestDay', 3);
    expect(await syncProgramHorizon()).toEqual(quiet);
    const from = addDays(mondayOfWeek(todayISO()), 7);
    const onRestDay = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= from && s.status !== 'skipped' && isoWeekday(s.scheduledDate) === 3);
    const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    expect(onRestDay.filter((s) => templates.get(s.templateId)?.type !== 'recovery')).toEqual([]);
  });
});
