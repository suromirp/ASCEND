import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, clearDraftIfSame, draftKey, draftNumber, draftSnapshot, loadDraft, saveDraft } from './loggerDraft';

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

  it('een laat ja wist het concept alleen als het sinds Opslaan niet veranderde (Warden)', () => {
    const key = draftKey('tpl_bike', undefined, '2026-11-15');
    saveDraft(key, { duration: 45 });
    const snapshot = draftSnapshot(key);
    // Scherm opnieuw open, andere invulling: die blijft staan.
    saveDraft(key, { duration: 60 });
    clearDraftIfSame(key, snapshot);
    expect(loadDraft<{ duration: number }>(key)).toEqual({ duration: 60 });
    // Niets veranderd: weg.
    clearDraftIfSame(key, draftSnapshot(key));
    expect(loadDraft(key)).toBeUndefined();
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
