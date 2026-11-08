import { describe, it, expect } from 'vitest';
import { aerobicTrend, formatPace, progressMoment } from './aerobicTrend';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const { templates, program } = buildDefaultProgramData();
const run = (id: string, templateId: string, date: string, km: number, minutes: number, bpm: number, climb = 0): SessionLog => ({
  id, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T17:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', sport: 'running',
  cardioData: { durationMinutes: minutes, distanceKm: km, avgHeartRate: bpm, elevationGainM: climb, source: 'manual' },
});
const hr = { lthr: 179 }; // zone 2: 145-159, reference 152

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

describe('aerobicTrend: vlak tempo en stijging', () => {
  // Nagemaakt: 8,84 km in 80 minuten, 133 m stijging volgens het horloge (15,04 m per km).
  const hilly = (over: Partial<SessionLog> = {}, withDetail = true, gapFactor = 0.95): SessionLog => {
    const base = run('h', 'tpl_long_run', '2026-10-18', 8.84, 80, 152, 133);
    const kms = Array.from({ length: 9 }, (_, i) => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: i < 8 ? 1000 : 840, sec: 540, paceSecKm: 543, gapSecKm: 543 * gapFactor, gainM: 15 }));
    return { ...base, ...(withDetail ? { runDetail: { version: 1 as const, wholeKm: 8.84, wholeMinutes: 80, builtAt: '', totalM: 8840, movingSec: 4800, pauseSec: 0, kms, line: { n: 0, distM: [], timeSec: [], paceSecKm: [], hr: [], altitudeM: [] } } } : {}), ...over };
  };
  const pace = (l: SessionLog) => aerobicTrend([l], templates, program, hr, '2026-10-19');

  it('laat een loop net boven 15 m per km zonder run in detail weg', () => {
    expect(pace(hilly({}, false)).runs).toBe(0);
  });

  it('telt dezelfde loop mee met het vlakke tempo per km', () => {
    const t = pace(hilly());
    expect(t.runs).toBe(1);
    const plain = pace(run('p', 'tpl_long_run', '2026-10-18', 8.84, 80, 152, 0));
    expect(t.points[0].paceSec / plain.points[0].paceSec).toBeCloseTo(0.95, 2);
  });

  it('rekent met het gewone tempo als geen km een gecorrigeerd tempo heeft (geen hoogtedata)', () => {
    const l = hilly();
    l.runDetail!.kms = l.runDetail!.kms.map(({ gapSecKm: _g, gainM: _m, ...k }) => k);
    l.cardioData!.elevationGainM = 0;
    const t = pace(l);
    const plain = pace(run('p', 'tpl_long_run', '2026-10-18', 8.84, 80, 152, 0));
    expect(t.points[0].paceSec).toBeCloseTo(plain.points[0].paceSec, 5);
  });

  it('neemt de eigen optelling als het horloge niet te vertrouwen is', () => {
    // Horloge meldt 133 m, eigen optelling 20 m: 15 procent, ver buiten de marge. Eigen 2 m per km telt.
    const l = hilly();
    l.detail = { version: 1, source: 'import', sliceCount: 0, slices: [], stretches: [], movingSec: 4800, quality: { heartRateCoveragePct: 100, gainAgreementPct: 15 } };
    l.cardioData!.elevationGainM = 400; // het horloge zegt 45 m per km: eruit zonder eigen optelling
    l.runDetail!.kms = l.runDetail!.kms.map((k) => ({ ...k, gainM: 2 }));
    expect(pace(l).runs).toBe(1);
    // Zonder die afwijking blijft het horloge gelden.
    l.detail.quality.gainAgreementPct = 100;
    expect(pace(l).runs).toBe(0);
  });

  it('zonder run in detail bij een afwijkend horloge blijft de stijging van het horloge', () => {
    const l = hilly({}, false);
    l.detail = { version: 1, source: 'import', sliceCount: 0, slices: [], stretches: [], movingSec: 4800, quality: { heartRateCoveragePct: 100, gainAgreementPct: 15 } };
    expect(pace(l).runs).toBe(0);
  });

  it('negeert een run in detail die bij andere totalen hoort', () => {
    const l = hilly();
    l.runDetail!.wholeKm = 9.5;
    expect(pace(l).runs).toBe(0);
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
