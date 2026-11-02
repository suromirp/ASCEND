import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { PlanChangeItem } from '../models/planChange';
import { previewProposal, sheetAnswer, visiblyChanged } from './proposalPreview';

// Nagemaakt: een week van maandag 16 november 2026. Elk voorstel dat een rij zichtbaar verandert, heeft
// er een regel voor in het blad, en dan pas mag Akkoord.
const { templates } = buildDefaultProgramData();
const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-16', status: 'planned', order: 0, ...extra });
const week = () => [s('legs', 'tpl_lower_a', '2026-11-17'), s('easy', 'tpl_easy_run', '2026-11-19'), s('long', 'tpl_long_run', '2026-11-22')];
const answer = (items: PlanChangeItem[], sessions = week()) => {
  const data = previewProposal(items, sessions, templates);
  return { data, answer: sheetAnswer({ items, data, extraLines: 0 }) };
};

describe('een andere lengte op dezelfde dag', () => {
  it('de korte versie na een tocht (zoals in trek.test.ts): een regel met de minuten, en Akkoord', () => {
    const item: PlanChangeItem = { plannedSessionId: 'legs', action: 'move', fromDate: '2026-11-17', toDate: '2026-11-17', plannedMinutes: 45, reason: 'Iets eerder dan ASCEND graag ziet na je tocht, daarom de korte versie.' };
    const { data, answer: a } = answer([item]);
    expect(data.moves).toEqual([{ name: expect.any(String), action: 'length', to: '2026-11-17', sessionId: 'legs', minutes: 45 }]);
    expect(a.canAccept).toBe(true);
    expect(data.weeks.map((w) => w.weekStart)).toEqual(['2026-11-16']);
  });

  it('een doel of instelling met alleen een andere lengte (horizonChange, restore): een regel, en Akkoord', () => {
    const sessions = week().map((x) => (x.id === 'long' ? { ...x, plannedMinutes: 90 } : x));
    const item: PlanChangeItem = { plannedSessionId: 'long', action: 'move', fromDate: '2026-11-22', toDate: '2026-11-22', restore: true, plannedMinutes: 75, reason: 'Past bij je nieuwe doel.' };
    const { data, answer: a } = answer([item], sessions);
    expect(data.moves).toEqual([{ name: expect.any(String), action: 'length', to: '2026-11-22', sessionId: 'long', minutes: 75 }]);
    expect(a.canAccept).toBe(true);
  });

  it('een verplaatsing en een lengte in één voorstel: allebei in de lijst', () => {
    const items: PlanChangeItem[] = [
      { plannedSessionId: 'easy', action: 'move', fromDate: '2026-11-19', toDate: '2026-11-20' },
      { plannedSessionId: 'legs', action: 'move', fromDate: '2026-11-17', toDate: '2026-11-17', plannedMinutes: 45 },
    ];
    const { data, answer: a } = answer(items);
    expect(data.moves.map((m) => [m.action, m.sessionId])).toEqual([['move', 'easy'], ['length', 'legs']]);
    expect(a.canAccept).toBe(true);
  });
});

describe('een ander merkteken van een vakantie of tocht', () => {
  it('een regel, en Akkoord', () => {
    const sessions = week().map((x) => (x.id === 'easy' ? { ...x, lock: { by: 'user' as const, at: 'x' }, leave: { periodId: 'v1', role: 'moved' as const, from: '2026-11-18' } } : x));
    const item: PlanChangeItem = { plannedSessionId: 'easy', action: 'keep', leave: null };
    const { data, answer: a } = answer([item], sessions);
    expect(data.moves).toEqual([{ name: expect.any(String), action: 'mark', to: '2026-11-19', sessionId: 'easy', leaveOn: false }]);
    expect(a.canAccept).toBe(true);
  });
});

describe('sheetAnswer is streng', () => {
  it('een rij die zichtbaar verandert zonder regel: geen Akkoord', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 'legs', action: 'move', fromDate: '2026-11-17', toDate: '2026-11-18' }];
    const data = previewProposal(items, week(), templates);
    expect(sheetAnswer({ items, data: { ...data, moves: [] }, extraLines: 1 }).canAccept).toBe(false);
    // Een regel voor een andere rij helpt niet.
    expect(sheetAnswer({ items, data: { ...data, moves: [{ name: 'Rustige duurloop', action: 'move', sessionId: 'easy' }] }, extraLines: 0 }).canAccept).toBe(false);
  });

  it('een nieuwe rij zonder regel "erbij": geen Akkoord', () => {
    const items: PlanChangeItem[] = [{ action: 'add', newSessionDraft: { templateId: 'tpl_upper_a', scheduledDate: '2026-11-18', weekStartDate: '2026-11-16' } }];
    const data = previewProposal(items, week(), templates);
    expect(sheetAnswer({ items, data, extraLines: 0 }).canAccept).toBe(true);
    expect(sheetAnswer({ items, data: { moves: [{ name: 'x', action: 'move', sessionId: 'easy' }], changedIds: [] }, extraLines: 0 }).canAccept).toBe(false);
  });

  it('een voorstel dat niets zichtbaars doet behalve vastzetten, met andere regels: Akkoord blijft', () => {
    const items: PlanChangeItem[] = [
      { plannedSessionId: 'easy', action: 'move', fromDate: '2026-11-19', toDate: '2026-11-20' },
      { plannedSessionId: 'long', action: 'move', fromDate: '2026-11-22', toDate: '2026-11-22' },
    ];
    expect(answer(items).answer.canAccept).toBe(true);
  });

  it('visiblyChanged: een slot telt niet, een lengte en een merkteken wel', () => {
    const a = s('a', 'tpl_easy_run', '2026-11-19');
    expect(visiblyChanged(a, { ...a, lock: { by: 'user', at: 'x' } })).toBe(false);
    expect(visiblyChanged(a, { ...a, plannedMinutes: 30 })).toBe(true);
    expect(visiblyChanged(a, { ...a, leave: { periodId: 'v', role: 'placed' } })).toBe(true);
    expect(visiblyChanged({ ...a, status: 'skipped' }, undefined)).toBe(false);
  });
});
