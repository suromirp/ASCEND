import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { TrainingGoal } from '../models/goals';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { isKeySession } from './adviceShared';
import { DEFAULT_KEY_FOCUS, isKeyFor, keyFocusOf, keyLabel, keyPhrase, keyRank, nextKeySession, type KeyFocus } from './keySession';

// Een nagemaakte week met de ingebouwde sjablonen. Maandag 16 november is vandaag.
const TODAY = '2026-11-16';
const templates = buildDefaultProgramData().templates;
let n = 0;
const at = (templateId: string, date: string, minutes: number, over: Partial<PlannedSession> = {}): PlannedSession =>
  ({ id: `s${++n}-${templateId}`, templateId, scheduledDate: date, status: 'planned', plannedMinutes: minutes, ...over } as PlannedSession);

// Ma Benen A 75, di rustige duurloop 40, wo Bovenlichaam A 60, do tempoloop 50, za heuvelintervallen 55,
// zo lange duurloop 70, en voor een tocht za een bergtocht 180 en wo een rugzakwandeling 60.
const week = () => [
  at('tpl_lower_a', '2026-11-16', 75),
  at('tpl_easy_run', '2026-11-17', 40),
  at('tpl_upper_a', '2026-11-18', 60),
  at('tpl_tempo_run', '2026-11-19', 50),
  at('tpl_hill_intervals', '2026-11-21', 55),
  at('tpl_long_run', '2026-11-22', 70),
];
const next = (sessions: PlannedSession[], focus: KeyFocus, logs: SessionLog[] = [], leave: LeavePeriod[] = []) =>
  nextKeySession(sessions, templates, logs, TODAY, focus, undefined, leave);

const TEN_K: KeyFocus = { goal: 'run_race', variant: '10k' };

describe('de sleuteltraining per soort doel', () => {
  it('10 km: de tempoloop, niet de langste training (Benen A)', () => {
    expect(next(week(), TEN_K)).toMatchObject({ name: 'Tempoloop', date: '2026-11-19', minutes: 50 });
  });

  it('10 km zonder tempo of intervallen: de heuvelintervallen, en daarna de lange duurloop', () => {
    const noTempo = week().filter((s) => s.templateId !== 'tpl_tempo_run');
    expect(next(noTempo, TEN_K)?.name).toBe('Heuvelintervallen');
    expect(next(noTempo.filter((s) => s.templateId !== 'tpl_hill_intervals'), TEN_K)?.name).toBe('Lange duurloop');
  });

  it('marathon: de lange duurloop', () => {
    expect(next(week(), { goal: 'run_race', variant: 'marathon' })?.name).toBe('Lange duurloop');
  });

  it('tocht of GR5: de bergtocht, dan de rugzakwandeling, dan de lange duurloop', () => {
    const trek: KeyFocus = { goal: 'trek_hut' };
    const withHike = [...week(), at('tpl_ruck_walk', '2026-11-18', 60), at('tpl_mountain_hike', '2026-11-21', 180)];
    expect(next(withHike, trek)?.name).toBe('Bergtocht');
    expect(next(withHike.filter((s) => s.templateId !== 'tpl_mountain_hike'), trek)?.name).toBe('Rugzakwandeling');
    expect(next(week(), trek)?.name).toBe('Lange duurloop');
  });

  it('trail: de lange duurloop of bergtocht met hoogtemeters', () => {
    expect(next(week(), { goal: 'trail', variant: 'kort' })?.name).toBe('Lange duurloop');
  });

  it('triathlon: de langste duur van fiets of loop', () => {
    expect(next([...week(), at('tpl_bike', '2026-11-20', 90)], { goal: 'triathlon' })?.name).toBe('Fietstocht');
    expect(next(week(), { goal: 'triathlon' })?.name).toBe('Lange duurloop');
  });

  it('een doel zonder soort (eigen sport, oud doel): de lange duurloop of de bergtocht, zoals altijd', () => {
    expect(next(week(), DEFAULT_KEY_FOCUS)?.name).toBe('Lange duurloop');
  });

  it('zonder doel volgt het de richting', () => {
    expect(next(week(), { direction: 'maintain' })?.name).toBe('Lange duurloop');
    expect(next(week(), { direction: 'stronger' })?.name).toBe('Benen A (zwaar)');
    expect(next(week(), { direction: 'easy' })).toBeUndefined();
  });
});

