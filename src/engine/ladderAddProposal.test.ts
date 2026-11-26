import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog, SessionTemplate, SetLog } from '../models/training';
import { cleanSettings } from '../storage/backupClean';
import { saveWithLimit } from '../components/forge/stepUndo';
import { addDays } from '../utils/dates';
import { addedPrescription, canAddExercise, MAX_ADDED_PER_TEMPLATE, type AddedExercises } from './addedExercises';
import { exerciseById } from '../data/exercises';
import { forgeSlotsFor } from './forgeSlots';
import { generalReadinessFor } from './goalReadinessFor';
import { ladderAddProposals, ladderAddText, ladderInTrainings, withLadderAdded, withLadderAddUndone, type LadderAddProposal } from './ladderAddProposal';
import { GENERAL_LADDER_IDS, planStartSteps } from './skillGoal';
import { normalizeStrengthSettings } from './strengthSettings';
import type { SkillGoal } from '../models/skillGoals';

// Nagemaakte trainingen en logs: alleen wat de engine leest.
let n = 0;
function log(date: string, sets: Record<string, SetLog[]>): SessionLog {
  n += 1;
  return {
    id: `log_${n}`, templateId: 'tpl_test', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: exerciseId, sets: s })),
  };
}
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));

function tpl(id: string, name: string, exercises: [string, string][], type: SessionTemplate['type'] = 'strength'): SessionTemplate {
  return { id, name, type, durationVariants: { full: 40, short: 25 }, exercises: exercises.map(([slot, exerciseName]) => ({ id: slot, exerciseName, sets: 3, reps: '8-10', priority: 'core' as const })) } as SessionTemplate;
}

const TODAY = '2026-11-26';
const LEGS = tpl('tpl_legs', 'Kracht benen', [['l1', 'Barbell Back Squat'], ['l2', 'Barbell Romanian Deadlift']]);
const UPPER = tpl('tpl_up', 'Kracht boven', [['u1', 'Barbell Bench Press'], ['u2', 'Pull-Up']]);
const RUN = tpl('tpl_run', 'Duurloop', [['r1', 'Walking Lunge']], 'cardio');
const IDS = (ts: SessionTemplate[]) => ts.map((t) => t.id);
type Model = { addedExercises?: AddedExercises };

function proposals(templates: SessionTemplate[], opts: { logs?: SessionLog[]; model?: Model; declined?: string[]; on?: boolean; today?: string; scheduled?: Set<string> } = {}): LadderAddProposal[] {
  const today = opts.today ?? TODAY;
  return ladderAddProposals({
    on: opts.on ?? true, ladderIds: GENERAL_LADDER_IDS, logs: opts.logs ?? [], today, templates,
    exercisesOf: (t) => forgeSlotsFor(t, opts.model, today),
    canAdd: (id) => canAddExercise(opts.model, id, IDS(templates)),
    declined: opts.declined, scheduled: opts.scheduled,
  });
}

