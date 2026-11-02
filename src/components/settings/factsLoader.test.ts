import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFactsLoader, startFactsLoading, type LoaderState } from './factsLoader';
import type { Part } from '../../utils/loadParts';
import type { SettingsSource } from '../../engine/settingsPending';

interface T { snapshots: number; macro: string | null }
const ALL: readonly SettingsSource[] = ['snapshots', 'macroFactor'];
const never = () => new Promise<never>(() => undefined);
const INITIAL: T = { snapshots: 0, macro: null };

afterEach(() => vi.useRealTimers());

function recorder() {
  const states: LoaderState<T>[] = [];
  return { states, onState: (s: LoaderState<T>) => states.push(s), last: () => states[states.length - 1] };
}

describe('laadstand van de instellingen', () => {
  it('na een time-out is pending leeg en de bron onbekend, zonder verzonnen waarde', async () => {
    vi.useFakeTimers();
    const r = recorder();
    const parts = (): Part<SettingsSource, T>[] => [
      { key: 'snapshots', ms: 4000, load: never },
      { key: 'macroFactor', ms: 3000, load: async () => ({ macro: 'gelezen' }) },
    ];
    const loader = createFactsLoader(parts, INITIAL, ALL, r.onState);
    const done = loader.load();
    await vi.advanceTimersByTimeAsync(10);
    expect(r.last().pending).toEqual(['snapshots']);
    await vi.advanceTimersByTimeAsync(4000);
    await done;
    expect(r.last().pending).toEqual([]);
    expect(r.last().unknown).toEqual(['snapshots']);
    expect(r.last().loaded).toEqual({ snapshots: 0, macro: 'gelezen' });
  });

  it('een fout geeft Onbekend; een latere ronde die lukt haalt het weg', async () => {
    let fail = true;
    const r = recorder();
    const loader = createFactsLoader(() => [{ key: 'snapshots', ms: 1000, load: async () => { if (fail) throw new Error('stuk'); return { snapshots: 2 }; } }], INITIAL, ['snapshots'], r.onState);
    await loader.load();
    expect(r.last().unknown).toEqual(['snapshots']);
    fail = false;
    await loader.load();
    expect(r.last().unknown).toEqual([]);
    expect(r.last().loaded.snapshots).toBe(2);
  });

  it('een bron met een bekende waarde houdt die bij een mislukte ronde', async () => {
    let fail = false;
    const r = recorder();
    const loader = createFactsLoader(() => [{ key: 'snapshots', ms: 1000, load: async () => { if (fail) throw new Error('stuk'); return { snapshots: 3 }; } }], INITIAL, ['snapshots'], r.onState);
    await loader.load();
    fail = true;
    await loader.load();
    expect(r.last().unknown).toEqual([]);
    expect(r.last().loaded.snapshots).toBe(3);
  });

  it('een oud resultaat dat na een nieuw binnenkomt wordt genegeerd', async () => {
    const waiting: ((n: number) => void)[] = [];
    const r = recorder();
    const loader = createFactsLoader(
      () => [{ key: 'snapshots', ms: 60_000, load: () => new Promise<Partial<T>>((resolve) => waiting.push((n) => resolve({ snapshots: n }))) }],
      INITIAL,
      ['snapshots'],
      r.onState,
    );
    const first = loader.load();
    const second = loader.load();
    await vi.waitFor(() => expect(waiting).toHaveLength(2));
    waiting[1](5);
    await second;
    waiting[0](1);
    await first;
    expect(r.last().loaded.snapshots).toBe(5);
    expect(r.states).toHaveLength(1);
  });

  it('na dispose (weg van het scherm tijdens laden) komt er geen update meer', async () => {
    let finish: () => void = () => undefined;
    const r = recorder();
    const loader = createFactsLoader(() => [{ key: 'snapshots', ms: 60_000, load: () => new Promise<Partial<T>>((resolve) => (finish = () => resolve({ snapshots: 9 }))) }], INITIAL, ['snapshots'], r.onState);
    const done = loader.load();
    await Promise.resolve();
    await Promise.resolve();
    loader.dispose();
    finish();
    await done;
    expect(r.states).toHaveLength(0);
  });

  it('een wijziging laadt alleen de bron die erbij hoort, en stoppen ruimt de koppelingen op', async () => {
    const loads: string[] = [];
    let notify: () => void = () => undefined;
    let unsubscribed = false;
    const r = recorder();
    const run = startFactsLoading(
      () => [
        { key: 'snapshots', ms: 1000, load: async () => { loads.push('snapshots'); return { snapshots: 1 }; } },
        { key: 'macroFactor', ms: 1000, load: async () => { loads.push('macroFactor'); return { macro: 'x' }; } },
      ],
      INITIAL,
      ALL,
      [{ subscribe: (l) => { notify = l; return () => { unsubscribed = true; }; }, sources: ['macroFactor'] }],
      r.onState,
    );
    await vi.waitFor(() => expect(loads).toHaveLength(2));
    notify();
    await vi.waitFor(() => expect(loads).toEqual(['snapshots', 'macroFactor', 'macroFactor']));
    run.stop();
    expect(unsubscribed).toBe(true);
  });
});
