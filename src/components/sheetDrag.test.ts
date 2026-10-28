import { describe, expect, it } from 'vitest';
import { canStartInContent, dragIntent, sheetFollow, sheetRelease, velocityOf } from './sheetDrag';

describe('sheetFollow', () => {
  it('volgt omlaag 1 op 1 en past naar boven niet mee', () => {
    expect(sheetFollow(120)).toBe(120);
    expect(sheetFollow(0)).toBe(0);
    expect(sheetFollow(-40)).toBe(0);
  });
});

describe('sheetRelease', () => {
  it('net onder en net boven 30 procent van de hoogte', () => {
    expect(sheetRelease({ dy: 300, velocity: 0, height: 1000 })).toBe('back');
    expect(sheetRelease({ dy: 301, velocity: 0, height: 1000 })).toBe('close');
  });
  it('een snelle korte veeg sluit, mits minstens 24 px', () => {
    expect(sheetRelease({ dy: 40, velocity: 0.8, height: 1000 })).toBe('close');
    expect(sheetRelease({ dy: 23, velocity: 0.8, height: 1000 })).toBe('back');
  });
  it('een langzame lange veeg onder de drempel veert terug', () => {
    expect(sheetRelease({ dy: 200, velocity: 0.1, height: 1000 })).toBe('back');
  });
  it('precies op de snelheidsgrens telt nog niet', () => {
    expect(sheetRelease({ dy: 100, velocity: 0.5, height: 1000 })).toBe('back');
  });
  it('omhoog slepen sluit nooit', () => {
    expect(sheetRelease({ dy: -200, velocity: 2, height: 1000 })).toBe('back');
    expect(sheetRelease({ dy: 0, velocity: 2, height: 1000 })).toBe('back');
  });
  it('een blad zonder hoogte valt terug op de snelheid', () => {
    expect(sheetRelease({ dy: 100, velocity: 0, height: 0 })).toBe('back');
  });
});

describe('velocityOf', () => {
  it('rekent px per ms uit de laatste metingen', () => {
    expect(velocityOf([{ t: 0, y: 0 }, { t: 50, y: 25 }, { t: 100, y: 75 }])).toBeCloseTo(0.75);
  });
  it('negeert oude metingen', () => {
    expect(velocityOf([{ t: 0, y: 0 }, { t: 500, y: 400 }, { t: 550, y: 405 }, { t: 600, y: 410 }])).toBeCloseTo(0.1);
  });
  it('is tolerant voor een enkel meetpunt en voor gelijke tijden', () => {
    expect(velocityOf([])).toBe(0);
    expect(velocityOf([{ t: 10, y: 10 }])).toBe(0);
    expect(velocityOf([{ t: 10, y: 10 }, { t: 10, y: 50 }])).toBe(0);
  });
  it('twee metingen met een lange pauze ertussen geven toch een snelheid', () => {
    expect(velocityOf([{ t: 0, y: 0 }, { t: 400, y: 40 }])).toBeCloseTo(0.1);
  });
});

describe('canStartInContent', () => {
  it('alleen als alles bovenaan staat', () => {
    expect(canStartInContent([{ scrollTop: 0 }, { scrollTop: 0 }])).toBe(true);
    expect(canStartInContent([])).toBe(true);
  });
  it('een scrolstand van 1 px is geen overname', () => {
    expect(canStartInContent([{ scrollTop: 0 }, { scrollTop: 1 }])).toBe(false);
  });
});

describe('dragIntent', () => {
  it('omlaag en verticaal genoeg', () => {
    expect(dragIntent(2, 9)).toBe(true);
    expect(dragIntent(0, 8)).toBe(true);
  });
  it('te weinig beweging', () => {
    expect(dragIntent(0, 7)).toBe(false);
  });
  it('horizontaal of schuin wordt nooit overgenomen', () => {
    expect(dragIntent(30, 10)).toBe(false);
    expect(dragIntent(10, 10)).toBe(false);
  });
  it('omhoog is nooit van het blad', () => {
    expect(dragIntent(0, -40)).toBe(false);
  });
});
