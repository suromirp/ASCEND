import { describe, it, expect } from 'vitest';
import {
  REPEAT_SHARE_LIMIT, canRepeatWeek, costSentence, judgeWeek, proposeRepeatWeek, repeatState, shortfallSentence, withWeekRepeated,
  type RepeatWeekInputs,
} from './repeatWeek';
import { PHASE_BASIS, PHASE_BERG, PHASE_OPBOUW, PHASE_TAPER, layoutPhasesForGoal, progressionTarget, waveWeek } from './programLayout';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { planPass } from './planPass';
import { raceBlocks } from './raceBlock';
import type { TrainingGoal } from '../models/goals';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog } from '../models/training';
import type { IllnessEpisode } from '../models/illness';

const { templates } = buildDefaultProgramData();
const longRun = templates.find((t) => t.id === 'tpl_long_run')!;
const hike = templates.find((t) => t.id === 'tpl_mountain_hike')!;
const START = '2026-09-28';
// Basis 4 weeks (28 Sep to 25 Oct, rest week 19 Oct), then the Opbouw:
//   26 Oct week 1, 2 Nov week 2, 9 Nov week 3, 16 Nov rest week, 23 Nov week 1 again.
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };
const W1 = '2026-10-26';
const W2 = '2026-11-02';
const W3 = '2026-11-09';
const REST = '2026-11-16';
const NEXT_W1 = '2026-11-23';

