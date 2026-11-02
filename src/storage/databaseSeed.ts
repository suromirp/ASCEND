// Een nieuw toestel vullen, de standaardtrainingen bijhouden en opnieuw beginnen.

import type { SessionTemplate, PlannedSession } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { layoutPhases } from '../engine/programLayout';
import { clearForgeSessions } from '../utils/forgeSessionStore';
import { MetaRepo, putAll, ProgramsRepo, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo, clearStore, replacePlannedSessions } from './databaseRepos';
import { SCHEMA_VERSION } from './databaseSchema';
import { patternContext, defaultPatternSelector, patternSessions, withPackTarget } from './databaseHorizon';
import { SettingsRepo } from './databaseSettings';

// --- seeding & reset ---------------------------------------------------

// What a new device gets. `withProgram: true` (the default, kept for the demo
// data and for the tests that need a running plan) fills the whole default
// program: a GR5 goal and a planning. The app itself opens with
// `withProgram: false` (storage/bootMigrations.ts): only the building blocks
// every screen reads (the training templates); no program, no goal, nothing
// planned. The plan comes after the first questions, as a proposal with Akkoord
// (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
//
// A device is new when no seeding was ever recorded. Whether the app is
// "empty" for the screens is derived from the data itself (engine/freshStart.ts#isEmptyStart),
// so a device with data is never treated as a new start, marker or not.
export async function seedIfEmpty(options: { withProgram?: boolean } = {}): Promise<void> {
  const seeded = await MetaRepo.get<boolean>('seeded');
  if (seeded) return;
  const withProgram = options.withProgram ?? true;

  if (!withProgram) {
    // Only the building blocks; never a program, so data that is already there
    // (a marker lost, a backup put back in an odd order) is never overwritten.
    await putAll('sessionTemplates', buildDefaultProgramData().templates);
    await MetaRepo.set('seeded', true);
    // No seededAt: the card "Nieuw begonnen" is for devices that were filled
    // with the default program; this one waits for your own choices.
    await MetaRepo.set('schemaVersion', SCHEMA_VERSION);
    await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
    return;
  }

  const { program, templates, plannedSessions, objectives, sessionLogs, milestoneProgress } = buildDefaultProgramData();
  await ProgramsRepo.put(program);
  await putAll('sessionTemplates', templates);
  await putAll('plannedSessions', plannedSessions);
  await putAll('objectives', objectives);
  await putAll('sessionLogs', sessionLogs);
  await putAll('milestoneProgress', milestoneProgress);
  await MetaRepo.set('seeded', true);
  // When this device started from an empty database: Today offers to put a
  // backup back for the first days (engine/freshStart.ts).
  await MetaRepo.set('seededAt', new Date().toISOString());
  await MetaRepo.set('schemaVersion', SCHEMA_VERSION);
  await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
}

// syncObjectiveDefinitions()/GR5_LADDER_CONTENT_VERSION retired (Technical
// Architecture v0.3.1 REVISED, Migration plan): its job — keeping the
// legacy GR5 ladder's static content current on an already-seeded device —
// is superseded by storage/goalMigration.ts's one-time migration to
// TrainingGoal/GoalMilestone. The legacy `objectives` store this used to
// upsert into is still seeded once by seedIfEmpty() above (migration reads
// its user-specific state — targetDate/progress — from there), but its
// static content (name/milestones) no longer needs ongoing sync: the
// migrated GoalMilestone rows are the live source of truth from here on.

