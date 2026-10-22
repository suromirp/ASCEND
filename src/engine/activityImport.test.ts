import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import {
  activityToDraft,
  candidatePlanned,
  describeActivity,
  describeActivityDetails,
  describeRunForm,
  fallbackTemplate,
  findSimilarLog,
  pendingProposals,
  proposeImport,
  proposeMatch,
  type ExternalActivity,
} from './activityImport';

// Made-up activities and plans only.
const templates: SessionTemplate[] = buildDefaultProgramData().templates;
const tpl = (id: string) => templates.find((t) => t.id === id)!;

function planned(id: string, templateId: string, scheduledDate: string, extra: Partial<PlannedSession> = {}): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate: '2026-10-12', status: 'planned', order: 0, ...extra };
}

function run(extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return {
    externalId: 'test:run-1',
    source: 'garmin',
    start: '2026-10-14T07:30:00',
    kind: 'run',
    durationSec: 55 * 60 + 20,
    distanceM: 6900,
    elevationGainM: 40.4,
    elevationLossM: 38.2,
    avgHeartRate: 148,
    maxHeartRate: 171,
    rpe: 4,
    feel: 'normal',
    treadmill: false,
    ...extra,
  };
}

function log(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2026-10-14', completedAt: '2026-10-14T08:30:00.000Z',
    variant: 'full', durationMinutes: 55, source: 'manual', ...extra,
  };
}

describe('proposeMatch', () => {
  const week = [
    planned('p_mon', 'tpl_upper_a', '2026-10-12'),
    planned('p_wed_run', 'tpl_easy_run', '2026-10-14'),
    planned('p_wed_strength', 'tpl_lower_a', '2026-10-14'),
    planned('p_sun', 'tpl_long_run', '2026-10-18'),
  ];

  it('picks the planned session of the same day with a fitting kind', () => {
    const match = proposeMatch(run(), week, templates, []);
    expect(match?.session.id).toBe('p_wed_run');
    expect(match?.template.id).toBe('tpl_easy_run');
  });

  it('does not match a run to strength, nor to another day', () => {
    const onlyStrength = [planned('p1', 'tpl_lower_a', '2026-10-14'), planned('p2', 'tpl_easy_run', '2026-10-15')];
    expect(proposeMatch(run(), onlyStrength, templates, [])).toBeUndefined();
  });

  it('skips a planned session that already has a log, and a skipped one', () => {
    const logged = [log({ plannedSessionId: 'p_wed_run' })];
    expect(proposeMatch(run(), week, templates, logged)).toBeUndefined();
    const skipped = week.map((s) => (s.id === 'p_wed_run' ? { ...s, status: 'skipped' as const } : s));
    expect(proposeMatch(run(), skipped, templates, [])).toBeUndefined();
  });

  it('prefers the planned length closest to what happened when two runs fit', () => {
    const two = [planned('short', 'tpl_easy_run', '2026-10-14', { plannedMinutes: 30 }), planned('long', 'tpl_long_run', '2026-10-14', { plannedMinutes: 60 })];
    expect(proposeMatch(run(), two, templates, [])?.session.id).toBe('long');
  });

  it('matches a walk to a hike session, and to a rest day only when nothing better is there', () => {
    const walk = run({ kind: 'hike', externalId: 'test:walk' });
    const both = [planned('rest', 'tpl_herstel', '2026-10-14'), planned('hike', 'tpl_mountain_hike', '2026-10-14')];
    expect(proposeMatch(walk, both, templates, [])?.session.id).toBe('hike');
    expect(proposeMatch(walk, [both[0]], templates, [])?.session.id).toBe('rest');
  });

  it('matches a ride to a cycling session and strength to a strength session', () => {
    expect(proposeMatch(run({ kind: 'ride' }), [planned('b', 'tpl_bike', '2026-10-14')], templates, [])?.session.id).toBe('b');
    expect(proposeMatch(run({ kind: 'strength' }), [planned('s', 'tpl_lower_a', '2026-10-14')], templates, [])?.session.id).toBe('s');
  });
});

describe('candidatePlanned', () => {
  const week = [
    planned('p_mon', 'tpl_easy_run', '2026-10-12'),
    planned('p_tue', 'tpl_upper_a', '2026-10-13'),
    planned('p_fri', 'tpl_easy_run', '2026-10-16'),
    planned('p_next', 'tpl_easy_run', '2026-10-26'),
  ];

  it('lists fitting sessions of the days around it, nearest first, other kinds last', () => {
    const ids = candidatePlanned(run(), week, templates, [], { anyKind: true }).map((m) => m.session.id);
    expect(ids).toEqual(['p_mon', 'p_fri', 'p_tue']);
  });

  it('leaves out sessions after the given day', () => {
    const ids = candidatePlanned(run(), week, templates, [], { notAfter: '2026-10-14' }).map((m) => m.session.id);
    expect(ids).toEqual(['p_mon']);
  });
});

