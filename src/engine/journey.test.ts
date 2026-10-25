import { describe, it, expect } from 'vitest';
import { JOURNEY_TASKS, type JourneyTask } from '../data/journeyTasks';
import { addDays, mondayOfWeek } from '../utils/dates';
import {
  EMPTY_JOURNEY, journeyProgress, journeyTimeline, journeyWeeksLeft, markDone, mergeJourneyState, normalizeJourneyState, pickJourneyTask, postponeTask,
  taskDates, taskStatus, unmarkDone, weekStartForWeeksLeft, withDerivedDone, type JourneyState,
} from './journey';

const GOAL = '2027-08-01'; // a Sunday
const t = (id: string, window: [number, number]): JourneyTask => ({ id, title: id, why: '', window });
const tasks = [t('a', [40, 30]), t('b', [36, 20]), t('c', [24, 10]), t('d', [6, 2])];

describe('weeks before the goal', () => {
  it('counts from the Monday of the week, so it is the same all week', () => {
    // Monday 19 October 2026 up to Sunday 25 October: 41 weeks before 1 August 2027.
    for (let i = 0; i < 7; i++) expect(journeyWeeksLeft(addDays('2026-10-19', i), GOAL)).toBe(41);
    expect(journeyWeeksLeft('2026-10-26', GOAL)).toBe(40);
    expect(journeyWeeksLeft('2027-07-26', GOAL)).toBe(1); // the week of departure
  });

  it('finds the Monday of a given number of weeks before, for a goal on any weekday', () => {
    for (const goal of ['2027-08-01', '2027-08-02', '2027-08-04', '2027-03-20']) {
      for (const k of [1, 5, 17, 30]) {
        const monday = weekStartForWeeksLeft(goal, k);
        expect(mondayOfWeek(monday)).toBe(monday);
        expect(journeyWeeksLeft(monday, goal)).toBe(k);
        // The first Monday with that count: a week earlier is one more.
        expect(journeyWeeksLeft(addDays(monday, -7), goal)).toBe(k + 1);
      }
    }
  });
});

describe('the status of a task', () => {
  it('is later, open, lapsed or done', () => {
    const task = t('x', [30, 20]);
    expect(taskStatus(task, undefined, 35)).toBe('later');
    expect(taskStatus(task, undefined, 30)).toBe('open');
    expect(taskStatus(task, undefined, 20)).toBe('open');
    expect(taskStatus(task, undefined, 19)).toBe('lapsed');
    expect(taskStatus(task, { v: 1, done: { x: '2027-01-05' } }, 19)).toBe('done');
  });
});

describe('the task of the week', () => {
  it('takes, of the tasks that fit this week, the one that runs out first', () => {
    // 22 weeks before: a is lapsed (closed at 30), b (until 20) and c (until 10) fit.
    const today = addDays(weekStartForWeeksLeft(GOAL, 22), 2);
    expect(pickJourneyTask(tasks, undefined, today, GOAL)?.task.id).toBe('b');
  });

  it('is empty without a goal date, on or after it, and when nothing is left', () => {
    expect(pickJourneyTask(tasks, undefined, '2027-01-10', undefined)).toBeUndefined();
    expect(pickJourneyTask(tasks, undefined, '2027-08-01', GOAL)).toBeUndefined();
    expect(pickJourneyTask(tasks, undefined, '2027-08-10', GOAL)).toBeUndefined();
    const allDone: JourneyState = { v: 1, done: { a: '2027-01-01', b: '2027-01-01', c: '2027-01-01', d: '2027-01-01' } };
    expect(pickJourneyTask(tasks, allDone, '2027-02-01', GOAL)).toBeUndefined();
  });

  it('skips what is done, and shows nothing before the first task opens', () => {
    const today = addDays(weekStartForWeeksLeft(GOAL, 22), 2);
    const state = markDone(undefined, 'b', '2027-02-01');
    expect(pickJourneyTask(tasks, state, today, GOAL)?.task.id).toBe('c');
    // 45 weeks before: nothing has opened yet.
    expect(pickJourneyTask(tasks, undefined, addDays(weekStartForWeeksLeft(GOAL, 45), 1), GOAL)).toBeUndefined();
  });

  it('brings back what was missed, after what still fits, without calling it late', () => {
    // 8 weeks before: d has not opened (it opens at 6), a, b and c are lapsed, c closed last.
    const today = addDays(weekStartForWeeksLeft(GOAL, 8), 1);
    expect(pickJourneyTask(tasks, undefined, today, GOAL)?.task.id).toBe('c');
    // Once d opens it comes first, because it still fits.
    const later = addDays(weekStartForWeeksLeft(GOAL, 5), 1);
    expect(pickJourneyTask(tasks, undefined, later, GOAL)?.task.id).toBe('d');
  });

  it('keeps the task for the week after you act on it, and moves on the week after', () => {
    const today = addDays(weekStartForWeeksLeft(GOAL, 22), 2);
    const done = markDone(undefined, 'b', today, true);
    expect(pickJourneyTask(tasks, done, today, GOAL)).toEqual({ task: expect.objectContaining({ id: 'b' }), state: 'done' });
    expect(pickJourneyTask(tasks, unmarkDone(done, 'b'), today, GOAL)?.state).toBe('todo');
    const nextWeek = addDays(today, 7);
    expect(pickJourneyTask(tasks, done, nextWeek, GOAL)?.task.id).toBe('c');
  });

  it('"Volgende week" hides it for this week and brings it back the next', () => {
    const today = addDays(weekStartForWeeksLeft(GOAL, 22), 2);
    const state = postponeTask(undefined, 'b', today);
    expect(pickJourneyTask(tasks, state, today, GOAL)).toEqual({ task: expect.objectContaining({ id: 'b' }), state: 'postponed' });
    expect(pickJourneyTask(tasks, state, addDays(today, 7), GOAL)?.task.id).toBe('b');
  });
});

