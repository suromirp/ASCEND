import { describe, it, expect } from 'vitest';
import { coachLineForToday, coachReaction } from './coach';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { Program } from '../models/program';
import type { SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const t = (id: string) => byId.get(id)!;
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }] };
const log = (templateId: string, date: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: 'l', templateId, type: t(templateId).type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...extra,
});

describe('coachLineForToday', () => {
  it('warns to keep it easy before a heavy leg day', () => {
    const line = coachLineForToday({ template: t('tpl_easy_run'), date: '2026-09-29', program, tomorrow: [t('tpl_lower_a')], yesterdayLogs: [], templateById: byId });
    expect(line).toBe('Rustig houden vandaag: morgen staat Benen A (zwaar).');
  });

  it('puts yesterday feeling heavy first, and knows a rest week', () => {
    const heavy = [log('tpl_easy_run', '2026-09-28', { rpe: 7 })];
    expect(coachLineForToday({ template: t('tpl_upper_a'), date: '2026-09-29', program, tomorrow: [], yesterdayLogs: heavy, templateById: byId })).toContain('voelde zwaar');
    expect(coachLineForToday({ template: t('tpl_easy_run'), date: '2026-10-22', program, tomorrow: [], yesterdayLogs: [], templateById: byId })).toContain('Rustweek');
  });
});

describe('coachReaction', () => {
  it('reacts to what was filled in', () => {
    expect(coachReaction(log('tpl_easy_run', '2026-09-29', { rpe: 7, durationMinutes: 30 }), t('tpl_easy_run'), program)).toContain('Zwaarder dan gepland (zwaarte 7, gepland tot 4)');
    expect(coachReaction(log('tpl_easy_run', '2026-09-29', { durationMinutes: 10 }), t('tpl_easy_run'), program)).toContain('Korter dan gepland');
    expect(coachReaction(log('tpl_easy_run', '2026-09-29', { durationMinutes: 30, rpe: 3 }), t('tpl_easy_run'), program)).toBe('Gedaan zoals gepland. Zo bouw je op.');
  });
});