describe('het voorstel per ladder', () => {
  it('alleen de squat op één been en de L-sit, en alleen als de ladder nergens in je trainingen staat', () => {
    const ps = proposals([LEGS, UPPER]);
    expect(ps.map((p) => p.ladderId)).toEqual(['pistol', 'l-sit']);
    // Staat een stap van de ladder in een training (ook een andere stap), dan geen voorstel voor die ladder.
    const withPistol = tpl('tpl_legs', 'Kracht benen', [['l1', 'Barbell Back Squat'], ['l2', 'Skater Squat']]);
    expect(proposals([withPistol, UPPER]).map((p) => p.ladderId)).toEqual(['l-sit']);
    expect(proposals([LEGS, UPPER], { on: false })).toEqual([]);
  });

  it('de squat op één been komt op de beendag, de L-sit in de training met het minste beenwerk', () => {
    const [pistol, lsit] = proposals([UPPER, LEGS, RUN]);
    expect(pistol).toMatchObject({ templateId: 'tpl_legs', exerciseId: 'assisted-pistol-squat', exerciseName: 'Assisted Pistol Squat', sets: 3, reps: '5' });
    expect(lsit).toMatchObject({ templateId: 'tpl_up', exerciseId: 'tuck-l-sit', sets: 3, reps: '10s' });
    // Een looptraining is geen krachttraining, ook niet met beenwerk.
    expect(proposals([UPPER, RUN]).map((p) => p.ladderId)).toEqual(['l-sit']);
  });

  it('de woorden: de vraag en de onderkant in klein, per been bij de squat op één been', () => {
    const [pistol, lsit] = proposals([LEGS, UPPER]);
    expect(ladderAddText(pistol)).toEqual({
      question: 'Zet Assisted Pistol Squat in Kracht benen?',
      dose: 'Sets en herhalingen: 3 keer 5 per been, als laatste oefening.',
      done: 'Assisted Pistol Squat staat in Kracht benen. Je ziet het de volgende keer dat je die training opent.',
      undone: 'Kracht benen is weer zoals hij was.',
    });
    expect(ladderAddText(lsit).dose).toBe('Sets en herhalingen: 3 keer 10 seconden, als laatste oefening.');
    for (const t of [...Object.values(ladderAddText(pistol)), ...Object.values(ladderAddText(lsit))]) expect(t).not.toMatch(/[–—]/);
  });

  it('de startstap is waar de ladder volgens je logs staat (ook via Ruilen), anders de eerste', () => {
    const logs = [log(addDays(TODAY, -3), { 'box-pistol-squat': reps(5, 5, 5) })];
    expect(proposals([LEGS, UPPER], { logs })[0]).toMatchObject({ exerciseId: 'box-pistol-squat', reps: '5' });
  });

  it('de dag zelf: een training van vandaag telt mee voor de startstap, een van morgen niet', () => {
    const todayLog = [log(TODAY, { 'skater-squat': reps(6, 5, 5) })];
    expect(proposals([LEGS, UPPER], { logs: todayLog })[0].exerciseId).toBe('skater-squat');
    expect(proposals([LEGS, UPPER], { logs: todayLog, today: addDays(TODAY, -1) })[0].exerciseId).toBe('assisted-pistol-squat');
  });

  it('geen plek: geen voorstel, en de rij blijft "Staat nog niet in je trainingen."', () => {
    const full: Model = { addedExercises: { tpl_legs: ['tibialis-raise', 'glute-bridge', 'bodyweight-calf-raise'], tpl_up: ['face-pull', 'band-pull-apart', 'plank'].filter((id) => !!exerciseById(id)) } };
    expect(full.addedExercises!.tpl_legs).toHaveLength(MAX_ADDED_PER_TEMPLATE);
    // Benen vol: geen squat op één been, ook al heeft een andere training plek (die heeft geen beenwerk).
    expect(proposals([LEGS, UPPER], { model: { addedExercises: { tpl_legs: full.addedExercises!.tpl_legs } } }).map((p) => p.ladderId)).toEqual(['l-sit']);
    const allFull: Model = { addedExercises: { tpl_legs: full.addedExercises!.tpl_legs, tpl_up: ['tibialis-raise', 'glute-bridge', 'bodyweight-calf-raise'] } };
    expect(proposals([LEGS, UPPER], { model: allFull })).toEqual([]);
    const goal = generalGoal();
    const view = generalReadinessFor(goal, [], TODAY, planStartSteps([LEGS, UPPER], allFull, TODAY));
    expect(view?.rows.find((r) => r.ladderId === 'pistol')?.line).toBe('Staat nog niet in je trainingen.');
    expect(view?.rows.find((r) => r.ladderId === 'l-sit')?.line).toBe('Staat nog niet in je trainingen.');
  });

  it('een geplande training gaat voor een training die je niet meer doet', () => {
    const old = tpl('tpl_old', 'Benen oud', [['o1', 'Barbell Back Squat'], ['o2', 'Leg Press'], ['o3', 'Walking Lunge']]);
    expect(proposals([old, LEGS, UPPER])[0].templateId).toBe('tpl_old');
    expect(proposals([old, LEGS, UPPER], { scheduled: new Set(['tpl_legs', 'tpl_up']) })[0].templateId).toBe('tpl_legs');
  });
});

