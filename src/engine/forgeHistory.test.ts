import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog, SetLog } from '../models/training';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import {
  bestEver,
  compareExercise,
  extraChanges,
  forgePoints,
  historyRows,
  isRepsBased,
  matchesQuery,
  snapshotAt,
  sortViews,
  splitByRecency,
  trainingFilters,
  valueChange,
  visibleViews,
  volumeOf,
  type ForgePoint,
} from './forgeHistory';
import { exerciseHistories, exerciseViews } from './strengthHistory';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const BODY = demoWeights[0].kg;
const TODAY = '2026-10-22';
const logs = demoStrengthLogs();
const strengthLogs = logs.filter((l) => l.strengthData && l.strengthData.length > 0);
const deps = { logs, templates, program, bodyKg: BODY };
const views = exerciseViews(exerciseHistories(strengthLogs, templates, deps), resolveStrengthSettings(undefined), BODY, TODAY);
const viewOf = (name: string) => views.find((v) => v.history.name.toLowerCase().includes(name))!;

const work = (reps: number, weightKg: number): SetLog => ({ reps, weightKg, rir: 2 });
const point = (date: string, value: number, sets: SetLog[] = [], over: Partial<ForgePoint> = {}): ForgePoint => {
  const top = [...sets].sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0) || b.reps - a.reps)[0];
  const volumeKg = volumeOf(sets);
  return { date, unit: 'kg', value, workSets: sets, ...(top ? { topWeightKg: top.weightKg, topReps: top.reps } : {}), ...(volumeKg !== undefined ? { volumeKg } : {}), ...over };
};

describe('volumeOf', () => {
  it('telt gewicht maal herhalingen van de werksets en laat opwarmsets weg', () => {
    const sets: SetLog[] = [{ reps: 10, weightKg: 20, kind: 'warmup' }, work(8, 60), work(8, 60), work(6, 62.5)];
    expect(volumeOf(sets)).toBe(8 * 60 * 2 + 6 * 62.5);
  });
  it('geeft niets bij eigen gewicht of hulp', () => {
    expect(volumeOf([{ reps: 10 }, { reps: 8, weightKg: 0 }])).toBeUndefined();
    expect(volumeOf([{ reps: 8, weightKg: -30 }])).toBeUndefined();
  });
});

describe('snapshotAt en bestEver', () => {
  const pts = [point('2026-08-01', 80), point('2026-09-01', 90), point('2026-09-20', 85), point('2026-10-10', 88)];
  it('neemt de laatste training op of voor de dag', () => {
    expect(snapshotAt(pts, '2026-09-20')?.value).toBe(85);
    expect(snapshotAt(pts, '2026-09-19')?.value).toBe(90);
    expect(snapshotAt(pts, '2026-07-31')).toBeUndefined();
  });
  it('het beste ooit hoeft niet het laatste te zijn en bij gelijk telt de eerste keer', () => {
    expect(bestEver(pts)).toMatchObject({ date: '2026-09-01', value: 90 });
    expect(bestEver([point('2026-01-01', 70), point('2026-02-01', 70)])?.date).toBe('2026-01-01');
    expect(bestEver([])).toBeUndefined();
  });
  it('het verschil is afgerond op een tiende en leeg zonder vergelijking', () => {
    expect(valueChange(point('b', 82.56), point('a', 80))).toBe(2.6);
    expect(valueChange(point('b', 80), point('a', 82.5))).toBe(-2.5);
    expect(valueChange(undefined, point('a', 80))).toBeUndefined();
  });
});

