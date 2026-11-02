// Het openen van de app: de opstartstappen een keer per pagina, onder het slot van
// storage/bootLock.ts, en de stap die het openingsscherm laat zien.

import { useEffect } from 'react';
import { runBootMigrations } from '../storage/bootMigrations';
import { runBootUnderLock } from '../storage/bootLock';
import { describeStorageError } from '../storage/storageError';
import { storageIsOpen, whenStorageOpen } from '../storage/lifecycle';
import { SHOW_SPLASH } from '../utils/updateFlag';
import { resolveMotion, splashMinimumMs } from '../engine/motionSettings';
import { syncWatchActivities } from '../storage/externalActivities';
import { syncHealthConnect } from '../storage/healthConnect';
import { ensureRecentTestEfforts } from '../storage/activityDetail';
import { syncWatchWorkouts } from '../storage/watchWorkouts';
import { bootLockChoice, runBoot, type BootStep } from '../engine/bootWatch';
import { requestPersistentStorage } from '../storage/persistence';
import { onDatabaseBlocked } from '../storage/database';
import type { Dispatch, SetStateAction } from 'react';

// The boot sequence must run once per page load. React StrictMode mounts
// effects twice in development; two concurrent seedIfEmpty() calls both saw
// an empty database and seeded it twice (every session doubled). One shared
// promise makes the second caller wait for the first instead.
let bootMigrations: Promise<void> | null = null;
let backgroundPlanningStarted = false;
// The part of the migrations that runs, for the watch on the opening screen
// (engine/bootWatch.ts#bootStepName): never just "migraties".
export let currentBootMigration: string | null = null;
export const bootMigrationListeners = new Set<(id: string) => void>();
function noteBootMigration(id: string) {
  currentBootMigration = id;
  bootMigrationListeners.forEach((fn) => fn(id));
}


// Web Locks serialize the boot across windows too: a fresh install opened
// in two tabs at once used to seed the whole program twice, and the boot
// migrations write planned sessions and templates on every opening. So a window
// never runs them without the lock. When another window holds it for longer
// than 10 s (a tab frozen in the background), this window says so, with
// Opnieuw proberen, instead of a black screen or a second run at the same time
// (docs/beslissingen/2026-10-22-openen-wacht-niet-op-de-planning.md).
// The lock is asked only while the page is in view, let go when it goes out of
// view between two steps, and kept until a repair that went over its time is
// really done (storage/bootLock.ts).
// Resolves when the boot steps are really done, a slow repair included. The
// planning sync waits for it, so it never writes the plan at the same time.
export let bootSettled: Promise<void> = Promise.resolve();
function sessionStorageOrNull(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}
export function runBootMigrationsOnce(): Promise<void> {
  if (!bootMigrations) {
    const { ready, settled } = runBootUnderLock({
      locks: typeof navigator !== 'undefined' ? navigator.locks : undefined,
      whenOpen: whenStorageOpen,
      isOpen: storageIsOpen,
      run: (shouldPause, isCancelled) => runBootMigrations({ onStep: noteBootMigration, shouldPause, isCancelled }),
      // Toch openen (the screen for a lock that stays taken): this one load
      // takes the lock over (docs/beslissingen/2026-10-22-toch-openen.md).
      steal: bootLockChoice(sessionStorageOrNull()) === 'steal',
    });
    bootSettled = settled;
    bootMigrations = ready.then(
      (skipped) => {
        if (skipped.length > 0) console.warn('Opstartstappen overgeslagen tot de volgende keer', skipped);
      },
      (err: unknown) => {
        // Opnieuw proberen in the same page asks for the lock again.
        bootMigrations = null;
        throw err;
      },
    );
  }
  return bootMigrations;
}

