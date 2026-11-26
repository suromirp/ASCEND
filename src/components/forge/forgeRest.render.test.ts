import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseBlock } from './ExerciseBlock';
import { prescriptionLine, type BlockActions } from './forgeWorkoutHelpers';
import { resolveStrengthSettings } from '../../engine/strengthSettings';
import type { WorkoutExercise, WorkoutRow } from '../../engine/forgeWorkout';
import menusSource from './ForgeMenus.tsx?raw';
import blockSource from './ExerciseBlock.tsx?raw';

vi.mock('../motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../ExerciseArtButton', () => ({ ExerciseArtButton: () => null }));

// node:fs samengesteld omdat het project geen Node-typen meldt (zoals watch/watch.test.ts).
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };
const cssSource = nodeFs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

// Besluit 2026-11-26-forge-herinrichting-rest, echt gerenderd zonder DOM. Nagemaakte training.
const profile = resolveStrengthSettings(undefined).profile;
const act = new Proxy({}, { get: () => () => undefined }) as BlockActions;
const row = (i: number, kg: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `r${i}`, kind: 'work', target: { weightKg: kg, repsLow: 6, repsHigh: 8, rir: 2 }, weightKg: kg, reps: 6, done: false, ...over });
const bench = (rows: WorkoutRow[]): WorkoutExercise => ({ slot: 'bp', exerciseId: 'bench-press', name: 'Barbell Bench Press', known: true, rows, restSec: 180, timed: false });
const block = (ex: WorkoutExercise, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(ExerciseBlock, { ex, first: true, readOnly: false, field: null, selected: false, folded: false, profile, showPlates: false, rirAsValue: false, swipeOn: false, act, ...extra }));

describe('kolom Voorschrift weg', () => {
  it('de tweede kolom is altijd Vorige keer, zonder wisselknop', () => {
    const html = block(bench([row(0, 60)]));
    expect(html).toContain('>Vorige keer<');
    expect(html).not.toContain('Toon vorige keer');
    expect(html).not.toContain('overnemen, set');
  });
  it('het voorschrift staat als één regel onder de naam, met de rust op een eigen regel', () => {
    const html = block(bench([row(0, 60), row(1, 60), row(2, 60), row(3, 60)]));
    expect(html).toContain('4 sets van 6 tot 8 met 2 over');
    expect(html).toContain('Rust 3:00 tussen sets');
    expect(html).not.toContain('0 van 4 sets');
  });
  it('de regel noemt een afwijkende laatste set en slaat eigen sets en een oefening op tijd over', () => {
    const last = row(2, 60, { target: { weightKg: 60, repsLow: 9, repsHigh: 9, failure: true } });
    expect(prescriptionLine(bench([row(0, 60), row(1, 60), last]))).toBe('2 sets van 6 tot 8 met 2 over, dan 1 set van 9+ tot falen');
    expect(prescriptionLine(bench([row(0, 60), row(1, 60), row(2, 60, { id: 'x:a1' })]))).toBe('2 sets van 6 tot 8 met 2 over');
    expect(prescriptionLine({ ...bench([row(0, 60)]), timed: true })).toBeUndefined();
  });
  it('het veld column van een concept van eerder wordt niet meer gelezen', () => {
    expect(blockSource).not.toContain("column === 'previous'");
    expect(cssSource).toContain('.forge-grid');
  });
});

describe('Kleiner maken en Afronden op één plek', () => {
  it('het menu van de training heeft ze niet meer, de kop wel', () => {
    expect(menusSource).not.toContain('title="Kleiner maken"');
    expect(menusSource).not.toContain('title="Afronden"');
  });
});

describe('de naam van een oefening in Marcellus', () => {
  it('staat in de display-letter, niet vet, en breekt af in plaats van weg te vallen', () => {
    const html = block(bench([row(0, 60)]));
    const naam = /<span data-testid="forge-naam" class="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(naam).toContain('font-display');
    expect(naam).not.toContain('font-semibold');
    expect(naam).toContain('break-words');
  });
});

describe('het blad Set zichtbaar', () => {
  it('het setnummer is een knop van 44 bij 44 die het blad opent, in de kolom van 36 px', () => {
    const html = block(bench([row(0, 60)]));
    const knop = /<button[^>]*aria-label="Set 1, opent het blad Set"[^>]*>/.exec(html)?.[0] ?? '';
    expect(knop).toMatch(/\bh-11\b/);
    expect(knop).toMatch(/\bw-11\b/);
    expect(knop).toContain('data-sheet-from');
    expect(knop).toContain('data-swipe-ok');
    // 44 min 2 keer de negatieve marge (-mx-1 = 4 px) = 36 px in de rij.
    expect(knop).toMatch(/-mx-1\b/);
    expect(cssSource).toMatch(/\.forge-grid \{[^}]*grid-template-columns: 36px /);
  });
  it('in een training om mee te kijken is het nummer geen werkende knop', () => {
    expect(block(bench([row(0, 60)]), { readOnly: true })).toMatch(/aria-label="Set 1, opent het blad Set"[^>]*disabled/);
  });
});

describe('de schijven onder een set', () => {
  it('onder elke werkset als tekst, zonder knop', () => {
    const html = block(bench([row(0, 60), row(1, 60), row(2, 62.5)]), { showPlates: true });
    expect(html.match(/data-testid="forge-schijven"/g)).toHaveLength(3);
    expect(html).not.toContain('Schijven: per kant');
  });
});
