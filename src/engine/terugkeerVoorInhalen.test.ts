(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
// Terugkeer gaat voor inhalen (I-154, docs/beslissingen/2026-11-23-terugkeer-voor-inhalen.md). Nagespeeld met
// nagemaakte, verschoven datums: vandaag T is een maandag met de vaste Herstelwandeling, de laatste training was twaalf
// dagen eerder, daarna een periode zonder sportschool en aansluitend twee dagen ziek. De drie dagen voor vandaag staan
// trainingen open zonder log: gemist. Voor de fix gaven MISSED-CATCH-UP en REENTRY allebei prioriteit 3, won inhalen
// op de id en toonde de kaart op Vandaag alleen het inhalen.

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };

let n = 0;
const ps = (templateId: string, scheduledDate: string): PlannedSession => ({
  id: `p${++n}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0,
});
const done = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((t) => t.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

function week(monday: string): PlannedSession[] {
  return [
    ps('tpl_herstel', monday),
    ps('tpl_upper_a', addDays(monday, 1)),
    ps('tpl_lower_a', addDays(monday, 2)),
    ps('tpl_easy_run', addDays(monday, 3)),
    ps('tpl_upper_b', addDays(monday, 4)),
    ps('tpl_hill_intervals', addDays(monday, 5)),
    ps('tpl_long_run', addDays(monday, 6)),
  ];
}

const T = '2027-02-15'; // een maandag
const t = (k: number) => addDays(T, k);
const plan = ['2027-01-18', '2027-01-25', '2027-02-01', '2027-02-08', '2027-02-15', '2027-02-22'].flatMap(week);
// Alles gedaan tot en met T-12 (een woensdag); daarna niets. De trainingen van T-3 tot en met T-1 staan nog open.
const logs = plan.filter((s) => s.scheduledDate <= t(-12) && s.templateId !== 'tpl_herstel').map(done);
const noGym: LeavePeriod = { id: 'weg', kind: 'no_gym', startDate: t(-10), endDate: t(-6) };
const ill: IllnessEpisode[] = [{ id: 'ziek', kind: 'above_neck', startDate: t(-5), endDate: t(-4) }];
const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs, plannedSessions: plan, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(),
  asOf: T, illnessEpisodes: ill, leave: [noGym], restDay: 1, ...over,
});
const CATCH_UP = ['MISSED-CATCH-UP', 'SKIPPED-KEY-TO-REST', 'TEST-MAKE-ROOM'];

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${T}T09:00:00+01:00`)); });
afterEach(() => vi.useRealTimers());

describe('I-154: de rustige terugkeer gaat voor inhalen', () => {
  it('de vorm: laatste training twaalf dagen terug, gemiste trainingen de dagen ervoor', () => {
    expect(logs.at(-1)!.completedDate).toBe(t(-12));
    const open = plan.filter((s) => s.scheduledDate >= t(-3) && s.scheduledDate < T && s.templateId !== 'tpl_herstel');
    expect(open.length).toBeGreaterThan(0);
    // Zonder terugkeer (uit) is er wel een inhaaladvies: anders bewijst de test niets.
    const off = computeAdvice(inputs({ reentry: { choice: 'off' } }));
    expect(off.some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(true);
  });

  it('bovenaan staat de terugkeer, zonder inhaaladvies ernaast', () => {
    const all = computeAdvice(inputs());
    expect(all[0].ruleId).toBe('REENTRY');
    expect(all.some((a) => CATCH_UP.includes(a.ruleId))).toBe(false);
    // De vraag Niet gedaan? wacht, net als achter een inhaaladvies (components/useMissedTraining.ts).
    expect(all[0].holdsCatchUp).toBe(true);
  });

  it('geen stille bijwerking: wat het inhalen zou raken, raakt geen ander voorstel in zijn plaats', () => {
    const off = computeAdvice(inputs({ reentry: { choice: 'off' } }));
    const catchUpIds = new Set(off.filter((a) => CATCH_UP.includes(a.ruleId)).flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId) ?? []));
    const rest = computeAdvice(inputs()).filter((a) => a.ruleId !== 'REENTRY');
    const after = rest.flatMap((a) => [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])]).flatMap((p) => p?.changes ?? []);
    expect(after.some((c) => c.plannedSessionId && catchUpIds.has(c.plannedSessionId))).toBe(false);
  });

  it('na Liever niet op de terugkeer komt het inhalen terug', () => {
    const first = computeAdvice(inputs()).find((a) => a.ruleId === 'REENTRY')!;
    const all = computeAdvice(inputs({ respondedIds: new Set([first.id]) }));
    expect(all.some((a) => a.ruleId === 'REENTRY')).toBe(false);
    expect(all.some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(true);
  });

  it('zonder terugkeer is het inhalen ongewijzigd', () => {
    // Geen pauze: alles gedaan tot en met T-4, alleen de laatste drie dagen open.
    const busy = plan.filter((s) => s.scheduledDate <= t(-4) && s.templateId !== 'tpl_herstel').map(done);
    const plain = inputs({ logs: busy, illnessEpisodes: [], leave: [] });
    const all = computeAdvice(plain);
    expect(all.some((a) => a.ruleId === 'REENTRY')).toBe(false);
    const missed = all.filter((a) => a.ruleId === 'MISSED-CATCH-UP');
    expect(missed.length).toBeGreaterThan(0);
    expect(all.every((a) => !a.holdsCatchUp)).toBe(true);
    // Hetzelfde als met terugkeer uit: de keuze speelt zonder pauze geen rol.
    const shape = (list: typeof all) => JSON.stringify(list.map((a) => ({ ...a, proposal: a.proposal && { ...a.proposal, id: '', createdAt: '' } })));
    expect(shape(computeAdvice({ ...plain, reentry: { choice: 'off' } }))).toBe(shape(all));
  });

  it('bij gelijke prioriteit gaat de terugkeer voor, ook voor een id dat eerder in het alfabet staat', () => {
    const all = computeAdvice(inputs());
    const reentry = all.find((a) => a.ruleId === 'REENTRY')!;
    const same = all.filter((a) => a.priority === reentry.priority);
    expect(same[0].ruleId).toBe('REENTRY');
  });
});
