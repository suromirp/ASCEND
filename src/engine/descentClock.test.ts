import { describe, it, expect, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { TrainingGoal } from '../models/goals';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import {
  DECLINE_QUIET_DAYS, DESCENT_CLOCK_RULE, DESCENT_LATE_RULE, DESCENT_TAPER_RULE, STAIRS_TEMPLATE_ID,
  countsAsDescent, descentAdvice, descentClock, descentClockContext, findDescentDay, resolveDescentClock,
  type DescentAdviceInput,
} from './descentClock';
import { applyPlanChangeItems } from './proposalEngine';
import { planPass } from './planPass';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { hasRole } from './templateRoles';
import { freshnessCurve } from './standing';
import { watchKindOf } from './watchFields';

// Alles hier is nagemaakt. Vandaag is woensdag 11 november 2026.
const TODAY = '2026-11-11';
const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));

const planned = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0 });
const log = (templateId: string, date: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id: `log-${templateId}-${date}`, templateId, type: byId.get(templateId)?.type ?? 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 60, ...over,
} as SessionLog);
// Een wandeling met hoogtemeters van het horloge.
const hike = (date: string, lossM: number) => log('tpl_ruck_walk', date, { outdoorData: { durationMinutes: 90, elevationGainM: lossM, elevationLossM: lossM, source: 'garmin' } });
// Een wandeling die je met de hand logde: geen hoogtemeters.
const handHike = (date: string) => log('tpl_ruck_walk', date, { outdoorData: { durationMinutes: 90, source: 'manual' } });
const easyRun = (date: string) => log('tpl_easy_run', date, { cardioData: { durationMinutes: 40, distanceKm: 6, source: 'manual' } });

const mountainGoal = (over: Partial<TrainingGoal> = {}): TrainingGoal => ({ id: 'g', name: 'Huttentocht', status: 'active', kind: 'trek_hut', targetDate: '2027-07-01', requirements: [], createdAt: '', updatedAt: '', ...over }) as TrainingGoal;
const raceGoal = (): TrainingGoal => ({ id: 'r', name: '10 km', status: 'active', kind: 'run_race', targetDate: '2027-04-01', requirements: [], createdAt: '', updatedAt: '' }) as TrainingGoal;
const trek = (startDate: string, endDate: string, terrain: 'mountain' | 'flat_trail' = 'mountain'): LeavePeriod => ({ id: `trek-${startDate}`, kind: 'trek', startDate, endDate, trek: { name: 'Vogezen', terrain, tent: false, importance: 'goal' } });

// De week van 9 november: di kracht boven, wo zware benen, do en vr vrij, za rustige loop, zo lange duurloop.
// Maandag is de vaste rustdag. De week erna: di kracht boven, wo zware benen.
const week = (saturday = 'tpl_easy_run'): PlannedSession[] => [
  planned('upA', 'tpl_upper_a', '2026-11-10'),
  planned('legs', 'tpl_lower_a', '2026-11-11'),
  planned('sat', saturday, '2026-11-14'),
  planned('long', 'tpl_long_run', '2026-11-15'),
  planned('upA2', 'tpl_upper_a', '2026-11-17'),
  planned('legs2', 'tpl_lower_a', '2026-11-18'),
];

const input = (over: Partial<DescentAdviceInput> = {}): DescentAdviceInput => ({
  today: TODAY, logs: [hike('2026-10-21', 150)], plannedSessions: week(), templates, context: { trips: [] }, respondedIds: new Set(), restDay: 1, ...over,
});
const one = (over: Partial<DescentAdviceInput> = {}) => descentAdvice(input(over))[0];

describe('wanneer een afdaling telt', () => {
  it('het sjabloon Trap af bestaat, is geen zware beendag en geen harde loop', () => {
    const stairs = byId.get(STAIRS_TEMPLATE_ID)!;
    expect(stairs.name).toBe('Trap af');
    expect(hasRole(stairs, 'descent')).toBe(true);
    expect(hasRole(byId.get('tpl_hills_descent')!, 'descent')).toBe(true);
    expect(isLegHeavyTemplate(stairs)).toBe(false);
    expect(isHardRun(stairs)).toBe(false);
    expect(stairs.defaultDayOfWeek).toBeUndefined();
  });

  it('telt een wandeling of loop vanaf 100 m dalen, daaronder niet', () => {
    expect(countsAsDescent(hike(TODAY, 100), byId)).toBe('yes');
    expect(countsAsDescent(hike(TODAY, 99), byId)).toBe('no');
    // Een loop met alleen stijging van het horloge: een rondje, dus evenveel gedaald (engine/standing.ts#descentOf).
    expect(countsAsDescent(log('tpl_long_run', TODAY, { cardioData: { durationMinutes: 70, elevationGainM: 130, source: 'garmin' } }), byId)).toBe('yes');
  });

  it('telt een afdaaltraining ook zonder hoogtemeters: de trapsessie en Heuvelsprints en afdalen', () => {
    expect(countsAsDescent(log(STAIRS_TEMPLATE_ID, TODAY), byId)).toBe('yes');
    expect(countsAsDescent(log('tpl_hills_descent', TODAY), byId)).toBe('yes');
    // Een oude back-up zonder het sjabloon in de lijst: de rol van het id telt.
    expect(countsAsDescent(log(STAIRS_TEMPLATE_ID, TODAY), new Map())).toBe('yes');
  });

  it('fietsen, de loopband en een vlakke loop tellen niet', () => {
    expect(countsAsDescent(log('tpl_bike', TODAY, { sport: 'cycling', cardioData: { durationMinutes: 90, elevationLossM: 600, source: 'garmin' } }), byId)).toBe('no');
    expect(countsAsDescent(log('tpl_ruck_walk', TODAY, { outdoorData: { durationMinutes: 60, environment: 'treadmill', source: 'manual' } }), byId)).toBe('no');
    expect(countsAsDescent(easyRun(TODAY), byId)).toBe('no');
  });

  it('een wandeling zonder hoogtemeters is onbekend, geen ja en geen nee', () => {
    expect(countsAsDescent(handHike(TODAY), byId)).toBe('unknown');
  });
});

