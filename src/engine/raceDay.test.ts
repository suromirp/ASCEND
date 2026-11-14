// Racedag voor een 10 km (engine/raceDay.ts): wanneer de rij er is, wat het blad zegt, en de randgevallen.
// De race om middernacht staat in raceDay.midnight.test.ts (eigen tijdzone).
import { describe, expect, it } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionLog } from '../models/training';
import type { WeatherForecast, WeatherHour } from '../models/weather';
import { RACE_DAY_TEXT, isTenKmGoal, raceDayMoment, raceDayOn, raceDayView, raceLogFor } from './raceDay';

const RACE = '2027-03-20'; // een zaterdag

function goal(over: Partial<{ km: number; target: number; date: string; status: TrainingGoal['status']; kind: TrainingGoal['kind'] }> = {}): TrainingGoal {
  const km = over.km ?? 10;
  return {
    id: 'g_race', name: 'Stadsloop 10 km', status: over.status ?? 'active', targetDate: over.date ?? RACE, kind: over.kind ?? 'run_race',
    requirements: [
      { kind: 'distance', discipline: 'running', target: { amount: km, unit: 'km' } },
      ...(over.target ? [{ kind: 'targetTime' as const, discipline: 'running' as const, target: { amount: over.target, unit: 'min' as const } }] : []),
    ],
    createdAt: '2026-10-01', updatedAt: '2026-10-01',
  } as TrainingGoal;
}

function hour(time: string, tempC: number): WeatherHour {
  return { time, tempC, feelsC: tempC - 2, precipMm: 0, precipProb: 10, windKmh: 10, gustKmh: 18, code: 1 };
}
const forecast: WeatherForecast = {
  fetchedAt: '2027-03-18T07:00:00.000Z',
  place: { name: 'Thuis', lat: 52.1, lon: 5.1 },
  hours: [hour(`${RACE}T09:00`, 7), hour(`${RACE}T10:00`, 8), hour(`${RACE}T11:00`, 9)],
  days: [{ date: RACE, sunrise: `${RACE}T06:55`, sunset: `${RACE}T19:05` }],
};

const log = (over: Partial<SessionLog> = {}): SessionLog => ({
  id: 'l_race', plannedSessionId: 'p_race', templateId: 'tpl_race', type: 'cardio', completedDate: RACE, completedAt: `${RACE}T10:52:00.000Z`,
  variant: 'full', durationMinutes: 49.2, rpe: 9, source: 'import',
  cardioData: { durationMinutes: 49.2, distanceKm: 10.05, source: 'import' },
  ...over,
} as SessionLog);
const planned: PlannedSession[] = [{ id: 'p_race', templateId: 'tpl_race', scheduledDate: RACE, weekStartDate: '2027-03-15', status: 'planned', order: 0 } as PlannedSession];

const allText = (v: ReturnType<typeof raceDayView>) => [v.row.title, v.row.line, v.sheet.line, ...v.sheet.sections.flatMap((s) => [s.label, ...s.lines])].join('\n');

describe('wanneer het blad er is', () => {
  it('race vandaag', () => {
    const m = raceDayMoment([goal({ target: 50 })], RACE);
    expect(m?.phase).toBe('today');
    expect(raceDayView({ moment: m!, forecast }).row.line).toBe('Vandaag · weer, inlopen en je tempo');
  });

  it('race morgen', () => {
    const m = raceDayMoment([goal({ target: 50 })], '2027-03-19');
    expect(m?.phase).toBe('before');
    expect(raceDayView({ moment: m! }).row.line).toBe('Morgen · weer, inlopen en je tempo');
  });

  it('over 7 dagen wel, over 8 dagen niets', () => {
    expect(raceDayMoment([goal()], '2027-03-13')?.days).toBe(7);
    expect(raceDayMoment([goal()], '2027-03-12')).toBeUndefined();
  });

  it('de dag erna een terugblik, twee dagen erna niets', () => {
    expect(raceDayMoment([goal()], '2027-03-21')?.phase).toBe('after');
    expect(raceDayMoment([goal({ status: 'completed' })], '2027-03-21')?.phase).toBe('after');
    expect(raceDayMoment([goal()], '2027-03-22')).toBeUndefined();
  });

  it('een doel dat geen 10 km is: niets', () => {
    expect(raceDayMoment([goal({ km: 5 })], RACE)).toBeUndefined();
    expect(raceDayMoment([goal({ km: 21.1 })], RACE)).toBeUndefined();
    expect(raceDayMoment([goal({ kind: 'trek_hut' })], RACE)).toBeUndefined();
    expect(isTenKmGoal(goal({ km: 10 }))).toBe(true);
  });

  it('een gearchiveerd doel: niets', () => {
    expect(raceDayMoment([goal({ status: 'archived' })], RACE)).toBeUndefined();
  });

  it('de instelling staat standaard aan', () => {
    expect(raceDayOn(undefined)).toBe(true);
    expect(raceDayOn({})).toBe(true);
    expect(raceDayOn({ raceDay: false })).toBe(false);
  });
});

