import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import { makeId } from '../utils/id';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';

// ---------------------------------------------------------------------------
// Session templates — the reusable "what" behind every planned session.
// ---------------------------------------------------------------------------

function buildTemplates(): SessionTemplate[] {
  return [
    {
      id: 'tpl_upper_a',
      name: 'Bovenlichaam A',
      type: 'strength',
      focus: 'Borst • Rug • Schouders',
      durationVariants: { full: 65, short: 35, minimum: 15 },
      defaultDayOfWeek: 1,
      exercises: [
        { id: 'ex1', exerciseName: 'Bankdrukken', sets: 4, reps: '6-8', targetWeightKg: 70, priority: 'core' },
        { id: 'ex2', exerciseName: 'Zittende kabelroeien', sets: 4, reps: '8-10', priority: 'core' },
        { id: 'ex3', exerciseName: 'Schouderpers', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex4', exerciseName: 'Lat pulldown', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex5', exerciseName: 'Zijwaartse heffingen', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex6', exerciseName: 'Triceps pushdown', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex7', exerciseName: 'Biceps curl', sets: 3, reps: '12-15', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_lower',
      name: 'Onderlichaam',
      type: 'strength',
      focus: 'Benen • Core',
      durationVariants: { full: 60, short: 35, minimum: 15 },
      defaultDayOfWeek: 3,
      exercises: [
        { id: 'ex8', exerciseName: 'Squat', sets: 4, reps: '5-8', targetWeightKg: 90, priority: 'core' },
        { id: 'ex9', exerciseName: 'Romeinse deadlift', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex10', exerciseName: 'Beenpers', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex11', exerciseName: 'Kuitheffingen', sets: 4, reps: '12-15', priority: 'accessory' },
        { id: 'ex12', exerciseName: 'Plank', sets: 3, reps: '45s', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_upper_b',
      name: 'Bovenlichaam B',
      type: 'strength',
      focus: 'Rug • Borst • Armen',
      durationVariants: { full: 60, short: 35, minimum: 15 },
      defaultDayOfWeek: 4,
      exercises: [
        { id: 'ex13', exerciseName: 'Optrekken', sets: 4, reps: '6-10', priority: 'core' },
        { id: 'ex14', exerciseName: 'Schuine halterpers', sets: 4, reps: '8-10', priority: 'core' },
        { id: 'ex15', exerciseName: 'Arnold press', sets: 3, reps: '8-10', priority: 'accessory' },
        { id: 'ex16', exerciseName: 'Face pulls', sets: 3, reps: '15', priority: 'accessory' },
        { id: 'ex17', exerciseName: 'Hamercurls', sets: 3, reps: '12', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_zone2',
      name: 'Zone 2 Duurloop',
      type: 'cardio',
      focus: 'Aerobe basis',
      durationVariants: { full: 60, short: 35, minimum: 20 },
      defaultDayOfWeek: 2,
      cardioTarget: { zone: 'Zone 2', targetDurationMin: 60, targetDistanceKm: 9 },
    },
    {
      id: 'tpl_incline',
      name: 'Stijgingstraining',
      type: 'cardio',
      focus: 'Incline • D+ opbouw',
      durationVariants: { full: 45, short: 30, minimum: 15 },
      defaultDayOfWeek: 5,
      cardioTarget: { zone: 'Incline', targetDurationMin: 45 },
    },
    {
      id: 'tpl_hike',
      name: 'Wandeling / Avontuur',
      type: 'hiking',
      focus: 'Duur • D+ • Rugzak',
      durationVariants: { full: 180, short: 90 },
      defaultDayOfWeek: 6,
      outdoorTarget: { targetDistanceKm: 12, targetElevationM: 500 },
    },
    {
      id: 'tpl_recovery',
      name: 'Herstel',
      type: 'recovery',
      focus: 'Mobiliteit • Ademhaling • Lichte rek',
      durationVariants: { full: 30 },
      defaultDayOfWeek: 7,
    },
  ];
}

// ---------------------------------------------------------------------------
// Program — four phases of four weeks, starting two weeks in the past so
// there is real history to look back on when the app is opened for the
// first time.
// ---------------------------------------------------------------------------

function buildProgram(): Program {
  const startDate = addDays(mondayOfWeek(todayISO()), -14);
  return {
    id: 'prog_ascend',
    name: 'ASCEND PROGRAMMA',
    startDate,
    phases: [
      { id: 'phase_1', name: 'FUNDAMENT', order: 1, weekCount: 4, description: 'Basis leggen: consistentie en techniek.' },
      { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 4, description: 'Volume en belasting opvoeren.' },
      { id: 'phase_3', name: 'BERGCAPACITEIT', order: 3, weekCount: 4, description: 'D+, afstand en rugzakcapaciteit.' },
      { id: 'phase_4', name: 'EXPEDITIEKLAAR', order: 4, weekCount: 4, description: 'Simulatie van meerdaagse tochten.' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Planned sessions — the weekly pattern repeated across the whole program.
// ---------------------------------------------------------------------------

function buildPlannedSessions(program: Program, templates: SessionTemplate[]): PlannedSession[] {
  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const sessions: PlannedSession[] = [];

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = addDays(program.startDate, week * 7);
    templates
      .filter((t) => t.defaultDayOfWeek)
      .forEach((t, order) => {
        const date = addDays(weekStart, (t.defaultDayOfWeek as number) - 1);
        sessions.push({
          id: makeId('planned'),
          templateId: t.id,
          scheduledDate: date,
          weekStartDate: weekStart,
          status: 'planned',
          order,
        });
      });
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// GR5 / Alpine Readiness — the default Ascent Ladder.
// ---------------------------------------------------------------------------

function buildObjective(): Objective {
  const objectiveId = 'obj_gr5';
  const defs: Array<[string, Objective['milestones'][number]['requirement']]> = [
    ['30 min Zone 2', { kind: 'duration', activityType: 'cardio', minMinutes: 30 }],
    ['45 min Zone 2', { kind: 'duration', activityType: 'cardio', minMinutes: 45 }],
    ['60 min Zone 2', { kind: 'duration', activityType: 'cardio', minMinutes: 60 }],
    ['300 D+', { kind: 'elevation', minMeters: 300 }],
    ['500 D+', { kind: 'elevation', minMeters: 500 }],
    ['750 D+', { kind: 'elevation', minMeters: 750 }],
    ['1000 D+', { kind: 'elevation', minMeters: 1000 }],
    ['15 km wandeling', { kind: 'distance', minKm: 15 }],
    ['15 km + 1000 D+', { kind: 'distanceAndElevation', minKm: 15, minMeters: 1000 }],
    ['Volledige rugzaksessie', { kind: 'backpack', minWeightKg: 12, minKm: 10 }],
    ['Twee dagen achter elkaar', { kind: 'consecutiveDays', days: 2 }],
    ['Weekend bergsimulatie', { kind: 'manual' }],
    ['GR5 KLAAR', { kind: 'manual' }],
  ];

  return {
    id: objectiveId,
    name: 'GR5 / ALPINE READINESS',
    description: 'Opbouw richting een meerdaagse Alpine trektocht zoals de GR5.',
    milestones: defs.map(([title, requirement], i) => ({
      id: `${objectiveId}_m${i + 1}`,
      objectiveId,
      order: i + 1,
      title,
      requirement,
    })),
  };
}

// ---------------------------------------------------------------------------
// Seed history — a couple of completed weeks so Today/Week/History/Ascend
// aren't empty on first launch, plus the milestone progress that history
// implies (cleared up to "500 D+").
// ---------------------------------------------------------------------------

function buildSeedLogsAndProgress(
  program: Program,
  plannedSessions: PlannedSession[],
  objective: Objective,
): { logs: SessionLog[]; progress: MilestoneProgress[] } {
  const logs: SessionLog[] = [];
  const progress: MilestoneProgress[] = [];
  const today = todayISO();
  const twoWeeksAgo = addDays(mondayOfWeek(today), -14);
  const thisWeekMonday = mondayOfWeek(today);

  const past = plannedSessions.filter(
    (s) => s.scheduledDate >= twoWeeksAgo && s.scheduledDate < thisWeekMonday,
  );

  // Skip one session on purpose so consistency isn't a suspicious 100%.
  const skipIndex = Math.min(4, past.length - 1);

  past.forEach((session, idx) => {
    if (idx === skipIndex) return; // left un-logged → shows as missed in history

    let strengthData: SessionLog['strengthData'];
    let cardioData: SessionLog['cardioData'];
    let outdoorData: SessionLog['outdoorData'];
    let duration = 55;
    let type: SessionLog['type'] = 'strength';

    if (session.templateId.startsWith('tpl_upper') || session.templateId === 'tpl_lower') {
      type = 'strength';
      duration = 60;
      strengthData = [{ exerciseId: 'ex1', exerciseName: 'Bankdrukken', sets: [{ reps: 8, weightKg: 67.5 }, { reps: 8, weightKg: 67.5 }, { reps: 7, weightKg: 67.5 }] }];
    } else if (session.templateId === 'tpl_zone2') {
      type = 'cardio';
      duration = 55;
      cardioData = { durationMinutes: 55, distanceKm: 8.5, avgHeartRate: 142, source: 'manual' };
    } else if (session.templateId === 'tpl_incline') {
      type = 'cardio';
      duration = 40;
      cardioData = { durationMinutes: 40, elevationGainM: 420, avgHeartRate: 138, source: 'manual' };
    } else if (session.templateId === 'tpl_hike') {
      type = 'hiking';
      duration = 165;
      const elevation = idx < past.length / 2 ? 320 : 540;
      outdoorData = { durationMinutes: 165, distanceKm: 13, elevationGainM: elevation, backpackWeightKg: 6, source: 'manual' };
    } else if (session.templateId === 'tpl_recovery') {
      type = 'recovery';
      duration = 30;
    }

    logs.push({
      id: makeId('log'),
      plannedSessionId: session.id,
      templateId: session.templateId,
      type,
      completedDate: session.scheduledDate,
      completedAt: `${session.scheduledDate}T18:00:00`,
      variant: 'full',
      durationMinutes: duration,
      strengthData,
      cardioData,
      outdoorData,
      source: 'manual',
    });
  });

  // Milestones already cleared, matching the elevation seeded above (300 & 500 D+).
  const clearedTitles = ['30 min Zone 2', '45 min Zone 2', '60 min Zone 2', '300 D+', '500 D+'];
  objective.milestones
    .filter((m) => clearedTitles.includes(m.title))
    .forEach((m) => {
      progress.push({
        id: makeId('progress'),
        objectiveId: objective.id,
        milestoneId: m.id,
        clearedDate: twoWeeksAgo,
      });
    });

  void program;
  return { logs, progress };
}

export function buildDefaultProgramData() {
  const program = buildProgram();
  const templates = buildTemplates();
  const plannedSessions = buildPlannedSessions(program, templates);
  const objective = buildObjective();
  const { logs, progress } = buildSeedLogsAndProgress(program, plannedSessions, objective);

  return {
    program,
    templates,
    plannedSessions,
    objectives: [objective],
    sessionLogs: logs,
    milestoneProgress: progress,
  };
}
