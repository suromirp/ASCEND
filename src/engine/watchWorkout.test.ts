import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import { racePaces } from './racePaces';
import type { PlannedSession, SessionLog } from '../models/training';
import {
  buildWatchWorkout,
  externalIdFor,
  shortDateNL,
  WATCH_NAME_PREFIXES,
  type WatchNamePrefix,
  formatStepDuration,
  paceTarget,
  planWatchSync,
  selectWatchWorkouts,
  type TrackedWorkout,
} from './watchWorkout';

const { templates, program, plannedSessions } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
// A made-up test: 5 km in 29:05, the paces of VDOT 32 (see racePaces.test.ts).
const paces = racePaces([{ date: '2026-10-29', km: 5, minutes: 29 + 5 / 60 }]);
const day = addDays(program.startDate, 8);

const session = (templateId: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `ps_${templateId}`,
  templateId,
  scheduledDate: day,
  weekStartDate: program.startDate,
  status: 'planned',
  order: 0,
  ...over,
});
// The text tests below look at the workout itself, so they run without the ASCEND prefix; the prefix has its own tests.
const build = (templateId: string, withPaces = true, over: Partial<PlannedSession> = {}, namePrefix: WatchNamePrefix = 'none') => buildWatchWorkout(session(templateId, over), tpl(templateId), program, withPaces ? paces : undefined, { namePrefix });

describe('the pieces of the text', () => {
  it('writes durations in the builder\'s own units', () => {
    expect(formatStepDuration(600)).toBe('10m');
    expect(formatStepDuration(90)).toBe('1m30s');
    expect(formatStepDuration(20)).toBe('20s');
    expect(formatStepDuration(3600)).toBe('1h');
    expect(formatStepDuration(2 * 3600 + 45 * 60)).toBe('2h45m');
  });

  it('writes a pace range fast to slow, as absolute pace per km', () => {
    expect(paceTarget({ fast: 365, slow: 380 })).toBe('6:05/km-6:20/km Pace');
    expect(paceTarget({ fast: 380, slow: 365 })).toBe('6:05/km-6:20/km Pace');
  });
});

describe('trainings that run on pace from the test', () => {
  it('tempo run: warm-up and cool-down at easy pace, the blocks at threshold pace', () => {
    const w = build('tpl_tempo_run')!;
    expect(w.type).toBe('Run');
    expect(w.target).toBe('PACE');
    expect(w.description).toBe(
      [
        'Warming-up',
        '- Inlopen 15m 7:15/km-8:20/km Pace',
        '',
        'Herhalingen 2x',
        '- Drempeltempo 7m 6:05/km-6:20/km Pace',
        '- Rustig 1m30s 7:15/km-8:20/km Pace',
        '',
        'Cooling-down',
        '- Uitlopen 13m 7:15/km-8:20/km Pace',
      ].join('\n'),
    );
  });

  it('intervals: the hard blocks at 5 km pace', () => {
    const w = build('tpl_intervals')!;
    expect(w.target).toBe('PACE');
    expect(w.description).toContain('Herhalingen 4x\n- Hard 4m 5:40/km-5:55/km Pace\n- Rustig 3m 7:15/km-8:20/km Pace');
  });

  it('never mixes pace and heart rate in one workout', () => {
    for (const id of ['tpl_tempo_run', 'tpl_intervals']) {
      const text = build(id)!.description;
      expect(text).not.toMatch(/HR/);
    }
  });

  it('without a test the same trainings run on heart rate: zones, and nothing for the short recoveries', () => {
    const tempo = build('tpl_tempo_run', false)!;
    expect(tempo.target).toBe('HR');
    expect(tempo.description).toContain('- Drempeltempo 7m Z3 HR');
    expect(tempo.description).toContain('- Rustig 1m30s\n');
    expect(tempo.description).not.toMatch(/Pace/);
    const intervals = build('tpl_intervals', false)!;
    expect(intervals.description).toContain('- Hard 4m Z4-Z5 HR');
    expect(intervals.description).toContain('- Rustig 3m\n');
  });
});

