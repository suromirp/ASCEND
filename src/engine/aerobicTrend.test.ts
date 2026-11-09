import { describe, it, expect } from 'vitest';
import { aerobicTrend, formatPace, progressMoment, trendVerdict, celebratedChange, type AerobicTrend } from './aerobicTrend';
import { zoneBpm } from './heartRateZones';
import type { Zone2Piece } from '../models/zone2Pieces';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const { templates, program } = buildDefaultProgramData();
const run = (id: string, templateId: string, date: string, km: number, minutes: number, bpm: number, climb = 0): SessionLog => ({
  id, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T17:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', sport: 'running',
  cardioData: { durationMinutes: minutes, distanceKm: km, avgHeartRate: bpm, elevationGainM: climb, source: 'manual' },
});
const hr = { lthr: 179 }; // zone 2: 145-159, reference 152

describe('aerobicTrend', () => {
  it('shows pace at zone 2 per week, and with four runs only a first estimate', () => {
    const logs = [
      run('a', 'tpl_easy_run', '2026-09-15', 5, 42.5, 152), // 8:30
      run('b', 'tpl_long_run', '2026-09-20', 8, 68, 152), // 8:30
      run('c', 'tpl_easy_run', '2026-10-13', 5, 40, 152), // 8:00
      run('d', 'tpl_long_run', '2026-10-18', 8, 64, 152), // 8:00
    ];
    const t = aerobicTrend(logs, templates, program, hr, '2026-10-19');
    expect(t.referenceHr).toBe(152);
    expect(t.points.map((p) => formatPace(p.paceSec))).toEqual(['8:30', '8:00']);
    expect(t.statement?.kind).toBe('eerste-schatting');
    expect(t.changeSec).toBeUndefined();
    expect(trendVerdict(t)).toMatch(/^Eerste schatting: rond 8:\d\d per km bij 152 slagen\./);
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

describe('aerobicTrend: stabiele stukken', () => {
  const TODAY = '2026-10-19';
  // Tien loopjes, elke zes dagen, de laatste vandaag (oudste eerst).
  const DATES = ['2026-08-26', '2026-09-01', '2026-09-07', '2026-09-13', '2026-09-19', '2026-09-25', '2026-10-01', '2026-10-07', '2026-10-13', '2026-10-19'];
  const piece = (over: Partial<Zone2Piece> = {}): Zone2Piece => ({ from: 'stream', startSec: 700, endSec: 1900, sec: 1200, distanceM: 3600, hr: 152, paceSecKm: 333, flat: true, gradePct: 0, ...over });
  const pieceRun = (id: string, date: string, pieces: Zone2Piece[], o: { templateId?: string; feelsC?: number } = {}): SessionLog => {
    const l = run(id, o.templateId ?? 'tpl_easy_run', date, 8, 48, 150);
    l.zone2Pieces = { version: 1, wholeKm: 8, wholeMinutes: 48, builtAt: '', pieces };
    if (o.feelsC !== undefined) l.detail = { version: 1, source: 'import', sliceCount: 0, slices: [], stretches: [], movingSec: 2880, quality: { heartRateCoveragePct: 100 }, conditions: { source: 'lookup', feelsC: o.feelsC } };
    return l;
  };
  const series = (from: number, to: number, wobble = 0) => DATES.map((d, i) => pieceRun(`s${i}`, d, [piece({ paceSecKm: from + ((to - from) * i) / (DATES.length - 1) + (i % 2 ? wobble : -wobble) })]));
  const trend = (logs: SessionLog[]) => aerobicTrend(logs, templates, program, hr, TODAY);

  it('telt een loop met stukken, ook een intervaltraining, maar geen test', () => {
    const t = trend([pieceRun('i', '2026-10-15', [piece()], { templateId: 'tpl_hill_intervals' }), pieceRun('t', '2026-10-16', [piece()], { templateId: 'tpl_test_run' })]);
    expect(t.runs).toBe(1);
    expect(t.measurements[0]).toMatchObject({ logId: 'i', from: 'stream', pieces: 1, minutes: 20, weight: 20 });
  });

  it('één meting per loop, gewogen naar minuten met een plafond van 30', () => {
    const t = trend([pieceRun('a', '2026-10-15', [piece(), piece({ startSec: 2000, endSec: 3500, sec: 1500, paceSecKm: 339 })])]);
    expect(t.measurements).toHaveLength(1);
    expect(t.measurements[0].pieces).toBe(2);
    expect(t.measurements[0].weight).toBe(30);
    expect(t.measurements[0].paceSec).toBeCloseTo((333 * 1200 + 339 * 1500) / 2700, 5);
  });

  it('laat een stuk boven zone 2 weg en telt de loop dan als buiten zone 2', () => {
    const t = trend([pieceRun('a', '2026-10-15', [piece({ hr: 170 })])]);
    expect(t.runs).toBe(0);
    expect(t.outsideZone).toBe(1);
  });

  it('een loop zonder stabiel stuk (te kort, alleen heuvels) geeft geen meting en valt niet terug op de hele loop', () => {
    const t = trend([pieceRun('a', '2026-10-15', [])]);
    expect(t.runs).toBe(0);
    expect(t.measurements).toEqual([]);
  });

  it('telt na een zware herhaling boven zone 3 niets meer', () => {
    const l = pieceRun('a', '2026-10-15', [piece({ startSec: 700, endSec: 1100, sec: 400 }), piece({ startSec: 1800, endSec: 2400, sec: 600 })], { templateId: 'tpl_hill_intervals' });
    const above = zoneBpm(3, hr)![1] + 5;
    const timeSec = Array.from({ length: 100 }, (_, k) => k * 30);
    l.runDetail = { version: 1, wholeKm: 8, wholeMinutes: 48, builtAt: '', totalM: 8000, movingSec: 2880, pauseSec: 0, kms: [], line: { n: 100, distM: timeSec.map((t) => t * 3), timeSec, paceSecKm: timeSec.map(() => 333), hr: timeSec.map((t) => (t >= 1200 && t <= 1400 ? above : 150)), altitudeM: timeSec.map(() => null) } };
    const t = trend([l]);
    expect(t.measurements[0].pieces).toBe(1);
  });

  it('warmte: tot 25 graden een kleine correctie, daarboven telt de loop niet', () => {
    const cool = trend([pieceRun('a', '2026-10-15', [piece()])]).measurements[0];
    const mild = trend([pieceRun('a', '2026-10-15', [piece()], { feelsC: 22 })]).measurements[0];
    expect(mild.paceSec).toBeLessThan(cool.paceSec);
    expect(mild).toMatchObject({ counts: true, warmthC: 22 });
    const hot = trend([pieceRun('a', '2026-10-15', [piece()], { feelsC: 27 })]);
    expect(hot.measurements[0]).toMatchObject({ counts: false, warm: true });
    expect(hot.runs).toBe(0);
    expect(hot.points).toEqual([]);
  });

  it('zonder reeks grof uit de kilometers met hartslag', () => {
    const l = run('k', 'tpl_easy_run', '2026-10-15', 8, 48, 150);
    const kms = Array.from({ length: 8 }, (_, i) => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec: 360, paceSecKm: 360, hrAvg: 150, gainM: 0, lossM: 0 }));
    l.runDetail = { version: 1, wholeKm: 8, wholeMinutes: 48, builtAt: '', totalM: 8000, movingSec: 2880, pauseSec: 0, kms, line: { n: 0, distM: [], timeSec: [], paceSecKm: [], hr: [], altitudeM: [] } };
    const t = trend([l]);
    expect(t.measurements[0]).toMatchObject({ from: 'km', pieces: 1 });
  });

  it('stukken die bij andere totalen horen tellen niet: dan het oude pad', () => {
    const l = pieceRun('a', '2026-10-15', [piece()]);
    l.zone2Pieces!.wholeKm = 9;
    expect(trend([l]).measurements[0].from).toBe('whole');
  });

  it('minder dan 8 lopen, of 8 lopen binnen 3 weken: eerste schatting', () => {
    expect(trend(series(360, 330).slice(-7)).statement?.kind).toBe('eerste-schatting');
    const close = Array.from({ length: 9 }, (_, i) => pieceRun(`c${i}`, `2026-10-${String(1 + 2 * i).padStart(2, '0')}`, [piece()]));
    expect(trend(close).statement?.kind).toBe('eerste-schatting');
  });

  it('sneller met een band, afgerond op 5 seconden; tekst en lijn uit dezelfde functie', () => {
    const t = trend(series(360, 330));
    const s = t.statement!;
    if (s.kind !== 'uitspraak') throw new Error('verwacht een uitspraak');
    expect(s.verdict).toBe('sneller');
    expect(Math.abs(s.roundedLow % 5)).toBe(0);
    expect(Math.abs(s.roundedHigh % 5)).toBe(0);
    expect(s.roundedHigh).toBeLessThan(0);
    expect(t.recentSec).toBe(s.line.toSec);
    expect(t.changeSec).toBe(s.changeSec);
    expect(t.recentSec! - t.earlierSec!).toBeCloseTo(s.changeSec, 9);
    const text = trendVerdict(t)!;
    expect(text).toContain(`${-s.roundedHigh} tot ${-s.roundedLow} seconden per km sneller`);
    expect(progressMoment(t, undefined, TODAY)).toContain(`ongeveer ${-s.roundedHigh} tot ${-s.roundedLow} seconden per km sneller`);
  });

  it('band over nul: nog geen duidelijke verandering, geen viering', () => {
    const t = trend(series(333, 333));
    const s = t.statement!;
    if (s.kind !== 'uitspraak') throw new Error('verwacht een uitspraak');
    expect(s.verdict).toBe('geen-duidelijke-verandering');
    expect(s.lowSec).toBeLessThan(0);
    expect(s.highSec).toBeGreaterThan(0);
    expect(trendVerdict(t)).toMatch(/^Nog geen duidelijke verandering/);
    expect(progressMoment(t, undefined, TODAY)).toBeUndefined();
  });

  it('te veel verschil tussen de lopen: geen uitspraak over sneller of langzamer', () => {
    const t = trend(series(360, 330, 40));
    expect(t.statement).toMatchObject({ kind: 'uitspraak', verdict: 'te-veel-verschil' });
    expect(trendVerdict(t)).toMatch(/^Nog te veel verschil/);
    expect(progressMoment(t, undefined, TODAY)).toBeUndefined();
  });
});

describe('progressMoment: hearing about it', () => {
  const trend = (lowSec: number, highSec: number): Pick<AerobicTrend, 'statement'> => ({
    statement: { kind: 'uitspraak', runs: 10, changeSec: (lowSec + highSec) / 2, lowSec, highSec, verdict: highSec < 0 ? 'sneller' : lowSec > 0 ? 'langzamer' : 'geen-duidelijke-verandering', roundedLow: Math.round(lowSec / 5) * 5, roundedHigh: Math.round(highSec / 5) * 5, line: { fromDate: '', toDate: '', fromSec: 0, toSec: 0 } },
  });

  it('reads the side of the band closest to zero and says it is a trend', () => {
    const msg = progressMoment(trend(-19, -11), undefined, '2026-12-01')!;
    expect(msg).toContain('ongeveer 10 tot 20 seconden per km sneller');
    expect(msg).toContain('de trend over weken');
    expect(celebratedChange(trend(-19, -11))).toBe(-11);
    // Het midden is 8 seconden sneller, maar de kant bij nul maar 3: nog niet.
    expect(progressMoment(trend(-13, -3), undefined, '2026-12-01')).toBeUndefined();
    expect(progressMoment(trend(2, 10), undefined, '2026-12-01')).toBeUndefined();
    expect(progressMoment({ statement: { kind: 'eerste-schatting', paceSec: 330, runs: 4 } }, undefined, '2026-12-01')).toBeUndefined();
  });

  it('not again within two weeks, and only when it got better again', () => {
    const last = { date: '2026-12-01', changeSec: -12 };
    expect(progressMoment(trend(-28, -20), last, '2026-12-10')).toBeUndefined();
    expect(progressMoment(trend(-21, -13), last, '2026-12-20')).toBeUndefined();
    expect(progressMoment(trend(-24, -16), last, '2026-12-20')).toBeDefined();
  });
});
