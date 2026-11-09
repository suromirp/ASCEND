import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { DEFAULT_PROFILE, normalizeProfile, resolveStrengthSettings, type GymProfile, type StrengthSettings } from './strengthSettings';
import { forgetStand, learnStand, mergeStands, seedOnOpen, seedStands, ownWeightsTickedAll, standAfterTick, standsFor, standsSummary, standNoteText, standsBefore, usedKgFromLogs, withStandForgotten, withStandsCleared, withStandsRestored, withStandsSet } from './toestelStanden';
import { candidatesFor, learnedStack } from './strengthWeights';
import { machineListCount, ownWeightsFor, withMachineSetup, withNewProfile } from './machineWeights';
import type { SessionLog } from '../models/training';
import { usedBefore, type SessionInput } from './strengthModel';

// Nagemaakte sportscholen en gewichten. Het blok van 7, 14, 23, 32 is het voorbeeld uit het ontwerp
// (docs/visie/Toestelstanden in Forge.md).

const machine = exerciseById('leg-extension')!;
const cable = exerciseById('cable-hip-abduction')!;
const bar = exerciseById('back-squat')!;
const assisted = exerciseById('assisted-pull-up')!;
const gym = (patch: Partial<GymProfile> = {}): GymProfile => ({ ...DEFAULT_PROFILE, id: 'g', name: 'Proefzaal', stackStepKg: 2.5, ...patch });
const withStands = (kg: number[], only = false, p: Partial<GymProfile> = {}) => gym({ ...p, exerciseStandsKg: { [machine.id]: { kg, ...(only ? { only: true } : {}) } } });
const ok = (r: ReturnType<typeof learnStand>) => {
  if (!r.ok) throw new Error(`geen stand: ${r.reason}`);
  return r;
};

describe('standsFor', () => {
  it('de eerste keer: geen standen, niet opgeslagen, geen gesloten lijst', () => {
    expect(standsFor(gym(), machine)).toEqual({ kg: [], only: false, stored: false });
  });
  it('een oude lijst en een oud bereik zijn standen met "alleen deze"', () => {
    const p = gym({ exerciseWeightsKg: { [machine.id]: [5] }, exerciseWeightRanges: { [machine.id]: [{ startKg: 10, endKg: 20, stepKg: 5 }] } });
    expect(standsFor(p, machine)).toEqual({ kg: [5, 10, 15, 20], only: true, stored: false });
  });
  it('een bereik in pond geeft de kilo\'s van nu', () => {
    const p = gym({ exerciseWeightRanges: { [machine.id]: [{ startKg: 10, endKg: 30, stepKg: 10, unit: 'lb' }] } });
    expect(standsFor(p, machine)?.kg).toEqual([4.5, 9.1, 13.6]);
  });
  it('geen standen voor een stang en voor de hulp van een optrekstation', () => {
    expect(standsFor(gym(), bar)).toBeUndefined();
    expect(standsFor(gym(), assisted)).toBeUndefined();
  });
});

