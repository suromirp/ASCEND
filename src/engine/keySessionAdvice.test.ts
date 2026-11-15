import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { addDays, daysBetween } from '../utils/dates';
import { DEFAULT_KEY_FOCUS, type KeyFocus } from './keySession';
import { buildWeekReview } from './weekReview';
import { adherenceSummary, recentAdherence } from './onCourse';
import { judgeWeek } from './repeatWeek';
import { extraRunEarned } from './extraRun';
import { hardRunApart } from './hardRunApart';
import { keyCatchUpShort } from './adviceShared';
import { keyFocusOf, keyGoalOf, keyRank } from './keySession';
import type { TrainingGoal } from '../models/goals';

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

describe('hoogstens één inhaal per voorstel (Warden B1)', () => {
  const moves = (i: AdviceInputs) => catchUp(i)!.proposal!.changes.filter((c) => c.action === 'move');

  for (const [naam, missed] of [
    ['tempoloop en intervallen', [ps('tempo', 'tpl_tempo_run', '2026-11-16'), ps('int', 'tpl_intervals', '2026-11-17')]],
    ['tempoloop en lange duurloop', [ps('tempo', 'tpl_tempo_run', '2026-11-16'), ps('lr', 'tpl_long_run', '2026-11-17')]],
    ['drie sleutels', [ps('tempo', 'tpl_tempo_run', '2026-11-15'), ps('int', 'tpl_intervals', '2026-11-16'), ps('hi', 'tpl_hill_intervals', '2026-11-17')]],
  ] as const) {
    it(`${naam} gemist: precies één inhaal, de beste trede, nooit naast een harde loop`, () => {
      const planned = [...missed, ps('lr2', 'tpl_long_run', '2026-11-22')];
      const m = moves(inputs({ plannedSessions: planned, keyFocus: TEN_K }));
      expect(m).toHaveLength(1);
      expect(keyRank(byId.get(planned.find((p) => p.id === m[0].plannedSessionId)!.templateId)!, TEN_K)).toBe(0);
      const to = m[0].toDate!;
      for (const o of planned.filter((p) => p.id !== m[0].plannedSessionId && p.scheduledDate >= '2026-11-18')) {
        expect(Math.abs(daysBetween(to, o.scheduledDate)) <= 1 && isHardRun(byId.get(o.templateId)!), `${o.templateId} op ${o.scheduledDate}`).toBe(false);
      }
      const advice = catchUp(inputs({ plannedSessions: planned, keyFocus: TEN_K }))!;
      expect(advice.effect).toContain('hoogstens één');
    });
  }
});

describe('de 48 uur bij het inhalen kijkt over de weekgrens (Warden M1)', () => {
  it('geen inhaal op zondag voor Benen A op maandag', () => {
    // Bergtocht gemist op zaterdag; vandaag zondag; maandag (volgende week) staat Benen A.
    const planned = [ps('mh', 'tpl_mountain_hike', '2026-11-21'), { ...ps('la', 'tpl_lower_a', '2026-11-23'), weekStartDate: '2026-11-23' }];
    const change = catchUp(inputs({ plannedSessions: planned, asOf: '2026-11-22' }))!.proposal!.changes.find((c) => c.plannedSessionId === 'mh');
    expect(change?.action).toBe('remove');
    // Zonder Benen A op maandag past zondag wel.
    const free = catchUp(inputs({ plannedSessions: [planned[0]], asOf: '2026-11-22' }))!.proposal!.changes.find((c) => c.plannedSessionId === 'mh');
    expect(free).toMatchObject({ action: 'move', toDate: '2026-11-22' });
  });
});

