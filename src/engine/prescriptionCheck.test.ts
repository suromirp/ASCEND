import { describe, expect, it } from 'vitest';
import workoutCsv from './fixtures/macrofactor-workout-log.csv?raw';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { applyStrengthTakeover } from './macrofactorLead';
import { readMacroFactorCsv } from './macrofactorImport';
import { restoreManual } from './watchAlign';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { biasWord, checkDone, checkProposal, checkRow, checkLines, logOrigin, percent, summariseChecks, targetOfSlot, totalsOf } from './prescriptionCheck';
import { checkDataKey, checkSummary, comparisonRows, exerciseHistories } from './strengthHistory';
import { checkModelKey, resolveStrengthSettings } from './strengthSettings';

const target = { low: 8, high: 10, rir: 2 };

describe('één toets voor beide kanten', () => {
  it('hetzelfde gewicht krijgt hetzelfde oordeel, wat je deed of wat ASCEND voorstelde', () => {
    for (const load of [60, 70, 80, 90, 100]) {
      const did = checkProposal(110, load, target);
      const proposed = checkProposal(110, load, target);
      expect(did).toEqual(proposed);
    }
  });
  it('de speling is voor beide kanten 1 herhaling', () => {
    expect(checkProposal(100, 100 / (1 + 11 / 30), target)?.hit).toBe(true);
    expect(checkProposal(100, 100 / (1 + 10 / 30), target)?.hit).toBe(true);
    expect(checkProposal(100, 100 / (1 + 9 / 30), target)?.hit).toBe(true);
    expect(checkProposal(100, 100 / (1 + 8 / 30), target)?.hit).toBe(false);
    expect(checkProposal(100, 100 / (1 + 15 / 30), target)?.hit).toBe(false);
  });
  it('een gemeten Forge-set met dezelfde speling: herhalingen plus RIR min het doel', () => {
    expect(checkDone({ reps: 9, rir: 2 }, target)?.hit).toBe(true);
    expect(checkDone({ reps: 7, rir: 2 }, target)?.hit).toBe(true);
    expect(checkDone({ reps: 6, rir: 2 }, target)?.hit).toBe(false);
    expect(checkDone({ reps: 11, rir: 2 }, target)?.hit).toBe(true);
    expect(checkDone({ reps: 12, rir: 2 }, target)?.hit).toBe(false);
    expect(checkDone({ reps: 9, rir: 4 }, target)?.hit).toBe(true);
    expect(checkDone({ reps: 9, rir: 5 }, target)?.hit).toBe(false);
  });
  it('checkDone is checkProposal met de kracht van die set zelf', () => {
    const load = 80;
    const strength = load * (1 + (9 + 1) / 30);
    const done = checkDone({ reps: 9, rir: 1 }, target)!;
    const proposal = checkProposal(strength, load, target)!;
    expect(done.hit).toBe(proposal.hit);
    expect(done.deviation).toBeCloseTo(proposal.deviation, 9);
  });
  it('zonder RIR of herhalingen geen oordeel, en de afwijking heeft een richting', () => {
    expect(checkDone({ reps: 9 }, target)).toBeUndefined();
    expect(checkDone({ reps: 0, rir: 2 }, target)).toBeUndefined();
    expect(checkDone({ reps: 6, rir: 2 }, target)!.deviation).toBe(-3);
    expect(checkDone({ reps: 12, rir: 2 }, target)!.deviation).toBe(3);
    expect(checkProposal(100, 90, target)!.deviation).toBeLessThan(0);
    expect(checkProposal(100, 50, target)!.deviation).toBeGreaterThan(0);
    expect(checkProposal(0, 50, target)).toBeUndefined();
    expect(checkProposal(100, 0, target)).toBeUndefined();
  });
});

