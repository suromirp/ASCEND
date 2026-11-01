import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { AdviceInputs } from './adviceEngine';
import type { MorningRule } from './morningRule';
import { addDays } from '../utils/dates';
import { morningProposal, morningProposalCause, morningProposalId, morningProposalLine } from './morningProposal';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-11-04'; // een woensdag
const MONDAY = '2026-11-02';

// Een nagemaakte week: rustig maandag, kracht dinsdag, tempoloop woensdag, rust donderdag, ...
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_tempo_run', 'tpl_herstel', 'tpl_upper_b', 'tpl_easy_run', 'tpl_long_run'];
const week = (monday: string, over: Partial<Record<number, string>> = {}): PlannedSession[] =>
  DAYS.map((id, i) => ({ id: `${monday}-${i}`, templateId: over[i] ?? id, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));

const offRule: MorningRule = {
  date: TODAY, offCount: 2, askTired: true, line: '',
  signals: [
    { key: 'restingHeartRate', verdict: 'hoger', off: true, text: 'rusthartslag 6 hoger dan normaal' },
    { key: 'hrv', verdict: 'lager', off: true, text: 'HRV lager dan normaal' },
    { key: 'sleep', verdict: 'normaal', off: false, text: 'slaap normaal' },
  ],
};
const oneOff: MorningRule = { ...offRule, offCount: 1, askTired: false, signals: offRule.signals.map((s, i) => (i === 1 ? { ...s, off: false, verdict: 'normaal' } : s)) };

function cause(plannedSessions: PlannedSession[], over: Partial<Parameters<typeof morningProposalCause>[0]> = {}) {
  return morningProposalCause({ today: TODAY, rule: offRule, plannedSessions, templates, logs: [], enabled: true, ...over });
}

function inputs(plannedSessions: PlannedSession[], over: Partial<AdviceInputs> = {}): AdviceInputs {
  return {
    logs: [], plannedSessions, templates, injuries: [], program: null, dailyTimeBudget: undefined, sameDayPairingPreference: 'automatic',
    respondedIds: new Set(), asOf: TODAY, ...over,
  } as AdviceInputs;
}

describe('morningProposalCause: wanneer er een voorstel komt', () => {
  it('bij een zware sessie vandaag en twee van de drie afwijkend', () => {
    const c = cause(week(MONDAY));
    expect(c?.session.templateId).toBe('tpl_tempo_run');
    expect(c?.off.map((s) => s.key)).toEqual(['restingHeartRate', 'hrv']);
  });

  it('niet bij één afwijkend getal, zonder regel, uitgezet, of als je zei dat je niet moe bent', () => {
    expect(cause(week(MONDAY), { rule: oneOff })).toBeUndefined();
    expect(cause(week(MONDAY), { rule: undefined })).toBeUndefined();
    expect(cause(week(MONDAY), { enabled: false })).toBeUndefined();
    expect(cause(week(MONDAY), { checkIns: [{ date: TODAY, energy: 'gewoon' }] })).toBeUndefined();
    expect(cause(week(MONDAY), { checkIns: [{ date: TODAY, allNormal: true }] })).toBeUndefined();
    // "Ja, moe" houdt het voorstel.
    expect(cause(week(MONDAY), { checkIns: [{ date: TODAY, energy: 'moe' }] })).toBeDefined();
    // Een regel van gisteren telt niet.
    expect(cause(week(MONDAY), { rule: { ...offRule, date: addDays(TODAY, -1) } })).toBeUndefined();
  });

  it('niet bij een rustige training, een wedstrijd, een gedane of een overgeslagen sessie, en niet als je ziek bent', () => {
    expect(cause(week(MONDAY, { 2: 'tpl_easy_run' }))).toBeUndefined();
    expect(cause(week(MONDAY, { 2: 'tpl_race' }))).toBeUndefined();
    const done: SessionLog = { id: 'l1', plannedSessionId: `${MONDAY}-2`, templateId: 'tpl_tempo_run', type: 'cardio', completedDate: TODAY, completedAt: `${TODAY}T07:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual' };
    expect(cause(week(MONDAY), { logs: [done] })).toBeUndefined();
    expect(cause(week(MONDAY).map((s) => (s.scheduledDate === TODAY ? { ...s, status: 'skipped' as const } : s)))).toBeUndefined();
    expect(cause(week(MONDAY), { illnessEpisodes: [{ id: 'z', kind: 'above_neck', startDate: addDays(TODAY, -1) }] as never })).toBeUndefined();
  });

  it('ook bij een zware beendag en een test', () => {
    expect(cause(week(MONDAY, { 2: 'tpl_lower_a' }))?.session.templateId).toBe('tpl_lower_a');
    expect(cause(week(MONDAY, { 2: 'tpl_test_run' }))?.isTest).toBe(true);
  });
});

describe('morningProposal: altijd een voorstel met Akkoord', () => {
  it('verschuift de sessie naar een goede latere dag, met wat er afwijkt in de uitleg', () => {
    // Donderdag vrij, zodat er deze week een goede latere dag is.
    const plan = week(MONDAY).filter((s) => s.scheduledDate !== addDays(TODAY, 1));
    const c = cause(plan)!;
    const a = morningProposal(inputs(plan), c, new Set());
    expect(a?.id).toBe(morningProposalId(c.session.id, TODAY));
    expect(a?.ruleId).toBe('MORNING-WATCH');
    expect(a?.proposal?.changes[0]).toMatchObject({ plannedSessionId: c.session.id, action: 'move', fromDate: TODAY });
    expect((a?.proposal?.changes[0].toDate ?? '') > TODAY).toBe(true);
    expect(a?.effect).toContain('rusthartslag 6 hoger dan normaal en HRV lager dan normaal');
    expect(a?.why).toMatch(/kan het helpen/);
    expect(a?.why).not.toMatch(/voorkom/i);
  });

  it('komt niet terug na een antwoord, en niet naast een ander voorstel voor dezelfde sessie', () => {
    // Donderdag vrij, zodat er deze week een goede latere dag is.
    const plan = week(MONDAY).filter((s) => s.scheduledDate !== addDays(TODAY, 1));
    const c = cause(plan)!;
    expect(morningProposal(inputs(plan, { respondedIds: new Set([morningProposalId(c.session.id, TODAY)]) }), c, new Set())).toBeUndefined();
    expect(morningProposal(inputs(plan), c, new Set([`morning:${TODAY}:${c.session.id}`]))).toBeUndefined();
    expect(morningProposal(inputs(plan), c, new Set([`leg-ease:${TODAY}:${c.session.id}`]))).toBeUndefined();
    expect(morningProposal(inputs(plan), undefined, new Set())).toBeUndefined();
  });

  it('staat nooit naast de kaart Benen of een beantwoord voorstel van de ochtendcheck voor dezelfde training', () => {
    const plan = week(MONDAY, { 2: 'tpl_lower_a' }).filter((s) => s.scheduledDate !== addDays(TODAY, 1));
    const sore = [{ date: TODAY, legs: 'spierpijn' as const }];
    const c = cause(plan, { checkIns: sore })!;
    expect(c.session.templateId).toBe('tpl_lower_a');
    // Met de kaart Benen als voorstel en spierpijn spreekt die kaart: dit voorstel zwijgt.
    expect(morningProposal(inputs(plan, { legEase: 'voorstel', checkIns: sore }), c, new Set())).toBeUndefined();
    // Staat de kaart uit, dan mag het voorstel er wel zijn.
    expect(morningProposal(inputs(plan, { legEase: 'uit', checkIns: sore }), c, new Set())).toBeDefined();
    // Zonder spierpijn spreekt de kaart Benen niet vanuit de ochtendcheck.
    const plain = cause(plan)!;
    expect(morningProposal(inputs(plan, { legEase: 'voorstel', checkIns: [] }), plain, new Set())).toBeDefined();
    // Een beantwoord voorstel van de ochtendcheck of de kaart Benen voor dezelfde sessie.
    for (const id of [`morning:${TODAY}:${plain.session.id}`, `leg-ease:${TODAY}:${plain.session.id}`]) {
      expect(morningProposal(inputs(plan, { respondedIds: new Set([id]) }), plain, new Set())).toBeUndefined();
    }
  });

  it('zegt op Vandaag in één zin wat er is', () => {
    const c = cause(week(MONDAY))!;
    expect(morningProposalLine(c, 'Tempoloop')).toBe('Twee van de drie getallen van je horloge wijken vanochtend af, en vandaag staat Tempoloop. Er ligt een voorstel om hem later te doen.');
  });
});
