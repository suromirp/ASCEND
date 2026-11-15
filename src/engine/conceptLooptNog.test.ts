// Een training die bleef liggen in Forge (een concept) loopt nog: geen vraag Niet gedaan?, niet gemist en niet gedaan,
// in Vandaag, Week, de weekterugblik en de reeks dezelfde afleiding
// (docs/beslissingen/2026-11-15-concept-loopt-nog.md). Alles nagemaakt.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveSessionStatus, isDraftOpen, openDraftId } from './sessionStatus';
import { leftOutOfCount } from './weekLogs';
import { rowExtra } from './weekRow';
import { buildWeekReview } from './weekReview';
import { computeCurrentStreak } from './streak';
import { weekProgress } from './weekProfile';
import { MISSED_ADVICE, planMissed, type MissedInput } from './missedTraining';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import { addDays, mondayOfWeek } from '../utils/dates';
import weekPage from '../pages/Week.tsx?raw';
import weekPlanner from '../components/WeekPlanner.tsx?raw';
import missedHook from '../components/useMissedTraining.ts?raw';
import standData from '../components/stand/useStandData.ts?raw';
import seasonOverview from '../components/SeasonOverview.tsx?raw';
import weekReviewSheet from '../components/WeekReview.tsx?raw';
import deviceNotices from '../components/DeviceNoticesHost.tsx?raw';
import adviceState from '../state/adviceAndWeek.ts?raw';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };
const templateById = new Map(templates.map((t) => [t.id, t]));

const ps = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0, ...over,
});
const done = (s: PlannedSession, completedDate = s.scheduledDate): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templateById.get(s.templateId)!.type,
  completedDate, completedAt: `${completedDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 50, source: 'manual',
} as SessionLog);

// Week van maandag 30 november. Vandaag is donderdag 3 december; Benen A van woensdag ligt als concept in Forge.
const TODAY = '2026-12-03';
const monday = '2026-11-30';
const upper = ps('ps_di', 'tpl_upper_a', addDays(monday, 1));
const legs = ps('ps_wo', 'tpl_lower_a', addDays(monday, 2));
const run = ps('ps_do', 'tpl_easy_run', TODAY);
const week = [upper, legs, run];
// Wat utils/forgeSessionStore.ts#readSession teruggeeft: de wijzer van het concept.
const session = (plannedSessionId?: string) => ({ pointer: { key: 'k', templateId: 'tpl_lower_a', name: 'Benen A', ...(plannedSessionId ? { plannedSessionId } : {}) } });

const missedInput = (over: Partial<MissedInput>): MissedInput => ({ plannedSessions: week, logs: [done(upper)], templates, today: TODAY, settings: { ...MISSED_ADVICE, days: 1 }, memory: {}, ...over });
const loggedIds = (logs: SessionLog[]) => new Set(logs.map((l) => l.plannedSessionId));
const left = (logs: SessionLog[], openDraft: string | undefined) => leftOutOfCount(week, [], undefined, TODAY, program.startDate, { periods: undefined, loggedIds: loggedIds(logs), openDraft });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00+01:00`));
});
afterEach(() => vi.useRealTimers());

describe('openDraftId: de ene plek die het concept leest', () => {
  it('geeft de geplande sessie van het concept, zolang er geen log is', () => {
    expect(openDraftId(session('ps_wo'), [])).toBe('ps_wo');
    expect(openDraftId(session('ps_wo'), [done(legs, TODAY)])).toBeUndefined();
  });

  it('geen concept of een losse training zonder plannedSessionId: niets', () => {
    expect(openDraftId(undefined, [])).toBeUndefined();
    expect(openDraftId(session(), [])).toBeUndefined();
  });
});

describe('concept van gisteren: loopt nog', () => {
  const logs = [done(upper)];

  it('Week noemt hem "loopt nog", niet gemist', () => {
    expect(deriveSessionStatus(legs, logs).status).toBe('missed');
    const { status } = deriveSessionStatus(legs, logs, false, { openDraft: 'ps_wo' });
    expect(status).toBe('open');
    expect(rowExtra({ open: status === 'open' })?.text).toBe('loopt nog');
  });

  it('geen vraag Niet gedaan?, ook niet met een dag wachten', () => {
    expect(planMissed(missedInput({})).item).toMatchObject({ kind: 'ask', session: { id: 'ps_wo' } });
    const plan = planMissed(missedInput({ openDraftId: 'ps_wo' }));
    expect(plan.item).toBeUndefined();
    expect(plan.autoSkip).toEqual([]);
  });

  it('met Zelf overslaan zet ASCEND hem niet op overgeslagen', () => {
    const auto = { ...MISSED_ADVICE, choice: 'auto' as const, days: 1 as const };
    expect(planMissed(missedInput({ settings: auto })).autoSkip.map((m) => m.session.id)).toEqual(['ps_wo']);
    expect(planMissed(missedInput({ settings: auto, openDraftId: 'ps_wo' })).autoSkip).toEqual([]);
  });

  it('telt niet als gemist en niet als gedaan: ring, weekterugblik en reeks', () => {
    expect(left(logs, undefined)('ps_wo')).toBe(false);
    expect(left(logs, 'ps_wo')('ps_wo')).toBe(true);
    expect(weekProgress(week, logs, templateById, left(logs, undefined))).toEqual({ done: 1, total: 3 });
    expect(weekProgress(week, logs, templateById, left(logs, 'ps_wo'))).toEqual({ done: 1, total: 2 });

    const review = (openDraft?: string) => buildWeekReview({ weekStart: monday, plannedSessions: week, logs, templates, program, planChangeLog: [], asOf: TODAY, openDraft })!;
    expect(review().missed).toHaveLength(1);
    expect(review('ps_wo').missed).toEqual([]);
    expect(review('ps_wo').done).toBe(1);

    const streak = (openDraft?: string) => computeCurrentStreak(week, logs, { templateById, programStart: program.startDate, leftOut: left(logs, openDraft) });
    expect(streak()).toBe(0);
    expect(streak('ps_wo')).toBe(1);
  });

  it('de krachthint telt hem niet als gemist', () => {
    // Twee krachttrainingen zonder log in veertien dagen geeft de hint; één daarvan loopt nog.
    const upperOld = ps('ps_di_oud', 'tpl_upper_a', '2026-11-24');
    const inputs = (openDraft?: string): AdviceInputs => ({ logs: [], plannedSessions: [upperOld, legs], templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: TODAY, openDraft });
    expect(computeAdvice(inputs()).some((a) => a.ruleId === 'STRENGTH-REGULARITY')).toBe(true);
    expect(computeAdvice(inputs('ps_wo')).some((a) => a.ruleId === 'STRENGTH-REGULARITY')).toBe(false);
  });
});

