import { describe, expect, it } from 'vitest';
import { wantsLogShortcut, wantsMorningLink, withoutShortcut } from './shortcutAction';

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