// A plain week: a rest day, upper body, an easy run, hill intervals and the long run.
const DAYS: [string, number][] = [['tpl_herstel', 0], ['tpl_upper_a', 1], ['tpl_easy_run', 3], ['tpl_hill_intervals', 5], ['tpl_long_run', 6]];
const weekOf = (monday: string): PlannedSession[] => DAYS.map(([templateId, d], i) => ({
  id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned' as const, order: i,
}));
const planned = [W1, W2, W3, REST, NEXT_W1].flatMap(weekOf);
const logOf = (monday: string, templateId: string, minutes = 50): SessionLog => {
  const s = planned.find((p) => p.id === `${monday}-${templateId}`)!;
  return { id: `log-${s.id}`, plannedSessionId: s.id, templateId, type: templateId === 'tpl_upper_a' ? 'strength' : 'cardio', completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual' };
};
// Last week of W2: only the upper body done. Everything else ran on schedule in W1.
const poorW2 = [logOf(W1, 'tpl_upper_a'), logOf(W1, 'tpl_easy_run'), logOf(W1, 'tpl_hill_intervals'), logOf(W1, 'tpl_long_run'), logOf(W2, 'tpl_upper_a')];

const inputs = (over: Partial<RepeatWeekInputs> = {}): RepeatWeekInputs => ({
  program, plannedSessions: planned, logs: poorW2, templates, today: W3, respondedIds: new Set<string>(), ...over,
});

describe('judgeWeek: when a week fell short', () => {
  it('under 60% of the trainings done', () => {
    expect(REPEAT_SHARE_LIMIT).toBe(0.6);
    expect(judgeWeek({ planned: 5, done: 2, keyPlanned: 1, keyDone: 1 })).toMatchObject({ fellShort: true, fewDone: true, keyMissed: false, share: 0.4 });
    // Exactly 60% is a normal week.
    expect(judgeWeek({ planned: 5, done: 3, keyPlanned: 1, keyDone: 1 }).fellShort).toBe(false);
    expect(judgeWeek({ planned: 5, done: 5, keyPlanned: 1, keyDone: 1 }).fellShort).toBe(false);
  });

  it('or the key session missed, whatever else was done', () => {
    expect(judgeWeek({ planned: 5, done: 4, keyPlanned: 1, keyDone: 0 })).toMatchObject({ fellShort: true, fewDone: false, keyMissed: true });
    // No key session planned: nothing to miss.
    expect(judgeWeek({ planned: 4, done: 4, keyPlanned: 0, keyDone: 0 }).keyMissed).toBe(false);
  });

  it('with only one or two trainings planned the share says nothing', () => {
    expect(judgeWeek({ planned: 2, done: 1, keyPlanned: 0, keyDone: 0 }).fellShort).toBe(false);
    expect(judgeWeek({ planned: 0, done: 0, keyPlanned: 0, keyDone: 0 })).toMatchObject({ fellShort: false, share: undefined });
  });
});

describe('where a repeat can sit', () => {
  it('in week 2 or 3 of a wave, after week 1 or 2 of the same wave', () => {
    expect(canRepeatWeek(program, W1)).toBe(false); // after the basis' rest week
    expect(canRepeatWeek(program, W2)).toBe(true);
    expect(canRepeatWeek(program, W3)).toBe(true);
    expect(canRepeatWeek(program, REST)).toBe(false); // a rest week is never repeated
    expect(canRepeatWeek(program, NEXT_W1)).toBe(false); // week 1 follows a rest week
    expect(canRepeatWeek(program, START)).toBe(false); // nothing before week 1
  });

  it('once per wave', () => {
    const repeated = withWeekRepeated(program, W2, true);
    expect(canRepeatWeek(repeated, W2)).toBe(false);
    expect(canRepeatWeek(repeated, W3)).toBe(false);
    expect(canRepeatWeek(repeated, '2026-11-30')).toBe(true); // week 2 of the next wave
  });

  it('never in the taper, even when a stale repeat sits there', () => {
    const taperProgram: Program = { id: 't', name: 'T', startDate: START, phases: [
      { id: PHASE_OPBOUW, name: 'OPBOUW', order: 1, weekCount: 4 },
      { id: PHASE_TAPER, name: 'NAAR DE START', order: 2, weekCount: 3 },
    ] };
    for (const monday of ['2026-10-26', '2026-11-02', '2026-11-09']) expect(canRepeatWeek(taperProgram, monday)).toBe(false);
    const stale = { ...taperProgram, repeatedWeeks: ['2026-10-26', '2026-11-02'] };
    for (let d = 0; d < 21; d++) {
      const date = addDays('2026-10-26', d);
      expect(progressionTarget(longRun, stale, date)?.minutes).toBe(progressionTarget(longRun, taperProgram, date)?.minutes);
    }
  });

  it('a repeat can be recorded and taken back', () => {
    const repeated = withWeekRepeated(program, '2026-11-10', true); // any day: the Monday is stored
    expect(repeated.repeatedWeeks).toEqual([W3]);
    expect(repeatState(repeated, W3)).toEqual({ repeated: true, shifted: true });
    expect(repeatState(repeated, W2)).toEqual({ repeated: false, shifted: false });
    expect(withWeekRepeated(repeated, W3, false).repeatedWeeks).toBeUndefined();
    expect(program.repeatedWeeks).toBeUndefined(); // the original is not touched
  });
});

describe('proposeRepeatWeek', () => {
  it('proposes it after a clearly poor week', () => {
    const p = proposeRepeatWeek(inputs())!;
    expect(p).toMatchObject({ id: 'repeat-week:2026-11-09', weekStart: W3, previousWeek: W2, done: 1, planned: 4 });
    expect(p.verdict).toMatchObject({ fewDone: true, keyMissed: true });
    expect(p.missedKey).toEqual([longRun.name]);
    // This week is the heaviest of the wave: the key session is lighter, and no separate peak.
    expect(p.impact!.thisWeek.to.minutes).toBeLessThan(p.impact!.thisWeek.from.minutes);
    expect(p.impact!.peak).toBeUndefined();
    expect(p.impact!.thisWeek.to.minutes).toBe(progressionTarget(longRun, program, '2026-11-08')!.minutes);
  });

  it('in week 2 the heaviest week of the wave is named too', () => {
    const p = proposeRepeatWeek(inputs({ today: W2, logs: [logOf(W1, 'tpl_upper_a')] }))!;
    expect(p.weekStart).toBe(W2);
    expect(p.impact!.peak!.to.minutes).toBe(progressionTarget(longRun, program, '2026-11-08')!.minutes);
    expect(p.impact!.peak!.from.minutes).toBe(progressionTarget(longRun, program, '2026-11-15')!.minutes);
    expect(p.impact!.peak!.to.minutes).toBeLessThan(p.impact!.peak!.from.minutes);
  });

  it('also when only the key session is missed', () => {
    const logs = [logOf(W2, 'tpl_upper_a'), logOf(W2, 'tpl_easy_run'), logOf(W2, 'tpl_hill_intervals')];
    const p = proposeRepeatWeek(inputs({ logs }))!;
    expect(p.verdict).toMatchObject({ fewDone: false, keyMissed: true });
    expect(shortfallSentence(p)).toBe('Vorige week bleef de lange duurloop liggen, de belangrijkste training van de week.');
  });

  it('not after a normal week, or one with the key session done', () => {
    expect(proposeRepeatWeek(inputs({ logs: [...poorW2, logOf(W2, 'tpl_easy_run'), logOf(W2, 'tpl_hill_intervals'), logOf(W2, 'tpl_long_run')] }))).toBeUndefined();
    // Three of four is 75%, and the long run was done.
    expect(proposeRepeatWeek(inputs({ logs: [logOf(W2, 'tpl_upper_a'), logOf(W2, 'tpl_easy_run'), logOf(W2, 'tpl_long_run')] }))).toBeUndefined();
  });

  it('the rest day is not a training and counts neither way', () => {
    const p = proposeRepeatWeek(inputs())!;
    expect(p.planned).toBe(4);
  });

  it('not in a rest week, and not after one', () => {
    // The rest week itself (last week was week 3): it is the step back already.
    expect(proposeRepeatWeek(inputs({ today: REST, logs: [] }))).toBeUndefined();
    // The week after a rest week, however little was done in it.
    expect(proposeRepeatWeek(inputs({ today: NEXT_W1, logs: [] }))).toBeUndefined();
    // A rest week trained through is a normal build week and still not repeated.
    const through: Program = { ...program, skippedRestWeeks: [REST] };
    expect(proposeRepeatWeek(inputs({ program: through, today: NEXT_W1, logs: [] }))).toBeUndefined();
    expect(proposeRepeatWeek(inputs({ program: through, today: REST, logs: [] }))).toBeUndefined();
  });

  it('not after an ill week, while ill, or while building back after an illness', () => {
    const ill = (e: Partial<IllnessEpisode>): IllnessEpisode[] => [{ id: 'i', kind: 'below_neck', startDate: '2026-11-03', ...e }];
    expect(proposeRepeatWeek(inputs({ illnessEpisodes: ill({ endDate: '2026-11-06' }) }))).toBeUndefined();
    expect(proposeRepeatWeek(inputs({ illnessEpisodes: ill({}) }))).toBeUndefined(); // still ill
    // Ill the week before that, back on a ramp that still runs.
    expect(proposeRepeatWeek(inputs({ illnessEpisodes: [{ id: 'i', kind: 'below_neck', startDate: '2026-10-25', endDate: '2026-11-01' }] }))).toBeUndefined();
    // An illness long ago asks nothing of this week.
    expect(proposeRepeatWeek(inputs({ illnessEpisodes: [{ id: 'i', kind: 'below_neck', startDate: '2026-10-01', endDate: '2026-10-05' }] }))).toBeDefined();
  });

  it('not around a race, which has its own taper', () => {
    expect(proposeRepeatWeek(inputs({ raceWeeks: [W3] }))).toBeUndefined();
    expect(proposeRepeatWeek(inputs({ raceWeeks: [REST] }))).toBeUndefined(); // the week after this one
    expect(proposeRepeatWeek(inputs({ raceWeeks: [W2] }))).toBeUndefined(); // last week was race week
    expect(proposeRepeatWeek(inputs({ raceWeeks: ['2026-12-14'] }))).toBeDefined();
  });

  it('only in the first days of the week, once, and not when already repeating', () => {
    expect(proposeRepeatWeek(inputs({ today: '2026-11-11' }))).toBeDefined(); // Wednesday
    expect(proposeRepeatWeek(inputs({ today: '2026-11-12' }))).toBeUndefined(); // Thursday
    expect(proposeRepeatWeek(inputs({ respondedIds: new Set(['repeat-week:2026-11-09']) }))).toBeUndefined(); // liever niet
    expect(proposeRepeatWeek(inputs({ program: withWeekRepeated(program, W3, true) }))).toBeUndefined();
    expect(proposeRepeatWeek(inputs({ program: null }))).toBeUndefined();
  });
});

describe('the advice: Akkoord and Liever niet', () => {
  const adviceInputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
    logs: poorW2, plannedSessions: planned, templates, injuries: [], program, dailyTimeBudget: undefined, sameDayPairingPreference: 'automatic',
    respondedIds: new Set<string>(), asOf: W3, ...over,
  });
  const find = (a: ReturnType<typeof computeAdvice>) => a.find((x) => x.ruleId === 'REPEAT-WEEK');

  it('comes through the advice engine with the numbers and the reason', () => {
    const a = find(computeAdvice(adviceInputs()))!;
    expect(a).toMatchObject({ id: 'repeat-week:2026-11-09', title: 'Deze week nog een keer?', repeatWeek: W3 });
    expect(a.proposal).toBeUndefined(); // a program change, not a session change
    expect(a.effect).toContain('Vorige week deed je 1 van de 4 trainingen');
    expect(a.effect).toContain('in plaats van een stap omhoog');
    expect(a.effect).toMatch(/minuten in plaats van \d+ minuten/);
    expect(a.effect).toContain('de taper en je doeldatum blijven zoals ze waren');
    expect(a.why).toContain('Een week herhalen na een tegenvallende week werkt beter dan doorschuiven');
    // The house style: no dashes as punctuation.
    expect(`${a.title}${a.effect}${a.why}`).not.toMatch(/[–—]/);
  });

  it('Liever niet: this week is not asked again, the next one is judged on its own', () => {
    expect(find(computeAdvice(adviceInputs({ respondedIds: new Set(['repeat-week:2026-11-09']) })))).toBeUndefined();
  });

  it('a race goal keeps it away', () => {
    const raceGoals = [{ goalId: 'r', name: 'R', raceDate: '2026-11-14', blockStart: '2026-09-14', raceWeek: W3 }];
    expect(find(computeAdvice(adviceInputs({ raceGoals })))).toBeUndefined();
  });

  it('a race already run keeps it away too, also when its goal is in the past', () => {
    // The race was last week: its goal no longer counts as a race block
    // (raceBlocks only lists races still ahead), its session still does.
    const race = { ...planned[0], id: 'race_done', templateId: 'tpl_race', scheduledDate: addDays(W2, 5), weekStartDate: W2 };
    expect(find(computeAdvice(adviceInputs({ plannedSessions: [...planned, race] })))).toBeUndefined();
  });

  it('costSentence says it plainly', () => {
    expect(costSentence(undefined)).toContain('op het niveau van vorige week');
  });
});

