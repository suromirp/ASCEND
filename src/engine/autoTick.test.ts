import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { activityToDraft, candidatePlanned, chosenWayOf, durationIsClose, pendingProposals, proposeImport, type ExternalActivity } from './activityImport';
import {
  QUESTION_HOURS,
  applyFeedback,
  autoTickMatch,
  canRejectAutoLog,
  pendingQuestions,
  planAutoTicks,
  upsertAutoLogged,
  withAutoStatus,
  type AutoLogged,
} from './autoTick';

// Made-up activities and plans only.
const templates: SessionTemplate[] = buildDefaultProgramData().templates;
const DAY = '2026-10-14';
const TODAY = '2026-10-14';

function planned(id: string, templateId: string, scheduledDate = DAY, extra: Partial<PlannedSession> = {}): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate: '2026-10-12', status: 'planned', order: 0, ...extra };
}

function run(extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return {
    externalId: 'test:run-1',
    source: 'garmin',
    start: `${DAY}T07:30:00`,
    kind: 'run',
    durationSec: 38 * 60,
    distanceM: 5200,
    avgHeartRate: 146,
    treadmill: false,
    ...extra,
  };
}

function log(id: string, extra: Partial<SessionLog> = {}): SessionLog {
  return { id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: DAY, completedAt: `${DAY}T08:10:00.000Z`, variant: 'custom', durationMinutes: 38, source: 'garmin', externalId: 'test:run-1', ...extra };
}

const tick = (activity: ExternalActivity, plan: PlannedSession[], logs: SessionLog[] = []) => autoTickMatch(activity, plan, templates, logs, TODAY);

describe('durationIsClose', () => {
  it('allows 15 minutes or 35 percent of the plan, whichever is more', () => {
    expect(durationIsClose(38, 35)).toBe(true);
    expect(durationIsClose(50, 35)).toBe(true); // 15 more
    expect(durationIsClose(51, 35)).toBe(false);
    expect(durationIsClose(20, 35)).toBe(true); // 15 less
  });

  it('is generous on a long day and strict on a short one', () => {
    expect(durationIsClose(240, 180)).toBe(true);
    expect(durationIsClose(250, 180)).toBe(false);
    expect(durationIsClose(70, 25)).toBe(false);
  });
});

describe('autoTickMatch', () => {
  it('ticks off the one training of that day that fits, with a length in the neighbourhood', () => {
    const match = tick(run(), [planned('p1', 'tpl_easy_run')]);
    expect(match?.session.id).toBe('p1');
    expect(match?.template.id).toBe('tpl_easy_run');
  });

  it('does nothing when the length is far from the plan', () => {
    expect(tick(run({ durationSec: 95 * 60 }), [planned('p1', 'tpl_easy_run')])).toBeUndefined();
    expect(tick(run({ durationSec: 8 * 60 }), [planned('p1', 'tpl_easy_run')])).toBeUndefined();
  });

  it('does nothing when the kind does not fit, or nothing is planned that day', () => {
    expect(tick(run(), [planned('p1', 'tpl_lower_a')])).toBeUndefined();
    expect(tick(run(), [planned('p1', 'tpl_easy_run', '2026-10-13')])).toBeUndefined();
    expect(tick(run(), [])).toBeUndefined();
  });

  it('does nothing with two candidates: that is a choice for the user', () => {
    expect(tick(run(), [planned('p1', 'tpl_easy_run'), planned('p2', 'tpl_recovery_run')])).toBeUndefined();
  });

  it('skipped and already logged training does not count as a candidate', () => {
    expect(tick(run(), [planned('p1', 'tpl_easy_run', DAY, { status: 'skipped' })])).toBeUndefined();
    const other = log('l0', { plannedSessionId: 'p1', externalId: 'test:other' });
    expect(tick(run(), [planned('p1', 'tpl_easy_run')], [other])).toBeUndefined();
  });

  it('does nothing when a log made by hand that day looks like the same training', () => {
    const byHand = log('l1', { externalId: undefined, source: 'manual', durationMinutes: 40 });
    expect(tick(run(), [planned('p1', 'tpl_easy_run')], [byHand])).toBeUndefined();
  });

  it('does nothing for a test run or a race, and for something already stored', () => {
    expect(tick(run({ durationSec: 45 * 60 }), [planned('p1', 'tpl_test_run')])).toBeUndefined();
    expect(tick(run({ durationSec: 60 * 60 }), [planned('p1', 'tpl_race')])).toBeUndefined();
    expect(tick(run(), [planned('p1', 'tpl_easy_run')], [log('l1')])).toBeUndefined();
  });

  it('does nothing for an activity ASCEND does not plan, or one from the future', () => {
    expect(tick(run({ kind: 'other' }), [planned('p1', 'tpl_easy_run')])).toBeUndefined();
    expect(autoTickMatch(run({ start: '2026-10-15T07:30:00' }), [planned('p1', 'tpl_easy_run', '2026-10-15')], templates, [], TODAY)).toBeUndefined();
  });

  it('a hike fits a mountain hike of about its length, strength fits a strength session', () => {
    const hike: ExternalActivity = { ...run(), externalId: 'test:hike', kind: 'hike', durationSec: 190 * 60, elevationGainM: 800 };
    expect(tick(hike, [planned('p1', 'tpl_mountain_hike')])?.template.id).toBe('tpl_mountain_hike');
    const strength: ExternalActivity = { ...run(), externalId: 'test:str', kind: 'strength', durationSec: 70 * 60 };
    expect(tick(strength, [planned('p1', 'tpl_lower_a')])?.template.id).toBe('tpl_lower_a');
  });
});

