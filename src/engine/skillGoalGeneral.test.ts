import { describe, expect, it } from 'vitest';
import { skillLadderById } from '../data/skillLadders';
import type { SessionLog, SetLog } from '../models/training';
import type { SkillGoal, SkillGoalStore } from '../models/skillGoals';
import {
  GENERAL_GOAL_NAME, GENERAL_LADDER_ID, GENERAL_LADDER_IDS, buildGeneralGoal, generalBaseline, isGeneralGoal, liveGeneralGoal,
  liveSkillGoals, mergeSkillStores, newSkillStepProgress, takenSkillSteps,
} from './skillGoal';
import { generalReadinessFor, skillReadinessFor } from './goalReadinessFor';

// Nagemaakte logs: alleen wat de engine leest.
let n = 0;
function log(date: string, sets: Record<string, SetLog[]>): SessionLog {
  n += 1;
  return {
    id: `log_g${n}`, templateId: 'tpl_test', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: exerciseId, sets: s })),
  };
}
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));
const secs = (...s: number[]): SetLog[] => s.map((x) => ({ reps: 1, seconds: x }));
const pull = skillLadderById('pull-up')!;
const push = skillLadderById('push-up')!;
const START = '2026-11-09';
const NOW = '2026-11-09T08:00:00.000Z';

