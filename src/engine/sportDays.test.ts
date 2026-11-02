import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { withCountingSports } from './sportTemplate';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { weekConcerns } from './weekConcerns';
import { planWeekFix } from './weekFixProposal';
import { sportLogDays, restHoursFor, sportDoneLine } from './sportDays';

// Sporten die meetellen, stap 6: de weekcheck leest de sport die je deed. Het voorbeeld uit het onderzoek:
// padel op donderdag, zware beenkracht op vrijdag. Nagemaakte data.
const { templates } = buildDefaultProgramData();
const MON = '2026-11-02';
const THU = '2026-11-05';
const FRI = '2026-11-06';

const counting = (extra: Record<string, unknown> = {}) => withCountingSports(templates, { sportHandling: { padel: { role: 'count' }, swimming: { role: 'count' }, football: { role: 'count' } }, ...extra });
const legs: PlannedSession = { id: 'legs', templateId: 'tpl_lower_b', scheduledDate: FRI, weekStartDate: MON, status: 'planned', order: 0 };
const sportLog = (sport: NonNullable<SessionLog['countedSport']>, date: string, minutes: number, rpe?: number): SessionLog => ({
  id: `log-${sport}-${date}`, templateId: `sport_${sport}`, type: 'cardio', countedSport: sport, completedDate: date, completedAt: `${date}T20:30:00Z`,
  variant: 'custom', durationMinutes: minutes, rpe, source: 'garmin',
});
const input = (logs: SessionLog[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions: [legs], logs, templates: counting(), today: FRI, restDay: 1, ...over });

describe('de rust na een sport', () => {
  it('padel en een voetbaltraining 48 uur, een wedstrijd 72, rustig niets; Korter haalt er een dag af', () => {
    expect(restHoursFor('padel', 'moderate', false)).toBe(48);
    expect(restHoursFor('football', 'high', false)).toBe(72);
    expect(restHoursFor('football', 'high', true)).toBe(48);
    expect(restHoursFor('padel', 'low', false)).toBe(0);
    expect(restHoursFor('swimming', 'high', false)).toBe(0);
  });

  it('alleen een sport die meetelt en je benen belast wordt een vaste dag voor de check', () => {
    const byId = new Map(counting().map((t) => [t.id, t]));
    expect(sportLogDays([sportLog('padel', THU, 90, 5)], byId, FRI).sessions.map((s) => s.scheduledDate)).toEqual([THU]);
    expect(sportLogDays([sportLog('swimming', THU, 60, 7)], byId, FRI).sessions).toEqual([]);
    const off = new Map(withCountingSports(templates, { sportHandling: { padel: { role: 'off' } } }).map((t) => [t.id, t]));
    expect(sportLogDays([sportLog('padel', THU, 90, 5)], off, FRI).sessions).toEqual([]);
  });
});

describe('padel op donderdag, zware beenkracht op vrijdag', () => {
  it('is een bevinding van LEG-SPACING', () => {
    const found = validateWeeks(input([sportLog('padel', THU, 90, 5)])).filter((f) => f.rule === 'LEG-SPACING');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ subjectId: 'legs', fromSport: true });
  });

  it('de check verplaatst het nooit zelf, en de gelogde sport blijft', () => {
    const result = repairWeeks(input([sportLog('padel', THU, 90, 5)]));
    expect(result.repairs).toEqual([]);
    expect(result.sessions).toEqual([legs]);
    expect(result.remaining.some((f) => f.rule === 'LEG-SPACING' && f.fromSport)).toBe(true);
  });

  it('wordt in Week een melding met een voorstel dat je beentraining verplaatst', () => {
    const i = input([sportLog('padel', THU, 90, 5)]);
    const concern = weekConcerns(i, MON).find((c) => c.rule === 'LEG-SPACING')!;
    expect(concern.headline).toBe('Je speelde gisteren padel. Benen B staat er vlak na.');
    expect(concern.title).toBe('Benen B verder van je padel');
    const advice = planWeekFix(i, concern, MON);
    expect(advice).not.toBeNull();
    const move = advice!.proposal!.changes[0];
    expect(move).toMatchObject({ plannedSessionId: 'legs', action: 'move', fromDate: FRI });
    expect(move.toDate! > FRI).toBe(true);
  });

  it('een uur zwemmen, een rustige partij of Negeren: geen bevinding', () => {
    expect(validateWeeks(input([sportLog('swimming', THU, 60, 7)])).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    expect(validateWeeks(input([sportLog('padel', THU, 60, 3)])).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    const off = withCountingSports(templates, { sportHandling: { padel: { role: 'off' } } });
    expect(validateWeeks(input([sportLog('padel', THU, 90, 7)], { templates: off })).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
  });

  it('zonder sport is de check zoals hij was', () => {
    expect(validateWeeks(input([]))).toEqual(validateWeeks({ ...input([]), templates }));
  });
});

describe('een voetbalwedstrijd op zaterdag', () => {
  const SAT = '2026-11-07';
  const MON2 = '2026-11-09';
  const legsMon: PlannedSession = { id: 'legs2', templateId: 'tpl_lower_a', scheduledDate: MON2, weekStartDate: MON2, status: 'planned', order: 0 };
  const match = sportLog('football', SAT, 90, 7);

  it('houdt 72 uur lang zware beenkracht weg; met Korter 48', () => {
    const ruim = validateWeeks({ sessions: [legsMon], logs: [match], templates: counting(), today: '2026-11-08', restDay: 3 });
    expect(ruim.some((f) => f.rule === 'LEG-SPACING' && f.fromSport)).toBe(true);
    const korter = validateWeeks({ sessions: [legsMon], logs: [match], templates: counting({ sportCounting: { rest: 'korter' } }), today: '2026-11-08', restDay: 3 });
    expect(korter.some((f) => f.rule === 'LEG-SPACING')).toBe(false);
  });

  it('zegt het droge feit', () => {
    expect(sportDoneLine('football', SAT, '2026-11-09')).toBe('Je speelde eergisteren voetbal.');
    expect(sportDoneLine('swimming', '2026-11-04', '2026-11-09')).toBe('Je zwom op woensdag.');
  });
});
