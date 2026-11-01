import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import { emptyDayText, restDaysToBringBack, REST_BACK_RULE } from './restDayBack';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();

// Nagemaakt: een testloop met veel stilstand op dinsdag 27 oktober 2026, vandaag is woensdag 28 oktober.
const testLog: SessionLog = {
  id: 'log-test', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2026-10-27', completedAt: '2026-10-27T10:00:00Z', variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 5, stoppedSec: 136 },
} as SessionLog;

const lockUser = { by: 'user' as const, at: '2026-10-20T08:00:00Z' };
const lockProposal = { by: 'proposal' as const, proposalId: 'planchange-retest', at: '2026-10-28T08:00:00Z' };
const planned = (id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 });
// De gewone week: Herstel op maandag 2 november, de vaste rustdag.
const standard = (): PlannedSession[] => [
  planned('upA', 'tpl_upper_a', '2026-10-28', '2026-10-26'),
  { ...planned('legs', 'tpl_lower_a', '2026-10-29', '2026-10-26'), lock: lockUser },
  planned('upB', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
  planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26'),
  planned('walk', 'tpl_herstel', '2026-11-02', '2026-11-02'),
  planned('upA2', 'tpl_upper_a', '2026-11-03', '2026-11-02'),
];
const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [testLog], plannedSessions: standard(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-28', restDay: 1, ...over,
});
const restBack = (over: Partial<AdviceInputs> = {}) => computeAdvice(inputs(over)).find((a) => a.ruleId === REST_BACK_RULE);

// De vorm uit de back-up: TEST-RETRY haalde Herstel op ma 2 november weg voor de lange duurloop.
function afterRetry(): PlannedSession[] {
  const retry = computeAdvice(inputs()).find((a) => a.ruleId === 'TEST-RETRY')!;
  expect(retry.proposal!.changes.find((c) => c.plannedSessionId === 'walk')).toMatchObject({ action: 'remove' });
  return applyPlanChangeItems(retry.proposal!.changes, standard(), undefined, lockProposal).sessions;
}
// Daarna gingen de test en de lange duurloop elders heen: maandag is weer leeg.
const moveAway = (sessions: PlannedSession[], id: string, to: string) => sessions.map((s) => (s.id === id ? { ...s, scheduledDate: to, weekStartDate: '2026-11-02', status: 'moved' as const, lock: lockUser } : s));