describe('trainings that run on heart rate zones', () => {
  it('easy run, recovery run and long run: one block in their zone', () => {
    expect(build('tpl_easy_run')!.description).toBe('- Hardlopen 35m Z2 HR');
    expect(build('tpl_recovery_run')!.description).toBe('- Heel rustig 25m Z1 HR');
    expect(build('tpl_long_run')!.description).toMatch(/^- Lange duurloop \d+h?(\d+m)? Z2 HR$/);
    expect(build('tpl_long_run')!.target).toBe('HR');
  });

  it('hills: hard climbs of a minute have no heart rate target (it lags), the way down none either', () => {
    const w = build('tpl_hill_intervals')!;
    expect(w.description).toMatch(/Herhalingen \d+x\n- Hard bergop 1m\n- Terug naar beneden 2m\n/);
    expect(w.description).toContain('Warming-up\n- Opwarmen 11m Z2 HR');
  });

  it('hills with a controlled descent keep a zone for the descent', () => {
    expect(build('tpl_hills_descent')!.description).toContain('- Afdalen herhalen 18m Z2 HR');
  });

  it('strides: only the easy run has a zone, the 20 second strides have none', () => {
    const w = build('tpl_strides_run')!;
    expect(w.description).toContain('- Versnelling 20s\n- Op adem komen 1m');
    expect(w.description.split('\n')[0]).toMatch(/^- Rustig hardlopen \d+m Z2 HR$/);
  });

  it('progression run: the steadier blocks in zone 3', () => {
    expect(build('tpl_progression_run')!.description).toMatch(/Herhalingen \d+x\n- Iets steviger 5m Z3 HR/);
  });

  it('a mountain hike is a Hike with a warm-up and cool-down in zone 1; a rucksack walk is a Walk', () => {
    const hike = build('tpl_mountain_hike')!;
    expect(hike.type).toBe('Hike');
    expect(hike.description).toMatch(/^Warming-up\n- Rustig inlopen 10m Z1 HR\n\n- Bergtocht \d+h(\d+m)? Z2 HR\n\nCooling-down\n- Uitlopen 5m Z1 HR$/);
    expect(build('tpl_ruck_walk')!.type).toBe('Walk');
    expect(build('tpl_bike')!.type).toBe('Ride');
  });

  it('the 5 km test is a distance without a target, between a warm-up and a cool-down', () => {
    const w = build('tpl_test_run')!;
    expect(w.description).toBe(['Warming-up', '- Inlopen 10m Z2 HR', '', '- Test 5km', '', 'Cooling-down', '- Uitlopen 8m Z2 HR'].join('\n'));
  });
});

describe('what is not sent', () => {
  it('strength, rest and the race', () => {
    for (const id of ['tpl_upper_a', 'tpl_upper_b', 'tpl_lower_a', 'tpl_lower_b', 'tpl_herstel', 'tpl_race']) {
      expect(build(id), id).toBeUndefined();
    }
  });
});

describe('every training that is sent', () => {
  const sent = templates.filter((t) => build(t.id));

  it('is most of the cardio and hiking trainings', () => {
    expect(sent.length).toBeGreaterThanOrEqual(12);
  });

  it('has steps that add up to the planned minutes, ids that belong to ASCEND, and no dashes or odd characters', () => {
    for (const t of sent) {
      const w = build(t.id)!;
      expect(w.externalId, t.id).toBe(externalIdFor(`ps_${t.id}`));
      expect(w.externalId.startsWith('ascend:')).toBe(true);
      expect(w.movingTimeSec, t.id).toBeGreaterThan(0);
      expect(w.description, t.id).not.toMatch(/[–—−]/);
      // Every step line is "- cue duration [target]" and every other line a header or empty.
      for (const line of w.description.split('\n')) {
        if (line.startsWith('- ')) expect(line, `${t.id}: ${line}`).toMatch(/^- [\p{L} ]+ (\d+h)?(\d+m)?(\d+s)?(5km)?( Z\d(-Z\d)? HR| \d+:\d\d\/km-\d+:\d\d\/km Pace)?$/u);
        else expect(line, t.id).toMatch(/^(|[\p{L}-]+( \d+x)?)$/u);
      }
    }
  });

  it('a repeat block has an empty line around it', () => {
    const text = build('tpl_intervals')!.description;
    expect(text).toMatch(/\n\nHerhalingen 4x\n- .+\n- .+\n\nCooling-down/);
  });
});

