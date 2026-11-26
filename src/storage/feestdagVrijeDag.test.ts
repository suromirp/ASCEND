// Feestdagen als voorstel, in de opslag (docs/beslissingen/2026-11-26-feestdagen-als-voorstel.md): Akkoord op een
// feestdag loopt door precies de weg van zelf een vrije dag toevoegen (state/bodyAndLeave.ts, planLeave en
// applyLeave, met de echte usePlanChangeActions) en bewaart één periode Vrije dagen. Ongedaan maken uit de melding
// en weghalen via dezelfde weg zetten alles terug. useCallback en useMemo geven hier de functie en de waarde zelf
// terug, zodat de hooks zonder scherm draaien. Testdata is nagemaakt.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), useCallback: <T,>(fn: T) => fn, useMemo: <T,>(fn: () => T) => fn() }));
vi.mock('../utils/flipDom', () => ({ armFlip: () => undefined, disarmFlip: () => undefined }));

import { wipeAllData, seedIfEmpty, PlannedSessionsRepo, SessionTemplatesRepo, SettingsRepo, type AppSettings } from './database';
import { undoPlanChangeNow } from './undoPlanChange';
import { useBodyAndLeave } from '../state/bodyAndLeave';
import { usePlanChangeActions } from '../state/planChangeActions';
import { DEFAULT_GOAL_ENGINE_CONFIG } from '../models/goalEngineConfig';
import { holidayOffer, holidayPeriod, planHorizonEnd } from '../engine/publicHolidays';
import type { PlannedSession } from '../models/training';
import type { RecentPlanChange, PlanChangeProposal } from '../models/planChange';
import type { UndoRestore } from '../state/appDataTypes';
import type { PublicHoliday } from '../models/publicHoliday';

const TODAY = '2027-03-26';
const HOLIDAY: PublicHoliday = { date: '2027-03-29', name: 'Tweede Paasdag', country: 'NL', source: 'nager-date' };
const row = (id: string, templateId: string, scheduledDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: '2027-03-29', status: 'planned', order: 0 });

interface Loaded { settings: AppSettings; plannedSessions: PlannedSession[]; templates: Awaited<ReturnType<typeof SessionTemplatesRepo.getAll>> }

const load = async (): Promise<Loaded> => ({ settings: await SettingsRepo.get(), plannedSessions: await PlannedSessionsRepo.getAll(), templates: await SessionTemplatesRepo.getAll() });

// De hooks zelf, zonder scherm: wat ze schrijven gaat in een doos die de test leest.
function useFlow(data: Loaded) {
  const box: { change: RecentPlanChange | null; settings: AppSettings } = { change: null, settings: data.settings };
  const setRecentChange = (v: RecentPlanChange | null | ((p: RecentPlanChange | null) => RecentPlanChange | null)) => { box.change = typeof v === 'function' ? v(box.change) : v; };
  const setSettings = (v: AppSettings | ((p: AppSettings) => AppSettings)) => { box.settings = typeof v === 'function' ? v(box.settings) : v; };
  const refresh = async () => undefined;
  const actions = usePlanChangeActions({ setGoalEngineConfig: () => undefined, setSettings, setRecentChange, recentChange: null, setAdviceResponses: () => undefined, refresh });
  // Zoals goalActions.ts#showStatusOnlyChange: een melding zonder rijen, met de instellingen van ervoor voor Ongedaan maken.
  const showStatusOnlyChange = async (proposal: PlanChangeProposal, restore?: UndoRestore) => {
    setRecentChange({ id: proposal.id, trigger: proposal.trigger, title: proposal.issue, lines: [], why: proposal.consequences, before: [], addedIds: [], written: [], settingsBefore: restore?.settings, createdAt: new Date().toISOString() });
  };
  const leave = useBodyAndLeave({
    program: null, plannedSessions: data.plannedSessions, sessionLogs: [], trainingGoals: [], goalMilestones: [], injuryNotes: [],
    goalEngineConfig: DEFAULT_GOAL_ENGINE_CONFIG, settings: data.settings, setSettings, templates: data.templates,
    stretchCompletion: {} as never, setStretchCompletion: () => undefined, setRecentChange, refresh,
    commitPlanChangeOutcome: actions.commitPlanChangeOutcome, commitPlanChange: actions.commitPlanChange, showStatusOnlyChange,
  });
  return { leave, change: () => box.change };
}

describe('een feestdag als vrije dag, via de weg van zelf toevoegen', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
    await wipeAllData();
    await seedIfEmpty({ withProgram: false });
    for (const s of [row('upper', 'tpl_upper_a', '2027-03-29'), row('easy', 'tpl_easy_run', '2027-03-31')]) await PlannedSessionsRepo.put(s);
  });
  afterEach(() => vi.useRealTimers());

  it('Akkoord bewaart precies één periode Vrije dagen; Ongedaan maken haalt hem weg', async () => {
    const sessions = await PlannedSessionsRepo.getAll();
    const offer = holidayOffer({ holidays: [HOLIDAY], country: 'NL', today: TODAY, horizonEnd: planHorizonEnd(sessions), periods: [], declined: [], enabled: true })!;
    expect(offer.date).toBe('2027-03-29');
    const period = holidayPeriod(offer, 'leave-feestdag');
    const { leave, change } = useFlow(await load());
    const plan = leave.planLeave('add', period);
    expect(plan.periodsAfter).toEqual([period]);
    // Een vrije dag haalt niets weg; wat de planning eromheen doet, staat in het voorstel zelf.
    expect(plan.proposal.changes.filter((c) => c.action === 'remove')).toEqual([]);
    expect(await leave.applyLeave(plan)).toBe('applied');
    expect((await SettingsRepo.get()).leavePeriods).toEqual([{ id: 'leave-feestdag', kind: 'free_days', startDate: '2027-03-29', endDate: '2027-03-29', note: 'Tweede Paasdag' }]);
    // Nu staat er een periode op die dag: geen voorstel meer.
    expect(holidayOffer({ holidays: [HOLIDAY], country: 'NL', today: TODAY, horizonEnd: '2027-03-31', periods: (await SettingsRepo.get()).leavePeriods ?? [], declined: [], enabled: true })).toBeUndefined();

    const notice = change();
    expect(notice?.settingsBefore).toEqual({ leavePeriods: [] });
    await undoPlanChangeNow(notice!);
    expect((await SettingsRepo.get()).leavePeriods).toEqual([]);
    expect((await PlannedSessionsRepo.getAll()).map((s) => [s.id, s.scheduledDate]).sort()).toEqual(sessions.map((s) => [s.id, s.scheduledDate]).sort());
  });

  it('weghalen gaat door dezelfde weg en zet terug zoals het was', async () => {
    const period = holidayPeriod({ id: 'feestdag:NL:2027-03-29', date: HOLIDAY.date, name: HOLIDAY.name, country: 'NL' }, 'leave-feestdag');
    const first = useFlow(await load());
    expect(await first.leave.applyLeave(first.leave.planLeave('add', period))).toBe('applied');
    const before = await PlannedSessionsRepo.getAll();
    const second = useFlow(await load());
    expect(await second.leave.applyLeave(second.leave.planLeave('remove', period))).toBe('applied');
    expect((await SettingsRepo.get()).leavePeriods).toEqual([]);
    expect((await PlannedSessionsRepo.getAll()).map((s) => [s.id, s.scheduledDate]).sort()).toEqual(before.filter((s) => !s.leave || s.leave.role !== 'placed').map((s) => [s.id, s.scheduledDate]).sort());
  });
});
