// De rustdag schuift mee (I-162): een training die jij op je rustdag zet, geeft één voorstel om de rustdag naar de
// vrijgekomen dag te zetten. Testdata is nagemaakt.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession } from '../models/training';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { restDayFollowAfterMove, restDayFollowProposal, type RestDayFollowInput } from './restDayFollows';
import type { ScheduleProposal } from './scheduler';

const { templates } = buildDefaultProgramData();
const templateById = new Map(templates.map((t) => [t.id, t]));
const MON = '2026-11-23';
const TUE = '2026-11-24';
const WED = '2026-11-25';
const THU = '2026-11-26';
const FRI = '2026-11-27';
const SAT = '2026-11-28';
const SUN = '2026-11-29';

const row = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0, ...over });
const yours = { by: 'user' as const, at: '2026-11-23T08:00:00Z' };

// Een nagemaakte week: kracht ma, rust di, duurloop do, kracht vr, lange duurloop zo. De duurloop gaat van do naar di.
function week(over: { rest?: Partial<PlannedSession>; extra?: PlannedSession[] } = {}): PlannedSession[] {
  return [
    row('upper', 'tpl_upper_a', MON),
    row('rest', 'tpl_herstel', TUE, over.rest),
    row('easy', 'tpl_easy_run', TUE, { status: 'moved', movedFromDate: THU, lock: yours }),
    row('lower', 'tpl_lower_a', FRI),
    row('long', 'tpl_long_run', SUN),
    ...(over.extra ?? []),
  ];
}

const input = (sessions: PlannedSession[], over: Partial<RestDayFollowInput> = {}): RestDayFollowInput => ({
  sessions, movedId: 'easy', fromDate: THU, templateById, logs: [], today: MON, restTitle: 'Rustdag', ...over,
});

afterEach(() => vi.useRealTimers());