describe('de stand van de klok', () => {
  it('vandaag telt nog: een afdaling van vandaag is 0 dagen geleden', () => {
    expect(descentClock([hike(TODAY, 200)], templates, TODAY)).toMatchObject({ last: TODAY, days: 0 });
    expect(one({ logs: [hike(TODAY, 200)] })).toBeUndefined();
  });

  it('een log van na vandaag telt niet mee', () => {
    expect(descentClock([hike('2026-10-21', 150), hike('2026-11-12', 300)], templates, TODAY).last).toBe('2026-10-21');
  });

  it('20 dagen zegt niets, 21 dagen wel', () => {
    expect(one({ logs: [hike('2026-10-22', 150)] })).toBeUndefined();
    expect(one()?.ruleId).toBe(DESCENT_CLOCK_RULE);
    expect(one()?.title).toBe('Al 21 dagen geen afdaling');
  });

  it('telt goed over de wissel naar wintertijd (25 oktober), een maandgrens en een jaargrens', () => {
    // 21 oktober tot 11 november gaat over de nacht van 25 oktober, die 25 uur duurt.
    expect(descentClock([hike('2026-10-21', 150)], templates, TODAY).days).toBe(21);
    expect(descentClock([hike('2026-12-20', 150)], templates, '2027-01-10').days).toBe(21);
    // Zomertijd (29 maart 2026): een nacht van 23 uur.
    expect(descentClock([hike('2026-03-20', 150)], templates, '2026-04-10').days).toBe(21);
  });

  it('middernacht in Amsterdam: de dag van het log telt, niet het moment in UTC', () => {
    // 00:30 op 21 oktober in Amsterdam is 22:30 UTC op 20 oktober. De klok leest de dag waarop je het deed.
    const late = hike('2026-10-21', 150);
    late.completedAt = '2026-10-20T22:30:00Z';
    expect(descentClock([late], templates, TODAY).days).toBe(21);
    expect(descentClock([late], templates, '2026-11-10').days).toBe(20);
    // 23:50 op 21 oktober in Amsterdam blijft 21 oktober.
    const evening = hike('2026-10-21', 150);
    evening.completedAt = '2026-10-21T21:50:00Z';
    expect(descentClock([evening], templates, TODAY).days).toBe(21);
  });

  it('een eigen bergtocht die geweest is telt als afdaling op zijn laatste dag; een vlakke tocht niet', () => {
    expect(descentClock([], templates, TODAY, [trek('2026-10-28', '2026-11-01')])).toMatchObject({ last: '2026-11-01', days: 10 });
    expect(descentClock([], templates, TODAY, [trek('2026-10-28', '2026-11-01', 'flat_trail')]).last).toBeUndefined();
    // Een tocht die nog moet beginnen telt niet.
    expect(descentClock([], templates, TODAY, [trek('2026-11-20', '2026-11-24')]).last).toBeUndefined();
  });
});

