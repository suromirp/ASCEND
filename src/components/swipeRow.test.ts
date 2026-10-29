import { describe, expect, it } from 'vitest';
import { OPEN_PX, decideAxis, followOffset, restOffset, swipeEnd, zoneAt } from './swipeRow';

describe('decideAxis', () => {
  it('wacht tot er ongeveer 8 pixels beweging is', () => {
    expect(decideAxis(5, 3)).toBe('undecided');
    expect(decideAxis(-7, 2)).toBe('undecided');
  });
  it('kiest de grootste kant', () => {
    expect(decideAxis(-12, 4)).toBe('horizontal');
    expect(decideAxis(4, 12)).toBe('vertical');
    expect(decideAxis(10, 10)).toBe('vertical');
  });
});

describe('followOffset', () => {
  it('volgt de vinger 1 op 1 naar links', () => {
    expect(followOffset(-40, 0, 340)).toBe(-40);
  });
  it('gaat nooit naar rechts voorbij de rustplek', () => {
    expect(followOffset(30, 0, 340)).toBe(0);
    expect(followOffset(80, -OPEN_PX, 340)).toBe(0);
  });
  it('gaat nooit voorbij de breedte', () => {
    expect(followOffset(-900, 0, 340)).toBe(-340);
  });
  it('begint vanaf de open stand', () => {
    expect(followOffset(-10, -OPEN_PX, 340)).toBe(-OPEN_PX - 10);
  });
});

describe('swipeEnd', () => {
  const width = 340;
  it('een korte veeg voorbij 25% laat de rij openstaan', () => {
    expect(swipeEnd(-90, width, 0, false)).toBe('open');
  });
  it('minder dan 54 px veert terug, daarboven blijft hij open', () => {
    expect(swipeEnd(-50, width, 0, false)).toBe('close');
    expect(swipeEnd(-60, width, 0, false)).toBe('open');
  });
  it('verwijdert als je vinger bijna de rand haalt, ook voor 60% (een veeg begint links)', () => {
    // Begonnen op x = 150: de rij kan 150 px, de lijn ligt 24 px voor de rand.
    expect(swipeEnd(-130, 400, 0, false, 150)).toBe('delete');
    expect(swipeEnd(-120, 400, 0, false, 150)).toBe('open');
    // Nooit dichter dan de knop plus 24 px, zodat open en weg uit elkaar blijven.
    expect(swipeEnd(-90, 400, 0, false, 60)).toBe('open');
    expect(swipeEnd(-96, 400, 0, false, 60)).toBe('delete');
  });
  it('voorbij 60% verwijdert meteen', () => {
    expect(swipeEnd(-210, width, 0, false)).toBe('delete');
  });
  it('een snelle veeg die ver genoeg ging verwijdert', () => {
    expect(swipeEnd(-120, width, -1.4, false)).toBe('delete');
    expect(swipeEnd(-40, width, -1.4, false)).toBe('close');
  });
  it('een open rij die je loslaat zonder te bewegen blijft open', () => {
    expect(swipeEnd(-OPEN_PX, width, 0, true)).toBe('open');
  });
  it('een open rij die je half terugveegt of snel terugschiet gaat dicht', () => {
    expect(swipeEnd(-20, width, 0, true)).toBe('close');
    expect(swipeEnd(-OPEN_PX, width, 1.5, true)).toBe('close');
  });
});

describe('restOffset en zoneAt', () => {
  it('geeft de rustplek per uitkomst', () => {
    expect(restOffset('open', 340)).toBe(-OPEN_PX);
    expect(restOffset('close', 340)).toBe(0);
    expect(restOffset('delete', 340)).toBe(-340);
  });
  it('geeft de zone voor de tik bij een drempel', () => {
    expect(zoneAt(-10, 340, false)).toBe('closed');
    expect(zoneAt(-100, 340, false)).toBe('open');
    expect(zoneAt(-250, 340, false)).toBe('delete');
  });
});
