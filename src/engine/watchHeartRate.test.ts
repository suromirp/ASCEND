import { describe, it, expect, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession } from '../models/training';
import type { Intensity } from '../data/workoutStructure';
import { zoneBpm } from './heartRateZones';
import { buildWatchWorkout, planWatchSync, type TrackedWorkout } from './watchWorkout';
import type { HeartRateSettings } from './heartRateZones';
import { bpmOfPercent, hrPercentTarget, percentFor, resolveWatchHr, stepBpm, MAX_BPM_ERROR, type IntervalsHrBasis, type WatchHrPlan } from './watchHeartRate';

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T08:00:00'));
});

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const day = addDays(program.startDate, 8);
const session = (templateId: string): PlannedSession => ({ id: `ps_${templateId}`, templateId, scheduledDate: day, weekStartDate: program.startDate, status: 'planned', order: 0 });

// Made-up numbers: ASCEND threshold 179 (zone 2 = 143 to 159), intervals.icu threshold 170.
const ASCEND: HeartRateSettings = { lthr: 179, maxHr: 195 };
const ICU: IntervalsHrBasis = { lthr: 170 };

function planFor(settings: Parameters<typeof resolveWatchHr>[0], icu: IntervalsHrBasis = ICU, hr: HeartRateSettings = ASCEND): WatchHrPlan {
  return resolveWatchHr(settings, hr, icu);
}
const text = (id: string, hr: WatchHrPlan) => buildWatchWorkout(session(id), tpl(id), program, undefined, { namePrefix: 'none', hr })!.description;

describe('which plan the watch gets', () => {
  it('ASCEND zones is the default and needs a base from intervals.icu', () => {
    expect(planFor(undefined)).toMatchObject({ kind: 'bpm', base: 'LTHR', baseBpm: 170, calm: true });
    expect(planFor({ calmRun: false })).toMatchObject({ kind: 'bpm', calm: false });
  });

  it('falls back to the zone name, with the reason', () => {
    expect(planFor({ mode: 'intervals' })).toEqual({ kind: 'zones' });
    expect(planFor(undefined, ICU, {})).toEqual({ kind: 'zones', reason: 'no-ascend' });
    expect(planFor(undefined, {})).toEqual({ kind: 'zones', reason: 'no-intervals' });
    expect(resolveWatchHr(undefined, ASCEND, undefined)).toEqual({ kind: 'zones', reason: 'no-intervals' });
    expect(planFor(undefined, { lthr: 12 })).toEqual({ kind: 'zones', reason: 'no-intervals' });
  });

  it('uses the maximum heart rate of intervals.icu when it has no threshold', () => {
    expect(planFor(undefined, { maxHr: 190 })).toMatchObject({ kind: 'bpm', base: 'HR', baseBpm: 190 });
  });
});

describe('the beats of a step', () => {
  it('calm: start of zone 1 to the end of zone 2', () => {
    expect(stepBpm(2, ASCEND, true)).toEqual([zoneBpm(1, ASCEND)![0], zoneBpm(2, ASCEND)![1]]);
    expect(stepBpm(2, ASCEND, true)).toEqual([118, 159]);
    expect(stepBpm(1, ASCEND, true)).toEqual([118, 159]);
  });

  it('not calm, or a harder step: the zone itself', () => {
    expect(stepBpm(2, ASCEND, false)).toEqual([145, 159]);
    expect(stepBpm(3, ASCEND, true)).toEqual(zoneBpm(3, ASCEND));
  });
});

