(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
// I-159 herstel: de rustdag van de inhaal volgt de regel van de scheduler (respectsHeavySpacing), en een zware
// beendag is nooit een lichte training. Nagemaakte gebruiker, zelfde opzet als terugkeerRustdagInhalen.test.ts:
// vandaag T, vakantie T-12 tot en met T-4, gemist op T-2 of T-1, op T een training, T+1 de eerste rustdag.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import { proposeReentry, type ReentryInputs } from './reentry';
import { respectsHeavySpacing } from './scheduler';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };
const byId = new Map(templates.map((t) => [t.id, t]));
const name = (id: string) => byId.get(id)!.name;

const ps = (templateId: string, scheduledDate: string): PlannedSession => ({
  id: `p-${templateId}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0,
});
const done = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: byId.get(s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

const T = '2027-02-18'; // een donderdag
const t = (k: number) => addDays(T, k);
function scenario(rows: Array<[number, string]>) {
  const history: PlannedSession[] = [];
  for (let k = -34; k <= -13; k += 3) history.push(ps(k % 2 ? 'tpl_upper_a' : 'tpl_easy_run', t(k)));
  return { plan: [...history, ...rows.map(([k, id]) => ps(id, t(k)))], logs: history.map(done) };
}
const vacation: LeavePeriod = { id: 'weg', kind: 'no_training', startDate: t(-12), endDate: t(-4) };
const input = (s: ReturnType<typeof scenario>): ReentryInputs => ({
  program, plannedSessions: s.plan, logs: s.logs, templates, today: T, leavePeriods: [vacation],
  choice: 'three_quarters', respondedIds: new Set(),
});

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${T}T09:00:00+01:00`)); });
afterEach(() => vi.useRealTimers());

describe('I-159 herstel: de inhaal volgt de scheduler en blijft licht', () => {
  it('Benen A gemist met een harde loop op T+2: geen inhaal op T+1, want de scheduler zegt nee', () => {
    for (const run of ['tpl_intervals', 'tpl_tempo_run']) {
      const s = scenario([[-1, 'tpl_lower_a'], [0, 'tpl_upper_b'], [2, run], [4, 'tpl_upper_a']]);
      const around = s.plan.filter((r) => r.scheduledDate >= T);
      expect(respectsHeavySpacing(t(1), byId.get('tpl_lower_a')!, around, byId, s.logs, `p-tpl_lower_a-${t(-1)}`)).toBe(false);
      expect(proposeReentry(input(s))!.catchUp).toBeUndefined();
    }
  });

  it('een lichte kracht die de oude 48-urentoets doorliet, weigert de scheduler ook hier', () => {
    // Boven A op T+1 en Boven B op T+2: twee dagen zwaar bovenlichaam achter elkaar.
    const near = scenario([[-1, 'tpl_upper_a'], [0, 'tpl_easy_run'], [2, 'tpl_upper_b'], [4, 'tpl_easy_run']]);
    expect(respectsHeavySpacing(t(1), byId.get('tpl_upper_a')!, near.plan.filter((r) => r.scheduledDate >= T), byId, near.logs, `p-tpl_upper_a-${t(-1)}`)).toBe(false);
    expect(proposeReentry(input(near))!.catchUp).toBeUndefined();
    // Een dag verder staat Boven B ver genoeg: dan komt Boven A wel.
    const apart = scenario([[-1, 'tpl_upper_a'], [0, 'tpl_easy_run'], [3, 'tpl_upper_b'], [5, 'tpl_easy_run']]);
    expect(proposeReentry(input(apart))!.catchUp).toMatchObject({ name: name('tpl_upper_a'), fromDate: t(-1), toDate: t(1) });
  });

  it('een zware beendag is geen lichte training, ook zonder iets zwaars in de buurt', () => {
    for (const legs of ['tpl_lower_a', 'tpl_lower_b']) {
      const s = scenario([[-1, legs], [0, 'tpl_upper_b'], [4, 'tpl_upper_a']]);
      expect(proposeReentry(input(s))!.catchUp).toBeUndefined();
    }
    // Met een rustige loop ervoor gemist komt die, niet de beendag.
    const both = scenario([[-2, 'tpl_easy_run'], [-1, 'tpl_lower_a'], [0, 'tpl_upper_b'], [4, 'tpl_upper_a']]);
    expect(proposeReentry(input(both))!.catchUp).toMatchObject({ name: name('tpl_easy_run'), fromDate: t(-2), toDate: t(1) });
  });
});
