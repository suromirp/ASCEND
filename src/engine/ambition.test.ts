import { describe, it, expect, afterEach } from 'vitest';
import { effectiveAmbition } from './ambition';
import { resolveEffectiveFullDuration, setAmbition, setRecentSessionMaxima } from './substitutions';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const easy = byId.get('tpl_easy_run')!;
const log = (date: string, extra: Partial<SessionLog>): SessionLog => ({ id: date, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 35, source: 'manual', ...extra });

afterEach(() => {
  setAmbition('standaard');
  setRecentSessionMaxima({ asOf: '2000-01-01', minutesByTemplate: {} });
});

describe('ambition', () => {
  it('Stevig builds 10% faster, Rustig 10% slower', () => {
    // A build week (week 3 of the phase: 40 min for the easy run).
    const date = '2026-10-29';
    const std = resolveEffectiveFullDuration(easy, date, program);
    setAmbition('stevig');
    expect(resolveEffectiveFullDuration(easy, date, program)).toBe(Math.round((std * 1.1) / 5) * 5);
    setAmbition('rustig');
    expect(resolveEffectiveFullDuration(easy, date, program)).toBe(Math.round((std * 0.9) / 5) * 5);
  });

  it('never past 110% of your longest of the last month, also on Stevig', () => {
    setRecentSessionMaxima({ asOf: '2026-10-25', minutesByTemplate: { tpl_easy_run: 30 } });
    setAmbition('stevig');
    expect(resolveEffectiveFullDuration(easy, '2026-10-29', program)).toBeLessThanOrEqual(35);
  });

  it('Stevig falls back to Standaard after pain or two heavy trainings', () => {
    expect(effectiveAmbition('stevig', [], byId, program, '2026-10-20').effective).toBe('stevig');
    expect(effectiveAmbition('stevig', [log('2026-10-15', { painAreas: ['Knie'] })], byId, program, '2026-10-20')).toMatchObject({ effective: 'standaard', reason: expect.stringContaining('pijn') });
    expect(effectiveAmbition('stevig', [log('2026-10-12', { rpe: 7 }), log('2026-10-15', { subjectiveFeel: 'worse' })], byId, program, '2026-10-20').effective).toBe('standaard');
    expect(effectiveAmbition('stevig', [log('2026-09-01', { painAreas: ['Knie'] })], byId, program, '2026-10-20').effective).toBe('stevig');
    expect(effectiveAmbition(undefined, [], byId, program, '2026-10-20').effective).toBe('standaard');
  });
});
