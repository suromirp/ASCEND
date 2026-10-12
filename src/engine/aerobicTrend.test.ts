import { describe, it, expect } from 'vitest';
import { aerobicTrend, formatPace } from './aerobicTrend';
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
      run('a', 'tpl_easy_run', '2026-09-15', 5, 42.5, 151), // 8:30
      run('b', 'tpl_long_run', '2026-09-20', 8, 68, 151), // 8:30
      run('c', 'tpl_easy_run', '2026-10-13', 5, 40, 151), // 8:00
      run('d', 'tpl_long_run', '2026-10-18', 8, 64, 151), // 8:00
    ];
    const t = aerobicTrend(logs, templates, program, hr, '2026-10-19');
    expect(t.referenceHr).toBe(151);
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
    const same = aerobicTrend([run('a', 'tpl_easy_run', '2026-10-13', 5, 40, 151)], templates, program, hr, '2026-10-19').points[0].paceSec;
    const lowerHr = aerobicTrend([run('a', 'tpl_easy_run', '2026-10-13', 5, 40, 145)], templates, program, hr, '2026-10-19').points[0].paceSec;
    expect(lowerHr).toBeLessThan(same);
  });
});
