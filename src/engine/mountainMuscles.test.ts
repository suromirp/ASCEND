import { describe, expect, it } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import type { ExercisePrescription, ExerciseSetLog, SessionLog, SessionTemplate } from '../models/training';
import { exerciseById } from '../data/exercises';
import { DECLINE_QUIET_WEEKS, ankleComplaintOpen, balanceShort, hasMountainGoal, mountainMuscleProposal, mountainMusclesShort, muscleNoticeText, swapPreference, swapReason, type MuscleProposalInput } from './mountainMuscles';
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
    const text = muscleNoticeText(p!);
    expect(text.why).toMatch(/^Je deed de laatste drie weken gemiddeld 3 sets per week voor je kuiten\. /);
    expect(text.info).toContain('Een rustweek telt niet mee, daarom gaat het hier over drie weken.');
    expect(text.info).not.toMatch(/vakantie|tocht/);
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
    expect(text.why).toBe('Je deed de laatste vier weken geen sets voor je kuiten. Sterkere kuiten kunnen helpen bij bergop en bergaf met een rugzak.');
    expect(text.where).toBe('Erbij in Onderlichaam A');
    expect(text.how).toMatch(/3 sets van \d+ tot \d+ herhalingen\.$/);
    expect(Object.values(text).join(' ')).not.toMatch(/voorkomt|voorkomen|harde set|[–—]/i);
    expect(text.info).not.toMatch(/gekoppeld/);
  });

  it('noemt sets die niet gekoppeld konden worden', () => {
    const p = mountainMuscleProposal(input({ logs: WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), unknown(1)])) }));
    const text = muscleNoticeText(p!);
    expect(text.unknown).toBe('4 sets konden niet aan een oefening gekoppeld worden; die tellen hier niet mee.');
    // Op het scherm, niet alleen achter de i.
    expect(text.info).not.toMatch(/gekoppeld/);
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
    expect(muscleNoticeText(p).why).toMatch(/voor je scheenspier\. Een sterkere scheenspier kan helpen bij lange afdalingen\.$/);
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
    expect(text.why).toBe('Je deed de laatste vier weken geen evenwichtsoefening. Evenwichtsoefeningen kunnen je enkels helpen op ongelijke paden en bij afdalen.');
    // De melding noemt de Nederlandse naam (besluit 2026-11-12-je-week-tot-nu); de oefening zelf blijft Single Leg Stance.
    expect(text.name).toBe('Op één been staan');
    expect(text.where).toBe('Erbij in Onderlichaam A');
    expect(text.how).toBe('Sta op één been tot je gaat wiebelen, dan op het andere been. Drie keer per been.');
    expect(p!.exerciseName).toBe('Single Leg Stance');
    expect(Object.values(text).join(' ')).not.toMatch(/minuten|voorkomt|voorkomen|werk op één been|zo lang je stil|[–—]/);
  });

  it('de spieren gaan voor: met kuiten en evenwicht allebei te weinig komt eerst de kuit', () => {
    expect(mountainMuscleProposal(input())?.muscle).toBe('calves');
  });

  it('werksets op één been tellen, opwarmen niet; vanaf 2 per week geen voorstel', () => {
    const logs = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), stance(2)]));
    expect(balanceShort(logs, LAST)).toBeNull();
    const one = WEEKS.map((d, i) => log(`l${i}`, d, [squat(4), stance(1)]));
    expect(balanceShort(one, LAST)).toMatchObject({ muscle: 'balance', avgSets: 1 });
    expect(muscleNoticeText(mountainMuscleProposal(base({ logs: one }))!).why).toMatch(/^Je deed de laatste vier weken gemiddeld 1 set per week met een evenwichtsoefening\. /);
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
    const text = muscleNoticeText(p!);
    expect(text.why).toMatch(/^Je deed de laatste drie weken geen evenwichtsoefening\. /);
    expect(text.info).toContain('Een rustweek en een week met vakantie, een tocht of zonder sportschool tellen niet mee, daarom gaat het hier over drie weken.');
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

