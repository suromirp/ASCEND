import { describe, it, expect } from 'vitest';
import { NO_GOAL_WAVES_ID, noGoalWavesAdvice, noGoalWavesLines, wavesConsentPatch, wavesHeld, withWavesConsent } from './noGoalWaves';
import { planDirection } from './direction';
import type { Phase } from '../models/program';
import type { TrainingGoal } from '../models/goals';

// Een bestaand plan zonder doel gaat pas in golven na Akkoord. Nagemaakte gegevens.

const TODAY = '2026-10-26';
const phase = (id: string): Phase => ({ id, name: id, order: 1, weekCount: 4 } as unknown as Phase);
const oldPlan = { phases: [phase('phase_base'), phase('phase_build')] };
const wavePlan = { phases: [phase('phase_golf')] };

describe('wavesHeld', () => {
  it('houdt een plan dat nog niet in golven loopt vast tot Akkoord', () => {
    expect(wavesHeld({}, oldPlan)).toBe(true);
    expect(wavesHeld({ noGoalWaves: 'agreed' }, oldPlan)).toBe(false);
  });

  it('een plan dat al in golven loopt, of geen plan, houdt niets vast', () => {
    expect(wavesHeld({}, wavePlan)).toBe(false);
    expect(wavesHeld({}, { phases: [phase('phase_golf_start'), phase('phase_golf')] })).toBe(false);
    expect(wavesHeld({}, null)).toBe(false);
    expect(wavesHeld({}, undefined)).toBe(false);
  });

  it('een onbekende waarde telt niet als Akkoord', () => {
    expect(wavesHeld({ noGoalWaves: 'ja' }, oldPlan)).toBe(true);
    expect(wavesHeld({ noGoalWaves: true }, oldPlan)).toBe(true);
  });
});

describe('planDirection met een bestaand plan', () => {
  it('zonder Akkoord blijft het oude plan staan', () => {
    expect(planDirection({}, [], new Set(), TODAY, undefined, oldPlan)).toEqual({ free: false, held: true });
  });

  it('na Akkoord neutrale golven', () => {
    expect(planDirection({ noGoalWaves: 'agreed' }, [], new Set(), TODAY, undefined, oldPlan)).toEqual({ free: true });
  });

  it('met een doel speelt het vasthouden geen rol', () => {
    const goal = { id: 'g1', name: 'Doel', status: 'active', requirements: [], createdAt: '', updatedAt: '', targetDate: '2027-03-13' } as unknown as TrainingGoal;
    expect(planDirection({}, [goal], new Set(), TODAY, undefined, oldPlan)).toEqual({ free: false });
  });
});

type ConsentInput = Parameters<typeof withWavesConsent>[0];

describe('withWavesConsent', () => {
  it('een voorstel over je doelen, je richting of je golf neemt het Akkoord mee', () => {
    expect(withWavesConsent<ConsentInput>({ trigger: 'goal_removed', goals: [] }).settings).toEqual(wavesConsentPatch);
    expect(withWavesConsent({ trigger: 'direction_changed', settings: { direction: 'easy' } }).settings).toEqual({ direction: 'easy', ...wavesConsentPatch });
    expect(withWavesConsent({ trigger: 'wave_review', settings: {} }).settings).toEqual(wavesConsentPatch);
  });

  it('een ander voorstel laat de instellingen zoals ze zijn', () => {
    const input: ConsentInput = { trigger: 'availability_changed', settings: { restDay: 2 } };
    expect(withWavesConsent(input)).toBe(input);
    const bare: ConsentInput = { trigger: 'session_moved' };
    expect(withWavesConsent(bare)).toBe(bare);
  });
});

describe('noGoalWavesAdvice', () => {
  it('alleen een vastgehouden plan zonder doel krijgt het voorstel', () => {
    const [a] = noGoalWavesAdvice(planDirection({}, [], new Set(), TODAY, undefined, oldPlan));
    expect(a.id).toBe(NO_GOAL_WAVES_ID);
    expect(a.title).toBe('Plannen zonder doel: neutrale golven');
    expect(a.noGoalWaves).toBe(true);
    expect(noGoalWavesAdvice(planDirection({ noGoalWaves: 'agreed' }, [], new Set(), TODAY, undefined, oldPlan))).toEqual([]);
    expect(noGoalWavesAdvice(planDirection({}, [], new Set(), TODAY, undefined, wavePlan))).toEqual([]);
    expect(noGoalWavesAdvice(planDirection({}, [], new Set(), TODAY, '2027-07-25', oldPlan))).toEqual([]);
  });

  it('zegt wat er verandert en wat blijft, zonder gedachtestreepjes of uitroeptekens', () => {
    const [a] = noGoalWavesAdvice({ held: true });
    const lines = noGoalWavesLines();
    expect(lines.join(' ')).toMatch(/bergtocht/i);
    expect(lines.join(' ')).toMatch(/lange loop/);
    expect(a.effect).toMatch(/Liever niet/);
    for (const text of [a.title, a.effect, a.why, a.brief ?? '', ...lines]) expect(text).not.toMatch(/[–—!]/);
  });
});
