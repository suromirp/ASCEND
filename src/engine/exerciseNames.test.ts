import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExerciseSetLog } from '../models/training';
import { matchExercise } from './exerciseMatch';
import { legacySetShape } from './macrofactorSets';

// Made-up list: only exercise names, the way a MacroFactor export writes them
// (with and without the superset sign).
const MACROFACTOR_NAMES = [
  'Barbell Back Squat',
  'Pin-Loaded Leg Press',
  'Barbell Bench Press',
  'Barbell Overhead Press',
  'Pin-Loaded Machine Chest Press',
  'Hanging Knee Raise',
  'Bent-Over Underhand Grip Barbell Row',
  'Neutral Grip Machine-Assisted Pull-Up',
  'Cable Rope High Row',
  'Underhand Grip Cable Lat Pulldown',
  'Conventional Deadlift',
  'Hack Squat',
  'Barbell Hip Thrust',
  'Barbell Romanian Deadlift',
  'Cable Face Pull',
  'Leg Extension',
  'Pin-Loaded Row Machine Kelso Shrug',
  'Neutral Grip Pin-Loaded Machine Shoulder Press',
  '45° Incline Barbell Press',
  'Pec Deck Fly',
  'Sumo Deadlift',
  'Low Incline Dumbbell Press',
  'Overhand Grip Pin-Loaded Machine Row',
  'Seated Dumbbell Overhead Press',
  'Cable Rope Straight Arm Lat Pulldown',
  'Pause Dumbbell Bench Press',
  'Neutral Shoulder Width Grip Cable Lat Pulldown',
  'Dumbbell Pullover',
  'Horizontal Cable Chop',
  'Low-To-High Cable Fly',
  'Seated Single Leg Hamstring Curl',
  'Barbell Push Press',
  'Decline Weighted Sit-Up',
  'Low Pulley Cable Face Pull',
  'Overhand Grip Cable Lat Pulldown ∈ SS1',
  'Pec Deck Fly ∈ SS1',
  'Pin-Loaded Quad-Biased Leg Press',
  'Wide Grip Bench Press',
  'Overhand Grip Plate-Loaded Machine Row',
  'Standing Dumbbell Overhead Press',
  'Low Incline Dumbbell Fly',
  'Weighted Roman Chair Back Extension ∈ SS1',
  'Horizontal Cable Fly',
  'Chest-Supported Dumbbell Y-Raise',
  'Pin-Loaded Machine Shoulder Press',
  'Overhand Grip Pec Deck Fly',
  'Seated Hamstring Curl',
  'Weighted Glute Ham Developer Hip Hinge',
  'Weighted Roman Chair Back Extension',
  'Dumbbell Glute Bridge',
  'Barbell Rollout ∈ SS1',
  'Weighted Roman Chair Hip Hinge',
  'Reverse Nordic Curl',
  'Chest-Supported Dumbbell High Row',
  'Snatch Grip Shrug',
  'Wide Grip Cable Lat Pulldown',
  'Chest-Supported Dumbbell Y-Raise ∈ SS1',
  'Close Grip Bench Press',
  'Single Arm Cable Lateral Raise (With Cable In Front Of Body)',
  'Cable V-Bar Triceps Pushdown',
  'Captain’s Chair Straight Leg Raise',
  'Underhand Grip Cable Row',
  'Dumbbell Preacher Curl',
  '45° Incline Dumbbell Press',
  'Single Arm Cable Lat Pulldown',
  'Pause Back Squat',
  'Seated Pin-Loaded Machine Calf Raise',
  'Ab Wheel Rollout',
  'Pin-Loaded Leg Press Calf Raise',
  'Dumbbell Glute Bridge ∈ SS1',
  'Glute Ham Raise ∈ SS1',
  'Single Arm Cable Lat Pulldown ∈ SS1',
  'Dumbbell Frog Pump',
  'Barbell Glute Bridge',
  'Superman',
  'Decline Weighted Sit-Up ∈ SS1',
  'Chest-Supported Dumbbell High Row ∈ SS1',
  'Low Incline Dumbbell Press ∈ SS1',
  'Overhand Grip Cable Lat Pulldown',
  'Bent-Over Barbell High Row',
  'Low Incline Barbell Press',
  'Negative Chin-Up',
  'Cable Bar Straight Arm Lat Pulldown',
  'Underhand Close Grip Cable Lat Pulldown',
  'Neutral Grip Plate-Loaded Machine Row',
  'Standing Dumbbell Lateral Raise',
  'Incline Hammer Curl',
  'Single Arm High Cable Lateral Raise',
  'Pin-Loaded Machine Preacher Curl',
];