// SessionTemplate definitions are static content, same reasoning as
// syncObjectiveDefinitions above — safe to overwrite in place. The weekly
// PlannedSession pattern they generate is not: an already-seeded device has
// its own program.startDate and, more importantly, real SessionLogs whose
// plannedSessionId points at specific PlannedSession rows. Bump this when
// buildTemplates()/the defaultDayOfWeek pattern in data/defaultProgram.ts
// changes shape (not for wording-only tweaks, which upsert for free).
//
// Only PlannedSessions from the Monday *after* the week containing today
// are regenerated — the whole week someone is mid-way through, including
// its still-future days, is left exactly as already scheduled. (v1 of this
// cut off at "today" itself, which could fragment the in-progress week:
// Monday already logged under the old pattern, but Thursday/Friday/
// Saturday of that same week silently reshaped underneath it — see the
// v1->v2 correction below.) Nothing that already happened silently
// reshapes itself, and no already-logged session's plannedSessionId ever
// dangles. A future session the user already skipped or moved is still
// replaced by this — same full-overwrite tradeoff syncObjectiveDefinitions/
// resetToDemoData already make for non-historical data, just scoped to
// "not this week or earlier" here.
// v3: swapped Bovenlichaam A/Bovenlichaam B's defaultDayOfWeek (data/defaultProgram.ts) —
// Bovenlichaam A was displaced from Monday to Friday by an earlier reshape (moving
// Herstel onto Monday) while Bovenlichaam B stayed put on Thursday, an unintended
// side effect that left Bovenlichaam B landing before Bovenlichaam A each week with no
// actual training rationale behind the order (confirmed via git history —
// user bug report). Fixed at the source; this bump carries it to already-
// seeded devices the same safe way v1->v2 did.
const SCHEDULE_CONTENT_VERSION = 3;

// One-time correction for exactly the fragmentation v1 could cause (see
// above): a week where tpl_upper_a appears twice — once on its old Monday
// slot (already scheduled/logged before v1 ran) and once on its new Friday
// slot (written by v1, since Friday fell after v1's same-day cutoff) — with
// tpl_hill_intervals/tpl_long_run also freshly written into that week's
// Saturday/Sunday. Reverts just those three still-unlogged sessions back to
// the old Friday/Saturday/Sunday templates (Bergconditie/Benen B/Herstel),
// so the in-progress week reads as one coherent plan again; the new pattern
// still takes over cleanly from the following Monday (already correct,
// untouched by this).
async function fixV1WeekFragmentation(): Promise<void> {
  const [sessions, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll()]);
  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));

  const byWeek = new Map<string, PlannedSession[]>();
  for (const s of sessions) {
    const list = byWeek.get(s.weekStartDate);
    if (list) list.push(s);
    else byWeek.set(s.weekStartDate, [s]);
  }

  const REVERT: Record<string, string> = {
    tpl_hill_intervals: 'tpl_lower_b',
    tpl_long_run: 'tpl_herstel',
  };

  for (const weekSessions of byWeek.values()) {
    const upperAs = weekSessions.filter((s) => s.templateId === 'tpl_upper_a').sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1));
    if (upperAs.length < 2) continue; // not a fragmented week

    // Only the later (Friday, written by v1) occurrence is the erroneous
    // duplicate — the earliest one is the legitimate original Monday slot
    // and must never be touched, logged or not.
    const duplicate = upperAs[upperAs.length - 1];
    if (!loggedPlannedIds.has(duplicate.id)) {
      await PlannedSessionsRepo.put({ ...duplicate, templateId: 'tpl_bergconditie' });
    }

    for (const s of weekSessions) {
      if (s.id === duplicate.id || loggedPlannedIds.has(s.id)) continue;
      if (REVERT[s.templateId]) {
        await PlannedSessionsRepo.put({ ...s, templateId: REVERT[s.templateId] });
      }
    }
  }
}

// Keeps every built-in SessionTemplate on this device equal to its current
// definition in data/defaultProgram.ts — adds new ones (e.g. tpl_bike) and
// updates changed ones (e.g. a new usual weekday) — without touching the
// schedule. syncTemplateAndScheduleDefinitions below only runs on a
// content-version bump and then regenerates future weeks, which would throw
// away a user's own placement; a changed template definition on its own
// never needs that. The new definitions take effect in the planning at the
// next clean restart (Settings → Training → Programma) or wherever ASCEND
// plans new sessions.
export async function ensureDefaultTemplates(): Promise<void> {
  const existing = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
  const changed = buildDefaultProgramData().templates.filter((t) => JSON.stringify(existing.get(t.id)) !== JSON.stringify(t));
  if (changed.length > 0) await putAll('sessionTemplates', changed);
}

