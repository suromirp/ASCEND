import { describe, it, expect, afterEach } from 'vitest';
import { longRunCapAfterRace, programRunBuild, resolveLongRunGrowth } from './runGrowth';
import { PHASE_BASIS, PHASE_OPBOUW, progressionTarget, layoutPhasesForGoal, readRunBuild } from './programLayout';
import { recentSessionMaxima, resolveEffectiveFullDuration, setRecentSessionMaxima } from './substitutions';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { TrainingGoal } from '../models/goals';
import type { Program } from '../models/program';
import { addDays } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const longRun = templates.find((t) => t.id === 'tpl_long_run')!;
const mountain = templates.find((t) => t.id === 'tpl_mountain_hike')!;
const easyRun = templates.find((t) => t.id === 'tpl_easy_run')!;

const TODAY = '2026-10-26';
const run = (id: string, km: number, date: string, over: Partial<TrainingGoal> = {}): TrainingGoal => ({
  id, name: id, status: 'active', targetDate: date, createdAt: '', updatedAt: '',
  requirements: [{ id: `${id}-r`, kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: km, unit: 'km' }, discipline: 'running' }],
  ...over,
}) as TrainingGoal;

describe('Program.runBuild: wanneer de lange loop sneller groeit', () => {
  it('bij een hardloopdoel als Top of Voortop, naar de eerstvolgende wedstrijd, met de piek van de afstand', () => {
    expect(programRunBuild([run('a', 10, '2027-05-01'), run('b', 21.1, '2027-03-13')], undefined, TODAY))
      .toEqual({ raceDate: '2027-03-13', stepWeeks: 1, peakMinutes: 120 });
    expect(programRunBuild([run('a', 42.2, '2027-05-01', { priority: 'top' })], undefined, TODAY)?.peakMinutes).toBe(180);
    expect(programRunBuild([run('a', 10, '2027-05-01')], undefined, TODAY)?.peakMinutes).toBe(75);
  });

  it('niet voor een Verkenning en niet voor een wedstrijd die voorbij is', () => {
    expect(programRunBuild([run('a', 10, '2027-05-01', { priority: 'verkenning' })], undefined, TODAY)).toBeUndefined();
    expect(programRunBuild([run('a', 10, '2026-09-01')], undefined, TODAY)).toBeUndefined();
    expect(programRunBuild([run('a', 10, '2027-05-01', { status: 'paused' } as Partial<TrainingGoal>)], undefined, TODAY)).toBeUndefined();
  });
});

describe('Program.runBuild: ook in een programma naar een tocht', () => {
  const main = (id: string, kind: TrainingGoal['kind'], date: string): TrainingGoal => ({ id, name: id, status: 'active', targetDate: date, kind, requirements: [], createdAt: '', updatedAt: '' }) as TrainingGoal;

  it('een Voortop naast een tocht als hoofddoel laat de lange loop ook sneller groeien', () => {
    for (const kind of ['trek_hut', 'trek_tent', 'day_hike', 'mountaineering', 'stronger'] as const) {
      expect(programRunBuild([main('m', kind, '2027-07-25'), run('a', 10, '2027-05-01')], 'm', TODAY)?.raceDate, kind).toBe('2027-05-01');
    }
    expect(programRunBuild([main('m', 'trek_hut', '2027-07-25'), run('a', 10, '2027-05-01', { priority: 'verkenning' })], 'm', TODAY)).toBeUndefined();
    // Is het hoofddoel zelf de hardloopwedstrijd, dan is het de Top waar naartoe gebouwd wordt.
    expect(programRunBuild([run('m', 21.1, '2027-05-01')], 'm', TODAY)).toMatchObject({ raceDate: '2027-05-01', peakMinutes: 120 });
  });
});