describe('the ASCEND prefix', () => {
  it('short: "ASC " before the name, without a middle dot, and a short dated line at the top of the description', () => {
    const w = build('tpl_tempo_run', true, {}, 'short')!;
    expect(w.name).toBe(`ASC ${tpl('tpl_tempo_run').name}`);
    expect(WATCH_NAME_PREFIXES.short).toBe('ASC ');
    expect(w.description.split('\n')[0]).toBe(`Gepland door ASCEND voor ${shortDateNL(day)}`);
    expect(w.description.split('\n')[1]).toBe('');
    expect(w.description).not.toMatch(/[\u2013\u2014]/);
  });

  it('long: "ASCEND \u00b7 " before the name', () => {
    expect(build('tpl_easy_run', true, {}, 'long')!.name).toBe(`ASCEND \u00b7 ${tpl('tpl_easy_run').name}`);
  });

  it('is short when the option is absent, and plain only with "none"', () => {
    const s = session('tpl_easy_run');
    const w = buildWatchWorkout(s, tpl('tpl_easy_run'), program)!;
    expect(w.name).toBe(`ASC ${tpl('tpl_easy_run').name}`);
    expect(w.description.startsWith('Gepland door ASCEND voor ')).toBe(true);
    const none = buildWatchWorkout(s, tpl('tpl_easy_run'), program, undefined, { namePrefix: 'none' })!;
    expect(none.name).toBe(tpl('tpl_easy_run').name);
    expect(none.description.startsWith('Gepland door')).toBe(false);
  });

  it('changes the fingerprint, so what was sent without it is updated at the next round', () => {
    expect(build('tpl_easy_run', true, {}, 'short')!.fingerprint).not.toBe(build('tpl_easy_run')!.fingerprint);
    expect(build('tpl_easy_run', true, {}, 'short')!.fingerprint).not.toBe(build('tpl_easy_run', true, {}, 'long')!.fingerprint);
    const plain = build('tpl_easy_run')!;
    const marked = build('tpl_easy_run', true, {}, 'short')!;
    const plan = planWatchSync([marked], { [plain.plannedId]: { externalId: plain.externalId, date: plain.date, fingerprint: plain.fingerprint, eventId: 9 } }, day, new Set());
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].tracked.eventId).toBe(9);
    expect(plan.create).toEqual([]);
  });

  it('writes the date the same way everywhere', () => {
    expect(shortDateNL('2026-10-24')).toBe('za 24 okt');
    expect(shortDateNL('2027-03-01')).toBe('ma 1 mrt');
  });
});

describe('the fingerprint', () => {
  it('changes when the session moves or when a later week asks for more', () => {
    const base = build('tpl_tempo_run')!;
    expect(build('tpl_tempo_run', true, { scheduledDate: addDays(day, 1) })!.fingerprint).not.toBe(base.fingerprint);
    expect(build('tpl_tempo_run', true, { scheduledDate: addDays(day, 14) })!.fingerprint).not.toBe(base.fingerprint);
    expect(build('tpl_tempo_run', false)!.fingerprint).not.toBe(base.fingerprint);
  });

  it('stays the same when nothing changed', () => {
    expect(build('tpl_tempo_run')!.fingerprint).toBe(build('tpl_tempo_run')!.fingerprint);
  });
});

describe('selectWatchWorkouts: what should be on the watch', () => {
  const today = program.startDate;
  const base = { templates, program, today };

  it('takes the next 7 days of the planned trainings, in order, without strength', () => {
    const picked = selectWatchWorkouts({ ...base, sessions: plannedSessions, logs: [] });
    expect(picked.length).toBeGreaterThan(0);
    const last = addDays(today, 6);
    for (const w of picked) {
      expect(w.date >= today && w.date <= last).toBe(true);
    }
    expect([...picked].sort((a, b) => a.date.localeCompare(b.date))).toEqual(picked);
    expect(picked.some((w) => /Bovenlichaam|Benen/.test(w.name))).toBe(false);
  });

  it('leaves out what is skipped and what is already done', () => {
    const runs = plannedSessions.filter((s) => s.scheduledDate >= today && s.scheduledDate <= addDays(today, 6) && build(s.templateId));
    expect(runs.length).toBeGreaterThanOrEqual(2);
    const [first, second] = runs;
    const skipped = plannedSessions.map((s) => (s.id === first.id ? { ...s, status: 'skipped' as const } : s));
    const log = { id: 'l1', plannedSessionId: second.id } as SessionLog;
    const picked = selectWatchWorkouts({ ...base, sessions: skipped, logs: [log] });
    const ids = picked.map((w) => w.plannedId);
    expect(ids).not.toContain(first.id);
    expect(ids).not.toContain(second.id);
  });

  it('does not send yesterday or the day after the week', () => {
    const picked = selectWatchWorkouts({ ...base, today: addDays(today, 3), sessions: plannedSessions, logs: [] });
    for (const w of picked) expect(w.date >= addDays(today, 3) && w.date <= addDays(today, 9)).toBe(true);
  });
});

