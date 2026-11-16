// I-80: het blad van een overgeslagen of vervallen training zegt waarom (engine/skipReason.ts). Alles nagemaakt.

import { describe, expect, it } from 'vitest';
import { backOnPlanCheck, quietWhileIll, skipReason, type SkipReasonInput } from './skipReason';
import { planIllnessStart, planIllnessChange } from './illness';
import { applyPlanChangeItems } from './proposalEngine';
import { deriveSessionStatus } from './sessionStatus';
import { quietSheetActions, sessionSheetActions } from './sessionActions';
import { weeklyProgressionNote, withoutMinuteRange } from './substitutions';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import type { Program } from '../models/program';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const TODAY = '2026-11-16'; // maandag

let n = 0;
const ps = (templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `s${++n}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0, ...over,
});
const logOf = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: tpl(s.templateId).type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);
const input = (session: PlannedSession, over: Partial<SkipReasonInput> = {}): SkipReasonInput => ({
  session, template: tpl(session.templateId), today: TODAY, logged: false, proposals: [], ...over,
});
const proposalOf = (over: Partial<PlanChangeProposal>): PlanChangeProposal => ({
  id: 'p1', trigger: 'leave_added', issue: 'Vakantie, 18 tot 20 november', changes: [], alternatives: [], consequences: '', explanation: '', createdAt: `${TODAY}T08:00:00.000Z`, resolution: 'accepted', ...over,
});
const cold: IllnessEpisode = { id: 'ill1', kind: 'above_neck', startDate: TODAY };
const fever: IllnessEpisode = { id: 'ill2', kind: 'below_neck', startDate: TODAY };
const holiday: LeavePeriod = { id: 'v1', kind: 'no_training', startDate: '2026-11-10', endDate: '2026-11-12' };

// Wat Akkoord op een ziekmelding schrijft: de rij overgeslagen, met het slot van het voorstel.
function reportIll(kind: IllnessEpisode['kind'], sessions: PlannedSession[]) {
  const proposal = planIllnessStart(kind, sessions, templates, [], TODAY);
  const applied = applyPlanChangeItems(proposal.changes, sessions, undefined, { by: 'proposal', proposalId: proposal.id, at: `${TODAY}T08:00:00.000Z` }).sessions;
  return { proposal, applied };
}

describe('skipReason: de reden uit het voorstel', () => {
  it('een lange duurloop die een verkoudheid van de planning haalde: Vervallen, met de reden van het voorstel', () => {
    const long = ps('tpl_long_run', TODAY);
    const { proposal, applied } = reportIll('above_neck', [long]);
    const row = applied.find((s) => s.id === long.id)!;
    expect(row.status).toBe('skipped');
    expect(row.lock?.proposalId).toBe(proposal.id);
    const r = skipReason(input(row, { proposals: [proposal], illness: [cold] }));
    expect(r).toEqual({ kind: 'ill', word: 'Vervallen', line: 'Verkouden: niets zwaars op ma 16 november.' });
  });

  it('weer beter melden: wat tijdens de ziekte bleef liggen heet ook Vervallen', () => {
    const ep: IllnessEpisode = { id: 'ill3', kind: 'below_neck', startDate: '2026-11-13' };
    const sat = ps('tpl_hill_intervals', '2026-11-14');
    const plan = planIllnessChange({ action: 'recover' }, [ep], [sat], templates, [], TODAY)!;
    const row = applyPlanChangeItems(plan.proposal.changes, [sat], undefined, { by: 'proposal', proposalId: plan.proposal.id, at: TODAY }).sessions[0];
    const r = skipReason(input(row, { proposals: [plan.proposal], illness: plan.episodesAfter }));
    expect(r?.word).toBe('Vervallen');
    expect(r?.line).toMatch(/^Niet gedaan tijdens ziekte/);
  });

  it('een ander voorstel: Overgeslagen, met de reden van het item, of anders de titel', () => {
    const row = ps('tpl_easy_run', '2026-11-18', { status: 'skipped', lock: { by: 'proposal', proposalId: 'p1', at: TODAY } });
    const withReason = proposalOf({ changes: [{ plannedSessionId: row.id, action: 'remove', reason: 'Rustige duurloop op woensdag valt in je vakantie.' }] });
    expect(skipReason(input(row, { proposals: [withReason] }))).toEqual({ kind: 'proposal', word: 'Overgeslagen', line: 'Rustige duurloop op woensdag valt in je vakantie.' });
    const bare = proposalOf({ changes: [{ plannedSessionId: row.id, action: 'remove' }] });
    expect(skipReason(input(row, { proposals: [bare] }))?.line).toBe('Via het voorstel "Vakantie, 18 tot 20 november".');
  });

  it('een oude sessie zonder voorstel-id, of met een voorstel dat weg is: geen reden, geen fout', () => {
    const old = ps('tpl_easy_run', '2026-11-18', { status: 'skipped', lock: { by: 'proposal', at: '2026-10-01T08:00:00.000Z' } });
    expect(skipReason(input(old, { proposals: [proposalOf({})] }))).toBeUndefined();
    const gone = ps('tpl_easy_run', '2026-11-18', { status: 'skipped', lock: { by: 'proposal', proposalId: 'weg', at: TODAY } });
    expect(skipReason(input(gone))).toBeUndefined();
    const bare = ps('tpl_easy_run', '2026-11-18', { status: 'skipped' });
    expect(skipReason(input(bare))).toBeUndefined();
  });
});

describe('skipReason: zelf, periodes en de ene regel', () => {
  it('zelf overgeslagen: jouw slot', () => {
    const row = ps('tpl_easy_run', '2026-11-18', { status: 'skipped', lock: { by: 'user', at: TODAY } });
    expect(skipReason(input(row))).toEqual({ kind: 'yours', word: 'Overgeslagen', line: 'Je zette hem zelf op overgeslagen.' });
  });

  it('een rij die je zelf vastzette op een voorbije vakantiedag: Vervallen door de vakantie, zoals Week', () => {
    const row = ps('tpl_easy_run', '2026-11-11', { status: 'moved', movedFromDate: '2026-11-09', lock: { by: 'user', at: '2026-11-08T08:00:00.000Z' } });
    const pause = { leave: [holiday], templates, illness: [] };
    const r = skipReason(input(row, { leave: [holiday] }));
    expect(r).toEqual({ kind: 'off', word: 'Vervallen', line: 'Je meldde een vakantie. Inhalen hoeft niet.' });
    // Dezelfde afleiding als Week: daar is hij 'away', Vervallen.
    expect(deriveSessionStatus(row, [], false, pause).status).toBe('away');
  });

  it('een vakantie in de week: alleen de dagen binnen de vakantie vervallen, de dag ervoor blijft gemist', () => {
    const before = ps('tpl_easy_run', '2026-11-09');
    const inside = ps('tpl_hill_intervals', '2026-11-12');
    const after = ps('tpl_long_run', '2026-11-13');
    expect(skipReason(input(before, { leave: [holiday] }))).toBeUndefined();
    expect(skipReason(input(inside, { leave: [holiday] }))?.kind).toBe('off');
    expect(skipReason(input(after, { leave: [holiday] }))).toBeUndefined();
  });

  it('een tocht en een periode zonder sportschool', () => {
    const trek: LeavePeriod = { id: 't1', kind: 'trek', startDate: '2026-11-10', endDate: '2026-11-11' };
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-10'), { leave: [trek] }))?.line).toBe('Een dag van je tocht. Inhalen hoeft niet.');
    const noGym: LeavePeriod = { id: 'g1', kind: 'no_gym', startDate: '2026-11-09', endDate: '2026-11-22' };
    expect(skipReason(input(ps('tpl_lower_a', '2026-11-10'), { leave: [noGym] }))).toEqual({ kind: 'nogym', word: 'Vervallen', line: 'Sportschool nodig, en je zat zonder sportschool.' });
    // Een loop heeft de sportschool niet nodig: gewoon gemist.
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-10'), { leave: [noGym] }))).toBeUndefined();
  });

  it('een rij die een periode liet vallen, zonder slot: de periode', () => {
    const later: LeavePeriod = { id: 'v2', kind: 'no_training', startDate: '2026-11-18', endDate: '2026-11-20' };
    const row = ps('tpl_easy_run', '2026-11-18', { status: 'skipped', leave: { periodId: 'v2', role: 'dropped', from: '2026-11-18' } });
    expect(skipReason(input(row, { leave: [later] }))).toEqual({ kind: 'off', word: 'Overgeslagen', line: 'Je meldde een vakantie. Inhalen hoeft niet.' });
  });

  it('de dag zelf telt nog niet als voorbij; gisteren in je ziekte wel', () => {
    const ep: IllnessEpisode = { id: 'ill4', kind: 'below_neck', startDate: '2026-11-15' };
    expect(skipReason(input(ps('tpl_easy_run', TODAY), { illness: [ep] }))).toBeUndefined();
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-15'), { illness: [ep] }))).toEqual({ kind: 'ill', word: 'Vervallen', line: 'Je meldde ziekte. Inhalen hoeft niet.' });
  });

  it('de einddag van een ziekmelding hoort erbij, de dag erna niet', () => {
    const ep: IllnessEpisode = { id: 'ill5', kind: 'below_neck', startDate: '2026-11-10', endDate: '2026-11-12' };
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-12'), { illness: [ep] }))?.kind).toBe('ill');
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-13'), { illness: [ep] }))).toBeUndefined();
  });

  it('een gelogde training op een zieke dag is gedaan, niet vervallen', () => {
    const ep: IllnessEpisode = { id: 'ill6', kind: 'above_neck', startDate: '2026-11-10', endDate: '2026-11-12' };
    const row = ps('tpl_easy_run', '2026-11-11');
    expect(deriveSessionStatus(row, [logOf(row)], false, { illness: [ep] }).status).toBe('completed');
    expect(skipReason(input(row, { illness: [ep], logged: true }))).toBeUndefined();
  });

  it('een training die nog in Forge loopt is niet vervallen', () => {
    const ep: IllnessEpisode = { id: 'ill7', kind: 'below_neck', startDate: '2026-11-10', endDate: '2026-11-12' };
    const row = ps('tpl_lower_a', '2026-11-11');
    expect(skipReason(input(row, { illness: [ep], openDraft: row.id }))).toBeUndefined();
  });

  it('na de race: wat in de afbouw niet gedaan is vervalt', () => {
    const row = ps('tpl_easy_run', '2026-11-12');
    expect(skipReason(input(row, { races: ['2026-11-15'] }))).toEqual({ kind: 'race', word: 'Vervallen', line: 'Viel in de afbouw voor je race. Inhalen hoeft niet.' });
    // Voor de race nog niet: dan is de afbouw niet voorbij.
    expect(skipReason(input(row, { races: ['2026-11-18'] }))).toBeUndefined();
  });

  it('zonder pauze, zonder spoor: niets', () => {
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-12')))).toBeUndefined();
    expect(skipReason(input(ps('tpl_easy_run', '2026-11-20')))).toBeUndefined();
  });
});

describe('Toch doen zolang je ziek bent (de ene regel)', () => {
  const long = ps('tpl_long_run', TODAY, { status: 'skipped' });
  const easy = ps('tpl_easy_run', TODAY, { status: 'skipped' });

  it('koorts: Toch doen komt niet', () => {
    const c = backOnPlanCheck({ session: long, template: tpl('tpl_long_run'), today: TODAY, illness: [fever] });
    expect(c.kind).toBe('refuse');
  });

  it('verkouden met iets zwaars: eerst de vraag, met het woord van slepen', () => {
    expect(backOnPlanCheck({ session: long, template: tpl('tpl_long_run'), today: TODAY, illness: [cold] })).toEqual({ kind: 'ask', line: 'Je bent verkouden, dus niets zwaars.' });
  });

  it('verkouden en rustig: mag, maar zonder mint hoofdknop', () => {
    const check = backOnPlanCheck({ session: easy, template: tpl('tpl_easy_run'), today: TODAY, illness: [cold] });
    expect(check.kind).toBe('ok');
    expect(quietWhileIll({ check, today: TODAY, illness: [cold] })).toBe(true);
  });

  it('opbouwen na ziekte met iets zwaars: eerst de vraag', () => {
    const ep: IllnessEpisode = { id: 'ill8', kind: 'below_neck', startDate: '2026-11-10', endDate: '2026-11-15' };
    const c = backOnPlanCheck({ session: long, template: tpl('tpl_long_run'), today: TODAY, illness: [ep] });
    expect(c).toEqual({ kind: 'ask', line: 'Je bouwt op na ziekte, dus nog niets zwaars.' });
  });

  it('niet ziek: Toch doen is gewoon de hoofdknop', () => {
    const check = backOnPlanCheck({ session: long, template: tpl('tpl_long_run'), today: TODAY, illness: [] });
    expect(check.kind).toBe('ok');
    expect(quietWhileIll({ check, today: TODAY, illness: [], reason: { kind: 'yours', word: 'Overgeslagen', line: '' } })).toBe(false);
    const actions = sessionSheetActions({ date: TODAY, today: TODAY, skipped: true, canComeBack: true, kind: 'log' });
    expect(actions.main).toBe('backOnPlan');
  });

  it('een vervallen training door ziekte is stil, ook als je nu beter bent', () => {
    const check = backOnPlanCheck({ session: easy, template: tpl('tpl_easy_run'), today: addDays(TODAY, 30), illness: [{ ...cold, endDate: TODAY }] });
    expect(quietWhileIll({ check, today: addDays(TODAY, 30), illness: [{ ...cold, endDate: TODAY }], reason: { kind: 'ill', word: 'Vervallen', line: '' } })).toBe(true);
  });

  it('stil: geen hoofdknop, de keuze die het was staat bovenaan de rijen', () => {
    expect(quietSheetActions({ main: 'backOnPlan', rows: ['move'] })).toEqual({ rows: ['backOnPlan', 'move'] });
  });
});

describe('de minuten en de notitie van de week spreken elkaar niet tegen', () => {
  it('het bereik in minuten gaat uit de notitie, de rest blijft', () => {
    expect(withoutMinuteRange('Rustweek (35-45 min, D+ ook lager)')).toBe('Rustweek, D+ ook lager');
    expect(withoutMinuteRange('Rustweek (35-45 min)')).toBe('Rustweek');
    expect(withoutMinuteRange('Rustweek (25-30 min) (herhaalweek)')).toBe('Rustweek (herhaalweek)');
    expect(withoutMinuteRange('Wennen, rustig tempo')).toBe('Wennen, rustig tempo');
  });

  it('geen enkele week van het standaardprogramma noemt een bereik in minuten naast de minuten van de dag', () => {
    const program: Program = { ...base, startDate: '2026-01-05' };
    const weeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
    for (const t of templates) {
      for (let w = 0; w < weeks; w++) {
        const note = weeklyProgressionNote(t, addDays('2026-01-05', w * 7 + 6), program);
        expect(note ?? '').not.toMatch(/\d+\s*-\s*\d+ min/);
      }
    }
  });
});
