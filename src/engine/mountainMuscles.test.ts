import { describe, expect, it } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import type { ExercisePrescription, ExerciseSetLog, SessionLog, SessionTemplate } from '../models/training';
import { exerciseById } from '../data/exercises';
import { ankleComplaintOpen, balanceShort, hasMountainGoal, mountainMuscleProposal, mountainMusclesShort, muscleNoticeText, swapPreference, swapReason, type MuscleProposalInput } from './mountainMuscles';
import { muscleVolumeByWeek } from './muscleVolume';
import { resolveStrengthSettings, normalizeStrengthSettings } from './strengthSettings';
import { addedPrescription } from './addedExercises';
import type { InjuryNote } from '../models/injury';
import type { LeavePeriod } from '../models/leave';

// Nagemaakte gegevens: een bergwandelaar die vier weken alleen squat en bankdrukt.
function log(id: string, date: string, strengthData: ExerciseSetLog[]): SessionLog {
  return { id, templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual', strengthData };
}
const sets = (n: number, kind?: 'warmup') => Array.from({ length: n }, () => ({ reps: 8, weightKg: 60, rir: 2, ...(kind ? { kind } : {}) }));
const squat = (n: number): ExerciseSetLog => ({ exerciseId: 'back-squat', exerciseName: 'Barbell Back Squat', sets: sets(n) });
const calf = (n: number): ExerciseSetLog => ({ exerciseId: 'standing-calf-raise', exerciseName: 'Standing Calf Raise', sets: sets(n) });
const tib = (n: number, kind?: 'warmup'): ExerciseSetLog => ({ exerciseId: 'tibialis-raise', exerciseName: 'Tibialis Raise', sets: sets(n, kind) });
const unknown = (n: number): ExerciseSetLog => ({ exerciseId: 'mf_iets', exerciseName: 'Iets wat niemand kent', sets: sets(n) });

// Weken van maandag 5, 12, 19 en 26 oktober 2026.
const WEEKS = ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'];
const LAST = '2026-10-26';

const goal = (over: Partial<TrainingGoal> = {}): TrainingGoal => ({ id: 'g', name: 'Tocht', status: 'active', kind: 'trek_hut', requirements: [], createdAt: '', updatedAt: '', ...over }) as TrainingGoal;
const ladder = new Set(['g']);

const slot = (id: string, name: string): ExercisePrescription => ({ id, exerciseName: name, sets: 3, reps: '8-10', priority: 'core' });
const tpl = (id: string, name: string, exercises: ExercisePrescription[]): SessionTemplate => ({ id, name, type: 'strength', exercises, durationVariants: { full: 60 } } as unknown as SessionTemplate);
const lower = tpl('tpl_lower_a', 'Onderlichaam A', [slot('ex8', 'Barbell Back Squat'), slot('ex9', 'Barbell Romanian Deadlift')]);
const upper = tpl('tpl_upper_a', 'Bovenlichaam A', [slot('ex1', 'Barbell Bench Press')]);

const input = (over: Partial<MuscleProposalInput> = {}): MuscleProposalInput => ({
  on: true,
  weekStart: LAST,
  today: '2026-11-02',
  logs: WEEKS.map((d, i) => log(`l${i}`, d, [squat(4)])),
  goals: [goal()],
  milestones: ladder,
  templates: [upper, lower],
  exercisesOf: (t) => t.exercises ?? [],
  profile: { barsKg: [20] },
  ...over,
});

describe('een bergdoel', () => {
  it('een tocht, bergtocht of mountaineering als hoofddoel, of het oude hoofddoel zonder soort', () => {
    expect(hasMountainGoal([goal()], ladder)).toBe(true);
    expect(hasMountainGoal([goal({ kind: 'day_hike' })], ladder)).toBe(true);
    expect(hasMountainGoal([goal({ kind: undefined })], ladder)).toBe(true);
    expect(hasMountainGoal([goal({ kind: 'run_race' })], ladder)).toBe(false);
    expect(hasMountainGoal([goal({ kind: 'stronger' })], new Set())).toBe(false);
    expect(hasMountainGoal([goal({ kind: 'mountaineering' })], new Set())).toBe(true);
    expect(hasMountainGoal([goal({ status: 'archived' })], ladder)).toBe(false);
  });
});

describe('bergspieren onder de ondergrens', () => {
  it('gemiddeld onder 4 harde sets per week over vier weken, de laagste eerst', () => {
    const short = mountainMusclesShort(input().logs, LAST);
    // Squat geeft de bilspieren 4 per week, dus die zitten op de grens en niet eronder.
    expect(short.map((s) => s.muscle)).toEqual(['calves', 'tibialis']);
    expect(short[0]).toMatchObject({ avgSets: 0, weeks: 4, restLeftOut: false, unknownSets: 0 });
  });

  it('een opwarmset telt niet, werksets wel (isWorkSet)', () => {
    const logs = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), tib(6, 'warmup'), calf(5)]));
    expect(mountainMusclesShort(logs, LAST).map((s) => s.muscle)).toEqual(['tibialis']);
  });

  it('telt een rustweek niet mee in het gemiddelde', () => {
    // Golven van vier: de week van 26 oktober is de rustweek.
    const program = { id: 'p', name: 'p', startDate: '2026-10-05', phases: [{ id: 'f', name: 'Basis', order: 1, weekCount: 8 }] } as never;
    const logs = WEEKS.slice(0, 3).map((d, i) => log(`l${i}`, d, [squat(4), calf(3)]));
    // Over vier weken: 9 kuitsets is 2,25 per week, te weinig.
    expect(mountainMusclesShort(logs, LAST).find((s) => s.muscle === 'calves')?.avgSets).toBe(2.25);
    // Zonder de rustweek: 9 over drie weken is 3, nog steeds te weinig, en de tibialis 0.
    const rest = mountainMusclesShort(logs, LAST, program);
    expect(rest[0].weeks).toBe(3);
    expect(rest.find((s) => s.muscle === 'calves')?.avgSets).toBe(3);
    const p = mountainMuscleProposal(input({ logs, program, templates: [upper, tpl('tpl_lower_a', 'Onderlichaam A', [...lower.exercises!, slot('ex11', 'Tibialis Raise')])] }));
    expect(muscleNoticeText(p!).fact).toBe('Je kuiten kregen de laatste drie weken zonder de rustweek gemiddeld 3 harde sets per week.');
  });

  it('zegt niets zonder krachtwerk of met te weinig weken', () => {
    expect(mountainMusclesShort([], LAST)).toEqual([]);
    const program = { id: 'p', name: 'p', startDate: '2026-10-26', phases: [{ id: 'f', name: 'Basis', weekCount: 8, focus: '' }] } as never;
    expect(mountainMusclesShort(input().logs, LAST, program)).toEqual([]);
  });

  it('telt sets die niet gekoppeld konden worden eerlijk apart', () => {
    const logs = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), unknown(2)]));
    expect(mountainMusclesShort(logs, LAST)[0].unknownSets).toBe(8);
  });
});

