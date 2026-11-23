import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { withCountingSports } from './sportTemplate';
import { weekConcerns } from './weekConcerns';
import { planWeekFix, weekFixId } from './weekFixProposal';
import type { CheckInput } from './weekValidator';
import {
  answerRow, appendRows, lapsedLine, lapsedSportRests, lastRows, liveSportRests, mergeSportRestOffers, parseSportRestOffers,
  resolveSportRestKeep, shownRows, sportRestOfferId, todayOfferLine, todaySportRest, weekAnswerOf, weekAnswerRows, type SportRestOffer,
} from './sportRestOffer';

// I-23 punt 10: padel op donderdag, Benen B op vrijdag. Nagemaakte data.
const { templates } = buildDefaultProgramData();
const MON = '2026-11-23';
const THU = '2026-11-26';
const FRI = '2026-11-27';
const SAT = '2026-11-28';
const counted = withCountingSports(templates, { sportHandling: { padel: { role: 'count' }, football: { role: 'count' } } });
const legs: PlannedSession = { id: 'legs', templateId: 'tpl_lower_b', scheduledDate: FRI, weekStartDate: MON, status: 'planned', order: 0, lock: { by: 'user', at: `${THU}T08:00:00Z` } };
const padel: SessionLog = {
  id: 'padel1', templateId: 'sport_padel', type: 'cardio', countedSport: 'padel', completedDate: THU, completedAt: `${THU}T20:30:00Z`,
  variant: 'custom', durationMinutes: 90, rpe: 7, source: 'manual',
};
const input = (today: string, over: Partial<CheckInput> = {}): CheckInput => ({ sessions: [legs], logs: [padel], templates: counted, today, restDay: 1, ...over });
const live = (today: string, over: Partial<CheckInput> = {}) => {
  const i = input(today, over);
  return liveSportRests(weekConcerns(i, MON), i.sessions, i.logs);
};
const ID = sportRestOfferId('padel1', 'legs');
const shown = (date = THU): SportRestOffer => ({ id: ID, state: 'shown', date, at: `${date}T21:00:00Z`, sport: 'padel', sessionDate: FRI });
const fixFor = (today: string) => (l: ReturnType<typeof live>[number]) => {
  const c = l.concern;
  return c.plain ? null : planWeekFix(input(today), c, MON);
};

describe('de melding van Week als aanleiding', () => {
  it('een vaste id per log en training, met de sport en de beendag', () => {
    const found = live(THU);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: 'sportrest:padel1:legs', logId: 'padel1', sessionId: 'legs', sport: 'padel', sessionDate: FRI });
  });

  it('Week schrijft de eerste regel één keer', () => {
    const rows = shownRows([], live(THU), THU, `${THU}T21:00:00Z`);
    expect(rows).toEqual([shown()]);
    expect(shownRows(rows, live(FRI), FRI, `${FRI}T07:00:00Z`)).toEqual([]);
  });

  it('zonder sport geen aanleiding', () => {
    expect(live(THU, { logs: [] })).toEqual([]);
  });
});

