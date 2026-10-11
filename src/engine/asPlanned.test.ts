import { describe, it, expect } from 'vitest';
import { asPlannedLog, canTickOffAsPlanned } from './asPlanned';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { resolveEffectiveFullDuration } from './substitutions';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const ps = (templateId: string, date: string): PlannedSession => ({ id: `p-${templateId}`, templateId, scheduledDate: date, weekStartDate: date, status: 'planned', order: 0 });

describe('asPlannedLog', () => {
  it('logs the planned minutes and nothing made up', () => {
    const t = tpl('tpl_easy_run');
    const log = asPlannedLog(ps('tpl_easy_run', '2026-10-15'), t, program, '2026-10-15');
    expect(log.durationMinutes).toBe(resolveEffectiveFullDuration(t, '2026-10-15', program));
    expect(log.variant).toBe('full');
    expect(log.sport).toBe('running');
    expect(log.completedDate).toBeUndefined();
    expect(log.outdoorData).toBeUndefined();
  });

  it('keeps the day for a training ticked off afterwards', () => {
    expect(asPlannedLog(ps('tpl_easy_run', '2026-10-13'), tpl('tpl_easy_run'), program, '2026-10-15').completedDate).toBe('2026-10-13');
  });

  it('is not offered for rest, nor for strength logged in MacroFactor', () => {
    expect(canTickOffAsPlanned(tpl('tpl_herstel'), false)).toBe(false);
    expect(canTickOffAsPlanned(tpl('tpl_upper_a'), true)).toBe(false);
    expect(canTickOffAsPlanned(tpl('tpl_upper_a'), false)).toBe(true);
    expect(canTickOffAsPlanned(tpl('tpl_long_run'), true)).toBe(true);
  });
});
