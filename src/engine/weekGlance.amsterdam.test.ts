(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { buildWeekReview } from './weekReview';
import { weekCountLine } from './weekGlance';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog } from '../models/training';
import { plannedByIdOf } from './logDay';

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

describe('Forge en de weekterugblik rekenen het voorstel met dezelfde week', () => {
  afterEach(() => vi.useRealTimers());

  it('zondag 23:59 en maandag 00:00: één week voor allebei, en de terugblik van deze en vorige week toont hem', async () => {
    const { muscleProposalWeek, reviewShowsMuscleProposal } = await import('./mountainMuscles');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T21:59:00Z')); // zondag 23:59 in Amsterdam
    let today = todayISO();
    expect(muscleProposalWeek(today)).toBe('2026-09-28');
    expect(reviewShowsMuscleProposal(mondayOfWeek(today), today)).toBe(true);
    expect(reviewShowsMuscleProposal('2026-09-28', today)).toBe(true);
    expect(reviewShowsMuscleProposal('2026-09-21', today)).toBe(false);
    vi.setSystemTime(new Date('2026-10-11T22:00:00Z')); // maandag 00:00 in Amsterdam
    today = todayISO();
    expect(muscleProposalWeek(today)).toBe('2026-10-05');
    expect(reviewShowsMuscleProposal('2026-10-12', today)).toBe(true);
    expect(reviewShowsMuscleProposal('2026-10-05', today)).toBe(true);
    expect(reviewShowsMuscleProposal('2026-09-28', today)).toBe(false);
  });
});

// I-58: een training telt op de dag van uitvoeren (docs/beslissingen/2026-11-23-telt-op-dag-van-uitvoeren.md). De grens
// is maandag 00:00 in Amsterdam, op de dag van het log (engine/logDay.ts), dezelfde dag als die van de minuten.
describe('gedaan in een andere week, rond 00:00 Europe/Amsterdam', () => {
  const mon = (id: string): PlannedSession => ({ id, templateId: 'tpl_long_run', scheduledDate: '2026-10-12', weekStartDate: '2026-10-12', status: 'planned', order: 0 });
  const logOf = (s: PlannedSession, completedAt: string, source: SessionLog['source'], completedDate?: string): SessionLog => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(completedAt));
    const day = completedDate ?? todayISO();
    vi.useRealTimers();
    return { id: `l-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: 'hiking', completedDate: day, completedAt, variant: 'full', durationMinutes: 90, source };
  };
  const review = (weekStart: string, plan: PlannedSession[], logs: SessionLog[]) =>
    buildWeekReview({ weekStart, plannedById: plannedByIdOf(plan), plannedSessions: plan, logs, templates, program, planChangeLog: [], asOf: '2026-10-20' })!;

  it('geval 3: zondag gepland, maandag 00:30 Amsterdam gelogd: telt in de week erna, de geplande week zegt het', () => {
    const plan = [sun('s'), mon('m')];
    const logs = [logOf(plan[0], '2026-10-11T22:30:00Z', 'manual')];
    expect(logs[0].completedDate).toBe('2026-10-12');
    const planned = review('2026-10-05', plan, logs);
    expect(planned).toMatchObject({ done: 0, planned: 0, minutes: 0 });
    expect(weekCountLine(planned)).toBe('1 gedaan in de week erna');
    const next = review('2026-10-12', plan, logs);
    expect(next).toMatchObject({ done: 1, planned: 2, minutes: 90 });
    expect(weekCountLine(next)).toBe('1 van 2 gedaan, 1 uit de week ervoor · 1:30 uur');
  });

  it('de dag zelf: zondag 23:59 Amsterdam gelogd voor zondag blijft in dezelfde week, zonder opmerking', () => {
    const plan = [sun('s')];
    const logs = [logOf(plan[0], '2026-10-11T21:59:00Z', 'manual')];
    expect(weekCountLine(review('2026-10-05', plan, logs))).toBe('1 van 1 gedaan · 1:30 uur');
  });

  it('MacroFactor over middernacht: zondag 23:30 begonnen voor de training van maandag telt op maandag, geen andere week', () => {
    const plan = [mon('m')];
    const logs = [logOf(plan[0], '2026-10-11T21:30:00Z', 'macrofactor')];
    expect(logs[0].completedDate).toBe('2026-10-11');
    const r = review('2026-10-12', plan, logs);
    expect(r).toMatchObject({ done: 1, planned: 1, minutes: 90 });
    expect(r.doneElsewhere).toBeUndefined();
    expect(weekCountLine(r)).toBe('1 van 1 gedaan · 1:30 uur');
    expect(review('2026-10-05', plan, logs)).toMatchObject({ done: 0, minutes: 0 });
  });

  it('geval 1: Forge open over de weekgrens; de laatste set zondag 23:50, Afronden op maandag: telt op zondag', async () => {
    const { finishDayDefault } = await import('./forgeSession');
    const { toISODate } = await import('../utils/dates');
    const plan = [mon('m')];
    const lastTickAt = new Date('2026-10-11T21:50:00Z').getTime(); // zondag 23:50 in Amsterdam
    const dayOf = (ms: number) => toISODate(new Date(ms));
    const doneOn = finishDayDefault({ today: '2026-10-12', plannedSessionId: 'm', scheduledDate: '2026-10-12', lastTickAt, dayOf });
    expect(doneOn).toBe('2026-10-11');
    const logs = [logOf(plan[0], '2026-10-11T21:50:00Z', 'manual', doneOn)];
    expect(review('2026-10-05', plan, logs)).toMatchObject({ done: 1, planned: 1, minutes: 90, fromElsewhere: { count: 1, when: 'later' } });
    expect(review('2026-10-12', plan, logs)).toMatchObject({ done: 0, planned: 0, minutes: 0, doneElsewhere: { count: 1, when: 'earlier' } });
    // Een set om 00:10 maandag hoort bij maandag: dan de geplande week.
    const late = finishDayDefault({ today: '2026-10-12', plannedSessionId: 'm', scheduledDate: '2026-10-12', lastTickAt: new Date('2026-10-11T22:10:00Z').getTime(), dayOf });
    expect(late).toBe('2026-10-12');
  });
});