// De woorden van het voorstel (muscleNoticeText): gemaakt met de hand, zodat elke rij en elk getal vastligt.
describe('de woorden van het voorstel', () => {
  const make = (over: Partial<Parameters<typeof muscleNoticeText>[0]>) => muscleNoticeText({
    muscle: 'calves', avgSets: 0, weeks: 4, restLeftOut: false, unknownSets: 0,
    templateId: 't', templateName: 'Benen B', exerciseId: 'bodyweight-calf-raise', exerciseName: 'Bodyweight Calf Raise', sets: 3, reps: '10-15', ...over,
  });

  it('elk van de vier rijen: het feit, wat het kan helpen, en wat er achter de i telt', () => {
    expect(make({}).why).toBe('Je deed de laatste vier weken geen sets voor je kuiten. Sterkere kuiten kunnen helpen bij bergop en bergaf met een rugzak.');
    expect(make({ muscle: 'tibialis', exerciseId: 'tibialis-raise', reps: '15-20' }).why).toBe('Je deed de laatste vier weken geen sets voor je scheenspier. Een sterkere scheenspier kan helpen bij lange afdalingen.');
    expect(make({ muscle: 'glutes', exerciseId: 'glute-bridge', reps: '10-12' }).why).toBe('Je deed de laatste vier weken geen sets voor je bilspieren. Sterkere bilspieren kunnen helpen bij klimmen met een rugzak.');
    expect(make({ muscle: 'balance', exerciseId: 'single-leg-stance', reps: '4-6' }).why).toBe('Je deed de laatste vier weken geen evenwichtsoefening. Evenwichtsoefeningen kunnen je enkels helpen op ongelijke paden en bij afdalen.');
    // Vakantie of een tocht valt alleen bij evenwicht weg; bij de drie spieren alleen een rustweek.
    for (const muscle of ['calves', 'tibialis', 'glutes'] as const) {
      const info = make({ muscle }).info;
      expect(info).toContain('Een rustweek telt niet mee.');
      expect(info).not.toMatch(/vakantie|tocht/);
    }
    expect(make({ muscle: 'balance', exerciseId: 'single-leg-stance' }).info).toBe('Elke werkset van een evenwichtsoefening telt, opwarmen niet. Een rustweek en een week met vakantie, een tocht of zonder sportschool tellen niet mee. Kies je Liever niet, dan blijft het acht weken stil over je evenwicht.');
    expect(make({ muscle: 'glutes', exerciseId: 'glute-bridge' }).info).toBe('Een set telt als je er hoogstens 4 herhalingen over had. Een rustweek telt niet mee. Kies je Liever niet, dan blijft het acht weken stil over je bilspieren.');
  });

  it('gemiddeld 0, 1 en een breuk', () => {
    expect(make({ avgSets: 1 }).why).toMatch(/^Je deed de laatste vier weken gemiddeld 1 set per week voor je kuiten\. /);
    expect(make({ avgSets: 1.5 }).why).toMatch(/^Je deed de laatste vier weken gemiddeld 1,5 sets per week voor je kuiten\. /);
    expect(make({ muscle: 'balance', exerciseId: 'single-leg-stance', avgSets: 1.5 }).why).toMatch(/^Je deed de laatste vier weken gemiddeld 1,5 sets per week met een evenwichtsoefening\. /);
    expect(make({ avgSets: 0.04 }).why).toMatch(/geen sets voor je kuiten/);
  });

  it('vier weken tegenover drie weken met een weggevallen week', () => {
    expect(make({}).why).toContain('de laatste vier weken');
    const three = make({ weeks: 3, restLeftOut: true });
    expect(three.why).toContain('de laatste drie weken');
    // Op het scherm alleen de weken; wat niet meetelde staat achter de i.
    expect(three.why).not.toMatch(/zonder|rustweek|vakantie/);
    expect(three.info).toContain('Een rustweek telt niet mee, daarom gaat het hier over drie weken.');
    expect(make({ weeks: 2, restLeftOut: true }).why).toContain('de laatste twee weken');
  });

  it('met een gids de eerste regel en de dosis, zonder gids alleen de dosis; een houding in gewone woorden', () => {
    expect(make({}).how).toBe('Voorvoet op een trede, kom hoog op je tenen. 3 sets van 10 tot 15 herhalingen.');
    expect(exerciseById('dumbbell-frog-pump')?.guide).toBeUndefined();
    expect(make({ muscle: 'glutes', exerciseId: 'dumbbell-frog-pump', exerciseName: 'Dumbbell Frog Pump', reps: '10-12' }).how).toBe('3 sets van 10 tot 12 herhalingen.');
    expect(make({ muscle: 'balance', exerciseId: 'single-leg-stance', exerciseName: 'Single Leg Stance', reps: '4-6' }).how).toBe('Sta op één been tot je gaat wiebelen, dan op het andere been. Drie keer per been.');
  });

  it('de titel, waar hij komt, wat Akkoord doet en de tekst na Akkoord', () => {
    const t = make({ muscle: 'balance', exerciseId: 'single-leg-stance', exerciseName: 'Single Leg Stance' });
    expect(t.name).toBe('Op één been staan');
    expect(t.where).toBe('Erbij in Benen B');
    expect(t.after).toBe('Eerst een voorstel, pas na Akkoord verandert er iets. Daarna is hij vanaf je volgende keer de laatste oefening in Benen B. Weghalen kan in het blad van de oefening.');
    expect(t.forgeName).toBe('In Forge heet hij Single Leg Stance.');
    expect(t.done).toBe('Vanaf je volgende keer is Op één been staan de laatste oefening in Benen B. In Forge heet hij Single Leg Stance.');
    // Een naam met haakjes staat achteraan in de zin.
    const zwaar = make({ muscle: 'tibialis', exerciseId: 'tibialis-raise', exerciseName: 'Tibialis Raise', templateName: 'Benen A (zwaar)', reps: '15-20' });
    expect(zwaar.name).toBe('Tenen optrekken tegen de muur');
    expect(zwaar.where).toBe('Erbij in Benen A (zwaar)');
    expect(zwaar.after).toMatch(/de laatste oefening in Benen A \(zwaar\)\. Weghalen/);
    expect(zwaar.done).toBe('Vanaf je volgende keer is Tenen optrekken tegen de muur de laatste oefening in Benen A (zwaar). In Forge heet hij Tibialis Raise.');
    // Heet hij in Forge hetzelfde, dan geen zin over de naam.
    const same = make({ exerciseId: 'bestaat-niet', exerciseName: 'Eigen oefening' });
    expect(same.forgeName).toBeUndefined();
    expect(same.done).toBe('Vanaf je volgende keer is Eigen oefening de laatste oefening in Benen B.');
  });

  it('geen gedachtestreepjes, geen "voorkomt", geen harde sets in de tekst', () => {
    for (const muscle of ['calves', 'tibialis', 'glutes', 'balance'] as const) {
      expect(Object.values(make({ muscle, unknownSets: 2 })).join(' ')).not.toMatch(/[–—]|voorkom|harde set/i);
    }
  });
});

