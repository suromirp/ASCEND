(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
import { describe, it, expect } from 'vitest';
import { loadVersusBefore, plannedEffort, weeklyLoad } from './standing';
import { dayLoads } from './weekProfile';
import { loadVerdict } from './standRhythm';
import { planPass } from './planPass';
import type { LeavePeriod } from '../models/leave';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';

// Naspelen van "Belasting Zwaar, 0 van 475" (backlog, Klein deel 1) met nagemaakte data: een zware
// geplande week, op maandag nog niets gedaan. De telling klopt: het oordeel kijkt naar gedaan plus wat
// vanaf vandaag nog komt; alleen de oude tekst zette "0 van" ervoor. Plus de randen: vandaag telt nog
// niet als voorbij, een vakantieweek met training, en de weekgrens rond de wintertijd in Amsterdam.

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: tpl(templateId).type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const planned = (templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `p${n++}`, templateId, scheduledDate: date, status: 'planned', ...extra,
} as PlannedSession);

// Vier gewone weken met elk 60 minuten op zwaarte 5: gewoonlijk 300.
const before = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map((d) => log('tpl_easy_run', d, 60, { rpe: 5 }));

describe('Belasting op Je stand, nagespeeld', () => {
  it('een zware geplande week op maandag: Zwaar, met het hele weekgetal en niet "0 van"', () => {
    const monday = '2026-11-02';
    const heavy = [planned('tpl_long_run', monday, { plannedMinutes: 95 }), planned('tpl_easy_run', '2026-11-05', { plannedMinutes: 40 })];
    const weeks = weeklyLoad({ logs: before, plannedSessions: heavy, templates, today: monday }, 4, 0);
    const now = 95 * plannedEffort(tpl('tpl_long_run')) + 40 * plannedEffort(tpl('tpl_easy_run'));
    expect(weeks[4]).toMatchObject({ weekStart: monday, doneTotal: 0, plannedTotal: now });
    const v = loadVerdict(weeks)!;
    expect(now / 300).toBeGreaterThan(1.3);
    expect(v.word).toBe('Zwaar');
    expect(v.fact).toBe(`wordt ${now}, gewoonlijk 300`);
    expect(v.fact).not.toMatch(/^0 /);
  });

  it('vandaag telt nog niet als voorbij: de training van vandaag staat nog in het getal', () => {
    const today = '2026-11-04';
    const s = planned('tpl_easy_run', today, { plannedMinutes: 60 });
    const weeks = weeklyLoad({ logs: before, plannedSessions: [s], templates, today }, 4, 0);
    expect(weeks[4].plannedTotal).toBe(60 * plannedEffort(tpl('tpl_easy_run')));
    // De dag erna is hij voorbij zonder log: niet meer gepland en niet gedaan.
    expect(weeklyLoad({ logs: before, plannedSessions: [s], templates, today: '2026-11-05' }, 4, 0)[4].plannedTotal).toBe(0);
    // Gelogd telt hij één keer, als gedaan.
    const done = weeklyLoad({ logs: [...before, log('tpl_easy_run', today, 60, { rpe: 4, plannedSessionId: s.id })], plannedSessions: [s], templates, today }, 4, 0)[4];
    expect(done).toMatchObject({ doneTotal: 240, plannedTotal: 0 });
  });

  it('een vakantieweek met een training: de planner haalt de dagen van de vakantie leeg, wat ervoor staat telt', () => {
    // Nagemaakt: vakantie do 5 t/m zo 8 november; de planner (planPass, zoals de app opent) zet wat erin
    // valt op overgeslagen. Een losse wandeling op vakantie die je logde telt als gedaan.
    const today = '2026-11-02';
    const vakantie: LeavePeriod = { id: 'v', kind: 'no_training', startDate: '2026-11-05', endDate: '2026-11-08' };
    const before5 = planned('tpl_easy_run', '2026-11-03', { plannedMinutes: 45, weekStartDate: '2026-11-02' } as Partial<PlannedSession>);
    const inside = [planned('tpl_lower_a', '2026-11-05'), planned('tpl_long_run', '2026-11-08', { plannedMinutes: 90 })];
    const walk = log('tpl_herstel', '2026-11-06', 60, { rpe: 3, type: 'cardio' });
    let id = 0;
    const pass = planPass([before5, ...inside], { today, logs: before, templates, program: null, blocks: [], restDay: 0, newId: () => `n${id++}`, leave: [vakantie], leaveAround: 'wide', leaveReshuffle: true });
    const open = pass.sessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= '2026-11-05' && s.scheduledDate <= '2026-11-08');
    expect(open).toEqual([]);
    const weeks = weeklyLoad({ logs: [...before, walk], plannedSessions: pass.sessions, templates, today }, 4, 0);
    const week = weeks[4];
    // Wat in de vakantie stond telt niet meer als gepland; wat de planner vóór de vakantie in deze week zette wel,
    // precies één keer.
    expect(week.items.filter((i) => i.planned && i.date >= '2026-11-05')).toEqual([]);
    const thisWeekOpen = pass.sessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= today && s.scheduledDate < '2026-11-05');
    expect(thisWeekOpen.length).toBeGreaterThan(0);
    expect(week.items.filter((i) => i.planned).map((i) => i.date).sort()).toEqual(thisWeekOpen.map((s) => s.scheduledDate).sort());
    expect(week.doneTotal).toBe(60 * 3);
  });

  it('de weekgrens rond de wintertijd (zondag 25 oktober 2026): zondag hoort bij de oude week, maandag bij de nieuwe', () => {
    const sunday = log('tpl_easy_run', '2026-10-25', 30, { rpe: 5, completedAt: '2026-10-25T22:30:00Z' });
    const weeks = weeklyLoad({ logs: [sunday], plannedSessions: [planned('tpl_easy_run', '2026-10-26', { plannedMinutes: 30 })], templates, today: '2026-10-25' }, 1, 1);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26']);
    expect(weeks[1]).toMatchObject({ isCurrent: true, doneTotal: 150, plannedTotal: 0 });
    expect(weeks[2].plannedTotal).toBe(30 * plannedEffort(tpl('tpl_easy_run')));
  });
});

