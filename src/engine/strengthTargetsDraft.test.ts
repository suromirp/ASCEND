import { describe, it, expect } from 'vitest';
import { addStrengthTarget, finishStrengthTargets, removeStrengthTarget, strengthTargetChoices, strengthTargetLine, strengthTargetProblem } from './strengthTargetsDraft';
import { readGoalDetails } from '../storage/migrations';

describe('krachtdoelen per oefening in het formulier', () => {
  it('biedt de oefeningen uit de lijst aan, op naam, zonder lichaamsgewicht', () => {
    const names = strengthTargetChoices();
    expect(names).toContain('Barbell Back Squat');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });

  it('voegt een doel toe met de naam uit de lijst, ook als je hoofdletters anders typte', () => {
    const list = addStrengthTarget([], { exercise: 'barbell back squat', kg: 100, reps: 5 });
    expect(list).toEqual([{ exercise: 'Barbell Back Squat', kg: 100, reps: 5 }]);
  });

  it('een tweede doel voor dezelfde oefening vervangt het eerste', () => {
    const one = addStrengthTarget([], { exercise: 'Barbell Back Squat', kg: 100, reps: 5 });
    const two = addStrengthTarget(one, { exercise: 'Barbell Back Squat', kg: 110, reps: 3 });
    expect(two).toEqual([{ exercise: 'Barbell Back Squat', kg: 110, reps: 3 }]);
  });

  it('haalt een doel weg, en laat de rest staan', () => {
    const list = addStrengthTarget(addStrengthTarget([], { exercise: 'Barbell Back Squat', kg: 100, reps: 5 }), { exercise: 'Front Squat', kg: 80, reps: 5 });
    expect(removeStrengthTarget(list, 'Barbell Back Squat')).toEqual([{ exercise: 'Front Squat', kg: 80, reps: 5 }]);
    expect(removeStrengthTarget(removeStrengthTarget(list, 'Barbell Back Squat'), 'Front Squat')).toEqual([]);
  });

  it('zegt in gewone woorden wat nog mist', () => {
    expect(strengthTargetProblem({ exercise: '', kg: 100, reps: 5 })).toBe('Kies een oefening.');
    expect(strengthTargetProblem({ exercise: 'Onbekende oefening', kg: 100, reps: 5 })).toBe('Kies een oefening uit de lijst.');
    expect(strengthTargetProblem({ exercise: 'Front Squat', kg: undefined, reps: 5 })).toBe('Vul het gewicht in.');
    expect(strengthTargetProblem({ exercise: 'Front Squat', kg: 80, reps: undefined })).toBe('Vul het aantal herhalingen in.');
    expect(strengthTargetProblem({ exercise: 'Front Squat', kg: 80, reps: 40 })).toBe('Kies 1 tot 30 herhalingen.');
    expect(strengthTargetProblem({ exercise: 'Front Squat', kg: 80, reps: 5 })).toBeUndefined();
    expect(addStrengthTarget([], { exercise: 'Front Squat', kg: 0, reps: 5 })).toEqual([]);
  });

  it('schrijft een doel op als een zin', () => {
    expect(strengthTargetLine({ exercise: 'Front Squat', kg: 82.5, reps: 5 })).toBe('Front Squat: 82,5 kg voor 5 herhalingen');
    expect(strengthTargetLine({ exercise: 'Front Squat', kg: 80, reps: 1 })).toBe('Front Squat: 80 kg voor 1 herhaling');
  });

  it('wat het formulier bewaart leest de opslag zonder verlies terug, en rommel valt weg', () => {
    const list = addStrengthTarget([], { exercise: 'Front Squat', kg: 82.5, reps: 5 });
    expect(readGoalDetails({ strengthTargets: list })?.strengthTargets).toEqual(list);
    expect(readGoalDetails({ strengthTargets: [{ exercise: '  ', kg: 80, reps: 5 }, { exercise: 'x'.repeat(200), kg: 80, reps: 5 }, { exercise: 'Front Squat', kg: 80, reps: 5.5 }] })?.strengthTargets).toBeUndefined();
    const many = Array.from({ length: 20 }, (_, i) => ({ exercise: `Oefening ${i}`, kg: 50, reps: 5 }));
    expect(readGoalDetails({ strengthTargets: many })?.strengthTargets).toHaveLength(8);
  });

  it('bij Opslaan gaat een volledig ingevulde invoer mee, een lege niet, en een halve geeft een heldere zin', () => {
    const list = [{ exercise: 'Front Squat', kg: 80, reps: 5 }];
    expect(finishStrengthTargets(list, { exercise: '', kg: undefined, reps: undefined })).toEqual({ list });
    const full = finishStrengthTargets(list, { exercise: 'Barbell Back Squat', kg: 100, reps: 5 });
    expect(full.problem).toBeUndefined();
    expect(full.list).toEqual([...list, { exercise: 'Barbell Back Squat', kg: 100, reps: 5 }]);
    const half = finishStrengthTargets(list, { exercise: 'Barbell Back Squat', kg: undefined, reps: 5 });
    expect(half.list).toEqual(list);
    expect(half.problem).toBe('Je krachtdoel is nog niet af. Vul het gewicht in. Of maak de velden leeg.');
    const many = Array.from({ length: 8 }, (_, i) => ({ exercise: `Oefening ${i}`, kg: 50, reps: 5 }));
    expect(finishStrengthTargets(many, { exercise: 'Barbell Back Squat', kg: 100, reps: 5 }).problem).toContain('tot 8 doelen');
    // Dezelfde oefening vervangt, ook bij een volle lijst.
    expect(finishStrengthTargets([{ exercise: 'Barbell Back Squat', kg: 90, reps: 5 }], { exercise: 'Barbell Back Squat', kg: 100, reps: 5 }).list).toEqual([{ exercise: 'Barbell Back Squat', kg: 100, reps: 5 }]);
  });
});
