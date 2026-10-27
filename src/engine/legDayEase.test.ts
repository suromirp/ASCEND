import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { MorningCheckIn } from '../models/checkIn';
import type { InjuryNote } from '../models/injury';
import type { LegEaseDay } from '../models/legEase';
import type { ExercisePrescription, PlannedSession, SessionLog } from '../models/training';
import { legFatigueOn } from './legFatigue';
import {
  combineSignals, decisionFor, earlierTodayPoints, easeBecause, easeExerciseReason, easeExplain, easeFact, easeFactShort, easeForgeExplain, easeAdvice, easeMacroFactorLine, easeSlots, easeSummary, easeTarget,
  easedLogIds, easeDoneLine, EASE_INDEX_EXPLAIN, EASE_SAVE_FAILED, EASE_STARTED_LINE, legDaySignals, LEG_EASE_INDEX, makeDecision, MAX_LEG_EASE_DAYS, moveLabel, moveLegNote, recordDecision, removeDecision, shouldOfferEase, soreFromNotes,
  type SignalDeps,
} from './legDayEase';

const { templates, program } = buildDefaultProgramData();
const TODAY = '2026-10-22';
const type = (id: string) => templates.find((t) => t.id === id)!.type;
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: type(templateId), completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const planned = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-10-19', status: 'planned' } as PlannedSession);
const note = (bodyPart: string, date: string, extra: Partial<InjuryNote> = {}): InjuryNote => ({ id: `n${n++}`, date, bodyPart, severity: 'licht', kind: 'spierpijn', ...extra });
const check = (date: string, legs: MorningCheckIn['legs']): MorningCheckIn => ({ date, legs });
const deps = (over: Partial<SignalDeps> = {}): SignalDeps => ({ logs: [], plannedSessions: [], templates, program, today: TODAY, injuries: [], checkIns: [], ...over });

describe('soreFromNotes', () => {
  it('een melding van spierpijn op een beenplek van vandaag telt', () => {
    expect(soreFromNotes([note('Knie links', TODAY)], [], TODAY)).toBe('spierpijn');
    expect(soreFromNotes([note('Quadriceps rechts', '2026-10-21')], [], TODAY)).toBe('spierpijn');
  });

  it('een melding van twee dagen terug telt niet meer', () => {
    expect(soreFromNotes([note('Quadriceps rechts', '2026-10-20')], [], TODAY)).toBeUndefined();
  });

  it('een melding op een plek die niet bij de benen hoort telt niet', () => {
    expect(soreFromNotes([note('Schouder links', TODAY), note('Onderrug midden', TODAY)], [], TODAY)).toBeUndefined();
  });

  it('stijf en pijn tellen niet als spierpijn', () => {
    expect(soreFromNotes([note('Knie links', TODAY, { kind: 'stijf' }), note('Kuit rechts', TODAY, { kind: 'pijn' }), note('Kuit links', TODAY, { kind: undefined })], [], TODAY)).toBeUndefined();
  });

  it('een weggehaalde melding telt niet', () => {
    expect(soreFromNotes([note('Knie links', TODAY, { resolvedDate: TODAY })], [], TODAY)).toBeUndefined();
  });

  it('de ochtendcheck van vandaag telt even zwaar: Spierpijn en Flinke spierpijn', () => {
    expect(soreFromNotes([], [check(TODAY, 'spierpijn')], TODAY)).toBe('spierpijn');
    expect(soreFromNotes([], [check(TODAY, 'flink')], TODAY)).toBe('flink');
  });

  it('het laatste antwoord wint: Fris of Wat stijf vandaag haalt een melding van gisteren weg', () => {
    const yesterday = [note('Knie links', '2026-10-21')];
    expect(soreFromNotes(yesterday, [check(TODAY, 'fris')], TODAY)).toBeUndefined();
    expect(soreFromNotes(yesterday, [check(TODAY, 'stijf')], TODAY)).toBeUndefined();
    // Een melding van vandaag zelf is niet ouder dan het antwoord.
    expect(soreFromNotes([note('Knie links', TODAY)], [check(TODAY, 'fris')], TODAY)).toBe('spierpijn');
  });
});

