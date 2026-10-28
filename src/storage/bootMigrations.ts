// ASCEND — de opstartstappen die de opgeslagen gegevens op orde brengen, in
// vaste volgorde. Stond in state/AppDataContext.tsx; hier los van React zodat
// de naspeeltest (bootReplay.test.ts) precies dezelfde volgorde draait als de
// app. De aanroeper zorgt voor het slot (Web Lock) en dat dit één keer per
// paginalading gebeurt.
//
// Welke stappen er zijn, welke onmisbaar zijn en hoe lang een herstelstap mag
// duren staat in engine/bootWatch.ts (BOOT_MIGRATIONS). Een stap die voor deze
// versie van de app al gelopen heeft, slaat over zonder iets te lezen of te
// schrijven: één leesactie in meta zegt dat alles al gedaan is. Een backup
// terugzetten wist dat geheugen (database.ts#applyBackupWrites), zodat de
// stappen ook over geïmporteerde gegevens lopen.

import { seedIfEmpty, syncTemplateAndScheduleDefinitions, ensureDefaultTemplates, restorePatternSessionsRemovedByPrescription, normalizePlannedSessionWeeks, MetaRepo } from './database';
import { migrateToGoalEngine, migrateStrengthProgramDefault, migrateGoalRouteProfiles, migrateGoalKinds } from './goalMigration';
import { syncGr5MilestoneDefinitions } from './goalMilestoneSync';
import { mergeDuplicateWeeklyPrescriptionLines } from './planLogCleanup';
import { releaseSystemMoves } from './systemMovesStep';
import type { BootRunResult } from './bootLock';
import { BOOT_MIGRATIONS, BOOT_MIGRATIONS_KEY, BOOT_STEP_LIMIT_MS, migrationsToRun, recordAfter, type BootMigrationRecord } from '../engine/bootWatch';

const STEPS: Record<string, () => Promise<unknown>> = {
  // A new device gets only the templates; the program and the plan come after
  // the first questions (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
  seedIfEmpty: () => seedIfEmpty({ withProgram: false }),
  // Replaces the retired syncObjectiveDefinitions() — one-time migration
  // to TrainingGoal/GoalMilestone (Technical Architecture v0.3.1 REVISED,
  // Phase 1), guarded so it only ever runs once.
  migrateToGoalEngine,
  migrateGoalRouteProfiles,
  syncGr5MilestoneDefinitions,
  migrateStrengthProgramDefault,
  syncTemplateAndScheduleDefinitions,
  ensureDefaultTemplates,
  restorePatternSessionsRemovedByPrescription,
  normalizePlannedSessionWeeks,
  // Dubbele automatische regels uit de herschrijffout samenvoegen (idempotent).
  mergeDuplicateWeeklyPrescriptionLines,
  // Oude verplaatsingen door het systeem weer van het systeem (Warden Logica punt 4).
  releaseSystemMoves,
  migrateGoalKinds,
};

function currentBuild(): string {
  return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
}

const TIMED_OUT = Symbol('timed out');

export async function runBootMigrations(
  options: {
    onStep?: (id: string) => void;
    build?: string;
    stepLimitMs?: number;
    // For the tests: a step replaced by another function.
    overrides?: Record<string, () => Promise<unknown>>;
    // For the tests and the demo data: seed the whole default program (a goal and
    // a planning) on a new device, as the app did before the first questions
    // (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md). The app itself
    // never sets this.
    seedProgram?: boolean;
    // Asked before each step: true stops here (the page went out of view), so
    // the caller can let go of the lock. What is done is in meta; the next run
    // goes on from there (storage/bootLock.ts).
    shouldPause?: () => boolean;
    // Asked before each step: true when another window took the lock over
    // (Toch openen). This run stops there; that window runs the steps.
    isCancelled?: () => boolean;
  } = {},
): Promise<BootRunResult> {
  const build = options.build ?? currentBuild();
  const limit = options.stepLimitMs ?? BOOT_STEP_LIMIT_MS;
  // The first read of the opening: when the storage does not answer, it hangs
  // here, and the screen names it.
  options.onStep?.(BOOT_MIGRATIONS_KEY);
  let record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
  const skipped: string[] = [];
  let repairsStopped = false;
  // The repair that went over its time and still runs. The caller keeps the
  // lock until it is really done, and the planning sync waits for it, so it
  // never writes plannedSessions at the same time as the sync.
  let pending: Promise<void> | undefined;
  for (const step of migrationsToRun(record, build)) {
    const run = options.overrides?.[step.id] ?? (step.id === 'seedIfEmpty' && options.seedProgram ? () => seedIfEmpty() : STEPS[step.id]);
    if (!run) continue;
    if (options.isCancelled?.()) return pending ? { skipped, cancelled: true, pending } : { skipped, cancelled: true };
    if (!repairsStopped && options.shouldPause?.()) return { skipped, paused: true };
    // Na een herstelstap die bleef hangen, komen de andere herstelstappen deze
    // keer niet: ze schrijven deels dezelfde gegevens, en de hangende kan nog
    // aan het werk zijn. Volgende keer lopen ze gewoon.
    if (!step.essential && repairsStopped) {
      skipped.push(step.id);
      continue;
    }
    options.onStep?.(step.id);
    if (step.essential) {
      await run();
    } else {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const running = run().catch((err: unknown) => {
        // Een herstelstap die misgaat houdt het openen niet tegen.
        console.error(`Opstartstap ${step.id} mislukt`, err);
        return TIMED_OUT;
      });
      const outcome = await Promise.race([
        running,
        new Promise<typeof TIMED_OUT>((resolve) => (timer = setTimeout(() => resolve(TIMED_OUT), limit))),
      ]);
      clearTimeout(timer);
      if (outcome === TIMED_OUT) {
        console.warn(`Opstartstap ${step.id} niet afgerond; ASCEND opent zonder, volgende keer opnieuw.`);
        skipped.push(step.id);
        repairsStopped = true;
        pending = running.then(() => undefined);
        continue;
      }
    }
    record = recordAfter(record, build, step);
    await MetaRepo.set(BOOT_MIGRATIONS_KEY, record);
  }
  return pending ? { skipped, pending } : { skipped };
}

// Voor de test: elke stap uit engine/bootWatch.ts heeft hier zijn functie.
export function missingBootSteps(): string[] {
  return BOOT_MIGRATIONS.map((m) => m.id).filter((id) => !STEPS[id]);
}