describe('learnStand', () => {
  it('de eerste stand op een leeg toestel', () => {
    const r = ok(learnStand(gym(), machine, 20));
    expect(r.kg).toBe(20);
    expect(r.profile.exerciseStandsKg).toEqual({ [machine.id]: { kg: [20] } });
  });
  it('tussen twee standen komt erbij, oplopend', () => {
    expect(ok(learnStand(withStands([14, 23]), machine, 20)).profile.exerciseStandsKg?.[machine.id].kg).toEqual([14, 20, 23]);
  });
  it('boven de hoogste komt erbij', () => {
    expect(ok(learnStand(withStands([7, 14, 23, 32]), machine, 41)).profile.exerciseStandsKg?.[machine.id].kg).toEqual([7, 14, 23, 32, 41]);
  });
  it('0, negatief en niets worden geen stand', () => {
    expect(learnStand(gym(), machine, 0)).toEqual({ ok: false, reason: 'zero' });
    expect(learnStand(gym(), machine, -5)).toEqual({ ok: false, reason: 'zero' });
    expect(learnStand(gym(), machine, Number.NaN)).toEqual({ ok: false, reason: 'zero' });
  });
  it('een gewicht dat op pond lijkt niet', () => {
    expect(learnStand(gym(), machine, 40.82)).toEqual({ ok: false, reason: 'decimals' });
    expect(learnStand(gym(), machine, 6.8)).toEqual({ ok: false, reason: 'pounds' });
  });
  it('meer dan één decimaal niet; op 0,01 gelijk is dezelfde stand', () => {
    expect(learnStand(gym(), machine, 12.35)).toEqual({ ok: false, reason: 'decimals' });
    expect(learnStand(withStands([12.5]), machine, 12.5000001)).toEqual({ ok: false, reason: 'known' });
  });
  it('de 41e stand niet', () => {
    const forty = Array.from({ length: 40 }, (_, i) => i + 1);
    expect(learnStand(withStands(forty), machine, 50)).toEqual({ ok: false, reason: 'full' });
  });
  it('een stand plus een tussengewicht niet (70 + 2,3)', () => {
    expect(learnStand(withStands([70], false, { addOnKg: [2.3] }), machine, 72.3)).toEqual({ ok: false, reason: 'add_on' });
  });
  it('een training zonder toestel: nooit een stand', () => {
    expect(learnStand(gym(), bar, 60)).toEqual({ ok: false, reason: 'no_stack' });
    expect(learnStand(gym(), assisted, 20)).toEqual({ ok: false, reason: 'no_stack' });
    expect(learnStand(gym(), undefined, 20)).toEqual({ ok: false, reason: 'no_stack' });
  });
  it('een oude lijst gaat in één keer om: standen met only, oude velden van dat toestel weg, de rest blijft', () => {
    const p = gym({ exerciseWeightsKg: { [machine.id]: [10, 20], [cable.id]: [5] }, exerciseWeightRanges: { [machine.id]: [{ startKg: 30, endKg: 40, stepKg: 10 }] } });
    const r = ok(learnStand(p, machine, 25));
    expect(r.profile.exerciseStandsKg).toEqual({ [machine.id]: { kg: [10, 20, 25, 30, 40], only: true } });
    expect(r.profile.exerciseWeightsKg).toEqual({ [cable.id]: [5] });
    expect(r.profile.exerciseWeightRanges).toBeUndefined();
  });
  it('een oud bereik met meer dan 40 gewichten blijft zoals het was', () => {
    const p = gym({ exerciseWeightRanges: { [machine.id]: [{ startKg: 1, endKg: 100, stepKg: 1 }] } });
    expect(learnStand(p, machine, 100.5)).toEqual({ ok: false, reason: 'full' });
  });
});

describe('forgetStand (Terugdraaien en wegstrepen)', () => {
  it('haalt alleen die stand weg en houdt de sleutel, ook als hij leeg wordt', () => {
    expect(forgetStand(withStands([14, 20, 23]), machine, 20)?.exerciseStandsKg?.[machine.id]).toEqual({ kg: [14, 23] });
    expect(forgetStand(withStands([20]), machine, 20)?.exerciseStandsKg?.[machine.id]).toEqual({ kg: [] });
  });
  it('niets te doen als de stand er niet is', () => {
    expect(forgetStand(withStands([14]), machine, 20)).toBeUndefined();
  });
  it('een weggestreepte stand komt niet terug uit je logs', () => {
    const struck = forgetStand(withStands([7, 77]), machine, 77)!;
    expect(seedStands(struck, machine, [7, 77, 77])).toBeUndefined();
    const settings = resolveStrengthSettings({ activeProfileId: 'g', profiles: [struck] });
    const sessions: SessionInput[] = [{ date: '2026-11-01', sets: [{ reps: 10, weightKg: 77 }, { reps: 10, weightKg: 7 }] }];
    expect(usedBefore({ sessions, date: '2026-11-09', settings, exercise: machine })).toEqual([7]);
  });
});

describe('seedStands (inlezen uit je trainingen)', () => {
  it('neemt de gebruikte gewichten één keer over, zonder pond en zonder twee decimalen', () => {
    const seeded = seedStands(gym(), machine, [7, 14, 14, 23, 40.82, 12.35, 32])!;
    expect(seeded.exerciseStandsKg?.[machine.id]).toEqual({ kg: [7, 14, 23, 32] });
    expect(seedStands(seeded, machine, [7, 50])).toBeUndefined();
  });
  it('zonder gebruikte gewichten een lege sleutel: ook dat is ingelezen', () => {
    expect(seedStands(gym(), machine, [])?.exerciseStandsKg).toEqual({ [machine.id]: { kg: [] } });
  });
  it('een stand plus een tussengewicht wordt geen stand', () => {
    expect(seedStands(gym({ addOnKg: [2.3] }), machine, [70, 72.3])?.exerciseStandsKg?.[machine.id].kg).toEqual([70]);
  });
  it('meer dan 40: de 40 die je het vaakst gebruikte', () => {
    const used = [...Array.from({ length: 45 }, (_, i) => i + 1), ...Array.from({ length: 40 }, (_, i) => i + 6)];
    const kg = seedStands(gym(), machine, used)!.exerciseStandsKg![machine.id].kg;
    expect(kg).toHaveLength(40);
    expect(kg[0]).toBe(6);
  });
  it('een toestel met een oude lijst wordt niet ingelezen', () => {
    expect(seedStands(gym({ exerciseWeightsKg: { [machine.id]: [5, 10] } }), machine, [7])).toBeUndefined();
  });
  it('niets voor een training zonder toestel', () => {
    expect(seedStands(gym(), bar, [60, 80])).toBeUndefined();
  });
});