describe('earlierTodayPoints: gepland of gelogd', () => {
  it('een geplande harde loop telt als gepland, een gelogde niet', () => {
    const plan = [planned('r1', 'tpl_test_run', TODAY)];
    const e = earlierTodayPoints(TODAY, { logs: [], templates, program, plannedSessions: plan });
    expect(e.points).toBeGreaterThan(0);
    expect(e.planned).toBe(true);
    const done = log('tpl_test_run', TODAY, 25, { rpe: 9, completedAt: `${TODAY}T09:00:00`, plannedSessionId: 'r1' });
    expect(earlierTodayPoints(TODAY, { logs: [done], templates, program, plannedSessions: plan }).planned).toBeUndefined();
  });
});

describe('earlierTodayPoints', () => {
  const testRun = (date = TODAY, minutes = 25, rpe = 9) => log('tpl_test_run', date, minutes, { rpe, completedAt: `${date}T09:00:00` });

  it('een testloop van 25 minuten op RPE 9 geeft ruim 8 en minder dan 12 punten', () => {
    const e = earlierTodayPoints(TODAY, { logs: [testRun()], templates, program });
    expect(e.points).toBeGreaterThan(8);
    expect(e.points).toBeLessThan(12);
    expect(e.label).toBe('testloop');
    expect(e.morning).toBe(true);
  });

  it('een rustige loop van vandaag geeft niets (RPE onder 7)', () => {
    expect(earlierTodayPoints(TODAY, { logs: [log('tpl_easy_run', TODAY, 40, { rpe: 4 })], templates, program }).points).toBe(0);
    expect(earlierTodayPoints(TODAY, { logs: [testRun(TODAY, 25, 6)], templates, program }).points).toBe(0);
  });

  it('een korte of een rustige training telt niet, een kracht van vandaag ook niet', () => {
    expect(earlierTodayPoints(TODAY, { logs: [testRun(TODAY, 10, 9)], templates, program }).points).toBe(0);
    expect(earlierTodayPoints(TODAY, { logs: [log('tpl_lower_a', TODAY, 60, { rpe: 8 })], templates, program }).points).toBe(0);
  });

  it('een training van gisteren telt hier niet', () => {
    expect(earlierTodayPoints(TODAY, { logs: [testRun('2026-10-21')], templates, program }).points).toBe(0);
  });

  it('meer uren ertussen geeft minder punten, en spierschade blijft de eerste dag gelijk', () => {
    const logs = [log('tpl_hill_intervals', TODAY, 45, { rpe: 8, outdoorData: { durationMinutes: 45, elevationGainM: 150, elevationLossM: 200, source: 'manual' } })];
    const six = earlierTodayPoints(TODAY, { logs, templates, program }, 6).points;
    const twelve = earlierTodayPoints(TODAY, { logs, templates, program }, 12).points;
    expect(twelve).toBeLessThan(six);
    // De helft van het verschil zit in de intensiteit: de schade (afdalen) daalt niet binnen 24 uur.
    const none = earlierTodayPoints(TODAY, { logs: [testRun()], templates, program }, 24).points;
    expect(none).toBeLessThan(earlierTodayPoints(TODAY, { logs: [testRun()], templates, program }, 6).points);
  });

  it('de training zelf telt niet als eerder', () => {
    const run = testRun();
    expect(earlierTodayPoints(TODAY, { logs: [run], templates, program, excludeId: run.id }).points).toBe(0);
  });

  it('een loop na de middag heet eerder vandaag', () => {
    const evening = log('tpl_test_run', TODAY, 25, { rpe: 9, completedAt: `${TODAY}T18:30:00` });
    expect(earlierTodayPoints(TODAY, { logs: [evening], templates, program }).morning).toBe(false);
  });

  it('legFatigueOn zelf blijft een training van dezelfde dag overslaan (de planner verandert niet)', () => {
    const run = testRun();
    const inputs = { logs: [run], plannedSessions: [], templates, today: TODAY, program };
    expect(legFatigueOn(TODAY, inputs).index).toBe(0);
    expect(legFatigueOn(TODAY, inputs).contributions).toEqual([]);
  });
});

