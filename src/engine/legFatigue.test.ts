import { describe, it, expect } from 'vitest';
import { damageLeft, fatigueEvents, fatigueStatus, intensityLeft, legFatigueOn, POLES_DESCENT_FACTOR, sessionImpulse, strengthLeft, type FatigueEvent, type LegFatigueInputs } from './legFatigue';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, resolveProgramWeek } from '../utils/dates';

const { templates, program } = buildDefaultProgramData();
const type = (id: string) => templates.find((t) => t.id === id)!.type;
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: type(templateId), completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const inputs = (logs: SessionLog[], over: Partial<LegFatigueInputs> = {}): LegFatigueInputs => ({ logs, plannedSessions: [], templates, today: '2026-12-31', ...over });
// Two earlier leg days in the 3 weeks before: "gewend".
const used = (date: string) => [log('tpl_lower_a', addDays(date, -14), 60, { rpe: 8 }), log('tpl_lower_a', addDays(date, -7), 60, { rpe: 8 })];

describe('the three buckets', () => {
  it('intensity halves every 12 h, strength every 24 h, damage stays a day then halves every 36 h', () => {
    expect(intensityLeft(1)).toBeCloseTo(0.25);
    expect(intensityLeft(2)).toBeCloseTo(0.0625);
    expect(strengthLeft(1)).toBeCloseTo(0.5);
    expect(strengthLeft(3)).toBeCloseTo(0.125);
    expect(damageLeft(1)).toBe(1);
    expect(damageLeft(2)).toBeCloseTo(0.63, 2);
    expect(damageLeft(4)).toBeCloseTo(0.25, 2);
    expect(damageLeft(0)).toBe(0);
  });
});

describe('the worked examples of the report', () => {
  const D = '2026-11-04';
  it('Lower A, used to it, 60 min at RPE 8: 13.4, 7.3, 4.2 after 1, 2, 3 days', () => {
    const logs = [...used(D), log('tpl_lower_a', D, 60, { rpe: 8 })];
    const after = (d: number) => legFatigueOn(addDays(D, d), inputs(logs)).contributions.find((c) => c.date === D)!.points;
    expect(after(1)).toBeCloseTo(13.4, 0);
    expect(after(2)).toBeCloseTo(7.3, 0);
    expect(after(3)).toBeCloseTo(4.2, 0);
  });

  it('the first Lower A after a long break counts more: 18.2 the day after', () => {
    expect(legFatigueOn(addDays(D, 1), inputs([log('tpl_lower_a', D, 60, { rpe: 8 })])).index).toBeCloseTo(18.2, 0);
  });

  it('short Lower A, 45 min at RPE 7: 8.7 the day after', () => {
    const logs = [...used(D), log('tpl_lower_a', D, 45, { rpe: 7 })];
    expect(legFatigueOn(addDays(D, 1), inputs(logs)).contributions.find((c) => c.date === D)!.points).toBeCloseTo(8.7, 0);
  });

  it('an easy run costs almost nothing: under 2 the day after', () => {
    expect(legFatigueOn(addDays(D, 1), inputs([log('tpl_easy_run', D, 40)])).index).toBeLessThan(2);
  });
});

describe('a test on Thursday in the normal week', () => {
  // Weekend before: hills Saturday 31 Oct, long run Sunday 1 Nov; test Thursday 5 Nov.
  const THU = '2026-11-05';
  const weekend = [log('tpl_hill_intervals', '2026-10-31', 45, { outdoorData: { durationMinutes: 45, elevationGainM: 150, elevationLossM: 150, source: 'manual' } }), log('tpl_long_run', '2026-11-01', 100, { outdoorData: { durationMinutes: 100, elevationGainM: 200, elevationLossM: 200, source: 'manual' } })];
  const at = (legsDate: string, minutes = 75, rpe = 8) => legFatigueOn(THU, inputs([...used(legsDate), ...weekend, log('tpl_lower_a', legsDate, minutes, { rpe })]));

  it('Lower A the day before: not fresh; two days before: doubt or worse; short on Tuesday or after the test: fresh', () => {
    expect(fatigueStatus(at('2026-11-04'), 'test')).toBe('niet fris');
    expect(fatigueStatus(at('2026-11-03'), 'test')).not.toBe('fris');
    expect(fatigueStatus(at('2026-11-03', 45, 7), 'test')).toBe('fris');
    expect(fatigueStatus(at('2026-11-02'), 'test')).toBe('fris');
    // After the test (that evening): it doesn't count for the test.
    expect(fatigueStatus(at(THU), 'test')).toBe('fris');
  });

  it('recent leg pain never reads as fresh, and reported soreness sets a floor', () => {
    const base = inputs([...weekend]);
    expect(fatigueStatus(legFatigueOn(THU, base), 'test')).toBe('fris');
    const pain = inputs([...weekend, log('tpl_easy_run', '2026-11-03', 30, { painAreas: ['Kuit'] })]);
    expect(fatigueStatus(legFatigueOn(THU, pain), 'test')).toBe('twijfel');
    const sore = inputs([...weekend], { soreness: [{ date: THU, level: 'flink' }] });
    expect(fatigueStatus(legFatigueOn(THU, sore), 'test')).toBe('niet fris');
  });

  it('a session that felt worse counts heavier', () => {
    const plain = legFatigueOn('2026-11-02', inputs([log('tpl_lower_a', '2026-11-01', 60, { rpe: 8 })])).index;
    const worse = legFatigueOn('2026-11-02', inputs([log('tpl_lower_a', '2026-11-01', 60, { rpe: 8, subjectiveFeel: 'worse' })])).index;
    expect(worse).toBeCloseTo(plain * 1.25, 0);
  });

  it('planned sessions ahead count as planned; past unlogged ones did not happen', () => {
    const planned = [{ id: 'p', templateId: 'tpl_lower_a', scheduledDate: '2026-11-04', weekStartDate: '2026-11-02', status: 'planned' as const, order: 0 }];
    expect(legFatigueOn(THU, inputs([], { plannedSessions: planned, today: '2026-11-03' })).index).toBeGreaterThan(10);
    expect(legFatigueOn(THU, inputs([], { plannedSessions: planned, today: THU })).index).toBe(0);
  });
});