describe('fallbackTemplate', () => {
  it('uses an easy run, a bike, a rest-day walk and a mountain day by kind', () => {
    expect(fallbackTemplate(run(), templates)?.id).toBe('tpl_easy_run');
    expect(fallbackTemplate(run({ kind: 'ride' }), templates)?.id).toBe('tpl_bike');
    expect(fallbackTemplate(run({ kind: 'hike', elevationGainM: 80 }), templates)?.id).toBe('tpl_herstel');
    expect(fallbackTemplate(run({ kind: 'hike', elevationGainM: 900 }), templates)?.id).toBe('tpl_mountain_hike');
    expect(fallbackTemplate(run({ kind: 'other' }), templates)).toBeUndefined();
  });
});

describe('activityToDraft', () => {
  it('makes a cardio log with the measurements and the source id', () => {
    const match = planned('p_wed_run', 'tpl_easy_run', '2026-10-14');
    const draft = activityToDraft(run(), tpl('tpl_easy_run'), match);
    expect(draft).toMatchObject({
      plannedSessionId: 'p_wed_run',
      templateId: 'tpl_easy_run',
      type: 'cardio',
      sport: 'running',
      completedDate: '2026-10-14',
      variant: 'custom',
      durationMinutes: 55,
      rpe: 4,
      subjectiveFeel: 'normal',
      externalId: 'test:run-1',
      source: 'garmin',
    });
    expect(draft.cardioData).toEqual({
      durationMinutes: 55,
      distanceKm: 6.9,
      elevationGainM: 40,
      elevationLossM: 38,
      environment: 'outdoor',
      avgHeartRate: 148,
      maxHeartRate: 171,
      source: 'garmin',
    });
    expect(draft.outdoorData).toBeUndefined();
    expect('id' in draft).toBe(false);
  });

  it('ends the log when the activity ended: start plus duration', () => {
    const draft = activityToDraft(run({ durationSec: 3600 }), tpl('tpl_easy_run'));
    expect(Date.parse(draft.completedAt) - new Date('2026-10-14T07:30:00').getTime()).toBe(3600 * 1000);
  });

  it('puts a hike under outdoorData and marks a treadmill climb as an estimate', () => {
    const hike = activityToDraft(run({ kind: 'hike', externalId: 'test:h' }), tpl('tpl_mountain_hike'));
    expect(hike.type).toBe('hiking');
    expect(hike.sport).toBe('hiking');
    expect(hike.outdoorData?.elevationLossM).toBe(38);
    expect(hike.cardioData).toBeUndefined();

    const treadmill = activityToDraft(run({ treadmill: true }), tpl('tpl_easy_run'));
    expect(treadmill.cardioData?.environment).toBe('treadmill');
    expect(treadmill.cardioData?.estimatedElevation).toBe(true);
    const flat = activityToDraft(run({ treadmill: true, elevationGainM: undefined }), tpl('tpl_easy_run'));
    expect(flat.cardioData?.estimatedElevation).toBeUndefined();
  });

  it('logs a rest-day walk the way the app does by hand', () => {
    const draft = activityToDraft(run({ kind: 'hike', externalId: 'test:w' }), tpl('tpl_herstel'));
    expect(draft.type).toBe('recovery');
    expect(draft.cardioData?.modality).toBe('recovery_walk');
  });

  it('leaves out what the watch did not measure, and clamps the RPE', () => {
    const bare = activityToDraft(run({ distanceM: undefined, elevationGainM: undefined, elevationLossM: undefined, avgHeartRate: undefined, maxHeartRate: undefined, rpe: undefined, feel: undefined }), tpl('tpl_easy_run'));
    expect(bare.rpe).toBeUndefined();
    expect(bare.subjectiveFeel).toBeUndefined();
    expect(bare.cardioData).toEqual({ durationMinutes: 55, environment: 'outdoor', source: 'garmin' });
    expect(activityToDraft(run({ rpe: 14 }), tpl('tpl_easy_run')).rpe).toBe(10);
  });

  it('a strength activity has no cardio or outdoor data', () => {
    const draft = activityToDraft(run({ kind: 'strength', externalId: 'test:s', distanceM: undefined }), tpl('tpl_lower_a'));
    expect(draft.type).toBe('strength');
    expect(draft.cardioData).toBeUndefined();
    expect(draft.outdoorData).toBeUndefined();
    expect(draft.sport).toBeUndefined();
  });
});

