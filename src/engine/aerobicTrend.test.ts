import { describe, it, expect } from 'vitest';
import { aerobicTrend, formatPace, progressMoment } from './aerobicTrend';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const { templates, program } = buildDefaultProgramData();
const run = (id: string, templateId: string, date: string, km: number, minutes: number, bpm: number, climb = 0): SessionLog => ({
  id, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T17:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', sport: 'running',
  cardioData: { durationMinutes: minutes, distanceKm: km, avgHeartRate: bpm, elevationGainM: climb, source: 'manual' },
});
const hr = { lthr: 179 }; // zone 2: 143-159, reference 151

describe('aerobicTrend', () => {
  it('shows pace at zone 2 per week and how much faster it got', () => {
    const logs = [
      run('a', 'tpl_easy_run', '2026-09-15', 5, 42.5, 152), // 8:30
      run('b', 'tpl_long_run', '2026-09-20', 8, 68, 152), // 8:30
      run('c', 'tpl_easy_run', '2026-10-13', 5, 40, 152), // 8:00
      run('d', 'tpl_long_run', '2026-10-18', 8, 64, 152), // 8:00
    ];
    const t = aerobicTrend(logs, templates, program, hr, '2026-10-19');
    expect(t.referenceHr).toBe(152);
    expect(t.points.map((p) => formatPace(p.paceSec))).toEqual(['8:30', '8:00']);
    expect(Math.round(t.changeSec!)).toBe(-30);
  });

  it('leaves out runs outside zone 2, hilly runs and hard sessions', () => {
    const logs = [
      run('low', 'tpl_long_run', '2026-10-12', 7.98, 68, 137), // a little under zone 2: counts
      run('tempo', 'tpl_easy_run', '2026-10-16', 5, 30, 168), // above zone 2: no easy run
      run('hilly', 'tpl_easy_run', '2026-10-13', 5, 40, 150, 200),
      run('hills', 'tpl_hill_intervals', '2026-10-14', 5, 40, 150),
      run('ok', 'tpl_easy_run', '2026-10-15', 5, 40, 150),
    ];
    const t = aerobicTrend(logs, templates, program, hr, '2026-10-19');
    expect(t.runs).toBe(2);
    expect(t.outsideZone).toBe(1);
  });

  it('corrects for a few beats higher or lower', () => {
    const same = aerobicTrend([run('a', 'tpl_easy_run', '2026-10-13', 5, 40, 152)], templates, program, hr, '2026-10-19').points[0].paceSec;
    const lowerHr = aerobicTrend([run('a', 'tpl_easy_run', '2026-10-13', 5, 40, 145)], templates, program, hr, '2026-10-19').points[0].paceSec;
    expect(lowerHr).toBeLessThan(same);
  });
});

describe('progressMoment: hearing about it', () => {
  const trend = (changeSec?: number, bpmChange?: number) => ({ referenceHr: 151, points: [], runs: 8, outsideZone: 0, changeSec, bpmChange });

  it('says it once the trend is clearly faster, with the heart rate the other way round, and that it is a trend', () => {
    const msg = progressMoment(trend(-12, -4.2), undefined, '2026-12-01')!;
    expect(msg).toContain('12 seconden per km sneller');
    expect(msg).toContain('ongeveer 4 slagen minder');
    expect(msg).toContain('de trend over weken');
    expect(progressMoment(trend(-3, -1), undefined, '2026-12-01')).toBeUndefined();
    expect(progressMoment(trend(6, 2), undefined, '2026-12-01')).toBeUndefined();
  });

  it('not again within two weeks, and only when it got better again', () => {
    const last = { date: '2026-12-01', changeSec: -12 };
    expect(progressMoment(trend(-20), last, '2026-12-10')).toBeUndefined();
    expect(progressMoment(trend(-13), last, '2026-12-20')).toBeUndefined();
    expect(progressMoment(trend(-16), last, '2026-12-20')).toBeDefined();
  });
});