describe('hard naast hard en een test (Warden)', () => {
  const tempo = byId.get('tpl_tempo_run')!;
  const base = (planned: PlannedSession[]) => ({ plannedSessions: planned, logs: [] as SessionLog[], asOf: '2026-11-18' });
  it('een test of wedstrijd houdt twee dagen ervoor vrij', () => {
    const s = ps('x', 'tpl_tempo_run', '2026-11-17');
    expect(hardRunApart('2026-11-19', s, tempo, base([ps('t', 'tpl_test_run', '2026-11-21')]), byId)).toBe(false);
    expect(hardRunApart('2026-11-18', s, tempo, base([ps('t', 'tpl_test_run', '2026-11-21')]), byId)).toBe(true);
    expect(hardRunApart('2026-11-19', s, tempo, base([ps('r', 'tpl_race', '2026-11-20')]), byId)).toBe(false);
  });
  it('een lange duurloop telt niet als hard', () => {
    expect(isHardRun(byId.get('tpl_long_run')!)).toBe(false);
    expect(hardRunApart('2026-11-21', ps('x', 'tpl_tempo_run', '2026-11-17'), tempo, base([ps('lr', 'tpl_long_run', '2026-11-22')]), byId)).toBe(true);
  });
});

describe('inkorten alleen bij een sleutel van dezelfde trede (Warden M3)', () => {
  const into = (own: string) => keyCatchUpShort(ps('t', 'tpl_tempo_run', '2026-11-22'), byId.get('tpl_tempo_run')!, '2026-11-24',
    inputs({ keyFocus: TEN_K, plannedSessions: [{ ...ps('o', own, '2026-11-26'), weekStartDate: '2026-11-23' }] }), byId);
  it('een tempoloop in een week met alleen een lange duurloop blijft vol', () => expect(into('tpl_long_run')).toBeUndefined());
  it('een tempoloop in een week met een eigen tempoloop wordt korter, met de naam erbij', () => expect(into('tpl_intervals')).toMatchObject({ own: 'Intervallen' }));
});

