import { describe, it, expect, afterEach } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { FATIGUE_THRESHOLDS, LEG_FACTOR_MAX, LEG_FACTOR_MIN, fatigueStatus, legFatigueOn, type LegFatigueInputs } from './legFatigue';
import { freshnessAt, legFactor, setLegFactor, withLegFactor } from './scheduler';
import { validateWeeks, repairWeeks, type CheckInput } from './weekValidator';
import { legDaySignals } from './legDayEase';
import { legDayLine } from './forgeWorkout';
import { legsTiredAt } from './strengthHistory';
import { suggestLegs, maxEffortYesterday } from './morningCard';
import {
  addLegDecision, archiveLegAnswers, calibrationPoints, changesPlanningFactor, currentLegFactor, legFactorsOf, legLearning,
  MAX_STEP, MIN_STEP, type LegLearningInput,
} from './legIndexLearning';
import type { LegAnswer, LegFactorEntry } from '../models/legIndex';
import type { LegFeeling, MorningCheckIn } from '../models/checkIn';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

// De regels uit docs/onderzoek/Beenindex leert van je ochtenden.md, F: wat nooit soepeler mag. Elke regel apart,
// telkens met een factor van 0,7 tegen 1, plus een eigenschapstest over vele willekeurige reeksen. Alles nagemaakt.

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const D = '2026-10-20';
const log = (templateId: string, date: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `${templateId}-${date}`, templateId, type: byId.get(templateId)?.type ?? 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`,
  variant: 'full', durationMinutes: 60, rpe: 8, source: 'manual', ...extra,
});
const heavy = [log('tpl_lower_a', addDays(D, -1)), log('tpl_hill_intervals', addDays(D, -2)), log('tpl_long_run', addDays(D, -3))];
const kneePain: Partial<SessionLog> = { painReports: [{ area: 'Knie', score: 5 }] };
const akkoord = (factor: number, at = '2026-09-01T07:00:00.000Z'): LegFactorEntry[] => [{ at, factor, source: 'akkoord' }];
const inputs = (over: Partial<LegFatigueInputs> = {}): LegFatigueInputs => ({ logs: heavy, plannedSessions: [], templates, today: D, ...over });

afterEach(() => setLegFactor(1));
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };

describe('F1 de planner: test- en wedstrijdvrijheid rekent met max(1, k)', () => {
  it('freshnessAt met 0,7 is gelijk aan 1, met 1,3 zwaarder', () => {
    const at = (k: number) => withLegFactor(k, () => freshnessAt(D, [], byId, heavy).index);
    expect(at(0.7)).toBe(at(1));
    expect(at(0.5)).toBe(at(1));
    expect(at(1.3)).toBeGreaterThan(at(1));
  });
  it('het register gaat nooit onder 1, ook niet met een kapot getal', () => {
    for (const k of [0.7, 0.1, -3, Number.NaN, Infinity, undefined]) {
      setLegFactor(k);
      expect(legFactor()).toBeGreaterThanOrEqual(1);
    }
    setLegFactor(9);
    expect(legFactor()).toBe(1.4);
  });
  it('de advieskant en de weekcontrole rekenen de index alleen via freshnessAt', () => {
    for (const f of ['adviceTestRun.ts', 'adviceCompute.ts', 'adviceShared.ts', 'weekValidator.ts']) {
      const src = nodeFs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/legFatigueOn\(/);
      expect(src, f).not.toMatch(/setLegFactor\(/);
    }
  });
});

describe('F2 en F5 de testweek en de 48 uur in de weekcontrole', () => {
  const MONDAY = '2026-10-26';
  const DAYS = ['tpl_easy_run', 'tpl_lower_a', 'tpl_test_run', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
  const week: PlannedSession[] = DAYS.map((templateId, i) => ({ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'planned', order: i }));
  const input: CheckInput = { sessions: week, logs: [], templates, today: '2026-10-21', restDay: 4, goalDay: '2027-08-01' };
  it('met 0,7 precies dezelfde bevindingen en herstellingen als met 1', () => {
    const base = withLegFactor(1, () => ({ f: validateWeeks(input), r: repairWeeks(input).repairs }));
    const low = withLegFactor(0.7, () => ({ f: validateWeeks(input), r: repairWeeks(input).repairs }));
    expect(low).toEqual(base);
    expect(base.f.length).toBeGreaterThan(0);
  });
  it('met 1,4 nooit minder bevindingen', () => {
    const base = withLegFactor(1, () => validateWeeks(input).length);
    expect(withLegFactor(1.4, () => validateWeeks(input).length)).toBeGreaterThanOrEqual(base);
  });
});

describe('F3 Lichter en Forge: de drempel van 12 met max(1, k)', () => {
  const deps = (factor?: number) => ({ logs: heavy, plannedSessions: [], templates, today: D, injuries: [], checkIns: [], factor });
  it('legDaySignals met 0,7 is gelijk aan 1', () => {
    expect(legDaySignals(D, deps(0.7))).toEqual(legDaySignals(D, deps(1)));
    expect(legDaySignals(D, deps(1.4)).baseIndex).toBeGreaterThan(legDaySignals(D, deps(1)).baseIndex);
  });
  it('de regel op het scherm van Forge met 0,7 is gelijk aan 1', () => {
    const line = (factor: number) => legDayLine(D, { logs: heavy, templates, factor });
    expect(line(0.7)).toBe(line(1));
  });
});

describe('F4 Je benen zijn nog moe in de krachthistorie met max(1, k)', () => {
  it('legsTiredAt met 0,7 is gelijk aan 1 en zonder factor', () => {
    const at = (factor?: number) => legsTiredAt(D, undefined, { logs: [log('tpl_lower_a', addDays(D, -4)), log('tpl_hill_intervals', addDays(D, -5))], templates, factor });
    expect(at(0.7)).toEqual(at(1));
    expect(at(0.7)).toEqual(at(undefined));
  });
});

describe('F6 pijn: +3 punten en nooit fris', () => {
  it('ook met 0,7 telt pijn volledig en zegt de status nooit fris', () => {
    const light = [log('tpl_easy_run', addDays(D, -1), kneePain)];
    for (const k of [0.7, 1, 1.4]) {
      const r = legFatigueOn(D, inputs({ logs: light, factor: k }));
      const sum = r.contributions.reduce((n, c) => n + c.points, 0);
      expect(r.painRecent).toBe(true);
      expect(r.index).toBeCloseTo(Math.round((sum + 3) * 10) / 10, 5);
      expect(fatigueStatus(r, 'test')).not.toBe('fris');
      expect(fatigueStatus(r, 'race')).not.toBe('fris');
      expect(suggestLegs(r)).not.toBe('fris');
    }
  });
});

describe('F7 de spierpijnvloer blijft exact en wordt nooit geschaald', () => {
  it('8,5 bij spierpijn, 12 bij flink en 8,5 de dag erna, met 0,7 en 1,4', () => {
    const quiet = [log('tpl_easy_run', addDays(D, -8))];
    for (const k of [0.7, 1, 1.4]) {
      expect(legFatigueOn(D, inputs({ logs: quiet, factor: k, soreness: [{ date: D, level: 'spierpijn' }] })).index).toBe(8.5);
      expect(legFatigueOn(D, inputs({ logs: quiet, factor: k, soreness: [{ date: D, level: 'flink' }] })).index).toBe(12);
      expect(legFatigueOn(D, inputs({ logs: quiet, factor: k, soreness: [{ date: addDays(D, -1), level: 'flink' }] })).index).toBe(8.5);
    }
  });
});

describe('F8 de drempels veranderen niet', () => {
  it('test 8 en 10, wedstrijd 3 en 5, hard 12', () => {
    expect(FATIGUE_THRESHOLDS).toEqual({ test: { fresh: 8, doubt: 10 }, race: { fresh: 3, doubt: 5 }, hard: { fresh: 12, doubt: 12 } });
  });
});

describe('F9 de voorinvulling: nooit flinke spierpijn, nooit fris bij beenpijn', () => {
  it('over vele indexen en factoren', () => {
    const rnd = prng(9);
    for (let i = 0; i < 400; i++) {
      const k = 0.7 + rnd() * 0.7;
      const pain = rnd() < 0.3;
      const logs = randomLogs(rnd, 5).map((l, j) => (pain && j === 0 ? { ...l, completedDate: addDays(D, -1), ...kneePain } : l));
      const r = legFatigueOn(D, inputs({ logs, factor: k }));
      const s = suggestLegs(r);
      expect(s).not.toBe('flink');
      if (r.painRecent) expect(s).not.toBe('fris');
    }
  });
});

describe('F10 de ochtend na een test blijft een open vraag', () => {
  it('ook met een eigen factor (de vraag kent geen factor)', () => {
    const after = maxEffortYesterday({ logs: [log('tpl_test_run', addDays(D, -1))], templates, today: D, enabled: true });
    expect(after?.kind).toBe('test');
  });
});

describe('F11 de ijkpunten: zonder vloer, zonder pijnpunten, zonder de geldende factor', () => {
  it('dezelfde punten met of zonder een Akkoord van 1,4', () => {
    const input = learnInput(prng(11), 'zwaar');
    const plain = legLearning({ ...input, mode: 'aan' });
    const withK = legLearning({ ...input, mode: 'aan', factorLog: akkoord(1.4) });
    expect(plain.status).toBe('klaar');
    expect(withK.status).toBe('klaar');
    if (plain.status === 'klaar' && withK.status === 'klaar') expect(withK.fit).toBe(plain.fit);
  });
  it('een ochtend met beenpijn ervoor telt niet', () => {
    const answers: LegAnswer[] = [{ date: D, legs: 'fris' }];
    const logs = [log('tpl_lower_a', addDays(D, -1)), log('tpl_hill_intervals', addDays(D, -2))];
    expect(calibrationPoints({ today: D, answers, logs, templates })).toHaveLength(1);
    expect(calibrationPoints({ today: D, answers, logs: [{ ...logs[0], ...kneePain }, logs[1]], templates })).toHaveLength(0);
  });
});

describe('F12 alleen na Akkoord; Uit en terug naar de standaard zetten direct 1', () => {
  it('een voorstel zonder Akkoord verandert niets', () => {
    const input = learnInput(prng(12), 'zwaar');
    const l = legLearning({ ...input, mode: 'aan' });
    expect(l.status === 'klaar' && l.proposal).toBeTruthy();
    expect(legFactorsOf({})).toEqual({ safe: 1, shown: 1 });
    expect(currentLegFactor(addLegDecision(undefined, 'liever-niet', 1.15, '2026-10-01T07:00:00.000Z'))).toBe(1);
  });
  it('Uit en Standaard zetten 1, ook als er daarna weer aan staat', () => {
    const log1 = akkoord(1.3);
    expect(legFactorsOf({ legFactorLog: log1 })).toEqual({ safe: 1.3, shown: 1.3 });
    expect(legFactorsOf({ legFactorLog: log1, legIndexLearning: 'uit' })).toEqual({ safe: 1, shown: 1 });
    const off = addLegDecision(log1, 'uit', 1.3, '2026-10-01T07:00:00.000Z');
    expect(legFactorsOf({ legFactorLog: off })).toEqual({ safe: 1, shown: 1 });
    const std = addLegDecision(akkoord(0.8), 'standaard', 0.8, '2026-10-01T07:00:00.000Z');
    expect(legFactorsOf({ legFactorLog: std })).toEqual({ safe: 1, shown: 1 });
  });
  it('alleen wat de planning raakt gaat langs de planning', () => {
    expect(changesPlanningFactor({}, { legFactorLog: akkoord(0.85) })).toBe(false);
    expect(changesPlanningFactor({}, { legFactorLog: akkoord(1.15) })).toBe(true);
    expect(changesPlanningFactor({ legFactorLog: akkoord(1.15) }, { legFactorLog: akkoord(1.15), legIndexLearning: 'uit' })).toBe(true);
  });
});

describe('F13 alleen toevoegen', () => {
  it('een besluit is een nieuwe rij; bestaande rijen blijven gelijk', () => {
    const before = akkoord(1.15);
    const frozen = JSON.stringify(before);
    const after = addLegDecision(before, 'standaard', 1.15, '2026-10-02T07:00:00.000Z');
    expect(JSON.stringify(before)).toBe(frozen);
    expect(after.slice(0, 1)).toEqual(before);
    expect(after[1]).toEqual({ at: '2026-10-02T07:00:00.000Z', factor: 1, source: 'standaard' });
  });
  it('het archief herschrijft geen bestaande rij', () => {
    const archive: LegAnswer[] = [{ date: '2026-08-01', legs: 'stijf', from: 'zelf' }];
    const before: MorningCheckIn[] = [{ date: '2026-08-01', legs: 'fris' }, { date: '2026-08-02', legs: 'spierpijn' }];
    const after = archiveLegAnswers(archive, before, [before[1]], '2026-09-01');
    expect(after?.[0]).toEqual(archive[0]);
  });
});

describe('eigenschap: vele willekeurige reeksen', () => {
  it('begrensd, kleine stappen, deterministisch, en wat beslist nooit lichter dan het model', () => {
    const rnd = prng(2026);
    const seen = { klaar: 0, voorstel: 0, omhoog: 0, omlaag: 0 };
    for (let i = 0; i < 300; i++) {
      const kind = (['zwaar', 'fris', 'mix', 'stijf', 'goed'] as const)[i % 5];
      const input = learnInput(rnd, kind);
      const current = [undefined, 0.85, 1, 1.15, 1.4][Math.floor(rnd() * 5)];
      const factorLog = current === undefined ? undefined : akkoord(current, '2026-01-01T07:00:00.000Z');
      const a = legLearning({ ...input, mode: 'aan', factorLog });
      expect(legLearning({ ...input, mode: 'aan', factorLog })).toEqual(a);
      if (a.status === 'klaar') {
        seen.klaar++;
        if (a.proposal) { seen.voorstel++; if (a.proposal.up) seen.omhoog++; else seen.omlaag++; }
        expect(a.target).toBeGreaterThanOrEqual(LEG_FACTOR_MIN);
        expect(a.target).toBeLessThanOrEqual(LEG_FACTOR_MAX);
        if (a.proposal) {
          const step = Math.abs(a.proposal.factor - a.current);
          expect(step).toBeLessThanOrEqual(MAX_STEP + 1e-9);
          expect(step).toBeGreaterThanOrEqual(MIN_STEP - 0.05 - 1e-9);
          expect(a.proposal.factor).toBeGreaterThanOrEqual(LEG_FACTOR_MIN);
          expect(a.proposal.factor).toBeLessThanOrEqual(LEG_FACTOR_MAX);
        }
      }
      // Met elk besluit dat erop zou volgen: de planner en Lichter nooit onder het model.
      const k = a.status === 'klaar' && a.proposal ? a.proposal.factor : current ?? 1;
      const { safe } = legFactorsOf({ legFactorLog: akkoord(k) });
      expect(safe).toBeGreaterThanOrEqual(1);
      const logs = input.logs.filter((l) => l.completedDate < input.today);
      const model = withLegFactor(1, () => freshnessAt(input.today, [], byId, logs).index);
      expect(withLegFactor(safe, () => freshnessAt(input.today, [], byId, logs).index)).toBeGreaterThanOrEqual(model);
    }
    // De reeksen raken echt uitkomsten en voorstellen in beide richtingen, anders zegt deze test niets.
    expect(seen.klaar).toBeGreaterThan(50);
    expect(seen.omhoog).toBeGreaterThan(10);
    expect(seen.omlaag).toBeGreaterThan(10);
  });

  it('langdurig eenzijdig: elke dag spierpijn of elke dag fris blijft binnen 0,7 tot 1,4 en zet hoogstens 0,15 per stap', () => {
    for (const kind of ['zwaar', 'fris'] as const) {
      const input = learnInput(prng(kind === 'zwaar' ? 1 : 2), kind, 400);
      let log: LegFactorEntry[] = [];
      let today = input.today;
      for (let round = 0; round < 12; round++) {
        const l = legLearning({ ...input, today, mode: 'aan', factorLog: log });
        if (l.status === 'klaar' && l.proposal) {
          expect(Math.abs(l.proposal.factor - l.current)).toBeLessThanOrEqual(MAX_STEP + 1e-9);
          log = addLegDecision(log, 'akkoord', l.proposal.factor, `${today}T07:00:00.000Z`);
        }
        // Binnen 28 dagen na een Akkoord geen nieuw voorstel.
        const soon = legLearning({ ...input, today: addDays(today, 10), mode: 'aan', factorLog: log });
        if (log.length > 0) expect(soon.status === 'klaar' && soon.proposal).toBeFalsy();
        today = addDays(today, 29);
      }
      const k = currentLegFactor(log);
      expect(k).toBeGreaterThanOrEqual(0.7);
      expect(k).toBeLessThanOrEqual(1.4);
    }
  });
});

// --- hulp ---------------------------------------------------------------------------------------
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const LOAD = ['tpl_lower_a', 'tpl_hill_intervals', 'tpl_long_run', 'tpl_easy_run', 'tpl_lower_b'].filter((id) => byId.has(id));
function randomLogs(rnd: () => number, n: number, end = D, span = 12): SessionLog[] {
  return Array.from({ length: n }, (_, i) => log(LOAD[Math.floor(rnd() * LOAD.length)]!, addDays(end, -1 - Math.floor(rnd() * span)), { id: `r-${i}-${Math.floor(rnd() * 1e6)}`, rpe: 6 + Math.floor(rnd() * 4) }));
}

// Een historie van 80 dagen met elke dag een beendag of loop en een antwoord dat steeds de ene kant op wijst.
function learnInput(rnd: () => number, kind: 'zwaar' | 'fris' | 'mix' | 'stijf' | 'goed', days = 80): LegLearningInput {
  const today = addDays(D, days - 80);
  const logs: SessionLog[] = [];
  const answers: LegAnswer[] = [];
  for (let i = days; i >= 1; i--) {
    const date = addDays(today, -i);
    if (i % 2 === 0) logs.push(log(LOAD[Math.floor(rnd() * 3)]!, date, { id: `h-${date}` }));
    const pick = (): LegFeeling | 'goed' => {
      if (kind === 'zwaar') return 'spierpijn';
      if (kind === 'fris') return 'fris';
      if (kind === 'stijf') return 'stijf';
      if (kind === 'goed') return 'goed';
      return (['fris', 'spierpijn', 'stijf'] as const)[Math.floor(rnd() * 3)]!;
    };
    answers.push({ date: addDays(date, 1), legs: pick(), from: 'zelf' });
  }
  return { today, answers: answers.filter((a) => a.date <= today && a.date > addDays(today, -90)), logs, templates };
}