export async function syncTemplateAndScheduleDefinitions(): Promise<void> {
  const version = await MetaRepo.get<number>('scheduleVersion');
  if (version === SCHEDULE_CONTENT_VERSION) return;

  if (version === 1) {
    await fixV1WeekFragmentation();
  }

  const { templates } = buildDefaultProgramData();
  await putAll('sessionTemplates', templates);

  const [programs, existingSessions] = await Promise.all([ProgramsRepo.getAll(), PlannedSessionsRepo.getAll()]);
  const program = programs[0];
  if (!program) {
    await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
    return;
  }

  const cutoff = addDays(mondayOfWeek(todayISO()), 7);
  const toDelete = existingSessions.filter((s) => s.scheduledDate >= cutoff);
  await Promise.all(toDelete.map((s) => PlannedSessionsRepo.delete(s.id)));

  const ctx = await patternContext(templates, await defaultPatternSelector(), undefined, program);
  await putAll('plannedSessions', patternSessions(program, templates, ctx.pattern, ctx.swaps, { from: cutoff, until: ctx.anchor }));

  await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
}

// Emptied (not deleted) by storage/goalMigration.ts once the one-time
// migration has copied their content forward — see that file.
export async function clearLegacyObjectiveStores(): Promise<void> {
  await Promise.all([clearStore('objectives'), clearStore('milestoneProgress')]);
}

export async function resetToDemoData(): Promise<void> {
  // Een lopende training hoort bij de planning die nu weggaat: wijzer en concepten mee.
  clearForgeSessions();
  await Promise.all([
    clearStore('programs'),
    clearStore('sessionTemplates'),
    clearStore('plannedSessions'),
    clearStore('sessionLogs'),
    clearStore('objectives'),
    clearStore('milestoneProgress'),
    clearStore('recoveryMetrics'),
    clearStore('bodyMetrics'),
    clearStore('nutritionMetrics'),
    clearStore('injuryNotes'),
    clearStore('trainingGoals'),
    clearStore('goalMilestones'),
    clearStore('goalMilestoneProgress'),
    clearStore('trainingPrescriptions'),
    clearStore('capabilityEvidence'),
    clearStore('planChangeProposals'),
    clearStore('strengthProgramStrategies'),
    clearStore('strengthProgramRecommendations'),
    clearStore('weeklyPrescriptions'),
    // "Alles verwijderen" means everything: settings, availability, coach
    // answers, illness and weight history, and the pre-import copies that
    // hold a full copy of the old history.
    clearStore('backupSnapshots'),
    // The full series of runs belong to the logs and go with them.
    clearStore('activityStreams'),
    clearStore('meta'),
  ]);
  // Production incident: trainingGoals above is cleared, but the marathon
  // fields in `settings` (AppSettings) are a second, shadow pointer into
  // that same goal — storage/goalMigration.ts#migrateToGoalEngine reads
  // them straight back out and silently re-mints the exact same
  // TrainingGoal (buildMarathonGoal) the moment goalEngineMigrated is unset
  // below. Without this, "reset alles" leaves a stale marathonRaceType
  // behind that regenerates a goal the user believed they'd wiped —
  // status:'paused' if marathonTargetDate was never set, which is silently
  // invisible everywhere (see MarathonGoalCard's status badge/pages/Ascend.tsx).
  await SettingsRepo.set({ marathonRaceType: undefined, marathonTargetDate: undefined, marathonTargetTimeMinutes: undefined });
  await MetaRepo.set('seeded', false);
  await MetaRepo.set('goalEngineMigrated', false);
  await MetaRepo.set('strengthProgramDefaultSeeded', false);
  // Like a fresh install: only the templates, no program or planning, so the app
  // opens on the welcome and asks before it plans anything
  // (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
  await seedIfEmpty({ withProgram: false });
}