describe('changes leave the old state alone', () => {
  it('ticks and unticks without mutating', () => {
    const start: JourneyState = { v: 1, done: { a: '2027-01-01' } };
    const ticked = markDone(start, 'b', '2027-02-01');
    expect(start.done).toEqual({ a: '2027-01-01' });
    expect(ticked.done).toEqual({ a: '2027-01-01', b: '2027-02-01' });
    expect(unmarkDone(ticked, 'a').done).toEqual({ b: '2027-02-01' });
    expect(markDone(undefined, 'a', '2027-01-01')).toEqual({ v: 1, done: { a: '2027-01-01' } });
    expect(EMPTY_JOURNEY.done).toEqual({});
  });
});

describe('the timeline', () => {
  it('puts every task in order of when it closes, grouped by month, with dates', () => {
    const today = '2026-10-21';
    const groups = journeyTimeline(JOURNEY_TASKS, undefined, today, GOAL);
    const rows = groups.flatMap((g) => g.tasks);
    expect(rows.length).toBe(JOURNEY_TASKS.length);
    const closes = rows.map((r) => r.closesOn);
    expect([...closes].sort()).toEqual(closes);
    for (const g of groups) for (const r of g.tasks) expect(r.closesOn.slice(0, 7)).toBe(g.month.slice(0, 7));
    expect(groups[0].month).toBe('2026-12-01');
  });

  it('marks the task of this week, and keeps the last day before the goal', () => {
    const groups = journeyTimeline(JOURNEY_TASKS, undefined, '2026-10-21', GOAL, 'grote-drie-kiezen');
    const rows = groups.flatMap((g) => g.tasks);
    expect(rows.filter((r) => r.isThisWeek).map((r) => r.task.id)).toEqual(['grote-drie-kiezen']);
    expect(rows.every((r) => r.closesOn < GOAL)).toBe(true);
    expect(taskDates(t('z', [3, 1]), GOAL)).toEqual({ opensOn: '2027-07-12', closesOn: '2027-07-31' });
  });

  it('counts what is done', () => {
    const state = markDone(markDone(undefined, 'a', '2027-01-01'), 'b', '2027-01-02');
    expect(journeyProgress(tasks, state)).toEqual({ done: 2, total: 4 });
    expect(journeyProgress(tasks, undefined)).toEqual({ done: 0, total: 4 });
  });
});