// Het openen zelf: eerst de gegevens, dan de app, dan de planning op de achtergrond.
export function useBoot(deps: {
  setLoading: Dispatch<SetStateAction<boolean>>;
  setBootError: Dispatch<SetStateAction<string | null>>;
  setBootStep: Dispatch<SetStateAction<BootStep>>;
  loadState: () => Promise<void>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
  runForecastReplan: () => Promise<void>;
  runWeeklyPrescriptionBuild: () => Promise<void>;
  runStrengthReviewCheck: () => Promise<void>;
}) {
  const { setLoading, setBootError, setBootStep, loadState, refresh, runForecastReplan, runWeeklyPrescriptionBuild, runStrengthReviewCheck } = deps;
  useEffect(() => {
    (async () => {
      // AscendSplashLogo's entrance sequence (glow, ring, crest, mountain,
      // trail, dot with spark, wordmark; .alogo-* in index.css) finishes at
      // 2.2s in Normaal, 0.8s in Rustig; Uit stands still at once
      // (engine/motionSettings.ts#splashMinimumMs). On a warm load,
      // seedIfEmpty/refresh can resolve in a handful of ms; without a floor
      // the splash would unmount before the sequence is seen. It is only a
      // floor: the loading never waits for the animation, and the ambient
      // motion (glow, breathing ring, travelling light) stops with the splash.
      // Only the first open of the day shows the splash (utils/updateFlag.ts
      // #SHOW_SPLASH); otherwise there is no minimum duration.
      const splashMotion = resolveMotion({ motion: document.documentElement.dataset.motion });
      const minSplashDuration = new Promise((resolve) => setTimeout(resolve, SHOW_SPLASH ? splashMinimumMs(splashMotion) : 0));
      const stopBlockedNotice = onDatabaseBlocked(() =>
        setBootError('ASCEND is in een ander venster nog open met een oudere versie. Sluit dat venster om de update af te ronden.'),
      );
      // First the data, then the app, and only then the planning run in the
      // background (engine/bootWatch.ts#runBoot): a run that does not finish
      // can never keep the screen black.
      const background = async () => {
        // Once per page load, like the migrations.
        if (backgroundPlanningStarted) return;
        backgroundPlanningStarted = true;
        // A repair from the opening that still runs writes the plan too: the
        // background steps start when it is done (storage/bootLock.ts).
        await bootSettled;
        // One after the other, never at once: the sync of today first, then
        // the steps below; each reads what the one before wrote, and each ends
        // in a refresh that runs the sync and its week check over the result
        // (docs/onderzoek/Planning op een lijn.md, conflict 12).
        // Each on its own: one that fails doesn't stop the next.
        // Tests of the last 60 days that still want their best 5 km: read once, refresh when one was added.
        const readRecentTestEfforts = async () => {
          if (await ensureRecentTestEfforts()) await refresh();
        };
        for (const [name, step] of [['planning sync', () => refresh()], ['availability', runForecastReplan], ['strength review', runStrengthReviewCheck], ['weekly prescription', runWeeklyPrescriptionBuild], ['watch activities', syncWatchActivities], ['health connect', () => syncHealthConnect()], ['best 5 km of recent tests', readRecentTestEfforts], ['watch workouts', syncWatchWorkouts]] as const) {
          try {
            await step();
          } catch (err) {
            console.error(`Background planning (${name}) failed`, err);
          }
        }
      };
      let ready = false;
      try {
        await Promise.all([
          runBoot({
            migrate: runBootMigrationsOnce,
            load: loadState,
            onStep: setBootStep,
            onReady: () => {
              ready = true;
            },
            // After the splash, so the planning does not slow the opening down.
            background: async () => {
              await minSplashDuration;
              await background();
            },
          }),
          minSplashDuration,
        ]);
      } catch (err) {
        setBootError(describeStorageError(err));
        setLoading(false);
        return;
      } finally {
        stopBlockedNotice();
      }
      if (!ready) return;
      setBootError(null);
      setLoading(false);
      void requestPersistentStorage();
    })();
  }, [refresh, loadState, runForecastReplan, runStrengthReviewCheck, runWeeklyPrescriptionBuild, setLoading, setBootStep, setBootError]);
}
