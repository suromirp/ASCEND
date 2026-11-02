import { describe, it, expect } from 'vitest';
import type { MorningCheckIn } from '../models/checkIn';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { AdviceInputs } from './adviceEngine';
import { LEG_CARD_TARGET, MORNING_CARD_UNTIL_HOUR, NOTHING_PLANNED_TEXT, legsShortText, maxEffortYesterday, morningConsequence, morningPrefill, showMorningCard, suggestLegs } from './morningCard';
import type { SessionLog } from '../models/training';

const TODAY = '2026-10-22';
const fresh = { index: 2, painRecent: false, contributions: [{ id: 'a' }] } as Parameters<typeof suggestLegs>[0] & object;

describe('showMorningCard', () => {
  const base = { enabled: true, hour: 8, fromHour: 5, checkIn: undefined as MorningCheckIn | undefined, trainedToday: false };

  it('shows in the morning while today is not filled in', () => {
    expect(showMorningCard(base)).toBe(true);
    expect(showMorningCard({ ...base, hour: MORNING_CARD_UNTIL_HOUR - 1 })).toBe(true);
  });

  it('is gone from noon, after a training of today is logged, once filled in, or when switched off', () => {
    expect(showMorningCard({ ...base, hour: MORNING_CARD_UNTIL_HOUR })).toBe(false);
    expect(showMorningCard({ ...base, trainedToday: true })).toBe(false);
    expect(showMorningCard({ ...base, checkIn: { date: TODAY, allNormal: true } })).toBe(false);
    expect(showMorningCard({ ...base, enabled: false })).toBe(false);
  });

  it('is not there yet after midnight, only from the chosen hour', () => {
    expect(showMorningCard({ ...base, hour: 0 })).toBe(false);
    expect(showMorningCard({ ...base, hour: 4 })).toBe(false);
    expect(showMorningCard({ ...base, hour: 5 })).toBe(true);
    expect(showMorningCard({ ...base, hour: 4, fromHour: 4 })).toBe(true);
  });
});

describe('suggestLegs', () => {
  it('knows nothing without a leg index or without anything that still counts', () => {
    expect(suggestLegs(undefined)).toBeUndefined();
    expect(suggestLegs({ ...fresh, index: 0, contributions: [] })).toBeUndefined();
  });

  it('follows the words of the leg index: fris, wat vermoeid, vermoeid', () => {
    expect(suggestLegs(fresh)).toBe('fris');
    expect(suggestLegs({ ...fresh, index: 10 })).toBe('stijf');
    expect(suggestLegs({ ...fresh, index: 15 })).toBe('spierpijn');
  });

  it('never suggests flinke spierpijn, and never fris with leg pain in the last days', () => {
    expect(suggestLegs({ ...fresh, index: 40 })).toBe('spierpijn');
    expect(suggestLegs({ ...fresh, painRecent: true })).toBe('stijf');
  });
});

describe('morningPrefill', () => {
  it('gives every value its source', () => {
    const p = morningPrefill({ legIndex: fresh, reading: { date: TODAY, lines: [], suggestedSleep: 'goed', suggestedEnergy: 'moe' } });
    expect(p).toEqual({
      legs: { value: 'fris', from: 'beenindex' },
      sleep: { value: 'goed', from: 'horloge' },
      energy: { value: 'moe', from: 'horloge' },
    });
  });

  it('leaves out what it does not know', () => {
    expect(morningPrefill({ legIndex: undefined, reading: undefined })).toEqual({});
  });
});

