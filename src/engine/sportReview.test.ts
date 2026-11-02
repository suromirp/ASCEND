import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays } from '../utils/dates';
import { mayAskFelt } from './sessionLoad';
import { applyFeedback } from './autoTick';
import { catchUpEligibility } from './catchUp';
import { applyKindAmounts } from './kindAmount';
import { sportCardLine, sportWeekDots } from './sportsScreen';
import { sportTemplate } from './sportTemplate';
import { validateWeeks } from './weekValidator';

// Herstel na de review van Warden (sporten die meetellen). Nagemaakte data.
const { templates } = buildDefaultProgramData();
const log: SessionLog = { id: 'l', templateId: 'sport_padel', type: 'cardio', countedSport: 'padel', completedDate: '2026-11-01', completedAt: '2026-11-01T21:00:00Z', variant: 'custom', durationMinutes: 90, source: 'garmin' };

describe('punt 2: een gegeven RPE wordt nooit overschreven', () => {
  it('vragen mag alleen zonder RPE of met een aangenomen RPE', () => {
    expect(mayAskFelt(log)).toBe(true);
    expect(mayAskFelt({ ...log, rpe: 5, rpeAssumed: true })).toBe(true);
    expect(mayAskFelt({ ...log, rpe: 7 })).toBe(false);
  });

  it('het antwoord uit het logblad zet de RPE alleen als hij nog open is', () => {
    expect(applyFeedback(log, { rpe: 7, onlyIfOpen: true }).rpe).toBe(7);
    const assumed = applyFeedback({ ...log, rpe: 5, rpeAssumed: true }, { rpe: 9, onlyIfOpen: true });
    expect(assumed.rpe).toBe(9);
    expect(assumed.rpeAssumed).toBeUndefined();
    const given = { ...log, rpe: 7 };
    expect(applyFeedback(given, { rpe: 3, onlyIfOpen: true })).toEqual(given);
  });
});

describe('punt 3: een vaste afspraak wordt nooit ingehaald', () => {
  it('ook niet als hij gemist is', () => {
    const row: PlannedSession = { id: 'f', templateId: 'sport_football', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned', order: 0, lock: { by: 'user', at: '2026-11-01T00:00:00Z' }, fixed: { sport: 'football', day: 2, intensity: 'high', week: '2026-11-02' } };
    expect(catchUpEligibility(row, sportTemplate('football'), { logged: false, today: '2026-11-05', caughtUp: false })).toEqual({ ok: false, reason: 'fixed' });
  });
});

describe('punt 8: Meer probeert per week alleen de beste vrije dag', () => {
  const MON = '2026-11-02';
  // Rust op maandag; benen dinsdag, bovenlichaam donderdag, lang zaterdag, tempo zondag. Vrij: woensdag en vrijdag.
  const days: [number, string][] = [[1, 'tpl_lower_a'], [3, 'tpl_upper_a'], [5, 'tpl_long_run'], [6, 'tpl_tempo_run']];
  const sessions: PlannedSession[] = days.map(([d, id], i) => ({ id: `s${i}`, templateId: id, scheduledDate: addDays(MON, d), weekStartDate: MON, status: 'planned', order: i }));
  const run = () => applyKindAmounts(sessions, { hard: 'more' }, { today: MON, until: addDays(MON, 6), newId: () => 'x', check: { logs: [], templates, today: MON, restDay: 1 } });

  it('woensdag (de beste) past niet na de benen van dinsdag: dan stopt het voor die week, ook al zou een latere dag passen', () => {
    expect(run().sessions.filter((s) => s.amount)).toEqual([]);
    expect(run().repairs).toEqual([]);
    // Vrijdag had wel gepast: het stoppen is de keuze, niet een gebrek aan plek.
    const check = { logs: [], templates, today: MON, restDay: 1 };
    const key = (f: { rule: string; sessionIds: string[] }) => `${f.rule}:${f.sessionIds.join(',')}`;
    const before = new Set(validateWeeks({ ...check, sessions }).map(key));
    const friday: PlannedSession = { id: 'fri', templateId: 'tpl_tempo_run', scheduledDate: addDays(MON, 4), weekStartDate: MON, status: 'planned', order: 9 };
    expect(validateWeeks({ ...check, sessions: [...sessions, friday] }).every((f) => before.has(key(f)))).toBe(true);
  });
});

describe('punt 10: de weekstrook volgt Rust na een zware sport', () => {
  const fixed = { football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] } };
  it('Ruim: twee rustige dagen na een zware wedstrijd, Korter: één', () => {
    const at = (rest?: 'korter') => sportWeekDots({ sport: 'football', settings: { sportHandling: fixed, sportCounting: rest ? { rest } : undefined }, weekStart: '2026-11-02', sessions: [], templates });
    expect(at()).toEqual(['none', 'none', 'none', 'none', 'none', 'fixed', 'rest']);
    expect(at('korter')).toEqual(['none', 'none', 'none', 'none', 'none', 'fixed', 'rest']);
    const tuesday = { football: { role: 'fixed', fixed: [{ day: 2, minutes: 90, intensity: 'high' }] } };
    const tue = (rest?: 'korter') => sportWeekDots({ sport: 'football', settings: { sportHandling: tuesday, sportCounting: rest ? { rest } : undefined }, weekStart: '2026-11-02', sessions: [], templates });
    expect(tue()).toEqual(['none', 'fixed', 'rest', 'rest', 'none', 'none', 'none']);
    expect(tue('korter')).toEqual(['none', 'fixed', 'rest', 'none', 'none', 'none', 'none']);
  });

  it('de regel op de kaart zegt dan geen 72 uur meer', () => {
    expect(sportCardLine('football', 'fixed', { sportHandling: fixed })).toContain('72 uur');
    expect(sportCardLine('football', 'fixed', { sportHandling: fixed, sportCounting: { rest: 'korter' } })).not.toContain('72 uur');
  });
});
