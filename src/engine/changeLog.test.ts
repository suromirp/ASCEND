// Aangepast door ASCEND: de nagemaakte voorbeelden uit hoofdstuk 6 van docs/visie/Ontwerp Week minimaal.md
// en de randgevallen van de opdracht. Alles is verzonnen; de week is die van maandag 9 november 2026.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import { ADJUST_WINDOW_DAYS, adjustedIdsOf, adjustmentsSub, decidedLine, weekAdjustments } from './changeLog';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';

const WEEK = '2026-11-09';
const TODAY = '2026-11-12';
const tpl = (id: string, name: string, type: SessionTemplate['type'] = 'cardio') => ({ id, name, type }) as SessionTemplate;
const templates = [tpl('long', 'Lange duurloop'), tpl('hills', 'Heuvelintervallen'), tpl('bw', 'Eigen gewicht', 'strength'), tpl('tempo', 'Tempoloop'), tpl('rest', 'Rustdag', 'recovery')];
const ps = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: WEEK, status: 'planned', order: 0, ...extra });

let n = 0;
function proposal(changes: PlanChangeItem[], extra: Partial<PlanChangeProposal> = {}): PlanChangeProposal {
  n += 1;
  const createdAt = extra.createdAt ?? `2026-11-1${Math.min(n, 2)}T08:00:0${n % 10}.000Z`;
  return { id: `p${n}`, trigger: 'plan_check', issue: 'Te veel zware dagen achter elkaar.', changes, alternatives: [], consequences: '', explanation: '', createdAt, resolvedAt: createdAt, resolution: 'accepted', ...extra };
}
const lockOf = (p: PlanChangeProposal) => ({ by: 'proposal' as const, proposalId: p.id, at: p.createdAt });
const lines = (list: ReturnType<typeof weekAdjustments>) => list.map((a) => `${a.name}: ${a.what}`);

