(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { buildWeekReview } from './weekReview';
import { weekCountLine } from './weekGlance';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { Program } from '../models/program';
import type { PlannedSession } from '../models/training';

const { templates } = buildDefaultProgramData();
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }] };
const sun = (id: string): PlannedSession => ({ id, templateId: 'tpl_long_run', scheduledDate: '2026-10-11', weekStartDate: '2026-10-05', status: 'planned', order: 0 });

describe('de weekgrens rond 00:00 Europe/Amsterdam', () => {
  afterEach(() => vi.useRealTimers());

  it('zondag 23:59 is nog dezelfde week en de lange duurloop van vandaag blijft niet liggen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T21:59:00Z')); // 23:59 in Amsterdam (zomertijd)
    const today = todayISO();
    expect(today).toBe('2026-10-11');
    expect(mondayOfWeek(today)).toBe('2026-10-05');
    const r = buildWeekReview({ weekStart: mondayOfWeek(today), plannedSessions: [sun('s')], logs: [], templates, program, planChangeLog: [], asOf: today })!;
    expect(r.running).toBe(true);
    expect(r.missed).toEqual([]);
    expect(weekCountLine(r)).toBe('0 gedaan');
  });

  it('maandag 00:00 is een nieuwe week; de vorige is voorbij en wat open stond bleef liggen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T22:00:00Z')); // 00:00 maandag in Amsterdam
    const today = todayISO();
    expect(today).toBe('2026-10-12');
    expect(mondayOfWeek(today)).toBe('2026-10-12');
    const r = buildWeekReview({ weekStart: '2026-10-05', plannedSessions: [sun('s')], logs: [], templates, program, planChangeLog: [], asOf: today })!;
    expect(r.running).toBe(false);
    expect(r.missed).toHaveLength(1);
    expect(weekCountLine(r)).toBe('Geen trainingen deze week. Volgende week volgt het plan.');
  });
});