describe('standAfterTick en de instelling Standen onthouden', () => {
  const raw: StrengthSettings = { activeProfileId: 'g', profiles: [gym(), { ...gym(), id: 'h', name: 'Andere zaal' }] };
  it('uit: niets inlezen en niets onthouden, het gedrag van nu', () => {
    expect(standAfterTick(raw, machine, 20, { remember: false, usedKg: [7, 14] })).toEqual({ kind: 'none', reason: 'off' });
    expect(seedOnOpen(raw, machine, { remember: false, usedKg: [7, 14] })).toBeUndefined();
  });
  it('aan: eerst inlezen, dan de nieuwe stand; alleen de actieve sportschool verandert', () => {
    const out = standAfterTick(raw, machine, 20, { remember: true, usedKg: [7, 14, 23, 32] });
    expect(out.kind).toBe('learned');
    if (out.kind !== 'learned') return;
    expect(out.kg).toBe(20);
    expect(out.settings.profiles?.[0].exerciseStandsKg?.[machine.id].kg).toEqual([7, 14, 20, 23, 32]);
    expect(out.settings.profiles?.[1]).toEqual(raw.profiles?.[1]);
  });
  it('een opwarmset telt mee: elk afgevinkt gewicht op het blok', () => {
    // De aanroeper geeft elk afgevinkt gewicht, werk- of opwarmset; de regel kijkt niet naar het soort set.
    expect(standAfterTick(raw, machine, 9, { remember: true, usedKg: [] }).kind).toBe('learned');
  });
  it('een bekend gewicht na het inlezen: alleen het inlezen wordt geschreven', () => {
    expect(standAfterTick(raw, machine, 14, { remember: true, usedKg: [14] }).kind).toBe('seeded');
    const seeded = { ...raw, profiles: [withStands([14]), raw.profiles![1]] };
    expect(standAfterTick(seeded, machine, 14, { remember: true })).toEqual({ kind: 'none', reason: 'known' });
  });
  it('Terugdraaien op de instellingen', () => {
    const out = standAfterTick(raw, machine, 20, { remember: true });
    if (out.kind !== 'learned') throw new Error('geen stand');
    expect(withStandForgotten(out.settings, machine, 20)?.profiles?.[0].exerciseStandsKg?.[machine.id]).toEqual({ kg: [] });
  });
});

