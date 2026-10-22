import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../data/exercises';
import { MOVEMENT_PATTERNS, MUSCLE_GROUPS, RESISTANCES } from '../models/exercise';
import { matchExercise, normalizeExerciseName } from './exerciseMatch';

describe('the exercise list itself', () => {
  it('has 50 to 80 exercises with unique ids', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(50);
    expect(EXERCISES.length).toBeLessThanOrEqual(80);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it('uses only known muscle groups, resistances and patterns, with a primary muscle', () => {
    for (const e of EXERCISES) {
      expect(e.primary.length, e.id).toBeGreaterThan(0);
      for (const m of [...e.primary, ...e.secondary]) expect(MUSCLE_GROUPS, e.id).toContain(m);
      expect(e.primary.filter((m) => e.secondary.includes(m)), e.id).toEqual([]);
      expect(RESISTANCES).toContain(e.resistance);
      expect(MOVEMENT_PATTERNS).toContain(e.pattern);
      if (e.bodyweightFraction !== undefined) {
        expect(e.bodyweightFraction).toBeGreaterThan(0);
        expect(e.bodyweightFraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives an alias only the tool the exercise itself is done with', () => {
    const tool: [RegExp, (r: string) => boolean][] = [
      [/\bbarbell\b/i, (r) => r === 'barbell'],
      [/\bdumbbell\b/i, (r) => r === 'dumbbell'],
      [/\bcable\b/i, (r) => r === 'cable'],
      [/\bkettlebell\b/i, () => false],
      [/\bmachine\b/i, (r) => r.startsWith('machine_') || r === 'assisted_bodyweight'],
    ];
    for (const e of EXERCISES) {
      for (const alias of e.aliases) {
        for (const [word, ok] of tool) {
          if (word.test(alias)) expect(ok(e.resistance), `${e.id}: ${alias}`).toBe(true);
        }
      }
    }
  });

  it('does not take a doubtful name for an exercise', () => {
    for (const name of ['Barbell Split Squat', 'Barbell Reverse Lunge', 'Barbell Glute Bridge', 'Kettlebell Goblet Squat', 'Cable Lateral Raise', 'Cable Rope Hammer Curl', 'Dumbbell Overhead Triceps Extension', 'Barbell Shrug', 'Machine Chest Press (Plate Loaded)', 'Tempo Squat', 'French Press', 'Toe Raise', 'Calf Raise']) {
      expect(matchExercise(name), name).toBeUndefined();
    }
  });

  it('counts triceps and biceps as secondary in the compound lifts, and gives the leg machines their own pattern', () => {
    for (const id of ['bench-press', 'dumbbell-bench-press', 'push-up', 'machine-chest-press', 'dip', 'overhead-press', 'pull-up', 'chin-up', 'assisted-pull-up']) {
      const e = exerciseById(id)!;
      expect(e.primary, id).not.toContain('triceps');
      expect(e.primary, id).not.toContain('biceps');
    }
    expect(exerciseById('bench-press')!.secondary).toContain('triceps');
    expect(exerciseById('chin-up')!.secondary).toContain('biceps');
    // The isolation exercises keep their arm muscle as primary.
    expect(exerciseById('triceps-pushdown')!.primary).toContain('triceps');
    expect(exerciseById('barbell-curl')!.primary).toContain('biceps');
    for (const id of ['leg-extension', 'lying-leg-curl', 'seated-leg-curl']) expect(exerciseById(id)!.pattern, id).toBe('isolation_leg');
    expect(exerciseById('back-squat')!.pattern).toBe('squat');
  });

  it('keeps the names English, the way MacroFactor writes them; an old Dutch name still finds its exercise', () => {
    expect(exerciseById('cable-crunch')!.name).toBe('Cable Crunch');
    expect(exerciseById('bench-press')!.name).toBe('Barbell Bench Press');
    expect(exerciseById('back-squat')!.name).toBe('Barbell Back Squat');
    expect(matchExercise('Kabelcrunch')).toBe('cable-crunch');
    expect(matchExercise('Bankdrukken met stang')).toBe('bench-press');
    expect(JSON.stringify(EXERCISES)).not.toContain('hol rugje');
  });

  it('has a short explanation of 3 to 5 points per exercise', () => {
    for (const e of EXERCISES) {
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.cues.length, e.id).toBeLessThanOrEqual(5);
      for (const cue of e.cues) expect(cue.length, e.id).toBeLessThan(130);
    }
  });

  it('has no dashes the app avoids in any text', () => {
    const text = JSON.stringify(EXERCISES);
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });

  it('covers calves, shin muscles and hip abductors, and what the mountains ask for', () => {
    const primary = new Set(EXERCISES.flatMap((e) => e.primary));
    for (const m of ['calves', 'tibialis', 'hip_abductors', 'hamstrings', 'quadriceps', 'glutes', 'chest', 'lats'] as const) expect(primary.has(m), m).toBe(true);
    for (const id of ['standing-calf-raise', 'seated-calf-raise', 'tibialis-raise', 'step-up', 'step-up-pack', 'step-down', 'step-down-pack', 'eccentric-squat', 'spanish-squat', 'bulgarian-split-squat', 'nordic-curl', 'lying-leg-curl', 'hip-abduction-machine', 'hip-abduction-band', 'copenhagen-plank']) {
      expect(exerciseById(id), id).toBeDefined();
    }
  });

  it('never gives one name to two different exercises', () => {
    const owner = new Map<string, string>();
    for (const e of EXERCISES) {
      for (const key of new Set([e.name, ...e.aliases].map(normalizeExerciseName))) {
        expect(owner.get(key) ?? e.id, key).toBe(e.id);
        owner.set(key, e.id);
      }
    }
  });
});

describe('normalizing a name', () => {
  it('ignores capitals, punctuation, accents and the degree sign', () => {
    expect(normalizeExerciseName('  45° Incline Barbell Bench-Press ')).toBe('45 incline barbell bench press');
    expect(normalizeExerciseName('Farmer’s Carry')).toBe('farmers carry');
    expect(normalizeExerciseName('Roemeense DEADLIFT!')).toBe('roemeense deadlift');
  });
});

describe('matching a name from an import', () => {
  const cases: [string, string][] = [
    ['Barbell Back Squat', 'back-squat'],
    ['Conventional Deadlift', 'deadlift'],
    ['Pin-Loaded Leg Press', 'leg-press'],
    ['Barbell Bench Press', 'bench-press'],
    ['Barbell Overhead Press', 'overhead-press'],
    ['Bent-Over Underhand Grip Barbell Row', 'barbell-row'],
    ['Neutral Grip Machine-Assisted Pull-Up', 'assisted-pull-up'],
    ['Cable Rope High Row', 'cable-high-row'],
    ['Underhand Grip Cable Lat Pulldown', 'lat-pulldown'],
    ['Kneeling Machine Lower Torso Rotation', 'machine-torso-rotation'],
    ['45° Incline Barbell Bench Press', 'incline-bench-press'],
    ['Chest-Supported Dumbbell Row', 'chest-supported-row'],
  ];
  for (const [name, id] of cases) {
    it(`finds ${name}`, () => {
      expect(matchExercise(name)).toBe(id);
    });
  }

  it('does not mind capitals, punctuation or a missing degree sign', () => {
    expect(matchExercise('barbell BACK squat')).toBe('back-squat');
    expect(matchExercise('pin loaded leg press')).toBe('leg-press');
    expect(matchExercise('45 incline barbell bench press')).toBe('incline-bench-press');
    expect(matchExercise('NEUTRAL-GRIP MACHINE ASSISTED PULL UP')).toBe('assisted-pull-up');
  });

  it('finds Dutch names and the names of the mountain exercises', () => {
    expect(matchExercise('Roemeense deadlift')).toBe('romanian-deadlift');
    expect(matchExercise('Kuitheffen gestrekt')).toBe('standing-calf-raise');
    expect(matchExercise('Tibialis raise')).toBe('tibialis-raise');
    expect(matchExercise('Bulgarian Split Squat')).toBe('bulgarian-split-squat');
    expect(matchExercise('Nordic Hamstring Curl')).toBe('nordic-curl');
    expect(matchExercise('Copenhagen Plank')).toBe('copenhagen-plank');
    expect(matchExercise('Heupabductie op de machine')).toBe('hip-abduction-machine');
  });

  it('reads a tool in brackets after the name', () => {
    expect(matchExercise('Back Squat (Barbell)')).toBe('back-squat');
    expect(matchExercise('Bench Press (Barbell)')).toBe('bench-press');
    expect(matchExercise('Overhead Press (Barbell)')).toBe('overhead-press');
  });

  it('gives nothing for a name it is not sure about', () => {
    expect(matchExercise('')).toBeUndefined();
    expect(matchExercise('Squat')).toBeUndefined();
    expect(matchExercise('Press')).toBeUndefined();
    expect(matchExercise('Bench')).toBeUndefined();
    expect(matchExercise('Hammer Strength Iso Row')).toBeUndefined();
    expect(matchExercise('Smith Machine Hip Thrust Drop Set')).toBeUndefined();
    expect(matchExercise('Zumba')).toBeUndefined();
  });

  it('does not take a different exercise for a likeness', () => {
    // Close in name, not the same exercise.
    expect(matchExercise('Barbell Bench Press')).not.toBe(matchExercise('Dumbbell Bench Press'));
    expect(matchExercise('Romanian Deadlift')).not.toBe(matchExercise('Conventional Deadlift'));
    expect(matchExercise('Barbell Back Squat Jump')).toBeUndefined();
    expect(matchExercise('Decline Barbell Bench Press')).toBeUndefined();
    expect(matchExercise('Leg Press Calf Raise')).toBeUndefined();
    expect(matchExercise('Close Grip Barbell Bench Press')).toBeUndefined();
  });
});
