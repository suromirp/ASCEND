import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { betterTestDay, illnessHeld, replanSummary, replanWeek, weekDiff } from './replanWeek';
import { planPass } from './planPass';
import { validateWeeks } from './weekValidator';

// Nagemaakte week van maandag 2 november 2026; vandaag is woensdag 4 november.
const { templates, program } = buildDefaultProgramData();
const MON = '2026-11-02';
const TODAY = '2026-11-04';
const d = (i: number) => `2026-11-0${2 + i}`;
const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: MON, status: 'planned', order: 0, ...extra });
const log = (plannedSessionId: string, templateId: string, date: string): SessionLog => ({ id: `log-${plannedSessionId}`, plannedSessionId, templateId, type: 'cardio', completedDate: date, variant: 'full', durationMinutes: 40 } as SessionLog);
const yours = { by: 'user' as const, at: '2026-11-03T08:00:00.000Z' };
const byProposal = { by: 'proposal' as const, proposalId: 'p1', at: '2026-11-03T08:00:00.000Z' };

// Het plan van deze week: maandag benen, dinsdag rustig, woensdag tempo, donderdag bovenlichaam,
// zaterdag heuvels, zondag de lange duurloop.
const fresh = () => [
  s('f1', 'tpl_lower_a', d(0)),
  s('f2', 'tpl_easy_run', d(1)),
  s('f3', 'tpl_tempo_run', d(2)),
  s('f4', 'tpl_upper_a', d(3)),
  s('f5', 'tpl_hill_intervals', d(5)),
  s('f6', 'tpl_long_run', d(6)),
];

// De scheve week: maandag en dinsdag gedaan, het tempo zelf naar donderdag, de lange duurloop zelf naar
// zaterdag en er nog een op zondag, de heuvels door een voorstel overgeslagen.
const messy = () => [
  s('lower', 'tpl_lower_a', d(0)),
  s('easy', 'tpl_easy_run', d(1)),
  s('tempo', 'tpl_tempo_run', d(3), { status: 'moved', movedFromDate: d(2), lock: yours }),
  s('upper', 'tpl_upper_a', d(3)),
  s('hills', 'tpl_hill_intervals', d(5), { status: 'skipped', lock: byProposal }),
  s('long1', 'tpl_long_run', d(5), { status: 'moved', movedFromDate: d(6), lock: yours }),
  s('long2', 'tpl_long_run', d(6), { plannedMinutes: 75, lock: byProposal }),
];
const doneLogs = [log('lower', 'tpl_lower_a', d(0)), log('easy', 'tpl_easy_run', d(1))];
const run = (sessions: PlannedSession[], extra: Partial<Parameters<typeof replanWeek>[0]> = {}) =>
  replanWeek({ sessions, fresh: fresh(), weekStart: MON, today: TODAY, logs: doneLogs, templates, ...extra });
const at = (out: PlannedSession[], date: string) => out.filter((x) => x.scheduledDate === date && x.status !== 'skipped').map((x) => x.templateId).sort();