// --- what Akkoord does to the load -------------------------------------------

const minutes = (p: Program, date: string, t = longRun) => progressionTarget(t, p, date)?.minutes;
const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));
const between = (from: string, until: string) => Math.round((Date.parse(until) - Date.parse(from)) / 86400000);
const programEnd = addDays(START, program.phases.reduce((n, p) => n + p.weekCount, 0) * 7);

describe('Akkoord: the load of this week', () => {
  it('week 3 carries the load of week 2, as the key session, the easy run and the quality sessions', () => {
    const repeated = withWeekRepeated(program, W3, true);
    for (const t of templates.filter((x) => x.weeklyProgression)) {
      expect(progressionTarget(t, repeated, '2026-11-12')?.minutes).toBe(progressionTarget(t, program, '2026-11-05')?.minutes);
    }
    expect(minutes(repeated, '2026-11-15')).toBeLessThan(minutes(program, '2026-11-15')!);
    expect(waveWeek(resolveProgramWeek(repeated, W3)!)).toBe(2);
    expect(progressionTarget(longRun, repeated, W3)!.step.note).toBe('Opbouw (herhaalweek)');
  });

  it('week 2 carries the load of week 1; week 3 then follows as week 2 and the wave loses its heaviest step', () => {
    const repeated = withWeekRepeated(program, W2, true);
    expect(minutes(repeated, W2)).toBe(minutes(program, W1));
    expect(minutes(repeated, W3)).toBe(minutes(program, W2));
    expect(minutes(repeated, W3)).toBeLessThan(minutes(program, W3)!);
    expect(waveWeek(resolveProgramWeek(repeated, W3)!)).toBe(2);
    // Only the repeated week is marked.
    expect(progressionTarget(longRun, repeated, W3)!.step.note).toBe('Opbouw');
  });

  it('hikes keep D+ and pack with it: the whole row of the week before', () => {
    const berg = program.phases.slice(0, program.phases.findIndex((p) => p.id === PHASE_BERG)).reduce((n, p) => n + p.weekCount, 0);
    const bergStart = addDays(START, berg * 7);
    const w2 = addDays(bergStart, 7);
    const w3 = addDays(bergStart, 14);
    const row = (p: Program, date: string) => { const s = progressionTarget(hike, p, date)!.step; return [s.targetMinutes, s.elevationGainM, s.backpackKg]; };
    const repeated = withWeekRepeated(program, w3, true);
    expect(row(repeated, w3)).toEqual(row(program, w2));
    expect(row(program, w3)).not.toEqual(row(program, w2));
    // The rest week after it and the next wave are as planned.
    for (const date of days(addDays(bergStart, 21), between(addDays(bergStart, 21), programEnd))) expect(row(repeated, date)).toEqual(row(program, date));
  });

  it('the weeks before it, the rest week, every later wave and the taper stay exactly as planned', () => {
    for (const repeatedWeek of [W2, W3]) {
      const repeated = withWeekRepeated(program, repeatedWeek, true);
      const t = repeated.phases;
      expect(t[t.length - 1].id).toBe(PHASE_TAPER);
      for (const template of templates.filter((x) => x.weeklyProgression)) {
        // History: nothing before the repeated week moves.
        for (const date of days(START, between(START, repeatedWeek))) expect(minutes(repeated, date, template)).toBe(minutes(program, date, template));
        // From the rest week on: the calendar again.
        for (const date of days(REST, between(REST, programEnd))) {
          expect(progressionTarget(template, repeated, date)).toEqual(progressionTarget(template, program, date));
        }
      }
    }
  });

  it('the build-up reconnects: no step after the repeat is bigger than the calendar already had', () => {
    const repeated = withWeekRepeated(program, W2, true);
    const run = (p: Program) => ['2026-10-26', W2, W3, REST, NEXT_W1, '2026-11-30', '2026-12-07'].map((d) => minutes(p, d)!);
    const [a1, a2, a3, aRest, b1, b2, b3] = run(repeated);
    // This wave tops out one step lower, the rest week is still the lightest, the next wave starts where it always did.
    expect([a1, a2, a3]).toEqual([run(program)[0], run(program)[0], run(program)[1]]);
    expect(aRest).toBe(run(program)[3]);
    expect([b1, b2, b3]).toEqual(run(program).slice(4));
    // Held small in practice by the 110% rule: that measures against what you ran (engine/substitutions.ts).
    expect(b3).toBeGreaterThan(a3);
  });

  it('a repeat in a taper week changes nothing; the race block and its taper are left alone', () => {
    const taperProgram = program;
    const taperStart = addDays(START, taperProgram.phases.slice(0, -1).reduce((n, p) => n + p.weekCount, 0) * 7);
    const stale = withWeekRepeated(withWeekRepeated(taperProgram, taperStart, true), addDays(taperStart, 7), true);
    for (const date of days(taperStart, 14)) {
      expect(progressionTarget(hike, stale, date)).toEqual(progressionTarget(hike, taperProgram, date));
    }
  });
});