describe('concept van vandaag: gewoon vandaag', () => {
  it('telt nog als gepland, niet als loopt nog', () => {
    const today = ps('ps_vandaag', 'tpl_lower_a', TODAY);
    expect(isDraftOpen(today, 'ps_vandaag', TODAY)).toBe(false);
    expect(deriveSessionStatus(today, [], false, { openDraft: 'ps_vandaag' }).status).toBe('today');
  });
});

describe('concept verwijderd: weer het gewone gedrag', () => {
  it('zonder concept is de training gewoon gemist en komt de vraag', () => {
    const id = openDraftId(undefined, [done(upper)]);
    expect(deriveSessionStatus(legs, [done(upper)], false, { openDraft: id }).status).toBe('missed');
    expect(planMissed(missedInput({ openDraftId: id })).item).toMatchObject({ kind: 'ask', session: { id: 'ps_wo' } });
    expect(left([done(upper)], id)('ps_wo')).toBe(false);
  });
});

describe('concept afgerond: een log, dus gedaan', () => {
  it('het log van vandaag maakt de training van woensdag gedaan, ook als het concept nog niet opgeruimd is', () => {
    const logs = [done(upper), done(legs, TODAY)];
    const id = openDraftId(session('ps_wo'), logs);
    expect(id).toBeUndefined();
    expect(deriveSessionStatus(legs, logs, false, { openDraft: 'ps_wo' }).status).toBe('completed');
    expect(left(logs, 'ps_wo')('ps_wo')).toBe(false);
    const review = buildWeekReview({ weekStart: monday, plannedSessions: week, logs, templates, program, planChangeLog: [], asOf: TODAY, openDraft: 'ps_wo' })!;
    expect(review.done).toBe(2);
    expect(review.missed).toEqual([]);
  });
});

describe('concept van een losse training', () => {
  it('raakt geen geplande training: woensdag blijft gemist', () => {
    const id = openDraftId(session(), [done(upper)]);
    expect(id).toBeUndefined();
    expect(deriveSessionStatus(legs, [done(upper)], false, { openDraft: id }).status).toBe('missed');
    expect(planMissed(missedInput({ openDraftId: id })).item).toMatchObject({ session: { id: 'ps_wo' } });
  });
});

describe('overgeslagen blijft overgeslagen', () => {
  it('een concept van een overgeslagen training verandert de status niet en haalt hem niet uit de telling', () => {
    const skipped = { ...legs, status: 'skipped' as const };
    expect(deriveSessionStatus(skipped, [], false, { openDraft: 'ps_wo' }).status).toBe('skipped');
    expect(isDraftOpen(skipped, 'ps_wo', TODAY)).toBe(false);
    const leftOut = leftOutOfCount([upper, skipped, run], [], undefined, TODAY, program.startDate, { periods: undefined, loggedIds: new Set(), openDraft: 'ps_wo' });
    expect(leftOut('ps_wo')).toBe(false);
  });
});

describe('elke plek die gemist toont, krijgt het concept mee', () => {
  // Een nieuwe aanroeper zonder openDraft noemt een training die nog loopt weer gemist.
  it.each([
    ['pages/Week.tsx', weekPage, 3],
    ['components/WeekPlanner.tsx', weekPlanner, 2],
    ['components/useMissedTraining.ts', missedHook, 1],
    ['components/stand/useStandData.ts', standData, 3],
    ['components/SeasonOverview.tsx', seasonOverview, 1],
    ['components/WeekReview.tsx', weekReviewSheet, 1],
    ['components/DeviceNoticesHost.tsx', deviceNotices, 1],
    ['state/adviceAndWeek.ts', adviceState, 1],
  ])('%s', (_name, src, min) => {
    const calls = (src.match(/leftOutOfCount\(|buildWeekReview\(|recentAdherence\(|deriveSessionStatus\([^)]*\{ leave|planMissed\(|computeAdvice\(\{/g) ?? []).length;
    const passed = (src.match(/openDraft(Id)?\b/g) ?? []).length;
    expect(calls).toBeGreaterThanOrEqual(min);
    expect(passed).toBeGreaterThanOrEqual(calls);
  });
});