describe('de bron van een training en het doel uit de template', () => {
  it('MacroFactor, Forge, en de rest telt niet', () => {
    expect(logOrigin({ source: 'macrofactor' })).toBe('macrofactor');
    expect(logOrigin({ source: 'manual' })).toBe('forge');
    expect(logOrigin({ source: 'garmin' })).toBeUndefined();
  });
  it('de bron volgt wie de sets maakte, ook na een overname door MacroFactor', () => {
    const base = { at: '2026-10-22T08:00:00.000Z', values: {} };
    // MacroFactor nam alleen de duur over: de sets zijn nog van Forge.
    const durationOnly = { source: 'macrofactor' as const, manualMeasured: { ...base, strength: { workoutId: 'w1', tied: { source: 'manual' as const } } } };
    expect(logOrigin(durationOnly)).toBe('forge');
    // MacroFactor verving de sets.
    const replaced = { source: 'macrofactor' as const, manualMeasured: { ...base, strength: { workoutId: 'w1', strengthData: null, tied: { source: 'manual' as const } } } };
    expect(logOrigin(replaced)).toBe('macrofactor');
    // Een log van het horloge waar MacroFactor niets aan verving, telt niet.
    expect(logOrigin({ source: 'garmin', manualMeasured: { ...base, strength: { workoutId: 'w1' } } })).toBeUndefined();
  });
  it('na een echte overname en restoreManual is het weer de eerste bron', () => {
    const { templates } = buildDefaultProgramData();
    const workout = readMacroFactorCsv(workoutCsv).workouts.find((w) => w.name === 'Lower A')!;
    const mine: SessionLog = {
      id: 'log_1', plannedSessionId: 'p_la', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
      variant: 'full', durationMinutes: 75, source: 'manual',
      strengthData: [{ exerciseId: 'back-squat', exerciseName: 'Squat', sets: [{ reps: 5, weightKg: 90, rir: 2 }] }],
    };
    expect(logOrigin(mine)).toBe('forge');
    const taken = applyStrengthTakeover(mine, workout, templates.find((t) => t.id === 'tpl_lower_a')!, new Date('2026-10-22T08:00:00.000Z'));
    expect(taken.source).toBe('macrofactor');
    expect(logOrigin(taken)).toBe('macrofactor');
    expect(logOrigin(restoreManual(taken))).toBe('forge');
  });
  it('een bereik met RPE wordt een RIR', () => {
    expect(targetOfSlot({ reps: '8-10', rpe: 8 })).toEqual({ low: 8, high: 10, rir: 2 });
    expect(targetOfSlot({ reps: '6' })).toEqual({ low: 6, high: 6 });
    expect(targetOfSlot({ reps: '45 sec' })).toBeUndefined();
    expect(targetOfSlot(undefined)).toBeUndefined();
  });
  it('een programma geeft het doel van de eerste set die niet tot falen is', () => {
    expect(targetOfSlot({ reps: '8', setTargets: [{ repsLow: 5, repsHigh: 7, rir: 3, failure: true }, { repsLow: 9, repsHigh: 11, rir: 2 }] })).toEqual({ low: 9, high: 11, rir: 2 });
  });
});

describe('de totalen', () => {
  const side = (hit: boolean, deviation = 0) => ({ hit, deviation });
  const rows = [
    { date: '2026-10-20', check: checkRow('macrofactor', target, side(true, 0), side(false, -2)) },
    { date: '2026-10-26', check: checkRow('macrofactor', target, side(true, 1), side(true, -1)) },
    { date: '2026-10-27', check: checkRow('macrofactor', target, side(false, 3), side(true, 0)) },
    { date: '2026-11-28', check: checkRow('forge', target, side(true, 0), undefined, true) },
    { date: '2026-10-29', check: checkRow('macrofactor', target, undefined, side(true)) },
  ];
  it('telt per kant raak en totaal, met de gemiddelde afwijking', () => {
    const t = totalsOf(rows);
    expect(t.macrofactor.did).toEqual({ hit: 2, total: 3, meanDeviation: 1.3 });
    expect(t.macrofactor.ascend).toEqual({ hit: 2, total: 3, meanDeviation: -1 });
    expect(t.forge.ascend).toEqual({ hit: 1, total: 1, meanDeviation: 0 });
  });
  it('de startdatum zet de laatste weken apart', () => {
    const s = summariseChecks(rows, '2026-10-24');
    expect(s.all.macrofactor.did.total).toBe(3);
    expect(s.since.macrofactor.did.total).toBe(2);
  });
  it('woorden', () => {
    expect(percent({ hit: 2, total: 3 })).toBe(67);
    expect(percent({ hit: 0, total: 0 })).toBeUndefined();
    expect(biasWord({ hit: 1, total: 2, meanDeviation: -1 })).toBe('eerder te zwaar');
    expect(biasWord({ hit: 1, total: 2, meanDeviation: 0.8 })).toBe('eerder te licht');
    expect(biasWord({ hit: 1, total: 2, meanDeviation: 0.2 })).toBeUndefined();
    expect(checkLines(totalsOf(rows))).toEqual({ macrofactor: 'Raak: MacroFactor 67%, ASCEND 67%', forge: 'Raak in Forge: ASCEND 100%' });
    expect(checkLines(totalsOf([]))).toEqual({});
  });
});

