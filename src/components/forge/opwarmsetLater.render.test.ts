import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseBlock } from './ExerciseBlock';
import { resolveStrengthSettings } from '../../engine/strengthSettings';
import type { WorkoutExercise, WorkoutRow } from '../../engine/forgeWorkout';
import type { BlockActions } from './forgeWorkoutHelpers';

vi.mock('../motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../ExerciseArtButton', () => ({ ExerciseArtButton: () => null }));

// Besluit 2026-11-14-opwarmset-later, echt gerenderd zonder DOM. Nagemaakte training.
const profile = resolveStrengthSettings(undefined).profile;
const act = new Proxy({}, { get: () => () => undefined }) as BlockActions;
const warm = (over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: 'lp:w0', kind: 'warmup', target: { weightKg: 95, repsLow: 4, repsHigh: 4 }, weightKg: 95, reps: 4, done: false, ...over });
const work = (i: number): WorkoutRow => ({ id: `lp:s${i}`, kind: 'work', target: { weightKg: 140, repsLow: 6, repsHigh: 8, rir: 2 }, weightKg: 140, reps: 7, done: false });
const legPress = (rows: WorkoutRow[], warmFrom?: string): WorkoutExercise => ({ slot: 'lp', exerciseId: 'leg-press', name: 'Pin-Loaded Leg Press', known: true, rows, restSec: 150, timed: false, ...(warmFrom ? { warmFrom } : {}) });
const LINE = 'Je benen zijn warm van de Barbell Back Squat. Twijfel je over de stoel of het gewicht, doe hem dan.';

function block(ex: WorkoutExercise, readOnly = false, warmNow = true): string {
  return renderToStaticMarkup(createElement(ExerciseBlock, { ex, warmNow, first: false, readOnly, column: 'target', field: null, selected: false, folded: false, profile, showPlates: false, rirAsValue: false, swipeOn: false, act }));
}

describe('opwarmset later in het blok', () => {
  it('gedempt, met één zin onder de set, en het vinkje blijft een tikdoel', () => {
    const html = block(legPress([warm({ warmAlready: true }), work(0), work(1)], 'Barbell Back Squat'));
    expect(html).toContain('opacity:0.55');
    expect(html.match(new RegExp(LINE, 'g'))).toHaveLength(1);
    expect(html).toContain('aria-label="Set W gedaan"');
  });
  it('afgevinkt: gewoon gedaan, zonder zin', () => {
    const html = block(legPress([warm({ warmAlready: true, done: true }), work(0)], 'Barbell Back Squat'));
    expect(html).not.toContain('opacity:0.55');
    expect(html).not.toContain('Twijfel je over');
  });
  it('zonder warmFrom: de gewone opwarmset, niet gedempt en zonder zin', () => {
    const html = block(legPress([warm(), work(0)]));
    expect(html).toContain('opacity:0.78');
    expect(html).not.toContain('opacity:0.55');
    expect(html).not.toContain('Twijfel je over');
  });
  it('bron nog niet gedaan of geruild (warmNow uit): gewone opwarmset, zonder zin', () => {
    const html = block(legPress([warm({ warmAlready: true }), work(0)], 'Barbell Back Squat'), false, false);
    expect(html).toContain('opacity:0.78');
    expect(html).not.toContain('opacity:0.55');
    expect(html).not.toContain('Twijfel je over');
  });
  it('ForgeWorkout geeft warmNow uit de engine door', () => {
    const src = import.meta.glob<string>(['./ForgeWorkout.tsx'], { query: '?raw', import: 'default', eager: true })['./ForgeWorkout.tsx'];
    expect(src).toContain('warmNow={warmNow(workout, ex)}');
  });
  it('in het logboek (alleen lezen) geen zin', () => {
    expect(block(legPress([warm({ warmAlready: true }), work(0)], 'Barbell Back Squat'), true)).not.toContain('Twijfel je over');
  });
});
