import { describe, it, expect } from 'vitest';
import { distanceLine, missionFacts } from './missionFacts';
import { buildSessionBrief } from './sessionBrief';
import { racePaces } from './racePaces';
import { recentRunPace } from './recentRunPace';
import type { SessionLog } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';

const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const DATE = '2026-11-04';
const brief = (id: string) => buildSessionBrief(byId.get(id)!, DATE, program, { templates });
// Nagemaakt: 5 km in 29:05 is een VDOT van 32.
const paces = racePaces([{ date: '2026-10-29', km: 5, minutes: 29 + 5 / 60 }])!;

describe('missionFacts', () => {
  it('geeft drie chips: duur, zone en een algemene aanwijzing, zonder test', () => {
    const f = missionFacts('tpl_easy_run', brief('tpl_easy_run'), undefined);
    expect(f.chips).toHaveLength(3);
    expect(f.chips[0].kind).toBe('duur');
    expect(f.chips[0].text).toMatch(/min$/);
    expect(f.chips[1]).toMatchObject({ text: 'Zone 2', kind: 'zone' });
    expect(f.chips[2].text).toBe('Praten kan');
    expect(f.paceNote).toBeUndefined();
  });

  it('zet het tempo uit de test in de plaats van "Praten kan" bij een rustige loop', () => {
    const f = missionFacts('tpl_easy_run', brief('tpl_easy_run'), paces);
    expect(f.chips).toHaveLength(3);
    expect(f.chips[2]).toEqual({ text: '7:15 tot 8:20 /km', kind: 'tempo' });
    expect(f.paceNote).toBe('Tempo uit je testloop van 29 oktober.');
  });

  it('een tempoloop krijgt het drempeltempo', () => {
    const f = missionFacts('tpl_tempo_run', brief('tpl_tempo_run'), paces);
    expect(f.chips.at(-1)).toEqual({ text: '6:05 tot 6:20 /km', kind: 'tempo' });
  });

  it('een getal als hoogtemeters blijft staan, het tempo komt erbij', () => {
    const f = missionFacts('tpl_long_run', brief('tpl_long_run'), paces);
    expect(f.chips.some((c) => c.kind === 'tempo')).toBe(true);
    expect(f.chips.length).toBeGreaterThanOrEqual(3);
  });

  it('een training zonder eigen tempo blijft zoals hij was, ook met een test', () => {
    const f = missionFacts('tpl_lower_a', brief('tpl_lower_a'), paces);
    expect(f.chips.some((c) => c.kind === 'tempo')).toBe(false);
    expect(f.paceNote).toBeUndefined();
    expect(f.chips.map((c) => c.text)).toContain('Zwaarte volgens MacroFactor');
  });

  it('geeft een getal zijn uitleg mee', () => {
    const f = missionFacts('tpl_hill_intervals', brief('tpl_hill_intervals'), undefined);
    expect(f.chips[1].text).toMatch(/× .* min hard bergop$/);
  });
});

describe('afstand uit het echte tempo', () => {
  const log = (id: string, date: string, km: number, minutes: number, templateId = 'tpl_long_run'): SessionLog => ({
    id, templateId, type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', sport: 'running',
    cardioData: { durationMinutes: minutes, distanceKm: km, source: 'manual' },
  });

  it('neemt de laatste drie lopen van dezelfde training, met een kleine marge', () => {
    const r = recentRunPace([log('a', '2026-11-01', 8.84, 80), log('b', '2026-10-25', 10, 95), log('c', '2026-10-18', 9, 80), log('old', '2026-09-01', 5, 20), log('other', '2026-11-02', 5, 20, 'tpl_easy_run')], 'tpl_long_run', '2026-11-08')!;
    expect(r.runs).toBe(3);
    expect(r.range.fast).toBeCloseTo((80 * 60 / 9) * 0.97, 5);
    expect(r.range.slow).toBeCloseTo((95 * 60 / 10) * 1.03, 5);
  });

  it('geeft niets zonder lopen, of met alleen een heel korte', () => {
    expect(recentRunPace([], 'tpl_long_run', '2026-11-08')).toBeUndefined();
    expect(recentRunPace([log('a', '2026-11-01', 1.5, 12)], 'tpl_long_run', '2026-11-08')).toBeUndefined();
  });

  it('de afstand op Vandaag rekent met dat tempo en zegt waar het vandaan komt', () => {
    const recent = { fast: 520, slow: 560 };
    const f = missionFacts('tpl_easy_run', brief('tpl_easy_run'), paces, 75, recent);
    expect(f.paceNote).toContain('op het tempo van je laatste lopen');
    expect(f.chips.at(-1)).toEqual({ text: '7:15 tot 8:20 /km', kind: 'tempo' });
    expect(distanceLine(75, recent, true)).toBe('Dat is ongeveer 8 tot 9 km, op het tempo van je laatste lopen.');
  });

  it('zonder eigen lopen blijft het tempo uit de test de afstand geven', () => {
    expect(missionFacts('tpl_easy_run', brief('tpl_easy_run'), paces, 75).paceNote).toMatch(/Dat is ongeveer 9 tot 10 km\.$/);
  });

  it('zegt "je laatste loop" bij één loop en "je laatste lopen" bij twee of meer', () => {
    const recent = { fast: 520, slow: 560 };
    expect(distanceLine(75, recent, 1)).toBe('Dat is ongeveer 8 tot 9 km, op het tempo van je laatste loop.');
    expect(distanceLine(75, recent, 2)).toBe('Dat is ongeveer 8 tot 9 km, op het tempo van je laatste lopen.');
    expect(distanceLine(75, recent, 0)).toBe('Dat is ongeveer 8 tot 9 km.');
    const one = recentRunPace([log('a', '2026-11-01', 9, 80)], 'tpl_long_run', '2026-11-08')!;
    const two = recentRunPace([log('a', '2026-11-01', 9, 80), log('b', '2026-10-25', 10, 95)], 'tpl_long_run', '2026-11-08')!;
    expect(missionFacts('tpl_easy_run', brief('tpl_easy_run'), paces, 75, one.range, one.runs).paceNote).toContain('je laatste loop.');
    expect(missionFacts('tpl_easy_run', brief('tpl_easy_run'), paces, 75, two.range, two.runs).paceNote).toContain('je laatste lopen.');
    expect(recentRunPace([], 'tpl_long_run', '2026-11-08')).toBeUndefined();
  });

  it('zonder testloop staat er geen afstandszin, ook niet met lopen', () => {
    const one = recentRunPace([log('a', '2026-11-01', 9, 80)], 'tpl_long_run', '2026-11-08')!;
    const f = missionFacts('tpl_easy_run', brief('tpl_easy_run'), undefined, 75, one.range, one.runs);
    expect(f.paceNote).toBeUndefined();
    expect(f.chips.some((c) => c.kind === 'tempo')).toBe(false);
  });
});

describe('afstand bij een rustige loop', () => {
  it('75 minuten tussen 6:40 en 7:35 per km is ongeveer 10 tot 11 km', () => {
    expect(distanceLine(75, { fast: 400, slow: 455 })).toBe('Dat is ongeveer 10 tot 11 km.');
    expect(distanceLine(undefined, { fast: 400, slow: 455 })).toBeUndefined();
  });
});
