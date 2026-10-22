// ASCEND: the watch over opening the app. Pure.
//
// Opening may never end in a black screen. After a few seconds without the app,
// the screen says what it is doing; after twenty seconds it offers a way out
// (try again, or make a backup first) and names the step that does not finish,
// so the user can pass it on.

export type BootStep = 'migraties' | 'gegevens' | 'planning';

export type BootWatchStage = 'quiet' | 'slow' | 'stuck';

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

// The name of the step, to pass on when it hangs.
export function bootStepName(step: BootStep): string {
  if (step === 'migraties') return 'migraties';
  if (step === 'gegevens') return 'gegevens lezen';
  return 'planning';
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
