// Week en de weekterugblik zeggen hetzelfde over één week (Pathfinder, 15 november; besluit
// docs/beslissingen/2026-11-15-gemist-en-opnieuw-plannen.md): de som sluit (I-40), de kaart en het inhaaladvies tellen
// niet langs elkaar heen (I-41), en gemist heeft één richting (I-42). Alles nagemaakt.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import { buildWeekReview, type WeekReview } from './weekReview';
import { attentionLines, MISSED_REPLAN_HINT, weekCountLine, weekRestLines } from './weekGlance';
import { missedInWeek, replanSub } from './weekList';
import { deriveSessionStatus } from './sessionStatus';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { mondayOfWeek } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }, { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 4 }] };
const ps = (id: string, templateId: string, date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0, ...over });
const log = (s: PlannedSession, date = s.scheduledDate): SessionLog => ({
  id: `l-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: byId.get(s.templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 45, source: 'manual',
});

// Week van maandag 5 oktober: di Bovenlichaam A gedaan, wo Bovenlichaam B gemist, do Rustige duurloop overgeslagen,
// vr Benen A in een periode zonder sportschool (vervallen), zo Lange duurloop gemist.
const W = '2026-10-05';
const leave: LeavePeriod[] = [{ id: 'g', kind: 'no_gym', startDate: '2026-10-09', endDate: '2026-10-09' }];
const plan = [
  ps('ua', 'tpl_upper_a', '2026-10-06'),
  ps('ub', 'tpl_upper_b', '2026-10-07'),
  ps('er', 'tpl_easy_run', '2026-10-08', { status: 'skipped' }),
  ps('la', 'tpl_lower_a', '2026-10-09'),
  ps('lr', 'tpl_long_run', '2026-10-11'),
];
const logs = [log(plan[0])];
const review = (asOf: string, extra: Partial<Parameters<typeof buildWeekReview>[0]> = {}): WeekReview =>
  buildWeekReview({ weekStart: W, plannedSessions: plan, logs, templates, program, planChangeLog: [], asOf, leavePeriods: leave, ...extra })!;

describe('I-40: de weekterugblik sluit de som', () => {
  it('een voorbije week: gedaan, gemist en overgeslagen samen zijn "van n"; vervallen staat erbij en telt niet mee', () => {
    const r = review('2026-10-13');
    expect(weekCountLine(r)).toBe('1 van 4 gedaan · 45 min');
    expect(r.missed).toEqual(['Bovenlichaam B', 'Lange duurloop']);
    expect(r.skipped).toEqual(['Rustige duurloop']);
    expect(r.lapsed).toEqual(['Benen A (zwaar)']);
    expect(r.done + r.missed.length + (r.skipped?.length ?? 0)).toBe(r.planned);
    expect(weekRestLines(r, { missedShown: true })).toEqual(['Overgeslagen: Rustige duurloop', 'Vervallen: Benen A (zwaar), telt niet mee']);
  });

  it('dezelfde woorden als de rijen in Week: overgeslagen en vervallen', () => {
    const r = review('2026-10-13');
    const pause = { leave, templates: byId };
    const status = (s: PlannedSession) => deriveSessionStatus(s, logs, false, pause).status;
    // deriveSessionStatus leest vandaag van de klok: alles in deze week ligt in het verleden.
    expect(plan.filter((s) => status(s) === 'skipped').map((s) => byId.get(s.templateId)!.name)).toEqual(r.skipped);
    expect(plan.filter((s) => status(s) === 'away').map((s) => byId.get(s.templateId)!.name)).toEqual(r.lapsed);
  });

  it('valt Gemist buiten de twee regels om op te letten, dan staat hij bij de rest, zodat de som toch sluit', () => {
    const r = review('2026-10-13');
    const full: WeekReview = { ...r, pain: ['knie 2 keer'], weeklyCheck: { weekStart: W, trouble: 'minder', area: 'Rug' } };
    expect(attentionLines(full).map((a) => a.key)).toEqual(['check', 'pain']);
    expect(weekRestLines(full, { missedShown: false })[0]).toBe('Gemist: Bovenlichaam B en Lange duurloop');
  });

  it('niets overgeslagen of vervallen: geen extra regel', () => {
    const r = buildWeekReview({ weekStart: W, plannedSessions: plan.slice(0, 2), logs, templates, program, planChangeLog: [], asOf: '2026-10-13' })!;
    expect(weekRestLines(r, { missedShown: true })).toEqual([]);
  });
});

describe('I-42: gemist heeft één richting', () => {
  it('de lopende week: de regel Gemist laat los en verwijst naar Week opnieuw plannen, met dezelfde woorden als de kaart', () => {
    const r = review('2026-10-10');
    expect(r.replan).toBe(true);
    const missed = attentionLines(r).find((a) => a.key === 'missed')!;
    expect(missed.value).toBe(`Bovenlichaam B. Laat het los; dubbel doen helpt niet. ${MISSED_REPLAN_HINT}`);
    expect(missed.value).toContain('Week opnieuw plannen');
    // De kaart zegt hetzelfde: niet dubbel, de rest terug naar het plan.
    expect(replanSub(1)).toMatch(/niet dubbel; zet de rest terug naar het plan\.$/);
  });

  it('een voorbije week heeft geen rij Week opnieuw plannen: dan ook geen verwijzing', () => {
    const r = review('2026-10-13');
    expect(r.replan).toBe(false);
    expect(attentionLines(r).find((a) => a.key === 'missed')!.value).not.toContain('Week opnieuw plannen');
  });

  it('zonder programma ook niet: Week toont de rij dan niet', () => {
    const r = review('2026-10-10', { program: null });
    expect(r.replan).toBe(false);
  });
});

afterEach(() => { vi.useRealTimers(); });

describe('I-41: de kaart en het inhaaladvies tellen niet langs elkaar heen', () => {
  // Maandag 12 oktober: het advies kijkt drie dagen terug, tot in de vorige week; de kaart in Week telt deze week.
  const asOf = '2026-10-12';
  const sessions = [ps('a', 'tpl_upper_b', '2026-10-09'), ps('b', 'tpl_easy_run', '2026-10-10'), ps('c', 'tpl_upper_a', '2026-10-13')];
  const inputs: AdviceInputs = { logs: [], plannedSessions: sessions, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf };

  it('de titel van het advies noemt de dagen en geen eigen aantal; de kaart zegt "deze week"', () => {
    const advice = computeAdvice(inputs).find((a) => a.ruleId === 'MISSED-CATCH-UP');
    expect(advice?.title).toBe('Gemist sinds vr 9 oktober: Bovenlichaam B en Rustige duurloop');
    expect(advice?.title).not.toMatch(/^\d/);
    // Deze week (vanaf maandag 12) is er niets gemist: de kaart zegt dan niets over gemist.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${asOf}T12:00:00`));
    const week = sessions.filter((s) => s.weekStartDate === '2026-10-12');
    expect(missedInWeek(week, [], byId, { leave: undefined, templates: byId })).toBe(0);
    expect(replanSub(2)).toMatch(/^Je hebt deze week 2 trainingen gemist\./);
  });
});