describe('REST-BACK: de rustdag komt terug als een voorstel hem weghaalde', () => {
  it('na TEST-RETRY staat Herstel op overgeslagen met het slot van het voorstel', () => {
    const walk = afterRetry().find((s) => s.id === 'walk')!;
    expect(walk.status).toBe('skipped');
    expect(walk.lock?.by).toBe('proposal');
  });

  it('zegt niets zolang de lange duurloop nog op de rustdag staat', () => {
    expect(restBack({ plannedSessions: afterRetry(), respondedIds: new Set(['retest:2026-10-27']) })).toBeUndefined();
  });

  it('stelt voor Herstel terug te zetten zodra de dag weer leeg is', () => {
    const sessions = moveAway(afterRetry(), 'long', '2026-11-04');
    const a = restBack({ plannedSessions: sessions, respondedIds: new Set(['retest:2026-10-27']) })!;
    expect(a).toBeDefined();
    expect(a.id).toBe('restback:walk');
    expect(a.title).toBe('Je rustdag op maandag is weer vrij');
    expect(a.lead).toBe('Zet hem terug? Dan staat hij weer op maandag 2 november.');
    expect(a.effect.startsWith('Zet hem terug?')).toBe(true);
    expect(a.effect).toContain('Met Akkoord staat je rustdag weer op maandag 2 november.');
    expect(a.effect).toContain('Liever niet');
    expect(`${a.title}${a.effect}${a.why}${a.brief}`).not.toMatch(/[\u2013\u2014]/);
    // Eén item: de overgeslagen rij zelf komt terug, geen tweede rij ernaast.
    expect(a.proposal!.changes).toHaveLength(1);
    expect(a.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'walk', action: 'add', toDate: '2026-11-02', newSessionDraft: { templateId: 'tpl_herstel', scheduledDate: '2026-11-02', weekStartDate: '2026-11-02' } });
  });

  it('met Akkoord staat dezelfde rij weer gepland, als eigen rij van het systeem', () => {
    const sessions = moveAway(afterRetry(), 'long', '2026-11-04');
    const a = restBack({ plannedSessions: sessions, respondedIds: new Set(['retest:2026-10-27']) })!;
    const { sessions: after, unsupported } = applyPlanChangeItems(a.proposal!.changes, sessions, () => 'nieuw', { by: 'proposal', at: 'x' });
    expect(unsupported).toEqual([]);
    expect(after).toHaveLength(sessions.length);
    const walk = after.find((s) => s.id === 'walk')!;
    expect(walk).toMatchObject({ status: 'planned', scheduledDate: '2026-11-02' });
    expect(walk.lock).toBeUndefined();
    // En daarna is er niets meer te vragen.
    expect(restBack({ plannedSessions: after, respondedIds: new Set(['retest:2026-10-27']) })).toBeUndefined();
  });

  it('zegt niets als je de rustdag zelf oversloeg', () => {
    const sessions = standard().map((s) => (s.id === 'walk' ? { ...s, status: 'skipped' as const, lock: lockUser } : s));
    expect(restDaysToBringBack({ plannedSessions: sessions, logs: [testLog], templates, today: '2026-10-28', restDay: 1 })).toEqual([]);
    expect(restBack({ plannedSessions: sessions })).toBeUndefined();
  });

  it('zegt niets bij een overgeslagen rij zonder slot of met de vlag van een vakantie', () => {
    const plain = standard().map((s) => (s.id === 'walk' ? { ...s, status: 'skipped' as const } : s));
    expect(restDaysToBringBack({ plannedSessions: plain, logs: [], templates, today: '2026-10-28', restDay: 1 })).toEqual([]);
    const leave = standard().map((s) => (s.id === 'walk' ? { ...s, status: 'skipped' as const, lock: lockProposal, leave: { periodId: 'p', role: 'dropped' as const } } : s));
    expect(restDaysToBringBack({ plannedSessions: leave, logs: [], templates, today: '2026-10-28', restDay: 1 })).toEqual([]);
  });

  it('zegt niets als er die dag iets gelogd is, de dag voorbij is of het niet je vaste rustdag is', () => {
    const sessions = moveAway(afterRetry(), 'long', '2026-11-04');
    const walked: SessionLog = { ...testLog, id: 'log-walk', templateId: 'tpl_easy_run', completedDate: '2026-11-02', completedAt: '2026-11-02T10:00:00Z', bestEffort: undefined } as SessionLog;
    const base = { plannedSessions: sessions, templates, restDay: 1 };
    expect(restDaysToBringBack({ ...base, logs: [walked], today: '2026-10-28' })).toEqual([]);
    expect(restDaysToBringBack({ ...base, logs: [], today: '2026-11-03' })).toEqual([]);
    expect(restDaysToBringBack({ ...base, logs: [], today: '2026-10-28', restDay: 7 })).toEqual([]);
  });

  it('zegt niets als de week zijn rust al op een andere dag heeft', () => {
    const sessions = [...moveAway(afterRetry(), 'long', '2026-11-04'), planned('walk2', 'tpl_herstel', '2026-11-05', '2026-11-02')];
    expect(restDaysToBringBack({ plannedSessions: sessions, logs: [], templates, today: '2026-10-28', restDay: 1 })).toEqual([]);
  });

  it('vraagt niet opnieuw na Liever niet en zwijgt als de instelling uit staat', () => {
    const sessions = moveAway(afterRetry(), 'long', '2026-11-04');
    expect(restBack({ plannedSessions: sessions, respondedIds: new Set(['retest:2026-10-27', 'restback:walk']) })).toBeUndefined();
    expect(restBack({ plannedSessions: sessions, respondedIds: new Set(['retest:2026-10-27']), restDayBack: false })).toBeUndefined();
  });

  it('raakt historie nooit aan: een gelogde of voorbije rij komt niet terug', () => {
    const sessions = moveAway(afterRetry(), 'long', '2026-11-04');
    const logged: SessionLog = { ...testLog, id: 'log-h', templateId: 'tpl_herstel', type: 'recovery', plannedSessionId: 'walk', completedDate: '2026-11-02', completedAt: '2026-11-02T10:00:00Z', bestEffort: undefined } as SessionLog;
    expect(restDaysToBringBack({ plannedSessions: sessions, logs: [logged], templates, today: '2026-10-28', restDay: 1 })).toEqual([]);
  });
});

describe('Week: een lege dag op je vaste rustdag', () => {
  it('heet Rustdag, met je vaste rustdag als tweede regel', () => {
    expect(emptyDayText('2026-11-02', 1)).toEqual({ rest: true, title: 'Rustdag', line: 'je vaste rustdag' });
  });

  it('een andere lege dag blijft Vrij, niets gepland', () => {
    expect(emptyDayText('2026-11-03', 1)).toEqual({ rest: false, title: 'Vrij', line: 'niets gepland' });
    expect(emptyDayText('2026-11-08', 7)).toMatchObject({ rest: true, title: 'Rustdag' });
    expect(emptyDayText('2026-11-02', undefined)).toMatchObject({ rest: false, title: 'Vrij' });
  });

  it('staat de rust van die week op een andere dag (na REST-SWAP of REST-PULL), dan is de lege rustdag gewoon Vrij', () => {
    const byId = new Map(templates.map((t) => [t.id, t]));
    const moved = [planned('walk', 'tpl_herstel', '2026-11-03', '2026-11-02'), planned('easy', 'tpl_easy_run', '2026-11-05', '2026-11-02')];
    expect(emptyDayText('2026-11-02', 1, moved, byId)).toEqual({ rest: false, title: 'Vrij', line: 'niets gepland' });
    // Een overgeslagen Herstel elders telt niet als rust van de week.
    const skipped = [{ ...moved[0], status: 'skipped' as const }, moved[1]];
    expect(emptyDayText('2026-11-02', 1, skipped, byId)).toMatchObject({ rest: true, title: 'Rustdag' });
    // Herstel in een andere week telt ook niet.
    const otherWeek = [planned('walk', 'tpl_herstel', '2026-11-10', '2026-11-09')];
    expect(emptyDayText('2026-11-02', 1, otherWeek, byId)).toMatchObject({ rest: true, title: 'Rustdag' });
  });
});