describe('een losse log op de dag van een open training (zelfde maatstaf als de koppeling achteraf)', () => {
  // Nagemaakt, nagespeeld zoals Warden: vandaag een open lange duurloop van 95 minuten (95 x 4 = 380 punten).
  const today = '2026-11-04';
  const longRun = () => planned('tpl_long_run', today, { plannedMinutes: 95 });
  const LONG = 95 * plannedEffort(tpl('tpl_long_run'));
  // Een log van het horloge draagt zijn sport mee (de lange duurloop is als template een 'hiking' met sport running).
  const garmin = { source: 'garmin' as const, externalId: 'g1', sport: 'running' as const };
  const week = (logs: SessionLog[], sessions: PlannedSession[], extraTemplates: SessionTemplate[] = []) =>
    weeklyLoad({ logs: [...before, ...logs], plannedSessions: sessions, templates: [...templates, ...extraTemplates], today }, 4, 0)[4];

  it('een log van het horloge staat in voor de training: één keer, als gedaan; de log blijft los', () => {
    const watch = log('tpl_long_run', today, 100, { rpe: 4, ...garmin });
    expect(week([watch], [longRun()])).toMatchObject({ doneTotal: 400, plannedTotal: 0 });
    expect(watch.plannedSessionId).toBeUndefined();
  });

  it('een handlog is altijd extra: een losse rustige loop van 20 minuten laat de lange duurloop staan', () => {
    const hand = log('tpl_easy_run', today, 20, { rpe: 3 });
    const w = week([hand], [longRun()]);
    expect(w.doneTotal + w.plannedTotal).toBe(60 + LONG);
    expect(w.plannedTotal).toBe(LONG);
  });

  it('fietsen dekt geen zwemtraining: de precieze soort, niet de emmer "overig"', () => {
    const swimTpl = { ...tpl('tpl_bike'), id: 'tpl_swim_test', name: 'Zwemmen', sport: undefined, countedSport: 'swimming' } as SessionTemplate;
    const swim = planned('tpl_swim_test', today, { plannedMinutes: 45 });
    const ride = log('tpl_bike', today, 60, { rpe: 4, ...garmin, sport: 'cycling' });
    const w = week([ride], [swim], [swimTpl]);
    expect(w.items.filter((i) => i.planned).map((i) => i.name)).toEqual(['Zwemmen']);
  });

  it('een test of wedstrijd alleen tegen een test of wedstrijd', () => {
    const test = planned('tpl_test_run', today, { plannedMinutes: 45 });
    const easy = log('tpl_easy_run', today, 45, { rpe: 4, ...garmin });
    expect(week([easy], [test]).items.filter((i) => i.planned).map((i) => i.name)).toEqual([tpl('tpl_test_run').name]);
  });

  it('een log die naar een verdwenen training wijst telt als los en mag instaan als hij van een bron is', () => {
    const orphan = log('tpl_long_run', today, 95, { rpe: 4, plannedSessionId: 'weg-na-herplanning', ...garmin });
    expect(week([orphan], [longRun()]).plannedTotal).toBe(0);
    // Met de hand ingevuld en verweesd: extra, de training blijft staan.
    const handOrphan = log('tpl_long_run', today, 95, { rpe: 4, plannedSessionId: 'weg-na-herplanning' });
    expect(week([handOrphan], [longRun()]).plannedTotal).toBe(LONG);
  });

  it('twee losse logs bij één training: één staat in, de tweede is extra', () => {
    const a = log('tpl_long_run', today, 50, { rpe: 4, ...garmin, completedAt: `${today}T08:00:00Z` });
    const b = log('tpl_long_run', today, 45, { rpe: 4, source: 'garmin', externalId: 'g2', sport: 'running', completedAt: `${today}T17:00:00Z` });
    const w = week([a, b], [longRun()]);
    expect(w).toMatchObject({ doneTotal: 50 * 4 + 45 * 4, plannedTotal: 0 });
  });

  it('twee trainingen van dezelfde soort: de log dekt die met de dichtstbijzijnde duur', () => {
    const short = planned('tpl_easy_run', today, { plannedMinutes: 30, id: 'a-kort' } as Partial<PlannedSession>);
    const long = planned('tpl_easy_run', today, { plannedMinutes: 70, id: 'b-lang' } as Partial<PlannedSession>);
    const watch = log('tpl_easy_run', today, 65, { rpe: 4, ...garmin });
    const left = week([watch], [short, long]).items.filter((i) => i.planned).map((i) => i.minutes);
    expect(left).toEqual([30]);
  });

  it('dayLoads (Week) en het weekgetal (Vandaag, Stand) bewegen mee', () => {
    const watch = log('tpl_long_run', today, 100, { rpe: 4, ...garmin });
    const days = dayLoads({ logs: [...before, watch], plannedSessions: [longRun()], templates, today, weekStart: today });
    expect(days.find((d) => d.date === today)?.load).toBe(400);
    const hand = log('tpl_easy_run', today, 20, { rpe: 3 });
    const handDays = dayLoads({ logs: [...before, hand], plannedSessions: [longRun()], templates, today, weekStart: today });
    expect(handDays.find((d) => d.date === today)?.load).toBe(60 + LONG);
    // StandSummaryCard rekent loadVersusBefore op weeklyLoad: dezelfde telling.
    expect(loadVersusBefore(weeklyLoad({ logs: [...before, watch], plannedSessions: [longRun()], templates, today }, 4, 0))?.now).toBe(400);
  });
});
