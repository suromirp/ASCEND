import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import {
  mergeDraft,
  resumeDraft,
  activeRow,
  applyReps,
  applyWeight,
  carryChange,
  copyRow,
  dockFieldKey,
  makeSnap,
  plateClosest,
  plateShortText,
  exerciseComplete,
  exerciseSummary,
  nextField,
  plateChange,
  plateGroups,
  plateHeight,
  plateSentence,
  plateSideText,
  plateTone,
  pressKey,
  removeRow,
  stepNumber,
  takeTarget,
  textToNumber,
  weightStepFor,
} from './forgeInput';
import { plateLoad, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { DEFAULT_PROFILE } from './strengthSettings';

const row = (id: string, over: Partial<WorkoutRow> = {}): WorkoutRow => ({
  id,
  kind: 'work',
  target: { weightKg: 47.5, repsLow: 11, repsHigh: 13, rir: 2 },
  weightKg: 47.5,
  reps: 12,
  rir: 2,
  done: false,
  ...over,
});

const ex = (slot: string, rows: WorkoutRow[], over: Partial<WorkoutExercise> = {}): WorkoutExercise => ({ slot, exerciseId: slot, name: slot, known: false, rows, restSec: 120, timed: false, ...over });

describe('weightStepFor', () => {
  const p = DEFAULT_PROFILE;
  it('een stang gaat per paar kleinste schijven', () => {
    expect(weightStepFor(exerciseById('barbell-row'), p, 50)).toBe(2.5);
  });
  it('een dumbbell volgt je rek: fijn onderaan, grover daarboven', () => {
    const db = exerciseById('goblet-squat');
    expect(weightStepFor(db, p, 6)).toBe(p.dumbbells.stepKg);
    expect(weightStepFor(db, p, 20)).toBe(p.dumbbells.thenStepKg);
  });
  it('een eigen stap voor de oefening wint', () => {
    expect(weightStepFor(exerciseById('barbell-row'), { ...p, exerciseStepKg: { 'barbell-row': 1 } }, 50)).toBe(1);
  });
  it('een onbekende oefening gebruikt de stap van het toestel', () => {
    expect(weightStepFor(undefined, p, 30)).toBe(p.stackStepKg);
  });
});

describe('stepNumber', () => {
  it('telt op en af en blijft binnen de grenzen', () => {
    expect(stepNumber(47.5, 1, 2.5, 0, 500)).toBe(50);
    expect(stepNumber(1.25, -1, 2.5, 0, 500)).toBe(0);
    expect(stepNumber(499, 1, 2.5, 0, 500)).toBe(500);
    expect(stepNumber(undefined, 1, 1, 0, 100)).toBe(1);
  });
  it('rekent zonder afrondingsfouten', () => {
    expect(stepNumber(0.1, 1, 0.2, 0, 10)).toBe(0.3);
  });
});

describe('pressKey', () => {
  const kg = { decimals: 2, fresh: false };
  it('het eerste cijfer na een tik vervangt het getal', () => {
    expect(pressKey('47,5', '3', { decimals: 2, fresh: true })).toBe('3');
    expect(pressKey('47,5', 'back', { decimals: 2, fresh: true })).toBe('');
  });
  it('bouwt een getal met komma op', () => {
    let t = '';
    for (const k of ['4', '7', ',', '5'] as const) t = pressKey(t, k, kg);
    expect(t).toBe('47,5');
    expect(textToNumber(t, 2)).toBe(47.5);
  });
  it('een komma aan het begin wordt 0,', () => {
    expect(pressKey('', ',', kg)).toBe('0,');
  });
  it('maar één komma, hoogstens twee decimalen en drie cijfers voor de komma', () => {
    expect(pressKey('4,5', ',', kg)).toBe('4,5');
    expect(pressKey('4,25', '1', kg)).toBe('4,25');
    expect(pressKey('123', '4', kg)).toBe('123');
  });
  it('herhalingen kennen geen komma', () => {
    expect(pressKey('1', ',', { decimals: 0, fresh: false })).toBe('1');
  });
  it('een nul vooraan verdwijnt', () => {
    expect(pressKey('0', '5', kg)).toBe('5');
  });
  it('wissen haalt het laatste teken weg', () => {
    expect(pressKey('47,5', 'back', kg)).toBe('47,');
    expect(pressKey('', 'back', kg)).toBe('');
  });
});

describe('nextField', () => {
  const w = [ex('a', [row('a1'), row('a2', { done: true }), row('a3')]), ex('b', [row('b1')]), ex('c', [row('c1', { done: true })])];
  it('van kg naar herhalingen van dezelfde set', () => {
    expect(nextField(w, { slot: 'a', rowId: 'a1', field: 'weightKg' })).toEqual({ slot: 'a', rowId: 'a1', field: 'reps' });
  });
  it('van herhalingen naar de volgende open set, een afgevinkte over te slaan', () => {
    expect(nextField(w, { slot: 'a', rowId: 'a1', field: 'reps' })).toEqual({ slot: 'a', rowId: 'a3', field: 'weightKg' });
  });
  it('na de laatste set van een oefening naar de volgende oefening', () => {
    expect(nextField(w, { slot: 'a', rowId: 'a3', field: 'reps' })).toEqual({ slot: 'b', rowId: 'b1', field: 'weightKg' });
  });
  it('aan het eind van de training is er geen volgend veld', () => {
    expect(nextField(w, { slot: 'b', rowId: 'b1', field: 'reps' })).toBeUndefined();
  });
  it('een tijdsoefening heeft geen velden', () => {
    const t = [ex('a', [row('a1')]), ex('plank', [row('p1')], { timed: true }), ex('z', [row('z1')])];
    expect(nextField(t, { slot: 'a', rowId: 'a1', field: 'reps' })).toEqual({ slot: 'z', rowId: 'z1', field: 'weightKg' });
  });
});

describe('activeRow en exerciseComplete', () => {
  const w = [ex('a', [row('a1', { done: true }), row('a2')]), ex('b', [row('b1'), row('b2')])];
  it('is de eerste open set', () => {
    expect(activeRow(w)).toEqual({ slot: 'a', rowId: 'a2' });
  });
  it('na een set komt de volgende open set, ook in de volgende oefening', () => {
    expect(activeRow(w, { slot: 'a', rowId: 'a2' })).toEqual({ slot: 'b', rowId: 'b1' });
  });
  it('slaat rond naar een eerdere open set als er achteraan niets meer is', () => {
    expect(activeRow([ex('a', [row('a1'), row('a2', { done: true })])], { slot: 'a', rowId: 'a2' })).toEqual({ slot: 'a', rowId: 'a1' });
  });
  it('zonder open set is er geen actieve set', () => {
    expect(activeRow([ex('a', [row('a1', { done: true })])])).toBeUndefined();
  });
  it('een oefening is klaar als elke set is afgevinkt', () => {
    expect(exerciseComplete(w[0])).toBe(false);
    expect(exerciseComplete(ex('a', [row('a1', { done: true })]))).toBe(true);
    expect(exerciseComplete(ex('a', []))).toBe(false);
  });
  it('een opwarmset die je niet afvinkte houdt de oefening niet open', () => {
    expect(exerciseComplete(ex('a', [row('w1', { kind: 'warmup' }), row('a1', { done: true })]))).toBe(true);
    expect(exerciseComplete(ex('a', [row('w1', { kind: 'warmup', done: true }), row('a1')]))).toBe(false);
  });
});

describe('applyWeight: doorgeven aan volgende sets', () => {
  const base = ex('a', [row('a1'), row('a2', { weightKg: 45, target: { weightKg: 45, repsLow: 11, repsHigh: 13 } }), row('a3', { weightKg: 42.5 })]);
  it('neemt hetzelfde verschil mee naar sets die je niet aanraakte', () => {
    const r = applyWeight(base, 'a1', 50, true);
    expect(r.rows.map((x) => x.weightKg)).toEqual([50, 47.5, 45]);
  });
  it('laat een set met rust die je zelf aanpaste of afvinkte', () => {
    const touched = { ...base, rows: [base.rows[0], { ...base.rows[1], edited: true }, { ...base.rows[2], done: true }] };
    expect(applyWeight(touched, 'a1', 50, true).rows.map((x) => x.weightKg)).toEqual([50, 45, 42.5]);
  });
  it('zonder doorgeven verandert alleen die ene set', () => {
    expect(applyWeight(base, 'a1', 50, false).rows.map((x) => x.weightKg)).toEqual([50, 45, 42.5]);
  });
  it('een set die je aanpast telt vanaf nu als aangeraakt', () => {
    expect(applyWeight(base, 'a1', 50, true).rows[0].edited).toBe(true);
  });
  it('geeft een opwarmset niet door aan de werksets', () => {
    const w = ex('a', [row('w1', { kind: 'warmup', weightKg: 20 }), row('a1')]);
    expect(applyWeight(w, 'w1', 30, true).rows[1].weightKg).toBe(47.5);
  });
  it('rekent steeds vanaf het begin, dus 4 en dan 45 geeft hetzelfde als 45', () => {
    const viaFour = applyWeight(base, 'a1', 45, true);
    expect(viaFour).toEqual(applyWeight(base, 'a1', 45, true));
    const low = applyWeight(base, 'a1', 4, true);
    expect(low.rows[2].weightKg).toBe(0);
    expect(applyWeight(base, 'a1', 45, true).rows[2].weightKg).toBe(40);
  });
  it('een leeg veld verandert de volgende sets niet', () => {
    expect(applyWeight(base, 'a1', undefined, true).rows.map((x) => x.weightKg)).toEqual([undefined, 45, 42.5]);
  });
  it('schrijft nooit de afgevinkte historie om: de oude waarden blijven in de basis staan', () => {
    applyWeight(base, 'a1', 60, true);
    expect(base.rows[1].weightKg).toBe(45);
  });
});

describe('hulp van een toestel blijft hulp', () => {
  const help = (id: string, kg: number) => row(id, { weightKg: kg, target: { weightKg: kg, repsLow: 6, repsHigh: 8, rir: 1 } });
  const base = ex('p', [help('p1', -25), help('p2', -25), help('p3', -25)]);
  it('meer hulp bij set 1 gaat mee naar de volgende sets, nooit naar 0', () => {
    expect(applyWeight(base, 'p1', -30, true, undefined, -500).rows.map((x) => x.weightKg)).toEqual([-30, -30, -30]);
    expect(applyWeight(base, 'p1', -20, true, undefined, -500).rows.map((x) => x.weightKg)).toEqual([-20, -20, -20]);
  });
  it('een gewone oefening zakt nooit onder 0', () => {
    const plain = ex('q', [row('q1', { weightKg: 5 }), row('q2', { weightKg: 2.5 })]);
    expect(applyWeight(plain, 'q1', 0, true).rows.map((x) => x.weightKg)).toEqual([0, 0]);
  });
});

describe('doorgegeven gewicht rondt af op wat je sportschool kan maken', () => {
  const bar = exerciseById('barbell-row')!;
  const p = DEFAULT_PROFILE;
  const base = ex('a', [row('a1', { weightKg: 47.5 }), row('a2', { weightKg: 45 }), row('a3', { weightKg: 42.5 }), row('a4', { weightKg: 40 })], { exerciseId: 'barbell-row', known: true });
  it('een stang: 45,5 geeft geen set met schijven die ontbreken', () => {
    const r = applyWeight(base, 'a1', 45.5, true, makeSnap(bar, p, undefined, 45.5));
    for (const x of r.rows.slice(1)) {
      expect(plateLoad(x.weightKg!, bar, p)!.shortKg).toBe(0);
    }
    expect(r.rows.slice(1).map((x) => x.weightKg)).toEqual([42.5, 40, 37.5]);
  });
  it('wat je zelf intikt blijft zoals je het intikte', () => {
    const r = applyWeight(base, 'a1', 45.5, true, makeSnap(bar, p, undefined, 45.5));
    expect(r.rows[0].weightKg).toBe(45.5);
  });
  it('een toestel met stapjes van 5 rondt af op 5', () => {
    const cable = exerciseById('seated-cable-row')!;
    const snap = makeSnap(cable, p, undefined, 41);
    expect(snap(37.4)).toBe(35);
    expect(snap(38)).toBe(40);
  });
  it('een dumbbell rondt af op je rek', () => {
    const goblet = exerciseById('goblet-squat')!;
    const snap = makeSnap(goblet, p, undefined, 17);
    expect(snap(17)).toBe(17.5);
  });
  it('zonder rondmaker blijft het verschil kaal (de aanroeper kiest)', () => {
    expect(applyWeight(base, 'a1', 45.5, true).rows[1].weightKg).toBe(43);
  });
  it('de waarschuwing noemt het dichtstbijzijnde gewicht', () => {
    const load = plateLoad(45.5, bar, p)!;
    expect(load.shortKg).toBeGreaterThan(0);
    expect(plateClosest(load)).toBe(45);
    expect(plateShortText(load)).toBe('kan niet precies, dichtstbij 45');
  });
});

describe('takeTarget en applyReps', () => {
  it('een tik op het voorschrift neemt kg en herhalingen over, de RIR blijft een hint', () => {
    const w = ex('a', [row('a1', { weightKg: 40, reps: 5, rir: undefined })]);
    const r = takeTarget(w, 'a1').rows[0];
    expect(r).toMatchObject({ weightKg: 47.5, reps: 12, edited: true });
    expect(r.rir).toBeUndefined();
    const mine = ex('a', [row('a1', { weightKg: 40, reps: 5, rir: 0 })]);
    expect(takeTarget(mine, 'a1').rows[0].rir).toBe(0);
  });
  it('een afgevinkte set blijft zoals hij was', () => {
    const w = ex('a', [row('a1', { weightKg: 40, done: true })]);
    expect(takeTarget(w, 'a1').rows[0].weightKg).toBe(40);
  });
  it('bij een set tot falen is het onderste getal het voorschrift', () => {
    const w = ex('a', [row('a1', { reps: 3, target: { repsLow: 9, repsHigh: 9, failure: true } })]);
    expect(takeTarget(w, 'a1').rows[0].reps).toBe(9);
  });
  it('herhalingen aanpassen markeert de set als aangeraakt', () => {
    expect(applyReps(ex('a', [row('a1')]), 'a1', 10).rows[0]).toMatchObject({ reps: 10, edited: true });
  });
});

describe('copyRow en removeRow', () => {
  const w = ex('a', [row('a1', { done: true }), row('a2'), row('a3')]);
  it('een kopie komt onder de set, niet afgevinkt', () => {
    const r = copyRow(w, 'a1');
    expect(r.rows).toHaveLength(4);
    expect(r.rows[1]).toMatchObject({ done: false, weightKg: 47.5 });
    expect(r.rows[1].id).not.toBe('a1');
  });
  it('een open set gaat weg', () => {
    expect(removeRow(w, 'a2').rows.map((x) => x.id)).toEqual(['a1', 'a3']);
  });
  it('een afgevinkte set en de laatste set blijven staan', () => {
    expect(removeRow(w, 'a1')).toBe(w);
    const one = ex('a', [row('a1')]);
    expect(removeRow(one, 'a1')).toBe(one);
  });
});

describe('exerciseSummary', () => {
  it('noemt het aantal sets en de zwaarste', () => {
    const w = ex('a', [row('a1', { done: true, weightKg: 47.5, reps: 12 }), row('a2', { done: true, weightKg: 45, reps: 13 }), row('w', { kind: 'warmup', done: true, weightKg: 20 })]);
    expect(exerciseSummary(w)).toBe('2 sets, zwaarste 47,5 kg × 12');
  });
  it('zonder gewicht telt de herhalingen', () => {
    expect(exerciseSummary(ex('a', [row('a1', { done: true, weightKg: undefined, reps: 15 })]))).toBe('1 set, 15 herhalingen');
  });
  it('een tijdsoefening noemt alleen de sets', () => {
    expect(exerciseSummary(ex('a', [row('a1', { done: true })], { timed: true }))).toBe('1 set');
  });
});

describe('schijven vertellen', () => {
  it('groepeert per gewicht, zwaarste eerst', () => {
    expect(plateGroups([2.5, 15, 15])).toEqual([{ kg: 15, count: 2 }, { kg: 2.5, count: 1 }]);
  });
  it('een rustige kleur per gewicht uit de tokens, een onbekende valt terug', () => {
    expect(plateTone(5)).toBe('var(--color-plate-3)');
    expect(plateTone(7)).toBe('var(--color-plate-other)');
    expect(new Set([1.25, 2.5, 5, 10, 15, 20, 25].map(plateTone)).size).toBe(7);
  });
  it('een zwaardere schijf wordt hoger getekend, tot een grens', () => {
    expect(plateHeight(1.25)).toBeLessThan(plateHeight(5));
    expect(plateHeight(5)).toBeLessThan(plateHeight(20));
    expect(plateHeight(25)).toBe(1);
  });
  it('de regel per kant en de som', () => {
    expect(plateSideText({ perSide: [15, 2.5] })).toBe('15 + 2,5');
    expect(plateSideText({ perSide: [] })).toBe('alleen de stang');
    expect(plateSentence({ barKg: 20, perSide: [5, 2.5] })).toBe('7,5 kg per kant + stang 20 kg = 35 kg');
    expect(plateSentence({ barKg: 0, perSide: [10] })).toBe('10 kg per kant = 20 kg');
  });
  it('wat er bij of af moet', () => {
    expect(plateChange({ add: [2.5], remove: [] })).toBe('Erbij 1 × 2,5.');
    expect(plateChange({ add: [2.5, 2.5], remove: [1.25] })).toBe('Erbij 2 × 2,5, eraf 1 × 1,25.');
    expect(plateChange({ add: [], remove: [] })).toBeUndefined();
  });
});

describe('een training van voor een naamswijziging', () => {
  const old = [ex('ex14', [row('o1')], { name: 'Chest press / bench' }), ex('ex16', [row('o2', { done: true })], { name: 'Row' }), ex('ex17', [row('o3')], { name: 'Pulldown', swappedFrom: 'Pull-up' })];
  const fresh = [ex('ex14', [row('n1')], { name: 'Machine Chest Press' }), ex('ex16', [row('n2')], { name: 'Chest-Supported Dumbbell Row' }), ex('ex17', [row('n3')], { name: 'Assisted Pull-Up' })];
  it('een onaangeraakte oefening krijgt het plan van nu, wat je deed of ruilde blijft', () => {
    expect(mergeDraft(old, fresh).map((e) => e.name)).toEqual(['Machine Chest Press', 'Row', 'Pulldown']);
  });
  it('een set die je toevoegde telt ook als aangeraakt', () => {
    const added = [ex('ex14', [row('o1'), row('o1b')], { name: 'Chest press / bench' })];
    expect(mergeDraft(added, [fresh[0]])[0].name).toBe('Chest press / bench');
  });
  it('een afgevinkte oefening die niet meer in de training staat blijft achteraan', () => {
    expect(mergeDraft([...old, ex('ex99', [row('x', { done: true })], { name: 'Oud' })], fresh).map((e) => e.name)).toContain('Oud');
  });
});

describe('een concept en de keuze Lichter', () => {
  const draft = (done: boolean) => [ex('a', [row('d1', { weightKg: 80, reps: 8, done })], { name: 'Squat' })];
  const lighter = [ex('a', [row('n1', { weightKg: 70 })], { name: 'Squat' })];
  const normal = [ex('a', [row('n2', { weightKg: 80 })], { name: 'Squat' })];
  it('Lichter gekozen na het concept: opnieuw gepland zolang er niets is afgevinkt', () => {
    expect(resumeDraft(draft(false), false, true, lighter)).toBe(lighter);
    expect(resumeDraft(draft(false), undefined, true, lighter)).toBe(lighter);
  });
  it('Terugzetten na het concept: opnieuw gepland zonder Lichter', () => {
    expect(resumeDraft(draft(false), true, false, normal)).toBe(normal);
  });
  it('een afgevinkte set blijft altijd staan', () => {
    expect(resumeDraft(draft(true), false, true, lighter)[0].rows[0].id).toBe('d1');
    expect(resumeDraft(draft(true), true, false, normal)[0].rows[0].done).toBe(true);
  });
  it('gelijke keuze: wat je aanraakte blijft zoals het is', () => {
    const typed = [ex('a', [row('d1', { weightKg: 80, reps: 8, edited: true })], { name: 'Squat' })];
    expect(resumeDraft(typed, true, true, lighter)[0].rows[0].id).toBe('d1');
    expect(resumeDraft(typed, undefined, false, normal)[0].rows[0].id).toBe('d1');
  });
  it('gelijke keuze, niets aangeraakt: het plan van nu (een nieuwe regel geldt ook voor een geopend concept)', () => {
    expect(resumeDraft(draft(false), undefined, false, normal)[0].rows[0].id).toBe('n2');
  });
});

describe('carryChange: wijzigingen doorvoeren naar gelijke sets', () => {
  const three = () => ex('a', [row('a1', { weightKg: 40, reps: 10 }), row('a2', { weightKg: 40, reps: 10 }), row('a3', { weightKg: 40, reps: 10 })]);

  it('een nieuw gewicht gaat naar de open sets met hetzelfde gewicht en dezelfde herhalingen', () => {
    const before = three();
    const after = carryChange(before, applyWeight(before, 'a1', 45, false), 'a1', 'weightKg');
    expect(after.rows.map((r) => r.weightKg)).toEqual([45, 45, 45]);
    expect(after.rows.map((r) => r.reps)).toEqual([10, 10, 10]);
    expect(after.rows.map((r) => !!r.edited)).toEqual([true, false, false]);
  });

  it('typen via een leeg veld: steeds vanaf de stand bij het openen, dan gaan de gelijke sets mee', () => {
    const base = three();
    let out = base;
    for (const v of [1, undefined, 8]) out = carryChange(base, applyReps(base, 'a1', v), 'a1', 'reps');
    expect(out.rows.map((r) => r.reps)).toEqual([8, 8, 8]);
  });

  it('gewicht en herhalingen apart: alleen het gewicht veranderen laat de herhalingen staan', () => {
    const before = three();
    const after = carryChange(before, applyWeight(before, 'a1', 45, false), 'a1', 'weightKg');
    expect(after.rows[1].reps).toBe(10);
    const reps = carryChange(before, applyReps(before, 'a1', 8), 'a1', 'reps');
    expect(reps.rows.map((r) => r.reps)).toEqual([8, 8, 8]);
    expect(reps.rows.map((r) => r.weightKg)).toEqual([40, 40, 40]);
  });

  it('een set met ander gewicht of andere herhalingen, een gedane, een zelf aangepaste en een opwarmset blijven staan', () => {
    const before = ex('a', [
      row('w', { kind: 'warmup', weightKg: 40, reps: 10 }),
      row('a1', { weightKg: 40, reps: 10 }),
      row('a2', { weightKg: 40, reps: 10, done: true }),
      row('a3', { weightKg: 40, reps: 10, edited: true }),
      row('a4', { weightKg: 42.5, reps: 10 }),
      row('a5', { weightKg: 40, reps: 8 }),
      row('a6', { weightKg: 40, reps: 10 }),
    ]);
    const after = carryChange(before, applyWeight(before, 'a1', 45, false), 'a1', 'weightKg');
    expect(after.rows.map((r) => r.weightKg)).toEqual([40, 45, 40, 40, 42.5, 40, 45]);
  });

  it('sets voor de gewijzigde set volgen niet, de RIR ook niet', () => {
    const before = ex('a', [row('a1', { weightKg: 40, reps: 10, rir: 3 }), row('a2', { weightKg: 40, reps: 10, rir: 1 }), row('a3', { weightKg: 40, reps: 10 })]);
    const after = carryChange(before, applyReps(before, 'a2', 9), 'a2', 'reps');
    expect(after.rows.map((r) => r.reps)).toEqual([10, 9, 9]);
    expect(after.rows.map((r) => r.rir)).toEqual([3, 1, 2]);
  });

  it('een gewijzigde opwarmset voert niets door, en een leeg veld ook niet', () => {
    const before = ex('a', [row('w', { kind: 'warmup', weightKg: 40, reps: 10 }), row('a1', { weightKg: 40, reps: 10 })]);
    expect(carryChange(before, applyReps(before, 'w', 5), 'w', 'reps').rows[1].reps).toBe(10);
    expect(carryChange(before, applyReps(before, 'a1', undefined), 'a1', 'reps')).toEqual(applyReps(before, 'a1', undefined));
  });

  it('een tweede wijziging van de volgende set gaat op dezelfde manier verder (geen kettingreactie terug)', () => {
    const first = carryChange(three(), applyReps(three(), 'a1', 8), 'a1', 'reps');
    const second = carryChange(first, applyReps(first, 'a2', 6), 'a2', 'reps');
    expect(second.rows.map((r) => r.reps)).toEqual([8, 6, 6]);
  });

  it('samen met Lichter: een set die Lichter lichter zette volgt een wijziging van het oude gewicht niet', () => {
    const lighter = three();
    lighter.rows[2] = { ...lighter.rows[2], weightKg: 37.5 };
    const after = carryChange(lighter, applyWeight(lighter, 'a1', 45, false), 'a1', 'weightKg');
    expect(after.rows.map((r) => r.weightKg)).toEqual([45, 45, 37.5]);
  });

  it('takeTarget zet de voorgeschreven waarden alleen in die set en er volgt niets', () => {
    const before = three();
    const taken = takeTarget(before, 'a1');
    expect(taken.rows[1]).toEqual(before.rows[1]);
    // Een set die door doorvoer veranderde is niet aangepast en kan het voorschrift nog nemen.
    const carried = carryChange(before, applyWeight(before, 'a1', 45, false), 'a1', 'weightKg');
    expect(takeTarget(carried, 'a2').rows[1]).toMatchObject({ weightKg: 47.5, edited: true });
  });
});

describe('dockFieldKey: een nieuwe tik begint opnieuw', () => {
  const at = { slot: 'a', rowId: 'a1', field: 'weightKg' as const };
  it('dezelfde tik geeft dezelfde sleutel, een nieuwe tik op hetzelfde veld een andere', () => {
    expect(dockFieldKey(at, 1)).toBe(dockFieldKey(at, 1));
    expect(dockFieldKey(at, 2)).not.toBe(dockFieldKey(at, 1));
  });
  it('een ander veld geeft een andere sleutel', () => {
    expect(dockFieldKey({ ...at, field: 'reps' }, 1)).not.toBe(dockFieldKey(at, 1));
    expect(dockFieldKey({ ...at, rowId: 'a2' }, 1)).not.toBe(dockFieldKey(at, 1));
  });
});