// User-facing "reset my schedule" — Settings' SCHEMA OPNIEUW LADEN button.
// Deliberately NOT resetToDemoData: that's a full factory reset (wipes
// sessionLogs/injuryNotes/capabilityEvidence/trainingGoals/... too), which
// is wrong here — a user asking to reset their *schedule* still wants their
// training history, injuries and goals intact (production bug report: this
// button silently deleted "geschiedenis en al mijn afgeronde activiteiten").
//
// Only ever touches `programs`/`sessionTemplates`/`plannedSessions` — the
// same content `syncTemplateAndScheduleDefinitions` treats as safe to
// regenerate — and even then only PlannedSessions from `cutoff` onward,
// with logged ones excluded on top of that as a second, independent guard
// (a SessionLog's plannedSessionId must never dangle). `startFrom` decides
// where the standard weekly rotation restarts as "Maand 1, Week 1":
// 'this_week' takes effect immediately (today onward, this week's earlier
// days/logs untouched); 'next_week' leaves the rest of the current week
// exactly as already scheduled and only starts the fresh pattern next
// Monday. Either way `program.startDate` moves to this week's Monday, so
// week/phase numbering always restarts cleanly from Week 1 — dates before
// it simply resolve outside the (new) program via resolveProgramWeek,
// exactly like any date before a fresh install's startDate.
export async function resetScheduleToDefault(startFrom: 'this_week' | 'next_week'): Promise<void> {
  const [programs, existingSessions, logs] = await Promise.all([
    ProgramsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
  ]);
  const program = programs[0];
  if (!program) return;

  const thisMonday = mondayOfWeek(todayISO());
  const cutoff = startFrom === 'this_week' ? todayISO() : addDays(thisMonday, 7);

  const { templates } = buildDefaultProgramData();
  await putAll('sessionTemplates', templates);
  const ctx = await patternContext(templates, await defaultPatternSelector(), undefined, program);
  const next = withPackTarget({ ...program, startDate: thisMonday, phases: layoutPhases(thisMonday, ctx.anchor, todayISO(), ctx.overrides, { free: ctx.free, waveStart: ctx.waveStart, beginnerWeeks: ctx.beginnerWeeks, wave: ctx.wave }) }, ctx.packTarget, ctx.runBuild, ctx.direction);
  await ProgramsRepo.put(next);

  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const toDelete = existingSessions.filter((s) => s.scheduledDate >= cutoff && !loggedPlannedIds.has(s.id));
  const kept = keptLoggedSlots(existingSessions, loggedPlannedIds, cutoff);
  const newSessions = patternSessions(next, templates, ctx.pattern, ctx.swaps, { from: cutoff, until: ctx.anchor, skipSlot: (id, date) => kept.has(`${id}|${date}`) });
  await replacePlannedSessions(toDelete, newSessions);
}

// Logged sessions on or after the cutoff stay; a rebuilt pattern must not
// put the same template on the same day next to one (the user would be
// asked to do a session they already did).
function keptLoggedSlots(sessions: PlannedSession[], loggedIds: Set<string | undefined>, cutoff: string): Set<string> {
  return new Set(sessions.filter((s) => s.scheduledDate >= cutoff && loggedIds.has(s.id)).map((s) => `${s.templateId}|${s.scheduledDate}`));
}