describe('Aangepast door ASCEND, de voorbeelden', () => {
  it('Week opnieuw plannen die een lange duurloop op dezelfde dag opnieuw neerlegt: geen regel', () => {
    const replan = proposal(
      [
        { plannedSessionId: 'old', action: 'remove', discard: true, generatedBy: ['engine/replanWeek.ts'] },
        { action: 'add', newSessionDraft: { templateId: 'long', scheduledDate: '2026-11-15', weekStartDate: WEEK }, restore: true, generatedBy: ['engine/replanWeek.ts'] },
      ],
      { id: 'replan_1', trigger: 'session_moved', issue: 'Week opnieuw gepland' },
    );
    const sessions = [ps('new', 'long', '2026-11-15')];
    expect(weekAdjustments([replan], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('dezelfde toevoeging en verwijdering op één dag door de app zelf: ook geen regel', () => {
    const p = proposal([
      { plannedSessionId: 'old', action: 'remove', reason: 'x' },
      { action: 'add', newSessionDraft: { templateId: 'long', scheduledDate: '2026-11-15', weekStartDate: WEEK }, replacesSessionId: 'old' },
    ], { trigger: 'weekly_prescription_computed' });
    const sessions = [ps('old', 'long', '2026-11-15', { status: 'skipped', lock: lockOf(p) }), ps('new', 'long', '2026-11-15', { lock: lockOf(p) })];
    expect(weekAdjustments([p], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('een toevoeging naast een verwijdering die niet meer te lezen is: bij twijfel geen regel', () => {
    const p = proposal([
      { plannedSessionId: 'gone', action: 'remove', discard: true },
      { action: 'add', newSessionDraft: { templateId: 'long', scheduledDate: '2026-11-15', weekStartDate: WEEK } },
    ]);
    expect(weekAdjustments([p], [ps('new', 'long', '2026-11-15', { lock: lockOf(p) })], templates, WEEK, TODAY)).toEqual([]);
  });

  const friToSat = proposal([{ plannedSessionId: 'h', action: 'move', fromDate: '2026-11-13', toDate: '2026-11-14', reason: 'Meer ruimte na je beendag.' }]);

  it('een voorstel dat van vrijdag naar zaterdag verplaatst: één regel', () => {
    const sessions = [ps('h', 'hills', '2026-11-14', { status: 'moved', lock: lockOf(friToSat) })];
    const out = weekAdjustments([friToSat], sessions, templates, WEEK, TODAY);
    expect(lines(out)).toEqual(['Heuvelintervallen: van vr 13 naar za 14']);
    expect(out[0].reason).toBe('Meer ruimte na je beendag.');
  });

  it('daarna zelf terug naar vrijdag: geen regel', () => {
    const sessions = [ps('h', 'hills', '2026-11-13', { status: 'moved', lock: { by: 'user', at: '2026-11-12T09:00:00.000Z' } })];
    expect(weekAdjustments([friToSat], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('zelf weg en weer terug naar zaterdag: geen regel, want jij legde hem het laatst neer', () => {
    // De keuze van de bouwer (docs/beslissingen/2026-11-12-week-minimaal.md, aanvulling): het slot op de rij
    // is van jou, dus het log bewijst niet meer dat ASCEND hem daar neerzette.
    const sessions = [ps('h', 'hills', '2026-11-14', { status: 'moved', lock: { by: 'user', at: '2026-11-12T09:30:00.000Z' } })];
    expect(weekAdjustments([friToSat], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('een echt extra training: één regel "erbij"', () => {
    const p = proposal([{ action: 'add', newSessionDraft: { templateId: 'bw', scheduledDate: '2026-11-15', weekStartDate: WEEK }, reason: 'Je hebt ruimte voor een korte extra.' }], { trigger: 'session_completed' });
    const out = weekAdjustments([p], [ps('x', 'bw', '2026-11-15', { lock: lockOf(p) })], templates, WEEK, TODAY);
    expect(lines(out)).toEqual(['Eigen gewicht: erbij op zo 15']);
  });

  it('Ongedaan maken: geen regel', () => {
    const p = proposal([{ plannedSessionId: 'h', action: 'move', fromDate: '2026-11-13', toDate: '2026-11-14' }]);
    const undo = proposal([], { resolution: 'rejected', revertsProposalId: p.id, issue: 'Ongedaan gemaakt' });
    // Ook als de rij (nog) op zaterdag staat: het voorstel is teruggedraaid.
    const sessions = [ps('h', 'hills', '2026-11-14', { status: 'moved', lock: lockOf(p) })];
    expect(weekAdjustments([p, undo], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('een week in de toekomst: de regel staat in de week waar de training nu staat', () => {
    const p = proposal([{ plannedSessionId: 'f', action: 'move', fromDate: '2026-11-27', toDate: '2026-11-28' }]);
    const sessions = [ps('f', 'tempo', '2026-11-28', { weekStartDate: '2026-11-23', status: 'moved', lock: lockOf(p) })];
    expect(lines(weekAdjustments([p], sessions, templates, '2026-11-23', TODAY))).toEqual(['Tempoloop: van vr 27 naar za 28']);
    expect(weekAdjustments([p], sessions, templates, WEEK, TODAY)).toEqual([]);
  });
});

describe('Aangepast door ASCEND, de woorden', () => {
  it('lichter, andere invulling, vervalt en weer terug in het plan', () => {
    const p = proposal([
      { plannedSessionId: 'a', action: 'reduce' },
      { plannedSessionId: 'b', action: 'replace' },
      { plannedSessionId: 'c', action: 'remove' },
      { plannedSessionId: 'd', action: 'add', toDate: '2026-11-15', newSessionDraft: { templateId: 'long', scheduledDate: '2026-11-15', weekStartDate: WEEK } },
    ], { trigger: 'illness_resolved' });
    const sessions = [
      ps('a', 'tempo', '2026-11-11', { lock: lockOf(p) }),
      ps('b', 'long', '2026-11-10', { lock: lockOf(p) }),
      ps('c', 'bw', '2026-11-12', { status: 'skipped', lock: lockOf(p) }),
      ps('d', 'long', '2026-11-15', { lock: lockOf(p) }),
    ];
    expect(lines(weekAdjustments([p], sessions, templates, WEEK, TODAY))).toEqual([
      'Lange duurloop: andere invulling op di 10',
      'Tempoloop: lichter op wo 11',
      'Eigen gewicht: vervalt op do 12',
      'Lange duurloop: weer op zo 15',
    ]);
  });

  it('één regel per training: de laatste wijziging telt', () => {
    const a = proposal([{ plannedSessionId: 'h', action: 'move', fromDate: '2026-11-11', toDate: '2026-11-13' }], { createdAt: '2026-11-10T08:00:00.000Z' });
    const b = proposal([{ plannedSessionId: 'h', action: 'move', fromDate: '2026-11-13', toDate: '2026-11-14' }], { createdAt: '2026-11-11T08:00:00.000Z' });
    const sessions = [ps('h', 'hills', '2026-11-14', { status: 'moved', lock: lockOf(b) })];
    expect(lines(weekAdjustments([a, b], sessions, templates, WEEK, TODAY))).toEqual(['Heuvelintervallen: van vr 13 naar za 14']);
  });

  it('door ASCEND heen en terug naar de oude dag: per saldo niets, geen regel', () => {
    const a = proposal([{ plannedSessionId: 'h', action: 'move', fromDate: '2026-11-13', toDate: '2026-11-14' }], { createdAt: '2026-11-10T08:00:00.000Z' });
    const b = proposal([{ plannedSessionId: 'h', action: 'move', fromDate: '2026-11-14', toDate: '2026-11-13' }], { createdAt: '2026-11-11T08:00:00.000Z' });
    const sessions = [ps('h', 'hills', '2026-11-13', { status: 'moved', lock: lockOf(b) })];
    expect(weekAdjustments([a, b], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('een ander voorstel legde de rij daarna neer: het eerdere zegt niets meer', () => {
    const a = proposal([{ plannedSessionId: 'h', action: 'reduce' }], { createdAt: '2026-11-10T08:00:00.000Z' });
    const sessions = [ps('h', 'hills', '2026-11-13', { lock: { by: 'proposal', proposalId: 'iets_anders', at: '2026-11-11T08:00:00.000Z' } })];
    expect(weekAdjustments([a], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('wanneer en hoe het besloten is, alleen als het log het zeker zegt', () => {
    expect(decidedLine({ at: '2026-11-10T09:00:00.000Z', how: 'akkoord' })).toBe('Dinsdag 10 november, na jouw Akkoord');
    expect(decidedLine({ at: '2026-11-10T09:00:00.000Z', how: 'vanzelf' })).toBe('Dinsdag 10 november, vanzelf met een melding');
    expect(decidedLine({ at: '2026-11-10T09:00:00.000Z' })).toBe('Dinsdag 10 november');
    const quick = proposal([{ plannedSessionId: 'h', action: 'reduce' }], { trigger: 'plan_check', createdAt: '2026-11-10T08:00:00.000Z', resolvedAt: '2026-11-10T08:00:02.000Z' });
    const asked = proposal([{ plannedSessionId: 'i', action: 'reduce' }], { trigger: 'session_skipped', createdAt: '2026-11-10T08:00:00.000Z', resolvedAt: '2026-11-10T08:01:00.000Z' });
    const unsure = proposal([{ plannedSessionId: 'j', action: 'reduce' }], { trigger: 'session_skipped', createdAt: '2026-11-10T08:00:00.000Z', resolvedAt: '2026-11-10T08:00:03.000Z' });
    const out = weekAdjustments([quick, asked, unsure], [ps('h', 'hills', '2026-11-13'), ps('i', 'tempo', '2026-11-13'), ps('j', 'long', '2026-11-13')], templates, WEEK, TODAY);
    expect(Object.fromEntries(out.map((a) => [a.sessionId, a.how]))).toEqual({ h: 'vanzelf', i: 'akkoord', j: undefined });
  });

  it('de tweede regel van de rij telt trainingen', () => {
    expect(adjustmentsSub(1, true)).toBe('1 training deze week');
    expect(adjustmentsSub(2, true)).toBe('2 trainingen deze week');
    expect(adjustmentsSub(3, false)).toBe('3 trainingen');
  });

  it('de weekplanning die de inhoud invult is geen aanpassing; een verplaatsing door die ronde wel', () => {
    const p = proposal([
      { plannedSessionId: 'a', action: 'replace' },
      { plannedSessionId: 'b', action: 'reduce' },
      { plannedSessionId: 'h', action: 'move', fromDate: '2026-11-13', toDate: '2026-11-14' },
    ], { trigger: 'weekly_prescription_computed' });
    const sessions = [ps('a', 'long', '2026-11-15'), ps('b', 'tempo', '2026-11-12'), ps('h', 'hills', '2026-11-14')];
    expect(lines(weekAdjustments([p], sessions, templates, WEEK, TODAY))).toEqual(['Heuvelintervallen: van vr 13 naar za 14']);
  });

  it('de eerste opbouw van je plan bij een nieuw doel is geen aanpassing', () => {
    const p = proposal([{ action: 'add', restore: true, newSessionDraft: { templateId: 'long', scheduledDate: '2026-11-15', weekStartDate: WEEK } }], { trigger: 'goal_created', issue: 'Zo ziet je eerste week eruit' });
    expect(weekAdjustments([p], [ps('x', 'long', '2026-11-15')], templates, WEEK, TODAY)).toEqual([]);
  });
});

describe('Aangepast door ASCEND, de randgevallen', () => {
  it('de dag zelf: een wijziging van vandaag telt, een van precies het venster terug ook, een dag eerder niet', () => {
    const today = proposal([{ plannedSessionId: 'a', action: 'reduce' }], { createdAt: '2026-11-12T07:00:00.000Z' });
    const edge = proposal([{ plannedSessionId: 'b', action: 'reduce' }], { createdAt: '2026-10-29T12:00:00.000Z' });
    const old = proposal([{ plannedSessionId: 'c', action: 'reduce' }], { createdAt: '2026-10-28T12:00:00.000Z' });
    expect(ADJUST_WINDOW_DAYS).toBe(14);
    const sessions = [ps('a', 'tempo', '2026-11-12'), ps('b', 'long', '2026-11-13'), ps('c', 'hills', '2026-11-14')];
    expect(weekAdjustments([today, edge, old], sessions, templates, WEEK, TODAY).map((a) => a.sessionId)).toEqual(['a', 'b']);
  });

  it('middernacht in Europe/Amsterdam: 23:30 UTC is al de volgende dag', () => {
    // 28 oktober 23:30 UTC is 29 oktober 00:30 in Nederland: precies 14 dagen voor 12 november.
    const p = proposal([{ plannedSessionId: 'a', action: 'reduce' }], { createdAt: '2026-10-28T23:30:00.000Z' });
    expect(weekAdjustments([p], [ps('a', 'tempo', '2026-11-12')], templates, WEEK, TODAY)).toHaveLength(1);
    const before = proposal([{ plannedSessionId: 'a', action: 'reduce' }], { createdAt: '2026-10-28T22:30:00.000Z' });
    expect(weekAdjustments([before], [ps('a', 'tempo', '2026-11-12')], templates, WEEK, TODAY)).toEqual([]);
  });

  it('een weekgrens: van zondag naar maandag staat de regel alleen in de nieuwe week', () => {
    const p = proposal([{ plannedSessionId: 'l', action: 'move', fromDate: '2026-11-15', toDate: '2026-11-16' }]);
    const sessions = [ps('l', 'long', '2026-11-16', { weekStartDate: '2026-11-16', status: 'moved', lock: lockOf(p) })];
    expect(weekAdjustments([p], sessions, templates, WEEK, TODAY)).toEqual([]);
    expect(lines(weekAdjustments([p], sessions, templates, '2026-11-16', TODAY))).toEqual(['Lange duurloop: van zo 15 naar ma 16']);
  });

  it('een vakantie of tocht in de week: wat opzij ging telt, wat de band uitlegt niet', () => {
    const leave = { periodId: 'v1', kind: 'holiday' };
    const p = proposal([
      { plannedSessionId: 'moved', action: 'move', fromDate: '2026-11-12', toDate: '2026-11-15', leave: { ...leave, role: 'moved' } as never },
      { plannedSessionId: 'dropped', action: 'remove', leave: { ...leave, role: 'dropped' } as never },
    ], { trigger: 'leave_added', issue: 'Vakantie' });
    const sessions = [
      ps('moved', 'tempo', '2026-11-15', { status: 'moved', lock: lockOf(p), leave: { ...leave, role: 'moved' } as never }),
      ps('dropped', 'hills', '2026-11-13', { status: 'skipped', lock: lockOf(p), leave: { ...leave, role: 'dropped' } as never }),
    ];
    expect(lines(weekAdjustments([p], sessions, templates, WEEK, TODAY))).toEqual(['Tempoloop: van do 12 naar zo 15']);
  });

  it('een rij die je zelf vastzette: geen regel, ook niet voor lichter', () => {
    const p = proposal([{ plannedSessionId: 'a', action: 'reduce' }]);
    expect(weekAdjustments([p], [ps('a', 'tempo', '2026-11-13', { lock: { by: 'user', at: '2026-11-12T10:00:00.000Z' } })], templates, WEEK, TODAY)).toEqual([]);
  });

  it('een rij die Week niet toont krijgt geen regel: de oude rij van een inhaal en een overgeslagen rustdag', () => {
    const p = proposal([{ plannedSessionId: 'old', action: 'remove' }, { plannedSessionId: 'r', action: 'remove' }]);
    const sessions = [
      ps('old', 'tempo', '2026-11-10', { status: 'skipped', lock: lockOf(p) }),
      ps('new', 'tempo', '2026-11-13', { catchUp: { fromId: 'old', fromDate: '2026-11-10' }, lock: { by: 'user', at: 'x' } }),
      ps('r', 'rest', '2026-11-11', { status: 'skipped', lock: lockOf(p) }),
    ];
    expect(weekAdjustments([p], sessions, templates, WEEK, TODAY)).toEqual([]);
  });

  it('het getal, de regels en de dagrijen met het woord komen uit dezelfde uitkomst', () => {
    const p = proposal([
      { plannedSessionId: 'h', action: 'move', fromDate: '2026-11-13', toDate: '2026-11-14' },
      { plannedSessionId: 'a', action: 'reduce' },
    ]);
    const sessions = [ps('h', 'hills', '2026-11-14', { status: 'moved', lock: lockOf(p) }), ps('a', 'tempo', '2026-11-11', { lock: lockOf(p) }), ps('z', 'long', '2026-11-15')];
    const out = weekAdjustments([p], sessions, templates, WEEK, TODAY);
    expect(adjustedIdsOf(out)).toEqual(new Set(['h', 'a']));
    expect(adjustedIdsOf(out).size).toBe(out.length);
  });
});
