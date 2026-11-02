import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { restDayThisWeek } from './restDayThisWeek';
import { emptyDayText } from './restDayBack';
import { weekConcerns } from './weekConcerns';
import { planWeekFix } from './weekFixProposal';
import type { PlannedSession, SessionLog } from '../models/training';
import type { LeavePeriod } from '../models/leave';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));

// Nagemaakt: de week van maandag 2 november 2026, vaste rustdag maandag.
const planned = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: '2026-11-02', status: 'planned', order: 0, ...over });
const log = (id: string, templateId: string, date: string, plannedSessionId?: string): SessionLog => ({
  id, templateId, plannedSessionId, type: byId.get(templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

// Een volle week met de testloop op maandag en alleen zaterdag vrij.
const testOnMonday = (): PlannedSession[] => [
  planned('test', 'tpl_test_run', '2026-11-02'),
  planned('upA', 'tpl_upper_a', '2026-11-03'),
  planned('easy', 'tpl_easy_run', '2026-11-04'),
  planned('legs', 'tpl_lower_a', '2026-11-05'),
  planned('upB', 'tpl_upper_b', '2026-11-06'),
  planned('long', 'tpl_long_run', '2026-11-08'),
];
const input = (over: Partial<Parameters<typeof restDayThisWeek>[0]> = {}) => ({
  anyDay: '2026-11-04', restDay: 1, sessions: testOnMonday(), logs: [] as SessionLog[], templateById: byId, today: '2026-11-04', ...over,
});

describe('Rustdag deze week: de vaste rustdag is bezet', () => {
  it('kiest de vrije dag als je testloop op je rustdag stond', () => {
    expect(restDayThisWeek(input())).toEqual({ date: '2026-11-07', fixedDay: '2026-11-02', reason: 'je rustdag op maandag is bezet' });
  });

  it('telt een gelogde training op de rustdag ook als bezet', () => {
    const sessions = testOnMonday().filter((s) => s.id !== 'test');
    expect(restDayThisWeek(input({ sessions, logs: [log('l1', 'tpl_test_run', '2026-11-02')] }))?.date).toBe('2026-11-07');
  });

  it('zegt niets als de vaste rustdag vrij is', () => {
    const sessions = testOnMonday().filter((s) => s.id !== 'test');
    expect(restDayThisWeek(input({ sessions }))).toBeNull();
    // Een overgeslagen training op maandag is weg: de dag is vrij.
    expect(restDayThisWeek(input({ sessions: [...sessions, { ...testOnMonday()[0], status: 'skipped' }] }))).toBeNull();
  });

  it('zegt niets als de rust van de week al op een andere dag staat', () => {
    const sessions = testOnMonday().map((s) => (s.id === 'upB' ? { ...s, templateId: 'tpl_herstel' } : s));
    expect(restDayThisWeek(input({ sessions }))).toBeNull();
  });

  it('geeft niets als er geen vrije dag over is (dan spreekt de melding REST-DAY)', () => {
    const sessions = [...testOnMonday(), planned('sat', 'tpl_easy_run', '2026-11-07')];
    expect(restDayThisWeek(input({ sessions }))).toBeNull();
  });

  it('neemt de eerste vrije dag, ook vlak voor een zware dag als er geen keus is', () => {
    // Dinsdag en zaterdag vrij, allebei voor een zware dag (Benen A op woensdag, de lange duurloop op zondag): de eerste.
    const sessions = [
      planned('test', 'tpl_test_run', '2026-11-02'),
      planned('legs', 'tpl_lower_a', '2026-11-04'),
      planned('upA', 'tpl_upper_a', '2026-11-05'),
      planned('easy', 'tpl_easy_run', '2026-11-06'),
      planned('long', 'tpl_long_run', '2026-11-08'),
    ];
    expect(restDayThisWeek(input({ sessions, today: '2026-11-02' }))?.date).toBe('2026-11-03');
    // Zonder zware dag erna is de eerste vrije dag het ook.
    const light = sessions.map((s) => (s.id === 'legs' ? { ...s, templateId: 'tpl_upper_b' } : s));
    expect(restDayThisWeek(input({ sessions: light, today: '2026-11-02' }))?.date).toBe('2026-11-03');
  });

  it('slaat een dag over die vlak voor een zware dag ligt als er een andere is', () => {
    const sessions = [
      planned('test', 'tpl_test_run', '2026-11-02'),
      planned('upA', 'tpl_upper_a', '2026-11-03'),
      planned('legs', 'tpl_lower_a', '2026-11-05'),
      planned('upB', 'tpl_upper_b', '2026-11-06'),
      planned('easy', 'tpl_easy_run', '2026-11-08'),
    ];
    // Vrij: wo 4 (voor Benen A) en za 7 (voor een rustige duurloop): zaterdag.
    expect(restDayThisWeek(input({ sessions, today: '2026-11-02' }))?.date).toBe('2026-11-07');
  });

  it('een gemiste zware training in het verleden telt niet als zware dag', () => {
    const sessions = [
      planned('test', 'tpl_test_run', '2026-11-02'),
      planned('legs', 'tpl_lower_a', '2026-11-04'),
      planned('upA', 'tpl_upper_a', '2026-11-05'),
      planned('upB', 'tpl_upper_b', '2026-11-06'),
      planned('easy', 'tpl_easy_run', '2026-11-08'),
    ];
    // Vandaag is vrijdag: Benen A op woensdag is gemist, dus dinsdag ligt niet voor een zware dag.
    expect(restDayThisWeek(input({ sessions, today: '2026-11-06' }))?.date).toBe('2026-11-03');
  });

  it('slaat een dag met een overgeslagen rij, een vakantieband of een losse wandeling over', () => {
    const sessions = [...testOnMonday(), planned('sat', 'tpl_upper_a', '2026-11-07', { status: 'skipped' })];
    expect(restDayThisWeek(input({ sessions }))).toBeNull();
    const leave: LeavePeriod[] = [{ id: 'v1', kind: 'trek', startDate: '2026-11-07', endDate: '2026-11-07' } as LeavePeriod];
    expect(restDayThisWeek(input({ leave }))).toBeNull();
  });

  it('een vakantiedag in de week is al rust', () => {
    const sessions = testOnMonday().filter((s) => s.id !== 'upB');
    const leave: LeavePeriod[] = [{ id: 'v1', kind: 'no_training', startDate: '2026-11-06', endDate: '2026-11-06' } as LeavePeriod];
    expect(restDayThisWeek(input({ sessions, leave }))).toBeNull();
  });

  it('zonder vaste rustdag zegt hij niets', () => {
    expect(restDayThisWeek(input({ restDay: undefined }))).toBeNull();
  });
});

describe('Week: de lege dag die deze week je rustdag is', () => {
  it('heet Rustdag deze week, met de reden', () => {
    const extra = { logs: [], today: '2026-11-04' };
    expect(emptyDayText('2026-11-07', 1, testOnMonday(), byId, extra)).toEqual({ rest: true, title: 'Rustdag deze week', line: 'je rustdag op maandag is bezet' });
    expect(emptyDayText('2026-11-03', 1, testOnMonday().filter((s) => s.id !== 'upA'), byId, extra)).toMatchObject({ rest: true, title: 'Rustdag deze week' });
  });

  it('een andere lege dag blijft Vrij', () => {
    const sessions = testOnMonday().filter((s) => s.id !== 'upA');
    expect(emptyDayText('2026-11-07', 1, sessions, byId, { logs: [], today: '2026-11-04' })).toEqual({ rest: false, title: 'Vrij', line: 'niets gepland' });
  });

  it('zonder de extra gegevens blijft het zoals het was', () => {
    expect(emptyDayText('2026-11-07', 1, testOnMonday(), byId)).toEqual({ rest: false, title: 'Vrij', line: 'niets gepland' });
  });
});

describe('Geen vrije dag over: de bestaande melding REST-DAY met voorstel', () => {
  it('je testloop op je rustdag in een volle week: "Deze week heeft geen rustdag." en een voorstel met Akkoord', () => {
    const sessions = [...testOnMonday(), planned('sat', 'tpl_easy_run', '2026-11-07', { lock: { by: 'user', at: '2026-10-30T08:00:00Z' } })];
    const check = { sessions, logs: [], templates, today: '2026-11-01', restDay: 1, goalDay: '2027-08-01' };
    expect(restDayThisWeek(input({ sessions, today: '2026-11-01' }))).toBeNull();
    const rest = weekConcerns(check, '2026-11-02').find((c) => c.rule === 'REST-DAY')!;
    expect(rest.headline).toBe('Deze week heeft geen rustdag.');
    const advice = planWeekFix(check, rest, '2026-11-02');
    expect(advice?.ruleId).toBe('WEEK-CHECK');
    // Het is een voorstel: er verandert pas iets na Akkoord.
    expect(advice?.proposal?.changes.length).toBeGreaterThan(0);
  });
});