const general = (baseline: Record<string, number> = {}, over: Partial<SkillGoal> = {}): SkillGoal => ({
  id: 'algemeen_1', name: GENERAL_GOAL_NAME, ladderId: GENERAL_LADDER_ID, targetStep: 1, createdAt: NOW, updatedAt: NOW,
  general: { ladderIds: [...GENERAL_LADDER_IDS], startDate: START, baseline: { 'push-up': 0, 'pull-up': 0, dip: 0, pistol: 0, 'l-sit': 0, ...baseline } },
  ...over,
});
const skill = (over: Partial<SkillGoal> = {}): SkillGoal => ({ id: 'skill_1', name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4, createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', ...over });
let ids = 0;
const newId = () => `progress_${++ids}`;

describe('het algemene doel maken', () => {
  it('vijf basisladders, de stap van nu als baseline en 0 zonder training', () => {
    expect(GENERAL_LADDER_IDS).toEqual(['push-up', 'pull-up', 'dip', 'pistol', 'l-sit']);
    const g = buildGeneralGoal({ id: 'a', now: NOW, today: START, logs: [log('2026-11-02', { 'push-up': reps(6, 6, 6) })] });
    expect(g).toEqual({
      id: 'a', name: 'Algemeen sterk met eigen gewicht', ladderId: 'algemeen', targetStep: 1, createdAt: NOW, updatedAt: NOW,
      general: { ladderIds: ['push-up', 'pull-up', 'dip', 'pistol', 'l-sit'], startDate: START, baseline: { 'push-up': 4, 'pull-up': 0, dip: 0, pistol: 0, 'l-sit': 0 } },
    });
    expect(isGeneralGoal(g)).toBe(true);
  });

  it('isGeneralGoal: alleen met een geldige vorm', () => {
    expect(isGeneralGoal(skill())).toBe(false);
    expect(isGeneralGoal({ ...general(), general: { ladderIds: [], startDate: START, baseline: {} } })).toBe(false);
    expect(isGeneralGoal({ ...general(), general: { ladderIds: ['push-up'], startDate: 'gisteren', baseline: {} } })).toBe(false);
    expect(isGeneralGoal({ ...general(), general: 'rommel' as unknown as SkillGoal['general'] })).toBe(false);
  });
});

describe('generalBaseline: waartegen "hoger" telt', () => {
  it('een bewaarde stap van minstens 1 blijft die stap, ook met latere training', () => {
    const logs = [log('2026-11-12', { 'decline-push-up': reps(6, 6, 6) })];
    expect(generalBaseline(general({ 'push-up': 4 }), push, logs, '2026-11-20')).toBe(4);
  });

  it('bij 0: de stap van de eerste training daarna, zodat een eerste Pull-Up niet meteen hoger is', () => {
    const logs = [log('2026-11-12', { 'pull-up': reps(6, 6, 6) }), log('2026-11-16', { 'weighted-pull-up': reps(6, 6, 6).map((s) => ({ ...s, weightKg: 2.5 })) })];
    expect(generalBaseline(general(), pull, logs, '2026-11-20')).toBe(4);
    const r = generalReadinessFor(general(), logs.slice(0, 1), '2026-11-20')!;
    expect(r.rows.find((x) => x.ladderId === 'pull-up')).toMatchObject({ current: 4, higher: false });
    const later = generalReadinessFor(general(), logs, '2026-11-20')!;
    expect(later.rows.find((x) => x.ladderId === 'pull-up')).toMatchObject({ current: 5, higher: true });
  });

  it('bij 0 met logs van voor de start die later binnenkomen: de stap op de startdag, niet de eerste dag ooit', () => {
    // Nagemaakt: twee oude logs komen na Akkoord binnen (een import). Op de startdag stond je al op stap 4.
    const logs = [log('2026-10-20', { 'scapular-pull-up': reps(6, 6, 6) }), log('2026-11-02', { 'pull-up': reps(6, 6, 6) })];
    expect(generalBaseline(general(), pull, logs, '2026-11-20')).toBe(4);
    expect(generalReadinessFor(general(), logs, '2026-11-20')!.rows.find((x) => x.ladderId === 'pull-up')).toMatchObject({ current: 4, higher: false });
  });

  it('zonder training: geen baseline', () => {
    expect(generalBaseline(general(), pull, [], '2026-11-20')).toBeUndefined();
    const g = general();
    delete (g.general!.baseline as Record<string, number>)['pull-up'];
    expect(generalBaseline(g, pull, [], '2026-11-20')).toBeUndefined();
  });

  // Alleen de dagtekst `today` telt, dus een geval rond 00:00 is hier niet nodig (dat test skillGoal.midnight.test.ts voor de dag).
  it('de dag zelf: een training van vandaag telt voor de stap en voor hoger, een log van morgen niet', () => {
    const today = '2026-11-20';
    const todays = generalReadinessFor(general({ 'push-up': 4 }), [log(today, { 'decline-push-up': reps(6, 6, 6) })], today)!;
    expect(todays.rows[0]).toMatchObject({ ladderId: 'push-up', current: 5, higher: true });
    const tomorrow = generalReadinessFor(general({ 'push-up': 4 }), [log('2026-11-21', { 'decline-push-up': reps(6, 6, 6) })], today)!;
    expect(tomorrow.rows[0]).toMatchObject({ current: null, higher: false });
    expect(generalBaseline(general(), push, [log('2026-11-21', { 'push-up': reps(6, 6, 6) })], today)).toBeUndefined();
  });
});

describe('generalReadinessFor: per ladder het werk en één regel', () => {
  const TODAY = '2026-11-20';

  it('zonder training: begin bij de stap uit je plan, of stap 1', () => {
    const r = generalReadinessFor(general(), [], TODAY, new Map([['push-up', 4]]))!;
    expect(r.rows.map((x) => x.ladderId)).toEqual(['push-up', 'pull-up', 'dip', 'pistol', 'l-sit']);
    expect(r.rows[0]).toMatchObject({ ladderName: 'Push-up', current: null, inPlan: true, higher: false, work: 'Begin bij Push-Up.', line: 'Nog geen training gelogd.' });
    expect(r.rows[1]).toMatchObject({ inPlan: false, work: 'Begin bij Dead Hang.', line: 'Staat nog niet in je trainingen.' });
    expect(r.rows[3].work).toBe('Begin bij Assisted Pistol Squat.');
    expect(r.line).toBe('Nog geen training op deze ladders.');
    expect(r).toMatchObject({ goalId: 'algemeen_1', startDate: START, higher: 0 });
    expect(r).not.toHaveProperty('percent');
    expect(generalReadinessFor(general(), [], TODAY)!.rows[0].line).toBe('Staat nog niet in je trainingen.');
  });

  it('met training: de stap en de toets', () => {
    const r = generalReadinessFor(general({ 'push-up': 4 }), [log('2026-11-12', { 'push-up': reps(6, 6, 6) })], TODAY)!;
    expect(r.rows[0]).toMatchObject({ current: 4, higher: false, work: 'Stap 4: Push-Up.', line: 'Toets: 3 keer 8.' });
    expect(r.line).toBe('Nog geen ladder een stap hoger dan op 9 nov.');
    const hold = generalReadinessFor(general(), [log('2026-11-12', { 'tuck-l-sit': secs(20, 20, 20) })], TODAY)!;
    expect(hold.rows[4]).toMatchObject({ work: 'Stap 1: Tuck L-Sit.', line: 'Toets: 3 keer 30 seconden.' });
  });

  it('toets gehaald: de volgende stap; op de hoogste stap: dat', () => {
    const r = generalReadinessFor(general(), [log('2026-11-12', { 'push-up': reps(8, 8, 8), 'l-sit': secs(30, 30, 30) })], TODAY)!;
    expect(r.rows[0].line).toBe('Toets gehaald. Volgende stap: Decline Push-Up.');
    expect(r.rows[4]).toMatchObject({ work: 'Stap 3: L-Sit.', line: 'Toets gehaald op de hoogste stap.' });
  });

  it('drie trainingen onder de onderkant: de lichtere stap, en onder de baseline telt de ladder niet als hoger', () => {
    const miss = { 'incline-push-up': reps(6, 6, 6), 'push-up': reps(3, 3, 3) };
    const logs = [log('2026-11-12', miss), log('2026-11-14', miss), log('2026-11-16', miss)];
    const g = general({ 'push-up': 4 });
    const before = JSON.stringify(g);
    const r = generalReadinessFor(g, logs, TODAY)!;
    expect(r.rows[0]).toMatchObject({ current: 3, higher: false, line: 'Drie trainingen onder de onderkant. Lichtere stap: Incline Push-Up.' });
    expect(JSON.stringify(g)).toBe(before);
  });

  it('de ene zin: één ladder of meer een stap hoger dan bij de start', () => {
    const one = generalReadinessFor(general({ 'push-up': 3 }), [log('2026-11-12', { 'push-up': reps(6, 6, 6) })], TODAY)!;
    expect(one.higher).toBe(1);
    expect(one.line).toBe('Eén ladder een stap hoger dan op 9 nov.');
    const logs = [log('2026-11-12', { 'push-up': reps(6, 6, 6), 'dead-hang': secs(20, 20, 20), 'support-hold': secs(20, 20, 20) }), log('2026-11-18', { 'scapular-pull-up': reps(6, 6, 6), 'negative-dip': reps(6, 6, 6) })];
    const three = generalReadinessFor(general({ 'push-up': 3 }), logs, TODAY)!;
    expect(three.rows.filter((x) => x.higher).map((x) => x.ladderId)).toEqual(['push-up', 'pull-up', 'dip']);
    expect(three.line).toBe('3 ladders een stap hoger dan op 9 nov.');
  });

  it('een ladder die deze versie niet kent wordt overgeslagen, niet uit het doel gehaald', () => {
    const g = general({}, {});
    g.general!.ladderIds = ['planche', 'push-up', 'push-up'];
    const r = generalReadinessFor(g, [], TODAY)!;
    expect(r.rows.map((x) => x.ladderId)).toEqual(['push-up']);
    expect(g.general!.ladderIds).toEqual(['planche', 'push-up', 'push-up']);
    g.general!.ladderIds = ['planche'];
    expect(generalReadinessFor(g, [], TODAY)).toBeUndefined();
    expect(generalReadinessFor(skill(), [], TODAY)).toBeUndefined();
    expect(generalReadinessFor({ ...general(), general: { ladderIds: ['push-up'], startDate: 'x', baseline: {} } }, [], TODAY)).toBeUndefined();
  });
});

describe('een vaardigheid naast een algemeen doel blijft precies zoals hij was', () => {
  const logs = [log('2026-11-02', { 'negative-chin-up': reps(5, 5, 5), 'push-up': reps(8, 8, 8) })];
  const TODAY = '2026-11-09';

  it('liveSkillGoals, takenSkillSteps, newSkillStepProgress en skillReadinessFor negeren het algemene doel', () => {
    const alone: SkillGoalStore = { goals: [skill()], progress: [] };
    const both: SkillGoalStore = { goals: [general(), skill()], progress: [] };
    expect(liveSkillGoals(both)).toEqual(liveSkillGoals(alone));
    expect(takenSkillSteps(both)).toEqual(takenSkillSteps(alone));
    ids = 0;
    const a = newSkillStepProgress(alone, logs, TODAY, newId);
    ids = 0;
    const b = newSkillStepProgress(both, logs, TODAY, newId);
    expect(b).toEqual(a);
    expect(newSkillStepProgress({ goals: [general()], progress: [] }, logs, TODAY, newId)).toEqual([]);
    expect(skillReadinessFor(general(), logs, TODAY, [])).toBeUndefined();
    expect(skillReadinessFor(skill(), logs, TODAY, [])).toEqual(skillReadinessFor(skill(), logs, TODAY, []));
  });

  it('ook als een algemeen doel ooit een bestaande ladder als ladderId had', () => {
    // Zonder deze uitsluiting zou newSkillStepProgress rijen `goalId|stap` schrijven die tussen ladders botsen.
    const odd = general({}, { ladderId: 'pull-up', targetStep: 4 });
    expect(liveSkillGoals({ goals: [odd], progress: [] })).toEqual([]);
    expect(newSkillStepProgress({ goals: [odd], progress: [] }, logs, TODAY, newId)).toEqual([]);
    expect(takenSkillSteps({ goals: [odd], progress: [] }).size).toBe(0);
    expect(skillReadinessFor(odd, logs, TODAY, [])).toBeUndefined();
  });
});

describe('liveGeneralGoal', () => {
  it('het oudste levende algemene doel; een weggehaald doel of een vaardigheid telt niet', () => {
    expect(liveGeneralGoal({ goals: [skill()], progress: [] })).toBeUndefined();
    const old = general({}, { id: 'b', createdAt: '2026-11-01T08:00:00.000Z' });
    const sameTime = general({}, { id: 'a', createdAt: '2026-11-01T08:00:00.000Z' });
    const removed = general({}, { id: '0', createdAt: '2026-10-01T08:00:00.000Z', removedAt: '2026-10-02T08:00:00.000Z' });
    expect(liveGeneralGoal({ goals: [general(), old, removed, skill()], progress: [] })?.id).toBe('b');
    expect(liveGeneralGoal({ goals: [old, sameTime], progress: [] })?.id).toBe('a');
    expect(liveGeneralGoal({ goals: [removed], progress: [] })).toBeUndefined();
  });
});

describe('mergeSkillStores met een algemeen doel', () => {
  it('per id: bij Vervangen het bestand, bij Samenvoegen het toestel; andere doelen blijven', () => {
    const own = general({ 'push-up': 2 });
    const file = general({ 'push-up': 5 });
    const current: SkillGoalStore = { goals: [own, skill()], progress: [] };
    const incoming: SkillGoalStore = { goals: [file, general({}, { id: 'algemeen_2' })], progress: [] };
    const replaced = mergeSkillStores(current, incoming, true);
    expect(replaced.goals.map((g) => g.id)).toEqual(['algemeen_1', 'skill_1', 'algemeen_2']);
    expect(replaced.goals[0].general!.baseline['push-up']).toBe(5);
    const merged = mergeSkillStores(current, incoming, false);
    expect(merged.goals.find((g) => g.id === 'algemeen_1')!.general!.baseline['push-up']).toBe(2);
    expect(merged.goals.map((g) => g.id).sort()).toEqual(['algemeen_1', 'algemeen_2', 'skill_1']);
    // Twee levende algemene doelen na een import: het oudste telt.
    expect(liveGeneralGoal(merged)?.id).toBe('algemeen_1');
  });
});