describe('het model met standen', () => {
  const sevens = [7, 14, 23, 32];
  it('learnedStack zonder opvullen: binnen de standen niets ertussen, erboven het laatste verschil', () => {
    const list = learnedStack(sevens, 2.5, { fillGaps: false })!;
    expect(list.filter((w) => w > 7 && w < 32)).toEqual([14, 23]);
    expect(list.slice(4, 6)).toEqual([41, 50]);
    expect(list[0]).toBe(7);
  });
  it('learnedStack met opvullen blijft zoals het was', () => {
    expect(learnedStack(sevens, 2.5)).toEqual(learnedStack(sevens, 2.5, {}));
    expect(learnedStack(sevens, 2.5)!.some((w) => w > 7 && w < 14)).toBe(true);
  });
  it('candidatesFor: een toestel met standen krijgt geen nepgewichten', () => {
    const c = candidatesFor(machine, withStands(sevens), { stackWeights: 'learned', usedKg: [7, 9.5, 14] })!.map((x) => x.externalKg);
    expect(c.filter((w) => w < 32)).toEqual([7, 14, 23]);
  });
  it('Alleen wat je gebruikte: precies de standen', () => {
    expect(candidatesFor(machine, withStands(sevens), { stackWeights: 'used_only' })!.map((x) => x.externalKg)).toEqual(sevens);
  });
  it('Stappen van je profiel negeert de standen, behalve met only', () => {
    expect(candidatesFor(machine, withStands(sevens), { stackWeights: 'profile' })!.map((x) => x.externalKg).slice(0, 3)).toEqual([2.5, 5, 7.5]);
    expect(candidatesFor(machine, withStands(sevens, true), { stackWeights: 'profile' })!.map((x) => x.externalKg)).toEqual(sevens);
  });
  it('only is hetzelfde als de oude gesloten lijst', () => {
    const old = candidatesFor(machine, gym({ exerciseWeightsKg: { [machine.id]: sevens } }), { stackWeights: 'learned', usedKg: [50] });
    const now = candidatesFor(machine, withStands(sevens, true), { stackWeights: 'learned', usedKg: [50] });
    expect(now).toEqual(old);
    expect(ownWeightsFor(withStands(sevens, true), machine)).toEqual(sevens);
    expect(ownWeightsFor(withStands(sevens), machine)).toBeUndefined();
  });
  it('usedBefore: met sleutel de standen, zonder sleutel de log zoals voorheen', () => {
    const sessions: SessionInput[] = [{ date: '2026-11-01', sets: [{ reps: 10, weightKg: 9.5 }] }];
    const settingsWith = resolveStrengthSettings({ activeProfileId: 'g', profiles: [withStands(sevens)] });
    expect(usedBefore({ sessions, date: '2026-11-09', settings: settingsWith, exercise: machine })).toEqual(sevens);
    expect(usedBefore({ sessions, date: '2026-11-09', settings: settingsWith })).toEqual([9.5]);
    expect(usedBefore({ sessions, date: '2026-11-09', settings: settingsWith, exercise: bar })).toEqual([9.5]);
  });
});

describe('opslag van de standen', () => {
  it('normalizeProfile: rommel eruit, grenzen, geen dubbele, oplopend, hoogstens 40, lege lijst blijft', () => {
    const p = normalizeProfile({ ...gym(), exerciseStandsKg: {
      [machine.id]: { kg: [32, 7, 'x', 0.1, 7.001, 501, 14, 23], only: true },
      [cable.id]: { kg: [] },
      veel: { kg: Array.from({ length: 45 }, (_, i) => i + 1) },
      kapot: 'nee',
      leeg: { kg: 'nee' },
    } })!;
    expect(p.exerciseStandsKg?.[machine.id]).toEqual({ kg: [7, 14, 23, 32], only: true });
    expect(p.exerciseStandsKg?.[cable.id]).toEqual({ kg: [] });
    expect(p.exerciseStandsKg?.veel.kg).toHaveLength(40);
    expect(p.exerciseStandsKg?.kapot).toBeUndefined();
    expect(p.exerciseStandsKg?.leeg).toBeUndefined();
  });
  it('oude profielen zonder het veld lezen zoals altijd: zonder lijst, met eigen lijst, met bereik, met profielstap', () => {
    const plain = normalizeProfile({ id: 'oud', name: 'Oud', stackStepKg: 2.5 })!;
    expect(plain.exerciseStandsKg).toBeUndefined();
    expect(plain.stackStepKg).toBe(2.5);
    expect(candidatesFor(machine, plain, { stackWeights: 'profile' })![0].externalKg).toBe(2.5);
    const list = normalizeProfile({ id: 'oud', exerciseWeightsKg: { [machine.id]: [4.5, 9] } })!;
    expect(list.exerciseStandsKg).toBeUndefined();
    expect(ownWeightsFor(list, machine)).toEqual([4.5, 9]);
    const range = normalizeProfile({ id: 'oud', exerciseWeightRanges: { [machine.id]: [{ startKg: 4.5, endKg: 18, stepKg: 4.5 }] } })!;
    expect(ownWeightsFor(range, machine)).toEqual([4.5, 9, 13.5, 18]);
    expect(candidatesFor(machine, range, { stackWeights: 'learned', usedKg: [30] })!.map((c) => c.externalKg)).toEqual([4.5, 9, 13.5, 18]);
  });
  it('een nieuwe sportschool begint zonder standen', () => {
    const raw: StrengthSettings = { activeProfileId: 'g', profiles: [withStands([7, 14])] };
    const next = withNewProfile(raw, 'Tweede zaal')!;
    expect(next.profiles?.find((p) => p.id === next.activeProfileId)?.exerciseStandsKg).toBeUndefined();
  });
  it('het oude formulier opslaan maakt de lijst de waarheid voor dat toestel; andere standen blijven', () => {
    const raw: StrengthSettings = { activeProfileId: 'g', profiles: [gym({ exerciseStandsKg: { [machine.id]: { kg: [7] }, [cable.id]: { kg: [5] } } })] };
    const p = withMachineSetup(raw, machine.id, { list: [10, 20] }).profiles![0];
    expect(p.exerciseWeightsKg).toEqual({ [machine.id]: [10, 20] });
    expect(p.exerciseStandsKg).toEqual({ [cable.id]: { kg: [5] } });
    expect(ownWeightsFor(p, machine)).toEqual([10, 20]);
  });
});

