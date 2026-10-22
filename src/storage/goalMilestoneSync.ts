// ASCEND — one-time resync of the GR5 goal's milestone definitions on an
// already-migrated device (Fase 5, sports-science review item G1).
//
// storage/goalMigration.ts's one-time Objective -> GoalMilestone migration
// already ran for any existing device before this restructure — its
// migrated GoalMilestone rows are frozen at whatever data/defaultProgram.ts
// looked like at that moment. storage/database.ts's own retirement comment
// for syncObjectiveDefinitions() explicitly says "the migrated GoalMilestone
// rows are the live source of truth from here on" — true for user-specific
// state (targetDate/progress), but it means restructuring the ladder's
// static content needs its own explicit, version-gated resync, exactly like
// syncTemplateAndScheduleDefinitions() already does for SessionTemplates —
// or a content change here would silently never reach a real device again.
//
// Safe by construction, not by care alone: every stable milestone id in the
// new ladder (data/defaultProgram.ts#buildObjective(), via
// engine/goalMigration.ts#LEGACY_MILESTONE_ID_MAP) is reused unchanged from
// the original 12-milestone ladder except for the one genuinely new pack
// milestone — so overwriting the GR5 goal's GoalMilestone rows here never
// orphans an existing GoalMilestoneProgress row: every id it could
// reference still means a real milestone afterward. GoalMilestoneProgress
// itself is never touched here (append-only, same as everywhere else), and
// neither is the TrainingGoal row itself — only its milestones.

import { migrateGr5ObjectiveData } from '../engine/goalMigration';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { PACK_MILESTONE_ID, TENT_PACK_KG, keepClearedMilestones, packMilestone, packWeightOf } from '../engine/gr5Profile';
import { GoalMilestoneProgressRepo, GoalMilestonesRepo, SessionLogsRepo, TrainingGoalsRepo, MetaRepo } from './database';

// Bump when data/defaultProgram.ts#buildObjective()'s milestone content
// changes shape (not for wording-only tweaks, which overwrite for free) —
// same convention as SCHEDULE_CONTENT_VERSION in storage/database.ts.
// v4: mijlpaal 11, de volle rugzaktocht, vraagt het rugzakdoel (14 kg met
// tent, of wat het doel zegt) in plaats van vast 12 kg. Wat je behaald had
// onder de oude eis blijft behaald: daar komt een rij in
// GoalMilestoneProgress voor (engine/gr5Profile.ts#keepClearedMilestones).
export const GR5_MILESTONE_CONTENT_VERSION = 4;

export async function syncGr5MilestoneDefinitions(): Promise<void> {
  const version = await MetaRepo.get<number>('gr5MilestoneContentVersion');
  if (version === GR5_MILESTONE_CONTENT_VERSION) return;

  const goal = (await TrainingGoalsRepo.getAll()).find((g) => g.id === 'obj_gr5');
  if (!goal) {
    // Nothing migrated yet on this device — storage/goalMigration.ts's own
    // one-time run will seed the current content directly, so there is
    // nothing to resync. Just record the version so this stays a no-op.
    await MetaRepo.set('gr5MilestoneContentVersion', GR5_MILESTONE_CONTENT_VERSION);
    return;
  }

  const freshObjective = buildDefaultProgramData().objectives.find((o) => o.id === 'obj_gr5');
  if (!freshObjective) {
    await MetaRepo.set('gr5MilestoneContentVersion', GR5_MILESTONE_CONTENT_VERSION);
    return;
  }

  // Deliberately discards the `goal`/`progress` parts of this transform's
  // output — the fresh seed objective carries no real targetDate/
  // targetDistanceKm (those are the user's own live state, untouched here)
  // and no real progress history (that's what GoalMilestoneProgress already
  // holds, live, unrelated to this content resync).
  const migrated = migrateGr5ObjectiveData(freshObjective, []).milestones;
  // Mijlpaal 11 volgt het rugzakdoel van dit doel, niet de standaard.
  const packKg = packWeightOf(goal.requirements) ?? TENT_PACK_KG;
  const milestones = migrated.map((m) => (m.id === PACK_MILESTONE_ID ? { ...m, ...packMilestone(packKg) } : m));
  // Eerst vastleggen wat je al behaald had, dan pas de eisen overschrijven.
  const [before, progress, logs] = await Promise.all([GoalMilestonesRepo.byGoal(goal.id), GoalMilestoneProgressRepo.byGoal(goal.id), SessionLogsRepo.getAll()]);
  for (const row of keepClearedMilestones(before, milestones, progress, logs)) await GoalMilestoneProgressRepo.put(row);
  for (const m of milestones) await GoalMilestonesRepo.put(m);
  // Version 3: the default English name became Dutch. A name the user
  // chose themselves stays.
  if (goal.name === 'GR5 / ALPINE READINESS') await TrainingGoalsRepo.put({ ...goal, name: freshObjective.name });

  await MetaRepo.set('gr5MilestoneContentVersion', GR5_MILESTONE_CONTENT_VERSION);
}