describe('the names of a MacroFactor export', () => {
  for (const name of MACROFACTOR_NAMES) {
    it(`finds ${name}`, () => {
      expect(matchExercise(name), name).toBeDefined();
      expect(matchExercise(`${name} \u2208 SS1`), name).toBe(matchExercise(name));
    });
  }

  it('keeps variants that progress apart as separate exercises', () => {
    const ids = (names: string[]) => new Set(names.map((n) => matchExercise(n)));
    expect(ids(['45° Incline Barbell Press', 'Low Incline Barbell Press', 'Barbell Bench Press', 'Wide Grip Bench Press', 'Close Grip Bench Press']).size).toBe(5);
    expect(ids(['Pin-Loaded Leg Press', 'Plate-Loaded Leg Press', 'Pin-Loaded Quad-Biased Leg Press']).size).toBe(3);
    expect(ids(['Overhand Grip Pin-Loaded Machine Row', 'Overhand Grip Plate-Loaded Machine Row']).size).toBe(2);
    expect(ids(['Pause Back Squat', 'Barbell Back Squat']).size).toBe(2);
  });

  it('reads a grip or a posture as the same exercise', () => {
    expect(matchExercise('Overhand Grip Cable Lat Pulldown')).toBe(matchExercise('Underhand Grip Cable Lat Pulldown'));
    expect(matchExercise('Standing Dumbbell Overhead Press')).toBe(matchExercise('Seated Dumbbell Overhead Press'));
    expect(matchExercise('Neutral Grip Plate-Loaded Machine Row')).toBe(matchExercise('Overhand Grip Plate-Loaded Machine Row'));
  });

  it('does not read a stack machine as plates', () => {
    for (const e of EXERCISES.filter((x) => /pin-loaded/i.test(x.name))) expect(e.resistance, e.id).toBe('machine_stack');
    for (const e of EXERCISES.filter((x) => /plate-loaded/i.test(x.name))) expect(e.resistance, e.id).toBe('machine_plates');
  });

  it('still finds every old name of an exercise that got a new main name', () => {
    for (const name of ['Barbell Row', 'Lat Pulldown', 'Machine Chest Press', 'Leg Press', 'Deadlift', 'Seated Leg Curl', 'Incline Dumbbell Press', 'Dumbbell Lateral Raise', 'Cable Fly', 'Triceps Pushdown', 'Seated Calf Raise', 'Romanian Deadlift', 'Assisted Pull-Up', 'Face Pull', 'Straight Arm Pulldown', 'Dumbbell Shoulder Press', 'Incline Bench Press']) {
      expect(matchExercise(name), name).toBeDefined();
    }
  });
});

describe('the default program', () => {
  const names = buildDefaultProgramData().templates.flatMap((t) => (t.exercises ?? []).map((e) => e.exerciseName));

  it('only names exercises ASCEND knows, so Forge can suggest a weight', () => {
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(matchExercise(name), name).toBeDefined();
  });

  it('writes every name as the main name of its exercise', () => {
    const main = new Set(EXERCISES.map((e) => e.name));
    for (const name of names) expect(main.has(name), name).toBe(true);
  });

  it('gives no false takeover when only the template name differs', () => {
    const sets = [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }];
    const a: ExerciseSetLog[] = [{ exerciseId: 'ex2', exerciseName: 'Bent-Over Underhand Grip Barbell Row', sets }];
    const b: ExerciseSetLog[] = [{ exerciseId: 'mf_bent-over-underhand-grip-barbell-row', exerciseName: 'Bent-Over Underhand Grip Barbell Row', sets }];
    expect(JSON.stringify(legacySetShape(a))).toBe(JSON.stringify(legacySetShape(b)));
  });
});