describe('randgevallen', () => {
  it('een week zonder passende training geeft geen sleuteltraining', () => {
    const onlyStrength = [at('tpl_lower_a', '2026-11-16', 75), at('tpl_upper_a', '2026-11-18', 60), at('tpl_easy_run', '2026-11-17', 40)];
    expect(next(onlyStrength, TEN_K)).toBeUndefined();
  });

  it('twee even lange kandidaten: de vroegste, en op dezelfde dag een vaste volgorde', () => {
    const two = [at('tpl_intervals', '2026-11-24', 50), at('tpl_tempo_run', '2026-11-19', 50)];
    expect(next(two, TEN_K)?.date).toBe('2026-11-19');
    const sameDay = [at('tpl_tempo_run', '2026-11-19', 50, { id: 'b' }), at('tpl_intervals', '2026-11-19', 50, { id: 'a' })];
    expect(next(sameDay, TEN_K)?.sessionId).toBe('a');
    expect(next([...sameDay].reverse(), TEN_K)?.sessionId).toBe('a');
  });

  it('de dag zelf telt nog, tot er een log is', () => {
    const today = [at('tpl_tempo_run', TODAY, 50, { id: 'vandaag' }), at('tpl_tempo_run', '2026-11-23', 50, { id: 'later' })];
    expect(next(today, TEN_K)?.sessionId).toBe('vandaag');
    const log = { id: 'l', plannedSessionId: 'vandaag', completedDate: TODAY } as SessionLog;
    expect(next(today, TEN_K, [log])?.sessionId).toBe('later');
  });

  it('een overgeslagen training en een training van gisteren tellen niet', () => {
    const s = [at('tpl_tempo_run', '2026-11-15', 50), at('tpl_tempo_run', '2026-11-19', 50, { status: 'skipped' }), at('tpl_long_run', '2026-11-22', 70)];
    expect(next(s, TEN_K)?.name).toBe('Lange duurloop');
  });

  it('een vakantie zonder training of een eigen tocht in de week: die training telt niet', () => {
    const holiday: LeavePeriod = { id: 'v', kind: 'no_training', startDate: '2026-11-18', endDate: '2026-11-21' };
    expect(next(week(), TEN_K, [], [holiday])?.name).toBe('Lange duurloop');
    const trek: LeavePeriod = { id: 't', kind: 'trek', startDate: '2026-11-19', endDate: '2026-11-22' };
    expect(next(week(), TEN_K, [], [trek])).toBeUndefined();
    // Vrije dagen halen niets weg: de tempoloop blijft de sleutel.
    const free: LeavePeriod = { id: 'f', kind: 'free_days', startDate: '2026-11-19', endDate: '2026-11-19' };
    expect(next(week(), TEN_K, [], [free])?.name).toBe('Tempoloop');
  });

  it('de sleutel van deze week gaat voor een langere van volgende week', () => {
    const two = [at('tpl_long_run', '2026-11-29', 60), at('tpl_long_run', '2026-11-22', 50)];
    expect(next(two, DEFAULT_KEY_FOCUS)).toMatchObject({ date: '2026-11-22', minutes: 50 });
    // Deze week alleen nog de lange duurloop, volgende week de tempoloop: deze week telt.
    expect(next([at('tpl_long_run', '2026-11-22', 70), at('tpl_tempo_run', '2026-11-26', 50)], TEN_K)?.name).toBe('Lange duurloop');
  });

  it('is de sleutel van deze week gedaan, dan die van volgende week', () => {
    const s = [at('tpl_tempo_run', '2026-11-19', 50, { id: 'deze' }), at('tpl_tempo_run', '2026-11-26', 50, { id: 'volgende' })];
    const log = { id: 'l', plannedSessionId: 'deze', completedDate: '2026-11-19' } as SessionLog;
    expect(next(s, TEN_K, [log])?.sessionId).toBe('volgende');
  });

  it('kijkt twee weken vooruit, niet verder', () => {
    expect(next([at('tpl_tempo_run', '2026-11-29', 50)], TEN_K)?.date).toBe('2026-11-29');
    expect(next([at('tpl_tempo_run', '2026-11-30', 50)], TEN_K)).toBeUndefined();
  });

  it('een test of wedstrijd en herstel zijn nooit de sleuteltraining', () => {
    const t = (id: string) => templates.find((x) => x.id === id)!;
    for (const focus of [TEN_K, DEFAULT_KEY_FOCUS, { direction: 'maintain' } as KeyFocus]) {
      expect(keyRank(t('tpl_test_run'), focus)).toBeUndefined();
      expect(keyRank(t('tpl_race'), focus)).toBeUndefined();
      expect(keyRank(t('tpl_herstel'), focus)).toBeUndefined();
    }
  });
});

