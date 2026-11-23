(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
// Terugkeer op een rustdag (I-144, docs/beslissingen/2026-11-23-terugkeer-eerste-dag.md). Nagespeeld met nagemaakte,
// verschoven datums: vandaag T is een maandag met de vaste Herstelwandeling, de laatste training (kracht) was twaalf
// dagen eerder, daarna geen logs. Een periode zonder sportschool van vijf dagen met twee dagen ziek boven de nek, en
// de laatste vijf dagen alles overgeslagen of verplaatst. Geen terugkeer gekozen.
// Eerder: lag het einde van de periode meer dan zes dagen terug, dan was de terugkomst "voorbij", ook al had je
// sindsdien niets gedaan. Geen voorstel, en de maandag met weinig training kwam er ook niet, want die terugkomst gold.

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { pauseRestDayLine, proposeReentry, reentryEffect, reentryFirstDay, reentryFirstDayItems, reentryNote, type ReentryInputs } from './reentry';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { applyPlanChangeItems } from './proposalEngine';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };
const name = (id: string) => templates.find((t) => t.id === id)!.name;

let n = 0;
const ps = (templateId: string, scheduledDate: string): PlannedSession => ({
  id: `p${++n}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0,
});
const done = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((t) => t.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

// De weekvorm: maandag de vaste Herstelwandeling, dan Bovenlichaam A, Benen A, Rustige duurloop, Bovenlichaam B,
// Heuvelintervallen en de Lange duurloop.
function week(monday: string): PlannedSession[] {
  return [
    ps('tpl_herstel', monday),
    ps('tpl_upper_a', addDays(monday, 1)),
    ps('tpl_lower_a', addDays(monday, 2)),
    ps('tpl_easy_run', addDays(monday, 3)),
    ps('tpl_upper_b', addDays(monday, 4)),
    ps('tpl_hill_intervals', addDays(monday, 5)),
    ps('tpl_long_run', addDays(monday, 6)),
  ];
}

const T = '2027-02-15'; // een maandag
const t = (k: number) => addDays(T, k);
const raw = ['2027-01-18', '2027-01-25', '2027-02-01', '2027-02-08', '2027-02-15', '2027-02-22'].flatMap(week);
// De laatste vijf dagen: om en om overgeslagen of verplaatst (naar gisteren, en ook daar niet gedaan).
const plan: PlannedSession[] = raw.map((s, i) => {
  if (s.scheduledDate < t(-5) || s.scheduledDate >= T || s.templateId === 'tpl_herstel') return s;
  return i % 2 ? { ...s, status: 'skipped' } : { ...s, status: 'moved', movedFromDate: s.scheduledDate, scheduledDate: t(-1), weekStartDate: mondayOfWeek(t(-1)) };
});
// Alles gedaan tot en met T-12 (een woensdag, Benen A: kracht); daarna niets.
const logs = plan.filter((s) => s.scheduledDate <= t(-12) && s.templateId !== 'tpl_herstel').map(done);
const noGym = (start: number): LeavePeriod => ({ id: 'weg', kind: 'no_gym', startDate: t(start), endDate: t(start + 4) });
const ill = (start: number): IllnessEpisode[] => [{ id: 'ziek', kind: 'above_neck', startDate: t(start), endDate: t(start + 1) }];
const input = (start: number, over: Partial<ReentryInputs> = {}): ReentryInputs => ({
  program, plannedSessions: plan, logs, templates, today: T, illnessEpisodes: ill(start + 1), leavePeriods: [noGym(start)],
  choice: 'three_quarters', respondedIds: new Set(), ...over,
});
const adviceInputs = (start: number, over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs, plannedSessions: plan, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(),
  asOf: T, illnessEpisodes: ill(start + 1), leave: [noGym(start)], restDay: 1, ...over,
});

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${T}T09:00:00+01:00`)); });
afterEach(() => vi.useRealTimers());