describe('extraChanges', () => {
  it('bij hetzelfde zwaarste gewicht tellen de herhalingen daarbij', () => {
    const then = point('2026-09-01', 90, [work(6, 60), work(6, 60)]);
    const now = point('2026-10-10', 90, [work(8, 60), work(7, 60)]);
    const out = extraChanges(now, then);
    expect(out).toContainEqual({ kind: 'reps_same_weight', delta: 2, atKg: 60 });
    expect(out).toContainEqual({ kind: 'volume', delta: 8 * 60 + 7 * 60 - 12 * 60 });
  });
  it('bij een ander zwaarste gewicht staat het verschil in gewicht', () => {
    const out = extraChanges(point('2026-10-10', 90, [work(8, 62.5)]), point('2026-09-01', 90, [work(8, 60)]));
    expect(out.find((c) => c.kind === 'top_weight')?.delta).toBe(2.5);
    expect(out.find((c) => c.kind === 'reps_same_weight')).toBeUndefined();
  });
  it('minder is gewoon een negatief getal, zonder oordeel', () => {
    const out = extraChanges(point('2026-10-10', 90, [work(6, 60)]), point('2026-09-01', 90, [work(8, 60)]));
    expect(out.find((c) => c.kind === 'reps_same_weight')?.delta).toBe(-2);
  });
  it('een opwarmset telt nooit mee, ook niet als hij het zwaarst is', () => {
    const warm: SetLog = { reps: 3, weightKg: 100, kind: 'warmup' };
    const bench = viewOf('bench press');
    const withWarm = { ...bench, points: bench.points.map((p) => ({ ...p, workSets: [...p.workSets, warm] })) };
    expect(forgePoints(withWarm, 'one_rm')).toEqual(forgePoints(bench, 'one_rm'));
    expect(volumeOf([warm, work(8, 60)])).toBe(480);
  });
  it('zonder vergelijkingspunt of zonder gegevens is er niets', () => {
    expect(extraChanges(point('b', 1, [work(5, 50)]), undefined)).toEqual([]);
    expect(extraChanges(point('2026-10-10', 1), point('2026-09-01', 1))).toEqual([]);
  });
});

describe('compareExercise', () => {
  const pts = [point('2026-08-20', 80), point('2026-09-14', 84), point('2026-10-12', 86)];
  it('zet nu naast 4 en 8 weken geleden, geteld vanaf vandaag', () => {
    const c = compareExercise(pts, '2026-10-14', [4, 8]);
    expect(c.now?.value).toBe(86);
    expect(c.moments[0]).toMatchObject({ weeks: 4, asOf: '2026-09-16', change: 2 });
    expect(c.moments[0].point?.date).toBe('2026-09-14');
    expect(c.moments[1]).toMatchObject({ weeks: 8, asOf: '2026-08-19' });
    expect(c.moments[1].status).toBe('none');
    expect(c.moments[1].point).toBeUndefined();
    expect(c.moments[1].change).toBeUndefined();
    expect(c.atBest).toBe(true);
  });
  it('een training telt alleen binnen het venster van het moment', () => {
    // 4 weken geleden is 22 nov: de laatste training (12 okt) is 41 dagen eerder, dus buiten 28 dagen.
    const c = compareExercise(pts, '2026-12-20', [4, 8]);
    // 8 weken geleden is 25 okt: de training van 12 okt is dan de training van nu zelf.
    expect(c.moments.map((m) => m.status)).toEqual(['none', 'same']);
    expect(c.moments.every((m) => m.point === undefined && m.change === undefined && m.extras.length === 0)).toBe(true);
  });
  it('precies op de rand van het venster telt nog mee', () => {
    const c = compareExercise([point('2026-08-01', 70), point('2026-10-12', 86)], '2026-10-14', [4]);
    // asOf 16 sep, 1 aug is 46 dagen eerder: buiten
    expect(c.moments[0].status).toBe('none');
    const edge = compareExercise([point('2026-08-19', 70), point('2026-10-12', 86)], '2026-10-14', [4]);
    expect(edge.moments[0].status).toBe('ok');
    expect(edge.moments[0].change).toBe(16);
  });
  it('twee momenten met dezelfde training: de latere is "same"', () => {
    const c = compareExercise([point('2026-08-19', 70), point('2026-10-12', 86)], '2026-10-14', [4, 8]);
    expect(c.moments[0].status).toBe('ok');
    expect(c.moments[1].status).toBe('same');
    expect(c.moments[1].extras).toEqual([]);
  });
  it('is het moment de training van nu zelf, dan is er geen vergelijking', () => {
    const c = compareExercise([point('2026-10-12', 86)], '2026-10-14', [4, 8]);
    expect(c.moments.map((m) => m.status)).toEqual(['none', 'none']);
    const near = compareExercise([point('2026-09-14', 86)], '2026-10-14', [4]);
    expect(near.moments[0].status).toBe('same');
    expect(near.moments[0].change).toBeUndefined();
  });
  it('lager dan het beste ooit is niet atBest', () => {
    const c = compareExercise([point('2026-08-20', 90), point('2026-10-12', 86)], '2026-10-14', [4]);
    expect(c.atBest).toBe(false);
    expect(c.best?.value).toBe(90);
  });
  it('zonder punten is alles leeg', () => {
    const c = compareExercise([], TODAY, [4, 8]);
    expect(c.now).toBeUndefined();
    expect(c.atBest).toBe(false);
    expect(c.moments.every((m) => m.point === undefined && m.extras.length === 0)).toBe(true);
  });
});