describe('DESCENT-CLOCK: na 21 dagen een regel en een voorstel', () => {
  it('stelt Trap af voor op de eerste vrije dag die past, als toevoeging en nooit stil', () => {
    const a = one()!;
    // Donderdag 12 valt af (de dag na zware benen), vrijdag 13 past: do vrij ervoor, za een rustige loop erna.
    expect(a.proposal?.changes).toHaveLength(1);
    expect(a.proposal?.changes[0]).toMatchObject({ action: 'add', newSessionDraft: { templateId: STAIRS_TEMPLATE_ID, scheduledDate: '2026-11-13', weekStartDate: '2026-11-09' } });
    expect(a.lead).toContain('Je laatste afdaling was wo 21 oktober.');
    expect(a.effect).toContain('Met Akkoord');
    expect(a.effect).toContain('Met Liever niet');
  });

  it('48 uur van een zware beendag: niet de dag ervoor en niet de dag erna', () => {
    // Alleen donderdag is vrij, tussen zware benen op woensdag en vrijdag.
    const sessions = [...week(), planned('legsB', 'tpl_lower_b', '2026-11-13')];
    expect(findDescentDay(input({ plannedSessions: sessions }), '2026-11-12', '2026-11-12', { tripGuard: true })).toBeUndefined();
    // Gedaan telt ook: zware benen die vandaag gelogd zijn houden morgen dicht.
    const done = input({ plannedSessions: [], logs: [hike('2026-10-21', 150), log('tpl_lower_a', TODAY)] });
    expect(findDescentDay(done, '2026-11-12', '2026-11-12', { tripGuard: true })).toBeUndefined();
    expect(findDescentDay(done, '2026-11-12', '2026-11-13', { tripGuard: true })?.day).toBe('2026-11-13');
  });

  it('nooit naast een harde loop: dan alleen de regel, zonder voorstel', () => {
    const a = one({ plannedSessions: week('tpl_tempo_run') })!;
    expect(a.ruleId).toBe(DESCENT_CLOCK_RULE);
    expect(a.proposal).toBeUndefined();
    expect(a.lead).toContain('De komende week is er geen dag die past.');
  });

  it('niet in de drie dagen voor een test', () => {
    const sessions = [planned('test', 'tpl_test_run', '2026-11-16')];
    const found = findDescentDay(input({ plannedSessions: sessions, restDay: 7 }), '2026-11-12', '2026-11-18', { tripGuard: true })?.day;
    // 13, 14 en 15 liggen binnen drie dagen voor de test, 12 niet.
    expect(found).toBe('2026-11-12');
    expect(findDescentDay(input({ plannedSessions: sessions, restDay: 7 }), '2026-11-13', '2026-11-15', { tripGuard: true })).toBeUndefined();
  });

  it('je vaste rustdag blijft vrij en de week houdt een dag zonder training', () => {
    // Alleen maandag 16 is leeg in het venster: dat is de rustdag.
    expect(findDescentDay(input({ plannedSessions: [] }), '2026-11-16', '2026-11-16', { tripGuard: true })).toBeUndefined();
    // Een volle week met één lege dag: die blijft leeg.
    const full = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-21', '2026-11-22'].map((d, i) => planned(`s${i}`, 'tpl_upper_a', d));
    expect(findDescentDay(input({ plannedSessions: full, restDay: undefined }), '2026-11-20', '2026-11-20', { tripGuard: true })).toBeUndefined();
    // Met een tweede lege dag in die week past hij wel.
    expect(findDescentDay(input({ plannedSessions: full.slice(1), restDay: undefined }), '2026-11-20', '2026-11-20', { tripGuard: true })?.day).toBe('2026-11-20');
  });

  it('nooit twee voorstellen die samen botsen: niet op of naast een dag van een ander voorstel', () => {
    expect(one({ taken: new Set(['2026-11-14']) })?.proposal).toBeUndefined();
    expect(one({ taken: new Set(['2026-11-13']) })?.proposal).toBeUndefined();
    expect(one({ taken: new Set(['2026-11-18']) })?.proposal?.changes[0].newSessionDraft?.scheduledDate).toBe('2026-11-13');
  });

  it('staat er al een afdaaltraining klaar, dan komt er geen voorstel bij', () => {
    expect(one({ plannedSessions: [...week(), planned('hd', 'tpl_hills_descent', '2026-11-13')] })).toBeUndefined();
  });

  it('Liever niet: drie weken stil vanaf de dag van je antwoord, en de zin noemt dezelfde dag', () => {
    const a = one()!;
    expect(a.id).toBe('descent:2026-10-21');
    // De zin en het id rekenen met hetzelfde getal: vandaag plus 21 dagen is woensdag 2 december.
    expect(addDays(TODAY, DECLINE_QUIET_DAYS)).toBe('2026-12-02');
    expect(a.effect).toContain('vraagt ASCEND het op zijn vroegst op wo 2 december weer');
    const declined = { respondedIds: new Set([a.id]), answeredOn: { [a.id]: TODAY }, plannedSessions: [] as PlannedSession[] };
    expect(one(declined)).toBeUndefined();
    expect(one({ ...declined, today: '2026-12-01' })).toBeUndefined();
    const again = one({ ...declined, today: '2026-12-02' })!;
    expect(again.id).toBe('descent:2026-10-21:2026-12-02');
    expect(again.title).toBe('Al 42 dagen geen afdaling');
  });

  it('Liever niet op dag 40 komt niet op dag 42 terug, maar op dag 61', () => {
    // Dag 40 na 21 oktober is 30 november; het voorstel staat er dan nog onder het eerste id.
    const day40 = one({ today: '2026-11-30', plannedSessions: [] })!;
    expect(day40.id).toBe('descent:2026-10-21');
    expect(day40.effect).toContain('op zijn vroegst op ma 21 december weer');
    const declined = { respondedIds: new Set([day40.id]), answeredOn: { [day40.id]: '2026-11-30' }, plannedSessions: [] as PlannedSession[] };
    for (const today of ['2026-12-02', '2026-12-10', '2026-12-20']) expect(one({ ...declined, today })).toBeUndefined();
    expect(one({ ...declined, today: '2026-12-21' })?.id).toBe('descent:2026-10-21:2026-12-21');
    // Ook dat tweede voorstel afgewezen: weer drie weken vanaf die dag.
    const twice = { respondedIds: new Set([day40.id, 'descent:2026-10-21:2026-12-21']), answeredOn: { [day40.id]: '2026-11-30', 'descent:2026-10-21:2026-12-21': '2026-12-23' }, plannedSessions: [] as PlannedSession[] };
    expect(one({ ...twice, today: '2027-01-12' })).toBeUndefined();
    expect(one({ ...twice, today: '2027-01-13' })?.id).toBe('descent:2026-10-21:2027-01-13');
  });

  it('een antwoord zonder dag (alleen het id): stil, want wanneer de drie weken om zijn is niet te zeggen', () => {
    expect(one({ respondedIds: new Set(['descent:2026-10-21']), today: '2026-12-30', plannedSessions: [] })).toBeUndefined();
  });

  it('Begrepen op de regel zonder voorstel belooft dezelfde termijn', () => {
    const a = one({ plannedSessions: week('tpl_tempo_run') })!;
    expect(a.proposal).toBeUndefined();
    expect(a.effect).toContain('Na Begrepen vraagt ASCEND het op zijn vroegst op wo 2 december weer.');
  });

  it('de planningsronde laat de trapsessie na Akkoord staan, ook twee keer achter elkaar', () => {
    const applied = applyPlanChangeItems(one()!.proposal!.changes, week(), () => 'trap', { by: 'proposal', at: 'x' }).sessions;
    let n = 0;
    const ctx = { today: TODAY, logs: [hike('2026-10-21', 150)], templates, program: null, blocks: [], restDay: 1, newId: () => `pass-${n++}` };
    const once = planPass(applied, ctx);
    const twice = planPass(once.sessions, ctx);
    for (const pass of [once, twice]) {
      expect(pass.sessions.find((x) => x.id === 'trap')).toMatchObject({ status: 'planned', scheduledDate: '2026-11-13', templateId: STAIRS_TEMPLATE_ID });
      expect(pass.repairs.filter((r) => JSON.stringify(r).includes('"trap"'))).toEqual([]);
    }
    // De rest van de week staat ook nog waar hij stond.
    expect(twice.sessions.filter((x) => x.id !== 'trap').map((x) => [x.id, x.scheduledDate, x.status])).toEqual(week().map((x) => [x.id, x.scheduledDate, x.status]));
  });

  it('na Akkoord staat de trapsessie in de week en zwijgt de klok', () => {
    const a = one()!;
    const after = applyPlanChangeItems(a.proposal!.changes, week()).sessions;
    expect(after.find((s) => s.templateId === STAIRS_TEMPLATE_ID)?.scheduledDate).toBe('2026-11-13');
    expect(one({ plannedSessions: after })).toBeUndefined();
    // Gedaan en gelogd: de klok staat weer op nul.
    expect(descentClock([hike('2026-10-21', 150), log(STAIRS_TEMPLATE_ID, '2026-11-13')], templates, '2026-11-14').days).toBe(1);
  });
});

