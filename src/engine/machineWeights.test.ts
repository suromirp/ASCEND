import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import {
  allProfiles,
  cleanMachineList,
  countsForProfile,
  formatMachineWeights,
  machineListCount,
  ownWeightsFor,
  parseMachineWeights,
  profileIdFromWorkoutName,
  profileNameProblem,
  withActiveProfile,
  withMachineWeights,
  withNewProfile,
} from './machineWeights';
import { DEFAULT_PROFILE, normalizeStrengthSettings, resolveStrengthSettings, type GymProfile, type StrengthSettings } from './strengthSettings';
import { candidatesFor } from './strengthWeights';

// Nagemaakte sportscholen en een nagemaakte kabel met 4,5, 9, 13,5 en 18 kg.
const cable = exerciseById('cable-fly');
const bench = exerciseById('bench-press');
const gymA: GymProfile = { ...DEFAULT_PROFILE, id: 'a', name: 'Sportschool A', exerciseWeightsKg: { 'cable-fly': [4.5, 9, 13.5, 18] } };
const gymB: GymProfile = { ...DEFAULT_PROFILE, id: 'b', name: 'Sportschool B' };

describe('parseMachineWeights', () => {
  it('leest een lijst met spaties, komma als decimaalteken', () => {
    expect(parseMachineWeights('4,5 9 13,5 18')).toEqual({ ok: true, list: [4.5, 9, 13.5, 18] });
  });
  it('leest ook komma of puntkomma als scheiding en punt als decimaalteken', () => {
    expect(parseMachineWeights('4.5, 9, 13.5, 18')).toEqual({ ok: true, list: [4.5, 9, 13.5, 18] });
    expect(parseMachineWeights('4,5; 9; 13,5')).toEqual({ ok: true, list: [4.5, 9, 13.5] });
  });
  it('zet de lijst oplopend en haalt dubbele weg', () => {
    expect(parseMachineWeights('18 9 9 4,5')).toEqual({ ok: true, list: [4.5, 9, 18] });
  });
  it('weigert leeg, letters en onmogelijke gewichten met een zin', () => {
    expect(parseMachineWeights('  ').ok).toBe(false);
    expect(parseMachineWeights('4,5 negen').ok).toBe(false);
    expect(parseMachineWeights('4,5,9').ok).toBe(false);
    expect(parseMachineWeights('0 5').ok).toBe(false);
    expect(parseMachineWeights('900').ok).toBe(false);
    const bad = parseMachineWeights('x');
    expect(bad.ok === false && bad.reason.length > 0).toBe(true);
  });
  it('schrijft een lijst terug zoals je hem typt', () => {
    expect(formatMachineWeights([4.5, 9, 13.5, 18])).toBe('4,5 9 13,5 18');
  });
});

describe('cleanMachineList', () => {
  it('houdt alleen bruikbare getallen', () => {
    expect(cleanMachineList([9, 'x', 4.5, -1, 9, NaN])).toEqual([4.5, 9]);
    expect(cleanMachineList([])).toBeUndefined();
    expect(cleanMachineList('4,5')).toBeUndefined();
  });
});

describe('gewichten van een toestel in candidatesFor', () => {
  const externals = (profile: GymProfile, stackWeights: 'learned' | 'used_only' | 'profile', usedKg?: number[]) =>
    candidatesFor(cable, profile, { bodyKg: 80, usedKg, stackWeights })!.map((c) => c.externalKg);

  it('zijn precies de lijst, bij elke keuze van Gewichten van toestellen', () => {
    for (const mode of ['learned', 'used_only', 'profile'] as const) {
      expect(externals(gymA, mode, [10, 15, 20])).toEqual([4.5, 9, 13.5, 18]);
    }
  });
  it('gaan voor wat geleerd is', () => {
    expect(externals(gymA, 'learned', [5, 10, 15, 20, 25])).toEqual([4.5, 9, 13.5, 18]);
  });
  it('laten een andere sportschool met rust', () => {
    const steps = externals(gymB, 'profile');
    expect(steps.slice(0, 3)).toEqual([5, 10, 15]);
    expect(externals(gymB, 'used_only', [10, 15])).toEqual([10, 15]);
  });
  it('gelden alleen voor het toestel waar ze bij horen, en alleen voor kabels en stapels', () => {
    const other = candidatesFor(exerciseById('face-pull'), gymA, { bodyKg: 80, stackWeights: 'profile' })!;
    expect(other[0].externalKg).toBe(5);
    const barbell = candidatesFor(bench, { ...gymA, exerciseWeightsKg: { 'bench-press': [10, 20] } }, { bodyKg: 80 })!;
    expect(barbell.some((c) => c.externalKg === 10)).toBe(false);
  });
});