describe('forgePoints en historyRows op de nagemaakte trainingen', () => {
  const bench = viewOf('bench press');
  it('de 1RM-punten zijn die van het krachtmodel, oudste eerst', () => {
    const pts = forgePoints(bench, 'one_rm');
    expect(pts.length).toBeGreaterThan(2);
    expect(pts.map((p) => p.date)).toEqual([...pts.map((p) => p.date)].sort());
    expect(pts[pts.length - 1].value).toBe(bench.strengthKg);
  });
  it('de kant werkgewicht leest de lijn op dezelfde dagen', () => {
    const pts = forgePoints(bench, 'work_weight');
    expect(pts.map((p) => p.value)).toEqual(bench.line.map((l) => l.value));
  });
  it('de geschiedenis staat nieuwste eerst met de 1RM van ASCEND en die van MacroFactor van die dag', () => {
    const last = forgePoints(bench, 'one_rm').slice(-1)[0];
    const rows = historyRows(bench, [{ date: last.date, kg: 99 }, { date: '2020-01-01', kg: 1 }]);
    expect(rows).toHaveLength(bench.history.sessions.length);
    expect(rows[0].date >= rows[rows.length - 1].date).toBe(true);
    expect(rows[0].ascendKg).toBe(bench.strengthKg);
    expect(rows[0].macroFactorKg).toBe(99);
    expect(rows[1].macroFactorKg).toBeUndefined();
    expect(rows[0].topWeightKg).toBeGreaterThan(0);
    expect(rows[0].volumeKg).toBeGreaterThan(0);
  });
  it('de set met hulp heeft geen volume maar wel een zwaarste set', () => {
    const pull = viewOf('pull-up');
    const rows = historyRows(pull);
    expect(rows[0].volumeKg).toBeUndefined();
    expect(rows[0].topReps).toBeGreaterThan(0);
  });
});

describe('matchesQuery', () => {
  it('hoofdletters, accenten en leestekens tellen niet', () => {
    expect(matchesQuery('Bankdrukken (Barbell)', 'BANKDRUK')).toBe(true);
    expect(matchesQuery('Romanian Deadlift', 'romanian deadlift')).toBe(true);
  });
  it('een stuk van een woord past', () => {
    expect(matchesQuery('Back Squat', 'sq')).toBe(true);
  });
  it('kleine typfouten mogen bij langere woorden', () => {
    expect(matchesQuery('Back Squat', 'sqaut')).toBe(true);
    expect(matchesQuery('Romanian Deadlift', 'romainan')).toBe(true);
    expect(matchesQuery('Leg Press', 'presss')).toBe(true);
  });
  it('korte woorden en andere woorden passen niet', () => {
    expect(matchesQuery('Leg Press', 'bog')).toBe(false);
    expect(matchesQuery('Back Squat', 'deadlift')).toBe(false);
  });
  it('elk woord van de zoekterm moet passen en een lege zoekterm past bij alles', () => {
    expect(matchesQuery('Back Squat', 'back squat')).toBe(true);
    expect(matchesQuery('Back Squat', 'back press')).toBe(false);
    expect(matchesQuery('Back Squat', '  ')).toBe(true);
  });
});