describe('één betekenis', () => {
  const FOCI: KeyFocus[] = [
    DEFAULT_KEY_FOCUS, TEN_K, { goal: 'run_race', variant: 'marathon' }, { goal: 'trek_hut' }, { goal: 'trek_tent' }, { goal: 'day_hike' },
    { goal: 'mountaineering' }, { goal: 'trail' }, { goal: 'bike' }, { goal: 'triathlon' }, { goal: 'stronger' }, { goal: 'fit' },
    { direction: 'maintain' }, { direction: 'improve' }, { direction: 'stronger' }, { direction: 'easy' },
  ];

  it('het inhalen en de regel op Ascend gebruiken dezelfde definitie', () => {
    for (const focus of FOCI) {
      for (const t of templates) expect(isKeySession(t, focus)).toBe(isKeyFor(t, focus));
      const pick = next([...week(), at('tpl_bike', '2026-11-20', 90), at('tpl_ruck_walk', '2026-11-18', 60)], focus);
      if (pick) expect(isKeySession(templates.find((t) => t.name === pick.name)!, focus)).toBe(true);
      expect(keyPhrase(focus) === undefined).toBe(pick === undefined);
    }
  });

  it('de zin noemt elke training die als sleutel telt (Warden M4)', () => {
    for (const focus of FOCI) {
      const phrase = keyPhrase(focus) ?? '';
      for (const t of templates) {
        const label = keyLabel(t, focus);
        for (const part of label?.split(' of ') ?? []) expect(phrase, `${t.name} bij ${JSON.stringify(focus)}`).toContain(part);
      }
      // Eén leesbare zin: hoogstens één keer "of".
      expect(phrase.split(' of ').length, JSON.stringify(focus)).toBeLessThanOrEqual(2);
    }
    expect(keyPhrase(TEN_K)).toBe('de tempoloop, de intervallen, de heuvelintervallen of de lange duurloop');
  });

  it('zonder focus is het inhalen wat het was: de lange duurloop, de bergtocht en wandeldag 1', () => {
    const keys = templates.filter((t) => isKeySession(t)).map((t) => t.id).sort();
    expect(keys).toEqual(['tpl_hike_day_one', 'tpl_long_run', 'tpl_mountain_hike']);
  });

  it('een eigen sjabloon zonder rol telt op naam', () => {
    const own = { id: 'eigen', name: 'Lange duurloop zondag', type: 'cardio' } as SessionTemplate;
    expect(isKeyFor(own)).toBe(true);
    expect(keyRank(own, TEN_K)).toBe(2);
  });
});

describe('de focus uit je doelen', () => {
  const goal = (over: Partial<TrainingGoal>): TrainingGoal =>
    ({ id: 'g', name: 'Doel', requirements: [], createdAt: '', updatedAt: '', status: 'active', targetDate: '2027-03-14', ...over }) as TrainingGoal;

  it('het doel bovenaan Ascend bepaalt het, met de afstand', () => {
    expect(keyFocusOf([goal({ kind: 'run_race', details: { distanceKm: 10 } })], new Set(), TODAY, {})).toEqual({ goal: 'run_race', variant: '10k' });
    expect(keyFocusOf([goal({ kind: 'trek_hut', details: { days: 14 } })], new Set(['g']), TODAY, {})).toMatchObject({ goal: 'trek_hut' });
  });

  it('zonder doel de gekozen richting, en zonder keuze het advies', () => {
    expect(keyFocusOf([], new Set(), TODAY, { direction: 'stronger' })).toEqual({ direction: 'stronger' });
    expect(keyFocusOf([], new Set(), TODAY, {})).toHaveProperty('direction');
  });

  it('alleen Fit blijven of Sterker worden als doel is een richting', () => {
    expect(keyFocusOf([goal({ kind: 'stronger', targetDate: undefined })], new Set(), TODAY, {})).toEqual({ direction: 'stronger' });
  });

  it('een doel zonder soort: zoals altijd', () => {
    expect(keyFocusOf([goal({})], new Set(), TODAY, {})).toEqual(DEFAULT_KEY_FOCUS);
  });
});
