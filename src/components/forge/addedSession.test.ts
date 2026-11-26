import { describe, expect, it } from 'vitest';
import { withoutAddedSlot, type AddedExercises } from '../../engine/addedExercises';
import { mergeDraft } from '../../engine/forgeInput';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import type { SessionTemplate } from '../../models/training';
import { sessionAddedExercises, type WorkoutDraft } from './forgeDraft';

// Nagemaakte beentraining: squat op plek l1. Spieren voor de berg kan er een kuitoefening achter zetten.
const LEGS = { id: 'tpl_legs', name: 'Benen', type: 'strength', durationVariants: { full: 40, short: 25 }, exercises: [
  { id: 'l1', exerciseName: 'Back Squat', sets: 3, reps: '6-8', priority: 'core' },
] } as SessionTemplate;
const DATE = '2026-11-20';
const CALF: AddedExercises = { tpl_legs: ['single-leg-calf-raise'] };
const slotIds = (added: AddedExercises | undefined) => forgeSlotsFor(LEGS, { addedExercises: added }, DATE).map((s) => s.id);
const ex = (slot: string, done = false) => ({ slot, rows: [{ id: `${slot}:s1`, kind: 'work', done }] }) as unknown as WorkoutExercise;

describe('een begonnen sessie houdt zijn toevoegingen van Spieren voor de berg, ook na herladen', () => {
  it('Akkoord tijdens de sessie, dan herladen: geen nieuwe oefening midden in de sessie', () => {
    // Openen zonder toevoeging; het concept bewaart dat als null (zoals useForgeDraft het schrijft).
    const opened = sessionAddedExercises(undefined, undefined);
    const draft = JSON.parse(JSON.stringify({ v: 1, savedAt: 1, startedAt: 1, added: opened ?? null, exercises: [ex('l1', true)] })) as WorkoutDraft;
    const reopened = sessionAddedExercises(draft, CALF);
    expect(reopened).toBeUndefined();
    expect(slotIds(reopened)).toEqual(['l1']);
    // mergeDraft zou een plek van het plan van nu er anders bij zetten.
    const fresh = slotIds(reopened).map((s) => ex(s));
    expect(mergeDraft(draft.exercises, fresh).map((e) => e.slot)).toEqual(['l1']);
    // Een nieuwe sessie ziet de toevoeging wel.
    expect(slotIds(sessionAddedExercises(undefined, CALF))).toEqual(['l1', 'plus:single-leg-calf-raise']);
  });

  it('een concept met een toevoeging houdt hem, ook als je hem elders intussen weghaalde', () => {
    expect(slotIds(sessionAddedExercises({ added: CALF }, undefined))).toEqual(['l1', 'plus:single-leg-calf-raise']);
  });

  it('Uit deze training halen haalt hem ook uit de sessie, zodat hij na herladen niet terugkomt', () => {
    const session = withoutAddedSlot({ addedExercises: sessionAddedExercises(undefined, CALF) }, 'tpl_legs', 'plus:single-leg-calf-raise').addedExercises;
    expect(session).toBeUndefined();
    expect(slotIds(sessionAddedExercises({ added: session ?? null }, CALF))).toEqual(['l1']);
  });

  it('een concept van voor dit veld neemt de toevoegingen van nu, en rommel wordt weggelaten', () => {
    expect(sessionAddedExercises({} as Pick<WorkoutDraft, 'added'>, CALF)).toEqual(CALF);
    expect(sessionAddedExercises({ added: { tpl_legs: ['bestaat-niet'] } }, CALF)).toBeUndefined();
  });
});

// Het scherm leest de toevoegingen van de sessie, niet die van nu, en schrijft ze in het concept.
const SOURCES = import.meta.glob<string>('./*.ts*', { query: '?raw', import: 'default', eager: true });
const read = (name: string): string => Object.entries(SOURCES).find(([p]) => p.endsWith(`/${name}`))?.[1] ?? '';

describe('Forge gebruikt de toevoegingen van de sessie', () => {
  it('allSlots met sessionAdded, het concept met added, Uit deze training halen ook in de sessie', () => {
    const forge = read('ForgeWorkout.tsx');
    expect(forge).toContain('addedExercises: sessionAdded }');
    expect(forge).toContain('added: sessionAdded, calAccepted');
    expect(forge).toMatch(/setSessionAdded\(\(a\) => withoutAddedSlot\(/);
    expect(read('useForgeDraft.ts')).toContain('added: added ?? null');
  });
});
