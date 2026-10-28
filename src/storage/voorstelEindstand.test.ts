import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo, SettingsRepo, MetaRepo, ProgramsRepo, TrainingGoalsRepo, GoalMilestonesRepo } from './database';
import { computeAdvice } from '../engine/adviceEngine';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { previewProposal } from '../engine/proposalPreview';
import { previewPlanPass, patternDays } from '../engine/planPass';
import { raceBlocks, afterGoalWindows } from '../engine/raceBlock';
import { planEndDay } from '../engine/programLayout';
import { mainGoal } from '../engine/mainGoal';
import { resolveVariantDuration } from '../engine/substitutions';
import type { PlannedSession, SessionLog } from '../models/training';

const TODAY = '2026-10-28';
const row = (id: string, templateId: string, scheduledDate: string, weekStartDate: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0, ...extra });
const testLog = (): SessionLog => ({
  id: 'log-test', plannedSessionId: 'p-tue', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2026-10-27', completedAt: '2026-10-27T10:00:00Z', variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 4, stoppedSec: 136 },
} as SessionLog);

async function seed(restDay: number | undefined, withProgram: boolean) {
  await wipeAllData();
  await seedIfEmpty({ withProgram });
  await runBootMigrations({ build: 'test-eindstand', stepLimitMs: 120_000, seedProgram: withProgram });
  for (const s of await PlannedSessionsRepo.getAll()) await PlannedSessionsRepo.delete(s.id);
  await SettingsRepo.set(restDay === undefined ? {} : { restDay: restDay as 4 });
  await MetaRepo.set('appliedRestDay', restDay ?? 1);
  const rows = [
    row('p-tue', 'tpl_test_run', '2026-10-27', '2026-10-26'),
    row('p-thu', 'tpl_lower_a', '2026-10-29', '2026-10-26', { lock: { by: 'user', at: '2026-10-20T10:00:00Z' } }),
    row('p-sat', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
    row('p-sun', 'tpl_long_run', '2026-11-01', '2026-10-26'),
    row('p-mon', 'tpl_herstel', '2026-11-02', '2026-11-02'),
    row('p-thu2', 'tpl_easy_run', '2026-11-05', '2026-11-02'),
  ];
  for (const r of rows) await PlannedSessionsRepo.put(r);
  await SessionLogsRepo.put(testLog());
}
const key = (list: PlannedSession[]) => list.filter((s) => s.scheduledDate >= TODAY).map((s) => `${s.scheduledDate} ${s.templateId} ${s.status === 'skipped' ? 'skipped' : 'actief'}`).sort();

describe('de voorvertoning van een voorstel is de eindstand na Akkoord en de sync', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${TODAY}T10:00:00`)); });
  afterEach(() => vi.useRealTimers());

  for (const withProgram of [true, false]) {
    for (const restDay of [4, undefined]) {
      it(`${withProgram ? 'met' : 'zonder'} programma, rustdag ${restDay ?? 'standaard'}`, async () => {
        await seed(restDay, withProgram);
        await syncProgramHorizon();
        const stored = await PlannedSessionsRepo.getAll();
        const templates = await SessionTemplatesRepo.getAll();
        const settings = await SettingsRepo.get();
        const program = (await ProgramsRepo.getAll())[0] ?? null;
        const goals = await TrainingGoalsRepo.getAll();
        const milestones = await GoalMilestonesRepo.getAll();
        const advice = computeAdvice({ logs: [testLog()], plannedSessions: stored, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: TODAY, restDay: settings.restDay } as never).find((a) => a.ruleId === 'TEST-RETRY');
        expect(advice).toBeDefined();
        // Zoals planPreviewPass in AppDataContext.
        const anchor = planEndDay(goals, milestones, TODAY, settings.afterMainGoal);
        const ladder = new Set(milestones.map((m) => m.goalId));
        const mainGoalId = mainGoal(goals, ladder)?.id;
        const rd = settings.restDay ?? 1;
        const pass = (sessions: PlannedSession[]) => { let n = 0; return previewPlanPass(sessions, {
          today: TODAY, logs: [testLog()], templates, program, blocks: raceBlocks(goals, mainGoalId, anchor, TODAY), afterGoals: afterGoalWindows(goals, mainGoalId, anchor, TODAY), restDay: rd, goalDay: anchor,
          slotDays: patternDays(templates, settings, rd), minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program), newId: () => `preview-pass-${n++}`, until: '2026-11-25',
        }); };
        const changes = advice!.proposal!.changes;
        const shown = pass(applyPlanChangeItems(changes, stored, undefined, { by: 'proposal', at: 'preview' }).sessions);
        previewProposal(changes, stored, templates, pass);
        // Akkoord zoals commitPlanChange, daarna de sync.
        const { sessions } = applyPlanChangeItems(changes, stored, undefined, { by: 'proposal', proposalId: advice!.proposal!.id, at: new Date().toISOString() });
        const touched = new Set(changes.map((c) => c.plannedSessionId));
        for (const s of sessions) if (touched.has(s.id) || !stored.some((o) => o.id === s.id)) await PlannedSessionsRepo.put(s);
        const gone = new Set(sessions.map((s) => s.id));
        for (const s of stored) if (touched.has(s.id) && !gone.has(s.id)) await PlannedSessionsRepo.delete(s.id);
        for (let i = 0; i < 3; i++) await syncProgramHorizon();
        const final = await PlannedSessionsRepo.getAll();
        console.log(withProgram, restDay, '\nSTORED ', key(stored), '\nPREVIEW', key(shown), '\nFINAL  ', key(final));
        expect(key(final)).toEqual(key(shown));
      });
    }
  }
});
