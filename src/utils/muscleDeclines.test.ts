import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMuscleDeclines, readMuscleDeclines, rememberMuscleDecline } from './muscleDeclines';

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('Liever niet bij Spieren voor de berg', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('onthoudt per spier de laatste keer, en Alles verwijderen wist het', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    rememberMuscleDecline({ muscle: 'calves', weekStart: '2026-10-26' });
    rememberMuscleDecline({ muscle: 'calves', weekStart: '2026-11-02' });
    rememberMuscleDecline({ muscle: 'tibialis', weekStart: '2026-11-02' });
    expect(readMuscleDeclines()).toEqual([{ muscle: 'calves', weekStart: '2026-11-02' }, { muscle: 'tibialis', weekStart: '2026-11-02' }]);
    clearMuscleDeclines();
    expect(readMuscleDeclines()).toEqual([]);
  });

  it('negeert rommel en gaat niet stuk zonder opslag', () => {
    const s = fakeStorage();
    s.setItem('ascend.bergspieren.nee', '[{"muscle":"neus","weekStart":"2026-11-02"},{"muscle":"glutes","weekStart":"gisteren"},5]');
    vi.stubGlobal('localStorage', s);
    expect(readMuscleDeclines()).toEqual([]);
    vi.stubGlobal('localStorage', undefined);
    expect(readMuscleDeclines()).toEqual([]);
    expect(() => rememberMuscleDecline({ muscle: 'glutes', weekStart: '2026-11-02' })).not.toThrow();
    expect(() => clearMuscleDeclines()).not.toThrow();
  });
});
