import { describe, it, expect } from 'vitest';
import { fullWeek, fullWeekAdvice, fullWeekConcern, fullWeekFollowed, fullWeekId, fullWeekLine, fullWithExtra, weekLoss, weekShape, FULL_WEEK_RULE, type FullWeekAdviceInput } from './fullWeek';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { proposeExtraSession } from './extraRun';
import { applyPlanChangeItems } from './proposalEngine';
import { validateWeeks } from './weekValidator';
import { noticeHeadline, rowNotes, type WeekConcern } from './weekConcerns';
import { weekFixId } from './weekFixProposal';
import type { PlanChangeProposal } from '../models/planChange';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';

// Nagemaakte weken, geen echte data. Maandag 2 november 2026 is week 2 van Opbouw.
const { templates } = buildDefaultProgramData();
const START = '2026-09-28';
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };
const MON = '2026-11-02';
const day = (n: number) => addDays(MON, n);

const row = (templateId: string, d: number, over: Partial<PlannedSession> = {}): PlannedSession =>
  ({ id: `${templateId}@${d}`, templateId, scheduledDate: day(d), weekStartDate: MON, status: 'planned', order: d, ...over });
const logOf = (s: PlannedSession): SessionLog =>
  ({ id: `l-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: templates.find((t) => t.id === s.templateId)!.type, completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual' });
const byProposal = { lock: { by: 'proposal' as const, at: `${day(2)}T06:17:00Z` } };
const byUser = { lock: { by: 'user' as const, at: `${day(1)}T08:00:00Z` } };

// De standaardweek: herstel, bovenlichaam A, benen A, rustige loop, bovenlichaam B, heuvels, lange duurloop.
const standard = (): PlannedSession[] => [
  row('tpl_herstel', 0), row('tpl_upper_a', 1), row('tpl_lower_a', 2), row('tpl_easy_run', 3), row('tpl_upper_b', 4), row('tpl_hill_intervals', 5), row('tpl_long_run', 6),
];

// De nagemaakte week van de melding: maandag de herstelwandeling niet gedaan, dinsdag Bovenlichaam A zelf naar
// de week erna gezet, woensdag Benen A gedaan. Daarna kwam de extra loop erbij op vrijdag (Akkoord) en zette de
// periode zonder sportschool Eigen gewicht op zondag.
const noGym: LeavePeriod[] = [{ id: 'lv', kind: 'no_gym', startDate: day(5), endDate: day(9) } as LeavePeriod];
function crammed(): { sessions: PlannedSession[]; logs: SessionLog[] } {
  const legs = row('tpl_lower_a', 2);
  const sessions = [
    row('tpl_herstel', 0),
    { ...row('tpl_upper_a', 1), scheduledDate: day(9), weekStartDate: day(7), status: 'moved' as const, movedFromDate: day(1), ...byUser },
    legs, row('tpl_easy_run', 3), row('tpl_upper_b', 4), row('tpl_strides_run', 4, byProposal), row('tpl_hill_intervals', 5),
    row('tpl_long_run', 6), row('tpl_bodyweight', 6, byProposal),
  ];
  return { sessions, logs: [logOf(legs)] };
}

const THU = day(3);
function input(today: string, sessions: PlannedSession[], logs: SessionLog[] = [], over: Partial<FullWeekAdviceInput> = {}): FullWeekAdviceInput {
  return { today, sessions, logs, templates, respondedIds: new Set(), ask: true, check: { restDay: 1, program }, ...over };
}

describe('WEEK-FULL: wanneer', () => {
  it('één gemiste dag zonder volle week: geen voorstel', () => {
    // Woensdag: Bovenlichaam A van dinsdag is gemist, de rest staat zoals altijd.
    const inp = input(day(2), standard());
    expect(weekLoss(inp).map((l) => l.name)).toEqual(['Bovenlichaam A']);
    expect(weekShape(inp).full).toBe(false);
    expect(fullWeekAdvice(inp)).toEqual([]);
  });

  it('een volle rest zonder verlies: geen voorstel (de regel kijkt pas na een weggevallen dag)', () => {
    const { sessions, logs } = crammed();
    const kept = sessions.filter((s) => s.templateId !== 'tpl_upper_a').concat(row('tpl_upper_a', 1));
    const all = [...logs, logOf(row('tpl_upper_a', 1))];
    expect(weekShape(input(THU, kept, all)).full).toBe(true);
    expect(fullWeekAdvice(input(THU, kept, all))).toEqual([]);
  });

  it('een gemiste herstelwandeling is geen verlies', () => {
    const sessions = standard();
    expect(weekLoss(input(day(1), sessions))).toEqual([]);
  });
});

describe('WEEK-FULL: de nagemaakte week', () => {
  const { sessions, logs } = crammed();
  const inp = input(THU, sessions, logs, { leave: noGym });

  it('ziet zes trainingen in vier dagen, twee dubbele dagen en vier loopdagen op rij', () => {
    const state = fullWeek(inp)!;
    expect(state.lost).toEqual([{ date: day(1), name: 'Bovenlichaam A', how: 'moved' }]);
    expect(state.shape).toMatchObject({ trainings: 6, days: 4, doubles: [day(4), day(6)], runStreak: 4, full: true });
  });

  it('geeft één voorstel: het advies valt eerst op de extra loop, met de reden en een alternatief', () => {
    const [advice, ...more] = fullWeekAdvice(inp);
    expect(more).toEqual([]);
    expect(advice.id).toBe(fullWeekId(THU));
    expect(advice.ruleId).toBe(FULL_WEEK_RULE);
    expect(advice.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'tpl_strides_run@4', action: 'remove' })]);
    // Het blad toont de feitregel, de wijziging en de tip: één feitzin, en hoogstens twee zinnen advies.
    expect(advice.lead).toBe('Je verloor deze week een dag. Tot en met zondag staan er nog 6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij.');
    expect(advice.tip).toBe('Duurloop met versnellingen van vr 6 november vervalt: die kwam er als extra bij. Dan staan er nog 5 trainingen in 4 dagen en 1 dag met twee trainingen.');
    expect(advice.effect).toBe('Je verloor deze week een dag. Tot en met zondag staan er nog 6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij. Duurloop met versnellingen van vr 6 november vervalt: die kwam er als extra bij. Dan staan er nog 5 trainingen in 4 dagen en 1 dag met twee trainingen.');
    expect(advice.options![1].effect).toBe('Je verloor deze week een dag. Tot en met zondag staan er nog 6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij. Rustige duurloop van do 5 november vervalt: een rustige loop kost je het minst. Ook dan is je week nog vol: 5 trainingen in 4 dagen en 2 dagen met twee trainingen.');
    // Het alternatief: de rustige loop, het minst belangrijke na de extra.
    expect(advice.options!.map((o) => o.proposal.changes[0].plannedSessionId)).toEqual(['tpl_strides_run@4', 'tpl_easy_run@3']);
    expect(advice.effect).not.toMatch(/[\u2013\u2014]/);
  });

  it('Akkoord laat de rij staan als overgeslagen; niets verdwijnt en de logs blijven', () => {
    const [advice] = fullWeekAdvice(inp);
    const before = JSON.stringify(logs);
    const after = applyPlanChangeItems(advice.proposal!.changes, sessions, undefined, { by: 'proposal', at: `${THU}T07:00:00Z` }).sessions;
    expect(after).toHaveLength(sessions.length);
    expect(after.find((s) => s.id === 'tpl_strides_run@4')!.status).toBe('skipped');
    expect(after.filter((s) => s.status === 'skipped')).toHaveLength(1);
    expect(JSON.stringify(logs)).toBe(before);
    // Daarna is de week niet meer vol, en na Akkoord zegt Week hoe dan ook niets meer.
    expect(fullWeek({ ...inp, sessions: after })).toBeUndefined();
    expect(fullWeekLine(inp, MON, 'accepted')).toBeUndefined();
  });

  it('Liever niet: opnieuw openen geeft geen nieuw voorstel, Week zegt het in een gewone regel', () => {
    const answered = { ...inp, respondedIds: new Set([fullWeekId(THU)]) };
    expect(fullWeekAdvice(answered)).toEqual([]);
    expect(fullWeekAdvice({ ...answered, today: day(4) })).toEqual([]);
    expect(fullWeekLine(inp, MON, 'declined')).toBe('Je week is vol: 6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij. Je liet alles staan.');
    expect(fullWeekLine(inp, MON, 'open')).toBe('Je week is vol: 6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij. Op Vandaag staat een voorstel.');
    // Een andere week dan die van vandaag zegt niets.
    expect(fullWeekLine(inp, day(7), 'declined')).toBeUndefined();
  });

  it('de instelling uit: geen voorstel, de regel op Week blijft', () => {
    expect(fullWeekAdvice({ ...inp, ask: false })).toEqual([]);
    expect(fullWeekLine(inp, MON)).toBe('Je week is vol: 6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij.');
  });

  it('via computeAdvice: het voorstel staat erin, en niet met de instelling uit', () => {
    const inputs: AdviceInputs = {
      logs, plannedSessions: sessions, templates, injuries: [], program, dailyTimeBudget: undefined, sameDayPairingPreference: 'automatic',
      respondedIds: new Set(), asOf: THU, leave: noGym, restDay: 1, missedLink: { on: false, declined: [] },
    } as AdviceInputs;
    const ids = (list: { id: string }[]) => list.map((a) => a.id).filter((id) => id.startsWith('week-full:'));
    const first = computeAdvice(inputs);
    expect(ids(first)).toEqual([fullWeekId(THU)]);
    // Twee keer rekenen geeft hetzelfde advies.
    expect(ids(computeAdvice(inputs))).toEqual(ids(first));
    expect(ids(computeAdvice({ ...inputs, fullWeekAsk: false }))).toEqual([]);
    expect(ids(computeAdvice({ ...inputs, respondedIds: new Set([fullWeekId(THU)]) }))).toEqual([]);
  });
});

describe('WEEK-FULL: wat nooit in het advies staat', () => {
  it('alleen eigen sessies over: een advies in woorden, geen voorstel', () => {
    const { sessions, logs } = crammed();
    const mine = sessions.map((s) => (s.scheduledDate >= THU && s.scheduledDate <= day(6) ? { ...s, ...byUser } : s));
    const [advice] = fullWeekAdvice(input(THU, mine, logs));
    expect(advice.proposal).toBeUndefined();
    expect(advice.options).toBeUndefined();
    expect(advice.effect).toContain('wat er nog staat zette je zelf neer');
    // De tip noemt de lichtste van jouw trainingen, nooit de sleuteltraining.
    expect(advice.effect).toContain('duurloop met versnellingen op vr 6 november');
    expect(advice.effect).not.toContain('lange duurloop op');
  });

  it('een test in de week: nooit in het advies of het alternatief', () => {
    const { sessions, logs } = crammed();
    // De extra loop is hier een testloop van ASCEND zelf; de heuvels zette je zelf neer.
    const withTest = sessions.map((s) => (s.id === 'tpl_strides_run@4' ? row('tpl_test_run', 4) : s.id === 'tpl_hill_intervals@5' ? { ...s, ...byUser } : s));
    const [advice] = fullWeekAdvice(input(THU, withTest, logs));
    const touched = [advice.proposal, ...(advice.options ?? []).map((o) => o.proposal)].flatMap((p) => p?.changes.map((c) => c.plannedSessionId) ?? []);
    expect(touched.length).toBeGreaterThan(0);
    expect(touched).not.toContain('tpl_test_run@4');
    expect(touched).not.toContain('tpl_hill_intervals@5');
    expect(touched).not.toContain('tpl_long_run@6');
  });

  it('een vaste afspraak en een ingehaalde training zijn van jou', () => {
    const { sessions, logs } = crammed();
    const caught = sessions.map((s) => (s.id === 'tpl_strides_run@4' ? { ...s, lock: undefined, catchUp: { fromId: 'x', fromDate: day(1) } } : s));
    const [advice] = fullWeekAdvice(input(THU, caught, logs));
    expect(advice.proposal!.changes[0].plannedSessionId).not.toBe('tpl_strides_run@4');
  });
});

describe('WEEK-FULL: wat verlies is en wat erbij kwam (review van 12 november)', () => {
  it('de rol extra alleen is niet genoeg: de zaterdagloop van het raceblok is geen extra', () => {
    const { sessions, logs } = crammed();
    // Dezelfde loop met versnellingen, maar door het raceblok neergezet in plaats van via een voorstel.
    const block = sessions.map((s) => (s.id === 'tpl_strides_run@4' ? { ...s, lock: undefined, blockQuiet: true as const } : s));
    const [advice] = fullWeekAdvice(input(THU, block, logs));
    expect(advice.tip).not.toContain('kwam er als extra bij');
    expect(advice.tip).toBe('Rustige duurloop van do 5 november vervalt: een rustige loop kost je het minst. Ook dan is je week nog vol: 5 trainingen in 4 dagen en 2 dagen met twee trainingen.');
    expect(advice.why).toContain('Na Liever niet vraagt ASCEND het deze week niet meer.');
    expect(advice.proposal!.changes[0].plannedSessionId).toBe('tpl_easy_run@3');
  });

  it('een losse log binnen twee dagen telt als gedaan: geen verlies, en de gelopen loop staat niet in het advies', () => {
    const upper = row('tpl_upper_a', 1);
    const loose: SessionLog = { ...logOf(upper), plannedSessionId: undefined, completedDate: day(2) };
    expect(weekLoss(input(THU, standard(), [loose, logOf(row('tpl_lower_a', 2))]))).toEqual([]);
    // Vandaag los gelogd: de rij van vandaag is gedaan en telt niet dubbel.
    const { sessions, logs } = crammed();
    const ran: SessionLog = { ...logOf(row('tpl_easy_run', 3)), plannedSessionId: undefined };
    const inp = input(THU, sessions, [...logs, ran]);
    expect(weekShape(inp).doubles).toEqual([day(4), day(6)]);
    const touched = fullWeekAdvice(inp).flatMap((a) => [a.proposal, ...(a.options ?? []).map((o) => o.proposal)]).flatMap((p) => p?.changes.map((c) => c.plannedSessionId) ?? []);
    expect(touched).not.toContain('tpl_easy_run@3');
  });

  it('een ruil binnen de week is geen verlies: de dag van herkomst is weer bezet', () => {
    const base = standard().map((s) => (s.scheduledDate < day(4) && s.templateId !== 'tpl_herstel' ? s : s));
    const swapped = base.map((s) => (s.id === 'tpl_upper_a@1' ? { ...s, scheduledDate: day(4), status: 'moved' as const, movedFromDate: day(1), ...byProposal }
      : s.id === 'tpl_upper_b@4' ? { ...s, scheduledDate: day(1), status: 'moved' as const, movedFromDate: day(4), ...byProposal } : s));
    const logs = swapped.filter((s) => s.scheduledDate < THU && s.templateId !== 'tpl_herstel').map(logOf);
    expect(weekLoss(input(THU, swapped, logs))).toEqual([]);
  });

  it('wat ASCEND zelf wegliet of verving, en een vakantie- of ziektedag, is geen verlies', () => {
    const logs = [logOf(row('tpl_lower_a', 2))];
    const dropped = standard().map((s) => (s.id === 'tpl_upper_a@1' ? { ...s, status: 'skipped' as const, leave: { periodId: 'lv', role: 'dropped' } as PlannedSession['leave'] } : s));
    expect(weekLoss(input(THU, dropped, logs))).toEqual([]);
    expect(weekLoss(input(THU, standard(), logs, { removedByPlanIds: new Set(['tpl_upper_a@1']) }))).toEqual([]);
    const off: LeavePeriod[] = [{ id: 'off', kind: 'no_training', startDate: day(1), endDate: day(1) } as LeavePeriod];
    expect(weekLoss(input(THU, standard(), logs, { leave: off }))).toEqual([]);
    expect(weekLoss(input(THU, standard(), logs, { illnessEpisodes: [{ id: 'i', startDate: day(0), endDate: day(1) }] as FullWeekAdviceInput['illnessEpisodes'] }))).toEqual([]);
    // Zonder die redenen is dezelfde dinsdag wel verlies.
    expect(weekLoss(input(THU, standard(), logs)).map((l) => l.how)).toEqual(['missed']);
  });

  it('ziek gemeld: de regel zwijgt', () => {
    const { sessions, logs } = crammed();
    const ill = [{ id: 'i', startDate: day(3) }] as FullWeekAdviceInput['illnessEpisodes'];
    expect(fullWeekAdvice(input(THU, sessions, logs, { illnessEpisodes: ill }))).toEqual([]);
  });
});

describe('WEEK-FULL: na je antwoord en de weekcontrole (herreview van 12 november)', () => {
  it('Begrepen is geen Akkoord: gevolgd leid je af uit het opgeslagen voorstel, niet uit het antwoord', () => {
    const { sessions, logs } = crammed();
    const inp = input(THU, sessions, logs, { leave: noGym });
    const [advice] = fullWeekAdvice(inp);
    // Niets geaccepteerd (ook niet na Begrepen op de variant zonder voorstel): Week houdt de regel.
    expect(fullWeekFollowed([], sessions, THU)).toBe(false);
    expect(fullWeekLine(inp, MON)).toContain('Je week is vol');
    const accepted: PlanChangeProposal = { ...advice.proposal!, resolution: 'accepted' };
    expect(fullWeekFollowed([accepted], sessions, THU)).toBe(true);
    // Ongedaan gemaakt: niet meer gevolgd. Een ander voorstel dat iets liet vervallen telt ook niet.
    const undo = { ...advice.proposal!, id: 'undo', revertsProposalId: accepted.id, resolution: 'accepted' } as PlanChangeProposal;
    expect(fullWeekFollowed([accepted, undo], sessions, THU)).toBe(false);
    expect(fullWeekFollowed([{ ...accepted, resolution: 'rejected' }], sessions, THU)).toBe(false);
    const other = { ...accepted, changes: accepted.changes.map((c) => ({ ...c, generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] })) };
    expect(fullWeekFollowed([other], sessions, THU)).toBe(false);
    // De week erna is een andere week.
    expect(fullWeekFollowed([accepted], sessions, day(7))).toBe(false);
  });

  it('wat de weekcontrole vindt maakt de week niet vol: één dubbele dag met twee harde lopen', () => {
    const sessions = [row('tpl_herstel', 0), row('tpl_upper_a', 1), row('tpl_lower_a', 2), row('tpl_upper_b', 3), row('tpl_tempo_run', 4), row('tpl_intervals', 4), row('tpl_easy_run', 5), row('tpl_long_run', 6)];
    const logs = [logOf(row('tpl_lower_a', 2))];
    const inp = input(THU, sessions, logs);
    expect(validateWeeks({ sessions, logs, templates, today: THU, restDay: 1, program, reportYours: true }, new Set([MON])).map((f) => f.rule)).toContain('TWO-HARD-RUNS');
    expect(weekLoss(inp)).toHaveLength(1);
    expect(weekShape(inp)).toMatchObject({ trainings: 5, days: 4, doubles: [day(4)], full: false });
    expect(fullWeekAdvice(inp)).toEqual([]);
  });

  it('één training over: de zin staat in het enkelvoud', () => {
    const { sessions, logs } = crammed();
    const mine = sessions.map((s) => (s.scheduledDate >= THU && s.scheduledDate <= day(6) ? { ...s, ...byUser } : s));
    const [advice] = fullWeekAdvice(input(THU, mine, logs));
    expect(advice.lead).toContain('staan er nog 6 trainingen');
  });
});

describe('WEEK-FULL: randen van de week', () => {
  it('een vrije periode die overlapt: een vakantiedag telt niet als dag die over is', () => {
    const { sessions, logs } = crammed();
    const off: LeavePeriod[] = [{ id: 'off', kind: 'no_training', startDate: day(5), endDate: day(5) } as LeavePeriod];
    // De heuvels van zaterdag zijn door de vakantie al weg; vrijdag en zondag blijven dubbel.
    const left = sessions.filter((s) => s.id !== 'tpl_hill_intervals@5');
    const shape = weekShape(input(THU, left, logs, { leave: off }));
    expect(shape).toMatchObject({ trainings: 5, days: 3, runStreak: 2, full: true });
  });

  it('een wandeldag van een tocht is geen training van de week en staat nooit in het advies', () => {
    const { sessions, logs } = crammed();
    const trek: LeavePeriod[] = [{ id: 'trek', kind: 'trek', startDate: day(6), endDate: day(6) } as LeavePeriod];
    const withWalk = sessions.filter((s) => s.scheduledDate !== day(6)).concat(row('tpl_mountain_hike', 6));
    const shape = weekShape(input(THU, withWalk, logs, { leave: trek }));
    expect(shape).toMatchObject({ trainings: 4, days: 3 });
  });

  it('de laatste dag van de week: twee trainingen op zondag is geen volle week', () => {
    const { sessions, logs } = crammed();
    const done = [...logs, ...sessions.filter((s) => s.scheduledDate >= THU && s.scheduledDate < day(6)).map(logOf)];
    const inp = input(day(6), sessions, done);
    expect(weekShape(inp)).toMatchObject({ trainings: 2, days: 1, doubles: [day(6)], full: false });
    expect(fullWeekAdvice(inp)).toEqual([]);
  });

  it('zondag naar maandag: een training die over de weekgrens schoof is geen verlies van de nieuwe week', () => {
    const nextMon = day(7);
    const next = standard().map((s) => ({ ...s, id: `n-${s.id}`, scheduledDate: addDays(s.scheduledDate, 7), weekStartDate: nextMon }));
    // De lange duurloop van zondag staat nu op maandag, door jou verplaatst; vorige week viel er van alles weg.
    const moved: PlannedSession = { ...row('tpl_long_run', 6), scheduledDate: nextMon, weekStartDate: nextMon, status: 'moved', movedFromDate: day(6), ...byUser };
    const all = [...standard().filter((s) => s.id !== 'tpl_long_run@6'), moved, ...next, { ...row('tpl_strides_run', 8), weekStartDate: nextMon }, { ...row('tpl_bodyweight', 8), weekStartDate: nextMon }];
    const inp = input(nextMon, all);
    expect(weekLoss(inp)).toEqual([]);
    expect(fullWeekAdvice(inp)).toEqual([]);
    // Op zondag zelf is die dag nog niet voorbij: ook dan geen verlies door de verplaatsing.
    expect(weekLoss(input(day(6), all)).some((l) => l.how === 'moved')).toBe(false);
  });
});

describe('de extra training kijkt mee', () => {
  // Woensdagochtend in de nagemaakte week, voor de extra loop er stond.
  const { sessions } = crammed();
  const before = sessions.filter((s) => s.id !== 'tpl_strides_run@4' && s.id !== 'tpl_bodyweight@6');
  const WED = day(2);
  // De weken ervoor gingen goed.
  const history: PlannedSession[] = [];
  for (let w = 1; w <= 4; w++) for (const s of standard()) history.push({ ...s, id: `h${w}-${s.id}`, scheduledDate: addDays(s.scheduledDate, -7 * w), weekStartDate: addDays(MON, -7 * w) });
  const logs = history.filter((s) => s.templateId !== 'tpl_herstel').map(logOf);
  const extra = (planned: PlannedSession[], done: SessionLog[] = []) => proposeExtraSession({ today: WED, program, plannedSessions: [...history, ...planned], logs: [...logs, ...done], templates, planChangeLog: [], restDay: 1, gaps: [], respondedIds: new Set() });

  it('zonder verlies komt de extra loop gewoon', () => {
    const whole = standard();
    const p = extra(whole, [logOf(whole[1])]);
    expect(p?.weekStart).toBe(MON);
    expect(p?.date).toBe(day(4));
  });

  it('de week verloor al een dag en wordt vol van de extra loop: geen voorstel voor deze week', () => {
    expect(fullWithExtra({ today: WED, sessions: before, logs: [], templates, check: { restDay: 1, program } }, { templateId: 'tpl_strides_run', date: day(4) })).toBe(true);
    const p = extra(before);
    expect(p?.weekStart).not.toBe(MON);
  });
});

// Week minimaal, spoor 3: de volle week is een punt in Let op, met een amber stip op de dagen met twee trainingen.
describe('WEEK-FULL: een punt in Let op', () => {
  const { sessions, logs } = crammed();
  const inp = input(THU, sessions, logs, { leave: noGym });

  it('alleen: de zin, het feit erachter en "volle dag" op de rijen van de dubbele dagen; geen voorstel in Week', () => {
    const c = fullWeekConcern(inp, MON)!;
    expect(c).toMatchObject({ rule: 'WEEK-FULL', plain: true, headline: 'Je week is vol.', fact: '6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij.' });
    expect(Object.keys(c.notes).sort()).toEqual(['tpl_bodyweight@6', 'tpl_long_run@6', 'tpl_strides_run@4', 'tpl_upper_b@4']);
    expect(Object.values(c.notes).every((n) => n === 'volle dag')).toBe(true);
    expect(noticeHeadline([c])).toBe('Je week is vol.');
    expect(weekFixId(c, sessions)).toBe(`weekfix:${c.key}`);
  });

  it('samen met een ander punt telt hij mee in de kop; op de rij gaat het punt van de weekcontrole voor', () => {
    const c = fullWeekConcern(inp, MON)!;
    const other: WeekConcern = { ...c, key: 'LEG-SPACING:x', rule: 'LEG-SPACING', plain: undefined, title: 't', why: 'w', finding: {} as never, headline: 'Twee zware beendagen.', fact: 'f', notes: { 'tpl_long_run@6': '1 dag na Benen A' } } as WeekConcern;
    expect(noticeHeadline([c, other])).toBe('Deze week heeft 2 punten die niet kloppen.');
    expect(rowNotes([c, other]).get('tpl_long_run@6')).toBe('1 dag na Benen A');
    expect(rowNotes([c, other]).get('tpl_bodyweight@6')).toBe('volle dag');
  });

  it('dezelfde woorden als de gewone regel; na Akkoord of in een andere week niets', () => {
    expect(fullWeekConcern(inp, MON, 'declined')!.fact).toMatch(/Je liet alles staan\.$/);
    expect(fullWeekConcern(inp, MON, 'open')!.fact).toMatch(/Op Vandaag staat een voorstel\.$/);
    expect(fullWeekConcern(inp, MON, 'accepted')).toBeUndefined();
    expect(fullWeekConcern(inp, day(7))).toBeUndefined();
  });
});