describe('planWatchSync: creating, updating, removing, and leaving things alone', () => {
  const today = day;
  const tempo = build('tpl_tempo_run')!;
  const easy = build('tpl_easy_run')!;
  const tracked = (w: typeof tempo, eventId = 1): TrackedWorkout => ({ externalId: w.externalId, date: w.date, fingerprint: w.fingerprint, eventId });

  it('creates what is new', () => {
    const plan = planWatchSync([tempo, easy], {}, today, new Set());
    expect(plan.create.map((w) => w.plannedId)).toEqual([tempo.plannedId, easy.plannedId]);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it('does nothing when everything is already there', () => {
    const plan = planWatchSync([tempo], { [tempo.plannedId]: tracked(tempo) }, today, new Set());
    expect(plan).toEqual({ create: [], update: [], remove: [], forget: [] });
  });

  it('updates a session ASCEND moved, with the id intervals.icu gave', () => {
    const moved = build('tpl_tempo_run', true, { scheduledDate: addDays(day, 1) })!;
    const plan = planWatchSync([moved], { [tempo.plannedId]: tracked(tempo, 77) }, today, new Set());
    expect(plan.create).toEqual([]);
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].tracked.eventId).toBe(77);
    expect(plan.update[0].workout.date).toBe(addDays(day, 1));
  });

  it('removes what fell away (skipped, deleted, moved out of the week)', () => {
    const plan = planWatchSync([easy], { [tempo.plannedId]: tracked(tempo), [easy.plannedId]: tracked(easy, 2) }, today, new Set());
    expect(plan.remove.map((r) => r.plannedId)).toEqual([tempo.plannedId]);
    expect(plan.update).toEqual([]);
  });

  describe('done, past and skipped trainings leave the agenda', () => {
    const past = { externalId: 'ascend:old', date: addDays(day, -2), fingerprint: 'x', eventId: 5 };
    const todayStill = build('tpl_easy_run')!; // today, not done: stays
    const books = { old: past, [tempo.plannedId]: tracked(tempo, 6), [todayStill.plannedId]: tracked(todayStill, 7) };

    it('takes a done training and a past one out, and keeps today\'s that is not done', () => {
      const plan = planWatchSync([todayStill], books, today, new Set([tempo.plannedId]));
      expect(plan.remove.map((r) => r.plannedId).sort()).toEqual(['old', tempo.plannedId].sort());
      expect(plan.remove.every((r) => r.tracked.externalId.startsWith('ascend:'))).toBe(true);
      expect(plan.forget).toEqual([]);
      expect(plan.create).toEqual([]);
      expect(plan.update).toEqual([]);
    });

    it('takes a skipped one out (it is no longer wanted)', () => {
      const plan = planWatchSync([], { [tempo.plannedId]: tracked(tempo, 6) }, today, new Set());
      expect(plan.remove.map((r) => r.plannedId)).toEqual([tempo.plannedId]);
    });

    it('with removal switched off it only forgets them, as before', () => {
      const plan = planWatchSync([todayStill], books, today, new Set([tempo.plannedId]), { removeDone: false });
      expect(plan.remove).toEqual([]);
      expect(plan.forget.sort()).toEqual(['old', tempo.plannedId].sort());
    });
  });

  it('only ever acts on what ASCEND tracked: an event the owner added himself is not in the list', () => {
    const plan = planWatchSync([], {}, today, new Set());
    expect(plan.remove).toEqual([]);
    expect(plan.update).toEqual([]);
  });
});