describe('strength from MacroFactor: RPE and reps in reserve', () => {
  it('reps left in the hardest sets set the effort: 0 left counts heavier than 4 left', () => {
    const at = (rir: number) => legFatigueOn('2026-11-05', inputs([log('tpl_lower_a', '2026-11-04', 60, { strengthRir: rir })])).index;
    expect(at(0)).toBeGreaterThan(at(2.5));
    expect(at(2.5)).toBeGreaterThan(at(4));
  });
});

// A date in a given week of a phase of the default program (a Sunday).
function sundayIn(phaseId: string, weekInPhase: number): string {
  for (let i = 0; i < 700; i++) {
    const d = addDays(program.startDate, i);
    const pos = resolveProgramWeek(program, d);
    if (pos && pos.phase.id === phaseId && pos.weekInPhase === weekInPhase && new Date(`${d}T12:00:00`).getDay() === 0) return d;
  }
  throw new Error('no such week');
}
const planned = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: addDays(date, -6), status: 'planned', order: 0, ...extra });
const eventsOf = (sessions: PlannedSession[], over: Partial<Parameters<typeof fatigueEvents>[0]> = {}) => fatigueEvents({ logs: [], plannedSessions: sessions, templates, today: '2020-01-01', ...over });

describe('planned hikes use the target of their week', () => {
  const heaviest = sundayIn('phase_4', 3); // 1000 m, 15 kg (14 kg goal plus 1)
  const hike = planned('h', 'tpl_mountain_hike', heaviest);

  it('without the program: the 500 m and 6 kg of the template', () => {
    const [e] = eventsOf([hike]);
    expect(e.descentM).toBe(500);
    expect(e.climbM).toBe(500);
    expect(e.packKg).toBe(6);
  });

  it('with the program: the D+ and pack of that week, also over your own shorter hikes', () => {
    const own = [log('tpl_mountain_hike', addDays(heaviest, -14), 120, { outdoorData: { durationMinutes: 120, elevationGainM: 200, elevationLossM: 200, source: 'manual' } })];
    const e = eventsOf([hike], { program, logs: own }).find((x) => x.id === 'h')!;
    expect(e.descentM).toBe(1000);
    expect(e.packKg).toBe(15);
    // Another week, another target.
    const [lighter] = eventsOf([planned('h2', 'tpl_mountain_hike', sundayIn('phase_4', 4))], { program });
    expect(lighter.descentM).toBe(500);
    expect(lighter.packKg).toBe(13);
  });

  it('a planned session whose week has no D+ or pack target keeps the old behaviour', () => {
    const run = planned('r', 'tpl_long_run', heaviest);
    const withProgram = eventsOf([run], { program })[0];
    const without = eventsOf([run])[0];
    expect(withProgram.descentM).toBe(without.descentM);
    expect(withProgram.packKg).toBe(without.packKg);
    // Own average still wins over the template when the week has no target.
    const own = [log('tpl_long_run', addDays(heaviest, -7), 100, { outdoorData: { durationMinutes: 100, elevationGainM: 40, elevationLossM: 40, source: 'manual' } })];
    expect(eventsOf([run], { program, logs: own }).find((x) => x.id === 'r')!.descentM).toBe(40);
    expect(eventsOf([run], { program })[0].descentM).not.toBe(40);
  });

  it('makes the heaviest weekend weigh more in the index', () => {
    const day = addDays(heaviest, 1);
    const withProgram = legFatigueOn(day, inputs([], { plannedSessions: [hike], program, today: '2020-01-01' })).index;
    const without = legFatigueOn(day, inputs([], { plannedSessions: [hike], today: '2020-01-01' })).index;
    expect(withProgram).toBeGreaterThan(without * 1.5);
  });
});