describe('vakantie, tocht en ziek in het venster', () => {
  it('op vakantie zonder training is de klok stil; na terugkomst komt het voorstel', () => {
    const holiday: LeavePeriod = { id: 'v', kind: 'no_training', startDate: '2026-11-07', endDate: '2026-11-12' };
    expect(one({ leave: [holiday] })).toBeUndefined();
    // Vrijdag 13 ben je terug; de klok telde gewoon door.
    const back = one({ today: '2026-11-13', leave: [holiday], plannedSessions: [] })!;
    expect(back.title).toBe('Al 23 dagen geen afdaling');
    expect(back.proposal?.changes[0].newSessionDraft?.scheduledDate).toBe('2026-11-14');
  });

  it('een vakantiedag is geen vrije dag voor de trapsessie', () => {
    const holiday: LeavePeriod = { id: 'v', kind: 'no_training', startDate: '2026-11-13', endDate: '2026-11-14' };
    expect(findDescentDay(input({ plannedSessions: [], leave: [holiday] }), '2026-11-13', '2026-11-14', { tripGuard: true })).toBeUndefined();
  });

  it('de dagen van een tocht en de lichte dag ervoor en erna blijven dicht', () => {
    const flat = trek('2026-11-14', '2026-11-15', 'flat_trail');
    const found = findDescentDay(input({ plannedSessions: [], leave: [flat], restDay: undefined }), '2026-11-13', '2026-11-17', { tripGuard: true })?.day;
    expect(found).toBe('2026-11-17');
  });

  it('ziek of net beter: geen regel en geen voorstel', () => {
    const ill: IllnessEpisode[] = [{ id: 'i', kind: 'below_neck', startDate: '2026-11-09' }];
    expect(one({ illnessEpisodes: ill })).toBeUndefined();
    const justBetter: IllnessEpisode[] = [{ id: 'i', kind: 'below_neck', startDate: '2026-11-05', endDate: '2026-11-10' }];
    expect(one({ illnessEpisodes: justBetter })).toBeUndefined();
  });
});

describe('handlogs zonder hoogtemeters: eerlijk zeggen wat onbekend is', () => {
  it('noemt de wandeling waar ASCEND het niet van weet', () => {
    const a = one({ logs: [hike('2026-10-21', 150), handHike('2026-11-07')] })!;
    expect(a.lead).toContain('Je wandeling van za 7 november heeft geen hoogtemeters, dus of je daar afdaalde weet ASCEND niet.');
    expect(a.proposal).toBeDefined();
  });

  it('alleen handlogs: geen bewering over een laatste afdaling, wel de klok vanaf je eerste log', () => {
    const logs = [easyRun('2026-10-15'), handHike('2026-10-25')];
    const a = one({ logs })!;
    expect(a.title).toBe('Nog geen afdaling in je logs');
    expect(a.lead).toContain('ASCEND ziet in 27 dagen geen afdaling in je logs.');
    expect(a.lead).toContain('geen hoogtemeters');
    expect(a.lead).not.toContain('Je laatste afdaling');
    expect(a.id).toBe('descent:2026-10-15');
  });

  it('zonder logs, of met minder dan 21 dagen logs, zegt de klok niets', () => {
    expect(one({ logs: [] })).toBeUndefined();
    expect(one({ logs: [easyRun('2026-11-01')] })).toBeUndefined();
  });
});

