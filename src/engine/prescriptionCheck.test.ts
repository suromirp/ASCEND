import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { biasWord, checkDone, checkProposal, checkRow, checkLines, logOrigin, percent, summariseChecks, targetOfSlot, totalsOf } from './prescriptionCheck';
import { checkSummary, comparisonRows, exerciseHistories } from './strengthHistory';
import { resolveStrengthSettings } from './strengthSettings';

const target = { low: 8, high: 10, rir: 2 };

describe('raak met wat je deed', () => {
  it('binnen het bereik en de RIR binnen 1 van het doel is raak', () => {
    expect(checkDone({ reps: 9, rir: 2 }, target)?.hit).toBe(true);
    expect(checkDone({ reps: 8, rir: 1 }, target)?.hit).toBe(true);
    expect(checkDone({ reps: 10, rir: 3 }, target)?.hit).toBe(true);
  });
  it('buiten het bereik of RIR ver van het doel is mis', () => {
    expect(checkDone({ reps: 7, rir: 2 }, target)?.hit).toBe(false);
    expect(checkDone({ reps: 11, rir: 2 }, target)?.hit).toBe(false);
    expect(checkDone({ reps: 9, rir: 0 }, target)?.hit).toBe(false);
    expect(checkDone({ reps: 9, rir: 4 }, target)?.hit).toBe(false);
  });
  it('zonder RIR geen oordeel', () => {
    expect(checkDone({ reps: 9 }, target)).toBeUndefined();
  });
  it('de afwijking: negatief is te zwaar, positief te licht', () => {
    expect(checkDone({ reps: 6, rir: 2 }, target)!.deviation).toBe(-3);
    expect(checkDone({ reps: 12, rir: 2 }, target)!.deviation).toBe(3);
  });
});

describe('raak met het voorstel van ASCEND, achteraf', () => {
  it('het gewicht dat die dag paste is raak', () => {
    // 11 tot falen min RIR 2 is 9 herhalingen, midden in het bereik.
    expect(checkProposal(100, 100 / (1 + 11 / 30), target)?.hit).toBe(true);
  });
  it('met 1 herhaling speling', () => {
    expect(checkProposal(100, 100 / (1 + 10 / 30), target)?.hit).toBe(true);
    expect(checkProposal(100, 100 / (1 + 9 / 30), target)?.hit).toBe(true);
    expect(checkProposal(100, 100 / (1 + 8 / 30), target)?.hit).toBe(false);
    expect(checkProposal(100, 100 / (1 + 15 / 30), target)?.hit).toBe(false);
  });
  it('te zwaar geeft een negatieve afwijking, te licht een positieve', () => {
    expect(checkProposal(100, 90, target)!.deviation).toBeLessThan(0);
    expect(checkProposal(100, 50, target)!.deviation).toBeGreaterThan(0);
    expect(checkProposal(100, 50, target)!.hit).toBe(false);
  });
  it('zonder kracht of last geen oordeel', () => {
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
    { date: '2026-11-28', check: checkRow('forge', target, side(true, 0), undefined) },
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

  it('een training die in Forge is gelogd telt als gemeten, apart van MacroFactor', () => {
    const forgeLogs = logs.map((l) => (l.type === 'strength' && l.completedDate >= '2026-10-12' ? { ...l, source: 'manual' as const, externalId: undefined } : l));
    const h = exerciseHistories(forgeLogs.filter((l) => l.type === 'strength'), templates, { ...deps, logs: forgeLogs });
    const summary = checkSummary(comparisonRows(h, settings, bodyKg, templates), '2026-10-12');
    expect(summary.since.forge.ascend.total).toBeGreaterThan(0);
    expect(summary.since.macrofactor.did.total).toBe(0);
    expect(summary.all.macrofactor.did.total).toBeGreaterThan(0);
  });
});
