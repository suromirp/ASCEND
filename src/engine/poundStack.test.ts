// Nagemaakte cijfers in de buurt van 3 november: een beenpers in ponden, ingevuld als 73, 104,4 en 95,3 kg
// (161, 230 en 210 lb), zonder gewichten in Mijn sportschool.
import { describe, expect, it } from 'vitest';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import { ownWeightsFor, withMachineSetup } from './machineWeights';
import { poundStackProposal, poundStackText } from './poundStack';
import { exerciseById } from '../data/exercises';
import { DEFAULT_PROFILE, resolveStrengthSettings } from './strengthSettings';

const row = (i: number, kg: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `p${i}`, kind: 'work', target: { weightKg: 75, repsLow: 10, repsHigh: 12, rir: 2 }, weightKg: kg, reps: 10, edited: true, done: true, ...over });
const press = (rows: WorkoutRow[], exerciseId = 'leg-press'): WorkoutExercise => ({ slot: 'lp', exerciseId, name: 'Beenpers', known: true, rows, restSec: 120, timed: false });

describe('een toestel in ponden', () => {
  it('73, 104,4 en 95,3 kg zijn ponden: voorstel om het toestel op te slaan als ponden per 10', () => {
    const p = poundStackProposal(press([row(0, 73), row(1, 104.4), row(2, 95.3)]), DEFAULT_PROFILE)!;
    expect(p.pounds).toEqual([161, 210, 230]);
    expect(p.range).toEqual({ startKg: 10, endKg: 300, stepKg: 10, unit: 'lb' });
    expect(poundStackText(p)).toBe('Dit toestel lijkt in ponden te werken: je vulde 161, 210 en 230 lb in. Opslaan als 10 tot 300 lb per 10?');
  });

  it('na opslaan past het voorschrift op het toestel: de gewichten zijn ponden', () => {
    const p = poundStackProposal(press([row(0, 73), row(1, 104.4), row(2, 95.3)]), DEFAULT_PROFILE)!;
    const saved = resolveStrengthSettings(withMachineSetup(undefined, 'leg-press', { ranges: [p.range] }));
    const list = ownWeightsFor(saved.profile, exerciseById('leg-press'))!;
    expect(list).toContain(95.3);
    expect(list).toContain(104.3);
  });

  it('kilo-gewichten, één los gewicht, een toestel met eigen gewichten of een stang geven geen voorstel', () => {
    expect(poundStackProposal(press([row(0, 70), row(1, 100), row(2, 95)]), DEFAULT_PROFILE)).toBeUndefined();
    expect(poundStackProposal(press([row(0, 104.4)]), DEFAULT_PROFILE)).toBeUndefined();
    const own = resolveStrengthSettings(withMachineSetup(undefined, 'leg-press', { list: [70, 80, 90] })).profile;
    expect(poundStackProposal(press([row(0, 73), row(1, 104.4), row(2, 95.3)]), own)).toBeUndefined();
    expect(poundStackProposal(press([row(0, 73), row(1, 104.4), row(2, 95.3)], 'back-squat'), DEFAULT_PROFILE)).toBeUndefined();
  });

  it('alleen wat je zelf invulde telt, niet het voorschrift', () => {
    const untouched = press([row(0, 73, { edited: false, done: false }), row(1, 104.4, { edited: false, done: false }), row(2, 95.3, { edited: false, done: false })]);
    expect(poundStackProposal(untouched, DEFAULT_PROFILE)).toBeUndefined();
  });
});