describe('the percentage', () => {
  it('lands within 1 bpm of the beats of ASCEND for every threshold and zone', () => {
    for (const base of [150, 163, 170, 175, 179, 183, 190, 200]) {
      for (const lthr of [160, 172, 179, 186]) {
        for (const intensity of [1, 2, 3, 4] as Intensity[]) {
          for (const calm of [true, false]) {
            const want = stepBpm(intensity, { lthr }, calm)!;
            const target = hrPercentTarget({ kind: 'bpm', base: 'LTHR', baseBpm: base, heartRate: { lthr }, calm }, intensity);
            if (!target) continue; // then the zone name is written instead
            const [lo, hi] = target.replace('% LTHR', '').split('-').map(Number);
            expect(Math.abs(bpmOfPercent(lo, base) - want[0])).toBeLessThanOrEqual(MAX_BPM_ERROR);
            expect(Math.abs(bpmOfPercent(hi ?? lo, base) - want[1])).toBeLessThanOrEqual(MAX_BPM_ERROR);
          }
        }
      }
    }
  });

  it('writes whole percents with the right base word', () => {
    expect(hrPercentTarget({ kind: 'bpm', base: 'LTHR', baseBpm: 170, heartRate: ASCEND, calm: false }, 2)).toBe('85-94% LTHR');
    expect(hrPercentTarget({ kind: 'bpm', base: 'HR', baseBpm: 190, heartRate: ASCEND, calm: false }, 2)).toBe('76-84% HR');
  });

  it('gives nothing when a percent cannot reach the beats', () => {
    expect(percentFor(143, 12000)).toBeUndefined();
  });
});

describe('in the workout text', () => {
  const bpm = planFor(undefined);

  it('an easy run gets only the calm range in percent', () => {
    // 118 to 159 bpm of ASCEND on a threshold of 170: 69 to 94 percent.
    expect(text('tpl_easy_run', bpm)).toBe('- Hardlopen 35m 69-94% LTHR');
  });

  it('is the same as before without a plan or with intervals.icu zones', () => {
    expect(text('tpl_easy_run', { kind: 'zones' })).toBe('- Hardlopen 35m Z2 HR');
    expect(text('tpl_easy_run', planFor({ mode: 'intervals' }))).toBe('- Hardlopen 35m Z2 HR');
  });

  it('without calm the whole zone 2 goes along', () => {
    expect(text('tpl_easy_run', planFor({ calmRun: false }))).toBe('- Hardlopen 35m 85-94% LTHR');
  });

  it('keeps the steps without a target without one', () => {
    const w = text('tpl_tempo_run', bpm);
    expect(w).toMatch(/Warming-up\n- [A-Za-z ]+ \d+m\n/);
    expect(w).not.toMatch(/Warming-up\n[^\n]*(LTHR|HR)/);
  });

  it('only runs use it: a hike keeps the zone name', () => {
    const hike = 'tpl_mountain_hike';
    expect(text(hike, bpm)).not.toMatch(/% (LTHR|HR)/);
  });
});

describe('updating the watch', () => {
  const build = (hr: WatchHrPlan) => buildWatchWorkout(session('tpl_easy_run'), tpl('tpl_easy_run'), program, undefined, { namePrefix: 'none', hr })!;
  const trackedOf = (w: ReturnType<typeof build>): Record<string, TrackedWorkout> => ({ [w.plannedId]: { externalId: w.externalId, date: w.date, fingerprint: w.fingerprint, eventId: 7 } });

  it('a changed threshold in intervals.icu gives an update', () => {
    const sent = build(planFor(undefined, { lthr: 170 }));
    const now = build(planFor(undefined, { lthr: 165 }));
    expect(now.fingerprint).not.toBe(sent.fingerprint);
    expect(planWatchSync([now], trackedOf(sent), day, new Set()).update).toHaveLength(1);
  });

  it('a changed threshold in ASCEND gives an update', () => {
    const sent = build(planFor(undefined, ICU, { lthr: 179 }));
    const now = build(planFor(undefined, ICU, { lthr: 175 }));
    expect(planWatchSync([now], trackedOf(sent), day, new Set()).update).toHaveLength(1);
  });

  it('a changed setting gives an update, and the same state gives none', () => {
    const sent = build(planFor(undefined));
    expect(planWatchSync([build(planFor({ mode: 'intervals' }))], trackedOf(sent), day, new Set()).update).toHaveLength(1);
    expect(planWatchSync([build(planFor({ calmRun: false }))], trackedOf(sent), day, new Set()).update).toHaveLength(1);
    expect(planWatchSync([build(planFor(undefined))], trackedOf(sent), day, new Set()).update).toHaveLength(0);
  });
});
