// I-147: de opstartstap beschikbaarheid (computeForecastReplan) en Geen tijd vandaag (proposeNoTimeToday) kiezen een
// latere dag alleen als die open is: geen dichte dag, geen test ernaast volgens de afstandsregels. Lukt het niet, dan
// de volgende vrije dag van de week, nooit een dag naast een test, en lukt niets, dan zichtbaar overslaan. Wat vastligt (test, slot, log) blijft.
import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import { computeForecastReplan } from './adaptiveReplanner';
import { proposeNoTimeToday } from './scheduler';

const { templates } = buildDefaultProgramData();
const ASOF = '2026-09-09';
const MON = '2026-09-21'; // een week in de vervolgweken
const TUE = '2026-09-22';
const WED = '2026-09-23';
const THU = '2026-09-24';
const FRI = '2026-09-25';
const SAT = '2026-09-26';
const SUN = '2026-09-27';

const row = (id: string, templateId: string, scheduledDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: MON, status: 'planned', order: 0 });
const availability = (allowedDays: TrainingAvailability['allowedDays']): TrainingAvailability => ({ allowedDays, dailyTimeBudget: {}, longSessionDays: ['sun'], temporaryExceptions: [] });
const weekdays = availability(['mon', 'tue', 'wed', 'thu', 'fri']);

describe('computeForecastReplan: alleen naar een open dag (I-147)', () => {
  it('een systeemrij van een dichte zaterdag gaat niet naar de dichte zondag, en niet naast de test', () => {
    const tempo = row('tempo', 'tpl_tempo_run', SAT);
    const test = row('test', 'tpl_test_run', THU);
    const { proposal } = computeForecastReplan({ plannedSessions: [tempo, test], templates, availability: weekdays, asOf: ASOF });
    const item = proposal.changes.find((c) => c.plannedSessionId === 'tempo');
    expect(item?.action).toBe('move');
    // Zondag is dicht, vrijdag is de dag na de test (geen harde loop), donderdag is de test zelf.
    expect([SAT, SUN, FRI, THU]).not.toContain(item?.toDate);
    expect([MON, TUE, WED]).toContain(item?.toDate);
    expect(proposal.changes.some((c) => c.plannedSessionId === 'test')).toBe(false);
  });

  it('zonder vrije open dag vervalt de rij zichtbaar: een item en de melding, de test blijft staan', () => {
    const tempo = row('tempo', 'tpl_tempo_run', SAT);
    const full = [MON, TUE, WED, FRI].map((d, i) => row(`vol${i}`, 'tpl_easy_run', d));
    const test = row('test', 'tpl_test_run', THU);
    const result = computeForecastReplan({ plannedSessions: [tempo, test, ...full], templates, availability: weekdays, asOf: ASOF });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'tempo');
    expect(item?.action).toBe('remove');
    expect(result.passiveSummary).toMatch(/overgeslagen/);
    expect(result.proposal.changes.map((c) => c.plannedSessionId)).toEqual(['tempo']);
  });

  it('een rij op een dichte dag die een vaste rij zou verschuiven, probeert de volgende dag', () => {
    // Zaterdag dicht. Vrijdag heeft een rij met jouw slot; die blijft, dus de rij gaat naar een andere open dag.
    const tempo = row('tempo', 'tpl_tempo_run', SAT);
    const mine: PlannedSession = { ...row('mine', 'tpl_easy_run', FRI), lock: { by: 'user', at: '2026-09-01T10:00:00.000Z' } };
    const { proposal } = computeForecastReplan({ plannedSessions: [tempo, mine], templates, availability: weekdays, asOf: ASOF });
    expect(proposal.changes.some((c) => c.plannedSessionId === 'mine')).toBe(false);
    const item = proposal.changes.find((c) => c.plannedSessionId === 'tempo');
    expect([MON, TUE, WED, THU]).toContain(item?.toDate);
  });

  it('een gelogde rij op een dichte dag blijft staan: lockLevel krijgt de logs mee', () => {
    const done = row('done', 'tpl_easy_run', SAT);
    const log: SessionLog = { id: 'l1', plannedSessionId: 'done', templateId: 'tpl_easy_run', type: 'cardio', completedAt: `${SAT}T10:00:00.000Z`, completedDate: SAT, variant: 'full', durationMinutes: 35, source: 'manual' } as SessionLog;
    const without = computeForecastReplan({ plannedSessions: [done], templates, availability: weekdays, asOf: ASOF });
    expect(without.proposal.changes.map((c) => c.plannedSessionId)).toEqual(['done']);
    const withLogs = computeForecastReplan({ plannedSessions: [done], templates, availability: weekdays, asOf: ASOF, logs: [log] });
    expect(withLogs.proposal.changes).toEqual([]);
  });
});

