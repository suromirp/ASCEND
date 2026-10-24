import { describe, expect, it } from 'vitest';
import { compareMoments, DEFAULT_CHECK_FROM, DEFAULT_PROFILE, normalizeStrengthSettings, parseWeightList, resolveStrengthSettings, strengthModelOn, withExerciseValue, withProfile } from './strengthSettings';

describe('de standaardwaarden', () => {
  it('zonder instellingen geldt het advies', () => {
    const r = resolveStrengthSettings(undefined);
    expect(r).toMatchObject({ enabled: true, progression: 'weight_first', workSets: 'descending', warmup: 'smart', widenRange: true, estimateUpTo: 20 });
    expect(r.profile.barsKg).toEqual([20, 15]);
    expect(r.profile.platesKg).toEqual([1.25, 2.5, 5, 10, 15, 20, 25]);
    expect(r.profile.dumbbells).toMatchObject({ startKg: 2, stepKg: 2, upToKg: 10, thenStepKg: 2.5 });
    expect(r.profile.stackStepKg).toBe(5);
    expect(strengthModelOn(undefined)).toBe(true);
    expect(strengthModelOn({ enabled: false })).toBe(false);
  });
  it('een eigen keuze wint, de rest blijft het advies', () => {
    const r = resolveStrengthSettings({ progression: 'reps_first', warmup: 'off' });
    expect(r.progression).toBe('reps_first');
    expect(r.warmup).toBe('off');
    expect(r.workSets).toBe('descending');
  });
});