describe('Groei van de lange loop (instelling)', () => {
  const goals = [run('a', 10, '2027-05-01')];

  it('elke week is het advies, om de twee weken is rustiger, per blok van vier weken is het oude gedrag zonder runBuild', () => {
    expect(programRunBuild(goals, undefined, TODAY)?.stepWeeks).toBe(1);
    expect(programRunBuild(goals, undefined, TODAY, 'weekly')?.stepWeeks).toBe(1);
    expect(programRunBuild(goals, undefined, TODAY, 'biweekly')?.stepWeeks).toBe(2);
    expect(programRunBuild(goals, undefined, TODAY, 'wave')).toMatchObject({ raceDate: '2027-05-01', peakMinutes: 75, alternatePeak: false, taperOnly: true });
    expect(programRunBuild(goals, undefined, TODAY, 'wave')?.alternatePeak).toBe(false);
  });

  it('zonder wedstrijd geven Heel rustig, Stevig en Sneller de markering zonder afwisseling, de andere niets', () => {
    for (const g of ['wave', 'firm', 'fast'] as const) {
      const marker = programRunBuild([], undefined, TODAY, g);
      expect(marker?.alternatePeak, g).toBe(false);
      expect(readRunBuild(marker), g).toBeUndefined();
    }
    expect(programRunBuild([], undefined, TODAY, 'weekly')).toBeUndefined();
    expect(programRunBuild([], undefined, TODAY, 'biweekly')).toBeUndefined();
  });

  it('een onbekende waarde wordt het advies', () => {
    for (const bad of [undefined, null, 'snel', 3, {}]) expect(resolveLongRunGrowth(bad)).toBe('weekly');
    expect(programRunBuild(goals, undefined, TODAY, 'snel')?.stepWeeks).toBe(1);
  });
});

describe('de lange loop groeit elke twee weken in plaats van elk blok van vier weken', () => {
  // Basis 4 weken, daarna 16 weken Opbouw, vanaf maandag 2026-10-26.
  const START = '2026-10-26';
  const phases = layoutPhasesForGoal(START, addDays(START, 7 * 24), { [PHASE_BASIS]: 4, [PHASE_OPBOUW]: 16 })!;
  const base: Program = { id: 'p', name: 'P', startDate: START, phases };
  const weekDate = (n: number) => addDays(START, (n - 1) * 7);
  const minutes = (program: Program, template = longRun, week = 5) => progressionTarget(template, program, weekDate(week))?.minutes;
  const raceDate = addDays(START, 7 * 14);
  const fast: Program = { ...base, runBuild: { raceDate, stepWeeks: 2, peakMinutes: 180 } };

  it('zonder runBuild verandert er niets', () => {
    const opbouw = phases.findIndex((p) => p.id === PHASE_OPBOUW);
    expect(opbouw).toBeGreaterThanOrEqual(0);
    expect(minutes(base, longRun, 5)).toBe(minutes({ ...base, runBuild: undefined }, longRun, 5));
  });

  it('in de tweede helft van een blok staat de lange loop hoger dan in het gewone plan, en nooit lager', () => {
    for (let week = 5; week <= 20; week++) expect(minutes(fast, longRun, week)!).toBeGreaterThanOrEqual(minutes(base, longRun, week)!);
    // Week 7 en 8 van de Opbouw: twee stappen verder dan de eerste wave.
    expect(minutes(fast, longRun, 7)!).toBeGreaterThan(minutes(base, longRun, 7)!);
  });

  it('elke week groeit sneller dan om de twee weken, en nooit lager', () => {
    const weekly: Program = { ...base, runBuild: { raceDate, stepWeeks: 1, peakMinutes: 180 } };
    for (let week = 5; week <= 20; week++) expect(minutes(weekly, longRun, week)!).toBeGreaterThanOrEqual(minutes(fast, longRun, week)!);
    expect([5, 6, 7, 8, 9, 10].some((w) => minutes(weekly, longRun, w)! > minutes(fast, longRun, w)!)).toBe(true);
  });

  it('het plafond is de piek van de afstand', () => {
    const peak = 180;
    for (let week = 5; week <= 24; week++) expect(minutes(fast, longRun, week)!).toBeLessThanOrEqual(Math.max(peak, minutes(base, longRun, week)!) + 1);
  });

  it('na de wedstrijd groeit de snelle opbouw niet verder', () => {
    const atRace: Program = { ...base, runBuild: { raceDate: addDays(START, 7 * 8), stepWeeks: 2, peakMinutes: 180 } };
    const weeks = [11, 12, 13, 14, 15, 16];
    expect(weeks.every((w) => minutes(atRace, longRun, w)! <= minutes(fast, longRun, w)!)).toBe(true);
    expect(weeks.some((w) => minutes(atRace, longRun, w)! < minutes(fast, longRun, w)!)).toBe(true);
  });

  it('een wedstrijd die al voor de Opbouw valt, verandert niets', () => {
    const early: Program = { ...base, runBuild: { raceDate: addDays(START, 7), stepWeeks: 2, peakMinutes: 180 } };
    for (let week = 1; week <= 24; week++) expect(minutes(early, longRun, week)).toBe(minutes(base, longRun, week));
  });

  it('een beschadigde runBuild (NaN, een datum die geen datum is, een stap van nul) valt terug op de gewone groei', () => {
    const bad: unknown[] = [
      { raceDate, stepWeeks: 2, peakMinutes: Number.NaN },
      { raceDate: '2027-13-45', stepWeeks: 2, peakMinutes: 180 },
      { raceDate: 'morgen', stepWeeks: 2, peakMinutes: 180 },
      { raceDate: undefined, stepWeeks: 2, peakMinutes: 180 },
      { raceDate, stepWeeks: Number.NaN, peakMinutes: 180 },
      { raceDate, stepWeeks: 0, peakMinutes: 180 },
      'rommel',
    ];
    for (const runBuild of bad) {
      const broken = { ...base, runBuild } as unknown as Program;
      for (let week = 1; week <= 24; week++) {
        const m = minutes(broken, longRun, week);
        expect(Number.isFinite(m), `week ${week} ${JSON.stringify(runBuild)}`).toBe(true);
        // Een NaN in de piek geldt als geen piek: de piek van 120 minuten blijft.
        if (!(runBuild && (runBuild as { peakMinutes?: number }).peakMinutes !== undefined && Number.isNaN((runBuild as { peakMinutes: number }).peakMinutes))) expect(m).toBe(minutes(base, longRun, week));
      }
    }
  });

  it('alleen de lange loop: de bergtocht en het rustige loopje groeien zoals altijd', () => {
    for (const t of [mountain, easyRun]) {
      for (const week of [5, 8, 12, 16]) expect(minutes(fast, t, week)).toBe(minutes(base, t, week));
    }
  });
});

