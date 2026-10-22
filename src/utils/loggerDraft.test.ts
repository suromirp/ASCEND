import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, draftKey, draftNumber, loadDraft, saveDraft } from './loggerDraft';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('het concept van het afvinkblad', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('bewaart en geeft terug per sessie', () => {
    const key = draftKey('tpl_easy_run', 'p1', '2026-10-22');
    saveDraft(key, { notes: 'zwaar', rpe: 7 });
    expect(loadDraft<{ notes: string; rpe: number }>(key)).toEqual({ notes: 'zwaar', rpe: 7 });
    expect(loadDraft(draftKey('tpl_easy_run', 'p2', '2026-10-22'))).toBeUndefined();
  });

  it('een losse training krijgt een sleutel van training en dag', () => {
    expect(draftKey('tpl_x', undefined, '2026-10-22')).not.toBe(draftKey('tpl_x', undefined, '2026-10-23'));
  });

  it('wist het concept', () => {
    const key = draftKey('t', 'p', undefined);
    saveDraft(key, { a: 1 });
    clearDraft(key);
    expect(loadDraft(key)).toBeUndefined();
  });

  it('een kapot concept geeft niets terug in plaats van een fout', () => {
    const key = draftKey('t', 'p', undefined);
    sessionStorage.setItem(key, '{kapot');
    expect(loadDraft(key)).toBeUndefined();
    sessionStorage.setItem(key, '[1,2]');
    expect(loadDraft(key)).toBeUndefined();
  });

  it('werkt zonder sessionStorage (het afvinkblad werkt dan gewoon)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('geblokkeerd'); },
      setItem: () => { throw new Error('geblokkeerd'); },
      removeItem: () => { throw new Error('geblokkeerd'); },
    });
    expect(() => saveDraft('k', { a: 1 })).not.toThrow();
    expect(loadDraft('k')).toBeUndefined();
    expect(() => clearDraft('k')).not.toThrow();
  });

  it('draftNumber neemt alleen getallen en leeg over', () => {
    expect(draftNumber(45, 30)).toBe(45);
    expect(draftNumber('', 30)).toBe('');
    expect(draftNumber('abc', 30)).toBe(30);
    expect(draftNumber(undefined, 30)).toBe(30);
  });
});