// docs/onderzoek/RPE bij een testloop.md, voorstel 6: the morning after a test or race the card asks
// "Hoe voelen je benen?" openly. The leg index counts a test lightly (about 3.5), so its "Klopt: fris"
// would answer for you; what your legs say that morning tells more.
describe('the morning after a test or race', () => {
  const { templates: tpls } = buildDefaultProgramData();
  const done = (templateId: string, date: string): SessionLog => ({ id: `${templateId}-${date}`, templateId, type: 'cardio', completedDate: date, completedAt: `${date}T09:00:00Z`, variant: 'full', durationMinutes: 30, source: 'manual' });
  const ask = (logs: SessionLog[], enabled = true) => maxEffortYesterday({ logs, templates: tpls, today: TODAY, enabled });

  it('a test or race of yesterday, recognised by the role', () => {
    expect(ask([done('tpl_test_run', '2026-10-21')])).toEqual({ kind: 'test', line: 'Gisteren liep je je test. Wat je benen vanochtend zeggen, telt meer dan de beenindex.' });
    expect(ask([done('tpl_race', '2026-10-21')])?.kind).toBe('race');
    expect(ask([done('tpl_race', '2026-10-21')])?.line).toBe('Gisteren liep je je wedstrijd. Wat je benen vanochtend zeggen, telt meer dan de beenindex.');
    // A race goes before a test on the same day.
    expect(ask([done('tpl_test_run', '2026-10-21'), done('tpl_race', '2026-10-21')])?.kind).toBe('race');
    const own = { ...tpls.find((t) => t.id === 'tpl_tempo_run')!, id: 'tpl_own_test', roles: ['test' as const] };
    expect(maxEffortYesterday({ logs: [done('tpl_own_test', '2026-10-21')], templates: [...tpls, own], today: TODAY, enabled: true })?.kind).toBe('test');
  });

  it('nothing for an older test, one of today, another training, or with the setting off', () => {
    expect(ask([done('tpl_test_run', '2026-10-20')])).toBeUndefined();
    expect(ask([done('tpl_test_run', TODAY)])).toBeUndefined();
    expect(ask([done('tpl_tempo_run', '2026-10-21')])).toBeUndefined();
    expect(ask([done('tpl_test_run', '2026-10-21')], false)).toBeUndefined();
  });

  it('the legs are not filled in from the leg index that morning; sleep and energy from the watch stay', () => {
    const reading = { date: TODAY, lines: [], suggestedSleep: 'goed' as const, suggestedEnergy: 'moe' as const };
    expect(morningPrefill({ legIndex: fresh, reading, afterEffort: true })).toEqual({ sleep: { value: 'goed', from: 'horloge' }, energy: { value: 'moe', from: 'horloge' } });
    expect(morningPrefill({ legIndex: fresh, reading, afterEffort: false }).legs).toEqual({ value: 'fris', from: 'beenindex' });
  });
});

