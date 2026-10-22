import { describe, expect, it } from 'vitest';
import { parseLastRoute, planLaunch, readLastRoute, writeLastRoute, type LaunchInput } from './launchRoute';

const TABS = ['/', '/week', '/stand', '/ascend', '/history'];
const NOW = 1_800_000_000_000;
const MIN = 60_000;
const base: LaunchInput = {
  pathname: '/',
  search: '',
  historyIdx: 0,
  navigationType: 'navigate',
  now: NOW,
  last: { path: '/week', at: NOW - 30 * MIN },
  resumeMinutes: 120,
  mode: 'today',
  tabs: TABS,
  home: '/',
};
const plan = (over: Partial<LaunchInput>) => planLaunch({ ...base, ...over });

describe('planLaunch, hervatten', () => {
  it('binnen de tijd komt de app terug op de laatste pagina', () => {
    expect(plan({})).toBe('/week');
    expect(plan({ last: { path: '/more', at: NOW - 119 * MIN } })).toBe('/more');
  });

  it('te lang geleden: gewoon Vandaag', () => {
    expect(plan({ last: { path: '/week', at: NOW - 121 * MIN } })).toBeNull();
  });

  it('uit staat uit, ook zonder of met een klok die achterloopt', () => {
    expect(plan({ resumeMinutes: 0 })).toBeNull();
    expect(plan({ last: null })).toBeNull();
    expect(plan({ last: { path: '/week', at: NOW + 5 * MIN } })).toBeNull();
  });

  it('de laatste pagina was Vandaag: niets te doen', () => {
    expect(plan({ last: { path: '/', at: NOW - MIN } })).toBeNull();
  });

  it('een herlaad of terug uit de geschiedenis hervat niet', () => {
    expect(plan({ navigationType: 'reload' })).toBeNull();
    expect(plan({ navigationType: 'back_forward' })).toBeNull();
  });

  it('een eigen adres of snelkoppeling blijft zoals het is', () => {
    expect(plan({ search: '?log=1' })).toBeNull();
    expect(plan({ historyIdx: 3 })).toBeNull();
  });

  it('werkt ook met "previous"', () => {
    expect(plan({ mode: 'previous' })).toBe('/week');
  });
});

describe('planLaunch, Vandaag onder een tab', () => {
  it('een link naar een tab krijgt Vandaag eronder met "today"', () => {
    expect(plan({ pathname: '/stand' })).toBe('/stand');
  });

  it('met "previous" blijft een link zoals hij is', () => {
    expect(plan({ pathname: '/stand', mode: 'previous' })).toBeNull();
  });

  it('een andere pagina dan een tab blijft zoals hij is', () => {
    expect(plan({ pathname: '/more' })).toBeNull();
    expect(plan({ pathname: '/stand', historyIdx: 1 })).toBeNull();
  });
});

describe('de laatste pagina bewaren', () => {
  it('schrijft en leest terug', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    writeLastRoute(storage, '/stand', NOW);
    expect(readLastRoute(storage)).toEqual({ path: '/stand', at: NOW });
  });

  it('opslag die ontbreekt of weigert geeft geen fout', () => {
    expect(() => writeLastRoute(null, '/week', NOW)).not.toThrow();
    expect(readLastRoute(null)).toBeNull();
    const broken = {
      getItem: () => { throw new Error('geblokkeerd'); },
      setItem: () => { throw new Error('vol'); },
    };
    expect(() => writeLastRoute(broken, '/week', NOW)).not.toThrow();
    expect(readLastRoute(broken)).toBeNull();
  });

  it('rommel wordt genegeerd', () => {
    expect(parseLastRoute('niet json')).toBeNull();
    expect(parseLastRoute('{"path":"week","at":1}')).toBeNull();
    expect(parseLastRoute('{"path":"/week","at":"nu"}')).toBeNull();
    expect(parseLastRoute(null)).toBeNull();
  });
});