describe('DESCENT-TAPER: één bekende afdaling voor een tocht', () => {
  // De tocht begint woensdag 25 november: dag -14 is 11 november, dag -7 is 18 november.
  const trips = { trips: [{ date: '2026-11-25', name: 'Vogezen' }] };

  it('tocht over 14 dagen zonder afdaling sinds dag -14: voorstel tussen dag -14 en dag -7', () => {
    const a = one({ context: trips, logs: [hike('2026-11-04', 300)] })!;
    expect(a.ruleId).toBe(DESCENT_TAPER_RULE);
    expect(a.id).toBe('descent-taper:2026-11-25');
    const day = a.proposal!.changes[0].newSessionDraft!.scheduledDate;
    expect(day >= '2026-11-12' && day <= '2026-11-18').toBe(true);
    expect(day).toBe('2026-11-13');
    expect(a.title).toBe('Nog één bekende afdaling voor Vogezen');
    expect(a.effect).toContain('niets nieuws meer');
  });

  it('een afdaling op of na dag -14 is vers genoeg: niets', () => {
    expect(one({ context: trips, logs: [hike('2026-11-11', 300)] })).toBeUndefined();
    expect(one({ today: '2026-11-15', context: trips, logs: [hike('2026-11-11', 300)], plannedSessions: [] })).toBeUndefined();
  });

  it('geen dag die past tot dag -7: alleen een zin, geen voorstel', () => {
    const a = one({ context: trips, logs: [hike('2026-10-21', 300)], plannedSessions: week('tpl_tempo_run') })!;
    expect(a.ruleId).toBe(DESCENT_TAPER_RULE);
    expect(a.proposal).toBeUndefined();
    expect(a.lead).toContain('Tot en met wo 18 november is er geen dag die past.');
  });

  it('Liever niet: voor deze tocht niet meer, ook de 21 dagen zwijgen tot na de tocht', () => {
    expect(one({ context: trips, respondedIds: new Set(['descent-taper:2026-11-25']) })).toBeUndefined();
  });

  it('tocht binnen 7 dagen: te laat, geen voorstel maar één zin', () => {
    const a = one({ today: '2026-11-20', context: trips, logs: [hike('2026-10-21', 300)], plannedSessions: [] })!;
    expect(a.ruleId).toBe(DESCENT_LATE_RULE);
    expect(a.proposal).toBeUndefined();
    expect(a.lead).toBe('Vogezen begint over 5 dagen. Een nieuwe afdaalprikkel geeft nu spierpijn op de tocht zelf.');
    expect(one({ today: '2026-11-20', context: trips, logs: [hike('2026-10-21', 300)], plannedSessions: [], respondedIds: new Set(['descent-late:2026-11-25']) })).toBeUndefined();
    // Met een verse afdaling is er niets te zeggen.
    expect(one({ today: '2026-11-20', context: trips, logs: [hike('2026-11-14', 300)], plannedSessions: [] })).toBeUndefined();
  });

  it('Akkoord op dag -7: op die dag zelf geen "te laat", want Trap af is dan je training', () => {
    // Alleen woensdag 18 november (dag -7) is vrij: do t/m di staan vol met kracht boven.
    const sessions = ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-17'].map((d, i) => planned(`s${i}`, 'tpl_upper_a', d));
    const logs = [hike('2026-10-21', 300)];
    const a = one({ context: trips, logs, plannedSessions: sessions })!;
    expect(a.ruleId).toBe(DESCENT_TAPER_RULE);
    expect(a.proposal!.changes[0].newSessionDraft!.scheduledDate).toBe('2026-11-18');
    const after = applyPlanChangeItems(a.proposal!.changes, sessions, () => 'trap').sessions;
    // De dagen ertussen en dag -7 zelf: stil. Geen tegenzin naast de training van het eerste voorstel.
    for (const today of ['2026-11-12', '2026-11-17', '2026-11-18']) expect(descentAdvice(input({ today, context: trips, logs, plannedSessions: after }))).toEqual([]);
    // Gedaan op dag -7: de dag erna ook stil, de afdaling is vers.
    expect(descentAdvice(input({ today: '2026-11-19', context: trips, logs: [...logs, log(STAIRS_TEMPLATE_ID, '2026-11-18', { plannedSessionId: 'trap' })], plannedSessions: after }))).toEqual([]);
    // Niet gedaan: pas op dag -6 de zin dat het te laat is.
    expect(one({ today: '2026-11-19', context: trips, logs, plannedSessions: after })?.ruleId).toBe(DESCENT_LATE_RULE);
  });

  it('dag -7 zonder geplande afdaling: geen "te laat" en geen voorstel voor morgen, wel wat vandaag nog kan', () => {
    const a = one({ today: '2026-11-18', context: trips, logs: [hike('2026-10-21', 300)], plannedSessions: [] })!;
    expect(a.ruleId).toBe(DESCENT_TAPER_RULE);
    expect(a.proposal).toBeUndefined();
    expect(a.lead).toContain('Vandaag is de laatste dag voor een bekende afdaling.');
    // Dag -6: te laat.
    expect(one({ today: '2026-11-19', context: trips, logs: [hike('2026-10-21', 300)], plannedSessions: [] })?.ruleId).toBe(DESCENT_LATE_RULE);
  });

  it('de klok van 21 dagen zet niets in de week voor een tocht', () => {
    // Tocht over 20 dagen (1 december): nog geen afbouw. De trapsessie mag niet op 25 november of later.
    const far = { trips: [{ date: '2026-12-01', name: 'Vogezen' }] };
    expect(findDescentDay(input({ context: far, plannedSessions: [], restDay: undefined }), '2026-11-25', '2026-11-30', { tripGuard: true })).toBeUndefined();
    expect(findDescentDay(input({ context: far, plannedSessions: [], restDay: undefined }), '2026-11-24', '2026-11-30', { tripGuard: true })?.day).toBe('2026-11-24');
  });
});

