(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
import { describe, it, expect } from 'vitest';
import { plannedEffort, weeklyLoad } from './standing';
import { loadVerdict } from './standRhythm';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';

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
    expect(v.fact).toBe(`nu ${now}, gewoonlijk 300`);
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

  it('een vakantieweek met een training: alleen de training telt, overgeslagen trainingen niet', () => {
    const today = '2026-11-02';
    const hike = planned('tpl_easy_run', '2026-11-04', { plannedMinutes: 45 });
    const skipped = planned('tpl_long_run', '2026-11-07', { status: 'skipped' } as Partial<PlannedSession>);
    const weeks = weeklyLoad({ logs: before, plannedSessions: [hike, skipped], templates, today, isRestWeek: () => false }, 4, 0);
    expect(weeks[4].plannedTotal).toBe(45 * plannedEffort(tpl('tpl_easy_run')));
    expect(weeks[4].items.map((i) => i.name)).toEqual([tpl('tpl_easy_run').name]);
  });

  it('de weekgrens rond de wintertijd (zondag 25 oktober 2026): zondag hoort bij de oude week, maandag bij de nieuwe', () => {
    const sunday = log('tpl_easy_run', '2026-10-25', 30, { rpe: 5, completedAt: '2026-10-25T22:30:00Z' });
    const weeks = weeklyLoad({ logs: [sunday], plannedSessions: [planned('tpl_easy_run', '2026-10-26', { plannedMinutes: 30 })], templates, today: '2026-10-25' }, 1, 1);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26']);
    expect(weeks[1]).toMatchObject({ isCurrent: true, doneTotal: 150, plannedTotal: 0 });
    expect(weeks[2].plannedTotal).toBe(30 * plannedEffort(tpl('tpl_easy_run')));
  });
});