describe('na een wedstrijd', () => {
  afterEach(() => setRecentSessionMaxima({ asOf: '', minutesByTemplate: {} }));

  it('de eerste week terug is de lange loop hoogstens de helft van de wedstrijd, daarna niet meer begrensd door de wedstrijd', () => {
    const race = { completedDate: '2027-03-13', durationMinutes: 50 };
    expect(longRunCapAfterRace(race, '2027-03-14')).toBe(30);
    expect(longRunCapAfterRace(race, '2027-03-20')).toBe(30);
    expect(longRunCapAfterRace(race, '2027-03-21')).toBeUndefined();
    expect(longRunCapAfterRace(race, '2027-03-13')).toBeUndefined();
    expect(longRunCapAfterRace({ completedDate: '2027-03-13' }, '2027-03-14')).toBeUndefined();
  });

  it('een loop op de doeldatum van een hardloopdoel is de wedstrijd, ook onder een ander sjabloon; krachttraining nooit', () => {
    const logs = [
      { templateId: 'tpl_easy_run', completedDate: '2027-03-13', durationMinutes: 50, sport: 'running' },
      { templateId: 'tpl_upper_a', completedDate: '2027-03-13', durationMinutes: 55, type: 'strength' },
      { templateId: 'tpl_long_run', completedDate: '2027-03-01', durationMinutes: 90 },
    ];
    const maxima = recentSessionMaxima(logs, '2027-03-14', new Set(['2027-03-13']));
    expect(maxima.minutesByTemplate).toEqual({ tpl_upper_a: 55, tpl_long_run: 90 });
    expect(maxima.afterRace).toEqual([{ date: '2027-03-13', durationMinutes: 50 }]);
    // Zonder de doeldatums telt de loop gewoon mee, zoals voorheen.
    expect(recentSessionMaxima(logs, '2027-03-14').minutesByTemplate.tpl_easy_run).toBe(50);
  });

  it('de wedstrijd zelf is geen referentie voor de 110%, en begrenst de lange loop in de eerste week', () => {
    const logs = [
      { templateId: 'tpl_race', completedDate: '2027-03-13', durationMinutes: 50 },
      { templateId: 'tpl_long_run', completedDate: '2027-03-01', durationMinutes: 90 },
    ];
    const maxima = recentSessionMaxima(logs, '2027-03-14');
    expect(maxima.minutesByTemplate).toEqual({ tpl_long_run: 90 });
    expect(maxima.afterRace).toEqual([{ date: '2027-03-13', durationMinutes: 50 }]);

    setRecentSessionMaxima(maxima);
    const START = '2026-10-26';
    const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, addDays(START, 7 * 30))! };
    const firstWeek = resolveEffectiveFullDuration(longRun, '2027-03-14', program);
    expect(firstWeek).toBeLessThanOrEqual(30);
    // Een week later geldt de gewone 110% op de langste loop (90 minuten), niet de wedstrijd.
    const laterWeek = resolveEffectiveFullDuration(longRun, '2027-03-21', program);
    expect(laterWeek).toBeGreaterThan(30);
    expect(laterWeek).toBeLessThanOrEqual(99);
  });
});