describe('the planning round after Akkoord', () => {
  const week = (monday: string): PlannedSession[] => ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run']
    .map((templateId, i) => ({ id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned' as const, order: i }));
  const open = [W3, REST, NEXT_W1].flatMap(week);
  let n = 0;
  const run = (prog: Program, sessions: PlannedSession[], today = W3) => planPass(sessions, {
    today, logs: [], templates, program: prog, blocks: [], restDay: 1, newId: () => `new${++n}`,
  });
  const saturday = (sessions: PlannedSession[], monday: string) => sessions.find((s) => s.scheduledDate === addDays(monday, 5))?.templateId;
  const repeated = withWeekRepeated(program, W3, true);

  it('adjusts only what the system planned: week 3 repeats week 2, so its Saturday goes up and down', () => {
    expect(saturday(run(program, open).sessions, W3)).toBe('tpl_hill_intervals');
    const after = run(repeated, open);
    expect(saturday(after.sessions, W3)).toBe('tpl_hills_descent');
    // Everything outside that week is what the same round gives without the repeat.
    const without = new Map(run(program, open).sessions.map((s) => [s.id, s]));
    for (const s of after.sessions.filter((x) => x.weekStartDate !== W3)) expect(s).toEqual(without.get(s.id));
  });

  it('never touches what you pinned, and never history', () => {
    const pinned = open.map((s) => (s.id === `${W3}-tpl_hill_intervals` ? { ...s, lock: { by: 'user' as const, at: '2026-11-01T10:00:00Z' } } : s));
    expect(saturday(run(repeated, pinned).sessions, W3)).toBe('tpl_hill_intervals');
    // Past days are history: the Saturday of this week, seen from the week after, stays as it was.
    expect(saturday(run(repeated, open, REST).sessions, W3)).toBe('tpl_hill_intervals');
  });

  it('a second planning round writes nothing', () => {
    const first = run(repeated, open);
    const second = run(repeated, first.sessions);
    expect(second.sessions).toEqual(first.sessions);
    expect(second.repairs).toEqual([]);
  });

  it('the race block and its taper stay as they were', () => {
    const race = {
      id: 'race', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt: '', updatedAt: '',
      requirements: [
        { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' },
        { id: 'r2', kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: 45, unit: 'min' }, discipline: 'running' },
      ],
    } as TrainingGoal;
    const blocks = raceBlocks([race], 'gr5', '2027-08-01', '2026-10-12');
    const mondays = Array.from({ length: 8 }, (_, i) => addDays('2027-02-01', i * 7)); // up to race week 15 March and the week after
    const sessions = mondays.flatMap(week);
    const go = (prog: Program, from: PlannedSession[]) => planPass(from, {
      today: '2027-02-01', logs: [], templates, program: prog, blocks, restDay: 1, goalDay: '2027-08-01', newId: () => `race${++n}`,
    });
    // The repeat sits where one can: week 2 or 3 of a wave, a few weeks before race week.
    const repeatedMonday = mondays.slice(0, 4).find((m) => canRepeatWeek(program, m))!;
    expect(repeatedMonday).toBeDefined();
    const plain = go(program, sessions);
    const withRepeat = go(withWeekRepeated(program, repeatedMonday, true), sessions);
    const key = (s: PlannedSession) => `${s.scheduledDate}|${s.templateId}|${s.plannedMinutes ?? ''}|${s.status}`;
    const raceWeekAndAfter = (r: ReturnType<typeof go>) => r.sessions.filter((s) => s.scheduledDate >= '2027-03-15').map(key).sort();
    expect(raceWeekAndAfter(withRepeat)).toEqual(raceWeekAndAfter(plain));
    expect(withRepeat.sessions.some((s) => s.templateId === 'tpl_race' && s.scheduledDate === '2027-03-20')).toBe(true);
    // And a second round over the result writes nothing.
    const again = go(withWeekRepeated(program, repeatedMonday, true), withRepeat.sessions);
    expect(again.sessions).toEqual(withRepeat.sessions);
    expect(again.repairs).toEqual([]);
  });
});