describe('morningConsequence', () => {
  const { templates } = buildDefaultProgramData();
  const day = '2026-11-03';
  const ps = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0 });
  const inputs = (planned: PlannedSession[]): AdviceInputs => ({ logs: [], plannedSessions: planned, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: day, legEase: 'uit' });
  const ctx = (planned: PlannedSession[], answered: string[] = []) => ({ inputs: inputs(planned), answeredAdviceIds: new Set(answered) });
  const entry = (legs: MorningCheckIn['legs'], extra: Partial<MorningCheckIn> = {}): MorningCheckIn => ({ date: day, legs, energy: 'gewoon', sleep: 'goed', ...extra });

  it('laat een testloop staan bij frisse benen', () => {
    const c = morningConsequence(entry('fris'), ctx([ps('t', 'tpl_test_run', day)]));
    expect(c.kind).toBe('blijft');
    expect(c.answer).toBe('Fris genoteerd.');
    expect(c.line).toBe('Testloop 5 km blijft staan.');
    expect(c.summary).toBe('Benen fris. Testloop 5 km blijft staan.');
    expect(c.adviceId).toBeUndefined();
  });

  it('zegt bij stijve benen op een testdag dat je rustig inloopt, zonder iets te plannen', () => {
    const planned = [ps('t', 'tpl_test_run', day)];
    const c = morningConsequence(entry('stijf'), ctx(planned));
    expect(c.line).toBe('Testloop 5 km blijft staan, warm rustig in.');
    expect(planned).toEqual([ps('t', 'tpl_test_run', day)]);
  });

  it('bij spierpijn alleen in het bovenlichaam is er geen reden om rustig in te lopen', () => {
    const c = morningConsequence(entry('spierpijn', { soreWhere: 'upper' }), ctx([ps('t', 'tpl_test_run', day)]));
    expect(c.line).toBe('Testloop 5 km blijft staan.');
    expect(c.answer).toBe('Spierpijn in je bovenlichaam genoteerd.');
  });

  it('noemt een voorstel met titel en de vaste zin dat niets zonder akkoord verandert', () => {
    const planned = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05')];
    const c = morningConsequence(entry('spierpijn'), ctx(planned));
    expect(c.kind).toBe('voorstel');
    expect(c.line).toMatch(/^Voorstel: .*Benen A.*\.$/);
    expect(c.detail).toContain('Niets verandert zonder jouw akkoord.');
    expect(c.adviceId).toBe(`morning:${day}:legs`);
  });

  it('slaat een voorstel over dat je al beantwoordde', () => {
    const planned = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05')];
    const c = morningConsequence(entry('spierpijn'), ctx(planned, [`morning:${day}:legs`]));
    expect(c.kind).not.toBe('voorstel');
  });

  it('wijst naar de kaart Benen als die voor de training van vandaag spreekt', () => {
    const c = morningConsequence(entry('spierpijn'), { inputs: { ...inputs([ps('legs', 'tpl_lower_a', day)]), legEase: 'voorstel' }, answeredAdviceIds: new Set() });
    expect(c.kind).toBe('kaart-benen');
    expect(c.adviceId).toBe(LEG_CARD_TARGET);
    expect(c.line).toContain('De kaart Benen staat klaar voor');
  });

  it('noemt bij twee trainingen eerst de test, ook als die later in de dag staat', () => {
    const planned = [{ ...ps('b', 'tpl_upper_b', day), order: 0 }, { ...ps('t', 'tpl_test_run', day), order: 1 }];
    const c = morningConsequence(entry('fris'), ctx(planned));
    expect(c.kind).toBe('blijft');
    expect(c.line).toBe('Testloop 5 km en Bovenlichaam B blijven staan.');
    expect(c.summary).toBe('Benen fris. Testloop 5 km en Bovenlichaam B blijven staan.');
  });

  it('noemt bij twee trainingen zonder test de volgorde van de dag', () => {
    const planned = [{ ...ps('e', 'tpl_easy_run', day), order: 1 }, { ...ps('b', 'tpl_upper_b', day), order: 0 }];
    const c = morningConsequence(entry('fris'), ctx(planned));
    expect(c.line).toBe('Bovenlichaam B en Rustige duurloop blijven staan.');
  });

  it('noemt bij drie trainingen de eerste twee en hoeveel er nog zijn', () => {
    const planned = [{ ...ps('t', 'tpl_test_run', day), order: 2 }, { ...ps('b', 'tpl_upper_b', day), order: 0 }, { ...ps('e', 'tpl_easy_run', day), order: 1 }];
    expect(morningConsequence(entry('fris'), ctx(planned)).line).toBe('Testloop 5 km, Bovenlichaam B en nog 1 andere blijven staan.');
  });

  it('een lichter gevolg klopt ook met twee trainingen', () => {
    const planned = [ps('t', 'tpl_test_run', day), { ...ps('b', 'tpl_upper_b', day), order: 1 }];
    expect(morningConsequence(entry('stijf'), ctx(planned)).line).toBe('Testloop 5 km en Bovenlichaam B blijven staan, warm rustig in.');
  });

  it('een herstelwandeling is een rustdag', () => {
    const c = morningConsequence(entry('fris'), ctx([ps('r', 'tpl_herstel', day)]));
    expect(c.kind).toBe('rustdag');
    expect(c.line).toBe('Herstelwandeling blijft staan.');
  });

  it('zonder training vandaag blijft alles zoals het is', () => {
    const c = morningConsequence(entry('fris'), ctx([ps('later', 'tpl_easy_run', '2026-11-06')]));
    expect(c.kind).toBe('rustdag');
    expect(c.line).toBe(NOTHING_PLANNED_TEXT);
  });

  it('een gelogde of overgeslagen training telt niet als training van vandaag', () => {
    const skipped = { ...ps('s', 'tpl_easy_run', day), status: 'skipped' as const };
    expect(morningConsequence(entry('fris'), ctx([skipped])).line).toBe(NOTHING_PLANNED_TEXT);
  });

  it('valt terug op alleen het antwoord als het gevolg niet te bepalen is', () => {
    const broken = { inputs: { ...inputs([]), templates: undefined as unknown as AdviceInputs['templates'] }, answeredAdviceIds: new Set<string>() };
    const c = morningConsequence(entry('fris'), broken);
    expect(c.answer).toBe('Fris genoteerd.');
    expect(c.line).toBeUndefined();
    expect(c.adviceId).toBeUndefined();
  });

  it('kent Gaat goed en het korte antwoord', () => {
    expect(morningConsequence({ date: day, allNormal: true }, ctx([])).answer).toBe('Gaat goed genoteerd.');
    expect(legsShortText({ legs: 'flink' })).toBe('Benen flinke spierpijn');
    expect(legsShortText({ allNormal: true })).toBe('Gaat goed');
  });
});