describe('het blad: standen zetten, wissen en tonen', () => {
  const raw = (p: GymProfile): StrengthSettings => ({ activeProfileId: 'g', profiles: [p] });
  const active = (s: StrengthSettings | undefined) => resolveStrengthSettings(s).profile;
  it('mergeStands voegt samen, oplopend, op 0,01, en weigert meer dan 40', () => {
    expect(mergeStands([14, 7], [23, 7.004, 0, 600])).toEqual({ kg: [7, 14, 23], tooMany: false });
    const veel = Array.from({ length: 41 }, (_, i) => i + 1);
    expect(mergeStands([5], veel)).toEqual({ kg: [5], tooMany: true });
  });
  it('withStandsSet schrijft de standen met de sleutel, en een oude lijst van alleen dat toestel gaat weg', () => {
    const start = raw(gym({ exerciseWeightsKg: { [machine.id]: [10, 20], [cable.id]: [5] } }));
    const next = withStandsSet(start, machine, [20, 14, 7], true)!;
    const p = active(next);
    expect(p.exerciseStandsKg).toEqual({ [machine.id]: { kg: [7, 14, 20], only: true } });
    expect(p.exerciseWeightsKg).toEqual({ [cable.id]: [5] });
    expect(standsFor(p, machine)).toEqual({ kg: [7, 14, 20], only: true, stored: true });
  });
  it('alleen deze standen zonder standen is niet gesloten, en een stang krijgt niets', () => {
    expect(active(withStandsSet(raw(gym()), machine, [], true))!.exerciseStandsKg).toEqual({ [machine.id]: { kg: [] } });
    expect(withStandsSet(raw(gym()), bar, [20], false)).toBeUndefined();
    expect(withStandsSet(raw(gym()), machine, Array.from({ length: 41 }, (_, i) => i + 1), false)).toBeUndefined();
  });
  it('Standen wissen laat een lege sleutel staan: wat je wiste komt niet terug uit je logs', () => {
    const next = withStandsCleared(raw(withStands([7, 14])), machine)!;
    const p = active(next);
    expect(p.exerciseStandsKg).toEqual({ [machine.id]: { kg: [] } });
    expect(seedStands(p, machine, [7, 14])).toBeUndefined();
  });
  it('Terugdraaien na Standen wissen zet precies terug wat er stond, ook een oude lijst of geen sleutel', () => {
    const withOld = raw(gym({ exerciseWeightsKg: { [machine.id]: [10, 20], [cable.id]: [5] }, exerciseWeightRanges: { [machine.id]: [{ startKg: 30, endKg: 40, stepKg: 5 }] } }));
    const before = standsBefore(withOld, machine)!;
    const wiped = withStandsCleared(withOld, machine)!;
    expect(active(wiped).exerciseWeightsKg).toEqual({ [cable.id]: [5] });
    const back = withStandsRestored(wiped, before)!;
    expect(active(back).exerciseWeightsKg).toEqual({ [machine.id]: [10, 20], [cable.id]: [5] });
    expect(active(back).exerciseWeightRanges).toEqual({ [machine.id]: [{ startKg: 30, endKg: 40, stepKg: 5 }] });
    expect(active(back).exerciseStandsKg).toBeUndefined();
    // Met standen: de standen en de keuze komen terug.
    const stands = raw(withStands([7, 14]));
    const b2 = standsBefore(stands, machine)!;
    expect(standsFor(active(withStandsRestored(withStandsCleared(stands, machine)!, b2)!), machine)).toEqual(standsFor(active(stands), machine));
    // Een andere sportschool actief: Terugdraaien raakt niets.
    expect(withStandsRestored({ ...wiped, activeProfileId: 'ander', profiles: [...(wiped.profiles ?? []), { ...gym(), id: 'ander', name: 'Andere zaal' }] }, before)).toBeUndefined();
    expect(standsBefore(withOld, bar)).toBeUndefined();
  });
  it('de rij telt toestellen met standen, ook een oude lijst, en niet een lege sleutel', () => {
    expect(machineListCount(gym())).toBe(0);
    expect(machineListCount(withStands([7]))).toBe(1);
    expect(machineListCount(withStands([]))).toBe(0);
    expect(machineListCount(gym({ exerciseWeightsKg: { [machine.id]: [10, 20] } }))).toBe(1);
  });
  it('de woorden: de regel, en de waarde in de rij', () => {
    expect(standNoteText(20, 'Kabel roeien')).toBe('Stand 20 kg onthouden voor Kabel roeien.');
    expect(standsSummary([7, 14, 23, 32], false)).toBe('7, 14, 23, 32');
    expect(standsSummary([7, 14, 23, 32], true)).toBe('7, 14, 23, 32, alleen deze');
    expect(standsSummary([7, 14, 23, 32, 41, 50, 59], false)).toBe('7 tot 59 kg');
  });
  it('usedKgFromLogs leest werk- en opwarmsets van deze sportschool en logs zonder sportschool, en verandert niets', () => {
    const log = (id: string, gymProfileId: string | undefined, kg: number[]): SessionLog => ({
      id, templateId: 't', type: 'strength', completedDate: '2026-11-01', completedAt: '2026-11-01T10:00:00.000Z', variant: 'full', durationMinutes: 50, source: 'manual',
      ...(gymProfileId ? { gymProfileId } : {}),
      strengthData: [{ exerciseName: 'Leg Extension', exerciseId: machine.id, sets: kg.map((w) => ({ reps: 10, weightKg: w })) }],
    }) as SessionLog;
    const logs = [log('a', 'g', [7, 14]), log('b', 'andere', [99]), log('c', undefined, [23, 0])];
    const before = JSON.stringify(logs);
    expect(usedKgFromLogs(logs, machine, 'g')).toEqual([7, 14, 23]);
    expect(usedKgFromLogs(logs, bar, 'g')).toEqual([]);
    expect(JSON.stringify(logs)).toBe(before);
  });
});