describe('het doel van de sleutel is het hoofddoel, niet de volgorde (Warden)', () => {
  const goal = (id: string, over: Partial<TrainingGoal>): TrainingGoal =>
    ({ id, name: id, requirements: [], createdAt: '', updatedAt: '', status: 'active', targetDate: '2027-03-14', ...over }) as TrainingGoal;
  const race = goal('race', { kind: 'run_race', details: { distanceKm: 10 }, priority: 'voortop', order: 0 });
  const gr5 = goal('gr5', { kind: 'trek_hut', targetDate: '2027-07-01', order: 1 });
  it('het doel met de mijlpalen wint, ook als de race bovenaan is gesleept', () => {
    expect(keyFocusOf([race, gr5], new Set(['gr5']), '2026-11-11', {})).toMatchObject({ goal: 'trek_hut' });
    expect(keyFocusOf([{ ...race, order: 1 }, { ...gr5, order: 0 }], new Set(['gr5']), '2026-11-11', {})).toMatchObject({ goal: 'trek_hut' });
  });
  it('zonder hoofddoel: het hoogste label, dan de vroegste datum; een gepauzeerd doel telt niet', () => {
    const top = goal('top', { kind: 'trail', priority: 'top', targetDate: '2027-06-01', order: 1 });
    expect(keyGoalOf([race, top], new Set())?.id).toBe('top');
    expect(keyGoalOf([{ ...top, status: 'paused' }, race], new Set())?.id).toBe('race');
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
    expect(r).toMatchObject({ keyPlanned: 1, keyDone: 0, keyName: 'Tempoloop' });
    expect(r.next?.key).toMatch(/^Tempoloop/);
    // Herhaal de week: de sleutel van de week bleef liggen.
    expect(judgeWeek(r).keyMissed).toBe(true);
  });

  it('één sleutel per week: de tempoloop gedaan en de lange duurloop niet is bij een 10 km een gedane sleutel', () => {
    const logs = [done(planned()[0]), done(planned()[1])];
    const r = buildWeekReview({ weekStart: WEEK, plannedSessions: planned(), logs, templates, program: null, planChangeLog: [], asOf: '2026-11-23', keyFocus: TEN_K })!;
    expect(r).toMatchObject({ keyPlanned: 1, keyDone: 1 });
    expect(judgeWeek(r).keyMissed).toBe(false);
    const d = buildWeekReview({ weekStart: WEEK, plannedSessions: planned(), logs, templates, program: null, planChangeLog: [], asOf: '2026-11-23' })!;
    expect(judgeWeek(d).keyMissed).toBe(true);
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
    expect(adherenceSummary({ reviews: [r], weeks: 1, done: r.done, planned: r.planned, keyDone: r.keyDone, keyPlanned: r.keyPlanned, enough: false })).toContain('sleuteltraining 0 van 1');
  });

  it('de coach telt per week één sleuteltraining', () => {
    // Twee weken met tempoloop, heuvels en lange duurloop; alleen de tempoloop van de eerste week is gedaan.
    const wk = (mon: string, n: string) => [ps(`t${n}`, 'tpl_tempo_run', addDays(mon, 2)), ps(`h${n}`, 'tpl_hill_intervals', addDays(mon, 5)), ps(`l${n}`, 'tpl_long_run', addDays(mon, 6))].map((s) => ({ ...s, weekStartDate: mon }));
    const all = [...wk('2026-11-09', 'a'), ...wk('2026-11-16', 'b')];
    const a = recentAdherence({ today: '2026-11-23', program: null, plannedSessions: all, logs: [done(all[0])], templates, planChangeLog: [], keyFocus: TEN_K });
    expect(adherenceSummary(a)).toContain('sleuteltraining 1 van 2');
  });

  it('de extra training kijkt naar de sleutel van de week', () => {
    const program = { ...buildDefaultProgramData().program, startDate: '2026-09-28' };
    // Twee weken met tempoloop (gemist) en vijf rustige lopen en een lange duurloop (gedaan).
    const wk = (mon: string, n: string) => [
      ps(`t${n}`, 'tpl_tempo_run', addDays(mon, 1)),
      ...[0, 2, 3, 4, 5].map((d) => ps(`e${n}${d}`, 'tpl_easy_run', addDays(mon, d))),
      ps(`l${n}`, 'tpl_long_run', addDays(mon, 6)),
    ].map((s) => ({ ...s, weekStartDate: mon }));
    const all = [...wk('2026-11-16', 'a'), ...wk('2026-11-23', 'b')];
    const logs = all.filter((s) => s.templateId !== 'tpl_tempo_run').map(done);
    const base = { today: '2026-11-30', program, plannedSessions: all, logs, templates, planChangeLog: [] };
    expect(extraRunEarned({ ...base, keyFocus: TEN_K }, '2026-11-30').reason).toContain('sleuteltraining');
    expect(extraRunEarned(base, '2026-11-30').reason ?? '').not.toContain('sleuteltraining');
  });
});

describe('één inhaal over beide regels (Warden, herreview)', () => {
  it('tempoloop gemist en intervallen vandaag overgeslagen met morgen rust: nooit twee voorstellen die samen hard naast hard zetten', () => {
    // Di tempoloop gemist, wo (vandaag) intervallen overgeslagen, do rustdag.
    const planned = [
      ps('tempo', 'tpl_tempo_run', '2026-11-17'),
      { ...ps('int', 'tpl_intervals', '2026-11-18'), status: 'skipped' as const },
      ps('rd', 'tpl_herstel', '2026-11-19'),
      ps('lr', 'tpl_long_run', '2026-11-22'),
    ];
    const all = computeAdvice(inputs({ plannedSessions: planned, keyFocus: TEN_K }));
    const moves = all.flatMap((a) => (a.ruleId === 'MISSED-CATCH-UP' || a.ruleId === 'SKIPPED-KEY-TO-REST' ? a.proposal?.changes ?? [] : []))
      .filter((c) => c.action === 'move');
    expect(moves.length).toBeLessThanOrEqual(1);
  });
});