// "Schone start vanaf week 1" (Settings → Training → Programma). Week 1
// moves to this or next week AND the planning from then on is rebuilt from
// the program's own weekly pattern: your own moves/skips from there on are
// dropped (that is the point of starting over), logged sessions and all
// history stay. selectPattern lets the caller shape the weekly pattern
// (engine/sports.ts#weeklyPatternTemplates: sports on/off, a weekly ride);
// the caller then applies the active strength block and the
// weekly planning on top (state/AppDataContext.tsx#restartProgram), so the
// rebuilt week follows the user's settings instead of a bare template.
export async function rebuildPlanningFromWeekOne(
  startFrom: 'this_week' | 'next_week',
  selectPattern: (templates: SessionTemplate[]) => SessionTemplate[] = (templates) => templates.filter((t) => t.defaultDayOfWeek),
): Promise<{ created: number; removed: number }> {
  const [programs, existingSessions, logs, templates] = await Promise.all([
    ProgramsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
  ]);
  const program = programs[0];
  if (!program) return { created: 0, removed: 0 };

  const thisMonday = mondayOfWeek(todayISO());
  const newStart = startFrom === 'this_week' ? thisMonday : addDays(thisMonday, 7);
  const cutoff = startFrom === 'this_week' ? todayISO() : newStart;
  const ctx = await patternContext(templates, selectPattern, undefined, program);
  const next = withPackTarget({ ...program, startDate: newStart, phases: layoutPhases(newStart, ctx.anchor, todayISO(), ctx.overrides, { free: ctx.free, waveStart: ctx.waveStart, beginnerWeeks: ctx.beginnerWeeks, wave: ctx.wave }) }, ctx.packTarget, ctx.runBuild, ctx.direction);
  await ProgramsRepo.put(next);

  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const toDelete = existingSessions.filter((s) => s.scheduledDate >= cutoff && !loggedPlannedIds.has(s.id));
  const kept = keptLoggedSlots(existingSessions, loggedPlannedIds, cutoff);
  const newSessions = patternSessions(next, templates, ctx.pattern, ctx.swaps, { from: cutoff, until: ctx.anchor, skipSlot: (id, date) => kept.has(`${id}|${date}`) });
  await replacePlannedSessions(toDelete, newSessions);
  return { created: newSessions.length, removed: toDelete.length };
}

// "Opnieuw beginnen bij week 1" (Settings → Training). Only moves where
// week 1 starts — weeks are derived from Program.startDate (CLAUDE.md), so
// every week number, phase and week-in-phase progression target shifts
// with it. Unlike resetScheduleToDefault, nothing already planned is
// deleted or moved (the user's own placement, strength block included) and
// history is untouched. The one thing added: default-pattern sessions for
// weeks inside the new program span that have no sessions at all yet
// (the extra week(s) at the end when week 1 moves later), from today on.
export async function restartProgramAtWeekOne(startFrom: 'this_week' | 'next_week'): Promise<void> {
  const [programs, existingSessions] = await Promise.all([ProgramsRepo.getAll(), PlannedSessionsRepo.getAll()]);
  const program = programs[0];
  if (!program) return;

  const thisMonday = mondayOfWeek(todayISO());
  const newStart = startFrom === 'this_week' ? thisMonday : addDays(thisMonday, 7);
  const templates = await SessionTemplatesRepo.getAll();
  const ctx = await patternContext(templates, undefined, undefined, program);
  const next = withPackTarget({ ...program, startDate: newStart, phases: layoutPhases(newStart, ctx.anchor, todayISO(), ctx.overrides, { free: ctx.free, waveStart: ctx.waveStart, beginnerWeeks: ctx.beginnerWeeks, wave: ctx.wave }) }, ctx.packTarget, ctx.runBuild, ctx.direction);
  await ProgramsRepo.put(next);

  const weeksWithSessions = new Set(existingSessions.map((s) => mondayOfWeek(s.scheduledDate)));
  const newSessions = patternSessions(next, templates, ctx.pattern, ctx.swaps, { from: todayISO(), until: ctx.anchor, skipWeek: (w) => weeksWithSessions.has(w) });
  if (newSessions.length > 0) await putAll('plannedSessions', newSessions);
}
