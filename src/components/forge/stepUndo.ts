// "Terug naar ... in je plan" (StepUndoRow.tsx in het blad van een oefening): of de rij er hoort, en één opslag met een
// grens in tijd. Puur: geen React. Het blad legt `stepUndoFrom` vast bij het openen: na de opslag is de stap weg en zou
// de rij met zijn eigen uitkomst anders meteen verdwijnen.

import { exerciseById } from '../../data/exercises';
import { stepSwapAt, type StepSwaps } from '../../engine/stepSwaps';

// De naam van de oefening van het sjabloon, alleen als deze oefening de stap is die nu in je plan staat. Ruilen in deze
// training telt niet.
export function stepUndoFrom(model: { stepSwaps?: StepSwaps } | undefined, templateId: string, ex: { slot: string; exerciseId: string; swappedFrom?: string }): string | undefined {
  const step = stepSwapAt(model, templateId, ex.slot);
  return step && step.to === ex.exerciseId && !ex.swappedFrom ? exerciseById(step.from)?.name : undefined;
}

export const SAVE_LIMIT_MS = 8000;

// Gelukt als de opslag binnen de grens terugkomt, anders niet; `late` hoort een gelukte opslag na de grens.
export async function saveWithLimit(write: () => Promise<unknown>, limitMs = SAVE_LIMIT_MS, late?: () => void): Promise<'done' | 'failed'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let over = false;
  const run = write();
  run.then(() => {
    if (over) late?.();
  }, () => undefined);
  const limit = new Promise<'failed'>((resolve) => {
    timer = setTimeout(() => {
      over = true;
      resolve('failed');
    }, limitMs);
  });
  try {
    return await Promise.race([run.then(() => 'done' as const, () => 'failed' as const), limit]);
  } finally {
    clearTimeout(timer);
  }
}
