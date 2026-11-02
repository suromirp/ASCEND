import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import type { LeavePeriod } from '../models/leave';
import { placeReason, UNKNOWN_PLACE } from './placeReason';


// Nagemaakte week: maandag 2 november 2026 is dag 1.
const base: PlannedSession = { id: 's1', templateId: 'tpl_tempo_run', scheduledDate: '2026-11-04', weekStartDate: '2026-11-02', status: 'planned', order: 0 };

function proposal(over: Partial<PlanChangeProposal> = {}): PlanChangeProposal {
  return {
    id: 'p1', trigger: 'session_skipped', issue: 'Extra herstel na je lange loop', alternatives: [], consequences: '', explanation: '',
    createdAt: '2026-10-30T07:00:00.000Z', resolvedAt: '2026-10-30T07:05:00.000Z', resolution: 'accepted',
    changes: [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-11-03', toDate: '2026-11-04', reason: 'Een dag later voor frisse benen.' }],
    ...over,
  };
}

describe('waarom een training op zijn dag staat', () => {
  it('volgt het weekpatroon als de dag de vaste dag is', () => {
    const r = placeReason({ session: base, proposals: [], patternDay: 3 });
    expect(r.kind).toBe('pattern');
    expect(r.text).toBe('Volgens je weekpatroon: deze training staat op woensdag.');
  });

  it('zegt eerlijk dat de reden niet bewaard is als er niets bekend is', () => {
    const r = placeReason({ session: base, proposals: [], patternDay: 5 });
    expect(r.kind).toBe('unknown');
    expect(r.text).toBe('Je weekpatroon zet hem op vrijdag. Waarom hij nu op woensdag staat, is niet bewaard.');
    expect(placeReason({ session: base, proposals: [] }).text).toBe(UNKNOWN_PLACE);
    expect(UNKNOWN_PLACE).toBe('Waarom precies deze dag, is niet bewaard.');
  });

  it('noemt het voorstel dat hem verplaatste, met de dag van Akkoord en de reden', () => {
    const s: PlannedSession = { ...base, status: 'moved', movedFromDate: '2026-11-03', lock: { by: 'proposal', proposalId: 'p1', at: '2026-10-30T07:05:00.000Z' } };
    const r = placeReason({ session: s, proposals: [proposal()], patternDay: 2 });
    expect(r.kind).toBe('proposal');
    expect(r.text).toBe('Verplaatst van di 3 nov via het voorstel "Extra herstel na je lange loop", Akkoord op vr 30 okt. Een dag later voor frisse benen.');
  });

  it('vindt het voorstel ook zonder id op het slot, het laatste aangenomen en niet teruggedraaide', () => {
    const s: PlannedSession = { ...base, status: 'moved', movedFromDate: '2026-11-03', lock: { by: 'proposal', at: '2026-10-31T07:05:00.000Z' } };
    const older = proposal({ id: 'p0', issue: 'Ouder voorstel', resolvedAt: '2026-10-20T07:00:00.000Z', createdAt: '2026-10-20T07:00:00.000Z' });
    const reverted = proposal({ id: 'p2', issue: 'Teruggedraaid', resolvedAt: '2026-10-31T07:00:00.000Z', createdAt: '2026-10-31T07:00:00.000Z' });
    const undo = proposal({ id: 'p3', revertsProposalId: 'p2', changes: [] });
    const r = placeReason({ session: s, proposals: [older, reverted, undo], patternDay: 2 });
    expect(r.text).toContain('"Ouder voorstel"');
  });

  it('zegt bij een samengevat voorstel zonder wijzigingen nog wel de titel en de dag', () => {
    const s: PlannedSession = { ...base, lock: { by: 'proposal', proposalId: 'p1', at: '2026-10-30T07:05:00.000Z' } };
    const r = placeReason({ session: s, proposals: [proposal({ changes: [], summarizedAt: '2027-01-01T00:00:00.000Z' })], patternDay: 2 });
    expect(r.text).toBe('Via het voorstel "Extra herstel na je lange loop", Akkoord op vr 30 okt.');
  });

  it('valt terug op de dag van het slot als het voorstel er niet meer is', () => {
    const s: PlannedSession = { ...base, lock: { by: 'proposal', proposalId: 'weg', at: '2026-10-28T09:00:00.000Z' } };
    expect(placeReason({ session: s, proposals: [], patternDay: 2 }).text).toBe('Via een voorstel, Akkoord op wo 28 okt.');
  });

  it('een voorstel dat alleen de lengte veranderde: de plek komt uit het weekpatroon, het voorstel erbij', () => {
    const s: PlannedSession = { ...base, plannedMinutes: 30, movedFromDate: '2026-11-04', status: 'moved', lock: { by: 'proposal', proposalId: 'p1', at: '2026-11-04T06:00:00.000Z' } };
    const p = proposal({ issue: 'Minder tijd vandaag', resolvedAt: '2026-11-04T06:00:00.000Z', changes: [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-11-04', toDate: '2026-11-04', plannedMinutes: 30 }] });
    const r = placeReason({ session: s, proposals: [p], patternDay: 3 });
    expect(r.kind).toBe('pattern');
    expect(r.extra).toBe('Het voorstel "Minder tijd vandaag" (Akkoord op wo 4 nov) veranderde alleen de lengte.');
  });

  it('een voorstel op dezelfde dag wist een eerdere verplaatsing niet', () => {
    const s: PlannedSession = { ...base, plannedMinutes: 30, movedFromDate: '2026-11-03', status: 'moved', lock: { by: 'proposal', proposalId: 'p1', at: '2026-11-04T06:00:00.000Z' } };
    const p = proposal({ issue: 'Minder tijd vandaag', resolvedAt: '2026-11-04T06:00:00.000Z', changes: [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-11-04', toDate: '2026-11-04', plannedMinutes: 30 }] });
    expect(placeReason({ session: s, proposals: [p], patternDay: 2 }).text).toBe('De planning schoof hem hierheen van di 3 nov. Welke regel dat was, is niet bewaard.');
  });

  it('wat je zelf verplaatste is van jou, met de dag', () => {
    const s: PlannedSession = { ...base, status: 'moved', movedFromDate: '2026-11-05', lock: { by: 'user', at: '2026-11-01T18:00:00.000Z' } };
    const r = placeReason({ session: s, proposals: [], patternDay: 4 });
    expect(r.kind).toBe('yours');
    expect(r.text).toBe('Je zette hem hier zelf neer op zo 1 nov. Hij stond op do 5 nov.');
  });

  it('een oude verplaatsing zonder slot is ook van jou', () => {
    const s: PlannedSession = { ...base, status: 'moved', movedFromDate: '2026-11-05' };
    expect(placeReason({ session: s, proposals: [] }).text).toBe('Je verplaatste hem zelf. Hij stond op do 5 nov.');
  });

  it('een ingehaalde training zegt waar hij vandaan kwam', () => {
    const s: PlannedSession = { ...base, catchUp: { fromId: 's0', fromDate: '2026-10-29' }, lock: { by: 'user', at: '2026-11-02T08:00:00.000Z' } };
    expect(placeReason({ session: s, proposals: [] }).text).toBe('Ingehaald: hij stond op do 29 okt en ging toen niet door.');
  });

  it('een vakantie of tocht noemt de periode', () => {
    const trek: LeavePeriod = { id: 'l1', kind: 'trek', startDate: '2026-11-06', endDate: '2026-11-08', trek: { name: 'Rondje heide', terrain: 'uneven_trail', tent: false, importance: 'training' } };
    const off: LeavePeriod = { id: 'l2', kind: 'no_training', startDate: '2026-11-05', endDate: '2026-11-05' };
    const moved: PlannedSession = { ...base, movedFromDate: '2026-11-05', leave: { periodId: 'l2', role: 'moved', from: '2026-11-05' } };
    expect(placeReason({ session: moved, proposals: [], leavePeriods: [trek, off] }).text).toBe('Hij schoof hierheen voor je vakantie. Hij stond op do 5 nov.');
    const placed: PlannedSession = { ...base, scheduledDate: '2026-11-06', leave: { periodId: 'l1', role: 'placed', from: '2026-11-06' } };
    expect(placeReason({ session: placed, proposals: [], leavePeriods: [trek, off] }).text).toBe('Je tocht "Rondje heide" zette hem hier.');
    const unknown: PlannedSession = { ...base, leave: { periodId: 'weg', role: 'placed' } };
    expect(placeReason({ session: unknown, proposals: [] }).text).toBe('Een vrije periode zette hem hier.');
  });

  it('de planningsronde: een ruil voor de test, herstel na een doel, of een verschuiving zonder bewaarde regel', () => {
    const swap: PlannedSession = { ...base, raceBlock: { pair: 'x', from: '2026-11-03', to: '2026-11-04' } };
    expect(placeReason({ session: swap, proposals: [] }).kind).toBe('rule');
    expect(placeReason({ session: swap, proposals: [] }).text).toBe('De planning ruilde hem van di 3 nov naar hier, zodat je tempoloop of test niet naast zware benen staat.');
    const after: PlannedSession = { ...base, afterGoal: { templateId: 'tpl_intervals', date: '2026-11-01' } };
    expect(placeReason({ session: after, proposals: [], patternDay: 3 }).text).toBe('Volgens je weekpatroon: deze training staat op woensdag.');
    expect(placeReason({ session: after, proposals: [], patternDay: 3 }).extra).toBe('Na je doel van zo 1 nov maakte de planning er een rustige loop van.');
    const sys: PlannedSession = { ...base, movedFromDate: '2026-11-03' };
    expect(placeReason({ session: sys, proposals: [] }).text).toBe('De planning schoof hem hierheen van di 3 nov. Welke regel dat was, is niet bewaard.');
  });
});
