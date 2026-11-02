import { describe, it, expect } from 'vitest';
import { effortMinutes, effortLine } from './weekEffort';
import { intensityMix, plannedEffortKind } from './standing';
import { EASY_RPE_TOP } from './coach';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const log = (id: string, templateId: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id, plannedSessionId: id, templateId, type: templates.find((t) => t.id === templateId)?.type ?? 'cardio', completedDate: '2026-10-06', completedAt: '2026-10-06T10:00:00Z', variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const byId = new Map(templates.map((t) => [t.id, t]));
const hr = { maxHr: 190 };

// Een horlogeprofiel: de helft van de tijd rustig (120), de helft hard (180).
const detail = (coverage: number) => ({ quality: { heartRateCoveragePct: coverage }, slices: [{ sec: 600, heartRate: 120 }, { sec: 600, heartRate: 180 }] }) as unknown as SessionLog['detail'];

describe('effortMinutes', () => {
  it('telt een rustige loop als rustig en een zware als hard, op het plan als er geen zwaarte is', () => {
    const r = effortMinutes([log('a', 'tpl_easy_run', 40), log('b', 'tpl_hill_intervals', 30)], byId);
    expect(r.easy).toBe(40);
    expect(r.hard).toBe(30);
  });

  it('volgt je eigen zwaarte boven het plan, met de grens van de coach', () => {
    expect(effortMinutes([log('a', 'tpl_easy_run', 40, { rpe: 8 })], byId)).toMatchObject({ easy: 0, hard: 40 });
    expect(effortMinutes([log('a', 'tpl_hill_intervals', 30, { rpe: 3 })], byId)).toMatchObject({ easy: 30, hard: 0 });
    expect(effortMinutes([log('a', 'tpl_easy_run', 40, { rpe: EASY_RPE_TOP })], byId)).toMatchObject({ easy: 40, hard: 0 });
    expect(effortMinutes([log('a', 'tpl_easy_run', 40, { rpe: EASY_RPE_TOP + 1 })], byId)).toMatchObject({ easy: 0, hard: 40 });
  });

  it('telt kracht alleen mee met een zwaarte, en rustdagen nooit', () => {
    const r = effortMinutes([log('a', 'tpl_upper_a', 50), log('b', 'tpl_lower_a', 50, { rpe: 8 }), log('c', 'tpl_herstel', 20)], byId);
    expect(r).toEqual({ easy: 0, hard: 50, uncounted: 50 });
  });

  it('gebruikt gemeten hartslag: alles boven zone 2 is hard, ook als de zwaarte iets anders zegt', () => {
    const l = log('a', 'tpl_easy_run', 20, { detail: detail(95), rpe: 2 });
    expect(effortMinutes([l], byId, hr)).toEqual({ easy: 10, hard: 10, uncounted: 0 });
  });

  it('valt terug op zwaarte of plan als de hartslag te weinig dekt of er geen profiel is', () => {
    expect(effortMinutes([log('a', 'tpl_easy_run', 20, { detail: detail(50) })], byId, hr)).toEqual({ easy: 20, hard: 0, uncounted: 0 });
    expect(effortMinutes([log('a', 'tpl_easy_run', 20, { detail: detail(50), rpe: 8 })], byId, hr)).toEqual({ easy: 0, hard: 20, uncounted: 0 });
    expect(effortMinutes([log('a', 'tpl_easy_run', 20, { detail: detail(95) })], byId, undefined)).toEqual({ easy: 20, hard: 0, uncounted: 0 });
  });

  it('negeert de hartslag als de instelling op het plan staat', () => {
    expect(effortMinutes([log('a', 'tpl_easy_run', 20, { detail: detail(95) })], byId, hr, 'plan')).toEqual({ easy: 20, hard: 0, uncounted: 0 });
  });

  it('telt een log zonder template als rustig', () => {
    expect(effortMinutes([log('a', 'tpl_bestaat_niet', 30, { type: 'cardio' })], byId)).toEqual({ easy: 30, hard: 0, uncounted: 0 });
  });

  it('gebruikt bij kracht de hartslag niet: zonder zwaarte telt de tijd niet mee', () => {
    const l = log('a', 'tpl_lower_a', 45, { detail: detail(95) });
    expect(effortMinutes([l], byId, hr)).toEqual({ easy: 0, hard: 0, uncounted: 45 });
  });

  it('telt een rol hard_effort als hard, ook als het stressprofiel iets anders zegt', () => {
    expect(plannedEffortKind(byId.get('tpl_intervals') ?? byId.get('tpl_hill_intervals'))).toBe('hard');
    expect(plannedEffortKind(undefined)).toBe('easy');
  });
});

describe('gelijk aan Intensiteit op Stand', () => {
  it('geeft op hartslag en op plan dezelfde rustig en hard als intensityMix (zonder kracht)', () => {
    const logs = [
      log('a', 'tpl_easy_run', 20, { detail: detail(95), completedDate: '2026-10-05' }),
      log('b', 'tpl_hill_intervals', 30, { completedDate: '2026-10-06' }),
      log('c', 'tpl_easy_run', 40, { completedDate: '2026-10-07' }),
    ];
    for (const counting of ['heartrate', 'plan'] as const) {
      const mix = intensityMix(logs, templates, '2026-10-08', hr, 28, counting);
      const e = effortMinutes(logs, byId, hr, counting);
      expect(e.easy).toBe(mix.minutes.easy);
      expect(e.hard).toBe(mix.minutes.middle + mix.minutes.hard);
    }
  });
});

describe('effortLine', () => {
  it('zegt het in woorden en blijft stil zonder minuten', () => {
    expect(effortLine({ easy: 80, hard: 36, uncounted: 0 })).toBe('1:20 uur rustig, 36 min hard');
    expect(effortLine({ easy: 45, hard: 0, uncounted: 0 })).toBe('45 min rustig');
    expect(effortLine({ easy: 0, hard: 0, uncounted: 30 })).toBeUndefined();
  });
});
