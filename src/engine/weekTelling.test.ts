// Week, de kaart "Je hebt n training gemist", de weekterugblik en het inhaaladvies tellen gemist op één manier
// (docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md). Melding van de eigenaar, zondag 15 november 10:40,
// met een periode Zonder sportschool van za 14 tot en met wo 18 november. Alles nagemaakt.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { deriveSessionStatus, isMissedSession, type PauseContext } from './sessionStatus';
import { isAwayFor } from './leave';
import { leftOutOfCount } from './weekLogs';
import { buildWeekReview } from './weekReview';
import { missedInWeek } from './weekList';
import { rowExtra } from './weekRow';
import { rowNotes, weekConcerns } from './weekConcerns';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { weekWord } from './adviceWeek';
import { weekAccepts } from './hardRunApart';
import { weekLoss } from './fullWeek';
import { planMissed, MISSED_ADVICE } from './missedTraining';
import { addDays, mondayOfWeek } from '../utils/dates';
import weekIcons from '../components/WeekIcons.tsx?raw';

const { templates, program: base } = buildDefaultProgramData();
const program = { ...base, startDate: '2026-10-05' };
const byId = new Map(templates.map((t) => [t.id, t]));

const ps = (id: string, templateId: string, d: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: d, weekStartDate: mondayOfWeek(d), status: 'planned', order: 0, ...over,
});
const log = (s: PlannedSession, min = 40): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: byId.get(s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: min, source: 'manual',
} as SessionLog);

// De week van de eigenaar, met maandag `mon` als begin: vr Rustige duurloop en Bovenlichaam B op overgeslagen (rood
// kruis op zijn scherm), za Lange duurloop 85 minuten niet gedaan, zo Eigen gewicht zelf overgeslagen en Heuvelintervallen
// nog open (vandaag), ma de rustdag. Zonder sportschool van za tot en met wo. De week erna heeft een eigen lange loop.
function ownerWeek(mon: string) {
  const d = (n: number) => addDays(mon, n);
  const leave: LeavePeriod[] = [{ id: 'p1', kind: 'no_gym', startDate: d(5), endDate: d(9) }];
  const mark = { periodId: 'p1', role: 'placed' as const };
  const plan: PlannedSession[] = [
    ps('rest0', 'tpl_herstel', d(0)),
    ps('ua1', 'tpl_upper_a', d(1)),
    ps('la2', 'tpl_lower_a', d(2)),
    ps('er4', 'tpl_easy_run', d(4), { status: 'skipped', movedFromDate: d(3) }),
    ps('ub4', 'tpl_upper_b', d(4), { status: 'skipped', order: 1 }),
    ps('lr5', 'tpl_long_run', d(5), { plannedMinutes: 85 }),
    ps('bw6', 'tpl_bodyweight', d(6), { status: 'skipped', leave: mark }),
    ps('hi6', 'tpl_hill_intervals', d(6), { order: 1 }),
    ps('rest7', 'tpl_herstel', d(7)),
    ps('bw8', 'tpl_bodyweight', d(8), { leave: mark }),
    ps('er10', 'tpl_easy_run', d(10)),
    ps('hi12', 'tpl_hill_intervals', d(12)),
    ps('lr13', 'tpl_long_run', d(13)),
  ];
  const logs = [log(plan[1], 70), log(plan[2], 72)];
  return { plan, logs, leave, today: d(6), sunday: d(6), monday: d(7) };
}