describe('restDayFollowProposal', () => {
  it('zet de rustdag naar de vrijgekomen dag in dezelfde week, met één regel uitleg', () => {
    const p = restDayFollowProposal(input(week()));
    expect(p?.changes).toEqual([{ sessionId: 'rest', templateId: 'tpl_herstel', templateName: 'Rustdag', fromDate: TUE, toDate: THU }]);
    expect(p?.resolved).toBe(true);
    expect(p?.reason).toBe('Rustige duurloop staat nu op je rustdag. Je rustdag kan naar do 26, die dag is nu vrij.');
    expect(p?.reason).not.toMatch(/[–—]/);
  });

  it('noemt de hersteldag als je rustdag een hersteldag is', () => {
    const p = restDayFollowProposal(input(week(), { restTitle: 'Hersteldag' }));
    expect(p?.changes[0].templateName).toBe('Hersteldag');
    expect(p?.reason).toBe('Rustige duurloop staat nu op je hersteldag. Je hersteldag kan naar do 26, die dag is nu vrij.');
  });

  it('geen voorstel als de nieuwe dag geen rustdag heeft, of als de rustdag al overgeslagen of gedaan is', () => {
    const free = week().filter((s) => s.id !== 'rest');
    expect(restDayFollowProposal(input(free))).toBeUndefined();
    expect(restDayFollowProposal(input(week({ rest: { status: 'skipped' } })))).toBeUndefined();
    expect(restDayFollowProposal(input(week(), { logs: [{ plannedSessionId: 'rest' }] }))).toBeUndefined();
  });

  it('staat er op de vrijgekomen dag al een training, dan de dichtstbijzijnde vrije dag van de week', () => {
    // Do heeft nog een krachttraining; wo en za zijn vrij. Wo ligt een dag van di, za vier: wo.
    const p = restDayFollowProposal(input(week({ extra: [row('upper_b', 'tpl_upper_b', THU)] })));
    expect(p?.changes[0].toDate).toBe(WED);
    expect(p?.reason).toBe('Rustige duurloop staat nu op je rustdag. Je rustdag kan naar wo 25, de vrije dag die het dichtst bij ligt.');
  });

  it('bij gelijke afstand de latere dag, rust na de training', () => {
    // Rust en duurloop op wo; di en do vrij, beide een dag weg: do.
    const sessions = [row('upper', 'tpl_upper_a', MON), row('rest', 'tpl_herstel', WED), row('easy', 'tpl_easy_run', WED, { status: 'moved', movedFromDate: SAT, lock: yours }), row('lower', 'tpl_lower_a', FRI), row('sat', 'tpl_upper_b', SAT), row('long', 'tpl_long_run', SUN)];
    expect(restDayFollowProposal(input(sessions, { fromDate: SAT }))?.changes[0].toDate).toBe(THU);
  });

  it('geen voorstel als de week geen vrije dag meer heeft', () => {
    const full = week({ extra: [row('x1', 'tpl_upper_b', WED), row('x2', 'tpl_upper_b', THU), row('x3', 'tpl_tempo_run', SAT)] });
    expect(restDayFollowProposal(input(full))).toBeUndefined();
  });

  it('nooit een dag direct naast een test of wedstrijd', () => {
    // Een test op vr: do ligt ernaast, dan wo.
    const sessions = week().map((s) => (s.id === 'lower' ? row('test', 'tpl_test_run', FRI) : s));
    expect(restDayFollowProposal(input(sessions))?.changes[0].toDate).toBe(WED);
    // Ook een wedstrijd op wo: wo is bezet, do en za liggen naast een test of wedstrijd. Geen vrije dag.
    const both = [...sessions, row('race', 'tpl_race', WED)];
    expect(restDayFollowProposal(input(both))).toBeUndefined();
  });

  it('de vrijgekomen dag is vandaag: vandaag telt nog niet als voorbij', () => {
    const sessions = [row('rest', 'tpl_herstel', WED), row('easy', 'tpl_easy_run', WED, { status: 'moved', movedFromDate: TUE, lock: yours }), row('long', 'tpl_long_run', SUN)];
    expect(restDayFollowProposal(input(sessions, { fromDate: TUE, today: TUE }))?.changes[0].toDate).toBe(TUE);
    // Een dag later is dinsdag voorbij: dan de dichtstbijzijnde vrije dag vanaf vandaag.
    expect(restDayFollowProposal(input(sessions, { fromDate: TUE, today: WED }))?.changes[0].toDate).toBe(THU);
  });

  it('over de weekgrens: de rustdag blijft in zijn eigen week, ook rond middernacht in Amsterdam', () => {
    // Zondag 23.30 in Amsterdam is in UTC nog zondag; de training van zondag gaat naar de rustdag van maandag 30.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-29T22:30:00Z'));
    expect(todayISO()).toBe(SUN);
    const nextMon = '2026-11-30';
    const sessions = [row('long', 'tpl_long_run', nextMon, { status: 'moved', movedFromDate: SUN, lock: yours }), row('rest', 'tpl_herstel', nextMon), row('upper', 'tpl_upper_a', '2026-12-01')];
    const p = restDayFollowProposal(input(sessions, { movedId: 'long', fromDate: SUN, today: todayISO() }));
    // Zondag ligt in de week ervoor: niet daarheen, wel naar de eerste vrije dag van de eigen week (wo 2).
    expect(p?.changes[0].toDate).toBe('2026-12-02');
    // Net na middernacht is het maandag: zondag is voorbij, dezelfde uitkomst.
    vi.setSystemTime(new Date('2026-11-29T23:30:00Z'));
    expect(todayISO()).toBe(nextMon);
    expect(restDayFollowProposal(input(sessions, { movedId: 'long', fromDate: SUN, today: todayISO() }))?.changes[0].toDate).toBe('2026-12-02');
  });

  it('een rustdag die jij vastzette (via een eerder voorstel) krijgt ook het voorstel; een vrije dag met jouw rij is niet vrij', () => {
    const p = restDayFollowProposal(input(week({ rest: { status: 'moved', movedFromDate: MON, lock: yours } })));
    expect(p?.changes[0]).toMatchObject({ sessionId: 'rest', fromDate: TUE, toDate: THU });
    const locked = week({ extra: [row('mine', 'tpl_upper_b', THU, { status: 'moved', movedFromDate: SAT, lock: yours })] });
    expect(restDayFollowProposal(input(locked))?.changes[0].toDate).toBe(WED);
  });

  it('een vakantie of tocht in de week: geen rustdag op een dag van de periode', () => {
    const trek: LeavePeriod = { id: 'p1', kind: 'trek', startDate: WED, endDate: THU };
    expect(restDayFollowProposal(input(week(), { leave: [trek] }))?.changes[0].toDate).toBe(SAT);
    const holiday: LeavePeriod = { id: 'p2', kind: 'no_training', startDate: WED, endDate: SUN };
    expect(restDayFollowProposal(input(week(), { leave: [holiday] }))).toBeUndefined();
    // Zonder sportschool train je wel: de vrijgekomen dag blijft goed.
    const noGym: LeavePeriod = { id: 'p3', kind: 'no_gym', startDate: WED, endDate: SUN };
    expect(restDayFollowProposal(input(week(), { leave: [noGym] }))?.changes[0].toDate).toBe(THU);
  });

  it('een rustdag die een periode neerzette, een rustdag zelf verplaatsen of een training die bleef staan: geen voorstel', () => {
    expect(restDayFollowProposal(input(week({ rest: { leave: { periodId: 'p1', role: 'placed' } } })))).toBeUndefined();
    expect(restDayFollowProposal(input(week(), { movedId: 'rest', fromDate: MON }))).toBeUndefined();
    expect(restDayFollowProposal(input(week(), { fromDate: TUE }))).toBeUndefined();
  });

  it('is deterministisch en verandert het plan niet', () => {
    const sessions = week();
    const copy = structuredClone(sessions);
    const a = restDayFollowProposal(input(sessions));
    const b = restDayFollowProposal(input(sessions));
    expect(a).toEqual(b);
    expect(sessions).toEqual(copy);
  });

  it('na jouw verplaatsing: het plan zoals het daarna staat; niet na overslaan, Toch doen of ruilen', () => {
    // Het plan voor de sleep: de duurloop nog op do.
    const before = week().map((s) => (s.id === 'easy' ? row('easy', 'tpl_easy_run', THU) : s));
    const move: ScheduleProposal = { changes: [{ sessionId: 'easy', templateId: 'tpl_easy_run', templateName: 'Rustige duurloop', fromDate: THU, toDate: TUE }], reason: '', resolved: true };
    const base = { sessions: before, templateById, logs: [], today: MON, restTitle: 'Rustdag' };
    expect(restDayFollowAfterMove(move, base)?.changes[0]).toMatchObject({ sessionId: 'rest', fromDate: TUE, toDate: THU });
    expect(restDayFollowAfterMove({ ...move, changes: [{ ...move.changes[0], toDate: THU }] }, base)).toBeUndefined();
    expect(restDayFollowAfterMove({ ...move, changes: [{ ...move.changes[0], restore: true }] }, base)).toBeUndefined();
    expect(restDayFollowAfterMove({ ...move, swap: true }, base)).toBeUndefined();
    // Het voorstel zelf geeft geen nieuw voorstel: een rustdag die verhuist volgt niets.
    const follow = restDayFollowAfterMove(move, base)!;
    const after = before.map((s) => (s.id === 'easy' ? { ...s, scheduledDate: TUE } : s));
    expect(restDayFollowAfterMove(follow, { ...base, sessions: after })).toBeUndefined();
  });
});
