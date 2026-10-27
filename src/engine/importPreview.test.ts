import { describe, expect, it } from 'vitest';
import { importDiffLine } from './importPreview';

describe('importDiffLine', () => {
  it('zegt in de toekomende tijd wat er gebeurt', () => {
    expect(importDiffLine({ toAdd: 3, toReplace: 2, toSkipDuplicate: 1 })).toBe('3 komen erbij · 2 worden bijgewerkt · 1 staat er al');
  });
  it('gebruikt het enkelvoud bij één', () => {
    expect(importDiffLine({ toAdd: 1, toReplace: 1, toSkipDuplicate: 4 })).toBe('1 komt erbij · 1 wordt bijgewerkt · 4 staan er al');
  });
  it('zegt dat er niets verandert', () => {
    expect(importDiffLine({ toAdd: 0, toReplace: 0, toSkipDuplicate: 0 })).toBe('Geen wijzigingen');
  });
});
