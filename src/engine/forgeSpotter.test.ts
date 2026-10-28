import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExercisePrescription } from '../models/training';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { planWorkout, tickRow, toStrengthData, updateRow, type PlanContext, type WorkoutExercise } from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const profile = settings.profile;
const logs = demoStrengthLogs();
const BODY = demoWeights[0].kg;

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ logs, templates, program, bodyKg: BODY, settings, date: '2026-10-22', modelOn: true, ...over });
const slot = (id: string, exerciseName: string, sets: number, reps: string, extra: Partial<ExercisePrescription> = {}): ExercisePrescription => ({ id, exerciseName, sets, reps, priority: 'core', ...extra });

describe('zonder spotter in het voorschrift', () => {
  const failing = (id: string, name: string) => slot(id, name, 3, '6-8', { rpe: 10 });
  const rirs = (ex: WorkoutExercise) => ex.rows.filter((r) => r.kind === 'work').map((r) => r.target.rir);

  it('schrijft bij bankdrukken met een stang minstens 1 over voor en markeert de sets', () => {
    const [ex] = planWorkout([failing('bench-press', 'Barbell Bench Press')], ctx());
    expect(rirs(ex).every((r) => r !== undefined && r >= 1)).toBe(true);
    expect(ex.rows.filter((r) => r.kind === 'work').every((r) => r.target.spotter)).toBe(true);
  });

  it('laat een toestel met 0 over zoals het is', () => {
    const [ex] = planWorkout([failing('lat-pulldown', 'Cable Lat Pulldown')], ctx());
    expect(rirs(ex).every((r) => r === 0)).toBe(true);
    expect(ex.rows.some((r) => r.target.spotter)).toBe(false);
  });

  it('met veiligheidsarmen in de sportschool mag het 0 zijn', () => {
    const safe = { ...settings, profile: { ...profile, spotterRack: true } };
    const [ex] = planWorkout([failing('bench-press', 'Barbell Bench Press')], ctx({ settings: safe }));
    expect(rirs(ex).every((r) => r === 0)).toBe(true);
    expect(ex.rows.some((r) => r.target.spotter)).toBe(false);
  });

  it('met de instelling uit mag het ook 0 zijn', () => {
    const [ex] = planWorkout([failing('bench-press', 'Barbell Bench Press')], ctx({ settings: { ...settings, noSpotter: false } }));
    expect(rirs(ex).every((r) => r === 0)).toBe(true);
  });

  it('een set met al 2 over krijgt geen teken', () => {
    const [ex] = planWorkout([slot('bench-press', 'Barbell Bench Press', 3, '6-8', { rpe: 8 })], ctx());
    expect(ex.rows.some((r) => r.target.spotter)).toBe(false);
  });

  it('blokkeert niets: een zelf ingevulde 0 blijft 0 in het log', () => {
    const [ex] = planWorkout([failing('bench-press', 'Barbell Bench Press')], ctx());
    const first = ex.rows.find((r) => r.kind === 'work')!;
    const typed = updateRow(ex, first.id, { rir: 0 });
    const ticked = tickRow([typed], typed.slot, first.id).workout;
    const data = toStrengthData(ticked)!;
    expect(data[0].sets[0].rir).toBe(0);
    expect(data[0].sets[0].rirAssumed).toBeUndefined();
  });
});