describe('I-144: maandag een rustdag na twaalf dagen niets', () => {
  it('de laatste log twaalf dagen terug en geen terugkeer gekozen: de vorm klopt', () => {
    expect(logs.at(-1)!.completedDate).toBe(t(-12));
    expect(logs.at(-1)!.type).toBe('strength');
    expect(plan.filter((s) => s.scheduledDate === T).map((s) => s.templateId)).toEqual(['tpl_herstel']);
  });

  it('elke plek van de periode zonder sportschool tussen je laatste training en de laatste vijf dagen geeft vandaag het voorstel', () => {
    // De periode begint op T-14 (je laatste training valt erin) tot en met T-10 (eindigt op T-6). Voor de fix gaf
    // alles met een einde voor T-7 niets: de terugkomst lag meer dan zes dagen terug.
    for (let start = -14; start <= -10; start++) {
      const p = proposeReentry(input(start));
      expect(p, `zonder sportschool vanaf T${start}`).toBeDefined();
      expect(p).toMatchObject({ lastTraining: t(-12), pauseDays: 12, trainedSince: false, week: { from: T, until: t(6), factor: 0.75 } });
    }
  });

  it('als advies op Vandaag, bovenaan, met de eerste dag als training in hetzelfde voorstel', () => {
    const all = computeAdvice(adviceInputs(-14));
    const a = all.find((x) => x.ruleId === 'REENTRY')!;
    expect(a).toBeDefined();
    expect(all[0].ruleId).toBe('REENTRY');
    expect(a.reentry).toEqual({ from: T, until: t(6), factor: 0.75 });
    expect(a.reentryFirstDay).toMatchObject({ date: T, trainingDate: t(1), restName: name('tpl_herstel'), trainingName: name('tpl_upper_a') });
    expect(a.effect).toContain(`Je laatste training was ${'wo 3 februari'}, 12 dagen geleden. Daartussen was je ziek en weg.`);
    expect(a.effect).toContain(`Vandaag geen herstel maar je eerste training: ${name('tpl_upper_a')} komt naar vandaag, de ${name('tpl_herstel')} naar di 16 februari.`);
    expect(a.effect).not.toContain('Welke trainingen er staan');
  });

  it('de ruil is een eigen voorstel: twee items die naar elkaar wijzen, pas met Akkoord toegepast', () => {
    const f = reentryFirstDay({ from: T, until: t(6) }, plan, logs, templates)!;
    const items = reentryFirstDayItems(f);
    expect(items.map((i) => [i.action, i.toDate])).toEqual([['swap', T], ['swap', t(1)]]);
    const after = applyPlanChangeItems(items, plan, undefined, { by: 'proposal', at: 'test' }).sessions;
    expect(after.filter((s) => s.scheduledDate === T).map((s) => s.templateId)).toEqual(['tpl_upper_a']);
    expect(after.filter((s) => s.scheduledDate === t(1)).map((s) => s.templateId)).toEqual(['tpl_herstel']);
    // Het voorstel zelf verandert niets: de planning blijft tot Akkoord zoals hij was.
    expect(plan.filter((s) => s.scheduledDate === T).map((s) => s.templateId)).toEqual(['tpl_herstel']);
    expect(reentryNote({ from: T, until: t(6), factor: 0.75 }, undefined, f)).toContain(`${name('tpl_upper_a')} komt naar ma 15 februari`);
  });

  it('geen ruil als de eerste dag al een training heeft, als er al getraind is, of zonder kracht- of looptraining in die dagen', () => {
    const withRun = [...plan, ps('tpl_easy_run', T)];
    expect(reentryFirstDay({ from: T, until: t(6) }, withRun, logs, templates)).toBeUndefined();
    const walked = [...logs, { ...done(ps('tpl_walk', T)), id: 'w' } as SessionLog];
    // Een wandeling vandaag gelogd is herstel: de ruil blijft.
    expect(reentryFirstDay({ from: T, until: t(6) }, plan, walked, templates)).toBeDefined();
    const onlyHikes = plan.filter((s) => s.scheduledDate === T || !['tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals'].includes(s.templateId));
    expect(reentryFirstDay({ from: T, until: t(6) }, onlyHikes, logs, templates)).toBeUndefined();
  });

  it('getraind na de terugkomst: de terugkomst is na een week voorbij, zoals in I-124', () => {
    const trained = [...logs, { ...done(ps('tpl_easy_run', t(-8))), id: 'terug' } as SessionLog];
    expect(proposeReentry(input(-14, { logs: trained }))).toBeUndefined();
  });

  it('na Liever niet voor deze terugkomst geen nieuwe vraag, ook niet een week later', () => {
    const declined = new Set([`reentry:${t(-9)}`]);
    expect(proposeReentry(input(-14, { respondedIds: declined }))).toBeUndefined();
    expect(proposeReentry(input(-14, { respondedIds: declined, today: t(2) }))).toBeUndefined();
  });

  it('zonder Akkoord zegt de rustdag eerlijk hoe lang je niet trainde; N is afgeleid', () => {
    expect(pauseRestDayLine({ logs, templates, today: T })).toBe('Je trainde 12 dagen niet. Vandaag rustig beginnen: wandel een half uur stevig door, en houd je eerste training korter dan gewoon.');
    expect(pauseRestDayLine({ logs, templates, today: t(3) })).toMatch(/^Je trainde 15 dagen niet\./);
    // Zeven dagen of minder: de gewone tekst van de rustdag.
    expect(pauseRestDayLine({ logs, templates, today: t(-5) })).toBeUndefined();
    expect(pauseRestDayLine({ logs: [], templates, today: T })).toBeUndefined();
  });

  it('deterministisch: twee keer dezelfde invoer geeft hetzelfde voorstel', () => {
    expect(JSON.stringify(proposeReentry(input(-12)))).toBe(JSON.stringify(proposeReentry(input(-12))));
    expect(reentryEffect(proposeReentry(input(-12))!, T)).toBe(reentryEffect(proposeReentry(input(-12))!, T));
  });
});
