import { describe, expect, it } from 'vitest';
import { resolveFigure, resolveFigureSetting } from './figureSettings';

describe('de instelling Figuur', () => {
  it('zonder keuze geldt Automatisch', () => {
    expect(resolveFigureSetting(undefined)).toBe('auto');
    expect(resolveFigureSetting({})).toBe('auto');
    expect(resolveFigureSetting({ figure: 'rommel' })).toBe('auto');
    expect(resolveFigureSetting({ figure: 42 })).toBe('auto');
  });

  it('een eigen keuze gaat voor, ook als de koppeling iets anders weet', () => {
    expect(resolveFigure({ figure: 'vrouw' }, 'man')).toEqual({ setting: 'vrouw', figure: 'vrouw', source: 'chosen' });
    expect(resolveFigure({ figure: 'man' })).toEqual({ setting: 'man', figure: 'man', source: 'chosen' });
  });

  it('Automatisch neemt het over van de koppeling', () => {
    expect(resolveFigure({}, 'vrouw')).toEqual({ setting: 'auto', figure: 'vrouw', source: 'linked' });
  });

  it('Automatisch valt zonder koppeling terug op Man', () => {
    expect(resolveFigure({})).toEqual({ setting: 'auto', figure: 'man', source: 'fallback' });
    expect(resolveFigure({}, null)).toEqual({ setting: 'auto', figure: 'man', source: 'fallback' });
  });
});
