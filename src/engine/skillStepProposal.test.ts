import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate, SetLog } from '../models/training';
import { addDays } from '../utils/dates';
import { forgeSlotsFor } from './forgeSlots';
import { planPass, type PlanPassContext } from './planPass';
import { stepProposalId, stepProposals, stepProposalText, withStepAccepted, withStepUndone, type StepProposal } from './skillStepProposal';
import { normalizeStepSwaps, withoutStepSwap, withStepSwaps, type StepSwaps } from './stepSwaps';
import { normalizeStrengthSettings } from './strengthSettings';
import { lockLevel } from './weekValidator';

// Nagemaakte logs en trainingen: alleen wat de engine leest.
let n = 0;
function log(date: string, sets: Record<string, SetLog[]>, time = '10:00'): SessionLog {
  n += 1;
  return {
    id: `log_${n}`,
    templateId: 'tpl_test',
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T${time}:00.000Z`,
    variant: 'full',
    durationMinutes: 40,
    source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: exerciseId, sets: s })),
  };
}
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));

function tpl(id: string, name: string, exercises: [string, string, number, string][], type: SessionTemplate['type'] = 'strength'): SessionTemplate {
  return { id, name, type, durationVariants: { full: 40, short: 25 }, exercises: exercises.map(([slot, exerciseName, sets, r]) => ({ id: slot, exerciseName, sets, reps: r, priority: 'core' as const })) } as SessionTemplate;
}

const TODAY = '2026-11-20';
const YESTERDAY = addDays(TODAY, -1);
const PUSH = tpl('tpl_push', 'Duwen', [['p1', 'Push-Up', 3, '8-12'], ['p2', 'Plank', 3, '45s']]);
const UPPER = tpl('tpl_upper', 'Bovenlijf', [['u1', 'Bench Press', 4, '6-8'], ['u2', 'Push-Up', 2, '10-15']]);
const PULL = tpl('tpl_pull', 'Trekken', [['t1', 'Scapular Pull-Up', 3, '8-10']]);
const PULLUP = tpl('tpl_pullup', 'Optrekken', [['t1', 'Pull-Up', 3, '6-8']]);
const RUN = tpl('tpl_run', 'Duurloop', [['r1', 'Push-Up', 3, '8']], 'cardio');

function proposals(templates: SessionTemplate[], logs: SessionLog[], opts: { today?: string; model?: { stepSwaps?: StepSwaps }; declined?: string[]; on?: boolean } = {}): StepProposal[] {
  const today = opts.today ?? TODAY;
  return stepProposals({ on: opts.on ?? true, logs, today, templates, exercisesOf: (t) => forgeSlotsFor(t, opts.model, today), declined: opts.declined });
}

const passedPushUp = [log(YESTERDAY, { 'push-up': reps(8, 8, 8) })];
const missedPushUp = [log(addDays(TODAY, -7), { 'push-up': reps(3, 3, 2) }), log(addDays(TODAY, -5), { 'push-up': reps(4, 3, 3) }), log(addDays(TODAY, -2), { 'push-up': reps(4, 4, 3) })];

describe('het voorstel per ladder', () => {
  it('toets gehaald: van Push-Up naar de stap erboven, in de training met Push-Up', () => {
    const [p] = proposals([PUSH], passedPushUp);
    expect(p).toMatchObject({ kind: 'harder', ladderId: 'push-up', fromExerciseId: 'push-up', toExerciseId: 'decline-push-up', targets: [{ templateId: 'tpl_push', slot: 'p1' }] });
    expect(p.id).toBe(stepProposalId('push-up', 'push-up', 'decline-push-up'));
    expect(stepProposalText(p)).toEqual({ fact: 'Je toets op Push-Up is gehaald. Volgende stap: Decline Push-Up.', question: 'Zet je plan op Decline Push-Up?', where: 'In Duwen.', keeps: 'Sets en herhalingen blijven.' });
  });

  it('drie voorbije trainingen onder de onderkant: de lichtere stap', () => {
    const [p] = proposals([PUSH], missedPushUp);
    expect(p).toMatchObject({ kind: 'lighter', fromExerciseId: 'push-up', toExerciseId: 'incline-push-up' });
    expect(stepProposalText(p).fact).toBe('Drie trainingen onder de onderkant van Push-Up.');
    expect(stepProposalText(p).question).toBe('Zet je plan op de lichtere stap Incline Push-Up?');
  });

  it('met de instelling uit: niets', () => {
    expect(proposals([PUSH], passedPushUp, { on: false })).toEqual([]);
  });

  it('alleen een krachttraining die de oefening echt bevat; een looptraining met dezelfde naam telt niet', () => {
    expect(proposals([PULL], passedPushUp)).toEqual([]);
    expect(proposals([RUN], passedPushUp)).toEqual([]);
  });

  it('Eigen gewicht (zonder sportschool) is een krachttraining en krijgt het voorstel, herkend aan de soort', () => {
    const { templates } = buildDefaultProgramData();
    const [p] = proposals(templates, passedPushUp);
    expect(p.targets.map((t) => t.templateId)).toEqual(['tpl_bodyweight']);
  });

  it('staat de stap al in de training, dan niet nog eens erbij', () => {
    const both = tpl('tpl_both', 'Beide', [['a', 'Push-Up', 3, '8'], ['b', 'Decline Push-Up', 3, '8']]);
    expect(proposals([both], passedPushUp)).toEqual([]);
    expect(proposals([both, PUSH], passedPushUp)[0].targets.map((t) => t.templateId)).toEqual(['tpl_push']);
  });

  it('een stap zonder volgende stap geeft niets', () => {
    const archer = tpl('tpl_archer', 'Archer', [['a', 'Archer Push-Up', 3, '8']]);
    expect(proposals([archer], [log(YESTERDAY, { 'archer-push-up': reps(8, 8, 8) })])).toEqual([]);
    const weighted = tpl('tpl_w', 'Met gewicht', [['a', 'Pull-Up With Added Weight', 3, '8']]);
    expect(proposals([weighted], [log(YESTERDAY, { 'weighted-pull-up': [{ reps: 8, weightKg: 5 }, { reps: 8, weightKg: 5 }, { reps: 8, weightKg: 5 }] })])).toEqual([]);
  });

  it('een oefening in twee trainingen: beide in hetzelfde voorstel, en Akkoord schrijft ze samen', () => {
    const [p] = proposals([PUSH, UPPER], passedPushUp);
    expect(p.targets.map((t) => `${t.templateId}/${t.slot}`)).toEqual(['tpl_upper/u2', 'tpl_push/p1']);
    expect(stepProposalText(p).where).toBe('In Bovenlijf en Duwen.');
    const model = withStepAccepted<{ stepSwaps?: StepSwaps }>({}, p);
    expect(forgeSlotsFor(PUSH, model, TODAY)[0]).toMatchObject({ id: 'p1', exerciseName: 'Decline Push-Up', sets: 3, reps: '8-12' });
    expect(forgeSlotsFor(UPPER, model, TODAY)[1]).toMatchObject({ id: 'u2', exerciseName: 'Decline Push-Up', sets: 2, reps: '10-15' });
    // Na Akkoord is het voorstel weg: de stap staat erin.
    expect(proposals([PUSH, UPPER], passedPushUp, { model })).toEqual([]);
  });
});

describe('de dag zelf en middernacht', () => {
  it('een training van vandaag is geen misser: twee voorbije missers en een van vandaag geven nog niets', () => {
    const logs = [missedPushUp[1], missedPushUp[2], log(TODAY, { 'push-up': reps(3, 3, 3) })];
    expect(proposals([PUSH], logs)).toEqual([]);
  });

  it('haalt een training van vandaag om 00:05 de onderkant, dan vervalt het lichtere voorstel; de dag ervoor telt hij nog niet', () => {
    const just = log(TODAY, { 'push-up': reps(5, 5, 5) }, '00:05');
    expect(proposals([PUSH], [...missedPushUp, just])).toEqual([]);
    // Om 23:59 de avond ervoor is die training er nog niet: het voorstel staat.
    const before = [log(addDays(TODAY, -8), { 'push-up': reps(3, 3, 2) }), ...missedPushUp.slice(0, 2), log(YESTERDAY, { 'push-up': reps(4, 4, 3) }, '23:59')];
    expect(proposals([PUSH], [...before, just], { today: YESTERDAY })[0]?.kind).toBe('lighter');
  });
});

describe('Liever niet', () => {
  it('komt niet terug voor dezelfde stap, wel voor een andere', () => {
    const declined = [stepProposalId('push-up', 'push-up', 'decline-push-up')];
    expect(proposals([PUSH], passedPushUp, { declined })).toEqual([]);
    // De lichtere stap is een ander voorstel.
    expect(proposals([PUSH], missedPushUp, { declined })[0]?.toExerciseId).toBe('incline-push-up');
  });

  it('niets kiezen of Liever niet schrijft niets: het model blijft gelijk', () => {
    const model = Object.freeze({ stepSwaps: undefined });
    proposals([PUSH], passedPushUp, { model, declined: ['push-up:push-up>decline-push-up'] });
    expect(model).toEqual({ stepSwaps: undefined });
  });
});

describe('band en extra gewicht', () => {
  it('sets met band tellen niet: geen stap omhoog van Pull-Up', () => {
    const band: SetLog[] = [{ reps: 8, band: 'licht' }, { reps: 8, band: 'licht' }, { reps: 8, band: 'licht' }];
    expect(proposals([PULLUP], [log(YESTERDAY, { 'pull-up': band })])).toEqual([]);
  });

  it('zonder band en zonder gewicht: Pull-Up naar de stap met extra gewicht', () => {
    const [p] = proposals([PULLUP], [log(YESTERDAY, { 'pull-up': reps(8, 8, 8) })]);
    expect(p).toMatchObject({ fromExerciseId: 'pull-up', toExerciseId: 'weighted-pull-up', toName: 'Pull-Up With Added Weight' });
  });

  it('Pull-Up met 5 kg telt al voor de stap met gewicht, en die is de bovenste: geen voorstel', () => {
    const heavy: SetLog[] = [{ reps: 8, weightKg: 5 }, { reps: 8, weightKg: 5 }, { reps: 8, weightKg: 5 }];
    expect(proposals([PULLUP], [log(YESTERDAY, { 'pull-up': heavy })])).toEqual([]);
  });
});

describe('een oude back-up', () => {
  it('logs zonder seconds, band en clean: een houding zonder seconden geeft geen voorstel', () => {
    const hang = tpl('tpl_hang', 'Hangen', [['h', 'Dead Hang', 3, '30s']]);
    const old = [log(YESTERDAY, { 'dead-hang': reps(30, 30, 30) })];
    expect(proposals([hang], old)).toEqual([]);
  });

  it('herhalingen zonder de nieuwe velden tellen gewoon', () => {
    expect(proposals([PUSH], passedPushUp)).toHaveLength(1);
  });

  it('kapotte opgeslagen stappen vallen weg bij het lezen', () => {
    expect(normalizeStepSwaps({ a: { s: { from: 'push-up', to: 'onbekend' } }, b: 'kapot', c: { s: { from: 'push-up', to: 'push-up' } } })).toBeUndefined();
    expect(normalizeStepSwaps({ a: { s: { from: 'push-up', to: 'knee-push-up', sets: 3, reps: 'drie' } } })).toEqual({ a: { s: { from: 'push-up', to: 'knee-push-up' } } });
    expect(normalizeStrengthSettings({ stepSwaps: 'kapot', stepProposal: 'ja' } as never)).toEqual({});
  });
});

describe('Akkoord, houding en Ongedaan maken', () => {
  it('van herhalingen naar een houding: de onderkant van de nieuwe stap, 3 keer 10 seconden; terug haalt de stap weg', () => {
    const misses = [log(addDays(TODAY, -6), { 'scapular-pull-up': reps(3, 3, 3) }), log(addDays(TODAY, -4), { 'scapular-pull-up': reps(4, 3, 3) }), log(addDays(TODAY, -2), { 'scapular-pull-up': reps(2, 2, 2) })];
    const [down] = proposals([PULL], misses);
    expect(down).toMatchObject({ kind: 'lighter', toExerciseId: 'dead-hang' });
    expect(stepProposalText(down).keeps).toBe('Je begint op 3 keer 10 seconden.');
    const model = withStepAccepted<{ stepSwaps?: StepSwaps }>({}, down);
    expect(model.stepSwaps).toEqual({ tpl_pull: { t1: { from: 'scapular-pull-up', to: 'dead-hang', sets: 3, reps: '10s' } } });
    expect(forgeSlotsFor(PULL, model, TODAY)[0]).toMatchObject({ exerciseName: 'Dead Hang', sets: 3, reps: '10s' });
    // Later de toets op de houding gehaald: terug naar de oefening van het sjabloon, met zijn eigen sets en herhalingen.
    const holds: SetLog[] = [30, 30, 30].map((s) => ({ reps: 1, seconds: s }));
    const [up] = proposals([PULL], [...misses, log(TODAY, { 'dead-hang': holds })], { model, today: addDays(TODAY, 1) });
    expect(up).toMatchObject({ kind: 'harder', fromExerciseId: 'dead-hang', toExerciseId: 'scapular-pull-up' });
    const back = withStepAccepted(model, up);
    expect(back.stepSwaps).toBeUndefined();
    expect(forgeSlotsFor(PULL, back, TODAY)[0]).toMatchObject({ exerciseName: 'Scapular Pull-Up', sets: 3, reps: '8-10' });
  });

  it('Ongedaan maken zet precies terug wat er voor Akkoord stond, in beide trainingen', () => {
    const before = withStepAccepted<{ stepSwaps?: StepSwaps }>({}, proposals([PUSH, UPPER], missedPushUp)[0]);
    const [p] = proposals([PUSH, UPPER], [...missedPushUp, ...[1, 2, 3].map(() => log(YESTERDAY, { 'incline-push-up': reps(8, 8, 8) }))], { model: before });
    const after = withStepAccepted(before, p);
    expect(forgeSlotsFor(PUSH, after, TODAY)[0].exerciseName).toBe(forgeSlotsFor(PUSH, {}, TODAY)[0].exerciseName);
    expect(withStepUndone(after, p, before)).toEqual(before);
  });

  it('alles of niets: het oude model verandert niet, en het nieuwe heeft elke plek of geen', () => {
    const [p] = proposals([PUSH, UPPER], passedPushUp);
    const model = Object.freeze({ enabled: true, stepSwaps: undefined });
    const next = withStepAccepted(model, p);
    expect(model).toEqual({ enabled: true, stepSwaps: undefined });
    expect(Object.keys(next.stepSwaps ?? {}).sort()).toEqual(['tpl_push', 'tpl_upper']);
  });

  it('een plek met een oefening-id als id krijgt geen voorstel en geen stap: Forge herkent hem aan dat id', () => {
    const byId = tpl('tpl_id', 'Op id', [['push-up', 'Push-Up', 3, '8']]);
    expect(proposals([byId], passedPushUp)).toEqual([]);
    expect(proposals([byId, PUSH], passedPushUp)[0].targets.map((t) => t.slot)).toEqual(['p1']);
    const model = { stepSwaps: { tpl_id: { 'push-up': { from: 'push-up', to: 'decline-push-up' } } } };
    expect(withStepSwaps(byId.exercises!, model, 'tpl_id')[0].exerciseName).toBe('Push-Up');
  });

  it('een plek waarvan het sjabloon intussen een andere oefening heeft, volgt het sjabloon', () => {
    const model = { stepSwaps: { tpl_push: { p1: { from: 'push-up', to: 'knee-push-up' } } } };
    const changed = tpl('tpl_push', 'Duwen', [['p1', 'Dips', 3, '8']]);
    expect(withStepSwaps(changed.exercises!, model, 'tpl_push')[0].exerciseName).toBe('Dips');
    expect(withoutStepSwap(model, 'tpl_push', 'p1').stepSwaps).toBeUndefined();
  });
});

describe('de planning beweegt niet', () => {
  const { templates } = buildDefaultProgramData();
  const monday = '2026-11-16';
  const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_bodyweight', 'tpl_test_run', 'tpl_long_run'];
  const sessions: PlannedSession[] = DAYS.map((templateId, i) => ({ id: `s${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i, ...(i === 4 ? { lock: true } : {}) }) as PlannedSession);
  let k = 0;
  const ctx: PlanPassContext = { today: monday, logs: [], templates, program: null, blocks: [], restDay: 3, goalDay: '2027-08-01', newId: () => `n${++k}`, leave: [{ id: 'trek', kind: 'trek', startDate: addDays(monday, 1), endDate: addDays(monday, 2) }] } as unknown as PlanPassContext;

  it('Akkoord raakt alleen het krachtmodel: sjablonen, geplande sessies, slot, test en tocht blijven, twee keer planPass geeft hetzelfde', () => {
    const frozen = JSON.stringify(templates);
    const [p] = stepProposals({ on: true, logs: passedPushUp, today: TODAY, templates, exercisesOf: (t) => forgeSlotsFor(t, {}, TODAY) });
    const model = withStepAccepted<{ stepSwaps?: StepSwaps }>({}, p);
    expect(JSON.stringify(templates)).toBe(frozen);
    // Een vastgezette sessie met deze training houdt zijn slot; het voorstel gaat over de inhoud van het sjabloon.
    expect(lockLevel(sessions[4], new Set(), monday)).toBe(1);
    expect(forgeSlotsFor(templates.find((t) => t.id === 'tpl_bodyweight')!, model, TODAY).some((s) => s.exerciseName === 'Decline Push-Up')).toBe(true);
    // De planningsronde leest geen krachtmodel: met of zonder Akkoord krijgt hij dezelfde invoer.
    const first = planPass(sessions, ctx);
    const second = planPass(first.sessions, ctx);
    expect(JSON.stringify(second.sessions)).toBe(JSON.stringify(first.sessions));
    // De test is een anker; het voorstel kent geen geplande sessies en kan hem dus niet raken.
    expect(lockLevel(sessions[5], new Set(), monday)).toBe(2);
  });
});

