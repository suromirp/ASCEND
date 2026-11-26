import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { MorningCheckIn, LegFeeling } from '../models/checkIn';
import type { LegAnswer, LegFactorEntry } from '../models/legIndex';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';
import { legFatigueOn } from './legFatigue';
import {
  archiveLegAnswers, calibrationPoints, currentLegFactor, fitFactor, legAnswerHistory, legIndexSafeFactor, legIndexShownFactor, legLearning,
  learningLine, MAX_STEP, MIN_WEIGHT, type LegLearningInput, type LegLearningMode,
} from './legIndexLearning';
import { suggestLegs } from './morningCard';

// Nagemaakte data: Lower A om de drie dagen, 60 minuten op RPE 8, honderd dagen lang.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-11-20';
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`,
  variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const LOGS: SessionLog[] = Array.from({ length: 34 }, (_, i) => log('tpl_lower_a', addDays(TODAY, -100 + i * 3), 60, { rpe: 8 }));
const mOn = (date: string) => legFatigueOn(date, { logs: LOGS.filter((l) => l.completedDate < date), plannedSessions: [], templates, today: date }).contributions.reduce((s, c) => s + c.points, 0);
const days = Array.from({ length: 90 }, (_, i) => addDays(TODAY, -89 + i));

const base = (answers: LegAnswer[], over: Partial<LegLearningInput & { mode: LegLearningMode }> = {}) => ({ today: TODAY, answers, logs: LOGS, templates, mode: 'aan' as LegLearningMode, ...over });
const every = (legs: LegAnswer['legs'], from?: LegAnswer['from']): LegAnswer[] => days.map((date) => ({ date, legs, ...(from ? { from } : {}) }));

describe('het voorbeeld klopt: de reeks geeft genoeg ijkpunten', () => {
  it('de modelindex ligt op de meeste ochtenden boven 4', () => {
    expect(days.filter((d) => mOn(d) >= 4).length).toBeGreaterThan(40);
  });
});

describe('de gevallen van de wetenschapper', () => {
  it('ochtenden die allemaal zwaarder zeggen: het eerste voorstel is hoogstens 1,15', () => {
    const l = legLearning(base(every('spierpijn', 'zelf')));
    expect(l.status).toBe('klaar');
    if (l.status !== 'klaar') return;
    expect(l.proposal?.up).toBe(true);
    expect(l.proposal!.factor).toBeLessThanOrEqual(1 + MAX_STEP + 1e-9);
    expect(l.proposal!.factor).toBeGreaterThan(1);
    expect(l.proposal!.line).toContain('Reken met 115 procent?');
  });

  it('ochtenden die allemaal frisser zeggen: het eerste voorstel is hoogstens 0,15 omlaag, met de zin over de planning', () => {
    const l = legLearning(base(every('fris', 'zelf')));
    expect(l.status).toBe('klaar');
    if (l.status !== 'klaar') return;
    expect(l.proposal?.up).toBe(false);
    expect(l.proposal!.factor).toBeGreaterThanOrEqual(1 - MAX_STEP - 1e-9);
    expect(l.proposal!.line).toContain('De planning blijft voorzichtig rekenen.');
  });

  it('alleen bevestigingen van het voorstel: de factor blijft 1', () => {
    const answers: LegAnswer[] = days.map((date) => {
      const r = legFatigueOn(date, { logs: LOGS.filter((l) => l.completedDate < date), plannedSessions: [], templates, today: date });
      return { date, legs: suggestLegs(r) ?? 'fris', from: 'voorstel' };
    });
    const l = legLearning(base(answers));
    if (l.status === 'klaar') { expect(l.target).toBe(1); expect(l.proposal).toBeUndefined(); }
    else expect(l.status).toBe('te-weinig');
  });

  it('een oud antwoord zonder herkomst dat gelijk is aan het voorstel telt half', () => {
    const date = days.find((d) => mOn(d) > 12)!;
    const r = legFatigueOn(date, { logs: LOGS.filter((l) => l.completedDate < date), plannedSessions: [], templates, today: date });
    expect(suggestLegs(r)).toBe('spierpijn');
    expect(mOn(date)).toBeLessThan(17); // dan bevat het interval (12/m, oneindig) de band niet helemaal
    expect(calibrationPoints(base([{ date, legs: 'spierpijn' }]))[0].weight).toBe(0.5);
    expect(calibrationPoints(base([{ date, legs: 'spierpijn', from: 'zelf' }]))[0].weight).toBe(1);
    expect(calibrationPoints(base([{ date, legs: 'fris' }]))[0].weight).toBe(1);
  });

  it('"Gaat goed" telt half: evenveel ochtenden geven minder gewicht dan zelf Fris kiezen', () => {
    const goed = legLearning(base(every('goed')));
    const fris = legLearning(base(every('fris', 'zelf')));
    const w = (l: ReturnType<typeof legLearning>) => (l.status === 'uit' ? 0 : l.weight);
    expect(w(goed)).toBeCloseTo(w(fris) / 2, 5);
    // Gekrompen naar 1: minder gewicht geeft een doel dichter bij 1.
    if (goed.status === 'klaar' && fris.status === 'klaar') expect(Math.abs(goed.target - 1)).toBeLessThanOrEqual(Math.abs(fris.target - 1));
  });

  it('een tegenstrijdige historie: past slecht, geen voorstel', () => {
    // Zwaar na een zware dag zeggen dat je fris bent, en op een lichte dag spierpijn.
    const answers: LegAnswer[] = days.map((date) => ({ date, legs: mOn(date) > 10 ? 'fris' : 'spierpijn', from: 'zelf' }));
    const l = legLearning(base(answers));
    expect(l.status).toBe('past-slecht');
    expect(learningLine(l)).toBe('Je ochtenden en de beenindex lopen vaak uiteen, in beide richtingen. Een factor lost dat niet op.');
  });

  it('dezelfde historie geeft altijd dezelfde uitkomst, ook in een andere volgorde', () => {
    const a = every('spierpijn', 'zelf');
    const one = legLearning(base(a));
    const two = legLearning(base([...a].reverse()));
    expect(two).toEqual(one);
    expect(legLearning(base(a))).toEqual(one);
  });
});

describe('genoeg gewicht', () => {
  it('onder 20 gewogen ijkpunten: geen uitkomst, wel hoeveel er nog nodig zijn', () => {
    const answers = every('spierpijn', 'zelf').filter((a) => mOn(a.date) >= 4 && mOn(a.date) < 12).slice(0, 10);
    const l = legLearning(base(answers));
    expect(l.status).toBe('te-weinig');
    if (l.status === 'te-weinig') { expect(l.weight).toBe(10); expect(l.needed).toBe(MIN_WEIGHT - 10); }
    expect(learningLine(l)).toBe('Nog ongeveer 10 ochtenden met een duidelijk antwoord nodig voor een eerste uitkomst.');
  });

  it('een lage modelindex (onder 4) telt niet', () => {
    const quiet = [log('tpl_easy_run', addDays(TODAY, -5), 30)];
    expect(calibrationPoints(base([{ date: addDays(TODAY, -4), legs: 'spierpijn', from: 'zelf' }], { logs: quiet }))).toHaveLength(0);
  });

  it('alleen de laatste 90 dagen tellen', () => {
    expect(calibrationPoints(base([{ date: addDays(TODAY, -91), legs: 'spierpijn', from: 'zelf' }]))).toHaveLength(0);
  });
});

describe('wat niet meetelt', () => {
  const hard = days.filter((d) => mOn(d) >= 4 && mOn(d) < 12);
  const one = hard[hard.length - 1];
  const ans: LegAnswer[] = [{ date: one, legs: 'spierpijn', from: 'zelf' }];

  it('telt gewoon mee zonder uitzondering', () => {
    expect(calibrationPoints(base(ans))).toHaveLength(1);
  });
  it('tijdens een ziekte en drie dagen erna niet', () => {
    expect(calibrationPoints(base(ans, { illness: [{ id: 'z', kind: 'above_neck', startDate: addDays(one, -6), endDate: addDays(one, -3) } as never] }))).toHaveLength(0);
    expect(calibrationPoints(base(ans, { illness: [{ id: 'z', kind: 'above_neck', startDate: addDays(one, -8), endDate: addDays(one, -4) } as never] }))).toHaveLength(1);
    expect(calibrationPoints(base(ans, { illness: [{ id: 'z', kind: 'above_neck', startDate: addDays(one, -1) } as never] }))).toHaveLength(0);
  });
  it('tijdens een tocht en twee dagen erna niet', () => {
    expect(calibrationPoints(base(ans, { leave: [{ id: 't', kind: 'trek', startDate: addDays(one, -4), endDate: addDays(one, -2) } as never] }))).toHaveLength(0);
    expect(calibrationPoints(base(ans, { leave: [{ id: 't', kind: 'free_days', startDate: addDays(one, -4), endDate: addDays(one, -2) } as never] }))).toHaveLength(1);
  });
  it('bij beenpijn in de 72 uur ervoor niet', () => {
    const lastLog = [...LOGS].filter((l) => l.completedDate < one).pop()!;
    const sore = LOGS.map((l) => (l.id === lastLog.id ? { ...l, painReports: [{ area: 'Knie', score: 6 }] } : l)) as SessionLog[];
    const r = legFatigueOn(one, { logs: sore.filter((l) => l.completedDate < one), plannedSessions: [], templates, today: one });
    expect(r.painRecent).toBe(true);
    expect(calibrationPoints(base(ans, { logs: sore }))).toHaveLength(0);
  });
  it('spierpijn alleen in je bovenlichaam niet', () => {
    expect(calibrationPoints(base([{ ...ans[0], upper: true }]))).toHaveLength(0);
  });
});

describe('de factor', () => {
  const at = (d: string) => `${d}T08:00:00.000Z`;
  it('zonder besluit 1; na Akkoord de factor; Liever niet verandert niets; standaard en uit zetten 1', () => {
    expect(currentLegFactor(undefined)).toBe(1);
    const log: LegFactorEntry[] = [{ at: at('2026-10-01'), factor: 1.15, source: 'akkoord' }];
    expect(currentLegFactor(log)).toBe(1.15);
    expect(currentLegFactor([...log, { at: at('2026-10-02'), factor: 1.3, source: 'liever-niet' }])).toBe(1.15);
    expect(currentLegFactor([...log, { at: at('2026-10-03'), factor: 1, source: 'standaard' }])).toBe(1);
    expect(currentLegFactor([...log, { at: at('2026-10-03'), factor: 1, source: 'uit' }])).toBe(1);
    expect(currentLegFactor(log, 'uit')).toBe(1);
  });
  it('een kapot getal is 1, een getal buiten de band wordt begrensd', () => {
    expect(currentLegFactor([{ at: at('2026-10-01'), factor: Number.NaN, source: 'akkoord' }])).toBe(1);
    expect(currentLegFactor([{ at: at('2026-10-01'), factor: 9, source: 'akkoord' }])).toBe(1.4);
    expect(currentLegFactor([{ at: at('2026-10-01'), factor: 0.1, source: 'akkoord' }])).toBe(0.7);
  });
  it('wat beslist rekent nooit onder 1; de woorden volgen de factor binnen de band', () => {
    expect(legIndexSafeFactor(0.7)).toBe(1);
    expect(legIndexSafeFactor(1.25)).toBe(1.25);
    expect(legIndexSafeFactor(Number.NaN)).toBe(1);
    expect(legIndexShownFactor(0.7)).toBe(0.7);
    expect(legIndexShownFactor(3)).toBe(1.4);
  });
  it('uit: geen uitkomst en factor 1', () => {
    expect(legLearning(base(every('spierpijn', 'zelf'), { mode: 'uit' }))).toEqual({ status: 'uit', current: 1 });
  });
  it('hoogstens één voorstel per 28 dagen', () => {
    const answers = every('spierpijn', 'zelf');
    const recent: LegFactorEntry[] = [{ at: at(addDays(TODAY, -10)), factor: 1.15, source: 'liever-niet' }];
    const l = legLearning({ ...base(answers), factorLog: recent });
    expect(l.status === 'klaar' && l.proposal).toBeFalsy();
    const old: LegFactorEntry[] = [{ at: at(addDays(TODAY, -29)), factor: 1.15, source: 'liever-niet' }];
    const l2 = legLearning({ ...base(answers), factorLog: old });
    expect(l2.status === 'klaar' && l2.proposal?.factor).toBe(1.15);
  });
  it('na een Akkoord gaat de volgende stap verder vanaf de geldende factor, hoogstens 0,15', () => {
    const log: LegFactorEntry[] = [{ at: at(addDays(TODAY, -40)), factor: 1.15, source: 'akkoord' }];
    const l = legLearning({ ...base(every('spierpijn', 'zelf')), factorLog: log });
    if (l.status !== 'klaar' || !l.proposal) throw new Error(`geen voorstel: ${JSON.stringify(l)}`);
    expect(l.proposal.from).toBe(1.15);
    expect(l.proposal.factor).toBeLessThanOrEqual(1.4);
    expect(l.proposal.factor - 1.15).toBeLessThanOrEqual(MAX_STEP + 1e-9);
  });
});

describe('fitFactor', () => {
  it('bij gelijk verlies de k het dichtst bij 1', () => {
    expect(fitFactor([{ date: 'x', m: 10, lo: 0.5, hi: 2, weight: 1 }])).toBe(1);
  });
  it('blijft tussen 0,5 en 2', () => {
    expect(fitFactor([{ date: 'x', m: 10, lo: 5, hi: Infinity, weight: 1 }])).toBe(2);
    expect(fitFactor([{ date: 'x', m: 10, lo: 0, hi: 0.1, weight: 1 }])).toBe(0.5);
  });
});

describe('het archief van antwoorden', () => {
  const check = (date: string, legs?: LegFeeling, extra: Partial<MorningCheckIn> = {}): MorningCheckIn => ({ date, ...(legs ? { legs } : {}), ...extra });
  it('wat vooraan uit de 60 ochtendchecks valt, komt in het archief; de rest niet', () => {
    const before = [check('2026-09-01', 'stijf'), check('2026-09-02', undefined, { allNormal: true }), check('2026-09-03', 'fris')];
    const after = before.slice(2);
    expect(archiveLegAnswers(undefined, before, after, TODAY)).toEqual([{ date: '2026-09-01', legs: 'stijf' }, { date: '2026-09-02', legs: 'goed' }]);
  });
  it('vandaag ongedaan maken of wissen komt er niet in', () => {
    const before = [check('2026-11-19', 'fris'), check(TODAY, 'spierpijn')];
    expect(archiveLegAnswers(undefined, before, [before[0]], TODAY)).toBeUndefined();
  });
  it('een bestaande rij verandert nooit, ouder dan 180 dagen valt weg', () => {
    const archive: LegAnswer[] = [{ date: '2026-05-01', legs: 'fris' }, { date: '2026-09-01', legs: 'stijf' }];
    const out = archiveLegAnswers(archive, [check('2026-09-01', 'flink'), check('2026-10-01', 'fris')], [check('2026-10-01', 'fris')], TODAY)!;
    expect(out).toEqual([{ date: '2026-09-01', legs: 'stijf' }]);
  });
  it('de historie: het archief van voor de oudste ochtendcheck, en de ochtendchecks zelf', () => {
    const archive: LegAnswer[] = [{ date: '2026-09-01', legs: 'stijf' }, { date: '2026-10-05', legs: 'flink' }];
    const checks = [check('2026-10-01', 'fris', { legsFrom: 'voorstel' }), check('2026-10-05', 'stijf')];
    expect(legAnswerHistory(archive, checks)).toEqual([
      { date: '2026-09-01', legs: 'stijf' }, { date: '2026-10-01', legs: 'fris', from: 'voorstel' }, { date: '2026-10-05', legs: 'stijf' },
    ]);
  });
});