describe('het voorstel in de weekterugblik', () => {
  it('één oefening voor de laagste spier, in de krachttraining met het meeste beenwerk', () => {
    const p = mountainMuscleProposal(input());
    expect(p).toMatchObject({ muscle: 'calves', templateId: 'tpl_lower_a', templateName: 'Onderlichaam A', sets: 3 });
    expect(exerciseById(p!.exerciseId)!.primary).toContain('calves');
    const text = muscleNoticeText(p!);
    expect(text.fact).toBe('Je kuiten kregen de laatste vier weken geen harde sets.');
    expect(text.care).toContain('kan kuitwerk helpen');
    expect(`${text.fact} ${text.care} ${text.proposal}`).not.toMatch(/voorkomt|voorkomen/i);
    expect(text.proposal).toMatch(/^Voorstel: .+ erbij in Onderlichaam A, 3 sets van \d+ tot \d+ herhalingen\.$/);
    expect(text.unknown).toBeUndefined();
  });

  it('noemt sets die niet gekoppeld konden worden', () => {
    const p = mountainMuscleProposal(input({ logs: WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), unknown(1)])) }));
    expect(muscleNoticeText(p!).unknown).toBe('4 sets konden niet aan een oefening gekoppeld worden; die tellen hier niet mee.');
  });

  it('staat de spier al in het plan, dan de volgende; staat alles erin, dan niets', () => {
    const withCalf = tpl('tpl_lower_a', 'Onderlichaam A', [...lower.exercises!, slot('ex10', 'Standing Calf Raise')]);
    expect(mountainMuscleProposal(input({ templates: [upper, withCalf] }))?.muscle).toBe('tibialis');
    const all = tpl('tpl_lower_a', 'Onderlichaam A', [...withCalf.exercises!, slot('ex11', 'Tibialis Raise')]);
    // Alle drie de spieren staan erin: dan komt enkel en evenwicht aan de beurt, en met dat ook erin niets.
    expect(mountainMuscleProposal(input({ templates: [upper, all] }))?.muscle).toBe('balance');
    expect(mountainMuscleProposal(input({ templates: [upper, all], balance: false }))).toBeNull();
    const withBalance = tpl('tpl_lower_a', 'Onderlichaam A', [...all.exercises!, slot('ex12', 'Single Leg Stance')]);
    expect(mountainMuscleProposal(input({ templates: [upper, withBalance] }))).toBeNull();
  });

  it('niet zonder bergdoel, niet met de instelling uit, niet zonder krachttraining', () => {
    expect(mountainMuscleProposal(input({ goals: [goal({ kind: 'run_race' })] }))).toBeNull();
    expect(mountainMuscleProposal(input({ on: false }))).toBeNull();
    expect(mountainMuscleProposal(input({ templates: [] }))).toBeNull();
  });

  it('Eigen gewicht (zonder sportschool) krijgt nooit de oefening, ook niet met het meeste beenwerk', () => {
    const bodyweight = tpl('tpl_bodyweight', 'Eigen gewicht', [slot('bw1', 'Eccentric Squat'), slot('bw2', 'Reverse Lunge')]);
    expect(mountainMuscleProposal(input({ templates: [upper, lower, bodyweight] }))?.templateId).toBe('tpl_lower_a');
    expect(mountainMuscleProposal(input({ templates: [bodyweight] }))).toBeNull();
  });

  it('na Liever niet acht weken stil voor die spier, gerekend vanaf deze week', () => {
    const p = mountainMuscleProposal(input({ declined: [{ muscle: 'calves', weekStart: '2026-10-19' }] }));
    expect(p?.muscle).toBe('tibialis');
    expect(mountainMuscleProposal(input({ declined: [{ muscle: 'calves', weekStart: '2026-08-03' }] }))?.muscle).toBe('calves');
    // Liever niet deze week, op een oude terugblik uit oktober: die terugblik zwijgt ook.
    expect(mountainMuscleProposal(input({ weekStart: '2026-10-12', declined: [{ muscle: 'calves', weekStart: '2026-11-02' }] }))?.muscle).toBe('tibialis');
    // Acht weken later mag het weer.
    expect(mountainMuscleProposal(input({ today: '2026-12-28', declined: [{ muscle: 'calves', weekStart: '2026-11-02' }] }))?.muscle).toBe('calves');
  });

  it('geen voorstel als er in die training geen plek meer is', () => {
    expect(mountainMuscleProposal(input({ canAdd: () => false }))).toBeNull();
    expect(mountainMuscleProposal(input({ canAdd: (id) => id === 'tpl_lower_a' }))?.templateId).toBe('tpl_lower_a');
  });

  it('een tibialis-melding spreekt in het enkelvoud', () => {
    const withCalf = tpl('tpl_lower_a', 'Onderlichaam A', [...lower.exercises!, slot('ex10', 'Standing Calf Raise')]);
    const p = mountainMuscleProposal(input({ templates: [upper, withCalf] }))!;
    expect(muscleNoticeText(p).fact).toMatch(/^Je scheenspier kreeg /);
  });
});

