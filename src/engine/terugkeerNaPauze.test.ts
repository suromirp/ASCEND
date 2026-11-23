(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
// Terugkeer na een pauze (I-124, docs/beslissingen/2026-11-23-terugkeer-na-pauze.md). Het verhaal met nagemaakte,
// verschoven datums: laatste echte training op dag D (woensdag 13 januari 2027), vanaf D+3 vijf dagen zonder
// sportschool met daarin twee dagen ziek, terug op D+8, vanaf D+12 (maandag) een volle week. Eerder stond het
// voorstel alleen op D+8 tot en met D+11 en telde de pauze vanaf het einde van de periode.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { exerciseById } from '../data/exercises';
import type { PlannedSession, SessionLog, SetLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { proposeReentry, reentryEffect, reentryForgeLighter, reentryNote, type ReentryInputs } from './reentry';
import { pastLeaveLine, validateLeaveDraft } from './leave';
import { planLeaveChange } from './leaveProposal';
import type { PlanPassContext } from './planPass';
import { deriveSessionStatus } from './sessionStatus';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { prescribe } from './strengthModel';
import { resolveStrengthSettings } from './strengthSettings';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };

let n = 0;
const ps = (templateId: string, scheduledDate: string): PlannedSession => ({
  id: `p${++n}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0,
});
const done = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((t) => t.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

// Een gewone week: maandag herstel, dan vijf trainingen.
function week(monday: string): PlannedSession[] {
  return [
    ps('tpl_herstel', monday),
    ps('tpl_upper_a', addDays(monday, 1)),
    ps('tpl_lower_a', addDays(monday, 2)),
    ps('tpl_easy_run', addDays(monday, 3)),
    ps('tpl_hill_intervals', addDays(monday, 5)),
    ps('tpl_mountain_hike', addDays(monday, 6)),
  ];
}

const D = '2027-01-13';
const day = (k: number) => addDays(D, k);
const plan = ['2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25', '2027-02-01'].flatMap(week);
// Alles gedaan tot en met dag D; daarna niets meer, ook geen herstel dat telt.
const logs = plan.filter((s) => s.scheduledDate <= D && s.templateId !== 'tpl_herstel').map(done);
const noGym: LeavePeriod = { id: 'weg', kind: 'no_gym', startDate: day(3), endDate: day(7) };
const ill: IllnessEpisode[] = [{ id: 'ziek', kind: 'below_neck', startDate: day(5), endDate: day(6) }];
const input = (over: Partial<ReentryInputs> = {}): ReentryInputs => ({
  program, plannedSessions: plan, logs, templates, today: day(12), illnessEpisodes: ill, leavePeriods: [noGym],
  choice: 'three_quarters', respondedIds: new Set(), ...over,
});

// De klok op D+12, zodat datums in de zinnen zonder jaartal komen; een toets die de klok zelf zet, zet hem terug.
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2027-01-25T09:00:00+01:00')); });
afterEach(() => vi.useRealTimers());

describe('het verhaal: terug na een periode zonder sportschool met ziekte', () => {
  it('D+12: een voorstel, de pauze vanaf de laatste training, het venster vanaf vandaag', () => {
    const p = proposeReentry(input())!;
    expect(p).toMatchObject({ id: `reentry:${day(8)}`, cause: 'ill_away', lastTraining: D, pauseDays: 12, trainedSince: false, week: { from: day(12), until: day(18), factor: 0.75 } });
    // De twee weken ervoor waren vol: zonder de pauze vanaf de laatste training kwam er geen voorstel.
    expect(p.done).toBeGreaterThanOrEqual(4);
    expect(reentryEffect(p, day(12))).toBe('Je laatste training was wo 13 januari, 12 dagen geleden. Daartussen was je ziek en weg. Een gewone week heeft er 5. Voorstel: vanaf vandaag tot en met zo 31 januari duren je trainingen driekwart van de gewone tijd. Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn. Met Liever niet blijft alles staan.');
  });

  it('de hele eerste week na terugkomst; D+15, de dag erna, niet meer', () => {
    // D+8 is de laatste dag van Weer opbouwen na twee dagen ziek: dat schema doet het dan al.
    expect(proposeReentry(input({ today: day(8) }))).toBeUndefined();
    expect(proposeReentry(input({ today: day(9) }))?.week).toMatchObject({ from: day(9), until: day(15) });
    expect(proposeReentry(input({ today: day(14) }))?.week).toMatchObject({ from: day(14), until: day(20) });
    expect(proposeReentry(input({ today: day(15) }))).toBeUndefined();
    // Nog weg: niets.
    expect(proposeReentry(input({ today: day(7) }))).toBeUndefined();
  });

  it('na Liever niet niet meer voor deze terugkomst; na Akkoord niet dubbel', () => {
    const declined = new Set([`reentry:${day(8)}`]);
    for (const k of [9, 12, 13, 14]) expect(proposeReentry(input({ today: day(k), respondedIds: declined }))).toBeUndefined();
    const weeks = [{ from: day(12), until: day(18), factor: 0.75 }];
    expect(proposeReentry(input({ today: day(13), weeks }))).toBeUndefined();
  });

  it('als advies op Vandaag met Liever niet en het eigen voorstel; nooit stil', () => {
    const adviceInputs: AdviceInputs = {
      logs, plannedSessions: plan, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(),
      asOf: day(12), illnessEpisodes: ill, leave: [noGym],
    };
    const a = computeAdvice(adviceInputs).find((x) => x.ruleId === 'REENTRY')!;
    expect(a.reentry).toEqual({ from: day(12), until: day(18), factor: 0.75 });
    expect(a.effect).toMatch(/^Je laatste training was wo 13 januari, 12 dagen geleden\./);
  });

  it('een test of wedstrijd in het venster: geen voorstel; net erbuiten wel', () => {
    expect(proposeReentry(input({ plannedSessions: [...plan, ps('tpl_test_run', day(16))] }))).toBeUndefined();
    expect(proposeReentry(input({ plannedSessions: [...plan, ps('tpl_test_run', day(19))] }))).toBeDefined();
    expect(proposeReentry(input({ plannedSessions: [...plan, ps('tpl_race', day(17))] }))).toBeUndefined();
  });

  it('een korte pauze met een volle week ervoor: geen voorstel (de pauze is niet langer dan zeven dagen)', () => {
    // Laatste training op D+2 (een extra loop) en vandaag D+9: zeven dagen, geen pauze.
    const extra = { ...done(ps('tpl_easy_run', day(2))), id: 'extra' } as SessionLog;
    expect(proposeReentry(input({ logs: [...logs, extra], today: day(9) }))).toBeUndefined();
    // Een dag eerder getraind: acht dagen, wel.
    const earlier = { ...extra, completedDate: day(1) } as SessionLog;
    expect(proposeReentry(input({ logs: [...logs, earlier], today: day(9) }))).toMatchObject({ pauseDays: 8 });
  });
});

describe('de grens van de dag zelf, in Europe/Amsterdam', () => {
  afterEach(() => vi.useRealTimers());

  it('om 23.59 op D+14 nog het voorstel, om 00.01 op D+15 niet meer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-27T22:59:00Z')); // 23.59 in Amsterdam, woensdag 27 januari = D+14
    expect(todayISO()).toBe(day(14));
    expect(proposeReentry(input({ today: todayISO() }))).toBeDefined();
    vi.setSystemTime(new Date('2027-01-27T23:01:00Z')); // 00.01 in Amsterdam, donderdag 28 januari = D+15
    expect(todayISO()).toBe(day(15));
    expect(proposeReentry(input({ today: todayISO() }))).toBeUndefined();
  });

  it('achteraf vastleggen: precies 4 weken terug mag, een dag eerder niet, ook net na middernacht', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-24T23:30:00Z')); // 00.30 in Amsterdam op maandag 25 januari
    const today = todayISO();
    expect(today).toBe('2027-01-25');
    expect(validateLeaveDraft({ kind: 'no_training', startDate: '2026-12-28', endDate: '2027-01-01' }, today)).toBeUndefined();
    expect(validateLeaveDraft({ kind: 'no_training', startDate: '2026-12-27', endDate: '2027-01-01' }, today)).toBe('Dit begint meer dan 4 weken geleden. Achteraf vastleggen kan vanaf ma 28 december 2026.');
  });
});

describe('een periode achteraf vastleggen of verlengen', () => {
  // Context voor de planningsronde, zoals in leaveEdit.test.ts.
  const context = (today: string) => (leave: LeavePeriod[]): PlanPassContext => {
    let k = 0;
    return { today, logs: [], templates, program: null, blocks: [], restDay: 1, goalDay: '2027-08-01', newId: () => `new-${k++}`, leave, until: addDays(today, 21) };
  };

  it('verlengd tot gisteren: mag, en vandaag (de dag erna) komt het voorstel met de nieuwe terugkomst', () => {
    const longer: LeavePeriod = { ...noGym, endDate: day(11) };
    // Eerder weigerde dit met "Deze periode is al voorbij."
    expect(validateLeaveDraft({ kind: 'no_gym', startDate: longer.startDate, endDate: longer.endDate }, day(12), { keepStart: noGym.startDate })).toBeUndefined();
    expect(validateLeaveDraft({ kind: 'no_gym', startDate: longer.startDate, endDate: longer.endDate }, day(12), { backfill: 'off' })).toBe('Deze periode is al voorbij. Achteraf vastleggen staat uit in Instellingen, Planning, Rond een vakantie.');
    const p = proposeReentry(input({ leavePeriods: [longer] }))!;
    expect(p).toMatchObject({ id: `reentry:${day(12)}`, lastTraining: D, pauseDays: 12, week: { from: day(12), until: day(18) } });
  });

  it('het voorstel verplaatst niets op voorbije dagen, het zegt alleen welke dagen als weg tellen', () => {
    const longer: LeavePeriod = { ...noGym, endDate: day(11) };
    const result = planLeaveChange({ mode: 'add', period: longer, replaces: noGym, existing: [noGym], sessions: plan, logs, templates, today: day(12), context: context(day(12)) });
    expect(result.proposal.changes.filter((c) => (c.toDate ?? c.fromDate ?? '') < day(12))).toEqual([]);
    expect(result.notes[0]).toBe('Voorbij: za 16 januari t/m zo 24 januari. Kracht in de sportschool telt op die dagen als weg, niet als gemist. Daar verschuift niets, en een training die je toen deed blijft gedaan.');
    expect(pastLeaveLine({ kind: 'no_training', startDate: day(8), endDate: day(14) }, day(12))).toBe('Voorbij: do 21 januari t/m zo 24 januari. Wat daar stond telt als weg, niet als gemist. Daar verschuift niets, en een training die je toen deed blijft gedaan.');
    expect(pastLeaveLine({ kind: 'no_training', startDate: day(12), endDate: day(14) }, day(12))).toBeUndefined();
    // Bijwerken zonder nieuwe voorbije dagen (alleen verder in de toekomst): geen regel Voorbij.
    const before = { kind: 'no_training' as const, startDate: day(8), endDate: day(13) };
    expect(pastLeaveLine({ ...before, endDate: day(16) }, day(12), before)).toBeUndefined();
    expect(pastLeaveLine({ ...before, startDate: day(6) }, day(12), before)).toContain('Voorbij:');
    // Vrije dagen die voorbij zijn: de melding zegt wat wel kan.
    expect(validateLeaveDraft({ kind: 'free_days', startDate: day(8), endDate: day(10) }, day(12))).toBe('Vrije dagen die al voorbij zijn veranderen niets meer. Kies een einddatum vanaf vandaag, of leg het vast als vakantie.');
  });

  it('ouder dan de grens: de melding zegt wat wel kan; een periode die je bijwerkt houdt zijn eigen eerste dag', () => {
    expect(validateLeaveDraft({ kind: 'no_training', startDate: day(-30), endDate: day(-25) }, day(12))).toBe('Dit begint meer dan 4 weken geleden. Achteraf vastleggen kan vanaf ma 28 december 2026.');
    expect(validateLeaveDraft({ kind: 'no_training', startDate: day(-30), endDate: day(-25) }, day(12), { backfill: 'eight_weeks' })).toBeUndefined();
    expect(validateLeaveDraft({ kind: 'no_training', startDate: day(-30), endDate: day(11) }, day(12), { keepStart: day(-30) })).toBeUndefined();
    // Een periode die nog loopt mag zoals altijd eerder beginnen.
    expect(validateLeaveDraft({ kind: 'no_training', startDate: day(-40), endDate: day(12) }, day(12))).toBeUndefined();
  });

  it('een dag met een log binnen de achteraf vastgelegde periode blijft een gedane training', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-25T09:00:00+01:00'));
    const away: LeavePeriod[] = [{ id: 'later', kind: 'no_training', startDate: day(8), endDate: day(11) }];
    const run = plan.find((s) => s.scheduledDate === day(8))!; // donderdag, rustige loop
    const hills = plan.find((s) => s.scheduledDate === day(10))!; // zaterdag, heuvels
    const runLog = done(run);
    expect(deriveSessionStatus(run, [runLog], false, { leave: away, templates }).status).toBe('completed');
    expect(deriveSessionStatus(hills, [runLog], false, { leave: away, templates }).status).toBe('away');
    expect(deriveSessionStatus(hills, [runLog]).status).toBe('missed');
    // De log zelf verandert niet, en hij telt als training: de pauze eindigt op die dag.
    const p = proposeReentry(input({ logs: [...logs, runLog], leavePeriods: [noGym, ...away] }));
    expect(runLog.completedDate).toBe(day(8));
    expect(p?.lastTraining ?? day(8)).toBe(day(8));
    vi.useRealTimers();
  });
});

describe('Liever niet geldt voor de hele pauze', () => {
  it('na Liever niet en daarna een verlengde periode komt er geen nieuw voorstel', () => {
    const declined = new Set([proposeReentry(input({ today: day(9) }))!.id]);
    // De periode zonder sportschool verlengd tot D+10: de dag terug wordt D+11, een nieuw id, dezelfde pauze.
    const longer: LeavePeriod = { ...noGym, endDate: day(10) };
    expect(proposeReentry(input({ today: day(12), leavePeriods: [longer] }))?.id).toBe(`reentry:${day(11)}`);
    expect(proposeReentry(input({ today: day(12), leavePeriods: [longer], respondedIds: declined }))).toBeUndefined();
  });
});

describe('Forge iets lichter na meer dan tien dagen zonder krachttraining', () => {
  it('hoort bij hetzelfde voorstel, alleen met krachttraining en Na een pauze lichter beginnen aan', () => {
    const p = proposeReentry(input({ forgeLighter: true }))!;
    expect(p.forgeDays).toBe(12);
    expect(reentryEffect(p, day(12))).toContain('Je laatste krachttraining was 12 dagen geleden, dus je eerste krachttraining in die dagen begint 5% lichter.');
    expect(reentryNote(p.week, p.forgeDays)).toContain('je eerste krachttraining in die dagen begint 5% lichter.');
    expect(proposeReentry(input())!.forgeDays).toBeUndefined();
    // Tien dagen is niet meer dan tien.
    const strength = { ...done(ps('tpl_upper_a', day(2))), id: 'kracht' } as SessionLog;
    expect(proposeReentry(input({ forgeLighter: true, logs: [...logs, strength] }))?.forgeDays).toBeUndefined();
  });

  it('in Forge: alleen in een instap met Akkoord en na meer dan tien dagen; dezelfde 5% als na een lange pauze', () => {
    const weeks = [{ from: day(12), until: day(18), factor: 0.75 }];
    expect(reentryForgeLighter(weeks, day(12), D)).toBe(true);
    expect(reentryForgeLighter(weeks, day(12), day(2))).toBe(false);
    expect(reentryForgeLighter([], day(12), D)).toBe(false);
    expect(reentryForgeLighter(weeks, day(19), D)).toBe(false);
    // Gemeten tot het begin van de bewaarde week: laatste kracht 9 dagen voor het venster, training op dag 3 ervan,
    // dan niet lichter (het Akkoord had geen zin over Forge).
    expect(reentryForgeLighter(weeks, day(14), day(3))).toBe(false);
    // Na de eerste krachttraining in het venster niet meer.
    expect(reentryForgeLighter(weeks, day(15), day(13))).toBe(false);

    const settings = resolveStrengthSettings(undefined);
    const bench = exerciseById('bench-press');
    const work = (reps: number, kg: number): SetLog => ({ reps, weightKg: kg, rir: 2 });
    const sessions = [{ date: day(-7), sets: [work(8, 60), work(8, 60), work(8, 60)] }, { date: D, sets: [work(8, 60), work(8, 60), work(8, 60)] }];
    const plain = prescribe({ exercise: bench, sessions, date: day(12), settings, lastStrengthDate: D })!;
    const eased = prescribe({ exercise: bench, sessions, date: day(12), settings, lastStrengthDate: D, reentry: true })!;
    expect(eased.strengthKg).toBeCloseTo(plain.strengthKg * 0.95, 6);
    // De zin zegt lichter, dus de eerste werkset is ook echt lichter dan de 60 kg van vorige keer.
    expect(plain.sets[0].weightKg).toBe(60);
    expect(eased.sets[0].weightKg).toBeLessThan(60);
    expect(eased.sets[0].weightKg).toBeGreaterThanOrEqual(55);
    expect(eased.reason).toBe('Je deed meer dan tien dagen geen krachttraining en koos een rustiger instap, dus je eerste werkset is lichter dan vorige keer. Na deze training volgt een nieuw voorstel.');
    // Ook als 5% minder kracht nog bij 60 kg uitkomt (vorige keer ruim in het bereik): een stap lager, de sets erna niet zwaarder.
    const strong = [{ date: day(-7), sets: [work(12, 60), work(11, 60), work(10, 60)] }, { date: D, sets: [work(12, 60), work(11, 60), work(10, 60)] }];
    const strongPlain = prescribe({ exercise: bench, sessions: strong, date: day(12), settings, lastStrengthDate: D })!;
    const strongEased = prescribe({ exercise: bench, sessions: strong, date: day(12), settings, lastStrengthDate: D, reentry: true })!;
    expect(strongPlain.sets[0].weightKg).toBeGreaterThanOrEqual(60);
    expect(strongEased.sets[0].weightKg).toBeLessThan(60);
    for (const set of strongEased.sets) expect(set.weightKg).toBeLessThanOrEqual(strongEased.sets[0].weightKg);
    expect(strongEased.reason).toContain('je eerste werkset is lichter dan vorige keer');
    const off = prescribe({ exercise: bench, sessions, date: day(12), settings: resolveStrengthSettings({ lighterAfterBreak: false }), lastStrengthDate: D, reentry: true })!;
    expect(off.strengthKg).toBeCloseTo(plain.strengthKg, 6);
  });
});