describe('the fixed task list', () => {
  it('has unique ids, sound windows, Dutch text without dashes', () => {
    const ids = JOURNEY_TASKS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of JOURNEY_TASKS) {
      expect(x.window[0]).toBeGreaterThanOrEqual(x.window[1]);
      expect(x.window[1]).toBeGreaterThanOrEqual(1);
      expect(x.title.length).toBeGreaterThan(5);
      expect(x.why.length).toBeGreaterThan(30);
      expect(`${x.title} ${x.why} ${x.link?.label ?? ''}`).not.toMatch(/[–—]/);
      if (x.link) expect(!!x.link.url !== !!x.link.to).toBe(true);
    }
  });

  it('always has a task for the card, every week from now to departure', () => {
    for (let weeks = 41; weeks >= 1; weeks--) {
      const today = addDays(weekStartForWeeksLeft(GOAL, weeks), 3);
      expect(pickJourneyTask(JOURNEY_TASKS, undefined, today, GOAL), `${weeks} weeks before`).toBeDefined();
      // Not just something left over: a task that really fits that week.
      expect(JOURNEY_TASKS.some((x) => taskStatus(x, undefined, weeks) === 'open'), `${weeks} weeks before`).toBe(true);
    }
  });

  it('starts, 41 weeks before, with the tent, sleeping bag and mat', () => {
    expect(pickJourneyTask(JOURNEY_TASKS, undefined, '2026-10-21', GOAL)?.task.id).toBe('grote-drie-kiezen');
  });
});

describe('reading what is stored', () => {
  it('keeps what is readable and counts the rest', () => {
    const { state, skipped } = normalizeJourneyState({ v: 1, done: { a: '2027-01-05', '': '2027-01-05', b: 'gisteren', c: 4 }, week: { weekStart: '2027-01-04', taskId: 'a', postponed: true } });
    expect(state).toEqual({ v: 1, done: { a: '2027-01-05' }, week: { weekStart: '2027-01-04', taskId: 'a', postponed: true } });
    expect(skipped).toBe(3);
  });

  it('accepts a missing version and drops a broken week', () => {
    expect(normalizeJourneyState({ done: { a: '2027-01-05T10:00:00.000Z' }, week: 'oops' })).toEqual({ state: { v: 1, done: { a: '2027-01-05' } }, skipped: 1 });
  });

  it('says nothing is stored when it is not', () => {
    expect(normalizeJourneyState(undefined)).toEqual({ state: undefined, skipped: 0 });
    expect(normalizeJourneyState('x')).toEqual({ state: undefined, skipped: 1 });
    expect(normalizeJourneyState({ v: 1 })).toEqual({ state: { v: 1, done: {} }, skipped: 0 });
  });

  it('merges backups without un-ticking: the union, the device wins', () => {
    const device: JourneyState = { v: 1, done: { a: '2027-02-01' }, week: { weekStart: '2027-02-01', taskId: 'a' } };
    const backup: JourneyState = { v: 1, done: { a: '2027-01-01', b: '2027-01-15' } };
    expect(mergeJourneyState(device, backup)).toEqual({ v: 1, done: { a: '2027-02-01', b: '2027-01-15' }, week: { weekStart: '2027-02-01', taskId: 'a' } });
    expect(mergeJourneyState(undefined, backup)).toBe(backup);
    expect(mergeJourneyState(device, undefined)).toBe(device);
  });
});

describe('de taak "Meet je zweetverlies"', () => {
  const weighed = (id: string, date: string) => ({
    id, logId: `l-${id}`, date, activity: 'walk' as const, durationMinutes: 120,
    weightBeforeKg: 80, weightAfterKg: 79, updatedAt: `${date}T10:00:00.000Z`,
  });
  it('bestaat in de lijst', () => {
    expect(JOURNEY_TASKS.some((x) => x.id === 'meet-zweetverlies')).toBe(true);
  });
  it('is niet af met een meting en wel af met twee eigen metingen', () => {
    expect(withDerivedDone(undefined, [weighed('a', '2026-06-01')])).toBeUndefined();
    const state = withDerivedDone(undefined, [weighed('a', '2026-06-01'), weighed('b', '2026-06-09')]);
    expect(state?.done['meet-zweetverlies']).toBe('2026-06-09');
  });
  it('telt een schatting van het horloge niet mee en laat een eigen vinkje staan', () => {
    const watch = { ...weighed('w', '2026-06-02'), weightBeforeKg: undefined, weightAfterKg: undefined, watchMl: 900 };
    expect(withDerivedDone(undefined, [weighed('a', '2026-06-01'), watch])).toBeUndefined();
    const own = { v: 1 as const, done: { 'meet-zweetverlies': '2026-05-01' } };
    expect(withDerivedDone(own, [weighed('a', '2026-06-01'), weighed('b', '2026-06-09')])).toBe(own);
  });
});