// Elke oefening die Spieren voor de berg kan voorstellen heeft een Nederlandse naam in het voorstel.
describe('de naam in het voorstel', () => {
  it('elke kandidaat voor kuiten, scheenspier en bilspieren, en de evenwichtsoefening, heet Nederlands', async () => {
    const { EXERCISES } = await import('../data/exercises');
    const { dutchExerciseAlias } = await import('./exerciseNames');
    const candidates = EXERCISES.filter((e) => ['calves', 'tibialis', 'glutes'].some((m) => e.primary.includes(m as never)) && e.pattern !== 'balance').map((e) => e.id);
    expect(candidates.length).toBeGreaterThan(30);
    for (const id of [...candidates, 'single-leg-stance']) expect(dutchExerciseAlias(id), id).toBeDefined();
  });
});

describe('randen van de woorden', () => {
  const make = (over: Partial<Parameters<typeof muscleNoticeText>[0]>) => muscleNoticeText({
    muscle: 'glutes', avgSets: 0, weeks: 4, restLeftOut: false, unknownSets: 0,
    templateId: 't', templateName: 'Benen B', exerciseId: 'glute-bridge', exerciseName: 'Glute Bridge', sets: 3, reps: '10-12', ...over,
  });

  it('een oefening per kant krijgt "per been"', () => {
    expect(exerciseById('pistol-squat')?.perSide).toBe(true);
    expect(make({ exerciseId: 'pistol-squat', exerciseName: 'Pistol Squat' }).how).toMatch(/3 sets van 10 tot 12 herhalingen per been\.$/);
    expect(make({}).how).not.toMatch(/per been/);
  });

  it('één set die niet gekoppeld kon worden: enkelvoud, en zonder zulke sets geen zin', () => {
    expect(make({ unknownSets: 1 }).unknown).toBe('1 set kon niet aan een oefening gekoppeld worden; die tellen hier niet mee.');
    expect(make({}).unknown).toBeUndefined();
  });

  it('Liever niet: precies acht weken stil, zoals de i zegt', () => {
    expect(DECLINE_QUIET_WEEKS).toBe(8);
    expect(make({}).info).toContain('acht weken stil');
    const declined = [{ muscle: 'calves' as const, weekStart: '2026-11-02' }];
    // De laatste stille week, en de week erna mag het weer.
    expect(mountainMuscleProposal(input({ today: '2026-12-21', declined }))?.muscle).toBe('tibialis');
    expect(mountainMuscleProposal(input({ today: '2026-12-28', declined }))?.muscle).toBe('calves');
  });
});
