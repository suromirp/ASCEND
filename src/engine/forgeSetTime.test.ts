import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExercisePrescription } from '../models/training';
import type { SessionLog } from '../models/training';
import { migrateLogSetTimes } from '../storage/migrations';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { planWorkout, tickAllRows, tickRow, toStrengthData, type PlanContext } from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const ctx = (): PlanContext => ({ logs: demoStrengthLogs(), templates, program, bodyKg: demoWeights[0].kg, settings, date: '2026-10-22', modelOn: true });
const slot: ExercisePrescription = { id: 'lat-pulldown', exerciseName: 'Cable Lat Pulldown', sets: 3, reps: '8-10', priority: 'core' };

const T = Date.UTC(2026, 9, 29, 10, 30, 0);

describe('de tijd van een set', () => {
  it('geeft een afgevinkte rij het tijdstip van afvinken', () => {
    const w = planWorkout([slot], ctx());
    const id = w[0].rows[0].id;
    const ticked = tickRow(w, w[0].slot, id, T).workout;
    expect(ticked[0].rows[0].doneAt).toBe(T);
    expect(ticked[0].rows[1].doneAt).toBeUndefined();
  });

  it('haalt het tijdstip weg bij ongedaan maken', () => {
    const w = planWorkout([slot], ctx());
    const id = w[0].rows[0].id;
    const on = tickRow(w, w[0].slot, id, T).workout;
    const off = tickRow(on, w[0].slot, id, T + 1000).workout;
    expect(off[0].rows[0].done).toBe(false);
    expect('doneAt' in off[0].rows[0]).toBe(false);
  });

  it('alles tegelijk afvinken en weer terug werkt hetzelfde', () => {
    const w = planWorkout([slot], ctx());
    const on = tickAllRows(w, w[0].slot, T).workout;
    expect(on[0].rows.every((r) => r.doneAt === T)).toBe(true);
    const off = tickAllRows(on, w[0].slot, T + 5).workout;
    expect(off[0].rows.every((r) => !('doneAt' in r))).toBe(true);
  });

  it('komt als ISO-tijd op de log, alleen bij wat is afgevinkt', () => {
    const w = planWorkout([slot], ctx());
    const ticked = tickRow(w, w[0].slot, w[0].rows[0].id, T).workout;
    const data = toStrengthData(ticked)!;
    expect(data[0].sets[0].at).toBe(new Date(T).toISOString());
  });

  it('een rij zonder tijd (oud concept) geeft een set zonder at', () => {
    const w = planWorkout([slot], ctx());
    const ticked = tickRow(w, w[0].slot, w[0].rows[0].id, T).workout;
    const old = ticked.map((e) => ({ ...e, rows: e.rows.map(({ doneAt: _t, ...r }) => (void _t, r)) }));
    expect(toStrengthData(old)![0].sets[0].at).toBeUndefined();
  });
});

describe('migrateLogSetTimes', () => {
  const log = (at: unknown): SessionLog =>
    ({ id: 'l1', strengthData: [{ exerciseId: 'x', exerciseName: 'X', sets: [{ reps: 8, weightKg: 40, at }] }] }) as unknown as SessionLog;

  it('houdt een geldige ISO-tijd', () => {
    const l = log('2026-10-29T10:30:00.000Z');
    expect(migrateLogSetTimes(l)).toBe(l);
  });
  it('laat een beschadigde tijd vallen en houdt de set', () => {
    for (const bad of ['gisteren', 12345, '2026-13-45T99:00:00Z', null]) {
      const out = migrateLogSetTimes(log(bad));
      expect(out.strengthData![0].sets[0]).toEqual({ reps: 8, weightKg: 40 });
    }
  });
  it('leest ook de bewaarde sets van manualMeasured.strength', () => {
    const l = {
      id: 'l4',
      manualMeasured: { strength: { strengthData: [{ exerciseId: 'x', exerciseName: 'X', sets: [{ reps: 8, at: 'nu' }, { reps: 8, at: '2026-10-29T10:30:00Z' }] }] } },
    } as unknown as SessionLog;
    const out = migrateLogSetTimes(l);
    expect(out.manualMeasured!.strength!.strengthData![0].sets).toEqual([{ reps: 8 }, { reps: 8, at: '2026-10-29T10:30:00Z' }]);
  });
  it('een oude log zonder at blijft zoals hij is', () => {
    const l = { id: 'l2', strengthData: [{ exerciseId: 'x', exerciseName: 'X', sets: [{ reps: 5 }] }] } as unknown as SessionLog;
    expect(migrateLogSetTimes(l)).toBe(l);
    const none = { id: 'l3' } as unknown as SessionLog;
    expect(migrateLogSetTimes(none)).toBe(none);
  });
});
