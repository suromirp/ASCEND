import { describe, it, expect } from 'vitest';
import { suggestSameDayOrder } from './concurrentTraining';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { SessionStressProfile } from '../models/prescription';

function template(id: string, type: SessionTemplate['type']): SessionTemplate {
  return { id, name: id, type, durationVariants: { full: 60 } };
}

function session(id: string, templateId: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate: '2026-09-09', weekStartDate: '2026-09-07', status, order: 0 };
}

const templateById = new Map([
  template('tpl_lower_a', 'strength'),
  template('tpl_easy_run', 'cardio'),
  template('tpl_long_run', 'hiking'),
  template('tpl_herstel', 'recovery'),
].map((t) => [t.id, t]));

describe('suggestSameDayOrder', () => {
  it('suggests separation when a strength and a cardio session share a day', () => {
    const tip = suggestSameDayOrder([session('a', 'tpl_lower_a'), session('b', 'tpl_easy_run')], templateById);
    expect(tip).not.toBeNull();
    expect(tip?.reason).toMatch(/paar uur/);
  });

  it('suggests separation for strength + hiking too', () => {
    const tip = suggestSameDayOrder([session('a', 'tpl_lower_a'), session('b', 'tpl_long_run')], templateById);
    expect(tip).not.toBeNull();
  });

  it('says nothing for a day with only one key session', () => {
    expect(suggestSameDayOrder([session('a', 'tpl_lower_a')], templateById)).toBeNull();
    expect(suggestSameDayOrder([session('a', 'tpl_lower_a'), session('b', 'tpl_herstel')], templateById)).toBeNull();
  });

  it('ignores an already-skipped session', () => {
    const tip = suggestSameDayOrder([session('a', 'tpl_lower_a', 'skipped'), session('b', 'tpl_easy_run')], templateById);
    expect(tip).toBeNull();
  });

  it('says nothing for an empty day', () => {
    expect(suggestSameDayOrder([], templateById)).toBeNull();
  });
});

// Time-budget scheduling redesign (Fase 2) — same-axis load-stacking is a
// distinct concern from the strength+endurance discipline pairing above.
describe('suggestSameDayOrder — same-axis load stacking', () => {
  function templateWithLoad(id: string, type: SessionTemplate['type'], overrides: Partial<SessionStressProfile>): SessionTemplate {
    return {
      id, name: id, type, durationVariants: { full: 60 },
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate', ...overrides },
    };
  }

  it('flags two sessions that both rate heavy on the same new axis (cardioLoad)', () => {
    const byId = new Map([
      templateWithLoad('tpl_a', 'cardio', { cardioLoad: 'heavy' }),
      templateWithLoad('tpl_b', 'cardio', { cardioLoad: 'heavy' }),
    ].map((t) => [t.id, t]));
    const tip = suggestSameDayOrder([session('a', 'tpl_a'), session('b', 'tpl_b')], byId);
    expect(tip).not.toBeNull();
    expect(tip?.reason).toMatch(/cardiovasculaire belasting/);
  });

  it('does not flag two sessions that rate heavy on DIFFERENT axes', () => {
    // Both templates are 'cardio' (not 'strength') so the separate,
    // unchanged strength+endurance discipline check below doesn't also
    // fire here — this test isolates the same-axis-vs-different-axis
    // behavior only.
    const byId = new Map([
      templateWithLoad('tpl_a', 'cardio', { cardioLoad: 'heavy' }),
      templateWithLoad('tpl_b', 'cardio', { upperBodyLoad: 'heavy' }),
    ].map((t) => [t.id, t]));
    expect(suggestSameDayOrder([session('a', 'tpl_a'), session('b', 'tpl_b')], byId)).toBeNull();
  });

  it('a pairingOverride("prefer") suppresses the same-axis flag for that named pair', () => {
    const byId = new Map<string, SessionTemplate>([
      ['tpl_a', { ...templateWithLoad('tpl_a', 'cardio', { cardioLoad: 'heavy' }), pairingOverride: [{ withTemplateId: 'tpl_b', verdict: 'prefer' }] }],
      ['tpl_b', templateWithLoad('tpl_b', 'cardio', { cardioLoad: 'heavy' })],
    ]);
    expect(suggestSameDayOrder([session('a', 'tpl_a'), session('b', 'tpl_b')], byId)).toBeNull();
  });
});