describe('a pack weighs heavier on the damage layer', () => {
  const hikeTemplate = templates.find((t) => t.id === 'tpl_mountain_hike')!;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const ev = (over: Partial<FatigueEvent>): FatigueEvent => ({ id: 'e', templateId: 'tpl_mountain_hike', date: '2026-11-01', minutes: 180, descentM: 600, climbM: 600, logged: true, ...over });
  const impulse = (over: Partial<FatigueEvent>, bodyKg = 80) => { const e = ev(over); return sessionImpulse(e, hikeTemplate, [e], byId, bodyKg); };

  it('damage: 1 + 1.5 x pack / body weight; intensity and strength keep 1 + pack / body weight', () => {
    const bare = impulse({});
    const loaded = impulse({ packKg: 16 });
    expect(loaded.damage / bare.damage).toBeCloseTo(1 + (1.5 * 16) / 80, 5); // 1.30
    expect(loaded.intensity / bare.intensity).toBeCloseTo(1 + 16 / 80, 5); // 1.20
    expect(loaded.strength / bare.strength).toBeCloseTo(1 + 16 / 80, 5);
  });

  it('a heavier body carries the same pack more easily', () => {
    expect(impulse({ packKg: 16 }, 100).damage).toBeLessThan(impulse({ packKg: 16 }, 70).damage);
  });
});

describe('walking poles', () => {
  const hikeTemplate = templates.find((t) => t.id === 'tpl_mountain_hike')!;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const ev = (over: Partial<FatigueEvent>): FatigueEvent => ({ id: 'e', templateId: 'tpl_mountain_hike', date: '2026-11-01', minutes: 180, descentM: 600, climbM: 600, packKg: 8, logged: true, ...over });
  const impulse = (over: Partial<FatigueEvent>) => { const e = ev(over); return sessionImpulse(e, hikeTemplate, [e], byId, 80); };

  it('lowers the descent load in the damage layer by 15%, nothing else', () => {
    const without = impulse({});
    const withPoles = impulse({ poles: true });
    expect(POLES_DESCENT_FACTOR).toBe(0.85);
    expect(withPoles.damage / without.damage).toBeCloseTo(0.85, 5);
    expect(withPoles.intensity).toBe(without.intensity);
    expect(withPoles.strength).toBe(without.strength);
  });

  it('a log with poles gives a lower index the day after', () => {
    const outdoor = (poles?: boolean) => ({ durationMinutes: 180, elevationGainM: 600, elevationLossM: 600, backpackWeightKg: 8, poles, source: 'manual' as const });
    const at = (poles?: boolean) => legFatigueOn('2026-11-02', inputs([log('tpl_mountain_hike', '2026-11-01', 180, { outdoorData: outdoor(poles) })])).index;
    expect(at(true)).toBeLessThan(at(undefined));
    expect(at(false)).toBe(at(undefined));
  });

  it('a log passes the flag to its event; a planned session takes it from its own flag or your last log of that training', () => {
    const day = '2026-11-20';
    const logged = log('tpl_mountain_hike', '2026-11-08', 180, { outdoorData: { durationMinutes: 180, elevationLossM: 500, poles: true, source: 'manual' } });
    expect(eventsOf([], { logs: [logged] })[0].poles).toBe(true);
    expect(eventsOf([], { logs: [{ ...logged, outdoorData: { durationMinutes: 180, source: 'manual' } }] })[0].poles).toBeUndefined();
    expect(eventsOf([planned('a', 'tpl_mountain_hike', day)])[0].poles).toBeUndefined();
    expect(eventsOf([planned('b', 'tpl_mountain_hike', day)], { logs: [logged] }).find((e) => e.id === 'b')!.poles).toBe(true);
    expect(eventsOf([planned('c', 'tpl_mountain_hike', day, { poles: false })], { logs: [logged] }).find((e) => e.id === 'c')!.poles).toBe(false);
    const later = log('tpl_mountain_hike', '2026-11-15', 180, { outdoorData: { durationMinutes: 180, elevationLossM: 500, poles: false, source: 'manual' } });
    expect(eventsOf([planned('d', 'tpl_mountain_hike', day)], { logs: [logged, later] }).find((e) => e.id === 'd')!.poles).toBe(false);
  });
});
