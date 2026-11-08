import { describe, expect, it } from 'vitest';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { learnedMinutesPerSet } from './durationLearning';
import { estimatedRest } from './forgeWorkout';
import { exerciseKey } from './strengthHistory';
import { capForTemplate, capLineFor, capRemovedFor, capRemovedLine, capSlots, prescribedSets, resolveTimeCap, servesMountainMuscle, timeCapLine } from './forgeTimeCap';

// Nagemaakte trainingen: geen ingebouwd sjabloon, zodat de beendag alleen uit de belasting komt.
const slot = (id: string, priority: ExercisePrescription['priority'], sets: number): ExercisePrescription => ({ id, exerciseName: id, sets, reps: '8-10', priority });

const upper: ExercisePrescription[] = [
  slot('Bankdrukken', 'core', 4),
  slot('Roeien', 'core', 4),
  slot('Schouderdrukken', 'accessory', 3),
  slot('Biceps curl', 'accessory', 3),
  slot('Triceps pushdown', 'optional', 3),
];

function template(id: string, lowerBodyLoad: 'heavy' | 'light', exercises = upper): SessionTemplate {
  return {
    id,
    name: id,
    type: 'strength',
    durationVariants: { full: 60 },
    exercises,
    baseStressProfile: { lowerBodyLoad, impact: 'none', eccentricLoad: 'light', intensity: 'moderate' },
  } as SessionTemplate;
}

describe('de instelling Hoogstens per krachttraining', () => {
  it('heeft 60 en 75 minuten als advies, en leest alleen de vaste keuzes', () => {
    expect(resolveTimeCap(undefined)).toEqual({ strength: 60, legs: 75 });
    expect(resolveTimeCap({ forgeCapStrength: 0, forgeCapLegs: 90 })).toEqual({ strength: 0, legs: 90 });
    expect(resolveTimeCap({ forgeCapStrength: 61, forgeCapLegs: 'veel' })).toEqual({ strength: 60, legs: 75 });
  });

  it('herkent een beendag aan de belasting van de benen, niet aan het id', () => {
    const setting = resolveTimeCap(undefined);
    expect(capForTemplate(template('tpl_eigen_benen', 'heavy'), setting)).toBe(75);
    expect(capForTemplate(template('tpl_eigen_boven', 'light'), setting)).toBe(60);
    // Een id dat vroeger een beendag was, met een lichte belasting: telt als gewone krachttraining.
    expect(capForTemplate(template('tpl_lower_a', 'light'), setting)).toBe(60);
    expect(capForTemplate({ ...template('tpl_loop', 'heavy'), type: 'cardio' } as SessionTemplate, setting)).toBe(0);
  });
});

