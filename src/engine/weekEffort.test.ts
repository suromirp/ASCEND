import { describe, it, expect } from 'vitest';
import { effortMinutes, effortLine } from './weekEffort';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const log = (id: string, templateId: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id, plannedSessionId: id, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: '2026-10-06', completedAt: '2026-10-06T10:00:00Z', variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const byId = new Map(templates.map((t) => [t.id, t]));

describe('effortMinutes', () => {
  it('telt een rustige loop als rustig en een zware als hard, op het plan als er geen zwaarte is', () => {
    const r = effortMinutes([log('a', 'tpl_easy_run', 40), log('b', 'tpl_hill_intervals', 30)], byId);
    expect(r.easy).toBe(40);
    expect(r.hard).toBe(30);
  });

  it('volgt je eigen zwaarte boven het plan', () => {
    expect(effortMinutes([log('a', 'tpl_easy_run', 40, { rpe: 8 })], byId)).toMatchObject({ easy: 0, hard: 40 });
    expect(effortMinutes([log('a', 'tpl_hill_intervals', 30, { rpe: 3 })], byId)).toMatchObject({ easy: 30, hard: 0 });
  });

  it('telt kracht alleen mee met een zwaarte, en rustdagen nooit', () => {
    const r = effortMinutes([log('a', 'tpl_upper_a', 50), log('b', 'tpl_lower_a', 50, { rpe: 8 }), log('c', 'tpl_herstel', 20)], byId);
    expect(r).toEqual({ easy: 0, hard: 50, uncounted: 50 });
  });
});

describe('effortLine', () => {
  it('zegt het in woorden en blijft stil zonder minuten', () => {
    expect(effortLine({ easy: 80, hard: 36, uncounted: 0 })).toBe('1:20 uur rustig, 36 min hard');
    expect(effortLine({ easy: 45, hard: 0, uncounted: 0 })).toBe('45 min rustig');
    expect(effortLine({ easy: 0, hard: 0, uncounted: 30 })).toBeUndefined();
  });
});
