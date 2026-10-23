// ASCEND: wat de doelwizard na "Doel activeren" laat zien. Elke uitkomst is een
// stap waar je het blad weer kunt sluiten: ook een fout, een planning die niet
// antwoordt of een activering die na de grens nog loopt (Warden Planning punt 1,
// de kwaliteitspoort: elke knop die wacht heeft een grens in tijd en een
// zichtbare uitkomst).
//
// Pure apart from the timer: no React, no IndexedDB.

import { TimeoutError, withTimeout } from '../utils/withTimeout';

export interface ActivationResult<H> {
  applied: boolean;
  reason?: 'stale' | 'review' | 'failed' | 'pending' | 'partial';
  horizon?: H;
}

export type WizardOutcome<H> =
  | { kind: 'review'; horizon: H }
  | { kind: 'done'; message?: string }
  // Still running after the limit: no error, and no "niets veranderd".
  | { kind: 'pending'; message: string }
  | { kind: 'error'; message: string };

export const ACTIVATION_LIMIT_MS = 75_000;

export const ACTIVATION_TEXT = {
  failed: 'Het lukte niet om je planning nu bij te werken. Er is niets veranderd; probeer het zo nog eens.',
  stale: 'Er is intussen iets veranderd (een nieuwe training of je planning). Open dit doel opnieuw om verder te gaan met de actuele situatie.',
  pending: 'Je planning wordt nog bijgewerkt. Je kunt dit sluiten; zodra het klaar is, zie je onderin wat er veranderde.',
  partial: 'Doel opgeslagen, maar je planning is maar half bijgewerkt. Onderin zie je wat er veranderde; met ongedaan maken zet je het terug.',
} as const;

export async function settleActivation<H>(run: () => Promise<ActivationResult<H>>, limitMs = ACTIVATION_LIMIT_MS): Promise<WizardOutcome<H>> {
  let result: ActivationResult<H>;
  try {
    result = await withTimeout(run(), limitMs, 'Doel activeren duurde te lang');
  } catch (err) {
    // A time limit that ran out: the work may still finish, so no "niets veranderd".
    return err instanceof TimeoutError ? { kind: 'pending', message: ACTIVATION_TEXT.pending } : { kind: 'error', message: ACTIVATION_TEXT.failed };
  }
  if (result.reason === 'review' && result.horizon !== undefined) return { kind: 'review', horizon: result.horizon };
  if (result.applied) return result.reason === 'partial' ? { kind: 'done', message: ACTIVATION_TEXT.partial } : { kind: 'done' };
  if (result.reason === 'pending') return { kind: 'pending', message: ACTIVATION_TEXT.pending };
  if (result.reason === 'stale') return { kind: 'error', message: ACTIVATION_TEXT.stale };
  return { kind: 'error', message: ACTIVATION_TEXT.failed };
}
