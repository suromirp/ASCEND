import { describe, expect, it } from 'vitest';
import { planTabNavigation, type TabNavInput } from './tabNav';

const TABS = ['/', '/week', '/stand', '/ascend', '/history'];
const base: TabNavInput = { mode: 'today', currentPath: '/', currentState: null, target: '/week', historyIdx: 0, tabs: TABS, home: '/' };
const plan = (over: Partial<TabNavInput>) => planTabNavigation({ ...base, ...over });

describe('planTabNavigation, terug naar Vandaag', () => {
  it('nog eens op dezelfde tab tikken scrolt naar boven', () => {
    expect(plan({ currentPath: '/week', target: '/week' })).toEqual({ kind: 'top' });
    expect(plan({ mode: 'previous', currentPath: '/', target: '/' })).toEqual({ kind: 'top' });
  });

  it('vanaf Vandaag komt de tab erbovenop, met de aantekening dat Vandaag eronder ligt', () => {
    expect(plan({})).toEqual({ kind: 'push', state: { fromToday: true } });
  });

  it('van tab naar tab vervangt de stap en houdt de aantekening', () => {
    expect(plan({ currentPath: '/week', currentState: { fromToday: true }, historyIdx: 1, target: '/stand' })).toEqual({ kind: 'replace', state: { fromToday: true } });
  });

  it('van tab naar tab zonder Vandaag eronder vervangt gewoon', () => {
    expect(plan({ currentPath: '/week', currentState: null, historyIdx: 0, target: '/stand' })).toEqual({ kind: 'replace' });
  });

  it('naar Vandaag vanaf een tab met Vandaag eronder is één stap terug', () => {
    expect(plan({ currentPath: '/stand', currentState: { fromToday: true }, historyIdx: 1, target: '/' })).toEqual({ kind: 'back' });
  });

  it('naar Vandaag zonder Vandaag eronder maakt van deze stap Vandaag', () => {
    expect(plan({ currentPath: '/stand', currentState: null, historyIdx: 0, target: '/' })).toEqual({ kind: 'replace' });
    // De aantekening klopt niet meer als er niets onder ligt.
    expect(plan({ currentPath: '/stand', currentState: { fromToday: true }, historyIdx: 0, target: '/' })).toEqual({ kind: 'replace' });
  });

  it('vanaf een pagina die geen tab is komt de tab erbovenop, zodat terug daar uitkomt', () => {
    expect(plan({ currentPath: '/more', target: '/week', historyIdx: 2 })).toEqual({ kind: 'push' });
    expect(plan({ currentPath: '/more', target: '/', historyIdx: 2 })).toEqual({ kind: 'push' });
  });
});

describe('planTabNavigation, naar de vorige tab', () => {
  it('elke tik is een nieuwe stap', () => {
    expect(plan({ mode: 'previous' })).toEqual({ kind: 'push' });
    expect(plan({ mode: 'previous', currentPath: '/week', currentState: { fromToday: true }, historyIdx: 1, target: '/' })).toEqual({ kind: 'push' });
  });
});
