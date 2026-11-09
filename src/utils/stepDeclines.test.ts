import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearStepDeclines, readStepDeclines, rememberStepDecline } from './stepDeclines';

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('Liever niet bij een stapvoorstel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('onthoudt elk voorstel-id een keer, en Alles verwijderen wist het', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    rememberStepDecline('push-up:push-up>decline-push-up');
    rememberStepDecline('push-up:push-up>decline-push-up');
    expect(rememberStepDecline('dip:dip>weighted-dip')).toEqual(['push-up:push-up>decline-push-up', 'dip:dip>weighted-dip']);
    expect(readStepDeclines()).toEqual(['push-up:push-up>decline-push-up', 'dip:dip>weighted-dip']);
    clearStepDeclines();
    expect(readStepDeclines()).toEqual([]);
  });

  it('laat kapotte waarden weg en werkt zonder opslag', () => {
    const store = fakeStorage();
    store.setItem('ascend.stap.nee', JSON.stringify(['push-up:push-up>decline-push-up', 3, 'kapot']));
    vi.stubGlobal('localStorage', store);
    expect(readStepDeclines()).toEqual(['push-up:push-up>decline-push-up']);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('geen'); }, setItem: () => { throw new Error('geen'); }, removeItem: () => { throw new Error('geen'); } });
    expect(readStepDeclines()).toEqual([]);
    expect(rememberStepDecline('dip:dip>weighted-dip')).toEqual(['dip:dip>weighted-dip']);
    expect(() => clearStepDeclines()).not.toThrow();
  });
});