describe('inkorten tot de grens', () => {
  // 17 sets in 85 minuten: 5 minuten per set.
  it('een gewone training van 85 minuten gaat naar 60: eerst het extra, dan bijwerk, de kern blijft', () => {
    const r = capSlots({ slots: upper, fullMinutes: 85, cap: 60 });
    expect(r.minutes).toBeLessThanOrEqual(60);
    const sets = Object.fromEntries(r.slots.map((s) => [s.id, prescribedSets(s)]));
    expect(sets['Bankdrukken']).toBe(4);
    expect(sets['Roeien']).toBe(4);
    expect(r.dropped).toEqual(['Triceps pushdown']);
    expect(sets['Schouderdrukken'] + sets['Biceps curl']).toBe(4);
    expect(r.setsRemoved).toBe(2);
    expect(timeCapLine(r)).toBe('Ingekort tot ongeveer 60 minuten: Triceps pushdown valt weg, net als 2 sets bijwerk.');
  });

  it('een beendag van 85 minuten gaat naar 75 met alleen sets eraf', () => {
    const r = capSlots({ slots: upper, fullMinutes: 85, cap: 75 });
    expect(r.minutes).toBeLessThanOrEqual(75);
    expect(r.dropped).toEqual([]);
    expect(r.setsRemoved).toBe(2);
    // De extra oefening levert eerst in, daarna het laatste bijwerk.
    expect(r.slots.find((s) => s.id === 'Triceps pushdown')!.sets).toBe(2);
    expect(timeCapLine(r)).toBe('Ingekort tot ongeveer 75 minuten: 2 sets bijwerk vallen weg.');
  });

  it('is de training al korter, dan verandert er niets', () => {
    const r = capSlots({ slots: upper, fullMinutes: 55, cap: 60 });
    expect(r.slots).toBe(upper);
    expect(timeCapLine(r)).toBeUndefined();
    expect(capSlots({ slots: upper, fullMinutes: 120, cap: 0 }).slots).toBe(upper);
  });

  it('een kortere variant rekent met de duur per set van de hele training', () => {
    const short = upper.filter((s) => s.priority !== 'optional');
    // 17 sets in 85 minuten; zonder het extra 14 sets, 70 minuten: past onder 75.
    expect(capSlots({ slots: short, fullSlots: upper, fullMinutes: 85, cap: 75 }).slots).toBe(short);
  });

  it('rekent met de geleerde tijd per set, ook als de geleerde duur door het inkorten korter werd', () => {
    // De training zelf leerde 60 minuten (ingekort), maar per set kost hij 5 minuten: 17 sets blijven 85.
    const r = capSlots({ slots: upper, fullMinutes: 60, minutesPerSet: 5, cap: 60 });
    expect(r.fromMinutes).toBe(85);
    expect(r.minutes).toBeLessThanOrEqual(60);
    expect(r.slots).not.toBe(upper);
  });

  it('de kern blijft altijd staan, ook boven de grens', () => {
    const r = capSlots({ slots: upper, fullMinutes: 170, cap: 45 });
    expect(r.slots.map((s) => s.id)).toEqual(['Bankdrukken', 'Roeien']);
    expect(r.coreOver).toBe(true);
    expect(timeCapLine(r)).toContain('De kernsets blijven staan');
  });

  it('haalt de laatste set van een voorschrift per set weg', () => {
    const targets = [{ repsLow: 8, repsHigh: 10, rir: 2 }, { repsLow: 8, repsHigh: 10, rir: 2 }, { repsLow: 8, repsHigh: 10, rir: 1 }];
    const list = [slot('Kern', 'core', 3), { ...slot('Bij', 'accessory', 3), setTargets: targets }];
    const r = capSlots({ slots: list, fullMinutes: 60, cap: 50 });
    const bij = r.slots.find((s) => s.id === 'Bij')!;
    expect(bij.setTargets).toEqual(targets.slice(0, 2));
    expect(bij.sets).toBe(2);
  });
});

describe('de regel na heropenen', () => {
  const rows = (n: number, done = false) => [{ kind: 'warmup' }, ...Array.from({ length: n }, () => ({ kind: 'work', done }))];
  const r = capSlots({ slots: upper, fullMinutes: 85, cap: 60 });

  it('een vers geopende sessie zegt hetzelfde als het inkorten', () => {
    const fresh = r.slots.map((s) => ({ slot: s.id, rows: rows(prescribedSets(s)) }));
    expect(capLineFor(r, fresh)).toBe(timeCapLine(r));
  });

  it('een concept dat de volle sets hield en een weggevallen oefening met afgevinkte sets: dan viel er niets weg', () => {
    const draft = upper.map((s) => ({ slot: s.id, rows: rows(s.sets, s.id === 'Triceps pushdown') }));
    expect(capLineFor(r, draft)).toBeUndefined();
  });

  it('alleen de weggevallen oefening staat er nog: de sets bijwerk blijven in de regel', () => {
    const draft = [...r.slots.map((s) => ({ slot: s.id, rows: rows(prescribedSets(s)) })), { slot: 'Triceps pushdown', rows: rows(3, true) }];
    expect(capLineFor(r, draft)).toBe('Ingekort tot ongeveer 75 minuten: 2 sets bijwerk vallen weg.');
  });
});

