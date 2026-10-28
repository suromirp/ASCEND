import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog, SessionTemplate } from '../models/training';
import { checkProposal } from './prescriptionCheck';
import { comparisonRows, exerciseHistories } from './strengthHistory';
import { resolveStrengthSettings } from './strengthSettings';

// Raak en de bewuste 1 zonder spotter: MacroFactor schrijft 0 over voor, Forge 1.
describe('raak met een bewuste 1 zonder spotter', () => {
  const base = buildDefaultProgramData();
  const bodyKg = 80;
  const tpl: SessionTemplate = {
    ...base.templates[0],
    id: 'tpl_spot',
    name: 'Proef',
    exercises: [{ id: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: 3, reps: '8-10', rpe: 10, priority: 'core' }],
  };
  const sets = (rows: [number, number, number][]) => rows.map(([reps, weightKg, rir]) => ({ reps, weightKg, rir }));
  const log = (id: string, date: string, rows: [number, number, number][]): SessionLog => ({
    id, templateId: 'tpl_spot', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`,
    variant: 'custom', durationMinutes: 50, source: 'macrofactor', externalId: id,
    strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: sets(rows) }],
  });
  const earlier = [0, 1, 2].map((i) => log(`e${i}`, `2026-09-0${1 + i * 2}`, [[8, 60, 1], [8, 60, 1], [8, 60, 1]]));
  const rowFor = (spotter: boolean, done: [number, number, number][]) => {
    const settings = { ...resolveStrengthSettings(undefined), noSpotter: spotter };
    const logs = [...earlier, log('last', '2026-09-20', done)];
    const h = exerciseHistories(logs, [tpl], { logs, templates: [tpl], program: base.program, bodyKg });
    return comparisonRows(h, settings, bodyKg, [tpl]).find((r) => r.logId === 'last')!;
  };

  it('het voorstel van ASCEND wordt aan zijn eigen doel van 1 over getoetst', () => {
    const row = rowFor(true, [[9, 60, 1], [9, 60, 1]]);
    expect(row.check!.target.rir).toBe(1);
  });

  it('wat je zelf deed blijft getoetst aan de 0 over die de planning vroeg', () => {
    const row = rowFor(true, [[9, 60, 1], [9, 60, 1]]);
    // De kracht van die dag: 9 herhalingen met 1 over.
    const strength = 60 * (1 + 10 / 30);
    expect(row.check!.did).toEqual(checkProposal(strength, 60, { low: 8, high: 10, rir: 0 }));
  });

  it('zonder de instelling is alles zoals het was: één doel van 0 over aan beide kanten', () => {
    const row = rowFor(false, [[9, 60, 1], [9, 60, 1]]);
    expect(row.check!.target.rir).toBe(0);
    expect(row.prescribedKg).toBeGreaterThanOrEqual(rowFor(true, [[9, 60, 1], [9, 60, 1]]).prescribedKg);
  });

  it('het voorstel met 1 over is niet zwaarder dan het voorstel met 0 over', () => {
    expect(rowFor(true, [[9, 60, 1]]).prescribedKg).toBeLessThanOrEqual(rowFor(false, [[9, 60, 1]]).prescribedKg);
  });
});
