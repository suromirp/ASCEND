import { describe, expect, it } from 'vitest';
import { trekImportanceHint } from './trek';

describe('trekImportanceHint noemt het doel', () => {
  it('zonder doel staat er "je doel"', () => {
    expect(trekImportanceHint('training', 3)).toContain('richting je doel.');
    expect(trekImportanceHint('goal', 3)).toContain('richting je doel.');
  });
  it('met een doel staat de naam erin en nooit de GR5', () => {
    for (const t of [trekImportanceHint('training', 3, 'Marathon'), trekImportanceHint('goal', 3, 'Marathon')]) {
      expect(t).toContain('richting Marathon.');
      expect(t).not.toContain('GR5');
    }
  });
});