describe('replanWeek', () => {
  it('een scheve week wordt weer het plan, ook wat je zelf verplaatste', () => {
    const out = run(messy()).sessions;
    expect(at(out, d(2))).toEqual(['tpl_tempo_run']);
    expect(at(out, d(3))).toEqual(['tpl_upper_a']);
    expect(at(out, d(5))).toEqual(['tpl_hill_intervals']);
    expect(at(out, d(6))).toEqual(['tpl_long_run']);
    // Eén lange duurloop: de rij die al op zondag stond, zonder slot en zonder vaste lengte.
    const long = out.filter((x) => x.templateId === 'tpl_long_run');
    expect(long).toHaveLength(1);
    expect(long[0]).toMatchObject({ id: 'long2', status: 'planned' });
    expect(long[0].lock).toBeUndefined();
    expect(long[0].plannedMinutes).toBeUndefined();
    // Het tempo is weer van het plan, op zijn eigen dag.
    const tempo = out.find((x) => x.id === 'tempo')!;
    expect(tempo).toMatchObject({ scheduledDate: d(2), status: 'planned' });
    expect(tempo.lock).toBeUndefined();
    expect(tempo.movedFromDate).toBeUndefined();
  });

  it('een training die een voorstel liet gaan komt terug als hij in het plan hoort', () => {
    const hills = run(messy()).sessions.find((x) => x.id === 'hills')!;
    expect(hills).toMatchObject({ status: 'planned', scheduledDate: d(5) });
    expect(hills.lock).toBeUndefined();
  });

  it('wat je zelf oversloeg blijft overgeslagen', () => {
    const rows = messy().map((x) => (x.id === 'hills' ? { ...x, lock: yours } : x));
    const out = run(rows).sessions;
    expect(out.find((x) => x.id === 'hills')).toEqual(rows.find((x) => x.id === 'hills'));
    expect(at(out, d(5))).toEqual([]);
  });

  it('gelogde en voorbije dagen blijven precies zoals ze waren', () => {
    const rows = [...messy(), s('missed', 'tpl_upper_b', d(1), { status: 'moved', movedFromDate: d(0), lock: yours })];
    const out = run(rows).sessions;
    for (const id of ['lower', 'easy', 'missed']) expect(out.find((x) => x.id === id)).toEqual(rows.find((x) => x.id === id));
    // Een andere week wordt niet aangeraakt.
    const other = s('next', 'tpl_long_run', '2026-11-15', { lock: yours, status: 'moved', movedFromDate: '2026-11-14' });
    expect(run([...rows, other]).sessions.find((x) => x.id === 'next')).toEqual(other);
  });

  it('een gelogde training die van later in de week kwam, neemt zijn plek in het plan in', () => {
    // De heuvels al op dinsdag gedaan: zaterdag komt er geen tweede.
    const rows = [s('lower', 'tpl_lower_a', d(0)), s('hillsDone', 'tpl_hill_intervals', d(1), { status: 'moved', movedFromDate: d(5), lock: yours })];
    const out = run(rows, { logs: [log('lower', 'tpl_lower_a', d(0)), log('hillsDone', 'tpl_hill_intervals', d(1))] }).sessions;
    expect(out.filter((x) => x.templateId === 'tpl_hill_intervals')).toHaveLength(1);
  });

  it('vandaag telt mee als er nog niets gelogd is', () => {
    const out = run([s('lower', 'tpl_lower_a', d(0)), s('easy', 'tpl_easy_run', d(1))]).sessions;
    expect(at(out, TODAY)).toEqual(['tpl_tempo_run']);
    // Gelogd vandaag: dan blijft die rij zoals hij is en komt er geen tweede.
    const done = s('tempoNow', 'tpl_tempo_run', TODAY, { lock: yours });
    const logged = run([s('lower', 'tpl_lower_a', d(0)), done], { logs: [...doneLogs, log('tempoNow', 'tpl_tempo_run', TODAY)] }).sessions;
    expect(logged.filter((x) => x.templateId === 'tpl_tempo_run')).toEqual([done]);
  });

  it('een training die open staat in Forge blijft staan', () => {
    const rows = messy();
    const out = run(rows, { keepIds: new Set(['tempo']) }).sessions;
    expect(out.find((x) => x.id === 'tempo')).toEqual(rows.find((x) => x.id === 'tempo'));
    expect(out.filter((x) => x.templateId === 'tpl_tempo_run')).toHaveLength(1);
  });

  it('een vaste sport blijft op zijn dag', () => {
    const fixed = s('padel', 'sport_padel', d(4), { fixed: { sport: 'padel' as never, day: 5, intensity: 'moderate' }, lock: yours });
    const out = run([...messy(), fixed]).sessions;
    expect(out.find((x) => x.id === 'padel')).toEqual(fixed);
  });

  it('een vakantiedag blijft gelden: wat de vakantie verschoof blijft en neemt zijn plek in', () => {
    const moved = s('upperLeave', 'tpl_upper_a', d(4), { status: 'moved', movedFromDate: d(3), leave: { periodId: 'v1', role: 'moved', from: d(3) } as never });
    const rows = [...messy().filter((x) => x.id !== 'upper'), moved];
    const out = run(rows).sessions;
    expect(out.find((x) => x.id === 'upperLeave')).toEqual(moved);
    expect(out.filter((x) => x.templateId === 'tpl_upper_a' && x.status !== 'skipped')).toHaveLength(1);
  });

  it('een race blijft, een test blijft en neemt de plek van een harde loop in', () => {
    const race = s('race', 'tpl_race', d(6), { lock: byProposal });
    const test = s('test', 'tpl_test_run', d(4), { lock: byProposal });
    const rows = [...messy(), race, test];
    const result = run(rows);
    expect(result.sessions.find((x) => x.id === 'race')).toEqual(race);
    expect(result.sessions.find((x) => x.id === 'test')).toEqual(test);
    expect(result.testIds).toEqual(['test']);
    // De test nam de plek van de dichtstbijzijnde harde loop in (de heuvels van zaterdag): er blijft één harde loop.
    expect(result.sessions.filter((x) => ['tpl_tempo_run', 'tpl_hill_intervals'].includes(x.templateId) && x.status !== 'skipped').map((x) => x.templateId)).toEqual(['tpl_tempo_run']);
  });

  it('ziek: vandaag en morgen blijven zoals ze zijn', () => {
    const held = illnessHeld([{ id: 'z1', kind: 'below_neck', startDate: TODAY }], TODAY, templates);
    const rows = [...messy(), s('tempoSkip', 'tpl_tempo_run', TODAY, { status: 'skipped', lock: byProposal })].filter((x) => x.id !== 'tempo');
    const out = run(rows, { held }).sessions;
    expect(out.find((x) => x.id === 'tempoSkip')).toMatchObject({ status: 'skipped' });
    expect(at(out, TODAY)).toEqual([]);
  });

  it('opbouwen na ziekte: zwaar blijft weg tot het weer mag', () => {
    const held = illnessHeld([{ id: 'z1', kind: 'below_neck', startDate: '2026-10-30', endDate: '2026-11-03' }], TODAY, templates);
    expect(held(TODAY, 'tpl_tempo_run')).toBe(true);
    expect(held(TODAY, 'tpl_recovery_run')).toBe(false);
  });

  it('na de planningsronde staat er geen dubbele lange duurloop en geen beendag binnen 48 uur meer', () => {
    const laid = run(messy()).sessions;
    const ctx = { today: TODAY, logs: doneLogs, templates, program, blocks: [], restDay: 1, newId: (() => { let n = 0; return () => `n${n++}`; })() };
    const settled = planPass(laid, ctx).sessions;
    const findings = validateWeeks({ sessions: settled, logs: doneLogs, templates, today: TODAY, restDay: 1, program }, new Set([MON]));
    expect(findings.filter((f) => f.rule === 'ONE-LONG' || f.rule === 'LEG-SPACING')).toEqual([]);
  });
});