const at = (day: string, time = '10:40:00') => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${day}T${time}+01:00`)); };
afterEach(() => vi.useRealTimers());

const pauseOf = (leave: LeavePeriod[] | undefined): PauseContext => ({ leave, templates: byId });
const adviceInputs = (over: Partial<AdviceInputs>): AdviceInputs => ({
  logs: [], plannedSessions: [], templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-15', restDay: 1, ...over,
});
const catchUp = (inputs: AdviceInputs) => computeAdvice(inputs).filter((a) => a.ruleId === 'MISSED-CATCH-UP' || a.ruleId === 'SKIPPED-KEY-TO-REST');

describe('de voorbeeldweek van de eigenaar (zondag 15 november 10:40)', () => {
  const { plan, logs, leave, today } = ownerWeek('2026-11-09');
  const status = (id: string) => deriveSessionStatus(plan.find((s) => s.id === id)!, logs, byId.get(plan.find((s) => s.id === id)!.templateId)!.type === 'recovery', pauseOf(leave)).status;

  it('punt 2: de lange duurloop zonder sportschool is gemist, net als een gewone dag; geen grijs vervallen', () => {
    at(today);
    expect(status('lr5')).toBe('missed');
    expect(isAwayFor('2026-11-14', byId.get('tpl_long_run'), leave)).toBe(false);
  });

  it('punt 1: de kaart telt precies de rijen die gemist zeggen, gelijk aan de weekterugblik', () => {
    at(today);
    const weekSessions = plan.filter((s) => s.weekStartDate === '2026-11-09');
    const card = missedInWeek(weekSessions, logs, byId, pauseOf(leave));
    const rowsSayingMissed = weekSessions.filter((s) => byId.get(s.templateId)!.type !== 'recovery' && status(s.id) === 'missed').length;
    const review = buildWeekReview({ weekStart: '2026-11-09', plannedSessions: plan, logs, templates, program, planChangeLog: [], asOf: today, leavePeriods: leave })!;
    expect(card).toBe(1);
    expect(rowsSayingMissed).toBe(card);
    expect(review.missed).toEqual(['Lange duurloop']);
    expect(review.missed).toHaveLength(card);
    // Overgeslagen telt wel als gepland en niet gedaan.
    expect(review.planned - review.done).toBe(5);
  });

  it('punt 4: overgeslagen heeft het woord van Vandaag en een gedempt teken, nooit het rood van een fout', () => {
    at(today);
    expect(status('bw6')).toBe('skipped');
    expect(status('er4')).toBe('skipped');
    expect(rowExtra({ skipped: true, moved: true, movedFrom: '2026-11-12' })?.text).toBe('overgeslagen');
    expect(rowExtra({ missed: true, skipped: false })?.text).toBe('gemist');
    expect(weekIcons).toMatch(/skipped: \{ color: 'var\(--color-ink-dim\)'/);
    expect(weekIcons).not.toMatch(/skipped: \{ color: 'var\(--color-danger/);
  });

  it('punt 3: geen waarschuwing over belasting naast een voorbije training die niet gedaan is', () => {
    at(today);
    const check = { sessions: plan, logs, templates, today, restDay: 1, program, leave };
    const notes = rowNotes(weekConcerns(check, '2026-11-09'));
    expect(notes.get('hi6')).toBeUndefined();
    expect(notes.get('lr5')).toBeUndefined();
    // Was de lange duurloop wel gedaan, dan blijft de melding: gedane belasting telt.
    const withRun = rowNotes(weekConcerns({ ...check, logs: [...logs, log(plan.find((s) => s.id === 'lr5')!, 85)] }, '2026-11-09'));
    expect(withRun.get('hi6')).toMatch(/Lange duurloop/);
  });

  it('punten 6 en 7: om 10:40 met Heuvelintervallen nog open geen "vandaag deed je geen training" en geen lange loop op maandag', () => {
    at(today);
    const advice = catchUp(adviceInputs({ plannedSessions: plan, logs, leave, asOf: today }));
    const text = advice.map((a) => `${a.title} ${a.effect}`).join(' ');
    expect(text).not.toMatch(/vandaag deed je geen training/);
    expect(text).not.toMatch(/in plaats van je rustdag/);
    expect(advice.flatMap((a) => a.proposal?.changes ?? []).some((c) => c.toDate === '2026-11-16')).toBe(false);
  });

  it('punt 6 (Warden): "Lange duurloop vervalt" wacht tot de training van vandaag gedaan of overgeslagen is, of de dag om is', () => {
    at(today);
    // Zondag 10:40, Heuvelintervallen nog open: nog geen voorstel.
    expect(catchUp(adviceInputs({ plannedSessions: plan, logs, leave, asOf: today }))).toEqual([]);
    // Heuvelintervallen gedaan: nu het voorstel, over dezelfde training die Week gemist noemt.
    const hills = plan.find((s) => s.id === 'hi6')!;
    const after = catchUp(adviceInputs({ plannedSessions: plan, logs: [...logs, log(hills, 45)], leave, asOf: today }));
    expect(after[0]?.title).toBe('Lange duurloop van za 14 november gemist');
    expect(after[0]?.effect).toBe('Lange duurloop vervalt. De rest van je week blijft zoals gepland.');
    // Maandag (de zondag is om), Heuvelintervallen gedaan: vervalt, niet op de rustdag direct na de heuvels.
    at('2026-11-16');
    const monday = catchUp(adviceInputs({ plannedSessions: plan, logs: [...logs, log(hills, 45)], leave, asOf: '2026-11-16' }));
    expect(monday[0]?.effect).toBe('Lange duurloop vervalt. De rest van je week blijft zoals gepland.');
  });

  it('punt 5: de dag in "verplaatst van do 12" wordt nooit afgekapt', () => {
    const extra = rowExtra({ moved: true, movedFrom: '2026-11-12' })!;
    expect(extra.text).toBe('verplaatst van do 12');
    expect(extra.tail).toBe('do 12');
    expect(rowExtra({ catchNote: 'verplaatst van wo 28' })?.tail).toBe('wo 28');
  });
});

describe('randgevallen', () => {
  it('de dag zelf telt nog niet als voorbij, ook niet om 23:30', () => {
    at('2026-11-15', '23:30:00');
    const run = ps('r', 'tpl_easy_run', '2026-11-15');
    expect(deriveSessionStatus(run, [], false).status).toBe('today');
    expect(isMissedSession(run, new Set(), '2026-11-15')).toBe(false);
    expect(missedInWeek([run], [], byId, {})).toBe(0);
    const review = buildWeekReview({ weekStart: '2026-11-09', plannedSessions: [run], logs: [], templates, program, planChangeLog: [], asOf: '2026-11-15' })!;
    expect(review.missed).toEqual([]);
  });

  it('zonder sportschool: een loop en Eigen gewicht in de periode tellen als gemist, sportschoolkracht niet; een andere sessie blijft gewoon gemist', () => {
    at('2026-12-07');
    const leave: LeavePeriod[] = [{ id: 'g', kind: 'no_gym', startDate: '2026-11-30', endDate: '2026-12-06' }];
    const run = ps('run', 'tpl_easy_run', '2026-12-01');
    const gym = ps('gym', 'tpl_upper_a', '2026-12-02');
    const own = ps('own', 'tpl_bodyweight', '2026-12-03');
    const before = ps('before', 'tpl_lower_a', '2026-11-27');
    const all = [run, gym, own, before];
    expect(deriveSessionStatus(run, [], false, pauseOf(leave)).status).toBe('missed');
    expect(deriveSessionStatus(own, [], false, pauseOf(leave)).status).toBe('missed');
    expect(deriveSessionStatus(gym, [], false, pauseOf(leave)).status).toBe('away');
    expect(deriveSessionStatus(before, [], false, pauseOf(leave)).status).toBe('missed');
    const leftOut = leftOutOfCount(all, [], undefined, '2026-12-07', program.startDate, { periods: leave, templates: byId, loggedIds: new Set() });
    expect(all.filter((s) => leftOut(s.id)).map((s) => s.id)).toEqual(['gym']);
    const review = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: all, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: leave })!;
    expect(review.missed.sort()).toEqual(['Eigen gewicht', 'Rustige duurloop']);
    // Een rij die de periode liet vallen telt niet.
    const dropped = ps('drop', 'tpl_easy_run', '2026-12-04', { status: 'skipped', leave: { periodId: 'g', role: 'dropped' } });
    expect(leftOutOfCount([dropped], [], undefined, '2026-12-07', program.startDate, { periods: leave, templates: byId, loggedIds: new Set() })('drop')).toBe(true);
  });

  it('zonder sportschool is geen pauze: wat ervoor open stond krijgt nog de vraag Niet gedaan?', () => {
    const leave: LeavePeriod[] = [{ id: 'g', kind: 'no_gym', startDate: '2026-11-14', endDate: '2026-11-18' }];
    const run = ps('run', 'tpl_easy_run', '2026-11-13');
    const plan = planMissed({ plannedSessions: [run], logs: [], templates, today: '2026-11-15', settings: { ...MISSED_ADVICE, days: 1 }, memory: {}, leavePeriods: leave });
    expect(plan.item?.session.id).toBe('run');
    const holiday = planMissed({ plannedSessions: [run], logs: [], templates, today: '2026-11-15', settings: { ...MISSED_ADVICE, days: 1 }, memory: {}, leavePeriods: [{ ...leave[0], kind: 'no_training' }] });
    expect(holiday.item).toBeUndefined();
  });

  it('een vakantie blijft nooit gemist, ook een loop niet, en geeft geen inhaaladvies', () => {
    at('2026-12-07');
    const leave: LeavePeriod[] = [{ id: 'v', kind: 'no_training', startDate: '2026-11-30', endDate: '2026-12-06' }];
    const run = ps('run', 'tpl_long_run', '2026-12-05');
    expect(deriveSessionStatus(run, [], false, pauseOf(leave)).status).toBe('away');
    expect(missedInWeek([run], [], byId, pauseOf(leave))).toBe(0);
    expect(catchUp(adviceInputs({ plannedSessions: [run, ps('rest', 'tpl_herstel', '2026-12-07')], leave, asOf: '2026-12-06' }))).toEqual([]);
  });

  it('een zelf overgeslagen training is overgeslagen, niet gemist: niet op de kaart, niet in de terugblik als gemist', () => {
    at('2026-11-15');
    const own = ps('own', 'tpl_easy_run', '2026-11-15', { status: 'skipped' });
    const past = ps('past', 'tpl_upper_a', '2026-11-12', { status: 'skipped' });
    expect(deriveSessionStatus(own, [], false).status).toBe('skipped');
    expect(deriveSessionStatus(past, [], false).status).toBe('skipped');
    expect(missedInWeek([own, past], [], byId, {})).toBe(0);
    const review = buildWeekReview({ weekStart: '2026-11-09', plannedSessions: [own, past], logs: [], templates, program, planChangeLog: [], asOf: '2026-11-15' })!;
    expect(review.missed).toEqual([]);
    expect(review.planned).toBe(2);
    expect(review.done).toBe(0);
  });

  it('een training die vandaag nog staat: morgen is geen rustdag om op te vullen; is vandaag leeg, dan wel', () => {
    at('2026-11-15');
    const long = ps('long', 'tpl_long_run', '2026-11-14');
    const easy = ps('easy', 'tpl_easy_run', '2026-11-15');
    const rest = ps('rest', 'tpl_herstel', '2026-11-16');
    const next = ps('next', 'tpl_long_run', '2026-11-22');
    const withToday = catchUp(adviceInputs({ plannedSessions: [long, easy, rest, next], asOf: '2026-11-15' }));
    expect(withToday.map((a) => a.effect).join(' ')).not.toMatch(/in plaats van je rustdag/);
    // Staat er vandaag niets meer, dan is vandaag zelf de vrije dag in dezelfde week.
    const emptyToday = catchUp(adviceInputs({ plannedSessions: [long, { ...easy, status: 'skipped' }, rest, next], asOf: '2026-11-15' }));
    expect(emptyToday[0].effect).toBe('Lange duurloop haal je in op zo 15 november.');
    // Maandag, na een zondag zonder training: de rustdag van vandaag, korter, en de week heeft een naam.
    at('2026-11-16');
    const monday = catchUp(adviceInputs({ plannedSessions: [long, { ...easy, status: 'skipped' }, rest, next], asOf: '2026-11-16' }));
    expect(monday[0].effect).toBe('Lange duurloop doe je vandaag in plaats van je rustdag, want gisteren deed je geen training. Korter, 45 minuten: deze week heeft al een lange duurloop, en twee volle in één week is te veel ineens.');
  });

  for (const mon of ['2026-11-09', '2027-01-25']) {
    it(`over de week- en maandgrens (week van ${mon}): het inhalen leest dezelfde weekcontrole als Week`, () => {
      const { plan, logs, sunday, monday } = ownerWeek(mon);
      at(sunday);
      const long = plan.find((s) => s.id === 'lr5')!;
      const inputs = { plannedSessions: plan, logs, templates, asOf: sunday, restDay: 1, program };
      // Heuvelintervallen op zondag, de lange loop op maandag erna: Week zou "achter elkaar" melden.
      expect(weekAccepts(monday, long, inputs, { plannedMinutes: 45, removeIds: ['rest7'] })).toBe(false);
      // Heuvelintervallen overgeslagen: dan mag maandag wel.
      const skippedHills = plan.map((s) => (s.id === 'hi6' ? { ...s, status: 'skipped' as const } : s));
      expect(weekAccepts(monday, long, { ...inputs, plannedSessions: skippedHills }, { plannedMinutes: 45, removeIds: ['rest7'] })).toBe(true);
      // En de 48 uur kijken ook over de grens: Benen A op dinsdag erna houdt maandag dicht.
      const legsTuesday = [...skippedHills, ps('la-next', 'tpl_lower_a', addDays(monday, 1))];
      const advice = catchUp(adviceInputs({ plannedSessions: legsTuesday, logs, asOf: sunday }));
      expect(advice.flatMap((a) => a.proposal?.changes ?? []).some((c) => c.toDate === monday)).toBe(false);
    });
  }

  it('zoals de back-up: de lange duurloop is een wandelsjabloon en geruild met Heuvelintervallen (beide verplaatst)', () => {
    // Coördinator, naspelen met de echte back-up (15 november): Lange duurloop heeft het type hiking, staat op za 14 met
    // status moved (van zo 15), Heuvelintervallen op zo 15 met status moved (van za 14). Nagemaakt in dezelfde vorm.
    at('2026-11-15');
    expect(byId.get('tpl_long_run')!.type).toBe('hiking');
    const { plan, logs, leave, today } = ownerWeek('2026-11-09');
    const swapped = plan.map((s) => (s.id === 'lr5' ? { ...s, status: 'moved' as const, movedFromDate: '2026-11-15' } : s.id === 'hi6' ? { ...s, status: 'moved' as const, movedFromDate: '2026-11-14' } : s));
    const lr = swapped.find((s) => s.id === 'lr5')!;
    expect(isAwayFor(lr.scheduledDate, byId.get(lr.templateId), leave)).toBe(false);
    expect(deriveSessionStatus(lr, logs, false, pauseOf(leave)).status).toBe('missed');
    expect(deriveSessionStatus(swapped.find((s) => s.id === 'hi6')!, logs, false, pauseOf(leave)).status).toBe('today');
    expect(missedInWeek(swapped.filter((s) => s.weekStartDate === '2026-11-09'), logs, byId, pauseOf(leave))).toBe(1);
    expect(rowNotes(weekConcerns({ sessions: swapped, logs, templates, today, restDay: 1, program, leave }, '2026-11-09')).get('hi6')).toBeUndefined();
    const text = catchUp(adviceInputs({ plannedSessions: swapped, logs, leave, asOf: today })).map((a) => a.effect).join(' ');
    expect(text).not.toMatch(/vandaag deed je geen training|in plaats van je rustdag/);
  });

  it('volle week (Warden 2): een sportschooltraining die je van een dag zonder sportschool wegzette is geen verlies, een loop wel', () => {
    at('2026-11-20');
    const leave: LeavePeriod[] = [{ id: 'g', kind: 'no_gym', startDate: '2026-11-16', endDate: '2026-11-18' }];
    const lock = { by: 'user' as const, at: '2026-11-15T20:00:00+01:00' };
    const gym = ps('gym', 'tpl_upper_a', '2026-11-21', { status: 'moved', movedFromDate: '2026-11-17', lock });
    const run = ps('run', 'tpl_easy_run', '2026-11-22', { status: 'moved', movedFromDate: '2026-11-18', lock });
    const losses = weekLoss({ today: '2026-11-20', sessions: [gym, run], logs: [], templates, leave });
    expect(losses.map((l) => `${l.name}:${l.how}`)).toEqual(['Rustige duurloop:moved']);
  });

  it('REST-SWAP (Warden 5): op een dag zonder sportschool kan de rustdag schuiven, op een vakantiedag niet', () => {
    at('2026-11-16');
    const plan = [ps('rest', 'tpl_herstel', '2026-11-16'), ps('run', 'tpl_easy_run', '2026-11-17')];
    const swap = (kind: LeavePeriod['kind']) => computeAdvice(adviceInputs({ plannedSessions: plan, asOf: '2026-11-16', leave: [{ id: 'p', kind, startDate: '2026-11-14', endDate: '2026-11-18' }] })).filter((a) => a.ruleId === 'REST-SWAP');
    expect(swap('no_gym')).toHaveLength(1);
    expect(swap('no_training')).toEqual([]);
  });

  it('bewaking (Warden 4): isAwayDay (de dag als geheel weg, ook zonder sportschool) leest niemand voor gemist', () => {
    // Gemist gaat door isAwayFor of isPauseDay. isAwayDay is alleen voor de dag als geheel: de rustiger instap en
    // "Deze week nog een keer?" (docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md).
    const sources = import.meta.glob<string>('./*.ts', { query: '?raw', import: 'default', eager: true });
    const users = Object.entries(sources)
      .filter(([f]) => !f.endsWith('.test.ts') && f !== './leave.ts')
      .filter(([, src]) => /import\s*\{[^}]*\bisAwayDay\b[^}]*\}\s*from '\.\/leave'/.test(src))
      .map(([f]) => f.slice(2));
    expect(users.sort()).toEqual(['reentry.ts', 'repeatWeek.ts']);
  });

  it('punt 8: de week heeft een naam', () => {
    at('2026-11-15');
    expect(weekWord('2026-11-15', '2026-11-15')).toBe('deze week');
    expect(weekWord('2026-11-16', '2026-11-15')).toBe('volgende week');
    expect(weekWord('2026-11-23', '2026-11-15')).toBe('de week van 23 november');
    expect(weekWord('2027-02-01', '2027-01-31')).toBe('volgende week');
  });
});