describe('de signalen van een dag', () => {
  const none = { points: 0 };
  it('rond de grens van 12: 11,9 geen reden, 12,1 wel, op de grens met "ongeveer"', () => {
    expect(combineSignals({ date: TODAY, earlier: none, baseIndex: 11.9 }).reasons).toEqual([]);
    const over = combineSignals({ date: TODAY, earlier: none, baseIndex: 12.1 });
    expect(over.reasons).toEqual(['index']);
    expect(over.nearLine).toBe(true);
    expect(combineSignals({ date: TODAY, earlier: none, baseIndex: 15 }).nearLine).toBe(false);
    expect(LEG_EASE_INDEX).toBe(12);
  });

  it('spierpijn is een reden bij een lage index', () => {
    const s = combineSignals({ date: TODAY, earlier: none, baseIndex: 3, sore: 'spierpijn' });
    expect(s.reasons).toEqual(['spierpijn']);
  });

  it('de volgorde is spierpijn, harde loop, index', () => {
    const s = combineSignals({ date: TODAY, earlier: { points: 9, label: 'testloop', morning: true }, baseIndex: 8, sore: 'flink' });
    expect(s.reasons).toEqual(['flink', 'harde-loop', 'index']);
    expect(s.index).toBe(17);
  });

  it('geen training of reden vandaag: niets', () => {
    expect(legDaySignals(TODAY, deps()).reasons).toEqual([]);
  });

  it('legDaySignals leest een testloop van vanochtend en een melding samen', () => {
    const run = log('tpl_test_run', TODAY, 25, { rpe: 9, completedAt: `${TODAY}T09:00:00` });
    const s = legDaySignals(TODAY, deps({ logs: [run], injuries: [note('Knie links', TODAY)] }));
    expect(s.reasons).toContain('spierpijn');
    expect(s.reasons).toContain('harde-loop');
    expect(s.index).toBeGreaterThan(8);
  });

  it('open pijn op een beenplek is een ander geval: de pijnrem, geen voorstel', () => {
    const s = legDaySignals(TODAY, deps({ injuries: [note('Knie links', '2026-10-20', { kind: 'pijn' }), note('Kuit links', TODAY)] }));
    expect(s.pain).toBe(true);
  });
});

describe('shouldOfferEase', () => {
  const sessions = [planned('s1', 'tpl_lower_a', TODAY)];
  const target = easeTarget(TODAY, sessions, templates, [])!;
  const sore = combineSignals({ date: TODAY, earlier: { points: 0 }, baseIndex: 4, sore: 'spierpijn' });
  const entry = (choice: LegEaseDay['choice']): LegEaseDay => makeDecision(sore, 's1', choice, new Date('2026-10-22T07:00:00Z'));

  it('een zware beendag met een reden krijgt de kaart met Lichter en een dag later', () => {
    expect(shouldOfferEase(sore, target, 'voorstel', [], [])).toEqual({ state: 'offer', kind: 'beendag', canEase: true, canMove: true });
  });

  it('gelogd, uit of zonder reden: niets', () => {
    expect(shouldOfferEase(sore, target, 'voorstel', [], [log('tpl_lower_a', TODAY, 60, { plannedSessionId: 's1' })]).state).toBe('none');
    expect(shouldOfferEase(sore, target, 'uit', [], []).state).toBe('none');
    expect(shouldOfferEase(combineSignals({ date: TODAY, earlier: { points: 0 }, baseIndex: 4 }), target, 'voorstel', [], []).state).toBe('none');
  });

  it('Liever niet van vandaag geeft geen tweede vraag; Lichter geeft de gemaakte staat', () => {
    expect(shouldOfferEase(sore, target, 'voorstel', [entry('liever-niet')], []).state).toBe('none');
    expect(shouldOfferEase(sore, target, 'voorstel', [entry('lichter')], []).state).toBe('eased');
  });

  it('een overgeslagen training of pijn op een plek geeft niets', () => {
    const skipped = { ...target, session: { ...target.session, status: 'skipped' as const } };
    expect(shouldOfferEase(sore, skipped, 'voorstel', [], []).state).toBe('none');
    expect(shouldOfferEase({ ...sore, pain: true }, target, 'voorstel', [], []).state).toBe('none');
  });

  it('een test of wedstrijd krijgt niets, die hebben hun eigen controle', () => {
    expect(easeTarget(TODAY, [planned('t1', 'tpl_test_run', TODAY)], templates, [])).toBeUndefined();
  });

  it('een kwaliteitsloop kan alleen een dag later, geen Lichter', () => {
    const quality = easeTarget(TODAY, [planned('q1', 'tpl_intervals', TODAY)], templates, [])!;
    expect(quality.kind).toBe('kwaliteit');
    expect(shouldOfferEase(sore, quality, 'voorstel', [], [])).toMatchObject({ state: 'offer', canEase: false, canMove: true });
  });

  it('de instelling "regel" geeft alleen de feitregel, zonder knoppen', () => {
    expect(shouldOfferEase(sore, target, 'regel', [], [])).toEqual({ state: 'line', kind: 'beendag', canEase: false, canMove: false });
  });

  it('een training van een andere dag krijgt niets', () => {
    const other = { ...target, session: { ...target.session, scheduledDate: '2026-10-23' } };
    expect(shouldOfferEase(sore, other, 'voorstel', [], []).state).toBe('none');
  });
});

