import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { daysBetween } from '../utils/dates';
import { DEFAULT_KEY_FOCUS, type KeyFocus } from './keySession';
import { buildWeekReview } from './weekReview';
import { adherenceSummary } from './onCourse';

// Het inhalen met een 10 km-doel (docs/beslissingen/2026-11-11-sleuteltraining.md, gedragswijziging): een gemiste
// tempoloop wordt ook ingehaald, maar alleen als voorstel, en met de 48-uursregel en nooit hard na hard.
const templates = buildDefaultProgramData().templates;
const byId = new Map(templates.map((t) => [t.id, t]));
const WEEK = '2026-11-16'; // maandag
const TEN_K: KeyFocus = { goal: 'run_race', variant: '10k' };
const ps = (id: string, templateId: string, date: string): PlannedSession =>
  ({ id, templateId, scheduledDate: date, weekStartDate: WEEK, status: 'planned', order: 0 }) as PlannedSession;
const done = (s: PlannedSession): SessionLog =>
  ({ id: `log-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: byId.get(s.templateId)!.type, completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T10:00:00.000Z`, variant: 'full', durationMinutes: 45, source: 'manual' }) as SessionLog;
const inputs = (over: Partial<AdviceInputs>): AdviceInputs => ({
  logs: [], plannedSessions: [], templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-18', ...over,
});
const catchUp = (i: AdviceInputs) => computeAdvice(i).find((a) => a.ruleId === 'MISSED-CATCH-UP');
const hard = (t: SessionTemplate | undefined) => !!t && (isHardRun(t) || isLegHeavyTemplate(t));

describe('inhalen met een 10 km-doel', () => {
  // Ma Benen A (gedaan), di tempoloop (gemist), za heuvelintervallen, zo lange duurloop. Vandaag is woensdag.
  const week = () => [ps('la', 'tpl_lower_a', '2026-11-16'), ps('tempo', 'tpl_tempo_run', '2026-11-17'), ps('hi', 'tpl_hill_intervals', '2026-11-21'), ps('lr', 'tpl_long_run', '2026-11-22')];
  const logs = () => [done(week()[0])];

  it('stelt de tempoloop voor op een dag zonder harde buren, en verandert zelf niets', () => {
    const planned = week();
    const before = JSON.stringify(planned);
    const advice = catchUp(inputs({ plannedSessions: planned, logs: logs(), keyFocus: TEN_K }))!;
    expect(JSON.stringify(planned)).toBe(before); // alleen een voorstel: de planning zelf blijft zoals hij was
    expect(advice.proposal).toBeDefined();
    const move = advice.proposal!.changes.find((c) => c.plannedSessionId === 'tempo')!;
    expect(move.action).toBe('move');
    const to = move.toDate!;
    for (const other of planned.filter((s) => s.id !== 'tempo')) {
      const gap = Math.abs(daysBetween(to, other.scheduledDate));
      const t = byId.get(other.templateId);
      // Niet twee harde dagen achter elkaar, en een zware beendag nooit binnen 48 uur.
      if (hard(t)) expect(gap, `${other.templateId} op ${other.scheduledDate}, tempo op ${to}`).toBeGreaterThanOrEqual(isLegHeavyTemplate(t!) ? 2 : 1);
      expect(gap <= 1 && isHardRun(t!)).toBe(false);
    }
  });

  it('zonder vrije dag die past laat het de tempoloop gaan, ook als voorstel', () => {
    // Elke dag na vandaag heeft een harde buur: do intervallen, vr Benen B, za heuvelintervallen, zo lange duurloop.
    const full = [...week(), ps('int', 'tpl_intervals', '2026-11-19'), ps('lb', 'tpl_lower_b', '2026-11-20')];
    const advice = catchUp(inputs({ plannedSessions: full, logs: logs(), keyFocus: TEN_K }))!;
    // Wo ligt voor de intervallen, do is de intervaldag, vr Benen B, za de heuvels, zo na de heuvels: geen dag past.
    expect(advice.proposal!.changes.find((c) => c.plannedSessionId === 'tempo')?.action).toBe('remove');
    expect(full.find((s) => s.id === 'tempo')?.scheduledDate).toBe('2026-11-17');
  });

  it('zonder focus blijft het inhalen zoals het was: de tempoloop vervalt', () => {
    const advice = catchUp(inputs({ plannedSessions: week(), logs: logs() }))!;
    expect(advice.proposal!.changes.find((c) => c.plannedSessionId === 'tempo')?.action).toBe('remove');
  });
});

describe('de weekterugblik en Herhaal de week gebruiken dezelfde sleuteltraining', () => {
  // Vorige week (16 tot 22 november) bleven de tempoloop en de lange duurloop liggen; Benen A is gedaan.
  // Volgende week staan een tempoloop van 50 en een lange duurloop van 75 minuten.
  const planned = () => [
    ps('la', 'tpl_lower_a', '2026-11-16'), ps('tempo', 'tpl_tempo_run', '2026-11-19'), ps('lr', 'tpl_long_run', '2026-11-22'),
    { ...ps('tempo2', 'tpl_tempo_run', '2026-11-26'), weekStartDate: '2026-11-23' }, { ...ps('lr2', 'tpl_long_run', '2026-11-29'), weekStartDate: '2026-11-23' },
  ];
  const review = (keyFocus?: KeyFocus) => buildWeekReview({ weekStart: WEEK, plannedSessions: planned(), logs: [done(planned()[0])], templates, program: null, planChangeLog: [], asOf: '2026-11-23', keyFocus })!;

  it('10 km: de tempoloop is de belangrijkste die bleef liggen, en telt als sleuteltraining', () => {
    const r = review(TEN_K);
    expect(r.keyMissedName).toBe('Tempoloop');
    expect(r).toMatchObject({ keyPlanned: 2, keyDone: 0 });
    expect(r.next?.key).toMatch(/^Tempoloop/);
  });

  it('een doel zonder soort: de lange duurloop, zoals altijd', () => {
    const r = review(DEFAULT_KEY_FOCUS);
    expect(r.keyMissedName).toBe('Lange duurloop');
    expect(r).toMatchObject({ keyPlanned: 1, keyDone: 0 });
    expect(r.next?.key).toMatch(/^Lange duurloop/);
    expect(review(undefined)).toMatchObject({ keyMissedName: 'Lange duurloop', keyPlanned: 1 });
  });

  it('de coachzin heet sleuteltraining', () => {
    const r = review(TEN_K);
    expect(adherenceSummary({ reviews: [r], weeks: 1, done: r.done, planned: r.planned, keyDone: r.keyDone, keyPlanned: r.keyPlanned, enough: false })).toContain('sleuteltraining 0 van 2');
  });
});
