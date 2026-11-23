// I-14 Eén plan, stap naspelen (docs/visie/Ontwerp Eén plan.md, symptomen C en D, invarianten 4 en 5). Wat nu niet
// klopt staat als it.fails met het symptoom in de naam; een latere stap (claude/een-plan-minuten en
// claude/een-plan-een-stem) zet die om naar it. Testdata is nagemaakt.
import { describe, it, expect, afterEach } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { withWeekRepeated } from './repeatWeek';
import { PHASE_BASIS, layoutPhasesForGoal } from './programLayout';
import { resolveEffectiveFullDuration, setRecentSessionMaxima, recentSessionMaxima } from './substitutions';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const longRun = templates.find((t) => t.id === 'tpl_long_run')!;

// --- C: "Deze week nog een keer?" tegen Week ------------------------------------------------------------------------

// Het programma van repeatWeek.test.ts: Basis 4 weken, dan Opbouw met week 1 op 26 oktober, week 2 op 2 november en
// week 3 op 9 november.
const START = '2026-09-28';
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };
const W1 = '2026-10-26';
const W2 = '2026-11-02';
const W3 = '2026-11-09';
const DAYS: [string, number][] = [['tpl_herstel', 0], ['tpl_upper_a', 1], ['tpl_easy_run', 3], ['tpl_hill_intervals', 5], ['tpl_long_run', 6]];
const weekOf = (monday: string): PlannedSession[] => DAYS.map(([templateId, d], i) => ({
  id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned' as const, order: i,
}));
const planned = [W1, W2, W3].flatMap(weekOf);
const logOf = (monday: string, templateId: string, minutes = 50): SessionLog => {
  const s = planned.find((p) => p.id === `${monday}-${templateId}`)!;
  return { id: `log-${s.id}`, plannedSessionId: s.id, templateId, type: templateId === 'tpl_upper_a' ? 'strength' : 'cardio', completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual' };
};
const adviceInputs = (logs: SessionLog[], asOf: string, over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs, plannedSessions: planned, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf, ...over,
});
// "Je lange duurloop wordt deze week X minuten in plaats van Y minuten."
const promised = (effect: string) => {
  const m = /wordt deze week (\d+) minuten in plaats van (\d+) minuten/.exec(effect);
  return m ? { to: Number(m[1]), from: Number(m[2]) } : undefined;
};
// Wat Week toont voor de lange duurloop van die week, nu en na Akkoord (Program.repeatedWeeks).
const weekShows = (monday: string) => {
  const date = addDays(monday, 6);
  return { from: resolveEffectiveFullDuration(longRun, date, program), to: resolveEffectiveFullDuration(longRun, date, withWeekRepeated(program, monday, true)) };
};

describe('symptoom C: de minuten in "Deze week nog een keer?" tegen Week', () => {
  afterEach(() => setRecentSessionMaxima({ asOf: '', minutesByTemplate: {} }));

  it('zonder rem van 110% noemt het voorstel dezelfde minuten als Week', () => {
    // Vorige week (week 1 van de golf) alleen het bovenlichaam gedaan, en geen loop in de laatste 30 dagen: geen rem.
    const logs = [logOf(W1, 'tpl_upper_a')];
    setRecentSessionMaxima(recentSessionMaxima(logs, W2));
    const a = computeAdvice(adviceInputs(logs, W2)).find((x) => x.ruleId === 'REPEAT-WEEK')!;
    expect(a.title).toBe('Deze week nog een keer?');
    expect(promised(a.effect)).toEqual(weekShows(W2));
  });

  it.fails('symptoom C: met de rem van 110% noemt het voorstel de minuten die Week toont, nu en na Akkoord', () => {
    // Week 1 helemaal gedaan met een lange duurloop van 45 minuten, week 2 alleen het bovenlichaam. In week 3 remt de
    // 110% de lange duurloop op 50 minuten, met en zonder herhaling. Het voorstel rekent de kale stap van het schema
    // (progressionTarget) en belooft "66 minuten in plaats van 77"; Week toont 50 en na Akkoord nog steeds 50.
    const logs = [logOf(W1, 'tpl_upper_a'), logOf(W1, 'tpl_easy_run'), logOf(W1, 'tpl_hill_intervals'), logOf(W1, 'tpl_long_run', 45), logOf(W2, 'tpl_upper_a')];
    setRecentSessionMaxima(recentSessionMaxima(logs, W3));
    const a = computeAdvice(adviceInputs(logs, W3)).find((x) => x.ruleId === 'REPEAT-WEEK')!;
    expect(a).toBeDefined();
    expect(weekShows(W3)).toEqual({ from: 50, to: 50 });
    expect(promised(a.effect)).toEqual(weekShows(W3));
  });
});

// --- D: na een zware test ------------------------------------------------------------------------------------------

// Een testloop van 5 km op dinsdag 27 oktober met zwaarte 9 en veel stilstand; vandaag is woensdag 28 oktober.
const testLog: SessionLog = {
  id: 'log-test', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2026-10-27', completedAt: '2026-10-27T10:00:00Z', variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 5, stoppedSec: 136 },
} as SessionLog;
const row = (id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 });
const testWeek = (extra: PlannedSession[] = []): PlannedSession[] => [
  row('upper', 'tpl_upper_b', '2026-10-29', '2026-10-26'),
  row('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  row('tempo', 'tpl_tempo_run', '2026-11-04', '2026-11-02'),
  ...extra,
];
const afterTest = (extra: PlannedSession[] = []) => computeAdvice({
  logs: [testLog], plannedSessions: testWeek(extra), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-28',
});

describe('symptoom D: tegenstrijdige adviezen na een zware test', () => {
  it('de testloop met veel stilstand krijgt een nieuwe poging (TEST-RETRY)', () => {
    const retry = afterTest().find((a) => a.ruleId === 'TEST-RETRY');
    expect(retry?.relatedLogId).toBe('log-test');
    expect(retry?.title).toBe('Nieuwe testpoging op za 31 oktober');
  });

  it.fails('symptoom D: na een testloop met zwaarte 9 geen HARD-THEN-SPACE', () => {
    // Nu zegt HARD-THEN-SPACE "Testloop 5 km was zwaar (zwaarte 9 van 10)" en "Houd het de komende dag rustig",
    // naast de nieuwe testpoging. Een test hoort zwaar te zijn en heeft zijn eigen rust.
    expect(afterTest().map((a) => a.ruleId)).not.toContain('HARD-THEN-SPACE');
  });

  it.fails('symptoom D: één stem per log, zonder zware beendag morgen', () => {
    const ids = afterTest().map((a) => a.relatedLogId).filter(Boolean);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it.fails('symptoom D: één stem per log, met een zware beendag vandaag ("rustig houden" naast een nieuwe testpoging)', () => {
    // Benen A vandaag: HARD-THEN-SPACE zegt "Benen A (zwaar) op wo 28 oktober rustig houden (RPE 3-4)" en
    // TEST-RETRY stelt een nieuwe test voor op wo 4 november, beide voor hetzelfde log.
    const advice = afterTest([row('legs', 'tpl_lower_a', '2026-10-28', '2026-10-26')]);
    expect(advice.filter((a) => a.relatedLogId === 'log-test').map((a) => a.ruleId)).toHaveLength(1);
  });
});
