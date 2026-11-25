(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
// Bewijs voor I-159: een nagemaakte terugkeerweek per dag, voor en na Akkoord. Vakantie T-12 tot en met T-4, terug op
// T-3 (ma), twee dagen niet fit (di en wo gemist), vandaag do. De tekst staat ook in docs/onderhoud/sherpa-i159.md.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import { proposeReentry, reentryCatchUpItems } from './reentry';
import { applyPlanChangeItems } from './proposalEngine';
import { addDays, formatWeekdayDateNL, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };
const T = '2027-02-18';
const t = (k: number) => addDays(T, k);
const ps = (templateId: string, k: number): PlannedSession => ({
  id: `p-${templateId}-${t(k)}`, templateId, scheduledDate: t(k), weekStartDate: mondayOfWeek(t(k)), status: 'planned', order: 0,
});
const history = [-25, -22, -19, -16, -13].map((k) => ps(k % 2 ? 'tpl_upper_a' : 'tpl_easy_run', k));
const logs = history.map((s): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((x) => x.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog));
const plan = [...history, ...([[-2, 'tpl_upper_a'], [-1, 'tpl_easy_run'], [0, 'tpl_upper_b'], [2, 'tpl_hill_intervals'], [3, 'tpl_long_run'], [4, 'tpl_upper_a'], [6, 'tpl_easy_run']] as const).map(([k, id]) => ps(id, k))];
const loggedIds = new Set(logs.map((l) => l.plannedSessionId));

function dayLines(sessions: PlannedSession[]): string[] {
  const lines: string[] = [];
  for (let k = -3; k <= 6; k++) {
    const names = sessions.filter((s) => s.scheduledDate === t(k) && s.status !== 'skipped' && !loggedIds.has(s.id)).map((s) => templates.find((x) => x.id === s.templateId)!.name);
    lines.push(`${formatWeekdayDateNL(t(k))}${k === 0 ? ' (vandaag)' : ''}: ${names.length ? names.join(', ') : 'rustdag'}${k < 0 && names.length ? ' (gemist)' : ''}`);
  }
  return lines;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${T}T09:00:00+01:00`)); });
afterEach(() => vi.useRealTimers());

describe('I-159 bewijs: de terugkeerweek per dag', () => {
  it('voor en na Akkoord', () => {
    const p = proposeReentry({
      program, plannedSessions: plan, logs, templates, today: T, leavePeriods: [{ id: 'weg', kind: 'no_training', startDate: t(-12), endDate: t(-4) }],
      choice: 'three_quarters', respondedIds: new Set(),
    })!;
    const after = applyPlanChangeItems(reentryCatchUpItems(p.catchUp!), plan, undefined, { by: 'proposal', at: 'bewijs' }).sessions;
    const before = dayLines(plan);
    const now = dayLines(after);
    if ((globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env.BEWIJS) console.log(['Voor:', ...before, '', 'Na Akkoord:', ...now].join('\n'));
    expect(before[4]).toBe('vr 19 februari: rustdag');
    expect(now[4]).toBe('vr 19 februari: Rustige duurloop');
    expect(now[2]).toBe('wo 17 februari: rustdag');
    // Alleen die twee dagen verschillen.
    expect(before.filter((l, i) => l !== now[i])).toHaveLength(2);
  });
});
