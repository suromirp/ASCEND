import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseBlock } from './ExerciseBlock';
import { OverTimeNote } from './ForgeTimers';
import { resolveStrengthSettings } from '../../engine/strengthSettings';
import type { WorkoutExercise, WorkoutRow } from '../../engine/forgeWorkout';
import type { BlockActions } from './forgeWorkoutHelpers';
import type { ExercisePriority } from '../../models/training';

vi.mock('../motion', () => ({ useMotionMode: () => 'full' }));
// De knop met de tekening leest de app; hier staat hij er niet.
vi.mock('../ExerciseArtButton', () => ({ ExerciseArtButton: () => null }));

// Besluit 2026-11-11-forge-kern-zichtbaar, echt gerenderd zonder DOM. Nagemaakte training.
const SOURCES = import.meta.glob<string>(['./*.tsx'], { query: '?raw', import: 'default', eager: true });
const profile = resolveStrengthSettings(undefined).profile;
const act = new Proxy({}, { get: () => () => undefined }) as BlockActions;
const row = (i: number, kg: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `r${i}`, kind: 'work', target: { weightKg: kg, repsLow: 5, repsHigh: 5, rir: 2 }, weightKg: kg, reps: 5, done: false, ...over });
const squat = (rows: WorkoutRow[]): WorkoutExercise => ({ slot: 'sq', exerciseId: 'back-squat', name: 'Back Squat', known: true, rows, restSec: 180, timed: false });

function block(ex: WorkoutExercise, extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(createElement(ExerciseBlock, {
    ex, first: true, readOnly: false, column: 'target', field: null, selected: false, folded: false, profile, showPlates: false, rirAsValue: false, swipeOn: false, act, ...extra,
  }));
}

describe('de rol bij de oefening', () => {
  it('staat vooraan in de regel onder de naam, één keer', () => {
    const html = block(squat([row(0, 60)]), { role: 'Kern' });
    expect(html).toContain('data-testid="forge-rol">Kern · </span>');
    expect(html.match(/forge-rol/g)).toHaveLength(1);
  });
  it('de rol komt uit roleLabel in ForgeWorkout, nergens een eigen lijst met rolnamen in een component', () => {
    expect(SOURCES['./ForgeWorkout.tsx']).toContain('role={roleLabel(priorityOf(ex.slot))}');
    for (const [file, src] of Object.entries(SOURCES)) expect(src, file).not.toMatch(/'Bijwerk'|"Bijwerk"/);
  });
});

describe('schijven per set', () => {
  it('standaard uit: geen schijvenregel en geen lege regel onder een set die past', () => {
    const html = block(squat([row(0, 60), row(1, 60)]));
    expect(html).not.toContain('per kant');
    expect(html).not.toContain('Schijven:');
    expect(html).not.toContain('ml-9 h-5');
  });
  it('aan: per kant onder elke werkset', () => {
    const html = block(squat([row(0, 60), row(1, 60)]), { showPlates: true });
    expect(html.match(/per kant/g)!.length).toBeGreaterThanOrEqual(2);
  });
  it('uit: dat een gewicht niet precies past staat er wel, alleen bij die set', () => {
    const html = block(squat([row(0, 60), row(1, 60.3)]));
    expect(html.match(/>kan niet precies/g)).toHaveLength(1);
    expect(html).not.toMatch(/>per kant/);
    expect(html.match(/ml-9 h-5/g)).toHaveLength(1);
  });
});

describe('Hoeveel over? met het doel voorgekozen', () => {
  it('het doel staat gedempt voorgekozen, de andere keuzes gewoon', () => {
    const html = block(squat([row(0, 60, { done: true, rir: 2, rirAssumed: true }), row(1, 60)]), { quickRirRow: 'r0' });
    expect(html).toContain('2 over, set 1, het doel, staat al');
    expect(html.match(/data-aim="true"/g)).toHaveLength(1);
  });
});

describe('de regel onder de klok', () => {
  const prio: Record<string, ExercisePriority> = { a: 'core', c: 'accessory' };
  const exercises = [{ slot: 'a', rows: [{ kind: 'work', done: true }] }, { slot: 'c', rows: [{ kind: 'work', done: false }] }];
  const note = (startedAt: number, pauses: { from: number; to?: number }[] = []) =>
    renderToStaticMarkup(createElement(OverTimeNote, { startedAt, pauses, reference: 60, exercises, priorityOf: (s: string) => prio[s] }));
  const min = 60_000;

  it('verschijnt na de referentie op actieve tijd, met een verschijning die in Rustig en Uit stilstaat', () => {
    const html = note(Date.now() - 64 * min);
    expect(html).toContain('Je zit op 64 minuten. Wat nog komt is bijwerk; stoppen kan.');
    expect(html).toContain('mx-row-in');
    expect(html).not.toMatch(/animate-/);
  });
  it('een pauze over de referentie heen: de regel komt pas op actieve tijd', () => {
    const now = Date.now();
    expect(note(now - 64 * min, [{ from: now - 30 * min, to: now - 20 * min }])).toBe('');
    expect(note(now - 74 * min, [{ from: now - 30 * min, to: now - 20 * min }])).toContain('Je zit op 64 minuten.');
  });
  it('tijdens een pauze staat hij er niet', () => {
    const now = Date.now();
    expect(note(now - 90 * min, [{ from: now - 5 * min }])).toBe('');
  });
  it('niet begonnen: niets', () => {
    expect(renderToStaticMarkup(createElement(OverTimeNote, { startedAt: null, pauses: [], reference: 60, exercises, priorityOf: (s: string) => prio[s] }))).toBe('');
  });
  it('de kop toont hem niet bij alleen kijken, readOnly of pauze', () => {
    expect(SOURCES['./ForgeHeader.tsx']).toContain('{!readOnly && !preview && !paused && <OverTimeNote');
  });
});
