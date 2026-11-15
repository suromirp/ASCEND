// Hutten, tent of beide (docs/beslissingen/2026-11-14-keuzes-avond.md). Nagemaakte doelen.
import { describe, it, expect } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import { goalKindName, journeyShelter, kindForShelter, packListNote, readShelter, SHELTER_ADVICE, shelterForKind, shelterOfGoal, withShelter } from './trekShelter';
import { resolvePackItems } from './packList';
import { readGoalDetails } from '../storage/migrations';

const trek = (extra: Partial<TrainingGoal> = {}): TrainingGoal => ({
  id: 'g1', name: 'Mijn lange tocht', requirements: [], status: 'active', targetDate: '2027-03-15', createdAt: '2026-11-16T07:30:00Z', updatedAt: '2026-11-16T07:30:00Z', ...extra,
} as TrainingGoal);

describe('waar je slaapt', () => {
  it('het advies is tent', () => {
    expect(SHELTER_ADVICE).toBe('tent');
    // Een hoofddoel zonder soort en zonder keuze krijgt het advies, niet stil hutten.
    expect(shelterOfGoal(trek(), true)).toBe('tent');
  });

  it('volgt de keuze op het doel, anders de soort', () => {
    expect(shelterOfGoal(trek({ details: { shelter: 'both' }, kind: 'trek_tent' }))).toBe('both');
    expect(shelterOfGoal(trek({ kind: 'trek_hut' }))).toBe('hut');
    expect(shelterOfGoal(trek({ kind: 'trek_tent' }))).toBe('tent');
  });

  it('beide rekent als tent, en een soort houdt beide vast', () => {
    expect(kindForShelter('both')).toBe('trek_tent');
    expect(kindForShelter('hut')).toBe('trek_hut');
    expect(shelterForKind('trek_tent', 'both')).toBe('both');
    expect(shelterForKind('trek_tent', 'hut')).toBe('tent');
    expect(shelterForKind('trek_hut', 'both')).toBe('hut');
  });

  it('leest alleen de drie waarden, en de opslag houdt beide', () => {
    expect(readShelter('both')).toBe('both');
    expect(readShelter('bivak')).toBeUndefined();
    expect(readGoalDetails({ shelter: 'both' })?.shelter).toBe('both');
    // Een oud doel blijft zoals het was.
    expect(readGoalDetails({ shelter: 'hut' })?.shelter).toBe('hut');
  });
});

describe('de doelkop volgt de keuze', () => {
  it('hutten, tent en beide', () => {
    expect(goalKindName(trek({ kind: 'trek_hut', details: { shelter: 'hut' } }), true)).toBe('Meerdaagse tocht met hutten');
    expect(goalKindName(trek({ kind: 'trek_tent', details: { shelter: 'tent' } }), true)).toBe('Meerdaagse tocht met tent');
    expect(goalKindName(trek({ kind: 'trek_tent', details: { shelter: 'both' } }), true)).toBe('Meerdaagse tocht met hutten en tent');
  });

  it('een ander doel houdt de naam van zijn soort', () => {
    expect(goalKindName(trek({ kind: 'run_race' }), false)).toBe('Hardloopwedstrijd');
  });

  it('een andere keuze zet soort en keuze samen', () => {
    const next = withShelter(trek({ kind: 'trek_hut', details: { shelter: 'hut', packKg: 12 } }), 'both', '2026-11-17T08:00:00Z');
    expect(next.kind).toBe('trek_tent');
    expect(next.details).toEqual({ shelter: 'both', packKg: 12, shelterChosen: true });
  });
});

describe('de tochtschermen lezen dezelfde keuze als de doelkop', () => {
  it('het hoofddoel met de ladder', () => {
    const goal = trek({ kind: 'trek_hut', details: { shelter: 'hut' } });
    expect(journeyShelter([goal], new Set(['g1']), '2026-11-16')).toBe('hut');
  });

  it('zonder tocht het advies', () => {
    expect(journeyShelter([], new Set(), '2026-11-16')).toBe('tent');
  });
});

describe('de paklijst', () => {
  it('van hut naar hut zonder tent, matje en kookspullen, met een lakenzak', () => {
    const ids = resolvePackItems(undefined, 'hut').map((i) => i.id);
    for (const id of ['tent', 'matje', 'kookset', 'gas', 'slaapzak']) expect(ids).not.toContain(id);
    expect(ids).toContain('lakenzak');
    expect(ids).toContain('filter');
  });

  it('met tent en bij beide de opzet met tent', () => {
    for (const s of ['tent', 'both'] as const) expect(resolvePackItems(undefined, s).map((i) => i.id)).toContain('tent');
  });

  it('een eigen lijst blijft je eigen lijst', () => {
    const own = { v: 1 as const, items: [{ id: 'x', group: 'overig' as const, name: 'Iets', grams: 10, have: true }] };
    expect(resolvePackItems(own, 'hut')).toEqual(own.items);
  });

  it('de regel past bij de keuze en de maand van vertrek', () => {
    expect(packListNote('tent', '2027-08-01')).toContain('zomer');
    expect(packListNote('tent', '2027-03-15')).toContain('Je vertrekt in maart');
    expect(packListNote('tent', '2027-03-15')).not.toContain('augustus');
    expect(packListNote('hut', '2027-08-01')).toContain('van hut naar hut');
    expect(packListNote('both', undefined)).toContain('ook op de dagen dat je in een hut slaapt');
    for (const s of ['tent', 'hut', 'both'] as const) expect(packListNote(s, '2027-03-15')).not.toMatch(/[\u2013\u2014]/);
  });
});
