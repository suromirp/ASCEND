import { describe, it, expect } from 'vitest';
import { suggestSameDayOrder } from './concurrentTraining';
import type { PlannedSession, SessionTemplate } from '../models/training';

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