describe('proposeNoTimeToday: een latere dag moet open zijn (I-147)', () => {
  const THIS_MON = '2026-09-07';
  const at = (id: string, templateId: string, date: string): PlannedSession => ({ ...row(id, templateId, date), weekStartDate: THIS_MON });

  it('slaat een dichte dag over', () => {
    const run = at('run', 'tpl_easy_run', '2026-09-09');
    const [p] = proposeNoTimeToday([run], templates, '2026-09-09', [], null, undefined, undefined, { isOpen: (d) => d !== '2026-09-10' });
    expect(p.changes[0]).toMatchObject({ sessionId: 'run', toDate: '2026-09-11' });
  });

  it('kiest geen dag naast een test als er een andere vrije dag is, en verschuift de test niet', () => {
    // Woensdag geen tijd, donderdag de test: vrijdag is de dag na de test, dus zaterdag.
    const tempo = at('tempo', 'tpl_tempo_run', '2026-09-09');
    const test = at('test', 'tpl_test_run', '2026-09-10');
    const [p] = proposeNoTimeToday([tempo, test], templates, '2026-09-09');
    expect(p.changes.map((c) => c.sessionId)).toEqual(['tempo']);
    expect(p.changes[0].toDate).toBe('2026-09-12');
  });

  it('alleen dagen naast een test over: geen terugval naar zo een dag, zichtbaar overslaan (I-164)', () => {
    // Vrijdag geen tijd, zaterdag de test, zondag de dag erna: er is geen dag over die de afstandsregels laten staan.
    const tempo = at('tempo', 'tpl_tempo_run', '2026-09-11');
    const test = at('test', 'tpl_test_run', '2026-09-12');
    const [p, ...rest] = proposeNoTimeToday([tempo, test], templates, '2026-09-11');
    expect(rest).toEqual([]);
    expect(p.resolved).toBe(false);
    expect(p.changes).toEqual([expect.objectContaining({ sessionId: 'tempo', fromDate: '2026-09-11', toDate: '2026-09-11' })]);
  });

  it('een vastgezette rij op de dag zelf krijgt geen voorstel, ook niet naar de dag naast de test', () => {
    const mine: PlannedSession = { ...at('mine', 'tpl_tempo_run', '2026-09-11'), lock: { by: 'user', at: '2026-09-01T10:00:00.000Z' } };
    const test = at('test', 'tpl_test_run', '2026-09-12');
    expect(proposeNoTimeToday([mine, test], templates, '2026-09-11', [], null, undefined, undefined, { stays: (s) => !!s.lock })).toEqual([]);
  });

  it('geen open dag meer: zichtbaar overslaan', () => {
    const run = at('run', 'tpl_easy_run', '2026-09-11');
    const [p] = proposeNoTimeToday([run], templates, '2026-09-11', [], null, undefined, undefined, { isOpen: () => false });
    expect(p.resolved).toBe(false);
    expect(p.changes[0]).toMatchObject({ fromDate: '2026-09-11', toDate: '2026-09-11' });
    expect(p.reason).toMatch(/overgeslagen/);
  });
});