describe('opslaan en wissen in het actieve profiel', () => {
  it('zet een lijst bij het actieve profiel en wist hem weer', () => {
    const withList = withMachineWeights(undefined, 'cable-fly', [4.5, 9, 13.5]);
    const profile = resolveStrengthSettings(withList).profile;
    expect(ownWeightsFor(profile, cable)).toEqual([4.5, 9, 13.5]);
    expect(machineListCount(profile)).toBe(1);
    const cleared = normalizeStrengthSettings(withMachineWeights(withList, 'cable-fly', undefined))!;
    const after = resolveStrengthSettings(cleared).profile;
    expect(ownWeightsFor(after, cable)).toBeUndefined();
    expect(after.exerciseWeightsKg).toBeUndefined();
  });
  it('houdt de lijst per sportschool apart', () => {
    let raw: StrengthSettings | undefined = withMachineWeights(undefined, 'cable-fly', [4.5, 9]);
    raw = withNewProfile(raw, 'Sportschool B')!;
    expect(ownWeightsFor(resolveStrengthSettings(raw).profile, cable)).toBeUndefined();
    raw = withMachineWeights(raw, 'cable-fly', [10, 20]);
    const profiles = allProfiles(raw);
    expect(profiles).toHaveLength(2);
    expect(profiles.map((p) => p.exerciseWeightsKg?.['cable-fly'])).toEqual(expect.arrayContaining([[4.5, 9], [10, 20]]));
  });
  it('overleeft de back-up: de lijst blijft, rommel valt weg', () => {
    const stored = withMachineWeights(undefined, 'cable-fly', [4.5, 9, 13.5]);
    const back = normalizeStrengthSettings(JSON.parse(JSON.stringify(stored)))!;
    expect(resolveStrengthSettings(back).profile.exerciseWeightsKg).toEqual({ 'cable-fly': [4.5, 9, 13.5] });
    const damaged = normalizeStrengthSettings({ profiles: [{ id: 'x', name: 'X', exerciseWeightsKg: { 'cable-fly': 'veel', 'face-pull': [-3, 'a'], 'cable-crunch': [20, 10] } }], activeProfileId: 'x' })!;
    expect(damaged.profiles![0].exerciseWeightsKg).toEqual({ 'cable-crunch': [10, 20] });
  });
  it('een oude back-up zonder het veld werkt zoals altijd', () => {
    const old = normalizeStrengthSettings({ profiles: [{ id: 'x', name: 'X', barsKg: [20], platesKg: [5], stackStepKg: 5 }], activeProfileId: 'x' })!;
    expect(old.profiles![0].exerciseWeightsKg).toBeUndefined();
  });
});

describe('sportscholen', () => {
  it('een nieuwe sportschool wordt actief en begint zonder lijsten', () => {
    const raw = withNewProfile(undefined, '  Sportschool B ')!;
    expect(allProfiles(raw).map((p) => p.name)).toEqual(['Mijn sportschool', 'Sportschool B']);
    expect(resolveStrengthSettings(raw).profile.name).toBe('Sportschool B');
  });
  it('wisselen kiest een bestaand profiel, een onbekend id verandert niets', () => {
    const raw = withNewProfile(undefined, 'Sportschool B')!;
    const first = allProfiles(raw)[0].id;
    expect(resolveStrengthSettings(withActiveProfile(raw, first)).profile.id).toBe(first);
    expect(withActiveProfile(raw, 'bestaat-niet')).toBe(raw);
  });
  it('weigert een lege of dubbele naam en meer dan vijf sportscholen', () => {
    const raw = withNewProfile(undefined, 'Sportschool B')!;
    expect(profileNameProblem(raw, ' ')).toBeDefined();
    expect(profileNameProblem(raw, 'sportschool b')).toBeDefined();
    expect(withNewProfile(raw, 'SPORTSCHOOL B')).toBeUndefined();
    let many: StrengthSettings | undefined = raw;
    for (const n of ['C', 'D', 'E']) many = withNewProfile(many, `Sportschool ${n}`);
    expect(allProfiles(many)).toHaveLength(5);
    expect(withNewProfile(many, 'Sportschool F')).toBeUndefined();
  });
});

describe('welke sportschool bij een workout hoort', () => {
  const profiles = [gymA, gymB];
  it('de naam eindigt op @ en de naam van een profiel', () => {
    expect(profileIdFromWorkoutName('Benen A @ Sportschool B', profiles)).toBe('b');
    expect(profileIdFromWorkoutName('Benen A @ sportschool a', profiles)).toBe('a');
  });
  it('anders niets', () => {
    expect(profileIdFromWorkoutName('Benen A', profiles)).toBeUndefined();
    expect(profileIdFromWorkoutName('Benen A @ Ergens anders', profiles)).toBeUndefined();
    expect(profileIdFromWorkoutName('Benen A @ ', profiles)).toBeUndefined();
    expect(profileIdFromWorkoutName('Sportschool A @ Benen', profiles)).toBeUndefined();
  });
});

describe('countsForProfile', () => {
  it('een training zonder sportschool telt voor elke, een met sportschool alleen voor die', () => {
    expect(countsForProfile(undefined, 'a')).toBe(true);
    expect(countsForProfile('a', 'a')).toBe(true);
    expect(countsForProfile('b', 'a')).toBe(false);
  });
});