describe('de overige ladders in het voorstel (F4f)', () => {
  const hold = (...s: number[]): SetLog[] => s.map((x) => ({ reps: 1, seconds: x }));
  it('een houding: toets gehaald op de L-sit geeft het voorstel voor de volgende stap, met seconden', () => {
    const LSIT = tpl('tpl_lsit', 'Romp', [['l1', 'Tuck L-Sit', 3, '20s']]);
    const [p] = proposals([LSIT], [log(YESTERDAY, { 'tuck-l-sit': hold(30, 30, 30) })]);
    expect(p).toMatchObject({ kind: 'harder', ladderId: 'l-sit', fromExerciseId: 'tuck-l-sit', toExerciseId: 'one-leg-l-sit', targets: [{ templateId: 'tpl_lsit', slot: 'l1' }] });
    expect(stepProposalText(p).keeps).toBe('Sets en herhalingen blijven.');
  });
  it('herhalingen: toets gehaald op de pike push-up geeft de verhoogde pike push-up', () => {
    const HS = tpl('tpl_hs', 'Schouders', [['h1', 'Pike Push-Up', 3, '8']]);
    const [p] = proposals([HS], [log(YESTERDAY, { 'pike-push-up': reps(8, 8, 8) })]);
    expect(p).toMatchObject({ ladderId: 'handstand-push-up', toExerciseId: 'elevated-pike-push-up' });
  });
  it('een training zonder een stap van deze ladders krijgt geen voorstel, ook niet met de bestaande oefeningen', () => {
    const logs = [log(YESTERDAY, { 'pistol-squat': reps(8, 8, 8), 'muscle-up': reps(8, 8, 8) })];
    expect(proposals([PUSH, PULLUP], logs)).toEqual([]);
  });
  it('de laatste stap van elke nieuwe ladder heeft geen voorstel omhoog', () => {
    const LAST = tpl('tpl_last', 'Laatste', [['a', 'Muscle-Up', 3, '8']]);
    expect(proposals([LAST], [log(YESTERDAY, { 'muscle-up': reps(8, 8, 8) })])).toEqual([]);
  });
});