describe('het blad voor de race', () => {
  it('de teksten voor een voorbeeldrace', () => {
    const v = raceDayView({ moment: raceDayMoment([goal({ target: 50 })], '2027-03-17')!, expectedMinutes: 51.5, forecast });
    expect(v.sheet.line).toBe('Over 3 dagen, zaterdag 20 maart');
    expect(v.sheet.sections.map((s) => s.label)).toEqual(['Start', 'Weer thuis rond 10:00', 'Inlopen', 'Tempo per km']);
    expect(v.sheet.sections[0].lines).toEqual(['Zaterdag 20 maart, 10 km.', 'ASCEND rekent met een start om 10:00.']);
    expect(v.sheet.sections[1].lines[0]).toMatch(/^8 graden/);
    expect(v.sheet.sections[2].lines).toEqual([
      '10 tot 15 minuten rustig joggen.',
      'Daarna 3 tot 4 versnellingen van 15 seconden.',
      'Begin rond 09:35, klaar 5 tot 10 minuten voor de start.',
    ]);
    expect(v.sheet.sections[3].lines).toEqual([
      'Doeltijd 50:00: 5:00 per km.',
      'Verwacht 51:30: ongeveer 5:10 per km.',
      'Loop de eerste kilometer niet sneller dan je tempo.',
    ]);
  });

  it('zonder doeltijd: één regel, de verwachte tijd blijft', () => {
    const v = raceDayView({ moment: raceDayMoment([goal()], RACE)!, expectedMinutes: 52 });
    const pace = v.sheet.sections.find((s) => s.label === 'Tempo per km')!;
    expect(pace.lines[0]).toBe(RACE_DAY_TEXT.noTarget);
    expect(pace.lines[1]).toBe('Verwacht 52:00: ongeveer 5:10 per km.');
  });

  it('zonder doeltijd en zonder test: geen regel over de eerste kilometer', () => {
    const v = raceDayView({ moment: raceDayMoment([goal()], RACE)! });
    expect(v.sheet.sections.find((s) => s.label === 'Tempo per km')!.lines).toEqual([RACE_DAY_TEXT.noTarget, RACE_DAY_TEXT.noExpected]);
  });

  it('geen weer (offline): één eerlijke regel, geen leeg vak', () => {
    const v = raceDayView({ moment: raceDayMoment([goal({ target: 50 })], RACE)! });
    expect(v.sheet.sections[1].lines).toEqual([RACE_DAY_TEXT.noForecast]);
  });

  it('een voorspelling die nog niet tot de racedag reikt', () => {
    const early = { ...forecast, hours: [hour('2027-03-13T10:00', 6)] };
    const v = raceDayView({ moment: raceDayMoment([goal({ target: 50 })], '2027-03-13')!, forecast: early });
    expect(v.sheet.sections[1].lines).toEqual([RACE_DAY_TEXT.notYet]);
  });

  it('beoordeelt de doeltijd niet', () => {
    const text = allText(raceDayView({ moment: raceDayMoment([goal({ target: 40 })], RACE)!, expectedMinutes: 55, forecast }));
    expect(text).not.toMatch(/te snel|te traag|haalbaar|past niet|ambitieus/i);
  });

  it('geen gedachtestreepjes en niets onder de regels van de stem', () => {
    const text = allText(raceDayView({ moment: raceDayMoment([goal({ target: 50 })], RACE)!, expectedMinutes: 51.5, forecast }));
    expect(text).not.toMatch(/[–—!]/);
  });
});

describe('de terugblik de dag erna', () => {
  it('met log: tijd, tempo en de doeltijd als feit', () => {
    const m = raceDayMoment([goal({ target: 50 })], '2027-03-21')!;
    const raceLog = raceLogFor([log()], planned, m.raceDate);
    const v = raceDayView({ moment: m, raceLog });
    expect(v.row).toEqual({ eyebrow: 'Terugblik', title: 'Stadsloop 10 km', line: 'Gisteren, 49:12' });
    expect(v.sheet.sections).toEqual([{ label: 'Hoe ging het', lines: ['Je liep 10,1 km in 49:12, 4:54 per km.', 'Je doeltijd was 50:00, 5:00 per km.', 'Zwaarte: 9 van 10.'] }]);
  });

  it('zonder log: zegt dat het log nog komt', () => {
    const m = raceDayMoment([goal({ target: 50 })], '2027-03-21')!;
    expect(raceLogFor([], planned, m.raceDate)).toBeUndefined();
    const v = raceDayView({ moment: m });
    expect(v.row.line).toBe('Gisteren, nog zonder log');
    expect(v.sheet.sections[0].lines).toEqual([RACE_DAY_TEXT.noLog]);
  });

  it('een losse loop op de racedag is geen racelog; een log aan de geplande race wel', () => {
    expect(raceLogFor([log({ plannedSessionId: undefined, templateId: 'tpl_easy_run' })], planned, RACE)).toBeUndefined();
    expect(raceLogFor([log({ templateId: 'adhoc_run' })], planned, RACE)?.id).toBe('l_race');
  });
});
