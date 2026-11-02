import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { applyKindAmounts, kindAmountLine, kindAmountSummary, kindCostLine, parseKindAmounts, scaledMinutes, trainingKindOf, visibleKinds } from './kindAmount';
import { resolveEffectiveFullDuration, withDurationScope } from './substitutions';
import { planPass, type PlanPassContext } from './planPass';
import { validateWeeks } from './weekValidator';

// Sporten die meetellen, stap 8: Hoeveel per soort. Nagemaakte weken.
const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const TODAY = '2026-11-02';
// Rust op maandag; kracht di en do, rustig wo, heuvels za, lang zo. Vrijdag is vrij.
const DAYS: [number, string][] = [[1, 'tpl_upper_a'], [2, 'tpl_easy_run'], [3, 'tpl_lower_a'], [5, 'tpl_hill_intervals'], [6, 'tpl_long_run']];
const week = (monday: string): PlannedSession[] => DAYS.map(([d, templateId], i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned', order: i }));
const sessions = [...week('2026-11-02'), ...week('2026-11-09')];
let n = 0;
const ctx = (over: Partial<PlanPassContext> = {}): PlanPassContext => ({ today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 1, until: '2026-11-15', newId: () => `k${++n}`, ...over });

describe('de soorten', () => {
  it('een sjabloon krijgt zijn soort via zijn rol', () => {
    expect(trainingKindOf(tpl('tpl_upper_a'))).toBe('strength');
    expect(trainingKindOf(tpl('tpl_long_run'))).toBe('long');
    expect(trainingKindOf(tpl('tpl_hill_intervals'))).toBe('hard');
    expect(trainingKindOf(tpl('tpl_easy_run'))).toBe('easy');
    expect(trainingKindOf(tpl('tpl_ruck_walk'))).toBe('ruck');
    expect(trainingKindOf(tpl('tpl_bike'))).toBe('cycling');
    expect(trainingKindOf(tpl('tpl_herstel'))).toBeUndefined();
    expect(trainingKindOf(tpl('tpl_test_run'))).toBeUndefined();
    // Een opgeslagen sjabloon van voor de nieuwe rollen.
    expect(trainingKindOf({ ...tpl('tpl_ruck_walk'), roles: ['extra'] })).toBe('ruck');
  });

  it('alleen wat er is, de rugzak alleen met een tocht', () => {
    const pattern = DAYS.map(([, id]) => tpl(id));
    expect(visibleKinds(pattern, { trek: false }).map((k) => k.label)).toEqual(['Kracht', 'Lange duur', 'Harde training', 'Rustige duur']);
    expect(visibleKinds(pattern, { trek: true }).map((k) => k.id)).toContain('ruck');
  });

  it('leest defensief en vat samen', () => {
    expect(parseKindAmounts({ strength: 'more', long: 'veel', yoga: 'less' })).toEqual({ value: { strength: 'more' }, skipped: 2 });
    expect(kindAmountSummary(undefined)).toEqual({ value: 'Alles normaal' });
    expect(kindAmountSummary({ strength: 'more', long: 'less' })).toEqual({ value: '2 anders', sub: 'Kracht meer, Lange duur minder' });
  });

  it('zegt wat het in minuten betekent, en wat Minder op je doel kost', () => {
    expect(kindAmountLine(45, 2, undefined)).toBe('Normaal: 45 minuten, 2 keer per week. Meer: 50 minuten.');
    expect(kindAmountLine(60, 1, 'less')).toBe('Normaal: 60 minuten, 1 keer per week. Minder: 50 minuten.');
    expect(kindCostLine('ruck', 'less', { trek: true })).toContain('Toch doen?');
    expect(kindCostLine('strength', 'less', { trek: true, key: 'long' })).toBeUndefined();
  });
});

describe('eerst de duur', () => {
  it('15 procent, afgerond op 5 minuten, nooit onder 15; Meer niet boven de sessiepiek', () => {
    expect(scaledMinutes(60, 'more')).toBe(70);
    expect(scaledMinutes(60, 'less')).toBe(50);
    expect(scaledMinutes(60, undefined)).toBe(60);
    expect(scaledMinutes(15, 'less')).toBe(15);
    expect(scaledMinutes(60, 'more', 65)).toBe(65);
  });

  it('de duur van een training volgt je keuze, alleen in de scope', () => {
    const t = tpl('tpl_upper_a');
    const plain = resolveEffectiveFullDuration(t, '2026-11-03', program);
    const more = withDurationScope({ kindAmounts: { strength: 'more' } }, () => resolveEffectiveFullDuration(t, '2026-11-03', program));
    expect(more).toBe(scaledMinutes(plain, 'more'));
    expect(resolveEffectiveFullDuration(t, '2026-11-03', program)).toBe(plain);
    // Een andere soort verandert niet.
    expect(withDurationScope({ kindAmounts: { strength: 'more' } }, () => resolveEffectiveFullDuration(tpl('tpl_easy_run'), '2026-11-04', program))).toBe(resolveEffectiveFullDuration(tpl('tpl_easy_run'), '2026-11-04', program));
  });
});

describe('dan het aantal', () => {
  it('Meer: een rustige loop extra op een vrije dag, alleen waar de weekcheck niets nieuws vindt', () => {
    const result = planPass(sessions, ctx({ kindAmounts: { easy: 'more' } }));
    const extras = result.sessions.filter((s) => s.amount?.change === 'extra');
    expect(extras).toHaveLength(2);
    expect(extras.map((s) => [s.templateId, s.scheduledDate])).toEqual([['tpl_easy_run', '2026-11-06'], ['tpl_easy_run', '2026-11-13']]);
    const before = validateWeeks({ sessions, logs: [], templates, today: TODAY, restDay: 1 }).length;
    expect(validateWeeks({ sessions: result.sessions, logs: [], templates, today: TODAY, restDay: 1 }).length).toBeLessThanOrEqual(before);
  });

  it('Meer harde training past niet als het de beendagen te dicht maakt: dan blijft het bij langer', () => {
    const result = planPass(sessions, ctx({ kindAmounts: { hard: 'more' } }));
    for (const s of result.sessions.filter((x) => x.amount?.change === 'extra')) {
      expect(validateWeeks({ sessions: result.sessions, logs: [], templates, today: TODAY, restDay: 1 }).some((f) => f.sessionIds.includes(s.id))).toBe(false);
    }
  });

  it('Minder: nooit minder dan één van een soort', () => {
    const result = planPass(sessions, ctx({ kindAmounts: { strength: 'less', long: 'less' } }));
    const out = result.sessions.filter((s) => s.amount?.change === 'left_out');
    expect(out.every((s) => s.status === 'skipped' && s.templateId === 'tpl_lower_a')).toBe(true);
    expect(out).toHaveLength(2);
    expect(result.sessions.filter((s) => s.templateId === 'tpl_long_run' && s.status !== 'skipped')).toHaveLength(2);
  });

  it('Normaal zet terug wat Meer of Minder deed, en een tweede ronde verandert niets', () => {
    const changed = planPass(sessions, ctx({ kindAmounts: { easy: 'more', strength: 'less' } }));
    expect(planPass(changed.sessions, ctx({ kindAmounts: { easy: 'more', strength: 'less' } })).repairs).toEqual([]);
    const back = planPass(changed.sessions, ctx({ kindAmounts: null }));
    expect(back.sessions.filter((s) => s.amount)).toEqual([]);
    expect(back.sessions.map((s) => [s.id, s.status]).sort()).toEqual(sessions.map((s) => [s.id, s.status]).sort());
  });

  it('zonder keuze is de ronde zoals hij was', () => {
    expect(JSON.stringify(planPass(sessions, ctx({ kindAmounts: null })).sessions)).toBe(JSON.stringify(planPass(sessions, ctx()).sessions));
    expect(applyKindAmounts(sessions, undefined, { today: TODAY, newId: () => 'x', check: { logs: [], templates, today: TODAY, restDay: 1 } }).repairs).toEqual([]);
  });
});