describe('geen vrije dag: na een herstelwandeling of een rustige loop op dezelfde dag', () => {
  // Di kracht boven, wo zware benen, do rustige loop, vr kracht boven, za rustige loop, zo kracht boven; ma rust.
  const full = (thursday = 'tpl_easy_run'): PlannedSession[] => [
    planned('legs', 'tpl_lower_a', '2026-11-11'),
    planned('thu', 'tpl_upper_b', '2026-11-12'),
    planned('fri', thursday, '2026-11-13'),
    planned('sat', 'tpl_upper_a', '2026-11-14'),
    planned('sun', 'tpl_upper_b', '2026-11-15'),
    planned('tue', 'tpl_upper_a', '2026-11-17'),
    planned('wed', 'tpl_upper_b', '2026-11-18'),
  ];

  it('een dag met alleen een rustige loop: Trap af komt erachteraan, met een eerlijke zin', () => {
    const a = one({ plannedSessions: full() })!;
    expect(a.proposal?.changes).toHaveLength(1);
    expect(a.proposal?.changes[0]).toMatchObject({ action: 'add', newSessionDraft: { templateId: STAIRS_TEMPLATE_ID, scheduledDate: '2026-11-13' } });
    expect(a.lead).toContain('Een korte trapsessie op vr 13 november, na je rustige duurloop, houdt je benen beschermd.');
    expect(a.effect).toContain('Met Akkoord staat Trap af (20 minuten) op vr 13 november, na je rustige duurloop.');
    expect(a.effect).not.toContain('een vrije dag');
  });

  it('een herstelwandeling telt ook, een vrije dag gaat voor', () => {
    expect(findDescentDay(input({ plannedSessions: full('tpl_herstel') }), '2026-11-12', '2026-11-18', { tripGuard: true })).toMatchObject({ day: '2026-11-13', after: { id: 'tpl_herstel' } });
    // Zaterdag en zondag vrij: dan de vrije zaterdag, ook al komt de rustige loop eerder.
    const withFree = full().filter((x) => x.id !== 'sat' && x.id !== 'sun');
    expect(findDescentDay(input({ plannedSessions: withFree }), '2026-11-12', '2026-11-18', { tripGuard: true })).toEqual({ day: '2026-11-14' });
  });

  it('niet achter kracht, een harde loop, de lange duurloop of een test', () => {
    for (const id of ['tpl_upper_a', 'tpl_tempo_run', 'tpl_long_run', 'tpl_test_run', 'tpl_ruck_walk']) {
      expect(findDescentDay(input({ plannedSessions: full(id) }), '2026-11-13', '2026-11-13', { tripGuard: true }), id).toBeUndefined();
    }
  });

  it('niet als twee trainingen op een dag niet mag, of als er die dag al twee staan', () => {
    expect(findDescentDay(input({ plannedSessions: full(), sameDayPairingPreference: 'never' }), '2026-11-12', '2026-11-18', { tripGuard: true })).toBeUndefined();
    expect(findDescentDay(input({ plannedSessions: [...full(), planned('extra', 'tpl_easy_run', '2026-11-13')] }), '2026-11-12', '2026-11-18', { tripGuard: true })).toBeUndefined();
  });

  it('met een tijdsbudget voor die dag moet de trapsessie erbij passen', () => {
    const budget = (preferredMinutes: number) => ({ fri: { preferredMinutes, softFlexMinutes: 0 } });
    // Rustige duurloop 40 minuten plus Trap af 20 minuten.
    expect(findDescentDay(input({ plannedSessions: full(), dailyTimeBudget: budget(60) }), '2026-11-13', '2026-11-13', { tripGuard: true })?.day).toBe('2026-11-13');
    expect(findDescentDay(input({ plannedSessions: full(), dailyTimeBudget: budget(45) }), '2026-11-13', '2026-11-13', { tripGuard: true })).toBeUndefined();
  });

  it('de dag na een zware beendag mag, maar alleen achter een rustige training', () => {
    const rest = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-17', '2026-11-18'].map((d, i) => planned(`u${i}`, 'tpl_upper_a', d));
    // Wo zware benen, do rustige loop: Trap af komt donderdag achter de loop.
    const sessions = [planned('legs', 'tpl_lower_a', '2026-11-11'), planned('easy', 'tpl_easy_run', '2026-11-12'), ...rest];
    expect(findDescentDay(input({ plannedSessions: sessions }), '2026-11-12', '2026-11-18', { tripGuard: true })).toMatchObject({ day: '2026-11-12', after: { id: 'tpl_easy_run' } });
    // Dezelfde donderdag als vrije dag: nooit direct na de beendag.
    expect(findDescentDay(input({ plannedSessions: [planned('legs', 'tpl_lower_a', '2026-11-11'), ...rest] }), '2026-11-12', '2026-11-12', { tripGuard: true })).toBeUndefined();
  });

  it('een tweede zware beendag binnen 48 uur erna houdt het voorstel tegen: de dag ervoor blijft dicht', () => {
    const rest = ['2026-11-14', '2026-11-15', '2026-11-17', '2026-11-18'].map((d, i) => planned(`u${i}`, 'tpl_upper_a', d));
    // Wo zware benen, do rustige loop, vr weer zware benen.
    const sessions = [planned('legs', 'tpl_lower_a', '2026-11-11'), planned('easy', 'tpl_easy_run', '2026-11-12'), planned('legsB', 'tpl_lower_b', '2026-11-13'), ...rest];
    expect(findDescentDay(input({ plannedSessions: sessions }), '2026-11-12', '2026-11-18', { tripGuard: true })).toBeUndefined();
    expect(one({ plannedSessions: sessions })?.proposal).toBeUndefined();
    // Ook de lange duurloop is een zware beendag: de rustige loop de dag ervoor valt af.
    const beforeLong = [planned('easy', 'tpl_easy_run', '2026-11-12'), planned('long', 'tpl_long_run', '2026-11-13'), ...rest];
    expect(findDescentDay(input({ plannedSessions: beforeLong }), '2026-11-12', '2026-11-12', { tripGuard: true })).toBeUndefined();
    // En de dag na een harde loop blijft dicht, ook achter een rustige loop.
    const afterHard = [planned('tempo', 'tpl_tempo_run', '2026-11-11'), planned('easy', 'tpl_easy_run', '2026-11-12'), planned('u9', 'tpl_upper_a', '2026-11-13'), ...rest];
    expect(findDescentDay(input({ plannedSessions: afterHard }), '2026-11-12', '2026-11-12', { tripGuard: true })).toBeUndefined();
  });

  it('de standaardweek van het demoprogramma: donderdag, na de rustige duurloop', () => {
    // Het demoprogramma begint op vandaag: een vaste klok op maandag 9 november 2026 geeft hele weken.
    // Ma Herstel (rustdag), di kracht, wo Benen A, do rustige loop, vr kracht, za heuvelintervallen, zo lange duurloop.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T08:00:00'));
    const demo = buildDefaultProgramData();
    vi.useRealTimers();
    expect(demo.plannedSessions.filter((x) => x.scheduledDate >= '2026-11-10' && x.scheduledDate <= '2026-11-16').sort((x, y) => x.scheduledDate.localeCompare(y.scheduledDate)).map((x) => x.templateId))
      .toEqual(['tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run', 'tpl_herstel']);
    const standard = { today: '2026-11-09', plannedSessions: demo.plannedSessions, templates: demo.templates, logs: [hike('2026-10-19', 150)] };
    // Donderdag is de dag na Benen A, met vrijdag kracht boven erna. Maandag blijft dicht: de rustdag.
    expect(findDescentDay(input(standard), '2026-11-10', '2026-11-16', { tripGuard: true })).toMatchObject({ day: '2026-11-12', after: { id: 'tpl_easy_run' } });
    const a = one(standard)!;
    expect(a.ruleId).toBe(DESCENT_CLOCK_RULE);
    expect(a.proposal?.changes).toHaveLength(1);
    expect(a.proposal?.changes[0]).toMatchObject({ action: 'add', newSessionDraft: { templateId: STAIRS_TEMPLATE_ID, scheduledDate: '2026-11-12' } });
    expect(a.lead).toContain('Een korte trapsessie op do 12 november, na je rustige duurloop, houdt je benen beschermd.');
    // Staat er vrijdag een tweede zware beendag, dan komt er geen voorstel.
    const twoLegDays = demo.plannedSessions.map((x) => (x.templateId === 'tpl_upper_b' && x.scheduledDate === '2026-11-13' ? { ...x, templateId: 'tpl_lower_b' } : x));
    expect(one({ ...standard, plannedSessions: twoLegDays })?.proposal).toBeUndefined();
  });
});

