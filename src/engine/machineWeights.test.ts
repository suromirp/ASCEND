import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import {
  addOnSource,
  addOnText,
  addOnsFor,
  allProfiles,
  cleanAddOnOverride,
  cleanAddOns,
  formatAddOns,
  parseAddOns,
  withExerciseAddOns,
  withGymAddOns,
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

describe('tussengewichten', () => {
  const kelso = exerciseById('kelso-shrug');
  const base: GymProfile = { ...DEFAULT_PROFILE, id: 'k', name: 'Sportschool K', stackStepKg: 5 };
  const ext = (p: GymProfile, ctx = {}) => candidatesFor(kelso, p, { bodyKg: 80, ...ctx })!.map((c) => c.externalKg);

  it('telt het tussengewicht bij elk gewicht van het blok op (Kelso shrug)', () => {
    const w = ext({ ...base, addOnKg: [2.3] });
    expect(w).toEqual(expect.arrayContaining([65, 67.3, 70, 72.3, 75, 77.3]));
    expect(w).not.toContain(2.3);
  });
  it('geldt voor de hele sportschool, en niet voor een stang', () => {
    const gym = { ...base, addOnKg: [2.3] };
    expect(ext(gym)).toContain(72.3);
    expect(candidatesFor(bench, gym, { bodyKg: 80 })!.some((c) => Math.abs(c.externalKg % 1 - 0.3) < 1e-6)).toBe(false);
  });
  it('laat een toestel zonder tussengewicht terwijl de sportschool er een heeft', () => {
    const w = ext({ ...base, addOnKg: [2.3], exerciseAddOnKg: { 'kelso-shrug': [] } });
    expect(w).not.toContain(67.3);
    expect(w).toContain(70);
  });
  it('laat een toestel een eigen lijst hebben die die van de sportschool vervangt', () => {
    const w = ext({ ...base, addOnKg: [2.3], exerciseAddOnKg: { 'kelso-shrug': [1.25] } });
    expect(w).toContain(66.25);
    expect(w).not.toContain(67.3);
  });
  it('maakt van twee tussengewichten elke afzonderlijke en gezamenlijke som', () => {
    const w = ext({ ...base, addOnKg: [1.25, 2.5] });
    expect(w).toEqual(expect.arrayContaining([65, 66.25, 67.5, 68.75, 70]));
  });
  it('werkt ook met een eigen lijst van het blok', () => {
    const w = ext({ ...base, exerciseWeightsKg: { 'kelso-shrug': [10, 20] }, addOnKg: [2.3] });
    expect(w).toEqual([10, 12.3, 20, 22.3]);
  });
  it('maakt van een gebruikt gewicht met tussengewicht geen dubbele som', () => {
    const w = ext({ ...base, addOnKg: [2.3] }, { usedKg: [70, 72.3, 75], stackWeights: 'used_only' });
    expect(w).toEqual([70, 72.3, 75, 77.3]);
  });
  it('geeft de dubbele waarden en de grenzen op', () => {
    expect(cleanAddOns([2.3, 2.3, 'x', 0, 100, 5, 1, 3])).toEqual([1, 2.3, 3]);
    expect(cleanAddOns([])).toBeUndefined();
    expect(cleanAddOnOverride([])).toEqual([]);
    expect(cleanAddOnOverride('x')).toBeUndefined();
    expect(cleanAddOnOverride([0])).toBeUndefined();
  });
  it('splitst een gewicht in blok en tussengewicht', () => {
    const gym = { ...base, addOnKg: [1.25, 2.5] };
    expect(addOnText({ ...base, addOnKg: [2.3] }, kelso, 72.3, 5)).toBe('70 + 2,3');
    expect(addOnText(gym, kelso, 73.75, 5)).toBe('70 + 1,25 + 2,5');
    expect(addOnText(gym, kelso, 75, 5)).toBeUndefined();
    expect(addOnText(gym, bench, 72.5, 5)).toBeUndefined();
  });
  it('zegt de waarde en leest het veld', () => {
    expect(formatAddOns([2.3])).toBe('2,3 kg');
    expect(formatAddOns([1.25, 2.5])).toBe('1,25 en 2,5 kg');
    expect(formatAddOns([])).toBe('Geen');
    expect(parseAddOns('')).toEqual({ ok: true, list: [] });
    expect(parseAddOns('2,3')).toEqual({ ok: true, list: [2.3] });
    expect(parseAddOns('1 2 3 4').ok).toBe(false);
    expect(parseAddOns('99').ok).toBe(false);
    expect(parseAddOns('x').ok).toBe(false);
  });
  it('zet en wist de keuzes in het actieve profiel', () => {
    let s = withGymAddOns(undefined, [2.3]);
    expect(resolveStrengthSettings(s).profile.addOnKg).toEqual([2.3]);
    s = withExerciseAddOns(s, 'kelso-shrug', []);
    expect(addOnsFor(resolveStrengthSettings(s).profile, kelso)).toEqual([]);
    expect(addOnSource(resolveStrengthSettings(s).profile, kelso)).toBe('none-own');
    s = withExerciseAddOns(s, 'kelso-shrug', undefined);
    expect(addOnsFor(resolveStrengthSettings(s).profile, kelso)).toEqual([2.3]);
    expect(resolveStrengthSettings(s).profile.exerciseAddOnKg).toBeUndefined();
    s = withGymAddOns(s, undefined);
    expect(resolveStrengthSettings(s).profile.addOnKg).toBeUndefined();
  });
  it('overleeft normaliseren, en een oude back-up zonder de velden werkt', () => {
    const ok = normalizeStrengthSettings({ profiles: [{ id: 'x', name: 'X', addOnKg: [2.3, 'a'], exerciseAddOnKg: { 'kelso-shrug': [], 'cable-fly': 'veel', 'face-pull': [1.25] } }], activeProfileId: 'x' })!;
    expect(ok.profiles![0].addOnKg).toEqual([2.3]);
    expect(ok.profiles![0].exerciseAddOnKg).toEqual({ 'kelso-shrug': [], 'face-pull': [1.25] });
    const old = normalizeStrengthSettings({ profiles: [{ id: 'x', name: 'X' }], activeProfileId: 'x' })!;
    expect(old.profiles![0].addOnKg).toBeUndefined();
  });
  it('een nieuwe sportschool begint zonder eigen keuzes per toestel', () => {
    const s = withExerciseAddOns(withGymAddOns(undefined, [2.3]), 'kelso-shrug', []);
    const p = resolveStrengthSettings(withNewProfile(s, 'Sportschool Z')!).profile;
    expect(p.exerciseAddOnKg).toBeUndefined();
  });
});

describe('parseAddOns buiten het bereik', () => {
  it('noemt het bereik, ook voor waarden die een toestel niet kent', async () => {
    const { parseAddOns } = await import('./machineWeights');
    expect(parseAddOns('0,1')).toEqual({ ok: false, reason: 'Een tussengewicht ligt tussen 0,25 en 25 kg.' });
    expect(parseAddOns('1000')).toEqual({ ok: false, reason: 'Een tussengewicht ligt tussen 0,25 en 25 kg.' });
    expect(parseAddOns('abc').ok).toBe(false);
  });
});