describe('Akkoord, Liever niet en Ongedaan maken', () => {
  it('na Akkoord staat de stap als laatste oefening in die training en verdwijnt het voorstel; de rij zegt Nog geen training gelogd.', () => {
    const [pistol] = proposals([LEGS, UPPER]);
    const after = withLadderAdded<Model>({}, pistol, IDS([LEGS, UPPER]));
    const slots = forgeSlotsFor(LEGS, after, TODAY);
    expect(slots[slots.length - 1]).toMatchObject({ id: 'plus:assisted-pistol-squat', exerciseName: 'Assisted Pistol Squat', sets: 3, reps: '5' });
    expect(ladderInTrainings('pistol', [LEGS, UPPER], (t) => forgeSlotsFor(t, after, TODAY))).toBe(true);
    expect(proposals([LEGS, UPPER], { model: after }).map((p) => p.ladderId)).toEqual(['l-sit']);
    const view = generalReadinessFor(generalGoal(), [], TODAY, planStartSteps([LEGS, UPPER], after, TODAY));
    expect(view?.rows.find((r) => r.ladderId === 'pistol')).toMatchObject({ inPlan: true, line: 'Nog geen training gelogd.' });
  });

  it('Liever niet laat het voorstel voor die ladder niet terugkomen, ook niet op een andere stap of een andere dag', () => {
    expect(proposals([LEGS, UPPER], { declined: ['pistol'] }).map((p) => p.ladderId)).toEqual(['l-sit']);
    const logs = [log(addDays(TODAY, -3), { 'box-pistol-squat': reps(5, 5, 5) })];
    expect(proposals([LEGS, UPPER], { declined: ['pistol'], logs, today: addDays(TODAY, 30) }).map((p) => p.ladderId)).toEqual(['l-sit']);
  });

  it('Ongedaan maken zet precies terug wat er voor Akkoord stond, ook een eerdere toevoeging', () => {
    const before: Model = { addedExercises: { tpl_legs: ['tibialis-raise'], tpl_up: ['glute-bridge'] } };
    const [pistol] = proposals([LEGS, UPPER], { model: before });
    const after = withLadderAdded(before, pistol, IDS([LEGS, UPPER]));
    expect(after.addedExercises?.tpl_legs).toEqual(['tibialis-raise', 'assisted-pistol-squat']);
    expect(withLadderAddUndone(after, pistol, before)).toEqual(before);
    const empty = withLadderAdded<Model>({}, pistol, IDS([LEGS, UPPER]));
    expect(withLadderAddUndone(empty, pistol, {}).addedExercises).toBeUndefined();
  });

  it('alles of niets: het oude model verandert niet, en zonder plek schrijft Akkoord niets', () => {
    const model = Object.freeze({ enabled: true, addedExercises: Object.freeze({ tpl_legs: ['tibialis-raise'] }) }) as Model & { enabled: boolean };
    const [pistol] = proposals([LEGS, UPPER], { model });
    const next = withLadderAdded(model, pistol, IDS([LEGS, UPPER]));
    expect(model.addedExercises).toEqual({ tpl_legs: ['tibialis-raise'] });
    expect(next).toMatchObject({ enabled: true, addedExercises: { tpl_legs: ['tibialis-raise', 'assisted-pistol-squat'] } });
    // Is de training intussen vol, dan blijft alles zoals het was.
    const full = { addedExercises: { tpl_legs: ['tibialis-raise', 'glute-bridge', 'bodyweight-calf-raise'] } };
    expect(withLadderAdded(full, pistol, IDS([LEGS, UPPER]))).toBe(full);
  });

  it('een fout halverwege bij opslaan: één opslag, dus failed en niets half', async () => {
    expect(await saveWithLimit(() => Promise.reject(new Error('stuk')), 50)).toBe('failed');
    expect(await saveWithLimit(() => new Promise(() => undefined), 20)).toBe('failed');
    expect(await saveWithLimit(() => Promise.resolve(), 50)).toBe('done');
  });
});

describe('opslag en planning', () => {
  it('een oude back-up zonder het veld leest zoals voorheen en krijgt het voorstel', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ strengthModel: { enabled: true, mountainMuscles: true } }, skipped);
    expect(skipped.n).toBe(0);
    const model = normalizeStrengthSettings(out?.strengthModel);
    expect(model?.addedExercises).toBeUndefined();
    const [pistol] = proposals([LEGS, UPPER], { model });
    expect(pistol.ladderId).toBe('pistol');
    // En met het veld: een ladderstap blijft bewaard bij het inlezen.
    const back = cleanSettings({ strengthModel: { addedExercises: { tpl_legs: ['assisted-pistol-squat'] } } }, skipped);
    expect(skipped.n).toBe(0);
    expect(back?.strengthModel?.addedExercises).toEqual({ tpl_legs: ['assisted-pistol-squat'] });
  });

  it('een ladderstap begint als toevoeging op de onderkant van de stap; andere toevoegingen blijven zoals ze waren', () => {
    expect(addedPrescription(exerciseById('assisted-pistol-squat')!)).toEqual({ sets: 3, reps: '5' });
    expect(addedPrescription(exerciseById('tuck-l-sit')!)).toEqual({ sets: 3, reps: '10s' });
    expect(addedPrescription(exerciseById('tibialis-raise')!)).toEqual({ sets: 3, reps: '15-20' });
    expect(addedPrescription(exerciseById('glute-bridge')!)).toEqual({ sets: 3, reps: '10-12' });
  });

  it('met het standaardprogramma: Benen A krijgt de squat op één been, Akkoord raakt sjablonen niet', () => {
    const { templates } = buildDefaultProgramData();
    const frozen = JSON.stringify(templates);
    const ps = ladderAddProposals({ on: true, ladderIds: GENERAL_LADDER_IDS, logs: [], today: TODAY, templates, exercisesOf: (t) => forgeSlotsFor(t, {}, TODAY), canAdd: (id) => canAddExercise({}, id, IDS(templates)), scheduled: new Set(['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b', 'tpl_bodyweight']) });
    expect(ps.find((p) => p.ladderId === 'pistol')?.templateId).toBe('tpl_lower_a');
    for (const p of ps) withLadderAdded({}, p, IDS(templates));
    expect(JSON.stringify(templates)).toBe(frozen);
  });
});

function generalGoal(): SkillGoal {
  return { id: 'g1', name: 'Algemeen sterk met eigen gewicht', ladderId: 'algemeen', targetStep: 1, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z`, general: { ladderIds: [...GENERAL_LADDER_IDS], startDate: TODAY, baseline: {} } } as SkillGoal;
}