describe('met de tijd per set uit je eigen logs', () => {
  // Nagemaakte logs met de aantallen werksets en minuten uit de probe: 11, 20, 11 en 20 werksets in 45, 70, 49 en 110 min.
  const upperB = buildDefaultProgramData().templates.find((t) => t.id === 'tpl_upper_b')!;
  const log = (i: number, minutes: number, work: number): SessionLog => ({
    id: `b${i}`, templateId: 'tpl_upper_b', type: 'strength', completedDate: `2026-10-0${i}`, completedAt: `2026-10-0${i}T18:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
    strengthData: [{ exerciseId: 'x', exerciseName: 'X', sets: [{ reps: 5, kind: 'warmup' }, ...Array.from({ length: work }, () => ({ reps: 8 }))] }],
  });
  const logs = [log(1, 45, 11), log(2, 70, 20), log(3, 49, 11), log(4, 110, 20)];

  it('Bovenlichaam B komt onder 60 uit met ingekorte sets, de kern blijft', () => {
    const perSet = learnedMinutesPerSet(upperB, logs);
    expect(perSet).toBeGreaterThan(4);
    expect(perSet).toBeLessThan(4.5);
    const slots = upperB.exercises!;
    const r = capSlots({ slots, fullMinutes: upperB.durationVariants.full, minutesPerSet: perSet, cap: 60 });
    expect(r.fromMinutes).toBeGreaterThan(90);
    expect(r.minutes).toBeLessThanOrEqual(60);
    expect(r.setsRemoved + r.dropped.length).toBeGreaterThan(0);
    for (const core of slots.filter((s) => s.priority === 'core')) expect(r.slots.find((s) => s.id === core.id)?.sets).toBe(core.sets);
    expect(timeCapLine(r)).toMatch(/^Ingekort tot ongeveer (55|60) minuten/);
  });

  it('ook met de pull-up als bijwerk, zoals in een opgeslagen sjabloon van voor deze wijziging', () => {
    const slots = upperB.exercises!.map((s) => (s.id === 'ex17' ? { ...s, priority: 'accessory' as const } : s));
    const r = capSlots({ slots, fullMinutes: 75, minutesPerSet: learnedMinutesPerSet(upperB, logs), cap: 60 });
    expect(r.minutes).toBeLessThanOrEqual(60);
    expect(r.slots.find((s) => s.id === 'ex17')?.sets).toBe(2);
  });
});

describe('bij een bergdoel vallen de bergspieren als laatste weg', () => {
  // Nagemaakt, in de geest van een beendag: kern, bijwerk met een kuitoefening en een step-down, extra met plank.
  const named = (id: string, exerciseName: string, priority: ExercisePrescription['priority'], sets: number): ExercisePrescription => ({ id, exerciseName, sets, reps: '10-12', priority });
  const legs: ExercisePrescription[] = [
    named('k1', 'Barbell Back Squat', 'core', 4),
    named('k2', 'Romanian Deadlift', 'core', 3),
    named('b1', 'Pin-Loaded Leg Press Calf Raise', 'accessory', 3),
    named('b2', 'Leg Extension', 'accessory', 3),
    named('b3', 'Lying Leg Curl', 'accessory', 3),
    named('b4', 'Step-Down', 'accessory', 3),
    named('o1', 'Plank', 'optional', 3),
  ];
  // 22 sets in 132 minuten: 6 per set; onder 75 passen 12 sets.
  const args = { slots: legs, fullMinutes: 132, cap: 75 };

  it('herkent kuit en step-down als bergspier, beenstrekken en plank niet', () => {
    expect(legs.filter((s) => s.priority !== 'core' && servesMountainMuscle(s)).map((s) => s.id)).toEqual(['b1', 'b4']);
  });

  it('zonder bergdoel vallen ook de kuit en de step-down weg', () => {
    const r = capSlots(args);
    expect(r.minutes).toBeLessThanOrEqual(75);
    expect(r.dropped).toEqual(expect.arrayContaining(['Plank', 'Step-Down']));
  });

  it('met een bergdoel vallen eerst de andere oefeningen, en houden kuit en step-down minstens een set', () => {
    const r = capSlots({ ...args, keep: servesMountainMuscle });
    expect(r.minutes).toBeLessThanOrEqual(75);
    const ids = r.slots.map((s) => s.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('b4');
    expect(ids).not.toContain('o1');
    expect(r.slots.find((s) => s.id === 'k1')!.sets).toBe(4);
    expect(r.slots.find((s) => s.id === 'k2')!.sets).toBe(3);
    // Eerder gaat er een set af van de kuit en de step-down dan dat ze helemaal wegvallen.
    expect(r.slots.find((s) => s.id === 'b1')!.sets).toBeGreaterThanOrEqual(1);
  });
});

describe('ronde met echte namen uit de ingebouwde beendag', () => {
  it('herkent de kuitheffing op de beenpers als kuit, ook met het id van het sjabloon', () => {
    expect(servesMountainMuscle({ id: 'ex12', exerciseName: 'Pin-Loaded Leg Press Calf Raise' })).toBe(true);
    expect(servesMountainMuscle({ id: 'ex24', exerciseName: 'Seated Pin-Loaded Machine Calf Raise' })).toBe(true);
    expect(servesMountainMuscle({ id: 'ex10', exerciseName: 'Seated Hamstring Curl' })).toBe(false);
  });

  it('een kuitheffing als extra blijft staan zolang een gewone bijwerkoefening weg kan', () => {
    const named = (id: string, exerciseName: string, priority: ExercisePrescription['priority'], sets: number): ExercisePrescription => ({ id, exerciseName, sets, reps: '10-12', priority });
    // Nagemaakt in de vorm van Benen A: de kuitheffing staat als extra, de hamstringcurl als bijwerk.
    const legs = [
      named('ex7', 'Barbell Back Squat', 'core', 4),
      named('ex8', 'Romanian Deadlift', 'core', 3),
      named('ex9', 'Bulgarian Split Squat', 'accessory', 3),
      named('ex10', 'Seated Hamstring Curl', 'accessory', 3),
      named('ex11', 'Step-Down', 'accessory', 3),
      named('ex12', 'Pin-Loaded Leg Press Calf Raise', 'optional', 3),
      named('ex13', 'Plank', 'optional', 3),
    ];
    // 22 sets, 6 minuten per set: 132 minuten; onder 75 passen 12 sets.
    const r = capSlots({ slots: legs, fullMinutes: 132, cap: 75, keep: servesMountainMuscle });
    expect(r.minutes).toBeLessThanOrEqual(75);
    const ids = r.slots.map((s) => s.id);
    expect(ids).toContain('ex12');
    expect(ids).toContain('ex11');
    expect(ids).not.toContain('ex10');
    expect(ids).not.toContain('ex13');
  });

  it('komt de kern alleen al boven de grens, dan zegt de regel dat eerlijk', () => {
    // Bovenlichaam B met de pull-up als kern: 14 kernsets, ruim 4,6 minuten per set is boven de 60.
    const upperB = buildDefaultProgramData().templates.find((t) => t.id === 'tpl_upper_b')!;
    const r = capSlots({ slots: upperB.exercises!, fullMinutes: 75, minutesPerSet: 4.65, cap: 60 });
    expect(r.coreOver).toBe(true);
    expect(r.slots.every((s) => s.priority === 'core')).toBe(true);
    expect(timeCapLine(r)).toMatch(/^Ingekort tot ongeveer 65 minuten: .* De kernsets blijven staan, ook al kom je dan boven de 60\.$/);
  });
});

describe('Cable Rope High Row met 3 sets in het programma (inbox 7 november)', () => {
  // Vier oefeningen van 3 tot 4 sets, zoals een programma van MacroFactor ze geeft; de high row is bijwerk.
  const named = (id: string, exerciseName: string, priority: ExercisePrescription['priority'], sets: number, reps = '8-10'): ExercisePrescription => ({ id, exerciseName, sets, reps, priority });
  const program = [
    named('a', 'Barbell Bench Press', 'core', 4, '6-8'),
    named('b', 'Chest-Supported Dumbbell Row', 'core', 4),
    named('c', 'Cable Rope High Row', 'accessory', 3, '10-12'),
    named('d', 'Standing Dumbbell Lateral Raise', 'accessory', 3, '12-15'),
  ];

  it('de tijdsgrens haalt er een set af: 3 wordt 2, en de oefening zegt het', () => {
    // 14 sets in een geplande training van 66 minuten: 4,7 minuten per set, boven de 60.
    const r = capSlots({ slots: program, fullMinutes: 66, cap: 60 });
    const row = r.slots.find((s) => s.id === 'c')!;
    expect(prescribedSets(row)).toBe(2);
    expect(r.setsRemoved).toBe(2);
    const fresh = (s: ExercisePrescription) => ({ slot: s.id, rows: Array.from({ length: prescribedSets(s) }, () => ({ kind: 'work' })) });
    expect(capRemovedFor(r, fresh(row))).toBe(1);
    expect(capRemovedLine(1)).toBe('1 set weg door je tijdsgrens');
    expect(capRemovedLine(2)).toBe('2 sets weg door je tijdsgrens');
    // De kern en een oefening die niet inkortte zeggen niets.
    expect(capRemovedFor(r, fresh(r.slots[0]))).toBe(0);
    expect(capRemovedFor(r, { slot: 'bestaat-niet', rows: [] })).toBe(0);
  });

  it('een set terugzetten (Set toevoegen) telt af, en een set die jij weghaalde telt niet als tijdsgrens', () => {
    const r = capSlots({ slots: program, fullMinutes: 66, cap: 60 });
    const work = (n: number) => Array.from({ length: n }, () => ({ kind: 'work' }));
    expect(capRemovedFor(r, { slot: 'c', rows: [{ kind: 'warmup' }, ...work(2)] })).toBe(1);
    expect(capRemovedFor(r, { slot: 'c', rows: work(3) })).toBe(0);
    // Jij haalde een set weg uit wat er stond: die staat bij "Terugzetten" van jou, niet bij de tijdsgrens.
    expect(capRemovedFor(r, { slot: 'c', rows: work(1), dropped: [{}] })).toBe(1);
  });

  it('60 minuten past van onderaf gerekend net: 2:00 rust en drie opwarmsets bij 14 sets', () => {
    // Per werkset ongeveer 45 seconden werk plus de rust van Forge (estimatedRest), per eerste zware oefening drie
    // opwarmsets van een halve minuut met 90 seconden rust, bij de andere oefeningen een opwarmset (al warm).
    const SET_SEC = 45;
    const seconds = program.reduce((sum, s, i) => {
      const ex = exerciseKey(s.id, s.exerciseName).exercise;
      const high = Number(s.reps.split('-').at(-1));
      const warm = i === 0 ? 3 : 1;
      return sum + prescribedSets(s) * (SET_SEC + estimatedRest(ex, high)) + warm * (30 + 90);
    }, 0);
    const minutes = seconds / 60;
    // Ongeveer 53 minuten: het past, maar met weinig lucht (een vierde set bij elke oefening zou erboven komen).
    expect(minutes).toBeGreaterThan(45);
    expect(minutes).toBeLessThan(60);
    // De grens grijpt dus niet in door de rust, maar door de duur per set uit de geplande duur of je logs:
    // 14 sets in 60 minuten is 4,3 minuten per set, boven de ongeveer 3,8 minuten die de rust en de opwarmsets vragen.
    expect(minutes / 14).toBeLessThan(4);
  });
});
