import { describe, expect, it } from 'vitest';
import { skillLadderById, type SkillLadder } from '../data/skillLadders';
import type { SessionLog, SetLog } from '../models/training';
import type { SkillGoal, SkillGoalStore, SkillStepProgress } from '../models/skillGoals';
import { buildSkillGoal, clearedSkillSteps, freeTargetStep, takenSkillSteps, defaultTargetStep, liveSkillGoals, mergeSkillStores, newSkillStepProgress, skillStepMilestones } from './skillGoal';
import { skillReadinessFor } from './goalReadinessFor';
import { ladderState } from './skillLadder';

// Nagemaakte logs: alleen wat de engine leest.
let n = 0;
function log(date: string, sets: Record<string, SetLog[]>): SessionLog {
  n += 1;
  return {
    id: `log_${n}`, templateId: 'tpl_test', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: exerciseId, sets: s })),
  };
}
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));
const pull = skillLadderById('pull-up')!;
const push = skillLadderById('push-up')!;
const TODAY = '2026-11-09';

const goal = (over: Partial<SkillGoal> = {}): SkillGoal => ({ id: 'skill_1', name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4, createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', ...over });
let ids = 0;
const newId = () => `progress_${++ids}`;

describe('de mijlpalen van een vaardigheid (skillStep)', () => {
  it('één per ladderstap tot en met de doelstap', () => {
    const m = skillStepMilestones(goal());
    expect(m.map((x) => x.step)).toEqual([1, 2, 3, 4]);
    expect(m.every((x) => x.kind === 'skillStep' && x.ladderId === 'pull-up')).toBe(true);
    expect(m[3].exerciseId).toBe('pull-up');
  });

  it('een onbekende ladder heeft er geen, een doelstap boven de ladder stopt bij de laatste stap', () => {
    expect(skillStepMilestones(goal({ ladderId: 'handstand' }))).toEqual([]);
    expect(skillStepMilestones(goal({ targetStep: 99 }))).toHaveLength(pull.steps.length);
  });
});

describe('gehaalde stappen uit de logs', () => {
  it('de toets op een stap, of de onderkant van een zwaardere stap, haalt de stappen eronder', () => {
    const logs = [log('2026-11-02', { 'negative-chin-up': reps(5, 5, 5) })];
    const cleared = clearedSkillSteps(pull, logs, TODAY);
    expect([...cleared.keys()]).toEqual([1, 2]);
    expect(cleared.get(1)).toBe('2026-11-02');
    const later = [...logs, log('2026-11-05', { 'negative-chin-up': reps(8, 8, 8) })];
    expect(clearedSkillSteps(pull, later, TODAY).get(3)).toBe('2026-11-05');
  });

  it('een log van na vandaag telt niet; een training van vandaag wel (de dag zelf)', () => {
    const logs = [log('2026-11-10', { 'pull-up': reps(8, 8, 8) })];
    expect(clearedSkillSteps(pull, logs, TODAY).size).toBe(0);
    expect(clearedSkillSteps(pull, [log(TODAY, { 'pull-up': reps(8, 8, 8) })], TODAY).get(4)).toBe(TODAY);
  });

  it('rond middernacht: dezelfde training telt pas vanaf zijn eigen dag', () => {
    const logs = [log('2026-11-09', { 'pull-up': reps(8, 8, 8) })];
    // 23:59 op 8 november in Nederland is nog 8 november; 00:00 op 9 november is de nieuwe dag.
    expect(clearedSkillSteps(pull, logs, '2026-11-08').size).toBe(0);
    expect(clearedSkillSteps(pull, logs, '2026-11-09').size).toBe(4);
  });

  it('leest de logs alleen: niets verandert eraan', () => {
    const logs = [log('2026-11-02', { 'pull-up': reps(8, 8, 8) })];
    const before = JSON.stringify(logs);
    clearedSkillSteps(pull, logs, TODAY);
    newSkillStepProgress({ goals: [goal()], progress: [] }, logs, TODAY, newId);
    skillReadinessFor(goal(), logs, TODAY, []);
    expect(JSON.stringify(logs)).toBe(before);
  });
});

describe('newSkillStepProgress: alleen toevoegen', () => {
  it('schrijft een rij per gehaalde stap die er nog geen heeft, met de dag van de training', () => {
    const logs = [log('2026-11-02', { 'negative-chin-up': reps(5, 5, 5) })];
    const rows = newSkillStepProgress({ goals: [goal()], progress: [] }, logs, TODAY, newId);
    expect(rows.map((r) => [r.step, r.clearedDate, r.exerciseId])).toEqual([[1, '2026-11-02', 'dead-hang'], [2, '2026-11-02', 'scapular-pull-up']]);
  });

  it('een stap met een rij krijgt er nooit een tweede, ook niet met een andere dag', () => {
    const kept: SkillStepProgress = { id: 'p_old', goalId: 'skill_1', ladderId: 'pull-up', step: 1, exerciseId: 'dead-hang', clearedDate: '2026-10-01' };
    const logs = [log('2026-11-02', { 'negative-chin-up': reps(5, 5, 5) })];
    const rows = newSkillStepProgress({ goals: [goal()], progress: [kept] }, logs, TODAY, newId);
    expect(rows.map((r) => r.step)).toEqual([2]);
  });

  it('een weggehaald doel of een onbekende ladder krijgt niets', () => {
    const logs = [log('2026-11-02', { 'pull-up': reps(8, 8, 8) })];
    expect(newSkillStepProgress({ goals: [goal({ removedAt: '2026-11-03T00:00:00.000Z' })], progress: [] }, logs, TODAY, newId)).toEqual([]);
    expect(newSkillStepProgress({ goals: [goal({ ladderId: 'muscle-up' })], progress: [] }, logs, TODAY, newId)).toEqual([]);
    expect(liveSkillGoals({ goals: [goal({ ladderId: 'muscle-up' }), goal({ id: 'b' })], progress: [] }).map((g) => g.id)).toEqual(['b']);
  });
});

describe('skillReadinessFor: de trap, het werk en één droge regel', () => {
  it('zonder training: de eerste stap en één regel, geen percentage', () => {
    const r = skillReadinessFor(goal(), [], TODAY, [])!;
    expect(r.steps.map((s) => s.status)).toEqual(['current', 'ahead', 'ahead', 'ahead']);
    expect(r.steps[3].target).toBe(true);
    expect(r.line).toBe('Nog geen training op deze ladder.');
    expect(r.work).toBe('Begin bij Dead Hang. Toets: 3 keer 30 seconden.');
    expect(r).not.toHaveProperty('percent');
  });

  it('halverwege: gehaalde stappen, de stap waar je aan werkt en hoeveel stappen er nog zijn', () => {
    const r = skillReadinessFor(goal(), [log('2026-11-02', { 'scapular-pull-up': reps(6, 6, 6) })], TODAY, [])!;
    expect(r.steps.map((s) => s.status)).toEqual(['cleared', 'current', 'ahead', 'ahead']);
    expect(r.work).toBe('Nu: Scapular Pull-Up. Toets: 3 keer 8.');
    expect(r.line).toBe('Nog 3 stappen tot Pull-Up.');
  });

  it('toets gehaald: zegt de volgende stap, zoals Forge', () => {
    const r = skillReadinessFor(goal(), [log('2026-11-02', { 'scapular-pull-up': reps(8, 8, 8) })], TODAY, [])!;
    expect(r.line).toBe('Toets gehaald. Volgende stap: Negative Chin-Up.');
  });

  it('doelstap gehaald: de dag, en de stap met extra gewicht noemt de kilo', () => {
    const r = skillReadinessFor(goal(), [log('2026-11-02', { 'pull-up': reps(8, 8, 8) })], TODAY, [])!;
    expect(r.reached).toBe(true);
    expect(r.line).toBe('Doelstap gehaald op 2 nov.');
    expect(r.work).toBe('Nu: Pull-Up. Toets: 3 keer 8.');
    const sets = [6, 6, 6].map((r) => ({ reps: r, weightKg: 2.5 }));
    const top = skillReadinessFor(goal({ targetStep: 5 }), [log('2026-11-02', { 'weighted-pull-up': sets })], TODAY, [])!;
    expect(top.line).toBe('Je werkt aan je doelstap.');
    expect(top.work).toBe('Nu: Pull-Up With Added Weight. Toets: 3 keer 8 met 2,5 kg extra.');
  });

  it('een gehaalde stap blijft gehaald als de logs het later anders lezen (andere toets, andere ladder)', () => {
    // Een rij van toen staat er; de logs van nu noemen de stap niet gehaald (bijvoorbeeld omdat de toets strenger werd).
    const kept: SkillStepProgress[] = [1, 2, 3].map((step) => ({ id: `p${step}`, goalId: 'skill_1', ladderId: 'pull-up', step, exerciseId: pull.steps[step - 1].exerciseId, clearedDate: '2026-09-01' }));
    const r = skillReadinessFor(goal(), [], TODAY, kept)!;
    expect(r.steps.map((s) => s.status)).toEqual(['cleared', 'cleared', 'cleared', 'current']);
    expect(r.steps[0].clearedDate).toBe('2026-09-01');
    // Zonder training in de logs zeggen trap en werk hetzelfde: begin bij de eerste open stap.
    expect(r.work).toBe('Begin bij Pull-Up. Toets: 3 keer 8.');
    expect(r.line).toBe('Je werkt aan je doelstap.');
    // Een ladder met een stap minder: wat gehaald is blijft gehaald, de doelstap schuift niet mee.
    const shorter: SkillLadder = { ...pull, steps: pull.steps.filter((s) => s.exerciseId !== 'scapular-pull-up') };
    expect(clearedSkillSteps(shorter, [], TODAY).size).toBe(0);
    expect(skillReadinessFor(goal(), [], TODAY, kept)!.steps.filter((s) => s.status === 'cleared')).toHaveLength(3);
  });

  it('na Stap lichter of een strengere toets: gehaald blijft gehaald op de trap, het werk volgt je laatste training', () => {
    const kept: SkillStepProgress[] = [1, 2, 3].map((step) => ({ id: `p${step}`, goalId: 'skill_1', ladderId: 'pull-up', step, exerciseId: pull.steps[step - 1].exerciseId, clearedDate: '2026-10-01' }));
    // De laatste training staat weer op stap 2.
    const r = skillReadinessFor(goal(), [log('2026-11-05', { 'scapular-pull-up': reps(6, 6, 6) })], TODAY, kept)!;
    expect(r.steps.map((s) => s.status)).toEqual(['cleared', 'cleared', 'cleared', 'current']);
    expect(r.current).toBe(2);
    expect(r.work).toBe('Nu: Scapular Pull-Up. Toets: 3 keer 8.');
    expect(r.line).toBe('Je werkt aan je doelstap.');
  });

  it('een onbekende ladder geeft niets in plaats van een fout', () => {
    expect(skillReadinessFor(goal({ ladderId: 'front-lever' }), [], TODAY, [])).toBeUndefined();
  });
});

describe('een doel maken en de standaard doelstap', () => {
  it('de stap boven je huidige, of de eerste stap zonder training', () => {
    expect(defaultTargetStep(pull, { current: null })).toBe(1);
    const state = ladderState(push, [log('2026-11-02', { 'push-up': reps(6, 6, 6) })], TODAY);
    expect(defaultTargetStep(push, state)).toBe(5);
    expect(defaultTargetStep(push, { current: 7 })).toBe(7);
  });

  it('de naam is die van de stap; een stap of ladder die niet bestaat geeft niets', () => {
    expect(buildSkillGoal({ id: 'g', now: 'x', ladderId: 'pull-up', targetStep: 4 })).toMatchObject({ name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4 });
    expect(buildSkillGoal({ id: 'g', now: 'x', ladderId: 'pull-up', targetStep: 6 })).toBeUndefined();
    expect(buildSkillGoal({ id: 'g', now: 'x', ladderId: 'pull-up', targetStep: 0 })).toBeUndefined();
    expect(buildSkillGoal({ id: 'g', now: 'x', ladderId: 'planche', targetStep: 1 })).toBeUndefined();
  });
});

describe('een tweede doel met dezelfde ladder en doelstap', () => {
  it('de stap is bezet; het blad stelt de eerste vrije stap voor', () => {
    const store: SkillGoalStore = { goals: [goal(), goal({ id: 'weg', targetStep: 5, removedAt: '2026-11-02T00:00:00.000Z' })], progress: [] };
    const taken = takenSkillSteps(store);
    expect([...taken]).toEqual(['pull-up|4']);
    expect(freeTargetStep(pull, 4, taken)).toBe(5);
    expect(freeTargetStep(pull, 3, taken)).toBe(3);
    const full = new Set(pull.steps.map((_, i) => `pull-up|${i + 1}`));
    expect(freeTargetStep(pull, 2, full)).toBeUndefined();
    expect(freeTargetStep(pull, 5, new Set(['pull-up|5']))).toBe(4);
  });
});

describe('mergeSkillStores', () => {
  const row = (id: string, step: number, goalId = 'skill_1'): SkillStepProgress => ({ id, goalId, ladderId: 'pull-up', step, exerciseId: 'x', clearedDate: '2026-11-01' });
  it('gehaalde stappen gaan nooit weg en een stap krijgt geen tweede rij', () => {
    const current: SkillGoalStore = { goals: [goal()], progress: [row('a', 1)] };
    const incoming: SkillGoalStore = { goals: [goal({ name: 'Ander' })], progress: [row('b', 1), row('c', 2)] };
    for (const replace of [true, false]) {
      const merged = mergeSkillStores(current, incoming, replace);
      expect(merged.progress.map((p) => p.id)).toEqual(['a', 'c']);
    }
    expect(mergeSkillStores(current, incoming, true).goals[0].name).toBe('Ander');
    expect(mergeSkillStores(current, incoming, false).goals[0].name).toBe('Pull-Up');
  });
});

describe('een vaardigheid stuurt de planning niet', () => {
  const ENGINE = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], { query: '?raw', import: 'default', eager: true });
  it('alleen skillGoal.ts en goalReadinessFor.ts kennen het model; de planner, mainGoal en goalConflicts niet', () => {
    const users = Object.entries(ENGINE).filter(([, src]) => src.includes('models/skillGoals') || src.includes("from './skillGoal'")).map(([p]) => p).sort();
    expect(users).toEqual(['./goalReadinessFor.ts', './skillGoal.ts']);
  });
});