describe('planAutoTicks', () => {
  const plan = [planned('p1', 'tpl_easy_run')];

  it('lists what to tick off, oldest first, and leaves the rest', () => {
    const plan2 = [...plan, planned('p2', 'tpl_lower_a', '2026-10-13')];
    const strength: ExternalActivity = { ...run(), externalId: 'test:str', kind: 'strength', start: '2026-10-13T18:00:00', durationSec: 70 * 60 };
    const result = planAutoTicks([run(), strength], [], [], plan2, templates, [], TODAY);
    expect(result.map((t) => t.match.session.id)).toEqual(['p2', 'p1']);
  });

  it('skips what the user said no to, and what was ticked off before (also when refused or deleted)', () => {
    expect(planAutoTicks([run()], ['test:run-1'], [], plan, templates, [], TODAY)).toEqual([]);
    for (const status of ['asking', 'done', 'rejected'] as const) {
      const entry: AutoLogged = { externalId: 'test:run-1', logId: 'gone', at: '2026-10-14T08:00:00.000Z', status };
      expect(planAutoTicks([run()], [], [entry], plan, templates, [], TODAY)).toEqual([]);
    }
  });

  it('does nothing when two activities of the day point at one training', () => {
    const second = run({ externalId: 'test:run-2', start: `${DAY}T18:00:00`, durationSec: 34 * 60 });
    expect(planAutoTicks([run(), second], [], [], plan, templates, [], TODAY)).toEqual([]);
  });

  it('two activities for two different trainings are both ticked off', () => {
    const both = [planned('p1', 'tpl_easy_run'), planned('p2', 'tpl_lower_a')];
    const strength: ExternalActivity = { ...run(), externalId: 'test:str', kind: 'strength', start: `${DAY}T18:00:00`, durationSec: 70 * 60 };
    expect(planAutoTicks([run(), strength], [], [], both, templates, [], TODAY)).toHaveLength(2);
  });
});

describe('the question afterwards', () => {
  const entry: AutoLogged = { externalId: 'test:run-1', logId: 'l1', at: '2026-10-14T08:00:00.000Z', status: 'asking' };
  const now = new Date('2026-10-14T09:00:00.000Z');

  it('stays open for the logs that exist, newest first, for three days', () => {
    const older: AutoLogged = { externalId: 'test:run-0', logId: 'l0', at: '2026-10-13T08:00:00.000Z', status: 'asking' };
    const logs = [log('l1'), log('l0', { externalId: 'test:run-0' })];
    expect(pendingQuestions([older, entry], logs, now).map((q) => q.entry.logId)).toEqual(['l1', 'l0']);
    expect(pendingQuestions([entry], logs, new Date(Date.parse(entry.at) + (QUESTION_HOURS + 1) * 3_600_000))).toEqual([]);
  });

  it('is gone once answered, refused, or when the log was deleted', () => {
    expect(pendingQuestions([{ ...entry, status: 'done' }], [log('l1')], now)).toEqual([]);
    expect(pendingQuestions([{ ...entry, status: 'rejected' }], [log('l1')], now)).toEqual([]);
    expect(pendingQuestions([entry], [], now)).toEqual([]);
  });

  it('ignores a log that is no longer the activity the note was made for', () => {
    expect(pendingQuestions([entry], [log('l1', { externalId: 'test:something-else' })], now)).toEqual([]);
  });
});