describe('de week houdt een dag zonder training', () => {
  it('telt alleen dagen vanaf vandaag: een lege dag die al voorbij is helpt niet', () => {
    // Vandaag is woensdag. Maandag en dinsdag waren leeg, do t/m zo staat vol behalve zaterdag.
    const sessions = ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-15'].map((d, i) => planned(`s${i}`, 'tpl_upper_a', d));
    expect(findDescentDay(input({ plannedSessions: sessions, restDay: undefined }), '2026-11-14', '2026-11-14', { tripGuard: true })).toBeUndefined();
    // Is vrijdag ook leeg, dan blijft er een dag over.
    expect(findDescentDay(input({ plannedSessions: sessions.filter((x) => x.id !== 's2'), restDay: undefined }), '2026-11-14', '2026-11-14', { tripGuard: true })?.day).toBe('2026-11-14');
  });

  it('een rij Herstel is geen training: zo\'n dag telt als de vrije dag van de week', () => {
    const sessions = [...['2026-11-11', '2026-11-12', '2026-11-13'].map((d, i) => planned(`s${i}`, 'tpl_upper_a', d)), planned('rest', 'tpl_herstel', '2026-11-15')];
    expect(findDescentDay(input({ plannedSessions: sessions, restDay: undefined }), '2026-11-14', '2026-11-14', { tripGuard: true })?.day).toBe('2026-11-14');
  });
});

describe('wat Trap af elders in de app is', () => {
  it('een geschatte hoogte is onbekend, geen nee', () => {
    const estimated = log('tpl_ruck_walk', TODAY, { outdoorData: { durationMinutes: 90, elevationGainM: 300, estimatedElevation: true, source: 'manual' } });
    expect(countsAsDescent(estimated, byId)).toBe('unknown');
    // Op de loopband is het geen afdaling, ook niet onbekend.
    expect(countsAsDescent(log('tpl_ruck_walk', TODAY, { outdoorData: { durationMinutes: 60, elevationGainM: 300, estimatedElevation: true, environment: 'treadmill', source: 'manual' } }), byId)).toBe('no');
  });

  it('geen datavelden van een tocht met rugzak; Heuvelsprints en afdalen houdt Heuvels', () => {
    expect(watchKindOf(byId.get(STAIRS_TEMPLATE_ID))).toBeUndefined();
    expect(watchKindOf(byId.get('tpl_hills_descent'))).toBe('hills');
    expect(watchKindOf(byId.get('tpl_ruck_walk'))).toBe('packHike');
  });

  it('in de frisheidsgrafiek heeft de dag het merk benen', () => {
    const curve = freshnessCurve({ today: TODAY, logs: [], plannedSessions: [planned('trap', STAIRS_TEMPLATE_ID, '2026-11-13')], templates } as never);
    expect(curve.find((p) => p.date === '2026-11-13')?.sessions).toEqual([expect.objectContaining({ name: 'Trap af', mark: 'legs' })]);
  });
});

