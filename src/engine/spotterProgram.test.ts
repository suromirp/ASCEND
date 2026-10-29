import { describe, expect, it } from 'vitest';
import type { SessionLog, SessionTemplate } from '../models/training';
import { resumeDraft } from './forgeInput';
import { planWorkout, repsText, type PlanContext } from './forgeWorkout';
import { programExercisesFor, setsText } from './macrofactorProgram';
import { resolveStrengthSettings } from './strengthSettings';
import type { StoredStrengthProgram } from './strengthProgramStore';

// Een programma uit MacroFactor met een bankdrukset "7+" tot falen, zoals de eigenaar zag
// (nagemaakt). Zonder spotter (standaard aan) hoort dat "7+ met 1 over" te worden, ook in een concept
// dat je opende voor de regel er was en nog niet begon.
const program: StoredStrengthProgram = {
  name: 'Nagemaakt programma',
  startMonday: '2026-09-28',
  cycleCount: 2,
  importedOn: '2026-09-27',
  days: [
    {
      templateId: 'tpl_boven',
      name: 'Workout A',
      cycles: [
        [
          { name: 'Barbell Bench Press', sets: [{ repsLow: 7, repsHigh: 7, rir: 0, failure: true }, { repsLow: 7, repsHigh: 9, rir: 2 }, { repsLow: 7, repsHigh: 9, rir: 2 }] },
          { name: 'Lat Pulldown', sets: [{ repsLow: 9, repsHigh: 9, rir: 0, failure: true }, { repsLow: 9, repsHigh: 11, rir: 1 }] },
        ],
        [
          { name: 'Barbell Bench Press', sets: [{ repsLow: 7, repsHigh: 7, rir: 0, failure: true }, { repsLow: 7, repsHigh: 9, rir: 2 }, { repsLow: 7, repsHigh: 9, rir: 2 }] },
          { name: 'Lat Pulldown', sets: [{ repsLow: 9, repsHigh: 9, rir: 0, failure: true }, { repsLow: 9, repsHigh: 11, rir: 1 }] },
        ],
      ],
    },
  ],
};

const template = { id: 'tpl_boven', name: 'Bovenlichaam', type: 'strength', exercises: [] } as unknown as SessionTemplate;

const log = (date: string, kg: number): SessionLog =>
  ({
    id: `log-${date}`,
    templateId: 'tpl_boven',
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T18:00:00.000Z`,
    variant: 'full',
    strengthData: [
      { exerciseId: 'mf_barbell_bench_press', exerciseName: 'Barbell Bench Press', sets: [{ reps: 8, weightKg: kg, rir: 1 }, { reps: 8, weightKg: kg - 5, rir: 2 }, { reps: 8, weightKg: kg - 5, rir: 2 }] },
      { exerciseId: 'mf_lat_pulldown', exerciseName: 'Lat Pulldown', sets: [{ reps: 10, weightKg: 50, rir: 1 }, { reps: 10, weightKg: 50, rir: 1 }] },
    ],
  }) as unknown as SessionLog;

const date = '2026-10-29';
const settings = resolveStrengthSettings({ program } as never);
const ctx: PlanContext = { logs: [log('2026-10-13', 65), log('2026-10-20', 67.5)], templates: [template], settings, date, modelOn: true };
const slots = programExercisesFor(program, 'tpl_boven', date)!;

describe('Zonder spotter bij een set "7+" uit een programma', () => {
  it('set 1 van de bankdrukoefening vraagt 7+ met 1 over, niet tot falen', () => {
    const bench = planWorkout(slots, ctx)[0];
    const first = bench.rows.filter((r) => r.kind === 'work')[0];
    expect(first.target.rir).toBe(1);
    expect(first.target.failure).toBeUndefined();
    expect(first.target.spotter).toBe(true);
    expect(repsText(first.target)).toBe('7+');
    expect(bench.reason ?? '').not.toContain('tot falen');
    expect(bench.reason).toContain('7+ met 1 over');
  });
  it('een oefening zonder risico houdt haar set tot falen', () => {
    const pull = planWorkout(slots, ctx)[1];
    expect(pull.rows.filter((r) => r.kind === 'work')[0].target.failure).toBe(true);
  });
  it('de woorden van een open set met reserve', () => {
    expect(setsText([{ repsLow: 7, repsHigh: 7, rir: 1, open: true }, { repsLow: 7, repsHigh: 9, rir: 2 }])).toBe('2 sets: 7+ met 1 over, 7-9 met 2 over');
  });
  it('een concept van voor de regel dat je nog niet begon, krijgt het voorschrift van nu', () => {
    const fresh = planWorkout(slots, ctx);
    // Het oude concept: dezelfde oefening, set 1 nog tot falen met 0 over, niets aangeraakt.
    const old = fresh.map((e, i) =>
      i === 0
        ? { ...e, reason: 'Je programma vraagt nu 3 sets: 7+ tot falen, 7-9 met 2 over, 7-9 met 2 over.', rows: e.rows.map((r) => (r.kind === 'work' && r.target.spotter ? { ...r, target: { repsLow: 7, repsHigh: 7, rir: 0, failure: true, weightKg: r.target.weightKg } } : r)) }
        : e,
    );
    const resumed = resumeDraft(old, false, false, fresh);
    const first = resumed[0].rows.filter((r) => r.kind === 'work')[0];
    expect(first.target.rir).toBe(1);
    expect(resumed[0].reason ?? '').not.toContain('tot falen');
  });
  it('wat je in het concept al aanraakte blijft staan', () => {
    const fresh = planWorkout(slots, ctx);
    const old = fresh.map((e, i) => (i === 0 ? { ...e, rows: e.rows.map((r, k) => (k === 0 ? { ...r, weightKg: 40, edited: true } : r)) } : e));
    expect(resumeDraft(old, false, false, fresh)[0].rows[0].weightKg).toBe(40);
  });
});
