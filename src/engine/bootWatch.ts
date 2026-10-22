// ASCEND: the watch over opening the app. Pure.
//
// Opening may never end in a black screen. After a few seconds without the app,
// the screen says what it is doing; after twenty seconds it offers a way out
// (try again, or make a backup first) and names the step that does not finish,
// so the user can pass it on. When the storage itself does not answer (another
// ASCEND, frozen in the background, holds it), the screen says so in plain
// words, with what to do (docs/beslissingen/2026-10-22-opslag-vrij-bij-wegleggen.md).

export type BootStep = 'migraties' | 'gegevens' | 'planning';

export type BootWatchStage = 'quiet' | 'slow' | 'stuck';

// "Toch openen" on the screen for a boot lock that stays taken: the next load
// takes the lock over (Web Locks steal) instead of waiting for it.
export const BOOT_STEAL_FLAG = 'ascend-steal-boot-lock';
export const BOOT_LOCK_BUSY_TEXT = 'Een ander ASCEND-venster houdt het opstarten vast, waarschijnlijk een tabblad in Chrome dat Android heeft gepauzeerd. Sluit ASCEND-tabbladen in Chrome, of tik op Toch openen: dan neemt deze app het over. Je gegevens blijven staan.';

export const BOOT_SLOW_MS = 6_000;
export const BOOT_STUCK_MS = 20_000;

export function bootWatchStage(elapsedMs: number): BootWatchStage {
  if (elapsedMs >= BOOT_STUCK_MS) return 'stuck';
  if (elapsedMs >= BOOT_SLOW_MS) return 'slow';
  return 'quiet';
}

// What the screen says while a step takes long.
export function bootStepLine(step: BootStep): string {
  if (step === 'migraties') return 'Je gegevens worden klaargezet voor deze versie…';
  if (step === 'gegevens') return 'Je gegevens worden gelezen…';
  return 'Je planning wordt bijgewerkt…';
}

// The name of the step, to pass on when it hangs. For the migrations also the
// part that runs, so "migraties" alone never has to be guessed at.
export function bootStepName(step: BootStep, migration?: string | null): string {
  if (step === 'migraties') {
    if (migration === BOOT_MIGRATIONS_KEY) return 'migraties, de eerste leesactie (welke onderdelen al klaar zijn)';
    const index = BOOT_MIGRATIONS.findIndex((m) => m.id === migration);
    if (index < 0) return 'migraties';
    return `migraties, onderdeel ${BOOT_MIGRATIONS[index].id} (${index + 1} van ${BOOT_MIGRATIONS.length})`;
  }
  if (step === 'gegevens') return 'gegevens lezen';
  return 'planning';
}

// --- the migration steps ----------------------------------------------------
//
// The steps of storage/bootMigrations.ts, in their order. `essential`: the app
// can not open correctly without it, so it has no time limit. The others are
// repairs that may wait for a later opening: one that takes longer than
// BOOT_STEP_LIMIT_MS is left to finish on its own and the opening goes on.
// `version`: raise it when the step itself changes, so it runs again once on
// every device even within the same app version.

export interface BootMigration {
  id: string;
  essential: boolean;
  version: number;
}

export const BOOT_MIGRATIONS: readonly BootMigration[] = [
  { id: 'seedIfEmpty', essential: true, version: 1 },
  { id: 'migrateToGoalEngine', essential: true, version: 1 },
  { id: 'migrateGoalRouteProfiles', essential: true, version: 1 },
  { id: 'syncGr5MilestoneDefinitions', essential: false, version: 1 },
  { id: 'migrateStrengthProgramDefault', essential: false, version: 1 },
  { id: 'syncTemplateAndScheduleDefinitions', essential: true, version: 1 },
  { id: 'ensureDefaultTemplates', essential: true, version: 1 },
  { id: 'restorePatternSessionsRemovedByPrescription', essential: false, version: 1 },
  { id: 'normalizePlannedSessionWeeks', essential: false, version: 1 },
  { id: 'mergeDuplicateWeeklyPrescriptionLines', essential: false, version: 1 },
];

