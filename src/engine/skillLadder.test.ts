import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { SKILL_LADDERS, skillLadderById, type SkillLadder } from '../data/skillLadders';
import type { SessionLog, SetLog } from '../models/training';
import { ladderState, ladderStateFor, ladderStates, stepResult } from './skillLadder';

// Nagemaakte logs: alleen wat de engine leest.
let n = 0;
function log(date: string, sets: Record<string, SetLog[]>, time = '10:00'): SessionLog {
  n += 1;
  return {
    id: `log_${n}`,
    templateId: 'tpl_test',
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T${time}:00.000Z`,
    variant: 'full',
    durationMinutes: 40,
    source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: exerciseId, sets: s })),
  };
}
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));
const holds = (...s: number[]): SetLog[] => s.map((x) => ({ reps: 1, seconds: x }));

const pushUp = skillLadderById('push-up')!;
const pull = skillLadderById('pull-up')!;
const TODAY = '2026-11-20';

describe('de ladders als gegevens', () => {
  it('elke stap is een bestaande oefening met de plek die klopt', () => {
    for (const ladder of SKILL_LADDERS) {
      expect(ladder.steps.length, ladder.id).toBeGreaterThan(0);
      ladder.steps.forEach((step, i) => {
        const e = exerciseById(step.exerciseId);
        expect(e, step.exerciseId).toBeDefined();
        expect(e!.ladder, step.exerciseId).toEqual({ id: ladder.id, step: i + 1 });
        expect(e!.family, step.exerciseId).toBeTruthy();
        expect(step.test.kind === 'hold', step.exerciseId).toBe(e!.measure === 'hold');
        expect(step.note.length, step.exerciseId).toBeGreaterThan(0);
      });
    }
  });

  it('geen oefening staat op twee ladders, en elke oefening met een ladder staat ook echt op die ladder', () => {
    const ids = SKILL_LADDERS.flatMap((l) => l.steps.map((s) => s.exerciseId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('de push-up volgt de meting: het deel van je gewicht stijgt per stap tot de push-up met voeten hoog', () => {
    const fractions = pushUp.steps.slice(0, 5).map((s) => exerciseById(s.exerciseId)!.bodyweightFraction!);
    expect(fractions).toEqual([0.41, 0.49, 0.55, 0.65, 0.7]);
    expect(pushUp.steps.map((s) => s.exerciseId)).toEqual(['incline-push-up-high', 'knee-push-up', 'incline-push-up', 'push-up', 'decline-push-up', 'diamond-push-up', 'archer-push-up']);
    expect(exerciseById('archer-push-up')!.perSide).toBe(true);
  });

  it('hergebruikt de bestaande oefeningen en houdt houdingen zonder deel van je gewicht', () => {
    expect(pull.steps.map((s) => s.exerciseId)).toEqual(['dead-hang', 'scapular-pull-up', 'negative-chin-up', 'pull-up', 'weighted-pull-up']);
    expect(skillLadderById('dip')!.steps.map((s) => s.exerciseId)).toEqual(['support-hold', 'negative-dip', 'dip', 'weighted-dip']);
    for (const id of ['dead-hang', 'support-hold']) {
      expect(exerciseById(id)!.measure, id).toBe('hold');
      expect(exerciseById(id)!.bodyweightFraction, id).toBeUndefined();
    }
  });

  it('geen gedachtestreepjes in de ladders', () => {
    expect(JSON.stringify(SKILL_LADDERS)).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('stepResult', () => {
  const test = { kind: 'reps', sets: 3, reps: 8 } as const;
  it('drie werksets op de bovenkant is gehaald; op de onderkant is de onderkant', () => {
    expect(stepResult(reps(8, 8, 9), test)).toEqual({ attempted: true, floorMet: true, passed: true });
    expect(stepResult(reps(6, 5, 5), test)).toEqual({ attempted: true, floorMet: true, passed: false });
    expect(stepResult(reps(5, 5, 4), test)).toEqual({ attempted: true, floorMet: false, passed: false });
  });
  it('een set zonder isWorkSet telt niet', () => {
    const sets: SetLog[] = [{ reps: 12, kind: 'warmup' }, { reps: 8 }, { reps: 8 }];
    expect(stepResult(sets, test)).toEqual({ attempted: true, floorMet: false, passed: false });
    expect(stepResult([{ reps: 10, kind: 'warmup' }], test).attempted).toBe(false);
  });
  it('netjes: onbekend telt mee, niet netjes niet', () => {
    expect(stepResult([{ reps: 8 }, { reps: 8, clean: true }, { reps: 8, clean: false }], test).passed).toBe(false);
    expect(stepResult([{ reps: 8 }, { reps: 8, clean: true }, { reps: 8 }], test).passed).toBe(true);
  });
  it('een houding telt in seconden; zonder seconden telt hij niet', () => {
    const hold = { kind: 'hold', sets: 3, seconds: 30 } as const;
    expect(stepResult(holds(30, 31, 30), hold).passed).toBe(true);
    expect(stepResult(holds(12, 10, 10), hold)).toEqual({ attempted: true, floorMet: true, passed: false });
    expect(stepResult(reps(1, 1, 1), hold)).toEqual({ attempted: false, floorMet: false, passed: false });
    expect(stepResult([{ reps: 1, seconds: 30 }, { reps: 1, seconds: 30 }, { reps: 30 }], hold).passed).toBe(false);
  });
  it('een stap met extra gewicht telt alleen sets met minstens dat gewicht', () => {
    const weighted = { kind: 'reps', sets: 3, reps: 8, addedKg: 2.5 } as const;
    expect(stepResult([{ reps: 8, weightKg: 2.5 }, { reps: 8, weightKg: 5 }, { reps: 8, weightKg: 2.5 }], weighted).passed).toBe(true);
    expect(stepResult([{ reps: 8, weightKg: 2.5 }, { reps: 8, weightKg: 5 }, { reps: 8 }], weighted).passed).toBe(false);
  });
});

describe('ladderState', () => {
  it('zonder logs: geen stap en geen voorstel', () => {
    expect(ladderState(pushUp, [], TODAY)).toMatchObject({ ladderId: 'push-up', current: null, passed: false, proposal: null, lastDate: null });
  });

  it('de huidige stap is de zwaarste stap met de onderkant in de laatste training', () => {
    const logs = [log('2026-11-10', { 'knee-push-up': reps(8, 8, 8) }), log('2026-11-12', { 'incline-push-up': reps(6, 5, 5) })];
    const s = ladderState(pushUp, logs, TODAY);
    expect(s.current).toBe(3);
    expect(s.currentExerciseId).toBe('incline-push-up');
    expect(s.passed).toBe(false);
    expect(s.proposal).toBeNull();
  });

  it('toets gehaald: het voorstel is de volgende stap', () => {
    const s = ladderState(pushUp, [log('2026-11-12', { 'push-up': reps(8, 8, 8) })], TODAY);
    expect(s).toMatchObject({ current: 4, passed: true, proposal: { kind: 'harder', step: 5, exerciseId: 'decline-push-up' } });
  });

  it('de toets van vandaag telt wel mee', () => {
    const s = ladderState(pushUp, [log(TODAY, { 'push-up': reps(8, 8, 8) })], TODAY);
    expect(s.proposal).toMatchObject({ kind: 'harder', step: 5 });
  });

  it('een gehaalde toets die daarna op dezelfde stap niet meer lukt, is niet gehaald', () => {
    const logs = [log('2026-11-10', { 'push-up': reps(8, 8, 8) }), log('2026-11-12', { 'push-up': reps(4, 3, 3) })];
    const s = ladderState(pushUp, logs, TODAY);
    expect(s.current).toBe(4);
    expect(s.passed).toBe(false);
    expect(s.proposal).toBeNull();
  });

  it('drie trainingen achter elkaar onder de onderkant: het voorstel is de lichtere stap', () => {
    const logs = [
      log('2026-11-01', { 'push-up': reps(6, 5, 5) }),
      log('2026-11-03', { 'push-up': reps(4, 4, 3) }),
      log('2026-11-05', { 'push-up': reps(4, 3, 3) }),
      log('2026-11-07', { 'push-up': reps(4, 4, 4) }),
    ];
    const s = ladderState(pushUp, logs, TODAY);
    expect(s.current).toBe(4);
    expect(s.proposal).toEqual({ kind: 'lighter', step: 3, exerciseId: 'incline-push-up' });
  });

  it('twee keer niet is nog geen voorstel, en een gehaalde onderkant ertussen breekt de reeks', () => {
    const two = [log('2026-11-03', { 'push-up': reps(4, 4, 3) }), log('2026-11-05', { 'push-up': reps(4, 3, 3) })];
    expect(ladderState(pushUp, two, TODAY).proposal).toBeNull();
    const broken = [
      log('2026-11-01', { 'push-up': reps(4, 4, 3) }),
      log('2026-11-03', { 'push-up': reps(5, 5, 5) }),
      log('2026-11-05', { 'push-up': reps(4, 3, 3) }),
      log('2026-11-07', { 'push-up': reps(4, 4, 4) }),
    ];
    expect(ladderState(pushUp, broken, TODAY).proposal).toBeNull();
  });

  it('de dag zelf telt niet als voorbij voor drie trainingen achter elkaar', () => {
    const logs = [
      log('2026-11-16', { 'push-up': reps(4, 4, 3) }),
      log('2026-11-18', { 'push-up': reps(4, 3, 3) }),
      log(TODAY, { 'push-up': reps(4, 4, 4) }),
    ];
    expect(ladderState(pushUp, logs, TODAY).proposal).toBeNull();
    // De dag erna is die training wel voorbij.
    expect(ladderState(pushUp, logs, '2026-11-21').proposal).toMatchObject({ kind: 'lighter', step: 3 });
  });

  it('haal je vandaag de onderkant na drie missers, dan geen lichtere stap', () => {
    const logs = [
      log('2026-11-14', { 'push-up': reps(4, 4, 3) }),
      log('2026-11-16', { 'push-up': reps(4, 3, 3) }),
      log('2026-11-18', { 'push-up': reps(4, 4, 4) }),
      log(TODAY, { 'push-up': reps(5, 5, 5) }),
    ];
    expect(ladderState(pushUp, logs, TODAY).proposal).toBeNull();
  });

  it('alleen de laatste log per dag telt', () => {
    const logs = [
      log('2026-11-12', { 'push-up': reps(8, 8, 8) }, '08:00'),
      log('2026-11-12', { 'incline-push-up': reps(6, 6, 6) }, '18:00'),
    ];
    const s = ladderState(pushUp, logs, TODAY);
    expect(s.current).toBe(3);
    expect(s.passed).toBe(false);
    // De volgorde in de lijst doet er niet toe, de tijd wel.
    expect(ladderState(pushUp, [...logs].reverse(), TODAY).current).toBe(3);
  });

  it('logs op twee stappen in dezelfde training: de zwaarste stap met de onderkant telt', () => {
    const logs = [log('2026-11-12', { 'incline-push-up': reps(8, 8, 8), 'push-up': reps(5, 5, 5) })];
    const s = ladderState(pushUp, logs, TODAY);
    expect(s.current).toBe(4);
    expect(s.passed).toBe(false);
    expect(s.proposal).toBeNull();
    // Haal je de zwaardere stap niet, dan blijft de lichtere de huidige stap, met zijn gehaalde toets.
    const lower = ladderState(pushUp, [log('2026-11-12', { 'incline-push-up': reps(8, 8, 8), 'push-up': reps(3, 2, 2) })], TODAY);
    expect(lower).toMatchObject({ current: 3, passed: true, proposal: { kind: 'harder', step: 4 } });
  });

  it('een houding zonder seconden telt niet als training', () => {
    const logs = [log('2026-11-12', { 'dead-hang': reps(1, 1, 1) })];
    expect(ladderState(pull, logs, TODAY)).toMatchObject({ current: null, proposal: null, lastDate: null });
    const timed = ladderState(pull, [log('2026-11-12', { 'dead-hang': holds(30, 30, 35) })], TODAY);
    expect(timed).toMatchObject({ current: 1, passed: true, proposal: { kind: 'harder', step: 2, exerciseId: 'scapular-pull-up' } });
  });

  it('alleen werksets tellen, ook voor de reeks missers', () => {
    const warm = (date: string) => log(date, { 'push-up': [{ reps: 3, kind: 'warmup' }, { reps: 3, kind: 'warmup' }, { reps: 3, kind: 'warmup' }] });
    expect(ladderState(pushUp, [warm('2026-11-01'), warm('2026-11-03'), warm('2026-11-05')], TODAY)).toMatchObject({ current: null, proposal: null });
  });

  it('een ladder met één stap: geen volgende en geen lichtere', () => {
    const one: SkillLadder = { id: 'een', name: 'Een', kind: 'strength', steps: [{ exerciseId: 'push-up', test: { kind: 'reps', sets: 3, reps: 8 }, note: 'Alleen deze.' }] };
    expect(ladderState(one, [log('2026-11-12', { 'push-up': reps(8, 8, 8) })], TODAY)).toMatchObject({ current: 1, passed: true, proposal: null });
    const misses = ['2026-11-01', '2026-11-03', '2026-11-05'].map((d) => log(d, { 'push-up': reps(2, 2, 2) }));
    expect(ladderState(one, misses, TODAY)).toMatchObject({ current: null, proposal: null });
  });

  it('de onderste stap drie keer niet gehaald: er is geen lichtere stap', () => {
    const misses = ['2026-11-01', '2026-11-03', '2026-11-05'].map((d) => log(d, { 'incline-push-up-high': reps(3, 3, 3) }));
    expect(ladderState(pushUp, misses, TODAY).proposal).toBeNull();
  });

  it('een log van na vandaag telt niet', () => {
    expect(ladderState(pushUp, [log('2026-11-25', { 'push-up': reps(8, 8, 8) })], TODAY).current).toBeNull();
  });

  it('logs zonder sets of op andere oefeningen veranderen niets', () => {
    const other = log('2026-11-12', { 'bench-press': [{ reps: 8, weightKg: 60 }] });
    const run: SessionLog = { ...log('2026-11-13', {}), type: 'cardio', strengthData: undefined };
    const base = [log('2026-11-10', { 'push-up': reps(6, 6, 6) })];
    expect(ladderState(pushUp, [...base, other, run], TODAY)).toEqual(ladderState(pushUp, base, TODAY));
  });

  it('is deterministisch en verandert de logs niet', () => {
    const logs = [log('2026-11-10', { 'push-up': reps(8, 8, 8) })];
    const copy = JSON.parse(JSON.stringify(logs));
    expect(ladderState(pushUp, logs, TODAY)).toEqual(ladderState(pushUp, logs, TODAY));
    expect(logs).toEqual(copy);
  });
});

describe('ladderStateFor en ladderStates', () => {
  it('een oefening zonder ladder geeft niets', () => {
    expect(ladderStateFor('bench-press', [log('2026-11-12', { 'bench-press': reps(8, 8, 8) })], TODAY)).toBeNull();
    expect(ladderStateFor('bestaat-niet', [], TODAY)).toBeNull();
  });
  it('een oefening op een ladder geeft de stand van die ladder', () => {
    const logs = [log('2026-11-12', { dip: reps(8, 8, 8) })];
    expect(ladderStateFor('negative-dip', logs, TODAY)).toMatchObject({ ladderId: 'dip', current: 3, proposal: { kind: 'harder', step: 4, exerciseId: 'weighted-dip' } });
  });
  it('geeft elke ladder een stand, in de volgorde van de gegevens', () => {
    expect(ladderStates([], TODAY).map((s) => s.ladderId)).toEqual(SKILL_LADDERS.map((l) => l.id));
  });
});

describe('na de review van F4a', () => {
  it('een later log van dezelfde dag zonder geprobeerde stap haalt het eerdere niet weg', () => {
    const real = log('2026-11-10', { 'pull-up': reps(5, 5, 5) }, '09:00');
    const warmupOnly = log('2026-11-10', { 'pull-up': [{ reps: 3, kind: 'warmup' }] }, '18:00');
    expect(ladderState(pull, [real, warmupOnly], TODAY)).toEqual(ladderState(pull, [real], TODAY));
    expect(ladderState(pull, [real, warmupOnly], TODAY).current).not.toBeNull();
  });
});

describe('band en extra gewicht (F4c)', () => {
  it('een set met band telt niet voor de onderkant of de toets van die stap', () => {
    const test = pull.steps[3].test;
    const band = (r: number): SetLog => ({ reps: r, band: 'licht' });
    expect(stepResult([band(8), band(8), band(8)], test)).toEqual({ attempted: false, floorMet: false, passed: false });
    expect(stepResult([band(8), { reps: 8 }, { reps: 8 }], test)).toMatchObject({ floorMet: false, passed: false });
    expect(stepResult([{ reps: 8 }, { reps: 8 }, { reps: 8 }], test)).toMatchObject({ floorMet: true, passed: true });
    // Een houding met band telt ook niet.
    expect(stepResult([{ reps: 1, seconds: 30, band: 'zwaar' }], pull.steps[0].test).attempted).toBe(false);
  });

  it('met band op Pull-Up blijf je op de stap eronder tot je zonder band haalt', () => {
    const logs = [log('2026-11-10', { 'negative-chin-up': reps(8, 8, 8), 'pull-up': [{ reps: 8, band: 'licht' }, { reps: 8, band: 'licht' }, { reps: 8, band: 'licht' }] })];
    expect(ladderState(pull, logs, TODAY)).toMatchObject({ current: 3, passed: true, proposal: { kind: 'harder', step: 4 } });
  });

  it('een set Pull-Up met 5 kg telt voor stap 5, met 2 kg niet, met band niet', () => {
    const with5 = [log('2026-11-10', { 'pull-up': [{ reps: 8, weightKg: 5 }, { reps: 8, weightKg: 5 }, { reps: 8, weightKg: 5 }] })];
    expect(ladderState(pull, with5, TODAY)).toMatchObject({ current: 5, currentExerciseId: 'weighted-pull-up', passed: true, proposal: null });
    const with2 = [log('2026-11-10', { 'pull-up': [{ reps: 8, weightKg: 2 }, { reps: 8, weightKg: 2 }, { reps: 8, weightKg: 2 }] })];
    expect(ladderState(pull, with2, TODAY)).toMatchObject({ current: 4, passed: true, proposal: { kind: 'harder', step: 5 } });
    const banded = [log('2026-11-10', { 'pull-up': [{ reps: 8, weightKg: 5, band: 'licht' }, { reps: 8, weightKg: 5, band: 'licht' }, { reps: 8, weightKg: 5, band: 'licht' }] })];
    expect(ladderState(pull, banded, TODAY).current).toBeNull();
  });

  it('een import "Weighted Dip" met 10 kg op dip telt voor de stap met gewicht; het log verandert niet', () => {
    const dip = skillLadderById('dip')!;
    const logs = [log('2024-03-01', { dip: [{ reps: 6, weightKg: 10 }, { reps: 6, weightKg: 10 }, { reps: 5, weightKg: 10 }] })];
    const copy = JSON.parse(JSON.stringify(logs));
    expect(ladderState(dip, logs, TODAY)).toMatchObject({ current: 4, currentExerciseId: 'weighted-dip', passed: false });
    expect(logs).toEqual(copy);
  });

  it('per set: zonder gewicht blijft een set op zijn eigen stap', () => {
    const logs = [log('2026-11-10', { 'pull-up': [{ reps: 8 }, { reps: 8 }, { reps: 8 }, { reps: 6, weightKg: 5 }] })];
    expect(ladderState(pull, logs, TODAY)).toMatchObject({ current: 4, passed: true });
  });
});

// F4f: de overige ladders (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md, punt 5). Alle stappen zijn eigen
// oefeningen; de toets is 3 keer 8 of 3 keer 30 seconden, de onderkant 3 keer 5 of 3 keer 10 seconden.
describe('de overige ladders', () => {
  const LADDERS: [string, string[], 'balance' | 'strength', 'reps' | 'hold'][] = [
    ['pistol', ['assisted-pistol-squat', 'skater-squat', 'box-pistol-squat', 'pistol-squat'], 'strength', 'reps'],
    ['handstand', ['wall-plank-hold', 'pike-hold', 'wall-handstand-hold', 'free-handstand-hold'], 'balance', 'hold'],
    ['handstand-push-up', ['pike-push-up', 'elevated-pike-push-up', 'wall-hspu-negative', 'wall-hspu'], 'strength', 'reps'],
    ['l-sit', ['tuck-l-sit', 'one-leg-l-sit', 'l-sit'], 'strength', 'hold'],
    ['front-lever', ['tuck-front-lever', 'advanced-tuck-front-lever', 'one-leg-front-lever', 'straddle-front-lever'], 'strength', 'hold'],
    ['muscle-up', ['chest-to-bar-pull-up', 'straight-bar-dip', 'negative-muscle-up', 'muscle-up'], 'strength', 'reps'],
  ];
  const sets = (kind: 'reps' | 'hold', top: boolean) => (kind === 'hold' ? holds(...(top ? [30, 30, 30] : [10, 10, 10])) : reps(...(top ? [8, 8, 8] : [5, 5, 5])));

  it('heeft de zes ladders na de eerste drie, met 3 tot 5 stappen en de juiste aard', () => {
    expect(SKILL_LADDERS.map((l) => l.id)).toEqual(['push-up', 'pull-up', 'dip', ...LADDERS.map(([id]) => id)]);
    for (const [id, steps, kind, test] of LADDERS) {
      const l = skillLadderById(id)!;
      expect(l.steps.length, id).toBeGreaterThanOrEqual(3);
      expect(l.steps.length, id).toBeLessThanOrEqual(5);
      expect(l.steps.map((s) => s.exerciseId), id).toEqual(steps);
      expect(l.kind, id).toBe(kind);
      for (const s of l.steps) {
        expect(s.test.kind, s.exerciseId).toBe(test);
        expect(s.test.sets, s.exerciseId).toBe(3);
        expect(s.test.kind === 'hold' ? s.test.seconds : s.test.kind === 'reps' ? s.test.reps : 0, s.exerciseId).toBe(test === 'hold' ? 30 : 8);
      }
    }
  });

  it('elke stap is een eigen oefening zonder deel van je gewicht (geen meting), per kant waar het per kant is', () => {
    for (const [id, steps] of LADDERS) {
      for (const ex of steps) {
        const e = exerciseById(ex)!;
        expect(e.ladder?.id, ex).toBe(id);
        expect(e.bodyweightFraction, ex).toBeUndefined();
        expect(e.guide, ex).toBeDefined();
        expect(e.perSide === true, ex).toBe(id === 'pistol');
      }
    }
  });

  for (const [id, steps, , kind] of LADDERS) {
    it(`${id}: zonder logs geen stap; de onderkant van stap 1 is stap 1; de toets geeft het voorstel voor stap 2`, () => {
      const l = skillLadderById(id)!;
      expect(ladderState(l, [], TODAY)).toMatchObject({ current: null, proposal: null });
      const floor = ladderState(l, [log('2026-11-12', { [steps[0]]: sets(kind, false) })], TODAY);
      expect(floor).toMatchObject({ current: 1, currentExerciseId: steps[0], passed: false, proposal: null });
      const top = ladderState(l, [log('2026-11-12', { [steps[0]]: sets(kind, true) })], TODAY);
      expect(top).toMatchObject({ current: 1, passed: true, proposal: { kind: 'harder', step: 2, exerciseId: steps[1] } });
    });

    it(`${id}: de laatste stap heeft geen voorstel omhoog, en drie missers geven de lichtere stap`, () => {
      const l = skillLadderById(id)!;
      const last = steps[steps.length - 1];
      expect(ladderState(l, [log('2026-11-12', { [last]: sets(kind, true) })], TODAY)).toMatchObject({ current: steps.length, passed: true, proposal: null });
      const below = kind === 'hold' ? holds(6, 6, 5) : reps(3, 3, 2);
      const misses = [
        log('2026-11-01', { [steps[1]]: sets(kind, false) }),
        log('2026-11-05', { [steps[1]]: below }),
        log('2026-11-09', { [steps[1]]: below }),
        log('2026-11-13', { [steps[1]]: below }),
      ];
      expect(ladderState(l, misses, TODAY).proposal).toMatchObject({ kind: 'lighter', step: 1, exerciseId: steps[0] });
    });

    it(`${id}: een set met een band of zonder werkset telt niet`, () => {
      const l = skillLadderById(id)!;
      const withBand = sets(kind, true).map((s) => ({ ...s, band: 'licht' as const }));
      expect(ladderState(l, [log('2026-11-12', { [steps[0]]: withBand })], TODAY).current).toBeNull();
      const warm = sets(kind, true).map((s) => ({ ...s, kind: 'warmup' as const }));
      expect(ladderState(l, [log('2026-11-12', { [steps[0]]: warm })], TODAY).current).toBeNull();
    });
  }

  it('een houding zonder seconden telt niet, ook niet met herhalingen', () => {
    const l = skillLadderById('l-sit')!;
    expect(ladderState(l, [log('2026-11-12', { 'tuck-l-sit': reps(30, 30, 30) })], TODAY).current).toBeNull();
  });
});
