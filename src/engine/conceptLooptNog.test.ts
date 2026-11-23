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
import { fullWeekAdvice, weekLoss, type FullWeekAdviceInput } from './fullWeek';
import { recentAdherence } from './onCourse';
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
import onCourseCard from '../components/OnCourseCard.tsx?raw';
import adviceComputeSrc from './adviceCompute.ts?raw';
import adviceWeekSrc from './adviceWeek.ts?raw';
import adviceBlockSrc from './adviceBlock.ts?raw';
import extraRunSrc from './extraRun.ts?raw';
import repeatWeekSrc from './repeatWeek.ts?raw';
import onCourseSrc from './onCourse.ts?raw';
import type { IllnessEpisode } from '../models/illness';

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
    ['components/OnCourseCard.tsx', onCourseCard, 0],
  ])('%s', (_name, src, min) => {
    const calls = (src.match(/leftOutOfCount\(|buildWeekReview\(|recentAdherence\(|deriveSessionStatus\([^)]*\{ leave|missedInWeek\(|planMissed\(|computeAdvice\(\{/g) ?? []).length;
    const passed = (src.match(/openDraft(Id)?\b/g) ?? []).length;
    expect(calls).toBeGreaterThanOrEqual(min);
    expect(passed).toBeGreaterThanOrEqual(calls);
  });
});

// De aanroep die begint bij `name(`, tot de bijbehorende sluithaak.
function callsOf(src: string, name: string): string[] {
  const out: string[] = [];
  for (let i = src.indexOf(`${name}(`); i >= 0; i = src.indexOf(`${name}(`, i + 1)) {
    if (/(function|export|import)\s*$/.test(src.slice(Math.max(0, i - 16), i)) || /\w$|\w\.$/.test(src.slice(Math.max(0, i - 2), i))) continue;
    let depth = 0;
    let j = i + name.length;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')' && --depth === 0) break;
    }
    out.push(src.slice(i, j + 1));
  }
  return out;
}

describe('ook de engine geeft het concept door (Warden, 15 november)', () => {
  it.each([
    ['engine/adviceCompute.ts', adviceComputeSrc, ['fullWeekAdvice']],
    ['engine/adviceWeek.ts', adviceWeekSrc, ['proposeExtraSession']],
    ['engine/adviceBlock.ts', adviceBlockSrc, ['proposeRepeatWeek']],
    ['engine/extraRun.ts', extraRunSrc, ['buildWeekReview', 'fullWithExtra']],
    ['engine/repeatWeek.ts', repeatWeekSrc, ['buildWeekReview']],
    ['engine/onCourse.ts', onCourseSrc, ['buildWeekReview']],
    ['state/adviceAndWeek.ts', adviceState, ['fullWeekConcern', 'computeAdvice']],
    ['components/OnCourseCard.tsx', onCourseCard, ['assessOnCourse']],
  ])('%s', (_name, src, names) => {
    for (const name of names) {
      const calls = callsOf(src, name);
      expect(calls.length, name).toBeGreaterThan(0);
      for (const c of calls) expect(c, name).toMatch(/openDraft/);
    }
  });
});

describe('een andere voorbije training blijft gemist (mutatie M6)', () => {
  it('het concept van woensdag haalt dinsdag niet uit gemist', () => {
    const logs: SessionLog[] = [];
    expect(deriveSessionStatus(upper, logs, false, { openDraft: 'ps_wo' }).status).toBe('missed');
    expect(isDraftOpen(upper, 'ps_wo', TODAY)).toBe(false);
    expect(left(logs, 'ps_wo')('ps_di')).toBe(false);
    expect(planMissed(missedInput({ logs, openDraftId: 'ps_wo' })).item).toMatchObject({ kind: 'ask', session: { id: 'ps_di' } });
    const review = buildWeekReview({ weekStart: monday, plannedSessions: week, logs, templates, program, planChangeLog: [], asOf: TODAY, openDraft: 'ps_wo' })!;
    expect(review.missed).toHaveLength(1);
  });
});

describe('het inhaaladvies zwijgt over een training die nog loopt (mutatie M4)', () => {
  // Zondag 3 januari de lange duurloop niet gelogd, maandag 4 januari een rustdag: zonder concept het inhaaladvies.
  const longRun = ps('ps_lang', 'tpl_long_run', '2027-01-03');
  const restDay = ps('ps_rust', 'tpl_herstel', '2027-01-04');
  const inputs = (openDraft?: string): AdviceInputs => ({ logs: [], plannedSessions: [longRun, restDay], templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2027-01-04', openDraft });

  it('zonder concept wel, met een concept van die training niet', () => {
    vi.setSystemTime(new Date('2027-01-04T09:00:00+01:00'));
    expect(computeAdvice(inputs()).some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(true);
    expect(computeAdvice(inputs('ps_lang')).some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(false);
    // Een concept van een andere training laat het advies staan.
    expect(computeAdvice(inputs('ps_ander')).some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(true);
  });
});

describe('Ritme en de coach tellen hem niet (mutatie M11)', () => {
  it('recentAdherence geeft het concept door aan de weekterugblik', () => {
    // Vier afgeronde weken met elk dezelfde drie trainingen, alles gedaan behalve Benen A van tien dagen terug.
    const weeks = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'];
    const plan = weeks.flatMap((m) => [ps(`di-${m}`, 'tpl_upper_a', addDays(m, 1)), ps(`wo-${m}`, 'tpl_lower_a', addDays(m, 2)), ps(`do-${m}`, 'tpl_easy_run', addDays(m, 3))]);
    const open = 'wo-2026-11-23';
    const logs = plan.filter((s) => s.id !== open).map((s) => done(s));
    const base = { today: TODAY, program, plannedSessions: plan, logs, templates, planChangeLog: [] };
    const without = recentAdherence(base);
    const withDraft = recentAdherence({ ...base, openDraft: open });
    expect(without.planned - without.done).toBe(1);
    expect(withDraft.planned).toBe(without.planned - 1);
    expect(withDraft.done).toBe(without.done);
  });
});

describe('een concept dat dagen blijft liggen (keuze van de coördinator, 15 november)', () => {
  it('tien dagen oud: nog steeds loopt nog, niet gemist, tot je afrondt of verwijdert', () => {
    const old = ps('ps_oud', 'tpl_lower_a', addDays(TODAY, -10));
    const plan = [old, upper, legs, run];
    expect(deriveSessionStatus(old, [], false, { openDraft: 'ps_oud' }).status).toBe('open');
    const leftOut = leftOutOfCount(plan, [], undefined, TODAY, program.startDate, { periods: undefined, loggedIds: new Set(), openDraft: 'ps_oud' });
    expect(leftOut('ps_oud')).toBe(true);
    const review = buildWeekReview({ weekStart: mondayOfWeek(old.scheduledDate), plannedSessions: plan, logs: [], templates, program, planChangeLog: [], asOf: TODAY, openDraft: 'ps_oud' })!;
    expect(review.missed).toEqual([]);
    // Verwijderd: weer gemist.
    expect(deriveSessionStatus(old, [], false, { openDraft: openDraftId(undefined, []) }).status).toBe('missed');
  });
});

describe('een concept op een ziektedag of in de afbouw voor een race', () => {
  it('op een ziektedag: loopt nog, niet vervallen, en niet in de regel Vervallen', () => {
    const ill: IllnessEpisode[] = [{ id: 'z', kind: 'below_neck', startDate: addDays(monday, 2) } as IllnessEpisode];
    expect(deriveSessionStatus(legs, [], false, { illness: ill }).status).toBe('away');
    expect(deriveSessionStatus(legs, [], false, { illness: ill, openDraft: 'ps_wo' }).status).toBe('open');
    const plan = planMissed(missedInput({ logs: [done(upper)], illnessEpisodes: ill, openDraftId: 'ps_wo' }));
    expect(plan.lapsed?.sessions.map((m) => m.session.id) ?? []).not.toContain('ps_wo');
    const leftOut = leftOutOfCount(week, [], ill, TODAY, program.startDate, { periods: undefined, loggedIds: loggedIds([done(upper)]), openDraft: 'ps_wo' });
    expect(leftOut('ps_wo')).toBe(true);
    expect(leftOut('ps_di')).toBe(false);
  });

  it('in de afbouw na de race: loopt nog, en een andere training uit de afbouw vervalt gewoon', () => {
    const race = ps('ps_race', 'tpl_race', addDays(monday, 2));
    const taper = ps('ps_afbouw', 'tpl_easy_run', addDays(monday, 0));
    const races = [race.scheduledDate];
    expect(deriveSessionStatus(upper, [], false, { races, openDraft: 'ps_di' }).status).toBe('open');
    expect(deriveSessionStatus(taper, [], false, { races, openDraft: 'ps_di' }).status).toBe('away');
  });
});

describe('de volle week telt een training die nog loopt niet als verloren', () => {
  // Maandag 2 november: dinsdag Bovenlichaam A begonnen en blijven liggen; de rest van de week is vol.
  const MON = '2026-11-02';
  const d = (n: number) => addDays(MON, n);
  const row = (templateId: string, n: number, over: Partial<PlannedSession> = {}) => ps(`${templateId}@${n}`, templateId, d(n), { order: n, ...over });
  const byProposal = { lock: { by: 'proposal' as const, at: `${d(2)}T06:17:00Z` } };
  const legsRow = row('tpl_lower_a', 2);
  const sessions = [
    row('tpl_herstel', 0), row('tpl_upper_a', 1), legsRow, row('tpl_easy_run', 3), row('tpl_upper_b', 4), row('tpl_strides_run', 4, byProposal),
    row('tpl_hill_intervals', 5), row('tpl_long_run', 6), row('tpl_bodyweight', 6, byProposal),
  ];
  const logs = [done(legsRow)];
  const fullProgram: Program = { ...base, startDate: '2026-09-28' };
  const inp = (openDraft?: string): FullWeekAdviceInput => ({ today: d(3), sessions, logs, templates, respondedIds: new Set(), ask: true, check: { restDay: 1, program: fullProgram }, openDraft });

  it('weekLoss en het voorstel: zonder concept verloren, met concept niet', () => {
    vi.setSystemTime(new Date(`${d(3)}T09:00:00+01:00`));
    expect(weekLoss(inp())).toEqual([{ date: d(1), name: 'Bovenlichaam A', how: 'missed' }]);
    expect(weekLoss(inp('tpl_upper_a@1'))).toEqual([]);
    expect(fullWeekAdvice(inp()).length).toBe(1);
    expect(fullWeekAdvice(inp('tpl_upper_a@1'))).toEqual([]);
    // Een concept van een andere training laat het verlies staan.
    expect(weekLoss(inp('tpl_long_run@6'))).toHaveLength(1);
  });

  it('via computeAdvice: geen FULL-WEEK met het concept', () => {
    vi.setSystemTime(new Date(`${d(3)}T09:00:00+01:00`));
    const inputs = (openDraft?: string) => ({
      logs, plannedSessions: sessions, templates, injuries: [], program: fullProgram, dailyTimeBudget: undefined, sameDayPairingPreference: 'automatic',
      respondedIds: new Set<string>(), asOf: d(3), restDay: 1, missedLink: { on: false, declined: [] }, openDraft,
      // Zonder logs ziet de terugkeer twee stille weken; die gaat voor inhalen (I-154). Hier gaat het om het inhalen zelf.
      reentry: { choice: 'off' },
    }) as AdviceInputs;
    const full = (list: { ruleId: string }[]) => list.filter((a) => a.ruleId === 'WEEK-FULL').length;
    // Zonder concept staat eerst het inhaaladvies (dat laat Bovenlichaam A vallen) en wacht de volle week daarop.
    // Is dat beantwoord, dan komt de volle week. Met het concept komt geen van beide: er is niets verloren.
    const catchUp = computeAdvice(inputs()).find((a) => a.ruleId === 'MISSED-CATCH-UP');
    expect(catchUp).toBeDefined();
    const answered = (openDraft?: string) => ({ ...inputs(openDraft), respondedIds: new Set([catchUp!.id]) });
    expect(full(computeAdvice(answered()))).toBe(1);
    expect(full(computeAdvice(answered('tpl_upper_a@1')))).toBe(0);
    expect(computeAdvice(inputs('tpl_upper_a@1')).some((a) => a.ruleId === 'MISSED-CATCH-UP' || a.ruleId === 'WEEK-FULL')).toBe(false);
  });
});
