import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, ProgramsRepo, SettingsRepo, TrainingGoalsRepo } from './database';
import { planLeaveChange } from '../engine/leaveProposal';
import { patternDays, planPass } from '../engine/planPass';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { resolveVariantDuration } from '../engine/substitutions';
import { isLegHeavyTemplate } from '../engine/scheduler';
import type { LeavePeriod } from '../models/leave';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, daysBetween } from '../utils/dates';

// Zonder sportschool beter (docs/beslissingen/2026-11-09-zonder-sportschool-beter.md), met het echte programma.
// Nagemaakt: periode Zonder sportschool za 14 tot wo 18 november, Hoeveel Gewoon, Kracht Eigen gewicht, Heuvels in de buurt aan.
const TODAY = '2026-11-09';
const quiet = { phasesChanged: false, added: 0, swapped: 0, removed: 0 };
const PERIOD: LeavePeriod = { id: 'zs', kind: 'no_gym', startDate: '2026-11-14', endDate: '2026-11-18', noGym: { amount: 'normal', strength: 'bodyweight', hills: true } };

describe('periode Zonder sportschool, het nagemaakte voorbeeld', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
  });
  afterEach(() => vi.useRealTimers());

  async function setup() {
    await seedIfEmpty();
    await runBootMigrations({ build: 'test', seedProgram: true });
    const main = (await TrainingGoalsRepo.getAll())[0];
    await TrainingGoalsRepo.put({ ...main, status: 'active', targetDate: '2027-07-25' } as TrainingGoal);
    await SettingsRepo.set({ restDay: 1 });
    await syncProgramHorizon();
    await syncProgramHorizon();
    const [sessions, templates, programs, settings] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll(), SettingsRepo.get()]);
    const program = programs[0];
    const restDay = settings.restDay ?? 1;
    const context = (period: LeavePeriod) => (periods: LeavePeriod[]) => {
      let n = 0;
      return {
        today: TODAY, logs: [], templates, program, blocks: [], restDay, slotDays: patternDays(templates, settings, restDay),
        minutesOf: (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
        newId: () => `l${n++}`, until: addDays(period.endDate, 21), leave: periods, leaveAround: 'wide' as const, goalDay: '2027-07-25',
      };
    };
    return { sessions, templates, context };
  }
  const name = (templates: SessionTemplate[], id: string | undefined) => templates.find((t) => t.id === id)?.name ?? '?';
  const dayList = (templates: SessionTemplate[], list: PlannedSession[], from: string, to: string) =>
    list.filter((s) => s.scheduledDate >= from && s.scheduledDate <= to && s.status !== 'skipped').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order)
      .map((s) => `${s.scheduledDate.slice(8)} ${name(templates, s.templateId)}${s.plannedMinutes ? ` (${s.plannedMinutes} min)` : ''}`);

  it('Heuvelintervallen vr 13 blijft, Eigen gewicht nooit twee dagen na elkaar, niets vervalt zonder zin', async () => {
    const { sessions: stored, templates, context } = await setup();
    // De eigenaar zag Heuvelintervallen op vr 13: in de weekindeling van de zaterdag.
    const swap: Record<string, string> = { '2026-11-13': '2026-11-14', '2026-11-14': '2026-11-13' };
    const sessions = stored.map((s) => (swap[s.scheduledDate] && (s.templateId === 'tpl_upper_b' || s.templateId === 'tpl_hill_intervals') ? { ...s, scheduledDate: swap[s.scheduledDate] } : s));
    const plan = planLeaveChange({ mode: 'add', period: PERIOD, existing: [], sessions, logs: [], templates, today: TODAY, context: context(PERIOD) });
    const applied = applyPlanChangeItems(plan.proposal.changes, sessions, undefined, { by: 'proposal', proposalId: plan.proposal.id, at: `${TODAY}T08:00:00.000Z` });
    expect(applied.unsupported).toEqual([]);
    const after = applied.sessions.filter((s) => s.status !== 'skipped');
    // Het voorstel per dag, Gewoon met Heuvels in de buurt aan: de lange duurloop en de rustige loopjes blijven zoals gepland.
    // Er staat geen loop in de periode die een heuveltraining kan worden (alleen de lange duurloop), dus komt er één rustige heuvelloop bij op de vrije dag wo 18.
    expect(dayList(templates, after, '2026-11-12', '2026-11-22')).toEqual([
      '12 Rustige duurloop', '13 Heuvelintervallen', '14 Eigen gewicht', '15 Lange duurloop', '16 Herstelwandeling', '17 Eigen gewicht', '18 Rustige heuvelloop',
      '19 Rustige duurloop', '20 Heuvelsprints en afdalen', '21 Bovenlichaam B', '22 Lange duurloop',
    ]);
    // Rond Zonder sportschool geldt de indeling rond een vakantie ook (docs/beslissingen/2026-11-09-rond-zonder-sportschool.md):
    // nooit twee beenzware dagen naast elkaar, ook niet heuvelsprints op zaterdag en de lange duurloop op zondag.
    const heavy = after.filter((s) => s.scheduledDate >= '2026-11-12' && s.scheduledDate <= '2026-11-24')
      .filter((s) => { const t = templates.find((o) => o.id === s.templateId)!; return isLegHeavyTemplate(t) || (t.roles ?? []).includes('long' as never); })
      .map((s) => s.scheduledDate).sort();
    for (let i = 1; i < heavy.length; i++) expect(daysBetween(heavy[i - 1], heavy[i]), `${heavy[i - 1]} ${heavy[i]}`).toBeGreaterThanOrEqual(2);
    // Eén rustige heuvelloop, met één zin waarom.
    const added = plan.proposal.changes.filter((c) => c.action === 'add' && c.newSessionDraft?.templateId === 'tpl_hill_easy');
    expect(added.map((c) => c.toDate)).toEqual(['2026-11-18']);
    expect(added[0].reason).toBe('Heuvels in de buurt: een rustige heuvelloop erbij, er staat in je periode geen loop die een heuveltraining kan worden.');
    // Wat vóór de periode staat, blijft staan.
    expect(plan.proposal.changes.filter((c) => (c.fromDate && c.fromDate < PERIOD.startDate) || (c.toDate && c.toDate < PERIOD.startDate))).toEqual([]);
    expect(after.some((s) => s.scheduledDate === '2026-11-13' && s.templateId === 'tpl_hill_intervals')).toBe(true);
    // Gewoon: de loopjes zoals gepland, niets korter.
    for (const s of after.filter((o) => o.scheduledDate >= PERIOD.startDate && o.scheduledDate <= PERIOD.endDate && ['tpl_long_run', 'tpl_easy_run'].includes(o.templateId))) expect(s.plannedMinutes).toBeUndefined();
    // Eigen gewicht staat nooit naast een andere krachtsessie (Bovenlichaam A en Benen A staan in het gewone plan wel naast elkaar).
    const bodyweight = after.filter((s) => s.templateId === 'tpl_bodyweight');
    expect(bodyweight.length).toBeGreaterThan(0);
    const otherStrength = after.filter((s) => s.templateId !== 'tpl_bodyweight' && templates.find((t) => t.id === s.templateId)?.type === 'strength');
    for (const bw of bodyweight) {
      expect(otherStrength.filter((o) => Math.abs(daysBetween(o.scheduledDate, bw.scheduledDate)) < 2), bw.scheduledDate).toEqual([]);
      expect(bodyweight.filter((o) => o.id !== bw.id && Math.abs(daysBetween(o.scheduledDate, bw.scheduledDate)) < 2), bw.scheduledDate).toEqual([]);
    }
    // Elke verandering heeft een reden, en de reden van wat vervalt zegt waarom.
    expect(plan.proposal.changes.every((c) => !!c.reason && c.reason.length > 10)).toBe(true);
    const gone = plan.proposal.changes.filter((c) => c.action === 'remove' && !/eigen gewicht\./.test(c.reason ?? ''));
    expect(gone.map((c) => c.reason).every((r) => /48 uur|vervalt|wordt/.test(r ?? ''))).toBe(true);
  });

  it('met een klacht aan knie of been (Matig of erger) zegt de zin dat er niet in tempo wordt afgedaald', async () => {
    const { sessions: stored, templates, context } = await setup();
    const swap: Record<string, string> = { '2026-11-13': '2026-11-14', '2026-11-14': '2026-11-13' };
    const sessions = stored.map((s) => (swap[s.scheduledDate] && (s.templateId === 'tpl_upper_b' || s.templateId === 'tpl_hill_intervals') ? { ...s, scheduledDate: swap[s.scheduledDate] } : s));
    const ctx = (periods: LeavePeriod[]) => ({ ...context(PERIOD)(periods), noGymLegComplaint: true });
    const plan = planLeaveChange({ mode: 'add', period: PERIOD, existing: [], sessions, logs: [], templates, today: TODAY, context: ctx });
    const added = plan.proposal.changes.filter((c) => c.action === 'add' && c.newSessionDraft?.templateId === 'tpl_hill_easy');
    expect(added).toHaveLength(1);
    expect(added[0].reason).toBe('Heuvels in de buurt: een rustige heuvelloop erbij, want er staat in je periode geen loop die een heuveltraining kan worden, en je klacht aan een knie of been is Matig of erger, dus zonder afdalen in tempo.');
    expect(plan.proposal.changes.some((c) => c.action === 'add' && c.newSessionDraft?.templateId === 'tpl_hills_descent')).toBe(false);
  });

  it('drie openingen na Akkoord zeggen niets meer en veranderen niets (pingpong)', async () => {
    const { sessions, templates, context } = await setup();
    for (const hills of [true, false]) {
      await wipeAllData();
      vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
      const fresh = await setup();
      const period = { ...PERIOD, noGym: { ...PERIOD.noGym!, hills } };
      const plan = planLeaveChange({ mode: 'add', period, existing: [], sessions: fresh.sessions, logs: [], templates: fresh.templates, today: TODAY, context: fresh.context(period) });
      const applied = applyPlanChangeItems(plan.proposal.changes, fresh.sessions, undefined, { by: 'proposal', proposalId: plan.proposal.id, at: `${TODAY}T08:00:00.000Z` });
      const before = new Map(fresh.sessions.map((s) => [s.id, s]));
      for (const s of applied.sessions) if (!before.has(s.id) || JSON.stringify(before.get(s.id)) !== JSON.stringify(s)) await PlannedSessionsRepo.put(s);
      await SettingsRepo.set({ leavePeriods: plan.periodsAfter });
      const stored = JSON.stringify((await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id)));
      for (let i = 0; i < 3; i++) expect(await syncProgramHorizon()).toEqual(quiet);
      expect(JSON.stringify((await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id)))).toBe(stored);
    }
    expect(sessions.length).toBeGreaterThan(0);
    expect(templates.length).toBeGreaterThan(0);
    expect(context).toBeTypeOf('function');
  });

  it('een plan zonder eigen fouten: geen enkele training vóór de periode verandert, ook niet bij een andere weekindeling', async () => {
    const { sessions: stored, templates, context } = await setup();
    const week = stored.filter((s) => s.scheduledDate >= '2026-11-09' && s.scheduledDate <= '2026-11-15' && s.templateId !== 'tpl_herstel');
    const days = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
    const perms = (a: string[]): string[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
    let checked = 0;
    for (const [n, perm] of perms(days).entries()) {
      if (n % 6 !== 0) continue;
      const layout = stored.map((s) => { const k = week.findIndex((w) => w.id === s.id); return k >= 0 ? { ...s, scheduledDate: perm[k] } : s; });
      // Alleen een weekindeling die de planning zelf al goed vindt.
      if (planPass(layout, { ...context(PERIOD)([]) }).repairs.length > 0) continue;
      for (const amount of ['normal', 'light'] as const) {
        const period = { ...PERIOD, noGym: { ...PERIOD.noGym!, amount } };
        const plan = planLeaveChange({ mode: 'add', period, existing: [], sessions: layout, logs: [], templates, today: TODAY, context: context(period) });
        checked++;
        expect(plan.proposal.changes.filter((c) => (c.fromDate && c.fromDate < period.startDate) || (c.toDate && c.toDate < period.startDate)), `${amount} ${perm.join(' ')}`).toEqual([]);
        // Wat de periode neerzet op een dag met beenzware training ernaast is geen sprint.
        const placed = plan.proposal.changes.filter((c) => c.action === 'add' && c.newSessionDraft?.templateId === 'tpl_hills_descent');
        for (const c of placed) {
          const near = layout.filter((s) => Math.abs(daysBetween(s.scheduledDate, c.toDate!)) === 1 && isLegHeavyTemplate(templates.find((t) => t.id === s.templateId)!));
          expect(near.filter((s) => !plan.proposal.changes.some((o) => o.plannedSessionId === s.id && o.action === 'remove'))).toEqual([]);
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});