describe('canRejectAutoLog: the only case where the app takes a log away', () => {
  const entry: AutoLogged = { externalId: 'test:run-1', logId: 'l1', at: '2026-10-14T08:00:00.000Z', status: 'asking' };
  const now = new Date('2026-10-14T09:00:00.000Z');

  it('yes: the log the app made itself, not yet answered, recent', () => {
    expect(canRejectAutoLog(entry, log('l1'), now)).toBe(true);
  });

  it('no: answered, old, another log, a hand-made log, or nothing', () => {
    expect(canRejectAutoLog({ ...entry, status: 'done' }, log('l1'), now)).toBe(false);
    expect(canRejectAutoLog({ ...entry, status: 'rejected' }, log('l1'), now)).toBe(false);
    expect(canRejectAutoLog(entry, log('l1'), new Date('2026-10-18T09:00:00.000Z'))).toBe(false);
    expect(canRejectAutoLog(entry, log('l2'), now)).toBe(false);
    expect(canRejectAutoLog(entry, log('l1', { externalId: 'test:other' }), now)).toBe(false);
    expect(canRejectAutoLog(entry, log('l1', { externalId: undefined, source: 'manual' }), now)).toBe(false);
    expect(canRejectAutoLog(undefined, log('l1'), now)).toBe(false);
    expect(canRejectAutoLog(entry, undefined, now)).toBe(false);
  });
});

describe('the notes', () => {
  it('upsert replaces the note of the same activity and keeps the list short', () => {
    const a: AutoLogged = { externalId: 'x', logId: 'l1', at: '2026-10-14T08:00:00.000Z', status: 'asking' };
    expect(upsertAutoLogged([a], { ...a, logId: 'l9' })).toEqual([{ ...a, logId: 'l9' }]);
    let list: AutoLogged[] = [];
    for (let i = 0; i < 80; i++) list = upsertAutoLogged(list, { ...a, externalId: `x${i}` });
    expect(list).toHaveLength(60);
    expect(list[list.length - 1].externalId).toBe('x79');
  });

  it('withAutoStatus changes one note', () => {
    const list: AutoLogged[] = [
      { externalId: 'a', logId: 'l1', at: '', status: 'asking' },
      { externalId: 'b', logId: 'l2', at: '', status: 'asking' },
    ];
    expect(withAutoStatus(list, 'b', 'done').map((x) => x.status)).toEqual(['asking', 'done']);
  });
});

describe('applyFeedback', () => {
  it('adds only what was answered and leaves the rest of the log as it was', () => {
    const base = log('l1', { rpe: 4, subjectiveFeel: 'normal' });
    const next = applyFeedback(base, { subjectiveFeel: 'worse', painReports: [{ area: 'Knie', score: 3 }] });
    expect(next).toEqual({ ...base, subjectiveFeel: 'worse', painReports: [{ area: 'Knie', score: 3 }] });
    expect(applyFeedback(base, {})).toEqual(base);
    expect(base.subjectiveFeel).toBe('normal');
  });

  it('keeps the RPE between 1 and 10', () => {
    expect(applyFeedback(log('l1'), { rpe: 14 }).rpe).toBe(10);
    expect(applyFeedback(log('l1'), { rpe: 0 }).rpe).toBe(1);
  });

  it('an empty pain list changes nothing', () => {
    const base = log('l1', { painReports: [{ area: 'Knie', score: 3 }] });
    expect(applyFeedback(base, { painReports: [] }).painReports).toEqual([{ area: 'Knie', score: 3 }]);
  });
});