describe('ruilen met voorrang', () => {
  it('alleen bij een bergdoel en met de instelling aan, over de vier hele weken voor deze week', () => {
    const base = { on: true, goals: [goal()], milestones: ladder, logs: input().logs, today: '2026-11-04' };
    expect(swapPreference(base)).toEqual(['calves', 'tibialis']);
    expect(swapPreference({ ...base, on: false })).toEqual([]);
    expect(swapPreference({ ...base, goals: [goal({ kind: 'run_race' })] })).toEqual([]);
  });

  it('een korte reden bij een oefening die zo’n spier bedient', () => {
    expect(swapReason(exerciseById('step-up')!, ['calves'])).toBe('Ook voor je kuiten, die kregen weinig de laatste vier weken.');
    expect(swapReason(exerciseById('back-squat')!, ['calves'])).toBeUndefined();
    expect(swapReason(exerciseById('step-up')!, [])).toBeUndefined();
  });
});

// Enkel en evenwicht (docs/beslissingen/2026-11-11-enkel-evenwicht.md): de vierde rij binnen Spieren voor de berg.
describe('enkel en evenwicht', () => {
  const stance = (n: number): ExerciseSetLog => ({ exerciseId: 'single-leg-stance', exerciseName: 'Single Leg Stance', sets: Array.from({ length: n }, () => ({ reps: 1, seconds: 30 })) });
  // De drie spieren staan in het plan: alleen evenwicht kan nog aan de beurt komen.
  const full = tpl('tpl_lower_a', 'Onderlichaam A', [...lower.exercises!, slot('ex10', 'Standing Calf Raise'), slot('ex11', 'Tibialis Raise')]);
  const base = (over: Partial<MuscleProposalInput> = {}) => input({ templates: [upper, full], ...over });
  const pain = (bodyPart: string, over: Partial<InjuryNote> = {}): InjuryNote => ({ id: 'i', date: '2026-10-30', bodyPart, severity: 'licht', kind: 'pijn', ...over });
  const away = (kind: LeavePeriod['kind'], startDate: string, endDate: string): LeavePeriod => ({ id: kind, kind, startDate, endDate });

  it('vier weken niets op één been: een voorstel om op één been te staan, in de training met het meeste beenwerk', () => {
    const p = mountainMuscleProposal(base());
    expect(p).toMatchObject({ muscle: 'balance', exerciseId: 'single-leg-stance', templateId: 'tpl_lower_a', sets: 3, avgSets: 0, weeks: 4 });
    const text = muscleNoticeText(p!);
    expect(text.fact).toBe('Je enkels en je evenwicht kregen de laatste vier weken geen werk op één been.');
    expect(text.care).toBe('Voor ongelijke paden en afdalingen kan werk op één been helpen.');
    expect(text.proposal).toBe('Voorstel: Single Leg Stance erbij in Onderlichaam A, 3 sets per been, zo lang je stil kunt staan.');
    expect(text.unknown).toBeUndefined();
    expect(`${text.fact} ${text.care} ${text.proposal}`).not.toMatch(/voorkomt|voorkomen|[–—]/);
  });

  it('de spieren gaan voor: met kuiten en evenwicht allebei te weinig komt eerst de kuit', () => {
    expect(mountainMuscleProposal(input())?.muscle).toBe('calves');
  });

  it('werksets op één been tellen, opwarmen niet; vanaf 2 per week geen voorstel', () => {
    const logs = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), stance(2)]));
    expect(balanceShort(logs, LAST)).toBeNull();
    const one = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), stance(1)]));
    expect(balanceShort(one, LAST)).toMatchObject({ muscle: 'balance', avgSets: 1 });
    expect(muscleNoticeText(mountainMuscleProposal(base({ logs: one }))!).fact).toBe('Je enkels en je evenwicht kregen de laatste vier weken gemiddeld 1 set per week.');
    const warm = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), { ...stance(3), sets: stance(3).sets.map((x) => ({ ...x, kind: 'warmup' as const })) }]));
    expect(balanceShort(warm, LAST)?.avgSets).toBe(0);
  });

  it('evenwicht is geen harde set voor een spier en geeft geen reden bij Ruilen', () => {
    const logs = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), stance(6)]));
    expect(muscleVolumeByWeek(logs)[0].sets.calves).toBe(0);
    expect(mountainMusclesShort(logs, LAST).map((s) => s.muscle)).toEqual(['calves', 'tibialis']);
    expect(swapReason(exerciseById('single-leg-stance')!, ['calves'])).toBeUndefined();
  });

  it('kiest voor een spier nooit een evenwichtsoefening, en een evenwichtsoefening in het plan telt niet als kuitwerk', () => {
    const withStance = tpl('tpl_lower_a', 'Onderlichaam A', [...lower.exercises!, slot('ex12', 'Single Leg Stance')]);
    const p = mountainMuscleProposal(input({ templates: [upper, withStance] }));
    expect(p?.muscle).toBe('calves');
    expect(exerciseById(p!.exerciseId)!.pattern).not.toBe('balance');
  });

  it('Spieren voor de berg uit, of alleen Enkel en evenwicht uit', () => {
    expect(mountainMuscleProposal(base({ on: false }))).toBeNull();
    expect(mountainMuscleProposal(base({ balance: false }))).toBeNull();
  });

  it('geen doel of geen bergdoel: niets', () => {
    expect(mountainMuscleProposal(base({ goals: [] }))).toBeNull();
    expect(mountainMuscleProposal(base({ goals: [goal({ kind: 'run_race' })] }))).toBeNull();
  });

  it('een week met vakantie, een tocht of zonder sportschool telt niet mee; vrije dagen wel', () => {
    // Drie weken op één been goed, één week weg zonder iets: zonder die week ruim boven de grens.
    const logs = WEEKS.slice(0, 3).map((d, i) => log(`l${i}`, d, [squat(4), stance(2)]));
    expect(balanceShort(logs, LAST)?.avgSets).toBe(1.5);
    for (const kind of ['no_training', 'trek', 'no_gym'] as const) expect(balanceShort(logs, LAST, null, [away(kind, '2026-10-27', '2026-10-31')]), kind).toBeNull();
    expect(balanceShort(logs, LAST, null, [away('free_days', '2026-10-27', '2026-10-28')])?.avgSets).toBe(1.5);
    // Met een te korte rest zwijgt het, en de tekst noemt de weggelaten weken eerlijk.
    expect(balanceShort(logs, LAST, null, [away('trek', '2026-10-05', '2026-10-25')])).toBeNull();
    const p = mountainMuscleProposal(base({ leave: [away('trek', '2026-10-27', '2026-10-31')] }));
    expect(muscleNoticeText(p!).fact).toBe('Je enkels en je evenwicht kregen de laatste drie weken zonder rustweek of vakantie geen werk op één been.');
    // Het voorstel plant niets: het noemt alleen een training, de tocht verandert niet.
    expect(p).not.toHaveProperty('date');
  });

  it('een open pijnklacht aan een enkel of voet: geen voorstel; spierpijn, stijf, een opgeloste klacht of een knie wel', () => {
    expect(mountainMuscleProposal(base({ injuries: [pain('Enkel links')] }))).toBeNull();
    expect(mountainMuscleProposal(base({ injuries: [pain('Voet rechts', { severity: 'ernstig' })] }))).toBeNull();
    expect(mountainMuscleProposal(base({ injuries: [pain('Enkel links', { resolvedDate: '2026-11-01' })] }))?.muscle).toBe('balance');
    expect(mountainMuscleProposal(base({ injuries: [pain('Enkel links', { kind: 'stijf' })] }))?.muscle).toBe('balance');
    expect(mountainMuscleProposal(base({ injuries: [pain('Knie links')] }))?.muscle).toBe('balance');
    expect(ankleComplaintOpen(undefined, '2026-11-02')).toBe(false);
    // Een woord dat 'voet' bevat is geen voetklacht (Warden): voetbalknie zet het evenwicht niet stil.
    expect(mountainMuscleProposal(base({ injuries: [pain('Voetbalknie')] }))?.muscle).toBe('balance');
    expect(mountainMuscleProposal(base({ injuries: [pain('Linker voet')] }))).toBeNull();
    // De spieren blijven gewoon: een enkelklacht zet alleen het evenwicht stil.
    expect(mountainMuscleProposal(input({ injuries: [pain('Enkel links')] }))?.muscle).toBe('calves');
  });

  it('na Liever niet acht weken stil, los van de spieren', () => {
    expect(mountainMuscleProposal(base({ declined: [{ muscle: 'balance', weekStart: '2026-10-26' }] }))).toBeNull();
    expect(mountainMuscleProposal(base({ declined: [{ muscle: 'calves', weekStart: '2026-10-26' }] }))?.muscle).toBe('balance');
  });

  it('een oude back-up zonder het veld leest als aan; iets geks wordt weggelaten', () => {
    expect(resolveStrengthSettings(undefined).mountainBalance).toBe(true);
    expect(resolveStrengthSettings({ mountainMuscles: true } as never).mountainBalance).toBe(true);
    expect(normalizeStrengthSettings({ mountainBalance: 'ja' })?.mountainBalance).toBeUndefined();
    expect(resolveStrengthSettings(normalizeStrengthSettings({ mountainBalance: false })).mountainBalance).toBe(false);
  });

  it('de toegevoegde oefening: drie sets; Forge plant een houding in seconden', () => {
    expect(addedPrescription(exerciseById('single-leg-stance')!)).toEqual({ sets: 3, reps: '4-6' });
    expect(exerciseById('single-leg-stance')!.measure).toBe('hold');
    expect(exerciseById('star-excursion-reach')!.measure).toBeUndefined();
  });
});
