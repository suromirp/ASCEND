import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../../data/defaultProgram';
import { baseSlotsFor, forgeSlotsFor } from '../../engine/forgeSlots';
import type { StepSwaps } from '../../engine/stepSwaps';
import { styleChange, withStyleAccepted } from '../../engine/trainingStyle';
import { sessionStepSwaps, type WorkoutDraft } from './forgeDraft';

// Calisthenics per training (engine/trainingStyle.ts): een sessie die al liep houdt de oefeningen van het openen.
const UPPER_A = buildDefaultProgramData().templates.find((t) => t.id === 'tpl_upper_a')!;
const TODAY = '2026-11-20';

describe('een lopende Forge-sessie verandert niet door een keuze voor calisthenics', () => {
  it('opende voor Akkoord: na herladen staat bankdrukken er nog; de volgende keer de ladder', () => {
    const opened = sessionStepSwaps(undefined, undefined);
    const draft = JSON.parse(JSON.stringify({ v: 1, savedAt: 1, startedAt: 1, column: 'target', stepSwaps: opened ?? null, exercises: [{ slot: 'ex2', rows: [{ done: true }] }] })) as WorkoutDraft;
    const c = styleChange({ template: UPPER_A, slots: baseSlotsFor(UPPER_A, {}, TODAY), model: {}, style: 'calisthenics', logs: [], today: TODAY })!;
    const model = withStyleAccepted<{ stepSwaps?: StepSwaps }>({}, c)!;
    const frozen = sessionStepSwaps(draft, model.stepSwaps);
    expect(forgeSlotsFor(UPPER_A, { ...model, stepSwaps: frozen }, TODAY)[0].exerciseName).toBe('Barbell Bench Press');
    expect(forgeSlotsFor(UPPER_A, { ...model, stepSwaps: sessionStepSwaps(undefined, model.stepSwaps) }, TODAY)[0].exerciseName).toBe('High Incline Push-Up');
  });
});