describe('keuzes bewaren', () => {
  const s = combineSignals({ date: TODAY, earlier: { points: 0 }, baseIndex: 4, sore: 'spierpijn' });
  it('per datum en training staat er een, de laatste 60 blijven', () => {
    const a = makeDecision(s, 's1', 'liever-niet', new Date('2026-10-22T06:00:00Z'));
    const b = makeDecision(s, 's1', 'lichter', new Date('2026-10-22T07:00:00Z'));
    expect(recordDecision(recordDecision(undefined, a), b)).toEqual([b]);
    let list: LegEaseDay[] | undefined;
    for (let i = 0; i < 70; i++) list = recordDecision(list, { ...a, date: `2026-${i < 35 ? '08' : '09'}-${String((i % 28) + 1).padStart(2, '0')}`, plannedSessionId: `p${i}` });
    expect(list).toHaveLength(MAX_LEG_EASE_DAYS);
  });

  it('terugzetten haalt de keuze weg', () => {
    const b = makeDecision(s, 's1', 'lichter');
    expect(removeDecision([b], TODAY, 's1')).toBeUndefined();
    expect(decisionFor([b], TODAY, 's1')?.choice).toBe('lichter');
  });

  it('easedLogIds kent de logs van een training waar je Lichter koos', () => {
    const l = log('tpl_lower_a', TODAY, 60, { plannedSessionId: 's1' });
    const other = log('tpl_lower_a', TODAY, 60, { plannedSessionId: 's2' });
    expect([...easedLogIds([l, other], [makeDecision(s, 's1', 'lichter')])]).toEqual([l.id]);
    expect(easedLogIds([l], [makeDecision(s, 's1', 'liever-niet')]).size).toBe(0);
  });
});

describe('easeSlots', () => {
  const slot = (over: Partial<ExercisePrescription>): ExercisePrescription => ({ id: 'x', exerciseName: 'Barbell Back Squat', sets: 4, reps: '6-8', priority: 'core', ...over });
  const squat = slot({ id: 'squat', rpe: 8 });

  it('een oefening met drie sets of meer verliest de laatste en krijgt minstens 3 herhalingen over', () => {
    const r = easeSlots([squat], 'standaard');
    expect(r.slots[0].sets).toBe(3);
    expect(r.slots[0].rpe).toBe(7);
    expect(r.setsRemoved).toBe(1);
    expect(r.lighter).toBe(1);
  });

  it('een oefening met twee sets houdt er twee', () => {
    expect(easeSlots([slot({ sets: 2 })], 'standaard').slots[0].sets).toBe(2);
  });

  it('alleen gewicht laat het aantal sets staan', () => {
    const r = easeSlots([squat], 'alleen-gewicht');
    expect(r.slots[0].sets).toBe(4);
    expect(r.slots[0].rpe).toBe(7);
    expect(r.setsRemoved).toBe(0);
  });

  it('extra licht vraagt 4 herhalingen over', () => {
    expect(easeSlots([squat], 'extra').slots[0].rpe).toBe(6);
  });

  it('een voorschrift zonder RPE krijgt de reserve van Lichter', () => {
    expect(easeSlots([slot({ id: 'squat' })], 'standaard').slots[0].rpe).toBe(7);
  });

  it('een voorschrift met meer reserve houdt die reserve', () => {
    const r = easeSlots([slot({ rpe: 5 })], 'standaard');
    expect(r.slots[0].rpe).toBe(5);
    expect(r.lighter).toBe(0);
  });

  it('een set tot falen wordt een gewone set; MacroFactor-sets met meer reserve houden die', () => {
    const targets = [
      { repsLow: 6, repsHigh: 8, rir: 1 },
      { repsLow: 6, repsHigh: 8, rir: 5 },
      { repsLow: 9, repsHigh: 9, rir: 0, failure: true },
    ];
    const r = easeSlots([slot({ id: 'squat', setTargets: targets, sets: 3 })], 'alleen-gewicht');
    expect(r.slots[0].setTargets).toEqual([
      { repsLow: 6, repsHigh: 8, rir: 3 },
      { repsLow: 6, repsHigh: 8, rir: 5 },
      { repsLow: 9, repsHigh: 9, rir: 3 },
    ]);
    expect(r.slots[0].setTargets!.some((t) => t.failure)).toBe(false);
  });

  it('bij set-voor-set voorschriften vervalt de laatste set', () => {
    const targets = [1, 2, 3].map(() => ({ repsLow: 6, repsHigh: 8, rir: 1 }));
    const r = easeSlots([slot({ id: 'squat', setTargets: targets, sets: 3 })], 'standaard');
    expect(r.slots[0].setTargets).toHaveLength(2);
    expect(r.slots[0].sets).toBe(2);
  });

  it('een extra oefening (optional) vervalt, core blijft altijd staan', () => {
    const extra = slot({ id: 'lunge', exerciseName: 'Walking Lunge', priority: 'optional' });
    const r = easeSlots([extra, squat], 'standaard');
    expect(r.slots.map((s) => s.id)).toEqual(['squat']);
    expect(r.dropped).toHaveLength(1);
    expect(easeSlots([extra], 'alleen-gewicht').slots).toHaveLength(1);
  });

  it('bovenlichaam en romp blijven zoals voorgeschreven', () => {
    const bench = slot({ id: 'bench', exerciseName: 'Bench Press', rpe: 9, sets: 4 });
    const plank = slot({ id: 'plank', exerciseName: 'Plank', reps: '45s', priority: 'optional' });
    const r = easeSlots([bench, plank], 'standaard');
    expect(r.slots).toEqual([bench, plank]);
    expect(r.setsRemoved).toBe(0);
  });

  it('verandert het voorschrift zelf nooit', () => {
    const frozen = Object.freeze({ ...squat });
    expect(() => easeSlots([frozen], 'standaard')).not.toThrow();
    expect(frozen.sets).toBe(4);
  });
});

