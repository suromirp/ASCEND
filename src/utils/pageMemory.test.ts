import { describe, expect, it } from 'vitest';
import { createPageMemory, pageStateKey, scrollKey, stepKey, type StorageLike } from './pageMemory';

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

// Schrijfopdrachten wachten tot de test ze zelf uitvoert.
function setup(storage: StorageLike | null, max?: number) {
  const pending: Array<() => void> = [];
  const memory = createPageMemory(() => storage, { max, schedule: (fn) => void pending.push(fn) });
  return { memory, runScheduled: () => pending.splice(0).forEach((fn) => fn()) };
}

describe('createPageMemory', () => {
  it('geeft meteen terug wat er is gezet, ook voor het wegschrijven', () => {
    const { memory } = setup(fakeStorage());
    memory.set('a', 120);
    expect(memory.get<number>('a')).toBe(120);
    expect(memory.get('onbekend')).toBeUndefined();
  });

  it('schrijft met vertraging en één keer voor veel wijzigingen', () => {
    const storage = fakeStorage();
    const { memory, runScheduled } = setup(storage);
    for (let y = 0; y < 100; y++) memory.set('scroll', y);
    expect(storage.data.size).toBe(0);
    runScheduled();
    expect(storage.data.get('ascend.pm.scroll')).toBe('99');
  });

  it('een nieuwe sessie leest wat de vorige bewaarde (een herlaad)', () => {
    const storage = fakeStorage();
    const first = setup(storage);
    first.memory.set('state|k|/week|weekStart', '2026-10-19');
    first.memory.flush();
    const second = setup(storage);
    expect(second.memory.get<string>('state|k|/week|weekStart')).toBe('2026-10-19');
  });

  it('houdt een maximum en laat de oudste los', () => {
    const storage = fakeStorage();
    const { memory } = setup(storage, 3);
    memory.set('a', 1);
    memory.set('b', 2);
    memory.set('c', 3);
    memory.get('a');
    memory.set('a', 10); // a is weer het nieuwste
    memory.set('d', 4); // b is de oudste
    memory.flush();
    expect(memory.get('b')).toBeUndefined();
    expect(storage.data.has('ascend.pm.b')).toBe(false);
    expect(memory.get<number>('a')).toBe(10);
    expect(memory.get<number>('d')).toBe(4);
    expect(JSON.parse(storage.data.get('ascend.pm.index')!)).toEqual(['c', 'a', 'd']);
  });

  it('opslag die ontbreekt werkt als alleen geheugen', () => {
    const { memory, runScheduled } = setup(null);
    memory.set('a', 5);
    expect(() => runScheduled()).not.toThrow();
    expect(memory.get<number>('a')).toBe(5);
  });

  it('opslag die weigert of beschadigd is geeft geen fout', () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error('geblokkeerd'); },
      setItem: () => { throw new Error('vol'); },
      removeItem: () => { throw new Error('geblokkeerd'); },
    };
    const { memory, runScheduled } = setup(broken);
    memory.set('a', 5);
    expect(() => runScheduled()).not.toThrow();
    expect(memory.get<number>('a')).toBe(5);
    expect(memory.get('b')).toBeUndefined();
    const garbage = fakeStorage();
    garbage.data.set('ascend.pm.x', '{kapot');
    expect(setup(garbage).memory.get('x')).toBeUndefined();
  });
});

describe('sleutels', () => {
  it('horen bij de stap en het pad', () => {
    const loc = { key: 'abc', pathname: '/more' };
    expect(stepKey(loc)).toBe('abc|/more');
    expect(scrollKey(loc)).toBe('scroll|abc|/more');
    expect(pageStateKey(loc, 'query')).toBe('state|abc|/more|query');
    expect(pageStateKey({ key: 'abd', pathname: '/more' }, 'query')).not.toBe(pageStateKey(loc, 'query'));
  });
});