describe('alleen bij een bergdoel, of als de instelling het zegt', () => {
  it('leest elke onbekende waarde als het advies (een oude back-up zonder het veld)', () => {
    expect(resolveDescentClock(undefined)).toBe('advies');
    expect(resolveDescentClock('aan')).toBe('advies');
    expect(resolveDescentClock(true)).toBe('advies');
    expect(resolveDescentClock('altijd')).toBe('altijd');
    expect(resolveDescentClock('uit')).toBe('uit');
  });

  it('zonder doel gebeurt er niets, ook met Altijd', () => {
    expect(descentClockContext(undefined, [], [], [], TODAY)).toBeUndefined();
    expect(descentClockContext('altijd', [], [], [], TODAY)).toBeUndefined();
  });

  it('advies: aan bij een bergdoel, een trail of een eigen bergtocht; uit bij een 10 km', () => {
    expect(descentClockContext(undefined, [mountainGoal()], [], [], TODAY)).toEqual({ trips: [{ date: '2027-07-01', name: 'Huttentocht' }] });
    expect(descentClockContext(undefined, [mountainGoal({ kind: 'trail', name: 'Trail' })], [], [], TODAY)?.trips).toHaveLength(1);
    expect(descentClockContext(undefined, [], [], [trek('2026-11-25', '2026-11-28')], TODAY)).toEqual({ trips: [{ date: '2026-11-25', name: 'Vogezen' }] });
    expect(descentClockContext(undefined, [raceGoal()], [], [], TODAY)).toBeUndefined();
    expect(descentClockContext(undefined, [], [], [trek('2026-11-25', '2026-11-28', 'flat_trail')], TODAY)).toBeUndefined();
  });

  it('een gepauzeerd bergdoel telt niet', () => {
    expect(descentClockContext(undefined, [mountainGoal({ status: 'paused' })], [], [], TODAY)).toBeUndefined();
  });

  it('Altijd: ook bij een 10 km, zonder tochten; Uit: nooit', () => {
    expect(descentClockContext('altijd', [raceGoal()], [], [], TODAY)).toEqual({ trips: [] });
    expect(descentClockContext('uit', [mountainGoal()], [], [], TODAY)).toBeUndefined();
  });

  it('computeAdvice zonder de klok geeft geen afdaaladvies (de golden scenario\'s bewegen niet)', () => {
    const base: AdviceInputs = { logs: [hike('2026-10-21', 150)], plannedSessions: week(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: TODAY, restDay: 1 };
    expect(computeAdvice(base).filter((a) => a.ruleId.startsWith('DESCENT'))).toEqual([]);
    const withClock = computeAdvice({ ...base, descentClock: { trips: [] } }).filter((a) => a.ruleId.startsWith('DESCENT'));
    expect(withClock.map((a) => a.ruleId)).toEqual([DESCENT_CLOCK_RULE]);
    expect(computeAdvice({ ...base, descentClock: { trips: [] }, respondedIds: new Set([withClock[0].id]) }).filter((a) => a.ruleId.startsWith('DESCENT'))).toEqual([]);
  });
});

// Een nagemaakte periode van zes weken (docs/beslissingen/2026-11-11-afdaalklok.md). Bergdoel: een eigen tocht in de
// Vogezen vanaf zaterdag 12 december. Elke week dezelfde trainingen: di kracht boven, wo zware benen, za rustige
// loop, zo lange duurloop; maandag rust. De laatste afdaling was zondag 18 oktober (220 m).
describe('voorbeeldperiode van zes weken', () => {
  const start = '2026-11-02';
  const tocht = trek('2026-12-12', '2026-12-13');
  const context = (today: string) => descentClockContext(undefined, [], [], [tocht], today);
  const weeks = (n: number): PlannedSession[] => Array.from({ length: n }, (_, w) => addDays(start, w * 7)).flatMap((mon, w) => [
    planned(`up${w}`, 'tpl_upper_a', addDays(mon, 1)),
    planned(`legs${w}`, 'tpl_lower_a', addDays(mon, 2)),
    planned(`easy${w}`, 'tpl_easy_run', addDays(mon, 5)),
    planned(`long${w}`, 'tpl_long_run', addDays(mon, 6)),
  ]);
  const at = (today: string, logs: SessionLog[], plannedSessions: PlannedSession[], respondedIds: string[] = []) =>
    descentAdvice({ today, logs, plannedSessions, templates, context: context(today), respondedIds: new Set(respondedIds), leave: [tocht], restDay: 1 })[0];
  const first = hike('2026-10-18', 220);

  it('week 1 (2 november): 15 tot 21 dagen. Tot en met zaterdag stil, op zondag 8 november het voorstel', () => {
    expect(at('2026-11-02', [first], weeks(7))).toBeUndefined();
    expect(at('2026-11-07', [first], weeks(7))).toBeUndefined();
    const a = at('2026-11-08', [first], weeks(7))!;
    expect(a.title).toBe('Al 21 dagen geen afdaling');
    // Maandag is rust, dinsdag kracht, woensdag benen, donderdag de dag na benen: vrijdag 13 november.
    expect(a.proposal?.changes[0].newSessionDraft?.scheduledDate).toBe('2026-11-13');
  });

  it('week 2 (9 november): Akkoord, Trap af op vrijdag 13 november gedaan. De klok staat op nul', () => {
    const a = at('2026-11-08', [first], weeks(7))!;
    const plan = applyPlanChangeItems(a.proposal!.changes, weeks(7)).sessions;
    expect(at('2026-11-10', [first], plan)).toBeUndefined();
    const done = log(STAIRS_TEMPLATE_ID, '2026-11-13');
    expect(descentClock([first, done], templates, '2026-11-13').days).toBe(0);
    expect(at('2026-11-15', [first, done], plan)).toBeUndefined();
  });

  it('week 3 en 4 (16 en 23 november): stil, de afdaling is 3 tot 16 dagen oud en de tocht is nog ver', () => {
    const logs = [first, log(STAIRS_TEMPLATE_ID, '2026-11-13')];
    for (const day of ['2026-11-16', '2026-11-22', '2026-11-23', '2026-11-27']) expect(at(day, logs, weeks(7))).toBeUndefined();
  });

  it('week 4, zaterdag 28 november: de tocht is over 14 dagen en de laatste afdaling is van voor dag -14', () => {
    const logs = [first, log(STAIRS_TEMPLATE_ID, '2026-11-13')];
    const a = at('2026-11-28', logs, weeks(7))!;
    expect(a.ruleId).toBe(DESCENT_TAPER_RULE);
    expect(a.title).toBe('Nog één bekende afdaling voor Vogezen');
    // Tussen dag -14 (28 november) en dag -7 (5 december): vrijdag 4 december.
    expect(a.proposal?.changes[0].newSessionDraft?.scheduledDate).toBe('2026-12-04');
  });

  it('week 5 (30 november): Akkoord en gedaan op vrijdag 4 december, daarna stil', () => {
    const logs = [first, log(STAIRS_TEMPLATE_ID, '2026-11-13'), log(STAIRS_TEMPLATE_ID, '2026-12-04')];
    expect(at('2026-12-05', logs, weeks(7))).toBeUndefined();
  });

  it('week 6 (7 december): de week van de tocht, niets nieuws meer. Wie week 5 liet liggen krijgt alleen een zin', () => {
    const fresh = [first, log(STAIRS_TEMPLATE_ID, '2026-11-13'), log(STAIRS_TEMPLATE_ID, '2026-12-04')];
    expect(at('2026-12-08', fresh, weeks(7))).toBeUndefined();
    const skipped = at('2026-12-08', [first, log(STAIRS_TEMPLATE_ID, '2026-11-13')], weeks(7), ['descent-taper:2026-12-12'])!;
    expect(skipped.ruleId).toBe(DESCENT_LATE_RULE);
    expect(skipped.proposal).toBeUndefined();
    expect(skipped.lead).toBe('Vogezen begint over 4 dagen. Een nieuwe afdaalprikkel geeft nu spierpijn op de tocht zelf.');
  });
});

describe('answeredDays (Warden, herreview)', () => {
  it('slaat een antwoord zonder tijdstip of null over in plaats van te crashen', async () => {
    const { answeredDays } = await import('./descentClock');
    const out = answeredDays({ a1: { response: 'accepted' } as never, a2: null, a3: { at: '2026-11-11T10:00:00.000Z' } });
    expect(Object.keys(out)).toEqual(['a3']);
    expect(out.a3).toMatch(/^2026-11-1[01]$/);
  });
});