describe('op nagemaakte trainingen', () => {
  const { templates, program } = buildDefaultProgramData();
  const settings = resolveStrengthSettings(undefined);
  const logs = demoStrengthLogs();
  const bodyKg = demoWeights[0].kg;
  const deps = { logs, templates, program, bodyKg };
  const histories = exerciseHistories(logs.filter((l) => l.type === 'strength'), templates, deps);

  it('elke rij met een oordeel heeft de bron van de training', () => {
    const rows = comparisonRows(histories, settings, bodyKg, templates);
    const checked = rows.filter((r) => r.check);
    expect(checked.length).toBeGreaterThan(0);
    expect(checked.every((r) => r.check!.origin === 'macrofactor')).toBe(true);
    const summary = checkSummary(rows, '2026-10-01');
    expect(summary.all.macrofactor.did.total).toBe(checked.length);
    expect(summary.since.macrofactor.did.total).toBeLessThan(summary.all.macrofactor.did.total);
  });

  it('een training die in Forge is gelogd telt apart van MacroFactor', () => {
    const forgeLogs = logs.map((l) => (l.type === 'strength' && l.completedDate >= '2026-10-12' ? { ...l, source: 'manual' as const, externalId: undefined } : l));
    const h = exerciseHistories(forgeLogs.filter((l) => l.type === 'strength'), templates, { ...deps, logs: forgeLogs });
    const summary = checkSummary(comparisonRows(h, settings, bodyKg, templates), '2026-10-12');
    expect(summary.since.forge.ascend.total + summary.since.forge.other.did.total).toBeGreaterThan(0);
    expect(summary.since.macrofactor.did.total).toBe(0);
    expect(summary.all.macrofactor.did.total).toBeGreaterThan(0);
  });
});

