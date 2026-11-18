import { describe, it, expect, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { racePaces } from './racePaces';
import { buildWatchWorkout, selectWatchWorkouts } from './watchWorkout';
import { shortTestSessionIds, watchShortTest } from './shortTest';
import { watchStatusFor } from './watchStatus';
import { WATCH_DAYS } from './watchWorkout';
import { addDays } from '../utils/dates';

// De korte test op het horloge (I-79 stap 3): alleen de rustige loop met de test verandert, en die is dan
// helemaal een tempoworkout, nooit hartslag en tempo door elkaar.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T08:00:00'));
});

const { templates, program, plannedSessions } = buildDefaultProgramData();
const paces = racePaces([{ date: '2026-10-29', km: 5, minutes: 29 + 5 / 60 }]);
const series = { answer: 'accepted' as const, date: program.startDate, paceSecKm: 380 };
const ids = shortTestSessionIds(plannedSessions, series, true);
const shortTest = { ids, paceSecKm: 380 };
const tpl = (id: string) => templates.find((t) => t.id === id)!;

describe('de korte test op het horloge', () => {
  it('elke week staat hij op één rustige loop', () => {
    expect(ids.size).toBeGreaterThan(0);
    for (const id of ids) expect(plannedSessions.find((s) => s.id === id)!.templateId).toBe('tpl_easy_run');
  });

  it('inlopen, de test op tempo, stilstaan en de rest zonder doel', () => {
    const s = plannedSessions.find((p) => ids.has(p.id))!;
    const w = buildWatchWorkout(s, tpl('tpl_easy_run'), program, paces, { namePrefix: 'none', shortTest })!;
    expect(w.target).toBe('PACE');
    const lines = w.description.split('\n').filter((l) => l.startsWith('- '));
    expect(lines[0]).toBe('- Inlopen 10m');
    expect(lines[1]).toBe('- Korte test 4m 6:10/km-6:30/km Pace');
    expect(lines[2]).toBe('- Stilstaan 1m');
    expect(lines[3]).toMatch(/^- Hardlopen \d+m$/);
    expect(w.description).not.toContain('HR');
  });

  it('elke andere workout blijft precies gelijk, ook zijn vingerafdruk', () => {
    const days = 7 * 8;
    const before = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today: program.startDate, days });
    const after = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today: program.startDate, days, options: { shortTest } });
    expect(after.length).toBe(before.length);
    let changed = 0;
    for (let i = 0; i < before.length; i++) {
      if (ids.has(before[i].plannedId)) {
        changed++;
        expect(after[i].fingerprint).not.toBe(before[i].fingerprint);
      } else {
        expect(after[i]).toEqual(before[i]);
      }
    }
    expect(changed).toBeGreaterThan(0);
  });

  it('na versturen staat de rustige loop met de test op sent (Warden, 18 november)', () => {
    const today = program.startDate;
    const done = { today, logged: new Set<string>() };
    const st = watchShortTest({ shortTestSeries: series }, plannedSessions, done)!;
    const s = plannedSessions.find((p) => st.ids.has(p.id) && p.scheduledDate <= addDays(today, WATCH_DAYS - 1))!;
    expect(s).toBeDefined();
    // Wat het versturen schreef: dezelfde workout als storage/watchWorkouts.ts bouwt.
    const sent = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today, options: { shortTest: st } }).find((w) => w.plannedId === s.id)!;
    const items = { [s.id]: { externalId: sent.externalId, date: sent.date, fingerprint: sent.fingerprint, sentAt: `${today}T08:00:00.000Z` } };
    const ctx = { linked: true, items, today, program, paces, logged: new Set<string>() };
    expect(watchStatusFor(s, tpl('tpl_easy_run'), { ...ctx, shortTest: st }).kind).toBe('sent');
    // Zonder de korte test in de stand zou hij blijvend op een wijziging wachten: dat was de fout.
    expect(watchStatusFor(s, tpl('tpl_easy_run'), ctx).kind).toBe('stale');
  });
});