describe('rommel wordt geweigerd', () => {
  it('geen record is niets', () => {
    for (const bad of [null, 'tekst', 5, [], undefined]) expect(normalizeStrengthSettings(bad)).toBeUndefined();
  });
  it('houdt alleen geldige waarden', () => {
    const clean = normalizeStrengthSettings({
      enabled: 'ja', progression: 'snel', workSets: 'equal', warmup: 42, widenRange: false, estimateUpTo: 13, activeProfileId: 7, onzin: 1,
    });
    expect(clean).toEqual({ workSets: 'equal', widenRange: false });
  });
  it('een profiel met rommel valt terug op de standaard per onderdeel', () => {
    const clean = normalizeStrengthSettings({
      profiles: [{ id: 'a', name: '  ', barsKg: ['x', -5, 20, 20, 500], platesKg: 'veel', dumbbells: { startKg: 'nee', stepKg: -1, upToKg: 5, thenStepKg: 2.5, maxKg: 9999 }, stackStepKg: 0, exerciseStepKg: { a: 2.5, b: 'x', c: -1 } }, { id: '' }, 'tekst'],
    })!;
    expect(clean.profiles).toHaveLength(1);
    const p = clean.profiles![0];
    expect(p.name).toBe(DEFAULT_PROFILE.name);
    expect(p.barsKg).toEqual([20]);
    expect(p.platesKg).toEqual(DEFAULT_PROFILE.platesKg);
    expect(p.dumbbells).toEqual({ startKg: 2, stepKg: 2, upToKg: 5, thenStepKg: 2.5, maxKg: 50 });
    expect(p.stackStepKg).toBe(5);
    expect(p.exerciseStepKg).toEqual({ a: 2.5 });
  });
  it('twee profielen met dezelfde id worden er één, en het aantal is begrensd', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}` }));
    expect(normalizeStrengthSettings({ profiles: [{ id: 'x' }, { id: 'x' }] })!.profiles).toHaveLength(1);
    expect(normalizeStrengthSettings({ profiles: many })!.profiles).toHaveLength(5);
  });
  it('is stabiel: wat al schoon is verandert niet', () => {
    const once = normalizeStrengthSettings({ enabled: false, estimateUpTo: 15, profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id })!;
    expect(normalizeStrengthSettings(once)).toEqual(once);
  });
  it('beschadigde instellingen lezen als het advies', () => {
    expect(resolveStrengthSettings({ warmup: 'gek' } as never).warmup).toBe('smart');
    expect(resolveStrengthSettings({ activeProfileId: 'bestaat-niet' }).profile).toEqual(DEFAULT_PROFILE);
  });
});

describe('het profiel veranderen', () => {
  it('maakt van het standaardprofiel een opgeslagen profiel met alleen de verandering', () => {
    const next = withProfile(undefined, { barsKg: [20] });
    const r = resolveStrengthSettings(next);
    expect(r.profile.barsKg).toEqual([20]);
    expect(r.profile.platesKg).toEqual(DEFAULT_PROFILE.platesKg);
    expect(next.profiles).toHaveLength(1);
  });
  it('houdt andere instellingen en andere profielen', () => {
    const base = { warmup: 'off' as const, profiles: [{ ...DEFAULT_PROFILE, id: 'thuis', name: 'Thuis' }, { ...DEFAULT_PROFILE, id: 'werk' }], activeProfileId: 'thuis' };
    const next = withProfile(base, { stackStepKg: 2.5 });
    expect(next.warmup).toBe('off');
    expect(next.profiles!.map((p) => p.id)).toEqual(['thuis', 'werk']);
    expect(resolveStrengthSettings(next).profile.stackStepKg).toBe(2.5);
  });
});

describe('een lijst gewichten typen', () => {
  it('leest komma als decimaal en spatie of puntkomma als scheiding', () => {
    expect(parseWeightList('1,25 2,5; 5')).toEqual([1.25, 2.5, 5]);
    expect(parseWeightList('20  15')).toEqual([20, 15]);
  });
  it('slaat onzin en nul over', () => {
    expect(parseWeightList('x 0 -3 10')).toEqual([10]);
    expect(parseWeightList('')).toEqual([]);
  });
});

describe('het workoutscherm', () => {
  it('standaard: rusttimer vanzelf, geluid en trillen, scherm aan, geen eigen tijden of notities', () => {
    const r = resolveStrengthSettings(undefined);
    expect(r).toMatchObject({ restAuto: true, restAlert: 'sound_vibrate', keepScreenOn: true, restSeconds: {}, exerciseNotes: {} });
  });
  it('houdt alleen geldige rusttijden en notities', () => {
    const clean = normalizeStrengthSettings({
      restAuto: false,
      restAlert: 'toeter',
      keepScreenOn: 'ja',
      restSeconds: { 'back-squat': 240, 'bench-press': 5, x: 'lang', ['y'.repeat(80)]: 90 },
      exerciseNotes: { 'leg-press': '  stoel op 4  ', 'barbell-row': '', z: 3 },
    })!;
    expect(clean.restAuto).toBe(false);
    expect(clean.restAlert).toBeUndefined();
    expect(clean.keepScreenOn).toBeUndefined();
    expect(clean.restSeconds).toEqual({ 'back-squat': 240 });
    expect(clean.exerciseNotes).toEqual({ 'leg-press': 'stoel op 4' });
  });
  it('gewicht doorgeven en schijven tonen staan standaard aan en vallen terug bij rommel', () => {
    expect(resolveStrengthSettings(undefined)).toMatchObject({ carryWeights: true, showPlates: true });
    expect(resolveStrengthSettings({ carryWeights: false, showPlates: false })).toMatchObject({ carryWeights: false, showPlates: false });
    const clean = normalizeStrengthSettings({ carryWeights: 'nee', showPlates: 0 })!;
    expect(clean.carryWeights).toBeUndefined();
    expect(clean.showPlates).toBeUndefined();
    expect(resolveStrengthSettings(undefined).showOneRm).toBe(true);
    expect(resolveStrengthSettings({ showOneRm: false }).showOneRm).toBe(false);
    expect(normalizeStrengthSettings({ showOneRm: 'nee' })!.showOneRm).toBeUndefined();
  });
  it('de keuze tussen 1RM en werkgewicht en de MacroFactor-1RM: advies 1RM en aan, rommel valt weg', () => {
    expect(resolveStrengthSettings(undefined)).toMatchObject({ oneRmView: 'one_rm', showMacroFactorOneRm: true });
    expect(resolveStrengthSettings({ oneRmView: 'work_weight', showMacroFactorOneRm: false })).toMatchObject({ oneRmView: 'work_weight', showMacroFactorOneRm: false });
    const clean = normalizeStrengthSettings({ oneRmView: 'beide', showMacroFactorOneRm: 'ja' })!;
    expect(clean.oneRmView).toBeUndefined();
    expect(clean.showMacroFactorOneRm).toBeUndefined();
    expect(normalizeStrengthSettings({ oneRmView: 'work_weight' })!.oneRmView).toBe('work_weight');
  });
  it('vergelijken met, volgorde en extra regels: advies 4 en 8 weken, meest getraind en aan; rommel valt weg', () => {
    expect(resolveStrengthSettings(undefined)).toMatchObject({ compareWeeks: '4_8', listSort: 'most', showExtras: true });
    expect(resolveStrengthSettings({ compareWeeks: '12_26', listSort: 'name', showExtras: false })).toMatchObject({ compareWeeks: '12_26', listSort: 'name', showExtras: false });
    const clean = normalizeStrengthSettings({ compareWeeks: '3_5', listSort: 'willekeurig', showExtras: 'ja' })!;
    expect(clean.compareWeeks).toBeUndefined();
    expect(clean.listSort).toBeUndefined();
    expect(clean.showExtras).toBeUndefined();
    expect(compareMoments('4_8')).toEqual([4, 8]);
    expect(compareMoments('12_26')).toEqual([12, 26]);
  });
  it('de nieuwe rustgeluiden blijven staan en onbekende vallen weg', () => {
    for (const k of ['boxing', 'whistle', 'gong', 'chime']) expect(normalizeStrengthSettings({ restSound: k })!.restSound).toBe(k);
    expect(normalizeStrengthSettings({ restSound: 'trompet' })!.restSound).toBeUndefined();
    expect(resolveStrengthSettings({ restSound: 'gong' }).restSound).toBe('gong');
  });
  it('een waarde per oefening zetten en weer wissen', () => {
    const on = withExerciseValue({ warmup: 'off' }, 'exerciseNotes', 'leg-press', 'stoel op 4');
    expect(on).toEqual({ warmup: 'off', exerciseNotes: { 'leg-press': 'stoel op 4' } });
    const off = withExerciseValue(on, 'exerciseNotes', 'leg-press', undefined);
    expect(off).toEqual({ warmup: 'off' });
    expect(withExerciseValue(undefined, 'restSeconds', 'back-squat', 210)).toEqual({ restSeconds: { 'back-squat': 210 } });
  });
});

describe('toetsen en toestellen leren', () => {
  it('de adviezen: leren aan, blok uit, startdatum van het stille meten', () => {
    const r = resolveStrengthSettings(undefined);
    expect(r.learnStacks).toBe(true);
    expect(r.showComparison).toBe(false);
    expect(r.checkFrom).toBe(DEFAULT_CHECK_FROM);
  });
  it('eigen keuzes blijven en rommel valt weg', () => {
    const r = resolveStrengthSettings({ learnStacks: false, showComparison: true, checkFrom: '2026-11-01' });
    expect([r.learnStacks, r.showComparison, r.checkFrom]).toEqual([false, true, '2026-11-01']);
    expect(normalizeStrengthSettings({ checkFrom: 'gisteren', learnStacks: 'ja' })).toEqual({});
  });
});