describe('de teksten', () => {
  const sore = combineSignals({ date: TODAY, earlier: { points: 9.5, label: 'testloop', morning: true }, baseIndex: 5.5, sore: 'spierpijn' });
  const all = [
    easeFact(sore), easeFactShort(sore), EASE_INDEX_EXPLAIN, easeAdvice(true, true), easeAdvice(true, false), easeAdvice(false, true), easeExplain('standaard'), easeExplain('alleen-gewicht'), easeExplain('extra', false),
    easeForgeExplain('standaard'), easeForgeExplain('alleen-gewicht', false), easeDoneLine('standaard'), easeDoneLine('alleen-gewicht'), easeDoneLine('extra', false), easeMacroFactorLine('extra'), EASE_STARTED_LINE, EASE_SAVE_FAILED,
    easeSummary({ setsRemoved: 3, lighter: 2, dropped: ['Side plank'] }), easeExerciseReason(3, easeBecause(sore.reasons)), moveLabel('2026-10-23'),
  ];

  it('noemt de redenen letterlijk, met de beenindex erbij', () => {
    expect(easeFact(sore)).toBe('Je meldde spierpijn in je benen en je liep vanochtend je testloop. Beenindex 15.');
    expect(easeFactShort(sore)).toBe('Spierpijn gemeld en vanochtend een testloop. Beenindex 15.');
    expect(easeFact(combineSignals({ date: TODAY, earlier: { points: 0 }, baseIndex: 12, sore: 'flink' }))).toBe('Je meldde flinke spierpijn in je benen. Beenindex 12.');
    expect(easeFact(combineSignals({ date: TODAY, earlier: { points: 0 }, baseIndex: 14.1 }))).toBe('Beenindex 14. Je benen dragen nog veel van de afgelopen dagen.');
    expect(easeFact(combineSignals({ date: TODAY, earlier: { points: 0 }, baseIndex: 12.4 }))).toContain('ongeveer 12');
  });

  it('een geplande, nog niet gelogde loop zegt dat je hem vandaag loopt', () => {
    const planned = combineSignals({ date: TODAY, earlier: { points: 9.5, label: 'testloop', planned: true }, baseIndex: 5.5, sore: 'spierpijn' });
    expect(easeFact(planned)).toBe('Je meldde spierpijn in je benen en je loopt vandaag ook je testloop. Beenindex 15.');
    expect(easeFactShort(planned)).toBe('Spierpijn gemeld en vandaag ook een testloop. Beenindex 15.');
    const hard = combineSignals({ date: TODAY, earlier: { points: 6, label: 'loop', planned: true }, baseIndex: 8 });
    expect(easeFact(hard)).toBe('Je loopt vandaag ook hard. Beenindex ongeveer 14.');
    expect(easeFact(hard)).not.toContain('liep');
  });

  it('de zin na Lichter volgt de manier en of het gewicht meekomt', () => {
    expect(easeDoneLine('standaard')).toBe('Lichter gemaakt. In Forge staan minder gewicht en minder sets klaar, met zeker 3 herhalingen over.');
    expect(easeDoneLine('alleen-gewicht')).not.toContain('sets');
    expect(easeDoneLine('extra')).toContain('zeker 4');
    expect(easeDoneLine('standaard', false)).toContain('Het gewicht blijft zoals voorgeschreven');
    expect(easeDoneLine('standaard', false)).not.toContain('minder gewicht');
  });

  it('geen gedachtestreepjes in nieuwe tekst', () => {
    for (const text of all) expect(text).not.toMatch(/[–—]/);
  });

  it('de vaste woorden en de uitleg bij het getal', () => {
    expect(easeAdvice(true, true)).toContain('Doortrainen mag');
    expect(EASE_INDEX_EXPLAIN).toContain('Beenindex: wat je benen nog dragen');
    expect(easeExplain('standaard')).toBe('Lichter is minder gewicht, zeker 3 herhalingen over en een set minder per oefening. Het blijft dezelfde training.');
    expect(easeExplain('standaard', false)).toContain('Het gewicht blijft zoals voorgeschreven');
    expect(easeSummary({ setsRemoved: 3, lighter: 2, dropped: ['Side plank'] })).toBe('Lichter gemaakt: 3 sets minder, 2 oefeningen lichter, Side plank vervalt.');
    expect(easeMacroFactorLine('standaard')).toBe('Doe je de training in MacroFactor? Kies daar zelf een lichtere set met zeker 3 herhalingen over.');
    expect(easeExerciseReason(3, 'spierpijn')).toBe('Lichter door spierpijn: zeker 3 herhalingen over.');
    expect(moveLabel('2026-10-23')).toBe('Naar vrijdag');
    expect(easeBecause(['spierpijn', 'harde-loop'])).toBe('spierpijn');
    expect(easeBecause(['harde-loop', 'index'])).toBe('je loop van vandaag');
    expect(easeBecause(['index'])).toBe('vermoeide benen');
  });
});

