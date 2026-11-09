import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import type { StepSwaps } from '../../engine/stepSwaps';
import type { SessionTemplate } from '../../models/training';
import { sessionStepSwaps, type WorkoutDraft } from './forgeDraft';
import { saveWithLimit, stepUndoFrom } from './stepUndo';

// Nagemaakte training: Push-Up op plek p1, bankdrukken op p2.
const PUSH = { id: 'tpl_push', name: 'Duwen', type: 'strength', durationVariants: { full: 40, short: 25 }, exercises: [
  { id: 'p1', exerciseName: 'Push-Up', sets: 3, reps: '8-12', priority: 'core' },
  { id: 'p2', exerciseName: 'Bench Press', sets: 3, reps: '6-8', priority: 'core' },
] } as SessionTemplate;
const ACCEPTED: { stepSwaps: StepSwaps } = { stepSwaps: { tpl_push: { p1: { from: 'push-up', to: 'decline-push-up' } } } };

describe('een begonnen sessie houdt zijn ladderstappen, ook na herladen', () => {
  it('Akkoord, dan een andere oefening afvinken, dan opnieuw openen: de plek blijft de oude oefening', () => {
    // Openen zonder stappen; het concept bewaart dat als null (zoals useForgeDraft het schrijft).
    const opened = sessionStepSwaps(undefined, undefined);
    const draft = JSON.parse(JSON.stringify({ v: 1, savedAt: 1, startedAt: 1, column: 'target', stepSwaps: opened ?? null, exercises: [{ slot: 'p2', rows: [{ done: true }] }] })) as WorkoutDraft;
    // Akkoord tijdens de sessie zet de stap in het krachtmodel; daarna herladen.
    const reopened = sessionStepSwaps(draft, ACCEPTED.stepSwaps);
    expect(reopened).toBeUndefined();
    expect(forgeSlotsFor(PUSH, { ...ACCEPTED, stepSwaps: reopened }, '2026-11-20')[0].exerciseName).toBe('Push-Up');
    // Een nieuwe sessie ziet de stap wel.
    expect(forgeSlotsFor(PUSH, { ...ACCEPTED, stepSwaps: sessionStepSwaps(undefined, ACCEPTED.stepSwaps) }, '2026-11-20')[0].exerciseName).toBe('Decline Push-Up');
  });

  it('een concept met een stap houdt die stap, ook als je hem intussen terugzette', () => {
    const draft = { stepSwaps: ACCEPTED.stepSwaps } as Pick<WorkoutDraft, 'stepSwaps'>;
    expect(forgeSlotsFor(PUSH, { stepSwaps: sessionStepSwaps(draft, undefined) }, '2026-11-20')[0].exerciseName).toBe('Decline Push-Up');
  });

  it('een concept van voor dit veld neemt de stappen van nu', () => {
    expect(sessionStepSwaps({} as Pick<WorkoutDraft, 'stepSwaps'>, ACCEPTED.stepSwaps)).toEqual(ACCEPTED.stepSwaps);
  });
});

describe('Terug naar ... in je plan', () => {
  afterEach(() => vi.useRealTimers());

  it('de rij blijft staan met zijn uitkomst, ook al neemt de opslag de stap meteen weg', async () => {
    let model: { stepSwaps?: StepSwaps } = ACCEPTED;
    const ex = { slot: 'p1', exerciseId: 'decline-push-up' };
    // Bij het openen van het blad vastgelegd.
    const captured = stepUndoFrom(model, 'tpl_push', ex);
    expect(captured).toBe('Push-Up');
    // Nep-updateSettings: zet de state voordat de belofte terugkomt, zoals de echte.
    const updateSettings = (next: { stepSwaps?: StepSwaps }) => {
      model = next;
      return Promise.resolve();
    };
    const result = await saveWithLimit(() => updateSettings({ stepSwaps: undefined }));
    expect(result).toBe('done');
    // Opnieuw uitrekenen zou de rij weghalen; de vastgelegde naam blijft.
    expect(stepUndoFrom(model, 'tpl_push', ex)).toBeUndefined();
    expect(captured).toBe('Push-Up');
  });

  it('niet bij een oefening die je in deze training ruilde, of een andere oefening op die plek', () => {
    expect(stepUndoFrom(ACCEPTED, 'tpl_push', { slot: 'p1', exerciseId: 'decline-push-up', swappedFrom: 'Push-Up' })).toBeUndefined();
    expect(stepUndoFrom(ACCEPTED, 'tpl_push', { slot: 'p1', exerciseId: 'push-up' })).toBeUndefined();
  });

  it('een opslag die niet op tijd terugkomt is niet gelukt; komt hij later, dan hoort de rij het alsnog', async () => {
    vi.useFakeTimers();
    let finish: () => void = () => undefined;
    const late = vi.fn();
    const pending = saveWithLimit(() => new Promise<void>((r) => { finish = r; }), 8000, late);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toBe('failed');
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(late).toHaveBeenCalledTimes(1);
    expect(await saveWithLimit(() => Promise.reject(new Error('kapot')))).toBe('failed');
  });
});