describe('dezelfde set aan beide kanten', () => {
  const base = buildDefaultProgramData();
  const settings = resolveStrengthSettings(undefined);
  const bodyKg = 80;
  const source = base.templates[0];
  const slot = (extra: Partial<ExercisePrescription> = {}) => ({ id: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: 3, reps: '8-10', rpe: 8, priority: 'core' as const, ...extra });
  const template = (exercise: ReturnType<typeof slot>): SessionTemplate => ({ ...source, id: 'tpl_test', name: 'Proef', exercises: [exercise] });
  const sets = (rows: [number, number, number][]) => rows.map(([reps, weightKg, rir]) => ({ reps, weightKg, rir }));
  const earlier: SessionLog[] = [0, 1, 2].map((i) => ({
    id: `e${i}`, templateId: 'tpl_test', type: 'strength', completedDate: `2026-09-0${1 + i * 2}`, completedAt: `2026-09-0${1 + i * 2}T18:00:00.000Z`,
    variant: 'custom', durationMinutes: 50, source: 'macrofactor', externalId: `e${i}`,
    strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: sets([[8, 60, 2], [8, 60, 2], [8, 60, 2]]) }],
  }));
  const last = (source_: 'macrofactor' | 'manual', rows: [number, number, number][], tpl: SessionTemplate) => {
    const log: SessionLog = {
      id: 'last', templateId: 'tpl_test', type: 'strength', completedDate: '2026-09-20', completedAt: '2026-09-20T18:00:00.000Z',
      variant: 'custom', durationMinutes: 50, source: source_, ...(source_ === 'macrofactor' ? { externalId: 'last' } : {}),
      strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: sets(rows) }],
    };
    const logs = [...earlier, log];
    const h = exerciseHistories(logs, [tpl], { logs, templates: [tpl], program: base.program, bodyKg });
    return comparisonRows(h, settings, bodyKg, [tpl]).filter((r) => r.logId === 'last');
  };
  const tpl = template(slot());
  // The proposal for the first set, to lift exactly that.
  const proposedKg = last('macrofactor', [[9, 60, 2]], tpl)[0].prescribedKg;

  it('hetzelfde gewicht aan beide kanten geeft hetzelfde oordeel', () => {
    const [row] = last('macrofactor', [[9, proposedKg, 2], [9, proposedKg, 2]], tpl);
    expect(row.actualKg).toBe(row.prescribedKg);
    expect(row.check!.did).toEqual({ hit: row.check!.ascend.hit, deviation: row.check!.ascend.deviation });
    expect(row.check!.ascend.measured).toBe(false);
  });

  it('een zwaarder gewicht dan voorgesteld geeft jouw kant een lagere afwijking (zwaarder) dan ASCEND', () => {
    const [row] = last('macrofactor', [[9, proposedKg + 20, 2]], tpl);
    expect(row.check!.did.deviation).toBeLessThan(row.check!.ascend.deviation);
  });

  it('een Forge-training met het voorgestelde gewicht is gemeten', () => {
    const [row] = last('manual', [[9, proposedKg, 2]], tpl);
    expect(row.check!.origin).toBe('forge');
    expect(row.check!.ascend.measured).toBe(true);
    expect(row.check!.ascend.hit).toBe(row.check!.did.hit);
    const sum = checkSummary([row], '2026-01-01');
    expect(sum.all.forge.ascend.total).toBe(1);
    expect(sum.all.forge.other.did.total).toBe(0);
  });

  it('een handgemaakte log met een heel ander gewicht is een schatting, geen meting', () => {
    const [row] = last('manual', [[9, proposedKg + 30, 2]], tpl);
    expect(row.check!.origin).toBe('forge');
    expect(row.check!.ascend.measured).toBe(false);
    const sum = checkSummary([row], '2026-01-01');
    expect(sum.all.forge.ascend.total).toBe(0);
    expect(sum.all.forge.other.did.total).toBe(1);
    expect(sum.all.forge.other.ascend.total).toBe(1);
    expect(checkLines(sum.all)).toEqual({});
  });

  it('een piramide: de eerste werkset, niet de zwaarste, tegen het voorstel voor set 1', () => {
    const [row] = last('macrofactor', [[8, 30, 5], [10, 60, 2], [8, 70, 2], [6, 80, 2]], tpl);
    // The warm-up-like first set is a work set here (no kind), so it is the first set.
    expect(row.actualKg).toBe(30);
    const pyramid = last('macrofactor', [[10, 50, 2], [8, 60, 2], [6, 70, 2]], tpl)[0];
    expect(pyramid.actualKg).toBe(50);
    expect(pyramid.prescribedKg).toBeGreaterThan(0);
    // The strength of the day is the best work set: 70 x (6 + 2).
    const strength = 70 * (1 + 8 / 30);
    const expected = checkProposal(strength, 50, { low: 8, high: 10, rir: 2 })!;
    expect(pyramid.check!.did).toEqual(expected);
  });

  it('opwarmsets tellen niet mee als eerste set', () => {
    const rows = [
      { reps: 8, weightKg: 20, kind: 'warmup' as const },
      { reps: 9, weightKg: 60, rir: 2 },
    ];
    const log: SessionLog = { ...earlier[0], id: 'last', completedDate: '2026-09-20', completedAt: '2026-09-20T18:00:00.000Z', strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: rows }] };
    const logs = [...earlier, log];
    const h = exerciseHistories(logs, [tpl], { logs, templates: [tpl], program: base.program, bodyKg });
    const row = comparisonRows(h, settings, bodyKg, [tpl]).find((r) => r.logId === 'last')!;
    expect(row.actualKg).toBe(60);
  });

  it('een topset met back-offs: de topset tegen het doel van de topset, de back-offs niet', () => {
    const topTemplate = template(slot({ setTargets: [{ repsLow: 4, repsHigh: 6, rir: 1 }, { repsLow: 8, repsHigh: 10, rir: 2 }, { repsLow: 8, repsHigh: 10, rir: 2 }] }));
    const [row] = last('macrofactor', [[5, 80, 1], [9, 65, 2], [9, 65, 2]], topTemplate);
    expect(row.actualKg).toBe(80);
    const strength = 80 * (1 + 6 / 30);
    expect(row.check!.did).toEqual(checkProposal(strength, 80, { low: 4, high: 6, rir: 1 }));
    expect(row.check!.target).toEqual({ low: 4, high: 6, rir: 1 });
  });

  it('een set tot falen aan het begin wordt overgeslagen: het doel hoort bij de eerste andere set', () => {
    const failFirst = template(slot({ setTargets: [{ repsLow: 9, repsHigh: 9, rir: 0, failure: true }, { repsLow: 8, repsHigh: 10, rir: 2 }, { repsLow: 8, repsHigh: 10, rir: 2 }] }));
    const [row] = last('macrofactor', [[10, 55, 0], [9, 62.5, 2], [9, 62.5, 2]], failFirst);
    expect(row.actualKg).toBe(62.5);
    expect(row.check!.target).toEqual({ low: 8, high: 10, rir: 2 });
  });
});

describe('de vingerafdruk van wat raak bepaalt', () => {
  const { templates, program } = buildDefaultProgramData();
  const logs = demoStrengthLogs();
  it('nieuwe lijsten met dezelfde inhoud geven dezelfde sleutel, een andere inhoud een andere', () => {
    const same = checkDataKey(logs, templates, program, 80);
    expect(checkDataKey(structuredClone(logs), structuredClone(templates), structuredClone(program), 80)).toBe(same);
    const changed = structuredClone(logs);
    changed[0].strengthData![0].sets.push({ reps: 5, weightKg: 50, rir: 2 });
    expect(checkDataKey(changed, templates, program, 80)).not.toBe(same);
    expect(checkDataKey(logs, templates, program, 81)).not.toBe(same);
  });
  it('een schakelaar van het scherm verandert de sleutel van het model niet, een gewichtskeuze wel', () => {
    const base = checkModelKey({ enabled: true });
    expect(checkModelKey({ enabled: true, showTrendLines: false, showComparison: true, restAuto: false })).toBe(base);
    expect(checkModelKey({ enabled: true, learnStacks: false })).not.toBe(base);
    expect(checkModelKey({ enabled: true, checkFrom: '2026-11-01' })).not.toBe(base);
  });
});
