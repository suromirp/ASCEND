import { describe, it, expect } from 'vitest';
import { resolveVariantDuration, withDurationScope } from './substitutions';
import { durationScopeFor } from './durationScope';
import type { SessionTemplate } from '../models/training';

// Warden Planning punt 3: een voorbeeld geeft zijn duren mee aan de ronde en
// zet ze nooit langer dan één synchrone aanroep op de module.

const tpl: SessionTemplate = { id: 'tpl_kracht', name: 'Kracht', type: 'strength', durationVariants: { full: 60 } };

describe('withDurationScope', () => {
  it('geldt alleen binnen de aanroep, ook als die faalt', () => {
    expect(withDurationScope({ learnedDurations: { tpl_kracht: 40 } }, () => resolveVariantDuration(tpl, 'full', '2026-10-21', null))).toBe(40);
    expect(resolveVariantDuration(tpl, 'full', '2026-10-21', null)).toBe(60);
    expect(() => withDurationScope({ learnedDurations: { tpl_kracht: 40 } }, () => { throw new Error('kapot'); })).toThrow('kapot');
    expect(resolveVariantDuration(tpl, 'full', '2026-10-21', null)).toBe(60);
  });

  it('weigert een asynchrone functie, want die zou de duren lezen nadat ze terug zijn', () => {
    expect(() => withDurationScope({ ambition: 'rustig' }, async () => 1)).toThrow();
  });

  it('durationScopeFor geeft de ambitie, de opbouw na ziekte en geleerde duren', () => {
    const scope = durationScopeFor({ ambition: 'rustig', sessionDurationEstimates: { tpl_kracht: 45 } }, [], [tpl], null, '2026-10-21');
    expect(scope.ambition).toBe('rustig');
    expect(scope.durationAdjustments).toEqual([]);
    expect(scope.learnedDurations.tpl_kracht).toBe(45);
  });
});