describe('weekDiff', () => {
  it('een nieuwe rij van een training die weggaat houdt het id: een verschuiving', () => {
    const stored = [s('a', 'tpl_easy_run', d(2)), s('b', 'tpl_upper_a', d(3))];
    const after = [s('new1', 'tpl_easy_run', d(4)), s('b', 'tpl_upper_a', d(3))];
    const diff = weekDiff(stored, after, MON);
    expect(diff.writes).toEqual([s('a', 'tpl_easy_run', d(4))]);
    expect(diff.removedIds).toEqual([]);
    expect(diff.addedIds).toEqual([]);
    expect(diff.before).toEqual([stored[0]]);
  });

  it('niets anders: geen verschil', () => {
    const stored = [s('a', 'tpl_easy_run', d(2))];
    expect(weekDiff(stored, stored, MON)).toEqual({ before: [], writes: [], removedIds: [], addedIds: [] });
  });

  it('weg en nieuw', () => {
    const stored = [s('a', 'tpl_easy_run', d(2))];
    const diff = weekDiff(stored, [s('n', 'tpl_upper_a', d(3))], MON);
    expect(diff.removedIds).toEqual(['a']);
    expect(diff.addedIds).toEqual(['n']);
  });
});

describe('betterTestDay', () => {
  it('blijft staan tenzij een andere dag minder problemen geeft', () => {
    expect(betterTestDay('x', ['y', 'z'], (dd) => ({ x: 1, y: 1, z: 2 } as Record<string, number>)[dd])).toBe('x');
    expect(betterTestDay('x', ['y', 'z'], (dd) => ({ x: 2, y: 1, z: 0 } as Record<string, number>)[dd])).toBe('z');
    expect(betterTestDay('x', ['y'], (dd) => ({ x: 0, y: 0 } as Record<string, number>)[dd])).toBe('x');
  });
});

describe('replanSummary', () => {
  it('zegt dat ook wat je zelf verplaatste teruggaat, en niets zonder verschil', () => {
    expect(replanSummary({ changes: 2 })).toContain('Ook wat je zelf verplaatste gaat terug naar het plan.');
    expect(replanSummary({ changes: 0 })).toBeUndefined();
    expect(replanSummary({ changes: 1, caughtUp: ['Bovenlichaam A'] })).toContain('Dat geldt ook voor wat je inhaalde: Bovenlichaam A.');
    expect(replanSummary({ changes: 1, nextWeek: true })).toContain('week erna');
    expect(replanSummary({ changes: 1, testMove: { name: 'Testloop 5 km', toLabel: 'vr 6 nov' } })).toContain('Testloop 5 km blijft in de week en gaat naar vr 6 nov');
  });
});
