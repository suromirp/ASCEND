import { describe, it, expect, beforeEach } from 'vitest';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo, ProgramsRepo, SettingsRepo, PlanChangeProposalsRepo,
} from './database';
import { planLeaveChange } from '../engine/leaveProposal';
import { patternDays } from '../engine/planPass';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { resolveVariantDuration } from '../engine/substitutions';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession } from '../models/training';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';

// The sync (the daily planning run) and the proposal for a period use the same
// planning run: a period that was agreed to is already in the plan, so the
// sync after Akkoord, and every sync after that, changes nothing.

const nextMonday = () => addDays(mondayOfWeek(todayISO()), 7);
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped');
const quiet = { phasesChanged: false, added: 0, swapped: 0, removed: 0 };

describe('free days, holidays and treks in the daily planning run', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
    await syncProgramHorizon();
  });

  async function proposeAndAccept(period: LeavePeriod) {
    const [sessions, templates, programs, settings] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll(), SettingsRepo.get()]);
    const program = programs[0];
    const today = todayISO();
    const restDay = settings.restDay ?? 1;
    const plan = planLeaveChange({
      mode: 'add', period, existing: settings.leavePeriods ?? [], sessions, logs: [], templates, today,
      context: (periods) => {
        let n = 0;
        return {
          today, logs: [], templates, program, blocks: [], restDay, slotDays: patternDays(templates, settings, restDay),
          minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program), newId: () => `leave-${n++}`,
          until: addDays(period.endDate, 21), leave: periods,
        };
      },
    });
    // Akkoord: the period is stored and the items are applied with the lock of a proposal.
    const applied = applyPlanChangeItems(plan.proposal.changes, sessions, undefined, { by: 'proposal', proposalId: plan.proposal.id, at: new Date().toISOString() });
    expect(applied.unsupported).toEqual([]);
    const before = new Map(sessions.map((s) => [s.id, s]));
    for (const s of applied.sessions) if (!before.has(s.id) || JSON.stringify(before.get(s.id)) !== JSON.stringify(s)) await PlannedSessionsRepo.put(s);
    await SettingsRepo.set({ leavePeriods: plan.periodsAfter });
    return plan;
  }

  for (const kind of ['no_training', 'trek', 'free_days'] as const) {
    it(`${kind}: the planning run after Akkoord, and the ones after that, write nothing`, async () => {
      const monday = nextMonday();
      const period: LeavePeriod = { id: `leave-${kind}`, kind, startDate: addDays(monday, 1), endDate: addDays(monday, 3) };
      const plan = await proposeAndAccept(period);
      const stored = JSON.stringify((await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id)));
      expect(await syncProgramHorizon()).toEqual(quiet);
      expect(await syncProgramHorizon()).toEqual(quiet);
      expect(JSON.stringify((await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id)))).toBe(stored);
      expect(plan.proposal.trigger).toBe('leave_added');
      if (kind === 'no_training') {
        for (let i = 1; i <= 3; i++) expect(open(await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate === addDays(monday, i))).toEqual([]);
      }
      if (kind === 'trek') {
        const walks = open(await PlannedSessionsRepo.getAll()).filter((s) => s.leave?.periodId === period.id);
        expect(walks.map((s) => s.scheduledDate).sort()).toEqual([1, 2, 3].map((i) => addDays(monday, i)));
      }
    });
  }

  it('a period stored without a proposal is brought into the plan by the next run, with a notice, and then it is quiet', async () => {
    const monday = nextMonday();
    await SettingsRepo.set({ leavePeriods: [{ id: 'leave-direct', kind: 'no_training', startDate: addDays(monday, 2), endDate: addDays(monday, 3) }] });
    const first = await syncProgramHorizon();
    expect(first.removed + first.swapped).toBeGreaterThan(0);
    expect(first.repairs?.lines.length).toBeGreaterThan(0);
    for (const i of [2, 3]) expect(open(await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate === addDays(monday, i))).toEqual([]);
    expect(await syncProgramHorizon()).toEqual(quiet);
  });

  it('history and logged sessions on a holiday day stay, a second run writes nothing', async () => {
    const monday = nextMonday();
    const target = open(await PlannedSessionsRepo.getAll()).find((s) => s.scheduledDate === addDays(monday, 1))!;
    await SessionLogsRepo.put({ id: 'log-1', plannedSessionId: target.id, templateId: target.templateId, type: 'strength', completedDate: target.scheduledDate, completedAt: `${target.scheduledDate}T09:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual' });
    const pastBefore = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate < todayISO());
    await SettingsRepo.set({ leavePeriods: [{ id: 'leave-hist', kind: 'no_training', startDate: addDays(todayISO(), -3), endDate: addDays(monday, 3) }] });
    await syncProgramHorizon();
    const after = await PlannedSessionsRepo.getAll();
    expect(after.find((s) => s.id === target.id)).toEqual(target);
    expect(after.filter((s) => s.scheduledDate < todayISO())).toEqual(pastBefore);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(await syncProgramHorizon()).toEqual(quiet);
  });

  it('ruimt tochtdagen op die een oudere versie als overgeslagen rij achterliet, nooit een gelogde', async () => {
    const day = addDays(nextMonday(), 5);
    const stray = (id: string): PlannedSession => ({ id, templateId: 'tpl_mountain_hike', scheduledDate: day, weekStartDate: mondayOfWeek(day), status: 'skipped', order: 9, lock: { by: 'proposal', proposalId: 'p-weg', at: 'x' } });
    await PlannedSessionsRepo.put(stray('stray-1'));
    await PlannedSessionsRepo.put(stray('stray-logged'));
    await SessionLogsRepo.put({ id: 'log-s', plannedSessionId: 'stray-logged', templateId: 'tpl_mountain_hike', type: 'hiking', completedDate: day, completedAt: `${day}T09:00:00.000Z`, variant: 'full', durationMinutes: 180, source: 'manual' } as never);
    const base = { alternatives: [], consequences: '', explanation: '', createdAt: 'x', resolvedAt: 'x', resolution: 'accepted' as const };
    await PlanChangeProposalsRepo.put({ ...base, id: 'p-erbij', trigger: 'leave_added', issue: 'Tocht', changes: [{ action: 'add', newSessionDraft: { templateId: 'tpl_mountain_hike', scheduledDate: day, weekStartDate: mondayOfWeek(day) }, leave: { periodId: 't', role: 'placed', from: day }, generatedBy: ['engine/leaveProposal.ts'] }] });
    await PlanChangeProposalsRepo.put({ ...base, id: 'p-weg', trigger: 'leave_removed', issue: 'Tocht weg', changes: ['stray-1', 'stray-logged'].map((id) => ({ plannedSessionId: id, action: 'remove' as const, leave: null, generatedBy: ['engine/leaveProposal.ts'] })) });
    await syncProgramHorizon();
    const ids = (await PlannedSessionsRepo.getAll()).map((s) => s.id);
    expect(ids).not.toContain('stray-1');
    expect(ids).toContain('stray-logged');
  });
});
