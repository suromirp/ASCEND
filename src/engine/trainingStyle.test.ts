import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate, SetLog } from '../models/training';
import { addDays } from '../utils/dates';
import { baseSlotsFor, forgeSlotsFor } from './forgeSlots';
import { muscleVolumeForWeek } from './muscleVolume';
import { planPass, type PlanPassContext } from './planPass';
import { isLegHeavyTemplate } from './scheduler';
import { stepProposals, withStepAccepted } from './skillStepProposal';
import { normalizeStepSwaps, stepSwapAt, type StepSwaps } from './stepSwaps';
import { normalizeStrengthSettings } from './strengthSettings';
import {
  calisthenicsTrainings,
  styleChange,
  styleChangeText,
  styleSlots,
  stylesOffered,
  styleTrainings,
  trainingStyleOf,
  withStyleAccepted,
  withStyleUndone,
  type StyleChange,
  type TrainingStyle,
} from './trainingStyle';
import { mondayOfWeek } from '../utils/dates';

// Nagemaakte logs: alleen wat de engine leest.
let n = 0;
function log(date: string, sets: Record<string, SetLog[]>): SessionLog {
  n += 1;
  return {
    id: `log_${n}`,
    templateId: 'tpl_test',
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T10:00:00.000Z`,
    variant: 'full',
    durationMinutes: 40,
    source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: exerciseId, sets: s })),
  };
}
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id)!;
const UPPER_A = byId('tpl_upper_a');
const UPPER_B = byId('tpl_upper_b');
const LOWER_A = byId('tpl_lower_a');
const BODYWEIGHT = byId('tpl_bodyweight');
const TODAY = '2026-11-20';

type Model = { stepSwaps?: StepSwaps };

function change(template: SessionTemplate, style: TrainingStyle, model: Model | undefined = {}, logs: SessionLog[] = [], today = TODAY): StyleChange | null {
  return styleChange({ template, slots: baseSlotsFor(template, model, today), model, style, logs, today });
}
function accept(template: SessionTemplate, style: TrainingStyle, model: Model = {}, logs: SessionLog[] = []): Model {
  const c = change(template, style, model, logs);
  if (!c) throw new Error('geen voorstel');
  const next = withStyleAccepted(model, c);
  if (!next) throw new Error('past niet');
  return next;
}
const names = (template: SessionTemplate, model: Model | undefined) => forgeSlotsFor(template, model, TODAY).map((s) => s.exerciseName);

describe('welke plekken een ladder kunnen worden', () => {
  it('Bovenlichaam A: bankdrukken, schouderdrukken, lat pulldown en triceps pushdown; roeien, zijheffen en curl niet', () => {
    expect(styleSlots(UPPER_A.exercises!).map((s) => [s.slot, s.ladderId])).toEqual([['ex1', 'push-up'], ['ex3', 'handstand-push-up'], ['ex4', 'pull-up'], ['ex6', 'dip']]);
  });

  it('Bovenlichaam B: twee keer duwen geeft push-up en dip; de dip staat er dan al, dus de triceps blijft', () => {
    expect(styleSlots(UPPER_B.exercises!).map((s) => [s.slot, s.ladderId])).toEqual([['ex14', 'push-up'], ['ex15', 'dip'], ['ex17', 'pull-up']]);
  });

  it('een beentraining en Eigen gewicht krijgen geen keuze: calisthenics vervangt de beendag niet, en Push-Up staat al op een ladder', () => {
    expect(styleSlots(LOWER_A.exercises!)).toEqual([]);
    expect(stylesOffered(LOWER_A.exercises!)).toEqual([]);
    expect(styleSlots(BODYWEIGHT.exercises!)).toEqual([]);
    expect(change(LOWER_A, 'calisthenics')).toBeNull();
  });

  it('Samen alleen bij minstens twee plekken', () => {
    expect(stylesOffered(UPPER_A.exercises!)).toEqual(['strength', 'calisthenics', 'mixed']);
    const one = { ...UPPER_A, id: 'tpl_een', exercises: [UPPER_A.exercises![0]] } as SessionTemplate;
    expect(stylesOffered(one.exercises!)).toEqual(['strength', 'calisthenics']);
    expect(change(one, 'mixed')).toBeNull();
  });

  it('een plek met een oefening-id als id, of een toegevoegde plek, krijgt geen ladder', () => {
    const t = { ...UPPER_A, id: 'tpl_ids', exercises: [{ id: 'bench-press', exerciseName: 'Bench Press', sets: 3, reps: '6-8', priority: 'core' }, { id: 'plus:lat', exerciseName: 'Lat Pulldown', sets: 3, reps: '8', priority: 'accessory' }] } as SessionTemplate;
    expect(styleSlots(t.exercises!)).toEqual([]);
  });
});

describe('de lijst in de instellingen', () => {
  it('alleen de krachttrainingen in de sportschool met een plek voor een ladder, op naam', () => {
    const list = styleTrainings(templates, undefined, TODAY);
    expect(list.map((t) => [t.template.id, t.style])).toEqual([['tpl_upper_a', 'strength'], ['tpl_upper_b', 'strength']]);
    const model = accept(UPPER_B, 'mixed');
    expect(styleTrainings(templates, model, TODAY).map((t) => t.style)).toEqual(['strength', 'mixed']);
  });
});

describe('zonder keuze is alles zoals het was', () => {
  it('geen stepSwaps: elke training is kracht, Forge plant het sjabloon', () => {
    for (const t of [UPPER_A, UPPER_B, LOWER_A, BODYWEIGHT]) {
      expect(trainingStyleOf(baseSlotsFor(t, undefined, TODAY), undefined, t.id)).toBe('strength');
      expect(forgeSlotsFor(t, undefined, TODAY)).toEqual(t.exercises);
    }
    expect(calisthenicsTrainings(undefined)).toBe(0);
  });

  it('kracht kiezen als het al kracht is, is geen voorstel', () => {
    expect(change(UPPER_A, 'strength')).toBeNull();
  });

  it('een oude back-up zonder het veld, of met alleen een stap uit het stapvoorstel, leest gelijk', () => {
    const old = normalizeStrengthSettings(JSON.parse(JSON.stringify({ enabled: true })));
    expect(old?.stepSwaps).toBeUndefined();
    expect(trainingStyleOf(baseSlotsFor(UPPER_A, old, TODAY), old, UPPER_A.id)).toBe('strength');
    const f4d = normalizeStrengthSettings({ stepSwaps: { tpl_bodyweight: { bw3: { from: 'push-up', to: 'decline-push-up' } } } });
    expect(trainingStyleOf(baseSlotsFor(UPPER_A, f4d, TODAY), f4d, UPPER_A.id)).toBe('strength');
    expect(calisthenicsTrainings(f4d)).toBe(0);
  });
});

describe('het voorstel', () => {
  it('calisthenics zonder training op de ladder: elke plek begint op stap 1', () => {
    const c = change(UPPER_A, 'calisthenics')!;
    expect(c.steps.map((s) => [s.slot, s.swap?.to])).toEqual([['ex1', 'incline-push-up-high'], ['ex3', 'pike-push-up'], ['ex4', 'dead-hang'], ['ex6', 'support-hold']]);
    // Een houding begint op de onderkant; herhalingen houden de sets en herhalingen van het sjabloon.
    expect(c.steps[0].swap).toEqual({ from: 'bench-press', to: 'incline-push-up-high' });
    expect(c.steps[2].swap).toEqual({ from: 'lat-pulldown', to: 'dead-hang', sets: 3, reps: '10s' });
    const text = styleChangeText(c);
    expect(text.lines[0]).toBe('Barbell Bench Press wordt High Incline Push-Up (stap 1 van 7).');
    expect(text.lines).toContain('Een houding begint op 3 keer 10 seconden.');
    expect(text.always).toBe('Eerst een voorstel, pas na Akkoord verandert er iets.');
    expect(text.done).toBe('Bovenlichaam A is nu calisthenics. Je ziet het de volgende keer dat je deze training opent.');
  });

  it('met logs: de stap waar je staat, uit dezelfde regels als Forge', () => {
    const logs = [log(addDays(TODAY, -3), { 'push-up': reps(6, 6, 5), 'pull-up': reps(5, 5, 5) })];
    const c = change(UPPER_B, 'calisthenics', {}, logs)!;
    expect(c.steps.map((s) => s.swap?.to)).toEqual(['push-up', 'support-hold', 'pull-up']);
  });

  it('de dag zelf: een training van vandaag telt (hij is gedaan), een log van morgen niet', () => {
    const today = [log(TODAY, { 'push-up': reps(6, 6, 6) })];
    expect(change(UPPER_A, 'calisthenics', {}, today)!.steps[0].swap?.to).toBe('push-up');
    const tomorrow = [log(addDays(TODAY, 1), { 'push-up': reps(6, 6, 6) })];
    expect(change(UPPER_A, 'calisthenics', {}, tomorrow)!.steps[0].swap?.to).toBe('incline-push-up-high');
  });

  it('samen: de eerste helft blijft met gewicht, de rest gaat op een ladder', () => {
    const c = change(UPPER_A, 'mixed')!;
    expect(c.steps.map((s) => s.slot)).toEqual(['ex4', 'ex6']);
    const model = withStyleAccepted({}, c)!;
    expect(names(UPPER_A, model)).toEqual(['Barbell Bench Press', 'Bent-Over Underhand Grip Barbell Row', 'Barbell Overhead Press', 'Dead Hang', 'Standing Dumbbell Lateral Raise', 'Parallel Bar Support Hold', 'Dumbbell Preacher Curl']);
    expect(trainingStyleOf(baseSlotsFor(UPPER_A, model, TODAY), model, UPPER_A.id)).toBe('mixed');
    // Bovenlichaam B heeft drie plekken: twee blijven met gewicht.
    expect(change(UPPER_B, 'mixed')!.steps.map((s) => s.slot)).toEqual(['ex17']);
  });

  it('van calisthenics naar samen of kracht: alleen wat verandert, een stap die je al zette blijft', () => {
    let model = accept(UPPER_A, 'calisthenics');
    expect(trainingStyleOf(baseSlotsFor(UPPER_A, model, TODAY), model, UPPER_A.id)).toBe('calisthenics');
    // Het stapvoorstel zette het optrekken intussen een stap hoger; die plek valt in de tweede helft en blijft.
    model = { stepSwaps: { ...model.stepSwaps, tpl_upper_a: { ...model.stepSwaps!.tpl_upper_a, ex4: { from: 'lat-pulldown', to: 'scapular-pull-up', sets: 3, reps: '5' } } } };
    const toMixed = change(UPPER_A, 'mixed', model)!;
    expect(toMixed.steps.map((s) => [s.slot, s.swap])).toEqual([['ex1', undefined], ['ex3', undefined]]);
    expect(styleChangeText(toMixed).lines[0]).toBe('High Incline Push-Up wordt weer Barbell Bench Press.');
    model = withStyleAccepted(model, toMixed)!;
    expect(stepSwapAt(model, 'tpl_upper_a', 'ex4')?.to).toBe('scapular-pull-up');
    const back = change(UPPER_A, 'strength', model)!;
    model = withStyleAccepted(model, back)!;
    expect(model.stepSwaps).toBeUndefined();
    expect(names(UPPER_A, model)).toEqual(UPPER_A.exercises!.map((e) => e.exerciseName));
  });

  it('een stap uit het stapvoorstel op een andere training blijft staan', () => {
    const bw = { stepSwaps: { tpl_bodyweight: { bw3: { from: 'push-up', to: 'decline-push-up' } } } };
    const model = accept(UPPER_A, 'calisthenics', bw);
    expect(stepSwapAt(model, 'tpl_bodyweight', 'bw3')?.to).toBe('decline-push-up');
    const back = withStyleAccepted(model, change(UPPER_A, 'strength', model)!)!;
    expect(back.stepSwaps).toEqual(bw.stepSwaps);
    expect(calisthenicsTrainings(model)).toBe(1);
    expect(calisthenicsTrainings(back)).toBe(0);
  });

  it('daarna neemt het stapvoorstel het over: de toets op stap 1 gehaald geeft stap 2 in deze training', () => {
    const model = accept(UPPER_A, 'calisthenics');
    const logs = [log(addDays(TODAY, -1), { 'incline-push-up-high': reps(8, 8, 8) })];
    const [p] = stepProposals({ on: true, logs, today: TODAY, templates, exercisesOf: (t) => forgeSlotsFor(t, model, TODAY) });
    expect(p).toMatchObject({ ladderId: 'push-up', toExerciseId: 'knee-push-up', targets: [{ templateId: 'tpl_upper_a', slot: 'ex1' }] });
    const next = withStepAccepted(model, p);
    expect(stepSwapAt(next, 'tpl_upper_a', 'ex1')).toEqual({ from: 'bench-press', to: 'knee-push-up' });
    expect(trainingStyleOf(baseSlotsFor(UPPER_A, next, TODAY), next, UPPER_A.id)).toBe('calisthenics');
  });
});

describe('alles of niets, met Ongedaan maken', () => {
  it('Akkoord schrijft alle plekken in één keer en laat het oude model ongemoeid', () => {
    const before: Model = {};
    const frozen = JSON.stringify(before);
    const c = change(UPPER_A, 'calisthenics', before)!;
    const next = withStyleAccepted(before, c)!;
    expect(JSON.stringify(before)).toBe(frozen);
    expect(Object.keys(next.stepSwaps!.tpl_upper_a)).toEqual(['ex1', 'ex3', 'ex4', 'ex6']);
  });

  it('past een plek niet (het maximum van 20 trainingen), dan verandert er niets', () => {
    const full: StepSwaps = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`tpl_vol_${i}`, { s1: { from: 'push-up', to: 'decline-push-up' } }]));
    const model = { stepSwaps: full };
    const c = change(UPPER_A, 'calisthenics', model)!;
    expect(withStyleAccepted(model, c)).toBeNull();
    expect(model.stepSwaps).toBe(full);
  });

  it('Ongedaan maken zet precies terug wat er stond, ook na een stap op een andere training ertussen', () => {
    const before: Model = { stepSwaps: { tpl_upper_a: { ex4: { from: 'lat-pulldown', to: 'scapular-pull-up' } } } };
    const c = change(UPPER_A, 'calisthenics', before)!;
    // De plek die al op de ladder stond, blijft; alleen de andere drie komen erbij.
    expect(c.steps.map((s) => s.slot)).toEqual(['ex1', 'ex3', 'ex6']);
    let model = withStyleAccepted(before, c)!;
    model = { stepSwaps: { ...model.stepSwaps, tpl_bodyweight: { bw3: { from: 'push-up', to: 'decline-push-up' } } } };
    const undone = withStyleUndone(model, c, before);
    expect(normalizeStepSwaps(undone.stepSwaps)).toEqual({ ...before.stepSwaps, tpl_bodyweight: { bw3: { from: 'push-up', to: 'decline-push-up' } } });
    expect(styleChangeText(c).undone).toBe('Bovenlichaam A staat weer zoals het was.');
  });

  it('een back-up met de keuze gaat heen en terug zonder verlies', () => {
    const model = accept(UPPER_B, 'mixed', accept(UPPER_A, 'calisthenics'));
    const read = normalizeStrengthSettings(JSON.parse(JSON.stringify(model)));
    expect(read?.stepSwaps).toEqual(model.stepSwaps);
    expect(trainingStyleOf(baseSlotsFor(UPPER_B, read, TODAY), read, UPPER_B.id)).toBe('mixed');
    expect(calisthenicsTrainings(read)).toBe(2);
  });
});

describe('de planner leest calisthenics goed', () => {
  it('belasting en beendag komen uit het sjabloon: calisthenics maakt van bovenlichaam geen beendag', () => {
    expect(isLegHeavyTemplate(UPPER_A)).toBe(false);
    expect(UPPER_A.baseStressProfile?.lowerBodyLoad).toBe('none');
    expect(UPPER_A.baseStressProfile?.upperBodyLoad).toBe('heavy');
  });

  it('spiergroepen: sets op een ladder tellen voor borst, rug en schouders, houdingen ook, benen niet', () => {
    const day = addDays(TODAY, -2);
    const logs = [log(day, {
      'incline-push-up-high': reps(8, 8, 8),
      'dead-hang': [{ reps: 1, seconds: 20 }, { reps: 1, seconds: 20 }, { reps: 1, seconds: 15 }],
      'pike-push-up': reps(6, 6, 6),
      'support-hold': [{ reps: 1, seconds: 15, band: 'licht' }],
    })];
    const v = muscleVolumeForWeek(logs, mondayOfWeek(day));
    expect(v.sets.chest).toBeGreaterThanOrEqual(3);
    expect(v.sets.forearms).toBeGreaterThanOrEqual(3);
    expect(v.sets.front_delts).toBeGreaterThanOrEqual(3);
    expect(v.sets.triceps).toBeGreaterThan(0);
    expect(v.sets.quadriceps).toBe(0);
    expect(v.sets.glutes).toBe(0);
    expect(v.unknownSets).toBe(0);
  });

  describe('in een week met vakantie of tocht', () => {
    const monday = '2026-11-16';
    const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_bodyweight', 'tpl_upper_b', 'tpl_long_run'];
    const sessions: PlannedSession[] = DAYS.map((templateId, i) => ({ id: `s${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }) as PlannedSession);
    let k = 0;
    const ctx = (kind: 'trek' | 'no_training' | 'no_gym'): PlanPassContext => ({ today: monday, logs: [], templates, program: null, blocks: [], restDay: 3, goalDay: '2027-08-01', newId: () => `n${++k}`, leave: [{ id: 'l', kind, startDate: addDays(monday, 1), endDate: addDays(monday, 2) }] }) as unknown as PlanPassContext;

    it('de keuze raakt geen sjabloon en geen geplande sessie; de planningsronde geeft twee keer hetzelfde', () => {
      const frozen = JSON.stringify(templates);
      const model = accept(UPPER_B, 'calisthenics', accept(UPPER_A, 'mixed'));
      expect(JSON.stringify(templates)).toBe(frozen);
      expect(Object.keys(model.stepSwaps!).sort()).toEqual(['tpl_upper_a', 'tpl_upper_b']);
      for (const kind of ['trek', 'no_training', 'no_gym'] as const) {
        const first = planPass(sessions, ctx(kind));
        const second = planPass(first.sessions, ctx(kind));
        expect(JSON.stringify(second.sessions)).toBe(JSON.stringify(first.sessions));
      }
    });

    it('Eigen gewicht in een week zonder sportschool houdt zijn eigen stap', () => {
      const bw = { stepSwaps: { tpl_bodyweight: { bw3: { from: 'push-up', to: 'knee-push-up' } } } };
      const model = accept(UPPER_A, 'calisthenics', bw);
      expect(forgeSlotsFor(BODYWEIGHT, model, TODAY)[2].exerciseName).toBe(forgeSlotsFor(BODYWEIGHT, bw, TODAY)[2].exerciseName);
    });
  });
});