describe('proposeImport', () => {
  const week = [planned('p_wed_run', 'tpl_easy_run', '2026-10-14')];

  it('does nothing when a log with the same source id exists', () => {
    expect(proposeImport(run(), week, templates, [log({ externalId: 'test:run-1', plannedSessionId: 'other' })])).toBeUndefined();
  });

  it('proposes the match and its template', () => {
    const proposal = proposeImport(run(), week, templates, []);
    expect(proposal?.match?.session.id).toBe('p_wed_run');
    expect(proposal?.template?.id).toBe('tpl_easy_run');
    expect(proposal?.similarLog).toBeUndefined();
  });

  it('falls back to a loose template when nothing is planned', () => {
    const proposal = proposeImport(run({ start: '2026-10-16T18:00:00' }), week, templates, []);
    expect(proposal?.match).toBeUndefined();
    expect(proposal?.template?.id).toBe('tpl_easy_run');
  });

  it('ignores activities ASCEND has no place for', () => {
    expect(proposeImport(run({ kind: 'other' }), week, templates, [])).toBeUndefined();
    expect(proposeImport(run({ durationSec: 0 }), week, templates, [])).toBeUndefined();
  });

  it('does not propose an activity that is the training typed in by hand', () => {
    const typed = log({ plannedSessionId: 'p_wed_run' });
    expect(proposeImport(run(), week, templates, [typed])).toBeUndefined();
  });

  it('still warns about a hand-made log that another activity already took', () => {
    const typed = log({ plannedSessionId: 'p_wed_run' });
    const second = run({ externalId: 'test:run-2', start: '2026-10-14T18:00:00' });
    const proposals = pendingProposals([run(), second], [], week, templates, [typed]);
    expect(proposals.map((p) => p.activity.externalId)).toEqual(['test:run-2']);
    expect(proposals[0].similarLog?.id).toBe('log_1');
  });
});

describe('findSimilarLog', () => {
  it('needs the same day, the same sport and about the same length', () => {
    expect(findSimilarLog(run(), [log()])?.id).toBe('log_1');
    expect(findSimilarLog(run(), [log({ completedDate: '2026-10-13' })])).toBeUndefined();
    expect(findSimilarLog(run(), [log({ durationMinutes: 120 })])).toBeUndefined();
    expect(findSimilarLog(run(), [log({ templateId: 'tpl_bike', sport: 'cycling' })])).toBeUndefined();
    expect(findSimilarLog(run(), [log({ externalId: 'test:other' })])).toBeUndefined();
  });
});

describe('pendingProposals', () => {
  const week = [planned('p_wed_run', 'tpl_easy_run', '2026-10-14')];
  const older = run({ externalId: 'test:old', start: '2026-10-10T09:00:00' });
  const newer = run({ externalId: 'test:new', start: '2026-10-14T07:30:00' });

  it('lists the newest first and drops stored and dismissed activities', () => {
    expect(pendingProposals([older, newer], [], week, templates, []).map((p) => p.activity.externalId)).toEqual(['test:new', 'test:old']);
    expect(pendingProposals([older, newer], ['test:new'], week, templates, []).map((p) => p.activity.externalId)).toEqual(['test:old']);
    expect(pendingProposals([older, newer], [], week, templates, [log({ id: 'l2', externalId: 'test:old', completedDate: '2026-10-10' })]).map((p) => p.activity.externalId)).toEqual(['test:new']);
  });
});

describe('words', () => {
  it('describes an activity in one line', () => {
    expect(describeActivity(run())).toBe('Loop, 6,9 km, 55 min, +40 m');
    expect(describeActivity(run({ kind: 'hike', durationSec: 5400, distanceM: 12000, elevationGainM: 820 }))).toBe('Wandeling, 12 km, 1 uur 30 min, +820 m');
    expect(describeActivity(run({ distanceM: undefined, elevationGainM: undefined, durationSec: 1800 }))).toBe('Loop, 30 min');
    expect(describeActivity(run({ treadmill: true }))).toBe('Loop, 6,9 km, 55 min, +40 m (geschat)');
  });

  it('explains each extra number', () => {
    const lines = describeActivityDetails(run());
    expect(lines).toEqual([
      'Gedaald: 38 m',
      'Hartslag gemiddeld 148, hoogst 171 slagen per minuut',
      'Inspanning 4 van 10 (zoals je op je horloge invulde)',
      'Gevoel: zoals normaal',
    ]);
    expect(describeActivityDetails(run({ elevationLossM: undefined, avgHeartRate: undefined, maxHeartRate: undefined, rpe: undefined, feel: undefined }))).toEqual([]);
  });

  it('shows one fact about the form of a run, only for a run and only when it was measured', () => {
    const dynamics = { stanceTimeMs: 238, stepLengthM: 1.12, verticalRatioPct: 7.8 };
    expect(describeRunForm(run({ dynamics }))).toBe('Loopvorm: grondcontact 238 ms, pas 1,12 m');
    expect(describeRunForm(run({ dynamics: { stepLengthM: 1.12 } }))).toBe('Loopvorm: pas 1,12 m');
    expect(describeRunForm(run({ dynamics: { verticalRatioPct: 7.8 } }))).toBeUndefined();
    expect(describeRunForm(run())).toBeUndefined();
    expect(describeRunForm(run({ kind: 'hike', dynamics }))).toBeUndefined();
    expect(describeActivityDetails(run({ dynamics })).at(-1)).toBe('Loopvorm: grondcontact 238 ms, pas 1,12 m');
  });
});
