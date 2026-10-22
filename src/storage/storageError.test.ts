// Wat de app zegt als de opslag een fout geeft.
import { describe, it, expect } from 'vitest';
import { describeStorageError, describeWriteError, ABORTED_WHILE_SAVING } from './storageError';

describe('een fout van de opslag in woorden', () => {
  it('een transactie die bij wegleggen is afgebroken is geen privévenster', () => {
    const err = new DOMException('The transaction was aborted', 'AbortError');
    expect(describeStorageError(err)).toBe(ABORTED_WHILE_SAVING);
    expect(describeStorageError(err)).not.toContain('privévenster');
    expect(describeWriteError(err)).toBe(ABORTED_WHILE_SAVING);
  });

  it('de tekst is kort en zegt wat je doet', () => {
    expect(ABORTED_WHILE_SAVING).toBe('ASCEND werd weggelegd terwijl hij iets opsloeg. Probeer het opnieuw.');
  });

  it('volle opslag en geblokkeerde opslag houden hun eigen tekst', () => {
    expect(describeStorageError(new DOMException('vol', 'QuotaExceededError'))).toContain('vol');
    expect(describeWriteError(new DOMException('vol', 'QuotaExceededError'))).toContain('vol');
    expect(describeStorageError(new DOMException('nee', 'SecurityError'))).toContain('privévenster');
  });
});
