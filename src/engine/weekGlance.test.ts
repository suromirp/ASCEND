import { describe, expect, it } from 'vitest';
import { attentionLines, nextWeekLine, sportLines, weekCountLine } from './weekGlance';
import { buildWeekReview, type WeekReview } from './weekReview';
import { weekNameAt } from './weekLabel';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { PlanChangeProposal } from '../models/planChange';

const { templates } = buildDefaultProgramData();
// Basisfase van vier weken vanaf 28 september: week 4 (19 oktober) is de rustweek.
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }, { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 4 }] };
const ps = (id: string, templateId: string, date: string, weekStartDate: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate, status: 'planned', order: 0 });
const log = (plannedSessionId: string, templateId: string, date: string, durationMinutes = 64): SessionLog => ({
  id: `l-${plannedSessionId}`, plannedSessionId, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes, source: 'manual',
});
const weekOf = (monday: string, prefix: string): PlannedSession[] => {
  const d = (n: number) => { const x = new Date(`${monday}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  return [ps(`${prefix}ua`, 'tpl_upper_a', d(1), monday), ps(`${prefix}la`, 'tpl_lower_a', d(2), monday), ps(`${prefix}lr`, 'tpl_long_run', d(6), monday)];
};
const review = (weekStart: string, plannedSessions: PlannedSession[], logs: SessionLog[], asOf: string, extra: Partial<Parameters<typeof buildWeekReview>[0]> = {}): WeekReview =>
  buildWeekReview({ weekStart, plannedSessions, logs, templates, program, planChangeLog: [], asOf, ...extra })!;

describe('de regel onder de dagen', () => {
  it('een lopende week: alleen gedaan en de tijd, zonder "hard" en zonder wat vandaag nog staat', () => {
    const W = '2026-10-05';
    const r = review(W, weekOf(W, 'a'), [log('aua', 'tpl_upper_a', '2026-10-06')], '2026-10-07');
    expect(weekCountLine(r)).toBe('1 gedaan · 1:04 uur');
    expect(weekCountLine(r)).not.toMatch(/hard|vandaag/);
  });

  it('een afgelopen week: "x van y gedaan"', () => {
    const W = '2026-10-05';
    const r = review(W, weekOf(W, 'a'), [log('aua', 'tpl_upper_a', '2026-10-06'), log('ala', 'tpl_lower_a', '2026-10-07')], '2026-10-14');
    expect(weekCountLine(r)).toBe('2 van 3 gedaan · 2:08 uur');
  });

  it('een lege afgelopen week houdt de bestaande zin', () => {
    const W = '2026-10-05';
    expect(weekCountLine(review(W, weekOf(W, 'a'), [], '2026-10-14'))).toBe('Geen trainingen deze week. Volgende week volgt het plan.');
  });
});

describe('een losse training naast gedaan', () => {
  const W = '2026-10-05';

  it('alleen een losse training: dat staat er met zijn woord, met de tijd', () => {
    const loose: SessionLog = { ...log('x', 'tpl_easy_run', '2026-10-05', 56), plannedSessionId: undefined };
    const r = review(W, weekOf(W, 'a'), [loose], '2026-10-07');
    expect(r.done).toBe(0);
    expect(r.extraLogged).toBe(1);
    expect(weekCountLine(r)).toBe('0 gedaan · 1 losse training · 56 min');
  });

  it('herstel op een rustdag telt nergens: geen losse training en geen tijd (zoals bovenaan Week)', () => {
    const rest = ps('arest', 'tpl_herstel', '2026-10-05', W);
    const r = review(W, [rest, ...weekOf(W, 'a')], [log('arest', 'tpl_herstel', '2026-10-05', 30)], '2026-10-07');
    expect(r.minutes).toBe(0);
    expect(weekCountLine(r)).toBe('0 gedaan');
  });

  it('gepland gedaan en twee losse: beide tellen, de tijd is van alles', () => {
    const extra = (id: string): SessionLog => ({ ...log(id, 'tpl_easy_run', '2026-10-06', 30), plannedSessionId: undefined });
    const r = review(W, weekOf(W, 'a'), [log('aua', 'tpl_upper_a', '2026-10-06'), extra('x1'), extra('x2')], '2026-10-07');
    expect(weekCountLine(r)).toBe('1 gedaan · 2 losse trainingen · 2:04 uur');
  });

  it('niets gedaan en niets los: geen tijd', () => {
    expect(weekCountLine({ ...review(W, weekOf(W, 'a'), [], '2026-10-06'), minutes: 0 })).toBe('0 gedaan');
  });
});

describe('de dag zelf telt nog niet als voorbij', () => {
  it('een training van vandaag die nog open staat bleef niet liggen', () => {
    const W = '2026-10-05';
    const r = review(W, weekOf(W, 'a'), [log('aua', 'tpl_upper_a', '2026-10-06')], '2026-10-07');
    expect(r.missed).toEqual([]);
    expect(attentionLines(r).map((a) => a.key)).not.toContain('missed');
  });

  it('een dag later wel: dan staat hij er één keer, zonder amber stip', () => {
    const W = '2026-10-05';
    const r = review(W, weekOf(W, 'a'), [log('aua', 'tpl_upper_a', '2026-10-06')], '2026-10-08');
    const missed = attentionLines(r).filter((a) => a.key === 'missed');
    expect(missed).toHaveLength(1);
    expect(missed[0].warn).toBe(false);
  });
});

describe('waar je op let', () => {
  const base = review('2026-10-05', weekOf('2026-10-05', 'a'), [], '2026-10-06');

  it('een lichte klacht uit de lijfvraag staat één keer, met de plek als woord en een amber stip', () => {
    const r: WeekReview = { ...base, pain: ['knie'], weeklyCheck: { weekStart: base.weekStart, trouble: 'wel_gewoon', area: 'Knie', severity: 'mild' } };
    const lines = attentionLines(r);
    expect(lines).toEqual([{ key: 'check', label: 'Knie', value: 'Lichte klacht. Zakt hij niet, meld hem volgende week weer.', warn: true }]);
    expect(lines.filter((l) => /knie/i.test(`${l.label} ${l.value}`))).toHaveLength(1);
  });

  it('niet kunnen trainen: de waarschuwing blijft volledig', () => {
    const r: WeekReview = { ...base, weeklyCheck: { weekStart: base.weekStart, trouble: 'niet_kunnen', area: 'Enkel' } };
    expect(attentionLines(r)[0].value).toContain('laat het bekijken als het niet binnen 2 tot 3 weken beter wordt');
  });

  it('een matige klacht en minder kunnen trainen houden de omvang gelijk', () => {
    expect(attentionLines({ ...base, weeklyCheck: { weekStart: base.weekStart, trouble: 'wel_gewoon', severity: 'matig' } })[0]).toMatchObject({ label: 'Lijf', warn: true, value: expect.stringContaining('omvang') });
    expect(attentionLines({ ...base, weeklyCheck: { weekStart: base.weekStart, trouble: 'minder', area: 'Rug' } })[0]).toMatchObject({ label: 'Rug', value: expect.stringContaining('omvang') });
  });

  it('pijn uit een log op een andere plek is een tweede regel; hoogstens twee regels', () => {
    const r: WeekReview = { ...base, pain: ['knie', 'enkel 2 keer'], missed: ['Upper A'], heavier: 2, weeklyCheck: { weekStart: base.weekStart, trouble: 'wel_gewoon', area: 'Knie', severity: 'mild' } };
    const lines = attentionLines(r);
    expect(lines.map((l) => l.key)).toEqual(['check', 'pain']);
    expect(lines[1].value).toMatch(/^Enkel 2 keer\./);
  });

  it('niets om op te letten: geen regel en geen vervangende zin', () => {
    expect(attentionLines({ ...base, missed: [], pain: [], heavier: 0, lighter: 0, advice: ['Iets'] })).toEqual([]);
  });

  it('lichter gevoeld heeft geen stip', () => {
    expect(attentionLines({ ...base, missed: [], lighter: 2 })).toEqual([expect.objectContaining({ key: 'lighter', warn: false })]);
  });
});

describe('volgende week en de rustweek, uit het programma', () => {
  it('de week voor een rustweek: "Rustweek · tijd"', () => {
    const W = '2026-10-12';
    const next = weekOf('2026-10-19', 'n');
    const r = review(W, [...weekOf(W, 'a'), ...next], [], '2026-10-13');
    expect(r.next?.rest).toBe(true);
    expect(nextWeekLine(r.next!).value).toMatch(/^Rustweek · \d/);
    expect(nextWeekLine(r.next!).value).not.toMatch(/week 4|Basisfase/);
    expect(r.advice.some((a) => a.startsWith('Volgende week is een rustweek'))).toBe(true);
  });

  it('de rustweek zelf heet alleen "Rustweek"', () => {
    expect(weekNameAt(program, '2026-10-19')).toBe('Rustweek');
    expect(review('2026-10-19', weekOf('2026-10-19', 'n'), [], '2026-10-20').label).toBe('Rustweek');
  });

  it('een gewone week: fase voorop, met de week van de fase', () => {
    const W = '2026-10-05';
    const r = review(W, [...weekOf(W, 'a'), ...weekOf('2026-10-12', 'n')], [], '2026-10-06');
    expect(r.label).toBe('Basisfase, week 2 van 4');
    expect(r.next?.rest).toBe(false);
    expect(nextWeekLine(r.next!).value).toMatch(/^Basisfase, week 3 van 4 · /);
    expect(nextWeekLine(r.next!).sub).toMatch(/^Belangrijkste: lange duurloop, /);
  });

  it('een rustweek die je doortraint heet geen rustweek', () => {
    const through: Program = { ...program, skippedRestWeeks: ['2026-10-19'] };
    expect(weekNameAt(through, '2026-10-19')).toBe('Basisfase, week 4 van 4');
  });

  it('geen planning voor volgende week: geen regel', () => {
    expect(review('2026-10-05', weekOf('2026-10-05', 'a'), [], '2026-10-06').next).toBeUndefined();
  });

  it('buiten het programma alleen de tijd', () => {
    expect(nextWeekLine({ title: 'Deze week', minutes: 45, rest: false })).toEqual({ value: '45 min', sub: undefined });
  });
});

describe('een week met vakantie of een tocht', () => {
  it('wat de vakantie weghaalde telt niet en blijft niet liggen; de weeknaam blijft die van het programma', () => {
    const W = '2026-10-05';
    const sessions = weekOf(W, 'a').map((s) => ({ ...s, status: 'skipped' as const }));
    const leave: PlanChangeProposal = {
      id: 'v', trigger: 'leave_added', issue: '', alternatives: [], consequences: '', explanation: '', createdAt: '2026-10-01T10:00:00Z', resolution: 'accepted',
      changes: sessions.map((s) => ({ action: 'remove', plannedSessionId: s.id })) as PlanChangeProposal['changes'],
    };
    const r = review(W, sessions, [], '2026-10-14', { planChangeLog: [leave] });
    expect(r.planned).toBe(0);
    expect(r.missed).toEqual([]);
    expect(attentionLines(r)).toEqual([]);
    expect(r.label).toBe('Basisfase, week 2 van 4');
  });
});

describe('kleine woorden', () => {
  it('de verdeling per sport voor Je trainingen', () => {
    expect(sportLines({ perSport: ['Hardlopen: 18,4 km, 320 m D+'] } as WeekReview)).toEqual(['Hardlopen 18,4 km · 320 m omhoog']);
  });

  it('geen gedachtestreepjes in de woorden', () => {
    const r: WeekReview = { ...review('2026-10-05', weekOf('2026-10-05', 'a'), [], '2026-10-14'), pain: ['knie'], heavier: 2 };
    for (const l of attentionLines(r)) expect(`${l.label}${l.value}`).not.toMatch(/[–—]/);
  });
});
