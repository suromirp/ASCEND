import { describe, it, expect } from 'vitest';
import { crowdsOwnNext, ownGapDays, LEAVE_SPACING_ROLES } from './leaveSpacing';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionTemplate } from '../models/training';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const row = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: date, status: 'planned', order: 0 });

// Nagemaakt: Bovenlichaam A op dinsdag, elke week.
const tuesdays = ['2026-12-01', '2026-12-08', '2026-12-15'].map((d, i) => row(`a${i}`, 'tpl_upper_a', d));

describe('a training that moves for a holiday keeps its distance to its own next time', () => {
  it('the usual distance is the nearest other time of the same training', () => {
    expect(ownGapDays(tuesdays[1], tuesdays, byId)).toBe(7);
    expect(ownGapDays(row('x', 'tpl_upper_a', '2026-12-08'), [], byId)).toBeUndefined();
  });

  it('Sunday right before the next Tuesday is too close, Thursday is fine', () => {
    expect(crowdsOwnNext(tuesdays[1], '2026-12-13', tuesdays, byId)).toBe(true);
    expect(crowdsOwnNext(tuesdays[1], '2026-12-12', tuesdays, byId)).toBe(true);
    expect(crowdsOwnNext(tuesdays[1], '2026-12-10', tuesdays, byId)).toBe(false);
    expect(crowdsOwnNext(tuesdays[1], '2026-12-11', tuesdays, byId)).toBe(false);
    // Too close to the time before counts too.
    expect(crowdsOwnNext(tuesdays[1], '2026-12-03', tuesdays, byId)).toBe(true);
  });

  it('a skipped time does not count, a logged one in the past does', () => {
    const skipped = tuesdays.map((s) => (s.id === 'a2' ? { ...s, status: 'skipped' as const } : s));
    expect(crowdsOwnNext(tuesdays[1], '2026-12-13', skipped, byId)).toBe(false);
  });

  it('another template with the same task counts through its role, never through its id', () => {
    // A made-up hard run of your own with the role hard_run, two days after the tempo run.
    const own: SessionTemplate = { ...byId.get('tpl_tempo_run')!, id: 'own_fast', name: 'Eigen snelle loop', roles: ['hard_run'] };
    const map = new Map([...byId, [own.id, own]]);
    const list = [row('t1', 'tpl_tempo_run', '2026-12-08'), row('o1', 'own_fast', '2026-12-12'), row('t0', 'tpl_tempo_run', '2026-12-01'), row('o0', 'own_fast', '2026-12-05')];
    expect(crowdsOwnNext(list[0], '2026-12-11', list, map)).toBe(true);
    expect(crowdsOwnNext(list[0], '2026-12-09', list, map)).toBe(false);
    // Without the role it is just another training.
    const plain = new Map([...map, [own.id, { ...own, roles: [] }]]);
    expect(crowdsOwnNext(list[0], '2026-12-11', list, plain)).toBe(false);
  });

  it('a walking day a tocht placed is not the long run\'s own next time', () => {
    // The long run on Sunday, the next one a week later; a tocht placed mountain hikes on Wednesday and Thursday.
    const long = [row('l0', 'tpl_long_run', '2026-12-06'), row('l1', 'tpl_long_run', '2026-12-13'), row('l2', 'tpl_long_run', '2026-12-20')];
    const placed = ['2026-12-09', '2026-12-10'].map((d, i) => ({ ...row(`h${i}`, 'tpl_mountain_hike', d), leave: { periodId: 'tocht', role: 'placed' as const, from: d } }));
    const list = [...long, ...placed];
    // The usual distance stays a week, not the one day to a walking day of the tocht.
    expect(ownGapDays(long[1], list, byId)).toBe(7);
    expect(crowdsOwnNext(long[1], '2026-12-17', list, byId)).toBe(true);
    // A hike that is a training of its own still counts.
    const ownHike = [...long, row('h', 'tpl_mountain_hike', '2026-12-10')];
    expect(ownGapDays(long[1], ownHike, byId)).toBe(3);
  });

  it('only the roles that say what a training is for count', () => {
    expect(LEAVE_SPACING_ROLES).toEqual(['long', 'hard_run', 'hills', 'blocks']);
    // An easy run and the long run share easy_pace; that is no reason to keep them apart.
    const list = [row('e', 'tpl_easy_run', '2026-12-08'), row('l', 'tpl_long_run', '2026-12-13'), row('e0', 'tpl_easy_run', '2026-12-01')];
    expect(crowdsOwnNext(list[0], '2026-12-12', list, byId)).toBe(false);
  });
});