describe('de grensdag: de dag na de beendag', () => {
  it('zonder keuze staat er één rustige regel', () => {
    expect(live(SAT)).toEqual([]);
    const lapsed = lapsedSportRests({ list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: SAT });
    expect(lapsed).toEqual([{ id: ID, line: 'Je voorstel na padel is vervallen. Benen B was gisteren.' }]);
  });

  it('op de beendag zelf nog niet', () => {
    expect(lapsedSportRests({ list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: FRI })).toEqual([]);
  });

  it('na Begrepen niet meer', () => {
    const list = appendRows([shown()], [answerRow(ID, 'lapsed', SAT, `${SAT}T08:00:00Z`)]);
    expect(lapsedSportRests({ list, sessions: [legs], logs: [padel], templates: counted, today: SAT })).toEqual([]);
  });

  it('met eerder Liever niet: geen regel, en geen voorstel meer', () => {
    const list = [shown(), answerRow(ID, 'declined', FRI, `${FRI}T07:10:00Z`)];
    expect(lapsedSportRests({ list, sessions: [legs], logs: [padel], templates: counted, today: SAT })).toEqual([]);
    expect(todaySportRest({ live: live(FRI), list, sessions: [legs], logs: [padel], templates: counted, today: FRI, fixFor: fixFor(FRI) })).toBeUndefined();
  });

  it('met eerder Akkoord: geen regel, ook al staat de training er niet meer', () => {
    const moved = { ...legs, scheduledDate: SAT };
    const list = [shown(), answerRow(ID, 'accepted', FRI, `${FRI}T07:10:00Z`)];
    expect(lapsedSportRests({ list, sessions: [moved], logs: [padel], templates: counted, today: SAT })).toEqual([]);
    expect(lapsedSportRests({ list, sessions: [legs], logs: [padel], templates: counted, today: SAT })).toEqual([]);
  });

  it('zelf verplaatst of overgeslagen is een keuze: geen regel', () => {
    expect(lapsedSportRests({ list: [shown()], sessions: [{ ...legs, scheduledDate: '2026-11-29' }], logs: [padel], templates: counted, today: SAT })).toEqual([]);
    expect(lapsedSportRests({ list: [shown()], sessions: [{ ...legs, status: 'skipped' }], logs: [padel], templates: counted, today: SAT })).toEqual([]);
  });

  it('een keuze in Week of in de ochtend telt ook', () => {
    const answers = { [weekFixId(live(THU)[0].concern, [legs])]: { response: 'declined', at: `${THU}T21:05:00Z` } };
    expect(weekAnswerOf(ID, answers)).toEqual({ response: 'declined', at: `${THU}T21:05:00Z` });
    expect(lapsedSportRests({ list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: SAT, answers })).toEqual([]);
    expect(weekAnswerRows([shown()], answers, FRI, `${FRI}T07:00:00Z`)).toEqual([{ id: ID, state: 'declined', date: FRI, at: `${FRI}T07:00:00Z` }]);
    // Koos je in Week voordat de eerste regel er stond: de keuze komt toch na die regel, ook na een terugzetten.
    const late = { ...shown(), at: `${THU}T21:10:00Z` };
    const rows = weekAnswerRows([late], answers, THU, `${THU}T21:09:00Z`);
    expect(rows[0].at).toBe(late.at);
    expect(lastRows(mergeSportRestOffers(rows, [late])).get(ID)?.state).toBe('declined');
    expect(lapsedSportRests({ list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: SAT, choseOn: (d, s) => d === FRI && s === 'legs' })).toEqual([]);
  });

  it('gedaan op de beendag is ook een keuze: geen regel dat het verviel', () => {
    // Klaar is geen vlag: een gedane training staat nog op zijn dag met status planned. Alleen de log zegt het.
    const done: SessionLog = { id: 'benen1', templateId: 'tpl_lower_b', plannedSessionId: 'legs', type: 'strength', completedDate: FRI, completedAt: `${FRI}T18:00:00Z`, source: 'manual' } as SessionLog;
    expect(lapsedSportRests({ list: [shown()], sessions: [legs], logs: [padel, done], templates: counted, today: SAT })).toEqual([]);
    expect(lapsedSportRests({ list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: SAT })).toHaveLength(1);
  });

  it('noemt een oudere dag bij naam', () => {
    expect(lapsedLine('voetbal', 'Benen A', '2026-11-24', SAT)).toBe('Je voorstel na voetbal is vervallen. Benen A was op dinsdag.');
    expect(lapsedLine('padel', 'Benen B', FRI, '2026-11-29')).toBe('Je voorstel na padel is vervallen. Benen B was eergisteren.');
  });
});

