import { describe, it, expect } from 'vitest';
import { dayLoads, ridgeSentence, weekProgress } from './weekProfile';
import { plannedEffort, weeklyLoad } from './standing';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { setLongRunThenLegs } from './scheduler';
import type { PlannedSession, SessionLog } from '../models/training';
import { leftOutOfCount } from './weekLogs';

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const byId = new Map(templates.map((t) => [t.id, t]));
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: tpl(templateId).type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const planned = (templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `p${n++}`, templateId, scheduledDate: date, weekStartDate: '2026-10-19', status: 'planned', order: 0, ...extra,
} as PlannedSession);

const TODAY = '2026-10-22'; // donderdag
const WEEK = '2026-10-19';
const base = { templates, today: TODAY };

describe('dayLoads', () => {
  it('een los horlogelog dat instaat voor een open zware beendag laat de beendag staan', () => {
    // Vandaag staat Heuvelsprints en afdalen open; een losse horlogeloop is op de rustige loop opgeslagen.
    const hills = planned('tpl_hills_descent', TODAY);
    const loose = log('tpl_easy_run', TODAY, 40, { rpe: 4, source: 'garmin', externalId: 'g-been', sport: 'running' });
    const days = dayLoads({ ...base, weekStart: WEEK, logs: [loose], plannedSessions: [hills] });
    expect(days[3].legTemplate?.id).toBe('tpl_hills_descent');
  });

  it('geeft zeven dagen van maandag tot zondag', () => {
    const days = dayLoads({ ...base, weekStart: WEEK, logs: [], plannedSessions: [] });
    expect(days.map((d) => d.date)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    expect(days.every((d) => d.load === 0 && !d.hasTraining)).toBe(true);
  });

  it('een gekoppelde test met snelste 5 km telt in twee delen, en de dag zegt dat', () => {
    const bestEffort = { km: 5, minutes: 25, wholeKm: 8.2, wholeMinutes: 45, accepted: true, v: 2 };
    const cardioData = { durationMinutes: 45, distanceKm: 8.2, source: 'garmin' as const };
    const days = dayLoads({ ...base, weekStart: WEEK, logs: [log('tpl_test_run', '2026-10-20', 45, { rpe: 10, cardioData, bestEffort })], plannedSessions: [] });
    const tue = days.find((d) => d.date === '2026-10-20')!;
    expect(tue.load).toBe(310);
    expect(tue.split).toBe(true);
    expect(days.filter((d) => d.split)).toHaveLength(1);
  });

  it('is minuten maal inspanning: je eigen RPE voor wat gedaan is, de geplande inspanning voor wat komt', () => {
    const days = dayLoads({
      ...base, weekStart: WEEK,
      logs: [log('tpl_lower_a', '2026-10-19', 70, { rpe: 7 })],
      plannedSessions: [planned('tpl_easy_run', '2026-10-23', { plannedMinutes: 40 })],
    });
    expect(days[0].load).toBe(70 * 7);
    expect(days[4].load).toBe(40 * plannedEffort(tpl('tpl_easy_run')));
    expect(days[1].load).toBe(0);
  });

  it('zet een log die een dag eerder in het bestand staat op de dag van zijn geplande training', () => {
    const ps = planned('tpl_upper_a', '2026-10-22');
    const l = log('tpl_upper_a', '2026-10-21', 50, { rpe: 7, plannedSessionId: ps.id, source: 'macrofactor' });
    const days = dayLoads({ ...base, weekStart: WEEK, logs: [l], plannedSessions: [ps] });
    expect(days[2].load).toBe(0);
    expect(days[3].load).toBe(50 * 7);
    expect(days[3].hasTraining).toBe(true);
    // De log zelf is niet veranderd.
    expect(l.completedDate).toBe('2026-10-21');
    expect(ridgeSentence(days, TODAY)).toContain('Donderdag');
  });

  it('is dezelfde belasting als de weektotalen op Stand', () => {
    const logs = [log('tpl_lower_a', '2026-10-19', 70, { rpe: 7 }), log('tpl_easy_run', '2026-10-20', 35)];
    const plannedSessions = [planned('tpl_long_run', '2026-10-25', { plannedMinutes: 60 }), planned('tpl_hill_intervals', '2026-10-24', { plannedMinutes: 35 })];
    const days = dayLoads({ ...base, weekStart: WEEK, logs, plannedSessions });
    const week = weeklyLoad({ logs, plannedSessions, templates, today: TODAY }, 0, 0)[0];
    expect(days.reduce((s, d) => s + d.load, 0)).toBe(week.doneTotal + week.plannedTotal);
  });

  it('telt niet mee wat gemist of overgeslagen is, en een rustdag is nul', () => {
    const days = dayLoads({
      ...base, weekStart: WEEK, logs: [],
      plannedSessions: [planned('tpl_easy_run', '2026-10-20'), planned('tpl_easy_run', '2026-10-23', { status: 'skipped' }), planned('tpl_herstel', '2026-10-24')],
    });
    expect(days.reduce((s, d) => s + d.load, 0)).toBe(0);
  });

  it('werkt voor vorige en komende weken, ook ver weg', () => {
    const last = dayLoads({ ...base, weekStart: '2026-10-12', logs: [log('tpl_easy_run', '2026-10-13', 30, { rpe: 4 })], plannedSessions: [] });
    expect(last[1].load).toBe(120);
    const ahead = dayLoads({ ...base, weekStart: '2026-12-07', logs: [], plannedSessions: [planned('tpl_long_run', '2026-12-13', { plannedMinutes: 90 })] });
    expect(ahead[6].load).toBe(90 * plannedEffort(tpl('tpl_long_run')));
  });

  it('markeert beendagen, ook wat al gedaan is, en geen bovenlichaam of rustige duurloop', () => {
    const days = dayLoads({
      ...base, weekStart: WEEK,
      logs: [log('tpl_lower_a', '2026-10-19', 70, { rpe: 7 }), log('tpl_easy_run', '2026-10-20', 35)],
      plannedSessions: [planned('tpl_upper_b', '2026-10-23'), planned('tpl_hill_intervals', '2026-10-24')],
    });
    expect(days.map((d) => d.legTemplate?.id)).toEqual(['tpl_lower_a', undefined, undefined, undefined, undefined, 'tpl_hill_intervals', undefined]);
  });
});

describe('weekProgress', () => {
  it('telt gedaan op de aanwezigheid van een log, zonder rustdagen, met overgeslagen trainingen als gepland', () => {
    const a = planned('tpl_lower_a', '2026-10-19');
    const b = planned('tpl_easy_run', '2026-10-20');
    const c = planned('tpl_upper_b', '2026-10-23');
    const skipped = planned('tpl_easy_run', '2026-10-24', { status: 'skipped' });
    const rest = planned('tpl_herstel', '2026-10-21');
    const logs = [log('tpl_lower_a', '2026-10-19', 70, { plannedSessionId: a.id })];
    expect(weekProgress([a, b, c, skipped, rest], logs, byId)).toEqual({ done: 1, total: 4 });
  });
});

describe('ridgeSentence', () => {
  const days = (logs: SessionLog[], sessions: PlannedSession[], today = TODAY) => dayLoads({ templates, today, weekStart: WEEK, logs, plannedSessions: sessions });

  it('zegt dat er niets staat in een lege week', () => {
    expect(ridgeSentence(days([], []), TODAY)).toBe('Deze week staat er geen training.');
  });

  it('noemt de zwaarste dag en genoeg ruimte tussen twee beendagen', () => {
    const d = days([log('tpl_lower_a', '2026-10-19', 70, { rpe: 7 })], [planned('tpl_mountain_hike', '2026-10-24', { plannedMinutes: 150 })]);
    expect(ridgeSentence(d, TODAY)).toBe('Zaterdag is je zwaarste dag. Tussen Benen A en Bergtocht zitten vier dagen, ruim genoeg.');
  });

  it('zegt "was" voor een zwaarste dag die al geweest is', () => {
    const d = days([log('tpl_lower_a', '2026-10-19', 90, { rpe: 8 })], [planned('tpl_easy_run', '2026-10-23')]);
    expect(ridgeSentence(d, TODAY)).toMatch(/^Maandag was je zwaarste dag\./);
  });

  it('waarschuwt als twee beendagen te dicht op elkaar liggen, met het aantal uren dat de planner wil', () => {
    const d = days([], [planned('tpl_lower_a', '2026-10-23', { plannedMinutes: 60 }), planned('tpl_mountain_hike', '2026-10-24', { plannedMinutes: 100 })]);
    const s = ridgeSentence(d, TODAY);
    expect(s).toContain('Let op: tussen');
    expect(s).toMatch(/liefst (48|72) uur\.$/);
  });

  it('zegt "net genoeg" bij precies 48 uur', () => {
    const d = days([], [planned('tpl_lower_a', '2026-10-23', { plannedMinutes: 60 }), planned('tpl_hill_intervals', '2026-10-25', { plannedMinutes: 35 })]);
    expect(ridgeSentence(d, TODAY)).toMatch(/zit één dag, net genoeg\.$/);
  });

  // docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md: 48 uur tussen de lange duurloop en beenkracht.
  it('waarschuwt bij Benen A de dag na de lange duurloop, ook met de instelling aan na het weekendblok', () => {
    const longThenLegs = () => days([], [planned('tpl_long_run', '2026-10-24', { plannedMinutes: 50 }), planned('tpl_lower_a', '2026-10-25', { plannedMinutes: 60 })]);
    expect(ridgeSentence(longThenLegs(), TODAY)).toContain('Let op: tussen Lange duurloop en Benen A');
    // Drie beendagen op rij: heuvels, lange duurloop, Benen A.
    const three = () => days([], [planned('tpl_hill_intervals', '2026-10-22', { plannedMinutes: 35 }), planned('tpl_long_run', '2026-10-23', { plannedMinutes: 50 }), planned('tpl_lower_a', '2026-10-24', { plannedMinutes: 60 })]);
    setLongRunThenLegs(true);
    try {
      expect(ridgeSentence(longThenLegs(), TODAY)).not.toContain('Let op');
      expect(ridgeSentence(three(), TODAY)).toContain('Let op: tussen Lange duurloop en Benen A');
    } finally {
      setLongRunThenLegs(false);
    }
  });

  it('vindt de bewuste combinatie van heuvelintervallen en lange duurloop geen fout', () => {
    const d = days([], [planned('tpl_hill_intervals', '2026-10-24', { plannedMinutes: 35 }), planned('tpl_long_run', '2026-10-25', { plannedMinutes: 50 })]);
    const s = ridgeSentence(d, TODAY);
    expect(s).toContain('bewust achter elkaar');
    expect(s).not.toContain('Let op');
  });

  it('waarschuwt niet tussen twee tochtdagen: een tocht ligt bewust aaneen (Doorloop, punt 13)', () => {
    const trek = { periodId: 't', role: 'placed' as const };
    const d = days([], [
      planned('tpl_mountain_hike', '2026-10-24', { plannedMinutes: 180, leave: { ...trek, from: '2026-10-24' } }),
      planned('tpl_mountain_hike', '2026-10-25', { plannedMinutes: 180, leave: { ...trek, from: '2026-10-25' } }),
    ]);
    const s = ridgeSentence(d, TODAY);
    expect(s).not.toContain('Let op');
    expect(s).toContain('tochtdagen');
  });

  it('een enkele beendag en een week zonder beendag', () => {
    expect(ridgeSentence(days([], [planned('tpl_long_run', '2026-10-25', { plannedMinutes: 60 })]), TODAY)).toContain('Eén zware beendag');
    expect(ridgeSentence(days([], [planned('tpl_easy_run', '2026-10-24')]), TODAY)).toMatch(/Geen zware beendag\.$/);
  });
});

describe('weekProgress met een training die naar later is gezet', () => {
  // Melding van de eigenaar (9 november): alles afgevinkt en toch "6/7 gedaan". De oude rij van een
  // gemiste training die je naar een andere dag zette telde nog mee. Nagemaakte data.
  const old = planned('tpl_upper_a', '2026-10-21', { status: 'skipped' });
  const moved = planned('tpl_upper_a', '2026-10-22', { catchUp: { fromId: old.id, fromDate: '2026-10-21' } });
  const run = planned('tpl_easy_run', '2026-10-20');
  const all = [run, old, moved];

  it('telt de oude rij niet als de nieuwe rij er staat', () => {
    const logs = [log('tpl_easy_run', '2026-10-20', 40, { plannedSessionId: run.id }), log('tpl_upper_a', '2026-10-22', 50, { plannedSessionId: moved.id })];
    expect(weekProgress(all, logs, byId, leftOutOfCount(all, [], undefined, TODAY))).toEqual({ done: 2, total: 2 });
  });

  it('telt de nieuwe rij als open zolang die geen log heeft', () => {
    const logs = [log('tpl_easy_run', '2026-10-20', 40, { plannedSessionId: run.id })];
    expect(weekProgress(all, logs, byId, leftOutOfCount(all, [], undefined, TODAY))).toEqual({ done: 1, total: 2 });
  });

  it('telt de oude rij weer als de nieuwe rij zelf is overgeslagen', () => {
    const skippedAgain = [run, old, { ...moved, status: 'skipped' as const }];
    expect(weekProgress(skippedAgain, [], byId, leftOutOfCount(skippedAgain, [], undefined, TODAY)).total).toBe(3);
  });

  it('een gewone overgeslagen training zonder nieuwe rij telt nog steeds als gepland en niet gedaan', () => {
    const plain = [run, old];
    expect(weekProgress(plain, [], byId, leftOutOfCount(plain, [], undefined, TODAY))).toEqual({ done: 0, total: 2 });
  });
});