// Besluit docs/beslissingen/2026-11-12-stairmaster-horloge.md: een looptraining met de StairMaster gekozen doe je
// als wandelworkout, dus het horloge brengt een wandeling binnen. Die hoort bij de geplande training.
describe('een wandeling van het horloge bij heuvelintervallen op de StairMaster', () => {
  const hills = planned('h1', 'tpl_hill_intervals');
  const STAIR = { h1: 'stairmaster_intervals' };
  const walk = (extra: Partial<ExternalActivity> = {}): ExternalActivity => ({ externalId: 'test:walk-1', source: 'garmin', start: `${DAY}T07:30:00`, kind: 'hike', durationSec: 39 * 60, distanceM: 2100, avgHeartRate: 139, treadmill: false, ...extra });
  const stepper = () => walk({ kind: 'other', otherType: 'StairStepper', distanceM: undefined });

  it('met de keuze: de geplande training wordt vanzelf afgevinkt, met een log dat naar haar wijst', () => {
    const match = autoTickMatch(walk(), [hills], templates, [], TODAY, STAIR);
    expect(match?.session.id).toBe('h1');
    const draft = activityToDraft(walk(), match!.template, match!.session, chosenWayOf(walk(), match, STAIR));
    expect(draft.plannedSessionId).toBe('h1');
    expect(draft.templateId).toBe('tpl_hill_intervals');
    expect(draft.sport).toBe('hiking');
    expect(draft.cardioData?.modality).toBe('stairmaster_intervals');
    // Binnen: geen Omgeving Buiten op het log (Warden ronde 3).
    expect(draft.cardioData?.environment).toBeUndefined();
    expect(draft.externalId).toBe('test:walk-1');
    expect(planAutoTicks([walk()], [], [], [hills], templates, [], TODAY, STAIR).map((t) => t.match.session.id)).toEqual(['h1']);
  });

  it('ook als je Stair Stepper zonder workout startte', () => {
    expect(autoTickMatch(stepper(), [hills], templates, [], TODAY, STAIR)?.session.id).toBe('h1');
    expect(proposeImport(stepper(), [hills], templates, [], undefined, STAIR)?.match?.session.id).toBe('h1');
    // Zonder de keuze is een Stair Stepper een sport die niet meetelt: geen voorstel.
    expect(proposeImport(stepper(), [hills], templates, [])).toBeUndefined();
  });

  it('zonder keuze, met een andere keuze of zonder gelezen keuzes: precies zoals het was', () => {
    const cases: (Record<string, string> | undefined)[] = [undefined, {}, { h1: 'incline_treadmill_intervals' }, { h1: 'hill_repeats_outdoor' }, { ander: 'stairmaster_intervals' }];
    for (const places of cases) {
      expect(autoTickMatch(walk(), [hills], templates, [], TODAY, places)).toBeUndefined();
      const proposal = proposeImport(walk(), [hills], templates, [], undefined, places);
      expect(proposal?.match).toBeUndefined();
      expect(proposal?.template?.id).toBe(proposeImport(walk(), [hills], templates, [])?.template?.id);
    }
  });

  it('een losse wandeling op een andere dag hoort er niet bij', () => {
    const dayAfter = walk({ start: '2026-10-13T07:30:00' });
    expect(autoTickMatch(dayAfter, [hills], templates, [], TODAY, STAIR)).toBeUndefined();
    expect(proposeImport(dayAfter, [hills], templates, [], undefined, STAIR)?.match).toBeUndefined();
    expect(candidatePlanned(dayAfter, [hills], templates, [], { places: STAIR })).toEqual([]);
    expect(chosenWayOf(dayAfter, { session: hills, template: templates.find((t) => t.id === 'tpl_hill_intervals')! }, STAIR)).toBeUndefined();
  });

  it('geen dubbel log: staat de activiteit al in een log, of heeft de training al een log, dan gebeurt er niets', () => {
    const done = log('l1', { templateId: 'tpl_hill_intervals', plannedSessionId: 'h1', externalId: 'test:walk-1' });
    expect(autoTickMatch(walk(), [hills], templates, [done], TODAY, STAIR)).toBeUndefined();
    expect(pendingProposals([walk()], [], [hills], templates, [done], STAIR)).toEqual([]);
    const other = log('l2', { templateId: 'tpl_hill_intervals', plannedSessionId: 'h1', externalId: 'test:iets-anders' });
    expect(autoTickMatch(walk(), [hills], templates, [other], TODAY, STAIR)).toBeUndefined();
  });

  it('een gewone loop past nog steeds op de training, en een wandeling niet op een andere looptraining van die dag', () => {
    expect(autoTickMatch(run({ durationSec: 39 * 60 }), [hills], templates, [], TODAY, STAIR)?.session.id).toBe('h1');
    const easy = planned('e1', 'tpl_easy_run');
    expect(autoTickMatch(walk(), [easy], templates, [], TODAY, { e1: 'stairmaster_intervals' })).toBeUndefined();
  });

  it('een wandeling die veel langer duurde wordt niet vanzelf afgevinkt, maar wel voorgesteld bij die training', () => {
    const long = walk({ durationSec: 150 * 60 });
    expect(autoTickMatch(long, [hills], templates, [], TODAY, STAIR)).toBeUndefined();
    expect(proposeImport(long, [hills], templates, [], undefined, STAIR)?.match?.session.id).toBe('h1');
  });
});
