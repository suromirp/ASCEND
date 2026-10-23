import { describe, it, expect } from 'vitest';
import { ACTIVATION_TEXT, settleActivation, type ActivationResult } from './goalActivationOutcome';

// Warden Planning punt 1: de doelwizard blijft nooit hangen. Een fout, een
// planning die niet antwoordt of een activering die te lang duurt, geeft een
// stap met een tekst en een knop om te sluiten.

describe('settleActivation', () => {
  it('een fout wordt een foutstap, geen wizard die blijft hangen', async () => {
    const out = await settleActivation(() => Promise.reject(new Error('De planning reageert nu niet.')));
    expect(out).toEqual({ kind: 'error', message: ACTIVATION_TEXT.failed });
  });

  it('wat na de grens nog loopt, zegt dat het nog bezig is en niet dat er niets veranderde', async () => {
    const out = await settleActivation(() => new Promise<ActivationResult<string>>(() => undefined), 20);
    expect(out).toEqual({ kind: 'pending', message: ACTIVATION_TEXT.pending });
  });

  it('volgt de uitkomst van de activering', async () => {
    expect(await settleActivation(async () => ({ applied: false, reason: 'review' as const, horizon: 'plan' }))).toEqual({ kind: 'review', horizon: 'plan' });
    expect(await settleActivation(async () => ({ applied: true }))).toEqual({ kind: 'done' });
    expect(await settleActivation(async () => ({ applied: true, reason: 'partial' as const }))).toEqual({ kind: 'done', message: ACTIVATION_TEXT.partial });
    expect(await settleActivation(async () => ({ applied: false, reason: 'pending' as const }))).toEqual({ kind: 'pending', message: ACTIVATION_TEXT.pending });
    expect(await settleActivation(async () => ({ applied: false, reason: 'stale' as const }))).toEqual({ kind: 'error', message: ACTIVATION_TEXT.stale });
    expect(await settleActivation(async () => ({ applied: false, reason: 'failed' as const }))).toEqual({ kind: 'error', message: ACTIVATION_TEXT.failed });
  });
});