export const BOOT_STEP_LIMIT_MS = 8_000;

// Stored in meta under BOOT_MIGRATIONS_KEY: which steps already ran for this
// app version. A step that ran stays skipped, without reading or writing,
// until the app version changes or a backup is put back (that clears it).
export const BOOT_MIGRATIONS_KEY = 'bootMigrations';
export interface BootMigrationRecord {
  build: string;
  done: string[];
}

function stepKey(step: BootMigration): string {
  return `${step.id}@${step.version}`;
}

// The steps that still have to run on this opening, in order.
export function migrationsToRun(record: BootMigrationRecord | undefined | null, build: string, steps: readonly BootMigration[] = BOOT_MIGRATIONS): BootMigration[] {
  const done = record && record.build === build && Array.isArray(record.done) ? new Set(record.done) : new Set<string>();
  return steps.filter((s) => !done.has(stepKey(s)));
}

// The record after a step finished.
export function recordAfter(record: BootMigrationRecord | undefined | null, build: string, step: BootMigration): BootMigrationRecord {
  const done = record && record.build === build && Array.isArray(record.done) ? record.done : [];
  const key = stepKey(step);
  return { build, done: done.includes(key) ? done : [...done, key] };
}

// --- when it hangs ------------------------------------------------------------

// The short test the screen does when opening hangs: one read in the storage,
// with a limit of a few seconds.
export type StorageProbe = 'answers' | 'silent';
export const STORAGE_PROBE_MS = 3_000;

// What the screen says after twenty seconds. When the storage does not answer,
// nothing in this window can help; the user has to stop the other ASCEND.
export function bootStuckLines(step: BootStep, migration: string | null | undefined, probe: StorageProbe | null): string[] {
  const where = `Het openen blijft hangen bij de stap: ${bootStepName(step, migration)}.`;
  if (probe === 'silent') return [`Dit duurt te lang. ${where}`, ...storageSilentAdvice()];
  if (probe === 'answers') return [`Dit duurt te lang. ${where} De opslag antwoordt wel; tik op Opnieuw proberen, en geef de naam van de stap door als het blijft gebeuren.`];
  return [`Dit duurt te lang. ${where} Even kijken of de opslag nog antwoordt…`];
}

// The advice when the storage does not answer, also for Back-up maken.
export function storageSilentAdvice(): string[] {
  return [
    'De opslag van ASCEND antwoordt niet. ASCEND staat waarschijnlijk nog ergens anders open of is vastgelopen.',
    'Sluit alle ASCEND-tabbladen in Chrome en kies in je telefooninstellingen Apps, Chrome, Geforceerd stoppen. Open ASCEND daarna opnieuw. Je gegevens blijven staan.',
  ];
}

// What Back-up maken says when it does not work. `adviceShown`: the screen
// already explains above that the storage does not answer.
export function backupFailedLines(probe: StorageProbe | null, adviceShown = false): string[] {
  if (probe === 'silent' && adviceShown) return ['De back-up lukt nu niet, om dezelfde reden: de opslag antwoordt niet.'];
  if (probe === 'silent') return ['De back-up lukt nu niet.', ...storageSilentAdvice()];
  return ['De back-up lukte nu niet. Probeer het opnieuw na Opnieuw proberen.'];
}

// The order of opening (state/AppDataContext.tsx): first the data, then the
// app, and only then, in the background, the planning run. The app never waits
// for the planning: a run that does not finish can not keep the screen black.
export async function runBoot(deps: {
  migrate: () => Promise<void>;
  load: () => Promise<void>;
  onStep: (step: BootStep) => void;
  onReady: () => void;
  background: () => Promise<void>;
}): Promise<void> {
  deps.onStep('migraties');
  await deps.migrate();
  deps.onStep('gegevens');
  await deps.load();
  deps.onStep('planning');
  deps.onReady();
  void deps.background().catch((err) => console.error('Planning op de achtergrond mislukt', err));
}