describe('het voorstel op Vandaag, op de beendag', () => {
  it('staat er met de vaste zin, en Akkoord zet de training later', () => {
    const offer = todaySportRest({ live: live(FRI), list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: FRI, fixFor: fixFor(FRI) });
    expect(offer).toBeDefined();
    const move = offer!.proposal.changes.find((c) => c.action === 'move')!;
    expect(move).toMatchObject({ plannedSessionId: 'legs', fromDate: FRI });
    expect(move.toDate! > FRI).toBe(true);
    expect(offer!.line).toBe(todayOfferLine('Benen B', 'padel', 1, FRI, move.toDate!));
    expect(offer!.line.startsWith('Benen B vandaag, een dag na je padel.')).toBe(true);
  });

  it('ook als Week hem nooit liet zien: Vandaag ziet het dan zelf', () => {
    expect(todaySportRest({ live: live(FRI), list: [], sessions: [legs], logs: [padel], templates: counted, today: FRI, fixFor: fixFor(FRI) })).toBeDefined();
  });

  it('niet op een andere dag, niet na een log en niet als Vandaag er al een voorstel voor heeft', () => {
    expect(todaySportRest({ live: live(THU), list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: THU, fixFor: fixFor(THU) })).toBeUndefined();
    const done: SessionLog = { ...padel, id: 'done', templateId: 'tpl_lower_b', countedSport: undefined, completedDate: FRI, plannedSessionId: 'legs' };
    expect(todaySportRest({ live: live(FRI), list: [shown()], sessions: [legs], logs: [padel, done], templates: counted, today: FRI, fixFor: fixFor(FRI) })).toBeUndefined();
    expect(todaySportRest({ live: live(FRI), list: [shown()], sessions: [legs], logs: [padel], templates: counted, today: FRI, fixFor: fixFor(FRI), taken: new Set(['legs']) })).toBeUndefined();
  });

  it('de vraag zegt wat Akkoord doet', () => {
    expect(todayOfferLine('Benen B', 'voetbal', 1, FRI, SAT)).toBe('Benen B vandaag, een dag na je voetbal. Een dag later?');
    expect(todayOfferLine('Benen B', 'voetbal', 2, FRI, '2026-11-29')).toBe('Benen B vandaag, twee dagen na je voetbal. Naar zondag?');
  });
});

describe('opslag: alleen toevoegen, defensief lezen', () => {
  it('de laatste regel per id geldt, en een regel komt er niet twee keer in', () => {
    const list = appendRows([shown()], [answerRow(ID, 'declined', FRI, `${FRI}T07:00:00Z`), answerRow(ID, 'declined', FRI, `${FRI}T07:00:01Z`)]);
    expect(list).toHaveLength(2);
    expect(lastRows(list).get(ID)?.state).toBe('declined');
    expect(list[0]).toEqual(shown());
  });

  it('een kapotte regel valt weg en telt mee; ouder dan 30 dagen valt bij het lezen weg', () => {
    const out = parseSportRestOffers([shown(), { id: 'iets', state: 'shown', date: THU, at: 'x' }, { id: ID, state: 'misschien', date: THU, at: 'x' }, 'rommel', { ...shown('2026-10-20') }], THU);
    expect(out.list).toEqual([shown()]);
    expect(out.skipped).toBe(3);
    expect(parseSportRestOffers([shown('2026-10-20')]).list).toHaveLength(1);
    expect(parseSportRestOffers('oops')).toEqual({ list: undefined, skipped: 1 });
    expect(parseSportRestOffers(undefined)).toEqual({ list: undefined, skipped: 0 });
  });

  it('samenvoegen: alleen nieuwe regels erbij, de volgorde op moment', () => {
    const device = [shown(), answerRow(ID, 'accepted', FRI, `${FRI}T07:00:00Z`)];
    const backup = [shown(), answerRow(ID, 'declined', THU, `${THU}T22:00:00Z`)];
    const merged = mergeSportRestOffers(device, backup);
    expect(merged.map((r) => r.state)).toEqual(['shown', 'declined', 'accepted']);
    expect(lastRows(merged).get(ID)?.state).toBe('accepted');
  });

  it('de instelling: het advies is blijft', () => {
    expect(resolveSportRestKeep(undefined)).toBe('blijft');
    expect(resolveSportRestKeep('rommel')).toBe('blijft');
    expect(resolveSportRestKeep('vanzelf')).toBe('vanzelf');
  });
});
