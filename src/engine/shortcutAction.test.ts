import { describe, expect, it } from 'vitest';
import { routeFromNativeShortcut, wantsLogShortcut, wantsMorningLink, withoutShortcut } from './shortcutAction';

describe('routeFromNativeShortcut', () => {
  it('zet de adressen van de Android-snelkoppelingen om naar hash-routes', () => {
    expect(routeFromNativeShortcut('app.ascend.training://open/vandaag')).toBe('/');
    expect(routeFromNativeShortcut('app.ascend.training://open/week')).toBe('/week');
    expect(routeFromNativeShortcut('app.ascend.training://open/logboek')).toBe('/history');
    expect(routeFromNativeShortcut('app.ascend.training://open/afvinken')).toBe('/?actie=afvinken');
  });
  it('negeert al het andere', () => {
    expect(routeFromNativeShortcut('https://localhost/week')).toBeNull();
    expect(routeFromNativeShortcut('app.ascend.training://open/onbekend')).toBeNull();
    expect(routeFromNativeShortcut('')).toBeNull();
  });
  it('vindt niets via het prototype', () => {
    for (const naam of ['constructor', 'tostring', 'hasownproperty', 'valueof']) {
      expect(routeFromNativeShortcut(`app.ascend.training://open/${naam}`)).toBeNull();
    }
  });
});

describe('snelkoppeling afvinken', () => {
  it('herkent de actie met of zonder vraagteken', () => {
    expect(wantsLogShortcut('?actie=afvinken')).toBe(true);
    expect(wantsLogShortcut('actie=afvinken')).toBe(true);
  });
  it('negeert een andere of ontbrekende actie', () => {
    expect(wantsLogShortcut('')).toBe(false);
    expect(wantsLogShortcut('?actie=iets')).toBe(false);
    expect(wantsLogShortcut('?x=1')).toBe(false);
  });
  it('haalt alleen de actie weg', () => {
    expect(withoutShortcut('?actie=afvinken')).toBe('');
    expect(withoutShortcut('?x=1&actie=afvinken')).toBe('?x=1');
  });
});

describe('de ochtendmelding opent Vandaag', () => {
  it('herkent de actie ochtend en niet de afvink-actie', () => {
    expect(wantsMorningLink('?actie=ochtend')).toBe(true);
    expect(wantsMorningLink('?actie=afvinken')).toBe(false);
    expect(wantsLogShortcut('?actie=ochtend')).toBe(false);
    expect(wantsMorningLink('')).toBe(false);
  });
  it('haalt de actie weg en laat de rest staan', () => {
    expect(withoutShortcut('?actie=ochtend')).toBe('');
  });
});
