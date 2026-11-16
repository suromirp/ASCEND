// Eén regel voor alle uitzonderingen (I-67): een toets per gat uit het ontwerp (docs/visie/Ontwerp een regel voor
// uitzonderingen.md, hoofdstuk 2), elk op de weg die vroeger zelf toetste. Alles nagemaakt.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { deriveSessionStatus } from './sessionStatus';
import { computeCurrentStreak } from './streak';
import { leftOutOfCount } from './weekLogs';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const TODAY = '2026-11-16'; // maandag

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
});
afterAll(() => vi.useRealTimers());

const period = (kind: LeavePeriod['kind'], startDate: string, endDate: string, id: string = kind): LeavePeriod => ({ id, kind, startDate, endDate });
const ill = (kind: IllnessEpisode['kind'], startDate: string, endDate?: string): IllnessEpisode => ({ id: `ill-${startDate}`, kind, startDate, ...(endDate ? { endDate } : {}) });
const ps = (id: string, templateId: string, d: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: d, weekStartDate: mondayOfWeek(d), status: 'planned', order: 0, ...over,
});
const LOCK = { by: 'user' as const, at: '2026-11-01T08:00:00.000Z' };
const log = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: byId.get(s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

describe('gat 7: de reeks telt zoals Week', () => {
  // Zoals Stand hem maakt (components/stand/useStandData.ts): dezelfde telling als Week via leftOutOfCount.
  const streak = (plan: PlannedSession[], logs: SessionLog[], leave: LeavePeriod[], illness: IllnessEpisode[] = []) => computeCurrentStreak(plan, logs, {
    templateById: byId, illnessEpisodes: illness,
    leftOut: leftOutOfCount(plan, [], illness, TODAY, undefined, { periods: leave, templates: byId, loggedIds: new Set(logs.map((l) => l.plannedSessionId)) }),
  });

  it('een vastgezette training op een vakantiedag is in Week weg en breekt de reeks niet', () => {
    const done1 = ps('a', 'tpl_easy_run', addDays(TODAY, -4));
    const mine = ps('m', 'tpl_upper_a', addDays(TODAY, -2), { lock: LOCK, status: 'moved', movedFromDate: addDays(TODAY, -3) });
    const done2 = ps('b', 'tpl_easy_run', addDays(TODAY, -1));
    const leave = [period('no_training', addDays(TODAY, -2), addDays(TODAY, -2))];
    const plan = [done1, mine, done2];
    expect(deriveSessionStatus(mine, [], false, { leave, templates: byId }).status).toBe('away');
    expect(streak(plan, [log(done1), log(done2)], leave)).toBe(2);
    // Zonder de vakantie is hij gemist en breekt hij de reeks.
    expect(streak(plan, [log(done1), log(done2)], [])).toBe(1);
  });

  it('zonder sportschool: een sportschooltraining breekt niet, een loop wel', () => {
    const done = ps('a', 'tpl_easy_run', addDays(TODAY, -3));
    const gym = ps('g', 'tpl_upper_a', addDays(TODAY, -2));
    const run = ps('r', 'tpl_easy_run', addDays(TODAY, -1));
    const leave = [period('no_gym', addDays(TODAY, -2), addDays(TODAY, -1))];
    expect(streak([done, gym], [log(done)], leave)).toBe(1);
    expect(streak([done, gym, run], [log(done)], leave)).toBe(0);
  });

  it('ziek: een dag in je ziekte breekt niet, ook met neus of keel', () => {
    const done = ps('a', 'tpl_easy_run', addDays(TODAY, -3));
    const sick = ps('s', 'tpl_easy_run', addDays(TODAY, -2));
    expect(streak([done, sick], [log(done)], [], [ill('above_neck', addDays(TODAY, -2), addDays(TODAY, -1))])).toBe(1);
  });
});