describe('de stille regel bij het verplaatsen', () => {
  // Zware beendag woensdag, een harde loop dinsdag: de index op woensdag is hoog.
  const sessions = [planned('legs', 'tpl_lower_a', '2026-10-24')];
  const hardLogs = () => [log('tpl_hill_intervals', '2026-10-23', 60, { rpe: 9, outdoorData: { durationMinutes: 60, elevationGainM: 300, elevationLossM: 600, source: 'manual' } })];

  it('noemt de dag en de beenindex als die boven 12 komt, zonder iets te blokkeren', () => {
    const out = moveLegNote({ sessionId: 'legs', toDate: '2026-10-24', deps: deps({ logs: hardLogs(), plannedSessions: sessions }), mode: 'voorstel' });
    expect(out?.line).toMatch(/^Op zaterdag is je beenindex ongeveer \d+/);
    expect(out?.line).toContain('Je kunt hem zo plannen, of een dag later.');
    expect(out?.explain).toContain('Tot 12 kan een zware dag.');
  });

  it('een fris been geeft niets', () => {
    expect(moveLegNote({ sessionId: 'legs', toDate: '2026-10-28', deps: deps({ plannedSessions: sessions }), mode: 'voorstel' })).toBeUndefined();
  });

  it('de instelling Uit zet de regel ook uit', () => {
    expect(moveLegNote({ sessionId: 'legs', toDate: '2026-10-24', deps: deps({ logs: hardLogs(), plannedSessions: sessions }), mode: 'uit' })).toBeUndefined();
  });

  it('een andere training dan een zware beendag of harde training krijgt geen regel', () => {
    const easy = [planned('easy', 'tpl_easy_run', '2026-10-24')];
    expect(moveLegNote({ sessionId: 'easy', toDate: '2026-10-24', deps: deps({ logs: hardLogs(), plannedSessions: easy }), mode: 'voorstel' })).toBeUndefined();
  });
});