describe('filters en volgorde', () => {
  it('de filters zijn de namen van de echte templates waar een oefening in gelogd is', () => {
    const names = trainingFilters(templates, views);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(templates.some((t) => t.name === n)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it('een filter laat alleen oefeningen uit die training zien', () => {
    const names = trainingFilters(templates, views);
    const upper = visibleViews(views, { query: '', training: names[0], sort: 'most' });
    expect(upper.length).toBeGreaterThan(0);
    expect(upper.length).toBeLessThan(views.length);
    for (const v of upper) expect(v.history.sessions.some((s) => s.trainingName === names[0])).toBe(true);
  });
  it('zoeken en filteren samen, en zonder beide staat alles erin', () => {
    expect(visibleViews(views, { query: '', training: null, sort: 'most' })).toHaveLength(views.length);
    const found = visibleViews(views, { query: 'squat', training: null, sort: 'most' });
    expect(found.map((v) => v.history.exercise?.id)).toContain('back-squat');
    expect(visibleViews(views, { query: 'bankdruk', training: null, sort: 'most' }).map((v) => v.history.exercise?.id)).toContain('bench-press');
    expect(visibleViews(views, { query: 'xyzxyzxyz', training: null, sort: 'most' })).toEqual([]);
  });
  it('sorteert op meest getraind, laatst getraind of naam', () => {
    const byName = sortViews(views, 'name').map((v) => v.history.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, 'nl')));
    const most = sortViews(views, 'most');
    expect(most[0].history.sessions.length).toBeGreaterThanOrEqual(most[most.length - 1].history.sessions.length);
    const recent = sortViews(views, 'recent');
    const last = (v: (typeof views)[number]) => v.history.sessions.map((s) => s.date).sort().pop()!;
    expect(last(recent[0]) >= last(recent[recent.length - 1])).toBe(true);
  });
  it('sorteren verandert de invoer niet', () => {
    const before = views.map((v) => v.history.key);
    sortViews(views, 'name');
    expect(views.map((v) => v.history.key)).toEqual(before);
  });
});

describe('oefeningen op herhalingen', () => {
  const legRaise = (id: string, date: string, rows: Array<[reps: number, weightKg?: number, kind?: 'warmup']>): SessionLog => ({
    id,
    templateId: 'tpl_upper_a',
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T18:30:00.000Z`,
    variant: 'custom',
    durationMinutes: 40,
    source: 'macrofactor',
    externalId: `macrofactor:${date}:${id}`,
    strengthData: [{ exerciseId: 'hanging-leg-raise', exerciseName: 'Hanging Leg Raise', sets: rows.map(([reps, weightKg, kind]) => ({ reps, ...(weightKg !== undefined ? { weightKg } : {}), ...(kind ? { kind } : {}) })) }],
  });
  const build = (list: SessionLog[]) => {
    const l = [...logs, ...list];
    const v = exerciseViews(exerciseHistories(list, templates, { ...deps, logs: l }), resolveStrengthSettings(undefined), BODY, TODAY);
    return v[0];
  };
  const reps = build([
    legRaise('r1', '2026-08-20', [[8], [7], [6]]),
    legRaise('r2', '2026-09-20', [[10], [8], [8]]),
    legRaise('r3', '2026-10-15', [[12], [10], [9], [30, undefined, 'warmup']]),
  ]);

  it('wordt herkend: geen gewicht in de werksets', () => {
    expect(isRepsBased(reps)).toBe(true);
    expect(isRepsBased(viewOf('bench press'))).toBe(false);
    expect(isRepsBased(viewOf('pull-up'))).toBe(false);
  });
  it('de herhalingen van de beste set zijn het hoofdgetal en een opwarmset telt niet', () => {
    const pts = forgePoints(reps, 'one_rm');
    expect(pts.map((p) => [p.unit, p.value, p.totalReps])).toEqual([['reps', 8, 21], ['reps', 10, 26], ['reps', 12, 31]]);
    // de schakelaar doet er niet toe
    expect(forgePoints(reps, 'work_weight')).toEqual(pts);
  });
  it('nu, 4 en 8 weken geleden en het beste ooit staan naast elkaar met het verschil in herhalingen', () => {
    const c = compareExercise(forgePoints(reps, 'one_rm'), '2026-10-20', [4, 8]);
    expect(c.now?.value).toBe(12);
    expect(c.moments[0]).toMatchObject({ weeks: 4, change: 2 });
    expect(c.moments[0].extras).toEqual([{ kind: 'total_reps', delta: 5 }]);
    expect(c.moments[1].point?.value).toBe(8);
    expect(c.moments[1].change).toBe(4);
    expect(c.atBest).toBe(true);
  });
  it('komt er gewicht bij, dan staat het gewicht naast de herhalingen', () => {
    const withWeight = build([legRaise('r1', '2026-09-20', [[10], [8]]), legRaise('r2', '2026-10-15', [[10, 5], [8, 5]])]);
    expect(isRepsBased(withWeight)).toBe(true);
    const pts = forgePoints(withWeight, 'one_rm');
    expect(pts[1]).toMatchObject({ value: 10, topWeightKg: 5 });
    expect(extraChanges(pts[1], pts[0]).find((c) => c.kind === 'top_weight')?.delta).toBe(5);
    const rows = historyRows(withWeight);
    expect(rows[0]).toMatchObject({ bestReps: 10, totalReps: 18, topWeightKg: 5 });
    expect(rows[0].ascendKg).toBeUndefined();
    expect(rows[0].volumeKg).toBeUndefined();
  });
  it('de geschiedenis geeft beste set en totaal', () => {
    const rows = historyRows(reps);
    expect(rows[0]).toMatchObject({ date: '2026-10-15', bestReps: 12, totalReps: 31, workSetCount: 3 });
  });
});

describe('splitByRecency', () => {
  it('zet oefeningen die je de laatste weken deed apart van die van eerder', () => {
    const last = (v: (typeof views)[number]) => v.history.sessions.reduce((m, x) => (x.date > m ? x.date : m), '');
    const { recent, older } = splitByRecency(views, TODAY, 56);
    expect(recent.length + older.length).toBe(views.length);
    for (const v of recent) expect(last(v) >= '2026-08-27').toBe(true);
    for (const v of older) expect(last(v) < '2026-08-27').toBe(true);
    expect(splitByRecency(views, '2030-01-01', 56).recent).toEqual([]);
  });
});

describe('compareExercise valt terug op de vorige training', () => {
  it('geeft de training ervoor en het verschil, ook zonder moment in het venster', () => {
    const pts = [point('2026-03-01', 60), point('2026-10-20', 62.5)];
    const cmp = compareExercise(pts, '2026-10-22', [4, 8]);
    expect(cmp.moments.every((m) => m.status === 'none')).toBe(true);
    expect(cmp.previous?.date).toBe('2026-03-01');
    expect(cmp.previousChange).toBe(2.5);
  });
  it('heeft geen vorige bij één training', () => {
    const cmp = compareExercise([point('2026-10-20', 62.5)], '2026-10-22', [4, 8]);
    expect(cmp.previous).toBeUndefined();
    expect(cmp.previousChange).toBeUndefined();
  });
});
