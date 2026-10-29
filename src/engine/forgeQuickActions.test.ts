import { describe, expect, it } from 'vitest';
import { quickActionsFor, quickButtonsOn, QUICK_ACTION_ORDER, type QuickContext } from './forgeQuickActions';

const ctx = (over: Partial<QuickContext> = {}): QuickContext => ({ readOnly: false, preview: false, timed: false, ...over });

describe('quickButtonsOn', () => {
  it('staat standaard aan', () => {
    expect(quickButtonsOn({})).toBe(true);
    expect(quickButtonsOn(undefined)).toBe(true);
    expect(quickButtonsOn({ forgeQuickButtons: undefined })).toBe(true);
  });
  it('is uit alleen als er echt false staat', () => {
    expect(quickButtonsOn({ forgeQuickButtons: false })).toBe(false);
    expect(quickButtonsOn({ forgeQuickButtons: true })).toBe(true);
    expect(quickButtonsOn({ forgeQuickButtons: 'nee' })).toBe(true);
  });
});

describe('quickActionsFor', () => {
  it('geeft drie acties in vaste volgorde voor een gewone oefening', () => {
    expect(quickActionsFor(ctx())).toEqual(['ruilen', 'opwarmset', 'notitie']);
    expect(quickActionsFor(ctx())).toEqual(QUICK_ACTION_ORDER);
  });
  it('laat sets weg bij een oefening op tijd', () => {
    expect(quickActionsFor(ctx({ timed: true }))).toEqual(['ruilen', 'notitie']);
  });
  it('schrijft geen notitie in het voorbeeld van een dag die nog komt', () => {
    expect(quickActionsFor(ctx({ preview: true }))).toEqual(['ruilen', 'opwarmset']);
  });
  it('toont niets als de training alleen te lezen is', () => {
    expect(quickActionsFor(ctx({ readOnly: true }))).toEqual([]);
  });
});