describe('Standen onthouden uit: het gedrag van nu', () => {
  it('niets inlezen en niets onthouden, bestaande standen blijven werken', () => {
    const start: StrengthSettings = { activeProfileId: 'g', profiles: [withStands([7, 14])] };
    expect(standAfterTick(start, machine, 20, { remember: false, usedKg: [7, 14, 20] })).toEqual({ kind: 'none', reason: 'off' });
    expect(seedOnOpen(start, machine, { remember: false, usedKg: [7] })).toBeUndefined();
    expect(standsFor(withStands([7, 14]), machine)?.kg).toEqual([7, 14]);
  });
});

describe('een stand komt alleen uit een gewicht dat je zelf intikte of bevestigde', () => {
  const rij = (id: string, over: object) => ({ id, kind: 'work', target: { weightKg: 50, repsLow: 8, repsHigh: 10 }, done: false, ...over }) as never;
  const oefening = (rows: unknown[]) => ({ slot: 's', exerciseId: machine.id, name: 'x', known: true, rows, restSec: 90 }) as never;
  it('Alles afvinken onthoudt een voorgesteld doelgewicht nooit', () => {
    const voor = oefening([rij('a', { edited: true, weightKg: 23 }), rij('b', {}), rij('c', { weightKg: 50 })]);
    const na = oefening([rij('a', { edited: true, weightKg: 23, done: true }), rij('b', { weightKg: 50, done: true }), rij('c', { weightKg: 50, done: true })]);
    expect(ownWeightsTickedAll(voor, na)).toEqual([23]);
    expect(ownWeightsTickedAll(undefined, na)).toEqual([]);
  });
  it('een beschadigde lijst blijft niet stil leeg: het toestel wordt opnieuw ingelezen', () => {
    const kapot = gym({ exerciseStandsKg: { [machine.id]: { kg: ['x'] as unknown as number[] } } });
    expect(standsFor(kapot, machine)?.stored).toBe(false);
    expect(seedStands(kapot, machine, [7])?.exerciseStandsKg?.[machine.id]).toEqual({ kg: [7] });
    expect(standsFor(withStands([]), machine)?.stored).toBe(true);
  });
  it('een oude lijst van meer dan 40 gewichten blijft zoals hij was bij Terugdraaien', () => {
    const lang = gym({ exerciseWeightRanges: { [machine.id]: [{ startKg: 1, endKg: 60, stepKg: 1 }] } });
    expect(forgetStand(lang, machine, 5)).toBeUndefined();
  });
});
